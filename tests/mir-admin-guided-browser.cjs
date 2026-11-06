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
  for(const size of [{name:'bureau',width:1440,height:900},{name:'tablette',width:1024,height:768},{name:'tablette-portrait',width:768,height:1024},{name:'mobile',width:390,height:844}]){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.width<1100});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version,{timeout:30000});
   const diagnostics=await page.evaluate(()=>({
     wizard:window.MIRAdminWizard?.version,
     live3d:window.MIRLiveProfile3D?.version,
     active:window.MIRAdminWizard?.active,
     step:window.MIRAdminWizard?.step,
     classes:document.body.className,
     profile:document.body.dataset.profileAdmin,
     tab:document.body.dataset.mirTab,
     editor:document.querySelector('#author-banner')?.hidden,
     cancel:document.querySelector('#cancel-piece-edit')?.hidden,
     controls:!!document.querySelector('#mir-guide-3d'),
     drawing:document.querySelector('#production-drawing')?.getAttribute('data-tool')
   }));
   console.log('GUIDE DIAGNOSTIC '+size.name+' '+JSON.stringify(diagnostics)+' pageerrors '+JSON.stringify(errors));
   await page.waitForFunction(()=>window.MIRAdminWizard?.active,{timeout:15000});
   const names=await page.locator('#mir-procurement-tabs button').allTextContents();
   assert.deepEqual(names,['Créer','Boutique','Magasin employés','Bons de commande']);
   assert.equal(await page.locator('#mir-guide-steps button').count(),4);
   assert.equal(await page.locator('#mir-guide-header').isVisible(),true,'Un seul parcours guidé en haut du dessin');
   assert.equal(await page.locator('#mir-guide-header').evaluate(n=>n.parentElement.classList.contains('production-workspace')),true);
   assert.equal(await page.locator('#drawing-tools [data-draw-tool="draw"]').isVisible(),false,'ancien bouton Terminer masqué pendant le guidage');
   assert.equal(await page.locator('#mir-proc-shortcuts [data-mir-tab="draw"]').isVisible(),false,'ancien raccourci Nouveau dessin masqué');

   assert.equal(await page.locator('body').getAttribute('data-mir-guide-step'),'1');
   assert.equal(await page.locator('#mir-guide-3d').isVisible(),size.width>1150);
   assert.equal(await page.locator('#mir-guide-3d-open').isVisible(),size.width<=1150);
   if(size.width<=1150){
     await page.locator('#mir-guide-3d-open').click();
     assert.equal(await page.locator('#mir-guide-3d').isVisible(),true);
     await page.locator('#mir-guide-3d-close').click();
     assert.equal(await page.locator('#mir-guide-3d').isVisible(),false);
   }
   await page.locator('#production-drawing').scrollIntoViewIfNeeded();
   const rect=await page.locator('#production-drawing').boundingBox();
   assert.ok(rect?.height>(size.width<=650?330:size.width<=1150?440:80),size.name+' canevas iPad trop petit : '+JSON.stringify(rect));
   if(size.width<=1150){
     const doc=await page.evaluate(()=>({scrollHeight:document.scrollingElement.scrollHeight,innerHeight,overflow:getComputedStyle(document.body).overflowY}));
     assert.equal(doc.overflow,'auto',size.name+' le document doit défiler');
     assert.ok(doc.scrollHeight>doc.innerHeight+100,size.name+' les réglages ne doivent pas être coupés : '+JSON.stringify(doc));
   }
   for(const [u,v] of [[.30,.62],[.66,.62],[.66,.35]]){
     const x=rect.x+rect.width*u,y=rect.y+rect.height*v;
     if(size.width<=1150)await page.touchscreen.tap(x,y);
     else await page.mouse.click(x,y);
   }
   await page.waitForFunction(()=>document.querySelector('[data-mir-live-3d="ready"]')!==null,{timeout:12000});
   assert.equal(await page.locator('body.mir-admin-guided-active').count(),1);
   assert.equal(await page.locator('#mir-guide-3d-canvas [data-mir-live-3d="ready"]').count(),1);
   await page.locator('#mir-guide-next').click();
   await page.waitForFunction(()=>window.MIRAdminWizard?.step===2,{timeout:15000});
   assert.equal(await page.locator('#mir-v4-dimensions').evaluate(node=>node.open),true);
   // Les fractions du chantier doivent remplir immédiatement le champ en décimal.
   // Les quatre formats couvrent le 1/16 po, une fraction seule et une cote mixte.
   const firstMeasure=page.locator('#production-dimensions input[data-segment-length="0"]');
   const fractionSelect=page.locator('#production-dimensions input[data-segment-length="0"] + select[data-pick-fraction]');
   assert.equal(await fractionSelect.count(),1,'sélecteur de fraction à côté de la cote A');
   for(const [initial,selection,expected] of [
     ['', '8', '0.5'],      // 1/2
     ['', '4', '0.25'],     // 1/4
     ['', '6', '0.375'],    // 3/8
     ['2 1/4', '8', '2.5'], // conserve les pouces entiers
     ['', '1', '0.0625']   // 1/16
   ]){
     await firstMeasure.fill(initial);
     await fractionSelect.selectOption(selection);
     assert.equal(await firstMeasure.inputValue(),expected,size.name+' choix '+selection+'/16');
     const parsed=await page.evaluate(()=>window.MIRProduction.parseMeasurement(document.querySelector('#production-dimensions input[data-segment-length="0"]').value,'in'));
     assert.ok(parsed.ok&&Math.abs(parsed.value-Number(expected))<1e-10,'conversion exacte du calcul de pliage');
   }
   // Revenir à une cote de chantier ordinaire avant de poursuivre le dossier.
   await firstMeasure.fill('2');

   assert.equal(await page.locator('#mir-guide-add-hem').isVisible(),true,'retour écrasé disponible dans le parcours guidé');
   assert.equal(await page.locator('#mir-guide-extend').isVisible(),true);
   await page.locator('#mir-guide-add-hem').click();
   await page.locator('#end-hem-form').waitFor({state:'visible'});
   assert.equal(await page.locator('#end-hem-form [data-hem-preview]').count(),2);
   const hemPreviews=await page.locator('#end-hem-form [data-hem-preview]').evaluateAll(nodes=>nodes.map(n=>n.innerHTML));
   assert.ok(hemPreviews.every(html=>html.includes('<svg')),'les deux orientations sont calculées depuis le profil');
   assert.notEqual(hemPreviews[0],hemPreviews[1],'les choix de sens doivent être visuellement distincts');
   await page.locator('#end-hem-form [data-close-production-dialog]').click();

   await page.locator('#mir-guide-next').click();
   await page.waitForFunction(()=>window.MIRAdminWizard?.step===3,{timeout:12000});
   assert.equal(await page.locator('#mir-v4-face').isVisible(),false,'ancien choix gauche/droite masqué sous les nouvelles cartes');
   assert.equal(await page.locator('.mir-guide-face-card').count(),2);
   assert.equal(await page.locator('.mir-guide-face-card svg').count(),2,'deux aperçus du profil réel');
   const facePreviews=await page.locator('.mir-guide-face-card svg').evaluateAll(nodes=>nodes.map(n=>n.outerHTML));
   assert.notEqual(facePreviews[0],facePreviews[1],'face verte différente selon le choix');
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
   assert.equal(st.overflow,size.width<=1150?'auto':'hidden');
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
   assert.equal(await page.locator('#mir-procurement-panel .mir-po-tabs [data-mir-po-view]').count(),3);
   await page.locator('[data-mir-po-view="history"]').click();
   assert.match(await page.locator('#mir-procurement-panel').textContent(),/Historique/);
   await page.locator('#mir-procurement-panel .mir-po-tabs [data-mir-po-view="create"]').click();
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
