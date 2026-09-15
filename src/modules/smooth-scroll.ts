import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './animation';

// Lenis types declare window.lenis as debug metadata. RegenX historically
// exposes the actual instance there, so keep that compatibility in one bridge.
const runtime = window as unknown as { lenis?: Lenis };
export function resizeSmoothScroll() { runtime.lenis?.resize?.(); }

export function initSmoothScroll() {
  if (typeof runtime.lenis?.raf === 'function') return;
  const easing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));
  const lenis = new Lenis({
    duration: 1.2, easing,
    orientation: 'vertical', gestureOrientation: 'vertical',
    wheelMultiplier: 1, syncTouch: false, touchMultiplier: 2, infinite: false,
  });
  runtime.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);

  let horizontal: Lenis | null = null;
  const mq = window.matchMedia('(max-width: 991px)');
  const applyHorizontal = () => {
    if (!mq.matches) {
      horizontal?.destroy();
      horizontal = null;
    } else if (!horizontal) {
      const wrapper = document.querySelector<HTMLElement>('[data-h-scroll]');
      const content = wrapper?.querySelector<HTMLElement>('[data-h-scroll-track]')
        || wrapper?.firstElementChild;
      if (wrapper && content instanceof HTMLElement) {
        horizontal = new Lenis({
          wrapper, content,
          orientation: 'horizontal', gestureOrientation: 'horizontal',
          smoothWheel: true, syncTouch: false, overscroll: false,
          duration: 1.2, easing,
        });
      }
    }
  };
  applyHorizontal();
  mq.addEventListener('change', applyHorizontal);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
    horizontal?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}
