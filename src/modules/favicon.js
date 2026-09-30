import { Debug } from "./debug";

// ============================================
// Favicon — staging override.
//   On *.webflow.io only, replace the production favicon with a staging one.
//   On staging, follow the OS color scheme: LIGHT is the default, DARK swaps
//   in when prefers-color-scheme: dark. Production is left untouched.
//   Update the two URLs below with your uploaded staging favicon assets.
// ============================================
export const Favicon = (() => {
  const LIGHT =
    "https://cdn.prod.website-files.com/6a343f4bd4c8ed2f7270a980/6a355aa385fb38285173da47_Favicon%20Staging.svg"; // default
  const DARK =
    "https://cdn.prod.website-files.com/6a343f4bd4c8ed2f7270a980/6a355aecc4e3d18c324d3dfd_Favicon%20Staging%20Light.svg";

  function setFavicon(href) {
    // Remove every existing icon link Webflow injected.
    document
      .querySelectorAll(
        'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
      )
      .forEach((el) => el.parentNode && el.parentNode.removeChild(el));

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = href + "?v=" + Date.now(); // cache-bust so the swap is visible
    document.head.appendChild(link);
  }

  function init() {
    if (!location.hostname.endsWith(".webflow.io")) {
      Debug.log("Favicon: not a staging host — production favicon kept");
      return;
    }

    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = darkQuery.matches;
      Debug.log("Favicon: staging host — applying", dark ? "DARK" : "LIGHT");
      setFavicon(dark ? DARK : LIGHT);
    };

    apply();

    // Live swap if the user toggles OS theme while on the page.
    if (darkQuery.addEventListener) {
      darkQuery.addEventListener("change", apply);
    } else if (darkQuery.addListener) {
      darkQuery.addListener(apply); // older Safari
    }
  }

  return { init };
})();
