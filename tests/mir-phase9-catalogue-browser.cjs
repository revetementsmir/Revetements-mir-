'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist');
const mime={'.js':'application/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))return res.writeHead(404).end();fs.readFile(file,(error,data)=>error?res.writeHead(404).end():res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'}).end(data));});
const sizes=[[360,780],[390,844],[768,1024],[834,1112],[1366,768],[1440,900],[1920,1080]];
(async()=>{server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const [width,height] of sizes){const page=await browser.newPage({viewport:{width,height},isMobile:width<=390,hasTouch:width<=834}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/produit.html?id=hardieplank-select-825');await page.locator('#product-detail h1').waitFor();
  const colorNames=await page.locator('.product-color-picker [data-color]').evaluateAll(nodes=>nodes.slice(0,2).map(node=>node.getAttribute('aria-label')||node.getAttribute('title')||node.textContent));
  assert.match(colorNames[0],/Noir minuit/);assert.match(colorNames[1],/Blanc arctique/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} produit`);
  const broken=await page.locator('img').evaluateAll(images=>images.filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.src));assert.deepEqual(broken,[]);
  await page.goto(base+'/boutique.html?q=HardiePlank');await page.locator('#shop-grid .shop-card').first().waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} boutique`);
  if(width<=390){await page.getByRole('button',{name:'Filtres'}).click();await page.getByRole('button',{name:'Réinitialiser'}).click();}
  await page.goto(base+'/pliage.html');await page.evaluate(()=>{const details=document.querySelector('#client-bend-quick');if(details)details.open=true;});await page.waitForFunction(()=>document.querySelectorAll('#bend-material option').length>1);await page.waitForFunction(()=>document.querySelectorAll('#bend-colors button').length>1);const bend=await page.locator('#bend-colors button').evaluateAll(nodes=>nodes.slice(0,2).map(node=>node.getAttribute('aria-label')));assert.match(bend[0],/Noir/i);assert.match(bend[1],/Blanc/i);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} pliage`);assert.deepEqual(errors,[]);await page.close();console.log(`PASS catalogue ${width}x${height}`);
 }
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>localStorage.setItem('mir_harmony_preferences_v1',JSON.stringify({theme:'dark',textSize:'large',reducedMotion:'manual',highContrast:true,dateLocale:'fr-CA'})));
 for(const file of ['production.html?mode=client','chantier.html']){await page.goto(base+'/'+file);assert.equal(await page.locator('html').getAttribute('data-mir-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-mir-text'),'large');assert.equal(await page.locator('html').getAttribute('data-mir-contrast'),'high');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,file);}
 assert.deepEqual(errors,[]);await page.close();console.log('PASS thème sombre, texte Grand et contraste renforcé');
 }finally{await browser.close();server.close();}})().catch(error=>{console.error(error);process.exitCode=1});
