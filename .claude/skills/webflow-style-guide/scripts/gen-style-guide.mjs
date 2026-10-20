// Generate the style guide page in its fixed layout.
//   pnpm style-guide          (from the prototype folder)
// Reads, from the prototype (the current directory, or --root <dir>):
//   webflow-snapshot/variables.json, styles.json   what Webflow has
//   src/css/webflow.css, new-classes*.css          every class and combo
//   design/style-guide/items/*.html                specimens written by hand
//   every other page's <!-- sg:start … --> blocks  specimens taken from pages
// Writes:
//   design/style-guide/index.html                  the page
//   src/css/style-guide.css                        sg.css + one combo per
//                                                  colour, radius and
//                                                  spacing variable
// The frame (sidebar, sections, rows) and the section order are fixed in
// this file and in ../sg.css; a project only supplies content. SKILL.md
// has the spec.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS, SPECIMEN_SECTIONS, anchorOf } from './sections.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const rootArg = argv.indexOf('--root');
const root = path.resolve(rootArg >= 0 ? argv[rootArg + 1] : process.cwd());
const exists = (f) => fs.existsSync(path.join(root, f));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
for (const f of ['webflow-snapshot/variables.json', 'webflow-snapshot/styles.json', 'src/css']) {
  if (!exists(f)) { console.error(`Not a prototype folder (no ${f}): ${root}`); process.exit(1); }
}

const V = JSON.parse(read('webflow-snapshot/variables.json'));
const S = JSON.parse(read('webflow-snapshot/styles.json'));
// The collection names are the template's standard, not a requirement. A
// site that names them differently says so in design/style-guide/config.json:
//   { "collections": { "semantic": "Themes", "typeStyles": "Type Styles" } }
// Collections the generator doesn't know by role are still shown, as tables.
const NAMES = {
  semantic: 'Colors Semantic', typeStyles: 'Typography Styles', typeRole: 'Typography Role', typeScale: 'Typography Scale',
  spacing: 'Spacing', radius: 'Radius', layout: 'Layout',
  ...(exists('design/style-guide/config.json') ? JSON.parse(read('design/style-guide/config.json')).collections ?? {} : {}),
};
const SEMANTIC = NAMES.semantic;
const STYLES = NAMES.typeStyles;
const ROLE = NAMES.typeRole;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const expand = (html) => html.replace(/<!-- @include ([\w/.-]+) -->/g, (_, f) => (exists(f) ? read(f) : ''));

// ---- classes and combo chains, from the CSS
const chains = new Map(); // ".a.b" → ["a", "b"]
const cssFiles = ['src/css/webflow.css', ...fs.readdirSync(path.join(root, 'src/css')).filter((f) => /^new-classes.*\.css$/.test(f)).sort().map((f) => `src/css/${f}`)].filter(exists);
for (const f of cssFiles) {
  const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, prelude] of css.matchAll(/([^{}]+)\{/g)) {
    if (prelude.trim().startsWith('@')) continue;
    for (let sel of prelude.split(',')) {
      sel = sel.trim().replace(/^[a-z]+(?=\.)/, '');
      const m = sel.match(/^((?:\.[a-z][\w-]*)+)/);
      if (m && !chains.has(m[1])) chains.set(m[1], m[1].slice(1).split('.'));
    }
  }
}
const hasClass = (c) => chains.has(`.${c}`);
const used = new Set();
const useMarkup = (html) => { for (const [, list] of html.matchAll(/\bclass="([^"]*)"/g)) for (const c of list.split(/\s+/)) if (c) used.add(c); return html; };
// Names as the Designer shows them: the snapshot's name, else words.
const words = (c) => c.split('-').filter(Boolean).map((w) => (w.length === 1 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
const nameOf = (sel) => {
  // A combo is shown with its base: "Section Is Dark", not "Is Dark".
  const parts = sel.slice(1).split('.');
  const one = (p, i) => S.find((s) => s.selector === `.${parts.slice(0, i + 1).join('.')}`)?.name ?? words(p);
  return parts.map(one).join(' ');
};

// ---- variables
const coll = (name) => V.find((c) => c.collection === name);
const byAlias = new Map(); // "Colors/Brand/Ink" → variable
for (const c of V) for (const v of c.variables) byAlias.set(`${c.collection}/${v.name}`, { ...v, collection: c.collection });
const px = (n) => `${Math.round(n * 16 * 100) / 100}px`;
const fmt = (val) => {
  if (val && typeof val === 'object' && 'value' in val) return `${val.value}${val.unit ?? ''}${val.unit === 'em' || val.unit === 'rem' ? ` · ${px(val.value)}` : ''}`;
  return val === undefined || val === null ? '' : String(val);
};
// A variable's value in a mode, as text: the variable it points at, or the value.
const show = (v, mode) => {
  const alias = v.alias?.[mode] ?? (mode !== 'Base' ? v.alias?.Base : undefined);
  if (alias) return alias.split('/').slice(1).join(' / ');
  const val = v.values?.[mode] ?? v.values?.Base;
  return fmt(val);
};

// ---- building blocks: the one row pattern, and the one table pattern
const row = (name, cls, note, demo, demoClass = 'sg-row-demo') => `
            <div class="sg-row">
              <div class="sg-row-meta">
                <div class="sg-row-name">${esc(name)}</div>${cls ? `
                <div class="sg-row-class">${esc(cls)}</div>` : ''}${note ? `
                <div class="sg-row-note">${esc(note)}</div>` : ''}
              </div>
              <div class="${demoClass}">${demo}</div>
            </div>`;
const table = (head, rows) => `<div class="sg-table">
                  <div class="sg-table-row is-head">${head.map((h, i) => `<div class="${i ? 'sg-table-cell' : 'sg-table-key'}">${esc(h)}</div>`).join('')}</div>
${rows.map((r) => `                  <div class="sg-table-row">${r.map((c, i) => `<div class="${i ? 'sg-table-cell' : 'sg-table-key'}">${c}</div>`).join('')}</div>`).join('\n')}
                </div>`;

const sections = new Map(SECTIONS.map(([id]) => [id, []]));
const add = (id, html) => sections.get(id).push(html);
const combos = []; // generated CSS: one combo per colour / radius / spacing variable

// ---- 2 colors: every Color variable outside the semantic collection
const colorCombo = new Map(); // "Colors/Brand/Ink" → "is-brand-ink"
{
  const taken = new Set();
  const groups = new Map();
  for (const c of V) {
    if (c.collection === SEMANTIC) continue;
    for (const v of c.variables.filter((x) => x.type === 'Color')) {
      let combo = `is-${slug(v.name)}`;
      if (taken.has(combo)) combo = `is-${slug(`${c.collection}-${v.name}`)}`;
      taken.add(combo);
      colorCombo.set(`${c.collection}/${v.name}`, combo);
      combos.push(`.sg-swatch-color.${combo} { background-color: var(${v.cssName}); }`);
      const [group, ...rest] = v.name.split('/');
      const key = `${c.collection} / ${rest.length ? group : 'Colors'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ v, combo, label: rest.length ? rest.join(' / ') : v.name });
    }
  }
  for (const [key, list] of groups) {
    add('colors', row(key, '', `${list.length} variable${list.length === 1 ? '' : 's'}`, `
                <div class="sg-swatches">
${list.map(({ v, combo, label }) => `                  <div class="sg-swatch"><div class="sg-swatch-color ${combo}"></div><div class="sg-swatch-name">${esc(label)}</div><div class="sg-swatch-value">${esc(show(v, 'Base'))}</div></div>`).join('\n')}
                </div>`));
  }
}
const dot = (alias) => (colorCombo.has(alias) ? `<div class="sg-dot"><div class="sg-swatch-color ${colorCombo.get(alias)}"></div></div>` : '');

// ---- 3 themes: Base, then every class that sets a Colors Semantic mode
{
  const sem = coll(SEMANTIC);
  const themed = S.filter((s) => s.variableModes?.main?.[SEMANTIC] && s.selector?.startsWith('.'));
  const sample = `<div class="s-wrapper">${hasClass('d4') ? '<div class="d4">Heading on this theme</div>' : ''}<p>Text / Primary on Background / Page.${hasClass('text-secondary') ? ' <span class="text-secondary">Text / Secondary.</span>' : ''} <a href="#themes">A link</a>.</p>${hasClass('button-color') ? '<a class="button" href="#themes"><div class="button-color"><div class="button-size"><div class="button-content"><div>Button</div></div></div></div></a>' : hasClass('button') ? '<a class="button" href="#themes">Button</a>' : ''}</div>`;
  if (sem && hasClass('section')) {
    add('themes', row('Base', '.section', `${SEMANTIC} → ${sem.modes?.[0] ?? 'Base'}`, `<div class="sg-theme-frame"><div class="section">${sample}</div></div>`));
    for (const s of themed) {
      add('themes', row(nameOf(s.selector), s.selector, `${SEMANTIC} → ${s.variableModes.main[SEMANTIC]}`, `<div class="sg-theme-frame"><div class="${(chains.get(s.selector) ?? s.selector.slice(1).split('.')).join(' ')}">${sample}</div></div>`));
    }
  }
  if (sem?.variables.length) {
    const modes = sem.modes?.length ? sem.modes : ['Base'];
    add('themes', row('Semantic colours', '', 'What each role points at, per mode', table(['Variable', ...modes],
      sem.variables.map((v) => [esc(v.name), ...modes.map((m) => `${dot(v.alias?.[m] ?? '')}<div>${esc(show(v, m))}</div>`)]))));
  }
}

// ---- 4 typography: every class that sets a Typography Styles mode
{
  const role = coll(ROLE);
  const sizes = (mode) => {
    const v = role?.variables.find((x) => x.name === `Size/${mode}`);
    if (!v) return '';
    const vals = (role.modes ?? ['Base']).map((m) => show(v, m).replace(/^Size \/ /, ''));
    return [...new Set(vals)].length === 1 ? vals[0] : `${vals.join(' → ')}, desktop to mobile`;
  };
  // Large roles get a short sample, so a display size doesn't fill the screen.
  const baseSize = (mode) => {
    let v = role?.variables.find((x) => x.name === `Size/${mode}`);
    for (let i = 0; v?.alias?.Base && i < 5; i++) v = byAlias.get(v.alias.Base);
    return v?.values?.Base?.value ?? 1;
  };
  const sampleFor = (mode) => (baseSize(mode) >= 2.5 ? 'The quick brown fox' : 'The quick brown fox jumps over the lazy dog');
  // In the order of the Typography Styles modes (Display, H1 … Button), not the snapshot's.
  const order = coll(STYLES)?.modes ?? [];
  const rank = (x) => { const i = order.indexOf(x.variableModes.main[STYLES]); return i < 0 ? order.length : i; };
  const typed = S.filter((x) => x.variableModes?.main?.[STYLES] && x.selector?.startsWith('.') && !x.selector.slice(1).includes('.')).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  for (const s of typed) {
    const mode = s.variableModes.main[STYLES];
    const size = sizes(mode);
    add('typography', row(s.name, s.selector, `${mode} role${size ? `. Size ${size}.` : ''}`, `<div class="${s.selector.slice(1)}">${sampleFor(mode)}</div>`));
  }
  // Native tags: what a heading, paragraph or link looks like with no class.
  const TAGS = [['h1', 'All H1 Headings'], ['h2', 'All H2 Headings'], ['h3', 'All H3 Headings'], ['h4', 'All H4 Headings'], ['h5', 'All H5 Headings'], ['h6', 'All H6 Headings'], ['p', 'All Paragraphs'], ['a', 'All Links']];
  const tagged = TAGS.filter(([t]) => S.some((x) => x.selector === t));
  for (const [t, label] of tagged) {
    const mode = S.find((x) => x.selector === t).variableModes?.main?.[STYLES];
    add('typography', row(label, t, mode ? `Tag style · ${mode}` : 'Tag style', t === 'a' ? '<p>A paragraph with <a href="#typography">a link</a> in it.</p>' : `<${t}>${t === 'h1' || t === 'h2' ? 'The quick brown fox' : 'The quick brown fox jumps over the lazy dog'}</${t}>`));
  }
  // Font features set on the Body tag style apply to all text: show what they change.
  const features = S.find((x) => x.selector === 'body')?.properties?.main?.['font-feature-settings'];
  if (features) add('typography', row('Font features', 'body', `font-feature-settings: ${features}. Set once on the Body tag style, so all text inherits it.`, '<div class="sg-glyphs">Illegal 0123456789 ij äöü !?</div>'));
  const scale = coll(NAMES.typeScale);
  if (scale?.variables.length) add('typography', row('Type scale', '', `${scale.variables.length} variables`, table(['Variable', 'Value'], scale.variables.map((v) => [esc(v.name), `<div>${esc(show(v, 'Base'))}</div>`]))));
}

// ---- 5 utilities: one row per family
{
  const FAMILIES = ['Size', 'Weight', 'Leading', 'Tracking', 'Text', 'Max Width'];
  for (const fam of FAMILIES) {
    const list = S.filter((s) => new RegExp(`^${fam}\\b`).test(s.name) && s.selector?.startsWith('.') && !s.selector.slice(1).includes('.') && !s.variableModes?.main?.[STYLES]);
    if (!list.length) continue;
    list.sort((a, b) => (parseFloat(a.name.replace(/\D+/g, '')) || 0) - (parseFloat(b.name.replace(/\D+/g, '')) || 0));
    add('utilities', row(fam, '', `${list.length} class${list.length === 1 ? '' : 'es'}`, `
                <div class="sg-ramp">${list.map((s) => `<div class="${s.selector.slice(1)}">${esc(s.name)}</div>`).join('')}</div>`));
  }
}

// ---- 6 spacing, radius and layout, then any other collection the site has
{
  const modesOf = (c) => (c.modes?.length ? c.modes : ['Base']);
  const tableOf = (c, vars) => {
    const modes = modesOf(c);
    return modes.length > 1
      ? table(['Variable', ...modes], vars.map((v) => [esc(v.name), ...modes.map((m) => `<div>${esc(show(v, m))}</div>`)]))
      : table(['Variable', 'Value'], vars.map((v) => [esc(v.name), `<div>${esc(show(v, modes[0]))}</div>`]));
  };
  const isRadius = (c, v) => c.collection === NAMES.radius || /^Radius\//.test(v.name);
  const spc = coll(NAMES.spacing);
  const sp = (spc?.variables ?? []).filter((v) => !isRadius(spc, v));
  if (sp.length) {
    const modes = modesOf(spc);
    add('spacing', row(spc.collection, '', `${sp.length} variables`, table(['Variable', ...(modes.length > 1 ? modes : ['Value']), 'Size'], sp.map((v) => {
      const combo = `is-${slug(v.name)}`;
      combos.push(`.sg-bar.${combo} { width: var(${v.cssName}); }`);
      return [esc(v.name), ...modes.map((m) => `<div>${esc(show(v, m))}</div>`), `<div class="sg-bar ${combo}"></div>`];
    }))));
  }
  const rad = V.flatMap((c) => c.variables.filter((v) => v.type !== 'Color' && isRadius(c, v)).map((v) => ({ c, v })));
  if (rad.length) {
    add('spacing', row('Radius', '', `${rad.length} variables`, `
                <div class="sg-swatches">
${rad.map(({ v }) => {
    const combo = `is-${slug(v.name.replace(/^Radius\//, ''))}`;
    combos.push(`.sg-radius.${combo} { border-radius: var(${v.cssName}); }`);
    return `                  <div class="sg-swatch"><div class="sg-radius ${combo}"></div><div class="sg-swatch-name">${esc(v.name)}</div><div class="sg-swatch-value">${esc(show(v, 'Base'))}</div></div>`;
  }).join('\n')}
                </div>`));
  }
  const lay = coll(NAMES.layout);
  if (lay?.variables.length) add('spacing', row(lay.collection, '', modesOf(lay).length > 1 ? 'Per breakpoint' : `${lay.variables.length} variables`, tableOf(lay, lay.variables)));
  // A site is free to add collections: show whatever else it has.
  const known = new Set(Object.values(NAMES));
  for (const c of V) {
    if (known.has(c.collection)) continue;
    const vars = c.variables.filter((v) => v.type !== 'Color');
    if (vars.length) add('spacing', row(c.collection, '', `${vars.length} variables`, tableOf(c, vars)));
  }
}

// ---- 7–10 buttons, forms, components, page sections: specimens
// An item is a header comment followed by markup:
//   <!-- sg: section=buttons | name=Button | class=.button | note=Hover: … -->
// in design/style-guide/items/*.html, or, taken from a real page so it
// stays in step with it:
//   <!-- sg:start section=components | name=Card | note=… --> … <!-- sg:end -->
const HAND = new Set(SPECIMEN_SECTIONS);
const meta = (text, where) => {
  const m = Object.fromEntries(text.split(/\|(?=\s*[a-z]+\s*=)/).map((p) => p.trim()).filter(Boolean).map((p) => { const i = p.indexOf('='); return i < 0 ? [p, ''] : [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }));
  if (!HAND.has(m.section)) { console.error(`${where}: section must be one of ${[...HAND].join(', ')} (got "${m.section ?? ''}")`); process.exit(1); }
  if (!m.name) { console.error(`${where}: an item needs name=…`); process.exit(1); }
  return m;
};
// Specimens are not the live component: no ids (they would repeat), no
// script hooks, nothing focusable.
const clean = (html) => expand(html)
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<[a-zA-Z][^>]*>/g, (tag) => tag.replace(/\s(?:data-[\w-]+(?:="[^"]*")?|(?:id|for|aria-labelledby|aria-controls|aria-describedby)="[^"]*")/g, ''))
  .replace(/<video\b([^>]*)\bposter="([^"]*)"[^>]*>[\s\S]*?<\/video>/g, (_, pre, poster) => `<img${(pre.match(/\sclass="[^"]*"/) ?? [''])[0]} src="${poster}" alt="">`)
  .trim();
const specimen = (m, html) => {
  const body = useMarkup(clean(html));
  const demo = m.section === 'page-sections'
    ? `<div class="sg-preview" inert="true"><div class="sg-preview-screen">${body}</div></div>`
    : `<div class="sg-demo" inert="true">${body}</div>`;
  add(m.section, row(m.name, m.class ?? '', m.note ?? '', demo));
};
const itemsDir = 'design/style-guide/items';
if (exists(itemsDir)) {
  for (const f of fs.readdirSync(path.join(root, itemsDir)).filter((x) => x.endsWith('.html')).sort()) {
    const parts = read(`${itemsDir}/${f}`).split(/<!--\s*sg:(?!start|end)\s*([\s\S]*?)-->/);
    for (let i = 1; i < parts.length; i += 2) specimen(meta(parts[i], `${itemsDir}/${f}`), parts[i + 1] ?? '');
  }
}
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name.startsWith('.') || ['node_modules', 'dist', 'partials', 'public', 'src', 'scripts', 'webflow-snapshot'].includes(e.name)) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (rel !== path.join('design', 'style-guide')) walk(rel); } else if (e.name === 'index.html') pages.push(rel);
  }
})('.');
for (const f of pages.sort()) {
  for (const [, head, body] of read(f).matchAll(/<!--\s*sg:start\s*([\s\S]*?)-->([\s\S]*?)<!--\s*sg:end\s*-->/g)) specimen(meta(head, f), body);
}

// ---- 1 overview: what the page is, how to use it, the site at a glance
{
  const all = V.flatMap((c) => c.variables);
  const fonts = [...new Set(all.filter((v) => v.type === 'FontFamily' && !v.alias?.Base).map((v) => show(v, 'Base')).filter(Boolean))];
  const HOW = [
    ['Find it', 'Use the list of sections. Every variable, class and component this site uses is on this page, grouped by kind.'],
    ['Read a row', 'On the left: the name as the Designer shows it, the CSS class, and what it is bound to. On the right: the real thing, drawn by the site’s own styles.'],
    ['Reuse before you add', 'Building something new? Look here first, and use the variable or class that already exists.'],
    ['Add it here', 'A new class or component gets its row here in the same piece of work, so nothing is lost when unused styles are cleaned up.'],
  ];
  const stats = [[all.length, 'Variables'], [V.filter((c) => c.variables.length).length, 'Variable collections'], [chains.size, 'Classes and combos'], [4, 'Breakpoints']];
  add('overview', `
            <div class="sg-section-head">
              <div class="sg-eyebrow">Design system</div>
              <h1 class="sg-title">Style guide</h1>
              <p class="sg-intro">Every variable, class and component this site is built from, drawn by the site’s own styles. Start here before you build or change anything.</p>
            </div>`);
  add('overview', row('How to use this page', '', 'Four habits that keep the site consistent.', `
                <div class="sg-cards">
${HOW.map(([t, d], i) => `                  <div class="sg-card"><div class="sg-card-step">${String(i + 1).padStart(2, '0')}</div><div class="sg-card-title">${esc(t)}</div><div class="sg-card-text">${esc(d)}</div></div>`).join('\n')}
                </div>`));
  add('overview', row('At a glance', '', 'Counted from the site’s variables and CSS each time this page is generated.', `
                <div class="sg-stats">
${stats.map(([n, l]) => `                  <div class="sg-stat"><div class="sg-stat-value">${n}</div><div class="sg-stat-label">${esc(l)}</div></div>`).join('\n')}
                </div>`));
  if (fonts.length) add('overview', row(fonts.length === 1 ? 'Font' : 'Fonts', '', `Set in ${NAMES.typeScale}. Every text role reads its family from there.`, fonts.map((f) => `<div class="sg-glyphs">${esc(f)}</div>`).join('')));
  add('overview', row('Variables', '', 'A mode is a second set of values for the same variables: a theme, a breakpoint or a text role.', table(['Collection', 'Variables', 'Modes'],
    V.filter((c) => c.variables.length).map((c) => [esc(c.collection), `<div>${c.variables.length}</div>`, `<div>${esc((c.modes?.length ? c.modes : ['Base']).join(' · '))}</div>`]))));
  add('overview', row('Breakpoints', '', 'Styles are set on Desktop and passed down. A smaller breakpoint only holds what changes.', table(['Breakpoint', 'Applies at'],
    [['Desktop', '992px and wider'], ['Tablet', '991px and narrower'], ['Mobile landscape', '767px and narrower'], ['Mobile', '479px and narrower']].map(([k, v]) => [k, `<div>${v}</div>`]))));
}

// ---- 11 other classes: every class or combo nothing above applies
useMarkup(expand('<!-- @include partials/nav.html --><!-- @include partials/footer.html -->'));
for (const html of sections.values()) html.forEach(useMarkup);
['g-page-w', 'g-main-w'].forEach((c) => used.add(c));
const left = [...chains].filter(([, cls]) => !cls.every((c) => used.has(c)) && !cls[0].startsWith('sg-'));
if (left.length) {
  add('other-classes', row('Kept for cleanup', '', `${left.length} class${left.length === 1 ? '' : 'es'} or combo${left.length === 1 ? '' : 's'} not shown above. Each is applied here so Webflow's “Clean up unused styles” can't delete it.`, `
                <div class="sg-tiles">
${left.map(([sel, cls]) => `                  <div class="sg-tile"><div class="sg-row-name">${esc(nameOf(sel))}</div><div class="sg-row-class">${esc(sel)}</div><div class="sg-tile-box" aria-hidden="true"><div class="${cls.join(' ')}"></div></div></div>`).join('\n')}
                </div>`));
  left.forEach(([, cls]) => cls.forEach((c) => used.add(c)));
}

// ---- the page
const present = SECTIONS.filter(([id]) => sections.get(id).length);
const num = (i) => String(i + 1).padStart(2, '0');
const body = present.map(([id, title, intro], i) => `
          <section class="sg-section${i ? '' : ' is-first'}" id="${anchorOf(id)}"${id === 'overview' ? '' : ` aria-labelledby="${anchorOf(id)}-title"`}>${id === 'overview' ? '' : `
            <div class="sg-section-head">
              <div class="sg-eyebrow">${num(i)}</div>
              <h2 class="sg-section-title" id="${anchorOf(id)}-title">${esc(title)}</h2>${intro ? `
              <p class="sg-intro">${esc(intro)}</p>` : ''}
            </div>`}${sections.get(id).join('')}
          </section>`).join('');
// The number and the label are blocks inside a Link Block (a span would be
// imported as a text Span and flatten when the link text is edited).
const sidebar = present.map(([id, title], i) => `<a class="sg-sidebar-link" href="#${anchorOf(id)}"><div class="sg-sidebar-number">${num(i)}</div><div>${esc(title)}</div></a>`).join('\n          ');

fs.mkdirSync(path.join(root, 'design/style-guide'), { recursive: true });
fs.writeFileSync(path.join(root, 'design/style-guide/index.html'), `<!doctype html>
<!-- GENERATED by \`pnpm style-guide\` (webflow-style-guide skill). Do not edit:
     add specimens in ${itemsDir}/ or with sg:start blocks in a page.
     Webflow: page "Style Guide" in the folder "design" (/design/style-guide),
     excluded from search and the sitemap. -->
<html lang="en" class="is-loading">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Style guide</title>
<!-- @include partials/head.html -->
<link rel="stylesheet" href="/src/css/style-guide.css">
<script type="module" src="/src/main.ts"></script>
</head>
<body>
<div class="g-page-w">
  <!-- @include partials/nav.html -->
  <div class="g-main-w">
    <main id="main">
      <div class="sg-layout">
        <nav class="sg-sidebar" aria-label="Style guide sections" data-sg-nav>
          <div class="sg-sidebar-title">Style guide</div>
          ${sidebar}
        </nav>
        <div class="sg-content">${body}
        </div>
      </div>
    </main>
    <!-- @include partials/footer.html -->
  </div>
</div>
</body>
</html>
`);

const sg = fs.readFileSync(path.join(here, '..', 'sg.css'), 'utf8');
fs.writeFileSync(path.join(root, 'src/css/style-guide.css'), `/* GENERATED by \`pnpm style-guide\`. Do not edit: the layout is the skill's
   sg.css, the same on every site; the combos below are one per variable. */
${sg.replace(/^\/\*[\s\S]*?\*\/\n/, '')}
/* One combo per colour variable (Sg Swatch Color + Is …), per radius
   variable (Sg Radius + Is …) and per spacing variable (Sg Bar + Is …).
   In Webflow each binds its variable. */
${combos.join('\n')}
`);

const count = (id) => sections.get(id).length;
console.log(`style guide: ${present.length} sections (${present.map(([id]) => id).join(', ')}) · ${used.size} classes applied · ${left.length} on tiles · ${combos.length} variable combos · ${count('buttons') + count('forms') + count('components') + count('page-sections')} specimens`);
