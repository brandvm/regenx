// Input modality: focus rings for keyboard users only (client request
// 2026-11-06). Browsers also show :focus-visible after a
// mouse click on text fields and when a script moves focus (a modal
// opening), so this records how the visitor is interacting and the CSS keys
// the ring on it:
//   html[data-input="keyboard"]  after a navigation key (Tab, arrows, Enter…)
//   html[data-input="pointer"]   after mouse, touch or pen
// Typing letters into a field doesn't switch to keyboard mode, so a field
// clicked with the mouse keeps its subtle style while the visitor types.
// The ring itself: styles/focus.css.

const NAV_KEYS = new Set([
  'Tab', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown',
]);

export function initInputModality() {
  const html = document.documentElement;
  const set = (mode: 'keyboard' | 'pointer') => {
    if (html.dataset.input !== mode) html.dataset.input = mode;
  };
  set('pointer');
  const typing = (t: EventTarget | null) =>
    t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  document.addEventListener('keydown', (e) => {
    if (!NAV_KEYS.has(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
    // Inside a field only Tab and Escape mean "moving around".
    if (typing(e.target) && e.key !== 'Tab' && e.key !== 'Escape') return;
    set('keyboard');
  }, true);
  document.addEventListener('pointerdown', () => set('pointer'), true);
}
