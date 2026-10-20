# Working from a Figma link

The design arrives as a Figma file or frame link, read through the Figma
connector (the Figma MCP server). A link always shows the current
version, and the connector reads variables and renders frames, which a
saved `.fig` file can't. A `.fig` is the fallback only (see the end).

## What to ask for

- **The file link**, and the page that holds the approved design. A link
  to one frame (`…?node-id=12-345`) is fine for a single page.
- **One frame per breakpoint for every page.** The desktop frame at the
  design width (the fluid-scaling frame in `src/styles.css` §01), then
  tablet (≤991), mobile landscape (≤767) and mobile (≤479). Frame names
  that say page and breakpoint (`Home — Desktop`, `Home — 991`) make the
  mapping unambiguous. A breakpoint without a frame is a question for the
  designer, not a guess; mobile landscape is often skipped on purpose, so
  ask whether tablet or mobile rules apply there.
- **States** as their own frames or component variants: hover, focus,
  pressed, disabled, error, empty, open menus and dialogs.
- **Access:** the person signs in to the connector; Claude never asks for
  a token. View access to the file is enough.

## Reading the file

Per page, in this order:

1. **Structure:** list the page's frames with the connector's metadata
   call and map each one to a page and breakpoint. Write the map into
   `docs/handoff/HANDOFF.md` › Pages (the Design source column takes the
   frame link).
2. **Screenshots:** one per frame, saved to the workspace's
   `Assets/figma/<page>-<width>.png`. These are the reference for review
   while the prototype is built, and the fallback for checks when there
   is no prototype.
3. **Variables:** read the file's variables and styles once (colours,
   type, spacing, radius, with their modes). Map them onto the
   collections in `conventions.md` §4 and propose them as old → new for
   approval (the prototype's `proposed.css`). Figma names don't carry
   over: `Grey/600` becomes a primitive, and the role it plays
   (`Text/Secondary`) becomes the semantic variable classes bind.
4. **Measurements, section by section:** read the design context of each
   section frame at every breakpoint: sizes, gaps, padding, type styles,
   and the variables they are bound to. Convert px to em against the
   design's body size (`--size-unit`, 16 by default) so values follow the
   fluid scaling.
5. **Assets:** export images and icons through the connector into
   `Assets/` (SVG for icons, the largest raster size the design uses for
   photos). Licences and final photos are the person's (checklists ›
   Before building).

## Habits

- **Figma is read-only for Claude.** Questions about the design go to the
  designer; never edit the file to make it match the build.
- **A value bound to a Figma variable** uses the matching Webflow
  variable. A raw value repeated across sections is a question: should it
  be a variable?
- **Auto layout maps to flex** (direction, gap, padding, hug or fill).
  Absolute children inside auto layout are usually decoration: S Bg or a
  pseudo-element, not a flex child.
- **Text styles are roles** (D1, Body L), not one-off sizes. A text layer
  without a style is a question, not a new class.
- **Re-read before building a page.** The file may have changed since the
  prototype; compare the frame's last-modified date with the approval
  date in `HANDOFF.md` and ask if it is newer.
- **Review against the frames:** with a prototype, the `pnpm wf:*` checks
  compare staging with it. Without one, put the frame screenshot next to
  a staging screenshot at the same width and list the differences.

## Without the connector: a saved .fig file

When there is no link, or the connector can't be connected, a person
saves the file from Figma (File › Save local copy) into the workspace's
`Assets/figma/` and Claude reads it in the prototype:

```bash
pnpm fig "../Assets/figma/<file>.fig"                  # pages, frames, type styles, colours
pnpm fig "../Assets/figma/<file>.fig" --frame "Home"   # one frame: layers, sizes, auto layout, text
pnpm fig "../Assets/figma/<file>.fig" --images         # also unpack the images
```

- **What it gives:** every layer with its size, position, auto layout
  (direction, gap, padding), text, font, colours, radius and image
  fills, in `design/fig/<file>/tree.json` (not committed).
- **What it doesn't:** it renders nothing and reads no Figma variables,
  so ask the person for a PNG export of each frame (the screenshots step
  above), and treat every repeated value as a candidate variable.
- **It is a copy from one moment.** Note the date it was saved in
  `HANDOFF.md`; a design change means a new file.
- The format is Figma's own and undocumented. If a file fails to decode,
  say so and ask for the link; don't guess the design from the thumbnail.
