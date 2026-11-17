'use strict';
const assert=require('node:assert/strict'),E=require('../dist/plan-reconstructed-exterior.js'),M=require('../dist/plan-level-model.js'),{fixture}=require('./helpers/mir-studio-s2-model.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
function image(){return {width:1000,height:800,data:new Uint8ClampedArray(1000*800*4).fill(255)};}
function pixel(im,x,y,color=[0,0,0]){im.data.set([...color,255],(y*im.width+x)*4);}
function horizontal(im,y,x0,x1){for(let x=x0;x<=x1;x++)pixel(im,x,y);}
function vertical(im,x,y0,y1){for(let y=y0;y<=y1;y++)pixel(im,x,y);}
function brick(im,box,{stagger=true,joints=true}={}){
 const [x,y,w,h]=box;
 for(let row=0;row<=h/20;row++){
  horizontal(im,y+row*20,x,x+w);
  if(row<h/20&&joints)for(let column=x+(stagger&&row%2?25:0);column<=x+w;column+=50)vertical(im,column,y+row*20,y+(row+1)*20);
 }
}
function scenario({masonry=true,mask=null,thicknessText=null}={}){
 const inventory=fixture(),front=inventory.views.find(v=>v.kind==='elevation'),im=image(),levels=inventory.levels.filter(l=>l.buildingId==='house');
 for(const l of levels){delete l.geometryRevision;l.reconstruction={status:'automatic-proposal'};for(const c of l.contours){c.status='proposed';c.reference.status='proposed';c.height.status='proposed';c.base.status='proposed';c.alignment.status='proposed';}}
 front.payload.foundation={box:[100,700,600,50],source:'pdf-foundation-guides'};
 front.payload.drawingReadings={rows:[...(masonry?[{text:'Brique de maçonnerie',source:'pdf-text',confidence:100,box:[760,540,980,560]}]:[]),...(thicknessText?[{text:thicknessText,source:'pdf-text',confidence:100,box:[760,680,980,695]}]:[])]};
 if(masonry)brick(im,[100,520,600,180]);
 const upper=levels.find(l=>l.sourceLevel==='upper'),proposal={buildingId:'house',levelId:upper.id,views:[{viewId:front.id,direction:'front',envelope:{status:'proposed',box:[100,100,600,600],occlusions:mask?[mask]:[]},supportY:100,guides:[{levelHint:'upper',y:400,confidence:100,label:'Plancher étage — synthetic'}]}]};
 return {inventory,proposal,images:{[front.id]:im},reviewed:upper.contours[0],levels,front,im};
}
const build=s=>E.build(s.proposal,s.inventory,s.images,s.reviewed,s.levels);
// Visible masonry requires source joints; siding or a solid annotation does not suffice.
const hatch=image();brick(hatch,[100,200,400,160]);
assert.equal(E.masonryHatches(hatch,[100,200,400,160]).length,1);
const siding=image();brick(siding,[100,200,400,160],{joints:false});assert.equal(E.masonryHatches(siding,[100,200,400,160]).length,0);
const grid=image();brick(grid,[100,200,400,160],{stagger:false});assert.equal(E.masonryHatches(grid,[100,200,400,160]).length,0,'a generic rectangular grid is not classified as masonry');
const coloured=image();for(let y=200;y<360;y++)for(let x=100;x<500;x++)pixel(coloured,x,y,[220,20,20]);assert.equal(E.masonryHatches(coloured,[100,200,400,160]).length,0,'a coloured annotation is not a masonry boundary');
const s=scenario(),before=structuredClone({inventory:s.inventory,proposal:s.proposal,reviewed:s.reviewed,levels:s.levels}),first=build(s),ground=first.byLevel.find(l=>l.levelId==='house:ground');
assert.equal(first.status,'partial-proposal');assert.equal(first.complete,false);
assert.ok(ground.wallZones.length>0);assert.equal(ground.exteriorElements.length,1);assert.equal(first.byLevel.find(l=>l.levelId==='house:upper').exteriorElements.length,0,'the foundation is not repeated below every storey');
const foundation=ground.exteriorElements[0];
assert.equal(foundation.type,'foundation');close(foundation.size[0],12);close(foundation.size[1],.254);close(foundation.size[2],.5);close(foundation.origin[2],-.5);
assert.equal(foundation.provenance.thickness.ruleInches,10);assert.equal(foundation.provenance.thickness.kind,'user-rule');assert.equal(foundation.provenance.kind,'estimated-calibrated');
assert.equal(foundation.belowGradeDepth,null);assert.equal(foundation.extentStatus,'visible-above-grade-only');assert.equal(foundation.provenance.structuralVerification,false);assert.equal(foundation.status,'proposed');
assert.equal(foundation.parentWallId,ground.wallZones[0].wallId);
for(const z of ground.wallZones){assert.equal(z.kind,'masonry');close(z.thickness.value,.1016);assert.equal(z.status,'proposed');assert.equal(z.selection.materialId,undefined);assert.ok(z.provenance.materialLabels.length);assert.equal(z.provenance.unseenArea,null);}
assert.deepEqual({inventory:s.inventory,proposal:s.proposal,reviewed:s.reviewed,levels:s.levels},before,'the generator is pure and preserves input geometry and selections');
assert.deepEqual(build(s),first,'identical observations produce stable element and zone IDs');
const plain=build(scenario({masonry:false})),plainFoundation=plain.byLevel.find(l=>l.levelId==='house:ground').exteriorElements[0];
close(plainFoundation.size[1],.2032);assert.equal(plainFoundation.provenance.thickness.conditionStatus,'unverified');assert.ok(plain.issues.includes('FOUNDATION_MASONRY_CONDITION_UNVERIFIED'),'an absence of recognised masonry does not certify its absence');
const textOnly=scenario();textOnly.images[textOnly.front.id]=image();assert.equal(build(textOnly).byLevel.flatMap(l=>l.wallZones).length,0,'a masonry caption alone does not create a wall-sized material region');
// A lower cropped legend covers part of the visible foundation. Its hidden part stays absent.
const occluded=scenario({mask:[350,620,200,180]}),occlusionResult=build(occluded),pieces=occlusionResult.byLevel.find(l=>l.levelId==='house:ground').exteriorElements;
assert.equal(pieces.length,2);close(pieces.reduce((sum,p)=>sum+p.size[0],0),8);assert.ok(occlusionResult.issues.includes('FOUNDATION_SOURCE_OCCLUDED'));
for(const p of pieces)assert.ok(p.sourceBox[0]+p.sourceBox[2]<=350||p.sourceBox[0]>=550);
for(const z of occlusionResult.byLevel.flatMap(l=>l.wallZones)){const b=z.sourceBox;assert.ok(b[1]+b[3]<=620||b[0]+b[2]<=350||b[0]>=550,'no unseen masonry is filled behind a legend');}
// Openings continue to belong to their wall; material zones do not paint over their source box.
const withOpening=scenario(),g=withOpening.levels.find(l=>l.sourceLevel==='ground'),w=M.wallsFor(g,withOpening.inventory,{includeProposed:true}).find(w=>w.normal[1]<-.99);
g.wallOpenings=[{id:'synthetic-window',wallId:w.id,offset:3,width:3,height:1.2,sill:.2,status:'proposed'}];
const openingResult=build(withOpening),openingBox=[250,560,150,120];
for(const zone of openingResult.byLevel.flatMap(l=>l.wallZones)){const b=zone.sourceBox,overlap=Math.max(0,Math.min(b[0]+b[2],openingBox[0]+openingBox[2])-Math.max(b[0],openingBox[0]))*Math.max(0,Math.min(b[1]+b[3],openingBox[1]+openingBox[3])-Math.max(b[1],openingBox[1]));assert.equal(overlap,0);}
assert.equal(g.wallOpenings.length,1);
// Written disagreements are visible and do not become an averaged or silently selected depth.
const conflict=build(scenario({thicknessText:'Mur de fondation 12 po'})),conflicting=conflict.byLevel.flatMap(l=>l.exteriorElements)[0];
assert.equal(conflicting.size[1],null);assert.equal(conflicting.surfaceOnly,true);assert.equal(conflicting.provenance.thickness.status,'conflict');assert.ok(conflict.issues.includes('FOUNDATION_THICKNESS_CONFLICT'));close(conflicting.provenance.thickness.writtenCandidates[0].value,.3048);
const noRuleConflict=build(scenario({thicknessText:'Mur de fondation 10 po'}));assert.ok(!noRuleConflict.issues.includes('FOUNDATION_THICKNESS_CONFLICT'));
const wrongBuilding=scenario(),foreign=structuredClone(wrongBuilding.front);foreign.id='cabanon:elevation';foreign.buildingId='cabanon';wrongBuilding.inventory.views.push(foreign);wrongBuilding.proposal.views=[{...wrongBuilding.proposal.views[0],viewId:foreign.id}];wrongBuilding.images[foreign.id]=wrongBuilding.im;
assert.equal(build(wrongBuilding).byLevel.flatMap(l=>l.exteriorElements).length,0,'another building cannot supply foundation extents');
const manual=scenario();manual.levels.forEach(l=>{l.geometryRevision=4;l.wallFinishes={saved:{materialId:'existing-user-choice'}};});const manualBefore=structuredClone(manual.levels);assert.equal(build(manual).byLevel.length,0);assert.deepEqual(manual.levels,manualBefore,'existing reviewed projects are not regenerated');
const outside=scenario();outside.front.payload.foundation.box=[100,30,600,40];assert.equal(build(outside).byLevel.flatMap(l=>l.exteriorElements).length,0,'a distant foundation datum is not relocated under the building');
// A front garage owns its visible pixels; the rear house cannot claim them as well.
const garage=scenario(),side=structuredClone(garage.front);side.id='synthetic-right';side.direction='right';garage.inventory.views.push(side);
const garageLevel={id:'house:garage-synthetic',buildingId:'house',sourceLevel:null,contours:[],reconstruction:{status:'automatic-proposal'},observedPlanes:[]};
garageLevel.observedPlanes=[{id:'wall:'+garageLevel.id+':front',from:[4,-3],to:[8,-3],height:3,base:0,normal:[0,-1,0],status:'proposed',sourceViewId:garage.front.id,sourceBox:[300,400,200,300],
 registration:{kind:'multi-view-elevation-registration',status:'proposed',sourceViewIds:[garage.front.id,side.id]},measurements:{width:{value:4,kind:'estimated-calibrated',status:'proposed',sourceViewId:garage.front.id,anchors:[[300,700],[500,700]],scaleUsed:.02},height:{value:3,kind:'estimated-calibrated',status:'proposed',sourceViewId:garage.front.id,anchors:[[300,400],[300,700]],scaleUsed:.01}}}];
assert.deepEqual(M.observedPlaneIssues(garageLevel.observedPlanes[0],garage.inventory,garageLevel,{confirm:false}),[]);garage.levels.push(garageLevel);garage.inventory.levels.push(garageLevel);
const garageResult=build(garage),behind=garageResult.byLevel.find(l=>l.levelId==='house:ground'),inFront=garageResult.byLevel.find(l=>l.levelId===garageLevel.id);
for(const item of [...behind.wallZones,...behind.exteriorElements])assert.ok(item.sourceBox[0]+item.sourceBox[2]<=300||item.sourceBox[0]>=500,'the hidden house region is not painted or extruded');
close(behind.exteriorElements.reduce((sum,e)=>sum+e.size[0],0),8);close(inFront.exteriorElements[0].size[0],4);assert.ok(inFront.wallZones.length);assert.ok(behind.issues.includes('EXTERIOR_HIDDEN_BY_NEARER_VOLUME'));
// A repeated source adds provenance instead of a second physical foundation/finish zone.
const duplicate=scenario(),duplicateView=structuredClone(duplicate.front);duplicateView.id='second-front-elevation';duplicate.inventory.views.push(duplicateView);duplicate.proposal.views.push({...structuredClone(duplicate.proposal.views[0]),viewId:duplicateView.id});duplicate.images[duplicateView.id]=duplicate.im;
const duplicateGround=build(duplicate).byLevel.find(l=>l.levelId==='house:ground');assert.equal(duplicateGround.exteriorElements.length,1);assert.equal(duplicateGround.wallZones.length,1);
assert.equal(duplicateGround.exteriorElements[0].provenance.alternateObservations[0].sourceViewId,duplicateView.id);assert.equal(duplicateGround.wallZones[0].provenance.alternateObservations[0].sourceViewId,duplicateView.id);
duplicateView.payload.foundation.box[3]=65;const conflictingExtents=build(duplicate);assert.ok(conflictingExtents.issues.includes('FOUNDATION_MULTIVIEW_EXTENT_CONFLICT'));assert.equal(conflictingExtents.byLevel.flatMap(l=>l.exteriorElements).length,0);assert.ok(conflictingExtents.byLevel.flatMap(l=>l.conflicts).some(c=>c.type==='foundation'&&c.candidates.length===2));
// Columns require observed section edges in two separately calibrated elevations.
function canopyScenario(){
 const s=scenario({masonry:false}),right=structuredClone(s.front);right.id='canopy-right';right.direction='right';right.payload.foundation=null;right.payload.drawingReadings={rows:[]};s.inventory.views.push(right);
 s.front.payload.drawingReadings.rows.push({text:'Colonnes en aluminium',source:'pdf-text',confidence:100,box:[760,410,980,428]});
 horizontal(s.im,400,300,510);for(const x of [300,310,500,510])vertical(s.im,x,401,700);
 const sideImage=image();for(const x of [40,50])vertical(sideImage,x,401,700);
 s.images[right.id]=sideImage;s.proposal.views.push({viewId:right.id,direction:'right',envelope:{status:'proposed',box:[100,100,350,600],occlusions:[]},supportY:100,guides:[{levelHint:'upper',y:400,confidence:100,label:'Plancher étage — synthetic right'}]});
 return s;
}
const canopy=canopyScenario(),canopyResult=build(canopy),columns=canopyResult.byLevel.flatMap(l=>l.exteriorElements).filter(e=>e.type==='column');
assert.equal(columns.length,2);for(const column of columns){close(column.size[0],.2);close(column.size[1],.2);close(column.origin[1],-1.2);assert.equal(column.supportMaterial,'unknown');assert.equal(column.provenance.depth.sourceViewId,'canopy-right');assert.equal(column.provenance.structuralVerification,false);}
assert.equal(canopyResult.byLevel.flatMap(l=>l.exteriorElements).filter(e=>['beam','roof','deck','slab'].includes(e.type)).length,0,'a roof guide stroke does not invent beam/slab thickness or a canopy roof');
assert.ok(canopyResult.issues.includes('ENTRY_BEAM_SECTION_UNRESOLVED'));
// Side-view depth is resolved before assigning a post to a facade. A garage
// in front cannot borrow the post behind it from the elevation projection.
const hiddenColumn=canopyScenario(),columnGarage=structuredClone(garageLevel);
columnGarage.observedPlanes[0].registration.sourceViewIds=[hiddenColumn.front.id,'canopy-right'];hiddenColumn.levels.push(columnGarage);hiddenColumn.inventory.levels.push(columnGarage);
const hiddenColumnResult=build(hiddenColumn),visibleColumns=hiddenColumnResult.byLevel.flatMap(l=>l.exteriorElements).filter(e=>e.type==='column');
assert.equal(visibleColumns.length,1,'the column wholly behind the garage is excluded');close(visibleColumns[0].origin[0],8);assert.equal(visibleColumns[0].parentWallId,w.id,'the column just outside the garage edge still belongs to the visible house wall');
assert.ok(hiddenColumnResult.issues.includes('COLUMN_HIDDEN_BY_NEARER_VOLUME'));
const columnConflict=hiddenColumnResult.byLevel.flatMap(l=>l.conflicts).find(c=>c.type==='column');assert.equal(columnConflict.candidates.length,1);close(columnConflict.candidates[0].origin[0],4);assert.deepEqual(columnConflict.occludingWallIds,[columnGarage.observedPlanes[0].id]);
columnGarage.observedPlanes[0].from[1]=-.5;columnGarage.observedPlanes[0].to[1]=-.5;
const inFrontColumns=build(hiddenColumn).byLevel.flatMap(l=>l.exteriorElements).filter(e=>e.type==='column');assert.equal(inFrontColumns.length,2,'a post actually in front of the garage remains usable');assert.equal(inFrontColumns.find(c=>Math.abs(c.origin[0]-4)<.001).parentWallId,columnGarage.observedPlanes[0].id);
delete canopy.images['canopy-right'];const missingDepth=build(canopy);assert.equal(missingDepth.byLevel.flatMap(l=>l.exteriorElements).filter(e=>e.type==='column').length,0);assert.ok(missingDepth.issues.includes('COLUMN_DEPTH_UNRESOLVED'));
const originalMask=[0,0,100,100],remaining=E.subtractBoxes(originalMask,[[20,20,60,60]]);assert.equal(remaining.reduce((sum,b)=>sum+b[2]*b[3],0),6400);assert.deepEqual(originalMask,[0,0,100,100]);
console.log('PASS source exterior: calibrated visible foundation, user-rule thickness with written conflicts, masonry joint evidence, legend/opening/nearer-wall exclusions, repeated-source consolidation, two-view columns, stable IDs and project isolation');
