'use strict';
/* Vérification réelle Chromium de l'atelier admin (captures PC/tablette/mobile). */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const port = 8777;
const base = 'http://127.0.0.1:' + port;
function available() {
  return new Promise((resolve,reject)=>{
    let attempts=0;
    const tryIt=()=>http.get(base+'/production.html',response=>{
      response.resume();
      if(response.statusCode===200)resolve();
      else if(++attempts>40)reject(new Error('HTTP '+response.statusCode));
      else setTimeout(tryIt,200);
    }).on('error',()=>{if(++attempts>40)reject(new Error('Local server unavailable'));else setTimeout(tryIt,200);});
    tryIt();
  });
}
(async()=>{
  fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
  let browser;
  try {
    await available();
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const viewport of [{width:1440,height:900,name:'bureau'},{width:1024,height:768,name:'tablette'},{width:390,height:844,name:'mobile'},{width:360,height:780,name:'mobile-compact'}]){
      const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1,hasTouch:viewport.width<1100});
      const errors=[];
      page.on('pageerror',error=>errors.push(String(error)));
      await page.goto(base+'/production.html',{waitUntil:'domcontentloaded',timeout:25000});
      await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version,{timeout:25000});
      assert.equal(await page.locator('#production-title').textContent(),'Créer une moulure');
      assert.equal(await page.locator('#mir-v4-sheet-value').textContent(),'5 po');
      assert.equal(await page.locator('.mir-v4-sheet-total').count(),1);
      assert.equal(await page.locator('body.mir-admin-v4').count(),1);
      assert.equal(await page.locator('.kind-bar button').count(),2);
      assert.equal(await page.locator('.mir-destinations').isVisible(),false);
      assert.equal(await page.locator('#production-order').isVisible(),false);
      const layout=await page.evaluate(()=>{
        const box=selector=>{const b=document.querySelector(selector).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width};};
        return {scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth,drawing:box('.drawing-card'),config:box('.config-card')};
      });
      assert.ok(layout.scrollWidth<=layout.viewport+2,viewport.name+' horizontal overflow: '+JSON.stringify(layout));
      if(viewport.width>1150)assert.ok(layout.config.left>=layout.drawing.right-5,'Desktop side by side: '+JSON.stringify(layout));
      else assert.ok(layout.config.top>=layout.drawing.bottom-10,'Mobile/tablet stack: '+JSON.stringify(layout));
      assert.ok(await page.locator('.config-card').isVisible());
      await page.screenshot({path:path.join(__dirname,'../artifacts/atelier-v4-'+viewport.name+'.png'),fullPage:true});
      // Tout profil doit garder le calcul et le changement de vue.
      await page.locator('.mir-v4-picker > summary').click();
      await page.locator('.mir-v4-picker [data-template="j"]').click();
      assert.equal(await page.locator('#mir-v4-sheet-value').textContent(),'5 po');
      await page.locator('#panel-zoom-in').click();
      assert.ok((await page.locator('#panel-zoom-value').textContent()).includes('120'));
      await page.locator('.kind-bar [data-kind="panel"]').click();
      assert.equal(await page.locator('#production-title').textContent(),'Panneaux architecturaux');
      assert.equal(await page.locator('#mir-v4-sheet-total').isVisible(),false);
      await page.locator('.kind-bar [data-kind="profile"]').click();
      assert.equal(await page.locator('#production-title').textContent(),'Créer une moulure');
      if(errors.length)throw new Error(viewport.name+' JS errors: '+errors.join('; '));
      console.log('PASS '+viewport.name+' '+viewport.width+'x'+viewport.height+', no overflow, profile and panel, zoom 2D');
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
    await page.locator('#production-unit').selectOption('mm');
    assert.equal(await page.locator('#mir-v4-sheet-value').textContent(),'127 mm','Somme en mm');
    await page.locator('#production-unit').selectOption('in');
    assert.equal(await page.locator('#mir-v4-sheet-value').textContent(),'5 po','Retour en pouces');
    await page.locator('#add-production-piece').click();
    assert.equal((await page.locator('#order-head-count').textContent()).trim(),'01','Saving must not require PO');
    await page.locator('#mode-link').click();
    assert.equal(await page.locator('#production-order').isVisible(),true);
    console.log('PASS save draft without PO and open local dossier');
    await page.close();
    // Le parcours client conserve sa présentation et ses fonctions.
    const client=await browser.newPage({viewport:{width:390,height:844}});
    await client.goto(base+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
    await client.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
    assert.equal(await client.locator('body.mir-admin-v4').count(),0);
    console.log('PASS client unaffected');
    await client.close();
  } finally {
    if(browser)await browser.close();
    server.kill();
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
