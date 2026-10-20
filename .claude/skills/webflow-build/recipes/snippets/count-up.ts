// Count-up numbers. Snippet: webflow-build recipes/snippets.
//
// Markup: [data-count] on a text element whose text is the final value as
// written in the Designer or the CMS: "2,400+", "$63M", "98.5%". The
// markup keeps that final text, so the canvas, no-JS visitors and crawlers
// see it.
//
// The first number in the text counts from 0 when the element first
// scrolls into view; the prefix and suffix stay put. Screen readers hear
// the final text once (a visually hidden copy); the moving number is
// aria-hidden. The number's box keeps its final width, so nothing beside
// it moves. Left as written: text without a number, ranges ("4–5"),
// anything already on screen at load (counting it would flash the end
// value first), and everything under reduced motion.
// data-count-duration="2000" changes the 1600 ms default.
const DURATION = 1600;
const HIDDEN = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0';

type Counter = { number: HTMLElement; to: number; decimals: number; duration: number; format: (n: number) => string };

function prepare(el: HTMLElement): Counter | null {
  const text = el.textContent ?? '';
  const match = text.match(/\d[\d,]*(?:\.\d+)?/);
  if (!match || match.index === undefined || /\d\s*[–—-]\s*\d/.test(text)) return null;
  const raw = match[0];
  const to = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(to)) return null;
  const decimals = (raw.split('.')[1] ?? '').length;
  const grouped = raw.includes(',');
  const format = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped });

  const spoken = document.createElement('span');
  spoken.style.cssText = HIDDEN;
  spoken.textContent = text;
  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  const number = document.createElement('span');
  number.textContent = raw;
  shown.append(text.slice(0, match.index), number, text.slice(match.index + raw.length));
  el.replaceChildren(spoken, shown);

  // Reserve the final width (in em, so it follows fluid type), then show 0.
  number.style.display = 'inline-block';
  number.style.whiteSpace = 'nowrap';
  number.style.textAlign = 'right';
  const size = parseFloat(getComputedStyle(number).fontSize) || 16;
  number.style.minWidth = `${number.getBoundingClientRect().width / size}em`;
  number.textContent = format(0);
  return { number, to, decimals, duration: Number(el.dataset.countDuration) || DURATION, format };
}

function play({ number, to, duration, format }: Counter) {
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / duration));
    number.textContent = format(to * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
    else number.textContent = format(to);
  };
  requestAnimationFrame(tick);
}

export function initCountUp(): (() => void) | void {
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));
  if (!items.length || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const counters = new Map<Element, Counter>();
  for (const el of items) {
    const box = el.getBoundingClientRect();
    if (box.top < innerHeight && box.bottom > 0) continue; // on screen at load
    const counter = prepare(el);
    if (counter) counters.set(el, counter);
  }
  if (!counters.size) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        play(counters.get(entry.target)!);
      }
    },
    { threshold: 0.6 },
  );
  counters.forEach((_, el) => observer.observe(el));
  return () => observer.disconnect();
}
