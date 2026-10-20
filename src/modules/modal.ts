// Modals (dialogs) built in the Designer: a popup, a "Join" form, a card's
// detail panel.
// Recipe: webflow-build recipes/modal.
//
// Markup:
//   [data-modal="<name>"]      the overlay (fixed, full screen); its id
//                              becomes <name> when it has none
//   [data-modal-panel]         the dialog card inside it (a click outside
//                              it closes)
//   [data-modal-close]         one or more close buttons inside it
// Opened by any link to "#<name>" on the same page, by a button with
// data-modal-open="<name>", and by loading the page with #<name> in the URL
// (a modal can be linked to from an e-mail).
//
// - Portalled to <body>, so no transform or overflow on an ancestor can
//   clip or re-anchor a fixed overlay.
// - Always starts closed, whatever the Designer left it showing (an "Open"
//   variant used to style it): closed means inline display none.
// - Open: role="dialog", aria-modal, labelled by its first heading; the rest
//   of the page is inert; Tab stays inside; Escape and a click outside the
//   panel close it; focus returns to whatever opened it.
// - Scroll lock: lenis.stop() / start() on the instance passed in (never
//   window.lenis); without Lenis, html.is-modal-open (modal.css). The lock is
//   on <html> only: locking <body> makes it the scroll container and
//   un-sticks a sticky header.
// - Motion: modal.css fades [data-modal].is-open; reduced motion is instant.
//
// Returns a cleanup (pages.ts in recipes/barba calls it when a page leaves):
// it removes the portalled overlays and the listeners.

type Scroller = { stop: () => void; start: () => void };

const FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
const FADE_MS = 300; // matches modal.css; the fallback if transitionend never fires

type Modal = { root: HTMLElement; panel: HTMLElement; display: string };

export function initModals(lenis?: Scroller | null): (() => void) | void {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-modal]'));
  if (!roots.length) return;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const modals = new Map<string, Modal>();

  for (const root of roots) {
    const name = root.dataset.modal?.trim();
    if (!name || modals.has(name)) continue;
    const panel = root.querySelector<HTMLElement>('[data-modal-panel]') ?? root;
    root.id ||= name;
    // The display the Designer gives it when shown (flex centres the panel).
    const shown = getComputedStyle(root).display;
    const display = root.dataset.modalDisplay ?? (shown && shown !== 'none' ? shown : 'flex');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    const title = panel.querySelector<HTMLElement>('h1, h2, h3, h4');
    if (title && !panel.hasAttribute('aria-label')) {
      title.id ||= `${root.id}-title`;
      panel.setAttribute('aria-labelledby', title.id);
    }
    if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1;
    root.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((btn) => {
      if (!btn.textContent?.trim() && !btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', 'Close');
    });
    document.body.appendChild(root);
    root.classList.remove('is-open');
    root.style.display = 'none';
    modals.set(name, { root, panel, display });
  }

  let active: Modal | null = null;
  let opener: HTMLElement | null = null;
  let madeInert: Element[] = [];
  let hideTimer = 0;

  const lock = (on: boolean) => {
    if (lenis) {
      if (on) lenis.stop();
      else lenis.start();
    } else document.documentElement.classList.toggle('is-modal-open', on);
  };

  const setInert = (keep: HTMLElement | null) => {
    madeInert.forEach((el) => el.removeAttribute('inert'));
    madeInert = [];
    if (!keep) return;
    for (const el of Array.from(document.body.children)) {
      if (el === keep || el.hasAttribute('inert') || el.matches('script, style, link')) continue;
      el.setAttribute('inert', '');
      madeInert.push(el);
    }
  };

  function open(name: string, from: HTMLElement | null) {
    const modal = modals.get(name);
    if (!modal || active === modal) return;
    if (active) close(false);
    clearTimeout(hideTimer);
    active = modal;
    opener = from ?? (document.activeElement as HTMLElement | null);
    modal.root.style.display = modal.display;
    modal.root.scrollTop = 0;
    lock(true);
    setInert(modal.root);
    // Next frame: the fade needs a painted start state.
    requestAnimationFrame(() => modal.root.classList.add('is-open'));
    // The first field when there is one (the modal exists to be filled in),
    // else the panel itself.
    const field = modal.panel.querySelector<HTMLElement>('input:not([type="hidden"]):not([type="submit"]), select, textarea');
    (field ?? modal.panel).focus({ preventScroll: true });
    from?.setAttribute('aria-expanded', 'true');
  }

  function close(restoreFocus = true) {
    const modal = active;
    if (!modal) return;
    active = null;
    if (location.hash === `#${modal.root.id}`) history.replaceState(history.state, '', location.pathname + location.search);
    modal.root.classList.remove('is-open');
    setInert(null);
    lock(false);
    opener?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) opener?.focus({ preventScroll: true });
    opener = null;
    const hide = () => {
      clearTimeout(hideTimer);
      modal.root.removeEventListener('transitionend', onEnd);
      if (active !== modal) modal.root.style.display = 'none';
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === modal.root) hide();
    };
    if (reduce()) return hide();
    modal.root.addEventListener('transitionend', onEnd);
    hideTimer = window.setTimeout(hide, FADE_MS + 100);
  }

  const nameFromHash = (hash: string) => {
    const id = hash.slice(1);
    for (const [name, m] of modals) if (m.root.id === id) return name;
    return null;
  };

  // Capture phase: before anchor-scroll or Barba see a "#name" link.
  const onClick = (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = e.target as Element;
    const button = target.closest?.<HTMLElement>('[data-modal-open]');
    const link = target.closest?.<HTMLAnchorElement>('a[href*="#"]');
    const name = button
      ? button.dataset.modalOpen ?? null
      : link && link.origin === location.origin && link.pathname === location.pathname
        ? nameFromHash(link.hash)
        : null;
    if (name && modals.has(name)) {
      e.preventDefault();
      e.stopPropagation();
      open(name, button ?? link);
      return;
    }
    if (!active) return;
    if (target.closest('[data-modal-close]') && active.root.contains(target)) {
      e.preventDefault();
      close();
    } else if (active.root.contains(target) && !active.panel.contains(target)) close();
  };

  const onKey = (e: KeyboardEvent) => {
    if (!active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(active.panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
    if (!items.length) {
      e.preventDefault();
      active.panel.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === active.panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onHash = () => {
    const name = nameFromHash(location.hash);
    if (name) open(name, null);
  };

  // Openers say what they open.
  document.querySelectorAll<HTMLElement>('a[href*="#"], [data-modal-open]').forEach((el) => {
    const name = el.dataset.modalOpen ?? (el instanceof HTMLAnchorElement && el.pathname === location.pathname ? nameFromHash(el.hash) : null);
    const modal = name ? modals.get(name) : undefined;
    if (!modal) return;
    el.setAttribute('aria-haspopup', 'dialog');
    el.setAttribute('aria-controls', modal.root.id);
    el.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);
  onHash();

  return () => {
    close(false);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onHash);
    modals.forEach((m) => m.root.remove());
    modals.clear();
  };
}
