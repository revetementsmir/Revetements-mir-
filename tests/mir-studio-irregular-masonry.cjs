'use strict';
const assert=require('node:assert/strict'),E=require('../dist/plan-reconstructed-exterior.js'),M=require('../dist/plan-level-model.js');

// Synthetic narrow ashlar, intentionally unlike regular brick courses.
function sample({kind='stone',caption=true,leader=true,notch=false}={}){
 const width=400,height=300,image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};
 const pixel=(x,y,color=[65,65,65])=>image.data.set([...color,255],(Math.round(y)*width+Math.round(x))*4);
 const line=(a,b,color)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++)pixel(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,color);};
 const rect=(x,y,w,h,color)=>{line([x,y],[x+w,y],color);line([x+w,y],[x+w,y+h],color);line([x+w,y+h],[x,y+h],color);line([x,y+h],[x,y],color);};
 const color=kind==='annotation'?[200,30,30]:undefined;
 if(kind==='wood')for(let y=40;y<240;y+=10)line([160,y],[220,y]);
 else if(kind==='grid')for(let y=40;y<240;y+=10)for(let x=160;x<220;x+=20)rect(x,y,20,10);
 else {let row=0;for(let y=40;y<235;){const h=[7,13,8,10][row%4],end=notch&&y>95?200:220;let x=160,col=0;while(x<end){const w=Math.min([13,21,16,24][(row+col)%4],end-x);if(w>3)rect(x,y,w,h,color);x+=w;col++;}y+=h;row++;}}
 if(leader)line([92,154],[175,177]);
 return {image,box:[150,30,90,220],rows:[{text:caption?'PIERRE':'REVÊTEMENT BOIS',box:[20,148,90,156],source:'pdf-text',confidence:100}],masks:[]};
}
function resize(s,factor){const width=s.image.width*factor,height=s.image.height*factor,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const from=(Math.floor(y/factor)*s.image.width+Math.floor(x/factor))*4;data.set(s.image.data.subarray(from,from+4),(y*width+x)*4);}
 return {image:{width,height,data},box:s.box.map(x=>x*factor),rows:s.rows.map(r=>({...r,box:r.box.map(x=>x*factor)})),masks:s.masks.map(m=>m.map(x=>x*factor))};
}
const inspect=s=>E.irregularMasonry(s.image,s.box,s.rows,{masks:s.masks}),polygons=result=>result.candidates.flatMap(c=>c.polygons),area=result=>polygons(result).reduce((sum,p)=>sum+Math.abs(M.signedArea(p)),0);
const contains=(p,point)=>{let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const s=sample({notch:true}),before=Uint8Array.from(s.image.data),first=inspect(s);
assert.equal(first.status,'proposed');assert.ok(first.candidates.length>0);assert.deepEqual(s.image.data,new Uint8ClampedArray(before));
for(const c of first.candidates){assert.ok(c.cells.length>=8);assert.ok(c.leaders.every(l=>l.support>=.9));assert.equal(c.normalization.basis,'observed-material-caption-height');assert.ok(c.polygons.every(p=>!M.validatePolygon(p).length));}
assert.ok(!polygons(first).some(p=>contains(p,[210,180])),'A notch outside the stone cells must remain empty.');
assert.ok(polygons(first).some(p=>contains(p,[175,90])),'The actual supported stone strip remains present.');
assert.ok(area(first)<70*200,'The source cluster bounding rectangle is not used as a surface.');
assert.deepEqual(inspect(s),first,'Source polygons and their observation order are deterministic.');

const doubled=inspect(resize(s,2));assert.equal(doubled.status,'proposed');
assert.ok(Math.abs(area(doubled)/4-area(first))/area(first)<.06,'A raster resize preserves the observed region up to source-stroke uncertainty.');
assert.ok(!polygons(doubled).some(p=>contains(p,[420,360])),'The scaled notch remains empty.');
for(const options of [{caption:false},{leader:false},{kind:'wood'},{kind:'grid'},{kind:'annotation'}])assert.equal(inspect(sample(options)).candidates.length,0,JSON.stringify(options));
const colouredCourses=sample({kind:'wood',leader:false});colouredCourses.image.data.fill(255);
for(let row=0;row<=8;row++){const y=50+row*20;for(let x=140;x<=360;x++)colouredCourses.image.data.set([200,30,30,255],(y*400+x)*4);if(row<8)for(let x=140+(row%2?25:0);x<=360;x+=50)for(let yy=y;yy<=y+20;yy++)colouredCourses.image.data.set([200,30,30,255],(yy*400+x)*4);}
assert.equal(E.masonryHatches(colouredCourses.image,[140,50,220,160]).length,0,'Even a staggered coloured markup cannot supply masonry geometry through the legacy detector.');
const negated=sample();negated.rows[0].text='SANS PIERRE';assert.equal(inspect(negated).candidates.length,0);
const notes=sample();notes.rows[0].text='NOTES — PIERRE';assert.equal(inspect(notes).candidates.length,0,'A note is not a material leader caption.');
const covered=sample();covered.masks=[[150,30,90,220]];assert.equal(inspect(covered).candidates.length,0,'A legend mask never establishes masonry.');
const broken=sample();for(let y=158;y<176;y++)for(let x=120;x<136;x++)broken.image.data.set([255,255,255,255],(y*400+x)*4);assert.equal(inspect(broken).candidates.length,0,'A missing leader segment is not bridged.');

// An opening or annotation hole is represented by disjoint valid polygons.
// It is never a hidden `holes` field that the existing renderer would ignore.
const holed=sample();holed.masks=[[178,72,25,40],[170,199,25,19]];holed.rows.push({text:'ANNOTATION',box:[170,199,195,218],source:'pdf-text',confidence:100});const cut=inspect(holed);
assert.equal(cut.status,'proposed');assert.ok(polygons(cut).every(p=>!M.validatePolygon(p).length));
for(const point of [[185,90],[180,207]])assert.ok(!polygons(cut).some(p=>contains(p,point)),'Known opening/text masks stay empty.');
assert.ok(area(cut)<area(inspect(sample())),'Masked area is not added to quantities.');

// Exact polygonization is separately checked on a concave region and hole,
// independent of the texture detector's cell thresholds.
const raster=new Uint8Array(40*40);for(let y=2;y<38;y++)for(let x=2;x<38;x++)if(!(x>=12&&x<26&&y>=12&&y<26)&&!(x>=29&&y>=28))raster[y*40+x]=1;
const traced=E.stonePolygons(raster,40,40,[0,0]);assert.equal(traced.status,'observed');
assert.equal(traced.polygons.reduce((n,p)=>n+Math.abs(M.signedArea(p)),0),raster.reduce((n,v)=>n+v,0),'Polygons cover exactly the observed mask, including its concavity and hole.');
assert.ok(traced.polygons.every(p=>!M.validatePolygon(p).length&&p.length<=190));
for(const point of [[16,16],[33,33]])assert.ok(!traced.polygons.some(p=>contains(p,point)));
const partial=E.stonePolygons(raster,40,40,[0,0],{box:[4,4,30,30],masks:[[4,5,30,2]]});assert.ok(partial.polygons.every(p=>p.every(([x,y])=>x>=4&&y>=4&&x<=34&&y<=34)));

// Integration uses the existing calibrated levels, wall IDs and validation.
// One source strip can cross two levels without borrowing the other level's
// identity or requiring a separate material note for each storey.
const {fixture}=require('./helpers/mir-studio-s2-model.cjs'),X=require('../dist/studio-exterior-model.js'),S=require('../dist/studio-surfaces.js'),P=require('../dist/plan-reconstruction-pipeline.js');
const inventory=fixture(),front=inventory.views.find(v=>v.kind==='elevation'),levels=inventory.levels.filter(l=>l.buildingId==='house'),source=resize(sample({notch:true}),2),canvas={width:1000,height:800,data:new Uint8ClampedArray(1000*800*4).fill(255)};
for(let y=0;y<source.image.height;y++)for(let x=0;x<source.image.width;x++){const from=(y*source.image.width+x)*4;canvas.data.set(source.image.data.subarray(from,from+4),((y+100)*1000+x+100)*4);}
front.payload.drawingReadings={rows:source.rows.map(r=>({...r,box:r.box.map(n=>n+100)}))};front.payload.foundation={box:[100,700,600,30],source:'pdf-foundation-guides'};
for(const level of levels){delete level.geometryRevision;level.reconstruction={status:'automatic-proposal'};for(const contour of level.contours){contour.status='proposed';for(const key of ['reference','height','base','alignment'])contour[key].status='proposed';}}
const upper=levels.find(l=>l.sourceLevel==='upper'),proposal={buildingId:'house',levelId:upper.id,views:[{viewId:front.id,direction:'front',envelope:{status:'proposed',box:[100,100,600,600],occlusions:[]},supportY:100,guides:[{levelHint:'upper',y:400,confidence:100,label:'Synthetic floor'}]}]},images={[front.id]:canvas},build=()=>E.build(proposal,inventory,images,upper.contours[0],levels),saved=structuredClone(inventory),built=build();
assert.ok(built.byLevel.every(l=>l.wallZones.length>0),'The source-linked region is assigned separately to both observed levels.');
const ids=built.byLevel.flatMap(l=>l.wallZones.map(z=>z.id));assert.equal(new Set(ids).size,ids.length);
for(const details of built.byLevel){const level=inventory.levels.find(l=>l.id===details.levelId),candidate={...level,...details};assert.deepEqual(X.proposalIssues(candidate,inventory),[]);
 for(const zone of details.wallZones){assert.equal(zone.provenance.extentStatus,'observed-cell-union-only');assert.equal(zone.thickness.kind,'user-rule');assert.equal(zone.thickness.ruleInches,4);assert.equal(zone.thickness.confirmationRequired,true);assert.ok(zone.provenance.hatch.leaders.length);assert.equal(zone.selection.materialId,undefined);assert.equal(zone.sourceViewId,front.id);
  const wall=M.wallsFor(level,inventory,{includeProposed:true}).find(w=>w.id===zone.wallId),face=S.faceFor(wall,candidate,[],100),rendered=face.zones.find(z=>z.id===zone.id);assert.deepEqual(rendered.polygon,zone.polygon.map(p=>p.map(n=>n*100)));
 }
 const foundation=details.exteriorElements.find(e=>e.type==='foundation');if(foundation){assert.equal(foundation.provenance.thickness.ruleInches,10);assert.equal(foundation.belowGradeDepth,null);}
}
assert.deepEqual(inventory,saved,'Source-linked generation leaves saved projects untouched.');assert.deepEqual(build(),built,'Generated source shapes have deterministic stable IDs.');
const wrongFrame=E.build(proposal,inventory,{[front.id]:{...canvas,width:999}},upper.contours[0],levels);assert.ok(wrongFrame.issues.includes('EXTERIOR_SOURCE_FRAME_MISMATCH'));assert.equal(wrongFrame.byLevel.flatMap(l=>l.wallZones).length,0,'A raster with a different source frame cannot define masonry extents.');
const selected=structuredClone(inventory);for(const details of built.byLevel){const level=selected.levels.find(l=>l.id===details.levelId);level.wallZones=structuredClone(details.wallZones);level.wallZones[0].selection={pattern:'lap',color:'#123456',materialId:'synthetic-user-choice'};}
const selectionBefore=structuredClone(selected),protectedResult=P.build(selected,'house',{});assert.equal(protectedResult.status,'preserved');assert.deepEqual(selected,selectionBefore,'An explicit later regeneration cannot erase generated zones or client choices.');
console.log('PASS irregular masonry: source leader and closed stone cells, normalized raster scale, exact concave polygons, opening/text/legend exclusions, no unlabelled texture/notes/wood/grid/colour, stable pure observations');
// The browser suite reuses these generated observations, never hand-written
// masonry geometry. Its fresh source inventory has no reconstructed levels.
const sourceInventory=structuredClone(inventory);sourceInventory.levels=sourceInventory.levels.filter(l=>l.buildingId!=='house');delete sourceInventory.levelStudio;delete sourceInventory.geometryVersion;
module.exports={inventory:sourceInventory,levels:levels.map(l=>({...structuredClone(l),...structuredClone(built.byLevel.find(d=>d.levelId===l.id))})),issues:built.issues};
