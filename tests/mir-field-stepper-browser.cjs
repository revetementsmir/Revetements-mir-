'use strict';
// Actual production controller, same-origin personal frame and the field style
// injection used by chantier-app. No account, API or customer data is used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright'),{serve}=require('./helpers/mir-static-http.cjs');
const root=path.resolve(process.env.MIR_FIELD_STEPPER_ROOT||path.join(__dirname,'..'));
const out=path.resolve(process.env.MIR_FIELD_STEPPER_OUT||path.join(root,'artifacts/field-stepper'));
const report={fixture:'real production.html with personal parent context and field-control stylesheet',customerData:false,backendWrites:false,states:[],failures:[],pageErrors:[]};
function contrast(a,b){
 const luminance=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
function fixture(entry,id,height){return `<!doctype html><html lang="fr-CA"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#242522}iframe{display:block;width:100%;height:${height}px;border:0}</style><script>window.MIRFieldDrawingContext=()=>({personal:true,presentation:'pliage03',ownerId:'stepper-qa-${id}',jobId:'job-qa',entry:'${entry}',entryRequestId:'${id}'});</script><iframe title="Recette fictive des étapes" src="production.html?mode=client&source=store&kind=profile"></iframe><script>document.querySelector('iframe').addEventListener('load',e=>{const d=e.target.contentDocument;d.documentElement.dataset.fieldDrawing='true';const l=d.createElement('link');l.rel='stylesheet';l.href='mir-field-controls.css';l.onload=()=>d.documentElement.dataset.qaFieldControls='ready';d.head.append(l);});</script></html>`;}
async function observe(page,frame,label){
 await frame.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 const info=await frame.evaluate(()=>{
  const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  return{width:innerWidth,height:innerHeight,stage:document.body.dataset.clientStage,entry:document.body.dataset.clientEntry,
   steps:[...document.querySelectorAll('#client-step-list button')].map(b=>{const digit=b.querySelector('span'),s=getComputedStyle(b),d=getComputedStyle(digit);return{step:b.dataset.clientStep,number:digit.textContent,disabled:b.disabled,current:b.getAttribute('aria-current')==='step',complete:b.classList.contains('is-complete'),rect:rect(b),digit:rect(digit),background:s.backgroundColor,border:s.borderColor,text:s.color,digitColor:d.color,digitBackground:d.backgroundColor,font:d.fontSize};})};
 });
 info.label=label;
 for(const step of info.steps){
  const bg=step.digitBackground==='rgba(0, 0, 0, 0)'?step.background:step.digitBackground;
  step.numberContrast=contrast(step.digitColor,bg);
 }
 report.states.push(info);
 await page.screenshot({path:path.join(out,label+'.png'),animations:'disabled',caret:'hide'});
 const check=(value,message)=>{if(!value)report.failures.push(label+': '+message);};
 check(info.steps.length===4,'four steps remain in the document');
 const heights=info.steps.map(s=>s.rect.height),widths=info.steps.map(s=>s.rect.width);
 check(Math.max(...heights)-Math.min(...heights)<1,'four buttons have equal height');
 check(Math.max(...widths)-Math.min(...widths)<1,'four buttons have equal width');
 const axis=info.width<960?'y':'x';
 check(Math.max(...info.steps.map(s=>s.rect[axis]))-Math.min(...info.steps.map(s=>s.rect[axis]))<1,info.width<960?'four steps stay on one row':'four steps keep the desktop sidebar alignment');
 const surfaces=info.steps.filter(s=>!s.current).map(s=>s.background+'|'+s.border);
 check(new Set(surfaces).size===1,'available and disabled steps share the same surface and border');
 for(const step of info.steps){
  check(step.number===step.step,'visible number corresponds to step '+step.step);
  check(step.numberContrast>=4.5,'step '+step.step+' number contrast >=4.5 (actual '+step.numberContrast.toFixed(2)+')');
  check(step.rect.height>=44,'step '+step.step+' has a 44px target');
  check(step.rect.x>=0&&step.rect.right<=info.width+1,'step '+step.step+' is inside the viewport');
  check(step.digit.width>0&&step.digit.height>0,'step '+step.step+' number has visible dimensions');
 }
 return info;
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 report.cssSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/mir-pliage03.css'))).digest('hex');
 const server=await serve(path.join(root,'dist'));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
  for(const viewport of [{width:355,height:500},{width:834,height:900},{width:1440,height:1000}]){
   const context=await browser.newContext({viewport,hasTouch:viewport.width<960,locale:'fr-CA',serviceWorkers:'block',reducedMotion:'reduce'});
   let entry='models',id='bank-'+viewport.width;
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==server.base)return route.abort();
    if(url.pathname==='/__field-stepper.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:fixture(entry,id,viewport.height)});
    return route.continue();
   });
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.pageErrors.push(error.message));
   const open=async()=>{await page.goto(server.base+'/__field-stepper.html',{waitUntil:'networkidle'});const f=page.frames().find(f=>f.url().includes('/production.html'));await f.waitForFunction(()=>window.MIRProductionWorkspace&&document.documentElement.dataset.qaFieldControls==='ready');return f;};
   let frame=await open();
   await observe(page,frame,'models-'+viewport.width);
   await frame.locator('[data-client-profile="l"]').click();
   await frame.waitForFunction(()=>document.body.dataset.clientStage==='2');
   await observe(page,frame,'measures-'+viewport.width);
   await frame.locator('#client-step-list [data-client-step="1"]').click();
   await frame.waitForFunction(()=>document.body.dataset.clientStage==='1');
   const revisited=await observe(page,frame,'model-return-'+viewport.width);
   assert.ok(revisited.steps[0].current&&revisited.steps[0].complete,'real navigation reproduces current + complete on step 1');
   entry='draw';id='draw-'+viewport.width;frame=await open();
   await observe(page,frame,'draw-'+viewport.width);
   await context.close();
  }
  assert.deepEqual(report.pageErrors,[],'no JavaScript error');
  report.passed=report.failures.length===0;
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
  assert.deepEqual(report.failures,[],'field stepper contrast, geometry and states');
  console.log('PASS field stepper: '+report.states.length+' real UI states, current/completed numbers, shared surfaces, 355/834/1440px.');
 }finally{if(browser)await browser.close();await server.close();}
})().catch(error=>{report.passed=false;report.error=error.message;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.error(error.stack||error);process.exitCode=1;});
