// Folder tabs for Webflow tabs marked [data-fluid-tabs] (TRT benefits first).
// Webflow owns the links, the panel colour and the spacing; this adds one
// shape behind the open link that joins the panel with concave corners and
// slides to the next link. Its leading edge moves first and the trailing edge
// follows, so the tab stretches and settles instead of jumping. The shape
// also fills the panel's top corner under a first or last tab (see the CSS),
// so corner and tab always move together. Styles live in
// styles/fluid-tabs.css and apply from 768px up only.

const ROOT = '[data-fluid-tabs]';

function bind(root: HTMLElement) {
  const menu = root.querySelector<HTMLElement>('.w-tab-menu');
  const content = root.querySelector<HTMLElement>('.w-tab-content');
  if (!menu || !content) return;

  const shape = document.createElement('span');
  shape.className = 'fluid-tab';
  shape.setAttribute('aria-hidden', 'true');
  menu.prepend(shape);

  let lastLeft: number | null = null;

  const place = (animate: boolean) => {
    const current = menu.querySelector<HTMLElement>('.w-tab-link.w--current');
    if (!current) return;
    const box = menu.getBoundingClientRect();
    const tab = current.getBoundingClientRect();
    if (!box.width || !tab.width) return;
    const left = tab.left - box.left;
    const right = box.right - tab.right;

    // The shape takes the panel's colour, so a Designer change follows.
    root.style.setProperty('--fluid-bg', getComputedStyle(content).backgroundColor);
    if (animate && lastLeft !== null && Math.abs(left - lastLeft) > 1) {
      root.dataset.fluidDir = left > lastLeft ? 'right' : 'left';
    }
    root.classList.toggle('is-fluid-instant', !animate);
    root.style.setProperty('--fluid-l', `${left}px`);
    root.style.setProperty('--fluid-r', `${right}px`);
    lastLeft = left;
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
