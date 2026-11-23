import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const GUID = 'bd00bed3-41b1-4c60-abee-96289510f6ed';
const URL_RE = /api\.hsforms\.com\/submissions\/v3\/integration\/submit\/248037195\//;

// The Contact form as Webflow publishes it (trimmed): two steps, Webflow
// field names, the state option with Webflow's leading space, a honeypot.
const fixture = (attrs = `data-hubspot-form="${GUID}"`, extra = '') => `
<div class="w-form"><div data-form-steps><form id="wf-form-Consultation-Form" ${attrs}>
  <span data-step-label></span><p data-step-err hidden>Select one</p>
  <div data-step="1"><div data-step-required>
    <label><input type="checkbox" name="Testosterone-Replacement-Therapy-TRT" data-name="Testosterone Replacement Therapy (TRT)">TRT</label>
    <label><input type="checkbox" name="Second-opinion" data-name="Second opinion">I desire a second opinion</label>
    <label><input type="checkbox" name="Other" data-name="Other">Other</label>
  </div>
  <button type="button" data-step-back>Back</button><button type="button" data-step-next>Next</button></div>
  <div data-step="2" hidden>
    <input aria-label="First Name" name="First-Name" required>
    <input aria-label="Last Name" name="Last-Name" required>
    <input aria-label="Phone" name="Phone" type="tel" required>
    <input aria-label="Email" name="Email" type="email" required>
    <select aria-label="State" name="Locations-State" required><option value="">Select</option><option value=" Texas"> Texas</option></select>
    <input aria-label="Date of Birth" name="Date-of-Birth">
    <input aria-label="Message" name="Message">
    <input aria-label="Website" name="website" data-hs-honeypot data-hs-skip tabindex="-1">
    ${extra}
    <button type="button" data-step-back>Back</button><button type="submit">Submit</button>
  </div>
</form>
<div class="w-form-done" style="display:none">Thank you!</div>
<div class="w-form-fail" style="display:none">Oops!</div></div></div>`;

async function setup(page, markup = fixture()) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Time runs normally; fill() jumps it past the minimum fill time.
  await page.clock.install();
  await page.setContent(markup);
  await page.evaluate(() => {
    window.Webflow = { env: () => false, push: fn => fn() };
    window.__webflowPosts = 0;
    // Webflow's form handler is delegated on the document.
    document.addEventListener('submit', e => { e.preventDefault(); window.__webflowPosts++; });
  });
  await page.addScriptTag({ content: js });
  await expect(page.locator('[data-step-label]')).toHaveText('Step 1 of 2');
  return errors;
}

async function fill(page, { wait = true } = {}) {
  await page.getByLabel('TRT').check();
  await page.getByLabel('Other', { exact: true }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('First Name').fill('Ann');
  await page.getByLabel('Last Name').fill('Lee');
  await page.getByLabel('Phone').fill('(555) 555-0100');
  await page.getByLabel('Email').fill('ann@example.invalid');
  await page.getByLabel('State').selectOption(' Texas');
  await page.getByLabel('Date of Birth').fill('01/02/1980');
  if (wait) await page.clock.fastForward(4000);
}

// Webflow's invisible Turnstile writes its token into this hidden input.
const TURNSTILE = (value = '') => `<input type="hidden" name="cf-turnstile-response" value="${value}">`;

test('sends mapped fields to HubSpot and shows the success pane', async ({ page }) => {
  let body;
  await page.route(URL_RE, async route => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"inlineMessage":""}' });
  });
  const errors = await setup(page);
  await fill(page);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.w-form-done')).toBeVisible();
  await expect(page.locator('form')).toBeHidden();
  const fields = Object.fromEntries(body.fields.map(f => [f.name, f.value]));
  expect(fields).toEqual({
    services_of_interest: 'Testosterone Replacement Therapy (TRT);Other',
    firstname: 'Ann',
    lastname: 'Lee',
    mobilephone: '(555) 555-0100',
    email: 'ann@example.invalid',
    state: 'Texas',
    date_of_birth: '01/02/1980',
  });
  expect(body.fields.every(f => f.objectTypeId === '0-1')).toBe(true);
  expect(body.context.pageUri).toBeTruthy();
  expect(await page.evaluate(() => window.__webflowPosts)).toBe(0);
  expect(errors).toEqual([]);
});

test('a HubSpot error shows the error pane and keeps the entries', async ({ page }) => {
  await page.route(URL_RE, route => route.fulfill({ status: 400, body: '{"status":"error"}' }));
  await setup(page);
  await fill(page);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.w-form-fail')).toBeVisible();
  await expect(page.locator('.w-form-done')).toBeHidden();
  await expect(page.getByLabel('Email')).toHaveValue('ann@example.invalid');
  await expect(page.locator('[data-step-label]')).toHaveText('Step 2 of 2');
  await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
});

test('a network failure shows the error pane', async ({ page }) => {
  await page.route(URL_RE, route => route.abort());
  await setup(page);
  await fill(page);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.w-form-fail')).toBeVisible();
});

test('a filled honeypot sends nothing', async ({ page }) => {
  let calls = 0;
  await page.route(URL_RE, route => { calls++; return route.fulfill({ status: 200, body: '{}' }); });
  await setup(page);
  await fill(page);
  await page.locator('[name="website"]').evaluate(el => { el.value = 'spam'; });
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.w-form-done')).toBeVisible();
  expect(calls).toBe(0);
});

test('without data-hubspot-form the form still posts to Webflow', async ({ page }) => {
  let calls = 0;
  await page.route(URL_RE, route => { calls++; return route.fulfill({ status: 200, body: '{}' }); });
  await setup(page, fixture(''));
  await fill(page);
  await page.getByRole('button', { name: 'Submit' }).click();
  expect(await page.evaluate(() => window.__webflowPosts)).toBe(1);
  expect(calls).toBe(0);
});

test('a submit within 3 seconds of load sends nothing', async ({ page }) => {
  let calls = 0;
  await page.route(URL_RE, route => { calls++; return route.fulfill({ status: 200, body: '{}' }); });
  await setup(page);
  // Pause time: everything below happens "instantly" after load.
  // The page's own clock, with a margin so pauseAt never lands in the past.
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 500);
  await fill(page, { wait: false });
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.w-form-done')).toBeVisible();
  expect(calls).toBe(0);
});

test('with a Turnstile token it sends, without the token field', async ({ page }) => {
  let body;
  await page.route(URL_RE, async route => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, body: '{}' });
  });
  await setup(page, fixture(undefined, TURNSTILE('tok-123')));
  await fill(page);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.w-form-done')).toBeVisible();
  expect(body.fields.some(f => /turnstile/.test(f.name) || f.value === 'tok-123')).toBe(false);
});

test('waits for a late Turnstile token, then sends', async ({ page }) => {
  let calls = 0;
  await page.route(URL_RE, route => { calls++; return route.fulfill({ status: 200, body: '{}' }); });
  await setup(page, fixture(undefined, TURNSTILE()));
  await fill(page);
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.clock.runFor(1000);
  expect(calls).toBe(0);
  await page.locator('[name="cf-turnstile-response"]').evaluate(el => { el.value = 'late'; });
  await page.clock.runFor(500);
  await expect(page.locator('.w-form-done')).toBeVisible();
  expect(calls).toBe(1);
});

test('no Turnstile token after 8 seconds: error pane, nothing sent', async ({ page }) => {
  let calls = 0;
  await page.route(URL_RE, route => { calls++; return route.fulfill({ status: 200, body: '{}' }); });
  await setup(page, fixture(undefined, TURNSTILE()));
  await fill(page);
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.clock.runFor(9000);
  await expect(page.locator('.w-form-fail')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('ann@example.invalid');
  await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
  expect(calls).toBe(0);
});
