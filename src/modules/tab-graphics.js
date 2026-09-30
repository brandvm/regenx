import { gsap } from "./animation";
import { Debug } from "./debug";

// ============================================
// Tab Graphics — custom entrance for the active tab's graphic.
//   On every tab switch, animates [data-tab-gfx] inside the newly
//   active .w-tab-pane. Uses GSAP if present, else a CSS class.
//   Pairs with native Webflow Tabs — no markup logic, just the reveal.
// ============================================
export const TabGraphics = (() => {
  const SEL_PANE = ".w-tab-pane";
  const SEL_GFX = "[data-tab-gfx]";
  const ACTIVE = "w--tab-active";

  const GSAP_FROM = { opacity: 0, y: 16, scale: 0.985 };
  const GSAP_TO = {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.735,
    ease: "power2.out",
    delay: 0.24,
  };

  function playGSAP(gfx) {
    gsap.killTweensOf(gfx);
    gsap.fromTo(gfx, GSAP_FROM, GSAP_TO);
  }

  function playCSS(gfx) {
    gfx.forEach((el) => {
      el.classList.remove("is-tab-in");
      void el.offsetWidth;
      el.classList.add("is-tab-in");
    });
  }

  function play(pane) {
    const gfx = pane.querySelectorAll(SEL_GFX);
    if (!gfx.length) return;
    if (window.gsap) playGSAP(gfx);
    else playCSS(gfx);
  }

  function wire(tabs) {
    const panes = Array.from(tabs.querySelectorAll(SEL_PANE));
    if (!panes.length) return;

    panes.forEach((pane) => {
      let wasActive = pane.classList.contains(ACTIVE);
      // animate the one that's active on load
      if (wasActive) play(pane);

      const obs = new MutationObserver(() => {
        const isActive = pane.classList.contains(ACTIVE);
        if (isActive && !wasActive) play(pane);
        wasActive = isActive;
      });
      obs.observe(pane, { attributes: true, attributeFilter: ["class"] });
    });
  }

  function init() {
    const blocks = document.querySelectorAll("[data-tab-gfx-scope]");
    const scopes = blocks.length
      ? blocks
      : document.querySelectorAll(".process");
    if (!scopes.length) {
      Debug.log("TabGraphics: no tab scope found — skipped");
      return;
    }
    scopes.forEach(wire);
    Debug.log(
      "TabGraphics: init —",
      scopes.length,
      "tab block(s) | gsap:",
      !!window.gsap
    );
  }

  return { init };
})();
