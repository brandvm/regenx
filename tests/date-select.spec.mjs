import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
const fixture = `
<form id="consultation" style="width:250px">
  <div class="form-pane-field" style="display:flex;flex-direction:column;align-items:flex-start">
    <label for="Date-of-Birth">Date of Birth</label>
    <input class="form-pane-text-field w-input" name="Date-of-Birth" data-name="Date of Birth"
      placeholder="MM/DD/YYYY" type="text" id="Date-of-Birth" data-date-select>
  </div>
</form>`;

async function setup(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(fixture);
  await page.addStyleTag({ content: css });
  await page.evaluate(() => { window.Webflow = { env: () => false, push: fn => fn() }; });
  await page.addScriptTag({ content: js });
  await expect(page.locator('.rx-date-select select')).toHaveCount(3);
  return errors;
}

// Webflow's form JS keys every input by data-name (then name), later inputs
// overwriting earlier ones; this mirrors that collection.
const collect = page => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('#consultation input, #consultation select').forEach((el, i) => {
    out[el.getAttribute('data-name') || el.getAttribute('name') || `Field ${i + 1}`] = el.value;
  });
  return out;
});

test('Date of Birth becomes Month / Day / Year and submits one MM/DD/YYYY field', async ({ page }) => {
  const errors = await setup(page);
  // The native selects (custom-select.ts draws its own box over them).
  const month = page.locator('#Date-of-Birth-Month');
  const day = page.locator('#Date-of-Birth-Day');
  const year = page.locator('#Date-of-Birth-Year');
  await expect(page.locator('#Date-of-Birth')).toHaveAttribute('type', 'hidden');
  await expect(page.getByRole('group', { name: 'Date of Birth' })).toBeVisible();
  const width = await page.locator('.rx-date-select').evaluate(el => el.getBoundingClientRect().width);
  expect(width).toBe(250);

  // Optional until started; then all three are required.
  await expect(day).not.toHaveAttribute('required');
  await month.selectOption('02');
  await expect(day).toHaveAttribute('required');
  expect(await collect(page)).toEqual({ 'Date of Birth': '' });

  // Leap years: February has 29 days in 1980, 28 in 1981; a lost day clears.
  await year.selectOption('1980');
  await expect(day.locator('option')).toHaveCount(30);
  await day.selectOption('29');
  expect(await collect(page)).toEqual({ 'Date of Birth': '02/29/1980' });
  await year.selectOption('1981');
  await expect(day.locator('option')).toHaveCount(29);
  await expect(day).toHaveValue('');
  await day.selectOption('28');
  expect(await collect(page)).toEqual({ 'Date of Birth': '02/28/1981' });
  expect(errors).toEqual([]);
});
