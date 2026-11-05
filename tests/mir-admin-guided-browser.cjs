'use strict';
/* MIR : recette du véritable atelier avec dessin souris, 4 étapes,
   miniature desktop et option mobile, séparation Boutique/Magasin/Bons. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const port=8851,base='http://127.0.0.1:'+port;
async function ready(){
 for(let i=0;i<80;i++){
  const ok=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await new Promise(r=>setTimeout(r,150));
 }
 throw Error('Serveur de test MIR non démarré.');
}
(async()=>{
 fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--directory',path.join(__dirname,'../dist'),'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const size of [{name:'bureau',width:1440,height:900},{name:'tablette',width:1024,height:768},{name:'mobile',width:390,height:844}]){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.width<1100});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version&&window.MIRAdminWizard?.active,{timeout:30000});
   const names=await page.locator('#mir-procurement-tabs button').allTextContents();
   assert.deepEqual(names,['Créer','Boutique','Magasin employés','Bons de commande']);
   assert.equal(await page.locator('#mir-guide-steps button').count(),4);
   assert.equal(await page.locator('body').getAttribute('data-mir-guide-step'),'1');
   assert.equal(await page.locator('#mir-guide-3d').isVisible(),size.width>1150);
   assert.equal(await page.locator('#mir-guide-3d-open').isVisible(),size.width<=1150);
   if(size.width<=1150){
     await page.locator('#mir-guide-3d-open').click();
     assert.equal(await page.locator('#mir-guide-3d').isVisible(),true);
     await page.locator('#mir-guide-3d-close').click();
     assert.equal(await page.locator('#mir-guide-3d').isVisible(),false);
   }
   const rect=await page.locator('#production-drawing').boundingBox();
   assert.ok(rect?.height>80,size.name+' dessin disponible : '+JSON.stringify(rect));
   for(const [u,v] of [[.30,.62],[.66,.62],[.66,.35]]){
     await page.mouse.click(rect.x+rect.width*u,rect.y+rect.height*v);
   }
   await page.waitForFunction(()=>document.querySelector('[data-mir-live-3d="ready"]')!==null,{timeout:12000});
   assert.equal(await page.locator('body.mir-admin-guided-active').count(),1);
   assert.equal(await page.locator('#mir-guide-3d-canvas [data-mir-live-3d="ready"]').count(),1);
   await page.locator('#mir-guide-next').click();
   await page.waitForFunction(()=>window.MIRAdminWizard?.step===2,{timeout:15000});
   assert.equal(await page.locator('#mir-v4-dimensions').evaluate(node=>node.open),true);
   await page.locator('#mir-guide-next').click();
   await page.waitForFunction(()=>window.MIRAdminWizard?.step===3,{timeout:12000});
   await page.locator('[data-mir-guide-face="right"]').click();
   assert.equal(await page.locator('[data-mir-guide-face="right"]').getAttribute('aria-pressed'),'true');
   await page.locator('#mir-guide-next').click();
   await page.waitForFunction(()=>window.MIRAdminWizard?.step===4,{timeout:12000});
   assert.equal(await page.locator('#mir-guide-add-po').isVisible(),true);
   assert.equal(await page.locator('#mir-guide-save-model').isVisible(),true);
   const st=await page.evaluate(()=>({
     overflow:getComputedStyle(document.body).overflowY,
     width:document.documentElement.scrollWidth,viewport:innerWidth,
     models:JSON.parse(localStorage.getItem('mir_production_templates_v1')||'{"records":[]}').records.length
   }));
   assert.equal(st.overflow,'hidden');
   assert.ok(st.width<=st.viewport+2,size.name+' débordement horizontal '+JSON.stringify(st));
   assert.equal(st.models,0,'Le dessin ne doit pas créer un modèle automatiquement.');
   await page.screenshot({path:path.join(__dirname,'../artifacts/mir-admin-guide-'+size.name+'.png'),fullPage:true});
   // La fonction enregistrer comme modèle est une option, non un prérequis au bon.
   await page.locator('#mir-guide-save-model').click();
   await page.waitForSelector('#save-production-template',{state:'visible'});
   await page.locator('#save-production-template input[name="name"]').fill('Solin test guidé');
   await page.locator('#save-production-template input[name="store"]').check();
   await page.locator('#save-production-template button[type="submit"]').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mir_production_templates_v1')||'{"records":[]}').records.length===1,{timeout:12000});
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_templates_v1')).records[0].channels.store),true);
   await page.locator('#mir-procurement-tabs [data-mir-tab="store"]').click();
   await page.waitForSelector('.mir-store-card');
   assert.match(await page.locator('.mir-store-card').first().textContent(),/Solin test guidé/);
   await page.locator('#mir-procurement-tabs [data-mir-tab="orders"]').click();
   assert.equal(await page.locator('#mir-procurement-panel [data-mir-po-view]').count(),3);
   await page.locator('[data-mir-po-view="history"]').click();
   assert.match(await page.locator('#mir-procurement-panel').textContent(),/Historique/);
   await page.locator('[data-mir-po-view="create"]').click();
   assert.equal(await page.locator('#mir-create-po').isVisible(),true);
   await page.locator('#mir-procurement-panel [data-mir-tab="suppliers"]').click();
   assert.equal(await page.locator('body').getAttribute('data-mir-tab'),'suppliers');
   assert.deepEqual(errors,[],size.name+' erreurs JS');
   console.log('PASS '+size.name+' guide 4 étapes, miniature 3D, modèle, magasin, bons et fournisseurs');
   await context.close();
  }
  const client=await browser.newPage({viewport:{width:390,height:844}});
  await client.goto(base+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
  await client.waitForFunction(()=>!!window.MIRProductionWorkspace?.version,{timeout:30000});
  assert.equal(await client.locator('body.mir-admin-guided-active').count(),0);
  assert.equal(await client.locator('#mir-guide-3d').count(),0);
  console.log('PASS parcours client non modifié par le guide Admin');
  await client.close();
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
