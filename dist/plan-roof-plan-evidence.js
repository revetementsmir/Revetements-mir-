/* Roof-plan returns are source observations. A plan supplies XY, never Z.
 * Only a supported hip/ridge, two orthogonal elevation profiles and a sourced
 * intersection with the parent can produce a roof component. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-grid-registration.js'):root.MIRGridRegistration,node?require('./plan-reconstructed-roofs.js'):root.MIRReconstructedRoofs,node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision);if(node)module.exports=api;else root.MIRRoofPlanEvidence=api;})(typeof window==='object'?window:globalThis,function(M,Grid,Roof,V){
 'use strict';
 const finite=Number.isFinite,copy=M.clone,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),point=p=>Array.isArray(p)&&p.length===2&&p.every(finite),unique=a=>[...new Set(a)];
 const frames={front:{axis:'x',sign:1,normal:'y',outward:-1},back:{axis:'x',sign:-1,normal:'y',outward:1},right:{axis:'y',sign:1,normal:'x',outward:1},left:{axis:'y',sign:-1,normal:'x',outward:-1}};
 const bounds=points=>[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
 const roofBounds=r=>[r.profiles.x[0][0],r.profiles.y[0][0],r.profiles.x.at(-1)[0],r.profiles.y.at(-1)[0]];
 const corners=b=>[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]];
 const geometry=r=>({profiles:copy(r.profiles??null),extensions:(Array.isArray(r.extensions)?r.extensions:[]).map(e=>({id:e?.id,profiles:copy(e?.profiles??null)}))});
 const sourceSize=v=>[v?.payload?.sourceWidth||v?.frame?.rasterSize?.[0],v?.payload?.sourceHeight||v?.frame?.rasterSize?.[1]];
 // Original imported rows stay immutable in storage. Regional OCR is retained
 // separately with the proposal; accept it only in its exact source frame.
 function localGridReading(row,view,inventory){
  const r=row?.retry,c=r?.gridCircle,b=row?.box,region=r?.region,size=sourceSize(view),label=String(row?.text||'').trim().toUpperCase();
  const inside=p=>point(p)&&size.every((n,i)=>finite(n)&&n>0&&p[i]>=0&&p[i]<=n);
  if(row?.source!=='ocr-local-grid-bubble'||row.labelStatus!=='proposed'||row.sourceViewId!==view.id||r?.sourceViewId!==view.id||r.purpose!=='source-raster-grid-bubble'||!same(r.sourceFrame,view.frame)||r.sourceFileId!==undefined&&r.sourceFileId!==view.fileId||r.sourcePage!==undefined&&r.sourcePage!==view.page||r.labelConflict)return false;
  if(!Array.isArray(b)||b.length!==4||!b.every(finite)||!inside(b.slice(0,2))||!inside(b.slice(2))||b[2]<=b[0]||b[3]<=b[1]||!Array.isArray(region)||region.length!==4||!region.every(finite)||region[2]<=0||region[3]<=0||!inside(region.slice(0,2))||!inside([region[0]+region[2],region[1]+region[3]])||b[0]<region[0]||b[1]<region[1]||b[2]>region[0]+region[2]||b[3]>region[1]+region[3])return false;
  if(!c||!inside(c.center)||!finite(c.radius)||c.radius<=3||!(c.ringSupport>=.9)||!['number','letter'].includes(c.kind)||!(c.kind==='number'?/^\d{1,2}$/.test(label)&&Number(label)>0:/^[A-Z]$/.test(label))||M.distance(c.center,[(b[0]+b[2])/2,(b[1]+b[3])/2])>c.radius*.4)return false;
  if(!Array.isArray(r.attempts)||r.attempts.length<1||r.attempts.length>8||!r.attempts.some(a=>a?.usable&&a.token===label&&a.confidence>=55)||r.attempts.some(a=>a?.usable&&(a.token!==label||!(a.confidence>=55))))return false;
  const native=r.nativeSource;if(native&&(native.method!=='retained-pdf-region'||native.sourceViewId!==view.id||native.sourceFileId!==view.fileId||native.sourcePage!==view.page||!same(native.sourceFrame,view.frame)||!same(native.sourceRegion,region)||!inventory?.files?.some(f=>f.id===view.fileId&&f.sha256&&f.sha256===native.sourceSha256)))return false;
  return true;
 }
 function projection(reference,registration){
  const a=reference.alignment,s=M.scale(reference),t=registration.transform;
  if(!s||!point(a?.origin)||!point(a?.offset)||a.rotationDegrees!==0||!t||![t.scaleX,t.scaleY].every(n=>finite(n)&&n>0)||![t.offsetX,t.offsetY].every(finite))return null;
  return {scaleX:s*t.scaleX,scaleY:s*t.scaleY,
   model:([x,y])=>[(x*t.scaleX+t.offsetX-a.origin[0])*s+a.offset[0],-(y*t.scaleY+t.offsetY-a.origin[1])*s+a.offset[1]],
   source:([x,y])=>[((x-a.offset[0])/s+a.origin[0]-t.offsetX)/t.scaleX,(-(y-a.offset[1])/s+a.origin[1]-t.offsetY)/t.scaleY]};
 }
 function sourceInk(image){
  if(!image?.data||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width*image.height>12000000||image.data.length!==image.width*image.height*4)return null;
  const ink=V.monochrome(image),w=image.width,h=image.height;
  return {w,h,at(x,y,radius=0){x=Math.round(x);y=Math.round(y);for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(x+dx>=0&&y+dy>=0&&x+dx<w&&y+dy<h&&ink[(y+dy)*w+x+dx])return true;return false;}};
 }
 function support(ink,a,b,radius=1){
  const n=Math.ceil(M.distance(a,b));if(n<2)return {support:0,maxGap:n+1};let hits=0,gap=0,maxGap=0;
  for(let i=0;i<=n;i++){const f=i/n;if(ink.at(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,radius)){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}
  return {support:hits/(n+1),maxGap};
 }
 const supported=s=>s.support>=.9&&s.maxGap<=3;
 function hip(ink,at,outer,inner,lo,hi){
  const depth=Math.abs(inner-outer),sign=Math.sign(inner-outer),minimum=Math.max(5,Math.min(depth,hi-lo)*.13),found=[];let inspected=0;
  // The ridge must reach the host boundary. A U-shaped rail or dimension
  // bracket has no two converging source diagonals and fails this test.
  for(let t=Math.ceil(lo+minimum);t<=Math.floor(hi-minimum);t++){
   if(!ink.at(...at(inner,t),1))continue;
   for(let d=Math.ceil(minimum);d<=depth-3;d++){
    if(++inspected>90000)return {status:'unresolved',reason:'ROOF_PLAN_HIP_SEARCH_LIMIT'};
    const node=at(outer+sign*d,t);if(!ink.at(...node))continue;
    const ends=[at(outer,lo),at(outer,hi)];
    if(!ends.every(a=>[.2,.4,.6,.8].every(f=>ink.at(a[0]+(node[0]-a[0])*f,a[1]+(node[1]-a[1])*f,1))))continue;
    const diagonals=ends.map(a=>({anchors:[a,node],...support(ink,a,node)})),ridge={anchors:[node,at(inner,t)],...support(ink,node,at(inner,t))};
    if(!diagonals.every(supported)||!supported(ridge))continue;
    found.push({node,diagonals,ridge,score:diagonals.reduce((n,s)=>n+s.support,0)+ridge.support,d});
   }
  }
  if(!found.length)return {status:'unresolved',reason:'ROOF_PLAN_HIP_STROKES_REQUIRED'};
  found.sort((a,b)=>b.score-a.score||b.d-a.d);const best=found[0];
  if(found.some(c=>c.score>=best.score-.015&&M.distance(c.node,best.node)>4))return {status:'unresolved',reason:'ROOF_PLAN_HIP_AMBIGUOUS'};
  return {status:'observed',...best};
 }
 function returns(image,host){
  const ink=sourceInk(image);if(!ink||!host.every(finite)){const empty=[];empty.issues=['ROOF_PLAN_SOURCE_UNAVAILABLE'];return empty;}
  const specs=[{direction:'left',axis:0,boundary:host[0],sign:-1,lo:host[1],hi:host[3]},{direction:'right',axis:0,boundary:host[2],sign:1,lo:host[1],hi:host[3]},{direction:'back',axis:1,boundary:host[1],sign:-1,lo:host[0],hi:host[2]},{direction:'front',axis:1,boundary:host[3],sign:1,lo:host[0],hi:host[2]}],out=[];
  out.issues=[];
  for(const s of specs){
   const at=(n,t)=>s.axis===0?[n,t]:[t,n],minimum=Math.max(12,Math.min(host[2]-host[0],host[3]-host[1])*.045),limit=Math.min(s.axis===0?ink.w:ink.h,Math.abs(s.hi-s.lo)*.7),inner=Math.round(s.boundary),lo=Math.max(0,Math.ceil(s.lo)),hi=Math.min(s.axis===0?ink.h-1:ink.w-1,Math.floor(s.hi));
   for(let d=5;d<=limit;d++){
    const outer=inner+s.sign*d;if(outer<1||outer>=(s.axis===0?ink.w:ink.h)-1)break;
    let start=null,last=null;
    const finish=()=>{
     if(start===null||last-start<minimum||last-start>(s.hi-s.lo)*.85)return;
     if(out.some(c=>c.direction===s.direction&&Math.abs(c.outer-outer)<=3&&Math.abs(c.lo-start)<=3&&Math.abs(c.hi-last)<=3))return;
     const a=at(outer,start),b=at(outer,last),c=at(inner,last),e=at(inner,start),edges=[[a,b],[a,e],[b,c]].map(anchors=>({anchors,...support(ink,...anchors)}));
     if(!edges.every(supported))return;
     const h=hip(ink,at,outer,inner,start,last);if(h.status!=='observed'){if(h.reason!=='ROOF_PLAN_HIP_STROKES_REQUIRED')out.issues.push(h.reason);return;}
     out.push({direction:s.direction,outer,inner,lo:start,hi:last,anchors:[a,b,c,e],boundary:edges,hip:h,sourcePans:[[a,b,h.node],[a,h.node,h.ridge.anchors[1],e],[b,c,h.ridge.anchors[1],h.node]],joinBoundaryObserved:false});
    };
    for(let t=lo;t<=hi;t++){if(ink.at(...at(outer,t))){if(last!==null&&t-last>2){finish();start=null;}if(start===null)start=t;last=t;}else if(last!==null&&t-last>2){finish();start=last=null;}}
    finish();if(out.length>=24){out.issues.push('ROOF_PLAN_OBSERVATION_LIMIT');return out;}
   }
  }return out;
 }
 function observe(roof,inventory,reviewed,images={}){
  if(!inventory.views.some(v=>v.kind==='roof'&&v.buildingId===roof.buildingId))return {version:1,status:'not-found',observations:[],issues:[]};
  const result={version:1,roofId:roof.id,levelId:roof.levelId,buildingId:roof.buildingId,status:'unresolved',observations:[],issues:[],geometry:geometry(roof)},floor=inventory.views.find(v=>v.id===reviewed.sourceViewId&&v.kind==='floor'&&v.buildingId===roof.buildingId),unit=M.scale(reviewed);
  if(!floor||!unit||!reviewed.points?.length||reviewed.alignment?.rotationDegrees!==0){result.issues.push('ROOF_PLAN_FLOOR_REGISTRATION_REQUIRED');return result;}
  const polygon=M.modelPoints(reviewed);if(M.validatePolygon(polygon).length){result.issues.push('ROOF_PLAN_FLOOR_CONTOUR_REQUIRED');return result;}
  result.reference={contourId:reviewed.contourId,sourceViewId:floor.id,sourceFileId:floor.fileId,sourcePage:floor.page,sourceFrame:copy(floor.frame),reference:copy(reviewed.reference),alignment:copy(reviewed.alignment),points:copy(reviewed.points),base:copy(reviewed.base||null),height:copy(reviewed.height||null),scale:unit};
  const primary=roofBounds(roof),floorBox=bounds(polygon),different=primary.some((n,i)=>Math.abs(n-floorBox[i])>unit*3);
  // A broad parent silhouette can already include a patio. Its extrema are
  // not proof of the main building's eaves; inspect the floor boundary too.
  result.hostEnvelopes={parentProfiles:primary,floorContour:floorBox,ownershipUnresolved:false};
  for(const view of inventory.views.filter(v=>v.kind==='roof'&&v.buildingId===roof.buildingId)){
   const grid=Grid.alignRoofPlan(floor,view,images[floor.id],images[view.id]),project=grid.status==='proposed'&&projection(reviewed,grid);
   if(!project){result.issues.push(grid.reason||'ROOF_PLAN_GRID_REGISTRATION_REQUIRED');continue;}
   const candidates=[];
   for(const [basis,box]of [['parent-roof-profiles',primary],...(different?[['floor-contour',floorBox]]:[])]){
    const found=returns(images[view.id],bounds(corners(box).map(project.source)));result.issues.push(...found.issues);
    for(const source of found){
     const footprint=source.anchors.map(project.model),b=bounds(footprint);
     if(candidates.some(o=>o.direction===source.direction&&bounds(o.footprint).slice(0,2).every((n,i)=>Math.abs(n-b[i])<Math.max(project.scaleX,project.scaleY)*4)&&M.distance(o.hip.node,source.hip.node)<4))continue;
     const id='roof-plan-return:'+view.id+':'+source.direction+':'+source.anchors[0].map(Math.round).join('-'),sourceBox=bounds(source.anchors),insideParent=footprint.every(([x,y])=>x>=primary[0]-unit*3&&x<=primary[2]+unit*3&&y>=primary[1]-unit*3&&y<=primary[3]+unit*3);
     candidates.push({...copy(source),id,kind:'source-roof-plan-return',status:'proposed',sourceViewId:view.id,sourceFileId:view.fileId,sourcePage:view.page,sourceFrame:copy(view.frame),sourceBox:[sourceBox[0],sourceBox[1],sourceBox[2]-sourceBox[0],sourceBox[3]-sourceBox[1]],boxFormat:'xywh',footprint,gridRegistration:copy(grid),hostBasis:basis,parentExtentAmbiguous:insideParent,scaleX:project.scaleX,scaleY:project.scaleY,association:{status:'unresolved',reason:insideParent?'ROOF_PLAN_PARENT_COMPONENT_OVERLAP_UNRESOLVED':'ROOF_RETURN_ELEVATION_PROFILES_REQUIRED'},confirmationRequired:true});
    }
   }result.observations.push(...candidates);if(result.observations.length>48){result.observations=result.observations.slice(0,48);result.issues.push('ROOF_PLAN_OBSERVATION_LIMIT');break;}
  }
  if(result.observations.some(o=>o.parentExtentAmbiguous)){result.hostEnvelopes.ownershipUnresolved=true;result.issues.push('ROOF_PLAN_PARENT_EXTENT_OWNERSHIP_UNRESOLVED');}
  result.issues=unique(result.issues);result.status=result.observations.length?'proposed':result.issues.length?'unresolved':'not-found';return result;
 }
 function elevationRegions(observation,proposal,inventory,reviewed,registerElevation,parentRoof=null){
  if(typeof registerElevation!=='function')return [];
  const f=frames[observation.direction],b=bounds(observation.footprint),result=[];
  for(const info of proposal.views||[]){
   const frame=frames[info.direction],view=inventory.views.find(v=>v.id===info.viewId&&v.kind==='elevation'&&v.buildingId===proposal.buildingId&&v.direction===info.direction),r=frame&&view&&registerElevation(info,reviewed,inventory);
   if(!r||!['u','z','pixelU','pixelZ'].every(k=>typeof r[k]==='function')||![r.sx,r.sz].every(n=>finite(n)&&n>0)||info.direction!==observation.direction&&frame.axis!==f.normal)continue;
   const index=frame.axis==='x'?0:1,range=[b[index],b[index+2]];
   // A side crop must include the observed ridge into the parent, not stop
   // at the plan's open attachment edge. This enlarges a search window only.
   if(info.direction!==observation.direction&&parentRoof){const p=parentRoof.profiles[frame.axis],depth=range[1]-range[0];if(f.outward<0)range[1]=Math.min(p.at(-1)[0],range[1]+depth);else range[0]=Math.max(p[0][0],range[0]-depth);}
   const span=range.map(n=>frame.sign*n),pixels=span.map(r.pixelU).sort((a,b)=>a-b),box=[pixels[0],info.envelope.box[1],pixels[1]-pixels[0],info.envelope.box[3]],size=sourceSize(view);
   if(box[0]<0||box[0]+box[2]>size[0]||box[1]<0||box[1]+box[3]>size[1]||box[2]<8)continue;
   result.push({sourceViewId:view.id,sourceFileId:view.fileId,sourcePage:view.page,sourceFrame:copy(view.frame),direction:info.direction,axis:frame.axis,sign:frame.sign,role:info.direction===observation.direction?'outer-eave-profile':'orthogonal-return-profile',sourceBox:box,boxFormat:'xywh',scaleX:r.sx,scaleY:r.sz,registration:{min:r.min,max:r.max,wallBox:copy(info.envelope.box),supportY:info.supportY??info.envelope.box[1],base:reviewed.base.value,guide:copy(r.guide),levelBand:copy(r.levelBand||null)},envelope:{...copy(info.envelope),box},transform:r});
  }return result;
 }
 const line=(a,b)=>Math.abs(b[0]-a[0])<1e-9?null:{m:(b[1]-a[1])/(b[0]-a[0]),c:a[1]-(b[1]-a[1])/(b[0]-a[0])*a[0]};
 function value(profile,x){for(let i=0;i<profile.length-1;i++){const a=profile[i],b=profile[i+1];if(x>=a[0]-1e-8&&x<=b[0]+1e-8)return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return null;}
 function associate(observation,regions,roof,inventory,reviewed,images){
  const unresolved=reason=>({status:'unresolved',reason}),f=frames[observation.direction],t=f.axis,n=f.normal,ni=n==='x'?0:1,ti=1-ni,b=bounds(observation.footprint),outer=f.outward<0?b[ni]:b[ni+2],primary=regions.find(r=>r.role==='outer-eave-profile');
  if(observation.parentExtentAmbiguous)return unresolved('ROOF_PLAN_PARENT_COMPONENT_OVERLAP_UNRESOLVED');
  if(!primary||!primary.profile?.slopes?.[0]||!primary.profile.slopes[1])return unresolved('ROOF_RETURN_OUTER_PROFILE_REQUIRED');
  const convert=(r,s)=>({source:s,eave:[r.sign*r.transform.u(s.eaveX),r.transform.z(s.eaveY)],high:[r.sign*r.transform.u(s.highX),r.transform.z(s.highY)]}),halves=primary.profile.slopes.slice(0,2).map(s=>convert(primary,s)).sort((a,b)=>a.eave[0]-b.eave[0]),a=line(halves[0].eave,halves[0].high),z=line(halves[1].eave,halves[1].high),pixelTolerance=3,xyTolerance=pixelTolerance*Math.max(observation.scaleX,observation.scaleY,primary.scaleX),zTolerance=primary.scaleY*pixelTolerance;
  if(!a||!z||a.m<=0||z.m>=0)return unresolved('ROOF_RETURN_OUTER_PROFILE_REQUIRED');
  const peak=(z.c-a.c)/(a.m-z.m),crest=a.m*peak+a.c;
  if(!finite(crest)||peak<=halves[0].eave[0]||peak>=halves[1].eave[0]||Math.abs(halves[0].eave[0]-b[ti])>xyTolerance||Math.abs(halves[1].eave[0]-b[ti+2])>xyTolerance||halves.some(h=>Math.abs(h.high[0]-peak)>xyTolerance||Math.abs(h.high[1]-crest)>zTolerance)||Math.abs(halves[0].eave[1]-halves[1].eave[1])>zTolerance)return unresolved('ROOF_RETURN_OUTER_PROFILE_PLAN_CONFLICT');
  const map=projection(reviewed,observation.gridRegistration),hipPoint=map.model(observation.hip.node);if(Math.abs(hipPoint[ti]-peak)>xyTolerance)return unresolved('ROOF_RETURN_PLAN_RIDGE_POSITION_CONFLICT');
  const candidates=[],conflicts=[];
  for(const side of regions.filter(r=>r.role==='orthogonal-return-profile'))for(const s of side.profile?.slopes||[]){
   if(!s)continue;const h=convert(side,s),l=line(h.eave,h.high),tolerance=pixelTolerance*Math.max(side.scaleX,observation.scaleX,observation.scaleY),heightTolerance=pixelTolerance*Math.max(side.scaleY,primary.scaleY);
   if(l&&l.m*f.outward<0&&Math.abs(h.eave[0]-outer)<=tolerance&&Math.abs(h.high[0]-hipPoint[ni])<=tolerance&&(Math.abs(h.eave[1]-halves[0].eave[1])>heightTolerance||Math.abs(h.high[1]-crest)>heightTolerance)){conflicts.push({sourceViewId:side.sourceViewId,sourceFrame:copy(side.sourceFrame),observedEaveHeight:h.eave[1],observedRidgeHeight:h.high[1],outerProfileEaveHeight:halves[0].eave[1],outerProfileRidgeHeight:crest,tolerance:heightTolerance});continue;}
   if(!l||l.m*f.outward>=0||Math.abs(h.eave[0]-outer)>tolerance||Math.abs(h.eave[1]-halves[0].eave[1])>heightTolerance||Math.abs(h.high[1]-crest)>heightTolerance)continue;
   const ridge=(crest-l.c)/l.m;if(Math.abs(ridge-hipPoint[ni])>tolerance||Math.abs(ridge-h.high[0])>tolerance)continue;
   const parentAtPeak=value(roof.profiles[t],peak);if(parentAtPeak===null||parentAtPeak<crest-1e-8)continue;
   const joins=[];for(let i=0;i<roof.profiles[n].length-1;i++){const p=roof.profiles[n][i],q=roof.profiles[n][i+1],slope=(q[1]-p[1])/(q[0]-p[0]);if(slope*f.outward>=0)continue;const u=p[0]+(crest-p[1])/slope;if(u<p[0]-1e-8||u>q[0]+1e-8||(u-ridge)*f.outward>=-tolerance)continue;joins.push(u);}
   if(!joins.length)continue;joins.sort((a,b)=>Math.abs(a-ridge)-Math.abs(b-ridge));const join=joins[0],world=u=>ni===0?[u,peak]:[peak,u],planAnchors=[map.source(world(ridge)),map.source(world(join))],planInk=sourceInk(images[observation.sourceViewId]),planProof=planInk&&support(planInk,...planAnchors),elevationAnchors=[[side.transform.pixelU(side.sign*ridge),side.transform.pixelZ(crest)],[side.transform.pixelU(side.sign*join),side.transform.pixelZ(crest)]],sideInk=sourceInk(images[side.sourceViewId]),sideProof=sideInk&&support(sideInk,...elevationAnchors);
   if(!planProof||!sideProof||!supported(planProof)||!supported(sideProof))continue;
   candidates.push({side,h,ridge,join,planAnchors,planProof,elevationAnchors,sideProof,difference:h.high[1]-crest});
  }
  if(conflicts.length)return {...unresolved('ROOF_RETURN_ORTHOGONAL_PROFILES_CONFLICT'),conflicts};
  if(!candidates.length)return unresolved('ROOF_RETURN_ORTHOGONAL_PROFILE_OR_SOURCED_JOIN_REQUIRED');
  if(candidates.some(c=>Math.abs(c.ridge-candidates[0].ridge)>xyTolerance||Math.abs(c.h.eave[1]-candidates[0].h.eave[1])>zTolerance))return unresolved('ROOF_RETURN_ORTHOGONAL_PROFILES_CONFLICT');
  const c=candidates[0],primaryAnchors=[[halves[0].source.eaveX,halves[0].source.eaveY],[primary.transform.pixelU(primary.sign*peak),primary.transform.pixelZ(crest)],[halves[1].source.eaveX,halves[1].source.eaveY]],sources=[{sourceViewId:primary.sourceViewId,sourceFrame:copy(primary.sourceFrame),axis:t,anchors:primaryAnchors,scaleX:primary.scaleX,scaleY:primary.scaleY},{sourceViewId:c.side.sourceViewId,sourceFrame:copy(c.side.sourceFrame),axis:n,anchors:[[c.h.source.eaveX,c.h.source.eaveY],[c.h.source.highX,c.h.source.highY],c.elevationAnchors[1]],scaleX:c.side.scaleX,scaleY:c.side.scaleY}],profiles={[t]:[halves[0].eave,[peak,crest],halves[1].eave],[n]:[c.h.eave,[c.ridge,crest],[c.join,crest]].sort((a,b)=>a[0]-b[0])};
  const extension={version:1,id:roof.id+':'+observation.id,levelId:roof.levelId,buildingId:roof.buildingId,status:'proposed',kind:'estimated-calibrated',profiles,sources,connection:{kind:'source-roof-plan-return',parentRoofId:roof.id,observationId:observation.id,direction:observation.direction,join:{axis:n,value:c.join,height:crest,method:'observed-ridge-and-intersection-with-parent-profile'},orthogonalHeightDifference:c.difference},complete:false,confirmationRequired:true,quantityStatus:'partial-unreviewed'};
  if(Roof.issues(extension,{confirm:false}).length)return unresolved('ROOF_RETURN_COMPONENT_INVALID');
  return {status:'proposed',componentId:extension.id,profiles:copy(profiles),sources:copy(sources),join:copy(extension.connection.join),planRidge:{anchors:c.planAnchors,...c.planProof},elevationRidge:{sourceViewId:c.side.sourceViewId,sourceFrame:copy(c.side.sourceFrame),anchors:c.elevationAnchors,...c.sideProof},orthogonalHeightDifference:c.difference,extension};
 }
 function propose(roof,proposal,inventory,reviewed,images={},options={}){
  const evidence=observe(roof,inventory,reviewed,images),extensions=[],readProfile=options.roofProfile||V.roofProfile;
  if(evidence.status==='not-found')return {version:1,status:'not-found',extensions:[],evidence:null,issues:[]};
  for(const o of evidence.observations){
   const regions=elevationRegions(o,proposal,inventory,reviewed,options.registerElevation,roof);
   for(const r of regions){const view=inventory.views.find(v=>v.id===r.sourceViewId);r.profile=images[r.sourceViewId]?readProfile(images[r.sourceViewId],r.envelope,view.payload?.drawingReadings?.rows||[]):null;}
   o.elevationRegions=regions.map(({transform,envelope,...r})=>copy(r));
   const association=associate(o,regions,roof,inventory,reviewed,images),extension=association.extension;delete association.extension;
   if(extension){
    const box=roofBounds(extension),existing=[...(roof.extensions||[]),...extensions].find(e=>roofBounds(e).every((n,i)=>Math.abs(n-box[i])<Math.max(o.scaleX,o.scaleY)*3));
    if(existing)o.association={status:'unresolved',reason:'ROOF_RETURN_EXISTING_COMPONENT_ASSOCIATION_REQUIRED'};
    else if((roof.extensions||[]).length+extensions.length>=8)o.association={status:'unresolved',reason:'ROOF_RETURN_COMPONENT_LIMIT'};
    else {extensions.push(extension);o.association=association;}
   }else o.association=association;
  }
  evidence.geometry=geometry({...roof,extensions:[...(roof.extensions||[]),...extensions]});
  evidence.status=extensions.length?'proposed':'unresolved';
  const issues=unique([...evidence.issues,...evidence.observations.filter(o=>o.association.status!=='proposed').map(o=>o.association.reason)]);evidence.issues=issues;
  return {version:1,status:evidence.status,extensions,evidence,issues};
 }
 function geometryIssues(roof,{confirm=false}={}){
  const p=roof?.roofPlanEvidence,errors=[];
  if(p!==undefined){
   if(!p||p.version!==1||p.roofId!==roof.id||p.levelId!==roof.levelId||p.buildingId!==roof.buildingId||!Array.isArray(p.observations)||p.observations.length>48||!Array.isArray(p.issues)||!['proposed','unresolved'].includes(p.status)||!roof.profiles||!['x','y'].every(k=>Array.isArray(roof.profiles[k])&&roof.profiles[k].length>=2&&roof.profiles[k].every(point))||!Array.isArray(roof.extensions||[]))return ['ROOF_PLAN_EVIDENCE'];
   if(!same(p.geometry,geometry(roof)))errors.push('ROOF_PLAN_EVIDENCE_STALE');
   const ids=new Set();for(const o of p.observations){
    if(!o?.id||ids.has(o.id)||o.status!=='proposed'||!frames[o.direction]||!['proposed','unresolved'].includes(o.association?.status)){errors.push('ROOF_PLAN_EVIDENCE');continue;}ids.add(o.id);
    if(o.association.status==='proposed'){const c=(roof.extensions||[]).find(c=>c.id===o.association.componentId);if(!c||o.parentExtentAmbiguous||!same(c.profiles,o.association.profiles)||!same(c.sources,o.association.sources)||!same(c.connection?.join,o.association.join)||c.connection?.observationId!==o.id)errors.push('ROOF_PLAN_ASSOCIATION');}
    else if(!o.association.reason)errors.push('ROOF_PLAN_ASSOCIATION');
   }
   if((p.status==='proposed')!==p.observations.some(o=>o?.association?.status==='proposed'))errors.push('ROOF_PLAN_EVIDENCE');
   if(confirm&&(p.status==='unresolved'||p.observations.some(o=>o?.association?.status!=='proposed')||p.issues.includes('ROOF_PLAN_PARENT_EXTENT_OWNERSHIP_UNRESOLVED')))errors.push('ROOF_PLAN_UNRESOLVED');
  }
  for(const child of Array.isArray(roof?.extensions)?roof.extensions:[])errors.push(...geometryIssues(child,{confirm}));return unique(errors);
 }
 function evidenceIssues(roof,inventory,{confirm=false}={}){
  const p=roof?.roofPlanEvidence;if(p===undefined)return [];
  if(!roof.profiles||!['x','y'].every(k=>Array.isArray(roof.profiles[k])&&roof.profiles[k].length>=2&&roof.profiles[k].every(point))||!Array.isArray(roof.extensions||[]))return ['ROOF_PLAN_EVIDENCE'];
  const errors=geometryIssues(roof,{confirm}),views=inventory?.views||[],viewFor=(id,kind)=>views.find(v=>v.id===id&&v.kind===kind&&v.buildingId===roof.buildingId),inBounds=(q,v)=>{const size=sourceSize(v);return point(q)&&size.every(n=>finite(n)&&n>0)&&q.every((n,i)=>n>=0&&n<=size[i]);};
  const retryLists=[inventory?.localReadingRetries,...(inventory?.levels||[]).filter(l=>l.buildingId===roof.buildingId).map(l=>l.reconstruction?.proposal?.localReadingRetries)],localRows=retryLists.filter(Array.isArray).flat();
  if(!p||p.version!==1||p.roofId!==roof.id||p.levelId!==roof.levelId||p.buildingId!==roof.buildingId||!Array.isArray(p.observations)||p.observations.length>48||!Array.isArray(p.issues)||!['proposed','unresolved'].includes(p.status))return ['ROOF_PLAN_EVIDENCE'];
  if(!same(p.geometry,geometry(roof)))errors.push('ROOF_PLAN_EVIDENCE_STALE');
  const r=p.reference,floor=r&&viewFor(r.sourceViewId,'floor');
  if(!r){if(p.observations.length)errors.push('ROOF_PLAN_REFERENCE');return errors;}
  if(!floor||floor.fileId!==r.sourceFileId||floor.page!==r.sourcePage||!same(floor.frame,r.sourceFrame)||r.reference?.sourceViewId!==floor.id||!M.scale(r)||Math.abs(M.scale(r)-r.scale)>1e-10||!Array.isArray(r.points)||r.points.length<3||r.points.some(q=>!inBounds(q?.xy,floor))||!point(r.alignment?.origin)||!point(r.alignment?.offset)||r.alignment.rotationDegrees!==0)return unique([...errors,'ROOF_PLAN_REFERENCE']);
  const host=p.hostEnvelopes,primary=roofBounds(roof),floorBox=bounds(M.modelPoints(r)),ownershipUnresolved=p.observations.some(o=>o?.parentExtentAmbiguous);
  if(!host||!same(host.parentProfiles,primary)||!same(host.floorContour,floorBox)||host.ownershipUnresolved!==ownershipUnresolved||ownershipUnresolved!==p.issues.includes('ROOF_PLAN_PARENT_EXTENT_OWNERSHIP_UNRESOLVED'))errors.push('ROOF_PLAN_HOST_ENVELOPE');
  const stored=(inventory?.levels||[]).filter(l=>l.buildingId===roof.buildingId).flatMap(l=>l.contours||[]).filter(c=>c.contourId===r.contourId&&c.sourceViewId===r.sourceViewId);
  if(stored.length&&!stored.some(c=>same(c.reference,r.reference)&&same(c.alignment,r.alignment)&&same(c.points,r.points)))errors.push('ROOF_PLAN_REFERENCE_STALE');
  const ids=new Set();
  for(const o of p.observations){
   const view=viewFor(o?.sourceViewId,'roof'),g=o?.gridRegistration,t=g?.transform,map=g&&projection(r,g),b=o?.sourceBox;
   if(!o?.id||ids.has(o.id)||!frames[o.direction]||o.status!=='proposed'||!view||view.fileId!==o.sourceFileId||view.page!==o.sourcePage||!same(view.frame,o.sourceFrame)||!Array.isArray(o.anchors)||o.anchors.length!==4||o.anchors.some(q=>!inBounds(q,view))||!Array.isArray(b)||b.length!==4||!b.every(finite)||b[2]<=0||b[3]<=0||o.boxFormat!=='xywh'){errors.push('ROOF_PLAN_SOURCE');continue;}ids.add(o.id);
   const actual=bounds(o.anchors);if(!same(b,[actual[0],actual[1],actual[2]-actual[0],actual[3]-actual[1]]))errors.push('ROOF_PLAN_SOURCE');
   if(!floor||g?.status!=='proposed'||g.scope!=='roof-plan-to-floor-source-pixels'||g.method!=='matched-labelled-raster-grid-bubbles'||g.movingSourceViewId!==view.id||g.referenceSourceViewId!==floor.id||!same(g.movingSourceFrame,view.frame)||!same(g.referenceSourceFrame,floor.frame)||!map||!Array.isArray(g.evidence)||g.evidence.length>48){errors.push('ROOF_PLAN_GRID');continue;}
   const labels={x:new Set(),y:new Set()},tolerance=Math.max(3,Math.min(...sourceSize(floor))*.004);
   for(const e of g.evidence){
    if(!['x','y'].includes(e.axis)||e.moving?.sourceViewId!==view.id||e.reference?.sourceViewId!==floor.id||!inBounds(e.moving?.point,view)||!inBounds(e.reference?.point,floor)){errors.push('ROOF_PLAN_GRID');continue;}
    for(const [record,source] of [[e.moving,view],[e.reference,floor]]){
     const box=record.sourceBox,rows=[...(source.payload?.drawingReadings?.rows||[]),...localRows.filter(row=>localGridReading(row,source,inventory))];
     if(!Array.isArray(box)||box.length!==4||!box.every(finite)||box[2]<=box[0]||box[3]<=box[1]||!same(record.point,[(box[0]+box[2])/2,(box[1]+box[3])/2])||!rows.some(row=>!row.retry?.labelConflict&&(row.confidence??0)>=55&&same(row.box,box)&&String(row.text||'').trim().replace(/[.\s]+$/,'').toUpperCase()===e.label))errors.push('ROOF_PLAN_GRID');
    }
    labels[e.axis].add(e.label);const axis=e.axis==='x'?0:1,scale=axis===0?t.scaleX:t.scaleY,offset=axis===0?t.offsetX:t.offsetY;
    if(Math.abs(e.moving.point[axis]*scale+offset-e.reference.point[axis])>tolerance)errors.push('ROOF_PLAN_GRID');
   }
   if(labels.x.size<3||labels.y.size<2||Math.abs(t.scaleX/t.scaleY-1)>.05||![t.scaleX,t.scaleY].every(n=>n>.2&&n<5))errors.push('ROOF_PLAN_GRID');
   if(!Array.isArray(o.footprint)||o.footprint.length!==4||o.footprint.some((q,i)=>!point(q)||M.distance(q,map.model(o.anchors[i]))>1e-8)||Math.abs(o.scaleX-map.scaleX)>1e-10||Math.abs(o.scaleY-map.scaleY)>1e-10)errors.push('ROOF_PLAN_FOOTPRINT');
   if(!Array.isArray(o.boundary)||!Array.isArray(o.hip?.diagonals)||!Array.isArray(o.elevationRegions||[])){errors.push('ROOF_PLAN_STROKES');continue;}
   const strokes=[...o.boundary,...o.hip.diagonals,o.hip?.ridge];
   if(strokes.length!==6||strokes.some(s=>!s||!supported(s)||!Array.isArray(s.anchors)||s.anchors.length!==2||s.anchors.some(q=>!inBounds(q,view)))||!inBounds(o.hip?.node,view)||!Array.isArray(o.sourcePans)||o.sourcePans.length!==3||o.sourcePans.some(poly=>!Array.isArray(poly)||poly.length<3||poly.some(q=>!inBounds(q,view)))){errors.push('ROOF_PLAN_STROKES');continue;}
   const [aa,bb,cc,dd]=o.anchors,node=o.hip.node,end=o.hip.ridge?.anchors?.[1];
   if(!same(o.boundary.map(s=>s.anchors),[[aa,bb],[aa,dd],[bb,cc]])||!same(o.hip.diagonals.map(s=>s.anchors),[[aa,node],[bb,node]])||!same(o.hip.ridge?.anchors?.[0],node)||!same(o.sourcePans,[[aa,bb,node],[aa,node,end,dd],[bb,cc,end,node]]))errors.push('ROOF_PLAN_STROKES');
   if(Array.isArray(o.footprint)&&o.footprint.every(point)){const inside=o.footprint.every(([x,y])=>x>=primary[0]-r.scale*3&&x<=primary[2]+r.scale*3&&y>=primary[1]-r.scale*3&&y<=primary[3]+r.scale*3);if(o.parentExtentAmbiguous!==inside)errors.push('ROOF_PLAN_HOST_ENVELOPE');}
   for(const region of o.elevationRegions||[]){if(!region){errors.push('ROOF_PLAN_ELEVATION_SOURCE');continue;}const ev=viewFor(region.sourceViewId,'elevation'),box=region.sourceBox,q=region.registration,wall=q?.wallBox;if(!ev||ev.direction!==region.direction||!same(ev.frame,region.sourceFrame)||ev.fileId!==region.sourceFileId||ev.page!==region.sourcePage||!Array.isArray(box)||box.length!==4||!box.every(finite)||box[2]<=0||box[3]<=0||!inBounds(box.slice(0,2),ev)||!inBounds([box[0]+box[2],box[1]+box[3]],ev)||![region.scaleX,region.scaleY].every(n=>finite(n)&&n>0)||!Array.isArray(wall)||wall.length!==4||!wall.every(finite)||wall[2]<=0||wall[3]<=0||![q?.min,q?.max,q?.base,q?.supportY,q?.guide?.y].every(finite)||q.base!==r.base?.value||Math.abs((q.max-q.min)/wall[2]-region.scaleX)>1e-10||Math.abs((q.levelBand?.scaleY??r.height?.value/(q.guide.y-q.supportY))-region.scaleY)>1e-10)errors.push('ROOF_PLAN_ELEVATION_SOURCE');}
   if(errors.includes('ROOF_PLAN_ELEVATION_SOURCE'))continue;
   if(o.association?.status==='proposed'){
    const a=o.association,component=(roof.extensions||[]).find(c=>c.id===a.componentId),er=viewFor(a.elevationRidge?.sourceViewId,'elevation');
    if(!component||o.parentExtentAmbiguous||!same(component.profiles,a.profiles)||!same(component.sources,a.sources)||!same(component.connection?.join,a.join)||!a.join||![a.join.value,a.join.height].every(finite)||component.connection?.observationId!==o.id||!supported(a.planRidge||{})||!supported(a.elevationRidge||{})||a.planRidge?.anchors?.length!==2||!a.planRidge.anchors.every(q=>inBounds(q,view))||!er||!same(er.frame,a.elevationRidge.sourceFrame)||a.elevationRidge?.anchors?.length!==2||!a.elevationRidge.anchors.every(q=>inBounds(q,er))||!Array.isArray(a.sources)||a.sources.length!==2||a.sources.some(s=>!s)){errors.push('ROOF_PLAN_ASSOCIATION');continue;}
    const dirs=a.sources.map(s=>viewFor(s.sourceViewId,'elevation')?.direction),f=frames[o.direction];if(!dirs.includes(o.direction)||!dirs.some(d=>frames[d]?.axis===f.normal)){errors.push('ROOF_PLAN_ELEVATION_AXES');continue;}
    const pair=a.sources.every(s=>{const ev=viewFor(s.sourceViewId,'elevation'),region=o.elevationRegions.find(r=>r.sourceViewId===s.sourceViewId);return ev&&same(ev.frame,s.sourceFrame)&&s.axis===frames[ev.direction]?.axis&&s.anchors?.length===3&&s.anchors.every(q=>inBounds(q,ev))&&region&&region.scaleX===s.scaleX&&region.scaleY===s.scaleY;});if(!pair){errors.push('ROOF_PLAN_ELEVATION_SOURCE');continue;}
    const primarySource=a.sources.find(s=>viewFor(s.sourceViewId,'elevation').direction===o.direction),sideSource=a.sources.find(s=>s!==primarySource),regionFor=s=>o.elevationRegions.find(r=>r.sourceViewId===s.sourceViewId),coordinates=(s,p)=>{const region=regionFor(s),q=region.registration;return [frames[region.direction].sign*(q.min+(p[0]-q.wallBox[0])*s.scaleX),q.base+(q.guide.y-p[1])*s.scaleY];};
    if(!primarySource||!sideSource){errors.push('ROOF_PLAN_ELEVATION_AXES');continue;}
    const tangential=primarySource.anchors.map(p=>coordinates(primarySource,p)),side=sideSource.anchors.map(p=>coordinates(sideSource,p)),slope=line(side[0],side[1]),crest=tangential[1][1],ridge=slope&&(crest-slope.c)/slope.m,normal=[side[0],[ridge,crest],side[2]].sort((a,b)=>a[0]-b[0]),close=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((p,i)=>point(p)&&point(b[i])&&M.distance(p,b[i])<1e-8);
    if(!finite(ridge)||!close(tangential,component.profiles[f.axis])||!close(normal,component.profiles[f.normal]))errors.push('ROOF_PLAN_PROFILE_SOURCE');
    const peak=tangential[1][0],join=a.join,parentNormal=value(roof.profiles[f.normal],join.value),parentTangent=value(roof.profiles[f.axis],peak),world=n=>f.normal==='x'?[n,peak]:[peak,n],plan=[map.source(world(ridge)),map.source(world(join.value))];
    if(join.axis!==f.normal||Math.abs(join.height-crest)>1e-8||parentNormal===null||parentTangent===null||Math.abs(Math.min(parentNormal,parentTangent)-crest)>1e-8||!close(plan,a.planRidge.anchors)||(join.value-ridge)*f.outward>=0)errors.push('ROOF_PLAN_JOIN');
   }else if(o.association?.status!=='unresolved'||!o.association.reason)errors.push('ROOF_PLAN_ASSOCIATION');
  }
  if((p.status==='proposed')!==p.observations.some(o=>o.association?.status==='proposed'))errors.push('ROOF_PLAN_EVIDENCE');
  if(confirm&&(p.status==='unresolved'||p.observations.some(o=>o.association?.status!=='proposed')||p.issues.includes('ROOF_PLAN_PARENT_EXTENT_OWNERSHIP_UNRESOLVED')))errors.push('ROOF_PLAN_UNRESOLVED');
  return unique(errors);
 }
 function historyIssues(roof,previous){
  const old=previous?.roofPlanEvidence;if(!old)return [];
  const next=roof?.roofPlanEvidence;if(!next||!Array.isArray(next.observations)||!Array.isArray(old.observations))return ['ROOF_PLAN_EVIDENCE_LOST'];
  const source=o=>o&&[o.id,o.sourceViewId,o.sourceFileId,o.sourcePage,o.sourceFrame,o.anchors,o.boundary,o.hip,o.sourcePans,o.gridRegistration];
  if(!same(old.reference,next.reference)||(old.observations||[]).some(o=>!next.observations.some(n=>same(source(n),source(o))&&(!(o.association?.status==='proposed')||same(n.association,o.association)))))return ['ROOF_PLAN_EVIDENCE_LOST'];return [];
 }
 return Object.freeze({version:1,observe,elevationRegions,propose,geometryIssues,evidenceIssues,historyIssues});
});
