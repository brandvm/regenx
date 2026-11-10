// Nav search: the search icon in G | Navigation (.g-nav-search-button) opens
// a search field under the nav bar, instead of only linking to the catalog.
// Focus happens inside the tap, so phones raise the keyboard (a focus after
// a page load, as catalog-search-focus.ts does, can't). The field is a plain
// GET form to the link's own page, so Enter goes to /treatments?search=<term>,
// which catalog-search-focus.ts fills in and runs. On the catalog page itself
// the icon jumps straight to the catalog's own search box. The link's href
// stays the no-JS fallback.
//
// Below 992px the icon sits in the burger menu: opening the search closes the
// menu first. Esc, the close button, a tap outside or focus leaving the panel
// close it again.

const CATALOG_INPUT = '.s-medical-catelog .search-bar-input';

function buildPanel(action: string, id: string) {
  const panel = document.createElement('div');
  panel.className = 'rx-nav-search';
  panel.id = id;
  panel.hidden = true;
  panel.innerHTML = `
    <form class="rx-nav-search-form" role="search" method="get" action="${action}">
      <i class="rx-nav-search-icon ri-search-line" aria-hidden="true"></i>
      <input class="rx-nav-search-input" type="search" name="search" placeholder="Search medications"
        aria-label="Search medications" autocomplete="off" enterkeyhint="search">
      <button class="rx-nav-search-close" type="button" aria-label="Close search">
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </form>`;
  document.body.append(panel);
  return panel;
}

export function initNavSearch() {
  const found = document.querySelector<HTMLAnchorElement>('.g-nav-search-button');
  if (!found) return;
  const trigger: HTMLAnchorElement = found;
  const action = new URL(trigger.href, location.href).pathname;
  const panel = buildPanel(action, 'rx-nav-search');
  const form = panel.querySelector('form')!;
  const input = panel.querySelector<HTMLInputElement>('.rx-nav-search-input')!;
  const close = panel.querySelector<HTMLButtonElement>('.rx-nav-search-close')!;
  trigger.setAttribute('aria-controls', panel.id);
  trigger.setAttribute('aria-expanded', 'false');

  function closeMenu() {
    const menuButton = document.querySelector<HTMLElement>('[data-nav-menu-button]');
    if (menuButton?.getAttribute('aria-expanded') === 'true') menuButton.click();
  }

  function place() {
    const bar = document.querySelector('.sw-g-nav')?.getBoundingClientRect();
    panel.style.top = `${Math.max(8, (bar?.bottom ?? 64) + 8)}px`;
  }

  function open() {
    place();
    panel.hidden = false;
    panel.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    input.focus();
    input.select();
  }

  function hide(returnFocus = false) {
    if (panel.hidden) return;
    panel.classList.remove('is-open');
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus();
  }

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    if (!panel.hidden) { hide(); return; }
    const catalogInput = document.querySelector<HTMLInputElement>(CATALOG_INPUT);
    closeMenu();
    if (catalogInput && catalogInput.getClientRects().length) {
      catalogInput.focus();
      catalogInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    open();
  });

  form.addEventListener('submit', (e) => {
    if (input.value.trim()) return; // normal GET: /treatments?search=<term>
    e.preventDefault();
    input.focus();
  });
  close.addEventListener('click', () => hide(true));
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); hide(true); }
  });
  panel.addEventListener('focusout', (e) => {
    const next = e.relatedTarget as Node | null;
    if (next && !panel.contains(next) && next !== trigger) hide();
  });
  document.addEventListener('pointerdown', (e) => {
    const target = e.target as Node;
    if (!panel.hidden && !panel.contains(target) && !trigger.contains(target)) hide();
  });
  window.addEventListener('resize', () => { if (!panel.hidden) place(); });
}
