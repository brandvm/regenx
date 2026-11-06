// SEO tags on every published page, read from the HTML as served (no
// browser: every tag checked here is server-rendered by Webflow or the
// head code).
//   node seo.mjs [/path…] [--live] [--canonical] [--max 500]
// Pages come from the paths given, else /sitemap.xml, else (staging, or a
// plan without a sitemap) a crawl of internal links from `pages` in the
// config. Staging by default; --live checks `liveUrl`, the custom domain.
// Reported per page (exit 1 on any):
//   - a page that doesn't answer 200;
//   - no <title>, meta description, og:title, og:description or og:image,
//     or not exactly one <h1> (indexable pages only);
//   - with --live, a noindex page listed in sitemap.xml (noted on staging);
//   - a JSON-LD block that doesn't parse, has no @context or an item with
//     no @type, or holds an HTML entity (Webflow writes &#39; for an
//     apostrophe typed into a field bound inside a script);
//   - with --live, noindex on a page outside `seo.noindexOk`;
//   - with --canonical, not exactly one canonical, or one on another host;
//   - two indexable pages with the same title or the same description;
//   - a made-up path that answers 200 instead of 404 (search engines index
//     the error pages);
//   - with --live, robots.txt blocking every page (`Disallow: /` for `*`).
// An `X-Robots-Tag: noindex` header counts as noindex.
// Noted, not failed: noindex pages on staging, titles over 60 characters,
// descriptions outside 50–160, no JSON-LD on a page outside
// `seo.noSchemaOk`. Both allow-lists are regexes matched against the path.
import { loadConfig, args } from './lib.mjs';
import { robotsBlocksAll } from './launch-lib.mjs';

const cfg = loadConfig();
const { pos, flags, values, live } = args();
const base = live ? cfg.liveUrl?.replace(/\/$/, '') : cfg.stagingUrl;
if (!base) { console.error('--live needs "liveUrl" (the custom domain) in webflow-build.config.json.'); process.exit(1); }
const origin = new URL(base).origin;
const canonical = flags.has('--canonical');
const max = Number(values.max ?? cfg.seo?.maxPages ?? 500);
const noindexOk = (cfg.seo?.noindexOk ?? []).map((r) => new RegExp(r));
const noSchemaOk = (cfg.seo?.noSchemaOk ?? []).map((r) => new RegExp(r));
const matches = (list, p) => list.some((re) => re.test(p));

const get = (url) => fetch(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } })
  .then(async (r) => ({ status: r.status, html: r.ok ? await r.text() : '', xRobots: r.headers.get('x-robots-tag') ?? '' }), (e) => ({ status: 0, html: '', error: e.message }));
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find((v) => v != null) ?? null;
const metaTag = (html, key, value) => [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((t) => (attr(t, key) ?? '').toLowerCase() === value);
const content = (html, key, value) => { const t = metaTag(html, key, value); return t ? attr(t, 'content') : null; };
const decode = (s) => s.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// "no" when the tag is missing, "empty" when it is there with no content
// (on a CMS template: the field it is bound to is blank on that item).
const missing = (html, key, value) => (metaTag(html, key, value) ? `empty ${value}` : `no ${value}`);
const norm = (p) => p.replace(/\/$/, '') || '/';

// Internal page links in served HTML (files and fragments left out).
function links(html, from) {
  const out = new Set();
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref\s*=\s*"([^"#?]*)/gi)) {
    if (!href || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      const u = new URL(href, from);
      if (u.origin === origin && !/\.\w{2,4}$/.test(u.pathname)) out.add(norm(u.pathname));
    } catch { /* not a URL */ }
  }
  return out;
}

async function discover() {
  if (pos.length) return { source: 'arguments', paths: pos.map(norm), pages: new Map() };
  const sm = await get(base + '/sitemap.xml');
  if (sm.status === 200 && sm.html.includes('<loc>')) {
    // The sitemap names the custom domain even on staging: keep the path only.
    const list = [...sm.html.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(([, u]) => norm(new URL(u).pathname));
    return { source: 'sitemap.xml', paths: [...new Set(list)].slice(0, max), pages: new Map() };
  }
  const queue = (cfg.pages ?? ['/']).map(norm);
  const pages = new Map();
  while (queue.length && pages.size < max) {
    const p = queue.shift();
    if (pages.has(p)) continue;
    const res = await get(base + p);
    pages.set(p, res);
    for (const l of links(res.html, base + p)) if (!pages.has(l)) queue.push(l);
  }
  return { source: `crawl from ${(cfg.pages ?? ['/']).join(', ')}`, paths: [...pages.keys()], pages };
}

const titlesSeen = new Map(); // title → paths, for duplicates
const descsSeen = new Map();
const seenOn = (map, text, p) => map.set(text, [...(map.get(text) ?? []), p]);

function check(p, { status, html, error, xRobots = '' }, inSitemap) {
  const bad = [];
  const note = [];
  if (status !== 200) return { bad: [error ? `no answer (${error})` : `HTTP ${status}`], note, noindex: false };
  const noindex = /noindex/i.test(content(html, 'name', 'robots') ?? '') || /noindex/i.test(xRobots);
  if (noindex && live && !matches(noindexOk, p)) bad.push('noindex (not in seo.noindexOk)');
  // A noindex page in the sitemap asks search engines to index it and tells
  // them not to (Search Console reports it as an error).
  if (noindex && inSitemap) (live ? bad : note).push('noindex, but listed in sitemap.xml (exclude it in the page settings; plan-gated)');
  // Search tags only matter on pages that can be indexed.
  if (!noindex) {
  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decode(m[1].trim()));
  if (titles.length !== 1 || !titles[0]) bad.push(titles.length > 1 ? `${titles.length} <title> tags` : 'no <title>');
  else { if (titles[0].length > 60) note.push(`title is ${titles[0].length} characters`); seenOn(titlesSeen, titles[0], p); }
  const desc = content(html, 'name', 'description');
  if (!desc) bad.push(missing(html, 'name', 'description').replace('description', 'meta description'));
  else { if (decode(desc).length < 50 || decode(desc).length > 160) note.push(`description is ${decode(desc).length} characters`); seenOn(descsSeen, decode(desc), p); }
  for (const og of ['og:title', 'og:description', 'og:image']) if (!content(html, 'property', og)) bad.push(missing(html, 'property', og));
  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  if (h1 !== 1) bad.push(`${h1} <h1>`);
  }

  if (canonical) {
    const c = [...html.matchAll(/<link\b[^>]*\brel\s*=\s*"canonical"[^>]*>/gi)].map((m) => attr(m[0], 'href'));
    if (c.length !== 1) bad.push(c.length ? `${c.length} canonicals` : 'no canonical');
    else if (live && new URL(c[0], base).origin !== origin) bad.push(`canonical on another host: ${c[0]}`);
  }

  const blocks = [...html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const block of blocks) {
    let data;
    try { data = JSON.parse(block); } catch (e) { bad.push(`JSON-LD does not parse: ${String(e.message).slice(0, 80)}`); continue; }
    const items = Array.isArray(data) ? data : data['@graph'] ?? [data];
    if (!(Array.isArray(data) ? data[0]?.['@context'] : data['@context'])) bad.push('JSON-LD without @context');
    if (items.some((i) => !i?.['@type'])) bad.push('JSON-LD item without @type');
    const ent = JSON.stringify(data).match(/&(#\d+|#x[0-9a-f]+|amp|quot|apos|lt|gt|nbsp);/i);
    if (ent) bad.push(`HTML entity ${ent[0]} inside JSON-LD: the field is HTML-escaped where it is bound; write the text so it needs no escaping, or build the block in the bundle`);
  }
  if (!blocks.length && !noindex && !matches(noSchemaOk, p)) note.push('no JSON-LD (add the path to seo.noSchemaOk if none is planned)');
  return { bad, note, noindex };
}

const found = await discover();
console.log(`seo: ${found.paths.length} page${found.paths.length === 1 ? '' : 's'} on ${base} (${found.source})${canonical ? ', canonical required' : ''}`);
let problems = 0;
const noindexed = [];
for (const p of [...found.paths].sort()) {
  const r = check(p, found.pages.get(p) ?? (await get(base + p)), found.source === 'sitemap.xml');
  if (r.noindex) noindexed.push(p + (matches(noindexOk, p) ? '' : live ? '' : '  (not in seo.noindexOk)'));
  problems += r.bad.length;
  if (r.bad.length || r.note.length) console.log(`\n${p}\n${[...r.bad.map((m) => `  ${m}`), ...r.note.map((m) => `  (note) ${m}`)].join('\n')}`);
}
// Site-wide: duplicates, the 404 page, robots.txt.
const site = [];
for (const [what, map] of [['title', titlesSeen], ['description', descsSeen]]) {
  for (const [text, where] of map) if (where.length > 1) site.push(`same ${what} on ${where.length} pages (${where.join(', ')}): "${text.slice(0, 60)}"`);
}
const missingPage = await get(`${base}/wf-seo-check-missing-${Date.now()}`);
if (missingPage.status === 200) site.push('a page that doesn\'t exist answers 200 instead of 404');
if (live) {
  const robots = await get(base + '/robots.txt');
  if (robots.status === 200 && robotsBlocksAll(robots.html)) site.push('robots.txt blocks every page (Disallow: /): Site settings › SEO › Indexing');
}
if (site.length) console.log(`\nsite\n${site.map((m) => `  ${m}`).join('\n')}`);
problems += site.length;
if (noindexed.length) console.log(`\nnoindex (${noindexed.length}):\n${noindexed.map((p) => `  ${p}`).join('\n')}`);
console.log(`\nseo: ${problems} finding${problems === 1 ? '' : 's'}`);
if (problems) process.exit(1);
