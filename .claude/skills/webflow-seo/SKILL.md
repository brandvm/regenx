---
name: webflow-seo
description: Run a client's SEO plan on a live Webflow site, month by month: the baseline, technical SEO, on-page work for the pages that matter, content and links, and the monthly report. Use when a client has an SEO plan in Bench (or docs/handoff/progress.json), for the monthly SEO cycle, or when asked for SEO work on a site built with wf-template.
---

# Webflow SEO plan: baseline → monthly cycle → report

A recurring plan: it has a cycle day, and each cycle ends with a report the
person sends to the client. The checklists are in
[checklists.md](checklists.md); tick them with
`pnpm progress tick "<checklist>" "<item>" --plan seo`.

The standing rules of `webflow-build` apply: no publish to a custom domain,
release or DNS change without an explicit OK, no credentials in chat.
Webflow settings (titles, descriptions, Open Graph, redirects) change in the
Designer or through Bench's page settings; say exactly what to set.

Each cycle:

1. Check the numbers against last cycle (Search Console, the analytics the
   client uses) and note what moved.
2. Work the **Every cycle** list, then the pages the plan targets this cycle.
3. Run `pnpm wf:seo` and `pnpm wf:links` on the live site; fix or record.
4. Draft the report (**Monthly report**) for the person to send.
