'use strict';
/* MIR — recette Chromium du nouvel atelier libre, sans étapes ni profils imposés. */
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
  const sizes=[{name:'bureau',width:1440,height:900},{name:'tablette',width:1024,height:768},
   {name:'tablette-portrait',width:768,height:1024},{name:'mobile',width:390,height:844}];
  for(const size of sizes){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.width<1100});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version&&window.MIRAdminWizard?.active,{timeout:30000});
   const names=await page.locator('#mir-procurement-tabs button').allTextContents();
   assert.deepEqual(names,['Créer','Boutique','Magasin employés','Bons de commande']);
   assert.equal(await page.locator('#mir-guide-steps').count(),0,'plus de guide en 4 étapes');
   assert.equal(await page.locator('#production-templates [data-template]').count(),0,'aucun profil de départ prédéfini');
   assert.equal(await page.locator('.mir-v4-picker').isVisible(),false,'ancien sélecteur de profil masqué');
   assert.equal(await page.locator('#mir-freeform-toolbar').isVisible(),true,'barre du tracé permanente');
   assert.equal(await page.locator('#mir-freeform-3d').isVisible(),true,'miniature 3D sur même page');
   assert.equal(await page.locator('#mir-freeform-client-toggle').isChecked(),false,'boutique désactivée par défaut');
   assert.equal(await page.locator('[data-freeform-undo]').isDisabled(),true,'impossible d effacer un tracé vide');
   await page.locator('[data-freeform-add]').click();
   await page.locator('[data-freeform-add]').click();
   const state=()=>page.evaluate(()=>window.MIRProductionWorkspace.getLivePreviewState());
   let snapshot=await state();
   assert.equal(snapshot.model.segments.length,2,'deux côtés ajoutés sans modèle');
   assert.equal(snapshot.model.valid,true);
   assert.match(await page.locator('#mir-freeform-detected').textContent(),/L/,'la reconnaissance suggère une forme en L');
   assert.equal(await page.locator('#mir-freeform-3d-canvas [data-mir-live-3d="ready"]').count(),1);
   await page.locator('[data-freeform-undo]').click();
   snapshot=await state();
   assert.equal(snapshot.drawPointsMM.length,2,'précédent efface le dernier côté et son pli');
   await page.locator('[data-freeform-redo]').click();
   assert.equal((await state()).model.segments.length,2,'rétablir rend le profil intact');
   await page.locator('[data-freeform-finish]').click();
   assert.equal((await state()).tool,'select','tracé terminé sans changer de page');
   await page.locator('[data-freeform-add]').click();
   assert.equal((await state()).model.segments.length,3,'ajout de côté après cotation');
   await page.locator('[data-freeform-undo]').click();
   assert.equal((await state()).model.segments.length,2,'effacement fonctionne aussi après cotation');
   await page.locator('[data-freeform-redo]').click();
   assert.equal((await state()).model.segments.length,3,'rétablissement depuis cotes');
   assert.equal(await page.locator('#mir-v4-dimensions').evaluate(e=>e.open),true,'cotes visibles');
   const first=page.locator('#production-dimensions input[data-segment-length="0"]');
   const fraction=page.locator('#production-dimensions input[data-segment-length="0"] + select[data-pick-fraction]');
   await first.fill('');
   await fraction.selectOption('8');
   assert.equal(await first.inputValue(),'0.5','fraction 1/2 donne 0.5');
   await first.fill('6');
   const layout=await page.evaluate(()=>{
    const rect=selector=>{const b=document.querySelector(selector).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
    return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,draw:rect('.drawing-card'),settings:rect('.config-card')};
   });
   assert.ok(layout.scroll<=layout.viewport+2,'pas de débordement horizontal '+size.name+' '+JSON.stringify(layout));
   if(size.width>=900){
    assert.ok(layout.settings.left>=layout.draw.right-5,size.name+' : dessin et réglages côte à côte');
   }else assert.ok(layout.settings.top>=layout.draw.bottom-10,size.name+' : panneau disponible en portrait');
   await page.screenshot({path:path.join(__dirname,'../artifacts/mir-admin-guide-'+size.name+'.png'),fullPage:true});
   if(size.name==='bureau'){
    assert.equal(await page.locator('#mir-freeform-save').isDisabled(),false);
    await page.locator('#mir-freeform-save').click();
    await page.locator('#save-production-template').waitFor({state:'visible'});
    assert.equal(await page.locator('#save-production-template input[name="client"]').isChecked(),false,'aucune boutique sans sélection');
    await page.locator('#save-production-template input[name="name"]').fill('Création privée A');
    await page.locator('#save-production-template button[type="submit"]').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mir_production_templates_v1')||'{"records":[]}').records.length===1);
    let records=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_templates_v1')).records);
    assert.equal(records[0].channels.client,false,'création non publiée en boutique');
    await page.locator('#production-library [data-new-model="profile"]').click();
    await page.waitForFunction(()=>window.MIRAdminWizard?.active);
    await page.locator('[data-freeform-add]').click();
    await page.locator('[data-freeform-add]').click();
    await page.locator('#mir-freeform-client-toggle').check();
    await page.locator('#mir-freeform-save').click();
    await page.locator('#save-production-template').waitFor({state:'visible'});
    assert.equal(await page.locator('#save-production-template input[name="client"]').isChecked(),true,'boutique pré-cochée explicitement');
    await page.locator('#save-production-template input[name="name"]').fill('Moulure boutique B');
    await page.locator('#save-production-template button[type="submit"]').click();
    records=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_templates_v1')).records);
    assert.equal(records.length,2);
    assert.equal(records[1].channels.client,true);
    assert.equal(records[1].commercial.status,'draft','la publication serveur et les prix ne sont pas simulés');
    await page.locator('#mir-procurement-tabs [data-mir-tab="store"]').click();
    await page.locator('#mir-procurement-tabs [data-mir-tab="orders"]').click();
    assert.equal(await page.locator('#mir-procurement-panel .mir-po-tabs [data-mir-po-view]').count(),3,'bons préservés');
   }
   assert.deepEqual(errors,[],size.name+' erreurs navigateur');
   console.log('PASS '+size.name+' '+size.width+'x'+size.height+': atelier libre, Précédent, Rétablir, reconnaissance, boutique facultative');
   await context.close();
  }
  const client=await browser.newPage({viewport:{width:390,height:844}});
  await client.goto(base+'/production.html?mode=client&kind=profile',{waitUntil:'domcontentloaded'});
  await client.waitForFunction(()=>!!window.MIRProductionWorkspace?.version,{timeout:30000});
  assert.equal(await client.locator('#mir-freeform-toolbar').count(),0,'refonte admin non chargée en mode client');
  assert.equal(await client.locator('body.mir-freeform-active').count(),0);
  assert.equal(await client.locator('#production-templates [data-template]').count(),0,'client sans profils prédéfinis');
  console.log('PASS parcours client protégé des changements admin et sans profils imposés');
  await client.close();
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
