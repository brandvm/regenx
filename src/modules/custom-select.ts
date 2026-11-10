// ============================================
// CustomSelect — styled arrow and options list for form selects
//   Every select.w-select (the Location/State field, the Date of Birth
//   Month / Day / Year built by date-select.ts) gets a select-only combobox
//   (WAI-ARIA APG pattern) and a listbox of its options. Opt out with
//   data-native-select on the Select.
//   The native select stays in the form, under the combobox: Webflow still
//   submits it, form-steps still validates it, and its validation bubble
//   points at the right box. Focusing it (label click, reportValidity) moves
//   focus to the combobox. Option changes (date-select's day list) and
//   value changes made with a change event re-render the box.
//   Keys: Up/Down/Home/End/PageUp/PageDown, Enter/Space, Esc, Tab, typing.
// ============================================
const SELECTOR = 'select.w-select:not([multiple]):not([data-native-select])';
let uid = 0;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function initOne(select: HTMLSelectElement) {
  if (select.dataset.customSelect !== undefined) return;
  select.dataset.customSelect = '';
  const id = `rx-select-${++uid}`;

  const wrap = el('div', 'rx-select');
  const combo = el('div', `${select.className.replace(/\bw-select\b/, '').trim()} rx-select-button`);
  const value = el('span', 'rx-select-value');
  const arrow = el('i', 'rx-select-arrow ri-arrow-down-s-line');
  const list = el('ul', 'rx-select-list');

  combo.id = `${id}-combo`;
  combo.tabIndex = 0;
  combo.setAttribute('role', 'combobox');
  combo.setAttribute('aria-haspopup', 'listbox');
  combo.setAttribute('aria-expanded', 'false');
  combo.setAttribute('aria-controls', `${id}-list`);
  arrow.setAttribute('aria-hidden', 'true');
  combo.append(value, arrow);

  list.id = `${id}-list`;
  list.tabIndex = -1;
  list.setAttribute('role', 'listbox');
  list.setAttribute('data-lenis-prevent', '');

  // Name: the select's own aria-label (Month / Day / Year), else its label.
  const label = select.id ? document.querySelector<HTMLLabelElement>(`label[for="${select.id}"]`) : null;
  // The list gets the same name directly: naming it after the combobox
  // would read the combobox's value, not its label.
  if (select.getAttribute('aria-label')) {
    combo.setAttribute('aria-label', select.getAttribute('aria-label')!);
    list.setAttribute('aria-label', select.getAttribute('aria-label')!);
  } else if (label) {
    if (!label.id) label.id = `${id}-label`;
    combo.setAttribute('aria-labelledby', label.id);
    list.setAttribute('aria-labelledby', label.id);
  }

  select.before(wrap);
  wrap.append(select, combo, list);
  select.classList.add('rx-select-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  let options: HTMLOptionElement[] = [];
  let items: HTMLLIElement[] = [];
  let active = -1;
  let open = false;

  function render() {
    options = Array.from(select.options).filter((o) => o.value !== '' && !o.disabled);
    list.textContent = '';
    items = options.map((o, i) => {
      const item = el('li', 'rx-select-option');
      item.id = `${id}-opt-${i}`;
      item.setAttribute('role', 'option');
      const text = el('span', 'rx-select-option-text');
      text.textContent = o.text.trim();
      const check = el('i', 'rx-select-check ri-check-line');
      check.setAttribute('aria-hidden', 'true');
      item.append(text, check);
      list.append(item);
      return item;
    });
    sync();
  }

  function sync() {
    const chosen = select.selectedOptions[0];
    const empty = !chosen || chosen.value === '';
    const placeholder = Array.from(select.options).find((o) => o.value === '');
    value.textContent = (empty ? placeholder?.text : chosen.text)?.trim() || ' ';
    value.classList.toggle('is-placeholder', empty);
    items.forEach((item, i) => item.setAttribute('aria-selected', String(options[i] === chosen)));
    combo.setAttribute('aria-required', String(select.required));
    combo.toggleAttribute('aria-disabled', select.disabled);
  }

  function setActive(i: number) {
    if (!items.length) return;
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((item, n) => item.classList.toggle('is-active', n === active));
    combo.setAttribute('aria-activedescendant', items[active].id);
    // Keep the active option in view without scrolling the page.
    const item = items[active];
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
    }
  }

  function show() {
    if (open || select.disabled) return;
    open = true;
    wrap.classList.add('is-open');
    combo.setAttribute('aria-expanded', 'true');
    // Open upwards when there isn't room below the field.
    const box = combo.getBoundingClientRect();
    const below = window.innerHeight - box.bottom;
    wrap.classList.toggle('is-up', below < Math.min(list.scrollHeight, 240) + 16 && box.top > below);
    const current = options.indexOf(select.selectedOptions[0]);
    setActive(current >= 0 ? current : 0);
  }

  function hide() {
    if (!open) return;
    open = false;
    wrap.classList.remove('is-open');
    combo.setAttribute('aria-expanded', 'false');
    combo.removeAttribute('aria-activedescendant');
  }

  function choose(i: number) {
    const o = options[i];
    if (!o) return;
    if (select.value !== o.value) {
      select.value = o.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sync();
  }

  // Typing jumps to the next option starting with the typed text.
  let typed = '';
  let typedAt = 0;
  function typeahead(char: string) {
    const now = Date.now();
    typed = now - typedAt > 600 ? char : typed + char;
    typedAt = now;
    const query = typed.toLowerCase();
    const repeat = query.split('').every((c) => c === query[0]);
    // One letter (or the same letter again) cycles from the next option;
    // a longer word keeps the current option if it still matches.
    const current = open ? active : options.indexOf(select.selectedOptions[0]);
    const from = repeat ? current + 1 : Math.max(current, 0);
    const order = items.map((_, n) => (from + n + items.length) % items.length);
    const match = order.find((n) => options[n].text.trim().toLowerCase().startsWith(repeat ? query[0] : query))
      ?? order.find((n) => options[n].text.trim().toLowerCase().startsWith(query));
    if (match === undefined) return;
    if (open) setActive(match);
    else choose(match);
  }

  combo.addEventListener('click', () => (open ? hide() : show()));
  combo.addEventListener('keydown', (e) => {
    const page = Math.max(1, Math.floor(list.clientHeight / (items[0]?.offsetHeight || 32)) - 1);
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        if (!open || e.altKey) { open && e.key === 'ArrowUp' ? (choose(active), hide()) : show(); return; }
        setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
        return;
      case 'Home':
      case 'End':
        e.preventDefault();
        show();
        setActive(e.key === 'Home' ? 0 : items.length - 1);
        return;
      case 'PageDown':
      case 'PageUp':
        if (!open) return;
        e.preventDefault();
        setActive(active + (e.key === 'PageDown' ? page : -page));
        return;
      case 'Enter':
      case ' ':
        if (e.key === ' ' && typed && Date.now() - typedAt < 600) { e.preventDefault(); typeahead(' '); return; }
        e.preventDefault();
        if (open) { choose(active); hide(); } else show();
        return;
      case 'Escape':
        if (open) { e.preventDefault(); hide(); }
        return;
      case 'Tab':
        if (open) { choose(active); hide(); }
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          typeahead(e.key);
        }
    }
  });
  combo.addEventListener('blur', () => setTimeout(() => {
    if (!wrap.contains(document.activeElement)) hide();
  }, 0));

  list.addEventListener('pointerdown', (e) => e.preventDefault()); // keep focus on the combobox
  list.addEventListener('pointermove', (e) => {
    const n = items.indexOf((e.target as Element).closest('.rx-select-option') as HTMLLIElement);
    if (n >= 0 && n !== active) setActive(n);
  });
  list.addEventListener('click', (e) => {
    const n = items.indexOf((e.target as Element).closest('.rx-select-option') as HTMLLIElement);
    if (n < 0) return;
    choose(n);
    hide();
    combo.focus();
  });
  document.addEventListener('pointerdown', (e) => {
    if (open && !wrap.contains(e.target as Node)) hide();
  });

  select.addEventListener('focus', () => combo.focus());
  select.addEventListener('change', sync);
  select.form?.addEventListener('reset', () => setTimeout(sync, 0));
  new MutationObserver(render).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['required', 'disabled'] });

  render();
}

export function initCustomSelect() {
  document.querySelectorAll<HTMLSelectElement>(SELECTOR).forEach(initOne);
  // Selects added later (date-select builds Month / Day / Year).
  document.querySelectorAll('form').forEach((form) => {
    new MutationObserver(() => form.querySelectorAll<HTMLSelectElement>(SELECTOR).forEach(initOne))
      .observe(form, { childList: true, subtree: true });
  });
}
