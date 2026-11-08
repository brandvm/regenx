// Benefit sliders on phones (≤479px): the slider box takes the height of the
// card on screen instead of the tallest card, and eases to the next card's
// height with the slide (Swiper's own transition duration, so drags snap and
// arrow/dot moves animate). Above 479px nothing changes. The height
// transition rule lives in styles/benefit-slider.css.

type SwiperLike = {
  destroyed?: boolean;
  activeIndex: number;
  slides: HTMLElement[];
  wrapperEl: HTMLElement;
  on: (event: string, fn: (...args: any[]) => void) => void;
  off: (event: string, fn: (...args: any[]) => void) => void;
};

const SLIDER = '[data-benefit-slider] .swiper.sb-benefit-slider';
const PHONE = window.matchMedia('(max-width: 479px)');

function init() {
  const bound = new WeakSet<SwiperLike>();

  function bind(el: HTMLElement) {
    const swiper = (el as any)._smartSwiperInstance as SwiperLike | undefined;
    if (!swiper || swiper.destroyed || bound.has(swiper)) return;
    bound.add(swiper);
    const wrapper = swiper.wrapperEl;

    const apply = () => {
      if (swiper.destroyed) return;
      if (!PHONE.matches) {
        wrapper.style.height = '';
        return;
      }
      const slide = swiper.slides[swiper.activeIndex];
      if (slide && slide.offsetHeight) wrapper.style.height = `${slide.offsetHeight}px`;
    };

    // Card heights change when images load or text reflows.
    const ro = new ResizeObserver(apply);
    swiper.slides.forEach((slide) => ro.observe(slide));
    swiper.on('slideChangeTransitionStart', apply);
    swiper.on('resize', apply);
    PHONE.addEventListener('change', apply);
    swiper.on('destroy', () => {
      ro.disconnect();
      PHONE.removeEventListener('change', apply);
      wrapper.style.height = '';
    });
    apply();
  }

  const scan = () => document.querySelectorAll<HTMLElement>(SLIDER).forEach(bind);

  // SmartSwiper builds a slider only once its tab pane is visible and marks
  // it with data-swiper-inited, so bind each one as it appears.
  new MutationObserver(scan).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-swiper-inited'],
  });
  scan();
}

export const BenefitAutoHeight = { init };
