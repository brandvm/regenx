// Page transitions with Barba: the skeleton every Barba site needs, with a
// plain cross-fade as the default transition. Replace leave() / enter()
// with the design's own; keep the hooks.
// Recipe: webflow-build recipes/barba.
//
// Markup (conventions.md §1): G | Page W [data-barba="wrapper"] ›
// G | Main W [data-barba="container"][data-barba-namespace="<page>"].
// Pages without the wrapper (the /design pages) keep normal page loads.
//
// After every swap this:
// - copies the page-specific <head> tags (Barba only swaps <title>);
// - moves w--current / aria-current on links outside the container;
// - removes the old page's Turnstile widgets and re-initialises Webflow
//   (forms, Turnstile, dropdowns, tabs, IX2) for the new page;
// - starts the new page's modules (pages.ts: ScrollTrigger.sort() and
//   refresh() after they have all started);
// - moves focus to the #hash target or <main> and announces the title;
// - pushes a virtual page view to the dataLayer (GTM).
import barba from '@barba/core';
import type Lenis from 'lenis';
import { gsap, reducedMotion } from './gsap';
import { releaseWebflowAnchors } from './smooth-scroll';
import type { PageHooks } from './pages';

type TransitionOptions = PageHooks & {
  /** The smooth-scroll instance (recipes/smooth-scroll), or null. */
  lenis?: Lenis | null;
  /** Before the old page leaves: close the nav menu, a modal… */
  beforeLeave?: () => void;
  /** After the new page's modules have started: refresh global modules
   *  (nav state), land on the #hash (`initAnchorScroll(lenis)` again). */
  afterSwap?: () => void;
};

type Host = typeof window & {
  Webflow?: { destroy?: () => void; ready?: () => void; require?: (name: string) => { init?: () => void } | undefined };
  jQuery?: (target: Document) => { off: (event: string) => unknown; trigger: (event: string) => unknown };
  turnstile?: { remove: (widget: Element | string) => void };
  dataLayer?: unknown[];
};
const host = window as Host;

// Paths that always load in full: the style guide and media pages
// (conventions.md §12) carry no Barba wrapper.
const FULL_LOAD_PATHS = ['/design'];
const DOWNLOAD = /\.(pdf|zip|docx?|xlsx?|pptx?|csv|mp4|mov)$/i;

// ---------------------------------------------------------------------------
// Default transition: fade the old page out, the new one in. Reduced motion
// swaps at once. The old container is hidden here; afterEnter removes it.

function leave(current: HTMLElement) {
  if (reducedMotion()) {
    gsap.set(current, { display: 'none' });
    return;
  }
  return gsap
    .timeline()
    .to(current, { autoAlpha: 0, duration: 0.35, ease: 'power1.in' })
    .set(current, { display: 'none' })
    .then();
}

function enter(next: HTMLElement, lenis: Lenis | null | undefined) {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
  if (reducedMotion()) return;
  return gsap
    .timeline()
    .fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power1.out', clearProps: 'opacity,visibility' })
    .then();
}

// ---------------------------------------------------------------------------
// <head>: Barba swaps the container and <title>, nothing else. Copy the
// page-specific tags so share sheets, analytics and tools reading the live
// DOM see the right page (crawlers load pages in full and are unaffected).

const HEAD_TAGS = [
  'meta[name="description"]',
  'meta[name="robots"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'link[rel="canonical"]',
  'script[type="application/ld+json"]',
].join(',');

function syncHead(html: string) {
  const next = new DOMParser().parseFromString(html, 'text/html');
  document.head.querySelectorAll(HEAD_TAGS).forEach((el) => el.remove());
  next.head.querySelectorAll(HEAD_TAGS).forEach((el) => document.head.appendChild(document.importNode(el, true)));
}

// ---------------------------------------------------------------------------
// Current links: Webflow writes w--current and aria-current="page" at
// publish time, on links to the page's own path without a #hash. Links
// outside the container (nav) keep the first page's state unless moved.

const normalizePath = (path: string) => path.replace(/\/+$/, '') || '/';

function syncCurrentLinks(container: HTMLElement) {
  const here = normalizePath(location.pathname);
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    if (container.contains(link)) return; // fresh from the server
    let url: URL;
    try {
      url = new URL(link.getAttribute('href')!, location.href);
    } catch {
      return;
    }
    const current = url.origin === location.origin && !url.hash && normalizePath(url.pathname) === here;
    link.classList.toggle('w--current', current);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

// ---------------------------------------------------------------------------
// Webflow runtime. webflow.js binds forms, Turnstile, dropdowns, tabs and
// IX2 once per full load.

// The leaving page's Turnstile widgets: Turnstile keeps resetting them
// after their forms are gone ("Cannot find Widget …") unless removed.
function removeTurnstile(container: HTMLElement) {
  const ts = host.turnstile;
  if (!ts) return;
  container.querySelectorAll('form [name="cf-turnstile-response"]').forEach((input) => {
    const holder = input.closest('form > div');
    try {
      if (holder) ts.remove(holder);
    } catch {
      /* already gone */
    }
  });
}

// With Turnstile already loaded, webflow.js renders each form's widget from
// $(document).on('ready'), an event jQuery 3 never fires: after a swap no
// widget appears and every submit stays disabled. Drop the old page's
// handlers, let Webflow bind the new page, then fire that event once; each
// widget renders as its form nears the viewport, as on a full load.
// IX3 has no public re-init: see conventions.md §16 (move off IX).
function reinitWebflow(html: string) {
  const page = html.match(/<html[^>]*\sdata-wf-page="([^"]+)"/)?.[1];
  if (page) document.documentElement.dataset.wfPage = page;
  const wf = host.Webflow;
  try {
    host.jQuery?.(document).off('ready');
    wf?.destroy?.();
    wf?.ready?.();
    wf?.require?.('ix2')?.init?.();
    if (host.turnstile) host.jQuery?.(document).trigger('ready');
    // ready() binds Webflow's anchor scroll again.
    releaseWebflowAnchors();
  } catch (error) {
    console.warn('[wfc] Webflow re-init failed', error);
  }
}

// ---------------------------------------------------------------------------
// Focus and announcement. A full load starts keyboard and screen-reader
// users at the top of the new page; a swap would leave focus on the link
// that was clicked, now gone. Focus the #hash target or <main> without
// scrolling, and announce the title in a polite live region outside the
// container.

let announcer: HTMLElement | null = null;

function focusPage(container: HTMLElement) {
  let target: HTMLElement | null = null;
  try {
    target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  } catch {
    /* malformed hash */
  }
  target ||= container.querySelector<HTMLElement>('main') ?? container;
  if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });

  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    // Visually hidden; inline so it needs no class in the Designer.
    announcer.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0';
    document.body.appendChild(announcer);
  }
  // Cleared first, so the same title (back and forth) is announced again.
  announcer.textContent = '';
  const title = document.title;
  requestAnimationFrame(() => {
    if (announcer) announcer.textContent = title;
  });
}

// GTM: add a Custom Event trigger on virtual_page_view (or use a History
// Change trigger and drop this).
function pushPageView() {
  (host.dataLayer ||= []).push({ event: 'virtual_page_view', page_path: location.pathname + location.search, page_title: document.title });
}

// ---------------------------------------------------------------------------

export function initTransition({ initPage, destroyPage, lenis, beforeLeave, afterSwap }: TransitionOptions): boolean {
  if (!document.querySelector('[data-barba="wrapper"]') || !document.querySelector('[data-barba="container"]')) return false;
  history.scrollRestoration = 'manual';

  // Barba pushes the next URL without its #hash and doesn't report it:
  // remember the clicked link's hash (capture phase runs before Barba).
  let pendingHash = '';
  document.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
      pendingHash = link ? link.hash : '';
    },
    true,
  );

  // Barba also runs the global enter hooks on the first load, with no
  // current page: only a real swap may act.
  const isSwap = (data: { current?: { container?: HTMLElement } }) => !!data.current?.container;

  barba.hooks.beforeLeave((data) => {
    lenis?.stop();
    beforeLeave?.();
    removeTurnstile(data.current.container);
  });

  barba.hooks.afterLeave(() => destroyPage());

  // Hidden until enter() fades it in, so it never flashes in first.
  barba.hooks.beforeEnter((data) => {
    if (isSwap(data) && !reducedMotion()) gsap.set(data.next.container, { autoAlpha: 0 });
  });

  barba.hooks.enter((data) => {
    if (isSwap(data)) syncHead(data.next.html);
  });

  barba.hooks.afterEnter((data) => {
    if (!isSwap(data)) return;
    // Barba removes the old container only after afterEnter: until then a
    // page module's document.querySelector finds the leaving page first.
    data.current.container.remove();
    const next = data.next.container;
    const hash = pendingHash;
    pendingHash = '';
    if (hash && !location.hash && data.trigger instanceof Element) {
      history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
    }
    syncCurrentLinks(next);
    reinitWebflow(data.next.html);
    initPage();
    lenis?.resize();
    lenis?.start();
    afterSwap?.();
    focusPage(next);
    pushPageView();
  });

  barba.init({
    debug: false,
    timeout: 7000,
    preventRunning: true,
    // true = a normal page load. Barba already skips other origins'
    // links, target="_blank", mailto: and tel:.
    prevent: ({ el, href }) => {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return true;
      if (FULL_LOAD_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return true;
      // Same-page anchors belong to anchor-scroll / Lenis, never to Barba.
      if (url.pathname === location.pathname && url.hash) return true;
      if (el.hasAttribute('download') || DOWNLOAD.test(url.pathname)) return true;
      return el.closest('[data-barba-prevent]') != null;
    },
    transitions: [
      {
        name: 'default',
        // First load: nothing to animate (and nothing may undo the browser's
        // jump to an arriving #hash).
        once: () => Promise.resolve(),
        leave: (data) => leave(data.current.container),
        enter: (data) => enter(data.next.container, lenis),
      },
    ],
  });
  return true;
}
