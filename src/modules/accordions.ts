// Accordions (`.acc`): every item starts closed (user, 2026-11-10; it used
// to open the first item of each group, per Figma), and an opened item stays
// open until its own toggle closes it.
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

export const Accordions = {
  init() {
    const $ = getJQuery();
    const accs = () => Array.from(document.querySelectorAll(ACC));
    if (!$ || !accs().length) return;
    detach($, accs());

    // A page script on the Product template (probably Finsweet) re-runs
    // Webflow's setup after we boot, which binds the closers again. Detach
    // after every run.
    const dropdown = (window as unknown as { Webflow?: WebflowLike }).Webflow?.require?.('dropdown');
    if (dropdown?.ready && !dropdown.__rgxAcc) {
      const ready = dropdown.ready;
      dropdown.ready = function (this: unknown, ...args: unknown[]) {
        const result = ready.apply(this, args);
        detach($, accs());
        return result;
      };
      dropdown.__rgxAcc = true;
    }
  },
};
