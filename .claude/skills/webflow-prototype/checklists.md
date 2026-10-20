# Prototype checklists

Gates for the first phase of a Webflow project: the inputs, then each
prototype page. Setup, discovery and design work (contracts, kickoff,
research, client access) are people work and stay in the agency's own
checklist. The gates of the Webflow build itself are in the
`webflow-build` skill ([checklists.md](../webflow-build/checklists.md)).

Tags: **[Claude]** Claude does it · **[Claude checks]** Claude verifies and
reports · **[Person]** a person does it; Claude may track it, never claim it.

## Before the prototype (inputs first)

Run once, right after Project setup and before any prototype page. These
inputs change the structure of everything after them, so they come
before code. Missing → ask; Claude never fills them in with guesses.

- [Person] The design: a Figma link with a frame per breakpoint for every
  page ([figma.md](figma.md)), or the agreement to design in the
  prototype.
- [Person] The desktop design frame and the width range it scales over,
  for the fluid scaling in `src/styles.css` §01 (default 1680, scaling
  1440–1680). [Claude] sets `--size-container-ideal`, `-min` and `-max`
  from it, and the Webflow variables stay in em.
- [Person] CMS structure: collections, fields (with types), references,
  sort order, and which pages list or template them.
- [Person] SEO per page: title, meta description, H1, slug.
- [Person] States for every control and component: hover, focus,
  pressed, disabled, error, empty, open.
- [Claude] **Component plan:** every repeated block across all pages,
  listed before the first page is built, each marked *generic* (a Webflow
  component with props: Button, Card, Video) or *page-specific* (classes
  only). [Person] approves the list. It goes in `HANDOFF.md` ›
  Components to make, and each one gets its style guide row when built.
- [Claude] **Video list:** every video in the design, with the page it is
  on, whether it autoplays, and who supplies the file. Any entry means the
  build includes a media page ([media.md](../webflow-build/media.md)).
- [Person] Final content placed in the designs (no lorem ipsum), or a
  dated list of what is still to come and from whom.
- [Claude] Records the answers in `docs/handoff/HANDOFF.md` (Pages, CMS,
  Decisions) and the gaps in Open decisions.

## Prototype page done (per prototype page, before asking for approval)

The person approves a prototype page only after this. What is skipped here
comes back as rework in Webflow, where it costs more.

- [Claude] The style guide was approved before the first content page, and
  every class or component this page added has its row
  (`pnpm style-guide`, `pnpm check:style-guide`).
- [Claude checks] Tablet and phone, not only desktop: looked at 1440, 820
  and 390, no sideways scroll, nothing overlapping or cut off. `pnpm
  screens` passes: no overflow and no errors at any width from 2560 to
  360 (the screenshots are in `.screens/`).
- [Claude] States: hover, focus-visible, pressed, disabled, error, empty
  and open, for every control on the page. `pnpm check:states` passes:
  keyboard focus visible on every control, no focus ring on a mouse
  click, a pressed state on every button.
- [Claude checks] Heading outline: one h1, no skipped levels. Keyboard:
  every control reachable, focus visible, nothing trapped. Images have alt
  text or `alt=""`.
- [Claude checks] It works after every way of arriving: direct load,
  `/#section` from another page, back and forward, and by page transition
  if the site has them. No flash of unstyled or pre-animation content on
  load.
- [Claude checks] `pnpm wf:preflight` on the page: nothing the Webflow
  importer would change is left unplanned (each finding fixed, or noted
  with how it will be built).
- [Claude] The page's modules depend on `data-*` hooks, not class names;
  new classes are in `new-classes*.css` and variable changes in
  `proposed.css` as old → new.
- [Person] Approves the page at the three widths.

## Prototype handoff (once, before the Webflow build starts)

- [Person] Every prototype page approved at the three widths, and the
  style guide with it.
- [Claude] `docs/handoff/HANDOFF.md` is filled in: pages, variables and
  classes, CMS, components to make (from the component plan), modules with
  their `data-*` hooks, the video list.
- [Claude] `pnpm classes` (the class list) and `pnpm wf:styles` (the
  plan: connector, by hand, repo CSS) are current; every **by hand** line
  is already a row in `docs/handoff/MANUAL-TODO.md`.
- [Claude checks] `pnpm wf:preflight --strict` passes: nothing left to
  fix in the markup; the **plan** lines are noted in `HANDOFF.md`.
- [Claude checks] `pnpm check:snapshot`, `pnpm check:style-guide` and
  `pnpm check` pass in the prototype, and `pnpm check:drift` reports no
  drift against staging (or every difference it lists is a change still
  waiting in `proposed.css`). A snapshot made by `pnpm css:published` has
  been replaced by one from the MCP (`webflow-snapshot/source.json` is
  gone), or `HANDOFF.md` says why not.
- [Claude] The kickoff message for the build session is written
  (SKILL.md › Handing over to the build).
