// Phosphor Icons, bundled into the stylesheet as an icon font.
//   pnpm phosphor                    regular (the default the template ships)
//   pnpm phosphor regular bold fill  the weights a site's design uses
//   pnpm phosphor none               remove the icons from the bundle
//   pnpm phosphor --subset [weights] only the icons the site uses (below)
// Weights: thin, light, regular, bold, fill, duotone.
// Downloads the pinned version's stylesheet and .woff2 for each weight and
// writes src/phosphor.css and src/phosphor/*.woff2. Both are committed;
// `pnpm build` copies the fonts to dist/fonts/. Nothing is installed: the
// package is ~46 MB and only two files per weight are needed.
// --subset keeps only the icons named in src/**, in phosphor.icons (one name
// per line, # comments), in --icons a,b,c and, with --from <url>, in the
// class attributes of every page in that site's sitemap.xml. The font is cut
// down to those glyphs (a few KB) and inlined into src/phosphor.css as a data
// URL, so there is no font request at all. An icon added later shows nothing
// until the script is run again; the recipe has the trade-off.
// In Webflow an icon is an element whose class comes from a prop:
//   <i class="ph ph-arrow-right"></i>      regular
//   <i class="ph-bold ph-arrow-right"></i> bold (after `pnpm phosphor regular bold`)
// Names: https://phosphoricons.com. The recipe is in
// .claude/skills/webflow-build/recipes/phosphor/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '2.1.2';
const WEIGHTS = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1] ?? ''; };
const subset = args.includes('--subset');
if (subset) args.splice(args.indexOf('--subset'), 1);
const listed = flag('--icons');
const from = flag('--from');
if ((listed !== null || from !== null) && !subset) { console.error('--icons and --from only apply with --subset.'); process.exit(1); }
if (from === '') { console.error('--from needs the site URL, e.g. --from https://example.com'); process.exit(1); }
const want = args.length ? args : ['regular'];
const dir = path.join(root, 'src/phosphor');
const cssFile = path.join(root, 'src/phosphor.css');

if (want.length === 1 && want[0] === 'none' && !subset) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.writeFileSync(cssFile, '/* repo-css: third-party — Phosphor Icons are not bundled on this site (pnpm phosphor regular adds them). */\n');
  console.log('phosphor: removed from the bundle. Run pnpm build.');
  process.exit(0);
}
const bad = want.filter((w) => !WEIGHTS.includes(w));
if (bad.length) { console.error(`Unknown weight: ${bad.join(', ')}. Choose from ${WEIGHTS.join(', ')}.`); process.exit(1); }

// Icon names wanted by --subset, with where each came from (for the typo
// warning). A name is the part after `ph-` in a class; weight classes
// (ph-bold) are not names and are dropped against the stylesheet later.
const names = new Map();
const add = (name, source) => { if (!names.has(name)) names.set(name, source); };
const classNames = (text) => text.match(/(?<![\w-])ph-[a-z0-9]+(?:-[a-z0-9]+)*/g)?.map((c) => c.slice(3)) ?? [];
if (subset) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (p === dir || p === cssFile) return [];
    return e.isDirectory() ? walk(p) : [p];
  });
  for (const f of walk(path.join(root, 'src'))) for (const n of classNames(fs.readFileSync(f, 'utf8'))) add(n, path.relative(root, f));
  const iconsFile = path.join(root, 'phosphor.icons');
  if (fs.existsSync(iconsFile)) {
    for (const line of fs.readFileSync(iconsFile, 'utf8').split('\n')) {
      const n = line.replace(/#.*/, '').trim().replace(/^ph-/, '');
      if (n) add(n, 'phosphor.icons');
    }
  }
  for (const n of (listed ?? '').split(',')) if (n.trim()) add(n.trim().replace(/^ph-/, ''), '--icons');
  if (from) await crawl(from);
}

const base = `https://cdn.jsdelivr.net/npm/@phosphor-icons/web@${VERSION}`;
const get = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r; };
const { default: subsetFont } = subset ? await import('subset-font') : {};
const parts = [];
const fonts = [];
const used = new Set();
for (const w of want) {
  let css = await (await get(`${base}/src/${w}/style.css`)).text();
  const file = css.match(/url\("\.\/([\w-]+)\.woff2"\)/)?.[1];
  if (!file) throw new Error(`No .woff2 in the ${w} stylesheet`);
  let font = Buffer.from(await (await get(`${base}/src/${w}/${file}.woff2`)).arrayBuffer());
  let src = `url("./phosphor/${file}.woff2")`;
  if (subset) {
    // One rule per icon (duotone has a :before and an :after): keep the
    // wanted ones and collect their code points for the subsetter.
    const points = [];
    css = css.replace(/^\.ph[\w-]*\.ph-([a-z0-9-]+):(?:before|after) \{[^}]*\}\n/gm, (rule, name) => {
      if (!names.has(name)) return '';
      used.add(name);
      points.push(...[...rule.matchAll(/content: "\\([0-9a-f]+)"/g)].map((m) => parseInt(m[1], 16)));
      return rule;
    });
    // No layout features: the stylesheet draws each glyph by code point, and
    // the ligatures (icon names typed as text) would pull in every glyph.
    font = await subsetFont(font, String.fromCodePoint(...points), { targetFormat: 'woff2', keepFeatures: [], noLayoutClosure: true });
    src = `url("data:font/woff2;base64,${font.toString('base64')}")`;
  } else {
    fonts.push([`${file}.woff2`, font]);
  }
  // woff2 only: every browser this template targets reads it, and the other
  // formats (the SVG font is megabytes) would be copied into dist/ too.
  parts.push(`/* ${w} */\n` + css.replace(/src:\s*url\("\.\/[\w-]+\.woff2"\) format\("woff2"\)[\s\S]*?;/, () => `src: ${src} format("woff2");`).trim());
}
if (subset) {
  const unknown = [...names].filter(([n]) => !used.has(n) && !WEIGHTS.includes(n));
  for (const [n, source] of unknown) console.warn(`phosphor: no icon "${n}" (from ${source}): a typo, or a class that is not an icon.`);
  if (!used.size) { console.error('phosphor --subset: no icon names found. Name them with --icons, phosphor.icons or --from <site>.'); process.exit(1); }
}

fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
for (const [file, font] of fonts) fs.writeFileSync(path.join(dir, file), font);
fs.writeFileSync(path.join(dir, 'LICENSE'), await (await get(`${base}/LICENSE`)).text());
const icons = [...used].sort();
// The default header is unchanged from earlier versions, so a repo that
// re-runs `pnpm phosphor` gets a byte-identical file.
const how = subset
  ? `   GENERATED by \`pnpm phosphor --subset\`: do not edit. Only these ${icons.length} icons
   are in the font (inlined below); run the script again after adding one:
${icons.join(' ').replace(/(.{1,72})(?: |$)/g, '   $1\n').trimEnd()}
   An icon is an element with the classes "ph ph-<name>" (bold: "ph-bold ph-<name>"). */`
  : `   GENERATED by \`pnpm phosphor\`: do not edit. An icon is an element with
   the classes "ph ph-<name>" (bold: "ph-bold ph-<name>"). */`;
fs.writeFileSync(cssFile, `/* repo-css: third-party — Phosphor Icons ${VERSION} (${want.join(', ')}), MIT licence in src/phosphor/.
${how}
${parts.join('\n\n')}
`);
console.log(`phosphor ${VERSION}: ${want.join(', ')}${subset ? `, ${icons.length} icons` : ''} → src/phosphor.css (${Math.round(fs.statSync(cssFile).size / 1024)} KB) and src/phosphor/. Run pnpm build.`);

// Icon classes on the published site: every page in its sitemap.xml (the
// given page alone when there is none), same origin only.
async function crawl(url) {
  const site = new URL(url);
  let pages = [site.href];
  const map = await fetch(new URL('/sitemap.xml', site)).catch(() => null);
  if (map?.ok) {
    const locs = [...(await map.text()).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    pages = [...new Set([site.href, ...locs.filter((l) => URL.canParse(l) && new URL(l).origin === site.origin)])];
  }
  let done = 0;
  const queue = [...pages];
  const worker = async () => {
    for (let page; (page = queue.shift()); ) {
      const r = await fetch(page).catch(() => null);
      if (!r?.ok) { console.warn(`phosphor: ${page}: ${r ? r.status : 'unreachable'}`); continue; }
      for (const m of (await r.text()).matchAll(/\sclass="([^"]*)"/g)) for (const n of classNames(m[1])) add(n, new URL(page).pathname);
      done++;
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`phosphor: read ${done} of ${pages.length} pages on ${site.origin}`);
}
