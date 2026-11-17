/* Physical corners and explicitly placed exterior elements. No inferred dimensions. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,()=>node?require('./plan-import-core.js'):root.MIRPDFAnalysis,()=>node?require('./plan-reconstruction.js'):root.MIRPlanReconstruction,()=>node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision,()=>node?require('./plan-roof-plan-evidence.js'):root.MIRRoofPlanEvidence);if(node)module.exports=api;else root.MIRStudioExterior=api;})(typeof window==='object'?window:globalThis,function(M,analysis,reconstruction,vision,roofPlanEvidence){
 'use strict';const number=x=>typeof x==='number'&&Number.isFinite(x),copy=M.clone;
 function corners(level,inventory){const contour=level.contours?.find(c=>c.status==='confirmed'),walls=M.wallsFor(level,inventory);if(!contour)return observedCorners(level,inventory);if(!walls.length)return [];return walls.map((w,i)=>{const before=walls[(i+walls.length-1)%walls.length],id='corner:'+contour.contourId+':'+w.pointIds[0],cross=(w.to[0]-w.from[0])*(before.from[1]-w.from[1])-(w.to[1]-w.from[1])*(before.from[0]-w.from[0]);return {id,levelId:level.id,buildingId:level.buildingId,point:w.from.slice(),base:w.base,height:w.height,wallIds:[before.id,w.id],normals:[before.normal,w.normal],group:Math.abs(before.normal[1]+w.normal[1])<1e-9?'unresolved':before.normal[1]+w.normal[1]<0?'front':'back',turnCross:cross,angle:cross*M.signedArea(walls.map(w=>w.from))>0?'outside':'inside',finish:copy(level.cornerFinishes?.[id]||{}),sourcePointId:w.pointIds[0]};}).filter(c=>Math.abs(c.turnCross)>1e-8);}
 function observedCorners(level,inventory){const walls=M.wallsFor(level,inventory),result=[];for(const after of walls){const before=walls.find(w=>w.id!==after.id&&M.distance(w.to,after.from)<1e-6);if(!before||Math.abs(before.normal[0]*after.normal[1]-before.normal[1]*after.normal[0])<1e-6)continue;const point=after.from.slice(),id='corner:observed:'+level.id+':'+[before.id,after.id].sort().join(':'),base=Math.max(before.base,after.base),height=Math.min(before.base+before.height,after.base+after.height)-base;if(height<=0)continue;const cross=(after.to[0]-point[0])*(before.from[1]-point[1])-(after.to[1]-point[1])*(before.from[0]-point[0]),orientation=Math.sign((after.to[1]-point[1])*after.normal[0]+(point[0]-after.to[0])*after.normal[1]);result.push({id,levelId:level.id,buildingId:level.buildingId,point,base,height,wallIds:[before.id,after.id],normals:[before.normal,after.normal],group:Math.abs(before.normal[1]+after.normal[1])<1e-9?'unresolved':before.normal[1]+after.normal[1]<0?'front':'back',turnCross:cross,angle:cross*orientation>0?'outside':'inside',finish:copy(level.cornerFinishes?.[id]||{}),sourcePointId:null,source:'observed-wall-junction'});}return result;}
 function cornerFaces(corner,walls,center=[0,0]){if(!corner.finish.enabled&&!corner.finish.materialId&&!corner.finish.color)return [];const width=Number(corner.finish.width)>0?corner.finish.width:.08;return corner.wallIds.flatMap((wallId,i)=>{const wall=walls.find(w=>w.id===wallId);if(!wall)return [];const end=i===0?wall.from:wall.to,delta=[end[0]-corner.point[0],end[1]-corner.point[1]],length=Math.hypot(...delta);if(!length)return [];const p=[corner.point[0]-center[0]+corner.normals[i][0]*.008,corner.point[1]-center[1]+corner.normals[i][1]*.008],q=[p[0]+delta[0]/length*Math.min(width,length),p[1]+delta[1]/length*Math.min(width,length)];return [{id:corner.id+':'+i,cornerId:corner.id,parentSurfaceId:wallId,levelId:corner.levelId,type:'corner',role:'level-corner-finish',normal:corner.normals[i].slice(),poly:[[...p,corner.base],[...q,corner.base],[...q,corner.base+corner.height],[...p,corner.base+corner.height]],fillColor:corner.finish.color||'#8d9690'}];});}
 function issues(element){const errors=[];if(!element?.id||!['column','beam','slab','deck','stairs','roof','driveway','foundation'].includes(element.type))errors.push('ELEMENT_TYPE');if(!Array.isArray(element?.origin)||element.origin.length!==3||!element.origin.every(v=>number(v)&&Math.abs(v)<=10000)||!Array.isArray(element.size)||element.size.length!==3||!element.size.every((v,i)=>element.surfaceOnly&&i===1?v===null:number(v)&&v>0&&v<=1000)||!number(element.rotationDegrees))errors.push('ELEMENT_DIMENSIONS');if(!['proposed','confirmed'].includes(element.status)||!['existing','future','proposed'].includes(element.phase))errors.push('ELEMENT_STATUS');if(element.status==='confirmed'&&!['user-measurement','written','estimated-calibrated'].includes(element.provenance?.kind))errors.push('ELEMENT_SOURCE');return errors;}
 function entryFaceProfileIssues(source,evidence,view){
  const errors=[],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),point=p=>Array.isArray(p)&&p.length===2&&p.every(number),near=(a,b,t=1e-8)=>number(a)&&number(b)&&Math.abs(a-b)<=t;
   if(evidence?.method!=='face-anchored-source-slopes-and-observed-apex'&&evidence?.faceEvidence===undefined&&evidence?.apexEvidence===undefined)return errors;
   const fail=()=>errors.push('ENTRY_REGISTERED_FACE_PROFILE'),face=evidence.faceEvidence,box=face?.box,apex=evidence.apexEvidence,slopes=evidence.slopes,p=evidence.points;
   const width=view?.payload?.sourceWidth??view?.frame?.rasterSize?.[0],height=view?.payload?.sourceHeight??view?.frame?.rasterSize?.[1],inBounds=q=>point(q)&&q[0]>=0&&q[1]>=0&&q[0]<=width&&q[1]<=height;
   if(evidence?.method!=='face-anchored-source-slopes-and-observed-apex'||!view||view.id!==source?.sourceViewId||!same(source?.sourceFrame,view.frame)||!number(width)||!number(height)||face?.status!=='proposed'||face.method!=='paired-horizontal-boundaries-and-closed-ends'||!Array.isArray(box)||box.length!==4||!box.every(number)||box[2]<30||box[3]<3||box[3]>box[2]*.2||!inBounds(box.slice(0,2))||!inBounds([box[0]+box[2],box[1]+box[3]])||!Array.isArray(slopes)||slopes.length!==2||!Array.isArray(p)||p.length!==4||!p.every(inBounds)){fail();return errors;}
   if(evidence.sourceViewId!==undefined&&evidence.sourceViewId!==view.id||evidence.sourceFrame!==undefined&&!same(evidence.sourceFrame,view.frame)||face.sourceViewId!==undefined&&face.sourceViewId!==view.id||face.sourceFrame!==undefined&&!same(face.sourceFrame,view.frame))fail();
   const [left,top,span,depth]=box,right=left+span,corners=[[left,top],[right,top],[right,top+depth],[left,top+depth]],boundary=face.boundary;
   if(!same(face.anchors,corners)||!Array.isArray(boundary)||boundary.length!==4||boundary.some((b,i)=>!same(b?.anchors,[corners[i],corners[(i+1)%4]])||!number(b.support)||b.support<.9||b.support>1||!Number.isInteger(b.maxGap)||b.maxGap<0||b.maxGap>2)||!number(face.interiorClearFraction)||face.interiorClearFraction<.55||face.interiorClearFraction>1)fail();
   const [a,b]=slopes;
   if(!a||!b||![a.m,a.c,b.m,b.c].every(number)||a.m>=0||b.m<=0){fail();return errors;}
   const ix=(b.c-a.c)/(a.m-b.m),iy=a.m*ix+a.c,tolerance=Math.max(2,span*.012),bounds=apex?.bounds;
   if(apex?.status!=='observed'||!point(apex.point)||!same(p[1],p[2])||!same(apex.point,p[1])||!near(ix,p[1][0])||!near(iy,p[1][1])||ix<=left+span*.12||ix>=right-span*.12||top-iy<Math.max(6,span*.08)||!near(apex.tolerancePixels,tolerance)||!Number.isInteger(apex.compatibleFits)||apex.compatibleFits<1||apex.compatibleFits>512||!Array.isArray(bounds)||bounds.length!==4||!bounds.every(number)||bounds[2]<bounds[0]||bounds[3]<bounds[1]||bounds[2]-bounds[0]>tolerance*2||bounds[3]-bounds[1]>tolerance*2||ix<bounds[0]-1e-8||ix>bounds[2]+1e-8||iy<bounds[1]-1e-8||iy>bounds[3]+1e-8)fail();
   for(const [i,s]of slopes.entries()){
    const ex=i?right:left,ep=p[i?3:0],samples=s.fit?.sourceSamples,inliers=s.fit?.inlierSamples;
    if(!near(s.eaveX,ex)||!near(s.eaveY,ep[1])||!near(ep[0],ex)||!near(ep[1],s.m*ex+s.c)||Math.abs(ep[1]-top)>3||!near(s.highX,ix)||!near(s.highY,iy)||!same(s.visibleEndpoint,apex.point)||!same(s.ridgeEvidence?.point,apex.point)||s.ridgeEvidence?.kind!=='observed-pointed-apex'||s.fit?.method!=='source-stroke-centres-from-closed-face'||!Array.isArray(samples)||samples.length<8||samples.length>width||!samples.every(inBounds)||samples.some((q,j)=>j&&q[0]<=samples[j-1][0])||!Array.isArray(inliers)||inliers.length<8||inliers.length>samples.length||!inliers.every(inBounds)){fail();continue;}
    const sampleSet=new Set(samples.map(q=>JSON.stringify(q)));
    if(inliers.some((q,j)=>!sampleSet.has(JSON.stringify(q))||j&&q[0]<=inliers[j-1][0])||samples.some(q=>q[0]<Math.min(ex,ix)-3||q[0]>Math.max(ex,ix)+3)||!near(s.fit.sampleCount,inliers.length)||s.fit.minimumSupport!==.8||s.fit.residualPixels!==2)fail();
    const n=inliers.length,sx=inliers.reduce((sum,q)=>sum+q[0],0),sy=inliers.reduce((sum,q)=>sum+q[1],0),sxx=inliers.reduce((sum,q)=>sum+q[0]*q[0],0),sxy=inliers.reduce((sum,q)=>sum+q[0]*q[1],0),den=n*sxx-sx*sx,m=(n*sxy-sx*sy)/den,c=(sy-m*sx)/n;
    if(!(den>0)||!near(m,s.m)||!near(c,s.c)||!near(s.fit.meanResidualPixels,inliers.reduce((sum,q)=>sum+Math.abs(q[1]-m*q[0]-c),0)/n))fail();
   }
   return [...new Set(errors)];
  }

 // Validate generated details against this building before the atomic save.
 // A displayed finish or a nominal thickness never confirms source geometry.
 function proposalIssues(level,inventory,{registeredOnly=false,registeredContourOnly=false}={}){
  const errors=[],elements=level.exteriorElements||[],zones=level.wallZones||[],entryRoofs=(level.reconstructedRoofs||[]).filter(r=>r.entryAssembly),walls=M.wallsFor(level,inventory,{includeProposed:true}),ids=[...elements,...zones,...(level.reconstructedRoofs||[])].map(e=>e.id);
  if(!registeredOnly&&new Set(ids).size!==ids.length)errors.push('EXTERIOR_DUPLICATE');
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
    if(record.axisRegistration!==undefined||['column','beam'].includes(detail.type)&&record.levelBand?.relationship==='same-level-datum-pair')registeredProjection(record);
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
  // Registered entrance evidence remains meaningful only in the same metric
  // source frame. Do not turn a matching mutable geometry snapshot into proof.
  let registeredContext;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),point=p=>Array.isArray(p)&&p.length===2&&p.every(number),near=(a,b,t=1e-8)=>number(a)&&number(b)&&Math.abs(a-b)<=t;
  const reference=r=>r&&({sourceViewId:r.sourceViewId,value:r.value,anchors:r.anchors}),alignment=a=>a&&({origin:a.origin,offset:a.offset,rotationDegrees:a.rotationDegrees,kind:a.kind,sourceViewId:a.sourceViewId,referenceSourceViewId:a.referenceSourceViewId}),base=b=>b&&({value:b.value,referenceLevelId:b.referenceLevelId,referenceLevelHint:b.referenceLevelHint,references:b.references});
  const omit=(value,keys)=>value&&Object.fromEntries(Object.entries(value).filter(([k])=>!keys.includes(k))),sourcePoints=points=>points?.map(p=>omit(p,['pdfPoint'])),sourceReference=r=>omit(r,['status','pdfAnchors']);
  const validPdfCoordinates=(c,view)=>c?.points?.every(p=>p.pdfPoint===undefined||same(p.pdfPoint,M.pdfPoint(view,p.xy)))&&(c.reference?.pdfAnchors===undefined||same(c.reference.pdfAnchors,c.reference.anchors?.map(p=>M.pdfPoint(view,p))));
  const sourceContour=c=>c&&({points:sourcePoints(c.points),reference:sourceReference(c.reference),alignment:omit(c.alignment,['status']),base:omit(c.base,['status']),height:omit(c.height,['status'])});
  const sameConfirmation=(a,b)=>a===b||[a,b].every(s=>['proposed','confirmed'].includes(s));
  const contourGeometry=c=>c&&({sourceViewId:c.sourceViewId,points:sourcePoints(c.points),reference:reference(c.reference),height:{value:c.height?.value,sourceViewId:c.height?.sourceViewId,relationship:c.height?.relationship,datumEvidence:c.height?.datumEvidence},alignment:alignment(c.alignment),base:base(c.base)});
  const label=s=>String(s||'').trim().replace(/[.\s]+$/,'').toUpperCase();
  const registeredRows=new Map();
  function gridReadings(view){
   if(registeredRows.has(view.id))return registeredRows.get(view.id);
   const width=view.payload?.sourceWidth||view.frame?.rasterSize?.[0],height=view.payload?.sourceHeight||view.frame?.rasterSize?.[1],file=inventory.files?.find(f=>f.id===view.fileId);
   const retryValid=row=>{
    const r=row?.retry,c=r?.gridCircle,b=row?.box,region=r?.region,token=label(row?.text),kind=/^\d{1,2}$/.test(token)&&Number(token)>0?'number':/^[A-Z]$/.test(token)?'letter':null;
    if(!roofPlanEvidence()?.localGridReading?.(row,view,inventory))return false;
    if(row?.source!=='ocr-local-grid-bubble'||row.labelStatus!=='proposed'||row.sourceViewId&&row.sourceViewId!==view.id||!(row.confidence>=55)||r?.purpose!=='source-raster-grid-bubble'||r.labelConflict||!view.fileId||!file||r.sourceViewId!==view.id||r.sourceFileId!==view.fileId||r.sourcePage!==view.page||!same(r.sourceFrame,view.frame)||!kind||c?.kind!==kind||!point(c.center)||!(c.radius>3&&c.ringSupport>=.9)||!Array.isArray(b)||b.length!==4||!b.every(number)||!Array.isArray(region)||region.length!==4||!region.every(number)||region[0]<0||region[1]<0||!(region[2]>0&&region[3]>0)||region[0]+region[2]>width||region[1]+region[3]>height||b[0]<region[0]||b[1]<region[1]||b[2]>region[0]+region[2]||b[3]>region[1]+region[3]||!number(r.scale)||r.scale<=0||!number(r.padding)||r.padding<0||![8,10].includes(r.psm)||!Array.isArray(r.attempts)||r.attempts.length>16||!r.attempts.some(a=>a?.usable===true&&a.confidence===row.confidence&&label(a.token)===token)||r.attempts.some(a=>a?.usable===true&&a.confidence>=55&&label(a.token)!==token))return false;
    const expected=[c.center[0]-c.radius*.45,c.center[1]-c.radius*.45,c.center[0]+c.radius*.45,c.center[1]+c.radius*.45];if(b.some((n,i)=>!near(n,expected[i])))return false;
    const native=r.nativeSource;if(native&&(native.method!=='retained-pdf-region'||native.sourceViewId!==view.id||native.sourceFileId!==view.fileId||native.sourcePage!==view.page||!file.sha256||native.sourceSha256!==file.sha256||!same(native.sourceFrame,view.frame)||!same(native.sourceRegion,region)))return false;
    return true;
   };
   const original=(view.payload?.drawingReadings?.rows||[]).filter(r=>r.source!=='ocr-local-grid-bubble'||retryValid(r)),retries=level.reconstruction?.proposal?.localReadingRetries||[];
   const rows=[...original,...(Array.isArray(retries)&&retries.length<=1024?retries.filter(r=>r?.sourceViewId===view.id&&retryValid(r)):[])];registeredRows.set(view.id,rows);return rows;
  }
  function labelledPoint(view,observation,text){
   const b=observation?.textBox,p=observation?.point;
   return view&&observation?.sourceViewId===view.id&&point(p)&&Array.isArray(b)&&b.length===4&&b.every(number)&&near(p[0],(b[0]+b[2])/2)&&near(p[1],(b[1]+b[3])/2)&&gridReadings(view).some(r=>!r.retry?.labelConflict&&(r.confidence??0)>=55&&label(r.text)===label(text)&&same(r.box,b));
  }
  function registeredContour(){
   if(registeredContext!==undefined)return registeredContext;
   const fail=()=>{errors.push('ENTRY_REGISTERED_CONTOUR');return registeredContext=null;},c=level.contours?.length===1&&level.contours[0],proposal=level.reconstruction?.proposal,reg=c?.levelRegistration,xy=reg?.xy,z=c?.base,a=c?.alignment,floor=inventory.views.find(v=>v.id===c?.sourceViewId&&v.kind==='floor'&&v.buildingId===level.buildingId&&v.levelId===level.sourceLevel),ref=inventory.views.find(v=>v.id===xy?.referenceSourceViewId&&v.kind==='floor'&&v.buildingId===level.buildingId);
   if(!c||!floor||!ref||!Array.isArray(c.points)||!c.points.every(p=>p?.id&&point(p.xy))||!point(a?.origin)||!point(a?.offset)||a.rotationDegrees!==0||a.kind!=='source-labelled-grid-registration'||!number(z?.value)||reg?.status!=='proposed'||reg.sourceLevel!==level.sourceLevel||xy?.status!=='proposed'||reg.z?.status!=='proposed'||xy.sourceViewId!==floor.id||a.sourceViewId!==floor.id||a.referenceSourceViewId!==ref.id||!same(alignment(a),alignment(reg.alignment))||!same(alignment(a),alignment(xy.alignment))||!same(base(z),base(reg.base))||!same(base(z),base(reg.z.base))||proposal?.levelId!==level.id||proposal.buildingId!==level.buildingId||!same(contourGeometry(c),contourGeometry(proposal.draft))||M.validateDraft(c,inventory,level).length)return fail();
   const scale=M.scale(c),rs=xy.referenceScaleUsed,checks=xy.checks,refLevel=ref.id===floor.id?level:inventory.levels.find(l=>l.buildingId===level.buildingId&&l.contours?.some(c=>c.sourceViewId===ref.id)),refContour=refLevel?.contours.find(c=>c.sourceViewId===ref.id);
   if(!validPdfCoordinates(c,floor)||!validPdfCoordinates(proposal.draft,floor))return fail();
   if(!(scale>0&&rs>0)||!near(xy.scaleUsed,scale)||!same(reference(xy.reference),reference(c.reference))||!refContour||!near(rs,M.scale(refContour))||!point(xy.referenceOrigin)||!point(xy.matchedReferenceOrigin)||!same(xy.origin,a.origin)||!same(xy.offset,a.offset)||!Array.isArray(checks)||checks.length<5||checks.length>128)return fail();
   const first=axis=>checks.filter(c=>c?.axis===axis).sort((a,b)=>label(a.label).localeCompare(label(b.label),undefined,{numeric:true}))[0],x=first('x'),y=first('y');
   if(!x||!y||!point(x.moving?.point)||!point(y.moving?.point)||!point(x.reference?.point)||!point(y.reference?.point)||xy.axisLabels?.x!==x.label||xy.axisLabels?.y!==y.label||!same(a.origin,[x.moving.point[0],y.moving.point[1]])||!same(xy.matchedReferenceOrigin,[x.reference.point[0],y.reference.point[1]])||!same(xy.referenceOrigin,refContour.alignment?.origin)||!near(a.offset[0],(xy.matchedReferenceOrigin[0]-xy.referenceOrigin[0])*rs)||!near(a.offset[1],-(xy.matchedReferenceOrigin[1]-xy.referenceOrigin[1])*rs))return fail();
   for(const check of checks){const axis=check?.axis==='x'?0:check?.axis==='y'?1:null;
    if(axis===null||!labelledPoint(floor,check.moving,check.label)||!labelledPoint(ref,check.reference,check.label)||!same(check.moving.sourceFrame,floor.frame)||!same(check.reference.sourceFrame,ref.frame))return fail();
    const moving=(check.moving.point[axis]-a.origin[axis])*scale,referenceDistance=(check.reference.point[axis]-xy.matchedReferenceOrigin[axis])*rs,tolerance=Math.max(.02,3*Math.max(scale,rs));
    if(!near(check.movingDistance,moving)||!near(check.referenceDistance,referenceDistance)||!near(check.residual,moving-referenceDistance)||!near(check.tolerance,tolerance)||Math.abs(moving-referenceDistance)>tolerance)return fail();
   }
   const root=z.referenceLevelId===level.id?level:inventory.levels.find(l=>l.id===z.referenceLevelId&&l.buildingId===level.buildingId),rootBase=root?.contours?.[0]?.base;
   if(!root||root.sourceLevel!==z.referenceLevelHint||rootBase?.referenceLevelId!==root.id||!near(rootBase.value,0)||!Array.isArray(z.references)||!z.references.length||z.references.length>128)return fail();
   let hint=root.sourceLevel,value=0;
   for(const edge of z.references){const view=inventory.views.find(v=>v.id===edge?.sourceViewId&&v.buildingId===level.buildingId&&v.kind==='elevation'),from=edge?.datums?.from,to=edge?.datums?.to,r=edge?.reference;
    if(!view||!same(edge.sourceFrame,view.frame)||from?.sourceViewId!==view.id||to?.sourceViewId!==view.id||!same(from.sourceFrame,view.frame)||!same(to.sourceFrame,view.frame)||from.levelHint!==edge.from||to.levelHint!==edge.to||from.datumType!=='floor'||to.datumType!=='floor'||!number(from.y)||!number(to.y)||!Array.isArray(r?.anchors)||r.anchors.length!==2||!r.anchors.every(point)||!(M.distance(...r.anchors)>1)||!(r.value>0)||!near(edge.scaleUsed,r.value/M.distance(...r.anchors))||!near(edge.delta,(from.y-to.y)*edge.scaleUsed))return fail();
    if(level.id!==root.id){if(edge.from===hint){value+=edge.delta;hint=edge.to;}else if(edge.to===hint){value-=edge.delta;hint=edge.from;}else return fail();}
   }
   if(level.id===root.id?!near(z.value,0):hint!==level.sourceLevel||!near(z.value,value))return fail();
   return registeredContext={c,proposal,floor,scale};
  }
  function registeredProjection(source){
   const context=registeredContour(),g=source?.axisRegistration,b=source?.levelBand,raw=g?.pixelRegistration,view=inventory.views.find(v=>v.id===source?.sourceViewId&&v.buildingId===level.buildingId&&v.kind==='elevation');
   if(!context)return null;
   const {c,proposal,floor,scale}=context,axis=view?.direction==='front'?0:['left','right'].includes(view?.direction)?1:null,axisName=axis===0?'x':'y',sign=view?.direction==='left'?-1:1;
   if(!view||axis===null||source.axis!==undefined&&source.axis!==axisName||!g||!b||g.status!=='proposed'||raw?.status!=='proposed'||g.floorSourceViewId!==floor.id||g.elevationSourceViewId!==view.id||g.buildingId!==level.buildingId||g.sourceLevel!==level.sourceLevel||raw.floorSourceViewId!==floor.id||raw.elevationSourceViewId!==view.id||raw.buildingId!==level.buildingId||raw.sourceLevel!==level.sourceLevel||!same(g.sourceFrames,{floor:floor.frame,elevation:view.frame})||!same(raw.sourceFrames,g.sourceFrames)||!same(source.sourceFrame,view.frame)||!same(reference(g.reference),reference(c.reference))||!Array.isArray(g.checks)||g.checks.length<(axis===0?3:2)||g.checks.length>64||!same(raw.checks,g.checks)){errors.push('ENTRY_REGISTERED_SOURCE');return null;}
   const info=Array.isArray(proposal.views)&&proposal.views.find(v=>v.viewId===view.id&&v.direction===view.direction),expected=info&&Array.isArray(info.guides)&&reconstruction()?.levelBand?.(info,c,inventory);
   if(!expected||!same(b,expected)||!same(source.referenceGuide,b.lower)||!near(source.scaleY??source.scalesUsed?.y,b.scaleY)||!same(b.sourceFrame,view.frame)||[b.lower,b.upper].some(d=>d?.sourceViewId!==view.id||!same(d.sourceFrame,view.frame)||d.sourceGuide?.method!=='caption-and-visible-monochrome-datum-stroke'||!(d.sourceGuide.support>=.7))){errors.push('ENTRY_REGISTERED_DATUM');return null;}
   const xs=[],ys=[];
   for(const check of g.checks){if(!labelledPoint(floor,check?.floor,check?.label)||!labelledPoint(view,check?.elevation,check?.label)||!near(check.floorPixelCoordinate,check.floor.point[axis])||!near(check.sourcePixelX,check.elevation.point[0])){errors.push('ENTRY_REGISTERED_AXIS');return null;}xs.push(check.floor.point[axis]);ys.push(check.elevation.point[0]);}
   const mx=xs.reduce((n,x)=>n+x,0)/xs.length,my=ys.reduce((n,y)=>n+y,0)/ys.length,den=xs.reduce((n,x)=>n+(x-mx)**2,0),fit=xs.reduce((n,x,i)=>n+(x-mx)*(ys[i]-my),0)/den,offset=my-fit*mx,planSign=axis===0?1:-1,pixelsPerMetre=fit/(sign*planSign*scale),offsetPixels=offset+fit*c.alignment.origin[axis]-fit*c.alignment.offset[axis]/(planSign*scale);
   if(!(den>1&&pixelsPerMetre>0)||raw.units!=='source-pixels'||g.units!=='metres-to-source-pixels'||raw.transform?.floorAxis!==axisName||g.transform?.modelAxis!==axisName||g.transform.projectionSign!==sign||!near(raw.transform.scale,fit)||!near(raw.transform.offset,offset)||!near(g.transform.pixelsPerMetre,pixelsPerMetre)||!near(g.transform.offsetPixels,offsetPixels)||!near(g.scaleUsed,1/pixelsPerMetre)||!near(source.scaleX??source.scalesUsed?.x,g.scaleUsed)||g.checks.some(check=>!near(check.predictedPixelX,fit*check.floorPixelCoordinate+offset)||!near(check.residual,check.predictedPixelX-check.sourcePixelX)||Math.abs(check.residual)>3)){errors.push('ENTRY_REGISTERED_AXIS');return null;}
   return {view,c,band:b,model:([x,y])=>[sign*(x-offsetPixels)/pixelsPerMetre,c.base.value+(b.bottomY-y)*b.scaleY]};
  }
  const carriesEntryPlan=roof=>roof.sourceCategory==='pdf-entry-roof-only'||roof.entryPlanEvidence!==undefined||roof.entryAssembly?.footprintSource!==undefined||(roof.sources||[]).some(s=>s.profileEvidence?.method==='face-anchored-source-slopes-and-observed-apex'||s.profileEvidence?.eaveConstraint!==undefined||s.profileEvidence?.sourceSlopeEvidence!==undefined||s.profileEvidence?.wallContactEvidence!==undefined);
  function registeredEntryPlan(roof,projected,wall){
   const e=roof.entryPlanEvidence,required=carriesEntryPlan(roof);
   if(e===undefined){if(required)errors.push('ENTRY_REGISTERED_PLAN_REQUIRED');return;}
   const fail=()=>errors.push('ENTRY_REGISTERED_PLAN_SOURCE'),context=registeredContour();if(!context){fail();return;}
   const {c,floor,scale}=context,r=e?.reference,g=e?.gridRegistration,t=g?.transform,view=inventory.views.find(v=>v.id===e?.sourceViewId&&v.kind==='roof'&&v.buildingId===level.buildingId),sourceSize=view&&[view.payload?.sourceWidth||view.frame?.rasterSize?.[0],view.payload?.sourceHeight||view.frame?.rasterSize?.[1]],inside=p=>point(p)&&sourceSize&&p.every((v,i)=>v>=0&&v<=sourceSize[i]);
   if(roof.sourceCategory!=='pdf-entry-roof-only'||roof.entryAssembly?.footprintSource!=='registered-roof-plan'||!['reference','height','base','alignment'].every(k=>sameConfirmation(r?.[k]?.status,c[k]?.status))){fail();return;}
   if(!required||e?.version!==1||e.status!=='proposed'||e.kind!=='source-entry-plan-with-calculated-wall-attachment'||!view||e.sourceFileId!==view.fileId||e.sourcePage!==view.page||!same(e.sourceFrame,view.frame)||r?.levelId!==level.id||r.contourId!==c.contourId||r.sourceViewId!==floor.id||!same(r.sourceFrame,floor.frame)||!same(sourceContour(r),sourceContour(c))||!validPdfCoordinates(r,floor)||!near(r.scale,scale)||g?.status!=='proposed'||g.scope!=='roof-plan-to-floor-source-pixels'||g.method!=='matched-labelled-raster-grid-bubbles'||g.movingSourceViewId!==view.id||g.referenceSourceViewId!==floor.id||!same(g.movingSourceFrame,view.frame)||!same(g.referenceSourceFrame,floor.frame)||![t?.scaleX,t?.scaleY].every(n=>number(n)&&n>.2&&n<5)||!number(t.offsetX)||!number(t.offsetY)||Math.abs(t.scaleX/t.scaleY-1)>.05||!Array.isArray(g.evidence)||g.evidence.length>48){fail();return;}
   const labels={x:new Set(),y:new Set()},gridTolerance=Math.max(3,Math.min(...(floor.frame?.rasterSize||[0,0]))*.004);
   for(const row of g.evidence){
    if(!['x','y'].includes(row?.axis)){fail();return;}
    for(const [record,v]of [[row.moving,view],[row.reference,floor]])if(!labelledPoint(v,{...record,textBox:record?.sourceBox},row.label)){fail();return;}
    const axis=row.axis==='x'?0:1,unit=axis===0?t.scaleX:t.scaleY,offset=axis===0?t.offsetX:t.offsetY;
    if(Math.abs(row.moving.point[axis]*unit+offset-row.reference.point[axis])>gridTolerance){fail();return;}labels[row.axis].add(row.label);
   }
   if(labels.x.size<3||labels.y.size<2){fail();return;}
   const boundary=e.sourceBoundary,pixel=e.sourcePixelEvidence,V=vision();
   if(!V?.entryRoofPlanBoundaryIssues||V.entryRoofPlanBoundaryIssues(pixel,{sourceSize}).length||!same(boundary?.eave,pixel?.eave?.anchors)||!same(boundary.observedSides,pixel.sides?.map(s=>s.anchors))||!same(boundary.diagonals,pixel.diagonals)||boundary.completionKind!=='calculated-wall-intersection-from-registered-plane-and-observed-side-attachment'||boundary.rearPixelsObserved!==false||!Array.isArray(boundary.rear)||boundary.rear.length!==2||!boundary.rear.every(inside)||!Array.isArray(boundary.completedSides)||boundary.completedSides.length!==2){fail();return;}
   const model=p=>[(p[0]*t.scaleX+t.offsetX-c.alignment.origin[0])*scale+c.alignment.offset[0],-(p[1]*t.scaleY+t.offsetY-c.alignment.origin[1])*scale+c.alignment.offset[1]],plan=p=>[(c.alignment.origin[0]+(p[0]-c.alignment.offset[0])/scale-t.offsetX)/t.scaleX,(c.alignment.origin[1]-(p[1]-c.alignment.offset[1])/scale-t.offsetY)/t.scaleY],corners=[...boundary.eave,boundary.rear[1],boundary.rear[0]],mapped=corners.map(model),footprint=e.footprint,planScale=Math.max(t.scaleX,t.scaleY)*scale,front=projected.find(p=>p.source.axis==='x'),sides=projected.filter(p=>p.source.axis==='y'),a=e.association;
   if(!front||!wall||corners.some(p=>!inside(p))||!Array.isArray(footprint)||footprint.length!==4||footprint.some((p,i)=>!point(p)||M.distance(p,mapped[i])>1e-8)||M.validatePolygon(footprint).length||!same(a?.frontAnchors,front.source.anchors)||a.frontSourceViewId!==front.source.sourceViewId||!same(a.frontSourceFrame,front.source.sourceFrame)||a.parentWallId!==wall.id||!near(a.wallY,wall.from[1])||!footprint.slice(2).every(p=>near(p[1],wall.from[1]))||!near(footprint[0][1],footprint[1][1])||footprint[0][1]>=wall.from[1]){fail();return;}
   const x=roof.profiles?.x,y=roof.profiles?.y,span=[x?.[0]?.[0],x?.at(-1)?.[0]],targetSpan=span.map(v=>plan([v,wall.from[1]])[0]),spanResiduals=boundary.eave.map((p,i)=>p[0]-targetSpan[i]),bounds=[Math.min(...footprint.map(p=>p[0])),Math.max(...footprint.map(p=>p[0])),Math.min(...footprint.map(p=>p[1])),Math.max(...footprint.map(p=>p[1]))],tolerance=3*Math.max(planScale,front.source.scaleX,...sides.map(s=>s.source.scaleX));
   if(!same(a.modelSpan,span)||!Array.isArray(a.spanResiduals)||a.spanResiduals.length!==2||spanResiduals.some((v,i)=>!near(v,a.spanResiduals[i])||Math.abs(v)>3)||!same(pixel.spanResiduals,a.spanResiduals)||[span[0],span[1],y?.[0]?.[0],y?.at(-1)?.[0]].some((n,i)=>!number(n)||Math.abs(n-bounds[i])>tolerance)){fail();return;}
   const rearY=plan([0,wall.from[1]])[1],ridgeReference=pixel.search?.ridgeReference,ridgeX=plan([front.profile[1][0],wall.from[1]])[0];
   if(!near(pixel.search?.wallY,rearY)||pixel.search.outward!==1||!near(pixel.search.ridgeX,ridgeX)||ridgeReference?.axis!=='x'||ridgeReference.sourceViewId!==front.source.sourceViewId||!same(ridgeReference.sourceFrame,front.source.sourceFrame)||!same(ridgeReference.anchor,front.source.anchors[1])){fail();return;}
   for(let i=0;i<2;i++){const seen=boundary.observedSides[i],completed=boundary.completedSides[i];if(!near(boundary.rear[i][0],boundary.eave[i][0])||!near(boundary.rear[i][1],rearY)||!same(completed,[seen[1],boundary.rear[i]])||!same(seen[0],boundary.eave[i])||!near(seen[1][0],boundary.eave[i][0])||!inside(seen[1])||(seen[1][1]-boundary.eave[i][1])*(rearY-boundary.eave[i][1])<0||Math.abs(seen[1][1]-boundary.eave[i][1])>Math.abs(rearY-boundary.eave[i][1])+1e-8){fail();return;}}
   const at=(profile,value)=>{if(value<profile[0][0]-tolerance||value>profile.at(-1)[0]+tolerance)return NaN;for(let i=1;i<profile.length;i++){const p=profile[i-1],q=profile[i];if((value<=q[0]||i===profile.length-1)&&q[0]>p[0])return p[1]+(value-p[0])*(q[1]-p[1])/(q[0]-p[0]);}return NaN;};
   if(!Array.isArray(a.diagonalResiduals)||a.diagonalResiduals.length!==2||!Array.isArray(a.sideAttachments)||a.sideAttachments.length!==sides.length){fail();return;}
   const zTolerance=3*Math.max(planScale,front.source.scaleY,...sides.map(s=>s.source.scaleY));
   for(let i=0;i<2;i++){const anchors=boundary.diagonals[i].anchors,actual=anchors.map(model),proof=a.diagonalResiduals[i],residuals=actual.map(([px,py])=>at(x,px)-at(y,py));if(!same(proof.sourceAnchors,anchors)||!same(proof.modelAnchors,actual)||!Array.isArray(proof.residuals)||proof.residuals.length!==2||residuals.some((v,j)=>!near(v,proof.residuals[j])||Math.abs(v)>zTolerance)){fail();return;}}
   for(const side of sides){const proof=a.sideAttachments.find(s=>s.sourceViewId===side.source.sourceViewId),contact=side.profile.at(-1),eave=side.profile[0];if(!proof||!same(proof.sourceFrame,side.source.sourceFrame)||!same(proof.anchors,side.source.anchors)||!same(proof.worldContact,contact)||!side.source.anchors.some(p=>near(p[0],proof.eaveSourcePixelX)&&Math.abs(side.registration.model(p)[0]-eave[0])<1e-8)||!near(proof.planEaveResidual,eave[0]-footprint[0][1])||Math.abs(proof.planEaveResidual)>tolerance){fail();return;}}
  }
  function registeredWallStack(roof,projected,wall,contact,tol){
   const stack=roof.connection?.wallStack;if(stack===undefined)return false;
   const fail=()=>{errors.push('ENTRY_REGISTERED_WALL_STACK');return false;},context=registeredContour();if(!context)return fail();
   const {c}=context,members=stack?.members,sides=projected.filter(p=>p.source.axis==='y');
   if(stack?.version!==1||stack.method!=='contiguous-registered-wall-bands-at-observed-entry-attachment'||!same(stack.referenceFrame,{floorSourceViewId:c.alignment.referenceSourceViewId,baseLevelId:c.base.referenceLevelId})||stack.plane?.axis!=='y'||!near(stack.plane.value,wall.from[1])||!same(stack.contact,contact)||!Array.isArray(members)||members.length<2||members.length>16||new Set(members.map(m=>m?.wallId)).size!==members.length||!members.some(m=>m.wallId===wall.id&&m.levelId===level.id))return fail();
   const actual=[];
   for(const member of members){
    const owner=inventory.levels.find(l=>l.id===member?.levelId&&l.buildingId===level.buildingId),contour=owner?.contours?.length===1&&owner.contours[0];
    if(!owner||!contour||owner.sourceLevel!==member.sourceLevel||contour.contourId!==member.contourId||contour.alignment?.referenceSourceViewId!==stack.referenceFrame.floorSourceViewId||contour.base?.referenceLevelId!==stack.referenceFrame.baseLevelId||!same(member.registration,contour.levelRegistration)||proposalIssues(owner,inventory,{registeredOnly:true,registeredContourOnly:true}).length)return fail();
    const real=M.wallsFor(owner,inventory,{includeProposed:true}).find(w=>w.id===member.wallId);
    if(!real||!same(member.from,real.from)||!same(member.to,real.to)||!same(member.normal,real.normal)||!near(member.base,real.base)||!near(member.height,real.height)||real.normal[1]>-.999||!near(real.from[1],wall.from[1],1e-6)||!near(real.to[1],wall.from[1],1e-6)||Math.min(real.from[0],real.to[0])>contact.x[0]+1e-8||Math.max(real.from[0],real.to[0])<contact.x[1]-1e-8||real.base>contact.z[1]+tol||real.base+real.height<contact.z[0]-tol)return fail();
    actual.push(real);
   }
   actual.sort((a,b)=>a.base-b.base);
   // A tolerance at the measured contact ends must never fill an internal
   // gap or silently overlap two competing wall bands.
   if(actual.some((w,i)=>i&&!near(actual[i-1].base+actual[i-1].height,w.base,1e-6))||actual[0].base>contact.z[0]+tol||actual.at(-1).base+actual.at(-1).height<contact.z[1]-tol)return fail();
   const attachments=stack.attachmentSources;
   if(!Array.isArray(attachments)||attachments.length!==sides.length||!sides.length||new Set(attachments.map(a=>a?.sourceViewId)).size!==attachments.length)return fail();
   for(const side of sides){
    const proof=attachments.find(a=>a?.sourceViewId===side.source.sourceViewId),last=side.profile.at(-1),anchors=side.source.anchors;
    if(!proof||!same(proof.sourceFrame,side.source.sourceFrame)||!same(proof.anchors,anchors)||!same(proof.worldContact,last)||!number(proof.wallPixel)||!anchors.some(p=>near(p[0],proof.wallPixel)&&near(p[1],Math.min(...anchors.map(q=>q[1]))))||!near(side.registration.model([proof.wallPixel,anchors.at(-1)[1]])[0],wall.from[1])||!near(last[0],wall.from[1])||!near(last[1],contact.z[1],Math.max(.04,side.source.scaleY*3)))return fail();
   }
   return true;
  }
  function registeredRoofIssues(roof){
   if(!Array.isArray(roof.sources)||!roof.sources.some(s=>s?.axisRegistration!==undefined||s?.levelBand!==undefined)){if(carriesEntryPlan(roof))errors.push('ENTRY_REGISTERED_PLAN_SOURCE');return;}
   if(!['pdf-entry-assembly','pdf-entry-roof-only'].includes(roof.sourceCategory))errors.push('ENTRY_REGISTERED_SOURCE');
   const assembly=roof.entryAssembly,sideIds=assembly?.sideViewIds;
   if(roof.levelId!==level.id||roof.buildingId!==level.buildingId||!Array.isArray(sideIds)||new Set(sideIds).size!==sideIds.length||roof.sources.filter(s=>s?.axis==='x'&&s.sourceViewId===assembly.frontViewId).length!==1||roof.sources.filter(s=>s?.axis==='y').length!==sideIds?.length||sideIds.some(id=>roof.sources.filter(s=>s?.axis==='y'&&s.sourceViewId===id).length!==1))errors.push('ENTRY_REGISTERED_SOURCE');
   const projected=[],primary=new Set();
   for(const source of roof.sources){const registration=registeredProjection(source);if(!registration)continue;
    if(!Array.isArray(source.anchors)||source.anchors.length<2||!source.anchors.every(point)){errors.push('ENTRY_REGISTERED_PROFILE');continue;}
    const profile=source.anchors.map(registration.model).sort((a,b)=>a[0]-b[0]),target=roof.profiles?.[source.axis],tolerance=primary.has(source.axis)?Math.max(.05,source.scaleX*3,source.scaleY*3):1e-8;primary.add(source.axis);
    if(!Array.isArray(target)||target.length!==profile.length||target.some((p,i)=>!point(p)||!near(p[0],profile[i][0],tolerance)||!near(p[1],profile[i][1],tolerance)))errors.push('ENTRY_REGISTERED_PROFILE');
    const evidence=source.profileEvidence;
    if(source.axis==='x'){
     const slopes=evidence?.slopes,p=evidence?.points;
     if(evidence?.status!=='proposed'||!Array.isArray(slopes)||slopes.length!==2||slopes.some(s=>!s||typeof s!=='object')||!Array.isArray(p)||p.length<3||!p.every(point))errors.push('ENTRY_REGISTERED_PROFILE');
     else {const [a,b]=slopes,anchors=[[a.eaveX,a.eaveY],[a.highX,p[1][1]],[b.highX,p[2][1]],[b.eaveX,b.eaveY]].filter((q,i,points)=>!i||q[0]-points[i-1][0]>.5);
      if(!same(anchors,source.anchors)||slopes.some(s=>!number(s.m)||!number(s.c)||!near(s.eaveY,s.m*s.eaveX+s.c,2)||!Array.isArray(s.fit?.sourceSamples)||s.fit.sourceSamples.length<3||s.fit.sourceSamples.filter(q=>point(q)&&Math.abs(q[1]-s.m*q[0]-s.c)<=2.5).length<s.fit.sourceSamples.length*.8)||!near(p[1][1],a.m*a.highX+a.c,2)||!near(p[2][1],b.m*b.highX+b.c,2))errors.push('ENTRY_REGISTERED_PROFILE');
     }
     errors.push(...entryFaceProfileIssues(source,evidence,inventory.views.find(v=>v.id===source.sourceViewId&&v.buildingId===level.buildingId&&v.kind==='elevation')));
    }else {
     if(evidence?.status!=='proposed'||!same(evidence.points,source.anchors)||!(evidence.support?.ratio>=.88))errors.push('ENTRY_REGISTERED_PROFILE');
     if(roof.entryAssembly?.footprintSource==='registered-roof-plan'||evidence?.eaveConstraint!==undefined||evidence?.sourceSlopeEvidence!==undefined||evidence?.wallContactEvidence!==undefined){
      const V=vision(),view=inventory.views.find(v=>v.id===source.sourceViewId&&v.buildingId===level.buildingId&&v.kind==='elevation'),size=view&&[view.payload?.sourceWidth||view.frame?.rasterSize?.[0],view.payload?.sourceHeight||view.frame?.rasterSize?.[1]];
      if(!V?.entrySideRoofIssues||!view||!evidence?.eaveConstraint||!evidence?.sourceSlopeEvidence||!evidence?.wallContactEvidence||V.entrySideRoofIssues(evidence,{sourceSize:size}).length)errors.push('ENTRY_REGISTERED_SIDE_PROFILE');
     }
    }
    projected.push({source,profile,registration});
   }
   const front=projected.find(p=>p.source.axis==='x'),wall=walls.find(w=>w.id===roof.entryAssembly?.parentWallId),x=roof.profiles?.x,y=roof.profiles?.y;
   registeredEntryPlan(roof,projected,wall);
   if(!front||!wall||!Array.isArray(x)||!x.length||!x.every(point)||!Array.isArray(y)||!y.length||!y.every(point))return;
   if(roof.sourceCategory==='pdf-entry-assembly'&&!carriesEntryPlan(roof)){
    // The historical registered assembly was established through a real
    // observed column. Removing the new plan proofs cannot manufacture that
    // distinct source path at first admission.
    const supported=elements.some(e=>{
     if(e.type!=='column'||e.parentWallId!==wall.id||e.levelId!==level.id||e.buildingId!==level.buildingId||e.sourceViewId!==front.source.sourceViewId||e.provenance?.sourceCategory!=='pdf-source-proposal'||issues(e).length||e.origin[0]<x[0][0]-front.source.scaleX*2||e.origin[0]+e.size[0]>x.at(-1)[0]+front.source.scaleX*2||e.origin[1]<y[0][0]-front.source.scaleX*2||e.origin[1]>wall.from[1])return false;
     const records=registeredRecords(e.provenance),ids=new Set(records.map(s=>s.sourceViewId));
     return ids.has(front.source.sourceViewId)&&sideIds.every(id=>ids.has(id))&&records.every(s=>registeredProjection(s));
    });
    if(!supported||!['observed-proposed','partial-unresolved'].includes(roof.entryAssembly.supportStatus))errors.push('ENTRY_REGISTERED_SUPPORT_SOURCE');
   }
   const tol=front.source.scaleY*2,crest=Math.max(...x.map(p=>p[1])),residuals=roof.connection?.orthogonalHeightResiduals,contact={x:[x[0][0],x.at(-1)[0]],z:[Math.min(...x.map(p=>p[1])),crest]},stacked=registeredWallStack(roof,projected,wall,contact,tol);
   if(wall.normal[1]>-.999||roof.connection?.kind!=='observed-entry-roof-at-wall'||roof.connection.parentWallId!==wall.id||!near(roof.connection.wallY,wall.from[1])||!near(y.at(-1)[0],wall.from[1])||y[0][0]>=wall.from[1]||x[0][0]<Math.min(wall.from[0],wall.to[0])-front.source.scaleX*2||x.at(-1)[0]>Math.max(wall.from[0],wall.to[0])+front.source.scaleX*2||!stacked&&x.some(p=>p[1]<wall.base-tol||p[1]>wall.base+wall.height+tol)||!Array.isArray(residuals))errors.push('ENTRY_REGISTERED_ATTACHMENT');
   else for(const p of projected.filter(p=>p.source.axis==='y')){const residual=Math.max(Math.abs(p.profile[0][1]-x[0][1]),Math.abs(p.profile.at(-1)[1]-crest)),stored=residuals.find(r=>r.sourceViewId===p.source.sourceViewId);if(!stored||!near(stored.residual,residual)||residual>Math.max(.04,front.source.scaleY*3,p.source.scaleY*3))errors.push('ENTRY_REGISTERED_ATTACHMENT');}
  }
  if(registeredContourOnly){registeredContour();return [...new Set(errors)];}
  if(registeredOnly){
   for(const element of elements){const records=registeredRecords(element.provenance);if(records.length&&(element.levelId!==level.id||element.buildingId!==level.buildingId||!walls.some(w=>w.id===element.parentWallId)))errors.push('ENTRY_REGISTERED_ATTACHMENT');for(const record of records)registeredProjection(record);}
   for(const roof of entryRoofs)registeredRoofIssues(roof);
   return [...new Set(errors)];
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
   registeredRoofIssues(roof);
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
 function registeredRecords(value,depth=0){
  if(!value||typeof value!=='object'||depth>4)return [];
  if(Array.isArray(value))return value.slice(0,128).flatMap(v=>registeredRecords(v,depth+1));
  const records=value.axisRegistration!==undefined||value.levelBand?.relationship==='same-level-datum-pair'?[value]:[];
  for(const key of ['depth','topEvidence','alternateDepthObservations','alternateObservations','sources'])records.push(...registeredRecords(value[key],depth+1));return records;
 }
 function registeredSourceIssues(level,inventory){return proposalIssues(level,inventory,{registeredOnly:true});}
 function historyIssues(nextLevel,previousLevel){
  const errors=[],proof=r=>JSON.stringify({sourceViewId:r.sourceViewId,sourceFrame:r.sourceFrame,sourceBox:r.sourceBox,anchors:r.anchors,axisRegistration:r.axisRegistration,levelBand:r.levelBand,profileEvidence:r.profileEvidence});
  const nextRoofs=Array.isArray(nextLevel?.reconstructedRoofs)?nextLevel.reconstructedRoofs:[],nextElements=Array.isArray(nextLevel?.exteriorElements)?nextLevel.exteriorElements:[];
  const compare=(oldRecords,newRecords)=>{for(const previous of oldRecords){const next=newRecords.filter(r=>r.sourceViewId===previous.sourceViewId&&r.axisRegistration&&r.levelBand);if(!next.length)errors.push('ENTRY_REGISTERED_EVIDENCE_LOST');else if(!next.some(r=>proof(r)===proof(previous)))errors.push('ENTRY_REGISTERED_EVIDENCE_CHANGED');}};
  for(const roof of previousLevel?.reconstructedRoofs||[]){if(!roof.entryAssembly)continue;const next=nextRoofs.find(r=>r.id===roof.id&&r.entryAssembly);if(roof.entryPlanEvidence!==undefined&&(JSON.stringify(roof.entryPlanEvidence)!==JSON.stringify(next?.entryPlanEvidence)||roof.entryAssembly.footprintSource!==next?.entryAssembly?.footprintSource))errors.push('ENTRY_REGISTERED_PLAN_CHANGED');if(roof.connection?.wallStack!==undefined&&JSON.stringify(roof.connection.wallStack)!==JSON.stringify(next?.connection?.wallStack))errors.push('ENTRY_REGISTERED_WALL_STACK_CHANGED');const before=registeredRecords(roof.sources);if(!before.length)continue;compare(before,registeredRecords(next?.sources));}
  for(const element of previousLevel?.exteriorElements||[]){const before=registeredRecords(element.provenance);if(!before.length)continue;const next=nextElements.find(e=>e.id===element.id);compare(before,registeredRecords(next?.provenance));}
  return [...new Set(errors)];
 }
 function scene(inventory,buildingId,{includeProposed=false,includeProposedElements=includeProposed}={}){const scene=M.scene(inventory,buildingId,{includeProposed}),levels=inventory.levels.filter(l=>l.buildingId===buildingId);return {...scene,includeProposed,includeProposedElements,roofs:levels.flatMap(l=>(l.reconstructedRoofs||[]).filter(r=>r.status==='confirmed'||includeProposed&&r.status==='proposed').map(r=>({...copy(r),finish:copy(l.roofFinishes?.[r.id]||r.finish||{})}))),soffits:levels.flatMap(l=>(l.soffits||[]).filter(s=>s.status==='confirmed'&&Number.isFinite(s.height)&&s.polygon?.length===4).map(s=>({...copy(s),levelId:l.id}))),corners:levels.flatMap(l=>corners(l,inventory)),elements:levels.flatMap(l=>(l.exteriorElements||[]).filter(e=>!issues(e).length&&(e.status==='confirmed'||includeProposedElements&&e.status==='proposed')).map(e=>({...copy(e),levelId:l.id,buildingId}))),partial:scene.partial||levels.some(l=>l.reconstruction?.proposal?.complete===false||(l.reconstructedRoofs||[]).some(r=>r.quantityStatus!=='complete'))||levels.some(l=>(l.exteriorElements||[]).some(e=>e.status!=='confirmed'||e.surfaceOnly||issues(e).length))};}
 function elementFaces(e,center=[0,0]){if(issues(e).length)return [];const [x,y,z]=e.origin,[w,d,h]=e.size,a=e.rotationDegrees*Math.PI/180,transform=([u,v,t])=>[x+u*Math.cos(a)-v*Math.sin(a)-center[0],y+u*Math.sin(a)+v*Math.cos(a)-center[1],z+t],color=/^#[0-9a-f]{6}$/i.test(e.color||'')?e.color:e.status==='proposed'?'#b9b4a2':'#a7aaa3';
  const box=(u,v,t,bw,bd,bh,index)=>{const p=[[u,v,t],[u+bw,v,t],[u+bw,v+bd,t],[u,v+bd,t],[u,v,t+bh],[u+bw,v,t+bh],[u+bw,v+bd,t+bh],[u,v+bd,t+bh]].map(transform),quads=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]],normals=[[0,-1,0],[1,0,0],[0,1,0],[-1,0,0],[0,0,1]];if(e.type==='beam'){quads.push([3,2,1,0]);normals.push([0,0,-1]);}return quads.map((q,i)=>({id:e.id+':'+index+':'+i,elementId:e.id,type:e.type==='column'?'column':e.type==='beam'?'beam':'concrete',poly:q.map(j=>p[j]),normal:[normals[i][0]*Math.cos(a)-normals[i][1]*Math.sin(a),normals[i][0]*Math.sin(a)+normals[i][1]*Math.cos(a),normals[i][2]],fillColor:color,role:'exterior-'+e.type,status:e.status,levelId:e.levelId}));};
  if(e.surfaceOnly)return [{id:e.id+':surface',elementId:e.id,levelId:e.levelId,buildingId:e.buildingId,type:e.type==='column'?'column':e.type==='beam'?'beam':'concrete',role:'source-observed-'+e.type,normal:[Math.sin(a),-Math.cos(a),0],poly:[[0,0,0],[w,0,0],[w,0,h],[0,0,h]].map(transform),fillColor:color,status:e.status,quantityStatus:'partial-unknown-depth'}];
  if(e.type==='stairs'){if(!Number.isInteger(e.count)||e.count<1||e.count>30)return [];return Array.from({length:e.count},(_,i)=>box(0,i*d/e.count,0,w,d/e.count,h*(i+1)/e.count,i)).flat();}return box(0,0,0,w,d,h,0);
 }
 function patchGroup(level,items,id,scope,patch,field){const next=copy(level);next[field]||={};const chosen=items.find(x=>x.id===id);if(!chosen)return next;for(const item of items.filter(x=>scope==='all'||scope==='front'&&x.group==='front'||scope==='back'&&x.group==='back'||scope==='single'&&x.id===id))next[field][item.id]={...next[field][item.id],...copy(patch)};return next;}
 return Object.freeze({version:1,corners,cornerFaces,issues,entryFaceProfileIssues,proposalIssues,registeredSourceIssues,historyIssues,scene,elementFaces,patchGroup});
});
