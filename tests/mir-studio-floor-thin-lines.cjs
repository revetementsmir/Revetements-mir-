'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js'),M=require('../dist/plan-level-model.js');

function raster(width=1200,height=800){return {width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};}
function line(image,a,b,{width=1,color=[0,0,0]}={}){
 const length=Math.hypot(b[0]-a[0],b[1]-a[1]),radius=Math.floor(width/2);
 for(let n=0;n<=length;n++){const x=Math.round(a[0]+(b[0]-a[0])*n/(length||1)),y=Math.round(a[1]+(b[1]-a[1])*n/(length||1));for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(x+dx>=0&&x+dx<image.width&&y+dy>=0&&y+dy<image.height)image.data.set([...color,255],((y+dy)*image.width+x+dx)*4);}
}
function rectangle(image,[left,top,right,bottom],options){const points=[[left,top],[right,top],[right,bottom],[left,bottom]];points.forEach((p,i)=>line(image,p,points[(i+1)%4],options));}
function erase(image,[left,top,right,bottom]){for(let y=Math.max(0,Math.floor(top));y<=Math.min(image.height-1,Math.ceil(bottom));y++)for(let x=Math.max(0,Math.floor(left));x<=Math.min(image.width-1,Math.ceil(right));x++)image.data.set([255,255,255,255],(y*image.width+x)*4);}
function fill(image,[left,top,right,bottom],color=[0,0,0]){for(let y=Math.max(0,Math.round(top));y<=Math.min(image.height-1,Math.round(bottom));y++)for(let x=Math.max(0,Math.round(left));x<=Math.min(image.width-1,Math.round(right));x++)image.data.set([...color,255],(y*image.width+x)*4);}
function enclosure(image,bounds,{partitions=true,color=[0,0,0]}={}){
 const [l,t,r,b]=bounds,band=Math.round(Math.min(r-l,b-t)*.025),options={color};rectangle(image,bounds,options);rectangle(image,[l+band,t+band,r-band,b-band],options);
 if(partitions){const x=Math.round(l+(r-l)*.42),y=Math.round(t+(b-t)*.42),gap=Math.max(5,Math.round(band*.7));for(const xx of [x,x+gap])line(image,[xx,t+band],[xx,b-band],options);for(const yy of [y,y+gap])line(image,[l+band,yy],[r-band,yy],options);}
 return band;
}
function connectedEnclosure(image,bounds,{axis='both',partitions=true,color=[0,0,0]}={}){
 const band=enclosure(image,bounds,{partitions,color}),[l,t,r,b]=bounds,mx=Math.round((l+r)/2),my=Math.round((t+b)/2),half=Math.round(Math.min(r-l,b-t)*.045);
 // The short solid blocks are long enough to survive directional opening.
 // They join the wall skins into wide components while leaving their
 // middle empty over the rest of the wall's actual observed span.
 if(axis!=='x'){fill(image,[l,my-half,l+band,my+half],color);fill(image,[r-band,my-half,r,my+half],color);}
 if(axis!=='y'){fill(image,[mx-half,t,mx+half,t+band],color);fill(image,[mx-half,b-band,mx+half,b],color);}
 return band;
}
function transpose(image){const result=raster(image.height,image.width);for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)result.data.set(image.data.subarray((y*image.width+x)*4,(y*image.width+x)*4+4),(x*result.width+y)*4);return result;}
function componentAxes(image,vertical){
 const ink=V.monochrome(image),minimum=18,mask=V.opening(V.closing(ink,image.width,image.height,vertical?0:1,vertical?1:0),image.width,image.height,vertical?0:minimum/2,vertical?minimum/2:0);
 return V.components(mask,image.width,image.height).flatMap(c=>V.componentAxisSegments(c,ink,image.width,vertical,minimum,1));
}

for(const vertical of [true,false]){
 const source=raster(240,500);line(source,[80,60],[80,440]);line(source,[94,60],[94,440]);fill(source,[80,230,94,270]);
 const image=vertical?source:transpose(source),original=Buffer.from(image.data),axes=componentAxes(image,vertical),long=axes.filter(s=>s.length>300);
 assert.deepEqual(long.map(s=>({at:s.at,start:s.start,end:s.end})),[{at:80,start:60,end:440},{at:94,start:60,end:440}],'connected skins retain two occupied longitudinal axes');
 assert.ok(!axes.some(s=>s.at>80&&s.at<94&&(s.start<230||s.end>270)),'an axis inside the white channel cannot inherit the skins\' length');assert.deepEqual(Buffer.from(image.data),original);
 const solid=raster(240,500);fill(solid,[80,60,94,440]);const solidAxes=componentAxes(vertical?solid:transpose(solid),vertical);
 assert.equal(solidAxes.length,1,'one filled thick stroke cannot create two independent wall skins');assert.equal(solidAxes[0].length,381);assert.ok(solidAxes[0].at>=80&&solidAxes[0].at<=94);
 const staggered=raster(240,500);for(let n=0;n<8;n++){const x=n%2?94:80,y=60+n*40;line(staggered,[x,y],[x,y+40]);if(n)fill(staggered,[80,y-12,94,y+12]);}
 const staggeredAxes=componentAxes(vertical?staggered:transpose(staggered),vertical);
 assert.ok(staggeredAxes.length>1);assert.ok(staggeredAxes.every(s=>s.length<=65),'staggered runs and transverse blocks do not produce a continuous median axis');
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

// Connected wall skins must survive as two source axes, not as the white
// centre of their component. Each orientation and source resolution has
// independent, observed corners; no opening is filled by this recovery.
for(const scale of [.75,1,1.4])for(const axis of ['x','y','both']){
 const image=raster(Math.round(1200*scale),Math.round(800*scale)),bounds=[300,70,860,680].map(v=>Math.round(v*scale));connectedEnclosure(image,bounds,{axis});
 const original=Buffer.from(image.data),result=V.floorEnvelope(image,{sourceViewId:'synthetic-connected-'+axis+'-'+scale});
 assert.equal(result.status,'proposed','connected '+axis+' wall skins at scale '+scale);assert.equal(result.method,'paired-source-wall-enclosure');
 assert.deepEqual(result.points,[[bounds[0],bounds[1]],[bounds[2],bounds[1]],[bounds[2],bounds[3]],[bounds[0],bounds[3]]],'the four retained axes lie on source wall skins, not an averaged component centre');
 assert.ok(result.sourceEdgeEvidence.every(e=>e.support>=.94&&e.pairedSupport>=.55));assert.deepEqual(Buffer.from(image.data),original,'wide-component recovery leaves source pixels unchanged');
}

const connectedFurniture=raster();connectedEnclosure(connectedFurniture,[300,70,860,680],{partitions:false});assert.equal(V.floorEnvelope(connectedFurniture).status,'unresolved','connected furniture edges still lack an interior wall network');
const connectedTable=raster();connectedEnclosure(connectedTable,[300,70,860,680]);assert.equal(V.floorEnvelope(connectedTable,{rows:[{text:'LÉGENDE',box:[500,150,650,170],confidence:95}]}).status,'unresolved','a connected table cannot bypass the document-label guard');
const connectedColour=raster();connectedEnclosure(connectedColour,[300,70,860,680],{color:[0,170,10]});assert.equal(V.floorEnvelope(connectedColour).status,'unresolved','coloured connected bands cannot supply source axes');
const connectedOpen=raster();connectedEnclosure(connectedOpen,[300,70,860,680]);erase(connectedOpen,[650,660,735,690]);assert.equal(V.floorEnvelope(connectedOpen).status,'unresolved','the new axes do not close an observed open interval');
const connectedMissingCorner=raster();connectedEnclosure(connectedMissingCorner,[300,70,860,680]);erase(connectedMissingCorner,[295,65,325,95]);assert.equal(V.floorEnvelope(connectedMissingCorner).status,'unresolved','connected skins do not invent a missing corner');

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

console.log('PASS floor source geometry: duplicate corners preserved, thin and connected wall skins at three scales and both orientations, occupied axes without empty medians, thick/zigzag negatives, dimension/legend/furniture/colour/open-boundary guards, ambiguous floors rejected, and final segments checked against source ink');
