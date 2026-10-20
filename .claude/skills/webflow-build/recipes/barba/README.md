# Recipe: page transitions with Barba

Use this when a design animates between pages. Barba fetches the next page
and swaps only the container, so everything a full load does for free has
to be done again after each swap: Webflow's forms, Turnstile, dropdowns
and IX2, the `<head>` tags, the nav's current link, focus, the analytics
page view, and every page module. This is that skeleton with a plain
cross-fade; the design's own transition replaces `leave()` and `enter()`.

## Files

- `transition.ts`: `initTransition()`, the Barba hooks and the default
  transition.
- `pages.ts`: `definePages()` runs page modules per page and tears them
  down when it leaves.
- `barba.d.ts`: types for the part of Barba used (the package's own
  `types` path is not published).

It builds on [smooth-scroll](../smooth-scroll/README.md) (`gsap.ts`,
`smooth-scroll.ts`) and, for anchors, [anchor-scroll](../anchor-scroll/README.md).

## Add it to a project

1. Ask before adding packages, then `pnpm add @barba/core` (and the
   smooth-scroll recipe's `gsap lenis` if they aren't there yet).
2. Copy `transition.ts`, `pages.ts` → `src/modules/`; `barba.d.ts` →
   `src/`.
3. Split `src/index.ts` into global and page modules:

   ```ts
   function boot() {
     document.documentElement.classList.remove('is-loading');
     // Global: once per visit, outside the Barba container.
     run('environment-switcher', initEnvironmentSwitcher);
     const lenis = initSmoothScroll();
     run('anchor-scroll', () => initAnchorScroll(lenis ?? undefined));
     run('nav', initNav);

     // Page: again on every page.
     const pages = definePages([
       ['aria-roles', initAriaRoles],
       ['placeholders', initPlaceholders],
       ['unique-form-ids', initUniqueFormIds],
       ['modal', () => initModals(lenis)],
       // Finsweet last; resetFinsweet() when a page leaves.
       ['finsweet', initFinsweet],
     ], { onDestroy: resetFinsweet });
     pages.initPage();

     run('transition', () => {
       initTransition({
         ...pages,
         lenis,
         beforeLeave: closeNavMenu,
         afterSwap: () => {
           refreshNav();
           initAnchorScroll(lenis ?? undefined); // lands on a #hash
         },
       });
     });
   }
   ```

   A page module that leaves something GSAP and the recorded listeners
   don't cover (an observer, a timer, a node on `<body>`) returns a
   cleanup function; the modal and snippet modules already do.
4. In Webflow (conventions.md §1 already has the shell):
   `data-barba="wrapper"` on G | Page W, `data-barba="container"` and
   `data-barba-namespace="<page>"` on G | Main W, with the footer inside it.
   Nav and anything else outside the container stay for the whole visit.
   `data-barba-prevent` on a link (or a parent) that must load in full.
5. GTM: a Custom Event trigger on `virtual_page_view` (or a History Change
   trigger, and remove `pushPageView()`).
6. `pnpm check && pnpm build`, commit `src/`, `dist/`, `package.json` and
   the lockfile.
7. Check on staging, arriving by transition and not only on a direct load:
   - `pnpm wf:transitions / /<page> /<page>`: "full loads" stays 1, and
     page height and pin spacers don't grow round after round;
   - a form reached by a transition shows its Turnstile check and submits
     (headless can't get a token: submit in a real browser);
   - the nav marks the new page current; view source of `<head>` in
     DevTools shows the new page's description and `og:` tags;
   - a link to `/<page>#section` lands on the section; Back and Forward
     work;
   - with a screen reader the new page's title is announced and focus is
     on `<main>`; with reduced motion the swap is instant.

## How it works

- **First load.** Barba runs the global enter hooks on the first load too;
  each returns early when there is no current container. `once` does
  nothing, so the browser's jump to an arriving `#hash` stands.
- **The `prevent` rule** (true = a full load): other origins, the
  `/design` pages (no wrapper), same-page `#` links (anchor-scroll's),
  downloads, and anything inside `[data-barba-prevent]`. Barba itself
  skips `target="_blank"`, `mailto:` and `tel:`.
- **The hash.** Barba pushes the URL without the clicked link's `#hash`; a
  capture-phase click listener remembers it and `afterEnter` puts it back
  before `afterSwap` scrolls to it.
- **`<head>`.** Barba swaps `<title>` only. `syncHead()` replaces
  description, robots, `og:`, `twitter:`, canonical and JSON-LD with the
  next page's. Crawlers load pages in full, so this is for share sheets,
  tag managers and tools that read the live DOM.
- **Current links.** Webflow writes `w--current` and
  `aria-current="page"` at publish time on links to the page's own path
  with no hash. `syncCurrentLinks()` applies that rule to every link
  outside the new container.
- **Webflow re-init.** `data-wf-page` is copied from the next page, then
  `Webflow.destroy()`, `ready()` and `require('ix2').init()`. Turnstile:
  the old page's widgets are removed before it leaves, and
  `$(document).trigger('ready')` makes webflow.js render the new forms'
  widgets (it waits for that event, which jQuery 3 never fires; without
  this every submit stays disabled). "Turnstile already has been loaded"
  in the console afterwards is harmless. IX3 has no public re-init: a
  site with page transitions moves its motion off IX3 (conventions.md §16).
- **Page modules.** The old container is removed first: Barba removes it
  only after `afterEnter`, and until then a module's
  `document.querySelector` finds the leaving page's elements. `pages.ts`
  runs the modules inside one `gsap.context`
  (reverting it kills their tweens, ScrollTriggers and `matchMedia`) and
  records the `window` and `document` listeners they add while starting.
  Then `ScrollTrigger.sort()` and `refresh()`: pins are measured in the
  order modules create them, so a pin created first but placed lower is
  measured without the spacer of the one above it.
- **Focus.** Focus moves to the `#hash` target or `<main>` without
  scrolling (a `tabindex="-1"` element draws no ring under
  `:focus-visible`), and the title is announced in a polite live region on
  `<body>`.

## Not covered

- **The transition itself.** Keep the hooks and replace `leave()` /
  `enter()`. For two pages on screen at once (a slide over, an image
  growing into the next hero) set `sync: true`, fix the next container in
  place during `enter`, and clear it after. A rule that picks a transition
  by link (`custom`) goes inside `to` or `from`: at the root it is
  ignored when either is set (`lessons/js.md`).
- **Global modules** (nav, cursor) need their own refresh after a swap,
  called from `afterSwap`.
- **Webflow Tabs, Slider and Lightbox** come back with `Webflow.ready()`;
  a third-party library that binds once (Finsweet) needs its reset.
