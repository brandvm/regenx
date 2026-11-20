# Launch: regenxhealth.com → Webflow

Target go-live: **Mon 2026-11-23** (planned 2026-11-19). Staging:
`https://regen-x.webflow.io`. Live domain today: `www.regenxhealth.com` on Wix
(Wix nameservers; email on Google Workspace).

Lists from the `webflow-launch` skill. Tags: **[Claude]** Claude does it ·
**[Claude checks]** Claude verifies · **[Person]** a person does it.
Tick with the date and who. Raw check output: `pnpm wf:links`, `wf:seo`,
`wf:a11y --all-widths`, `wf:html`, `wf:overflow`, `wf:perf` (run 2026-11-19).

## Blockers: must be done before the domain moves

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| B1 | **Webflow site plan** (CMS or Business) on the RegenX site, so a custom domain can be added. `get_site` shows no custom domain yet. | Person (Brand Vision / client billing) | ☐ |
| B2 | **Domain + DNS** (client: Wix domain access, someone available on launch day; also gives us Google Search Console access). Add `regenxhealth.com` and `www.regenxhealth.com` in Webflow › Publishing, `www` as default. In Wix DNS (domain stays registered at Wix unless moved): replace the Wix A/CNAME records with Webflow's; **keep the Google Workspace MX records** (aspmx.l.google.com…) plus any SPF/DKIM/DMARC TXT. Lower TTL the day before. | Client gives access; Brand Vision switches | ☐ |
| B3 | **301 redirects.** 53 rows in `docs/launch/redirects-launch.csv`, **all ready** (2026-11-19: the 27 open destinations decided by Brand Vision, not the client; /how-it-works now → /about-us). Import file: `docs/launch/redirects-webflow-import.csv` (source,target; check against Webflow's import template). Every one of the 149 URLs in the live Wix sitemap is covered: 120 exist on staging at the same path, 29 are in this list. All 53 targets answer 200 on staging. Add in Site settings › Publishing › 301 redirects (CSV import or by hand) | Brand Vision adds | ☐ |
| B4 | **Sitemap off.** `/sitemap.xml` is 404 on staging and the footer "Site Map" links to it. Site settings › SEO › Auto-generate sitemap: on. | Person (site settings aren't in the API) | ☐ |
| B5 | **Global canonical URL** = `https://www.regenxhealth.com` (Site settings › SEO). No page has a canonical today (108 of 118). | Person | ☐ |
| B6 | **Analytics.** GA4 `G-SDBN31SRST` is the property the live Wix site sends to today (checked 2026-11-20: `_ga_SDBN31SRST` cookie and GA4 collect hits; Wix also still loads the dead UA-109212131-1). In the site **Head code** since 2026-11-20 (also in `loader.html` HEAD, so `pnpm test:webflow` keeps checking it; the earlier registered script was removed), published: it runs only on `regenxhealth.com` / `www.regenxhealth.com`, so staging sends nothing (verified: 0 GA requests on staging; on a simulated live hostname gtag loads and configures the ID). Open: consent banner decision (client); check GA4 Realtime on launch day. | Brand Vision; client for consent | ◐ |
| B7 | **Nav featured article link** publishes `href="detail_insight"` (a 404) on **every page** (G \| Navigation › Patient Information › blog card title link). Designer: link → Collection page → Current Insight (same fix as MANUAL-TODO V). | Person (Designer; API can't link to the current item) | ☐ |
| B8 | **"Loading" table-of-contents item** shows on 11 pages whose article has no H2 (Finsweet TOC never fills): /telemedicine-consent, 2 posts, 8 product pages. Fix in the repo: hide the TOC block when it has no headings. | Claude | ☑ 2026-11-19, 05f91c0 (deployed): checked on staging: /telemedicine-consent and the LPT product hide the box; /post/do-i-have-low-t (4 links) and /practice-policy (27) keep theirs. |
| B9 | **HubSpot form**: notification recipients (Brand Vision sets them); delete the 2 test contacts; HIPAA/BAA decision from the client (after launch is OK). | Brand Vision; client for HIPAA | ☐ |
| B10 | **First release** (MANUAL-TODO AC). **With `RELEASE` null the production domain loads no site CSS/JS at all** (loader.html, by design), so this is required for launch, not optional. Steps: port wf-template 0.8.0's piece-1 HEAD fix (AGENTS.md › Release), tag `v0.1.0` on a green `master`, set `RELEASE`, re-paste Head code, the `G \| Components` embed and Footer code, publish, `pnpm test:webflow`. | ☑ Head code with RELEASE 0.1.0 pasted and published 2026-11-19; `pnpm test:webflow` green. Tag `v0.1.0` cut 2026-11-19 (1b306da, CI green, jsDelivr verified). Person pastes `docs/launch/head-code-release-0.1.0.html` as Head code (Embed and Footer unchanged), publishes; Claude runs `pnpm test:webflow`. |

## Carry over from the live Wix site (checked 2026-11-19)

| # | What Wix has | Staging today | Action | Owner |
| --- | --- | --- | --- | --- |
| W1 | **Google Search Console verification**: `<meta name="google-site-verification" content="u42Zmg7CvUnz2xEHAOoybufeH_gx8zI3Ikjr2MuVA28">` | none | Paste the content value in Site settings › SEO › Google site verification before the DNS switch, or the Search Console property (if it was verified by this tag, not DNS) stops verifying and sitemap submission fails. | Person |
| W2 | **Analytics**: only `UA-109212131-1` (Universal Analytics, retired by Google in 2024; collects nothing). No GA4, GTM, Meta pixel, Ads or Hotjar. | none | Nothing to carry over. Check the client's Google Analytics account: the UA property may have a GA4 property linked to it; if not, create one (B6). | Client + Person |
| W3 | **Patient Portal** (power2patient.net): header button "Patient Portal" → `/pui/identity/register-here`, "Patient Login" → `/pui/identity/login` (header, footer, logo icon). | **missing**: no link anywhere | Existing patients log in from the site today. Client to say where it goes (nav button next to Get Started, footer, or both); then add in G \| Navigation / footer. | Client decides; Claude builds |
| W4 | **Phone and address** in Wix's LocalBusiness schema: 1-888-673-4369, 7777 Southwest Freeway, Houston TX 77074. | no phone/address anywhere (Content check) | Client confirms they're current, then: Organization/MedicalBusiness JSON-LD (MANUAL-TODO P) and, if wanted, `tel:` in the footer/contact page. | Client confirms; Claude adds |
| W5 | Default share image, 1600×900 (`606a28_36c91274…~mv2.png`). | Home hero poster used as default | Optional: reuse it (or a new 1200×630) as the default share image. | Designer's call |
| W6 | robots.txt allows everything; Wix sitemap index (3 sitemaps). | staging robots `Disallow: /` (normal for webflow.io) | At launch check the live robots.txt allows indexing (launch day list). | Claude checks |
| W7 | Header nav "ED Meds" (→ a broken Wix page). | ED products exist under /treatments | Covered by the redirects (B3). | — |

## Pre-launch QA

### Content
- [x] [Claude checks] Placeholders and `#` links (2026-11-19): no lorem ipsum. Broken: B7 (`detail_insight`), B4 (`/sitemap.xml`), B8 ("Loading" `#` links). The other `#`/empty links are the share buttons (filled by script) and are fine.
- [ ] [Person] Proofread every page.
- [x] [Claude checks] Contact data: **no phone number, email or address appears anywhere on the site** (no `tel:`/`mailto:` links). Confirm with the client that this is intended; the Organization schema also waits for them (MANUAL-TODO P).
- [x] [Claude checks] Legal pages: Privacy Policy (/practice-policy), Terms, Accessibility, Telemedicine, California addendum, Washington Health Data Policy all linked in the footer and answer 200. Copyright year is written by script (shows the current year). No social links in the footer (none planned?).
- [ ] [Person] Contact-form copy and consent text signed off by the client (MANUAL-TODO AB).

### Function
- [x] [Claude] Contact form → HubSpot tested on staging 2026-11-18 (all 8 fields arrive). [Person] one more real submission after launch.
- [x] [Claude checks] Internal links: 119 pages crawled. Only failures are B4, B7 and old URLs from the check config. External: 217 answer 403 to the checker (PubMed, PMC, DOI, HHS block bots); spot-check by hand. 4 others: reuters.com (401), ieeexplore (418), wjmh.org (reset), walshmedicalmedia PDF (timeout): open by hand.
- [x] [Claude checks] 404 page: unknown paths answer 404 with the site's 404 page.
- [x] [Claude checks] MANUAL-TODO AF: `/faqs/physician` is 404, but nothing links to it (not in the 119-page crawl's broken links, not in the live Wix sitemap). Harmless; close AF unless the client wants a Physician FAQ category.
- [x] [Claude checks] MANUAL-TODO AE: `/design/medication-catalog` is 404 on staging (draft or deleted). Done.
- [ ] [Person] Search (/search, /treatments filter, /scientific-articles filters) quick click-through.

### Devices, accessibility, speed
- [ ] [Person] Real devices: iPhone Safari, Android Chrome; desktop Chrome, Safari, Firefox, Edge.
- [x] [Claude checks] axe scan, 16 pages × 1440 and 375 (2026-11-19): 12 of 16 pages clean. Serious failures, all fixable:
  - A1 ◐ Share buttons had no accessible name. 2026-11-19: `aria-label` "Share on X" / "Share on Facebook" / "Share by email" set on the Products and Posts templates and the 4 legal pages (not published).
  - A2 ◐ Sticky TOC links failed contrast: class `TOC Link` opacity 0.4 → 0.6 (≈5:1 on the light background; the current link and hover stay at 1). Not published.
  - A3 ◐ The desktop "In this Article" box (`Article Sticky | Block`, `u-hide-ml`) had `aria-hidden="true"` though it holds links: removed on both templates and the 4 legal pages. Not published.
  - A4 Home product-fan dots (`.rx-product-dot`, smart-swiper.js): 10px dots 10px apart, so axe's 24px spacing rule fails even with the larger hit area. Fixing it means 14px gaps instead of Figma's 10px. **Decision needed**; the slides also swipe, so this is not a blocker.
  - A5 TRT/Enclomiphene benefit slider: the faded previous slide and one bar-chart bar fail contrast (likely acceptable for an off-screen slide; check by eye).
- [x] [Claude checks] `pnpm wf:overflow`, 16 pages × 14 widths (1920–320), 2026-11-19: nothing runs off the right edge, no sideways scroll.
- [x] [Claude checks] No `data-manual-todo` markers in the published HTML; every `<img>` has an alt; favicon on every page.
- [x] [Claude] Alt text for all 271 images written and live on staging (2026-11-19; `docs/alt-text/`): assets + CMS image fields; client review of the wording pending (PDF).
- [ ] [Claude checks] Keyboard walkthrough (nav menus, mobile menu, contact steps, accordions, Escape).
- [ ] [Person] Screen reader spot check (VoiceOver on Home + Contact).
- [x] [Claude checks] Performance, phone profile, median of 3 Lighthouse runs (2026-11-19, `.webflow-build/perf/perf-2026-11-19-15-20-38.json`). CLS fine everywhere (≤ 0.03); TBT 120–260 ms.

  | Page | Score | LCP | Transfer | LCP element |
  | --- | --- | --- | --- | --- |
  | / | 73 | 4.4 s | 6.6 MB | hero video poster |
  | /contact | 90 | 2.7 s | 3.3 MB | intro paragraph |
  | /testosterone-replacement-therapy | 66 | **9.4 s** | 2.8 MB | hero image (`loading="lazy"`) |
  | /treatments/testosterone-injections (product template) | 69 | **9.9 s** | 1.5 MB | `product-hero-image` (`loading="lazy"`) |

  - P1 ◐ Hero images were lazy-loaded, so the browser fetched them last. 2026-11-19: the image's Load setting isn't in the API, so custom attributes `loading="eager"` (+ `fetchpriority="high"` on the first) went on the hero images of TRT, Peptides, Enclomiphene, the Products template (`Product Hero | Image` ×2) and the Posts template cover. **Check after publishing** that Webflow outputs `loading="eager"` and not its own `lazy`; if it doesn't, set Load → Eager in each image's settings in the Designer. Then re-run `pnpm wf:perf`.
    - **Result after publish (2026-11-19, 5 runs, /contact as unchanged control: FCP 2.7 → 2.8 s, steady):** LCP improved (TRT 9.4 → 8.0 s, product 9.9 → 6.8 s) but FCP got worse (TRT 2.4 → 6.0 s, product 2.7 → 4.9 s), so the scores dropped (TRT 66 → 54, product 69 → 63). Each service page has two hero copies (phone and desktop, one hidden); `eager` made phones download the hidden copy too, at `fetchpriority="high"`.
    - **Adjusted (unpublished):** `fetchpriority` removed everywhere; `eager` kept only on the copy phones show (TRT/Peptides/Enclomiphene first hero image, product and post templates); the desktop copies are lazy again. Publish and re-measure; if FCP is still worse than the 2026-11-19 morning baseline, remove `loading` from all of them (back to Webflow's lazy).
    - **Published and settled (2026-11-19 afternoon): keep it.** Lighthouse's default *simulated* throttling still reports FCP ~5–6 s on TRT/product (it models the early image request as competing with first paint). Measured with **real (devtools) throttling**, TRT now paints and shows its hero at **2.2 s FCP / 2.2 s LCP** (2 runs), under the 2.5 s target, while /reviews (hero still lazy) took 5.3–5.4 s LCP. Field data (what Google ranks on) follows real loading, so `eager` stays. /reviews hero set to `eager` too (unpublished).
    - ☑ reCAPTCHA: switched off in Site settings › Forms by the user and the Contact form's reCAPTCHA box removed (2026-11-19, published); `recaptcha/api.js` no longer loads on any page checked (/, /contact, TRT, /about-us). Cloudflare Turnstile still loads on pages with forms. Webflow keeps the Contact Submit button disabled until Turnstile issues a token; automated browsers never get one (headless Chromium and the app's browser both waited with Submit disabled), so the after-change submit check is **[Person]**: one real submission from a phone, then delete that contact in HubSpot. Was: render-blocking `google.com/recaptcha/api.js` on every page (Webflow's reCAPTCHA; the Contact form posts to HubSpot now, so Webflow's reCAPTCHA no longer checks anything) — turning it off in Site settings › Forms would remove ~0.8 s of blocking; remixicon.css is also render-blocking (~1 s). Main-thread work 2.8 s on a phone CPU.
  - Also LCP: /reviews hero is `Placeholder 00088.jpg`, a **placeholder photo** (content to replace), and lazy too; /scientific-articles featured image lazy (CMS list, leave).
  - P2 Home transfers 6.6 MB on a phone (hero video and carousel). Check after launch which files are largest.

### SEO and tracking
- [x] [Claude checks] Titles and descriptions present on every page; one H1 on every indexable page.
- [ ] [Claude/Person] Open Graph images. 2026-11-19 ◐: set on 17 pages via the API (not published): TRT, Peptides, Enclomiphene use their hero photo; Home and the other 13 (Services, Lab Tests, Treatments, Contact, FAQs, Scientific Articles, About, Reviews, 4 legal, FAQ Categories template) use the Home hero poster. **[Person] Products template:** Page settings › Open Graph image → bind to *Product Image* (the API refuses a CMS binding). A designed 1200×630 share image would look better than the poster; designer's call.
- [x] [Claude] `/washington-health-data-policy` og:title / og:description now copy its SEO title and description (not published).
- [ ] [Claude] JSON-LD with HTML entities (`&#39;`, `&amp;`…) on 6 posts: fix the bound fields (wf:seo lists them).
- [ ] Notes only: 37 titles over 60 characters, 50 descriptions outside 50–160 (mostly long post titles); fix after launch if wanted.
- [ ] [Claude checks] After the domain is attached: canonicals point to `www`, robots.txt allows indexing, the `.webflow.io` subdomain is not indexed.
- [ ] [Person] GA4 real-time shows a visit and a form conversion (after B6).

## Launch day (target 2026-11-23)

- [ ] [Person] Content freeze and go-live approval from the client.
- [ ] [Person] DNS switch (B2); keep MX/SPF/DKIM.
- [ ] [Claude, with OK] Publish to the custom domain; release + `RELEASE` set.
- [ ] [Claude checks] SSL; `regenxhealth.com` → `https://www.regenxhealth.com`; http → https.
- [ ] [Claude checks] `pnpm wf:install --live` (snippets match `loader.html` with the new `RELEASE`, no localhost requests) and `pnpm wf:seo --live --canonical` (no stray noindex, canonicals on `www`).
- [ ] [Claude checks] `sitemap.xml` doesn't list `/design/*` or the style guide pages (exclude with the sitemap tool once the plan is on; it answers 403 before).
- [ ] [Claude checks] Top old URLs redirect (run the 29 from B3 against the live domain).
- [ ] [Claude] `pnpm wf:baseline save --live`, commit.
- [ ] [Person] Submit sitemap in Google Search Console (verify the domain first if not done).
- [ ] [Person] Submit the contact form on the live site; it arrives in HubSpot.

## After launch (first 30 days)

- [ ] [Claude checks] Days 1–3: `pnpm wf:links --live --external`, redirect chains.
- [ ] [Person] Search Console coverage; leads arriving; analytics sane.
- [ ] [Claude] After-launch items: long titles/descriptions, A5, srcset on uploaded images (SESSION-NOTES), style guide rows Q/R.

## Known issues

| Issue | When | Owner |
| --- | --- | --- |
| B1–B10 above | before launch | as listed |
| A1–A4 accessibility | before launch (Claude) | Claude |
| P1 lazy hero images (LCP 9–10 s on phones) | before launch | Claude |
| OG images | before launch | Claude + Person |
| ED/hair products (AH): review meta descriptions, missing Sildenafil Capsule image | before launch if the ED redirects point at them | Client |
| A5, long titles/descriptions, uploaded images without srcset | after launch | Claude |
