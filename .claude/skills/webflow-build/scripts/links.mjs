// Crawl the site and check every link, plus placeholders left behind.
//   node links.mjs [start path...] [--live] [--max 50] [--external]
// Follows same-origin links from the start paths (default: config.pages,
// else /) up to --max pages. Reports:
//   - internal links and pages that don't answer 200 (after redirects);
//   - empty, `#` and `javascript:` links;
//   - malformed mailto: and tel: links;
//   - "lorem ipsum" and other placeholder text;
//   - with --external, external links that fail (some sites block bots, so
//     check those by hand before calling them broken).
// Exits 1 when anything is broken.
import { loadConfig, args, browser, page, bust, paths } from './lib.mjs';

const cfg = loadConfig();
const { pos, flags, values, live } = args();
const max = +(values.max ?? 50);
const origin = new URL(cfg.stagingUrl).origin;
const b = await browser(cfg);
const p = await page(b, cfg, cfg.stagingUrl, cfg.widths[0], { live });

const queue = paths(cfg, pos).map((r) => new URL(r, origin).href);
const seen = new Set();
const status = new Map(); // url → HTTP status
const problems = [];
const perPage = new Map(); // same problem on several pages → one line
const onPage = (msg, here) => perPage.set(msg, [...(perPage.get(msg) ?? []), here]);
const external = new Map(); // url → first page it was found on

async function check(url) {
  if (status.has(url)) return status.get(url);
  let s;
  try { s = (await p.request.get(url, { maxRedirects: 5, timeout: 20000 })).status(); } catch (e) { s = `error: ${e.message.split('\n')[0]}`; }
  status.set(url, s);
  return s;
}

while (queue.length && seen.size < max) {
  const url = queue.shift().split('#')[0];
  if (seen.has(url)) continue;
  seen.add(url);
  const s = await check(url);
  if (s !== 200) { problems.push(`${s}  ${url}`); continue; }
  await p.goto(bust(url), { waitUntil: 'load' });
  const found = await p.evaluate(() => ({
    links: [...document.querySelectorAll('a')].map((a) => ({ raw: a.getAttribute('href'), href: a.href, text: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 40) })),
    lorem: /lorem ipsum|dolor sit amet/i.test(document.body.innerText),
  }));
  const here = new URL(url).pathname;
  if (found.lorem) onPage('placeholder text ("lorem ipsum")', here);
  for (const l of found.links) {
    if (l.raw === null || l.raw.trim() === '' || l.raw === '#') { onPage(`empty or # link "${l.text}"`, here); continue; }
    if (/^javascript:/i.test(l.raw)) { onPage(`javascript: link "${l.text}"`, here); continue; }
    if (/^mailto:/i.test(l.raw)) { if (!/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/i.test(l.raw)) onPage(`bad mailto ${l.raw}`, here); continue; }
    if (/^tel:/i.test(l.raw)) { if (!/^tel:\+?[\d\s().-]{6,}$/i.test(decodeURIComponent(l.raw))) onPage(`bad tel ${l.raw}`, here); continue; }
    if (l.raw.startsWith('#')) continue; // same-page anchors: anchors.mjs checks them
    const target = new URL(l.href);
    if (target.origin === origin) {
      const clean = target.origin + target.pathname;
      if (!seen.has(clean) && !/\.(pdf|jpe?g|png|webp|svg|zip|mp4)$/i.test(clean)) queue.push(clean);
      else if (!seen.has(clean)) { const s = await check(clean); if (s !== 200) problems.push(`${s}  ${clean}  linked from ${here}`); }
    } else if (/^https?:/.test(target.protocol) && !external.has(target.href)) external.set(target.href, here);
  }
}

if (flags.has('--external')) {
  for (const [url, from] of external) {
    const s = await check(url);
    if (typeof s !== 'number' || s >= 400) problems.push(`${s}  ${url}  (external, linked from ${from})`);
  }
}
for (const [msg, pages] of perPage) problems.push(`${msg}  on ${[...new Set(pages)].join(', ')}`);
console.log(`${seen.size} pages crawled${queue.length ? ` (stopped at --max ${max})` : ''}, ${external.size} external links${flags.has('--external') ? ' checked' : ' not checked (--external)'}`);
console.log(problems.length ? problems.map((x) => '  ' + x).join('\n') : '  no problems');
await b.close();
if (problems.length) process.exit(1);
