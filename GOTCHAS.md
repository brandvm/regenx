# Gotchas

A running log of things that cost time on this project. Agents read it at
the start of every session and add to it when they hit something new (see
the Session protocol in `AGENTS.md`). Never delete an entry — update its
`Status` instead.

Entries tagged `Scope: template-candidate` are harvested across all client
repos to improve `brandvm/wf-template`.

## Entry format

```md
### YYYY-MM-DD · Short title
- Area: designer | css | loader | release | mcp | ci | js | perf
- Scope: project | template-candidate
- Symptom: what was observed
- Cause: why it happened
- Fix: what was done, or the workaround
- Status: open | fixed <sha> | upstreamed wf-template <sha>
- Found by: claude | codex | human
```

## This project

<!-- Add new entries here, newest first. -->

### 2026-09-30 · Public pages requested localhost
- Area: loader
- Scope: template-candidate
- Symptom: Published pages requested `http://localhost:3000/styles.css`.
- Cause: The global Embed shipped a static localhost stylesheet for Designer
  preview.
- Fix: the Embed keeps one static staging link and its script points it at
  the dev server only in Dev mode; `pnpm test` and `pnpm test:webflow`
  assert public pages never request localhost (facf925).
- Status: fixed a66d116
- Found by: claude

### 2026-09-30 · Duplicate viewport and Finsweet Attributes tags
- Area: loader
- Scope: template-candidate
- Symptom: Two viewport tags (one zoom-blocking) and page-level copies of the
  Finsweet Attributes script.
- Cause: Webflow already outputs a viewport tag; the old head added another,
  and each page pasted its own Attributes tag.
- Fix: dropped the extra viewport tag and load Attributes once from the head
  with every attribute used (a66d116); `pnpm test:webflow` fails on more
  than one of either (facf925).
- Status: fixed a66d116
- Found by: claude

### 2026-09-30 · Placeholder content is live on staging
- Area: release
- Scope: project
- Symptom: Timeline preview stages (weeks 12–18, 18–24) and Lorem Ipsum
  benefit cards with unlinked Read More buttons are on staging.
- Cause: Added to demonstrate scrolling/looping (5031afc, a2ceae0); not
  approved treatment information.
- Fix: replace or remove before the first production release (README).
- Status: open
- Found by: human

### 2026-09-30 · A centred Swiper loop needs at least five slides
- Area: js
- Scope: project
- Symptom: Tabs with fewer than five cards cannot run the centred loop.
- Cause: Swiper's centred loop mode needs ≥5 slides.
- Fix: `benefit-slider.js` appends hidden copies of the cards and keeps one
  bullet per authored card; copies are removed on destroy.
- Status: fixed a2ceae0
- Found by: claude

### 2026-09-23 · JS-built UI shows nothing useful on the canvas
- Area: designer
- Scope: project
- Symptom: The therapy timeline ruler and sliders look broken or stacked in
  the Designer.
- Cause: Custom JavaScript never executes on the canvas.
- Fix: a static 0–12 ruler preview exists in Webflow for the Designer; the
  published runtime generates the full ruler (README).
- Status: documented (README)
- Found by: human

### 2026-09-15 · Validation must not fight Webflow's disabled submit button
- Area: js
- Scope: template-candidate
- Symptom: Contact form step navigation and required-field button states
  were wrong.
- Cause: Webflow disables Submit itself for spam protection (Turnstile) and
  pending submissions; toggling `disabled` from validation can unlock it.
- Fix: FormSteps wraps Submit in a disabled `<fieldset>` gate and validates
  required fields and `[data-step-required]` groups per pane.
- Status: fixed 016b678
- Found by: human

### 2026-09-15 · Old CodeSandbox scripts beside the loader double-bind
- Area: loader
- Scope: template-candidate
- Symptom: Duplicate listeners and animations.
- Cause: Leaving `regenx-main.js`, `regenx-wave.js` or `regenx-main.css`
  installed alongside the new loader runs the same features twice (README,
  "Install in Webflow").
- Fix: remove all three CodeSandbox references when installing the snippets;
  the bundle guards against booting twice (`__RGX_BOOTED`, `BV.loading`).
- Status: documented (README)
- Found by: human

### 2026-09-15 · Modules must wait for Webflow to wire tabs and dropdowns
- Area: js
- Scope: template-candidate
- Symptom: Risk of observers and click handlers attaching before Webflow's
  own tab and dropdown setup.
- Cause: Webflow must wire tabs/dropdowns before the bundle's observers and
  click handlers (comment in `src/index.ts`).
- Fix: `src/index.ts` boots via `Webflow.push(boot)` when available.
- Status: fixed bff85c4
- Found by: human

## Known from previous projects

Inherited from `wf-template`. Found across earlier client repos; listed so
they are not rediscovered. Status refers to the template.

### 2026-10-02 · Neutralizers in §03 override Designer styles
- Area: css
- Scope: template-candidate
- Symptom: A style changed in the Designer has no effect on the page.
- Cause: `src/styles.css` loads after `webflow.css`, so the §03 `.w-*` rules
  win same-specificity ties by source order. `.w-layout-blockcontainer
  { max-width }` silently overrode Designer container caps (threestars
  b5f122c); the `.w-dropdown-toggle` reset broke Webflow's chevron spacing
  (reformdd 8c65a5c).
- Fix: reformdd removed ten neutralizers so "Webflow's own defaults now stand
  unopposed" (c2e5f4b). Delete a neutralizer the moment it fights the
  Designer.
- Status: open
- Found by: human

### 2026-10-02 · Root font-size scale drifts from Designer tokens
- Area: css
- Scope: template-candidate
- Symptom: Designer variables named for px values ("Max Width - 1280px")
  render at different sizes; the scale is retuned again and again.
- Cause: The §01 fluid scale sets `:root` font-size, so every rem/em value
  coming out of the Designer scales with it. reformdd retuned it seven times
  (1680 → 1440 → 1680 → clamp → revert → 1920 → 1440); threestars found em
  layout tokens rendering 6.25% short.
- Fix: none general. Agree the scale with the designer before building, or
  drop it and let Webflow variables own sizing.
- Status: open
- Found by: human

### 2026-10-02 · Renaming a Webflow variable silently breaks repo CSS
- Area: css
- Scope: template-candidate
- Symptom: A container cap or token-driven value quietly stops applying.
- Cause: Container/Max Width was renamed to Section/Max Width in Webflow.
  Webflow rewrites its own references but cannot reach this bundle, so
  `var(--_layout---container--max-width, none)` fell back to `none`
  (reformdd 1ca59f6).
- Fix: avoid referencing Webflow variable names in repo CSS; if one is
  needed, log it here so renames get checked.
- Status: open
- Found by: human

### 2026-10-02 · Removing a rule locally does not remove it on the canvas
- Area: designer
- Scope: template-candidate
- Symptom: A deleted CSS rule still applies in the Designer while `pnpm dev`
  runs.
- Cause: The canvas never runs scripts, so both the staging and the
  localhost `<link>` stay live. They are additive; staging's copy of the
  rule remains.
- Fix: push and wait for staging, or temporarily comment out the `bv-css`
  link in the Embed.
- Status: documented (loader.html, AGENTS.md)
- Found by: human

### 2026-10-02 · Static localhost link is requested by public visitors
- Area: loader
- Scope: template-candidate
- Symptom: Published pages request `http://localhost:3000/styles.css`; can
  block render and trigger Chrome's local-network-access prompt.
- Cause: The canvas Embed carries a static localhost `<link>` so the
  Designer can see local CSS; the script that removes it runs after the
  browser has already started the request.
- Fix: reformd e9f81ab and regenx a66d116 removed the static link
  independently and create it from script only in dev mode. Trade-off: the
  canvas then shows staging CSS only.
- Status: open in template
- Found by: human

### 2026-10-02 · VER lives in two snippets and a placeholder 404s at launch
- Area: release
- Scope: template-candidate
- Symptom: Prod CSS and JS both 404 the moment a custom domain is attached.
- Cause: `VER = "X.Y.Z"` is never exercised on `*.webflow.io`, and a release
  must bump VER in both the Embed and the footer snippet.
- Fix: regenx keeps one `RELEASE` value in the head config (`null` until the
  first tag) that the other snippets read.
- Status: open
- Found by: human

### 2026-10-02 · The add -f dist / untrack release ritual is error-prone
- Area: release
- Scope: template-candidate
- Symptom: Empty release tags, re-cut versions, `dist/` swept into unrelated
  commits.
- Cause: `dist/` is gitignored except in release commits. terawulf re-cut
  v1.1.1 with a tree identical to v1.1.0.
- Fix: brandvm, adaria and nexplan commit `dist/` permanently and fail CI on
  `git diff --exit-code -- dist`.
- Status: open
- Found by: human

### 2026-10-02 · One throwing module leaves the page scroll-locked
- Area: js
- Scope: template-candidate
- Symptom: Page stays locked, or later modules never initialise.
- Cause: `src/index.ts` runs modules as a chain.
- Fix: reformdd and brandvm wrap each init in `run(name, init)` with
  try/catch; the template only has `finally` around the lock release.
- Status: partly fixed
- Found by: human

### 2026-10-02 · CDN `defer` scripts cannot be ordered against the bundle
- Area: js
- Scope: template-candidate
- Symptom: Lenis, GSAP or Finsweet is undefined when a module runs.
- Cause: The footer loader appends the bundle dynamically (async), so a
  sibling `<script defer>` has no ordering promise.
- Fix: bundle libraries with `pnpm add`. Do not also load Webflow's own GSAP
  or jQuery a second time.
- Status: documented
- Found by: human

### 2026-10-02 · Webflow's anchor scroll ignores a sticky header
- Area: js
- Scope: project
- Symptom: Same-page hash links land under a sticky nav.
- Cause: Webflow's scroll module offsets only for `position: fixed` headers
  and never reads `scroll-margin-top`.
- Fix: threestars `anchor-scroll.ts` unbinds `click.wf-scroll` and measures
  `--nav-h` from the nav.
- Status: project pattern
- Found by: human
