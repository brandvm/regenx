import Swiper from "swiper";
import {
  Navigation, Pagination, A11y, Autoplay, Thumbs, EffectFade, EffectCoverflow,
} from "swiper/modules";
import { createTherapyTimeline, THERAPY_TIMELINE_SPEED } from "./therapy-timeline";
import { createBenefitSlider } from "./benefit-slider";
import { Debug } from "./debug";

// Keep the modules used by CONFIGS, its data-attribute overrides, and the
// pagination/thumbs helpers. Preserve the bundle's module registration order.
Swiper.use([Navigation, Pagination, A11y, Autoplay, Thumbs, EffectFade, EffectCoverflow]);

// ============================================
// SmartSwiper — config-driven Swiper manager (Webflow-tab aware)
//   One entry per slider in CONFIGS. Lazy-inits when visible (a slider built
//   inside a hidden .w-tab-pane measures 0 width), rebuilds on tab activation
//   via observePaneFor, and supports synced sliders (image ⇄ info) + thumbs.
//   Uses the bundled Swiper dependency and stylesheet.
// ============================================
export const SmartSwiper = (function () {
  var hasIO = "IntersectionObserver" in window;
  var reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------------------
  // CONFIGS
  // ---------------------------------------------------------------------------
  var CONFIGS = [
    {
      selector: "[data-therapy-timeline] .swiper.therapy-timeline-slider",
      wrapper: "[data-therapy-timeline]",
      navPrev: "[data-timeline-prev]",
      navNext: "[data-timeline-next]",
      navAll: true,
      timeline: true,
      opts: {
        slidesPerView: "auto",
        spaceBetween: 0,
        grabCursor: true,
        speed: THERAPY_TIMELINE_SPEED,
        loop: false,
        autoplay: false,
        watchOverflow: true,
        watchSlidesProgress: true,
        // The timeline observes only editable week ranges and slide content.
        observer: false,
        observeParents: false,
        observeSlideChildren: false,
        a11y: {
          containerRole: "region",
          containerMessage: "Peptide therapy results timeline",
          containerRoleDescriptionMessage: "carousel",
          itemRoleDescriptionMessage: "timeline phase",
          slideLabelMessage: null,
          prevSlideMessage: "Previous timeline phase",
          nextSlideMessage: "Next timeline phase",
        },
      },
    },
    // ---- Enclomiphene benefits: centred card slider, one per tab pane ----
    {
      selector: "[data-benefit-slider] .swiper.sb-benefit-slider",
      wrapper: "[data-benefit-slider]",
      // Slide widths come from Webflow; benefit-slider.js adds loop copies
      // and one pagination bullet per authored card.
      benefit: true,
      opts: {
        slidesPerView: "auto",
        centeredSlides: true,
        spaceBetween: 16,
        loop: true,
        slideToClickedSlide: true,
        grabCursor: true,
        speed: 735,
        breakpoints: {
          768: { spaceBetween: 24 },
        },
        a11y: {
          containerMessage: "Enclomiphene benefits",
          itemRoleDescriptionMessage: "benefit",
          slideLabelMessage: null,
        },
      },
    },
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
    if (cfg.navAll) {
      return {
        scope: scope,
        prev: Array.from(scope.querySelectorAll(cfg.navPrev)),
        next: Array.from(scope.querySelectorAll(cfg.navNext)),
      };
    }
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
      if (Array.isArray(btn)) {
        btn.forEach(function (item) { setHidden(item, hidden); });
        return;
      }
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
        if (el._therapyTimeline) el._therapyTimeline.refresh();
        else inst.update();
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
    // A chronological rail never loops or autoplays, even if a copied Webflow
    // element carries generic carousel data attributes.
    if (cfg.timeline) {
      opts.loop = false;
      opts.autoplay = false;
      opts.speed = reduceMotion ? 0 : THERAPY_TIMELINE_SPEED;
    }

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

    var timeline = cfg.timeline ? createTherapyTimeline(el) : null;
    // Loop copies must exist before Swiper counts the slides.
    var benefit = cfg.benefit ? createBenefitSlider(el) : null;
    try {
      var swiper = new Swiper(el, opts);
      el._smartSwiperInstance = swiper;
      if (timeline) {
        el._therapyTimeline = timeline;
        timeline.attach(swiper);
        swiper.on("destroy", function () { delete el.dataset.edgeNavBound; });
      }
      if (benefit) {
        el._benefitSlider = benefit;
        benefit.attach(swiper);
      }

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
      if (timeline) timeline.destroy();
      if (benefit) benefit.destroy();
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
