// Read-only check of the published staging site. Serves this build in place of
// the GitHub Pages assets in this browser only; nothing is written to Webflow or
// GitHub Pages. Also fails when the installed snippets drift from loader.html.
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const loader = await readFile(new URL('../loader.html', import.meta.url), 'utf8');
const bundle = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
const part = name => loader.match(new RegExp(`<!-- START ${name}:[\\s\\S]*?-->([\\s\\S]*?)<!-- END ${name} -->`))[1].trim();
const site = 'https://regen-x.webflow.io';
const local = process.argv.includes('--local');
const selectedPaths = process.argv.slice(2).filter(arg => arg.startsWith('/'));
const paths = selectedPaths.length ? selectedPaths : ['/', '/services', '/about', '/contact', '/reviews', '/medical-catalog', '/testosterone-replacement-therapy', '/peptide-therapy', '/enclomiphene'];
// Webflow publishes the site head and footer verbatim; the embed spans two HTML Embeds.
const snippets = { HEAD: part('HEAD'), FOOTER: part('FOOTER'), ...Object.fromEntries(
  part('EMBED').split(/(?=<script>)/).map((chunk, index) => [`EMBED ${index + 1}`, chunk.trim()])
) };
const browser = await chromium.launch({ channel: 'chromium' });
const results = [];
const output = local ? 'test-results/webflow-local' : 'test-results/webflow';
await mkdir(output, { recursive: true });
try {
  for (const width of [1440, 390]) {
    for (const path of paths) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      if (local) await context.grantPermissions(['local-network-access'], { origin: site });
      const page = await context.newPage();
      const errors = [];
      const localRequests = [];
      let drift = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().startsWith('[RegenX]')) errors.push(msg.text());
      });
      await page.route('**/*', async route => {
        const request = route.request();
        const url = request.url();
        if (request.isNavigationRequest() && url.startsWith(site)) {
          const response = await route.fetch();
          const html = await response.text();
          assert.match(html, /data-wf-site="6a343f4bd4c8ed2f7270a980"/);
          drift = Object.entries(snippets).filter(([, code]) => !html.includes(code)).map(([name]) => name);
          return route.fulfill({ response, body: html });
        }
        if (url.startsWith('https://brandvm.github.io/regenx/')) {
          if (url.includes('styles.css')) return route.fulfill({ contentType: 'text/css', body: css });
          if (url.includes('index.js')) return route.fulfill({ contentType: 'text/javascript', body: bundle });
        }
        if (url.startsWith('http://localhost:3000/')) {
          localRequests.push(url);
          return local ? route.continue() : route.abort();
        }
        // No analytics or large video downloads are needed for this layout/runtime check.
        if (url.includes('analytics.ahrefs.com') || request.resourceType() === 'media') return route.abort();
        return route.continue();
      });
      await page.goto(site+path+(local ? '?bv-dev=1' : '?bv-dev=0'), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__RGX_BOOTED && document.documentElement.classList.contains('rgx-ready'));
      const state = await page.evaluate(() => ({
        booted: window.__RGX_BOOTED,
        source: window.BV.source,
        locked: document.documentElement.classList.contains('is-loading'),
        lenis: typeof window.lenis?.raf === 'function',
        gsap: typeof window.gsap?.to === 'function',
        scale: getComputedStyle(document.documentElement).getPropertyValue('--size-container-ideal').trim(),
        viewportTags: document.querySelectorAll('meta[name="viewport"]').length,
        attributesTags: document.querySelectorAll('script[src*="@finsweet/attributes"]').length,
        waveSections: document.querySelectorAll('[data-wave-grid]').length,
        waveCanvases: document.querySelectorAll('[data-wave-grid] canvas').length,
        sliders: [...document.querySelectorAll('.swiper')].filter(el => el.swiper).length,
      }));
      const record = { width, path, ...state, drift, localRequests: localRequests.length, errors };
      results.push(record);
      console.log(JSON.stringify(record));
      if (path === '/') await page.screenshot({ path: `${output}/home-${width}.png`, animations: 'disabled' });
      assert.equal(state.source, local ? 'http://localhost:3000/' : 'https://brandvm.github.io/regenx/');
      assert.equal(state.locked, false);
      assert.equal(state.lenis, true);
      assert.equal(state.gsap, true);
      assert.equal(state.viewportTags, 1);
      assert.equal(state.attributesTags, 1);
      assert.equal(state.waveSections, state.waveCanvases);
      assert.deepEqual(drift, [], `Installed snippets differ from loader.html on ${path}`);
      if (!local) assert.deepEqual(localRequests, [], `Public page requested localhost on ${path}`);
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2)+'\n');
  await browser.close();
}
