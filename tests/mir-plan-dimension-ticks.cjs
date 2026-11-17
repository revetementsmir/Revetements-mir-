'use strict';
const assert=require('node:assert/strict'),A=require('../dist/plan-import-core.js'),R=require('../dist/plan-reconstruction.js');
// Synthetic drafting geometry only: a short slash lies beside a much longer
// appliance edge. The annotation belongs to the slash, not the darkest edge.
function fixture({mirror=false,wallWidth=1,slash=true,spur=false,right=true}={}){
 const image={width:500,height:300,data:new Uint8ClampedArray(500*300*4).fill(255)},map=x=>mirror?356-x:x;
 const dot=(x,y)=>image.data.set([0,0,0,255],(y*image.width+map(x))*4);
 for(let x=106;x<=247;x++)dot(x,150);
 for(let x=110-Math.floor(wallWidth/2);x<=110+Math.floor(wallWidth/2);x++)for(let y=40;y<=250;y++)dot(x,y);
 for(const x of right?[116,240]:[116]){
  for(let y=slash?145:136;y<=171;y++)dot(x,y);
  if(slash)for(let d=-4;d<=4;d++)for(let dx=0;dx<=1;dx++)dot(x+d+dx,150-d);
 }
 if(spur)for(let d=0;d<=5;d++)dot(110+d,150-d);
 const label={text:'4 ft',box:[159,134,197,142],source:'pdf-text',confidence:100};
 if(mirror)label.box=[356-label.box[2],label.box[1],356-label.box[0],label.box[3]];
 return {image,label};
}
const match=s=>A.matchDimensionLines(s.image,[s.label],{shortTicks:true,minSpanPx:20}),near=(a,b)=>assert.ok(Math.abs(a-b)<=1,`${a} should lie on the tick at ${b}`);
for(const options of [{},{mirror:true},{wallWidth:7},{spur:true}]){
 const s=fixture(options),before=structuredClone(s),result=match(s);assert.equal(result.length,1,JSON.stringify(options));
 near(result[0].anchors[0][0],116);near(result[0].anchors[1][0],240);near(result[0].spanPx,124);
 assert.deepEqual(s,before,'matching leaves source pixels and inscription intact');
}
const plain=fixture({slash:false}),ordinary=match(plain)[0];assert.ok(ordinary,'ordinary extension-line intersections remain supported');assert.ok(ordinary.anchors[0][0]<=111,'without an observed diagonal no offset marker is manufactured');
const thickPlain=fixture({slash:false,wallWidth:7}),thickResult=match(thickPlain)[0];assert.ok(thickResult);assert.ok(thickResult.anchors[0][0]<=113,'a thick perpendicular crossing is not a diagonal tick');
assert.equal(match(fixture({right:false})).length,0,'one marker cannot establish the written span');
const note=fixture();note.label.text='NOTE: 4 ft';assert.equal(match(note).length,0,'a nearby note remains a note');
const vertical=fixture(),original=vertical.image,turned={width:original.height,height:original.width,data:new Uint8ClampedArray(original.data.length)};
for(let y=0;y<original.height;y++)for(let x=0;x<original.width;x++)turned.data.set(original.data.subarray((y*original.width+x)*4,(y*original.width+x)*4+4),(x*turned.width+original.height-1-y)*4);
const b=vertical.label.box,view={id:'synthetic-vertical-dimension',frame:{units:'pixels',rasterSize:[turned.width,turned.height]},payload:{drawingReadings:{rows:[],verticalRows:[{...vertical.label,box:[original.height-b[3],b[0],original.height-b[1],b[2]]}]}}};
const rotated=R.contourDimensions(view,turned);assert.equal(rotated.length,1);near(Math.abs(rotated[0].anchors[1][1]-rotated[0].anchors[0][1]),124);assert.equal(rotated[0].sourceViewId,view.id);assert.deepEqual(rotated[0].sourceFrame,view.frame);
console.log('PASS dimension ticks: bilateral diagonal marks outrank adjacent long walls, mirrored/vertical sources agree, thick crossings and one-sided spurs do not fabricate markers, incomplete spans and notes refused.');
