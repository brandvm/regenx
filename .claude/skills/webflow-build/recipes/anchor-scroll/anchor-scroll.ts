// Same-page anchor links that land below whatever is pinned to the top.
// Recipe: webflow-build recipes/anchor-scroll.
//
// Webflow's own handler (click.wf-scroll, jQuery on document) offsets only
// for a position:fixed header and never reads scroll-margin-top, so a
// sticky bar (a tab strip, a sub-nav) covers the heading it just scrolled
// to. This replaces that handler.
//
// The offset is measured at click time, not stored: the larger of the
// target's scroll-margin-top and the bottom edge of any sticky or fixed bar
// that will be pinned over it (horizontally overlapping it), plus a gap.
//
// Smooth scrolling (Lenis or similar): pass the instance,
// initAnchorScroll(lenis). Without one the browser scrolls natively.

const GAP = 24;

// The part of a smooth-scroll instance this uses (Lenis has it).
export type Scroller = { scrollTo: (target: number, options?: { immediate?: boolean }) => void };

type JQuery = (target: Document) => { off: (events: string) => void };

/** Where a pinned element's bottom edge will sit once `target` is scrolled
 *  to the top, or 0 if it will not be covering the top of the viewport. */
function pinnedBottom(el: HTMLElement, target: HTMLElement): number {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return 0;
  // Only something above the target can cover it: a sticky side column
  // sits beside its sections, not over them.
  const rect = el.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  if (rect.right <= box.left || rect.left >= box.right) return 0;
  if (style.position === 'fixed') {
    // Top bars only: not a bottom CTA bar, nor a full-screen overlay.
    return rect.top <= 1 && rect.height < innerHeight / 2 ? rect.bottom : 0;
  }
  // A sticky element only sticks inside its parent, so it covers the target
  // only when both share that parent.
  if (style.position !== 'sticky' || el.contains(target)) return 0;
  if (!el.parentElement?.contains(target)) return 0;
  const top = parseFloat(style.top);
  return Number.isNaN(top) ? 0 : top + el.offsetHeight;
}

function offsetFor(target: HTMLElement): number {
  let bar = 0;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
    const pos = getComputedStyle(el).position;
    if (pos === 'sticky' || pos === 'fixed') bar = Math.max(bar, pinnedBottom(el, target));
  }
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  return Math.max(margin, bar ? bar + GAP : 0);
}

function scrollToTarget(target: HTMLElement, scroller: Scroller | undefined, smooth: boolean) {
  const y = target.getBoundingClientRect().top + scrollY - offsetFor(target);
  if (scroller) scroller.scrollTo(y, { immediate: !smooth });
  else window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
}

function byHash(hash: string): HTMLElement | null {
  if (!hash || hash === '#') return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

function targetOf(link: HTMLAnchorElement): HTMLElement | null {
  if (link.origin !== location.origin || link.pathname !== location.pathname) return null;
  return byHash(link.hash);
}

// Bound once; a second call (after a page transition) only updates the
// scroller and corrects an arriving hash.
let bound = false;
let current: Scroller | undefined;

export function initAnchorScroll(scroller?: Scroller) {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="#"]:not([href="#"])'));
  const initial = byHash(location.hash);
  if (!initial && !links.some(targetOf)) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  current = scroller;

  if (!bound) {
    bound = true;
    // Webflow.push runs after Webflow's own modules have bound, or at once
    // if they already have, so the unbind cannot lose a race with webflow.js.
    const unbind = () => (window as unknown as { jQuery?: JQuery }).jQuery?.(document).off('click.wf-scroll');
    const wf = (window as unknown as { Webflow?: { push?: (fn: () => void) => void } }).Webflow;
    if (wf?.push) wf.push(unbind);
    else unbind();

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href*="#"]');
      // Webflow Tabs links carry a hash too; leave them to webflow.js.
      if (!link || link.classList.contains('w-tab-link')) return;
      const target = targetOf(link);
      if (!target) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      scrollToTarget(target, current, !reduce);
      // Move keyboard focus with the scroll, as Webflow's handler did.
      if (!target.matches('a, button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  // Arriving from another page with a hash: the browser's own jump uses
  // scroll-margin-top alone, so correct it once layout has settled. The
  // bundle loads async, so load may already have fired.
  if (!initial) return;
  const settle = () => scrollToTarget(initial, current, false);
  if (document.readyState === 'complete') settle();
  else addEventListener('load', settle, { once: true });
}
