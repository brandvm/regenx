import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Medical Catalog phone list (catalog-list.ts) and Lab Panel search
// (lab-tests.ts), run from the built bundle on markup shaped like the
// published pages.
const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');

async function setup(page, body, width = 375) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width, height: 800 });
  await page.route('https://site.test/', (route) => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head><style>${css}</style></head><body>${body}<script>${js}</script></body></html>`,
  }));
  await page.goto('https://site.test/');
  await page.waitForFunction(() => document.documentElement.classList.contains('rgx-ready'));
  return errors;
}

const card = (name, strength, form) => `<div role="listitem" class="product-list-item w-dyn-item"><div class="product-card"${form ? ` data-form="${form}"` : ''}>
  <div class="product-card-media"><img alt=""></div>
  <div class="product-card-main"><div class="product-card-info"><div class="product-card-title"><div class="d4">${name}</div>
  <div class="product-variant-w w-dyn-list"><div class="product-variant-list w-dyn-items"><div class="product-variant-item w-dyn-item"><span>${strength}</span></div></div></div></div>
  <p class="body-sm">About ${name}.</p></div>
  <div class="grouped-cta"><a class="button-link" href="/product/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">View Details</a><a class="button-link" href="/contact">Get a Prescription</a></div></div></div></div>`;

const block = (id, title, cards) => `<div class="product-block"><div id="${id}" class="anchor-extension is-full"></div>
  <div class="section-header"><div class="c-heading w-richtext"><h2>${title}</h2></div></div>
  <div class="product-list-w w-dyn-list"><div fs-list-element="list" role="list" class="product-list u-grid-3 w-dyn-items">${cards.join('')}</div></div></div>`;

const catalog = (withForms = true) => {
  const f = (form) => (withForms ? form : '');
  return `<section class="section s-medical-catelog"><div class="s-wrapper">
  <form fs-list-element="filters"><div class="search-bar-w"><input class="search-bar-input" fs-list-field="*" type="text"></div>
  <div class="services-main-nav-list is-catalog">
    <a data-catalog-link="most-prescribed" href="#Most-Prescribed" class="services-main-nav-link"><div class="lab-tests-nav-label"><div class="body-sm"><span>Most Prescribed</span></div></div></a>
    <a data-catalog-link="testosterone" href="#Testosterone-Products" class="services-main-nav-link"><div class="lab-tests-nav-label"><div class="body-sm"><span>Testosterone Products</span></div></div></a>
    <a data-catalog-link="vitamins" href="#Vitamins-Aminos" class="services-main-nav-link"><div class="lab-tests-nav-label"><div class="body-sm"><span>Vitamins &amp; Aminos</span></div></div></a>
  </div></form>
  <div class="product-slider-w"><div id="Most-Prescribed" class="anchor-extension"></div>
    <div class="section-header"><div class="c-heading w-richtext"><h2>Most Prescribed</h2></div></div>
    <div class="product-slider-main"><div class="swiper product-slider w-dyn-list"><div role="list" class="swiper-wrapper product-slider w-dyn-items">
      ${card('NAD+ (Lyo)', '1000mg', f('Injection')).replace('product-list-item w-dyn-item', 'swiper-slide product-slider w-dyn-item')}
      ${card('Sermorelin (Lyo)', '15mg', f('Injection')).replace('product-list-item w-dyn-item', 'swiper-slide product-slider w-dyn-item')}
    </div></div><div class="card-row-nav swiper-prev"></div><div class="card-row-nav swiper-next"></div></div></div>
  ${block('Testosterone-Products', 'Testosterone Products', [card('Testosterone Cypionate', '200mg/mL', f('Injection')), card('Anastrozole Capsule', '0.25mg', f('Capsule')), card('Finasteride Tablet', '1mg', f('Tablet'))])}
  ${block('Vitamins-Aminos', 'Vitamins &amp; Aminos', [card('Glutathione', '200mg/mL', f('Injection')), card('L-Carnitine', '500mg/mL', f('Injection'))])}
  </div></section>`;
};

test('catalog: phones get compact rows that open in place', async ({ page }) => {
  const errors = await setup(page, catalog());
  await expect(page.locator('.s-medical-catelog')).toHaveAttribute('data-catalog-compact', '');
  const row = page.locator('.product-card', { hasText: 'Anastrozole Capsule' });
  await expect(row.locator('.product-card-media')).toBeHidden();
  await expect(row.locator('.product-card-info > p')).toBeHidden();
  await expect(row.locator('.catalog-row-form')).toHaveText('Capsule');
  const toggle = row.locator('.catalog-row-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(row.locator('.product-card-info > p')).toBeVisible();
  await expect(row.locator('.grouped-cta a')).toHaveCount(2);
  await expect(row.locator('.grouped-cta')).toBeVisible();
  // Slides stack as rows, without the slider arrows.
  await expect(page.locator('.product-slider-w .card-row-nav').first()).toBeHidden();
  expect(errors).toEqual([]);
});

test('catalog: counts on the category tabs and headings, total under search', async ({ page }) => {
  const errors = await setup(page, catalog());
  await expect(page.locator('a[href="#Most-Prescribed"] .catalog-count')).toHaveText('(2)');
  await expect(page.locator('a[href="#Testosterone-Products"] .catalog-count')).toHaveText('(3)');
  await expect(page.locator('#Testosterone-Products ~ .section-header h2 .catalog-count')).toHaveText('3');
  // Each product once, wherever it is listed.
  await expect(page.locator('.catalog-total')).toHaveText('7 medications');
  expect(errors).toEqual([]);
});

test('catalog: the Filters sheet narrows by form and hides empty groups', async ({ page }) => {
  const errors = await setup(page, catalog());
  await page.locator('.catalog-filters-button').click();
  const sheet = page.locator('[data-modal="catalog-filters"]');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('label', { hasText: 'Injection' }).locator('.catalog-sheet-option-count')).toHaveText('5');
  // Known forms with no product on the page get no option.
  await expect(sheet.locator('label', { hasText: 'Troche' })).toBeHidden();
  await sheet.locator('label', { hasText: 'Capsule' }).click();
  await expect(sheet.locator('.catalog-sheet-apply')).toHaveText('Show 1 result');
  await sheet.locator('.catalog-sheet-apply').click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('.product-card', { hasText: 'Anastrozole Capsule' })).toBeVisible();
  await expect(page.locator('.product-card', { hasText: 'Testosterone Cypionate' })).toBeHidden();
  // No capsule among the vitamins or Most Prescribed: group and tab hide.
  await expect(page.locator('.product-block', { hasText: 'Glutathione' })).toBeHidden();
  await expect(page.locator('a[href="#Vitamins-Aminos"]')).toBeHidden();
  await expect(page.locator('a[href="#Most-Prescribed"]')).toBeHidden();
  await expect(page.locator('.catalog-filters-badge')).toHaveText('1');
  await expect(page.locator('.catalog-total')).toHaveText('1 medication');
  expect(errors).toEqual([]);
});

test('catalog: search matches the sliders and shows a message when nothing matches', async ({ page }) => {
  const errors = await setup(page, catalog());
  await page.locator('.search-bar-input').fill('sermo');
  await expect(page.locator('.product-card', { hasText: 'NAD+' })).toBeHidden();
  await expect(page.locator('.product-card', { hasText: 'Sermorelin' })).toBeVisible();
  // Finsweet filters the grid lists on the published page by taking the
  // non-matching items out; the test does the same.
  await page.evaluate(() => {
    window.__fsRemoved = [];
    document.querySelectorAll('[fs-list-element="list"] > .w-dyn-item').forEach((item) => {
      window.__fsRemoved.push([item.parentElement, item]);
      item.remove();
    });
  });
  await page.locator('.search-bar-input').fill('zzz');
  const empty = page.locator('.catalog-empty');
  await expect(empty).toBeVisible();
  await expect(empty.locator('.catalog-empty-title')).toHaveText('No medications match “zzz”');
  await empty.locator('.catalog-empty-clear').click();
  await expect(page.locator('.search-bar-input')).toHaveValue('');
  // Finsweet puts the items back on the cleared search.
  await page.evaluate(() => window.__fsRemoved.forEach(([list, item]) => list.appendChild(item)));
  await expect(empty).toBeHidden();
  await expect(page.locator('.product-card', { hasText: 'Glutathione' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('catalog: cards Finsweet adds after boot become rows too, counted once', async ({ page }) => {
  const errors = await setup(page, catalog());
  await page.evaluate((html) => {
    const list = document.querySelector('#Vitamins-Aminos ~ .product-list-w .product-list');
    list.insertAdjacentHTML('beforeend', html);
    // An extra category lists a product that is already in the catalog.
    list.insertAdjacentHTML('beforeend', document.querySelector('.product-card').closest('.w-dyn-item').outerHTML);
  }, card('Methylcobalamin', '1mg/mL', 'Injection'));
  const row = page.locator('.product-card', { hasText: 'Methylcobalamin' });
  await expect(row.locator('.catalog-row-toggle')).toHaveCount(1);
  await expect(page.locator('a[href="#Vitamins-Aminos"] .catalog-count')).toHaveText('(4)');
  await expect(page.locator('.catalog-total')).toHaveText('8 medications');
  expect(errors).toEqual([]);
});

test('catalog: no Filters button without form data', async ({ page }) => {
  const errors = await setup(page, catalog(false));
  await expect(page.locator('.catalog-filters-button')).toHaveCount(0);
  await expect(page.locator('[data-modal="catalog-filters"]')).toHaveCount(0);
  await expect(page.locator('.catalog-total')).toBeVisible();
  expect(errors).toEqual([]);
});

test('catalog: desktop keeps the full cards', async ({ page }) => {
  const errors = await setup(page, catalog(), 1440);
  await expect(page.locator('.s-medical-catelog')).not.toHaveAttribute('data-catalog-compact', '');
  const row = page.locator('.product-card', { hasText: 'Anastrozole Capsule' });
  await expect(row.locator('.product-card-info > p')).toBeVisible();
  await expect(row.locator('.catalog-row-toggle')).toBeHidden();
  await expect(page.locator('.catalog-count').first()).toBeHidden();
  await expect(page.locator('.catalog-toolbar')).toBeHidden();
  expect(errors).toEqual([]);
});

// The Lab Panel "Biomarkers We Test" block.
const acc = (name) => `<div class="acc w-dropdown"><div class="acc-toggle w-dropdown-toggle"><div class="acc-toggle-main"><h4 class="d6">${name}</h4></div></div>
  <nav class="acc-list w-dropdown-list"><p>About ${name}.</p></nav></div>`;
const group = (id, title, names) => `<div class="lab-tests-group"><div class="lab-tests-group-label"><h3 class="d4">${title}</h3></div>
  <div class="lab-tests-list">${names.map(acc).join('')}</div><div id="${id}" class="anchor-extension is-full"></div></div>`;
const lab = `<div class="lab-tests"><div class="lab-tests-nav">
  <div class="search-form-only is_lab w-form"><form class="search-form" method="get" action="/submitted"><div class="search-form-w">
    <input class="search-form-input w-input" name="Search-Query" placeholder="Search Test..." type="text" required></div></form></div>
  <div class="lab-tests-nav-list">
    <a href="#Male-Hormone-Panel" class="lab-tests-nav-link"><div class="lab-tests-nav-label"><div class="body-sm">Male Hormone Panel</div></div></a>
    <a href="#Metabolic-Panel" class="lab-tests-nav-link"><div class="lab-tests-nav-label"><div class="body-sm">Metabolic Panel</div></div></a>
  </div></div>
  <div class="lab-tests-main">
    ${group('Male-Hormone-Panel', 'Hormone Panel', ['Total Testosterone', 'Free Testosterone', 'Estradiol'])}
    ${group('Metabolic-Panel', 'Metabolic Panel', ['CMP (Comprehensive Metabolic Panel)', 'Cortisol'])}
  </div></div>`;

test('lab panel: search narrows biomarkers, counts follow, Enter does not submit', async ({ page }) => {
  const errors = await setup(page, lab);
  await expect(page.locator('a[href="#Male-Hormone-Panel"] .lab-tests-count')).toHaveText('(3)');
  const input = page.locator('.search-form-input');
  await input.fill('testo');
  await expect(page.locator('.acc', { hasText: 'Estradiol' })).toBeHidden();
  await expect(page.locator('.acc', { hasText: 'Free Testosterone' })).toBeVisible();
  await expect(page.locator('a[href="#Male-Hormone-Panel"] .lab-tests-count')).toHaveText('(2)');
  await expect(page.locator('.lab-tests-group', { hasText: 'Cortisol' })).toBeHidden();
  await expect(page.locator('a[href="#Metabolic-Panel"]')).toBeHidden();
  await input.press('Enter');
  expect(page.url()).toBe('https://site.test/');
  await input.fill('zzz');
  await expect(page.locator('.lab-tests-empty')).toBeVisible();
  await page.locator('.lab-tests-empty-clear').click();
  await expect(page.locator('.acc')).toHaveCount(5);
  await expect(page.locator('.acc', { hasText: 'Cortisol' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('lab panel: counts are phone-only', async ({ page }) => {
  const errors = await setup(page, lab, 1440);
  await expect(page.locator('.lab-tests-count').first()).toBeHidden();
  expect(errors).toEqual([]);
});
