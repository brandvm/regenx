import { initAnimation } from './modules/animation';
import { initSmoothScroll, resizeSmoothScroll } from './modules/smooth-scroll';
import { initWaveGrid } from './modules/wave-grid';
import { initMain } from './modules/main';
import { initEnvironmentSwitcher } from './modules/environment-switcher';

async function boot() {
  if (window.__RGX_BOOTED) return;
  window.__RGX_BOOTED = true;
  try {
    if (window.Webflow?.env?.('editor') || window.Webflow?.env?.('design')) return;
    initEnvironmentSwitcher();
    await initAnimation();
    initSmoothScroll();
    try { initWaveGrid(); } catch (error) {
      console.warn('[RegenX] WaveGrid could not initialize', error);
    }
    initMain();
  } catch (error) {
    console.error("[RegenX] Initialization failed", error);
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
