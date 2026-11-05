'use strict';
/* MIR — vérification Chrome des 3 surfaces 2D à leur Z réel. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8803,base='http://127.0.0.1:'+port;
const pause=n=>new Promise(r=>setTimeout(r,n));
async function online(){
 for(let i=0;i<60;i++){
  const ok=await new Promise(resolve=>http.get(base+'/plan.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await pause(150);
 }
 throw Error('MIR plan server unavailable');
}
(async()=>{
 const artifact=path.join(__dirname,'../artifacts');fs.mkdirSync(artifact,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--directory',path.join(__dirname,'../dist'),'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try {
  await online();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const screen of [{name:'bureau',width:1440,height:900},{name:'mobile',width:390,height:844}]){
   const page=await browser.newPage({viewport:{width:screen.width,height:screen.height},hasTouch:screen.width<600});
   const errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
   await page.goto(base+'/plan.html',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>!!window.MIRStudioWallParts&&!!window.MIR3D&&document.querySelector('#view-2d')?.disabled!==true,{timeout:30000});
   await page.locator('#view-2d').click();
   await page.locator('[data-face="right"]').click();
   await page.locator('#elevation svg[data-mir-three-wall-explode="true"]').waitFor({timeout:30000});
   const svg=page.locator('#elevation svg');
   assert.equal(await svg.locator('[data-mir-wall-part]').count(),3);
   assert.equal(await svg.locator('[data-mir-masonry-band]').count(),3);
   for(const name of ['return-left','front','return-right']){
    assert.equal(await svg.locator('[data-mir-wall-part="'+name+'"]').count(),1);
   }
   const view=await svg.evaluate(node=>{
    const vb=node.viewBox.baseVal;
    const parts=[...node.querySelectorAll('[data-mir-wall-part]')].map(el=>({
      name:el.dataset.mirWallPart,top:Number(el.dataset.worldTop),
      bottom:Number(el.dataset.worldBottom),
      rect:el.getBoundingClientRect().width
    }));
    return {viewBox:[vb.x,vb.y,vb.width,vb.height],parts};
   });
   assert.ok(view.viewBox[2]>1500,'Expanded 2D view must fit the separate walls');
   assert.equal(view.parts.length,3);
   assert.ok(view.parts.every(part=>Math.abs(part.top-6.2611)<.005),JSON.stringify(view.parts));
   const baseZ=view.parts.map(part=>part.bottom);
   assert.ok(Math.max(...baseZ)-Math.min(...baseZ)<.001);
   await page.locator('#stage').screenshot({path:path.join(artifact,'mir-studio-wall-parts-'+screen.name+'.png')});
   await page.locator('[data-face="left"]').click();
   await page.locator('#elevation svg[data-mir-three-wall-explode="true"]').waitFor();
   assert.equal(await page.locator('#elevation [data-mir-wall-part]').count(),3);
   await page.locator('[data-face="front"]').click();
   assert.equal(await page.locator('#elevation [data-mir-wall-part]').count(),0);
   // Never change geometry or supplier choices when toggling detached views.
   const save=await page.evaluate(()=>localStorage.getItem('mir-plan-study-v2'));
   await page.locator('[data-face="right"]').click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-plan-study-v2')),save);
   assert.deepEqual(errors,[]);
   console.log('PASS '+screen.name+': trois murs réels et maçonnerie à la même altitude, façade originale intacte');
   await page.close();
  }
 } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
