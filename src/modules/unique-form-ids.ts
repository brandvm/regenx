// Unique form-control ids. A Radio or Checkbox inside a CMS Collection List
// publishes the same Designer id on every item (a category filter gets
// seven `id="radio"`), and the Designer can't bind an id to a CMS field.
// Duplicate ids break label association for assistive tech and fail HTML
// validation. This gives each duplicate a unique id from its label text and
// moves any `for` inside the same wrapper along with it. Nothing visible
// changes: style by class, never by these ids. Finsweet's list filter reads
// its fs-list-* attributes, not ids.
const CONTROLS = 'input[id], select[id], textarea[id]';

function slug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .slice(0, 40);
}

export function initUniqueFormIds() {
  const groups = new Map<string, HTMLElement[]>();
  document.querySelectorAll<HTMLElement>(CONTROLS).forEach((el) => {
    const list = groups.get(el.id) ?? [];
    list.push(el);
    groups.set(el.id, list);
  });
  if (![...groups.values()].some((els) => els.length > 1)) return;

  const taken = new Set(Array.from(document.querySelectorAll('[id]'), (el) => el.id));
  groups.forEach((els, id) => {
    if (els.length < 2) return;
    els.forEach((el, i) => {
      const wrap = el.closest('label, .w-radio, .w-checkbox') ?? el.parentElement;
      const text = wrap?.querySelector('.w-form-label')?.textContent ?? '';
      const base = `${id}-${slug(text) || i + 1}`;
      let next = base;
      for (let n = 2; taken.has(next); n++) next = `${base}-${n}`;
      taken.add(next);
      // Keep a `for` that pointed at the old id pointing at this control.
      wrap?.querySelectorAll(`[for="${CSS.escape(id)}"]`).forEach((label) => label.setAttribute('for', next));
      el.id = next;
    });
  });
}
