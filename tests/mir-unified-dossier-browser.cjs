'use strict';
/* MIR — vrai parcours unifié matériaux + pièce cotée, sans nouvelle sauvegarde. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist');
const assets=path.resolve(__dirname,'../artifacts');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.avif':'image/avif'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(dist,'.'+decodeURIComponent((req.url||'/').split('?')[0]));}catch{res.writeHead(400);res.end();return;}
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
 fs.createReadStream(file).pipe(res);
});
async function runAt(browser,base,width){
 const context=await browser.newContext({viewport:{width,height:width<=600?844:900},acceptDownloads:true,reducedMotion:'reduce',hasTouch:width<=600,isMobile:width<=600});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/production.html?mode=client&kind=profile',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
 const next=page.locator('#client-step-next');
 await page.evaluate(()=>{
  const spec={kind:'profile',template:'custom',unit:'in',
   segments:[{label:'A',length:'3 1/2'},{label:'B',length:'2 1/4'}],
   bends:[{mode:'interior',angle:90,direction:'left'}],startAngle:0,
   length:120,quantity:1,material:{type:'aluminium'},finish:{},coloredFace:{side:'left',segmentId:'A'}};
  const generated=window.MIRProduction.createTemplate(spec,{name:'Solin généré dans Atelier MIR'});
  if(!generated.ok)throw Error('Forme test non valide');
  const t=generated.template;
  localStorage.setItem('mir_production_templates_v1',JSON.stringify({version:1,records:[
   {id:t.id,name:t.name,currentVersion:1,versions:[t],channels:{client:true,store:false,po:true},
    archived:false,allowed:{materials:['aluminium','acier'],colorSystems:['manufacturer','special']},
    commercial:{status:'draft',wantsClient:true}}]}));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
 assert.equal(await page.locator('#production-templates [data-template]').count(),0,'modèles enregistrés distincts des formes de départ');
 await page.locator('#client-choose-model').click();
 await page.locator('[data-saved-template]').click();
 await page.locator('[data-segment-length="0"]').fill('3 1/2');
 await page.locator('[data-segment-length="1"]').fill('2 1/4');
 await next.click();assert.equal(await page.locator('[data-measure="length"]').inputValue(),'120');
 await next.click();await page.locator('[data-client-face="left"]').click();await next.click();
 await page.locator('#material-type').selectOption('aluminium');
 await page.locator('#color-system').selectOption('special');
 await page.locator('#special-color-system').fill('Nuancier spécial Québec test');
 await page.locator('#special-color-code').fill('QC-TEST-NOIR-2026');
 await page.locator('#special-color-name').fill('Noir personnalisé');
 await next.click();
 const metadata=page.locator('#order-metadata');
 if(!(await metadata.evaluate(el=>el.open)))await metadata.locator('summary').click();
 await page.locator('#order-project').fill('Chalet de Québec');
 await page.locator('#order-po').fill('MIR-TEST-LOCAL-001');
 await page.locator('#order-notes').fill('Aucune commande transmise; détails à valider.');
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')).order);
 assert.equal(original.items.length,1);
 assert.equal(original.items[0].spec.finish.code,'QC-TEST-NOIR-2026');
 assert.equal(original.items[0].snapshot.schema,'mir-production-instance-1');
 const material=await page.evaluate(async()=>{
  const response=await fetch('catalogue-fd6866b49d21.json');
  const catalog=await response.json();
  const m=catalog.materials.find(item=>item.id==='hardieplank-select-625')||
    catalog.materials.find(item=>item.colors?.length&&item.brand&&item.name&&item.status!=='pending_identity');
  if(!m)throw Error('Référence matériau de test introuvable.');
  const item={materialId:m.id,brand:m.brand,name:m.name,
   colorId:m.colors?.[0]?.id||null,colorName:m.colors?.[0]?.name||'À confirmer',
   formatId:null,format:null,formatName:null,quantity:55,unit:'pi²'};
  localStorage.setItem('mir-shopping-list-v1',JSON.stringify({version:1,project:'Chalet de Québec',items:[item]}));
  return item;
 });
 await page.goto(base+'/selection.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelectorAll('#selection-items [data-selection-preview]').length===1&&
  document.querySelector('#mir-unified-pdf')?.disabled===false,{timeout:30000});
 assert.equal(await page.locator('#mir-unified-pieces li').count(),1);
 assert.match(await page.locator('#mir-unified-pieces').innerText(),/QC-TEST-NOIR-2026/);
 assert.equal(await page.locator('#mir-unified-count').innerText(),'1 pièce sur mesure');
 assert.equal(await page.locator('#mir-unified-associate').isVisible(),false);
 assert.equal(await page.locator('#mir-unified-json').isEnabled(),true);
 const before=await page.evaluate(()=>Object.keys(localStorage).sort());
 const getJson=page.waitForEvent('download');
 await page.locator('#mir-unified-json').click();
 const json=await getJson;
 assert.equal(json.suggestedFilename(),'MIR-dossier-complet-Chalet-de-Quebec.json');
 const data=JSON.parse(fs.readFileSync(await json.path(),'utf8'));
 assert.equal(data.schema,'mir-unified-client-dossier-1');
 assert.equal(data.localOnly,true);assert.equal(data.transmitted,false);
 assert.equal(data.status,'preparation_locale_non_commandee');
 assert.equal(data.materials.items.length,1);
 assert.equal(data.materials.items[0].materialId,material.materialId);
 assert.equal(data.materials.items[0].quantity,55);
 assert.equal(data.pieces.order.items.length,1);
 assert.deepEqual(data.pieces.order.items[0].snapshot,original.items[0].snapshot);
 assert.equal(data.pieces.order.poNumber,'MIR-TEST-LOCAL-001');
 assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).sort()),before,'aucune troisième sauvegarde');
 await page.locator('#mir-unified-pdf').click();
 await page.locator('#mir-pdf-ready a[download]').waitFor({state:'visible',timeout:90000});
 const downloadEvent=page.waitForEvent('download');
 await page.locator('#mir-pdf-ready a[download]').click();
 const pdfDownload=await downloadEvent;
 assert.equal(pdfDownload.suggestedFilename(),'MIR-dossier-complet-Chalet-de-Quebec.pdf');
 const pdf=fs.readFileSync(await pdfDownload.path());
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 assert.ok(pdf.length>25000,'dessins réels présents dans le PDF');
 assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>=2,'au moins pages matériaux et pliages');
 assert.match(await page.locator('#mir-unified-export-status').innerText(),/Dossier complet prêt/);
 assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).sort()),before,'PDF sans sauvegarde supplémentaire');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#mir-unified-json')?.disabled===false);
 assert.equal(await page.locator('#mir-unified-pieces li').count(),1,'reprise sans doublon');
 assert.equal(await page.locator('#selection-items .selection-item').count(),1,'matériau conservé');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')).order.items[0].snapshot),original.items[0].snapshot);
 // Un autre projet ne doit jamais être fusionné.
 await page.evaluate(()=>{
  const key='mir_production_client_dossier_v1',v=JSON.parse(localStorage.getItem(key));
  v.order.project='Autre chantier';localStorage.setItem(key,JSON.stringify(v));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#mir-unified-message')?.textContent.includes('Projets différents'));
 assert.equal(await page.locator('#mir-unified-json').isDisabled(),true);
 assert.equal(await page.locator('#mir-unified-pdf').isDisabled(),true);
 // Un nom absent peut être associé explicitement, sans modifier les pièces.
 await page.evaluate(()=>{
  const key='mir_production_client_dossier_v1',v=JSON.parse(localStorage.getItem(key));
  v.order.project='';localStorage.setItem(key,JSON.stringify(v));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#mir-unified-associate')?.hidden===false);
 await page.locator('#mir-unified-associate').click();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')).order);
 assert.equal(after.project,'Chalet de Québec');
 assert.deepEqual(after.items[0].snapshot,original.items[0].snapshot);
 assert.equal(await page.locator('#mir-unified-json').isEnabled(),true);
 // Les anciennes listes rapides ne peuvent être omises silencieusement.
 await page.evaluate(()=>localStorage.setItem('mir-bending-v1',JSON.stringify({version:1,project:'Chalet de Québec',items:[{profile:'l',dimensions:{A:3,B:2},lengthIn:120,quantity:1}]})));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#mir-unified-message')?.textContent.includes('ancien(s) pliage(s)'));
 assert.equal(await page.locator('#mir-unified-pdf').isDisabled(),true,'anciens pliages bloquent un PDF faussement complet');
 const overflow=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(overflow.scroll<=overflow.inner+2,'pas de débordement '+width+' '+JSON.stringify(overflow));
 assert.deepEqual(errors,[],'aucune erreur JS '+width);
 await page.screenshot({path:path.join(assets,'mir-dossier-commun-'+width+'.png'),fullPage:false});
 await context.close();
 console.log('PASS dossier MIR '+width+' px : matériaux, moulure, JSON, PDF réel ('+pdf.length+' octets), reprise, sécurité projets et ancien stockage');
}
async function main(){
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 fs.mkdirSync(assets,{recursive:true});
 let browser;
 try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const base='http://127.0.0.1:'+server.address().port;
  for(const width of [1440,390])await runAt(browser,base,width);
 }finally{if(browser)await browser.close();server.close();}
}
main().catch(err=>{console.error(err);server.close();process.exitCode=1;});