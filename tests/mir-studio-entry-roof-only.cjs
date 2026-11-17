'use strict';
const assert=require('node:assert/strict'),{fixture,pipeline,roofs}=require('./mir-studio-registered-entries.cjs'),Roof=require('../dist/plan-reconstructed-roofs.js');
const copy=structuredClone;
function roofOnlyFixture({plan=true,planDepthShift=0,diagonals=true,sideAttached=true,sideContinues=false,rise=50}={}){
 const f=fixture(),front=f.images['synthetic-elevation-front'],side=f.images['synthetic-elevation-right'];
 const line=(image,x1,y1,x2,y2,c=0)=>{const n=Math.ceil(Math.hypot(x2-x1,y2-y1)*1.5);for(let i=0;i<=n;i++){const x=Math.round(x1+(x2-x1)*i/n),y=Math.round(y1+(y2-y1)*i/n);if(x>=0&&x<image.width&&y>=0&&y<image.height)image.data.set([c,c,c,255],(y*image.width+x)*4);}};
 const clear=(image,x,y,w,h)=>{for(let yy=y;yy<Math.min(image.height,y+h);yy++)for(let xx=x;xx<Math.min(image.width,x+w);xx++)image.data.set([255,255,255,255],(yy*image.width+xx)*4);};
 clear(front,270,710,480,410);clear(side,100,710,230,410);
 // This source contains the roof and its closed fascia face, without columns.
 const l=300,r=720,eave=814,peak=[510,eave-rise];line(front,l,eave,...peak);line(front,...peak,r,eave);line(front,l,eave,r,eave);line(front,l,eave,l,830);line(front,r,eave,r,830);line(front,l,830,r,830);
 for(let y=peak[1]+8;y<eave;y+=8){const left=l+(eave-y)*(peak[0]-l)/rise,right=r-(eave-y)*(r-peak[0])/rise;line(front,left,y,right,y,155);}for(let x=l+10;x<r;x+=11){const top=x<peak[0]?eave-rise*(x-l)/(peak[0]-l):peak[1]+rise*(x-peak[0])/(r-peak[0]);line(front,x,top+2,x,eave-1,155);}
 const attachment=sideAttached?300:270;line(side,150,eave,attachment,peak[1]);line(side,150,eave,150,824);line(side,150,824,attachment,824);line(side,300,450,300,1050);
 if(sideContinues)line(side,130,eave+rise*20/(attachment-150),150,eave);
 const file={id:'invented-entry-source',sha256:'invented-entry-source-sha256'};f.inventory.files=[file];for(const view of f.inventory.views){view.fileId=file.id;view.payload.sourceWidth=f.images[view.id].width;view.payload.sourceHeight=f.images[view.id].height;}
 if(plan){
  const original=f.images['synthetic-floor-0'],image={width:1600,height:1200,data:new Uint8ClampedArray(1600*1200*4).fill(255)};image.data.set(original.data);
  const source=copy(f.inventory.views.find(v=>v.id==='synthetic-floor-0')),view={...source,id:'invented-entry-roof-plan',kind:'roof',levelId:null,page:5,frame:{units:'pixels',rasterSize:[1600,1200]},payload:{drawingReadings:copy(source.payload.drawingReadings),sourceWidth:1600,sourceHeight:1200}};
  const y=1000+planDepthShift,visibleBack=930+planDepthShift;line(image,l,visibleBack,l,y,220);line(image,r,visibleBack,r,y,220);line(image,l,y,r,y,220);
  if(diagonals){line(image,l,y,l+98,visibleBack,220);line(image,r,y,r-98,visibleBack,220);}line(image,150,visibleBack-4,1350,visibleBack-4,90);
  f.inventory.views.push(view);f.images[view.id]=image;
 }
 const result=pipeline(f).result,level=result.levels.find(l=>l.sourceLevel==='level-0'),roof=roofs(result).find(r=>r.levelId===level.id);
 return {...f,result,level,roof};
}
module.exports={roofOnlyFixture};
if(require.main===module){
 const f=roofOnlyFixture();assert.ok(f.roof,'Observed roof faces, own plan boundary and attached side profile can establish the roof without posts.');
 assert.equal(f.level.exteriorElements.length,0);assert.equal(f.roof.entryAssembly.footprintSource,'registered-roof-plan');assert.equal(f.roof.entryAssembly.supportStatus,'unresolved');
 const p=f.roof.entryPlanEvidence;assert.equal(p.sourceBoundary.rearPixelsObserved,false);assert.equal(p.sourcePixelEvidence.rear.pixelsObserved,false);assert.ok(p.sourceBoundary.completedSides.every(pair=>pair[0][1]>pair[1][1]));assert.ok(p.association.diagonalResiduals.every(d=>d.residuals.every(n=>Math.abs(n)<.03)));
 assert.ok(Roof.faces(f.roof,[0,0],{includeProposed:true}).filter(face=>face.type==='roof').length>=3,'The independent proof produces nonempty source-calibrated roof faces.');
 const boundary=roofOnlyFixture({planDepthShift:-2});assert.ok(boundary.roof,'A residual exactly at the three-source-pixel boundary survives ordinary floating point rounding.');
 assert.ok(Math.abs(Math.abs(boundary.roof.entryPlanEvidence.association.sideAttachments[0].planEaveResidual)-.03)<1e-9);
 assert.equal(roofOnlyFixture({planDepthShift:-3}).roof,undefined,'The arithmetic epsilon does not admit an additional source pixel of plan/side disagreement.');
 const crossing=roofOnlyFixture({rise:90});assert.ok(crossing.roof?.connection.wallStack);assert.ok(Math.max(...crossing.roof.profiles.x.map(p=>p[1]))>3.2);
 for(const options of [{plan:false},{planDepthShift:45},{diagonals:false},{sideAttached:false},{sideContinues:true}]){const s=roofOnlyFixture(options);assert.equal(s.roof,undefined,'Missing or contradictory sources cannot be replaced by a common depth or a detached slope: '+JSON.stringify(options));}
 console.log('PASS roof-only registered entries: independent face/plan/side evidence, calculated hidden attachment, no post-foot dependency, real cross-level mesh and refusal of missing or contradictory depth/attachment sources.');
}
