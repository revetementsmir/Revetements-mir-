'use strict';
const assert=require('node:assert/strict');
const R=require('../dist/plan-reconstruction.js');

// Public synthetic drafting: no native canvas, original plans, source IDs,
// written measurements from a client file, or document-specific coordinates.
const black=[0,0,0,255],white=[255,255,255,255];
function line(image,a,b,colour=black){
 const n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
 for(let i=0;i<=n;i++){
  const x=Math.round(a[0]+(b[0]-a[0])*i/(n||1)),y=Math.round(a[1]+(b[1]-a[1])*i/(n||1));
  if(x>=0&&x<image.width&&y>=0&&y<image.height)image.data.set(colour,(y*image.width+x)*4);
 }
}
function erase(image,x,y,width,height){for(let py=y;py<y+height;py++)for(let px=x;px<x+width;px++)image.data.set(white,(py*image.width+px)*4);}
function fixture(){
 const image={width:1000,height:800,data:new Uint8ClampedArray(1000*800*4).fill(255)};
 const frame={units:'pixels',rasterSize:[1000,800],pdfToRaster:[1,0,0,1,0,0],cropToRaster:[1,0,0,1,0,0]};
 const view={id:'synthetic-floor',kind:'floor',frame,payload:{sourceWidth:1000,sourceHeight:800}};
 const outline={points:[[240,260],[740,260],[740,660],[240,660]],sourceBounds:[240,260,500,400],sourceViewId:view.id,sourceFrame:structuredClone(frame)};
 for(let i=0;i<outline.points.length;i++)line(image,outline.points[i],outline.points[(i+1)%outline.points.length]);
 return {image,view,outline};
}
function dimension(s,{anchors,value,box,witnesses=true,colour=black,source='ocr',confidence=92,label}={}){
 const horizontal=Math.abs(anchors[0][1]-anchors[1][1])<=2;
 const d={text:label||`${value*1000} mm`,label:label||`${value*1000} mm`,value,referenceFt:value/.3048,anchors:structuredClone(anchors),textBox:box|| (horizontal?[450,160,510,175]:[140,440,155,490]),kind:'written',status:'proposed',source,confidence,sourceViewId:s.view.id,sourceFrame:structuredClone(s.view.frame),scale:value/Math.hypot(anchors[1][0]-anchors[0][0],anchors[1][1]-anchors[0][1]),confirmationRequired:true};
 line(s.image,anchors[0],anchors[1]);
 for(const anchor of anchors){
  // Actual endpoint ticks and their continuation to the observed wall.
  line(s.image,[anchor[0]-3,anchor[1]+3],[anchor[0]+3,anchor[1]-3]);
  if(witnesses)line(s.image,anchor,horizontal?[anchor[0],260]:[240,anchor[1]],colour);
 }
 return d;
}
const associated=(s,d)=>R.floorDimensionAssociation(s.view,d,s.outline,s.image);
const overall=(s,dimensions)=>R.overallScaleReferences(s.view,dimensions,s.outline,s.image);
const partial=(s,dimensions)=>R.partialScaleReferences(s.view,dimensions,s.outline.sourceBounds,{outline:s.outline,image:s.image});
function assertSourceKept(actual,original){
 for(const key of ['anchors','textBox','sourceFrame','sourceViewId','text','label','value','referenceFt','confidence','source','scale'])assert.deepEqual(actual[key],original[key],`${key} must remain the original source observation`);
 assert.equal(actual.confirmationRequired,true);
}

// Both orientations work beyond the old 35-pixel near-contour allowance.
for(const [axis,inset]of [['horizontal',0],['vertical',0],['horizontal',2],['vertical',2]]){
 const s=fixture(),anchors=axis==='horizontal'?[[240+inset,180],[740-inset,180]]:[[160,260+inset],[160,660-inset]];
 const d=dimension(s,{anchors,value:(axis==='horizontal'?500-2*inset:400-2*inset)*.01}),before=structuredClone(d),pixels=s.image.data.slice(),outline=structuredClone(s.outline);
 const result=overall(s,[d]);assert.equal(result.length,1,`${axis}, endpoint uncertainty ${inset}px`);
 assert.equal(result[0].association,'observed-overall-floor-dimension');assertSourceKept(result[0],d);
 const evidence=result[0].sourceAssociation;assert.equal(evidence.method,'observed-dimension-witnesses-to-floor');assert.equal(evidence.connections.length,2);
 assert.deepEqual(evidence.connections.map(c=>c.anchors[0]),d.anchors);
 assert.ok(evidence.connections.every(c=>c.lengthPixels===80&&c.support>=.82));
 assert.deepEqual(d,before,'association does not rewrite a transcription');assert.deepEqual(s.outline,outline,'association does not adjust contour vertices');assert.deepEqual(s.image.data,pixels,'association never paints missing source strokes');
}
const reversed=fixture(),reversedDimension=dimension(reversed,{anchors:[[740,180],[240,180]],value:5});
assert.deepEqual(overall(reversed,[reversedDimension])[0].anchors,reversedDimension.anchors,'source endpoint order is retained');
const vector=fixture(),vectorDimension=dimension(vector,{anchors:[[240,180],[740,180]],value:5,source:'pdf-text',confidence:10});
assert.equal(overall(vector,[vectorDimension]).length,1,'an actual PDF text inscription does not need an OCR confidence');

function partialPair(options={}){
 const s=fixture();
 const a=dimension(s,{anchors:[[300,180],[500,180]],value:2,box:[360,160,420,175],...options});
 const b=dimension(s,{anchors:[[160,380],[160,530]],value:1.5,box:[140,425,155,485],...options});
 return {...s,a,b};
}
const linked=partialPair(),linkedBefore=structuredClone([linked.a,linked.b]),scaled=partial(linked,[linked.a,linked.b]);
assert.equal(scaled.references.length,2,'two independently captioned margin dimensions can corroborate one scale');
assert.equal(scaled.conflict,false);assert.ok(Math.abs(scaled.assessment.scale-.01)<1e-12);
for(let i=0;i<2;i++){assertSourceKept(scaled.references[i],linkedBefore[i]);assert.equal(scaled.references[i].sourceAssociation.connections.length,2);}
assert.deepEqual([linked.a,linked.b],linkedBefore);
assert.equal(partial(linked,[linked.a]).references.length,0,'one partial dimension cannot replace the overall span');
assert.equal(partial(linked,[linked.a,structuredClone(linked.a)]).references.length,0,'duplicate OCR is not a second independent caption');
const conflict=partialPair();conflict.b.value=2.4;conflict.b.referenceFt=2.4/.3048;conflict.b.scale=.016;conflict.b.text=conflict.b.label='2400 mm';
const conflicted=partial(conflict,[conflict.a,conflict.b]);assert.equal(conflicted.references.length,2);assert.equal(conflicted.conflict,true,'genuine disagreement between associated inscriptions is retained');

for(const [name,options]of [['missing witnesses',{witnesses:false}],['saturated annotation witnesses',{colour:[0,180,255,255]}]]){
 const s=fixture(),d=dimension(s,{anchors:[[240,180],[740,180]],value:5,...options});
 assert.equal(associated(s,d),null,name);assert.equal(overall(s,[d]).length,0,name);
 const pair=partialPair(options);assert.equal(partial(pair,[pair.a,pair.b]).references.length,0,`${name}: partial margin evidence also refused`);
}
const interrupted=fixture(),interruptedDimension=dimension(interrupted,{anchors:[[240,180],[740,180]],value:5});
erase(interrupted.image,237,211,7,15);
assert.equal(associated(interrupted,interruptedDimension),null,'one interrupted witness cannot be completed from the expected wall position');
assert.equal(overall(interrupted,[interruptedDimension]).length,0);
const shortWitness=fixture(),shortDimension=dimension(shortWitness,{anchors:[[240,180],[740,180]],value:5,witnesses:false});
for(const x of [240,740])line(shortWitness.image,[x,180],[x,225]);
assert.equal(associated(shortWitness,shortDimension),null,'witnesses stopping before the wall do not establish contact');

const detail=fixture(),detailDimension=dimension(detail,{anchors:[[240,160],[740,160]],value:5,witnesses:false});
for(const [a,b]of [[[240,175],[740,175]],[[740,175],[740,225]],[[740,225],[240,225]],[[240,225],[240,175]],[[240,160],[240,175]],[[740,160],[740,175]]])line(detail.image,a,b);
assert.equal(associated(detail,detailDimension),null,'a nearby detail of the same width has no witness to the building outline');
assert.equal(overall(detail,[detailDimension]).length,0);
const remote=fixture(),remoteDimension=dimension(remote,{anchors:[[240,80],[740,80]],value:5});
assert.equal(associated(remote,remoteDimension),null,'a remote detail is not associated merely by extending a search distance');

for(const axis of ['horizontal','vertical']){
 const s=fixture(),anchors=axis==='horizontal'?[[246,180],[734,180]]:[[160,266],[160,654]],d=dimension(s,{anchors,value:(axis==='horizontal'?488:388)*.01});
 assert.ok(associated(s,d),'the partial inscription still has real witnesses');
 assert.equal(overall(s,[d]).length,0,`${axis}: endpoints 6px inside the actual extremes are not an overall dimension`);
}
const shifted=fixture(),shiftedDimension=dimension(shifted,{anchors:[[260,180],[760,180]],value:5});
assert.equal(overall(shifted,[shiftedDimension]).length,0,'equal span alone does not prove the same endpoints');
for(const confidence of [0,69]){
 const s=fixture(),d=dimension(s,{anchors:[[240,180],[740,180]],value:5,confidence});assert.equal(overall(s,[d]).length,0,'weak OCR cannot supply an overall calibration');
 const pair=partialPair();pair.b.confidence=confidence;assert.equal(partial(pair,[pair.a,pair.b]).references.length,0,'weak OCR cannot corroborate a partial calibration');
}

const foreign=fixture(),foreignDimension=dimension(foreign,{anchors:[[240,180],[740,180]],value:5});foreignDimension.sourceViewId='another-floor';
assert.equal(associated(foreign,foreignDimension),null);assert.equal(overall(foreign,[foreignDimension]).length,0,'another source view cannot calibrate this floor');
const foreignPair=partialPair();foreignPair.b.sourceViewId='another-floor';assert.equal(partial(foreignPair,[foreignPair.a,foreignPair.b]).references.length,0);
const wrongFrame=fixture(),wrongFrameDimension=dimension(wrongFrame,{anchors:[[240,180],[740,180]],value:5});wrongFrameDimension.sourceFrame.cropToRaster[4]=10;
assert.equal(associated(wrongFrame,wrongFrameDimension),null,'a different crop transform is not the same source frame');
assert.equal(overall(wrongFrame,[wrongFrameDimension]).length,0);
const foreignOutline=fixture(),outlineDimension=dimension(foreignOutline,{anchors:[[240,180],[740,180]],value:5});foreignOutline.outline.sourceViewId='another-floor';
assert.equal(associated(foreignOutline,outlineDimension),null,'a foreign contour cannot be relabelled as this floor');
const wrongBounds=fixture(),boundsDimension=dimension(wrongBounds,{anchors:[[240,180],[740,180]],value:5});wrongBounds.outline.sourceBounds[2]+=10;
assert.equal(associated(wrongBounds,boundsDimension),null,'declared bounds must agree with the actual contour vertices');

for(const anchors of [[[300,180],[300,180]],[[300,180],[301,181]],[[NaN,180],[740,180]],[[240,180],[Infinity,180]]]){
 const s=fixture(),d={...foreignDimension,sourceViewId:s.view.id,sourceFrame:s.view.frame,anchors};
 assert.equal(associated(s,d),null,'degenerate or nonfinite endpoints cannot establish source association');
 assert.equal(overall(s,[d]).length,0,'degenerate or nonfinite endpoints cannot supply a calibration');
}
console.log('PASS source scale: horizontal/vertical overall spans, bounded endpoint uncertainty, observed partial margin witnesses and unchanged source transcription; missing/coloured/interrupted/foreign/detail/weak/degenerate evidence and merely similar overall spans refused.');
