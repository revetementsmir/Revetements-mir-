'use strict';
const assert=require('node:assert/strict'),P=require('../dist/plan-reconstruction-pipeline.js'),M=require('../dist/plan-level-model.js'),R=require('../dist/plan-reconstruction.js'),A=require('../dist/plan-import-core.js'),Roof=require('../dist/plan-reconstructed-roofs.js'),X=require('../dist/studio-exterior-model.js'),{fixture}=require('./helpers/mir-studio-s2-model.cjs');
const ref=(value,view,box=[40,10,70,20])=>({value,scale:value/100,sourceViewId:'floor',sourceReference:{sourceViewId:view,textBox:box},kind:'estimated-calibrated',confidence:80,anchors:[[0,0],[100,0]]});
const candidates=[ref(7,'side-a'),ref(8,'side-a'),ref(8,'side-b')],before=structuredClone(candidates),resolved=P.resolveReference(candidates);
assert.equal(resolved.reference.value,8,'independent caption resolves a duplicate OCR hypothesis');assert.equal(resolved.alternatives[0].value,7);assert.deepEqual(candidates,before);assert.equal(resolved.confirmationRequired,true);
assert.equal(P.resolveReference([ref(7,'side-a'),ref(8,'side-b')]).status,'conflict','distinct contradictory captions are not a majority vote or an average');
assert.equal(P.resolveReference([ref(8,'side-a'),ref(8.1,'side-b')]).status,'conflict','the raster scale tolerance cannot reconcile different written values on the same physical span');
const otherSpan={...ref(8.1,'side-b'),anchors:[[0,0],[0,101.25]],scale:.08};assert.ok(P.resolveReference([ref(8,'side-a'),otherSpan]).reference,'different physical spans can establish the same scale');
assert.equal(P.resolveReference([ref(7,'side-a'),ref(8,'side-a')]).status,'conflict','an ambiguous OCR glyph alone cannot decide its own reading');assert.equal(P.resolveReference([]).status,'not_found');
assert.equal(P.resolveReference([ref(7,'side-a'),ref(8,'side-a',[80,10,100,20])]).status,'conflict','different captions in the same view are independent evidence');
const uncertain={...ref(8,'side-a'),source:'ocr',confidence:1};
assert.equal(P.resolveReference([uncertain]).status,'low_confidence');assert.equal(P.resolveReference([uncertain]).reference,null,'an unreadable whole-span glyph cannot calibrate a building');
const moderate={...uncertain,confidence:35};assert.equal(P.resolveReference([moderate]).reference,null,'a single uncertain but parseable OCR reading still needs corroboration');
assert.equal(P.resolveReference([moderate,{...moderate}]).reference,null,'duplicate OCR is not a second caption');
assert.ok(P.resolveReference([moderate,{...ref(8,'side-b'),source:'ocr-local-region-retry',confidence:60}]).reference,'independent consistent captions corroborate a moderate reading');
assert.ok(P.resolveReference([{...uncertain,source:'pdf-text'}]).reference,'embedded PDF text does not depend on an OCR confidence field');
assert.equal(P.resolveReference([uncertain,{...uncertain,confidence:94}]).reference.value,8,'a reliable retry of the same source caption can establish its value');
assert.equal(P.resolveReference([{...moderate,kind:'written'},{...ref(8,'side-b'),confidence:94}]).reference.confidence,94,'a weak direct transcription does not outrank a reliable independently transferred measurement');
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
// A short detail cote must reach the same endpoint checks as a large span.
// It is useful for a roof overhang, but cannot calibrate a whole building.
const detail=(endpoints=true,colour=[0,0,0])=>{
 const im={width:500,height:400,data:new Uint8ClampedArray(500*400*4).fill(255)},dot=(x,y)=>im.data.set([...colour,255],(y*im.width+x)*4);
 for(let x=180;x<=217;x++)dot(x,150);
 if(endpoints)for(const x of [180,217]){for(let y=142;y<=163;y++)dot(x,y);for(let d=-3;d<=3;d++)for(let dx=0;dx<=1;dx++)dot(x+d+dx,150-d);}
 return im;
};
const detailLabel={text:'18"',box:[191,136,205,144],confidence:94,source:'ocr'},detailImage=detail(),detailView={id:'detail-floor',frame:{units:'pixels',rasterSize:[500,400]},payload:{drawingReadings:{rows:[detailLabel]}}};
const detailCotes=R.contourDimensions(detailView,detailImage);
assert.equal(detailCotes.length,1,'two visible short ticks establish a detail dimension under 50 pixels');
assert.equal(detailCotes[0].spanPx,37);assert.ok(Math.abs(detailCotes[0].value-.4572)<1e-10);assert.equal(detailCotes[0].sourceViewId,detailView.id);assert.deepEqual(detailCotes[0].sourceFrame,detailView.frame);assert.equal(detailCotes[0].status,'proposed');
assert.equal(A.matchDimensionLines(detailImage,[detailLabel]).length,0,'ordinary scale detection retains its minimum span');
assert.equal(A.resolveScale(detailCotes).feetPerPixel,null,'a tiny detail alone never establishes the building scale');
assert.equal(R.contourDimensions(detailView,detail(false)).length,0,'text near a short unbounded line is insufficient');
assert.equal(R.contourDimensions(detailView,detail(true,[0,190,255])).length,0,'a coloured mark is not a construction dimension line');
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
// Multi-floor imports must preserve calibrated source diagnostics even when
// the floors have no proven shared XY / vertical datum.
{
 const I=require('../dist/plan-view-inventory.js');
 const viewRows=[{page:1,name:'Plan RDC Maison',kind:'floor'},{page:2,name:'Plan étage Maison',kind:'floor'}].map(v=>({...v,sourceWidth:1000,sourceHeight:650,sourceCrop:[0,0,1000,650]}));
 const multiple=I.create(viewRows,{filename:'synthetic-two-floor.pdf',bytes:1600,sha256:'synthetic-multilevel'});
 const makeImage=()=>{const w=1000,h=650,out={width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)},poly=[[220,150],[730,150],[730,520],[600,520],[600,450],[450,450],[450,500],[220,500]];
  poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let n=0;n<=length;n++){const x=Math.round(a[0]+(b[0]-a[0])*n/length),y=Math.round(a[1]+(b[1]-a[1])*n/length);for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)out.data.set([0,0,0,255],((y+dy)*w+x+dx)*4);}});return out;};
 const pixels=makeImage(),sources=Object.fromEntries(multiple.views.map(v=>[v.id,pixels]));
 const original=structuredClone(multiple),result=P.build(multiple,'house',sources);
 assert.deepEqual(multiple,original,'automatic analysis must not mutate the source inventory');
 assert.equal(result.levels.length,2,'each floor retains an independent editable draft, not invented walls');
 assert.equal(result.status,'unresolved');
 for(const row of result.reports){assert.ok(row.issues.includes('LEVEL_ALIGNMENT_REQUIRED'),'missing shared level datum is explicit');assert.ok(row.issues.includes('SCALE_UNKNOWN'),'scale extraction failure is not hidden behind level alignment');}
 for(const floor of result.levels){assert.ok(floor.contourDraft?.points?.length>=4);assert.equal(floor.reconstructionDraft?.referenceResolution?.status,'not_found');assert.equal(floor.contours?.length||0,0);}
 assert.equal(M.scene(multiple,'house').walls.length,0,'unregistered floors cannot become confirmed 3D');
}
const unassignedFloor={views:[{id:'unassigned-floor',kind:'floor',buildingId:'shed',levelId:null}],levels:[]};
assert.deepEqual(P.build(unassignedFloor,'shed',{}).reports[0].issues,['FLOOR_LEVEL_REQUIRED'],'a detected floor without an associated level is not a missing floor drawing');
assert.deepEqual(P.build(unassignedFloor,'house',{}).reports[0].issues,['FLOOR_SOURCE_REQUIRED'],'another building cannot supply its floor');
console.log('PASS automatic pipeline: short dimension marks, independent OCR alternatives, conflicts retained, proposed render distinct from validated measures, existing geometry preserved');
