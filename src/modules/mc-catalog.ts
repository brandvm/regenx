// Medication Catalog on phones, new UI (/design/medication-catalog; Figma
// "Proposal · Catalog & Lab Panel filters"). Desktop keeps the product
// cards; at ≤767px Webflow hides them (Product Block List Is MC) and shows
// [data-mc-list] (MC List), which this fills: one MC Group per product block
// and one MC Row per card, read from the published card. Every look is a
// Webflow class from the style guide; states are combos (MC Row Is Hidden,
// MC Row Body Is Closed, MC Group Is Hidden, MC Show More Is Hidden, MC Tab
// Line Is Active). Only the total is counted (client comment, Nov 2026).
//
// Each list's later pages are fetched here (see loadPages), cards Finsweet
// adds are picked up too, and rows are never removed: Finsweet re-renders a
// list on every search, so the search here filters the rows on its own.
import { getLenis } from './smooth-scroll';

const MOBILE = '(max-width: 767px)';
const PAGE = 5; // rows a group shows before Show more
const HIDDEN = 'is-hidden';
const CLOSED = 'is-closed';
const ACTIVE = 'is-active';

type Row = { el: HTMLElement; key: string; haystack: string };
type Group = { el: HTMLElement; id: string; block: HTMLElement; rows: Row[]; more: HTMLElement; expanded: boolean; seen: Set<string> };

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, content?: string) {
  const el = document.createElement(tag);
  el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}

export function initMcCatalog() {
  const found = document.querySelector<HTMLElement>('[data-mc-list]');
  if (!found) return;
  const list: HTMLElement = found;
  const section = list.closest<HTMLElement>('section') ?? document.body;
  const empty = list.querySelector<HTMLElement>('[data-mc-empty]');
  const search = section.querySelector<HTMLInputElement>('[fs-list-element="filters"] input[fs-list-field="*"]');
  const total = section.querySelector<HTMLElement>('.mc-total');
  const tabs = Array.from(section.querySelectorAll<HTMLAnchorElement>('.mc-tab[href^="#"]'));
  const blocks = Array.from(section.querySelectorAll<HTMLElement>('.product-block, .product-slider-w'));
  if (!blocks.length) return;
  total?.setAttribute('aria-live', 'polite');

  let uid = 0;
  const groups: Group[] = blocks.map((block) => {
    const id = block.querySelector<HTMLElement>('.anchor-extension[id]')?.id ?? block.querySelector<HTMLElement>('[id]')?.id ?? '';
    const el = make('div', 'mc-group');
    el.dataset.mcGroup = id;
    el.appendChild(make('h2', 'mc-group-head', text(block.querySelector('.section-header h2'))));
    const more = make('div', `mc-show-more ${HIDDEN}`);
    more.setAttribute('role', 'button');
    more.tabIndex = 0;
    more.append(make('div', '', 'Show more'), make('i', 'mc-icon is-sm ri-arrow-down-s-line'));
    more.lastElementChild?.setAttribute('aria-hidden', 'true');
    el.appendChild(more);
    const group: Group = { el, id, block, rows: [], more, expanded: false, seen: new Set() };
    const toggleMore = () => { group.expanded = !group.expanded; update(); };
    more.addEventListener('click', toggleMore);
    more.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMore(); } });
    list.insertBefore(el, empty);
    return group;
  });

  // --- A row from a published card: name, strengths · form, and (open) the
  // image, description and the card's two buttons.
  function rowFrom(card: HTMLElement): Row | null {
    const name = text(card.querySelector('.d4'));
    if (!name) return null;
    const strengths = Array.from(card.querySelectorAll('.product-variant-item')).map(text).filter(Boolean).join(', ');
    const sub = [strengths, card.dataset.form?.trim()].filter(Boolean).join(' · ');
    const desc = text(card.querySelector('.product-card-info > p'));
    const i = uid++;

    const el = make('div', 'mc-row');
    const head = make('div', 'mc-row-head');
    head.setAttribute('role', 'button');
    head.tabIndex = 0;
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('aria-controls', `mc-row-${i}`);
    const words = make('div', 'mc-row-text');
    words.appendChild(make('div', 'mc-row-name', name));
    if (sub) words.appendChild(make('div', 'mc-row-sub', sub));
    const icon = make('i', 'mc-icon is-lg ri-add-line');
    icon.setAttribute('aria-hidden', 'true');
    head.append(words, icon);

    const body = make('div', `mc-row-body ${CLOSED}`);
    body.id = `mc-row-${i}`;
    const img = card.querySelector<HTMLImageElement>('.product-card-image');
    if (img?.src) {
      const image = make('img', 'mc-row-image');
      image.src = img.currentSrc || img.src;
      image.alt = img.alt;
      image.loading = 'lazy';
      body.appendChild(image);
    }
    const info = make('div', 'mc-row-info');
    if (desc) info.appendChild(make('p', 'mc-row-desc', desc));
    const actions = make('div', 'mc-actions');
    card.querySelectorAll<HTMLAnchorElement>('.grouped-cta a[href]').forEach((a, n) => {
      const button = make('a', n ? 'mc-button is-secondary' : 'mc-button', a.getAttribute('aria-label') || a.title || text(a));
      button.href = a.getAttribute('href') ?? '#';
      if (a.target) button.target = a.target;
      actions.appendChild(button);
    });
    if (actions.childElementCount) info.appendChild(actions);
    body.appendChild(info);
    el.append(head, body);

    const toggle = () => {
      const open = body.classList.contains(CLOSED);
      body.classList.toggle(CLOSED, !open);
      icon.classList.toggle('ri-add-line', !open);
      icon.classList.toggle('ri-subtract-line', open);
      head.setAttribute('aria-expanded', String(open));
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    // Two products can share a name and strength (Testosterone Cypionate in
    // two oils): the description tells them apart.
    return { el, key: `${name}|${sub}|${desc}`, haystack: `${name} ${sub} ${desc}`.toLowerCase() };
  }

  // A product card is a list item or a slide, not the strengths list inside
  // it. A card already shown in its group (Finsweet re-renders) is skipped.
  function add(g: Group, root: ParentNode) {
    let added = false;
    root.querySelectorAll<HTMLElement>('.w-dyn-item > .product-card').forEach((card) => {
      const row = rowFrom(card);
      if (!row || g.seen.has(row.key)) return;
      g.seen.add(row.key);
      g.rows.push(row);
      g.el.insertBefore(row.el, g.more);
      added = true;
    });
    return added;
  }
  function collect() {
    if (groups.map((g) => add(g, g.block)).some(Boolean)) update();
  }

  // Finsweet loads a list's later pages only once the list nears the
  // viewport, and the card lists are hidden on phones, so the rows fetch
  // them here: follow each block's Next link, take the same block (by its
  // anchor id) from that page, until there is no Next.
  async function loadPages(g: Group) {
    let next = g.block.querySelector<HTMLAnchorElement>('.w-pagination-next[href]')?.href;
    const seen = new Set<string>();
    while (next && !seen.has(next)) {
      seen.add(next);
      const html = await fetch(next, { credentials: 'same-origin' }).then((r) => (r.ok ? r.text() : ''));
      if (!html) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const block = doc.getElementById(g.id)?.closest('.product-block, .product-slider-w');
      if (!block) return;
      if (add(g, block)) update();
      const href = block.querySelector('.w-pagination-next')?.getAttribute('href');
      next = href ? new URL(href, next).href : undefined;
    }
  }
  let loading = false;
  function loadAll() {
    if (loading || !mq.matches) return;
    loading = true;
    groups.filter((g) => g.id).forEach((g) => {
      loadPages(g).catch((error) => console.warn('[RegenX] mc-catalog: a page failed to load', error));
    });
  }

  function update() {
    const q = (search?.value ?? '').trim().toLowerCase();
    const counted = new Set<string>();
    groups.forEach((g) => {
      const matches = g.rows.filter((r) => !q || r.haystack.includes(q));
      // A product can sit in more than one group: the total counts it once.
      matches.forEach((r) => counted.add(r.key));
      g.rows.forEach((r) => {
        const n = matches.indexOf(r);
        r.el.classList.toggle(HIDDEN, n < 0 || (!g.expanded && n >= PAGE));
      });
      g.el.classList.toggle(HIDDEN, matches.length === 0);
      g.more.classList.toggle(HIDDEN, matches.length <= PAGE);
      const label = g.more.firstElementChild;
      if (label) label.textContent = g.expanded ? 'Show less' : 'Show more';
      g.more.lastElementChild?.classList.toggle('ri-arrow-down-s-line', !g.expanded);
      g.more.lastElementChild?.classList.toggle('ri-arrow-up-s-line', g.expanded);
      g.more.setAttribute('aria-expanded', String(g.expanded));
    });
    if (total) total.textContent = `${counted.size} medication${counted.size === 1 ? '' : 's'}`;
    empty?.classList.toggle(HIDDEN, counted.size > 0);
    schedule();
  }

  // --- Tabs: jump to the group (the anchors sit in the hidden card list)
  // and mark the group in view.
  const groupFor = (link: HTMLAnchorElement) => groups.find((g) => g.id === decodeURIComponent(link.hash.slice(1)));
  // Under the fixed nav (.g-nav-w). A number, not the element: Lenis
  // overshot when given the element and an offset.
  const offset = () => (document.querySelector<HTMLElement>('.g-nav-w')?.getBoundingClientRect().height ?? 0) + 16;
  tabs.forEach((link) => link.addEventListener('click', (event) => {
    const g = groupFor(link);
    if (!g || !mq.matches || g.el.classList.contains(HIDDEN)) return;
    // Webflow's own section-link scroll (delegated on the document) would
    // also run and aim at the hidden anchor.
    event.preventDefault();
    event.stopPropagation();
    setActive(link);
    const top = g.el.getBoundingClientRect().top + window.scrollY - offset();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(top);
    else window.scrollTo({ top, behavior: 'smooth' });
  }));

  let current: HTMLAnchorElement | null = null;
  function setActive(link: HTMLAnchorElement) {
    if (link === current) return;
    current = link;
    tabs.forEach((t) => {
      const on = t === link;
      t.querySelector('.mc-tab-line')?.classList.toggle(ACTIVE, on);
      if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
    const bar = link.parentElement;
    if (bar) bar.scrollTo({ left: link.offsetLeft - bar.clientWidth / 2 + link.offsetWidth / 2, behavior: 'smooth' });
  }

  // The tab in view is the one for the last group (in page order, which
  // isn't the tabs' order) whose top has passed the upper third; before the
  // first, the first.
  function spy() {
    if (!mq.matches) return;
    const line = window.innerHeight / 3;
    let pick: HTMLAnchorElement | null = null;
    for (const g of groups) {
      const link = tabs.find((t) => groupFor(t) === g);
      if (!link || g.el.classList.contains(HIDDEN)) continue;
      if (!pick || g.el.getBoundingClientRect().top <= line) pick = link;
    }
    if (pick) setActive(pick);
  }

  let frame = 0;
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; spy(); });
  }

  const mq = window.matchMedia(MOBILE);
  const observer = new MutationObserver(collect);
  section.querySelectorAll('.product-block-list .w-dyn-items').forEach((items) => observer.observe(items, { childList: true }));
  search?.addEventListener('input', update);
  window.addEventListener('scroll', schedule, { passive: true });
  mq.addEventListener('change', () => { loadAll(); schedule(); });
  collect();
  update();
  loadAll();
}
