// Shared by the Lab Panel (lab-tests.ts) and the Medical Catalog
// (catalog-nav.ts): which section tab is "in view", and keeping that tab
// visible in a phone tab row that scrolls sideways.

// The section in view: the last one whose top has passed the upper third
// of the viewport; before the first, the first. Sections with no box
// (hidden, or filtered out by a search) take no part.
export function sectionInView<T>(items: T[], el: (item: T) => HTMLElement): T | null {
  const line = window.innerHeight / 3;
  let pick: T | null = null;
  for (const item of items) {
    const box = el(item);
    if (!box.getClientRects().length) continue;
    if (!pick || box.getBoundingClientRect().top <= line) pick = item;
  }
  return pick;
}

// Centre the tab in its row when the row scrolls sideways (phones).
export function revealTab(link: HTMLElement) {
  const row = link.parentElement;
  if (!row || row.scrollWidth <= row.clientWidth) return;
  // Measured against the row itself: it may not be the offsetParent.
  const offset = link.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
  row.scrollTo({ left: offset - (row.clientWidth - link.offsetWidth) / 2, behavior: 'smooth' });
}
