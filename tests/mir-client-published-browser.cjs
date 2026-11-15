'use strict';
// Inspect the live GitHub Pages client after deployment: no preview flag, no writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const base=(process.env.MIR_PUBLISHED_BASE||'').replace(/\/?$/,'/');
const sha=process.env.GITHUB_SHA||'';
if(!/^https:\/\//.test(base)||!/^[0-9a-f]{40}$/.test(sha))throw Error('Published Pages URL and exact Git SHA required');
(async()=>{
 const bin=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].find(f=>f&&fs.existsSync(f));
 const browser=await chromium.launch({...(bin?{executablePath:bin}:{channel:'chrome'}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 fs.mkdirSync(path.resolve('artifacts'),{recursive:true});
 try{
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'index.html?pr41_sha='+sha,{waitUntil:'domcontentloaded',timeout:60000});
   const selector=page.locator('.mir-client-locale-switch');
   await selector.waitFor({state:'visible',timeout:30000});
   assert.equal(await page.locator('html').getAttribute('lang'),'fr-CA','public French default');
   assert.equal(await selector.locator('button').count(),2,'FR and EN visible publicly');
   const cart=JSON.stringify({version:1,project:'QA fictif, jamais envoyé',items:[{id:'qa',materialId:'QA-MATERIAL',quantity:2}]});
   await page.evaluate(value=>localStorage.setItem('mir-shopping-list-v1',value),cart);
   await page.screenshot({path:'artifacts/mir-client-published-'+width+'-FR.png',animations:'disabled'});
   await selector.locator('button[data-mir-locale="en-CA"]').click();
   await page.waitForFunction(()=>document.documentElement.lang==='en-CA');
   assert.match(await page.locator('#hero-title').innerText(),/Exteriors with/);
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),cart,'cart preserved after switching EN');
   assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,nofollow','SEO still guarded');
   await page.screenshot({path:'artifacts/mir-client-published-'+width+'-EN.png',animations:'disabled'});
   await page.goto(base+'boutique.html?pr41_sha='+sha,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.documentElement.lang==='en-CA');
   assert.match(await page.locator('body').innerText(),/Siding shop/);
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),cart,'cart preserved between public pages');
   await page.goto(base+'selection.html?pr41_sha='+sha,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.documentElement.lang==='en-CA');
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),cart,'selection does not rewrite cart');
   await page.locator('button[data-mir-locale="fr-CA"]').click();
   await page.waitForFunction(()=>document.documentElement.lang==='fr-CA');
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),cart,'return to French preserves cart');
   assert.equal(errors.length,0,'browser errors: '+errors.join(' | '));
   await context.close();
   console.log('PASS live MIR Pages '+sha+' public bilingual switch, navigation and cart at '+width);
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
