'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js');
function fixture({rail=true,firstCap=true,lastCap=true,step=true,joint=true,colour=false,rotation=false,scale=1,brokenWall=false,extraGap=false}={}){
 const width=Math.round((rotation?650:1000)*scale),height=Math.round((rotation?1000:650)*scale),image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)},transform=([x,y])=>rotation?[(650-y)*scale,x*scale]:[x*scale,y*scale];
 const dot=(x,y,c=[0,0,0])=>{[x,y]=transform([x,y]).map(Math.round);if(x>=0&&x<width&&y>=0&&y<height)image.data.set([...c,255],(y*width+x)*4);},stroke=(a,b,c)=>{const length=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*scale*2);for(let n=0;n<=length;n++)dot(a[0]+(b[0]-a[0])*n/length,a[1]+(b[1]-a[1])*n/length,c);};
 const points=[[150,150],[850,150],[850,550],[150,550]].map(transform),c=colour?[0,170,220]:[80,80,80];
 stroke([150,150],[850,150]);stroke([150,150],[150,550]);stroke([150,550],[850,550]);
 for(const x of [842,850]){stroke([x,150],[x,brokenWall?178:195]);stroke([x,265],[x,extraGap?370:550]);if(extraGap)stroke([x,400],[x,550]);}
 if(firstCap)stroke([842,195],[850,195],c);if(lastCap)stroke([842,265],[850,265],c);if(rail)stroke([844,195],[844,265],c);
 stroke([847,195],[847,joint?232:228],c);stroke([step?849:847,joint?230:234],[step?849:847,265],c);if(joint&&step)stroke([847,231],[849,231],c);
 return {image,points};
}
const f=fixture(),pixels=Buffer.from(f.image.data),result=V.floorBoundaryEvidence(f.image,f.points),edge=result[1];assert.equal(edge.status,'proposed');assert.ok(edge.maxGap>4,'raw gap still fails ordinary boundary ink');assert.equal(edge.unexplainedMaxGap,0);assert.equal(edge.openingEvidence.length,1);const proof=edge.openingEvidence[0];assert.equal(proof.kind,'observed-sliding-frame');assert.equal(proof.metricWidth,null);assert.equal(proof.swing,null,'a sliding patio door does not acquire an invented swing arc');assert.equal(proof.jambs.length,2);assert.equal(proof.tracks.length,2);assert.ok(proof.rail.support>=.9);assert.ok(proof.coverage.support>=.9);assert.ok(Math.abs(proof.tracks[0].depth-proof.tracks[1].depth)>=2);assert.ok(proof.joint.anchors||proof.joint.from&&proof.joint.to);assert.deepEqual(Buffer.from(f.image.data),pixels);assert.deepEqual(JSON.parse(JSON.stringify(proof)),proof,'pixel frame provenance survives persistence');
for(const options of [{rail:false},{firstCap:false},{lastCap:false},{step:false},{joint:false},{colour:true},{brokenWall:true},{extraGap:true}]){const bad=fixture(options);assert.equal(V.floorBoundaryEvidence(bad.image,bad.points)[1].status,'unresolved',JSON.stringify(options)+' cannot explain a missing wall segment');}
for(const options of [{rotation:true},{scale:1.5},{rotation:true,scale:1.5}]){const rotated=fixture(options),found=V.floorBoundaryEvidence(rotated.image,rotated.points)[1];assert.equal(found.status,'proposed',JSON.stringify(options));assert.equal(found.openingEvidence[0].kind,'observed-sliding-frame');}
assert.ok(V.floorBoundaryEvidence(f.image,f.points.slice().reverse()).every(e=>e.status==='proposed'),'source contour orientation does not change the structural observations');
console.log('PASS sliding boundary: paired source jambs, continuous rail, distinct joined tracks, strict negative gaps/dimensions/colour, rotations and source provenance');
