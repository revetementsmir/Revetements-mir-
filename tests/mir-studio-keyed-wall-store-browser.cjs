'use strict';
// Invented keyed wall drawings pass through the real producer and IndexedDB.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {resolvedFixture}=require('./fixtures/keyed-wall-source-fixture.cjs'),M=require('../dist/plan-level-model.js'),K=require('../dist/plan-keyed-wall-observations.js');
function prepareFixture(){
 const f=resolvedFixture(),inventory=structuredClone(f.sourceInventory),buildingId=f.buildingId;
 Object.assign(inventory,{schema:'mir-view-inventory',version:1,activeBuildingId:buildingId,rendererSelections:{[buildingId]:{back:f.backView.id,left:f.sideView.id}}});
 for(const v of inventory.views)v.evidence=[];
 const localReadingRetries=inventory.views.flatMap(v=>structuredClone(v.payload?.drawingReadings?.keyedWallKeys||[]));
 for(const v of inventory.views)delete v.payload?.drawingReadings?.keyedWallKeys;
 const level=structuredClone(f.level),result={version:1,buildingId,status:'partial-proposal',levels:[level],reports:[{levelId:level.id,status:'partial-proposal',issues:[]}],localReadingRetries,complete:false};
 assert.deepEqual(M.validateDraft(level.contours[0],f.inventory,level),[]);assert.equal(M.wallsFor(level,f.inventory,{includeProposed:true}).length,6);
 assert.ok(level.observedPlanes.every(p=>!K.issues(p,f.inventory,level,{confirm:false}).length));
 const retained={...inventory,levels:[{...level,reconstruction:{...level.reconstruction,proposal:{...level.reconstruction.proposal,localReadingRetries}}}]};
 assert.ok(level.observedPlanes.every(p=>!K.issues(p,retained,retained.levels[0],{confirm:false}).length),'Retained native keys validate with unchanged imported source views.');
 return {inventory,result};
}
async function main(){
 const input=prepareFixture(),dist=path.resolve(__dirname,'../dist'),server=http.createServer((req,res)=>{const file=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
  browser=await require('playwright').chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();
  await page.route('**/*',r=>r.request().url().startsWith(origin)||/^(data:|blob:)/.test(r.request().url())?r.continue():r.abort());
  await page.goto(origin+'/plan.html');await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRKeyedWallObservations&&window.MIRViewInventory);
  const proof=await page.evaluate(async({inventory,result})=>{
   const projectId='pdf-synthetic-keyed-wall-store',buildingId=result.buildingId,levelId=result.levels[0].id;
   const plan=MIRViewInventory.adapt({id:projectId,version:3,projectKind:'imported-pdf',title:'Synthetic keyed walls',viewInventory:inventory},MIRSheetDetection.volumeFrom);
   await MIRProjectStore.saveActive({id:projectId,planData:plan,takeoffSeed:{version:1,geometry:{},calibrations:{},preservedSetting:'source-tests'}});
   const initial=await MIRProjectStore.get(projectId),stamp=MIRProjectStore.reconstructionStamp(initial.planData.viewInventory),refusals=[];
   for(const action of ['changed-height','changed-footprint','removed-proof','changed-parent','missing-guard','missing-native-keys','foreign-native-file','changed-native-matrix']){
    const next=structuredClone(result),p=next.levels[0].observedPlanes[0],guard=window.MIRKeyedWallObservations;
    if(action==='changed-height')p.height+=.4;
    if(action==='changed-footprint')p.footprint[0][0]+=.4;
    if(action==='removed-proof')delete p.keyedWallEvidence;
    if(action==='changed-parent')next.levels[0].contours[0].alignment.offset[0]+=.4;
    if(action==='missing-guard')window.MIRKeyedWallObservations=undefined;
    if(action==='missing-native-keys')next.localReadingRetries=[];
    if(action==='foreign-native-file')next.localReadingRetries.forEach(r=>r.nativeSource.sourceSha256='f'.repeat(64));
    if(action==='changed-native-matrix')next.localReadingRetries.forEach(r=>r.nativeSource.pdfToTile[4]+=4);
    let refused=false;try{await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:stamp,result:next});}catch{refused=true;}finally{window.MIRKeyedWallObservations=guard;}
    refusals.push({action,refused,unchanged:JSON.stringify(await MIRProjectStore.get(projectId))===JSON.stringify(initial)});
   }
   await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:stamp,result});
   const saved=await MIRProjectStore.get(projectId),level=saved.planData.viewInventory.levels.find(l=>l.id===levelId),finished=structuredClone(level);
   finished.wallFinishes[finished.observedPlanes[0].id]={material:'test-cladding',color:'#456789'};
   await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId,expectedRevision:level.geometryRevision,level:finished});
   return {projectId,buildingId,levelId,refusals,initial,final:await MIRProjectStore.get(projectId),planes:level.observedPlanes};
  },input);
  assert.ok(proof.refusals.every(r=>r.refused&&r.unchanged),JSON.stringify(proof.refusals));assert.deepEqual(proof.final.planData.viewInventory.views,proof.initial.planData.viewInventory.views);assert.equal(proof.final.takeoffSeed.preservedSetting,'source-tests');
  await page.reload();await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRKeyedWallObservations);
  const after=await page.evaluate(async({projectId,buildingId,levelId})=>{
   const baseline=await MIRProjectStore.get(projectId),inventory=baseline.planData.viewInventory,level=inventory.levels.find(l=>l.id===levelId),refusals=[];
   for(const action of ['remove-wall','drop-kind-and-proof','change-base','move-parent','missing-guard','drop-native-readings']){
    const next=structuredClone(level),p=next.observedPlanes[0],guard=window.MIRKeyedWallObservations;
    if(action==='remove-wall')next.observedPlanes.shift();
    if(action==='drop-kind-and-proof'){delete p.kind;delete p.keyedWallEvidence;}
    if(action==='change-base')p.base+=.2;
    if(action==='move-parent')next.contours[0].alignment.offset[1]+=.2;
    if(action==='missing-guard')window.MIRKeyedWallObservations=undefined;
    if(action==='drop-native-readings')next.reconstruction.proposal.localReadingRetries=[];
    let refused=false;try{await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId,expectedRevision:level.geometryRevision,level:next});}catch{refused=true;}finally{window.MIRKeyedWallObservations=guard;}
    refusals.push({action,refused,unchanged:JSON.stringify(await MIRProjectStore.get(projectId))===JSON.stringify(baseline)});
   }
   return {baseline,refusals,issues:level.observedPlanes.map(p=>MIRKeyedWallObservations.issues(p,inventory,level,{confirm:false})),walls:MIRLevelModel.wallsFor(level,inventory,{includeProposed:true})};
  },proof);
  assert.deepEqual(after.baseline,proof.final);assert.ok(after.refusals.every(r=>r.refused&&r.unchanged),JSON.stringify(after.refusals));assert.ok(after.issues.every(e=>!e.length));assert.equal(after.walls.length,6);
  assert.equal(after.walls.filter(w=>w.sourceKind==='source-keyed-wall'&&w.footprint?.length===4&&w.thickness>0).length,2);
  const level=after.baseline.planData.viewInventory.levels.find(l=>l.id===proof.levelId);assert.deepEqual(level.observedPlanes,proof.planes);assert.deepEqual(level.wallFinishes[proof.planes[0].id],{material:'test-cladding',color:'#456789'});
  console.log('PASS keyed wall browser: two source-derived planes, atomic invalid-source and parent-edit refusals, immutable footprints/heights, preserved original views/settings, finishes and reload.');
 }finally{await browser?.close();server.close();}
}
module.exports={prepareFixture};
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
