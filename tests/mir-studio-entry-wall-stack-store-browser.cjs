'use strict';
// Invented source drawings -> real registered wall stack -> atomic IndexedDB.
// The upper level deliberately has no entry: its edit must still protect the
// roof stored on the lower level. No private original is used in this test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {wallStackFixture}=require('./mir-studio-entry-wall-stack.cjs');
const M=require('../dist/plan-level-model.js'),X=require('../dist/studio-exterior-model.js');

function prepareFixture({roofOnly=process.argv.includes('--roof-only')}={}){
 const f=roofOnly?require('./mir-studio-entry-roof-only.cjs').roofOnlyFixture({rise:90}):wallStackFixture(),inventory=structuredClone(f.inventory),result=structuredClone(f.result),buildingId='synthetic-house';
 Object.assign(inventory,{schema:'mir-view-inventory',version:1,activeBuildingId:buildingId,buildings:[{id:buildingId,name:'Synthetic two-storey attachment'}],rendererSelections:{[buildingId]:{front:'synthetic-elevation-front',right:'synthetic-elevation-right'}}});
 for(const view of inventory.views)view.evidence=[];
 const upper=result.levels.find(l=>l.sourceLevel==='level-1');upper.reconstructedRoofs=[];upper.exteriorElements=[];
 const valid={...inventory,levels:result.levels};
 for(const level of result.levels)assert.deepEqual(X.proposalIssues(level,valid),[]);
 const moved=structuredClone(upper);moved.contours[0].alignment.offset[1]+=.4;
 assert.deepEqual(M.validateDraft(moved.contours[0],valid,moved),[],'The dependent-roof guard must cover an otherwise valid contour edit.');
 assert.deepEqual(X.registeredSourceIssues(moved,valid),[],'The changed upper level has no entry of its own.');
 const changed={...valid,levels:valid.levels.map(l=>l.id===moved.id?moved:l)};
 assert.ok(X.registeredSourceIssues(changed.levels.find(l=>l.sourceLevel==='level-0'),changed).includes('ENTRY_REGISTERED_WALL_STACK'));
 result.levels.reverse();
 return {inventory,result,roofOnly};
}

async function main(){
 const input=prepareFixture(),dist=path.resolve(__dirname,'../dist');
 const server=http.createServer((req,res)=>{const file=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
  browser=await require('playwright').chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();
  await page.route('**/*',route=>route.request().url().startsWith(origin)||/^(data:|blob:)/.test(route.request().url())?route.continue():route.abort());
  await page.goto(origin+'/plan.html');await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRStudioExterior&&window.MIRViewInventory&&window.MIRReconstructionPipeline);
  const proof=await page.evaluate(async({inventory,result,roofOnly})=>{
   const projectId='pdf-synthetic-entry-wall-stack',buildingId='synthetic-house',lowerId=buildingId+':level-0',upperId=buildingId+':level-1';
   const plan=MIRViewInventory.adapt({id:projectId,version:3,projectKind:'imported-pdf',title:'SYNTHETIC — two-storey roof attachment',viewInventory:inventory},MIRSheetDetection.volumeFrom);
   await MIRProjectStore.saveActive({id:projectId,planData:plan,takeoffSeed:{version:1,geometry:{},calibrations:{},preservedSetting:'retained-client-choice'}});
   const initial=await MIRProjectStore.get(projectId),stamp=MIRProjectStore.reconstructionStamp(initial.planData.viewInventory),refusals=[];
   const lowerOf=r=>r.levels.find(l=>l.id===lowerId),roofOf=r=>lowerOf(r).reconstructedRoofs.find(r=>r.connection?.wallStack);
   for(const action of ['missing-upper-level','missing-stack','changed-member','foreign-registration','changed-contact','changed-attachment','duplicate-member',...(roofOnly?['missing-entry-plan','truncated-plan-pixels','changed-plan-footprint','invented-rear','downgrade-plan-contract']:[])]){
    const next=structuredClone(result),roof=roofOf(next),stack=roof.connection.wallStack;
    if(action==='missing-upper-level')next.levels=next.levels.filter(l=>l.id!==upperId);
    if(action==='missing-stack')delete roof.connection.wallStack;
    if(action==='changed-member')stack.members[1].height+=.2;
    if(action==='foreign-registration')stack.members[1].registration.xy.sourceViewId='foreign';
    if(action==='changed-contact')stack.contact.z[1]-=.2;
    if(action==='changed-attachment')stack.attachmentSources[0].worldContact[1]+=.1;
    if(action==='duplicate-member')stack.members[1]=structuredClone(stack.members[0]);
    if(action==='missing-entry-plan')delete roof.entryPlanEvidence;
    if(action==='truncated-plan-pixels')roof.entryPlanEvidence.sourcePixelEvidence.pixelEvidence.rgbaHex=roof.entryPlanEvidence.sourcePixelEvidence.pixelEvidence.rgbaHex.slice(8);
    if(action==='changed-plan-footprint')roof.entryPlanEvidence.footprint[0][1]-=.3;
    if(action==='invented-rear')roof.entryPlanEvidence.sourceBoundary.rearPixelsObserved=true;
    if(action==='downgrade-plan-contract'){delete roof.entryPlanEvidence;delete roof.entryAssembly.footprintSource;for(const s of roof.sources.filter(s=>s.axis==='y'))for(const key of ['eaveConstraint','sourceSlopeEvidence','wallContactEvidence'])delete s.profileEvidence[key];}
    let refused=false;try{await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:stamp,result:next});}catch{refused=true;}
    refusals.push({action,refused,unchanged:JSON.stringify(await MIRProjectStore.get(projectId))===JSON.stringify(initial)});
   }
   await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:stamp,result});
   const saved=await MIRProjectStore.get(projectId),lower=saved.planData.viewInventory.levels.find(l=>l.id===lowerId),upper=saved.planData.viewInventory.levels.find(l=>l.id===upperId),finished=structuredClone(lower);
   finished.reconstructedRoofs.find(r=>r.connection?.wallStack).finish={color:'#789abc'};
   await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId:lowerId,expectedRevision:lower.geometryRevision,level:finished});
   const final=await MIRProjectStore.get(projectId);
   return {projectId,buildingId,lowerId,upperId,roofOnly,refusals,final,sourceViews:initial.planData.viewInventory.views,upper,geometry:lower.reconstructedRoofs[0].profiles,stack:lower.reconstructedRoofs[0].connection.wallStack,entryPlan:lower.reconstructedRoofs[0].entryPlanEvidence};
  },input);
  assert.ok(proof.refusals.every(r=>r.refused&&r.unchanged),JSON.stringify(proof.refusals));
  assert.deepEqual(proof.final.planData.viewInventory.views,proof.sourceViews);
  assert.deepEqual(proof.final.planData.viewInventory.levels.find(l=>l.id===proof.upperId),proof.upper);
  assert.equal(proof.final.takeoffSeed.preservedSetting,'retained-client-choice');
  await page.reload();await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRStudioExterior);
  const after=await page.evaluate(async proof=>{
   const {projectId,buildingId,lowerId,upperId}=proof,baseline=await MIRProjectStore.get(projectId),inventory=baseline.planData.viewInventory,lower=inventory.levels.find(l=>l.id===lowerId),upper=inventory.levels.find(l=>l.id===upperId),refusals=[];
   for(const action of ['drop-stack','rewrite-member','move-upper-wall','missing-guard','missing-guard-and-stack','missing-guard-and-roof',...(proof.roofOnly?['drop-entry-plan','change-diagonal-source']:[])]){
    const target=action==='move-upper-wall'?upper:lower,next=structuredClone(target),guard=window.MIRStudioExterior;
    if(action==='drop-stack')delete next.reconstructedRoofs[0].connection.wallStack;
    if(action==='rewrite-member')next.reconstructedRoofs[0].connection.wallStack.members[1].base+=.1;
    if(action==='move-upper-wall')next.contours[0].alignment.offset[1]+=.4;
    if(action==='missing-guard')window.MIRStudioExterior=undefined;
    if(action==='missing-guard-and-stack'){window.MIRStudioExterior=undefined;delete next.reconstructedRoofs[0].connection.wallStack;}
    if(action==='missing-guard-and-roof'){window.MIRStudioExterior=undefined;next.reconstructedRoofs=[];}
    if(action==='drop-entry-plan'){delete next.reconstructedRoofs[0].entryPlanEvidence;delete next.reconstructedRoofs[0].entryAssembly.footprintSource;}
    if(action==='change-diagonal-source')next.reconstructedRoofs[0].entryPlanEvidence.association.diagonalResiduals[0].modelAnchors[0][0]+=.1;
    let refused=false;try{await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId:target.id,expectedRevision:target.geometryRevision,level:next});}catch{refused=true;}finally{window.MIRStudioExterior=guard;}
    refusals.push({action,refused,unchanged:JSON.stringify(await MIRProjectStore.get(projectId))===JSON.stringify(baseline)});
   }
   for(const level of [lower,upper]){
    const next=structuredClone(level);for(const name of ['reference','height','base','alignment'])next.contours[0][name].status='confirmed';
    next.contours[0]=MIRLevelModel.confirmDraft(next.contours[0],inventory,next);
    await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId:level.id,expectedRevision:level.geometryRevision,level:next});
   }
   return {baseline,refusals,confirmed:await MIRProjectStore.get(projectId),issues:MIRStudioExterior.registeredSourceIssues(lower,inventory),faces:MIRReconstructedRoofs.faces(lower.reconstructedRoofs[0],[0,0],{includeProposed:true})};
  },proof);
  assert.deepEqual(after.baseline,proof.final,'Source proofs, finishes, both levels and settings survive reload.');
  assert.deepEqual(after.issues,[]);assert.ok(after.refusals.every(r=>r.refused&&r.unchanged),JSON.stringify(after.refusals));
  assert.ok(after.faces.flatMap(f=>f.poly||[]).some(p=>p[2]>(proof.roofOnly?3.2:3.3)),'The source crest remains above the lower wall.');
  const roof=after.baseline.planData.viewInventory.levels.find(l=>l.id===proof.lowerId).reconstructedRoofs[0];
  assert.deepEqual(roof.profiles,proof.geometry);assert.deepEqual(roof.connection.wallStack,proof.stack);assert.deepEqual(roof.finish,{color:'#789abc'});
  assert.deepEqual(roof.entryPlanEvidence,proof.entryPlan);
  await page.reload();await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRStudioExterior);
  const confirmed=await page.evaluate(id=>MIRProjectStore.get(id),proof.projectId);assert.deepEqual(confirmed,after.confirmed,'Both confirmed parents and their original roof evidence survive another reload.');
  const confirmedLevels=confirmed.planData.viewInventory.levels;for(const id of [proof.lowerId,proof.upperId])assert.equal(confirmedLevels.find(l=>l.id===id).contours[0].status,'confirmed');
  assert.deepEqual(confirmedLevels.find(l=>l.id===proof.lowerId).reconstructedRoofs[0],roof,'Confirmation changes neither roof geometry nor retained source proofs or finishes.');
  console.log('PASS entry wall stack browser'+(proof.roofOnly?' (roof-only own plan and retained pixels)':'')+': actual two-storey source attachment, reversed level order, atomic source and dependent-upper-wall refusals, unchanged views/settings, finishes and reload.');
 }finally{await browser?.close();server.close();}
}
module.exports={prepareFixture};
if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
