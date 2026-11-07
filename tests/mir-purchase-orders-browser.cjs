'use strict';
const {drawTwoSides}=require('./mir-draw-freeform-helper.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),{createHash}=require('node:crypto');
const port=8883,base='http://127.0.0.1:'+port;
const hash=b=>createHash('sha256').update(b).digest('hex');
(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});let browser;
  try{
    for(let n=0;n<50;n++){if(await new Promise(resolve=>http.get(base,r=>{r.resume();resolve(r.statusCode===200);}).on('error',()=>resolve(false))))break;await new Promise(r=>setTimeout(r,100));}
    browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
    for(const size of [{width:1440,height:900},{width:1024,height:900},{width:390,height:844}]){
      const context=await browser.newContext({viewport:size,acceptDownloads:true}),page=await context.newPage(),errors=[];
      const dismiss=d=>{console.log('DIALOG '+d.message());return d.dismiss();};page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dismiss);
      await page.goto(base+'/production.html');await page.waitForFunction(()=>window.MIRProductionWorkspace);
      await drawTwoSides(page);
      await page.locator('[data-freeform-finish]').click();
      await page.locator('#production-piece-name').fill('Solin test 3½');
      await page.locator('#mir-direct-po-add').click();await page.locator('#mir-po-form input[name="po"]').fill('PO-PDF-01');await page.locator('#mir-po-form button[type="submit"]').click();
      // Explicit, known finish fixture for PDF validity; direct drawing and PO
      // addition above use the real UI. No model is created.
      await page.evaluate(()=>{const key='mir_production_admin_dossier_v1',data=JSON.parse(localStorage.getItem(key));const item=data.order.items[0],result=MIRProduction.reviseInstance({snapshot:item.snapshot,history:[]},{finish:{name:'Noir',manufacturer:'Test',code:'NOIR'},material:{type:'acier',gauge:'26'}});if(!result.ok)throw Error('Fixture finition invalide');item.spec=result.spec;item.snapshot=result.snapshot;item.history=result.history;localStorage.setItem(key,JSON.stringify(data));});
      await page.reload();await page.waitForFunction(()=>window.MIRProductionWorkspace);
      await page.locator('#mir-procurement-tabs [data-mir-tab="orders"]').click();await page.locator('.mir-po-tabs [data-mir-po-view="create"]').click();
      await page.locator('[data-mir-po="job"]').fill('École test');await page.locator('[data-mir-po="shipTo"]').fill('123 rue Test');
      await page.reload();await page.waitForFunction(()=>window.MIRProductionWorkspace);
      await page.locator('#mir-procurement-tabs [data-mir-tab="orders"]').click();await page.locator('.mir-po-tabs [data-mir-po-view="create"]').click();
      assert.equal(await page.locator('[data-mir-po="shipTo"]').inputValue(),'123 rue Test','form draft autosave');
      await page.locator('#mir-create-po').click();if(await page.locator('#mir-proc-error').isVisible())throw Error(await page.locator('#mir-proc-error').textContent());await page.waitForSelector('[data-mir-order-id]');
      const get=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mir_admin_procurement_v1')));
      let state=await get();assert.equal(state.orders.length,1);const originalId=state.orders[0].id;
      const originalItems=JSON.stringify(state.orders[0].items);
      await page.locator('[data-mir-review]').click();assert.equal(await page.locator('#mir-send-review button:disabled').count(),1);
      await page.locator('#mir-send-review [data-mir-po-view="pending"]').click();
      const faces=await page.evaluate(()=>{const po=JSON.parse(localStorage.getItem('mir_admin_procurement_v1')).orders[0];return MIRPOWorkflow.pdfFaces(po,MIRProduction).map(f=>f.svg);});
      assert.ok(faces[0].includes('123 rue Test'));assert.ok(faces.slice(1).join('').includes('Noir'));
      const download=page.waitForEvent('download');await page.locator('[data-mir-pdf]').click();const file=await (await download).path();const pdf=fs.readFileSync(file);
      assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>20000,'real PDF drawing bytes');
      assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>=2,'cover and drawings');
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mir_admin_procurement_v1')).orders[0].pdf);
      state=await get();assert.equal(state.orders[0].pdf.sha256,hash(pdf));
      await page.locator('[data-mir-review]').click();
      // Le plugin PDF natif de Chromium peut interrompre la navigation blob:
      // ou faire planter le runner headless. Le vrai PDF a déjà été téléchargé,
      // contrôlé (%PDF-, pages, SHA-256). Vérifier ici que l'action demande
      // l'ouverture de CE blob PDF, sans charger le lecteur natif en CI.
      await page.evaluate(()=>{
        const original=URL.createObjectURL.bind(URL);
        URL.createObjectURL=blob=>{
          const url=original(blob);
          if(blob.type==='application/pdf')window.__mirPreviewPdfURL=url;
          return url;
        };
        window.__mirPreviewOpenCount=0;
        window.__mirPreviewTarget='';
        window.open=()=>{
          window.__mirPreviewOpenCount++;
          return {location:{set href(url){window.__mirPreviewTarget=url;}},close(){}};
        };
      });
      await page.locator('[data-mir-preview]').click();
      await page.waitForFunction(()=>String(window.__mirPreviewTarget||'').startsWith('blob:'));
      const previewIntent=await page.evaluate(()=>({
        count:window.__mirPreviewOpenCount,url:window.__mirPreviewTarget,
        pdf:window.__mirPreviewPdfURL
      }));
      assert.equal(previewIntent.count,1,'Prévisualiser doit demander une seule fenêtre');
      assert.match(previewIntent.pdf||'',/^blob:/,'Un Blob PDF doit être préparé');
      assert.equal(previewIntent.url,previewIntent.pdf,'La fenêtre doit recevoir le PDF réellement généré');
      // L'affichage visuel du PDF natif reste à vérifier sur appareil réel.

      await page.locator('[data-mir-open]').click();await page.waitForSelector('#mir-create-po');
      // Les notes sont dans « Autres détails (facultatifs) » : l'ouvrir comme un utilisateur.
      await page.locator('details.mir-po-extra > summary').click();
      await page.locator('[data-mir-po="notes"]').fill('Révision test');
      await page.locator('#mir-edit-lines').click();
      await page.locator('[data-duplicate-piece]').click();assert.equal(await page.locator('[data-production-item]').count(),2);
      await page.locator('[data-remove-piece]').last().click();assert.equal(await page.locator('[data-production-item]').count(),1);
      await page.locator('[data-item-quantity]').fill('4');await page.locator('[data-item-quantity]').dispatchEvent('change');
      await page.locator('#mir-procurement-tabs [data-mir-tab="orders"]').click();await page.locator('.mir-po-tabs [data-mir-po-view="create"]').click();
      await page.locator('#mir-create-po').click();if(await page.locator('#mir-proc-error').isVisible())throw Error(await page.locator('#mir-proc-error').textContent());await page.waitForSelector('[data-mir-order-id]');
      state=await get();assert.equal(state.orders.length,2);assert.equal(state.orders.find(o=>o.id===originalId).items&&JSON.stringify(state.orders.find(o=>o.id===originalId).items),originalItems);
      const revised=state.orders.find(o=>o.id!==originalId);assert.equal(revised.revision,2);assert.equal(revised.notes,'Révision test');assert.equal(revised.items[0].spec.quantity,4);
      const changed=page.waitForEvent('download');await page.locator('[data-mir-order-id="'+revised.id+'"] [data-mir-pdf]').click();const changedPdf=fs.readFileSync(await (await changed).path());assert.notEqual(hash(changedPdf),hash(pdf));
      await page.waitForFunction(id=>JSON.parse(localStorage.getItem('mir_admin_procurement_v1')).orders.find(o=>o.id===id).pdf,revised.id);
      const again=page.waitForEvent('download');await page.locator('[data-mir-order-id="'+originalId+'"] [data-mir-pdf]').click();const pdf2=fs.readFileSync(await (await again).path());assert.equal(hash(pdf2),hash(pdf),'exact original PDF retained');
      await page.reload();await page.waitForFunction(()=>window.MIRProductionWorkspace);await page.locator('#mir-procurement-tabs [data-mir-tab="orders"]').click();
      assert.equal(await page.locator('[data-mir-order-id]').count(),2);
      await page.locator('#mir-po-search').fill('Introuvable');assert.equal(await page.locator('[data-mir-order-id]').count(),0);await page.locator('#mir-po-search').fill('PO-PDF-01');assert.equal(await page.locator('[data-mir-order-id]').count(),2);
      await page.locator('[data-mir-order-id="'+originalId+'"] [data-mir-order-status]').selectOption('termine');
      await page.locator('.mir-po-tabs [data-mir-po-view="history"]').click();assert.equal(await page.locator('[data-mir-order-id]').count(),1);
      await page.locator('[data-mir-order-id="'+originalId+'"] summary').click();
      page.removeListener('dialog',dismiss);page.once('dialog',dialog=>dialog.accept('PO-REPEAT-02'));
      await page.locator('[data-mir-repeat="'+originalId+'"]').click();page.on('dialog',dismiss);
      assert.equal(await page.locator('[data-mir-po="poNumber"]').inputValue(),'PO-REPEAT-02');
      state=await get();assert.equal(state.orders.length,3);assert.equal(state.orders.find(o=>o.poNumber==='PO-REPEAT-02').revision,1);
      assert.equal(state.orders.find(o=>o.id===originalId).pdf.sha256,hash(pdf));
      assert.deepEqual(errors,[]);const metrics=await page.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth}));assert.ok(metrics.s<=metrics.w+2);
      await page.screenshot({path:path.join(__dirname,'../artifacts/po-workflow-'+size.width+'.png'),fullPage:true});
      console.log('PASS '+size.width+': ajout direct, autosauvegarde, PDF réel et original, révision, recherche, envoi désactivé');await context.close();
    }
  }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
