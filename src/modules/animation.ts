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
}
