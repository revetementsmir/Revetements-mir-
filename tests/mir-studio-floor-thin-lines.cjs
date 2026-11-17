'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js'),M=require('../dist/plan-level-model.js');

function raster(width=1200,height=800){return {width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};}
function line(image,a,b,{width=1,color=[0,0,0]}={}){
 const length=Math.hypot(b[0]-a[0],b[1]-a[1]),radius=Math.floor(width/2);
 for(let n=0;n<=length;n++){const x=Math.round(a[0]+(b[0]-a[0])*n/(length||1)),y=Math.round(a[1]+(b[1]-a[1])*n/(length||1));for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(x+dx>=0&&x+dx<image.width&&y+dy>=0&&y+dy<image.height)image.data.set([...color,255],((y+dy)*image.width+x+dx)*4);}
}
function rectangle(image,[left,top,right,bottom],options){const points=[[left,top],[right,top],[right,bottom],[left,bottom]];points.forEach((p,i)=>line(image,p,points[(i+1)%4],options));}
function erase(image,[left,top,right,bottom]){for(let y=Math.max(0,Math.floor(top));y<=Math.min(image.height-1,Math.ceil(bottom));y++)for(let x=Math.max(0,Math.floor(left));x<=Math.min(image.width-1,Math.ceil(right));x++)image.data.set([255,255,255,255],(y*image.width+x)*4);}
function enclosure(image,bounds,{partitions=true,color=[0,0,0]}={}){
 const [l,t,r,b]=bounds,band=Math.round(Math.min(r-l,b-t)*.025),options={color};rectangle(image,bounds,options);rectangle(image,[l+band,t+band,r-band,b-band],options);
 if(partitions){const x=Math.round(l+(r-l)*.42),y=Math.round(t+(b-t)*.42),gap=Math.max(5,Math.round(band*.7));for(const xx of [x,x+gap])line(image,[xx,t+band],[xx,b-band],options);for(const yy of [y,y+gap])line(image,[l+band,yy],[r-band,yy],options);}
 return band;
}

// Snapping a pair of neighbouring points to the same physical corner must
// retain that corner once, including when the duplicate crosses the seam.
const square=[[0,0],[80,0],[80,60],[0,60]],duplicated=[...square,[0,0]];
assert.equal(V.removeStraight(duplicated).length,4);
assert.equal(Math.abs(M.signedArea(V.removeStraight(duplicated))),4800,'no diagonal can replace the repeated closing corner');
const snapped=V.consolidateAxes([[0,0],[1,0],[80,0],[80,60],[0,60],[0,1]],2);
assert.equal(snapped.length,4);assert.equal(Math.abs(M.signedArea(snapped)),4800);
assert.deepEqual(V.removeStraight([[0,0],[40,0],[80,0],[80,60],[0,60]]),square,'real collinear points are still removed');

for(const scale of [1,.75,1.4]){
 const image=raster(Math.round(1200*scale),Math.round(800*scale)),bounds=[300,70,860,680].map(v=>Math.round(v*scale)),before=()=>Buffer.from(image.data);
 enclosure(image,bounds);
 // A thick, narrow legend dominates the old erosion; a thin dimension
 // branch connects to the house but does not have paired wall corners.
 rectangle(image,[50,180,120,750].map(v=>Math.round(v*scale)),{width:5});
 line(image,[265,300].map(v=>Math.round(v*scale)),[265,500].map(v=>Math.round(v*scale)));
 for(const y of [300,500])line(image,[250,y].map(v=>Math.round(v*scale)),[320,y].map(v=>Math.round(v*scale)));
 const original=before(),frame={units:'pixels',rasterSize:[image.width,image.height],pdfToRaster:[scale,0,0,-scale,0,image.height],cropToRaster:[1,0,0,1,0,0]},rows=[{text:'LÉGENDE',box:[60,200,115,220].map(v=>v*scale),confidence:95}],result=V.floorEnvelope(image,{sourceViewId:'synthetic-thin-'+scale,frame,rows});
 assert.equal(result.status,'proposed','thin walls survive at scale '+scale);assert.equal(result.method,'paired-source-wall-enclosure');assert.equal(result.points.length,4);assert.deepEqual(M.validatePolygon(result.points),[]);
 for(const [index,p]of [[0,[bounds[0],bounds[1]]],[1,[bounds[2],bounds[1]]],[2,[bounds[2],bounds[3]]],[3,[bounds[0],bounds[3]]]])assert.ok(M.distance(result.points[index],p)<=2,'observed corner '+index+' at scale '+scale);
 assert.equal(result.sourceCorners.length,4);assert.ok(result.sourceCorners.every(c=>c.point.length===2&&c.innerPoint.length===2));assert.ok(result.sourceEdgeEvidence.every(e=>e.support>=.94&&e.pairedSupport>=.55));
 assert.deepEqual(result.sourceFrame,frame);assert.equal(result.sourceViewId,'synthetic-thin-'+scale);assert.equal(result.metricScale,null);assert.equal(result.confirmationRequired,true);assert.deepEqual(Buffer.from(image.data),original,'proposal extraction never changes the source pixels');
}

// A closed double outline alone is equally consistent with furniture.
const furniture=raster();enclosure(furniture,[300,70,860,680],{partitions:false});assert.equal(V.floorEnvelope(furniture).status,'unresolved');
const table=raster();enclosure(table,[300,70,860,680]);assert.equal(V.floorEnvelope(table,{rows:[{text:'WINDOW SCHEDULE',box:[580,150,760,170],confidence:95}]}).status,'unresolved','a labelled schedule does not become a building');
const cartouche=raster();enclosure(cartouche,[300,70,860,680]);assert.equal(V.floorEnvelope(cartouche,{rows:[{text:'NOM DU PROJET',box:[580,150,760,170],confidence:95},{text:'ÉCHELLE',box:[580,200,640,220],confidence:95},{text:'DATE',box:[580,250,620,270],confidence:95}]}).status,'unresolved','a double page/cartouche frame with internal table lines is not a floor');
const crossings=raster();enclosure(crossings,[300,70,860,680]);for(const x of [300,860])line(crossings,[x,35],[x,715]);assert.equal(V.floorEnvelope(crossings).status,'unresolved','two rails crossing a source wall do not prove a terminal corner');
const colour=raster();enclosure(colour,[300,70,860,680],{color:[0,170,10]});assert.equal(V.floorEnvelope(colour).status,'unresolved','coloured annotations cannot supply the four wall corners');
const open=raster();enclosure(open,[300,70,860,680]);erase(open,[640,660,750,690]);assert.equal(V.floorEnvelope(open).status,'unresolved','an unproved opening cannot be closed by its bounding box');
const missingCorner=raster();enclosure(missingCorner,[300,70,860,680]);erase(missingCorner,[295,65,325,95]);assert.equal(V.floorEnvelope(missingCorner).status,'unresolved','both source strokes must meet at each retained corner');
const dimensions=raster();for(const x of [280,300,860,880])line(dimensions,[x,50],[x,710]);for(const y of [50,70,680,700])line(dimensions,[260,y],[900,y]);assert.equal(V.floorEnvelope(dimensions).status,'unresolved','parallel dimension rails without an interior wall network are insufficient');
const competing=raster(1500,900);enclosure(competing,[180,160,620,760]);enclosure(competing,[860,160,1300,760]);assert.equal(V.floorEnvelope(competing).status,'unresolved','two disjoint buildings do not silently become one selected floor');

// The final-edge guard compares the actual proposed segment to source ink.
// A real diagonal remains possible; a closing diagonal through white rooms
// cannot be justified by nearby axis-aligned wall strokes.
const boundary=raster(700,500),outer=[[120,100],[570,100],[570,390],[120,390]];outer.forEach((p,i)=>line(boundary,p,outer[(i+1)%outer.length],{width:5}));
assert.ok(V.floorBoundaryEvidence(boundary,outer).every(e=>e.status==='proposed'));
const cut=[outer[1],outer[2],outer[3]],cutEvidence=V.floorBoundaryEvidence(boundary,cut);assert.equal(cutEvidence.at(-1).status,'unresolved');assert.ok(cutEvidence.at(-1).support<.2);
line(boundary,outer[3],outer[1],{width:3});assert.equal(V.floorBoundaryEvidence(boundary,cut).at(-1).status,'proposed','a genuinely drawn diagonal is supported');

console.log('PASS floor source geometry: duplicate corners preserved, thin wall enclosure with real paired corners at three scales, dimension/legend/furniture/colour/open-boundary negatives, ambiguous floors rejected, and final segments checked against source ink');
