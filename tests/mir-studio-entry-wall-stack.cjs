'use strict';
const assert=require('node:assert/strict'),{fixture,pipeline,roofs}=require('./mir-studio-registered-entries.cjs'),R=require('../dist/plan-reconstruction.js'),M=require('../dist/plan-level-model.js'),Roof=require('../dist/plan-reconstructed-roofs.js');
const copy=structuredClone,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
function stroke(image,x1,y1,x2,y2,color=0){const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=n;i++){const x=Math.round(x1+(x2-x1)*i/n),y=Math.round(y1+(y2-y1)*i/n);if(x>=0&&x<image.width&&y>=0&&y<image.height)image.data.set([color,color,color,255],(y*image.width+x)*4);}}
function wallStackFixture({upperOffset=0,gap=false,missingUpperGrid=false}={}){
 const f=fixture({groundRise:85}),upper=f.proposals['synthetic-house:level-1'];
 if(upperOffset){
  const image=f.images[upper.sourceViewId],points=upper.draft.points.map(p=>p.xy);
  for(let i=0;i<points.length;i++)stroke(image,...points[i],...points[(i+1)%points.length],255);
  for(const p of upper.draft.points)p.xy[1]+=upperOffset;
  for(let i=0;i<upper.draft.points.length;i++)stroke(image,...upper.draft.points[i].xy,...upper.draft.points[(i+1)%upper.draft.points.length].xy);
 }
 if(missingUpperGrid){const source=f.inventory.views.find(v=>v.id===upper.sourceViewId);source.payload.drawingReadings.rows=source.payload.drawingReadings.rows.filter(r=>r.text!=='A');}
 if(gap){
  for(const proposal of Object.values(f.proposals))for(const view of proposal.views){
   const from=view.guides.find(g=>g.levelHint==='level-0'&&g.datumType==='floor'),y=780,ceiling={...copy(from),datumType:'ceiling',y,label:'Synthetic lower ceiling with observed storey gap',box:[1400,y-16,1540,y-6],sourceGuide:{method:'caption-and-visible-monochrome-datum-stroke',support:1,anchors:[[1390,y],[1550,y]]}};
   view.guides.push(ceiling);stroke(f.images[view.viewId],1390,y,1550,y);
  }
  const lower=f.proposals['synthetic-house:level-0'],ceilingViews=copy(lower.views);for(const v of ceilingViews)v.guides=v.guides.filter(g=>!(g.levelHint==='level-1'&&g.datumType==='floor'));
  lower.draft.height=R.heightFromLevelDatums(ceilingViews,'level-0',lower.draft.reference,f.inventory)[0];assert.ok(lower.draft.height);near(lower.draft.height.value,2.7);
 }
 const result=pipeline(f).result,level=result.levels.find(l=>l.sourceLevel==='level-0'),roof=roofs(result).find(r=>r.levelId===level.id);
 return {...f,result,level,roof};
}
module.exports={wallStackFixture};
if(require.main===module){
 const f=wallStackFixture(),stack=f.roof?.connection.wallStack;assert.ok(stack,'The separately observed side attachment can meet two actual contiguous registered walls.');
 near(Math.max(...f.roof.profiles.x.map(p=>p[1])),3.31);assert.equal(stack.members.length,2);assert.equal(stack.method,'contiguous-registered-wall-bands-at-observed-entry-attachment');
 assert.deepEqual(stack.referenceFrame,{floorSourceViewId:f.level.contours[0].alignment.referenceSourceViewId,baseLevelId:f.level.contours[0].base.referenceLevelId});
 near(stack.members[0].base+stack.members[0].height,stack.members[1].base);near(stack.plane.value,-6);assert.ok(stack.attachmentSources.length);
 for(const member of stack.members){const level=f.result.levels.find(l=>l.id===member.levelId),wall=M.wallsFor(level,f.inventory,{includeProposed:true}).find(w=>w.id===member.wallId);assert.ok(wall);assert.deepEqual(member.registration,level.contours[0].levelRegistration);assert.deepEqual(member.from,wall.from);assert.deepEqual(member.to,wall.to);}
 assert.ok(Roof.faces(f.roof,[0,0],{includeProposed:true}).flatMap(face=>face.poly||[]).some(p=>p[2]>3.3),'The mesh keeps the source crest above the lower storey.');
 const ordinary=pipeline(fixture()).result;assert.ok(roofs(ordinary).every(r=>r.connection.wallStack===undefined),'Roofs wholly within one wall retain the old contract.');
 for(const options of [{upperOffset:40},{gap:true},{missingUpperGrid:true}]){
  const rejected=wallStackFixture(options);assert.equal(rejected.roof,undefined,'An absent/offset wall or an actual vertical gap cannot be filled: '+JSON.stringify(options));
  assert.ok(rejected.level.reconstruction.exterior.issues.includes('ENTRY_ROOF_WALL_LEVEL_UNRESOLVED'));
  if(options.gap){near(rejected.level.contours[0].height.value,2.7);near(rejected.result.levels.find(l=>l.sourceLevel==='level-1').contours[0].base.value,3);}
  if(options.upperOffset){const lowerWall=M.wallsFor(rejected.level,rejected.inventory,{includeProposed:true}).find(w=>w.normal[1]<-.999),upperLevel=rejected.result.levels.find(l=>l.sourceLevel==='level-1'),upperWall=M.wallsFor(upperLevel,rejected.inventory,{includeProposed:true}).find(w=>w.normal[1]<-.999);assert.ok(Math.abs(lowerWall.from[1]-upperWall.from[1])>.3,'The negative fixture really changes the registered wall plane.');}
 }
 console.log('PASS entry wall stack: real source attachment across two registered levels, exact crest/mesh, immutable registration snapshots and refusal of offset, gapped or unregistered wall bands.');
}
