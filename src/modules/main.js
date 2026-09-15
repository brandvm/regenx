import { gsap, ScrollTrigger, SplitText } from "./animation";
import Swiper from "swiper";
import {
  Navigation, Pagination, A11y, Autoplay, Thumbs, EffectFade, EffectCoverflow,
} from "swiper/modules";

// Keep the modules used by CONFIGS, its data-attribute overrides, and the
// pagination/thumbs helpers. Preserve the bundle's module registration order.
Swiper.use([Navigation, Pagination, A11y, Autoplay, Thumbs, EffectFade, EffectCoverflow]);

// ============================================
// Debug — add ?debug=1 to the URL (or #debug). Logs to console + on-screen panel.
// No-op when off — safe to leave in production. Remove this block once done.
// ============================================
const Debug = (() => {
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

// Resolves ONCE the page is unlocked & scrollable (preloader done, or none).
const PageReady = (() => {
  let resolved = false;
  const queue = [];
  return {
    signal() {
      if (resolved) return;
      resolved = true;
      Debug.log("PageReady -> SIGNAL (page unlocked). queued:", queue.length);
      while (queue.length) queue.shift()();
    },
    ready(fn) {
      resolved ? fn() : queue.push(fn);
    },
  };
})();

// ============================================
// Favicon — staging override.
//   On *.webflow.io only, replace the production favicon with a staging one.
//   On staging, follow the OS color scheme: LIGHT is the default, DARK swaps
//   in when prefers-color-scheme: dark. Production is left untouched.
//   Update the two URLs below with your uploaded staging favicon assets.
// ============================================
const Favicon = (() => {
  const LIGHT =
    "https://cdn.prod.website-files.com/6a343f4bd4c8ed2f7270a980/6a355aa385fb38285173da47_Favicon%20Staging.svg"; // default
  const DARK =
    "https://cdn.prod.website-files.com/6a343f4bd4c8ed2f7270a980/6a355aecc4e3d18c324d3dfd_Favicon%20Staging%20Light.svg";

  function setFavicon(href) {
    // Remove every existing icon link Webflow injected.
    document
      .querySelectorAll(
        'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
      )
      .forEach((el) => el.parentNode && el.parentNode.removeChild(el));

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = href + "?v=" + Date.now(); // cache-bust so the swap is visible
    document.head.appendChild(link);
  }

  function init() {
    if (!location.hostname.endsWith(".webflow.io")) {
      Debug.log("Favicon: not a staging host — production favicon kept");
      return;
    }

    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = darkQuery.matches;
      Debug.log("Favicon: staging host — applying", dark ? "DARK" : "LIGHT");
      setFavicon(dark ? DARK : LIGHT);
    };

    apply();

    // Live swap if the user toggles OS theme while on the page.
    if (darkQuery.addEventListener) {
      darkQuery.addEventListener("change", apply);
    } else if (darkQuery.addListener) {
      darkQuery.addListener(apply); // older Safari
    }
  }

  return { init };
})();

// ============================================
// Nav Shrink
// ============================================
const NavShrink = (() => {
  function init() {
    const targets = document.querySelectorAll(".g-nav-w, .s-g-nav, .sw-g-nav");
    if (!targets.length) return;

    const getThresholdPx = () => window.innerHeight * 0.05; // 5vh
    let thresholdPx = getThresholdPx();
    let last = null;
    let ticking = false;

    const apply = () => {
      ticking = false;
      const shouldShrink = window.scrollY >= thresholdPx;
      if (shouldShrink === last) return;
      last = shouldShrink;
      targets.forEach((el) => el.classList.toggle("is-shrunk", shouldShrink));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };

    const onResize = () => {
      thresholdPx = getThresholdPx();
      last = null;
      apply();
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
  }

  return { init };
})();

// ============================================
// Sticky Center
// ============================================
const StickyCenter = (() => {
  function init(selector = "[data-sticky-center]") {
    const elements = Array.from(document.querySelectorAll(selector));
    if (!elements.length) return;

    let ticking = false;

    const apply = () => {
      ticking = false;
      const tops = elements.map((el) =>
        Math.max(0, (window.innerHeight - el.offsetHeight) / 2)
      );
      elements.forEach((el, i) => {
        el.style.top = `${tops[i]}px`;
      });
    };

    const onResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("resize", onResize, { passive: true });
  }

  return { init };
})();

// ============================================
// Ampersand — wrap each "&" so it can use its own font.
// ============================================
const Ampersand = (() => {
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

// ============================================
// Reveals — text / element entrance animations (tab-aware)
// ============================================
const Reveals = (() => {
  const TEXT_VARS = {
    y: "0.15em",
    opacity: 0,
    filter: "blur(8px)",
    duration: 0.8,
    ease: "power2.out",
    stagger: 0.024,
  };
  const EL_VARS = {
    y: "0.15em",
    opacity: 0,
    filter: "blur(8px)",
    duration: 0.8,
    ease: "power2.out",
  };

  function buildAnim(el) {
    if (el.hasAttribute("data-animate-in-text")) {
      const split = SplitText.create(el, { type: "words" });
      return gsap.from(split.words, { ...TEXT_VARS, paused: true });
    }
    return gsap.from(el, { ...EL_VARS, paused: true });
  }

  function init() {
    if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
      Debug.log("Reveals: gsap/ScrollTrigger/SplitText MISSING — skipped");
      return;
    }
    gsap.registerPlugin(ScrollTrigger, SplitText);

    gsap.utils
      .toArray("[data-animate-in-text], [data-animate-in]")
      .forEach((el) => {
        const tween = buildAnim(el);
        const pane = el.closest(".w-tab-pane");
        const startsActive = !pane || pane.classList.contains("w--tab-active");

        let st = null;
        if (startsActive) {
          st = ScrollTrigger.create({
            trigger: el,
            start: "top 80%",
            animation: tween,
            toggleActions: "play none none none",
          });
        } else {
          tween.pause(0);
        }

        if (!pane) return;

        (pane._anim ||= []).push({ tween, st });

        if (!pane._animObserver) {
          let wasActive = pane.classList.contains("w--tab-active");
          pane._animObserver = new MutationObserver(() => {
            const isActive = pane.classList.contains("w--tab-active");

            if (isActive && !wasActive) {
              pane._anim.forEach(({ tween, st }) => {
                if (st) st.disable();
                tween.restart();
              });
            } else if (!isActive && wasActive) {
              pane._anim.forEach(({ tween, st }) => {
                if (st) st.disable();
                tween.pause(0);
              });
            }
            wasActive = isActive;
          });
          pane._animObserver.observe(pane, {
            attributes: true,
            attributeFilter: ["class"],
          });
        }
      });
  }

  return { init };
})();

// ============================================
// Tab Deep Link — open a tab from the URL, then scroll its section into view.
//   link to:  /studio#fashion   (or  /studio?tab=fashion )
//   matches   data-tab-id / data-w-tab on the .w-tab-link
//   scroll target: the element carrying data-tab-scroll anywhere inside the
//                  tab's <section> (e.g. your .anchor-extension). If its value
//                  names a real element id, scroll there; otherwise scroll to
//                  the element that carries the attribute. Falls back to .w-tabs.
// ============================================
const TabDeepLink = (() => {
  const slug = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, "-");

  function wanted() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, "")).split(
      "?"
    )[0];
    if (hash) return slug(hash);
    const q = new URLSearchParams(location.search).get("tab");
    return q ? slug(q) : "";
  }

  function targetLink() {
    const want = wanted();
    if (!want) return null;
    let match = null;
    document.querySelectorAll(".w-tab-link").forEach((link) => {
      if (match) return;
      if (
        slug(link.getAttribute("data-tab-id")) === want ||
        slug(link.getAttribute("data-w-tab")) === want
      ) {
        match = link;
      }
    });
    return match;
  }

  function open() {
    const link = targetLink();
    if (link && !link.classList.contains("w--current")) link.click();
    return link;
  }

  function resolveScrollTarget(link) {
    const tabs = link.closest(".w-tabs");
    const scope = link.closest("section") || tabs || document;

    // marker = the element that carries data-tab-scroll (link, .w-tabs, or
    // anywhere in the section — e.g. your .anchor-extension div).
    const marker =
      (link.hasAttribute("data-tab-scroll") && link) ||
      (tabs && tabs.hasAttribute("data-tab-scroll") && tabs) ||
      scope.querySelector("[data-tab-scroll]");

    if (marker) {
      const id = (marker.getAttribute("data-tab-scroll") || "").replace(
        /^#/,
        ""
      );
      // value names a real element → use it; else scroll to the marker itself
      return (id && document.getElementById(id)) || marker;
    }
    return tabs; // last-resort default: the tabs block
  }

  function scrollIntoView() {
    const link = targetLink();
    if (!link) return;
    const target = resolveScrollTarget(link);
    Debug.log(
      "TabDeepLink.scroll — target:",
      target ? target.id || target.className || "(element)" : "NONE"
    );
    if (target) requestAnimationFrame(() => Anchors.scrollToEl(target, false));
  }

  function init() {
    // open early (behind the preloader)…
    if (window.Webflow?.push) window.Webflow.push(() => open());
    else open();
    // …then, once unlocked, re-confirm the tab and scroll its section in.
    PageReady.ready(() => {
      open();
      scrollIntoView();
    });
    window.addEventListener("hashchange", () => open());
  }

  return { init, open };
})();

// ============================================
// Anchors — make hash links work with the preloader + Lenis
// ============================================
const Anchors = (() => {
  const HEADER_OFFSET = 0; // your .anchor-extension divs already offset for the nav

  const getById = (id) => {
    if (!id) return null;
    try {
      return document.getElementById(id);
    } catch (_) {
      return null;
    }
  };

  function scrollToEl(el, smooth) {
    if (!el) return;
    const hasLenis = !!window.lenis;
    if (hasLenis) {
      // Lenis measured its scroll limit while the page was locked, so refresh
      // its dimensions before scrolling or the jump gets clamped to 0.
      if (typeof window.lenis.resize === "function") window.lenis.resize();
      Debug.log(
        "scrollToEl ->",
        smooth ? "smooth" : "jump",
        "| via: lenis | limit:",
        window.lenis.limit
      );
      window.lenis.scrollTo(el, { offset: HEADER_OFFSET, immediate: !smooth });
    } else {
      Debug.log("scrollToEl ->", smooth ? "smooth" : "jump", "| via: native");
      el.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  }

  function landing() {
    const id = decodeURIComponent(
      (location.hash || "").replace(/^#/, "")
    ).split("?")[0];
    const el = getById(id);
    Debug.log(
      "Anchors.landing — hash:",
      location.hash || "(none)",
      "| id:",
      id || "-",
      "| element found:",
      !!el,
      "| lenis:",
      !!window.lenis
    );
    if (el) requestAnimationFrame(() => scrollToEl(el, false));
  }

  function onClick(e) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;

    const a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    if (a.classList.contains("w-tab-link") || a.closest(".w-tab-menu")) return;

    let url;
    try {
      url = new URL(a.href, location.href);
    } catch (_) {
      return;
    }
    if (url.pathname !== location.pathname || url.search !== location.search)
      return;

    const id = decodeURIComponent(url.hash.replace(/^#/, ""));
    const el = getById(id);
    if (!el) return;

    e.preventDefault();
    Debug.log("Anchors.onClick — intercept #", id);
    scrollToEl(el, true);
    history.pushState(null, "", "#" + id);
  }

  function init() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    document.addEventListener("click", onClick);
    PageReady.ready(landing);
  }

  return { init, landing, scrollToEl };
})();

// ============================================
// Footer Nav — mobile accordion (grid-rows toggle)
//   Columns collapse on mobile; the .g-footer-nav-title <button> toggles
//   .is-open on its .g-footer-nav-item (CSS animates grid-template-rows).
//   Inert on desktop (CSS sets pointer-events:none), where lists stay open.
// ============================================
const FooterNav = (() => {
  const MOBILE = "(max-width: 767px)"; // keep in sync with the footer CSS
  const SINGLE_OPEN = false; // true = only one column open at a time

  function init() {
    const nav = document.querySelector(".g-footer-nav");
    if (!nav) {
      Debug.log("FooterNav: .g-footer-nav not found — skipped");
      return;
    }

    const btns = Array.from(nav.querySelectorAll(".g-footer-nav-title"));
    if (!btns.length) {
      Debug.log("FooterNav: no .g-footer-nav-title buttons — skipped");
      return;
    }

    const mq = window.matchMedia(MOBILE);

    const setOpen = (item, btn, open) => {
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    };

    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!mq.matches) return; // desktop: lists always open, button inert
        const item = btn.closest(".g-footer-nav-item");
        if (!item) return;
        const willOpen = !item.classList.contains("is-open");

        if (SINGLE_OPEN && willOpen) {
          btns.forEach((other) => {
            const oi = other.closest(".g-footer-nav-item");
            if (oi && oi !== item) setOpen(oi, other, false);
          });
        }
        setOpen(item, btn, willOpen);
        Debug.log(
          "FooterNav: toggle",
          item.getAttribute("aria-label") || "(col)",
          "->",
          willOpen ? "open" : "closed"
        );
      });
    });

    // Leaving mobile → reset, so panels & aria-expanded don't get stuck open
    // when crossing the breakpoint.
    const onChange = (e) => {
      if (!e.matches) {
        btns.forEach((btn) => {
          const item = btn.closest(".g-footer-nav-item");
          if (item) setOpen(item, btn, false);
        });
        Debug.log("FooterNav: left mobile — reset panels");
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange); // older Safari

    Debug.log(
      "FooterNav: init —",
      btns.length,
      "columns | mobile:",
      mq.matches
    );
  }

  return { init };
})();

// ============================================
// Compare Table — mobile accordion
//   Desktop (>=768): full grid, inert.
//   Mobile (<=767): tap .compare-label → toggle .is-open on its .compare-row.
//   Collapsing element is .compare-val-w (0fr↔1fr). Single-open, first row open.
// ============================================
const CompareTable = (() => {
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

// ============================================
// Tab Graphics — custom entrance for the active tab's graphic.
//   On every tab switch, animates [data-tab-gfx] inside the newly
//   active .w-tab-pane. Uses GSAP if present, else a CSS class.
//   Pairs with native Webflow Tabs — no markup logic, just the reveal.
// ============================================
const TabGraphics = (() => {
  const SEL_PANE = ".w-tab-pane";
  const SEL_GFX = "[data-tab-gfx]";
  const ACTIVE = "w--tab-active";

  const GSAP_FROM = { opacity: 0, y: 16, scale: 0.985 };
  const GSAP_TO = {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.735,
    ease: "power2.out",
    delay: 0.24,
  };

  function playGSAP(gfx) {
    gsap.killTweensOf(gfx);
    gsap.fromTo(gfx, GSAP_FROM, GSAP_TO);
  }

  function playCSS(gfx) {
    gfx.forEach((el) => {
      el.classList.remove("is-tab-in");
      void el.offsetWidth;
      el.classList.add("is-tab-in");
    });
  }

  function play(pane) {
    const gfx = pane.querySelectorAll(SEL_GFX);
    if (!gfx.length) return;
    if (window.gsap) playGSAP(gfx);
    else playCSS(gfx);
  }

  function wire(tabs) {
    const panes = Array.from(tabs.querySelectorAll(SEL_PANE));
    if (!panes.length) return;

    panes.forEach((pane) => {
      let wasActive = pane.classList.contains(ACTIVE);
      // animate the one that's active on load
      if (wasActive) play(pane);

      const obs = new MutationObserver(() => {
        const isActive = pane.classList.contains(ACTIVE);
        if (isActive && !wasActive) play(pane);
        wasActive = isActive;
      });
      obs.observe(pane, { attributes: true, attributeFilter: ["class"] });
    });
  }

  function init() {
    const blocks = document.querySelectorAll("[data-tab-gfx-scope]");
    const scopes = blocks.length
      ? blocks
      : document.querySelectorAll(".process");
    if (!scopes.length) {
      Debug.log("TabGraphics: no tab scope found — skipped");
      return;
    }
    scopes.forEach(wire);
    Debug.log(
      "TabGraphics: init —",
      scopes.length,
      "tab block(s) | gsap:",
      !!window.gsap
    );
  }

  return { init };
})();

// ============================================
// SmartSwiper — config-driven Swiper manager (Webflow-tab aware)
//   One entry per slider in CONFIGS. Lazy-inits when visible (a slider built
//   inside a hidden .w-tab-pane measures 0 width), rebuilds on tab activation
//   via observePaneFor, and supports synced sliders (image ⇄ info) + thumbs.
//   Uses the bundled Swiper dependency and stylesheet.
// ============================================
var SmartSwiper = (function () {
  var hasIO = "IntersectionObserver" in window;
  var reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------------------
  // CONFIGS
  // ---------------------------------------------------------------------------
  var CONFIGS = [
    // ---- Services: image carousel (MAIN) + info carousel (SYNCED) ----
    {
      selector: ".swiper.product-coursel-image",
      wrapper: ".service-tab-product-carousel",
      navPrev: ".swiper-prev",
      navNext: ".swiper-next",

      // Coverflow stretch pulls each slide 100px toward centre, so roughly
      // twice as many slides land inside the frame as Swiper measures.
      // Below this count the fan can never be filled — loop is swapped for
      // rewind in initOne rather than left half-broken.
      minLoopSlides: 14,

      opts: {
        effect: "coverflow",
        centeredSlides: true,
        grabCursor: true,
        loop: true,

        slideToClickedSlide: true,

        loopAdditionalSlides: 6, // ← the fix: buffer that covers the fan
        loopPreventsSliding: false, // lets a flick start before the last one ends
        touchRatio: 0.6, // tames how far one fast drag travels

        speed: 735,
        slidesPerView: "auto",
        spaceBetween: 0,
        coverflowEffect: {
          rotate: 0,
          stretch: 100,
          depth: 0,
          modifier: 1,
          scale: 1,
          opacity: 0.8,
          slideShadows: false,
        },
      },

      sync: {
        selector: ".swiper.product-coursel-info",
        opts: {
          effect: "fade",
          fadeEffect: { crossFade: true },
          slidesPerView: 1,
          loop: false,
          speed: 735,
          allowTouchMove: false,

          autoHeight: true, // ← wrapper height follows the active slide
        },
      },
    },

    {
      selector: ".card-row-carousel .swiper.card-row-slider",
      wrapper: ".s-wrapper",
      navPrev: ".swiper-prev",
      navNext: ".swiper-next",
      opts: {
        slidesPerView: 4,
        spaceBetween: 24,
        grabCursor: true,
        speed: 500,
        breakpoints: {
          0: { slidesPerView: 1.1, spaceBetween: 16 },
          768: { slidesPerView: 2.2, spaceBetween: 20 },
          1200: { slidesPerView: 4, spaceBetween: 24 },
        },
      },
    },
    {
      selector: ".product-slider-main .swiper.product-slider",
      wrapper: ".product-slider-w",
      navPrev: ".swiper-prev",
      navNext: ".swiper-next",
      opts: {
        slidesPerView: 3,
        spaceBetween: 24,
        grabCursor: true,
        speed: 500,
        breakpoints: {
          0: { slidesPerView: 1.1, spaceBetween: 16 },
          768: { slidesPerView: 2.2, spaceBetween: 20 },
          1200: { slidesPerView: 3, spaceBetween: 24 },
        },
      },
    },
  ];

  // ---------------------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------------------
  function isFn(v) {
    return typeof v === "function";
  }

  function isDisplayed(el) {
    if (!el) return false;
    if (!el.getClientRects || !el.getClientRects().length) return false;
    return true;
  }

  function normalizeOpts(base) {
    var o = Object.assign(
      {
        touchReleaseOnEdges: true,
        simulateTouch: true,
        observer: true,
        observeParents: true,
        observeSlideChildren: true,
      },
      base || {}
    );
    if (reduceMotion) {
      if (o.autoplay) o.autoplay = false;
      o.speed = Math.min(o.speed || 400, 300);
    }
    return o;
  }

  function getInstance(el) {
    return el ? el._smartSwiperInstance || el.swiper || null : null;
  }

  function getRoot(mainEl, cfg) {
    return (
      (cfg.wrapper && mainEl.closest(cfg.wrapper)) ||
      mainEl.parentElement ||
      document
    );
  }

  function resolveScopedEl(mainEl, cfg, selector) {
    if (!selector) return null;
    var scope = getRoot(mainEl, cfg);
    return scope.querySelector(selector);
  }

  function resolveNav(el, cfg) {
    var scope = getRoot(el, cfg);
    var prev = cfg.navPrev
      ? scope.querySelector(cfg.navPrev)
      : scope.querySelector(".swiper-prev");
    var next = cfg.navNext
      ? scope.querySelector(cfg.navNext)
      : scope.querySelector(".swiper-next");
    return { scope: scope, prev: prev, next: next };
  }

  function withNav(el, cfg, opts) {
    var nav = resolveNav(el, cfg);
    if (nav.prev || nav.next) {
      opts.navigation = { prevEl: nav.prev || null, nextEl: nav.next || null };
    }
    return opts;
  }

  function withPagination(el, cfg, opts) {
    if (!cfg.pagination) return opts;
    var paginationEl =
      typeof cfg.pagination.el === "string"
        ? resolveScopedEl(el, cfg, cfg.pagination.el)
        : cfg.pagination.el || null;
    if (!paginationEl) return opts;
    opts.pagination = Object.assign({}, cfg.pagination, { el: paginationEl });
    return opts;
  }

  function readDataOverrides(el, opts) {
    var over = Object.assign({}, opts);
    var dataset = el.dataset;
    if ("swiperLoop" in dataset) over.loop = dataset.swiperLoop === "true";
    if ("swiperSpeed" in dataset) {
      over.speed = Math.max(
        0,
        parseInt(dataset.swiperSpeed, 10) || over.speed || 400
      );
    }
    if ("swiperAutoplay" in dataset) {
      if (dataset.swiperAutoplay === "false") over.autoplay = false;
      else {
        var delay = Math.max(0, parseInt(dataset.swiperAutoplay, 10) || 0);
        over.autoplay = delay
          ? { delay: delay, disableOnInteraction: true }
          : false;
      }
    }
    return over;
  }

  function bindEdgeNavHiding(el, swiper, prevEl, nextEl) {
    if (!swiper || el.dataset.edgeNavBound) return;
    el.dataset.edgeNavBound = "1";
    var setHidden = function (btn, hidden) {
      if (btn) btn.style.opacity = hidden ? "0.2" : "";
    };
    var update = function () {
      var locked = !!swiper.isLocked;
      setHidden(prevEl, locked || !!swiper.isBeginning);
      setHidden(nextEl, locked || !!swiper.isEnd);
    };
    update();
    [
      "slideChange",
      "reachBeginning",
      "reachEnd",
      "fromEdge",
      "resize",
      "update",
      "lock",
      "unlock",
    ].forEach(function (evt) {
      try {
        swiper.on(evt, update);
      } catch (_) {}
    });
  }

  // ---- Thumbs (kept from your version) ----
  function resolveThumbsEl(mainEl, cfg) {
    if (!cfg.thumbs || !cfg.thumbs.selector) return null;
    return resolveScopedEl(mainEl, cfg, cfg.thumbs.selector);
  }

  function ensureThumbsInit(mainEl, cfg) {
    var thumbsEl = resolveThumbsEl(mainEl, cfg);
    if (!thumbsEl) return null;
    var thumbsSwiper = getInstance(thumbsEl);
    if (thumbsSwiper) return thumbsSwiper;
    var thumbsOpts = normalizeOpts(
      readDataOverrides(thumbsEl, (cfg.thumbs && cfg.thumbs.opts) || {})
    );
    try {
      thumbsSwiper = new Swiper(thumbsEl, thumbsOpts);
      thumbsEl._smartSwiperInstance = thumbsSwiper;
      try {
        thumbsSwiper.update();
        thumbsSwiper.slideTo(0, 0);
      } catch (_) {}
      return thumbsSwiper;
    } catch (_) {
      return null;
    }
  }

  function syncThumbs(mainSwiper, thumbsSwiper) {
    if (!mainSwiper || !thumbsSwiper) return;
    try {
      if (!mainSwiper.thumbs) mainSwiper.thumbs = {};
      mainSwiper.thumbs.swiper = thumbsSwiper;
      if (isFn(mainSwiper.thumbs.init)) mainSwiper.thumbs.init();
      if (isFn(mainSwiper.thumbs.update)) mainSwiper.thumbs.update();
      mainSwiper.update();
      thumbsSwiper.update();
    } catch (_) {}
  }

  // ---- Sync (NEW): a second slider controller-linked to the main one ----
  function resolveSyncEl(mainEl, cfg) {
    if (!cfg.sync || !cfg.sync.selector) return null;
    return resolveScopedEl(mainEl, cfg, cfg.sync.selector);
  }

  function ensureSyncInit(mainEl, cfg) {
    var el = resolveSyncEl(mainEl, cfg);
    if (!el) return null;
    var existing = getInstance(el);
    if (existing) return existing;
    if (!isDisplayed(el)) return null; // hidden with the main one (same pane) → defer together
    var opts = normalizeOpts(
      readDataOverrides(el, (cfg.sync && cfg.sync.opts) || {})
    );
    try {
      var s = new Swiper(el, opts);
      el._smartSwiperInstance = s;
      el.dataset.swiperInited = "1";
      try {
        s.update();
        s.slideTo(0, 0);
      } catch (_) {}
      return s;
    } catch (_) {
      return null;
    }
  }

  // ---- Sync: index-driven (Swiper's Controller module doesn't support loop mode).
  // The image swiper drives; the info swiper follows via realIndex.
  function linkControllers(main, sync) {
    if (!main || !sync) return;
    if (main.__rgxSyncedTo === sync) return; // already driving this instance
    main.__rgxSyncedTo = sync;

    var align = function (speed) {
      if (!sync || sync.destroyed) return;
      var i =
        typeof main.realIndex === "number" ? main.realIndex : main.activeIndex;
      if (sync.params.loop) sync.slideToLoop(i, speed);
      else sync.slideTo(i, speed);
    };

    main.on("slideChange", function () {
      align(main.params.speed);
    });

    align(0); // initial alignment — fixes the offset you see on load
  }

  function repairIfNeeded(el) {
    var cfg = CONFIGS.find(function (c) {
      return el.matches(c.selector);
    });
    if (!cfg) return;
    var inst = getInstance(el);
    if (!inst) return;
    var nav = resolveNav(el, cfg);

    try {
      if (cfg.thumbs) {
        var thumbsEl = resolveThumbsEl(el, cfg);
        var thumbsInst =
          (thumbsEl && getInstance(thumbsEl)) || ensureThumbsInit(el, cfg);
        if (thumbsInst) syncThumbs(inst, thumbsInst);
      }
    } catch (_) {}

    try {
      if (cfg.sync) {
        var syncEl = resolveSyncEl(el, cfg);
        var syncInst =
          (syncEl && getInstance(syncEl)) || ensureSyncInit(el, cfg);
        if (syncInst) {
          linkControllers(inst, syncInst);
          if (isDisplayed(syncEl)) {
            try {
              syncInst.update();
            } catch (_) {}
          }
        }
      }
    } catch (_) {}

    if (isDisplayed(el)) {
      try {
        inst.update();
        if (inst.navigation && isFn(inst.navigation.update))
          inst.navigation.update();
        if (inst.pagination) {
          if (isFn(inst.pagination.render)) inst.pagination.render();
          if (isFn(inst.pagination.update)) inst.pagination.update();
        }
      } catch (_) {}
    }

    bindEdgeNavHiding(el, inst, nav.prev, nav.next);
  }

  function initOne(el) {
    if (!el) return;
    var cfg = CONFIGS.find(function (c) {
      return el.matches(c.selector);
    });
    if (!cfg) return;

    var existing = getInstance(el);
    if (existing) {
      repairIfNeeded(el);
      return;
    }
    if (!isDisplayed(el)) return; // hidden (e.g. inactive tab) → observePaneFor revisits

    var opts = withPagination(
      el,
      cfg,
      withNav(el, cfg, normalizeOpts(readDataOverrides(el, cfg.opts)))
    );

    // Loop needs slides on BOTH sides of the fan at all times. The Enclomiphene
    // and Peptide tabs only carry 6 products — fewer than the fan shows — so
    // loop there can only ever run out mid-drag. Rewind instead: same wrap
    // behaviour at the ends, but the rail is never short of slides.
    var slideCount = el.querySelectorAll(".swiper-slide").length;
    if (opts.loop && cfg.minLoopSlides && slideCount < cfg.minLoopSlides) {
      opts.loop = false;
      opts.rewind = true;
      Debug.log(
        "SmartSwiper: only",
        slideCount,
        "slides (need",
        cfg.minLoopSlides,
        ") — loop off, rewind on"
      );
    }

    var nav = resolveNav(el, cfg);

    var thumbsSwiper = null;
    if (cfg.thumbs) {
      thumbsSwiper = ensureThumbsInit(el, cfg);
      if (thumbsSwiper) opts.thumbs = { swiper: thumbsSwiper };
    }

    var syncSwiper = null;
    if (cfg.sync) syncSwiper = ensureSyncInit(el, cfg);

    el.dataset.swiperInited = "1";

    try {
      var swiper = new Swiper(el, opts);
      el._smartSwiperInstance = swiper;

      bindEdgeNavHiding(el, swiper, nav.prev, nav.next);
      if (thumbsSwiper) syncThumbs(swiper, thumbsSwiper);
      if (syncSwiper) linkControllers(swiper, syncSwiper);

      try {
        swiper.update();
        if (swiper.pagination) {
          if (isFn(swiper.pagination.render)) swiper.pagination.render();
          if (isFn(swiper.pagination.update)) swiper.pagination.update();
        }
        if (thumbsSwiper) thumbsSwiper.update();
        if (syncSwiper) syncSwiper.update();
      } catch (_) {}
    } catch (err) {
      delete el.dataset.swiperInited;
      throw err;
    }
  }

  var sliderSelector = CONFIGS.map(function (c) {
    return c.selector;
  }).join(", ");

  function scan() {
    return sliderSelector ? Array.from(document.querySelectorAll(sliderSelector)) : [];
  }

  // ---- Tab-pane awareness (NEW) ----
  // Build/refresh a slider the instant its Webflow tab goes active. SmartSwiper
  // already DEFERS hidden sliders (isDisplayed===false), so this is the reliable
  // "you're visible now" signal — covers deep links / programmatic tab changes
  // the .w-tab-link click handler can miss. No-op for sliders not inside a tab.
  function observePaneFor(el) {
    if (!el || el.dataset.tabObserved) return;
    var pane = el.closest(".w-tab-pane");
    if (!pane) return;
    el.dataset.tabObserved = "1";

    var ACTIVE = "w--tab-active";
    var was = pane.classList.contains(ACTIVE);

    new MutationObserver(function () {
      var is = pane.classList.contains(ACTIVE);
      if (is && !was) {
        // wait for layout to flip with the class before measuring
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            initOne(el);
          });
        });
      }
      was = is;
    }).observe(pane, { attributes: true, attributeFilter: ["class"] });
  }

  var visibilityObserver = null;

  function observeAndInit(els) {
    if (!els.length) return;

    els.forEach(function (el) {
      observePaneFor(el); // tab-activation rebuild (no-op outside tabs)
      initOne(el); // builds now if visible, defers if hidden in a tab
    });

    if (!hasIO) return;
    // Refresh runs on resize and tab changes. Keep one observer for sliders
    // still awaiting visibility instead of adding another observer each time.
    if (!visibilityObserver) {
      visibilityObserver = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              initOne(e.target);
              obs.unobserve(e.target);
            }
          });
        },
        { rootMargin: "200px 0px" }
      );
    }
    els.forEach(function (el) {
      visibilityObserver.observe(el);
    });
  }

  function boot() {
    var els = scan();
    if (!els.length) return;
    observeAndInit(els);
  }

  var debounceT;
  function refresh() {
    clearTimeout(debounceT);
    debounceT = setTimeout(function () {
      boot();
      scan().forEach(function (el) {
        try {
          repairIfNeeded(el);
        } catch (_) {}
      });
    }, 100);
  }

  function init() {
    boot();

    document.addEventListener(
      "click",
      function (e) {
        var link =
          e.target && e.target.closest ? e.target.closest(".w-tab-link") : null;
        if (!link) return;
        setTimeout(refresh, 60);
        setTimeout(refresh, 180);
        setTimeout(refresh, 320);
      },
      true
    );

    window.addEventListener("resize", refresh, { passive: true });

    try {
      Object.defineProperty(window, "onyxSwiper", {
        value: Object.freeze({ refresh: refresh }),
        writable: false,
        configurable: false,
      });
    } catch (_) {}

    Debug.log(
      "SmartSwiper: init — configs:",
      CONFIGS.length,
      "| swiper:",
      !!Swiper
    );
  }

  return Object.freeze({ init: init, refresh: refresh });
})();

// ============================================
// FormSteps — multi-step controller for Webflow Form Blocks
//   All steps live in ONE <form> so Webflow submits every field at once.
//   Panes are [data-step]; only the last pane holds the submit input.
//   Required choice groups and native field validity gate navigation.
//   A disabled fieldset gates Submit independently of Webflow's own disabled
//   state, so validation never unlocks its Turnstile or in-flight request lock.
// ============================================
var FormSteps = (function () {
  function initOne(root) {
    var panes = Array.prototype.slice.call(
      root.querySelectorAll("[data-step]")
    );
    if (!panes.length) return;
    var form = root.matches("form") ? root : root.querySelector("form");
    if (!form) return;

    var label = root.querySelector("[data-step-label]");
    var err = root.querySelector("[data-step-err]");
    var nextButtons = root.querySelectorAll('[data-step-next]:not([type="submit"])');
    var backButtons = root.querySelectorAll("[data-step-back]");
    var submitGates = Array.prototype.map.call(
      form.querySelectorAll('button[type="submit"], input[type="submit"]'),
      function (button) {
        var gate = document.createElement("fieldset");
        gate.setAttribute("data-step-submit-gate", "");
        gate.disabled = true;
        button.before(gate);
        gate.appendChild(button);
        return gate;
      }
    );
    var i = 0;

    function missingGroup(pane) {
      return Array.prototype.find.call(
        pane.querySelectorAll("[data-step-required]"),
        function (group) { return !group.querySelector("input:checked:not(:disabled)"); }
      );
    }

    function invalidField(pane) {
      return Array.prototype.find.call(
        pane.querySelectorAll("input, select, textarea"),
        function (field) { return field.willValidate && !field.validity.valid; }
      );
    }

    function isValid(pane) {
      return !missingGroup(pane) && !invalidField(pane);
    }

    function syncButtons() {
      nextButtons.forEach(function (button) {
        button.disabled = i === panes.length - 1 || !isValid(panes[i]);
      });
      backButtons.forEach(function (button) {
        button.hidden = i === 0;
        button.disabled = i === 0;
      });
      var canSubmit = i === panes.length - 1 && panes.every(isValid);
      submitGates.forEach(function (gate) { gate.disabled = !canSubmit; });
    }

    function show(next, focus) {
      i = Math.max(0, Math.min(panes.length - 1, next));
      panes.forEach(function (p, n) {
        p.hidden = n !== i;
        p.classList.toggle("is-active", n === i);
      });
      if (label) label.textContent = "Step " + (i + 1) + " of " + panes.length;
      if (err) err.hidden = true;
      syncButtons();
      var focusable = panes[i].querySelector("input, select, textarea, button");
      if (focus !== false && focusable) focusable.focus({ preventScroll: true });
      Debug.log("FormSteps: step", i + 1, "of", panes.length);
    }

    function validate(pane) {
      var group = missingGroup(pane);
      if (group) {
        if (err) err.hidden = false;
        return false;
      }
      var field = invalidField(pane);
      if (field) {
        field.reportValidity();
        return false;
      }
      return true;
    }

    root.addEventListener("click", function (e) {
      var next = e.target.closest ? e.target.closest('[data-step-next]:not([type="submit"])') : null;
      var back = e.target.closest ? e.target.closest("[data-step-back]") : null;
      if (next) {
        e.preventDefault();
        if (validate(panes[i])) show(i + 1);
        return;
      }
      if (back) {
        e.preventDefault();
        show(i - 1);
      }
    });

    function onEdit() {
      if (err) err.hidden = true;
      syncButtons();
    }
    root.addEventListener("input", onEdit);
    root.addEventListener("change", onEdit);
    root.addEventListener("focusin", syncButtons);
    window.addEventListener("pageshow", syncButtons);
    form.addEventListener("reset", function () {
      // The browser restores default values after the reset event.
      setTimeout(function () { show(0, false); }, 0);
    });

    // Enter on an earlier pane advances only that pane. It must not try to
    // submit while required fields in later panes are still hidden.
    form.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.isComposing || i === panes.length - 1) return;
      if (!e.target.matches("input:not([type=button]):not([type=submit])")) return;
      e.preventDefault();
      if (validate(panes[i])) show(i + 1);
    });
    form.addEventListener("submit", function (e) {
      syncButtons();
      var invalidPane = panes.findIndex(function (pane) { return !isValid(pane); });
      if (i !== panes.length - 1 || invalidPane !== -1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (invalidPane !== -1) {
          show(invalidPane);
          validate(panes[invalidPane]);
        }
      }
    }, true);

    show(0, false);
  }

  function init() {
    var roots = document.querySelectorAll("[data-form-steps]");
    roots.forEach(initOne);
    Debug.log("FormSteps: init — forms:", roots.length);
  }

  return { init: init };
})();

// ============================================
// Videos — custom video components + viewport-gated playback
//   Wires the [data-play-pause] / [data-mute-unmute] buttons inside every
//   [data-video-wrapper], and viewport-manages ALL <video> tags on the page
//   (incl. Webflow background videos):
//   • the autoplay attribute now means "autoplay only while in view" — it's
//     taken over at init and replaced with a data-video-autoplay marker so
//     Swiper loop clones inherit the intent (clones copy attributes, not JS state)
//   • every video pauses off-viewport / hidden browser tab, resumes when back
//   • a visitor's manual pause wins — scrolling never restarts their video
//   • icons sync from real media events via .is-active, so the UI can't lie
//     (icon order in each button: [0] = play / volume-up, [1] = pause / mute)
//   • hidden .w-tab-pane videos need no wiring: IO sees them as off-viewport
//     and starts them the moment their tab activates
//   • respects prefers-reduced-motion (no autoplay; buttons still work)
// ============================================
const Videos = (() => {
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stateMap = new WeakMap();

  const getState = (v) => {
    let s = stateMap.get(v);
    if (!s) {
      s = { wantsPlay: false, inView: false };
      stateMap.set(v, s);
    }
    return s;
  };

  // ---- programmatic play/pause (flagged, so intent tracking can tell
  //      script actions apart from visitor actions) ----
  function scriptPlay(v) {
    if (!v.paused) return;
    v.__byScript = true;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        v.__byScript = false; // autoplay blocked → stays paused, UI stays truthful
        Debug.log("Videos: play() blocked by browser (policy / low power)");
      });
    }
  }

  function scriptPause(v) {
    if (v.paused) return;
    v.__byScript = true;
    v.pause();
  }

  // ---- icon + aria sync ----
  function setIcons(btn, secondActive) {
    if (!btn) return;
    const icons = btn.querySelectorAll(".video-control-icon");
    if (icons.length < 2) return;
    icons[0].classList.toggle("is-active", !secondActive);
    icons[1].classList.toggle("is-active", secondActive);
  }

  function syncUI(v) {
    const ui = v.__ui;
    if (!ui) return;
    const playing = !v.paused && !v.ended;
    setIcons(ui.playBtn, playing); // [1] = pause icon while playing
    setIcons(ui.muteBtn, v.muted); // [1] = mute icon while muted
    if (ui.playBtn) {
      ui.playBtn.setAttribute(
        "aria-label",
        playing ? "Pause video" : "Play video"
      );
      ui.playBtn.setAttribute("aria-pressed", String(playing));
    }
    if (ui.muteBtn) {
      ui.muteBtn.setAttribute(
        "aria-label",
        v.muted ? "Unmute video" : "Mute video"
      );
      ui.muteBtn.setAttribute("aria-pressed", String(v.muted));
    }
  }

  // ---- shared viewport observer ----
  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const v = entry.target;
              const s = getState(v);
              s.inView = entry.isIntersecting;
              if (!s.inView) scriptPause(v);
              else if (s.wantsPlay && !document.hidden) scriptPlay(v);
            });
          },
          { threshold: 0 }
        )
      : null;

  // ---- per-video management ----
  function manage(v) {
    if (v.__vManaged) return;
    v.__vManaged = true;

    const s = getState(v);

    // Take over autoplay: the attribute now means "play while in view".
    const wantsAuto =
      v.autoplay ||
      v.hasAttribute("autoplay") ||
      v.hasAttribute("data-video-autoplay");
    if (wantsAuto) {
      v.autoplay = false;
      v.removeAttribute("autoplay");
      v.setAttribute("data-video-autoplay", ""); // inert marker, survives cloning
    }
    s.wantsPlay = wantsAuto && !reduceMotion;

    // Intent + UI driven by real media events (any source: buttons, OS, other scripts).
    v.addEventListener("play", () => {
      if (v.__byScript) v.__byScript = false;
      else s.wantsPlay = true; // visitor started it
      syncUI(v);
    });
    v.addEventListener("pause", () => {
      if (v.__byScript) v.__byScript = false;
      else if (!v.ended && !document.hidden) s.wantsPlay = false; // visitor paused it
      syncUI(v);
    });
    v.addEventListener("volumechange", () => syncUI(v));
    v.addEventListener("ended", () => syncUI(v));

    if (io) io.observe(v);
    else {
      s.inView = true; // no-IO fallback: treat as always visible
      if (s.wantsPlay) scriptPlay(v);
    }
  }

  // ---- controls per component instance ----
  function wireControls(wrapper) {
    if (wrapper.__vWired) return;
    wrapper.__vWired = true;

    const v =
      wrapper.querySelector("[data-video]") || wrapper.querySelector("video");
    if (!v) return;
    const playBtn = wrapper.querySelector("[data-play-pause]");
    const muteBtn = wrapper.querySelector("[data-mute-unmute]");
    v.__ui = { playBtn, muteBtn };

    if (playBtn) {
      playBtn.type = "button"; // never submit a wrapping form
      playBtn.addEventListener("click", () => {
        if (v.paused) {
          getState(v).wantsPlay = true;
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          v.pause(); // unflagged → recorded as the visitor's choice
        }
      });
    }
    if (muteBtn) {
      muteBtn.type = "button";
      muteBtn.addEventListener("click", () => {
        v.muted = !v.muted;
        if (!v.muted && v.volume === 0) v.volume = 1;
      });
    }
    syncUI(v);
  }

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("[data-video-wrapper]").forEach(wireControls);
    scope.querySelectorAll("video").forEach(manage);
    if (root instanceof Element) {
      if (root.matches("[data-video-wrapper]")) wireControls(root);
      if (root.matches("video")) manage(root);
    }
  }

  // Catch videos added after init (Swiper loop clones, CMS lightboxes, …).
  function watchDynamic() {
    if (!("MutationObserver" in window) || !document.body) return;
    new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (
            node.matches("video, [data-video-wrapper]") ||
            node.querySelector("video, [data-video-wrapper]")
          ) {
            scan(node);
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    scan(document);

    // Pause everything when the browser tab is hidden; resume eligible
    // videos (in view + meant to play) on return.
    document.addEventListener("visibilitychange", () => {
      document.querySelectorAll("video").forEach((v) => {
        const s = getState(v);
        if (document.hidden) scriptPause(v);
        else if (s.wantsPlay && s.inView) scriptPlay(v);
      });
    });

    watchDynamic();

    Debug.log(
      "Videos: init —",
      document.querySelectorAll("video").length,
      "video(s) |",
      document.querySelectorAll("[data-video-wrapper]").length,
      "wrapper(s) | io:",
      !!io,
      "| reduceMotion:",
      reduceMotion
    );
  }

  return { init };
})();

// ============================================
// SDMedia — accordion-driven media switcher
//   Webflow puts the open state on the .w-dropdown-toggle
//   (w--open class + aria-expanded), NOT on the .w-dropdown root —
//   so that's what we observe.
// ============================================
const SDMedia = (() => {
  function isOpen(acc) {
    const t = acc.querySelector(".w-dropdown-toggle");
    return !!(
      (t &&
        (t.classList.contains("w--open") ||
          t.getAttribute("aria-expanded") === "true")) ||
      acc.classList.contains("w--open")
    );
  }

  function wire(scope) {
    const accs = Array.from(scope.querySelectorAll(".acc.w-dropdown"));
    const panels = Array.from(scope.querySelectorAll("[data-sd-media]"));
    if (!accs.length || !panels.length) {
      Debug.log("SDMedia: scope missing accs or panels — skipped");
      return;
    }

    const panelFor = (acc, i) => {
      const want = acc.getAttribute("data-sd-target");
      if (want)
        return (
          panels.find((p) => p.getAttribute("data-sd-media") === want) || null
        );
      return panels[i] || null;
    };

    const activate = (panel) => {
      if (!panel || panel.classList.contains("is-active")) return;
      panels.forEach((p) => p.classList.toggle("is-active", p === panel));
      Debug.log(
        "SDMedia: show",
        panel.getAttribute("data-sd-media") || "(panel)"
      );
    };

    accs.forEach((acc, i) => {
      const toggle = acc.querySelector(".w-dropdown-toggle") || acc;
      let was = isOpen(acc);
      const check = () => {
        const is = isOpen(acc);
        if (is && !was) activate(panelFor(acc, i));
        was = is;
      };
      new MutationObserver(check).observe(toggle, {
        attributes: true,
        attributeFilter: ["class", "aria-expanded"],
      });
      toggle.addEventListener("click", () => setTimeout(check, 60)); // fallback
    });

    const openIdx = Math.max(0, accs.findIndex(isOpen));
    activate(panelFor(accs[openIdx], openIdx) || panels[0]);
  }

  function init() {
    const scopes = document.querySelectorAll("[data-sd-scope]");
    if (!scopes.length) {
      Debug.log("SDMedia: no [data-sd-scope] — skipped");
      return;
    }
    scopes.forEach(wire);
    Debug.log("SDMedia: init —", scopes.length, "scope(s)");
  }

  return { init };
})();

/* ============================================================
   TestimonialVideos — click-to-play CMS video cards  (v3)
   ------------------------------------------------------------
   Attribute-based. Add these custom attributes in the Designer
   (value can stay empty):
     data-vt-card   → on the card wrapper (.vt-card)
     data-vt-video  → on the <video> in the embed (already there)
     data-vt-play   → on the play button (.vt-play)
     data-vt-thumb  → on the thumbnail image (optional; .vt-thumb
                      class works as fallback for the poster grab)
   Minimal state CSS is injected so the thumbnail/button hide on
   play — see INJECTED STYLES below; delete that block if you'd
   rather own those rules in Webflow / your CSS file.

   Behavior:
   • Thumbnail shows initially; <video> has no src (data-src only)
     → nothing downloads until first click.
   • Click card/button → loads + plays. Click again → pause.
   • Out of viewport while started → pause immediately, reset to
     thumbnail after RESET_AFTER ms (back to 0:00). Coming back
     within the window keeps the paused frame.
   • Starting one card soft-resets any other started card.
   • 'ended' resets right away.

   JS toggles on .vt-card:
     .is-started → thumbnail hidden
     .is-playing → play button hidden
   ============================================================ */
var TestimonialVideos = (function () {
  var RESET_AFTER = 4000; // ms out of view (or superseded) before reset to thumbnail
  var items = [];
  var io = null;

  /* ---- INJECTED STYLES (state rules only — layout stays in Webflow) ---- */
  var CSS =
    "[data-vt-card]{cursor:pointer}" +
    "[data-vt-card] .vt-thumb,[data-vt-card] [data-vt-thumb]{transition:opacity .4s ease}" +
    "[data-vt-card].is-started .vt-thumb,[data-vt-card].is-started [data-vt-thumb]{opacity:0;pointer-events:none}" +
    "[data-vt-card] [data-vt-play]{transition:opacity .3s ease}" +
    "[data-vt-card].is-playing [data-vt-play]{opacity:0;pointer-events:none}";

  function injectStyles() {
    if (document.getElementById("vt-state-styles")) return;
    var tag = document.createElement("style");
    tag.id = "vt-state-styles";
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }

  function setup(card) {
    if (card.__vt) return card.__vt;
    var video = card.querySelector("[data-vt-video]");
    if (!video) return null;
    var btn = card.querySelector("[data-vt-play]");
    var thumb =
      card.querySelector("[data-vt-thumb]") || card.querySelector(".vt-thumb");
    var st = { card: card, video: video, timer: null, active: false };

    function clearTimer() {
      if (st.timer) {
        clearTimeout(st.timer);
        st.timer = null;
      }
    }

    function reset() {
      clearTimer();
      st.active = false;
      video.pause();
      try {
        video.currentTime = 0;
      } catch (e) {}
      card.classList.remove("is-started", "is-playing");
    }

    function scheduleReset() {
      clearTimer();
      st.timer = setTimeout(reset, RESET_AFTER);
    }

    function play() {
      clearTimer();
      if (!video.getAttribute("src")) {
        var src = video.getAttribute("data-src");
        if (!src) return; // no video on this CMS item
        // use the thumbnail as poster so there's no black flash while buffering
        if (!video.poster && thumb) {
          var pSrc = thumb.currentSrc || thumb.src;
          if (pSrc) video.poster = pSrc;
        }
        video.setAttribute("src", src);
      }
      st.active = true;
      card.classList.add("is-started");
      // one card at a time — soft-reset any other started card
      for (var i = 0; i < items.length; i++) {
        var o = items[i];
        if (o !== st && o.active) {
          o.video.pause();
          o.scheduleReset();
        }
      }
      var p = video.play();
      if (p && p.catch) {
        p.catch(function (err) {
          if (err && err.name === "NotAllowedError") reset();
        });
      }
    }

    function toggle() {
      if (video.paused) play();
      else video.pause(); // manual pause: keep the frame, no auto-reset while in view
    }

    video.addEventListener("play", function () {
      card.classList.add("is-playing", "is-started");
    });
    video.addEventListener("pause", function () {
      card.classList.remove("is-playing");
    });
    video.addEventListener("ended", reset);

    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });
    }
    card.addEventListener("click", function (e) {
      if (btn && (e.target === btn || btn.contains(e.target))) return;
      toggle();
    });

    st.play = play;
    st.reset = reset;
    st.scheduleReset = scheduleReset;
    st.clearTimer = clearTimer;
    card.__vt = st;
    return st;
  }

  function onIntersect(entries) {
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var st = entry.target.__vt;
      if (!st) continue;
      if (entry.isIntersecting) {
        // back in view within the grace window → keep paused frame, user resumes
        st.clearTimer();
      } else if (st.active) {
        if (!st.video.paused) st.video.pause(); // auto-pause out of viewport
        st.scheduleReset(); // → thumbnail after RESET_AFTER
      }
    }
  }

  function init(opts) {
    if (opts && typeof opts.resetAfter === "number")
      RESET_AFTER = opts.resetAfter;
    var cards = document.querySelectorAll("[data-vt-card]");
    if (!cards.length) return;
    injectStyles();
    io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(onIntersect, { threshold: 0 })
        : null;
    for (var i = 0; i < cards.length; i++) {
      var st = setup(cards[i]);
      if (st) {
        items.push(st);
        if (io) io.observe(cards[i]);
      }
    }
  }

  return { init: init };
})();

/* In your onReady block, alongside the other modules:
       TestimonialVideos.init();
  */

/* ============================================================
   NavOverlay — page scrim tied to the nav dropdowns
   ------------------------------------------------------------
   • Any .g-nav-drop open  → .g-nav-overlay gets display:block,
     then opacity:1 on the next frame so the CSS transition runs.
   • All dropdowns closed  → opacity:0 first, display:none only
     after the fade finishes (transitionend, with a timer as a
     fallback so it can never get stuck visible).
   • Switching A → B keeps the overlay up: a short grace window
     ignores the instant where Webflow has closed A but not yet
     opened B, and a re-open mid-fade cancels the pending hide.

   Also replaces the jQuery .js-close-dropdown snippet:
     - .js-close-dropdown inside a .w-dropdown closes that one
     - .js-close-dropdown outside one (e.g. put the class on
       .g-nav-overlay itself) closes every open dropdown
     - Escape closes everything

   NOTE: the open state lives on .w-dropdown-toggle (w--open),
   not on the .w-dropdown root — that's what we observe.

   Required CSS on .g-nav-overlay (set it in Webflow):
     opacity: 0;  display: none;
     transition: opacity 300ms ease;      ← any duration you like
   The fade length is read from that computed transition, so the
   display:none always lands exactly when the fade ends.
   ============================================================ */
var NavOverlay = (function () {
  var SWITCH_GRACE = 80; // ms to wait before hiding, in case another drop is opening

  var overlay = null;
  var toggles = [];
  var hideTimer = null;
  var graceTimer = null;
  var visible = false;

  function fadeMs() {
    var cs = window.getComputedStyle(overlay);
    function ms(v) {
      v = (v || "0s").split(",")[0].trim();
      var n = parseFloat(v);
      if (isNaN(n)) return 0;
      return v.indexOf("ms") > -1 ? n : n * 1000;
    }
    return ms(cs.transitionDuration) + ms(cs.transitionDelay);
  }

  function anyOpen() {
    for (var i = 0; i < toggles.length; i++) {
      if (toggles[i].classList.contains("w--open")) return true;
    }
    return false;
  }

  function onFadeEnd(e) {
    if (e.propertyName !== "opacity") return;
    finishHide();
  }

  function finishHide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    overlay.removeEventListener("transitionend", onFadeEnd);
    if (!visible) overlay.style.display = "none";
  }

  function show() {
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    overlay.removeEventListener("transitionend", onFadeEnd);
    if (visible) return;
    visible = true;
    overlay.style.display = "block";
    void overlay.offsetHeight; // reflow so opacity animates from 0
    overlay.style.opacity = "1";
    overlay.classList.add("is-active");
  }

  function hide() {
    if (!visible) return;
    visible = false;
    overlay.style.opacity = "0";
    overlay.classList.remove("is-active");
    var wait = fadeMs();
    if (wait <= 0) {
      finishHide();
      return;
    }
    overlay.addEventListener("transitionend", onFadeEnd);
    hideTimer = setTimeout(finishHide, wait + 60); // fallback if transitionend is missed
  }

  function sync() {
    if (anyOpen()) {
      show();
      return;
    }
    if (graceTimer) clearTimeout(graceTimer);
    graceTimer = setTimeout(function () {
      graceTimer = null;
      if (!anyOpen()) hide();
    }, SWITCH_GRACE);
  }

  function closeDropdown(dd) {
    if (!dd) return;
    if (window.jQuery) window.jQuery(dd).trigger("w-close");
    else dd.dispatchEvent(new CustomEvent("w-close", { bubbles: true }));
    var t = dd.querySelector(".w-dropdown-toggle");
    if (t) t.blur();
  }

  function closeAll() {
    for (var i = 0; i < toggles.length; i++) {
      if (toggles[i].classList.contains("w--open")) {
        closeDropdown(toggles[i].closest(".w-dropdown"));
      }
    }
  }

  function init(opts) {
    if (opts && typeof opts.switchGrace === "number")
      SWITCH_GRACE = opts.switchGrace;

    overlay = document.querySelector(".g-nav-overlay");
    var drops = document.querySelectorAll(".g-nav-drop.w-dropdown");
    if (!overlay || !drops.length) return;

    overlay.style.display = "none";
    overlay.style.opacity = "0";

    var mo = new MutationObserver(sync);
    for (var i = 0; i < drops.length; i++) {
      var t = drops[i].querySelector(".w-dropdown-toggle");
      if (!t) continue;
      toggles.push(t);
      mo.observe(t, {
        attributes: true,
        attributeFilter: ["class", "aria-expanded"],
      });
    }

    // close handlers (replaces the jQuery .js-close-dropdown snippet)
    document.addEventListener("click", function (e) {
      var closer = e.target.closest && e.target.closest(".js-close-dropdown");
      if (!closer) return;
      var dd = closer.closest(".w-dropdown");
      if (dd) closeDropdown(dd);
      else closeAll();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && anyOpen()) closeAll();
    });

    // Webflow flips w--open after its own click handler runs
    document.addEventListener(
      "click",
      function () {
        setTimeout(sync, 60);
      },
      true
    );

    sync();
  }

  return { init: init, closeAll: closeAll };
})();

/* In your onReady block, alongside the other modules:
     NavOverlay.init();
*/

// ============================================
// DOM Ready → init modules
// ============================================
export function initMain() {
  function run(name, init) {
    try { init(); } catch (error) {
      console.error(`[RegenX] ${name} failed`, error);
    }
  }
  Debug.log("onReady -> init modules");
  run("Favicon", () => Favicon.init());
  run("NavShrink", () => NavShrink.init());
  run("StickyCenter", () => StickyCenter.init());
  run("Ampersand", () => Ampersand.init());
  run("Reveals", () => Reveals.init());
  // TabDeepLink.init();
  // Anchors.init();
  run("FooterNav", () => FooterNav.init());
  run("CompareTable", () => CompareTable.init());
  run("TabGraphics", () => TabGraphics.init());
  run("SmartSwiper", () => SmartSwiper.init());
  run("FormSteps", () => FormSteps.init());
  run("Videos", () => Videos.init());
  run("SDMedia", () => SDMedia.init());
  run("TestimonialVideos", () => TestimonialVideos.init());
  run("NavOverlay", () => NavOverlay.init());

  if (Debug.ON) {
    window.__RGX = {
      lenis: () => window.lenis || null,
      hash: () => location.hash,
      scrollY: () => window.scrollY,
      landing: () => Anchors.landing(),
      openTab: () => TabDeepLink.open(),
    };
    Debug.log("window.__RGX helpers ready");
  }
  PageReady.signal();
}
