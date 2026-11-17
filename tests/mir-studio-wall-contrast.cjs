'use strict';
const assert=require('node:assert/strict');
const V=require('../dist/plan-reconstruction-vision.js');

// Synthetic RGBA only: this regression does not need a browser, canvas,
// fonts, source plans, or a native image dependency.
function raster(){return {width:1200,height:800,data:new Uint8ClampedArray(1200*800*4).fill(255)};}
function fill(image,x,y,width,height,colour){
 const rgb=colour.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));
 for(let py=Math.max(0,y);py<Math.min(image.height,y+height);py++)for(let px=Math.max(0,x);px<Math.min(image.width,x+width);px++)image.data.set([...rgb,255],(py*image.width+px)*4);
}
function frame(image,x,y,width,height,colour='#111111'){
 fill(image,x-1,y-1,width+2,2,colour);fill(image,x-1,y+height-1,width+2,2,colour);
 fill(image,x-1,y-1,2,height+2,colour);fill(image,x+width-1,y-1,2,height+2,colour);
}
function wall({left=140,right=820,top=300,bottom=550,edge='#282828',body='#e7e7e7',aperture=true}={}){
 const image=raster();fill(image,left,top,right-left,bottom-top,body);frame(image,left,top,right-left,bottom-top,edge);
 if(aperture){fill(image,left+100,top+70,90,110,'#ffffff');frame(image,left+100,top+70,90,110,'#222222');}
 return image;
}
function note(image,x,y){
 const glyphs=['10001/11001/10101/10011/10001/10001/10001','01110/10001/10001/10001/10001/10001/01110','11111/00100/00100/00100/00100/00100/00100','11111/10000/10000/11110/10000/10000/11111'];
 glyphs.forEach((glyph,n)=>glyph.split('/').forEach((row,py)=>[...row].forEach((pixel,px)=>{if(pixel==='1')fill(image,x+n*14+px*2,y+py*2,2,2,'#111111');})));
}
function cartouche(table){
 const image=raster();fill(image,880,200,250,400,'#dddddd');frame(image,880,200,250,400);
 for(let y=222;y<585;y+=40){note(image,900,y);if(table)fill(image,880,y+24,250,2,'#111111');}
 return image;
}
function cartoucheWithAperture(){
 const image=cartouche(false);fill(image,960,280,90,110,'#ffffff');frame(image,960,280,90,110);return image;
}
const sourceFrame={units:'pixels',rasterSize:[1200,800],pdfToRaster:[1,0,0,1,0,0],cropToRaster:[1,0,0,1,0,0]};
const options={sourceViewId:'synthetic-elevation',frame:sourceFrame};
let positives=0,negatives=0;
function proposed(name,image,extra={}){
 const result=V.wallEnvelope(image,680,{...options,...extra});
 assert.equal(result.status,'proposed',name);
 assert.equal(result.confirmationRequired,true,`${name}: geometry remains a proposal`);
 assert.equal(result.sourceViewId,options.sourceViewId,`${name}: original source identity retained`);
 assert.deepEqual(result.sourceFrame,sourceFrame,`${name}: original source frame retained`);
 const [left,top,width,height]=result.box;
 assert.ok(Math.abs(left-140)<=2,`${name}: left wall, not a nearby dimension spine (${left})`);
 assert.ok(Math.abs(left+width-820)<=2,`${name}: right wall, not a nearby dimension spine (${left+width})`);
 assert.ok(Math.abs(width-680)<=4,`${name}: the measured 680-pixel wall is not widened to 710 pixels`);
 assert.ok(Math.abs(top-300)<=2&&Math.abs(top+height-550)<=2,`${name}: source-supported top and bottom`);
 positives++;return result;
}
function refused(name,image,width=680,extra={}){
 const result=V.wallEnvelope(image,width,{...options,...extra});
 assert.equal(result.status,'unresolved',`${name}: ${JSON.stringify(result)}`);
 assert.equal(result.box,undefined,`${name}: no invented envelope`);negatives++;
}

proposed('Neutral wall outside the old horizontal search range',wall(),{rows:[{text:'GENERAL NOTES',box:[900,222,1110,236],confidence:95}]});
proposed('Pale neutral stroke remains visible against coloured material',wall({edge:'#eeeeee',body:'#f6f1c5'}));
proposed('Mid-grey wall with a real white framed aperture',wall({body:'#dddddd'}));
const broken=wall();for(let y=328;y<545;y+=31)fill(broken,137,y,687,3,'#ffffff');
proposed('Short drafting interruptions retain paired source spines',broken);
for(const body of ['#e7e7e7','#dddddd']){
 const image=wall({body});frame(image,125,280,710,310);
 proposed(`Nearby longer dimension frame cannot replace the physical wall (${body})`,image);
}

for(const colour of ['#00b400','#eeeeee','#4488bb']){
 const image=raster();fill(image,140,300,680,250,colour);
 refused(`Filled annotation without architectural strokes (${colour})`,image);
}
refused('Partial shaded note box with text',cartouche(false),250);
refused('Partial shaded note box with table rules',cartouche(true),250);
for(const text of ['NOTE','GENERAL NOTES']){
 refused(`A real inset frame cannot turn a labelled ${text} box into a wall`,cartoucheWithAperture(),250,{rows:[{text,box:[900,222,1110,236],confidence:95}]});
}
for(const fields of [['NOM DU PROJET','ÉCHELLE'],['ÉCHELLE','DATE']]){
 const rows=fields.map((text,i)=>({text,box:[900,222+i*40,1110,236+i*40],confidence:95}));
 refused(`Two cartouche fields identify the box despite its inset frame (${fields.join(', ')})`,cartoucheWithAperture(),250,{rows});
}
refused('A grey rectangle alone does not prove a facade',wall({aperture:false}));
const dimension=raster();frame(dimension,140,300,680,250);refused('Blank closed dimension frame',dimension);
const isolated=raster();fill(isolated,140,300,2,250,'#111111');fill(isolated,820,300,2,250,'#111111');refused('Two isolated vertical dimension leaders',isolated);
refused('Independent plan span disagrees',wall(),500);
refused('Known legend covers the candidate wall',wall(),680,{occlusions:[[130,290,700,270]]});
refused('The only apparent aperture belongs to an excluded legend',wall(),680,{occlusions:[[230,360,110,130]]});

// An already accepted legacy record must not be replaced with a fallback
// record or have its established source coordinates changed.
const accepted=V.wallEnvelope(wall({left:250,right:930}),680,{...options,rows:[{text:'NOTE',box:[300,330,380,344],confidence:95}]});
assert.deepEqual(accepted,{
 status:'proposed',sourceViewId:options.sourceViewId,sourceFrame,
 box:[249,299,680,251],occlusions:[],spines:[[299,550],[299,550]],
 method:'paired-monochrome-wall-spines',confirmationRequired:true
},'An accepted legacy wall retains its exact envelope and provenance');
assert.equal(positives,6);assert.equal(negatives,15);
console.log('PASS wall contrast: 6 supported walls, 15 refusals including labelled inset-frame cartouches, exact accepted-legacy preservation, and physical 680px wall instead of nearby 710px dimensions.');
