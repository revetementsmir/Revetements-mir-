'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8922,base='http://127.0.0.1:'+port,artifacts=path.join(__dirname,'../artifacts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(){
 for(let i=0;i<70;i++){
  const ok=await new Promise(resolve=>http.get(base+'/calepinage.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await delay(140);
 }
 throw Error('MIR serveur non accessible');
}
const change=async(input,value)=>{await input.fill(value);await input.press('Tab');};
(async()=>{
 fs.mkdirSync(artifacts,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
 let browser;
 try{
  await wait();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const view of [{name:'telephone',width:390,height:844},{name:'mobile-compact',width:360,height:780},{name:'ipad',width:820,height:1180},{name:'pc',width:1440,height:900}]){
   const context=await browser.newContext({viewport:{width:view.width,height:view.height},hasTouch:view.width<=820});
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',d=>d.accept());
   await page.goto(base+'/calepinage.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRPanelLayoutOutput&&!!document.querySelector('#zone-width'));
   const mobile=view.width<=740;
   if(mobile){
    await page.locator('#mir-cal-mobile-nav').waitFor({state:'visible'});
    assert.equal(await page.locator('body').getAttribute('data-mir-cal-step'),'wall');
    assert.equal(await page.locator('#production-section').count(),0);
    assert.equal(await page.locator('#columns').isVisible(),false,'Les options de panneaux ne précèdent pas les mesures du mur.');
    assert.equal(await page.locator('.production-section').isVisible(),false,'Les options fournisseur ne précèdent pas le mur.');
    await page.screenshot({path:path.join(artifacts,'mir-adjointe-1-mur-'+view.name+'.png'),fullPage:true});
    await change(page.locator('#zone-width'),'120');
    await change(page.locator('#zone-height'),'96');
    await page.locator('#mir-cal-mobile-next').click();
    assert.equal(await page.locator('body').getAttribute('data-mir-cal-step'),'panels');
    assert.equal(await page.locator('#columns').isVisible(),true);
    await change(page.locator('#columns'),'5');
    await change(page.locator('#rows'),'2');
    await change(page.locator('#lip'),'1');
    await page.waitForFunction(()=>/10 panneaux/.test(document.querySelector('#piece-count')?.textContent||''),{timeout:18000});
    assert.equal(await page.locator('#mir-wall-live-3d').getAttribute('data-synced-pieces'),'10');
    await page.screenshot({path:path.join(artifacts,'mir-adjointe-2-panneaux-'+view.name+'.png'),fullPage:true});
    await page.locator('#mir-cal-mobile-next').click();
    assert.equal(await page.locator('body').getAttribute('data-mir-cal-step'),'order');
    assert.equal(await page.locator('#project-name').isVisible(),true);
    assert.equal(await page.locator('#zone-width').isVisible(),false);
    await change(page.locator('#project-name'),'CHANTIER FICTIF');
    await change(page.locator('#po-number'),'DEMO-ADJOINTE-10');
    await change(page.locator('#projection'),'2');
    await page.locator('#mir-cal-mobile-confirm').check();
    assert.equal(await page.locator('#dimensions-confirmed').isChecked(),true);
    assert.equal(await page.locator('.mir-cal-mobile-full-table').getAttribute('open'),null,'Tableau technique caché tant que non demandé');
    await page.screenshot({path:path.join(artifacts,'mir-adjointe-3-bon-'+view.name+'.png'),fullPage:true});
   }else{
    assert.equal(await page.locator('#mir-cal-mobile-nav').count(),0,'La refonte mobile ne déplace pas les champs PC.');
    await page.locator('#load-example').click();
    await page.locator('#columns').fill('5');await page.locator('#columns').press('Tab');
    await page.waitForFunction(()=>/10 panneaux/.test(document.querySelector('#piece-count')?.textContent||''));
   }
   await page.goto(base+'/production.html?view=panels',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProcurementUI&&!!window.MIRPanelWorkbench,{timeout:25000});
   assert.ok(await page.locator('.mir-wb-heading').isVisible(),'L’atelier Panneaux charge son nouveau parcours.');
   assert.ok(await page.locator('.mir-wb-choices').isVisible(),'Dossier vide : seulement les deux choix de création.');
   assert.equal(await page.locator('.mir-panel-cards').count(),0,'Ne plus empiler dix cartes gigantesques.');
   if(mobile)assert.equal(await page.locator('#mir-procurement-tabs').isVisible(),false,'Ne pas afficher six destinations avant le travail sur mobile.');
   const wide=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(wide.scroll<=wide.width+4,'Aucun débordement sur '+view.name+': '+JSON.stringify(wide));
   await page.screenshot({path:path.join(artifacts,'mir-adjointe-accueil-'+view.name+'.png'),fullPage:true});
   assert.deepEqual(errors,[],view.name+' aucune erreur JavaScript');
   console.log('PASS parcours novice '+view.name+' : mur / panneaux / bon ordonnés, interface sans débordement');
   await context.close();
  }
 }finally{await browser?.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
