import { gsap, SplitText, EASE, MQ } from './animation';

// Hover text roll (replaces the Webflow interactions "Button Hover" and
// "Footer Link Hover"). On hover each letter slides up by one line inside
// its own mask and the label's text-shadow copy (set in the Designer:
// `text-shadow: 0 1.2em` on Button Label, `0 1.5em` on the footer link)
// slides in from below; on leave the timeline plays back.
//
//   [data-hover-roll]         the hover target (button, chip, footer link);
//                             value "tablet-up": only from 768px up, as
//                             Button Hover was off on mobile
//   [data-hover-roll-text]    the label to split (default: the target itself)
//   [data-hover-roll-icon]    optional circle that turns lime
//
// Letters are split on the first hover, not at load (the Webflow version
// split all ~45 labels on every page), and get will-change only while
// they move.

const ICON_HOVER = { backgroundColor: '#d8ff4c', color: '#83a800' };

type Roll = { tl: gsap.core.Timeline; split: SplitText };

function build(target: HTMLElement): Roll {
  const text = target.querySelector<HTMLElement>('[data-hover-roll-text]') || target;
  const split = SplitText.create(text, {
    type: 'words,chars',
    mask: 'chars',
    wordsClass: 'gsap_split_word',
    charsClass: 'gsap_split_letter',
  });
  // The roll distance is the text-shadow offset the Designer set (1.2em on
  // buttons, 1.5em on footer links), so the copy lands exactly in place.
  const shadow = getComputedStyle(text).textShadow.match(/(-?[\d.]+)px\s+(-?[\d.]+)px/);
  const distance = shadow ? -parseFloat(shadow[2]) : -text.getBoundingClientRect().height;
  const tl = gsap.timeline({
    paused: true,
    defaults: { duration: 0.735, ease: EASE },
    onStart: () => gsap.set(split.chars, { willChange: 'transform' }),
    onComplete: () => gsap.set(split.chars, { willChange: 'auto' }),
    onReverseComplete: () => gsap.set(split.chars, { willChange: 'auto' }),
  });
  tl.to(split.chars, { y: distance, stagger: 0.0125 }, 0);
  const icon = target.querySelector('[data-hover-roll-icon]');
  if (icon) tl.to(icon, ICON_HOVER, 0);
  return { tl, split };
}

export function initHoverRoll() {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-hover-roll]'));
  if (!targets.length) return;
  const mm = gsap.matchMedia();
  const bind = (list: HTMLElement[]) => {
    const rolls = new Map<HTMLElement, Roll>();
    const enter = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      if (!rolls.has(el)) rolls.set(el, build(el));
      rolls.get(el)!.tl.play();
    };
    const leave = (e: Event) => rolls.get(e.currentTarget as HTMLElement)?.tl.reverse();
    list.forEach((el) => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });
    return () => {
      list.forEach((el) => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      });
      rolls.forEach(({ tl, split }) => {
        tl.revert();
        split.revert();
      });
    };
  };
  const all = targets.filter((el) => el.dataset.hoverRoll !== 'tablet-up');
  const tabletUp = targets.filter((el) => el.dataset.hoverRoll === 'tablet-up');
  mm.add(MQ.motion, () => bind(all));
  mm.add(`${MQ.motion} and ${MQ.tabletUp}`, () => bind(tabletUp));
}
