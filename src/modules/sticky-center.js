// ============================================
// Sticky Center
// ============================================
export const StickyCenter = (() => {
  function init(selector = "[data-sticky-center]") {
    const elements = Array.from(document.querySelectorAll(selector));
    if (!elements.length) return;

    let ticking = false;

    const apply = () => {
      ticking = false;
      const tops = elements.map((el) =>
        Math.max(0, (window.innerHeight - el.offsetHeight) / 2)
      );
      elements.forEach((el, i) => {
        el.style.top = `${tops[i]}px`;
      });
    };

    const onResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("resize", onResize, { passive: true });
  }

  return { init };
})();
