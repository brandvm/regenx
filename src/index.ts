import { initAnimation } from './modules/animation';
import { getLenis, initSmoothScroll, resizeSmoothScroll } from './modules/smooth-scroll';
import { initWaveGrid } from './modules/wave-grid';
import { initMain } from './modules/main';
import { initUniqueFormIds } from './modules/unique-form-ids';
import { initMarquee } from './modules/marquee';
import { initModals } from './modules/modal';
import { initPeptideDisclaimer } from './modules/peptide-disclaimer';
import { initCatalogNav } from './modules/catalog-nav';
import { initCatalogList } from './modules/catalog-list';
import { initLabTests } from './modules/lab-tests';
import { initMcCatalog } from './modules/mc-catalog';
import { initBackToTop } from './modules/back-to-top';

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
    // Starter fix for markup Webflow publishes (CMS filter radios share an id).
    await run('unique-form-ids', initUniqueFormIds);
    await run('animation', initAnimation);
    await run('smooth-scroll', initSmoothScroll);
    await run('wave-grid', initWaveGrid);
    await run('main', initMain);
    // "As Seen In" logo rows: [data-marquee] (wf-template recipe).
    await run('marquee', initMarquee);
    // Medical Catalog phone list and Lab Panel search. Before the modals:
    // catalog-list builds the Filters sheet as a [data-modal].
    await run('catalog-list', initCatalogList);
    await run('lab-tests', initLabTests);
    // Dialogs built in Webflow ([data-modal], wf-template recipe), then the
    // Peptide Therapy disclaimer that opens one on load.
    await run('modal', () => initModals(getLenis()));
    await run('peptide-disclaimer', initPeptideDisclaimer);
    // Medical Catalog: highlight the category in view.
    await run('catalog-nav', initCatalogNav);
    // Medication Catalog, new phone UI (/design/medication-catalog). After
    // catalog-nav, which hides the empty New block.
    await run('mc-catalog', initMcCatalog);
    // Footer "Back to Top" button.
    await run('back-to-top', initBackToTop);
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
