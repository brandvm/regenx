# Recipe: Phosphor Icons in the bundle

Every repo from the template ships the **regular** weight of
[Phosphor Icons](https://phosphoricons.com) as an icon font, bundled into
`styles.css`. One Icon component in Webflow then covers about 1,500 icons:
the icon is chosen by typing its name into a prop, with no SVG upload and
no embed.

It is bundled, not a `<link>` to a CDN in Webflow's custom code: the font
is pinned to the release like the rest of the code, and because the
stylesheet reaches the Designer canvas through Embed 2a, icons show while
designing.

## Using an icon

An element with two classes: the weight, then the icon.

```html
<i class="ph ph-arrow-right" aria-hidden="true">&nbsp;</i>
```

The space inside is deliberate: the glyph is drawn by `::before`, so
without any content the Designer canvas treats the element as empty and
shows a dashed placeholder box. Webflow publishes a space set as an
element's only text as a **non-breaking** space, and that one takes up
room: inside a flex box it becomes a second item next to the glyph. So
the glyph element is a 1em × 1em inline-flex box with `justify-content`
and `align-items` at **flex-start**: the glyph fills the box from its
corner and the invisible character overflows without moving it. Centring
the two (the obvious choice) pushes the glyph left and up.

In Webflow the classes come from a prop, not from the Style panel (they are
repo CSS, the Designer doesn't know them): the starter's **Icon** component
has a custom attribute named `class` whose value is its **Icon** text prop,
default `ph ph-arrow-right`. Copy a name from phosphoricons.com and type
`ph ph-<name>`.

- Size and colour are the Designer's: the icon is a font glyph, so it takes
  `font-size` and `color` from its class or from its parent. The Icon
  component's sizes are named in pixels (12px … 64px) and valued in em
  (pixels ÷ 16): the name is the size at 16px text, and the icon scales
  when the text around it does. One component, **Icon**, carries both:
  its Color variants (Inherit, Primary, Secondary, Accent, Success,
  Warning, Error) and, linked up from the Icon Size inside it, Size.
- Decorative icons carry `aria-hidden="true"`. An icon that is the only
  content of a link or button needs an accessible name on that control.
- Check the published class list after wiring a new icon prop: the value
  is typed text, so a typo publishes without an error and shows nothing.
- Brand and social logos: upload the brand's own SVG. Phosphor's logo
  glyphs are redrawn in its style, not the official marks.

## Changing the weights (per site)

```bash
pnpm phosphor regular bold     # this site uses regular and bold
pnpm phosphor fill             # fill only
pnpm phosphor none             # no icon font on this site
pnpm build
```

Weights: `thin`, `light`, `regular`, `bold`, `fill`, `duotone`. Each one
adds about 75 KB to `styles.css` before compression (about 12 KB
gzipped) and one font of about 150 KB, which the browser fetches only on a
page that shows an icon of that weight. Commit `src/phosphor.css`,
`src/phosphor/` and `dist/`.

A weight other than regular has its own first class: `ph-bold ph-<name>`,
`ph-fill ph-<name>`, `ph-thin`, `ph-light`, `ph-duotone`.

## Only the icons the site uses (`--subset`)

```bash
pnpm phosphor --subset                          # regular, icons found in src/** and phosphor.icons
pnpm phosphor --subset regular bold --icons x,list,caret-down
pnpm phosphor --subset --from https://<SLUG>.webflow.io   # + every page in its sitemap.xml
pnpm build
```

The script collects icon names from `ph-<name>` classes in `src/**`, from
`phosphor.icons` at the repo root (one name per line, `#` comments), from
`--icons`, and with `--from` from the class attributes of every page in
that site's `sitemap.xml` (the page alone when there is none). It keeps
only those icons' rules in `src/phosphor.css` and cuts each weight's font
down to their glyphs with `subset-font` (a few hundred bytes per icon
instead of ~150 KB), inlined into the stylesheet as a data URL: no font
request, so no invisible-icon moment either. A name that is not a Phosphor
icon is reported, which catches the typo that otherwise publishes silently.

The trade-off, which is why the full font stays the default:

- **A new icon shows nothing until the script runs again.** Typing
  `ph ph-house` into an Icon prop draws an empty box on the canvas and on
  the site until someone re-runs `pnpm phosphor --subset`, builds and
  pushes. Keep the list in `phosphor.icons` (or re-run with `--from`) so
  the next run doesn't drop icons that only Webflow names.
- **The Designer canvas shows only the subset.** Picking icons by trying
  names on the canvas no longer works; use phosphoricons.com.
- Every icon is in every page's stylesheet: fine for tens of icons, but
  past a few hundred the full font (fetched only on pages with an icon) is
  smaller.

Use it on a site whose icon set is settled, typically before launch.
`pnpm phosphor` (no `--subset`) goes back to the full font.

## How it works

- `scripts/phosphor.mjs` downloads, for the pinned version, the stylesheet
  and `.woff2` of each chosen weight and writes `src/phosphor.css` (with
  the `@font-face` reduced to woff2) and `src/phosphor/`. The npm package
  is not installed: it is about 46 MB. `--subset` starts from the same
  full download every time, so re-running it never loses glyphs.
- `src/styles.css` imports `phosphor.css` first (an `@import` must come
  before every rule). `build.mjs` copies the fonts to `dist/fonts/` with a
  content hash in the name.
- To move to a newer Phosphor version, change `VERSION` in the script, run
  it, build, and look at a page with icons before committing.

## Known limits

- The icon font is `font-display: block`: an icon is invisible, not a
  wrong letter, until the font arrives. Preload the font in head code on a
  site whose first screen depends on an icon.
- The starter Webflow site has no repo of its own; its Embed 2a points at
  the template repo's staging stylesheet so its icons show. A project
  replaces that address with its own repo's, as for the rest of the loader.
