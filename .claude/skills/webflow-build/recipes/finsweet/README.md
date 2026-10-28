# Recipe: Finsweet Attributes as a bundled module

Use this when a project needs Finsweet Attributes (List, Combo Box, …).
Finsweet is bundled from the pinned npm package and started by our own
module. **Never** add Finsweet's `<script src="…@finsweet/attributes…">`
tag to Webflow's custom code: a CDN tag can't be ordered against our
bundle, isn't version-pinned with the release, and loads every page.

The markup stays exactly as the Finsweet docs describe (`fs-list-element`,
`fs-combobox-element`…); only the loading changes.

A searchable select built on Combo Box, with the Webflow structure, the
classes it needs and its pitfalls, is in
[searchable-select.md](searchable-select.md).

## Add it to a project

1. Copy the files:
   - `finsweet.ts`, `finsweet-registry.ts` → `src/modules/`
   - `finsweet-dist.d.ts` → `src/`
   - `finsweet.mjs` → `scripts/`
2. In `package.json` scripts: `"finsweet": "node scripts/finsweet.mjs"`.
3. In `src/index.ts`, import `initFinsweet` and run it **last**:
   `run('finsweet', initFinsweet);` (it starts a microtask later, so
   attributes set by earlier modules are seen). With page transitions, call
   `resetFinsweet()` when a page leaves.
4. Choose the attributes: `pnpm finsweet add list combobox`
   (`pnpm finsweet list` shows them all). The first `add` installs
   `@finsweet/attributes` at an exact version. Only the chosen attributes
   are bundled (List + Combo Box ≈ 120 KB minified).
5. `pnpm check && pnpm build`, commit `src/`, `scripts/`, `dist/`,
   `package.json`, the lockfile and `pnpm-workspace.yaml`.
6. Remove any Finsweet `<script>` tag from Webflow's custom code.

To update Finsweet later: `pnpm update @finsweet/attributes`, then
`pnpm finsweet sync` (the distribution file names change per version).

## How it works

- `finsweet-registry.ts` (written by `pnpm finsweet`) maps each chosen
  attribute to its file in the package's `dist/`, read from the package's
  own loader (`attributes.js`).
- `finsweet.ts` does what the CDN loader does: creates
  `window.FinsweetAttributes` (`scripts`, `modules`, `process`, `load`,
  `push`, `destroy`), finds which chosen attributes the page uses (any
  `fs-<name>…` attribute), and starts only those, each once one of its
  elements comes within two screens of the viewport or on the first
  scroll, pointer or key input (0.8.0: a list's nest fetches every item's
  page, which competed with the hero at load). `loadAttribute('list')`
  starts one at once and resolves with the List instances for modules
  that need them.

## Known issues

- **Install fails with 404** (`@finsweet/attributes-list` not found): the
  2.x package lists ~30 per-attribute packages as dependencies that were
  never published. `pnpm finsweet add` writes a pnpm override (`'-'`) for
  each into `pnpm-workspace.yaml`; the code is all in the package's `dist/`.
- **Combo Box** differs from its docs (needs a clear element, sorts options
  by value, finds parts by position): see
  [searchable-select.md](searchable-select.md) and `lessons/js.md`.
- **Hidden elements start on first input** (0.8.0): an element with
  `display: none` (a closed modal, an inactive tab) never comes near the
  viewport, so an attribute used only there starts on the first scroll,
  pointer or key input. If that input is the click that opens it, the
  attribute sets up a moment after it appears; call
  `loadAttribute('<name>')` from a module to start it at load instead.
