import { gsap } from './animation';

// Process scroll (replaces the Webflow interaction "Scroll | Process
// Scroll", component S | How To Process): through the section's scroll
// height the card track slides left by its own width and the progress bar
// fills, scrubbed to the scroll position.
//
//   [data-process-scroll]         the scroll range (the section)
//   [data-process-scroll-track]   Process Scroll Track
//   [data-process-scroll-fill]    Process Scroll Progress Fill
//
// The fill grows with scaleX from the left instead of animating width (the
// Webflow version re-laid out the page on every scroll frame). Its gradient
// is relative to its own box, so scaling the box draws the same pixels.
// It runs with reduced motion too: the movement follows the visitor's own
// scrolling, and without it the later cards could never be seen.

export function initProcessScroll() {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-process-scroll]'));
  if (!roots.length) return;
  roots.forEach((root) => {
    const track = root.querySelector('[data-process-scroll-track]');
    const fill = root.querySelector('[data-process-scroll-fill]');
    const tl = gsap.timeline({
      defaults: { duration: 1, ease: 'none' },
      scrollTrigger: { trigger: root, start: 'clamp(top top)', end: 'clamp(bottom bottom)', scrub: 0.8 },
    });
    if (track) {
      gsap.set(track, { xPercent: 0 });
      tl.to(track, { xPercent: -100 }, 0);
    }
    if (fill) {
      gsap.set(fill, { scaleX: 0, transformOrigin: '0% 50%' });
      tl.to(fill, { scaleX: 1 }, 0);
    }
  });
}
