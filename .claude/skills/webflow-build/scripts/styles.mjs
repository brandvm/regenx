// Plan the move of the prototype's new classes into Webflow, before the
// first batch is proposed.
//   node styles.mjs [--root <prototype dir>] [--out <file.json>]
// Reads src/css/new-classes*.css and the Webflow snapshot. Every
// declaration is sorted, up front, into the one place it can go:
//   CONNECTOR  the Webflow MCP can create it (a literal value, or one
//              variable bound to the property);
//   BY HAND    the Designer can hold it but the API can't write it (a
//              variable inside calc(), a gradient or a shadow; a reserved
//              class name; a tag style nobody has touched yet): a row for
//              docs/handoff/MANUAL-TODO.md;
//   REPO CSS   the Designer can't express it (the selector or the feature):
//              goes to src/styles.css with a `repo-css:` tag.
// It writes nothing to Webflow. The plan is printed and saved as JSON
// (default .webflow-build/styles-plan.json) for the build session to work
// from, class by class, in creation order (a base class before its combos).
import fs from 'fs';
import path from 'path';
import { args, prototypeDir, outDir } from './lib.mjs';

const { values } = args();
const root = prototypeDir(values.root);
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const V = JSON.parse(read('webflow-snapshot/variables.json'));
const S = JSON.parse(read('webflow-snapshot/styles.json'));
const varOf = new Map(); // css name → "Collection/Group/Name"
for (const c of V) for (const v of c.variables) varOf.set(v.cssName, `${c.collection}/${v.name}`);
const existing = new Set(S.map((s) => s.selector).filter(Boolean));

// Webflow's breakpoints and the states the Designer has.
const BP = { 'max-width: 991px': 'medium', 'max-width: 767px': 'small', 'max-width: 479px': 'tiny', 'min-width: 1280px': 'large', 'min-width: 1440px': 'xl', 'min-width: 1920px': 'xxl' };
const BP_NAME = { main: 'Desktop', medium: 'Tablet', small: 'Mobile Landscape', tiny: 'Mobile', large: '1280 and up', xl: '1440 and up', xxl: '1920 and up' };
const STATES = { hover: 'hover', active: 'pressed', focus: 'focused', 'focus-visible': 'focus-visible', 'focus-within': 'focus-within', visited: 'visited', '.w--current': 'current', '::placeholder': 'placeholder' };
const RESERVED = new Set(['label', 'form']);
const TAGS = new Set(['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'img', 'blockquote', 'figure', 'figcaption', 'strong', 'em']);
// Properties the style API refuses a variable on, and what to do instead
// (lessons/mcp.md).
const VAR_RENAME = { 'row-gap': 'grid-row-gap', 'column-gap': 'grid-column-gap' };
const VAR_REFUSED = new Set(['outline-width']);
// Shorthands the API wants as longhands.
const sides = (p, s = '') => ['top', 'right', 'bottom', 'left'].map((x) => `${p}-${x}${s}`);
const four = (list, names) => { const [a, b = a, c = a, d = b] = list; return names.map((n, i) => [n, [a, b, c, d][i]]); };
const split = (v) => v.match(/(?:[^\s(]+\([^)]*(?:\([^)]*\)[^)]*)*\)|[^\s]+)/g) ?? [v];
function expand(prop, value) {
  const parts = split(value);
  if (prop === 'padding' || prop === 'margin') return four(parts, sides(prop));
  if (prop === 'inset') return four(parts, ['top', 'right', 'bottom', 'left']);
  if (prop === 'border-radius' && !value.includes('/')) return four(parts, ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']);
  if (prop === 'gap') return [['grid-row-gap', parts[0]], ['grid-column-gap', parts[1] ?? parts[0]]];
  if (prop === 'border-width' || prop === 'border-style' || prop === 'border-color') return four(parts, sides('border', prop.slice(6)));
  if (prop === 'overflow' && parts.length <= 2) return [['overflow-x', parts[0]], ['overflow-y', parts[1] ?? parts[0]]];
  return [[prop, value]];
}

const name = (cls) => S.find((s) => s.selector === `.${cls}`)?.name ?? cls.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const plan = new Map(); // ".a.b" → { selector, names, exists, reserved, rules: [{breakpoint, state, connector, byHand}] }
const repo = []; // { css, tag, why }
const tags = []; // tag styles
const notes = [];

function declarations(body) {
  const out = [];
  for (const d of body.split(/;(?![^(]*\))/)) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    out.push([d.slice(0, i).trim(), d.slice(i + 1).trim()]);
  }
  return out.filter(([p, v]) => p && v);
}
function sort(prop, value, rule, where) {
  if (prop.startsWith('--')) { rule.byHand.push({ property: prop, value, why: 'a variable declared on a class: set the variable mode on the class in the Designer (Variable modes), not a custom property' }); return; }
  if (prop.startsWith('-webkit-') || prop.startsWith('-moz-')) { repo.push({ css: `${where} { ${prop}: ${value}; }`, tag: 'designer-cant', why: `vendor-prefixed ${prop}: custom properties refuse prefixes` }); return; }
  for (const [p, v] of expand(prop, value)) {
    const refs = [...v.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);
    const unknown = refs.filter((r) => !varOf.has(r));
    if (unknown.length) { notes.push(`${where}: ${p} reads ${unknown.join(', ')}, which is not in the snapshot (a proposed variable? create it first, then refresh the snapshot)`); continue; }
    const single = /^var\(--[\w-]+\)$/.test(v);
    if (!refs.length) rule.connector.push({ property: p, value: v });
    else if (single && VAR_REFUSED.has(p)) rule.byHand.push({ property: p, value: varOf.get(refs[0]) ?? v, why: `the API refuses a variable on ${p}: bind it in the Designer, or accept the literal value` });
    else if (single) rule.connector.push({ property: VAR_RENAME[p] ?? p, variable: varOf.get(refs[0]) ?? refs[0] });
    else rule.byHand.push({ property: p, value: v.replace(/var\((--[\w-]+)\)/g, (_, n) => `⟨${varOf.get(n) ?? n}⟩`), why: 'a variable inside calc(), a gradient or a shadow: the API stores only the first variable' });
  }
}

const files = fs.readdirSync(path.join(root, 'src/css')).filter((f) => /^new-classes.*\.css$/.test(f)).sort();
for (const f of files) {
  const css = read(`src/css/${f}`);
  // A rule already marked for the repo keeps its tag:
  //   /* repo-css: designer-cant — :has() */  .a:has(.b) { … }
  // The comment becomes a marker in front of the rule; other comments go.
  const clean = css.replace(/\/\*([\s\S]*?)\*\//g, (_, c) => { const t = c.match(/^\s*repo-css:\s*([\w-]+)\s*(?:[—-]\s*([\s\S]*?))?\s*$/); return t ? `\u0001${t[1]}\u0002${(t[2] ?? '').replace(/\s+/g, ' ')}\u0003` : ''; });
  const walk = (text, media) => {
    const re = /([^{};]+)\{/g;
    for (let m; (m = re.exec(text));) {
      let depth = 1; let j = re.lastIndex;
      while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
      const mark = m[1].match(/\u0001([^\u0002]*)\u0002([^\u0003]*)\u0003\s*$/) ?? m[1].match(/\u0001([^\u0002]*)\u0002([^\u0003]*)\u0003/);
      const prelude = m[1].replace(/\u0001[^\u0003]*\u0003/g, '').trim(); const body = text.slice(re.lastIndex, j - 1).replace(/\u0001[^\u0003]*\u0003/g, '');
      re.lastIndex = j;
      if (prelude.startsWith('@media')) {
        const q = prelude.replace(/^@media\s*(?:screen\s+and\s*)?\(?\s*/, '').replace(/\s*\)\s*$/, '').replace(/\s+/g, ' ');
        if (BP[q] && !media) walk(text.slice(m.index + m[0].length, j - 1), BP[q]);
        else repo.push({ css: `${prelude} {${body}}`.replace(/\s+/g, ' '), tag: 'designer-cant', why: `media query "${q}" is not a Webflow breakpoint` });
        continue;
      }
      if (prelude.startsWith('@')) { repo.push({ css: `${prelude} {${body}}`.replace(/\s+/g, ' '), tag: 'designer-cant', why: prelude.split(/[\s(]/)[0] }); continue; }
      const marked = mark;
      for (const sel of prelude.split(',').map((s) => s.trim()).filter(Boolean)) {
        const where = media ? `${sel} @${BP_NAME[media]}` : sel;
        if (marked) { repo.push({ css: `${media ? `@media ${Object.keys(BP).find((k) => BP[k] === media)} ` : ''}${sel} {${body}}`.replace(/\s+/g, ' '), tag: marked[1], why: marked[2].trim() }); continue; }
        const m2 = sel.match(/^((?:\.[a-zA-Z][\w-]*)+|[a-z][a-z0-9]*)((?::{1,2}[\w-]+|\.w--current)?)$/);
        const state = m2 ? (m2[2] ? STATES[m2[2].replace(/^:(?!:)/, '')] : '') : undefined;
        if (!m2 || state === undefined) {
          const why = /::(before|after|marker)/.test(sel) ? 'pseudo-element' : /:has\(/.test(sel) ? ':has()' : /:not\(|:nth-|:first-|:last-/.test(sel) ? 'structural pseudo-class' : /\[/.test(sel) ? 'attribute selector' : /[\s>+~]/.test(sel) ? 'descendant or sibling selector' : 'selector the Designer has no control for';
          repo.push({ css: `${media ? `@media (${Object.keys(BP).find((k) => BP[k] === media)}) ` : ''}${sel} {${body}}`.replace(/\s+/g, ' '), tag: /\.is-[\w-]+/.test(sel) && /[\s>+~]/.test(sel) ? 'js-state' : 'designer-cant', why });
          continue;
        }
        let key = m2[1];
        let st = state;
        if (key.endsWith('.w--current')) { key = key.slice(0, -11); st = 'current'; }
        const rule = { breakpoint: media ?? 'main', state: st || '', connector: [], byHand: [] };
        for (const [p, v] of declarations(body)) sort(p, v, rule, where);
        if (!key.startsWith('.')) {
          if (!TAGS.has(key)) { repo.push({ css: `${sel} {${body}}`.replace(/\s+/g, ' '), tag: 'designer-cant', why: `no tag style for <${key}>` }); continue; }
          tags.push({ tag: key, exists: existing.has(key), ...rule });
          continue;
        }
        const classes = key.slice(1).split('.');
        if (!plan.has(key)) plan.set(key, { selector: key, names: classes.map(name), exists: existing.has(key), reserved: classes.some((c) => RESERVED.has(c)) && !existing.has(key), file: f, rules: [] });
        plan.get(key).rules.push(rule);
      }
    }
  };
  walk(clean, null);
}

// Creation order: fewer classes in the chain first, so a combo's parent exists.
const ordered = [...plan.values()].sort((a, b) => a.selector.split('.').length - b.selector.split('.').length);
for (const c of ordered) {
  const parent = c.selector.split('.').slice(0, -1).join('.');
  c.parentMissing = parent.length > 0 && !existing.has(parent) && !plan.has(parent);
}
const count = (pick) => ordered.reduce((n, c) => n + c.rules.reduce((k, r) => k + pick(r).length, 0), 0) + tags.reduce((n, t) => n + pick(t).length, 0);

console.log(`Plan for ${ordered.length} class${ordered.length === 1 ? '' : 'es'} from ${files.join(', ') || 'no new-classes file'}\n`);
for (const c of ordered) {
  console.log(`${c.names.join(' › ')}   ${c.selector}${c.exists ? '   (exists: update)' : ''}${c.reserved ? '   << reserved name: create it in the Designer first' : ''}${c.parentMissing ? '   << its parent combo is in no file: create the parent chain first' : ''}`);
  for (const r of c.rules) {
    const at = `${BP_NAME[r.breakpoint]}${r.state ? ` · ${r.state}` : ''}`;
    if (r.connector.length) console.log(`  connector  ${at}: ${r.connector.map((d) => `${d.property} = ${d.variable ? `⟨${d.variable}⟩` : d.value}`).join('; ')}`);
    for (const d of r.byHand) console.log(`  BY HAND    ${at}: ${d.property} = ${d.value}   (${d.why})`);
  }
}
if (tags.length) {
  console.log('\nTag styles');
  for (const t of tags) console.log(`  ${t.tag}${t.exists ? '' : '   << never styled: set one property in the Designer first, then the API can reach it'}: ${[...t.connector.map((d) => `${d.property} = ${d.variable ? `⟨${d.variable}⟩` : d.value}`), ...t.byHand.map((d) => `BY HAND ${d.property} = ${d.value}`)].join('; ')}`);
}
if (repo.length) {
  console.log('\nRepo CSS (src/styles.css, each with its tag)');
  for (const r of repo) console.log(`  /* repo-css: ${r.tag} — ${r.why} */\n  ${r.css}`);
}
if (notes.length) console.log(`\nCheck first\n  ${notes.join('\n  ')}`);
const byHand = count((r) => r.byHand) + ordered.filter((c) => c.reserved).length + tags.filter((t) => !t.exists).length;
console.log(`\nstyles: ${count((r) => r.connector)} declarations through the connector · ${byHand} steps by hand (rows for MANUAL-TODO.md) · ${repo.length} rules for repo CSS${notes.length ? ` · ${notes.length} to check first` : ''}`);

const out = values.out ? path.resolve(values.out) : path.join(outDir('styles'), 'styles-plan.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ classes: ordered, tagStyles: tags, repoCss: repo, checkFirst: notes }, null, 2) + '\n');
console.log(`saved ${path.relative(process.cwd(), out)}`);
