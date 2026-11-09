// Medical Catalog sidebar: the category whose product block is in view is
// marked active (black, per Figma "1V Filters"). The links are Webflow
// section links in .services-main-nav-list.is-catalog; Webflow gives
// same-page section links no current state of its own.
// A block marked [data-catalog-hide-empty] (New Products) is hidden, with its
// sidebar link, while its Collection List has no items: Webflow can't hide an
// element on an empty list.
import { revealTab, sectionInView } from './tab-spy';

const ACTIVE = 'is-active';

export function initCatalogNav() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.services-main-nav-list.is-catalog a[href^="#"]'));
  const targetOf = (link: HTMLAnchorElement) => document.getElementById(decodeURIComponent(link.hash.slice(1)));

  document.querySelectorAll<HTMLElement>('[data-catalog-hide-empty]').forEach((block) => {
    if (block.querySelector('.w-dyn-item')) return;
    block.style.display = 'none';
    links.forEach((link) => {
      const target = targetOf(link);
      if (target && block.contains(target)) link.style.display = 'none';
    });
  });

  // Hidden links (empty blocks, or hidden in Webflow) take no part. Which
  // blocks have a box is checked on every update: on phones the compact list
  // (catalog-list.ts) shows them only after this runs, and its search hides
  // some.
  const pairs = links
    .map((link) => ({ link, target: targetOf(link) }))
    .filter((p): p is { link: HTMLAnchorElement; target: HTMLElement } =>
      !!p.target && p.link.style.display !== 'none' && !p.link.classList.contains('is-catalog-hidden'));
  if (!pairs.length) return;

  let current: HTMLAnchorElement | null = null;
  const setActive = (active: HTMLAnchorElement) => {
    if (active === current) return;
    current = active;
    pairs.forEach(({ link }) => {
      const on = link === active;
      link.classList.toggle(ACTIVE, on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    // The phone tab row scrolls sideways: keep the active tab in sight.
    revealTab(active);
  };

  // The anchor marks the start of its product block.
  const update = () => {
    const pick = sectionInView(pairs, (p) => p.target.parentElement ?? p.target);
    if (pick && pick.link.getClientRects().length) setActive(pick.link);
  };

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; update(); });
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  links.forEach((link) => link.addEventListener('click', () => setActive(link)));
  update();
}
