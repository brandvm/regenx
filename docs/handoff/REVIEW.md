# Review phase

Started when the build handoff is done (the webflow-build skill's
`checklists.md` › Build handoff): every page is built and checked, and from
here work is driven by review feedback until launch (the `webflow-launch`
skill). Agents read this file after `HANDOFF.md` once it has a status line.

## Status

<Date> — dev phase closed at commit `<sha>`. Staging:
`https://<slug>.webflow.io`. <What is waiting on whom.>

## What is built

One row per page or template, so a reviewer knows what to look at and what
is a known gap.

| Page | URL | Notes |
| --- | --- | --- |
| Home | `/` | <sections, behaviour worth trying (hover, scroll, video)> |
| <Page> | `/<page>` | |
| <Collection> template | `/<collection>/<slug>` | CMS-bound; <which fields drive what> |
| Legal | `/privacy`, `/terms` | <placeholder copy? noindex until it is in> |
| 404 | `/404` | |
| Style guide, media | `/design/style-guide`, `/design/media` | noindex; never linked |

SEO: <titles, descriptions and share images set where; JSON-LD on which
pages (`SEO-PLAN.md`)>.

## How review works

- Feedback comes in rounds. Each round: Claude lists every item in the
  reviewer's own words, fixes them (Designer first; repo CSS only with a
  `repo-css:` tag), publishes to staging, checks at the three widths and
  asks before every commit.
- Anything the API can't do goes in `MANUAL-TODO.md`. Next letter: **<A>**.
  Update it here each time one is used.
- Every surprise goes in `GOTCHAS.md`.
- Staging changes on every push. When reviewers need a build that doesn't
  move under them, cut a tag and set `RELEASE` (README › Release).
- A change that alters the approved design goes in `BUILD-NOTES.md` ›
  Changes log, with who approved it.

## Round 1 (<date>, <who>)

| # | Item | Where | Status |
| --- | --- | --- | --- |
| 1 | <the request, in the reviewer's words> | <Webflow: page › element / class, or repo file> | <done, on staging (sha) · waiting for commit OK · waiting on …> |

<!-- Copy the table for each round; follow-ups from the same reviewer go
under their round as "Round N follow-ups". -->

## Open design decisions

| Item | Now | Options |
| --- | --- | --- |
| | | |

## Before launch

What has to happen between the last round and the `webflow-launch`
skill's Pre-launch QA. Each item has an owner.

- [ ] Client content still missing: <images, copy, legal pages>; every
      placeholder is in `BUILD-NOTES.md` › Known issues.
- [ ] Every `MANUAL-TODO.md` row done, and no `data-manual-todo` note left
      on the style guide page.
- [ ] Noindex off the pages that only had it while their copy was missing.
- [ ] Site plan bought (sitemap and search settings need it).
- [ ] SEO plan done (`SEO-PLAN.md`): titles, descriptions, share images,
      JSON-LD; `pnpm wf:seo` clean.
- [ ] `pnpm wf:overflow` clean on every page template.
- [ ] Custom domain attached; a release tagged from a commit whose CI
      passed and set as `RELEASE` before the domain goes live.
- [ ] Final pass on the release build: `wf:pass`, `wf:anchors`,
      `wf:outline`, `wf:transitions`, `wf:film` at the three widths.
