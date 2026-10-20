// Page transitions (Barba) on staging: navigate around and check each swap.
//   node transitions.mjs <start path> <path> [path...] [--live] [--width W]
// Starting from <start path>, clicks a link to each following path in turn
// (the first matching a[href] on the page, preferring one with
// [data-transition-image] for the zoom), then returns to the start, three
// rounds. After every swap it checks: one Barba container, URL and
// namespace, page height and pin-spacer count against the direct load (leaks
// show up as growing counts), stray clones on <body>, and errors. "full
// loads" should stay 1 — more means a link fell back to a normal page load.
import { loadConfig, args, browser, page, bust } from './lib.mjs';

const cfg = loadConfig();
const { pos, values, live } = args();
const size = values.width ? cfg.widths.find(([w]) => w === +values.width) ?? [+values.width, 900] : cfg.widths[0];
const [start, ...stops] = pos;
if (!start || !stops.length) { console.error('usage: transitions.mjs <start path> <path> [path...]'); process.exit(1); }
const b = await browser(cfg);
const p = await page(b, cfg, cfg.stagingUrl + start, size, { live });
let loads = 0;
p.on('load', () => loads++);
const state = () => p.evaluate(() => ({
  path: location.pathname + location.hash,
  ns: document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace,
  containers: document.querySelectorAll('[data-barba="container"]').length,
  height: document.documentElement.scrollHeight,
  pins: document.querySelectorAll('.pin-spacer').length,
  bodyImgs: document.querySelectorAll('body > img').length,
  scrollY: Math.round(scrollY),
}));
const go = async (path) => {
  const ok = await p.evaluate((path) => {
    const links = [...document.querySelectorAll(`a[href="${path}"], a[href="${location.origin}${path}"]`)];
    const a = links.find((l) => l.querySelector('[data-transition-image]')) ?? links[0];
    if (!a) return false;
    a.click();
    return true;
  }, path);
  if (!ok) return null;
  await p.waitForTimeout(3200);
  return state();
};

await p.goto(bust(cfg.stagingUrl + start), { waitUntil: 'load' });
await p.waitForTimeout(3000);
const base = await state();
console.log('direct  ', JSON.stringify(base));
for (let round = 1; round <= 3; round++) {
  for (const path of [...stops, start]) {
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(300);
    const s = await go(path);
    if (!s) { console.log(`r${round} ✗ no link to ${path} on ${await p.evaluate(() => location.pathname)}`); continue; }
    const flags = [s.containers !== 1 && 'containers', s.bodyImgs && 'stray clone',
      path === start && (s.height !== base.height || s.pins !== base.pins) && 'height/pins differ from direct load'].filter(Boolean);
    console.log(`r${round} ${flags.length ? '✗' : '✓'} → ${path.padEnd(24)} ${JSON.stringify(s)}${flags.length ? '  << ' + flags.join(', ') : ''}`);
  }
}
console.log('full loads', loads, p.errors.length ? '\nerrors ' + JSON.stringify(p.errors) : '');
await b.close();
