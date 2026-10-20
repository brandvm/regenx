// Marquee: a row that scrolls sideways in an endless loop.
// Snippet: webflow-build recipes/snippets (CSS: marquee.css).
//
// Markup: [data-marquee] on the row (a flex row, or a Collection List's
// items); its children are the items. data-marquee-speed="40" is pixels per
// second. The Designer's wrapper clips it (overflow hidden).
//
// The items are cloned once (aria-hidden, out of the tab order), the row
// moves left by one full set and loops. Pauses on hover, on keyboard focus
// and off screen. Without the script, or under reduced motion, nothing is
// cloned and the row keeps its Designer layout (let it wrap).
const SPEED = 40;

export function initMarquee(): (() => void) | void {
  const rows = document.querySelectorAll<HTMLElement>('[data-marquee]');
  if (!rows.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observers: Array<ResizeObserver | IntersectionObserver> = [];

  rows.forEach((row) => {
    const items = Array.from(row.children) as HTMLElement[];
    if (items.length < 2 || row.classList.contains('is-marquee')) return;
    for (const item of items) {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('data-marquee-clone', '');
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      clone.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((el) => el.setAttribute('tabindex', '-1'));
      row.appendChild(clone);
    }
    const speed = Number(row.dataset.marqueeSpeed) || SPEED;
    const firstClone = row.children[items.length] as HTMLElement;
    const measure = () => {
      // One set = from the first item to its clone, gap included.
      const distance = firstClone.offsetLeft - items[0].offsetLeft;
      if (distance <= 0) return;
      row.style.setProperty('--marquee-distance', `${-distance}px`);
      row.style.setProperty('--marquee-duration', `${(distance / speed).toFixed(2)}s`);
    };
    row.classList.add('is-marquee');
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(row);
    const view = new IntersectionObserver(([entry]) => row.classList.toggle('is-marquee-paused', !entry.isIntersecting));
    view.observe(row);
    observers.push(resize, view);
  });
  return () => observers.forEach((o) => o.disconnect());
}
