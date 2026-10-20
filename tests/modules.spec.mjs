import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Starter modules from wf-template, run from the built bundle on markup as
// Webflow publishes it.
const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');

async function setup(page, body) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://site.test/', (route) => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head><style>${css}</style></head><body>${body}<script>${js}</script></body></html>`,
  }));
  await page.goto('https://site.test/');
  await page.waitForFunction(() => document.documentElement.classList.contains('rgx-ready'));
  return errors;
}

// A filter as Webflow publishes it (the /scientific-articles category
// filter): radios in a Collection List that all carry the Designer id "radio".
const radio = (label, checked = '') => `<div class="w-dyn-item"><label class="w-radio">
  <div class="w-form-formradioinput w-radio-input"></div>
  <input type="radio" name="Category" id="radio" value="Radio" ${checked}>
  <span class="w-form-label" for="radio">${label}</span></label></div>`;

test('duplicate CMS radio ids become unique and labels follow', async ({ page }) => {
  const errors = await setup(page, `<form>${radio('All', 'checked')}${radio('Hormones')}${radio('Peptide Therapy')}${radio('All')}</form>
    <input id="solo" type="text"><label for="solo">Solo</label>`);
  const ids = await page.$$eval('input[type=radio]', (els) => els.map((e) => e.id));
  expect(ids).toEqual(['radio-all', 'radio-hormones', 'radio-peptide-therapy', 'radio-all-2']);
  const fors = await page.$$eval('.w-form-label', (els) => els.map((e) => e.getAttribute('for')));
  expect(fors).toEqual(ids);
  // Unique ids are left alone, and nothing else about the control changes.
  await expect(page.locator('#solo')).toHaveCount(1);
  await expect(page.locator('label[for=solo]')).toHaveCount(1);
  expect(await page.$eval('input[type=radio]', (e) => e.checked)).toBe(true);
  expect(errors).toEqual([]);
});

// The "As Seen In" logo rows on /services and /about.
const logoRow = `<div style="overflow:hidden;width:600px"><div data-marquee style="display:flex;flex-wrap:wrap">
  ${[1, 2, 3, 4].map((n) => `<div class="service-hero-proof-item" style="flex:none;width:200px;height:100px"><img alt="Logo ${n}"><a href="#" class="service-hero-proof-link"></a></div>`).join('')}
</div></div>`;

test('marquee clones the logos once, hidden from assistive tech, and loops by one set', async ({ page }) => {
  const errors = await setup(page, logoRow);
  const row = page.locator('[data-marquee]');
  await expect(row).toHaveClass(/is-marquee/);
  await expect(row.locator(':scope > *')).toHaveCount(8);
  await expect(row.locator(':scope > [data-marquee-clone][aria-hidden="true"]')).toHaveCount(4);
  await expect(row.locator('[data-marquee-clone] a[tabindex="-1"]')).toHaveCount(4);
  expect(await row.evaluate((el) => el.style.getPropertyValue('--marquee-distance'))).toBe('-800px');
  expect(await row.evaluate((el) => getComputedStyle(el).animationName)).toBe('marquee-scroll');
  expect(errors).toEqual([]);
});

test('marquee stays a static row under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await setup(page, logoRow);
  const row = page.locator('[data-marquee]');
  await expect(row.locator(':scope > *')).toHaveCount(4);
  await expect(row).not.toHaveClass(/is-marquee/);
  expect(errors).toEqual([]);
});
