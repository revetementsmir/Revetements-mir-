'use strict';
const assert=require('node:assert/strict'),P=require('../dist/plan-reconstruction-pipeline.js'),M=require('../dist/plan-level-model.js'),R=require('../dist/plan-reconstruction.js'),A=require('../dist/plan-import-core.js'),Roof=require('../dist/plan-reconstructed-roofs.js'),X=require('../dist/studio-exterior-model.js'),{fixture}=require('./helpers/mir-studio-s2-model.cjs');
const ref=(value,view,box=[40,10,70,20])=>({value,scale:value/100,sourceViewId:'floor',sourceReference:{sourceViewId:view,textBox:box},kind:'estimated-calibrated',confidence:80,anchors:[[0,0],[100,0]]});
const candidates=[ref(7,'side-a'),ref(8,'side-a'),ref(8,'side-b')],before=structuredClone(candidates),resolved=P.resolveReference(candidates);
assert.equal(resolved.reference.value,8,'independent caption resolves a duplicate OCR hypothesis');assert.equal(resolved.alternatives[0].value,7);assert.deepEqual(candidates,before);assert.equal(resolved.confirmationRequired,true);
assert.equal(P.resolveReference([ref(7,'side-a'),ref(8,'side-b')]).status,'conflict','distinct contradictory captions are not a majority vote or an average');
assert.equal(P.resolveReference([ref(7,'side-a'),ref(8,'side-a')]).status,'conflict','an ambiguous OCR glyph alone cannot decide its own reading');assert.equal(P.resolveReference([]).status,'not_found');
assert.equal(P.resolveReference([ref(7,'side-a'),ref(8,'side-a',[80,10,100,20])]).status,'conflict','different captions in the same view are independent evidence');
// Small slashes with a short leader above and a long leader below: the old
// long-intersection rule omitted the internal endpoints of a chained cote.
const image={width:800,height:400,data:new Uint8ClampedArray(800*400*4).fill(255)},ink=(x,y)=>image.data.set([0,0,0,255],(y*800+x)*4);
for(let x=100;x<=700;x++)ink(x,100);
for(const x of [100,700])for(let y=85;y<=118;y++)ink(x,y);
for(const x of [250,550]){for(let y=96;y<=118;y++)ink(x,y);for(let d=-3;d<=3;d++){ink(x+d,100-d);ink(x+d+1,100-d);}}
const label=[{text:'14 ft',box:[385,85,415,93],confidence:100}];
assert.equal(A.matchDimensionLines(image,label)[0].spanPx,599,'old association reproduces the erroneous whole span');
const corrected=A.matchDimensionLines(image,label,{shortTicks:true})[0];assert.ok(Math.abs(corrected.spanPx-300)<3,'internal marks delimit the actual written dimension');
assert.equal(A.matchDimensionLines(image,[{...label[0],text:'NOTE: 14 ft'}],{shortTicks:true}).length,0,'a note does not become a construction dimension');
// A preview must not promote geometry or quantities to confirmed facts.
const inv=fixture(),original=structuredClone(inv),level=inv.levels[0],c=level.contours[0];c.status='proposed';c.reference.status='proposed';c.height.status='proposed';c.base.status='proposed';c.alignment.status='proposed';level.reconstruction={status:'automatic-proposal'};
const proposedBefore=structuredClone(inv),walls=M.wallsFor(level,inv,{includeProposed:true});assert.ok(walls.length);assert.equal(M.wallsFor(level,inv).length,0);assert.ok(walls.every(w=>w.previewOnly&&w.dimension.status==='proposed'));assert.deepEqual(inv,proposedBefore);assert.ok(M.quantities(inv,level.buildingId).partial);
const roof={id:'roof',levelId:level.id,buildingId:level.buildingId,status:'proposed',profiles:{x:[[0,3],[2,5],[4,3]],y:[[0,3],[2,5],[4,3]]},sources:['front','right'].map(id=>({sourceViewId:id,sourceFrame:{units:'pixels'},anchors:[[0,0],[100,50]],scaleX:.04,scaleY:.04}))};level.reconstructedRoofs=[roof];assert.equal(Roof.faces(roof).length,0);assert.ok(Roof.faces(roof,[0,0],{includeProposed:true}).length);assert.equal(roof.status,'proposed');assert.ok(X.scene(inv,level.buildingId,{includeProposed:true}).roofs.length);assert.equal(X.scene(inv,level.buildingId).roofs.length,0);
const protectedBefore=structuredClone(original),protectedResult=P.build(original,level.buildingId,{});assert.ok(protectedResult.reports.every(r=>r.status==='preserved'));assert.equal(protectedResult.levels.length,0,'regeneration cannot overwrite a saved contour or finish');assert.deepEqual(original,protectedBefore);
// A window may be visible in elevation although its floor-plan gap was not
// extracted. The source frame is sufficient for an unconfirmed proposal.
const upper=original.levels.find(l=>l.sourceLevel==='upper'),front=original.views.find(v=>v.direction==='front'),frameImage={width:1000,height:800,data:new Uint8ClampedArray(1000*800*4).fill(255)};
const strokeFrame=(colour)=>{for(let x=300;x<=400;x++)for(const y of [380,460])frameImage.data.set([...colour,255],(y*1000+x)*4);for(let y=380;y<=460;y++)for(const x of [300,400])frameImage.data.set([...colour,255],(y*1000+x)*4);};
const missingGap={levelId:upper.id,views:[{viewId:front.id,direction:'front',envelope:{status:'proposed',box:[120,350,600,150],occlusions:[]},supportY:350,guides:[{levelHint:'upper',y:500}]}],sourceOpeningGaps:[],openingSizeCandidates:[]};
strokeFrame([0,0,0]);const recovered=R.openingsFor(missingGap,original,{[front.id]:frameImage},upper.contours[0]);assert.equal(recovered.length,1);assert.equal(recovered[0].sourceViewId,front.id);assert.equal(recovered[0].floorCorrespondence.status,'unresolved');assert.equal(recovered[0].status,'proposed');assert.ok(Math.abs(recovered[0].width-2)<.05);
missingGap.views[0].envelope.occlusions=[[280,360,150,120]];assert.equal(R.openingsFor(missingGap,original,{[front.id]:frameImage},upper.contours[0]).length,0,'a legend mask cannot create an opening');
missingGap.views[0].envelope.occlusions=[];strokeFrame([0,200,0]);assert.equal(R.openingsFor(missingGap,original,{[front.id]:frameImage},upper.contours[0]).length,0,'a coloured annotation is not an aperture');
console.log('PASS automatic pipeline: short dimension marks, independent OCR alternatives, conflicts retained, proposed render distinct from validated measures, existing geometry preserved');
