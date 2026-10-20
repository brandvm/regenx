// Visual baselines: save full-page screenshots at launch, compare later.
//   node baseline.mjs save    [path...] [--live] [--dir baselines]
//   node baseline.mjs compare [path...] [--live] [--dir baselines] [--threshold 1]
// Paths default to config.pages, else /. Every configured width is shot.
// The page is scrolled to the bottom and back first, so scroll reveals have
// run; videos are masked and animations stopped. `save` writes
// <dir>/<width>/<page>.png next to the config (commit them: they are the
// reference); `compare` shoots again and reports the page height and the
// share of pixels that changed, saving pairs over --threshold percent to
// .webflow-build/baseline/. Use after launch and before every retainer
// release (webflow-launch).
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, args, browser, page, bust, scrollTo, outDir, pixelDiff, paths } from './lib.mjs';

const cfg = loadConfig();
const { pos, values, live } = args();
const [mode, ...routes] = pos;
if (!['save', 'compare'].includes(mode)) { console.error('usage: baseline.mjs save|compare [path...]'); process.exit(1); }
const dir = path.resolve(path.dirname(cfg.file), values.dir ?? 'baselines');
const threshold = +(values.threshold ?? 1) / 100;
const slug = (r) => (r === '/' ? 'home' : r.replace(/^\/|\/$/g, '').replace(/[^\w-]+/g, '_'));
const b = await browser(cfg);
let changed = 0;

async function shoot(route, size) {
  const p = await page(b, cfg, cfg.stagingUrl + route, size, { live });
  await p.goto(bust(cfg.stagingUrl + route), { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += size[1]) { await scrollTo(p, y); await p.waitForTimeout(150); }
  await scrollTo(p, 0); await p.waitForTimeout(1200);
  const png = await p.screenshot({ fullPage: true, animations: 'disabled', mask: [p.locator('video, iframe')] });
  await p.close();
  return [png, h];
}

for (const route of paths(cfg, routes)) {
  for (const size of cfg.widths) {
    const file = path.join(dir, String(size[0]), `${slug(route)}.png`);
    const [png, h] = await shoot(route, size);
    if (mode === 'save') {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, png);
      console.log(`saved  ${path.relative(path.dirname(cfg.file), file)}  (${h}px)`);
      continue;
    }
    if (!fs.existsSync(file)) { console.log(`no baseline  ${route} @${size[0]}: run save first`); continue; }
    const old = fs.readFileSync(file);
    const oldH = old.readUInt32BE(20); // PNG IHDR height (device scale 1)
    const [f, y0, y1] = await pixelDiff(b, old, png);
    const flag = f > threshold || oldH !== h;
    if (flag) {
      changed++;
      const out = outDir('baseline');
      fs.writeFileSync(path.join(out, `${size[0]}-${slug(route)}-before.png`), old);
      fs.writeFileSync(path.join(out, `${size[0]}-${slug(route)}-after.png`), png);
    }
    console.log(`${flag ? 'CHANGED' : 'same   '}  ${route.padEnd(24)} @${size[0]}  height ${oldH}→${h}  ${(f * 100).toFixed(1)}% pixels${f > 0 ? ` (rows ${y0}–${y1})` : ''}`);
  }
}
await b.close();
if (mode === 'compare') {
  console.log(changed ? `\n${changed} changed; pairs in .webflow-build/baseline/. Expected changes: run save again.` : '\nno visual changes');
  if (changed) process.exit(1);
}
