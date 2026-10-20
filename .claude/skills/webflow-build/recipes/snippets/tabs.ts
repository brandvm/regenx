// Tabs built from plain elements or two CMS lists (Webflow's Tabs element
// can't be bound to a collection). Snippet: webflow-build recipes/snippets.
//
// Markup, inside [data-tabs]:
//   [data-tabs-tab]    a button per tab (a CMS list item each, or static)
//   [data-tabs-panel]  a panel per tab (a second CMS list, or static)
// The n-th tab shows the n-th panel (or the panel its aria-controls names).
// The module writes the ids, aria-controls / aria-labelledby, the roles,
// and fixes the CMS wrappers: Webflow publishes role="list" / "listitem"
// on Collection Lists, so the tabs' list becomes the tablist and the other
// wrappers presentation. [data-tabs-number] inside a tab is filled with
// 01, 02…
//
// The active tab gets .is-active (a Designer combo class) and
// aria-selected; a tab with aria-selected="true" in the markup starts
// active, else the first. Arrow keys, Home and End move between tabs
// (roving tabindex). Panels use the `hidden` attribute.
export function initTabs(): void {
  document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((root, r) => {
    const tabs = Array.from(root.querySelectorAll<HTMLElement>('[data-tabs-tab]'));
    if (!tabs.length) return;
    const loose = Array.from(root.querySelectorAll<HTMLElement>('[data-tabs-panel]'));
    const base = root.id || `tabs-${r + 1}`;

    const list = tabs[0].closest<HTMLElement>('[role="tablist"], [role="list"]');
    if (list && root.contains(list)) {
      list.setAttribute('role', 'tablist');
      tabs.forEach((tab) => {
        for (let el = tab.parentElement; el && el !== list; el = el.parentElement) {
          if (el.getAttribute('role') === 'listitem') el.setAttribute('role', 'presentation');
        }
      });
    } else tabs[0].parentElement?.setAttribute('role', 'tablist');

    const panels = tabs.map((tab, i) => {
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '') ?? loose[i] ?? null;
      tab.id ||= `${base}-tab-${i + 1}`;
      tab.setAttribute('role', 'tab');
      tab.querySelectorAll('[data-tabs-number]').forEach((el) => (el.textContent = String(i + 1).padStart(2, '0')));
      if (panel) {
        panel.id ||= `${base}-panel-${i + 1}`;
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        if (!panel.hasAttribute('tabindex')) panel.tabIndex = 0;
        // A role="list" around tabpanels is a list without list items.
        for (let el = panel.parentElement; el && el !== root; el = el.parentElement) {
          const role = el.getAttribute('role');
          if (role === 'list' || role === 'listitem') el.setAttribute('role', 'presentation');
        }
      }
      return panel;
    });

    const select = (index: number, focus = false) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (panels[i]) panels[i]!.hidden = !active;
      });
      if (focus) tabs[index].focus();
    };
    select(Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true')));

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        select(i);
      });
      tab.addEventListener('keydown', (e) => {
        const last = tabs.length - 1;
        const next =
          e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i === last ? 0 : i + 1)
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i === 0 ? last : i - 1)
          : e.key === 'Home' ? 0
          : e.key === 'End' ? last
          : e.key === 'Enter' || e.key === ' ' ? i
          : -1;
        if (next < 0) return;
        e.preventDefault();
        select(next, true);
      });
    });
  });
}
