// Measure the type on the style guide as rendered, at desktop and mobile.
//   pnpm measure:type [--width 1440,390] [--json]
// Every typography specimen (`data-sg-type`, written by `pnpm style-guide`)
// on /design/style-guide: font size in px, line height as a % of the size,
// letter spacing in em, weight, case and family, per width. Compare it with
// the design's type sheet before the classes go into Webflow: a variable
// mode that didn't switch, a fluid size that lands off the design, or a
// family that fell back shows here as a number, not a squint.
// --json also writes .screens/type-metrics.json.
// The dev server is used if it runs, started for the run if not.
import fs from 'node:fs';
import path from 'node:path';
import { args, devServer, chromium, outDir } from './lib.mjs';

const { flags, values } = args(['--width']);
const list = (values.width ?? '1440,390').split(',').map(Number).filter(Boolean);

const server = await devServer();
const browser = await (await chromium()).launch();
const out = {};
try {
  for (const width of list) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(server.url + '/design/style-guide', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const rows = await page.$$eval('[data-sg-type]', (els) => els.map((el) => {
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      return [el.dataset.sgType, {
        size: `${Math.round(size * 10) / 10}px`,
        lh: cs.lineHeight === 'normal' ? 'normal' : `${Math.round((parseFloat(cs.lineHeight) / size) * 100)}%`,
        ls: cs.letterSpacing === 'normal' ? 'normal' : `${Math.round((parseFloat(cs.letterSpacing) / size) * 1000) / 1000}em`,
        weight: cs.fontWeight,
        case: cs.textTransform,
        family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      }];
    }));
    for (const [name, m] of rows) (out[name] ??= {})[width] = m;
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
}

const names = Object.keys(out);
if (!names.length) {
  console.error('measure-type: no [data-sg-type] specimens on /design/style-guide. Run pnpm style-guide first.');
  process.exit(1);
}
const cell = (m) => (m ? `${m.size} / ${m.lh} / ${m.ls} · ${m.weight}${m.case !== 'none' ? ` · ${m.case}` : ''}` : '–');
const w = Math.max(...names.map((n) => n.length));
console.log(`${'Specimen'.padEnd(w)}  ${list.map((x) => `${x}px: size / line height / tracking · weight`).join('  |  ')}`);
for (const n of names) console.log(`${n.padEnd(w)}  ${list.map((x) => cell(out[n][x])).join('  |  ')}`);
const families = [...new Set(names.flatMap((n) => list.map((x) => out[n][x]?.family).filter(Boolean)))];
console.log(`\nFamilies: ${families.join(', ')}`);
if (flags.has('--json')) {
  const file = path.join(outDir(), 'type-metrics.json');
  fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), file)}`);
}
