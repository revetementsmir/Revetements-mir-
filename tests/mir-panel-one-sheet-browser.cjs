'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8909,base='http://127.0.0.1:'+port,artifacts=path.resolve(__dirname,'../artifacts');
const delay=n=>new Promise(r=>setTimeout(r,n));
async function serverReady(){
 for(let i=0;i<75;i++){
  const ok=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;
  await delay(125);
 }
 throw Error('Serveur MIR introuvable');
}
(async()=>{
 fs.mkdirSync(artifacts,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.resolve(__dirname,'../dist')],{stdio:'ignore'});
 let browser;
 try{
  await serverReady();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const screen of [{name:'pc',width:1440,height:900},{name:'ipad',width:1024,height:768},{name:'telephone',width:390,height:844}]){
   const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},hasTouch:screen.width<1100,acceptDownloads:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   page.on('dialog',dialog=>dialog.accept());
   await page.goto(base+'/production.html?view=panels',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace&&!!window.MIRProcurementUI&&!!window.MIRPanelPOPDF);
   await page.evaluate(()=>{
    const E=window.MIRPanelLayout,O=window.MIRPanelLayoutOutput;
    const layout=E.build({widthIn:120,heightIn:96,lipIn:1,columns:5,rows:2,mode:'equal',precisionIn:0});
    if(!layout.ok)throw Error('Répartition invalide');
    const meta={id:'MUR-10-'+Math.round(Math.random()*1000),name:'Mur exemple fictif',revision:'A',project:'Test dix panneaux',
      poNumber:'BC-MIR-10',sourceLabel:'Exemple sans plan client',notes:'EXEMPLE DE TEST - aucune commande',
      dimensionsConfirmed:true,reliefIn:2,material:{type:'aluminium',thickness:'2',thicknessUnit:'mm'},
      finish:{manufacturer:'Unico',name:'Noir fictif',code:'NOIR-TEST',selectionType:'manufacturer'},
      perforation:{enabled:false,edgeId:'bottom',details:''}};
    const payload=O.toTransfer(layout,meta),key='mir_production_admin_dossier_v1';
    const stored=JSON.parse(localStorage.getItem(key)||'null');
    const empty={id:'MIR-DEMO-PANELS-ORDER',poNumber:'',project:'',foreman:'',date:'',revision:'A',notes:'',items:[],layoutImports:[],nextNumber:1};
    const result=O.prepareImport(stored?.order||empty,payload);
    if(!result.ok||result.added!==10)throw Error('Échec de transfert des dix panneaux '+JSON.stringify(result));
    localStorage.setItem(key,JSON.stringify({version:1,order:result.order}));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace&&!!window.MIRProcurementUI);
   await page.locator('[data-mir-wb-pick]').first().waitFor({state:'visible'});
   const tiles=page.locator('[data-mir-wb-pick]');
   await tiles.first().waitFor({state:'visible'});
   assert.equal(await tiles.count(),10,'Dix repères réels du mur, pas dix longues cartes');
   assert.equal(await page.locator('.mir-wb-drawing svg').count(),1,'Une seule pièce grande et cotée à la fois');
   assert.equal(await page.locator('[data-mir-panel-include]').count(),1,'Une seule sélection active');
   assert.equal(new Set(await tiles.evaluateAll(nodes=>nodes.map(el=>el.dataset.mirWbPick))).size,10);
   assert.match(await page.locator('.mir-wb-summary').textContent(),/10 panneaux/);
   const measured=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(measured.scroll<=measured.width+4,'Pas de débordement sur '+screen.name+': '+JSON.stringify(measured));
   await tiles.nth(2).click();
   assert.match(await page.locator('.mir-wb-focus-head').textContent(),/P03/i);
   await page.screenshot({path:path.join(artifacts,'MIR-GODMODE-Panneaux-'+screen.name+'.png'),fullPage:true});
   // L'exclusion est une décision du bon, le panneau original reste sauvegardé.
   await page.locator('[data-mir-panel-include]').uncheck();
   assert.match(await page.locator('.mir-wb-next-action').textContent(),/9 panneau/);
   const prior=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_admin_dossier_v1')).order.items.length);
   assert.equal(prior,10,'Exclure une pièce du bon ne supprime rien');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('[data-mir-wb-pick]').nth(2).click();
   assert.equal(await page.locator('[data-mir-panel-include]').isChecked(),false,'Choix enregistré après rechargement');
   await page.locator('[data-mir-panel-include]').check();
   await page.locator('.mir-wb-manage summary').click();
   await page.locator('[data-mir-panel-all="false"]').click();
   assert.match(await page.locator('.mir-wb-next-action').textContent(),/0 panneau/);
   assert.equal(await page.locator('[data-mir-panel-to-po]').isDisabled(),true);
   await page.locator('[data-mir-panel-all="true"]').click();
   assert.match(await page.locator('.mir-wb-next-action').textContent(),/10 panneau/);
   assert.equal(await page.locator('[data-mir-panel-to-po]').isEnabled(),true);
   await page.locator('[data-mir-panel-to-po]').click();
   await page.locator('#mir-procurement-panel [data-mir-po-piece]').first().waitFor({state:'visible'});
   assert.equal(await page.locator('[data-mir-po-piece]').count(),10,'Dix lignes uniques du bon');
   assert.equal(await page.locator('.mir-po-piece-visual svg').count(),0,'Le récapitulatif ne répète pas dix immenses dessins');
   assert.match(await page.locator('.mir-wb-order-heading').textContent(),/Préparer le bon de commande/);
   await page.locator('[data-mir-po="poNumber"]').fill('BC-MIR-GODMODE-10');
   await page.locator('[data-mir-po="job"]').fill('Chantier démonstration 10 panneaux');
   await page.locator('[data-mir-po="shipTo"]').fill('Lieu fictif de livraison, Québec');
   await page.locator('#mir-create-po').click();
   const error=page.locator('#mir-proc-error');
   if(await error.isVisible())throw Error('Bon invalide : '+await error.textContent());
   await page.locator('[data-mir-order-id]').first().waitFor({state:'visible'});
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_admin_procurement_v1')).orders[0]);
   assert.equal(state.items.length,10,'Bon sauvegardé avec dix lignes');
   assert.equal(state.status,'brouillon','Aucun envoi fournisseur');
   if(screen.name==='pc'){
    const pdf=await page.evaluate(async()=>{
      const order=JSON.parse(localStorage.getItem('mir_admin_procurement_v1')).orders[0];
      const faces=MIRPOWorkflow.pdfFaces(order,MIRProduction);
      const stats={faces:faces.length,duplicates:faces.slice(1).filter(f=>(f.svg.match(/data-mir-panel-main=/g)||[]).length!==1).length};
      const errors=faces.map((face,i)=>{const parsed=new DOMParser().parseFromString(face.svg,'image/svg+xml');const error=parsed.querySelector('parsererror');return error?{page:i+1,error:error.textContent.slice(0,260),svg:face.svg.slice(0,250)}:null;}).filter(Boolean);
      if(errors.length)throw Error('MIR SVG PDF diagnostic '+JSON.stringify(errors));
      const result=await MIRPDF.makePlan({faces,title:'Bon fournisseur MIR - 10 panneaux',subtitle:'DÉMONSTRATION - aucun envoi'});
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(result.blob);});
      return {stats,pages:result.pages,base64:String(data).split(',')[1]};
    });
    assert.equal(pdf.stats.faces,11,'Résumé + une fiche par panneau');
    assert.equal(pdf.stats.duplicates,0,'Chaque fiche contient exactement un dessin');
    assert.equal(pdf.pages,11,'Onze pages PDF réelles');
    const file=path.join(artifacts,'MIR-NOUVEAU-bon-10-panneaux-GODMODE.pdf');
    fs.writeFileSync(file,Buffer.from(pdf.base64,'base64'));
    assert.equal(fs.readFileSync(file).subarray(0,5).toString(),'%PDF-');
    console.log('PASS PDF réel one panel/one sheet '+fs.statSync(file).size+' bytes, '+pdf.pages+' pages');
   }
   await page.screenshot({path:path.join(artifacts,'MIR-GODMODE-Bon-'+screen.name+'.png'),fullPage:true});
   if(screen.name==='pc'){
    await page.goto(base+'/production.html?view=panels',{waitUntil:'domcontentloaded'});
    await page.locator('[data-mir-wb-pick]').first().waitFor({state:'visible'});
    await page.locator('.mir-wb-options summary').click();
    await page.locator('[data-mir-panel-duplicate]').click();
    assert.equal(await page.locator('[data-mir-wb-pick]').count(),11,'Dupliquer volontairement ajoute un repère distinct');
    const ids=await page.locator('[data-mir-wb-pick]').evaluateAll(cards=>cards.map(x=>x.dataset.mirWbPick));
    assert.equal(new Set(ids).size,11,'Une nouvelle pièce garde un identifiant propre');
   }
   assert.deepEqual(errors,[],screen.name+' JS runtime errors');
   await context.close();
   console.log('PASS '+screen.name+' : dix cartes, dix lignes, zéro doublon et source intacte');
  }
 }finally{await browser?.close();server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exitCode=1;});
