import { Debug } from "./debug";
import { PageReady } from "./page-ready";

// ============================================
// Anchors — make hash links work with the preloader + Lenis
// ============================================
export const Anchors = (() => {
  const HEADER_OFFSET = 0; // your .anchor-extension divs already offset for the nav

  const getById = (id) => {
    if (!id) return null;
    try {
      return document.getElementById(id);
    } catch (_) {
      return null;
    }
  };

  function scrollToEl(el, smooth) {
    if (!el) return;
    const hasLenis = !!window.lenis;
    if (hasLenis) {
      // Lenis measured its scroll limit while the page was locked, so refresh
      // its dimensions before scrolling or the jump gets clamped to 0.
      if (typeof window.lenis.resize === "function") window.lenis.resize();
      Debug.log(
        "scrollToEl ->",
        smooth ? "smooth" : "jump",
        "| via: lenis | limit:",
        window.lenis.limit
      );
      window.lenis.scrollTo(el, { offset: HEADER_OFFSET, immediate: !smooth });
    } else {
      Debug.log("scrollToEl ->", smooth ? "smooth" : "jump", "| via: native");
      el.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  }

  function landing() {
    const id = decodeURIComponent(
      (location.hash || "").replace(/^#/, "")
    ).split("?")[0];
    const el = getById(id);
    Debug.log(
      "Anchors.landing — hash:",
      location.hash || "(none)",
      "| id:",
      id || "-",
      "| element found:",
      !!el,
      "| lenis:",
      !!window.lenis
    );
    if (el) requestAnimationFrame(() => scrollToEl(el, false));
  }

  function onClick(e) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;

    const a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    if (a.classList.contains("w-tab-link") || a.closest(".w-tab-menu")) return;

    let url;
    try {
      url = new URL(a.href, location.href);
    } catch (_) {
      return;
    }
    if (url.pathname !== location.pathname || url.search !== location.search)
      return;

    const id = decodeURIComponent(url.hash.replace(/^#/, ""));
    const el = getById(id);
    if (!el) return;

    e.preventDefault();
    Debug.log("Anchors.onClick — intercept #", id);
    scrollToEl(el, true);
    history.pushState(null, "", "#" + id);
  }

  function init() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    document.addEventListener("click", onClick);
    PageReady.ready(landing);
  }

  return { init, landing, scrollToEl };
})();
