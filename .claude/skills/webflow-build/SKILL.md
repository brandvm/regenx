---
name: webflow-build
description: Build a Webflow site in Webflow from an approved design (an approved localhost prototype, or a Figma link), with the Webflow MCP and this wf-template repo: variables, tag styles, classes and CMS, the repo port and loader, the style guide page, the media page, components, then pages section by section, each verified against the design at four widths, up to the build handoff. Use when starting or continuing a Webflow build (Designer through the MCP plus JS/CSS in the repo), building components or pages, comparing Webflow staging with the prototype, checking anchors, page transitions, load flicker or the published HTML, or wrapping up a build session. For project setup and the prototype, use webflow-prototype; for launch, webflow-launch; for a site that is already live, webflow-audit.
---

# Webflow build: approved design → Webflow, section by section

The person approves every design decision; Claude builds, verifies and
reports. A section is done only when it matches the approved design at every
width, works after every way of arriving at it, and its manual steps are
listed.

- [checklists.md](checklists.md) gates every step: the design handoff,
  the Webflow foundation, the media page, each component, each finished
  page and the build handoff.
- [conventions.md](conventions.md) sets the page and section structure,
  class and variable naming, and the component, CMS and style-guide
  patterns every build starts from.
- [lessons/](lessons/README.md) holds what cost time on earlier builds, by
  area. Read the file for the area you are about to work in.
- The `webflow-prototype` skill comes before this one: project setup, the
  inputs, and the localhost prototype the build is compared against. With
  a Figma-only handoff, its [figma.md](../webflow-prototype/figma.md)
  reads the frames.
- [rules.md](rules.md) has the rules every Webflow skill shares (no commit
  or push without an OK, Designer first, no credentials in chat, manual
  steps, lessons), the session wrap-up and how to contribute back.
- [starter-site.md](starter-site.md) describes the starter Webflow site a
  project duplicates, with the base system already in it.
- The `webflow-style-guide` skill makes the style guide page, the first
  page of the prototype and of the Webflow build, in the one layout every
  site uses.
- [media.md](media.md) is the media page: where a site's videos are
  uploaded so Webflow converts and hosts them, built before the first page
  that plays one.
- A site that is already live is not a build: use the `webflow-audit`
  skill (audit, then small verified batches; also for one-off fixes).
- After the build handoff, the `webflow-launch` skill takes over: pre-launch
  QA, launch day, the client handoff and the first 30 days.

Every checklist item says who does it:
- **[Claude]** Claude does it (through the MCP, the repo or a script).
- **[Claude checks]** Claude verifies it and reports; a person fixes what
  Claude can't.
- **[Person]** a person does it (client, PM, designer, DNS, accounts).
  Claude may remind and track it, never claim it.

## Session start (every session)

1. Read the workspace `CLAUDE.md`, then this repo's `AGENTS.md` and
   `GOTCHAS.md`, then `docs/handoff/` (`HANDOFF.md`, `MANUAL-TODO.md`,
   `BUILD-NOTES.md`, and `REVIEW.md` once the review phase has started).
   Skim [lessons/README.md](lessons/README.md) and read the lesson file
   for today's area (MCP work: `lessons/mcp.md`). Never repeat a mistake
   already logged.
2. Read the project memory: where the last session stopped, open manual
   steps, open questions. Say in one line where things stand and what's
   next; ask which page or section if it isn't clear.
3. Run **Before building** in `checklists.md` before the first Webflow
   batch (the inputs and the prototype gates are `webflow-prototype`'s). Agree
   any change to `conventions.md` with the designer. If an input is
   missing, ask for it; don't guess content, states or SEO fields.
4. Webflow MCP: call `webflow_guide_tool` once, then reuse one session id
   and agent id for the whole session.
5. The prototype dev server is running and `webflow-build.config.json`
   exists (`pnpm new-project` writes it; `webflow-prototype` › Project
   setup).
6. Today's scope is one page (see Working rhythm). Say which.

## Standing rules

The shared rules are in [rules.md](rules.md). The build adds:

- **Ask before creating, editing or removing classes and variables**, one
  batch at a time, with names and values. A request that clearly implies
  them (e.g. "build it in Webflow" after approving a mock) is the OK.
- **Publishing depends on whether the site is live.**
  - *New build (no custom domain attached):* publishing to the webflow.io
    staging domain is fine.
  - *Live site:* a publish is site-wide. It sends out everything pending,
    including other people's unfinished edits. Publish to staging only,
    check what else would go live, and wait for the person to type
    "publish" before the custom domain (`webflow-audit` has the steps).
  - Never publish to a custom domain, cut a release or change DNS without
    asking.
- **After every Webflow write batch, say two things:** "reload the
  Designer" (an open Designer tab doesn't show MCP changes, and saving
  from a stale tab can overwrite them), and what is not published yet.
- **Mark manual steps on the page.** A `MANUAL-TODO.md` row that leaves
  something visibly unfinished (a value still missing, a binding not
  made) gets a marker next to the element, or next to its specimen on the
  style guide: a Caption with `data-manual-todo="<letter>"` and the text
  "Manual step <letter>: <what>". It shows on the canvas and on staging,
  so nobody reviews the unfinished state as the design. Remove it in the
  batch that ticks the row; none may be left at the build handoff or at
  launch (search the published HTML for `data-manual-todo`).

## The order of a build

Structure and names follow `conventions.md`. Each step is gated in
`checklists.md`:

1. variables;
2. tag styles (set once in the Designer so the MCP can reach them);
3. classes;
4. CMS collections;
5. the repo port (modules and repo CSS from the prototype) and the
   loader, so staging runs the real code → **Foundation done**;
6. the style guide page, the first page built
   (`webflow-style-guide` skill) → **Style guide base done**;
7. the media page, when any page plays a video
   ([media.md](media.md)) → **Media done**;
8. components, built from the real page markup (never from style guide
   previews), each adding its style guide row → **Component done**;
9. pages, section by section → **Page done**;
10. the style guide final check, then **Build handoff**;
11. the review phase: `docs/handoff/REVIEW.md` lists what is built per
    page, each feedback round and what is left before launch, until the
    `webflow-launch` skill takes over.

A site duplicated from the starter already has the base of steps 1 to
3 and the page shell; the project adds to it. Before each import run
`pnpm wf:preflight`; plan class batches with `pnpm wf:styles`
(see Checks).

## The section loop

For each section, in page order:

1. **Read the design**: prototype markup, CSS and the module that animates
   it; or the Figma frame, its states and the interaction spec. Note every
   `data-*` hook, id and aria attribute.
2. **Check what Webflow has**: classes (`query_styles`), components and
   their props, CMS fields, assets. Reuse before creating; name anything
   new by `conventions.md` (sections 2–4).
3. **Build**, preferring, in order:
   - component instances;
   - the element builder for DOM elements (`button`, `ul/li` when ARIA
     roles must survive, `svg`, `span` with tag), with nested children;
   - WHTML import for plain markup, then fix what it drops (see the
     importer checklist below).
   Page content lives in the **G | Main** slot of the G | Page W
   component. On a page whose slot is still empty: build the sections in
   a **To Slot** wrapper after G | Page W, ask the person to drag the wrapper into the slot, then ungroup
   it (move each child before the wrapper, remove the wrapper). Once a
   section is in the slot, build next to it directly (`conventions.md`
   §1). Check slot content with `query_elements`; the page tree shows
   slots as empty.
4. **Wire** attributes, CMS bindings, prop values, links, form settings.
5. **Publish**, then run the checks. Fix, re-publish, re-check.
6. **Report**: what was built, what matched, what differs and why, manual
   steps, and the files waiting for a commit OK.

When a page is complete, run **Page done** in `checklists.md`.

### Importer checklist (after every WHTML import)

- `<button>` became a Link → rebuild as DOM `button`, move children in.
- `<img>` lost every attribute and its asset link → `set_image_asset`,
  re-add `data-*`, `loading`, size (or a class with `aspect-ratio`).
- `<span>` became a text Span → shapes as `<div>`; split text pieces as
  DOM `span` (otherwise editing the parent's text flattens them).
- A class list with one missing class lost *all* its classes → create
  classes first, re-check `styleNames`.
- DOM elements keep a literal `class` attribute → `remove_attribute class`.
- A normal space before `<br>` is trimmed → `Line.&nbsp;<br>Next`.
- Boolean attributes need a value (`muted="true"`) or publishing drops them.
- Lists publish as `role="list"` → keep ARIA roles on DOM `ul/li`.

### Canvas hygiene

- Every class on an empty element: padding 0 on all sides and
  `font-size: inherit` (the canvas `.wf-empty` adds 75px padding and
  font-size 0).
- Every grid sets at least one row and one column template; centre single
  children with flex, not grid.
- An element drawn only by a pseudo-element (an icon font glyph) gets a
  space as its text (`set_settings`, key `text`), so it is not empty on
  the canvas. Webflow publishes it as a non-breaking space, which takes
  room: size the element (1em × 1em) and align its content to flex-start
  so the space can't move the glyph.
- No style values only the MCP can see: if the Designer can't display it,
  it belongs in repo CSS with a tag.

## Checks

The scripts are in this skill's `scripts/` folder, with a `pnpm` shortcut
each. They read `webflow-build.config.json` from the current directory or a
parent (the example is `webflow-build.config.example.json`). By default
staging loads this repo's local `dist/`, so code can be checked before a
push; `--live` checks what visitors get (`seo`, `install`, `parity`,
`tracking` and `redirects` check the custom domain in `liveUrl` with it;
`domain` always does). Screenshots go to
`.webflow-build/` next to the config.

```bash
pnpm wf:compare /path '<section selector>' [width] [--scroll]   # element geometry vs prototype
pnpm wf:pass /path [width]                                       # whole page: section offsets + pixel frames
pnpm wf:anchors /path [width] [--offset N]                       # every #link lands on its section
pnpm wf:outline /path                                            # heading outline, one h1, glued words at <br>
pnpm wf:film /path [selector] [width]                            # first seconds of a load (flicker)
pnpm wf:transitions /start /a /b [--width W]                     # Barba swaps, leaks, full page loads
pnpm wf:a11y [/path…] [--all-widths]                             # axe scan, WCAG 2.2 A/AA rules
pnpm wf:links [/path…] [--max 50] [--external]                   # crawl: broken, # and placeholder links
pnpm wf:baseline save|compare [/path…]                           # full-page visual baselines (launch, releases)
pnpm wf:html [/path…]                                            # published HTML: what Webflow changed on publish
pnpm wf:perf [/path…] [--runs 5] [--mobile|--desktop]            # Lighthouse, median of several runs
pnpm wf:seo [/path…] [--live] [--canonical]                      # sitemap crawl: titles, OG, one h1, JSON-LD, noindex
pnpm wf:install [/path…] [--live]                                # installed snippets vs loader.html, localhost requests
pnpm wf:parity [/path…] [--live] [--width W] [--control]         # migration: old custom code vs dist/, every element
pnpm wf:overflow [/path…] [--live] [--width W[,W…]] [--why]     # what runs off the right edge, 2560 … 360
pnpm wf:tracking [/path…] [--live]                               # tags, double page views, cookie consent, gclid/UTM (hits blocked)
pnpm wf:redirects map [--from URL] [--existing export.csv]       # old site → new pages, Webflow 301 import file
pnpm wf:redirects test [--live] [--file urls.txt]                # every redirect lands in one permanent hop
pnpm wf:domain                                                   # liveUrl: certificate, domain renewal, DNS host, http/www redirects
```

Two more read the prototype's files, with no browser and no Webflow
(`--root <dir>`, else `prototypeDir` in the config, default
`../prototype`):

```bash
pnpm wf:preflight [/path…] [--strict]   # markup the importer or publisher will change: FIX now, or PLAN the step
pnpm wf:styles                          # new classes sorted into: connector / by hand in the Designer / repo CSS
```

Paths default to `pages` in the config, else `/`.

From outside the repo, run the same files with `node
.claude/skills/webflow-build/scripts/<name>.mjs`.

Reading results:
- `compare`: ±1px is rounding. "Only in webflow" rows for component
  wrappers are expected structure, not bugs.
- `pass`: video heroes differ frame to frame. Any other frame >2% is a real
  difference: open the PNG pair before guessing. A section offset that
  differs shifts everything after it, so fix the first one.
- `anchors`: every row `ok`; pinned targets are measured at their
  `.pin-spacer`.
- `load-film`: healthy = hidden → 0 → rising. Items at full opacity before
  the animation = flicker.
- `transitions`: ✓ on every swap, height and pins equal to the direct load
  after each round, `full loads 1`.
- `a11y`: exits 1 on serious or critical failures. Automated rules catch
  about a third of WCAG issues; keyboard and screen reader checks stay.
- `links`: `#` links are fine while content is missing, as long as each
  one is in the known issues.
- `baseline`: `CHANGED` rows have before/after PNGs; expected changes →
  `save` again and commit.
- `html`: every finding is something no canvas or API read shows: a field
  published as `name="field"`, a link standing in for a button, a variant
  whose class is on no element, a class no stylesheet defines (a
  conditional class with a typo), a script hook the prototype has and the
  published page lost. Exits 1 on any finding.
- `perf`: read the median, and the range next to it. A change smaller
  than the range is noise, not a result. It always measures the deployed
  bundle.
- `seo`: pages from `sitemap.xml`, else a crawl from `pages`. Missing
  title, description or OG tags, not one `<h1>`, and JSON-LD that doesn't
  parse or holds an HTML entity (`&#39;`) fail; noindex pages are listed,
  and fail with `--live` unless `seo.noindexOk` allows them. Long titles,
  short descriptions and pages with no JSON-LD (outside `seo.noSchemaOk`)
  are notes.
- `install`: a loader piece (head code, Embed 2a, 2b, footer code) that
  differs from `loader.html` is an old paste: re-paste it and publish.
  Also fails on two viewport metas, two Finsweet Attributes tags and any
  request to localhost from the page.
- `parity`: every difference is a change the live site would see. Run
  `--control` first: what differs between two renders of the published
  page is noise, for `parity.ignore`. Screenshot pairs are in
  `.webflow-build/parity/`.
- `overflow`: each row is the first element of a chain whose visible
  right edge passes the viewport, with the widths and the worst
  overshoot; a page that scrolls sideways is its own finding. The sweep
  covers the widths the three checks miss (1366, 1280, 1024, 992…), where
  the fluid scale holds and fixed sizes stop fitting. Clipped content
  (slider masks, marquees), off-canvas menus and hidden elements are
  skipped; `--why` lists them, `overflow.ignore` adds selectors. A row
  marked "moved by a transform" may be an animation's start state: check
  it after the animation has played. Fixes are Designer fixes:
  `minmax(0, 1fr)` columns, `min-width: 0` on flex and grid children,
  wrapping instead of fixed widths.
- `preflight`: **FIX** means change the prototype markup now (an empty
  span as a shape, a control outside a form, a valueless boolean, an inline
  style, a class in no CSS file). **PLAN** means the markup is right and
  the build needs a known extra step (a button, a span inside text, image
  attributes, a placeholder).
- `styles`: the plan for the class batches, saved to
  `.webflow-build/styles/styles-plan.json`. **connector** lines are what
  to propose; every **BY HAND** line becomes a row in `MANUAL-TODO.md`
  before the batch, not after; **Repo CSS** rules go to `src/styles.css`
  with the tag shown. It writes nothing to Webflow.

Run `preflight` on a prototype page before it is approved and again before
its import; `styles` before the first class batch and whenever
`new-classes*.css` changes; `compare` per section while building; `pass`,
`outline`, `anchors`, `a11y`, `links`, `html` and `overflow` when a page is done;
`perf` at the build handoff and before and after any speed work;
`install` after every paste of a loader piece; `seo` before launch; `load-film` after touching the hero or the loader;
`transitions` after touching pages, links or modules. Check all three
widths (Webflow's breakpoints are 991/767/479). For interactions, script
the hover, click or scroll state and compare that, not only the resting
state.

The prototype comparison needs a localhost prototype. With a Figma-only
handoff, review against the frame screenshots in `Assets/figma/`
([figma.md](../webflow-prototype/figma.md)) and run the other scripts as they are.

## Repo work

- One module per feature in `src/modules/`, one `run()` line in the
  manifest. Modules depend on `data-*` attributes, not class names.
- `pnpm check && pnpm build && pnpm test` before asking to commit; `dist/`
  is committed with the source.
- With page transitions (Barba), page modules run per page inside a
  `gsap.context` with their listeners recorded and torn down on leave;
  global modules (Lenis, nav) run once and expose refresh hooks. Test after
  arriving by transition, not only on direct load.
- Things visible at load: `gsap.set()` + `gsap.to()`, never `gsap.from()`.
- Swapping a Webflow image: remove `srcset`/`sizes` first.
- Anchors: unbind webflow.js's `click.wf-scroll`; scroll to a pinned
  section's `.pin-spacer`; pause scroll snapping during the glide.
- Never put `backdrop-filter`, `filter` or `transform` on a wrapper that
  holds `position: fixed` children.
- Libraries are bundled, never Webflow script tags. Copy-in recipes:
  [finsweet](recipes/finsweet/README.md) (Finsweet Attributes),
  [phosphor](recipes/phosphor/README.md), [video](recipes/video/README.md),
  [anchor-scroll](recipes/anchor-scroll/README.md),
  [smooth-scroll](recipes/smooth-scroll/README.md) (GSAP + Lenis),
  [barba](recipes/barba/README.md), [modal](recipes/modal/README.md),
  [snippets](recipes/snippets/README.md) (count-up, marquee, FAQ, tabs,
  dropdown close, resize reload, page-loader backstop, IX3 fallback).
- Sizes follow the fluid scaling in `src/styles.css` §01: Webflow
  variables in em, the desktop frame set to the design before building.
- Loader snippets aren't versioned: any `loader.html` change must be
  re-pasted in Webflow (a manual step).

## Migrating a live site

Moving a site that is already live onto the template (its old custom
code hosted elsewhere) happens in two phases, never one:

1. **Parity first.** The port reproduces the live site with no visual,
   content or behaviour change. Map each old custom-code asset in
   `parity.oldAssets` (a URL regex → `index.js`, `styles.css`, or `""` for
   a library the bundle now carries), then `pnpm wf:parity --live` on every
   template page at every width until it reports zero differences, or
   each one is explained. Only then paste the loader and remove the old
   code, and run `pnpm wf:install --live`.
2. **Improvements second**, in later releases, one at a time, each
   re-checked with `wf:parity` and shown to the person.

Template defaults that change a live site are improvements, not parity:
check each before the first release and keep it off until approved. The
scroll lock (`html.is-loading` in the head code and `src/styles.css`),
the `theme-color` meta in the head code, the icon font in the bundle
(`pnpm phosphor`), and the base CSS (`box-sizing`, the §01 type scaling)
all show up in `wf:parity` if the live site didn't have them.

## Working rhythm

- **One page per session, finished completely:** built, checked at every
  width, its states and SEO fields done, **Page done** run, handoff
  updated. Half-built pages are where shortcuts get forgotten.
- **Page-by-page approval.** The designer approves each prototype page
  (after **Prototype page done**) before its Webflow build, and each
  Webflow page before the next one starts.
- **A go-ahead before each Webflow batch.** Propose the batch (variables
  old → new, classes with what they are for, the elements to build), wait
  for the OK, write it, report what changed. Approval of one batch never
  covers the next.
- **`docs/handoff/` stays current** during the session, not at the end:
  a decision goes into `HANDOFF.md` when it is made, a manual step into
  `MANUAL-TODO.md` when it is found.
- **After the build handoff, review.** Fill in `docs/handoff/REVIEW.md`:
  what is built per page, then one table per feedback round, the next
  free `MANUAL-TODO.md` letter and the list of what has to happen before
  launch.
- **Lessons go back.** At wrap-up, offer every `template-candidate`
  lesson to the template ([rules.md](rules.md) › Contributing).

## Session wrap-up and contributing

Both are in [rules.md](rules.md).
