'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8812,base='http://127.0.0.1:'+port,dist=path.resolve(__dirname,'../dist');
async function ready(){for(let k=0;k<80;k++){
 const found=await new Promise(resolve=>http.get(base+'/plan.html',res=>{res.resume();resolve(res.statusCode===200)}).on('error',()=>resolve(false)));
 if(found)return;await new Promise(resolve=>setTimeout(resolve,140));
}throw Error('Studio server unavailable');}
(async()=>{
 const server=spawn('python3',['-m','http.server',String(port),'--directory',dist,'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try {
  await ready();browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const screen of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
   const page=await browser.newPage({viewport:{width:screen.width,height:screen.height},hasTouch:screen.width<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/plan.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.MIR_STUDY?.snapshot&&window.MIRVerticalLayout&&document.querySelector('#material')?.options?.length,{},{timeout:45000});
   await page.locator('#view-2d').click();
   async function select(brand,id){
    await page.locator('#material-manufacturer').selectOption(brand);
    await page.locator('#material').selectOption(id);
    await page.waitForFunction(id=>Object.values(window.MIR_STUDY.snapshot().choices).some(c=>c.materialId===id),id);
   }
   await select('CanExel','canexel-vstyle');
   await page.locator('#orientation').selectOption('vertical');
   assert.match(await page.locator('#vertical-rule-summary').innerText(),/Maximum 12 pi/);
   await page.locator('[data-face="back"]').click();
   await page.locator('#view-2d').click();
   await select('CanExel','canexel-vstyle');
   await page.locator('#orientation').selectOption('vertical');
   await page.waitForFunction(()=>document.querySelectorAll('#elevation [data-mir-auto-transition]').length>=1);
   const canexel=await page.locator('#elevation [data-mir-auto-transition]').first().getAttribute('data-mir-max-length');
   assert.equal(canexel,'144');
   await select('St-Laurent','st-laurent-v-groove-825');
   await page.waitForFunction(()=>document.querySelectorAll('#elevation [data-mir-auto-transition]').length>=1);
   assert.equal(await page.locator('#elevation [data-mir-auto-transition]').first().getAttribute('data-mir-max-length'),'144');
   await page.locator('[data-face="front"]').click();
   await page.locator('#view-2d').click();
   await select('James Hardie','hardie-board-batten');
   assert.equal(await page.locator('#batten-spacing-field').isVisible(),true);
   await page.locator('#batten-spacing').selectOption('16');
   await page.waitForFunction(()=>document.querySelector('#elevation [data-mir-batten-spacing="16"]'));
   assert.equal(await page.locator('#elevation [data-mir-batten-anchor="gable-apex"]').count()>0,true);
   assert.match(await page.locator('#vertical-rule-summary').innerText(),/Maximum 10 pi/);
   await page.locator('#material-format').selectOption('48x96');
   assert.match(await page.locator('#vertical-rule-summary').innerText(),/Maximum 8 pi/);
   await page.locator('[data-face="back"]').click();
   await page.locator('#view-2d').click();
   await select('James Hardie','hardie-board-batten');
   await page.waitForFunction(()=>document.querySelectorAll('#elevation [data-mir-batten-anchor="window-jambs"]').length>0);
   await select('Profilec','profilec-la-muralys');
   assert.equal(await page.locator('#material-brand').innerText(),'Profilec');
   await page.locator('#open-material').click();
   assert.match(await page.locator('#material-detail').innerText(),/Profilec/);
   await page.locator('#material-dialog .close-dialog').click();
   assert.equal(await page.locator('#export-render').count(),0);
   assert.equal(await page.locator('.mir-jump-controls').isVisible(),screen.width<801);
   const masonryBrand=JSON.parse(fs.readFileSync(path.join(dist,'catalogue-fd6866b49d21.json'),'utf8')).materials.find(m=>m.id==='generic-stone-cut-preview').brand;
   await select(masonryBrand,'generic-stone-cut-preview');
   const tones=page.locator('#zone-colors [data-color-id]');
   assert.ok(await tones.count()>=3);
   await tones.nth(1).click();
   assert.match(await page.locator('#color-note').innerText(),/Teintes et motifs d’aperçu/);
   assert.ok(Object.values(await page.evaluate(()=>window.MIR_STUDY.snapshot().choices)).some(c=>c.materialId==='generic-stone-cut-preview'&&c.colorSelectionStatus==='illustrative'));
   await page.locator('[data-part="roof"]').click();
   const cornices=page.locator('[data-gable-cornices]');
   await cornices.click();
   assert.equal(await cornices.getAttribute('aria-pressed'),'true');
   await cornices.click();
   assert.equal(await cornices.getAttribute('aria-pressed'),'false');
   assert.deepEqual(errors,[]);
   console.log('PASS nouveaux matériaux '+screen.name+': 12/10/8 pi, battens 16 c/c, pignon, fenêtres et Profilec');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
