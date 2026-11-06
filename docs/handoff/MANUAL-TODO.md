# Manual Designer steps

Everything the Webflow MCP can't do, for a person to do in the Designer.
Claude adds a row the moment it hits a limit, with *why* the API can't;
the person marks it done; Claude then reads the result back (or checks it on
the canvas when the API can't read it) and says so.

Common reasons, so they don't need re-explaining (see the skill's
`lessons/mcp.md`):
- a value mixing a variable with `calc()`, a gradient or a shadow;
- conditional visibility on a CMS field; a list sourced from a
  multi-reference or multi-image field; "exclude current item";
- a link to the current CMS item, in a list or a component prop;
- tag styles that have never been set; reserved class names;
- placeholders, slot names, variant props exposed from nested instances.

How to enter a value with variables: select the class, switch to the
breakpoint, type `calc(` in the field and insert variables with the
variable picker. Gradients: Backgrounds → gradient, pick each stop from the
variables.

Letters run A, B, C… then AA, AB… and are never reused, so a letter
mentioned in GOTCHAS or a commit stays unambiguous. The next free letter is
also kept in `REVIEW.md` once the review phase starts.

Rows that change something visible on a page also get a marker there, so
the step is found on the canvas and nobody mistakes the unfinished state
for the design: a small Caption next to the element (on the style guide,
next to its specimen) with the attribute `data-manual-todo="<letter>"` and
the text "Manual step <letter>: <what>". When the row is done, Claude
removes the marker in the same batch that ticks the row. Before the build
handoff and before launch, no `data-manual-todo` may be left on any
published page (search the published HTML for it).

Categories to expect on every build. Go through them at the start and
again at each gate, so the steps are found early and not at the end:

1. **Values with variables in a calc, gradient or shadow** (negative
   section padding, nav height + padding, gradient stops).
2. **Reserved class names** (Label, Form) and **tag styles** never set
   before (All H1–H6 Headings, All Paragraphs, All Links): one property
   set by hand, then the API can do the rest.
3. **CMS bindings:** lists from a multi-reference or multi-image field,
   "exclude current item", links to the current item, conditional
   visibility, decimal number formats, date bindings.
4. **Component wiring:** slots made and named, variant props exposed from
   a nested instance, variant styles on an element with a combo class,
   conditional classes (typed text: check the published class list).
5. **Forms:** field names (type a value that differs from the one shown),
   placeholders, the notification address, the success and error states.
6. **Page settings:** sitemap and search exclusion, the 404 and password
   pages (the API can't reach utility pages), Open Graph images for CMS
   templates.
7. **Site settings:** fonts uploaded, head and footer code pasted, the
   staging password.

| ID | Where (page › element or class) | Breakpoint | Set | Why the API can't | Done |
| --- | --- | --- | --- | --- | --- |
| A | Site › Publish to `regen-x.webflow.io` | – | Publish the 69 interaction `data-*` hooks added 2026-11-06 (prototype/plan/interactions.md › handoff D, E). Safe on its own: the staging bundle ignores them until the repo change ships. | Project rule: Claude doesn't publish Webflow sites (PreToolUse hook) | ☐ |
| B | Repo deploy + Webflow IX3 removal, **together** | – | Commit and deploy the uncommitted interaction modules (`regenx/src`), then right away delete the 7 IX3 interactions (handoff G; the MCP can do this once you say go) and publish. Between the deploy and the removal, every hooked interaction runs twice (Webflow IX and the repo module). | Needs your OK for the commit and the deploy; G was deferred until then | ☐ |
| C | Interactions panel › Element triggers: `Acc` (C \| Accordion), `G Nav \| Drop` and `G Nav \| Menu Button` (G \| Navigation) | all | Remove the 3 IX2 pairs: FAQ Acc \| Open / Close, G Nav \| Drop Open / Close, G Nav \| Menu Open / Close (same publish as B) | The MCP can neither list nor delete IX2 (legacy) interactions | ☐ |
| D | Site › Publish to `regen-x.webflow.io` | – | Publish the user-edit changes made 2026-11-06 (prototype/plan/edits.md › Implementation handoff B–E): nav scrolled-bar / hide combos, /services cards + flat icons, Home hero carousel + peptide images and copy, pharmacy text (Why Choose component: /services, /about), Lab Panel sentence + CBC under Other Key Markers, Peptide disclaimer (2 paragraphs), TRT hero photo, Enclomiphene folder-tab markup, catalog icons, footer HIPAA seal. Can go with A. Until E ships, the nav combos are unused and Enclomiphene's tabs use the old fluid-tabs (third tab may wrap at ~820px). | Project rule: Claude doesn't publish Webflow sites (PreToolUse hook) | ☑ published by the user 2026-11-06 15:08 UTC; checked against `pnpm pull` (webflow.css, page HTML) |
| E | Repo deploy of the user-edit modules (`regenx/src`, uncommitted) | – | Commit and deploy: nav-switch.ts + styles/nav-switch.css, nav-autohide.ts, nav-shrink.js (pill target), fluid-tabs.ts (band SVG, pane slide, caret), fluid-tabs.css / benefit-slider.css / catalog-list.css, catalog-sticky.ts, hero-card-in.ts + styles/hero-card-in.css (TRT hero card scale-in), input-modality.ts + styles/focus.css (keyboard-only focus rings), index.ts + styles.css lines. Same deploy as B is fine; publish D first or together. | Needs your OK for the commit and the deploy | ☐ |
| F | Classes › `s-wrapper sw-g-nav is-rx-shrunk` (Designer name `Is Rx Shrunk`, G \| Navigation) | Desktop | Box shadow: 0 / .25em / 1.5em / 0, colour variable Alpha/Black 10 (the scrolled bar's soft shadow). No canvas marker: it would show inside the nav on every page. | A variable inside a box shadow | ☐ |
| G | /testosterone-replacement-therapy and /enclomiphene › benefits Tabs element settings | – | Fade In and Fade Out duration → 0 ms. Optional: fluid-tabs.ts sets `data-duration-in/out="0"` at runtime; this only makes the Designer match. | Tabs durations aren't among the element settings the data API exposes (only ID, visibility, attributes) | ☐ |
| H | Site › Publish to `regen-x.webflow.io` | – | Publish the audit changes made 2026-11-06 (prototype/plan/audit.md › Implementation handoff A–E): Mobile type roles, 3 new classes, 17 class edits + `C \| Heading em` colour, nav/footer labels and links, benefit-carousel arrows, `dl` protocol groups (/services, TRT), anchors, H1 on /medical-catalog, form names/labels, /about Education text, scroll-row regions, /reviews + TRT play labels, /faq icon alt; after the 15:08 publish: TRT "TRT Protocols" → `#trt-protocols` and the cleared FAQ-chip / nav-blog-card links (row V). Can go with A and D. | Project rule: Claude doesn't publish Webflow sites (PreToolUse hook) | ☐ |
| I | Repo deploy of the audit changes (`regenx/src`, uncommitted) | – | Commit and deploy: smart-swiper.js (`withListRole`), catalog-list.ts + catalog-list.css (`data-catalog-search-aside`), snap-dots.css / benefit-slider.css / therapy-timeline.css (24px dot hit areas), new catalog-search-focus.ts and faq-schema.ts, index.ts run() lines. Same commit as E: both change catalog-list.ts/.css. `pnpm check && pnpm build && pnpm test` passed 2026-11-06. | Needs your OK for the commit and the deploy | ☐ |
| J | /scientific-articles › `C \| Blog Card` instances (3 on the page + 2 inside `S \| Scientific Articles`) | – | Blog Link prop → Collection page → Current Insight (audit #1). No canvas marker: the cards are CMS items. | A link to the current CMS item in a component prop (the API accepts only URL/page links there) | ☐ |
| K | Product cards › View Details: /medical-catalog lists and sliders, Most Prescribed, /peptide-therapy `sd-media` tab cards | – | Link → Collection page → Current Product (audit #6, Q3). | A link to the current CMS item, in a list / component | ☐ |
| L | Product cards › `product-card-media` (catalog lists) and Home carousel `pci-w` | – | Add Image "Logo Mark Light.svg", alt Decorative, class `rx-product-card-fallback` (class exists), conditional visibility "Image is not set"; the product image gets "Image is set"; delete the "Image Coming Soon" text (audit #34, Q13). Check on Tamoxifen, BPC 157, GHK-Cu. | Conditional visibility on a CMS field | ☐ |
| M | G \| Navigation › Patient Information › featured blog collection list (`g-nav-resource`) | – | Fix its filter so it returns an article, or delete the list (audit #19). Its "No items found" state is hidden for now, so nothing shows. | Collection list filters aren't exposed by the data API | ☐ |
| N | Page settings › /search and /design/* (Style Guide, Medication Catalog (new), Videos, Guidelines) | – | Exclude from site search; sitemap indexing off (audit #10). | Search and sitemap exclusion aren't page fields in the API | ☐ |
| O | After H is published: check the published HTML | – | /testosterone-replacement-therapy: "TRT Protocols" lands on the expert-guidance section (`#trt-protocols`). Claude can check this once published. (The /faq icons already publish `alt=""`, checked 2026-11-06.) | Can only be confirmed on the published site | ☐ |
| P | SEO, gated on the client (audit.md › I) | – | Once approved: page titles/descriptions from `plan/seo-drafts.md`; FAQ Categories "Meta Description" field + template SEO; Products Meta Title brand form; JSON-LD from `plan/seo-schema.md` once phone/email/socials are in. The MCP can do most of it then. | Waits on client approval and inputs | ☐ |
| Q | Style Guide · Forms page (`6aedf7641b6933f3c7e4d18d`, was /design/style-guide › Forms) › the 3 placeholders marked `data-manual-todo="Q"` | – | Designer copy/paste: Contact's consultation Form Block (Form Card with `data-form-steps`), Lab Panel's search Form Block (`search-form-only is_lab`), Scientific Articles' filter Form Block (`filter-w`), each into its placeholder; then delete the placeholder text and the `data-manual-todo` attribute. On the pasted consultation form, add the custom attribute `disabled` (and `aria-disabled="true"`) to its Submit button (L1, answered: "Disable submit there"; FormSteps never clears the button's own disabled). | The importer rebuilds forms as FormWrapper › FormForm and drops the step attributes | ☐ |
| R | Style Guide · Components page (`6aedf76590169d46822c0f97`) › SAM row | – | Copy the `service-authority-block` section from /testosterone-replacement-therapy into the row's Sg Preview Screen (next to the `SAM \| Tooltip` instance shown there now). | A CMS-free section with absolute tooltips is safer pasted than rebuilt by the importer | ☐ |
| S | Site › Publish to `regen-x.webflow.io`, then `pnpm pull` + `pnpm check:style-guide` in prototype/ | – | Publish the style guide build of 2026-11-06 (prototype/plan/style-guide.md › handoff). **Published 15:08 UTC; publish again for SG23** (Sg Row Demo flex grow/shrink/basis rewritten 1 / 1 / 0% via the MCP 2026-11-06, read back: the published CSS had `flex: 0`, collapsing every demo column). After that publish, check that the published webflow.css shows `.sg-row-demo` with `flex: 1 1 0%`. Then remove or rename the prototype override `prototype/design/style-guide/index.html` so the check reads the mirrored page; expect every class and combo applied. Don't run "Clean up unused styles" before this. | Project rule: Claude doesn't publish Webflow sites (PreToolUse hook) | ☐ |
| T | Site settings › GSAP (GSAP, ScrollTrigger, SplitText, CustomEase) | – | Switch off, **after** B and C are done and staging checks out (approved by the user 2026-11-06, "Yes, after the migration"). Saves ~54 KB gzipped of script per page. Then check staging: hovers, scroll scenes, dropdowns, menu, `reveals.js`, TRT tab graphics; and whether Webflow still ships its interaction runtime chunk (`webflow.schunk.9b834957…`). | Site settings aren't in the MCP; and it must wait for B, C (Webflow IX needs it until then) | ☐ |
| U | Site › Publish to `regen-x.webflow.io` | – | Publish the user-edit changes made 2026-11-06 after 15:08 UTC: Home › Why REGENX Health (new photo + widget, two see-through stat cards, `Rx Why Visual …` classes, `why-visual-main` position relative); the rx- class renames (`Is Rx Shrunk`, `Is Rx Hidden`, `Is Rx Badges`, `Is Rx Seal`, `Is Rx Flat`, `Rx Service Card Flat Icon`, `Rx Why Visual …`). **Publish in the same sitting as E:** the new JS toggles `is-rx-shrunk` / `is-rx-hidden`, so with only one of the two live the scrolled nav bar and auto-hide lose their styles.; /testosterone-replacement-therapy hero chart card (Lottie → still image with `data-hero-card-in`, desktop and tablet). Until E ships, the TRT card shows without its scale-in. | Project rule: Claude doesn't publish Webflow sites (PreToolUse hook) | ☐ |
| V | FAQ Category template › category chip list › `chip-link`; G \| Navigation › Patient Information › featured blog card link | – | Link → Collection page → Current FAQ Category / Current Insight (audit #22, #19). The MCP's collection-page link stored only the template slug and published as a literal `href="detail_faqs"` (a 404); Claude cleared both links on 2026-11-06, so they publish without a target until this is done. | A link to the current CMS item in a list can't be set through the API (a collection-page link without an item publishes the slug as text) | ☐ |
| W | Designer (MCP app open) › Pages › `design` | – | Create the page folder `style-guide` inside `design` (`designer_tool › create_page_folder`; Claude can do it once the Designer is connected), then move the 6 style guide pages into it with these slugs (Claude can do this part by MCP: `bulk_update_pages` parentFolderId + slug): `6aebad7858e9ef245cf0e502` → `introduction` (now `/design/style-guide-introduction`), `6aedf762e48fb711ece94259` → `foundations`, `6aedf763aba5c4e8065212b4` → `elements`, `6aedf7641b6933f3c7e4d18d` → `forms`, `6aedf76590169d46822c0f97` → `components`, `6aedf76595a0f3ac06e5377e` → `classes`. No redirect from `/design/style-guide` (user, 2026-11-06). Until this is done the sidebar and pager links (already `/design/style-guide/<page>`) 404. | Folder creation needs the Designer connected | ☐ |
| X | Page settings › the 6 style guide pages | – | Exclude from site search; sitemap indexing off (as N). noindex is in each page's head code (set by MCP and read back 2026-11-06). | Search exclusion isn't in the API; sitemap controls return 403 "Site plan doesn't support sitemap indexing controls" | ☐ |
| Y | Site › Publish to `regen-x.webflow.io` after W | – | Publish the style guide split (6 pages, Sg Nav classes, SG22, SG23, rx-why-visual tile), then `pnpm pull` and `pnpm check:style-guide` in prototype/ against the mirrored pages; remove the overrides in `prototype/design/style-guide/*/` once they match. Supersedes S. | Project rule: Claude doesn't publish Webflow sites (PreToolUse hook) | ☐ |
