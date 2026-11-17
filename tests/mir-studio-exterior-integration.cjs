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
 console.log('PASS exterior integration: source ownership/bounds/status, valid wall polygons, opt-in proposals, independent element preview, observed masonry versus selected product, foundation mesh and 3D ground bounds (no pixel/browser claim).');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
