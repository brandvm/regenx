// Peptide Therapy disclaimer (Figma: "Disclaimer popup only for Peptide
// Therapy Clinic"). The dialog is built in Webflow as
// [data-modal="peptide-disclaimer"]; modal.ts makes it a real dialog.
//
//   [data-disclaimer-agree]     the "I understand…" checkbox
//   [data-disclaimer-continue]  enabled only once it is ticked; remembers the
//                               answer in this browser and closes
//   [data-disclaimer-cancel]    leaves the page (back, or home)
//
// It opens on load until accepted. Closing it another way (×, Escape, the
// backdrop) dismisses it for this visit only.
const NAME = 'peptide-disclaimer';
const KEY = 'rgx-peptide-disclaimer';

const accepted = () => {
  try { return localStorage.getItem(KEY) === 'accepted'; } catch { return false; }
};

export function initPeptideDisclaimer() {
  const root = document.querySelector<HTMLElement>(`[data-modal="${NAME}"]`);
  if (!root) return;
  const agree = root.querySelector<HTMLInputElement>('[data-disclaimer-agree]');
  const cont = root.querySelector<HTMLButtonElement>('[data-disclaimer-continue]');
  const cancel = root.querySelector<HTMLElement>('[data-disclaimer-cancel]');

  const sync = () => { if (cont) cont.disabled = !agree?.checked; };
  agree?.addEventListener('change', sync);
  sync();

  cont?.addEventListener('click', () => {
    if (!agree?.checked) return;
    try { localStorage.setItem(KEY, 'accepted'); } catch { /* Still closes for this visit. */ }
    root.querySelector<HTMLElement>('[data-modal-close]')?.click();
  });
  cancel?.addEventListener('click', (e) => {
    e.preventDefault();
    const fromSite = document.referrer && new URL(document.referrer).origin === location.origin;
    if (fromSite && history.length > 1) history.back();
    else location.assign('/');
  });

  if (accepted() || location.hash) return;
  // modal.ts opens a dialog from the URL hash; closing removes the hash.
  history.replaceState(history.state, '', `${location.pathname}${location.search}#${NAME}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
