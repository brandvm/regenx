import { Debug } from "./debug";
import { PageReady } from "./page-ready";
import { Anchors } from "./anchors";

// ============================================
// Tab Deep Link — open a tab from the URL, then scroll its section into view.
//   link to:  /studio#fashion   (or  /studio?tab=fashion )
//   matches   data-tab-id / data-w-tab on the .w-tab-link
//   scroll target: the element carrying data-tab-scroll anywhere inside the
//                  tab's <section> (e.g. your .anchor-extension). If its value
//                  names a real element id, scroll there; otherwise scroll to
//                  the element that carries the attribute. Falls back to .w-tabs.
// ============================================
export const TabDeepLink = (() => {
  const slug = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, "-");

  function wanted() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, "")).split(
      "?"
    )[0];
    if (hash) return slug(hash);
    const q = new URLSearchParams(location.search).get("tab");
    return q ? slug(q) : "";
  }

  function targetLink() {
    const want = wanted();
    if (!want) return null;
    let match = null;
    document.querySelectorAll(".w-tab-link").forEach((link) => {
      if (match) return;
      if (
        slug(link.getAttribute("data-tab-id")) === want ||
        slug(link.getAttribute("data-w-tab")) === want
      ) {
        match = link;
      }
    });
    return match;
  }

  function open() {
    const link = targetLink();
    if (link && !link.classList.contains("w--current")) link.click();
    return link;
  }

  function resolveScrollTarget(link) {
    const tabs = link.closest(".w-tabs");
    const scope = link.closest("section") || tabs || document;

    // marker = the element that carries data-tab-scroll (link, .w-tabs, or
    // anywhere in the section — e.g. your .anchor-extension div).
    const marker =
      (link.hasAttribute("data-tab-scroll") && link) ||
      (tabs && tabs.hasAttribute("data-tab-scroll") && tabs) ||
      scope.querySelector("[data-tab-scroll]");

    if (marker) {
      const id = (marker.getAttribute("data-tab-scroll") || "").replace(
        /^#/,
        ""
      );
      // value names a real element → use it; else scroll to the marker itself
      return (id && document.getElementById(id)) || marker;
    }
    return tabs; // last-resort default: the tabs block
  }

  function scrollIntoView() {
    const link = targetLink();
    if (!link) return;
    const target = resolveScrollTarget(link);
    Debug.log(
      "TabDeepLink.scroll — target:",
      target ? target.id || target.className || "(element)" : "NONE"
    );
    if (target) requestAnimationFrame(() => Anchors.scrollToEl(target, false));
  }

  function init() {
    // open early (behind the preloader)…
    if (window.Webflow?.push) window.Webflow.push(() => open());
    else open();
    // …then, once unlocked, re-confirm the tab and scroll its section in.
    PageReady.ready(() => {
      open();
      scrollIntoView();
    });
    window.addEventListener("hashchange", () => open());
  }

  return { init, open };
})();
