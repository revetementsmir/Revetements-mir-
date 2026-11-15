'use strict';
/* Public-only FR/EN route matrix: authentic MIR screens, no real backend calls.
 * Verify keyboard access, non-destructive language switches and static SEO.
 * A device emulation is not physical Samsung certification. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../artifacts');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.png':'image/png'};
const server=http.createServer((request,response)=>{
  const filename=path.resolve(dist,'.'+decodeURIComponent((request.url||'/').split('?')[0]));
  if(!filename.startsWith(dist+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){response.writeHead(404);response.end('Not found');return;}
  response.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'});
  fs.createReadStream(filename).pipe(response);
});
const routes=[
 'index.html','boutique.html','materiaux.html','produit.html?id=hardieplank-select-625',
 'selection.html','pliage.html','contact.html','realisations.html','plan.html',
 'production.html?mode=client&kind=profile','estimation.html',
 'estimation-dossier.html','studio.html'
];
const sizes=[360,390,430,768,834,1024,1440];
async function testRoute(context,base,route,width,index){
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let link=base+route,join=route.includes('?')?'&':'?';
 await page.goto(link+join+'mir-locale-preview=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.readyState!=='loading' && !!window.MIRClientLocale?.getLocale,{timeout:25000});
 const buttons=page.locator('.mir-client-locale-switch button');
 await buttons.first().waitFor({state:'attached',timeout:25000});
 await page.evaluate(()=>window.MIRClientLocale.setLocale('fr-CA'));
 assert.equal(await page.locator('html').getAttribute('lang'),'fr-CA',route+' FR lang');
 let originals=await page.evaluate(()=>({url:location.pathname+location.search+location.hash,store:localStorage.getItem('mir-shopping-list-v1'),meta:document.querySelector('meta[name=robots]')?.content??null}));
 await page.locator('button[data-mir-locale="en-CA"]').evaluate(b=>b.click());
 await page.waitForFunction(()=>document.documentElement.lang==='en-CA');
 let en=await page.evaluate(()=>({url:location.pathname+location.search+location.hash,store:localStorage.getItem('mir-shopping-list-v1'),meta:document.querySelector('meta[name=robots]')?.content??null,scroll:document.documentElement.scrollWidth,windowWidth:innerWidth,selector:!!document.querySelector('.mir-client-locale-switch button[aria-pressed=true][data-mir-locale="en-CA"]')}));
 assert.equal(en.url,originals.url,'language change stays on same URL and context: '+route);
 assert.equal(en.store,originals.store,'language change preserves saved cart: '+route);
 assert.equal(en.meta,originals.meta,'language switch may not change robots: '+route);
 assert.equal(en.selector,true,'EN selector announces pressed state: '+route);
 const enText=(await page.locator('body').innerText()).slice(0,15000);
 if(width===390||width===1440){
  await page.screenshot({path:path.join(out,'mir-client-matrix-EN-'+route.split(/[?#]/)[0].replace('.html','')+'-'+width+'.png'),animations:'disabled'});
 }
 assert.doesNotMatch(enText,/Demander une estimation|Pliage sur mesure|Nous joindre|Voir notre boutique|Retour à mon panier/,'primary French UI remains: '+route);
 const control=page.locator('button[data-mir-locale="fr-CA"]');
 const visibility=await control.isVisible();
 if(visibility){
  await control.focus();assert.equal(await control.evaluate(x=>document.activeElement===x),true,'keyboard focus '+route);
  await page.keyboard.press('Space');
 }else{
  // The Harmony-owned account header is tested separately. All other pages
  // must present a visible, keyboard-accessible language control.
  assert.fail('FR/EN selector is hidden from keyboard: '+route+' at '+width);
 }
 await page.waitForFunction(()=>document.documentElement.lang==='fr-CA');
 assert.equal(await page.locator('.mir-client-locale-switch button[aria-pressed=true]').innerText(),'FR');
 assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),originals.store);
 assert.ok(en.scroll<=width+3,'horizontal overflow in '+route+' '+width+': '+en.scroll);
 if(width===390||width===1440){await page.screenshot({path:path.join(out,'mir-client-matrix-'+route.split(/[?#]/)[0].replace('.html','')+'-'+width+'.png'),animations:'disabled'});}
 assert.deepEqual(errors,[],'JavaScript errors on '+route+': '+errors.join('; '));
 await page.close();
}
async function main(){
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
  catch(error){const bin=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].find(x=>x&&fs.existsSync(x));if(!bin)throw error;browser=await chromium.launch({executablePath:bin,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
  let checks=0;
  const sampled=['index.html','boutique.html','selection.html','pliage.html','realisations.html'];
  for(const width of sizes){
   const height=width>=1440?900:width>=768?1100:width===430?932:width===390?844:780;
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   await context.route('https://**/*',r=>r.abort());
   await context.addInitScript(()=>localStorage.setItem('mir-shopping-list-v1',JSON.stringify({version:1,project:'Projet fictif gardé',items:[{id:'test',materialId:'QA',quantity:3}]})));
   const chosen=(width===390||width===1440)?routes:sampled;
   for(let i=0;i<chosen.length;i++){
    await testRoute(context,'http://127.0.0.1:'+server.address().port+'/',chosen[i],width,i);
    checks++;
   }
   console.log('PASS MIR bilingual route and keyboard matrix '+width+'px: '+chosen.length+' customer routes');
   await context.close();
  }
  console.log('MIR client route matrix total: '+checks+' route/viewport checks');
 }finally{await browser?.close();await new Promise(done=>server.close(done));}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
