// Lenis smooth scrolling, driven by the shared GSAP ticker so ScrollTrigger
// scrubs and pins stay in step with it.
// Recipe: webflow-build recipes/smooth-scroll.
//
// - Skipped under reduced motion: the page scrolls natively and `lenis`
//   stays null. Every caller must handle null.
// - The instance is returned and exported. Pass it to the modules that
//   need it (anchor-scroll, modal, transition). Never read `window.lenis`:
//   Lenis sets that global to a version marker, not to the instance.
// - allowNestedScroll: a gesture over something that can scroll that way
//   itself (a sideways slider track, an overflow pane) scrolls that
//   element; a vertical gesture over the same track still scrolls the page.
//   Covers scrollers added later, without data-lenis-prevent on each.
import Lenis from 'lenis';
import { gsap, ScrollTrigger, reducedMotion } from './gsap';

export let lenis: Lenis | null = null;

type JQuery = (target: Document) => { off: (events: string) => void };

/** Unbind webflow.js's own same-page anchor scroll (`click.wf-scroll`).
 *  It scrolls again a moment after any smooth glide, to the element
 *  itself. Webflow.ready() binds it again, so call this after every
 *  Webflow re-init (the barba recipe does). recipes/anchor-scroll does the
 *  same on first load and owns the click handling. */
export function releaseWebflowAnchors() {
  (window as unknown as { jQuery?: JQuery }).jQuery?.(document).off('click.wf-scroll');
}

export function initSmoothScroll(): Lenis | null {
  if (lenis) return lenis; // once per visit, also with page transitions
  if (reducedMotion()) return null;
  // Never in the Designer canvas or the Editor.
  if (document.documentElement.classList.contains('wf-design-mode') || document.querySelector('.w-editor')) return null;

  lenis = new Lenis({
    // Exponential damping, not a duration: 0.1 settles a 400px wheel tick
    // in about 1.1 s, 0.2 in about 0.55 s. Raise it for less smoothing.
    lerp: 0.1,
    allowNestedScroll: true,
  });
  const instance = lenis;
  instance.on('scroll', ScrollTrigger.update);
  // Pin spacers change the page height after Lenis has measured it: keep
  // its scroll limit in step with every ScrollTrigger refresh.
  ScrollTrigger.addEventListener('refresh', () => instance.resize());
  gsap.ticker.add((time) => instance.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // webflow.js may bind its anchor handler after the bundle runs.
  const wf = (window as unknown as { Webflow?: { push?: (fn: () => void) => void } }).Webflow;
  if (wf?.push) wf.push(releaseWebflowAnchors);
  else releaseWebflowAnchors();
  return instance;
}
