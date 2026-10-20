// FAQ / accordion. Snippet: webflow-build recipes/snippets.
//
// Markup: [data-faq-trigger] on a button (inside the question's heading),
// [data-faq-panel] on the answer. Each trigger finds its panel by
//   1. its aria-controls, when the Designer set ids;
//   2. else the [data-faq-panel] in the same [data-faq-item] (a CMS list
//      item, which can't carry unique ids);
//   3. else by position: the n-th trigger and the n-th panel inside the
//      closest [data-faq] (questions and answers from two lists).
// The module writes the ids, aria-controls and aria-expanded itself, and
// hides closed panels (the `hidden` attribute). A trigger that should start
// open has aria-expanded="true". Several can be open at once; with
// data-faq="single" on the root, opening one closes the others.
// The panel eases open and closed (height, padding, opacity) unless
// reduced motion is on.
const MS = 300;

export function initFaq(): void {
  const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-faq-trigger]'));
  if (!triggers.length) return;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const panelOf = (trigger: HTMLElement): HTMLElement | null => {
    const named = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    if (named) return named;
    const inItem = trigger.closest('[data-faq-item]')?.querySelector<HTMLElement>('[data-faq-panel]');
    if (inItem) return inItem;
    const root = trigger.closest('[data-faq]');
    if (!root) return null;
    const own = Array.from(root.querySelectorAll<HTMLElement>('[data-faq-trigger]')).indexOf(trigger);
    return root.querySelectorAll<HTMLElement>('[data-faq-panel]')[own] ?? null;
  };

  const pairs = triggers
    .map((trigger) => ({ trigger, panel: panelOf(trigger) }))
    .filter((p): p is { trigger: HTMLElement; panel: HTMLElement } => !!p.panel);

  const animate = (panel: HTMLElement, open: boolean) => {
    if (still() || !panel.animate) {
      panel.hidden = !open;
      return;
    }
    panel.getAnimations().forEach((a) => a.cancel());
    panel.hidden = false;
    const { paddingTop, paddingBottom } = getComputedStyle(panel);
    const opened = { height: `${panel.offsetHeight}px`, paddingTop, paddingBottom, opacity: 1 };
    const closed = { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 };
    panel.style.overflow = 'hidden';
    const run = panel.animate(open ? [closed, opened] : [opened, closed], { duration: MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    run.onfinish = () => {
      panel.style.overflow = '';
      panel.hidden = !open;
    };
    run.oncancel = () => {
      panel.style.overflow = '';
    };
  };

  pairs.forEach(({ trigger, panel }, i) => {
    panel.id ||= `faq-panel-${i + 1}`;
    trigger.id ||= `faq-trigger-${i + 1}`;
    trigger.setAttribute('aria-controls', panel.id);
    if (!(trigger instanceof HTMLButtonElement)) {
      trigger.setAttribute('role', 'button');
      if (!trigger.hasAttribute('tabindex')) trigger.tabIndex = 0;
    }
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', trigger.id);
    const open = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;

    const toggle = () => {
      const next = trigger.getAttribute('aria-expanded') !== 'true';
      if (next && trigger.closest('[data-faq]')?.getAttribute('data-faq') === 'single') {
        pairs.forEach((other) => {
          if (other.trigger === trigger || other.trigger.getAttribute('aria-expanded') !== 'true') return;
          if (other.trigger.closest('[data-faq]') !== trigger.closest('[data-faq]')) return;
          other.trigger.setAttribute('aria-expanded', 'false');
          animate(other.panel, false);
        });
      }
      trigger.setAttribute('aria-expanded', String(next));
      animate(panel, next);
    };
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });
    if (!(trigger instanceof HTMLButtonElement)) {
      trigger.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        toggle();
      });
    }
  });
}
