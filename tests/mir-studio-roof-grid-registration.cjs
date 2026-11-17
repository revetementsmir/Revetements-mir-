'use strict';
// Synthetic source pixels only: roof plans retain their real kind throughout.
const assert=require('node:assert/strict'),Grid=require('../dist/plan-grid-registration.js');
function drawing({id='floor-source',kind='floor',levelId='level-3',buildingId='synthetic-house',sx=1,sy=1,tx=0,ty=0,omit=[]}={}){
 const width=800,height=600,data=new Uint8ClampedArray(width*height*4).fill(255),rows=[];
 const put=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<width&&y<height)data.set([0,0,0,255],(y*width+x)*4);};
 for(const [label,x,y]of [...['1','2','3','4'].map((label,i)=>[label,140+i*160,60]),['A',80,220],['B',80,460]]){
  if(omit.includes(label))continue;const point=[(x-tx)/sx,(y-ty)/sy],radius=17;
  for(let n=0;n<360;n++)for(const delta of [-1,0,1]){const angle=n*Math.PI/180;put(point[0]+Math.cos(angle)*(radius+delta),point[1]+Math.sin(angle)*(radius+delta));}
  rows.push({text:label,box:[point[0]-5,point[1]-5,point[0]+5,point[1]+5],confidence:96,source:'synthetic-local-ocr'});
 }
 return {view:{id,kind,levelId,buildingId,fileId:'synthetic-dossier',page:kind==='roof'?4:3,frame:{units:'pixels',rasterSize:[width,height],cropToRaster:[1,0,0,1,0,0]},payload:{sourceWidth:width,sourceHeight:height,drawingReadings:{rows}}},image:{width,height,data}};
}
const floor=drawing(),roof=drawing({id:'roof-source',kind:'roof',levelId:null,sx:1.02,sy:1.015,tx:8,ty:-5}),originalFloor=structuredClone(floor.view),originalRoof=structuredClone(roof.view);
const result=Grid.alignRoofPlan(floor.view,roof.view,floor.image,roof.image);
assert.equal(result.status,'proposed');assert.equal(result.scope,'roof-plan-to-floor-source-pixels');
assert.equal(result.referenceSourceViewId,floor.view.id);assert.equal(result.movingSourceViewId,roof.view.id);
assert.deepEqual(result.referenceSourceFrame,floor.view.frame);assert.deepEqual(result.movingSourceFrame,roof.view.frame);
assert.equal(result.matchedHorizontal,4);assert.equal(result.matchedVertical,2);
assert.ok(Math.abs(result.transform.scaleX-1.02)<1e-8);assert.ok(Math.abs(result.transform.scaleY-1.015)<1e-8);
assert.ok(Math.abs(result.transform.offsetX-8)<1e-8);assert.ok(Math.abs(result.transform.offsetY+5)<1e-8);
assert.equal(result.confirmationRequired,true);assert.equal(result.notAGeometryConfirmation,true);
assert.deepEqual(new Set(result.evidence.map(e=>e.axis)),new Set(['x','y']));
assert.ok(result.evidence.every(e=>e.reference.sourceViewId===floor.view.id&&e.moving.sourceViewId===roof.view.id));
for(const e of result.evidence){const axis=e.axis==='x'?0:1,scale=axis===0?result.transform.scaleX:result.transform.scaleY,offset=axis===0?result.transform.offsetX:result.transform.offsetY;assert.ok(Math.abs(e.moving.point[axis]*scale+offset-e.reference.point[axis])<1e-8);}
assert.deepEqual(floor.view,originalFloor);assert.deepEqual(roof.view,originalRoof,'registration never temporarily rewrites roof kind or source level');

for(const [a,b,ai,bi]of [[floor.view,roof.view,null,roof.image],[floor.view,roof.view,floor.image,null],[floor.view,roof.view,floor.image,{...roof.image,data:roof.image.data.subarray(4)}]])assert.equal(Grid.alignRoofPlan(a,b,ai,bi).reason,'ROOF_GRID_SOURCE_FRAME_REQUIRED');
for(const source of ['floor','roof'])for(const field of ['payload','frame']){
 const a=structuredClone(floor.view),b=structuredClone(roof.view),changed=source==='floor'?a:b;
 if(field==='payload')changed.payload.sourceWidth+=1;else changed.frame.rasterSize[0]-=1;
 assert.equal(Grid.alignRoofPlan(a,b,floor.image,roof.image).reason,'ROOF_GRID_SOURCE_FRAME_REQUIRED',`${source} local pixels must match payload size and fit inside the source page raster`);
}
// Import stores page dimensions in frame.rasterSize and local cropped dimensions
// in payload. A larger page is legitimate when its crop transform is explicit.
const cropped=structuredClone(roof.view);cropped.frame.rasterSize=[1200,1000];cropped.frame.cropToRaster=[1,0,0,1,100,150];cropped.zone=[100,150,800,600];cropped.payload.sourceCrop=[100,150,800,600];
const croppedBefore=structuredClone(cropped),cropResult=Grid.alignRoofPlan(floor.view,cropped,floor.image,roof.image);
assert.equal(cropResult.status,'proposed');assert.deepEqual(cropResult.movingSourceFrame,cropped.frame);assert.deepEqual(cropResult.transform,result.transform);assert.deepEqual(cropped,croppedBefore);
const outside=structuredClone(cropped);outside.frame.cropToRaster[4]=600;assert.equal(Grid.alignRoofPlan(floor.view,outside,floor.image,roof.image).reason,'ROOF_GRID_SOURCE_FRAME_REQUIRED','local crop cannot extend outside the source raster');
const unregisteredCrop=structuredClone(cropped);delete unregisteredCrop.frame.cropToRaster;assert.equal(Grid.alignRoofPlan(floor.view,unregisteredCrop,floor.image,roof.image).reason,'ROOF_GRID_SOURCE_FRAME_REQUIRED','different page/local sizes require an explicit crop transform');
const foreign=structuredClone(roof.view);foreign.buildingId='synthetic-shed';assert.equal(Grid.alignRoofPlan(floor.view,foreign,floor.image,roof.image).status,'unresolved');
assert.equal(Grid.alignRoofPlan(roof.view,floor.view,roof.image,floor.image).status,'unresolved','source roles cannot be reversed');
assert.equal(Grid.alignRoofPlan(floor.view,{...roof.view,kind:'elevation'},floor.image,roof.image).status,'unresolved');
const anisotropic=drawing({id:'distorted-roof',kind:'roof',sx:1.2,sy:.98});assert.equal(Grid.alignRoofPlan(floor.view,anisotropic.view,floor.image,anisotropic.image).reason,'GRID_TRANSFORM_CONFLICT');
const missingY=drawing({id:'missing-y',kind:'roof',omit:['B']});assert.equal(Grid.alignRoofPlan(floor.view,missingY.view,floor.image,missingY.image).status,'unresolved','one axis cannot establish roof depth registration');
const blank={...roof.image,data:new Uint8ClampedArray(roof.image.data.length).fill(255)};assert.equal(Grid.alignRoofPlan(floor.view,roof.view,floor.image,blank).status,'unresolved','OCR labels without source rings cannot register a roof');

assert.equal(Grid.alignViews(floor.view,roof.view,floor.image,roof.image).reason,'GRID_SOURCE_LEVEL','legacy floor alignment does not accept a roof');
assert.equal(Grid.markers(roof.view,roof.image).reason,'GRID_SOURCE_UNAVAILABLE','public floor marker API retains its original scope');
const anotherFloor=drawing({id:'second-floor',levelId:'level-2',sx:1.02,sy:1.015,tx:8,ty:-5});
assert.equal(Grid.alignViews(floor.view,anotherFloor.view,floor.image,anotherFloor.image).status,'proposed','existing floor-to-floor registration still works');
assert.deepEqual(floor.view,originalFloor);assert.deepEqual(roof.view,originalRoof);
console.log('PASS roof grid registration: actual labelled raster axes, X/Y provenance, immutable roof kind, source-frame agreement, building isolation, distortion refusal and legacy floor scope.');
