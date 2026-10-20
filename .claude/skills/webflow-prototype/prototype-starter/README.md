# Prototype starter

A localhost prototype that mirrors Webflow, for the prototype phase
(`conventions.md` §13): the design is built and approved here first, then
rebuilt in Webflow class for class.

It mirrors Webflow on purpose:
- **URLs:** each page is `folder/index.html` at its Webflow URL, served
  without a trailing slash.
- **Breakpoints:** 991, 767 and 479px, plus Webflow's larger ones (1280,
  1440, 1920px, min-width) when the snapshot uses them.
- **Structure:** the page shell and section structure from `conventions.md`
  §1–2. Nav and Footer are one partial each (one Webflow Component each).
- **CSS:** the CSS Webflow already has is generated from a snapshot and
  never edited; changes and new classes live in their own files, so each
  one can be approved and then made in the Designer.
- **JS:** modules work like the repo's `src/modules/`, so they move into
  the repo unchanged.

## Start

`pnpm new-project` copies this folder to `<Client>/prototype`, next to the
repo (copy it by hand for a workspace set up without it). Then:

```bash
pnpm install
pnpm dev            # http://127.0.0.1:<port> (the project's own, from pnpm new-project)
```

`pnpm new-project` writes the same port into `prototypeUrl` in the repo's
`webflow-build.config.json`, so the check scripts compare staging with this
prototype and not another client's. `--strictPort` makes a busy port an
error instead of a silent move to the next one. Change both together.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `<page>/index.html` | Pages at their Webflow URLs; add each to `pages` in `vite.config.js` |
| `design/style-guide/index.html` | The style guide page, **generated** by `pnpm style-guide` in the fixed layout of the `webflow-style-guide` skill: a sidebar of sections, each a list of rows |
| `design/style-guide/items/*.html` | Specimens written by hand (buttons, form parts): one header comment per item. Components and page sections come from `<!-- sg:start … -->` blocks in the pages themselves |
| `src/css/style-guide.css` | **Generated** with the page: the skill's Sg layout classes plus one combo per colour, radius and spacing variable |
| `scripts/skill.mjs` | Runs a script from one of the template's skills (the style guide generator and check live in the skill, so `pnpm update-skills` updates them) |
| `src/modules/style-guide-nav.ts` | Highlights the sidebar link of the section in view (Webflow does this itself with the link's Current state) |
| `public/fonts/` | The default font, Geist (the official variable file and its licence). `partials/head.html` preloads it and `src/css/prototype.css` declares it; the same file is uploaded to Webflow. Replace it when the project uses another font |
| `partials/` | `head.html` (stylesheets), `nav.html`, `footer.html`, included with `<!-- @include partials/nav.html -->` |
| `webflow-snapshot/` | `variables.json` and `styles.json`: what Webflow has now |
| `src/css/tokens.css`, `webflow.css` | **Generated** from the snapshot (`pnpm css`), or from the published CSS (`pnpm css:published`). Never edit |
| `src/css/webflow-base.css` | Only with `pnpm css:published`: what Webflow ships itself (normalize, `w-*`, the site's `@font-face`), linked first in `partials/head.html` |
| `scripts/published-css.mjs`, `scripts/lib.mjs` | Shared by the scripts: reading Webflow's published CSS; the repo config, the pages, the dev server and Playwright |
| `.screens/` | Screenshots from `pnpm screens` and `pnpm check:states --shots`, `type-metrics.json` from `pnpm measure:type --json` (not in git) |
| `src/css/proposed.css` | Changes to existing variables and class bindings, as P1, P2… old → new |
| `src/css/new-classes.css` | New classes, grouped by component (more files: `new-classes-*.css`) |
| `src/css/prototype.css` | Stand-ins for what Webflow ships, and the tag styles; never moved. Element rules are in `:where()`, so a site's real tag styles in `webflow.css` win |
| `src/main.ts`, `src/modules/` | The module manifest and one file per module |
| `CLASSES.md` | **Generated** (`pnpm classes`): every new class with its Designer name |

## Commands

```bash
pnpm css                 # snapshot → tokens.css + webflow.css
pnpm check:snapshot      # the snapshot is consistent: every alias and binding resolves
pnpm check:drift         # the snapshot matches what staging publishes (variables, classes, values)
pnpm css:published [url] # no connector: CSS + snapshot from the CSS the site publishes (below)
pnpm screens [/path]     # screenshots at the check widths; overflow and errors from 2560 to 360
pnpm check:states [/path] # keyboard focus visible, no ring on mouse click, buttons have :active
pnpm measure:type        # the style guide's type as rendered at 1440 and 390: size, line height, tracking, weight
pnpm fig <file.fig>      # read a saved Figma file when there is no connector (skill › figma.md)
pnpm classes             # new-classes*.css → CLASSES.md
pnpm style-guide         # snapshot + CSS → design/style-guide/index.html
pnpm check:style-guide   # every class is applied, and the layout is the fixed one
pnpm check               # tsc
pnpm build               # sanity check
```

`pnpm screens` and `pnpm check:states` check every page (or the paths
given) in a browser. They use the dev server if it runs and start one if
not, and take Playwright from the repo next door (the template repo has
it), so the prototype installs no browser of its own. `screens` writes
full-page screenshots at the repo config's `widths` to `.screens/`, then
checks a sweep of widths (2560, 1920, 1680, 1440, 1366, 1280, 1024, 992,
991 … 360, both sides of every breakpoint) for elements sticking out past
the right edge and for page errors, console errors and failed requests. An
element inside a container that clips or scrolls it (a carousel track) is
fine; one meant to stick out takes `data-overflow-ok`. `check:states` tabs
through each page (keyboard focus must look different from rest), clicks
each link and button (no focus ring on a mouse click), and holds each
button down (an `:active` rule on it or inside it, or a visible change).
It finds controls itself, so it needs no list of selectors; the style
guide's specimens are checked too (it lifts their `inert`).

## Webflow snapshot

Claude writes the two files from the Webflow MCP (variables with all modes
and aliases; styles with `include_breakpoints`), at the start and after
every Designer change, then runs `pnpm css` and `pnpm check:snapshot`
(the snapshot is written by hand, so a wrong alias would otherwise only
show as a page that looks slightly off). `pnpm check:drift` then compares
it with the stylesheet the staging site publishes: variables and classes
that exist on one side only, and every value that differs, at every
breakpoint, state and mode. Run it after each Designer change is
published to staging; it is how a change made in the Designer by someone
else is noticed. The starter ships with the
snapshot of the starter Webflow site (`webflow-build` › `starter-site.md`), so a new
prototype starts from the same base system as a duplicated site.

Two things the MCP can't read back, so the snapshot states them by hand:
breakpoint variable modes (`breakpointModes` on a collection, body's
`variableModes` per breakpoint) and `calc()` values that use variables
(the read returns only the first variable; copy the value from the
published CSS).

### No connector: from the published CSS

When the Webflow MCP can't be used (not set up yet, signed in to another
site, or no MCP call allowed), `pnpm css:published [https://<site>.webflow.io]`
(default: `stagingUrl` from the repo config) reads what the site publishes,
with GET requests only:

- `src/css/webflow-base.css`, `tokens.css` and `webflow.css`: the
  published CSS, split at `:root`, exactly as Webflow serves it. A site
  with per-page CSS is read page by page (sitemap and home page links) and
  the files are merged, each rule after the one before it on its page.
  `--crawl` does that for any site; `--css <file>` reads saved files.
- `webflow-snapshot/variables.json` and `styles.json`, recovered as far as
  the CSS allows, and `source.json` saying so. `pnpm check:snapshot`,
  `check:drift`, `style-guide` and `classes` work on it; `pnpm css` refuses
  to run while `source.json` exists (it would rebuild exact CSS from
  guesses).

What the published CSS doesn't hold, so the snapshot guesses or leaves out
(the full list is at the top of `scripts/css-from-published.mjs`):

- **Names.** Classes, variables, groups and collections are re-derived
  from the CSS slug (`g-nav-link` → "G Nav Link"); case, spaces and
  punctuation are lost. Unprefixed variables go to "Base collection".
- **Modes.** Breakpoint modes are named Tablet, Mobile Landscape and
  Mobile, and written as auto-modes (`breakpointModes`; a mode set on the
  Body tag per breakpoint publishes the same CSS). A mode a class sets is
  named after the class.
- **Base or combo** in a chain (taken from the selector order), and
  component variant names (`:where(.w-variant-<id>)`).
- **Anything that publishes no CSS:** classes with no properties (script
  or attribute hooks), values left at Webflow's default, interactions.
  Element-level styles (`#w-node-…`) and attribute selectors stay in
  `webflow.css` only.
- **Values as typed:** they come back minified (`#fff`, `.5em`), and a
  `140%` could have been a Size or a Percentage variable.

Replace it with an MCP snapshot as soon as the connector is available:
write both files, delete `source.json`, run `pnpm css` and
`pnpm check:drift`.

### Format

`variables.json`: one entry per collection.

```json
[{ "collection": "Layout", "modes": ["Base", "Tablet"],
   "variables": [{ "name": "Section/Padding H", "type": "Size",
     "cssName": "--_layout---section--padding-h",
     "values": { "Base": { "value": 2, "unit": "em" }, "Tablet": { "value": 1.5, "unit": "em" } },
     "alias": { "Base": "Spacing/32" } }] }]
```

- `values`: per mode. A size is `{value, unit}`; anything else is a string
  or number.
- `alias`: per mode, `"<Collection>/<Variable>"` when the value points at
  another variable.
- `breakpointModes` (optional, on a collection): `{ "medium": "<mode>", … }`
  for a collection with breakpoint auto-modes (Typography Role); `pnpm css`
  switches it on `:root` at each breakpoint.

`styles.json`: one entry per class or combo.

```json
[{ "name": "Section", "selector": ".section",
   "properties": { "main": { "padding-left": "var:Layout/Section/Padding H" },
                   "medium:hover": { "opacity": "0.8" } },
   "variableModes": { "main": { "Typography Styles": "H2" } } }]
```

- Keys are `<breakpoint>[:<state>]`: `main`, `large` (min 1280), `xl`
  (min 1440), `xxl` (min 1920), `medium` (991), `small` (767), `tiny`
  (479). A state is a pseudo-class (`hover`, `focus-visible`…) or one of
  the states Webflow publishes as a class: `current` (`.w--current`),
  `redirected-checked` and `redirected-focus` (custom checkbox and radio).
- `var:<Collection>/<Variable>` binds a variable.
- `variableModes` sets a collection's mode on that class (the Typography
  Styles pattern in `conventions.md` §4). The body tag style is
  `"name": "body"`.

## From prototype to Webflow

1. The designer approves the prototype page by page.
2. Claude proposes, batch by batch and with the designer's go-ahead each
   time:
   - the P-blocks of `proposed.css`;
   - the classes in `CLASSES.md`;
   - the tag styles.
3. After each batch is made in Webflow, refresh the snapshot and run
   `pnpm css`, so the prototype matches Webflow again.
4. Write the repo's `docs/handoff/HANDOFF.md`: pages, components,
   modules and their `data-*` hooks.
5. Build in Webflow with the webflow-build skill.

Rules in the new-classes files that the Designer can't express go to the
repo's `src/styles.css` with their `repo-css:` tag. `check:style-guide`
lists JS state classes too; they need a specimen on the style guide only if
the Designer styles them.
