// Compare the Webflow snapshot with what the site actually publishes.
//   pnpm check:drift [https://<site>.webflow.io] [--crawl] [--all]
// The snapshot is written by hand from the Webflow MCP, and the Designer
// keeps changing after it is taken. This reads the stylesheet the staging
// site publishes and reports every place the snapshot no longer matches:
// variables and classes that exist on one side only, and values that
// differ (base values, breakpoints, states, modes). Nothing is written:
// fix the snapshot (or Webflow), run `pnpm css`, and run this again.
// Publish the site to staging first: only published changes are visible.
// The address comes from the argument, or from `stagingUrl` in the repo's
// webflow-build.config.json. Classes with the prefixes in IGNORE (Webflow's
// own, and the style guide's layout) are not expected in the snapshot. A
// site with per-page CSS is read page by page and merged
// (published-css.mjs); --crawl does that for any site.
import fs from 'node:fs';
import path from 'node:path';
import { root, config, args } from './lib.mjs';
import { parseCss, declarations, selectors, readPublished, asCss } from './published-css.mjs';

const IGNORE = /^\.(w-|sg-|wf-|inline-div-)/;
const { flags, pos } = args();
const all = flags.has('--all');
const base = pos[0] ?? config().stagingUrl;
if (!base) { console.error('Which site? pnpm check:drift https://<site>.webflow.io (or set stagingUrl in webflow-build.config.json).'); process.exit(1); }

// CSS → Map("<media>|<selector>" → {property: value}). One level of @media
// is enough for both stylesheets; other at-rules are skipped.
function parse(css) {
  const out = new Map();
  const block = (rules, media) => {
    for (const r of rules) {
      if (r.rules && r.at.startsWith('@media')) block(r.rules, r.at.match(/\((?:max|min)-width:\s*\d+px\)/)?.[0].replace(/\s/g, '') ?? r.at);
      if (r.sel === undefined) continue;
      const decl = {};
      for (const [p, v] of declarations(r.body)) Object.assign(decl, expand(p, norm(v)));
      for (const sel of selectors(r.sel)) {
        // One spelling per selector: Webflow writes :before, puts a state
        // before the variant, and repeats focus-visible for its own script.
        const name = sel.replace(/\s+/g, ' ').replace(/::(before|after)/g, ':$1')
          .replace(/^((?:\.[\w-]+)+)((?::[a-z-]+)+)(:where\([^)]*\))/, '$1$3$2');
        if (/\[data-wf-focus-(visible|within)\]/.test(name)) continue;
        // Variables sit on :root or on body depending on who wrote the
        // sheet (modes set on the Body tag publish on body): one place here.
        const targets = name === ':root' || name === 'body' ? [[VARS, (p) => isVar(p)], [name, (p) => !isVar(p)]] : [[name, () => true]];
        for (const [t, keep] of targets) {
          const part = Object.fromEntries(Object.entries(decl).filter(([p]) => keep(p)));
          if (Object.keys(part).length) out.set(`${media}|${t}`, { ...out.get(`${media}|${t}`), ...part });
        }
      }
    }
  };
  block(parseCss(css), '');
  return out;
}
const VARS = '(variables)';
const isVar = (p) => p.startsWith('--_');
// Split a value on spaces that are not inside brackets.
const parts = (v) => v.match(/(?:[^\s(]+(?:\([^)]*\))?)+/g) ?? [];
const SIDES = ['top', 'right', 'bottom', 'left'];
const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const four = (p) => [p[0], p[1] ?? p[0], p[2] ?? p[0], p[3] ?? p[1] ?? p[0]];
// Webflow publishes shorthands, the snapshot holds longhands: compare longhands.
function expand(prop, v) {
  const p = parts(v);
  const each = (names, vals) => Object.fromEntries(names.map((n, i) => [n, vals[i]]));
  if (prop === 'padding' || prop === 'margin') return each(SIDES.map((s) => `${prop}-${s}`), four(p));
  if (prop === 'inset') return each(SIDES, four(p));
  if (prop === 'border-radius' && !v.includes('/')) return each(CORNERS.map((c) => `border-${c}-radius`), four(p));
  if (/^border-(width|style|color)$/.test(prop)) { const k = prop.split('-')[1]; return each(SIDES.map((s) => `border-${s}-${k}`), four(p)); }
  if (prop === 'border' || /^border-(top|right|bottom|left)$/.test(prop)) {
    const out = {};
    for (const side of prop === 'border' ? SIDES : [prop.split('-')[1]]) for (const x of p) {
      const k = /^(none|solid|dashed|dotted|double|hidden)$/.test(x) ? 'style' : /^(\.?\d|thin|medium|thick)/.test(x) ? 'width' : 'color';
      out[`border-${side}-${k}`] = x;
    }
    return out;
  }
  if (prop === 'overflow') return { 'overflow-x': p[0], 'overflow-y': p[1] ?? p[0] };
  if (prop === 'gap' || prop === 'grid-gap') return { 'grid-row-gap': p[0], 'grid-column-gap': p[1] ?? p[0] };
  if (prop === 'row-gap') return { 'grid-row-gap': v };
  if (prop === 'column-gap') return { 'grid-column-gap': v };
  if (prop === 'flex-flow') return { 'flex-direction': p.find((x) => /^(row|column)/.test(x)) ?? 'row', 'flex-wrap': p.find((x) => /wrap/.test(x)) ?? 'nowrap' };
  if (prop === 'flex' && p.length === 3) return { 'flex-grow': p[0], 'flex-shrink': p[1], 'flex-basis': p[2] };
  if (prop === 'flex' && v === 'none') return { 'flex-grow': '0', 'flex-shrink': '0', 'flex-basis': 'auto' };
  if (prop === 'flex' && /^\d+$/.test(v)) return { 'flex-grow': v, 'flex-shrink': '1', 'flex-basis': '0' };
  if (prop === 'outline' ) { const out = {}; for (const x of p) out[`outline-${/^(none|solid|dashed|dotted)$/.test(x) ? 'style' : /^\.?\d/.test(x) ? 'width' : 'color'}`] = x; return out; }
  return { [prop]: v };
}
const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0');
// The same value can be written two ways; compare one spelling.
function norm(v) {
  return v.trim().replace(/\s*!important/, '').replace(/\s+/g, ' ').replace(/, /g, ',').toLowerCase()
    .replace(/\btransparent\b/g, '#00000000')
    .replace(/rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)/g, (m, r, g, b, a) => `#${hex2(r)}${hex2(g)}${hex2(b)}${a === undefined ? '' : hex2(a * 255)}`)
    .replace(/\b(\d+)ms\b/g, (m, n) => `${n / 1000}s`).replace(/ ease(?=,|$)/g, '')
    .replace(/#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?\b(?![0-9a-f])/g, (m, r, g, b, a) => `#${r}${r}${g}${g}${b}${b}${a ? a + a : ''}`)
    .replace(/#([0-9a-f]{6})ff\b/g, '#$1')
    .replace(/\b0(?:px|em|rem|%)(?![\w.])/g, '0').replace(/(^|[^\d])0\.(\d)/g, '$1.$2').replace(/(\.\d*?)0+(?=[a-z%]|$|[ ,)])/g, '$1').replace(/\.(?=[a-z%]|$|[ ,)])/g, '')
    .replace(/["']/g, '')
    // A font variable holds one family; the fallbacks after it are the publisher's.
    .replace(/^([\w -]+),(?:[\w -]+,)*(?:sans-serif|serif|monospace)$/, '$1');
}

let published;
try { published = await readPublished(base, { crawl: flags.has('--crawl'), log: console.log }); }
catch (e) { console.error(e.message); process.exit(1); }
const live = parse(asCss(published));
const mine = parse(['tokens.css', 'webflow.css'].map((f) => fs.readFileSync(path.join(root, 'src/css', f), 'utf8')).join('\n'));

const report = { 'Variables in Webflow, not in the snapshot': [], 'Variables in the snapshot, not in Webflow': [], 'Classes in Webflow, not in the snapshot': [], 'Classes in the snapshot, not in Webflow': [], 'Values that differ': [] };

// Variables: every custom property either side declares anywhere.
const vars = (m) => { const s = new Set(); for (const d of m.values()) for (const p of Object.keys(d)) if (isVar(p)) s.add(p); return s; };
const [liveVars, myVars] = [vars(live), vars(mine)];
for (const v of liveVars) if (!myVars.has(v)) report['Variables in Webflow, not in the snapshot'].push(v);
for (const v of myVars) if (!liveVars.has(v)) report['Variables in the snapshot, not in Webflow'].push(v);

// Classes: the first class of each selector names the style.
const classOf = (key) => key.split('|')[1].match(/^\.[\w-]+(?:\.[\w-]+)*/)?.[0];
const classes = (m) => new Set([...m.keys()].map(classOf).filter((c) => c && !IGNORE.test(c)));
const [liveClasses, myClasses] = [classes(live), classes(mine)];
for (const c of liveClasses) if (!myClasses.has(c)) report['Classes in Webflow, not in the snapshot'].push(c);
for (const c of myClasses) if (!liveClasses.has(c)) report['Classes in the snapshot, not in Webflow'].push(c);

// Values: every rule the snapshot generates, against the same rule live.
// Webflow publishes a breakpoint value only where it changes, the snapshot
// may repeat it: so both sides are compared as the value in effect, which
// at a smaller breakpoint falls back to the next larger one, then to base.
const DOWN = ['', '(max-width:991px)', '(max-width:767px)', '(max-width:479px)'];
function effective(m, key, prop) {
  const [media, sel] = key.split('|');
  const at = DOWN.indexOf(media);
  for (const md of at > 0 ? DOWN.slice(0, at + 1).reverse() : [media, '']) {
    const v = m.get(`${md}|${sel}`)?.[prop];
    if (v !== undefined) return v;
  }
}
const where = (key) => { const [media, sel] = key.split('|'); return media ? `${sel} @ ${media}` : sel; };
const seen = new Set();
const check = (key, prop) => {
  if (seen.has(key + prop)) return;
  seen.add(key + prop);
  const [a, b] = [effective(mine, key, prop), effective(live, key, prop)];
  if (a !== b) report['Values that differ'].push(`${where(key)} { ${prop} }  snapshot: ${a ?? '(not set)'}   Webflow: ${b ?? '(not set)'}`);
};
for (const [key, decl] of mine) {
  const cls = classOf(key);
  if (cls && !liveClasses.has(cls)) continue;
  for (const prop of Object.keys(decl)) if (!isVar(prop) || liveVars.has(prop)) check(key, prop);
}
// And the other way, for the classes and variables both sides have.
for (const [key, decl] of live) {
  const cls = classOf(key);
  const sel = key.split('|')[1];
  if (cls ? !myClasses.has(cls) : sel !== VARS) continue;
  for (const prop of Object.keys(decl)) if (cls || myVars.has(prop)) check(key, prop);
}

let total = 0;
for (const [title, lines] of Object.entries(report)) {
  if (!lines.length) continue;
  total += lines.length;
  const shown = all ? lines : lines.slice(0, 40);
  console.log(`\n${title} (${lines.length})`);
  for (const l of shown) console.log('  ' + l);
  if (shown.length < lines.length) console.log(`  … ${lines.length - shown.length} more (--all shows them)`);
}
if (total) { console.log(`\nDrift: ${total} difference${total === 1 ? '' : 's'} between the snapshot and ${base}.`); process.exit(1); }
console.log(`No drift: the snapshot matches ${base} (${myVars.size} variables, ${myClasses.size} classes).`);
