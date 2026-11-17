'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={URL,document:{currentScript:{src:'https://synthetic.invalid/plan-reconstruction-readings.js'}}};context.window=context;
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/plan-reconstruction-readings.js'),'utf8'),context);
const Q=context.MIRReconstructionReadings,rows=[{text:'42"',box:[300,200,310,206],confidence:95},{text:'66"',box:[321,200,331,206],confidence:93}],view={id:'floor-a',kind:'floor',levelId:'level-1',buildingId:'house',frame:{units:'pixels'},payload:{sourceWidth:1000,sourceHeight:800,sourceImage:'synthetic',drawingReadings:{rows}}},before=JSON.stringify(view),refs=[{textBox:rows[0].box}];
const selected=Q.neighbouringMeasurements(view,refs);
assert.equal(selected.length,1);assert.equal(selected[0].purpose,'source-neighbouring-measurements');assert.equal(selected[0].priority,.25,'a caption competing with a source scale is reread before axis/detail work');assert.equal(selected[0].row.text,'42" 66"','X is not inferred from two numerical values');assert.deepEqual(Array.from(selected[0].row.box),[300,200,331,206]);assert.equal(selected[0].row.readingParts.length,2);assert.equal(selected[0].row.confidence,93,'high-confidence originals still need contextual reading');assert.equal(JSON.stringify(view),before);
const joined=structuredClone(view);joined.payload.drawingReadings.rows.push({text:'42" 66"',box:[300,200,331,206],confidence:95});assert.equal(Q.neighbouringMeasurements(joined,refs).length,1,'duplicate OCR representations share one retry');
const one=structuredClone(view);one.payload.drawingReadings.rows=[joined.payload.drawingReadings.rows.at(-1)];assert.equal(Q.neighbouringMeasurements(one,refs).length,1);
for(const invalid of [
 [{text:'NOTE 42" 66"',box:[300,200,331,206],confidence:95}],
 [{text:'42" x 66"',box:[300,200,331,206],confidence:95}],
 [{...rows[0]},{...rows[1],box:[360,200,370,206]}],
 [{...rows[0]},{...rows[1],box:[321,215,331,221]}],
 [{...rows[0]},{...rows[1],box:[321,200,331,216]}],
 [{text:'3/8',box:[300,200,310,206],confidence:95},{text:'5/8',box:[321,200,331,206],confidence:95}]
]){const v=structuredClone(view);v.payload.drawingReadings.rows=invalid;assert.equal(Q.neighbouringMeasurements(v,refs).length,0);}
assert.equal(Q.neighbouringMeasurements({...view,kind:'detail'},refs).length,0);
// Trustworthy numbered floor/ceiling captions need no redundant retry. Their
// retained rows remain available to datum matching without consuming its OCR budget.
const captionView={...view,kind:'elevation',payload:{...view.payload,drawingReadings:{rows:[{text:'PLANCHER NIVEAU 2',box:[100,100,220,109],confidence:94},{text:'PLAFOND NIVEAU 2',box:[100,70,220,79],confidence:92}]}}};
assert.equal(Q.regions(captionView).length,0);
captionView.payload.drawingReadings.rows[1].confidence=40;assert.equal(Q.regions(captionView).length,1);
// A bounded multi-level work queue preserves the shared source axes ahead of
// optional repeated readings. Every synthetic elevation reaches the queue.
context.MIRGridRegistration={bubbleRegions:(_image,{layout})=>({status:'proposed',bubbles:Array.from({length:layout==='floor'?8:4},(_,i)=>({kind:'number',center:[50+i*30,50],radius:9}))})};
const floors=Array.from({length:4},(_,i)=>({...structuredClone(view),id:'floor-'+i,levelId:'level-'+i,payload:{...view.payload,drawingReadings:{rows:[]}}}));
const elevations=Array.from({length:4},(_,i)=>({...structuredClone(captionView),id:'elevation-'+i,direction:'front',payload:{...captionView.payload,drawingReadings:{rows:Array.from({length:6},(_,j)=>({text:'PLANCHER NIVEAU '+j,box:[500,100+j*30,620,109+j*30],confidence:40}))}}}));
const inventory={views:[...floors,...elevations]},images=Object.fromEntries(inventory.views.map(v=>[v.id,{}])),work=Q.workItems(inventory,'house',images);
assert.equal(work.length,64);assert.equal(work.filter(w=>w.region.grid).length,48,'all observed axis candidates precede optional captions');for(const v of elevations)assert.ok(work.some(w=>w.view.id===v.id&&w.region.grid));
console.log('PASS neighbouring measurements: source-only combined crops, high-confidence contextual retries, no inferred X, original preservation, spatial/note refusals and bounded axis scheduling.');
// The contextual retry records both actual readings without synthesizing a
// multiplication symbol or replacing the original high-confidence rows.
let mode='7',terminated=false;const canvases=[];
const browserContext={URL,document:{currentScript:{src:'https://synthetic.invalid/plan-reconstruction-readings.js'},createElement(name){assert.equal(name,'canvas');const c={width:0,height:0,getContext(){return {drawImage(){}};}};canvases.push(c);return c;}},Image:class{async decode(){}},Tesseract:{async createWorker(){return {async setParameters(p){mode=p.tessedit_pageseg_mode;},async recognize(){const text=mode==='11'?'42" x 66"':'42" 66"';return {data:{text,confidence:94,blocks:[{paragraphs:[{lines:[{text,confidence:94,bbox:{x0:4,y0:4,x1:120,y1:24}}]}]}]}};},async terminate(){terminated=true;}};}}};browserContext.window=browserContext;vm.runInNewContext(fs.readFileSync(require.resolve('../dist/plan-reconstruction-readings.js'),'utf8'),browserContext);
(async()=>{const source={views:[structuredClone(view)]},unchanged=JSON.stringify(source),result=await browserContext.MIRReconstructionReadings.refine(source,'house');assert.equal(JSON.stringify(source),unchanged);assert.equal(result.evidence.length,2);assert.deepEqual(Array.from(result.evidence,e=>e.text),['42" 66"','42" x 66"']);assert.deepEqual(Array.from(result.evidence,e=>e.retry.psm),[7,11]);assert.equal(result.evidence[1].retry.readingAttempts.length,2);assert.equal(result.evidence[1].retry.originalText,'42" 66"');assert.equal(result.inventory.views[0].payload.drawingReadings.rows.length,4);assert.ok(canvases.every(c=>c.width===1&&c.height===1));assert.equal(terminated,true);console.log('PASS contextual retry integration: raw PSM7/11 readings, original rows and attempt provenance retained; missing native frame does not invent a source.');})().catch(e=>{console.error(e);process.exitCode=1;});
