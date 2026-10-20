// Automated accessibility scan (axe-core, WCAG 2.2 A/AA rules).
//   node a11y.mjs [path...] [--live] [--all-widths]
// Scans each path (default: config.pages, else /) at the widest configured
// width, plus the narrowest with --all-widths (menus and layouts differ).
// Lists every rule that fails with its impact and the first elements, and
// exits 1 when anything serious or critical fails. Automated rules catch
// roughly a third of WCAG issues: the keyboard walkthrough and a screen
// reader check still belong to a person (webflow-launch › Pre-launch QA).
import { loadConfig, args, browser, page, bust, repoRequire, paths } from './lib.mjs';

const cfg = loadConfig();
const { pos, flags, live } = args();
const axePath = repoRequire(cfg).resolve('axe-core/axe.min.js');
const sizes = flags.has('--all-widths') ? [cfg.widths[0], cfg.widths.at(-1)] : [cfg.widths[0]];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const b = await browser(cfg);
let serious = 0;

for (const route of paths(cfg, pos)) {
  for (const size of sizes) {
    const p = await page(b, cfg, cfg.stagingUrl + route, size, { live });
    await p.goto(bust(cfg.stagingUrl + route), { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    await p.addScriptTag({ path: axePath });
    const result = await p.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), TAGS);
    const v = result.violations;
    console.log(`\n== ${route}  ${size[0]}×${size[1]}  ${v.length ? `${v.length} rules fail` : 'no violations'}  (${result.passes.length} pass, ${result.incomplete.length} to check by hand)`);
    for (const r of v) {
      if (['serious', 'critical'].includes(r.impact)) serious++;
      console.log(`  ${(r.impact ?? '').padEnd(8)} ${r.id}: ${r.help} (${r.nodes.length})`);
      for (const n of r.nodes.slice(0, 3)) console.log(`           ${n.target.join(' ')}`);
    }
    await p.close();
  }
}
await b.close();
if (serious) { console.log(`\n${serious} serious or critical rule failures`); process.exit(1); }
