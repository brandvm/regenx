import { gsap, EASE_IX2 } from './animation';

// Open and close motion for the C | Accordion Webflow Dropdowns (replaces
// the Webflow IX2 interaction "FAQ Acc | Open/Close"). Webflow's dropdown
// script still does the clicks, keys, aria and the `w--open` class; this
// watches that class and animates the panel. (The G | Nav menus are a
// custom element now, animated by nav-drop.ts.)
//
// Accordion ([data-acc]): the list grows to its height, the "+"
// ([data-acc-icon="add"]) blurs out and the "−" ([data-acc-icon="subtract"])
// blurs in; closing reverses.
//
// Runs before main.js's accordions.ts opens the first item of each group,
// so that opening animates, as with IX2.
// The IX2 version also froze each list's width in px when it opened; the
// lists keep their Designer width here, so a resize can't leave them wrong.

type Parts = { list: HTMLElement; toggle: HTMLElement; add: Element | null; sub: Element | null };

function parts(drop: HTMLElement): Parts | null {
  const toggle = drop.querySelector<HTMLElement>(':scope > .w-dropdown-toggle');
  const list = drop.querySelector<HTMLElement>(':scope > .w-dropdown-list');
  if (!toggle || !list) return null;
  return { toggle, list, add: drop.querySelector('[data-acc-icon="add"]'), sub: drop.querySelector('[data-acc-icon="subtract"]') };
}

// The resting (closed) state, as the IX2 action list set it.
function closedState(p: Parts) {
  const set = (el: Element | null, styles: Partial<CSSStyleDeclaration>) => el && Object.assign((el as HTMLElement).style, styles);
  set(p.list, { display: 'none', height: '0px' });
  set(p.add, { opacity: '1', filter: 'blur(0px)' });
  set(p.sub, { opacity: '0', filter: 'blur(2px)' });
}

function openTimeline(p: Parts) {
  const tl = gsap.timeline({ defaults: { ease: EASE_IX2, duration: 0.74 } });
  tl.set(p.list, { display: 'block' }, 0);
  tl.to(p.list, { height: 'auto', clearProps: 'height' }, 0);
  if (p.add) tl.to(p.add, { opacity: 0, filter: 'blur(2px)', duration: 0.64 }, 0);
  if (p.sub) tl.to(p.sub, { opacity: 1, filter: 'blur(0px)', duration: 0.32 }, 0.32);
  return tl;
}

function closeTimeline(p: Parts) {
  const tl = gsap.timeline({ defaults: { ease: EASE_IX2, duration: 0.74 } });
  tl.to(p.list, { height: 0, duration: 0.8 }, 0);
  if (p.sub) tl.to(p.sub, { opacity: 0, filter: 'blur(2px)' }, 0);
  if (p.add) tl.to(p.add, { opacity: 1, filter: 'blur(0px)' }, 0);
  tl.set(p.list, { display: 'none' });
  return tl;
}

export function initDropdownMotion() {
  const drops = Array.from(document.querySelectorAll<HTMLElement>('[data-acc]'));
  if (!drops.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  drops.forEach((drop) => {
    const p = parts(drop);
    if (!p) return;
    let open = false;
    let tl: gsap.core.Timeline | null = null;
    const sync = () => {
      const now = p.toggle.classList.contains('w--open');
      if (now === open) return;
      open = now;
      tl?.kill();
      tl = (open ? openTimeline : closeTimeline)(p);
      if (reduce.matches) tl.progress(1);
    };
    closedState(p);
    new MutationObserver(sync).observe(p.toggle, { attributes: true, attributeFilter: ['class'] });
    sync();
  });
}
