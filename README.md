# RegenX — Webflow custom code

CodeSandbox migration for **RegenX**, Webflow SiteID `6a343f4bd4c8ed2f7270a980`.
Webflow owns the pages, CMS, layout, native interactions, and form submission.
This repo builds the site's custom JavaScript and CSS.

**Current phase: development/staging.** Production is intentionally unconfigured.

## Install and run

Use Node 22+ and pnpm 11 (`packageManager` pins the pnpm version).

```sh
pnpm install
pnpm dev
```

Open **https://regen-x.webflow.io/?bv-dev=1** after installing the snippets below.
Allow the browser's local-network access prompt if it appears. The page stays on
Webflow; its custom assets come from `http://localhost:3000`. Saving source files
reloads that page. The local server serves JS/CSS, not a copy of the Webflow site.

On `*.webflow.io`, a small **Staging** or **Dev** pill sits in the bottom-left
corner. Click it to open the segmented switcher, then choose a mode. The page
reloads and remembers your choice. The control starts collapsed, fades when idle,
and collapses when you click elsewhere or press Escape. If the local server is
unavailable, it shows **Staging** as the actual source and explains the fallback
when expanded. Start `pnpm dev` and click **Dev** to retry.

The control is included in the bundle, so existing Webflow snippets do not need
updating. It is hidden outside `.webflow.io`, in the editor, and when printing.

- `?bv-dev=1` enables local assets and persists on the staging origin.
- `?bv-dev=0` returns to staging assets.
- An explicit URL flag works even if localStorage is blocked.
- If local CSS or JS fails to load, both assets switch to staging.
- If neither source is available, the page unlocks and the console reports why.
- A separate head watchdog unlocks the page after eight seconds even if a request hangs.
- For another device, deploy to staging; that device's localhost is not this machine.

## Install in Webflow — once

[`loader.html`](loader.html) contains **three marked pieces** with RegenX URLs
already filled in. Copy the content of each piece into its stated location.

1. **HEAD → Site settings / Custom code / Head code.** Replace the current global
   head block. It preserves the supplied viewport/theme metadata, Ahrefs, and
   Finsweet Mirror Click, and adds environment configuration and scroll-lock recovery.
2. **EMBED → the shared global-code component on the Designer canvas.** Replace
   the existing CodeSandbox CSS/icon-font embed with this piece. Ensure that
   component appears on every page. Keep other embeds, such as video markup.
3. **FOOTER → Site settings / Custom code / Footer code.** Replace the old Lenis
   CDN tag, inline Lenis setup, and both CodeSandbox script tags with this piece.
4. Keep Webflow's native **GSAP, ScrollTrigger, SplitText, and CustomEase** settings
   enabled; Webflow interactions use them. The bundle shares the existing GSAP
   instance and has packaged fallbacks for standalone local fixtures.
5. Publish the Webflow site to **the `.webflow.io` staging domain**.

The three old CodeSandbox references should be gone: `regenx-main.css`,
`regenx-wave.js`, and `regenx-main.js`. Keeping the old JS alongside the new loader
would register duplicate listeners and animations.

The Embed keeps Remix Icon 4.9.0 available in the Designer. Its static staging and
local CSS links also support canvas styling where scripts do not execute. In the
Designer, the two stylesheets are additive: test deleted rules on the published
page with `?bv-dev=1`. The published page uses a single selected stylesheet.
If the Embed is missing, the footer can still supply site CSS and JS, but the
Designer preview and icon font require the Embed.

## Deploy staging assets

The staging asset URL is **https://brandvm.github.io/regenx/**.
GitHub Pages is enabled with **GitHub Actions** as its source (2026-09-15).
Pushes to `master` trigger the `staging` workflow to deploy the current build.

1. GitHub `brandvm/regenx` uses **Settings → Pages → Source → GitHub Actions**.
2. Push changes to `master`. The `staging` workflow installs dependencies,
   checks TypeScript, builds `dist/`, and deploys it to GitHub Pages. It can also
   be run manually using **Actions → staging → Run workflow** after it is pushed.
3. Check the workflow succeeds and `/regenx/index.js` and `/regenx/styles.css`
   return 200. Then open **https://regen-x.webflow.io/?bv-dev=0**.

Later source edits only need a push; another Webflow publish is needed only when
changing Webflow content or one of the snippets. The loader cache-busts staging
assets each page load. The dev server binds to loopback and permits cross-origin
requests from the published Webflow page.

## Contact form

The Contact page uses one Webflow form inside `[data-form-steps]`, with one
`[data-step]` per pane. Next uses `type="button" data-step-next`; Back uses
`type="button" data-step-back`; Submit uses only `type="submit"`.

Back is hidden on the first step. Next stays disabled until the current pane's
required fields and each `[data-step-required]` choice group are valid. Submit
stays disabled until the final step and all panes are valid; clearing a required
field disables it again. Location/State is required in Webflow, matching its label.
The runtime wraps Submit in a fieldset to keep field validation separate from
Webflow's own disabled state for spam protection and pending submissions.

## Commands and verification

```sh
pnpm dev                  # watch + assets on localhost:3000
pnpm check                # strict TypeScript checks for the new integration code
pnpm build                # minified dist/index.js and dist/styles.css
pnpm exec playwright install chromium  # first browser-test setup
pnpm test                 # build + isolated browser regression tests
pnpm test:webflow          # build + read-only checks against published Webflow HTML
node scripts/check-webflow.mjs --local /  # verify a running pnpm dev server
```

The migrated main and WaveGrid files remain JavaScript (`allowJs` enabled,
`checkJs` disabled) to preserve the supplied code without a broad type conversion.
Browser tests cover those files' runtime integration. `pnpm check` does not type
check every inherited JavaScript function.

The isolated tests cover environment routing, storage persistence, missing CSS
Embed, local CSS/JS fallback, unavailable assets, watchdog recovery, duplicate
loaders, editor bypass, mobile footer/compare controls, form-step validation,
carousel navigation, and video mute controls.

The Webflow check intercepts published HTML in its own browser, replaces the old
snippets, and serves the local build as staging assets. It checks seven real pages
at desktop/mobile widths, including GSAP instance reuse, Lenis, WaveGrid, and
runtime errors. It writes reports/screenshots to ignored `test-results/webflow/`.
Media downloads are skipped, so this is not a full video-playback check.
It does **not** update or publish Webflow, submit forms, or deploy GitHub Pages.
It checks the pre-migration markup and needs updating after the live snippets change.

## Source map

| File | Purpose |
| --- | --- |
| `src/index.ts` | Wait for DOM/Webflow, boot once, release the loading state |
| `src/modules/animation.ts` | Share Webflow GSAP/plugins with packaged fallbacks |
| `src/modules/smooth-scroll.ts` | Original vertical + responsive horizontal Lenis setup |
| `src/modules/environment-switcher.ts` | Compact staging-only Dev / Staging control |
| `src/modules/main.js` | Supplied main features, with explicit imports and isolated initialization |
| `src/modules/wave-grid.js` | Supplied shader/options and public `window.WaveGrid` API |
| `src/styles/site.css` | Existing site CSS fetched from its CodeSandbox link on 2026-09-15 |
| `src/styles.css` | Site CSS, Swiper/Lenis CSS, and migrated document-state rules |
| `loader.html` | The three Webflow snippets |
| `build.mjs` | esbuild bundle + development live reload |

The existing 1680px desktop sizing system replaces the template's 1440px defaults.
Swiper 11.2.10 and Lenis 1.3.24 are pinned to the versions used by the old code;
GSAP 3.15.0 matches the published site's native scripts. Swiper now loads from the
bundle instead of injecting CDN scripts/styles asynchronously. The shadowed first
`linkControllers` definition was removed; the effective second implementation is
preserved. A single feature initialization error is logged without preventing the
remaining features from initializing.

`TabDeepLink.init()` and `Anchors.init()` were commented out in the supplied main
script and remain disabled. The supplied code has no preloader animation; startup
releases its loading state and hides any `.preloader` overlay. `?debug=1` retains
the original on-screen diagnostics and `window.__RGX` helpers.

## Production — later

There is no production release in this migration. When ready, build and commit
`dist/` into a release tag before pointing `RELEASE` in the **HEAD** snippet to it.
For example, `RELEASE = "1.0.0"` uses
`https://cdn.jsdelivr.net/gh/brandvm/regenx@1.0.0/dist/`.

Never move a published tag. After tagging a commit containing the build, untrack
`dist/` with `git rm -r --cached dist` in a subsequent commit so daily builds stay
ignored. Validate the pinned JS and CSS URLs, update the head snippet, and verify
before publishing to a custom domain. Rollback uses the prior release value.
