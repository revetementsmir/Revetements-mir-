'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),V=require('../dist/plan-reconstruction-vision.js'),R=require('../dist/plan-reconstruction.js'),{fixture}=require('./helpers/mir-studio-s2-model.cjs');
function image(width=1000,height=650){return {width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};}
function line(im,a,b,width=3){const length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let n=0;n<=length;n++){const x=Math.round(a[0]+(b[0]-a[0])*n/length),y=Math.round(a[1]+(b[1]-a[1])*n/length);for(let dy=-Math.floor(width/2);dy<=Math.floor(width/2);dy++)for(let dx=-Math.floor(width/2);dx<=Math.floor(width/2);dx++)if(x+dx>=0&&x+dx<im.width&&y+dy>=0&&y+dy<im.height)im.data.set([0,0,0,255],((y+dy)*im.width+x+dx)*4);}}
function frame(im,{left=250,right=650,top=260,bottom=im.height+40,missingRight=false}={}){line(im,[left,top],[right,top]);line(im,[left,top],[left,bottom]);if(!missingRight)line(im,[right,top],[right,bottom]);line(im,[left,bottom],[right,bottom]);}
const title={text:'Légende',box:[300,276,420,294]},frameSource={pdfToRaster:[1,0,0,-1,0,650],rasterSize:[1000,650]},contains=(box,x,y)=>x>=box[0]&&x<box[0]+box[2]&&y>=box[1]&&y<box[1]+box[3];
const clipped=image();frame(clipped);const original=crypto.createHash('sha256').update(clipped.data).digest('hex');
assert.equal(V.wallEnvelope(clipped,400).status,'proposed','the unmasked remaining legend sides reproduce false exterior wall support');
const masks=V.legendBoxes(clipped,[title]);
assert.equal(masks.length,1,'a legend cut by the bottom edge still needs a mask');
assert.ok(contains(masks[0],250,260)&&contains(masks[0],650,649),'the mask includes the remaining top and side frame strokes');
assert.equal(masks[0][1]+masks[0][3],clipped.height,'the mask stops at the observed crop, never an invented lower frame');
assert.equal(V.wallEnvelope(clipped,400,{sourceViewId:'synthetic-crop',frame:frameSource,occlusions:masks}).status,'unresolved','legend borders cannot become an exterior wall pair');
assert.equal(crypto.createHash('sha256').update(clipped.data).digest('hex'),original,'occlusion discovery does not overwrite source pixels');
assert.deepEqual(V.legendBoxes(clipped,[{...title,text:'  LÉGENDE :  '}]),masks,'surrounding OCR spaces and accents preserve the same title');

const divided=image();frame(divided);line(divided,[250,350],[650,350]);const dividedMasks=V.legendBoxes(divided,[title]);
assert.equal(dividedMasks.length,1);assert.equal(dividedMasks[0][1]+dividedMasks[0][3],divided.height,'an internal separator is not the missing bottom of a cropped legend');
const complete=image();frame(complete,{bottom:560});const fullMasks=V.legendBoxes(complete,[title]);
assert.equal(fullMasks.length,1);assert.ok(contains(fullMasks[0],650,560));assert.ok(fullMasks[0][1]+fullMasks[0][3]<600,'a complete frame is not extended to the page edge');

// The crop boundary is not itself evidence of an annotation. A genuine
// building touching it remains a proposal with its original source frame.
for(const rows of [[],[{...title,text:'Façade arrière'}],[{...title,box:[30,276,140,294]}]])assert.deepEqual(V.legendBoxes(clipped,rows),[]);
const building=V.wallEnvelope(clipped,400,{sourceViewId:'synthetic-building',frame:frameSource,occlusions:V.legendBoxes(clipped,[])});
assert.equal(building.status,'proposed');assert.equal(building.confirmationRequired,true);assert.equal(building.sourceViewId,'synthetic-building');assert.deepEqual(building.sourceFrame,frameSource);
const openSide=image();frame(openSide,{missingRight:true});assert.deepEqual(V.legendBoxes(openSide,[title]),[],'a heading and only one side do not establish a mask');
const unsupportedEdge=image();line(unsupportedEdge,[250,260],[650,260]);line(unsupportedEdge,[250,260],[250,610]);line(unsupportedEdge,[650,260],[650,610]);
assert.deepEqual(V.legendBoxes(unsupportedEdge,[title]),[],'two sides that stop before the crop do not justify inventing its bottom');

// A real opening next to the annotation survives; hidden areas remain a
// source occlusion and do not supply a guessed opening or a material patch.
const inv=fixture(),upper=inv.levels.find(l=>l.sourceLevel==='upper'),front=inv.views.find(v=>v.direction==='front'),windowImage=image(1000,800);
for(const [a,b]of [[[300,380],[400,380]],[[400,380],[400,460]],[[400,460],[300,460]],[[300,460],[300,380]]])line(windowImage,a,b);
frame(windowImage,{left:500,right:950,top:370});
const windowMasks=V.legendBoxes(windowImage,[{text:'Legend',box:[550,390,640,406]}]);assert.equal(windowMasks.length,1);assert.ok(!contains(windowMasks[0],350,420));
const proposal={levelId:upper.id,views:[{viewId:front.id,direction:'front',envelope:{status:'proposed',box:[120,350,600,150],occlusions:windowMasks},supportY:350,guides:[{levelHint:'upper',y:500}]}],sourceOpeningGaps:[],openingSizeCandidates:[]};
const openings=R.openingsFor(proposal,inv,{[front.id]:windowImage},upper.contours[0]);
assert.equal(openings.length,1,'the genuine neighbouring window survives the bounded legend mask');assert.equal(openings[0].sourceViewId,front.id);assert.equal(openings[0].status,'proposed');assert.equal(openings[0].floorCorrespondence.status,'unresolved');
assert.deepEqual(proposal.views[0].envelope.occlusions,windowMasks,'the source occlusion stays explicit');
console.log('PASS legend occlusion: bottom crop and internal separators excluded, complete frames bounded, crop-edge buildings and neighbouring windows preserved');
