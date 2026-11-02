// Pure helpers for the launch checks (wf:tracking, wf:domain, wf:redirects,
// parts of wf:seo): no config, no browser, no network of their own, so
// tests/launch-checks.check.mjs can import them. The scripts do the
// fetching and the browsing, and pass what they saw in here.

// ---- tracking -------------------------------------------------------------

// Each tag: the script that loads it (`lib`), the request that sends data
// (`hit`), and the query parameters holding its ID (`id`) and event (`ev`).
// `google`: Google consent mode applies; `cookieless`: counts without
// tracking a person, so consent rules don't apply.
export const TAGS = [
  { tag: 'ga4', name: 'Google Analytics 4', lib: /googletagmanager\.com\/gtag\/js\?(?:[^#]*&)?id=(G-[A-Z0-9]+)/i, hit: /(?:google-analytics\.com|analytics\.google\.com)\/(?:[a-z]\/)?g\/collect/i, id: 'tid', ev: 'en', google: true },
  { tag: 'gtm', name: 'Google Tag Manager', lib: /googletagmanager\.com\/gtm\.js\?(?:[^#]*&)?id=(GTM-[A-Z0-9]+)/i },
  { tag: 'ads', name: 'Google Ads', lib: /googletagmanager\.com\/gtag\/js\?(?:[^#]*&)?id=(AW-\d+)/i, hit: /(?:googleadservices\.com\/pagead\/conversion|googleads\.g\.doubleclick\.net\/pagead\/(?:viewthrough)?conversion|google\.com\/pagead\/1p-(?:user-list|conversion))\/(\d+)/i, google: true },
  { tag: 'meta', name: 'Meta Pixel', lib: /connect\.facebook\.net\/[^/]+\/fbevents\.js/i, hit: /facebook\.com\/tr\/?\?/i, id: 'id', ev: 'ev' },
  { tag: 'linkedin', name: 'LinkedIn Insight Tag', lib: /snap\.licdn\.com\/li\.lms-analytics/i, hit: /px\.ads\.linkedin\.com\/(?:collect|wa)/i, id: 'pid' },
  { tag: 'tiktok', name: 'TikTok Pixel', lib: /analytics\.tiktok\.com\/i18n\/pixel\/events\.js/i, hit: /analytics\.tiktok\.com\/api\/v2\/pixel/i },
  { tag: 'pinterest', name: 'Pinterest Tag', lib: /s\.pinimg\.com\/ct\/core\.js/i, hit: /ct\.pinterest\.com\/v3/i, id: 'tid' },
  { tag: 'clarity', name: 'Microsoft Clarity', lib: /clarity\.ms\/tag\/([a-z0-9]+)/i, hit: /[a-z]\.clarity\.ms\/collect/i },
  { tag: 'hotjar', name: 'Hotjar', lib: /static\.hotjar\.com\/c\/hotjar-(\d+)/i, hit: /(?:in|vc|content)\.hotjar\.(?:com|io)/i },
  { tag: 'plausible', name: 'Plausible', lib: /plausible\.io\/js\//i, hit: /plausible\.io\/api\/event/i, cookieless: true },
  { tag: 'fathom', name: 'Fathom', lib: /cdn\.usefathom\.com\/script\.js/i, hit: /cdn\.usefathom\.com\/\?/i, cookieless: true },
  { tag: 'matomo', name: 'Matomo', lib: /\/(?:matomo|piwik)\.js/i, hit: /\/(?:matomo|piwik)\.php\?/i },
  { tag: 'ua', name: 'Universal Analytics', lib: /google-analytics\.com\/(?:analytics|ga)\.js/i, hit: /google-analytics\.com\/(?:r\/|j\/)?collect\?(?=.*tid=UA-)/i, id: 'tid' },
];
const NAME = Object.fromEntries(TAGS.map((t) => [t.tag, t.name]));
// Every request that sends tag data. wf:tracking aborts these, so a check
// never reaches the client's accounts: it sees what a page tries to send,
// never whether an account received it.
export const HIT = new RegExp(TAGS.filter((t) => t.hit).map((t) => t.hit.source).join('|'), 'i');

// Cookie banners, by the script that runs them.
const CMPS = [
  ['Cookiebot', /cookiebot\.(?:com|eu)/i], ['OneTrust', /cookielaw\.org|onetrust/i], ['CookieYes', /cookieyes/i], ['Osano', /osano\.com/i],
  ['Termly', /termly\.io/i], ['iubenda', /iubenda\.com/i], ['Usercentrics', /usercentrics/i], ['Complianz', /complianz/i],
  ['Finsweet Cookie Consent', /finsweet[^"']*cookie|cookie-consent@/i], ['CookieScript', /cookie-script\.com/i], ['Didomi', /privacy-center\.org|didomi/i],
  ['Axeptio', /axept\.io/i], ['Klaro', /klaro/i], ['TrustArc', /trustarc|truste\.com/i], ['Silktide', /silktide/i],
];
export const bannerOf = (urls) => (CMPS.find(([, re]) => urls.some((u) => re.test(u))) ?? [])[0] ?? null;

// A request as a tag sees it: which tag, whether it loads the tag ('lib')
// or sends data ('hit'), the ID, the events, and Google consent mode.
export function classify(url, body = '') {
  for (const t of TAGS) {
    if (t.hit?.test(url)) {
      let q; try { q = new URL(url).searchParams; } catch { q = new URLSearchParams(); }
      const m = url.match(t.hit);
      // GA4 batches events: the first in the query, the others as body lines.
      const events = [q.get(t.ev ?? 'en'), ...String(body).split('\n').map((l) => l.match(/(?:^|&)en=([^&]+)/)?.[1])].filter(Boolean).map(decodeURIComponent);
      // Consent mode: gcs is "G1" + ad storage + analytics storage (1 granted,
      // 0 denied); gcd is its newer form.
      const gcs = q.get('gcs'), gcd = q.get('gcd');
      const denied = gcs ? (t.tag === 'ads' ? gcs[2] === '0' : gcs[3] === '0') : false;
      return { tag: t.tag, kind: 'hit', id: (t.id && q.get(t.id)) || (t.tag === 'ads' && m?.[1] ? 'AW-' + m[1] : null), events, consentMode: !!(gcs || gcd), denied, cookieless: !!t.cookieless };
    }
    if (t.lib.test(url)) return { tag: t.tag, kind: 'lib', id: url.match(t.lib)?.[1] ?? null };
  }
  return null;
}
// Hits that track a visitor: not Google's cookieless pings after a "deny",
// not cookieless tools.
const tracks = (x) => x.kind === 'hit' && !x.denied && !x.cookieless;
const names = (list) => [...new Set(list.filter(tracks).map((x) => NAME[x.tag]))];

// Runs in the page: finds the cookie banner's Accept or Reject button
// (inside shadow roots too) and, with `click`, clicks it. Returns its text.
export const chooseInPage = ([kind, click]) => {
  const ACCEPT = /^(accept|accept all|accept all cookies|accept cookies|allow|allow all|allow all cookies|allow cookies|i accept|i agree|agree|agree and close|agree & close|got it|ok|okay|yes)\b/i;
  const REJECT = /^(reject|reject all|reject cookies|decline|decline all|deny|deny all|refuse|refuse all|only necessary|necessary only|only essential|essential only|use necessary cookies only|accept necessary|accept only necessary|accept only essential|continue without accepting|no,? thanks)\b/i;
  const els = [];
  const walk = (root) => { for (const el of root.querySelectorAll('button, a, [role=button], input[type=button], input[type=submit]')) els.push(el); for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot); };
  walk(document);
  const vis = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0; };
  const text = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  // A cookie choice sits in a box that talks about cookies or consent.
  const near = (el) => { let p = el; for (let i = 0; i < 8 && p; i++) { p = p.parentElement || p.getRootNode?.().host || null; if (p && /cookie|consent|privacy|gdpr|tracking/i.test(p.innerText || p.textContent || '')) return true; } return false; };
  const fits = (el) => { const t = text(el); if (!t || t.length > 45) return false; return kind === 'reject' ? REJECT.test(t) : ACCEPT.test(t) && !/necessary|essential|only|reject|decline/i.test(t); };
  const hit = els.find((el) => vis(el) && fits(el) && near(el));
  if (!hit) return null;
  if (click) hit.click();
  return text(hit);
};

// The redirects that should keep a query string (gclid, UTM): http to
// https, the other www host, and a page with and without its trailing slash.
export const CLICK_QUERY = 'gclid=wf-template-test&utm_source=wf-template&utm_medium=test';
export function clickIdTries(origin, otherPath) {
  const u = new URL(origin);
  const other = u.hostname.startsWith('www.') ? u.hostname.slice(4) : 'www.' + u.hostname;
  const tries = [`http://${u.host}/?${CLICK_QUERY}`, `https://${other}/?${CLICK_QUERY}`];
  if (otherPath && otherPath !== '/') tries.push(`${u.origin}${otherPath.endsWith('/') ? otherPath.slice(0, -1) : otherPath + '/'}?${CLICK_QUERY}`);
  return tries;
}
export const keptQuery = (url) => /gclid=wf-template-test/.test(url) && /utm_source=wf-template/.test(url);

// The tracking findings. `pages`: [{ path, tags }] from a plain visit of each
// page; `consent`: the three home page visits ({ first, afterReject,
// afterAccept, acceptedPages, buttons, banner }), or null; `redirects`:
// [{ from, to, kept }]; `staging`: the check ran on the staging domain.
// Issues with `soft` are notes; the others fail the check.
export function analyzeTracking({ pages, consent: c = null, redirects = [], staging = false }) {
  const issues = [];
  const add = (text, where, soft, fix) => issues.push({ text, pages: [].concat(where ?? []), soft: !!soft, fix });
  // Page by page, the pages as they are once cookies are accepted, when
  // there is a banner to accept (tags that wait for consent only show up
  // that way); otherwise as the plain visit found them.
  const ok = c?.acceptedPages?.length > 1 ? c.acceptedPages : pages;
  const found = new Map();
  for (const p of ok) for (const x of p.tags) {
    const f = found.get(x.tag) ?? { tag: x.tag, name: NAME[x.tag], ids: new Set(), pages: new Set() };
    if (x.id) f.ids.add(x.id);
    f.pages.add(p.path);
    found.set(x.tag, f);
  }
  const tags = [...found.values()].map((f) => ({ tag: f.tag, name: f.name, ids: [...f.ids], pages: f.pages.size, of: ok.length }));

  // A tag on most pages but not some: the rest are probably missing it.
  for (const f of found.values()) {
    if (['ads', 'ua'].includes(f.tag) || ok.length < 2) continue;
    const missing = ok.filter((p) => !f.pages.has(p.path)).map((p) => p.path);
    if (missing.length && f.pages.size >= ok.length / 2) add(`${f.name} doesn't load on ${missing.length} of ${ok.length} pages`, missing, false, 'Add the tag to the site-wide head code (or the template these pages use), so every page is counted.');
  }
  // Counted twice: more than one page view per page load for the same ID
  // (often the tag added by hand and again in Tag Manager).
  const twice = new Map();
  for (const p of ok) {
    const n = new Map();
    for (const x of p.tags.filter((y) => y.kind === 'hit' && (y.tag === 'ga4' || y.tag === 'meta'))) {
      const views = x.events.filter((e) => /^page_?view$/i.test(e)).length;
      if (views) n.set(`${x.tag} ${x.id ?? ''}`, (n.get(`${x.tag} ${x.id ?? ''}`) ?? 0) + views);
    }
    for (const [k, count] of n) if (count > 1) twice.set(k, [...(twice.get(k) ?? []), p.path]);
  }
  for (const [k, where] of twice) { const [tag, id] = k.split(' '); add(`${NAME[tag]}${id ? ` (${id})` : ''} counts each page view twice`, where, false, 'The tag is installed twice, often once by hand and once in Tag Manager. Keep one.'); }
  const ga = found.get('ga4');
  if (ga?.ids.size > 1) add(`Pages send data to ${ga.ids.size} GA4 properties: ${[...ga.ids].join(', ')}`, null, true, 'Fine if that is on purpose. If one is left from an old setup, remove it.');
  if (found.has('ua')) add('An old Universal Analytics tag is still on the site', [...found.get('ua').pages], true, 'Universal Analytics stopped collecting data in 2023. Remove the code that loads it.');
  const everywhere = new Set([...pages, ...ok].flatMap((p) => p.tags.map((x) => x.tag)));
  if (!staging && !['ga4', 'gtm', 'clarity', 'plausible', 'fathom', 'matomo', 'hotjar'].some((t) => everywhere.has(t))) add('No analytics found on the pages checked', null, true, 'If the client wants to know who visits, add GA4 (or the analytics they use) before launch.');
  const sent = pages.flatMap((p) => p.tags.filter(tracks));
  if (staging && sent.length) {
    const ids = [...new Set(sent.map((x) => x.id).filter(Boolean))];
    add(`Staging sends visits to ${names(sent).join(', ')}${ids.length ? ` (${ids.join(', ')})` : ''}`, null, true, 'Unless these are test properties, load the tags on the live domain only, or test visits end up in the client\'s reports.');
  }

  // Cookie consent, from the three visits to the home page.
  if (c) {
    const first = names(c.first), rejected = c.afterReject ? names(c.afterReject) : [];
    if (c.banner) {
      if (first.length) add(`${first.join(', ')} ${first.length === 1 ? 'tracks' : 'track'} visitors before they make a cookie choice`, '/', false, 'Load these tags only after the visitor accepts: through the cookie banner\'s settings or Google consent mode.');
      if (rejected.length) add(`${rejected.join(', ')} still ${rejected.length === 1 ? 'tracks' : 'track'} visitors after they reject cookies`, '/', false, 'Connect the tags to the cookie banner, so Reject stops them.');
      if (!c.buttons.reject && c.buttons.accept) add('The cookie banner has no Reject button on its first screen', '/', true, 'In the EU and the UK, regulators expect rejecting to be as easy as accepting. Add Reject next to Accept.');
      const isGoogle = (t) => TAGS.find((x) => x.tag === t)?.google;
      const googleHits = [...c.first, ...(c.afterReject ?? []), ...(c.afterAccept ?? [])].filter((x) => x.kind === 'hit' && isGoogle(x.tag));
      if ([...found.keys()].some(isGoogle) && googleHits.length && !googleHits.some((x) => x.consentMode)) add('Google tags don\'t use consent mode', '/', true, 'Turn on Google consent mode in the cookie banner\'s settings: Google asks for it for visitors in the EEA, and GA4 can then model the visits of people who decline.');
      if (c.afterAccept && !c.afterAccept.length && found.size) add('Accepting cookies doesn\'t start any tag on the next page view', '/', true, 'Accept cookies on the site yourself, then check GA4\'s Realtime report shows the visit.');
    } else if (first.length) {
      add(`${first.join(', ')} ${first.length === 1 ? 'runs' : 'run'} with no cookie banner`, '/', true, 'If the site has visitors from the EU, the UK or US states with privacy laws, ask the client whether it needs a cookie banner.');
    }
  }
  // Ad clicks and campaigns keep their source through redirects.
  const dropped = redirects.filter((r) => !r.kept);
  if (dropped.length) add(`Redirects drop gclid and UTM tags (${dropped.map((r) => `${r.from} → ${r.to}`).join('; ')})`, null, !found.has('ads'), 'Keep the query string when redirecting: usually the https, www or trailing-slash setting, or the redirect rule.');

  const blocked = [...pages, ...(ok === pages ? [] : ok)].reduce((n, p) => n + p.tags.filter((x) => x.kind === 'hit').length, 0)
    + (c ? [...c.first, ...(c.afterReject ?? [])].filter((x) => x.kind === 'hit').length : 0);
  return {
    issues,
    info: {
      tags, banner: c?.banner ?? null, buttons: c?.buttons ?? null, acceptedPass: ok !== pages,
      consentMode: [...pages, ...ok].flatMap((p) => p.tags).concat(c?.first ?? []).some((x) => x.consentMode),
      firstVisit: c ? names(c.first) : null, afterReject: c?.afterReject ? names(c.afterReject) : null, afterAccept: c?.afterAccept ? names(c.afterAccept) : null,
      blocked,
    },
  };
}

// Third-party services the pages load, by the address of a script, frame or
// stylesheet: the list the handoff needs (whose accounts these are, who
// pays). Webflow itself and the analytics tags above are left out.
const SERVICES = [
  ['HubSpot forms', 'Forms', /js\.hsforms\.net|forms\.hubspot\.com/i], ['Typeform', 'Forms', /typeform\.com/i], ['Jotform', 'Forms', /jotform/i],
  ['Google Forms', 'Forms', /docs\.google\.com\/forms/i], ['Tally', 'Forms', /tally\.so/i], ['Formspree', 'Forms', /formspree\.io/i],
  ['Mailchimp', 'Email marketing', /list-manage\.com|mailchimp/i], ['Klaviyo', 'Email marketing', /klaviyo/i], ['Kit (ConvertKit)', 'Email marketing', /convertkit|ck\.page/i],
  ['Calendly', 'Booking', /calendly\.com/i], ['Cal.com', 'Booking', /cal\.com\/embed/i], ['Acuity', 'Booking', /acuityscheduling/i],
  ['Intercom', 'Chat', /intercom(cdn)?\.io/i], ['Drift', 'Chat', /drift\.com|driftt\.com/i], ['Crisp', 'Chat', /crisp\.chat/i], ['Tidio', 'Chat', /tidio/i],
  ['Zendesk', 'Chat', /zdassets\.com|zopim/i], ['HubSpot', 'Marketing', /js\.hs-scripts\.com|js\.hs-analytics\.net|js\.hs-banner\.com|js\.hubspot\.com/i],
  ['YouTube', 'Embeds', /youtube(-nocookie)?\.com\/embed/i], ['Vimeo', 'Embeds', /player\.vimeo\.com/i], ['Google Maps', 'Embeds', /google\.com\/maps|maps\.googleapis/i],
  ['Google Fonts', 'Fonts', /fonts\.googleapis\.com|fonts\.gstatic\.com/i], ['Adobe Fonts', 'Fonts', /use\.typekit\.net/i],
  ['reCAPTCHA', 'Spam protection', /google\.com\/recaptcha|recaptcha\.net/i], ['hCaptcha', 'Spam protection', /hcaptcha\.com/i], ['Cloudflare Turnstile', 'Spam protection', /challenges\.cloudflare\.com/i],
  ['Stripe', 'Payments', /js\.stripe\.com/i], ['PayPal', 'Payments', /paypal\.com\/sdk/i],
  ['Finsweet Attributes', 'Webflow add-ons', /finsweet/i], ['Memberstack', 'Members', /memberstack/i], ['Outseta', 'Members', /outseta/i],
];
// `pages`: [{ path, urls }]. Returns [{ name, kind, pages }] sorted by kind.
export function detectServices(pages) {
  const found = new Map();
  for (const pg of pages) for (const u of pg.urls) for (const [name, kind, re] of SERVICES) {
    if (!re.test(u)) continue;
    const x = found.get(name) ?? { name, kind, pages: new Set() };
    x.pages.add(pg.path);
    found.set(name, x);
  }
  const order = [...new Set(SERVICES.map((s) => s[1]))];
  return [...found.values()].map((x) => ({ name: x.name, kind: x.kind, pages: x.pages.size }))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
}

// ---- domain and certificate -----------------------------------------------

// Two-part endings where the registered name is the label before them.
const TWO = /\.(co|com|net|org|gov|ac|edu|ltd|plc|me|ne|or|gen|id|nom|biz|info|sch)\.[a-z]{2}$/i;
// The domain someone registered: the host without www or other subdomains.
export const registrable = (host) => { const h = String(host).toLowerCase().replace(/\.$/, ''); return h.split('.').slice(TWO.test(h) ? -3 : -2).join('.'); };
// Certificates from these renew themselves every few months.
export const autoRenews = (issuer) => /let'?s encrypt|google trust|amazon|cloudflare|zerossl|sectigo/i.test(issuer ?? '');
export const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

// Expiry date and registrar from an RDAP answer (the registries' public
// lookup). Some registries don't publish the date.
export function rdapSummary(j) {
  const ev = (j.events ?? []).find((e) => /expiration/i.test(e.eventAction ?? ''));
  const reg = (j.entities ?? []).find((e) => (e.roles ?? []).includes('registrar'));
  const fn = reg?.vcardArray?.[1]?.find((x) => x[0] === 'fn');
  return { expires: ev ? isoDate(ev.eventDate) : null, registrar: fn ? fn[3] : null };
}

// Who answers for a domain's DNS, by its name servers.
const DNS_HOSTS = [[/cloudflare\.com$/i, 'Cloudflare'], [/awsdns/i, 'Amazon Route 53'], [/domaincontrol\.com$/i, 'GoDaddy'], [/registrar-servers\.com$/i, 'Namecheap'],
  [/googledomains\.com$|google\.com$/i, 'Google'], [/squarespacedns\.com$/i, 'Squarespace'], [/wixdns\.net$/i, 'Wix'], [/nsone\.net$/i, 'NS1'], [/dnsimple/i, 'DNSimple'],
  [/azure-dns/i, 'Azure'], [/digitalocean\.com$/i, 'DigitalOcean'], [/hover\.com$/i, 'Hover'], [/name\.com$/i, 'Name.com'], [/porkbun\.com$/i, 'Porkbun'],
  [/vercel-dns\.com$/i, 'Vercel'], [/netlify/i, 'Netlify']];
// A domain can use two providers at once; the one with most servers wins.
export function dnsHostName(servers) {
  const count = new Map();
  for (const n of servers) { const hit = DNS_HOSTS.find(([re]) => re.test(n.replace(/\.$/, ''))); if (hit) count.set(hit[1], (count.get(hit[1]) ?? 0) + 1); }
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// What needs attention on `today` (YYYY-MM-DD): a self-renewing certificate
// a week from running out (its renewal has failed), any other within 30
// days, a domain within 45 days. Negative days: already expired.
export function renewalWarnings({ ssl, domain }, today) {
  const days = (d) => Math.round((new Date(d + 'T00:00Z') - new Date(today + 'T00:00Z')) / 864e5);
  const out = [];
  if (ssl?.expires) { const n = days(ssl.expires), auto = autoRenews(ssl.issuer); if (n <= (auto ? 7 : 30)) out.push({ what: 'ssl', expires: ssl.expires, days: n, auto }); }
  if (domain?.expires) { const n = days(domain.expires); if (n <= 45) out.push({ what: 'domain', expires: domain.expires, days: n }); }
  return out;
}

// robots.txt that blocks every page for every crawler (`Disallow: /` in the
// `User-agent: *` group).
export function robotsBlocksAll(text) {
  let star = false, inAgents = false, blocks = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, field, value] = m;
    if (/^user-agent$/i.test(field)) { if (!inAgents) star = false; inAgents = true; if (value.trim() === '*') star = true; continue; }
    inAgents = false;
    if (star && /^disallow$/i.test(field) && value.trim() === '/') blocks = true;
    if (star && /^allow$/i.test(field) && value.trim() === '/') return false;
  }
  return blocks;
}

// ---- redirects ------------------------------------------------------------

const FILE = /\.(pdf|jpe?g|png|gif|svg|webp|avif|zip|mp4|mp3|docx?|xlsx?|pptx?|csv|txt|xml|json|css|js|ico|woff2?)$/i;
const JUNK = /^\/(wp-(content|includes|json|admin)|cdn-cgi|feed|xmlrpc|comments\/feed|\.well-known)(\/|$)/i;
// A path without its trailing slash, index file or query. Capitals stay;
// comparisons use key().
export function normPath(u, origin = 'https://x.invalid') {
  let x; try { x = new URL(u, origin); } catch { return null; }
  let p; try { p = decodeURIComponent(x.pathname); } catch { p = x.pathname; }
  return p.replace(/\/index\.(html?|php)$/i, '/').replace(/\/+$/, '') || '/';
}
export const key = (p) => String(p).toLowerCase();
// Paths worth a redirect: pages, not files or platform internals.
export const isPage = (p) => !!p && !FILE.test(p) && !JUNK.test(p);
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'of', 'to', 'in', 'on', 'with', 'at', 'by', 'is', 'our', 'your', 'us', 'page', 'html', 'php', 'www']);
const stem = (w) => w.replace(/ies$/, 'y').replace(/(es|s)$/, '');
const tokens = (s) => new Set(String(s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w) && !/^\d{1,4}$/.test(w)).map(stem));
const jaccard = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n); };
const lastSeg = (p) => p.split('/').filter(Boolean).pop() ?? '';
const parentOf = (p) => p.split('/').slice(0, -1).join('/') || '/';
// A title without the brand ending ("About | Brand" → "About").
export const bareTitle = (t) => String(t ?? '').split(/\s[|–·-]\s/)[0].trim();

// Each old page matched to its closest new page. `oldPages`, `newPages`:
// [{ path, title }]; `kept`: { oldPathKey: newPath } decisions already in
// the map (a person's edit wins). `how`: same (path unchanged), kept, slug
// (same last segment), similar (slug and title words), parent (its
// section), home (nothing close). `sure` false means: needs a look.
export function matchPages(oldPages, newPages, kept = {}) {
  const byPath = new Map(newPages.map((p) => [key(p.path), p]));
  const bySlug = new Map();
  for (const p of newPages) { const s = key(lastSeg(p.path)); if (s) bySlug.set(s, bySlug.has(s) ? null : p); } // null: more than one
  const newTok = newPages.map((p) => ({ p, slug: tokens(lastSeg(p.path)), title: tokens(bareTitle(p.title)), parent: parentOf(p.path) }));
  return oldPages.map((o) => {
    const row = { from: o.path, title: o.title ?? '', to: '/', how: 'home', score: 0, sure: false };
    if (kept[key(o.path)]) return { ...row, to: kept[key(o.path)], how: 'kept', sure: true };
    if (byPath.has(key(o.path))) return { ...row, to: byPath.get(key(o.path)).path, how: 'same', sure: true };
    const s = bySlug.get(key(lastSeg(o.path)));
    if (s) return { ...row, to: s.path, how: 'slug', sure: true };
    const ot = tokens(lastSeg(o.path)), ott = tokens(bareTitle(o.title)), op = parentOf(o.path);
    let best = null, bestScore = 0;
    for (const n of newTok) {
      if (n.p.path === '/') continue;
      const slugS = jaccard(ot, n.slug), titleS = ott.size && n.title.size ? jaccard(ott, n.title) : 0;
      let sc = ott.size && n.title.size ? 0.55 * slugS + 0.45 * titleS : slugS;
      sc = Math.max(sc, slugS * 0.9, titleS * 0.9);
      if (n.parent === op && op !== '/') sc += 0.08;
      if (sc > bestScore) { bestScore = sc; best = n.p; }
    }
    if (best && bestScore >= 0.45) return { ...row, to: best.path, how: 'similar', score: Math.round(Math.min(bestScore, 1) * 100), sure: bestScore >= 0.8 };
    // Nothing close: its section's page, else the home page. Both need a look.
    for (let p = op; p !== '/'; p = parentOf(p)) if (byPath.has(key(p))) return { ...row, to: byPath.get(key(p)).path, how: 'parent' };
    return row;
  });
}

const csvCell = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
// Rows of a CSV file (quoted cells allowed).
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const s = String(text).replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cell); if (row.some((c) => c.trim())) rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}
// Webflow's 301 import (Site settings › Publishing › 301 redirects): two
// columns, old path and new path, one row each. An import REPLACES every
// redirect on the site, so `existing` (Webflow's own export) is merged in:
// its header line stays first and its rows stay unless the map has the same
// old path. Rows whose path didn't change are left out.
export function webflowCsv(rows, existing = '') {
  const old = parseCsv(existing);
  const header = old[0] && !old[0][0].trim().startsWith('/') ? old.shift() : null;
  const mine = rows.filter((r) => key(r.from) !== key(r.to));
  const taken = new Set(mine.map((r) => key(r.from)));
  const lines = [...(header ? [header] : []), ...old.filter((r) => !taken.has(key(r[0].trim()))), ...mine.map((r) => [r.from, r.to])];
  return lines.map((r) => r.map((c) => csvCell(String(c).trim())).join(',')).join('\r\n') + '\r\n';
}

// URLs pasted from Search Console, analytics or a spreadsheet: one per line,
// or the first URL-looking cell of a CSV row. Full URLs stay as they are (an
// old domain should redirect to the new one); paths are opened on `origin`.
export function parseUrlList(text, origin) {
  const out = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    const cell = line.split(/[\t,;]/).map((c) => c.trim().replace(/^["']|["']$/g, '')).find((c) => /^https?:\/\//i.test(c) || c.startsWith('/'));
    if (!cell) continue;
    let u; try { u = new URL(cell, origin); } catch { continue; }
    u.hash = '';
    if (!out.has(u.href)) out.set(u.href, u.href);
  }
  return [...out.values()];
}

// Follow a URL one hop at a time with `fetchFn` (fetch, or a stand-in in
// tests): [{ status, url }], the last being where it ended. Status 0: no
// answer.
export async function followHops(url, fetchFn = fetch, max = 10) {
  const hops = [];
  for (let i = 0; i <= max; i++) {
    let r;
    try { r = await fetchFn(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'cache-control': 'no-cache' } }); }
    catch { hops.push({ status: 0, url }); break; }
    hops.push({ status: r.status, url });
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) { url = new URL(loc, url).href; continue; }
    break;
  }
  return hops;
}

// What went wrong with one old URL, from its hops, or null. `site`: the new
// site's host; `to`: where the map says it should end (null: not in the map).
// error (no answer), loop, missing (404, no redirect), dead-end (redirects
// to a page that fails), offsite, none (should redirect but doesn't),
// moved (should stay but redirects), wrong (ends on another page), home
// (an unmapped URL sent to the home page: Google treats that as a missing
// page), temporary (302/307), chain (more than two hops, or two moves).
export function judgeHops(hops, { site, to = null }) {
  const bare = (h) => h.replace(/^www\./, '');
  const first = hops[0], last = hops.at(-1), redirects = hops.length - 1;
  const path = normPath(first.url);
  let fu = null; try { fu = new URL(last.url); } catch { /* no URL */ }
  const finalHost = fu ? bare(fu.hostname) : '', finalPath = fu ? normPath(fu.href) : '';
  // Hops that only add https or www don't count as a move.
  const moves = hops.slice(1).filter((h, i) => key(normPath(h.url)) !== key(normPath(hops[i].url))).length;
  if (!first.status) return 'error';
  if (redirects > 5) return 'loop';
  if (!redirects && last.status >= 400) return 'missing';
  if (redirects && (last.status >= 400 || !last.status)) return 'dead-end';
  if (finalHost !== bare(site)) return 'offsite';
  if (to != null && key(finalPath) !== key(normPath(to))) return key(normPath(to)) === key(path) ? 'moved' : redirects ? 'wrong' : 'none';
  if (to == null && redirects && finalPath === '/' && path !== '/') return 'home';
  if (hops.slice(0, -1).some((h) => [302, 303, 307].includes(h.status))) return 'temporary';
  if (redirects > 2 || moves > 1) return 'chain';
  return null;
}
