---
name: webflow-maintenance
description: Run a client's care plan on a live Webflow site: requests and small changes, a monthly health check (links, forms, speed, accessibility, the code release), updates, and the monthly note to the client. Use when a client has a Maintenance plan in Bench (or docs/handoff/progress.json), for the monthly health check, or when handling a client's change request on a site built with wf-template.
---

# Webflow maintenance: requests → monthly health check → note

A recurring plan with a cycle day. Requests live in the progress file's
`todos` (Bench shows them as Requests); the health check is in
[checklists.md](checklists.md). Tick it with
`pnpm progress tick "<checklist>" "<item>" --plan maintenance`.

The standing rules of `webflow-build` apply. Code changes go through the
normal build session and a code release (Release in Bench); Webflow content
and settings changes are the person's to publish.

Each cycle:

1. Work the open requests, oldest first; say which need the person.
2. Run the **Monthly health check**.
3. Draft the **Monthly note** for the person to send.
