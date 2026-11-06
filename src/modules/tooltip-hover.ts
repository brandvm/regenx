import { gsap, EASE, MQ } from './animation';

// Tooltip hover (replaces the Webflow interaction "SAM | Tooltip Hover",
// the muscle tooltips on the TRT body map): on hover the "+" turns into an
// "×" and the card drops in (opacity 0 → 1, 1em above → in place, scale
// 0.9 → 1); on leave it plays back.
//
//   [data-tooltip]           the hover target (SAM | Tooltip)
//   [data-tooltip-icon]      the "+" wrapper (SAM | Tooltip Icon)
//   [data-tooltip-content]   the card (SAM | Tooltip Content: opacity 0 and
//                            scale 0.9 in the Designer)
//
// With reduced motion the card still shows on hover, without the motion.

export function initTooltipHover() {
  const tips = Array.from(document.querySelectorAll<HTMLElement>('[data-tooltip]'));
  if (!tips.length) return;
  const mm = gsap.matchMedia();
  mm.add({ motion: MQ.motion, reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
    const reduce = !!ctx.conditions?.reduce;
    const off: (() => void)[] = [];
    tips.forEach((tip) => {
      const icon = tip.querySelector('[data-tooltip-icon]');
      const content = tip.querySelector('[data-tooltip-content]');
      const tl = gsap.timeline({ paused: true, defaults: { duration: reduce ? 0 : 0.735, ease: EASE } });
      if (icon) {
        gsap.set(icon, { rotation: 0 });
        tl.to(icon, { rotation: 45 }, 0);
      }
      if (content) {
        gsap.set(content, { opacity: 0, y: '-1em', scale: 0.9 });
        tl.to(content, { opacity: 1, y: '0em', scale: 1 }, 0);
      }
      const enter = () => tl.play();
      const leave = () => tl.reverse();
      tip.addEventListener('mouseenter', enter);
      tip.addEventListener('mouseleave', leave);
      off.push(() => {
        tip.removeEventListener('mouseenter', enter);
        tip.removeEventListener('mouseleave', leave);
      });
    });
    return () => off.forEach((fn) => fn());
  });
}
