// Dots for the mobile card rows (Why Men Choose, Diagnosis, Clinical Cases).
// Webflow turns these rows into CSS scroll-snap carousels at ≤478px; this adds
// one dot per card while a row actually scrolls sideways. On tablet and
// desktop, or before the Webflow styles exist, the rows don't overflow and
// nothing is added. Rows whose cards differ a lot in height (`autoHeight`)
// take the height of the card in view, so a short card has no empty space
// under it.

const ROWS = [
  { selector: '.why-main', autoHeight: false },
  { selector: '.diagnosis-main', autoHeight: true },
  { selector: '.clinical-case-main', autoHeight: true },
];

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// In on-screen order: Webflow can move a card with `order` (the Diagnosis lab
// panel is last on mobile).
function cards(row: HTMLElement): HTMLElement[] {
  return Array.from(row.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement && child.getClientRects().length > 0)
    .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
}

function startEdge(row: HTMLElement): number {
  const style = getComputedStyle(row);
  const padding = parseFloat(style.scrollPaddingLeft) || parseFloat(style.paddingLeft) || 0;
  return row.getBoundingClientRect().left + padding;
}

function bind(row: HTMLElement, autoHeight: boolean) {
  let dots: HTMLElement | null = null;
  let buttons: HTMLButtonElement[] = [];
  let frame = 0;

  const activeIndex = (items: HTMLElement[]) => {
    if (row.scrollLeft >= row.scrollWidth - row.clientWidth - 1) return items.length - 1;
    const edge = startEdge(row);
    let best = 0;
    items.forEach((item, index) => {
      const distance = Math.abs(item.getBoundingClientRect().left - edge);
      if (distance < Math.abs(items[best].getBoundingClientRect().left - edge)) best = index;
    });
    return best;
  };

  const update = () => {
    frame = 0;
    if (!dots) return;
    const items = cards(row);
    const active = activeIndex(items);
    if (autoHeight && items[active]) row.style.height = `${items[active].offsetHeight}px`;
    buttons.forEach((button, index) => {
      if (index === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  };

  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  const goTo = (index: number) => {
    const item = cards(row)[index];
    if (!item) return;
    const left = row.scrollLeft + item.getBoundingClientRect().left - startEdge(row);
    row.scrollTo({ left, behavior: reduceMotion() ? 'auto' : 'smooth' });
  };

  const build = () => {
    const items = cards(row);
    dots = document.createElement('div');
    dots.className = 'snap-dots';
    // The dots sit under the row, whatever gap the row's parent uses.
    const parentGap = parseFloat(getComputedStyle(row.parentElement || row).rowGap) || 0;
    dots.style.marginTop = `calc(1.5rem - ${parentGap}px)`;
    buttons = items.map((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'snap-dot';
      button.setAttribute('aria-label', `Go to card ${index + 1} of ${items.length}`);
      button.addEventListener('click', () => goTo(index));
      dots!.appendChild(button);
      return button;
    });
    row.after(dots);
    if (autoHeight) row.classList.add('is-snap-auto-height');
    row.addEventListener('scroll', onScroll, { passive: true });
    update();
  };

  const teardown = () => {
    row.removeEventListener('scroll', onScroll);
    row.classList.remove('is-snap-auto-height');
    row.style.height = '';
    dots?.remove();
    dots = null;
    buttons = [];
  };

  const sync = () => {
    const scrolls = row.scrollWidth > row.clientWidth + 1 && cards(row).length > 1;
    if (scrolls && !dots) build();
    else if (!scrolls && dots) teardown();
    else if (dots) update();
  };

  sync();
  new ResizeObserver(sync).observe(row);
}

export const SnapDots = {
  init() {
    ROWS.forEach(({ selector, autoHeight }) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((row) => {
        if (row.dataset.snapDots) return;
        row.dataset.snapDots = '1';
        bind(row, autoHeight);
      });
    });
  },
};
