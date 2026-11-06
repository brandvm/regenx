// The custom domain from outside: its certificate, when the domain runs
// out, who hosts its DNS, and the host redirects.
//   node domain.mjs [--today YYYY-MM-DD]
// Always `liveUrl` from the config (staging has Webflow's own domain).
// The certificate is read from the site; the domain's expiry and registrar
// from RDAP (the registries' public lookup, through rdap.org); the DNS host
// from the name servers. Reports (exit 1 on any):
//   - a certificate browsers don't trust, or none;
//   - a certificate near its end: within 7 days for one that renews itself
//     (Let's Encrypt, Google: its renewal has failed), else 30 days;
//   - a domain that expires within 45 days;
//   - http:// that doesn't redirect to https://;
//   - the other www host (www. or apex) showing the site instead of
//     redirecting to the `liveUrl` host, or redirecting elsewhere;
//   - a temporary (302/307) host redirect.
// Noted: a registry that publishes no expiry date, a host redirect of more
// than one hop. Printed for the handoff: registrar, DNS host and name
// servers, certificate issuer.
import tls from 'node:tls';
import dns from 'node:dns/promises';
import { loadConfig, args } from './lib.mjs';
import { registrable, autoRenews, isoDate, rdapSummary, dnsHostName, renewalWarnings, followHops } from './launch-lib.mjs';

const cfg = loadConfig();
const { values } = args();
if (!cfg.liveUrl) { console.error('wf:domain needs "liveUrl" (the custom domain) in webflow-build.config.json.'); process.exit(1); }
const live = new URL(cfg.liveUrl);
const host = live.hostname;
const apex = registrable(host);
const today = values.today ?? isoDate(Date.now());
const bad = [];
const note = [];

const ssl = await new Promise((resolve) => {
  const sock = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: 10000 }, () => {
    const c = sock.getPeerCertificate();
    sock.end();
    if (!c?.valid_to) return resolve({ error: 'no certificate' });
    resolve({ expires: isoDate(c.valid_to), issuer: c.issuer?.O || c.issuer?.CN || '', trusted: sock.authorized, why: sock.authorizationError });
  });
  sock.on('timeout', () => { sock.destroy(); resolve({ error: 'no answer on https' }); });
  sock.on('error', (e) => resolve({ error: e.code === 'ENOTFOUND' ? 'the domain points nowhere yet' : e.code ?? e.message }));
});

let domain;
try {
  const r = await fetch('https://rdap.org/domain/' + encodeURIComponent(apex), { headers: { accept: 'application/rdap+json', 'user-agent': 'wf-template wf:domain (+https://github.com/brandvm/wf-template)' }, signal: AbortSignal.timeout(12000) });
  domain = r.ok ? rdapSummary(await r.json()) : { error: r.status === 404 ? 'not found in the registry' : `registry lookup answered ${r.status}` };
} catch { domain = { error: 'the registry lookup didn\'t answer' }; }

const ns = await dns.resolveNs(apex).catch(() => []);

if (ssl.error) bad.push(`certificate: ${ssl.error}`);
else if (!ssl.trusted) bad.push(`certificate not trusted by browsers (${ssl.why ?? 'unknown reason'})`);
if (domain.error) note.push(`domain expiry: ${domain.error}`);
else if (!domain.expires) note.push(`the registry for ${apex} publishes no expiry date: ask the registrar`);
for (const w of renewalWarnings({ ssl, domain }, today)) {
  const when = w.days < 0 ? `expired ${-w.days} days ago` : `expires in ${w.days} days`;
  bad.push(w.what === 'ssl' ? `certificate ${when} (${w.expires})${w.auto ? ': it renews itself, so its renewal has failed; check the domain still points at Webflow' : ''}` : `domain ${apex} ${when} (${w.expires}): renew it at the registrar`);
}

// http → https, and the other www host → the liveUrl host.
const other = host.startsWith('www.') ? host.slice(4) : 'www.' + host;
const site = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
for (const [start, what] of [[`http://${host}/`, 'http://'], [`https://${other}/`, other]]) {
  const hops = await followHops(start);
  const last = hops.at(-1), redirects = hops.length - 1;
  if (!hops[0].status) { if (what !== other) bad.push(`${start} doesn't answer`); else note.push(`${other} doesn't answer (fine if it has no DNS record; visitors who type it get nothing)`); continue; }
  if (!redirects) { bad.push(what === other ? `${other} shows the site without redirecting to ${host}, so it exists twice` : 'http:// doesn\'t redirect to https://'); continue; }
  if (!last.url.startsWith('https://') || site(last.url) !== host) bad.push(`${start} ends on ${last.url}, not https://${host}/`);
  if (hops.slice(0, -1).some((h) => [302, 303, 307].includes(h.status))) bad.push(`${start} redirects with a temporary ${hops[0].status}: make it permanent (301)`);
  if (redirects > 1) note.push(`${start} takes ${redirects} hops to reach ${last.url}`);
}

console.log(`domain: ${host} (${today})`);
console.log(`  certificate: ${ssl.error ? ssl.error : `${ssl.issuer || 'unknown issuer'}, expires ${ssl.expires}${autoRenews(ssl.issuer) ? ' (renews itself)' : ''}`}`);
console.log(`  domain: ${apex}${domain.expires ? `, expires ${domain.expires}` : ''}${domain.registrar ? `, registrar ${domain.registrar}` : ''}`);
console.log(`  DNS: ${ns.length ? `${dnsHostName(ns) ?? 'unknown host'} (${ns.sort().slice(0, 4).join(', ')})` : 'no name servers found'}`);
for (const m of bad) console.log(`  ${m}`);
for (const m of note) console.log(`  (note) ${m}`);
console.log(`\ndomain: ${bad.length} finding${bad.length === 1 ? '' : 's'}`);
if (bad.length) process.exit(1);
