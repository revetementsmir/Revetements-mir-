'use strict';
const assert=require('node:assert/strict'),E=require('../dist/plan-reconstructed-exterior.js'),V=require('../dist/plan-reconstruction-vision.js'),X=require('../dist/studio-exterior-model.js'),Roof=require('../dist/plan-reconstructed-roofs.js'),{entryFixture,blank,line,rectangle}=require('./helpers/mir-studio-entry-fixture.cjs');
const build=s=>E.build(s.proposal,s.inventory,s.images,s.reviewed,s.levels),details=r=>r.byLevel.flatMap(l=>l.exteriorElements),roofs=r=>r.byLevel.flatMap(l=>l.reconstructedRoofs||[]),close=(a,b,tolerance=.035)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);
const s=entryFixture(),before=structuredClone(s),result=build(s),beam=details(result).filter(e=>e.type==='beam'),columns=details(result).filter(e=>e.type==='column'),roof=roofs(result)[0];
assert.equal(beam.length,3,'front and two observed returns are separate beam faces');
assert.equal(columns.length,2);assert.equal(roofs(result).length,1,'independent entrance roof reconstructed from its two profiles');
for(const b of beam){assert.equal(b.surfaceOnly,true);assert.equal(b.size[1],null,'a side return is not the front beam thickness');assert.equal(b.supportMaterial,'unknown');assert.equal(b.provenance.structuralVerification,false);close(b.size[2],.16);assert.equal(X.elementFaces(b).length,1);}
const frontBeam=beam.find(b=>b.entryAssembly.part==='front');close(frontBeam.size[0],4.2);close(frontBeam.origin[1],-1.2);close(frontBeam.origin[2],2.84);
for(const post of columns)close(post.origin[2]+post.size[2],frontBeam.origin[2]);
for(const part of ['right','left']){const b=beam.find(b=>b.entryAssembly.part===part);close(b.size[0],1.2);assert.equal(b.rotationDegrees,part==='right'?90:-90);const face=X.elementFaces(b)[0];close(face.normal[0],part==='right'?1:-1,.000001);}
assert.equal(roof.status,'proposed');assert.equal(roof.quantityStatus,'partial-unreviewed');assert.equal(roof.thickness,null);assert.equal(roof.soffitStatus,'unresolved');assert.deepEqual(Roof.issues(roof,{confirm:false}),[]);
close(roof.profiles.x[0][0],3.6);close(roof.profiles.x.at(-1)[0],8.6);close(roof.profiles.y[0][0],-1.4);close(roof.profiles.y.at(-1)[0],0);
close(roof.profiles.x[0][1],3.1);close(Math.max(...roof.profiles.x.map(p=>p[1])),3.6);close(roof.profiles.y.at(-1)[1],3.6);
assert.ok(roof.profiles.x[0][0]<columns[0].origin[0]&&roof.profiles.y[0][0]<columns[0].origin[1],'roof overhangs are independent of post footprint');
const faces=Roof.faces(roof,[0,0],{includeProposed:true});assert.ok(faces.length>=3);assert.ok(faces.every(f=>f.type==='roof'&&f.elementId===roof.id),'entrance roof is sloped roof geometry, never a concrete box');
assert.ok(faces.every(f=>f.poly.length>=3&&f.poly.every(p=>p.every(Number.isFinite))));assert.equal(Roof.faces(roof).length,0);
// Explicit observed fascia is a face only, with its own finish and identity.
const flatFace=structuredClone(roof);flatFace.profiles={x:[[3.6,3.1],[8.6,3.1]],y:[[-1.4,3.1],[0,3.1]]};flatFace.finish={color:'#123456',fasciaColor:'#654321'};
flatFace.observedFascia=[{id:flatFace.id+':observed-fascia',sourceViewId:s.front.id,sourceFrame:structuredClone(s.front.frame),anchors:[[280,390],[530,390],[530,410],[280,410]],scaleX:.02,scaleY:.01,poly:[[3.6,-1.4,2.9],[8.6,-1.4,2.9],[8.6,-1.4,3.1],[3.6,-1.4,3.1]],normal:[0,-1,0],status:'proposed'}];
assert.deepEqual(Roof.issues(flatFace,{confirm:false}),[]);const flatFaces=Roof.faces(flatFace,[0,0],{includeProposed:true});assert.equal(flatFaces.length,2);assert.equal(flatFaces.find(f=>f.type==='fascia').fillColor,'#654321');assert.equal(flatFaces.find(f=>f.type==='roof').fillColor,'#123456');assert.ok(flatFaces.every(f=>f.elementId===roof.id));
const invalidFascia=structuredClone(flatFace);invalidFascia.observedFascia[0].poly[0][1]-=.5;assert.ok(Roof.issues(invalidFascia,{confirm:false}).includes('ROOF_OBSERVED_FASCIA'));assert.equal(Roof.faces(invalidFascia,[0,0],{includeProposed:true}).length,0);
const crossingFascia=structuredClone(flatFace);[crossingFascia.observedFascia[0].poly[1],crossingFascia.observedFascia[0].poly[2]]=[crossingFascia.observedFascia[0].poly[2],crossingFascia.observedFascia[0].poly[1]];assert.ok(Roof.issues(crossingFascia,{confirm:false}).includes('ROOF_OBSERVED_FASCIA'));
for(const l of s.levels){const generated=result.byLevel.find(r=>r.levelId===l.id);Object.assign(l,{exteriorElements:generated.exteriorElements,wallZones:generated.wallZones,reconstructedRoofs:generated.reconstructedRoofs});assert.deepEqual(X.proposalIssues(l,s.inventory),[]);}
assert.deepEqual(build(before),result,'the same source observations keep identities and geometry stable');
assert.equal(X.scene(s.inventory,'house').elements.length,0);assert.equal(X.scene(s.inventory,'house').roofs.length,0,'source estimates remain outside the confirmed model');
const copied=JSON.parse(JSON.stringify(s.inventory)),ground=copied.levels.find(l=>l.id===roof.levelId);ground.roofFinishes={[roof.id]:{color:'#326780'}};ground.exteriorElements.find(e=>e.id===frontBeam.id).color='#223344';
const reopened=X.scene(JSON.parse(JSON.stringify(copied)),'house',{includeProposed:true});assert.equal(reopened.roofs.find(r=>r.id===roof.id).finish.color,'#326780');assert.equal(reopened.elements.find(e=>e.id===frontBeam.id).color,'#223344');
// Single guide, thick strokes, or annotations do not establish beam section.
const guide=build(entryFixture({beam:false,roof:false}));assert.equal(details(guide).filter(e=>e.type==='beam').length,0);assert.equal(roofs(guide).length,0);
const noPosts=build(entryFixture({posts:false}));assert.equal(details(noPosts).filter(e=>['column','beam'].includes(e.type)).length,0);assert.equal(roofs(noPosts).length,0,'a wall capping is not a post-supported entrance');
const noSide=entryFixture();for(const view of noSide.inventory.views.filter(v=>['right','left'].includes(v.direction)))delete noSide.images[view.id];const noSideResult=build(noSide);assert.equal(details(noSideResult).filter(e=>['beam','column'].includes(e.type)).length,0);assert.equal(roofs(noSideResult).length,0);
const oneSide=build(entryFixture({left:false}));assert.equal(details(oneSide).filter(e=>e.type==='beam').length,2,'an unobserved return is never mirrored');assert.equal(roofs(oneSide).length,1);
// An observed side-level conflict cannot be discarded just because the
// opposite side agrees. The shortened foot is visible, not an occlusion.
const sideLevelSource=entryFixture(),sideImage=sideLevelSource.images['synthetic-entry-left'];
for(let y=651;y<=705;y++)for(let x=497;x<=513;x++)sideImage.data.set([255,255,255,255],(y*sideImage.width+x)*4);
const sideLevelBefore=structuredClone(sideLevelSource),sideLevelConflict=build(sideLevelSource);
assert.equal(details(sideLevelConflict).filter(e=>['column','beam'].includes(e.type)).length,0,'no dependent column or beam survives an observed side-level contradiction');assert.equal(roofs(sideLevelConflict).length,0);
assert.ok(sideLevelConflict.issues.includes('COLUMN_LEVEL_CONFLICT'));
const retainedConflict=sideLevelConflict.byLevel.flatMap(l=>l.conflicts||[]).find(c=>c.reason==='COLUMN_LEVEL_CONFLICT');
assert.ok(retainedConflict);assert.equal(retainedConflict.status,'conflict');assert.equal(retainedConflict.sourceViewId,'synthetic-entry-left');assert.equal(retainedConflict.sourceBox[0],500);assert.equal(retainedConflict.sourceBox[2],10);assert.equal(retainedConflict.sourceBox[1]+retainedConflict.sourceBox[3],650,'the conflicting observed foot stays at its source position');
close(retainedConflict.observation.base,.5,.001);assert.ok(retainedConflict.frontObservations.every(o=>o.base===0));assert.deepEqual(sideLevelSource,sideLevelBefore,'conflict inspection leaves source rasters, frames, inventory and proposals unchanged');
// The same truncated pixels under a real source mask are unknown evidence;
// the independent visible side remains usable, without claiming the mask.
const maskedSide=structuredClone(sideLevelSource);maskedSide.proposal.views.find(v=>v.direction==='left').envelope.occlusions=[[490,635,40,90]];
const maskedSideResult=build(maskedSide);assert.equal(details(maskedSideResult).filter(e=>e.type==='column').length,2);assert.equal(roofs(maskedSideResult).length,1);
assert.ok(maskedSideResult.issues.includes('COLUMN_SOURCE_OCCLUDED'));assert.ok(!maskedSideResult.issues.includes('COLUMN_LEVEL_CONFLICT'));
assert.ok(details(maskedSideResult).filter(e=>e.type==='column').every(e=>!e.provenance.sourceViewIds.includes('synthetic-entry-left')),'a masked side is not claimed as column measurement evidence');
const landing=entryFixture(),landingWall=landing.levels.find(l=>l.sourceLevel==='ground').contours[0];landingWall.base.value=-.5;landingWall.height.value=3.5;
const landingColumns=details(build(landing)).filter(e=>e.type==='column');assert.equal(landingColumns.length,2,'an observed landing can be above the parent wall foundation');for(const post of landingColumns)close(post.origin[2],0,.001);
const outsideLevel=entryFixture(),wrongParent=outsideLevel.levels.find(l=>l.sourceLevel==='ground').contours[0];wrongParent.base.value=1;wrongParent.height.value=2;
assert.equal(details(build(outsideLevel)).filter(e=>e.type==='column').length,0,'a post spanning below the parent wall is not assigned to that level');
const conflict=build(entryFixture({sideRoofRise:80}));assert.equal(roofs(conflict).length,0,'incompatible lateral roof height cannot be replaced by the front assumption');assert.ok(conflict.issues.includes('ENTRY_ROOF_GEOMETRY_UNRESOLVED'));
const masked=build(entryFixture({mask:[290,330,70,390]}));assert.equal(roofs(masked).length,0);assert.equal(details(masked).filter(e=>e.type==='beam').length,0,'occluded support prevents full entry assembly');
const footMaskedSource=entryFixture({mask:[295,650,25,80]});
for(let y=676;y<=710;y++)for(let x=295;x<=315;x++)footMaskedSource.images[footMaskedSource.front.id].data.set([255,255,255,255],(y*1000+x)*4);
const footMasked=build(footMaskedSource),visiblePost=details(footMasked).filter(e=>e.type==='column');
assert.equal(visiblePost.length,1,'an occluded post foot never becomes a mirrored complete column');
assert.ok(visiblePost[0].origin[0]>5,'only the fully observed right post survives');
assert.equal(roofs(footMasked).length,1,'a lower annotation does not erase independent complete front and side roof profiles');
assert.equal(roofs(footMasked)[0].entryAssembly.supportStatus,'partial-unresolved');
assert.ok(footMasked.issues.includes('ENTRY_ASSEMBLY_SUPPORT_PARTIAL'));assert.ok(footMasked.issues.includes('COLUMN_SECTION_UNRESOLVED'));
for(const level of footMaskedSource.levels){const generated=footMasked.byLevel.find(r=>r.levelId===level.id);Object.assign(level,{exteriorElements:generated.exteriorElements,wallZones:generated.wallZones,reconstructedRoofs:generated.reconstructedRoofs});assert.deepEqual(X.proposalIssues(level,footMaskedSource.inventory),[]);}
const annotatedFoot=build(entryFixture({mask:[295,650,25,80]}));assert.equal(details(annotatedFoot).filter(e=>e.type==='column').length,1);assert.equal(roofs(annotatedFoot).length,1);assert.ok(annotatedFoot.issues.includes('COLUMN_SOURCE_OCCLUDED'));
// A narrower nearer volume can cover the assembly while leaving both posts
// visible. Post-only occlusion checks are insufficient for the beam/roof.
const hidden=entryFixture(),nearer={id:'house:nearer-entry-volume',buildingId:'house',sourceLevel:null,contours:[],reconstruction:{status:'automatic-proposal'},observedPlanes:[]};
nearer.observedPlanes.push({id:'wall:'+nearer.id+':front',from:[5,-2.5],to:[7,-2.5],height:3.8,base:0,normal:[0,-1,0],status:'proposed',sourceViewId:hidden.front.id,sourceBox:[350,320,100,380],registration:{kind:'multi-view-elevation-registration',status:'proposed',sourceViewIds:[hidden.front.id,'synthetic-entry-right']},measurements:{width:{value:2,kind:'estimated-calibrated',status:'proposed',sourceViewId:hidden.front.id,anchors:[[350,700],[450,700]],scaleUsed:.02},height:{value:3.8,kind:'estimated-calibrated',status:'proposed',sourceViewId:hidden.front.id,anchors:[[350,320],[350,700]],scaleUsed:.01}}});
hidden.levels.push(nearer);hidden.inventory.levels.push(nearer);const hiddenResult=build(hidden);
assert.equal(details(hiddenResult).filter(e=>e.type==='column').length,2);assert.equal(details(hiddenResult).filter(e=>e.type==='beam').length,0);assert.equal(roofs(hiddenResult).length,0);
assert.ok(hiddenResult.issues.includes('ENTRY_BEAM_HIDDEN_BY_NEARER_VOLUME'));assert.ok(hiddenResult.issues.includes('ENTRY_ROOF_HIDDEN_BY_NEARER_VOLUME'));
const thick=blank();for(let y=397;y<=410;y++)line(thick,300,y,510,y);assert.equal(V.entryBands(thick,{left:300,right:510,nearY:411,height:280}).length,0,'ink thickness is not a closed section');
console.log('PASS entrance assemblies: independent front/side roof slopes and eaves, observed beam faces and returns, column contact, null hidden sections, provenance, stable IDs, proposed-only quantities, serialization, guide/occlusion/height conflict refusals.');
