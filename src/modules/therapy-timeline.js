// The timeline uses one physical week scale for slides and the decorative ruler.
// Webflow owns the content; data-week-start/end define each editable phase.
export const THERAPY_TIMELINE_SPEED = 1000;

export function createTherapyTimeline(el) {
  const root = el.closest("[data-therapy-timeline]");
  const wrapper = el.querySelector(".swiper-wrapper");
  const ruler = root && root.querySelector("[data-timeline-ruler]");
  const track = ruler && ruler.querySelector("[data-timeline-ruler-track]");
  if (!root || !wrapper || !track) return null;

  let swiper = null;
  let destroyed = false;
  let frame = 0;
  let tickSignature = "";
  let slides = [];
  const savedWidths = new Map();
  const savedLabels = new Map();
  const originalTabindex = el.getAttribute("tabindex");
  const originalRulerHidden = ruler.getAttribute("aria-hidden");
  const originalWeekWidth = root.style.getPropertyValue("--timeline-week-width");
  const originalTrackStyle = track.getAttribute("style");
  const originalTrackChildren = Array.from(track.childNodes);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function number(value, fallback) {
    return value !== null && value !== "" && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
  }

  function restoreAttribute(node, name, value) {
    if (value === null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  }

  function buildTicks(origin, end) {
    const signature = `${origin}:${end}`;
    if (tickSignature === signature) return;
    tickSignature = signature;
    const fragment = document.createDocumentFragment();
    // Keep unexpectedly large editor-entered ranges from creating huge DOMs.
    const step = end - origin <= 250 ? 0.25 : Math.ceil((end - origin) / 1000);
    for (let week = origin; week <= end; week += step) {
      const tick = document.createElement("span");
      const major = Number.isInteger(week);
      tick.className = `therapy-timeline-tick${major ? " is-major" : ""}`;
      tick.dataset.timelineWeek = String(week);
      tick.style.left = `${((week - origin) / (end - origin)) * 100}%`;
      if (major) {
        const label = document.createElement("span");
        label.className = "therapy-timeline-tick-label";
        label.textContent = String(week);
        tick.appendChild(label);
      }
      fragment.appendChild(tick);
    }
    track.replaceChildren(fragment);
  }

  function prepare() {
    if (destroyed) return;
    slides = Array.from(wrapper.children).filter((node) =>
      node.matches(".swiper-slide")
    );
    if (!slides.length) return;
    const origin = number(root.getAttribute("data-timeline-origin"), 0);
    const desktopWeeks = Math.max(1, number(root.getAttribute("data-timeline-weeks"), 12));
    const visibleWeeks = window.innerWidth <= 767
      ? Math.max(1, number(root.getAttribute("data-timeline-mobile-weeks"), 6))
      : desktopWeeks;
    const boundaries = [origin];
    slides.slice(1).forEach((slide, index) => {
      boundaries.push(Math.max(
        boundaries[index] + 1,
        number(slide.getAttribute("data-week-start"), boundaries[index] + visibleWeeks)
      ));
    });
    const end = Math.max(
      boundaries[boundaries.length - 1] + 1,
      ...slides.map((slide) => number(slide.getAttribute("data-week-end"), origin + visibleWeeks))
    );
    const computed = getComputedStyle(el);
    // Match Swiper's integer padding subtraction so fractional em-based fade
    // gutters cannot create a tiny extra snap or shift the final endpoint.
    const width = el.clientWidth - (parseInt(computed.paddingLeft, 10) || 0) -
      (parseInt(computed.paddingRight, 10) || 0);
    if (width <= 0) return;
    const unit = width / visibleWeeks;
    root.style.setProperty("--timeline-week-width", `${unit}px`);
    slides.forEach((slide, index) => {
      if (!savedWidths.has(slide)) {
        savedWidths.set(slide, slide.style.width);
        savedLabels.set(slide, slide.getAttribute("aria-label"));
      }
      slide.style.width = `${((boundaries[index + 1] ?? end) - boundaries[index]) * unit}px`;
      const start = number(slide.getAttribute("data-week-start"), boundaries[index]);
      const finish = number(slide.getAttribute("data-week-end"), boundaries[index + 1] ?? end);
      slide.setAttribute("aria-label", `Weeks ${start}–${finish}`);
    });
    buildTicks(origin, end);
    track.style.width = `${(end - origin) * unit}px`;
    track.style.transitionTimingFunction = getComputedStyle(wrapper).transitionTimingFunction;
  }

  function syncTranslate() {
    if (!swiper || swiper.destroyed) return;
    track.style.transform = `translate3d(${swiper.translate}px, 0, 0)`;
  }

  function syncTransition(_swiper, duration) {
    track.style.transitionDuration = `${duration}ms`;
  }

  function refresh() {
    if (!swiper || swiper.destroyed || destroyed) return;
    // Preserve the current phase when a breakpoint changes the week scale.
    const active = swiper.activeIndex;
    prepare();
    swiper.setTransition(0);
    swiper.update();
    swiper.slideTo(Math.min(active, slides.length - 1), 0);
    syncTranslate();
  }

  function scheduleRefresh() {
    if (frame || destroyed) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      refresh();
    });
  }

  function onKeydown(event) {
    if (!swiper || swiper.destroyed || event.target !== el || event.altKey ||
        event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") swiper.slideTo(0);
    else if (event.key === "End") swiper.slideTo(swiper.snapGrid.length - 1);
    else if ((event.key === "ArrowRight") !== !!swiper.rtlTranslate) swiper.slideNext();
    else swiper.slidePrev();
  }

  function onMotionChange() {
    if (!swiper || swiper.destroyed) return;
    swiper.params.speed = motion.matches ? 0 : THERAPY_TIMELINE_SPEED;
    if (motion.matches) {
      swiper.setTransition(0);
      syncTranslate();
    }
  }

  const observer = new MutationObserver(scheduleRefresh);

  function attach(instance) {
    swiper = instance;
    el.setAttribute("tabindex", "0");
    ruler.setAttribute("aria-hidden", "true");
    root.setAttribute("data-timeline-ready", "true");
    el.addEventListener("keydown", onKeydown);
    swiper.on("beforeResize", prepare);
    swiper.on("resize", syncTranslate);
    swiper.on("setTranslate", syncTranslate);
    swiper.on("setTransition", syncTransition);
    swiper.on("destroy", destroy);
    observer.observe(wrapper, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-week-start", "data-week-end"],
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-timeline-origin", "data-timeline-weeks", "data-timeline-mobile-weeks"],
    });
    if (motion.addEventListener) motion.addEventListener("change", onMotionChange);
    else motion.addListener(onMotionChange);
    // A11y initializes with Swiper, so restore the more useful week labels last.
    prepare();
    onMotionChange();
    syncTransition(swiper, 0);
    syncTranslate();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    el.removeEventListener("keydown", onKeydown);
    if (motion.removeEventListener) motion.removeEventListener("change", onMotionChange);
    else motion.removeListener(onMotionChange);
    if (swiper) {
      swiper.off("beforeResize", prepare);
      swiper.off("resize", syncTranslate);
      swiper.off("setTranslate", syncTranslate);
      swiper.off("setTransition", syncTransition);
      swiper.off("destroy", destroy);
    }
    savedWidths.forEach((width, slide) => {
      slide.style.width = width;
      restoreAttribute(slide, "aria-label", savedLabels.get(slide));
    });
    restoreAttribute(el, "tabindex", originalTabindex);
    restoreAttribute(ruler, "aria-hidden", originalRulerHidden);
    restoreAttribute(track, "style", originalTrackStyle);
    track.replaceChildren(...originalTrackChildren);
    if (originalWeekWidth) root.style.setProperty("--timeline-week-width", originalWeekWidth);
    else root.style.removeProperty("--timeline-week-width");
    root.removeAttribute("data-timeline-ready");
    delete el._therapyTimeline;
    delete el._smartSwiperInstance;
    delete el.dataset.swiperInited;
  }

  prepare();
  return { attach, refresh, destroy };
}
