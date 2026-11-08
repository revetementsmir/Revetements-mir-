'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8902,base='http://127.0.0.1:'+port;
const artifacts=path.resolve(__dirname,'../artifacts');
const pause=ms=>new Promise(done=>setTimeout(done,ms));
async function ready(){
 for(let i=0;i<75;i++){
  const yes=await new Promise(resolve=>http.get(base+'/calepinage.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(yes)return;
  await pause(130);
 }
 throw Error('Serveur du site MIR indisponible');
}
(async()=>{
 fs.mkdirSync(artifacts,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.resolve(__dirname,'../dist')],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const screen of [{name:'pc',width:1440,height:900},{name:'ipad',width:1024,height:768},{name:'telephone',width:390,height:844}]){
   const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},hasTouch:screen.width<1100,acceptDownloads:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',d=>d.accept());
   await page.goto(base+'/calepinage.html',{waitUntil:'domcontentloaded'});
   await page.locator('#load-example').click();
   await page.waitForFunction(()=>document.querySelector('#piece-count')?.textContent?.includes('8 panneaux'));
   await page.locator('#columns').fill('5');await page.locator('#columns').press('Tab');
   assert.match(await page.locator('#piece-count').textContent(),/10 panneaux/);
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-synced-pieces'),'10');
   await page.locator('#project-name').fill('Chantier 10 panneaux');
   await page.locator('#project-name').press('Tab');
   await page.locator('#po-number').fill('MIR-BC-10');
   await page.locator('#po-number').press('Tab');
   await page.locator('#dimensions-confirmed').check();
   assert.equal(await page.locator('#send-production').isEnabled(),true);
   assert.match(await page.locator('#send-production').textContent(),/10 panneaux/);
   await page.screenshot({path:path.join(artifacts,'mir-mur-10-avant-bon-'+screen.name+'.png'),fullPage:true});
   await Promise.all([
    page.waitForURL(u=>u.pathname.endsWith('/production.html')&&u.searchParams.get('destination')==='bon',{timeout:25000}),
    page.locator('#send-production').click()
   ]);
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace&&!!window.MIRProcurementUI);
   assert.equal(await page.locator('#create-panel-po').isVisible(),true,'Le mur entier propose un bon fournisseur');
   assert.match(await page.locator('#panel-layout-import').textContent(),/10 panneaux/);
   await page.locator('#create-panel-po').click();
   await page.locator('#mir-procurement-panel [data-mir-po-piece]').first().waitFor({timeout:25000});
   assert.equal(await page.locator('[data-mir-po-piece]').count(),10,'10 pièces, pas une par action');
   const proof=await page.evaluate(()=>{
    const d=JSON.parse(localStorage.getItem('mir_production_admin_dossier_v1')).order;
    return {items:d.items.map(i=>({id:i.id,kind:i.kind,source:i.sourceLayout?.sourcePieceId})),receiptCount:d.layoutImports?.length};
   });
   assert.equal(proof.items.length,10);assert.equal(proof.receiptCount,1);
   assert.equal(new Set(proof.items.map(i=>i.source)).size,10);
   assert.ok(proof.items.every(i=>i.kind==='panel'),'Aucune pièce profil de pliage substituée');
   assert.match(await page.locator('.mir-po-editor-heading').textContent(),/10 panneau/);
   assert.ok(await page.locator('.mir-po-piece-visual svg').count()>=10,'Vrai SVG pour chaque pièce');
   assert.equal(await page.locator('[data-mir-po="job"]').inputValue(),'Chantier 10 panneaux');
   assert.equal(await page.locator('[data-mir-po="poNumber"]').inputValue(),'MIR-BC-10');
   await page.locator('[data-mir-po="shipTo"]').fill('12 rue fictive, Québec');
   await page.locator('[data-mir-po="shipTo"]').press('Tab');
   await page.locator('#mir-create-po').click();
   if(await page.locator('#mir-proc-error').isVisible())throw Error((await page.locator('#mir-proc-error').textContent())||'Échec bon fournisseur');
   await page.locator('[data-mir-order-id]').first().waitFor({timeout:15000});
   const supplierOrder=await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('mir_admin_procurement_v1'));
    return {count:state.orders.length,items:state.orders[0]?.items.length,status:state.orders[0]?.status,ref:state.orders[0]?.poNumber};
   });
   assert.deepEqual(supplierOrder,{count:1,items:10,status:'brouillon',ref:'MIR-BC-10'});
   if(screen.name==='pc'){
    const receipt=await page.evaluate(async()=>{
     const po=JSON.parse(localStorage.getItem('mir_admin_procurement_v1')).orders[0];
     const finished={...po,items:po.items.map(item=>({...item,spec:{
      ...item.spec,relief:'2',material:{type:'aluminium',thickness:'2',thicknessUnit:'mm'},
      finish:{manufacturer:'Unico',name:'Noir fictif test',code:'NOIR-TEST',selectionType:'manufacturer'},
      perforation:{enabled:false,edgeId:item.spec.bottomEdgeId||'bottom'}
     }}))};
     const model=window.MIRProduction;
     const pending=finished.items.filter(item=>!model.buildPanel(item.spec).complete).map(item=>({id:item.id,pending:model.buildPanel(item.spec).validation.pending}));
     if(pending.length)throw Error('PDF bloqué par les fiches de test : '+JSON.stringify(pending));
     const faces=window.MIRPOWorkflow.pdfFaces(finished,model);
     const pdf=await window.MIRPDF.makePlan({faces,title:'MIR · bon de 10 panneaux',subtitle:'Essai chantier fictif'});
     const bytes=new Uint8Array(await pdf.blob.arrayBuffer());
     return {pages:pdf.pages?.length||faces.length,size:bytes.length,header:String.fromCharCode(...bytes.slice(0,5)),faces:faces.length};
    });
    assert.equal(receipt.header,'%PDF-','PDF réel et pas une capture ou un dessin PNG');
    assert.ok(receipt.size>25000,'Le PDF possède une taille crédible : '+JSON.stringify(receipt));
    assert.ok(receipt.faces>=6,'Couverture et dessins individuels des 10 panneaux');
    console.log('PASS PDF fournisseur réel : '+JSON.stringify(receipt));
   }
   await page.screenshot({path:path.join(artifacts,'mir-mur-10-bon-'+screen.name+'.png'),fullPage:true});
   // Revoir la même révision ne doit pas insérer 10 panneaux une seconde fois.
   await page.goto(base+'/production.html?destination=bon',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
   assert.equal(await page.locator('#open-panel-po').count(),1,'Révision déjà importée reconnue');
   const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_admin_dossier_v1')).order.items.length);
   assert.equal(count,10,'Pas de doublons après rechargement');
   assert.deepEqual(errors,[],'Aucune erreur JavaScript '+screen.name);
   await context.close();
   console.log('PASS MIR mur → 10 panneaux → bon fournisseur : '+screen.name);
  }
 }finally{
  await browser?.close();server.kill('SIGTERM');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
