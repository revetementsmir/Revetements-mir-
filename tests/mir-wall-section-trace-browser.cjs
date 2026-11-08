'use strict';
/* MIR : real Chromium trace-first architectural wall sections; not a mock. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8891,base='http://127.0.0.1:'+port;
const artifact=path.join(__dirname,'../artifacts');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<75;i++){const ok=await new Promise(resolve=>http.get(base+'/calepinage.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));if(ok)return;await sleep(120)}throw Error('MIR static server unavailable')}
async function locate(page,x,y){
 return page.evaluate(([cx,cy])=>{
  const svg=document.getElementById('layout-svg'),point=svg.createSVGPoint();point.x=cx;point.y=cy;
  const m=svg.getScreenCTM(),p=point.matrixTransform(m);return{x:p.x,y:p.y};
 },[x,y]);
}
async function tap(page,x,y){const p=await locate(page,x,y);await page.mouse.click(p.x,p.y);}
async function drag(page,x,y,x2,y2,shift=false){
 const a=await locate(page,x,y),b=await locate(page,x2,y2);
 if(shift)await page.keyboard.down('Shift');
 await page.mouse.move(a.x,a.y);await page.mouse.down();
 await page.mouse.move(b.x,b.y,{steps:6});await page.mouse.up();
 if(shift)await page.keyboard.up('Shift');
}
async function idb(page){return page.evaluate(()=>new Promise((resolve,reject)=>{
 const req=indexedDB.open('mir-panel-layout-v1');req.onerror=()=>reject(req.error);
 req.onsuccess=()=>{const db=req.result,tx=db.transaction('drafts','readonly'),get=tx.objectStore('drafts').get('workspace');
 get.onsuccess=()=>{resolve(get.result);db.close()};get.onerror=()=>reject(get.error)}
}))}
(async()=>{
 fs.mkdirSync(artifact,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
 let browser;
 try{
  await ready();browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const viewports=[{name:'pc',w:1440,h:900},{name:'ipad-landscape',w:1024,h:768},{name:'ipad-portrait',w:820,h:1180},{name:'phone',w:390,h:844},{name:'phone-compact',w:360,h:780},{name:'phone-landscape',w:844,h:390}];
  for(const v of viewports){
   const page=await browser.newPage({viewport:{width:v.w,height:v.h},hasTouch:v.w<1100});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/calepinage.html',{waitUntil:'domcontentloaded'});
   await page.locator('#new-traced-section').waitFor({state:'visible',timeout:25000});
   await page.locator('#new-traced-section').click();
   assert.equal(await page.locator('#drawing-stage').getAttribute('data-tool'),'outline','New section starts drawing tool');
   assert.equal(await page.locator('#zone-width').inputValue(),'');
   assert.equal(await page.locator('#zone-height').inputValue(),'');
   assert.equal(await page.locator('body.mir-wall-tracing').count(),1,'Full-height tracing on every screen');
   const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,height:innerHeight,svg:document.getElementById('layout-svg').getBoundingClientRect().height}));
   assert.ok(bounds.scroll<=bounds.height+4,'No global scroll during tracing '+v.name+' '+JSON.stringify(bounds));
   assert.ok(bounds.svg>(v.h<520?90:180),'Usable drawing canvas '+v.name+' '+JSON.stringify(bounds));
   await tap(page,240,165);await tap(page,760,165);await tap(page,760,515);await tap(page,240,515);
   assert.equal(await page.locator('#layout-svg .mir-wall-edge-label').count(),3,'Side A-B B-C C-D previewed');
   await page.screenshot({path:path.join(artifact,'mir-wall-trace-active-'+v.name+'.png'),fullPage:false});
   await page.locator('#outline-close').click();
   assert.equal(await page.locator('#drawing-stage').getAttribute('data-tool'),'select');
   assert.equal(await page.locator('#layout-svg [data-wall-sketch="pending"]').count(),1,'Shape stays visible without pretending to know dimensions');
   assert.equal(await page.locator('#send-production').isDisabled(),true);
   await page.locator('#zone-width').fill('120');await page.locator('#zone-width').press('Tab');
   await page.locator('#zone-height').fill('96');await page.locator('#zone-height').press('Tab');
   if(v.w<=740)await page.locator('[data-mir-cal-stage="panels"]').click();
   await page.locator('#lip').fill('1');await page.locator('#lip').press('Tab');
   if(v.w<=740){await page.locator('[data-mir-cal-stage="wall"]').click();await page.locator('#mir-cal-mobile-advanced summary').click();}
   assert.equal(await page.locator('#layout-svg [data-wall-sketch="pending"]').count(),0,'Sketch materialized once real measurements entered');
   assert.ok(await page.locator('#layout-svg .mir-wall-edge-label').count()>=3,'Actual side names persist');
   assert.equal(await page.locator('#layout-svg .mir-wall-angle-label').count(),4,'Angles shown at all four corners');
   assert.ok((await page.locator('#layout-svg .mir-wall-angle-label').allTextContents()).every(v=>v.includes('90')),'Right angles measured from geometry');
   assert.equal(await page.locator('#send-production').isDisabled(),false,'Panel layout can be calculated');
   assert.ok((await page.locator('#wall-edge-list').textContent()).includes('A–B'),'Side labels agree with the worksheet');
   // Clicking a real side opens the exact endpoint controls, never edits dimensions silently.
   const before=await page.locator('#zone-width').inputValue();
   await page.locator('#layout-svg [data-wall-edge="0"]').first().click();
   assert.equal(await page.locator('#wall-coordinate-details').evaluate(n=>n.open),true);
   assert.equal(await page.locator('#wall-vertex').inputValue(),'1');
   assert.equal(await page.locator('#wall-edge-details').isVisible(),true,'Clicking side opens direct length/angle editor');
   assert.ok(Math.abs(Number(await page.locator('#wall-edge-length').inputValue())-120)<.01,'Side A-B measured length');
   assert.ok(Math.abs(Number(await page.locator('#wall-edge-angle').inputValue())-90)<.01,'Angle at A measured');
   await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent?.includes('Enregistré'),{timeout:12000});
   const prior=await idb(page);
   await page.locator('#wall-edge-length').fill('108 1/2');
   await page.locator('#wall-edge-angle').fill('80');
   await page.locator('#apply-wall-edge').click();
   assert.equal(await page.locator('#wall-edge-error').isVisible(),false,'Valid length and angle accepted');
   await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent?.includes('Enregistré'),{timeout:12000});
   const changed=await idb(page);
   const p0=prior.zones.at(-1).shape.pointsIn,p1=changed.zones.at(-1).shape.pointsIn;
   assert.deepEqual(p0[0],p1[0],'Side start A fixed');
   assert.notDeepEqual(p0[1],p1[1],'Side endpoint B updated by explicit confirmation');
   assert.deepEqual(p0[2],p1[2],'Next point C preserved');
   assert.deepEqual(p0[3],p1[3],'Other point D preserved');
   assert.equal(await page.locator('#zone-width').inputValue(),before);
   await page.locator('#wall-edge-length').fill('500');
   await page.locator('#apply-wall-edge').click();
   assert.equal(await page.locator('#wall-edge-error').isVisible(),true,'Impossible wall dimension rejected explicitly');
   const unchanged=await idb(page);
   assert.deepEqual(unchanged.zones.at(-1).shape.pointsIn,p1,'Rejected edit does not alter measured contour');
   await page.screenshot({path:path.join(artifact,'mir-wall-edge-editor-'+v.name+'.png'),fullPage:false});
   await page.locator('#zone-width').fill('120 1/2');await page.locator('#zone-width').press('Tab');
   assert.equal(await page.locator('#send-production').isDisabled(),true,'Changing outer width cannot silently stretch confirmed wall corners');
   await page.locator('#zone-width').fill('120');await page.locator('#zone-width').press('Tab');
   assert.equal(await page.locator('#send-production').isDisabled(),false,'Valid measured contour restored unchanged');
   await page.locator('#new-traced-section').click();
   await drag(page,200,190,690,215,true);
   await drag(page,690,190,720,460,true);
   await drag(page,690,460,200,495,true);
   await tap(page,200,190); // Close near original point, no extra vertex.
   assert.equal(await page.locator('#drawing-stage').getAttribute('data-tool'),'select','Drag tracing closes at first vertex');
   assert.equal(await page.locator('#layout-svg [data-wall-sketch="pending"]').count(),1);
   await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent?.includes('Enregistré'),{timeout:10000});
   const saved=await idb(page);
   assert.ok(saved.zones.length>=3,'Each traced section remains independent');
   assert.equal(saved.zones.at(-1).shape.sketchRatios.length,4);
   const corners=saved.zones.at(-1).shape.sketchRatios;
   assert.equal(corners[0][1],corners[1][1],'Shift horizontal segment');
   assert.equal(corners[1][0],corners[2][0],'Shift vertical segment');
   assert.equal(corners[2][1],corners[3][1],'Shift horizontal top/bottom');
   assert.equal(saved.zones.at(-1).values.width,'');
   assert.equal(saved.zones.at(-2).values.width,'120');
   assert.equal(saved.zones.at(-2).shape.pointsIn.length,4);
   await page.screenshot({path:path.join(artifact,'mir-wall-trace-'+v.name+'.png'),fullPage:true});
   assert.deepEqual(errors,[],'No JS errors '+v.name);
   console.log('PASS MIR wall trace '+v.name+': points/drag, A-B labels, measurement-first optional, multi-zone persistence');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});