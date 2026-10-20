// Heading outline as screen readers and SEO tools read it.
//   node outline.mjs <path> [--live]
// Prints every h1–h6 with its text content and flags:
//   - words glued at a line break ("Built.Together"): a <br> with no space
//     before it (fix: `Line one.&nbsp;<br>Line two.`, or "text \nmore" in a
//     text prop);
//   - more or fewer than one h1, and skipped levels (h2 → h4).
import { loadConfig, args, browser, page, bust } from './lib.mjs';

const cfg = loadConfig();
const { pos, live } = args();
const route = pos[0] ?? '/';
const b = await browser(cfg);
const p = await page(b, cfg, cfg.stagingUrl + route, cfg.widths[0], { live });
await p.goto(bust(cfg.stagingUrl + route), { waitUntil: 'load' });
await p.waitForTimeout(2500);
const rows = await p.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => {
  const glued = [...h.querySelectorAll('br')].some((br) => {
    const prev = br.previousSibling, next = br.nextSibling;
    const a = prev?.textContent ?? '', z = next?.textContent ?? '';
    return a && z && !/[\s ]$/.test(a) && !/^[\s ]/.test(z);
  });
  return [h.tagName, h.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim(), glued];
}));
let prev = 0;
const h1s = rows.filter((r) => r[0] === 'H1').length;
rows.forEach(([tag, text, glued]) => {
  const lvl = +tag[1];
  const skip = prev && lvl > prev + 1;
  console.log(`${'  '.repeat(lvl - 1)}${tag}  ${text}${glued ? '   << no space at a line break' : ''}${skip ? '   << skipped a level' : ''}`);
  prev = lvl;
});
if (h1s !== 1) console.log(`<< ${h1s} h1 elements (expected 1)`);
await b.close();
