import { gsap, EASE, MQ } from './animation';

// Lab result widgets (Peptide, Enclomiphene heroes; Home case studies): an
// inline SVG built from Figma with live text, sitting on a Webflow glass div
// (Service Hero | Widget W, Case Card | Widget). When the widget first comes
// into view, the range bars fill from the left, chart columns grow from the
// bottom, each ▼ marker slides in while its value counts up, and the copy
// fades in. Reduced motion: shown as is.
//
//   [data-lab-widget]   the SVG (or a wrapper of it)
//     .lw-bar           a range bar segment (fills left → right)
//     .lw-col           a chart column (grows bottom → top)
//     .lw-mark          a marker group: the ▼ and its value text
//     .lw-fade          text that fades in

const ROOT = '[data-lab-widget]';

function countUp(text: SVGTextElement | null, delay: number) {
  const span = text?.querySelector('tspan') ?? text;
  if (!span) return;
  const m = /^(\s*)(\d+(?:\.\d+)?)(.*)$/s.exec(span.textContent ?? '');
  if (!m) return;
  const [, lead, num, rest] = m;
  const decimals = num.includes('.') ? num.split('.')[1].length : 0;
  const target = parseFloat(num);
  const state = { v: 0 };
  gsap.to(state, {
    v: target,
    duration: 1,
    delay,
    ease: EASE,
    onUpdate: () => { span.textContent = `${lead}${state.v.toFixed(decimals)}${rest}`; },
    onComplete: () => { span.textContent = `${lead}${num}${rest}`; },
  });
}

function play(root: Element) {
  const bars = root.querySelectorAll<SVGElement>('.lw-bar');
  const marks = root.querySelectorAll<SVGGElement>('.lw-mark');
  const fades = root.querySelectorAll<SVGElement>('.lw-fade');
  const start = 0.2;
  gsap.from(fades, { opacity: 0, duration: 0.6, delay: start, stagger: 0.05, ease: EASE });
  gsap.from(bars, {
    scaleX: 0,
    transformOrigin: '0% 50%',
    duration: 0.7,
    delay: start + 0.1,
    stagger: 0.08,
    ease: EASE,
  });
  gsap.from(root.querySelectorAll<SVGElement>('.lw-col'), {
    scaleY: 0,
    transformOrigin: '50% 100%',
    duration: 0.7,
    delay: start + 0.1,
    stagger: 0.08,
    ease: EASE,
  });
  marks.forEach((mark, i) => {
    const d = start + 0.45 + i * 0.12;
    gsap.from(mark, { opacity: 0, x: -14, duration: 0.6, delay: d, ease: EASE });
    countUp(mark.querySelector('text'), d);
  });
}

export function initLabWidget() {
  const roots = [...document.querySelectorAll(ROOT)];
  if (!roots.length) return;
  // SVG transforms need the element's own box as reference.
  roots.forEach((r) => r.querySelectorAll<SVGElement>('.lw-bar, .lw-col').forEach((b) => {
    b.style.transformBox = 'fill-box';
  }));
  gsap.matchMedia().add(MQ.motion, () => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        play(e.target);
      });
    }, { threshold: 0.3 });
    roots.forEach((r) => io.observe(r));
    return () => io.disconnect();
  });
}
