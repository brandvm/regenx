// Medical Catalog on phones (Figma "Proposal · Catalog & Lab Panel filters",
// client reference superpower.com/biomarkers): the product blocks read as one
// grouped list. Each card is a compact row that opens in place, groups with
// no match hide while searching, and a Filters sheet narrows the list by
// medication form. Only the total ("58 medications") is counted: the client
// asked for no numbers beside tabs, headings or filter options (Figma
// comment, Marshall Stein, Nov 2026).
//
// Everything visual hangs off [data-catalog-compact] on the section, which is
// set only at ≤767px, so desktop and a page without the bundle keep the
// Webflow layout. Finsweet filters the grid lists on search; the two sliders
// (New, Most Prescribed) aren't Finsweet lists, so their slides are matched
// here. A card's form comes from data-form on .product-card, bound in Webflow
// to the Products › Form field; without it there is no Filters button.
// The sheet is a [data-modal] (modal.ts), so this runs before initModals.

const MOBILE = '(max-width: 767px)';
const COMPACT = 'data-catalog-compact';
const HIDDEN = 'is-catalog-hidden';
const SEARCH_HIDDEN = 'is-search-hidden';
const SEARCH_ASIDE = 'data-catalog-search-aside';
const FORM_HIDDEN = 'is-form-hidden';
const OPEN = 'is-open';

type Group = { block: HTMLElement; links: HTMLAnchorElement[]; heading: HTMLElement | null; slider: boolean };
type SwiperLike = { enable?: () => void; disable?: () => void; update?: () => void };

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

export function initCatalogList() {
  const found = document.querySelector<HTMLElement>('.s-medical-catelog');
  if (!found) return;
  const section: HTMLElement = found;

  const blocks = Array.from(section.querySelectorAll<HTMLElement>('.product-block, .product-slider-w'));
  if (!blocks.length) return;
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.services-main-nav-list.is-catalog a[href^="#"]'));
  const groups: Group[] = blocks.map((block) => ({
    block,
    links: links.filter((link) => {
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      return !!target && block.contains(target);
    }),
    heading: block.querySelector<HTMLElement>('.section-header h2'),
    slider: block.matches('.product-slider-w'),
  }));

  // An item is a product row: a Finsweet list item or a slide. Not the
  // strengths list inside each card, which is a Collection List too.
  const itemsOf = (group: Group) => Array.from(group.block.querySelectorAll<HTMLElement>('.w-dyn-item'))
    .filter((item) => item.querySelector(':scope > .product-card'));
  const formOf = (item: HTMLElement) => item.querySelector<HTMLElement>('[data-form]')?.dataset.form?.trim() || '';
  const productOf = (item: HTMLElement) => item.querySelector('a[href*="/product/"]')?.getAttribute('href') ?? item;
  const isShown = (item: HTMLElement) => !item.classList.contains(SEARCH_HIDDEN) && !item.classList.contains(FORM_HIDDEN);
  // catalog-nav.ts hides New Products while it is empty: it stays out.
  const isRetired = (group: Group) => group.block.style.display === 'none';

  const search = section.querySelector<HTMLInputElement>('[fs-list-element="filters"] input[fs-list-field="*"]')
    ?? document.querySelector<HTMLInputElement>('.search-bar-input');
  const forms = new Set<string>();
  const selected = new Set<string>();

  // --- Rows: a toggle in each card's title, the form after its strengths.
  // Finsweet loads the later pages of each list after boot (fs-list-load
  // "all"), so cards are set up again whenever a list changes.
  let rows = 0;
  function setupCard(card: HTMLElement) {
    const title = card.querySelector<HTMLElement>('.product-card-title');
    if (!title || title.querySelector('.catalog-row-toggle')) return;
    const i = rows++;
    const name = text(title.querySelector('.d4')) || 'this medication';
    // What the row hides until it opens: the description and the buttons.
    const details = Array.from(card.querySelectorAll<HTMLElement>('.product-card-info > p, .grouped-cta'));
    details.forEach((el, n) => { el.id ||= `catalog-row-${i}-${n}`; });
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'catalog-row-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', `Details for ${name}`);
    if (details.length) toggle.setAttribute('aria-controls', details.map((el) => el.id).join(' '));
    title.appendChild(toggle);
    const form = formOf(card.closest<HTMLElement>('.w-dyn-item') ?? card);
    if (form) {
      forms.add(form);
      const tag = document.createElement('span');
      tag.className = 'catalog-row-form';
      tag.textContent = form;
      title.querySelector('.product-variant-w')?.after(tag);
    }
    // The whole title row opens the card, the way the + suggests.
    title.addEventListener('click', (event) => {
      if (!section.hasAttribute(COMPACT) || (event.target as Element).closest('a')) return;
      const open = !card.classList.contains(OPEN);
      card.classList.toggle(OPEN, open);
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  section.querySelectorAll<HTMLElement>('.product-card').forEach(setupCard);

  // --- Empty state, after the last block.
  const empty = document.createElement('div');
  empty.className = 'catalog-empty';
  empty.setAttribute('role', 'status');
  empty.hidden = true;
  empty.innerHTML = '<p class="catalog-empty-title"></p><p class="catalog-empty-text">Try another name, or clear your search and filters.</p><button type="button" class="catalog-empty-clear">Clear search</button>';
  blocks[blocks.length - 1].after(empty);

  // --- Toolbar (result count + Filters) under the search bar.
  const toolbar = document.createElement('div');
  toolbar.className = 'catalog-toolbar';
  const total = document.createElement('span');
  total.className = 'catalog-total';
  total.setAttribute('aria-live', 'polite');
  toolbar.appendChild(total);
  let filtersButton: HTMLButtonElement | null = null;
  let applyButton: HTMLButtonElement | null = null;
  const boxes: HTMLInputElement[] = [];
  (search?.closest('.search-bar-w') ?? search)?.after(toolbar);

  const ORDER = ['Injection', 'Capsule', 'Tablet', 'Troche', 'Cream', 'Nasal spray'];
  if (forms.size) {
    filtersButton = document.createElement('button');
    filtersButton.type = 'button';
    filtersButton.className = 'catalog-filters-button';
    filtersButton.setAttribute('data-modal-open', 'catalog-filters');
    // Remix Icon (loaded by the global Embed), as in the Figma button:
    // sliders, label, chevron.
    filtersButton.innerHTML = '<i class="catalog-filters-icon ri-equalizer-line" aria-hidden="true"></i><span class="catalog-filters-label">Filters</span><i class="catalog-filters-icon ri-arrow-down-s-line" aria-hidden="true"></i>';
    toolbar.appendChild(filtersButton);

    const sheet = document.createElement('div');
    sheet.className = 'catalog-sheet';
    sheet.setAttribute('data-modal', 'catalog-filters');
    sheet.setAttribute('data-modal-display', 'flex');
    // Every known form gets an option (later pages may bring forms the first
    // didn't); an option with no product on the page stays hidden.
    const list = Array.from(new Set([...ORDER, ...forms]));
    sheet.innerHTML = `<div class="catalog-sheet-panel" data-modal-panel>
      <div class="catalog-sheet-head"><h2 class="catalog-sheet-title">Filters</h2><button type="button" class="catalog-sheet-clear">Clear all</button></div>
      <fieldset class="catalog-sheet-group"><legend class="catalog-sheet-legend">Medication form</legend>
      ${list.map((f) => `<label class="catalog-sheet-option"><input type="checkbox" value="${f.replace(/"/g, '&quot;')}"><span class="catalog-sheet-option-label">${f}</span></label>`).join('')}
      </fieldset>
      <button type="button" class="catalog-sheet-apply" data-modal-close></button>
    </div>`;
    document.body.appendChild(sheet);
    boxes.push(...Array.from(sheet.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')));
    applyButton = sheet.querySelector<HTMLButtonElement>('.catalog-sheet-apply');
    boxes.forEach((box) => box.addEventListener('change', () => {
      if (box.checked) selected.add(box.value); else selected.delete(box.value);
      applyForms();
    }));
    sheet.querySelector('.catalog-sheet-clear')?.addEventListener('click', () => clearForms());
  }

  function clearForms() {
    selected.clear();
    boxes.forEach((box) => { box.checked = false; });
    applyForms();
  }

  function clearSearch() {
    if (!search) return;
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
  empty.querySelector('.catalog-empty-clear')?.addEventListener('click', () => { clearSearch(); clearForms(); });

  // Finsweet removes non-matching items from its lists; the sliders are
  // matched here on the same text (any field, contains, any case).
  function applySearch() {
    const q = (search?.value ?? '').trim().toLowerCase();
    groups.filter((g) => g.slider).forEach((g) => itemsOf(g).forEach((item) => {
      item.classList.toggle(SEARCH_HIDDEN, !!q && section.hasAttribute(COMPACT) && !text(item).toLowerCase().includes(q));
    }));
    // Above phones the sliders keep sliding, so they aren't matched slide by
    // slide: while a search is on they step aside with their sidebar links,
    // leaving the Finsweet results (audit #36).
    const asideOnDesktop = !!q && !section.hasAttribute(COMPACT);
    groups.filter((g) => g.slider && !isRetired(g)).forEach((g) => {
      g.block.toggleAttribute(SEARCH_ASIDE, asideOnDesktop);
      g.links.forEach((link) => link.toggleAttribute(SEARCH_ASIDE, asideOnDesktop));
    });
    schedule();
  }

  function applyForms() {
    groups.forEach((g) => itemsOf(g).forEach((item) => {
      item.classList.toggle(FORM_HIDDEN, selected.size > 0 && !selected.has(formOf(item)));
    }));
    update();
  }

  function update() {
    const compact = section.hasAttribute(COMPACT);
    const seen = new Set<string | HTMLElement>();
    groups.forEach((g) => {
      if (isRetired(g)) return;
      const n = itemsOf(g).filter(isShown).length;
      // A product can sit in more than one group (Most Prescribed, and the
      // extra categories ED and Hair Regrowth): the total counts each once.
      itemsOf(g).filter(isShown).forEach((item) => {
        seen.add(productOf(item));
      });
      const hide = compact && n === 0;
      g.block.classList.toggle(HIDDEN, hide);
      g.links.forEach((link) => link.classList.toggle(HIDDEN, hide));
    });
    const anyShown = groups.some((g) => !isRetired(g) && !g.block.classList.contains(HIDDEN));
    const shown = seen.size;
    total.textContent = `${shown} medication${shown === 1 ? '' : 's'}`;
    const q = (search?.value ?? '').trim();
    empty.hidden = !compact || anyShown;
    const title = empty.querySelector('.catalog-empty-title');
    if (title) title.textContent = q ? `No medications match “${q}”` : 'No medications match these filters';

    boxes.forEach((box) => {
      const option = box.closest<HTMLElement>('.catalog-sheet-option');
      if (option) option.hidden = !forms.has(box.value) && !box.checked;
    });
    if (applyButton) applyButton.textContent = `Show ${shown} result${shown === 1 ? '' : 's'}`;
  }

  let frame = 0;
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; update(); });
  }

  // Finsweet re-renders a list on every search; keep the classes on the
  // items it puts back and recount.
  const observer = new MutationObserver(() => {
    section.querySelectorAll<HTMLElement>('.product-card').forEach(setupCard);
    if (selected.size) groups.forEach((g) => itemsOf(g).forEach((item) => {
      item.classList.toggle(FORM_HIDDEN, !selected.has(formOf(item)));
    }));
    schedule();
  });
  section.querySelectorAll('[fs-list-element="list"]').forEach((list) => observer.observe(list, { childList: true }));
  search?.addEventListener('input', applySearch);

  // --- Breakpoint: compact on phones only. The sliders stop sliding there
  // (their slides stack as rows); leaving phones restores everything.
  const sliders = () => Array.from(section.querySelectorAll<HTMLElement & { swiper?: SwiperLike }>('.product-slider-w .swiper'));
  const mq = window.matchMedia(MOBILE);
  const apply = () => {
    const compact = mq.matches;
    section.toggleAttribute(COMPACT, compact);
    sliders().forEach((el) => {
      if (compact) el.swiper?.disable?.();
      else { el.swiper?.enable?.(); el.swiper?.update?.(); }
    });
    if (!compact) {
      section.querySelectorAll(`.${OPEN}`).forEach((card) => card.classList.remove(OPEN));
      section.querySelectorAll('.catalog-row-toggle').forEach((t) => t.setAttribute('aria-expanded', 'false'));
      if (selected.size) clearForms();
    }
    applySearch();
    update();
  };
  mq.addEventListener('change', apply);
  // Swiper starts in main.js before this runs; disable once it exists.
  apply();
}
