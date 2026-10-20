// Performance: the median of several Lighthouse runs, mobile and desktop.
//   node perf.mjs [/path…] [--runs 5] [--mobile | --desktop] [--prototype]
// One Lighthouse run is noise: on earlier sites the same page varied by
// ±500 ms between runs. So every number here is the median of --runs runs
// (default 5), with the lowest and highest next to it. A change smaller
// than that spread is not a result.
// It always measures what visitors get (the deployed bundle), on staging
// by default; --prototype measures the localhost prototype instead.
// Lighthouse is fetched by npx on first use (not a dependency of the
// repo) and runs in the Chromium that Playwright installed.
// Results are saved to .webflow-build/perf/ for the before/after report.
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { loadConfig, args, paths, repoRequire, outDir } from './lib.mjs';

const run = promisify(execFile);
const LIGHTHOUSE = 'lighthouse@12';
const cfg = loadConfig();
const { pos, flags, values } = args();
const runs = Math.max(1, Number(values.runs ?? 5));
const base = flags.has('--prototype') ? cfg.prototypeUrl : cfg.stagingUrl;
const modes = flags.has('--mobile') ? ['mobile'] : flags.has('--desktop') ? ['desktop'] : ['mobile', 'desktop'];
const chrome = repoRequire(cfg)('@playwright/test').chromium.executablePath();
if (!fs.existsSync(chrome)) { console.error('Chromium is not installed for Playwright: run `pnpm exec playwright install chromium`.'); process.exit(1); }

const METRICS = [
  ['score', 'Score', (l) => Math.round((l.categories.performance.score ?? 0) * 100), ''],
  ['lcp', 'LCP', (l) => Math.round(l.audits['largest-contentful-paint'].numericValue), 'ms'],
  ['fcp', 'FCP', (l) => Math.round(l.audits['first-contentful-paint'].numericValue), 'ms'],
  ['tbt', 'TBT', (l) => Math.round(l.audits['total-blocking-time'].numericValue), 'ms'],
  ['cls', 'CLS', (l) => Math.round(l.audits['cumulative-layout-shift'].numericValue * 1000) / 1000, ''],
  ['si', 'Speed Index', (l) => Math.round(l.audits['speed-index'].numericValue), 'ms'],
  ['bytes', 'Transfer', (l) => Math.round(l.audits['total-byte-weight'].numericValue / 1024), 'KB'],
];
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 1000) / 1000; };

async function once(url, mode) {
  const a = ['--yes', LIGHTHOUSE, url, '--output=json', '--output-path=stdout', '--quiet', '--only-categories=performance', '--chrome-flags=--headless=new --no-sandbox'];
  if (mode === 'desktop') a.push('--preset=desktop');
  const { stdout } = await run('npx', a, { env: { ...process.env, CHROME_PATH: chrome }, maxBuffer: 64 * 1024 * 1024 });
  const lhr = JSON.parse(stdout);
  if (lhr.runtimeError) throw new Error(lhr.runtimeError.message);
  return Object.fromEntries(METRICS.map(([k, , get]) => [k, get(lhr)]));
}

const report = { date: new Date().toISOString(), base, runs, lighthouse: LIGHTHOUSE, pages: {} };
console.log(`perf: ${runs} run${runs === 1 ? '' : 's'} each, ${modes.join(' and ')}, on ${base}`);
for (const route of paths(cfg, pos)) {
  report.pages[route] = {};
  for (const mode of modes) {
    const samples = [];
    for (let i = 0; i < runs; i++) {
      try { samples.push(await once(base + route, mode)); } catch (e) { console.log(`  ${route} ${mode} run ${i + 1} failed: ${String(e.message).split('\n')[0].slice(0, 160)}`); }
    }
    if (!samples.length) { console.log(`\n${route}  ${mode}: no run finished`); continue; }
    const row = {};
    for (const [k] of METRICS) { const v = samples.map((s) => s[k]); row[k] = { median: median(v), min: Math.min(...v), max: Math.max(...v) }; }
    report.pages[route][mode] = { runs: samples.length, ...row };
    console.log(`\n${route}  ${mode}  (${samples.length} of ${runs} runs)`);
    for (const [k, label, , unit] of METRICS) console.log(`  ${label.padEnd(12)} ${String(row[k].median).padStart(7)}${unit}   range ${row[k].min}–${row[k].max}${unit}`);
  }
}
const file = path.join(outDir('perf'), `perf-${report.date.slice(0, 19).replace(/[:T]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
console.log(`\nsaved ${path.relative(process.cwd(), file)}. Compare a later run with this file; a difference inside the range is noise.`);
