// Lab Panel › "Biomarkers We Test For", phones: the pinned bar (search +
// tabs, .lab-tests-nav) follows the nav. Webflow pins it at top 0 with a
// 72px top padding that leaves room for the nav. While nav-autohide has the
// nav hidden, that room was an empty white band (client, 2026-11-17): the
// bar now pins higher, so the search sits GAP px from the top, and moves
// back down when the nav returns.
//
// Like catalog-sticky.ts, the new top applies at once and a transform
// animation (Web Animations) slides the bar from where it was, with the
// nav's own transition duration and curve, started in the same frame as the
// nav's transform, so the two move in step on the compositor.
// Phones only (≤767px); tablet and desktop keep the Webflow top.
// Hooks: .lab-tests-nav, .g-nav-w (is-rx-hidden from nav-autohide).

export function initLabSticky() {
  const bar = document.querySelector<HTMLElement>('.lab-tests-nav');
  const nav = document.querySelector<HTMLElement>('.g-nav-w');
  if (!bar || !nav) return;

  const GAP = 12; // px between the top edge and the search while the nav is hidden
  const phone = window.matchMedia('(max-width: 767px)');
  let top: number | null = null; // the top this module set, px
  let slide: Animation | null = null;

  // The bar's current translateY from a running slide (0 when none).
  const shift = () => {
    if (!slide) return 0;
    const t = getComputedStyle(bar).transform;
    return t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0;
  };
  const navTiming = () => {
    const fallback = { duration: 600, easing: 'cubic-bezier(.64, .05, 0, 1)' };
    const cs = getComputedStyle(nav);
    const props = cs.transitionProperty.split(',').map((s) => s.trim());
    const i = props.findIndex((p) => p === 'transform' || p === 'all');
    if (i < 0) return fallback;
    const pick = (list: string) => {
      const parts = list.split(/,(?![^(]*\))/).map((s) => s.trim());
      return parts[i % parts.length];
    };
    const dur = pick(cs.transitionDuration);
    const d = parseFloat(dur) * (dur.endsWith('ms') ? 1 : 1000);
    return { duration: d || fallback.duration, easing: pick(cs.transitionTimingFunction) || fallback.easing };
  };

  const update = () => {
    if (!phone.matches) {
      slide?.cancel();
      slide = null;
      bar.style.top = '';
      top = null;
      return;
    }
    // The room Webflow leaves for the nav: the bar's top padding.
    const pad = parseFloat(getComputedStyle(bar).paddingTop) || 0;
    const next = nav.classList.contains('is-rx-hidden') ? Math.min(0, Math.round(GAP - pad)) : 0;
    const prev = top;
    // Pinned now (judged by the layout position, not the sliding one)?
    const layoutTop = bar.getBoundingClientRect().top - shift();
    const pinned = prev !== null && layoutTop <= prev + 1;
    top = next;
    bar.style.top = `${next}px`;
    if (pinned && prev !== null && prev !== next) {
      const from = shift() + (prev - next);
      slide?.cancel();
      slide = bar.animate(
        [{ transform: `translateY(${from}px)` }, { transform: 'translateY(0px)' }],
        navTiming(),
      );
      const own = slide;
      own.finished.then(() => { if (slide === own) slide = null; }, () => {});
    }
  };

  new MutationObserver(update).observe(nav, { attributes: true, attributeFilter: ['class'] });
  phone.addEventListener('change', update);
  update();
}
