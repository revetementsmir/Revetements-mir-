'use strict';
// Invented source drawings only. Dense, individually closed hatch cells leave
// no large connected white interior. Roof evidence comes from the closed
// fascia face and the actual independent slope strokes, never from posts.
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js');
function scene({scale=1,slopes=true,faceClosed=true,apex=true,extraRoof=false,markupOnly=false,posts=false,hatch=true}={}){
 const width=Math.round(560*scale),height=Math.round(430*scale),image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};
 const put=(x,y,c=[0,0,0])=>{x=Math.round(x*scale);y=Math.round(y*scale);if(x>=0&&y>=0&&x<width&&y<height)image.data.set([...c,255],(y*width+x)*4);};
 const line=(x1,y1,x2,y2,c=[0,0,0])=>{const n=Math.ceil(Math.hypot(x2-x1,y2-y1)*scale*1.5);for(let i=0;i<=n;i++)put(x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,c);};
 const rect=(x,y,w,h,c)=>{line(x,y,x+w,y,c);line(x+w,y,x+w,y+h,c);line(x+w,y+h,x,y+h,c);line(x,y+h,x,y,c);};
 const left=150,right=334,eave=292,peak=[227,240],bottom=304;
 for(let y=178;y<eave;y+=11)line(120,y,390,y,[175,175,175]);rect(197,183,68,30,[100,100,100]);
 // The white roof region is subdivided in both directions by hatch strokes.
 for(let y=peak[1];y<=eave;y++)for(let x=left;x<=right;x++)if(y>= (x<=peak[0]?eave-(eave-peak[1])*(x-left)/(peak[0]-left):peak[1]+(eave-peak[1])*(x-peak[0])/(right-peak[0])))put(x,y,[255,255,255]);
 if(hatch){for(let y=peak[1]+5;y<eave;y+=8)for(let x=left+1;x<right;x++)if(y> (x<=peak[0]?eave-(eave-peak[1])*(x-left)/(peak[0]-left):peak[1]+(eave-peak[1])*(x-peak[0])/(right-peak[0])))put(x,y,[155,155,155]);for(let x=left+6;x<right;x+=9)for(let y=peak[1]+1;y<eave;y++)if(y> (x<=peak[0]?eave-(eave-peak[1])*(x-left)/(peak[0]-left):peak[1]+(eave-peak[1])*(x-peak[0])/(right-peak[0])))put(x,y,[155,155,155]);}
 if(slopes||markupOnly){const color=markupOnly?[183,220,218]:[0,0,0];line(left,eave,...peak,color);line(...peak,right,eave,color);}
 if(extraRoof){line(left,eave,244,220);line(244,220,right,eave);}
 if(!apex)for(let y=peak[1]-4;y<=peak[1]+7;y++)for(let x=peak[0]-9;x<=peak[0]+9;x++)put(x,y,[255,255,255]);
 line(left,eave,right,eave);line(left,bottom,right,bottom);line(left,eave,left,bottom);if(faceClosed)line(right,eave,right,bottom);
 if(posts){line(left+18,bottom,left+18,height/scale);line(right-18,bottom,right-18,height/scale);}
 const face={status:'proposed',box:[left,eave,right-left,bottom-eave].map(n=>n*scale),anchors:[[left,eave],[right,eave],[right,bottom],[left,bottom]].map(p=>p.map(n=>n*scale)),method:'paired-horizontal-boundaries-and-closed-ends',confirmationRequired:true};
 const envelope={status:'proposed',box:face.box.slice(),sourceViewId:'invented-hatched-entry',sourceFrame:{rasterSize:[width,height]},occlusions:[]};
 return {image,envelope,face,peak:peak.map(n=>n*scale),slopes:[-(eave-peak[1])/(peak[0]-left),(eave-peak[1])/(right-peak[0])]};
}
const detect=s=>V.roofProfile(s.image,s.envelope,[],{entry:true,face:s.face});
function faceProfileFixture(options){const sample=scene(options);return {...sample,profile:detect(sample)};}
module.exports={scene,faceProfileFixture};
if(require.main===module){
for(const scale of [.75,1,1.5]){
 const s=scene({scale}),before=Buffer.from(s.image.data),p=detect(s);
 assert.equal(p.status,'proposed','Closed hatch cells cannot erase independently observed roof slopes.');
 assert.equal(p.method,'face-anchored-source-slopes-and-observed-apex');
 assert.ok(Math.abs(p.points[1][0]-s.peak[0])<2.5*scale&&Math.abs(p.points[1][1]-s.peak[1])<2.5*scale);
 assert.deepEqual(p.points[1],p.points[2],'An observed pointed projection needs no fabricated horizontal ridge.');
 for(let i=0;i<2;i++){assert.ok(Math.abs(p.slopes[i].m-s.slopes[i])<.035);assert.ok(p.slopes[i].fit.sourceSamples.length>=10);}
 assert.deepEqual(p.faceEvidence.box,s.face.box);assert.equal(Buffer.compare(before,Buffer.from(s.image.data)),0,'All source pixels remain immutable.');
}
const original=detect(scene()),cutPosts=detect(scene({posts:true}));assert.deepEqual(cutPosts,original,'Posts that continue beyond the image do not establish or veto the separately proven roof.');
for(const options of [{slopes:false},{faceClosed:false},{apex:false},{extraRoof:true},{slopes:false,markupOnly:true}])assert.notEqual(detect(scene(options)).status,'proposed','Source ambiguity or missing boundaries cannot be replaced by an inferred triangle: '+JSON.stringify(options));
const detached=scene();detached.face.box[1]+=5;detached.face.anchors=detached.face.anchors.map(p=>[p[0],p[1]+5]);assert.notEqual(detect(detached).status,'proposed','A face detached from the true source boundaries cannot anchor a roof.');
const masked=scene();masked.envelope.occlusions=[[masked.peak[0]-8,masked.peak[1]-6,16,16]];assert.notEqual(detect(masked).status,'proposed','An occluded apex stays unresolved.');
console.log('PASS entry face profile: dense closed hatch cells, independently fitted slopes, asymmetric observed apex, scale variants, missing and competing source refusals, immutable pixels and no column-foot dependency.');
}
