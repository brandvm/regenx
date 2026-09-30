// Site behaviours. Each feature lives in its own module; this file only
// imports them in their original order and initializes them in isolation.
import { Debug } from "./debug";
import { PageReady } from "./page-ready";
import { Favicon } from "./favicon";
import { NavShrink } from "./nav-shrink";
import { StickyCenter } from "./sticky-center";
import { Ampersand } from "./ampersand";
import { Reveals } from "./reveals";
import { TabDeepLink } from "./tab-deep-link";
import { Anchors } from "./anchors";
import { FooterNav } from "./footer-nav";
import { CompareTable } from "./compare-table";
import { TabGraphics } from "./tab-graphics";
import { SmartSwiper } from "./smart-swiper";
import { FormSteps } from "./form-steps";
import { Videos } from "./videos";
import { SDMedia } from "./sd-media";
import { TestimonialVideos } from "./testimonial-videos";
import { NavOverlay } from "./nav-overlay";
import { ShareLinks } from "./share-links";

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
  run("ShareLinks", () => ShareLinks.init());

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
