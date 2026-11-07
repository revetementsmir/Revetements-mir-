'use strict';
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8897,base='http://127.0.0.1:'+port,art=path.join(__dirname,'../artifacts');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 for(let i=0;i<80;i++){const ok=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
 if(ok)return;await sleep(120)}throw Error('MIR server absent');
}
async function point(page,x,y){
 return page.evaluate(([x,y])=>{
  const svg=document.querySelector('#production-drawing svg'),p=svg.createSVGPoint();p.x=x;p.y=y;
  const m=svg.getScreenCTM();if(!m)throw Error('SVG matrix absent');const q=p.matrixTransform(m);
  return {x:q.x,y:q.y};
 },[x,y]);
}
async function tap(page,x,y){const p=await point(page,x,y);await page.mouse.click(p.x,p.y)}
async function drawSegment(page,x,y,x2,y2,shift=false){
 const a=await point(page,x,y),b=await point(page,x2,y2);
 if(shift)await page.keyboard.down('Shift');
 await page.mouse.move(a.x,a.y);await page.mouse.down();
 await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
 if(shift)await page.keyboard.up('Shift');
}
async function measure(page,key,value){
 const field=page.locator('[data-measure="'+key+'"]');await field.fill(value);await field.press('Tab');
}
(async()=>{
 fs.mkdirSync(art,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
 let browser;
 try{
  await ready();browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const v of [{name:'desktop',w:1440,h:900},{name:'ipad',w:1024,h:768},{name:'phone',w:390,h:844}]){
   const page=await browser.newPage({viewport:{width:v.w,height:v.h},hasTouch:v.w<1100});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
   await page.locator('[data-template="roof-slope"]').waitFor({state:'visible',timeout:25000});
   await page.locator('[data-template="roof-slope"]').click();
   await measure(page,'width','108');await measure(page,'height','96');await measure(page,'relief','2');
   await page.locator('#mir-panel-roof-pitch').fill('6/12');await page.locator('#mir-panel-roof-pitch').press('Tab');
   await page.locator('#panel-lip').fill('1');await page.locator('#panel-lip').press('Tab');
   assert.match(await page.locator('#mir-panel-roof-result').textContent(),/6\/12/);
   assert.match(await page.locator('#mir-panel-roof-result').textContent(),/54/,'108-inch run with 6/12 means rise 54 inches');
   assert.equal(await page.locator('#mir-panel-live-alt').isVisible(),true,'Simultaneous volume view visible');
   assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-panel-twin'),'3d');
   assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-geometry-status'),'measured');
   const before=await page.locator('#mir-panel-live-alt svg').evaluate(el=>el.outerHTML);
   await page.locator('[data-panel-no-lip="slope"]').click();
   assert.equal(await page.locator('[data-panel-lip="slope"]').inputValue(),'0','Slope has no lip while others retain 1');
   assert.equal(await page.locator('[data-panel-no-lip="slope"]').getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('[data-panel-edge-lip="slope"]').textContent(),/Sans lip/,'2D labels lip=0');
   assert.notEqual(await page.locator('#mir-panel-live-alt svg').evaluate(el=>el.outerHTML),before,'3D geometry updates when a lip is removed');
   assert.match(await page.locator('#mir-panel-net-summary').textContent(),/Face nette hors lèvres/);
   await page.locator('#mir-panel-roof-pitch').fill('8/12');await page.locator('#mir-panel-roof-pitch').press('Tab');
   assert.match(await page.locator('#mir-panel-roof-result').textContent(),/8\/12/);
   await page.screenshot({path:path.join(art,'mir-single-sloped-'+v.name+'.png'),fullPage:true});
   // Freehand standalone panel with no fabricated dimensions.
   await page.locator('#mir-draw-single-panel').click();
   assert.equal(await page.locator('#production-drawing svg[data-mir-panel-sketch]').count(),1);
   assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-geometry-status'),'pending');
   await drawSegment(page,100,140,520,143,true);
   await tap(page,650,310);
   await tap(page,500,420);
   const sketchCount=await page.locator('#production-drawing svg circle').count();
   if(sketchCount<3){
    const debug=await page.evaluate(()=>({
     points:document.querySelectorAll('#production-drawing svg circle').length,
     dataTool:document.querySelector('#production-drawing')?.dataset.tool,
     svg:document.querySelector('#production-drawing svg')?.outerHTML.slice(0,900),
     toolbar:document.querySelector('#drawing-tools')?.textContent,
     stage:document.querySelector('#production-drawing')?.getBoundingClientRect().toJSON()
    }));
    console.log('SKETCH DEBUG '+v.name+' '+JSON.stringify(debug));
    await page.screenshot({path:path.join(art,'mir-single-debug-'+v.name+'.png'),fullPage:false});
   }
   assert.ok(sketchCount>=3,'Trace has live labelled points');
   assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-panel-twin'),'3d');
   assert.ok(await page.locator('#mir-panel-live-alt svg').count()>=1,'Live illustrative 3D from current sketch');
   await page.locator('[data-panel-sketch-finish]').click();
   assert.equal(await page.locator('#production-drawing svg[data-mir-panel-sketch]').count(),0);
   assert.equal(await page.locator('[data-measure="width"]').inputValue(),'','No manufactured size inferred');
   await measure(page,'width','120');await measure(page,'height','70');await measure(page,'relief','0');
   assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-geometry-status'),'measured');
   await page.locator('#panel-lip').fill('1');await page.locator('#panel-lip').press('Tab');
   await page.locator('[data-panel-lip="edge-1"]').fill('');await page.locator('[data-panel-lip="edge-1"]').press('Tab');
   assert.match(await page.locator('[data-panel-edge-lip="edge-1"]').textContent(),/Lip/);
   assert.match(await page.locator('[data-panel-edge-lip="edge-2"]').textContent(),/Sans lip/);
   await page.locator('[data-preview="volume"]').click();
   assert.equal(await page.locator('#mir-panel-live-alt').getAttribute('data-panel-twin'),'2d','2D remains visible while main 3D is rotated');
   assert.ok(await page.locator('#mir-panel-live-alt svg[data-panel-face]').count()===1);
   await page.screenshot({path:path.join(art,'mir-single-freehand-'+v.name+'.png'),fullPage:true});
   assert.deepEqual(errors,[],'No JavaScript browser errors '+v.name);
   console.log('PASS MIR standalone panel '+v.name+' : 6/12 slope, no-lip side, freehand, dual synced 2D/3D');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
