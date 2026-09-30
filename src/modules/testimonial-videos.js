export const TestimonialVideos = (function () {
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
