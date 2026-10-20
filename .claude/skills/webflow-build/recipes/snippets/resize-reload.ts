// Reload the page when the window crosses a Webflow breakpoint, for a page
// whose scroll scene or interaction is built for one layout and can't
// rebuild itself (ScrollTrigger.refresh() isn't enough). A stopgap until
// that animation can follow a resize; never site-wide.
// Snippet: webflow-build recipes/snippets.
//
// Opt in per page: data-reload-on-resize on <body> (page settings, custom
// attribute) or on any element of the page.
//
// No resize listener: one matchMedia query per breakpoint fires only when
// that breakpoint is crossed. Resizing within a breakpoint and the mobile
// address bar showing or hiding never reload. A drag back into the starting
// range within 250 ms cancels the reload.
//
// Webflow's breakpoints; add '(min-width: 1280px)', '(min-width: 1440px)'
// or '(min-width: 1920px)' if the site uses the larger ones.
const QUERIES = ['(max-width: 991px)', '(max-width: 767px)', '(max-width: 479px)'];

export function initResizeReload(): (() => void) | void {
  if (!document.querySelector('[data-reload-on-resize]')) return;
  const lists = QUERIES.map((q) => matchMedia(q));
  const band = () => lists.map((m) => (m.matches ? 1 : 0)).join('');
  const atLoad = band();
  let timer = 0;
  const check = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (band() !== atLoad) location.reload();
    }, 250);
  };
  lists.forEach((m) => m.addEventListener('change', check));
  return () => {
    clearTimeout(timer);
    lists.forEach((m) => m.removeEventListener('change', check));
  };
}
