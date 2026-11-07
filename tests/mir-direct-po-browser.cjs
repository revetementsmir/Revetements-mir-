'use strict';
const {drawTwoSides}=require('./mir-draw-freeform-helper.cjs');
/* MIR — ajout d'une moulure au bon de commande sans étape de modèle enregistré. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8797,base='http://127.0.0.1:'+port,dir=path.join(__dirname,'../dist');
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
async function ready(){
 for(let i=0;i<45;i++){
  const ok=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await sleep(180);
 }
 throw Error('HTTP server unavailable');
}
(async()=>{
 fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--directory',dir,'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const size of [{name:'mobile',width:390,height:844},{name:'tablet',width:1024,height:900},{name:'desktop',width:1440,height:900}]){
   const page=await browser.newPage({viewport:{width:size.width,height:size.height},hasTouch:size.width<1100});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
   await drawTwoSides(page);
   await page.locator('[data-freeform-finish]').click();
   await page.locator('#production-piece-name').fill('Solin porte entrée');
   const button=page.locator('#mir-direct-po-add');
   assert.equal(await button.isVisible(),true);
   assert.equal(await button.isEnabled(),true);
   const storage=async()=>page.evaluate(()=>({
    order:JSON.parse(localStorage.getItem('mir_production_admin_dossier_v1')||'null')?.order||null,
    templates:JSON.parse(localStorage.getItem('mir_production_templates_v1')||'null')?.records||[]
   }));
   const before=await storage();
   assert.equal(before.order?.items?.length||0,0);
   await button.click();
   assert.equal(await page.locator('#mir-po-form').isVisible(),true);
   assert.equal((await storage()).order?.items?.length||0,0,'Selecting PO must not save before confirmation');
   await page.locator('#production-dialog').evaluate(node=>node.close());
   assert.equal((await storage()).order?.items?.length||0,0,'Cancel keeps drawing and local PO unchanged');
   assert.equal((await page.locator('#production-piece-name').inputValue()),'Solin porte entrée');
   await button.click();
   await page.locator('#mir-po-form input[name="po"]').fill('PO-TEST-715');
   await page.locator('#mir-po-form button[type="submit"]').click();
   const after=await storage();
   assert.equal(after.order.poNumber,'PO-TEST-715');
   assert.equal(after.order.items.length,1,'Exactly one PO line must be saved');
   assert.equal(after.order.items[0].spec.name,'Solin porte entrée');
   assert.equal(after.order.items[0].snapshot.schema,'mir-production-instance-1');
   assert.deepEqual(after.templates,before.templates,'No reusable model should be saved');
   await page.locator('#mir-procurement-tabs [data-mir-tab="models"]').click();
   assert.equal(await page.locator('#production-library .model-library-card').count(),0,'Bon direct absent de Mes pliages');
   await page.locator('#mir-procurement-tabs [data-mir-tab="draw"]').click();
   assert.equal(await page.locator('#order-head-count').textContent(),'01');
   assert.equal(await page.locator('#production-dialog').evaluate(node=>node.open),false);
   await page.locator('#production-drawing').screenshot({path:path.join(__dirname,'../artifacts/mir-direct-po-'+size.name+'.png')});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
   const restored=await storage();
   assert.equal(restored.order.poNumber,'PO-TEST-715');
   assert.equal(restored.order.items.length,1);
   assert.deepEqual(errors,[]);
   const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:innerWidth}));
   assert.ok(metrics.scroll<=metrics.view+2,'Horizontal overflow '+size.name);
   console.log('PASS '+size.name+': drawing -> PO draft, cancel/no duplicate, saved snapshot and restored after reload');
   await page.close();
  }
  const client=await browser.newPage({viewport:{width:390,height:844}});
  await client.goto(base+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
  await client.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
  assert.equal(await client.locator('#mir-direct-po-add').isVisible(),false);
  console.log('PASS client unchanged: direct PO is admin-only');
  await client.close();
 } finally {if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
