// Folder tabs for Webflow tabs marked [data-fluid-tabs] (TRT benefits first).
// Webflow owns the links, the panel's colour, corner radius and padding; this
// draws the open tab and the panel as ONE outline, like a Figma union with a
// corner radius: rounded tab top, concave joins where the tab meets the panel,
// rounded panel corners. When the tab nears the panel's left or right edge,
// the panel corner and the join on that side share what space is left and
// shrink together, so the outline flows into a straight edge exactly as the
// tab reaches the end (Figma clamps radii the same way).
//
// The outline is an SVG path redrawn every frame while the tab moves. Each
// edge of the tab is a spring: the edge in the direction of travel sets off
// first and the trailing edge follows a beat later on the same spring, so the
// tab stretches a little and both edges settle together. Springs keep the
// velocity continuous and retarget smoothly when another tab is clicked
// mid-move. Styles live in styles/fluid-tabs.css and apply from 768px up only.

const ROOT = '[data-fluid-tabs]';
const SVG_NS = 'http://www.w3.org/2000/svg';

// Stiffness (1/s²) and damping ratio. Leading edge: a hint of overshoot;
// trailing edge: just under critical so it lands without creeping.
const LEAD = { k: 300, zeta: 0.82 };
const TRAIL = { k: 300, zeta: 0.95 };
const TRAIL_DELAY = 70; // ms before the trailing edge sets off

// Radii in em of the root's font size (Figma 16 / 24 at 16px = 1em). The
// panel radius is read from the panel's own Webflow style.
const TAB_RADIUS = 1;
const JOIN_RADIUS = 1.5;

// `goal` is where the edge is heading; `target` is what its spring pulls to
// right now (the trailing edge only takes up its goal after TRAIL_DELAY).
type Edge = { pos: number; vel: number; target: number; goal: number };

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const r2 = (n: number) => Math.round(n * 100) / 100;

// One closed outline: tab [a, b] × [0, tabH] on top of the panel [0, w] ×
// [tabH, h]. Corners on each side of the tab scale down together when the
// tab gets closer to the panel edge than panel radius + join radius.
function outline(a: number, b: number, w: number, tabH: number, h: number, rt: number, rj: number, rp: number) {
  const side = (gap: number) => {
    const s = Math.max(0, Math.min(1, gap / (rp + rj)));
    return { rp: rp * s, rj: Math.min(rj * s, tabH - rt) };
  };
  const L = side(a);
  const R = side(w - b);
  const t = Math.min(rt, (b - a) / 2);
  const p = [
    `M${r2(a)},${r2(t)}`,
    `A${r2(t)},${r2(t)} 0 0 1 ${r2(a + t)},0`,
    `L${r2(b - t)},0`,
    `A${r2(t)},${r2(t)} 0 0 1 ${r2(b)},${r2(t)}`,
    `L${r2(b)},${r2(tabH - R.rj)}`,
    `A${r2(R.rj)},${r2(R.rj)} 0 0 0 ${r2(b + R.rj)},${r2(tabH)}`,
    `L${r2(w - R.rp)},${r2(tabH)}`,
    `A${r2(R.rp)},${r2(R.rp)} 0 0 1 ${r2(w)},${r2(tabH + R.rp)}`,
    `L${r2(w)},${r2(h - rp)}`,
    `A${r2(rp)},${r2(rp)} 0 0 1 ${r2(w - rp)},${r2(h)}`,
    `L${r2(rp)},${r2(h)}`,
    `A${r2(rp)},${r2(rp)} 0 0 1 0,${r2(h - rp)}`,
    `L0,${r2(tabH + L.rp)}`,
    `A${r2(L.rp)},${r2(L.rp)} 0 0 1 ${r2(L.rp)},${r2(tabH)}`,
    `L${r2(a - L.rj)},${r2(tabH)}`,
    `A${r2(L.rj)},${r2(L.rj)} 0 0 0 ${r2(a)},${r2(tabH - L.rj)}`,
    'Z',
  ];
  return p.join('');
}

function bind(root: HTMLElement) {
  const menu = root.querySelector<HTMLElement>('.w-tab-menu');
  const content = root.querySelector<HTMLElement>('.w-tab-content');
  if (!menu || !content) return;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'fluid-shape');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  svg.appendChild(path);
  root.prepend(svg);

  const left: Edge = { pos: 0, vel: 0, target: 0, goal: 0 };
  const right: Edge = { pos: 0, vel: 0, target: 0, goal: 0 };
  const box = { w: 0, tabH: 0, h: 0, top: 0, rt: 0, rj: 0, rp: 0 };
  let frame = 0;
  let last = 0;
  let trailAt = 0;
  let movingRight = true;

  const render = () => {
    path.setAttribute('d', outline(left.pos, right.pos, box.w, box.tabH, box.h, box.rt, box.rj, box.rp));
  };

  const step = (edge: Edge, spring: { k: number; zeta: number }, dt: number) => {
    const c = 2 * spring.zeta * Math.sqrt(spring.k);
    const a = spring.k * (edge.target - edge.pos) - c * edge.vel;
    edge.vel += a * dt;
    edge.pos += edge.vel * dt;
  };

  const settled = (edge: Edge) => Math.abs(edge.target - edge.pos) < 0.25 && Math.abs(edge.vel) < 4;

  const tick = (now: number) => {
    // Clamp the step so a background tab or a long frame can't overshoot.
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;
    const trail = movingRight ? left : right;
    if (now >= trailAt) trail.target = trail.goal;
    step(left, movingRight ? TRAIL : LEAD, dt);
    step(right, movingRight ? LEAD : TRAIL, dt);
    if (trail.target === trail.goal && settled(left) && settled(right)) {
      left.pos = left.target; right.pos = right.target;
      left.vel = right.vel = 0;
      frame = 0;
    } else {
      frame = requestAnimationFrame(tick);
    }
    render();
  };

  const measure = () => {
    const rootBox = root.getBoundingClientRect();
    const menuBox = menu.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    const em = parseFloat(getComputedStyle(root).fontSize) || 16;
    box.w = menuBox.width;
    box.top = menuBox.top - rootBox.top;
    box.tabH = contentBox.top - menuBox.top;
    box.h = contentBox.bottom - menuBox.top;
    box.rt = TAB_RADIUS * em;
    box.rj = JOIN_RADIUS * em;
    box.rp = Math.min(parseFloat(getComputedStyle(content).borderTopRightRadius) || 0, box.h / 2);
    svg.style.top = `${box.top}px`;
    svg.style.left = `${menuBox.left - rootBox.left}px`;
    svg.setAttribute('width', `${box.w}`);
    svg.setAttribute('height', `${box.h}`);
    svg.setAttribute('viewBox', `0 0 ${box.w} ${box.h}`);
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
      measure();
      left.pos = left.target = left.goal;
      right.pos = right.target = right.goal;
      left.vel = right.vel = 0;
      render();
      return;
    }
    // The leading edge heads off now; the trailing one after a beat.
    (movingRight ? right : left).target = (movingRight ? right : left).goal;
    trailAt = performance.now() + TRAIL_DELAY;
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  root.classList.add('is-fluid-ready');
  place(false);

  // Webflow's tabs script moves .w--current; follow it however the tab opened
  // (click, keyboard, or a deep link).
  new MutationObserver((records) => {
    if (records.some((r) => r.target instanceof HTMLElement && r.target.classList.contains('w-tab-link'))) {
      place(true);
    }
  }).observe(menu, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // The panel's height changes with the open tab's content and the viewport.
  const ro = new ResizeObserver(() => {
    measure();
    render();
  });
  ro.observe(menu);
  ro.observe(content);
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
