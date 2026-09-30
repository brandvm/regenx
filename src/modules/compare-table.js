import { Debug } from "./debug";

// ============================================
// Compare Table — mobile accordion
//   Desktop (>=768): full grid, inert.
//   Mobile (<=767): tap .compare-label → toggle .is-open on its .compare-row.
//   Collapsing element is .compare-val-w (0fr↔1fr). Single-open, first row open.
// ============================================
export const CompareTable = (() => {
  const MOBILE = "(max-width: 767px)"; // keep in sync with the compare CSS
  const SINGLE_OPEN = true; // false = allow several rows open

  function init() {
    const tables = Array.from(document.querySelectorAll(".compare-table"));
    if (!tables.length) {
      Debug.log("CompareTable: none found — skipped");
      return;
    }
    const mq = window.matchMedia(MOBILE);

    tables.forEach((table, ti) => {
      const rows = Array.from(table.querySelectorAll("[data-compare-toggle]"));
      if (!rows.length) {
        Debug.log(
          "CompareTable: table has no [data-compare-toggle] rows — skipped"
        );
        return;
      }

      const heads = rows.map((r) => r.querySelector(".compare-label"));
      const panels = rows.map((r) => r.querySelector(".compare-val-w"));

      // wire aria: label is the control, panel is what it controls
      rows.forEach((row, i) => {
        const head = heads[i];
        const panel = panels[i];
        if (head && panel && !panel.id) {
          const id = `cmp-t${ti}-r${i}`;
          panel.id = id;
          head.setAttribute("aria-controls", id);
        }
      });

      const setOpen = (row, head, open) => {
        row.classList.toggle("is-open", open);
        if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
      };

      rows.forEach((row, i) => {
        const head = heads[i];
        if (!head) return;

        const toggle = () => {
          if (!mq.matches) return; // desktop: grid shows everything, inert
          const willOpen = !row.classList.contains("is-open");
          if (SINGLE_OPEN && willOpen) {
            rows.forEach((other, j) => {
              if (other !== row) setOpen(other, heads[j], false);
            });
          }
          setOpen(row, head, willOpen);
        };

        head.addEventListener("click", toggle);
        head.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        });
      });

      // mobile → label acts as a button, first row open
      // desktop → strip interactive state, clear .is-open (grid shows all)
      const sync = (mobile) => {
        rows.forEach((row, i) => {
          const head = heads[i];
          if (mobile) {
            if (head) {
              head.setAttribute("role", "button");
              head.setAttribute("tabindex", "0");
            }
            setOpen(row, head, i === 0);
          } else {
            row.classList.remove("is-open");
            if (head) {
              head.removeAttribute("role");
              head.removeAttribute("tabindex");
              head.removeAttribute("aria-expanded");
            }
          }
        });
      };

      sync(mq.matches);
      const onChange = (e) => sync(e.matches);
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    });

    Debug.log(
      "CompareTable: init —",
      tables.length,
      "table(s) | mobile:",
      mq.matches
    );
  }

  return { init };
})();
