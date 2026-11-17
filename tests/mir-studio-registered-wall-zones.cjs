'use strict';
const assert=require('node:assert/strict'),E=require('../dist/plan-reconstructed-exterior.js'),M=require('../dist/plan-level-model.js'),R=require('../dist/plan-reconstruction.js'),X=require('../dist/studio-exterior-model.js'),S=require('../dist/studio-surfaces.js'),{fixture}=require('./helpers/mir-studio-s2-model.cjs');
const copy=structuredClone;
function sample(){
 const inventory=fixture(),front=inventory.views.find(v=>v.kind==='elevation'),levels=inventory.levels.filter(l=>l.buildingId==='house'),image={width:1000,height:800,data:new Uint8ClampedArray(1000*800*4).fill(255)};
 front.payload.drawingReadings={rows:[{text:'BRIQUE',source:'pdf-text',confidence:100,box:[750,300,820,312]}]};
 const pixel=(x,y)=>image.data.set([60,60,60,255],(y*image.width+x)*4);
 // Neutral, genuinely staggered courses cross both levels. The source remains
 // one elevation, but each resulting zone must retain its own wall and band.
 for(let row=0;row<=30;row++){const y=100+row*20;for(let x=100;x<=700;x++)pixel(x,y);if(row<30)for(let x=100+(row%2?25:0);x<=700;x+=50)for(let yy=y;yy<=y+20;yy++)pixel(x,yy);}
 const floor0=inventory.views.find(v=>v.buildingId==='house'&&v.kind==='floor'&&v.levelId==='ground'),guides=[
  {levelHint:'ground',datumType:'floor',y:700},{levelHint:'upper',datumType:'floor',y:400},{levelHint:'upper',datumType:'ceiling',y:100}
 ].map(g=>({...g,sourceViewId:front.id,sourceFrame:copy(front.frame),confidence:100,label:'Synthetic '+g.datumType+' '+g.levelHint,box:[750,g.y-12,900,g.y-4]}));
 for(const level of levels){delete level.geometryRevision;level.wallOpenings=[];level.wallFinishes={};const c=level.contours[0];c.status='proposed';c.reference.status='proposed';
  c.height={value:3,kind:'written',status:'proposed',sourceViewId:front.id,label:'Synthetic 3 m height',relationship:'two-visible-level-datums',datumEvidence:{lower:copy(guides[level.sourceLevel==='upper'?1:0]),upper:copy(guides[level.sourceLevel==='upper'?2:1])}};
  c.alignment={...c.alignment,status:'proposed',kind:'source-labelled-grid-registration',sourceViewId:c.sourceViewId,referenceSourceViewId:floor0.id};
  c.base={...c.base,status:'proposed',referenceLevelId:levels[0].id,references:[{sourceViewId:front.id,sourceFrame:copy(front.frame),anchors:[[100,700],[100,400]]}]};
  c.levelRegistration={status:'proposed',sourceLevel:level.sourceLevel,alignment:copy(c.alignment),base:copy(c.base),xy:{status:'proposed',sourceViewId:c.sourceViewId,referenceSourceViewId:floor0.id,scaleUsed:M.scale(c),alignment:copy(c.alignment)},z:{status:'proposed',base:copy(c.base)}};
  level.reconstruction={status:'automatic-proposal',proposal:{buildingId:'house',levelId:level.id,draft:copy(c),views:[{viewId:front.id,direction:'front',envelope:{status:'proposed',box:[100,100,600,600],occlusions:[]},guides:copy(guides)}]}};
 }
 return {inventory,front,levels,images:{[front.id]:image}};
}
function build(f){return E.buildRegisteredWallZones(f.inventory,'house',f.images,f.levels);}
const f=sample(),before=copy(f.inventory),out=build(f);
assert.equal(out.status,'partial-proposal');assert.equal(out.byLevel.length,2);assert.ok(out.byLevel.every(l=>l.wallZones.length>0),'Both actual registered source bands must produce nonempty zones.');
const ids=out.byLevel.flatMap(l=>l.wallZones.map(z=>z.id));assert.equal(new Set(ids).size,ids.length);
for(const result of out.byLevel){
 assert.deepEqual(result.exteriorElements,[]);assert.deepEqual(result.reconstructedRoofs,[]);assert.ok(!result.issues.some(x=>/FOUNDATION|COLUMN|BEAM|ENTRY|BALCONY/.test(x)),'This path never enters assembly generation.');
 const level=f.levels.find(l=>l.id===result.levelId),host={...level,...result},c=level.contours[0],band=R.levelBand(level.reconstruction.proposal.views[0],c,f.inventory);
 assert.deepEqual(X.proposalIssues(host,f.inventory),[]);
 for(const z of result.wallZones){assert.equal(z.levelId,level.id);assert.equal(z.buildingId,'house');assert.equal(z.provenance.levelBand.levelId,level.id);assert.equal(z.provenance.levelBand.contourId,c.contourId);assert.equal(z.thickness.ruleInches,4);assert.equal(z.thickness.status,'proposed');assert.equal(z.thickness.kind,'user-rule');assert.equal(z.thickness.confirmationRequired,true);assert.equal(z.sourceViewId,f.front.id);assert.ok(z.sourceBox[1]>=band.topY&&z.sourceBox[1]+z.sourceBox[3]<=band.bottomY);
  const wall=M.wallsFor(level,f.inventory,{includeProposed:true}).find(w=>w.id===z.wallId),face=S.faceFor(wall,host,[],100);assert.deepEqual(face.zones.find(q=>q.id===z.id).polygon,z.polygon.map(p=>p.map(n=>n*100)));
 }
}
assert.deepEqual(f.inventory,before,'Adding source proposals never mutates input geometry, saved choices, or another building.');assert.deepEqual(build(f),out,'Stable IDs and observations survive repeated analysis.');
for(const change of [g=>{delete g.levels[0].contours[0].levelRegistration;},g=>{g.levels[0].contours[0].alignment.offset[0]+=.5;},g=>{g.levels[0].contours[0].base.value+=.3;},g=>{g.levels[0].contours[0].reference.value+=1;},g=>{g.levels[0].reconstruction.proposal.levelId=g.levels[1].id;},g=>{g.levels[0].contours[0].levelRegistration.xy.referenceSourceViewId=g.inventory.views.find(v=>v.buildingId==='shed').id;}]){
 const bad=sample();change(bad);const result=build(bad).byLevel[0];assert.equal(result.wallZones.length,0);assert.ok(result.issues.includes('EXTERIOR_LEVEL_REGISTRATION_UNRESOLVED'),'Missing or changed XYZ/source/scale identity must remain unresolved.');
}
const noBand=sample();noBand.levels[0].reconstruction.proposal.views[0].guides=noBand.levels[0].reconstruction.proposal.views[0].guides.filter(g=>g.levelHint!=='ground');const noBandResult=build(noBand).byLevel[0];assert.equal(noBandResult.wallZones.length,0);assert.ok(noBandResult.issues.some(i=>/REGISTRATION_UNRESOLVED|LEVEL_BAND_UNRESOLVED/.test(i)));
const draftOnly=sample();draftOnly.levels[0].contourDraft=draftOnly.levels[0].contours[0];draftOnly.levels[0].contours=[];delete draftOnly.levels[0].reconstruction;const draftResult=build(draftOnly).byLevel[0];assert.equal(draftResult.wallZones.length,0);assert.ok(draftResult.issues.includes('EXTERIOR_LEVEL_REGISTRATION_UNRESOLVED'),'A retained draft without registered walls is unresolved, not a preserved material result.');
assert.equal(E.buildRegisteredWallZones(f.inventory,'shed',f.images,f.levels).byLevel.length,0,'Another building cannot borrow the house levels or their material sources.');
const altered=sample();altered.images[altered.front.id].width=999;assert.ok(build(altered).issues.includes('EXTERIOR_SOURCE_FRAME_MISMATCH'));assert.equal(build(altered).byLevel.flatMap(l=>l.wallZones).length,0);
// Known openings are masked before observing masonry, never painted or
// deducted again because the same elevation also contains another storey.
const opened=sample(),wall=M.wallsFor(opened.levels[1],opened.inventory,{includeProposed:true}).find(w=>w.normal[1]<-.99);opened.levels[1].wallOpenings=[{id:'synthetic-opening',wallId:wall.id,type:'window',offset:4,width:2,height:1,sill:1,status:'proposed'}];
const openedResult=build(opened).byLevel[1],face=S.faceFor(wall,{...opened.levels[1],...openedResult},opened.levels[1].wallOpenings,100);assert.equal(S.pickZone(face,500,150),null,'A real opening remains empty in the registered material face.');
const total=r=>r.wallZones.reduce((n,z)=>n+Math.abs(M.signedArea(z.polygon)),0);assert.ok(total(openedResult)<total(out.byLevel[1]));
// A nearer level may overlap the projected band of a taller/recessed wall.
// Its source region belongs to the foreground wall, never both surfaces.
const hidden=sample(),lower=hidden.levels[0],upper=hidden.levels[1],lc=lower.contours[0],uc=upper.contours[0];
lc.height.value=6;lc.height.datumEvidence.upper={...lc.height.datumEvidence.lower,datumType:'ceiling',y:100};lower.reconstruction.proposal.views[0].guides.push(copy(lc.height.datumEvidence.upper));lower.reconstruction.proposal.draft=copy(lc);
uc.alignment.offset[1]=-1;uc.levelRegistration.alignment=copy(uc.alignment);uc.levelRegistration.xy.alignment=copy(uc.alignment);upper.reconstruction.proposal.draft=copy(uc);
const occluded=build(hidden),hiddenZones=occluded.byLevel[0];assert.ok(hiddenZones.issues.includes('EXTERIOR_HIDDEN_BY_NEARER_VOLUME'));assert.ok(hiddenZones.wallZones.length>0);assert.ok(hiddenZones.wallZones.every(z=>z.sourceBox[1]>=400),'The nearer upper wall masks the upper half of the lower wall.');assert.ok(occluded.byLevel[1].wallZones.length>0);
// Source levels keep their own registered XYZ frame; different origins cannot
// be projected together merely because the source directions match.
const foreignFrame=sample(),fc=foreignFrame.levels[1].contours[0];fc.base.referenceLevelId=foreignFrame.levels[1].id;fc.levelRegistration.base=copy(fc.base);fc.levelRegistration.z.base=copy(fc.base);foreignFrame.levels[1].reconstruction.proposal.draft=copy(fc);const frameResult=build(foreignFrame);assert.equal(frameResult.byLevel.flatMap(l=>l.wallZones).length,0);assert.ok(frameResult.issues.includes('EXTERIOR_LEVEL_FRAME_CONFLICT'));
// Existing clients' material choices and geometry are never overwritten.
const saved=sample();for(const detail of out.byLevel){const level=saved.levels.find(l=>l.id===detail.levelId);level.wallZones=copy(detail.wallZones);level.wallZones[0].selection={materialId:'synthetic-client-stone',pattern:'plain',color:'#556677'};}
const savedBefore=copy(saved.inventory),refused=build(saved);assert.equal(refused.byLevel.flatMap(l=>l.wallZones).length,0);assert.ok(refused.issues.includes('EXTERIOR_EXISTING_LEVEL_PRESERVED'));assert.deepEqual(saved.inventory,savedBefore);assert.deepEqual(JSON.parse(JSON.stringify(saved.inventory)),saved.inventory,'Source bands, zone identities and client choices survive a JSON storage roundtrip.');
console.log('PASS registered multi-level masonry: source XY/Z and datum bands, no cross-level paint, all-level occlusion, openings, building isolation, stable IDs and preserved selections; no assembly or thickness extrusion');
module.exports={inventory:before,levels:out.byLevel.map(d=>({...copy(f.levels.find(l=>l.id===d.levelId)),...copy(d)}))};
