# Build checklists

Gates for the Webflow build, from the agency's project checklist. They
start with the prototype (from the Figma file to a prototype the client
approved), then run from the design handoff to the build handoff. The
`webflow-prototype` skill has the prototype's working rhythm, and its
[checklists.md](../webflow-prototype/checklists.md) the inputs and the
gates for each prototype page.

Tags: **[Claude]** Claude does it · **[Claude checks]** Claude verifies and
reports · **[Person]** a person does it; Claude may track it, never claim it.
Commands are the check scripts (`pnpm wf:*`, see SKILL.md › Checks).

How to record progress: when an item is done, tick it in
`docs/handoff/progress.json` with `pnpm progress tick "<checklist>" "<the
start of the item>"`, adding `--page /path` for Page done and `--component
<Name>` for Component done. Use `--by check` when a `pnpm wf:*` script
decided it, and leave `--by` out (Claude) otherwise. Never tick a
**[Person]** item for the person: say it's theirs, or add it to their list
with `pnpm progress todo "<text>"` when they ask. Commit the file with the
work it records.

## Prototype (from the Figma file to a prototype the client approved)

Bench proves the first four: Compare › With Figma the match, and Bench's
own prototype build the link, the picks and the pages built. Don't tick
them by hand. Outside Bench, Claude ticks them when they are true: the
match after looking at each page beside its frame at the three widths.
The steps are in SKILL.md › The prototype, from Figma.

- [Claude checks] Each page matches its Figma frame at Desktop, Tablet and
  Mobile.
- [Claude checks] The Figma file is linked to the client.
- [Claude checks] Frames picked, in order, each with its page address.
- [Claude checks] Every picked frame built as a prototype page.
- [Claude checks] Tokens, fonts and images come from the file; nothing
  made up.
- [Claude checks] The Figma prototype's links work: menus, tabs and forms.
- [Person] Each page approved in the prototype (right-click in Pages).
- [Person] The client approved the prototype in writing.

## Before building (design handoff, approved in writing)

Don't start building a page in Webflow until its inputs exist. Missing →
ask.

- [Person] Final designs approved in writing, every page at every
  breakpoint (an approved localhost prototype counts).
- [Person] Component library with its rules, including hover, focus,
  error and disabled states.
- [Person] Interaction and animation specs; prototypes for key flows.
- [Claude checks] Everything in **Before the prototype**
  (`webflow-prototype`) is still current: content, SEO fields, CMS
  structure, the component plan, the video list.
- [Person] Assets exported with licences (images, icons, fonts with a web
  licence).
- [Person] Forms spec: fields, where submissions go, who is notified,
  success and error copy.
- [Person] Tracking plan (which conversions), integrations list,
  languages, accessibility standard, browsers and devices to test on.
- [Claude checks] The handoff covers edge cases: long titles, missing
  images, empty CMS lists, form errors and success, the 404 page. Ask for
  anything that isn't designed.
- [Claude] Staging password-protected and set to noindex (Page/Site
  settings, or the `noindex` meta in head code if the plan can't).

## Foundation done (once, before the style guide page)

- [Claude] Variables, tag styles, classes and CMS collections are in
  Webflow, each batch approved; the prototype's snapshot is refreshed and
  `pnpm css` shows no difference left to propose.
- [Claude] The repo holds the prototype's modules and the CSS the Designer
  can't express (each rule with its `repo-css:` tag); `pnpm check`,
  `pnpm build` and `pnpm test` pass; committed and pushed with an OK.
- [Person] Loader pasted (head code, Embeds 2a and 2b, footer code).
  [Claude checks] staging loads the bundle and the stylesheet with no
  console errors, and `pnpm wf:install` finds no drift.
- [Claude] `MANUAL-TODO.md` lists every value the API couldn't set
  (calc, gradient and shadow values, reserved names, tag styles), each
  visible one marked on the page with `data-manual-todo` (SKILL.md ›
  Standing rules), and [Person] has done them.

Then the style guide page: the `webflow-style-guide` skill's **Style
guide base done** gate.

## Media done (once, when any page plays a video)

- [Claude] The media page exists (`/design/media`, noindex, out of
  search and the sitemap) and lists every video from the video list.
- [Person] Each video uploaded there as a Background Video.
- [Claude checks] Each hosted address and poster is recorded in
  `BUILD-NOTES.md` and plays on staging; the Video component uses them.

Procedure: [media.md](media.md).

## Component done (per component, before it is used on a page)

- [Claude] Built from the real page markup, with its `data-*` hooks, ids
  and aria attributes (never from a style guide preview).
- [Claude] Props follow `conventions.md` §10; every prop is tried once
  with a non-default value on staging.
- [Claude checks] The published HTML is what the module expects
  (`pnpm wf:html`): roles, attributes, variant and conditional classes.
- [Claude] Its row is on the style guide page, as an instance.
- [Claude] Designer-only wiring is in `MANUAL-TODO.md`.

## Page done (per page, before showing it for review)

- [Claude checks] Matches the prototype at all three widths (`compare`,
  with `pass` for the details).
- [Claude] Any difference from the design that stays is explained in the
  changes log (`BUILD-NOTES.md`); the rest are fixed.
- [Claude checks] `outline`: one H1, no skipped levels, no words glued at
  line breaks; matches the H1 to H3 marked in the design.
- [Claude checks] `anchors`: every in-page and cross-page link lands on
  its section.
- [Claude checks] No serious or critical accessibility failures at any
  width (`a11y`).
- [Claude checks] No broken links; `#` placeholders are listed in the
  known issues. Run `links`.
- [Claude checks] `html`: nothing Webflow rewrote on publish breaks the
  page (roles, dropped attributes, form field names, variant classes).
- [Claude checks] `overflow`: nothing runs off the right edge and the page
  doesn't scroll sideways at any width from 2560 to 360, not only the
  three check widths.
- [Claude] States built and checked: hover, focus-visible, active,
  disabled, error; animations as specced; reduced motion respected.
- [Claude] Forms: validation, spam protection, success and error messages,
  recipients; the CRM connection if specced (logins through the vault).
- [Claude] SEO fields set: title, meta description, slug, Open Graph
  image; alt text on content images, `alt=""` on decorative ones.
- [Claude] CMS: fields bound, empty-list and missing-image states handled,
  conditional visibility for optional fields.
- [Claude] No placeholder text, `#` links or stand-in images left, or each
  one listed in the known issues with an owner.
- [Claude checks] Design QA against the approved design, including states
  and animations, then [Person] the designer signs off.
- [Claude] Changes made during the build noted in the changes log
  (`BUILD-NOTES.md`).

## Build handoff (to launch / QA, signed off against the design)

The documents live in `docs/handoff/`: `BUILD-NOTES.md` holds the CMS
notes, integrations, changes log, redirect map and known issues.


- [Claude] Staging link with every page complete.
- [Claude checks] Style guide final check: `pnpm check:style-guide`
  passes and the published style guide holds every class; page section
  previews whose page now exists are removed.
- [Claude checks] Fast on a phone: Home scores 90 or more
  (`pnpm wf:perf`).
- [Claude checks] The key pages measured on mobile and desktop, the median
  of several runs; the numbers go in `BUILD-NOTES.md`.
- [Claude checks] `pnpm wf:install` on every page template: the installed
  snippets match `loader.html`, one viewport meta, no localhost request.
- [Claude checks] Every page has its title, description, canonical and
  one H1 (`pnpm wf:seo`).
- [Claude checks] Open Graph tags and valid JSON-LD on every page, and
  noindex only where planned: the rest of the SEO report.
- [Claude] CMS notes: how to edit what (collections, fields, conditional
  sections, components and their props).
- [Claude] Integration list and configuration notes (no credentials).
- [Claude] Changes log from development.
- [Claude] Redirect map: every old URL → its closest new page (from the
  crawl saved in discovery).
- [Claude] Known issues, split into fix before launch and fix after launch.
- [Claude checks] `pnpm wf:overflow` on every page template: no sideways
  scroll, nothing past the right edge at any width.
- [Claude] `GOTCHAS.md` and `docs/handoff/MANUAL-TODO.md` current; every
  manual step done or handed over, and no `data-manual-todo` marker left
  in the published HTML.
- [Claude] `docs/handoff/REVIEW.md` started: what is built per page, how
  review works, the next `MANUAL-TODO.md` letter and the before-launch
  list. Review rounds are tracked there until launch.

The lists after the build (pre-launch QA, launch day, handoff to client,
after launch) are in the `webflow-launch` skill.

## Migration parity (a live site moving onto the template)

Before the loader replaces a live site's old custom code (SKILL.md ›
Migrating a live site):

- [Claude] `parity.oldAssets` maps every old custom-code asset;
  `pnpm wf:parity --control` is clean, so a difference is not noise.
- [Claude checks] `pnpm wf:parity --live` on every page template at every
  width: zero differences, or each one explained and approved.
- [Claude checks] Template defaults the live site didn't have (scroll
  lock, `theme-color`, the icon font, base CSS) are off, or approved as
  a later improvement.
- [Person] Approves the cutover; [Claude checks] `pnpm wf:install --live`
  after the paste.
