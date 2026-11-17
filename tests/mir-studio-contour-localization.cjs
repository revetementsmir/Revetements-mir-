// Synthetic wall rasters only; no private PDF coordinates or dimensions.
'use strict';
const assert=require('node:assert/strict'),{localizeTargetContour:relocalize}=require('../dist/plan-reconstruction.js'),V=require('../dist/plan-reconstruction-vision.js'),R=require('../dist/plan-reconstruction.js');
const actual=[[300,250],[1150,250],[1150,800],[300,800]],projected=[[302.5,250],[1152.5,250],[1152.5,800],[302.5,800]];
function fixture({omitInnerTop=false,colour=[0,0,0],gap=false,ambiguous=false}={}){const image={width:1600,height:1000,data:new Uint8ClampedArray(1600*1000*4).fill(255)};
 function stroke(a,b,width=3,color=colour){const len=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let n=0;n<=len;n++)for(let dy=-Math.floor(width/2);dy<=Math.floor(width/2);dy++)for(let dx=-Math.floor(width/2);dx<=Math.floor(width/2);dx++){const x=Math.round(a[0]+(b[0]-a[0])*n/len)+dx,y=Math.round(a[1]+(b[1]-a[1])*n/len)+dy;if(x>=0&&x<image.width&&y>=0&&y<image.height)image.data.set([...color,255],(y*image.width+x)*4);}}
 actual.forEach((a,i)=>stroke(a,actual[(i+1)%actual.length]));const inner=[[312,262],[1138,262],[1138,788],[312,788]];inner.forEach((a,i)=>stroke(a,inner[(i+1)%inner.length]));
 if(omitInnerTop)for(let y=255;y<=320;y++)for(let x=310;x<=314;x++)image.data.set([255,255,255,255],(y*image.width+x)*4);
 if(gap)for(let y=450;y<=510;y++)for(let x=290;x<=320;x++)image.data.set([255,255,255,255],(y*image.width+x)*4);
 if(ambiguous){stroke([305,250],[305,800],1);stroke([314,250],[314,800],1);}
 return image;
}
const image=fixture(),before=projected.map(p=>p.slice()),bytes=Buffer.from(image.data),out=relocalize(image,projected);
assert.equal(out.status,'proposed');assert.deepEqual(out.points,actual,'source corner pairs localize the target itself, not its donor or the dimension endpoints');assert.deepEqual(projected,before);assert.deepEqual(Buffer.from(image.data),bytes);assert.ok(out.sourceEdgeEvidence.every(e=>e.status==='proposed'));assert.ok(out.edges.every(e=>e.status==='observed'&&e.residual<=e.tolerancePx));
const bounds=p=>{const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];};
const dim={anchors:[[299,150],[1149,150]]};assert.equal(R.floorExtentEvidence(dim,{points:projected,sourceBounds:bounds(projected)},image),null,'the previous donor-derived extrema fail the unchanged association guard');assert.ok(R.floorExtentEvidence(dim,{points:out.points,sourceBounds:bounds(out.points)},image));
assert.equal(relocalize(fixture({gap:true}),projected).status,'unresolved','two nice corners cannot fill a missing target wall');
assert.equal(relocalize(fixture({colour:[0,170,190]}),projected).status,'unresolved','coloured annotations cannot localize black wall strokes');
const partial=relocalize(fixture({omitInnerTop:true}),projected);assert.equal(partial.status,'proposed');assert.equal(partial.points[0][0],projected[0][0],'one corner pair cannot move the whole edge');assert.equal(partial.points[3][0],projected[3][0]);
const amb=relocalize(fixture({ambiguous:true}),projected);assert.equal(amb.points[0][0],projected[0][0],'two competing target strokes remain unresolved');assert.equal(amb.edges[3].status,'unresolved');
assert.equal(relocalize(image,projected.map(([x,y])=>[x+20,y])).status,'unresolved','source localization never expands the existing boundary search window');
assert.equal(relocalize(image,[[300,250],[300,250],[1150,800]]).status,'unresolved');
assert.deepEqual(JSON.parse(JSON.stringify(out)),out,'both projected and newly observed source positions survive persistence');
console.log('PASS target contour localization: paired corners, two endpoints, complete target support, immutable donor, explicit ambiguous/missing/coloured sources');
