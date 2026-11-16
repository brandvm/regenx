// Catalog sticky tabs (phones; client request 2026-11-05).
// On the Medical Catalog's compact phone list, the category tabs stay in view
// while the list scrolls, like the Lab Panel's bar. The whole filter block
// (search, count + Filters, tabs) is sticky with a negative top, so search
// and toolbar scroll away and only the tab row stays, 12px under the nav
// while it shows, and 12px from the top while nav-autohide has it hidden.
//
// Sets --mc-sticky-top and --mc-sticky-bg on the filter block; the CSS
// (styles/catalog-list.css › Medical Catalog on phones) applies only under
// [data-catalog-compact] (≤767px, set by catalog-list.ts).
// Hooks: .product-block-list-filter-w, .services-main-nav-list.is-catalog,
// .g-nav-w (is-rx-hidden from nav-autohide).
//
// When the nav hides or shows, the pinned tabs follow it with a transform
// animation (Web Animations), started in the same frame as the nav's own
// transform transition and with its duration and curve. Both then run on
// the compositor in step; a CSS `top` transition ran on the main thread, a
// frame or more apart from the nav, and the list flashed through the gap
// between them (client, 2026-11-16).

export function initCatalogSticky() {
  const block = document.querySelector<HTMLElement>('.product-block-list-filter-w');
  const tabs = block?.querySelector<HTMLElement>('.services-main-nav-list.is-catalog');
  if (!block || !tabs) return;
  const nav = document.querySelector<HTMLElement>('.g-nav-w');
  const section = block.closest<HTMLElement>('section');

  const GAP = 12; // px between the top edge (or the nav) and the pinned tabs
  const OVERLAP = 2; // px the pinned band reaches up under the nav (see clip)
  let navBottom = 0;
  let stickyTop: number | null = null;
  let slide: Animation | null = null;

  const compact = () => !!block.closest('[data-catalog-compact]');
  // The block's current translateY from a running slide (0 when none).
  const shift = () => {
    if (!slide) return 0;
    const t = getComputedStyle(block).transform;
    return t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0;
  };
  // The nav's own transform transition, so the tabs move with the same timing.
  const navTiming = () => {
    const fallback = { duration: 600, easing: 'cubic-bezier(.64, .05, 0, 1)' };
    if (!nav) return fallback;
    const cs = getComputedStyle(nav);
    const props = cs.transitionProperty.split(',').map((s) => s.trim());
    let i = props.findIndex((p) => p === 'transform' || p === 'all');
    if (i < 0) return fallback;
    const pick = (list: string) => {
      const parts = list.split(/,(?![^(]*\))/).map((s) => s.trim());
      return parts[i % parts.length];
    };
    const d = parseFloat(pick(cs.transitionDuration)) * (pick(cs.transitionDuration).endsWith('ms') ? 1 : 1000);
    return { duration: d || fallback.duration, easing: pick(cs.transitionTimingFunction) || fallback.easing };
  };

  const update = () => {
    // How far the tab row sits below the block's top, in the layout.
    const offset = tabs.getBoundingClientRect().top - block.getBoundingClientRect().top;
    // The exact height, not offsetHeight: the nav is 65.64px tall and the
    // rounded 66 left a sub-pixel seam the list showed through on phones.
    navBottom = nav && !nav.classList.contains('is-rx-hidden') ? nav.getBoundingClientRect().height : 0;
    const next = Math.round(navBottom + GAP - offset);
    const prev = stickyTop;
    // Pinned now (judged by the layout position, not the sliding one)?
    const layoutTop = block.getBoundingClientRect().top - shift();
    const wasPinned = compact() && prev !== null && layoutTop <= prev + 1;
    stickyTop = next;
    block.style.setProperty('--mc-sticky-top', `${next}px`);
    if (section) {
      const bg = getComputedStyle(section).backgroundColor;
      block.style.setProperty('--mc-sticky-bg', bg);
      nav?.style.setProperty('--mc-sticky-bg', bg);
    }
    if (wasPinned && prev !== null && prev !== next) {
      // The new top applies at once; start the slide from where the tabs are
      // now (including a slide still under way) back to zero.
      const from = shift() + (prev - next);
      slide?.cancel();
      slide = block.animate(
        [{ transform: `translateY(${from}px)` }, { transform: 'translateY(0px)' }],
        navTiming(),
      );
      const own = slide;
      const follow = () => {
        if (slide !== own) return;
        clip();
        requestAnimationFrame(follow);
      };
      requestAnimationFrame(follow);
      own.finished.then(() => {
        if (slide === own) { slide = null; clip(); }
      }, () => {});
    }
    clip();
  };

  // Hide what of the block sits above the nav's bottom edge (search and
  // toolbar peeked through the gap around the rounded nav bar), and mark it
  // pinned (data-mc-stuck): the CSS then fills the GAP above the tabs with
  // the page colour, over the toolbar's last few px.
  let ticking = false;
  const clip = () => {
    ticking = false;
    const isCompact = compact();
    const top = block.getBoundingClientRect().top; // where it is drawn
    const stuck = isCompact && stickyTop !== null && top - shift() <= stickyTop + 1;
    // Pinned under a filled nav, keep OVERLAP px of the block (its page-colour
    // band) under the nav's bottom edge so no seam opens between them. The
    // nav's live bottom (it slides in and out with a transform), so the clip
    // follows it frame by frame.
    const live = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
    const edge = live - top - (stuck && live > 0 ? OVERLAP : 0);
    const above = isCompact ? Math.max(0, Math.floor(edge)) : 0;
    // Pinned, the CSS paints the block's colour 16px out to each side (box
    // shadows); the clip must leave room for them.
    const side = stuck ? '-16px' : '0';
    block.style.clipPath = above ? `inset(${above}px ${side} 0 ${side})` : '';
    block.toggleAttribute('data-mc-stuck', stuck);
    // While the tabs are pinned, the list scrolled through the nav band around
    // the rounded bar (client, 2026-11-16): fill that band, and the gap under
    // it, with the page colour. Kept on while the nav is hidden too, so the
    // fill slides with it and nothing opens up mid-animation.
    if (nav) nav.toggleAttribute('data-mc-fill', stuck);
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(clip);
  }, { passive: true });

  if (nav) {
    new MutationObserver(update).observe(nav, { attributes: true, attributeFilter: ['class'] });
    new ResizeObserver(update).observe(nav);
  }
  new ResizeObserver(update).observe(block);
  // catalog-list.ts turns the phone layout on after this runs.
  if (section) new MutationObserver(update).observe(section, { attributes: true, attributeFilter: ['data-catalog-compact'] });
  update();
}
