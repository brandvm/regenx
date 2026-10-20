// Autoplay videos: load late, play only while on screen, respect reduced
// motion and the visitor's own pause. Recipe: webflow-build recipes/video.
//
// Applies to every muted `video[autoplay]` (the C | Video component, a
// Webflow Background Video) except those marked `data-video-ignore`
// (a lightbox or popup video that a module of its own plays).
//
// 1. Load late. A <source> (or <video>) whose address is in `data-src`
//    instead of `src` requests nothing until the video is about a screen
//    away. A plain `src` works too: a video that is not near the viewport at
//    boot has its sources detached (aborting the download; the poster
//    stays) and re-attached as it approaches.
// 2. Play only while on screen. Off-screen videos pause and resume when
//    they come back, and all of them pause while the tab is hidden. Nothing
//    changes for the visitor; it stops decoding video nobody sees.
// 3. prefers-reduced-motion: no autoplay. The poster or first frame stays
//    (WCAG 2.2.2); a [data-video-toggle] button can still play it.
// 4. A pause this module did not cause (a [data-video-toggle] press,
//    Webflow's Background Video button, native controls) is the visitor's
//    choice: the video is never resumed automatically after it.
// 5. Autoplay refused (iOS Low Power Mode, data saver): play() rejects with
//    NotAllowedError, the poster stays, and the video starts on the
//    visitor's first tap, click or key press. Safari paints its own play
//    glyph over a refused video; video.css hides it.
// 6. Optional failed state. `data-video-guard` on the video or a wrapper
//    (value: milliseconds, default 6000) marks that element
//    `data-video-state="failed"` when no frame has decoded that long after
//    the video was asked to play, and `"ok"` once one has. Purely additive
//    (it never hides a video that is merely slow): style a fallback ground
//    from it.

const NEAR = '100% 0px'; // start loading about one screen ahead
const GUARD_MS = 6000;
const GESTURES = ['touchend', 'click', 'keydown'];

type State = {
  wanted: boolean; // this module wants it playing (on screen, no reduced motion)
  pausing: boolean; // the next pause event is ours, not the visitor's
  userPaused: boolean;
  guard?: number;
};

const states = new WeakMap<HTMLVideoElement, State>();
const blocked = new Set<HTMLVideoElement>();

function state(video: HTMLVideoElement): State {
  let s = states.get(video);
  if (!s) states.set(video, (s = { wanted: false, pausing: false, userPaused: false }));
  return s;
}

// A gesture lifts the block: start every refused video still wanted.
function retryBlocked() {
  GESTURES.forEach((type) => document.removeEventListener(type, retryBlocked, true));
  const videos = Array.from(blocked);
  blocked.clear();
  videos.forEach((video) => {
    if (state(video).wanted && video.paused) play(video);
  });
}

function onBlocked(video: HTMLVideoElement) {
  if (!blocked.size) GESTURES.forEach((type) => document.addEventListener(type, retryBlocked, true));
  blocked.add(video);
}

function decoded(video: HTMLVideoElement) {
  return video.readyState >= 2 && video.videoWidth > 0;
}

function watch(video: HTMLVideoElement) {
  const host = video.closest<HTMLElement>('[data-video-guard]');
  const s = state(video);
  if (!host || s.guard !== undefined) return;
  const ms = parseInt(host.dataset.videoGuard || '', 10) || GUARD_MS;
  s.guard = window.setTimeout(() => {
    if (!decoded(video)) host.setAttribute('data-video-state', 'failed');
  }, ms);
  video.addEventListener('loadeddata', () => host.setAttribute('data-video-state', 'ok'));
  video.addEventListener('error', () => host.setAttribute('data-video-state', 'failed'));
}

function play(video: HTMLVideoElement) {
  const s = state(video);
  if (s.userPaused) return; // the visitor paused it: leave it paused
  s.wanted = true;
  watch(video);
  const p = video.play();
  if (p && typeof p.catch === 'function') {
    p.catch((error) => {
      if (error && error.name === 'NotAllowedError') onBlocked(video);
    });
  }
}

function pause(video: HTMLVideoElement) {
  const s = state(video);
  s.wanted = false;
  if (video.paused) return;
  s.pausing = true;
  video.pause();
}

function isNear(el: Element) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return r.bottom > -vh && r.top < vh * 2;
}

// Move each address from `data-src` to `src` and load.
function attachLazy(video: HTMLVideoElement) {
  const own = video.getAttribute('data-src');
  if (own) video.setAttribute('src', own);
  video.removeAttribute('data-src');
  video.querySelectorAll('source[data-src]').forEach((source) => {
    source.setAttribute('src', source.getAttribute('data-src') || '');
    source.removeAttribute('data-src');
  });
  video.load();
}

// Park the sources' addresses in data-src (aborting the request already in
// flight); attachLazy() puts them back when the video comes near.
function detach(video: HTMLVideoElement) {
  if (!video.paused) state(video).pausing = true; // load() below pauses it
  const sources = Array.from(video.querySelectorAll('source[src]'));
  sources.forEach((source) => {
    source.setAttribute('data-src', source.getAttribute('src') || '');
    source.removeAttribute('src');
  });
  video.load();
}

export function initAutoplayVideo() {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video[autoplay]')).filter(
    (video) => video.muted && !video.hasAttribute('data-video-ignore'),
  );
  if (!videos.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  videos.forEach((video) => {
    video.autoplay = false; // from here on, this module decides when it plays
    const s = state(video);
    video.addEventListener('pause', () => {
      if (s.pausing) s.pausing = false;
      else s.userPaused = true;
    });
    video.addEventListener('play', () => {
      s.userPaused = false;
    });
    // Visible videos keep playing untouched (no stutter); the observer
    // below pauses the ones that are off screen.
    if (reduced) pause(video);
  });

  if (!('IntersectionObserver' in window)) {
    videos.forEach((video) => {
      if (video.querySelector('source[data-src]') || video.hasAttribute('data-src')) attachLazy(video);
      if (!reduced) play(video);
    });
    return;
  }

  // 1. Detach the far ones, then attach every lazy one when it comes near.
  const loader = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loader.unobserve(entry.target);
        const video = entry.target as HTMLVideoElement;
        attachLazy(video);
        if (state(video).wanted) play(video);
      });
    },
    { rootMargin: NEAR },
  );
  videos.forEach((video) => {
    if (video.querySelector('source[src]') && !isNear(video)) detach(video);
    if (video.querySelector('source[data-src]') || video.hasAttribute('data-src')) loader.observe(video);
  });
  if (reduced) return; // poster or first frame only

  // 2. Play while on screen, pause when off it or while the tab is hidden.
  const onScreen = new Set<HTMLVideoElement>();
  const player = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target as HTMLVideoElement;
      if (entry.isIntersecting) onScreen.add(video);
      else onScreen.delete(video);
      if (entry.isIntersecting && !document.hidden) play(video);
      else pause(video);
    });
  });
  videos.forEach((video) => player.observe(video));
  document.addEventListener('visibilitychange', () => {
    onScreen.forEach((video) => (document.hidden ? pause(video) : play(video)));
  });
}
