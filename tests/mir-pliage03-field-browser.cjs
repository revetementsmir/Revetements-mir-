'use strict';
// Actual embedded production UI with a labelled local parent fixture. No backend
// mutations, accounts, customer drafts or external requests are used by this test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{serve}=require('./helpers/mir-static-http.cjs');
const root=path.resolve(__dirname,'..');
const out=path.resolve(process.env.MIR_FIELD_PLIAGE_OUT||'/tmp/mir-pliage03-field-proof');
const publicKey='mir_client_active_profile_v1';
const publicDraft=JSON.stringify({version:1,journeyVersion:2,draft:{kind:'profile',template:'custom',name:'QA client conservé',unit:'in',length:120,quantity:7,startAngle:0,segments:[{label:'A',length:9},{label:'B',length:8}],bends:[{mode:'signed',angle:90}],material:{type:'aluminium'},finish:{},coloredFace:{side:'left',segmentId:'A'}},drawPoints:[[0,0],[228.6,0],[228.6,203.2]],clientStep:2,clientUnlocked:2,clientProfileSelected:true,clientEntry:'configure',tool:'select',colorSystem:'manufacturer',colorId:'',materialId:''});
const publicOrder=JSON.stringify({version:1,order:{id:'QA-CLIENT-UNTOUCHED',items:[],nextNumber:1}});
const report={fixture:'same-origin parent contract + real production.html UI',customerData:false,backendWrites:false,checks:[],captures:[],blocked:[],pageErrors:[]};
const contextData=(owner='worker-a',job='job-a',extra={})=>({personal:true,ownerId:owner,jobId:job,presentation:'pliage03',...extra});
function fixture(data){return `<!doctype html><html lang="fr-CA"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#242522}iframe{display:block;width:100%;height:100dvh;border:0}</style><script>window.MIRFieldDrawingContext=()=>(${JSON.stringify(data).replaceAll('<','\\u003c')});window.__openedCart=0;</script><iframe id="drawing" title="QA fictif du parcours équipe" src="production.html?mode=client&source=store&kind=profile"></iframe><script>document.querySelector('iframe').addEventListener('load',event=>{event.target.contentDocument.addEventListener('click',event=>{const a=event.target.closest('a[href]');if(!a)return;const u=new URL(a.href);if(u.origin===location.origin&&u.pathname.endsWith('/chantier.html')&&u.searchParams.get('view')==='orders'){event.preventDefault();window.__openedCart++;}},true);});</script></html>`;}
async function ready(frame){await frame.waitForFunction(()=>!!window.MIRProductionWorkspace);}
async function state(frame){return frame.evaluate(()=>MIRProductionWorkspace.getLivePreviewState());}
async function stage(frame,n){await frame.waitForFunction(n=>document.body.dataset.clientStage===String(n),n);}
async function layout(frame){const info=await frame.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert.ok(info.scroll<=info.width+1&&info.body<=info.width+1,'no horizontal overflow '+JSON.stringify(info));return info;}
async function shot(page,name){await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled',caret:'hide'});report.captures.push(name+'.png');}
function contrast(a,b){
 const luminance=colour=>{const rgb=colour.match(/[\d.]+/g);assert.ok(rgb&&rgb.length>=3,'computed RGB colour: '+colour);return rgb.slice(0,3).map(Number).map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);};
 const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
async function bankContrast(frame){
 const cards=await frame.locator('#client-model-options [data-client-profile]:visible').evaluateAll(nodes=>nodes.map(button=>{
  const svg=button.querySelector('svg'),line=svg.querySelector('[stroke="currentColor"]'),card=getComputedStyle(button),ink=getComputedStyle(svg);
  return{id:button.dataset.clientProfile,text:card.color,background:card.backgroundColor,ink:ink.color,canvas:ink.backgroundColor,stroke:line&&getComputedStyle(line).stroke};
 }));
 assert.ok(cards.length,'visible bank models');
 for(const card of cards){assert.equal(card.ink,card.text,card.id+' uses the app text ink');assert.equal(card.stroke,card.ink,card.id+' renders its actual currentColor path');assert.ok(contrast(card.stroke,card.canvas)>=3,card.id+' profile contrast');assert.ok(contrast(card.text,card.background)>=4.5,card.id+' title contrast');}
 return{models:cards.length,minProfileContrast:Math.min(...cards.map(c=>contrast(c.stroke,c.canvas))),minTextContrast:Math.min(...cards.map(c=>contrast(c.text,c.background))),ink:cards[0].ink,canvas:cards[0].canvas};
}
async function chooseModel(frame){await frame.locator('#client-choose-model').click();const bank=await bankContrast(frame);await frame.locator('[data-client-profile="l"]').click();await stage(frame,2);await frame.locator('[data-measure="A"]').fill('3.5');await frame.locator('[data-measure="B"]').fill('2.25');await frame.locator('[data-client-bend-angle="0"]').fill('112.5');return bank;}
async function finish(frame){
 await frame.locator('#client-step-next').click();await stage(frame,3);
 await frame.locator('#material-type').selectOption('aluminium');
 await frame.locator('#production-material').selectOption('kaycan-coil-0721-30m');
 const expected=await frame.evaluate(async()=>{const raw=await(await fetch('catalogue-fd6866b49d21.json')).json();return MIRBendingFinishes.catalogue(raw.materials||raw).find(p=>p.id==='kaycan-coil-0721-30m').colors.map(c=>({id:c.id,name:c.name}));});
 const actual=await frame.locator('[data-production-color]').evaluateAll(nodes=>nodes.map(n=>n.dataset.productionColor));
 assert.deepEqual(actual.slice().sort(),expected.map(c=>c.id).sort(),'complete real manufacturer palette');
 const colour=expected.find(c=>c.name==='Sable');assert.ok(colour,'a genuine colour beyond black and white');
 await frame.locator('[data-production-color="'+colour.id+'"]').click();
 const observations=[];
 for(const side of ['left','right']){
  await frame.locator('[data-client-face="'+side+'"]').click();
  const live=await state(frame),drawing=await frame.locator('#production-drawing').evaluate(el=>({base:[...el.querySelectorAll('path[stroke-width="9"]')].map(n=>n.getAttribute('d')),painted:[...el.querySelectorAll('.mir-pliage-painted-surface')].map(n=>({side:n.dataset.paintedSide,d:n.getAttribute('d')}))}));
  assert.equal(live.model.coloredFace.side,side);assert.equal(drawing.painted.length,1);assert.equal(drawing.painted[0].side,side);assert.equal((drawing.painted[0].d.match(/M/g)||[]).length,1);
  observations.push({points:live.model.pointsMM,bends:live.model.bends,drawing});
 }
 assert.deepEqual(observations[0].points,observations[1].points);assert.deepEqual(observations[0].bends,observations[1].bends);assert.deepEqual(observations[0].drawing.base,observations[1].drawing.base);assert.notEqual(observations[0].drawing.painted[0].d,observations[1].drawing.painted[0].d);
 assert.equal((await state(frame)).model.finish.name,'Sable');
 return {paletteCount:expected.length,sides:observations};
}
async function main(){
 fs.mkdirSync(out,{recursive:true});const srv=await serve(path.join(root,'dist'));
 const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']}).catch(async error=>{
  report.passed=false;report.launchError=error.message;
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
  await srv.close();throw error;
 });
 const context=await browser.newContext({viewport:{width:390,height:796},hasTouch:true,locale:'fr-CA',serviceWorkers:'block',reducedMotion:'reduce'});
 let current=contextData();
 await context.addInitScript(({publicKey,publicDraft,publicOrder})=>{
  if(window===window.top&&!localStorage.getItem('__qa_field_seeded')){localStorage.setItem(publicKey,publicDraft);localStorage.setItem('mir_production_client_dossier_v1',publicOrder);localStorage.setItem('__qa_field_seeded','1');}
  const get=Storage.prototype.getItem;window.__qaStorageReads=[];window.__qaRead=key=>get.call(localStorage,key);
  Storage.prototype.getItem=function(key){if(this===localStorage)window.__qaStorageReads.push(key);return get.apply(this,arguments);};
 },{publicKey,publicDraft,publicOrder});
 await context.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===srv.base&&req.method()==='GET'){
   if(url.pathname==='/__field-fixture.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:fixture(current)});
   return route.continue();
  }
  report.blocked.push({url:req.url(),method:req.method()});return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.pageErrors.push(e.message));
 async function open(data){current=data;await page.goto(srv.base+'/__field-fixture.html',{waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>window.MIRFieldDrawingContext?.()),data,'fixture publishes the exact parent context');const frame=page.frames().find(f=>f.url().includes('production.html'));assert.ok(frame);await ready(frame);return frame;}
 async function untouched(frame){
  const data=await frame.evaluate(publicKey=>({reads:window.__qaStorageReads.slice(),publicDraft:window.__qaRead(publicKey),publicOrder:window.__qaRead('mir_production_client_dossier_v1')}),publicKey);
  assert.equal(data.publicDraft,publicDraft,'public active draft byte-identical');assert.equal(data.publicOrder,publicOrder,'public dossier byte-identical');assert.ok(!data.reads.includes(publicKey),'field app never reads public active draft');
 }
 try{
  let frame=await open(contextData());
  assert.equal(await frame.locator('body.mir-pliage03.mir-prestige').count(),1);assert.equal(await frame.locator('#client-step-list button').count(),4);
  for(const button of await frame.locator('#client-step-list button').all())assert.equal(await button.isVisible(),true,'all four steps visible');
  await stage(frame,1);await untouched(frame);await layout(frame);await shot(page,'field-choice-390');
  const keyA=await frame.evaluate(()=>MIRProductionWorkspace.storageKeys.activeProfile);assert.notEqual(keyA,publicKey);
  const bank390=await chooseModel(frame);await layout(frame);await shot(page,'field-measures-390');
  const finishProof=await finish(frame);await layout(frame);await shot(page,'field-finish-390');
  await frame.locator('#client-step-next').click();await stage(frame,4);
  assert.equal(await frame.locator('#production-quantity').inputValue(),'');
  for(const value of ['', '0', '-1', '1.5']){await frame.locator('#production-quantity').fill(value);assert.ok(await frame.locator('#client-step-next').isDisabled());}
  await frame.locator('#production-quantity').fill('2');const configured=(await state(frame)).model;
  await frame.goto(frame.url(),{waitUntil:'networkidle'});await ready(frame);await stage(frame,4);assert.deepEqual((await state(frame)).model.spec,configured.spec,'reload preserves own draft');await layout(frame);await shot(page,'field-review-390');
  const savedDraft=await frame.evaluate(key=>window.__qaRead(key),keyA);assert.ok(savedDraft);
  frame=await open(contextData('worker-a','job-b'));await stage(frame,1);assert.notEqual(await frame.evaluate(()=>MIRProductionWorkspace.storageKeys.activeProfile),keyA);await untouched(frame);
  frame=await open(contextData('worker-b','job-a'));await stage(frame,1);assert.notEqual(await frame.evaluate(()=>MIRProductionWorkspace.storageKeys.activeProfile),keyA);await untouched(frame);
  frame=await open(contextData('worker-a',''));await stage(frame,1);const unassignedKey=await frame.evaluate(()=>MIRProductionWorkspace.storageKeys.activeProfile);assert.ok(unassignedKey.endsWith(':unassigned'));await untouched(frame);
  frame=await open(contextData());await stage(frame,4);assert.deepEqual((await state(frame)).model.spec,configured.spec,'return to own chantier restores its draft');
  await frame.locator('#client-step-next').click();await frame.locator('#production-dialog[open]').waitFor();
  const saved=await frame.evaluate(()=>({order:MIRProductionWorkspace.getEstimationDossier(),cart:MIRUnifiedOrderCart.list()}));
  assert.equal(saved.order.items.length,1);assert.equal(saved.cart.length,1);assert.equal(saved.cart[0].ownerId,'worker-a');assert.equal(saved.cart[0].jobId,'job-a');assert.equal(saved.cart[0].quantity,2);assert.equal(saved.cart[0].snapshot.spec.finish.name,'Sable');assert.deepEqual(saved.order.items[0].snapshot.geometry.pointsMM,configured.pointsMM);
  await shot(page,'field-added-390');await untouched(frame);
  await frame.locator('#production-dialog a.primary-button').click();assert.equal(await page.evaluate(()=>window.__openedCart),1,'cart link handled by app parent');
  await frame.locator('#production-dialog [data-new-client-model]').click();
  const beforeInvalid=(await state(frame)).model.spec;
  for(const quantity of[0,-1,1.5,100001])assert.equal(await frame.evaluate(({id,quantity})=>MIRProductionWorkspace.editFieldOrderItem(id,{quantity}),{id:saved.order.items[0].id,quantity}),false);
  assert.deepEqual((await state(frame)).model.spec,beforeInvalid,'invalid parent quantity cannot mutate the active draft');
  await frame.evaluate(id=>{const line=MIRUnifiedOrderCart.list().find(x=>x.id===id);MIRUnifiedOrderCart.upsert({...line,quantity:6,line:{...line.line,quantity:6}});},saved.cart[0].id);
  assert.equal(await frame.evaluate(id=>MIRProductionWorkspace.editFieldOrderItem(id,{quantity:6}),saved.order.items[0].id),true);
  assert.equal((await state(frame)).model.quantity,6,'editing preserves the newer common cart quantity');
  assert.equal(await frame.evaluate(()=>MIRProductionWorkspace.getEstimationDossier().items[0].spec.quantity),2,'opening edit does not commit a revision');
  await stage(frame,2);await frame.locator('#client-step-next').click();await frame.locator('#client-step-next').click();await stage(frame,4);assert.equal(await frame.locator('#production-quantity').inputValue(),'6');await frame.locator('#production-quantity').fill('4');await frame.locator('#client-step-next').click();
  const revised=await frame.evaluate(()=>({order:MIRProductionWorkspace.getEstimationDossier(),cart:MIRUnifiedOrderCart.list()}));assert.equal(revised.order.items.length,1);assert.equal(revised.cart.length,1);assert.equal(revised.cart[0].quantity,4);assert.deepEqual(revised.order.items[0].snapshot.geometry,saved.order.items[0].snapshot.geometry);assert.ok(revised.order.items[0].history.length);
  assert.equal(await frame.evaluate(()=>MIRProductionWorkspace.editFieldOrderItem('other-worker-item')),false);assert.equal(await frame.evaluate(()=>MIRProductionWorkspace.newPurchaseOrder()),false);assert.equal(await frame.evaluate(()=>MIRProductionWorkspace.openModelFromCurrent()),false);
  report.checks.push({name:'full-personal-journey-isolation-reload-edit-cart',passed:true,bankContrast:bank390,finish:finishProof,keys:{actorJob:keyA,unassigned:unassignedKey}});
  const removed=await frame.evaluate(id=>{
   MIRUnifiedOrderCart.upsert({id:'qa-other-worker-line',kind:'fold',ownerId:'worker-b',jobId:'job-a',quantity:3,line:{itemId:'qa-other',quantity:3},snapshot:{id:'OTHER'}});
   MIRUnifiedOrderCart.upsert({id:'qa-client-line',kind:'fold',quantity:5,line:{itemId:'qa-client',quantity:5},snapshot:{id:'CLIENT'}});
   MIRUnifiedOrderCart.remove(id);
   return{cart:MIRUnifiedOrderCart.list(),dossier:localStorage.getItem(MIRProductionWorkspace.storageKeys.draft)};
  },saved.cart[0].id);
  await frame.goto(frame.url(),{waitUntil:'networkidle'});await ready(frame);
  assert.deepEqual(await frame.evaluate(()=>MIRUnifiedOrderCart.list()),removed.cart,'reloading never restores a removed personal cart line');
  assert.equal(await frame.evaluate(()=>localStorage.getItem(MIRProductionWorkspace.storageKeys.draft)),removed.dossier,'the personal fabrication archive remains byte-identical');
  assert.equal(await frame.evaluate(()=>MIRProductionWorkspace.getEstimationDossier().items.length),1);await untouched(frame);
  report.checks.push({name:'removed-cart-line-stays-removed-with-archive-and-other-scopes-preserved',passed:true});
  frame=await open(contextData('worker-a','job-a',{entry:'models',entryRequestId:'click-models-1'}));await stage(frame,1);assert.equal(await frame.locator('body').getAttribute('data-client-entry'),'models');
  await frame.locator('[data-client-profile="l"]').click();await stage(frame,2);await frame.locator('[data-measure="A"]').fill('5');await frame.locator('[data-measure="B"]').fill('6');
  await frame.goto(frame.url(),{waitUntil:'networkidle'});await ready(frame);await stage(frame,2);assert.equal(await frame.locator('[data-measure="A"]').inputValue(),'5','entry request consumed only once');
  frame=await open(contextData('worker-a','job-a',{entry:'draw',entryRequestId:'click-draw-2'}));await stage(frame,1);assert.equal(await frame.locator('body').getAttribute('data-client-entry'),'draw');assert.equal((await state(frame)).tool,'draw');await layout(frame);await shot(page,'field-draw-390');
  report.checks.push({name:'parent-model-and-drawing-entries-consumed-once',passed:true});
  for(const candidate of [contextData('worker-c','job-c',{presentation:'legacy'}),contextData('','job-c'),contextData('   ','job-c'),{personal:false,ownerId:'worker-c',jobId:'job-c',presentation:'pliage03'}]){
   frame=await open(candidate);assert.equal(await frame.locator('body.mir-pliage03').count(),0);assert.equal(await frame.locator('.mir-pliage03-heading').count(),0);assert.equal(await frame.evaluate(()=>MIRProductionWorkspace.editFieldOrderItem('M001')),false);
  }
  await page.goto(srv.base+'/production.html?mode=client&source=store&kind=profile',{waitUntil:'networkidle'});await ready(page);assert.equal(await page.locator('body.mir-pliage03').count(),0);
  report.checks.push({name:'non-opted-in-store-and-empty-actor-remain-excluded',passed:true});
  await page.setViewportSize({width:834,height:1112});frame=await open(contextData('chef-qa','job-chef',{entry:'models',entryRequestId:'chef-bank'}));await stage(frame,1);await layout(frame);await shot(page,'field-models-834');assert.equal(await frame.locator('#client-step-list button').count(),4);await untouched(frame);
  const bank834=await bankContrast(frame),model=frame.locator('#client-model-options [data-client-profile="l"]');
  const initialBackground=await model.evaluate(el=>getComputedStyle(el).backgroundColor);
  await model.focus();await model.press('Tab');await page.keyboard.press('Shift+Tab');
  const focus=await model.evaluate(el=>{const s=getComputedStyle(el);return{visible:el.matches(':focus-visible'),width:parseFloat(s.outlineWidth),style:s.outlineStyle,ink:s.outlineColor,background:getComputedStyle(document.body).backgroundColor};});
  assert.ok(focus.visible&&focus.width>=2&&focus.style==='solid','keyboard focus is visibly outlined');assert.ok(contrast(focus.ink,focus.background)>=3,'focus ring contrasts with the app background');
  await model.click();await stage(frame,2);await frame.locator('#client-step-back').click();await stage(frame,1);await frame.locator('#client-choose-model').click();
  assert.equal(await model.getAttribute('aria-pressed'),'true','returning to the bank preserves the selected model');
  const selected=await model.evaluate(el=>{const s=getComputedStyle(el);return{width:parseFloat(s.borderTopWidth),ink:s.borderTopColor,background:s.backgroundColor};});
  assert.ok(selected.width>=2);assert.notEqual(selected.background,initialBackground);assert.ok(contrast(selected.ink,selected.background)>=3,'selected border contrasts with its card');
  const selectedBank=await bankContrast(frame);await shot(page,'field-models-selected-834');
  report.checks.push({name:'chef-parent-contract-tablet-model-bank',passed:true,bankContrast:bank834,focus,selected,selectedBankContrast:selectedBank});
  assert.deepEqual(report.pageErrors,[]);report.passed=true;
 }catch(e){report.passed=false;report.error=e.stack;await shot(page,'field-failure').catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');await context.close();await browser.close();await srv.close();}
 console.log('PASS personal Pliage 03: '+report.checks.length+' groups; '+report.captures.length+' real embedded captures; no backend writes.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
