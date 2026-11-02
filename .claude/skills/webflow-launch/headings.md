# Heading plan: rules for H1–H6

Read before the heading step of the SEO plan (`SKILL.md` › SEO plan).
`pnpm wf:outline /path` prints each page's outline as screen readers read
it; `pnpm wf:seo` fails any indexable page without exactly one `<h1>`. This
file says what the outline *should* be.

## Why it matters

- **Screen readers:** most screen reader users move through long pages by
  heading (WebAIM survey). WCAG 1.3.1 (A) needs text that looks like a
  heading to be one; 2.4.6 (AA) needs headings to describe their topic.
- **HTML:** rank alone sets the hierarchy. The outline algorithm is gone
  from the spec: an `<h1>` inside a `<section>` is still an H1.
- **Google:** builds result titles partly from the main visible title and
  the H1. Tag order and count don't move rankings; the *wording* of the H1
  and the main H2s does. Correct tags are accessibility and clarity work.

So: tags are fixed by structure, wording by what the page is about. A
change of tag is the team's call; a change of wording is copy and goes to
the client.

## The H1

1. Exactly one per page: the main visible title, usually the hero title.
   Never the logo, the nav or a hidden element when a visible title exists.
2. It says what the page is about, in the words a buyer searches. A
   tagline that names no service is a weak H1: keep it and propose better
   wording to the client.
3. Unique across the site, 70 characters or fewer, about the same topic as
   the `<title>` (the wording can differ).
4. CMS templates bind it to the item's name or title field.

## H2–H6

5. H2 for each main section, H3 for items inside it, H4 only inside an H3.
   Never skip a level going down; going back up to start a section is fine.
6. Pick the tag by structure, never by size: the look comes from the class.
7. Text that titles content beneath it is a heading: section titles, card
   titles with a description, FAQ questions, process steps, tab-panel
   titles.
8. Not headings: eyebrows, the line under an H1, stats and big numbers,
   buttons and links, tab and carousel controls, form labels, checklist
   items, bold lead-ins, testimonial quotes and names, logo-strip captions,
   nav labels, footer column titles, cookie banners and modals.
9. A big centred title that starts a visually separate block is an H2,
   even inside the same `<section>` as an earlier H2; its cards become H3s.
10. Global chrome (nav, mega-menu, footer, banner, popups) carries no
    headings, so every outline starts with the page's own H1.
11. A repeated component takes the same level everywhere (a footer CTA is
    usually an H2): fix it once in the component.
12. No bloat: many tiny repeated feature labels stay bold text.
13. Unique on the page, no trailing colon or period, one casing style,
    about 60 characters at most unless it is a question.

## Edge cases

- **Tabs:** buttons are not headings; each panel gets an H3 title.
- **Accordions and FAQs:** each question is an H3 (H2 when the FAQ is the
  page), wrapping the toggle button.
- **Sliders:** cloned slides for looping must not add duplicate headings;
  only the main hero slide's headline is the H1.
- **Responsive duplicates:** a desktop and a mobile copy of a block both in
  the DOM both carry their tags. Only one should be a heading.
- **Visually hidden headings:** only to label a section with no visible
  title; never the H1, never to add keywords.
- **Legal pages:** one H1 and an H2 per section.

## Applying it in Webflow

Select the heading › Settings panel › Heading Settings › H1–H6. A Div,
Text Block or Paragraph can't become a heading: drag a Heading next to it,
give it the same classes and text, delete the old one (record it in
`MANUAL-TODO.md` if the connector can't). Components update everywhere.
Rich Text headings are edited in the CMS item.

## Wording (only with the client's sign-off)

- Lead with the term buyers use, then the brand flavour.
- Sibling pages (industries, locations) carry a modifier, so they never
  own the main service page's term: one page per keyword.
- Phrase an H2 as a question only where the section answers that question.
- Keep the client's voice and claims; never invent services, places or
  numbers. Each proposed rewrite carries a one-line reason.
- Search volumes come from a keyword tool in the session (an Ahrefs or
  Semrush connector); without one, label keywords "unverified" and give no
  numbers.

Sources: [WebAIM survey](https://webaim.org/projects/screenreadersurvey10/),
[W3C WAI headings](https://www.w3.org/WAI/tutorials/page-structure/headings/),
[MDN heading elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements),
[Google title links](https://developers.google.com/search/docs/appearance/title-link),
[Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).
