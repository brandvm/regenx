# Maintenance checklists

Tags: **[Claude]** Claude does it · **[Claude checks]** Claude verifies and
reports · **[Person]** a person does it; Claude may track it, never claim it.
Record progress with `pnpm progress tick "<checklist>" "<item>" --plan maintenance`.

## Monthly health check

- [Claude checks] `pnpm wf:links` on the live site: no broken links.
- [Claude checks] Every form submits and the notification arrives (test entry marked as a test).
- [Claude checks] `pnpm wf:a11y` on the live site: no new errors since last month.
- [Claude checks] Mobile speed within 5 points of last month's (PageSpeed Insights).
- [Claude checks] The live site loads the released code version (RELEASE matches the newest tag that's meant to be live).
- [Claude checks] No console errors on the main pages at Desktop and Mobile.
- [Claude checks] SSL valid for more than 30 days; the domain renews in time.
- [Person] Webflow plan, CMS and form limits not close to running out.

## Updates

- [Claude] Template tooling updated (`pnpm update-skills`) if a new version is out; changes noted.
- [Claude checks] Third-party scripts (analytics, chat, embeds) still load and still needed.
- [Person] Backups: a Webflow site backup made before any large change this month.

## Monthly note

- [Claude] Note drafted: requests done, what the health check found and fixed, anything the client should decide.
- [Person] Note reviewed and sent to the client.
