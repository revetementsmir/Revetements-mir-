'use strict';
// Native MIR UI and geometry; no Supabase writes, orders or payment calls.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http'),{once}=require('events'),crypto=require('crypto');
const {chromium}=require('playwright'),M=require('../dist/production-model.js');
const root=path.resolve(__dirname,'../dist'),proof=path.resolve(__dirname,'../docs/verification/client-pliage');fs.mkdirSync(proof,{recursive:true});
function serve(dir){return http.createServer((req,res)=>{const f=path.resolve(dir,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(dir+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.avif':'image/avif','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});}
const spec={kind:'profile',template:'l',unit:'in',dimensions:{A:3.5,B:2.25},length:120,quantity:2,material:{type:'aluminium'},finish:{system:'special',code:'QA',name:'Recette'},coloredFace:{side:'left',segmentId:'A'}};
const t=M.createTemplate(spec,{id:'qa-client-model',name:'Modèle publié de recette'});assert.equal(t.ok,true);
const made=M.instantiateTemplate(t.template,{id:'M001',unit:'in',measurements:{A:3.5,B:2.25},length:120,quantity:2,material:spec.material,finish:spec.finish,coloredFace:spec.coloredFace});assert.equal(made.ok,true);
const dossier={version:1,order:{id:'qa-existing-dossier',project:'Dossier existant QA',foreman:'',date:'',notes:'',items:[{id:'M001',kind:'profile',spec:made.spec,snapshot:made.snapshot,history:[]}]}};
const quick={version:1,project:'Liste rapide QA',items:[{id:'quick-existing',profile:'l',dimensions:{A:3.5,B:2.25},lengthIn:120,quantity:2}]};
const modelRecord={id:t.template.id,name:t.template.name,currentVersion:1,versions:[t.template],channels:{client:true,store:false,po:true},archived:false,allowed:{materials:['aluminium','acier'],colorSystems:['manufacturer','special']}};
async function contextFor(browser,base,viewport){const context=await browser.newContext({viewport,isMobile:viewport.width<=428,hasTouch:viewport.width<=1024});await context.route('**/*',route=>{if(!route.request().url().startsWith(base))return route.abort();return route.continue();});return context;}
async function verifyFirstPaint(browser,base,{width,height,touch}){
 const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch});
 await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
 try{
  const page=await context.newPage();
  await page.goto(base+'/pliage.html');
  async function hold(pattern){
   let release;
   const gate=new Promise(resolve=>{release=resolve;});
   await page.route(pattern,async route=>{await gate;await route.continue();});
   return {release,started:page.waitForRequest(pattern,{timeout:20000})};
  }
  async function assertWaiting(){
   await page.locator('#client-entry-title').waitFor();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await page.locator('#production-title').isVisible(),false,'aucune intro atelier pendant le chargement');
   assert.equal(await page.locator('.workshop-banner').isVisible(),false,'aucun bandeau atelier');
   assert.equal(await page.locator('.mir-production-steps').isVisible(),false);
   assert.equal(await page.locator('.mir-destinations').isVisible(),false);
   assert.equal(await page.locator('#production-preview').isVisible(),false);
   assert.equal(await page.locator('#client-choose-model').isVisible(),true);
   assert.equal(await page.locator('#client-draw-profile').isVisible(),true);
   assert.equal(await page.locator('#client-draw-profile').isEnabled(),false,'attendre la disponibilité du configurateur');
   const choices=await page.locator('.client-entry-cards').boundingBox();
   assert.ok(choices.x>=0&&choices.x+choices.width<=width+1,'choix complets dans la largeur visible');
   return page.locator('#client-entry-title').boundingBox();
  }
  const app=await hold('**/production-app.js?*');
  const catalogue=await hold('**/catalogue-fd6866b49d21.json');
  try{
   const opening=page.waitForURL(/production\.html.*kind=profile/,{waitUntil:'commit'});
   await page.getByRole('link',{name:/Pliage personnalisé/})[touch?'tap':'click']();
   await opening;
   await app.started;
   const heading=await assertWaiting();
   app.release();
   await catalogue.started;
   assert.deepEqual(await assertWaiting(),heading,'l’en-tête ne déplace pas les choix');
   catalogue.release();
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
   const readyHeading=await page.locator('#client-entry-title').boundingBox();
   assert.deepEqual(readyHeading,heading,'les choix restent au même endroit une fois actifs');
   assert.equal(await page.locator('#client-choice-loading').isVisible(),false);
   await page.locator('#client-draw-profile')[touch?'tap':'click']();
   assert.equal(await page.locator('#production-drawing').isVisible(),true,'le dessin libre démarre normalement');
   console.log('PASS démarrage sans écran atelier '+width+'×'+height+(touch?' tactile':' souris'));
  }finally{app.release();catalogue.release();}
 }finally{await context.close();}
}
(async()=>{const server=serve(root);server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const beforeDir=process.env.MIR_CLIENT_BASELINE_DIR,before=beforeDir?serve(path.resolve(beforeDir)):null;if(before){before.listen(0,'127.0.0.1');await once(before,'listening');}
const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium'}),results=[];try{
 for(const [width,height,touch] of [
  [360,780,true],[390,844,true],[428,926,true],[844,390,true],
  [768,1024,true],[834,1112,true],[1112,834,true],
  [1024,768,false],[1280,720,false],[1440,900,false],[1920,1080,false],[3440,1440,false]
 ])await verifyFirstPaint(browser,base,{width,height,touch});
 for(const [width,height]of [[360,780],[390,844],[428,926],[600,900],[601,900],[834,1112],[1024,768],[1348,926],[1440,900]]){
 const c=await contextFor(browser,base,{width,height}),page=await c.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.stack);console.log('PAGEERROR '+page.url()+' '+e.stack);});
 await page.addInitScript(({dossier,quick,modelRecord})=>{if(!sessionStorage.getItem('qa-seeded')){localStorage.setItem('mir_production_client_dossier_v1',JSON.stringify(dossier));localStorage.setItem('mir-bending-v1',JSON.stringify(quick));localStorage.setItem('mir_production_templates_v1',JSON.stringify({version:1,records:[modelRecord]}));sessionStorage.setItem('qa-seeded','1');}},{dossier,quick,modelRecord});
 const noOverflow=async()=>assert.equal(await page.evaluate(async()=>{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const root=document.scrollingElement;
  return root.scrollWidth<=innerWidth+1&&root.scrollHeight<=root.clientHeight+1;
 }),true,'wizard fits one screen '+width);
 await page.goto(base+'/pliage.html');await page.locator('#bend-items [data-qty]').waitFor({state:'attached'});assert.equal(await page.locator('#client-bend-quick').getAttribute('open'),null);assert.equal(await page.getByRole('link',{name:'Pliage personnalisé'}).count(),1);
 const action=await page.getByRole('link',{name:'Pliage personnalisé'}).boundingBox();assert.ok(action.y+action.height<=height,'CTA above fold '+width);const illustration=await page.locator('.client-bend-example').boundingBox();assert.ok(width<=600?illustration.y>=action.y+action.height:illustration.x>action.x+action.width,'responsive landing '+width);await noOverflow();
 await page.screenshot({path:path.join(proof,'01-introduction-'+width+'.png')});assert.equal(await page.locator('footer.mir-signature-footer nav a:visible').count(),5);await page.locator('#client-bend-quick summary').click();await page.locator('#bend-project').fill('Liste rapide conservée');await page.locator('#bend-items [data-qty]').fill('3');await page.locator('#bend-items [data-qty]').press('Tab');const quickSaved=await page.evaluate(()=>localStorage.getItem('mir-bending-v1'));assert.equal(JSON.parse(quickSaved).items[0].quantity,3);await page.reload();await page.locator('#bend-items [data-qty]').waitFor({state:'attached'});assert.equal(await page.locator('#client-bend-quick').getAttribute('open'),null);assert.equal(await page.locator('#bend-project').inputValue(),'Liste rapide conservée');
 const headerSize=()=>page.locator('header[data-mir-public-shell]').evaluate(el=>[el.offsetWidth,el.offsetHeight]);const beforeHeader=await headerSize();await page.getByRole('link',{name:'Pliage personnalisé'}).click();await page.locator('#client-entry').waitFor();assert.ok((await headerSize()).every((size,i)=>Math.abs(size-beforeHeader[i])<=1),'same header dimensions');const menuToggle=page.locator('header .mir-client-menu-toggle');if(width<=760)await menuToggle.click();assert.equal(await page.locator('header nav.mir-client-links a[aria-current=page]').isVisible(),true);assert.equal(await page.locator('#mode-link').isVisible(),false);if(width<=760){await page.keyboard.press('Escape');assert.equal(await page.locator('header nav.mir-client-links').isVisible(),false);}await page.waitForFunction(()=>!!window.MIRProductionWorkspace);assert.equal(await page.locator('.drawing-card').isVisible(),false,'no empty preview');const a=await page.locator('#client-choose-model').boundingBox(),b=await page.locator('#client-draw-profile').boundingBox();assert.ok(Math.abs(a.height-b.height)<2,'equal card importance');assert.ok(width<=600?b.y>=a.y+a.height:Math.abs(a.y-b.y)<2,'responsive choices');await noOverflow();await page.screenshot({path:path.join(proof,'02-choix-'+width+'.png')});
 await page.locator('#client-choose-model').click();await noOverflow();assert.ok(await page.locator('#client-standard-options button').count()>0);assert.equal(await page.locator('[data-saved-template="qa-client-model"]').isVisible(),true);await page.locator('[data-client-profile="l"]').click();await page.waitForFunction(()=>document.body.dataset.clientStage==='2');assert.equal(await page.locator('[data-measure="A"]').inputValue(),'');await page.locator('[data-measure="A"]').fill('3½');await page.locator('[data-measure="B"]').fill('2¼');assert.ok(await page.locator('#production-preview').isVisible());assert.ok(await page.locator('#mir-angle-summary').isVisible());assert.equal(await page.locator('#client-step-next').isEnabled(),true);assert.ok(Math.abs(await page.evaluate(()=>window.MIRProductionWorkspace.getLivePreviewState().model.segments[0].lengthMM)-88.9)<1e-9);
 await page.locator('#client-step-back').click();await page.locator('#client-choose-model').click();await page.locator('[data-client-profile="l"]').click();await page.waitForFunction(()=>document.body.dataset.clientStage==='2');assert.equal(await page.locator('[data-measure="A"]').inputValue(),'3½','same standard model retains typed measurements');await page.locator('#client-step-back').click();await page.locator('#client-choose-model').click();await page.locator('[data-saved-template="qa-client-model"]').click();await page.waitForFunction(()=>document.body.dataset.clientStage==='2');assert.equal(await page.locator('#production-dimensions').isVisible(),true);const firstModelField=page.locator('#production-dimensions input').first();await firstModelField.fill('4');await page.locator('#client-step-back').click();await page.locator('#client-choose-model').click();await page.locator('[data-saved-template="qa-client-model"]').click();await page.waitForFunction(()=>document.body.dataset.clientStage==='2');assert.equal(await firstModelField.inputValue(),'4','same saved model retains typed measurements');await page.locator('#client-step-back').click();
 await page.locator('#client-draw-profile').click();await page.waitForFunction(()=>scrollY===0);assert.equal(await page.locator('.mobile-trace').count(),0,'portrait without forced fullscreen');const draw=page.locator('#production-drawing'),tools=page.locator('#drawing-tools');const {box,controls}=await page.evaluate(async()=>{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return {box:document.querySelector('#production-drawing').getBoundingClientRect().toJSON(),
   controls:document.querySelector('#drawing-tools').getBoundingClientRect().toJSON()};
 });assert.ok(box.width>=250&&box.height>=280,'useful drawing surface');assert.ok(width<=600?controls.top>=box.bottom-1:controls.left>=box.right-1,'drawing actions position '+width+' '+JSON.stringify({box,controls}));assert.ok(controls.bottom<=height+1,'drawing actions visible '+width);assert.ok((await tools.locator('button').first().boundingBox()).height>=44);await noOverflow();await page.screenshot({path:path.join(proof,'03-dessin-'+width+'.png')});
 const tap=async(x,y)=>{const screen=await page.locator('#production-drawing svg').evaluate((s,[x,y])=>{const p=new DOMPoint(x,y).matrixTransform(s.getScreenCTM());return {x:p.x,y:p.y};},[x,y]);assert.equal(await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('#production-drawing'),screen),true,'trace coordinate hits actual canvas');if(width<=1024)await page.touchscreen.tap(screen.x,screen.y);else await page.mouse.click(screen.x,screen.y);};
 const finish=tools.getByRole('button',{name:'Suivant — terminer le dessin',exact:true});assert.equal(await finish.isDisabled(),true);await tap(220,330);assert.equal(await page.evaluate(()=>window.MIRProductionWorkspace.getLivePreviewState().drawPointsMM.length),1);await tap(380,330);assert.equal(await finish.isDisabled(),true);await tap(380,210);assert.equal(await finish.isEnabled(),true);await tools.getByRole('button',{name:'Annuler le point',exact:true}).click();assert.equal(await page.evaluate(()=>window.MIRProductionWorkspace.getLivePreviewState().drawPointsMM.length),2);assert.equal(await finish.isDisabled(),true);await tap(380,210);assert.equal(await finish.isEnabled(),true);const angle=page.locator('#production-drawing .mir-angle-annotation');assert.equal(await angle.count(),1);assert.equal(await angle.locator('rect').count(),0);const angleText=await angle.locator('text').allTextContents();assert.ok(!angleText.length||angleText.join('')==='90°');const geometry=await page.evaluate(()=>JSON.stringify(window.MIRProductionWorkspace.getLivePreviewState().model.pointsMM));await finish.click();await page.waitForFunction(()=>document.body.dataset.clientStage==='2');assert.equal(await page.evaluate(()=>JSON.stringify(window.MIRProductionWorkspace.getLivePreviewState().model.pointsMM)),geometry);assert.equal(await page.locator('[data-segment-length]:visible').count(),2);assert.ok(await page.locator('#production-preview').isVisible());assert.match(await page.locator('#mir-angle-summary').textContent(),/90°/);await noOverflow();assert.match(await page.locator('#client-step-hint').textContent(),/10 pi/);await page.locator('#client-step-next').click();assert.equal(await page.locator('body').getAttribute('data-client-stage'),'4');assert.match(await page.locator('#client-step-count').textContent(),/3 SUR 4/);await page.locator('#client-step-back').click();assert.equal(await page.locator('body').getAttribute('data-client-stage'),'2');await page.screenshot({path:path.join(proof,'04-mesures-'+width+'.png')});
 await page.locator('#client-step-next').click();
 assert.equal(await page.locator('[data-client-face] .profile-painted-star').count(),2);
 assert.equal(await page.locator('#profile-painted-segment:visible').count(),0);
 await page.locator('[data-client-face="left"]').click();
 await page.locator('#client-step-next').click();
 await page.locator('#material-type').selectOption('aluminium');
 await noOverflow();
 await page.locator('#color-system').selectOption('ral');
 await noOverflow();
 assert.equal(await page.locator('#production-quantity').isVisible(),false);
 assert.equal(await page.getByRole('navigation',{name:'Pages de couleurs'}).count(),0);
 const palette=page.locator('#production-color-grid');
 assert.ok(await palette.evaluate(grid=>grid.scrollHeight>grid.clientHeight));
 await page.locator('#color-system').selectOption('special');
 await noOverflow();

 assert.equal(await page.evaluate(()=>localStorage.getItem('mir_production_client_dossier_v1')),JSON.stringify(dossier),'existing dossier unchanged');assert.equal(await page.evaluate(()=>localStorage.getItem('mir-bending-v1')),quickSaved,'quick list unchanged');await page.goto(base+'/production.html?mode=client&kind=profile#production-order');await page.getByRole('link',{name:'Voir mon dossier complet'}).click();await page.waitForURL('**/selection.html#mir-unified-dossier');await page.locator('#mir-unified-pieces li').waitFor();assert.equal(await page.locator('#mir-unified-pieces li').count(),1);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')).order.items[0].snapshot.revision),1);assert.deepEqual(errors,[]);results.push({width,height,input:width<=1024?'touch':'mouse',landing:true,models:true,freehand:true,undo:true,measurements:true,existingDossier:true});await c.close();console.log('PASS client pliage '+width+'×'+height+' landing/models/native trace/undo/measures/existing dossier');
 }
 if(before){
  const beforeBase='http://127.0.0.1:'+before.address().port;
  for(const [width,height]of [[390,844],[834,1112],[1348,926]]){
   const layouts=[],sources=[];
   for(const [label,url]of [['avant',beforeBase],['apres',base]]){
    const c=await contextFor(browser,url,{width,height}),page=await c.newPage(),responses=[];
    page.on('response',res=>{if(res.ok())responses.push(res);});
    await page.goto(url+'/index.html');
    await page.evaluate(()=>{for(const image of document.images)image.loading='eager';});
    await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
    await page.evaluate(async()=>{
     await Promise.all([...document.images].map(image=>image.decode()));
     await document.fonts.ready;
     scrollTo({top:0,left:0,behavior:'instant'});
     await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });
    // Les pixels rastérisés peuvent varier entre deux captures sur le runner.
    // Vérifier les ressources, les dimensions et les styles réellement calculés.
    layouts.push(await page.evaluate(()=>Array.from(document.body.querySelectorAll('*'),element=>{
     const {x,y,width,height}=element.getBoundingClientRect();
     const style=getComputedStyle(element);
     return [element.tagName,x,y,width,height,style.display,style.visibility,style.font,style.color,style.backgroundColor,element.currentSrc?new URL(element.currentSrc).pathname:null];
    })));
    await page.screenshot({path:path.join(proof,'accueil-'+label+'-'+width+'.png'),fullPage:true,animations:'disabled'});
    sources.push(Object.fromEntries(await Promise.all(responses.map(async res=>[
     new URL(res.url()).pathname,crypto.createHash('sha256').update(await res.body()).digest('hex')
    ]))));
    await c.close();
   }
   assert.deepEqual(sources[0],sources[1],'identical homepage resources '+width);
   assert.deepEqual(layouts[0],layouts[1],'identical homepage layout '+width);
   results.push({homepageWidth:width,height,identicalResources:true,identicalLayout:true});
   console.log('PASS homepage '+width+' identical resources and layout');
  }
 }
 fs.writeFileSync(path.join(proof,'results.json'),JSON.stringify({browser:'Installed Chromium, emulation only; no physical Android/iPad/Safari claim',externalNetwork:'Blocked equally for deterministic local screenshots; no remote writes',results},null,2));
}finally{await browser.close();server.close();before?.close();}})().catch(e=>{console.error(e);process.exitCode=1});
