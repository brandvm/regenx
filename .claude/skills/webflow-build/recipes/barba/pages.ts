// Page modules with page transitions: they belong to one page's content,
// so they start again on every page Barba swaps in and are torn down when
// it leaves. Global modules (smooth scroll, nav, transition) run once in
// src/index.ts and never go through here.
// Recipe: webflow-build recipes/barba.
//
// What teardown covers, without any work in the modules:
// - GSAP: everything created while a module starts (tweens, timelines,
//   ScrollTriggers, gsap.matchMedia) is owned by one gsap.context and
//   reverted;
// - window and document listeners added while a module starts are
//   recorded and removed.
// Anything else (observers, timers, nodes appended outside the container,
// listeners added later from a callback) needs a cleanup: an init may
// return a function, and it is called on leave.
import { gsap, ScrollTrigger } from './gsap';

type Cleanup = () => void;
export type PageModule = [name: string, init: () => void | Cleanup];
export type PageHooks = { initPage: () => void; destroyPage: () => void };

type Recorded = [EventTarget, string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined];

export function definePages(modules: PageModule[], options: { onDestroy?: () => void } = {}): PageHooks {
  let context: gsap.Context | null = null;
  let cleanups: Cleanup[] = [];
  let listeners: Recorded[] = [];

  function initPage() {
    const targets: EventTarget[] = [window, document];
    const originals = targets.map((t) => t.addEventListener);
    targets.forEach((t, i) => {
      t.addEventListener = function (this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, opts?: boolean | AddEventListenerOptions) {
        if (listener) listeners.push([t, type, listener, opts]);
        return originals[i].call(this, type, listener, opts);
      } as typeof t.addEventListener;
    });
    try {
      context = gsap.context(() => {
        for (const [name, init] of modules) {
          try {
            const cleanup = init();
            if (typeof cleanup === 'function') cleanups.push(cleanup);
          } catch (error) {
            console.error(`[wfc] ${name} failed to initialize`, error);
          }
        }
      });
      // ScrollTrigger measures pins in the order modules create them, not
      // in page order: a pin created first but placed lower on the page is
      // measured without the spacer of the pin above it, and pins in the
      // wrong place. Sort by position, then measure top to bottom.
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    } finally {
      targets.forEach((t, i) => (t.addEventListener = originals[i]));
    }
  }

  function destroyPage() {
    // Module cleanups first, newest first, while their nodes still exist.
    while (cleanups.length) {
      try {
        cleanups.pop()!();
      } catch (error) {
        console.error('[wfc] page cleanup failed', error);
      }
    }
    context?.revert();
    context = null;
    listeners.forEach(([t, type, listener, opts]) => t.removeEventListener(type, listener, opts));
    listeners = [];
    options.onDestroy?.();
  }

  return { initPage, destroyPage };
}
