# Lessons: Webflow MCP and API

What the Webflow MCP tools (element and WHTML builders, styles, variables, components, CMS) do differently from what you would expect, and the workaround for each.

Harvested from client builds made from this template (`Scope:
template-candidate` entries in their `GOTCHAS.md`). Module and file names
refer to the project the lesson came from; Status is that project's.

### 2026-10-09 · Upload a local file as an asset without a public URL
- Area: mcp
- Symptom: `asset_tool › upload_image_by_url` only takes a public URL, so a
  locally optimised image or video seemed to need a commit/push or a manual
  upload.
- Cause: the Designer-side tool fetches remotely; the Data API route is
  not obvious.
- Fix: `data_assets_tool › create_asset` with the file name and the **MD5
  hex** of the bytes returns `uploadUrl` + `uploadDetails`; POST them as
  multipart form fields with curl (`-F key=… -F Policy=… -F
  X-Amz-Signature=… -F Content-Type=… -F "file=@path;type=…"`), expect
  201. The file is on `cdn.prod.website-files.com` at once and answers byte
  ranges (206), so MP4s work in Safari. Then set it: an Image element via
  `set_image_asset`, a component Image prop via
  `set_component_instance_prop_values` with `type: "string"` and the asset
  id. An instance showing `hasOverride: false` uses the component default —
  override that instance rather than changing the default, which other
  instances inherit. Caution: on another project, uploads made this way
  stayed at size 0 with no variants and components kept showing their
  default image (see "API-uploaded assets stay size 0 and don't render in
  components"). After uploading, check `get_asset` size and variants and
  look at the published page before relying on it.
- Status: worked around
- Found by: claude

### 2026-10-09 · `set_attributes` works on DOM elements, fails on Image elements
- Area: mcp
- Symptom: `crossorigin` on an Image element failed with an internal error
  (twice, Designer connected); Image settings expose no attributes key.
- Cause: unknown; Image elements don't take custom attributes over the API.
- Fix: the same call works on DOM elements (`video` `poster`, `source`
  `src`/`type`/`media`), on Links (`aria-label`, also inside component
  definitions with `scope_component_id`), on form labels (`for` — Webflow
  emits `for=""` by default, and the attribute replaces it) and on DOM
  `button`s. For an Image, add the attribute in the Designer (manual
  step). CMS-bound attribute values (e.g. `aria-label` = item title on a
  card link) go through `set_settings` › `attributes` with `value_binding`
  — it replaces the whole list, so read the existing attributes first.
- Status: worked around
- Found by: claude

### 2026-10-09 · `publish_site` wants custom domain IDs, and counts toward the 1/min limit
- Area: mcp
- Symptom: `customDomains: ["www.example.com"]` → 400 "valid custom domain
  ID"; a retry straight after → 429 "at most once per minute".
- Cause: the parameter takes the domain IDs from `get_site` ›
  `customDomains[].id`, not hostnames; staging and production publishes
  share the per-site limit.
- Fix: read the IDs once (`get_site`); wait out the limit with a timed
  loop. Staging-only = `publishToWebflowSubdomain: true, customDomains: []`.
- Status: worked around
- Found by: claude

### 2026-10-02 · Only one collection can take breakpoint auto-modes
- Area: mcp
- Symptom: `create_variable_mode` with `breakpoint_id` worked for Typography
  Role, then failed for Layout with `[Conflict] The operation could not be
  applied to the style block store` (BATCH_FAILED), even for one mode alone.
- Cause: unconfirmed — most likely a breakpoint can drive the auto-mode of
  one collection only, and Typography Role already held medium/small/tiny.
- Fix: Layout modes created without `breakpoint_id`; the Body tag style sets
  the Layout mode at Tablet, Mobile Landscape and Mobile instead (the
  pattern earlier projects used). Either do the same for every responsive
  collection, or pick the one collection that gets auto-modes up front.
- Status: open
- Found by: claude

### 2026-10-02 · Style MCP rejects variables on row-gap / column-gap
- Area: mcp
- Symptom: `create_style` failed with `Property row-gap does not support
  setting a variable of type length`; the failure also blocked every combo
  of that class (`Parent style "S Wrapper" not found`).
- Cause: the MCP only accepts variables on the legacy gap names.
- Fix: bind `grid-row-gap` / `grid-column-gap` instead — they render as
  `row-gap` / `column-gap` on flex and grid alike.
- Status: open
- Found by: claude

### 2026-10-02 · "Label" is a reserved class name
- Area: mcp
- Symptom: `Style with name Label is reserved and cannot be used`.
- Cause: Webflow reserves names of its own elements.
- Fix: class is `Label Text` (as on earlier projects); the Typography Styles
  mode stays `Label`. Update 2026-10-05: only the API refuses the name —
  a `Label` class can be created in the Designer (see the Form entry).
- Status: fixed
- Found by: claude

### 2026-10-02 · Tag styles other than body are unreachable by MCP
- Area: mcp
- Symptom: `update_style` on `h1` / `All H1 Headings` → `Style "h1" not
  found`; `create_style` would only make a class.
- Cause: Webflow creates heading/paragraph/link tag styles lazily, the first
  time they are styled in the Designer. `body` exists from the start.
- Fix: set All H1–H6 Headings and All Paragraphs (margin 0) and All Links
  (color inherit) once in the Designer; after that the MCP can update them.
  Confirmed 2026-10-05: just selecting the tag in the Selector field does
  not create the style. A property must be set. Once it is, the style is
  addressable as `h1` (id `default-h1`) and up, `p` and `a`. It
  carries Webflow's defaults (h1 38px / 700 / margin-bottom 10px), and
  `set_style_variable_mode` works on it. `get_styles` lists only `body`
  until then.
- Status: workaround confirmed
- Found by: claude

### 2026-10-05 · `mode_id: "base"` fails on variable updates
- Area: mcp
- Symptom: `update_*_variable` with `mode_id: "base"` returned `An internal
  error occurred` (OPERATION_FAILED) for every variable, while the same
  call with a named mode id (Tablet, Mobile…) succeeded. `get_variables`
  does list the default mode as `modeId: "base"`.
- Cause: the update API does not accept the id it reports for the
  default mode.
- Fix: omit `mode_id` to write the Base mode value. Checked: the other
  modes' values stay as they were.
- Status: open
- Found by: claude

### 2026-10-05 · Style values containing `var()` collapse to one variable
- Area: mcp
- Symptom: `create_style` with `property_value`
  `calc(var(--_layout---section--padding-h) * -1)` stored a plain binding
  to Section/Padding H (positive). A `linear-gradient(…var(--a)…, var(--b))`
  and a `box-shadow: 0 0 0 1em var(--c)` both stored only the first
  variable. The call reports success.
- Cause: the API detects a Webflow variable name in the value string and
  replaces the whole value with a binding to the first variable it
  finds.
- Fix: never send a value that mixes `var()` with math, gradients or
  shadows. Bind single variables with `variable_as_value`; set calc,
  gradient and shadow values that reference variables in the Designer
  (variable picker), and read them back.
  Update 2026-10-05: the read side is lossy as well. the designer's
  Designer-entered `calc(⟨Section/Padding H⟩ * -1)` on Slider Track and
  `calc(100% + ⟨Spacing/4⟩)` on Select List both read back through
  `query_styles` as a plain `{id}` binding. A calc value therefore can't
  be confirmed through the MCP; check it on the canvas.
- Status: open
- Found by: claude

### 2026-10-05 · "Form" is a reserved class name; outline-width takes no variable
- Area: mcp
- Symptom: `create_style` "Form" → `Style with name Form is reserved and
  cannot be used` (like "Label"). `outline-width` bound to Spacing/2 →
  `Property outline-width does not support setting a variable of type
  length`; the whole create failed.
- Cause: Webflow reserves its element names; the style API only accepts
  variables on some length properties (see the row-gap entry above).
- Fix: the reservation is on API create only. the designer created "Form" (and
  "Label") in the Designer, after which `update_style` styled Form
  normally. So: create a reserved name in the Designer, then style it
  through the MCP. Outline width set as the literal 0.125em (Spacing/2's
  value) on the thumbnail's Is Active combo.
- Status: workaround confirmed
- Found by: claude

### 2026-10-05 · WHTML importer: classes, forms, images and limits
- Area: mcp
- Symptom: Building the style guide with `data_whtml_builder` turned up
  the following (it contradicts the "importer drops class attributes"
  line in AGENTS.md › Webflow MCP limits):
  - classes are kept, mapped onto existing styles by slug;
  - an element whose class list has no existing combo chain (e.g.
    `section is-dark is-hero`) gets a new, empty combo entry, named
    with the lowercase slug (`is-hero`);
  - `<label>`, `<input>`, `<select>`, `<textarea>` outside a `<form>` reject
    the whole batch ("Field Label can only be placed in a Form");
  - a `<form class="form">` becomes FormWrapper › FormForm with the class
    on the wrapper;
  - `<img src>` pointing at the site's own CDN asset URL is inserted
    without an asset link ("not found in the asset library");
  - DOM elements (svg, figcaption, dialog) also keep a literal `class`
    attribute next to their styles;
  - one root element per action, at most 5 actions per call; ~15 KB per
    action worked, an 80 KB section dropped the socket (xhr poll error);
  - every `<span>` becomes a text Span, including empty decorative shapes
    (timeline dot/line, guide lines, markers). the designer flagged these. Use
    `<div>` for shapes in import markup, and keep `<span>` only for
    inline text or where HTML requires it (inside `<button>`).
- Cause: importer behaviour; the asset lookup does not match CDN URLs.
- Fix:
  - the empty combo chains are how Webflow stores 3+ classes, so they
    are harmless;
  - wrap form controls in a `<form>`, then move the class to FormForm and
    clear the wrapper with `set_style`;
  - bind images afterwards with `set_image_asset` (asset id = the 24-hex
    prefix of the CDN filename);
  - split big sections into a shell plus one action per child;
  - to swap a Span for a Div Block: insert the `<div>` "before" the span,
    `move_element` its children in (images keep their asset), then
    remove the span.
  - AGENTS.md's importer line should be corrected (not edited here: agent
    rules change only with the user's OK).
- Status: open
- Found by: claude

### 2026-10-05 · Component props: what the MCP can and can't wire
- Area: mcp
- Symptom: Building components through the MCP showed these limits:
  - `transform_element_to_component`, `create_prop`, prop bindings
    (`set_settings` with a prop source: text, link, image, alt, DOM id,
    attribute values), variants with `set_variant_styles`, and
    `ComponentSlot` creation all work;
  - a Span's text can't be bound (no `text` setting). Only Text Block,
    Paragraph, Heading, Link and Button text can;
  - a slot can't be renamed (`update_prop`: "not an updatable prop
    type"), and elements can't be moved into an instance's slot ("Anchor
    element not found");
  - `insert_component_instance` can't use an instance as the
    before/after anchor. Append to the parent instead;
  - there is no prop type for a heading tag;
  - an image prop has no default. Instances show no image until
    `set_component_instance_prop_values` sets the asset id (type
    `string`). A variant is set the same way, through the "Variant" prop
    with the variant id.
- Cause: MCP surface limits.
- Fix: build bindable text as `<div>` (Text Block), not `<span>`. Rename
  slots and fill them in the Designer (a manual step).
- Status: open
- Found by: claude

### 2026-10-05 · WHTML importer turns `<button>` into a link
- Area: mcp
- Symptom: Every imported `<button>` became a Webflow Link element that
  renders `<a type="button">` with no href: not focusable, no button role.
  This hit lightbox triggers, slider arrows, the menu toggle, tabs and steps.
- Cause: importer behaviour; Webflow has no plain button element outside
  forms.
- Fix: create a DOM element with `set_dom_config: { dom_tag: "button" }`,
  the same classes and attributes (`type="button"`), move the children in
  (`move_element` also moves bare text nodes), then remove the Link.
  Instances can't be anchors, but definitions accept `scope_component_id`.
- Status: fixed (every imported button rebuilt)
- Found by: claude

### 2026-10-05 · Sitemap indexing API is plan-gated
- Area: mcp
- Symptom: `update_page_sitemap_status` → 403 `Site plan doesn't support
  sitemap indexing controls`.
- Cause: the site has no site plan yet. It is being built on the
  freelancer Workspace plan, and both the API and the Designer toggle need a
  site plan.
- Fix: exclude pages from the sitemap and site search in Page settings;
  add `noindex` via page head code (manual steps).
- Status: open
- Found by: claude

### 2026-10-06 · Element builder: rejected actions can still leave an element
- Area: mcp
- Symptom: `data_element_builder` returned `"placeholder" is a reserved
  attribute name` for a FormTextInput, yet a bare input (no placeholder,
  `required` on) was inserted anyway. It surfaced later as a duplicate.
- Cause: the element is created before the attributes are validated.
- Fix: after any builder error, re-query the parent and remove strays.
  `placeholder` has no setting either; set it in the Designer, or bind a
  text prop to `data-placeholder` and copy it to `placeholder` from script.
- Status: open
- Found by: claude

### 2026-10-06 · TextBlock builder makes an uneditable Block; WHTML drops fs-* attributes
- Area: mcp
- Symptom:
  - `type: "TextBlock"` produced a Block with "This is some text inside of
    a div block." and `set_text` answered "This element doesn't support
    text"; the requested `set_text` was ignored;
  - WHTML import of a `<select>` kept the class and options markup but
    dropped `name` and every `fs-*` attribute, and the API can't read
    select options back;
  - a `<div>` imported by WHTML then refused every write (`[Conflict] The
    operation could not be applied to the component map`, BATCH_FAILED)
    while other elements on the page updated fine.
- Cause: MCP surface limits / importer behaviour.
- Fix: build text as `type: "Paragraph"` with `set_text`. Re-add attributes
  with `set_attributes` and `name` via `set_settings` after an import. If an
  element keeps returning the component-map conflict, rebuild it with the
  element builder and remove the old one.
- Status: open
- Found by: claude

### 2026-10-06 · CMS API: Number fields are integers; new collections need a site publish
- Area: mcp
- Symptom: `create_collection_static_field` type Number always returned
  `format: integer`, and `update_collection_field` only takes name, help
  text and required, so a decimal value (1.03) can't be stored. Publishing the new
  items returned 409 `The site is not published`.
- Cause: the field API has no number format; items in a collection whose
  template page has never been published can't be published alone.
- Fix: set decimal fields' format in the Designer (a manual step) before
  entering values. Create items with `isDraft: false`, then publish the
  site once; the items go live with it. Image fields accept `{ fileId,
  url, alt }` of an existing asset and are copied into the CMS CDN. Alt
  belongs on the image field (no separate alt fields); it is stored per
  file within a field, so a file repeated in one multi-image field shares
  one alt.
- Status: open
- Found by: claude

### 2026-10-06 · WHTML drops the whole class list if one class is missing
- Area: mcp
- Symptom: 82 table cells imported as `body-s table-value` and
  `card-copy heading-group` came in with no classes at all.
- Cause: if any class in the list doesn't exist yet, the importer drops
  all of them, silently.
- Fix: create every class before importing, then re-query the imported
  elements' `styleNames` and fix stragglers with `set_style`.
- Status: open
- Found by: claude

### 2026-10-06 · Nested button components: what the MCP can't do
- Area: mcp
- Symptom: building C | Button (Color › Size › Content):
  - a variant prop can't be exposed from a nested instance through the API;
  - `set_style ["Button Color","Button Size"]` fails unless that combo already
    exists;
  - an instance can't be used as a before/after anchor.
- Cause: MCP surface limits.
- Fix: the designer linked the variant props in the Designer ("Link to new prop").
  Insert relative to a plain element or append to the parent.
- Status: open
- Found by: claude

### 2026-10-06 · `remove_style` only sees usages on the page in context
- Area: mcp
- Symptom: `remove_style` "G | Page Wrapper" kept failing with "Ensure there
  are no usages" although no element on the style guide used it.
- Cause: the 404 page used it. After that element was switched, the remove
  still failed with the style guide's pageId and succeeded with the 404's.
- Fix: query every page (`list_pages`, then `query_elements` with
  `style`) before removing a class, and call `remove_style` from the page
  that held the last usage.
- Status: workaround confirmed
- Found by: claude

### 2026-10-06 · Importer drops <img> attributes; Webflow drops valueless video booleans
- Area: mcp
- Symptom: an image zoom scene didn't run; a `<video autoplay muted loop>` published
  without `muted` and `loop`, so autoplay was blocked.
- Cause: WHTML keeps attributes on most elements but none on `<img>`
  (`data-*` hooks, `loading`, `decoding` all gone). Webflow strips
  boolean attributes with an empty value from DOM elements on publish.
- Fix: re-add image hooks with `set_attributes` after every import.
  Give boolean attributes a value (`muted="true"`), per the designer. The C | Video
  component binds each attribute *name* to a text prop (default `muted`,
  value `true`); clearing the prop turns it off.
- Status: workaround confirmed
- Found by: human + claude

### 2026-10-06 · API gaps met building a home page
- Area: mcp
- Symptom / workaround:
  - a Link Block in a Collection List can't be pointed at the current
    item: `static_link` mode `collectionPage` publishes the literal slug and
    mode `page` publishes the list page. Designer: Link › Current <Item>;
  - element visibility binds only to boolean props, so "show when this
    text prop is set" is Designer-only (C | Video sources);
  - option field values can't be renamed, and a page can't be moved into a
    folder (`create_page` / `update_page_settings` take no parent);
  - `set_style` with a 3-class chain fails unless that exact chain exists:
    create the combo with `parent_style_names: [A, B]` first;
  - custom properties accept `mask-image` etc. but refuse `-webkit-` prefixes;
  - a link-type component prop takes `link_mode` `url|email|phone|popover`
    only (no page links), with `link_to`.
- Status: open
- Found by: claude

### 2026-10-06 · Line breaks in headings drop the word space
- Area: mcp
- Symptom: heading outlines read "Built.Together", "tolong-term":
  text split with `<br>` had no space at the break.
- Cause: the prototype markup had none (`Built.<br>Together`), and the
  tools don't help: the WHTML importer trims a normal space before `<br>`,
  and `set_text` with "\n" on a Heading stores a literal newline (published
  as a space, so the visual break is lost). Only text *props* turn "\n"
  into `<br/>`.
- Fix: re-import the heading as `Line one.&nbsp;<br>Line two.`: the
  non-breaking space survives as its own text node and is invisible at the
  line end. For a text prop, put a space before the newline
  ("Line one \nline two"). Re-add attributes after a re-import (`data-hero-item`).
- Status: fixed (Webflow, 2026-10-06)
- Found by: human + claude

### 2026-10-08 · Variable writes hit a rate limit; breakpoint auto-modes work on a fresh collection
- Area: mcp
- Symptom: setting up a base system (8 collections, ~200 variables),
  one `data_variable_tool` call with 30 creates after ~75 earlier writes
  returned `429 Too Many Requests` for its last 10 actions; the first 20
  in the same call had succeeded. `create_variable_mode` with
  `breakpoint_id` (medium, small, tiny) worked on a new Typography Role
  collection.
- Cause: the Data API rate-limits per minute; actions in one call run
  one by one, so a long call fails partway.
- Fix: send variable writes in calls of about 20 and pause between them;
  after a 429, re-send only the actions that failed (the result lists
  each one). Give breakpoint auto-modes to Typography Role before any
  other collection (see "Only one collection can take breakpoint
  auto-modes").
- Status: workaround confirmed
- Found by: claude

### 2026-10-08 · Breakpoint variable modes don't read back; tag styles need the right site
- Area: mcp
- Symptom: `set_style_variable_mode` on `body` for Layout at medium,
  small and tiny reported success, but `get_style_variable_modes` with a
  `breakpoint_id` listed only Typography Role's breakpoint auto-mode. The
  Designer showed Layout = Tablet on Body at Tablet, so the write had
  worked. Without a breakpoint (`h1` → Typography Styles H1) the read was
  correct. Separately, tag styles a person set "in the Designer" were
  invisible to every style call until they were redone in the Designer of
  the right site (two sites in the workspace had near-identical short
  names), and two empty classes created on a throwaway element and then
  left unused did not exist afterwards.
- Cause: the read only returns auto-modes for breakpoints; the tag-style
  and class cases were the wrong site and empty classes not being kept.
- Fix: confirm breakpoint modes on the canvas (select the element, switch
  breakpoint, Variable modes), not through the MCP. Before asking for
  Designer steps, give the Designer link from the MCP's own error message
  (it names the site's short name) and re-check with `get_styles` before
  writing. Reserved classes (Label, Form) need one property and an
  element that keeps them until the style guide holds them.
- Status: workaround confirmed
- Found by: human + claude

### 2026-10-08 · Filled slots read back empty
- Area: mcp
- Symptom: after a person turned `main` in a page-shell component into a
  slot and put a page's section in it, `get_all_elements` on that page
  listed the instance's slot with `children: []`. The section was there:
  `query_elements` by style or type found it, with new element ids.
- Cause: the page tree read does not descend into slot content.
- Fix: check slot content with `query_elements` (style, type or text
  filter), not the page tree. Expect new ids for anything that moved into
  a slot.
- Status: workaround confirmed
- Found by: claude

### 2026-10-08 · Slots: the MCP can work beside a plain element, never start one
- Area: mcp
- Symptom: putting page content into a page-shell component's slot. Failed:
  `move_element` with the instance (or the slot id as `prop`) as anchor
  ("Anchor element not found", "Cannot append an element to a component
  instance"); moving or building before/after a component instance that
  sits in the slot ("Cannot move an element before a component
  instance", "Cannot insert elements directly into a component
  instance"); building into the slot of the definition with
  `scope_component_id` ("Missing element"). `insert_in_slot` works, but
  only for component instances. Worked: `data_element_builder` with
  `creation_position: "after"` a plain element that is already in the
  slot. The new element lands in the slot.
- Cause: the API addresses slot content only through an existing plain
  child; an empty slot, the slot itself and instances can't be anchors.
- Fix: once a page's slot holds one plain element, Claude builds (and
  moves) everything else next to it. The first element gets there by a
  person dragging one placeholder in, or by creating the page as a
  duplicate of a page whose slot already holds one (`create_page` with
  `duplicateOf`). Failed builder calls here left no strays, but re-query
  anyway (see "Element builder: rejected actions can still leave an
  element").
- Status: workaround confirmed. Run end to end on a style guide page:
  To Slot wrapper appended to the body (building after the shell
  instance is refused), dragged into the slot by a person, section moved
  out `before` the wrapper, wrapper removed.
- Found by: human + claude

### 2026-10-08 · Element snapshots can show stale styles
- Area: mcp
- Symptom: after restyling a nav wrapper (absolute, side padding from a
  variable), `element_snapshot_tool` kept rendering the old layout, with
  the nav text flush left, pixel for pixel the same as before the change.
  The published staging page had the new styles (56px padding, nav over
  the page). Snapshots also failed outright ("status: undefined") for
  elements on a page the Designer did not have open.
- Cause: unconfirmed; the snapshot seems to render a cached state of the
  canvas, and only for the page currently open in the Designer.
- Fix: treat a snapshot as a rough check. Confirm a style change on the
  published webflow.io page (computed styles in the browser) before
  changing anything else because of a snapshot.
- Status: open
- Found by: claude

### 2026-10-09 · WHTML importer turns inline styles into `inline-div-N` combos
- Area: mcp
- Symptom: importing style guide swatches written as
  `<div class="sg-swatch-color" style="background: var(--…)">` created 71
  new combo classes on Sg Swatch Color, named `inline-div-1` … `-71`, each
  holding the raw `background: var(--…)` string.
- Cause: the importer converts every `style` attribute into a combo class
  instead of keeping it as an attribute or an element style.
- Fix: never put `style=""` in import markup. Pre-create a role combo per
  value (e.g. `Is Bg Accent`, `background-color` bound to the variable
  with `update_style`, which binds `var(--…)` correctly) and import with
  classes only. If it happened: rename each `inline-div-N` to its role and
  replace its value with the bound property.
- Status: workaround confirmed
- Found by: claude

### 2026-10-09 · API-uploaded assets stay size 0 and don't render in components
- Area: mcp
- Symptom: images uploaded through the assets API (presigned S3 upload,
  201 returned, the CDN served the right bytes) and set on component
  image props showed the component's default image on the canvas and the
  published page. `get_asset` reported size 0 and no variants.
- Cause: Webflow never finished processing the upload, so the asset has
  no variants and the Designer falls back to the default.
- Fix: don't rely on API uploads for images used in the Designer. Replace
  an existing asset in the Designer (Assets panel › Replace), which keeps
  its id and every usage, or bring images in through a CMS image field
  (next entry). Check `get_asset` size and variants after any upload.
  Update 2026-10-14: on another project an API-uploaded image did render,
  but with no `-p-500` … variants and no `srcset`, so phones downloaded
  the full-size file (mobile Lighthouse lost two points). `set_attributes`
  refuses `srcset` and `sizes` on an Image element ("An internal error
  occurred") while accepting `loading` and `fetchpriority`. Pick the image
  in the Designer (the variants are made then), or until then bind a file
  sized for phones first.
- Status: open
- Found by: claude

### 2026-10-09 · CMS image fields re-host an image from a public URL
- Area: mcp
- Symptom: images needed to get into the CMS (and rich-text bodies)
  without the assets API (see the entry above).
- Cause: —
- Fix: set the image field (or the rich-text `<img src>`) to a public URL;
  Webflow fetches the file and copies it to its own CDN. Host the files
  temporarily (any public static host), write the items, read them back
  and check every URL is now on the Webflow CDN, then delete the
  temporary host. Alt text goes on the image field. Files over 4 MB are
  dropped without an error (see "CMS images over 4 MB are dropped
  silently").
- Status: workaround confirmed
- Found by: claude

### 2026-10-09 · A box-shadow with a variable can't be set through the API
- Area: mcp
- Symptom: a focus ring's inner band `box-shadow: 0 0 0 2px var(--…)`
  stored as a plain binding to the colour variable (no shadow), as the
  "Style values containing `var()`" entry describes.
- Cause: the style API replaces any value that contains a Webflow variable
  with a binding to that variable.
- Fix: set the shadow through the API with the variable's literal value
  (`0 0 0 2px #1a1aff`), then rebind the colour to the variable in the
  Designer (shadow colour › variable picker). List those rebinds as
  manual steps.
- Status: workaround confirmed
- Found by: claude

### 2026-10-13 · WHTML import with `css` creates the classes too
- Area: mcp
- Symptom: creating ~50 classes one `create_style` call at a time is slow,
  and each needs longhand properties written out.
- Cause: none; the importer has a second input that was not in use.
- Fix: pass the rules as the WHTML builder's `css`. It creates every class
  in that CSS (used in the markup or not) with longhand properties, hover
  states, combos and the three max-width breakpoints. What it can't take:
  `var()` and `calc()` with variables (use plain values, then bind
  variables with `update_style`), `rgb(r g b / a)` (write `rgba()`), a
  font stack (only the first family is kept, with a "missing font"
  warning).
  Classes are named by their slug (`sg-row-meta`): rename each one
  afterwards (`rename_style`), which keeps the selector.
- Status: workaround confirmed
- Found by: claude

### 2026-10-13 · The importer drops section ids and new-tab targets; an element without an id can't be a link target
- Area: mcp
- Symptom: a section imported with `id="forms"` came in with no id (twice),
  `set_attributes` `id` failed with "An internal error occurred", and
  `set_link` (type element) to that section failed the same way. Every
  other section kept its id and linked fine.
  Update 2026-10-14: on another project a section imported with an
  ordinary id (`id="location"`) also published without it, and links
  imported with `target="_blank"` opened in the same tab.
- Cause: Webflow refuses `forms` as an element id (most likely because it
  shadows `document.forms`); `set_link` needs the target to have an id.
  The importer also drops some other ids for no visible reason, and turns
  `target` and `rel` into custom attributes (next to a custom `href`)
  instead of link settings.
- Fix: use another id (`form-elements`). When `set_link` to an element
  fails with an internal error, check the target's id first. After every
  import, read back each section id and set missing ones with
  `set_dom_id`; set new-tab links through `set_settings` key `link`
  (`static_link` with `open_in_new_tab`) and remove the custom `href`,
  `target` and `rel` attributes the importer left (for `rel`, see
  "Unlinked instances lose conditional classes; link `rel` doesn't
  publish").
- Status: workaround confirmed
- Found by: claude

### 2026-10-13 · No reorder for variables: swap names and values instead
- Area: mcp
- Symptom: six weights added to a group appeared after the three older
  ones (Regular, Medium, Bold, Thin, Extra Light…); the API can only
  reorder collections.
- Cause: a variable keeps the position it was created in.
- Fix: treat the positions as slots. Rename the slots to temporary names,
  give each slot the value and name it should have in order, and re-point
  what referenced the old slots (aliases with `existing_variable_id`,
  classes with `variable_as_value`) at the slot that now holds that value.
  Updating an alias without `mode_id` also updates the modes that follow
  the base. Read the published CSS afterwards. In the Designer the same
  job is a drag.
- Status: workaround confirmed
- Found by: claude

### 2026-10-13 · A collection's modes do nothing until a style sets them
- Area: mcp
- Symptom: the Layout variables had Tablet and Mobile values, but the
  published CSS declared each variable once: nothing changed with the
  breakpoint. The type roles did change.
- Cause: only Typography Role had its mode set on the Body tag style at
  each breakpoint; Layout had none (and no breakpoint auto-mode).
- Fix: `set_style_variable_mode` on `body` with `breakpoint_id` medium,
  small and tiny, once per responsive collection. Check with
  `get_style_variable_modes`, then count the variable's declarations in
  the published CSS (one per mode).
- Status: fixed in the starter site
- Found by: human

### 2026-10-13 · The Current state can be written, but only on a new class
- Area: mcp
- Symptom: the style tool's states stop at hover, focus and the like; there
  is no Current. A sidebar link had no way to show the section in view.
- Cause: the style tool doesn't expose the state; the WHTML importer does.
- Fix: import an element with `css` holding `.the-class.w--current { … }`:
  it is stored as the Current state (published as `.the-class.w--current`),
  at breakpoints too. The style tool can't read it back; check the
  published CSS. For a class that **already exists** the importer does not
  add to it: it creates `the-class-1`. So import the full class under a
  new name with the state in it, move the elements over with `set_style`,
  remove the old class, and rename the new one to the old name (the
  selector follows the name).
- Status: workaround confirmed
- Found by: human + claude

### 2026-10-13 · Sitemap exclusion is plan-gated; site SEO settings have no API
- Area: mcp
- Symptom: `update_page_sitemap_status` and `list_pages_sitemap_status`
  answer 403 "Site plan doesn't support sitemap indexing controls" on a
  site without a site plan, also after Auto-generate sitemap is turned on.
  No tool reads or writes Site settings › SEO.
- Cause: plan gate; the settings page is dashboard-only.
- Fix: turn Auto-generate sitemap on in the dashboard (a person, or a
  browser session with their OK). Keep internal pages out of search with
  `noindex` in their head code until the plan exists, then exclude them
  from the sitemap. Staging with subdomain indexing off serves
  `Disallow: /` whatever the sitemap lists.
- Status: open
- Found by: claude

### 2026-10-13 · Building nested components through the MCP: what works
- Area: mcp
- Symptom: a four-layer button (link › colour › size › content) with an
  icon component inside had to be built without the Designer.
- Cause: none; this records the route that worked.
- Fix: build bottom-up. For each layer: build the wrapper element, insert
  the inner component as an instance, `transform_element_to_component`,
  `create_prop` the pass-through props, then bind the inner instance's
  props with `set_component_instance_prop_values` (`type: "bindable"`,
  `binding_source_type: "prop"`) inside `scope_component_id`. Inside a
  new component the root keeps the component's id and its children count
  up from it. Also confirmed: a custom `class` attribute bound to a text
  prop (an icon font's classes); an attribute *name* bound to a prop;
  `visibility` and a Link Block's `link` bound to props; a variant set on
  an instance by passing the variant id as a string to its Variant prop.
  Not possible: exposing a nested instance's Variant as a prop of the
  outer component (a Designer step, "Link to new prop").
- Status: workaround confirmed
- Found by: claude

### 2026-10-13 · `set_text` fails on imported blocks; a property can't be removed and set in one update
- Area: mcp
- Symptom: `set_text` on a div that the WHTML importer made from
  `<div>text</div>` answered "This element doesn't support text".
  Separately, an `update_style` that listed `padding-right` in both
  `remove_properties` and `properties` left the property unset.
- Cause: the element is a Block with a text child, not a Text Block; in
  one update the removal is applied after the write.
- Fix: write the text with `set_settings`, key `text`
  (`static_text`), which also accepts a prop binding. Remove a property in
  one call and set it in the next.
- Status: workaround confirmed
- Found by: claude

### 2026-10-13 · Element builder: a DOM element's attributes can't be set at creation; `query_elements` style and text filters find nothing
- Area: mcp
- Symptom: creating a `DOM` element (a `source`) with `settings`
  holding `attributes` failed: "Setting attributes is not applicable to
  this element". Separately, `query_elements` with `element_filter.style`
  ("Form Input") or `.text` returned no match for elements that exist on
  the page.
- Cause: not known; the builder accepts the `settings` list only for
  some keys at creation.
- Fix: create the element bare, then write `attributes` (with prop
  bindings) through `set_settings` and visibility through
  `set_visibility`. To find elements, filter by `attribute_name` /
  `attribute_value` (a section's id) or `type`, or pass `element_id`
  with `children_depth`, and walk down from there.
- Status: workaround confirmed
- Found by: claude

### 2026-10-07 · Variant overrides on a combo element never apply
- Area: mcp
- Symptom: every instance of a section component set to its Reversed
  variant rendered the base layout. The section published
  `data-wf--<component>--variant="reversed"` and the CSS had
  `.cta-grid:where(.w-variant-…)`, but no element carried that class.
- Cause: `set_variant_styles` takes a `style_name` and resolves it to the
  global class (`.cta-grid`). The element's own style is the combo at the
  end of its chain (`.s-wrapper.is-wide.cta-grid`), and Webflow adds the
  `w-variant-…` class only to elements whose own style has the override.
  Button variants worked because their elements carry a single class.
- Fix: set the override in the Designer with the element selected inside
  the variant (a manual step). Through the API, give variant targets a
  single class, and check the published class list after
  `set_variant_styles`.
- Status: open
- Found by: claude

### 2026-10-07 · CMS template: list sources, item roles and bound line breaks
- Area: mcp
- Symptom: building a CMS template page:
  - `set_settings` source `{collectionId, fieldId}` on a nested Collection
    List reported success but read back as `{collectionId}` only;
  - a list filter can't exclude the current item (`slug` is "Unknown
    field"), and system fields (`updated-on`) can't be bound;
  - `role="row"` set on a Collection Item published as `role="listitem"`
    (and the inner list as `role="list"`), breaking a table built from it;
  - a plain-text field holding "\n", bound to a heading, publishes the
    newline as a space, so the line break is lost.
- Cause: MCP surface limits; Webflow writes list roles on every Collection
  List (see designer.md, "Webflow rewrites roles and drops attributes on
  publish").
- Fix:
  - on a template page the stored `{collectionId}` resolves to the item's
    first multi-reference field to that collection, so a single such field
    works without the Designer. With two fields to the same collection the
    second list shows the first field's items until its source is set in
    the Designer. See also "Nested Collection Lists: Show defaults to 5,
    and the source shape";
  - a multi-image field can't be a list source through the API (`{fieldId}`
    is rejected; `{collectionId, fieldId}` stores the plain collection):
    build the list on its parent collection, then switch the source and
    bind the image in the Designer;
  - "exclude current item" and date bindings are Designer steps;
  - roles: put `data-aria-role` on the element and let the starter's
    `aria-roles` module set it at runtime;
  - line breaks: a combo with `white-space: pre-line` on the heading.
- Status: open
- Found by: claude

### 2026-10-07 · Restructuring a component copy: List Items and prop ids
- Area: mcp
- Symptom: building a compact card from a `duplicate_component` copy,
  inserting an instance failed with "List Item can only be placed in a
  List" after the copy's `<li>`s were moved into a DOM `ul`.
- Cause: Webflow List Items must sit in a Webflow List element, and the
  element builder can't create one (no `List` type; a DOM `ul` doesn't
  count). Separately, `duplicate_component` keeps the source's prop ids,
  so bindings copy over 1:1 to the new component's instances.
- Fix: reuse an existing List as the new container (move it, restyle it)
  and turn items that must leave it into Blocks. Link props bound to the
  current item still need Current <Item> set in the Designer on each new
  instance.
- Status: workaround confirmed
- Found by: claude

### 2026-10-07 · CMS images over 4 MB are dropped silently; updates need name and slug
- Area: mcp
- Symptom: creating a CMS item with an image field `url` succeeded, but
  the field came back `null`. An update without `name` and `slug` failed
  with "Missing fields".
- Cause: Webflow's CMS image limit is 4 MB, and the API drops an image
  over it instead of returning an error. Item updates validate the
  required fields every time.
- Fix: crop and convert images to WebP locally before writing them (under
  4 MB, ideally far under), then set `{fileId, url}` or a public URL and
  read the item back to confirm the image is there. Always send `name`
  and `slug` in `fieldData` on updates.
- Status: workaround confirmed
- Found by: claude

### 2026-10-07 · Month-only CMS dates display a month early
- Area: mcp
- Symptom: an item dated March 2026 rendered "February 2026".
- Cause: the date was written as `YYYY-MM-01T00:00Z`. The site timezone
  is behind UTC, so Webflow formats it as the last day of the previous
  month.
- Fix: store month-only dates as the 15th at 12:00 UTC
  (`YYYY-MM-15T12:00:00Z`), which formats as the same month in every
  timezone. Check existing items too: imported ones had the same bug.
- Status: fixed (CMS data)
- Found by: claude

### 2026-10-08 · Page SEO through the API: what sticks and where
- Area: mcp
- Symptom: `update_page_settings` on a CMS template took dynamic SEO text
  and published it per item. `jsonLdSchema` reported success but was
  neither stored nor published. `openGraph.imageUrl` rejects anything but
  an http URL.
- Cause: MCP/API surface limits.
- Fix: dynamic title and description use Webflow's token syntax, e.g.
  `{{wf {"path":"name","type":"PlainText"\} }} | Site` (field slug as
  path). JSON-LD and a CMS share image go in the page's head code with
  `data_scripts_tool › set_page_freeform_code`; the same tokens work there
  with HTML-escaped quotes
  (`{{wf {&quot;path&quot;:&quot;image&quot;,&quot;type&quot;:&quot;ImageRef&quot;\} }}`)
  and render per item. A `"` typed into a CMS field breaks JSON-LD built
  from it (see designer.md, "CMS text bindings inside JSON-LD can break
  the schema"). In the Designer, page settings › "+ Add field" inserts the
  same token; type plain text around it. The page settings' own Schema
  markup field on a CMS template can only be filled in the Designer (see
  designer.md, "CMS text bindings inside JSON-LD can break the schema",
  update 2026-10-16).
- Status: workaround confirmed
- Found by: claude

### 2026-10-13 · Unlinked instances lose conditional classes; link `rel` doesn't publish
- Area: mcp
- Symptom: after `unlink_component_instance`, the former root and a child
  kept an empty custom `class=""` attribute and lost their conditional
  combos. Separately, a Link created with `static_link` `rel: "noopener"`
  read back correctly through `get_settings` but published without `rel`.
- Cause: conditional classes are a typed `class` attribute driven by a
  prop (see designer.md, "Conditional classes are typed slugs, not linked
  styles"), so there is nothing to resolve once the instance is unlinked.
  The link setting's `rel` isn't written to the published markup.
- Fix: after unlinking, apply the combos as real styles (`set_style` with
  the class chain) and remove the empty `class` attribute. Set `rel` as a
  custom attribute with `set_attributes`. Check the published HTML for
  both.
- Status: workaround confirmed
- Found by: claude

### 2026-10-13 · Three "manual" steps the API can do after all
- Area: mcp
- Symptom: a background image on a class, the loader's HTML Embeds and the
  site's head and footer code were listed as Designer steps.
- Cause: the routes are not obvious from the tool names.
- Fix:
  - background image: `update_style` with `background-image: url("<the
    asset's cdn.prod.website-files.com URL>")` is stored and reads back;
    position, size and repeat sent in the same call are kept (sent without
    an image they are dropped silently, so read back);
  - an HtmlEmbed's content is the setting `code` (`set_settings`, with
    `scope_component_id` inside a component);
  - Site settings › head and footer code is `set_site_freeform_code`.
  Both read back. Check the starter site's Embed 2a still pointing at a
  placeholder URL, and empty head and footer code, before comparing
  staging with the prototype: nothing from the repo loads until they are
  set.
- Status: workaround confirmed
- Found by: claude

### 2026-10-14 · Collection List writes fail inside a slot or a component
- Area: mcp
- Symptom: `filters` writes on a Collection List inside a page-shell slot
  either reported "applied" and read back empty, or failed with
  "[Conflict] The operation could not be applied to the component map";
  one combined write (filters + sort + limit) left the list refusing every
  later write. Inside a component definition, `filters` failed with "No
  source connected. Set a source first." although source and limit read
  back correctly.
- Cause: unconfirmed; the same writes on a list at body level work.
- Fix: build the Collection List at body level, write `source`, then
  `filters`, `sort`, `limit` and `pagination` in separate `set_settings`
  calls (one key each), fill and bind the item, then `move_element` the
  list into the slot (ids, settings and bindings are kept). In a component,
  pin items with `queryMode: "curated"` and `curatedItemIds`, or set the
  filter in the Designer. A filter "field = current item" or "exclude
  current item" has no API value shape that works: Designer step. The
  element builder can't bind a CMS field at creation ("not inside a CMS
  context"): create, then bind. If a list refuses a query write once,
  stop and hand it to the Designer; later writes won't take.
  Update 2026-10-15: on another project one page's list refused sort in
  the Designer as well; a script that sorted the items from a bound
  `data-order` was written, and removed again the same day when a person
  rebuilt the list with a native sort. Report a refused native setting
  as a Designer step first, before writing workaround code.
- Status: workaround confirmed
- Found by: claude

### 2026-10-14 · A section containing a Collection List can't become a component
- Area: mcp
- Symptom: `transform_element_to_component` on sections holding Collection
  Lists was refused: "Components can't hold a live CMS binding".
- Cause: platform limit. Unbinding the list first lets the conversion
  through, but the list inside the component can't be bound again ("not
  inside a CMS context").
- Fix: only static sections become components. Sections with lists are
  rebuilt per page or template, so a change to a card must be repeated on
  every copy; list them in the handoff.
- Status: workaround confirmed
- Found by: claude

### 2026-10-14 · An imported combo can publish as a bare class
- Area: mcp
- Symptom: tags on one page were 19.5px instead of 13px, and small
  buttons, badges and icons elsewhere picked up a heading's font size.
- Cause: the WHTML importer created `.post-card-title.is-small` while other
  "Is Small" combos existed; Webflow published its properties as a bare
  `.is-small { … }`, so every element with an `is-small` combo got them.
  The style API still reported the selector as `.post-card-title.is-small`.
- Fix: rename the imported combo (e.g. Is Compact Title) so it publishes
  under its own class. After any import, grep the published CSS for bare
  `.is-…` rules. Related: never hide a shared combo at a breakpoint to hide
  one instance; give that instance its own combo.
- Status: fixed in that project's Webflow styles
- Found by: claude

### 2026-10-15 · Keep a CMS template off the site with its toggle, not with draft
- Area: mcp
- Symptom: templates were set to draft through the API to keep their item
  pages off the site.
- Cause: `update_page_settings` exposes `draft` but not the template's
  "Publish this Collection Template page" setting (the API reads it back
  as `shouldPublish`, read-only).
- Fix: switch "Publish this Collection Template page" off in the
  template's page settings in the Designer (the template moves under
  "Unpublished Collections"), then set `draft: false` through the API.
  Draft is for static pages. Read back `shouldPublish: false`.
- Status: fixed
- Found by: human

### 2026-10-15 · Bulk rich-text content: the Designer's CSV import, not the API
- Area: mcp
- Symptom: dozens of blog posts (close to 1 MB of HTML) from an old site
  had to go into a collection; sending each body through
  `create_collection_items` means pasting every article into a tool call.
- Cause: the MCP only takes field data inline.
- Fix: clean the export into a CSV whose headers match the field names
  (a script: rewrite internal links, drop the body's own `<h1>`, strip
  `<strong>` inside headings and zero-width joiners), then CMS › the
  collection › Import in the Designer (a browser `file_upload` on the
  dialog's file input). Columns map by name; take the offered backup.
  What comes out: cover and body images are re-hosted on the site's CDN;
  items arrive staged, not draft; a `<table>` becomes one run-together
  paragraph (rebuild it as a list); image alt in rich text becomes
  `__wf_reserved_inherit`; reference fields still need an API write after
  the import.
- Status: workaround confirmed
- Found by: claude

### 2026-10-16 · Nested Collection Lists: Show defaults to 5, and the source shape
- Area: mcp
- Symptom: a nested list of a multi-reference field published 5 items per
  card where cards have up to 7. `get_settings` read `limit: 100` the
  whole time.
- Cause: a new nested list gets Show = 5 in the Designer, and the API's
  read-back doesn't report it. Webflow allows up to 100 nested items, so
  it isn't a platform cap.
- Fix: `set_settings` key `limit` with an explicit value, then check the
  published HTML. Don't add a second offset list to get past 5. The
  source for a nested list is `{"collectionId": <referenced collection>,
  "fieldId": <multi-reference field>}`; it binds although the read-back
  shows only `collectionId` (the Designer shows the field). Reference
  fields bind as `<refFieldId>:::<targetFieldId>`. A link to a referenced
  item's page is a Designer step. A new collection appears in the
  Designer's Pages panel only after a reload.
- Status: fixed in that project
- Found by: human

### 2026-10-16 · Custom form messages: build inside the component, keep display off the class
- Area: mcp
- Symptom: replacing Webflow's default success and error text (grey and
  pink boxes, centred, with padding), `data_whtml_builder` into a footer
  component's Form Block failed with "Parent element … not found".
- Cause: the WHTML importer only reaches elements of the page in context,
  not component definitions.
- Fix: `data_element_builder` with `scope_component_id` builds inside the
  component (a DivBlock with Paragraph children, then `set_text`). Give the
  success and error boxes a class that resets Webflow's padding,
  background and centring but sets no `display`: webflow.js shows them with
  an inline `display: block`, and a display on the class would show them
  all the time. A message that replaces a form in a shrink-wrapped column
  needs the form's width, or it jumps sideways. Check by forcing each
  state, not by sending a form.
- Status: done
- Found by: claude

### 2026-10-16 · Imported divs reject conditional visibility; a Collection List can't sit in a Link Block
- Area: mcp
- Symptom: on a CMS template, every Designer "Create conditional" on a div
  that came from the WHTML importer failed with "[Conflict] The operation
  could not be applied to the component map", on plain and reference
  fields alike. Paragraphs from the same import, and divs made with
  `data_element_builder`, took conditions fine. Separately, a nested
  Collection List (a card's tags) was refused inside a whole-card Link
  Block ("Collection List Wrapper can not be placed in a Link"), and
  `set_text ""` on a paragraph after adding child spans wiped the spans.
- Cause: unknown for the import (some state on imported Block elements;
  see also "TextBlock builder makes an uneditable Block; WHTML drops fs-*
  attributes"); the link rule is a Webflow constraint.
- Fix: for every block that needs a condition, build a DivBlock with the
  same classes before it (`data_element_builder`), `move_element` the
  children in (bindings are kept), remove the imported div, then set the
  condition in the Designer. Conditions on a reference's subfields work on
  builder divs. A card that needs a nested list is a div card with an
  absolute overlay Link Block (its `aria-label` bound to the item name).
  Clear a paragraph's text before adding spans, never after. When
  selecting in the Designer by script, check the breadcrumb before
  applying a condition: the Navigator scrolls and a stale row selects the
  wrong element.
- Status: workaround confirmed
- Found by: claude

### 2026-10-09 · A variable create can come back suffixed; `rename_variable` works
- Area: mcp
- Symptom: in a batch of ~200 variable writes (all reported success, no
  429 at 20 per call), `create_color_variable` "Group/Name 4" came back
  named "Group/Name 4-9" (CSS `--…name-4-9`). No other live variable had
  that name.
- Cause: unconfirmed; most likely a deleted variable of the starter still
  holds the name. Webflow suffixes silently and reports success.
- Fix: check the `name` in every create result, and rename any suffixed
  one: `rename_variable` now works through the MCP (ids and aliases kept;
  the CSS name follows), so AGENTS.md › Webflow MCP limits "No variable
  rename" is out of date. Also seen: a variable created in a collection
  with modes takes its base value in every mode (no gaps on read-back), so
  only the modes that differ need a write; an update without `mode_id`
  writes Base only, so a value that must hold at every breakpoint is one
  write per mode.
- Status: workaround confirmed
- Found by: claude

### 2026-10-15 · Links in CMS copy: RichText companion fields; nested link styles are Designer-only
- Area: mcp
- Symptom: final copy added ~180 links inside running text, but most of it
  sat in PlainText fields, which can't hold a link. Once the links were in,
  they were invisible (global links are plain: inherited colour, no
  underline), and the style API couldn't write a `.copy-class a` rule.
- Cause: a field's type can't be changed, and a Paragraph can't bind to a
  RichText field. Nested ("When nested inside of") styles aren't in the
  API, and a bound RichText in the Designer has no child link to select.
- Fix:
  - add a RichText companion field per PlainText field ("Intro Rich"),
    fill it (the linked version where the text has links, the plain text
    wrapped in `<p>` otherwise), then in the template build a `RichText`
    element next to the paragraph with the same classes
    (`data_element_builder`), bind `richText` to the new field
    (`set_settings`) and remove the paragraph. Keep the PlainText fields
    filled: "is set" visibility conditions still read them. A RichText
    built through the API starts with Webflow's sample content; the
    binding replaces it on publish;
  - static text with a link: rebuild the paragraph with the WHTML builder
    (`<p>… <a href>…</a> …</p>`), then remove the custom `href` attribute
    the importer adds to the link;
  - link style: build a temporary **unbound** RichText with the same
    classes through the API (its sample content has links), select a link
    in it in the Designer, selector › All Links › "Nest selector inside
    of", set the styles, then remove the temporary block: the nested
    style stays. Point the sample link away from the current page, or the
    selector picks up a Current state. Bind colours with the variable dot:
    a colour typed into the Custom value editor published as
    `color: @var_variable-…` (invalid CSS). After publishing, grep the
    CSS for `@var_`. Plain Link elements in a paragraph can take a class
    instead, which the API can write (`text-decoration-thickness`,
    `text-underline-offset`, `text-decoration-color`);
  - transitions: Effects › Transitions in the Designer; `transition` can't
    be entered under Custom properties.
- Status: workaround confirmed
- Found by: claude
