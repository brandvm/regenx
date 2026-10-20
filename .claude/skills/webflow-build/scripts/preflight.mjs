// Markup pre-flight: what Webflow's importer and publisher will change in
// the prototype's markup, found before the import instead of after.
//   node preflight.mjs [/path…] [--root <prototype dir>] [--strict]
// Reads the prototype's HTML files (no browser, no Webflow). A path is a
// page URL (/, /about); none = every page. Each finding is one of:
//   FIX   change the prototype markup now (the prototype should already be
//         the shape Webflow can hold);
//   PLAN  known importer behaviour: the markup is right, but the build
//         needs the extra step named (SKILL.md › Importer checklist).
// --strict exits 1 when a FIX is left (use it as a gate).
import fs from 'fs';
import path from 'path';
import { args, prototypeDir, pageFiles } from './lib.mjs';

const { pos, flags, values } = args();
const root = prototypeDir(values.root);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TEXT_PARENTS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'figcaption', 'label', 'li', 'blockquote']);
const CONTROLS = new Set(['label', 'input', 'select', 'textarea']);
const BOOLEANS = ['muted', 'loop', 'autoplay', 'playsinline', 'controls', 'open', 'hidden', 'inert'];

// Classes: what Webflow already has, what is new, and what is in no CSS.
const cssClasses = (file) => {
  const out = new Set();
  if (!fs.existsSync(file)) return out;
  const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, prelude] of css.matchAll(/([^{}]+)\{/g)) if (!prelude.trim().startsWith('@')) for (const [, c] of prelude.matchAll(/\.([a-zA-Z][\w-]*)/g)) out.add(c);
  return out;
};
const cssDir = path.join(root, 'src/css');
const have = cssClasses(path.join(cssDir, 'webflow.css'));
const fresh = new Set();
const other = new Set();
for (const f of fs.existsSync(cssDir) ? fs.readdirSync(cssDir) : []) {
  if (/^new-classes.*\.css$/.test(f)) cssClasses(path.join(cssDir, f)).forEach((c) => fresh.add(c));
  else if (f.endsWith('.css') && f !== 'webflow.css') cssClasses(path.join(cssDir, f)).forEach((c) => other.add(c));
}

// A small tolerant HTML reader: enough for well-formed prototype markup.
function parse(html) {
  const rootNode = { tag: '#root', attrs: {}, children: [], parent: null };
  let cur = rootNode;
  const re = /<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>|([^<]+)/g;
  for (let m; (m = re.exec(html));) {
    if (m[2]) {
      const tag = m[2].toLowerCase();
      for (let n = cur; n !== rootNode; n = n.parent) if (n.tag === tag) { cur = n.parent; break; }
    } else if (m[3]) {
      const tag = m[3].toLowerCase();
      const attrs = {};
      for (const a of m[4].matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? null;
      const node = { tag, attrs, children: [], parent: cur, line: html.slice(0, m.index).split('\n').length };
      cur.children.push(node);
      if (!VOID.has(tag) && !m[5]) cur = node;
    } else if (m[6] !== undefined) cur.children.push({ text: m[6], parent: cur });
  }
  return rootNode;
}
const inside = (n, test) => { for (let p = n.parent; p; p = p.parent) if (p.tag && test(p)) return p; return null; };
const textOf = (n) => (n.text !== undefined ? n.text : (n.children ?? []).map(textOf).join(''));
const label = (n) => `<${n.tag}${n.attrs.class ? ` class="${n.attrs.class}"` : ''}>`;

// Pages, then the partials they include (nav, footer), each read once so a
// line number is the line in that file.
const files = pageFiles(root, pos);
if (!files.length) { console.error(`No pages found in ${root}`); process.exit(1); }
const partials = path.join(root, 'partials');
if (!pos.length && fs.existsSync(partials)) {
  for (const f of fs.readdirSync(partials).filter((x) => x.endsWith('.html') && x !== 'head.html').sort()) files.push({ route: `partials/${f}`, file: path.join(partials, f) });
}
let fixes = 0;
let plans = 0;
const unknown = new Map();
const toCreate = new Set();
for (const { route, file } of files) {
  const out = [];
  const say = (kind, n, msg) => { out.push(`  ${kind}  ${String(n.line ?? '').padStart(4)}  ${label(n)}  ${msg}`); kind === 'FIX ' ? fixes++ : plans++; };
  (function walk(n) {
    for (const c of n.children ?? []) {
      if (!c.tag) continue;
      const a = c.attrs;
      if ('style' in a) say('FIX ', c, 'inline style: the importer turns it into a junk combo class. Move it to a class.');
      if (c.tag === 'span') {
        const empty = !textOf(c).trim() && !c.children.some((x) => x.tag);
        const hooked = Object.keys(a).some((k) => k.startsWith('data-'));
        if (empty && hooked) say('PLAN', c, 'empty span a script fills: build it as a DOM element with tag span (a text Span can\'t be empty or carry the hook).');
        else if (empty) say('FIX ', c, 'empty span used as a shape: the importer makes it a text Span. Use a div.');
        else if (inside(c, (p) => TEXT_PARENTS.has(p.tag))) say('PLAN', c, 'span inside text: build it as a DOM element with tag span, or editing the parent\'s text flattens it.');
      }
      if (c.tag === 'button') say('PLAN', c, 'the importer turns a button into a Link: build it as a DOM element with tag button.');
      if (CONTROLS.has(c.tag) && !inside(c, (p) => p.tag === 'form')) say('FIX ', c, 'form control outside a <form>: the importer rejects the whole batch.');
      if (c.tag === 'input' && 'placeholder' in a) say('PLAN', c, 'placeholder can\'t be set through the API: a Designer step, or a text prop bound to data-placeholder.');
      if ((c.tag === 'input' || c.tag === 'select' || c.tag === 'textarea') && a.name) say('PLAN', c, `name="${a.name}": field names set through the API don't publish. Set it in the Designer and check the published name.`);
      if (c.tag === 'img' && Object.keys(a).some((k) => !['src', 'alt', 'class'].includes(k))) say('PLAN', c, `the importer drops every img attribute (${Object.keys(a).filter((k) => !['src', 'alt', 'class'].includes(k)).join(', ')}): re-add them after the import.`);
      for (const b of BOOLEANS) if (b in a && a[b] === null && !(c.tag === 'input')) say('FIX ', c, `${b} has no value: publishing drops it. Write ${b}="true".`);
      if ((c.tag === 'ul' || c.tag === 'ol' || c.tag === 'li') && a.role) say('PLAN', c, `role="${a.role}" on a list: Webflow publishes role="list" / "listitem". Use data-aria-role and let a module set it, or build DOM ul/li.`);
      if (c.tag === 'br') {
        const sibs = c.parent.children; const i = sibs.indexOf(c);
        const before = sibs[i - 1] ? textOf(sibs[i - 1]) : ''; const after = sibs[i + 1] ? textOf(sibs[i + 1]) : '';
        if (before.trim() && after.trim() && !/(\s|&nbsp;| )$/.test(before)) say('FIX ', c.parent, 'no space before <br>: screen readers and search read the two words as one. Write "Line.&nbsp;<br>Next".');
        else if (before.trim() && after.trim() && /[ \t\n]$/.test(before) && !/(&nbsp;| )\s*$/.test(before)) say('FIX ', c.parent, 'a normal space before <br> is trimmed by the importer. Use &nbsp; before the <br>.');
      }
      const classes = (a.class ?? '').split(/\s+/).filter(Boolean);
      for (const k of classes) {
        if (have.has(k)) continue;
        if (fresh.has(k)) toCreate.add(k);
        // "ph ph-<name>" are the icon font's classes, from the repo bundle.
        else if (!other.has(k) && !/^ph(-|$)/.test(k)) unknown.set(k, (unknown.get(k) ?? new Set()).add(route));
      }
      walk(c);
    }
  })(parse(fs.readFileSync(file, 'utf8')));
  console.log(`\n${route}  (${path.relative(root, file)})`);
  console.log(out.length ? out.join('\n') : '  nothing to change');
}

if (toCreate.size) {
  plans++;
  console.log(`\nPLAN  ${toCreate.size} new class${toCreate.size === 1 ? '' : 'es'} to create before any import (one missing class makes the importer drop the whole class list):\n  ${[...toCreate].sort().join(', ')}`);
}
if (unknown.size) {
  fixes += unknown.size;
  console.log(`\nFIX   ${unknown.size} class${unknown.size === 1 ? '' : 'es'} in the markup but in no CSS file (a typo, or a class a script sets that needs a rule or a removal):`);
  for (const [k, routes] of [...unknown].sort()) console.log(`  ${k}  (${[...routes].join(', ')})`);
}
console.log(`\npreflight: ${files.length} file${files.length === 1 ? '' : 's'} · ${fixes} to fix · ${plans} to plan for`);
if (flags.has('--strict') && fixes) process.exit(1);
