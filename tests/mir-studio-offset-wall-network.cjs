'use strict';
const assert=require('node:assert/strict'),V=require(process.env.VISION_MODULE||'../dist/plan-reconstruction-vision.js'),M=require('../dist/plan-level-model.js');
function image(w=1100,h=760){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)};}
function line(im,a,b,width=1,color=[0,0,0]){const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]))),r=Math.floor(width/2);for(let i=0;i<=n;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/n),y=Math.round(a[1]+(b[1]-a[1])*i/n);for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(x+dx>=0&&y+dy>=0&&x+dx<im.width&&y+dy<im.height)im.data.set([...color,255],((y+dy)*im.width+x+dx)*4);}}
function erase(im,[l,t,r,b]){for(let y=t;y<=b;y++)for(let x=l;x<=r;x++)im.data.set([255,255,255,255],(y*im.width+x)*4);}
function parallel(points,depth){return points.map((p,i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length],a=[p[0]-prev[0],p[1]-prev[1]],b=[next[0]-p[0],next[1]-p[1]];return [p[0]-depth*(a[1]/Math.hypot(...a)+b[1]/Math.hypot(...b)),p[1]+depth*(a[0]/Math.hypot(...a)+b[0]/Math.hypot(...b))];});}
const footprint=[[230,150],[850,150],[850,510],[700,510],[700,450],[520,450],[520,590],[230,590]];
function fixture({frame=true,cap=true,rails=true,colour=false,partitions=true,gap=false}={}){
 const im=image(),color=colour?[0,165,35]:[0,0,0];for(const polygon of [footprint,parallel(footprint,10)])polygon.forEach((p,i)=>line(im,p,polygon[(i+1)%polygon.length],3,color));
 if(partitions){for(const x of [430,440])line(im,[x,160],[x,580],3,color);for(const y of [320,330])line(im,[240,y],[840,y],3,color);}
 erase(im,[550,435,680,455]);
 if(frame){for(const y of rails?[437,445,453]:[437])line(im,[549,y],[681,y],1,color);if(cap)for(const x of [549,681])line(im,[x,437],[x,453],3,color);}
 // A casement swing and dimension ticks are connected to the source frame,
 // but lie outside the wall. Their filled ink must not grow the footprint.
 const center=[680,445],radius=55;for(let i=0;i<60;i++){const a=i/60*Math.PI/2,b=(i+1)/60*Math.PI/2;line(im,[center[0]-radius*Math.cos(a),center[1]+radius*Math.sin(a)],[center[0]-radius*Math.cos(b),center[1]+radius*Math.sin(b)],1,color);}
 line(im,center,[641,484],1,color);line(im,[546,456],[546,493],1,color);line(im,[684,456],[684,493],1,color);line(im,[545,485],[570,485],1,color);line(im,[660,485],[685,485],1,color);
 // A genuine missing interval has no source frame or wall continuation.
 if(gap)erase(im,[837,225,853,275]);
 return im;
}

const im=fixture(),before=Buffer.from(im.data),frame={units:'pixels',rasterSize:[im.width,im.height],pdfToRaster:[1,0,0,-1,0,im.height],cropToRaster:[1,0,0,1,0,0]},result=V.floorEnvelope(im,{sourceViewId:'synthetic-framed-multirecess',frame});
assert.equal(result.status,'proposed');assert.equal(result.method,'paired-source-framed-wall-network');assert.equal(result.points.length,footprint.length);assert.deepEqual(M.validatePolygon(result.points),[]);
for(const p of footprint)assert.ok(result.points.some(q=>M.distance(p,q)<=4),'real source corner retained '+p);
assert.ok(result.sourceEdgeEvidence.every(e=>e.status==='proposed'&&(e.provenSupport??e.support)>=.94));assert.ok(result.sourceFrameConnections.length);assert.ok(result.sourceFrameConnections.every(c=>c.outer?.support>=.95&&c.parallel?.support>=.95&&c.jambs.every(j=>j.support>=.9)));assert.ok(result.sourceFrameConnections.some(c=>c.method==='offset-source-frame-with-finite-jambs-and-wall-skin-contact'));assert.ok(result.sourceEdgeEvidence.every(e=>Number.isFinite(e.support)),'raw support is retained even when its frame proof is needed elsewhere');
assert.equal(result.sourceViewId,'synthetic-framed-multirecess');assert.deepEqual(result.sourceFrame,frame);assert.equal(result.metricScale,null);assert.equal(result.confirmationRequired,true);assert.deepEqual(Buffer.from(im.data),before,'source pixels remain unchanged');
for(const [name,opts]of [['missing interval',{gap:true}],['missing jamb',{cap:false}],['coloured mask',{colour:true}]])assert.equal(V.floorEnvelope(fixture(opts)).status,'unresolved',name+' cannot create a wall closure');
for(const [name,opts]of [['no frame',{frame:false}],['one rail',{rails:false}]])assert.notEqual(V.floorEnvelope(fixture(opts)).method,'paired-source-framed-wall-network',name+' cannot satisfy the new source-frame contract');
for(const rows of [[{text:'WINDOW SCHEDULE',box:[350,240,600,260],confidence:95}],[{text:'PROJECT NAME',box:[350,240,600,260],confidence:95},{text:'SCALE',box:[350,280,440,300],confidence:95}]])assert.equal(V.floorEnvelope(fixture(),{rows}).status,'unresolved','a labelled schedule/cartouche cannot become a source wall network');
function rotated(source){const out=image(source.height,source.width);for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)out.data.set(source.data.subarray((y*source.width+x)*4,(y*source.width+x)*4+4),(x*out.width+source.height-1-y)*4);return out;}
for(const [name,source,expected]of [['quarter turn',rotated(fixture()),footprint.map(([x,y])=>[759-y,x])]]){const result=V.floorEnvelope(source);assert.equal(result.status,'proposed',name);assert.deepEqual(M.validatePolygon(result.points),[]);assert.equal(result.points.length,expected.length,name+' keeps every physical return');for(const p of expected)assert.ok(result.points.some(q=>M.distance(p,q)<7),name+' keeps the source corner '+p);}
console.log('PASS source framed wall network: frame rails and jambs recover true multi-retreat envelope without dimension/swing excursions; real gaps/missing jambs/masks stay unresolved; unproved frames cannot enter the new path');
