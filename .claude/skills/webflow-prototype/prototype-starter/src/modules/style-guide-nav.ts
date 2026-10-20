// Style guide sidebar: marks the link of the section in view with
// `w--current`, the class Webflow itself puts on a link to the section
// being read. In Webflow nothing is needed (style the link's Current
// state); here this module stands in for it.
// Markup: [data-sg-nav] holding a[href="#section-id"] links.
export function initStyleGuideNav() {
  const nav = document.querySelector<HTMLElement>('[data-sg-nav]');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
  const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
  const update = () => {
    const line = window.innerHeight * 0.3;
    let current = 0;
    targets.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) current = i; });
    links.forEach((a, i) => a.classList.toggle('w--current', i === current));
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
