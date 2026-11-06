// FAQPage schema: built from the FAQ accordions on the page, so it
// stays in step with the FAQ items in the CMS. Covers the FAQ Category
// template (/faqs/*) and the S | FAQs section on the service pages; one
// FAQPage per page, and none when the page already has one.

const ITEMS = '.faqs-list .acc, [data-wf--s-faqs--variant] .acc';

const text = (el: Element | null) =>
  Array.from(el?.querySelectorAll('p, li') ?? [])
    .map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ') || (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

export function initFaqSchema() {
  const existing = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .some((s) => /"FAQPage"/.test(s.textContent ?? ''));
  if (existing) return;

  const seen = new Set<string>();
  const mainEntity = Array.from(document.querySelectorAll(ITEMS))
    .map((acc) => ({
      name: (acc.querySelector('.acc-toggle h3, .acc-toggle h2, .acc-toggle h4')?.textContent ?? '').trim(),
      answer: text(acc.querySelector('.acc-content')),
    }))
    .filter((q) => q.name && q.answer && !seen.has(q.name) && seen.add(q.name))
    .map((q) => ({
      '@type': 'Question',
      name: q.name,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    }));
  if (!mainEntity.length) return;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity });
  document.head.appendChild(script);
}
