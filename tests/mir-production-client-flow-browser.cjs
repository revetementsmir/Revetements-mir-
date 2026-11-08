'use strict';
/* MIR — recette navigateur du parcours client (données fictives du Québec).
   Ne change pas la base Supabase et ne transmet aucune commande réelle. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist');
const artifacts=path.resolve(__dirname,'../artifacts');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8',
 '.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp',
 '.png':'image/png','.avif':'image/avif','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 let file;
 try{file=path.resolve(root,'.'+decodeURIComponent((req.url||'/').split('?')[0]));}
 catch{res.writeHead(400);res.end();return;}
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  res.writeHead(404);res.end('Not found');return;
 }
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
 fs.createReadStream(file).pipe(res);
});
function assertPDF(pdf,label){
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-',label+' : signature PDF');
 assert.ok(pdf.length>15000,label+' : les pages et dessins sont réellement exportés');
 assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>=1,label+' : au moins une page');
 assert.ok(pdf.toString('latin1').includes('%%EOF'),label+' : PDF complet');
}
async function verifyNavigation(browser,base){
 for(const width of [360,390,820,1440,2560,3440]){
  const mobile=width<=1100;
  const context=await browser.newContext({viewport:{width,height:850},isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/production.html?mode=client&kind=profile',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('mir-signature')),true,'charte client '+width);
  assert.equal(await page.locator('header.production-header').evaluate(el=>el.classList.contains('mir-client-header')),true,'menu commun '+width);
  const toggle=page.locator('header.production-header .mir-harmony-toggle'),menu=page.locator('#mir-harmony-menu');
  assert.equal(await toggle.isVisible(),true,'menu commun disponible '+width);
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await menu.isVisible(),false);
  assert.ok(await page.locator('.mir-harmony-dossier').isVisible());
  await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  assert.ok(await menu.locator('.mir-production-client-actions .mir-home-estimate').isVisible(),'estimation accessible '+width);
  assert.ok(await menu.locator('a[href="selection.html"]').isVisible(),'dossier complet accessible '+width);
  assert.ok(await menu.locator('a[href="realisations.html"]').isVisible());
  assert.equal(await menu.locator('[data-admin-only]:visible').count(),0,'aucun accès Admin public');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.keyboard.press('Escape');assert.equal(await menu.isVisible(),false);assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
  await toggle.click();await page.mouse.click(3,846);assert.equal(await toggle.getAttribute('aria-expanded'),'false','clic extérieur');
  if(width===390||width===1440||width===3440){
   await page.screenshot({path:path.join(artifacts,'mir-client-parcours-menu-'+width+'.png'),fullPage:false});
  }
  assert.deepEqual(errors,[],'erreurs JavaScript navigation '+width);
  await context.close();
  console.log('PASS Menu MIR client '+width+' px');
 }
 const admin=await browser.newPage({viewport:{width:1440,height:900}});
 await admin.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
 await admin.waitForFunction(()=>!!window.MIRProductionWorkspace);
 assert.equal(await admin.locator('header.production-header .mir-client-menu-toggle').count(),0,'Admin sans menu public');
 assert.equal(await admin.locator('header.production-header nav[aria-label="Navigation du site"] a[data-admin-only]').count(),4,'liens Admin originaux conservés');
 assert.equal(await admin.locator('header.production-header').evaluate(el=>el.classList.contains('mir-client-header')),false,'menu public non activé chez Admin');
 await admin.locator('.mir-harmony-toggle').click();assert.equal(await admin.locator('#mir-procurement-tabs').isVisible(),true,'destinations Admin actives dans le menu commun');
 assert.equal(await admin.locator('body').evaluate(el=>el.classList.contains('mir-signature')),false,'Admin ne change pas de thème');
 await admin.close();
 console.log('PASS Admin isolé du menu public');
}
async function verifyQuoteAndExports(browser,base,width){
 const mobile=width<600;
 const context=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/production.html?mode=client&kind=profile',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
 const next=page.locator('#client-step-next');
 // Le client choisit un dessin de l'atelier MIR préalablement sélectionné pour Boutique.
 // Aucun profil L/J/Z de départ n'est proposé.
 await page.evaluate(()=>{
   const geometry={kind:'profile',template:'custom',unit:'in',name:'Solin de fenêtre dessiné MIR',
     segments:[{label:'A',length:'3 1/2'},{label:'B',length:'2 1/4'}],
     bends:[{mode:'interior',angle:90,direction:'left'}],startAngle:0,
     length:120,quantity:1,material:{type:'aluminium'},finish:{},
     coloredFace:{side:'left',segmentId:'A'}};
   const created=window.MIRProduction.createTemplate(geometry,{name:'Solin de fenêtre dessiné MIR'});
   if(!created.ok)throw Error('Moulure de test non valide : '+JSON.stringify(created.errors));
   const t=created.template;
   const record={id:t.id,name:t.name,currentVersion:1,versions:[t],
     channels:{client:true,store:false,po:true},allowed:{materials:['aluminium','acier'],colorSystems:['manufacturer','special']},
     archived:false,commercial:{status:'draft',wantsClient:true}};
   localStorage.setItem('mir_production_templates_v1',JSON.stringify({version:1,records:[record]}));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
 assert.equal(await page.locator('#production-templates [data-template]').count(),0,'pas de profils prédéfinis');
 await page.locator('[data-saved-template]').click();
 await next.click();
 assert.equal(await page.locator('body').getAttribute('data-client-stage'),'2');
 await page.locator('[data-segment-length="0"]').fill('3 1/2');
 await page.locator('[data-segment-length="1"]').fill('2 1/4');
 assert.equal(await next.isEnabled(),true);
 await next.click();
 assert.equal(await page.locator('[data-measure="length"]').inputValue(),'120');
 assert.equal(await page.locator('[data-measure="length"]').evaluate(el=>el.readOnly),true);
 await next.click();
 await page.locator('[data-client-face="right"]').click();
 await next.click();
 await page.locator('#material-type').selectOption('aluminium');
 await page.locator('#color-system').selectOption('special');
 await page.locator('#special-color-code').fill('QC-CHANTIER-TEST-04');
 assert.equal(await next.isDisabled(),true,'référence spéciale incomplète bloquée');
 await page.locator('#special-color-system').fill('Nuancier client — à confirmer');
 await page.locator('#special-color-name').fill('Anthracite chantier test');
 assert.equal(await next.isEnabled(),true,'référence complète débloquée');
 await next.click();
 const item=await page.evaluate(()=>{
  const saved=JSON.parse(localStorage.getItem('mir_production_client_dossier_v1'));
  return saved?.order?.items?.[0];
 });
 assert.ok(item&&item.snapshot?.schema==='mir-production-instance-1','instantané de pièce et dessin conservé');
 assert.equal(item.spec.material.type,'aluminium');
 assert.equal(item.spec.finish.code,'QC-CHANTIER-TEST-04');
 assert.equal(Number(item.spec.length),120);
 assert.equal(item.spec.coloredFace.side,'right');
 assert.equal(await page.locator('[data-production-item]').count(),1,'une seule pièce créée');
 // Modifier une vraie quantité et les données du chantier dans l’interface client.
 await page.locator('[data-item-quantity]').fill('2');
 const info=page.locator('#order-metadata');
 if(!(await info.evaluate(el=>el.open)))await info.locator('summary').click();
 await page.locator('#order-project').fill('Maison de test MIR — façade avant, Québec');
 await page.locator('#order-po').fill('ESSAI-CLIENT-2026-11');
 await page.locator('#order-foreman').fill('Responsable chantier test');
 await page.locator('#order-date').fill('2026-11-20');
 await page.locator('#order-notes').fill('Solin de fenêtre ; jeu de pose 3/8 po à valider avant fabrication.');
 let persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')).order);
 assert.equal(persisted.items[0].spec.quantity,2);
 assert.equal(persisted.project,'Maison de test MIR — façade avant, Québec');
 assert.equal(persisted.poNumber,'ESSAI-CLIENT-2026-11');
 assert.equal(await page.locator('#prepare-local-request').isEnabled(),true);
 assert.match(await page.locator('#prepare-local-request').textContent(),/soumission/);
 await page.locator('#prepare-local-request').click();
 assert.match(await page.locator('#production-dialog-title').innerText(),/soumission/i);
 const request=await page.evaluate(()=>{
  const saved=JSON.parse(localStorage.getItem('mir_production_requests_v1'));
  return {total:saved?.requests?.length,first:saved?.requests?.[0]};
 });
 assert.equal(request.total,1,'une seule demande');
 assert.equal(request.first.requestKind,'quote','référence personnalisée en soumission');
 assert.equal(request.first.status,'prepared_local','aucune commande transmise');
 assert.equal(request.first.items[0].spec.quantity,2);
 assert.equal(request.first.order.project,persisted.project);
 await page.locator('#production-dialog [data-close-production-dialog]').first().click();
 await page.locator('#prepare-local-request').click();
 const unique=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_requests_v1')).requests.length);
 assert.equal(unique,1,'le double clic ne duplique pas la demande');
 // L’export JSON conserve le même dossier, sans indiquer un achat ou un envoi.
 await page.locator('.production-data-export summary').click();
 const jsonEvent=page.waitForEvent('download');
 await page.locator('#production-json').click();
 const jsonDownload=await jsonEvent;
 assert.equal(jsonDownload.suggestedFilename(),'MIR-dossier-fabrication.json');
 const backup=JSON.parse(fs.readFileSync(await jsonDownload.path(),'utf8'));
 assert.equal(backup.schema,'mir-production-dossier-1');
 assert.equal(backup.localOnly,true);
 assert.equal(backup.transmitted,false);
 assert.equal(backup.order.items.length,1);
 assert.equal(backup.order.items[0].spec.finish.code,'QC-CHANTIER-TEST-04');
 assert.equal(backup.order.items[0].spec.quantity,2);
 assert.equal(backup.order.project,persisted.project);
 // Générer un VRAI PDF. Le module place ensuite un lien de téléchargement explicite.
 await page.locator('#production-pdf').click();
 const link=page.locator('#mir-pdf-ready a[download]');
 await link.waitFor({state:'visible',timeout:90000});
 const pdfEvent=page.waitForEvent('download');
 await link.click();
 const pdfDownload=await pdfEvent;
 assert.match(pdfDownload.suggestedFilename(),/^MIR-demande-soumission-ESSAI-CLIENT-2026-11\.pdf$/);
 const pdf=fs.readFileSync(await pdfDownload.path());
 assertPDF(pdf,'Soumission '+width);
 assert.match(await page.locator('#production-export-status').textContent(),/PDF prêt/);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
 persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')).order);
 assert.equal(persisted.items.length,1,'pièce conservée après rechargement');
 assert.equal(persisted.items[0].spec.quantity,2);
 assert.equal(persisted.project,'Maison de test MIR — façade avant, Québec');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_requests_v1')).requests.length),1,'demande conservée');
 assert.deepEqual(errors,[],'erreurs JavaScript parcours '+width);
 await page.screenshot({path:path.join(artifacts,'mir-client-parcours-dossier-'+width+'.png'),fullPage:false});
 await context.close();
 console.log('PASS Dessin → dossier → soumission → JSON réel → PDF réel → reprise '+width+' px ('+pdf.length+' octets)');
}
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 fs.mkdirSync(artifacts,{recursive:true});
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  await verifyNavigation(browser,base);
  await verifyQuoteAndExports(browser,base,1440);
  await verifyQuoteAndExports(browser,base,390);
 }finally{
  if(browser)await browser.close();
  server.close();
 }
}
run().catch(error=>{console.error(error);server.close();process.exitCode=1;});
