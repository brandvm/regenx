# Recipe: anchor links that clear sticky bars

Use this when an in-page link (`#pricing`, a table of contents, a footer
link to a section) lands under something pinned to the top: a sticky tab
strip, a sub-nav, a fixed header. Webflow's own handler (`click.wf-scroll`
in webflow.js) offsets only for a fixed header and ignores
`scroll-margin-top`, so the heading it scrolls to ends up covered.
`pnpm wf:anchors` shows it: a row that is not `ok`.

## Add it to a project

1. Copy `anchor-scroll.ts` → `src/modules/`.
2. In `src/index.ts`: `run('anchor-scroll', () => initAnchorScroll());`
   With smooth scrolling, pass the instance the project created:

   ```ts
   const lenis = new Lenis();
   run('anchor-scroll', () => initAnchorScroll(lenis));
   ```

   Pass the instance itself, never `window.lenis`: Lenis sets that global
   to a version marker, not to the instance, and it has no `scrollTo`.
3. For a plain fixed nav, give sections a `scroll-margin-top` equal to the
   nav height (a Designer style on Section). The module adds any sticky or
   fixed bar on top of that measure.
4. `pnpm check && pnpm build`, commit `src/` and `dist/`, then on staging:
   `pnpm wf:anchors /<page>` at desktop and phone width, and arrive on the
   page from another one with a hash.

## How it works

- **Unbinds webflow.js** through `Webflow.push`, which runs after
  Webflow's own modules have bound (or at once if they have), so the
  unbind can't lose a race with webflow.js.
- **Measures at click time:** the offset is the larger of the target's
  `scroll-margin-top` and the bottom edge of any sticky or fixed bar that
  will be pinned over it, plus 24px. A bar only counts when it overlaps
  the target horizontally (a sticky side column doesn't), a fixed one only
  when it is a top bar (not a bottom CTA bar or a full-screen overlay), a
  sticky one only when it shares the target's parent.
- Same-page links only (same origin and path). Tab links (`.w-tab-link`)
  and modified clicks are left alone. The hash is pushed to history and
  keyboard focus moves to the target, as Webflow's handler did.
- **Reduced motion** jumps instead of gliding.
- **Arriving with a hash** from another page: the browser's jump uses
  `scroll-margin-top` alone, so the module corrects it once the page has
  loaded.

## Not covered

- Pinned GSAP ScrollTrigger sections and scroll snapping: scroll to the
  pin spacer and pause snapping during the glide, as `conventions.md` §15
  describes. Add that in the project's copy when the page has them.
- With page transitions (Barba), call it again after each swap (the click
  handler is bound once; a new call corrects the arriving hash), and
  restore the clicked link's hash after the swap.
