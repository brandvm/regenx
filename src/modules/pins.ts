// Text pins on photos (Figma "pins": a glass dot with a label, a stat with an
// arrow, a glass badge, a note with a leader line). The text is real DOM text
// over a clean photo instead of being baked into the image, so it stays sharp
// and readable.
//
//   [data-pin-media]   the box that holds the photo (an existing wrapper;
//                      made position: relative if it is static)
//     data-pin-w       the Figma width of the photo, in px (sets the scale)
//     data-pin-fs      the Figma label size, in px (default 14)
//     data-pin-dot     the Figma dot size, in px (default 27.6)
//   img                the photo: [data-pin-img] if marked, else the first img
//   [data-x][data-y]   an item's anchor in % of the photo (dot centre for pins
//                      and stats, top-left for badges, tags, notes and lines)
//     data-side        pins: which side the label sits on (left | right)
//     data-w           lines: length in Figma px
//
// Photos are often cropped by object-fit: cover (or letterboxed by contain),
// so anchors are measured on the part of the photo that is drawn, not on the
// box. One Figma px is --pin-u; pins.css sizes everything from it, so a pin
// keeps its spot at every width. If a label would still run past the box
// (the minimum text size kicks in on small screens), it flips to the other
// side of its dot; a badge is pushed back inside; an item whose anchor is
// cropped away is hidden.

const MEDIA = '[data-pin-media]';
const ITEM = '[data-x][data-y]';

type Rect = { x: number; y: number; w: number; h: number };

// The drawn photo inside the media box, in px from the box's top-left.
function photoRect(media: HTMLElement, box: DOMRect): Rect {
  const img = media.querySelector<HTMLImageElement>('img[data-pin-img]') ?? media.querySelector('img');
  if (!img || !img.naturalWidth) return { x: 0, y: 0, w: box.width, h: box.height };
  const r = img.getBoundingClientRect();
  const cs = getComputedStyle(img);
  const ratio = img.naturalWidth / img.naturalHeight;
  let w = r.width;
  let h = r.height;
  if (cs.objectFit === 'cover' || cs.objectFit === 'contain') {
    const wider = ratio > r.width / r.height;
    if ((cs.objectFit === 'cover') === wider) w = h * ratio;
    else h = w / ratio;
  }
  const [px = 50, py = 50] = cs.objectPosition.split(' ').map((v) => parseFloat(v));
  return {
    x: r.left - box.left + ((r.width - w) * px) / 100,
    y: r.top - box.top + ((r.height - h) * py) / 100,
    w,
    h,
  };
}

function fit(media: HTMLElement) {
  const box = media.getBoundingClientRect();
  if (!box.width) return;
  const photo = photoRect(media, box);
  media.style.setProperty('--pin-u', `${photo.w / Number(media.dataset.pinW || 400)}px`);
  media.querySelectorAll<HTMLElement>(ITEM).forEach((item) => {
    const x = photo.x + (photo.w * parseFloat(item.dataset.x!)) / 100;
    const y = photo.y + (photo.h * parseFloat(item.dataset.y!)) / 100;
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    if (item.dataset.w) item.style.width = `calc(var(--pin-u) * ${parseFloat(item.dataset.w)})`;
    item.toggleAttribute('data-pin-out', x < 0 || y < 0 || x > box.width || y > box.height);

    const side = item.dataset.side;
    if (side === 'left' || side === 'right') {
      item.dataset.sideNow = side;
      const label = item.querySelector<HTMLElement>('.rx-pin-label');
      if (label) {
        const l = label.getBoundingClientRect();
        if (side === 'right' && l.right > box.right) item.dataset.sideNow = 'left';
        if (side === 'left' && l.left < box.left) item.dataset.sideNow = 'right';
      }
    }
    if (item.classList.contains('rx-badge')) {
      item.style.removeProperty('translate');
      const r = item.getBoundingClientRect();
      const dx = Math.min(0, box.right - r.right) || Math.max(0, box.left - r.left);
      const dy = Math.min(0, box.bottom - r.bottom) || Math.max(0, box.top - r.top);
      if (dx || dy) item.style.translate = `${dx}px ${dy}px`;
    }
  });
}

export function initPins() {
  const medias = [...document.querySelectorAll<HTMLElement>(MEDIA)];
  if (!medias.length) return;
  medias.forEach((media) => {
    const { pinFs, pinDot } = media.dataset;
    if (pinFs) media.style.setProperty('--pin-fs', pinFs);
    if (pinDot) media.style.setProperty('--pin-dot', pinDot);
    if (getComputedStyle(media).position === 'static') media.style.position = 'relative';
    fit(media);
    media.classList.add('is-pins-ready');
    new ResizeObserver(() => fit(media)).observe(media);
    media.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', () => fit(media), { once: true });
    });
  });
  document.fonts?.ready.then(() => medias.forEach(fit));
}
