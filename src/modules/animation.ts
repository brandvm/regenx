import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger';
import type { SplitText as SplitTextPlugin } from 'gsap/SplitText';

export let gsap: typeof Gsap;
export let ScrollTrigger: typeof ScrollTriggerPlugin;
export let SplitText: typeof SplitTextPlugin;

export async function initAnimation() {
  // Importing ScrollTrigger executes its auto-registration. Only evaluate the
  // packaged fallback when Webflow has no instance, or it replaces IX3's plugin.
  // esbuild includes these imports in index.js; no extra requests are needed.
  gsap = window.gsap || (await import('gsap')).gsap;
  window.gsap = gsap;
  ScrollTrigger = window.ScrollTrigger || (await import('gsap/ScrollTrigger')).ScrollTrigger;
  SplitText = window.SplitText || (await import('gsap/SplitText')).SplitText;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  window.ScrollTrigger = ScrollTrigger;
  window.SplitText = SplitText;
  // ScrollTrigger re-measures only on load and resize; lazy images and
  // Finsweet lists change the page height later (GOTCHAS 2026-11-05).
  refreshOnLayoutShift();
}

// Eases and breakpoints of the former Webflow interactions
// (prototype/plan/interactions.md).

// cubic-bezier(x1, y1, x2, y2) as an ease function: solve x(t) = p, return y(t).
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const err = x(t) - p;
      if (Math.abs(err) < 1e-6) return y(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0, hi = 1;
    t = p;
    while (hi - lo > 1e-6) {
      if (x(t) < p) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return y(t);
  };
}

// IX3 customEase "M0,160 C100,152 0,0 160,0" (the site's curve).
export const EASE = cubicBezier(0.625, 0.05, 0, 1);
// IX2's [.64, .05, 0, 1] (dropdowns and the menu).
export const EASE_IX2 = cubicBezier(0.64, 0.05, 0, 1);

// Webflow's breakpoints, for gsap.matchMedia().
export const MQ = {
  motion: '(prefers-reduced-motion: no-preference)',
  tabletDown: '(max-width: 991px)',
  tabletUp: '(min-width: 768px)',
  phoneUp: '(min-width: 480px)',
};

let watching = false;
export function refreshOnLayoutShift() {
  if (watching) return;
  watching = true;
  let height = document.body.offsetHeight;
  let timer = 0;
  new ResizeObserver(() => {
    if (document.body.offsetHeight === height) return;
    height = document.body.offsetHeight;
    clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  }).observe(document.body);
}

