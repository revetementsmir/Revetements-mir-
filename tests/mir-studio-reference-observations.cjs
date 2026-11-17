'use strict';
const assert=require('node:assert/strict'),R=require('../dist/plan-reconstruction.js'),P=require('../dist/plan-reconstruction-pipeline.js'),I=require('../dist/plan-view-inventory.js');
const image={width:1000,height:700,data:new Uint8ClampedArray(1000*700*4).fill(255)};
function line(a,b,width=1){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++)for(let dx=-Math.floor(width/2);dx<=Math.floor(width/2);dx++)for(let dy=-Math.floor(width/2);dy<=Math.floor(width/2);dy++){const x=Math.round(a[0]+(b[0]-a[0])*i/(n||1))+dx,y=Math.round(a[1]+(b[1]-a[1])*i/(n||1))+dy;image.data.set([0,0,0,255],(y*image.width+x)*4);}}
// A perfectly read number beside a long architectural line does not prove
// that its internal crossings are dimension ticks.
line([100,160],[900,160]);for(const x of [220,780])line([x,125],[x,200]);
const row={text:'18 ft',box:[475,140,525,149],confidence:98,source:'ocr'},frame={units:'pixels',rasterSize:[1000,700]},view={id:'synthetic-view',kind:'floor',frame,payload:{sourceWidth:1000,sourceHeight:700,drawingReadings:{rows:[row]}}};
const original=structuredClone(view),bad=R.referenceObservations(view,image);
assert.equal(bad.references.length,0);assert.equal(R.references(view,image).length,0);
assert.equal(bad.unresolvedReferences.length,1);const rejected=bad.unresolvedReferences[0];
assert.equal(rejected.lineEvidence.reason,'DIMENSION_END_MARKS_REQUIRED');assert.equal(rejected.scaleEligibility,'unresolved');assert.equal(rejected.confidence,98);assert.equal(rejected.label,row.text);assert.equal(rejected.sourceViewId,view.id);assert.deepEqual(rejected.sourceFrame,frame);assert.deepEqual(rejected.textBox,row.box);
assert.deepEqual(JSON.parse(JSON.stringify(bad)),bad,'failed associations remain serializable evidence, not lost array properties');assert.deepEqual(view,original);

const polygon=[[200,340],[800,340],[800,600],[200,600]];polygon.forEach((a,i)=>line(a,polygon[(i+1)%polygon.length],6));
const inventory=I.create([{kind:'floor',name:'Plan étage maison',page:1,sourceWidth:1000,sourceHeight:700,sourceCrop:[0,0,1000,700],drawingReadings:{rows:[row]}}],{filename:'synthetic.pdf',bytes:1000});
inventory.views[0].payload.drawingReadings={rows:[row]};
const proposal=R.propose(inventory,inventory.buildings[0].id,{[inventory.views[0].id]:image});
assert.equal(proposal.status,'proposed');assert.equal(proposal.referenceCandidates.length,0);assert.equal(proposal.draft.reference.value,null);
assert.ok(proposal.unresolvedScaleReferences.some(r=>r.lineEvidence.reason==='DIMENSION_END_MARKS_REQUIRED'),'the failed association survives the actual proposal path');

line([200,270],[800,270]);for(const x of [200,800]){line([x,240],[x,300]);line([x-4,274],[x+4,266]);}
const genuine={text:'20 ft',box:[475,250,525,259],confidence:96,source:'ocr'};view.payload.drawingReadings.rows.push(genuine);
const observed=R.referenceObservations(view,image);assert.equal(observed.references.length,1);assert.equal(observed.references[0].lineEvidence.status,'observed');assert.equal(observed.unresolvedReferences.length,1,'a valid independent span does not erase the earlier failure');
view.payload.drawingReadings.rows.push({...genuine,text:'24 ft'});const conflict=R.referenceObservations(view,image);
assert.equal(conflict.references.length,2,'two physically associated but contradictory readings both remain eligible for conflict assessment');assert.equal(P.resolveReference(conflict.references).status,'conflict');
console.log('PASS reference observations: high OCR confidence never replaces source marks; rejected associations persist through proposal; independent valid spans and real contradictions are retained');
