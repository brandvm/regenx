# RegenX — Webflow custom code

Agent instructions for this repository. Codex, Cursor and similar tools read
this file directly; Claude Code reads it through `CLAUDE.md`. It is the single
source of agent rules — edit this file, never a copy of it.

## Project facts

- Client / site: RegenX (Webflow short name `regen-x`)
- GitHub: `brandvm/regenx`, default branch `master`
- Webflow site ID: `6a343f4bd4c8ed2f7270a980`
- Staging site: `https://regen-x.webflow.io`
- Staging bundles: `https://brandvm.github.io/regenx/` (GitHub Pages via
  Actions, enabled 2026-09-15)
- Production bundles: `https://cdn.jsdelivr.net/gh/brandvm/regenx@<RELEASE>/dist/`
  once `RELEASE` is set
- Production domain: unknown — fill in (production is intentionally
  unconfigured during development)
- Production release: none yet (`RELEASE = null` in the HEAD snippet; no tags)
- Webflow MCP: configured in `.mcp.json` (`https://mcp.webflow.com/mcp`)
- Origin: CodeSandbox `regenx-main.css`, `regenx-wave.js`, `regenx-main.js`
  plus global head/footer code, migrated 2026-09-15 (bff85c4).

## Who owns what

Webflow owns markup, layout, classes, components, CMS content, interactions
**and styling by default**. This repo owns JavaScript behaviour and only the
CSS the Designer cannot express.

That split is deliberate. Repo CSS loads after `webflow.css` (from the Embed
on the canvas, and appended to `<body>` by the footer loader on published
pages), so it wins every specificity tie against the Designer. Any rule
written here that the Designer could have expressed becomes a hidden
override: the next person changes that style in the Designer, nothing
happens, and the only fix is edit `src/` → push → wait for staging → reload
the Designer. Every project built from `wf-template` has lost time to that
loop.

## CSS policy — Designer first

Before writing any CSS, decide where it belongs.

1. **Can the Designer do it?** A class or combo class style, a variable, a
   breakpoint style, a state (hover/focus/current), an interaction. If yes:
   - With the Webflow MCP connected, apply it in Webflow (styles and
     variables tools), then tell the user what was changed.
   - Without the MCP, give the user exact Designer steps: class, breakpoint,
     property, value.
   - Do **not** add it to `src/styles.css` or `src/styles/*.css`.
2. **Repo CSS needs a reason.** Every rule — or the section header comment
   covering a group of rules — carries one tag from this list:

   ```css
   /* repo-css: <tag> — <short why> */
   ```

   | Tag | Use for |
   | --- | --- |
   | `js-state` | Classes/attributes a module toggles (`.is-open`, `.is-loading`, `[data-state]`) |
   | `designer-cant` | Name the feature: `:has()`, complex combinators, `@keyframes`, `@supports`, container queries, `::marker`, `color-mix()`, masks |
   | `third-party` | Swiper, Lenis, Finsweet or other library markup |
   | `canvas-preview` | `.w-editor`, `.wf-design-mode`, `html:not([data-wf-domain])` helpers |
   | `approved-base` | A site-wide base the user explicitly asked to keep in code |
   | `override-webflow` | Overriding a `.w-*` default or a Designer style |

3. **`override-webflow` needs the user's explicit approval** and a
   `GOTCHAS.md` entry explaining why. Ask before writing it.
4. **Never, without that approval:** set `font-size` on `:root`/`html`,
   neutralize `.w-*` defaults, or reference Webflow variable names
   (`--_layout---…`, `--_typography---…`). A renamed variable in Webflow
   silently breaks every rule that reads it — Webflow rewrites its own
   references, never this bundle's.
5. **Ambiguous request?** Say which parts go in the Designer and which go in
   code before editing anything. "Make the heading bigger on mobile" is a
   Designer breakpoint style, not a media query here.

Existing rules predate this policy and are untagged; add a `repo-css` tag to
any rule you touch, and question rules the Designer could own. In particular
`src/styles/site.css` (the migrated CodeSandbox stylesheet) opens with `.w-*`
neutralizers, sets the 1680px fluid `:root` font-size scale and reads
`--_colors---*` Webflow variables by name.

## Read before changing integration

- `README.md` — install, dev mode and environment switcher, Webflow install,
  staging deploy, feature notes (contact form, therapy timeline, benefits
  slider), source map, production plan.
- `loader.html` — three marked pieces (`START HEAD` / `START EMBED` /
  `START FOOTER`); paste each piece, never the whole file:
  1. **HEAD → Site settings → Head code:** theme-color, preconnects, Ahrefs,
     the single Finsweet Attributes tag
     (`fs-mirrorclick fs-list fs-socialshare fs-toc`), `is-loading`/preloader
     rules, and the config script that sets `window.BV` (incl. `RELEASE`) and
     an 8-second unlock watchdog. Webflow already outputs the viewport tag —
     do not add another. Not rendered on the canvas.
  2. **EMBED → the shared `G | Components` component** (top of every page's
     body), two HTML Embeds: the Remix Icon 4.9.0 link plus the static
     staging `bv-css` link, then a script that repoints `bv-css`. Visible on
     the canvas.
  3. **FOOTER → Site settings → Footer code:** removes `#bv-css` and loads
     one matching CSS + JS source at a time (dev → staging fallback, or
     staging, or prod), appending the CSS to `<body>`. Supplies site CSS even
     if a page lacks the Embed.
  `pnpm test:webflow` fails when the published snippets drift from
  `loader.html`. Add new Finsweet attributes to the head tag; never paste
  page-level copies.
- `src/index.ts` boots once (`__RGX_BOOTED`), skips the editor/design mode,
  waits for `Webflow.push` so Webflow wires tabs/dropdowns first, then runs
  the environment switcher, `animation.ts` (shares Webflow's GSAP with
  packaged fallbacks), Lenis, WaveGrid and `main.js`, and always releases the
  loading state in `finally`.
- `src/modules/main.js` is the ordered init list; each feature lives in its
  own `src/modules/<feature>.js` (moved verbatim from the supplied script)
  and is initialised in isolation. `TabDeepLink.init()` and `Anchors.init()`
  are intentionally disabled. Migrated modules stay JavaScript
  (`allowJs`, `checkJs` off); new integration code is TypeScript.
- Swiper features are config-driven (`CONFIGS` in `smart-swiper.js`); add the
  matching Swiper module import when a config uses a new feature.
- CSS: `src/styles.css` imports `styles/site.css`, Swiper's bundle CSS,
  Lenis CSS, `styles/therapy-timeline.css`, `styles/benefit-slider.css`, then
  the former head rules. Keep that order (Swiper loads after the site CSS on
  purpose). Add rules to the file they belong to, never to the end of
  `src/styles.css`.
- Libraries are bundled with `pnpm add` at pinned versions (GSAP 3.15.0,
  Lenis 1.3.24, Swiper 11.2.10), never added as CDN tags. Keep Webflow's
  native GSAP, ScrollTrigger, SplitText and CustomEase settings enabled.

## Webflow canvas facts

- **The Designer canvas never runs scripts.** Swiper sliders show stacked and
  the timeline ruler shows a static 0–12 preview; anything shown only after
  JS runs is invisible there. Use a `canvas-preview` rule if the Designer
  needs to see it (`html:not(.w-editor)` helpers already exist).
- **The canvas shows staging CSS only.** The Embed's static `bv-css` link
  points at `https://brandvm.github.io/regenx/styles.css?v=1`; the script
  that would repoint it to localhost does not run on the canvas. Local CSS
  is never visible in the Designer; push and wait for the staging deploy
  (tests must pass first), then reload the Designer. Bump `?v=` if a cached
  stylesheet persists.
- No live reload on the canvas. Reload the Designer tab.
- Debug "is my CSS loading?" with `background`, not `outline` — outlines on
  `body` paint outside the canvas iframe and get clipped.

## Snippets are not versioned

A push updates the JS/CSS bundles only. Any change to `loader.html` must be
re-pasted into Webflow and published to take effect — say so in the commit
or PR description, and keep `loader.html` identical to what is installed
(`pnpm test:webflow` checks this).

## Commands, dev mode and CI

```bash
pnpm dev                  # watch + assets on 127.0.0.1:3000
pnpm check                # strict tsc for the TypeScript integration code
pnpm build                # minified dist/index.js and dist/styles.css
pnpm exec playwright install chromium  # first browser-test setup
pnpm test                 # build + isolated Playwright regression tests
pnpm test:webflow         # build + read-only checks against published staging
node scripts/check-webflow.mjs --local /  # verify a running pnpm dev server
```

Node 22+ and the pinned pnpm 11. Run `pnpm check` and `pnpm test` before
pushing. `.github/workflows/staging.yml` (push to `master` or manual run):
a `test` job runs `pnpm check` + `pnpm test`; only then does `deploy` build
and publish `dist/` to GitHub Pages. Failed Playwright reports are uploaded
as an artifact.

Dev mode: `https://regen-x.webflow.io/?bv-dev=1` loads assets from
`http://localhost:3000` (allow the local-network-access prompt), `?bv-dev=0`
returns to staging; the choice persists on the staging origin. The bundle's
bottom-left Dev/Staging pill switches modes on `*.webflow.io`. If local CSS
or JS fails, both fall back to staging. For another device, deploy to
staging.

## Release (not yet configured)

There is no production release. When ready (README, "Production — later"):
commit the built `dist/` into a release tag, then set `RELEASE` in the HEAD
snippet (e.g. `"1.0.0"` → `https://cdn.jsdelivr.net/gh/brandvm/regenx@1.0.0/dist/`)
— the one value the Embed and footer both read. Un-track `dist/` again with
`git rm -r --cached dist` in the next commit. Validate both pinned URLs before
publishing to a custom domain; roll back with the prior `RELEASE` value.
Never move a published tag. Never use `@latest` or a branch URL in
production. Replace placeholder content (timeline preview stages, Lorem Ipsum
benefit cards) before the first production release.

## Webflow MCP limits

Worked around, not fixed — do not rediscover these.

- `custom_value` is rejected for Color and Size variables (`color-mix()`,
  `oklch()`, `calc()`). Create those through the variables JSON import with
  `valueType: "custom"`.
- No variable rename or reorder within a collection. Rename in the Designer
  (preserves ids and aliases; recreating does not).
- The WHTML importer drops `class` attributes. Create the style, then apply
  it.
- `get_all_elements` does not descend into component definitions — pass the
  component scope. An element "missing" from a page is usually inside one.
- Concurrent Designer edits change element ids. Re-query on "Element not
  found" instead of assuming deletion.
- Responsive styles are only returned when breakpoints are requested
  explicitly (`include_breakpoints`).

## Session protocol

1. **Start:** read `GOTCHAS.md`. Do not repeat a mistake already logged.
2. **During:** when something surprising costs time — a Webflow quirk, a
   template default that gets in the way, an MCP limitation, a fix that had
   to be reverted — add an entry to `GOTCHAS.md` in the same commit as the
   fix, using the format at the top of that file.
3. **Scope:** tag an entry `template-candidate` when it would recur on any
   project built from `wf-template`; those entries are collected later to
   improve the template. Otherwise tag it `project`.
4. Never delete entries. Update `Status` when something is fixed or
   upstreamed.
