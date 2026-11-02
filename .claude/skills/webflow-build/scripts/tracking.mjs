// Analytics and ad tags as a visitor's browser sees them, with every
// request that sends data blocked, so the check never reaches the client's
// accounts (it tells what a page tries to send, not what an account got).
//   node tracking.mjs [/path…] [--live]
// Paths default to `pages` in the config. Staging by default; --live checks
// `liveUrl`. Each page is opened once in a fresh browser; then the home page
// three times more: a first visit, after rejecting cookies, after accepting
// them (the accepted visit opens the other paths too, so tags that wait for
// consent are checked page by page). Reports (exit 1 on any):
//   - a tag that loads on most pages but not some;
//   - GA4 or the Meta Pixel counting a page view twice (installed twice);
//   - with a cookie banner: tags that track before the choice, or after
//     Reject;
//   - redirects (http, the other www host, a trailing slash) that drop
//     gclid and UTM tags, when Google Ads is on the site.
// Noted: several GA4 properties, an old Universal Analytics tag, no
// analytics at all (live), staging sending visits, no Reject button, Google
// tags without consent mode, no banner, Accept starting nothing. Also
// listed: the tags with their IDs, and the third-party services the pages
// load (forms, chat, booking, fonts, embeds) for the handoff.
import { loadConfig, args, browser, page, paths } from './lib.mjs';
import { HIT, classify, bannerOf, chooseInPage, analyzeTracking, detectServices, clickIdTries, keptQuery } from './launch-lib.mjs';

const cfg = loadConfig();
const { pos, live } = args();
const base = live ? cfg.liveUrl?.replace(/\/$/, '') : cfg.stagingUrl;
if (!base) { console.error('--live needs "liveUrl" (the custom domain) in webflow-build.config.json.'); process.exit(1); }
const list = paths(cfg, pos);
const b = await browser(cfg);

// A fresh browser on one page: tag requests recorded (and data blocked)
// from before the first byte. `log()` returns what it saw since `t`.
async function open(url) {
  const p = await page(b, cfg, base, cfg.widths[0], { live });
  const seen = [];
  const urls = [];
  p.on('request', (r) => {
    urls.push(r.url());
    let body = ''; try { body = r.postData() ?? ''; } catch { /* no body */ }
    const c = classify(r.url(), body);
    if (c) seen.push({ ...c, t: Date.now() });
  });
  await p.context().route(HIT, (r) => r.abort());
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await p.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
  // Banners and tags often start a moment after the load.
  await p.waitForTimeout(3500);
  return { p, urls, log: (t = 0) => seen.filter((x) => x.t >= t) };
}

const pages = [];
const assets = [];
for (const path of list) {
  const v = await open(base + path);
  pages.push({ path, tags: v.log() });
  assets.push({ path, urls: v.urls });
  await v.p.context().close();
}

// The home page: Reject in one fresh browser, Accept in another.
async function visit(choice) {
  const v = await open(base + '/');
  const before = v.log();
  const buttons = { accept: await v.p.evaluate(chooseInPage, ['accept', false]).catch(() => null), reject: await v.p.evaluate(chooseInPage, ['reject', false]).catch(() => null) };
  const clicked = await v.p.evaluate(chooseInPage, [choice, true]).catch(() => null);
  let after = null;
  const accepted = [];
  if (clicked) {
    const t = Date.now();
    await v.p.waitForTimeout(2500);
    // A second page view: tags that wait for consent usually start here.
    await v.p.reload({ waitUntil: 'load', timeout: 30000 }).catch(() => {});
    await v.p.waitForTimeout(3000);
    after = v.log(t);
    if (choice === 'accept') {
      accepted.push({ path: '/', tags: after });
      for (const path of list.filter((x) => x !== '/')) {
        const t0 = Date.now();
        if (!(await v.p.goto(base + path, { waitUntil: 'load', timeout: 30000 }).then(() => true, () => false))) continue;
        await v.p.waitForTimeout(2500);
        accepted.push({ path, tags: v.log(t0) });
      }
    }
  }
  const banner = bannerOf(v.urls);
  await v.p.context().close();
  return { before, after, clicked, buttons, banner, accepted };
}
const rej = await visit('reject');
const acc = await visit('accept');
await b.close();
const consent = {
  first: rej.before, afterReject: rej.clicked ? rej.after : null, afterAccept: acc.clicked ? acc.after : null,
  acceptedPages: acc.clicked ? acc.accepted : [], buttons: rej.buttons,
  banner: rej.banner ?? acc.banner ?? (rej.buttons.accept || rej.buttons.reject ? 'a cookie banner' : null),
};

// gclid and UTM through the host and trailing-slash redirects (no browser:
// only where each redirect lands matters).
const redirects = [];
for (const t of clickIdTries(base, list.find((x) => x !== '/'))) {
  const r = await fetch(t, { redirect: 'follow', signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!r || r.url === t) continue; // no answer, or no redirect: nothing to keep
  redirects.push({ from: t.split('?')[0], to: r.url.split('?')[0], kept: keptQuery(r.url) });
}

const { issues, info } = analyzeTracking({ pages, consent, redirects, staging: !live });
console.log(`tracking: ${pages.length} page${pages.length === 1 ? '' : 's'} on ${base}, ${info.blocked} data request${info.blocked === 1 ? '' : 's'} blocked`);
console.log(info.tags.length ? info.tags.map((t) => `  ${t.name}${t.ids.length ? ` (${t.ids.join(', ')})` : ''}: ${t.pages} of ${t.of} pages`).join('\n') : '  no tags found');
console.log(`cookie banner: ${consent.banner ?? 'none found'}${consent.banner ? ` (Accept: ${consent.buttons.accept ? 'yes' : 'not found'}, Reject: ${consent.buttons.reject ? 'yes' : 'not found'})` : ''}; Google consent mode: ${info.consentMode ? 'on' : 'not seen'}`);
const show = (l) => (l == null ? 'not run (no button clicked)' : l.length ? l.join(', ') : 'nothing tracks');
console.log(`  first visit: ${show(info.firstVisit)}\n  after Reject: ${show(info.afterReject)}\n  after Accept: ${show(info.afterAccept)}`);
for (const r of redirects) console.log(`  ${r.from} → ${r.to}: query string ${r.kept ? 'kept' : 'DROPPED'}`);
const services = detectServices(assets);
if (services.length) console.log(`services:\n${services.map((s) => `  ${s.kind}: ${s.name} (${s.pages} page${s.pages === 1 ? '' : 's'})`).join('\n')}`);
const bad = issues.filter((i) => !i.soft);
for (const i of issues) console.log(`\n${i.soft ? '(note) ' : ''}${i.text}${i.pages.length ? `  on ${i.pages.join(', ')}` : ''}\n  ${i.fix}`);
console.log(`\ntracking: ${bad.length} finding${bad.length === 1 ? '' : 's'}, ${issues.length - bad.length} note${issues.length - bad.length === 1 ? '' : 's'}`);
if (bad.length) process.exit(1);
