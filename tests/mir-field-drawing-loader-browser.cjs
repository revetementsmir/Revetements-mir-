'use strict';
// Real Chromium verification: delayed resources must never expose the old
// public screen inside the employee/chef application. Retry preserves scope.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events'),{chromium}=require('playwright');
const fixture=require('./helpers/mir-field-fixture.cjs');
const root=path.resolve(__dirname,'../dist'),output=path.resolve(__dirname,'../artifacts/field-drawing-loader');
fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://x').pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(404).end();
  fs.readFile(file,(error,bytes)=>{
    if(error)return res.writeHead(404).end();
    if(path.basename(file)==='portal-client.js')bytes=Buffer.concat([bytes,Buffer.from(';('+fixture.toString()+')();')]);
    res.setHeader('content-type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
    res.end(bytes);
  });
});
const snapshot=()=>{const section=document.querySelector('.mir-app-drawing'),frame=document.querySelector('#field-drawing-frame'),doc=frame?.contentDocument;
  return {state:section?.dataset.fieldDrawingState,frameHidden:frame?.getAttribute('aria-hidden'),inert:frame?.inert,visibility:frame?getComputedStyle(frame).visibility:null,oldIntro:doc?.querySelector('.production-intro')?doc.defaultView.getComputedStyle(doc.querySelector('.production-intro')).display:null,field:doc?.documentElement.dataset.fieldDrawing,startup:doc?.documentElement.dataset.mirFieldStartup,
    overlay:section?.querySelector('[data-field-drawing-status]')?.dataset.fieldDrawingStatus,
    tabs:[...document.querySelectorAll('.mir-app-drawing .mir-app-segments button')].map(b=>b.textContent.trim()),
    scope:frame?{actor:frame.dataset.fieldActor,job:frame.dataset.fieldJob,role:frame.dataset.fieldRole,request:frame.dataset.fieldRequest}:null};
};
(async()=>{
  let browser;let releaseDelayed;
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;let checks=0;
  try{
    browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:390,height:796},hasTouch:true});
    page.setDefaultTimeout(10000);
    await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
    const delayed=new Promise(resolve=>releaseDelayed=resolve);let held=0,markHeld;const wasHeld=new Promise(resolve=>markHeld=resolve);
    await page.route('**/production-app.js*',async route=>{held++;markHeld();await delayed;await route.continue();});
    await page.goto(origin+'/chantier.html');
    await page.locator('#field-header').waitFor();
    await page.locator('#portal-navigation [data-view=command]').click();
    assert.equal(await page.locator('.mir-app-c02 .mir-app-segments button').count(),2);
    await page.locator('[data-field-catalogue=fold]').click();
    await page.waitForFunction(()=>document.querySelector('#field-drawing-frame')?.contentDocument?.documentElement.dataset.fieldDrawing==='true');
    await Promise.race([wasHeld,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Deferred editor script was not requested within 10 seconds.')),10000))]);
    // Head parser requests deferred JS before the old intro exists in DOM.
    // Require that exact old public title to exist before checking invisibility.
    await page.waitForFunction(()=>!!document.querySelector('#field-drawing-frame')?.contentDocument?.querySelector('.production-intro'),null,{timeout:10000});
    const whileHeld=await page.evaluate(snapshot);
    assert.equal(held,1,'the deferred editor bootstrap was actually delayed');checks++;
    assert.deepEqual(whileHeld.tabs,['Magasin','Pliages']);checks++;
    assert.equal(whileHeld.state,'loading');assert.equal(whileHeld.overlay,'loading');
    assert.equal(whileHeld.frameHidden,'true');assert.equal(whileHeld.inert,true);assert.equal(whileHeld.visibility,'hidden');checks++;
    assert.equal(whileHeld.oldIntro,'none','the old public title is hidden before editor bootstrap');checks++;
    assert.equal(whileHeld.field,'true','same-origin verified early field startup');checks++;
    await page.screenshot({path:path.join(output,'employee-loading.png')});
    releaseDelayed();releaseDelayed=null;
    await page.waitForFunction(()=>document.querySelector('.mir-app-drawing')?.dataset.fieldDrawingState==='ready',null,{timeout:25000});
    const ready=await page.evaluate(snapshot);
    assert.equal(ready.frameHidden,null);assert.equal(ready.inert,false);assert.equal(ready.visibility,'visible');
    assert.equal(ready.startup,'ready');assert.equal(ready.oldIntro,'none');checks++;
    assert.equal(await page.frameLocator('#field-drawing-frame').locator('#client-draw-profile').count(),1,'Dessiner stays inside Pliages');checks++;
    await page.screenshot({path:path.join(output,'employee-ready.png')});
    await page.close();
    const retryPage=await browser.newPage({viewport:{width:430,height:840},hasTouch:true});
    retryPage.setDefaultTimeout(10000);
    await retryPage.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
    let blocked=0;
    await retryPage.route('**/mir-field-controls.js*',r=>{if(!r.request().frame().parentFrame())return r.continue();if(blocked++===0)return r.abort('failed');return r.continue();});
    await retryPage.goto(origin+'/chantier.html?chef=1');
    await retryPage.locator('#field-header').waitFor();
    await retryPage.locator('#portal-navigation [data-view=command]').click();
    await retryPage.locator('[data-field-catalogue=fold]').click();
    await retryPage.waitForFunction(()=>document.querySelector('.mir-app-drawing')?.dataset.fieldDrawingState==='error',null,{timeout:25000});
    const failed=await retryPage.evaluate(snapshot);
    assert.equal(blocked,1);assert.equal(failed.overlay,'error');assert.equal(failed.frameHidden,'true');assert.equal(failed.visibility,'hidden');checks++;
    assert.equal(await retryPage.locator('[data-field-drawing-retry]:visible').count(),1);checks++;
    await retryPage.screenshot({path:path.join(output,'chef-retry.png')});
    await retryPage.locator('[data-field-drawing-retry]').click();
    await retryPage.waitForFunction(()=>document.querySelector('.mir-app-drawing')?.dataset.fieldDrawingState==='ready',null,{timeout:25000});
    const recovered=await retryPage.evaluate(snapshot);
    assert.ok(blocked>=2);assert.deepEqual(recovered.scope,failed.scope,'actor/job/request stay unchanged on retry');
    assert.equal(recovered.field,'true');assert.equal(recovered.oldIntro,'none');checks++;
    await retryPage.screenshot({path:path.join(output,'chef-recovered.png')});
    await retryPage.close();
    const standalone=await browser.newPage();
    await standalone.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
    await standalone.goto(origin+'/production.html?mode=client&source=store&kind=profile',{waitUntil:'domcontentloaded'});
    assert.equal(await standalone.evaluate(()=>document.documentElement.hasAttribute('data-field-drawing')),false,'URL does not give field privileges');checks++;
    await standalone.close();
    console.log('PASS MIR field startup, delayed first paint, 2 tabs, retry and isolated scope:',checks,'checks');
  }finally{
    if(releaseDelayed)releaseDelayed();
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
