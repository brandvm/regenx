// Migration parity: does this repo's dist/ render a live site exactly as
// its old custom code does?
//   node parity.mjs [/path…] [--live] [--width 390] [--control]
// For moving a site that is already live onto the template. Each page is
// rendered twice at every config width (staging; --live: `liveUrl`):
// once as published, once with the old custom-code assets routed to this
// repo's dist/ (`parity.oldAssets` in the config: URL regex → "index.js",
// "styles.css", or "" to serve nothing, for a library the bundle now
// carries). Animations, transitions, videos and sliders are frozen, then
// every element's computed style (with ::before/::after) and box are
// compared, in document order.
// Reported (exit 1 on any): element count, tag or class changes, boxes
// and style values that differ, and errors the new render throws that the
// published one doesn't. Zero differences = a 1:1 drop-in. Noted: an
// oldAssets regex no request matched (the old asset isn't loaded on that
// page, or the regex is wrong).
// --control renders the published page twice: what differs then is noise
// (a clock, a random order, a lazy embed); add those properties to
// `parity.ignore` (a regex) or fix the page before trusting a result.
// Screenshots and report.json go to .webflow-build/parity/.
import fs from 'fs';
import path from 'path';
import { loadConfig, args, paths, browser, page, outDir } from './lib.mjs';

const cfg = loadConfig();
const { pos, flags, values, live } = args();
const control = flags.has('--control');
const base = live ? cfg.liveUrl?.replace(/\/$/, '') : cfg.stagingUrl;
if (!base) { console.error('--live needs "liveUrl" (the custom domain) in webflow-build.config.json.'); process.exit(1); }
const old = Object.entries(cfg.parity?.oldAssets ?? {}).map(([re, file]) => ({ re: new RegExp(re), file, hits: 0 }));
if (!old.length && !control) { console.error('No "parity.oldAssets" in webflow-build.config.json: map each old custom-code asset URL (a regex) to "index.js", "styles.css" or "" (see webflow-build.config.example.json).'); process.exit(1); }
const bad = old.find((o) => !['index.js', 'styles.css', ''].includes(o.file));
if (bad) { console.error(`parity.oldAssets: "${bad.file}" is not "index.js", "styles.css" or "".`); process.exit(1); }
const widths = values.width ? [cfg.widths.find(([w]) => w === Number(values.width)) ?? [Number(values.width), 900]] : cfg.widths;
const settle = cfg.parity?.settle ?? 3000;
const NOISE = new RegExp(`^(::(before|after) )?(will-change${cfg.parity?.ignore ? '|' + cfg.parity.ignore : ''})$`);
const dist = { 'index.js': fs.readFileSync(path.join(cfg.repoDir, 'dist/index.js')), 'styles.css': fs.readFileSync(path.join(cfg.repoDir, 'dist/styles.css')) };
const dir = outDir('parity');

// Freeze everything time-dependent so the two renders are comparable.
const freeze = () => {
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
  document.head.appendChild(s);
  for (const v of document.querySelectorAll('video')) { try { v.pause(); v.currentTime = 0; } catch { /* not loaded */ } }
  for (const el of document.querySelectorAll('.swiper')) { const sw = el.swiper; if (sw) { sw.autoplay?.stop(); sw.slideToLoop ? sw.slideToLoop(0, 0) : sw.slideTo(0, 0); } }
  (window.__lenis ?? window.lenis)?.scrollTo?.(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
};

const snapshot = () => {
  const skip = 'script,style,noscript,iframe,template,svg defs,#wfc-environment';
  return [...document.querySelectorAll('body *')].filter((e) => !e.closest(skip)).map((e) => {
    const st = {};
    const cs = getComputedStyle(e);
    for (const p of cs) st[p] = cs.getPropertyValue(p);
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(e, pseudo);
      if (ps.content && ps.content !== 'none') for (const p of ps) st[`${pseudo} ${p}`] = ps.getPropertyValue(p);
    }
    const r = e.getBoundingClientRect();
    const cls = typeof e.className === 'string' ? e.className : e.className?.baseVal ?? '';
    return { tag: e.tagName.toLowerCase(), cls: cls.trim(), box: [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 10) / 10), st };
  });
};

async function render(url, size, swap) {
  const p = await page(b, cfg, url, size, { live: true });
  if (swap) {
    for (const o of old) {
      await p.route(o.re, (r) => {
        o.hits++;
        const type = /\.css(\?|$)/.test(o.file || r.request().url()) ? 'text/css' : 'application/javascript';
        r.fulfill({ body: o.file ? dist[o.file] : '', contentType: type });
      });
    }
  }
  await p.goto(url, { waitUntil: 'load', timeout: 90000 });
  await p.waitForTimeout(settle);
  await p.evaluate(freeze);
  await p.waitForTimeout(500);
  const snap = await p.evaluate(snapshot);
  const shot = await p.screenshot();
  const errors = [...new Set(p.errors)];
  await p.close();
  return { snap, shot, errors };
}

// Custom properties keep their source text, so a minifier's `.5` for `0.5`
// is not a rendering change; nor is `0%` for a zero length.
const same = (k, a, c) => {
  const n = (v) => { if (!v) return v; if (/(^|::(before|after) )--/.test(k)) v = v.replace(/(^|[\s,(])0\.(\d)/g, '$1.$2'); return v === '0%' ? '0px' : v; };
  return n(a) === n(c);
};

const b = await browser(cfg);
const report = [];
let problems = 0;
console.log(`parity: ${base}, ${control ? 'published twice (--control)' : 'published vs old assets → dist/'}, at ${widths.map(([w]) => w).join(', ')}`);
for (const route of paths(cfg, pos)) {
  for (const size of widths) {
    const url = base + route;
    const a = await render(url, size, false);
    const c = await render(url, size, !control);
    const diffs = [];
    if (a.snap.length !== c.snap.length) diffs.push(`element count ${a.snap.length} → ${c.snap.length}`);
    for (let i = 0; i < Math.min(a.snap.length, c.snap.length) && diffs.length < 200; i++) {
      const x = a.snap[i], y = c.snap[i];
      const id = `${x.tag}${x.cls ? '.' + x.cls.split(/\s+/).join('.') : ''}`;
      if (x.tag !== y.tag || x.cls !== y.cls) { diffs.push(`#${i} ${id} → ${y.tag}${y.cls ? '.' + y.cls.split(/\s+/).join('.') : ''} (the element lists diverge here; later rows are shifted)`); break; }
      if (x.box.join() !== y.box.join()) diffs.push(`#${i} ${id} box ${x.box} → ${y.box}`);
      // A pseudo-element on one side only is one difference, not one per
      // property (an icon font's glyph is a ::before).
      const gone = ['::before', '::after'].filter((ps) => (`${ps} content` in x.st) !== (`${ps} content` in y.st));
      for (const ps of gone) diffs.push(`#${i} ${id} ${ps} ${`${ps} content` in x.st ? `removed (content ${x.st[`${ps} content`]})` : `added (content ${y.st[`${ps} content`]})`}`);
      for (const k of new Set([...Object.keys(x.st), ...Object.keys(y.st)])) {
        if (gone.some((ps) => k.startsWith(ps + ' '))) continue;
        if (!NOISE.test(k) && !same(k, x.st[k], y.st[k])) diffs.push(`#${i} ${id} ${k}: ${x.st[k] ?? '(none)'} → ${y.st[k] ?? '(none)'}`);
      }
    }
    const errors = c.errors.filter((e) => !a.errors.includes(e));
    for (const e of errors) diffs.push(`new error: ${e.slice(0, 160)}`);
    const tag = `${route.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'home'}-${size[0]}`;
    fs.writeFileSync(path.join(dir, `${tag}-published.png`), a.shot);
    fs.writeFileSync(path.join(dir, `${tag}-${control ? 'control' : 'dist'}.png`), c.shot);
    problems += diffs.length;
    report.push({ route, width: size[0], elements: a.snap.length, diffs });
    console.log(`\n${route} @${size[0]}: ${diffs.length ? `${diffs.length}${diffs.length >= 200 ? '+' : ''} difference${diffs.length === 1 ? '' : 's'} (${a.snap.length} elements)` : `no differences (${a.snap.length} elements)`}`);
    // Ten lines, at most three per element, so one changed element doesn't
    // hide the rest.
    const per = {};
    const shown = diffs.filter((d) => { const el = d.match(/^#\d+/)?.[0] ?? d; return (per[el] = (per[el] ?? 0) + 1) <= 3; }).slice(0, 10);
    for (const d of shown) console.log(`  ${d}`);
    if (diffs.length > shown.length) console.log(`  … ${diffs.length - shown.length} more in report.json`);
  }
}
await b.close();
for (const o of old) if (!o.hits && !control) console.log(`\n(note) parity.oldAssets ${o.re} matched no request: the page doesn't load it, or the regex is wrong.`);
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`\nparity: ${problems} difference${problems === 1 ? '' : 's'}. Screenshots and report.json in ${path.relative(process.cwd(), dir)}`);
if (problems) process.exit(1);
