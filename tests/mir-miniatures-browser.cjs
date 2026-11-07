'use strict';
const {drawTwoSides,openWorkshopStep}=require('./mir-draw-freeform-helper.cjs');
/* MIR — captures et assertions depuis un VRAI navigateur Chrome. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8786,base='http://127.0.0.1:'+port,folder=path.join(__dirname,'../dist'),artifact=path.join(__dirname,'../artifacts');
const sleep=n=>new Promise(resolve=>setTimeout(resolve,n));
async function online(){
 for(let n=0;n<45;n++){
  const status=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode);}).on('error',()=>resolve(0)));
  if(status===200)return;
  await sleep(180);
 }
 throw Error('Serveur MIR indisponible');
}
(async()=>{
 fs.mkdirSync(artifact,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',folder],{stdio:'ignore'});
 let browser;
 try{
  await online();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const {name,width,height} of [
   {name:'bureau',width:1440,height:900},
   {name:'tablette',width:1024,height:900},
   {name:'mobile',width:390,height:844},
   {name:'mobile-compact',width:360,height:780}
  ]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=1024});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
   await drawTwoSides(page);
   await openWorkshopStep(page,4);
   await page.locator('#production-piece-name').fill('Fascia de fenêtre');
   await page.locator('#add-production-piece').click();
   await page.locator('#mode-link').click();
   const row=page.locator('[data-production-item="M001"]');
   assert.equal((await row.locator('h3').textContent()).trim(),'Fascia de fenêtre');
   const thumb=row.locator('.production-item-thumb');
   await thumb.waitFor({state:'visible'});
   const info=await thumb.evaluate(node=>{
    const svg=node.querySelector('svg[data-mir-miniature]'),shape=svg?.querySelector('path,polygon');
    const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
    const bbox=shape?.getBBox(),view=svg?.viewBox.baseVal;
    return {box:{width:rect.width,height:rect.height},background:style.backgroundColor,border:style.borderTopWidth,
      pathLength:shape?.getAttribute('d')?.length||0,
      viewBox:view?{width:view.width,height:view.height}:null,
      geometry:bbox?{x:bbox.x,y:bbox.y,w:bbox.width,h:bbox.height,cx:bbox.x+bbox.width/2,cy:bbox.y+bbox.height/2}:null};
   });
   assert.equal(info.viewBox?.width,120);
   assert.equal(info.viewBox?.height,120);
   assert.ok(Math.abs(info.box.width-info.box.height)<1.1,name+' miniature non carrée '+JSON.stringify(info));
   assert.equal(info.border,'0px',name+' bordure miniature');
   assert.ok(info.background!=='rgba(0, 0, 0, 0)'&&info.background!=='transparent',name+' fond non uni');
   assert.ok(info.geometry&&Math.max(info.geometry.w,info.geometry.h)>=93,name+' petite forme '+JSON.stringify(info));
   assert.ok(Math.abs(info.geometry.cx-60)<3&&Math.abs(info.geometry.cy-60)<3,name+' décentré '+JSON.stringify(info));
   const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(metrics.scroll<=metrics.viewport+2,name+' débordement horizontal '+JSON.stringify(metrics));
   const heightRow=await row.evaluate(el=>el.getBoundingClientRect().height);
   if(width>600)assert.ok(heightRow<250,name+' carte trop haute '+heightRow);
   await page.addStyleTag({content:'#production-toast{display:none!important}'});
   await row.screenshot({path:path.join(artifact,'mir-miniatures-'+name+'.png')});
   await row.locator('[data-rename-piece]').click();
   await row.locator('[data-rename-form] input[name="name"]').fill('Fascia façade arrière');
   await row.locator('[data-rename-form] button[type="submit"]').click();
   assert.equal((await row.locator('h3').textContent()).trim(),'Fascia façade arrière');
   assert.deepEqual(errors,[]);
   console.log('PASS '+name+' '+width+'x'+height+' forme centrée, carré sans bordure, renommage intact');
   await page.close();
  }
  const shop=await browser.newPage({viewport:{width:390,height:844}});
  await shop.goto(base+'/boutique.html',{waitUntil:'domcontentloaded'});
  const shopCheck=await shop.evaluate(()=>({
   background:getComputedStyle(document.body).backgroundColor,
   miniScript:!!window.MIRMiniature,
   width:document.documentElement.scrollWidth,
   viewport:window.innerWidth
  }));
  assert.ok(['rgb(247, 248, 243)','rgb(250, 250, 247)'].includes(shopCheck.background),
   'Fond MIR incohérent : '+shopCheck.background);
  assert.equal(shopCheck.miniScript,true);
  assert.ok(shopCheck.width<=shopCheck.viewport+2);
  console.log('PASS boutique harmonisée et moteur de miniatures chargé');
  await shop.close();
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
