'use strict';
// Synthetic source-to-storage contract. No private drawing or fidelity claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const {makeProposedRoofScene,makeRoofPlanScene,moveGridReadingsToRetries}=require('./fixtures/roof-plan-evidence.cjs');
const P=require('../dist/plan-roof-plan-evidence.js'),R=require('../dist/plan-reconstruction.js');
const partialHip=process.argv.includes('--partial-hip'),complete=partialHip?require('./mir-studio-roof-hip-candidates.cjs').makePartialHipRoofScene():makeProposedRoofScene({directions:['left','right','back']}),missing=makeRoofPlanScene();
delete missing.images.front;delete missing.images.back;
const assessment=P.propose(missing.parent,missing.proposal,missing.inventory,missing.reviewed,missing.images,{registerElevation:R.elevationRegistration});
const partialRoof={...structuredClone(missing.parent),extensions:assessment.extensions,roofPlanEvidence:assessment.evidence};
const inventory={...structuredClone(complete.inventory),schema:'mir-view-inventory',version:1,activeBuildingId:'house',buildings:[{id:'house',name:'Synthetic source drawing'}],rendererSelections:{house:{front:'front',back:'back',left:'left',right:'right'}},levels:[{id:'upper',buildingId:'house',sourceLevel:'upper',contours:[],wallOpenings:[]}]};
for(const view of inventory.views)view.evidence=[];
const localReadingRetries=moveGridReadingsToRetries(inventory);
const dist=path.resolve(__dirname,'../dist'),server=http.createServer((req,res)=>{const file=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();
  await page.route('**/*',route=>route.request().url().startsWith(origin)||/^(data:|blob:)/.test(route.request().url())?route.continue():route.abort());
  await page.goto(origin+'/plan.html');await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRRoofPlanEvidence&&window.MIRViewInventory);
  const proof=await page.evaluate(async input=>{
   const {inventory,roof,partialRoof,localReadingRetries}=input,projectId='pdf-synthetic-roof-plan',buildingId='house',levelId='upper';
   const plan=MIRViewInventory.adapt({id:projectId,version:3,projectKind:'imported-pdf',title:'SYNTHETIC — roof plan returns',viewInventory:inventory},MIRSheetDetection.volumeFrom);
   await MIRProjectStore.saveActive({id:projectId,planData:plan,takeoffSeed:{version:1,geometry:{},calibrations:{},preservedSetting:'synthetic-client-choice'}});
   const initial=await MIRProjectStore.get(projectId),stamp=MIRProjectStore.reconstructionStamp(initial.planData.viewInventory);
   const level={...structuredClone(inventory.levels[0]),reconstruction:{status:'automatic-proposal',proposal:{}},reconstructedRoofs:[roof]},result={version:1,buildingId,status:'partial-proposal',levels:[level],reports:[{levelId,status:'partial-proposal',issues:[]}],localReadingRetries};
   const invalid=structuredClone(result);invalid.levels[0].reconstructedRoofs[0].roofPlanEvidence.observations[0].sourceFileId='foreign-source';let foreignRefused=false;
   try{await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:stamp,result:invalid});}catch{foreignRefused=true;}
   if(JSON.stringify(await MIRProjectStore.get(projectId))!==JSON.stringify(initial))throw Error('Invalid source changed storage');
   await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:stamp,result});
   const saved=await MIRProjectStore.get(projectId),savedLevel=saved.planData.viewInventory.levels.find(l=>l.id===levelId),refusals=[];
   for(const action of ['drop-proof','drop-component','foreign-frame','stale-profile','disown-association','drop-roof','drop-local-readings']){
    const next=structuredClone(savedLevel),r=next.reconstructedRoofs[0];
    if(action==='drop-proof')delete r.roofPlanEvidence;
    if(action==='drop-component')r.extensions.pop();
    if(action==='foreign-frame')r.roofPlanEvidence.observations[0].sourceFrame.rasterSize[0]++;
    if(action==='stale-profile')r.extensions[0].profiles.x[0][1]+=.2;
    if(action==='disown-association'){r.roofPlanEvidence.observations[0].association={status:'unresolved',reason:'synthetic-disowned-source'};r.roofPlanEvidence.status='unresolved';}
    if(action==='drop-roof')next.reconstructedRoofs=[];
    if(action==='drop-local-readings')next.reconstruction.proposal.localReadingRetries=[];
    let refused=false;try{await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId,expectedRevision:savedLevel.geometryRevision,level:next});}catch{refused=true;}
    refusals.push({action,refused,unchanged:JSON.stringify(await MIRProjectStore.get(projectId))===JSON.stringify(saved)});
   }
   const finished=structuredClone(savedLevel);finished.reconstructedRoofs[0].finish={color:'#456789'};finished.reconstructedRoofs[0].extensions[0].finish={color:'#718293'};
   await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId,expectedRevision:savedLevel.geometryRevision,level:finished});
   const final=await MIRProjectStore.get(projectId),finalRoof=final.planData.viewInventory.levels.find(l=>l.id===levelId).reconstructedRoofs[0];
   const partialId='pdf-synthetic-roof-plan-unresolved',partialPlan={...structuredClone(plan),id:partialId};
   await MIRProjectStore.saveActive({id:partialId,planData:partialPlan,takeoffSeed:{version:1,geometry:{},calibrations:{}}});
   const partialInitial=await MIRProjectStore.get(partialId),partialResult={...structuredClone(result),levels:[{...structuredClone(inventory.levels[0]),reconstruction:{status:'automatic-proposal',proposal:{}},reconstructedRoofs:[partialRoof]}]};
   await MIRProjectStore.saveReconstruction({projectId:partialId,buildingId,expectedStamp:MIRProjectStore.reconstructionStamp(partialInitial.planData.viewInventory),result:partialResult});
   const partialSaved=await MIRProjectStore.get(partialId),partialLevel=partialSaved.planData.viewInventory.levels.find(l=>l.id===levelId),confirm=structuredClone(partialLevel);confirm.reconstructedRoofs[0].status='confirmed';let unresolvedRefused=false;
   try{await MIRProjectStore.saveLevelGeometry({projectId:partialId,buildingId,levelId,expectedRevision:partialLevel.geometryRevision,level:confirm});}catch{unresolvedRefused=true;}
   return {projectId,levelId,foreignRefused,refusals,finalRoof,originalRoof:roof,settings:final.takeoffSeed,sourcesUnchanged:JSON.stringify(final.planData.viewInventory.views)===JSON.stringify(initial.planData.viewInventory.views),faces:MIRReconstructedRoofs.faces(finalRoof,[0,0],{includeProposed:true}).length,unresolvedRefused,partialUnchanged:JSON.stringify(await MIRProjectStore.get(partialId))===JSON.stringify(partialSaved),partialVisible:MIRReconstructedRoofs.faces(partialRoof,[0,0],{includeProposed:true}).length>0};
  },{inventory,roof:complete.roof,partialRoof,localReadingRetries});
  assert.ok(proof.foreignRefused);assert.ok(proof.refusals.every(r=>r.refused&&r.unchanged));assert.ok(proof.faces>0);assert.ok(proof.sourcesUnchanged);
  assert.equal(proof.settings.preservedSetting,'synthetic-client-choice');assert.deepEqual(proof.finalRoof.roofPlanEvidence,proof.originalRoof.roofPlanEvidence);assert.deepEqual(proof.finalRoof.profiles,proof.originalRoof.profiles);
  assert.deepEqual(proof.finalRoof.finish,{color:'#456789'});assert.deepEqual(proof.finalRoof.extensions[0].finish,{color:'#718293'});
  assert.ok(proof.unresolvedRefused&&proof.partialUnchanged&&proof.partialVisible,'a missing source profile remains visible and unconfirmed, with atomic storage');
  await page.reload();await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRRoofPlanEvidence);
  const reopened=await page.evaluate(async p=>(await MIRProjectStore.get(p.projectId)).planData.viewInventory.levels.find(l=>l.id===p.levelId).reconstructedRoofs[0],proof);
  assert.deepEqual(reopened,proof.finalRoof);
  console.log('PASS roof plan browser storage'+(partialHip?' (partial hip boundaries and replayable raster proof)':'')+': actual source-derived asymmetric returns, stable child finishes, source preservation, atomic invalid/stale/lost evidence refusals and unresolved preview');
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
