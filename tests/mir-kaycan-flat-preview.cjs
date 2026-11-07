'use strict';
const {drawTwoSides,openWorkshopStep}=require('./mir-draw-freeform-helper.cjs');
/* MIR — prévenir les photos perforées de soffite sur les pliages Kaycan. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const Preview=require('../dist/kaycan-flat-preview.js');
const source=filename=>fs.readFileSync(path.join(__dirname,'../dist',filename),'utf8');
let pass=0;
function check(title,fn){fn();pass++;console.log('PASS '+title);}

check('Médiane stable malgré les petits trous foncés du soffite',()=>{
 const w=40,h=40,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=(y*w+x)*4,dot=(x+y*3)%13===0;
  data[p]=dot?10:171;data[p+1]=dot?10:157;data[p+2]=dot?10:132;data[p+3]=255;
 }
 assert.equal(Preview.medianRgb(data,w,h),'#ab9d84');
});
check('Ne pas traiter une autre marque comme Kaycan',()=>{
 assert.equal(Preview.isKaycan({manufacturer:'Kaycan'}),true);
 assert.equal(Preview.isKaycan({manufacturer:'Gentek'}),false);
 assert.equal(Preview.isKaycan({manufacturer:'MAC Métal'}),false);
 assert.equal(Preview.isMAC({manufacturer:'MAC Métal architectural'}),true);
 assert.equal(Preview.isFlatPreview({manufacturer:'MAC Métal'}),true);
 assert.equal(Preview.isFlatPreview({manufacturer:'Gentek'}),false);
});
check('Pas de photo de soffite dans le SVG des moulures Kaycan',()=>{
 const app=source('production-app.js');
 assert.ok(app.includes('const swatch=flatPreview?null:safeAsset(finish.swatchUrl)'));
 assert.ok(app.includes("paint||'#c0c7bc'"));
});
check('Le nuancier conserve les vraies références produit et les autres fabricants',()=>{
 const app=source('production-app.js');
 assert.ok(app.includes("chosenMaterial()?.brand==='Kaycan'"));
 assert.ok(app.includes("chosenMaterial()?.brand==='MAC Métal architectural'"));
 assert.ok(app.includes('flat?\`<span class="color-text">'));
 assert.ok(app.includes('image?\`<img src='));
});
check('Kaycan flat preview est chargé avant le moteur',()=>{
 const html=source('production.html');
 assert.ok(html.indexOf('kaycan-flat-preview.js')<html.indexOf('production-app.js'));
});
function online(url){return new Promise(resolve=>http.get(url,r=>{r.resume();resolve(r.statusCode===200);}).on('error',()=>resolve(false)));}
(async()=>{
 const port=8778,base='http://127.0.0.1:'+port;
 fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
 let browser;
 try{
  for(let i=0;i<35;i++){if(await online(base+'/production.html'))break;await new Promise(r=>setTimeout(r,180));}
  const {chromium}=require('playwright');
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const layout of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
   const page=await browser.newPage({viewport:{width:layout.width,height:layout.height}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
   await drawTwoSides(page);
   await openWorkshopStep(page,3);
    if(!(await page.locator('.mir-v4-materials').evaluate(node=>node.open)))await page.locator('.mir-v4-materials > summary').click();
    if(!(await page.locator('#mir-v4-colors').evaluate(node=>node.open)))await page.locator('#mir-v4-colors > summary').click();
   await page.locator('#material-type').selectOption('aluminium');
   await page.locator('#production-material').selectOption('kaycan-urbanix-coil-0747');
   await page.locator('[data-production-color="kaycan-urbanix-etain-bruni"]').click();
   const url='./assets/catalogue-swatches/kaycan-urbanix-etain-bruni-4792751f.webp';
   await page.waitForFunction(p=>!!window.MIRKaycanFlatPreview?.get(p),url,{timeout:25000});
   const sampled=await page.evaluate(p=>window.MIRKaycanFlatPreview.get(p),url);
   assert.match(sampled,/^#[0-9a-f]{6}$/i);
   assert.equal(await page.locator('#production-color-grid img').count(),0);
   assert.equal(await page.locator('#selected-finish img').count(),0);
   assert.equal(await page.locator('#selected-finish .kaycan-flat-chip').count(),1);
   await openWorkshopStep(page,4);
   await page.locator('[data-preview="volume"]').click();
   await page.waitForTimeout(150);
   const diagram=await page.locator('#production-drawing svg').innerHTML();
   assert.equal(diagram.includes('<image'),false,'Kaycan 3D must not display a swatch image');
   assert.equal(diagram.includes('url(#production-paint)'),false,'Kaycan metal must not use a picture pattern');
   assert.equal(diagram.includes('fill="'+sampled+'"'),true,'Kaycan colored side uses sampled flat tint '+sampled);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(__dirname,'../artifacts/kaycan-fix-'+layout.name+'.png'),fullPage:true});
   console.log('PASS '+layout.name+' Kaycan flat tint '+sampled+' without perforations or photographic swatches');
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto(base+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
  assert.equal(await page.locator('body.mir-admin-v4').count(),0);
  console.log('PASS parcours client préservé');
  await page.close();
  console.log('MIR Kaycan: '+pass+' contrôles statiques + 3 contrôles navigateur réussis');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
