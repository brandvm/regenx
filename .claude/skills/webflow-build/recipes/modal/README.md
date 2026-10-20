# Recipe: modal dialogs

Use this for any overlay built in the Designer that opens over the page: a
newsletter popup, a "Book a call" form, a card's detail panel. It makes
the overlay a real dialog (focus kept inside, the page behind inert,
Escape closes, focus goes back), locks scrolling without breaking a sticky
header, and opens from ordinary `#name` links, so a Designer button only
needs its link set.

## Files

- `modal.ts`: `initModals(lenis)`; returns a cleanup for page transitions.
- `modal.css`: the fade (`js-state`), the no-Lenis scroll lock, reduced
  motion and the canvas rule.

## Add it to a project

1. Copy `modal.ts` → `src/modules/`; the rules in `modal.css` → the
   `src/styles.css` sections each comment names.
2. In `src/index.ts`: `run('modal', () => initModals(lenis));` with the
   instance from [smooth-scroll](../smooth-scroll/README.md), or
   `run('modal', () => initModals());` without one. With page transitions
   it is a page module: `['modal', () => initModals(lenis)]` in
   `definePages` ([barba](../barba/README.md)).
3. Build it in Webflow (below).
4. `pnpm check && pnpm build`, commit `src/` and `dist/`.
5. Check on staging, at desktop and phone width: a `#name` link and a
   `data-modal-open` button open it; the URL `/page#name` opens it on load;
   Tab never leaves it; Escape, the close button and a click on the
   backdrop close it, and focus goes back to the opener; the page behind
   doesn't scroll and a sticky header stays stuck; with reduced motion it
   appears without a fade. `pnpm wf:a11y /<page>` with it open and closed.

## Markup

- **The overlay:** a component placed once (in G | Page W for a site-wide
  popup, or inside the card that owns it), with the attribute
  `data-modal="<name>"`. Style it fixed, full screen, with the backdrop
  colour and `display: flex` centring the panel. It can be left showing in
  the Designer (an "Open" variant is handy for styling): the module always
  starts it closed. Set `data-modal-display="grid"` if it shows as
  anything other than the display it has in the Designer, or `flex`.
- **The panel:** `data-modal-panel` on the card inside. It becomes the
  `role="dialog"`, labelled by its first heading (or give it
  `aria-label`). A click outside it closes.
- **Close:** `data-modal-close` on each close button (a `button`; an
  icon-only one gets `aria-label="Close"` if it has no label).
- **Openers:** any link to `#<name>` on the same page (a Designer Link
  setting, no attribute needed), or `data-modal-open="<name>"` on a button.
  Both get `aria-haspopup`, `aria-controls` and `aria-expanded`.
- **From another page or an e-mail:** link to `/page#<name>`.

## How it works

- **Portal.** The overlay moves to `<body>` at start, so no `transform`,
  `filter` or `overflow` on an ancestor can clip it or re-anchor
  `position: fixed`.
- **Closed means `display: none` inline**, whatever the Designer shows.
  Open sets the stored display, then `.is-open` a frame later so the CSS
  fade runs; closing waits for the fade (or 400 ms) before hiding.
- **Modal behaviour.** Every other child of `<body>` gets `inert` while it
  is open, so neither Tab nor a screen reader reaches the page; Tab and
  Shift+Tab also wrap inside the panel. Focus starts on the first form
  field, else the panel.
- **Scroll lock.** `lenis.stop()` / `start()` on the instance passed in.
  Without Lenis (reduced motion), `html.is-modal-open`. Only `<html>` is
  locked: `overflow: hidden` on `<body>` makes body the scroll container
  and un-sticks a sticky header.
- **Hash.** Clicks are caught in the capture phase, before anchor-scroll
  or Barba see the `#name` link; the hash isn't pushed. Loading or
  navigating to `#name` opens it (`hashchange`), and closing removes the
  hash from the URL.
- **One at a time.** Opening a second modal closes the first.

## Known issues

- Before the bundle runs, an overlay left open in the Designer is
  transparent (`opacity: 0`) but still covers the page for that moment;
  leave it closed in the Designer when that matters.
- A video inside a modal: mark it `data-video-ignore` (video recipe) and
  play or pause it from the project's copy on open and close.
