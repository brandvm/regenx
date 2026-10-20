# Snippets: small modules and CSS

Small pieces too short for a recipe of their own. Each file stands alone:
copy only the ones a site uses. Every `.ts` file goes to `src/modules/`
with one `run()` line in `src/index.ts` (or one entry in `definePages`
with page transitions: the ones that return a cleanup are ready for it).
Every `.css` file names the `src/styles.css` section each rule goes in.
Then `pnpm check && pnpm build`, and commit `src/` and `dist/`.

| File | Hook | What it does |
| --- | --- | --- |
| `count-up.ts` | `[data-count]` | A number counts up when first scrolled into view |
| `marquee.ts` + `marquee.css` | `[data-marquee]` | An endless sideways row |
| `faq.ts` | `[data-faq-trigger]`, `[data-faq-panel]` | Accordion, from static items or a CMS list |
| `tabs.ts` | `[data-tabs]`, `[data-tabs-tab]`, `[data-tabs-panel]` | Tabs from two CMS lists, paired by position |
| `dropdown-close.ts` | `[data-dropdown-close]` | A close control inside a Webflow Dropdown |
| `resize-reload.ts` | `[data-reload-on-resize]` | Reload when a Webflow breakpoint is crossed |
| `page-loader.css` | `[data-page-loader]` | A 4 s backstop for a page loader |
| `ix3-fallback.css` | `[data-ix-fallback]` | Shows IX3-hidden content when IX3 never starts |

## count-up

`run('count-up', initCountUp);`

The text in the Designer or the CMS is the final value ("2,400+", "$63M",
"98.5%"), so the canvas, crawlers and no-JS visitors see it. The first
number in it counts from 0 the first time it is 60% in view; prefix and
suffix stay. Screen readers hear the final text once, from a visually
hidden copy; the moving number is `aria-hidden`. The number keeps its
final width, so nothing beside it shifts. Left as written: text without a
number, ranges ("4–5"), anything already on screen at load (counting it
would flash the end value first), and everything under reduced motion.
`data-count-duration="2000"` changes the 1.6 s default.

Check: scroll to a number at desktop and phone width; nothing beside it
moves; VoiceOver reads the final value once.

## marquee

`run('marquee', initMarquee);` and the rules in `marquee.css`.

`data-marquee` on a flex row (a Collection List's items work), inside a
Designer wrapper with `overflow: hidden`. Optional
`data-marquee-speed="40"` (px per second). The items are cloned once
(`aria-hidden`, out of the tab order) and the row loops by one set. It
pauses on hover, on keyboard focus and off screen. Under reduced motion,
or without the script, nothing is cloned and the row keeps its Designer
layout: let it wrap, so every item is still there.

Check: the loop has no jump at the seam; reduced motion shows a static
row; Tab reaches each link once.

## faq

`run('faq', initFaq);`

A `button` with `data-faq-trigger` (inside the question's heading) and
the answer with `data-faq-panel`. Each trigger finds its panel by its
`aria-controls`, else inside the same `[data-faq-item]` (a CMS item, which
can't carry unique ids), else by position: the n-th trigger and the n-th
panel inside the closest `[data-faq]`. The module writes ids,
`aria-controls`, `aria-expanded` and `role="region"`, and hides closed
panels with `hidden`. `aria-expanded="true"` on a trigger starts it open;
`data-faq="single"` on the root keeps one open at a time. Panels ease
open and closed unless reduced motion is on.

Check: Enter and Space toggle; VoiceOver says expanded / collapsed.

## tabs

`run('tabs', initTabs);`

Use Webflow's Tabs element when the content is static. For tabs from a
collection, inside `[data-tabs]`: a Collection List of buttons with
`data-tabs-tab`, and a second Collection List (same collection, same
sort) whose items carry `data-tabs-panel`. The n-th tab shows the n-th
panel. The module writes the ids, `aria-controls`, `aria-labelledby` and
roles; the tab list's CMS wrappers become `tablist` and `presentation`
(Webflow publishes `role="list"` on them, which hides the tabs as tabs).
`[data-tabs-number]` in a tab is filled with 01, 02… The active tab gets
`.is-active` (style it as a Designer combo class) and `aria-selected`;
arrow keys, Home and End move between tabs.

Check: both lists use the same sort and filter (pairing is by position);
`pnpm wf:a11y` shows no list or tab errors.

## dropdown-close

`run('dropdown-close', initDropdownClose);`

`data-dropdown-close` on any element inside a Webflow Dropdown's list (a
"Close" button in a mega menu, a link to a section on the same page). A
click triggers Webflow's own `w-close` jQuery event on the dropdown (a
native event doesn't reach it) and blurs the toggle. One delegated
listener covers dropdowns added later.

## resize-reload

`run('resize-reload', initResizeReload);`

A stopgap for a page whose scroll scene or interaction is built for one
layout and can't rebuild itself (`ScrollTrigger.refresh()` doesn't fix
it). Opt in per page with `data-reload-on-resize` on `<body>` (page
settings) or on any element of that page. It reloads only when the
window crosses a Webflow breakpoint (991, 767, 479; add the larger ones
in the file if the site uses them), 250 ms after the last change, never
for a resize within a breakpoint or the phone's address bar. Remove it
once the animation follows a resize.

## page-loader

The rules in `page-loader.css`, and `data-page-loader` on the loader. A
full-screen loader whose only exit is an interaction or a module stays
over the site for good when that never runs. The CSS fades it out and
stops it taking clicks 4 s after first paint, whatever happens; it is
never shown in the Designer canvas (`html.wf-design-mode`) and not at all
under reduced motion. See conventions.md §16.

Check: block the bundle (DevTools › Network › block request URL) and
reload: the loader leaves after 4 s.

## ix3-fallback

The rule in `ix3-fallback.css`, and `data-ix-fallback` on each element
IX3 hides before its entrance (first-screen content: nav buttons, hero
heading and CTA). Webflow sets `w-mod-js` on `<html>` when webflow.js runs
and `w-mod-ix3` when IX3 starts; in between, or if IX3 never starts, the
rule keeps those elements visible. Visibility only: an entrance that
starts at opacity 0 or off-screen needs moving off IX3 instead. It is an
`override-webflow` rule, so ask first and log it in `GOTCHAS.md`. See
conventions.md §16.
