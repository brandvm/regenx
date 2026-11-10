import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
const nav = `<div class="g-nav-w"><div class="s-wrapper sw-g-nav" style="height:56px">
  <a aria-label="Search medications" href="/treatments?search" class="g-nav-search-button">Search</a>
</div></div><main style="height:2000px"></main>`;
const catalog = `${nav}<section class="s-medical-catelog" style="margin-top:900px">
  <input class="search-bar-input w-input" aria-label="Search the catalog"></section>`;

async function setup(page, markup) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><body>${markup}</body>` }));
  await page.goto('http://regenx.test/');
  await page.addStyleTag({ content: css });
  await page.evaluate(() => { window.Webflow = { env: () => false, push: fn => fn() }; });
  await page.addScriptTag({ content: js });
  await expect(page.locator('.rx-nav-search')).toHaveCount(1);
  return errors;
}

test('the nav search icon opens a search field, and Enter searches the catalog', async ({ page }) => {
  const errors = await setup(page, nav);
  const icon = page.getByRole('link', { name: 'Search medications' });
  const field = page.getByRole('searchbox', { name: 'Search medications' });
  await expect(field).toBeHidden();
  await icon.click();
  await expect(field).toBeVisible();
  await expect(field).toBeFocused();
  await expect(icon).toHaveAttribute('aria-expanded', 'true');
  expect(page.url()).toBe('http://regenx.test/');

  await page.keyboard.press('Escape');
  await expect(field).toBeHidden();
  await expect(icon).toBeFocused();

  await icon.click();
  await field.fill('sildenafil');
  await Promise.all([page.waitForURL('**/treatments?search=sildenafil'), page.keyboard.press('Enter')]);
  expect(errors).toEqual([]);
});

test('an empty search stays open, and a click outside closes it', async ({ page }) => {
  const errors = await setup(page, nav);
  await page.getByRole('link', { name: 'Search medications' }).click();
  const field = page.getByRole('searchbox', { name: 'Search medications' });
  await page.keyboard.press('Enter');
  await expect(field).toBeVisible();
  expect(page.url()).toBe('http://regenx.test/');
  await page.mouse.click(10, 600);
  await expect(field).toBeHidden();
  expect(errors).toEqual([]);
});

test('on the catalog the icon jumps to the catalog search box', async ({ page }) => {
  const errors = await setup(page, catalog);
  await page.getByRole('link', { name: 'Search medications' }).click();
  await expect(page.getByRole('textbox', { name: 'Search the catalog' })).toBeFocused();
  await expect(page.getByRole('searchbox', { name: 'Search medications' })).toBeHidden();
  expect(errors).toEqual([]);
});
