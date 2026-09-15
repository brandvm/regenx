// Read-only integration check: replace the old code in intercepted HTML in this
// browser only. Nothing is written to Webflow or GitHub Pages.
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const loader = await readFile(new URL('../loader.html', import.meta.url), 'utf8');
const bundle = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
const part = name => loader.match(new RegExp(`<!-- START ${name}:[\\s\\S]*?-->([\\s\\S]*?)<!-- END ${name} -->`))[1];
const site = 'https://regen-x.webflow.io';
const local = process.argv.includes('--local');
const selectedPaths = process.argv.slice(2).filter(arg => arg.startsWith('/'));
const paths = selectedPaths.length ? selectedPaths : ['/', '/services', '/about', '/contact', '/reviews', '/medical-catalog', '/testosterone-replacement-therapy'];
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
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().startsWith('[RegenX]')) errors.push(msg.text());
      });
      await page.route('**/*', async route => {
        const request = route.request();
        const url = request.url();
        if (request.isNavigationRequest() && url.startsWith(site)) {
          const response = await route.fetch();
          let html = await response.text();
          assert.match(html, /data-wf-site="6a343f4bd4c8ed2f7270a980"/);
          html = html.replace(/<!-- Global \| Webflow Head Custom Code \| Start -->[\s\S]*?<!-- Global \| Webflow Head Custom Code \| End -->/, part('HEAD'));
          html = html.replace(/<link[^>]*href="https:\/\/cdn\.jsdelivr\.net\/npm\/remixicon[^>]*>/g, '');
          html = html.replace(/<link[^>]*href="https:\/\/8n3dq9\.csb\.app\/RegenX\/regenx-main\.css"[^>]*>/, part('EMBED'));
          html = html.replace(/<script[^>]*src="https:\/\/unpkg.com\/lenis[^>]*><\/script>/, '');
          html = html.replace(/<script>\s*let lenis, hLenis = null;[\s\S]*?<\/script>/, '');
          html = html.replace(/<script[^>]*src="https:\/\/8n3dq9\.csb\.app\/RegenX\/regenx-(?:main|wave)\.js"[^>]*><\/script>/g, '');
          html = html.replace('</body>', '<script>window.__originalGSAP=window.gsap;window.__originalST=window.ScrollTrigger;</script>'+part('FOOTER')+'</body>');
          return route.fulfill({ response, body: html });
        }
        if (url.startsWith('https://brandvm.github.io/regenx/')) {
          if (url.includes('styles.css')) return route.fulfill({ contentType: 'text/css', body: css });
          if (url.includes('index.js')) return route.fulfill({ contentType: 'text/javascript', body: bundle });
        }
        if (url.startsWith('http://localhost:3000/')) return local ? route.continue() : route.abort();
        // No analytics or large video downloads are needed for this layout/runtime check.
        if (url.includes('analytics.ahrefs.com') || request.resourceType() === 'media') return route.abort();
        return route.continue();
      });
      await page.goto(site+path+(local ? '?bv-dev=1' : ''), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__RGX_BOOTED && document.documentElement.classList.contains('rgx-ready'));
      const state = await page.evaluate(() => ({
        booted: window.__RGX_BOOTED,
        source: window.BV.source,
        locked: document.documentElement.classList.contains('is-loading'),
        lenis: typeof window.lenis?.raf === 'function',
        gsapShared: window.__originalGSAP === window.gsap,
        scrollTriggerShared: window.__originalST === window.ScrollTrigger,
        scale: getComputedStyle(document.documentElement).getPropertyValue('--size-container-ideal').trim(),
        waveSections: document.querySelectorAll('[data-wave-grid]').length,
        waveCanvases: document.querySelectorAll('[data-wave-grid] canvas').length,
        sliders: [...document.querySelectorAll('.swiper')].filter(el => el.swiper).length,
        codeSandboxReferences: [...document.querySelectorAll('script[src],link[href]')].filter(el=>(el.src||el.href).includes('8n3dq9.csb.app')).length,
      }));
      const record = { width, path, ...state, errors };
      results.push(record);
      console.log(JSON.stringify(record));
      if (path === '/') await page.screenshot({ path: `${output}/home-${width}.png`, animations: 'disabled' });
      assert.equal(state.source, local ? 'http://localhost:3000/' : 'https://brandvm.github.io/regenx/');
      assert.equal(state.locked, false);
      assert.equal(state.lenis, true);
      assert.equal(state.gsapShared, true);
      assert.equal(state.scrollTriggerShared, true);
      assert.equal(state.waveSections, state.waveCanvases);
      assert.equal(state.codeSandboxReferences, 0);
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2)+'\n');
  await browser.close();
}
