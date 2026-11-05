// Footer "Back to Top" button (#toTop in G | Footer). Webflow publishes it
// as a plain <button> with no behaviour; scroll through Lenis when it runs
// so the smooth-scroll position stays in sync.
import { getLenis } from './smooth-scroll';

export function initBackToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll<HTMLElement>('#toTop, [data-back-to-top]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      // Webflow's delegated section-link scroll also listens on clicks.
      event.stopPropagation();
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(0, { immediate: reduce });
      else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  });
}
