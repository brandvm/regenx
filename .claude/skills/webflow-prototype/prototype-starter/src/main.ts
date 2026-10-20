// Prototype entry. Mirrors the repo's src/index.ts: a manifest of run()
// calls, one module per file in src/modules/, each a no-op when its markup
// is absent, so modules move into the Webflow repo unchanged. Modules find
// their elements by data-* attributes, never by class.

import { initStyleGuideNav } from './modules/style-guide-nav';

function run(name: string, init: () => void) {
  try {
    init();
  } catch (error) {
    console.error(`[prototype] ${name} failed to initialize`, error);
  }
}

function boot() {
  document.documentElement.classList.remove('is-loading');
  run('year', () => document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear()))));
  run('style-guide-nav', initStyleGuideNav);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
