// Article "In this Article" box (Finsweet fs-toc). Finsweet moves
// w--current to the section in view but never scrolls its box, so on a long
// article the current link sits below the box's visible area. Keep it in
// view whenever it changes.
//
// An article with no headings (some legal pages, products and posts) gives
// Finsweet nothing to list, so the box kept its template link, "Loading", on
// staging. Hide the box then instead (pre-launch QA, 2026-11-19).

// The scrolling box around the TOC (.article-sticky-block today). Looked up
// on every change: the box only scrolls at breakpoints where it is capped.
function scrollBox(el: HTMLElement): HTMLElement | null {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return null;
}

function reveal(link: HTMLElement, reduce: boolean) {
  const box = scrollBox(link.parentElement ?? link);
  if (!box) return;
  const boxRect = box.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  if (linkRect.top >= boxRect.top && linkRect.bottom <= boxRect.bottom) return;
  // Measured against the box itself: it may not be the offsetParent.
  const offset = linkRect.top - boxRect.top + box.scrollTop;
  box.scrollTo({
    top: offset - (box.clientHeight - linkRect.height) / 2,
    behavior: reduce ? 'auto' : 'smooth',
  });
}

const HEADINGS = 'h2, h3, h4, h5, h6';

function hideIfEmpty(table: HTMLElement) {
  const contents = document.querySelector('[fs-toc-element="contents"]');
  if (contents?.querySelector(HEADINGS)) return false;
  const box = table.closest<HTMLElement>('.article-sticky-block') ?? table;
  box.hidden = true;
  box.style.display = 'none';
  box.setAttribute('data-toc-empty', '');
  return true;
}

export function initTocFollow() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll<HTMLElement>('[fs-toc-element="table"]').forEach((table) => {
    if (hideIfEmpty(table)) return;
    // Finsweet builds the links after load, so watch the whole table.
    new MutationObserver((records) => {
      for (const record of records) {
        const link = record.target as HTMLElement;
        if (link.classList.contains('w--current')) reveal(link, reduce);
      }
    }).observe(table, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
}
