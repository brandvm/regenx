# Recipe: autoplay video and its pause button

Use this when a page plays a muted, looping video: a hero, a section
background, a card preview. It makes every such video load late, play only
while on screen, respect reduced motion and the visitor's own pause, and
recover when the browser refuses autoplay; and it gives the video the
pause button WCAG 2.2.2 asks for. The videos themselves come from the media
page ([media.md](../../media.md)) and play through the C | Video component
(`starter-site.md` §D2) or a Webflow Background Video.

## Add it to a project

1. Copy the files:
   - `autoplay-video.ts`, `video-toggle.ts` → `src/modules/`
   - the rule in `video.css` → `src/styles.css` §07 ACCESSIBILITY, before
     the reduced-motion block (not to the end of the file).
2. In `src/index.ts`:
   `run('autoplay-video', initAutoplayVideo);` then
   `run('video-toggle', initVideoToggle);`
3. Wire the markup in Webflow (below).
4. `pnpm check && pnpm build`, commit `src/` and `dist/`.
5. Check on staging, at desktop and phone width: the poster shows first, a
   video further down requests nothing until you scroll near it, the button
   pauses and plays, a paused video stays paused when scrolled away and
   back, and with reduced motion on (System Settings › Accessibility) the
   poster stays. On an iPhone in Low Power Mode the poster shows without
   Safari's play glyph and the video starts on the first tap.

## Markup

- **The video:** `autoplay="true"`, `muted="true"`, `loop="true"`,
  `playsinline="true"` and a poster (attributes need values,
  `conventions.md` §14). The module takes over from `autoplay`: it only
  handles muted `video[autoplay]` elements.
- **Lazy sources (optional, recommended below the fold):** bind each
  source's address to a custom attribute `data-src` instead of `src` (on
  C | Video, the MP4 and WebM props). Nothing is requested until the video
  is about a screen away. A plain `src` works too: a video that is far from
  the viewport at load has its sources detached (the request is aborted)
  and re-attached as it approaches, but the first bytes have already been
  fetched. The Designer canvas shows the poster either way.
- **The pause button:** a `button` (type button) with the attribute
  `data-video-toggle` and an Icon inside (`ph ph-pause`), in the same
  section as the video. It controls the first video in its closest
  ancestor that has one, or the one matched by a selector given as the
  attribute's value (`data-video-toggle="#hero-video"`). Its label is
  "Pause video" / "Play video"; set `data-label-pause` and
  `data-label-play` for better words ("Pause background video").
  Every looping video that plays longer than 5 seconds needs one.
- **Failed state (optional):** `data-video-guard` on the video or a wrapper
  (value: milliseconds, default 6000). That element gets
  `data-video-state="failed"` when no frame has decoded that long after the
  video was asked to play, and `"ok"` once one has. Use it to show a
  fallback ground behind a hero whose source stalls (a `js-state` rule).
- **Opt out:** `data-video-ignore` on a video another module plays (a
  lightbox, a popup).

## How it works

- `autoplay-video.ts` clears `autoplay` and decides itself: one
  IntersectionObserver attaches lazy sources about a screen ahead, another
  plays a video while it is on screen and pauses it when it leaves or the
  tab is hidden.
- **The visitor's pause wins.** Any pause the module did not cause (the
  toggle, Webflow's Background Video button, native controls) marks the
  video as paused by the visitor, and the module never resumes it. A play
  by the visitor clears the mark.
- **Reduced motion:** nothing autoplays; the poster or first frame stays
  and the toggle can still play it.
- **Refused autoplay** (`NotAllowedError`: iOS Low Power Mode, data
  saver): the poster stays, and the first tap, click or key press anywhere
  starts every refused video that is still on screen. Safari paints its
  own play and skip glyphs over a refused video; `video.css` hides them on
  any `video` without `controls` (these videos usually sit under
  `pointer-events: none`, so the glyph couldn't be pressed anyway).
- `video-toggle.ts` follows the video's own play and pause events, so its
  label and icon stay right whoever paused it. The label says what a press
  will do; there is no `aria-pressed` (a changing label plus a pressed
  state reads as a contradiction).

## Known issues

- Webflow's Background Video element has its own play/pause button in
  recent sites; with it, no `data-video-toggle` is needed, and the module
  respects its pause like any other.
- A video with sound (not muted) is left alone: browsers only autoplay
  muted video.
