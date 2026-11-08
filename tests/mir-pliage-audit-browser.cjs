'use strict';
/* Recette Chromium : Admin -> tarif 10 pi -> catalogue client -> brouillon -> fournisseur. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const http=require('node:http'),path=require('node:path'),fs=require('node:fs');
const port=8846,base='http://127.0.0.1:'+port;
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
async function ready(){
 for(let i=0;i<50;i++){
  const ok=await new Promise(resolve=>http.get(base+'/production.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await sleep(160);
 }throw Error('Serveur MIR indisponible');
}
(async()=>{
 fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--directory',path.join(__dirname,'../dist'),'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try {
  await ready();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const size of [{name:'bureau',width:1440,height:900},{name:'mobile',width:390,height:844},{name:'mobile-compact',width:360,height:780}]){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.width<1100});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/production.html?view=boutique',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version,{timeout:25000});
   const nav=page.locator('#mir-procurement-tabs > button');
   assert.deepEqual(await nav.allTextContents(),['Créer','Panneaux','Mes pliages','Boutique','Magasin employés','Bons de commande']);
   await page.evaluate(()=>{
     const M=window.MIRProduction;
     const data={kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2},length:120,quantity:1,material:{type:'aluminium'},finish:{},coloredFace:{side:'left',segmentId:'A'}};
     const result=M.createTemplate(data,{id:'mir-modele-audit',name:'Solin test MIR',description:'Modèle de recette',version:1});
     if(!result.ok)throw Error('Création modèle: '+JSON.stringify(result.errors));
     localStorage.setItem('mir_production_templates_v1',JSON.stringify({version:1,records:[{
       id:result.template.id,name:result.template.name,currentVersion:result.template.version,versions:[result.template],
       channels:{client:false,store:false,po:true},allowed:{materials:['aluminium','acier'],colorSystems:['manufacturer']},
       archived:false,commercial:{status:'draft',currency:'CAD',lengthIn:120,priceCentsByMetal:{}}
     }]}));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForSelector('[data-mir-boutique-form="mir-modele-audit"]',{timeout:25000});
   const form=page.locator('[data-mir-boutique-form="mir-modele-audit"]');
   await form.locator('button[value="published"]').click();
   assert.match(await form.locator('[data-mir-boutique-error]').textContent(),/tarif/);
   await form.locator('[name="aluminium"]').fill('7,99');
   await form.locator('[name="acier"]').fill('10.99');
   await form.locator('[name="store"]').check();
   await form.locator('button[value="published"]').click();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_templates_v1')).records[0]);
   assert.equal(saved.commercial.priceCentsByMetal.aluminium,799);
   assert.equal(saved.commercial.priceCentsByMetal.acier,1099);
   assert.equal(saved.commercial.lengthIn,120);
   assert.equal(saved.channels.client,true);assert.equal(saved.channels.store,true);
   assert.equal(await page.locator('body').getAttribute('data-mir-tab'),'boutique');
   await page.locator('#mir-procurement-tabs [data-mir-tab="draw"]').click();
   if(size.width<=650){
     // En mode traçage plein écran, l'accès réel aux autres sections passe
     // par le menu compact, sans réintroduire les onglets au-dessus du dessin.
     const opener=page.locator('#mir-mobile-section-toggle');
     assert.equal(await opener.isVisible(),true,'navigation admin accessible sans scroll');
     await opener.click();
     assert.equal(await opener.getAttribute('aria-expanded'),'true','menu réellement ouvert');
     await page.locator('#mir-mobile-section-menu [data-mir-mobile-tab="models"]').click();
     assert.equal(await opener.isVisible(),false,'menu non affiché hors du tracé mobile');
   }else{
     await page.locator('#mir-procurement-tabs [data-mir-tab="models"]').click();
   }
   await page.waitForSelector('.model-library-card');
   assert.match(await page.locator('.model-library-card').first().textContent(),/Solin test MIR/);
   await page.goto(base+'/pliage.html',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('[data-custom-model-id="mir-modele-audit"]',{timeout:25000});
   assert.match(await page.locator('[data-custom-model-id="mir-modele-audit"]').textContent(),/7,99/);
   assert.match(await page.locator('[data-custom-model-id="mir-modele-audit"]').textContent(),/10,99/);
   await page.screenshot({path:path.join(__dirname,'../artifacts/pliage-audit-client-'+size.name+'.png'),fullPage:true});
   await page.goto(base+'/production.html?view=boutique',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('[data-mir-boutique-form="mir-modele-audit"]');
   await page.locator('[data-mir-boutique-form="mir-modele-audit"] button[value="draft"]').click();
   const withdrawn=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_templates_v1')).records[0]);
   assert.equal(withdrawn.commercial.status,'draft');assert.equal(withdrawn.channels.client,false);
   await page.locator('#mir-procurement-tabs [data-mir-tab="orders"]').click();
   await page.locator('#mir-procurement-panel [data-mir-tab="suppliers"]').click();
   assert.equal(await page.locator('#mir-procurement-tabs [data-mir-tab="orders"]').getAttribute('aria-current'),'page');
   await page.locator('.mir-proc-back').click();
   assert.equal(await page.locator('body').getAttribute('data-mir-tab'),'orders');
   const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(layout.scroll<=layout.width+3,JSON.stringify(layout));
   assert.deepEqual(errors,[]);
   console.log('PASS '+size.name+' : 4 onglets, prix, catalogue, retrait, fournisseurs, largeur');
   await context.close();
  }
 } finally {if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
