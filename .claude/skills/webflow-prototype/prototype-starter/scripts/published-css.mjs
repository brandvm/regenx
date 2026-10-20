// Read the CSS a Webflow site publishes. Shared by check-drift.mjs (compare
// the snapshot with it) and css-from-published.mjs (build the prototype's
// CSS from it when there is no Webflow connector).
//
// Webflow publishes one of two shapes:
// - one stylesheet for the whole site (`<site>.webflow.shared.<hash>.css`):
//   Webflow's own base (normalize, w-*, the site's @font-face), then :root
//   with every variable, then the site's styles;
// - per-page CSS (Site settings › Publishing › per-page CSS): a shared file
//   with the base, plus one optimized file per page with :root and only the
//   styles that page uses. Then every page has to be read and the files
//   merged (mergeRules): each page's order holds for that page, though pages
//   may order unrelated rules differently.
import fs from 'node:fs';

// ---------- parsing ----------
// Webflow's CSS, minified or not, as a tree: { sel, body } for a rule,
// { at, body } for an at-rule with declarations (@font-face) or none
// (@import …;), { at, rules } for an at-rule holding rules (@media,
// @supports, @keyframes …). Strings and escapes are respected, so a
// `url("data:…;base64,…")` or an escaped variable name doesn't break it.
const DECL_AT = /^@(font-face|page|property|counter-style|font-palette-values|viewport)\b/i;
export function parseCss(src) {
  const s = src.replace(/\/\*[\s\S]*?\*\//g, '');
  let i = 0;
  const skipStr = (j) => { const q = s[j]; j++; while (j < s.length && s[j] !== q) { if (s[j] === '\\') j++; j++; } return j + 1; };
  function block() {
    const rules = [];
    let start = i;
    while (i < s.length) {
      const c = s[i];
      if (c === '"' || c === "'") { i = skipStr(i); continue; }
      if (c === '\\') { i += 2; continue; }
      if (c === ';') { const p = s.slice(start, i).trim(); if (p.startsWith('@')) rules.push({ at: p }); i++; start = i; continue; }
      if (c === '}') { i++; return rules; }
      if (c === '{') {
        const prelude = s.slice(start, i).trim().replace(/\s+/g, ' ');
        i++;
        if (prelude.startsWith('@') && !DECL_AT.test(prelude)) rules.push({ at: prelude, rules: block() });
        else {
          const b0 = i; let depth = 0;
          while (i < s.length) {
            const ch = s[i];
            if (ch === '"' || ch === "'") { i = skipStr(i); continue; }
            if (ch === '\\') { i += 2; continue; }
            if (ch === '{') depth++; else if (ch === '}') { if (!depth) break; depth--; }
            i++;
          }
          const body = s.slice(b0, i).trim();
          rules.push(prelude.startsWith('@') ? { at: prelude, body } : { sel: prelude, body });
          i++;
        }
        start = i; continue;
      }
      i++;
    }
    return rules;
  }
  return block();
}

// A declaration block → [[property, value], …], in order.
export function declarations(body) {
  const out = []; let depth = 0, cur = '', q = null;
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    if (q) { cur += c; if (c === '\\') cur += body[++k]; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '\\') { cur += c + body[++k]; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ';' && !depth) { if (cur.trim()) out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out.map((d) => { const k = d.indexOf(':'); return [d.slice(0, k).trim(), d.slice(k + 1).trim()]; }).filter(([p]) => p);
}

// Split a selector list on the commas that are not inside brackets.
export const selectors = (sel) => sel.split(/,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean);

// The tree back to readable CSS, one declaration per line.
export function serialize(rules, indent = '') {
  return rules.map((r) => {
    if (r.sel !== undefined || (r.at && r.body !== undefined)) {
      const decls = declarations(r.body).map(([p, v]) => `${indent}  ${p}: ${v};`);
      return `${indent}${r.sel ?? r.at} {\n${decls.join('\n')}\n${indent}}`;
    }
    if (r.rules) return `${indent}${r.at} {\n${serialize(r.rules, indent + '  ')}\n${indent}}`;
    return `${indent}${r.at};`;
  }).join('\n\n');
}

// ---------- the site's three parts ----------
// One stylesheet → { base, root, site }: everything before :root is what
// Webflow ships itself (normalize, w-*, the site's @font-face); :root holds
// the variables; everything after it is the site's own styles. A file
// without :root (the shared file of per-page CSS) is all base.
export function split(rules) {
  const at = rules.findIndex((r) => r.sel === ':root');
  if (at < 0) return { base: rules, root: [], site: [] };
  return { base: rules.slice(0, at), root: declarations(rules[at].body), site: rules.slice(at + 1) };
}

// Merge several files' rule lists into one ordered union: a rule keeps its
// place from the first file that has it, and a new rule goes right after the
// rule before it in its own file. Where two pages order the same pair of
// rules differently (it happens, for rules that don't apply to the same
// element), the first page wins. Each rule inside an @media is its own
// item, keyed by its query; consecutive items with the same query are
// grouped again on output. A rule a file repeats stays repeated. With one
// file this returns it unchanged.
export function mergeRules(lists) {
  const head = { next: null };
  const nodes = new Map();
  for (const rules of lists) {
    let prev = head;
    const items = rules.flatMap((r) => (r.rules && /^@media/i.test(r.at) ? r.rules.map((x) => ({ media: r.at, rule: x })) : [{ media: '', rule: r }]));
    const count = new Map();
    for (const it of items) {
      const text = `${it.media}\u0000${serialize([it.rule])}`;
      const n = (count.get(text) ?? 0) + 1;
      count.set(text, n);
      const key = `${text}\u0000${n}`;
      let node = nodes.get(key);
      if (!node) { node = { it, next: prev.next }; prev.next = node; nodes.set(key, node); }
      prev = node;
    }
  }
  const out = [];
  for (let n = head.next; n; n = n.next) {
    const { media, rule } = n.it;
    if (!media) { out.push(rule); continue; }
    const last = out[out.length - 1];
    if (last?.media === media) last.rules.push(rule);
    else out.push({ at: media, rules: [rule], media });
  }
  return out.map(({ media, ...r }) => r);
}

// ---------- fetching ----------
const STYLESHEET = /<link\b[^>]*\bhref="([^"]+\.css[^"]*)"[^>]*>/g;
const isWebflowSheet = (href) => /website-files\.com|webflow\.com|\.webflow\./.test(href);
async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'wf-template prototype (read-only)' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}
const sheetsOf = (html, base) => [...html.matchAll(STYLESHEET)]
  .filter((m) => /rel="?stylesheet/.test(m[0]))
  .map((m) => new URL(m[1].replace(/&amp;/g, '&'), base).href)
  .filter(isWebflowSheet);

// The pages of a site: its sitemap (rebased onto the address given, since a
// sitemap names the custom domain) and the links on the home page.
async function pagesOf(base, homeHtml, max) {
  const origin = new URL(base).origin;
  const found = new Set(['/']);
  try {
    const xml = await get(`${origin}/sitemap.xml`);
    for (const [, loc] of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) found.add(new URL(loc).pathname.replace(/\/$/, '') || '/');
  } catch { /* no sitemap: the home page's links are enough */ }
  for (const [, href] of homeHtml.matchAll(/href="(\/[^"#?]*)"/g)) if (!/\.\w{2,5}$/.test(href)) found.add(href.replace(/\/$/, '') || '/');
  return [...found].slice(0, max).map((p) => origin + p);
}

// Everything the site publishes, read with GET requests only:
//   { pages, sheets: [{ url, css }], perPage, base, root, site }
// `files` (saved stylesheets) skips the network. `crawl` reads every page
// even when the home page links a single shared stylesheet.
export async function readPublished(base, { files = [], crawl = false, max = 300, log = () => {} } = {}) {
  let sheets = [];
  let pages = [];
  let perPage = false;
  if (files.length) sheets = files.map((f) => ({ url: f, css: fs.readFileSync(f, 'utf8') }));
  else {
    const home = await get(base);
    const first = sheetsOf(home, base);
    if (!first.length) throw new Error(`No Webflow stylesheet linked from ${base}. Is the site published, and is the page public (no staging password)?`);
    // A site with per-page CSS links a shared file plus a page file.
    perPage = first.length > 1 || first.some((u) => !/\.shared\./.test(u));
    const urls = new Set(first);
    pages = [base];
    if (perPage || crawl) {
      pages = await pagesOf(base, home, max);
      log(`Reading ${pages.length} pages for their stylesheets…`);
      for (let i = 0; i < pages.length; i += 6) {
        const batch = await Promise.all(pages.slice(i, i + 6).map((p) => get(p).then((h) => sheetsOf(h, p)).catch((e) => { log(`  skipped ${p}: ${e.message}`); return []; })));
        for (const list of batch) for (const u of list) urls.add(u);
      }
    }
    sheets = await Promise.all([...urls].map(async (url) => ({ url, css: await get(url) })));
  }
  const parts = sheets.map((s) => split(parseCss(s.css)));
  const root = new Map();
  for (const p of parts) for (const [k, v] of p.root) root.set(k, v);
  return {
    pages, sheets, perPage,
    base: mergeRules(parts.map((p) => p.base)),
    root: [...root],
    site: mergeRules(parts.map((p) => p.site)),
  };
}

// The merged site as one stylesheet (base, :root, site), for comparing.
export const asCss = ({ base, root, site }) => [serialize(base), `:root {\n${root.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`, serialize(site)].join('\n\n');
