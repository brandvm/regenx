// Pause/play button for a looping video (WCAG 2.2.2). Recipe:
// webflow-build recipes/video.
//
// Markup: <button type="button" data-video-toggle> with a Phosphor icon
// inside (<i class="ph ph-pause" aria-hidden="true">), placed in the same
// section as the video. It controls the first <video> in its closest
// ancestor that has one; data-video-toggle="<selector>" names another.
//
// - The label says what a press will do ("Pause video" / "Play video", or
//   the button's data-label-pause / data-label-play); the icon swaps to
//   match. No aria-pressed: a changing label and a pressed state together
//   read as a contradiction.
// - State follows the video's own play/pause events, so it stays right when
//   autoplay-video.ts pauses an off-screen video or honours reduced motion.
// - A press-to-pause is a visitor pause: autoplay-video.ts never resumes it.

function findVideo(button: HTMLElement): HTMLVideoElement | null {
  const selector = button.dataset.videoToggle?.trim();
  if (selector) return document.querySelector<HTMLVideoElement>(selector);
  for (let el = button.parentElement; el; el = el.parentElement) {
    const video = el.querySelector('video');
    if (video) return video;
  }
  return null;
}

export function initVideoToggle() {
  document.querySelectorAll<HTMLButtonElement>('[data-video-toggle]').forEach((button) => {
    const video = findVideo(button);
    if (!video) return;
    const icon = button.querySelector('i');
    const labelPause = button.dataset.labelPause || 'Pause video';
    const labelPlay = button.dataset.labelPlay || 'Play video';

    // A press does what the label said, even if something else started the
    // video during this same click (autoplay-video.ts retries a refused
    // autoplay on the first click anywhere, this one included).
    let paused = video.paused;
    const render = () => {
      paused = video.paused;
      button.setAttribute('aria-label', paused ? labelPlay : labelPause);
      if (icon) {
        icon.classList.toggle('ph-pause', !paused);
        icon.classList.toggle('ph-play', paused);
      }
    };

    button.addEventListener('click', () => {
      if (!paused) {
        video.pause();
        return;
      }
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    });
    video.addEventListener('play', render);
    video.addEventListener('pause', render);
    render();
  });
}
