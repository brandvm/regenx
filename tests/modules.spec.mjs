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
const logoRow = `<div data-marquee-mask style="overflow:hidden;width:600px"><div data-marquee style="display:flex;flex-wrap:wrap">
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
  // The wrapper fades both edges while the row runs.
  expect(await page.locator('[data-marquee-mask]').evaluate((el) => getComputedStyle(el).maskImage)).toContain('linear-gradient');
  expect(errors).toEqual([]);
});

test('marquee stays a static row under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await setup(page, logoRow);
  const row = page.locator('[data-marquee]');
  await expect(row.locator(':scope > *')).toHaveCount(4);
  await expect(row).not.toHaveClass(/is-marquee/);
  expect(await page.locator('[data-marquee-mask]').evaluate((el) => getComputedStyle(el).maskImage)).toBe('none');
  expect(errors).toEqual([]);
});

// The Peptide Therapy disclaimer, as built in Webflow.
const disclaimer = `<main><h1>Peptide Therapy</h1><a href="/">Home</a></main>
<div data-modal="peptide-disclaimer" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)">
  <div data-modal-panel style="background:#f7f7f7;padding:40px;position:relative">
    <button type="button" data-modal-close aria-label="Close">×</button>
    <h2>Important Disclaimer</h2><p>This page provides general information…</p>
    <label><input type="checkbox" data-disclaimer-agree> I understand</label>
    <button type="button" data-disclaimer-cancel>Cancel</button>
    <button type="button" data-disclaimer-continue>Continue</button>
  </div>
</div>`;

test('peptide disclaimer opens on load, needs consent, and is remembered once accepted', async ({ page }) => {
  const errors = await setup(page, disclaimer);
  const dialog = page.getByRole('dialog', { name: 'Important Disclaimer' });
  await expect(dialog).toBeVisible();
  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeDisabled();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await page.getByLabel('I understand').check();
  await expect(cont).toBeEnabled();
  await cont.click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('rgx-peptide-disclaimer'))).toBe('accepted');
  expect(new URL(page.url()).hash).toBe('');
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains('rgx-ready'));
  await expect(page.locator('[data-modal="peptide-disclaimer"]')).toBeHidden();
  expect(errors).toEqual([]);
});

test('closing the disclaimer without consent only dismisses it for this visit', async ({ page }) => {
  await setup(page, disclaimer);
  await expect(page.getByRole('dialog', { name: 'Important Disclaimer' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-modal="peptide-disclaimer"]')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('rgx-peptide-disclaimer'))).toBeNull();
});

// The Medical Catalog sidebar.
const catalog = `<style>section{height:1200px}</style>
<div class="services-main-nav-list is-catalog" style="position:fixed;top:0;left:0">
  <a class="services-main-nav-link" href="#Testosterone-Products">Testosterone Products</a>
  <a class="services-main-nav-link" href="#Vitamins-Aminos">Vitamins &amp; Aminos</a>
</div>
<section><div id="Testosterone-Products"></div>T</section>
<section><div id="Vitamins-Aminos"></div>V</section>`;

test('catalog sidebar marks the category in view as active', async ({ page }) => {
  const errors = await setup(page, catalog);
  const links = page.locator('.services-main-nav-link');
  await expect(links.nth(0)).toHaveClass(/is-active/);
  await expect(links.nth(0)).toHaveAttribute('aria-current', 'true');
  expect(await links.nth(0).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(0, 0, 0)');
  await page.evaluate(() => window.scrollTo(0, 1300));
  await expect(links.nth(1)).toHaveClass(/is-active/);
  await expect(links.nth(0)).not.toHaveClass(/is-active/);
  expect(errors).toEqual([]);
});

// A mobile card row as Webflow styles it at ≤478px: a scroll-snap row whose
// cards are wider than half the row.
const snapRow = (width) => `<style>
  .why-main { display: flex; gap: 12px; width: ${width}px; overflow-x: auto; scroll-snap-type: x mandatory; }
  .why-item { flex: none; width: 296px; height: 200px; scroll-snap-align: start; background: #ddd; }
</style>
<section style="display:flex;flex-direction:column;gap:48px">
  <div class="why-main">${[1, 2, 3, 4].map((n) => `<div class="why-item">Card ${n}</div>`).join('')}</div>
</section>`;

test('snap dots add one dot per card to a row that scrolls, and follow it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const errors = await setup(page, snapRow(343));
  const dots = page.locator('.snap-dot');
  await expect(dots).toHaveCount(4);
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');
  await expect(dots.nth(2)).toHaveAttribute('aria-label', 'Go to card 3 of 4');

  await dots.nth(2).click();
  await expect.poll(() => page.locator('.why-main').evaluate((el) => el.scrollLeft)).toBeGreaterThan(600);
  await expect(dots.nth(2)).toHaveAttribute('aria-current', 'true');
  await expect(dots.nth(0)).not.toHaveAttribute('aria-current', 'true');

  // The dots sit 1.5rem under the row, whatever gap the row's parent uses.
  const space = await page.evaluate(() => ({
    gap: document.querySelector('.snap-dots').getBoundingClientRect().top
      - document.querySelector('.why-main').getBoundingClientRect().bottom,
    rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
  }));
  expect(Math.round(space.gap)).toBe(Math.round(space.rem * 1.5));
  expect(errors).toEqual([]);
});

test('snap dots follow the order cards are shown in, not the markup order', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const errors = await setup(page, snapRow(343).replace('<div class="why-item">Card 1</div>', '<div class="why-item" style="order:99">Card 1</div>'));
  const dots = page.locator('.snap-dot');
  await expect(dots).toHaveCount(4);
  await dots.nth(3).click();
  await expect.poll(() => page.locator('.why-item').first().evaluate((el) => {
    const row = el.parentElement.getBoundingClientRect();
    return Math.round(el.getBoundingClientRect().right - row.right);
  })).toBeLessThanOrEqual(1);
  await expect(dots.nth(3)).toHaveAttribute('aria-current', 'true');
  expect(errors).toEqual([]);
});

test('snap dots stay away from a row that fits, and leave when it stops scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await setup(page, snapRow(1400));
  await expect(page.locator('.snap-dots')).toHaveCount(0);

  await page.locator('.why-main').evaluate((el) => { el.style.width = '343px'; });
  await expect(page.locator('.snap-dot')).toHaveCount(4);
  await page.locator('.why-main').evaluate((el) => { el.style.width = '1400px'; });
  await expect(page.locator('.snap-dots')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('snap rows with cards of different heights take the height of the card in view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const errors = await setup(page, snapRow(343).replace(/why-main/g, 'diagnosis-main').replace(/why-item/g, 'diagnosis-card')
    .replace('<div class="diagnosis-card">Card 2</div>', '<div class="diagnosis-card" style="height:600px">Card 2</div>')
    .replace('.diagnosis-main {', '.diagnosis-main { align-items: flex-start;'));
  const row = page.locator('.diagnosis-main');
  await expect.poll(() => row.evaluate((el) => el.getBoundingClientRect().height)).toBe(200);
  await page.locator('.snap-dot').nth(1).click();
  await expect.poll(() => row.evaluate((el) => el.getBoundingClientRect().height)).toBe(600);
  expect(await row.evaluate((el) => getComputedStyle(el).overflowY)).toBe('hidden');
  expect(errors).toEqual([]);
});

// Accordions as Webflow publishes them: `.acc` dropdowns, with a stand-in for
// the jQuery data and handlers Webflow's dropdown module attaches.
const accordions = `
<div class="faqs-w w-dyn-list"><div class="w-dyn-items">
  ${[1, 2, 3].map((n) => `<div class="w-dyn-item"><div class="acc w-dropdown" id="faq${n}">
    <div class="w-dropdown-toggle" tabindex="0" aria-expanded="false">Q${n}</div><nav class="w-dropdown-list">A${n}</nav></div></div>`).join('')}
</div></div>
<div class="sd-content">
  ${[1, 2].map((n) => `<div class="acc w-dropdown" id="sd${n}">
    <div class="w-dropdown-toggle" tabindex="0" aria-expanded="false">S${n}</div><nav class="w-dropdown-list">B${n}</nav></div>`).join('')}
</div>
<div class="lab-tests-list" style="display:none">
  <div class="acc w-dropdown" id="hidden1"><div class="w-dropdown-toggle" aria-expanded="false">H</div><nav class="w-dropdown-list">H</nav></div>
</div>
<script>
  // Webflow binds per dropdown: w-close / focusout on the root, a mouseup
  // handler on the toggle, and keeps its state in jQuery data.
  const store = new Map(); const handlers = new Map(); window.log = [];
  const on = (el, ev, fn) => { if (!handlers.has(el)) handlers.set(el, {}); handlers.get(el)[ev] = fn; };
  document.querySelectorAll('.acc').forEach((acc) => {
    const state = { open: false, mouseUpOutside: () => window.log.push('outside-close ' + acc.id) };
    store.set(acc, state);
    on(acc, 'w-close.w-dropdown', () => window.log.push('w-close ' + acc.id));
    on(acc, 'focusout.w-dropdown', () => window.log.push('focusout ' + acc.id));
    on(acc.firstElementChild, 'mouseup.w-dropdown', () => {
      state.open = !state.open;
      acc.firstElementChild.setAttribute('aria-expanded', String(state.open));
    });
  });
  window.jQuery = Object.assign((el) => ({
    off: (ev) => { delete (handlers.get(el) || {})[ev]; },
    triggerHandler: (ev) => (handlers.get(el) || {})[ev]?.(),
  }), { data: (el) => store.get(el) });
  window.accState = (id) => ({ open: store.get(document.getElementById(id)).open, handlers: Object.keys(handlers.get(document.getElementById(id)) || {}) });
</script>`;

test('accordions open the first visible item of each group and stop closing each other', async ({ page }) => {
  const errors = await setup(page, accordions);
  const state = (id) => page.evaluate((id) => window.accState(id), id);
  expect((await state('faq1')).open).toBe(true);
  expect((await state('faq2')).open).toBe(false);
  expect((await state('sd1')).open).toBe(true);
  expect((await state('sd2')).open).toBe(false);
  expect((await state('hidden1')).open).toBe(false);
  await expect(page.locator('#faq1 > .w-dropdown-toggle')).toHaveAttribute('aria-expanded', 'true');
  // Webflow's own ways of closing a dropdown from outside are gone.
  expect((await state('faq2')).handlers).toEqual([]);
  expect(await page.evaluate(() => { window.jQuery.data(document.getElementById('faq1')).mouseUpOutside(); return window.log; })).toEqual([]);
  expect(errors).toEqual([]);
});

test('accordions do nothing without Webflow', async ({ page }) => {
  const errors = await setup(page, accordions.replace(/<script>[\s\S]*<\/script>/, ''));
  await expect(page.locator('#faq1 > .w-dropdown-toggle')).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});
