'use strict';
// Entirely invented drawings. No PDF, customer coordinates, OCR or source
// raster is needed to exercise detection, association or proof replay.
const assert=require('node:assert/strict'),H=require('../dist/plan-roof-hip-candidates.js'),P=require('../dist/plan-roof-plan-evidence.js'),R=require('../dist/plan-reconstruction.js'),M=require('../dist/plan-level-model.js'),Roof=require('../dist/plan-reconstructed-roofs.js'),{makeRoofPlanScene,moveGridReadingsToRetries}=require('./fixtures/roof-plan-evidence.cjs');
const clone=structuredClone,host=[200,150,600,450];
function erase(d,box){for(let y=box[1];y<=box[3];y++)for(let x=box[0];x<=box[2];x++)d.dot(x,y,[255,255,255]);}
function makePartialHipScene({insideParent=true}={}){
 const s=makeRoofPlanScene(),d=s.drawings['roof-plan'];
 // The outer eave has two genuine fragments; captions/obscured portions do
 // not become observations merely because the two fragments are collinear.
 erase(d,[138,280,142,320]);for(const y of [250,350])erase(d,[163,y-1,178,y+1]);
 if(insideParent){s.parent.profiles.x[0][0]=1.8;s.parent.sources[0].anchors[0][0]=180;}
 s.inventory.files=[{id:'synthetic-drawings',sha256:'d'.repeat(64)}];return s;
}
function makePartialHipRoofScene(options){const s=makePartialHipScene(options),result=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration}),roof={...clone(s.parent),extensions:result.extensions,roofPlanEvidence:result.evidence};return {...s,result,roof};}
function makeShallowReturnScene({ridgeOffset=2,pitch=.5,planNodeX=140+50/pitch}={}){
 const s=makeRoofPlanScene({directions:[]}),d=s.drawings['roof-plan'];s.inventory.files=[{id:'synthetic-drawings',sha256:'d'.repeat(64)}];s.parent.profiles.x=[[2.2,3],[4.2,5],[6.2,3]];s.parent.sources[0].anchors=[[220,300],[420,100],[620,300]];
 for(const [a,b]of [[[140,250],[140,280]],[[140,320],[140,350]],[[140,250],[160,250]],[[140,350],[160,350]],[[140,250],[planNodeX,300]],[[140,350],[planNodeX,300]],[[planNodeX,300],[265,300]]])d.line(a,b);
 for(const [a,b]of [[[250,300],[300,250]],[[300,250],[350,300]],[[250,300],[350,300]]])s.drawings.left.line(a,b);
 for(const direction of ['front','back']){const d=s.drawings[direction],x=v=>direction==='front'?v:800-v,high=140+(50-ridgeOffset)/pitch;for(const [a,b]of [[ [140,300],[high,250+ridgeOffset] ],[ [high,250+ridgeOffset],[265,250+ridgeOffset] ],[ [140,300],[265,300] ]])d.line([x(a[0]),a[1]],[x(b[0]),b[1]]);}
 return s;
}
function main(){
 {
  const source=[[0,40],[60,10],[100,10]],model=[[0,40],[64,8],[100,8]],proof=P.finiteProfileComparison(source,model);assert.equal(proof.status,'compatible');assert.equal(proof.maximumAbsoluteVerticalResidual,2);assert.ok(Math.abs(source[1][0]-model[1][0])>3,'the derived corner X difference is not an independent source displacement');assert.deepEqual(proof.knots.map(k=>k.x),[0,60,64,100]);assert.equal(P.finiteProfileComparison(source.slice().reverse(),model.slice().reverse()).maximumAbsoluteVerticalResidual,2);
  assert.equal(P.finiteProfileComparison(source,[[0,40],[68,6],[100,6]]).status,'conflict','a real four-pixel vertical disagreement remains rejected');assert.equal(P.finiteProfileComparison(source,[[0,40],[64,8],[99,8]]),null,'finite domains cannot be silently truncated');assert.equal(P.finiteProfileComparison(source,[[0,40],[104,8],[100,8]]),null,'a calculated node outside the source domain is not extrapolated');assert.equal(P.finiteProfileComparison([[0,20],[50,10],[100,20]],[[0,20],[50,14],[100,20]]).status,'conflict','equal endpoints do not hide an interior disagreement');
 }
 for(const direction of ['left','right','back','front']){
  const s=makeRoofPlanScene({directions:[direction]}),r=H.detect(s.images['roof-plan'],host);assert.equal(r.candidates.length,1,direction);const c=r.candidates[0];assert.equal(c.direction,direction);assert.deepEqual(H.validate(c,{sourceSize:[800,600],image:s.images['roof-plan']}),[]);assert.equal(c.footprintKind,'observed-keypoints');assert.deepEqual(c.sourcePans,[]);assert.equal(c.joinBoundaryObserved,false);assert.ok(c.hip.ridge.intervalOnly);assert.ok(Math.hypot(...c.hip.ridge.anchors[1].map((n,i)=>n-c.hip.node[i]))>=c.hip.ridge.minimumLength);assert.ok(c.hipEvidence.sourcePixels.pixels.length<=H.limits.pixelsPerProof);
 }
 {
  const s=makePartialHipRoofScene(),o=s.result.evidence.observations[0];assert.equal(s.result.extensions.length,1,'two real elevations and an observed parent intersection produce a component');assert.equal(o.mode,'two-hip-diagonals-and-ridge');assert.equal(o.boundaryCompleteness,'partial');assert.ok(o.unobservedIntervals.length);assert.ok(o.unobservedIntervals.every(g=>g.pixelsObserved===false));assert.ok(o.hip.node[0]>180,'the actual hip junction may lie inside the parent search extent');assert.deepEqual(P.evidenceIssues(s.roof,s.inventory),[]);assert.deepEqual(P.geometryIssues(s.roof,{confirm:true}),[]);assert.deepEqual(Roof.issues(s.roof,{confirm:false}),[]);assert.deepEqual(P.historyIssues(clone(s.roof),s.roof),[]);
  const extension=s.result.extensions[0];assert.equal(extension.connection.join.method,'observed-ridge-and-intersection-with-parent-profile');assert.ok(extension.connection.join.value>o.hip.node[0]*.01);assert.notEqual(extension.profiles.x[0][1],extension.profiles.x.at(-1)[1],'the component is a sourced pitched return');
  const mutations=[
   c=>{c.anchors[0][0]+=8;},c=>{c.hip.node[0]+=8;},c=>{c.hipEvidence.sourcePixels.pixels.pop();},c=>{c.hipEvidence.sourcePixels.pixels[0][1]^=0xff00;},c=>{c.hipEvidence.sourcePixels.rasterSize[0]++;},c=>{c.hipEvidence.initialNode[0]+=20;},c=>{c.hipEvidence.seed.fragments[0][0]--;},c=>{c.hip.ridge.minimumLength=1;},c=>{c.unobservedIntervals=[];},c=>{c.sourcePans=[c.anchors.slice(0,3)];},c=>{delete c.hipEvidence;}
  ];for(const mutate of mutations){const c=clone(o);mutate(c);assert.ok(H.validate(c,{sourceSize:[800,600],image:s.images['roof-plan']}).length,'changed evidence must not revalidate');}
  for(const mutate of [r=>{r.roofPlanEvidence.observations[0].sourceFrame.rasterSize[0]++;},r=>{r.roofPlanEvidence.observations[0].sourceFileSha256='a'.repeat(64);},r=>{r.roofPlanEvidence.observations[0].hipEvidence.search.host[0]++;},r=>{r.roofPlanEvidence.observations[0].footprint[0][0]+=.1;},r=>{delete r.roofPlanEvidence.observations[0].hipEvidence;},r=>{delete r.roofPlanEvidence.observations[0].hip;}]){const bad=clone(s.roof);mutate(bad);assert.ok(P.evidenceIssues(bad,s.inventory).length);assert.ok(P.historyIssues(bad,s.roof).length);}
  const changedInventory=clone(s.inventory);changedInventory.files[0].sha256='e'.repeat(64);assert.ok(P.evidenceIssues(s.roof,changedInventory).includes('ROOF_PLAN_HIP_SOURCE'));
 }
 {
  const s=makePartialHipScene();s.proposal.views=[];const r=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration});assert.equal(r.extensions.length,0);assert.equal(r.evidence.observations.length,1);assert.equal(r.evidence.observations[0].association.reason,'ROOF_RETURN_OUTER_PROFILE_REQUIRED');assert.ok(P.geometryIssues({...s.parent,extensions:[],roofPlanEvidence:r.evidence},{confirm:true}).includes('ROOF_PLAN_UNRESOLVED'));
 }
 {
  const s=makePartialHipScene();for(const id of ['front','back'])s.images[id].data.fill(255);const r=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration});assert.equal(r.extensions.length,0,'a top view and a single elevation cannot invent depth or Z');assert.ok(r.issues.includes('ROOF_RETURN_ORTHOGONAL_PROFILE_OR_SOURCED_JOIN_REQUIRED'));
 }
 {
  const s=makePartialHipScene(),d=s.drawings['roof-plan'];erase(d,[205,298,251,302]);const r=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration});assert.equal(r.extensions.length,0,'a ridge stub may not fabricate the unseen parent join');
 }
 // An actual source corner can extend beyond the host tangent window. The
 // host only locates a search; the fitted endpoints supply the observation.
 {
  const s=makeRoofPlanScene({directions:[]}),d=s.drawings['roof-plan'];for(const [a,b]of [[[140,130],[140,230]],[[140,130],[200,130]],[[140,230],[200,230]],[[140,130],[190,180]],[[140,230],[190,180]],[[190,180],[250,180]]])d.line(a,b);const r=H.detect(d.image,host);assert.equal(r.candidates.length,1);assert.ok(r.candidates[0].anchors[0][1]<host[1]);assert.deepEqual(H.validate(r.candidates[0],{sourceSize:[800,600],image:d.image}),[]);
 }
 for(const options of [{hips:false},{colour:[0,150,220]}]){const s=makeRoofPlanScene(options);assert.equal(H.detect(s.images['roof-plan'],host).candidates.length,0,'rails or colour alone are not a hip roof');}
 for(const missing of ['slope','ridge']){
  const s=makePartialHipScene();for(const direction of ['front','back']){const d=s.drawings[direction],box=missing==='slope'?[160,267,171,282]:[221,248,251,252];if(direction==='back')[box[0],box[2]]=[800-box[2],800-box[0]];erase(d,box);}const r=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration});assert.equal(r.extensions.length,0,'intersecting infinite lines do not replace a missing finite '+missing+' segment');
 }
 {
  const s=makePartialHipScene(),d=s.drawings['roof-plan'];erase(d,[141,249,270,351]);for(const [a,b]of [[[140,250],[160,250]],[[140,350],[160,350]],[[140,250],[198,300]],[[140,350],[198,300]],[[198,300],[250,300]]])d.line(a,b);const r=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration});assert.equal(r.extensions.length,0,'a separately observed plan junction contradicting the elevations remains rejected');
 }
 {
  const s=makePartialHipScene(),d=s.drawings.front;d.line([140,300],[190,240]);d.line([190,240],[250,240]);const r=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration});assert.equal(r.extensions.length,0,'two supported source roof profiles are not resolved by selecting the convenient one');assert.ok(r.issues.includes('ROOF_RETURN_SOURCE_PROFILE_AMBIGUOUS'));
  const conservative=makeShallowReturnScene(),ambiguous=P.propose(conservative.parent,conservative.proposal,conservative.inventory,conservative.reviewed,conservative.images,{registerElevation:R.elevationRegistration});assert.equal(ambiguous.extensions.length,0,'pixel neighbourhoods that admit distinct eave hypotheses stay unresolved');assert.ok(ambiguous.issues.includes('ROOF_RETURN_SOURCE_PROFILE_AMBIGUOUS'));
 }
 for(const kind of ['ridge','one-diagonal']){
  const s=makeRoofPlanScene(),d=s.drawings['roof-plan'];if(kind==='ridge')erase(d,[194,298,250,302]);else{erase(d,[141,301,188,349]);d.line([140,350],[200,350]);}assert.equal(H.detect(d.image,host).candidates.length,0,kind+' is required');
 }
 {
  const s=makeRoofPlanScene(),d=s.drawings['roof-plan'];d.line([140,250],[230,300]);d.line([140,350],[230,300]);d.line([230,300],[280,300]);const r=H.detect(d.image,host);assert.ok(r.candidates.length>=2,'distinct neutral source junctions remain hypotheses');assert.ok(r.candidates.every(c=>!H.validate(c,{sourceSize:[800,600],image:d.image}).length));
 }
 {
  const s=makePartialHipScene(),before=s.images['roof-plan'].data.slice();assert.throws(()=>H.detect(s.images['roof-plan'],host,{cancelled:()=>true}),e=>e.name==='AbortError');let checks=0;assert.throws(()=>H.detect(s.images['roof-plan'],host,{cancelled:()=>++checks>10}),e=>e.name==='AbortError');assert.deepEqual(s.images['roof-plan'].data,before,'discovery never modifies the source raster');
  const r=H.detect(s.images['roof-plan'],host);assert.ok(r.work.length===4&&r.work.every(w=>w.probes<=H.limits.probesPerDirection&&w.pixelChecks<=H.limits.pixelChecksPerDirection&&w.detailedChecks<=H.limits.detailedChecksPerDirection));
 }
 {
  const s=makePartialHipScene();for(const d of Object.values(s.drawings).filter(d=>d.view.kind==='elevation'))for(let i=0;i<d.image.data.length;i+=4)if(d.image.data[i]===0)d.image.data.set([232,232,232,255],i);
  const result=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration}),roof={...s.parent,extensions:result.extensions,roofPlanEvidence:result.evidence};assert.equal(result.extensions.length,1,'a thin neutral stroke is recovered against two real paper flanks');assert.deepEqual(P.evidenceIssues(roof,s.inventory),[]);
  const o=result.evidence.observations[0];for(const r of o.elevationRegions.filter(r=>r.profile?.status==='proposed')){assert.equal(r.profile.profileEvidence.pixelRule,'narrow-neutral-stroke-with-two-paper-flanks');assert.deepEqual(H.validateProfile(r.profile,{sourceSize:[800,600],image:s.images[r.sourceViewId],constraint:r.profileConstraint}),[]);for(const mutate of [p=>{delete p.profileEvidence;},p=>{p.profileEvidence.pixelRule='colour';},p=>{p.profileEvidence.sourcePixels.pixels.pop();},p=>{p.profileEvidence.constraint.ridgeX+=4;},p=>{p.slopes.find(Boolean).highY-=4;}]){const bad=clone(r.profile);mutate(bad);assert.ok(H.validateProfile(bad,{sourceSize:[800,600],image:s.images[r.sourceViewId],constraint:r.profileConstraint}).length);}}
  const joint=o.association.elevationRidge;assert.deepEqual(H.validateElevationSegment(joint,{sourceSize:[800,600],image:s.images[joint.sourceViewId]}),[]);const lost=clone(roof);delete lost.roofPlanEvidence.observations[0].association.elevationRidge.strokeEvidence;assert.ok(P.evidenceIssues(lost,s.inventory).length);assert.ok(P.historyIssues(lost,roof).length);
  for(const d of Object.values(s.drawings).filter(d=>d.view.kind==='elevation'))for(let i=0;i<d.image.data.length;i+=4)if(d.image.data[i]===255)d.image.data.set([236,236,236,255],i);
  assert.equal(P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration}).extensions.length,0,'a grey filled area supplies no two paper flanks');
 }
 {
  const s=makePartialHipScene();for(const d of Object.values(s.drawings).filter(d=>d.view.kind==='elevation'))for(let i=0;i<d.image.data.length;i+=4)if(d.image.data[i]===0)d.image.data.set([225,225,200,255],i);assert.equal(P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration}).extensions.length,0,'a coloured stroke cannot masquerade as the recovered neutral line');
 }
 {
  const s=makePartialHipScene();s.drawings.left.line([300,250],[420,130]);const r=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration});assert.equal(r.extensions.length,1);const profile=r.evidence.observations[0].elevationRegions.find(r=>r.role==='outer-eave-profile').profile;assert.ok(Math.abs(profile.slopes[0].highX-300)<=3&&Math.abs(profile.slopes[0].highY-250)<=3,'the local projected junction prevents following the continuation into a taller parent');
 }
 {
  const s=makePartialHipRoofScene(),region=s.result.evidence.observations[0].elevationRegions.find(r=>r.direction==='front'),d=s.drawings.front;
  erase(d,[190,248,251,252]);for(const y of [249,250])d.line([190,y],[250,y],[232,232,232]);
  const profile=H.profile(d.image,region.profileConstraint);assert.equal(profile.status,'proposed');assert.equal(profile.ridgeProof.fit.y,249.5,'the centre of the actual two-pixel stroke is independent of the integer search row');assert.equal(profile.points[1][1],249.5);assert.equal(profile.ridgeProof.fit.method,'median-supported-horizontal-stroke-centres');assert.deepEqual(H.validateProfile(profile,{sourceSize:[800,600],image:d.image,constraint:region.profileConstraint}),[]);
  for(const mutate of [p=>{p.ridgeProof.fit.y+=.5;},p=>{delete p.ridgeProof.fit;},p=>{p.ridgeProof.fit.sampleCount++;}]){const bad=clone(profile);mutate(bad);assert.ok(H.validateProfile(bad,{sourceSize:[800,600],image:d.image,constraint:region.profileConstraint}).length);}
  for(let y=246;y<=253;y++)d.line([190,y],[250,y]);assert.equal(H.profile(d.image,region.profileConstraint).status,'unresolved','a broad band cannot supply a unique thin ridge centre');
 }
 for(const offset of [1,4]){
  const s=makePartialHipScene();for(const id of ['front','back']){const d=s.images[id],old=d.data.slice();d.data.fill(255);for(let y=offset;y<d.height;y++)d.data.set(old.subarray(y*d.width*4,(y+1)*d.width*4),(y-offset)*d.width*4);}
  const result=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration});
  if(offset===4){assert.equal(result.extensions.length,0,'a genuinely inconsistent source profile beyond three pixels remains rejected');assert.ok(result.issues.includes('ROOF_RETURN_ORTHOGONAL_PROFILES_CONFLICT'));continue;}
  assert.equal(result.extensions.length,1);const roof={...s.parent,extensions:result.extensions,roofPlanEvidence:result.evidence},joint=result.evidence.observations[0].association.elevationRidge,p=joint.projection;assert.ok(Math.abs(p.residuals[0][1])>.9&&Math.abs(p.residuals[0][1])<=3);assert.notEqual(p.modelAnchors[0][1],p.observedAnchors[0][1]);assert.deepEqual(p.observedAnchors,joint.anchors);assert.deepEqual(P.evidenceIssues(roof,s.inventory),[]);
  for(const mutate of [j=>{j.projection.residuals[0][1]+=1;},j=>{j.projection.residuals[0][1]=3.01;},j=>{j.projection.tolerancePixels=4;},j=>{j.anchors=clone(j.projection.modelAnchors);},j=>{delete j.projection;},j=>{j.projection.modelNodeKind='observed-pixel';},j=>{j.projection.finiteProfileComparison.maximumAbsoluteVerticalResidual=0;},j=>{j.projection.finiteProfileComparison.domain[1]--;},j=>{j.projection.finiteProfileComparison.sourceProfile[1][1]++;},j=>{j.projection.finiteProfileComparison.knots.pop();},j=>{delete j.projection.finiteProfileComparison;},j=>{delete j.projection.planResidualX;},j=>{j.projection.planResidualX=4;}]){const bad=clone(roof);mutate(bad.roofPlanEvidence.observations[0].association.elevationRidge);assert.ok(P.evidenceIssues(bad,s.inventory).includes('ROOF_RETURN_JOIN_PROJECTION'));assert.ok(P.historyIssues(bad,roof).length);}
 }
 {
  const s=makePartialHipRoofScene();moveGridReadingsToRetries(s.inventory);assert.deepEqual(P.evidenceIssues(s.roof,s.inventory),[],'older OCR retry without native attempt remains valid');const retry=s.inventory.levels[0].reconstruction.proposal.localReadingRetries[0],view=s.inventory.views.find(v=>v.id===retry.retry.sourceViewId);assert.ok(P.localGridReading(retry,view,s.inventory),'detached row with the exact view id');delete retry.sourceViewId;assert.ok(P.localGridReading(retry,view,s.inventory),'embedded row may inherit its view id from its container and exact retry');retry.sourceViewId='foreign-view';assert.equal(P.localGridReading(retry,view,s.inventory),false,'an explicit foreign top-level view id is not redundant');retry.sourceViewId=view.id;const originalRetryId=retry.retry.sourceViewId;delete retry.retry.sourceViewId;assert.equal(P.localGridReading(retry,view,s.inventory),false,'the retry view id is always required');retry.retry.sourceViewId=originalRetryId;retry.retry.nativeAttempt={status:'proposed'};assert.ok(P.evidenceIssues(s.roof,s.inventory).includes('ROOF_PLAN_GRID'),'a claimed successful native reading cannot lose its source proof');delete retry.retry.nativeAttempt;assert.deepEqual(P.evidenceIssues(s.roof,s.inventory),[]);
  for(const row of s.inventory.levels[0].reconstruction.proposal.localReadingRetries){const owner=s.inventory.views.find(v=>v.id===row.retry.sourceViewId);delete row.sourceViewId;owner.payload.drawingReadings.rows.push(row);}s.inventory.levels[0].reconstruction.proposal.localReadingRetries=[];assert.deepEqual(P.evidenceIssues(s.roof,s.inventory),[],'integrated rows receive the same source checks as detached retries');retry.retry.nativeAttempt={status:'proposed'};assert.ok(P.evidenceIssues(s.roof,s.inventory).includes('ROOF_PLAN_GRID'),'an integrated native attempt cannot lose its source proof');delete retry.retry.nativeAttempt;retry.sourceViewId='foreign-view';assert.ok(P.evidenceIssues(s.roof,s.inventory).includes('ROOF_PLAN_GRID'),'an integrated explicit foreign id is rejected');
 }
 {
  const s=makePartialHipScene(),view=s.inventory.views.find(v=>v.id===s.reviewed.sourceViewId);view.frame={...view.frame,pdfToRaster:[2,0,0,-2,10,1200],cropToRaster:[1,0,0,1,0,0]};s.reviewed.reference.sourceFrame=clone(view.frame);s.reviewed.alignment.status='proposed';
  const result=P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration}),roof={...s.parent,extensions:result.extensions,roofPlanEvidence:result.evidence};assert.equal(result.extensions.length,1);assert.deepEqual(P.evidenceIssues(roof,s.inventory),[]);
  const ready=clone(s.reviewed);for(const key of ['reference','alignment','height','base'])ready[key].status='confirmed';const confirmed=M.confirmDraft(ready,s.inventory,s.level);s.level.contours=[confirmed];assert.deepEqual(P.evidenceIssues(roof,s.inventory),[],'actual confirmation adds only validated PDF coordinates and review statuses');assert.deepEqual(P.historyIssues(clone(roof),roof),[]);
  for(const mutate of [c=>{c.points[0].pdfPoint[0]++;},c=>{c.reference.pdfAnchors[0][1]++;},c=>{c.reference.value+=.01;},c=>{c.points[0].xy[0]++;},c=>{c.height.value+=.01;},c=>{c.base.value+=.01;},c=>{c.alignment.offset[0]+=.01;},c=>{c.reference.status='rejected';}]){s.level.contours=[clone(confirmed)];mutate(s.level.contours[0]);assert.ok(P.evidenceIssues(roof,s.inventory).includes('ROOF_PLAN_REFERENCE_STALE'),'only the exact permitted confirmation transition is normalized');}
 }
 console.log('PASS roof hip candidates: bounded neutral source diagonals and ridge, partial boundaries/corners beyond host, paper-flanked faint profiles, replayable pixels, two-elevation pitched geometry/parent join and source/history/cancellation guards');
}
if(require.main===module)main();
module.exports={makePartialHipScene,makePartialHipRoofScene,makeShallowReturnScene};
