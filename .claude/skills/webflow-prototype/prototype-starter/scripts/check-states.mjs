// Check the focus and pressed states of every control, on every page.
//   pnpm check:states [/path …] [--width 1440] [--shots]
// Pages: the ones given, else every index.html in the prototype. The dev
// server is used if it runs, started for the run if not. No selectors: it
// finds the controls itself (links, buttons, form fields, summary, anything
// with a tabindex), and checks each distinct class list once per page.
// - Keyboard: Tab through the page. Every control that takes focus must
//   look different from its resting state (outline, shadow, colour,
//   border, underline, opacity, position, or its ::before/::after).
// - Mouse: click each link and button. No focus ring may appear
//   (:focus-visible, or an outline or shadow the hover state didn't have);
//   form fields are left out, the browser rightly shows focus there.
// - Pressed: every button (button, input buttons, role=button, and links
//   whose class names say button or btn) has an :active rule on it or on
//   an element inside it, or changes while the mouse is held down.
// Transitions are switched off and `inert` is removed first (style guide
// specimens are inert), clicks don't navigate and forms don't submit.
// --shots saves a crop of each finding to .screens/states/.
// Fails when any control misses a state.
import path from 'node:path';
import { args, pages, devServer, chromium, outDir } from './lib.mjs';

const { flags, values, pos } = args(['--width']);
const width = +(values.width ?? 1440);
const list = pos.length ? pos : pages();
const shotDir = flags.has('--shots') ? outDir('states') : null;

// Runs in the page: set it up for checking, and helpers on window.__st.
const prepare = () => {
  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}';
  document.head.append(style);
  document.querySelectorAll('[inert]').forEach((e) => e.removeAttribute('inert'));
  document.addEventListener('click', (e) => e.preventDefault(), true);
  document.addEventListener('submit', (e) => e.preventDefault(), true);
  const FOCUSABLE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable=""], [contenteditable="true"]';
  // What can make a state visible. An outline or a border only counts when
  // it is drawn (the browser moves outline-offset on focus even when none is).
  const PROPS = ['box-shadow', 'background-color', 'background-image', 'color', 'text-decoration-line', 'text-decoration-color', 'opacity', 'transform', 'top', 'left', 'clip', 'clip-path', 'filter', 'scale', 'translate'];
  const sig = (el, pseudo) => {
    const cs = getComputedStyle(el, pseudo);
    const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.outlineOffset] : [];
    const borders = ['top', 'right', 'bottom', 'left'].map((b) => (parseFloat(cs.getPropertyValue(`border-${b}-width`)) > 0 && cs.getPropertyValue(`border-${b}-style`) !== 'none' ? cs.getPropertyValue(`border-${b}-width`) + cs.getPropertyValue(`border-${b}-color`) : ''));
    return [...PROPS.map((p) => cs.getPropertyValue(p)), ...outline, ...borders].join('|') + (pseudo ? cs.content : '');
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[aria-hidden="true"]'); };
  // tag.classes, or for an element without classes its first data-* hook.
  const label = (el) => {
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    const hook = cls ? '' : [...el.attributes].find((a) => a.name.startsWith('data-'))?.name;
    return el.tagName.toLowerCase() + cls + (hook ? `[${hook}]` : '') + (el.type && el.tagName === 'INPUT' ? `[type=${el.type}]` : '');
  };
  const isButton = (el) => el.matches('button, input[type=submit], input[type=button], input[type=reset], [role=button]') || (el.matches('a[href]') && /button|btn/i.test(typeof el.className === 'string' ? el.className : ''));
  const isClickable = (el) => isButton(el) || el.matches('a[href], summary');
  // Everything a control's look can come from: itself, its pseudo-elements, its parent (:focus-within).
  const look = (el) => [sig(el), sig(el, '::before'), sig(el, '::after'), el.parentElement ? sig(el.parentElement) : ''].join('#');
  const ring = (el) => { const cs = getComputedStyle(el); return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? 'outline ' : '') + (cs.boxShadow !== 'none' ? 'shadow' : ''); };
  // An :active rule that matches the element (in any stylesheet, any media).
  const hasActive = (el) => {
    const walk = (rules) => [...rules].some((r) => (r.cssRules && !r.selectorText ? walk(r.cssRules) : r.selectorText?.includes(':active') && r.selectorText.split(/,(?![^(]*\))/).some((s) => {
      if (!s.includes(':active')) return false;
      try { return el.matches(s.replace(/:active/g, '').replace(/::?(before|after|placeholder|marker)/g, '').trim() || '*'); } catch { return false; }
    })));
    return [...document.styleSheets].some((sh) => { try { return walk(sh.cssRules); } catch { return false; } });
  };
  // The press lands on the innermost element, so a pressed state may sit on
  // a child (Button › Button Color:active): the control and everything in it.
  const hasActiveIn = (el) => [el, ...el.querySelectorAll('*')].some(hasActive);
  const lookIn = (el) => [look(el), ...[...el.querySelectorAll('*')].map((c) => sig(c))].join('#');
  const controls = () => [...document.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && visible(el));
  window.__st = { look, lookIn, ring, label, isButton, isClickable, hasActiveIn, controls };
};

const server = await devServer();
const browser = await (await chromium()).launch();
const findings = [];
// One line per control and problem, with every page it is on (the nav repeats).
const add = (page, control, problem) => {
  const f = findings.find((x) => x.control === control && x.problem === problem);
  if (f) f.pages.push(page); else findings.push({ pages: [page], control, problem });
};
const shot = async (page, handle, name) => {
  if (!shotDir) return;
  const bb = await handle.boundingBox();
  if (bb) await page.screenshot({ path: path.join(shotDir, `${name.replace(/\W+/g, '_').slice(0, 80)}.png`), clip: { x: Math.max(0, bb.x - 16), y: Math.max(0, bb.y - 16), width: Math.min(bb.width + 32, width), height: Math.min(bb.height + 32, 900) } });
};

try {
  for (const p of list) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const load = async () => {
      await page.goto(server.url + p, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(prepare);
      await page.mouse.move(width - 1, 899);
    };

    // Keyboard: every control's resting look, then Tab through the page.
    await load();
    const rest = await page.evaluate(() => { const m = new Map(); window.__rest = m; window.__st.controls().forEach((el, i) => { el.__i = i; m.set(i, window.__st.look(el)); }); return m.size; });
    const kbSeen = new Set();
    let tabs = 0, checked = 0;
    for (; tabs < 600; tabs++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || el.__i === undefined) return el === document.body ? { end: true } : { skip: true };
        if (el.__seen) return { end: true };
        el.__seen = true;
        return { label: window.__st.label(el), changed: window.__st.look(el) !== window.__rest.get(el.__i), fv: el.matches(':focus-visible') };
      });
      if (r.end) break;
      if (r.skip) continue;
      checked++;
      if (kbSeen.has(r.label)) continue;
      kbSeen.add(r.label);
      if (!r.changed) { add(p, r.label, 'keyboard focus is invisible (looks the same as at rest)'); await shot(page, await page.evaluateHandle(() => document.activeElement), `${p}-kb-${r.label}`); }
    }

    // Mouse and pressed: each distinct link and button on a fresh page.
    const targets = await page.evaluate(() => {
      const seen = new Set();
      return window.__st.controls().map((el, i) => ({ i, label: window.__st.label(el), clickable: window.__st.isClickable(el), button: window.__st.isButton(el) }))
        .filter((t) => t.clickable && !seen.has(t.label) && seen.add(t.label));
    });
    for (const t of targets) {
      await load();
      const handle = await page.evaluateHandle((i) => window.__st.controls()[i], t.i);
      const el = handle.asElement();
      if (!el) continue;
      await el.scrollIntoViewIfNeeded();
      const bb = await el.boundingBox();
      if (!bb) continue;
      const [x, y] = [bb.x + bb.width / 2, bb.y + bb.height / 2];
      const hit = await page.evaluate(([el, x, y]) => { const at = document.elementFromPoint(x, y); return !!at && (el === at || el.contains(at)); }, [el, x, y]);
      if (!hit) continue; // covered by something else at this width
      await page.mouse.move(x, y);
      const hover = await el.evaluate((e) => ({ look: window.__st.lookIn(e), ring: window.__st.ring(e) }));
      await page.mouse.down();
      const down = await el.evaluate((e) => window.__st.lookIn(e));
      await page.mouse.up();
      const after = await el.evaluate((e) => ({ ring: window.__st.ring(e), fv: e.matches(':focus-visible'), focused: document.activeElement === e, active: window.__st.hasActiveIn(e) }));
      if (after.focused && (after.fv || (after.ring && after.ring !== hover.ring))) {
        add(p, t.label, `focus ring on a mouse click (${after.fv ? ':focus-visible matches' : after.ring.trim()})`);
        await shot(page, el, `${p}-mouse-${t.label}`);
      }
      if (t.button && !after.active && down === hover.look) add(p, t.label, 'no pressed state (no :active rule, nothing changes while held down)');
    }
    console.log(`${p}: tabbed through ${checked} controls (${kbSeen.size} distinct), clicked ${targets.length} distinct links and buttons`);
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
}

if (findings.length) {
  console.log(`\nState check failed (${findings.length}):`);
  for (const f of findings) console.log(`  ${f.control}: ${f.problem}  (${f.pages.join(', ')})`);
  if (shotDir) console.log(`Crops in ${path.relative(process.cwd(), shotDir)}/`);
  process.exit(1);
}
console.log(`States OK at ${width}: keyboard focus visible, no ring on mouse clicks, every button has a pressed state.`);
