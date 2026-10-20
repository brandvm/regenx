# The starter site

A Webflow site that already holds the base system from
[conventions.md](conventions.md), so a project starts from a duplicate
instead of an empty site. The agency keeps one (for example "WF Starter")
in its workspace; its site ID stays out of this repo.

## Starting a project from it

1. [Person] Duplicate the starter site in the Webflow dashboard and name
   the copy after the client. Webflow gives it a new site ID and a
   staging subdomain.
2. [Claude] Find the copy by name through the Webflow connector (site ID,
   staging subdomain) and run `pnpm new-project` with those values
   (`webflow-prototype` › Project setup).
3. [Claude] Point Embeds 2a and 2b in G | Components at the repo:
   replace `ORG` and `REPO` with the values in `loader.html` (a Webflow
   change, so after the go-ahead). The canvas shows the repo CSS once the
   first push has deployed.
4. [Claude] Take the snapshot for the prototype (`webflow-prototype` ›
   prototype-starter › Webflow snapshot). The starter's values are neutral placeholders: the
   design's colours, type and spacing replace them as old → new
   proposals, like any other variable change.

## What it holds

Built from `conventions.md`, in the order the Designer needs (each batch
approved before it is written). Values are neutral: Geist as the default font,
greys plus one accent, a spacing scale, all sizes in em. Writing a batch
this size through the MCP hits the rate limit: send about 20 writes per
call (`lessons/mcp.md`). Webflow names every collection's first mode
"Base mode" and the MCP can't rename it; its default "Base collection"
can't be deleted and stays empty.

**A. Variables** (§4). These collections, names and values are the
standard starting point and the standard way to use variables, not a limit:
a project changes any value, and adds, renames or removes variables, modes
and collections when its design needs to (proposed as old → new, like any
variable change). The style guide follows whatever the site has.

The default font is **Geist**, with `Family/Base` = `Geist` (a font
variable holds one family name; the fallback stack comes after it in the
published CSS). A project with its own typeface replaces the font and that
one variable.

- **Upload the file, don't pick Geist from Google Fonts.** Site settings ›
  Fonts › Custom fonts: upload
  `webflow-prototype/prototype-starter/public/fonts/Geist-Variable.woff2` (the official
  variable file, weights 100 to 900, SIL Open Font License, licence text
  next to it), family name `Geist`, font display Swap. Google Fonts'
  build of Geist has no stylistic sets, so the feature setting below would
  do nothing with it (checked 2026-10-13 in the font's feature table).
- **Font features, set once.** Body (All Pages) tag style › Custom
  properties: `font-feature-settings` = `"ss03" on, "ss08" on`
  (alternate l, round dots). It is inherited, so no class repeats it. The
  style guide's Typography section shows a "Font features" row whenever
  the Body style sets it; check that row on staging (an l with a curved
  foot and round dots on i and j mean it is on).

| Collection | Modes | Contents |
| --- | --- | --- |
| Colors | Base | `Brand/Ink`, `Brand/Paper`, `Brand/Accent`; `Status/Success`, `Status/Warning`, `Status/Error`, each with an `On Dark` twin (a lighter value that keeps contrast on a dark background); `Ink Tint/Ink 4…64`, `Paper Tint/Paper 12…64` |
| Colors Semantic | Base, Dark | `Background/Page`, `Background/Surface`, `Background/Overlay`, `Text/Primary`, `Text/Secondary`, `Text/Accent`, `Border/Subtle`, `Button/Background`, `Button/Text`, `Button/Background Hover`, `Form/Focus`, `Link/Hover`, `Status/Success`, `Status/Warning`, `Status/Error` (Dark points at the `On Dark` colour), each an alias of a Colors variable |
| Typography Scale | Base | `Family/Base`, `Size/12…96`, `Weight/Thin` (100), `Extra Light`, `Light`, `Regular`, `Medium`, `Semibold`, `Bold`, `Extra Bold`, `Black` (900): every weight is there as a variable, though only Regular, Medium and Bold are used by a role, `Line Height/Tight`, `Snug`, `Normal`, `Letter Spacing/Tight`, `Normal`, `Wide` |
| Typography Role | Base + Tablet, Mobile Landscape, Mobile (breakpoint auto-modes) | `Family`, `Size`, `Weight`, `Line Height`, `Letter Spacing` for Display, H1–H6, Body, Body Large, Body Small, Label, Button |
| Typography Styles | Base (= Body) + one per other role | the five properties, each mode aliasing its role |
| Layout | Base, Tablet, Mobile Landscape, Mobile (set on the Body tag style at each breakpoint; check the published CSS, the starter once shipped without it and nothing changed with the breakpoint) | `Section/Padding V`, `Section/Padding H`, `Container/Max Width`, `Content/Gap`, `Nav/Height`, `Nav/Padding H`, `Button/Height` |
| Spacing | Base | `None`, `Hairline`, `2`, `4`, `8`, `12`, `16`, `24`, `32`, `48`, `64`, `96`, `128` |
| Radius | Base | `None`, `2`, `4`, `8`, `Pill` |

**B. Tag styles** (§5). [Person] sets one property on All H1–H6
Headings, All Paragraphs and All Links in the Designer, and creates the
reserved classes **Label** and **Form** (the API can't), each with one
property and on an element so Webflow keeps them. [Claude] then
binds Body (no font-size: the repo's fluid scaling owns it), H1–H6,
Paragraphs and Links to the variables and sets the Layout mode on Body at
each breakpoint.

**C. Base classes** (§2–3): **Section** with **Is Hero**, **Is Top**,
**Is Media**, **Is Dark**; **S Bg**, **S Bg Media**, **S Bg Overlay**;
**S Wrapper** with **Is Wide**; **G | Page W**, **G | Nav W**,
**G | Main W**, **G | Footer W**; **D0–D6**, **Body L**, **Body S**,
**Label Text**, **Chip**; **Skip Link**; the utilities (one property
each, bound to its variable): **Weight Regular**, **Weight Medium**,
**Weight Bold**; **Leading Tight**, **Leading Snug**, **Leading Normal**;
**Tracking Tight**, **Tracking Wide**; **Text Secondary**,
**Text Accent**, **Text Uppercase**, **Text Center**, **Text Balance**;
**Max Width Text**; **Button** (the plain outer wrapper of the button components: no fill of
its own, only the focus ring), **Form Field** and **Form Input** (focus
and keyboard-focus states). Form Input is the one class for text inputs,
selects and textareas: it replaces Webflow's input defaults (height,
margin, padding, border, background), and its combo **Is Textarea**
makes it tall. Type classes bind the five
Typography Styles variables and pick a mode; gaps bind `grid-row-gap` /
`grid-column-gap`; classes for empty elements (S Bg, S Bg Overlay) carry
padding 0 and `font-size: inherit`. [Person] sets the padding-top of
**Is Hero** and **Is Top** to `calc(Nav/Height + Section/Padding V)` in
the Designer (a `calc()` with variables can't go through the MCP;
checked again 2026-10-13: `custom_value` on a Size variable still
fails). A project that needs the same sums elsewhere (a negative section
padding for a full-bleed element, the nav height plus the section
padding) has a [Person] add them once as Layout variables with a custom
value, `calc(var(--_layout---section--padding-v) * -1)` and
`calc(var(--_layout---nav--height) + var(--_layout---section--padding-v))`,
so classes can bind them.

**D. Page shell and components** (§1, §10), all in the component group
*Global* and named after their root class:
- **G | Components**: class G | Components (fixed, 0×0, invisible) and
  `aria-hidden="true"`. Three embeds, named in the Navigator: an empty
  **Embed · site code (GTM noscript)** for each project's body-start code
  (`conventions.md` §1), then Embeds 2a and 2b with `ORG`/`REPO`
  placeholders.
- **G | Page W**: Skip link (→ `#main`) › G | Nav W › G | Main W ›
  `main#main` with class G | Main as the slot "G | Main", then
  G | Footer W.
- **G | Nav W**: div G | Nav W › `nav` G | Nav (aria-label "Main") › a
  placeholder link. **G | Footer W**: div G | Footer W › `footer`
  G | Footer › S Wrapper Is Wide › placeholder text.
- Every page (Home, the style guide, the 404) is G | Components +
  G | Page W, with its sections in the slot. **To Slot** (dashed outline,
  "To slot" label) marks the wrapper a person drags into a page's slot.
- Built with the element builder; `nav`, `main` and `footer` tags set
  afterwards. [Person] makes `main#main` the slot and copies the shell into
  the 404 utility page (the MCP can't reach utility pages). Until a
  project pastes its head code, staging logs "[wfc] Head code config
  missing" and the 2a stylesheet 404s; both are expected in the starter.

**D2. Control components.** Built 2026-10-13; every project starts with
them and restyles them, it does not rebuild them.

| Component | Structure | Props and variants |
| --- | --- | --- |
| **Icon** (Controls) | div Icon Color › Icon Size | **The icon to insert.** Icon (`ph ph-<name>`); Color variants Inherit, Primary, Secondary, Accent, Success, Warning, Error (semantic colours, so they follow the theme); Size linked up from Icon Size |
| **Icon Size** (Controls) | div Icon › `i` Icon Glyph whose `class` attribute is bound to a prop | Icon; size variants **12px, 16px (base), 20px, 24px, 32px, 48px, 64px**: named by the size at 16px text, valued in em (0.75em … 4em). The glyph is a 1em × 1em box holding a space, aligned to flex-start (`recipes/phosphor/`). Used directly inside buttons, where it takes the button's text colour |
| **Button Content** (Button) | div › Button Icon › Icon, the label, Button Icon › Icon | Label, Icon, Icon Before, Icon After (each icon holder's visibility is bound to its switch) |
| **Button Size** (Button) | div › Button Content | pass-through props; variants Default, Small |
| **Button Color** (Button) | div › Button Size | pass-through props; variants Primary, Secondary. Hover and pressed are states on the class |
| **C \| Button** (Button) | Link Block Button › Button Color | Label, Link, Icon, Icon Before, Icon After |
| **C \| Icon Button** (Button) | `button` Button › Icon Button Box › Icon | Icon, Accessible Name (bound to `aria-label`), Hook (bound to an attribute *name*); variants Primary, Secondary |
| **C \| Video** (Controls) | `video` Video › `source` (WebM, shown only when Has WebM is on) + `source` (MP4) | MP4, WebM and its switch Has WebM, Poster, and Autoplay, Muted, Loop, Plays Inline (each bound to an attribute *name*, value `true`) |
| **Section Head** (Sections) | div › Chip, h2 D2, paragraph Body L | Chip, Show Chip, Heading, Text |

- The button is four layers so that each variant changes one single-class
  element (a variant never applies to an element with a combo). A project
  gets its own button by restyling Button Color's variants and adding one
  (a glass or outline style), never by adding combos. Decoration the
  Designer can't draw (crop marks, masks) is repo CSS on `.button`.
- [Person] On **C | Button**, expose the inner variants: select the Button
  Color instance inside it, and on its Variant prop choose *Link to new
  prop* (name it Color); the same on Button Color for Button Size's
  Variant (Size), then link that one up to C | Button too. The same on
  **Icon** for the inner Icon Size's Variant (Size): with that one link,
  Icon has both Color and Size. The API can't
  expose a variant from a nested instance.
- Forms are classes, not a component: a field's name and placeholder
  can't be bound to props, and form controls can't live outside a Form
  Block. The submit is a DOM `button type="submit"` with class Button
  holding a Button Color instance.
- Icons need the repo stylesheet (`recipes/phosphor/`). The starter has no
  repo, so its Embed 2a points at the template repo's own staging
  stylesheet; a project replaces that address with its repo's.

**E. Style guide page.** The style guide has one layout on every site
(the `webflow-style-guide` skill), and the starter holds it (built
2026-10-13): `/design/style-guide` with the frame, every **Sg** class, one
combo per colour (Sg Swatch Color), radius (Sg Radius) and spacing
variable (Sg Bar), each bound to its variable, and the nine sections for
the base system. A project fills rows instead of building a layout. The
Forms row holds the Form (class **Form**, its label **Label**, submit
**Button**), so the reserved classes, which only the Designer can create,
survive duplication. Its head code has `noindex`, and **Sg Sidebar Link**
has its Current state.

**F. Media page.** `/design/media` is there as a shell (noindex, one
section that explains the page): a project with video adds its Background
Video blocks to it ([media.md](media.md)); a project without video
deletes the page. **Never run "Clean up unused styles" on the starter:** most
classes are on no element until a project's style guide applies them.

**G. Site SEO settings** (Site settings › SEO; no API, a person or a
browser session sets them): Webflow subdomain indexing **off** (staging
serves `Disallow: /`), **Auto-generate sitemap on**, robots.txt and the
global canonical URL empty (a project sets the canonical at launch). The
starter has no site plan, so `/design/style-guide` and `/design/media`
can't be excluded from its sitemap; both carry `noindex`. On a client
site, exclude them as soon as the site plan exists
(`update_page_sitemap_status`, `includeInSitemap: false`).

The starter is never published to a custom domain and holds no client
content. When `conventions.md` changes, update the starter in the same
round of work, then refresh the `webflow-prototype` skill's
`prototype-starter/webflow-snapshot/` from it.
