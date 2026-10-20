import { initAnimation } from './modules/animation';
import { initSmoothScroll, resizeSmoothScroll } from './modules/smooth-scroll';
import { initWaveGrid } from './modules/wave-grid';
import { initMain } from './modules/main';
import { initEnvironmentSwitcher } from './modules/environment-switcher';
import { initUniqueFormIds } from './modules/unique-form-ids';
import { initMarquee } from './modules/marquee';

// Each module runs in isolation: one that throws is logged and skipped,
// and every module after it still initializes.
async function run(name: string, init: () => unknown) {
  try {
    await init();
  } catch (error) {
    console.error(`[RegenX] ${name} failed to initialize`, error);
  }
}

async function boot() {
  if (window.__RGX_BOOTED) return;
  window.__RGX_BOOTED = true;
  try {
    if (window.Webflow?.env?.('editor') || window.Webflow?.env?.('design')) return;
    await run('environment-switcher', initEnvironmentSwitcher);
    // Starter fix for markup Webflow publishes (CMS filter radios share an id).
    await run('unique-form-ids', initUniqueFormIds);
    await run('animation', initAnimation);
    await run('smooth-scroll', initSmoothScroll);
    await run('wave-grid', initWaveGrid);
    await run('main', initMain);
    // "As Seen In" logo rows: [data-marquee] (wf-template recipe).
    await run('marquee', initMarquee);
  } finally {
    document.documentElement.classList.remove('is-loading');
    document.documentElement.classList.add('rgx-ready');
    window.BV?.release?.();
    resizeSmoothScroll();
    window.ScrollTrigger?.refresh();
  }
}

function onDOMReady() {
  // Webflow must wire tabs/dropdowns before our observers and click handlers.
  if (window.Webflow?.push) window.Webflow.push(boot);
  else boot();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onDOMReady, { once: true });
} else {
  onDOMReady();
}
