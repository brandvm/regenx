// Load filmstrip: what the visitor sees in the first seconds of a page.
//   node load-film.mjs <path> [selector] [width] [--live]
// Logs every frame in which <html> classes, body visibility or the watched
// elements' visibility/opacity change (default selector: [data-hero-item]).
// A healthy intro goes hidden → 0 → rising. A flicker shows as items at
// 1.00 before the animation, then dropping to 0 and rising again.
import { loadConfig, args, browser, page, bust } from './lib.mjs';

const cfg = loadConfig();
const { pos, live } = args();
const route = pos[0] ?? '/';
const selector = pos[1] ?? '[data-hero-item]';
const size = pos[2] ? cfg.widths.find(([w]) => w === +pos[2]) : cfg.widths[0];
const b = await browser(cfg);
const p = await page(b, cfg, cfg.stagingUrl + route, size, { live });
await p.addInitScript((sel) => {
  window.__log = [];
  const t0 = performance.now();
  const snap = () => {
    const h = document.documentElement;
    const items = [...document.querySelectorAll(sel)];
    const row = [Math.round(performance.now() - t0), h.className, document.body ? getComputedStyle(document.body).visibility : '-',
      items.map((e) => { const c = getComputedStyle(e); return c.visibility[0] + (+c.opacity).toFixed(2) + (e.style.transform ? 'T' : ''); }).join(' ')];
    const last = window.__log[window.__log.length - 1];
    if (!last || last.slice(1).join() !== row.slice(1).join()) window.__log.push(row);
    if (performance.now() - t0 < 4000) requestAnimationFrame(snap);
  };
  requestAnimationFrame(snap);
}, selector);
await p.goto(bust(cfg.stagingUrl + route));
await p.waitForTimeout(4500);
const log = await p.evaluate(() => window.__log);
console.log(`${route}  ${selector}  ${size.join('×')}   [ms, html classes, body visibility, items: v|h + opacity + T(transformed)]`);
log.slice(0, 40).forEach((r) => console.log(JSON.stringify(r)));
if (log.length > 40) console.log(`… ${log.length - 40} more frames`);
await b.close();
