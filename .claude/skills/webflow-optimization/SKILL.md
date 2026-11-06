---
name: webflow-optimization
description: Run an optimization push on a live Webflow site with targets: the baseline (speed, layout shift, accessibility, SEO), fixes in order of impact, and the before/after report. Use when a client has an Optimization plan in Bench (or docs/handoff/progress.json) or asks for a site to be made faster, steadier or more accessible, on a site built with wf-template.
---

# Webflow optimization: baseline → fixes → before/after

A plan with an end: it finishes when the targets in the progress file's plan
(`targets`, e.g. `{"lcp": 2.5, "cls": 0.1, "mobile": 90}`) are met, or when
the person stops it. The checklists are in [checklists.md](checklists.md);
tick them with `pnpm progress tick "<checklist>" "<item>" --plan optimization`.

The standing rules of `webflow-build` apply. Measure on the live site, the
same way each time (PageSpeed Insights, mobile, three runs, the median).
