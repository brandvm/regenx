import { gsap, EASE, MQ } from './animation';

// Hero chart card scale-in (TRT hero; replaces the Lottie "scale-on-view"
// that played the card in before it became a still image, user 2026-11-06).
// The card grows from 60% and fades in once, when it first comes into view.
// With reduced motion it simply shows.
//
//   [data-hero-card-in]   the card image (desktop and tablet copies)
//
// Start state: styles/hero-card-in.css keeps the card hidden until the
// bundle boots, so it never shows full size and then jumps.

export function initHeroCardIn() {
  const cards = gsap.utils.toArray<HTMLElement>('[data-hero-card-in]');
  if (!cards.length) return;
  gsap.matchMedia().add(MQ.motion, () => {
    cards.forEach((card) => {
      gsap.fromTo(card,
        { opacity: 0, scale: 0.6 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: EASE,
          delay: 0.2,
          clearProps: 'opacity,transform',
          scrollTrigger: { trigger: card, start: 'top 90%', once: true },
        });
    });
  });
}
