// Synthetic rasters and dimensions only; no client drawing or source coordinates.
'use strict';const assert=require('node:assert/strict'),G=require('../dist/plan-grid-registration.js'),R=require('../dist/plan-reconstruction.js'),M=require('../dist/plan-level-model.js');
function drawing(items){const width=1000,height=700,image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)},rows=[];for(const[label,x,y]of items){for(let a=0;a<360;a++)for(const d of[-1,0,1]){const xx=Math.round(x+Math.cos(a*Math.PI/180)*(17+d)),yy=Math.round(y+Math.sin(a*Math.PI/180)*(17+d));image.data.set([0,0,0,255],(yy*width+xx)*4);}rows.push({text:label,confidence:95,box:[x-4,y-4,x+4,y+4]});}return {image,rows};}
const f=drawing([['1',150,70],['2',330,70],['3',510,70],['4',690,70],['A',100,250],['B',100,550]]),floor={id:'floor',kind:'floor',buildingId:'house',levelId:'level-3',frame:{rasterSize:[1000,700],units:'pixels'},payload:{drawingReadings:{rows:f.rows}}},draft={sourceViewId:floor.id,reference:{value:12,anchors:[[100,300],[700,300]],sourceViewId:floor.id,status:'proposed',kind:'written'},alignment:{origin:[150,550],offset:[0,0],rotationDegrees:0,status:'proposed'}};
function elev(direction,{shift=0,missing=[],warp=0}={}){const numeric=['front','back'].includes(direction),labels=numeric?['1','2','3','4']:['A','B'],world=label=>numeric?Number(label-1)*3.6:label==='A'?6:0,sign=['back','left'].includes(direction)?-1:1,offset=sign<0?numeric?750:400:100,source=drawing(labels.filter(l=>!missing.includes(l)).map(l=>[l,offset+40*sign*world(l)+shift+(l==='3'?warp:0),70]));return {...source,view:{id:'elev-'+direction,kind:'elevation',buildingId:'house',direction,frame:{rasterSize:[1000,700],units:'pixels'},payload:{drawingReadings:{rows:source.rows}}},offset,sign};}
const run=e=>G.elevationAxisRegistration(floor,e.view,f.image,e.image,draft);for(const d of ['front','back','left','right']){const e=elev(d),original=structuredClone(e),r=run(e);assert.equal(r.status,'proposed',d);assert.equal(r.transform.modelAxis,['front','back'].includes(d)?'x':'y');assert.equal(r.transform.projectionSign,e.sign);assert.ok(Math.abs(r.transform.pixelsPerMetre-40)<1e-9);assert.ok(Math.abs(r.transform.offsetPixels-e.offset)<1e-9);assert.equal(r.verticalStatus,'unresolved');assert.equal(r.perpendicularStatus,'unresolved');assert.ok(!r.walls&&!r.height&&!r.contours);assert.equal(r.notAGeometryConfirmation,true);assert.deepEqual(e,original);const bubbles=G.bubbleRegions(e.image,{layout:['front','back'].includes(d)?'elevation-number':'elevation-letter'});assert.equal(bubbles.status,'proposed');assert.equal(bubbles.bubbles.length,['front','back'].includes(d)?4:2);}
assert.equal(run(elev('front',{missing:['1','4']})).reason,'ELEVATION_GRID_LABELS_REQUIRED');assert.equal(run(elev('front',{warp:18})).reason,'ELEVATION_GRID_RESIDUAL_CONFLICT');const wrong=elev('front');wrong.view.direction='back';assert.equal(run(wrong).reason,'ELEVATION_GRID_DIRECTION_CONFLICT');const foreign=elev('front');foreign.view.buildingId='shed';assert.equal(run(foreign).reason,'ELEVATION_GRID_SOURCE_REQUIRED');
const e=elev('front'),reference={sourceViewId:e.view.id,anchors:[[100,300],[500,300]],value:12,status:'proposed',kind:'written'};assert.equal(G.elevationAxisRegistration(floor,e.view,f.image,e.image,draft,{elevationReference:reference}).reason,'ELEVATION_GRID_SCALE_CONFLICT');assert.equal(G.elevationAxisRegistration(floor,e.view,f.image,e.image,{...draft,alignment:{...draft.alignment,rotationDegrees:90}}).reason,'ELEVATION_GRID_CALIBRATION_REQUIRED');
const noInk={...e,image:{...e.image,data:new Uint8ClampedArray(e.image.data.length).fill(255)}};assert.equal(run(noInk).reason,'ELEVATION_GRID_LABELS_REQUIRED');
const pixels=G.alignElevationAxes(floor,e.view,f.image,e.image);assert.equal(pixels.status,'proposed');assert.equal(pixels.units,'source-pixels');assert.ok(!pixels.reference&&!pixels.height,'pixel correspondence never fabricates a physical reference');assert.ok(Math.abs(pixels.transform.scale-.8)<1e-9);
const {gridElevationEnvelope}=R,outline={sourceViewId:floor.id,points:[[150,250],[690,250],[690,550],[150,550]]},guides=[{sourceViewId:e.view.id,levelHint:'level-3',datumType:'floor',y:500,confidence:95,label:'Floor level 3',sourceGuide:{anchors:[[700,500],[900,500]],support:1,method:'caption-and-visible-monochrome-datum-stroke'}},{sourceViewId:e.view.id,levelHint:'level-3',datumType:'ceiling',y:380,confidence:95,label:'Ceiling level 3',sourceGuide:{anchors:[[700,380],[900,380]],support:1,method:'caption-and-visible-monochrome-datum-stroke'}}],envelope=gridElevationEnvelope(G,floor,e.view,{floor:f.image,[e.view.id]:e.image},outline,guides);assert.equal(envelope.status,'proposed');assert.deepEqual(envelope.box.map(v=>Math.round(v)),[100,380,432,120]);assert.equal(envelope.geometryCreated,false);assert.equal(gridElevationEnvelope(G,floor,e.view,{floor:f.image,[e.view.id]:e.image},outline,guides.slice(0,1)).reason,'ELEVATION_GRID_LEVEL_DATUM_REQUIRED');
const cropped=elev('front');cropped.view.frame.rasterSize=[2200,1600];cropped.view.payload.sourceWidth=1000;cropped.view.payload.sourceHeight=700;cropped.view.zone=[300,200,1000,700];assert.equal(run(cropped).status,'proposed','upright cropped image dimensions outrank full page raster size');
const mismatched=elev('front');mismatched.view.payload.sourceWidth=900;assert.equal(run(mismatched).reason,'ELEVATION_GRID_FRAME_REQUIRED');
assert.equal(G.elevationAxisRegistration(floor,e.view,f.image,e.image,{...draft,alignment:{...draft.alignment,origin:[150]}}).reason,'ELEVATION_GRID_CALIBRATION_REQUIRED');
const conflictingLabel=elev('front');conflictingLabel.view.payload.drawingReadings.rows.push({...conflictingLabel.rows[0],text:'2'});const cleanOnly=run(conflictingLabel);assert.equal(cleanOnly.status,'proposed','three remaining independent axes suffice');assert.equal(cleanOnly.checks.length,3);assert.ok(cleanOnly.checks.every(c=>c.elevation.point[0]!==conflictingLabel.rows[0].box[0]+4),'ambiguous circle itself never contributes to the fit');


// The same source-band correspondence must reach the height and client
// projection code. A level-only box is not an incomplete building facade.
const level={id:'house:level-3',buildingId:'house',sourceLevel:'level-3',contours:[]},inventory={views:[floor,e.view],levels:[level]},sourceReference={...draft.reference,scale:.02},viewInfo={viewId:e.view.id,direction:'front',facing:R.registeredSpan(outline.points,'front',envelope),envelope,guides};
const heights=R.heightFromLevelDatums([viewInfo],'level-3',sourceReference,inventory);
assert.equal(heights.length,1,'two observed band limits remain usable when they define the entire registration box');
assert.equal(heights[0].value,3);assert.equal(heights[0].scaleUsed,.025);
assert.equal(heights[0].references[0].relationship.gridRegistration.floorSourceViewId,floor.id);
assert.equal(heights[0].references[0].sourceViewId,e.view.id,'calibration anchors belong to the elevation, never the plan');
const model=M.draftFor(floor,level);model.points=outline.points.map((xy,i)=>({id:'corner-'+i,xy}));model.reference=sourceReference;model.alignment=structuredClone(draft.alignment);model.height=heights[0];model.base={value:7,kind:'local-datum',status:'proposed'};
const projected=R.elevationRegistration(viewInfo,model,inventory);
assert.ok(Math.abs(projected.u(100))<1e-9);assert.ok(Math.abs(projected.u(532)-10.8)<1e-9);assert.equal(projected.z(500),7);assert.equal(projected.z(380),10);
const absentDatum=guides.map(g=>({...g,sourceGuide:undefined}));assert.equal(gridElevationEnvelope(G,floor,e.view,{floor:f.image,[e.view.id]:e.image},outline,absentDatum).reason,'ELEVATION_GRID_LEVEL_DATUM_REQUIRED','captions alone cannot create a band');
const conflictingDatums=[...guides,{...guides[1],y:350,sourceGuide:{...guides[1].sourceGuide,anchors:[[700,350],[900,350]]}}];assert.equal(gridElevationEnvelope(G,floor,e.view,{floor:f.image,[e.view.id]:e.image},outline,conflictingDatums).status,'conflict','two disagreeing captioned strokes are never averaged');
assert.deepEqual(JSON.parse(JSON.stringify(envelope)),envelope,'source axes, frame and datum evidence survive persistence');

// Multi-retreat outline: the small front return is part of the axis-registered
// projection even though the old raster fallback fits the dominant wall only.
const stepped=[[0,.5],[1,.5],[1,0],[11,0],[11,7],[0,7]],gridEnvelope={status:'proposed',box:[100,200,440,160],gridRegistration:{status:'proposed'}},legacyEnvelope={status:'proposed',box:[100,200,400,160]};
assert.equal(R.faceSpan(stepped,'front',{world:true}).length,10);
assert.equal(R.registeredSpan(stepped,'front',gridEnvelope,{world:true}).length,11);
assert.equal(R.registeredSpan(stepped,'front',legacyEnvelope,{world:true}).length,10,'the independent raster-only fallback retains its existing geometry contract');

// Real production proposal from independent synthetic raster strokes. It
// must consume labelled axes and retain the rejection when direction conflicts.
function line(im,a,b,width=1){const distance=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=distance;i++)for(let dy=-Math.floor(width/2);dy<=Math.floor(width/2);dy++)for(let dx=-Math.floor(width/2);dx<=Math.floor(width/2);dx++){const x=Math.round(a[0]+(b[0]-a[0])*i/distance)+dx,y=Math.round(a[1]+(b[1]-a[1])*i/distance)+dy;if(x>=0&&y>=0&&x<im.width&&y<im.height)im.data.set([0,0,0,255],(y*im.width+x)*4);}}
const sourceFloor=structuredClone(floor),floorImage={...f.image,data:new Uint8ClampedArray(f.image.data)},sourceElevation=elev('front');
outline.points.forEach((p,i)=>line(floorImage,p,outline.points[(i+1)%outline.points.length],6));
for(const y of [380,500])line(sourceElevation.image,[700,y],[930,y]);
sourceElevation.view.payload.drawingReadings.rows.push({text:'Plafond niveau 3',confidence:95,box:[730,366,875,375]},{text:'Plancher niveau 3',confidence:95,box:[730,486,875,495]});
// An unrelated long frame is deliberately placed where a facade spine fit
// could be tempted to use it. Shared source axes retain their own projection.
line(sourceElevation.image,[950,240],[950,640],4);
const importInventory={views:[sourceFloor,sourceElevation.view],levels:[structuredClone(level)]},images={[sourceFloor.id]:floorImage,[sourceElevation.view.id]:sourceElevation.image},originalInventory=structuredClone(importInventory);
const proposed=R.propose(importInventory,'house',images,{levelId:level.id});
assert.equal(proposed.status,'proposed');assert.equal(proposed.views[0].envelope.status,'proposed');
assert.equal(proposed.views[0].envelope.method,'floor-contour-shared-axes-and-visible-level-datums');
assert.ok(proposed.views[0].envelope.box[0]<110&&proposed.views[0].envelope.box[0]+proposed.views[0].envelope.box[2]<550,'document frame cannot replace the contour projected through its shared axes');
assert.equal(proposed.draft.height.value,null,'axes without a physical dimension do not manufacture metres');
assert.deepEqual(importInventory,originalInventory);
const reversed=structuredClone(importInventory);reversed.views[1].direction='back';
const refused=R.propose(reversed,'house',images,{levelId:level.id});
assert.equal(refused.views[0].envelope.status,'conflict');assert.equal(refused.views[0].envelope.reason,'ELEVATION_GRID_DIRECTION_CONFLICT');assert.ok(!refused.views[0].envelope.box,'a contradictory axis order cannot silently revert to the facade fit');
// A ceiling is not the next floor. Keep that independent observation without
// turning the slab/ceiling gap into a false cross-view dimension conflict.
const bandSource={...viewInfo,envelope:{status:'proposed',box:[100,200,432,400]},guides:[{...guides[0],levelHint:'level-2',y:500},{...guides[1],levelHint:'level-3',datumType:'floor',y:380}]},ceilingSource={...bandSource,viewId:'other-elevation',guides:[{...bandSource.guides[0],sourceViewId:'other-elevation'},{...guides[1],sourceViewId:'other-elevation',levelHint:'level-2',y:400}]};
const comparable=R.heightFromLevelDatums([bandSource,ceilingSource],'level-2',sourceReference,inventory),allPairs=R.heightFromLevelDatums([bandSource,ceilingSource],'level-2',sourceReference,inventory,{includeAlternativePairs:true});
assert.deepEqual(comparable.map(h=>h.value),[3]);assert.deepEqual(allPairs.map(h=>h.value),[3,2.5],'the distinct ceiling observation remains available with its source');
const disagreeingFloor={...ceilingSource,guides:[ceilingSource.guides[0],{...ceilingSource.guides[1],levelHint:'level-3',datumType:'floor',y:360}]};
assert.deepEqual(R.heightFromLevelDatums([bandSource,disagreeingFloor],'level-2',sourceReference,inventory).map(h=>h.value),[3,3.5],'contradictions of the SAME floor pair remain separate candidates');
console.log('PASS elevation axes: four directions, mirrors, crop frames, source-band heights and projection, generic raster proposal, explicit conflicts, no invented dimensions or confirmed geometry');
