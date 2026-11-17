'use strict';
// Synthetic local OCR -> registered XYZ entries -> actual browser storage.
// No private drawing is used and this is not a source-fidelity certification.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {localGridFixture}=require('./mir-studio-registered-entries.cjs');
const X=require('../dist/studio-exterior-model.js'),M=require('../dist/plan-level-model.js'),Roof=require('../dist/plan-reconstructed-roofs.js');

async function prepareFixture(){
 const {inventory,result}=await localGridFixture(),buildingId='synthetic-house';
 Object.assign(inventory,{schema:'mir-view-inventory',version:1,activeBuildingId:buildingId,buildings:[{id:buildingId,name:'Synthetic registered entries'}],rendererSelections:{[buildingId]:{front:'synthetic-elevation-front',right:'synthetic-elevation-right'}}});
 for(const view of inventory.views)view.evidence=[];
 assert.ok(inventory.views.every(v=>v.payload.drawingReadings.rows.every(r=>!/^(?:\d{1,2}|[A-Z])$/.test(r.text))),'grid labels must exist only in retained local OCR readings');
 assert.ok(result.localReadingRetries.some(r=>r.source==='ocr-local-grid-bubble'));
 result.levels.reverse();
 assert.equal(result.levels[0].id,'synthetic-house:level-1');
 const validationInventory={...inventory,levels:result.levels};
 for(const level of result.levels){
  assert.deepEqual(X.proposalIssues(level,validationInventory),[]);
  assert.deepEqual(X.registeredSourceIssues(level,validationInventory),[]);
  for(const contour of level.contours)assert.deepEqual(M.validateDraft(contour,validationInventory,level),[]);
  for(const roof of level.reconstructedRoofs){
   assert.deepEqual(Roof.issues(roof,{confirm:false}),[]);
   assert.deepEqual(Roof.pitchSourceIssues(roof,validationInventory),[]);
   assert.deepEqual(Roof.planSourceIssues(roof,validationInventory),[]);
  }
 }
 return {inventory,result};
}

async function main(){
 const input=await prepareFixture(),dist=path.resolve(__dirname,'../dist');
 const server=http.createServer((req,res)=>{
  const file=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await require('playwright').chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage();
  await page.route('**/*',route=>route.request().url().startsWith(origin)||/^(data:|blob:)/.test(route.request().url())?route.continue():route.abort());
  await page.goto(origin+'/plan.html');
  await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRStudioExterior&&window.MIRReconstructedRoofs&&window.MIRReconstructionPipeline&&window.MIRViewInventory);
  const saved=await page.evaluate(async({inventory,result})=>{
   const projectId='pdf-synthetic-registered-entries',buildingId='synthetic-house',levelId=buildingId+':level-0',otherId=buildingId+':level-1';
   const plan=MIRViewInventory.adapt({id:projectId,version:3,projectKind:'imported-pdf',title:'SYNTHETIC — registered entry storage',viewInventory:inventory},MIRSheetDetection.volumeFrom);
   await MIRProjectStore.saveActive({id:projectId,planData:plan,takeoffSeed:{version:1,geometry:{},calibrations:{},preservedSetting:{color:'#ab4567',quantityUnit:'m2'}}});
   const initial=await MIRProjectStore.get(projectId);
   await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:MIRProjectStore.reconstructionStamp(initial.planData.viewInventory),result});
   const proposed=await MIRProjectStore.get(projectId),levels=proposed.planData.viewInventory.levels;
   const lower=levels.find(l=>l.id===levelId),upper=levels.find(l=>l.id===otherId);
   if(!lower||!upper)throw Error('Both source levels must be saved');
   const finished=structuredClone(lower);
   finished.reconstructedRoofs[0].finish={color:'#456789'};
   finished.exteriorElements[0].finish={color:'#718293'};
   await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId,expectedRevision:lower.geometryRevision,level:finished});
   const final=await MIRProjectStore.get(projectId),finalInventory=final.planData.viewInventory;
   return {projectId,buildingId,levelId,otherId,lower:finalInventory.levels.find(l=>l.id===levelId),upper:finalInventory.levels.find(l=>l.id===otherId),originalUpper:upper,originalLower:lower,sourceViews:initial.planData.viewInventory.views,sourceViewsUnchanged:JSON.stringify(finalInventory.views)===JSON.stringify(initial.planData.viewInventory.views),settings:final.takeoffSeed.preservedSetting,retries:final.planData.automaticReconstruction[buildingId].localReadingRetries,entryCounts:finalInventory.levels.map(l=>[l.id,(l.reconstructedRoofs||[]).filter(r=>r.entryAssembly).length]),issues:finalInventory.levels.map(l=>MIRStudioExterior.registeredSourceIssues(l,finalInventory))};
  },input);
  assert.ok(saved.sourceViewsUnchanged);
  assert.deepEqual(saved.upper,saved.originalUpper,'finishing one level must preserve the other registered level');
  assert.deepEqual(saved.entryCounts.sort(),[['synthetic-house:level-0',1],['synthetic-house:level-1',1]]);
  assert.deepEqual(saved.issues,[[],[]]);
  assert.deepEqual(saved.settings,{color:'#ab4567',quantityUnit:'m2'});
  assert.deepEqual(saved.retries,input.result.localReadingRetries);
  assert.deepEqual(saved.lower.reconstructedRoofs[0].sources,saved.originalLower.reconstructedRoofs[0].sources);
  assert.deepEqual(saved.lower.reconstructedRoofs[0].profiles,saved.originalLower.reconstructedRoofs[0].profiles);
  assert.deepEqual(saved.lower.reconstructedRoofs[0].finish,{color:'#456789'});
  assert.deepEqual(saved.lower.exteriorElements[0].finish,{color:'#718293'});

  await page.reload();
  await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRStudioExterior&&window.MIRReconstructedRoofs);
  const reopened=await page.evaluate(async saved=>{
   const {projectId,buildingId,levelId,otherId}=saved,baseline=await MIRProjectStore.get(projectId),inventory=baseline.planData.viewInventory;
   const lower=inventory.levels.find(l=>l.id===levelId),upper=inventory.levels.find(l=>l.id===otherId),refusals=[];
   const stripProof=value=>{if(!value||typeof value!=='object')return;delete value.axisRegistration;delete value.levelBand;for(const child of Object.values(value))stripProof(child);};
   for(const action of ['drop-all-entry-evidence','rewrite-source-anchor','move-registered-contour','drop-local-readings']){
    const next=structuredClone(lower);
    if(action==='drop-all-entry-evidence')stripProof(next);
    if(action==='rewrite-source-anchor')next.reconstructedRoofs[0].sources[0].anchors[0][0]+=12;
    if(action==='move-registered-contour')next.contours[0].alignment.offset[0]+=.25;
    if(action==='drop-local-readings')next.reconstruction.proposal.localReadingRetries=[];
    const nextInventory={...inventory,levels:inventory.levels.map(l=>l.id===levelId?next:l)};
    const guardIssues=[...MIRStudioExterior.registeredSourceIssues(next,nextInventory),...MIRStudioExterior.historyIssues(next,lower)];
    let refused=false,error='';
    try{await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId,expectedRevision:lower.geometryRevision,level:next});}catch(e){refused=true;error=String(e.message);}
    const current=await MIRProjectStore.get(projectId);
    refusals.push({action,guardIssues,refused,error,unchanged:JSON.stringify(current)===JSON.stringify(baseline)});
   }
   return {lower,upper,refusals,settings:baseline.takeoffSeed.preservedSetting,sourceViews:inventory.views,issues:inventory.levels.map(l=>MIRStudioExterior.registeredSourceIssues(l,inventory)),faces:inventory.levels.map(l=>MIRReconstructedRoofs.faces(l.reconstructedRoofs[0],[0,0],{includeProposed:true}).length)};
  },saved);
  assert.deepEqual(reopened.lower,saved.lower,'entry geometry, source proofs, OCR retries and finishes survive a page reload');
  assert.deepEqual(reopened.upper,saved.upper);
  assert.deepEqual(reopened.sourceViews,saved.sourceViews,'source rows stay unchanged through both saves and reload');
  assert.deepEqual(reopened.settings,saved.settings);
  assert.deepEqual(reopened.issues,[[],[]]);assert.ok(reopened.faces.every(n=>n>0));
  for(const refusal of reopened.refusals){assert.ok(refusal.guardIssues.length>0,refusal.action+' must fail its source validator');assert.ok(refusal.refused,refusal.action+' must be refused');assert.ok(refusal.unchanged,refusal.action+' must leave the whole stored project unchanged');}
  console.log('PASS registered entry browser storage: reversed two-level save, local-only OCR labels, immutable sources, finishes and reload, atomic proof/anchor/contour/retry refusals, preserved other level and settings');
 }finally{await browser?.close();server.close();}
}

module.exports={prepareFixture};
if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
