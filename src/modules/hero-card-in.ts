import { gsap, EASE, MQ } from './animation';

// Service hero widget scale-in (TRT, Peptide Therapy, Enclomiphene heroes).
// The widget wrapper grows from 60% and fades in once, on page load; the
// image inside it (`Case Card | Widget Image` / `Service Hero Widget`) does
// not animate itself (user 2026-11-06). With reduced motion it simply shows.
//
//   [data-hero-widget-in]   the `Service Hero | Widget W` wrapper
//                           (desktop and tablet copies)
//
// Start state: styles/hero-card-in.css keeps the wrapper hidden until the
// bundle boots, so it never shows full size and then jumps.

export function initHeroCardIn() {
  const widgets = gsap.utils.toArray<HTMLElement>('[data-hero-widget-in]');
  if (!widgets.length) return;
  gsap.matchMedia().add(MQ.motion, () => {
    gsap.fromTo(widgets,
      { opacity: 0, scale: 0.6 },
      {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: EASE,
        delay: 0.3,
        clearProps: 'opacity,transform',
      });
  });
}
