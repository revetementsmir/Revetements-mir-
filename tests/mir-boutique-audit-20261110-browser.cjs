'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {once}=require('node:events');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../dist');
function serve(){return http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});}

(async()=>{
 const server=serve();server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium'});
 const results=[];
 try{
  for(const [width,height] of [[390,844],[834,1112],[1366,900],[1440,900]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<1000,isMobile:width<600,reducedMotion:'reduce'});
   await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/boutique.html');await page.locator('#shop-brand-directory a').first().waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`débordement boutique ${width}`);
   await page.locator('#shop-filter-toggle').click();await page.locator('#shop-brand').selectOption({label:'James Hardie'});
   await page.locator('[data-shop-card="hardieplank-smooth-625"]').waitFor();
   assert.equal(await page.locator('#shop-search').isVisible(),true,`recherche visible ${width}`);
   assert.equal(await page.locator('.mir-shop-intro figure').isVisible(),false,`grand visuel masqué avec filtre ${width}`);
   for(const id of ['kaycan-coil-0721-30m','canexel-joint-ridgewood-d5-12','profilec-la-capitale'])assert.equal(await page.locator(`[data-shop-card="${id}"]`).count(),0,id);
   await page.locator('[data-shop-card="hardieplank-smooth-625"] h3 a').click();await page.locator('#product-add').waitFor();
   assert.equal(await page.locator('#product-add').isEnabled(),true);
   assert.match(await page.locator('#product-add').innerText(),/Ajouter à ma demande/);
   const source=await page.locator('.product-color-heading a').getAttribute('href');assert.match(source,/jameshardie\.ca/);assert.doesNotMatch(source,/gentek\.ca/);
   const color=page.locator('[data-color]').first();await color.click();assert.equal(await color.getAttribute('aria-pressed'),'true');
   assert.ok(await page.locator('#related-grid [data-shop-card]').count()<=3);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`débordement fiche ${width}`);
   await page.goto(base+'/boutique.html?view=all&q=PANELFAST');
   const beck=page.locator('[data-shop-card="beck-panelfast-ags100"]');await beck.waitFor();
   assert.match(await beck.innerText(),/BECK PANELFAST AGS-100/);
   assert.match(await beck.innerText(),/1 1\/2 po/);
   await beck.locator('h3 a').click();await page.locator('#product-add').waitFor();
   assert.match(await page.locator('#product-price-note').innerText(),/Prix sur demande/);
   assert.equal(await page.locator('[data-photo]').count(),2);
   assert.equal(await page.locator('#product-format option').count(),4);
   await page.locator('#product-format').selectOption('ags1000200-na');
   assert.equal(await page.locator('#product-format').inputValue(),'ags1000200-na');
   assert.equal(await page.locator('#product-unit').inputValue(),'boîtes');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`débordement fiche BECK ${width}`);
   assert.deepEqual(errors,[]);
   results.push({width,passed:true});await context.close();
  }
  console.log('MIR audit boutique navigateur:',results);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1)});
