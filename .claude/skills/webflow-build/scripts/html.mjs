// Published-HTML check: what Webflow changed between the Designer and the
// published page, which no canvas or API read shows.
//   node html.mjs [/path…] [--live]
// For each path on staging it reads the HTML Webflow served (before any
// script ran) and the page after load, and reports:
//   - form fields published with Webflow's default name ("field",
//     "field-2"): a name set through the API never published;
//   - <a> used as a button: no href, or type="button" (the importer turned
//     a <button> into a Link): not focusable, no button role;
//   - a component set to a variant where no element carries the variant's
//     class: the variant's styles never apply (they were set on a combo);
//   - classes on elements that no stylesheet defines (a conditional class
//     typed with a typo, or a class renamed in the Style Manager);
//   - data-aria-role that no script applied, and list roles Webflow wrote
//     over an ARIA pattern (listbox, tablist, menu…);
//   - <video autoplay> without muted or playsinline (a valueless boolean
//     was dropped on publish): autoplay is blocked;
// With a prototype running, it also compares script hooks: every data-*
// attribute, id and aria-controls/labelledby target the prototype page has
// must exist on the published page (the importer drops attributes).
import { loadConfig, args, paths, browser, page, bust } from './lib.mjs';

const cfg = loadConfig();
const { pos, live } = args();
const b = await browser(cfg);
let problems = 0;

const collect = () => {
  const own = (n) => !n.startsWith('data-wf') && !n.startsWith('data-w-') && n !== 'data-node-type' && !n.startsWith('data-ix') && !n.startsWith('data-sg');
  const hooks = {};
  const ids = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    for (const a of el.attributes) if (a.name.startsWith('data-') && own(a.name)) hooks[a.name] = (hooks[a.name] ?? 0) + 1;
    if (el.id && !el.id.startsWith('w-')) ids.add(el.id);
  }
  return { hooks, ids: [...ids] };
};

for (const route of paths(cfg, pos)) {
  const url = cfg.stagingUrl + route;
  const p = await page(b, cfg, url, cfg.widths[0], { live });
  const res = await p.goto(bust(url), { waitUntil: 'load' });
  const served = await res.text();
  await p.waitForTimeout(2000);
  const out = [];
  const say = (msg) => { out.push(`  ${msg}`); problems++; };

  // From the HTML as served.
  for (const [tag] of served.matchAll(/<(?:input|select|textarea)\b[^>]*\bname="field(?:-\d+)?"[^>]*>/gi)) say(`default field name: ${tag.slice(0, 110)}…  Set the name in the Designer (type a value that differs from the one shown).`);
  for (const [tag] of served.matchAll(/<a\b(?![^>]*\bhref=)[^>]*>/gi)) say(`link with no href${/type="button"/.test(tag) ? ' and type="button" (an imported <button>)' : ''}: ${tag.slice(0, 110)}  Rebuild it as a DOM element with tag button, or give it a link.`);
  for (const [tag] of served.matchAll(/<video\b[^>]*\bautoplay\b[^>]*>/gi)) {
    const miss = ['muted', 'playsinline'].filter((a) => !new RegExp(`\\b${a}\\b`).test(tag));
    if (miss.length) say(`<video autoplay> without ${miss.join(' and ')}: ${tag.slice(0, 90)}…  Give the attribute a value (${miss[0]}="true"); a valueless one is dropped on publish.`);
  }

  // From the page after load.
  const dom = await p.evaluate(async () => {
    const out = { variants: [], undefinedClasses: [], roles: [], sheetsBlocked: 0 };
    // Classes any stylesheet defines.
    const defined = new Set();
    const add = (rules) => { for (const r of rules) { if (r.selectorText) for (const m of r.selectorText.matchAll(/\.((?:\\.|[\w-])+)/g)) defined.add(m[1].replace(/\\/g, '')); if (r.cssRules) add(r.cssRules); } };
    for (const s of document.styleSheets) {
      try { add(s.cssRules); } catch {
        // A cross-origin sheet: read its text instead.
        try { const css = await (await fetch(s.href)).text(); for (const m of css.matchAll(/\.((?:\\.|[\w-])+)(?=[^{}]*\{)/g)) defined.add(m[1].replace(/\\/g, '')); } catch { out.sheetsBlocked++; }
      }
    }
    const seen = new Map();
    for (const el of document.body.querySelectorAll('[class]')) {
      if (el.closest('svg')) continue;
      for (const c of el.classList) {
        if (defined.has(c) || /^(w-|wf-|w--|pin-spacer|lenis|swiper|fs-|is-loading|gsap)/.test(c)) continue;
        if (!seen.has(c)) seen.set(c, el.className.toString().slice(0, 80));
      }
    }
    out.undefinedClasses = [...seen];
    // Variants: the component root says which variant; some element must carry its class.
    for (const el of document.body.querySelectorAll('*')) {
      for (const a of el.attributes) {
        if (!/^data-wf--.+--variant$/.test(a.name) || !a.value || a.value === 'base') continue;
        const has = el.matches('[class*="w-variant-"]') || el.querySelector('[class*="w-variant-"]');
        if (!has) out.variants.push(`${a.name}="${a.value}" on <${el.tagName.toLowerCase()} class="${el.className.toString().slice(0, 60)}">`);
      }
    }
    for (const el of document.body.querySelectorAll('[data-aria-role]')) {
      if (el.getAttribute('role') !== el.dataset.ariaRole) out.roles.push(`data-aria-role="${el.dataset.ariaRole}" but role="${el.getAttribute('role') ?? ''}" on <${el.tagName.toLowerCase()} class="${el.className.toString().slice(0, 60)}">: no script applied it`);
    }
    for (const el of document.body.querySelectorAll('[role="list"], [role="listitem"]')) {
      const kids = el.querySelector('[role="option"], [role="tab"], [role="menuitem"]');
      if (kids && el.getAttribute('role') === 'list') out.roles.push(`role="list" on the parent of role="${kids.getAttribute('role')}" items (<${el.tagName.toLowerCase()} class="${el.className.toString().slice(0, 60)}">): Webflow wrote the list role over the pattern`);
    }
    return out;
  });
  for (const v of dom.variants) say(`variant without its class: ${v}.  The override was set on a combo; set it in the Designer with the element selected inside the variant.`);
  for (const [c, on] of dom.undefinedClasses) say(`class "${c}" is defined in no stylesheet (on class="${on}"): a conditional class typed with a typo, a renamed class, or a script hook that should be a data attribute.`);
  for (const r of dom.roles) say(r);
  if (dom.sheetsBlocked) out.push(`  (note: ${dom.sheetsBlocked} stylesheet(s) could not be read; undefined-class results may include their classes)`);

  // Against the prototype, when it is running.
  if (cfg.prototypeUrl) {
    const q = await page(b, cfg, cfg.prototypeUrl + route, cfg.widths[0]);
    const ok = await q.goto(cfg.prototypeUrl + route, { waitUntil: 'load' }).then((r) => r?.ok(), () => false);
    if (ok) {
      await q.waitForTimeout(1000);
      const [proto, pub] = [await q.evaluate(collect), await p.evaluate(collect)];
      for (const [name, n] of Object.entries(proto.hooks)) {
        const got = pub.hooks[name] ?? 0;
        if (got < n) say(`${name}: ${n} in the prototype, ${got} published.  Re-add it (the importer drops attributes on images, selects and spans).`);
      }
      const lost = proto.ids.filter((id) => !pub.ids.includes(id));
      if (lost.length) say(`ids in the prototype but not published: ${lost.join(', ')}`);
    } else out.push(`  (prototype not reachable at ${cfg.prototypeUrl + route}: hook comparison skipped)`);
    await q.close();
  }
  if (p.errors.length) for (const e of [...new Set(p.errors)].slice(0, 5)) say(`console: ${e.slice(0, 160)}`);
  console.log(`\n${route}\n${out.length ? out.join('\n') : '  published HTML matches what the build expects'}`);
  await p.close();
}
await b.close();
console.log(`\nhtml: ${problems} finding${problems === 1 ? '' : 's'}`);
if (problems) process.exit(1);
