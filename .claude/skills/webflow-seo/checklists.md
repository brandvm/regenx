# SEO plan checklists

Tags: **[Claude]** Claude does it · **[Claude checks]** Claude verifies and
reports · **[Person]** a person does it; Claude may track it, never claim it.
Record progress with `pnpm progress tick "<checklist>" "<item>" --plan seo`.

## Baseline (once, at the start)

- [Person] Search Console and the client's analytics shared with the agency.
- [Claude checks] Search Console has the live domain verified and the sitemap submitted.
- [Claude] Baseline recorded in the handoff notes: clicks, impressions, top queries and top pages for the last 3 months.
- [Claude checks] `pnpm wf:seo` and `pnpm wf:links` run on the live site; findings recorded.
- [Person] Target pages and queries for the plan agreed with the client.

## Every cycle

- [Claude checks] Every page has a unique title under 60 characters and a description under 160.
- [Claude checks] One H1 per page; headings follow the page's outline.
- [Claude checks] No broken internal links; redirects for anything moved or removed.
- [Claude checks] Images have alt text; large images are compressed (webp or avif).
- [Claude] Open Graph title, description and image set for the target pages.
- [Claude checks] Schema (Organization, Breadcrumbs, Article or Product) valid in the Rich Results Test.
- [Claude checks] The live site's sitemap lists every published page and nothing noindexed.

## Content and links

- [Person] New or updated content for the cycle's target pages approved.
- [Claude] Internal links from related pages to each target page.
- [Claude] CMS items' SEO fields (title, description, slug) filled for new items.

## Monthly report

- [Claude] Report drafted: what changed this cycle, the numbers against last cycle and the baseline, what's next.
- [Person] Report reviewed and sent to the client.
