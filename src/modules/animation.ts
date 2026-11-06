import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger';
import type { SplitText as SplitTextPlugin } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';

export let gsap: typeof Gsap;
export let ScrollTrigger: typeof ScrollTriggerPlugin;
export let SplitText: typeof SplitTextPlugin;

// The site's one custom curve, as the Webflow interactions used it
// ("M0,160 C100,152 0,0 160,0", close to cubic-bezier(.625, .05, 0, 1)).
// The IX2 dropdown and menu animations used cubic-bezier(.64, .05, 0, 1).
export const EASE = 'rgx';
export const EASE_IX2 = 'rgx-ix2';
// Webflow's breakpoints, for gsap.matchMedia().
export const MQ = {
  motion: '(prefers-reduced-motion: no-preference)',
  tabletDown: '(max-width: 991px)',
  tabletUp: '(min-width: 768px)',
  phoneUp: '(min-width: 480px)',
};

export async function initAnimation() {
  // Importing ScrollTrigger executes its auto-registration. Only evaluate the
  // packaged fallback when Webflow has no instance, or it replaces IX3's plugin.
  // esbuild includes these imports in index.js; no extra requests are needed.
  gsap = window.gsap || (await import('gsap')).gsap;
  window.gsap = gsap;
  ScrollTrigger = window.ScrollTrigger || (await import('gsap/ScrollTrigger')).ScrollTrigger;
  SplitText = window.SplitText || (await import('gsap/SplitText')).SplitText;
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  window.ScrollTrigger = ScrollTrigger;
  window.SplitText = SplitText;
  CustomEase.create(EASE, 'M0,160 C100,152 0,0 160,0');
  CustomEase.create(EASE_IX2, '.64,.05,0,1');
  refreshOnLayoutShift();
}

// ScrollTrigger only re-measures on window load and resize. Lazy images and
// Finsweet lists change the page height after that, which left the media
// pins starting ~110px early at 820px (Webflow's IX3 re-measured itself).
// Refresh once the body height has settled after a change.
function refreshOnLayoutShift() {
  let height = document.body.offsetHeight;
  let timer = 0;
  new ResizeObserver(() => {
    if (document.body.offsetHeight === height) return;
    height = document.body.offsetHeight;
    clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  }).observe(document.body);
}
