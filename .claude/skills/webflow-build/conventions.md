# Build conventions

The structure and naming every build starts from. A project can change any
of it, but only with the designer's agreement, recorded in its handoff. Names
in **bold** are what you type in the Designer; the CSS class follows in
brackets.

## 1. Page structure

Every page has the same shell, so page transitions (Barba) can be added later
without restructuring:

```
body
├── G | Components         component, class G | Components + aria-hidden="true"
│                          (fixed, 0×0, invisible), in this order:
│                          Embed · site code (GTM noscript), then the loader's
│                          Embeds 2a (link) and 2b (script), 2b directly after 2a
└── G | Page W             component, class G | Page W (Barba: data-barba="wrapper")
    ├── Skip link          → #main (first focusable element on every page)
    ├── G | Nav W          component: div G | Nav W › nav G | Nav
    └── G | Main W         page container     (Barba: data-barba="container"
        │                                       data-barba-namespace=<prop>)
        ├── main#main      class G | Main, slot "G | Main": the page's Sections
        └── G | Footer W   component: div G | Footer W › footer G | Footer
```

Components carry the name of their root class (**G | Components**,
**G | Page W**, **G | Nav W**, **G | Footer W**), all in the group
*Global*.

- **Shell classes** (generic, set once in the starter): G | Page W only
  clips (relative, width 100%, `overflow: clip`); G | Main W is the
  full-height column (flex column, min-height 100dvh, flex 1 1 0%) and
  G | Main grows inside it (flex 1 1 0%), so the footer sits at the bottom
  of short pages. The column lives on G | Main W, not G | Page W, because
  G | Main W is the container page transitions swap: each page fills the
  viewport on its own;
  G | Nav W overlays the page (absolute, top 0, height Nav/Height, side
  padding Nav/Padding H), which is why Is Hero and Is Top clear it with
  `calc(Nav/Height + Section/Padding V)`; G | Footer W carries the footer's
  padding and colours; G | Nav and G | Footer are width 100%.
- **Nav and Footer roots are wrappers**, with the real `nav` / `footer`
  inside, so a site-wide element can sit beside them (a bar above the nav,
  a band under the footer) and still be part of the component.
- **G | Components is hidden everywhere** (canvas, staging, live), and
  `aria-hidden="true"` on its root hides it from screen readers too: only
  code goes in it. Anything visible or focusable that every page needs
  (the skip link, a popup, a banner) goes in G | Page W.
- **Site code embed** (first child of G | Components, empty in the
  starter): body-start code every page needs, such as Google Tag Manager's
  `<noscript>` iframe, which GTM wants right after `<body>` opens.
  GTM's main `<script>` goes in Site settings › Head code, not here: an
  Embed runs later than head code, and the canvas skips an Embed that holds
  a script. Keep 2a and 2b last and adjacent; 2b finds 2a by id.

- **G | Page W is one component on every page**, so anything added to it
  (a band under the footer, a newsletter popup, a banner above the nav)
  reaches every page in one edit. Each page fills only the slot.
- **Filling the slot: build in a To Slot wrapper, drag once, ungroup.**
  The MCP can't start a slot's content, but it can build and move next to
  a plain element already in it (`lessons/mcp.md`). So for each page:
  1. [Claude] builds the page's sections inside one **To Slot** div
     (dashed outline and a "To slot" label on the canvas, so it is
     obvious), appended to the body: it can't be placed before or after
     a component instance;
  2. [Person] drags that one div into G | Page W's **G | Main** slot;
  3. [Claude] ungroups it: moves each child out *before* the wrapper
     (the wrapper is now a plain element in the slot, so it works as the
     anchor), then removes the empty wrapper and checks the slot with
     `query_elements`.
  Every section then sits directly in the slot. Later sections on the same
  page are built next to an existing one, with no drag. One drag per page,
  listed in `MANUAL-TODO.md`.

- **G | Components** sits directly under body, outside G | Page W, so its
  scripts run once and never inside a swapped container.
- **The Footer goes inside G | Main W**, after `main`. It is swapped with the
  page; the Nav stays outside and lives for the whole visit.
- **Nothing page-specific goes outside G | Main W.** Overlays, dialogs and
  popovers that a module appends to body must be removed by the module when
  the page leaves.
- **Every page uses the same shell**, including the 404, the style guide and
  CMS templates. A page that breaks the pattern is the one a transition
  breaks later.
- **With Barba**, add the attributes in brackets (the namespace is a text
  prop on G | Page W, set per page), a fixed transition
  component (e.g. **G | Transition**) inside G | Page W outside the
  container, and `data-barba-prevent="self"` on links that must load fully
  (the style guide, files).
- **Global classes** carry the `G | ` prefix: **G | Page W**, **G | Nav W**,
  **G | Main W**, **G | Footer W**. "W" marks a wrapper whose job is position
  and stacking, not looks.

## 2. Section structure

```
Section (section, id="<anchor>")     + combos: Is Hero, Is Top, Is Media, theme
├── S Bg            (aria-hidden)    optional: photo/video layer
│   ├── S Bg Media                   img or video, object-fit cover
│   └── S Bg Overlay                 + Is Gradient / Is Dim / Is Strong
└── S Wrapper                        content, centred, max width
    └── …content                     + Is Wide
```

- **Section:** `position: relative`, padding from Layout variables (Section /
  Padding V and H), `overflow: clip`, flex column. It sets the colour mode
  (see 7). Its `id` is the anchor target: lowercase words joined by hyphens
  (`#about`, `#services`).
- **S Bg:** absolute, inset 0, `z-index` below the content,
  `pointer-events: none`, `overflow: hidden`. Decorative, so `aria-hidden`
  and `alt=""` on its media.
- **S Wrapper:** relative, above S Bg, width 100%, max width from Layout
  (Container / Max Width), auto side margins. Width combos only change the max
  width. Children hug and sit left by default; full-width blocks opt in with
  `align-self: stretch`.
- **Section combos:**
  - **Is Hero:** first section, full viewport, clears the nav;
  - **Is Top:** first section on a page without a hero (clears the nav,
    compact rhythm);
  - **Is Media:** a full-bleed photo band;
  - a theme combo (**Is <Mode>**, e.g. Is Dark) switches the colour mode.
- **One heading per section, in order:** the section's eyebrow label is an
  `h2` styled as a chip when it is the only heading (see 9).
- **Absolute insets on S Wrapper** (width 100%) overflow the right edge; set
  `width: auto` when insetting.

## 3. Class naming

- **Words only, Title Case, no hyphens or underscores.** Type
  **Card Body**; Webflow makes `.card-body`. Abbreviations stay as
  words: **S Bg**, **Nav W**.
- **Name by component, then part:** **Card**, **Card Media**,
  **Card Body**, **Card Title**. Not by page (**Home Card**) unless it is
  truly page-only.
- **Generic first.** A pattern used on two or more pages is a generic class
  with no prefix (**Split**, **Spec List**, **Form Input**). Only a family that
  can never leave its page gets a page prefix (**Contact Grid**).
- **Combos are states or variants and start with Is:** **Is Active**,
  **Is Dark**, **Is Reverse**, **Is Filled**. Keep the shared value on the
  shortest chain: a two-class combo can't be edited from an element that
  carries three classes.
- **Prefixes:** `G | ` global shell and global components' roots,
  `C | ` reusable components, `Sg ` style-guide-only classes. JS-only state
  classes (`is-open`, `is-float`) live in repo CSS unless the Designer styles
  them.
- **Utilities** mirror a variable and are named after it: **Size 16**,
  **Weight Medium**, **Leading Tight**, **Tracking Wide**,
  **Text Secondary**, **Text Uppercase**, **Max Width Text**. The starter
  ships a fixed set (`starter-site.md` §C); add to it in the same
  pattern, one property per class.
- **Typography classes** use the role names:
  **D0–D6** (display and headings), **Body L** and **Body S** (body is the
  default), **Label Text**, **Chip**.
- **Reserved names** can't be created through the API (**Label**, **Form**):
  create them in the Designer, then style them through the MCP.
- Keep a generated class list (e.g. `CLASSES.md`) with what each class is
  for, grouped by component.

## 4. Variable naming

Collections, from primitives to roles. Classes bind roles; roles alias
primitives; nothing in a class holds a raw value that a variable could hold.

| Collection | Holds | Names | Modes |
| --- | --- | --- | --- |
| **Colors** | brand primitives and tints | `Brand/<Name>`, `<Name> Tint/<Name> 12`… | Base only |
| **Colors Semantic** | colour roles | `Background/Page`, `Text/Primary`, `Text/Secondary`, `Text/Accent`, `Border/Subtle`, `Button/Background Hover`, `Form/Focus`, `Link/Hover` | one per theme (Base + e.g. Dark, Brand) |
| **Typography Scale** | primitives | `Family/Base`, `Size/16`, `Line Height/Tight`, `Letter Spacing/Wide` | Base only |
| **Typography Role** | one set per role | `Family/H1`, `Size/H1`, `Weight/H1`, `Line Height/H1`, `Letter Spacing/H1` for Display, H1–H6, Body, Body Large/Small, Label, Button, Link… | breakpoints (Tablet, Mobile Landscape, Mobile) |
| **Typography Styles** | the five properties a class binds | `Family`, `Size`, `Weight`, `Line Height`, `Letter Spacing` | one per role (Display, H1…); a class picks the mode |
| **Layout** | page rhythm | `Section/Padding V`, `Section/Padding H`, `Container/Max Width`, `Content/Gap`, `Nav/Height`, `Button/Height` | breakpoints, set on the Body tag style |
| **Spacing** | gaps and small sizes | `None`, `Hairline`, `2`, `4`, `8`, `12`… (px names, em values) | Base only |
| **Radius** | corner radii | `None`, `2`, `4`, `8`, `Pill` | Base only |

- **A standard, not a limit.** The collections, names and starter values
  above are the default layout and the default way to use variables. A
  project changes values freely and adds, renames or removes variables,
  modes and collections when its design needs to, proposed as old → new.
  The default font (`Family/Base`) is Geist, with its stylistic sets
  `ss03` and `ss08` turned on once, on the Body tag style
  (`font-feature-settings`, a custom property; all text inherits it). The
  font is the official file uploaded as a custom font, not Google Fonts'
  Geist, which leaves those sets out (`starter-site.md` §A). A project
  with its own typeface replaces the font and removes or changes the
  feature setting with it.
- **Group/Name**, both in Title Case with spaces. The group is the folder in
  the Designer and becomes part of the CSS name.
- **Name by role, never by value or place:** `Text/Secondary`, not
  `Grey 60` or `Footer Text`. Primitives are the exception: their name is the
  value (`Size/16`).
- **Only one collection can take breakpoint auto-modes.** Give them to
  Typography Role; the others get modes set on the Body tag style at each
  breakpoint.
- **A new variable only when a second section needs the value.** A one-off
  value stays a literal on its class and is marked as such in the class list.
- **Rename in the Designer**, never by recreating (ids and aliases survive).
  Repo CSS never reads Webflow variable names without approval and a GOTCHAS
  entry.
- Propose variable changes as **old → new**, batch by batch, before writing
  them.

## 5. Tag styles

Set once in the Designer (the MCP can only reach a tag style after a property
has been set on it), then bind through the MCP:

- **All H1–H6 Headings:** the same Typography Role values as D1–D6 (h1 = H1
  role … h6 = H6 role): family, size, line height, weight, letter spacing,
  and margin 0. A bare `<h2>` then looks like **D2**, and a class still
  overrides it.
- **All Paragraphs:** margin 0.
- **All Links:** colour inherit, no underline. Links that are underlined in the
  design set it on their own class.
- **Body:** base family, colour, weight, line height and letter spacing
  (the Typography Styles variables), the page background, and the Layout
  mode at each breakpoint; `font-optical-sizing: none` when the font has an
  optical-size axis (e.g. Inter Variable narrows large text otherwise).
  **No font-size:** the repo's fluid scaling sets it (6), so a Designer
  value would do nothing.

## 6. Type and spacing in em

- Typography Role sizes are **em**, so type classes **multiply when nested**
  (D4 1.5em inside an 80px D1 = 120px). Don't nest type classes; use a small
  relative class for parts inside one (e.g. a unit at 0.3em).
- **An em value on an element with its own font size** is computed against
  that size: a 48px button at 14px = 3.4286em. When spacing moves from such an
  element to its wrapper, convert it (`calc(<var> * 0.875)` for a 0.875em
  button).
- **Fluid scaling is the template default** (Osmo Scaling System,
  `src/styles.css` §01): on desktop the body font-size follows the viewport
  in proportion to the design frame (between a min and max width, holding
  below the min), so every em-based variable scales with it; from 991px
  down it is a fixed 1rem and the variables' breakpoint modes resize. The
  root stays at 16px. Set the frame (ideal, min, max) to the design before
  building. Never set a body font-size in the
  Designer: the repo rule wins and the Designer value does nothing.
- **Variables must be in em** for the scale to reach them; a px or rem
  value stays fixed while everything around it scales.

## 7. Colour modes per section

- **A theme is a mode of Colors Semantic**, applied by a combo on the Section
  (**Section** + **Is Dark**). Every element inside reads the role variables
  and follows.
- **Remove a mode from a class entirely** rather than re-declaring some of its
  variables; a partial override leaves old hover and placeholder colours
  behind.
- Anything that reacts to the section behind it (e.g. a floating nav) reads
  the theme from the section (`data-nav-theme` or the theme combo), never from
  its own colour.

## 8. States

- **Every control has hover, focus-visible, pressed and disabled** where they
  apply, built in the Designer.
- **Pressed = an inset box-shadow** (e.g. 16% black) on buttons and boxes; links,
  tabs and thumbnails dim. GSAP writes inline transform, opacity and filter on
  animated elements, which would cancel a scale or fade.
- **Disabled** controls ignore hover and press.
- **Focus-visible** belongs on each input class (outline from Form/Focus,
  offset 3px) with a Focus border colour equal to its base border; Webflow's
  `.w-input:focus` turns borders blue otherwise.

## 9. Accessibility and SEO patterns

- **One `h1` per page.** Each section has a heading in order; an eyebrow
  label that is the section's only heading is an `h2` with the **Chip** class.
- **Section ids** for every anchor target; footer and nav links point to them.
- **Images:** descriptive alt on content images, `alt=""` on decorative ones
  inside an `aria-hidden` S Bg.
- **Forms:** labelled by a visible label or an sr-only one, `name` and
  `required` set, a Form Block class with margin 0.
- **Tabs, lists and dialogs:** keep ARIA roles on DOM elements or set them from
  script (`data-aria-role`); Webflow rewrites roles on its List elements.
- **Head:** Open Graph and Twitter meta, `theme-color`, favicon, and an
  Organization JSON-LD (address, phone, e-mail) in the home page's head
  code.
- **Motion:** reduced motion stops video autoplay (poster shows) and long
  scroll scenes; a looping hero video needs a pause control (WCAG 2.2.2).

## 10. Components

- **Start from the starter's control components** (`starter-site.md` §D2):
  Icon, C | Button (Button Color › Button Size › Button Content), C | Icon
  Button, C | Video, Section Head. Restyle their variants for the design;
  add a variant before adding a class. Searchable selects, accordions,
  sliders and lightboxes are not in the starter: they are built when a
  site needs one, from a recipe where there is one (`recipes/`; the
  searchable select is `recipes/finsweet/searchable-select.md`).
- **Icons** are the Icon component (colour and size on one component): type `ph ph-<name>` into its prop
  (`recipes/phosphor/`). Brand and social logos are uploaded SVGs.

- **Make a component when behaviour should appear only where you place it.**
  The behaviour lives inside it as a `data-*` attribute (a Gallery's
  `data-lightbox`). If the same markup is needed without the behaviour, make a
  second component (**Gallery Static**), not a variant: variants change
  styles, not attributes.
- **Classes are enough** for layouts whose content differs on every use
  (Split, Spec List, Form parts).
- **Placement:** G | Components directly under body; Nav and Footer in the
  page shell (1); everything else inside a Section.
- **Props:**
  - bindable text is a Text Block, Paragraph, Heading or Link, never a Span;
  - an input placeholder comes from a text prop bound to `data-placeholder`
    (a module copies it to `placeholder`), since placeholders can't bind;
  - a boolean attribute is an attribute whose *name* is a text prop
    (default `muted`, value `true`); clearing the prop removes it;
  - a variant that changes an element's styles needs that element to carry a
    single class (a combo element never gets the variant class);
  - a "conditional class" is typed text, not a link to a style: check the
    published class list, and re-check after renaming a combo.
- **Content in a component** (heading levels, links to the current CMS item,
  slot names) is often a Designer step; list it in
  `docs/handoff/MANUAL-TODO.md`.

## 11. CMS

- **Alt text lives on the image field**, never in a separate alt field.
- **Decimal numbers:** set the Number field's format in the Designer before
  entering values (the API only makes integers).
- **Multi-image and multi-reference list sources**, "exclude current item"
  and system-date bindings are Designer steps.
- **Conditional visibility on CMS fields** is a Designer step; put it on a
  plain wrapper div, not on a component instance.
- **Collection lists publish `role="list"` / `listitem`:** put the intended
  role in `data-aria-role` and let a module set it.
- Plan the collections (fields, references, sort field) with the designer
  before the template page is built.

## 12. Style guide page

The `webflow-style-guide` skill has the layout, the generator, the check and
the procedure. In short:

- **First page built,** in the prototype and then in Webflow, before any
  other page; every later class or component adds its row in the same piece
  of work.
- **One layout on every site:** a sidebar of sections, each section a list
  of rows (name, class and note on the left; the live specimen on the
  right). The sections, their order and the row are fixed in the skill; a
  project supplies content only.
- A page in a `design` folder (`/design/style-guide`), excluded from search
  and the sitemap, `noindex` in its head code, links with
  `data-barba-prevent`.
- **Every class in the project is applied to at least one element on it**, so
  "Clean up unused styles" can never delete a class used only by the CMS, a
  script or a page not built yet. `pnpm check:style-guide` checks this and
  the layout.
- **Page section previews** keep page-specific classes alive until their
  page exists. Remove a preview once its page is built; the other sections
  stay for good.

## 13. Before Webflow: the prototype phase

The `webflow-prototype` skill runs this phase (its
[prototype-starter/](../webflow-prototype/prototype-starter/README.md) is
the folder a project starts from). In short:

- **It mirrors Webflow:** the same URLs, the same breakpoints (991, 767, 479),
  the Webflow class names, and the page shell and section structure above.
  Nav and footer are single partials (one component each).
- **It reads the site's variables** from a snapshot of Webflow, and variable
  changes are proposed as old → new in one file, grouped and lettered for
  approval.
- **It produces the build inputs:** the class list, the style-guide page
  markup, the modules with their `data-*` hooks, and a `HANDOFF.md`.
- **The designer approves the prototype** before any MCP write, and gives the
  go-ahead for each batch.
- **After Designer changes,** refresh the snapshot so the prototype matches
  Webflow again.

## 14. Media

- **Videos go through the media page** ([media.md](media.md)): uploaded
  once at `/design/media`, hosted by Webflow, and used on the real pages
  by address.
- **Hero video:** MP4 (H.264, fast start, no audio), at most 30 MB for
  Webflow's Background Video, with a poster image; a smaller encode for
  phones. Skip WebM when it is larger than the MP4.
- **`<video>` attributes need values** (`muted="true"`, `loop="true"`,
  `playsinline="true"`), or publishing drops them and autoplay is blocked.
- **Images:** Webflow adds `srcset`; a module that swaps an image removes
  `srcset` and `sizes` first. Give images a size or a class with
  `aspect-ratio`, since the importer drops their attributes.

## 15. Patterns from earlier builds (not in the template)

These live in client repos, not in the template. Rebuild them when a design
asks for them:

- **Page transitions:** Barba with a parallax swap, and an image zoom from a
  card into the next page's hero. Page modules run per page inside a
  `gsap.context` and their listeners are removed on leave; Webflow is
  re-initialised after each swap; the clicked link's hash is restored after
  the swap.
- **Floating nav:** the bar scrolls away with the page; a small fixed nav
  appears once it is off screen, light or dark from the section under it, and
  opens the menu as a side sheet. The blur sits on a child, never on the
  wrapper holding fixed elements.
- **Link Underline:** a background-gradient underline (px height and offset,
  under the font's descender) that animates on hover and wraps across lines.
- **Anchor handling:** unbind webflow.js's `click.wf-scroll`, glide with
  Lenis to the section (or its pin spacer) flush with the top, pause scroll
  snapping during the glide, and jump to the hash again after pins are added.
