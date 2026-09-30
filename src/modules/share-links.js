// ============================================
// Share Links — email sharing for product and article pages.
//   [data-share="email"] gets a mailto: link with the page title and URL.
//   Optional data-share-url / data-share-title override either value.
//   Finsweet's fs-socialshare handles the social networks.
// ============================================
export const ShareLinks = (() => {
  function init() {
    const links = document.querySelectorAll("[data-share='email']");
    if (!links.length) return;

    const canonical = document.querySelector('link[rel="canonical"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const pageUrl = canonical ? canonical.href : window.location.href;
    const pageTitle = ogTitle ? ogTitle.content : document.title;

    links.forEach((el) => {
      const url = el.getAttribute("data-share-url") || pageUrl;
      const title = el.getAttribute("data-share-title") || pageTitle;
      const body = encodeURIComponent("Thought you might find this useful:") +
        "%0D%0A%0D%0A" + encodeURIComponent(title) +
        "%0D%0A" + encodeURIComponent(url);
      el.setAttribute("href", `mailto:?subject=${encodeURIComponent(title)}&body=${body}`);
    });
  }

  return { init };
})();
