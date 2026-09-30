import { gsap, ScrollTrigger, SplitText } from "./animation";
import { Debug } from "./debug";

// ============================================
// Reveals — text / element entrance animations (tab-aware)
// ============================================
export const Reveals = (() => {
  const TEXT_VARS = {
    y: "0.15em",
    opacity: 0,
    filter: "blur(8px)",
    duration: 0.8,
    ease: "power2.out",
    stagger: 0.024,
  };
  const EL_VARS = {
    y: "0.15em",
    opacity: 0,
    filter: "blur(8px)",
    duration: 0.8,
    ease: "power2.out",
  };

  function buildAnim(el) {
    if (el.hasAttribute("data-animate-in-text")) {
      const split = SplitText.create(el, { type: "words" });
      return gsap.from(split.words, { ...TEXT_VARS, paused: true });
    }
    return gsap.from(el, { ...EL_VARS, paused: true });
  }

  function init() {
    if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
      Debug.log("Reveals: gsap/ScrollTrigger/SplitText MISSING — skipped");
      return;
    }
    gsap.registerPlugin(ScrollTrigger, SplitText);

    gsap.utils
      .toArray("[data-animate-in-text], [data-animate-in]")
      .forEach((el) => {
        const tween = buildAnim(el);
        const pane = el.closest(".w-tab-pane");
        const startsActive = !pane || pane.classList.contains("w--tab-active");

        let st = null;
        if (startsActive) {
          st = ScrollTrigger.create({
            trigger: el,
            start: "top 80%",
            animation: tween,
            toggleActions: "play none none none",
          });
        } else {
          tween.pause(0);
        }

        if (!pane) return;

        (pane._anim ||= []).push({ tween, st });

        if (!pane._animObserver) {
          let wasActive = pane.classList.contains("w--tab-active");
          pane._animObserver = new MutationObserver(() => {
            const isActive = pane.classList.contains("w--tab-active");

            if (isActive && !wasActive) {
              pane._anim.forEach(({ tween, st }) => {
                if (st) st.disable();
                tween.restart();
              });
            } else if (!isActive && wasActive) {
              pane._anim.forEach(({ tween, st }) => {
                if (st) st.disable();
                tween.pause(0);
              });
            }
            wasActive = isActive;
          });
          pane._animObserver.observe(pane, {
            attributes: true,
            attributeFilter: ["class"],
          });
        }
      });
  }

  return { init };
})();
