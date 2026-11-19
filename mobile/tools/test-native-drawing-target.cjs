'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const vm=require('node:vm');
const {chromium}=require('playwright');
const base=path.join(__dirname,'fixtures/native-drawing'),before=fs.readFileSync(path.join(base,'tapDrawing-8bfd.java.txt'),'utf8'),provenance=JSON.parse(fs.readFileSync(path.join(base,'provenance.json'),'utf8'));
assert.equal(crypto.createHash('sha256').update(before).digest('hex'),provenance.sha256);
const source=fs.readFileSync(path.resolve(__dirname,'../android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirRealRolesTest.java'),'utf8');
function expression(code,anchor){
 const part=code.slice(code.indexOf(anchor)),match=part.match(/("(?:[^"\\]|\\.)*")\+(?:org\.json\.)?JSONObject\.quote\(selector\)\+("(?:[^"\\]|\\.)*")/);
 assert.ok(match,'Actual Java target expression must be exercised');
 return JSON.parse(match[1])+JSON.stringify('#client-draw-profile')+JSON.parse(match[2]);
}
const oldPoint=expression(before,'JSONObject point='),target=expression(source,'private String drawingTargetExpression'),ready='('+target+').ready';
const helper=source.slice(source.indexOf('private void tapDrawing('),source.indexOf('private android.graphics.Rect contentArea'));
const scroll=expression(helper,"js(s,\"document.querySelector('#field-drawing-frame')");
assert.ok(helper.indexOf('presentFrame(s)')<helper.indexOf('JSONObject point='),'Native frame presentation precedes measurement');
assert.match(helper,/UiDevice.*\.click\(/,'The real Android gesture stays native');
assert.doesNotMatch(helper,/\.click\(\);true|\.evaluate.*click/,'No DOM click fallback');
const gridSource=source.slice(source.indexOf('private String drawingGridTargetExpression('),source.indexOf('private JSONObject tapDrawingGrid('));
const gridMatch=gridSource.match(/return ("(?:[^"\\]|\\.)*")\+new JSONArray\(\)\.put\(xInches\)\.put\(yInches\)\.toString\(\)\+("(?:[^"\\]|\\.)*")\+"""\n([\s\S]*?)\n\s*""";/);
assert.ok(gridMatch,'The actual Java SVG target expression is exercised');
const gridTarget=(x,y)=>JSON.parse(gridMatch[1])+JSON.stringify([x,y])+JSON.parse(gridMatch[2])+gridMatch[3];
const gridHelper=source.slice(source.indexOf('private JSONObject tapDrawingGrid('),source.indexOf('private int drawingTapSequence'));
assert.ok(gridHelper.indexOf('presentFrame(s)')<gridHelper.indexOf('JSONObject point='),'Canvas presentation precedes native point measurement');
assert.match(gridHelper,/stableDrawingTargetProbe\(/,'Grid taps share the existing three-sample native stability and viewport gate');
assert.match(gridHelper,/injectDeliberateNativeTap\(x,y\)/,'Grid input uses a real touchscreen finger');
assert.match(gridHelper,/event\.pointerType==='touch'&&event\.isTrusted/,'The delivered touchscreen sequence is observed');
assert.doesNotMatch(gridHelper,/\.click\(|setProfileSpec|appendTracePoint|client-point-[xy]/,'No DOM click, geometry seam, or retired coordinate input');
const keyboardSource=fs.readFileSync(path.resolve(__dirname,'../android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirAndroidTest.java'),'utf8'),keyboardHelper=keyboardSource.slice(keyboardSource.indexOf('private void tapEditable('),keyboardSource.indexOf('private void recordKeyboardFailure(')),keyboardPoint=expression(keyboardHelper,'org.json.JSONObject p=');
assert.ok(keyboardHelper.indexOf('screenshot(s,')<keyboardHelper.indexOf('org.json.JSONObject p='),'Native keyboard target is presented before measurement');
assert.match(keyboardHelper,/UiDevice.*\.click\(/);assert.doesNotMatch(keyboardHelper,/\.focus\(|showSoftInput|\.click\(\);true/);assert.match(keyboardHelper,/!n\.matches\(':disabled'\).*?!n\.readOnly/);
const keyboardTest=keyboardSource.slice(keyboardSource.indexOf('@Test public void backKeyboardOffline'),keyboardSource.indexOf('@Test public void permissionsAndFile'));
assert.match(keyboardTest,/uptimeMillis\(\)\+5000/);assert.match(keyboardTest,/isVisible\(androidx\.core\.view\.WindowInsetsCompat\.Type\.ime\(\)\)/);assert.match(keyboardTest,/assertTrue\("Clavier Android visible",keyboard\.get\(\)\)/);assert.doesNotMatch(keyboardTest,/\.focus\(|showSoftInput/);
const metadata=source.slice(source.indexOf('private String fieldMetadataReady('),source.indexOf('private JSONArray assertAndroidFontScales('));
const metadataExpressions=[...metadata.matchAll(/return ("(?:[^"\\]|\\.)*");/g)].map(m=>JSON.parse(m[1]));
assert.match(metadata,/if\(view\.equals\("command"\)\|\|view\.equals\("catalogue"\)\)/,'C02 direct Commande and its Magasin tab share the real-catalogue proof');
assert.equal(metadataExpressions.length,2,'Actual Java metadata keeps catalogue and Punch predicates');
const metadataByView={command:metadataExpressions[0],catalogue:metadataExpressions[0],punch:metadataExpressions[1]};
for(const [view,predicate] of Object.entries(metadataByView)){
 if(view!=='punch'){
  const items=[],present=new Set(),browse={querySelector:selector=>present.has(selector)?{}:null,querySelectorAll:()=>items},context={document:{querySelector:selector=>selector==='#employee-browse'?browse:null}};
  assert.equal(Boolean(vm.runInNewContext(predicate,context)),false,'Empty catalogue chrome is not a product proof');
  present.add('#catalogue-search');present.add('[data-field-store-filters]');items.push({dataset:{fieldProduct:'qa-real-product'},textContent:'Article QA chargé'});
  assert.equal(vm.runInNewContext(predicate,context),true,'Loaded product and compact search/filter controls qualify the screenshot');
  present.add('#order-job,#order-job-reference,.field-store-context,.field-store-cart');assert.equal(vm.runInNewContext(predicate,context),false,'Checkout context must not consume catalogue space');
  continue;
 }
 const node={value:'7da20261-1114-4000-8000-000000000001',textContent:'Adresse à préciser',selectedOptions:[{textContent:'Adresse à préciser'}],nextElementSibling:{textContent:'Adresse à préciser'}};
 const selector=view==='punch'?'[data-field-punch-job]':'#order-job';
 const context={document:{querySelector:value=>value===selector?node:null}};
 assert.equal(Boolean(vm.runInNewContext(predicate,context)),false,'Loaded view alone is insufficient for a font-scale screenshot');
 node.textContent=node.selectedOptions[0].textContent=node.nextElementSibling.textContent='QA-UX-1 · 10 rue fictive QA';
 assert.equal(vm.runInNewContext(predicate,context),true,'Canonical metadata qualifies the screenshot');
 if(predicate.includes('selectedOptions')){node.value='7da20261-1114-4000-8000-000000000002';assert.equal(vm.runInNewContext(predicate,context),false,'Another selected job cannot satisfy the representative QA proof');}
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:700},hasTouch:true});
  async function mount(kind){
   const child=`<style>html{scroll-behavior:smooth}body{margin:0;padding:${kind==='scroll'?1200:20}px 12px 600px}button{width:280px;height:80px}</style><button id="client-draw-profile" ${kind==='delayed'?'disabled':''}>Dessiner</button><script>window.taps=0;document.querySelector('button').onclick=()=>taps++;</script>`;
   await page.setContent('<style>body{margin:0}iframe{position:absolute;left:10px;top:80px;width:360px;height:400px;border:0}#overlay{position:absolute;z-index:2;inset:0;background:white}</style><iframe id="field-drawing-frame"></iframe>');
   await page.evaluate(html=>document.querySelector('iframe').srcdoc=html,child);
   await page.waitForFunction("!!document.querySelector('iframe').contentDocument.querySelector('#client-draw-profile')");
  }
  const count=()=>page.evaluate("document.querySelector('iframe').contentWindow.taps");
  async function currentTap(){
   await page.evaluate(scroll);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.waitForFunction(ready);
   const point=await page.evaluate(target);assert.equal(point.ready,true);assert.equal(point.childHit,true);assert.equal(point.parentHit,true);
   await page.mouse.click(point.x,point.y);
  }
  await mount('delayed');
  const disabledPoint=await page.evaluate(oldPoint);await page.mouse.click(disabledPoint.x,disabledPoint.y);
  assert.equal(await count(),0,'RED 8bfd helper taps a not-yet-enabled child control');
  assert.equal(await page.evaluate(ready),false);
  await page.evaluate(()=>setTimeout(()=>document.querySelector('iframe').contentDocument.querySelector('button').disabled=false,100));
  await currentTap();assert.equal(await count(),1,'GREEN current helper waits for enabled before the pointer');
  await mount('scroll');
  const stalePoint=await page.evaluate(oldPoint);
  assert.ok(stalePoint.y>700,'RED 8bfd reads coordinates before the smooth scroll is presented');
  await page.mouse.click(stalePoint.x,stalePoint.y);assert.equal(await count(),0);
  await currentTap();assert.equal(await count(),1,'GREEN current helper measures after instant scrolling/presentation');
  await mount('ready');await page.evaluate(scroll);
  assert.equal(await page.evaluate(ready),true);
  await page.evaluate(()=>document.body.insertAdjacentHTML('beforeend','<div id="overlay"></div>'));
  assert.equal(await page.evaluate(ready),false,'Parent overlay refuses the drawing pointer');
  await page.evaluate(()=>document.querySelector('#overlay').remove());
  await page.evaluate(()=>document.querySelector('iframe').contentDocument.body.insertAdjacentHTML('beforeend','<div style="position:fixed;inset:0;z-index:10"></div>'));
  assert.equal(await page.evaluate(ready),false,'Child overlay refuses the drawing pointer');
  await page.evaluate(()=>document.querySelector('iframe').style.display='none');
  assert.equal(await page.evaluate(ready),false,'A hidden frame is not divided or hit-tested');
  const gridChild=`<style>body{margin:0}#production-drawing{position:absolute;left:8px;top:20px;width:330px;height:320px}svg{width:100%;height:100%;display:block}</style><div id="production-drawing"><svg viewBox="100 0 440 520" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="mir-trace-major" x="140" y="395" width="37.142857" height="37.142857" patternUnits="userSpaceOnUse"><path d="M0 0H37.142857V37.142857" fill="none" stroke="gray"/></pattern></defs><rect width="800" height="520" fill="url(#mir-trace-major)"/></svg></div><script>window.modelUnit='in';window.tool='draw';window.MIRProductionWorkspace={getLivePreviewState:()=>({model:{unit:modelUnit},tool})};window.received=[];document.querySelector('svg').addEventListener('pointerdown',event=>{const svg=event.currentTarget,p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const local=p.matrixTransform(svg.getScreenCTM().inverse());received.push({x:local.x,y:local.y,trusted:event.isTrusted,type:event.pointerType});});</script>`;
  await page.setContent('<style>body{margin:0}iframe{position:absolute;left:10px;top:80px;width:360px;height:400px;border:3px solid gray;transform:translate(3px,5px) scale(.9);transform-origin:top left}#overlay{position:fixed;inset:0;z-index:10}</style><iframe id="field-drawing-frame"></iframe>');
  await page.evaluate(html=>document.querySelector('iframe').srcdoc=html,gridChild);
  await page.waitForFunction("!!document.querySelector('iframe').contentWindow.MIRProductionWorkspace");
  async function touchGrid(x,y,label){const point=await page.evaluate(gridTarget(x,y));assert.equal(point.ready,true,label);assert.equal(point.childHit,true);assert.equal(point.parentHit,true);await page.touchscreen.tap(point.x,point.y);const received=await page.evaluate("document.querySelector('iframe').contentWindow.received.at(-1)");assert.equal(received.trusted,true);assert.equal(received.type,'touch');assert.ok(Math.abs(received.x-point.svgX)<2&&Math.abs(received.y-point.svgY)<2,'Trusted touchscreen reaches the requested SVG point despite transforms and letterboxing');return point;}
  const compactPoint=await touchGrid(2,2,'Compact viewBox accepts a real visible grid point');
  await touchGrid(2,7.5,'Upper L corner remains in the compact grid');await touchGrid(5,7.5,'Right flange remains in the compact grid');await touchGrid(4.25,7.5,'The reverse hem point remains in the compact grid');
  await page.evaluate(()=>{const d=document.querySelector('iframe').contentDocument;d.querySelector('#production-drawing').style.height='370px';d.querySelector('svg').setAttribute('viewBox','0 0 800 520');});
  const enlargedPoint=await touchGrid(2,2,'Changed canvas dimensions and viewBox use their actual screen matrix');assert.ok(Math.abs(enlargedPoint.y-compactPoint.y)>1,'The changed visual target is remeasured');
  await page.evaluate(()=>{const f=document.querySelector('iframe'),d=f.contentDocument;f.contentWindow.modelUnit='mm';d.querySelector('#mir-trace-major').setAttribute('width',String(37.142857*10/25.4));});
  const metricPoint=await touchGrid(2,2,'Metric major squares still map the requested fabrication point');assert.ok(Math.abs(metricPoint.svgX-enlargedPoint.svgX)<.001&&Math.abs(metricPoint.svgY-enlargedPoint.svgY)<.001,'Unit conversion preserves the same real point');
  assert.equal((await page.evaluate(gridTarget(200,200))).ready,false,'An off-canvas fabrication point is rejected');
  await page.evaluate(()=>document.body.insertAdjacentHTML('beforeend','<div id="overlay"></div>'));assert.equal((await page.evaluate(gridTarget(2,2))).ready,false,'A parent overlay rejects the canvas gesture');
  await page.evaluate(()=>{document.querySelector('#overlay').remove();document.querySelector('iframe').contentDocument.body.insertAdjacentHTML('beforeend','<div id="child-overlay" style="position:fixed;inset:0;z-index:10"></div>');});assert.equal((await page.evaluate(gridTarget(2,2))).ready,false,'A child overlay rejects the canvas gesture');
  await page.evaluate(()=>{const f=document.querySelector('iframe');f.contentDocument.querySelector('#child-overlay').remove();f.contentWindow.tool='select';});assert.equal((await page.evaluate(gridTarget(2,2))).ready,false,'A preview that is no longer drawing rejects construction gestures');
  await page.evaluate(()=>{const f=document.querySelector('iframe');f.contentWindow.tool='draw';f.style.display='none';});assert.equal((await page.evaluate(gridTarget(2,2))).ready,false,'A hidden canvas frame rejects the gesture');
  await page.setContent('<style>textarea{position:absolute;left:20px;top:100px;width:280px;height:80px}#overlay{position:fixed;inset:0;z-index:10}</style><textarea id="client-draw-profile"></textarea>');
  const editable=await page.evaluate(keyboardPoint);assert.equal(editable.visible,true);assert.equal(editable.hit,true);await page.mouse.click(editable.x,editable.y);assert.equal(await page.evaluate("document.activeElement.id"),'client-draw-profile');
  await page.evaluate(()=>document.body.insertAdjacentHTML('beforeend','<div id="overlay"></div>'));assert.equal((await page.evaluate(keyboardPoint)).hit,false,'An overlay cannot qualify a native keyboard target');
  await page.evaluate(()=>{document.querySelector('#overlay').remove();document.querySelector('textarea').style.top='1000px';});assert.equal((await page.evaluate(keyboardPoint)).visible,false,'An offscreen field cannot qualify a native keyboard target');
  console.log('PASS drawing native-target contract: original 8bfd disabled/scroll failures reproduced, current coordinates and both hit-tests verified (Chromium simulation).');
  console.log('PASS drawing canvas-target contract: actual Java grid projection, compact/enlarged viewBox, iframe border/transform, imperial/metric, trusted touchscreen and occlusion gates (Chromium simulation; no Android claim).');
  console.log('PASS keyboard native-target contract: presented editable pointer, intercepted/offscreen rejection, unchanged five-second Insets IME requirement (no Android IME claim).');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
