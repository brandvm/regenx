# Lessons: Repo CSS

Repo CSS against the Designer: cascade, focus, fixed children, overflow.

Harvested from client builds made from this template (`Scope:
template-candidate` entries in their `GOTCHAS.md`). Module and file names
refer to the project the lesson came from; Status is that project's.

### 2026-10-09 · Measure preloads; font preloads can make it worse
- Area: css, perf
- Symptom: font preloads for the heading and body fonts (both
  `font-display: swap`) were expected to help LCP.
- Cause: they compete with the render-blocking CSS for bandwidth.
- Fix: A/B by injecting the `<link>`s into production HTML with Playwright
  route interception (7 runs, median, 4× CPU, slow 4G): fonts gave
  −20–40 ms LCP but +30–100 ms FCP, so they were dropped; an image preload
  for a lazy LCP hero image gave −420 ms on one page and nothing on others
  (a 5 KB SVG; a hero hidden behind IX3). Keep only measured wins.
- Status: done
- Found by: claude

### 2026-10-05 · Horizontal scrollers drag vertically
- Area: css
- Symptom: Slider Track could be dragged up and down while scrolling.
- Cause: with `overflow-x: auto` and `overflow-y` left at visible, CSS
  computes `overflow-y` as auto, so any small vertical overflow scrolls.
  The prototype rule had the same gap.
- Fix: set `overflow-y: hidden` in the Designer on every horizontal
  scroller (Slider Track, Lightbox Thumbs).
- Status: fixed (Webflow styles, 2026-10-05)
- Found by: human

### 2026-10-06 · Template focus rule overrides Designer focus states on inputs
- Area: css
- Symptom: the designer saw a dark square ring around the Select's text input
  only, instead of the brand-colour ring on the whole field. Every Form Input
  showed the same dark ring instead of its Designer Focus Visible state
  (Form/Focus, offset 3px). On click, Form Input's border turned blue.
- Cause: the template's §07 rule `:focus-visible, .w-input:focus-visible,
  .w-select:focus-visible { outline: 2px solid var(--color-accent) }`
  (`currentColor`). The `.w-input` part is 0-2-0, the same as a Designer
  `.form-input:focus-visible`, and repo CSS loads later, so it wins. The
  blue border is webflow.css `.w-input:focus { border-color: #3898ec }`,
  which beats a class's base border colour.
- Fix: the `.w-input` / `.w-select` selectors dropped from the rule (plain
  `:focus-visible` fallback kept). In Webflow: Select Input › Focus
  Visible outline none; Select Toggle › Focus Within outline 2px
  Form/Focus, offset 3px; Form Input › Focus border colour = its base
  border variable. Every input class needs its own Focus Visible state
  and a Focus border colour.
- Status: fixed — the template's focus rule, plus Webflow styles in that project
- Found by: human

### 2026-10-06 · backdrop-filter traps fixed children (floating nav)
- Area: css
- Symptom: with G | Nav W made absolute (the bar scrolls away), the fixed
  menu sheet and floating buttons inside it would scroll away too.
- Cause: `backdrop-filter`, `filter`, `transform` and `will-change:
  transform` make an element the containing block of its `position: fixed`
  descendants. The bar's glass blur and its old auto-hide transform did that.
- Fix: the blur lives on a child, **Nav Bg** (absolute, inset 0, z-index -1);
  G | Nav W has no transform or will-change. Keep those properties off any
  wrapper that holds fixed elements. Related: the bar's toggle starts with an
  SR Only label and the float's doesn't, so the X rules use
  `:nth-child(n of .nav-toggle-line)`.
- Status: fixed in that project's repo
- Found by: claude

### 2026-10-02 · Element resets in §02 beat Designer tag styles
- Area: css
- Symptom: A Designer tag style ("All H2 Headings", "All Links") margin or
  colour has no effect.
- Cause: Webflow emits tag styles as bare element selectors (`h2 {}`),
  0-0-1 — the same specificity as the §02 resets, which load later and win.
- Fix: none yet. Options: wrap the resets in `:where()` (then webflow.css
  defaults return), or drop them and set tag styles in the Designer.
- Status: open
- Found by: claude

### 2026-10-02 · Neutralizers in §03 override Designer styles
- Area: css
- Symptom: A style changed in the Designer has no effect on the page.
- Cause: `src/styles.css` loads after `webflow.css`, so the §03 `.w-*` rules
  win same-specificity ties by source order. `.w-layout-blockcontainer
  { max-width }` silently overrode Designer container caps on one project;
  the `.w-dropdown-toggle` reset broke Webflow's chevron spacing on another.
- Fix: one project removed ten neutralizers so Webflow's own defaults stood
  unopposed. Delete a neutralizer the moment it fights the
  Designer.
- Status: fixed in the template — selectable-component rules removed; only Designer-unselectable internals remain in §03
- Found by: human

### 2026-10-02 · Root font-size scale drifts from Designer tokens
- Area: css
- Symptom: Designer variables named for px values ("Max Width - 1280px")
  render at different sizes; the scale is retuned again and again.
- Cause: The §01 fluid scale sets `:root` font-size, so every rem/em value
  coming out of the Designer scales with it. One project retuned it seven
  times (1680 → 1440 → 1680 → clamp → revert → 1920 → 1440); another found
  em layout tokens rendering 6.25% short.
- Fix: none general. Agree the scale with the designer before building, or
  drop it and let Webflow variables own sizing.
- Status: fixed in the template — scaling now sets the BODY font-size (Osmo), not
  :root, so rem and px-named tokens keep their meaning; frames are tuned per
  project before building
- Found by: human

### 2026-10-02 · Renaming a Webflow variable silently breaks repo CSS
- Area: css
- Symptom: A container cap or token-driven value quietly stops applying.
- Cause: Container/Max Width was renamed to Section/Max Width in Webflow.
  Webflow rewrites its own references but cannot reach this bundle, so
  `var(--_layout---container--max-width, none)` fell back to `none`.
- Fix: avoid referencing Webflow variable names in repo CSS; if one is
  needed, log it here so renames get checked.
- Status: fixed in the template — the template no longer references Webflow variable names; the AGENTS.md policy forbids new ones without approval
- Found by: human

### 2026-10-09 · Prototype generators lose large breakpoints and `.w--` states
- Area: css
- Symptom: with a snapshot of an existing site in the prototype starter:
  styles at Webflow's `large` / `xl` / `xxl` breakpoints (min-width 1280 /
  1440 / 1920) were missing; Current and custom radio Checked / Focused
  came out as invalid pseudo-classes (`:current`); the style guide's
  swatch grids were one column wide, a pill radius in Spacing drew a bar
  wider than the page, full-viewport classes made 100vh library tiles, and
  `gen-style-guide.mjs` crashed on a class slug with `---`.
- Cause: the generators assumed the starter site's snapshot (four
  breakpoints, no class states, a Radius collection, small values).
- Fix: `gen-webflow-css.mjs` emits min-width blocks and `.w--current` /
  `.w--redirected-checked` / `.w--redirected-focus`; `gen-style-guide.mjs`
  stretches `.sg-grid`, caps `.sg-tile` and `.sg-bar`, sends `Radius/`
  variables to the Radius section, and filters empty slug parts.
- Status: fixed in the template's prototype starter
- Found by: claude

### 2026-10-09 · Prototype stand-ins override an existing site's tag styles
- Area: css
- Symptom: with a snapshot of an existing site, prototype headings lost
  their weight, links their colour and images their sizing.
- Cause: `prototype.css` loads last and carried bare element rules
  (`h1…p { font-weight: inherit }`, `a { color: inherit }`, `img {…}`),
  the same specificity as the site's tag styles in the generated
  `webflow.css`, so they won the tie.
- Fix: the stand-ins are wrapped in `:where()`, so any tag style in
  `webflow.css` wins and the stand-ins apply only where the snapshot sets
  nothing.
- Status: fixed in the template's prototype starter
- Found by: claude
