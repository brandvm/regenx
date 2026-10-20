import * as esbuild from 'esbuild';
import { rm } from 'node:fs/promises';

const dev = process.argv.includes('--dev');

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
  for (const e of config.entryPoints) {
    console.log('dev → http://localhost:3000/' + e.split('/').pop().replace(/\.ts$/, '.js'));
  }
} else {
  // Start clean so a renamed or removed entry never leaves a stale file in
  // the committed dist/.
  await rm('dist', { recursive: true, force: true });
  await esbuild.build(config);
}