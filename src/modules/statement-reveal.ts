import { gsap, SplitText, EASE, MQ } from './animation';

// Statement scroll (replaces the Webflow interaction "Statement Scroll").
// As the statement scrolls up, its words fade in one after another and the
// small inline images grow in, scrubbed to the scroll position.
//
//   [data-statement]         the trigger (Statement W)
//   [data-statement-text]    the text whose words fade in (Statement)
//   [data-media-scroll]      the inline images (Statement Image W; the
//                            attribute was already set in Webflow)
//
// Words and images start hidden; with reduced motion everything stays at
// its Designer state (fully visible).

export function initStatementScroll() {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-statement]'));
  if (!roots.length) return;
  gsap.matchMedia().add(MQ.motion, () => {
    const splits: SplitText[] = [];
    roots.forEach((root) => {
      const text = root.querySelector<HTMLElement>('[data-statement-text]');
      const images = root.querySelectorAll('[data-media-scroll]');
      if (!text) return;
      const split = SplitText.create(text, {
        type: 'words',
        wordsClass: 'gsap_split_word',
        // No aria-label on the role-less Statement div (audit #26): the words
        // are plain spans, so the text reads as it is.
        aria: 'none',
      });
      splits.push(split);
      gsap.set(split.words, { opacity: 0 });
      gsap.set(images, { opacity: 0, scale: 0 });
      const tl = gsap.timeline({
        defaults: { duration: 1.2, ease: EASE },
        scrollTrigger: {
          trigger: root,
          start: 'clamp(50% bottom)',
          end: 'clamp(top 30%)',
          scrub: 0.8,
        },
      });
      tl.to(split.words, { opacity: 1, stagger: 0.032 }, 0);
      if (images.length) tl.to(images, { opacity: 1, scale: 1, stagger: { amount: 0.64 } }, 0);
    });
    return () => splits.forEach((split) => split.revert());
  });
}
