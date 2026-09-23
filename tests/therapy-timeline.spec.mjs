import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
const stage = (start, end) => `
  <div class="swiper-slide therapy-timeline-stage" data-week-start="${start}" data-week-end="${end}">
    <span class="therapy-timeline-badge">${start}–${end} weeks</span>
    <p>Editable milestone description for weeks ${start}–${end}.</p>
  </div>`;

function fixture({ future = false, neighbor = false } = {}) {
  return `
    <section data-therapy-timeline data-timeline-origin="0" data-timeline-weeks="12">
      <header><h2>Peptide Therapy Results Timeline</h2>
        <button type="button" data-timeline-prev aria-label="Previous milestone">←</button>
        <button type="button" data-timeline-next aria-label="Next milestone">→</button>
      </header>
      <div class="therapy-timeline-panel">
        <div class="swiper therapy-timeline-slider"><div class="swiper-wrapper therapy-timeline-track">
          ${stage(1, 4)}${stage(6, 12)}${future ? stage(13, 24) : ''}
        </div></div>
        <div class="inner-controls">
          <button type="button" data-timeline-prev aria-label="Previous milestone">←</button>
          <button type="button" data-timeline-next aria-label="Next milestone">→</button>
        </div>
        <div class="therapy-timeline-ruler" data-timeline-ruler><div class="therapy-timeline-ruler-track" data-timeline-ruler-track></div></div>
      </div>
    </section>
    ${neighbor ? `<div class="s-wrapper card-row-carousel">
      <button class="swiper-prev">Previous cards</button><button class="swiper-next">Next cards</button>
      <div class="swiper card-row-slider"><div class="swiper-wrapper">
        ${[1, 2, 3, 4, 5, 6].map(n => `<div class="swiper-slide">Card ${n}</div>`).join('')}
      </div></div>
    </div>` : ''}`;
}

async function setup(page, options = {}) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /\[RegenX\].*failed/.test(message.text())) errors.push(message.text());
  });
  await page.setContent(fixture(options));
  await page.addStyleTag({ content: css });
  // Stand in for Designer's native page layout while keeping the production
  // Swiper and timeline CSS. Both viewports deliberately share an exact origin.
  await page.addStyleTag({ content: `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: sans-serif; }
    [data-therapy-timeline] { max-width: 1200px; margin: auto; }
    [data-therapy-timeline] header { min-height: 90px; display: flex; align-items: center; gap: 12px; }
    [data-therapy-timeline] h2 { flex: 1; font-size: 24px; }
    [data-therapy-timeline] button { width: 44px; height: 36px; }
    .therapy-timeline-panel { padding: 0; }
    .therapy-timeline-slider { width: 100%; height: 200px; overflow: hidden; }
    .therapy-timeline-stage { padding: 24px; min-height: 180px; flex-basis: 50%; flex-direction: column; gap: 1em; }
    @media (max-width: 767px) { .therapy-timeline-stage { flex-basis: 100%; } }
    .inner-controls { display: flex; justify-content: space-between; margin: 12px 0; }
    [data-timeline-ruler] { position: relative; width: 100%; overflow: hidden; height: 70px; }
    [data-timeline-ruler-track] { position: relative; width: 100%; height: 100%; }
    .card-row-carousel { margin: 32px auto 0; max-width: 600px; }
    .card-row-slider { height: 80px; }
  ` });
  await page.evaluate(() => { window.Webflow = { env: () => false, push: fn => fn() }; });
  await page.addScriptTag({ content: js });
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  await expect.poll(() => page.locator('.therapy-timeline-slider').evaluate(el => !!el.swiper)).toBe(true);
  await expect(page.locator('[data-timeline-week="6"]')).toHaveCount(1);
  return errors;
}

const prev = page => page.locator('[data-timeline-prev]');
const next = page => page.locator('[data-timeline-next]');

async function geometry(page) {
  return page.evaluate(() => {
    const slider = document.querySelector('.therapy-timeline-slider');
    const style = getComputedStyle(slider);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const stages = [...slider.querySelectorAll('.therapy-timeline-stage')].map(el => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });
    const tick = week => document.querySelector(`[data-timeline-week="${week}"]`).getBoundingClientRect().left;
    return {
      stages,
      left: slider.getBoundingClientRect().left + paddingLeft,
      // Swiper measures its viewport with integer padding values.
      width: slider.clientWidth - Math.trunc(paddingLeft) - Math.trunc(paddingRight),
      tick0: tick(0), tick1: tick(1), tick6: tick(6), tick12: tick(12),
      animating: slider.swiper.animating,
    };
  });
}

async function settled(page) {
  await expect.poll(async () => (await geometry(page)).animating).toBe(false);
  await expect.poll(async () => {
    const g = await geometry(page);
    return Math.abs(g.tick6 - g.stages[1].left);
  }).toBeLessThan(1);
}

async function expectButtons(page, { previous, following }) {
  for (let index = 0; index < 2; index++) {
    if (previous) await expect(prev(page).nth(index)).toBeEnabled();
    else await expect(prev(page).nth(index)).toBeDisabled();
    if (following) await expect(next(page).nth(index)).toBeEnabled();
    else await expect(next(page).nth(index)).toBeDisabled();
  }
}

test('two desktop milestones fit a continuous 0–12 week ruler and lock all navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await setup(page);
  await expectButtons(page, { previous: false, following: false });
  const g = await geometry(page);
  expect(g.stages).toHaveLength(2);
  expect(g.stages[0].left).toBeCloseTo(g.left, 0);
  expect(g.stages[0].width).toBeCloseTo(g.width / 2, 0);
  expect(g.stages[1].right).toBeCloseTo(g.left + g.width, 0);
  expect(g.tick6).toBeCloseTo(g.stages[1].left, 0);
  expect(g.tick12 - g.tick0).toBeCloseTo(12 * (g.tick1 - g.tick0), 0);
  expect(await page.locator('.therapy-timeline-stage').first().evaluate(el => {
    const style = getComputedStyle(el);
    return { display: style.display, direction: style.flexDirection, gapEm: parseFloat(style.rowGap) / parseFloat(style.fontSize) };
  })).toEqual({ display: 'flex', direction: 'column', gapEm: 1 });
  // Week 5 was absent in the visual reference; the usable ruler must not skip it.
  await expect(page.locator('[data-timeline-week="5"]')).toHaveText('5');
  expect(errors).toEqual([]);
});

test('mobile shows one stage and both button pairs share endpoints and keyboard operation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await setup(page);
  await expectButtons(page, { previous: false, following: true });
  const initial = await geometry(page);
  expect(initial.stages[0].width).toBeCloseTo(initial.width, 0);
  await next(page).first().focus();
  await page.keyboard.press('Enter');
  await expectButtons(page, { previous: true, following: false });
  await settled(page);
  expect((await geometry(page)).stages[1].left).toBeCloseTo(initial.left, 0);
  await prev(page).nth(1).click();
  await expectButtons(page, { previous: false, following: true });
  await settled(page);
  await next(page).nth(1).click();
  await expectButtons(page, { previous: true, following: false });
  await settled(page);
  await prev(page).first().focus();
  await page.keyboard.press('Space');
  await expectButtons(page, { previous: false, following: true });
  await settled(page);
  expect((await geometry(page)).stages[0].left).toBeCloseTo(initial.left, 0);
  expect(errors).toEqual([]);
});

test('responsive edge masks preserve the week scale and leave navigation unmasked', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await setup(page);
  for (const [width, fadeEm] of [[1440, 6], [991, 4], [390, 1.5]]) {
    await page.setViewportSize({ width, height: 900 });
    await expectButtons(page, { previous: false, following: width <= 767 });
    await settled(page);
    const g = await geometry(page);
    const masks = await page.evaluate(() => {
      const root = document.querySelector('[data-therapy-timeline]');
      const rootRect = root.getBoundingClientRect();
      const viewport = selector => {
        const el = root.querySelector(selector);
        const style = getComputedStyle(el);
        return {
          mask: style.maskImage,
          left: el.getBoundingClientRect().left,
          width: el.getBoundingClientRect().width,
          paddingLeft: parseFloat(style.paddingLeft),
          paddingRight: parseFloat(style.paddingRight),
          fontSize: parseFloat(style.fontSize),
          overflow: style.overflowX,
        };
      };
      const navigationMasks = [...root.querySelectorAll('[data-timeline-prev], [data-timeline-next]')].flatMap(button => {
        const images = [];
        for (let el = button; el && el !== root.parentElement; el = el.parentElement) images.push(getComputedStyle(el).maskImage);
        return images;
      });
      return {
        rootLeft: rootRect.left, rootWidth: rootRect.width,
        slider: viewport('.therapy-timeline-slider'), ruler: viewport('[data-timeline-ruler]'),
        trackMasks: [...root.querySelectorAll('.therapy-timeline-track, [data-timeline-ruler-track]')].map(el => getComputedStyle(el).maskImage),
        navigationMasks,
      };
    });
    for (const viewport of [masks.slider, masks.ruler]) {
      expect(viewport.mask).toContain('linear-gradient');
      expect(viewport.mask).toContain('rgba(0, 0, 0, 0)');
      expect(viewport.paddingLeft / viewport.fontSize).toBeCloseTo(fadeEm, 3);
      expect(viewport.paddingRight).toBeCloseTo(viewport.paddingLeft, 3);
      expect(viewport.left + viewport.paddingLeft).toBeCloseTo(masks.rootLeft, 0);
      expect(viewport.width - viewport.paddingLeft - viewport.paddingRight).toBeCloseTo(masks.rootWidth, 0);
      expect(viewport.overflow).toBe('hidden');
    }
    expect(masks.slider.mask).toBe(masks.ruler.mask);
    expect(masks.trackMasks).toEqual(['none', 'none']);
    expect(masks.navigationMasks.every(mask => mask === 'none')).toBe(true);
    expect(g.left).toBeCloseTo(masks.rootLeft, 0);
    expect(Math.abs(g.width - masks.rootWidth)).toBeLessThanOrEqual(2);
    expect(g.stages[0].left).toBeCloseTo(g.left, 0);
    expect(g.tick6).toBeCloseTo(g.stages[1].left, 0);
    if (width <= 767) {
      await next(page).nth(1).click();
      await settled(page);
      await expectButtons(page, { previous: true, following: false });
      expect((await geometry(page)).stages[1].left).toBeCloseTo(g.left, 0);
    }
  }
  expect(errors).toEqual([]);
});

test('future milestones extend the ruler at the same scale and controls stay scoped', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await setup(page, { future: true, neighbor: true });
  await expect.poll(() => page.locator('.card-row-slider').evaluate(el => !!el.swiper)).toBe(true);
  await expectButtons(page, { previous: false, following: true });
  const initial = await geometry(page);
  const tick24 = await page.locator('[data-timeline-week="24"]').evaluate(el => el.getBoundingClientRect().left);
  expect(tick24 - initial.tick0).toBeCloseTo(24 * (initial.tick1 - initial.tick0), 0);
  expect(initial.stages[2].right - initial.stages[0].left).toBeCloseTo(2 * initial.width, 0);
  await next(page).first().click();
  await settled(page);
  expect((await geometry(page)).stages[0].left).toBeLessThan(initial.stages[0].left - 100);
  expect(await page.locator('.card-row-slider').evaluate(el => el.swiper.activeIndex)).toBe(0);
  await prev(page).nth(1).click();
  await settled(page);
  await next(page).nth(1).click();
  await settled(page);
  await prev(page).first().click();
  await settled(page);
  await expectButtons(page, { previous: false, following: true });
  await page.locator('.card-row-carousel .swiper-next').click();
  await expect.poll(() => page.locator('.card-row-slider').evaluate(el => el.swiper.activeIndex)).toBe(1);
  expect((await geometry(page)).stages[0].left).toBeCloseTo(initial.stages[0].left, 0);
  expect(errors).toEqual([]);
});

test('ruler stays aligned through a real pointer drag and its release transition', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await setup(page, { future: true });
  const box = await page.locator('.therapy-timeline-slider').boundingBox();
  const initial = await geometry(page);
  const from = box.x + box.width * 0.85;
  const y = box.y + box.height * 0.8;
  await page.mouse.move(from, y);
  await page.mouse.down();
  for (const fraction of [0.1, 0.25, 0.45, 0.65]) {
    await page.mouse.move(from - box.width * fraction, y, { steps: 5 });
    const moving = await geometry(page);
    expect(Math.abs(moving.tick6 - moving.stages[1].left)).toBeLessThan(1);
  }
  const dragged = await geometry(page);
  expect(dragged.stages[0].left).toBeLessThan(initial.stages[0].left - box.width * 0.4);
  expect(dragged.tick0).toBeLessThan(initial.tick0 - box.width * 0.4);
  await page.mouse.up();
  await settled(page);
  await expect(prev(page).first()).toBeEnabled();
  expect(errors).toEqual([]);
});

test('content and ruler share the requested one-second easing throughout an arrow transition', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await setup(page, { future: true });
  await page.evaluate(() => {
    window.__timelineFrames = [];
    window.__sampleTimeline = true;
    const sample = () => {
      const stageLeft = document.querySelectorAll('.therapy-timeline-stage')[1].getBoundingClientRect().left;
      const tickLeft = document.querySelector('[data-timeline-week="6"]').getBoundingClientRect().left;
      window.__timelineFrames.push({ stageLeft, tickLeft });
      if (window.__sampleTimeline) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await next(page).first().click();
  expect(await page.evaluate(() => {
    const slider = document.querySelector('.therapy-timeline-slider');
    const wrapperStyle = getComputedStyle(slider.querySelector('.swiper-wrapper'));
    const rulerStyle = getComputedStyle(document.querySelector('[data-timeline-ruler-track]'));
    return {
      speed: slider.swiper.params.speed,
      animating: slider.swiper.animating,
      wrapperDuration: wrapperStyle.transitionDuration,
      rulerDuration: rulerStyle.transitionDuration,
      wrapperEasing: wrapperStyle.transitionTimingFunction,
      rulerEasing: rulerStyle.transitionTimingFunction,
    };
  })).toEqual({
    speed: 1000,
    animating: true,
    wrapperDuration: '1s',
    rulerDuration: '1s',
    wrapperEasing: 'cubic-bezier(0.64, 0.05, 0, 1)',
    rulerEasing: 'cubic-bezier(0.64, 0.05, 0, 1)',
  });
  await settled(page);
  const frames = await page.evaluate(() => {
    window.__sampleTimeline = false;
    return window.__timelineFrames;
  });
  const positions = new Set(frames.map(frame => Math.round(frame.stageLeft)));
  expect(positions.size).toBeGreaterThan(4);
  expect(Math.max(...frames.map(frame => Math.abs(frame.stageLeft - frame.tickLeft)))).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test('resizing across the Webflow mobile breakpoint resets fit and retains ruler scale', async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 844 });
  const errors = await setup(page);
  await next(page).first().click();
  await settled(page);
  await page.setViewportSize({ width: 768, height: 900 });
  await expectButtons(page, { previous: false, following: false });
  await settled(page);
  let g = await geometry(page);
  expect(g.stages[0].left).toBeCloseTo(g.left, 0);
  expect(g.tick12 - g.tick0).toBeCloseTo(g.width, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectButtons(page, { previous: false, following: true });
  await settled(page);
  g = await geometry(page);
  expect(g.tick6 - g.tick0).toBeCloseTo(g.width, 0);
  await next(page).nth(1).click();
  await settled(page);
  await expectButtons(page, { previous: true, following: false });
  expect(errors).toEqual([]);
});

test('reduced motion remains manually navigable with a synchronized ruler', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await setup(page);
  const initial = await geometry(page);
  await next(page).first().click();
  expect((await geometry(page)).animating).toBe(false);
  expect(await page.locator('.therapy-timeline-slider').evaluate(el => el.swiper.params.speed)).toBe(0);
  await expect(page.locator('.therapy-timeline-track')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('[data-timeline-ruler-track]')).toHaveCSS('transition-duration', '0s');
  await settled(page);
  await expectButtons(page, { previous: true, following: false });
  const moved = await geometry(page);
  expect(moved.stages[1].left).toBeCloseTo(initial.left, 0);
  expect(await page.locator('.therapy-timeline-slider').evaluate(el => !!el.swiper.autoplay?.running)).toBe(false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.locator('.therapy-timeline-slider').evaluate(el => el.swiper.params.speed)).toBe(1000);
  await prev(page).first().click();
  expect((await geometry(page)).animating).toBe(true);
  await expect(page.locator('.therapy-timeline-track')).toHaveCSS('transition-duration', '1s');
  await expect(page.locator('[data-timeline-ruler-track]')).toHaveCSS('transition-duration', '1s');
  await settled(page);
  await expectButtons(page, { previous: false, following: true });
  expect(errors).toEqual([]);
});

test('focused timeline supports Arrow keys, Home, and End without trapping keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await setup(page, { future: true });
  const slider = page.locator('.therapy-timeline-slider');
  await slider.focus();
  await page.keyboard.press('End');
  await settled(page);
  await expectButtons(page, { previous: true, following: false });
  await page.keyboard.press('Home');
  await settled(page);
  await expectButtons(page, { previous: false, following: true });
  await page.keyboard.press('ArrowRight');
  await settled(page);
  await expect(prev(page).first()).toBeEnabled();
  await page.keyboard.press('ArrowLeft');
  await settled(page);
  await expectButtons(page, { previous: false, following: true });
  await page.keyboard.press('Tab');
  await expect(slider).not.toBeFocused();
  expect(errors).toEqual([]);
});

test('adding a later milestone and refreshing unlocks the existing timeline without duplicate ticks', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await setup(page);
  await expectButtons(page, { previous: false, following: false });
  await page.locator('.therapy-timeline-slider .swiper-wrapper').evaluate((wrapper, markup) => {
    wrapper.insertAdjacentHTML('beforeend', markup);
    window.onyxSwiper.refresh();
  }, stage(13, 24));
  await expect(page.locator('[data-timeline-week="24"]')).toHaveCount(1);
  await expectButtons(page, { previous: false, following: true });
  await page.evaluate(() => { window.onyxSwiper.refresh(); window.onyxSwiper.refresh(); });
  await expect(page.locator('[data-timeline-week="6"]')).toHaveCount(1);
  await expect(page.locator('.therapy-timeline-stage')).toHaveCount(3);
  await next(page).nth(1).click();
  await settled(page);
  await expect(prev(page).first()).toBeEnabled();
  expect(errors).toEqual([]);
});

test('destroying and refreshing a timeline restores one working ruler and navigation instance', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await setup(page);
  await next(page).first().click();
  await settled(page);
  await page.locator('.therapy-timeline-slider').evaluate(el => {
    window.__destroyedTimeline = el.swiper;
    el.swiper.destroy();
  });
  await expect(page.locator('[data-timeline-ruler-track]')).toBeEmpty();
  await expect(page.locator('[data-therapy-timeline]')).not.toHaveAttribute('data-timeline-ready');
  await expect(page.locator('.therapy-timeline-slider')).not.toHaveAttribute('tabindex');
  await page.evaluate(() => window.onyxSwiper.refresh());
  await expect(page.locator('[data-therapy-timeline]')).toHaveAttribute('data-timeline-ready', 'true');
  await expect(page.locator('[data-timeline-week="6"]')).toHaveCount(1);
  expect(await page.locator('.therapy-timeline-slider').evaluate(el =>
    !!el.swiper && el.swiper !== window.__destroyedTimeline
  )).toBe(true);
  await expectButtons(page, { previous: false, following: true });
  await next(page).nth(1).click();
  await settled(page);
  await expectButtons(page, { previous: true, following: false });
  await prev(page).first().click();
  await settled(page);
  await expectButtons(page, { previous: false, following: true });
  expect(errors).toEqual([]);
});
