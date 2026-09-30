export const NavOverlay = (function () {
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
