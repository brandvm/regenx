// Check the Webflow snapshot before anything is generated from it.
//   pnpm check:snapshot
// The snapshot is written by hand from the Webflow MCP (README › Webflow
// snapshot), so a slip in it is silent: a wrong alias becomes a
// `--missing-…` variable in the generated CSS and the page just looks off.
// This fails on: a variable without a CSS name or a Base value, two
// variables with one CSS name, an alias or a `var:` binding that points at
// nothing, an alias loop, a mode that its collection doesn't have, an
// unknown breakpoint key, two styles with one selector, and generated CSS
// that doesn't match the snapshot or holds a `--missing-` variable.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = (f) => path.join(root, f);
const V = JSON.parse(fs.readFileSync(file('webflow-snapshot/variables.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(file('webflow-snapshot/styles.json'), 'utf8'));
const errors = [];
const BREAKPOINTS = new Set(['main', 'large', 'xl', 'xxl', 'medium', 'small', 'tiny']);

const byRef = new Map();
const modesOf = new Map();
const cssNames = new Map();
for (const c of V) {
  modesOf.set(c.collection, new Set(c.modes?.length ? c.modes : ['Base']));
  for (const v of c.variables) byRef.set(`${c.collection}/${v.name}`, { ...v, collection: c.collection });
}
for (const c of V) {
  const modes = modesOf.get(c.collection);
  for (const [bp, m] of Object.entries(c.breakpointModes ?? {})) {
    if (!['medium', 'small', 'tiny'].includes(bp)) errors.push(`${c.collection}: breakpointModes key "${bp}" is not medium, small or tiny`);
    if (!modes.has(m)) errors.push(`${c.collection}: breakpointModes.${bp} names the mode "${m}", which the collection doesn't have`);
  }
  for (const v of c.variables) {
    const ref = `${c.collection}/${v.name}`;
    if (!v.cssName?.startsWith('--')) errors.push(`${ref}: no cssName`);
    else if (cssNames.has(v.cssName)) errors.push(`${ref}: same cssName as ${cssNames.get(v.cssName)} (${v.cssName})`);
    else cssNames.set(v.cssName, ref);
    if (!v.type) errors.push(`${ref}: no type`);
    const base = [...modes][0];
    if (v.values?.[base] === undefined && v.values?.Base === undefined && !v.alias?.[base] && !v.alias?.Base) errors.push(`${ref}: no value or alias in the first mode (${base})`);
    for (const m of [...Object.keys(v.values ?? {}), ...Object.keys(v.alias ?? {})]) if (!modes.has(m)) errors.push(`${ref}: has a value for the mode "${m}", which ${c.collection} doesn't have`);
    for (const [m, target] of Object.entries(v.alias ?? {})) {
      if (!byRef.has(target)) { errors.push(`${ref} (${m}): alias "${target}" points at no variable`); continue; }
      let seen = new Set([ref]); let cur = target;
      while (cur && byRef.has(cur)) {
        if (seen.has(cur)) { errors.push(`${ref} (${m}): alias loop through ${cur}`); break; }
        seen.add(cur);
        const next = byRef.get(cur).alias; cur = next?.[m] ?? next?.Base;
      }
    }
  }
}

const selectors = new Map();
for (const s of S) {
  const id = s.selector ?? s.name;
  if (!id) { errors.push('a style has neither name nor selector'); continue; }
  if (selectors.has(id)) errors.push(`${id}: listed twice`);
  selectors.set(id, true);
  for (const [key, props] of Object.entries(s.properties ?? {})) {
    const bp = key.split(':')[0];
    if (!BREAKPOINTS.has(bp)) errors.push(`${id}: "${key}" is not a breakpoint key (main, large, xl, xxl, medium, small, tiny, each optionally :state)`);
    for (const [p, val] of Object.entries(props)) {
      if (typeof val === 'string' && val.startsWith('var:') && !byRef.has(val.slice(4))) errors.push(`${id} › ${p}: bound to "${val.slice(4)}", which is not a variable`);
    }
  }
  for (const [key, modes] of Object.entries(s.variableModes ?? {})) {
    if (!BREAKPOINTS.has(key.split(':')[0])) errors.push(`${id}: variableModes key "${key}" is not a breakpoint`);
    for (const [c, m] of Object.entries(modes)) {
      if (!modesOf.has(c)) errors.push(`${id}: sets a mode on "${c}", which is not a collection`);
      else if (!modesOf.get(c).has(m)) errors.push(`${id}: sets ${c} to "${m}", which is not one of its modes`);
    }
  }
}

// The generated CSS must come from this snapshot: every variable declared,
// none missing. (Compared by content: file dates mean nothing after a clone.)
const generated = ['src/css/tokens.css', 'src/css/webflow.css'].map((f) => {
  if (!fs.existsSync(file(f))) { errors.push(`${f} is missing: run pnpm css`); return ''; }
  const css = fs.readFileSync(file(f), 'utf8');
  const missing = [...new Set([...css.matchAll(/--missing-[\w-]+/g)].map((m) => m[0]))];
  if (missing.length) errors.push(`${f} holds ${missing.length} variable(s) the snapshot doesn't define: ${missing.join(', ')}`);
  return css;
}).join('\n');
const stale = [...cssNames.keys()].filter((n) => !generated.includes(`${n}:`));
if (generated && stale.length) errors.push(`the generated CSS doesn't declare ${stale.length} snapshot variable(s) (${stale.slice(0, 5).join(', ')}${stale.length > 5 ? '…' : ''}): run pnpm css`);

if (errors.length) { console.log(`Snapshot check failed:\n  - ${errors.join('\n  - ')}`); process.exit(1); }
console.log(`Snapshot OK: ${V.length} collections, ${byRef.size} variables, ${S.length} styles; every alias and binding resolves; the generated CSS is current.`);
