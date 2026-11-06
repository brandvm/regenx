---
name: webflow-style-guide
description: Make or update a Webflow site's style guide page in the one fixed layout every site uses (a sidebar of sections, each section a list of rows with the name on the left and the live specimen on the right), first in the localhost prototype and then in Webflow at /design/style-guide. Use when starting a project's style guide, when the style guide is the first page of a prototype or of a Webflow build, when a new class or component needs its row, when checking that every class is on the page before running Webflow's "Clean up unused styles", or when adding a style guide to an existing site.
---

# Webflow style guide: one layout, every site

The style guide is the first page built in the prototype and the first page
built in Webflow, before any other page. It proves the variables, tag styles
and classes before anything depends on them, and it holds every class on an
element, so Webflow's **Clean up unused styles** can never delete one that
only the CMS, a script or an unbuilt page uses.

Its layout is fixed. A project supplies content, never layout:

- [sg.css](sg.css) is the page's own layout (the **Sg** classes).
- [scripts/gen-style-guide.mjs](scripts/gen-style-guide.mjs) writes the
  page from the Webflow snapshot, the CSS and the project's specimens.
- [scripts/check-style-guide.mjs](scripts/check-style-guide.mjs) fails when
  a class is missing from the page, a combo's classes never sit together on
  one element, or the layout has drifted.
- [scripts/sections.mjs](scripts/sections.mjs) is the section list both
  scripts share.
- Every typography specimen carries `data-sg-type` (its name), so the
  prototype's `pnpm measure:type` can print the type as rendered at 1440
  and 390 (size, line height, tracking, weight) to compare with the
  design's type sheet before the classes go into Webflow.

The shared rules apply (`webflow-build` › rules.md: Designer first, no
commit or push without an OK), and in Webflow the build's own: a go-ahead
before every batch.

## The layout

**Frame.** A sticky sidebar on the left lists the sections, numbered, as
links to them; the section being read is highlighted. One content column on
the right. At 991px and below the sidebar becomes a strip of links under
the nav that scrolls sideways.

**Written for someone new.** The page has to make sense to a person who
has never seen the site: a client, or a developer on their first day.

- Overview opens with what the page is, four cards on how to use it (find
  it, read a row, reuse before you add, add it here), the site at a glance
  (counts), its fonts, its variable collections and the breakpoints.
- Every section starts with its number, its title and one line saying what
  it is for and how to use it (the text is in
  [scripts/sections.mjs](scripts/sections.mjs), the same on every site).
- Specimens of buttons, forms and components sit on a panel; class names
  sit in a chip; long tables keep their name in view while they scroll.
- Every label uses the site's own font. No monospace: a Designer class
  holds one font family, and a system monospace font brings its own
  slashed zero.
- The frame takes its colours from the page (neutral lines and panels at
  low opacity), so it reads the same on a light or a dark site.

**Sections,** always in this order, with these names and ids. A section with
nothing in it is left out; nothing is added, renamed or reordered.

| # | Section | id | Comes from |
| --- | --- | --- | --- |
| 1 | Overview | `overview` | generated: how to use the page, counts, fonts, collections, breakpoints |
| 2 | Colors | `colors` | every Color variable outside Colors Semantic |
| 3 | Themes | `themes` | Section, every class that sets a Colors Semantic mode, and the table of roles per mode |
| 4 | Typography | `typography` | every class that sets a Typography Styles mode, the native tag styles (headings, paragraphs, links), the Body style's font features, and the type scale |
| 5 | Utilities | `utilities` | Size, Weight, Leading, Tracking, Text and Max Width classes |
| 6 | Spacing, radius and layout | `spacing` | the Spacing (each with a bar of its size), Radius and Layout variables |
| 7 | Buttons and links | `buttons` | specimens |
| 8 | Forms | `form-elements` | specimens (items use `section=forms`; Webflow refuses `forms` as an element id) |
| 9 | Components | `components` | specimens |
| 10 | Page sections | `page-sections` | specimens, shown as a half-size screen |
| 11 | Other classes | `other-classes` | generated: every class nothing above applies |

**The row.** Every item on the page is one **Sg Row**: on the left its name
as the Designer shows it, its CSS class, and a note in plain words (what it
binds to, its values per breakpoint, its states); on the right the live
specimen. A
section is a heading and a list of rows. Tables of values (roles per mode,
the type scale, spacing, layout) sit in a row's specimen as one **Sg Table**:
the name column, then a column per mode or value.

**No project class in the frame.** The frame uses Sg classes only, so the
page looks the same whatever a project's type scale or section padding is.
Project classes appear in specimens.

## Variables are a standard, not a limit

The page shows whatever the site has. The template's collections, names and
starter values (`webflow-build` conventions §4, including Geist as the
default font) are the standard layout and way of using variables; a project
is free to change values and to add, rename or remove variables, modes and
collections.

- Any Color variable outside the semantic collection is a swatch; any
  class that sets a mode is a theme or a type row; any collection the
  generator doesn't know by role is shown as a table under "Spacing,
  radius and layout".
- A site that names the standard collections differently says so in
  `design/style-guide/config.json`, for example
  `{ "collections": { "semantic": "Themes", "typeStyles": "Type Styles" } }`
  (keys: `semantic`, `typeStyles`, `typeRole`, `typeScale`, `spacing`,
  `radius`, `layout`).
- What stays fixed is the layout: the frame, the section order, the row.

## Specimens (sections 7 to 10)

Two ways to supply one; both produce the same row.

**1. From a real page,** so it stays in step with it. Wrap the markup on the
page:

```html
<!-- sg:start section=components | name=Card | class=.card | note=Used in lists and on the home page -->
<a class="card" href="/work/item" data-card>…</a>
<!-- sg:end -->
```

**2. By hand,** for what no page shows on its own (button states, form
parts). One file per section in `design/style-guide/items/`, each item a
header comment followed by its markup:

```html
<!-- sg: section=buttons | name=Button Is Secondary | class=.button.is-secondary | note=Combo on Button -->
<a class="button is-secondary" href="#buttons">Secondary</a>
```

- `section` is `buttons`, `forms`, `components` or `page-sections`; `name`
  is required; `class` and `note` are optional.
- Prefer a real page block for components and page sections. A specimen
  copied by hand drifts from the page, and on earlier builds components
  built from hand-copied previews had lost their script hooks.
- The generator strips ids, `for`, `data-*` hooks and id references from a
  specimen and marks it `inert`: it is a picture of the component, not a
  working copy, so no script attaches and nothing in it takes focus.
- The page is `noindex`, so a second `h1` on it is fine: the Typography
  section shows a real one as the specimen of the All H1 Headings tag
  style, and a specimen may contain one.
- A `page-sections` specimen is shown at half size in a sealed frame.
  Remove it once its page exists in Webflow: the page then keeps its
  classes. Sections 1 to 9 stay for good.
- No inline `style` attributes: the Webflow importer turns each one into a
  junk combo class. Colour swatches, radius boxes and spacing bars use one
  generated combo per variable instead.

## In the prototype (first page)

1. The prototype folder exists (`webflow-prototype` › Project setup) and its
   Webflow snapshot is current (`pnpm css`).
2. `pnpm style-guide`. It writes `design/style-guide/index.html` and
   `src/css/style-guide.css`. Never edit either.
3. Add the project's specimens (button and form items; component and page
   blocks as pages are built) and run it again.
4. `pnpm check:style-guide` until it passes.
5. The person reviews the page at 1440, 820, 667 and 390 and approves it
   **before the first content page is started**.
6. From then on, every new class or component gets its row in the same
   piece of work: add the specimen, `pnpm style-guide`, `pnpm
   check:style-guide`.

## In Webflow (first page)

After variables, tag styles, classes and the repo bundle are in, and before
any other page. A go-ahead per batch.

1. **Page.** `/design/style-guide` in the `design` folder, on the standard
   shell (`webflow-build` conventions §1). `noindex, nofollow` in the
   page's head code; excluded from site search and the sitemap (the
   sitemap setting needs a site plan: on a site without one, the
   `noindex` tag is what keeps it out of search, and the exclusion is
   set once the plan exists); links into
   it do a full page load.
2. **Sg classes.** A site duplicated from the starter already has them.
   Otherwise the quickest way that keeps every value: import the frame
   with the WHTML builder and pass sg.css as its `css` (variables and
   `calc()` replaced by plain values, `rgb(r g b / a)` written as
   `rgba()`). The importer creates each class with longhand properties,
   states and breakpoints, named by its slug; rename each one afterwards
   to the name the Designer should show (Sg Row, Sg Row Meta, Sg Table
   Key…). The `.w--current` rules become the **Current** state of Sg
   Sidebar Link, which the style tool itself can't write. This only works
   while the class is new: for a class that already exists the importer
   makes a numbered duplicate (`webflow-build/lessons/mcp.md`).
3. **Variable combos.** For each colour variable, the combo **Sg Swatch
   Color** + **Is …** binding `background-color`; for each radius variable,
   **Sg Radius** + **Is …** binding `border-radius`; for each spacing
   variable, **Sg Bar** + **Is …** binding `width`. The generated
   `src/css/style-guide.css` lists them, one per line.
4. **Build** section by section from the generated page, with classes only.
   Create every class and combo before importing markup (the importer
   drops a whole class list if one class is missing). Then point each
   sidebar link at its section (link type: page section), so Webflow marks
   the current one.
5. **Rows for components** are component instances, not copies of their
   markup.
6. **Check on staging:** every class in the site appears on the published
   page or in the shell, and every combo on one element (a combo whose
   classes only appear apart is still deleted by the cleanup); the sidebar highlights the section in
   view; `noindex` is in the head. Only then is **Clean up unused styles**
   safe.

## On an existing site

A site not built from the template can get the same page: make a prototype
folder from the `webflow-prototype` skill's prototype starter, take the site's snapshot,
then follow "In the prototype" and "In Webflow". Its Sg classes won't exist
yet; create them in step 2.

## Gates

- **Prototype style guide approved** [Person]: before the first content
  page of the prototype.
- **Style guide base done** [Claude checks, Person approves]: the Webflow
  page holds every class that exists so far; published and checked at three
  widths.
- **Style guide final check** [Claude checks]: at the build handoff,
  `pnpm check:style-guide` passes and the published page holds every class.

## Changing the layout

The layout changes here, for every site at once, never in one project: edit
[sg.css](sg.css), the section list or the generator in the template, update
the starter site in the same round of work, and release it
(`webflow-build` › rules.md › Contributing). Projects get it with `pnpm update-skills`
and `pnpm style-guide`.
