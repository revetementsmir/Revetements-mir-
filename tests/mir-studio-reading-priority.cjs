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
console.log('PASS targeted reading priority: source-paired scale before opening details, overlapping OCR deduplicated after ranking, late-loaded API, bounded per-view/global work, immutable sources and building isolation.');
