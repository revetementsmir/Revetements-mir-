'use strict';
// Real native witness producer and source validators, then real plan.html /
// IndexedDB. Only the invented floor proposals are supplied by this fixture.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const M=require('../dist/plan-level-model.js'),R=require('../dist/plan-reconstruction.js'),G=require('../dist/plan-grid-registration.js'),S=require('../dist/plan-native-witness-store.js');
const copy=structuredClone;
async function prepareFixture(){
 const scene=await require('./mir-studio-native-witness-measurement.cjs').makeMeasuredWitnessScene();
 const observation=copy(scene.observation),view=copy(scene.view),buildingId=view.buildingId,frame={units:'pixels',rasterSize:[1000,900],pdfToRaster:[1,0,0,-1,0,900],cropToRaster:[1,0,0,1,0,0]};
 assert.equal(observation.datumEvidence.lower.levelHint,'level-1');
 assert.equal(observation.measurementEvidence.status,'observed');
 view.payload.drawingReadings.verticalDimensions=[];
 const floors=[0,1].map(n=>({id:'synthetic-witness-floor-'+n,buildingId,kind:'floor',levelId:'level-'+n,frame:copy(frame),evidence:[],payload:{sourceWidth:1000,sourceHeight:900,drawingReadings:{rows:[]}}}));
 const emptyLevels=floors.map(v=>({id:buildingId+':'+v.levelId,buildingId,sourceLevel:v.levelId,contours:[],wallOpenings:[]}));
 const unrelated={id:buildingId+':retained-level',buildingId,sourceLevel:'retained-level',contours:[],clientSetting:{note:'Preserve this other level'}};
 const inventory={...copy(scene.inventory),schema:'mir-view-inventory',version:1,activeBuildingId:buildingId,buildings:[{id:buildingId,name:'Synthetic native witness drawing'}],rendererSelections:{[buildingId]:{[view.direction||'front']:view.id}},views:[view,...floors],levels:[...emptyLevels,unrelated]};
 for(const source of inventory.views)source.evidence||=[];
 const analysis=copy(inventory);analysis.views.find(v=>v.id===view.id).payload.drawingReadings.verticalDimensions=[copy(observation)];
 const ground={sourceViewId:view.id,sourceFrame:copy(view.frame),levelHint:'level-0',datumType:'floor',y:1100,label:'SYNTHETIC FLOOR 0',confidence:98,box:[600,1088,710,1096],sourceGuide:{method:'caption-and-visible-monochrome-datum-stroke',support:1,anchors:[[580,1100],[715,1100]]}};
 const info={viewId:view.id,direction:view.direction||'front',envelope:{status:'proposed',box:[0,0,720,1200]},facing:{axis:0,min:100,max:700,length:600},guides:[ground,copy(observation.datumEvidence.lower),copy(observation.datumEvidence.upper)]};
 const prepared=emptyLevels.map((level,i)=>{
  const floor=floors[i],draft=M.draftFor(floor,level);
  draft.reference={kind:'written',status:'proposed',value:12,scale:.02,sourceViewId:floor.id,sourceFrame:copy(frame),anchors:[[100,400],[700,400]],label:'Synthetic 12 m floor span',confidence:99};
  draft.points=[[100,100],[700,100],[700,400],[100,400]].map((xy,i)=>({id:'p'+i,xy}));draft.alignment={origin:[100,400],offset:[0,0],rotationDegrees:0,status:'proposed'};draft.status='proposed';
  draft.height=R.heightFromLevelDatums([info],level.sourceLevel,draft.reference,analysis)[0];assert.ok(draft.height,'actual vertical reference must establish the synthetic height');
  const proposal={status:'proposed',buildingId,levelId:level.id,sourceViewId:floor.id,draft:copy(draft),views:[copy(info)]};
  return {levelId:level.id,sourceLevel:level.sourceLevel,draft,proposal};
 });
 assert.equal(prepared[0].draft.height.kind,'estimated-calibrated');assert.equal(prepared[1].draft.height.kind,'written');
 const unresolvedLevel={...copy(emptyLevels[0]),contourDraft:copy(prepared[0].draft),reconstructionDraft:copy(prepared[0].proposal)};
 const network=G.datumNetwork(analysis,buildingId,prepared,prepared[0],[copy(scene.normalizedReference)]);assert.equal(network.status,'proposed');
 const localReadingRetries=[{...copy(observation),source:'native-vertical-dimension',purpose:'source-datum-bound-vertical-dimension',box:copy(observation.textBox)}];
 const levels=prepared.map((p,i)=>{
  const draft=copy(p.draft);draft.base=copy(network.byLevel[p.sourceLevel].base);
  return {...copy(emptyLevels[i]),contours:[draft],reconstruction:{status:'automatic-proposal',proposal:{...copy(p.proposal),draft:copy(draft),localReadingRetries:copy(localReadingRetries)}}};
 });
 const result={version:1,buildingId,status:'partial-proposal',levels:levels.slice().reverse(),reports:levels.map(l=>({levelId:l.id,status:'partial-proposal',issues:[]})),localReadingRetries};
 const validation={...inventory,levels:[...levels,unrelated]};
 for(const level of levels){assert.deepEqual(S.sourceIssues(level,validation),[]);assert.deepEqual(M.validateDraft(level.contours[0],validation,level),[]);assert.equal(M.wallsFor(level,validation,{includeProposed:true}).length,4);assert.ok(!level.exteriorElements&&!level.reconstructedRoofs,'the native source guard must not depend on entries or roofs');}
 unresolvedLevel.reconstructionDraft.localReadingRetries=copy(localReadingRetries);
 assert.deepEqual(S.sourceIssues(unresolvedLevel,{...inventory,levels:[unresolvedLevel,emptyLevels[1],unrelated]}),[]);
 const legacyLevel=copy(levels[0]),legacyDraft=legacyLevel.contours[0];legacyDraft.height={kind:'user-measurement',status:'proposed',value:3,label:'Synthetic manual height'};legacyDraft.base={kind:'local-datum',status:'proposed',value:0};legacyLevel.reconstruction.proposal={draft:copy(legacyDraft)};
 assert.deepEqual(S.sourceIssues(legacyLevel,inventory),[]);assert.deepEqual(S.historyIssues(null,legacyLevel),[]);
 return {inventory,result,unresolvedLevel,legacyLevel,unrelated};
}

async function main(){
 const input=await prepareFixture(),dist=path.resolve(__dirname,'../dist'),server=http.createServer((req,res)=>{
  const file=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);
 });let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
  browser=await require('playwright').chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();
  await page.route('**/*',route=>route.request().url().startsWith(origin)||/^(data:|blob:)/.test(route.request().url())?route.continue():route.abort());
  await page.goto(origin+'/plan.html');await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRNativeWitnessMeasurement&&window.MIRNativeWitnessStore&&window.MIRViewInventory);
  const saved=await page.evaluate(async({inventory,result,unrelated})=>{
   const projectId='pdf-synthetic-native-witness-store',buildingId=result.buildingId,plan=MIRViewInventory.adapt({id:projectId,version:3,projectKind:'imported-pdf',title:'SYNTHETIC — native witness precision',viewInventory:inventory},MIRSheetDetection.volumeFrom);
   await MIRProjectStore.saveActive({id:projectId,planData:plan,takeoffSeed:{version:1,geometry:{},calibrations:{},preservedSetting:{color:'#ab4567',units:'m2'}}});
   const initial=await MIRProjectStore.get(projectId),stamp=MIRProjectStore.reconstructionStamp(initial.planData.viewInventory),invalid=structuredClone(result);
   invalid.localReadingRetries[0].measurementEvidence.nativeSource.sourceSha256='foreign-digest';let sourceRefused=false;
   try{await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:stamp,result:invalid});}catch(e){sourceRefused=/mesures natives/.test(e.message);}
   const invalidUnchanged=JSON.stringify(await MIRProjectStore.get(projectId))===JSON.stringify(initial);
   await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:stamp,result});
   const proposed=await MIRProjectStore.get(projectId),levelId=buildingId+':level-1',otherId=buildingId+':level-0',level=proposed.planData.viewInventory.levels.find(l=>l.id===levelId),finished=structuredClone(level);
   finished.wallFinishes={[MIRLevelModel.wallsFor(level,proposed.planData.viewInventory,{includeProposed:true})[0].id]:{color:'#456789'}};
   await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId,expectedRevision:level.geometryRevision,level:finished});
   const final=await MIRProjectStore.get(projectId),levels=final.planData.viewInventory.levels;
   const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),n=>n.toString(16).padStart(2,'0')).join('');
   return {projectId,buildingId,levelId,otherId,sourceRefused,invalidUnchanged,levelHashes:await Promise.all(levels.map(async l=>[l.id,await hash(l)])),sourceViewsHash:await hash(initial.planData.viewInventory.views),sourceViewsUnchanged:JSON.stringify(final.planData.viewInventory.views)===JSON.stringify(initial.planData.viewInventory.views),otherUnchanged:JSON.stringify(levels.find(l=>l.id===otherId))===JSON.stringify(proposed.planData.viewInventory.levels.find(l=>l.id===otherId)),unrelatedUnchanged:JSON.stringify(levels.find(l=>l.id===unrelated.id))===JSON.stringify(unrelated),settings:final.takeoffSeed.preservedSetting,issues:levels.map(l=>MIRNativeWitnessStore.sourceIssues(l,final.planData.viewInventory)),finishes:levels.find(l=>l.id===levelId).wallFinishes};
  },input);
  assert.ok(saved.sourceRefused&&saved.invalidUnchanged,'foreign native evidence is refused before the first save, atomically');
  assert.ok(saved.sourceViewsUnchanged&&saved.otherUnchanged&&saved.unrelatedUnchanged);assert.ok(saved.issues.every(errors=>!errors.length));assert.deepEqual(saved.settings,{color:'#ab4567',units:'m2'});assert.ok(Object.values(saved.finishes).some(f=>f.color==='#456789'));

  await page.reload();await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRNativeWitnessStore&&window.MIRNativeWitnessMeasurement);
  const reopened=await page.evaluate(async saved=>{
   const {projectId,buildingId,levelId}=saved,baseline=await MIRProjectStore.get(projectId),inventory=baseline.planData.viewInventory,level=inventory.levels.find(l=>l.id===levelId),refusals=[];
   const walk=(o,visit)=>{if(!o||typeof o!=='object')return;visit(o);for(const v of Object.values(o))walk(v,visit);};
   const actions=['drop-all-evidence','drop-evidence-keep-original-anchors','drop-contour-evidence-only','change-original-anchor','change-measured-anchor','change-native-frame','change-written-value','change-height','change-base','drop-local-readings'];
   for(const action of actions){
    const next=structuredClone(level),reference=next.contours[0].height.references[0];
    if(action==='drop-all-evidence'||action==='drop-evidence-keep-original-anchors'){
     walk(next,o=>{delete o.measuredAnchors;delete o.measurementEvidence;if(action==='drop-all-evidence')delete o.originalAnchors;});next.reconstruction.proposal.localReadingRetries=[];
    }
    if(action==='drop-contour-evidence-only')walk(next.contours,o=>{delete o.measuredAnchors;delete o.measurementEvidence;delete o.originalAnchors;});
    if(action==='change-original-anchor')reference.originalAnchors[0][1]+=.5;
    if(action==='change-measured-anchor'){reference.anchors[0][1]+=.5;reference.scale=reference.value/Math.hypot(reference.anchors[1][0]-reference.anchors[0][0],reference.anchors[1][1]-reference.anchors[0][1]);reference.calibration.metresPerPixel=reference.scale;}
    if(action==='change-native-frame')next.reconstruction.proposal.localReadingRetries[0].measurementEvidence.nativeSource.sourceFrame.rasterSize[0]++;
    if(action==='change-written-value')reference.value+=.1;
    if(action==='change-height')next.contours[0].height.value+=.2;
    if(action==='change-base')next.contours[0].base.value+=.2;
    if(action==='drop-local-readings')next.reconstruction.proposal.localReadingRetries=[];
    const currentInventory={...inventory,levels:inventory.levels.map(l=>l.id===levelId?next:l)},issues=[...MIRNativeWitnessStore.sourceIssues(next,currentInventory),...MIRNativeWitnessStore.historyIssues(next,level)];
    let refused=false,message='';try{await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId,expectedRevision:level.geometryRevision,level:next});}catch(e){refused=true;message=e.message;}
    refusals.push({action,issues,refused,message,unchanged:JSON.stringify(await MIRProjectStore.get(projectId))===JSON.stringify(baseline)});
   }
   const guard=window.MIRNativeWitnessStore;let missingModuleRefused=false;
   try{window.MIRNativeWitnessStore=null;await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId,expectedRevision:level.geometryRevision,level:structuredClone(level)});}catch(e){missingModuleRefused=/contrôle des mesures natives/.test(e.message);}finally{window.MIRNativeWitnessStore=guard;}
   const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),n=>n.toString(16).padStart(2,'0')).join('');
   return {refusals,missingModuleRefused,missingModuleUnchanged:JSON.stringify(await MIRProjectStore.get(projectId))===JSON.stringify(baseline),levelHashes:await Promise.all(inventory.levels.map(async l=>[l.id,await hash(l)])),sourceViewsHash:await hash(inventory.views),settings:baseline.takeoffSeed.preservedSetting};
  },saved);
  assert.deepEqual(reopened.levelHashes,saved.levelHashes);assert.equal(reopened.sourceViewsHash,saved.sourceViewsHash);assert.deepEqual(reopened.settings,saved.settings);
  for(const refusal of reopened.refusals){assert.ok(refusal.issues.length,refusal.action+' must fail its source/history guard');assert.ok(refusal.refused&&/mesures natives/.test(refusal.message),refusal.action+' must be refused by the native source guard');assert.ok(refusal.unchanged,refusal.action+' must leave the entire project unchanged');}
  assert.ok(reopened.missingModuleRefused&&reopened.missingModuleUnchanged);

  const drafts=await page.evaluate(async({inventory,result,unresolvedLevel,legacyLevel})=>{
   const buildingId=result.buildingId,projectId='pdf-synthetic-native-witness-unresolved',plan=MIRViewInventory.adapt({id:projectId,version:3,projectKind:'imported-pdf',title:'SYNTHETIC — unresolved precision evidence',viewInventory:inventory},MIRSheetDetection.volumeFrom);
   await MIRProjectStore.saveActive({id:projectId,planData:plan,takeoffSeed:{version:1,geometry:{},calibrations:{},preservedSetting:'unresolved-choice'}});
   const initial=await MIRProjectStore.get(projectId),draft=structuredClone(unresolvedLevel);delete draft.reconstructionDraft.localReadingRetries;
   await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp:MIRProjectStore.reconstructionStamp(initial.planData.viewInventory),result:{...result,status:'unresolved',levels:[draft],reports:[{levelId:draft.id,status:'unresolved',issues:['LEVEL_ALIGNMENT_REQUIRED']}]}});
   const saved=await MIRProjectStore.get(projectId),level=saved.planData.viewInventory.levels.find(l=>l.id===draft.id),bad=structuredClone(level);delete bad.reconstructionDraft.localReadingRetries;
   let refused=false;try{await MIRProjectStore.saveLevelGeometry({projectId,buildingId,levelId:level.id,expectedRevision:level.geometryRevision,level:bad});}catch(e){refused=/mesures natives/.test(e.message);}
   const legacyId='pdf-synthetic-native-witness-legacy',legacyPlan={...structuredClone(plan),id:legacyId};
   await MIRProjectStore.saveActive({id:legacyId,planData:legacyPlan,takeoffSeed:{version:1,geometry:{},calibrations:{},preservedSetting:'legacy-choice'}});
   const legacyInitial=await MIRProjectStore.get(legacyId),guard=window.MIRNativeWitnessStore;
   try{window.MIRNativeWitnessStore=null;await MIRProjectStore.saveReconstruction({projectId:legacyId,buildingId,expectedStamp:MIRProjectStore.reconstructionStamp(legacyInitial.planData.viewInventory),result:{version:1,buildingId,status:'partial-proposal',levels:[legacyLevel],reports:[],localReadingRetries:[]}});}finally{window.MIRNativeWitnessStore=guard;}
   const legacy=await MIRProjectStore.get(legacyId);
   return {projectId,levelId:level.id,hasDraft:!!level.contourDraft&&!level.contours.length&&!level.reconstruction,proofsPersisted:JSON.stringify(level.reconstructionDraft.localReadingRetries)===JSON.stringify(result.localReadingRetries),issues:MIRNativeWitnessStore.sourceIssues(level,saved.planData.viewInventory),refused,unchanged:JSON.stringify(await MIRProjectStore.get(projectId))===JSON.stringify(saved),sourceViewsUnchanged:JSON.stringify(saved.planData.viewInventory.views)===JSON.stringify(initial.planData.viewInventory.views),legacyPreserved:legacy.takeoffSeed.preservedSetting==='legacy-choice'&&legacy.planData.viewInventory.levels.find(l=>l.id===legacyLevel.id).contours[0].height.value===3};
  },input);
  assert.ok(drafts.hasDraft&&drafts.proofsPersisted&&drafts.refused&&drafts.unchanged&&drafts.sourceViewsUnchanged&&drafts.legacyPreserved);assert.deepEqual(drafts.issues,[]);
  await page.reload();await page.waitForFunction(()=>window.MIRProjectStore&&window.MIRNativeWitnessStore);
  const draftReload=await page.evaluate(async({projectId,levelId})=>{const project=await MIRProjectStore.get(projectId),level=project.planData.viewInventory.levels.find(l=>l.id===levelId);return {issues:MIRNativeWitnessStore.sourceIssues(level,project.planData.viewInventory),hasReadings:level.reconstructionDraft.localReadingRetries.length>0,setting:project.takeoffSeed.preservedSetting};},drafts);
  assert.deepEqual(draftReload,{issues:[],hasReadings:true,setting:'unresolved-choice'});
  console.log('PASS native witness browser storage: real native pixel proof, two levels without roofs/entries, derived height/base checks, immutable sources, atomic lost/changed proof refusals, finishes and reload, unresolved drafts, preserved other levels/settings and legacy models');
 }finally{await browser?.close();server.close();}
}
module.exports={prepareFixture};
if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
