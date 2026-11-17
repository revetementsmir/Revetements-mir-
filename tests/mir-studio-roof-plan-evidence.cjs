'use strict';
const assert=require('node:assert/strict'),P=require('../dist/plan-roof-plan-evidence.js'),R=require('../dist/plan-reconstruction.js'),Roof=require('../dist/plan-reconstructed-roofs.js'),{makeRoofPlanScene,makeProposedRoofScene,moveGridReadingsToRetries}=require('./fixtures/roof-plan-evidence.cjs');
const propose=s=>P.propose(s.parent,s.proposal,s.inventory,s.reviewed,s.images,{registerElevation:R.elevationRegistration}),attach=(s,r)=>({...structuredClone(s.parent),extensions:r.extensions,...(r.evidence?{roofPlanEvidence:r.evidence}:{})});
for(const direction of ['left','right','front','back']){
 const s=makeProposedRoofScene({directions:[direction]});assert.equal(s.result.extensions.length,1,direction);assert.deepEqual(P.geometryIssues(s.roof),[]);assert.deepEqual(P.evidenceIssues(s.roof,s.inventory),[]);
 const e=s.result.extensions[0],f=s.result.evidence.observations[0];assert.equal(e.connection.direction,direction);assert.equal(f.association.status,'proposed');assert.ok(f.elevationRegions.length>=3,'actual cropped profiles from orthogonal source views');
 assert.ok(Roof.faces(e,[0,0],{includeProposed:true}).filter(f=>f.type==='roof').every(f=>Math.hypot(f.normal[0],f.normal[1])>.05),'the ridge creates sloped faces, not a horizontal fill');
}
{
 const s=makeRoofPlanScene({directions:['left','right','back']}),before=structuredClone(s.parent),result=propose(s);assert.equal(result.extensions.length,3);assert.deepEqual(s.parent,before,'observations never alter the parent silhouette');
 assert.deepEqual(P.evidenceIssues(attach(s,result),s.inventory),[]);
 const back=result.extensions.find(e=>e.connection.direction==='back');assert.ok(Math.abs(back.profiles.x[1][0]-4.3)<.035,'the rear return keeps its source offset, not building symmetry');
 const left=result.extensions.find(e=>e.connection.direction==='left');assert.ok(Math.abs(left.connection.join.value-2.5)<.035);assert.ok(Math.abs(left.connection.join.height-3.5)<.035,'source profiles meet the parent at the observed ridge height');
}
for(const options of [{hips:false},{colour:[0,180,230]}]){
 const s=makeRoofPlanScene(options),result=propose(s);assert.equal(result.extensions.length,0);assert.equal(result.status,'not-found');assert.equal(result.evidence,null,'a rail, dimension bracket or colour-only contour is not roof evidence');
}
{
 const s=makeRoofPlanScene();delete s.images.front;delete s.images.back;const r=propose(s);assert.equal(r.extensions.length,0);assert.equal(r.evidence.observations.length,1);assert.equal(r.evidence.observations[0].association.reason,'ROOF_RETURN_ORTHOGONAL_PROFILE_OR_SOURCED_JOIN_REQUIRED');assert.deepEqual(P.evidenceIssues(attach(s,r),s.inventory),[]);assert.ok(P.geometryIssues(attach(s,r),{confirm:true}).includes('ROOF_PLAN_UNRESOLVED'));
}
{
 const s=makeRoofPlanScene({sideRidges:false}),r=propose(s);assert.equal(r.extensions.length,0,'no unsupported continuation to the parent');
}
{
 const s=makeRoofPlanScene();for(let x=205;x<=250;x++)for(let y=298;y<=302;y++)s.drawings['roof-plan'].dot(x,y,[255,255,255]);const r=propose(s);assert.equal(r.evidence.observations.length,1,'the local hip remains observed');assert.equal(r.extensions.length,0,'the missing plan ridge prevents a manufactured join');
}
{
 const s=makeRoofPlanScene();
 // One side contradicts the other two: matching XY but a lower crest.
 const direction='back';s.images[direction].data.fill(255);const project=(x,z)=>[800-100*x,600-100*z],d=s.drawings[direction];d.line(project(1.4,3),project(1.9,3.4));d.line(project(1.9,3.4),project(2.5,3.4));d.line(project(1.4,3),project(2.5,3));
 const result=propose(s);assert.equal(result.extensions.length,0,'the compatible view cannot hide a contradictory orthogonal source');assert.ok(result.issues.includes('ROOF_RETURN_ORTHOGONAL_PROFILES_CONFLICT'));
}
{
 const s=makeRoofPlanScene(),d=s.drawings['roof-plan'],old=new Uint8ClampedArray(d.image.data);d.image.data.fill(255);
 for(let y=0;y<589;y++)for(let x=0;x<783;x++){const i=(y*800+x)*4;if(old[i]<255)d.dot(x+17,y+11,[old[i],old[i+1],old[i+2]]);}
 d.view.payload.drawingReadings.rows.forEach(row=>{row.box=row.box.map((n,i)=>n+(i%2?11:17));});
 const r=propose(s);assert.equal(r.extensions.length,1);assert.equal(r.evidence.observations[0].gridRegistration.transform.offsetX,-17);assert.ok(Math.abs(r.extensions[0].profiles.y[1][0]-3)<.035);assert.deepEqual(P.evidenceIssues(attach(s,r),s.inventory),[],'independent source placement is registered, not assumed identical');
}
{
 const s=makeRoofPlanScene();s.drawings['roof-plan'].view.frame.rasterSize[0]++;const r=propose(s);assert.equal(r.extensions.length,0);assert.ok(r.issues.includes('ROOF_GRID_SOURCE_FRAME_REQUIRED'));
}
{
 const s=makeRoofPlanScene();s.drawings['roof-plan'].view.buildingId='other';const r=propose(s);assert.equal(r.status,'not-found');assert.equal(r.evidence,null);assert.deepEqual(P.geometryIssues(s.parent),[]);assert.deepEqual(P.evidenceIssues(s.parent,s.inventory),[]);
}
{
 const s=makeRoofPlanScene();s.parent.profiles.x[0][0]=1;const r=propose(s);assert.equal(r.extensions.length,0);assert.ok(r.evidence.observations.some(o=>o.parentExtentAmbiguous));assert.ok(r.issues.includes('ROOF_PLAN_PARENT_EXTENT_OWNERSHIP_UNRESOLVED'),'an observed return engulfed by the parent requires a component split');assert.deepEqual(P.evidenceIssues(attach(s,r),s.inventory),[]);
}
{
 const s=makeRoofPlanScene({directions:[]});s.parent.profiles.x[0][0]=1.8;s.parent.profiles.x.at(-1)[0]=6.2;s.parent.profiles.y[0][0]=1.3;s.parent.profiles.y.at(-1)[0]=4.7;const d=s.drawings['roof-plan'],c=[[180,130],[620,130],[620,470],[180,470]];for(let i=0;i<4;i++)d.line(c[i],c[(i+1)%4]);for(const [a,b]of [[c[0],[350,300]],[c[3],[350,300]],[c[1],[450,300]],[c[2],[450,300]],[[350,300],[450,300]]])d.line(a,b);
 const r=propose(s);assert.equal(r.status,'not-found');assert.equal(r.evidence,null);assert.deepEqual(r.issues,[],'ordinary overhang is not component ambiguity or a newly invented defect');
}
{
 const s=makeProposedRoofScene(),finished=structuredClone(s.roof);finished.finish={color:'#6a5c4a'};assert.deepEqual(P.evidenceIssues(finished,s.inventory),[]);assert.deepEqual(P.historyIssues(finished,s.roof),[]);assert.deepEqual(P.historyIssues(JSON.parse(JSON.stringify(finished)),s.roof),[]);
 const lost=structuredClone(finished);delete lost.roofPlanEvidence;assert.ok(P.historyIssues(lost,s.roof).includes('ROOF_PLAN_EVIDENCE_LOST'));
 const frame=structuredClone(s.roof);frame.roofPlanEvidence.observations[0].sourceFrame.rasterSize[0]++;assert.ok(P.evidenceIssues(frame,s.inventory).includes('ROOF_PLAN_SOURCE'));
 const grid=structuredClone(s.roof);grid.roofPlanEvidence.observations[0].gridRegistration.transform.offsetX+=20;assert.ok(P.evidenceIssues(grid,s.inventory).includes('ROOF_PLAN_GRID'));
 const foreign=structuredClone(s.roof);foreign.roofPlanEvidence.observations[0].elevationRegions[0].sourceViewId='foreign-elevation';assert.ok(P.evidenceIssues(foreign,s.inventory).includes('ROOF_PLAN_ELEVATION_SOURCE'));
 const geometry=structuredClone(s.roof);geometry.extensions[0].profiles.x[0][1]+=.2;assert.ok(P.geometryIssues(geometry).includes('ROOF_PLAN_EVIDENCE_STALE'));
 const forged=structuredClone(s.roof),e=forged.extensions[0],a=forged.roofPlanEvidence.observations[0].association;for(const axis of ['x','y'])for(const p of e.profiles[axis])p[1]+=.2;e.connection.join.height+=.2;a.profiles=structuredClone(e.profiles);a.join=structuredClone(e.connection.join);forged.roofPlanEvidence.geometry.extensions[0].profiles=structuredClone(e.profiles);assert.ok(P.evidenceIssues(forged,s.inventory).includes('ROOF_PLAN_PROFILE_SOURCE'),'changing the profiles and cached snapshot together cannot change source Z');
 for(const edit of [o=>o.boundary={},o=>o.elevationRegions={},o=>o.association.sources={}]){const malformed=structuredClone(s.roof);edit(malformed.roofPlanEvidence.observations[0]);assert.ok(P.evidenceIssues(malformed,s.inventory).length,'malformed persisted evidence rejects without throwing');}
}
{
 const s=makeProposedRoofScene(),inventory=structuredClone(s.inventory);moveGridReadingsToRetries(inventory);
 assert.deepEqual(P.evidenceIssues(s.roof,inventory),[],'saved regional labels support the roof without changing original source rows');
 const absent=structuredClone(inventory);absent.levels[0].reconstruction.proposal.localReadingRetries=[];assert.ok(P.evidenceIssues(s.roof,absent).includes('ROOF_PLAN_GRID'));
 for(const edit of [r=>r.retry.sourceFrame.rasterSize[0]++,r=>r.retry.sourceFileId='foreign',r=>r.retry.sourcePage++,r=>r.retry.region[0]=790,r=>r.retry.labelConflict=true,r=>r.retry.attempts.push({token:'9',confidence:99,usable:true})]){
  const invalid=structuredClone(inventory);edit(invalid.levels[0].reconstruction.proposal.localReadingRetries[0]);assert.ok(P.evidenceIssues(s.roof,invalid).includes('ROOF_PLAN_GRID'),'foreign, missing or contradictory regional evidence is rejected');
 }
}
console.log('PASS roof plan: registered neutral hips, four directions, asymmetric compound returns, independent elevation Z and observed parent join, strict source/history checks and separately retained OCR, no rail/colour/flat-fill or overhang regression');
