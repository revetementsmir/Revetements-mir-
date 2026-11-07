'use strict';
/* MAC Métal: une teinte de tôle n'est PAS une photo de clin répétée. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const Preview=require('../dist/kaycan-flat-preview.js');
const app=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../dist/production.html'),'utf8');
let completed=0;
function test(name,run){run();completed++;console.log('PASS '+name);}
test('MAC (avec ou sans accents) est reconnu sans transformer Gentek',()=>{
 assert.equal(Preview.isMAC({manufacturer:'MAC Métal architectural'}),true);
 assert.equal(Preview.isMAC({manufacturer:'MAC Metal architectural'}),true);
 assert.equal(Preview.isFlatPreview({manufacturer:'Kaycan'}),true);
 assert.equal(Preview.isFlatPreview({manufacturer:'Gentek'}),false);
});
test("Les images JPEG MAC sont acceptées pour l'échantillon uniquement",()=>{
 const url='./assets/catalogue-swatches/mac-bouleau-fume-efcc24f8.jpeg';
 assert.equal(Preview.get(url),null);
 assert.equal(Preview.sample('https://untrusted.example/image.jpeg'),null);
});
test('Le rendu profil MAC ne reçoit jamais une photo plaquée',()=>{
 assert.ok(app.includes('const swatch=flatPreview?null:safeAsset(finish.swatchUrl)'));
 assert.ok(app.includes('window.MIRKaycanFlatPreview?.isFlatPreview(finish)'));
 assert.ok(app.includes('chosenMaterial()?.brand===\'MAC Métal architectural\''));
});
test('L’ordre de chargement préserve le moteur de dessin et Kaycan',()=>{
 assert.ok(html.indexOf('kaycan-flat-preview.js')<html.indexOf('production-app.js'));
 assert.ok(html.includes('production-model.js'));
});
async function ready(url){
 for(let n=0;n<40;n++){
  const ok=await new Promise(resolve=>http.get(url,r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Local site unavailable');
}
(async()=>{
 const port=8796,base='http://127.0.0.1:'+port;
 fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--directory',path.join(__dirname,'../dist'),'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
  await ready(base+'/production.html');
  const {chromium}=require('playwright');
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const screen of [{name:'mobile',width:390,height:844},{name:'bureau',width:1440,height:900}]){
   const page=await browser.newPage({viewport:{width:screen.width,height:screen.height},hasTouch:screen.width<600});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e.message)));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
   await page.locator('[data-freeform-add]').click();
   await page.locator('[data-freeform-add]').click();
   await page.locator('[data-freeform-finish]').click();
    if(!(await page.locator('.mir-v4-materials').evaluate(node=>node.open)))await page.locator('.mir-v4-materials > summary').click();
   await page.locator('#material-type').selectOption('acier');
    if(!(await page.locator('#mir-v4-colors').evaluate(node=>node.open)))await page.locator('#mir-v4-colors > summary').click();
   await page.locator('#production-material').selectOption('mac-acier-moulures');
   await page.locator('[data-production-color="mac-acier-304"]').click();
   const url='./assets/catalogue-swatches/mac-bouleau-fume-efcc24f8.jpeg';
   await page.waitForFunction(u=>/^#[0-9a-f]{6}$/i.test(window.MIRKaycanFlatPreview?.get(u)||''),url,{timeout:25000});
   const color=await page.evaluate(u=>window.MIRKaycanFlatPreview.get(u),url);
   assert.equal(await page.locator('#production-color-grid img').count(),0,'MAC swatches must not be photos');
   assert.equal(await page.locator('#selected-finish img').count(),0,'MAC selected finish must be a solid chip');
   assert.equal(await page.locator('#selected-finish .kaycan-flat-chip').count(),1);
   await page.locator('[data-preview="volume"]').click();
   await page.waitForTimeout(150);
   const svg=await page.locator('#production-drawing svg').innerHTML();
   assert.ok(!svg.includes('<image'),'MAC 3D must not contain an image');
   assert.ok(!svg.includes('url(#production-paint)'),'MAC 3D must not tile product photos');
   if(!svg.includes('fill="'+color+'"')){
    console.log('MAC DIAGNOSTIC '+JSON.stringify({expected:color,
     actualFills:[...svg.matchAll(/fill="([^"]+)"/g)].map(m=>m[1]).slice(0,12),
     profileFace:await page.locator('#profile-painted-side').inputValue(),
     selectedText:(await page.locator('#selected-finish').innerText()).slice(0,140)}));
   }
   assert.ok(svg.includes('fill="'+color+'"'),'Colored metal must use a single sampled color');
   await page.locator('#production-drawing').screenshot({path:path.join(__dirname,'../artifacts/mac-flat-'+screen.name+'.png')});
   assert.deepEqual(errors,[]);
   console.log('PASS MAC Métal '+screen.name+' '+screen.width+'px: tôle unie '+color+' sans morceaux de clin');
   await page.close();
  }
  console.log('MIR MAC flat finish: '+completed+' checks and Chrome mobile+desktop OK');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
