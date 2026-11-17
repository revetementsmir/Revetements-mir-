'use strict';
const assert=require('node:assert/strict'),V=require(process.env.VISION_MODULE||'../dist/plan-reconstruction-vision.js');
function fixture({frames=true,mullions=true,cap=true,rail=true,coloured=false,dimensionCaps=false,laterText=false,door=false,arc=true,solid=false,nearby=false,rotation=0,scale=1}={}){
 const baseWidth=1000,baseHeight=700,width=Math.round((rotation?baseHeight:baseWidth)*scale),height=Math.round((rotation?baseWidth:baseHeight)*scale),image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};
 const transform=([x,y])=>rotation?[(baseHeight-y)*scale,x*scale]:[x*scale,y*scale];
 const dot=(x,y,color=[0,0,0])=>{[x,y]=transform([x,y]).map(Math.round);if(x>=0&&y>=0&&x<width&&y<height)image.data.set([...color,255],(y*width+x)*4);};
 const line=(a,b,color=[0,0,0])=>{const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*scale*2));for(let i=0;i<=n;i++)dot(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,color);};
 const points=[[100,100],[900,100],[900,600],[100,600]].map(transform),windows=solid?[]:nearby?[[250,310],[320,380]]:[[250,310],[650,710]],gaps=[...windows,...(door?[[450,490]]:[])].sort((a,b)=>a[0]-b[0]);
 for(const p of [[[100,100],[900,100]],[[100,100],[100,600]],[[900,100],[900,600]]])line(...p);
 for(const y of [589,600]){let left=100;for(const [a,b]of gaps){line([left,y],[a,y]);left=b;}line([left,y],[900,y]);}
 for(const x of [190,410,550,790])line([x,589],[x,600]); // joints do not turn the white wall cavity into openings
 const color=coloured?[0,170,210]:[80,80,80];
 if(frames)for(const [a,b]of windows){
  if(rail)for(const y of [590,595,599])line([a,y],[b,y],color);
  if(cap)for(const x of [a,b])line([x,589],[x,600],color);
  if(dimensionCaps)for(const x of [a,b])line([x,530],[x,640]);
  if(laterText)for(const x of [a,b]){line([x,606],[x,620]);line([x,569],[x,583]);}
  if(mullions)line([(a+b)/2,589],[(a+b)/2,600],color);
 }
 if(door){for(const x of [450,490])line([x,589],[x,600]);line([490,590],[490,550]);if(arc)for(let d=0;d<=90;d+=.25){const a=d*Math.PI/180;dot(490-40*Math.cos(a),590-40*Math.sin(a),[90,90,90]);}}
 return {image,points,windows:windows.map(pair=>pair.map(x=>transform([x,600])))};
}
const f=fixture(),pixels=Buffer.from(f.image.data),result=V.floorOpenings(f.image,f.points);
assert.equal(result.length,2,'two source frames, not the white cavities of the three solid wall spans');
for(const expected of f.windows){const opening=result.find(g=>expected.every(p=>g.anchors.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=2)));assert.ok(opening,'the outer jambs bound one window even when a mullion splits its panes');assert.equal(opening.sourcePixelEvidence.kind,'observed-floor-frame');assert.equal(opening.sourcePixelEvidence.metricWidth,null);assert.equal(opening.confirmationRequired,true);assert.equal(opening.status,'proposed');assert.ok(opening.sourcePixelEvidence.jambs.every(j=>j.support>=.9));assert.ok(opening.sourcePixelEvidence.neighbours.every(n=>n.before.support>=.9&&n.after.support>=.9));assert.ok(opening.sourcePixelEvidence.rail.support>=.85);}
assert.deepEqual(Buffer.from(f.image.data),pixels,'evidence recognition must not paint into the source');assert.deepEqual(JSON.parse(JSON.stringify(result)),result,'source points and evidence survive persistence');
for(const options of [{solid:true},{frames:false},{cap:false,mullions:false},{rail:false,mullions:false},{coloured:true},{dimensionCaps:true}]){const f=fixture(options);assert.deepEqual(V.floorOpenings(f.image,f.points),[],JSON.stringify(options)+' does not establish an opening');}
const separateMarks=fixture({laterText:true});assert.equal(V.floorOpenings(separateMarks.image,separateMarks.points).length,2,'a visible break beyond the finite jamb separates unrelated source marks');
const close=fixture({nearby:true});assert.equal(V.floorOpenings(close.image,close.points).length,2,'an actual wall pier must keep neighbouring windows separate');
for(const options of [{rotation:90},{scale:1.5},{rotation:90,scale:1.5}]){const f=fixture(options),openings=V.floorOpenings(f.image,f.points);assert.equal(openings.length,2,JSON.stringify(options));for(const expected of f.windows)assert.ok(openings.some(g=>expected.every(p=>g.anchors.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=3))),JSON.stringify(options)+' keeps the actual source frame');}
const reversed=V.floorOpenings(f.image,f.points.slice().reverse());assert.equal(reversed.length,2);for(const e of result)assert.ok(reversed.some(q=>e.anchors.every(p=>q.anchors.some(a=>Math.hypot(...a.map((n,i)=>n-p[i]))<=2))));
// A wide window in a short return leaves less than half of the complete
// edge occupied by wall ink. Both actual adjacent wall portions, not a page
// wide density vote, must prove the skins beside this source frame.
{
 const image={width:1000,height:700,data:new Uint8ClampedArray(1000*700*4).fill(255)},points=[[150,100],[800,100],[800,550],[560,550],[560,500],[150,500]],stroke=(a,b)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/n),y=Math.round(a[1]+(b[1]-a[1])*i/n);image.data.set([0,0,0,255],(y*image.width+x)*4);}};
 for(let i=0;i<points.length;i++)if(i!==2)stroke(points[i],points[(i+1)%points.length]);
 for(const [y,l,r]of [[550,560,800],[539,571,789]]){stroke([l,y],[620,y]);stroke([750,y],[r,y]);}
 for(const y of [540,545,549])stroke([620,y],[750,y]);for(const x of [620,685,750])stroke([x,539],[x,550]);
 const openings=V.floorOpenings(image,points);assert.equal(openings.length,1,'short return with a wide source frame');assert.equal(openings[0].edgeIndex,2);assert.ok(openings[0].anchors.every(p=>[620,750].some(x=>Math.abs(p[0]-x)<=2)));assert.ok(openings[0].sourcePixelEvidence.neighbours.every(n=>n.before.support>=.9&&n.after.support>=.9));
}
const d=fixture({door:true}),boundary=V.floorBoundaryEvidence(d.image,d.points),doors=boundary.flatMap(e=>e.openingEvidence||[]);assert.equal(doors.length,1,'the existing door recognizer independently proves the swing');
const all=V.floorOpenings(d.image,d.points,{boundaryEvidence:boundary});assert.equal(all.length,3,'retain the source-proven door together with the two window frames');assert.equal(all.filter(g=>g.sourcePixelEvidence.kind==='observed-door-swing').length,1);
const unrelated=JSON.parse(JSON.stringify(boundary));for(const e of unrelated)e.anchors[0][0]+=10;assert.equal(V.floorOpenings(d.image,d.points,{boundaryEvidence:unrelated}).length,2,'another contour’s cached evidence cannot create a door');
const broken=fixture({door:true,arc:false}),missing=V.floorBoundaryEvidence(broken.image,broken.points);assert.equal(missing.flatMap(e=>e.openingEvidence||[]).length,0);assert.equal(V.floorOpenings(broken.image,broken.points,{boundaryEvidence:missing}).length,2,'an unexplained wall gap remains absent from opening seeds');
console.log('PASS floor opening evidence: real wall skins, finite jambs and shared glazing rail; no cavity/mask/blank-gap windows; panes grouped while wall piers stay distinct; source-proven doors, orientation, immutable provenance');
