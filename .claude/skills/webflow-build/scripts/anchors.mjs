// Anchor links on staging: does every #section link land on its section?
//   node anchors.mjs <path> [width] [--live] [--offset N]
// For every distinct hash link on the page (nav, menu, footer, content),
// starts from the bottom of <path> and clicks it (same-page links), and
// from <path> for links into other pages (cross-page, e.g. /#services from
// /about). Reports where the target landed: its top should equal the
// expected offset (default 0 = flush with the top of the viewport; pass
// --offset 72 for a fixed nav). Pinned targets are measured at their
// .pin-spacer (the start of the pin), which is where an anchor should land.
import { loadConfig, args, browser, page, bust, scrollTo } from './lib.mjs';

const cfg = loadConfig();
const { pos, values, live } = args();
const route = pos[0] ?? '/';
const expected = values.offset ? +values.offset : 0;
const sizes = pos[1] ? cfg.widths.filter(([w]) => w === +pos[1]) : cfg.widths;
const b = await browser(cfg);

for (const size of sizes) {
  console.log(`\n== ${size[0]}×${size[1]}  from ${route}  (expected top ${expected})`);
  const p = await page(b, cfg, cfg.stagingUrl + route, size, { live });
  await p.goto(bust(cfg.stagingUrl + route), { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="#"]')].map((a) => a.getAttribute('href')).filter((h) => h && h !== '#' && !h.startsWith('#/')))]);
  for (const href of links) {
    const url = new URL(href, cfg.stagingUrl + route);
    const samePage = url.pathname === new URL(cfg.stagingUrl + route).pathname || href.startsWith('#');
    await p.goto(bust(cfg.stagingUrl + route), { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    if (samePage) { await scrollTo(p, 1e6); await p.waitForTimeout(1500); }
    const clicked = await p.evaluate((href) => { const a = document.querySelector(`a[href="${href}"]`); if (!a) return false; a.click(); return true; }, href);
    if (!clicked) { console.log('  ?', href, 'not clickable'); continue; }
    await p.waitForTimeout(3500);
    const r = await p.evaluate((id) => {
      const t = document.getElementById(id);
      if (!t) return { missing: true, path: location.pathname + location.hash };
      const el = t.parentElement?.classList.contains('pin-spacer') ? t.parentElement : t;
      return { top: Math.round(el.getBoundingClientRect().top), y: Math.round(scrollY), path: location.pathname + location.hash };
    }, url.hash.slice(1));
    const ok = !r.missing && Math.abs(r.top - expected) <= 2;
    console.log(`  ${ok ? 'ok ' : 'BAD'} ${(samePage ? 'same  ' : 'cross ') + href.padEnd(28)} ${JSON.stringify(r)}`);
  }
  if (p.errors.length) console.log('  errors:', p.errors);
  await p.close();
}
await b.close();
