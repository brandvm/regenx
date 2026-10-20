// Screenshot every prototype page, and check it for sideways overflow and
// errors across the whole range of widths.
//   pnpm screens [/path …] [--shots-all]
// Pages: the ones given, else every index.html in the prototype. The dev
// server is used if it runs, started for the run if not.
// - At the check widths (the repo config's `widths`, else 1440, 820, 390):
//   a full-page screenshot in .screens/<page>-<width>.png.
// - At those and a sweep from 2560 down to 360 (the common laptop widths
//   and both sides of every Webflow breakpoint): every element whose right
//   edge passes the viewport, unless an ancestor that fits clips or scrolls
//   it (a carousel track, a marquee); and every page error, console error
//   and failed request. --shots-all screenshots the sweep widths too.
// An element that is meant to stick out (an off-canvas menu that is
// visible but moved aside) takes `data-overflow-ok`.
// Fails when any page overflows or logs an error at any width.
import path from 'node:path';
import { args, pages, widths, devServer, chromium, outDir } from './lib.mjs';

const { flags, pos } = args();
const SWEEP = [2560, 1920, 1680, 1440, 1366, 1280, 1279, 1024, 992, 991, 820, 768, 767, 480, 479, 390, 375, 360];
const checks = widths();
const sizes = [...checks.map(([w, h]) => ({ w, h, shot: true })), ...SWEEP.filter((w) => !checks.some(([cw]) => cw === w)).map((w) => ({ w, h: 900, shot: flags.has('--shots-all') }))]
  .sort((a, b) => b.w - a.w);
const list = pos.length ? pos : pages();
const dir = outDir();

const server = await devServer();
const browser = await (await chromium()).launch();
let bad = 0;
try {
  for (const p of list) {
    const found = [];
    for (const { w, h, shot } of sizes) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
      page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(server.url + p, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // Scroll through once so lazy images and scroll-triggered content load.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 20)); }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(300);
      const info = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const clips = (el) => /hidden|clip|auto|scroll/.test(getComputedStyle(el).overflowX);
        const name = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
        const over = [];
        const seen = new Map();
        for (const el of document.body.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (!r.width || r.right <= vw + 1 || el.closest('[data-overflow-ok], svg *')) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.position === 'fixed' && r.left >= vw) continue;
          // Contained: an ancestor (not html or body) that fits clips or scrolls it.
          let contained = false;
          for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
            if (clips(a) && a.getBoundingClientRect().right <= vw + 1) { contained = true; break; }
          }
          if (contained) continue;
          // Report the outermost element only: its children stick out with it.
          let outer = null;
          for (let a = el.parentElement; a && !outer; a = a.parentElement) outer = seen.get(a);
          if (outer) { outer.inner++; continue; }
          const o = { el, px: Math.round(r.right - vw), inner: 0 };
          seen.set(el, o);
          over.push(o);
        }
        const page = document.documentElement.scrollWidth > vw;
        return { scrolls: page, over: over.sort((a, b) => b.px - a.px).slice(0, 8).map((o) => `${name(o.el).slice(0, 90)} +${o.px}px${o.inner ? ` (and ${o.inner} inside)` : ''}`) };
      });
      const file = `${p.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home'}-${w}.png`;
      if (shot) await page.screenshot({ path: path.join(dir, file), fullPage: true });
      if (info.over.length || errors.length) found.push({ w, ...info, errors: [...new Set(errors)] });
      await page.close();
    }
    if (!found.length) { console.log(`${p}: no overflow, no errors at ${sizes.length} widths (${sizes[0].w}–${sizes[sizes.length - 1].w})`); continue; }
    bad++;
    console.log(`${p}:`);
    // One block per distinct finding, with the widths it shows at (the
    // overflow in px is the largest of them).
    const groups = new Map();
    for (const f of found) {
      const what = [...f.over.map((o) => `overflow: ${o.replace(/ \+\d+px/, '')}`), ...f.errors.map((e) => `error: ${e}`)];
      const key = (f.over.length ? (f.scrolls ? 'scrolls sideways' : 'content cut off (body clips it)') : '') + '\n' + what.join('\n');
      const g = groups.get(key) ?? groups.set(key, { widths: [], px: {} }).get(key);
      g.widths.push(f.w);
      for (const o of f.over) { const [n, px] = [o.replace(/ \+\d+px/, ''), +o.match(/\+(\d+)px/)[1]]; g.px[n] = Math.max(g.px[n] ?? 0, px); }
    }
    for (const [key, g] of groups) {
      const [head, ...lines] = key.split('\n');
      console.log(`  at ${g.widths.join(', ')}${head ? `: ${head}` : ''}`);
      for (const l of lines.filter(Boolean)) {
        const n = l.replace(/^overflow: /, '');
        console.log(`    ${l}${g.px[n] ? ` (up to +${g.px[n]}px)` : ''}`);
      }
    }
  }
} finally {
  await browser.close();
  server.stop();
}
console.log(`Screenshots at ${checks.map(([w]) => w).join(', ')} in ${path.relative(process.cwd(), dir) || '.'}/`);
process.exit(bad ? 1 : 0);
