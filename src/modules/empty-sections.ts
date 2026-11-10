// Empty Collection Lists: a section whose list has no items disappears
// instead of showing Webflow's "No items found." (user, 2026-11-10). Webflow
// can't hide an element on an empty list.
//   - Product page: the FAQ block (.product-faqs, with the divider line just
//     above it), "Related Insights" (.articles-list-w's section) and "Other
//     Medications" (.product-slider-w).
//   - Any block marked [data-hide-empty] in the Designer.
//   - Anywhere else: the empty list itself, so its empty state never shows.
//   - Then a .section left with nothing visible (no text, image or video)
//     goes too, so its padding doesn't leave a gap.
// The catalog's category blocks and their sidebar links are catalog-nav.ts.
// Only top-level lists count; the strengths list inside a product card is
// just hidden when it is empty.

const BLOCKS = '[data-hide-empty], .product-faqs, .product-slider-w';

function isEmpty(list: Element) {
  return !list.querySelector('.w-dyn-item');
}

function hide(el: HTMLElement) {
  el.style.display = 'none';
  el.setAttribute('data-empty-hidden', '');
}

function showsNothing(section: HTMLElement) {
  if (section.innerText.trim()) return false;
  return !Array.from(section.querySelectorAll('img, video, iframe, svg')).some((el) => el.getClientRects().length);
}

export function initEmptySections() {
  const touched = new Set<HTMLElement>();
  document.querySelectorAll<HTMLElement>('.w-dyn-list').forEach((list) => {
    if (!isEmpty(list) || list.closest('[data-empty-hidden]')) return;
    const nested = list.parentElement?.closest('.w-dyn-item');
    const block = nested ? null : list.closest<HTMLElement>(BLOCKS);
    if (block && isEmpty(block)) {
      hide(block);
      touched.add(block);
      const before = block.previousElementSibling;
      if (block.matches('.product-faqs') && before instanceof HTMLElement && before.matches('.line')) hide(before);
      return;
    }
    // Related articles: the whole section, when that list is all it holds.
    const section = nested ? null : list.closest<HTMLElement>('.section');
    if (section && list.matches('.articles-list-w') && section.querySelectorAll('.w-dyn-list').length === 1) {
      hide(section);
      return;
    }
    hide(list);
    touched.add(list);
  });
  touched.forEach((el) => {
    const section = el.closest<HTMLElement>('.section');
    if (section && !section.hasAttribute('data-empty-hidden') && showsNothing(section)) hide(section);
  });
}
