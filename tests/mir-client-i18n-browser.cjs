'use strict';
/* Chromium tests of genuine MIR public screens after enabling the reviewed language switch. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist'),artifacts=path.resolve(__dirname,'../artifacts');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(dist,'.'+decodeURIComponent((req.url||'/').split('?')[0]));
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
 fs.createReadStream(file).pipe(res);
});
const sizes=[320,360,390,430,768,834,1024,1440];
async function main(){
 fs.mkdirSync(artifacts,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 let browser;
 try{
  try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
  catch(e){const bin=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].find(x=>x&&fs.existsSync(x));if(!bin)throw e;browser=await chromium.launch({executablePath:bin,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
  let passed=0;
  for(const width of sizes){
   const height=width>=1200?900:width>=768?1024:width===430?932:width===390?844:width===320?568:780;
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   // This suite verifies the local client UI only. No Auth, email or production
   // endpoint may receive a request, including the invitation regression below.
   await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
   assert.equal(new URL(page.url()).searchParams.has('mir-locale-preview'),false,'public route needs no preview flag');
   const selector=page.locator('.mir-client-locale-switch');
   await selector.waitFor({state:'visible'});
   assert.equal(await page.locator('html').getAttribute('lang'),'fr-CA');
   assert.equal(await selector.locator('button[aria-pressed=true]').textContent(),'FR');
   const cart=JSON.stringify({version:1,project:'Fictif non envoyé',items:[{id:'test',quantity:2,materialId:'material-demo'}]});
   await page.evaluate(value=>localStorage.setItem('mir-shopping-list-v1',value),cart);
   // Native option values default to their text when no value attribute exists.
   // Translating a label must not silently change the value submitted by a form.
   const optionValues=await page.evaluate(()=>{
    const form=document.createElement('form');form.id='locale-options-form';
    const select=document.createElement('select');select.id='locale-options-fixture';select.name='material';
    for(const label of ['Revêtements','Aluminium']){const option=document.createElement('option');option.textContent=label;select.append(option);}
    const explicit=document.createElement('option');explicit.value='custom-profile';explicit.textContent='Pliage sur mesure';select.append(explicit);
    select.value='Aluminium';form.append(select);document.body.append(form);
    return Array.from(select.options,option=>option.value);
   });
   await page.screenshot({path:path.join(artifacts,'mir-client-fr-'+width+'.png'),animations:'disabled'});
   await page.locator('button[data-mir-locale="en-CA"]').click();
   await page.waitForFunction(()=>document.documentElement.lang==='en-CA');
   assert.equal(await selector.locator('button[aria-pressed=true]').textContent(),'EN');
   assert.equal((await page.locator('#hero-title').innerText()).replace(/\s+/g,' ').trim(),'Your project starts here.','hero English at '+width);
   const readOptions=()=>page.evaluate(()=>{
    const form=document.getElementById('locale-options-form'),select=document.getElementById('locale-options-fixture');
    return {values:Array.from(select.options,option=>option.value),labels:Array.from(select.options,option=>option.textContent),selected:select.value,submitted:new FormData(form).get('material')};
   });
   const englishOptions=await readOptions();
   assert.deepEqual(englishOptions.values,optionValues,'option submission values preserved in EN at '+width);
   assert.deepEqual(englishOptions.labels,['Siding','Aluminum','Custom metal bending'],'option labels translated at '+width);
   assert.equal(englishOptions.selected,'Aluminium','selected source value preserved in EN at '+width);
   assert.equal(englishOptions.submitted,'Aluminium','FormData keeps source value in EN at '+width);
   await page.locator('button[data-mir-locale="fr-CA"]').click();
   await page.waitForFunction(()=>document.documentElement.lang==='fr-CA');
   const frenchOptions=await readOptions();
   assert.deepEqual(frenchOptions.values,optionValues,'option values preserved after returning to FR at '+width);
   assert.deepEqual(frenchOptions.labels,['Revêtements','Aluminium','Pliage sur mesure'],'option labels restored in FR at '+width);
   assert.equal(frenchOptions.submitted,'Aluminium','FormData keeps source value after returning to FR at '+width);
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),cart,'cart preserved through option language cycle at '+width);
   await page.locator('button[data-mir-locale="en-CA"]').click();
   await page.waitForFunction(()=>document.documentElement.lang==='en-CA');
   await page.locator('#locale-options-form').evaluate(form=>form.remove());
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),cart,'cart preserved at '+width);
   assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex,nofollow');
   const avatar=await page.locator('header .mir-public-account-avatar').boundingBox(),localeBox=await selector.boundingBox();
   assert.ok(avatar&&localeBox&&localeBox.x+localeBox.width<=avatar.x+2&&avatar.x+avatar.width<=width+2,'language switch must precede rightmost avatar at '+width+' '+JSON.stringify({avatar,localeBox,header:await page.locator('header.site-header').boundingBox()}));
   const pageWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert.ok(pageWidth<=width+3,'horizontal overflow '+pageWidth+' > '+width);
   await page.screenshot({path:path.join(artifacts,'mir-client-en-'+width+'.png'),animations:'disabled'});
   await page.goto(base+'boutique.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.documentElement.lang==='en-CA');
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),cart,'cart preserved across page');
   assert.ok((await page.locator('body').innerText()).includes('Siding shop'),'boutique translation at '+width);
   await page.evaluate(()=>{const input=document.createElement('input');input.id='locale-fixture';input.value='3 1/2 pi · personal note';document.body.append(input);});
   const source=await page.locator('#locale-fixture').inputValue();
   await page.locator('button[data-mir-locale="fr-CA"]').click();
   await page.waitForFunction(()=>document.documentElement.lang==='fr-CA');
   assert.equal(await page.locator('#locale-fixture').inputValue(),source,'unsaved field intact at '+width);
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),cart);
   if(width===390||width===1440){
    await page.goto(base+'production.html?mode=client&kind=profile',{waitUntil:'domcontentloaded'});
    await page.locator('.mir-client-locale-switch').waitFor({state:'visible'});
    await page.goto(base+'production.html',{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('.mir-client-locale-switch').count(),0,'admin configurator remains separate');
    await page.goto(base+'chantier.html',{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('.mir-client-locale-switch').count(),0,'staff role remains separate');
    // The portal consumes an invitation query and removes it from the URL.
    // The private flow must stay excluded after that cleanup and on reload.
    await page.goto(base+'chantier.html?clientLocale=1&invitation='+'a'.repeat(43),{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!new URLSearchParams(location.search).has('invitation')&&!!sessionStorage.getItem('mir_portal_invitation_v1'));
    assert.equal(await page.locator('.mir-client-locale-switch').count(),0,'consumed invitation excludes client languages at '+width);
    assert.equal(await page.locator('body.mir-prestige-account').count(),0,'consumed invitation excludes client account skin at '+width);
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('.mir-client-locale-switch').count(),0,'saved invitation stays excluded after reload at '+width);
    assert.equal(await page.locator('body.mir-prestige-account').count(),0,'saved invitation keeps staff presentation after reload at '+width);
    assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),cart,'cart preserved on invitation page at '+width);
   }
   assert.equal(errors.length,0,'JS errors at '+width+': '+errors.join('; '));
   passed++;await context.close();
  }
  console.log('MIR bilingual public release: '+passed+' browser viewports passed');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
