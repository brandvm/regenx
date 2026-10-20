# Lessons: Designer and canvas

How the Designer, the canvas and publishing behave: combos, components, tag styles, forms, grids, empty elements.

Harvested from client builds made from this template (`Scope:
template-candidate` entries in their `GOTCHAS.md`). Module and file names
refer to the project the lesson came from; Status is that project's.

### 2026-10-09 · CMS text bindings inside JSON-LD can break the schema
- Area: designer
- Symptom: adding `"alternativeHeadline": "{{wf subheading}}"` to a CMS
  template's BlogPosting JSON-LD made it invalid on items whose field ends
  with a line break (caught only by validating every CMS page).
- Cause: Webflow inserts PlainText field values raw into custom code: line
  breaks are not escaped (invalid JSON) and apostrophes become `&#39;`
  (valid JSON, wrong text).
- Fix: bind only single-line fields (name, slug, dates, image) in JSON-LD;
  validate every CMS page after a schema change, not a sample.
- Status: open (Webflow behaviour)
- Found by: claude

### 2026-10-09 · Phone hero video: serve what `object-fit: cover` actually shows
- Area: designer, perf
- Symptom: a full-screen 16:9 hero video downloaded the same 6–7 MB file
  on phones, where portrait `cover` shows only the centre strip; the WebM
  source was listed first and was the larger file.
- Fix: first `<source>` = a centre crop (e.g. 540×720 of a 1280×720 file,
  `ffmpeg -vf crop=540:720`) with `media="(max-width: 767px) and
  (orientation: portrait)"`; a 3:4 crop covers every portrait aspect up to
  0.75, so `cover` still fills the box with the same framing (SSIM 0.99
  vs the same crop of the original). Then the desktop MP4; drop the WebM if
  it is larger. Add `poster` = the video's first frame (WebP, a few KB).
  `<source media>` works in Chrome/Firefox 120+ and Safari. Re-encoding the
  desktop files at matching quality saved nothing. A muted preview loop
  that is a full-length YouTube download (with audio) should be a short
  clip instead: 56 MB → 4 MB.
- Status: done
- Found by: claude

### 2026-10-05 · A two-class combo can't be edited from a three-class element
- Area: designer
- Symptom: The value for Section + Is Hero had to be entered, but every
  hero element is Section + Is Dark + Is Hero. Selecting it in the
  Designer edits the chain `.section.is-dark.is-hero`, which would
  not reach a plain `section is-hero`.
- Cause: Webflow edits the exact chain on the selected element.
- Fix: in the selector field, remove the extra class (Is Dark), set
  the value on Section › Is Hero, then add the class back. The CSS
  `.section.is-hero` still matches the three-class element on the page.
  When planning combos, keep shared values on the shortest chain.
- Status: documented
- Found by: human

### 2026-10-05 · Gradient layers have no size/tile in the Designer
- Area: designer
- Symptom: A repeating tick pattern (`repeating-linear-gradient`) could
  not be built in the Designer. Gradient layers offer no size or tile
  settings, and Custom properties refuse `background-size`,
  `background-repeat` and `background-image` (native properties).
- Cause: Webflow only exposes size/tile on image layers, and has no
  repeating gradient.
- Fix: the designer builds the gradient in the Designer with hard stops
  (0% → 17.65% Field, then transparent). The tiling
  (`background-size: 17px 1em; background-repeat: repeat-x`) goes in
  repo CSS, tagged `designer-cant`. The MCP could write it into the class
  (`update_style` accepts it), but nothing in the Designer would show it,
  so it would be a hidden override. the designer chose the repo.
- Status: workaround confirmed
- Found by: human

### 2026-10-06 · Webflow form and dropdown defaults leak through our classes
- Area: designer
- Symptom: the designer spotted the 10px under native inputs. An audit found
  more: every Form Block (`.w-form`) adds 15px below; `.w-dropdown-toggle`
  pads 20px 40px 20px 20px; `.w-dropdown-link` sets colour #222;
  `.w-dropdown` has auto left and right margins.
- Cause: `webflow.css` defaults apply wherever our class doesn't set the
  property. Here the Form Blocks had no class at all: the WHTML workaround
  moves the class onto the inner `<form>` and clears the wrapper.
- Fix: in Webflow, not repo CSS (Designer first, so it stays editable):
  margin-bottom 0 on Select Input; padding 0 on Select Toggle; colour
  inherit on Select Option; left and right margin 0 on Select; new class
  **Form Block** (margin-bottom 0) on every Form Block wrapper. Give every new Form Block that
  class, and check new form or dropdown classes against these defaults.
- Status: fixed (Webflow styles, 2026-10-06)
- Found by: human

### 2026-10-06 · Webflow rewrites roles and drops attributes on publish
- Area: designer
- Symptom: the bundled custom-select never initialised on staging; a static
  `<dialog>` specimen was invisible; Link Blocks gained attributes nobody set.
- Cause: on publish Webflow
  - writes `role="list"` on every List element (our `role="listbox"` and
    `hidden` are gone), so `[role="listbox"]` lookups find nothing;
  - strips the `open` attribute from a `<dialog>`;
  - adds `title` and `aria-label` (equal to the visible text) to Link Blocks.
- Fix: modules find lists by class and set the ARIA role themselves
  (`custom-select.ts`). The style guide's lightbox specimen carries
  `data-static`, and repo CSS hides only `.lightbox:not([open]):not([data-static])`.
  Never rely on a role or boolean attribute surviving a Webflow element;
  check the published HTML.
- Status: fixed (custom-select, lightbox rule)
- Found by: claude

### 2026-10-06 · Native `<button type="submit">` in Webflow forms
- Area: designer
- Symptom: after replacing the FormButton inputs with a DOM `<button>`
  holding the button colour class, the button had UA padding, border and background;
  in the footer it stretched to the form width; on staging it showed
  `disabled` + `w-form-loading`.
- Cause: a native button keeps UA styles unless the class resets them; a
  flex-column form stretches its children; Webflow's Turnstile spam check
  disables every submit until the form scrolls into view and gets a token
  (webflow.js, same for input submits).
- Fix: Button class sets padding 0, border width 0, background transparent,
  font-family and colour inherit, cursor pointer. The newsletter form sets
  align-items flex-start. The Turnstile state is expected; test submits in a real
  browser, not headless.
- Status: fixed (Webflow styles, 2026-10-06)
- Found by: claude + human

### 2026-10-06 · Inter Variable narrows large type (optical size)
- Area: designer
- Symptom: Webflow headings were narrower than the prototype at the same
  size and tracking (hero H1 336 vs 375px).
- Cause: Inter Variable v4 has an `opsz` axis; with the default
  `font-optical-sizing: auto` large text uses the tighter Display cut. The
  prototype's Google Fonts Inter (wght axis only) is the Text cut everywhere.
- Fix: Body tag style › custom property `font-optical-sizing: none`.
- Status: fixed (Webflow styles, 2026-10-06)
- Found by: claude

### 2026-10-06 · Designer canvas draws a templateless grid as 2×2
- Area: designer
- Symptom: icon glyphs in a square box sat top-left on the canvas but centred on staging.
- Cause: `display: grid` with no rows/columns set publishes as a one-cell
  grid, but the Designer previews its default 2×2 template.
- Fix: centre single children with flex (justify/align center), not grid.
  Every grid class sets both tracks explicitly (designer): a missing
  `grid-template-rows` / `-columns` is given `auto`, which matches the
  implicit track, so published CSS behaves the same. Breakpoints inherit
  from base.
- Status: fixed (every grid class, 2026-10-06)
- Found by: human

### 2026-10-06 · Canvas `.wf-empty`: empty elements show as 75px boxes or vanish
- Area: designer
- Symptom: on the Designer canvas, empty shapes (markers, guide lines,
  timeline dot/line, overlays, fades) showed as dashed placeholder boxes;
  once given padding, em-sized ones collapsed to 0×0. Published pages were fine.
- Cause: the canvas adds `.wf-empty` to any element without content:
  `padding-bottom/right: 75px`, `font-size: 0`, `line-height: 0` and a dashed
  outline. em sizes then compute to 0. (First guessed margin — wrong.)
- Fix: every class used on an empty element sets padding 0 on all sides and
  `font-size: inherit` (the live default, so the published page is unchanged).
  Do this for every class used on an empty element: markers, lines, dots,
  overlays, fades, dividers, swatches, map frames and empty wrappers.
- Status: fixed (Webflow styles, 2026-10-06)
- Found by: human

### 2026-10-06 · Split text in Webflow Spans flattens when edited
- Area: designer
- Symptom: editing a numbered step's text from the Settings panel turned
  the styled pieces (marker, number, title, description) into one plain sentence.
- Cause: the importer makes every `<span>` a Webflow text Span; Spans inside a
  text parent (button, paragraph, figcaption, heading, link) are rich-text
  children, and editing the parent's text rewrites them.
- Fix: rebuild each piece as a custom element with tag `span` (same classes and
  attributes), move its text node in, remove the old Span. Standalone Spans in
  plain blocks (chips, labels) are fine.
- Status: fixed for site content
- Found by: human

### 2026-10-06 · Conditional classes are typed slugs, not linked styles
- Area: designer
- Symptom: a component with the conditional class *Is Caps* published
  `figure is-cap`, so the figure lost its placement.
- Cause: the component's "conditional classes" are a custom `class`
  attribute with a Conditional text value. The value is a typed string
  (`is-cap`, one letter short of `is-caps`), not a reference to a style, so
  a typo publishes silently and a class rename in the Style Manager never
  reaches it. The API can't read or edit the value.
- Fix: corrected in the Designer. After wiring a conditional
  class, check the published class list; re-check these attributes whenever
  a combo is renamed.
- Status: open
- Found by: claude + human

### 2026-10-06 · em spacing moved from a button to its wrapper changes size
- Area: designer
- Symptom: a section's button sat 4–5px lower than the prototype, so the
  section ran long and every later section shifted.
- Cause: the prototype put `margin-top: Content/Gap` (em) on the button,
  whose own font size is 0.875em. In Webflow the button is a C | Button
  instance, which can't take page styles, so the margin went on its
  wrapper at 1em, and the same em value computes larger.
- Fix: scale the wrapper's value by the button's font ratio,
  `calc(Content/Gap * 0.875)`, in the Designer. When spacing
  moves from a sized element to its wrapper, convert the em value.
- Status: open
- Found by: claude

### 2026-10-02 · Removing a rule locally does not remove it on the canvas
- Area: designer
- Symptom: A deleted CSS rule still applies in the Designer while `pnpm dev`
  runs.
- Cause: The canvas never runs scripts, so both the staging and the
  localhost `<link>` stay live. They are additive; staging's copy of the
  rule remains.
- Fix: push and wait for staging, or temporarily comment out the `wfc-css`
  link in the Embed.
- Status: documented — v3 canvas shows staging only by default; applies only while the temporary localhost link is in use
- Found by: human

### 2026-10-08 · An Embed with a script hides its stylesheet link on the canvas
- Area: designer
- Symptom: with the stylesheet `<link>` and its `<script>` in one HTML
  Embed, the Designer canvas showed none of the repo CSS.
- Cause: the canvas never runs scripts, and it skips an Embed that
  contains a `<script>` as a whole, so the `<link>` beside it never
  renders there.
- Fix: two Embeds in the global component: one with only the `<link>`,
  then one with only the `<script>` (loader.html pieces 2a and 2b). Keep
  any canvas-visible markup (stylesheets, icon fonts) out of script Embeds.
- Status: fixed in the template's loader.html
- Found by: human

### 2026-10-09 · Image Load (lazy/eager) is per instance; preload doesn't fix render delay
- Area: designer
- Symptom: the LCP image (a hero, or a CMS image on a template page) was
  lazy-loaded. The image element's Load setting (Lazy / Eager) isn't
  exposed through the MCP or the API, and on a component it is set per
  instance.
- Cause: Designer-only setting.
- Fix: set Load › Eager on each LCP instance in the Designer (a manual
  step). To start the download earlier, page head code can add
  `<link rel="preload" as="image" href="…">`; on a CMS template page the
  href can bind a field with
  `{{wf {&quot;path&quot;:&quot;<field-slug>&quot;,&quot;type&quot;:&quot;ImageRef&quot;\} }}`.
  That only moves the download: when Lighthouse shows LCP "render delay",
  the cause is render-blocking resources (stylesheets and scripts before
  the image), which preload does not change.
- Status: documented
- Found by: claude

### 2026-10-13 · A space as an element's only text publishes as `&nbsp;` and shifts an icon
- Area: designer
- Symptom: icons drawn by an icon font sat left of and above their box.
  The element was an inline-flex 1em box with its content centred, holding
  one space so the canvas wouldn't show it as empty.
- Cause: Webflow publishes that space as a non-breaking space. A normal
  space is dropped inside a flex container; a non-breaking one is a flex
  item with a width. The glyph (`::before`) and the space were centred as
  a pair, so the glyph moved by half the space's width.
- Fix: `justify-content` and `align-items` flex-start on the glyph
  element. The glyph fills the box from its corner and the space overflows
  unseen. Check icon alignment on the published page with an outline on
  the element, not by eye.
- Status: fixed in the starter site
- Found by: human

