// ============================================
// Debug — add ?debug=1 to the URL (or #debug). Logs to console + on-screen panel.
// No-op when off — safe to leave in production. Remove this block once done.
// ============================================
export const Debug = (() => {
  const ON =
    /[?&]debug=1(?:&|$)/.test(location.search) ||
    /(?:^|#).*debug/.test(location.hash) ||
    window.__RGX_DEBUG === true;

  let panel = null;
  const ts = () => String(Math.round(performance.now())).padStart(5, " ");

  function ensurePanel() {
    if (!ON || panel || !document.body) return;
    panel = document.createElement("div");
    panel.id = "rgx-debug";
    Object.assign(panel.style, {
      position: "fixed",
      top: "8px",
      right: "8px",
      zIndex: "2147483647",
      maxWidth: "min(440px, 92vw)",
      maxHeight: "62vh",
      overflow: "auto",
      background: "rgba(12,12,12,.86)",
      color: "#9bffa3",
      font: "11px/1.5 ui-monospace, Menlo, Consolas, monospace",
      padding: "8px 10px",
      borderRadius: "6px",
      whiteSpace: "pre-wrap",
      pointerEvents: "auto",
      boxShadow: "0 6px 24px rgba(0,0,0,.45)",
    });
    panel.textContent = "RGX debug\n";
    document.body.appendChild(panel);
  }

  function fmt(a) {
    if (a === null) return "null";
    if (typeof a === "object") {
      try {
        return JSON.stringify(a);
      } catch (_) {
        return String(a);
      }
    }
    return String(a);
  }

  function log(...args) {
    if (!ON) return;
    const line = `[${ts()}ms] ` + args.map(fmt).join(" ");
    console.log("%c[RGX]", "color:#7cc;font-weight:bold", line);
    const write = () => {
      ensurePanel();
      if (panel) {
        panel.appendChild(document.createTextNode(line + "\n"));
        panel.scrollTop = panel.scrollHeight;
      }
    };
    if (document.body) write();
    else document.addEventListener("DOMContentLoaded", write, { once: true });
  }

  return { ON, log };
})();

Debug.log(
  "script loaded — readyState:",
  document.readyState,
  "| hash:",
  location.hash || "(none)",
  "| search:",
  location.search || "(none)"
);
