import type { gsap } from 'gsap';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SplitText } from 'gsap/SplitText';

declare global {
  // package.json's version (0.0.0 while it has none), replaced at build
  // time by build.mjs. dist/version.json carries it when package.json has one.
  const __WFC_VERSION__: string;

  interface Window {
    __RGX_BOOTED?: boolean;
    gsap?: typeof gsap;
    ScrollTrigger?: typeof ScrollTrigger;
    SplitText?: typeof SplitText;
    Webflow?: { env?: (mode: string) => boolean; push?: (callback: () => void) => unknown };
    BV?: {
      site?: string;
      staging?: boolean;
      dev?: boolean;
      devBase?: string;
      stag?: string;
      // Base URL production loads from: the jsDelivr release tag, or null
      // before the first release.
      prod?: string | null;
      // The base URL the bundle actually loaded from, set by the footer
      // loader before the script runs (including after a fallback).
      source?: string;
      stamp?: number;
      loading?: boolean;
      release?: (failed?: boolean) => void;
    };
  }
}
