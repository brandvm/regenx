# SEO plan: metadata, Open Graph, canonical and schema

Written before launch (the `webflow-launch` skill › SEO plan) and kept
current until every row is done. The rule is the same as for CSS:
whatever Webflow does natively stays in Webflow (page settings, CMS
bindings); only what it can't do goes into custom code, and that code is
kept in this repo as the source of truth.

## Status

<Date> — <what is done, what is next, what waits on the client.>

## What staging outputs today

Read from the published HTML (`pnpm wf:seo`, or `curl` a page), not from
the page settings.

| Tag | Webflow does it? | Now |
| --- | --- | --- |
| `<title>`, meta description | Yes, page settings (templates: bound fields) | |
| `og:title`, `og:description`, `twitter:*` | Yes, page settings ("same as SEO") | |
| `og:image` | Yes, page settings (upload, or bind an image field on templates) | |
| `<link rel="canonical">` | Yes, once Site settings › SEO › Global canonical URL is set | Not on staging |
| `og:site_name`, `og:locale`, `twitter:site` | No: head code in `loader.html` | |
| JSON-LD schema | No: page settings › custom code, from `docs/seo/schema/` | |
| `lang` | Yes, from the primary locale | |
| `sitemap.xml`, `robots.txt` | Yes, Site settings › SEO (sitemap controls need a site plan) | |

## Steps

1. **Inventory** (read-only): every static page and template with its
   title (length), description (length), OG fields, noindex, and what is
   missing. Include utility pages (404, legal, style guide, media).
2. **Titles and descriptions** (Webflow, API): draft the missing or weak
   ones within 50–60 / 140–160 characters → the client approves → write
   them. Templates bind a field (Meta Title, Meta Description), never a
   long body field.
3. **Open Graph** (Webflow): "same as SEO" on every page; a default
   1200×630 share image for static pages; template images bound to an
   image field.
4. **Canonical** (Webflow, at launch): Site settings › SEO › Global
   canonical URL = the production domain. Not on staging: a canonical to a
   domain the site isn't served from yet is wrong.
5. **Site-wide head tags** Webflow doesn't write (`og:site_name`,
   `og:locale`, `twitter:site` when there is a handle): added to the head
   snippet in `loader.html`, then re-pasted and published (snippets are
   not versioned).
6. **Schema** (JSON-LD): one file per page in `docs/seo/schema/`
   (`home.jsonld`, `about.jsonld`…), and `templates.md` for CMS templates
   with every `{Field}` the Designer inserts with "+ Add field". The file
   is the source of truth; the page's head code is a copy. Table below.
7. **Verify:** `pnpm wf:seo` on staging (every page in the sitemap), then
   Google's Rich Results Test on one page of each type. At launch,
   `pnpm wf:seo --live --canonical`.

## Schema per page

| Page(s) | Types | Key data |
| --- | --- | --- |
| Home | `Organization` (or `LocalBusiness` / `ProfessionalService` with an address), `WebSite` | name, logo, url, address, phone, email, hours, sameAs (socials) |
| About | `AboutPage`, referring to the Organization `@id` | |
| Contact | `ContactPage` + `ContactPoint` | phone, email, hours |
| <Collection> template | <`Service`, `BlogPosting`, `Article`, `Place`…>, `BreadcrumbList` | <fields bound> |
| Listing pages | `CollectionPage`, `BreadcrumbList` | |
| Legal, 404 | none (`seo.noSchemaOk` in the config) | |

Rules that cost time before:
- Every item points at the one Organization by `@id`
  (`https://<domain>/#organization`), written out with the production
  domain from the start.
- Webflow inserts CMS values into custom code raw: a line break or `"` in
  a bound field breaks the JSON, and an apostrophe comes out as `&#39;`
  (`wf:seo` fails on both). Bind single-line fields only, and check every
  CMS page after a schema change, not a sample.
- No `Review` or `AggregateRating` about the business itself (not
  eligible); `FAQPage` only where the content really is a FAQ.

## Needed from the client

- [ ] The official name, address, phone, email and hours for the schema.
- [ ] Social profile URLs (`sameAs`) and the X handle, if any.
- [ ] The production domain, www or apex, for canonicals.
- [ ] Approval of the default share image and the drafted meta copy.
