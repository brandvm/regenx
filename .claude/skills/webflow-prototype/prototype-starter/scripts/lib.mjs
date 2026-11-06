// Shared helpers for the prototype's scripts: the repo's config, the
// prototype's pages and address, and a browser.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A file found walking up from the prototype, looking one level into each
// folder on the way: the workspace holds the repo next to this folder
// (<Client>/prototype and <Client>/wf-<client>/), like scripts/skill.mjs.
export function findNear(rel) {
  for (let dir = root; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, rel))) return path.join(dir, rel);
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { /* unreadable: skip */ }
    for (const e of entries) {
      if (!(e.isDirectory() || e.isSymbolicLink()) || e.name.startsWith('.') || e.name === 'node_modules' || path.join(dir, e.name) === root) continue;
      const p = path.join(dir, e.name, rel);
      if (fs.existsSync(p)) return p;
    }
    if (dir === path.dirname(dir)) return null;
  }
}

// The repo's webflow-build.config.json (stagingUrl, prototypeUrl, widths…),
// or {} when there is none (a prototype copied on its own).
export function config() {
  const file = findNear('webflow-build.config.json');
  if (!file) return {};
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  cfg.file = file;
  cfg.repoDir = path.resolve(path.dirname(file), cfg.repoDir ?? '.');
  return cfg;
}

// Flags with a value (--max 50) and positional arguments.
export function args(valued = []) {
  const argv = process.argv.slice(2);
  const flags = new Set(); const values = {}; const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (valued.includes(a)) { values[a.slice(2)] = argv[++i]; flags.add(a); }
    else if (a.startsWith('--')) flags.add(a);
    else pos.push(a);
  }
  return { flags, values, pos };
}

// Every page of the prototype: each index.html at its Webflow URL.
const SKIP = new Set(['node_modules', 'dist', 'public', 'partials', 'src', 'scripts', 'webflow-snapshot', 'fig']);
export function pages() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'index.html') out.push('/' + path.relative(root, dir).split(path.sep).join('/'));
    }
  })(root);
  return out.map((p) => p.replace(/\/$/, '') || '/').sort();
}

// The widths the checks use: the repo config's, else the template's.
export const widths = (cfg = config()) => cfg.widths ?? [[1440, 900], [820, 1180], [667, 375], [390, 844]];

// The prototype's address: PROTOTYPE_URL, else the dev script's port (the
// project's own, written by pnpm new-project).
export function prototypeUrl() {
  if (process.env.PROTOTYPE_URL) return process.env.PROTOTYPE_URL.replace(/\/$/, '');
  const dev = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts?.dev ?? '';
  return `http://127.0.0.1:${dev.match(/--port\s+(\d+)/)?.[1] ?? 5173}`;
}

const listening = (url) => new Promise((resolve) => {
  const u = new URL(url);
  const s = net.connect(+u.port || 80, u.hostname, () => { s.end(); resolve(true); });
  s.on('error', () => resolve(false));
});

// The dev server: the running one, or one started for this run (stopped
// again by the returned function).
export async function devServer(url = prototypeUrl()) {
  if (await listening(url)) return { url, stop: () => {} };
  const vite = path.join(root, 'node_modules/vite/bin/vite.js');
  if (!fs.existsSync(vite)) throw new Error(`Nothing listens on ${url}, and vite isn't installed: run pnpm install, or start pnpm dev.`);
  const u = new URL(url);
  const child = spawn(process.execPath, [vite, '--host', u.hostname, '--port', u.port, '--strictPort'], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 100 && !(await listening(url)); i++) await new Promise((r) => setTimeout(r, 200));
  if (!(await listening(url))) { child.kill(); throw new Error(`The dev server didn't start on ${url}.`); }
  return { url, stop: () => child.kill() };
}

// Playwright, from wherever it is installed: this folder, the repo the
// config names, or a folder near it (the template repo has it). The
// prototype doesn't install a browser of its own.
export async function chromium() {
  const cfg = config();
  const homes = [root, cfg.repoDir, path.dirname(findNear('node_modules/@playwright/test/package.json') ?? '')]
    .filter(Boolean).map((d) => d.replace(/[/\\]node_modules[/\\]@playwright[/\\]test$/, ''));
  for (const home of homes) {
    for (const name of ['@playwright/test', 'playwright']) {
      try { return createRequire(path.join(home, 'package.json'))(name).chromium; } catch { /* next */ }
    }
  }
  throw new Error('Playwright not found. Run pnpm install in the repo (it has @playwright/test), or pnpm add -D @playwright/test here.');
}

// Output next to the prototype, not in git.
export function outDir(...parts) {
  const dir = path.join(root, '.screens', ...parts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
