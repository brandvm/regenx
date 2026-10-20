---
name: webflow-launch
description: Take a finished Webflow build live and through its first month: pre-launch QA (content, function, devices, accessibility, speed, SEO and tracking), launch day (publish, release, redirects, noindex off), handoff to the client and the 30-day follow-up. Use when a Webflow site built with wf-template is signed off and heading for launch, on launch day, when handing the site to the client, or for after-launch checks.
---

# Webflow launch: signed-off build → live site → first 30 days

Starts where the `webflow-build` skill's **Build handoff** ends: every page
complete on staging and signed off against the design. The standing rules
of `webflow-build` still apply (no commit, push, publish to a custom domain,
release or DNS change without an explicit OK; no credentials in chat).

Tags: **[Claude]** Claude does it · **[Claude checks]** Claude verifies and
reports · **[Person]** a person does it; Claude may track it, never claim it.
Commands are the `webflow-build` check scripts (`pnpm wf:*`, from the repo;
add `--live` to check what visitors get). Where a list names another skill
(`webflow-performance-optimizer`, `asset-audit`, `safe-publish`), use it if
the session has it; otherwise do the check by hand and say so.

How to run it:
1. Copy the lists below into the project's `docs/handoff/LAUNCH.md` (or the
   agency's tracker) and tick items there, with the date and who did it.
2. Work top to bottom; report each section's result before moving on.
3. Anything that fails goes into the known issues list as "fix before
   launch" or "fix after launch", with an owner.
4. The `webflow-build` check scripts still work against the live domain:
   pass `--live`, and point `stagingUrl` at the domain when checking it.

## Pre-launch QA

Content
- [Claude checks] No placeholder text or `#` links (`pnpm wf:links`, which
  also flags lorem ipsum); stand-in images checked against the known issues.
- [Person] Proofread every page.
- [Claude checks] Contact data: phones as `tel:` links, addresses,
  emails, hours; [Person] confirms they're correct.
- [Claude checks] Legal pages present and linked in the footer; copyright
  year and social links.

Function
- [Person] Submit every form once: it arrives in the right inbox or CRM,
  the confirmation shows, the auto-reply sends. (Claude can't pass
  spam protection; headless browsers get blocked by it.)
- [Claude checks] All links and buttons work (`pnpm wf:links --external`;
  confirm external failures by hand, some sites block bots).
- [Claude checks] 404 page, loading, empty, success and error states.
- [Claude checks] Search, filters, sorting and pagination, if any.
- [Person] Payments: a test purchase and a refund, if any.

Devices, accessibility, speed
- [Person] Real devices: iPhone Safari, Android Chrome; desktop Chrome,
  Safari, Firefox, Edge.
- [Claude checks] Automated accessibility scan on every page
  (`pnpm wf:a11y --all-widths`, no serious or critical failures), keyboard-only walkthrough of every page (focus visible, order, menus,
  dialogs, Escape); [Person] screen reader spot check. Target: WCAG 2.2 AA.
- [Claude checks] Performance on a phone profile: CLS < 0.1, INP < 200 ms,
  LCP < 2.5 s as targets (`webflow-performance-optimizer`); note what the
  design trades off.

SEO and tracking
- [Claude checks] Titles, meta descriptions, one H1 per page, alt text
  (`asset-audit`), OG images, favicon, schema where planned.
- [Claude checks] Canonicals point to the live domain (after the domain is
  attached).
- [Person] GA4 and conversions fire (real-time view); nothing tracks
  before cookie consent where consent is required. [Claude checks] the tags
  load only after consent in the page's network requests.

## Launch day

- [Person] Content freeze agreed; go-live approval and date from the
  client.
- [Person] DNS: lower the TTL a day ahead; keep the email records (MX,
  SPF, DKIM). Claude doesn't change DNS or registrar settings.
- [Claude] With an explicit OK: publish to the live domain (`safe-publish`
  if available: show what changed, confirm, publish); cut the repo release
  and set `RELEASE` in the head snippet (README › Release).
- [Claude checks] SSL works; www and https redirects go to the canonical
  host.
- [Claude] Remove noindex and the staging password; robots.txt allows
  indexing.
- [Claude] Save the visual baselines of the live site (`pnpm wf:baseline
  save --live`, every page in `pages`) and commit them.
- [Claude] Apply the 301 redirects; [Claude checks] the top old URLs
  redirect correctly.
- [Claude checks] `sitemap.xml` exists (Site settings › SEO ›
  Auto-generate sitemap) and does **not** list `/design/style-guide` or
  `/design/media`: exclude both through the sitemap tool once the site
  plan is on (it answers 403 before that).
- [Person] Submit sitemap.xml in Search Console.
- [Person] Submit a form on the live site and see the visit in analytics.

## Handoff to client (go-live approved)

All [Person], Claude can prepare the documents:
- Live site; ownership transfer (Webflow site, hosting billing, domain,
  design files, font and image licences).
- CMS training (recorded) and training notes ([Claude] drafts them from
  the CMS notes).
- Analytics, Tag Manager and Search Console access.
- Credentials returned; agency access removed or kept under a support
  agreement.
- Support terms and the first improvements roadmap.

## After launch (first 30 days)

- [Claude checks] Days 1 to 3: crawl for 404s and redirect chains
  (`pnpm wf:links --live --external`); [Person] checks Search Console coverage.
- [Person] Week 1: leads arriving, analytics numbers look right.
- [Person] Weeks 2 to 4: indexing and traffic against the baseline.
- [Claude] Fix the after-launch items from the known issues list.
- [Person] 30-day check-in, retro, testimonial or case study.
- [Claude] Before every later release: `pnpm wf:baseline compare --live`
  after publishing to staging; every change is expected or fixed.
- [Claude] Offer the project's new `template-candidate` GOTCHAS to the
  template (webflow-build › rules.md › Contributing); the template collects them with
  `pnpm harvest`.
