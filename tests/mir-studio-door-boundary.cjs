'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js');
function fixture({arc=true,leaf=true,leftJamb=true,rightJamb=true,coloured=false,curveRadius=40,breakWall=false,scale=1,rotation=0,secondGap=false,paleArc=false,mirror=false,dimensionRail=false}={}){
 const width=Math.round((rotation?650:1000)*scale),height=Math.round((rotation?1000:650)*scale),image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};
 const transform=([x,y])=>{if(mirror)x=1000-x;return rotation?[(650-y)*scale,x*scale]:[x*scale,y*scale];};
 const dot=(x,y,color=[0,0,0])=>{[x,y]=transform([x,y]).map(Math.round);if(x>=0&&x<width&&y>=0&&y<height)image.data.set([...color,255],(y*width+x)*4);};
 const stroke=(a,b,color=[0,0,0])=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*scale*2);for(let i=0;i<=n;i++)dot(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,color);};
 const points=[[150,150],[850,150],[850,550],[150,550]].map(transform);
 stroke([150,150],[850,150]);stroke([850,150],[850,550]);stroke([150,150],[150,550]);
 for(const y of [540,550]){stroke([150,y],[breakWall?395:440,y]);stroke([480,y],[secondGap?620:850,y]);if(secondGap)stroke([650,y],[850,y]);}
 if(leftJamb)stroke([440,540],[440,550]);if(rightJamb)stroke([480,540],[480,550]);
 const color=coloured?[0,170,210]:[100,100,100];if(leaf)stroke([480,540],[480,500],color);if(dimensionRail)stroke([480,570],[480,450],[180,180,180]);
 if(arc)for(let deg=0;deg<=90;deg+=.25){const a=deg*Math.PI/180;dot(480-curveRadius*Math.cos(a),540-curveRadius*Math.sin(a),paleArc?[225,225,225]:color);}
 return {image,points};
}
const original=fixture(),pixels=Buffer.from(original.image.data),result=V.floorBoundaryEvidence(original.image,original.points),edge=result[2];
assert.equal(edge.status,'proposed','an observed quarter-circle door explains its missing wall stroke');assert.ok(edge.maxGap>Math.max(4,Math.round(original.image.width/525)*2),'the raw failure remains recorded');assert.ok(edge.unexplainedMaxGap<=4);assert.equal(edge.openingEvidence.length,1);const door=edge.openingEvidence[0];assert.equal(door.kind,'observed-door-swing');assert.equal(door.metricWidth,null,'pixel evidence does not invent a written door size');assert.equal(door.status,'proposed');assert.ok(door.arc.support>=.82&&door.leaf.support>=.8);assert.ok(door.sourcePoints.hinge&&door.sourcePoints.leafTip&&door.sourcePoints.oppositeJamb&&door.arcPoints.length>=8);assert.deepEqual(Buffer.from(original.image.data),pixels,'recognition never paints the gap into the raster');assert.deepEqual(JSON.parse(JSON.stringify(edge)),edge,'all source pixel evidence survives JSON persistence');
for(const options of [{arc:false},{leaf:false},{leftJamb:false},{rightJamb:false},{coloured:true},{curveRadius:25},{breakWall:true},{secondGap:true}]){const f=fixture(options),e=V.floorBoundaryEvidence(f.image,f.points)[2];assert.equal(e.status,'unresolved',JSON.stringify(options)+' must not become an invented boundary bridge');}
// Rotation and image resolution change the source frame, not the recognition
// rule or any metre value. A reversed contour retains the same interior side.
for(const options of [{rotation:90},{scale:1.5},{rotation:90,scale:1.5}]){const f=fixture(options),e=V.floorBoundaryEvidence(f.image,f.points)[2];assert.equal(e.status,'proposed',JSON.stringify(options));assert.equal(e.openingEvidence.length,1);assert.ok(e.openingEvidence[0].arcPoints.every(p=>p[0]>=0&&p[0]<f.image.width&&p[1]>=0&&p[1]<f.image.height));}
const reversed=V.floorBoundaryEvidence(original.image,original.points.slice().reverse());assert.ok(reversed.every(e=>e.status==='proposed'));assert.equal(reversed.reduce((n,e)=>n+(e.openingEvidence?.length||0),0),1);
// The neutral quarter-circle can be pale after a source JPEG round trip.
// Its local contrast must be visible on both sides of the line. A dimension
// leader continuing beyond the supposed leaf tip is not a door leaf.
for(const options of [{paleArc:true},{paleArc:true,mirror:true},{paleArc:true,rotation:90}]){const f=fixture(options),e=V.floorBoundaryEvidence(f.image,f.points)[2];assert.equal(e.status,'proposed',JSON.stringify(options));assert.ok(e.openingEvidence[0].leafExtension.maxGap>=3);}
for(const options of [{leaf:false,dimensionRail:true},{leaf:false,dimensionRail:true,paleArc:true}]){const f=fixture(options);assert.equal(V.floorBoundaryEvidence(f.image,f.points)[2].status,'unresolved','a continuous dimension leader cannot supply a missing door leaf');}
console.log('PASS boundary door evidence: raw gaps retained, two jambs/leaf/arc/adjacent walls, colour and incomplete symbols rejected, rotations/scales, immutable raster and provenance persistence');
