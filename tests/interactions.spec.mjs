import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The former Webflow interactions (docs/handoff/INTERACTIONS.md), run from
// the built bundle on markup as Webflow publishes it, with the data-*
// hooks the Designer adds.
const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');

async function setup(page, body, { width = 1440, height = 900, script = true } = {}) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.route('https://site.test/', (route) => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head><style>${css}</style></head><body style="margin:0">${body}${script ? `<script>${js}</script>` : ''}</body></html>`,
  }));
  await page.goto('https://site.test/');
  if (script) await page.waitForFunction(() => document.documentElement.classList.contains('rgx-ready'));
  return errors;
}

const style = (sel, prop) => (page) => page.$eval(sel, (el, prop) => getComputedStyle(el)[prop], prop);
const translateY = (page, sel) => page.$eval(sel, (el) => new DOMMatrix(getComputedStyle(el).transform).m42);

// C | Button as published: label with the Designer's text-shadow copy, icon circle.
const button = `<a href="#" class="button-link" data-hover-roll="tablet-up" style="display:inline-flex;margin:40px">
  <div class="button-icon-w" data-hover-roll-icon style="width:36px;height:36px;background:#eee;color:#000">→</div>
  <div class="button-label" data-hover-roll-text style="font-size:20px;line-height:1;text-shadow:0 1.2em;overflow:hidden">Get Started</div></a>`;

test('hover roll splits the label on first hover, rolls it one shadow height, and plays back on leave', async ({ page }) => {
  const errors = await setup(page, button);
  await expect(page.locator('.gsap_split_letter')).toHaveCount(0);
  await page.hover('.button-link');
  await page.waitForTimeout(1200);
  await expect(page.locator('.gsap_split_letter')).toHaveCount(10);
  expect(await translateY(page, '.gsap_split_letter')).toBeCloseTo(-24, 0);
  expect(await style('.button-icon-w', 'backgroundColor')(page)).toBe('rgb(216, 255, 76)');
  // will-change only while the letters move.
  expect(await style('.gsap_split_letter', 'willChange')(page)).toBe('auto');
  await page.mouse.move(1, 1);
  await page.waitForTimeout(1200);
  expect(await translateY(page, '.gsap_split_letter')).toBeCloseTo(0, 0);
  expect(await style('.button-icon-w', 'backgroundColor')(page)).toBe('rgb(238, 238, 238)');
  // The link keeps a readable name (not "G e t …"), and the role-less label
  // div gets no aria-label (audit #26).
  await expect(page.locator('.button-link')).toHaveAttribute('aria-label', 'Get Started');
  await expect(page.locator('.button-label')).not.toHaveAttribute('aria-label', /.*/);
  expect(errors).toEqual([]);
});

test('button hover roll is off below 768px and with reduced motion', async ({ page }) => {
  const errors = await setup(page, button, { width: 600 });
  await page.hover('.button-link');
  await page.waitForTimeout(300);
  await expect(page.locator('.gsap_split_letter')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.mouse.move(1, 1);
  await page.hover('.button-link');
  await page.waitForTimeout(300);
  await expect(page.locator('.gsap_split_letter')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// C | Accordion as published, with Webflow's dropdown script stood in for
// by toggling w--open on the toggle and list.
const accordion = `<div class="acc w-dropdown" data-acc>
  <div class="w-dropdown-toggle" tabindex="0">Question
    <div class="acc-icon-w"><div data-acc-icon="add">+</div><div data-acc-icon="subtract" style="opacity:0">−</div></div></div>
  <nav class="w-dropdown-list" style="overflow:hidden"><div style="height:200px">Answer</div></nav></div>`;
const toggle = (page) => page.evaluate(() => document.querySelectorAll('.acc > *').forEach((el) => el.classList.toggle('w--open')));

test('accordion motion grows the open list to its height and hides it again after closing', async ({ page }) => {
  const errors = await setup(page, accordion);
  expect(await style('.w-dropdown-list', 'display')(page)).toBe('none');
  await toggle(page);
  await page.waitForTimeout(200);
  const mid = await page.$eval('.w-dropdown-list', (el) => el.getBoundingClientRect().height);
  expect(mid).toBeGreaterThan(0);
  expect(mid).toBeLessThan(200);
  await page.waitForTimeout(900);
  expect(await page.$eval('.w-dropdown-list', (el) => el.getBoundingClientRect().height)).toBe(200);
  expect(await page.$eval('.w-dropdown-list', (el) => el.style.height)).toBe('');
  expect(await style('[data-acc-icon="add"]', 'opacity')(page)).toBe('0');
  expect(await style('[data-acc-icon="subtract"]', 'opacity')(page)).toBe('1');
  await toggle(page);
  await page.waitForTimeout(300);
  expect(await style('.w-dropdown-list', 'display')(page)).toBe('block');
  await page.waitForTimeout(800);
  expect(await style('.w-dropdown-list', 'display')(page)).toBe('none');
  expect(await style('[data-acc-icon="add"]', 'opacity')(page)).toBe('1');
  expect(errors).toEqual([]);
});

// G | Nav's menu button, panel and backdrop.
const nav = `<div class="g-nav-overlay" data-nav-overlay style="position:fixed;inset:0;background:rgba(0,0,0,.25)"></div>
  <div data-nav-menu style="display:flex;width:300px;height:200px">Links</div>
  <button data-nav-menu-button type="button"><svg data-nav-menu-icon width="16" height="16"></svg>Menu</button>`;

test('menu button opens and closes the panel and backdrop up to 991px', async ({ page }) => {
  const errors = await setup(page, nav, { width: 800 });
  const button = page.locator('[data-nav-menu-button]');
  expect(await style('[data-nav-menu]', 'display')(page)).toBe('none');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.click();
  await page.waitForTimeout(1000);
  expect(await style('[data-nav-menu]', 'display')(page)).toBe('block');
  expect(await style('[data-nav-menu]', 'opacity')(page)).toBe('1');
  expect(await style('[data-nav-overlay]', 'opacity')(page)).toBe('1');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  // The open backdrop covers the button; on the site Finsweet mirror-clicks it.
  await button.dispatchEvent('click');
  await page.waitForTimeout(1000);
  expect(await style('[data-nav-menu]', 'display')(page)).toBe('none');
  expect(await style('[data-nav-overlay]', 'display')(page)).toBe('none');
  // Desktop: the panel is the link row, left as the Designer has it.
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.waitForTimeout(100);
  expect(await style('[data-nav-menu]', 'display')(page)).toBe('flex');
  await expect(button).not.toHaveAttribute('aria-expanded', /.*/);
  expect(errors).toEqual([]);
});

const statement = `<div style="height:1200px"></div>
  <div data-statement style="font-size:40px"><div data-statement-text>Integrated care <span data-media-scroll style="display:inline-block;width:60px;height:30px;background:#333"></span> for every patient.</div></div>
  <div style="height:1500px"></div>`;

test('statement words and images start hidden and scrub in with the scroll', async ({ page }) => {
  const errors = await setup(page, statement);
  expect(await style('.gsap_split_word', 'opacity')(page)).toBe('0');
  expect(await style('[data-media-scroll]', 'opacity')(page)).toBe('0');
  await page.evaluate(() => { window.lenis?.scrollTo(1500, { immediate: true, force: true }); window.scrollTo(0, 1500); });
  await page.waitForTimeout(2000);
  expect(await style('.gsap_split_word', 'opacity')(page)).toBe('1');
  expect(await style('[data-media-scroll]', 'opacity')(page)).toBe('1');
  expect(errors).toEqual([]);
});

test('statement keeps its Designer state with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await setup(page, statement);
  await expect(page.locator('.gsap_split_word')).toHaveCount(0);
  expect(await style('[data-media-scroll]', 'opacity')(page)).toBe('1');
  expect(errors).toEqual([]);
});

test('process fill scales with the scroll instead of changing its width', async ({ page }) => {
  const errors = await setup(page, `<section data-process-scroll style="height:2900px">
      <div style="position:sticky;top:0;overflow:hidden"><div data-process-scroll-track style="display:flex;width:1000px;height:100px"></div>
      <div style="width:1000px;height:4px"><div data-process-scroll-fill style="width:100%;height:100%;background:#000"></div></div></div>
    </section><div style="height:900px"></div>`);
  await page.evaluate(() => { window.lenis?.scrollTo(1000, { immediate: true, force: true }); window.scrollTo(0, 1000); });
  await page.waitForTimeout(2000);
  const fill = await page.$eval('[data-process-scroll-fill]', (el) => ({ w: el.getBoundingClientRect().width, css: el.style.width }));
  expect(fill.w).toBeCloseTo(500, -1);
  expect(fill.css).toBe('100%');
  expect(await page.$eval('[data-process-scroll-track]', (el) => el.getBoundingClientRect().x)).toBeCloseTo(-500, -1);
  expect(errors).toEqual([]);
});

test('tooltip card drops in on hover and leaves on mouse out', async ({ page }) => {
  const errors = await setup(page, `<div data-tooltip style="position:relative;margin:200px;width:40px;height:40px">
      <div data-tooltip-icon style="width:20px;height:20px">+</div>
      <div data-tooltip-content style="position:absolute;bottom:50%;opacity:0;transform:scale(.9)">Back muscles</div></div>`);
  await page.hover('[data-tooltip]');
  await page.waitForTimeout(1000);
  expect(await style('[data-tooltip-content]', 'opacity')(page)).toBe('1');
  await page.mouse.move(1, 1);
  await page.waitForTimeout(1000);
  expect(await style('[data-tooltip-content]', 'opacity')(page)).toBe('0');
  expect(errors).toEqual([]);
});

test('elements that move from a hidden start stay hidden until the bundle boots', async ({ page }) => {
  await setup(page, `<script>document.documentElement.classList.add('is-loading')</script>
    <div data-about-hero-video>video</div><div data-statement-text>words</div><div data-process-scroll-track>track</div>`, { script: false });
  expect(await style('[data-about-hero-video]', 'visibility')(page)).toBe('hidden');
  expect(await style('[data-statement-text]', 'visibility')(page)).toBe('hidden');
  expect(await style('[data-process-scroll-track]', 'visibility')(page)).toBe('visible');
});
