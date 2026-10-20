# Lessons: Loader, release and CI

The three snippets, releases with jsDelivr tags, and the CI checks.

Harvested from client builds made from this template (`Scope:
template-candidate` entries in their `GOTCHAS.md`). Module and file names
refer to the project the lesson came from; Status is that project's.

### 2026-10-02 · Filling in REPO in loader.html breaks the browser tests
- Area: ci
- Symptom: The first push after setup fails `pnpm test` with
  `Expected: "https://<org>.github.io/wf-example/"`, `Received:
  ".../<repo>/"`, so staging never deploys.
- Cause: `tests/environment-switcher.spec.mjs` replaced the `REPO`
  placeholder with `wf-example` and hardcoded that name in `stage` and
  `release`. The README checklist tells every project to fill in `REPO`,
  so the replacement no longer happens and the hardcoded URLs no longer
  match the bundle's.
- Fix: the test reads the repo name back from `var SITE = "…"` in the
  loader and builds `stage`/`release` from it. That works whether or not
  REPO has been filled in.
- Status: fixed in this repo (same commit as this entry); not upstreamed
- Found by: claude

<!-- Add new entries here, newest first. -->

### 2026-10-13 · Local Lighthouse adds a second to some hosts on some networks
- Area: ci, perf
- Symptom: every local Lighthouse run showed the staging stylesheet and
  Webflow's jQuery taking ~1.1 s each, which put mobile at 82 for a page
  that scored 96 elsewhere. `curl` and Playwright fetched the same files
  in 70 ms.
- Cause: the newer DNS and connection path in the Chrome that Lighthouse
  launches, on that network; not the site.
- Fix: run local Lighthouse with
  `--chrome-flags="--headless=new --disable-features=HappyEyeballsV3,AsyncDns"`
  (`wf:perf` passes them from `WF_PERF_CHROME_FLAGS`), and check
  the request list for a host that is slow only there before believing a
  score. The keyless PageSpeed API quota is usually spent; the PageSpeed
  website is the reference.
- Status: workaround confirmed
- Found by: claude

### 2026-10-16 · Staging fetched its stylesheet twice before first paint
- Area: loader, perf
- Symptom: on `*.webflow.io`, `styles.css` was requested twice before
  first paint (`?v=1` from Embed 2a, then `?v=<timestamp>` from 2b), the
  second render-blocking; Lighthouse CLS on staging was ~0.18. PageSpeed
  also flagged the fixed jsDelivr preconnect as unused on staging.
- Cause: 2b cache-busted the staging sheet straight away, so a page that
  already had the sheet parsed waited for a second copy.
- Fix: on staging 2b keeps the 2a sheet and swaps in a cache-busted copy
  through `setCSS` only after `load` (skipped when dev mode or a fallback
  has taken the bundle elsewhere); the footer loader re-points the sheet
  only when the bundle comes from another origin. The head code
  preconnects to the bundle's own origin (Pages, jsDelivr or localhost)
  instead of a fixed jsDelivr pair. CLS on staging 0.005.
- Status: fixed in the template's loader.html, 0.6.0 (all three snippets
  must be re-pasted into Webflow)
- Found by: claude

### 2026-09-11 · The Designer's custom-code preview isn't staging
- Area: loader
- Symptom: `?wfc-dev=1` on the Designer URL or the staging site does not
  put the custom-code preview into dev mode; the preview loads the
  production path.
- Cause: the preview runs on `*.canvas.webflow.com`, a separate origin
  with its own URL and localStorage, and the head code only treated
  `*.webflow.io` as staging.
- Fix: the head code treats `*.canvas.webflow.com` as staging too. Set
  the flag on the frame's own URL or storage, or check on published
  staging.
- Status: fixed in the template's loader.html, 0.6.0 (head code must be
  re-pasted)
- Found by: codex

### 2026-10-09 · Swapping the stylesheet href in 2b causes a full-page layout shift
- Area: loader
- Symptom: after a site was cut over to the template's loader, Lighthouse
  CLS on desktop rose from ~0.001 to 0.2–0.5 (0.52, 0.28 and 0.22 on three
  page types). The parity check missed it (see the parity entry below).
- Cause: Embed 2b set `base.href` from the staging URL to the release URL,
  and the footer loader set it again. Assigning a new href to a `<link>`
  drops its rules until the new file arrives. Repo CSS scales the type, so
  the page rendered at the wrong scale, then jumped. The 2b comment said
  the href was "settled before first paint"; it isn't, the staging sheet
  from 2a is already in flight.
- Fix: `WFC.setCSS` in 2b loads the target next to the current sheet and
  removes the old one on `load` (keeps it on `error`); the id moves at
  once and an unchanged URL is a no-op. The footer loader calls it, with
  a plain-href fallback for an older 2b. `tests/css-swap.spec.mjs` covers
  it. CLS back to 0.001–0.003 on the same pages.
- Status: fixed in the template's loader.html (2b and footer code must be
  re-pasted into Webflow)
- Found by: claude

### 2026-10-09 · Setting RELEASE in loader.html breaks CI
- Area: release, ci
- Symptom: two projects hit it. On a new project, every push after the
  first release failed CI with "loader.html must ship with
  `var RELEASE = null;`", so staging stopped deploying (production was
  unaffected; it is pinned to the tag). On a site adopting the template
  while already live, the tests threw from the start, because a live site
  always has a release set.
- Cause: AGENTS.md said to keep `loader.html` "identical to what is
  installed", so the release value was committed. The repo copy must keep
  `null`; the browser tests enforce it. The installed version exists only
  in the head code pasted into Webflow.
- Fix: `loader.html` keeps `RELEASE = null`; the installed release is
  recorded in AGENTS.md › Project facts and set only in the pasted
  snippet. AGENTS.md › Snippets are not versioned and README › Release
  now say "identical except RELEASE".
- Status: fixed in the template's AGENTS.md and README
- Found by: claude

### 2026-10-09 · The staging link in Embed 2a costs production a render-blocking request and a second CSS download
- Area: loader, perf
- Symptom: on production pages of two sites, `styles.css` came from
  github.io (staging) **and** jsDelivr (the release): 3 of 3 Chromium runs
  fetched both, and Lighthouse lists the staging sheet as render-blocking
  (~1.4 s on simulated slow 4G), although 2b swaps in the release sheet.
- Cause: 2a is a static `<link>` to the staging sheet so the Designer
  canvas can show repo CSS. The preload scanner requests it as soon as it
  sees the Embed, and a stylesheet in the body blocks rendering of the
  content after it until it has loaded, even once the swap has removed it.
- Fix: not in the template yet. Proposed: the head code writes the release
  `<link id="wfc-css">` itself when `RELEASE` is set and the page is not on
  `*.webflow.io`; 2b then removes the 2a link (the canvas never runs 2b, so
  it keeps showing staging). Needs a test that public pages never request
  the staging sheet once a release is set. A per-project workaround that
  worked: put the pinned release URL in 2a's static href, have 2b rewrite
  only when the URL differs (staging, dev) and log an error when 2a's
  `@x.y.z` ≠ `RELEASE`. Its cost: a release changes two strings, and the
  canvas shows the release CSS. Hiding `body` until the CSS loads delays
  LCP, so don't use it on a site where PageSpeed matters.
- Status: open
- Found by: claude

### 2026-10-09 · A parity check on settled pages misses layout shifts
- Area: ci
- Symptom: after a loader change, a check comparing computed styles and
  boxes between the old and new install passed 1:1, while Lighthouse CLS
  had gone from ~0.001 to 0.2–0.5.
- Cause: the check waits for the page to settle, so a transient state
  (no stylesheet for a few hundred ms) is never seen.
- Fix: after any change to the loader snippets or how CSS reaches the
  page, also run Lighthouse (or PageSpeed) CLS on a few page types, before
  and after, on the same host. Compare like with like (mobile/desktop,
  same throttling).
- Status: documented
- Found by: claude

### 2026-10-09 · Lighthouse and PageSpeed don't emulate prefers-reduced-motion
- Area: ci
- Symptom: after the page loader was skipped under
  `prefers-reduced-motion: reduce`, Lighthouse and PageSpeed runs still
  showed it, so the change could not be verified there.
- Cause: Lighthouse and PageSpeed run with the default `no-preference`;
  neither has a setting for the media feature.
- Fix: measure reduced-motion behaviour separately (Playwright
  `page.emulateMedia({ reducedMotion: 'reduce' })` or Chrome DevTools
  Rendering › Emulate CSS media feature). Don't count a reduced-motion
  change as a score improvement: the score reflects the full-motion path.
- Status: documented
- Found by: claude

### 2026-10-06 · Body Embed stylesheet: page paints unscaled, then jumps
- Area: loader
- Symptom: the designer saw the hero (and every page) flash. A filmstrip showed
  the first paint at Webflow's 16px with a fallback font, then a jump to
  the repo's fluid scale once repo CSS arrived; `styles.css` was fetched three times.
- Cause: repo CSS comes from a `<link>` in a body Embed, which doesn't block
  rendering like a head stylesheet; the Embed script and the footer loader
  each rewrote its href with a new `Date.now()`, and every href change
  drops the sheet and fetches it again (the cancelled fetch also fires
  `error`); Inter (`font-display: swap`) loaded late.
- Fix: loader.html — head code preloads the Inter woff2, adds
  `html.wfc-css-wait body { visibility: hidden }` (3 s fallback) and one
  shared `WFC.v` cache-buster; the Embed script leaves the static link for
  the canvas and appends a fresh `#wfc-css` link with the final URL, whose
  load/error lifts the wait; the footer loader only sets the href when the
  URL really differs. Verified by serving staging with the patched snippets.
- Status: fixed in loader.html; the snippets had to be re-pasted
- Found by: human + claude

### 2026-10-02 · Static localhost link is requested by public visitors
- Area: loader
- Symptom: Published pages request `http://localhost:3000/styles.css`; can
  block render and trigger Chrome's local-network-access prompt.
- Cause: The canvas Embed carries a static localhost `<link>` so the
  Designer can see local CSS; the script that removes it runs after the
  browser has already started the request.
- Fix: two projects removed the static link independently and create it from script only in dev mode. Trade-off: the
  canvas then shows staging CSS only.
- Status: fixed in the template — the Embed has no static localhost link; the dev link is created by script in dev mode only
- Found by: human

### 2026-10-02 · VER lives in two snippets and a placeholder 404s at launch
- Area: release
- Symptom: Prod CSS and JS both 404 the moment a custom domain is attached.
- Cause: `VER = "X.Y.Z"` is never exercised on `*.webflow.io`, and a release
  must bump VER in both the Embed and the footer snippet.
- Fix: one project kept a single `RELEASE` value in the head config (`null` until the
  first tag) that the other snippets read.
- Status: fixed in the template — one RELEASE in head code; null serves staging with a console error instead of 404ing
- Found by: human

### 2026-10-02 · The add -f dist / untrack release ritual is error-prone
- Area: release
- Symptom: Empty release tags, re-cut versions, `dist/` swept into unrelated
  commits.
- Cause: `dist/` is gitignored except in release commits. One project re-cut
  v1.1.1 with a tree identical to v1.1.0.
- Fix: three projects committed `dist/` permanently and fail CI on
  `git diff --exit-code -- dist`.
- Status: fixed in the template — dist/ is committed; CI fails on drift; dev builds stay in memory
- Found by: human
