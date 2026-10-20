// Generate src/css/tokens.css and src/css/webflow.css from the Webflow
// snapshot (webflow-snapshot/variables.json and styles.json), so the
// prototype uses exactly the variables and classes that exist in the
// Designer. Re-run after every Designer change:  pnpm css
// The snapshot format is described in README.md › Webflow snapshot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(fs.readFileSync(path.join(root, 'webflow-snapshot', f), 'utf8'));
const V = load('variables.json');
const S = load('styles.json');
const BP = { medium: 991, small: 767, tiny: 479 };
// Webflow's larger breakpoints (min-width), emitted before the max-width
// ones, as Webflow publishes them.
const BP_UP = { large: 1280, xl: 1440, xxl: 1920 };
// Webflow states that publish as a class, not a pseudo-class: Current
// (links), and Checked / Focused on custom checkboxes and radios.
const STATE_CLASS = { current: '.w--current', 'redirected-checked': '.w--redirected-checked', 'redirected-focus': '.w--redirected-focus' };
// The collection whose modes classes switch per role (conventions.md §4).
const STYLES_COLLECTION = 'Typography Styles';

const cssOf = {};
const coll = {};
for (const c of V) {
  coll[c.collection] = c;
  for (const v of c.variables) cssOf[`${c.collection}/${v.name}`] = v.cssName;
}

const num = (x) => String(+Number(x).toPrecision(6));
function literal(v, mode) {
  const val = v.values?.[mode] ?? v.values?.Base;
  if (val && typeof val === 'object' && 'value' in val) return `${num(val.value)}${val.unit}`;
  if (v.type === 'Percentage') return `${num(val)}%`;
  if (v.type === 'FontFamily') return `"${val}", system-ui, sans-serif`;
  return String(val);
}
function value(v, mode) {
  const alias = v.alias?.[mode];
  return alias && cssOf[alias] ? `var(${cssOf[alias]})` : literal(v, mode);
}
const decls = (c, mode) => c.variables.map((v) => `  ${v.cssName}: ${value(v, mode)};`);

// tokens.css: every collection's Base values on :root. The styles
// collection is declared per element (body + classes) so modes resolve there.
const tokens = ['/* GENERATED from webflow-snapshot/variables.json by `pnpm css` — do not edit. */', ':root {'];
for (const c of V) {
  if (!c.variables.length || c.collection === STYLES_COLLECTION) continue;
  tokens.push(`  /* ${c.collection} */`, ...decls(c, 'Base'));
}
tokens.push('}');
// Collections with breakpoint auto-modes (`breakpointModes`, e.g. Typography
// Role) switch mode on :root at each breakpoint, as Webflow does.
for (const bp of ['medium', 'small', 'tiny']) {
  const lines = V.filter((c) => c.breakpointModes?.[bp]).flatMap((c) => decls(c, c.breakpointModes[bp]).map((l) => '  ' + l));
  if (lines.length) tokens.push(`@media screen and (max-width: ${BP[bp]}px) {`, '  :root {', ...lines, '  }', '}');
}
fs.writeFileSync(path.join(root, 'src/css/tokens.css'), tokens.join('\n') + '\n');

// webflow.css: every class, with variable modes re-declared where set.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const propValue = (p) => (typeof p === 'string' && p.startsWith('var:')
  ? `var(${cssOf[p.slice(4)] ?? `--missing-${slug(p.slice(4))}`})`
  : p);
const modeDecls = (modes = {}) => Object.entries(modes).flatMap(([c, m]) => (coll[c] ? decls(coll[c], m) : []));
function selector(st, pseudo) {
  let sel = st.name === 'body' || !st.selector ? 'body' : st.selector;
  if (pseudo && STATE_CLASS[pseudo]) {
    // `.a:where(.w-variant-x)` + current → `.a.w--current:where(.w-variant-x)`
    const at = sel.indexOf(':where(');
    sel = at < 0 ? sel + STATE_CLASS[pseudo] : sel.slice(0, at) + STATE_CLASS[pseudo] + sel.slice(at);
  } else if (pseudo) sel += ['placeholder', 'before', 'after'].includes(pseudo) ? `::${pseudo}` : `:${pseudo}`;
  return sel;
}

const blocks = { main: [], large: [], xl: [], xxl: [], medium: [], small: [], tiny: [] };
for (const st of S) {
  const props = st.properties ?? {};
  const modes = st.variableModes ?? {};
  const keys = [...new Set([...Object.keys(props), ...Object.keys(modes)])]
    .sort((a, b) => (a.split(':')[0] !== 'main') - (b.split(':')[0] !== 'main') || a.localeCompare(b));
  for (const key of keys) {
    const [bp, pseudo] = key.split(':');
    const body = Object.entries(props[key] ?? {}).map(([k, v]) => `  ${k}: ${propValue(v)};`);
    let md = modeDecls(modes[key]);
    if (st.name === 'body' && key === 'main' && !modes.main?.[STYLES_COLLECTION] && coll[STYLES_COLLECTION]) {
      md = [...decls(coll[STYLES_COLLECTION], 'Base'), ...md];
    }
    if (!body.length && !md.length) continue;
    (blocks[bp] ??= []).push(`${selector(st, pseudo)} {\n${[...md, ...body].join('\n')}\n}`);
  }
}
const out = ['/* GENERATED from webflow-snapshot/styles.json by `pnpm css` — do not edit.\n   Every rule here exists as a class in the Webflow Designer. */', ...blocks.main];
for (const bp of ['large', 'xl', 'xxl']) {
  if (blocks[bp].length) out.push(`@media screen and (min-width: ${BP_UP[bp]}px) {\n${blocks[bp].join('\n')}\n}`);
}
for (const bp of ['medium', 'small', 'tiny']) {
  if (blocks[bp].length) out.push(`@media screen and (max-width: ${BP[bp]}px) {\n${blocks[bp].join('\n')}\n}`);
}
fs.writeFileSync(path.join(root, 'src/css/webflow.css'), out.join('\n\n') + '\n');
console.log(`tokens.css ${tokens.length} lines; webflow.css ${Object.values(blocks).flat().length} rules`);
