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
import { initCatalogSearchFocus } from './modules/catalog-search-focus';
import { initFaqSchema } from './modules/faq-schema';
import { initLabTests } from './modules/lab-tests';
import { initMcCatalog } from './modules/mc-catalog';
import { initBackToTop } from './modules/back-to-top';
import { initDropdownMotion } from './modules/dropdown-motion';
import { initMenuMotion } from './modules/menu-motion';
import { initNavSwitch } from './modules/nav-switch';
import { initNavAutohide } from './modules/nav-autohide';
import { initCatalogSticky } from './modules/catalog-sticky';
import { initHoverRoll } from './modules/hover-roll';
import { initTooltipHover } from './modules/tooltip-hover';
import { initStatementScroll } from './modules/statement-reveal';
import { initMediaPin } from './modules/media-pin';
import { initAboutHero } from './modules/about-hero';
import { initProcessScroll } from './modules/process-scroll';
import { initHeroCardIn } from './modules/hero-card-in';
import { initInputModality } from './modules/input-modality';

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
    // Focus rings for the keyboard only: before any module that moves focus.
    await run('input-modality', initInputModality);
    await run('unique-form-ids', initUniqueFormIds);
    await run('animation', initAnimation);
    await run('smooth-scroll', initSmoothScroll);
    await run('wave-grid', initWaveGrid);
    // Former Webflow interactions (prototype/plan/interactions.md). Each binds
    // only to its data-* hooks. dropdown-motion runs before main, whose
    // accordions.ts opens the first items, so that opening animates.
    await run('dropdown-motion', initDropdownMotion);
    await run('menu-motion', initMenuMotion);
    // Desktop nav: one hover menu over dropdown-motion; the nav hides while
    // scrolling down (nav-shrink.js in main sets the scrolled bar).
    await run('nav-switch', initNavSwitch);
    await run('nav-autohide', initNavAutohide);
    await run('main', initMain);
    await run('hover-roll', initHoverRoll);
    await run('tooltip-hover', initTooltipHover);
    await run('statement-scroll', initStatementScroll);
    await run('media-pin', initMediaPin);
    await run('about-hero', initAboutHero);
    await run('process-scroll', initProcessScroll);
    // TRT hero chart card: scale-in on view (replaces the Lottie).
    await run('hero-card-in', initHeroCardIn);
    // "As Seen In" logo rows: [data-marquee] (wf-template recipe).
    await run('marquee', initMarquee);
    // Medical Catalog phone list and Lab Panel search. Before the modals:
    // catalog-list builds the Filters sheet as a [data-modal].
    await run('catalog-list', initCatalogList);
    // Nav search icon lands here: focus the catalog search (?search[=term]).
    await run('catalog-search-focus', initCatalogSearchFocus);
    await run('lab-tests', initLabTests);
    // Phone catalog: the category tabs stay in view under the nav.
    await run('catalog-sticky', initCatalogSticky);
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
    // FAQPage JSON-LD from the FAQ accordions (/faqs/*, service FAQ sections).
    await run('faq-schema', initFaqSchema);
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
