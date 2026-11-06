// Medical Catalog: arriving from the nav's search icon (/medical-catalog?search)
// focuses the catalog's search box, so visitors can type at once.
// `?search=term` also fills it in and runs the search. Runs after catalog-list,
// which listens for that input.

export function initCatalogSearchFocus() {
  const params = new URLSearchParams(location.search);
  if (!params.has('search')) return;
  const input = document.querySelector<HTMLInputElement>('.s-medical-catelog .search-bar-input');
  if (!input) return;
  const term = params.get('search')?.trim();
  if (term) {
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  input.focus({ preventScroll: true });
}
