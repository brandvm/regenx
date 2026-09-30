// ============================================
// Nav Shrink
// ============================================
export const NavShrink = (() => {
  function init() {
    const targets = document.querySelectorAll(".g-nav-w, .s-g-nav, .sw-g-nav");
    if (!targets.length) return;

    const getThresholdPx = () => window.innerHeight * 0.05; // 5vh
    let thresholdPx = getThresholdPx();
    let last = null;
    let ticking = false;

    const apply = () => {
      ticking = false;
      const shouldShrink = window.scrollY >= thresholdPx;
      if (shouldShrink === last) return;
      last = shouldShrink;
      targets.forEach((el) => el.classList.toggle("is-shrunk", shouldShrink));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };

    const onResize = () => {
      thresholdPx = getThresholdPx();
      last = null;
      apply();
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
  }

  return { init };
})();
