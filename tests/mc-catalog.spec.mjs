import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Medication Catalog phone rows (mc-catalog.ts), run from the built bundle
// on markup shaped like /design/medication-catalog. The look comes from
// Webflow classes, which aren't loaded here, so states are checked by class.
const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');

const card = (name, strength, form, n = 0) => `<div role="listitem" class="product-list-item w-dyn-item"><div class="product-card" data-form="${form}">
  <div class="product-card-media"><img class="product-card-image" alt="${name} vial" src="https://site.test/img/${n}.webp"></div>
  <div class="product-card-main"><div class="product-card-info"><div class="product-card-title"><div class="d4">${name}</div>
  <div class="product-variant-w w-dyn-list"><div class="product-variant-list w-dyn-items"><div class="product-variant-item w-dyn-item"><span>${strength}</span></div></div></div></div>
  <p class="body-sm">About ${name} ${n}.</p></div>
  <div class="grouped-cta"><a class="button-link" aria-label="View Details" href="/product/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">View</a><a class="button-link" aria-label="Get a Prescription" href="/contact">Get</a></div></div></div></div>`;

const block = (id, title, cards, next = '') => `<div class="product-block"><div id="${id}" class="anchor-extension is-full"></div>
  <div class="section-header"><div class="c-heading w-richtext"><h2>${title}</h2></div></div>
  <div class="product-list-w w-dyn-list"><div fs-list-element="list" role="list" class="product-list w-dyn-items">${cards.join('')}</div>
  ${next ? `<div class="w-pagination-wrapper u-hide"><a href="${next}" class="w-pagination-next">Next</a></div>` : ''}</div></div>`;

const testosterone = Array.from({ length: 7 }, (_, n) => card(`Testosterone ${String.fromCharCode(65 + n)}`, '200mg/mL', 'Injection', n));

const page1 = `<div class="g-nav-w" style="position:fixed;top:0;height:60px"></div>
<section class="section mc-catalog"><div class="s-wrapper"><div class="product-block-list-w">
  <div class="product-block-list-filter-w w-form"><form fs-list-element="filters">
    <div class="search-bar-w"><input class="search-bar-input" fs-list-field="*" type="text"></div>
    <div class="mc-toolbar is-mobile"><div class="mc-total">58 medications</div></div>
    <div class="mc-tabs is-mobile">
      <a href="#Most-Prescribed" class="mc-tab"><div class="mc-tab-label">Most Prescribed</div><div class="mc-tab-line is-active"></div></a>
      <a href="#Testosterone-Products" class="mc-tab"><div class="mc-tab-label">Testosterone</div><div class="mc-tab-line"></div></a>
      <a href="#Vitamins-Aminos" class="mc-tab"><div class="mc-tab-label">Vitamins</div><div class="mc-tab-line"></div></a>
    </div></form></div>
  <div class="product-block-list is-mc">
    <div class="product-slider-w"><div id="Most-Prescribed" class="anchor-extension"></div>
      <div class="section-header"><div class="c-heading w-richtext"><h2>Most Prescribed</h2></div></div>
      <div class="swiper product-slider w-dyn-list"><div role="list" class="swiper-wrapper product-slider w-dyn-items">
        ${card('Testosterone A', '200mg/mL', 'Injection', 0).replace('product-list-item w-dyn-item', 'swiper-slide w-dyn-item')}
        ${card('NAD+ (Lyo)', '1000mg', 'Injection', 9).replace('product-list-item w-dyn-item', 'swiper-slide w-dyn-item')}
      </div></div></div>
    ${block('Testosterone-Products', 'Testosterone Products', testosterone.slice(0, 6), '?abc_page=2')}
    ${block('Vitamins-Aminos', 'Vitamins &amp; Aminos', [card('Glutathione', '200mg/mL', 'Injection', 20)])}
  </div>
  <div class="mc-list" data-mc-list><p class="mc-empty is-hidden" data-mc-empty>No medications match your search.</p></div>
</div></div></section><div style="height:2000px"></div>`;

// Page 2 of the Testosterone list: Webflow serves the whole page again.
const page2 = page1.replace(testosterone.slice(0, 6).join(''), testosterone[6]).replace('?abc_page=2', '');

async function setup(page, width = 375) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width, height: 800 });
  const html = (body) => `<!doctype html><html><head><style>.is-hidden,.is-closed{display:none}</style></head><body>${body}<script>${js}</script></body></html>`;
  await page.route('https://site.test/?abc_page=2', (route) => route.fulfill({ contentType: 'text/html', body: html(page2) }));
  await page.route('https://site.test/', (route) => route.fulfill({ contentType: 'text/html', body: html(page1) }));
  await page.goto('https://site.test/');
  await page.waitForFunction(() => document.documentElement.classList.contains('rgx-ready'));
  return errors;
}

const group = (page, id) => page.locator(`[data-mc-group="${id}"]`);

test('mc-catalog: one group per block, one row per card, later pages fetched', async ({ page }) => {
  const errors = await setup(page);
  await expect(page.locator('.mc-group')).toHaveCount(3);
  await expect(group(page, 'Testosterone-Products').locator('.mc-group-head')).toHaveText('Testosterone Products');
  // Six on the page, the seventh from ?abc_page=2.
  await expect(group(page, 'Testosterone-Products').locator('.mc-row')).toHaveCount(7);
  const row = group(page, 'Testosterone-Products').locator('.mc-row').first();
  await expect(row.locator('.mc-row-name')).toHaveText('Testosterone A');
  await expect(row.locator('.mc-row-sub')).toHaveText('200mg/mL · Injection');
  // Each product counted once, though Testosterone A is in two groups.
  await expect(page.locator('.mc-total')).toHaveText('9 medications');
  expect(errors).toEqual([]);
});

test('mc-catalog: a row opens in place with image, text and both buttons', async ({ page }) => {
  const errors = await setup(page);
  const row = group(page, 'Vitamins-Aminos').locator('.mc-row');
  const head = row.locator('.mc-row-head');
  await expect(head).toHaveAttribute('aria-expanded', 'false');
  await expect(row.locator('.mc-row-body')).toHaveClass(/is-closed/);
  await head.click();
  await expect(head).toHaveAttribute('aria-expanded', 'true');
  await expect(row.locator('.mc-row-body')).not.toHaveClass(/is-closed/);
  await expect(row.locator('.mc-icon')).toHaveClass(/ri-subtract-line/);
  await expect(row.locator('.mc-row-image')).toHaveAttribute('alt', 'Glutathione vial');
  await expect(row.locator('.mc-row-desc')).toHaveText('About Glutathione 20.');
  await expect(row.locator('a.mc-button')).toHaveText(['View Details', 'Get a Prescription']);
  await expect(row.locator('a.mc-button.is-secondary')).toHaveAttribute('href', '/contact');
  await head.press('Enter');
  await expect(row.locator('.mc-row-body')).toHaveClass(/is-closed/);
  expect(errors).toEqual([]);
});

test('mc-catalog: long groups show five rows and Show more', async ({ page }) => {
  const errors = await setup(page);
  const g = group(page, 'Testosterone-Products');
  await expect(g.locator('.mc-row')).toHaveCount(7);
  await expect(g.locator('.mc-row:not(.is-hidden)')).toHaveCount(5);
  const more = g.locator('.mc-show-more');
  await expect(more).not.toHaveClass(/is-hidden/);
  await expect(group(page, 'Vitamins-Aminos').locator('.mc-show-more')).toHaveClass(/is-hidden/);
  await more.click();
  await expect(g.locator('.mc-row:not(.is-hidden)')).toHaveCount(7);
  await expect(more).toHaveText('Show less');
  expect(errors).toEqual([]);
});

test('mc-catalog: search filters rows, hides empty groups, recounts', async ({ page }) => {
  const errors = await setup(page);
  await expect(group(page, 'Testosterone-Products').locator('.mc-row')).toHaveCount(7);
  await page.locator('.search-bar-input').fill('glutath');
  await expect(page.locator('.mc-total')).toHaveText('1 medication');
  await expect(group(page, 'Testosterone-Products')).toHaveClass(/is-hidden/);
  await expect(group(page, 'Vitamins-Aminos')).not.toHaveClass(/is-hidden/);
  await page.locator('.search-bar-input').fill('zzz');
  await expect(page.locator('[data-mc-empty]')).not.toHaveClass(/is-hidden/);
  await page.locator('.search-bar-input').fill('');
  await expect(page.locator('[data-mc-empty]')).toHaveClass(/is-hidden/);
  await expect(page.locator('.mc-total')).toHaveText('9 medications');
  expect(errors).toEqual([]);
});

test('mc-catalog: a tab jumps to its group and is marked', async ({ page }) => {
  const errors = await setup(page);
  await expect(group(page, 'Testosterone-Products').locator('.mc-row')).toHaveCount(7);
  await page.locator('.mc-tab[href="#Vitamins-Aminos"]').click();
  await expect(page.locator('.mc-tab[href="#Vitamins-Aminos"] .mc-tab-line')).toHaveClass(/is-active/);
  await expect(page.locator('.mc-tab[href="#Most-Prescribed"] .mc-tab-line')).not.toHaveClass(/is-active/);
  // Under the fixed nav (60px + 16px), and the anchor in the hidden list
  // doesn't take over the URL.
  await expect.poll(() => group(page, 'Vitamins-Aminos').evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(76);
  expect(new URL(page.url()).hash).toBe('');
  expect(errors).toEqual([]);
});

test('mc-catalog: pages without the list are untouched', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://site.test/', (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>${page1.replace(/<div class="mc-list"[^]*?<\/div>/, '')}<script>${js}</script></body></html>` }));
  await page.goto('https://site.test/');
  await page.waitForFunction(() => document.documentElement.classList.contains('rgx-ready'));
  await expect(page.locator('.mc-group')).toHaveCount(0);
  await expect(page.locator('.mc-total')).toHaveText('58 medications');
  expect(errors).toEqual([]);
});
