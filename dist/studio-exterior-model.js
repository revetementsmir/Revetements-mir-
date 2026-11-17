/* Physical corners and explicitly placed exterior elements. No inferred dimensions. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,()=>node?require('./plan-import-core.js'):root.MIRPDFAnalysis);if(node)module.exports=api;else root.MIRStudioExterior=api;})(typeof window==='object'?window:globalThis,function(M,analysis){
 'use strict';const number=x=>typeof x==='number'&&Number.isFinite(x),copy=M.clone;
 function corners(level,inventory){const contour=level.contours?.find(c=>c.status==='confirmed'),walls=M.wallsFor(level,inventory);if(!contour)return observedCorners(level,inventory);if(!walls.length)return [];return walls.map((w,i)=>{const before=walls[(i+walls.length-1)%walls.length],id='corner:'+contour.contourId+':'+w.pointIds[0],cross=(w.to[0]-w.from[0])*(before.from[1]-w.from[1])-(w.to[1]-w.from[1])*(before.from[0]-w.from[0]);return {id,levelId:level.id,buildingId:level.buildingId,point:w.from.slice(),base:w.base,height:w.height,wallIds:[before.id,w.id],normals:[before.normal,w.normal],group:Math.abs(before.normal[1]+w.normal[1])<1e-9?'unresolved':before.normal[1]+w.normal[1]<0?'front':'back',turnCross:cross,angle:cross*M.signedArea(walls.map(w=>w.from))>0?'outside':'inside',finish:copy(level.cornerFinishes?.[id]||{}),sourcePointId:w.pointIds[0]};}).filter(c=>Math.abs(c.turnCross)>1e-8);}
 function observedCorners(level,inventory){const walls=M.wallsFor(level,inventory),result=[];for(const after of walls){const before=walls.find(w=>w.id!==after.id&&M.distance(w.to,after.from)<1e-6);if(!before||Math.abs(before.normal[0]*after.normal[1]-before.normal[1]*after.normal[0])<1e-6)continue;const point=after.from.slice(),id='corner:observed:'+level.id+':'+[before.id,after.id].sort().join(':'),base=Math.max(before.base,after.base),height=Math.min(before.base+before.height,after.base+after.height)-base;if(height<=0)continue;const cross=(after.to[0]-point[0])*(before.from[1]-point[1])-(after.to[1]-point[1])*(before.from[0]-point[0]),orientation=Math.sign((after.to[1]-point[1])*after.normal[0]+(point[0]-after.to[0])*after.normal[1]);result.push({id,levelId:level.id,buildingId:level.buildingId,point,base,height,wallIds:[before.id,after.id],normals:[before.normal,after.normal],group:Math.abs(before.normal[1]+after.normal[1])<1e-9?'unresolved':before.normal[1]+after.normal[1]<0?'front':'back',turnCross:cross,angle:cross*orientation>0?'outside':'inside',finish:copy(level.cornerFinishes?.[id]||{}),sourcePointId:null,source:'observed-wall-junction'});}return result;}
 function cornerFaces(corner,walls,center=[0,0]){if(!corner.finish.enabled&&!corner.finish.materialId&&!corner.finish.color)return [];const width=Number(corner.finish.width)>0?corner.finish.width:.08;return corner.wallIds.flatMap((wallId,i)=>{const wall=walls.find(w=>w.id===wallId);if(!wall)return [];const end=i===0?wall.from:wall.to,delta=[end[0]-corner.point[0],end[1]-corner.point[1]],length=Math.hypot(...delta);if(!length)return [];const p=[corner.point[0]-center[0]+corner.normals[i][0]*.008,corner.point[1]-center[1]+corner.normals[i][1]*.008],q=[p[0]+delta[0]/length*Math.min(width,length),p[1]+delta[1]/length*Math.min(width,length)];return [{id:corner.id+':'+i,cornerId:corner.id,parentSurfaceId:wallId,levelId:corner.levelId,type:'corner',role:'level-corner-finish',normal:corner.normals[i].slice(),poly:[[...p,corner.base],[...q,corner.base],[...q,corner.base+corner.height],[...p,corner.base+corner.height]],fillColor:corner.finish.color||'#8d9690'}];});}
 function issues(element){const errors=[];if(!element?.id||!['column','beam','slab','deck','stairs','roof','driveway','foundation'].includes(element.type))errors.push('ELEMENT_TYPE');if(!Array.isArray(element?.origin)||element.origin.length!==3||!element.origin.every(v=>number(v)&&Math.abs(v)<=10000)||!Array.isArray(element.size)||element.size.length!==3||!element.size.every((v,i)=>element.surfaceOnly&&i===1?v===null:number(v)&&v>0&&v<=1000)||!number(element.rotationDegrees))errors.push('ELEMENT_DIMENSIONS');if(!['proposed','confirmed'].includes(element.status)||!['existing','future','proposed'].includes(element.phase))errors.push('ELEMENT_STATUS');if(element.status==='confirmed'&&!['user-measurement','written','estimated-calibrated'].includes(element.provenance?.kind))errors.push('ELEMENT_SOURCE');return errors;}
 // Validate generated details against this building before the atomic save.
 // A displayed finish or a nominal thickness never confirms source geometry.
 function proposalIssues(level,inventory){
  const errors=[],elements=level.exteriorElements||[],zones=level.wallZones||[],entryRoofs=(level.reconstructedRoofs||[]).filter(r=>r.entryAssembly),walls=M.wallsFor(level,inventory,{includeProposed:true}),ids=[...elements,...zones,...(level.reconstructedRoofs||[])].map(e=>e.id);
  if(new Set(ids).size!==ids.length)errors.push('EXTERIOR_DUPLICATE');
  function sourceIssues(detail){
   const view=inventory.views.find(v=>v.id===detail.sourceViewId&&v.buildingId===level.buildingId&&v.kind==='elevation'),box=detail.sourceBox;
   if(!view||JSON.stringify(detail.sourceFrame)!==JSON.stringify(view.frame))errors.push('EXTERIOR_SOURCE');
   if(!Array.isArray(box)||box.length!==4||!box.every(number)||box[0]<0||box[1]<0||box[2]<=0||box[3]<=0||view&&(box[0]+box[2]>(view.payload?.sourceWidth||Infinity)+1||box[1]+box[3]>(view.payload?.sourceHeight||Infinity)+1))errors.push('EXTERIOR_SOURCE_BOUNDS');
   if(detail.status!=='proposed')errors.push('EXTERIOR_PROPOSAL_STATUS');
   if(detail.buildingId&&detail.buildingId!==level.buildingId||detail.levelId&&detail.levelId!==level.id)errors.push('EXTERIOR_OWNERSHIP');
  }
  function observationIssues(observation,{anchorsRequired=false,sourceKind='elevation',anchorLimit=64}={}){
   if(!observation||typeof observation!=='object'||Array.isArray(observation)){errors.push('EXTERIOR_SOURCE','EXTERIOR_SOURCE_BOUNDS','EXTERIOR_SOURCE_SCALE');return null;}
   const view=inventory.views.find(v=>v.id===observation?.sourceViewId&&v.buildingId===level.buildingId&&v.kind===sourceKind);
   if(!view||JSON.stringify(observation?.sourceFrame)!==JSON.stringify(view.frame))errors.push('EXTERIOR_SOURCE');
   const width=view?.payload?.sourceWidth??view?.frame?.rasterSize?.[0],height=view?.payload?.sourceHeight??view?.frame?.rasterSize?.[1],boundsKnown=number(width)&&width>0&&number(height)&&height>0;
   const inBounds=p=>Array.isArray(p)&&p.length===2&&p.every(number)&&boundsKnown&&p[0]>=0&&p[1]>=0&&p[0]<=width&&p[1]<=height;
   const box=observation?.sourceBox,anchors=observation?.anchors;
   if(!boundsKnown||!box&&!anchors)errors.push('EXTERIOR_SOURCE_BOUNDS');
   if(box){
    const format=observation.boxFormat||'xywh',valid=Array.isArray(box)&&box.length===4&&box.every(number),right=valid&&(format==='xyxy'?box[2]:box[0]+box[2]),bottom=valid&&(format==='xyxy'?box[3]:box[1]+box[3]);
    if(!valid||!['xywh','xyxy'].includes(format)||right<=box[0]||bottom<=box[1]||!inBounds([box[0],box[1]])||!inBounds([right,bottom]))errors.push('EXTERIOR_SOURCE_BOUNDS');
   }
   if(anchors!==undefined||anchorsRequired)if(!Array.isArray(anchors)||anchors.length<2||anchors.length>anchorLimit||anchors.some(p=>!inBounds(p)))errors.push('EXTERIOR_SOURCE_BOUNDS');
   const scales=observation?.scalesUsed,explicit=observation&&('scaleX'in observation||'scaleY'in observation),validScale=v=>number(v)&&v>0;
   if(!scales&&!explicit||scales&&(!validScale(scales.x)||!validScale(scales.y))||explicit&&(!validScale(observation.scaleX)||!validScale(observation.scaleY)))errors.push('EXTERIOR_SOURCE_SCALE');
   if(observation?.value!==undefined&&(!number(observation.value)||observation.value<=0))errors.push('EXTERIOR_SOURCE_DIMENSIONS');
   if(observation?.status!==undefined&&observation.status!=='proposed')errors.push('EXTERIOR_PROPOSAL_STATUS');
   return view;
  }
  function contributingIssues(detail){
   const p=detail.provenance;
   // Historical manually placed elements do not acquire mandatory PDF fields.
   if(p?.sourceCategory!=='pdf-source-proposal')return;
   let count=0;
   function inspect(record,primaryId,depth){
    if(depth>3||++count>128){errors.push('EXTERIOR_SOURCE_OBSERVATIONS');return;}
    const observations=[],check=source=>{observations.push(source);observationIssues(source);if(source&&typeof source==='object'&&!Array.isArray(source))inspect(source,source.sourceViewId,depth+1);};
    for(const key of ['depth','topEvidence'])if(record[key]!==undefined)check(record[key]);
    for(const key of ['alternateDepthObservations','alternateObservations','sources'])if(record[key]!==undefined){
     if(!Array.isArray(record[key])||record[key].length>32)errors.push('EXTERIOR_SOURCE_OBSERVATIONS');
     else for(const source of record[key])check(source);
    }
    if(record.sourceViewIds!==undefined){
     if(!Array.isArray(record.sourceViewIds)||record.sourceViewIds.length>32||new Set(record.sourceViewIds).size!==record.sourceViewIds.length)errors.push('EXTERIOR_SOURCE_OBSERVATIONS');
     else for(const id of record.sourceViewIds){
      if(!inventory.views.some(v=>v.id===id&&v.buildingId===level.buildingId&&v.kind==='elevation'))errors.push('EXTERIOR_SOURCE');
      if(id!==primaryId&&!observations.some(o=>o?.sourceViewId===id))errors.push('EXTERIOR_SOURCE_OBSERVATIONS');
     }
    }
   }
   inspect(p,detail.sourceViewId,0);
  }
  function depthConstraintIssues(evidence,view,roof){
   const measured=evidence.boundaryMethod==='written-depth-between-observed-attachment-and-eave',estimated=evidence.boundaryMethod==='source-estimated-collinear-closure';
   if(!measured&&!estimated&&!evidence.depthConstraint&&!evidence.boundaryEvidence)return;
   const fail=()=>errors.push('ENTRY_ROOF_PLAN_DEPTH'),d=evidence.depthConstraint,b=evidence.boundaryEvidence,box=evidence.sourceBox;
   const point=p=>Array.isArray(p)&&p.length===2&&p.every(number),pair=p=>Array.isArray(p)&&p.length===2&&p.every(point),near=(p,q,t=1e-6)=>point(p)&&point(q)&&M.distance(p,q)<=t;
   if(!measured&&!estimated||!b||!view||!Array.isArray(box)||box.length!==4||!box.every(number)||box[2]<=0||box[3]<=0){fail();return;}
   const [x,y,w,h]=box,rows=[...(view.payload?.drawingReadings?.rows||[]),...(view.payload?.drawingReadings?.verticalRows||[])],normal=s=>String(s||'').replace(/\s+/g,'').replace(/[’′]/g,"'").replace(/[″“”]/g,'"');
   const sameSource=r=>r?.sourceViewId===view.id&&JSON.stringify(r.sourceFrame)===JSON.stringify(view.frame),vertical=r=>pair(r.anchors)&&Math.abs(r.anchors[0][0]-r.anchors[1][0])<=2&&r.anchors[1][1]>r.anchors[0][1];
   if(measured){
   if(!d||!pair(d.anchors)||!Array.isArray(d.components)||d.components.length<1||d.components.length>2||!sameSource(d)||d.kind!=='written'||d.status!=='proposed'||d.axis!=='y'||!vertical(d)||!number(d.value)||d.value<=0||d.corrected){fail();return;}
   let total=0;
   for(const [index,c]of d.components.entries()){
    if(!sameSource(c)||c.kind!=='written'||c.status!=='proposed'||c.axis!=='y'||!vertical(c)||!number(c.value)||c.value<=0||c.corrected||!Array.isArray(c.textBox)||c.textBox.length!==4||!c.textBox.every(number)||!normal(c.label)){fail();return;}
    observationIssues({...c,sourceBox:c.textBox,boxFormat:'xyxy',scaleX:evidence.scaleX,scaleY:evidence.scaleY},{anchorsRequired:true,sourceKind:'floor'});
    if(!rows.some(row=>normal(row.text)===normal(c.label)&&row.box?.length===4&&row.box.every((n,i)=>number(n)&&Math.abs(n-c.textBox[i])<=1)))fail();
    const parsed=analysis()?.parseDimension?.(c.label,{ocr:false});
    if(!parsed||Math.abs(parsed.valueFt*.3048-c.value)>1e-8||Math.abs((c.anchors[1][1]-c.anchors[0][1])*evidence.scaleY-c.value)>Math.max(.025,c.value*.05))fail();
    if(number(c.referenceFt)&&Math.abs(c.referenceFt*.3048-c.value)>1e-8)fail();
    if(index&&!near(d.components[index-1].anchors[1],c.anchors[0],2))fail();
    total+=c.value;
   }
   if(!near(d.anchors[0],d.components[0].anchors[0])||!near(d.anchors[1],d.components.at(-1).anchors[1])||Math.abs(total-d.value)>1e-8)fail();
   if(normal(d.label)!==normal(d.components.map(c=>c.label).join(' + ')))fail();
   const estimate=h*evidence.scaleY,residual=estimate-d.value;
   if(!number(d.estimatedValue)||!number(d.residual)||!number(estimate)||Math.abs(d.estimatedValue-estimate)>1e-8||Math.abs(d.residual-residual)>1e-8||Math.abs(residual)>Math.max(.025,d.value*.05))fail();
   if(d.anchors[0][0]<=x||d.anchors[0][0]>=x+w||Math.abs(d.anchors[0][1]-y)>2||Math.abs(d.anchors[1][1]-y-h)>2)fail();
   }else{
    const directions=new Set((roof.entryAssembly?.sideViewIds||[]).map(id=>inventory.views.find(v=>v.id===id&&v.buildingId===level.buildingId)?.direction));
    if(d!==undefined||evidence.kind!=='estimated-calibrated'||!directions.has('left')||!directions.has('right'))fail();
   }
   const outward=Math.cos((evidence.alignment?.rotationDegrees||0)*Math.PI/180)>0?1:-1,rear=outward>0?y:y+h,eave=outward>0?y+h:y;
   const completionKind=measured?'collinear-continuation-constrained-by-written-depth':'collinear-continuation-between-observed-attachment-and-eave';
   if(!pair(b.rear)||!pair(b.eave)||!near(b.rear[0],[x,rear])||!near(b.rear[1],[x+w,rear])||!near(b.eave[0],[x,eave])||!near(b.eave[1],[x+w,eave])||b.completionKind!==completionKind||!Array.isArray(b.observedSides)||b.observedSides.length!==2||!Array.isArray(b.completedSides)||b.completedSides.length!==2){fail();return;}
   for(let i=0;i<2;i++){
    const seen=b.observedSides[i],completed=b.completedSides[i],edge=x+i*w;
    if(!pair(seen)||!pair(completed)||!near(seen[0],[edge,eave])||Math.abs(seen[1][0]-edge)>1e-6||seen[1][1]<y||seen[1][1]>y+h||M.distance(...seen)<Math.max(6,estimated?h*.4:0)||!near(completed[0],seen[1])||!near(completed[1],[edge,rear]))fail();
   }
  }
  function planEvidenceIssues(roof){
   const evidence=roof.planEvidence;
   if(!evidence){if(roof.roofForm==='flat')errors.push('ENTRY_ROOF_PLAN_REQUIRED');return;}
   const view=observationIssues(evidence,{anchorsRequired:true,sourceKind:'floor'});
   depthConstraintIssues(evidence,view,roof);
   if(evidence.status!=='proposed')errors.push('EXTERIOR_PROPOSAL_STATUS');
   const alignment=evidence.alignment,point=p=>Array.isArray(p)&&p.length===2&&p.every(number),validAlignment=point(alignment?.origin)&&point(alignment?.offset)&&number(alignment?.rotationDegrees),anchors=evidence.anchors,footprint=evidence.footprint;
   if(!validAlignment)errors.push('ENTRY_ROOF_PLAN_REGISTRATION');
   const validFootprint=Array.isArray(footprint)&&footprint.length===4&&footprint.every(point)&&!M.validatePolygon(footprint).length;
   if(!validFootprint||!Array.isArray(anchors)||anchors.length!==4)errors.push('ENTRY_ROOF_PLAN_FOOTPRINT');
   else if(validAlignment&&number(evidence.scaleX)&&number(evidence.scaleY)){
    if(anchors.every(point)){const xs=anchors.map(p=>p[0]),ys=anchors.map(p=>p[1]),actual=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];if(!Array.isArray(evidence.sourceBox)||evidence.sourceBox.length!==4||evidence.sourceBox.some((n,i)=>!number(n)||Math.abs(n-actual[i])>1e-6))errors.push('ENTRY_ROOF_PLAN_FOOTPRINT');}
    const angle=alignment.rotationDegrees*Math.PI/180,transform=([x,y])=>{const u=(x-alignment.origin[0])*evidence.scaleX,v=-(y-alignment.origin[1])*evidence.scaleY;return [u*Math.cos(angle)-v*Math.sin(angle)+alignment.offset[0],u*Math.sin(angle)+v*Math.cos(angle)+alignment.offset[1]];};
    if(anchors.some((p,i)=>!point(p)||M.distance(transform(p),footprint[i])>1e-6))errors.push('ENTRY_ROOF_PLAN_FOOTPRINT');
    if(footprint.some((p,i)=>{const q=footprint[(i+1)%4];return Math.abs(p[0]-q[0])>1e-6&&Math.abs(p[1]-q[1])>1e-6;}))errors.push('ENTRY_ROOF_PLAN_FOOTPRINT');
    const x=roof.profiles?.x,y=roof.profiles?.y,tolerance=Math.max(.002,Math.min(.08,Math.max(evidence.scaleX,evidence.scaleY)*3));
    if(!Array.isArray(x)||x.length<2||!x.every(point)||!Array.isArray(y)||y.length<2||!y.every(point))errors.push('ENTRY_ROOF_PLAN_FOOTPRINT');
    else {const actual=[x[0][0],x.at(-1)[0],y[0][0],y.at(-1)[0]],expected=[Math.min(...footprint.map(p=>p[0])),Math.max(...footprint.map(p=>p[0])),Math.min(...footprint.map(p=>p[1])),Math.max(...footprint.map(p=>p[1]))];if(actual.some((n,i)=>Math.abs(n-expected[i])>tolerance))errors.push('ENTRY_ROOF_PLAN_FOOTPRINT');}
    const registered=inventory.levels.filter(l=>l.buildingId===level.buildingId).flatMap(l=>l.contours||[]).filter(c=>c.sourceViewId===evidence.sourceViewId&&M.scale(c)&&c.alignment);
    if(registered.length&&!registered.some(c=>Math.abs(M.scale(c)-evidence.scaleX)<1e-8&&Math.abs(M.scale(c)-evidence.scaleY)<1e-8&&point(c.alignment.origin)&&point(c.alignment.offset)&&M.distance(c.alignment.origin,alignment.origin)<1e-8&&M.distance(c.alignment.offset,alignment.offset)<1e-8&&Math.abs(c.alignment.rotationDegrees-alignment.rotationDegrees)<1e-8))errors.push('ENTRY_ROOF_PLAN_REGISTRATION');
   }
   const labels=[evidence.label,...(Array.isArray(evidence.contextLabels)?evidence.contextLabels:[])],rows=view?.payload?.drawingReadings?.rows||[];
   if(evidence.contextLabels!==undefined&&(!Array.isArray(evidence.contextLabels)||evidence.contextLabels.length>32))errors.push('ENTRY_ROOF_PLAN_LABEL');
   for(const label of labels){
    if(!label||typeof label.text!=='string'||!label.text.trim()||!Array.isArray(label.sourceBox)||label.boxFormat!=='xyxy'){errors.push('ENTRY_ROOF_PLAN_LABEL');continue;}
    observationIssues({...evidence,sourceBox:label.sourceBox,boxFormat:label.boxFormat,anchors:undefined},{sourceKind:'floor'});
    if(!rows.some(row=>row.text===label.text&&row.box?.length===4&&row.box.every((n,i)=>number(n)&&Math.abs(n-label.sourceBox[i])<=1)))errors.push('ENTRY_ROOF_PLAN_LABEL');
   }
   const leader=evidence.leader?.points;
   if(!Array.isArray(leader)||leader.length<2||leader.length>128)errors.push('EXTERIOR_SOURCE_BOUNDS');
   else observationIssues({...evidence,sourceBox:undefined,anchors:leader},{anchorsRequired:true,sourceKind:'floor',anchorLimit:128});
  }
  for(const e of elements){errors.push(...issues(e));sourceIssues(e);contributingIssues(e);if(e.parentWallId&&!walls.some(w=>w.id===e.parentWallId))errors.push('EXTERIOR_WALL');}
  for(const z of zones){sourceIssues(z);contributingIssues(z);const wall=walls.find(w=>w.id===z.wallId);if(!z.id||!wall)errors.push('EXTERIOR_ZONE_WALL');const invalid=M.validatePolygon(z.polygon);if(invalid.length)errors.push('EXTERIOR_ZONE_POLYGON');else if(wall&&z.polygon.some(([x,y])=>x<-.000001||y<-.000001||x>wall.length+.000001||y>wall.height+.000001))errors.push('EXTERIOR_ZONE_BOUNDS');}
  // The new entrance contract identifies actual orthogonal views. Merely
  // labelling a second record "y" does not make a front drawing a side view.
  for(const roof of entryRoofs){
   const assembly=roof.entryAssembly,sideIds=assembly?.sideViewIds,sources=roof.sources;
   if(typeof roof.id!=='string'||!roof.id||assembly.version!==1)errors.push('ENTRY_ROOF_ID');
   if(roof.levelId!==level.id||roof.buildingId!==level.buildingId)errors.push('ENTRY_ROOF_OWNERSHIP');
   if(roof.status!=='proposed')errors.push('EXTERIOR_PROPOSAL_STATUS');
   planEvidenceIssues(roof);
   if(!walls.some(w=>w.id===assembly.parentWallId))errors.push('EXTERIOR_WALL');
   const front=inventory.views.find(v=>v.id===assembly.frontViewId&&v.buildingId===level.buildingId&&v.kind==='elevation'&&v.direction==='front');
   if(roof.observedFascia!==undefined){
    if(!Array.isArray(roof.observedFascia)||roof.observedFascia.length>32)errors.push('ENTRY_ROOF_FASCIA_SOURCE');
    else for(const fascia of roof.observedFascia){const view=observationIssues(fascia,{anchorsRequired:true}),source=Array.isArray(sources)&&sources.find(s=>s?.axis==='x'&&s.sourceViewId===fascia?.sourceViewId);if(fascia?.sourceViewId!==assembly.frontViewId||view?.direction!=='front'||!source||['scaleX','scaleY'].some(axis=>!number(fascia?.[axis])||!number(source[axis])||Math.abs(fascia[axis]-source[axis])>1e-10))errors.push('ENTRY_ROOF_FASCIA_SOURCE');if(fascia?.status!=='proposed')errors.push('EXTERIOR_PROPOSAL_STATUS');}
   }
   const sidesValid=Array.isArray(sideIds)&&sideIds.length>0&&sideIds.length<=32&&new Set(sideIds).size===sideIds.length&&sideIds.every(id=>inventory.views.some(v=>v.id===id&&v.buildingId===level.buildingId&&v.kind==='elevation'&&['left','right'].includes(v.direction)));
   if(!front||!sidesValid)errors.push('ENTRY_ROOF_SOURCE_AXES');
   if(!Array.isArray(sources)||sources.length<2||sources.length>32){errors.push('ENTRY_ROOF_SOURCE_AXES');continue;}
   const recorded=new Set();
   for(const source of sources){
    const view=observationIssues(source,{anchorsRequired:true}),id=source?.sourceViewId;
    if(recorded.has(id))errors.push('ENTRY_ROOF_SOURCE_AXES');recorded.add(id);
    if(!(source?.axis==='x'&&id===assembly.frontViewId&&view?.direction==='front'||source?.axis==='y'&&Array.isArray(sideIds)&&sideIds.includes(id)&&['left','right'].includes(view?.direction)))errors.push('ENTRY_ROOF_SOURCE_AXES');
   }
   if(!recorded.has(assembly.frontViewId)||!Array.isArray(sideIds)||sideIds.some(id=>!recorded.has(id))||sources.filter(s=>s?.axis==='x').length!==1||!sources.some(s=>s?.axis==='y'))errors.push('ENTRY_ROOF_SOURCE_AXES');
  }
  return [...new Set(errors)];
 }
 function scene(inventory,buildingId,{includeProposed=false,includeProposedElements=includeProposed}={}){const scene=M.scene(inventory,buildingId,{includeProposed}),levels=inventory.levels.filter(l=>l.buildingId===buildingId);return {...scene,includeProposed,includeProposedElements,roofs:levels.flatMap(l=>(l.reconstructedRoofs||[]).filter(r=>r.status==='confirmed'||includeProposed&&r.status==='proposed').map(r=>({...copy(r),finish:copy(l.roofFinishes?.[r.id]||r.finish||{})}))),soffits:levels.flatMap(l=>(l.soffits||[]).filter(s=>s.status==='confirmed'&&Number.isFinite(s.height)&&s.polygon?.length===4).map(s=>({...copy(s),levelId:l.id}))),corners:levels.flatMap(l=>corners(l,inventory)),elements:levels.flatMap(l=>(l.exteriorElements||[]).filter(e=>!issues(e).length&&(e.status==='confirmed'||includeProposedElements&&e.status==='proposed')).map(e=>({...copy(e),levelId:l.id,buildingId}))),partial:scene.partial||levels.some(l=>l.reconstruction?.proposal?.complete===false||(l.reconstructedRoofs||[]).some(r=>r.quantityStatus!=='complete'))||levels.some(l=>(l.exteriorElements||[]).some(e=>e.status!=='confirmed'||e.surfaceOnly||issues(e).length))};}
 function elementFaces(e,center=[0,0]){if(issues(e).length)return [];const [x,y,z]=e.origin,[w,d,h]=e.size,a=e.rotationDegrees*Math.PI/180,transform=([u,v,t])=>[x+u*Math.cos(a)-v*Math.sin(a)-center[0],y+u*Math.sin(a)+v*Math.cos(a)-center[1],z+t],color=/^#[0-9a-f]{6}$/i.test(e.color||'')?e.color:e.status==='proposed'?'#b9b4a2':'#a7aaa3';
  const box=(u,v,t,bw,bd,bh,index)=>{const p=[[u,v,t],[u+bw,v,t],[u+bw,v+bd,t],[u,v+bd,t],[u,v,t+bh],[u+bw,v,t+bh],[u+bw,v+bd,t+bh],[u,v+bd,t+bh]].map(transform),quads=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]],normals=[[0,-1,0],[1,0,0],[0,1,0],[-1,0,0],[0,0,1]];if(e.type==='beam'){quads.push([3,2,1,0]);normals.push([0,0,-1]);}return quads.map((q,i)=>({id:e.id+':'+index+':'+i,elementId:e.id,type:e.type==='column'?'column':e.type==='beam'?'beam':'concrete',poly:q.map(j=>p[j]),normal:[normals[i][0]*Math.cos(a)-normals[i][1]*Math.sin(a),normals[i][0]*Math.sin(a)+normals[i][1]*Math.cos(a),normals[i][2]],fillColor:color,role:'exterior-'+e.type,status:e.status,levelId:e.levelId}));};
  if(e.surfaceOnly)return [{id:e.id+':surface',elementId:e.id,levelId:e.levelId,buildingId:e.buildingId,type:e.type==='column'?'column':e.type==='beam'?'beam':'concrete',role:'source-observed-'+e.type,normal:[Math.sin(a),-Math.cos(a),0],poly:[[0,0,0],[w,0,0],[w,0,h],[0,0,h]].map(transform),fillColor:color,status:e.status,quantityStatus:'partial-unknown-depth'}];
  if(e.type==='stairs'){if(!Number.isInteger(e.count)||e.count<1||e.count>30)return [];return Array.from({length:e.count},(_,i)=>box(0,i*d/e.count,0,w,d/e.count,h*(i+1)/e.count,i)).flat();}return box(0,0,0,w,d,h,0);
 }
 function patchGroup(level,items,id,scope,patch,field){const next=copy(level);next[field]||={};const chosen=items.find(x=>x.id===id);if(!chosen)return next;for(const item of items.filter(x=>scope==='all'||scope==='front'&&x.group==='front'||scope==='back'&&x.group==='back'||scope==='single'&&x.id===id))next[field][item.id]={...next[field][item.id],...copy(patch)};return next;}
 return Object.freeze({version:1,corners,cornerFaces,issues,proposalIssues,scene,elementFaces,patchGroup});
});
