'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../dist/plan-level-model.js'),I=require('../dist/plan-view-inventory.js'),S=require('../dist/plan-sheet-detection.js');
const records=[{page:1,name:'Plan RDC Maison',kind:'floor',sourceCrop:[0,0,1000,1000],sourceRotation:0,calibration:{status:'conflict',verified:false}},
 {page:2,name:'Plan étage Maison',kind:'floor',sourceCrop:[0,0,1000,1000]},
 {page:3,name:'Élévation avant Maison',kind:'elevation',direction:'front'},
 {page:4,name:'Plan RDC Cabanon',kind:'floor'}];
const inv=I.create(records,{filename:'synthetic.pdf',bytes:1000,sha256:'synthetic'}),ground=inv.levels.find(l=>l.id==='house:ground'),upper=inv.levels.find(l=>l.id==='house:upper');
const polygon=[[0,0],[12,0],[12,10],[9,10],[9,8],[7,8],[7,10],[4,10],[4,7],[2,7],[2,10],[0,10]];
function draft(level,poly=polygon){const view=inv.views.find(v=>v.levelId===level.sourceLevel&&v.buildingId===level.buildingId),d=M.draftFor(view,level);
 d.points=poly.map(([x,y],i)=>({id:'p'+i,xy:[x*10,-y*10]}));
 d.reference={value:12,anchors:[[0,0],[120,0]],kind:'written',status:'confirmed',sourceViewId:view.id,label:'Synthetic overall width 12m'};
 d.height={value:3,kind:'written',status:'confirmed',sourceViewId:inv.views[2].id,label:'Synthetic wall height 3m'};
 d.base={value:level.sourceLevel==='upper'?3:0,kind:'user-measurement',status:'confirmed'};d.alignment={origin:[0,0],offset:[0,0],rotationDegrees:0,status:'confirmed'};return d;
}
assert.equal(M.scale(M.draftFor(inv.views[0],ground)),null,'contradictory source calibration never becomes a scale');
const original=structuredClone(inv);let built=M.commitContour(inv,ground.id,draft(ground));
assert.deepEqual(inv,original,'geometry edits are pure and no automatic migration writes');
assert.equal(M.wallsFor(built.levels[0],built).length,12);
const same=structuredClone(built);I.refresh(same);assert.deepEqual(same.levels[0].contours,built.levels[0].contours,'S1 review must retain contours');
built=M.commitContour(built,upper.id,draft(upper,[[0,0],[12,0],[12,7],[0,7]]));
const scene=M.scene(built,'house');assert.equal(scene.walls.length,16);assert.equal(M.scene(built,'shed').walls.length,0);
assert.equal(new Set(scene.walls.map(w=>w.id)).size,16);
assert.equal(scene.walls.filter(w=>w.levelId===ground.id).length,12,'multiple retreats are independent walls');
const modified=draft(ground);modified.points[4].xy[0]-=1;
const updated=M.commitContour(built,ground.id,modified);
assert.deepEqual(M.wallsFor(updated.levels[0],updated).map(w=>w.id),M.wallsFor(built.levels[0],built).map(w=>w.id),'coordinate edits preserve vertex/edge identities');
for(const points of [[[0,0],[2,2],[0,2],[2,0]],[[0,0],[0,0],[3,2]],[[0,0],[1,0],[2,0]]])assert.ok(M.validatePolygon(points).length);
for(const field of ['height','reference']){const bad=draft(ground),before=structuredClone(built);bad[field].value=null;assert.throws(()=>M.commitContour(built,ground.id,bad));assert.deepEqual(built,before);}
const conflict=draft(ground),id=M.wallId(conflict.contourId,'p0','p1');conflict.edgeMeasures[id]={value:14,kind:'written',status:'proposed'};
assert.ok(M.validateDraft(conflict,built,ground,{confirm:true}).includes('DIMENSION_CONFLICT'));
const wrong=draft(ground);wrong.height.sourceViewId=inv.views[3].id;assert.throws(()=>M.commitContour(built,ground.id,wrong),/SOURCE_BUILDING/);
const orphan=I.create([records[1]],{filename:'upper-only',bytes:10});assert.equal(orphan.levels.length,1);assert.equal(orphan.levels[0].sourceLevel,'upper');assert.equal(M.scene(orphan,'house').walls.length,0);
const wall=scene.walls[0],level=built.levels.find(l=>l.id===ground.id);
level.wallOpenings=[{id:'o1',sourceId:'source-opening',wallId:wall.id,offset:1,width:2,height:1,sill:1,status:'confirmed'},
 {id:'o2',sourceId:'another-opening',wallId:wall.id,offset:2,width:2,height:1,sill:1,status:'confirmed'}];
level.openingsReviewed=true;
let quantities=M.quantities(built,'house'),row=quantities.rows.find(r=>r.wallId===wall.id);assert.equal(row.openingM2,3,'opening overlap union deducted once');assert.equal(row.netM2,33);
level.wallOpenings[1].sourceId='source-opening';assert.ok(M.quantities(built,'house').issues.includes('OPENING_DUPLICATE'));
level.wallOpenings[1].sourceId='another-opening';level.wallOpenings[1].width=40;assert.ok(M.quantities(built,'house').issues.includes('OPENING_BOUNDS'));assert.equal(M.quantities(built,'house').rows[0].netM2,null);
level.wallOpenings=[];level.wallFinishes={[wall.id]:{materialId:'synthetic-siding',color:'#889977'}};
assert.equal(M.scene(built,'house').walls[0].finish.materialId,'synthetic-siding');assert.equal(M.quantities(built,'house').partial,true,'unreviewed upper openings keep totals partial');
const image={width:120,height:120,data:new Uint8ClampedArray(120*120*4).fill(255)};
function line(x,y,r,g,b){const k=(y*120+x)*4;image.data.set([r,g,b,255],k);}
for(let x=20;x<=100;x++)for(const y of [20,100])line(x,y,0,0,0);for(let y=20;y<=100;y++)for(const x of [20,100])line(x,y,0,0,0);
assert.ok(M.proposeRaster(image,[10,10,100,100]));
for(let i=0;i<image.data.length;i+=4)if(image.data[i]===0)image.data.set([0,150,0,255],i);
assert.equal(M.proposeRaster(image,[10,10,100,100]),null,'coloured mask is never a wall boundary');
const measured={id:'measured-view',frame:{pdfToRaster:[2,0,0,-2,0,100],cropToRaster:[1,0,0,1,0,0]},calibration:{evidence:[
 {referenceFt:10/.3048,anchors:[[0,0],[100,0]],ocrConfidence:95},
 {referenceFt:5/.3048,anchors:[[0,10],[50,10]],ocrConfidence:90},
 {referenceFt:8/.3048,anchors:[[10,0],[10,80]],ocrConfidence:95}]}};
let estimate=M.estimateSegment(measured,[[20,20],[50,60]]);
assert.equal(estimate.value,5);assert.equal(estimate.status,'proposed');assert.equal(estimate.kind,'estimated-calibrated');assert.equal(estimate.confirmationRequired,true);
assert.equal(estimate.references.length,3);assert.deepEqual(estimate.anchors,[[20,20],[50,60]]);assert.equal(estimate.scaleUsed,.1);assert.deepEqual(estimate.pdfAnchors,[[10,40],[25,20]]);
const distorted=structuredClone(measured);distorted.calibration.evidence[2].referenceFt=10/.3048;
estimate=M.estimateSegment(distorted,[[20,20],[50,60]]);assert.equal(estimate.value,null);assert.equal(estimate.assessment.deformed,true);
const contradictory=structuredClone(measured);contradictory.calibration.evidence[1].referenceFt=7/.3048;
assert.equal(M.estimateSegment(contradictory,[[20,20],[50,60]]).assessment.conflict,true);
assert.equal(M.referenceAssessment({id:'new-view',calibration:{}},[{sourceViewId:'other-view',value:10,anchors:[[0,0],[100,0]]}]).scale,null,'never transplant pixel scales between views');
const allSources=structuredClone(inv);allSources.views[2].evidence=[{field:'wallHeight',value:3,text:'Wall height 3m'},{field:'width',value:12,text:'Overall width 12m'}];allSources.views[3].evidence=[{field:'depth',value:5}];
assert.equal(M.dimensionCandidates(allSources,ground,'wallHeight').length,0,'unlinked elevation is not implicitly one floor height');
assert.equal(M.dimensionCandidates(allSources,ground,'wallHeight',[{sourceViewId:allSources.views[2].id,status:'confirmed'}]).length,1,'look up explicitly compatible elevation before declaring height missing');
assert.equal(M.dimensionCandidates(allSources,ground,'depth',[{sourceViewId:allSources.views[2].id,status:'confirmed'}]).length,0,'front width never invents depth; shed dimensions stay separate');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/plan-3d.js'),'utf8'),sandbox);
const mesh=sandbox.window.MIR3D.mesh({levelScene:M.scene(built,'house')});
assert.deepEqual(Array.from(mesh.faces.filter(f=>f.type==='wall'),f=>f.id),M.scene(built,'house').walls.map(w=>w.id),'same wall IDs in source model and renderer');
assert.equal(mesh.footprint.type,'level-contours');assert.equal(mesh.dimensions.width,12,'never fall back to study width');
assert.ok(mesh.faces.every(f=>f.type==='wall'),'no unknown roof is invented');


const writtenConflict=M.referenceAssessment({id:'synthetic-view',calibration:{}},[{sourceViewId:'synthetic-view',kind:'written',value:12,anchors:[[0,0],[1200,0]]},{sourceViewId:'synthetic-view',kind:'written',value:12.1,anchors:[[1200,0],[0,0]]}]);assert.equal(writtenConflict.conflict,true,'two written values for the same span remain contradictory even below raster-deformation tolerance');assert.equal(writtenConflict.scale,null);

console.log('PASS S2: multi-retreat independent levels, source ownership, unknown/conflicting measurements, stable wall IDs, opening union, persistence contracts and source-only raster proposals');
