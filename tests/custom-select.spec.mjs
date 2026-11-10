import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
const states = ['Alabama', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'Texas'];
const fixture = `
<form id="consultation" style="width:520px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div class="form-pane-field" style="display:flex;flex-direction:column;align-items:flex-start">
    <label for="Locations-State">Location/State *</label>
    <select id="Locations-State" name="Locations-State" data-name="Locations/State" required class="form-pane-text-field w-select">
      <option value="">Select one...</option>${states.map(s => `<option value=" ${s}"> ${s}</option>`).join('')}
    </select>
  </div>
  <div class="form-pane-field" style="display:flex;flex-direction:column;align-items:flex-start">
    <label for="Date-of-Birth">Date of Birth</label>
    <input class="form-pane-text-field w-input" name="Date-of-Birth" data-name="Date of Birth"
      placeholder="MM/DD/YYYY" type="text" id="Date-of-Birth" data-date-select>
  </div>
  <select id="Plain" name="Plain" data-native-select class="w-select"><option>Keep native</option></select>
</form>`;

async function setup(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(fixture);
  await page.addStyleTag({ content: css });
  await page.evaluate(() => {
    window.Webflow = { env: () => false, push: fn => fn() };
    window.__changes = 0;
    document.querySelector('#Locations-State').addEventListener('change', () => window.__changes++);
  });
  await page.addScriptTag({ content: js });
  await expect(page.locator('.rx-select')).toHaveCount(4);
  return errors;
}

// Webflow's form JS keys every input by data-name (then name).
const collect = page => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('#consultation input, #consultation select').forEach((el, i) => {
    out[el.getAttribute('data-name') || el.getAttribute('name') || `Field ${i + 1}`] = el.value;
  });
  return out;
});

test('a form select gets a combobox and options list that drive the native select', async ({ page }) => {
  const errors = await setup(page);
  const state = page.getByRole('combobox', { name: 'Location/State' });
  const list = page.getByRole('listbox', { name: 'Location/State' });
  await expect(state).toHaveText('Select one...');
  await expect(state).toHaveAttribute('aria-required', 'true');
  await expect(page.locator('#Plain')).not.toHaveClass(/rx-select-native/);

  await state.click();
  await expect(state).toHaveAttribute('aria-expanded', 'true');
  await expect(list).toBeVisible();
  await expect(list.getByRole('option')).toHaveCount(states.length);
  await list.getByRole('option', { name: 'Texas' }).click();
  await expect(state).toHaveAttribute('aria-expanded', 'false');
  await expect(state).toHaveText('Texas');
  await expect(state).toBeFocused();
  await expect(page.locator('#Locations-State')).toHaveValue(' Texas');
  await expect(list.getByRole('option', { name: 'Texas' })).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => window.__changes)).toBe(1);

  // Clicking the label focuses the combobox, not the hidden select.
  await page.locator('label[for="Locations-State"]').click();
  await expect(state).toBeFocused();

  // Clicking outside closes it.
  await state.click();
  await page.mouse.click(5, 400);
  await expect(state).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});

test('keyboard: arrows, Enter, Escape and type-to-jump like a native select', async ({ page }) => {
  const errors = await setup(page);
  const state = page.getByRole('combobox', { name: 'Location/State' });
  const native = page.locator('#Locations-State');
  await state.focus();

  await page.keyboard.press('ArrowDown');
  await expect(state).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(native).toHaveValue(' Nebraska');
  await expect(state).toHaveAttribute('aria-expanded', 'false');

  await page.keyboard.press('End');
  await expect(state).toHaveAttribute('aria-activedescendant', /opt-6$/);
  await page.keyboard.press('Escape');
  await expect(state).toHaveAttribute('aria-expanded', 'false');
  await expect(native).toHaveValue(' Nebraska');

  // A longer word keeps the current match; one letter repeated cycles.
  await page.keyboard.type('t');
  await expect(native).toHaveValue(' Texas');
  await page.waitForTimeout(700);
  await page.keyboard.type('ne');
  await expect(native).toHaveValue(' Nebraska');
  await page.keyboard.type('w');
  await expect(native).toHaveValue(' New Hampshire');
  await page.waitForTimeout(700);
  await page.keyboard.type('nn');
  await expect(native).toHaveValue(' New Mexico');
  expect(errors).toEqual([]);
});

test('Month / Day / Year use the custom list and still submit one MM/DD/YYYY value', async ({ page }) => {
  const errors = await setup(page);
  const pick = async (name, option) => {
    await page.getByRole('combobox', { name }).click();
    await page.getByRole('listbox', { name }).getByRole('option', { name: option, exact: true }).click();
  };
  const day = page.getByRole('combobox', { name: 'Day' });

  await pick('Month', 'Feb');
  await expect(day).toHaveAttribute('aria-required', 'true');
  await pick('Year', '1980');
  await day.click();
  await expect(page.getByRole('listbox', { name: 'Day' }).getByRole('option')).toHaveCount(29);
  await page.getByRole('listbox', { name: 'Day' }).getByRole('option', { name: '29', exact: true }).click();
  await expect(page.locator('#Date-of-Birth')).toHaveValue('02/29/1980');

  // 1981 has no 29 Feb: the day clears and the list has 28 days.
  await pick('Year', '1981');
  await expect(day).toHaveText('Day');
  await day.click();
  await expect(page.getByRole('listbox', { name: 'Day' }).getByRole('option')).toHaveCount(28);
  await page.getByRole('listbox', { name: 'Day' }).getByRole('option', { name: '28', exact: true }).click();
  await pick('Location/State', 'Texas');

  const submitted = await collect(page);
  expect(submitted['Date of Birth']).toBe('02/28/1981');
  expect(submitted['Locations/State']).toBe(' Texas');
  expect(Object.keys(submitted).filter(key => /^Field /.test(key))).toEqual([]);
  expect(errors).toEqual([]);
});
