// Lab Panel › "Biomarkers We Test" (Figma "Proposal · Catalog & Lab Panel
// filters"). The "Search Test..." box in Webflow had nothing behind it: it
// now narrows the biomarker accordions by name, hides groups with no match
// (and their nav links), and shows a message when nothing matches. Each nav
// link and group heading carries its count; on phones the nav is a sticky
// row of tabs (Webflow breakpoint styles) whose tab for the group in view is
// marked active and scrolled into sight. Desktop looks as before: the counts
// and the active tab are styled for phones only (lab-tests.css).

const HIDDEN = 'is-lab-hidden';
const ACTIVE = 'is-active';

type Group = { root: HTMLElement; items: HTMLElement[]; heading: HTMLElement | null; links: HTMLAnchorElement[] };

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

function countSpan(host: Element | null) {
  if (!host) return null;
  let span = host.querySelector<HTMLElement>(':scope > .lab-tests-count');
  if (!span) {
    span = document.createElement('span');
    span.className = 'lab-tests-count';
    host.appendChild(span);
  }
  return span;
}

export function initLabTests() {
  const root = document.querySelector<HTMLElement>('.lab-tests');
  if (!root) return;
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.lab-tests-nav-link[href^="#"]'));
  const groups: Group[] = Array.from(root.querySelectorAll<HTMLElement>('.lab-tests-group')).map((group) => ({
    root: group,
    items: Array.from(group.querySelectorAll<HTMLElement>('.lab-tests-list > .acc')),
    heading: group.querySelector<HTMLElement>('.lab-tests-group-label h3'),
    links: links.filter((link) => {
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      return !!target && group.contains(target);
    }),
  }));
  if (!groups.length) return;

  const input = root.querySelector<HTMLInputElement>('.search-form-input');
  // A Webflow form: Enter would submit it (and reload the page).
  input?.form?.addEventListener('submit', (event) => event.preventDefault());
  // "required" would show the browser's bubble on an empty search.
  input?.removeAttribute('required');
  input?.setAttribute('type', 'search');
  input?.setAttribute('aria-label', 'Search biomarkers');

  const empty = document.createElement('div');
  empty.className = 'lab-tests-empty';
  empty.setAttribute('role', 'status');
  empty.hidden = true;
  empty.innerHTML = '<p class="lab-tests-empty-title"></p><button type="button" class="lab-tests-empty-clear">Clear search</button>';
  root.querySelector('.lab-tests-main')?.appendChild(empty);

  const nameOf = (item: HTMLElement) => text(item.querySelector('.w-dropdown-toggle h1, .w-dropdown-toggle h2, .w-dropdown-toggle h3, .w-dropdown-toggle h4, .w-dropdown-toggle h5, .w-dropdown-toggle h6') ?? item.querySelector('.w-dropdown-toggle'));

  function update() {
    const q = (input?.value ?? '').trim().toLowerCase();
    let any = false;
    groups.forEach((g) => {
      let n = 0;
      g.items.forEach((item) => {
        const match = !q || nameOf(item).toLowerCase().includes(q);
        item.classList.toggle(HIDDEN, !match);
        if (match) n += 1;
      });
      g.root.classList.toggle(HIDDEN, n === 0);
      g.links.forEach((link) => {
        link.classList.toggle(HIDDEN, n === 0);
        const span = countSpan(link.querySelector('.lab-tests-nav-label .body-sm') ?? link);
        if (span) span.textContent = `(${n})`;
      });
      const span = countSpan(g.heading);
      if (span) span.textContent = String(n);
      if (n) any = true;
    });
    empty.hidden = any;
    const title = empty.querySelector('.lab-tests-empty-title');
    if (title) title.textContent = `No biomarkers match “${input?.value.trim() ?? ''}”`;
    markActive();
  }

  empty.querySelector('.lab-tests-empty-clear')?.addEventListener('click', () => {
    if (!input) return;
    input.value = '';
    update();
    input.focus();
  });
  input?.addEventListener('input', update);

  // The group in view: the last one whose top has passed the upper third.
  // On the phone row the active tab is scrolled into view sideways.
  let current: HTMLAnchorElement | null = null;
  function markActive() {
    const line = window.innerHeight / 3;
    const visible = groups.filter((g) => !g.root.classList.contains(HIDDEN) && g.links.length);
    if (!visible.length) return;
    let active = visible[0];
    for (const g of visible) if (g.root.getBoundingClientRect().top <= line) active = g;
    const link = active.links[0];
    if (link === current) return;
    current = link;
    links.forEach((l) => {
      const on = l === link;
      l.classList.toggle(ACTIVE, on);
      if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
    });
    const row = link.parentElement;
    if (row && row.scrollWidth > row.clientWidth) {
      row.scrollTo({ left: link.offsetLeft - (row.clientWidth - link.offsetWidth) / 2, behavior: 'smooth' });
    }
  }

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; markActive(); });
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
}
