import { gsap, EASE, MQ } from './animation';

// Media pins (replaces the Webflow interaction "Media Pin Animation"): the
// labels on the service detail images. When a pin's top passes 80% of the
// viewport its dot pops in (scale 0 → 1, turning from 45°) and its label
// fades in; scrolling back above that point plays it in reverse.
//
//   [data-media-pin]         the pin (SD Media Pin)
//   [data-media-pin-icon]    the dot (SD Media Pin Icon)
//   [data-media-pin-text]    the label (its Body LG text)

export function initMediaPin() {
  const pins = Array.from(document.querySelectorAll<HTMLElement>('[data-media-pin]'));
  if (!pins.length) return;
  gsap.matchMedia().add(MQ.motion, () => {
    pins.forEach((pin) => {
      const icon = pin.querySelector('[data-media-pin-icon]');
      const text = pin.querySelector('[data-media-pin-text]');
      if (icon) gsap.set(icon, { scale: 0, rotation: 45 });
      if (text) gsap.set(text, { opacity: 0 });
      const tl = gsap.timeline({
        defaults: { duration: 0.735, ease: EASE },
        scrollTrigger: {
          trigger: pin,
          start: 'clamp(top 80%)',
          end: 'clamp(top 20%)',
          toggleActions: 'play none play reverse',
        },
      });
      if (icon) tl.to(icon, { scale: 1, rotation: 0 }, 0);
      if (text) tl.to(text, { opacity: 1 }, 0.24);
    });
  });
}
