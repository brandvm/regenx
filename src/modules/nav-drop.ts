import { gsap, EASE_IX2 } from './animation';

// Nav menus (G | Nav), as a custom element: a Div, a Button and a Div
// instead of the Webflow Dropdown (prototype/plan/edits.md §14). One
// controller owns which menu is open, so at most one ever is. It replaces
// nav-switch.ts, the nav half of dropdown-motion.ts and nav-overlay.js, which
// each watched Webflow's w--open and could fall out of step.
//
// Desktop (≥992px): a menu opens on hover (after a short pause when none is
// open, at once when one is) and closes when the pointer leaves the names
// and the panel. Moving to another name morphs one shared panel from the
// old menu's box to the new one, while the old content slides out and the
// new content slides in from the side the pointer moved towards. The page
// overlay fades in behind it. A mouse click on a name only opens it.
// Below 992px (burger menu): a tap toggles the menu, which grows open and
// shut as the IX2 "G Nav | Drop Open/Close" did; menu-motion.ts owns the
// overlay there.
// Everywhere: Enter/Space toggle, Esc closes and returns focus to the name,
// and focus or a click outside the open menu closes it.
//
// Hooks: [data-nav-drop-toggle] (the button, aria-expanded/aria-controls),
// [data-nav-drop-list] (the list), inside .g-nav-drop in .g-nav-menu; the
// panel parts by class: .g-nav-drop-content-w, .g-nav-drop-content,
// .g-nav-link-arrow, .g-nav-overlay.
// Desktop display: data-nav-switch "in"/"out" with styles/nav-switch.css.

const DESKTOP = '(min-width: 992px)';
const EASE = 'cubic-bezier(.22, 1, .36, 1)'; // ease-out
const MORPH = 320;
const OPEN = 240;
const CLOSE = 160;
const SHIFT = 32; // px the content travels on a switch
const OPEN_DELAY = 80; // hover pause before the first menu opens
const CLOSE_DELAY = 200; // grace after the pointer leaves

type Box = { left: number; top: number; width: number; height: number };
type Drop = {
  root: HTMLElement;
  toggle: HTMLButtonElement;
  list: HTMLElement;
  panel: HTMLElement;
  content: HTMLElement;
  arrow: HTMLElement | null;
  tl: gsap.core.Timeline | null;
};

export function initNavDrop() {
  const menuEl = document.querySelector<HTMLElement>('.g-nav-menu');
  const toggles = [...document.querySelectorAll<HTMLButtonElement>('.g-nav-drop > [data-nav-drop-toggle]')];
  if (!menuEl || !toggles.length) return;
  const menu: HTMLElement = menuEl;
  const drops: Drop[] = toggles.map((toggle) => {
    const root = toggle.parentElement as HTMLElement;
    return {
      root,
      toggle,
      list: root.querySelector<HTMLElement>(':scope > [data-nav-drop-list]')!,
      panel: root.querySelector<HTMLElement>('.g-nav-drop-content-w')!,
      content: root.querySelector<HTMLElement>('.g-nav-drop-content')!,
      arrow: toggle.querySelector<HTMLElement>('.g-nav-link-arrow'),
      tl: null,
    };
  });
  const overlay = document.querySelector<HTMLElement>('.g-nav-overlay');
  const mq = window.matchMedia(DESKTOP);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ms = (d: number) => (reduced.matches ? 0 : d);

  let current: Drop | null = null;

  // ── Desktop: one shared panel ───────────────────────────────────────────
  const shell = document.createElement('div');
  shell.className = 'g-nav-switch-shell';
  shell.setAttribute('aria-hidden', 'true');
  Object.assign(shell.style, {
    position: 'absolute', zIndex: '1', pointerEvents: 'none', display: 'none',
    background: getComputedStyle(drops[0].content).backgroundColor,
    borderRadius: getComputedStyle(drops[0].content).borderTopLeftRadius,
    willChange: 'transform, opacity',
  });
  menu.append(shell);
  drops.forEach((d) => {
    d.list.style.zIndex = '2';
    d.root.dataset.navSwitch = 'out';
  });

  let shown: Drop | null = null; // the menu the shell is drawing
  let anims: Animation[] = [];
  let ghost: HTMLElement | null = null;
  let gen = 0;

  // The box the shell, the ghost and the lists are placed against: the menu
  // row, or (992–1200px, where the row scrolls sideways and is unpositioned)
  // the nearest positioned ancestor.
  function frame(): HTMLElement {
    let el: HTMLElement | null = menu;
    while (el && el !== document.body && getComputedStyle(el).position === 'static') el = el.parentElement;
    return el ?? document.body;
  }
  function box(el: HTMLElement): Box {
    // Absolute positions start inside the frame's border (.sw-g-nav has one).
    const f = frame();
    const m = f.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { left: r.left - m.left - f.clientLeft, top: r.top - m.top - f.clientTop, width: r.width, height: r.height };
  }
  function place(b: Box) {
    Object.assign(shell.style, {
      display: 'block', left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px`,
    });
  }
  function stop() {
    anims.forEach((a) => a.cancel());
    anims = [];
    ghost?.remove();
    ghost = null;
  }
  const children = (d: Drop) => [...d.content.children] as HTMLElement[];

  function show(d: Drop) {
    stop();
    gen++;
    d.root.dataset.navSwitch = 'in';
    shown = d;
    place(box(d.panel));
    shell.style.transformOrigin = '50% 0';
    anims = [
      shell.animate(
        [{ opacity: 0, transform: 'translateY(-6px) scale(.97)' }, { opacity: 1, transform: 'none' }],
        { duration: ms(OPEN), easing: EASE }),
      ...children(d).map((c) => c.animate(
        [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
        { duration: ms(OPEN), easing: EASE, delay: ms(40), fill: 'backwards' })),
    ];
    settle();
  }

  // Once the current animation ends, follow the panel's size.
  function settle() {
    const g = gen;
    Promise.all(anims.map((a) => a.finished)).then(() => {
      if (g !== gen) return;
      stop();
      if (shown) place(box(shown.panel));
    }, () => {});
  }
  const ro = new ResizeObserver(() => {
    if (shown && mq.matches) {
      if (anims.length) settle();
      else place(box(shown.panel));
    }
  });
  drops.forEach((d) => ro.observe(d.panel));

  function hide(d: Drop) {
    stop();
    const g = ++gen;
    shown = null;
    shell.style.transformOrigin = '50% 0';
    anims = [
      shell.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px) scale(.98)' }],
        { duration: ms(CLOSE), easing: EASE, fill: 'forwards' }),
      ...children(d).map((c) => c.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: ms(CLOSE * 0.7), easing: EASE, fill: 'forwards' })),
    ];
    anims[0].finished.then(() => {
      if (g !== gen) return;
      d.root.dataset.navSwitch = 'out';
      shell.style.display = 'none';
      stop();
    }, () => {});
  }

  function morph(from: Drop, to: Drop) {
    // Start from what is on screen now (mid-animation included).
    const start = shell.style.display === 'none' ? box(from.panel) : box(shell);
    const old = box(from.panel);
    const oldPanel = from.panel.cloneNode(true) as HTMLElement;
    const oldWidth = from.panel.offsetWidth;
    stop();
    gen++;
    from.root.dataset.navSwitch = 'out';
    to.root.dataset.navSwitch = 'in';
    shown = to;
    const dir = drops.indexOf(to) > drops.indexOf(from) ? 1 : -1;
    const end = box(to.panel);
    place(end);

    // The old content, frozen where it was, slides out over the shell.
    ghost = oldPanel;
    ghost.setAttribute('inert', '');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.removeAttribute('style');
    Object.assign(ghost.style, {
      position: 'absolute', zIndex: '2', pointerEvents: 'none', margin: '0',
      left: `${old.left}px`, top: `${old.top}px`, width: `${oldWidth}px`,
      background: 'transparent', borderColor: 'transparent', willChange: 'transform, opacity',
    });
    menu.append(ghost);

    shell.style.transformOrigin = '0 0';
    const sx = start.width / end.width;
    const sy = start.height / end.height;
    anims = [
      shell.animate(
        [{ opacity: 1, transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${sx}, ${sy})` },
         { opacity: 1, transform: 'none' }],
        { duration: ms(MORPH), easing: EASE }),
      ghost.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * SHIFT}px)` }],
        { duration: ms(MORPH * 0.5), easing: EASE, fill: 'forwards' }),
      ...children(to).map((c) => c.animate(
        [{ opacity: 0, transform: `translateX(${dir * SHIFT}px)` }, { opacity: 1, transform: 'none' }],
        { duration: ms(MORPH), easing: EASE, delay: ms(MORPH * 0.15), fill: 'backwards' })),
    ];
    settle();
  }

  // Page overlay (desktop; menu-motion.ts owns it below 992px).
  let overlayTimer = 0;
  function overlayTo(on: boolean) {
    if (!overlay) return;
    clearTimeout(overlayTimer);
    if (on) {
      overlay.style.display = 'block';
      void overlay.offsetHeight; // reflow so opacity animates from 0
      overlay.style.opacity = '1';
      overlay.classList.add('is-active');
    } else {
      overlay.style.opacity = '0';
      overlay.classList.remove('is-active');
      const wait = parseFloat(getComputedStyle(overlay).transitionDuration) * 1000 || 0;
      overlayTimer = window.setTimeout(() => { if (!current) overlay.style.display = 'none'; }, wait + 60);
    }
  }

  // ── Below 992px: each menu grows open and shut (IX2 "G Nav | Drop") ─────
  function closedState(d: Drop) {
    gsap.set(d.list, { display: 'none' });
    gsap.set(d.panel, { height: 0, scale: 0.9 });
    gsap.set(d.content, { opacity: 0 });
  }
  function grow(d: Drop, open: boolean) {
    d.tl?.kill();
    const tl = gsap.timeline({ defaults: { ease: EASE_IX2, duration: 0.74 } });
    if (open) {
      tl.set(d.list, { display: 'block' }, 0)
        .to(d.panel, { height: 'auto', scale: 1, clearProps: 'height' }, 0)
        .to(d.content, { opacity: 1 }, 0.24);
    } else {
      tl.to(d.panel, { height: 0, scale: 0.9 }, 0)
        .to(d.content, { opacity: 0 }, 0)
        .set(d.list, { display: 'none' });
    }
    if (reduced.matches) tl.progress(1);
    d.tl = tl;
  }

  // ── State ───────────────────────────────────────────────────────────────
  function setOpen(next: Drop | null) {
    const prev = current;
    if (prev === next) return;
    current = next;
    prev?.toggle.setAttribute('aria-expanded', 'false');
    next?.toggle.setAttribute('aria-expanded', 'true');
    if (prev?.arrow) gsap.to(prev.arrow, { rotation: 0, ease: EASE_IX2, duration: ms(740) / 1000 });
    if (next?.arrow) gsap.to(next.arrow, { rotation: 180, ease: EASE_IX2, duration: ms(740) / 1000 });
    if (mq.matches) {
      if (prev && next) morph(prev, next);
      else if (next) show(next);
      else if (prev) hide(prev);
      if (!prev || !next) overlayTo(!!next);
    } else {
      if (prev) grow(prev, false);
      if (next) grow(next, true);
    }
  }

  // Each width starts closed, with only its own styles applied.
  function applyMode() {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    stop();
    shown = null;
    shell.style.display = 'none';
    current = null;
    drops.forEach((d) => {
      d.tl?.kill();
      d.tl = null;
      d.toggle.setAttribute('aria-expanded', 'false');
      d.root.dataset.navSwitch = 'out';
      if (d.arrow) gsap.set(d.arrow, { rotation: 0 });
      if (mq.matches) gsap.set([d.list, d.panel, d.content], { clearProps: 'display,height,transform,opacity' });
      else closedState(d);
    });
    if (overlay && mq.matches) Object.assign(overlay.style, { display: 'none', opacity: '0' });
  }

  // ── Input ───────────────────────────────────────────────────────────────
  let openTimer = 0;
  let closeTimer = 0;
  let lastPointer = 'mouse';
  const dropOf = (el: EventTarget | null) =>
    el instanceof Node ? drops.find((d) => d.root.contains(el)) ?? null : null;
  const later = () => {
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => setOpen(null), CLOSE_DELAY);
  };

  document.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; }, true);

  drops.forEach((d) => {
    d.toggle.addEventListener('click', (e) => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      // A mouse on desktop: hover owns closing, so a click only opens.
      const type = (e as PointerEvent).pointerType ?? (e.detail ? lastPointer : '');
      if (mq.matches && type === 'mouse') setOpen(d);
      else setOpen(current === d ? null : d);
    });
  });

  document.addEventListener('pointerover', (e) => {
    if (!mq.matches || e.pointerType !== 'mouse') return;
    const target = e.target as Element;
    const toggle = target.closest?.('[data-nav-drop-toggle]');
    const d = toggle && dropOf(toggle);
    if (d) {
      clearTimeout(closeTimer);
      clearTimeout(openTimer);
      if (current) setOpen(d);
      else openTimer = window.setTimeout(() => setOpen(d), OPEN_DELAY);
      return;
    }
    if (current && current.panel.contains(target)) {
      clearTimeout(closeTimer);
      return;
    }
    clearTimeout(openTimer);
    if (current) later();
  });
  document.documentElement.addEventListener('pointerleave', () => {
    clearTimeout(openTimer);
    if (mq.matches && current) later();
  });

  // A click outside the open menu's name and panel closes it (that includes
  // its .g-nav-drop-overlay and the page overlay); so does a link in it.
  document.addEventListener('click', (e) => {
    if (!current) return;
    const target = e.target as Element;
    if (current.toggle.contains(target)) return;
    if (current.panel.contains(target) && !target.closest('a')) return;
    setOpen(null);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !current) return;
    const d = current;
    const focused = d.root.contains(document.activeElement);
    setOpen(null);
    if (focused) d.toggle.focus();
  });

  document.addEventListener('focusin', (e) => {
    if (current && !current.root.contains(e.target as Node)) setOpen(null);
  });

  mq.addEventListener('change', applyMode);
  applyMode();
}

