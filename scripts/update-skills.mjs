// Bring this repo's agent skills and template tooling up to date.
//   pnpm update-skills [--ref <tag|branch>] [--repo <owner/repo>] [--dry-run]
//                      [--skills-only] [--from <folder>] [--bench '<json>']
// Downloads the template from GitHub (default: the latest release tag,
// else master; --from uses a local copy of the template instead) and
// brings over four things, listing every change before it writes:
//   1. Skills: .claude/skills is replaced with the template's. Local edits
//      to a skill are overwritten; contribute them to the template instead
//      (webflow-build › rules.md › Contributing).
//   2. Tooling: the files in TOOLING below (the build and the template's
//      own scripts) are replaced. They are the template's, not the site's:
//      a site that changed one sees it in the list and in `git diff`.
//   3. package.json: scripts and devDependencies the template has and this
//      repo lacks are added. Nothing that exists is changed.
//   4. Seeds: files a new feature needs that the site owns afterwards are
//      added once, when missing (the icon font and its import in
//      src/styles.css). They are never overwritten.
// A skill folder that is new also gets its link in the workspace around
// the repo (<Client>/.claude/skills), when that workspace links the others.
// --skills-only does step 1 and the wf:* shortcuts, nothing else.
// Everything else in the repo (src/, loader.html, docs, AGENTS.md) is left
// alone. Review the diff, run pnpm build, then commit.
// A project Bench manages (a "bench" record in .wf-template.json) updates
// from Bench, which passes --from and --bench; without --from (or --repo)
// this stops, so the two never disagree on the version (docs/bench.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const dry = argv.includes('--dry-run');
const skillsOnly = argv.includes('--skills-only');
const from = opt('from');
// Files the template owns in every repo made from it.
const TOOLING = ['build.mjs', 'scripts/update-skills.mjs', 'scripts/phosphor.mjs', 'scripts/check-repo.mjs', 'THIRD-PARTY-NOTICES.md'];
// package.json scripts that belong to the template repo only.
const TEMPLATE_ONLY_SCRIPTS = ['harvest', 'new-project', 'pack-template'];
const metaFile = path.join(root, '.wf-template.json');
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
const bench = benchRecord(opt('bench'));
if (meta.bench && !from && !opt('repo')) {
  console.error(`Bench manages this project's template (${meta.bench.name ?? meta.bench.template} ${meta.bench.version}): update it from Bench.\nOr pass --from <template folder>, or --repo <owner/repo> to update from GitHub instead.`);
  process.exit(1);
}
const repo = opt('repo') ?? meta.template ?? (from && 'local');
if (!repo) {
  console.error('Which template? Pass --repo <owner/repo>, or set "template" in .wf-template.json.');
  process.exit(1);
}

async function gh(p) {
  const res = await fetch(`https://api.github.com/repos/${repo}${p}`, {
    headers: { accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN && { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) },
  });
  if (!res.ok) throw new Error(`GitHub ${p}: ${res.status} ${res.statusText}`);
  return res;
}

let ref = opt('ref');
let commit = 'local';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-skills-'));
let source;
if (from) {
  source = path.resolve(from);
  ref = `local@${JSON.parse(fs.readFileSync(path.join(source, '.wf-template.json'), 'utf8')).version}`;
} else {
  if (!ref) {
    const tags = await (await gh('/tags?per_page=100')).json();
    const parse = (n) => n.slice(1).split('.').map(Number);
    const newer = (a, b) => { const [x, y] = [parse(a), parse(b)]; return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; };
    const versions = tags.map((t) => t.name).filter((n) => /^v\d+\.\d+\.\d+$/.test(n)).sort(newer);
    ref = versions[0] ?? 'master';
  }
  commit = (await (await gh(`/commits/${encodeURIComponent(ref)}`)).json()).sha;
  const tarball = path.join(tmp, 'src.tgz');
  fs.writeFileSync(tarball, Buffer.from(await (await gh(`/tarball/${commit}`)).arrayBuffer()));
  execFileSync('tar', ['-xzf', tarball, '-C', tmp]);
  source = path.join(tmp, fs.readdirSync(tmp).find((d) => fs.statSync(path.join(tmp, d)).isDirectory()));
}
const incoming = path.join(source, '.claude/skills');
const local = path.join(root, '.claude/skills');

const list = (dir) => {
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      e.isDirectory() ? walk(p) : out.push(path.relative(dir, p));
    }
  })(dir);
  return out;
};
const before = new Set(list(local));
const after = new Set(list(incoming));
const changes = [];
for (const f of after) {
  if (!before.has(f)) changes.push(`+ ${f}`);
  else if (!fs.readFileSync(path.join(local, f)).equals(fs.readFileSync(path.join(incoming, f)))) changes.push(`~ ${f}`);
}
for (const f of before) if (!after.has(f)) changes.push(`- ${f}`);

const version = /^v\d/.test(ref) || from ? ref : `${ref}@${commit.slice(0, 7)}`;
console.log(`Template skills ${version} (${repo})`);
console.log(changes.length ? changes.sort().map((c) => '  ' + c).join('\n') : '  already up to date');
if (!dry && changes.length) {
  fs.rmSync(local, { recursive: true, force: true });
  fs.cpSync(incoming, local, { recursive: true });
}
// Tooling: the template's own files.
const same = (x, y) => fs.existsSync(x) && fs.readFileSync(x).equals(fs.readFileSync(y));
const tooling = [];
if (!skillsOnly) {
  for (const f of TOOLING) {
    const [theirs, ours] = [path.join(source, f), path.join(root, f)];
    if (!fs.existsSync(theirs) || same(ours, theirs)) continue;
    tooling.push(`${fs.existsSync(ours) ? '~' : '+'} ${f}`);
    if (!dry) { fs.mkdirSync(path.dirname(ours), { recursive: true }); fs.copyFileSync(theirs, ours); }
  }
  if (tooling.length) console.log(`Tooling ${dry ? 'to replace' : 'replaced'}:\n${tooling.map((t) => '  ' + t).join('\n')}`);
}
// package.json: what the template has and this repo lacks.
const pkgFile = path.join(root, 'package.json');
const theirPkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
const missing = (key, keep) => Object.keys(theirPkg[key] ?? {}).filter((k) => keep(k) && !(pkg[key] ?? {})[k]);
const added = missing('scripts', (k) => (skillsOnly ? k.startsWith('wf:') : !TEMPLATE_ONLY_SCRIPTS.includes(k)));
const deps = skillsOnly ? [] : missing('devDependencies', (k) => !(pkg.dependencies ?? {})[k]);
for (const [key, names, what] of [['scripts', added, 'scripts'], ['devDependencies', deps, 'devDependencies (run pnpm install)']]) {
  if (!names.length) continue;
  console.log(`${dry ? 'Would add' : 'Added'} to package.json ${what}: ${names.join(', ')}`);
  pkg[key] = { ...pkg[key], ...Object.fromEntries(names.map((k) => [k, theirPkg[key][k]])) };
}
if (!dry && (added.length || deps.length)) fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
// Seeds: added once, then the site's own.
const seeded = [];
if (!skillsOnly) {
  const iconCss = path.join(root, 'src/phosphor.css');
  const sheet = path.join(root, 'src/styles.css');
  if (!fs.existsSync(iconCss) && fs.existsSync(path.join(source, 'src/phosphor.css')) && fs.existsSync(sheet)) {
    seeded.push('+ src/phosphor.css', '+ src/phosphor/');
    if (!dry) {
      fs.copyFileSync(path.join(source, 'src/phosphor.css'), iconCss);
      fs.cpSync(path.join(source, 'src/phosphor'), path.join(root, 'src/phosphor'), { recursive: true });
    }
    const css = fs.readFileSync(sheet, 'utf8');
    if (!/@import\s+["']\.\/phosphor\.css["']/.test(css)) {
      // An @import has to come before every rule: it goes after the
      // comment the file opens with (and any @import already there).
      const lead = css.match(/^\s*(?:\/\*[\s\S]*?\*\/)?(?:\s+|@(?:charset|import)[^;]*;)*/)[0].length;
      seeded.push('~ src/styles.css (the icon font import)');
      if (!dry) fs.writeFileSync(sheet, css.slice(0, lead) + `/* Icons. An @import has to come before every rule.
   repo-css: third-party — Phosphor icon font; \`pnpm phosphor\` writes the
   file and chooses the weights (\`pnpm phosphor none\` removes them). */
@import "./phosphor.css";

` + css.slice(lead));
    }
  }
  if (seeded.length) console.log(`Seeds ${dry ? 'to add' : 'added'}:\n${seeded.map((t) => '  ' + t).join('\n')}`);
}
// New skills, linked where the workspace links the others.
const wsSkills = path.join(path.dirname(root), '.claude/skills');
const isLink = (p) => { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };
if (fs.existsSync(wsSkills) && fs.readdirSync(wsSkills).some((n) => isLink(path.join(wsSkills, n)))) {
  for (const skill of fs.readdirSync(incoming)) {
    const p = path.join(wsSkills, skill);
    if (fs.existsSync(p) || isLink(p)) continue;
    console.log(`${dry ? 'Would link' : 'Linked'} ../.claude/skills/${skill}`);
    if (!dry) fs.symlinkSync(path.join('..', '..', path.basename(root), '.claude/skills', skill), p, 'dir');
  }
}
if (!dry) {
  // A local copy says nothing about which GitHub repo the template lives in.
  if (!from || opt('repo')) meta.template = repo;
  if (bench) meta.bench = bench;
  meta.skills = { version, commit, updated: new Date().toISOString().slice(0, 10) };
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
  if (changes.length || added.length || deps.length || tooling.length || seeded.length) console.log(`Review the diff${tooling.length || seeded.length ? ', run pnpm build' : ''}, then commit.`);
}
fs.rmSync(tmp, { recursive: true, force: true });

// --bench '<json>': the record Bench keeps of the project's template
// (docs/bench.md › The project record). Written as given, after checking it.
function benchRecord(text) {
  if (text === undefined) return undefined;
  let rec;
  try { rec = JSON.parse(text); } catch { rec = null; }
  if (!rec || typeof rec !== 'object' || !/^(official|(custom|own)\/[a-z0-9-]+)$/.test(rec.template ?? '') || typeof rec.version !== 'string') {
    console.error('--bench takes the JSON record, e.g. \'{"template":"official","name":"Brand Vision","version":"0.10.0","base":"0.10.0"}\'');
    process.exit(1);
  }
  return rec;
}
