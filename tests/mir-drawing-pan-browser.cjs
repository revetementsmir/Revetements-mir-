'use strict';
const {drawTwoSides,openWorkshopStep}=require('./mir-draw-freeform-helper.cjs');
/* MIR : déplacer tout le dessin depuis la vue sans modifier cotes ou forme. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.join(__dirname,'../dist'),folder=path.join(__dirname,'../artifacts');
const port=8798,base='http://127.0.0.1:'+port;
const wait=t=>new Promise(r=>setTimeout(r,t));
async function ready(){
 for(let i=0;i<40;i++){
  const result=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode)}).on('error',()=>resolve(0)));
  if(result===200)return;await wait(170);
 }
 throw Error('HTTP server not available');
}
(async()=>{
 fs.mkdirSync(folder,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--directory',root,'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const s of [{name:'bureau',width:1440,height:900},{name:'mobile',width:390,height:844},{name:'compact',width:360,height:780}]){
   const page=await browser.newPage({viewport:{width:s.width,height:s.height},deviceScaleFactor:1,hasTouch:s.width<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
   await drawTwoSides(page);
   await openWorkshopStep(page,4);
   await page.locator('#production-drawing').scrollIntoViewIfNeeded();
   const shape=page.locator('#production-drawing svg > path').first();
   const before=await shape.boundingBox();
   const beforeScroll=await page.evaluate(()=>scrollY);
   const count=await page.locator('#mir-v4-sheet-value').textContent();
   const dimensions=await page.locator('#production-dimensions input[data-segment-length]').evaluateAll(inputs=>inputs.map(e=>e.value));
   const area=await page.locator('#production-drawing').boundingBox();
   const start={x:area.x+area.width*.23,y:area.y+area.height*.45};
   if(s.width<600){
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+60,y:start.y+38}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+74,y:start.y+40}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }else{
    await page.mouse.move(start.x,start.y);
    await page.mouse.down();
    await page.mouse.move(start.x+70,start.y+40,{steps:8});
    await page.mouse.up();
   }
   const after=await shape.boundingBox();
   assert.ok(after.x-before.x>25,'View should shift right '+JSON.stringify({before,after,s}));
   assert.ok(after.y-before.y>13,'View should shift down '+JSON.stringify({before,after,s}));
   assert.equal(await page.locator('#mir-v4-sheet-value').textContent(),count);
   assert.deepEqual(await page.locator('#production-dimensions input[data-segment-length]').evaluateAll(inputs=>inputs.map(e=>e.value)),dimensions);
   await page.locator('#production-drawing').screenshot({path:path.join(folder,'mir-pan-'+s.name+'.png')});
   await page.locator('#panel-view-reset').click();
   const reset=await shape.boundingBox();
   const resetScroll=await page.evaluate(()=>scrollY);
   assert.ok(Math.abs(reset.x-before.x)<3&&Math.abs((reset.y+resetScroll)-(before.y+beforeScroll))<3,
    'Vue complète must recenter '+JSON.stringify({before,reset,s}));
   assert.deepEqual(errors,[]);
   console.log('PASS '+s.name+' glisser la vue + recentrer sans changer les cotes');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
