# Lessons: JavaScript modules

Modules, GSAP, Lenis, Barba, Finsweet and Webflow's own scripts.

Harvested from client builds made from this template (`Scope:
template-candidate` entries in their `GOTCHAS.md`). Module and file names
refer to the project the lesson came from; Status is that project's.

### 2026-10-16 · Barba: forms dead after a page change; stale head and current links
- Area: js
- Symptom: comparing a direct load with arriving by transition:
  - every form reached by a transition had no Turnstile widget, so Webflow
    kept its submit disabled for good; the console showed "Turnstile
    already has been loaded" and "Cannot find Widget …";
  - links outside the container (nav, floating nav, menu sheet) kept the
    first page's `w--current` / `aria-current="page"`;
  - meta description, Open Graph, Twitter, robots and JSON-LD stayed the
    first page's (Barba swaps only the container and `<title>`).
- Cause: webflow.js renders a form's Turnstile widget from
  `$(document).on("ready")` whenever `turnstile` is already defined, and
  jQuery 3 never fires that event again; on a full load the script's
  onload is used instead, so only swaps break. Webflow writes current
  states at publish time, so they don't follow Barba.
- Fix: in the transition module: `beforeLeave` removes the old page's
  widgets (`turnstile.remove`); the re-init clears
  `$(document).off("ready")`, runs `Webflow.destroy()` / `ready()` / IX2,
  then fires `$(document).trigger("ready")` once, so each widget renders as
  its form nears the viewport, as on a direct load. `syncCurrentLinks()`
  applies Webflow's rule (same path, no hash) to every link outside the
  container; `syncHead()` copies the page-specific head tags from the next
  page. For accessibility, `focusPage()` moves focus to the #hash target
  or `<main>` without scrolling and announces the new title in a polite
  `.sr-only` live region (the clicked link is gone after a swap). The
  "already loaded" warning stays (webflow.js re-adds the script on every
  `ready()`). Token and submit can't be checked headless or in a hidden
  browser pane: confirm a real submit in a normal browser.
- Status: fixed in that project's repo
- Found by: claude

### 2026-10-16 · Pins created out of page order are measured in the wrong place
- Area: js
- Symptom: after a horizontal timeline section (pinned) moved below
  another pinned section, scrolling into it showed an empty screen; the
  timeline appeared later, near the end of its pin.
- Cause: ScrollTrigger measures pins in creation order. The timeline's
  module ran before the other section's module in the manifest, so its
  start was calculated before the pin above it had added its spacer.
- Fix: `src/index.ts` calls `ScrollTrigger.sort()` and then `refresh()`
  once all page modules have started, so pins are measured top to bottom
  whatever order the modules run in.
- Status: fixed in that project's repo
- Found by: claude

### 2026-10-13 · Barba ignores a root `custom` rule when `to` or `from` is set
- Area: js
- Symptom: some links felt dead: nothing moved for about a second, then
  the page changed. A rule "zoom only from an image at least half on
  screen" had no effect.
- Cause: in Barba 2.10.3's `resolve`, each rule is checked on the
  transition root and then on `to` / `from`, and the second result
  overwrites the first. A transition with `custom` at the root and
  `to: { namespace }` therefore matched on namespace alone, so an image
  zoom ran with no image.
- Fix: put `custom` inside `to` (`to: { namespace, custom }`) and type
  `src/barba.d.ts` to allow it. Check that a plain link gets the default
  transition and only the intended trigger gets the special one.
- Status: fixed in that project's repo
- Found by: human + claude

### 2026-10-13 · iOS Low Power Mode refuses autoplay and Safari paints a play glyph
- Area: js
- Symptom: on an iPhone in Low Power Mode the muted, looping hero video
  stayed on its poster with Safari's own play and skip glyphs painted over
  it; nothing in the console.
- Cause: Low Power Mode (and data saver modes) refuse autoplay: `play()`
  rejects with `NotAllowedError`, which the module swallowed. A video
  without `controls` still gets Safari's native start-playback overlay,
  and with `pointer-events: none` on the video it can't even be tapped.
- Fix: use `recipes/video/`. It keeps the poster, remembers videos whose
  `play()` was refused with `NotAllowedError`, and retries them on the
  visitor's first `touchend`, `click` or `keydown` (capture phase, once).
  Repo CSS hides `::-webkit-media-controls`, `-panel`,
  `-start-playback-button` and `-overlay-play-button` on
  `video:not([controls])`. Test on a real iPhone with Low Power Mode on;
  simulators and desktop Safari autoplay normally.
- Status: recipe in the template (`recipes/video/`)
- Found by: human + claude

### 2026-10-13 · Testing local code in the built-in browser pane
- Area: js
- Symptom: the environment switcher on staging loaded the staging bundle,
  not localhost (`ERR_BLOCKED_BY_CLIENT` on `http://localhost:3000/…`).
  With the browser pane hidden, GSAP timelines, CSS animations and
  IntersectionObserver callbacks didn't advance, so a transition sampled
  from script looked frozen and a keyframe sat on its first frame.
- Cause: the Claude desktop browser pane blocks a public page from
  requesting localhost, and a hidden pane gets no animation frames.
- Fix: for logic checks, save the staging HTML, point the loader's
  staging URL at a local static server holding `dist/` (an absolute URL:
  the loader passes it to `new URL()`) and open that. Class toggles and
  layout can be read while the pane is hidden; anything that moves needs
  the pane visible, or a check on staging by a person.
- Status: documented
- Found by: claude

### 2026-10-09 · Moving off IX3: decode the published interactions, then replay them
- Area: js
- Symptom: rebuilding IX3 motion by eye drifts from the approved timing,
  and the MCP's interaction tool isn't needed to read it.
- Cause/fix: the published site ships every IX3 interaction and timeline
  in `webflow.achunk.*.js` (find the chunk containing `"i-` ids; the
  `[{id:"i-…"}]` and `[{id:"t-…"}]` arrays are plain JS literals). Decode
  them once to JSON and generate a spec; a small module replays it with
  bundled GSAP + ScrollTrigger + SplitText + CustomEase. Details that
  matter for a faithful replay:
  - eases are indexes into IX3's table (`"none","power1.in","power1.out",
    "power1.inOut",…`; 3 = power1.inOut, 6 = power2.inOut, 12 =
    power4.inOut); custom eases are SVG paths in a 160 box (y down);
  - most triggers have `clamp: true` → `start: "clamp(top bottom)"`;
  - **no ease** on a step means GSAP's default `power1.out`, not linear;
  - `tt`: 0 to, 1 from, 2 fromTo, 3 set; `null` = current value; no
    `position` = append;
  - `conditionalPlayback` `dont-animate` per breakpoint → `matchMedia`;
  - IX3's SplitText uses `span`s with `gsap_split_word/letter/line`
    classes, splits words as inline blocks (no line break at hyphens) and
    **keeps the split** after the reveal — the live line breaks and page
    heights depend on that, so match it.
  Load interactions (hero, page header) are better as CSS `@keyframes`
  gated on `html:not(.w-mod-ix3)`: they start at first paint instead of
  after IX3's `visibility:hidden` gate (the main mobile LCP cost). Bundled
  GSAP never overwrites Webflow's `window.gsap` (it only installs when none
  exists), so the module can stay off while `window.gsap !== gsap` — no
  double animation before the cutover. Build timelines lazily
  (IntersectionObserver one screen ahead) and batch one
  `ScrollTrigger.refresh()` after each build. Verifying by blocking IX3 on
  staging with Playwright is only approximate: Webflow also writes IX3
  start styles inline, so check the real cutover on staging by eye.
- Status: code done in the project; cutover pending
- Found by: claude

### 2026-10-09 · Finsweet recipe: keep it out of index.js
- Area: js, perf
- Symptom: following `recipes/finsweet`, List + Custom Select + Social
  Share added ~118 KB to `index.js`, so every page paid for attributes used
  on two.
- Cause: the registry's `import()`s are inlined in the single IIFE bundle;
  importing the registry anywhere in index.js (even for its keys) pulls all
  of Finsweet in.
- Fix: a second esbuild entry (`src/fs-bundle.ts` → `dist/fs-bundle.js`)
  that runs `initFinsweet()`, and a tiny loader in index.js that checks for
  `[fs-<name>-element]` (names as a literal list, kept in step by a test)
  and appends `<script src>` with the same base and query as index.js, so
  each release loads its matching version. Guard: do nothing while a
  Finsweet CDN `<script>` is still on the page, or both copies initialise
  the same elements during the migration. v1 (`fs-cmsload/cmsfilter/
  cmssort`) markup has to be renamed to v2 `fs-list-*` in Webflow.
- Status: fixed in the project; recipe not updated
- Found by: claude

### 2026-10-06 · Finsweet Combo Box 2.7.1 differs from its docs
- Area: js
- Symptom: With the bundled `@finsweet/attributes@2.7.1` (an earlier
  project's pattern), Combo Box threw `Cannot read properties of null (reading
  'style')` and rendered no options. Once fixed, the options showed in a
  different order from the select.
- Cause: read from the 2.7.1 source (`dist/src-42KUKVDL.js`):
  - it reads `window.FinsweetAttributes.modules`, which an earlier project's List
    shim doesn't create;
  - `fs-combobox-element` only knows `dropdown`, `label`, `clear` and
    `empty`. The input, select and option template are found by position
    (first `input` and `select` in the Dropdown, first `a` in the list), so
    the docs' `text-input` / `select` / `option-template` values do nothing;
  - the `clear` element is required: without it init crashes;
  - options are sorted by `value` (`localeCompare`), not by the select's
    order.
- Fix: `src/modules/finsweet.ts` creates `modules` as well as `scripts`
  and loads both distributions with `import()` (List registers a CSS
  property at evaluation, which threw when a test evaluated the bundle
  twice). Give every Combo Box a clear element. Order options by choosing
  values that sort the way they should read. Combo Box sets the hidden
  select and fires `input` + `change`, so a select with
  `fs-list-element="sort-trigger"` drives List Sort (checked in a harness
  page: all four sorts reorder the list).
- Status: open
- Found by: claude

### 2026-10-06 · Webflow images publish with srcset; swapping src does nothing
- Area: js
- Symptom: a tabs module changed `src` on an image, but the photo on
  staging stayed the same.
- Cause: Webflow publishes every asset image with `srcset` and `sizes`
  (`-p-500` … `-p-2000` variants); the browser picks from `srcset` and
  ignores a new `src`.
- Fix: the module removes `srcset` and `sizes` before setting `src`.
  Any module that swaps a Webflow image must do the same (or set a new srcset).
- Status: fixed in that project's repo
- Found by: claude

### 2026-10-06 · Arriving at /#section lands short of the section
- Area: js
- Symptom: following /#section from another page landed about 5000px short,
  inside an earlier pinned section, and a section's counters never ran. A
  click on the same link within the page worked.
- Cause: the browser and webflow.js jump to the hash before the modules add
  their pins; the pin spacers then push every later section down. Separately,
  a ScrollTrigger refresh or jump renders a scrubbed timeline with callbacks
  suppressed, so counters written from a tween's `onUpdate` stay at 0.
- Fix: `smooth-scroll.ts` jumps to the hash again after the manifest has run
  and after load (`ScrollTrigger.refresh()` first, nav offset applied).
  The pinned scene's module also copies the counter state to the text in the
  trigger's onRefresh / onUpdate / onScrubComplete. Write values a scrubbed
  timeline animates from the trigger as well, never only from a child
  tween's callback.
- Status: fixed in that project's repo
- Found by: human + claude

### 2026-10-06 · gsap.from() start state reverts on load: hero flickers
- Area: js
- Symptom: on load the hero chip, heading, text, button and card showed at
  full opacity for 150–550 ms, then vanished and faded in again.
- Cause: `gsap.from()` applies its start values through a lazy zero-duration
  tween; on the next tick its render reverts the styles (traced to
  `_revertStyle` from `_lazyRender`), so each item sat in its final state
  until its staggered start. `html.is-loading` had already been removed, so
  that state painted.
- Fix: `gsap.set(items, start)` then `gsap.to(items, end)` in hero-intro.ts.
  set() renders synchronously in the boot task that removes is-loading, so no
  frame shows the items before the reveal. Prefer set() + to() for anything
  visible at load.
- Status: fixed in that project's repo
- Found by: human + claude

### 2026-10-06 · Barba: first-load hooks, lost hash, missing types
- Area: js
- Symptom: with Barba 2.10.3 added, a direct load of the home page couldn't
  scroll (document height 900px); a cross-page `/#section` link landed at
  the top; `tsc` couldn't find Barba's types.
- Cause:
  - Barba runs the global `beforeEnter` / `enter` / `afterEnter` hooks on
    first load as well. The Osmo boilerplate's `beforeEnter` sets the
    container `position: fixed` for the swap, and on first load nothing
    clears it;
  - Barba pushes the next URL without its hash and `data.next.url` doesn't
    carry it;
  - the package's `"types"` points at `dist/core/src/typings`, which isn't
    published.
- Fix: the swap hooks return early when there is no current container
  (`isSwap`); a capture-phase click listener remembers the clicked link's
  hash and `afterEnter` restores it before `jumpToHash()`; `src/barba.d.ts`
  declares the API we use.
- Status: fixed in that project's repo
- Found by: claude

### 2026-10-06 · Page modules torn down per Barba page
- Area: js
- Symptom: page modules were written for one full load (document queries,
  window listeners, pins), so a swapped-in page would stack triggers and
  listeners.
- Cause: Barba replaces only the container.
- Fix: `src/index.ts` runs page modules inside a `gsap.context` (reverts
  their tweens, ScrollTriggers and matchMedia) and records the window and
  document listeners they add while starting, then removes both on
  `afterLeave`; the lightbox dialog on `<body>` is removed too. Checked: 3
  round trips between two pages keep 3 pin spacers and the same
  page height, and every scene still runs. Global modules (Lenis, nav) run
  once and expose refresh hooks. Webflow is re-initialised after each swap
  (`data-wf-page`, `Webflow.destroy()` / `ready()`, IX2). Correction
  (2026-10-16): Turnstile then logs "already has been loaded". The warning
  itself is harmless, but it hid a real fault: forms reached by a
  transition get no widget and stay disabled, and head tags and current
  links stay the first page's. See "Barba: forms dead after a page
  change; stale head and current links".
- Status: fixed in that project's repo
- Found by: claude

### 2026-10-06 · Anchors to pinned sections land at the end of the pin
- Area: js
- Symptom: from further down the page, a link to a pinned section scrolled
  to its start, then jumped 1260px further (the end of its pin). Cross-page
  anchors also left a strip of the previous section above the target.
- Cause:
  - webflow.js has its own same-page anchor handler (`click.wf-scroll`):
    a moment after our Lenis glide it scrolled again, to the pinned
    element's current position, which is the end of its pin. It's bound
    again by every `Webflow.ready()`;
  - scrolling to a pinned element instead of its `.pin-spacer` has the same
    effect;
  - the anchor offset still subtracted the nav height, though the bar now
    scrolls away.
- Fix: `releaseWebflowAnchors()` unbinds `click.wf-scroll` at init, on load
  and after each Barba re-init; anchors scroll to the pin spacer's top with
  no offset (designer); the timeline snap stands down during an anchor glide
  and clamps its value. Checked same-page, cross-page and after a
  transition at three widths.
- Status: fixed in that project's repo
- Found by: human + claude

### 2026-10-02 · One throwing module leaves the page scroll-locked
- Area: js
- Symptom: Page stays locked, or later modules never initialise.
- Cause: `src/index.ts` runs modules as a chain.
- Fix: two projects wrapped each init in `run(name, init)` with
  try/catch; the template only has `finally` around the lock release.
- Status: fixed in the template — run(name, init) isolates each module; the lock is released before modules run; the head timeout no longer waits for load
- Found by: human

### 2026-10-02 · CDN `defer` scripts cannot be ordered against the bundle
- Area: js
- Symptom: Lenis, GSAP or Finsweet is undefined when a module runs.
- Cause: The footer loader appends the bundle dynamically (async), so a
  sibling `<script defer>` has no ordering promise.
- Fix: bundle libraries with `pnpm add`. Do not also load Webflow's own GSAP
  or jQuery a second time.
- Status: documented
- Found by: human

### 2026-10-02 · Webflow's anchor scroll ignores a sticky header
- Area: js
- Symptom: Same-page hash links land under a sticky nav.
- Cause: Webflow's scroll module offsets only for `position: fixed` headers
  and never reads `scroll-margin-top`.
- Fix: use `recipes/anchor-scroll/`. It unbinds `click.wf-scroll` (again
  after every `Webflow.ready()`), scrolls through Lenis, and offsets by the
  larger of `scroll-margin-top` and any sticky or fixed bar pinned above
  the target that overlaps it horizontally (a sticky side nav must not
  count), measured with a ResizeObserver, never a hard-coded nav height.
  Don't add a second hash-link handler beside it. Three projects wrote
  their own before the recipe existed.
- Status: recipe in the template (`recipes/anchor-scroll/`)
- Found by: human

### 2026-09-28 · `window.lenis` is a version marker, not the instance
- Area: js
- Symptom: a card's popup did nothing and the page silently
  scroll-locked.
- Cause: the scroll lock probed `window.lenis`, but Lenis sets
  `window.lenis = { version }` itself, so the probe was always truthy and
  `.stop()` threw "stop is not a function" after `aria-hidden` and the
  lock were set but before the modal was shown.
- Fix: pass the Lenis instance into any module that needs it (as the nav
  module does); never look it up on `window`.
- Status: fixed in that project's repo
- Found by: claude

### 2026-09-14 · GSAP `.from()` animates to the current value: items stranded at 0
- Area: js
- Symptom: footer accordions on mobile opened to full height with
  invisible links.
- Cause: `.from()` takes the element's current value as its end value. An
  earlier timeline had left the items at opacity 0, so the new tween
  animated 0 → 0. (A throw in one module also stopped later inits; see
  "One throwing module leaves the page scroll-locked".)
- Fix: state both ends (`fromTo()`, or `set()` + `to()`, as in
  "gsap.from() start state reverts on load") for any tween that can run
  more than once or after another animation on the same elements, and clip
  inside the panel itself.
- Status: fixed in that project's repo
- Found by: claude

### 2026-10-08 · A consent manager blocks the dynamically inserted bundle
- Area: js, loader
- Symptom: behaviour from the bundle worked after cookie consent but
  failed on another page or in a fresh browser before consent: the CSS
  loaded, `index.js` was never requested.
- Cause: the consent manager (Iubenda) blocks scripts it doesn't know are
  essential, including ones created by another script. The site's old
  script tags carried its exemption attribute (`data-cmp-ab="2"`); the
  new footer loader didn't, so the whole bundle was treated as a
  consent-dependent script.
- Fix: mark the inline footer loader itself with the consent manager's
  allow attribute (for Iubenda `data-cmp-ab="2"`), so scripts it creates
  are exempt too, and set the same attribute on each script it appends.
  When a site has a consent manager, test the bundle in a fresh private
  window before consenting, on more than one page.
- Status: fixed in that project's loader
- Found by: codex

### 2026-10-16 · HubSpot forms with CAPTCHA must use the embed
- Area: js
- Symptom: the plan was the designed Webflow form posting to HubSpot's
  Forms API, but the client's form has CAPTCHA on, which the submit
  endpoints refuse. The embed then rendered the themed form inside an
  iframe, out of reach of page CSS, and changes made in `onFormReady`
  (placeholders, a custom button) vanished.
- Cause: themed HubSpot forms render in a same-origin, srcless iframe;
  the form is a React app that re-renders after `onFormReady` and may
  replace the form element it passed. HubSpot's theme selectors beat
  plain class rules.
- Fix: keep the HubSpot embed for any form with CAPTCHA. A module loads
  it near the viewport, writes the design's CSS into the iframe (every
  declaration `!important`, sizes relative to the iframe root), and
  re-applies its DOM changes (placeholders from labels, a designed button
  that clicks HubSpot's hidden submit, the reCAPTCHA disclosure) from a
  MutationObserver, always on the live `form.hs-form`. Test with headless
  Playwright: a hidden browser pane never fires IntersectionObserver.
- Status: fixed in that project's repo
- Found by: claude

### 2026-10-12 · A WebGL context created before the first paint delays it
- Area: js, perf
- Symptom: Lighthouse mobile showed an observed first paint at 2.1 s with
  0 ms blocking time; desktop was fine.
- Cause: a hero shader created its WebGL context and compiled during
  boot. Where the GPU is emulated (headless Chrome, lab tests) that work
  holds back the first frame without showing as main-thread time.
- Fix: a canvas on screen at load starts after `load`, two animation
  frames and idle time, with a still image as the first paint; canvases
  further down start near the viewport. Observed first paint went to
  0.26 s.
- Status: fixed in that project's repo
- Found by: claude
