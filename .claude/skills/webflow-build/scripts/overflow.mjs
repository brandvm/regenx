// Horizontal overflow at many widths: what runs off the right edge.
//   node overflow.mjs [/path…] [--live] [--width 1280[,1024…]] [--max 20] [--why]
// Staging by default, with this repo's dist/; --live checks `liveUrl`, the
// custom domain (staging with its deployed bundle when there is none).
// Three check widths never land between the breakpoints, and that is where
// layouts break: the fluid scale holds at its minimum from 1440 down to
// 992, so anything sized in fixed em stops fitting there (GOTCHAS: the
// form, logo strip and footer columns ran off screen between 992 and 1440
// and a person found it, not a check). So each page is loaded at a sweep of
// widths (`overflow.widths` in the config, else 2560 … 360 below), scrolled
// to the bottom and back so reveals have run, and two things are reported:
//   - the document scrolls sideways (by how much);
//   - every element whose visible right edge passes the viewport, named by
//     its class chain, with the widths where it does and the worst overshoot.
// Only the first element of each chain to cross the edge is listed (its
// children that overflow with it are counted, not listed).
// Not reported, because they are clipped or hidden on purpose:
//   - anything inside an ancestor that clips it (overflow hidden, clip,
//     auto or scroll; `contain: paint`): slider masks, marquee tracks,
//     scroll rows. Only the part that shows counts. html and body don't
//     count as a clip: content cut off by `overflow-x: hidden` on them is
//     exactly the bug;
//   - off-canvas panels: entirely past the right edge and fixed, or moved
//     there by a transform (a closed mobile menu, a drawer);
//   - hidden elements (display none, visibility hidden, opacity 0, an
//     ancestor with aria-hidden="true" or inert), Webflow's own nav overlay
//     and closed dropdowns;
//   - selectors in `overflow.ignore` (and their descendants).
// --why also lists what was skipped and why, for when something you can
// see running off screen is not reported. Exits 1 on any finding.
// Tolerance 1px (`overflow.tolerance`) for rounding.
import { loadConfig, args, paths, browser, page, bust, scrollTo } from './lib.mjs';

const WIDTHS = [2560, 1920, 1440, 1366, 1280, 1024, 992, 820, 768, 600, 480, 390, 360];
const cfg = loadConfig();
const { pos, values, flags, live } = args();
const why = flags.has('--why');
const base = live ? (cfg.liveUrl?.replace(/\/$/, '') || cfg.stagingUrl) : cfg.stagingUrl;
const opt = cfg.overflow ?? {};
const widths = (values.width ? values.width.split(',') : opt.widths ?? WIDTHS).map((w) => (Array.isArray(w) ? w : [+w, +w >= 1024 ? 900 : +w >= 768 ? 1024 : 844]));
const ignore = opt.ignore ?? [];
const tolerance = opt.tolerance ?? 1;
const max = Number(values.max ?? 20);
const b = await browser(cfg);
let problems = 0;

// In the page: the document's sideways scroll and every element that
// shows past the right edge, with its class chain.
const measure = ({ ignore, tolerance }) => {
  const vw = document.documentElement.clientWidth;
  window.scrollTo(1e6, window.scrollY);
  const docScroll = Math.max(window.scrollX, document.scrollingElement.scrollWidth - vw);
  window.scrollTo(0, window.scrollY);
  const name = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id && !/^w-/.test(el.id) ? `#${el.id}` : '';
    const cls = [...el.classList].filter((c) => !/^(w-variant-|w--)/.test(c)).slice(0, 3).map((c) => `.${c}`).join('');
    return tag + id + cls;
  };
  const chain = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) parts.unshift(name(e));
    return parts.join(' > ');
  };
  const hiddenUp = (el) => el.closest('[aria-hidden="true"], [inert], .w-nav-overlay, .w-dropdown-list:not(.w--open), svg, template, noscript');
  const ignored = (el) => ignore.some((s) => { try { return el.closest(s); } catch { return false; } });
  const offCanvas = (el, r) => {
    if (r.left < vw - tolerance) return false;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.position === 'fixed' || (s.transform !== 'none' && s.transform !== '') || s.translate !== 'none') return true;
    }
    return false;
  };
  // The part of el that can show: its box cut by every clipping ancestor.
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    let { left, right, top, bottom } = r;
    for (let e = el.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      const clipX = s.overflowX !== 'visible' || /paint|strict|content/.test(s.contain);
      const clipY = s.overflowY !== 'visible' || /paint|strict|content/.test(s.contain);
      if (!clipX && !clipY) continue;
      const a = e.getBoundingClientRect();
      if (clipX) { left = Math.max(left, a.left); right = Math.min(right, a.right); }
      if (clipY) { top = Math.max(top, a.top); bottom = Math.min(bottom, a.bottom); }
    }
    return { r, left, right, top, bottom };
  };
  const over = new Map();
  const skipped = {};
  const skip = (el, reason) => { (skipped[reason] ??= new Set()).add(chain(el)); };
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right <= vw + tolerance || (!r.width && !r.height)) continue;
    if (hiddenUp(el)) { skip(el, 'hidden (aria-hidden, inert, closed nav or dropdown, svg)'); continue; }
    if (ignored(el)) { skip(el, 'overflow.ignore'); continue; }
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) { skip(el, 'not visible'); continue; }
    const v = visible(el);
    if (v.right <= vw + tolerance || v.right - v.left < 1 || v.bottom - v.top < 1) { skip(el, 'clipped by an ancestor'); continue; }
    if (offCanvas(el, r)) { skip(el, 'off-canvas (fixed or transformed, wholly past the edge)'); continue; }
    over.set(el, Math.round(v.right - vw));
  }
  // Keep the first element of each chain; count the rest under it.
  const out = [];
  for (const [el, px] of over) {
    let root = null;
    for (let e = el.parentElement; e; e = e.parentElement) if (over.has(e)) root = e;
    if (root) continue;
    let inside = 0;
    for (const other of over.keys()) if (other !== el && el.contains(other)) inside++;
    const s = getComputedStyle(el);
    const moved = s.transform !== 'none' || s.translate !== 'none';
    out.push({ chain: chain(el), px, inside, moved, width: Math.round(el.getBoundingClientRect().width) });
  }
  // Only the outermost skipped element of each kind, to keep --why short.
  for (const k in skipped) skipped[k] = [...skipped[k]].filter((c, _, all) => !all.some((o) => o !== c && c.startsWith(o + ' > ')));
  return { vw, docScroll, out, skipped };
};

for (const route of paths(cfg, pos)) {
  const url = base + route;
  const found = new Map(); // chain -> { widths: [w], px, inside, moved }
  const scrolls = [];
  const skippedAll = {};
  const failed = [];
  let p;
  for (const [w, h] of widths) {
    if (!p) p = await page(b, cfg, url, [w, h], { live });
    else await p.setViewportSize({ width: w, height: h });
    // One retry: a script navigating during load aborts the first goto now and then.
    const go = () => p.goto(bust(url), { waitUntil: 'load' }).catch((e) => ({ status: () => 0, e }));
    let res = await go();
    if (res.status() !== 200) res = await go();
    if (res.status() !== 200) { failed.push(`${w}: ${res.e ? res.e.message.split('\n')[0] : `HTTP ${res.status()}`}`); continue; }
    await p.waitForTimeout(1500);
    // Scroll down and back, so reveals and lazy sections are in their end state.
    const height = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height && y < h * 30; y += h) { await scrollTo(p, y); await p.waitForTimeout(120); }
    await scrollTo(p, 0);
    await p.waitForTimeout(1200);
    const m = await p.evaluate(measure, { ignore, tolerance });
    if (m.docScroll > tolerance) scrolls.push(`${w} (${m.docScroll}px)`);
    for (const o of m.out) {
      const f = found.get(o.chain) ?? { widths: [], px: 0, inside: 0, moved: false };
      f.widths.push(w);
      f.px = Math.max(f.px, o.px);
      f.inside = Math.max(f.inside, o.inside);
      f.moved ||= o.moved;
      found.set(o.chain, f);
    }
    for (const [k, list] of Object.entries(m.skipped)) for (const c of list) ((skippedAll[k] ??= new Map()).get(c) ?? skippedAll[k].set(c, []).get(c)).push(w);
  }
  await p?.close();
  const lines = [];
  const rows = [...found].sort((a, c) => c[1].px - a[1].px);
  if (failed.length) { lines.push(`  did not load at ${failed.join('; ')}`); problems++; }
  if (scrolls.length) {
    lines.push(`  the page scrolls sideways at ${scrolls.join(', ')}${rows.length || why ? '' : '  (no visible element passes the edge: --why lists the hidden or skipped ones)'}`);
    problems++;
  }
  for (const [chain, f] of rows.slice(0, max)) {
    lines.push(`  +${f.px}px  ${chain}${f.inside ? `  (+${f.inside} inside)` : ''}\n          at ${f.widths.join(', ')}${f.moved ? '  · moved by a transform: an animation start state? check after it plays' : ''}`);
  }
  if (rows.length > max) lines.push(`  … and ${rows.length - max} more (--max)`);
  problems += rows.length;
  if (why) for (const [k, list] of Object.entries(skippedAll)) {
    lines.push(`  (skipped: ${k})`);
    for (const [c, ws] of [...list].slice(0, max)) lines.push(`      ${c}  at ${ws.join(', ')}`);
  }
  console.log(`\n${route}  (${widths.map(([w]) => w).join(' ')})\n${lines.length ? lines.join('\n') : '  nothing passes the right edge'}`);
}
await b.close();
console.log(`\noverflow: ${problems} finding${problems === 1 ? '' : 's'}`);
if (problems) process.exit(1);
