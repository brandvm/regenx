import type { gsap } from 'gsap';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SplitText } from 'gsap/SplitText';

declare global {
  interface Window {
    __RGX_BOOTED?: boolean;
    gsap?: typeof gsap;
    ScrollTrigger?: typeof ScrollTrigger;
    SplitText?: typeof SplitText;
    Webflow?: { env?: (mode: string) => boolean; push?: (callback: () => void) => unknown };
    BV?: {
      dev?: boolean;
      devBase?: string;
      source?: string;
      release?: (failed?: boolean) => void;
    };
  }
}
