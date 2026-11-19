'use strict';
// Actual embedded production UI with a labelled local parent fixture. No backend
// mutations, accounts, customer drafts or external requests are used by this test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright'),{serve}=require('./helpers/mir-static-http.cjs'),{tapTraceFraction}=require('./helpers/mir-field-trace-touch.cjs');
const root=path.resolve(__dirname,'..');
const out=path.resolve(process.env.MIR_FIELD_PLIAGE_OUT||'/tmp/mir-pliage03-field-proof');
const publicKey='mir_client_active_profile_v1';
const publicDraft=JSON.stringify({version:1,journeyVersion:2,draft:{kind:'profile',template:'custom',name:'QA client conservé',unit:'in',length:120,quantity:7,startAngle:0,segments:[{label:'A',length:9},{label:'B',length:8}],bends:[{mode:'signed',angle:90}],material:{type:'aluminium'},finish:{},coloredFace:{side:'left',segmentId:'A'}},drawPoints:[[0,0],[228.6,0],[228.6,203.2]],clientStep:2,clientUnlocked:2,clientProfileSelected:true,clientEntry:'configure',tool:'select',colorSystem:'manufacturer',colorId:'',materialId:''});
const publicOrder=JSON.stringify({version:1,order:{id:'QA-CLIENT-UNTOUCHED',items:[],nextNumber:1}});
const report={fixture:'same-origin parent contract + real production.html UI',customerData:false,backendWrites:false,checks:[],captures:[],blocked:[],pageErrors:[]};
const contextData=(owner='worker-a',job='job-a',extra={})=>({personal:true,ownerId:owner,jobId:job,presentation:'pliage03',...extra});
function nativeFieldStyle(){
 // Execute the actual native mount style declaration. The regression must not
 // silently omit (or duplicate) native scroll margins again.
 const source=fs.readFileSync(path.join(root,'mobile/web/bootstrap.js'),'utf8');
 const block=source.match(/const controlScrollMargin=[\s\S]*?document\.head\.append\(style\);/);
 assert.ok(block,'native field scroll-margin declaration is present');
 const styles=[];
 vm.runInNewContext(block[0],{fieldPliageFrame:true,document:{createElement:()=>({textContent:''}),head:{append:style=>styles.push(style.textContent)}}});
 assert.equal(styles.length,1);return styles[0];
}
function fixture(data,{height=null,width=null}={}){const bounded=Number.isFinite(height)&&height>0,narrow=Number.isFinite(width)&&width>0;return `<!doctype html><html lang="fr-CA"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#242522}.qa-chrome{box-sizing:border-box;height:160px;padding:28px 16px;color:#c6c3ba;font:14px Arial,sans-serif}iframe{display:block;width:${narrow?width+'px':'100%'};max-width:100%;height:${bounded?height+'px':'100dvh'};margin-inline:auto;border:0}</style><script>window.MIRFieldDrawingContext=()=>(${JSON.stringify(data).replaceAll('<','\\u003c')});window.__openedCart=0;</script>${bounded?'<header class="qa-chrome">Fixture locale équipe · iframe courte '+height+' px</header>':''}<iframe id="drawing" title="QA fictif du parcours équipe" src="production.html?mode=client&source=store&kind=profile"></iframe><script>document.querySelector('iframe').addEventListener('load',event=>{event.target.contentDocument.addEventListener('click',event=>{const a=event.target.closest('a[href]');if(!a)return;const u=new URL(a.href);if(u.origin===location.origin&&u.pathname.endsWith('/chantier.html')&&u.searchParams.get('view')==='orders'){event.preventDefault();window.__openedCart++;}},true);});</script></html>`;}
async function ready(frame){await frame.waitForFunction(()=>!!window.MIRProductionWorkspace);}
async function state(frame){return frame.evaluate(()=>MIRProductionWorkspace.getLivePreviewState());}
async function stage(frame,n){await frame.waitForFunction(n=>document.body.dataset.clientStage===String(n),n);}
async function layout(frame){const info=await frame.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert.ok(info.scroll<=info.width+1&&info.body<=info.width+1,'no horizontal overflow '+JSON.stringify(info));return info;}
async function shot(page,name){await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled',caret:'hide'});report.captures.push(name+'.png');}
async function settled(frame){await frame.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});}
async function traceLayout(frame,height,{expanded=false}={}){
 await settled(frame);
 const proof=await frame.evaluate(()=>{
  const rect=node=>{const r=node.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
  const controls=[...document.querySelectorAll('#field-trace-toolbar select,#field-trace-expand,.client-trace-actions button')].map(node=>{const r=rect(node),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return{id:node.id||node.getAttribute('aria-label')||node.textContent.trim(),rect:r,hit:hit===node||node.contains(hit),disabled:node.disabled};});
  const svg=document.querySelector('#production-drawing svg'),view=svg.viewBox.baseVal,m=svg.getScreenCTM();
  return{width:innerWidth,height:innerHeight,expanded:document.body.dataset.fieldTraceExpanded==='true',toolbar:rect(document.querySelector('#field-trace-toolbar')),grid:rect(document.querySelector('#production-drawing')),projection:{width:view.width*Math.hypot(m.a,m.b),height:view.height*Math.hypot(m.c,m.d)},controls,fullscreen:!!document.fullscreenElement,overflow:document.documentElement.scrollWidth>innerWidth+1,removed:document.querySelectorAll('#client-point-x,#client-point-y,.client-keyboard-trace,.client-trace-options,#client-example-l').length};
 });
 assert.equal(proof.width,355);assert.equal(proof.height,height);assert.equal(proof.expanded,expanded);
 assert.equal(proof.removed,0,'X/Y, keyboard points, trace options and example are absent from the field UI');
 assert.equal(proof.fullscreen,false,'expansion stays in the iframe and preserves Android system data');
 assert.equal(proof.overflow,false);assert.ok(proof.toolbar.bottom<=proof.grid.top+1,'scale and expand sit above the grid');
 assert.ok(proof.grid.height>=100,'a usable drawing surface stays visible');
 for(const control of proof.controls){assert.ok(control.rect.height>=44,control.id+' has a touch-sized target');assert.ok(control.rect.top>=0&&control.rect.bottom<=height+1&&control.rect.left>=0&&control.rect.right<=355+1,control.id+' is inside the iframe');if(!control.disabled)assert.equal(control.hit,true,control.id+' is unobstructed');}
 return proof;
}
async function seedPersonalProfile(frame,spec){
 // Only this synthetic worker/chantier draft is seeded. Rendering, pagination,
 // keyboard edits and navigation below execute the production controllers.
 await frame.evaluate(spec=>{const model=MIRProduction.buildProfile(spec);if(!model.valid)throw Error('Invalid compact QA profile');localStorage.setItem(MIRProductionWorkspace.storageKeys.activeProfile,JSON.stringify({version:1,journeyVersion:2,draft:spec,drawPoints:model.pointsMM,clientStep:2,clientUnlocked:2,clientProfileSelected:true,clientEntry:'draw',tool:'select',clientModelAngles:spec.bends,colorSystem:'manufacturer',colorId:'',materialId:'',selectedTemplate:null}));},spec);
 await frame.goto(frame.url(),{waitUntil:'networkidle'});await ready(frame);await stage(frame,2);await settled(frame);
}
async function compactLayout(frame,{expectHem=false,width=393}={}){
 await settled(frame);
 const proof=await frame.evaluate(()=>{
  const rect=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,right:r.right,bottom:r.bottom,left:r.left};};
  const visible=node=>node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden';
  const required=[...document.querySelectorAll('#production-dimensions input,#client-step-back,#client-step-next,#client-reset-model-angles,#client-hem-options,.client-measure-pages button')].filter(visible);
  const controls=required.map(node=>{const r=rect(node),clipped=[];for(let p=node.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=rect(p);if(/hidden|clip|auto|scroll/.test(s.overflowY)&&(r.top<b.top-1||r.bottom>b.bottom+1))clipped.push(p.id||p.className||p.tagName);}return{id:node.id||node.getAttribute('aria-label')||node.dataset.segmentLength||node.dataset.clientBendAngle||node.textContent.trim(),rect:r,clipped};});
  const preview=document.querySelector('#production-drawing'),svg=preview.querySelector('svg'),form=document.querySelector('#client-step-scroll'),first=document.querySelector('.client-measure-field:not([hidden])');
  const markers=[...preview.querySelectorAll('.profile-side-marker')].map(group=>{const text=group.querySelector('text'),matrix=text.getScreenCTM(),font=parseFloat(getComputedStyle(text).fontSize);return{label:group.dataset.markerLabel,text:text.textContent.replace(/\s+/g,' ').trim(),rect:rect(text),fontCSS:font*Math.hypot(matrix.c,matrix.d)};});
  const base=preview.querySelector('path[stroke-width="9"]'),segments=[];let point;
  if(base){const matrix=base.getScreenCTM(),screen=pair=>{const p=new DOMPoint(...pair).matrixTransform(matrix);return{x:p.x,y:p.y};};for(const command of base.getAttribute('d').match(/[MLA][^MLA]*/g)||[]){const type=command[0],values=command.slice(1).trim().split(/[ ,]+/).map(Number),next=values.slice(-2);if(type==='L')segments.push({a:screen(point),b:screen(next)});point=next;}}
  const model=MIRProductionWorkspace.getLivePreviewState().model;
  return{width:innerWidth,height:innerHeight,body:{height:document.body.clientHeight,scroll:document.body.scrollHeight,top:document.body.scrollTop},document:{height:document.documentElement.clientHeight,scroll:document.documentElement.scrollHeight,top:scrollY},form:{height:form.clientHeight,scroll:form.scrollHeight,top:form.scrollTop},preview:rect(preview),first:rect(first),controls,markers,segments,presentation:svg?.dataset.measurementPresentation,visibleSides:[...document.querySelectorAll('.client-measure-field:not([hidden])')].map(n=>Number(n.dataset.fieldMeasureIndex)),visibleAngles:[...document.querySelectorAll('.client-angle-field:not([hidden])')].map(n=>Number(n.dataset.angleIndex)),expected:model.segments.map(s=>({label:s.label,value:MIRProduction.formatMeasurement(s.lengthMM,model.unit).replace(/\s+/g,' ').trim()}))};
 });
 assert.equal(proof.width,width);assert.equal(proof.height,500,'the actual child viewport is 500px, not the full device viewport');
 for(const [name,value]of Object.entries({body:proof.body,document:proof.document,form:proof.form})){assert.ok(value.scroll<=value.height+1,name+' has no hidden or scrollable vertical overflow: '+JSON.stringify(value));assert.equal(value.top,0,name+' does not require scrolling');}
 assert.ok(proof.preview.bottom<=proof.first.top+1,'the entire drawing is above the measure fields');
 assert.ok(proof.preview.height>=140,'a usable preview remains above the fixed fields');
 assert.ok(proof.controls.length>=7,'measures, angles and navigation are actually rendered');
 for(const control of proof.controls){assert.ok(control.rect.width>0&&control.rect.height>0,control.id+' has a hit target');assert.ok(control.rect.left>=-1&&control.rect.right<=proof.width+1&&control.rect.top>=-1&&control.rect.bottom<=proof.height+1,control.id+' stays inside the real iframe: '+JSON.stringify(control.rect));assert.deepEqual(control.clipped,[],control.id+' is not hidden by a clipped ancestor');}
 assert.equal(await frame.locator('[data-client-angle-nudge]').count(),0,'no angle +/- remains in the field DOM');
 for(const input of await frame.locator('[data-client-bend-angle]:visible').all()){assert.equal(await input.getAttribute('inputmode'),'numeric');assert.equal(await input.getAttribute('step'),'1');}
 if(expectHem){
  assert.equal(proof.presentation,'dimensions','the three requested measurements are shown directly on the drawing');
  assert.deepEqual(proof.visibleSides,[0,1,2]);assert.deepEqual(proof.visibleAngles,[0,1]);
  for(const expected of proof.expected){const marker=proof.markers.find(m=>m.label===expected.label);assert.ok(marker,'side marker '+expected.label);assert.ok(marker.text.includes(expected.value),expected.label+' includes its real measured value');assert.ok(marker.fontCSS>=11,expected.label+' text is readable in CSS pixels: '+marker.fontCSS);assert.ok(marker.rect.left>=proof.preview.left-1&&marker.rect.right<=proof.preview.right+1&&marker.rect.top>=proof.preview.top-1&&marker.rect.bottom<=proof.preview.bottom+1,expected.label+' is not clipped');}
  assert.equal(proof.segments.length,3);
  const b=proof.segments[1],c=proof.segments[2],bY=(b.a.y+b.b.y)/2,cY=(c.a.y+c.b.y)/2,cLabel=proof.markers.find(m=>m.label==='C'),bLabel=proof.markers.find(m=>m.label==='B');
  assert.ok(cY<bY-2,'the actual C return is drawn above B');assert.ok(cLabel.rect.bottom<cY,'C stays outside and above its return');assert.ok(bLabel.rect.top>bY,'B stays outside and below its own flange');
 }
 return proof;
}
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
async function chooseModel(frame){await frame.locator('#client-choose-model').click();const bank=await bankContrast(frame);await frame.locator('[data-client-profile="l"]').click();await stage(frame,2);await frame.locator('[data-measure="A"]').fill('3.5');await frame.locator('[data-measure="B"]').fill('2.25');await frame.locator('[data-client-bend-angle="0"]').fill('112.5');await frame.locator('[data-client-bend-angle="0"]').press('Tab');assert.equal(await frame.locator('[data-client-bend-angle="0"]').inputValue(),'113','pasted decimal angles become whole degrees');assert.equal((await state(frame)).model.bends[0].angle,113,'the model matches the visible integer angle');return bank;}
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
 let current=contextData(),fixtureOptions={};
 await context.addInitScript(({publicKey,publicDraft,publicOrder})=>{
  if(window===window.top&&!localStorage.getItem('__qa_field_seeded')){localStorage.setItem(publicKey,publicDraft);localStorage.setItem('mir_production_client_dossier_v1',publicOrder);localStorage.setItem('__qa_field_seeded','1');}
  const get=Storage.prototype.getItem;window.__qaStorageReads=[];window.__qaRead=key=>get.call(localStorage,key);
  Storage.prototype.getItem=function(key){if(this===localStorage)window.__qaStorageReads.push(key);return get.apply(this,arguments);};
 },{publicKey,publicDraft,publicOrder});
 await context.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===srv.base&&req.method()==='GET'){
   if(url.pathname==='/__field-fixture.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:fixture(current,fixtureOptions)});
   if(fixtureOptions.native&&url.pathname==='/production.html'){
    const source=fs.readFileSync(path.join(root,'dist/production.html'),'utf8');
    const native='<link rel="stylesheet" href="/__qa-native-team.css"><style id="qa-native-mount-style">'+nativeFieldStyle()+'</style><script>document.documentElement.dataset.mirNative="true";</script>';
    return route.fulfill({contentType:'text/html; charset=utf-8',body:source.replace('</head>',native+'</head>')});
   }
   if(url.pathname==='/__qa-native-team.css')return route.fulfill({contentType:'text/css; charset=utf-8',body:fs.readFileSync(path.join(root,'mobile/web/team.css'),'utf8')});
   return route.continue();
  }
  report.blocked.push({url:req.url(),method:req.method()});return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.pageErrors.push(e.stack||e.message));
 async function open(data,options={}){current=data;fixtureOptions=options;await page.goto(srv.base+'/__field-fixture.html',{waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>window.MIRFieldDrawingContext?.()),data,'fixture publishes the exact parent context');const frame=page.frames().find(f=>f.url().includes('production.html'));assert.ok(frame);await ready(frame);return frame;}
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
  await frame.goto(frame.url(),{waitUntil:'networkidle'});await ready(frame);await stage(frame,4);assert.deepEqual((await state(frame)).model.spec,configured.spec,'reload preserves own draft');await layout(frame);await settled(frame);
  const reviewLabels=await frame.evaluate(()=>{
   const host=document.querySelector('#production-drawing').getBoundingClientRect();
   return [...document.querySelectorAll('#production-drawing .profile-side-marker text,#production-drawing .mir-angle-annotation text')].map(node=>{
    const matrix=node.getScreenCTM(),rect=node.getBoundingClientRect();
    return{text:node.textContent,pixels:parseFloat(getComputedStyle(node).fontSize)*Math.hypot(matrix.c,matrix.d),horizontal:Math.abs(matrix.b)<.01,
     visible:rect.left>=host.left-.5&&rect.right<=host.right+.5&&rect.top>=host.top-.5&&rect.bottom<=host.bottom+.5};
   });
  });
  assert.equal(reviewLabels.filter(label=>label.text.includes(' po')).length,configured.segments.length,'all review dimensions remain visible');
  assert.ok(reviewLabels.some(label=>label.text==='113°'),'the actual whole-degree angle remains visible');
  assert.ok(reviewLabels.every(label=>label.pixels>=14&&label.horizontal&&label.visible),'review labels readable at 100% without zoom: '+JSON.stringify(reviewLabels));
  report.checks.push({name:'field-review-horizontal-dimensions-and-degrees-at-readable-css-size',passed:true,labels:reviewLabels});await shot(page,'field-review-390');
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
  await page.setViewportSize({width:393,height:851});
  frame=await open(contextData('worker-compact-qa','job-compact-qa'),{height:500});
  const compactSpec={kind:'profile',template:'custom',name:'QA compact A B C',unit:'in',length:120,quantity:1,startAngle:-90,segments:[{label:'A',length:'5.5'},{label:'B',length:'3'},{label:'C',length:'1.5'}],bends:[{mode:'interior',angle:90,direction:'left'},{mode:'hem',angle:180,direction:'left'}],material:{type:'aluminium'},finish:{},coloredFace:{side:'',segmentId:'A'}};
  await seedPersonalProfile(frame,compactSpec);
  const compactBefore=await compactLayout(frame,{expectHem:true});await shot(page,'field-compact-hem-393x500');
  assert.equal(await frame.locator('[data-client-bend-angle="1"]').getAttribute('readonly'),'');
  await frame.locator('[data-client-bend-angle="0"]').fill('91.25');await frame.locator('[data-client-bend-angle="0"]').press('Tab');assert.equal((await state(frame)).model.bends[0].angle,91,'the keyboard commits whole degrees');assert.equal(await frame.locator('[data-client-bend-angle="0"]').inputValue(),'91');
  await frame.locator('[data-client-bend-angle="0"]').fill('90');await frame.locator('[data-segment-length="2"]').fill('0.75');
  assert.ok(Math.abs((await state(frame)).model.segments[2].lengthMM-19.05)<1e-7);const compactQuarter=await compactLayout(frame,{expectHem:true});await shot(page,'field-compact-hem-three-quarter-393x500');
  const archiveBefore=await frame.evaluate(()=>({order:MIRProductionWorkspace.getEstimationDossier(),cart:MIRUnifiedOrderCart.list()}));
  assert.equal(await frame.locator('#client-step-back').innerText(),'Retour au tracé');await frame.locator('#client-step-back').click();await stage(frame,1);await settled(frame);
  const beforeUndo=await state(frame);assert.equal(beforeUndo.tool,'draw');assert.equal(beforeUndo.drawPointsMM.length,4);
  for(const selector of ['[data-drawing-undo]','#client-new-trace','[data-draw-tool="draw"]']){
   const rect=await frame.locator('.client-trace-actions '+selector).evaluate(el=>{const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};});assert.ok(rect.top>=0&&rect.bottom<=500&&rect.left>=0&&rect.right<=393&&rect.height>=44,'drawing action is fully visible without scrolling: '+selector+' '+JSON.stringify(rect));
  }
  await frame.locator('[data-drawing-undo]').click();const afterUndo=await state(frame);assert.deepEqual(afterUndo.drawPointsMM,beforeUndo.drawPointsMM.slice(0,-1),'undo removes only the last point');
  await frame.locator('#client-new-trace').click();await frame.locator('#production-dialog[open]').waitFor();assert.deepEqual((await state(frame)).drawPointsMM,afterUndo.drawPointsMM,'restart opens a confirmation without clearing the draft');
  await frame.locator('#production-dialog').getByRole('button',{name:'Garder mon tracé',exact:true}).click();assert.deepEqual((await state(frame)).drawPointsMM,afterUndo.drawPointsMM,'cancelling restart preserves the drawing');
  await frame.locator('#client-new-trace').click();await frame.locator('#confirm-client-new-trace').click();assert.equal((await state(frame)).drawPointsMM.length,0,'confirmed restart clears this drawing');
  assert.deepEqual(await frame.evaluate(()=>({order:MIRProductionWorkspace.getEstimationDossier(),cart:MIRUnifiedOrderCart.list()})),archiveBefore,'undo and restart never change the saved order or cart');await untouched(frame);await shot(page,'field-compact-restarted-393x500');
  report.checks.push({name:'samsung-height-500-real-hem-measures-keyboard-back-undo-restart',passed:true,viewport:{width:393,height:851},iframeHeight:500,measurements:compactBefore,threeQuarterReturn:compactQuarter});
  const longSpec={...compactSpec,name:'QA compact sept côtés',segments:[5.5,3,1.5,2,1.25,2,.75].map((length,index)=>({label:String.fromCharCode(65+index),length:String(length)})),bends:Array.from({length:6},(_,index)=>({mode:'interior',angle:90,direction:index%2?'right':'left'}))};
  await seedPersonalProfile(frame,longSpec);
  const sideValues=new Map(),angleValues=new Map(),pageProof=[];
  for(let pageIndex=0;pageIndex<4;pageIndex++){
   await settled(frame);const visible=await frame.evaluate(()=>({sides:[...document.querySelectorAll('.client-measure-field:not([hidden])')].map(n=>Number(n.dataset.fieldMeasureIndex)),angles:[...document.querySelectorAll('.client-angle-field:not([hidden])')].map(n=>Number(n.dataset.angleIndex))}));
   assert.ok(visible.sides.length<=3&&visible.angles.length<=2,'pagination bounds the number of simultaneous controls');
   for(const index of visible.sides){const input=frame.locator('[data-segment-length="'+index+'"]');if(sideValues.has(index))assert.equal(await input.inputValue(),sideValues.get(index),'shared page-boundary dimension stays unchanged');else{const value=String(Number(longSpec.segments[index].length)+.125);await input.fill(value);sideValues.set(index,value);}}
   for(const index of visible.angles){const input=frame.locator('[data-client-bend-angle="'+index+'"]');if(angleValues.has(index))assert.equal(await input.inputValue(),angleValues.get(index));else{const value=String(90+index);await input.fill(value);angleValues.set(index,value);}}
   pageProof.push(await compactLayout(frame));await shot(page,'field-compact-seven-sides-page-'+(pageIndex+1));
   const next=frame.locator('[data-field-measure-page-step="1"]');if(await next.isDisabled())break;await next.click();
  }
  assert.equal(sideValues.size,7,'every side remains keyboard-editable');assert.equal(angleValues.size,6,'every adjacent angle remains keyboard-editable');
  assert.ok(pageProof.length>1,'the seven-side profile really paginates');
  for(let pageIndex=pageProof.length-1;pageIndex>=0;pageIndex--){
   for(const input of await frame.locator('.client-measure-field:not([hidden]) input').all())assert.equal(await input.inputValue(),sideValues.get(Number(await input.getAttribute('data-segment-length'))));
   for(const input of await frame.locator('.client-angle-field:not([hidden]) input').all())assert.equal(await input.inputValue(),angleValues.get(Number(await input.getAttribute('data-client-bend-angle'))));
   if(pageIndex>0)await frame.locator('[data-field-measure-page-step="-1"]').click();
  }
  const pagedModel=(await state(frame)).model;assert.equal(pagedModel.valid,true);pagedModel.spec.segments.forEach((segment,index)=>assert.equal(Number(segment.length),Number(sideValues.get(index))));await untouched(frame);
  report.checks.push({name:'samsung-height-500-seven-side-pagination-preserves-all-measures-and-angles',passed:true,pages:pageProof});
  await page.setViewportSize({width:834,height:851});frame=await open(contextData('worker-tablet-compact-qa','job-tablet-compact-qa'),{height:500});
  await seedPersonalProfile(frame,compactSpec);const tabletCompact=await compactLayout(frame,{width:834,expectHem:true});
  await seedPersonalProfile(frame,longSpec);const tabletFirstPage=await compactLayout(frame,{width:834});assert.equal(tabletFirstPage.visibleSides.length,3,'834px field layout uses the same bounded measurement pages');
  assert.ok(Number(await frame.locator('#production-dimensions').getAttribute('data-field-measure-page-count'))>1,'834px field layout really paginates long profiles');await frame.locator('[data-field-measure-page-step="1"]').click();await settled(frame);
  const tabletSecondPage=await compactLayout(frame,{width:834});assert.deepEqual(tabletSecondPage.visibleSides,[2,3,4]);await untouched(frame);await shot(page,'field-compact-tablet-834x500');
  report.checks.push({name:'field-breakpoint-834-height-500-keeps-readable-cotes-and-bounded-pages',passed:true,measures:tabletCompact,firstPage:tabletFirstPage,secondPage:tabletSecondPage});
  await page.setViewportSize({width:393,height:755});
  frame=await open(contextData('worker-native-trace-qa','job-native-trace-qa',{entry:'draw',entryRequestId:'native-trace-qa'}),{width:355,height:524,native:true});
  await stage(frame,1);assert.equal((await state(frame)).drawPointsMM.length,0);
  const nativeArchive=await frame.evaluate(()=>({order:MIRProductionWorkspace.getEstimationDossier(),cart:MIRUnifiedOrderCart.list()})),nativeResizeProof=[];
  const normal=await traceLayout(frame,524);nativeResizeProof.push(normal);await shot(page,'field-native-trace-compact-355x524');
  await frame.locator('#field-trace-expand').click();
  const expanded=await traceLayout(frame,524,{expanded:true});nativeResizeProof.push(expanded);
  assert.ok(expanded.projection.width*expanded.projection.height>normal.projection.width*normal.projection.height*1.1,'expand increases the actual projected drawing area, not only a letterboxed container');
  assert.equal(await frame.locator('#field-trace-expand').getAttribute('aria-expanded'),'true');
  await shot(page,'field-native-trace-expanded-355x524');
  const touchPoints=[[.35,.72],[.35,.28],[.65,.28],[.52,.28]];
  for(let i=0;i<touchPoints.length;i++){
   await tapTraceFraction(frame,touchPoints[i]);
   if(i===3){await frame.locator('#trace-hem-form').waitFor();await frame.locator('#trace-hem-form label:has(input[value="left"])').click();await frame.locator('#trace-hem-form button[type=submit]').click();}
   await frame.waitForFunction(n=>MIRProductionWorkspace.getLivePreviewState().drawPointsMM.length===n,i+1);
  }
  const traced=(await state(frame)).drawPointsMM;
  await frame.locator('#field-trace-expand').click();await traceLayout(frame,524);
  assert.deepEqual((await state(frame)).drawPointsMM,traced,'reduce preserves every actual touch point');
  for(const height of[360,524]){await page.locator('#drawing').evaluate((node,height)=>node.style.height=height+'px',height);nativeResizeProof.push(await traceLayout(frame,height));assert.deepEqual((await state(frame)).drawPointsMM,traced,'viewport resize does not alter drawing geometry');}
  await frame.locator('#trace-height').selectOption('12');assert.deepEqual((await state(frame)).drawPointsMM,traced,'changing scale preserves dimensions and points');
  await frame.locator('#trace-height').selectOption('10');assert.deepEqual((await state(frame)).drawPointsMM,traced);
  await frame.locator('#field-trace-expand').click();await frame.locator('#field-trace-expand').press('Escape');await traceLayout(frame,524);
  assert.deepEqual((await state(frame)).drawPointsMM,traced,'Escape exits expanded drawing without clearing it');
  for(const selector of ['[data-drawing-undo]','#client-new-trace','[data-draw-tool="draw"]'])assert.equal(await frame.locator(selector).isEnabled(),true,'real trace action remains available '+selector);
  await frame.getByRole('button',{name:'Suivant — terminer le dessin',exact:true}).click();await stage(frame,2);
  const nativeModel=(await state(frame)).model;assert.equal(nativeModel.valid,true);assert.equal(nativeModel.bends[1].mode,'hem');
  assert.equal(await frame.locator('#field-trace-toolbar').count(),0,'drawing display tools leave the measurements step');
  assert.deepEqual(await frame.evaluate(()=>({order:MIRProductionWorkspace.getEstimationDossier(),cart:MIRUnifiedOrderCart.list()})),nativeArchive,'touch drawing, resizing and scale preserve saved orders and the common cart');await untouched(frame);
  report.checks.push({name:'native-css-touch-trace-scale-expand-reduce-and-resize',passed:true,nativeStyleSource:'mobile/web/bootstrap.js mount + mobile/web/team.css',input:'real touchscreen taps on the SVG; native Android gestures are verified separately',views:nativeResizeProof});
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
