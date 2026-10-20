// A close control inside a Webflow Dropdown: [data-dropdown-close] on any
// element in the dropdown's list (a "Close" button, or a link that should
// also close the menu) closes that dropdown.
// Snippet: webflow-build recipes/snippets.
//
// Webflow's dropdown listens for its own jQuery event `w-close`; a native
// event doesn't reach it. The toggle is blurred too, so it doesn't reopen
// on hover-focus styles. Delegated, so dropdowns added later (CMS, Barba)
// are covered by one listener.
type JQ = ((target: Element) => { trigger: (event: string) => unknown }) | undefined;

export function initDropdownClose(): (() => void) | void {
  if (!document.querySelector('.w-dropdown [data-dropdown-close]')) return;
  const onClick = (event: MouseEvent) => {
    const control = (event.target as Element).closest?.('[data-dropdown-close]');
    const dropdown = control?.closest('.w-dropdown');
    const $ = (window as unknown as { jQuery?: JQ }).jQuery;
    if (!dropdown || !$) return;
    $(dropdown).trigger('w-close');
    dropdown.querySelector<HTMLElement>(':scope > .w-dropdown-toggle')?.blur();
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
