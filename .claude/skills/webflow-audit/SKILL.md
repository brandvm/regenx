---
name: webflow-audit
description: Work on a Webflow site that is already live, without breaking it: a read-only audit first (visual baselines, speed as the median of several runs, accessibility, links, SEO and schema, CMS, custom code and interactions), a status tracker from the client's own checklist, a rollback point, then small batches that go to staging, are verified, and reach the live domain only when the person types "publish". Use when auditing or improving an existing live Webflow site (speed, SEO, accessibility, cleanup), moving a live site's custom code onto wf-template, or doing a one-off fix on a live site (a broken link, a carousel, a form). For a new site, use webflow-build.
---

# Webflow audit: a live site, changed in small verified steps

A live site has visitors, rankings and other people's unpublished work in
it. Nothing here is built fresh: every change starts from a measurement,
goes out alone, and can be taken back.

The shared rules apply (`webflow-build` › rules.md: no commit, push,
release or DNS change without an explicit OK; no credentials in chat;
Designer first; scripts live in the repo). Its check scripts (`pnpm wf:*`) do the
measuring; point `stagingUrl` in `webflow-build.config.json` at the
staging domain, and use `--live` for what visitors get.

Tags: **[Claude]** Claude does it · **[Claude checks]** Claude verifies and
reports · **[Person]** a person does it; Claude may track it, never claim it.

Two rules above all the others:

- **A publish is site-wide.** Publishing sends out everything pending on
  the site, including other people's unfinished edits. Never publish to
  the live domain until the person has typed the word **publish** for that
  batch. One "publish" covers one batch, never the next.
- **Read before you write.** The audit writes nothing to Webflow.

## The documents

In the repo's `docs/handoff/`, kept current as the work goes:

| File | Holds |
| --- | --- |
| `AUDIT.md` | The audit report: what was measured, with numbers and dates |
| `STATUS.md` | The tracker: every request, in the client's own wording, with its state |
| `DECISIONS.md` | Each decision, who made it, when, and what it means |
| `ROLLBACK.md` | The rollback point and, word for word, all custom code as it was |
| `MANUAL-TODO.md` | Steps only a person can do in the Designer |

## 1. Read-only audit

Nothing is written to Webflow in this step. Run it in this order: the
first two are the ones that get skipped and can't be made up later,
because they describe the site *before* any change.

- [Claude] **Visual baselines, with the noise floor.**
  `pnpm wf:baseline save --live` on every key page at three widths, then
  `compare` straight away with no change made. What differs between two
  untouched runs (video frames, sliders, lazy images) is the noise floor;
  write it down per page. Keep baseline images out of git (they are large):
  `.webflow-build/` is ignored for this reason.
- [Claude] **Heading outline** of every key page (`pnpm wf:outline --live`),
  saved in `AUDIT.md`.
- [Claude] **Speed:** `pnpm wf:perf --live`, mobile and desktop, the median
  of 5 runs with its range, for every key page (not only Home).
- [Claude] **Accessibility:** `pnpm wf:a11y --live --all-widths`.
- [Claude] **Links and redirects:** `pnpm wf:links --live --external`; the
  redirect list from Site settings; the sitemap.
- [Claude] **Published HTML:** `pnpm wf:html --live` (default field names,
  links standing in for buttons, classes no stylesheet defines).
- [Claude] **SEO and schema:** per page, the title, description, canonical,
  Open Graph image, indexing state and any JSON-LD (does it parse; does a
  quote in a CMS field break it).
- [Claude] **Inventory**, read through the connector: pages and folders;
  CMS collections with field types and item counts; components; fonts and
  how they load; every piece of custom code (site head and footer, each
  page's, every Embed) and every third-party script, with what each is
  for; interactions, and which pages depend on them; forms and where they
  submit.
- [Claude] **Report** in `AUDIT.md`: the findings as short points with
  numbers, each marked *measured* or *read from the code*, sorted by what
  it would gain and what it could break. A claim that was not measured
  says so. *Gate:* the person has the report.

## 2. Tracker, on day one

- [Claude] Write `STATUS.md` from the brief **and the client's own
  checklist, in its own wording**, one row per request: request, state
  (not started, in progress, on staging, live, dropped and why), batch,
  date. On earlier sites requests were lost because the tracker came late
  and was written in different words from the client's list.
- [Person] Confirms nothing is missing. *Gate.*
- [Claude] Every later report ticks the tracker and gives the count:
  "9 of 14 live, 2 on staging, 3 waiting on a decision".

## 3. Decisions, one at a time

- [Claude] Ask one decision at a time, each with what it means in plain
  words: what changes for visitors, what it costs, what could go wrong,
  and the recommendation.
- [Claude] Log each in `DECISIONS.md` when it is made.
- Only **new client-facing content** (copy, images, a changed layout) goes
  to the client for approval. Plumbing (how a script loads, where CSS
  lives) is the team's call.

## 4. Rollback point, before the first write

- [Claude] A git tag on the commit that matches what is live.
- [Claude] `ROLLBACK.md` holds, word for word, every piece of custom code
  as it is now: site head and footer code, each page's code, each Embed.
- [Person] A Webflow backup (Site settings › Backups), named with the
  date; and branch protection on the repo's default branch.
- [Claude checks] The rollback steps are written out and each one is
  possible: restore the code blocks, point the loader back at the old
  release, restore the backup. *Gate:* confirmed by the person.

## 5. Parity release (when the plumbing changes)

Moving a site onto the template changes how its code is delivered. That
change goes out first, on its own, with **nothing a visitor can see**.

- [Claude] Port the existing behaviour as it is. No rewrites or
  improvements in this step: those are later batches, each measured.
- [Claude checks] Parity on every key page at three widths: computed
  styles and geometry against the baselines (`pnpm wf:baseline compare`,
  differences inside the noise floor only).
- [Claude checks] Load-time parity too (`pnpm wf:film`): a settled page can
  match while the first second jumps. Compare the load, not only the end.
- Then through the batch steps below, like any other batch.

## 6. Batches, lowest risk first

Order the work so the safest, most certain gains go first, and so each
batch can be judged on its own. One batch = one change a person could
describe in a sentence. For each:

1. **Prepare** in the repo (`pnpm check && pnpm build && pnpm test`); say
   what will change in Webflow and what a visitor will notice.
2. **Apply** in Webflow after the go-ahead. Then say: "reload the
   Designer", and what is not published.
3. **Publish to staging only.**
4. **Verify on staging:** the batch's own check, plus `baseline compare`,
   `html` and the console on the pages it touches, at three widths.
5. **Ask what else would go live.** [Person] checks the site for other
   pending changes (their own or a colleague's). Claude can't see who
   changed what; say so and wait.
6. **The person types "publish".** Then publish to the live domain.
7. **Verify production** with `--live`: the same checks, and the batch's
   number (speed, errors, links) measured again.
8. **Tick the tracker** and the client's checklist; note the result in
   `AUDIT.md` next to the finding.

- **CMS item edits** (a typo, a new item) may go straight live: publishing
  an item doesn't publish the site. Page and site changes always go
  through the eight steps.
- Webflow limits how often a site can be published: group the checks so a
  batch needs one staging publish and one live publish.

## 7. Keep only measured wins

- [Claude checks] Before and after are both medians of the same number of
  runs. A difference inside the range is noise.
- [Claude] A change that doesn't move its number, or moves another one the
  wrong way, is reverted, and the tracker says so. No change stays in on
  the strength of what it should have done.

## 8. Close

- [Claude] Before/after report: each request from the tracker with its
  result in numbers; what was dropped and why; what remains.
- [Claude] `ROLLBACK.md` updated to the new state; the old tag kept.
- [Claude] Lessons offered to the template (`webflow-build` › rules.md ›
  Contributing).

## Small jobs (one fix on a live site)

A broken link, a carousel that stops, a form that doesn't send. The same
care, in five steps:

1. **Reproduce** it, on the live site, and say exactly when it happens
   (page, width, browser, steps).
2. **Fix** it in the smallest place it can be fixed. Read
   `GOTCHAS.md` and the lessons first: it has usually happened before.
3. **Regression test** where the repo has tests for that area, so it
   can't come back unnoticed.
4. **Staging,** on desktop and on a phone width; `pnpm wf:html` and the
   console on the page.
5. **Stop.** Report what was wrong, what changed and how it was checked,
   and wait for approval before any push, tag or publish. Keep the previous
   release tag so the loader can be pointed back at it. A live publish
   still needs the word "publish", after the person has checked what else
   is pending.
