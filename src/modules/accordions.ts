// Accordions (`.acc`): the first item of each group starts open (Figma), and
// items stay open until their own toggle closes them.
//
// `.acc` is a Webflow Dropdown. Webflow keeps the clicks, keys, IX2 open and
// close animations and `aria-expanded`; this only switches off the three
// things that close a dropdown from outside, so several accordions can be
// open at once:
//   - the `w-close` event every other dropdown sends when it opens;
//   - closing when focus leaves the dropdown;
//   - closing on a click anywhere else (`mouseUpOutside`, bound on open).
// The nav dropdowns keep all of Webflow's behaviour.

type JQueryLike = {
  (el: Element): { off(event: string): unknown; triggerHandler(event: string): unknown };
  data(el: Element, key: string): { open?: boolean; mouseUpOutside?: () => void } | undefined;
};

const ACC = '.acc.w-dropdown';
const NS = '.w-dropdown';

// A group is one CMS list, or the accordions that share a parent.
function groupOf(acc: Element) {
  return acc.closest('.w-dyn-items') || acc.parentElement;
}

type WebflowLike = { require?(name: string): { ready?: (...args: unknown[]) => unknown; __rgxAcc?: boolean } | undefined };

function getJQuery() {
  return (window as unknown as { jQuery?: JQueryLike }).jQuery;
}

// Switch off the outside closers, and keep aria-expanded in step with
// Webflow's own open state (a re-init resets it to "false").
function detach($: JQueryLike, accs: Element[]) {
  accs.forEach((acc) => {
    const state = $.data(acc, NS);
    if (!state) return; // not wired by Webflow (yet)
    $(acc).off(`w-close${NS}`);
    $(acc).off(`focusout${NS}`);
    state.mouseUpOutside = () => {};
    acc.querySelector(':scope > .w-dropdown-toggle')?.setAttribute('aria-expanded', String(!!state.open));
  });
}

// Open the first visible item of each group through Webflow's own toggle
// handler, so its IX2 animation runs. Webflow binds the toggle to `click` on
// touch devices and `mouseup` elsewhere; only one is bound, so sending both
// opens it once. An item Webflow thinks is open but whose panel a re-init
// hid again is reset first.
function openFirsts($: JQueryLike, accs: Element[]) {
  const seen = new Set<Element | null>();
  accs.forEach((acc) => {
    if (acc.getClientRects().length === 0) return; // hidden at this size
    const group = groupOf(acc);
    if (seen.has(group)) return;
    seen.add(group);
    const state = $.data(acc, NS);
    const toggle = acc.querySelector(':scope > .w-dropdown-toggle');
    const list = acc.querySelector(':scope > .w-dropdown-list');
    if (!state || !toggle) return;
    if (state.open && list && getComputedStyle(list).display !== 'none') return;
    if (state.open) {
      state.open = false;
      [acc, toggle, list].forEach((el) => el?.classList.remove('w--open'));
    }
    $(toggle).triggerHandler(`click${NS}`);
    $(toggle).triggerHandler(`mouseup${NS}`);
  });
}

export const Accordions = {
  init() {
    const $ = getJQuery();
    const accs = () => Array.from(document.querySelectorAll(ACC));
    if (!$ || !accs().length) return;
    detach($, accs());
    openFirsts($, accs());

    // A page script on the Product template (probably Finsweet) re-runs
    // Webflow's setup after we boot, which binds the closers again and resets
    // the open panels. Detach and reopen after every run, once its
    // interactions have settled.
    const dropdown = (window as unknown as { Webflow?: WebflowLike }).Webflow?.require?.('dropdown');
    if (dropdown?.ready && !dropdown.__rgxAcc) {
      const ready = dropdown.ready;
      dropdown.ready = function (this: unknown, ...args: unknown[]) {
        const result = ready.apply(this, args);
        detach($, accs());
        requestAnimationFrame(() => openFirsts($, accs()));
        return result;
      };
      dropdown.__rgxAcc = true;
    }
  },
};
