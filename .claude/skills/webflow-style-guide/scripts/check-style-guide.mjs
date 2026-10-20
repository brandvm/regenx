// Check the generated style guide page.
//   pnpm check:style-guide     (from the prototype folder)
// 1. Every class in webflow.css and new-classes*.css is applied on the page
//    (or in the nav and footer partials), so Webflow's "Clean up unused
//    styles" can never delete one that only the CMS, a script or an unbuilt
//    page uses.
// 2. The layout is the fixed one: only the known sections, in the fixed
//    order; the sidebar lists exactly those sections; a title; every section
//    is made of rows; no inline styles (the Webflow importer turns each one
//    into a junk combo class).
import fs from 'node:fs';
import path from 'node:path';
import { SECTIONS, anchorOf } from './sections.mjs';

const argv = process.argv.slice(2);
const rootArg = argv.indexOf('--root');
const root = path.resolve(rootArg >= 0 ? argv[rootArg + 1] : process.cwd());
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const page = 'design/style-guide/index.html';
if (!fs.existsSync(path.join(root, page))) { console.error(`No ${page}: run pnpm style-guide first.`); process.exit(1); }
const errors = [];

// 1 classes
const cssFiles = ['src/css/webflow.css', ...fs.readdirSync(path.join(root, 'src/css')).filter((f) => /^new-classes.*\.css$/.test(f)).map((f) => `src/css/${f}`)].filter((f) => fs.existsSync(path.join(root, f)));
const classes = new Set();
for (const f of cssFiles) {
  const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, prelude] of css.matchAll(/([^{}]+)\{/g)) {
    if (prelude.trim().startsWith('@')) continue;
    for (const [, c] of prelude.matchAll(/\.([a-z][\w-]*)/g)) classes.add(c);
  }
}
const raw = read(page);
const html = raw.replace(/<!-- @include ([\w/.-]+) -->/g, (_, f) => (fs.existsSync(path.join(root, f)) ? read(f) : ''));
const used = new Set();
for (const [, list] of html.matchAll(/\bclass="([^"]*)"/g)) for (const c of list.split(/\s+/)) if (c) used.add(c);
const missing = [...classes].filter((c) => !used.has(c)).sort();
if (missing.length) errors.push(`Not on the style guide (${missing.length} of ${classes.size}); run pnpm style-guide:\n    ${missing.join('\n    ')}`);

// 2 layout
const known = SECTIONS.map(([id]) => anchorOf(id));
const ids = [...raw.matchAll(/<section class="sg-section(?: is-first)?" id="([^"]+)"/g)].map((m) => m[1]);
const unknown = ids.filter((id) => !known.includes(id));
if (unknown.length) errors.push(`Sections that are not part of the fixed layout: ${unknown.join(', ')}`);
const expected = known.filter((id) => ids.includes(id));
if (ids.filter((id) => known.includes(id)).join() !== expected.join()) errors.push(`Sections out of order: ${ids.join(', ')} (fixed order: ${expected.join(', ')})`);
if (new Set(ids).size !== ids.length) errors.push(`A section appears twice: ${ids.join(', ')}`);
const links = [...raw.matchAll(/<a class="sg-sidebar-link" href="#([^"]+)"/g)].map((m) => m[1]);
if (links.join() !== ids.join()) errors.push(`Sidebar (${links.join(', ')}) doesn't match the sections (${ids.join(', ')})`);
// The page title is the first h1. A second one, as the specimen of the
// All H1 Headings tag style, is fine on a noindex page.
const h1 = (raw.match(/<h1\b/g) ?? []).length;
if (h1 < 1) errors.push('The page has no h1');
const blocks = raw.split(/<section class="sg-section(?: is-first)?" id="/).slice(1);
for (const b of blocks) {
  const id = b.slice(0, b.indexOf('"'));
  if (!/class="sg-row"/.test(b)) errors.push(`Section "${id}" has no rows (every item is an Sg Row)`);
}
const inline = (raw.match(/\sstyle="/g) ?? []).length;
if (inline) errors.push(`${inline} inline style attribute(s): move them to a class (the Webflow importer makes a junk combo from each)`);

if (errors.length) { console.log(`Style guide check failed:\n  - ${errors.join('\n  - ')}`); process.exit(1); }
console.log(`Style guide OK: ${ids.length} sections in the fixed order (${ids.join(', ')}), all ${classes.size} classes applied, sidebar matches.`);
