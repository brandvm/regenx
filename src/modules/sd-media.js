import { Debug } from "./debug";

// ============================================
// SDMedia — accordion-driven media switcher
//   Webflow puts the open state on the .w-dropdown-toggle
//   (w--open class + aria-expanded), NOT on the .w-dropdown root —
//   so that's what we observe.
// ============================================
export const SDMedia = (() => {
  function isOpen(acc) {
    const t = acc.querySelector(".w-dropdown-toggle");
    return !!(
      (t &&
        (t.classList.contains("w--open") ||
          t.getAttribute("aria-expanded") === "true")) ||
      acc.classList.contains("w--open")
    );
  }

  function wire(scope) {
    const accs = Array.from(scope.querySelectorAll(".acc.w-dropdown"));
    const panels = Array.from(scope.querySelectorAll("[data-sd-media]"));
    if (!accs.length || !panels.length) {
      Debug.log("SDMedia: scope missing accs or panels — skipped");
      return;
    }

    const panelFor = (acc, i) => {
      const want = acc.getAttribute("data-sd-target");
      if (want)
        return (
          panels.find((p) => p.getAttribute("data-sd-media") === want) || null
        );
      return panels[i] || null;
    };

    const activate = (panel) => {
      if (!panel || panel.classList.contains("is-active")) return;
      panels.forEach((p) => p.classList.toggle("is-active", p === panel));
      Debug.log(
        "SDMedia: show",
        panel.getAttribute("data-sd-media") || "(panel)"
      );
    };

    accs.forEach((acc, i) => {
      const toggle = acc.querySelector(".w-dropdown-toggle") || acc;
      let was = isOpen(acc);
      const check = () => {
        const is = isOpen(acc);
        if (is && !was) activate(panelFor(acc, i));
        was = is;
      };
      new MutationObserver(check).observe(toggle, {
        attributes: true,
        attributeFilter: ["class", "aria-expanded"],
      });
      toggle.addEventListener("click", () => setTimeout(check, 60)); // fallback
    });

    const openIdx = Math.max(0, accs.findIndex(isOpen));
    activate(panelFor(accs[openIdx], openIdx) || panels[0]);
  }

  function init() {
    const scopes = document.querySelectorAll("[data-sd-scope]");
    if (!scopes.length) {
      Debug.log("SDMedia: no [data-sd-scope] — skipped");
      return;
    }
    scopes.forEach(wire);
    Debug.log("SDMedia: init —", scopes.length, "scope(s)");
  }

  return { init };
})();

/* ============================================================
   TestimonialVideos — click-to-play CMS video cards  (v3)
   ------------------------------------------------------------
   Attribute-based. Add these custom attributes in the Designer
   (value can stay empty):
     data-vt-card   → on the card wrapper (.vt-card)
     data-vt-video  → on the <video> in the embed (already there)
     data-vt-play   → on the play button (.vt-play)
     data-vt-thumb  → on the thumbnail image (optional; .vt-thumb
                      class works as fallback for the poster grab)
   Minimal state CSS is injected so the thumbnail/button hide on
   play — see INJECTED STYLES below; delete that block if you'd
   rather own those rules in Webflow / your CSS file.

   Behavior:
   • Thumbnail shows initially; <video> has no src (data-src only)
     → nothing downloads until first click.
   • Click card/button → loads + plays. Click again → pause.
   • Out of viewport while started → pause immediately, reset to
     thumbnail after RESET_AFTER ms (back to 0:00). Coming back
     within the window keeps the paused frame.
   • Starting one card soft-resets any other started card.
   • 'ended' resets right away.

   JS toggles on .vt-card:
     .is-started → thumbnail hidden
     .is-playing → play button hidden
   ============================================================ */
