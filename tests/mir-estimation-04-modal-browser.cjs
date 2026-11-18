'use strict';
// Regression of the existing shared estimate modals. Every transport is local;
// external URLs are aborted and notification delivery is captured on loopback.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {createFixture}=require('./helpers/mir-estimate-http-fixture.cjs');
const {serve}=require('./helpers/mir-static-http.cjs');
const {payloadOf,LIMITS}=require('../supabase/functions/_shared/estimate-contract.mjs');
const output=path.join(path.resolve(process.env.MIR_ESTIMATION04_OUT||path.join(__dirname,'../docs/verification/estimation-04-20261118')),'modals');
const plan=Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n');
const sha=b=>createHash('sha256').update(b).digest('hex');
const report={createdAt:new Date().toISOString(),transport:'Loopback HTTP fixture, in-memory mailbox; no real backend',physicalDevices:false,checks:[],failures:[],blocked:[]};
fs.mkdirSync(output,{recursive:true});

// Existing pages divide controls into visible sections. Navigate those public
// selectors instead of forcing hidden controls or changing application state.
async function reveal(p,selector){
 const target=p.locator(selector);await target.waitFor({state:'attached'});if(await target.isVisible())return target;
 const modal=p.locator('dialog[open]'),nav=await modal.count()?modal.locator('[data-mir-section-select]'):p.locator('[data-mir-section-select],#mir-studio-workspace-pages-select');
 for(let index=0;index<await nav.count();index++){
  const select=nav.nth(index);if(!await select.isVisible())continue;
  for(const value of await select.locator('option').evaluateAll(options=>options.map(o=>o.value))){
   await select.selectOption(value);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   if(await target.isVisible())return target;
  }
 }
 throw Error('Aucune section accessible ne révèle '+selector);
}
async function openSource(p,base,source){
 if(source==='bending'){
  await p.goto(base+'/production.html?mode=client&kind=profile');
  await p.locator('#client-draw-profile').click();await p.locator('#client-example-l').click();
  await p.getByRole('button',{name:'Suivant — terminer le dessin',exact:true}).click();
  await p.locator('#client-step-next').click();await p.locator('#material-type').selectOption('aluminium');
  await p.locator('#color-system').selectOption('special');await p.locator('#special-color-system').fill('QA');
  await p.locator('#special-color-code').fill('QA-EST04');await p.locator('[data-client-face="left"]').click();
  await p.locator('#client-step-next').click();await p.locator('#production-quantity').fill('2');
  await p.locator('#client-step-next').click();await p.locator('#production-dialog [data-close-production-dialog]').click();await p.locator('#client-viewport-dossier').click();
  await p.locator('[data-estimate-source=bending]').click();
 }else if(source==='cart'){
  await p.goto(base+'/produit.html?id=kaycan-fascia-6-0480');
  await reveal(p,'#product-add');await p.locator('#product-quantity').fill('2');await p.locator('#product-add').click();
  await p.goto(base+'/selection.html');await p.locator('[data-selection-preview]').waitFor({state:'attached'});await (await reveal(p,'#cart-estimate')).click();
 }else{
  await p.goto(base+'/plan.html');await p.waitForFunction(()=>!!window.MIR_STUDY?.captureEstimation,null,{timeout:90000});
  await (await reveal(p,'[data-estimate-source=studio]')).click();
 }
 await p.locator('#mir-estimate-dialog[open]').waitFor();
 await p.waitForFunction(()=>document.querySelector('#estimate-limits')?.textContent.includes('5 PDF'));
}

(async()=>{
 const site=await serve(path.resolve(__dirname,'../dist'));
 const fixture=await createFixture({origin:site.base,privateBaseUrl:site.base+'/estimation-dossier.html'});
 const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const [width,height] of [[390,844],[834,1112],[1440,900]])for(const source of ['bending','cart','studio']){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<1000,serviceWorkers:'block'});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin===site.base&&url.pathname==='/mir-estimate-config.js')return route.fulfill({contentType:'application/javascript',body:'window.MIREstimateConfig='+JSON.stringify({apiBase:fixture.base+'/api/estimates',environment:'test'})+';'});
    if([site.base,fixture.base].includes(url.origin))return route.continue();
    report.blocked.push({source,width,url:request.url(),method:request.method()});return route.abort();
   });
   try{
    await openSource(page,site.base,source);
    assert.equal(await page.locator('#estimate-form [name=projectType]').count(),0,'Existing modals must not inherit general-page project fields');
    const values={name:'Recette locale '+source+' '+width,email:'capture@example.invalid',phone:'418 555-0100',street:'123 rue Fictive',city:'Saint-Élie-de-Caxton',postalCode:'G0X 2N0',note:'EST04 — garder cette note avec le PDF et la sélection.'};
    for(const [key,value] of Object.entries(values))await (await reveal(page,'#estimate-form [name='+key+']')).fill(value);
    await (await reveal(page,'#estimate-files')).setInputFiles({name:'plan-original-est04.pdf',mimeType:'application/pdf',buffer:plan});
    await page.waitForFunction(async source=>(await MIREstimateDrafts.get(source))?.plans?.length===1,source);
    await page.waitForFunction(()=>!document.querySelector('#estimate-send').disabled);
    await reveal(page,'#estimate-send');
    if(source!=='studio')assert.equal(await page.locator('#estimate-pdf a[download]').isVisible(),true);
    if(width===1440)await page.screenshot({path:path.join(output,source+'-review-'+width+'.png'),fullPage:true});
    const count=fixture.received.size;
    if(source==='cart'&&width===1440){
     fixture.setFail(true);await page.locator('#estimate-send').click();
     await page.getByText('Brouillon conservé. Aucune réception confirmée.',{exact:true}).waitFor();
     assert.equal(fixture.received.size,count);fixture.setFail(false);
    }
    await page.locator('#estimate-send').click();
    await page.locator('#estimate-status').filter({hasText:'Demande reçue'}).waitFor();
    assert.equal(await page.locator('#estimate-send').isDisabled(),true);
    const draft=await page.evaluate(async source=>{const d=await MIREstimateDrafts.get(source);return {requestId:d.requestId,submission:d.submission,received:d.received};},source);
    assert.equal(Object.hasOwn(draft.submission,'projectDetails'),false);
    const stored=await fixture.repository.get(draft.requestId);assert.deepEqual(stored.record.payload,payloadOf(JSON.stringify(draft.submission),LIMITS.maxPayloadBytes));
    assert.equal(stored.record.payload.address.city,values.city);assert.equal(stored.record.payload.note,values.note);
    const original=stored.record.files.find(f=>f.filename==='plan-original-est04.pdf');assert.equal(original.sha256,sha(plan));
    assert.deepEqual(await fixture.repository.file(draft.requestId,original.id),plan);
    if(source==='studio')assert.ok(Array.isArray(stored.record.payload.studio.faces)&&stored.record.payload.studio.faces.length===4);
    else {const dossier=stored.record.files.find(f=>f.field==='dossier');assert.ok(dossier.bytes>10000);assert.equal(sha(await fixture.repository.file(draft.requestId,dossier.id)),dossier.sha256);}
    assert.equal(fixture.received.size,count+1);
    await page.locator('#estimate-close').click();
    // The dialog close event saves the draft asynchronously. Reopen through the
    // visible launcher, after that event, as the public interaction does.
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await (await reveal(page,source==='cart'?'#cart-estimate':'[data-estimate-source='+source+']')).click();
    await page.locator('#estimate-status').filter({hasText:'Demande reçue'}).waitFor();assert.equal(await page.locator('#estimate-send').isDisabled(),true);assert.equal(fixture.received.size,count+1);
    assert.deepEqual(errors,[]);report.checks.push({source,width,height,passed:true,files:stored.record.files.map(f=>({field:f.field,filename:f.filename,bytes:f.bytes,sha256:f.sha256})),projectDetailsAbsent:true,receiptResumed:true});
    console.log('PASS modal '+source+' '+width);
   }catch(error){report.failures.push({source,width,height,message:error.message,stack:error.stack,pageErrors:errors});await page.screenshot({path:path.join(output,source+'-failure-'+width+'.png'),fullPage:true}).catch(()=>{});console.error('FAIL modal '+source+' '+width+': '+error.stack);}
   finally{fixture.setFail(false);await context.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));}
  }
 }finally{await browser.close();await fixture.close();await site.close();}
 if(report.failures.length)process.exitCode=1;
})().catch(error=>{report.failures.push({message:error.stack});fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));console.error(error);process.exitCode=1;});
