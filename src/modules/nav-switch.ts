// Nav switch: on desktop (≥992px) the nav dropdowns open on hover and act
// as one menu. Hovering a menu name opens it (after a short pause when no
// menu is open, at once when one is); leaving the names and the panel
// closes it. Moving to another name morphs one shared panel from the old
// menu's box to the new one, while the old content slides out and the new
// content slides in from the side the pointer moved towards.
//
// Webflow stays the source of truth: hover opens and closes its Dropdowns
// (synthetic mouseup / w-close), so w--open, aria, keys, Esc and the
// overlay (nav-overlay.js) work as before. Every visual comes from here and
// reacts to w--open, so keyboard and touch opens animate the same way:
//   - the shell: one white layer behind the open menu, moved only with
//     transform and opacity (no layout or clip-path work per frame);
//   - the panel's own background is hidden while it is shown, and the
//     dropdown's open/close motion (dropdown-motion.ts) is held at its end
//     state by styles/nav-switch.css, keyed on data-nav-switch ("in" shown,
//     "out" hidden). Below 992px dropdown-motion runs as is.
// Real mouse clicks on a menu name are ignored on desktop (hover owns it).
//
// Hooks: .g-nav-menu, .g-nav-drop (Webflow Dropdown), .w-dropdown-toggle,
// .g-nav-drop-content-w (panel), .g-nav-drop-content (its content).

const DESKTOP = '(min-width: 992px)';
const EASE = 'cubic-bezier(.22, 1, .36, 1)'; // ease-out
const MORPH = 320;
const OPEN = 240;
const CLOSE = 160;
const SHIFT = 32; // px the content travels on a switch
const OPEN_DELAY = 80; // hover pause before the first menu opens
const CLOSE_DELAY = 200; // grace after the pointer leaves

type Box = { left: number; top: number; width: number; height: number };

export function initNavSwitch() {
  const menuEl = document.querySelector<HTMLElement>('.g-nav-menu');
  const drops = [...document.querySelectorAll<HTMLElement>('.g-nav-drop.w-dropdown')];
  if (!menuEl || !drops.length) return;
  const menu: HTMLElement = menuEl;
  const mq = window.matchMedia(DESKTOP);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ms = (d: number) => (reduced.matches ? 0 : d);

  const toggleOf = (d: HTMLElement) => d.querySelector<HTMLElement>('.w-dropdown-toggle')!;
  const listOf = (d: HTMLElement) => d.querySelector<HTMLElement>('.w-dropdown-list')!;
  const panelOf = (d: HTMLElement) => d.querySelector<HTMLElement>('.g-nav-drop-content-w')!;
  const contentOf = (d: HTMLElement) => d.querySelector<HTMLElement>('.g-nav-drop-content')!;
  const isOpen = (d: HTMLElement) => toggleOf(d).classList.contains('w--open');

  const shell = document.createElement('div');
  shell.className = 'g-nav-switch-shell';
  shell.setAttribute('aria-hidden', 'true');
  Object.assign(shell.style, {
    position: 'absolute', zIndex: '1', pointerEvents: 'none', display: 'none',
    background: getComputedStyle(contentOf(drops[0])).backgroundColor,
    borderRadius: getComputedStyle(contentOf(drops[0])).borderTopLeftRadius,
    willChange: 'transform, opacity',
  });
  menu.append(shell);
  drops.forEach((d) => {
    listOf(d).style.zIndex = '2';
    if (!isOpen(d)) d.dataset.navSwitch = 'out';
  });

  let shown: HTMLElement | null = null; // the menu the shell is drawing
  let anims: Animation[] = [];
  let ghost: HTMLElement | null = null;
  let gen = 0;

  function box(el: HTMLElement): Box {
    const m = menu.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { left: r.left - m.left, top: r.top - m.top, width: r.width, height: r.height };
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
  const children = (d: HTMLElement) => [...contentOf(d).children] as HTMLElement[];

  function show(d: HTMLElement) {
    stop();
    gen++;
    d.dataset.navSwitch = 'in';
    shown = d;
    place(box(panelOf(d)));
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

  // Once the current animation ends, follow the panel's size (Webflow's
  // interaction sets the panel width a moment after it opens).
  function settle() {
    const g = gen;
    const current = anims;
    Promise.all(current.map((a) => a.finished)).then(() => {
      if (g !== gen) return;
      stop();
      if (shown) place(box(panelOf(shown)));
    }, () => {});
  }
  const ro = new ResizeObserver(() => {
    if (shown && mq.matches) {
      if (anims.length) settle();
      else place(box(panelOf(shown)));
    }
  });
  drops.forEach((d) => ro.observe(panelOf(d)));

  function hide(d: HTMLElement) {
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
      d.dataset.navSwitch = 'out';
      shell.style.display = 'none';
      stop();
    }, () => {});
  }

  function morph(from: HTMLElement, to: HTMLElement) {
    // Start from what is on screen now (mid-animation included).
    const start = shell.style.display === 'none' ? box(panelOf(from)) : box(shell);
    const old = box(panelOf(from));
    const oldPanel = panelOf(from).cloneNode(true) as HTMLElement;
    const oldWidth = panelOf(from).offsetWidth;
    stop();
    gen++;
    from.dataset.navSwitch = 'out';
    to.dataset.navSwitch = 'in';
    shown = to;
    const dir = drops.indexOf(to) > drops.indexOf(from) ? 1 : -1;
    const end = box(panelOf(to));
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

  // React to Webflow's state, whatever opened or closed the menu.
  const wasOpen = new Map(drops.map((d) => [d, isOpen(d)]));
  new MutationObserver(() => {
    const opened = drops.filter((d) => isOpen(d) && !wasOpen.get(d));
    const closed = drops.filter((d) => !isOpen(d) && wasOpen.get(d));
    drops.forEach((d) => wasOpen.set(d, isOpen(d)));
    if (!mq.matches) {
      drops.forEach((d) => { d.dataset.navSwitch = isOpen(d) ? 'in' : 'out'; });
      shell.style.display = 'none';
      return;
    }
    const to = opened[0];
    const from = closed.find((d) => d === shown) ?? (shown && shown !== to ? shown : null);
    if (to && from) morph(from, to);
    else if (to) show(to);
    else if (shown && closed.includes(shown)) hide(shown);
  }).observe(menu, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // Hover drives Webflow's Dropdowns on desktop.
  let openTimer = 0;
  let closeTimer = 0;
  let lastPointer = 'mouse';
  const anyOpen = () => drops.some(isOpen);
  const open = (d: HTMLElement) => {
    if (!isOpen(d)) toggleOf(d).dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  };
  const closeAll = () => {
    drops.filter(isOpen).forEach((d) => {
      const jq = (window as unknown as { jQuery?: (el: Element) => { trigger: (e: string) => void } }).jQuery;
      if (jq) jq(d).trigger('w-close');
    });
  };

  document.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; }, true);
  // A real mouse click on a menu name would toggle what hover opened.
  window.addEventListener('mouseup', (e) => {
    if (!e.isTrusted || !mq.matches || lastPointer !== 'mouse') return;
    if ((e.target as Element).closest?.('.g-nav-drop > .w-dropdown-toggle')) e.stopPropagation();
  }, true);

  document.addEventListener('pointerover', (e) => {
    if (!mq.matches || e.pointerType !== 'mouse') return;
    const target = e.target as Element;
    const toggle = target.closest('.g-nav-drop > .w-dropdown-toggle');
    if (toggle) {
      const d = toggle.parentElement as HTMLElement;
      clearTimeout(closeTimer);
      clearTimeout(openTimer);
      if (anyOpen()) open(d);
      else openTimer = window.setTimeout(() => open(d), OPEN_DELAY);
      return;
    }
    if (target.closest('.g-nav-drop-content-w')) {
      clearTimeout(closeTimer);
      return;
    }
    clearTimeout(openTimer);
    if (anyOpen()) {
      clearTimeout(closeTimer);
      closeTimer = window.setTimeout(closeAll, CLOSE_DELAY);
    }
  });
  document.addEventListener('pointerleave', () => {
    clearTimeout(openTimer);
    if (mq.matches && anyOpen()) closeTimer = window.setTimeout(closeAll, CLOSE_DELAY);
  });

}
