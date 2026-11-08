'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8895,base='http://127.0.0.1:'+port,folder=path.join(__dirname,'../artifacts');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<80;i++){let ok=await new Promise(resolve=>http.get(base+'/calepinage.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));if(ok)return;await pause(100);}throw Error('Server unavailable');}
async function set(page,sel,val){await page.locator(sel).fill(val);await page.locator(sel).press('Tab');}
(async()=>{
 fs.mkdirSync(folder,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
 let browser;
 try{await ready();browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const screens=[['pc',1440,900],['ipad',1024,768],['phone',390,844]];
  for(const [name,w,h] of screens){
   const page=await browser.newPage({viewport:{width:w,height:h}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/calepinage.html',{waitUntil:'domcontentloaded'});
   await page.locator('#new-traced-section').waitFor({state:'visible'});
   await set(page,'#zone-width','120');await set(page,'#zone-height','96');
   if(w<=740)await page.locator('[data-mir-cal-stage="panels"]').click();
   await set(page,'#lip','1');
   await set(page,'#columns','4');await set(page,'#rows','2');
   await page.waitForFunction(()=>document.querySelector('#mir-wall-live-3d')?.dataset.geometryStatus==='measured');
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-synced-pieces'),'8');
   assert.equal(await page.locator('#mir-wall-live-3d-stage [data-mir-wall-twin="3d"]').count(),1);
   if(w<=740){await page.locator('[data-mir-cal-stage="order"]').click();await page.locator('.mir-cal-mobile-full-table summary').click();}
   await page.locator('#piece-table [data-table-piece]').first().click();
   if(w<=740){await page.locator('[data-mir-cal-stage="panels"]').click();await page.locator('.mir-cal-mobile-panel-inspector summary').click();}
   await page.locator('#mir-panel-dimension-unit').selectOption('mm');
   const widthValue=Number(await page.locator('#piece-width').inputValue());
   const heightValue=Number(await page.locator('#piece-height').inputValue());
   assert.ok(widthValue>300&&heightValue>300,'metric selected dimensions');
   await set(page,'#piece-width',String(widthValue+25.4));
   await set(page,'#piece-height',String(heightValue+12.7));
   await page.locator('#apply-panel-dimensions').click();
   assert.equal(await page.locator('#mir-panel-dimension-error').isVisible(),false);
   assert.equal(await page.locator('#piece-width-lock').isChecked(),true);
   assert.equal(await page.locator('#piece-height-lock').isChecked(),true);
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-synced-pieces'),'8');
   assert.ok((await page.locator('#piece-table').innerText()).includes('mm'));
   await page.locator('#view-3d').click();
   assert.equal(await page.locator('#mir-wall-live-3d-stage [data-mir-wall-twin="2d"]').count(),1);
   await page.locator('#view-zone').click();
   const before=await page.locator('#piece-width').inputValue();
   await set(page,'#piece-width','900000');
   await page.locator('#apply-panel-dimensions').click();
   assert.equal(await page.locator('#mir-panel-dimension-error').isVisible(),true,'impossible width rejected');
   assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-synced-pieces'),'8');
   await page.screenshot({path:path.join(folder,'mir-panel-individual-'+name+'.png'),fullPage:false});
   assert.deepEqual(errors,[],'page JS errors '+name);
   console.log('PASS MIR per-piece metric sizing, 2D/3D twin, locks and rejection '+name);
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill()}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});