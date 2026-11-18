// ============================================
// HubSpotForm — a Webflow form posts to HubSpot instead of Webflow
//   Webflow: add data-hubspot-form="<form GUID>" to the Form element
//   (optional data-hubspot-portal, default below). Without it the form
//   posts to Webflow as before: removing the attribute is the rollback.
//   The form keeps its Webflow markup, validation, steps and the Webflow
//   success / error panes; only the destination changes.
//
//   Field → HubSpot property: data-hs-name on the input wins; otherwise
//   FIELD_MAP by the Webflow field name. Checkboxes with the same property
//   are sent as one multiple-checkbox value ("A;B"), each option being the
//   checkbox's data-hs-value or its Webflow display name (data-name).
//   Inputs with data-hs-skip, or with neither, are not sent. A filled
//   [data-hs-honeypot] field drops the submission silently.
//
//   Runs after FormSteps' capture-phase submit check, which stops invalid
//   or early submits before this sees them; this then stops Webflow's own
//   (delegated) handler, so nothing is posted to Webflow.
//
//   HubSpot account: REGENX Health, portal 248037195 (na2). Its tracking
//   code loads on every page so submissions link to the visitor's pages
//   and traffic source (hubspotutk cookie).
// ============================================
const PORTAL = '248037195';
const TRACKING_SRC = `https://js-na2.hs-scripts.com/${PORTAL}.js`;
const ENDPOINT = 'https://api.hsforms.com/submissions/v3/integration/submit';

const FIELD_MAP: Record<string, string> = {
  'First-Name': 'firstname',
  'Last-Name': 'lastname',
  Email: 'email',
  Phone: 'mobilephone',
  'Locations-State': 'state',
  'Date-of-Birth': 'date_of_birth',
  Message: 'message',
  // Step 1: the 8 checkboxes → one multiple-checkbox property.
  'Testosterone-Replacement-Therapy-TRT': 'services_of_interest',
  'Peptide-Therapy': 'services_of_interest',
  'Enclomiphene-Therapy': 'services_of_interest',
  'Weight-Loss': 'services_of_interest',
  'Transfer-my-care': 'services_of_interest',
  'Second-opinion': 'services_of_interest',
  'Post-Cycle-Therapy': 'services_of_interest',
  Other: 'services_of_interest',
};

type Field = { objectTypeId: string; name: string; value: string };
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function loadTracking() {
  // Only on pages served with the site loader (staging, production, dev).
  if (window.BV?.site !== 'regenx') return;
  if (!/^https?:$/.test(location.protocol)) return;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
  if (document.getElementById('hs-script-loader')) return;
  const s = document.createElement('script');
  s.id = 'hs-script-loader';
  s.async = true;
  s.defer = true;
  s.src = TRACKING_SRC;
  document.body.appendChild(s);
}

function cookie(name: string) {
  try {
    const hit = document.cookie.split('; ').find(c => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
  } catch {
    // Opaque origins (sandboxed frames, about:blank) throw on document.cookie.
    return '';
  }
}

export function collectFields(form: HTMLFormElement): Field[] {
  const values = new Map<string, string[]>();
  const add = (name: string, value: string) => {
    const v = value.replace(/\s+/g, ' ').trim();
    if (!v) return;
    values.set(name, [...(values.get(name) ?? []), v]);
  };
  form.querySelectorAll<Control>('input, select, textarea').forEach(el => {
    if (el.disabled || el.hasAttribute('data-hs-skip') || el.closest('[data-hs-skip]')) return;
    if (el instanceof HTMLInputElement && /^(submit|button|reset|file)$/.test(el.type)) return;
    const name = el.dataset.hsName || FIELD_MAP[el.name];
    if (!name) return;
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      if (el.checked) add(name, el.dataset.hsValue || el.dataset.name || el.value);
      return;
    }
    add(name, el.value);
  });
  return [...values].map(([name, list]) => ({ objectTypeId: '0-1', name, value: list.join(';') }));
}

function setPane(wrap: Element | null, form: HTMLFormElement, state: 'form' | 'done' | 'fail') {
  const done = wrap?.querySelector<HTMLElement>('.w-form-done');
  const fail = wrap?.querySelector<HTMLElement>('.w-form-fail');
  form.style.display = state === 'done' ? 'none' : '';
  if (done) done.style.display = state === 'done' ? 'block' : 'none';
  if (fail) fail.style.display = state === 'fail' ? 'block' : 'none';
}

function initOne(form: HTMLFormElement) {
  const guid = form.dataset.hubspotForm?.trim();
  if (!guid || form.dataset.hubspotReady) return;
  form.dataset.hubspotReady = '';
  const portal = form.dataset.hubspotPortal?.trim() || PORTAL;
  const wrap = form.closest('.w-form') ?? form.parentElement;
  let sending = false;

  form.addEventListener('submit', async e => {
    // Webflow's handler is delegated: stopping here keeps it from posting.
    e.preventDefault();
    e.stopPropagation();
    if (sending) return;

    const honeypot = form.querySelector<HTMLInputElement>('[data-hs-honeypot]');
    if (honeypot?.value) {
      setPane(wrap, form, 'done');
      return;
    }

    const buttons = Array.from(form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('[type="submit"]'));
    sending = true;
    form.setAttribute('aria-busy', 'true');
    buttons.forEach(b => { b.disabled = true; });
    setPane(wrap, form, 'form');

    const hutk = cookie('hubspotutk');
    const body = {
      fields: collectFields(form),
      context: {
        ...(hutk ? { hutk } : {}),
        pageUri: location.href,
        pageName: document.title,
      },
    };

    let ok = false;
    try {
      const res = await fetch(`${ENDPOINT}/${portal}/${guid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      ok = res.ok;
      if (!ok) console.warn('[RegenX] HubSpot rejected the form', res.status, await res.text().catch(() => ''));
    } catch (error) {
      console.warn('[RegenX] HubSpot form request failed', error);
    }

    sending = false;
    form.removeAttribute('aria-busy');
    buttons.forEach(b => { b.disabled = false; });
    // Failure keeps the visitor on the last step with their entries.
    setPane(wrap, form, ok ? 'done' : 'fail');
    if (ok) form.reset();
  });
}

export function initHubSpotForm() {
  const forms = document.querySelectorAll<HTMLFormElement>('form[data-hubspot-form]');
  forms.forEach(initOne);
  loadTracking();
}
