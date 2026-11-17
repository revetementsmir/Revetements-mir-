'use strict';const assert=require('node:assert/strict'),V=require(process.env.VISION_MODULE||'../dist/plan-reconstruction-vision.js');
function fixture({corner=true,shortCorner=false,arc=true,gap=false,rotation=false}={}){
 const width=rotation?650:1000,height=rotation?1000:650,image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)},transform=([x,y])=>rotation?[650-y,x]:[x,y],dot=(x,y)=>{[x,y]=transform([x,y]).map(Math.round);if(x>=0&&y>=0&&x<width&&y<height)image.data.set([0,0,0,255],(y*width+x)*4);},line=(a,b)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++)dot(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n);};
 const source=[[150,150],[850,150],[850,550],[425,550],[425,580],[150,580]];for(let i=0;i<source.length;i++)if(i!==2&&i!==3)line(source[i],source[(i+1)%source.length]);
 if(corner)line([425,550],[425,shortCorner?554:580]);for(const y of [540,550]){line([y===540?435:425,y],[gap?433:450,y]);line([490,y],[850,y]);}
 for(const x of [450,490])line([x,540],[x,550]);line([490,540],[490,500]);if(arc)for(let d=0;d<=90;d+=.25){const a=d*Math.PI/180;dot(490-40*Math.cos(a),540-40*Math.sin(a));}
 return {image,points:source.map(transform)};
}
const f=fixture(),e=V.floorBoundaryEvidence(f.image,f.points)[2];assert.equal(e.status,'proposed');assert.equal(e.openingEvidence.length,1);assert.ok(e.openingEvidence[0].leftWall.termination||e.openingEvidence[0].rightWall.termination);assert.ok(e.openingEvidence[0].arc.support>=.82);assert.equal(e.openingEvidence[0].metricWidth,null);
for(const opts of [{corner:false},{shortCorner:true},{arc:false},{gap:true}]){const f=fixture(opts);assert.equal(V.floorBoundaryEvidence(f.image,f.points)[2].status,'unresolved',JSON.stringify(opts));}
const r=fixture({rotation:true});assert.equal(V.floorBoundaryEvidence(r.image,r.points)[2].status,'proposed');
console.log('PASS source door near a real wall return; absent/short returns, broken wall and absent arc rejected');
