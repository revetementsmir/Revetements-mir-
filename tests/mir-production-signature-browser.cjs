'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent((req.url||'/').split('?')[0]);const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Absent');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
async function verifyMouldingWizard(browser,base,artifacts){
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});
 const url=base+'/production.html?mode=client&kind=profile';
 const errors=[];
 desktop.on('pageerror',error=>errors.push(error.message));
 await desktop.goto(url);
 await desktop.waitForFunction(()=>!!window.MIRProductionWorkspace);
 const stage=()=>desktop.locator('body').getAttribute('data-client-stage');
 const next=desktop.locator('#client-step-next');
 assert.equal(await stage(),'1');
 assert.equal(await next.isDisabled(),true);
 assert.equal(await desktop.locator('[data-client-step]:disabled').count(),4);
 assert.equal(await desktop.locator('#production-dimensions').isVisible(),false);
 // L’entrée approuvée propose deux choix ; ce parcours teste le moteur de tracé réel.
 // Les formes standard ne sont pas dupliquées dans la liste des modèles enregistrés.
 assert.equal(await desktop.locator('#production-templates [data-template]').count(),0);
 await desktop.locator('#client-draw-profile').click();
 const desktopTrace=desktop.locator('#production-drawing svg');
 await desktopTrace.waitFor({state:'visible'});
 for(const point of [[220,330],[465,330],[465,195]]){
  const screen=await desktopTrace.evaluate((svg,[x,y])=>new DOMPoint(x,y).matrixTransform(svg.getScreenCTM()).toJSON(),point);
  await desktop.mouse.click(screen.x,screen.y);
 }
 const desktopFinish=desktop.locator('#drawing-tools [data-draw-tool="draw"]');
 assert.equal(await desktopFinish.isEnabled(),true);
 await desktopFinish.click();
 assert.equal(await stage(),'2');
 assert.equal(await desktop.locator('#client-step-length').isVisible(),false);
 await desktop.locator('[data-segment-length="0"]').fill('3½');
 await desktop.locator('[data-segment-length="1"]').fill('');
 assert.equal(await next.isDisabled(),true);
 await desktop.locator('[data-segment-length="1"]').fill('2');
 await next.click();
 assert.equal(await stage(),'4');
 const length=desktop.locator('[data-measure="length"]');
 assert.equal(await length.inputValue(),'120');
 assert.equal(await length.evaluate(input=>input.readOnly),true,'La longueur de vente est fixée par MIR');
 assert.equal(await desktop.evaluate(()=>window.MIRBendingLengths.check({profileId:'j',lengthIn:96}).ok),false,'96 po ne peut plus être commandé');
 assert.equal(await desktop.locator('.piece-finish').isVisible(),false);
 assert.equal(await next.isDisabled(),true);
 await desktop.locator('[data-client-face="right"]').click();
 assert.equal(await desktop.locator('#production-drawing [data-toggle-painted-face]').count(),1);
 await next.click();
 assert.equal(await stage(),'5');
 const metal=desktop.locator('#material-type');
 assert.equal(await metal.inputValue(),'');
 await metal.selectOption('aluminium');
 assert.equal(await next.isDisabled(),true);
 await desktop.locator('#production-color-grid button').first().click();
 assert.equal(await next.isDisabled(),true);
 assert.equal(await desktop.locator('#production-preview').isVisible(),false);
 const quantity=desktop.locator('#production-quantity');
 assert.equal(await quantity.isVisible(),true);
 assert.equal(await quantity.inputValue(),'');
 await quantity.fill('2');
 assert.equal(await next.isEnabled(),true);
 await desktop.locator('#client-step-back').click();
 await desktop.locator('#client-step-back').click();
 assert.equal(await stage(),'2');
 assert.ok(await desktop.locator('#production-preview').isVisible());
 assert.ok(await desktop.locator('#mir-angle-summary').isVisible());
 await desktop.locator('[data-segment-length="1"]').fill('');
 assert.equal(await next.isDisabled(),true);
 await desktop.locator('[data-segment-length="1"]').fill('2 1/4');
 await next.click();
 await next.click();
 assert.equal(await stage(),'5');
 assert.equal(await next.isEnabled(),true,'Valid edits preserve the choices already confirmed');
 await desktop.locator('.production-workspace').scrollIntoViewIfNeeded();
 await desktop.screenshot({path:path.join(artifacts,'mir-production-signature-moulure-pc.png')});
 await next.click();
 const stored=await desktop.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')).order.items);
 assert.equal(stored.length,1);
 assert.equal(Number(stored[0].spec.length),120);
 assert.equal(stored[0].spec.coloredFace.side,'right');
 assert.equal(stored[0].spec.material.type,'aluminium');
 assert.equal(stored[0].spec.quantity,2);
 assert.equal(stored[0].snapshot.geometry.segments[1].lengthMM,57.15);
 assert.equal(await stage(),'1');
 await desktop.goto(base+'/production.html?mode=client');await desktop.waitForFunction(()=>!!window.MIRProductionWorkspace);
 assert.equal(await stage(),null);
 assert.equal(await desktop.locator('.production-workspace').locator('.template-section').count(),0);
 await desktop.locator('[data-kind="profile"]').click();
 assert.equal(await stage(),'1');
 assert.deepEqual(errors,[]);
 await desktop.close();
 console.log('PASS Moulure client PC : étapes, validations, aperçu avec les cotes et dossier');
 const soffit=await browser.newPage({viewport:{width:390,height:844}});
 await soffit.goto(base+'/production.html?mode=client&kind=profile&profile=j_soffite');
 await soffit.waitForFunction(()=>!!window.MIRProductionWorkspace);
 assert.equal(await soffit.locator('[data-measure="length"]').inputValue(),'144','J à soffite vendu en 12 pi');
 assert.equal(await soffit.locator('[data-measure="length"]').evaluate(input=>input.readOnly),true);
 assert.equal(await soffit.evaluate(()=>window.MIRProductionWorkspace.getLivePreviewState().model.spec.mirProfileId),'j_soffite','Le lien direct conserve la géométrie J à soffite');
 await soffit.close();

 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 mobile.on('pageerror',error=>errors.push(error.message));
 await mobile.goto(url);
 await mobile.waitForFunction(()=>!!window.MIRProductionWorkspace);
 await mobile.locator('#client-draw-profile').tap();
 const trace=mobile.locator('#production-drawing svg');
 await trace.waitFor({state:'visible'});
 const tap=async(x,y)=>{
  const screen=await trace.evaluate((svg,[x,y])=>new DOMPoint(x,y).matrixTransform(svg.getScreenCTM()).toJSON(),[x,y]);
  await mobile.touchscreen.tap(screen.x,screen.y);
 };
 const finish=mobile.locator('#drawing-tools [data-draw-tool="draw"]');
 await tap(220,330);
 await tap(380,330);
 assert.equal(await finish.isDisabled(),true);
 await tap(380,210);
 assert.equal(await finish.isEnabled(),true);
 await finish.tap();
 assert.equal(await mobile.locator('body').getAttribute('data-client-stage'),'2');
 const first=mobile.locator('[data-segment-length="0"]');
 assert.ok((await first.inputValue()).length>0);
 await first.fill('12');
 await mobile.screenshot({path:path.join(artifacts,'mir-production-signature-moulure-mobile.png')});
 await mobile.locator('#client-step-next').tap();
 assert.equal(await mobile.locator('[data-measure="length"]').inputValue(),'120');
 assert.equal(await mobile.locator('body').getAttribute('data-client-stage'),'4');
 await mobile.locator('[data-client-face="left"]').tap();
 await mobile.locator('#client-step-next').tap();
 await mobile.locator('#material-type').selectOption('acier');
 await mobile.locator('#color-system').selectOption('special');
 await mobile.locator('#special-color-code').fill('MIR-TEST');
 assert.equal(await mobile.locator('#client-step-next').isDisabled(),true);
 await mobile.locator('#special-color-system').fill('Nuancier d’essai');
 assert.equal(await mobile.locator('#client-step-next').isDisabled(),true);
 assert.equal(await mobile.locator('#production-quantity').inputValue(),'');
 await mobile.locator('#production-quantity').fill('3');
 assert.equal(await mobile.locator('#client-step-next').isEnabled(),true);
 await mobile.locator('#client-step-next').tap();
 const drawn=await mobile.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')).order.items[0]);
 assert.equal(Number(drawn.spec.segments[0].length),12);
 assert.equal(drawn.spec.coloredFace.side,'left');
 assert.equal(drawn.spec.finish.code,'MIR-TEST');
 assert.equal(drawn.spec.quantity,3);
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 assert.deepEqual(errors,[]);
 await mobile.close();
 console.log('PASS Moulure client tactile : dessin, mesures modifiables et soumission');
}
async function main(){
 await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  for(const width of [360,390,820,1440,3440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.goto('http://127.0.0.1:'+server.address().port+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
   const result=await page.evaluate(()=>{
    const steps=document.querySelector('.mir-production-steps');
    return {mode:document.documentElement.classList.contains('mir-production-client'),
      color:getComputedStyle(document.documentElement).getPropertyValue('--green').trim(),
      bg:getComputedStyle(document.body).backgroundColor,
      steps:!!steps&&getComputedStyle(steps).display!=='none',scroll:document.documentElement.scrollWidth,inner:innerWidth,
      overflowers:[...document.querySelectorAll('body *')].filter(el=>{const box=el.getBoundingClientRect(),style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.right>innerWidth+2}).slice(0,24).map(el=>({tag:el.tagName,cls:String(el.className||'').slice(0,95),id:el.id,right:Math.round(el.getBoundingClientRect().right),width:Math.round(el.getBoundingClientRect().width)}))};
   });
   assert.ok(result.mode&&result.steps,'Parcours client '+width);
   assert.equal(result.color,'#348511','Couleur MIR '+width);
   assert.equal(result.bg,'rgb(250, 250, 247)','Fond MIR '+width);
   assert.ok(result.scroll<=result.inner+2,'Débordement client '+width+': '+result.scroll+' ; éléments: '+JSON.stringify(result.overflowers));
   if(width===390||width===1440||width===3440)await page.screenshot({path:path.resolve(__dirname,'../artifacts/mir-production-signature-'+width+'.png'),fullPage:true});
   await page.close();console.log('PASS Production client '+width+' px');
  }
  await verifyMouldingWizard(browser,'http://127.0.0.1:'+server.address().port,path.resolve(__dirname,'../artifacts'));
  const admin=await browser.newPage({viewport:{width:1440,height:900}});
  await admin.goto('http://127.0.0.1:'+server.address().port+'/production.html',{waitUntil:'domcontentloaded'});
  const check=await admin.evaluate(()=>({mode:document.documentElement.classList.contains('mir-production-client'),steps:getComputedStyle(document.querySelector('.mir-production-steps')).display}));
  assert.equal(check.mode,false,'Mode Admin inchangé');
  assert.equal(check.steps,'none','Guide client absent dans Admin');
  await admin.close();console.log('PASS Interface Admin non modifiée');
 }finally{if(browser)await browser.close();server.close();}
}
main().catch(err=>{console.error(err);server.close();process.exitCode=1});
