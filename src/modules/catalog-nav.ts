// Medical Catalog sidebar: the category whose product block is in view is
// marked active (black, per Figma "1V Filters"). The links are Webflow
// section links in .services-main-nav-list.is-catalog; Webflow gives
// same-page section links no current state of its own.
const ACTIVE = 'is-active';

export function initCatalogNav() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.services-main-nav-list.is-catalog a[href^="#"]'));
  const pairs = links
    .map((link) => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((p): p is { link: HTMLAnchorElement; target: HTMLElement } => !!p.target);
  if (!pairs.length) return;

  const setActive = (active: HTMLAnchorElement) => {
    pairs.forEach(({ link }) => {
      const on = link === active;
      link.classList.toggle(ACTIVE, on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  // The active category is the last one whose block has reached the upper
  // third of the viewport; before the first, the first.
  const update = () => {
    const line = window.innerHeight / 3;
    let current = pairs[0];
    for (const pair of pairs) {
      // The anchor marks the start of its product block.
      const block = pair.target.parentElement ?? pair.target;
      if (block.getBoundingClientRect().top <= line) current = pair;
    }
    setActive(current.link);
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
