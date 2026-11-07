'use strict';
/* MIR : renommer sans quitter le dessin ni modifier les mesures. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const port = 8784, base = 'http://127.0.0.1:' + port;
const artifactDir = path.join(__dirname,'../artifacts');
const folder = path.join(__dirname,'../dist');
const storageKey = 'mir_production_admin_dossier_v1';
const pause = millis => new Promise(resolve=>setTimeout(resolve,millis));
async function ready(){
 for(let i=0;i<50;i++){
  const ok=await new Promise(resolve=>{
   http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode===200);}).on('error',()=>resolve(false));
  });
  if(ok)return;
  await pause(160);
 }
 throw new Error('Serveur local indisponible');
}
(async()=>{
 fs.mkdirSync(artifactDir,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',folder],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const layout of [
   {name:'bureau',width:1440,height:900},
   {name:'tablette',width:1024,height:900},
   {name:'mobile',width:390,height:844},
   {name:'mobile-compact',width:360,height:780},
  ]){
   const page=await browser.newPage({viewport:{width:layout.width,height:layout.height},hasTouch:layout.width<1150,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
   await page.locator('[data-freeform-add]').click();
   await page.locator('[data-freeform-add]').click();
   await page.locator('[data-freeform-finish]').click();
   const input=page.locator('#production-piece-name');
   assert.equal(await input.isVisible(),true,'Nom de la moulure doit être visible');
   assert.equal(await page.locator('#mir-piece-name-field').innerText().then(s=>s.includes('Nom de la moulure')),true);
   await input.fill('Solin fenêtre avant');
   assert.equal((await input.inputValue()),'Solin fenêtre avant');
   assert.equal((await page.locator('#drawing-title').textContent()).trim(),'Solin fenêtre avant');
   await page.locator('#add-production-piece').click();
   const first=page.locator('[data-production-item="M001"]');
   assert.equal((await first.locator('h3').textContent()).trim(),'Solin fenêtre avant');
   const pre=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).order.items[0],storageKey);
   assert.ok(pre.snapshot?.revision>=1);
   assert.equal(pre.spec.name,'Solin fenêtre avant');
   const quantity=pre.spec.quantity;
   const segments=JSON.stringify(pre.snapshot.geometry);
   await page.locator('#mode-link').click();
   assert.equal(await page.locator('#production-order').isVisible(),true);
   await first.locator('[data-rename-piece]').click();
   const form=first.locator('[data-rename-form]');
   assert.equal(await form.isVisible(),true);
   const rename=form.locator('input[name="name"]');
   assert.equal(await rename.inputValue(),'Solin fenêtre avant');
   // Blanks must never overwrite saved names.
   await rename.fill('   ');
   await form.locator('button[type="submit"]').click();
   assert.equal((await first.locator('h3').textContent()).trim(),'Solin fenêtre avant');
   assert.equal(await form.isVisible(),true);
   await rename.fill('L replié façade nord');
   await form.locator('button[type="submit"]').click();
   assert.equal((await first.locator('h3').textContent()).trim(),'L replié façade nord');
   const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).order.items[0],storageKey);
   assert.equal(after.spec.name,'L replié façade nord');
   assert.equal(after.snapshot.spec.name,'L replié façade nord');
   assert.equal(after.snapshot.values.name,'L replié façade nord');
   assert.equal(after.spec.quantity,quantity);
   assert.equal(JSON.stringify(after.snapshot.geometry),segments);
   assert.equal(after.snapshot.revision,pre.snapshot.revision+1);
   assert.equal(after.history.at(-1).spec.name,'Solin fenêtre avant');
   assert.equal(after.id,pre.id);
   await first.screenshot({path:path.join(artifactDir,'mir-rename-'+layout.name+'.png')});
   const pageWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert.ok(pageWidth<=layout.width+2,'Débordement horizontal '+layout.name+' '+pageWidth+'px');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
   await page.locator('#mode-link').click();
   assert.equal((await page.locator('[data-production-item="M001"] h3').textContent()).trim(),'L replié façade nord');
   // Un renommage ne change pas le dernier modèle choisi ni sa géométrie.
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).order.items[0],storageKey);
   assert.equal(JSON.stringify(saved.snapshot.geometry),segments);
   assert.deepEqual(errors,[],'Erreurs JS sur '+layout.name);
   console.log('PASS nom / renommage / historique / rechargement '+layout.name+' '+layout.width+'x'+layout.height);
   await page.close();
  }
  const client=await browser.newPage({viewport:{width:390,height:844}});
  await client.goto(base+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
  await client.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
  assert.equal(await client.locator('#mir-piece-name-field').isVisible(),false);
  assert.equal(await client.locator('[data-rename-piece]').count(),0);
  console.log('PASS le parcours client reste inchangé');
  await client.close();
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
