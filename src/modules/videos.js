import { Debug } from "./debug";

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
export const Videos = (() => {
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
