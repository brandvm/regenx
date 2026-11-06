# Optimization checklists

Tags: **[Claude]** Claude does it · **[Claude checks]** Claude verifies and
reports · **[Person]** a person does it; Claude may track it, never claim it.
Record progress with `pnpm progress tick "<checklist>" "<item>" --plan optimization`.

## Baseline

- [Claude checks] Mobile and desktop PageSpeed scores, LCP, CLS and TBT recorded (median of three runs) for the main pages.
- [Claude checks] `pnpm wf:a11y` and `pnpm wf:seo` run; counts recorded.
- [Person] Targets agreed with the client and set on the plan.

## Fixes

- [Claude] Largest images compressed and sized to their slots (webp or avif), with width and height set.
- [Claude] Fonts: only the weights in use, preloaded, `font-display: swap`.
- [Claude] Third-party scripts deferred or loaded on interaction; unused ones removed with the person's OK.
- [Claude] Layout shift fixed where elements move after load (reserved space for media and embeds).
- [Claude] Interactions and animations reviewed for main-thread cost; heavy ones simplified.
- [Claude] Accessibility errors fixed, most serious first.
- [Claude checks] Each fix released and measured on the live site.

## Before and after

- [Claude] Report drafted: the baseline, each fix, the numbers after, against the targets.
- [Person] Report reviewed and sent; the plan finished when the targets are met.
