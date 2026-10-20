# Recipe: smooth scroll (GSAP + Lenis)

Use this when a design asks for smooth scrolling, or when GSAP
ScrollTrigger scenes (pins, scrubs) need one shared ticker. It sets up
GSAP once for every module and Lenis on top of it. Under reduced motion,
and in the Designer canvas, there is no Lenis: the page scrolls natively.
The page transition and modal recipes ([barba/](../barba/README.md),
[modal/](../modal/README.md)) take the instance it returns.

## Files

- `gsap.ts`: the one GSAP import, with ScrollTrigger registered, and
  `reducedMotion()`. Every module imports `gsap` from `./gsap`, never from
  `'gsap'`.
- `smooth-scroll.ts`: `initSmoothScroll()` returns the Lenis instance or
  `null`; `releaseWebflowAnchors()` unbinds webflow.js's own anchor scroll.
- `lenis.css`: the Lenis rules (`third-party`), including the
  `.lenis-stopped` lock that `lenis.stop()` relies on.

## Add it to a project

1. Ask before adding packages, then `pnpm add gsap lenis`.
   If Webflow already loads GSAP for the site (Site settings › GSAP, which
   IX3 turns on), the page would run two copies with two tickers. Turn it
   off once no Webflow interaction needs it (conventions.md §16), or until
   then read `window.gsap` in the project's copy and skip bundling it.
2. Copy `gsap.ts`, `smooth-scroll.ts` → `src/modules/`, and the rules in
   `lenis.css` → `src/styles.css` §04 DOCUMENT STATE.
3. In `src/index.ts`, right after the `is-loading` line (Lenis measures the
   page height when it starts, so the lock must be gone):

   ```ts
   const lenis = initSmoothScroll();
   run('anchor-scroll', () => initAnchorScroll(lenis ?? undefined));
   ```

   Same-page anchors are [anchor-scroll](../anchor-scroll/README.md)'s job:
   it glides through Lenis when given the instance and jumps otherwise.
   Pass the instance, never `window.lenis` (a version marker, not the
   instance; `lessons/js.md`).
4. Modules that lock scrolling or scroll the page take `lenis` as an
   argument (`initModals(lenis)`). Every one handles `null`.
5. `pnpm check && pnpm build`, commit `src/` and `dist/`, `package.json`
   and the lockfile.
6. Check on staging, at desktop and phone width: the wheel and trackpad
   glide; a sideways slider or overflow pane scrolls itself under a
   sideways gesture and the page under a vertical one; anchor links land
   below any sticky bar (`pnpm wf:anchors /<page>`); with reduced motion on
   the page scrolls natively and nothing else breaks.

## How it works

- **One ticker.** Lenis is driven from `gsap.ticker` and calls
  `ScrollTrigger.update` on every scroll, so pins and scrubs never lag a
  frame. `lagSmoothing(0)` keeps GSAP from skipping time after a stall.
- **Page height.** Pin spacers change the height after Lenis has measured
  it; every `ScrollTrigger.refresh()` also calls `lenis.resize()`.
- **Nested scrollers.** `allowNestedScroll: true` hands a gesture back to
  any element that can scroll in that direction itself, including ones
  added later, so no `data-lenis-prevent` is needed on each. Use
  `data-lenis-prevent` for an element that must never pass scrolling on (a
  long list inside a modal).
- **`lerp: 0.1`.** Exponential damping, not a duration: 0.1 brings a 400px
  wheel tick to rest in about 1.1 s, 0.2 in about 0.55 s. Raise it if the
  site feels sluggish against native scrolling.
- **Webflow's anchors.** webflow.js scrolls again to the target element a
  moment after any glide (`click.wf-scroll`). It is unbound here and by
  anchor-scroll; `Webflow.ready()` binds it again, so the barba recipe
  calls `releaseWebflowAnchors()` after each re-init.

## Not covered

- Scroll snapping and pinned anchor targets: scroll to the `.pin-spacer`
  and pause snapping during a glide, as `conventions.md` §15 describes.
