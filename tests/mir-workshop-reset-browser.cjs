'use strict';
/* MIR — écran réel de remise à zéro, ordinateur et mobile Chrome. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const port=8847,base='http://127.0.0.1:'+port;
async function ready(){
 for(let i=0;i<60;i++){
  const ok=await new Promise(resolve=>http.get(base+'/vider-atelier.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await new Promise(r=>setTimeout(r,160));
 }
 throw Error('Serveur local MIR indisponible');
}
(async()=>{
 fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const v of [{name:'bureau',width:1440,height:900},{name:'mobile',width:390,height:844},{name:'compact',width:360,height:780}]){
   const context=await browser.newContext({viewport:{width:v.width,height:v.height},acceptDownloads:true,hasTouch:v.width<1100});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('dialog',dialog=>dialog.accept());
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('a.mir-proc-reset-link',{state:'attached',timeout:25000});
   assert.equal(await page.locator('#mir-procurement-tabs > button').count(),4);
   // Le plein écran de dessin masque volontairement les outils secondaires.
   // Ouvrir la bibliothèque via le bouton visible avant le nettoyage.
   await page.locator('#mir-procurement-tabs [data-mir-tab="models"]').click();
   await page.waitForSelector('a.mir-proc-reset-link',{state:'visible',timeout:25000});
   await page.evaluate(()=>{
    localStorage.setItem('mir_production_templates_v1',JSON.stringify({version:1,records:[{id:'test-model'}]}));
    localStorage.setItem('mir_production_admin_dossier_v1',JSON.stringify({version:1,order:{id:'test-order',items:[{id:'test-piece'}]}}));
    localStorage.setItem('mir-bending-v1',JSON.stringify({version:1,items:[{id:'quick-test'}]}));
    localStorage.setItem('mir_production_admin_orders_v1',JSON.stringify([{id:'OLD-PO'}]));
    localStorage.setItem('mir_admin_procurement_v1',JSON.stringify({version:1,suppliers:[{id:'unico',name:'Fournisseur à conserver',verified:true}],orders:[{id:'supplier-old-po'}]}));
    localStorage.setItem('mir_production_client_dossier_v1',JSON.stringify({version:1,order:{items:[{id:'CLIENT'}]}}));
   });
   await page.locator('a.mir-proc-reset-link').click();
   await page.waitForSelector('#mir-reset-form .mir-reset-option');
   assert.equal(await page.locator('#mir-reset-choices input[name="scope"]:checked').count(),3);
   assert.equal(await page.locator('[data-reset-count="models"]').textContent(),'Éléments enregistrés dans ce navigateur : 1');
   assert.equal(await page.locator('[data-reset-count="orders"]').textContent(),'Éléments enregistrés dans ce navigateur : 2');
   const lay=await page.evaluate(()=>({view:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(lay.scroll<=lay.view+2,v.name+' débordement horizontal : '+JSON.stringify(lay));
   await page.screenshot({path:path.join(__dirname,'../artifacts/mir-reset-'+v.name+'.png'),fullPage:true});
   const download=page.waitForEvent('download');
   await page.locator('#mir-reset-export').click();
   assert.match((await download).suggestedFilename(),/MIR-sauvegarde-atelier-/);
   await page.locator('#mir-reset-confirm').click();
   assert.equal(await page.locator('#mir-reset-success').isVisible(),true);
   const post=await page.evaluate(()=>Object.fromEntries(['mir_production_templates_v1','mir_production_admin_dossier_v1','mir-bending-v1','mir_production_admin_orders_v1','mir_admin_procurement_v1','mir_production_client_dossier_v1'].map(key=>[key,localStorage.getItem(key)])));
   assert.equal(post.mir_production_templates_v1,null);
   assert.equal(post.mir_production_admin_dossier_v1,null);
   assert.equal(post['mir-bending-v1'],null);
   assert.ok(post.mir_production_admin_orders_v1,'Les anciens bons ne doivent pas être supprimés');
   assert.ok(post.mir_production_client_dossier_v1,'Le dossier client ne doit pas être supprimé');
   assert.equal(JSON.parse(post.mir_admin_procurement_v1).suppliers[0].name,'Fournisseur à conserver');
   await page.locator('#mir-reset-success .secondary-link').click();
   await page.waitForSelector('#production-workflow',{state:'attached',timeout:25000});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version,{timeout:25000});
   await page.locator('#mir-procurement-tabs [data-mir-tab="models"]').click();
   await page.waitForSelector('#production-library');
   assert.equal(await page.locator('.model-library-card').count(),0);
   assert.deepEqual(errors,[]);
   console.log('PASS '+v.name+': reset, export JSON, historique préservé, retour à une liste vide');
   await context.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
