'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {blank,line}=require('./helpers/mir-studio-entry-fixture.cjs');
const R=require('../dist/plan-reconstruction.js');
const context={URL,document:{currentScript:{src:'https://synthetic.invalid/plan-reconstruction-readings.js'}}};context.window=context;
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/plan-reconstruction-readings.js'),'utf8'),context);
// Match the browser's deferred script order: the reader loads before R,
// but uses the reconstruction API only when conversion is requested.
context.MIRPlanReconstruction=R;
const Q=context.MIRReconstructionReadings,image=blank();
line(image,180,650,780,650);for(const x of [180,780])line(image,x,633,x,668);
const scaleRow={text:'18-0"',box:[460,633,500,642],confidence:44,source:'ocr'};
const windows=Array.from({length:9},(_,i)=>({text:'36" x 60"',box:[100+i*60,100,145+i*60,112],confidence:80,source:'ocr'}));
const view={id:'synthetic-scale-view',buildingId:'house',kind:'elevation',page:1,frame:{units:'pixels',rasterSize:[1000,800]},payload:{sourceImage:'synthetic-image-not-decoded',sourceWidth:1000,sourceHeight:800,drawingReadings:{rows:[...windows,{text:'180',box:scaleRow.box.slice(),confidence:20,source:'ocr'},scaleRow]}}};
const before=JSON.stringify(view),pixels=Buffer.from(image.data),found=R.references(view,image);
assert.ok(found.some(r=>r.label===scaleRow.text&&r.spanPx>590),'the scale inscription is paired with two real drawing marks');
const selected=Q.regions(view,image);
assert.equal(selected.length,6,'the existing per-view reading budget stays bounded');
assert.equal(selected[0].row.text,scaleRow.text,'an observed weak scale caption precedes window details');
assert.equal(selected[0].purpose,'source-paired-scale-dimension');
assert.ok(selected[0].scaleSpanPixels>590);
assert.ok(!selected.some(r=>r.row.text==='180'),'an earlier overlapping OCR fragment cannot consume the retry instead');
assert.equal(JSON.stringify(view),before);assert.deepEqual(Buffer.from(image.data),pixels,'retry scheduling does not alter the source pixels');

const fragmented=structuredClone(view);fragmented.payload.drawingReadings.rows=[...windows,{text:'18',box:[460,633,475,642],confidence:44,source:'ocr'},{text:'\'-0"',box:[478,633,500,642],confidence:42,source:'ocr'}];
const whole=Q.regions(fragmented,image)[0];
assert.equal(whole.purpose,'source-paired-scale-dimension','split source tokens can retain their observed scale priority');
assert.equal(whole.row.text,'18 \'-0"');assert.deepEqual(Array.from(whole.row.box),[460,633,500,642],'retry the complete inscription rather than one numeric fragment');
assert.equal(whole.row.readingParts.length,2);

// A still-uncertain reading above the old threshold of 60 also needs the
// retry if it cannot pass the independent scale-quality gate at 70.
const moderate=structuredClone(view);moderate.payload.drawingReadings.rows=[{...scaleRow,confidence:65}];
assert.equal(Q.regions(moderate,image)[0].purpose,'source-paired-scale-dimension');
const reliable=structuredClone(view);reliable.payload.drawingReadings.rows=[{...scaleRow,confidence:92}];
assert.equal(Q.regions(reliable,image).length,0,'a reliable scale is not reread without a reason');
const notes=structuredClone(view);notes.payload.drawingReadings.rows=[{text:'NOTE: 18 ft',box:[100,50,220,70],confidence:30},{text:'1/2',box:[100,90,120,100],confidence:30}];
assert.ok(Q.regions(notes,image).every(r=>r.purpose!=='source-paired-scale-dimension'),'a note or bare fraction cannot claim source-paired scale priority');

// Every contributing elevation gets its essential scale reading before
// early pages use up the global budget with windows. Other buildings and
// unsupported view kinds never enter this conversion's OCR work.
const views=Array.from({length:20},(_,i)=>({...structuredClone(view),id:'synthetic-view-'+i,page:i+1}));
views.push({...structuredClone(view),id:'other-building',buildingId:'other'});
views.push({...structuredClone(view),id:'detail-only',kind:'detail'});
const inventory={views},inventoryBefore=JSON.stringify(inventory),images=Object.fromEntries(views.map(v=>[v.id,image])),work=Q.workItems(inventory,'house',images);
assert.equal(work.length,42,'global OCR work stays at 42 regions');
assert.equal(work.filter(w=>w.region.purpose==='source-paired-scale-dimension').length,20,'later contributing views are not starved');
assert.ok(work.slice(0,20).every(w=>w.region.purpose==='source-paired-scale-dimension'));
assert.ok(work.every(w=>w.view.buildingId==='house'&&w.view.kind==='elevation'));
assert.equal(JSON.stringify(inventory),inventoryBefore);

// A roof plan is supplementary evidence. Its newly discovered grid must not
// evict the source readings already needed to reconstruct floor elevations.
// These are real synthetic raster rings, not client drawings or mocked OCR
// results; the production grid detector and pitch-region producer run here.
context.MIRGridRegistration=require('../dist/plan-grid-registration.js');
context.MIRRoofPitchEvidence=require('../dist/plan-roof-pitch-evidence.js');
const gridImage=blank(),emptyImage=blank();
for(const [cx,cy] of [...Array.from({length:8},(_,i)=>[130+i*90,65]),[90,260],[90,600]]){
 for(let angle=0;angle<360;angle++)for(const delta of [-1,0,1]){
  const a=angle*Math.PI/180,x=Math.round(cx+(17+delta)*Math.cos(a)),y=Math.round(cy+(17+delta)*Math.sin(a));
  gridImage.data.set([0,0,0,255],(y*gridImage.width+x)*4);
 }
}
const sourceView=(id,kind,rows=[],extra={})=>({id,kind,buildingId:'house',page:1,frame:{units:'pixels',rasterSize:[1000,800]},payload:{sourceImage:'synthetic-image-not-decoded',sourceWidth:1000,sourceHeight:800,drawingReadings:{rows}},...extra});
const floorViews=Array.from({length:4},(_,i)=>sourceView('synthetic-floor-'+i,'floor',[],{levelId:'level-'+i}));
const captionRows=()=>Array.from({length:6},(_,i)=>({text:'PLANCHER',box:[300,200+i*60,380,212+i*60],confidence:30,source:'synthetic-ocr'}));
const elevationViews=Array.from({length:7},(_,i)=>sourceView('synthetic-elevation-'+i,'elevation',captionRows(),{direction:'front'}));
const roofView=sourceView('synthetic-roof','roof',[{text:'PENTE',box:[360,230,420,242],confidence:90,source:'synthetic-ocr'}]);
const schedulerImages=Object.fromEntries([...floorViews,...elevationViews,roofView].map(v=>[v.id,v.kind==='elevation'?emptyImage:gridImage]));
const schedule=views=>Q.workItems({views},'house',schedulerImages);
const workKeys=items=>Array.from(items,item=>JSON.stringify([item.view.id,item.region.purpose||null,item.region.row.box]));
const schedulerSources=JSON.stringify([...floorViews,...elevationViews,roofView]),gridPixels=Buffer.from(gridImage.data),emptyPixels=Buffer.from(emptyImage.data);
assert.equal(Q.gridRegions(floorViews[0],gridImage).length,10,'the raster itself supplies the synthetic grid candidates');

const saturatedViews=[...floorViews,...elevationViews.slice(0,4)],saturatedBase=schedule(saturatedViews),saturatedRoof=schedule([...saturatedViews,roofView]);
assert.equal(saturatedBase.length,64);assert.equal(saturatedBase.filter(item=>item.region.caption).length,24);
assert.equal(saturatedRoof.length,64,'adding a roof does not expand the multi-level region budget');
assert.equal(saturatedRoof.filter(item=>item.region.caption).length,24,'roof registration must not evict level captions when the queue is full');
assert.deepEqual(workKeys(saturatedRoof),workKeys(saturatedBase),'all baseline source readings and their order survive supplementary roof evidence');
for(const elevation of elevationViews.slice(0,4))assert.equal(saturatedRoof.filter(item=>item.view.id===elevation.id).length,6,'later elevations keep all selected datum captions');
assert.equal(saturatedRoof.filter(item=>item.view.kind==='roof').length,0,'a saturated queue leaves roof registration unresolved instead of dropping floor evidence');

const spareViews=[...floorViews.slice(0,2),elevationViews[0]],spareBase=schedule(spareViews),spareRoof=schedule([...spareViews,roofView]);
assert.deepEqual(workKeys(spareRoof.slice(0,spareBase.length)),workKeys(spareBase),'fundamental readings execute before supplementary roof registration');
assert.equal(spareRoof.filter(item=>item.view.kind==='roof').length,10,'actual roof grid candidates use available slots');
assert.equal(spareRoof.length,spareBase.length+10);assert.ok(spareRoof.length<=64);
const nearlyFullViews=[...floorViews.slice(0,2),...elevationViews],nearlyFullBase=schedule(nearlyFullViews),nearlyFullRoof=schedule([...nearlyFullViews,roofView]);
assert.equal(nearlyFullBase.length,62);assert.equal(nearlyFullRoof.length,64);
assert.deepEqual(workKeys(nearlyFullRoof.slice(0,62)),workKeys(nearlyFullBase));
assert.equal(nearlyFullRoof.filter(item=>item.view.kind==='roof').length,2,'only the two remaining slots are available to ten roof-grid candidates');

// On a one-level building, even the floor grid is a new requirement of roof
// registration. It must not preempt any of the existing 42 source readings.
const singleViews=[floorViews[0],...elevationViews],singleBase=schedule(singleViews),singleRoof=schedule([...singleViews,roofView]);
assert.equal(singleBase.length,42);assert.equal(singleBase.some(item=>item.region.grid),false);
assert.equal(singleRoof.length,42);assert.deepEqual(workKeys(singleRoof),workKeys(singleBase),'roof-only floor grids cannot starve a one-level building either');
const singleSpareViews=[floorViews[0],elevationViews[0]],singleSpareBase=schedule(singleSpareViews),singleSpareRoof=schedule([...singleSpareViews,roofView]);
assert.deepEqual(workKeys(singleSpareRoof.slice(0,singleSpareBase.length)),workKeys(singleSpareBase));
assert.equal(singleSpareRoof.filter(item=>item.view.kind==='floor'&&item.region.grid).length,10);
assert.equal(singleSpareRoof.filter(item=>item.view.kind==='roof'&&item.region.grid).length,10);
assert.equal(singleSpareRoof.length,singleSpareBase.length+20);assert.ok(singleSpareRoof.length<=42);

const noPitch=structuredClone(roofView);noPitch.payload.drawingReadings.rows=[];
assert.deepEqual(workKeys(schedule([...singleSpareViews,noPitch])),workKeys(singleSpareBase),'a roof without a source pitch does not add grid work');
const foreignRoof={...structuredClone(roofView),buildingId:'other'};
assert.deepEqual(workKeys(schedule([...singleSpareViews,foreignRoof])),workKeys(singleSpareBase),'another building cannot trigger roof registration');
assert.deepEqual(workKeys(schedule([elevationViews[0],roofView])),workKeys(schedule([elevationViews[0]])),'a roof without a floor plan has no registration work');
assert.equal(JSON.stringify([...floorViews,...elevationViews,roofView]),schedulerSources,'scheduling leaves view kinds, observations and frames unchanged');
assert.deepEqual(Buffer.from(gridImage.data),gridPixels);assert.deepEqual(Buffer.from(emptyImage.data),emptyPixels);
console.log('PASS targeted reading priority: source-paired scale before details, bounded immutable source work, saturated multi/single-level queues preserved, and roof registration only in remaining slots.');
