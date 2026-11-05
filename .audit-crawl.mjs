// Content audit crawl of staging: text blocks per page, plus meta.
// Run from the regenx repo so @playwright/test resolves.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const ORIGIN = 'https://regen-x.webflow.io';
const START = ['/', '/testosterone-replacement-therapy', '/peptide-therapy', '/enclomiphene', '/about', '/services',
  '/lab-panel', '/medical-catalog', '/contact', '/faq', '/scientific-articles', '/reviews', '/practice-policy',
  '/terms-conditions', '/telemedicine-consent'];
const OUT = process.argv[2];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const seen = new Set(START);
const queue = [...START];
const pages = [];

async function visit(path) {
  const page = await ctx.newPage();
  try {
    const res = await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1500);
    const data = await page.evaluate(() => {
      const skip = (el) => el.closest('.g-nav-w, nav, footer, .g-footer, .footer, script, style, noscript, [aria-hidden="true"]');
      const sel = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,label,button,a,div,span,td,th';
      const blocks = [];
      const used = new Set();
      for (const el of document.querySelectorAll(sel)) {
        if (skip(el)) continue;
        // leaf-ish: no block children with text of their own
        const hasBlockChild = [...el.children].some((c) => /^(H\d|P|LI|DIV|UL|OL|BLOCKQUOTE|TABLE|SECTION)$/.test(c.tagName) && c.textContent.trim());
        if (hasBlockChild) continue;
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        if (!text || used.has(el)) continue;
        let p = el.parentElement; let inside = false;
        while (p) { if (used.has(p)) { inside = true; break; } p = p.parentElement; }
        if (inside) continue;
        used.add(el);
        const section = el.closest('section, [class*="section"]');
        blocks.push({ text, tag: el.tagName.toLowerCase(), cls: el.className?.toString().slice(0, 60) || '',
          section: (section?.className?.toString() || '').slice(0, 60), visible: !!el.getClientRects().length });
      }
      const imgs = [...document.querySelectorAll('img')].filter((i) => !skip(i)).map((i) => ({ src: i.currentSrc || i.src, alt: i.alt }));
      const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
      const meta = {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        robots: document.querySelector('meta[name="robots"]')?.content || '',
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()),
      };
      const deadLinks = [...document.querySelectorAll('a')].filter((a) => !skip(a) && (!a.getAttribute('href') || a.getAttribute('href') === '#')).map((a) => a.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
      return { blocks, imgs, links, meta, deadLinks };
    });
    pages.push({ path, status: res?.status(), ...data, links: undefined });
    for (const href of data.links) {
      if (!href || !href.startsWith('/') || href.startsWith('//')) continue;
      const clean = href.split('#')[0].split('?')[0];
      if (!clean || seen.has(clean)) continue;
      if (/^\/(product|insight|faqs|category|sub-category|text-testimonials|video-testimonials)\//.test(clean) || START.includes(clean)) {
        seen.add(clean); queue.push(clean);
      }
    }
  } catch (e) {
    pages.push({ path, error: String(e).slice(0, 200) });
  } finally { await page.close(); }
}

while (queue.length) {
  const batch = queue.splice(0, 6);
  await Promise.all(batch.map(visit));
  process.stderr.write(`${pages.length} done, ${queue.length} queued\n`);
}
await browser.close();
writeFileSync(OUT, JSON.stringify(pages));
console.log('pages', pages.length);
