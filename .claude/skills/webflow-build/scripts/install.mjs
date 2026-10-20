// Installed snippets: is what Webflow publishes the repo's loader.html?
//   node install.mjs [/path…] [--live]
// Snippets are not versioned (AGENTS.md): a loader.html change only takes
// effect once it is re-pasted and published, and an old copy keeps running
// until then. For each path (staging; --live: `liveUrl`) it reads the HTML
// as served and the page after load, and reports (exit 1 on any):
//   - drift: a tag of loader.html (head code, Embed 2a, Embed 2b, footer
//     code) that the page doesn't carry as written. Compared without
//     comments or whitespace, with RELEASE, the org/repo names and the
//     2a ?v= number normalised, so a filled-in repo and a released
//     install still match;
//   - a jsDelivr URL pasted with a version other than RELEASE;
//   - Embed 2a (id="wfc-css") missing, more than once, or in <head>;
//   - more than one viewport meta (one from Webflow, one pasted);
//   - more than one Finsweet Attributes script tag (one alone is noted:
//     Finsweet belongs in the bundle, recipes/finsweet/);
//   - any request to localhost, 127.0.0.1 or [::1] from the page (a static
//     dev link left in an Embed: every visitor requests it). Such requests
//     are blocked here, and the dev flag is forced off.
import fs from 'fs';
import path from 'path';
import { loadConfig, args, paths, browser, page, bust } from './lib.mjs';

const cfg = loadConfig();
const { pos, live } = args();
const base = live ? cfg.liveUrl?.replace(/\/$/, '') : cfg.stagingUrl;
if (!base) { console.error('--live needs "liveUrl" (the custom domain) in webflow-build.config.json.'); process.exit(1); }
const loaderFile = path.join(cfg.repoDir, 'loader.html');
if (!fs.existsSync(loaderFile)) { console.error(`No loader.html in ${cfg.repoDir}.`); process.exit(1); }

// The same normalisation on both sides: what is pasted differs from the
// repo copy only in RELEASE (null in the repo), and in ORG/REPO while the
// repo is still the template.
const norm = (s) => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/var RELEASE = [^;]*;/g, 'var RELEASE = null;')
  .replace(/var OWNER = "[^"]*"/g, 'var OWNER = "ORG"')
  .replace(/var SITE = "[^"]*"/g, 'var SITE = "REPO"')
  .replace(/https:\/\/[\w-]+\.github\.io\/[\w.-]+\//g, 'https://ORG.github.io/REPO/')
  // A release pinned in a URL (an older 2a points at jsDelivr) is RELEASE
  // by another name; whether it agrees with RELEASE is checked below.
  .replace(/cdn\.jsdelivr\.net\/gh\/[\w.-]+\/[\w.-]+@[\w.-]+\//g, 'cdn.jsdelivr.net/gh/ORG/REPO@RELEASE/')
  .replace(/(styles\.css)\?v=\d+/g, '$1?v=N')
  .replace(/\s+/g, ' ')
  .replace(/> </g, '><')
  .trim();

// loader.html's pieces: a comment with a "1) Head code"-style line starts
// one; the code after it, up to the next such comment, belongs to it.
const source = fs.readFileSync(loaderFile, 'utf8');
const NAMES = { '1': 'head code', '2': 'Embed 2a', '2b': 'Embed 2b', '3': 'footer code' };
const pieces = [];
for (const part of source.split(/(<!--[\s\S]*?-->)/)) {
  const id = part.startsWith('<!--') && [...part.matchAll(/^(\w+)\) /gm)].pop()?.[1];
  if (id) pieces.push({ name: NAMES[id] ?? `piece ${id}`, tags: [] });
  else if (!part.startsWith('<!--') && pieces.length) pieces.at(-1).tags.push(...[...part.matchAll(/<script\b[\s\S]*?<\/script>|<(?:meta|link)\b[^>]*>/g)].map((m) => norm(m[0])));
}
if (pieces.length !== 4 || pieces.some((p) => !p.tags.length)) { console.error(`loader.html: expected the four pieces (head, 2a, 2b, footer), found ${pieces.map((p) => p.name).join(', ') || 'none'}.`); process.exit(1); }

const b = await browser(cfg);
let problems = 0;
for (const route of paths(cfg, pos)) {
  const url = base + route;
  const p = await page(b, cfg, url, cfg.widths[0], { live: true });
  const local = [];
  await p.route(/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])([:/]|$)/, (r) => { local.push(r.request().url()); r.abort(); });
  const res = await p.goto(bust(url) + '&wfc-dev=0', { waitUntil: 'load' }).catch((e) => ({ error: e }));
  const out = [];
  const say = (msg) => { out.push(`  ${msg}`); problems++; };
  if (res.error || !res.ok()) { say(`page did not load: ${res.error?.message.split('\n')[0] ?? 'HTTP ' + res.status()}`); console.log(`\n${route}\n${out.join('\n')}`); await p.close(); continue; }
  const served = await res.text();
  await p.waitForTimeout(2000);

  const installed = norm(served);
  for (const piece of pieces) {
    const missing = piece.tags.filter((t) => !installed.includes(t));
    if (missing.length) say(`${piece.name} differs from loader.html: ${missing.length} of ${piece.tags.length} tag${piece.tags.length === 1 ? '' : 's'} not found as written (first: ${missing[0].slice(0, 90)}…). Re-paste it from loader.html and publish.`);
  }
  const release = served.match(/var RELEASE = "([^"]+)"/)?.[1];
  const pinned = [...new Set([...served.matchAll(/cdn\.jsdelivr\.net\/gh\/[\w.-]+\/[\w.-]+@([\w.-]+)\//g)].map((m) => m[1]))];
  const stray = pinned.filter((v) => v !== release);
  if (stray.length) say(`a pasted jsDelivr URL pins ${stray.join(', ')} but RELEASE is ${release ?? 'null'}: the release lives in two places (lessons › "VER lives in two snippets"). Point 2a at staging as loader.html does.`);
  const head = served.split(/<\/head>/i)[0];
  const embeds = (served.match(/<link\b[^>]*\bid="wfc-css"[^>]*>/gi) ?? []).length;
  if (!embeds) say('Embed 2a (<link id="wfc-css">) is not on this page: the component holding Embeds 2a and 2b is missing here.');
  else if (embeds > 1) say(`Embed 2a is on this page ${embeds} times: one copy of the component per page.`);
  else if (/\bid="wfc-css"/.test(head)) say('Embed 2a is in head code: the Designer canvas never shows it there. Move it to an Embed in the global component.');
  if (/\bid="wfc-css-dev"/.test(served)) say('a static wfc-css-dev link is installed: remove it before publishing (loader.html piece 2).');

  const dom = await p.evaluate(() => ({
    viewport: document.querySelectorAll('meta[name="viewport"]').length,
    finsweet: [...document.querySelectorAll('script[src*="@finsweet/attributes"]')].map((s) => s.src),
  }));
  if (dom.viewport > 1) say(`${dom.viewport} viewport metas: Webflow writes one; remove the pasted copy.`);
  if (dom.finsweet.length > 1) say(`${dom.finsweet.length} Finsweet Attributes script tags: ${dom.finsweet.join(', ')}. Each loads the library again; bundle it instead (recipes/finsweet/).`);
  else if (dom.finsweet.length) out.push(`  (note) a Finsweet Attributes script tag: ${dom.finsweet[0]}. The template bundles Finsweet (recipes/finsweet/).`);
  for (const u of [...new Set(local)]) say(`requests ${u} from a public page: every visitor's browser tries it. Remove the localhost link or script.`);
  if (p.errors.length) for (const e of [...new Set(p.errors)].slice(0, 5)) out.push(`  (note) ${e.slice(0, 160)}`);
  console.log(`\n${route}\n${out.length ? out.join('\n') : '  installed snippets match loader.html'}`);
  await p.close();
}
await b.close();
console.log(`\ninstall: ${problems} finding${problems === 1 ? '' : 's'} on ${base}`);
if (problems) process.exit(1);
