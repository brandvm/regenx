import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { renderWave } from './helpers/wave-harness.mjs';

const source = readFileSync(new URL('../src/modules/wave-grid.js', import.meta.url), 'utf8');

test('WaveGrid reuses fixed uniforms while animating, pausing, and resizing', async ({ page }) => {
  const result = await renderWave(page, source);
  const frame = name => result.frames.find(f => f.label === name);
  expect(frame('animated').pixels).not.toBe(frame('initial').pixels);
  expect(frame('offscreen').pixels).toBe(frame('animated').pixels);
  expect(frame('reentered').pixels).toBe(frame('animated').pixels);
  expect(frame('resumed').pixels).not.toBe(frame('animated').pixels);
  expect(frame('hidden').pixels).toBe(frame('resumed').pixels);
  expect(frame('visible').pixels).not.toBe(frame('hidden').pixels);
  expect(frame('resized')).toMatchObject({ width: 320, height: 192 });
  expect(result.glError).toBe(0);
  expect(result.destroyed).toBe(true);
  for (const [name, count] of Object.entries(result.uploads)) {
    expect(count, name).toBe(['u_res', 'u_dpr', 'u_time'].includes(name) ? result.draws : 1);
  }
});

test('WaveGrid reduced motion renders a static image and remains resizable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const result = await renderWave(page, source, { options: { cellType: 'circle', background: '#f7f7f7' }, dpr: 2 });
  for (const frame of result.frames.slice(1, -1)) expect(frame.pixels).toBe(result.frames[0].pixels);
  expect(result.frames.at(-1)).toMatchObject({ width: 320, height: 192 });
  expect(result.glError).toBe(0);
  expect(result.destroyed).toBe(true);
});
