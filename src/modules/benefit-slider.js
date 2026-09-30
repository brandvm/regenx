// Centred looping card slider for the Enclomiphene benefit tabs. Webflow owns
// the cards; this adds loop copies when a tab has too few cards and renders
// one pagination bullet per authored card.

// Centred loop needs the visible slides plus a buffer on each side.
const MIN_LOOP_SLIDES = 6;

export function createBenefitSlider(el) {
  const root = el.closest("[data-benefit-slider]");
  const wrapper = el.querySelector(".swiper-wrapper");
  const pagination = root && root.querySelector(".sb-benefit-pagination");
  if (!root || !wrapper) return null;

  const originals = Array.from(wrapper.children).filter((node) =>
    node.matches(".swiper-slide")
  );
  const count = originals.length;
  const clones = [];
  const bullets = [];
  let swiper = null;
  let destroyed = false;

  // Append whole sets so each copy keeps its card's position in the cycle.
  if (count > 1) {
    while (count + clones.length < MIN_LOOP_SLIDES) {
      originals.forEach((slide) => {
        const clone = slide.cloneNode(true);
        clone.setAttribute("data-benefit-clone", "");
        clone.setAttribute("aria-hidden", "true");
        clone.querySelectorAll("a, button, [tabindex]").forEach((node) => {
          node.setAttribute("tabindex", "-1");
        });
        wrapper.appendChild(clone);
        clones.push(clone);
      });
    }
  }

  function update() {
    if (!swiper || swiper.destroyed) return;
    const active = swiper.realIndex % count;
    bullets.forEach((bullet, index) => {
      const current = index === active;
      bullet.classList.toggle("swiper-pagination-bullet-active", current);
      if (current) bullet.setAttribute("aria-current", "true");
      else bullet.removeAttribute("aria-current");
    });
  }

  // Go to the nearest copy of a card so a click never spins past the others.
  function goTo(index) {
    if (!swiper || swiper.destroyed) return;
    const total = swiper.slides.length;
    const current = swiper.realIndex;
    let target = index;
    for (let copy = index; copy < total; copy += count) {
      const distance = Math.min(Math.abs(copy - current), total - Math.abs(copy - current));
      const best = Math.min(Math.abs(target - current), total - Math.abs(target - current));
      if (distance < best) target = copy;
    }
    swiper.slideToLoop(target);
  }

  function attach(instance) {
    swiper = instance;
    if (pagination && count > 1) {
      originals.forEach((_, index) => {
        const bullet = document.createElement("button");
        bullet.type = "button";
        bullet.className = "swiper-pagination-bullet";
        bullet.setAttribute("aria-label", `Go to benefit ${index + 1}`);
        bullet.addEventListener("click", () => goTo(index));
        pagination.appendChild(bullet);
        bullets.push(bullet);
      });
    }
    swiper.on("realIndexChange", update);
    swiper.on("destroy", destroy);
    update();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (swiper) {
      swiper.off("realIndexChange", update);
      swiper.off("destroy", destroy);
    }
    bullets.forEach((bullet) => bullet.remove());
    clones.forEach((clone) => clone.remove());
    delete el._benefitSlider;
    delete el._smartSwiperInstance;
    delete el.dataset.swiperInited;
  }

  return { attach, destroy };
}
