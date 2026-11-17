'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const X=require('../dist/studio-exterior-model.js'),M=require('../dist/plan-level-model.js'),S=require('../dist/studio-surfaces.js'),{fixture}=require('./helpers/mir-studio-s2-model.cjs');
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-8,(label||'value')+': '+actual+' != '+expected);

function proposedDetails(){
 const inventory=fixture(),level=inventory.levels.find(l=>l.id==='house:ground'),source=inventory.views.find(v=>v.kind==='elevation'&&v.buildingId==='house'),wall=M.wallsFor(level,inventory).find(w=>w.normal[1]<-.99);
 const foundation={id:'synthetic-visible-foundation',type:'foundation',phase:'existing',status:'proposed',levelId:level.id,buildingId:level.buildingId,parentWallId:wall.id,
  origin:[wall.from[0],wall.from[1],-.8],size:[wall.length,.254,.8],rotationDegrees:0,sourceViewId:source.id,sourceFrame:structuredClone(source.frame),sourceBox:[120,700,600,40],
  provenance:{kind:'estimated-calibrated',sourceCategory:'pdf-source-proposal'},quantityStatus:'partial-unreviewed',extentStatus:'visible-above-grade-only',belowGradeDepth:null};
 const masonry={id:'synthetic-masonry-zone',wallId:wall.id,levelId:level.id,buildingId:level.buildingId,kind:'masonry',status:'proposed',polygon:[[1,.5],[5,.5],[5,1.5],[1,1.5]],
  selection:{pattern:'brick',color:'#ad9989'},sourceViewId:source.id,sourceFrame:structuredClone(source.frame),sourceBox:[170,500,200,50],quantityStatus:'partial-unreviewed'};
 level.exteriorElements=[foundation];level.wallZones=[masonry];
 return {inventory,level,source,wall,foundation,masonry};
}

function entryDetails(){
 const sample=proposedDetails(),side=structuredClone(sample.source);side.id='synthetic-entry-right';side.direction='right';sample.inventory.views.push(side);
 const observation=(view,box)=>({kind:'estimated-calibrated',status:'proposed',sourceViewId:view.id,sourceFrame:structuredClone(view.frame),sourceBox:box,boxFormat:'xywh',anchors:[[box[0],box[1]],[box[0]+box[2],box[1]+box[3]]],scalesUsed:{x:.02,y:.015}});
 const frontEvidence=observation(sample.source,[220,300,200,20]),sideEvidence=observation(side,[100,300,80,20]);
 const beam={...structuredClone(sample.foundation),id:'synthetic-entry-beam',type:'beam',origin:[2,-1,2.4],size:[4,null,.3],surfaceOnly:true,sourceBox:frontEvidence.sourceBox,provenance:{...frontEvidence,sourceCategory:'pdf-source-proposal',sources:[frontEvidence,sideEvidence],sourceViewIds:[sample.source.id,side.id]}};
 const column={...structuredClone(beam),id:'synthetic-entry-column',type:'column',size:[.2,.3,2.4],surfaceOnly:false,provenance:{...frontEvidence,sourceCategory:'pdf-source-proposal',depth:{...sideEvidence,value:.3,unit:'m'},alternateDepthObservations:[],sourceViewIds:[sample.source.id,side.id]}};
 const roof={id:'synthetic-entry-roof',levelId:sample.level.id,buildingId:'house',status:'proposed',profiles:{x:[[2,2.8],[4,3.5],[6,2.8]],y:[[-1.3,2.8],[0,3.4]]},entryAssembly:{version:1,frontViewId:sample.source.id,sideViewIds:[side.id],parentWallId:sample.wall.id},sources:[{axis:'x',sourceViewId:sample.source.id,sourceFrame:structuredClone(sample.source.frame),anchors:[[220,300],[320,250],[420,300]],scaleX:.02,scaleY:.015,kind:'estimated-calibrated',status:'proposed'},{axis:'y',sourceViewId:side.id,sourceFrame:structuredClone(side.frame),anchors:[[100,300],[180,250]],scaleX:.02,scaleY:.015,kind:'estimated-calibrated',status:'proposed'}]};
 sample.level.exteriorElements=[beam,column];sample.level.wallZones=[];sample.level.reconstructedRoofs=[roof];
 return {...sample,side,beam,column,roof};
}

(async()=>{
 const sample=proposedDetails(),untouched=structuredClone(sample.inventory);
 const P=require('../dist/plan-reconstruction-pipeline.js');
 for(const detail of [{exteriorElements:[{id:'manual-post'}]},{soffits:[{id:'manual-soffit'}]},{cornerFinishes:{'manual-corner':{color:'#445566'}}}]){const inventory=fixture();inventory.levels=inventory.levels.filter(l=>l.buildingId==='house').map(l=>({id:l.id,buildingId:l.buildingId,sourceLevel:l.sourceLevel,...structuredClone(detail)}));const before=structuredClone(inventory),result=P.build(inventory,'house',{});assert.equal(result.status,'preserved');assert.equal(result.levels.length,0,'A fresh conversion must preserve even a level containing only a manual exterior choice.');assert.deepEqual(inventory,before);}
 assert.deepEqual(X.proposalIssues(sample.level,sample.inventory),[],'Valid details fit their source view and physical wall.');
 const reject=(mutate,code,label)=>{
  const inventory=structuredClone(sample.inventory),level=inventory.levels.find(l=>l.id===sample.level.id);
  mutate(level,inventory);assert.ok(X.proposalIssues(level,inventory).includes(code),label);
 };
 // Validate both generated element and material-region provenance. A frame of
 // the same size in another building does not make its evidence transferable.
 for(const field of ['exteriorElements','wallZones']){
  reject((level,inventory)=>{const foreign=structuredClone(sample.source);foreign.id='synthetic-other-building-elevation';foreign.buildingId=inventory.levels.find(l=>l.buildingId!=='house').buildingId;inventory.views.push(foreign);level[field][0].sourceViewId=foreign.id;},'EXTERIOR_SOURCE',field+': evidence from another building is rejected.');
  reject(level=>{level[field][0].sourceFrame.pdfToRaster[0]*=2;},'EXTERIOR_SOURCE',field+': a different source transform is rejected.');
  reject(level=>{level[field][0].sourceBox=[-1,100,40,20];},'EXTERIOR_SOURCE_BOUNDS',field+': negative source coordinates are rejected.');
  reject(level=>{level[field][0].sourceBox=[995,100,20,20];},'EXTERIOR_SOURCE_BOUNDS',field+': a region past the source width is rejected.');
  reject(level=>{level[field][0].sourceBox=[100,795,20,20];},'EXTERIOR_SOURCE_BOUNDS',field+': a region past the source height is rejected.');
  reject(level=>{level[field][0].status='confirmed';},'EXTERIOR_PROPOSAL_STATUS',field+': automatic evidence cannot arrive preconfirmed.');
 }
 reject(level=>{level.wallZones[0].polygon=[[0,0],[2,2],[0,2],[2,0]];},'EXTERIOR_ZONE_POLYGON','A self-intersecting material region is rejected.');
 reject(level=>{level.wallZones[0].polygon=[[0,0],[0,0],[2,1]];},'EXTERIOR_ZONE_POLYGON','A duplicate edge cannot define a material surface.');
 reject(level=>{level.wallZones[0].polygon=[[0,0],[2,0],[2,4],[0,4]];},'EXTERIOR_ZONE_BOUNDS','A valid polygon extending above its wall is rejected.');
 reject(level=>{level.exteriorElements[0].parentWallId='synthetic-absent-wall';},'EXTERIOR_WALL','A foundation cannot reference a nonexistent wall.');
 reject(level=>{level.wallZones[0].wallId='synthetic-absent-wall';},'EXTERIOR_ZONE_WALL','A material region cannot reference a nonexistent wall.');
 reject(level=>{level.wallZones[0].id=level.exteriorElements[0].id;},'EXTERIOR_DUPLICATE','Generated identities are unique across elements and zones.');
 assert.deepEqual(sample.inventory,untouched,'Validation never rewrites source geometry or statuses.');

 // A paired-view shape must validate every contributing observation, not only
 // its front view. Each view retains its own frame and independent x/y scale.
 const entry=entryDetails(),entryBefore=structuredClone(entry.inventory);
 assert.deepEqual(X.proposalIssues(entry.level,entry.inventory),[],'Valid orthogonal entry roof, visible beam skin and column depth evidence are accepted.');
 const rejectEntry=(mutate,code,label)=>{const inventory=structuredClone(entry.inventory),level=inventory.levels.find(l=>l.id===entry.level.id);mutate(level,inventory);assert.ok(X.proposalIssues(level,inventory).includes(code),label);};
 rejectEntry(level=>{level.exteriorElements[1].provenance.depth.sourceViewId='synthetic-missing-side';},'EXTERIOR_SOURCE','A missing column depth source fails validation.');
 rejectEntry((level,inventory)=>{const foreign=structuredClone(entry.side);foreign.id='synthetic-foreign-side';foreign.buildingId='shed';inventory.views.push(foreign);level.exteriorElements[1].provenance.depth.sourceViewId=foreign.id;},'EXTERIOR_SOURCE','A different building cannot establish column depth.');
 rejectEntry(level=>{level.exteriorElements[1].provenance.depth.sourceFrame.pdfToRaster[0]=2;},'EXTERIOR_SOURCE','Depth uses its exact original frame.');
 rejectEntry(level=>{level.exteriorElements[1].provenance.depth.sourceBox=[-1,300,80,20];},'EXTERIOR_SOURCE_BOUNDS','A negative depth-source box is rejected.');
 rejectEntry(level=>{level.exteriorElements[1].provenance.alternateDepthObservations=[{...structuredClone(entry.column.provenance.depth),sourceBox:[990,300,80,20]}];},'EXTERIOR_SOURCE_BOUNDS','Alternate depth observations are checked even when the preferred observation is valid.');
 rejectEntry(level=>{level.exteriorElements[0].provenance.sources[1].anchors[0][1]=801;},'EXTERIOR_SOURCE_BOUNDS','A hidden out-of-frame supporting anchor is rejected.');
 rejectEntry(level=>{level.exteriorElements[0].provenance.sources[1].scalesUsed.y=0;},'EXTERIOR_SOURCE_SCALE','A contributing source cannot have a zero vertical scale.');
 rejectEntry(level=>{level.exteriorElements[1].provenance.depth.value=-.3;},'EXTERIOR_SOURCE_DIMENSIONS','A negative observed depth is invalid.');
 rejectEntry(level=>{level.exteriorElements[1].provenance.depth='invalid';},'EXTERIOR_SOURCE','Malformed nested evidence returns a validation error without throwing.');
 rejectEntry(level=>{level.exteriorElements[1].provenance.topEvidence={...structuredClone(entry.column.provenance.depth),sourceViewId:'synthetic-missing-top'};},'EXTERIOR_SOURCE','The observed beam underside contributing to column height needs a valid source.');
 rejectEntry(level=>{level.exteriorElements[1].provenance.alternateObservations=[{...structuredClone(entry.column.provenance.depth),sourceFrame:{wrong:true}}];},'EXTERIOR_SOURCE','Repeated observations retain validated frames.');
 rejectEntry(level=>{level.exteriorElements[0].provenance.sourceViewIds.push('synthetic-missing-view');},'EXTERIOR_SOURCE','An unresolvable contributing source ID is rejected.');
 rejectEntry((level,inventory)=>{const extra=structuredClone(entry.side);extra.id='synthetic-unrecorded-side';inventory.views.push(extra);level.exteriorElements[0].provenance.sourceViewIds.push(extra.id);},'EXTERIOR_SOURCE_OBSERVATIONS','An ID alone cannot stand in for a recorded frame and source observation.');
 rejectEntry(level=>{level.reconstructedRoofs[0].sources[1].axis='x';},'ENTRY_ROOF_SOURCE_AXES','Two records of the same axis cannot establish a two-axis roof.');
 rejectEntry(level=>{level.reconstructedRoofs[0].entryAssembly.sideViewIds={id:entry.side.id};},'ENTRY_ROOF_SOURCE_AXES','Malformed side declarations return a validation error without throwing.');
 rejectEntry(level=>{level.reconstructedRoofs[0].sources[1].sourceViewId=entry.source.id;level.reconstructedRoofs[0].sources[1].sourceFrame=structuredClone(entry.source.frame);},'ENTRY_ROOF_SOURCE_AXES','Relabelling the front source as y does not establish roof depth.');
 rejectEntry((level,inventory)=>{inventory.views.find(v=>v.id===entry.side.id).direction='front';},'ENTRY_ROOF_SOURCE_AXES','A claimed side view must really be a left or right elevation.');
 rejectEntry(level=>{level.reconstructedRoofs[0].sources[1].sourceFrame.cropToRaster[4]=1;},'EXTERIOR_SOURCE','A roof source frame is checked against the source view.');
 rejectEntry(level=>{level.reconstructedRoofs[0].sources[1].anchors[1][0]=1001;},'EXTERIOR_SOURCE_BOUNDS','A roof profile anchor must lie inside the source raster.');
 rejectEntry(level=>{level.reconstructedRoofs[0].sources[1].scaleY=-.015;},'EXTERIOR_SOURCE_SCALE','Roof scales must be positive.');
 rejectEntry(level=>{level.reconstructedRoofs[0].buildingId='shed';},'ENTRY_ROOF_OWNERSHIP','An entrance roof cannot belong to a different building.');
 rejectEntry(level=>{level.reconstructedRoofs[0].levelId='house:upper';},'ENTRY_ROOF_OWNERSHIP','An entrance roof cannot belong to a different level.');
 rejectEntry(level=>{level.reconstructedRoofs[0].entryAssembly.parentWallId='synthetic-absent-wall';},'EXTERIOR_WALL','An entrance roof must keep its real supporting facade association.');
 rejectEntry(level=>{level.reconstructedRoofs[0].status='confirmed';},'EXTERIOR_PROPOSAL_STATUS','An automatically generated entrance roof does not arrive preconfirmed.');
 rejectEntry(level=>{level.reconstructedRoofs[0].id=level.exteriorElements[0].id;},'EXTERIOR_DUPLICATE','Roof and exterior element IDs must remain distinct.');
 assert.deepEqual(entry.inventory,entryBefore,'Contributing source validation never changes the imported evidence.');
 const roofOnly=structuredClone(entry.inventory),roofOnlyLevel=roofOnly.levels.find(l=>l.id===entry.level.id);roofOnlyLevel.exteriorElements=[];assert.deepEqual(X.proposalIssues(roofOnlyLevel,roofOnly),[],'An entry roof can be validated independently of exterior element presence.');

 // A flat entrance's full footprint is a separate floor-plan observation;
 // the visible side projection alone cannot establish its hidden attachment.
 const flat=entryDetails(),floor=flat.inventory.views.find(v=>v.kind==='floor'&&v.buildingId==='house'&&v.levelId==='ground'),planLabel={text:'Toit plat avec membrane',sourceBox:[440,620,680,640],boxFormat:'xyxy'};
 floor.payload.drawingReadings={rows:[{text:planLabel.text,box:structuredClone(planLabel.sourceBox),source:'pdf-text',confidence:100}]};
 flat.roof.roofForm='flat';flat.roof.profiles={x:[[2,2.8],[6,2.8]],y:[[-1.3,2.8],[0,2.8]]};flat.roof.planEvidence={sourceViewId:floor.id,sourceFrame:structuredClone(floor.frame),anchors:[[220,745],[420,745],[420,680],[220,680]],sourceBox:[220,680,200,65],boxFormat:'xywh',scaleX:.02,scaleY:.02,kind:'estimated-calibrated',status:'proposed',alignment:structuredClone(flat.level.contours[0].alignment),footprint:[[2,-1.3],[6,-1.3],[6,0],[2,0]],label:planLabel,leader:{points:[[440,630],[430,630],[380,710]],method:'connected-note-leader-to-closed-footprint'}};
 flat.roof.sources[0].scaleY=.02;
 assert.deepEqual(X.proposalIssues(flat.level,flat.inventory),[],'A labelled floor footprint with its actual registered corners supports the flat entrance envelope.');
 flat.roof.observedFascia=[{id:flat.roof.id+':front-fascia',sourceViewId:flat.source.id,sourceFrame:structuredClone(flat.source.frame),sourceBox:[220,300,200,25],boxFormat:'xywh',anchors:[[220,300],[420,300],[420,325],[220,325]],scaleX:.02,scaleY:.02,status:'proposed',poly:[[2,-1.3,2.3],[6,-1.3,2.3],[6,-1.3,2.8],[2,-1.3,2.8]],normal:[0,-1,0]}];
 assert.deepEqual(X.proposalIssues(flat.level,flat.inventory),[],'An observed front fascia retains its own source section and anchors.');
 const rejectPlan=(mutate,code,label)=>{const inventory=structuredClone(flat.inventory),level=inventory.levels.find(l=>l.id===flat.level.id);mutate(level.reconstructedRoofs[0],inventory,level);assert.ok(X.proposalIssues(level,inventory).includes(code),label);};
 rejectPlan(roof=>{delete roof.planEvidence;},'ENTRY_ROOF_PLAN_REQUIRED','This flat entrance contract cannot discard its floor footprint proof.');
 rejectPlan(roof=>{roof.planEvidence.sourceViewId=flat.source.id;roof.planEvidence.sourceFrame=structuredClone(flat.source.frame);},'EXTERIOR_SOURCE','An elevation cannot substitute for the declared floor observation.');
 rejectPlan((roof,inventory)=>{const foreign=inventory.views.find(v=>v.kind==='floor'&&v.buildingId!=='house');roof.planEvidence.sourceViewId=foreign.id;roof.planEvidence.sourceFrame=structuredClone(foreign.frame);},'EXTERIOR_SOURCE','Another building cannot supply a flat-roof footprint.');
 rejectPlan(roof=>{roof.planEvidence.sourceFrame.cropToRaster[4]=5;},'EXTERIOR_SOURCE','The floor observation retains its exact source frame.');
 rejectPlan(roof=>{roof.planEvidence.anchors[0][1]=801;},'EXTERIOR_SOURCE_BOUNDS','Floor footprint anchors stay within the source raster.');
 rejectPlan(roof=>{roof.planEvidence.scaleY=0;},'EXTERIOR_SOURCE_SCALE','A flat-roof footprint needs a positive second scale.');
 rejectPlan(roof=>{roof.planEvidence.footprint[0][0]+=.2;},'ENTRY_ROOF_PLAN_FOOTPRINT','The physical footprint must reproduce its source corners.');
 rejectPlan(roof=>{roof.profiles.y[0][0]-=.3;},'ENTRY_ROOF_PLAN_FOOTPRINT','The rendered roof cannot extend beyond its observed plan footprint.');
 rejectPlan(roof=>{roof.planEvidence.alignment.offset[0]+=.5;roof.planEvidence.footprint=roof.planEvidence.footprint.map(([x,y])=>[x+.5,y]);roof.profiles.x=roof.profiles.x.map(([x,z])=>[x+.5,z]);},'ENTRY_ROOF_PLAN_REGISTRATION','A self-consistent but shifted plan transform cannot contradict the existing floor registration.');
 rejectPlan(roof=>{roof.planEvidence.label.text='Unobserved flat roof label';},'ENTRY_ROOF_PLAN_LABEL','The copied roof label must exist in this source plan.');
 rejectPlan(roof=>{roof.planEvidence.leader.points[0][0]=1001;},'EXTERIOR_SOURCE_BOUNDS','The note leader cannot refer to off-page points.');
 rejectPlan(roof=>{roof.observedFascia[0].sourceViewId=flat.side.id;roof.observedFascia[0].sourceFrame=structuredClone(flat.side.frame);},'ENTRY_ROOF_FASCIA_SOURCE','A side return cannot provide the front fascia face.');
 rejectPlan(roof=>{roof.observedFascia[0].sourceFrame.pdfToRaster[0]=2;},'EXTERIOR_SOURCE','The fascia must use the actual source frame.');
 rejectPlan(roof=>{roof.observedFascia[0].sourceBox=[990,300,200,25];},'EXTERIOR_SOURCE_BOUNDS','A fascia source section must be in bounds.');
 rejectPlan(roof=>{roof.observedFascia[0].scaleY=0;},'EXTERIOR_SOURCE_SCALE','The fascia height needs a positive independent vertical scale.');
 rejectPlan(roof=>{roof.observedFascia[0].scaleY=.05;},'ENTRY_ROOF_FASCIA_SOURCE','The fascia cannot use a different calibration from its matching front roof observation.');
 rejectPlan(roof=>{roof.observedFascia[0].status='confirmed';},'EXTERIOR_PROPOSAL_STATUS','An observed fascia remains proposed with its roof.');

 // Only solid beams gain a true underside. Unknown beam depth remains one
 // observed skin; existing foundation and column face contracts are preserved.
 const solidBeam={...entry.beam,surfaceOnly:false,size:[4,.3,.3],rotationDegrees:90},beamFaces=X.elementFaces(solidBeam),bottomFace=beamFaces.find(face=>face.normal[2]<-.99);
 assert.equal(beamFaces.length,6);assert.ok(bottomFace,'A solid beam has a real downward-facing underside.');
 for(const point of bottomFace.poly)close(point[2],2.4,'beam underside altitude');
 assert.deepEqual(bottomFace.normal,[0,0,-1]);assert.ok(bottomFace.poly.every(p=>p[0]>=1.7-1e-8&&p[0]<=2+1e-8&&p[1]>=-1-1e-8&&p[1]<=3+1e-8),'The underside follows the same rotated beam coordinates.');
 assert.equal(X.elementFaces(entry.beam).length,1,'An unknown-depth beam does not acquire invented solid faces.');
 assert.equal(X.elementFaces(entry.column).length,5,'Historical column meshes retain their existing face count.');
 assert.equal(X.elementFaces(sample.foundation).length,5,'Historical foundation meshes retain their existing face count.');
 const manualBeam={id:'synthetic-manual-beam',type:'beam',phase:'existing',status:'confirmed',origin:[0,0,2.4],size:[3,.2,.25],rotationDegrees:0,provenance:{kind:'user-measurement',label:'Historical manual addition'}};
 assert.deepEqual(X.issues(manualBeam),[],'Manually positioned historical beams need no invented PDF source metadata.');
 assert.equal(X.elementFaces(manualBeam).length,6,'Historical manual beams render with their own real dimensions.');

 // Existing confirmed additions remain available. New automatic additions are
 // visible only in an explicit proposal preview, and remain proposals there.
 const confirmed={id:'synthetic-existing-post',type:'column',phase:'existing',status:'confirmed',origin:[1,1,0],size:[.2,.2,2.5],rotationDegrees:0,provenance:{kind:'user-measurement'}};
 sample.level.exteriorElements.push(confirmed);
 const foreignLevel=sample.inventory.levels.find(l=>l.buildingId!=='house');
 foreignLevel.exteriorElements=[{...structuredClone(confirmed),id:'synthetic-other-building-post'}];
 const beforeScene=structuredClone(sample.inventory),normal=X.scene(sample.inventory,'house'),preview=X.scene(sample.inventory,'house',{includeProposed:true});
 assert.deepEqual(normal.elements.map(e=>e.id),[confirmed.id],'Default scene excludes the new proposed foundation.');
 assert.deepEqual(new Set(preview.elements.map(e=>e.id)),new Set([sample.foundation.id,confirmed.id]),'Proposal preview includes only this building’s valid additions.');
 assert.equal(preview.elements.find(e=>e.id===sample.foundation.id).status,'proposed');
 assert.deepEqual(preview.quantities,normal.quantities,'Previewing a foundation does not add its volume or area to validated wall quantities.');
 assert.deepEqual(sample.inventory,beforeScene,'Rendering a preview does not confirm or mutate source data.');

 // Manual element preview is independent of contour/roof proposal preview.
 const draftInventory=structuredClone(sample.inventory),draftLevel=draftInventory.levels.find(l=>l.id===sample.level.id);
 for(const level of draftInventory.levels.filter(l=>l.buildingId==='house'))for(const contour of level.contours||[]){contour.status='proposed';for(const field of ['reference','height','base','alignment'])contour[field].status='proposed';}
 draftLevel.reconstructedRoofs=[{id:'synthetic-proposed-roof',levelId:draftLevel.id,buildingId:'house',status:'proposed'}];
 const elementsOnly=X.scene(draftInventory,'house',{includeProposedElements:true});
 assert.ok(elementsOnly.elements.some(e=>e.id===sample.foundation.id),'An explicit element-only preview preserves the interactive add-element workflow.');
 assert.equal(elementsOnly.walls.length,0,'Previewing an element does not expose unconfirmed contours.');
 assert.equal(elementsOnly.roofs.length,0,'Previewing an element does not expose unconfirmed roofs.');
 assert.equal(elementsOnly.quantities.rows.length,0,'Element preview does not confirm any wall measurements.');

 // Observed masonry is a source classification until a known product is chosen.
 // A stale/unknown material ID is not a valid selection that reclassifies it.
 const materials=require('../dist/materials.json').materials,siding=materials.find(m=>m.applications?.includes('siding')&&!m.applications.includes('masonry'));
 assert.ok(siding,'A real siding catalogue entry is required for this adapter test.');
 const face=S.faceFor(sample.wall,sample.level,materials,100),observed=face.zones.find(z=>z.id===sample.masonry.id);
 assert.equal(observed.kind,'masonry');assert.equal(observed.selection.materialId,undefined);assert.equal(observed.status,'proposed');
 assert.deepEqual(observed.polygon,sample.masonry.polygon.map(point=>point.map(value=>value*100)),'The material adapter preserves physical extents at the requested display scale.');
 const unknown=structuredClone(sample.level);unknown.wallZones[0].selection.materialId='synthetic-unavailable-product';
 assert.equal(S.faceFor(sample.wall,unknown,materials,1).zones.find(z=>z.id===sample.masonry.id).kind,'masonry');
 const selected=structuredClone(sample.level);selected.wallZones[0].selection.materialId=siding.id;
 const selectedBefore=structuredClone(selected),chosen=S.faceFor(sample.wall,selected,materials,1).zones.find(z=>z.id===sample.masonry.id);
 assert.equal(chosen.kind,'siding','A matching selected siding product can replace the observed display treatment.');
 assert.equal(chosen.selection.materialId,siding.id);assert.equal(chosen.status,'proposed');
 assert.deepEqual(selected,selectedBefore,'Choosing the display classification does not rewrite the original observed masonry kind or status.');

 // The public renderer geometry/diagnostic APIs are exercised with a no-op
 // Canvas 2D sink. This verifies bounds and projection, not rendered pixels.
 const sandbox={window:{MIRStudioExterior:X,MIRStudioSurfaces:S}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/plan-3d.js'),'utf8'),sandbox,{filename:'plan-3d.js'});
 const D=sandbox.window.MIR3D,mesh=D.mesh({levelScene:preview}),foundationFaces=mesh.faces.filter(f=>f.elementId===sample.foundation.id);
 assert.equal(foundationFaces.length,5,'Visible foundation produces its five actual box faces.');
 close(Math.min(...foundationFaces.flatMap(f=>f.poly.map(p=>p[2]))),-.8,'foundation lower bound');
 close(Math.max(...foundationFaces.flatMap(f=>f.poly.map(p=>p[2]))),0,'foundation contact with ground-floor wall');
 const noFoundation=D.mesh({levelScene:normal});
 assert.ok(noFoundation.faces.every(f=>f.elementId!==sample.foundation.id),'Default mesh cannot include the proposed foundation.');
 const context=Object.fromEntries(['setTransform','clearRect','save','restore','beginPath','moveTo','lineTo','closePath','fill','stroke','clip'].map(name=>[name,()=>{}]));
 const canvas={width:960,height:640,clientWidth:960,clientHeight:640,getBoundingClientRect:()=>({left:0,top:0,width:960,height:640}),getContext:kind=>{assert.equal(kind,'2d');return context;}};
 const originalRender=await D.render(canvas,{levelScene:normal,exportSize:{width:960,height:640},angle:25});
 const proposedRender=await D.render(canvas,{levelScene:preview,exportSize:{width:960,height:640},angle:25});
 assert.equal(originalRender.rendered,true);assert.equal(proposedRender.rendered,true);
 close(originalRender.groundZ,0,'confirmed model ground bound');close(proposedRender.groundZ,-.8,'foundation expands the model ground bound');
 assert.ok(proposedRender.hitSurfaces.some(surface=>surface.elementId===sample.foundation.id),'The foundation is represented in 3D selection geometry.');
 for(const surface of proposedRender.hitSurfaces)for(const [x,y]of surface.screenPolygon)assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=960&&y>=0&&y<=640,'Expanded source geometry remains inside the default fitted viewport.');
 D.dispose(canvas);
 console.log('PASS exterior integration: all contributing source frames/bounds/scales, orthogonal entry roof ownership, beam underside and unknown-depth skin, source statuses, valid wall polygons, opt-in proposals, observed masonry, foundation mesh and 3D ground bounds (no pixel/browser claim).');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
