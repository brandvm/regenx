import { gsap, EASE_IX2 } from './animation';

// Open and close motion for Webflow Dropdowns (replaces the Webflow IX2
// interactions "FAQ Acc | Open/Close" and "G Nav | Drop Open/Close").
// Webflow's dropdown script still does the clicks, keys, aria and the
// `w--open` class; this watches that class and animates the panel.
//
// Accordion ([data-acc], the C | Accordion dropdown):
//   the list grows to its height, the "+" ([data-acc-icon="add"]) blurs out
//   and the "−" ([data-acc-icon="subtract"]) blurs in; closing reverses.
// Nav dropdown ([data-nav-drop], in G | Nav):
//   the panel ([data-nav-drop-panel]) grows and scales 0.9 → 1, the arrow
//   ([data-nav-drop-arrow]) turns 180° and the links
//   ([data-nav-drop-content]) fade in; closing reverses.
//
// Runs before accordions.ts, which opens the first item of each group.
// The IX2 version also froze each list's width in px when it opened; the
// lists keep their Designer width here, so a resize can't leave them wrong.

type Kind = 'acc' | 'nav';
type Parts = { list: HTMLElement; toggle: HTMLElement; [k: string]: Element | null };

function parts(drop: HTMLElement, kind: Kind): Parts | null {
  const toggle = drop.querySelector<HTMLElement>(':scope > .w-dropdown-toggle');
  const list = drop.querySelector<HTMLElement>(':scope > .w-dropdown-list');
  if (!toggle || !list) return null;
  return kind === 'acc'
    ? { toggle, list, add: drop.querySelector('[data-acc-icon="add"]'), sub: drop.querySelector('[data-acc-icon="subtract"]') }
    : {
        toggle,
        list,
        panel: drop.querySelector('[data-nav-drop-panel]'),
        content: drop.querySelector('[data-nav-drop-content]'),
        arrow: drop.querySelector('[data-nav-drop-arrow]'),
      };
}

// The resting (closed) and open states, as the IX2 action lists set them.
function closedState(p: Parts, kind: Kind) {
  gsap.set(p.list, { display: 'none' });
  if (kind === 'acc') {
    gsap.set(p.list, { height: 0 });
    if (p.add) gsap.set(p.add, { opacity: 1, filter: 'blur(0px)' });
    if (p.sub) gsap.set(p.sub, { opacity: 0, filter: 'blur(2px)' });
  } else {
    if (p.panel) gsap.set(p.panel, { height: 0, scale: 0.9 });
    if (p.content) gsap.set(p.content, { opacity: 0 });
    if (p.arrow) gsap.set(p.arrow, { rotation: 0 });
  }
}

function openTimeline(p: Parts, kind: Kind) {
  const tl = gsap.timeline({ defaults: { ease: EASE_IX2, duration: 0.74 } });
  tl.set(p.list, { display: 'block' }, 0);
  if (kind === 'acc') {
    tl.to(p.list, { height: 'auto', clearProps: 'height' }, 0);
    if (p.add) tl.to(p.add, { opacity: 0, filter: 'blur(2px)', duration: 0.64 }, 0);
    if (p.sub) tl.to(p.sub, { opacity: 1, filter: 'blur(0px)', duration: 0.32 }, 0.32);
  } else {
    if (p.panel) tl.to(p.panel, { height: 'auto', scale: 1, clearProps: 'height' }, 0);
    if (p.arrow) tl.to(p.arrow, { rotation: 180 }, 0);
    if (p.content) tl.to(p.content, { opacity: 1 }, 0.24);
  }
  return tl;
}

function closeTimeline(p: Parts, kind: Kind) {
  const tl = gsap.timeline({ defaults: { ease: EASE_IX2, duration: 0.74 } });
  if (kind === 'acc') {
    tl.to(p.list, { height: 0, duration: 0.8 }, 0);
    if (p.sub) tl.to(p.sub, { opacity: 0, filter: 'blur(2px)' }, 0);
    if (p.add) tl.to(p.add, { opacity: 1, filter: 'blur(0px)' }, 0);
  } else {
    if (p.panel) tl.to(p.panel, { height: 0, scale: 0.9 }, 0);
    if (p.arrow) tl.to(p.arrow, { rotation: 0 }, 0);
    if (p.content) tl.to(p.content, { opacity: 0 }, 0);
  }
  tl.set(p.list, { display: 'none' });
  return tl;
}

export function initDropdownMotion() {
  const drops: [HTMLElement, Kind][] = [
    ...Array.from(document.querySelectorAll<HTMLElement>('[data-acc]')).map((el) => [el, 'acc'] as [HTMLElement, Kind]),
    ...Array.from(document.querySelectorAll<HTMLElement>('[data-nav-drop]')).map((el) => [el, 'nav'] as [HTMLElement, Kind]),
  ];
  if (!drops.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  drops.forEach(([drop, kind]) => {
    const p = parts(drop, kind);
    if (!p) return;
    let open = false;
    let tl: gsap.core.Timeline | null = null;
    const sync = () => {
      const now = p.toggle.classList.contains('w--open');
      if (now === open) return;
      open = now;
      tl?.kill();
      tl = (open ? openTimeline : closeTimeline)(p, kind);
      if (reduce.matches) tl.progress(1);
    };
    closedState(p, kind);
    new MutationObserver(sync).observe(p.toggle, { attributes: true, attributeFilter: ['class'] });
    sync();
  });
}
