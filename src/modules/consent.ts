// ============================================
// Consent — opt-in cookie banner (2026-11-23)
//   A health site: nothing that sets tracking cookies loads until the
//   visitor clicks Accept. Google Analytics (GA4, head code, live domain
//   only) and HubSpot's tracking code both wait for it; Ahrefs Web
//   Analytics is cookieless and stays as is.
//
//   Webflow (G | Footer component):
//     [data-cookie-banner]          the banner (hidden until opened here)
//       [data-consent="accept"]     Accept button
//       [data-consent="decline"]    Decline button
//     [data-cookie-settings]        "Cookie settings" link, reopens it
//
//   The choice is stored for 12 months in localStorage (`rx-consent`,
//   read by the head code too, so a returning visitor who accepted gets GA
//   on first paint). No choice yet → banner opens. Decline → nothing loads.
// ============================================
const KEY = 'rx-consent';
const TTL = 365 * 24 * 60 * 60 * 1000;
export type Consent = 'granted' | 'denied';

const listeners: Array<() => void> = [];

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw) as { v?: string; t?: number };
    if ((v !== 'granted' && v !== 'denied') || !t || Date.now() - t > TTL) return null;
    return v;
  } catch {
    return null;
  }
}

export function hasConsent() {
  return readConsent() === 'granted';
}

/** Run `fn` now if the visitor has accepted, or as soon as they do. */
export function onConsent(fn: () => void) {
  if (hasConsent()) fn();
  else listeners.push(fn);
}

function store(v: Consent) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v, t: Date.now() }));
  } catch {
    /* Storage blocked: the choice holds for this page only. */
  }
}

function grant() {
  // GA4 loader defined by the head code (live domain only).
  (window as Window & { RXGA?: () => void }).RXGA?.();
  listeners.splice(0).forEach(fn => {
    try { fn(); } catch (error) { console.warn('[RegenX] consent listener failed', error); }
  });
}

export function initConsent() {
  const banner = document.querySelector<HTMLElement>('[data-cookie-banner]');
  const open = (focus: boolean) => {
    if (!banner) return;
    banner.setAttribute('data-open', '');
    if (focus) banner.querySelector<HTMLElement>('[data-consent="accept"]')?.focus();
  };
  const close = () => banner?.removeAttribute('data-open');

  if (banner) {
    if (!banner.hasAttribute('role')) banner.setAttribute('role', 'region');
    if (!banner.hasAttribute('aria-label')) banner.setAttribute('aria-label', 'Cookie consent');
    banner.addEventListener('click', e => {
      const btn = (e.target as Element).closest<HTMLElement>('[data-consent]');
      if (!btn) return;
      e.preventDefault();
      const v: Consent = btn.dataset.consent === 'accept' ? 'granted' : 'denied';
      store(v);
      close();
      if (v === 'granted') grant();
    });
  }

  document.addEventListener('click', e => {
    const link = (e.target as Element).closest('[data-cookie-settings]');
    if (!link) return;
    e.preventDefault();
    open(true);
  });

  const choice = readConsent();
  if (choice === 'granted') grant();
  else if (choice === null) open(false);
}
