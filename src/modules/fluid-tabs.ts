// Folder tabs for Webflow tabs marked [data-fluid-tabs] (TRT and
// Enclomiphene benefits). Webflow owns the links, the panel's colour, corner
// radius and padding; this draws the open tab and the panel's top band as ONE
// outline, like a Figma union with a corner radius: rounded tab top, concave
// joins where the tab meets the panel, rounded panel corners. When the tab
// nears the panel's left or right edge, the panel corner and the join on that
// side share what space is left and shrink together, so the outline flows
// into a straight edge exactly as the tab reaches the end.
//
// The SVG covers only the tab plus the panel's top band (tab height + panel
// radius), redrawn every frame while the tab moves; the panel below keeps
// Webflow's fill as its own box with that band clipped off, so a frame
// repaints a strip, not the whole panel. Each edge of the tab is a spring:
// the edge in the direction of travel sets off first and the trailing edge
// follows a beat later, so the tab stretches a little (the "gooey" feel) and
// both settle together. Webflow's pane fade is off (data-duration-in/out 0):
// the new pane's content slides in from the side of travel while a copy of
// the old one slides out (transform/opacity only). The open tab's caret grows
// in once the tabs come into view (data-caret-in, benefit-slider.css).
// Styles live in styles/fluid-tabs.css and apply from 768px up only.

const ROOT = '[data-fluid-tabs]';
const SVG_NS = 'http://www.w3.org/2000/svg';

// Stiffness (1/s²) and damping ratio. Leading edge: a hint of overshoot;
// trailing edge: just under critical so it lands without creeping.
const LEAD = { k: 300, zeta: 0.82 };
const TRAIL = { k: 300, zeta: 0.95 };
const TRAIL_DELAY = 70;

const TAB_RADIUS = 1; // em
const JOIN_RADIUS = 1.5; // em

const EASE = 'cubic-bezier(.32, .72, 0, 1)';
const SWAP = 480; // ms, pane content slide
const SHIFT = 40; // px

type Edge = { pos: number; vel: number; target: number; goal: number };

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const r2 = (n: number) => Math.round(n * 100) / 100;

// The tab [a, b] × [0, tabH] and the panel's top band [0, w] × [tabH, H],
// H = tabH + rp, as one closed outline. The band's bottom edge is straight:
// the panel box continues it. Corners shrink together near the panel edges.
function band(a: number, b: number, w: number, tabH: number, rt: number, rj: number, rp: number) {
  const H = tabH + rp;
  const side = (gap: number) => {
    const s = Math.max(0, Math.min(1, gap / (rp + rj)));
    return { rp: rp * s, rj: Math.min(rj * s, tabH - rt) };
  };
  const L = side(a);
  const R = side(w - b);
  const t = Math.min(rt, (b - a) / 2);
  return [
    `M0,${r2(H)}`,
    `L0,${r2(tabH + L.rp)}`,
    `A${r2(L.rp)},${r2(L.rp)} 0 0 1 ${r2(L.rp)},${r2(tabH)}`,
    `L${r2(a - L.rj)},${r2(tabH)}`,
    `A${r2(L.rj)},${r2(L.rj)} 0 0 0 ${r2(a)},${r2(tabH - L.rj)}`,
    `L${r2(a)},${r2(t)}`,
    `A${r2(t)},${r2(t)} 0 0 1 ${r2(a + t)},0`,
    `L${r2(b - t)},0`,
    `A${r2(t)},${r2(t)} 0 0 1 ${r2(b)},${r2(t)}`,
    `L${r2(b)},${r2(tabH - R.rj)}`,
    `A${r2(R.rj)},${r2(R.rj)} 0 0 0 ${r2(b + R.rj)},${r2(tabH)}`,
    `L${r2(w - R.rp)},${r2(tabH)}`,
    `A${r2(R.rp)},${r2(R.rp)} 0 0 1 ${r2(w)},${r2(tabH + R.rp)}`,
    `L${r2(w)},${r2(H)}`,
    'Z',
  ].join('');
}

function bind(root: HTMLElement) {
  const menu = root.querySelector<HTMLElement>('.w-tab-menu');
  const content = root.querySelector<HTMLElement>('.w-tab-content');
  if (!menu || !content) return;
  const links = [...menu.querySelectorAll<HTMLElement>('.w-tab-link')];
  const wide = window.matchMedia('(min-width: 768px)');

  // Webflow's own pane fade is replaced by the slide below.
  root.setAttribute('data-duration-in', '0');
  root.setAttribute('data-duration-out', '0');

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'fluid-shape');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  svg.appendChild(path);
  root.prepend(svg);

  const left: Edge = { pos: 0, vel: 0, target: 0, goal: 0 };
  const right: Edge = { pos: 0, vel: 0, target: 0, goal: 0 };
  const box = { w: 0, tabH: 0, rt: 0, rj: 0, rp: 0 };
  let frame = 0;
  let last = 0;
  let trailAt = 0;
  let movingRight = true;
  let fill = '';

  const render = () => {
    path.setAttribute('d', band(left.pos, right.pos, box.w, box.tabH, box.rt, box.rj, box.rp));
  };

  const step = (edge: Edge, spring: { k: number; zeta: number }, dt: number) => {
    const c = 2 * spring.zeta * Math.sqrt(spring.k);
    const a = spring.k * (edge.target - edge.pos) - c * edge.vel;
    edge.vel += a * dt;
    edge.pos += edge.vel * dt;
  };
  const settled = (edge: Edge) => Math.abs(edge.target - edge.pos) < 0.25 && Math.abs(edge.vel) < 4;

  const tick = (now: number) => {
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;
    const trail = movingRight ? left : right;
    if (now >= trailAt) trail.target = trail.goal;
    step(left, movingRight ? TRAIL : LEAD, dt);
    step(right, movingRight ? LEAD : TRAIL, dt);
    if (trail.target === trail.goal && settled(left) && settled(right)) {
      left.pos = left.target;
      right.pos = right.target;
      left.vel = right.vel = 0;
      frame = 0;
    } else {
      frame = requestAnimationFrame(tick);
    }
    render();
  };

  // The panel keeps Webflow's fill as its own box, minus its top band (the
  // SVG draws that band, with the tab). fluid-tabs.css makes the panel
  // transparent once .is-fluid-ready is on, so read the fill without it.
  const paintPanel = () => {
    root.classList.remove('is-fluid-ready');
    content.style.removeProperty('background-color');
    const bg = getComputedStyle(content).backgroundColor;
    root.classList.add('is-fluid-ready');
    if (bg && bg !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bg)) fill = bg;
    if (!fill) return;
    path.setAttribute('fill', fill);
    if (wide.matches) {
      content.style.backgroundColor = fill;
      // 1px under the strip, so the two blacks overlap and show no seam.
      content.style.clipPath = `inset(${Math.max(0, box.rp - 1)}px 0 0 0 round 0 0 ${box.rp}px ${box.rp}px)`;
    } else {
      content.style.removeProperty('background-color');
      content.style.removeProperty('clip-path');
    }
  };

  const measure = () => {
    const rootBox = root.getBoundingClientRect();
    const menuBox = menu.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    const em = parseFloat(getComputedStyle(root).fontSize) || 16;
    box.w = menuBox.width;
    box.tabH = contentBox.top - menuBox.top;
    box.rt = TAB_RADIUS * em;
    box.rj = JOIN_RADIUS * em;
    root.classList.remove('is-fluid-ready');
    const radius = parseFloat(getComputedStyle(content).borderTopRightRadius) || 0;
    root.classList.add('is-fluid-ready');
    box.rp = Math.min(radius, contentBox.height / 2);
    const h = box.tabH + box.rp;
    svg.style.top = `${menuBox.top - rootBox.top}px`;
    svg.style.left = `${menuBox.left - rootBox.left}px`;
    svg.setAttribute('width', `${box.w}`);
    svg.setAttribute('height', `${h}`);
    svg.setAttribute('viewBox', `0 0 ${box.w} ${h}`);
    paintPanel();
  };

  const place = (animate: boolean) => {
    const current = menu.querySelector<HTMLElement>('.w-tab-link.w--current');
    if (!current) return;
    const menuBox = menu.getBoundingClientRect();
    const tab = current.getBoundingClientRect();
    if (!menuBox.width || !tab.width) return;
    const newLeft = tab.left - menuBox.left;
    movingRight = newLeft >= left.goal;
    left.goal = newLeft;
    right.goal = tab.right - menuBox.left;
    if (!animate || reduceMotion()) {
      cancelAnimationFrame(frame);
      frame = 0;
      left.pos = left.target = left.goal;
      right.pos = right.target = right.goal;
      left.vel = right.vel = 0;
      render();
      return;
    }
    (movingRight ? right : left).target = (movingRight ? right : left).goal;
    trailAt = performance.now() + TRAIL_DELAY;
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  // Pane content slides in from the side of travel; a frozen copy of the
  // old content slides out over the panel.
  let ghost: HTMLElement | null = null;
  const swapPanes = (from: HTMLElement | undefined, to: HTMLElement, dir: number) => {
    ghost?.remove();
    ghost = null;
    if (reduceMotion()) return;
    const inner = to.firstElementChild as HTMLElement | null;
    inner?.animate(
      [{ opacity: 0, transform: `translateX(${dir * SHIFT}px)` }, { opacity: 1, transform: 'none' }],
      { duration: SWAP, easing: EASE, delay: 60, fill: 'backwards' });
    const old = from?.firstElementChild as HTMLElement | null;
    if (!old) return;
    const copy = old.cloneNode(true) as HTMLElement;
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('inert', '');
    Object.assign(copy.style, {
      position: 'absolute', left: '0', right: '0', top: `${to.offsetTop}px`, pointerEvents: 'none',
    });
    content.append(copy);
    ghost = copy;
    copy.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * SHIFT}px)` }],
      { duration: SWAP * 0.5, easing: EASE, fill: 'forwards' },
    ).finished.then(() => { copy.remove(); if (ghost === copy) ghost = null; }, () => {});
  };

  // The open tab's caret grows in the first time the tabs come into view
  // (repo CSS shows carets only once data-caret-in is on).
  new IntersectionObserver((entries, io) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    root.dataset.caretIn = '';
  }, { threshold: 0.3 }).observe(menu);

  content.style.position = 'relative';
  root.classList.add('is-fluid-ready');
  measure();
  place(false);

  // Follow Webflow's state however a tab opened (click, keys, deep link).
  const panes = [...content.querySelectorAll<HTMLElement>(':scope > .w-tab-pane')];
  let activePane = panes.find((p) => p.classList.contains('w--tab-active'));
  new MutationObserver((records) => {
    if (records.some((r) => r.target instanceof HTMLElement && r.target.classList.contains('w-tab-link'))) {
      place(true);
    }
    const next = panes.find((p) => p.classList.contains('w--tab-active'));
    if (next && next !== activePane) {
      const dir = panes.indexOf(next) > panes.indexOf(activePane!) ? 1 : -1;
      swapPanes(activePane, next, dir);
      activePane = next;
    }
  }).observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // Re-measure on a real size change only (a pane swap can report a resize
  // of the same size).
  let size = '';
  const ro = new ResizeObserver(() => {
    const m = menu.getBoundingClientRect();
    const c = content.getBoundingClientRect();
    const key = `${Math.round(m.width)}x${Math.round(m.height)}x${Math.round(c.top - m.top)}:${Math.round(c.height)}`;
    if (key === size) return;
    size = key;
    measure();
    place(false); // snap the tab to its link
  });
  ro.observe(content);
  ro.observe(menu); // the tab row's height changes when labels wrap
}

export const FluidTabs = {
  init() {
    document.querySelectorAll<HTMLElement>(ROOT).forEach((root) => {
      if (root.dataset.fluidBound) return;
      root.dataset.fluidBound = '1';
      bind(root);
    });
  },
};
