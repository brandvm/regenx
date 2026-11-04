// Folder tabs for Webflow tabs marked [data-fluid-tabs] (TRT benefits first).
// Webflow owns the links, the panel colour and the spacing; this adds one
// shape behind the open link that joins the panel with concave corners and
// slides to the next link. Each edge of the shape is a spring: the edge in
// the direction of travel is stiffer, so it leads and the tab stretches a
// little, then the trailing edge catches up and both settle. Springs keep the
// velocity continuous (no ease-in stall or mid-move burst) and retarget
// smoothly when another tab is clicked mid-move. The shape also fills the
// panel's top corner under a first or last tab (see the CSS), so corner and
// tab always move together. Styles live in styles/fluid-tabs.css and apply
// from 768px up only.

const ROOT = '[data-fluid-tabs]';

// Stiffness (1/s²) and damping ratio. Leading edge: quick with a hint of
// overshoot; trailing edge: softer, fully damped.
const LEAD = { k: 230, zeta: 0.82 };
const TRAIL = { k: 150, zeta: 1 };

type Edge = { pos: number; vel: number; target: number };

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function bind(root: HTMLElement) {
  const menu = root.querySelector<HTMLElement>('.w-tab-menu');
  const content = root.querySelector<HTMLElement>('.w-tab-content');
  if (!menu || !content) return;

  const shape = document.createElement('span');
  shape.className = 'fluid-tab';
  shape.setAttribute('aria-hidden', 'true');
  menu.prepend(shape);

  // Edges measured from the menu's left: `left` of the shape and its `right`
  // edge (not CSS right), so both move the same way.
  const left: Edge = { pos: 0, vel: 0, target: 0 };
  const right: Edge = { pos: 0, vel: 0, target: 0 };
  let width = 0;
  let frame = 0;
  let last = 0;
  let movingRight = true;

  const render = () => {
    root.style.setProperty('--fluid-l', `${left.pos}px`);
    root.style.setProperty('--fluid-r', `${width - right.pos}px`);
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
    step(left, movingRight ? TRAIL : LEAD, dt);
    step(right, movingRight ? LEAD : TRAIL, dt);
    if (settled(left) && settled(right)) {
      left.pos = left.target; right.pos = right.target;
      left.vel = right.vel = 0;
      frame = 0;
    } else {
      frame = requestAnimationFrame(tick);
    }
    render();
  };

  const place = (animate: boolean) => {
    const current = menu.querySelector<HTMLElement>('.w-tab-link.w--current');
    if (!current) return;
    const box = menu.getBoundingClientRect();
    const tab = current.getBoundingClientRect();
    if (!box.width || !tab.width) return;

    // The shape takes the panel's colour, so a Designer change follows.
    root.style.setProperty('--fluid-bg', getComputedStyle(content).backgroundColor);
    width = box.width;
    const newLeft = tab.left - box.left;
    movingRight = newLeft >= left.target;
    left.target = newLeft;
    right.target = tab.right - box.left;

    if (!animate || reduceMotion()) {
      cancelAnimationFrame(frame);
      frame = 0;
      left.pos = left.target; right.pos = right.target;
      left.vel = right.vel = 0;
      render();
      return;
    }
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  place(false);
  root.classList.add('is-fluid-ready');

  // Webflow's tabs script moves .w--current; follow it however the tab opened
  // (click, keyboard, or a deep link).
  new MutationObserver((records) => {
    if (records.some((r) => r.target instanceof HTMLElement && r.target.classList.contains('w-tab-link'))) {
      place(true);
    }
  }).observe(menu, { subtree: true, attributes: true, attributeFilter: ['class'] });

  new ResizeObserver(() => place(false)).observe(menu);
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
