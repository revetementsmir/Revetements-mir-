'use strict';
/* Vérification Chrome : les commandes demandées changent réellement le projet. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const dir=path.resolve(__dirname,'../dist'),port=8815,base='http://127.0.0.1:'+port;
async function ready(){for(let i=0;i<80;i++){
 const x=await new Promise(done=>http.get(base+'/plan.html',r=>{r.resume();done(r.statusCode===200)}).on('error',()=>done(false)));
 if(x)return;await new Promise(r=>setTimeout(r,120));
}throw Error('MIR dev server unavailable');}
(async()=>{
 const server=spawn('python3',['-m','http.server',String(port),'--directory',dir,'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
  await ready();browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const screen of [{width:390,height:844,kind:'mobile'},{width:1440,height:900,kind:'PC'}]){
   const page=await browser.newPage({viewport:{width:screen.width,height:screen.height},hasTouch:screen.width<500});
   const errs=[];page.on('pageerror',e=>errs.push(e.message));
   await page.goto(base+'/plan.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.MIR_STUDY?.snapshot&&document.querySelector('#zone-list .zone-button'),null,{timeout:40000});
   await page.locator('#view-2d').click();
   // 1) Accent : créer, déplacer par cotes et retirer.
   await page.locator('#add-accent').click();
   await page.locator('#mir-accent-actions').waitFor({state:'visible'});
   assert.equal(await page.locator('#geometry-controls').evaluate(e=>e.open),true);
   let accent=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-plan-study-v2')).customZones.front.at(-1));
   assert.ok(accent?.custom);
   await page.locator('#geo-x').fill('32');await page.locator('#geo-x').dispatchEvent('change');
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-plan-study-v2')));
   assert.ok(saved.zoneOverrides['front:'+accent.id]||saved.zoneOverrides['front|'+accent.id]||Object.keys(saved.zoneOverrides).some(k=>k.includes(accent.id)));
   await page.locator('#mir-remove-accent').click();
   assert.ok(!(await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-plan-study-v2')).customZones.front)).some(z=>z.id===accent.id));
   // 2) Reprendre les joints automatiques puis les supprimer sans réapparition.
   await page.locator('#material-manufacturer').selectOption('CanExel');
   await page.locator('#material').selectOption('canexel-vstyle');
   await page.locator('#orientation').selectOption('vertical');
   await page.locator('details:has(#edit-auto-transitions) summary').click();
   assert.equal(await page.locator('#edit-auto-transitions').isVisible(),true);
   await page.locator('#edit-auto-transitions').click();
   assert.ok(await page.locator('#transition-list [data-transition-position]').count()>0);
   assert.equal(await page.locator('#elevation [data-mir-auto-transition]').count(),0);
   await page.locator('#transition-list [data-delete-transition]').first().click();
   assert.equal(await page.locator('#elevation [data-mir-auto-transition]').count(),0);
   await page.locator('#restore-auto-transitions').click();
   assert.ok(await page.locator('#elevation [data-mir-auto-transition]').count()>0);
   // 3) Battens visibles : pas et couleur indépendants des panneaux.
   await page.locator('#material-manufacturer').selectOption('James Hardie');
   await page.locator('#material').selectOption('hardie-board-batten');
   await page.locator('#batten-spacing').selectOption('16');
   await page.locator('#batten-color').fill('#b36143');
   await page.locator('#batten-color').dispatchEvent('change');
   await page.waitForFunction(()=>document.querySelector('#elevation')?.innerHTML.includes('#b36143'));
   assert.ok(await page.locator('#elevation [data-mir-batten-spacing="16"]').count()>0);
   // La transition Hardie n'est pas une simple ligne : elle partage la découpe du panneau.
   const linked=()=>page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('mir-plan-study-v2')).panelLayouts||{})
     .find(x=>x.linkedTransitionMaxIn===120));
   const initialCut=await linked();
   assert.ok(initialCut?.horizontal?.length>0,'Les raccords Hardie doivent diviser les pièces de panneaux');
   if(!await page.locator('#edit-auto-transitions').isVisible())await page.locator('details:has(#edit-auto-transitions) summary').click();
   await page.locator('#edit-auto-transitions').click();
   const field=page.locator('#transition-list [data-transition-position]').first();
   await field.fill('80');await field.dispatchEvent('change');
   const changedCut=await linked();
   assert.ok(changedCut?.horizontal?.some(x=>Math.abs(x.position-initialCut.horizontal[0].position)>.02));
   const cutsBeforeDelete=changedCut.horizontal.length;
   await page.locator('#transition-list [data-delete-transition]').first().click();
   const afterDelete=await linked();
   assert.equal(afterDelete.horizontal.length,cutsBeforeDelete-1,'Supprimer la moulure supprime aussi le joint de panneau');
   await page.locator('#restore-auto-transitions').click();
   assert.ok((await linked())?.horizontal.length>0,'Les joints proposés peuvent être rétablis');
   // 4) Fenêtres, portes et cadres ont leurs propres réglages et profils.
   await page.evaluate(()=>document.querySelector('#elevation [data-opening="porte_gauche"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));
   await page.locator('#opening-door-color').fill('#304e64');
   await page.locator('#opening-door-color').dispatchEvent('change');
   await page.locator('#opening-frame-color').fill('#d7b282');
   await page.locator('#opening-frame-color').dispatchEvent('change');
   await page.locator('#opening-door-design').selectOption('solid');
   assert.equal(await page.locator('#elevation [data-opening="porte_gauche"]').getAttribute('data-mir-opening-design'),'solid');
   assert.equal(await page.locator('#elevation [data-opening="porte_gauche"]').getAttribute('data-mir-frame-color'),'#d7b282');
   assert.ok((await page.locator('#elevation [data-opening="porte_gauche"]').innerHTML()).includes('#304e64'));
   await page.evaluate(()=>document.querySelector('#elevation [data-opening="fenetre_gauche_basse"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));
   await page.locator('#opening-batten-color').fill('#bd8d5e');
   await page.locator('#opening-batten-color').dispatchEvent('change');
   assert.equal(await page.locator('#elevation [data-opening="fenetre_gauche_basse"] [data-mir-window-batten]').count(),1);
   assert.ok((await page.locator('#elevation [data-opening="fenetre_gauche_basse"] [data-mir-window-batten]').getAttribute('stroke'))==='#bd8d5e');
   // 5) Coins de finition et revêtements de poteaux/beam réellement reliés.
   await page.locator('[data-part="corner"]').click();
   assert.equal(await page.locator('#mir-corner-enabled').isChecked(),true);
   await page.locator('#mir-corner-color').fill('#a7bf78');
   await page.locator('#mir-corner-color').dispatchEvent('change');
   const corners=await page.evaluate(()=>{
    const v=window.MIR_STUDY.snapshot();
    return window.MIR3D.mesh({...v,dimensions:window.MIR3D.defaults}).faces.filter(f=>f.role==='aluminum-corner-proposal');
   });
   assert.equal(corners.length,48);
   assert.ok(corners.every(f=>f.fillColor==='#a7bf78'));
   const frames=await page.locator('#elevation [data-mir-opening-type="window"]').evaluateAll(windows=>windows.map(window=>{
    const box=window.getBBox();
    return Number(window.dataset.mirFrameWidth)/Math.min(box.width,box.height);
   }));
   assert.ok(frames.length>0&&frames.every(ratio=>ratio<=.027),'Les cadres de fenêtre restent minces');
   await page.locator('#mir-corner-scope').selectOption('front');
   assert.ok(await page.locator('#mir-corner-product option[value="gentek-coil-3037"]').count());
   await page.locator('#mir-corner-product').selectOption('kaycan-coil-0721-30m');
   const kaycanColor=await page.locator('[data-corner-color]').last().getAttribute('data-corner-color');
   await page.locator('[data-corner-color]').last().click();
   await page.locator('#mir-corner-scope').selectOption('back');
   await page.locator('#mir-corner-metal').selectOption('steel');
   assert.ok(await page.locator('#mir-corner-product option[value="mac-acier-moulures"]').count());
   await page.locator('#mir-corner-product').selectOption('vicwest-bellara-flat-sheet');
   const vicwestColor=await page.locator('[data-corner-color]').first().getAttribute('data-corner-color');
   await page.locator('[data-corner-color]').first().click();
   await page.locator('#view-3d').click();
   await page.waitForFunction(()=>window.MIR3D.diagnostics(document.querySelector('#three-canvas'))?.hitSurfaces.some(s=>Number.isInteger(s.cornerIndex)));
   const picked=await page.evaluate(()=>{
    const canvas=document.querySelector('#three-canvas'),box=canvas.getBoundingClientRect();
    const corners=window.MIR3D.diagnostics(canvas).hitSurfaces.filter(s=>s.cornerIndex!==undefined).reverse();
    for(const c of corners){
     const [x,y]=c.screenPolygon.reduce(([x,y],[a,b])=>[x+a/c.screenPolygon.length,y+b/c.screenPolygon.length],[0,0]);
     const hit=window.MIR3D.pick(canvas,box.left+x,box.top+y);
     if(hit?.cornerIndex===c.cornerIndex&&window.MIR_STUDY.pickThree(box.left+x,box.top+y))return hit.cornerIndex;
    }
    return null;
   });
   assert.ok(Number.isInteger(picked),'Un coin du volume peut être sélectionné directement');
   assert.equal(await page.locator('#mir-corner-scope').inputValue(),'single');
   await page.locator('#mir-corner-color').fill('#a96d42');
   await page.locator('#mir-corner-color').dispatchEvent('change');
   const split=await page.evaluate(()=>{
    const v=window.MIR_STUDY.snapshot();
    return window.MIR3D.mesh({...v,dimensions:window.MIR3D.defaults}).faces.filter(f=>f.role==='aluminum-corner-proposal');
   });
   assert.ok(split.every(f=>f.cornerIndex===picked?f.fillColor==='#a96d42':
     [1,3].includes(f.cornerIndex)?f.finishColorId===vicwestColor:f.finishColorId===kaycanColor));

   await page.locator('[data-part="structure"]').click();
   await page.locator('#structure-finish-metal').selectOption('steel');
   await page.locator('#structure-wrap').selectOption('vicwest-bellara-flat-sheet');
   await page.locator('#structure-custom-color').fill('#b45a4a');
   await page.locator('#structure-custom-color').dispatchEvent('change');
   const support=await page.evaluate(()=>{
    const v=window.MIR_STUDY.snapshot();
    return v.structures.find(s=>s.id==='porch-column-left');
   });
   assert.equal(support.color,'#b45a4a');
   // 6) Le balcon peut afficher des marches même sans coupe certifiée.
   await page.locator('#view-3d').click();
   await page.locator('#mir-stairs-toggle').click();
   assert.equal(await page.locator('#mir-stairs-toggle').getAttribute('aria-pressed'),'true');
   const geom=await page.evaluate(()=>{
     const v=window.MIR_STUDY.snapshot();
     return window.MIR3D.mesh({...v,dimensions:window.MIR3D.defaults}).faces.filter(f=>f.role==='concrete-step'&&f.id.endsWith('-top')).length;
   });
   assert.ok(geom>=3);
   assert.deepEqual(errs,[],'Browser runtime errors '+errs.join('|'));
   const root=path.resolve(__dirname,'../artifacts');fs.mkdirSync(root,{recursive:true});
   await page.locator('#stage').screenshot({path:path.join(root,'mir-finitions-'+screen.kind+'.png')});
   console.log('PASS MIR finitions '+screen.kind+': transitions, accents, portes, battens, structures, coins, marches');
   await page.close();
  }
  const imported=await browser.newPage({viewport:{width:1280,height:900}});
  await imported.goto(base+'/plan.html');
  await imported.waitForFunction(()=>window.MIR_STUDY?.snapshot);
  await imported.evaluate(async()=>{
   const plan=await fetch('plan-data.json').then(r=>r.json()),takeoffSeed=await fetch('takeoff-data.json').then(r=>r.json());
   const front=plan.faces.find(f=>f.key==='front'),canvas=document.createElement('canvas');
   canvas.width=2000;canvas.height=1320;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,2000,1320);
   ctx.strokeStyle='#333';ctx.strokeRect(416,362,1428,849);
   ctx.strokeRect(499,890,209,160);ctx.beginPath();ctx.moveTo(560,890);ctx.lineTo(560,1050);ctx.stroke();
   ctx.beginPath();ctx.moveTo(416,1160);ctx.lineTo(1844,1160);ctx.stroke();
   const sourceImage=canvas.toDataURL('image/png'),id='pdf-studio-foundation-test';
   Object.assign(front,{sourceImage,sourceImageBox:[0,0,2000,1320],visualFrame:[416,362,1428,849],importedStatus:'assigned',
    foundationGuides:{levels:{grade:{line:{y:1211}},foundations:[{line:{y:1160}}]}}});
   Object.assign(plan,{id,projectKind:'imported-pdf',dimensionStatus:'detected',detectedVolume:{roofStyle:'duplex'}});
   await MIRProjectStore.saveActive({id,planData:plan,takeoffSeed});
  });
  await imported.reload();
  await imported.waitForFunction(()=>window.MIR_STUDY?.snapshot);
  await imported.locator('#view-2d').click();
  assert.equal(await imported.locator('#elevation [data-mir-foundation]').getAttribute('height'),'51');
  const source=imported.locator('#elevation [data-opening="fenetre_gauche_basse"] [data-mir-window-source]');
  assert.equal(await source.count(),1);
  assert.equal(await source.getAttribute('href'),'#vfront-window-linework');
  await imported.locator('#view-3d').click();
  await imported.waitForFunction(()=>window.MIR3D.diagnostics(document.querySelector('#three-canvas'))?.textureBounds?.front);
  await imported.close();
  console.log('PASS PDF : bande de solage conservée en 2D/3D et traits de vitrage repris du plan');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
