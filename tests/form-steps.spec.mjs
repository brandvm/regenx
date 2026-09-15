import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
const fixture = `
<div data-form-steps><form id="consultation">
  <span data-step-label></span><p data-step-err hidden>Select a therapy</p>
  <div data-step="1" class="form-pane">
    <div data-step-required>
      <label><input type="checkbox" name="therapy" value="trt">TRT</label>
      <label><input type="checkbox" name="therapy" value="peptide">Peptide</label>
    </div>
    <label><input type="radio" name="situation" value="other">Other</label>
    <div class="form-action">
      <button type="button" class="button-link" data-step-back>Back</button>
      <button type="button" class="button-link" data-step-next>Next</button>
    </div>
  </div>
  <div data-step="2" class="form-pane" hidden>
    <input aria-label="First name" name="first" required>
    <input aria-label="Last name" name="last" required>
    <input aria-label="Phone" name="phone" type="tel" required>
    <input aria-label="Email" name="email" type="email" required>
    <select aria-label="Location/State" name="state" required>
      <option value="">Select one...</option><option value="TX">Texas</option>
    </select>
    <textarea aria-label="Message" name="message"></textarea>
    <div class="form-action">
      <button type="button" class="button-link" data-step-back>Back</button>
      <button type="submit" class="button-link">Submit</button>
    </div>
  </div>
</form></div>`;

async function setup(page, { webflowDisabled = false, markup = fixture } = {}) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(`<style>.button-link{display:flex}.form-action{display:flex;justify-content:space-between}</style>${markup}`);
  await page.addStyleTag({ content: css });
  await page.evaluate(disabled => {
    window.Webflow = { env: () => false, push: fn => fn() };
    window.__submissions = 0;
    document.querySelector('[type="submit"]').disabled = disabled;
    document.addEventListener('submit', e => {
      e.preventDefault();
      window.__submissions++;
    });
  }, webflowDisabled);
  await page.addScriptTag({ content: js });
  await expect(page.locator('[data-step-label]')).toHaveText('Step 1 of 2');
  return errors;
}

async function advance(page) {
  await page.getByLabel('TRT', { exact: true }).check();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
}

async function fillContact(page) {
  await page.getByLabel('First name', { exact: true }).fill('Form');
  await page.getByLabel('Last name', { exact: true }).fill('Test');
  await page.getByLabel('Phone', { exact: true }).fill('2025550123');
  await page.getByLabel('Email', { exact: true }).fill('form-test@example.invalid');
  await page.getByLabel('Location/State', { exact: true }).selectOption('TX');
}

for (const width of [1440, 390]) test(`form navigation and live validation at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors = await setup(page);
  const next = page.getByRole('button', { name: 'Next', exact: true });
  const submit = page.locator('[type="submit"]');
  await expect(page.locator('[data-step="1"] [data-step-back]')).toBeHidden();
  await expect(next).toBeDisabled();
  await expect(submit).toBeDisabled();
  await page.getByLabel('Other', { exact: true }).check();
  await expect(next).toBeDisabled();
  await page.getByLabel('TRT', { exact: true }).check();
  await expect(next).toBeEnabled();
  await page.getByLabel('TRT', { exact: true }).uncheck();
  await expect(next).toBeDisabled();
  await advance(page);
  await expect(page.locator('[data-step-label]')).toHaveText('Step 2 of 2');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
  await expect(submit).toBeDisabled();
  await fillContact(page);
  await expect(submit).toBeEnabled();
  for (const name of ['First name', 'Last name', 'Phone', 'Email']) {
    const input = page.getByLabel(name, { exact: true });
    const value = await input.inputValue();
    await input.fill('');
    await expect(submit).toBeDisabled();
    await input.fill(value);
    await expect(submit).toBeEnabled();
  }
  await page.getByLabel('Location/State', { exact: true }).selectOption('');
  await expect(submit).toBeDisabled();
  await page.getByLabel('Location/State', { exact: true }).selectOption('TX');
  await page.getByLabel('Email', { exact: true }).fill('invalid-email');
  await expect(submit).toBeDisabled();
  await page.getByLabel('Email', { exact: true }).fill('form-test@example.invalid');
  await expect(submit).toBeEnabled();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('[data-step="1"] [data-step-back]')).toBeHidden();
  await expect(submit).toBeDisabled();
  await expect(page.getByLabel('TRT', { exact: true })).toBeChecked();
  await next.click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('form-test@example.invalid');
  await expect(submit).toBeEnabled();
  const fields = await page.locator('form').evaluate(form => Object.fromEntries(new FormData(form)));
  expect(fields).toMatchObject({ therapy: 'trt', first: 'Form', state: 'TX', email: 'form-test@example.invalid' });
  await submit.click();
  expect(await page.evaluate(() => window.__submissions)).toBe(1);
  expect(errors).toEqual([]);
});

test('field gating preserves Webflow locks and survives asynchronous unlocks', async ({ page }) => {
  await setup(page, { webflowDisabled: true });
  const submit = page.locator('[type="submit"]');
  await advance(page);
  // Webflow completes Turnstile before the fields are filled.
  await submit.evaluate(button => { button.disabled = false; });
  await expect(submit).toBeDisabled();
  await fillContact(page);
  await expect(submit).toBeEnabled();
  // Webflow owns the button's disabled state during an in-flight submission.
  await submit.evaluate(button => { button.disabled = true; });
  await page.getByLabel('First name', { exact: true }).fill('Edited');
  await expect(submit).toBeDisabled();
  await submit.evaluate(button => { button.disabled = false; });
  await expect(submit).toBeEnabled();
  await page.getByLabel('Email', { exact: true }).fill('');
  await submit.evaluate(button => { button.disabled = false; });
  await expect(submit).toBeDisabled();
});

test('Enter cannot submit early and reset restores initial button states', async ({ page }) => {
  await setup(page);
  await page.getByLabel('TRT', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-step-label]')).toHaveText('Step 1 of 2');
  await page.getByLabel('TRT', { exact: true }).check();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-step-label]')).toHaveText('Step 2 of 2');
  expect(await page.evaluate(() => window.__submissions)).toBe(0);
  await fillContact(page);
  await page.locator('form').evaluate(form => form.reset());
  await expect(page.locator('[data-step-label]')).toHaveText('Step 1 of 2');
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await expect(page.locator('[type="submit"]')).toBeDisabled();
  await expect(page.locator('[data-step="1"] [data-step-back]')).toBeHidden();
});

test('required groups cannot be bypassed with programmatic submission', async ({ page }) => {
  await setup(page);
  await advance(page);
  await fillContact(page);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByLabel('TRT', { exact: true }).uncheck();
  await page.locator('form').evaluate(form => form.requestSubmit());
  expect(await page.evaluate(() => window.__submissions)).toBe(0);
  await expect(page.locator('[data-step-label]')).toHaveText('Step 1 of 2');
  await expect(page.locator('[data-step-err]')).toBeVisible();
});

test('every required group is checked and stale submit attributes cannot unlock Webflow', async ({ page }) => {
  await setup(page, {
    webflowDisabled: true,
    markup: fixture.replace('<div class="form-action">', '<div data-step-required><label><input type="checkbox" name="consent">Consent</label></div><div class="form-action">')
      .replace('type="submit"', 'type="submit" data-step-next'),
  });
  await page.getByLabel('TRT', { exact: true }).check();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.getByLabel('Consent', { exact: true }).check();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await fillContact(page);
  await expect(page.locator('[type="submit"]')).toBeDisabled();
});
