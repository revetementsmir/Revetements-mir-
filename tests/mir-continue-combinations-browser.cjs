'use strict';
const {openMirTab}=require('./mir-navigation-helper.cjs');
/* MIR — cinq combinaisons explicites entre Mes pliages et bon de commande.
 * Les créations directes au bon ne doivent jamais entrer dans la bibliothèque. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {drawTwoSides}=require('./mir-draw-freeform-helper.cjs');
const port=8891,base='http://127.0.0.1:'+port;
async function ready(){for(let i=0;i<80;i++){const ok=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));if(ok)return;await new Promise(r=>setTimeout(r,150));}throw Error('Serveur MIR indisponible');}
async function start(browser,{width=1440,height=900}={}){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<1100});
 const page=await context.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version&&window.MIRAdminWizard?.active,{timeout:30000});
 return {page,context,errors};
}
async function saved(page){
 return page.evaluate(()=>({
  templates:JSON.parse(localStorage.getItem('mir_production_templates_v1')||'{"records":[]}').records,
  order:JSON.parse(localStorage.getItem('mir_production_admin_dossier_v1')||'{"order":{"items":[]}}').order
 }));
}
async function menu(page){await drawTwoSides(page);await page.locator('.mir-action-bar .mir-workspace-primary').click();await page.locator('#mir-continue-save').waitFor();}
async function storeModel(page,name){
 await page.locator('#save-production-template').waitFor({state:'visible'});
 await page.locator('#save-production-template input[name="name"]').fill(name);
 await page.locator('#save-production-template button[type="submit"]').click();
 await page.locator('#save-production-template').waitFor({state:'hidden'});
}
(async()=>{
 fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--directory',path.join(__dirname,'../dist'),'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
  await ready();browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  // 1. Enregistrer uniquement. Aucun dossier ne reçoit la moulure.
  {
   const {page,context,errors}=await start(browser);
   await menu(page);await page.locator('[data-mir-continue-action="save"]').click();
   await storeModel(page,'Moulure pour bibliothèque seule');
   let value=await saved(page);
   assert.equal(value.templates.length,1);
   assert.equal(value.order.items.length,0);
   await openMirTab(page,'models');
   assert.equal(await page.locator('.model-library-card').count(),1);
   assert.deepEqual(errors,[]);
   await context.close();console.log('PASS enregistrer seulement');
  }
  // 2. Nouveau bon sans Mes pliages.
  {
   const {page,context,errors}=await start(browser);
   await menu(page);await page.locator('[data-mir-continue-action="new"]').click();
   await page.waitForFunction(()=>document.body.dataset.mirTab==='orders');
   const value=await saved(page);
   assert.equal(value.templates.length,0);
   assert.equal(value.order.items.length,1);
   assert.equal(await page.locator('[data-mir-po-piece]').count(),1);
   assert.match(await page.locator('[data-mir-po-piece]').first().textContent(),/Longueur :|Longueur/);
   assert.match(await page.locator('[data-mir-po-piece]').first().textContent(),/Quantité/);
   assert.equal(await page.locator('[data-mir-po-supplier]').count(),4,'quatre fournisseurs intégrés');
   await page.locator('[data-mir-po-supplier="breton"]').click();
   assert.equal(await page.locator('[data-mir-po="supplierId"]').inputValue(),'breton');
   const qty=page.locator('[data-mir-po-qty]').first();
   await qty.fill('3');await qty.press('Tab');
   assert.equal((await saved(page)).order.items[0].spec.quantity,3,'quantité synchronisée avec le dossier');
   await page.locator('[data-mir-po-qty]').first().fill('0');
   await page.locator('[data-mir-po-qty]').first().press('Tab');
   assert.equal((await saved(page)).order.items[0].spec.quantity,3,'quantité invalide refusée');
   assert.deepEqual(errors,[]);
   await context.close();console.log('PASS nouveau bon seulement et fournisseur/quantité');
  }
  // 3. Enregistrer + créer un bon, puis 4. Enregistrer + ajouter au bon
  // et 5. Ajouter au bon sans créer de deuxième modèle.
  {
   const {page,context,errors}=await start(browser);
   await menu(page);
   await page.locator('#mir-continue-save').check();
   await page.locator('[data-mir-continue-action="new"]').click();
   await storeModel(page,'Moulure enregistrée et nouveau bon');
   await page.waitForFunction(()=>document.body.dataset.mirTab==='orders');
   let value=await saved(page);
   assert.equal(value.templates.length,1,'un modèle créé');
   assert.equal(value.order.items.length,1,'une ligne ajoutée');
   const savedModel=value.templates[0];
   assert.equal(savedModel.commercial.status,'draft','aucune publication implicite');
   assert.equal(value.order.items[0].snapshot.schema,'mir-production-instance-1');
   // Numéro d'un bon existant simulé, en conservant le vrai dossier/snapshot.
   await page.evaluate(()=>{
    const key='mir_production_admin_dossier_v1',saved=JSON.parse(localStorage.getItem(key));
    saved.order.poNumber='PO-TEST-EXISTANT-1';
    localStorage.setItem(key,JSON.stringify(saved));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.MIRAdminWizard?.active);
   await menu(page);
   await page.locator('#mir-continue-save').check();
   await page.locator('[data-mir-continue-action="existing"]').click();
   await storeModel(page,'Autre moulure réutilisable et bon existant');
   await page.locator('[data-open-po][data-po-intent="add"]').first().waitFor();
   await page.locator('[data-open-po][data-po-intent="add"]').first().click();
   await page.waitForFunction(()=>document.body.dataset.mirTab==='orders');
   value=await saved(page);
   assert.equal(value.templates.length,2,'deux modèles sauvegardés explicitement');
   assert.equal(value.order.items.length,2,'deux pièces dans le même bon');
   assert.equal(value.order.poNumber,'PO-TEST-EXISTANT-1','bon conservé');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.MIRAdminWizard?.active);
   await menu(page);
   await page.locator('[data-mir-continue-action="existing"]').click();
   await page.locator('[data-open-po][data-po-intent="add"]').first().click();
   await page.waitForFunction(()=>document.body.dataset.mirTab==='orders');
   value=await saved(page);
   assert.equal(value.templates.length,2,'ajouter au bon seulement ne crée pas de modèle');
   assert.equal(value.order.items.length,3,'une seule nouvelle pièce à chaque confirmation');
   assert.equal(value.order.poNumber,'PO-TEST-EXISTANT-1');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(__dirname,'../artifacts/mir-continue-combinations-desktop.png'),fullPage:true});
   await context.close();console.log('PASS combinaisons enregistrer + nouveau/existant puis PO seulement');
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
