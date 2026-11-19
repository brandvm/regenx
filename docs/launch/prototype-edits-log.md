# User edits: Webflow-stage plan

The user's own edits, built in the prototype first. Each section lists
what is in the prototype now and the steps for the implementation stage,
in the order to apply them. Nothing here has been written to Webflow or
`regenx/src` yet.

## 1 · Nav: one hover menu, scrolled bar, hide on scroll (2026-11-05)

Asked for:
- dropdowns work as one menu: moving from one to another changes the
  content with a slide; menus open on hover only (desktop);
- keep the page overlay blur;
- once scrolled, a solid rounded background in the nav's theme colour
  behind logo, menu and CTA, with an 8% currentColor border and side
  padding easing in; the middle link group drops its own background and
  border then;
- nav hides while scrolling down and comes back when scrolling up.

### In the prototype

| File | What |
| --- | --- |
| `src/modules/nav-switch.ts` | Desktop (≥992px) hover menu. Hover opens a menu (80ms pause when none is open, at once when one is) through Webflow's own Dropdown; leaving the names and panel closes it after 200ms. Real mouse clicks on a menu name are ignored on desktop. All visuals react to `w--open`, so keyboard and touch opens animate too: one shell layer draws the white panel and moves only by transform/opacity (open 240ms, switch 320ms, close 160ms, ease-out `cubic-bezier(.22,1,.36,1)`); on a switch the old content slides out and the new slides in from the side of travel. Honours reduced motion. |
| `src/modules/nav-autohide.ts` | Toggles `is-hidden` on `.g-nav-w`: hides after 6px of downward scroll, shows on 6px up. Stays shown within 1.5× nav height of the top, while a dropdown or the mobile menu is open, and on keyboard focus. Also copies `is-shrunk` onto `.g-nav-block.is-center` (stand-in for a NavShrink target, step 4). |
| `src/main.ts` | `run()` lines for both. |
| `src/css/proposed.css` › P1 | Transitions on existing nav classes; radius and a transparent 1px border on `.sw-g-nav`. |
| `src/css/new-classes.css` › Nav scrolled bar | Combo classes `is-shrunk` (bar, middle group) and `is-hidden` (slide up). |
| `src/css/repo-proposed.css` › Nav edits | `js-state` holds (desktop only): the dropdowns' own IX open/close motion is held at its end state and the panel's own background hidden, keyed on `data-nav-switch` ("in"/"out"), so nothing animates against the shell. |

The scrolled bar uses the `is-shrunk` class `regenx/src/modules/nav-shrink.js`
already toggles after 5vh (it had no styles until now). The page overlay
blur (`nav-overlay.js`) is unchanged.

Checked at 1440 (dark Home, light /telemedicine-consent): hover open, switch
(paused mid-frame), close on leave, steady 16–17ms frames through a switch;
at 375: bar, hide/show, burger menu and its dropdowns unchanged. Not checked:
768–991, Safari, a real touch device at ≥992px (iPad landscape: touch uses
Webflow's tap, animated by the same module).

History: v1 animated Webflow's panels directly while their IX ran too
(stutter); v2 used one shell with clip-path and width/height animation
(still heavy, click to open). v3 (now) is hover-only and transform-only.

### Webflow stage (Designer)

Ask before each class or variable step (standing rule).

1. **P1, existing classes** (G | Nav component), easing
   `cubic-bezier(.64,.05,0,1)`, 600ms:
   - `g-nav-w`: transition transform.
   - `section s-g-nav`: transition padding.
   - `s-wrapper sw-g-nav`: transitions padding, background-color,
     border-color, box-shadow; radius Radius/Rounded; border 1px solid
     Utility/Transparent.
   - `g-nav-block is-center`: transitions background-color, border-color.
2. **New combo classes** (JS state; create by adding the combo to the
   element, styling it, then removing it):
   - `section s-g-nav is-shrunk`: padding top/bottom 0.75em.
   - `s-wrapper sw-g-nav is-shrunk`: padding 0.375em 0.375em 0.375em
     1.75em (Tablet and below: left 1.25em); background Background/White
     (black in dark theme, white in light); border colour Utility/U Muted
     12; box shadow 0 0.25em 1.5em Alpha/Black 10 (a shadow with a variable
     colour is a manual Designer step: MCP limit).
   - `g-nav-block is-center is-shrunk`: background and border colour
     Utility/Transparent on Desktop; at Tablet set them back to the base
     values (below 992px this block is the burger menu panel).
   - `g-nav-w is-hidden`: transform move Y −100%.
   Designer's "Clean up" removes unused combo classes: don't run it on
   these, or keep a specimen on the style guide (style-guide session).
3. **Dropdowns:** no Designer change needed; the IX "G Nav | Drop
   Open/Close" can stay for mobile (held on desktop by the repo CSS).
   Optionally limit it to Tablet and below.

### Webflow stage (repo)

4. `nav-shrink.js`: add `.g-nav-block.is-center` to its selector, and drop
   the stand-in from `nav-autohide.ts`.
5. Copy `nav-switch.ts` and `nav-autohide.ts` to `regenx/src/modules/`, add
   `run()` lines next to NavShrink/NavOverlay. Move the "Nav edits" group
   of `repo-proposed.css` to a new `regenx/src/styles/nav-switch.css`
   imported from `src/styles.css`.
6. `pnpm check`, `pnpm test`, `pnpm build`, commit `dist/` with it (only
   with the user's OK). No `loader.html` change.

### Watch for

- ix-to-repo's `dropdown-motion.ts` replaces the nav dropdown IX with GSAP
  and `nav-menu.ts` the burger IX. The holds cover the properties both
  animate (list display, panel height/transform, content opacity), and
  `nav-autohide` reads the burger state from `.g-nav-block.is-center`'s
  display. Re-check once those land.
- `nav-overlay.js` (ix-to-repo may touch it): the overlay must stay up
  through a switch (its 80ms grace covers it now).

## 2 · TRT benefit tabs: smoother gooey tabs (2026-11-05)

Asked for: remake the "gooey" folder tabs on /testosterone-replacement-therapy
(Benefits / Top Reasons / Symptoms) so they move super smoothly.

Round 1 (a transform-only rebuild with a clipped white label copy) was
rejected: it lost the gooey stretch and the user saw a messy white
background over the other tab links on change. Round 2 keeps the original
look and motion and only removes what made it costly or blink.

Why the original felt rough (`regenx/src/modules/fluid-tabs.ts`): it
repainted one SVG path the size of the whole panel (1266×600) every frame,
and Webflow faded the old pane out (100ms) and the new one in from 0
(300ms), so the panel blinked empty between tabs.

### In the prototype

| File | What |
| --- | --- |
| `src/modules/folder-tabs.ts` | A copy of fluid-tabs.ts with three changes. (1) The SVG is only the tab plus the panel's top band (tab height + panel radius, ~92px), the panel below is its own box with Webflow's fill and its top band clipped off (1px overlap, no seam), so each frame repaints ~1/6 of the area. Same springs, stretch, joins, corner clamping and label blend. (2) Webflow's pane fade is off (durations set to 0 at runtime); the new pane's content slides in from the side of travel while a copy of the old one slides out (transform/opacity, 480ms). (3) A resize snaps the tab to its link (the original kept its old spot, wrong after a width change). Marks the root bound so fluid-tabs.ts skips it. |
| `src/main.ts` | `run('folder-tabs')`, before the repo boot. |
| `src/css/repo-proposed.css` | Nothing: it reuses `regenx/src/styles/fluid-tabs.css` as it is. |

No page markup changed (the TRT page copy belongs to the audit session).

Checked: 1440 (rest; paused mid-move: stretch, label blend, no seam; pane
swap 10ms after the click), 820 (tab on its link after resize), 375 (stacked
list, panel styles cleared). Frame timing not measured on round 2: the
browser pane wasn't on screen. Not checked: Safari.

### Webflow stage

1. **Designer:** Tabs element In/Out durations 0 (tidy-up; the module also
   sets them at runtime).
2. **Repo** (with the user's OK; it changes an animation module): apply the
   three changes above to `src/modules/fluid-tabs.ts` (or replace it with
   folder-tabs.ts minus the `fluidBound` marking). `fluid-tabs.css`: the
   `.is-fluid-ready .w-tab-content { background-color: transparent }` rule
   goes (the panel keeps its fill; the script sets the clip).
3. **Caret** (asked 2026-11-05: the open tab's down arrow popped in). In
   `benefit-slider.css`, replace the two `.sb-tab-link-caret` rules with the
   "Folder tabs" caret rules in `prototype/src/css/repo-proposed.css`: the
   caret is always laid out at width 0 (its 1em gap cancelled by a negative
   margin), and on the open tab it grows to 0.75em, fades in and turns from
   right to down (450ms ease-out), so the centred label glides over instead
   of jumping. On arrival the first tab's caret grows in the same way:
   folder-tabs.ts sets `data-caret-in` on the Tabs element once 30% of the
   menu is in view, and until then the open caret stays closed (only when
   the script has bound the tabs, so without JS it simply shows). Reduced
   motion: no transition. Checked end states at 1440
   (closed carets 0px, labels exactly centred; open caret 10.8px); the
   motion itself wasn't watched (the browser pane wasn't rendering frames).

## 3 · /services cards: one grey style, flat icons (2026-11-05, client)

Client comment (Marshall Stein, on /services): keep all service cards the
same grey background as the Enclomiphene card (easier when scrolling), and
use flat icons for all of them, the ones under "Our Services".

### In the prototype

`services/index.html` (the audit session's page copy; markup edits only):
- TRT and Peptide Therapies cards: `service-card u-th-dark` →
  `service-card is_light`, and their `service-card-facts` get `u-th-dark`,
  exactly like the other four cards.
- All six `service-card-visual` blocks: the 3D render or photo is replaced by
  that service's icon from the "Our Services" list beside the cards (the
  same inline SVG, or the Enclomiphene PNG), classed
  `service-card-flat-icon`, on `service-card-visual is-icon is-flat`.

`src/css/new-classes.css` › Service card flat icon: `is-flat` (dark tile,
Radius/12, light text colour, centred) and `service-card-flat-icon` (50%).

Checked at 1440: all six cards Background/Light, facts dark, 68px dark
tiles with white 34px icons. Not checked: tablet/phone.

### Webflow stage (Designer, ask first: new classes)

1. /services › TRT and Peptide service cards: remove `u-th-dark`, add combo
   `is_light`; on each card's Service Card Facts add `u-th-dark`.
2. New combo `is-flat` on Service Card Visual + is-icon (bg Background/Dark,
   radius Radius/12, colour Text Color/Light, flex centre). New class
   `Service Card Flat Icon` (width/height 50%, object-fit contain).
3. In each of the six cards, replace the visual's image with the matching
   icon from the Our Services list (copy the SVG embed / image), class
   Service Card Flat Icon, and set the visual to `is-icon is-flat`.

## 4 · Client copy edits (2026-11-05, Marshall Stein's comments)

Text only; in the prototype page copies (`home/`, `services/`, `about/`
belong to the audit session; `lab-panel/index.html` is a new copy).

| Page › place | Was | Now |
| --- | --- | --- |
| Home › hero subline | Online TRT and Peptide Therapy Led By Board-Certified Urologists. | …Led **by** Board-Certified Urologists. |
| Home › hero feature 1 | 24/7 access to your personal Board-Certified urologist via text, call and video | …Board-Certified **Urologist**… |
| /services and /about › Why Men Choose › Licensed U.S. Compounding Pharmacies | Medications are sourced from licensed U.S. compounding pharmacies. Controlled substances are dispensed only by DEA-registered pharmacies. Select preparations undergo third-party testing before release. | All medications come from state-licensed U.S. compounding pharmacies, and select formulations are independently tested before release. |
| /lab-panel › biomarker section, first sentence | Men with low testosterone have an increased risk of mortality. | Low testosterone in men is associated with an elevated risk of all-cause mortality. |

Note: the client's screenshot of the pharmacy card shows older text than
staging has now (someone already updated it once); the new sentence above
replaces the current one. Webflow stage: edit these texts in the Designer.
Check whether the Why section on /services and /about is one component
(then one edit covers both).

## 5 · Medical Catalog on phones: sticky tabs, picture in open rows (2026-11-05, client)

Client (Marshall Stein): on the phone catalog the category menu bar scrolls
away; keep it in view like the Lab Panel's. Client and Mari also chose the
open-row version WITH the product picture (Mari: "keep the version that
includes the product preview").

### In the prototype

| File | What |
| --- | --- |
| `src/modules/catalog-sticky.ts` | Keeps the filter block (search, count + Filters, tabs) sticky with a negative top so only the tab row stays in view, 12px under the nav while it shows and 12px from the top while nav-autohide hides it (top eases, 600ms; the clip follows every frame of that). While pinned (`data-mc-stuck`) a page-coloured band fills the 12px above the tabs, over the toolbar's last px. Clips whatever of the block is above the nav's bottom edge (the toolbar peeked round the rounded bar). Phones only (`[data-catalog-compact]`). |
| `src/main.ts` | `run('catalog-sticky')`. |
| `src/css/repo-proposed.css` › Medical Catalog on phones | Sticky block (`--mc-sticky-top`, `--mc-sticky-bg` from the module), and the open-row grid: title across, picture left (5.5rem), description and buttons right; `.product-card-main` / `-info` become `display: contents` while open. |

Checked at 375: tabs stay pinned scrolling down (nav hidden, tabs at top,
active tab follows the section) and up (tabs under the nav), no toolbar
peeking; an open row shows its picture left of the text and buttons.
Not checked: 480–767, Safari/iOS.

### Webflow stage

Repo only (no Designer change): merge the CSS into
`regenx/src/styles/catalog-list.css` (it already owns
`[data-catalog-compact]`, and its `.product-card-media { display: none }`
then applies to closed rows only), and add `catalog-sticky.ts` (or fold it
into `catalog-list.ts`, which sets the compact state). Needs the user's OK.

### Pending (needs content)

- ED and hair medications: staging already has both categories with
  products (found in §8); the client's final list comes through the CMS.

## 6 · Client: CBC under Other Key Markers; new Home images from Figma (2026-11-06)

### CBC (Lab Panel)
Client: put CBC under "Other Key Markers". Staging still has it in the group
before that heading. Prototype: `lab-panel/index.html` moves the CBC
accordion (C | Accordion instance) to just after PSA under Other Key
Markers. Webflow: drag the CBC accordion instance there in the Designer.

### Home images (Figma "RegenX | Webflow", page "↪ • All Pages | Clean Up",
node 9164:6064 › Home)

Each image is the whole composed Figma frame (photo + labels), exported at
3x PNG, then WebP (cwebp q82, alpha q90, method 6). Files in
`prototype/public/figma/` (PNG masters in `public/figma/src/`).

| Section | Figma frames (left → right) | File | Size | Replaces |
| --- | --- | --- | --- | --- |
| Hero carousel | 9164:6195, 6216, 6263, 6284, 6305, 6352 (402×483) | hero-01…06.webp | 1080×1298, 37–79 KB | RegenX Hero Intro Image 01…06.webp |
| Learn How Peptides Can Improve TRT | 9164:7307, 7327, 9707:21519, 9707:21490, 9164:7400 (277×304) | peptide-01…05.webp | 830×911, 31–91 KB | Peptide Image 01…05.webp |

Prototype: `home/index.html` points the 23 `<img>` (hero cards repeat 3×
in the loop) at the new files, without srcset (Webflow regenerates its own
on upload).

Webflow: upload the 11 WebPs to Assets, then swap each image in the
Designer (hero carousel: every copy in the three loop groups; peptide cards
on Home). Alt text stays empty as now (decorative).

## 7 · Enclomiphene benefits tabs: same folder tabs as TRT (2026-11-06, client)

Prototype `enclomiphene/index.html` (audit session's copy), markup only:
`data-fluid-tabs` on the Tabs element; combo `is-fluid` on the Tabs, the
three tab links and their `service-tab-menu-icon`; `sb-tabs-content
is-fluid u-th-dark` — exactly the TRT markup, so folder-tabs.ts (§2) and
fluid-tabs.css apply unchanged (gooey tab, caret, pane slide).

Figma check (slides 9430:14600 … 9444:4206, 871×489): all 13 slides' titles
and text match staging; the remaining Figma strings are labels inside the
slide images, and the images on staging are the encl-x-y exports. No content
change needed.

Webflow: on the /enclomiphene Tabs element add the custom attribute
`data-fluid-tabs` and the `is-fluid` combos above (the classes already
exist from TRT), and set In/Out durations to 0.

TRT tabs: marked done by the user. Figma's TRT slides still carry Lorem
Ipsum on Weight Loss and Cognitive Function, so they were not a source.
## 8 · Medical Catalog categories and icons (2026-11-06, client)

Figma: file W7cneHA52eFApqbYn1mAwk, node 9691:19558 ("Frame 2147224095", CATEGORIES list 9691:19566).

### What changed (prototype)
- `prototype/medical-catalog/index.html`: in `.services-main-nav-list.is-catalog`, the inner shapes of the 8 inline category icons (`svg[data-catalog-icon]`) were replaced with the Figma vectors, recoloured to `currentColor` so the active (black) row shows a white icon. Nothing else in the markup changed: same links, `href`s, `data-catalog-link` hooks, classes (`icon _32`) and the "•••" block.
- Names and order already matched Figma on staging: New Products, Most Prescribed, Testosterone Products, Vitamins & Aminos, Enclomiphene & Clomid Products, Peptide Therapies, ED Medications, Hair Regrowth Solutions. ED Medications and Hair Regrowth Solutions already exist on staging with links, anchors (`#ED-Medications`, `#Hair-Regrowth-Solutions`) and product blocks. No reorder, rename or new category was needed.
- No CSS added (new-classes.css untouched). No JS change.

### Icon assets
`prototype/public/figma/categories/` (24×24, `currentColor`, Figma background/clip layers stripped):
new-products.svg (mage:stars-b), most-prescribed.svg (material-symbols-light:local-pharmacy-outline), testosterone-products.svg, vitamins-aminos.svg, enclomiphene-clomid.svg, peptide-therapies.svg, ed-medications.svg (boxicons:tablet; Figma's 0.4px #EEEEEE knockout stroke dropped), hair-regrowth.svg.
Peptide Therapies and Hair Regrowth were already the Figma paths; the other six were stand-ins and now match Figma.

### Webflow-stage steps (Designer)
1. Medical Catalog page › `.product-block-list-filter-w` › `.services-main-nav-list.is-catalog`: in each category link, open the icon's Embed/SVG (`data-catalog-icon="…"`) and paste the matching file's contents from `prototype/public/figma/categories/` (keep the `class="icon _32"`, `aria-hidden="true"` and `data-catalog-icon` attributes on the `<svg>`). Six to replace: new-products, most-prescribed, testosterone-products, vitamins-aminos, enclomiphene-clomid, ed-medications.
2. No class, variable or CMS change. The category list is static Designer markup (section links), not CMS-driven; only the product blocks under it are Collection Lists from Products.

### Behaviour notes (checked 1440 and 375)
- Click scrolls to the block and the active row follows on scroll (catalog-nav.ts), desktop and phone pills (catalog-sticky.ts pinning unchanged).
- On phones the pills are text-only by design: `regenx/src/styles/catalog-list.css` hides `[data-catalog-icon]` under `[data-catalog-compact]`.
- New Products is hidden (link and block) while its Collection List is empty: `data-catalog-hide-empty` in catalog-nav.ts. catalog-list.ts also hides a group and its pill on phones when it has 0 visible items (search/filters).

### Pending on content
- New Products: no items yet, so it stays hidden until the client tags products as New.
- ED Medications (e.g. Enclomiphene / Tadalafil Tablet) and Hair Regrowth Solutions (Finasteride etc.) already show staging products; the client's final product list for both is still to come and goes in through the CMS (Products), no Designer change.

## 9 · Footer badges (2026-11-06, client)

Client feedback (Figma W7cneHA52eFApqbYn1mAwk, "All Pages | Clean Up", Home
footer 9164:8677, phone footer 9691:18228): the footer's trust row under the
link columns gets a round "HIPAA Compliant" seal on the right, next to the
existing "Rx Only" and "Licensed Compounding Pharmacies" marks, and keeps
that one-row layout on phones (it stacked before).

**Prototype files changed**
- `partials/footer.html`, `partials/footer--dark.html` (edited copies): the
  `.g-footer-contact` row gets combo `is_badges`; a third
  `.g-footer-contact-item.is_seal` holding
  `img.footer-badges.is_seal` (alt "HIPAA compliant") added after the
  Licensed Pharmacies item. Rx / US images unchanged (same CDN assets).
- `src/css/new-classes.css`: group "Footer badges" appended at the end.
- `public/figma/badges/hipaa-compliant-seal.svg` (new asset).

**New classes** (combos on existing classes; need the user's OK)
- `.g-footer-contact.is_badges`: flex row, justify start, align center,
  padding-top 1.5em. ≤767: gap 4em, flex row, align center, padding-top
  1.5em, font-size .75em (scales marks to 30px, seal 50px, gap 42px, top 16px
  at 375, as in Figma).
- `.g-footer-contact-item.is_seal`: justify center, align end,
  margin-left auto.
- `.footer-badges.is_seal`: height 4.8125em (77px at the 1680 base; 66px at
  1440). Inherits `.footer-badges` opacity .56.

**Assets**
- `hipaa-compliant-seal.svg` (50 × 50.5, from Figma node 9691:18348; grey
  #9D9C9C fills turned white so the .56 opacity matches the other badges;
  black detail fills kept, footer is black in both variants).

**Webflow stage**
1. Upload `hipaa-compliant-seal.svg` to Assets (alt "HIPAA compliant").
2. With the user's OK, create the three combo classes above.
3. In the G | Footer component (applies to both Base and Dark variants):
   add `is_badges` to `.g-footer-contact`; add a Div
   `.g-footer-contact-item` + `is_seal` as its last child, holding an Image
   `.footer-badges` + `is_seal` with the uploaded seal.
4. Set the ≤767 styles on `.g-footer-contact.is_badges` at the Mobile
   Landscape breakpoint; check both variants at 1440 and 375 against the
   prototype.

## 10 · TRT hero: new photo and chart card from Figma (2026-11-06, client)

Figma: page 9164:6064 › Frame 2147224403 (TRT) › 3.2V 9164:8862 — photo
`Rectangle 34625531` (source image, 1248×1584) and the "Total Testosterone
Level" card Frame 2147224111 (9742:21968, 310×195).

Prototype `testosterone-replacement-therapy/index.html` (audit's copy):
- desktop `TRT Hero Image.webp` (image-fit---right) and tablet `TRT Hero
  Image.jpg` → `/figma/trt-hero.webp` (1100×1397, 67 KB);
- desktop card: the Lottie `scale-on-view.json` ("Free & Total Testosterone
  Level") → static `/figma/trt-hero-widget.webp` (932×586 @3x, 32 KB);
  tablet `TRT Hero Widget.svg` → the same file. The Lottie's scale-in
  animation is gone; ask whether to keep an entrance animation (CSS or a
  new Lottie).

Webflow: upload both, swap the images; replace the Lottie element in
service-hero-widget-w with an Image (class case-card-widget-image).

## 11 · Home Why REGENX Health: new image, see-through stat cards (2026-11-06, client)

Client: make the 821 ng/dL / 301 ng/mL cards "slightly more see through".
Figma (Home › 3.2V 9164:6551 › Frame 855) still has them opaque and baked
into the image group, so the prototype rebuilds them in HTML over the photo:
- `/figma/why-photo.webp` = Figma `Rectangle 93` alone (1200×866, 116 KB),
  replacing `1.png`; `/figma/why-widget.webp` (Figma 9164:6582, 32 KB)
  replacing `Why REGENX Health Widget.svg`.
- Two cards in `.why-visual-main` (home/index.html): `why-visual-stat
  is_testosterone` / `is_igf` › `why-visual-stat-dot` (› `-dot-core`,
  `is_green`) + `why-visual-stat-main` › `-value` (▲ svg + text) / `-label`.
  Style: Alpha/White 10 fill, Alpha/White 20 border, blur 8px, white text;
  positions from Figma (7%/22.4%, 62%/62.6%). new-classes.css › Why visual
  stat cards; proposed.css P2 (`.why-visual-main` position relative).

Webflow (ask first: new classes): upload the two images; build the two
cards in the Designer with the classes above; dot colours #f5d400 /
#39d353 have no variable yet (add one or keep as values).

## 12 · Double-check round (2026-11-06, client comments)

| Item | Staging vs Figma / client | Prototype |
| --- | --- | --- |
| Home › Learn How Peptides (static text, not CMS) | Heading "Learn More About How Peptides Can…"; 3 card titles longer than Figma | `home/index.html`: heading "Learn How Peptides Can / Improve Testosterone Therapy"; titles "Boost Recovery Faster: Sermorelin and CJC-1295 Optimize Growth Hormone", "Peptide Injections and TRT Work Together to Transform Body Composition", "Reduce Midsection Fat with Tesamorelin" (the other two already matched). Images: §6. |
| /peptide-therapy › Important Disclaimer modal | Old one-paragraph text | `peptide-therapy/index.html`: two `disclaimer-modal-copy` paragraphs with the client's text (supervision of a licensed physician… / Peptide regulations are evolving… Individual results may vary.). |
| /enclomiphene › Types › Flex Dose / Prime Troche | Image–title pairs are right on staging (Flex Dose = round scored tablet, Prime Troche = square troche); the Figma frame names are crossed. Figma's order is Prime Troche 4th, Flex Dose 5th; staging has the reverse. | No change: keep staging's order (Flex Dose 4th, Prime Troche 5th), user decision 2026-11-06. |
| /testosterone-replacement-therapy › TRT Response Timeline | 18 Weeks / 6 Months / 12 Months stages and text match Figma | No change. |

Webflow: edit the heading, three titles and the modal text in the Designer
(the disclaimer modal is on the Peptide Therapy page).

## 13 · Focus rings for the keyboard only (2026-11-06, client)

Ask: a focus ring only for keyboard users; mouse and touch get hover or a
subtle change. Browsers show :focus-visible after a click on text fields
and when a script moves focus (modal.ts, lab-tests.ts), so the prototype
tracks how the visitor is interacting.

| File | What |
| --- | --- |
| `src/modules/input-modality.ts` | `html[data-input="keyboard"]` after Tab, arrows, Enter, Space, Escape, Home/End/Page keys (inside a field only Tab/Escape count, so typing never flips it); `"pointer"` after any pointerdown (mouse, touch, pen). Runs first in main.ts. |
| `src/css/repo-proposed.css` › Focus rings | Keyboard: one ring for everything, `outline: 2px solid #2f6fed; outline-offset: 3px` (4.6:1 on black and on white). Pointer: `outline: none !important` on `:focus`, which also silences the repo's own `:focus-visible` outlines (benefit/timeline bullets, snap dots, catalog toggles and sheet, modal buttons, contact step 1) since they are all outlines. |
| `src/css/proposed.css` › P3 | Text fields' Focus state: Webflow's default blue border → Utility/U Muted 32 (subtle) on click. |

Checked at 1440: click into the catalog search → no outline, darker grey
border, typing a space stays in pointer mode; Tab → blue ring on the next
link; scripted focus in keyboard mode on the black footer → ring visible.
The theme text colour was tried first and rejected: the footer is black
but its theme variables read light, so the ring vanished there.

Webflow stage: repo — add input-modality.ts (boot it first in index.ts)
and a new `src/styles/focus.css` with the block; the ring colour is one
value (swap for a brand colour if wanted). Designer — the Focus state on
Search Bar Input, Search Form Input, Form Pane Text Field (border Utility/U
Muted 32). Webflow's own `.w-*:focus { outline: 0 }` resets stay.

## 14 · Nav dropdowns as a custom element (2026-11-08)

Ask: two nav menus sometimes open at once; replace the Webflow Dropdown
with a custom element. Cause: nothing enforced one open menu. Webflow's
Dropdown owned `w--open`, nav-switch opened it on hover with synthetic
`mouseup`s, and dropdown-motion and nav-overlay each watched `w--open` on
their own; closing the other menu relied on Webflow's outside-click handler,
which hover, clicks and Webflow's delayed class changes could get past.
Now one module owns the open menu (`current`), so at most one is open.

### In the prototype

| File | What |
| --- | --- |
| `scripts/nav-drop-markup.mjs` | Writes `partials/nav.html` and `nav--light.html` from `partials/live/` with the 3 menus converted (below). Re-run after `pnpm pull`. The old overrides (audit, 11-06) were stale: live now has their edits plus the data-* hooks; copies kept in `plan/backup-overrides-2026-11-08/partials/`. |
| `src/modules/nav-drop.ts` | The menus. Desktop: hover open (80ms pause when none is open), 200ms close grace, shared morphing panel and page overlay (nav-switch's motion, unchanged); a mouse click on a name only opens. ≤991: tap toggles, the list grows/shrinks (dropdown-motion's IX2 timing). Everywhere: Enter/Space toggle, Esc closes and refocuses the name, focus or a click outside closes, a link click in the panel closes. Arrow turns 180°. Reduced motion honoured. Falls back to the repo's nav-switch on `?mirror`. |
| `src/modules/nav-autohide.ts` | Copy of the repo module; the open-menu check also reads `[data-nav-drop-toggle][aria-expanded="true"]`. |
| `vite.config.js` › repo-overrides | The repo boot gets `nav-drop.ts` for `./modules/nav-switch` and the copy for `./modules/nav-autohide`. |
| `src/css/new-classes.css` › Nav menus as a custom element | The 3 combos below. |

Markup, per menu (Services, About Us, Patient Information):

```
div.g-nav-drop.is-rx-nav-drop [data-nav-drop]
  button.g-nav-link.is-rx-nav-toggle [data-nav-drop-toggle] type=button
         aria-expanded=false aria-controls=rx-nav-<menu>     ← was div.w-dropdown-toggle
    (label + arrow, unchanged)
  div.g-nav-drop-list.is-rx-nav-list #rx-nav-<menu> [data-nav-drop-list]  ← was w-dropdown-list
    (panel, unchanged; .g-nav-drop-overlay.js-close-dropdown still closes)
```

Checked 2026-11-08 (default and `?ix=off`): layout identical to `?mirror`
at 1024 (every nav item to the pixel); 1440 real-pointer hover across all
three names at 15–35ms gaps → exactly one `aria-expanded="true"` at every
step, panel morphs and shows; leave → closes; mouse click opens, second
click keeps it open; keyboard Enter/Space/Tab/Shift+Tab/Esc as above; 375
burger (`?ix=off`) tap open/close, rapid taps P→S→P → only P open, tap
elsewhere closes. Console clean. Mobile motion checked by stepping GSAP's
ticker (the pane ran hidden).

### Webflow stage (Designer)

In G | Nav (both variants), for each of the 3 Dropdowns:
1. Add a Div Block, class `G Nav Drop` + combo `Is Rx Nav Drop`, attribute
   `data-nav-drop` (empty), next to the Dropdown.
2. In it, a Custom Element, tag `button`, class `G Nav Link` + combo
   `Is Rx Nav Toggle`; attributes `type`=button, `aria-expanded`=false,
   `aria-controls`=rx-nav-services / rx-nav-about-us /
   rx-nav-patient-information, `data-nav-drop-toggle` (empty). Move the
   toggle's `G Nav Link Label` and `G Nav Link Arrow` into it.
3. After it, a Div Block, class `G Nav Drop List` + combo `Is Rx Nav List`,
   ID rx-nav-… (as above), attribute `data-nav-drop-list` (empty). Move the
   Dropdown List's child (`G Nav Drop Content W` …, and
   `G Nav Drop Overlay`) into it.
4. Delete the emptied Dropdown.
5. New combo classes:
   - `g-nav-drop is-rx-nav-drop`, Desktop: z-index 900; text-align left.
   - `g-nav-link is-rx-nav-toggle`, Desktop: background Utility/Transparent;
     text-align left; cursor pointer; Hover state: background
     Background/Light Neutral.
   - `g-nav-drop-list is-rx-nav-list`, Desktop: position absolute;
     Tablet: position relative.
The button holds Divs (Icon component), which HTML calls invalid inside a
button but every browser renders; acceptable, or ask to swap the label
wrapper for a span.

### Webflow stage (repo)

- `src/modules/nav-drop.ts` (new) from the prototype file, without the
  `?mirror` fallback import; boot it in `index.ts` where `nav-switch` runs.
- Delete `src/modules/nav-switch.ts`; delete `nav-overlay.js` and its
  `run("NavOverlay")` line in `main.js`; in `dropdown-motion.ts` delete the
  nav half (`[data-nav-drop]`, kind `nav`), keep the accordions.
- `nav-autohide.ts`: the open-menu check reads
  `[data-nav-drop-toggle][aria-expanded="true"]` (drop the w-dropdown one).
- `styles/nav-switch.css` stays (it holds the desktop display on
  `data-nav-switch`); rename to `nav-drop.css` if wanted.
- Order: repo deploy and the Designer change go out together (old JS on
  new markup, or new JS on old markup, leaves the menus without hover).

### Menu panels clipped between 992 and 1200px (fixed 2026-11-09)

`regenx/src/styles/site.css:568` sets `.g-nav-block.is-center { overflow:
scroll }` up to 1200px. It is needed: the link row (723px) is wider than
its slot there (553px at 1024), so it scrolls sideways. But it also
clipped every menu panel (staging too). Fix, kept to that range:
`.g-nav-menu { position: static }` at 992–1200px
(`src/css/repo-proposed.css`), so the lists are placed against
`.sw-g-nav`, outside the scrolling block; `nav-drop.ts` measures its
shared panel layer against the same box (`frame()`). Panels there are
centred under the whole bar and at least its width. Checked 1024 (live
hover, shell exactly on the panel), 1100, 1200, 1220, 1440: every panel
fully visible and in view.

Repo: add that media block to `src/styles/site.css` right after the
overflow rule (repo-css: designer-cant, a 992–1200px range).

### Link row fits between 992 and 1200px (2026-11-09)

Before, the row hid links past its right edge there (at 1024: part of
Patient Information, Medications, Reviews & Testimonials) until scrolled
sideways. Now it fits, in the open and the scrolled (`is-rx-shrunk`) bar,
with type size unchanged (audit #29, 12px minimum). In
`src/css/repo-proposed.css`:

| Range | Change | Row (needed/slot) |
| --- | --- | --- |
| ≤1200 | small icons before the link labels hidden; links padding .625em → .4em, gap .5em → .25em | 723 → 588 |
| ≤1090 | links padding .25em, gap .2em; Lab Tests "65+" badge hidden; logo height 1.5em → 1.2em (188 → ~151px wide, scaled, not cropped); scrolled bar's left padding 1.75em → 1em | 544 |

Menu arrows, search and CTA stay. Checked at 992, 1020, 1056, 1090,
1091, 1146, 1200 and 1201, open and scrolled: the row fits everywhere
(nothing left to scroll), with at least 13px each side (the untouched
1201px scrolled bar has 12px). Live screenshots at 1000 and 1100;
the Patient Information panel opened at 1000 shows in full. Console clean.
The `overflow: scroll` stays as a safety net (e.g. a longer label).

Repo: both media blocks go to `src/styles/site.css` with the 992–1200
`position: static` block (repo-css: designer-cant, ranges between
Webflow breakpoints). Designer: nothing.

### Implementation status (2026-11-09)

- **Webflow (done, published 2026-11-09):** combos `Is Rx Nav Drop` (z-index 900,
  text-align left), `Is Rx Nav Toggle` (background Utility/transparent,
  Hover Background/Light Neutral, text-align left, vertical-align top,
  cursor pointer, user-select none), `Is Rx Nav List` (position absolute;
  Tablet relative). In `G | Navigation` (both variants share it) the 3
  Dropdowns were rebuilt as div › DOM `button` › div list with the
  attributes and ids above; their label, arrow, panel and close overlay
  were moved in (same elements, bindings kept) and the Dropdowns deleted.
  Read back: 0 Dropdowns left, 3 custom menus with the planned tree.
- **Repo (done, deployed as 132f154):** `src/modules/nav-drop.ts` (new); deleted
  `nav-switch.ts`, `nav-overlay.js` (+ its run line in main.js and a stale
  doc comment in testimonial-videos.js); `dropdown-motion.ts` accordions
  only; `nav-autohide.ts` reads aria-expanded; `styles/nav-switch.css`
  comments; `styles/site.css` 992–1200px blocks; 2 new tests in
  `tests/interactions.spec.mjs`. `pnpm check`, build, 98/98 tests pass.
- **Prototype:** the repo-override aliases, the prototype nav-drop /
  nav-autohide copies and the repo-proposed nav blocks are gone (the repo
  has them). The partial overrides from `scripts/nav-drop-markup.mjs` stay
  until the publish + `pnpm pull`; then delete `partials/nav*.html` and the
  script (live will already be custom; the script would refuse it), and the
  new-classes.css bridge block.
- **Left:** MANUAL-TODO AA in the repo (commit + deploy, then publish,
  back to back), then a staging check at 1440, 1024 and 390.

## Implementation handoff

Status: applied 2026-11-06 except L2–L4 items (see "Implementation status" below); was: ready (Webflow class/variable creation needs the user's OK per the standing rule: L1; four small decisions open: L2–L5)
Verified in prototype: 1440 / 820 / 390 on /, /testosterone-replacement-therapy, /enclomiphene, /services, /about, /lab-panel, /medical-catalog, /peptide-therapy (2026-11-06; fresh tab, ?ix=on; nav dropdowns also with ?ix=off, i.e. with the interactions session's dropdown-motion.ts). Console clean yes (no errors on any page). No horizontal scroll at any width. Fixed during this pass: Enclomiphene folder tabs at 820 (third tab wrapped to a 2nd row → one-row rule, edits §7/H), Why card 2 clipped at 390 (→ `is_igf` right-anchored ≤767). Animations were checked by end state (the pane ran in the background); the motion itself was reviewed live earlier in the session.
- **Staging check (2026-11-09, after the publish):** 1440 real-pointer
  hover opens one menu at a time with the overlay; 1024 link row fits
  (no overflow) and all 3 panels open full width with every link
  clickable; 390 taps open, switch and close. No console errors from the
  site's code.
- **Prototype cleaned up (2026-11-09):** `pnpm pull` brought the published
  nav into `partials/live/`; removed the overrides `partials/nav.html`,
  `partials/nav--light.html`, `scripts/nav-drop-markup.mjs` and the Rx Nav
  bridge block in `src/css/new-classes.css`. Edit §14 is complete.

### A. Webflow variables
none (all values bind existing variables; two raw colours are an open question, L4)

### B. Webflow classes: new
| Class (Designer name) | Breakpoint / state | Properties (bound variables) | Used on | Item ref |
| --- | --- | --- | --- | --- |
| `section s-g-nav is-shrunk` (combo) | Desktop | padding-top .75em, padding-bottom .75em | G \| Nav section (JS state) | edits §1 |
| `s-wrapper sw-g-nav is-shrunk` (combo) | Desktop | padding .375em .375em .375em 1.75em; background Background/White; border colour Utility/U Muted 12; box shadow 0 .25em 1.5em 0 Alpha/Black 10 (manual, I) | G \| Nav wrapper (JS state) | edits §1 |
| same | Tablet | padding-left 1.25em | | edits §1 |
| `g-nav-block is-center is-shrunk` (combo) | Desktop | background Utility/Transparent; border colour Utility/Transparent | G \| Nav menu pill (JS state) | edits §1 |
| same | Tablet | background Background/Light; border colour Utility/U Muted 8 (= base values back; the block is the burger panel ≤991) | | edits §1 |
| `g-nav-w is-hidden` (combo) | Desktop | transform move Y −100% | G \| Nav wrapper (JS state) | edits §1 |
| `service-card-visual is-icon is-flat` (combo) | Desktop | radius Radius/12; background Background/Dark; colour Text Color/Light; display flex; justify center; align center | /services, 6 cards | edits §3 |
| `Service Card Flat Icon` | Desktop | width 50%; height 50%; object-fit contain | /services, icon inside each flat visual | edits §3 |
| `g-footer-contact is_badges` (combo) | Desktop | flex row; justify start; align center; padding-top 1.5em | G \| Footer badges row | edits §9 |
| same | Mobile Landscape | gap 4em; flex row; align center; padding-top 1.5em; font-size .75em | | edits §9 |
| `g-footer-contact-item is_seal` (combo) | Desktop | justify center; align end; margin-left auto | G \| Footer, seal cell | edits §9 |
| `footer-badges is_seal` (combo) | Desktop | height 4.8125em | G \| Footer, seal image | edits §9 |
| `Why Visual Photo` | Desktop | object-fit cover; width 100%; height 100% | Home › Why visual image | edits §11 |
| `Why Visual Stat` | Desktop | display flex; align center; gap .875em; white-space nowrap; padding 1em 1.5em 1em 1.125em; position absolute; border 1px Alpha/White 20; radius Radius/8; background Alpha/White 10; backdrop blur 8px; colour Base/White | Home › Why, 2 cards | edits §11 |
| same | Mobile Landscape | font-size .75em; padding .625em .875em .625em .75em | | edits §11 |
| `why-visual-stat is_testosterone` (combo) | Desktop | top 22.4%; left 7% | card 1 | edits §11 |
| `why-visual-stat is_igf` (combo) | Desktop | top 62.6%; left 62% | card 2 | edits §11 |
| same | Mobile Landscape | left auto; right 4% | | edits §11 |
| `Why Visual Stat Dot` | Desktop | flex none; 1.75em × 1.75em; radius Radius/4; background Alpha/White 20; flex centre | both cards | edits §11 |
| `Why Visual Stat Dot Core` | Desktop | .5em × .5em; radius 50%; background #f5d400 (L4) | both cards | edits §11 |
| `why-visual-stat-dot-core is_green` (combo) | Desktop | background #39d353 (L4) | card 2 | edits §11 |
| `Why Visual Stat Main` | Desktop | (no styles; text block) | both cards | edits §11 |
| `Why Visual Stat Value` | Desktop | display flex; align center; gap .375em; font-size 1.25em; weight 600; line-height 1.2 | both cards | edits §11 |
| `Why Visual Stat Arrow` | Desktop | width .6em; height .5em (inline SVG ▲, currentColor) | both cards | edits §11 |
| `Why Visual Stat Label` | Desktop | opacity .8; font-size 1em; line-height 1.4 | both cards | edits §11 |
| same | Mobile Landscape | font-size 1.2em (≥12.7px at 390, audit #29 minimum 12px) | | edits §11 |

### C. Webflow classes: changed
| Class | Breakpoint / state | Property: old → new | Item ref |
| --- | --- | --- | --- |
| `g-nav-w` | Desktop | transition: none → transform 600ms cubic-bezier(.64,.05,0,1) | edits §1 P1 |
| `section s-g-nav` | Desktop | transition: none → padding 600ms same ease | edits §1 P1 |
| `s-wrapper sw-g-nav` | Desktop | border: none → 1px solid Utility/Transparent; radius: 0 → Radius/Rounded; transition → padding, background-color, border-color, box-shadow 600ms same ease | edits §1 P1 |
| `g-nav-block is-center` | Desktop | transition → background-color, border-color 600ms same ease | edits §1 P1 |
| `why-visual-main` | Desktop | position: static → relative | edits §11 P2 |
| `search-bar-input`, `search-form-input`, `form-pane-text-field` | Desktop, Focus state | border colour: (Webflow default #3898ec) → Utility/U Muted 32 | edits §13 P3 |

### D. Components (incl. Nav / Footer)
- G | Nav: no markup change from this plan (the scrolled bar and auto-hide use JS state classes from B; hover switching is repo JS). edits §1.
- G | Footer (Base and Dark): `.g-footer-contact` + combo `is_badges`; add Div `.g-footer-contact-item` + `is_seal` as last child holding Image `.footer-badges` + `is_seal` = `hipaa-compliant-seal.svg`, alt "HIPAA compliant". edits §9.

### E. Pages (markup)
- /testosterone-replacement-therapy › Tabs (`serivce-benefit-tabs is-fluid`): Tabs settings In/Out duration → 0 (folder-tabs sets it at runtime too). edits §2.
- /enclomiphene › Tabs element: add attribute `data-fluid-tabs` (empty value); class `serivce-benefit-tabs` + combo `is-fluid`; each of 3 Tab Links + `is-fluid`, their `service-tab-menu-icon` + `is-fluid`; Tabs Content `sb-tabs-content` + `is-fluid` + `u-th-dark`; In/Out duration 0. edits §7.
- /testosterone-replacement-therapy › hero: desktop Image (`image-fit---right`) and tablet Image (`service-hero-visual-w is_trt`) → `trt-hero.webp`; desktop Lottie in `service-hero-widget-w` → Image class `case-card-widget-image`, src `trt-hero-widget.webp`; tablet `TRT Hero Widget.svg` → same file. edits §10.
- / (Home) › hero carousel: the 6 images (×3 loop groups = 18) → `hero-01…06.webp` in order. edits §6.
- / › Learn How Peptides: 5 card images → `peptide-01…05.webp`; heading "Learn More About How Peptides Can" → "Learn How Peptides Can" (second line unchanged); titles → "Boost Recovery Faster: Sermorelin and CJC-1295 Optimize Growth Hormone", "Peptide Injections and TRT Work Together to Transform Body Composition", "Reduce Midsection Fat with Tesamorelin". edits §6, §12.
- / › Why REGENX Health: `.why-visual-main` image → `why-photo.webp`, class `Why Visual Photo`; add 2 cards after it: `why-visual-stat is_testosterone` › `Why Visual Stat Dot` › `Why Visual Stat Dot Core`, + `Why Visual Stat Main` › `Why Visual Stat Value` (Embed ▲ svg `Why Visual Stat Arrow` + text "821 ng/dL") + `Why Visual Stat Label` "Testosterone"; card 2 `is_igf`, dot core `is_green`, "301 ng/mL", "IGF-1". Widget image → `why-widget.webp`. edits §11.
- / › hero: "Led By" → "Led by"; "Board-Certified urologist via" → "Board-Certified Urologist via". edits §4.
- /services and /about › Licensed U.S. Compounding Pharmacies text → "All medications come from state-licensed U.S. compounding pharmacies, and select formulations are independently tested before release." (check whether one component covers both). edits §4.
- /services › TRT and Peptide service cards: remove `u-th-dark`, add `is_light`; their Service Card Facts + `u-th-dark`; all 6 visuals → `is-icon is-flat` with the matching Our Services list icon (SVG Embed / Enclomiphene image) class `Service Card Flat Icon`. edits §3.
- /lab-panel › biomarker section first sentence → "Low testosterone in men is associated with an elevated risk of all-cause mortality."; move the CBC accordion instance under Other Key Markers, after PSA. edits §4, §6.
- /peptide-therapy › disclaimer modal: copy → 2 paragraphs `disclaimer-modal-copy` (text in edits §12).
- /medical-catalog › category list: 6 icon SVGs replaced from `public/figma/categories/` (keep `class="icon _32"`, `aria-hidden`, `data-catalog-icon`). edits §8.

### F. CMS
none (ED Medications / Hair Regrowth Solutions already have products on staging; New Products stays hidden until items are tagged).

### G. Interactions to remove from Webflow
none from this plan. (G Nav | Drop Open/Close is removed by the interactions plan; nav-switch holds it on desktop either way.)

### H. Repo changes (regenx/)
| Repo file (new / changed) | From prototype file | repo-css tag (CSS) | Notes |
| --- | --- | --- | --- |
| `src/modules/nav-switch.ts` (new) | `src/modules/nav-switch.ts` | — | desktop hover menu; drives Webflow Dropdowns |
| `src/styles/nav-switch.css` (new) | repo-proposed.css › Nav edits | js-state | `data-nav-switch` holds, ≥992 |
| `src/modules/nav-autohide.ts` (new) | `src/modules/nav-autohide.ts` | — | drop the is-shrunk stand-in block |
| `src/modules/nav-shrink.js` (changed) | — | — | add `.g-nav-block.is-center` to the selector |
| `src/modules/fluid-tabs.ts` (changed) | `src/modules/folder-tabs.ts` | — | band SVG, pane slide, durations 0, resize snap, menu ResizeObserver, `data-caret-in`; drop the `fluidBound` marking |
| `src/styles/fluid-tabs.css` (changed) | repo-proposed.css › Folder tabs (one-row block) | js-state | remove `.is-fluid-ready .w-tab-content { background-color: transparent }`; add the one-row rules |
| `src/styles/benefit-slider.css` (changed) | repo-proposed.css › caret rules | js-state | replace the 2 caret rules |
| `src/styles/catalog-list.css` (changed) | repo-proposed.css › Medical Catalog on phones | js-state | sticky block + open-row grid |
| `src/modules/catalog-sticky.ts` (new, or fold into catalog-list.ts) | `src/modules/catalog-sticky.ts` | — | |
| `src/modules/input-modality.ts` (new) | `src/modules/input-modality.ts` | — | |
| `src/styles/focus.css` (new) | repo-proposed.css › Focus rings | js-state | ring #2f6fed (L3) |
| `src/styles.css` | — | — | `@import` nav-switch.css and focus.css after site.css (keep existing order) |
Run order: `src/index.ts` boot → `run('input-modality')` first (before any module that can move focus); `main.js` → `NavShrink`, `NavOverlay`, then `NavSwitch`, `NavAutohide`; `FluidTabs` where it is; `CatalogSticky` after `CatalogList`. Then `pnpm check`, `pnpm test`, `pnpm build`, commit `dist/` (user's OK).

### I. Site settings / custom code / manual steps
- Box shadow with a variable colour on `sw-g-nav is-shrunk` (MCP can't bind a variable inside a shadow): set by hand.
- Upload to Assets (from `prototype/public/figma/`): hero-01…06.webp, peptide-01…05.webp, trt-hero.webp, trt-hero-widget.webp, why-photo.webp, why-widget.webp, badges/hipaa-compliant-seal.svg; then swap images in the Designer.
- Catalog icons: paste SVG code into each icon Embed (Designer only).
- Why card arrow: Embed with the ▲ SVG.

### J. Verify on staging after applying
- Desktop 1440: hover between Services / About Us / Patient Information (one panel morphs, overlay stays), leave → closes; scroll down (nav hides); scroll up a little (solid rounded bar with 12% border and soft shadow, menu pill without its own background), scroll up (nav back). 820/390: burger menu opens, nav stays while open.
- /testosterone-replacement-therapy and /enclomiphene at 1440/820/390: folder tab, caret grows in, panes slide, one tab row at 820.
- /, /services, /about, /lab-panel, /peptide-therapy: texts and images in E.
- /medical-catalog at 390: tabs pin 12px under the nav / top, open row shows the picture.
- Keyboard Tab → blue ring; mouse click → no ring, inputs grey border.
- Run `pnpm wf:pass <path> 1440|820|390` per page and `pnpm test:webflow`.

### K. Depends on / conflicts with
- **Interactions plan** (dropdown-motion.ts for `.g-nav-drop`, menu-motion.ts for the burger): same elements as nav-switch / nav-autohide. nav-switch holds the dropdown motion with `!important` at ≥992 (works with IX2 or dropdown-motion, verified with ?ix=off); nav-autohide reads `.g-nav-block.is-center` display that menu-motion sets. Apply interactions' `data-nav-*` hooks and modules first, then this plan's nav modules; boot nav-switch after dropdown-motion.
- **Audit plan**, G | Nav / G | Footer: audit edits the same component markup (`<header>`, aria-labels, removed empty list items; tap-target padding PA27 on footer links). Apply the footer seal (D) in the same Footer component pass.
- **Audit page copies** (home, services, about, TRT, enclomiphene, medical-catalog, peptide-therapy, partials/nav*, footer*): this plan's E edits live in the same files; apply per page in one pass.
- **Audit #36** (`catalog-list.ts` search aside) and this plan's catalog sticky/open-row CSS both go into `catalog-list.css` / `catalog-list.ts`: merge together.
- **Audit #26** added `tabindex="0" role="region" aria-label="…"` to `.learn-peptides-main` (Home) and `.why-main` (About, Services) in the same page copies as this plan's §4/§6/§12 text edits; if the Why section is one component, one attribute set covers About and Services. Apply both in the same page pass.
- **Audit #29** (12px text minimum): the Why card label is sized for it at Mobile (B).
- **Shared prototype CSS**: proposed.css (P1–P3 here; PA27/PA28 audit), new-classes.css (nav bar, flat icon, footer badges, Why cards here; benefit controls, u-sr-only audit), repo-proposed.css (Nav edits, folder tabs, catalog, focus here; audit fixes; interactions start states).
- **Focus rings vs interactions**: the pointer rule silences every repo `:focus-visible` outline, including any the interactions modules add.
- **src/main.ts order** (prototype): input-modality → current-links → nav-menu → footer → nav-switch → nav-autohide → folder-tabs (before the repo boot) → catalog-sticky → dropdown-motion → audit's catalog-search-focus, faq-schema → afterRepoBoot group. Keep input-modality first and folder-tabs before the repo's FluidTabs.

### L. Open questions for the user
1. OK to create the new classes in B and change the classes in C (standing rule: ask before creating/editing classes)?
2. TRT hero chart card: add a scale-in entrance back (the old Lottie had one), or keep it static?
3. Focus ring colour #2f6fed (4.6:1 on black and white), or a brand colour?
4. Why card dot colours #f5d400 / #39d353: add as variables, or keep as values?
5. Repo changes in H replace an animation module (fluid-tabs.ts) and add nav modules: OK to apply them at the implementation stage (with commit only on your OK)?

## Implementation status (2026-11-06)

Applied in Webflow (MCP, every write read back; NOT published, MANUAL-TODO D):
- Assets: hero-01…06, peptide-01…05, trt-hero.webp, HIPAA seal uploaded (ids in the session notes).
- B/C classes: nav combos, flat icon, footer badges, focus-state borders (P3). Not created: the Why Visual classes (L4).
- E: Home hero carousel (Carousel Group component, 6 images = all 18), peptide images, heading "Learn How Peptides Can", 3 titles, "Led by", "Urologist"; /services cards (is_light, facts u-th-dark, 6 flat icon visuals: 5 HTML Embeds with the Our Services SVGs + the Enclomiphene PNG); pharmacy text (Why Choose component, covers /services and /about); Lab Panel sentence + CBC appended after PSA; Peptide disclaimer 2 paragraphs; TRT hero desktop + tablet images; Enclomiphene tabs markup (is-fluid combos, data-fluid-tabs, content u-th-dark); 6 catalog icons (native SVG children replaced); D: G | Footer is_badges + seal cell/image.
- Not done: Tabs durations 0 (API can't; JS sets them; MANUAL-TODO G); sw-g-nav is-shrunk box shadow (MANUAL-TODO F).

Skipped, waiting on the user:
- L2: TRT hero chart card (Lottie → trt-hero-widget.webp, tablet TRT Hero Widget.svg) — prototype override stays.
- L3: focus rings (input-modality.ts, focus.css) — prototype src/main.ts + repo-proposed.css › Focus rings stay.
- L4: Home Why photo + see-through stat cards — prototype home/index.html + new-classes.css › Why visual stat cards + proposed.css P2 stay.

Repo (regenx/, uncommitted, MANUAL-TODO E): new src/modules/nav-switch.ts, nav-autohide.ts, catalog-sticky.ts, src/styles/nav-switch.css; changed src/modules/fluid-tabs.ts, nav-shrink.js, src/index.ts, src/styles.css, src/styles/fluid-tabs.css, benefit-slider.css, catalog-list.css, docs/handoff/MANUAL-TODO.md (D–G), GOTCHAS.md. pnpm check + build + test: 96 passed.

Prototype: nav-switch, nav-autohide, folder-tabs, catalog-sticky module copies deleted and their main.ts lines removed (the repo boot runs them); repo-proposed.css › Nav edits keeps only the focus rings. Page/partial overrides and new-classes.css groups stay until D is published and `pnpm pull` mirrors it (home, services, about, lab-panel, TRT, enclomiphene, peptide-therapy, medical-catalog, partials/footer*).

## Implementation step 3 (2026-11-06, after the 15:08 UTC publish)

User answers: L2 "Add scale-in back", L3 "Blue #2f6fed", L4 "Keep as fixed values".
- Published check (`pnpm pull`, `?mirror`): /about, /services, /lab-panel and partials/footer* matched the published site → copies deleted. /enclomiphene, /peptide-therapy and /testosterone-replacement-therapy copies now carry the audit session's edits only (left to audit). P1, P3 and the nav / flat icon / footer badge groups in proposed.css / new-classes.css removed (published); the sw-g-nav shadow stays (MANUAL-TODO F).
- L4 in Webflow (read back): assets Why REGENX Photo.webp 6aedf5a959d23ea3d0db1907, Why REGENX Widget.webp 6aedf5a98cea445ef36e7527; classes `Why | Visual Photo`, `Why | Visual Stat` (+ is_testosterone, is_igf, small bp), `… Stat Dot`, `… Dot Core` (+ is_green, fixed #f5d400 / #39d353), `… Stat Main`, `… Stat Value`, `… Stat Arrow`, `… Stat Label` (+ small bp); `Why | Visual Main` + position relative; two cards built on Home. Not published (MANUAL-TODO U): home/index.html copy, P2 and new-classes › Why visual stat cards stay until then.
- L2: regenx/src/modules/hero-card-in.ts + styles/hero-card-in.css (hook `data-hero-card-in`, scale .6 → 1 + fade, 1.2s, once in view, reduced motion: none). Checked in the prototype at 1440/820/390 (headless: opacity/scale 0/.6 → 1/1, no errors). Webflow (read back): TRT Lottie removed, Image `Case Card | Widget Image` (TRT Hero Widget.webp 6aedf5a91b6933f3c7e444d7) + hook added; tablet `Service Hero Widget` image → same asset + hook. Not published (U).
- L3: regenx/src/modules/input-modality.ts (first in boot) + styles/focus.css (`override-webflow` for the pointer rule, approved, GOTCHAS). Webflow part (P3 Focus borders) was already published. Prototype input-modality + repo-proposed Focus rings removed.

## rx- class renames (2026-11-06, user rule: prefix new classes)

Renamed in Webflow with rename_style (bindings and elements kept, read back):

| Old (Designer › CSS) | New (Designer › CSS) |
| --- | --- |
| `is-shrunk` on Section + S \| G Nav, S Wrapper + SW \| G Nav, G Nav \| Block + is-center › `.is-shrunk` | `Is Rx Shrunk` › `.is-rx-shrunk` (no Webflow styles before 2026-11-05; nav-shrink.js toggled the class unstyled) |
| `is-hidden` on G \| Nav W › `.is-hidden` | `Is Rx Hidden` › `.is-rx-hidden` |
| `is_badges` on G Footer \| Contact | `Is Rx Badges` › `.is-rx-badges` |
| `is_seal` on G Footer \| Contact Item and on Footer Badges | `Is Rx Seal` › `.is-rx-seal` |
| `is-flat` on Service Card \| Visual + is-icon | `Is Rx Flat` › `.is-rx-flat` |
| `Service Card Flat Icon` › `.service-card-flat-icon` | `Rx Service Card Flat Icon` › `.rx-service-card-flat-icon` |
| `Why \| Visual Photo / Stat / Stat Dot / Stat Dot Core / Stat Main / Stat Value / Stat Arrow / Stat Label` › `.why-visual-…` | `Rx Why Visual …` › `.rx-why-visual-…` |
| `is_testosterone`, `is_igf` on the stat card; `is_green` on Dot Core | `Is Rx Testosterone`, `Is Rx Igf`, `Is Rx Green` › `.is-rx-…` |

Code: regenx nav-shrink.js toggles `is-rx-shrunk`, nav-autohide.ts `is-rx-hidden`, catalog-sticky.ts reads `is-rx-hidden`. Prototype: new-classes.css, home/index.html copy updated; new-classes.css has a temporary bridge for the nav combos until the next publish + pull. Older names in the sections above are historical.
Not renamed: existing classes edited for the improvement (G | Nav transitions, Why | Visual Main position relative, the text-field Focus states) — edits to existing classes, left as they are.

## Service hero widget: animate the wrapper on load (user 2026-11-06)

`Case Card | Widget Image` no longer animates; the `Service Hero | Widget W`
wrapper scales in (0.6 → 1, fade, 1.2s, 0.3s delay) once on page load, on
TRT, Peptide Therapy and Enclomiphene (desktop and tablet copies).

- Repo (uncommitted): `hero-card-in.ts` targets `[data-hero-widget-in]`, no
  ScrollTrigger; `styles/hero-card-in.css` hides that hook while
  `html.is-loading`. Reduced motion: no animation.
- Prototype: hooks moved in the TRT, Peptide and Enclomiphene overrides
  (enclomiphene/index.html is a new override). Checked at 800px: all six
  wrappers animate, images untouched, no console errors.
- Done 2026-11-06: repo e6935d2 deployed; Webflow hooks moved and published by the user. Staging checked in headless Chromium at 1440 and 820: all three heroes go 0 → 1 opacity, 0.6 → 1 scale in about 1.3s; images do not move.
- (Was) Webflow: remove `data-hero-card-in` from the two TRT images; add
  `data-hero-widget-in` to the six `service-hero-widget-w` wrappers. Either
  order with the repo deploy is harmless (an unmatched hook just shows).

## TRT accordion image 1: new Figma image (user 2026-11-06)

"How REGENX Health Diagnoses Low Testosterone" image → the track runner with
the 821 ng/dL Testosterone and 301 ng/mL IGF-1 badges (Figma
W7cneHA52eFApqbYn1mAwk, node 9164:9078, exported at 3×, 1932×1908 WebP, 124 KB).
Prototype: public/figma/trt-accordion-1-01-v2.webp in the TRT override.
Webflow (read back): asset 6aee31b88819d74c43d408f7 "TRT Accordion 1 - 01 v2.webp"
with alt text, set on image 97698d45-b0de-6ccb-6c17-ff314c0db279. Not published.

## Home › Our Services tabs as folder tabs (user 2026-11-07)

Same browser-like tabs as the TRT/Enclomiphene benefits (fluid-tabs.ts): from
768px up, the open tab and the light services card are one outline that
moves with a springy stretch; the other tabs are plain labels (label left,
dots right). At ≤767px nothing changes (stacked list, black open tab).
Checked in headless Chromium at 1440, 991, 820 and 390, all three tabs, no
errors; TRT and Enclomiphene tabs unchanged.

Prototype: home/index.html (hooks + combos), src/css/new-classes.css (the
`is-rx-fluid` block). Repo (uncommitted): styles/fluid-tabs.css centres
labels on `.sb-tab-link` only (was every folder-tab link).

Webflow, Home page (combo `Is Rx Fluid` = class `is-rx-fluid`):
- Tabs `service-tabs`: attribute `data-fluid-tabs` (empty); combo: row gap 0,
  background Background/White at desktop; at ≤767 row gap 1.5em, background
  none; at ≤479 row gap 2em.
- Tabs Menu `service-tabs-menu u-grid-3`: combo: grid 3 equal columns at
  desktop and tablet; at ≤767 back to the base class columns.
- 3 Tab Links `service-tab-link`: combo: border colour transparent (normal +
  hover) at desktop; at ≤767 hover border Utility/U Muted 16.
- Tabs Content `service-tabs-content`: combo: radius Radius/16, background
  Background/Light at desktop; at ≤767 radius 0, background none.
- 3 `service-tab-content` (one per pane): combo: border colour transparent,
  background transparent at desktop; at ≤767 border Utility/U Muted 10,
  background Background/Light.
- Tabs In/Out duration 0 (fluid-tabs.ts also sets it at runtime).
Repo: commit + deploy the fluid-tabs.css change (same publish or before).
- Done 2026-11-07: Webflow combos (5 `Is Rx Fluid`, desktop + ≤767/≤479 resets)
  and `data-fluid-tabs` applied to 9 elements, all read back; repo 3bf6639
  deployed (tests 96 passed). Waiting on publish.

### Revision 2026-11-07: open tab joined to the black box (user's design)
- Whole Tabs is now the light card (padding 2em, border U Muted 10, Radius/16,
  Background/Light); tabs centred without the dots; the open tab joins each
  pane's black `service-tab-intro` (`data-fluid-panel`); carousel stays light
  below. ≤767px unchanged (combo resets at small/tiny).
- Repo d4583d1 (deployed): fluid-tabs.ts panel mode (`[data-fluid-panel]`),
  root-border offset fix. TRT/Enclomiphene unchanged (checked).
- Webflow (read back, unpublished): `Is Rx Fluid` updated on Service Tabs,
  Service Tab Link, Service Tab Content; Service Tabs Content combo emptied;
  new combo on Service Tab Menu Icon (hidden ≥768); `data-fluid-panel` on the
  3 intros.
- Not done (design differences): the Figma intro layout (big image left,
  title over text right) and its new bubble image; chip label overlap at
  ~820px exists on staging already.

## Timelines: arrows beside the dots (user 2026-11-07)

TRT Response Timeline and Peptide Therapy Results Timeline: the header arrows
and the arrows inside the panel are gone; one row under the panel holds
← dots → (centred, 1em gap), at every breakpoint. The Peptide timeline gets
dots too (it had none). No JS change: smart-swiper already finds
`[data-timeline-prev]`, `[data-timeline-next]` and `[data-timeline-pagination]`
anywhere in the section. Checked headless at 1440, 820 and 390 on both pages:
arrows step the slider, dots follow, no console errors, no sideways scroll.

Prototype: testosterone-replacement-therapy/index.html and
peptide-therapy/index.html (markup), src/css/new-classes.css
(`rx-timeline-controls`, `is-rx-inline`), src/css/repo-proposed.css (dots
width).

Webflow, on both pages (TRT, Peptide Therapy):
1. Delete `therapy-timeline-header-navs` (in the section header) and
   `therapy-timeline-side-navs` (inside `therapy-timeline-canvas`).
2. After `therapy-timeline-canvas`, add a Div `Rx Timeline Controls`
   (`rx-timeline-controls`): display flex, justify center, align center,
   gap 1em, align-self stretch, margin-top 1.5em.
3. Inside it, in order: a prev Button, the dots, a next Button.
   - Buttons: copy the deleted header arrows (classes
     `service-tab-product-nav therapy-timeline-header-arrow`, attributes
     `data-timeline-prev` / `data-timeline-next`, `data-timeline-icon`,
     aria-labels, type button, icon component inside).
   - Dots: TRT: move the existing `therapy-timeline-dots` into the row.
     Peptide: add a Div `therapy-timeline-dots` with attribute
     `data-timeline-pagination` (empty) and aria-label "Timeline stages".
     Both: combo `Is Rx Inline` (`is-rx-inline`): margin-top 0.
Repo: add the `width: auto` rule from repo-proposed.css to
`regenx/src/styles/therapy-timeline.css` (Swiper sets the bullets container
to 100% width). Deploy with or before the publish.
The now-unused class `therapy-timeline-side-navs` (and its ≤767 styles) can
be cleaned up in the Designer afterwards.
- Done 2026-11-07 (read back, unpublished): classes `Rx Timeline Controls`
  (5be4441a…) and combo `Is Rx Inline` on `Therapy Timeline | Dots`
  (ab418b41…). TRT: row aa214be8… after the canvas holding the moved header
  arrows + the existing dots; header navs and side navs removed. Peptide: row
  ccfaedb1… with a new dots div (b550d134…, `data-timeline-pagination`,
  aria-label "Timeline stages") between the moved header arrows; header navs
  and side navs removed. Each page now has exactly one prev, one next, one
  dots. Repo: dots `width: auto` rule in styles/therapy-timeline.css,
  commit 021a981, deployed to staging (CI test + deploy passed, bundle hash
  5d27d6943326). Waiting on the Webflow publish.

## Benefit sliders on phones: height follows the card (user 2026-11-07)

At ≤479px each benefit card already keeps its own height, but the slider box
stayed as tall as the tallest card, so shorter cards (e.g. TRT "Muscle
Strength and Size", 472 vs 592px) had empty space before the arrows/dots.
Now the box takes the visible card's height and eases to the next card's
height with the slide (Swiper's duration, 735ms; drags snap; reduced motion
already zeroes the duration). ≥480px unchanged.
Checked headless at 390 on TRT (all 3 tabs) and Enclomiphene: box = active
card on every slide, height animates (472→497 sampled over the move), no
errors; 820 untouched.

Prototype: src/modules/benefit-auto-height.ts + `run()` in src/main.ts;
src/css/repo-proposed.css (wrapper height transition).

Webflow: nothing.
Repo:
1. Copy src/modules/benefit-auto-height.ts to
   regenx/src/modules/benefit-auto-height.ts and call it from the boot
   (regenx/src/index.ts / main.js), after SmartSwiper starts.
2. Add the `transition-property: transform, height` rule (≤479px) to
   regenx/src/styles/benefit-slider.css.
3. Deploy; check TRT and Enclomiphene benefits at 390 on staging.
- Done 2026-11-07 in the repo, commit 021a981, deployed to staging: src/modules/benefit-auto-height.ts,
  `run("BenefitAutoHeight")` in modules/main.js after SnapDots, the ≤479
  transition rule in styles/benefit-slider.css; dist rebuilt; pnpm check +
  pnpm test (96) pass. The prototype copy was removed (it runs the repo's).

## Service hero widgets: load animation removed (user 2026-11-07)

"remove on load fade in and zoom animation from widgets": the Service Hero
widget (`Service Hero | Widget W`, desktop + tablet copies on TRT, Peptide
Therapy, Enclomiphene) no longer scales from 60% and fades in on load; it
shows at full size straight away. Supersedes "Service hero widget: animate
the wrapper on load" above.

Repo, commit 50afa6b, deployed to staging (CI test + deploy passed,
bundle 21063a910177, no hero-widget-in left in it): deleted src/modules/hero-card-in.ts and
src/styles/hero-card-in.css (the hide-until-boot rule), their lines in
src/index.ts and src/styles.css; dist rebuilt; pnpm check + pnpm test (96)
pass. Checked in the prototype at 1440, 820, 390 on all three pages:
opacity 1, no transform, visible from load, no errors.
Webflow: nothing needed. The `data-hero-widget-in` attributes on the 6
wrappers are now unused and harmless; optional cleanup in the Designer.

## Service hero widgets: Figma placement + live lab widgets (user 2026-11-07)

"can you also make sure the widget position is correct for desktop as in
figma": the final Figma heroes (TRT 9849:6570, Peptide 9164:10853,
Enclomiphene 9849:6941; not the older standalone Peptide 9232:14998) all
use one layout: photo 546 × 688, widget 40px above the photo and 40px past
its right edge (TRT 365, Peptide 366, Enclomiphene 245 wide). Staging hung
the widget off the photo's left side. Prototype: proposed.css PW1 (styles
listed there). Measured at 1680: all three −40 / +40. Tablet (991, 820) and
mobile (600, 390) placements are identical to staging, except that Peptide's
widget sits higher because the new widget is a different height.
Enclomiphene's desktop photo is now the same size as the other two (it was
476 × 600).

Peptide and Enclomiphene widgets: the flattened Figma image is replaced by
inline SVG (live text, ids stripped, `data-lab-widget`, `.lw-bar` /
`.lw-mark` / `.lw-fade`) animated by regenx `lab-widget.ts`. The bars fill,
the markers slide in, the values count up, and reduced motion shows them
static. Webflow: replace each `Service Hero | Widget` image (desktop +
tablet, 4 in all) with an HTML Embed holding the SVG
(plan/imagery-audit/widgets/peptide.svg, enclo.svg), then apply PW1's styles.

## Text pins as live text: A–C, E, G (user 2026-11-07)

Baked-in pin text on photos replaced by clean HD photos (Figma 3×, WebP,
public/figma/pins/) with real-text pins positioned by regenx `pins.ts`
(commit 8f03161, deployed). Markup per image: plan/imagery-audit/pins/markup/
(generated by scripts/pins-markup.py from the Figma coordinates). The box
around each photo gets `data-pin-media` + `data-pin-w` (+ `-fs`, `-dot`); the
photo `data-pin-img`. Typos fixed: Iparemorelin → Ipamorelin, Semorelin →
Sermorelin; "Mots C" → MOTS-c to match the other cards.
- A Home hero cards 1–6 (×3 loop copies), B Home peptide cards 1–2, C Home
  lab tube (rebuilt transparent from Figma's raw image), E TRT accordion runner, G Peptide stacks 1, 2, 4.
- F (TRT stacking photo) and D (Home Why photo) dropped: staging already
  draws their pins as DOM text (.sd-media-pin, .rx-why-visual-stat).
- Photos are square-cornered, borderless exports (user 2026-11-08): the
  rounded corners and borders come from the CSS of each photo's box. Home
  hero cards: Figma's frosted frame and inner border are CSS too; the card
  holds the photo, Rx Card Frame (blur + 20% black), and Rx Card Window
  (the inner border, a second copy of the photo lined up with the first,
  Rx Card Shade and the pins), so pins can't cross the inner border
  (scripts/pins-card-frame.py).
- Pins scale purely with the photo, no minimum text size (user 2026-11-09):
  every breakpoint is a scaled-down copy of the desktop layout. pins.ts
  still keeps text 8 Figma px inside its box as a safety net (flip, then
  shift), but at no width does it need to.
- Checked at 1680, 1440, 1280, 1024, 991, 820, 767, 600, 479, 390, 360: no
  text clipped, hidden or overlapping, no console errors.
Webflow (not done yet): new classes Rx Pin, Rx Pin Dot (+ Is Yellow / Is
Green), Rx Pin Label, Rx Stat, Rx Stat Text, Rx Stat Value, Rx Stat Label,
Rx Arrow, Rx Badge, Rx Badge Text, Rx Badge Value, Rx Badge Label, Rx Tag
(+ Is Yellow), Rx Tag Dots (+ Is Four, Is Yellow), Rx Note, Rx Note Title,
Rx Line, Rx Card Frame, Rx Card Window, Rx Card Window Img, Rx Card Shade
(new-classes.css › Home hero card frame); PC1 in proposed.css (Hhcg Image W
position relative, Hhcg Image fills it); upload the 13 photos with alt text; add the markup (the hero card
carousel lives in a component).

### Applied in Webflow 2026-11-09 (MCP, every write read back; NOT published)
- PW1: Service Hero Widget W (base 0 / -2.5em / auto / auto, 22.8125em),
  is_pct width removed, is_enclo (base 0 / -2.5em, 15.3125em; tablet left 0,
  right auto), Service Hero Visual W (height auto, aspect 546/688),
  Visual is_enclo (base width removed; tablet calc(100% - 10em)),
  Service Hero Right.u-hide-t align-items flex-start.
- Widgets: Peptide and Enclomiphene hero widget images (desktop + tablet
  copies) replaced by HTML Embeds holding the inline SVGs
  (plan/imagery-audit/widgets/*.embed.html).
- Classes: Rx Pin, Rx Pin Dot (+ Is Yellow, Is Green), Rx Pin Label, Rx Stat,
  Rx Stat Text / Value / Label, Rx Arrow, Rx Badge, Rx Badge Text / Value /
  Label, Rx Tag (+ Is Yellow), Rx Tag Dots (+ Is Yellow, Is Four), Rx Note,
  Rx Note Title, Rx Line (empty; look from regenx pins.css); Rx Card Frame,
  Rx Card Window, Rx Card Window Img, Rx Card Shade (styled, breakpoints at
  767 / 479 to match HHCG | Image W); PC1 on HHCG | Image W / HHCG | Image.
- 13 HD photos uploaded with alt text (plan/imagery-audit/pins/assets.json).
- Pins: Home Carousel Group component (6 cards: frame + window + pins),
  peptide cards B1, B2, lab tube C; TRT accordion E; Peptide stacks G1–G3.
- The Designer snapshot tool draws backdrop-filter as a light film, so the
  frosted frame can only be checked on staging after publishing.

## Client Slack feedback, 2026-11-09 (Dr. Stein): Enclomiphene card, catalog tabs, peptide timeline

Prototype, Webflow (read back, not published) and repo (branch
`client-feedback-1109`, pushed to master) all done.

### 1 · Enclomiphene › "Enclomiphene Vs Clomid" card, phones
- Blurry sides: the benefit sliders' edge-fade mask (6% at ≤767px) blurred the
  card's own sides, since the card fills the slider on phones. Repo
  `styles/benefit-slider.css`: no mask ≤767px (all three tabs; tablet/desktop
  keep the 18% fade over the peeking neighbours).
- Chart: the "Efficacy on Testosterone & Estradiol" raster chart (828×850,
  text baked in, ~11px on a phone) is now live text. Prototype:
  `enclomiphene/index.html` + `src/css/new-classes.css` › Bar chart.
  Webflow (Enclomiphene page): media box `SB Benefit | Card Media is_slider`
  + new combo `Is Rx Chart` (#f0f0f0); image removed; new `Rx Bar Chart`
  (role="img", aria-label = the old alt text) › `Rx Bar Chart Title` (2 text
  blocks) + `Rx Bar Chart Plot` › 2 × `Rx Bar Chart Col` › `Rx Bar Chart Value`
  (value + `Rx Bar Chart Mark` [`Is Rx Down`]) and `Rx Bar Chart Bar`
  [`Is Rx Short` › `Is Rx Accent`]. Fixed hex colours: the card is themed dark,
  so theme variables would flip.
- Follow-up (user, same day): the other four cards with baked-in labels are
  live text too — Raises Natural Testosterone, Improves Symptoms, Side-Effect
  Profile, Practical Differences. Images: the Figma slide frames (file
  W7cneHA52eFApqbYn1mAwk, 9430:14600 / 14653 / 14715 / 14734) exported without
  their text layers (photo; photo frame; background + tablet composited;
  circles redrawn from the Figma vectors), 828×850 WebP, uploaded as
  `encl-1-1-…-bg`, `encl-1-3-…-bg`, `encl-2-2-…-bg`, `encl-2-4-…-bg` and set on
  the four images (alt now describes the photo; the last is decorative).
  Prototype: `public/assets/enclomiphene/`, `enclomiphene/index.html`,
  `src/css/new-classes.css` › Photo overlays.
  Webflow: the four media boxes get combo `Is Rx Overlay` (position relative).
  Labels that point at the artwork sit in `Rx Stage` (414/425 box that covers
  the media exactly like the image's object-fit: cover; height 100%, ≤991
  width 100%): `Rx Callout` [`Is Rx Mood` / `Is Rx Energy` / `Is Rx
  Performance`] › `Rx Callout Label` (text + `Rx Bar Chart Mark` ▲) + `Rx
  Callout Line` › `Rx Callout Dot` [`Is Rx Start`]; `Rx Stage Label` [`Is Rx
  Half Life` / `Is Rx Label Use` / `Is Rx Side Effects`]. Labels that don't
  point at it sit in `Rx Overlay` (the media box): `Rx Bar Chart Col` [`Is Rx
  Overlay` › `Is Rx First` / `Is Rx Second`] › `Rx Bar Chart Value` + `Rx Bar
  Chart Bar` [`Is Rx Overlay` › `Is Rx Light`]; `Rx Chip` [`Is Rx Response`,
  `Is Rx Light` › `Is Rx Isomer`] › `Rx Chip Dot` [`Is Rx Dark`] + text. Each
  wrapper has role="img" + aria-label. Base (≥992) positions differ from ≤991
  (Figma's): on desktop the media box's shape follows the card's text and
  can show only the middle half of the artwork (1024, long text), so bars and
  chips follow the box and the callout lines are shorter.
  Checked in the prototype at 390, 1024 and 1440: nothing outside the media
  box. Not published; no Designer snapshot (needs the Designer open).

### 2 · Medical Catalog, phones: tabs track the section, icons
- No Webflow change. Repo: `catalog-nav.ts` kept only the categories visible
  at boot (on phones the compact list isn't laid out yet), so the active tab
  never moved; it now checks visibility on every update and scrolls the
  active tab into view in the sideways row. The section-in-view rule and the
  sideways scroll are shared with the Lab Panel in `modules/tab-spy.ts`
  (`lab-tests.ts` uses it too). Sticky row: existing `catalog-sticky.ts`.
- Icons: like the Lab Panel's phone tabs, the category chips keep their
  icons on phones (`catalog-list.css` hid them); sized 1.125em under
  `[data-catalog-compact]`. Read as tab icons, not per-medication icons.

### 3 · Peptide Therapy › Results Timeline copy
- Webflow: the four `C | Paragraph` Text props replaced; badges "12–18 weeks
  · Preview" / "18–24 weeks · Preview" → "12–18 weeks" / "18–24 weeks";
  `data-timeline-preview` removed from stages 3–4. Week attributes unchanged
  (1–4, 6–12, 12–18, 18–24). Prototype: `peptide-therapy/index.html`.
- Edits to the client's copy: ":" kept (was " - " on staging); "GH/IGF-1
  begins" → "GH and IGF-1 begin"; stage 2 "many report" → "many men report";
  stage 3 "Many men find better sleep" → "Many men report better sleep";
  stage 4 "benefits like" → "benefits such as", "to decide next steps" →
  "to decide on next steps".

## Nav menus: gap between the bar and the open panel (user 2026-11-09)
The open menu panel sat 5px under the nav bar and read as touching it.
Prototype: `src/css/proposed.css` block NV1 (shots: `plan/shots/nav-gap-before.png`, `nav-gap-after.png`).
- **Designer:** class `G Nav Drop Content W` › margin-top `.5em` → `1.25em` at Base (≈15px gap at 1440). At 991px set it
  back to `.5em` so the burger menu is unchanged.
- No repo change: `nav-drop.ts` places the shared panel from the panel's own box, and the margin sits inside the
  absolute list, so hover from the name into the panel stays unbroken (checked in the prototype).
- Status: **applied in Webflow 2026-11-09** (class `G Nav | Drop Content W`, Base 1.25em, 991px .5em; read back; NOT
  published). Delete block NV1 from `src/css/proposed.css` after the next publish + `pnpm pull`.

## Contact step one: every option a checkbox (user 2026-11-09)
Asked for: every option in step one of the `/contact` form is a checkbox, so a
visitor can pick more than one. The four therapies already were; the four
"Your situation" options were radios (one choice). This **reverses the client
rule of 2026-10-30** ("the situation radios are a single choice", in
`regenx/tests/form-steps.spec.mjs`), so confirm with the client if needed.

### In the prototype
| File | What |
| --- | --- |
| `contact/index.html` | Copy of the mirror. The "Your situation" group is four Webflow Checkbox fields (`w-checkbox`) in place of the Radio Buttons; group `role="radiogroup"` → `role="group"`. Classes, icons (`is_tmc`, `is_so`, `is_pct`, `is_other`) and label text (with its bold parts) unchanged. |
| `src/modules/form-steps.js` | Copy of the repo module, aliased in `vite.config.js` (`repoOverrides`). One line: a checkbox's step-2 summary chip uses its field name (`data-name`), so the chips still read "Transfer my care", not the whole label sentence. |

No CSS change: the repo's step-1 rules (`regenx/src/styles/site.css`) already
style checkboxes (square box, tick, black row on `:has(> input:checked)`).

**Submitted data: one true/false field per option.** Webflow's form script
keys each field by its Name and sends a checkbox as `true`/`false`; checkboxes
sharing one Name overwrite each other (last one wins), so a comma-joined value
would need extra JS and a hidden field. One field per option is what the
therapies already do, needs no code, and gives one filterable column per
option in Form submissions. Payload with two picked (checked in the prototype
with Webflow's own serializer):
`"Transfer my care": true, "Second opinion": false, "Post Cycle Therapy": true, "Other": false`
next to the four therapy fields. The old single `Your Situation` column stops
receiving values: **update any form notification, Zapier/CRM mapping or export
that reads `Your Situation`**.

Required rule unchanged: `[data-step-required]` sits on `.form-pane-main`
around both groups, so step one needs **at least one** tick from either group
(same error text, "Please select at least one option to continue.").

### Webflow stage (Designer, Contact page, form `Consultation Form`)
No new classes. Ask before starting (standing rule).
1. In the "Your situation" `form-options` div (aria-label "Your situation"):
   change the custom attribute `role` from `radiogroup` to `group`.
2. For each of the four Radio Buttons, add a **Checkbox** beside it (Webflow
   can't change a radio's type), then delete the radio:
   - Checkbox settings: style **Custom**. Name (= field name) and ID:
     | Icon combo | Name | ID |
     | --- | --- | --- |
     | `is_tmc` | Transfer my care | Transfer-my-care |
     | `is_so` | Second opinion | Second-opinion |
     | `is_pct` | Post Cycle Therapy | Post-Cycle-Therapy |
     | `is_other` | Other | Other |
     (delete the old radios first, so the ID `Other` is free)
   - Classes as on the therapy checkboxes: label wrapper `Form Check Field`;
     custom box `Form Check` + the icon combo above; label text
     `Form Check Label`.
   - Label text: copy from the radio, keeping the bold parts ("transfer my
     care to REGENX Health", "second opinion", "Post Cycle Therapy").
3. Check the form's Required setting stays off on each checkbox (the step's
   `data-step-required` handles "at least one").
4. Site settings › Forms / any integration: remap `Your Situation` to the four
   new fields (see above).

### Repo stage (`regenx`)
- `src/modules/form-steps.js` › `choiceText`: add
  `if (input.type === "checkbox" && input.dataset.name) return input.dataset.name;`
  after the radio line (as in the prototype copy). JS, no `repo-css` tag.
- `src/styles/site.css`: the two `[data-step="1"] input[type="radio"]` rules
  have nothing left to style; remove them (no new CSS).
- `tests/form-steps.spec.mjs`: fixture situation options become checkboxes
  with `data-name`; replace "step 1 accepts a radio alone…" with a test that
  ticks two situation options and both stay checked, and that unticking all
  eight disables Next; summary expectations use the `data-name` text.
- Then `pnpm check`, `pnpm test`; remove the `repoOverrides` entry and
  `prototype/src/modules/form-steps.js`, and delete `prototype/contact/`
  after the next publish + `pnpm pull`.

### Status (2026-11-09)
- **Webflow: applied, NOT published.** Four FormCheckbox fields (names/IDs as
  in the table, `Form Check Field` / `Form Check` + combo / `Form Check
  Label`), labels moved over from the radios with their bold text, radios
  deleted, group `role="group"`; read back through the MCP.
- **Manual, before publishing:** in the Designer select each of the four new
  checkboxes (Transfer my care, Second opinion, Post Cycle Therapy, Other) ›
  Checkbox settings › Style → **Custom**. The API can't set it (GOTCHAS
  2026-11-09); without it the icon box is missing.
- **Manual:** remap `Your Situation` in form notifications/integrations.
- **Repo (`regenx`):** committed and deployed in fe799b2 (staging CI passed 2026-11-09); Designer steps in MANUAL-TODO AB. `form-steps.js` choiceText line,
  `site.css` radio rules removed, `tests/form-steps.spec.mjs` updated,
  GOTCHAS entry, `dist/` rebuilt; `pnpm check` and `pnpm test` (98) pass.
- Prototype: the `form-steps.js` alias is gone (the repo has the change);
  delete `prototype/contact/` after the next publish + `pnpm pull`.

### Checked in the prototype (2026-11-09)
1440, 1024, 390: several options ticked and unticked by mouse (Webflow's
`w--redirected-checked` follows), Next disabled with none and the guard holds
if Next is forced; keyboard: Tab between options, Space toggles, focus ring
shows, Enter goes to step 2; step 2 chips list the picks; Back keeps them;
no sideways overflow; payload as above. Not checked: a real submit (Turnstile
doesn't run on localhost, and it would post to the live form).

## FAQ content: consult link, enclomiphene to Medication, peptide Q&As (user 2026-11-09)

### Webflow CMS (FAQs • No Pages): staged, NOT published
| Item | Change |
| --- | --- |
| Telemedicine › "Is REGENX Health services available in all states?" | `<strong>link.</strong>` → `<a href="/contact">link</a>.` (consultation form on /contact) |
| "What is enclomiphene citrate?", "Is enclomiphene the same as Clomid?", "Does enclomiphene preserve fertility?", "Is enclomiphene used in bodybuilding?" | Main Category General Information → Medication (sort orders kept: 1, 6, 8, 10; key `enclomiphene` kept) |
| Clinic Policies › "What Makes REGENX Health a Trusted Source to Buy Peptides Online?" | Question → "What makes REGENX Health a trusted choice for peptide therapy online?", answer replaced with the user's copy (4 paragraphs). Slug kept. |
| Clinic Policies › "How Do You Buy Peptides Online Safely?" | Question → "How can I get peptide therapy online safely?", answer replaced (intro, 3-item numbered list, 2 paragraphs). Slug kept. |

### Prototype
- `src/css/proposed.css` › FQ1: `.c-paragraph ol` shows numbers (Webflow
  has `list-style-type: none; padding-left: 0`, so the numbered list rendered
  as plain lines).

### Implementation
1. ~~Designer: C | Paragraph › All Ordered Lists → list style decimal, padding-left 1.25em (FQ1).~~ **Applied 2026-11-09 through `webflow-regen-x`, read back (`.c-paragraph ol`: decimal, 1.25em). NOT published.** Drop FQ1 from `src/css/proposed.css` after the next publish + `pnpm pull`.
2. General Information category meta description still says "enclomiphene basics"; update it if the user wants.
3. Publish (the CMS items go live with it).

## Date of Birth dropdowns (user 2026-11-09)

"For form where date are needed can we have date picker dropdown?" The only
date field on the site is **Date of Birth** on /contact (Consultation Form,
step 2): a plain text input with the placeholder MM/DD/YYYY. It is now three
native dropdowns: **Month / Day / Year**. A calendar was ruled out for a birth
date, because reaching 1975 means paging back ~600 months. Native selects also
give phones their own wheel picker.

- Short month names (Jan–Dec): the field is a ~250px grid cell next to Location/State.
- Years run from 18 to 100 years ago (2008 → 1926 in 2026), newest first.
  Adjust with `data-date-select-min-age` / `-max-age` on the field.
- Day list follows the month and leap years (Feb 1980 = 29, Feb 1981 = 28).
  A day that no longer exists is cleared.
- The field stays optional. Pick any part, and all three become required,
  so form-steps blocks Submit until the date is complete.
- **Submission unchanged:** the original input becomes a hidden field named
  `Date-of-Birth` / data-name `Date of Birth`, holding `MM/DD/YYYY`.
  - The selects share that data-name and sit before it. Webflow's form JS
    keeps the last value per data-name, so only the combined date is posted,
    with no extra "Field N" entries.
  - Checked by running Webflow's own field collection on the prototype:
    `{"Date of Birth": "02/28/1980"}`.
- The label now points at the Month select. The three selects form a group
  named by the label.

### In the prototype
- `src/modules/date-select.ts` (+ `run('date-select', …)` in `src/main.ts`):
  turns any `input[data-date-select]` into the three selects.
- `contact/index.html` (the existing edited copy): `data-date-select` on `#Date-of-Birth`.
- `src/css/repo-proposed.css` › Date of Birth dropdowns: the `.rx-date-select` grid.
  The selects reuse `form-pane-text-field w-select`, so they match the State select.
- Checked 2026-11-09:
  - 1440: three selects in the 250px cell (79 / 68 / 91px), the same height and style as State.
  - 375: full width (317px), no horizontal scroll.
  - No console errors.

### Status (2026-11-09)
- **Repo:** committed and pushed in 02ad09f (module, `src/styles/date-select.css`, test `tests/date-select.spec.mjs`); 99 tests pass.
- **Webflow:** `data-date-select` set on the Date of Birth field through the MCP and read back. Published by the user; live on staging 2026-11-10 (MANUAL-TODO AG).
- **Same pass, form field names:** the medication search boxes on Medical Catalog, Medication Catalog (new), TRT, Peptide Therapy and Enclomiphene were named "Field" (id `field`). They are now `Medication Search` (id `medication-search`). Forms still named "Email Form" were renamed: Medication Catalog (new) → Medication Search, Scientific Articles → Article Filter, Lab Panel → Lab Test Search. All read back; no code used the old ids.

### Webflow stage (Designer, /contact › Consultation Form)
1. Date of Birth Text Field › Settings › Custom attributes: add `data-date-select` (no value).
   Nothing else changes: the name, label and placeholder stay as they are.
   The MCP can do this (`data_element_settings_tool`, attribute), then read it back.
2. Publish together with the repo deploy, or after it. Before the deploy, the attribute
   does nothing and the old text field shows.

### Repo stage (`regenx`)
1. `src/modules/date-select.ts`: copy of the prototype module. Register it in
   `main.js` (or `index.ts`) before `FormSteps.init` so the selects exist when
   form-steps first syncs.
2. CSS: the `.rx-date-select` rules into `src/styles/site.css` (or a forms
   stylesheet) with their `repo-css` tag.
3. `pnpm check`, build, tests. Then on staging, at /contact step 2:
   - 1440 and 390 look right.
   - A test submission shows `Date of Birth: MM/DD/YYYY` in the form submissions and no `Field N` entries.
4. After `pnpm pull`, drop the attribute from `prototype/contact/index.html`
   (it comes from Webflow then), and remove the prototype module and CSS.

## Custom select: styled arrow and options list (user 2026-11-09)

"Needs custom arrow for select and custom dropdown options as well." This covers
every form select on the site. Today that means /contact: Location/State plus
the Date of Birth Month / Day / Year.

- **What changes:** each `select.w-select` gets a styled box with a chevron
  (`ri-arrow-down-s-line`) that flips when the list is open. The options open
  in a panel:
  - white, `border--strong`, `radius--12`, the nav's soft shadow
  - 15em tall, scrolls
  - hover / keyboard row on `background--light`
  - the chosen option bold, with `ri-check-line`
  - opens upwards when there's no room below
  - fades 150 ms, none with reduced motion
  The box reuses the select's Webflow classes, so its border, radius, height,
  type and focus border still come from the Designer.
- **What doesn't change:** the native select stays in the form, under the box.
  - Webflow submits it as before: checked with Webflow's field collection,
    only `Locations/State` and `Date of Birth` are posted.
  - form-steps validates it as before: Submit stays locked until State is chosen.
  - A label click or validation focus moves to the custom box (checked with a real click).
- **Keyboard** (WAI-ARIA select-only combobox): Up/Down, Home/End,
  PageUp/PageDown, Enter/Space, Esc, Tab, and type-to-jump like a native select
  ("ne" → Nebraska, "n n" → New Mexico). Screen readers get
  `role=combobox` + `listbox`, named by the field label or by Month / Day / Year.
- Works with date-select: the Day list re-renders when the month or year changes
  (Feb 1980 = 29, 1981 = 28), and a day that no longer exists shows "Day" again.
- On phones the custom list is used too, instead of the native wheel. Opt any
  select out with `data-native-select` in the Designer.
- Checked 2026-11-09:
  - 1440 and 375: the State list, the Month list, and the Year list opening below on a phone.
  - No horizontal scroll, no console errors.

### In the prototype
- `src/modules/custom-select.ts`, `run('custom-select', …)` in `src/main.ts`.
- `src/css/repo-proposed.css` › Custom select. This includes the narrower side
  padding on the date boxes, so "Month" fits beside the arrow.
- The prototype's own `date-select.ts` copy is gone: the repo version (02ad09f)
  runs here now.

### Webflow stage
Nothing to change in the Designer: the script finds the selects by Webflow's own `w-select` class.

### Status (2026-11-10)
Shipped: repo bf2e6dd (module, `src/styles/custom-select.css`, `tests/custom-select.spec.mjs`; 102 tests pass), staging deploy green, live on regen-x.webflow.io/contact (State list checked). The prototype copies are removed; it runs the repo's. Also fixed while testing: the options list is named directly (`aria-label` / the field label), because naming it after the combobox read the combobox's value instead.

### Repo stage (`regenx`)
1. `src/modules/custom-select.ts`, registered in `src/index.ts` right after
   `date-select`, before `main`.
2. `src/styles/custom-select.css` from the repo-proposed block, imported in
   `src/styles.css` after `date-select.css`.
3. A Playwright test covering:
   - opening, keyboard choice and type-to-jump
   - the native value and change event
   - the Day list following Month/Year
   - only one Date of Birth key and one State key submitted
4. `pnpm check`, `pnpm test`, push. Then on staging, at /contact step 2,
   check 1440 and 390 and make a test submission.

## ED and hair medications added to the CMS (user 2026-11-10)

Source: `~/Downloads/ED Medications 2/ED_Medication_Descriptors.xlsx` (10 rows plus images) and
`~/Downloads/Hair Solutions/Hair_Medication_Descriptors.docx` (3 rows, no images). None of the 13 were in the CMS.

**Status (2026-11-10):** published through the MCP at the user's request: 15 variants, then 13 products. All 13 pages at /treatments/<slug> return 200 on staging. After the user's site publish (22:15) they still weren't in the catalog: its category lists filter on **Extra Categories contains <category>**, not on Category. Fixed 22:19: Extra Categories set to ED Medications / Hair Regrowth Solutions on all 13, items republished. The catalog needs one more site publish.

**Created through the MCP as drafts, and read back:**
- **13 Products:** sort order 59–71, category ED Medications or Hair Regrowth Solutions.
  - Product Description is the client's descriptor, verbatim.
  - Dose Line and Strengths Line come from the sheet.
  - Card Title is the short name (VAST Tablet, EnduraPro Tablet, Raven Solution, Power Hair Plus, Follicle Fix).
  - Page H1 is the full name.
  - Meta title is "<Card Title> | REGENX Health". Meta descriptions were drafted (≤160 characters, to review).
  - Form is Troche / Tablet / Capsule.
- **15 Product Variants**, one per strength: Tadalafil Chewable 6 / 24 mg and Tadalafil ODT 5 / 20 mg are split, everything else has one. Each is linked both ways (For Product / Product Variants).
- **Names** use the catalog's singular form ("Troche", "Capsule") where the sheet says "Troches" / "Capsules".
- **Images (9 ED products):**
  - Background cut out with macOS Vision.
  - Centred on a transparent 2880×2088 canvas at the existing products' scale, saved as webp.
  - Webflow imported each into its own CMS asset, so the 9 copies uploaded to the site's Assets root (`<slug>.webp`) are unused duplicates and can be deleted.

**Still open:**
1. **No image** for Sildenafil Capsule or the 3 hair products (none supplied).
2. **Form filter:** the Form option field has no "Topical"/"Solution" option, and the API can't add options. The 3 hair products have no Form, so the catalog Form filter won't list them. Add a "Topical solution" option in the Designer (Products › Form, and Product Variants › Format), then set it on the three.
3. **No Product Article on any of the 13.** They show another product's article (SEO-PLAN noindex group, MANUAL-TODO AD) until articles are written, or until each points at an Article Only item via Article Source.
4. **Review:** meta descriptions, and whether any should be New Product / Most Prescribed. (Items already published, 2026-11-10.)
5. **Publish the site**, so the catalog and the ED / Hair category lists include them.

## Peptide hero photo, closed accordions, nav search (user 2026-11-10)

1. **Peptide hero photo cut off on phones.** On phones `.service-hero-visual-w` was a 3:2 landscape box, while the photo is portrait (374×472), so the man's head was cropped. TRT and Enclomiphene have phone combos (`is_trt`, `is_enclo`) with portrait sizes; Peptide had none. Webflow: Service Hero Visual W › tiny (≤479) › aspect-ratio **374/472**. Published by the user and checked on staging at 390 (256×323). The box goes from 246×164 to 246×310 and the whole photo shows (checked on staging with the rule injected). TRT and Enclomiphene are unaffected, because their combos set their own size at tiny.
2. **Accordions all start closed.** `accordions.ts` no longer opens the first item of each group. Repo 9c54114, live on staging; checked 0 open on Home (14), Peptides (15) and Finasteride (11). Opened accordions still stay open independently.
3. **Nav search searches.** The icon used to link to `/treatments?search`, which only focused the catalog box after the page loaded; phones don't raise the keyboard for that, so it looked like plain navigation. `nav-search.ts` (repo 9c54114) opens a search field under the nav bar, focused inside the tap. Enter goes to `/treatments?search=<term>`, the filtered catalog. In the burger menu it closes the menu first. On the catalog page the icon jumps to the catalog's own box. Checked on staging at 375: menu › search › "fina" › Enter › Finasteride Tablet. It searches medications only (as its label says); the site-wide `/search` page is untouched.
4. **Repo CSS policy fix (same commit):** `custom-select.css` and `nav-search.css` use literal values with `repo-css` tags instead of `--_colors---*` variable names (AGENTS.md rule 4).

## CMS field cleanup (user 2026-11-10)

**Deleted 11 fields** after checking every one is used nowhere: not bound in the Designer, not used by any list filter or sort, not read by code, not shown in the published HTML. Their values are backed up in `docs/cms-backups/removed-fields-2026-11-10.json`.
- **FAQs:** Sub-Category(s). It was always identical to Main Category. The FAQ category pages filter on Main Category (12 Medication FAQs shown = 12 by Main Category); the service-page FAQ sections filter on Key to Filter.
- **Posts:** Intro Button Label, Intro Button Link (the post CTA is a static "Get a Prescription" button), Read Time (shown nowhere).
- **Text Testimonials:** Product (empty; no list filters on it).
- **Product Variants:** Strength, Strength Unit, Size, Size Unit, Conc. %, Carrier Oil. They're never displayed (Dose Label is), and no list sorts or filters by them. The Dose Label help text was updated to match.

**Kept, though empty, because the design uses them:**
- **Text Testimonials › Avatar:** bound to the reviewer photo with conditional visibility.
- **Products › Product Intro Callout/Quote:** bound to two rich-text blocks on the Product template.
Remove those blocks in the Designer first if the fields should go.

Field deletions take effect on the live site at the next publish. Nothing on staging referenced these fields, so the next publish changes nothing visible.

## Empty sections disappear (user 2026-11-10)

"Make the medication page more dynamic and make a section disappear if no item is available instead of showing empty state." Repo 4d2e3f4, live on staging.
- **Catalog (`catalog-nav.ts`):** every category block whose list is empty is hidden with its sidebar link. Before, only New Products (`data-catalog-hide-empty`) was.
- **Product pages (`empty-sections.ts`):**
  - The FAQ block "Frequently Asked Questions About …", plus its divider line, when the product has no FAQs.
  - "Related Insights" and "Other Medications" when empty.
- **Anywhere:** an empty list itself is hidden, so "No items found." never shows. A section left with nothing visible is hidden too, so no padding gap remains. In the Designer, add `data-hide-empty` to any block that should disappear when its list is empty.
- **Checked on staging:**
  - Sildenafil Troche (no FAQs): the FAQ block and line are gone.
  - Finasteride: the FAQ block is still there.
  - /treatments: only the empty New Products block is hidden.
  - Home, /scientific-articles, TRT and /reviews: nothing hidden.
  - No "No items found." is visible on any of them.

## Home case 3: new cyclist video (user 2026-11-12)

From Figma node 9959:17472 (the case 3 media in "Clinical Case Scenarios") and the clip the user supplied (832×1104, 12 s, 7.0 MB, with an audio track).
- **Encoded:**
  - Crop 832×960. That is all the box ever shows: center-cropped, the 420×329 desktop box and the 271×313–348 phone box together use the full width and the middle 960 rows.
  - Light denoise (`hqdn3d`, the source is grainy), scale to 720×830 with square pixels, H.264 High CRF 28, `+faststart`, audio dropped.
  - Result: **1,091,267 bytes**, 85% smaller than the source. SSIM 0.976 against the source; the difference doesn't show at display size.
  - Poster: the first frame as JPG, 28,536 bytes.
  - Copies are kept in `design/videos/`.
- **Uploaded** as Webflow assets `case-cyclist-720.mp4` and `case-cyclist-poster.jpg`. The CDN serves them byte-identical: MD5 3f4d56c1… and b0866dae… match the local files.
- **Webflow:**
  - Home › case 3 `C | Video` instance: Video Source (MP4) and Poster Image (URL) props point at the new files (read back).
  - Case 3 copy: "dedicated cyclist" → "competitive cyclist", matching Figma.
  - Published by the user 2026-11-12 20:48 UTC and checked live.
- **Checked:** previewed on staging by swapping the source in the browser. It plays and loops muted; at 1440 and 390 the whole rider is in frame.
- **Open:** on phones the floating "Hematocrit Trend" card covers the rider's head and shoulders. The old clip's rider sat lower, so this didn't show before. The fix would be moving or shrinking that card at ≤479.
- **Figma typos not copied:** "CJC 1285" (staging has CJC-1295) and "Microdosing Protocal".

## Home service tabs: Enclomiphene and Peptide copy (user 2026-11-12)

The Enclomiphene and Peptide Therapies tabs on Home still carried the TRT tab's placeholder paragraph and six chips. They are now the client's copy, written through the MCP and read back. Published by the user 2026-11-12 20:48 UTC and checked live.
- **Paragraphs** (`C | Paragraph` Text prop):
  - Enclomiphene: "Enclomiphene citrate is an oral medication…"
  - Peptide: "Peptide therapy uses growth hormone peptides like Sermorelin, CJC-1295/Ipamorelin, and Tesamorelin…"
- **Chips:**
  - Enclomiphene: Boosts natural testosterone · Supports fertility and sperm production · No injections required · Improved energy and libido · Lean muscle gains · Improved recovery.
  - Peptide: Faster workout recovery · Improved sleep quality · Lean muscle growth · Fat loss support · Increased energy and endurance · Enhanced TRT results.
- **Headings:** both already read "Enclomiphene" / "Peptide Therapies" as H3; no change needed.

## Home case studies: photos and new widgets (user 2026-11-12)

From Figma node 9959:17234 ("Clinical Case Scenarios"). Cases 1 and 2 are photos, case 3 keeps the cyclist video, and all three floating widgets are new.
- **Media:**
  - Case 1 `C | Video` replaced by an Image (`Custom Crop`, `case-1-athlete.webp`, alt "48-year-old athlete in a tank top, seen from behind").
  - Case 2 image swapped to `case-2-runner.webp` (alt "38-year-old man running on a track").
  - Case 3: the lab-icon strip (`Case Card | Media` + `is_hanging` image) hidden.
  - Both WebP uploads byte-verified against the CDN. Copies are in `design/`.
- **Widgets:**
  - The three Lottie animations (`Case Card | Widget Image`) are replaced by HTML Embeds holding inline SVGs with live text, built from the Figma measurements: `plan/imagery-audit/widgets/cases/case1–3.svg`, generated by `gen-case-widgets.py`.
  - Case 1 and case 2 are "Total Testosterone Level" range cards: 821 ng/dL and 801 ng/dL; Low <300, Optimal 400-700, High >800; "Ways to Increase Testosterone" footer.
  - Case 3 is a "Hematocrit Trend" bar chart (Jan–Dec, 40–55%, Aug and Dec in red).
  - Animated by regenx `lab-widget.ts`: bars fill, the ▼ value counts up, and the copy fades in. New `.lw-col` chart columns grow from the bottom.
  - The raw Figma SVG exports (`case*.raw.svg`, text outlined) are kept for reference only.
- **Webflow styles, desktop:**
  - `Case Card | Media`: width 83.75%, height auto, max-height none, aspect-ratio 479/416 (Figma photo 479×416 in a 572 frame).
  - `Case Card | Media W`: padding-top 7% (Figma's 40px above the photo).
  - `Case Card | Widget`: width 17.125em (274px).
  - `is_custom-ap`: its 2/3 aspect-ratio moved to ≤991 only.
  - `is_down`: top 0% (was 32%).
- **Webflow styles, ≤991:** `Case Card | Media` keeps 86% / 83% / max 24em / aspect auto, Media W padding-top 0, widget 17.5em. `is_down` is top 0 everywhere, which fixes the phone Hematocrit card covering the rider (AJ's open question).
- **Checked:** the prototype Home with the same CSS and SVGs injected. At 1440 the widget is 234 px wide (274 × 0.853) and the photo is 409 × 355 (479/416), offset 37 px from the top, as in Figma. At 390 the case 3 widget sits above the rider.
- **Not checked on staging yet:** needs a publish (MANUAL-TODO AL).
- **Fix, 2026-11-12 (after the publish):** in the browser the web font sets text wider than Figma, so case 1's second paragraph line ran past the card edge (275 of 274 units) and case 2 nearly did. Both paragraphs are re-wrapped to 254.5 units using the live font's measurements: still 3 and 4 lines, so the layout doesn't change. The embed code is updated in Webflow. Checked on staging with the lines swapped in: the widest text now ends at 259.8 and 259.4, inside the 264.3 padding. Case 3 already fit. Needs a publish.
- **Fix 2, 2026-11-12:** the real cause of the clipping. In cases 1 and 2, the bars, labels, divider and footer were 9.742 units too low: the card padding was added twice, because Figma's y 91.578 for the bars frame already includes it. That put the "Ways to Increase Testosterone" footer on the card's bottom edge, where `overflow: hidden` and the corner radius cut it. Fixed in `gen-case-widgets.py` (`by = 91.578 + dy`), and the embed code is updated in Webflow and read back. The footer now ends 14 units above the bottom, as in Figma, and the ▼ value sits just above the bars. Checked on staging with the shift applied. Needs a publish.

## Peptide stacks: new photos and pins (user 2026-11-12)

From Figma node 9164-11613 (/peptides › "Peptide Stacks", with comment "Updated" on the Performance card). All four photos were new.
- **Photos:**
  - Cut from the raw source images to Figma's exact crop: square, no baked-in corners or border, which come from the card's CSS.
  - Saved as WebP in `design/peptide-stacks-2026-11-12/`: 1 recovery 893², 24 KB; 2 muscle 1056², 94 KB; 3 fat burn 1056², 60 KB; 4 performance 771², 27 KB.
  - Uploaded, and byte-identical on the CDN (MD5 match). New alt text on each.
- **Pins** (pins.ts `data-x/y` = dot centre in % of the 352 photo, all labels on the right):
  - Recovery: Testosterone 31.96/56.11, MOTS-c 45.60/75.43.
  - Muscle: BPC 157 30.73/31.51, TB 500 56.58/65.89.
  - Fat burn: Testosterone 39.47/33.22, Sermorelin 39.47/56.79. This card now has `data-pin-media` (w 352, dot 31.8) and `data-pin-img`.
  - Performance: Semax 30.08/41.45, Epithalon 54.52/67.87.
  - The third pin of cards 1, 2 and 4 was moved to card 3 or removed.
  - Figma's "MOTS- c" is written MOTS-c, as elsewhere on the site.
- **Heading:** "Peptide Stacks for Optimal Performance" + grey "with Testosterone" (Figma wording, kept in title case like the other H2s).
- **Not changed:** the intro paragraph under the heading (not in Figma; kept by the user's decision, 2026-11-12), and Figma's ← → arrows (staging shows 4 fixed cards).
- **Checked:** on staging, cards 2 and 4 with the new photo and pins applied in the browser match the Figma placement. Needs a publish.

## Tamoxifen image (user 2026-11-12)

The Tamoxifen Tablet product (CMS item `6a8732922522ad70a296dfa4`, slug `tamoxifen`) had no Product Image, so `/treatments/tamoxifen` rendered an empty image binding.
- **Image:** Figma's product card (9232-15173) uses the white RegenX capsule. The raw image (2931×1564, transparent) is centred on the same 2880×2088 transparent canvas as the other capsule images, so it sits at the same size in the cards: capsule about 72% of the width.
- **File:** `design/tamoxifen-2026-11-12/tamoxifen-tablet.webp`, 56 KB. Uploaded and byte-identical on the CDN, then set as Product Image with alt "Tamoxifen tablet" and read back.
- **Categories:** Extra Categories is empty, as for every other Testosterone-category product, so it was left as is.
- Needs a publish.

## Burger menu button (user 2026-11-12)

Figma comment "Burger menu is updated": 9958-16261 (open) and "iPhone 13 mini - 26" 9958-13610 (closed). The menu panel already matched staging; the button changed.
- **Closed:** a 32px button the same colour as the header, with a 3×3 grid of white dots (Figma 13px glyph).
- **Open:** the corner and centre dots stay white and the 4 edge dots go #303030, so the dots form an X. The icon no longer turns 45°.
- **Webflow (G | Navigation component):**
  - Menu icon svg: viewBox `-1.5 -1.5 16 16`. The 4 circles are moved to the corners (r 1.5), and 5 circles are added: the centre, plus 4 edges marked `data-menu-dot="edge"`.
  - `G Nav | Menu Button`: background and colour variables swapped (was a white button with dark dots), so it stays theme-aware.
- **Repo:**
  - `menu-motion.ts` no longer rotates the icon.
  - New `styles/menu-button.css` (js-state): edge dots at opacity 0.19 when `aria-expanded="true"` (19% white on black ≈ #303030), with a 0.3s fade and no fade under reduced motion.
  - Test added in `tests/interactions.spec.mjs`; 106 pass.
- **Panel position (follow-up, same day):** Figma's open panel starts 26px below the header row (y 82 at 375); staging's started at y 67. `G Nav | Block` + `is-center` › tiny › top is now 4.375em (61px at 375). Tablet keeps 150%. Row spacing already matched (about 43px).
- **Checked:** on staging at 375 with the same changes applied in the browser: closed shows 9 dots; open shows the X; the panel is at y 83 with the Services row at 109 (Figma 82 / 108).
- Not changed: sizes scale to 87% at 375 like the rest of the mobile site (430px scale), so the button is 27.9px for Figma's 32.
- Needs: repo deploy, then a publish.

## Hair product images (user 2026-11-12)

Figma 9962-18001 ("Hair Regrowth Solutions": 3 product cards) now has bottle renders for the three hair products, which had no Product Image in the CMS (MANUAL-TODO AH).
- **Source:** the raw 1392×1130 transparent renders behind each card. The Power Hair Plus card also holds an older, smaller render, which wasn't used.
- **Files:** each bottle is scaled to the full height of the 2880×2088 transparent canvas used by every product image (as tall as in Figma's image box) and centred. `design/hair-products-2026-11-12/`: follicle-fix 84 KB, power-hair-plus 86 KB, raven-solution 92 KB.
- **Uploaded**, byte-identical on the CDN, then set as Product Image with alt text on Follicle Fix (`6af392e10ba5ee490bb89505`), Power Hair Plus (`…503`) and Raven Solution (`…501`), and read back.
- Sildenafil Capsule is still without an image. Needs a publish.

## Peptide page copy (user 2026-11-12)

The user sent screenshots plus copy. Everything was written through the MCP and read back.
- **Hero paragraph:** "REGENX Health is an online peptide therapy clinic prescribing growth hormone and recovery peptides. Every protocol is individualized based on your bloodwork, symptoms and overseen by a board-certified urologist to support your hormone optimization goals."
- **Peptide Stacks:**
  - Heading: back to "Peptide Stacks for" + grey "Optimal Performance". This replaces the "with Testosterone" wording added earlier the same day.
  - Intro: "Personalized peptide therapy for men, with peptide stacks for endurance, recovery, and muscle building. Peptides prescribed and monitored by board-certified urologists at REGENX Health based on your labs and goals."
  - Cards, in order:
    - **Endurance Peptides:** "MOTS-c is a mitochondrial peptide…"
    - **Recovery Peptides:** "BPC-157 and TB-500, combined with TRT…"
    - **Muscle Building Peptides:** "Sermorelin stimulates natural growth hormone release…"
    - **Neuro Peptides:** "Semax and Epitalon may help support focus, memory, sleep, and healthy aging."
  - The pins are unchanged. The Neuro card's pin still reads "Epithalon" (as in Figma), while the description says "Epitalon" (user's copy).
- **Dosages and Protocols:**
  - Heading: "Peptide Dosages and Protocols:". The grey "Clinical Guidelines for Men" span is hidden (visibility off), not deleted.
  - Intro: "Online peptide therapy personalized by your urologist with a focus on safety and clinical results."
  - Card texts unchanged.
- **FAQ "What makes REGENX Health a trusted choice for peptide therapy online?":** staging already matches the pasted answer exactly (all 4 paragraphs compared), so no change.
- Needs a publish.

## Hero carousel smoothness (client, 2026-11-13)

Client (Slack): "carousel - not smooth", on a phone and on desktop. The Home hero cards move with CSS `loopX` (transform only, 60s, 3 copies of 6 cards).
- **Cause:** each card's frosted frame (`Rx Card Frame`, `backdrop-filter: blur(2.4em)`) and its glass pin dots (`backdrop-filter`): about 28 backdrop blurs per copy. A backdrop blur on a moving layer is recomposited on the GPU every frame, which is costly, especially in iOS browsers.
  - Ruled out by measurement: script work (under 15ms in 3s) and paints (the per-frame repaint is the footer CTA's `sweep`).
  - Headless Chromium couldn't reproduce the stutter itself, because it has no GPU compositor.
- **Webflow:**
  - `Rx Card Frame`: backdrop-filter removed at all breakpoints; it keeps its 20% black.
  - `HHCG | Image` (the photo under the frame, used only here): `filter: blur(2.4em)`, `transform: scale(1.1)` (hides the blur's soft edges). Also blur 1.55em at ≤767 and 1.3em at ≤479, the old frame values. Read back.
- **Repo:** in `pins.css`, `.rx-pin-dot` and `.rx-badge` inside `.loop-animate-x` get a 10% white tint instead of a backdrop blur. GOTCHAS entry added (template-candidate). 106 tests pass.
- **Look:** before/after screenshots at 1440 and 390 are nearly identical. The frame looks the same or more even (before, the wheel showed sharp in the cyclist card's frame).
- **Needs:** repo deploy, then publish. Smoothness itself is to be confirmed on a real phone after the publish.
- **Follow-up, same day (user):** "use flattened high quality optimized images instead of adding blur". The frost is now baked into the images:
  - Each card's base photo (`HHCG | Image`, in the `Carousel Group` component, so all 3 copies) is a pre-rendered `hero-card-0N-frost.webp`. It is 1206×1449 (the source size), blurred with radius 9.6% of the width (the old 2.4em on a 25em card; the same ratio at every breakpoint), with mirrored edges and 20% black baked in. Each file is about 10 KB, compared with 53–174 KB for the sharp sources. Saved in `design/hero-cards-flat-2026-11-13/`; uploaded byte-identical.
  - The CSS `filter`/`transform` on `HHCG | Image` and the 20% tint on `Rx Card Frame` are removed, so no runtime blur is left in the carousel. The sharp inner window (`Rx Card Window Img`) and the live pins are unchanged.
  - Repo `pins.css` (flat-tint pin dots in loops) is deployed (1be1dd6).
  - Checked: Playwright screenshots of the live cards next to the flattened ones at 1440 and 390 match.

## Figma comments still not done (user 2026-11-16)

From the recheck of every "Not done" Figma comment against live staging and the newest Figma page (All Pages | Clean Up). These 5 were confirmed gaps; the user said "fix them".
- **Home › Intelligent Lab Panel button:** "View Full List of Lab Test" → "View Full Lab Panel" (`C | Button` Label prop; aria-label and title follow it). Figma comment 1864075456.
- **Home › Intelligent Lab Panel, bullet 2:** "diagnosis accuracy" → "diagnostic accuracy". Comment 1821115469.
- **Enclomiphene › table heading:** "Enclomiphene Formulations and Dosages" → "Enclomiphene Therapies" (as in Clean Up). Comment 1653744949.
- **Services › FAQ:** `S | FAQs` instance prop Background Grid on (was off), so the section gets `data-wave-grid` dots as on TRT/Peptides. Comment 1568983464.
- **Home › service tabs › product fan:** arrows replaced by dots (Figma 9691-17979: five 10px dots, gap 10, active a 30 × 10 pill in the middle; client comment 1822714631, Canva 223).
  - **Webflow:** in each of the 3 tab panes the `Service Tab | Product Navs` block lost its two buttons and now has class `Rx Product Dots` (flex, centred, gap 0.625em) plus attribute `data-product-dots`. The old classes `Service Tab | Product Nav(s)` are unused now but kept.
  - **Repo:** `smart-swiper.js` config `windowDots` builds up to 5 buttons in that row: the middle one is current; the others step 1 or 2 back or ahead, wrapping round (loop on TRT, rewind on the 6-product tabs). `styles/product-dots.css` (js-state): currentColor dots at 43% (#929292 on the light card), current one 1.875em wide and solid.
  - **Checked:** live Home page with the new markup and the local build: 5 dots in each tab (1440 and 390), +1 goes to slide 1, −2 from there wraps to 19, no page errors. 107 tests pass.
- **Needs:** repo push (staging deploy) first, then a publish. Done: pushed 7b5901e, published by the user; live check passed for all five (dots in all 3 tabs at 1440 and 390, clicks move the fan, no errors).
- **Follow-up, same day:** on Services the FAQ is the Panel Mode variant (a dark card on a light section), so the grid drew on the light area around the card. Figma has it inside the card. `wave-grid.js` now draws into the `.sw-faqs` panel when the section is `[data-wf--s-faqs--variant="panel-mode"]`; base-variant sections (TRT, Peptides) are unchanged. Checked on live Services and TRT with the local build. No Webflow change; needs a repo push only.

## FAQs trimmed to the client's 9 Nov docs (user 2026-11-17)

"Above mentioned in doc pages will have only faqs that are given, rest can be removed." Docs: `client-content/2026-11-09/FAQ section.docx` (FAQ categories) and `FAQ on bottom on each Website Page.docx` (page blocks). User decisions: keep the Peptides and Enclomiphene blocks until the client sends questions (the doc has headings only); remove the Medication and Physician tabs.
- **Archived (5):** the 4 Home "[Answer pending]" questions (cost, administered, side effects, choose the right type) and TRT "Is TRT safe long term?". Archived, not deleted.
- **Category cleared (28):** keyed questions that stay on their page block but are not in that category's doc list: all 10 Enclomiphene and 6 Peptides items, 8 Home items and 4 TRT items. Insurance and HSA keep General Information (they are in both docs). Side effect: these lose their category chip on the page blocks.
- **Categories:** Medication set to Draft (its tab and /faqs/medication go after publish). Physician was already archived and unpublished.
- **Read back:** Home 10 = doc 10, TRT 4 = 4, General Information 11 = 11, Lab Testing 9 = 9, Pharmacy 6 = 6, Telemedicine 4 = 4, Clinic Policies 0 questions (policy links only, `show-policy-links` on). Peptides 6 and Enclomiphene 10 unchanged. Services shows Home's list (first 6).
- **Not touched:** product-page FAQs (Product FAQs collection, 269 items), which the docs don't cover.
- Backup: `docs/cms-backups/faq-backup-2026-11-17-before.json`. **Needs a publish.** Consider a 301 /faqs/medication → /faqs (REDIRECTS.md).

## /peptides FAQ from the Peptide Therapies SEO doc (user 2026-11-17)

"Use those 6 questions (keeping staging site question wording) and answer from doc; remove any not answered questions." FAQ section only; the rest of the doc was not applied.
- **Q1, Q2, Q4, Q5:** question and answer already matched the doc word for word.
- **Q3 "What makes REGENX Health a trusted choice for peptide therapy online?"** and **Q6 "How can I get peptide therapy online safely?"**: questions kept (staging wording from 9 Nov); answers replaced with the doc's (3 paragraphs; intro + 3-item numbered list + paragraph). Client wording kept as written, including "strictured" and the DEA claims.
- **Section heading and subtitle: unchanged** (user: "update is for answers and questions only"). The subtitle was briefly changed and then reset to the component default ("An overview of TRT and peptide therapy for men…").
- Unanswered questions: none; the block shows exactly these 6 (key `peptides`). Read back. **Needs a publish.**

## /testosterone-replacement-therapy FAQ from the user's TRT copy (user 2026-11-17)

Same rule as /peptides: questions keep the staging wording, answers from the pasted copy, unanswered questions removed, section heading and subtitle unchanged. This replaces the TRT part of the earlier trim to the 9 Nov doc.
- **Answers replaced:** "How do I know If I need Testosterone treatment?", "What testosterone level is considered low?", "How is low testosterone diagnosed for online testosterone replacement therapy at REGENX Health?".
- **Restored:** "Is TRT safe long term?" (unarchived; category cleared, since Physician is hidden; its answer already matched the copy).
- **Archived:** TRT's "How do I know if I have low testosterone?" (not in the copy). The Home item with the same question is separate and stays.
- Order (sort 2–5) matches the copy. Read back. **Needs a publish.**
- **Reverted (user 2026-11-17, same day):** both the /peptides and /testosterone-replacement-therapy FAQ edits above. Peptides Q3/Q6 answers are back to the 9 Nov copy. TRT: the three answers are back, "How do I know if I have low testosterone?" is live again and "Is TRT safe long term?" is archived again, i.e. as left by the 9 Nov-doc trim. Section headings and subtitles are unchanged. Read back.
- **Trim reverted for TRT and Peptides (user 2026-11-17):** "Is TRT safe long term?" (answered) unarchived, so TRT is back to its 5 pre-trim questions. Peptides lost no questions in the trim. Their categories stay cleared so the FAQ category pages keep matching the 9 Nov doc; side effect: no category chip on these items.
- **Final state (user 2026-11-17): "the version where you just removed the answer-pending FAQs".** Everything from the 9 Nov-doc trim and the TRT/Peptides edits is undone against `docs/cms-backups/faq-backup-2026-11-17-before.json`: all 29 category references restored, "Is TRT safe long term?" live, TRT's "How do I know if I have low testosterone?" live, Medication category live again (Physician back to its original archived state). The **only** change kept: the 4 Home "[Answer pending]" questions are archived (cost, administered, side effects, choose the right type). Read back from the update results. Needs a publish.
- **Recategorised (user 2026-11-17):** the 8 live FAQs that still pointed at the archived Physician category now use live categories. Home "How do I know if I have low testosterone?" → General Information; TRT copy of it → Lab Testing (avoids the same question twice on one page); Home zoom consultation → Telemedicine; TRT "need treatment", "Is TRT safe long term?", Enclomiphene "switch from TRT" and "vs TRT", Peptides "good candidate" → Medication. No live FAQ points at a hidden category now. Read back from the update result. Needs a publish (the site was published at 16:35 UTC, just before this change).

## Product dots follow the slide; timelines one stage per view on phones (client 2026-11-17)

- **Home product dots** (client, phone screenshot: "can that move as you scroll"): the five static dots are now one dot per product seen through a five-dot window. Every slide change moves the pill; once it reaches the middle the row slides under it (400ms, same easing as the site), and near either end the pill walks to the edge. Clicking a visible dot goes to that product. `smart-swiper.js` (`attachWindowDots`) and `styles/product-dots.css`; no Webflow change. Checked on staging with the local build at 390: TRT 20 dots, slides 1–2 move the pill, 3+ slide the row, last product puts the pill at the right edge, a real swipe and a dot click both update it; Enclomiphene tab gets its own dots.
- **Timelines (TRT Response Timeline, Peptide Therapy Results Timeline):** one stage per view at every phone width (≤767, was ≤479; at 600px TRT showed 3 stages and Peptides 2), and the slider's edge fade is off there too. The stage width is rounded up to a whole pixel, which removes a 1px sliver of the next stage's text at the right edge on phones. `therapy-timeline.js`, `styles/therapy-timeline.css`, test updated. Checked on staging with the local build at 390, 600 and 740 on both pages: 1 visible stage, next moves one stage.
- 107 tests pass. **Needs a repo push only.**

## Enclomiphene benefit tabs dark on phones (user 2026-11-17)

On desktop the section is light with the tabs in a black box (`SB Tabs Content` + `is-fluid`); at ≤767 that combo drops the black fill, so the tabs, card arrows and dots sat on the light grey panel (white arrows/dots nearly invisible). TRT's benefits section is dark (`u-th-dark`).
- **Webflow:** the section's existing empty combo `Section` › `S | Enclo Benefits` › `is_enclo-dark` now sets, at the small breakpoint (≤767, inherited by tiny), the theme collection to the dark mode and `color` to the theme text variable: the same two properties as the `u-th-dark-mobile` utility. Desktop/tablet unchanged. Read back.
- **Checked:** live /enclomiphene at 390 with the dark theme applied in the browser: section black, panel #181818, white text, dark tabs with the white open tab, arrows and dots visible (matches TRT). **Needs a publish.**
- **Changed (user 2026-11-17, same day):** "revert the enclomiphene back colour wise and only make the swiper nav black so it's visible on mobiles". The `is_enclo-dark` combo is empty again (no phone dark theme; read back). New combo `Rx Benefit Controls` › `Is Rx Light Mobile`: at small (≤767) it sets the theme collection to the light (base) mode and `color` to the theme text variable, so the slider's arrows (`Service Tab | Product Nav`) and the Swiper dots (currentColor) render black on the light panel. Added to the 3 control blocks on /enclomiphene only; TRT uses the same block on a dark section and is unchanged. Desktop unchanged. Previewed on live /enclomiphene at 390 (light section, black arrows and dots). **Needs a publish** (the dark section is live from the previous publish until then).

## Scientific Articles › Top Articles: hand-picked posts (user 2026-11-17)

User's mock-up: WHOOP stays the large card; top right "Can I Get Testosterone Therapy even if my Testosterone Level is Normal?"; bottom row "Redefining Testosterone Therapy (Enclomiphene + GHRH)", "DECA vs. Testosterone", "Growth Hormone Peptides: Sermorelin, Ipamorelin, Tesamorelin". These have the new photo covers; the date-sorted lists showed the old flyer covers.
- **Webflow (/scientific-articles):** the three Top Articles Collection Lists switched from "newest by Date Posted" (limit/offset 1 / 1+1 / 2+3) to **curated** items: `Featured Articles | List W` = WHOOP; `Articles | List W` + `u-hide-t` = the normal-T post; `Articles | List W` + `is_slide-t` (bottom row) = Redefining, DECA, Growth Hormone Peptides in that order.
- **All articles list** (`cf4afab2…`, paginated 12): was offset 5 (skip the 5 newest); now offset 0 with 5 filters `Name ≠` the pinned posts, so nothing repeats and the old flyer posts appear there by date. Slug can't be filtered, so a renamed pinned post would show twice: update the filter if a title changes.
- Read back. **Needs a publish.**
- **Same layout in every Scientific Articles section (user 2026-11-17):** the shared component `S | Scientific Articles` (5 instances: Home, TRT, Peptides, Enclomiphene and one more) had the same three date-sorted lists. All three are now curated in the component definition with the same posts and order (WHOOP; normal-T post; Redefining, DECA, Growth Hormone Peptides). The component's `Filters` prop isn't bound to these lists, so no instance overrides them. Read back. **Needs a publish.**

## "As Seen In" marquee owned by Webflow (user 2026-11-17)

The page screenshots (reduced motion) showed the logo rows on /services and /about as a wrapped grid: `Service Hero | Proof Grid` + `u-grid-12` was a full-width wrapping flex row, and the one-line marquee only existed after `marquee.ts` cloned the items. User: "make it marquee designed in webflow rather than depending on code for initial structure".
- **Webflow:** combo `Service Hero | Proof Grid` › `u-grid-12`: flex-wrap nowrap, width max-content. New class `Rx Marquee Set` (flex, nowrap, no shrink). On both pages the row now holds two sets: set 1 = the 12 original `E | Service Hero | Proof Item` instances (moved), set 2 = 12 new instances with the same logos in the same order, attributes `data-marquee-set`, `data-marquee-clone`, `aria-hidden="true"`. The mask (`Proof Marquee Mask`, overflow hidden) is unchanged. Without the script the row is one clipped, still line.
- **Repo:** `marquee.ts` uses the authored copy (no cloning), measures one set, sets the copy's links to tabindex -1 and adds `.is-marquee`; a row without a copy still gets cloned (fallback). Tests added (authored copy loops by one set; one still line under reduced motion). 109 tests pass.
- Either order is safe: the old script on the new markup clones both sets and loops by two sets, still seamless.
- **Needs:** repo push and a publish.

## Lab Panel › Biomarkers: pinned bar rises while the nav hides (user 2026-11-17)

On phones `.lab-tests-nav` (search + tabs) pins at top 0 with a 72px top padding that leaves room for the nav. With the nav hidden by nav-autohide that room was an empty white band. User: tighten it, but keep space for the nav to drop into when it returns. (Checked first: nothing shows through the bar; its background is a white gradient.)
- **Repo:** new `src/modules/lab-sticky.ts` (booted after `lab-tests`). ≤767px only: while `.g-nav-w` has `is-rx-hidden`, the bar's `top` becomes `12 − padding-top` (−61px), so the search sits 12px from the top; when the nav returns, `top` goes back to 0. While pinned, a Web Animations transform slides the bar from its old place with the nav's own transition (600ms, same curve), started in the same frame, as in `catalog-sticky.ts`. Tablet and desktop keep the Webflow top.
- Checked on staging with the local build at 390: nav hidden → search at 12px; nav back → search at 73px, under the nav at every sampled frame of the slide (no overlap); 820 unchanged; no page errors. `pnpm check`, `pnpm test` (109) pass.
- No Webflow change. **Needs:** repo commit + push.

## TRT hero: lab widget animates like Peptide and Enclomiphene (user 2026-11-17)

The TRT "Total Testosterone Level" card was a flat image (TRT Hero Widget.webp). It's now inline SVG from Figma (9849:6572, the card in the final TRT hero 9849:6570), with live text and the `lab-widget.ts` hooks: three range bars fill left to right, the ▼ 821 ng/dL marker slides in and counts up, copy and the "Ways to Increase Testosterone" row fade in. Reduced motion: shown as is. The glass background stays on the Webflow wrapper (the SVG has no fill or border, like Peptide's).
- **Webflow (TRT page):** in both `Service Hero Widget W` wrappers (desktop, and tablet `is_trt`) the Image was replaced by an HTML Embed holding the SVG (`plan/imagery-audit/widgets/trt.svg`). Published 2026-11-17 together with the earlier unpublished changes.
- No repo change (lab-widget.ts already handles `[data-lab-widget]`). Checked on staging with the SVG swapped in at 1680, 820 and 390.

## Source articles: group image (user 2026-11-17)

Request: medications that point to a shared source article (Products › `Article Source`) open that source page as an article; the source page should show a **group image** of all its medications instead of one product shot. Today the hero (`Product Hero | Image`) shows the item's single `Product Image` (e.g. /treatments/sermorelin shows the Sermorelin vial).

**Source items (Article Only = on), 12:** testosterone-injections (7 meds), clomid-guide (4), bpc-157-tb-500 (4), lipotropic-injections (4), ghk-cu-copper-peptide (3), sermorelin (3), nad-therapy (3), tesamorelin-egrifta (2), hexarelin (2), arimidex-guide (2), gonadorelin-acetate (2), ghk-cu-acetate-4-cream-hyaluronic-acid (0, no image; see below).

**Plan**
1. **CMS field:** Products › new Image field `Group Image` (slug `group-image`) in the General group. Help text: "Article Only items: group shot of the medications that use this article. Shown as the article hero. Leave empty on normal products."
2. **Template (Products Template):** duplicate `Product Hero | Image`; the copy binds to Group Image (alt from the field) with conditional visibility *Group Image is set*; the original gets *Group Image is not set*. Products and source pages without a group image look exactly as now.
3. **Style:** group shots will likely be wider than a single vial. If the hero box crops them, add combo `Is Rx Group` on the copy (aspect/object-fit tuned to the first real image). Decide once a sample exists.
4. **Optional:** use Group Image as the template's Open Graph image (it has none today), falling back to Product Image.
5. **Content:** upload one group image per source item (11; webp, ~1600px, same background treatment as the product renders), alt like "Sermorelin vial, troche and GHRP-2 troche". Source of images: client/designer, or composite from the existing product images if asked.
6. **Prototype first:** preview the hero with a sample group image on /treatments/sermorelin in the prototype before touching Webflow.

**Data oddity to confirm:** `ghk-cu-acetate-4-cream-hyaluronic-acid` is marked Article Only *and* points at `ghk-cu-copper-peptide`, with no image. It looks like a real product that should have Article Only off.

**Done (user 2026-11-17: "use composite for now, I will provide later"):**
- **CMS:** Products › `Group Image` (Image, slug `group-image`) created with the help text above.
- **Template:** new Image `Group Image (Article Only)` right after `Product Hero | Image` in `Product Hero | Right`, same class, bound to Group Image, alt from the field, visibility static (was bound to `Article Only`, changed so normal product pages can use it too). Webflow hides it on its own when the field is empty (`w-dyn-bind-empty`).
- **Designer (done by user):** original `Product Hero | Image` has Conditional Visibility *Group Image is not set*. The new image (renamed `Group Image`) is always visible and hides itself when the field is empty, so any product with a Group Image shows it, Article Only or not. Published 2026-11-17; checked all 11 source pages and 4 normal products on staging.
- **Content:** 11 composites built from the member products' renders (`archive/group-images-composite-2026-11-17/`, compose.swift; 2880×2088 transparent webp like the product renders, so no style change needed: `.product-hero-image` is object-fit contain) uploaded and set on the 11 source items with alt = member list (e.g. "Sermorelin (Lyo), Sermorelin Troche and Sermorelin / GHRP-2 Troche"). Replace with the client's images later by swapping the field.
- **Cream:** user 2026-11-17: keep it. Not deleted; its variant (`GHK-Cu Acetate 4% Cream + Hyaluronic Acid 30 gm`) stays, and the cream was put back on the 10 GHK-Cu Product FAQs (published, all 10 show on its page again).
- Open Graph (step 4) not done.

## Home › Why REGENX: lab widget animates like TRT (user 2026-11-17)

The "Total Testosterone Level" card in the Home Why visual (`Why | Visual Widget`) was a flat image (Why REGENX Widget.webp, with its own dark card baked in). It's now the same inline SVG as the TRT hero, so the bars fill, the ▼ 821 ng/dL marker slides in and counts up, and the copy fades in. Reduced motion: shown as is. The card now shows the wrapper's glass (#0006 + blur), like TRT, instead of the image's solid dark fill.
- **Webflow (Home):** the Image was replaced by an HTML Embed with the new class `Rx Widget Embed` (height 100%), holding `plan/imagery-audit/widgets/home-why.embed.html` (trt.svg with `height:100%; width:auto`, so it fills the wrapper's fixed 11.25em / 9em height). Published 2026-11-17; checked live at 1680 and 390 (bars fill, 821 counts up, no errors).
- No repo change. Checked on staging with the SVG swapped in at 1680 and 390: card size unchanged (282×180 vs 285×180 desktop, 204×131 vs 207×131 phone).

## Contact form → HubSpot: plan (user 2026-11-18, PLAN ONLY)

The client is setting up a new HubSpot account. The Contact "Consultation Form" will send to HubSpot with the design unchanged: Webflow keeps the markup, and a repo module posts the fields to HubSpot's Forms API v3. Field map, HubSpot properties to create, decisions for the client (HIPAA/BAA, spam, notifications) and build steps: `plan/hubspot-contact-form.md`. Found while mapping: 49 state option values start with a space (fix in Webflow before the switch). Nothing changed yet.

## Contact form → HubSpot: built (user 2026-11-18, "we are not live yet, make it fully functional")

- **HubSpot** (REGENX Health, portal 248037195, na2, Starter): new contact property `services_of_interest` (Multiple checkboxes; the 8 options use the site's labels as internal values). New form "Website – Consultation (Webflow)", GUID `bd00bed3-41b1-4c60-abee-96289510f6ed`: step 1 Services of interest; step 2 First name, Last name, Email, Mobile phone number, State/Region (contact), Date of birth (default text property `date_of_birth`), Message. Published. One API test submission ("Test Webflow API", hubspot-test@regenxhealth-test.com) checked; delete that contact before launch.
- **Repo** 6f207de: `src/modules/hubspot-form.ts` + `tests/hubspot-form.spec.mjs`. Forms with `data-hubspot-form="<GUID>"` post to `api.hsforms.com/submissions/v3/integration/submit/248037195/<GUID>`; Webflow's post is stopped; Webflow's success / error panes are shown. Map by Webflow field name (Phone → `mobilephone`, Locations-State → `state`, trimmed, so the leading-space state values don't matter). Loads the HubSpot tracking code (`js-na2.hs-scripts.com/248037195.js`) from the bundle on every page, so `loader.html` didn't change.
- **Webflow** Contact › Form (`1a839375-…ca2b`): custom attribute `data-hubspot-form` = the GUID. Rollback: remove the attribute and publish.
- Open: HIPAA/BAA (Starter has no Sensitive Data; client to decide), who gets notification emails (HubSpot form › Notifications), Webflow reCAPTCHA no longer guards the post (HubSpot bot filtering is on).
- **Published + tested 2026-11-18:** staging bundle 6f207de deployed (CI test + deploy green), Webflow site published to webflow.io. Test on /contact (TRT + Second opinion, Arizona, DOB 03/04/1985): Webflow's "Thank you!" pane showed, and HubSpot recorded the submission with all 8 fields (state trimmed to "Arizona", services as 2 options, conversion page "Book a Consultation"; the hubspotutk cookie was sent, so no missing-cookie warning). Two test contacts to delete before launch: "Test Webflow API" and "Staging HubSpot Test".

## Contact form: "no health information" note under Message (client 2026-11-18)

Client asked for a short line under "Message (optional)" so visitors don't type medical details into a form that goes to HubSpot (not HIPAA-covered on Starter).

- **Prototype:** `contact/index.html`, between the Message label and input: `<div id="Message-hint" class="caption u-muted-64">Please do not include any personal health information in this message.</div>`; the input gets `aria-describedby="Message-hint"` so screen readers read the note with the field. Existing classes only (Caption + U Muted 64), no new class.
- **Webflow (done + published to webflow.io 2026-11-18, user "Yes, add and publish"):** Text Block `2475fe54-…2713` added. Steps were: Contact › Form › Message field wrapper (`form-pane-field is_full`): add a Text Block after the label, classes `caption` + `u-muted-64`, ID `Message-hint`, same text. On the Message input add custom attribute `aria-describedby` = `Message-hint`. Staging HTML checked: label, note, then input with `aria-describedby="Message-hint"`. Rollback: delete the Text Block and the attribute. The HubSpot module ignores it (not a form control).
- **Text changed (client 2026-11-18):** to "Please do not include any personal health information in this message." in Webflow and the prototype. Published to webflow.io 2026-11-18 (user "Yes, publish").

## Pre-launch fixes (2026-11-19, user "Yes, start the fixes")

Pre-launch QA and the full list: `regenx/docs/handoff/LAUNCH.md`. Made straight in Webflow (launch fixes, not design changes), **not published**:
- Hero images `loading="eager"` (+ `fetchpriority="high"`) as custom attributes: TRT, Peptides, Enclomiphene, Products template, Posts template cover.
- Share links `aria-label` (X, Facebook, email) on Products and Posts templates and the 4 legal pages; `aria-hidden` removed from the desktop TOC box (`Article Sticky | Block`) on the same pages.
- Class `TOC Link` opacity 0.4 → 0.6 (contrast).
- Open Graph images on 17 pages; Washington policy OG title/description copy SEO.
- Repo (uncommitted): `toc-follow.ts` hides the TOC box on articles without headings (the "Loading" item), with 2 tests.

## Spelling mistakes inside images fixed (2026-11-19, user "fix the spelling mistakes you found")

Found during the alt-text review (`docs/alt-text/`). The Figma source text couldn't be edited through the API (FFF Acid Grotesk is a local font the plugin can't load), so the exported images were patched: the wrong word covered with its own background and redrawn in the site's FFF Acid Grotesk font files (same weight, size fitted to the original), checked side by side. New assets uploaded, elements swapped, published to webflow.io; old files no longer referenced on any page.
- Process Step 4 card "Teststerone" → "Testosterone": `Process Step 4 (fixed).jpg` (Home, Enclomiphene process tabs) and `Process Step 4 (fixed).webp` (`S | How To Process` component: TRT, Peptides, Services).
- Care journey diagram "Therapy Discusion" → "Therapy Discussion", "Protocals" → "Protocols": `Journey (fixed).svg` (Home, outlines regenerated from the font) and `TRT Accordion 1 - 05 (fixed).webp` (TRT).
- TRT cardiovascular card "Dysliipdemia" → "Dyslipidemia": `trt-3-1-cardiovascular-function-fixed.webp` (alt text copied).
- Enclomiphene chart "On Enclomipnene" → "On Enclomiphene": `Enclomiphene Therapies 4 (fixed).png`.
- Not changed: the Lipo Mino product photo label ("Pyroxidine", "Inositil") is the product's own label artwork; the Figma card titles with the same spelling and the ~60 "Teststerone" copies in Figma still need fixing in Figma desktop (font installed there).
- API-uploaded files get no responsive variants (GOTCHAS 2026-11-08): the step 4 WebP is now 373 KB at every width. Re-upload in the Designer if phones should get the smaller sizes.

## Alt text live on staging (2026-11-19, user "alt text needs to be in staging live please")

Source: `docs/alt-text/alt-text-proposed-2026-11-19.csv` (the client review PDF's text; not yet client-approved). Applied, published to webflow.io, re-crawled 108 pages:
- 166 site assets: `update_asset` alt text (decorative ones cleared); elements on "inherit" pick it up. Two elements with typed alt text updated directly (footer HIPAA seal, Enclomiphene white tablet).
- 105 CMS images: the image field's `alt` on 65 Products (product-image, group-image), 21 Posts (article-cover), 4 Video Testimonials, 5 Member Ofs, 5 FAQ Categories (icons cleared). Batches over ~20 items return "Missing fields"; 16 per call works.
- Result: 197 of 271 images show exactly the proposed text everywhere. The other 74 differ on some pages by design: product lists/pages bind alt to the product name (47), blog-card images keep alt="" because the card link is labelled with the title (17), FAQ icons show the category name (5), headline accent "bubble" images keep alt="" (5). Per-image status: `docs/alt-text/alt-text-live-status-2026-11-19.csv`.
- If the client changes text in the PDF: update the asset (site images) or the CMS item's image alt (product/post images) and publish.
