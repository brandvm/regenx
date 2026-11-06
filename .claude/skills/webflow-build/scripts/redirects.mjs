// The redirect map for a redesign: every URL of the old site matched to its
// closest page on the new one, written as Webflow's 301 import file, then
// tested once the redirects are live. Plain requests, no browser.
//   node redirects.mjs map [--from https://old-site] [--existing export.csv] [--max 400]
//   node redirects.mjs test [--live] [--file urls.txt]
// `map` reads the old site's sitemap (or crawls it), and the new site's
// sitemap and links on staging, then matches by path, by last segment, then
// by slug and title words. The old site is --from, else `redirects.oldUrl`,
// else `liveUrl` (before launch the custom domain still serves the old
// site). It writes `redirects.file` (default docs/seo/redirects.csv): two
// columns, old path and new path, the format Site settings › Publishing ›
// 301 redirects › Import takes. An import REPLACES every redirect on the
// site: pass Webflow's own export as --existing to keep them. Rows already
// in the file are kept as they are (a person's edit wins), so re-running
// only adds. Rows to check by hand ("similar" under 80%, "parent",
// "home") are printed; the whole review is in .webflow-build/redirects/.
// `test` follows every row of the file on staging (or --live, after the
// publish), one hop at a time; --file tests a list instead (Search Console
// or analytics export: one URL or path per line, or a CSV). Reported (exit
// 1 on any): no answer, a loop, 404 with no redirect, a redirect to a page
// that fails, to another site, to the wrong page, no redirect where the map
// has one, an unmapped URL sent to the home page, a temporary redirect, or
// a chain of more than two hops.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, args, outDir } from './lib.mjs';
import { normPath, key, isPage, bareTitle, matchPages, parseCsv, webflowCsv, parseUrlList, followHops, judgeHops } from './launch-lib.mjs';

const cfg = loadConfig();
const { pos, values, live } = args();
const cmd = pos[0];
if (!['map', 'test'].includes(cmd)) { console.error('Usage: wf:redirects map [--from https://old-site] [--existing export.csv] | wf:redirects test [--live] [--file urls.txt]'); process.exit(1); }
const mapFile = path.resolve(path.dirname(cfg.file), cfg.redirects?.file ?? 'docs/seo/redirects.csv');
const max = Number(values.max ?? 400);

const get = (url) => fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'cache-control': 'no-cache' } })
  .then(async (r) => ({ status: r.status, url: r.url || url, text: r.ok ? await r.text() : '' }), () => ({ status: 0, url, text: '' }));
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k]); } }));
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'");
const titleOf = (html) => bareTitle(decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' '));

// The rows already in the map: { from, to }, header and patterns left out.
const mapRows = () => (fs.existsSync(mapFile) ? parseCsv(fs.readFileSync(mapFile, 'utf8')) : [])
  .filter((r) => r[0]?.trim().startsWith('/') && r[1]?.trim()).map((r) => ({ from: r[0].trim(), to: r[1].trim() }));
const isPattern = (p) => /[()*%]/.test(p);

// Paths in a site's sitemaps (robots.txt Sitemap lines, else /sitemap.xml;
// sitemap indexes two levels deep). Webflow's staging sitemap lists the
// custom domain, so only the path is kept.
async function sitemapPaths(origin) {
  const out = new Set(), seen = new Set();
  const read = async (u, depth) => {
    if (seen.has(u) || depth > 2 || out.size >= 2000) return;
    seen.add(u);
    const r = await get(u);
    if (r.status !== 200) return;
    const locs = [...r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decode(m[1]));
    if (/<sitemapindex/i.test(r.text)) { for (const l of locs.slice(0, 20)) await read(l, depth + 1); return; }
    for (const l of locs) { const p = normPath(l); if (isPage(p)) out.add(p); }
  };
  const robots = await get(origin + '/robots.txt');
  const listed = [...robots.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  for (const u of listed.length ? listed.slice(0, 3) : [origin + '/sitemap.xml']) await read(u, 0);
  return [...out];
}
// Pages reached from `start` by following same-site links, with titles.
async function crawl(origin, start, limit) {
  const host = new URL(origin).hostname.replace(/^www\./, '');
  const found = new Map(), seen = new Set();
  const queue = [...start];
  while (queue.length && found.size < limit) {
    const batch = queue.splice(0, 8).filter((p) => !seen.has(key(p)) && seen.add(key(p)));
    await Promise.all(batch.map(async (p) => {
      const r = await get(origin + p);
      if (!r.status || r.status >= 400) return;
      const at = normPath(r.url);
      if (!found.has(key(at))) found.set(key(at), { path: at, title: titleOf(r.text) });
      for (const [, href] of r.text.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)/gi)) {
        let u; try { u = new URL(decode(href), origin + p); } catch { continue; }
        const np = normPath(u.href);
        if (/^https?:$/.test(u.protocol) && u.hostname.replace(/^www\./, '') === host && isPage(np) && !seen.has(key(np))) queue.push(np);
      }
    }));
  }
  return [...found.values()];
}

if (cmd === 'map') {
  const from = (values.from ?? cfg.redirects?.oldUrl ?? cfg.liveUrl)?.replace(/\/$/, '');
  if (!from) { console.error('wf:redirects map needs the old site: --from https://old-site, or "redirects.oldUrl" in webflow-build.config.json.'); process.exit(1); }
  const oldOrigin = new URL(from).origin, newOrigin = new URL(cfg.stagingUrl).origin;
  if (oldOrigin === newOrigin) { console.error('The old site and staging are the same address.'); process.exit(1); }

  console.log(`redirects: reading the new site on ${newOrigin}`);
  const newPages = await crawl(newOrigin, ['/', ...(await sitemapPaths(newOrigin))], max);
  if (!newPages.length) { console.error(`No pages answered on ${newOrigin}.`); process.exit(1); }
  console.log(`redirects: reading the old site on ${oldOrigin}`);
  const oldPaths = await sitemapPaths(oldOrigin);
  const oldPages = oldPaths.length ? oldPaths.map((p) => ({ path: p, title: '' })) : await crawl(oldOrigin, ['/'], 2000);
  if (!oldPages.length) { console.error(`No pages found on ${oldOrigin} (no sitemap, and the home page didn't answer).`); process.exit(1); }

  const existing = mapRows();
  const kept = Object.fromEntries(existing.map((r) => [key(r.from), r.to]));
  let rows = matchPages(oldPages, newPages, kept);
  // Titles help match pages whose URL changed: fetch them only for those.
  const need = rows.filter((r) => !r.sure).map((r) => oldPages.find((o) => o.path === r.from)).filter((o) => !o.title).slice(0, 300);
  await pool(need, 8, async (o) => { o.title = titleOf((await get(oldOrigin + o.path)).text); });
  if (need.length) rows = matchPages(oldPages, newPages, kept);

  // Rows a person added by hand (old paths the sitemap doesn't list) stay.
  const known = new Set(rows.map((r) => key(r.from)));
  const all = [...rows, ...existing.filter((r) => !known.has(key(r.from))).map((r) => ({ ...r, how: 'kept', score: 0, sure: true, title: '' }))];
  const exportCsv = values.existing ? fs.readFileSync(path.resolve(values.existing), 'utf8') : '';
  fs.mkdirSync(path.dirname(mapFile), { recursive: true });
  fs.writeFileSync(mapFile, webflowCsv(all, exportCsv));
  const review = path.join(outDir('redirects'), 'review.csv');
  fs.writeFileSync(review, ['from,to,how,score,needs a look,old title', ...all.map((r) => [r.from, r.to, r.how, r.score || '', r.sure ? '' : 'yes', r.title].map((c) => (/[",]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(','))].join('\n') + '\n');

  const count = (how) => all.filter((r) => r.how === how).length;
  console.log(`redirects: ${oldPages.length} old page${oldPages.length === 1 ? '' : 's'} (${oldPaths.length ? 'sitemap' : 'crawl'}), ${newPages.length} new`);
  console.log(`  same path ${count('same')}, kept from the file ${count('kept')}, same slug ${count('slug')}, similar ${count('similar')}, its section ${count('parent')}, home page ${count('home')}`);
  const look = all.filter((r) => !r.sure);
  if (look.length) console.log(`\nneeds a look (${look.length}): edit the row in ${path.relative(process.cwd(), mapFile)}, then re-run\n${look.map((r) => `  ${r.from} → ${r.to}  (${r.how}${r.score ? ` ${r.score}%` : ''}${r.title ? `, "${r.title}"` : ''})`).join('\n')}`);
  console.log(`\nwrote ${path.relative(process.cwd(), mapFile)} (${all.filter((r) => key(r.from) !== key(r.to)).length} redirects${exportCsv ? ', merged with the export' : ''}) and ${path.relative(process.cwd(), review)}`);
  if (!exportCsv) console.log('Importing replaces every redirect on the site: if it has any, export them first and re-run with --existing <export.csv>.');
}

if (cmd === 'test') {
  const base = (live ? cfg.liveUrl : cfg.stagingUrl)?.replace(/\/$/, '');
  if (!base) { console.error('--live needs "liveUrl" (the custom domain) in webflow-build.config.json.'); process.exit(1); }
  const site = new URL(base).hostname;
  const rows = mapRows();
  const want = new Map(rows.map((r) => [key(normPath(r.from)), r.to]));
  const items = values.file
    ? parseUrlList(fs.readFileSync(path.resolve(values.file), 'utf8'), base).map((url) => ({ url, to: want.get(key(normPath(url))) ?? null }))
    : rows.filter((r) => !isPattern(r.from)).map((r) => ({ url: base + r.from, to: r.to }));
  if (!items.length) { console.error(values.file ? `No URLs in ${values.file}.` : `No redirects in ${path.relative(process.cwd(), mapFile)} (wf:redirects map writes it).`); process.exit(1); }
  const out = [];
  await pool(items, 8, async (it) => {
    const hops = await followHops(it.url);
    out.push({ ...it, hops, problem: judgeHops(hops, { site, to: it.to }) });
  });
  const bad = out.filter((r) => r.problem).sort((a, b) => a.problem.localeCompare(b.problem) || a.url.localeCompare(b.url));
  console.log(`redirects: ${out.length} URL${out.length === 1 ? '' : 's'} on ${base}${values.file ? ` from ${values.file}` : ''}`);
  for (const r of bad) {
    const last = r.hops.at(-1);
    console.log(`  ${r.problem.padEnd(9)} ${r.url.replace(base, '')} → ${last.url.replace(base, '')} (${r.hops.map((h) => h.status).join(' → ')})${r.to != null ? `, want ${r.to}` : ''}`);
  }
  console.log(`\nredirects: ${bad.length} problem${bad.length === 1 ? '' : 's'}`);
  if (bad.length) process.exit(1);
}
