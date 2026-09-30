import { Debug } from "./debug";

// Resolves ONCE the page is unlocked & scrollable (preloader done, or none).
export const PageReady = (() => {
  let resolved = false;
  const queue = [];
  return {
    signal() {
      if (resolved) return;
      resolved = true;
      Debug.log("PageReady -> SIGNAL (page unlocked). queued:", queue.length);
      while (queue.length) queue.shift()();
    },
    ready(fn) {
      resolved ? fn() : queue.push(fn);
    },
  };
})();
