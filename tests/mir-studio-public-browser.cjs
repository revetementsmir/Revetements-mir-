'use strict';
/* Offline real Chromium, actual public release template, real SVG from dist,
 * no live site/Supabase/send. The TEST stage is covered independently. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'ops/studio-public/under-construction.html'),'utf8');
const logo='data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'dist/assets/MIR-logo-officiel-original.svg')).toString('base64');
const html=source.replace('src="assets/MIR-logo-officiel-original.svg"','src="'+logo+'"');
const dir=path.resolve(root,'artifacts/studio-public');fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const executable=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].find(v=>v&&fs.existsSync(v));
 const browser=await chromium.launch({...(executable?{executablePath:executable}:{channel:'chrome'}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const nav=fs.readFileSync(path.join(root,'dist/mir-public-menu.js'),'utf8');
  const homepage=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  const returnLink=fs.readFileSync(path.join(root,'dist/mir-client-return.js'),'utf8');
  for(const file of [nav,homepage,returnLink])assert.match(file,/plan\.html/,'Studio link preserved from menu/home/Connexion');
  assert.match(homepage,/mir-home-service-studio/,'home service card links to Studio');
  assert.match(nav,/\['plan\.html','Studio'/,'header and mobile Studio link');
  assert.match(fs.readFileSync(path.join(root,'dist/plan.html'),'utf8'),/id="open-library"/,'original Studio intact for TEST');
  for(const w of [360,390,430,768,834,1024,1440]){
   const context=await browser.newContext({viewport:{width:w,height:850},reducedMotion:'reduce'});
   const page=await context.newPage(),requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
   await page.setContent(html,{waitUntil:'load'});
   assert.equal(await page.locator('html').getAttribute('lang'),'fr-CA');
   assert.equal(await page.locator('h1').innerText(),'En construction par l’équipe MIR');
   assert.equal(await page.locator('.soon').innerText(),'Ouverture bientôt');
   assert.equal(await page.locator('.brand img').evaluate(el=>el.complete&&el.naturalWidth>0),true,'official MIR logo loads');
   assert.equal(await page.locator('.hammer').evaluate(el=>getComputedStyle(el).animationName),'none','reduced-motion disables hammer');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal overflow FR '+w);
   assert.deepEqual(await page.locator('nav.actions a').evaluateAll(nodes=>nodes.map(x=>x.getAttribute('href'))),['index.html','boutique.html']);
   await page.screenshot({path:path.join(dir,'studio-public-'+w+'-fr-ca.png'),fullPage:true,animations:'disabled'});
   await page.locator('button[data-mir-locale="en-CA"]').click();
   assert.equal(await page.locator('html').getAttribute('lang'),'en-CA');
   assert.equal(await page.locator('h1').innerText(),'Under construction by the MIR team');
   assert.equal(await page.locator('.soon').innerText(),'Opening soon');
   assert.equal(await page.locator('nav.actions').getAttribute('aria-label'),'Studio navigation');
   assert.equal(await page.locator('.brand').getAttribute('aria-label'),'Les Revêtements MIR — home');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal overflow EN '+w);
   assert.match(await page.title(),/Under construction/);
   await page.screenshot({path:path.join(dir,'studio-public-'+w+'-en-ca.png'),fullPage:true,animations:'disabled'});
   await page.locator('button[data-mir-locale="fr-CA"]').click();
   assert.equal(await page.locator('html').getAttribute('lang'),'fr-CA');
   const target=page.locator('nav.actions a').first();await target.focus();assert.equal(await target.evaluate(el=>el===document.activeElement),true,'keyboard target reachable');
   await page.evaluate(()=>document.documentElement.style.fontSize='32px');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'large text no overflow '+w);
   await page.locator('button[data-mir-locale="en-CA"]').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'200% text EN no overflow '+w);
   assert.equal(errors.length,0,'script errors '+w+': '+errors.join(' | '));
   assert.equal(requests.length,0,'browser must make zero external requests');
   await context.close();
   console.log('PASS Studio public offline 2 languages, real MIR logo, keyboard, motion, large text, '+w+'px');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
