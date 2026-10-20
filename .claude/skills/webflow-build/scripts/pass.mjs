// Full-page pass: prototype vs Webflow staging, one page, top to bottom.
//   node pass.mjs <path> [width] [--live]
// Reports document height, every top-level section's offset/height (pin
// spacers included), and each half-screen frame whose pixels differ by more
// than 2%. Differing frames are saved as PNG pairs in .webflow-build/pass/.
// Expect the hero (video frames) to differ; everything else should match.
import fs from 'fs';
import { loadConfig, args, browser, page, bust, scrollTo, outDir, pixelDiff } from './lib.mjs';

const cfg = loadConfig();
const { pos, live } = args();
const route = pos[0] ?? '/';
const sizes = pos[1] ? cfg.widths.filter(([w]) => w === +pos[1]) : cfg.widths;
const out = outDir('pass');
const b = await browser(cfg);

const meta = (p) => p.evaluate(() => ({
  h: document.documentElement.scrollHeight,
  secs: [...document.querySelectorAll('main section')].filter((s) => !s.parentElement.closest('section')).map((s) => {
    const sp = s.parentElement.classList.contains('pin-spacer') ? s.parentElement : s;
    const r = sp.getBoundingClientRect();
    return [s.id || [...s.classList].slice(0, 3).join('.'), Math.round(r.top + scrollY), Math.round(r.height)];
  }),
}));

for (const size of sizes) {
  const [W, H] = size;
  const P = await page(b, cfg, cfg.prototypeUrl + route, size);
  const S = await page(b, cfg, cfg.stagingUrl + route, size, { live });
  await P.goto(bust(cfg.prototypeUrl + route), { waitUntil: 'load' });
  await S.goto(bust(cfg.stagingUrl + route), { waitUntil: 'load' });
  await P.waitForTimeout(3500);
  const mp = await meta(P), ms = await meta(S);
  console.log(`\n== ${W}×${H}  ${route}  document height  prototype ${mp.h}  webflow ${ms.h}${mp.h === ms.h ? '' : '  <<'}`);
  const n = Math.max(mp.secs.length, ms.secs.length);
  for (let i = 0; i < n; i++) {
    const a = mp.secs[i], c = ms.secs[i];
    const same = a && c && a[1] === c[1] && a[2] === c[2];
    console.log(`  ${same ? ' ' : '<'} ${JSON.stringify(a)}  ${JSON.stringify(c)}`);
  }
  const diffs = [];
  for (let y = 0, i = 0; y < Math.max(mp.h, ms.h) - H * 0.5; y += Math.round(H * 0.5), i++) {
    await scrollTo(P, y); await scrollTo(S, y);
    await P.waitForTimeout(1300);
    const [a, c] = await Promise.all([P.screenshot(), S.screenshot()]);
    const [f, y0, y1] = await pixelDiff(b, a, c);
    if (f > 0.02) {
      const k = `${W}-${String(i).padStart(2, '0')}`;
      fs.writeFileSync(`${out}/${k}-prototype.png`, a); fs.writeFileSync(`${out}/${k}-webflow.png`, c);
      diffs.push(`y=${y} ${(f * 100).toFixed(1)}% rows ${y0}–${y1}`);
    }
  }
  console.log(`  frames >2% different: ${diffs.length ? '\n    ' + diffs.join('\n    ') : 'none'}`);
  const errs = [...P.errors.map((e) => 'prototype ' + e), ...S.errors.map((e) => 'webflow ' + e)].filter((e) => !e.includes('%c%d'));
  if (errs.length) console.log('  errors:', errs);
  await P.close(); await S.close();
}
console.log(`\nPNG pairs: ${out}`);
await b.close();
