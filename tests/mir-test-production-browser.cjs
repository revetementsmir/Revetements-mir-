'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {once}=require('node:events'),{chromium}=require('playwright'),{build}=require('../scripts/build-mir-test.cjs');
const source=path.resolve(__dirname,'../dist'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'mir-test-browser-')),target=path.join(temp,'test');
const published=process.env.MIR_ENV_PUBLISHED_BASE;
if(!published)build(source,target,'a'.repeat(40));
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local'),test=url.pathname.startsWith('/test/'),root=test?target:source,name=test?url.pathname.slice(5):url.pathname,file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.writeHead(200,{'content-type':({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
(async()=>{let browser;
 try{
  if(!published){server.listen(0,'127.0.0.1');await once(server,'listening');}const base=(published||'http://127.0.0.1:'+server.address().port).replace(/\/$/,'');
  browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1080}}),requests=[];
  await context.route('**/*.supabase.co/**',route=>{requests.push(route.request().url());return route.fulfill({status:200,contentType:'application/json',body:'[]'});});
  const prod=await context.newPage();await prod.goto(base+'/responsive.html?page=index.html&layout=tablet');await prod.locator('[data-mir-responsive-ready=true]').waitFor();
  await prod.evaluate(async()=>{localStorage.setItem('mir-env-proof','production');sessionStorage.setItem('mir-env-proof','production');await(await caches.open('mir-env-proof')).put('/cache-proof',new Response('production'));});
  await prod.waitForFunction(()=>document.querySelector('a[data-mir-environment=test]')?.hasAttribute('href'),null,{timeout:15000});
  await prod.locator('a[data-mir-environment=test]').click();
  await prod.locator('[data-mir-responsive-ready=true]').waitFor();
  assert.equal(new URL(prod.url()).pathname,new URL(base+'/test/responsive.html').pathname);assert.equal(new URL(prod.url()).searchParams.get('layout'),'tablet');
  assert.equal(await prod.locator('a[data-mir-environment=test]').getAttribute('aria-current'),'page');
  assert(await prod.locator('[data-mir-test-banner]').count());
  const state=await prod.evaluate(async()=>{
   const before=[localStorage.getItem('mir-env-proof'),sessionStorage.getItem('mir-env-proof')];localStorage.setItem('mir-env-proof','test');sessionStorage.setItem('mir-env-proof','test');localStorage['property-proof']='test-property';
   const cacheBefore=await caches.match('/cache-proof');await(await caches.open('mir-env-proof')).put('/cache-proof',new Response('test'));const cacheAfter=await(await caches.match('/cache-proof')).text();
   const blocked=[];for(const url of ['https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/proof','https://hxtztkmbfpmzrieccwsg.supabase.co/functions/v1/mir-estimates','https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1/otp','https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1/user']){try{await fetch(url,{method:'POST'});blocked.push(false);}catch{blocked.push(true);}}
   let xhrBlocked=false;try{new XMLHttpRequest().open('GET','https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/proof');}catch{xhrBlocked=true;}
   await fetch('https://hxtztkmbfpmzrieccwsg.supabase.co/rest/v1/rpc/mir_public_boutique_prices',{method:'POST',body:'{}'});
   const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('mir-env-proof',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.close();
   return {before,blocked,xhrBlocked,property:localStorage['property-proof'],keys:Object.keys(localStorage),dbs:await indexedDB.databases(),env:window.MIRTestEnvironment,cacheBefore:cacheBefore?await cacheBefore.text():null,cacheAfter};
  });
  assert.deepEqual(state.before,[null,null]);assert.deepEqual(state.blocked,[true,true,true,true]);assert(state.xhrBlocked);assert.equal(state.property,'test-property');assert(state.keys.includes('property-proof'));assert(state.dbs.some(db=>db.name==='mir-env-proof'));assert.equal(state.env.projectRef,'hxtztkmbfpmzrieccwsg');assert.equal(state.cacheBefore,null);assert.equal(state.cacheAfter,'test');
  assert(requests.every(url=>new URL(url).hostname==='hxtztkmbfpmzrieccwsg.supabase.co'),'no production Supabase request');
  const inspect=await context.newPage();await inspect.goto(base+'/index.html');
  assert.equal(await inspect.evaluate(()=>localStorage.getItem('mir-env-proof')),'production');
  assert.equal(await inspect.evaluate(async()=>await(await(await caches.open('mir-env-proof')).match('/cache-proof')).text()),'production');
  assert.equal(await inspect.evaluate(()=>localStorage.getItem('mir-test:hxtztkmbfpmzrieccwsg:mir-env-proof')),'test');
  assert((await inspect.evaluate(()=>indexedDB.databases())).some(db=>db.name==='mir-test:hxtztkmbfpmzrieccwsg:mir-env-proof'));
  await prod.addScriptTag({url:base+'/test/portal-config.js?recette=0'});assert.equal(await prod.evaluate(()=>window.MIRPortalConfig.projectRef),'hxtztkmbfpmzrieccwsg');
  fs.mkdirSync('artifacts/mir-environments',{recursive:true});await prod.screenshot({path:'artifacts/mir-environments/test-tablet.png'});
  await prod.locator('a[data-mir-environment=production]').click();await prod.locator('[data-mir-responsive-ready=true]').waitFor();assert.equal(new URL(prod.url()).pathname,new URL(base+'/responsive.html').pathname);assert.equal(await prod.evaluate(()=>localStorage.getItem('mir-env-proof')),'production');assert.equal(await prod.evaluate(()=>sessionStorage.getItem('mir-env-proof')),'production');
  await context.route('**/test/mir-test-environment.json',route=>route.fulfill({status:200,contentType:'application/json',body:'{"environment":"production","projectRef":"gccltmaulvrnthrbnrpd"}'}));
  await prod.reload();await prod.locator('[data-mir-responsive-ready=true]').waitFor();await prod.waitForFunction(()=>document.querySelector('a[data-mir-environment=test]')?.title.includes('indisponible'),null,{timeout:15000});assert.equal(await prod.locator('a[data-mir-environment=test]').getAttribute('href'),null,'no false TEST link or production fallback');
  console.log('PASS TEST/PRODUCTION links, retained format, fixed sandbox, isolated sessions/drafts/IndexedDB, denied production and deliveries, refused invalid TEST manifest');
 }finally{await browser?.close();server.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
