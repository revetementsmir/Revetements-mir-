'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const vm=require('node:vm');
const {chromium}=require('playwright');
const base=path.join(__dirname,'fixtures/native-drawing'),before=fs.readFileSync(path.join(base,'tapDrawing-8bfd.java.txt'),'utf8'),provenance=JSON.parse(fs.readFileSync(path.join(base,'provenance.json'),'utf8'));
assert.equal(crypto.createHash('sha256').update(before).digest('hex'),provenance.sha256);
const source=fs.readFileSync(path.resolve(__dirname,'../android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirRealRolesTest.java'),'utf8');
function expression(code,anchor){
 const part=code.slice(code.indexOf(anchor)),match=part.match(/("(?:[^"\\]|\\.)*")\+JSONObject\.quote\(selector\)\+("(?:[^"\\]|\\.)*")/);
 assert.ok(match,'Actual Java target expression must be exercised');
 return JSON.parse(match[1])+JSON.stringify('#client-draw-profile')+JSON.parse(match[2]);
}
const oldPoint=expression(before,'JSONObject point='),target=expression(source,'private String drawingTargetExpression'),ready='('+target+').ready';
const scroll=expression(source,"js(s,\"document.querySelector('#field-drawing-frame')");
const helper=source.slice(source.indexOf('private void tapDrawing('),source.indexOf('private android.graphics.Rect contentArea'));
assert.ok(helper.indexOf('presentFrame(s)')<helper.indexOf('JSONObject point='),'Native frame presentation precedes measurement');
assert.match(helper,/UiDevice.*\.click\(/,'The real Android gesture stays native');
assert.doesNotMatch(helper,/\.click\(\);true|\.evaluate.*click/,'No DOM click fallback');
const metadata=source.slice(source.indexOf('private String fieldMetadataReady('),source.indexOf('private JSONArray assertAndroidFontScales('));
const metadataExpressions=[...metadata.matchAll(/return ("(?:[^"\\]|\\.)*");/g)].map(m=>JSON.parse(m[1]));
assert.equal(metadataExpressions.length,3,'Actual Java metadata waits for all three scaled views');
for(const predicate of metadataExpressions){
 const node={value:'7da20261-1114-4000-8000-000000000001',textContent:'Adresse à préciser',selectedOptions:[{textContent:'Adresse à préciser'}],nextElementSibling:{textContent:'Adresse à préciser'}};
 const context={document:{querySelector:()=>node}};
 assert.equal(Boolean(vm.runInNewContext(predicate,context)),false,'Loaded view alone is insufficient for a font-scale screenshot');
 node.textContent=node.selectedOptions[0].textContent=node.nextElementSibling.textContent='QA-UX-1 · 10 rue fictive QA';
 assert.equal(vm.runInNewContext(predicate,context),true,'Canonical metadata qualifies the screenshot');
 if(predicate.includes('selectedOptions')){node.value='7da20261-1114-4000-8000-000000000002';assert.equal(vm.runInNewContext(predicate,context),false,'Another selected job cannot satisfy the representative QA proof');}
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:700}});
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
  console.log('PASS drawing native-target contract: original 8bfd disabled/scroll failures reproduced, current coordinates and both hit-tests verified (Chromium simulation).');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
