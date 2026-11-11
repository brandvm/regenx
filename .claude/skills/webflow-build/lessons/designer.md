# Lessons: Designer and canvas

How the Designer, the canvas and publishing behave: combos, components, tag styles, forms, grids, empty elements.

Harvested from client builds made from this template (`Scope:
template-candidate` entries in their `GOTCHAS.md`). Module and file names
refer to the project the lesson came from; Status is that project's.

### 2026-10-29 · `display: contents` drops the box's own styling
- Area: designer
- Symptom: after a mobile reorder of a hero, a card lost its frosted
  background, padding and radius.
- Cause: the card was set to `display: contents` so its children could be
  ordered among the hero's other pieces. A `display: contents` element
  renders no box, so its background, border, padding and radius go with
  it.
- Fix: keep the card a box and give the card itself the `order`, so it
  sits in the same place in the mobile order with its children inside.
  Use `display: contents` only on wrappers with no visible styling.
- Status: fixed in that project's Webflow styles
- Found by: claude

### 2026-10-29 · A Collection List inside a flex or grid wrapper loses the wrapper's gap
- Area: designer
- Symptom: FAQ items built as a Collection List sat flush against each
  other, although their wrapper is `display: flex` with a row gap.
- Cause: the Collection List adds two block wrappers (`.w-dyn-list` ›
  `.w-dyn-items`) between the wrapper and the items, so the gap spaces the
  one list wrapper, not the items.
- Fix: put the layout class (flex/grid and gap) on the list's items
  wrapper (Collection List, `.w-dyn-items`), not on an outer wrapper. Any
  CMS list built inside a flex or grid parent needs the same: accordions,
  card grids, sliders.
- Status: fixed in that project's Webflow styles
- Found by: claude

### 2026-10-29 · A lazy image with no width/height takes no space until it loads
- Area: designer, perf
- Symptom: a testimonial card was 55px shorter on staging than in the
  prototype and grew when scrolled to (a layout shift).
- Cause: a small SVG Image (`loading="lazy"`, class `height: auto`)
  published without `width`/`height` attributes, so it is 0px tall until
  it loads; the prototype's `<img width height>` reserved the space.
- Fix: set `aspect-ratio` on the image's class (the style API takes it).
  Any small lazy image with `height: auto` (icons, quote marks, logos)
  needs its aspect ratio on the class.
- Status: fixed in that project's Webflow styles
- Found by: claude

### 2026-10-29 · Empty CMS fields: bound elements are marked, component props aren't
- Area: designer
- Symptom: on a CMS template, an empty image or text field bound to an
  Image or Paragraph published with `w-dyn-bind-empty` (hidden by
  webflow.css), but component instances whose props were bound to empty
  fields published as empty boxes, links with `href="#"`. Conditional
  visibility on a field isn't in the API (`set_visibility` binds to props
  only).
- Cause: Webflow marks only elements bound directly to a field.
- Fix: in the Designer, conditional visibility on the instance; through
  the API, a `designer-cant` rule with `:has()` that hides the instance
  when its bound part is empty (`.card:has(.card-title:empty)`,
  `.cover:has(> .w-dyn-bind-empty)`). A fallback can sit under an
  absolutely placed image that hides itself when empty. A sibling
  selector (a title clamp that looks at the next element) must skip
  `.w-dyn-bind-empty`.
- Status: worked around
- Found by: claude

### 2026-10-28 · A grid child's placement is an ID rule that beats class `order`
- Area: designer
- Symptom: a grid child ignored any `order` set on its class at mobile
  when reordering a section's blocks.
- Cause: once a child has been moved in the grid, Webflow writes its
  placement as an ID rule (`#w-node-…{order:-9999}` in the ≤991px query);
  ids beat classes.
- Fix: order the other pieces around it (e.g. −10001 and −10000 before
  it, −9998 or 0 after it), or reset the child's grid placement in the
  Designer. Wrappers that only group pieces can take `display: contents`
  through a mobile-only combo so shared classes stay untouched (see
  "`display: contents` drops the box's own styling").
- Status: documented
- Found by: claude

### 2026-10-28 · Component variant styles lose to the base class's breakpoint rules
- Area: designer
- Symptom: a Typography Style mode set on a paragraph component's base
  class at mobile also changed paragraphs using its large variant.
- Cause: Webflow publishes variant styles as `.base:where(.w-variant-…)`,
  so they add no specificity. The base class's breakpoint rule comes
  later in the CSS and wins over the variant's desktop rule.
- Fix: when a base style gets a breakpoint override, set the same
  property on each variant that should differ at that breakpoint.
- Status: documented
- Found by: claude

### 2026-10-28 · A mobile-only difference in one instance of a shared variant
- Area: designer
- Symptom: three of four accordion instances needed a different icon on
  mobile; all four used the same component variant.
- Cause: variant styles are per variant, not per instance.
- Fix: duplicate the variant (its desktop styles come along unchanged),
  give the copy its mobile styles, and switch only the instances that need
  it (`set_component_instance_prop_values` on the variant prop). Desktop
  and tablet stay identical.
- Status: documented
- Found by: claude

### 2026-10-28 · Switching a section's theme at one breakpoint
- Area: designer
- Symptom: a section needed the light theme on mobile only; the theme's
  utility class applies at every size.
- Cause: none; this records the method that worked.
- Fix: give the section a mobile-only combo and set the theme
  collection's variable mode on it at that breakpoint
  (`set_style_variable_mode`). The utility class stays, so tablet and
  desktop keep their theme. Also set `color` on the combo to the theme's
  text colour variable at the same breakpoint: the utility class does
  that itself, a mode switch alone doesn't, so text keeps inheriting the
  page colour (dark on dark) — see "A variable mode on a class doesn't
  recolour inherited text".
- Status: documented
- Found by: claude

### 2026-10-27 · Interactive content in a `pointer-events: none` fixed layer
- Area: designer
- Symptom: on production a cookie banner showed but its buttons, close
  icon and link ignored mouse clicks; clicks landed on the page
  underneath.
- Cause: the site-wide fixed layer for global components is
  `pointer-events: none` so it never blocks the page, and the banner
  inside it inherited that. Testing missed it because `element.click()` in
  a script fires the handler without hit-testing.
- Fix: `pointer-events: auto` on the class of anything interactive placed
  in that layer. Test overlays with a real mouse click (Playwright
  `click()`) or `document.elementFromPoint` at the control's centre, never
  only with `el.click()`.
- Status: fixed in that project's Webflow styles
- Found by: human

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
  Update 2026-10-16: on a template, schema with field tokens can only be
  set in the Designer. `bulk_update_pages_schema_markup` (and
  `jsonLdSchema`) accept only valid JSON and re-serialise it; Webflow's
  token
  `{{wf {&quot;path&quot;:&quot;name&quot;,&quot;type&quot;:&quot;PlainText&quot;\} }}`
  isn't valid JSON, every escaped form the API takes comes out wrong, and
  each bound value publishes empty (`"name": ""`). The API is fine for
  static pages. On a template: page settings › Schema markup, type the
  whole block as raw text with the tokens in that form (types
  `PlainText`, `ImageRef`, `Date` → ISO, `Link`; reference subfields as
  `ref-field:name`); the editor turns each token into a chip. Start with
  `<script type="application/ld+json">` (without it the JSON publishes as
  bare text in the head) and don't type `</script>`: the editor adds it,
  and a typed one doubles it. Escape closes the panel and loses unsaved
  text. The result reads back through the API as `rawJsonLdSchema`. Use ’
  rather than `'` in fields that feed it. A template's Open Graph image
  (a collection image field) is a Designer setting too. Head code with
  `set_page_freeform_code` also works (mcp.md, "Page SEO through the API:
  what sticks and where").
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
  Update 2026-10-08: a flex-column form inside a flex parent also came out
  narrower than the prototype and one gap taller. The form's
  `align-self: stretch` sat on the inner `<form>`, but the Form Block
  wrapper is the flex item and shrank to its content; and webflow.js
  appends the Turnstile holder (`div > div > input
  [name="cf-turnstile-response"]`) as the form's last child at runtime,
  which adds one more gap. Fix: the Form Block class sets `align-self:
  stretch`, and repo CSS takes the Turnstile holder out of the flow
  (`position: absolute`); the invisible widget still runs. After a Barba
  swap the widget needs re-rendering (js.md, "Barba: forms dead after a
  page change").
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
  from base. Seen again with a class ported from the prototype that set
  only `grid-template-rows` (a `0fr` → `1fr` open animation): the canvas
  drew the open panel at half width; `grid-template-columns: 1fr` fixed it
  with no change on the published page.
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

### 2026-09-02 · Webflow writes stale size attributes on `<canvas>`
- Area: designer, js
- Symptom: a `<canvas>` drawn by a module rendered at the design-time size,
  or the module didn't find it by its attribute selector.
- Cause: Webflow emits design-px `width` / `height` attributes on a canvas
  element, and sometimes writes a valueless custom attribute as a single
  space (`data-…=" "`), which an `[data-…=""]` or value selector misses.
- Fix: the module removes the `width` / `height` attributes and sizes the
  canvas from `offsetWidth` (times `devicePixelRatio`), then boots on the
  next animation frame and again on `load`. Select by attribute presence
  (`[data-…]`), never by an empty value.
- Status: fixed in that project's repo
- Found by: human

### 2026-09-04 · A variable mode on a class doesn't recolour inherited text
- Area: designer
- Symptom: setting a Colors Semantic mode (e.g. dark) on a class changed
  its background and borders, but text inside kept the parent's colour,
  and so did `currentColor` and everything built on it. Two sites hit it.
- Cause: a mode only redefines the variables on that element. `color` is
  inherited as a computed value, already resolved on an ancestor with the
  ancestor's mode.
- Fix: every class that sets a colour mode **must also declare `color`**
  (the same Text variable again), so it resolves against the new mode.
  Check this whenever a mode is added to or changed on a class.
- Status: documented
- Found by: claude + human

### 2026-09-08 · Duplicate ids in CMS lists and component instances
- Area: designer
- Symptom: labels and ARIA references inside a modal resolved to the first
  instance of a form component on the page; a CMS filter list published
  seven radios with `id="radio"`; imported form fields shared
  `id="field"` with labels at `for=""`.
- Cause: every instance of a component carries the same authored ids,
  every item of a Collection List repeats the Designer id, the Designer
  can't bind an id to a CMS field, and the WHTML importer writes an empty
  For on Form Labels.
- Fix: the starter module `unique-form-ids` gives each duplicate radio,
  checkbox, input, select or textarea a unique id from its label text and
  moves the matching `for` with it (style by class, never by these ids).
  For static forms, set a unique id on every field and a custom `for`
  attribute on each label (the attribute replaces the empty one on
  publish); an id must not equal a section anchor. A module that clones or
  reuses a component's ids elsewhere (a modal) prefixes them and rewrites
  `for` / `aria-*` itself. After any form import, check that every `for`
  matches an id in the same form and no id repeats.
- Status: fixed in the template (`src/modules/unique-form-ids.ts`) for
  radios and checkboxes in lists
- Found by: claude + human

### 2026-10-07 · Typography classes nest in em
- Area: designer
- Symptom: a unit label given a display type class inside a larger display
  figure rendered at 120px instead of a fraction of the figure, and
  wrapped the figure onto two lines.
- Cause: the Typography Role sizes are em values, so a type class inside
  another type class multiplies (1.5em × 80px). The prototype had the same
  effect, only smaller.
- Fix: a small relative class for parts inside a type class (e.g. 0.3em of
  the figure). Don't nest type classes; put the type class on the inner
  element, not on a padded wrapper whose em spacing would scale with it.
  The same with a link inside small text: a link given the text's own
  small type class (to reach a combo like `Body S + Link Underline`)
  rendered at 0.8125em of 0.8125em. Links inside a paragraph take an
  inline link class alone and inherit size from the text.
- Status: fixed in that project's Webflow styles
- Found by: claude

### 2026-10-16 · A Link Block's `max-width: 100%` caps a negative-margin bleed
- Area: designer
- Symptom: rows in a nav dropdown wrapped their descriptions onto two lines
  in Webflow and one in the prototype, although every grid, gap, padding
  and font size measured the same.
- Cause: Webflow publishes Link Blocks with `w-inline-block`
  (`max-width: 100%`). The rows used `margin-left: -1em` so their hover box
  lines up with the label; in the prototype the row grows 1em wider than
  its column, in Webflow the cap keeps it at 100% and the text loses 1em.
- Fix: `max-width: none` on the row's class (or combo). Any Link Block that
  bleeds with a negative margin needs the same. When a Webflow build wraps
  differently from the prototype, compare the element's computed
  max-width first.
- Status: fixed in that project's Webflow styles
- Found by: claude

### 2026-10-15 · A variant's class is compound per element; a border with no colour fades from currentColor
- Area: designer
- Symptom: adding a component variant's class to the nav wrapper on
  scroll (to switch it to its light variant) turned the bar light but left
  its links white. Then the variant's new bottom border flashed dark
  before fading to light grey.
- Cause: Webflow puts the variant's `w-variant-<id>` class on every
  element the variant styles and publishes compound selectors
  (`.nav-link.w-variant-…`), not descendant ones, so the class on the
  wrapper reaches only the wrapper (see also mcp.md, "Variant overrides
  on a combo element never apply"). A border with no colour set is
  `currentColor`, so `transition: border-color` animates from the text
  colour.
- Fix: the module adds the class to the wrapper and, when the wrapper
  opts in with an attribute, to every element inside it; the class name
  comes from a `data-*` attribute set in Webflow, not from the code. The
  base style sets `border-bottom: 1px solid transparent`, so the variant's
  border fades in from transparent. Give any border that a state or
  variant adds a transparent colour in the base.
- Status: fixed in that project
- Found by: human

### 2026-10-14 · Empty slots take cut and paste; date formats and "exclude current item" in the Designer
- Area: designer
- Symptom / cause / fix:
  - the API can't insert into an empty component slot (see mcp.md,
    "Slots: the MCP can work beside a plain element, never start one"),
    and dragging an element onto the slot's Navigator row is refused
    ("can't be dragged into component instances outside of slots").
    Select the element, Cmd+X, select the slot's row in the Navigator,
    Cmd+V: it lands in the slot. Build template content in a wrapper at
    body level, then cut and paste it in;
  - the date format menu of a CMS text binding is a custom list whose
    options often miss a click (also from automation): open it and use
    ArrowDown + Enter, then read the text back;
  - "exclude current item" is a list filter: field = the collection's
    own item reference, condition "is not", value Current item. It
    defaults to "is"; re-open the filter and check before closing;
  - template SEO title and description: page settings › "+ Add field"
    inserts a field token; type plain text around it.
- Status: workaround confirmed
- Found by: claude

### 2026-10-15 · A capped bleed sticks to the left on wide screens; Finsweet's filtered count is `results-count`
- Area: designer
- Symptom: (1) on 2000px+ screens a hero panel with a max-width and
  negative side margins (a bleed past the rails) sat against the left
  edge with a wide gap on the right. A device check at fixed widths that
  looked only for overflow didn't catch it. (2) A "Showing N items" count
  stayed at the total with a filter on.
- Cause: (1) once the parent is wider than the cap, nothing centres the
  panel: the negative left margin still applies and the right side takes
  the slack. (2) In Finsweet List v2 `fs-list-element="items-count"` is
  the total; the filtered number is `results-count`.
- Fix: (1) margin-left and margin-right
  `max(-1.875em, calc((100% - 105em) / 2))` (bleed and cap as values):
  the bleed below the cap, centred above it. The API accepts the value
  and the Designer keeps it. Any capped element with negative margins
  needs the same (and a Link Block also needs `max-width: none`, see "A
  Link Block's `max-width: 100%` caps a negative-margin bleed"). Check
  wide screens by comparing an element's left and right gaps, not only
  overflow. (2) `results-count` on the count element (`recipes/finsweet/`);
  style the count for every state of its chip, not only the active one.
- Status: fixed in that project's Webflow styles
- Found by: human

### 2026-09-15 · An IX3 entrance's hidden start state has no fallback
- Area: designer, css
- Symptom: CTA groups and hero text authored hidden for an IX3 entrance
  can stay invisible for good if IX3 never starts (a script error, a
  blocked chunk).
- Cause: the hidden start state lives in Webflow; nothing reveals it when
  `html` gets `w-mod-js` but never `w-mod-ix3`.
- Fix: a visibility-only fallback in repo CSS on
  `html.w-mod-js:not(.w-mod-ix3)` for the elements IX3 hides, which stops
  matching once IX3 runs. It sets `visibility` only, never display,
  opacity or transforms, so it can't fight the interaction. A module that
  hides content for its own entrance needs the same kind of exit (see
  js.md, "gsap.from() start state reverts on load: hero flickers").
- Status: fixed in that project's repo
- Found by: codex

### 2026-08-21 · A page loader with no exit except a Webflow interaction
- Area: designer, css
- Symptom: risk of a permanent full-screen overlay.
- Cause: the page loader was fixed at the top z-index, and only the
  page-load interaction set it to `display: none`; if the interaction
  doesn't run, the page stays covered.
- Fix: a CSS backstop in repo CSS: the loader fades out after 4 s on its
  own (a `@keyframes` fade), off on the canvas (`html.wf-design-mode`)
  and skipped under reduced motion. Any overlay that a script or interaction
  removes needs an exit that works without it.
- Status: fixed in that project's repo
- Found by: human
