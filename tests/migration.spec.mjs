import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const loader = readFileSync(new URL('../loader.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
const part = (name) => loader.match(new RegExp(`<!-- START ${name}:[\\s\\S]*?-->([\\s\\S]*?)<!-- END ${name} -->`))[1];
const stag = 'https://brandvm.github.io/regenx/';
const dev = 'http://localhost:3000/';
const fixture = `
<style>body{min-height:3000px}.swiper{width:600px}.swiper-slide{width:200px}
[data-h-scroll]{width:300px;overflow:auto}[data-h-scroll-track]{width:900px}
[data-wave-grid]{height:100px}.preloader{position:fixed;inset:0;background:white;z-index:99999}</style>
<div class="preloader"></div><nav class="g-nav-w"></nav><h1 data-amp>Health & Science</h1>
<section data-wave-grid></section><p data-animate-in-text>Hello world</p>
<div data-h-scroll><div data-h-scroll-track>Horizontal content</div></div>
<div class="g-footer-nav"><div class="g-footer-nav-item"><button class="g-footer-nav-title">Links</button><div class="g-footer-nav-list-wrap">Footer links</div></div></div>
<div class="compare-table">${[1,2].map(n=>`<div class="compare-row" data-compare-toggle><div class="compare-label">Row ${n}</div><div class="compare-val-w">Values</div></div>`).join('')}</div>
<form data-form-steps><span data-step-label></span><span data-step-err hidden>Required</span>
<div data-step="1" class="form-pane"><div data-step-required><input type="checkbox" name="choice"></div><button type="button" data-step-next>Next</button></div>
<div data-step="2" class="form-pane"><input name="email" type="email" required><button type="button" data-step-back>Back</button></div></form>
<div class="s-wrapper card-row-carousel"><button class="swiper-prev">Prev</button><button class="swiper-next">Next</button><div class="swiper card-row-slider"><div class="swiper-wrapper">${[1,2,3,4,5,6].map(n=>`<div class="swiper-slide">Slide ${n}</div>`).join('')}</div></div></div>
<div data-video-wrapper><video data-video muted></video><button data-mute-unmute><i class="video-control-icon"></i><i class="video-control-icon"></i></button></div>
`;

async function setup(page, { url='https://regen-x.webflow.io/', embed=true, fail=()=>false, blockedStorage=false, editor=false, duplicate=false }={}) {
  const requests=[];
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', m=>{ if(m.type()==='error' && /\[RegenX\].*failed/.test(m.text())) errors.push(m.text()); });
  if(blockedStorage) await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked');}}));
  const html=`<!doctype html><html><head>${part('HEAD')}</head><body>${embed?part('EMBED'):''}${fixture}<script>window.Webflow={env:()=>${editor},push:fn=>fn()};</script>${part('FOOTER')}${duplicate?part('FOOTER'):''}</body></html>`;
  await page.route('**/*', async route=>{
    const req=route.request(); const u=req.url();
    requests.push(u);
    if(req.isNavigationRequest()) return route.fulfill({contentType:'text/html',body:html});
    if(fail(u)) return route.abort();
    if(u.startsWith(stag)||u.startsWith(dev)) {
      const asset = new URL(u).pathname;
      if(asset.endsWith('styles.css')) return route.fulfill({contentType:'text/css',body:css});
      if(asset.endsWith('index.js')) return route.fulfill({contentType:'text/javascript',body:js});
    }
    return route.fulfill({contentType:u.includes('.css')?'text/css':'text/javascript',body:''});
  });
  await page.goto(url);
  return { requests, errors };
}

for(const [name,url,base] of [
  ['staging','https://regen-x.webflow.io/',stag],
  ['local flag','https://regen-x.webflow.io/?bv-dev=1',dev],
  ['localhost document','http://localhost:3000/fixture',dev],
]) test(`${name} loads the bundle and matching CSS`,async({page})=>{
  const {requests,errors}=await setup(page,{url});
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  expect(await page.evaluate(()=>window.BV.source)).toBe(base);
  expect(await page.locator('#bv-css').getAttribute('href')).toContain(base);
  expect(requests.filter(u=>u.startsWith(base)&&u.includes('index.js'))).toHaveLength(1);
  expect(await page.evaluate(()=>typeof window.lenis.raf)).toBe('function');
  await expect(page.locator('.preloader')).toBeHidden();
  await expect(page.locator('.amp')).toHaveText('&');
  expect(errors).toEqual([]);
});

for(const asset of ['styles.css','index.js']) test(`local ${asset} failure falls back with staging CSS`,async({page})=>{
  const {errors}=await setup(page,{url:'https://regen-x.webflow.io/?bv-dev=1',fail:u=>u.startsWith(dev)&&u.includes(asset)});
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  expect(await page.evaluate(()=>window.BV.source)).toBe(stag);
  await expect(page.locator('#bv-css')).toHaveAttribute('href',new RegExp('^'+stag));
  expect(await page.locator('link[href^="http://localhost"]').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('missing canvas embed still gets CSS and JS',async({page})=>{
  const {errors}=await setup(page,{embed:false});
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  await expect(page.locator('#bv-css')).toHaveAttribute('href',new RegExp('^'+stag));
  expect(errors).toEqual([]);
});

test('blocked storage preserves explicit local URL choice',async({page})=>{
  await setup(page,{url:'https://regen-x.webflow.io/?bv-dev=1',blockedStorage:true});
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  expect(await page.evaluate(()=>window.BV.source)).toBe(dev);
});

test('dev choice persists and bv-dev=0 clears it',async({page})=>{
  await setup(page,{url:'https://regen-x.webflow.io/?bv-dev=1'});
  await page.goto('https://regen-x.webflow.io/');
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  expect(await page.evaluate(()=>window.BV.source)).toBe(dev);
  await page.goto('https://regen-x.webflow.io/?bv-dev=0');
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  expect(await page.evaluate(()=>window.BV.source)).toBe(stag);
});

test('unavailable bundles release the page and preloader',async({page})=>{
  await setup(page,{fail:u=>u.startsWith(stag)||u.startsWith(dev)});
  await expect(page.locator('html')).toHaveClass(/rgx-load-failed/);
  await expect(page.locator('html')).not.toHaveClass(/is-loading/);
  await expect(page.locator('.preloader')).toBeHidden();
});

test('head watchdog releases without a footer or load event',async({page})=>{
  await page.clock.install();
  await page.route('**/*', route=>route.fulfill({body:''}));
  await page.setContent('<html><head>'+part('HEAD')+'</head><body><div class="preloader"></div></body></html>');
  await expect(page.locator('html')).toHaveClass(/is-loading/);
  await page.clock.fastForward(8100);
  await expect(page.locator('html')).not.toHaveClass(/is-loading/);
  await expect(page.locator('.preloader')).toBeHidden();
});

test('unconfigured production never boots a staging script',async({page})=>{
  const {requests}=await setup(page,{url:'https://regenx.example/?bv-dev=1'});
  await expect(page.locator('html')).toHaveClass(/rgx-load-failed/);
  expect(requests.some(u=>u.includes('index.js'))).toBe(false);
});

test('duplicate footer does not double initialize',async({page})=>{
  const {requests,errors}=await setup(page,{duplicate:true});
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  expect(requests.filter(u=>u.includes('index.js'))).toHaveLength(1);
  expect(await page.locator('[data-wave-grid] canvas').count()).toBe(1);
  expect(errors).toEqual([]);
});

test('editor skips runtime effects',async({page})=>{
  await setup(page,{editor:true});
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  expect(await page.locator('[data-wave-grid] canvas').count()).toBe(0);
  expect(await page.evaluate(()=>typeof window.lenis?.raf)).toBe('undefined');
});

test('mobile interactions and responsive Lenis remain working',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const {errors}=await setup(page);
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  await expect(page.locator('[data-h-scroll]')).toHaveClass(/lenis/);
  await page.locator('.g-footer-nav-title').click();
  await expect(page.locator('.g-footer-nav-title')).toHaveAttribute('aria-expanded','true');
  await page.locator('.compare-label').nth(1).click();
  await expect(page.locator('.compare-row').nth(1)).toHaveClass(/is-open/);
  await expect(page.locator('.compare-row').nth(0)).not.toHaveClass(/is-open/);
  await expect(page.locator('[data-step-next]')).toBeDisabled();
  await page.locator('input[type=checkbox]').check();
  await page.locator('[data-step-next]').click();
  await expect(page.locator('[data-step-label]')).toHaveText('Step 2 of 2');
  await page.locator('[data-step-back]').click();
  await expect(page.locator('[data-step-label]')).toHaveText('Step 1 of 2');
  await expect.poll(()=>page.evaluate(()=>document.querySelector('.swiper').swiper?.activeIndex)).toBe(0);
  await page.locator('.swiper-next').click();
  await expect.poll(()=>page.evaluate(()=>document.querySelector('.swiper').swiper.activeIndex)).toBe(1);
  await page.locator('[data-mute-unmute]').click();
  await expect(page.locator('[data-mute-unmute]')).toHaveAttribute('aria-label','Mute video');
  await page.setViewportSize({width:1440,height:900});
  await expect(page.locator('[data-h-scroll]')).not.toHaveClass(/lenis/);
  expect(errors).toEqual([]);
});

test('existing Webflow GSAP and plugins retain their identity',async({page})=>{
  const native = ['gsap','ScrollTrigger','SplitText'].map(name=>
    readFileSync(new URL(`../node_modules/gsap/dist/${name}.js`,import.meta.url),'utf8')
  ).join('\n;\n');
  await page.addInitScript({content:native+';window.__nativeGSAP=window.gsap;window.__nativeST=window.ScrollTrigger;window.__nativeSplit=window.SplitText;'});
  const {errors}=await setup(page);
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  expect(await page.evaluate(()=>({
    gsap:window.gsap===window.__nativeGSAP,
    scrollTrigger:window.ScrollTrigger===window.__nativeST,
    splitText:window.SplitText===window.__nativeSplit,
    instances:window.gsapVersions.length,
  }))).toEqual({gsap:true,scrollTrigger:true,splitText:true,instances:1});
  expect(errors).toEqual([]);
});

test('environment switcher changes modes while preserving the current URL',async({page})=>{
  const {errors}=await setup(page,{url:'https://regen-x.webflow.io/services?tab=peptide#products'});
  await page.getByRole('button',{name:'Choose environment (Staging)'}).click();
  await expect(page.getByRole('button',{name:'Staging',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Dev',exact:true}).click();
  await expect(page).toHaveURL('https://regen-x.webflow.io/services?tab=peptide&bv-dev=1#products');
  await expect(page.getByRole('button',{name:'Choose environment (Dev)'})).toBeVisible();
  expect(await page.evaluate(()=>window.BV.source)).toBe(dev);
  await page.getByRole('button',{name:'Choose environment (Dev)'}).click();
  await page.getByRole('button',{name:'Staging',exact:true}).click();
  await expect(page).toHaveURL('https://regen-x.webflow.io/services?tab=peptide&bv-dev=0#products');
  await expect(page.getByRole('button',{name:'Choose environment (Staging)'})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('bv-dev'))).toBe('0');
  expect(errors).toEqual([]);
});

test('environment switcher supports keyboard dismissal and outside clicks',async({page})=>{
  await setup(page);
  const launcher=page.getByRole('button',{name:'Choose environment (Staging)'});
  await launcher.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Staging',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(launcher).toBeFocused();
  await expect(page.getByRole('group',{name:'Code environment'})).toBeHidden();
  await launcher.click();
  await page.locator('h1').click();
  await expect(launcher).toBeVisible();
  await expect(page.getByRole('group',{name:'Code environment'})).toBeHidden();
});

test('environment switcher reflects local fallback and can clear the dev preference',async({page})=>{
  await setup(page,{url:'https://regen-x.webflow.io/?bv-dev=1',fail:u=>u.startsWith(dev)});
  await page.getByRole('button',{name:'Choose environment (Staging)'}).click();
  await expect(page.getByRole('status')).toHaveText('Dev unavailable · using staging');
  await expect(page.getByRole('button',{name:'Staging',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Staging',exact:true}).click();
  await expect(page).toHaveURL('https://regen-x.webflow.io/?bv-dev=0');
  await page.getByRole('button',{name:'Choose environment (Staging)'}).click();
  await expect(page.getByRole('status')).toBeHidden();
});

test('environment selection works without browser storage',async({page})=>{
  await setup(page,{blockedStorage:true});
  await page.getByRole('button',{name:'Choose environment (Staging)'}).click();
  await page.getByRole('button',{name:'Dev',exact:true}).click();
  await expect(page.getByRole('button',{name:'Choose environment (Dev)'})).toBeVisible();
  expect(await page.evaluate(()=>window.BV.source)).toBe(dev);
});

for(const [label,url,editor] of [
  ['production','https://regenx.example/',false],
  ['localhost','http://localhost:3000/fixture',false],
  ['editor','https://regen-x.webflow.io/',true],
]) test(`environment switcher is absent on ${label}`,async({page})=>{
  await setup(page,{url,editor});
  // Production's loader is deliberately unconfigured; still exercise the guard
  // with an explicitly loaded bundle, as a future production release would.
  if(label==='production') await page.addScriptTag({content:js});
  await expect(page.locator('html')).toHaveClass(/rgx-ready/);
  await expect(page.locator('#rgx-environment')).toHaveCount(0);
});
