import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';

const dev = process.argv.includes('--dev');
// --stamp adds the commit and build time to dist/version.json. Only for a
// build that is deployed and never committed (e.g. after CI's dist check):
// a committed dist/ can't contain its own commit, and a time in it would
// fail the check on every build.
const stamp = process.argv.includes('--stamp');
// package.json's version, or 0.0.0 while it has none. Bundled code reads
// it as __WFC_VERSION__.
const version = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8')).version ?? '0.0.0';

const config = {
  entryPoints: ['src/index.ts', 'src/styles.css'],
  bundle: true,
  outdir: 'dist',
  // Icon fonts (src/phosphor/) are copied next to the stylesheet, with a
  // content hash in the name so a new version is never served from cache.
  loader: { '.woff2': 'file' },
  assetNames: 'fonts/[name]-[hash]',
  minify: !dev,
  sourcemap: dev,
  // dist/ is committed and CI fails if it drifts from src/. Dev builds stay
  // in memory (esbuild serves them from there) so `pnpm dev` never leaves
  // unminified files or sourcemaps in dist/ to be committed by accident.
  write: !dev,
  target: 'es2019',
  logLevel: 'info',
  define: { __WFC_VERSION__: JSON.stringify(version) },
  banner: dev
    ? { js: "(() => { try { var u = document.currentScript && document.currentScript.src ? new URL('/esbuild', document.currentScript.src).href : 'http://localhost:3000/esbuild'; new EventSource(u).addEventListener('change', () => location.reload()); } catch (e) {} })();" }
    : {},
};

if (dev) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  // 127.0.0.1 only: the Webflow pages load http://localhost, and nothing on
  // the LAN should reach the dev server.
  await ctx.serve({ servedir: 'dist', host: '127.0.0.1', port: 3000, cors: { origin: '*' } });
  // An entry is a path ('src/index.ts') or { in, out } when the output
  // name differs from the source's.
  for (const e of config.entryPoints) {
    const out = typeof e === 'string' ? e.split('/').pop().replace(/\.[^.]+$/, '') : e.out;
    const src = typeof e === 'string' ? e : e.in;
    console.log(`dev → http://localhost:3000/${out}${src.endsWith('.css') ? '.css' : '.js'}`);
  }
} else {
  // Start clean so a renamed or removed entry never leaves a stale file in
  // the committed dist/.
  await rm('dist', { recursive: true, force: true });
  const { metafile } = await esbuild.build({ ...config, metafile: true });
  // Which build is live: fetch <bundle base>/version.json and compare its
  // hash (of every file in dist/) with a local `pnpm build`. Without
  // --stamp it holds nothing else, so a rebuild of the same src/ is
  // byte-identical and CI's dist check still passes.
  const hash = createHash('sha256');
  for (const file of Object.keys(metafile.outputs).sort()) hash.update(file + '\0').update(await readFile(file));
  // No version field while package.json has none: the hash identifies the build.
  const info = { ...(version !== '0.0.0' && { version }), hash: hash.digest('hex').slice(0, 12) };
  if (stamp) {
    try {
      info.commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {}
    info.built = new Date().toISOString();
  }
  await writeFile('dist/version.json', JSON.stringify(info) + '\n');
}