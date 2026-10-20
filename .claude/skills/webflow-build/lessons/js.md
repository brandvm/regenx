# Lessons: JavaScript modules

Modules, GSAP, Lenis, Barba, Finsweet and Webflow's own scripts.

Harvested from client builds made from this template (`Scope:
template-candidate` entries in their `GOTCHAS.md`). Module and file names
refer to the project the lesson came from; Status is that project's.

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
  (`data-wf-page`, `Webflow.destroy()` / `ready()`, IX2); Turnstile then
  logs "already has been loaded" — harmless.
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
- Fix: an earlier project's `anchor-scroll.ts` unbinds `click.wf-scroll` and measures
  `--nav-h` from the nav.
- Status: project pattern
- Found by: human
