'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const actualV=require('../dist/plan-reconstruction-vision.js'),Roof=require('../dist/plan-reconstructed-roofs.js'),Studio=require('../dist/studio-exterior-model.js');
const image=(w,h)=>({width:w,height:h,data:Uint8ClampedArray.from({length:w*h*4},(_,i)=>255)});
function pix(im,x,y){if(x<0||y<0||x>=im.width||y>=im.height)return;let j=(y*im.width+x)*4;im.data[j]=im.data[j+1]=im.data[j+2]=0;}
function horizontal(im,x0,x1,y){for(let x=x0;x<=x1;x++){pix(im,x,y);pix(im,x,y+1)}}
function line(im,x0,y0,x1,y1){for(let x=x0;x<=x1;x++){let y=Math.round(y0+(y1-y0)*(x-x0)/(x1-x0));pix(im,x,y);pix(im,x,y+1)}}
const fi=image(500,270),si=image(500,270);horizontal(fi,100,250,50);horizontal(fi,100,250,65);for(let y=53;y<200;y++)for(const x of [115,125,226,236])pix(fi,x,y);line(si,100,50,200,40);for(let y=53;y<200;y++)for(const x of [100,120])pix(si,x,y);
const canopy={status:'proposed',box:[115,52,120,148],beamLine:[100,50,150,2],columns:[{x:115,width:10,bottom:200},{x:226,width:10,bottom:200}]};
const wall={id:'wall:1',from:[0,2],to:[4,2],normal:[0,-1],base:0,height:2,levelId:'level1',buildingId:'B',length:4};
const level={id:'level1',buildingId:'B',reconstruction:{status:'automatic-proposal'},wallOpenings:[]};
const front={id:'front',kind:'elevation',buildingId:'B',direction:'front',frame:{page:1},payload:{}},right={id:'side',kind:'elevation',buildingId:'B',direction:'right',frame:{page:2},payload:{}};
const inventory={levels:[level],views:[front,right]},fr={guide:{y:80},sx:.02,sz:.01,u:x=>(x-80)*.02,z:y=>(200-y)*.01,pixelZ:z=>200-z*100,pixelU:u=>u/.02+80},sr={guide:{y:80},sx:.01,sz:.01,u:x=>x/100,z:y=>(200-y)*.01,pixelZ:z=>200-z*100,pixelU:u=>u*100};
const clone=x=>JSON.parse(JSON.stringify(x));
const M={clone,wallsFor:()=>[wall],distance:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),openingIssues:()=>[],validatePolygon:()=>[]};
const R={elevationRegistration:(info)=>info.viewId==='front'?fr:sr,readings:(v)=>v.id==='front'?[{box:[10,10,40,20],source:'pdf-text',text:'colonne et poutre'}]:[]};
const V={structuralInk:actualV.structuralInk,canopyEnvelope:()=>canopy,canopySide:()=>({status:'proposed',box:[100,52,20,148],method:'side-two-post-edges'}),legendBoxes:()=>[]};
const sandbox={module:{exports:{}},require:s=>s.endsWith('plan-level-model.js')?M:s.endsWith('plan-reconstruction.js')?R:s.endsWith('plan-reconstruction-vision.js')?V:{parseDimension:()=>null},console,Uint8Array,Number,Math};
const src=fs.readFileSync(require('path').join(__dirname,'../dist/plan-reconstructed-exterior.js'),'utf8');vm.runInNewContext(src,sandbox,{filename:'plan-reconstructed-exterior.js'});
const exterior=sandbox.module.exports.build({buildingId:'B',views:[{viewId:'front',direction:'front',envelope:{status:'proposed',box:[80,30,230,170]}},{viewId:'side',direction:'right',envelope:{status:'proposed',box:[50,30,250,170]}}]},inventory,{front:fi,side:si},{},[level]);

assert.equal(exterior.byLevel[0].exteriorElements.filter(e=>e.type==='column').length,2);
assert.equal(exterior.byLevel[0].exteriorElements.filter(e=>e.type==='beam').length,1);
const b=exterior.byLevel[0].exteriorElements.find(e=>e.type==='beam');assert.deepEqual(Array.from(Studio.issues(b)),[]);assert.equal(b.surfaceOnly,true);assert.equal(b.size[1],null);
assert.equal(exterior.byLevel[0].roofProposals.length,1);
const roof=exterior.byLevel[0].roofProposals[0];assert.deepEqual(Array.from(Roof.issues(roof,{confirm:false})),[]);assert(Roof.faces(roof,[0,0],{includeProposed:true}).some(f=>f.type==='roof'));
for(let x=100;x<=200;x++)for(let y=0;y<160;y++){let j=(y*si.width+x)*4;if(si.data[j]===0 && y<52){si.data[j]=si.data[j+1]=si.data[j+2]=255;}}
const noSideRoof=sandbox.module.exports.build({buildingId:'B',views:[{viewId:'front',direction:'front',envelope:{status:'proposed',box:[80,30,230,170]}},{viewId:'side',direction:'right',envelope:{status:'proposed',box:[50,30,250,170]}}]},inventory,{front:fi,side:si},{},[level]);
assert.equal(noSideRoof.byLevel[0].roofProposals.length,0,'no entry roof when side roof stroke absent');
assert(noSideRoof.issues.includes('ENTRY_ROOF_GEOMETRY_UNRESOLVED'));
console.log('PASS entrance elements: two posts + beam face + two-view pitched roof; missing roof remains unresolved');
