'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const {drawTwoSides}=require('./mir-draw-freeform-helper.cjs');
const base=process.env.MIR_TEST_BASE||'http://127.0.0.1:8870',out='artifacts/fixed-workspace';
const sizes=[[360,780],[390,844],[428,926],[820,1180],[834,1112],[1024,768],[1180,820],[800,1280],[1280,800],[1366,768],[1440,900],[1920,1080],[2560,1080],[844,390],[959,700],[960,700]];
async function settings(page){if(await page.locator('#mir-inspector').isVisible()===false)await page.locator('#mir-workspace-settings').click();}
async function close(page){await page.locator('.mir-inspector-heading button').click();}
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});let results=[];
try{for(const [w,h]of sizes)for(const mode of ['profile','panel','wall']){
 const page=await browser.newPage({viewport:{width:w,height:h},hasTouch:w<1300});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/'+(mode==='wall'?'calepinage.html':mode==='panel'?'production.html?kind=panel':'production.html'));await page.waitForFunction(()=>window.MirWorkspace?.active);
 if(mode==='wall'){await page.waitForFunction(()=>!!window.MIRCalepinageWorkspace);await settings(page);await page.getByText('Dossier · zones et exemples',{exact:true}).click();await page.locator('#load-example').click();await page.locator('#columns').fill('5');await page.locator('#columns').press('Tab');await page.locator('#rows').fill('2');await page.locator('#rows').press('Tab');await close(page);assert.equal(await page.locator('#layout-svg [data-piece]').count(),10);}
 if(mode==='panel')assert.equal(await page.locator('#production-drawing').getAttribute('data-kind'),'panel','Direct panel link opens the panel workshop');
 if(mode==='profile'){await drawTwoSides(page);await page.locator('.mir-workspace-tools [data-freeform-finish]').click();}
 const metrics=await page.evaluate(()=>{const stage=document.querySelector('#production-drawing,#drawing-stage').getBoundingClientRect(),actions=document.querySelector('.mir-action-bar').getBoundingClientRect();return {scroll:document.documentElement.scrollHeight-innerHeight,overflow:document.documentElement.scrollWidth-innerWidth,stage:stage.toJSON(),actions:actions.toJSON(),header:document.querySelector('#mir-harmony-header').getBoundingClientRect().height};});
 assert.equal(metrics.scroll,0,mode+' document scroll '+w);assert.equal(metrics.overflow,0);assert.ok(metrics.stage.height>=h*(h<520?.28:.45),mode+' useful drawing '+w+': '+metrics.stage.height);assert.ok(metrics.actions.bottom<=h+1);assert.equal(metrics.header,64);
 await settings(page);assert.ok(await page.locator('.mir-inspector-content').evaluate(e=>e.scrollHeight>=e.clientHeight));assert.ok(await page.locator('#production-drawing,#drawing-stage').isVisible());await close(page);
 if(mode==='panel'){
  if(w>h&&h<=520){
   const caption=await page.locator('[data-edit-panel-measure="width"] text').boundingBox();
   assert.ok(caption.height>=12,'Cote A lisible en paysage court');
  }
  for(const [key,value,expected]of [['width','50½',50.5],['height','38 1/4',38.25],['relief','2¼',2.25]]){await page.locator('#production-drawing [data-edit-panel-measure="'+key+'"]').click();await page.locator('#mir-panel-direct-value').fill(value);await page.locator('#mir-panel-direct-apply').click();assert.equal(await page.evaluate(k=>window.MIRProductionWorkspace.getLivePreviewState().model[{width:'widthMM',height:'heightMM',relief:'reliefMM'}[k]],key),expected*25.4);}
  await page.locator('#production-drawing g[data-edit-panel-edge="bottom"]').first().click();await page.locator('#mir-panel-direct-value').fill('2¼');await page.locator('#mir-panel-direct-apply').click();
  await page.locator('#production-drawing g[data-edit-panel-edge="top"]').first().click();await page.locator('#mir-panel-direct-no-lip').check();await page.locator('#mir-panel-direct-apply').click();
  assert.equal(await page.locator('[data-panel-lip="bottom"]').inputValue(),'2.25');assert.equal(await page.locator('[data-panel-lip="top"]').inputValue(),'0');
  await page.locator('.mir-workspace-tools [data-freeform-undo]').click();assert.equal(await page.evaluate(()=>window.MIRProductionWorkspace.getLivePreviewState().model.edges.find(e=>e.id==='top').lipMM),25.4);
  await page.locator('.mir-workspace-tools [data-freeform-redo]').click();assert.equal(await page.locator('[data-panel-lip="top"]').inputValue(),'0');assert.equal(await page.locator('[data-panel-lip="bottom"]').inputValue(),'2.25');
  await page.locator('#production-drawing [data-edit-panel-measure="width"]').focus();await page.keyboard.press('Enter');await page.locator('#mir-panel-direct-value').fill('0');await page.locator('#mir-panel-direct-apply').click();assert.ok(await page.locator('#production-dialog-error').isVisible());assert.equal(await page.locator('[data-measure="width"]').inputValue(),'50.5');await page.keyboard.press('Escape');
 }
 if(mode==='profile'){
  const before=await page.evaluate(()=>window.MIRProductionWorkspace.getLivePreviewState().model.segments.map(s=>s.lengthMM));
  await page.locator('#production-drawing [data-edit-profile-measure="0"]').click();await page.locator('#mir-profile-direct-value').fill('2¼');await page.locator('#mir-profile-direct-apply').click();
  const after=await page.evaluate(()=>window.MIRProductionWorkspace.getLivePreviewState().model.segments.map(s=>s.lengthMM));assert.equal(after[0],2.25*25.4);assert.deepEqual(after.slice(1),before.slice(1));
  await page.locator('#production-drawing [data-edit-profile-measure="0"]').focus();await page.keyboard.press('Enter');await page.locator('#mir-profile-direct-value').fill('-3');await page.locator('#mir-profile-direct-apply').click();assert.ok(await page.locator('#production-dialog-error').isVisible());await page.keyboard.press('Escape');
 }
 if(mode==='wall'){
  assert.equal(await page.locator('.mir-workspace-dimensions [data-wall-dimension="width"]').isVisible(),false);
  const nextPiece=page.locator('#layout-svg [data-piece="P02"]');
  await nextPiece.focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('.mir-wall-current-piece').textContent(),/^P02 ·/);
  await page.locator('[data-wall-dimension="projection"]').click();await page.locator('#mir-workspace-dimension-value').fill('50.8');await page.locator('dialog select').selectOption('mm');await page.getByRole('button',{name:'Appliquer',exact:true}).click();assert.equal(await page.evaluate(()=>window.MIRCalepinageWorkspace.getState().zone.meta.projection),'2');}
 assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/after-${mode}-${w}x${h}.png`});results.push({mode,w,h,...metrics});
 if(mode==='profile'&&w===1440){
  await page.locator('.mir-workspace-save').click();await page.locator('.mir-workspace-save').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_admin_dossier_v1')).order.items);assert.equal(saved.length,1,'Enregistrer deux fois révise sans doublon');assert.equal(saved[0].history.length,1);
  await page.locator('.mir-action-bar .mir-workspace-primary').click();assert.equal(await page.locator('[data-mir-po-piece]').count(),1,'Continuer après enregistrement prépare le bon sans dupliquer');
  await page.reload();await page.waitForFunction(()=>window.MirWorkspace?.active);await page.locator('.mir-harmony-dossier').click();assert.equal(await page.locator('[data-production-item]').count(),1,'Dossier conservé après rechargement');
 }
 if(mode==='panel'&&w===1440){await page.locator('.mir-action-bar .mir-workspace-primary').click();assert.equal(await page.locator('[data-mir-po-piece]').count(),1,'Un panneau seul rejoint son bon une seule fois');}
 console.log('PASS',mode,w,h,'stage',Math.round(metrics.stage.height));await page.close();
}fs.writeFileSync(out+'/after.json',JSON.stringify(results,null,2));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
