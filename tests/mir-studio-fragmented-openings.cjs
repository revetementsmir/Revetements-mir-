'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),V=require('../dist/plan-reconstruction-vision.js'),R=require('../dist/plan-reconstruction.js'),M=require('../dist/plan-level-model.js');
const wallBox=[100,100,500,400],panel=[260,280,200,216],orange=[215,145,75],black=[0,0,0],grey=[150,150,150],white=[255,255,255];
function image(){return {width:800,height:600,data:new Uint8ClampedArray(800*600*4).fill(255)};}
function rect(im,x,y,width,height,colour){for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++)if(xx>=0&&yy>=0&&xx<im.width&&yy<im.height)im.data.set([...colour,255],(yy*im.width+xx)*4);}
function fixture({gap=7,colour=orange,missing=null,frameColour=black,offset=0,cut='top'}={}){
 const im=image(),[x,y,w,h]=panel;
 rect(im,x-2,y-2,w+4,h+4,frameColour);rect(im,x,y,w,h,grey);
 if(gap){const yy=cut==='top'?y+20:y+h-20-gap;rect(im,x,yy,w,gap,colour);}
 if(offset){rect(im,x,y,offset,20,white);}
 if(missing==='top')rect(im,x-3,y-6,w+6,6,white);
 if(missing==='bottom')rect(im,x-3,y+h,w+6,7,white);
 if(missing==='left')rect(im,x-7,y-3,7,h+6,white);
 if(missing==='right')rect(im,x+w,y-3,7,h+6,white);
 return im;
}
function fragmented(im,box=wallBox){return V.grayDoorFrames(im,box).filter(c=>c.fragmentEvidence);}
function hash(im){return crypto.createHash('sha256').update(im.data).digest('hex');}
const positive=fixture(),before=hash(positive),candidates=V.grayDoorFrames(positive,wallBox);
assert.equal(candidates.length,1,'a coloured interruption inside a closed door has one proposal');
const candidate=candidates[0],proof=candidate.fragmentEvidence;
assert.deepEqual(candidate.panelBox,panel,'the union is bounded by observed neutral components');
assert.equal(candidate.type,'door');assert.equal(candidate.status,'proposed');assert.equal(candidate.confirmationRequired,true);
assert.equal(candidate.method,'closed-frame-and-fragmented-neutral-door-panels');
assert.equal(proof.coordinateSystem,'source-raster-pixels');assert.deepEqual(proof.rasterSize,[800,600]);assert.deepEqual(proof.searchBox,wallBox);
assert.equal(proof.parts.length,2);assert.deepEqual(proof.parts.map(p=>p.box),[[260,280,200,20],[260,307,200,189]]);
assert.equal(proof.gaps.length,1);assert.equal(proof.gaps[0].pixels,7);assert.equal(proof.gaps[0].colouredFraction,1);
assert.ok(proof.gaps[0].use.includes('never a boundary'));
for(const [name,edge]of Object.entries(proof.edges)){
 assert.ok(edge.support>=.8,name+' has an independently supported dark line');assert.ok(edge.contrast>25);
 assert.ok(edge.maxGap<=8);assert.ok(edge.maxUnexplainedGap<=3,'a percentage of supported pixels cannot hide a missing frame interval');
 assert.equal(edge.anchors.length,2);assert.ok(edge.anchors.every(p=>p.every(Number.isFinite)&&p[0]>=0&&p[1]>=0&&p[0]<positive.width&&p[1]<positive.height));
 for(const [x,y]of edge.anchors){const pixel=positive.data.subarray((y*positive.width+x)*4,(y*positive.width+x)*4+3);assert.ok(Math.max(...pixel)-Math.min(...pixel)<45,'frame anchors are not the coloured interruption');}
}
assert.ok(proof.corners.every(Boolean));assert.deepEqual(JSON.parse(JSON.stringify(candidate)),candidate,'the evidence can be saved without raster buffers or functions');
assert.equal(hash(positive),before,'detection never paints or rewrites source pixels');
assert.equal(fragmented(fixture({cut:'bottom'})).length,1,'a small strip below the interruption is supported symmetrically');
assert.equal(fragmented(fixture({gap:5,colour:[60,190,205]})).length,1,'the rule is not tied to one annotation colour');
const crossed=fixture();rect(crossed,258,300,204,7,orange);assert.equal(fragmented(crossed).length,1,'a short observed annotation may cross the actual jambs without supplying their position');

const historical={box:[257,277,206,222],panelBox:panel,framePaddingPx:3,type:'door',method:'closed-frame-and-neutral-door-panels',status:'proposed',confirmationRequired:true};
assert.deepEqual(V.grayDoorFrames(fixture({gap:0}),wallBox),[historical],'an already valid historical door keeps exactly its prior record');
assert.deepEqual(V.grayDoorFrames(fixture({gap:0}),wallBox,{type:'window'}),[{...historical,type:'window',method:'closed-frame-and-neutral-glazing'}],'the existing window path remains unchanged');
assert.equal(fragmented(fixture({gap:3})).length,0,'an interruption already closed by the historical detector is not expanded or duplicated');

for(const missing of ['left','right','top','bottom'])assert.equal(fragmented(fixture({missing})).length,0,'missing '+missing+' source edge is never invented');
assert.equal(fragmented(fixture({frameColour:[225,0,180]})).length,0,'a coloured outline cannot supply the four source frame edges');
assert.equal(fragmented(fixture({offset:8})).length,0,'shifted parts cannot be stretched into one doorway');
assert.equal(fragmented(fixture({gap:15})).length,0,'a large gap is not closed');
assert.equal(fragmented(fixture({colour:white})).length,0,'an unexplained blank gap is not treated as an annotation interruption');
for(const missingHeight of [8,32]){const broken=fixture();rect(broken,254,360,6,missingHeight,white);assert.equal(fragmented(broken).length,0,'an unexplained '+missingHeight+' px hole cannot pass as a closed side even when its overall support exceeds 80 percent');}
const separateFrames=fixture();rect(separateFrames,258,300,204,2,black);rect(separateFrames,258,302,204,3,white);rect(separateFrames,258,305,204,2,black);
assert.equal(fragmented(separateFrames).length,0,'two independently closed frames are not combined');
rect(separateFrames,320,300,140,7,orange);assert.equal(fragmented(separateFrames).length,0,'a partly masked double frame with a visible white separator remains ambiguous');
assert.equal(fragmented(fixture(),[100,100,500,500]).length,0,'a mid-wall annotation panel is not inferred to reach the floor');
const table=image();for(let row=0;row<5;row++){rect(table,258,278+row*42,204,40,black);rect(table,260,280+row*42,200,36,grey);}
assert.equal(fragmented(table).length,0,'several small framed table cells are not joined into a door');

// Exercise the real producer with a source plane, registration and annotation
// mask. Recognition of pixels never changes source/building ownership.
const sourceFrame={rasterSize:[800,600],pdfToRaster:[1,0,0,-1,0,600],cropToRaster:[1,0,0,1,0,0],units:'pixels'},view={id:'synthetic-front',kind:'elevation',direction:'front',buildingId:'synthetic-building',frame:sourceFrame,payload:{drawingReadings:{rows:[]}}},inventory={views:[view]},proposal={views:[{viewId:view.id,direction:'front',envelope:{status:'proposed',box:wallBox,occlusions:[]}}]},plane={id:'wall:synthetic-level:front',sourceViewId:view.id,sourceBox:wallBox,from:[0,0],to:[5,0],normal:[0,-1,0],height:4,base:0,status:'proposed',registration:{},measurements:{width:{value:5,scaleUsed:.01},height:{value:4,scaleUsed:.01}}},level={id:'synthetic-level',buildingId:'synthetic-building',status:'proposed',observedPlanes:[plane]};
const openings=R.observedOpenings(level,proposal,inventory,{[view.id]:positive});
assert.equal(openings.length,1,'the source-backed union reaches observedOpenings');assert.equal(openings[0].type,'door');assert.equal(openings[0].wallId,plane.id);assert.deepEqual(openings[0].sourceBox,panel);
assert.deepEqual(M.openingIssues(openings,[{id:plane.id,length:5,height:4}]),[],'the proposal fits its observed source wall');
assert.equal(openings[0].kind,'estimated-calibrated');assert.equal(openings[0].status,'proposed');
assert.deepEqual(openings[0].fragmentEvidence,{...proof,sourceViewId:view.id,sourceFrame},'the producer retains the pixel proof and attaches its source view and frame');
assert.notEqual(openings[0].fragmentEvidence.sourceFrame,sourceFrame,'the proof does not alias the inventory frame');
assert.notEqual(openings[0].fragmentEvidence.sourceFrame,openings[0].sourceFrame,'opening and proof frames are independent copies');
const sideView={...view,id:'synthetic-right',direction:'right'},registeredPlane={...plane,registration:{kind:'multi-view-elevation-registration',status:'proposed',sourceViewIds:[view.id,sideView.id]},measurements:{width:{value:5,kind:'estimated-calibrated',status:'proposed',sourceViewId:view.id,anchors:[[100,100],[600,100]],scaleUsed:.01},height:{value:4,kind:'estimated-calibrated',status:'proposed',sourceViewId:view.id,anchors:[[100,100],[100,500]],scaleUsed:.01}}},sceneInventory={views:[view,sideView],levels:[{...level,observedPlanes:[registeredPlane],wallOpenings:openings}]};
assert.deepEqual(M.observedPlaneIssues(registeredPlane,sceneInventory,sceneInventory.levels[0],{confirm:false}),[]);
const scene=M.scene(sceneInventory,level.buildingId,{includeProposed:true}),reopened=M.scene(M.clone(sceneInventory),level.buildingId,{includeProposed:true});
assert.equal(scene.openings.length,1,'the source-backed opening reaches the proposed 3D scene');
assert.deepEqual(reopened.openings[0].fragmentEvidence,openings[0].fragmentEvidence,'JSON save and reopen preserve the complete pixel proof and frame');
reopened.openings[0].fragmentEvidence.parts[0].box[0]+=1;
assert.deepEqual(openings[0].fragmentEvidence.parts,proof.parts,'editing the reopened proof cannot mutate the original proposal');
assert.equal(R.observedOpenings(level,proposal,{views:[{...view,buildingId:'another-building'}]},{[view.id]:positive}).length,0,'a different building cannot donate an opening');
assert.equal(R.observedOpenings({...level,observedPlanes:[{...plane,sourceBox:[100,100,150,400]}]},proposal,inventory,{[view.id]:positive}).length,0,'a parent that does not cover the frame cannot acquire it');

const annotated=fixture();rect(annotated,218,248,264,2,black);rect(annotated,218,530,264,2,black);rect(annotated,218,248,2,284,black);rect(annotated,480,248,2,284,black);
const masks=V.legendBoxes(annotated,[{text:'LÉGENDE',box:[270,260,350,272]}]);assert.ok(masks.length,'the enclosing annotation is independently recognised');
assert.equal(fragmented(annotated).length,1,'the local pixel candidate alone cannot distinguish a framed annotation');
assert.equal(R.observedOpenings(level,{views:[{...proposal.views[0],envelope:{...proposal.views[0].envelope,occlusions:masks}}]},inventory,{[view.id]:annotated}).length,0,'a recognised annotation/table mask rejects the candidate before assigning any wall opening');
assert.deepEqual(level.observedPlanes,[plane]);assert.equal(hash(positive),before,'integration also leaves source pixels unchanged');
console.log('Fragmented neutral opening frames: PASS (observed frame, provenance, legacy, refusals, ownership and annotation integration).');
