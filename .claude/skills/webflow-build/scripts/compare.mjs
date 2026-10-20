// Element geometry of one section: prototype vs Webflow staging.
//   node compare.mjs <path> <section selector> [width] [--live] [--scroll]
// Lists every element inside the section whose position or size differs
// (keyed by class list + first text). --scroll scrolls the section to the
// top of the viewport first (for pinned/sticky scenes, compare at rest).
// Positions are relative to the section. 1px drift is rounding; anything
// more is a real difference.
import { loadConfig, args, browser, page, bust, scrollTo } from './lib.mjs';

const cfg = loadConfig();
const { pos, flags, live } = args();
const [route, selector] = pos;
if (!route || !selector) { console.error('usage: compare.mjs <path> <section selector> [width]'); process.exit(1); }
const sizes = pos[2] ? cfg.widths.filter(([w]) => w === +pos[2]) : cfg.widths;
const b = await browser(cfg);

const read = (p) => p.evaluate((sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const o = root.getBoundingClientRect();
  const res = {};
  const seen = {};
  [root, ...root.querySelectorAll('*')].forEach((e) => {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return;
    const r = e.getBoundingClientRect();
    if (!r.width && !r.height) return;
    // First class + text without whitespace: Webflow drops the whitespace
    // between elements and adds combo classes, the prototype doesn't.
    const cls = typeof e.className === 'string' ? e.className.split(/\s+/).find((c) => c && !c.startsWith('w-')) : null;
    const base = `${cls || e.tagName.toLowerCase()} "${(e.textContent || '').replace(/\s+/g, '').slice(0, 18)}"`;
    seen[base] = (seen[base] ?? 0) + 1;
    res[seen[base] > 1 ? `${base} #${seen[base]}` : base] = [Math.round(r.left - o.left), Math.round(r.top - o.top), Math.round(r.width), Math.round(r.height)];
  });
  return res;
}, selector);

for (const size of sizes) {
  const out = {};
  for (const [n, base] of [['prototype', cfg.prototypeUrl], ['webflow', cfg.stagingUrl]]) {
    const p = await page(b, cfg, base + route, size, { live });
    await p.goto(bust(base + route), { waitUntil: 'load' });
    await p.waitForTimeout(3000);
    if (flags.has('--scroll')) {
      const y = await p.evaluate((sel) => document.querySelector(sel)?.getBoundingClientRect().top + scrollY, selector);
      await scrollTo(p, y); await p.waitForTimeout(1800);
    }
    out[n] = await read(p);
    await p.close();
  }
  console.log(`\n== ${size[0]}×${size[1]}  ${route}  ${selector}`);
  if (!out.prototype || !out.webflow) { console.log('  section missing:', !out.prototype ? 'prototype' : 'webflow'); continue; }
  let n = 0;
  for (const k in out.prototype) {
    const a = out.prototype[k], c = out.webflow[k];
    if (!c) { console.log('  only in prototype:', k); n++; continue; }
    if (a.some((v, i) => Math.abs(v - c[i]) > 1)) { console.log('  ', k, 'P', JSON.stringify(a), 'W', JSON.stringify(c)); n++; }
  }
  for (const k in out.webflow) if (!out.prototype[k]) { console.log('  only in webflow:', k); n++; }
  console.log(n ? `  ${n} differences` : '  matches (±1px)');
}
await b.close();
