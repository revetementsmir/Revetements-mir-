'use strict';
// Entirely synthetic fixture: no client drawing, label, or coordinate.
const assert=require('node:assert/strict'),Grid=require('../dist/plan-grid-registration.js');
function drawing({id='floor-0',levelId='level-0',sx=1,sy=1,tx=0,ty=0,colour=[0,0,0],omit=[],duplicate=false,buildingId='house'}={}){
 const width=800,height=600,rgba=new Uint8ClampedArray(width*height*4).fill(255),rows=[];
 const bubbles=[...['1','2','3','4'].map((name,i)=>[name,170+i*170,65]),['A',90,235],['B',90,485]];
 const dark=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=width||y>=height)return;rgba.set([...colour,255],(y*width+x)*4);};
 for(const [name,x,y] of bubbles){
  if(omit.includes(name))continue;
  const center=[(x-tx)/sx,(y-ty)/sy],radius=17/(sx+sy)*2;
  for(let angle=0;angle<360;angle++){const a=angle*Math.PI/180;for(const dr of [-1.2,0,1.2])dark(center[0]+Math.cos(a)*(radius+dr),center[1]+Math.sin(a)*(radius+dr));}
  rows.push({text:name,box:[center[0]-5,center[1]-5,center[0]+5,center[1]+5],confidence:97});
 }
 if(duplicate)rows.push({...rows.find(v=>v.text==='2')});
 return {view:{id,levelId,kind:'floor',buildingId,page:2,frame:{rasterSize:[width,height]},payload:{drawingReadings:{rows}}},image:{width,height,data:rgba}};
}
const base=drawing(),next=drawing({id:'floor-1',levelId:'level-1',sx:1.02,sy:1.015,tx:8,ty:-5}),before=structuredClone(base.view);
const result=Grid.alignViews(base.view,next.view,base.image,next.image);
assert.equal(result.status,'proposed');assert.equal(result.notAGeometryConfirmation,true);assert.equal(result.confirmationRequired,true);
assert.equal(result.matchedHorizontal,3,'three independent labelled horizontal axes corroborate the transform');
assert.equal(result.matchedVertical,2,'two vertical axes establish independent depth registration');
assert.ok(Math.abs(result.transform.scaleX-1.02)<.002);assert.ok(Math.abs(result.transform.scaleY-1.015)<.002);
assert.ok(Math.abs(result.transform.offsetX-8)<.2);assert.ok(Math.abs(result.transform.offsetY+5)<.2);
assert.ok(result.evidence.every(v=>v.reference.sourceViewId===base.view.id&&v.moving.sourceViewId===next.view.id));
assert.deepEqual(base.view,before,'source observations must be immutable');
const inventory={views:[base.view,next.view]},images={[base.view.id]:base.image,[next.view.id]:next.image};
assert.equal(Grid.forBuilding(inventory,'house',images).byLevel['level-1'].status,'proposed');
assert.equal(Grid.forBuilding(inventory,'other-building',images).status,'not-required');
const invalid=opts=>{const other=drawing({id:'floor-1',levelId:'level-1',...opts});return Grid.alignViews(base.view,other.view,base.image,other.image);};
assert.equal(invalid({omit:['A']}).status,'unresolved','a single horizontal plan axis is insufficient');
assert.equal(invalid({omit:['1','2']}).status,'unresolved','two vertical building-grid lines are insufficient');
assert.equal(invalid({colour:[0,155,210]}).status,'unresolved','coloured marks are not grid lines');
assert.equal(invalid({duplicate:true}).status,'unresolved','duplicate OCR does not vote');
assert.equal(invalid({sx:1.2,sy:.98}).status,'conflict','incompatible X/Y scale is not silently warped');
assert.equal(invalid({buildingId:'shed'}).status,'unresolved','a different building cannot supply registration');
assert.equal(Grid.alignViews(base.view,base.view,base.image,base.image).status,'unresolved','same-level loops are not a cross-level registration');
const blank=new Uint8ClampedArray(base.image.data.length).fill(255);
assert.equal(Grid.alignViews(base.view,next.view,{...base.image,data:blank},next.image).status,'unresolved','labels without source ink are not evidence');
// The pipeline independently reports XY evidence, even when wall/level
// geometry is absent. Grid matching is never a backdoor confirmation.
const P=require('../dist/plan-reconstruction-pipeline.js');
const fresh={...structuredClone(inventory),levels:[{id:'house:level-0',buildingId:'house',sourceLevel:'level-0'},{id:'house:level-1',buildingId:'house',sourceLevel:'level-1'}]};
const original=structuredClone(fresh);
const checked=P.build(fresh,'house',images);
assert.deepEqual(fresh,original,'reading grid evidence may not mutate existing projects');
assert.equal(checked.levels.some(level=>(level.contours||[]).length>0),false,'grid lines without walls must not produce a house');
assert.equal(checked.reports.find(v=>v.levelId==='house:level-1').gridAlignment.status,'proposed','registered axes remain visible in diagnostics');
assert.equal(checked.reports.find(v=>v.levelId==='house:level-1').gridAlignment.notAGeometryConfirmation,true);
// OCR-independent raster grid bubbles: the generic page scan need not read a
// tiny glyph before targeted local recognition is scheduled.
{
 const withoutReadings=structuredClone(base.view);
 withoutReadings.payload.drawingReadings.rows=[];
 const proposed=Grid.bubbleRegions(base.image);
 assert.equal(proposed.status,'proposed','ring geometry supplies targeted OCR regions');
 assert.ok(proposed.bubbles.filter(v=>v.kind==='number').length>=3);
 assert.ok(proposed.bubbles.filter(v=>v.kind==='letter').length>=2);
 assert.ok(proposed.bubbles.every(v=>v.ringSupport>=.9&&v.confirmationRequired));
 assert.equal(Grid.markers(withoutReadings,base.image).status,'unresolved','unlabelled circles alone are not floor registration');
 assert.equal(Grid.bubbleRegions({...base.image,data:new Uint8ClampedArray(base.image.data.length).fill(255)}).status,'unresolved');
 assert.equal(Grid.bubbleRegions(drawing({colour:[0,155,210]}).image).status,'unresolved','colour annotations never supply black grid bubbles');
 assert.equal(Grid.bubbleRegions(drawing({omit:['B']}).image).status,'unresolved','an absent second axis must not be filled');
 const one=proposed.bubbles.find(v=>v.kind==='number');
 const forged=structuredClone(base.view);
 forged.payload.drawingReadings.rows=[{text:'A',box:[one.center[0]-4,one.center[1]-4,one.center[0]+4,one.center[1]+4],source:'ocr-local-grid-bubble',confidence:99,retry:{gridCircle:one}}];
 assert.equal(Grid.markers(forged,base.image).status,'unresolved','letter text in numbered bubble cannot be promoted');
 // Import-local OCR work queue must include true ring candidates even when
 // the initial full-page OCR returned no labelled axes.
 const initialWindow=global.window,initialDocument=global.document;
 global.window={MIRGridRegistration:Grid};
 global.document={currentScript:{src:'http://localhost/plan-reconstruction-readings.js'}};
 try{
  require('../dist/plan-reconstruction-readings.js');
  const item=structuredClone(withoutReadings);
  item.payload.sourceImage='synthetic-raster';
  const tasks=global.window.MIRReconstructionReadings.workItems({views:[item]},'house',{[item.id]:base.image});
  assert.ok(tasks.filter(x=>x.region.grid).length>=5,'grid OCR regions are enqueued from source rings without initial OCR text');
  assert.ok(tasks.filter(x=>x.region.grid).every(x=>x.region.purpose==='source-raster-grid-bubble'&&x.region.gridCircle.ringSupport>=.9));
 }finally{global.window=initialWindow;global.document=initialDocument;}
}
console.log('PASS grid registration: two orthogonal labelled raster axes, provenance, rejection of OCR duplication, missing/coloured bubbles, distortion and cross-building association');
