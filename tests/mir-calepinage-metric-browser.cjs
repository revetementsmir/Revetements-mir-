'use strict';
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8895,base='http://127.0.0.1:'+port,artifacts=path.join(__dirname,'../artifacts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function waitServer(){
 for(let i=0;i<75;i++){
  const ok=await new Promise(resolve=>http.get(base+'/calepinage.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await delay(130);
 }
 throw Error('Server not reachable');
}
async function tapSvg(page,x,y){
 const pt=await page.evaluate(([x,y])=>{const svg=document.querySelector('#layout-svg'),p=svg.createSVGPoint();p.x=x;p.y=y;const m=svg.getScreenCTM();if(!m)throw Error('SVG CTM absent');const q=p.matrixTransform(m);return{x:q.x,y:q.y};},[x,y]);
 await page.mouse.click(pt.x,pt.y);
}
async function currentWorkspace(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('mir-panel-layout-v1');req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{const db=req.result,tx=db.transaction('drafts','readonly'),read=tx.objectStore('drafts').get('workspace');
   read.onsuccess=()=>{resolve(read.result);db.close()};read.onerror=()=>reject(read.error)};
 }));
}
async function saved(page){await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent?.includes('Enregistré'),{timeout:15000});}
(async()=>{
 fs.mkdirSync(artifacts,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
 let browser;
 try{
  await waitServer();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const views=[{name:'pc',width:1440,height:900},{name:'ipad',width:1024,height:768},{name:'phone',width:390,height:844}];
  for(const device of views){
   const page=await browser.newPage({viewport:{width:device.width,height:device.height},hasTouch:device.width<1100});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/calepinage.html',{waitUntil:'domcontentloaded'});
   await page.locator(device.width<=740?'#mir-cal-mobile-example':'#load-example').waitFor({state:'visible',timeout:25000});
   await page.locator(device.width<=740?'#mir-cal-mobile-example':'#load-example').click();
   await page.waitForFunction(()=>document.querySelector('#piece-count')?.textContent?.includes('8 panneaux'));
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-synced-pieces'),'8','Auto 4 wide × 2 high generates 8 panels in 3D');
   assert.ok(await page.locator('#mir-wall-live-3d-stage [data-mir-wall-twin="3d"]').count()===1,'Real 3D preview follows 2D');
   // Adjust number across and high: compute immediately, never simulate pieces.
   if(device.width<=740)await page.locator('[data-mir-cal-stage="panels"]').click();
   await page.locator('#columns').fill('3');await page.locator('#columns').press('Tab');
   assert.match(await page.locator('#piece-count').textContent(),/6 panneaux/);
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-synced-pieces'),'6');
   await page.locator('#rows').fill('3');await page.locator('#rows').press('Tab');
   assert.match(await page.locator('#piece-count').textContent(),/9 panneaux/);
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-synced-pieces'),'9');
   await page.locator('#columns').fill('4');await page.locator('#columns').press('Tab');
   await page.locator('#rows').fill('2');await page.locator('#rows').press('Tab');
   assert.match(await page.locator('#piece-count').textContent(),/8 panneaux/);
   // Edit one selected panel using millimetres; lock its column and row atomically.
   if(device.width<=740){
    await page.locator('[data-mir-cal-stage="order"]').click();
    await page.locator('.mir-cal-mobile-full-table summary').click();
   }
   await page.locator('#piece-table [data-table-piece]').first().click();
   if(device.width<=740){
    await page.locator('[data-mir-cal-stage="panels"]').click();
    await page.locator('.mir-cal-mobile-panel-inspector summary').click();
   }
   await page.locator('#mir-panel-dimension-unit').selectOption('mm');
   const first=Number(await page.locator('#piece-width').inputValue()),second=Number(await page.locator('#piece-height').inputValue());
   assert.ok(first>300&&second>300,'Dimension inputs converted to mm');
   assert.match(await page.locator('#piece-table').textContent(),/mm/);
   const before=await page.locator('#mir-wall-live-3d-stage svg').evaluate(n=>n.outerHTML);
   await page.locator('#piece-width').fill(String(first+25.4));
   await page.locator('#piece-height').fill(String(second+12.7));
   await page.locator('#apply-panel-dimensions').click();
   assert.equal(await page.locator('#mir-panel-dimension-error').isVisible(),false,'Valid exact dimensions accepted');
   assert.equal(await page.locator('#piece-width-lock').isChecked(),true);
   assert.equal(await page.locator('#piece-height-lock').isChecked(),true);
   assert.notEqual(await page.locator('#mir-wall-live-3d-stage svg').evaluate(n=>n.outerHTML),before,'Same 3D preview recomputed from measured 2D geometry');
   await saved(page);
   const recorded=await currentWorkspace(page),current=recorded.zones.find(z=>z.id===recorded.activeId);
   assert.ok(Object.keys(current.rules.widthLocks||{}).length>=1,'Width lock persists to local draft');
   assert.ok(Object.keys(current.rules.heightLocks||{}).length>=1,'Height lock persists to local draft');
   const locked2d=await page.locator('#piece-table').textContent();
   await page.locator('#piece-width').fill('999999');
   await page.locator('#apply-panel-dimensions').click();
   assert.equal(await page.locator('#mir-panel-dimension-error').isVisible(),true,'Impossible architecture dimension rejected');
   assert.equal(await page.locator('#piece-table').textContent(),locked2d,'Failure does not mutate other panels');
   await page.locator('#mir-panel-dimension-unit').selectOption('in');
   assert.ok(Number(await page.locator('#piece-width').inputValue())<100,'Switch back to inches is display-only');
   await page.locator('#view-3d').click();
   assert.equal(await page.locator('#mir-wall-live-3d-stage [data-mir-wall-twin="2d"]').count(),1,'Switching main 3D keeps synchronized 2D in small pane');
   await page.locator('#view-zone').click();
   assert.equal(await page.locator('#mir-wall-live-3d-stage [data-mir-wall-twin="3d"]').count(),1);
   await page.screenshot({path:path.join(artifacts,'mir-panel-grid-'+device.name+'.png'),fullPage:true});
   // A custom wall can be sketched before size; no fabricated panel count.
   if(device.width<=740)await page.locator('[data-mir-cal-stage="wall"]').click();
   await page.locator('#new-traced-section').click();
   assert.equal(await page.locator('#drawing-stage').getAttribute('data-tool'),'outline');
   await tapSvg(page,240,165);await tapSvg(page,760,165);await tapSvg(page,760,515);await tapSvg(page,240,515);
   assert.equal(await page.locator('#mir-wall-live-3d-stage [data-mir-wall-twin="unmeasured"]').count(),1,'Illustrative 3D follows drawing points before real sizes');
   if(device.width<=740){
    const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,height:innerHeight}));
    assert.ok(bounds.scroll<=bounds.height+4,'Phone no page scrolling while tracing '+JSON.stringify(bounds));
   }
   await page.locator('#outline-close').click();
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-geometry-status'),'unmeasured');
   await page.locator('#zone-width').fill('120');await page.locator('#zone-width').press('Tab');
   await page.locator('#zone-height').fill('96');await page.locator('#zone-height').press('Tab');
   if(device.width<=740)await page.locator('[data-mir-cal-stage="panels"]').click();
   await page.locator('#lip').fill('1');await page.locator('#lip').press('Tab');
   await page.waitForFunction(()=>document.querySelector('#piece-count')?.textContent?.includes('8 panneaux'));
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-geometry-status'),'measured');
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-synced-pieces'),'8');
   await saved(page);
   await page.screenshot({path:path.join(artifacts,'mir-panel-wall-'+device.name+'.png'),fullPage:true});
   assert.deepEqual(errors,[],'No browser JavaScript errors on '+device.name);
   console.log('PASS MIR '+device.name+': 4×2 auto, 3×3 auto, mm locking, 2D/3D sync, wall trace-first & net measures');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
