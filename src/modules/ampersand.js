// ============================================
// Ampersand — wrap each "&" so it can use its own font.
// ============================================
export const Ampersand = (() => {
  const SKIP =
    "script,style,textarea,code,pre,kbd,samp,noscript,svg,.amp,[data-no-amp]";

  function wrapIn(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeValue.indexOf("&") === -1) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach((textNode) => {
      const frag = document.createDocumentFragment();
      const parts = textNode.nodeValue.split("&");
      parts.forEach((part, i) => {
        if (part) frag.appendChild(document.createTextNode(part));
        if (i < parts.length - 1) {
          const span = document.createElement("span");
          span.className = "amp";
          span.textContent = "&";
          frag.appendChild(span);
        }
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  function init() {
    if (window.Webflow?.env?.("editor")) return;
    const scoped = document.querySelectorAll("[data-amp]");
    if (scoped.length) scoped.forEach(wrapIn);
    else wrapIn(document.body);
  }

  return { init };
})();
