import { gsap, EASE_IX2, MQ } from './animation';

// Mobile and tablet menu (≤991px; replaces the Webflow IX2 interactions
// "G Nav | Menu Open/Close"). The menu button opens the link panel (fades
// in, scale 0.9 → 1) and shows the dimmed backdrop; a second click (or a
// click on the backdrop, which Finsweet mirror-clicks to the button) closes
// it again. The button's 3×3 dots icon turns into an X while open: its four
// edge dots ([data-menu-dot="edge"]) dim, keyed to aria-expanded in
// styles/menu-button.css (Figma 9958-16261, 2026-11-12; it used to turn 45°).
//
//   [data-nav-menu-button]   G Nav Menu Button (also gets aria-expanded)
//   [data-nav-menu]          the link panel (G Nav Block is-center)
//   [data-nav-overlay]       the backdrop (G Nav Overlay)
//
// From 992px up the panel is the desktop link row: nothing is set there.

export function initMenuMotion() {
  const button = document.querySelector<HTMLElement>('[data-nav-menu-button]');
  const menu = document.querySelector<HTMLElement>('[data-nav-menu]');
  if (!button || !menu) return;
  const overlay = document.querySelector('[data-nav-overlay]');
  gsap.matchMedia().add(MQ.tabletDown, () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let open = false;
    let tl: gsap.core.Timeline | null = null;
    gsap.set(menu, { display: 'none', scale: 0.9, opacity: 0 });
    if (overlay) gsap.set(overlay, { display: 'none', opacity: 0 });
    button.setAttribute('aria-expanded', 'false');

    const toggle = () => {
      open = !open;
      button.setAttribute('aria-expanded', String(open));
      tl?.kill();
      tl = gsap.timeline({ defaults: { ease: EASE_IX2, duration: 0.74 } });
      if (open) {
        tl.set(menu, { display: 'block' }, 0);
        if (overlay) tl.set(overlay, { display: 'block' }, 0);
        tl.to(menu, { scale: 1, opacity: 1 }, 0);
        if (overlay) tl.to(overlay, { opacity: 1, duration: 0.4 }, 0);
      } else {
        tl.to(menu, { scale: 0.9, opacity: 0 }, 0);
        if (overlay) tl.to(overlay, { opacity: 0, duration: 0.4 }, 0);
        if (overlay) tl.set(overlay, { display: 'none' });
        tl.set(menu, { display: 'none' });
      }
      if (reduce) tl.progress(1);
    };
    button.addEventListener('click', toggle);
    return () => {
      tl?.kill();
      button.removeEventListener('click', toggle);
      button.removeAttribute('aria-expanded');
    };
  });
}
