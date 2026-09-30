import { Debug } from "./debug";

// ============================================
// Footer Nav — mobile accordion (grid-rows toggle)
//   Columns collapse on mobile; the .g-footer-nav-title <button> toggles
//   .is-open on its .g-footer-nav-item (CSS animates grid-template-rows).
//   Inert on desktop (CSS sets pointer-events:none), where lists stay open.
// ============================================
export const FooterNav = (() => {
  const MOBILE = "(max-width: 767px)"; // keep in sync with the footer CSS
  const SINGLE_OPEN = false; // true = only one column open at a time

  function init() {
    const nav = document.querySelector(".g-footer-nav");
    if (!nav) {
      Debug.log("FooterNav: .g-footer-nav not found — skipped");
      return;
    }

    const btns = Array.from(nav.querySelectorAll(".g-footer-nav-title"));
    if (!btns.length) {
      Debug.log("FooterNav: no .g-footer-nav-title buttons — skipped");
      return;
    }

    const mq = window.matchMedia(MOBILE);

    const setOpen = (item, btn, open) => {
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    };

    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!mq.matches) return; // desktop: lists always open, button inert
        const item = btn.closest(".g-footer-nav-item");
        if (!item) return;
        const willOpen = !item.classList.contains("is-open");

        if (SINGLE_OPEN && willOpen) {
          btns.forEach((other) => {
            const oi = other.closest(".g-footer-nav-item");
            if (oi && oi !== item) setOpen(oi, other, false);
          });
        }
        setOpen(item, btn, willOpen);
        Debug.log(
          "FooterNav: toggle",
          item.getAttribute("aria-label") || "(col)",
          "->",
          willOpen ? "open" : "closed"
        );
      });
    });

    // Leaving mobile → reset, so panels & aria-expanded don't get stuck open
    // when crossing the breakpoint.
    const onChange = (e) => {
      if (!e.matches) {
        btns.forEach((btn) => {
          const item = btn.closest(".g-footer-nav-item");
          if (item) setOpen(item, btn, false);
        });
        Debug.log("FooterNav: left mobile — reset panels");
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange); // older Safari

    Debug.log(
      "FooterNav: init —",
      btns.length,
      "columns | mobile:",
      mq.matches
    );
  }

  return { init };
})();
