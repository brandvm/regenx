// Marquee: a row that scrolls sideways in an endless loop.
// Snippet: webflow-build recipes/snippets (CSS: marquee.css).
//
// Markup (Webflow owns it, 2026-11-17): [data-marquee] on the row, a flex
// row that never wraps, inside a clipping wrapper ([data-marquee-mask]).
// The row holds two identical sets ([data-marquee-set]); the second is the
// loop copy, marked data-marquee-clone and aria-hidden in the Designer. So
// without the script (reduced motion, the canvas, a failed load) the row is
// already one clipped line, never a wrapped grid.
//
// The script only animates: it measures one set (from the first set to the
// copy, gap included), sets --marquee-distance and --marquee-duration, takes
// the copy's links out of the tab order and adds .is-marquee. Pauses on
// hover, on keyboard focus and off screen. data-marquee-speed="40" is pixels
// per second.
//
// Fallback: a row without a [data-marquee-clone] child gets its items cloned
// here, as before.
const SPEED = 40;

function cloneItems(row: HTMLElement, items: HTMLElement[]): HTMLElement {
  for (const item of items) {
    const clone = item.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('data-marquee-clone', '');
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    row.appendChild(clone);
  }
  return row.children[items.length] as HTMLElement;
}

export function initMarquee(): (() => void) | void {
  const rows = document.querySelectorAll<HTMLElement>('[data-marquee]');
  if (!rows.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observers: Array<ResizeObserver | IntersectionObserver> = [];

  rows.forEach((row) => {
    if (row.classList.contains('is-marquee')) return;
    const children = Array.from(row.children) as HTMLElement[];
    const authoredCopy = children.find((el) => el.hasAttribute('data-marquee-clone'));
    let first: HTMLElement;
    let copy: HTMLElement;
    if (authoredCopy) {
      first = children[0];
      copy = authoredCopy;
    } else {
      if (children.length < 2) return;
      first = children[0];
      copy = cloneItems(row, children);
    }
    // The copy is decoration: keep its links out of the tab order.
    row.querySelectorAll('[data-marquee-clone]').forEach((el) => {
      el.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((f) => f.setAttribute('tabindex', '-1'));
    });
    const speed = Number(row.dataset.marqueeSpeed) || SPEED;
    const measure = () => {
      const distance = copy.offsetLeft - first.offsetLeft;
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
