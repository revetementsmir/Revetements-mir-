/* Orchestrates the existing source geometry engine. No catalogue of houses. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-reconstruction.js'):root.MIRPlanReconstruction,node?require('./plan-reconstructed-roofs.js'):root.MIRReconstructedRoofs,node?require('./plan-reconstructed-exterior.js'):root.MIRReconstructedExterior,node?require('./plan-grid-registration.js'):root.MIRGridRegistration);if(node)module.exports=api;else root.MIRReconstructionPipeline=api;})(typeof window==='object'?window:globalThis,function(M,R,Roof,Exterior,Grid){
 'use strict';
 const copy=M.clone,source=r=>r.sourceReference||r;
 function sameSpan(a,b){
  if(a.sourceViewId!==b.sourceViewId||a.anchors?.length!==2||b.anchors?.length!==2)return false;
  return [b.anchors,b.anchors.slice().reverse()].some(p=>M.distance(a.anchors[0],p[0])<=2&&M.distance(a.anchors[1],p[1])<=2);
 }
 function sameCaption(a,b){a=source(a);b=source(b);if(a.sourceViewId!==b.sourceViewId||!a.textBox||!b.textBox)return false;const x=a.textBox,y=b.textBox,area=p=>(p[2]-p[0])*(p[3]-p[1]),overlap=Math.max(0,Math.min(x[2],y[2])-Math.max(x[0],y[0]))*Math.max(0,Math.min(x[3],y[3])-Math.max(x[1],y[1]));return overlap/Math.min(area(x),area(y))>.65;}
 function resolveReference(candidates){
  const confidence=r=>source(r).confidence??r.confidence??0,trusted=r=>['pdf-text','manual-correction'].includes(source(r).source||r.source)||source(r).kind==='user-measurement';
  const numeric=candidates.filter(r=>r.value>0&&r.scale>0),readable=numeric.filter(r=>trusted(r)||confidence(r)>=25),groups=[];
  for(const r of readable){let group=groups.find(g=>g.some(c=>sameCaption(c,r)));if(!group)groups.push(group=[]);group.push(r);}
  // An OCR alternative is resolved only if independent caption groups agree.
  // Two different written captions in conflict remain a conflict.
  const supported=readable.filter(r=>groups.every(g=>g.some(c=>Math.abs(c.scale/r.scale-1)<=.05&&(!sameSpan(c,r)||Math.abs(c.value-r.value)<=.001))));
  if(!supported.length)return {status:groups.length?'conflict':numeric.length?'low_confidence':'not_found',groups:copy(groups),reference:null,unreadable:copy(numeric.filter(r=>!readable.includes(r)))};
  if(Math.max(...supported.map(r=>r.scale))/Math.min(...supported.map(r=>r.scale))>1.05)return {status:'conflict',groups:copy(groups),reference:null};
  // A lone uncertain OCR glyph cannot set the dimensions of the building.
  // Independent captions can corroborate a moderate reading; duplicate OCR
  // of one caption cannot provide that second observation.
  if(!supported.some(r=>trusted(r)||confidence(r)>=(groups.length>1?55:70)))return {status:'low_confidence',groups:copy(groups),reference:null,alternatives:copy(candidates),confirmationRequired:true};
  const reference=copy(supported.slice().sort((a,b)=>Number(!(trusted(a)||confidence(a)>=70))-Number(!(trusted(b)||confidence(b)>=70))||Number(a.kind!=='written')-Number(b.kind!=='written')||confidence(b)-confidence(a))[0]);
  return {status:groups.length>1?'cross-checked-proposal':'single-reference-proposal',reference,groups:copy(groups),alternatives:copy(candidates.filter(r=>!supported.includes(r))),confirmationRequired:true};
 }
 function protectedLevel(level){return !!(level.geometryRevision||level.contourDraft||level.contours?.length||level.observedPlanes?.length||level.reconstructedRoofs?.length||level.wallOpenings?.length||Object.keys(level.wallFinishes||{}).length||level.wallZones?.length||level.exteriorElements?.length||level.soffits?.length||Object.keys(level.cornerFinishes||{}).length);}
 function opening(o,walls){
  let next=copy(o);const sizes=o.writtenSizeCandidates||[];
  if(sizes.length===1){const s=sizes[0],candidate={...next,width:s.width,height:s.height,offset:next.offset+(next.width-s.width)/2,sill:next.sill+(next.height-s.height)/2,kind:'written',writtenSize:copy(s),originalEstimate:copy(o),positionEvidence:{kind:'estimated-calibrated',status:'proposed',sourceViewId:o.sourceViewId,sourceBox:copy(o.sourceBox),scalesUsed:copy(o.scalesUsed)}};if(!M.openingIssues([candidate],walls).length)next=candidate;else next.sizeIssue='WRITTEN_SIZE_OUTSIDE_WALL';}
  return {...next,status:'proposed',confirmationRequired:true};
 }
 function prepare(proposal,inventory,current){
  if(proposal.status!=='proposed')return {proposal};
  const resolution=resolveReference(proposal.referenceCandidates);proposal.referenceResolution=resolution;
  const draft=copy(proposal.draft),oldScale=proposal.referenceCandidates[0]?.scale;
  if(!resolution.reference)return {proposal,resolution,draft};
  draft.reference={...resolution.reference,status:'proposed',controlReferences:[],assessment:resolution};
  if(draft.height.kind==='estimated-calibrated'&&oldScale>0){const factor=draft.reference.scale/oldScale;draft.height.value*=factor;draft.height.scaleUsed*=factor;for(const ref of draft.height.references){ref.value*=factor;ref.relationship=draft.height.relationship==='two-visible-level-datums'?{...ref.relationship,sourceReference:copy(draft.reference)}:copy(draft.reference);}}
  const constrained=R.constrainProposal(draft,proposal);constrained.status='proposed';
  const errors=M.validateDraft(constrained,inventory,current);if(proposal.heightConflict)errors.push('HEIGHT_CONFLICT');
  // Every compatible elevation contributes an independently calibrated datum
  // observation, not just the one selected for this floor's height. Recompute
  // from the constrained contour; pre-constraint candidate scales may be stale.
  const elevationCalibrations=[];
  if(!errors.length&&constrained.height.relationship==='two-visible-level-datums')for(const v of proposal.views){
   const view=inventory.views.find(s=>s.id===v.viewId&&s.kind==='elevation'&&s.buildingId===current.buildingId),band=R.levelBand(v,constrained,inventory);
   if(!view||v.envelope?.status!=='proposed'||!band||!['front','back','left','right'].includes(v.direction))continue;
   const span=R.faceSpan(M.modelPoints(constrained),v.direction,{world:true}),box=v.envelope.box;
   if(!box?.every(Number.isFinite)||!(box[2]>0)||!(span.length>0&&Number.isFinite(span.length)))continue;
   elevationCalibrations.push({kind:'estimated-calibrated',status:'proposed',value:span.length,sourceViewId:view.id,sourceFrame:copy(view.frame||null),anchors:[[box[0],band.bottomY],[box[0]+box[2],band.bottomY]],relationship:{kind:'floor-to-elevation-span',sourceReference:copy(constrained.reference),sourcePlanSpan:copy(R.faceSpan(constrained.points.map(p=>p.xy),v.direction)),contourAdjustment:copy(constrained.dimensionAdjustment||null),datumPair:{lower:copy(band.lower),upper:copy(band.upper)}},confirmationRequired:true});
  }
  return {proposal,resolution,draft,constrained,errors,elevationCalibrations};
 }
 const ordinal=l=>l==='basement'?-1:l==='ground'?0:l==='upper'?1:/^level-\d+$/.test(l)?Number(l.slice(6)):null;
 function build(inventory,buildingId,images){
  const levels=[],reports=[],existing=inventory.levels.filter(l=>l.buildingId===buildingId),hasGroundPlan=inventory.views.some(v=>v.buildingId===buildingId&&v.kind==='floor'&&['ground','level-0'].includes(v.levelId));
  const gridAlignment=Grid?.forBuilding?.(inventory,buildingId,images)||{status:'unresolved',reason:'GRID_MODULE_UNAVAILABLE',byLevel:{}};
  const floorLevels=existing.filter(l=>inventory.views.some(v=>v.buildingId===buildingId&&v.kind==='floor'&&v.levelId===l.sourceLevel)),requiresLevelAlignment=floorLevels.length>1,prepared=new Map();
  for(const l of floorLevels)if(!protectedLevel(l))prepared.set(l.id,prepare(R.propose(inventory,buildingId,images,{levelId:l.id}),inventory,l));
  const validPrepared=[...prepared].filter(([,p])=>p.constrained&&!p.errors.length),registrationInput=validPrepared.map(([levelId,p])=>({levelId,draft:p.constrained,proposal:p.proposal})),elevationCalibrations=validPrepared.flatMap(([,p])=>p.elevationCalibrations||[]);
  // A saved level already establishes the project frame. A fresh subset cannot
  // choose a new coordinate zero over it without an explicit source-backed
  // transformation into that persisted frame. Keep the remaining drafts.
  const registration=requiresLevelAlignment?(floorLevels.some(protectedLevel)?{status:'unresolved',reason:'EXISTING_LEVEL_FRAME_REQUIRED',byLevel:Object.fromEntries([...prepared.keys()].map(id=>[id,{status:'unresolved',reason:'EXISTING_LEVEL_FRAME_REQUIRED',issues:['EXISTING_LEVEL_FRAME_REQUIRED']}]))}:Grid.registerPreparedLevels(inventory,buildingId,registrationInput,images,{elevationCalibrations})):null;
  const topOrdinal=floorLevels.every(l=>ordinal(l.sourceLevel)!==null)?Math.max(...floorLevels.map(l=>ordinal(l.sourceLevel))):null;
  for(const current of floorLevels){
   const grid=gridAlignment.byLevel?.[current.sourceLevel]||null;
   const report={levelId:current.id,status:'unresolved',issues:[],...(grid?{gridAlignment:copy(grid)}:{})};reports.push(report);
   if(protectedLevel(current)){report.status='preserved';report.issues.push('EXISTING_GEOMETRY_PRESERVED');continue;}
   const preparedLevel=prepared.get(current.id);let proposal=preparedLevel.proposal;
   if(proposal.status==='proposed'&&grid)proposal.gridAlignment=copy(grid);
   if(proposal.status!=='proposed'){report.issues.push(proposal.reason);if(proposal.outlineRecovery)report.outlineRecovery=copy(proposal.outlineRecovery);continue;}
   const {resolution,draft,constrained,errors}=preparedLevel;
   if(!resolution.reference){report.issues.push(resolution.status==='conflict'?'REFERENCE_CONFLICT':resolution.status==='low_confidence'?'SCALE_TRANSCRIPTION_UNCERTAIN':'SCALE_UNKNOWN');if(requiresLevelAlignment)report.issues.push('LEVEL_ALIGNMENT_REQUIRED');levels.push({...copy(current),contourDraft:draft,reconstructionDraft:proposal});continue;}
   if(constrained.dimensionAdjustment?.evidence.some(e=>e.reason==='DIMENSION_TRANSCRIPTION_UNCERTAIN'))report.issues.push('DIMENSION_TRANSCRIPTION_UNCERTAIN');
   if(errors.length){report.issues.push(...errors);if(requiresLevelAlignment)report.issues.push('LEVEL_ALIGNMENT_REQUIRED');levels.push({...copy(current),contourDraft:constrained,reconstructionDraft:proposal});continue;}
   // Calibrate and constrain each floor independently before reporting missing
   // inter-level registration. A shared elevation is not an XY datum and must
   // never be used to invent the relative translation or base elevation.
   if(requiresLevelAlignment){
    const registered=registration?.byLevel[current.id];report.levelRegistration=copy(registered||{status:'unresolved',reason:registration?.reason||'LEVEL_ALIGNMENT_REQUIRED'});
    if(registered?.status!=='proposed'){report.issues.push('LEVEL_ALIGNMENT_REQUIRED',...(registered?.issues||[]));if(grid?.status==='proposed')report.issues.push('GRID_XY_ALIGNMENT_PROPOSED');if(grid?.status==='conflict')report.issues.push('GRID_XY_ALIGNMENT_CONFLICT');report.measurements='independent floor sources retained; metric XY and observed floor datums still required';proposal.draft=copy(constrained);levels.push({...copy(current),contourDraft:constrained,reconstructionDraft:proposal});continue;}
    constrained.alignment=copy(registered.alignment);constrained.base=copy(registered.base);constrained.levelRegistration=copy(registered);
    const alignedErrors=M.validateDraft(constrained,inventory,current);if(alignedErrors.length){report.issues.push(...alignedErrors,'LEVEL_ALIGNMENT_REQUIRED');levels.push({...copy(current),contourDraft:constrained,reconstructionDraft:proposal});continue;}
   }
   proposal=R.recoupRegistrations(proposal,inventory,images,constrained);proposal.draft=copy(constrained);
   const next={...copy(current),contours:[constrained],wallOpenings:[],openingsReviewed:false,reconstruction:{version:1,status:'automatic-proposal',proposal,sourceRasterRequiredForRendering:false}};
   next.openingProposals=R.openingsFor(proposal,inventory,images,constrained);
   if(next.openingProposals.some(o=>o.floorCorrespondence?.status==='unresolved'))report.issues.push('OPENING_FLOOR_MATCH_UNRESOLVED');
   let lower=hasGroundPlan||requiresLevelAlignment?{status:'unresolved',reason:'GROUND_PLAN_TAKES_PRECEDENCE'}:R.lowerPlanes(proposal,inventory,constrained,images);
   const roofHost=!requiresLevelAlignment||topOrdinal!==null&&ordinal(current.sourceLevel)===topOrdinal,volumes=requiresLevelAlignment?[]:R.secondaryVolumes(proposal,inventory,images,constrained),roof=roofHost?R.roofProposal(proposal,inventory,constrained,{images}):{status:'not-applicable',reason:'ROOF_BELONGS_TO_TOP_LEVEL'};
   if(lower.status==='proposed')lower.openingProposals=R.observedOpenings(lower,proposal,inventory,images,{matchingOpenings:next.openingProposals});
   for(const volume of volumes){volume.openingProposals=R.observedOpenings(volume,proposal,inventory,images);volume.roofProposal=R.volumeRoof(volume,proposal,inventory,images);}
   lower=R.assignOpeningSurfaces(lower,volumes);next.reconstruction.lowerProposal=lower;next.reconstruction.secondaryProposals=volumes;next.reconstruction.roofProposal=roof;
   if(roof.status==='proposed'&&!Roof.issues(roof,{confirm:false}).length)next.reconstructedRoofs=[roof];else if(roofHost)report.issues.push(roof.reason||'ROOF_UNRESOLVED');
   const additions=[next,...(lower.status==='proposed'?[lower]:[]),...volumes],generated=[];
   for(const l of additions){if(l!==next){if(inventory.levels.some(old=>old.id===l.id)){report.issues.push('EXISTING_GEOMETRY_PRESERVED');continue;}l.reconstruction={version:1,status:'automatic-proposal',sourceRasterRequiredForRendering:false};if(l.roofProposal?.status==='proposed'&&!Roof.issues(l.roofProposal,{confirm:false}).length)l.reconstructedRoofs=[l.roofProposal];}
    const walls=M.wallsFor(l,inventory,{includeProposed:true});l.wallOpenings=(l.openingProposals||[]).map(o=>opening(o,walls)).filter(o=>!M.openingIssues([o],walls).length);levels.push(l);generated.push(l);
   }
   if(Exterior&&!requiresLevelAlignment){
    const exterior=Exterior.build(proposal,inventory,images,constrained,generated);
    for(const detail of exterior.byLevel||[]){const target=generated.find(l=>l.id===detail.levelId);if(!target)throw Error('EXTERIOR_LEVEL_MISMATCH');target.exteriorElements=[...(target.exteriorElements||[]),...copy(detail.exteriorElements||[])];target.wallZones=[...(target.wallZones||[]),...copy(detail.wallZones||[])];
     for(const roof of detail.reconstructedRoofs||detail.roofProposals||[]){if(Roof.issues(roof,{confirm:false}).length||roof.levelId!==target.id||roof.buildingId!==buildingId)throw Error('ENTRY_ROOF_INVALID');target.reconstructedRoofs=[...(target.reconstructedRoofs||[]),copy(roof)];}
     target.reconstruction.exterior={version:exterior.version,issues:copy(detail.issues||[]),conflicts:copy(detail.conflicts||[]),complete:false};report.issues.push(...(detail.issues||[]));}
    report.issues.push(...(exterior.issues||[]));report.issues=[...new Set(report.issues)];
    report.exterior={elements:generated.reduce((n,l)=>n+(l.exteriorElements||[]).length,0),roofs:generated.reduce((n,l)=>n+(l.reconstructedRoofs||[]).filter(r=>r.entryAssembly).length,0),zones:generated.reduce((n,l)=>n+(l.wallZones||[]).length,0),conflicts:(exterior.byLevel||[]).reduce((n,l)=>n+(l.conflicts||[]).length,0),complete:false};
    next.reconstruction.exteriorReport={version:exterior.version,issues:copy(exterior.issues||[]),complete:false};
   }
   if(requiresLevelAlignment)report.issues.push('EXTERIOR_ASSEMBLY_LEVEL_MATCH_REQUIRED');
   if(lower.status!=='proposed'&&!hasGroundPlan&&!requiresLevelAlignment)report.issues.push(lower.reason);
   report.status='partial-proposal';report.confirmationRequired=true;report.measurements='written and calibrated estimates remain proposed';
  }
  if(!reports.length)reports.push({status:'unresolved',issues:[inventory.views.some(v=>v.buildingId===buildingId&&v.kind==='floor')?'FLOOR_LEVEL_REQUIRED':'FLOOR_SOURCE_REQUIRED']});
  return {version:1,buildingId,status:reports.some(r=>r.status==='partial-proposal')?'partial-proposal':reports.every(r=>r.status==='preserved')?'preserved':'unresolved',levels,reports,complete:false};
 }
 return Object.freeze({version:1,sameCaption,resolveReference,protectedLevel,prepare,build});
});
