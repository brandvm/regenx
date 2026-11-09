// Nav auto-hide: the nav slides up out of view while the page scrolls down
// and comes back as soon as it scrolls up. It stays in view near the top of
// the page, while a menu (or the mobile menu) is open, and when it takes
// keyboard focus.
// Hook: .g-nav-w. State: is-rx-hidden on .g-nav-w (a combo class; its
// transform and transition are Designer styles).

const DELTA = 6; // px of scroll in one direction before the nav reacts

export function initNavAutohide() {
  const nav = document.querySelector<HTMLElement>('.g-nav-w');
  if (!nav) return;
  const centre = nav.querySelector<HTMLElement>('.g-nav-block.is-center');
  const desktop = window.matchMedia('(min-width: 992px)');

  const top = () => nav.offsetHeight * 1.5;
  const menuOpen = () =>
    !!nav.querySelector('[data-nav-drop-toggle][aria-expanded="true"]') ||
    (!desktop.matches && !!centre && getComputedStyle(centre).display !== 'none');

  let lastY = window.scrollY;
  let hidden = false;
  let ticking = false;

  const set = (hide: boolean) => {
    if (hide === hidden) return;
    hidden = hide;
    nav.classList.toggle('is-rx-hidden', hide);
  };

  const apply = () => {
    ticking = false;
    const y = window.scrollY;
    const d = y - lastY;
    if (y <= top() || menuOpen()) {
      set(false);
      lastY = y;
    } else if (Math.abs(d) >= DELTA) {
      set(d > 0);
      lastY = y;
    }
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  }, { passive: true });
  nav.addEventListener('focusin', () => set(false));

  apply();
}
