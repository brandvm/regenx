import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');

const card = n => `
  <div class="swiper-slide sb-benefit-slide">
    <div class="sb-benefit-card is_slider">
      <div class="sb-benefit-card-media is_slider"></div>
      <div class="sb-benefit-card-main">
        <div class="body-sm">Lorem Ipsum</div>
        <h3>Benefit ${n}</h3>
        <a href="#" class="pagination-button is_read-more">Read More</a>
      </div>
    </div>
  </div>`;

const pane = (tab, active) => `
  <div class="w-tab-pane sb-tab-pane${active ? ' w--tab-active' : ''}" data-w-tab="${tab}">
    <div class="sb-benefit-slider-w" data-benefit-slider>
      <div class="swiper sb-benefit-slider"><div class="swiper-wrapper">
        ${[1, 2, 3, 4].map(card).join('')}
      </div></div>
      <div class="sb-benefit-pagination"></div>
    </div>
  </div>`;

const fixture = `
  <section class="section s-enclo-benefits">
    <div class="w-tabs" data-benefit-tabs>
      <div class="w-tab-menu sb-tabs-menu">
        <a class="w-tab-link sb-tab-link w--current" data-w-tab="Tab 1">
          <svg class="sb-tab-link-caret" viewBox="0 0 12 12"><path d="M1 3h10L6 9.5z"/></svg>
          <h3>Benefits</h3><svg class="service-tab-menu-icon" viewBox="0 0 28 6"></svg>
        </a>
        <a class="w-tab-link sb-tab-link" data-w-tab="Tab 2">
          <svg class="sb-tab-link-caret" viewBox="0 0 12 12"><path d="M1 3h10L6 9.5z"/></svg>
          <h3>Comparison</h3><svg class="service-tab-menu-icon" viewBox="0 0 28 6"></svg>
        </a>
      </div>
      <div class="w-tab-content">${pane('Tab 1', true)}${pane('Tab 2', false)}</div>
    </div>
  </section>`;

async function setup(page) {
  const errors = [];
  const warnings = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /\[RegenX\].*failed/.test(message.text())) errors.push(message.text());
    if (message.type() === 'warning' && /Swiper/i.test(message.text())) warnings.push(message.text());
  });
  await page.setContent(fixture);
  await page.addStyleTag({ content: css });
  // Stand in for the Webflow-authored layout: panel width, tab visibility,
  // slide widths and breakpoints match the Designer classes.
  await page.addStyleTag({ content: `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: sans-serif; }
    .s-enclo-benefits { max-width: 1200px; margin: auto; }
    .sb-tab-link { display: flex; gap: 1em; align-items: center; height: 4em; }
    .w-tab-pane { display: none; }
    .w-tab-pane.w--tab-active { display: block; }
    .sb-benefit-slider-w { display: flex; flex-direction: column; gap: 2em; }
    .swiper.sb-benefit-slider { width: 100%; min-width: 0; margin: 0; }
    .swiper-slide.sb-benefit-slide { display: flex; width: 57%; height: auto; flex: none; }
    .sb-benefit-card { display: flex; width: 100%; min-height: 240px; padding: 2em; gap: 2em; background: #fff; }
    .sb-benefit-card-media { width: 50%; aspect-ratio: 1; background: #ddd; flex: none; }
    .sb-tab-link-caret { display: none; width: .75em; height: .75em; }
    .sb-benefit-pagination { display: flex; justify-content: center; gap: .5em; }
    @media (max-width: 767px) { .swiper-slide.sb-benefit-slide { width: 88%; } }
  ` });
  await page.evaluate(() => { window.Webflow = { env: () => false, push: fn => fn() }; });
  await page.addScriptTag({ content: js });
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  await expect.poll(() => page.locator('.w--tab-active .sb-benefit-slider').evaluate(el => !!el.swiper)).toBe(true);
  return { errors, warnings };
}

const active = page => page.locator('.w--tab-active');

async function centredOffset(page) {
  return active(page).evaluate(scope => {
    const slider = scope.querySelector('.sb-benefit-slider').getBoundingClientRect();
    const slide = scope.querySelector('.swiper-slide-active').getBoundingClientRect();
    return Math.abs((slide.left + slide.width / 2) - (slider.left + slider.width / 2));
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`benefit slider centres a looping card with pagination at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const { errors, warnings } = await setup(page);
    const slider = active(page).locator('.sb-benefit-slider');

    expect(await slider.evaluate(el => el.swiper.params.loop)).toBe(true);
    await expect(active(page).locator('.swiper-pagination-bullet')).toHaveCount(4);
    await expect(active(page).locator('.swiper-pagination-bullet-active')).toHaveCount(1);
    expect(await slider.evaluate(el => el.swiper.realIndex)).toBe(0);
    expect(await centredOffset(page)).toBeLessThan(2);

    // A looping centred card has a neighbour on both sides from the start.
    const neighbours = await slider.evaluate(el => {
      const box = el.getBoundingClientRect();
      const active = el.querySelector('.swiper-slide-active').getBoundingClientRect();
      const slides = [...el.querySelectorAll('.swiper-slide')].map(s => s.getBoundingClientRect());
      return {
        left: slides.some(r => r.right > box.left && r.right <= active.left),
        right: slides.some(r => r.left < box.right && r.left >= active.right),
      };
    });
    expect(neighbours).toEqual({ left: true, right: true });

    await active(page).locator('.swiper-pagination-bullet').nth(2).click();
    await expect.poll(() => slider.evaluate(el => el.swiper.realIndex)).toBe(2);
    await expect(active(page).locator('.swiper-pagination-bullet').nth(2)).toHaveClass(/swiper-pagination-bullet-active/);
    await expect.poll(() => centredOffset(page)).toBeLessThan(2);

    // Wrap forward past the last card and back around to the first; this may
    // land on a loop copy, so compare the authored card position.
    // slideToLoop moves on the next animation frame.
    await slider.evaluate(el => el.swiper.slideToLoop(3, 0));
    await expect.poll(() => slider.evaluate(el => el.swiper.realIndex % 4)).toBe(3);
    await slider.evaluate(el => el.swiper.slideNext(0));
    expect(await slider.evaluate(el => el.swiper.realIndex % 4)).toBe(0);
    await expect(active(page).locator('.swiper-pagination-bullet').nth(0)).toHaveClass(/swiper-pagination-bullet-active/);
    await expect.poll(() => centredOffset(page)).toBeLessThan(2);

    expect(warnings).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('benefit slider in a hidden tab initializes when the tab opens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { errors } = await setup(page);
  const hidden = page.locator('[data-w-tab="Tab 2"].w-tab-pane .sb-benefit-slider');
  expect(await hidden.evaluate(el => !!el.swiper)).toBe(false);

  await page.evaluate(() => {
    document.querySelectorAll('.w-tab-pane, .w-tab-link').forEach(el => {
      el.classList.remove('w--tab-active', 'w--current');
    });
    document.querySelector('.w-tab-pane[data-w-tab="Tab 2"]').classList.add('w--tab-active');
    document.querySelector('.w-tab-link[data-w-tab="Tab 2"]').classList.add('w--current');
  });

  await expect.poll(() => hidden.evaluate(el => !!el.swiper)).toBe(true);
  await expect(active(page).locator('.swiper-pagination-bullet')).toHaveCount(4);
  await expect.poll(() => centredOffset(page)).toBeLessThan(2);
  await expect(page.locator('.w-tab-link.w--current .sb-tab-link-caret')).toBeVisible();
  await expect(page.locator('.w-tab-link:not(.w--current) .sb-tab-link-caret')).toBeHidden();
  expect(errors).toEqual([]);
});

test('benefit pagination bullets are keyboard operable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  const bullet = active(page).locator('.swiper-pagination-bullet').nth(1);
  await expect(bullet).toHaveJSProperty('tagName', 'BUTTON');
  await expect(bullet).toHaveAttribute('aria-label', 'Go to benefit 2');
  await bullet.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => active(page).locator('.sb-benefit-slider').evaluate(el => el.swiper.realIndex % 4)).toBe(1);
  await expect(bullet).toHaveAttribute('aria-current', 'true');
});

test('four authored cards get hidden loop copies that are removed on destroy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { warnings } = await setup(page);
  const slider = active(page).locator('.sb-benefit-slider');
  await expect(slider.locator('.swiper-slide')).toHaveCount(8);
  await expect(slider.locator('[data-benefit-clone]')).toHaveCount(4);
  await expect(slider.locator('[data-benefit-clone][aria-hidden="true"]')).toHaveCount(4);
  await expect(slider.locator('[data-benefit-clone] a[tabindex="-1"]')).toHaveCount(4);
  expect(warnings).toEqual([]);

  // SmartSwiper may rebuild a visible slider later, so count synchronously.
  const afterDestroy = await slider.evaluate(el => {
    el.swiper.destroy(true, true);
    return {
      slides: el.querySelectorAll('.swiper-slide').length,
      bullets: el.closest('[data-benefit-slider]').querySelectorAll('.swiper-pagination-bullet').length,
    };
  });
  expect(afterDestroy).toEqual({ slides: 4, bullets: 0 });
});
