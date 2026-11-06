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

export function initCatalogSticky() {
  const block = document.querySelector<HTMLElement>('.product-block-list-filter-w');
  const tabs = block?.querySelector<HTMLElement>('.services-main-nav-list.is-catalog');
  if (!block || !tabs) return;
  const nav = document.querySelector<HTMLElement>('.g-nav-w');
  const section = block.closest<HTMLElement>('section');

  const GAP = 12; // px between the top edge (or the nav) and the pinned tabs
  let navBottom = 0;
  let stickyTop = 0;
  const update = () => {
    // How far the tab row sits below the block's top, in the layout.
    const offset = tabs.getBoundingClientRect().top - block.getBoundingClientRect().top;
    navBottom = nav && !nav.classList.contains('is-rx-hidden') ? nav.offsetHeight : 0;
    stickyTop = Math.round(navBottom + GAP - offset);
    block.style.setProperty('--mc-sticky-top', `${stickyTop}px`);
    if (section) block.style.setProperty('--mc-sticky-bg', getComputedStyle(section).backgroundColor);
    clip();
  };

  // Hide what of the block sits above the nav's bottom edge (search and
  // toolbar peeked through the gap around the rounded nav bar), and mark it
  // pinned (data-mc-stuck): the CSS then fills the GAP above the tabs with
  // the page colour, over the toolbar's last few px.
  let ticking = false;
  const clip = () => {
    ticking = false;
    const compact = !!block.closest('[data-catalog-compact]');
    const top = block.getBoundingClientRect().top;
    const above = compact ? Math.max(0, Math.round(navBottom - top)) : 0;
    block.style.clipPath = above ? `inset(${above}px 0 0 0)` : '';
    block.toggleAttribute('data-mc-stuck', compact && top <= stickyTop + 1);
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(clip);
  }, { passive: true });

  // The sticky top eases (CSS transition) when the nav hides or shows, with
  // no scroll event to drive the clip: follow it every frame until it ends.
  let easing = false;
  const follow = () => {
    clip();
    if (easing) requestAnimationFrame(follow);
  };
  block.addEventListener('transitionrun', (e) => {
    if (e.target !== block || easing) return;
    easing = true;
    requestAnimationFrame(follow);
  });
  const stop = (e: TransitionEvent) => {
    if (e.target !== block) return;
    easing = false;
    clip();
  };
  block.addEventListener('transitionend', stop);
  block.addEventListener('transitioncancel', stop);

  if (nav) {
    new MutationObserver(update).observe(nav, { attributes: true, attributeFilter: ['class'] });
    new ResizeObserver(update).observe(nav);
  }
  new ResizeObserver(update).observe(block);
  // catalog-list.ts turns the phone layout on after this runs.
  if (section) new MutationObserver(update).observe(section, { attributes: true, attributeFilter: ['data-catalog-compact'] });
  update();
}
