'use strict';
// Synthetic source ink only. A detector endpoint may lie on a tick's edge;
// the independently observed centre supplies association, never a new measure.
const assert=require('node:assert/strict'),A=require('../dist/plan-import-core.js'),R=require('../dist/plan-reconstruction.js');
const image={width:1000,height:750,data:new Uint8ClampedArray(1000*750*4).fill(255)};
function line(a,b){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/n),y=Math.round(a[1]+(b[1]-a[1])*i/n);image.data.set([0,0,0,255],(y*image.width+x)*4);}}
line([240,125],[740,125]);for(const x of [240,740]){line([x,105],[x,145]);line([x-4,129],[x+4,121]);}
const frame={units:'pixels',rasterSize:[1000,750]},dimension={sourceViewId:'synthetic-plan',sourceFrame:frame,anchors:[[239,125],[739,125]],textBox:[470,105,510,115],text:'5000 mm',value:5,scale:.01,kind:'written'},outline={sourceViewId:dimension.sourceViewId,sourceFrame:frame,sourceBounds:[242.5,260,500,350],points:[[242.5,260],[742.5,260],[742.5,610],[242.5,610]]};
assert.equal(R.floorExtentEvidence(dimension,outline,image),null,'the original endpoint remains outside the existing three-pixel guard');
const proof=A.dimensionLineEvidence(image,dimension);assert.equal(proof.status,'observed');assert.ok(proof.markers.every(m=>m.kind==='diagonal-tick'&&m.strokeCenter[0]===m.point[0]+1));dimension.lineEvidence=proof;
const before=structuredClone({dimension,outline}),accepted=R.floorExtentEvidence(dimension,outline,image);
assert.ok(accepted);assert.ok(accepted.endpoints.every(e=>e.method==='observed-dimension-mark-to-contour'&&e.tolerancePx===3&&e.differencePixels===2.5&&e.anchorsPreserved));
assert.deepEqual({dimension,outline},before,'association does not move the contour, original anchors, scale, or written value');
for(const mutate of [
 d=>d.lineEvidence.status='unresolved',
 d=>d.lineEvidence.markers[0].kind='crossed-terminal-witnesses',
 d=>delete d.lineEvidence.markers[0].strokeCenter,
 d=>d.lineEvidence.markers[0].strokeCenter[0]+=3,
 d=>d.lineEvidence.markers[0].anchorTolerancePx=5,
 d=>d.lineEvidence.markers[0].point[0]+=1,
 d=>d.lineEvidence.anchors[0][0]+=1,
 d=>d.lineEvidence.markers[0].witnesses=[],
 d=>d.sourceViewId='another-plan',
 d=>d.sourceFrame={...frame,rasterSize:[2000,1500]}
]){const broken=structuredClone(dimension);mutate(broken);assert.equal(R.floorExtentEvidence(broken,outline,image),null,'missing, conflicting or foreign mark provenance must remain unresolved');}
const tooFar={...outline,sourceBounds:[245,260,500,350],points:[[245,260],[745,260],[745,610],[245,610]]};assert.equal(R.floorExtentEvidence(dimension,tooFar,image),null,'a real mark cannot widen the existing contour tolerance');
console.log('PASS mark extent: actual tick detection, same-source bounded centres, unchanged anchors/measures, invalid and foreign evidence rejected');
