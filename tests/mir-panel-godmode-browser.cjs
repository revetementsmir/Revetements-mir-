'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8896,base='http://127.0.0.1:'+port,folder=path.join(__dirname,'../artifacts');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<100;i++){const ok=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));if(ok)return;await sleep(100)}throw Error('MIR static server failed')}
async function fill(page,sel,value){await page.locator(sel).fill(value);await page.locator(sel).press('Tab')}
async function tap(page,x,y){const p=await page.evaluate(([x,y])=>{const el=document.querySelector('#production-drawing svg'),t=el.createSVGPoint();t.x=x;t.y=y;const p=t.matrixTransform(el.getScreenCTM());return {x:p.x,y:p.y}},[x,y]);await page.mouse.click(p.x,p.y)}
(async()=>{
fs.mkdirSync(folder,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
let browser;try{
 await ready();browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [name,width,height] of [['pc',1440,900],['ipad',1024,768],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<1100});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
  await page.locator('[data-template="roof-slope"]').waitFor({state:'visible',timeout:25000});
  await page.locator('[data-template="roof-slope"]').click();
  await fill(page,'#production-dimensions [data-measure="width"]','48');
  await fill(page,'#production-dimensions [data-measure="height"]','36');
  await fill(page,'#production-dimensions [data-measure="relief"]','2');
  await fill(page,'#mir-panel-roof-pitch','6/12');
  await fill(page,'#panel-lip','1');
  assert.equal(await page.locator('#mir-panel-live-alt').isVisible(),true);
  assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-panel-twin'),'3d');
  assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-geometry-status'),'measured','Valid geometry drives twin');
  await page.locator('[data-panel-no-lip="slope"]').click();
  assert.equal(await page.locator('#production-drawing [data-panel-edge-lip="slope"]').count(),1);
  assert.match(await page.locator('#production-drawing [data-panel-edge-lip="slope"]').textContent(),/Sans lip/);
  assert.match(await page.locator('#mir-panel-net-summary').innerText(),/Face nette hors lèvres/);
  await page.locator('[data-preview="volume"]').click();
  assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-panel-twin'),'2d','3D main has 2D twin');
  await page.screenshot({path:path.join(folder,'mir-panel-roof-live-'+name+'.png'),fullPage:false});
  await page.locator('#mir-draw-single-panel').click();
  await page.locator('#production-drawing svg[data-mir-panel-sketch="true"]').waitFor({state:'visible'});
  await tap(page,190,140);await tap(page,610,140);await tap(page,610,390);await tap(page,190,390);
  await page.locator('[data-panel-sketch-finish]').click();
  assert.equal(await page.locator('#production-drawing svg[data-mir-panel-sketch="true"]').count(),0);
  assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-geometry-status'),'illustrative','Unmeasured contour never counted as manufactured');
  assert.equal(await page.locator('#add-production-piece').isDisabled(),true);
  await fill(page,'#production-dimensions [data-measure="width"]','120');
  await fill(page,'#production-dimensions [data-measure="height"]','96');
  await fill(page,'#production-dimensions [data-measure="relief"]','2');
  await page.waitForFunction(()=>document.querySelector('#mir-panel-live-alt')?.dataset.geometryStatus==='measured');
  assert.match(await page.locator('#mir-panel-net-summary').innerText(),/Face nette/);
  assert.deepEqual(errors,[],'No JS errors '+name);
  await page.screenshot({path:path.join(folder,'mir-panel-freehand-'+name+'.png'),fullPage:false});
  console.log('PASS MIR free standalone panel / 6-12 roof / per-side lip=0 / twin live '+name);
  await page.close();
 }
}finally{if(browser)await browser.close();server.kill();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});