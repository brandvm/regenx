# Interactions: Webflow → repo

Every animation and interaction the site ran through Webflow, and the repo
module that replaces it. Inventory taken 2026-11-05 from the Webflow MCP
(`data_interactions_tool › list/get`), the published IX2/IX3 data in
Webflow's page chunk (`webflow.schunk.ecfe68c….js`, plus
`webflow.5a10627a….js` on /about) and the mirrored pages in
`../prototype/site/`.

- **IX3** (Interactions panel, GSAP based): 7 interactions, below.
- **IX2** (legacy engine): 3 open/close pairs on Webflow Dropdowns and the
  menu button, below. The MCP can't list or edit IX2; they were read from
  the published `ix2.init({…})` data.
- **IX1 / page custom code / embeds:** none. The only GSAP in Webflow is
  Site settings › GSAP (gsap, ScrollTrigger, SplitText, CustomEase 3.15.0
  script tags plus `gsap.registerPlugin(…)`), which IX3 needs.
- **Not interactions, unchanged:** the Lottie elements on Home and TRT
  (Webflow's Lottie element, autoplay on load, `data-is-ix2-target="0"`).
- **Already in the repo, not duplicated:** `reveals.js`
  (`[data-animate-in]`), `nav-shrink.js`, `nav-overlay.js` (the backdrop
  for open nav dropdowns), `accordions.ts` (keeps several FAQ items open,
  opens the first), `marquee.ts`, `wave-grid.js` and the rest of `main.js`.

## Inventory

Ease "custom" = IX3 `customEase "M0,160 C100,152 0,0 160,0"` (≈
cubic-bezier(.625,.05,0,1)); in code `EASE` (`animation.ts`). IX2 ease =
cubic-bezier(.64,.05,0,1), in code `EASE_IX2`.

| # | Webflow interaction | Pages | Trigger | Targets → animation | Timing | Repo module · hooks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | IX3 **Button Hover** (`i-01f38f6b`, site) | every page with a `C | Button` (79) or Chip Link (FAQ pages) | hover `.button-link`, `.chip-link`, `.pagination-button`; leave reverses. Off ≤767px and with reduced motion | `.button-label` split into masked letters, each `y → -1.2em`; `.button-icon-w` bg `#d8ff4c`, colour `#83a800`. (`.pagination-button` has neither child: no visible effect) | 0.735s custom, stagger 0.0125 | `hover-roll.ts` · `[data-hover-roll="tablet-up"]`, `[data-hover-roll-text]`, `[data-hover-roll-icon]` |
| 2 | IX3 **Footer Link Hover** (`i-dceec201`, site) | all (G \| Footer) | hover `.g-footer-nav-link`; leave reverses | the link split into masked letters, `y → -1.5em` | 0.735s custom, stagger 0.0124 | `hover-roll.ts` · `[data-hover-roll]` |
| 3 | IX3 **Statement Scroll** (`i-14671bda`, site) | Home, About, TRT, Peptide | scroll `.statement-w`, scrub 0.8, `clamp(50% bottom)` → `clamp(top 30%)` | `.statement` words opacity 0 → 1; `.statement-image-w` opacity 0 → 1, scale 0 → 1 | 1.2s custom; words stagger 0.032, images stagger amount 0.64 | `statement-scroll.ts` · `[data-statement]`, `[data-statement-text]`, `[data-media-scroll]` (already in Webflow) |
| 4 | IX3 **Media Pin Animation** (`i-c4913b4c`, site) | TRT, Lab Panel | scroll `.sd-media-pin`, `clamp(top 80%)` → `clamp(top 20%)`, toggle play / – / play / reverse | `.sd-media-pin-icon` scale 0 → 1, rotate 45° → 0; `.body-lg` opacity 0 → 1 at +0.24s | 0.735s custom | `media-pin.ts` · `[data-media-pin]`, `[data-media-pin-icon]`, `[data-media-pin-text]` |
| 5 | IX3 **About Hero Scroll** (`i-1650da4a`, About page) | About | scroll `.section-pad.is_about-hero`, scrub, `clamp(top top)` → `clamp(bottom bottom)`. Off ≤479px | `.about-hero-video` y 40% → 0, scale 0.8 → 1, rotateX 20° → 0; `.about-hero-main` opacity → 0, y → -50% | linear | `about-hero.ts` · `[data-about-hero]`, `[data-about-hero-video]`, `[data-about-hero-main]` |
| 6 | IX3 **Scroll \| Process Scroll** (`i-ebf3f8dc`, component S \| How To Process) | About, Services, TRT, Peptide | scroll `.section.s-process-scroll`, scrub 0.8, `clamp(top top)` → `clamp(bottom bottom)` | `.process-scroll-track` x 0 → -100%; `.process-scroll-progress-fill` width 0 → 100% | linear | `process-scroll.ts` · `[data-process-scroll]`, `[data-process-scroll-track]`, `[data-process-scroll-fill]` |
| 7 | IX3 **SAM \| Tooltip Hover** (`i-581eac8d`, component SAM \| Tooltip) | TRT (body map) | hover `.sam-tooltip`; leave reverses | `.icon` rotate 0 → 45°; `.sam-tooltip-content` opacity 0 → 1, y -1em → 0, scale 0.9 → 1 | 0.735s custom | `tooltip-hover.ts` · `[data-tooltip]`, `[data-tooltip-icon]`, `[data-tooltip-content]` |
| 8 | IX2 **FAQ Acc \| Open / Close** (`.acc`, Dropdown open/close) | 70 pages (FAQs, services, products) | Webflow Dropdown opens / closes | open: list `display block`, height 0 → auto (0.74s); "+" opacity → 0, blur 0 → 2px (0.64s); "−" opacity → 1, blur 2px → 0 (0.32s at +0.32s). close: height → 0 (0.8s), icons back (0.74s), then `display none`. (The bg-colour actions carry no colour: no effect) | IX2 ease | `dropdown-motion.ts` · `[data-acc]`, `[data-acc-icon="add"\|"subtract"]` |
| 9 | IX2 **G Nav \| Drop Open / Close** (`.g-nav-drop`) | all (G \| Nav) | Dropdown opens / closes | open: list `display block`; `.g-nav-drop-content-w` height 0 → auto, scale 0.9 → 1; `.g-nav-link-arrow` rotate 0 → 180°; `.g-nav-drop-content` opacity 0 → 1 at +0.24s. close: the reverse, then `display none` | 0.74s IX2 ease | `dropdown-motion.ts` · `[data-nav-drop]`, `[data-nav-drop-panel]`, `[data-nav-drop-content]`, `[data-nav-drop-arrow]` |
| 10 | IX2 **G Nav \| Menu Open / Close** (`.g-nav-menu-button`, click / second click, ≤991px) | all (G \| Nav) | click the menu button (the backdrop mirror-clicks it, Finsweet) | open: `.g-nav-block.is-center` `display block`, scale 0.9 → 1, opacity 0 → 1; button `svg.icon._16` rotate 0 → 45°; `.g-nav-overlay` `display block`, opacity 0 → 1 (0.4s). close: the reverse, then `display none` | 0.74s IX2 ease | `nav-menu.ts` · `[data-nav-menu-button]`, `[data-nav-menu-icon]`, `[data-nav-menu]`, `[data-nav-overlay]` |

## What changed on the way

Same motion, same timing and ease, same breakpoints, with these
deliberate differences:

- **Reduced motion is respected** (IX3 only did so for Button Hover):
  hovers, the statement, media pins and the About hero stay in their
  Designer state; the tooltip and dropdowns still open, without motion.
  The process scroll keeps running: it follows the visitor's own scrolling
  and the later cards can't be reached without it.
- **Hover letters are split on the first hover**, not at load, and carry
  `will-change` only while they move. The site CSS no longer gives every
  split letter a permanent `will-change: transform`.
- **The progress fill scales** (`scaleX`, origin left) instead of animating
  `width`: no layout on every scroll frame. Same pixels (the gradient is
  relative to its own box).
- **IX2 froze each open dropdown's width in px** (`width: 582.844px` inline).
  The lists keep their Designer width now, so a resize while open is fine.
- **The menu button gets `aria-expanded`.**
- **ScrollTriggers re-measure after late layout shifts** (lazy images,
  Finsweet lists): `animation.ts` refreshes when the body height settles.
  Without it the media pins fired ~110px early at 820px.

## Verification (2026-11-05)

The prototype serves any page as it will be after the switch with
`?ix=off` (`prototype/scripts/strip-ix.mjs`): Webflow's IX2/IX3 data
emptied, the IX initial-state styles and Webflow's GSAP tags removed, and
the data-* hooks below added. Compared with staging as published:

- **Scripted states** at 1440, 820 and 390 (statement, About hero, process
  scroll, media pins at 4–6 scroll positions; button, footer link, tooltip,
  accordion, nav dropdown, menu at rest, +150ms, +400ms, done, reverse):
  identical boxes and opacities, or within 0.1–0.3px / one colour step,
  everywhere except the nav dropdown and menu, which follow the same curve
  but start one or two frames earlier than IX2 does.
- **`wf:pass`** with `?ix=off`: see the session report (frames > 2%).
- **Performance**, staging as published vs staging with IX stripped and
  the repo bundle (Playwright + CDP metrics, 1440px, median of 3):

  | | Home | About | TRT |
  | --- | --- | --- | --- |
  | elements with `will-change` | 1513 → 33 | 925 → 13 | 1317 → 25 |
  | DOM nodes after load | 7658 → 5104 | 5012 → 4160 | 6418 → 4609 |
  | script time to load + 4s | 126 → 91ms | 125 → 103ms | 190 → 143ms |
  | layouts during a full scroll | 129 → 111 | 92 → 13 | 115 → 59 |
  | ScrollTriggers | 1 → 1 | 3 → 3 | 5 → 5 |

  The bundle grows 5.6 KB gzipped (CustomEase + these modules). Webflow's
  own GSAP tags (gsap, ScrollTrigger, SplitText, CustomEase: 53.6 KB
  gzipped on every page) only go away if Site settings › GSAP is switched
  off afterwards (optional step D); the repo bundle then uses its own copy.

## Webflow steps (need the user's OK; not done)

Order matters: the repo code goes live first (the modules do nothing until
their hooks exist), then A–C happen in one Designer session and are
published to staging together, so nothing runs twice.

**A. Add the data-* attributes** (Element settings › Custom attributes; the
MCP `set_attribute` can do them, mostly on component definitions):

| Where | Element (class) | Attribute |
| --- | --- | --- |
| `C \| Button` | the Button Link (`.button-link`) | `data-hover-roll` = `tablet-up` |
| Button Size (inside `C \| Button`) | `.button-label` | `data-hover-roll-text` |
| Button Size / Button Style | `.button-icon-w` | `data-hover-roll-icon` |
| FAQ pages' chips | each `.chip-link` (6 FAQ pages) | `data-hover-roll` = `tablet-up`; its `.button-label` `data-hover-roll-text` |
| `G \| Footer` (both variants) | each `.g-footer-nav-link` (23) | `data-hover-roll` |
| Home, About, TRT, Peptide | `.statement-w` | `data-statement` |
| same | `.statement` | `data-statement-text` |
| TRT, Lab Panel | each `.sd-media-pin` | `data-media-pin` |
| same | its `.sd-media-pin-icon` | `data-media-pin-icon` |
| same | its `.body-lg` | `data-media-pin-text` |
| About | `.section-pad.is_about-hero` | `data-about-hero` |
| About | `.about-hero-main` | `data-about-hero-main` |
| About | `.about-hero-video` | `data-about-hero-video` |
| `S \| How To Process` | the section (`.section.s-process-scroll`) | `data-process-scroll` |
| same | `.process-scroll-track` | `data-process-scroll-track` |
| same | `.process-scroll-progress-fill` | `data-process-scroll-fill` |
| `SAM \| Tooltip` | the root (`.sam-tooltip`) | `data-tooltip` |
| same | `.sam-tooltip-icon` (the Icon instance's wrapper) | `data-tooltip-icon` |
| same | `.sam-tooltip-content` | `data-tooltip-content` |
| `C \| Accordion` | the Dropdown (`.acc`) | `data-acc` |
| same | `.acc-icon.is_add` | `data-acc-icon` = `add` |
| same | `.acc-icon.is_subtract` | `data-acc-icon` = `subtract` |
| `G \| Nav` | each nav Dropdown (`.g-nav-drop`) | `data-nav-drop` |
| same | `.g-nav-drop-content-w` | `data-nav-drop-panel` |
| same | `.g-nav-drop-content` | `data-nav-drop-content` |
| same | `.g-nav-link-arrow` | `data-nav-drop-arrow` |
| same | `.g-nav-menu-button` | `data-nav-menu-button` |
| same | its `svg.icon._16` | `data-nav-menu-icon` |
| same | `.g-nav-block.is-center` | `data-nav-menu` |
| same | `.g-nav-overlay` | `data-nav-overlay` |

`.statement-image-w` already has `data-media-scroll`; nothing to add.
The tooltip's "+" rotates on its wrapper (`.sam-tooltip-icon`) instead of
the `.icon` inside it: an attribute on the shared Icon component would
reach every icon on the site. Same box, same rotation.

**B. Delete the 7 IX3 interactions** (MCP `delete_interaction`, soft
delete): `i-01f38f6b`, `i-dceec201`, `i-14671bda`, `i-c4913b4c`,
`i-1650da4a`, `i-ebf3f8dc`, `i-581eac8d`.

**C. Remove the 3 IX2 interactions in the Designer** (manual: the MCP
can't reach IX2): Interactions panel › Element triggers on the `.acc`
dropdown (FAQ Acc | Open / Close), the `.g-nav-drop` dropdown (G Nav |
Drop Open / Close) and `.g-nav-menu-button` (G Nav | Menu Open / Close).
Then publish to staging and run the checks again on staging.

**D. Optional, later:** Site settings › GSAP off. Saves 53.6 KB gzipped per
page; the bundle already falls back to its own GSAP (`animation.ts`). It
reverses the AGENTS.md rule "Keep Webflow's native GSAP … enabled", so it
needs its own OK and an AGENTS.md edit. Then check whether Webflow still
ships its interaction runtime chunk (`webflow.schunk.9b834957…`, 100 KB
gzipped) on pages without interactions.
