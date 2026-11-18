'use strict';
// Read-only application QA for Chrome's usual 980px desktop layout viewport.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const repo = path.resolve(__dirname, '..');
const out = path.resolve(process.env.MIR_DESKTOP_MODE_OUT || path.join(repo, 'docs/verification/particuliers-desktop-mode-20261118'));
const baseline = '8760134';
const onlyTransition = process.env.MIR_DESKTOP_MODE_CHECKS === 'transition';
const locales = ['fr-CA', 'en-CA'];
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const report = { baseline, generatedAt: new Date().toISOString(), checks: [], captures: [], blocked: [], errors: [] };
const labels = { 'fr-CA': ['Trouver mon inspiration','Choisir mes matériaux','Visualiser mon projet en 3D','Demander une estimation'], 'en-CA': ['Find my inspiration','Choose my materials','Visualize my project in 3D','Request an estimate'] };
function gitFile(file) { return execFileSync('git', ['show', baseline + ':dist/' + file], { cwd: repo, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore','pipe','ignore'] }); }
async function server(fromGit) {
  const cache = new Map();
  const s = http.createServer((req,res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://local').pathname).replace(/^\/+/, '');
    const file = path.resolve(repo, 'dist', name);
    if (req.method !== 'GET' || !file.startsWith(path.join(repo,'dist') + path.sep)) return res.writeHead(405).end();
    try {
      if (!cache.has(name)) cache.set(name, fromGit ? gitFile(name) : fs.readFileSync(file));
      res.writeHead(200, { 'cache-control': 'no-store', 'content-type': ({ '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.webp':'image/webp', '.avif':'image/avif', '.woff2':'font/woff2' })[path.extname(name)] || 'application/octet-stream' });
      res.end(cache.get(name));
    } catch { res.writeHead(404).end(); }
  });
  s.listen(0,'127.0.0.1'); await once(s,'listening');
  return { origin:'http://127.0.0.1:' + s.address().port, close:()=>new Promise(resolve=>s.close(resolve)), cache };
}
async function ready(p) {
  await p.waitForFunction(()=>!!window.MIRClientLocale && !!window.MIRPrestige);
  await p.evaluate(async()=>{ await document.fonts.ready; await Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); });
  await p.mouse.move(0,0);
}
async function open(browser, srv, size, locale) {
  const c = await browser.newContext({ viewport:size, deviceScaleFactor:1, hasTouch:true, isMobile:false, reducedMotion:'reduce', locale:'fr-CA', serviceWorkers:'block' });
  await c.addInitScript(lang=>{ if(!sessionStorage.getItem('qa-seeded')) { localStorage.setItem('mir-client-locale-v1',lang); sessionStorage.setItem('qa-seeded','1'); } },locale);
  await c.route('**/*',route=>{ const req=route.request(); if(new URL(req.url()).origin===srv.origin && req.method()==='GET') return route.continue(); report.blocked.push({url:req.url(),method:req.method()}); return route.abort(); });
  const p=await c.newPage(); p.setDefaultTimeout(12000); p.on('pageerror',e=>report.errors.push({size,locale,message:e.message}));
  await p.goto(srv.origin+'/maison.html'); await ready(p); return {c,p};
}
async function shot(p,name) {
  await ready(p); const file=path.join(out,name+'.png'); await p.screenshot({path:file,animations:'disabled',caret:'hide'});
  const item={file:path.basename(file),sha256:sha(fs.readFileSync(file))}; report.captures.push(item); return item;
}
async function check(name,fn) {
  try { const detail=await fn(); report.checks.push({name,passed:true,detail}); console.log('PASS '+name); }
  catch(e) { report.checks.push({name,passed:false,error:e.stack}); console.error('FAIL '+name+': '+e.message); }
}
async function layout(p, locale, expectedNavHidden = true) {
  const data=await p.evaluate(()=>{
    const r=el=>{ const x=el.getBoundingClientRect(); return {x:x.x,y:x.y,width:x.width,height:x.height,right:x.right,bottom:x.bottom}; };
    const visual=document.querySelector('.mir-pc-visual'),pane=document.querySelector('.mir-pc-actions-pane');
    const text=[];
    for(const root of [visual,pane]) {
      const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n;
      while(n=walk.nextNode()) { if(!n.textContent.trim())continue; const range=document.createRange(); range.selectNodeContents(n); for(const rect of range.getClientRects()) { if(!rect.width||!rect.height)continue; const bound=root.getBoundingClientRect(); text.push({text:n.textContent.trim(),inside:rect.left>=bound.left-1&&rect.right<=bound.right+1&&rect.top>=bound.top-1&&rect.bottom<=bound.bottom+1}); } }
    }
    const selectors=['.mir-prestige-search','.mir-public-cart','.mir-client-locale-switch button[lang="fr-CA"]','.mir-client-locale-switch button[lang="en-CA"]','.mir-public-account-avatar'];
    return {visual:r(visual),pane:r(pane),viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.scrollingElement.scrollWidth,actions:[...document.querySelectorAll('.mir-pc-action')].map(el=>({label:el.querySelector('strong').innerText,rect:r(el)})),header:selectors.map(selector=>({selector,rect:r(document.querySelector('#mir-prestige-header '+selector))})),text,navHidden:document.querySelector('.mir-prestige-nav').hidden,navDisplay:getComputedStyle(document.querySelector('.mir-prestige-nav')).display,localeDisplay:getComputedStyle(document.querySelector('.mir-client-locale-switch')).display};
  });
  assert.equal(data.actions.length,4);
  assert.ok(Math.abs(data.pane.y-data.visual.y)<=1,'photo/pane align at top');
  assert.ok(data.pane.x>=data.visual.right-1,'choices are right of photo');
  assert.ok(Math.abs(data.pane.height-data.visual.height)<=1,'photo and choices share row height');
  assert.ok(data.visual.height>=520&&data.visual.height<=585,'compact 520–584px photo');
  assert.ok(data.scrollWidth<=data.viewport.width,'no horizontal overflow');
  assert.deepEqual(data.actions.map(a=>a.label),labels[locale]);
  for(const a of data.actions) assert.ok(a.rect.x>=data.pane.x&&a.rect.right<=data.pane.right+1&&a.rect.y>=0&&a.rect.bottom<=data.viewport.height,'four actions visible on right');
  assert.deepEqual(data.text.filter(t=>!t.inside),[],'all text fits without clipping');
  for(let i=0;i<data.header.length;i++) { const item=data.header[i]; assert.ok(item.rect.width>0&&item.rect.height>0,'header item visible'); if(i) assert.ok(item.rect.x>=data.header[i-1].rect.right-1,'header order search/cart/FR/EN/avatar'); }
  assert.equal(await p.locator('.mir-client-menu-button').isVisible(),false,'mobile menu hidden');
  assert.equal(await p.locator('.mir-prestige-nav>a:visible').count(),0,'mobile links hidden');
  assert.equal(await p.locator('.mir-mobile-tabs:visible').count(),0,'no mobile bottom menu');
  // CSS display:contents overrides the hidden container without removing its controls.
  assert.equal(data.navHidden,expectedNavHidden,'nav keeps existing menu state while CSS exposes desktop language controls'); assert.equal(data.navDisplay,'contents');
  const languageNames=[];
  for(const lang of ['fr-CA','en-CA']) {
    const button=p.locator('.mir-client-locale-switch button[lang="'+lang+'"]');
    const name=await button.getAttribute('aria-label'); assert.ok(name&&name.length>2);
    assert.equal(await p.getByRole('button',{name,exact:true}).count(),1,'language button exposed to accessibility tree');
    languageNames.push({lang,name});
  }
  data.languageNames=languageNames;
  return data;
}
async function interaction(p, locale, origin) {
  // Begin from the document's initial tab order, without scripting focus onto a target.
  await p.locator('body').click({position:{x:1,y:150}});
  const wanted=['.mir-prestige-search','.mir-public-cart','.mir-client-locale-switch button[lang="fr-CA"]','.mir-client-locale-switch button[lang="en-CA"]','.mir-public-account-avatar'];
  const found=new Set(),states=[];
  for(let i=0;i<30 && found.size<wanted.length;i++) {
    await p.keyboard.press('Tab');
    const state=await p.evaluate(selectors=>{const el=document.activeElement,index=selectors.findIndex(s=>el.matches(s));if(index<0)return null;const cs=getComputedStyle(el);return {index,tag:el.tagName,label:el.getAttribute('aria-label')||el.innerText,focusVisible:el.matches(':focus-visible'),outline:cs.outlineStyle,outlineWidth:cs.outlineWidth,shadow:cs.boxShadow};},wanted);
    if(state){found.add(state.index);states.push(state);assert.ok(state.focusVisible&&(parseFloat(state.outlineWidth)>0&&state.outline!=='none'||state.shadow!=='none'),'visible keyboard focus');}
  }
  assert.equal(found.size,wanted.length,'all header controls reachable through Tab, including languages');
  const opposite=locale==='fr-CA'?'en-CA':'fr-CA';
  await p.locator('.mir-client-locale-switch button[lang="'+opposite+'"]').click();
  await p.waitForFunction(lang=>document.documentElement.lang===lang,opposite);
  assert.equal((await p.locator('.mir-pc-action strong').allInnerTexts())[3],labels[opposite][3]);
  await p.locator('.mir-client-locale-switch button[lang="'+locale+'"]').click();
  await p.waitForFunction(lang=>document.documentElement.lang===lang,locale);
  await p.locator('.mir-pc-action-highlight').click();
  await p.waitForURL(url=>url.origin===origin&&url.pathname==='/estimation.html');
  await p.locator('#estimate-form').waitFor();
  assert.equal(await p.locator('html').getAttribute('lang'),locale,'estimation keeps language');
  const estimate={path:new URL(p.url()).pathname,lang:locale,sendDisabled:await p.locator('#estimate-send').isDisabled()};
  await p.goBack(); await ready(p); assert.equal(await p.locator('html').getAttribute('lang'),locale);
  return {keyboard:states,estimate};
}
async function transition(browser,srv) {
  const {c,p}=await open(browser,srv,{width:960,height:1768},'fr-CA');
  const states=[];
  try {
    await p.locator('.mir-client-locale-switch button[lang="en-CA"]').click();
    await p.waitForFunction(()=>document.documentElement.lang==='en-CA');
    await p.setViewportSize({width:959,height:1768}); await ready(p);
    assert.equal(await p.locator('.mir-client-menu-button').isVisible(),true);
    assert.equal(await p.locator('.mir-client-locale-switch').isVisible(),false);
    await p.locator('.mir-client-menu-button').click();
    await p.locator('.mir-client-locale-switch button[lang="fr-CA"]').click();
    await p.waitForFunction(()=>document.documentElement.lang==='fr-CA');
    states.push({width:959,language:'fr-CA',menuOpenedAndLanguageClicked:true});
    await p.setViewportSize({width:980,height:1768}); await ready(p);
    assert.equal(await p.locator('.mir-client-menu-button').isVisible(),false);
    await p.locator('.mir-client-locale-switch button[lang="en-CA"]').click();
    await p.waitForFunction(()=>document.documentElement.lang==='en-CA');
    await layout(p,'en-CA',false); states.push({width:980,language:'en-CA',directLanguageClick:true});
    await shot(p,'after-transition-960-959-980-en-CA'); return states;
  } finally { await c.close(); }
}
function diff(a,b) {
  const left=PNG.sync.read(fs.readFileSync(path.join(out,a.file))),right=PNG.sync.read(fs.readFileSync(path.join(out,b.file)));
  assert.equal(left.width,right.width); assert.equal(left.height,right.height); let changed=0;
  for(let i=0;i<left.data.length;i+=4) if(left.data[i]!==right.data[i]||left.data[i+1]!==right.data[i+1]||left.data[i+2]!==right.data[i+2]||left.data[i+3]!==right.data[i+3])changed++;
  return {changedPixels:changed,totalPixels:left.width*left.height};
}
async function main() {
  fs.mkdirSync(out,{recursive:true}); const before=await server(true),after=await server(false),browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']}); report.browser=browser.version();
  try {
    if(!onlyTransition) for(const locale of locales) {
      const {c,p}=await open(browser,before,{width:980,height:1768},locale);
      await shot(p,'before-maison-'+locale+'-980x1768');
      report.beforeStacked=await p.evaluate(()=>{const v=document.querySelector('.mir-pc-visual').getBoundingClientRect(),a=document.querySelector('.mir-pc-actions-pane').getBoundingClientRect();return a.top>=v.bottom-1;});
      assert.equal(report.beforeStacked,true,'baseline reproduces the reported stacked layout'); await c.close();
    }
    if(!onlyTransition) for(const width of [960,980,1024,1100]) for(const locale of locales) {
      const {c,p}=await open(browser,after,{width,height:1768},locale);
      await shot(p,'after-maison-'+locale+'-'+width+'x1768');
      await check('desktop-layout-'+width+'-'+locale,()=>layout(p,locale));
      await check('desktop-interactions-'+width+'-'+locale,()=>interaction(p,locale,after.origin));
      await c.close();
    }
    await check('responsive-transition-960-959-980',()=>transition(browser,after));
    if(!onlyTransition) for(const size of [{width:390,height:844},{width:768,height:1024},{width:1280,height:800},{width:1440,height:900},{width:1920,height:1080}]) for(const locale of locales) {
      await check('unchanged-pixels-'+size.width+'-'+locale,async()=>{
        const shots=[];
        for(const [phase,srv]of[['before',before],['after',after]]) {const {c,p}=await open(browser,srv,size,locale);shots.push(await shot(p,phase+'-unchanged-'+locale+'-'+size.width+'x'+size.height));await c.close();}
        const result=diff(...shots);assert.equal(result.changedPixels,0,'no pixel changes outside the scoped breakpoint');return result;
      });
    }
    report.sourceSha256=Object.fromEntries(['maison.html','mir-particuliers-pc.css','mir-prestige.js','mir-client-i18n.js','assets/mir-particuliers-maison-approuvee.webp'].map(f=>[f,{before:sha(gitFile(f)),after:sha(fs.readFileSync(path.join(repo,'dist',f)))}]));
    assert.equal(report.errors.length,0,'no page errors');
  } finally {
    report.passed=report.checks.every(c=>c.passed)&&report.errors.length===0;
    fs.writeFileSync(path.join(out,onlyTransition?'transition-follow-up.json':'results.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();await before.close();await after.close();
  }
  assert.ok(report.passed,'inspect results.json');
  console.log('PASS '+report.checks.length+' groups, '+report.captures.length+' captures; local GET only');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
