import { gsap, MQ } from './animation';

// About hero scroll (replaces the Webflow interaction "About Hero Scroll").
// Through the tall hero wrapper the video tilts up into place (down 40%,
// scale 0.8, tipped back 20° → flat) while the heading block lifts and
// fades out, locked to the scroll position. Off below 480px, where the
// Designer unpins the hero, and with reduced motion: the Designer state
// (video flat, heading visible) stays.
//
//   [data-about-hero]         the scroll range (Section Pad is_about-hero)
//   [data-about-hero-video]   About Hero Video
//   [data-about-hero-main]    About Hero Main (eyebrow, heading, buttons)

export function initAboutHero() {
  const root = document.querySelector<HTMLElement>('[data-about-hero]');
  if (!root) return;
  gsap.matchMedia().add(`${MQ.motion} and ${MQ.phoneUp}`, () => {
    const video = root.querySelector('[data-about-hero-video]');
    const main = root.querySelector('[data-about-hero-main]');
    const tl = gsap.timeline({
      defaults: { duration: 1, ease: 'none' },
      scrollTrigger: { trigger: root, start: 'clamp(top top)', end: 'clamp(bottom bottom)', scrub: true },
    });
    if (video) {
      gsap.set(video, { yPercent: 40, scale: 0.8, rotationX: 20 });
      tl.to(video, { yPercent: 0, scale: 1, rotationX: 0 }, 0);
    }
    if (main) tl.to(main, { opacity: 0, yPercent: -50 }, 0);
  });
}
