'use strict';
/* Recette réelle Chrome MIR : SVG seul ajoute les côtés; Continuer ouvre
 * le menu final combinable, jamais une étape de configuration. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {pointOnDrawing,tapDrawing,drawTwoSides}=require('./mir-draw-freeform-helper.cjs');
const port=8851,base='http://127.0.0.1:'+port;
async function ready(){
 for(let i=0;i<80;i++){
  const ok=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await new Promise(r=>setTimeout(r,150));
 }
 throw Error('Serveur de test MIR indisponible');
}
async function state(page){return page.evaluate(()=>window.MIRProductionWorkspace.getLivePreviewState());}
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
   const nav=await page.locator('#mir-procurement-tabs button').allTextContents();
   assert.deepEqual(nav,['Créer','Mes pliages','Boutique','Magasin employés','Bons de commande']);
   assert.equal(await page.locator('#mir-guide-steps').count(),0,'aucune navigation obligatoire en quatre pages');
   assert.equal(await page.locator('#production-templates [data-template]').count(),0,'aucun profil prédéfini');
   assert.equal(await page.locator('.mir-v4-picker').isVisible(),false,'ancien sélecteur masqué');
   assert.equal(await page.locator('#mir-freeform-toolbar').isVisible(),true,'barre de tracé présente');
   assert.equal(await page.locator('[data-freeform-redo]').count(),0,'Rétablir supprimé');
   assert.equal(await page.locator('[data-freeform-add]').count(),0,'Ajouter un côté supprimé');
   assert.match(await page.locator('[data-freeform-next]').innerText(),/Continuer/);
   assert.equal(await page.locator('[data-freeform-next]').isDisabled(),true,'Continuer attend une forme dessinée');
   assert.equal(await page.locator('#mir-freeform-client-toggle').isChecked(),false,'Boutique décochée');
   assert.equal(await page.locator('#mir-freeform-store-toggle').isChecked(),false,'Magasin décoché');
   assert.equal(await page.locator('#mir-freeform-3d').isVisible(),true,'3D sur la même page');
   assert.equal(await page.locator('[data-freeform-undo]').isDisabled(),true,'aucun côté à effacer au départ');

   // Aucune interaction en dehors du vrai SVG ne doit créer de segment.
   await page.locator('.drawing-head').click({position:{x:8,y:8}});
   await page.locator('#mir-freeform-3d-canvas').click({position:{x:18,y:18}});
   await page.locator('#mir-freeform-destination').click({position:{x:7,y:7}});
   await page.locator('#production-drawing').evaluate(node=>{
    node.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:0,clientY:0}));
   });
   assert.equal((await state(page)).drawPointsMM.length,0,'clic hors tableau sans création de point');
   await drawTwoSides(page);
   assert.equal((await state(page)).model.segments.length,2,'deux côtés tracés depuis le SVG');
   assert.equal((await state(page)).model.valid,true);
   assert.match(await page.locator('#mir-freeform-detected').textContent(),/L/);
   assert.equal(await page.locator('#mir-freeform-3d-canvas [data-mir-live-3d="ready"]').count(),1);

   const drawingBefore=JSON.stringify((await state(page)).drawPointsMM);
   for(const selector of ['.drawing-head','#mir-freeform-3d-canvas','#mir-freeform-destination']){
    await page.locator(selector).click({position:{x:7,y:7}});
    assert.equal(JSON.stringify((await state(page)).drawPointsMM),drawingBefore,'clic hors SVG ne crée pas de côté : '+selector);
   }
   // Glisser depuis le tableau puis terminer nettement à l’extérieur : annuler ce geste.
   const inside=await pointOnDrawing(page,395,190);
   const bounds=await page.locator('#production-drawing').boundingBox();
   const outside={x:Math.max(4,bounds.x-18),y:inside.y};
   await page.mouse.move(inside.x,inside.y);
   await page.mouse.down();
   await page.mouse.move(outside.x,outside.y,{steps:5});
   await page.mouse.up();
   assert.equal(JSON.stringify((await state(page)).drawPointsMM),drawingBefore,'relâcher hors du tableau annule le nouveau trait');
   if(size.width<1100){
     // Vrai événement tactile : capture du doigt puis sortie du SVG.
     const start=await pointOnDrawing(page,395,190);
     const stageBox=await page.locator('#production-drawing').boundingBox();
     const endpoint={x:Math.max(4,stageBox.x-18),y:start.y};
     const cdp=await context.newCDPSession(page);
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+35,y:start.y+7}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[endpoint]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     assert.equal(JSON.stringify((await state(page)).drawPointsMM),drawingBefore,'le doigt relâché hors tableau n’ajoute jamais de côté');
   }

   await page.locator('[data-freeform-undo]').click();
   assert.equal((await state(page)).drawPointsMM.length,2,'Précédent efface le dernier côté');
   await tapDrawing(page,440,140);
   assert.equal((await state(page)).model.segments.length,2,'nouveau trait créé uniquement sur le tableau');

   // « Continuer » est l'unique ouverture du choix de sortie. Aucun sous-écran
   // n'impose de progression parmi mesures, angles, couleurs et destinations.
   const geometry=JSON.stringify((await state(page)).model.pointsMM);
   await page.locator('[data-freeform-next]').click();
   assert.equal(await page.locator('#production-dialog').evaluate(node=>node.open),true,'Continuer ouvre le dialogue final');
   assert.match(await page.locator('#production-dialog-title').textContent(),/moulure/i);
   assert.equal(await page.locator('[data-mir-continue-action]').count(),3,'Enregistrer, bon existant, nouveau bon');
   assert.equal(await page.locator('#mir-continue-save').isChecked(),false,'aucun enregistrement implicite');
   assert.equal(JSON.stringify((await state(page)).model.pointsMM),geometry,'Continuer ne modifie aucun côté');
   assert.equal((await state(page)).tool,'select','les cotes restent modifiables');
   assert.equal(await page.locator('#mir-v4-dimensions').evaluate(node=>node.open),true,'mesures toujours sur la même page');
   await page.locator('#production-dialog [data-close-production-dialog]').click();
   assert.equal(JSON.stringify((await state(page)).model.pointsMM),geometry,'fermer sans toucher au dessin');

   const first=page.locator('#production-dimensions input[data-segment-length="0"]');
   const fraction=page.locator('#production-dimensions input[data-segment-length="0"] + select[data-pick-fraction]');
   await first.fill('');
   await fraction.selectOption('8');
   assert.equal(await first.inputValue(),'0.5','fraction 1/2 = 0.5');
   await first.fill('6');

   const positions=await page.evaluate(()=>{
    const box=selector=>{const b=document.querySelector(selector).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
    const root=document.documentElement;
    return {scrollWidth:root.scrollWidth,viewport:innerWidth,draw:box('.drawing-card'),settings:box('.config-card')};
   });
   assert.ok(positions.scrollWidth<=positions.viewport+2,'pas de débordement horizontal '+size.name+' '+JSON.stringify(positions));
   if(size.width>=900)assert.ok(positions.settings.left>=positions.draw.right-5,'deux colonnes en paysage');
   else assert.ok(positions.settings.top>=positions.draw.bottom-10,'colonne de réglages accessible en portrait');
   if(size.width===1440){
    const scroll=await page.evaluate(()=>({body:getComputedStyle(document.body).overflowY,config:getComputedStyle(document.querySelector('.config-card')).overflowY,
      mainBottom:document.querySelector('#production-main').getBoundingClientRect().bottom,viewport:innerHeight}));
    assert.equal(scroll.body,'hidden','PC fixe sans défilement de page');
    assert.equal(scroll.config,'auto','réglages défilables dans leur panneau');
    assert.ok(scroll.mainBottom<=scroll.viewport+2);
   }
   await page.screenshot({path:path.join(__dirname,'../artifacts/mir-admin-guide-'+size.name+'.png'),fullPage:true});
   if(size.name==='bureau'){
    await page.locator('#mir-freeform-store-toggle').check();
    await page.locator('#mir-freeform-save').click();
    await page.locator('#save-production-template').waitFor({state:'visible'});
    assert.equal(await page.locator('#save-production-template input[name="store"]').isChecked(),true,'Magasin repris de son interrupteur');
    assert.equal(await page.locator('#save-production-template input[name="client"]').isChecked(),false,'Boutique reste indépendante');
    await page.locator('#save-production-template input[name="name"]').fill('Solin employés ABC');
    await page.locator('#save-production-template button[type="submit"]').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mir_production_templates_v1')||'{"records":[]}').records.length===1);
    const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_templates_v1')).records);
    assert.equal(records[0].channels.store,true);
    assert.equal(records[0].channels.client,false);
    assert.equal(records[0].commercial.status,'draft','Boutique sans publication implicite');
    await page.locator('#mir-procurement-tabs [data-mir-tab="models"]').click();
    assert.equal(await page.locator('#production-library .model-library-card').count(),1,'Mes pliages contient le pliage enregistré');
   }
   assert.deepEqual(errors,[],size.name+' erreurs de page');
   console.log('PASS '+size.name+' : SVG seul, Continuer sans trait, deux interrupteurs, PC/iPad et commandes protégés');
   await context.close();
  }
  const client=await browser.newPage({viewport:{width:390,height:844}});
  await client.goto(base+'/production.html?mode=client&kind=profile',{waitUntil:'domcontentloaded'});
  await client.waitForFunction(()=>!!window.MIRProductionWorkspace?.version,{timeout:30000});
  assert.equal(await client.locator('#mir-freeform-toolbar').count(),0,'atelier admin non chargé chez client');
  assert.equal(await client.locator('#production-templates [data-template]').count(),0);
  await client.close();
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
