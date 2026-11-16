// Peptide Therapy disclaimer (Figma: "Disclaimer popup only for Peptide
// Therapy Clinic"). The dialog is built in Webflow as
// [data-modal="peptide-disclaimer"]; modal.ts makes it a real dialog.
//
//   [data-disclaimer-agree]     the "I understand…" checkbox
//   [data-disclaimer-continue]  enabled only once it is ticked; remembers the
//                               answer in this browser and closes
//   [data-disclaimer-cancel]    leaves the page (back, or home)
//
// It opens on load until accepted, and it is a gate (client, 2026-11-16): the
// dialog is locked (data-modal-locked: Escape and the backdrop do nothing) and
// any × button is hidden, so the only ways out are Continue (after ticking
// the box) and Cancel (leaves the page).
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

  root.setAttribute('data-modal-locked', '');
  // Inline: the × class sets display flex, which beats the hidden attribute.
  root.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((el) => { el.style.display = 'none'; });

  const sync = () => { if (cont) cont.disabled = !agree?.checked; };
  agree?.addEventListener('change', sync);
  sync();

  cont?.addEventListener('click', () => {
    if (!agree?.checked) return;
    try { localStorage.setItem(KEY, 'accepted'); } catch { /* Still closes for this visit. */ }
    root.dispatchEvent(new Event('modal:close'));
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
