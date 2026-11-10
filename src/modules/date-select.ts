// ============================================
// DateSelect — Month / Day / Year dropdowns for a date text field
//   Webflow: add data-date-select to the Text Field (e.g. Date of Birth).
//   Optional: data-date-select-min-age / -max-age (years, default 18 / 100).
//   The field becomes a hidden input that still submits under its own name
//   as MM/DD/YYYY, so form notifications and integrations don't change.
//   Webflow's form JS posts every input keyed by data-name, and a later
//   input overwrites an earlier one with the same key: the selects share the
//   field's data-name and the hidden field sits after them, so only the
//   combined value is sent (no extra "Field N" entries).
//   Optional field: picking only part of a date makes all three required.
// ============================================
// Short names: the field is a ~250px grid cell beside Location/State.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (month: number, year: number) => new Date(year || 2000, month, 0).getDate();

function option(value: string, text: string) {
  const el = document.createElement('option');
  el.value = value;
  el.textContent = text;
  return el;
}

function initOne(field: HTMLInputElement) {
  if (field.dataset.dateSelectReady) return;
  field.dataset.dateSelectReady = '';

  const id = field.id || field.name;
  const key = field.dataset.name || field.name;
  const label = id ? document.querySelector<HTMLLabelElement>(`label[for="${id}"]`) : null;
  const now = new Date().getFullYear();
  const minAge = Number(field.dataset.dateSelectMinAge ?? 18);
  const maxAge = Number(field.dataset.dateSelectMaxAge ?? 100);
  const requiredAlways = field.required;

  const group = document.createElement('div');
  group.className = 'rx-date-select';
  group.setAttribute('role', 'group');

  function select(part: string, placeholder: string) {
    const el = document.createElement('select');
    el.className = `${field.className.replace(/\bw-input\b/, '').trim()} w-select rx-date-select-field`;
    el.id = `${id}-${part}`;
    el.dataset.name = key;
    el.setAttribute('aria-label', placeholder);
    el.required = requiredAlways;
    el.append(option('', placeholder));
    return el;
  }

  const month = select('Month', 'Month');
  MONTHS.forEach((name, i) => month.append(option(pad(i + 1), name)));
  const day = select('Day', 'Day');
  const year = select('Year', 'Year');
  for (let y = now - minAge; y >= now - maxAge; y--) year.append(option(String(y), String(y)));

  function fillDays() {
    const keep = day.value;
    const count = daysIn(Number(month.value) || 1, Number(year.value)) || 31;
    day.length = 1;
    for (let d = 1; d <= (month.value ? count : 31); d++) day.append(option(pad(d), String(d)));
    day.value = Number(keep) <= day.length - 1 ? keep : '';
  }

  function sync() {
    const parts = [month, day, year];
    const started = parts.some((el) => el.value);
    parts.forEach((el) => { el.required = requiredAlways || started; });
    field.value = parts.every((el) => el.value) ? `${month.value}/${day.value}/${year.value}` : '';
  }

  // Pre-fill from an existing MM/DD/YYYY value (back navigation, autofill).
  const m = field.value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    month.value = pad(Number(m[1]));
    year.value = m[3];
  }
  fillDays();
  if (m) day.value = pad(Number(m[2]));

  [month, year].forEach((el) => el.addEventListener('change', () => { fillDays(); sync(); }));
  day.addEventListener('change', sync);
  field.form?.addEventListener('reset', () => setTimeout(() => { fillDays(); sync(); }, 0));

  group.append(month, day, year);
  field.before(group);
  field.type = 'hidden';
  field.removeAttribute('placeholder');
  sync();

  if (label) {
    if (!label.id) label.id = `${id}-label`;
    group.setAttribute('aria-labelledby', label.id);
    label.htmlFor = month.id;
  }
}

export function initDateSelect() {
  document.querySelectorAll<HTMLInputElement>('input[data-date-select]').forEach(initOne);
}
