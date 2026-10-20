# Lessons from earlier builds

Things that cost time on earlier client builds, with the fix for each.
Read the file for the area you are about to work in; you don't need all
of them every session.

| File | Covers | Entries |
| --- | --- | --- |
| [mcp.md](mcp.md) | Webflow MCP and API: What the Webflow MCP tools (element and WHTML builders, styles, variables, components, CMS) do differently from what you would expect, and the workaround for each. | 59 |
| [designer.md](designer.md) | Designer and canvas: How the Designer, the canvas and publishing behave: combos, components, tag styles, forms, grids, empty elements. | 27 |
| [css.md](css.md) | Repo CSS: Repo CSS against the Designer: cascade, focus, fixed children, overflow. | 14 |
| [js.md](js.md) | JavaScript modules: Modules, GSAP, Lenis, Barba, Finsweet and Webflow's own scripts. | 22 |
| [loader-release-ci.md](loader-release-ci.md) | Loader, release and CI: The three snippets, releases with jsDelivr tags, and the CI checks. | 13 |

## Titles

**Webflow MCP and API** ([mcp.md](mcp.md))

- Upload a local file as an asset without a public URL
- `set_attributes` works on DOM elements, fails on Image elements
- `publish_site` wants custom domain IDs, and counts toward the 1/min limit
- Only one collection can take breakpoint auto-modes
- Style MCP rejects variables on row-gap / column-gap
- "Label" is a reserved class name
- Tag styles other than body are unreachable by MCP
- `mode_id: "base"` fails on variable updates
- Style values containing `var()` collapse to one variable
- "Form" is a reserved class name; outline-width takes no variable
- WHTML importer: classes, forms, images and limits
- Component props: what the MCP can and can't wire
- WHTML importer turns `<button>` into a link
- Sitemap indexing API is plan-gated
- Element builder: rejected actions can still leave an element
- TextBlock builder makes an uneditable Block; WHTML drops fs-* attributes
- CMS API: Number fields are integers; new collections need a site publish
- WHTML drops the whole class list if one class is missing
- Nested button components: what the MCP can't do
- `remove_style` only sees usages on the page in context
- Importer drops <img> attributes; Webflow drops valueless video booleans
- API gaps met building a home page
- Line breaks in headings drop the word space
- Variable writes hit a rate limit; breakpoint auto-modes work on a fresh collection
- Breakpoint variable modes don't read back; tag styles need the right site
- Filled slots read back empty
- Slots: the MCP can work beside a plain element, never start one
- Element snapshots can show stale styles
- WHTML importer turns inline styles into `inline-div-N` combos
- API-uploaded assets stay size 0 and don't render in components
- CMS image fields re-host an image from a public URL
- A box-shadow with a variable can't be set through the API
- WHTML import with `css` creates the classes too
- The importer drops section ids and new-tab targets; an element without an id can't be a link target
- No reorder for variables: swap names and values instead
- A collection's modes do nothing until a style sets them
- The Current state can be written, but only on a new class
- Sitemap exclusion is plan-gated; site SEO settings have no API
- Building nested components through the MCP: what works
- `set_text` fails on imported blocks; a property can't be removed and set in one update
- Element builder: a DOM element's attributes can't be set at creation; `query_elements` style and text filters find nothing
- Variant overrides on a combo element never apply
- CMS template: list sources, item roles and bound line breaks
- Restructuring a component copy: List Items and prop ids
- CMS images over 4 MB are dropped silently; updates need name and slug
- Month-only CMS dates display a month early
- Page SEO through the API: what sticks and where
- Unlinked instances lose conditional classes; link `rel` doesn't publish
- Three "manual" steps the API can do after all
- Collection List writes fail inside a slot or a component
- A section containing a Collection List can't become a component
- An imported combo can publish as a bare class
- Keep a CMS template off the site with its toggle, not with draft
- Bulk rich-text content: the Designer's CSV import, not the API
- Nested Collection Lists: Show defaults to 5, and the source shape
- Custom form messages: build inside the component, keep display off the class
- Imported divs reject conditional visibility; a Collection List can't sit in a Link Block
- A variable create can come back suffixed; `rename_variable` works
- Links in CMS copy: RichText companion fields; nested link styles are Designer-only

**Designer and canvas** ([designer.md](designer.md))

- CMS text bindings inside JSON-LD can break the schema
- Phone hero video: serve what `object-fit: cover` actually shows
- A two-class combo can't be edited from a three-class element
- Gradient layers have no size/tile in the Designer
- Webflow form and dropdown defaults leak through our classes
- Webflow rewrites roles and drops attributes on publish
- Native `<button type="submit">` in Webflow forms
- Inter Variable narrows large type (optical size)
- Designer canvas draws a templateless grid as 2×2
- Canvas `.wf-empty`: empty elements show as 75px boxes or vanish
- Split text in Webflow Spans flattens when edited
- Conditional classes are typed slugs, not linked styles
- em spacing moved from a button to its wrapper changes size
- Removing a rule locally does not remove it on the canvas
- An Embed with a script hides its stylesheet link on the canvas
- Image Load (lazy/eager) is per instance; preload doesn't fix render delay
- A space as an element's only text publishes as `&nbsp;` and shifts an icon
- Webflow writes stale size attributes on `<canvas>`
- A variable mode on a class doesn't recolour inherited text
- Duplicate ids in CMS lists and component instances
- Typography classes nest in em
- A Link Block's `max-width: 100%` caps a negative-margin bleed
- A variant's class is compound per element; a border with no colour fades from currentColor
- Empty slots take cut and paste; date formats and "exclude current item" in the Designer
- A capped bleed sticks to the left on wide screens; Finsweet's filtered count is `results-count`
- An IX3 entrance's hidden start state has no fallback
- A page loader with no exit except a Webflow interaction

**Repo CSS** ([css.md](css.md))

- Measure preloads; font preloads can make it worse
- Horizontal scrollers drag vertically
- Template focus rule overrides Designer focus states on inputs
- backdrop-filter traps fixed children (floating nav)
- Element resets in §02 beat Designer tag styles
- Neutralizers in §03 override Designer styles
- Root font-size scale drifts from Designer tokens
- Renaming a Webflow variable silently breaks repo CSS
- Prototype generators lose large breakpoints and `.w--` states
- Prototype stand-ins override an existing site's tag styles
- `<button>` drops the inherited letter-spacing
- A script-hidden overlay blocks the Designer canvas
- A scroll lock belongs on `html` only: locking `body` un-sticks the header
- Finsweet filters: style `.is-list-active`, and the operator is `contain`

**JavaScript modules** ([js.md](js.md))

- Barba: forms dead after a page change; stale head and current links
- Pins created out of page order are measured in the wrong place
- Barba ignores a root `custom` rule when `to` or `from` is set
- iOS Low Power Mode refuses autoplay and Safari paints a play glyph
- Testing local code in the built-in browser pane
- Moving off IX3: decode the published interactions, then replay them
- Finsweet recipe: keep it out of index.js
- Finsweet Combo Box 2.7.1 differs from its docs
- Webflow images publish with srcset; swapping src does nothing
- Arriving at /#section lands short of the section
- gsap.from() start state reverts on load: hero flickers
- Barba: first-load hooks, lost hash, missing types
- Page modules torn down per Barba page
- Anchors to pinned sections land at the end of the pin
- One throwing module leaves the page scroll-locked
- CDN `defer` scripts cannot be ordered against the bundle
- Webflow's anchor scroll ignores a sticky header
- `window.lenis` is a version marker, not the instance
- GSAP `.from()` animates to the current value: items stranded at 0
- A consent manager blocks the dynamically inserted bundle
- HubSpot forms with CAPTCHA must use the embed
- A WebGL context created before the first paint delays it

**Loader, release and CI** ([loader-release-ci.md](loader-release-ci.md))

- Filling in REPO in loader.html breaks the browser tests
- Local Lighthouse adds a second to some hosts on some networks
- Staging fetched its stylesheet twice before first paint
- The Designer's custom-code preview isn't staging
- Swapping the stylesheet href in 2b causes a full-page layout shift
- Setting RELEASE in loader.html breaks CI
- The staging link in Embed 2a costs production a render-blocking request and a second CSS download
- A parity check on settled pages misses layout shifts
- Lighthouse and PageSpeed don't emulate prefers-reduced-motion
- Body Embed stylesheet: page paints unscaled, then jumps
- Static localhost link is requested by public visitors
- VER lives in two snippets and a placeholder 404s at launch
- The add -f dist / untrack release ritual is error-prone

## Adding a lesson

A project logs a surprise in its own `GOTCHAS.md` and tags it
`template-candidate` when it would recur on any project. Those entries are
collected into these files (see the template README › AI agents), with client
names, copy and project-only details made generic. Keep the entry format of
`GOTCHAS.md`, without the Scope line.
