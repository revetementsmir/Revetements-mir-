/* Two measured orthographic profiles bound one physical roof surface. No
 * rectangle/rise fallback, symmetry assumption or PDF texture is used. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(()=>node?require('./plan-roof-plan-evidence.js'):root.MIRRoofPlanEvidence);if(node)module.exports=api;else root.MIRReconstructedRoofs=api;})(typeof window==='object'?window:globalThis,function(planEvidenceModule){
 'use strict';const finite=Number.isFinite;
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=v=>JSON.parse(JSON.stringify(v));
 function pitchGeometry(roof){return {profiles:copy(roof.profiles),extensions:(roof.extensions||[]).map(r=>({id:r.id,profiles:copy(r.profiles)}))};}
 function pitchEvidenceIssues(roof,{confirm=false}={}){
  const p=roof.pitchEvidence;if(p===undefined)return [];
  if(!p||p.version!==1||p.roofId!==roof.id||p.levelId!==roof.levelId||p.buildingId!==roof.buildingId||!Array.isArray(p.observations)||!Array.isArray(p.checks)||p.observations.length>128||p.checks.length>128||!['conflict','unresolved','consistent','not-found'].includes(p.status))return ['ROOF_PITCH_EVIDENCE'];
  if(!same(p.geometry,pitchGeometry(roof)))return ['ROOF_PITCH_EVIDENCE_STALE'];
  // Recompute the existing mesh without recursively reading this evidence.
  // A stored check is not permission to hide a contradiction or change a roof.
  const clean=copy(roof);delete clean.pitchEvidence;for(const child of clean.extensions||[])delete child.pitchEvidence;
  const mesh=faces(clean,[0,0],{includeProposed:true}).filter(f=>f.type==='roof'),seen=new Set(),errors=[];
  const box=b=>Array.isArray(b)&&b.length===4&&b.every(finite)&&b[2]>b[0]&&b[3]>b[1];
  for(const o of p.observations){
   if(!o?.id||seen.has(o.id)||!o.sourceViewId||!o.sourceFileId||!Number.isInteger(o.sourcePage)||!o.sourceFrame||!box(o.sourceBox)||!o.association||!['proposed','unresolved','conflict'].includes(o.status)){errors.push('ROOF_PITCH_EVIDENCE');continue;}seen.add(o.id);
   if(o.status==='proposed'&&(!(o.ratio?.rise>0&&o.ratio.run>0)||!finite(o.ratio.value)||Math.abs(o.ratio.value-o.ratio.rise/o.ratio.run)>1e-9))errors.push('ROOF_PITCH_EVIDENCE');
   if(o.association.status==='proposed'&&!p.checks.some(c=>c.observationId===o.id))errors.push('ROOF_PITCH_EVIDENCE');
  }
  const checked=new Set();let conflict=false;
  for(const c of p.checks){
   const o=p.observations.find(o=>o.id===c.observationId),a=o?.association,face=mesh.find(f=>f.id===c.faceId&&f.componentId===c.componentId),slope=face&&Math.hypot(face.normal[0],face.normal[1])/face.normal[2];
   if(checked.has(c.observationId)||!o||o.status!=='proposed'||a?.status!=='proposed'||a.faceId!==c.faceId||a.componentId!==c.componentId||!face||!same(a.facePolygon,face.poly)||!finite(slope)||![c.writtenRatio,c.measuredRatio,c.difference,c.tolerance].every(finite)||c.tolerance<0||Math.abs(c.writtenRatio-o.ratio.value)>1e-9||Math.abs(c.measuredRatio-slope)>1e-9||Math.abs(c.difference-(c.writtenRatio-slope))>1e-9){errors.push('ROOF_PITCH_EVIDENCE');continue;}
   checked.add(c.observationId);const disagrees=Math.abs(c.writtenRatio-slope)>c.tolerance;
   if(c.status!==(disagrees?'conflict':'consistent'))errors.push('ROOF_PITCH_EVIDENCE');conflict||=disagrees;
  }
  if((p.status==='conflict')!==conflict)errors.push('ROOF_PITCH_EVIDENCE');
  if(confirm&&conflict)errors.push('ROOF_PITCH_CONFLICT');return [...new Set(errors)];
 }
 function pitchSourceIssues(roof,inventory){
  const errors=[],p=roof.pitchEvidence;
  if(p!==undefined){
   if(!p||!Array.isArray(p.observations))errors.push('ROOF_PITCH_SOURCE');
   else for(const o of p.observations){
    const view=inventory.views.find(v=>v.id===o.sourceViewId&&v.buildingId===roof.buildingId&&v.kind==='roof'),b=o.sourceBox,w=view?.payload?.sourceWidth||view?.frame?.rasterSize?.[0],h=view?.payload?.sourceHeight||view?.frame?.rasterSize?.[1];
    if(!view||!finite(w)||!finite(h)||view.fileId!==o.sourceFileId||view.page!==o.sourcePage||!same(view.frame,o.sourceFrame)||!Array.isArray(b)||b.length!==4||!b.every(finite)||b[0]<0||b[1]<0||b[2]>w||b[3]>h){errors.push('ROOF_PITCH_SOURCE');continue;}
    for(const n of [o.nativeSource,o.nativeArrow?.nativeSource])if(n&&(n.method!=='retained-pdf-region'||n.sourceViewId!==view.id||n.sourceFileId!==view.fileId||n.sourcePage!==view.page||!same(n.sourceFrame,view.frame)))errors.push('ROOF_PITCH_SOURCE');
    if(o.nativeArrow&&(o.nativeArrow.sourceViewId!==view.id||!same(o.nativeArrow.sourceFrame,view.frame)||!o.nativeArrow.nativeSource))errors.push('ROOF_PITCH_SOURCE');
    const a=o.association;if(a?.status==='proposed'){
     const floor=inventory.views.find(v=>v.id===a.floorSourceViewId&&v.kind==='floor'&&v.buildingId===roof.buildingId),g=a.gridRegistration;
     if(!floor||!same(floor.frame,a.floorSourceFrame)||g?.status!=='proposed'||g.referenceSourceViewId!==floor.id||g.movingSourceViewId!==view.id||!same(g.referenceSourceFrame,floor.frame)||!same(g.movingSourceFrame,view.frame)||a.floorReference?.sourceViewId!==floor.id)errors.push('ROOF_PITCH_SOURCE');
    }
   }
  }
  for(const child of roof.extensions||[])errors.push(...pitchSourceIssues(child,inventory));return [...new Set(errors)];
 }
 function pitchHistoryIssues(roof,previous){
  if(!roof)return previous?.pitchEvidence||(previous?.extensions||[]).some(c=>pitchHistoryIssues(null,c).length)?['ROOF_PITCH_EVIDENCE_LOST']:[];
  const errors=[],old=previous?.pitchEvidence,next=roof.pitchEvidence;
  // Finishing or reopening a roof cannot discard an inconvenient source.
  // New assessments may change face ownership, but retain the written reading.
  const reading=o=>[o.id,o.text,o.ratio,o.sourceViewId,o.sourceFileId,o.sourcePage,o.sourceFrame,o.sourceBox,o.nativeSource];
  if(old&&(!next||!Array.isArray(next.observations)||(old.observations||[]).some(o=>!next.observations.some(n=>same(reading(n),reading(o))||(n.previousReadings||[]).some(p=>same(reading(p),reading(o)))))))errors.push('ROOF_PITCH_EVIDENCE_LOST');
  if(old&&next&&Array.isArray(next.observations))for(const o of old.observations||[])if(o.association?.status==='proposed'){
   const n=next.observations.find(n=>n.id===o.id),before=old.checks?.find(c=>c.observationId===o.id),after=next.checks?.find(c=>c.observationId===o.id);
   if(n?.association?.status!=='proposed'||!after||same(old.geometry,next.geometry)&&(!same(n.association,o.association)||!same(before,after)))errors.push('ROOF_PITCH_EVIDENCE_LOST');
  }
  for(const child of previous?.extensions||[])errors.push(...pitchHistoryIssues((roof.extensions||[]).find(p=>p.id===child.id),child));return [...new Set(errors)];
 }
 function planEvidenceIssues(roof,{confirm=false}={}){
  if(roof?.roofPlanEvidence===undefined&&!(roof?.extensions||[]).some(c=>c.roofPlanEvidence!==undefined))return [];
  const plan=planEvidenceModule();return plan?.geometryIssues?plan.geometryIssues(roof,{confirm}):['ROOF_PLAN_MODULE_REQUIRED'];
 }
 function planSourceIssues(roof,inventory){
  const errors=[];
  if(roof?.roofPlanEvidence!==undefined){const plan=planEvidenceModule();errors.push(...(plan?.evidenceIssues?plan.evidenceIssues(roof,inventory,{confirm:false}):['ROOF_PLAN_MODULE_REQUIRED']));}
  for(const child of roof?.extensions||[])errors.push(...planSourceIssues(child,inventory));return [...new Set(errors)];
 }
 function planHistoryIssues(roof,previous){
  const errors=[];
  if(previous?.roofPlanEvidence!==undefined){const plan=planEvidenceModule();errors.push(...(plan?.historyIssues?plan.historyIssues(roof,previous):['ROOF_PLAN_MODULE_REQUIRED']));}
  for(const child of previous?.extensions||[])errors.push(...planHistoryIssues((roof?.extensions||[]).find(c=>c.id===child.id),child));return [...new Set(errors)];
 }
 function observedFasciaIssues(roof){
  if(roof.observedFascia===undefined)return [];
  const faces=roof.observedFascia,xp=roof.profiles?.x,yp=roof.profiles?.y;
  if(!Array.isArray(faces)||faces.length>16||finite(roof.fasciaBottom)||!Array.isArray(xp)||!Array.isArray(yp))return ['ROOF_OBSERVED_FASCIA'];
  const ids=new Set(),errors=[],dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],delta=(a,b)=>a.map((n,i)=>n-b[i]);
  for(const face of faces){
   const p=face?.poly,n=face?.normal;
   if(!face?.id||ids.has(face.id)||face.status!=='proposed'||!Array.isArray(p)||p.length!==4||p.some(v=>!Array.isArray(v)||v.length!==3||!v.every(finite))||!Array.isArray(n)||n.length!==3||!n.every(finite)||Math.abs(Math.hypot(...n)-1)>1e-6||Math.abs(n[2])>1e-8){errors.push('ROOF_OBSERVED_FASCIA');continue;}
   ids.add(face.id);
   const zmax=Math.max(...xp.map(v=>v[1]),...yp.map(v=>v[1]));
   if(p.some(v=>Math.abs(dot(delta(v,p[0]),n))>1e-7||Math.abs(v[2])>10000||v[2]>zmax+.001||v[0]<xp[0][0]-.001||v[0]>xp.at(-1)[0]+.001||v[1]<yp[0][0]-.001||v[1]>yp.at(-1)[0]+.001))errors.push('ROOF_OBSERVED_FASCIA');
   if(roof.entryAssembly&&(Math.abs(n[0])+Math.abs(n[1]+1)+Math.abs(n[2])>1e-8||p.some(v=>Math.abs(v[1]-yp[0][0])>.001)||roof.roofForm==='flat'&&Math.abs(Math.max(...p.map(v=>v[2]))-zmax)>.001))errors.push('ROOF_OBSERVED_FASCIA');
   const turns=p.map((v,i)=>dot(cross(delta(p[(i+1)%4],v),delta(p[(i+2)%4],p[(i+1)%4])),n));
   if(!turns.every(v=>v>1e-8)&&!turns.every(v=>v< -1e-8))errors.push('ROOF_OBSERVED_FASCIA');
   if(!roof.sources?.some(s=>s.sourceViewId===face.sourceViewId)||!face.sourceFrame||!Array.isArray(face.anchors)||face.anchors.length<2||face.anchors.some(a=>!Array.isArray(a)||a.length!==2||!a.every(finite))||!(face.scaleX>0&&face.scaleY>0))errors.push('ROOF_OBSERVED_FASCIA_SOURCE');
  }return errors;
 }
 function issues(roof,{confirm=true,depth=0}={}){const errors=[];if(!roof?.id||!roof.levelId||!roof.buildingId)errors.push('ROOF_ID');if(confirm&&roof.status!=='confirmed')errors.push('ROOF_UNCONFIRMED');for(const key of ['x','y']){const p=roof?.profiles?.[key];if(!Array.isArray(p)||p.length<2||p.length>12||p.some((p,i,a)=>p.length!==2||!p.every(finite)||p.some(n=>Math.abs(n)>10000)||i&&p[0]<=a[i-1][0]))errors.push('ROOF_PROFILE');}if(!Array.isArray(roof?.sources)||roof.sources.length<2||roof.sources.some(s=>!s.sourceViewId||!s.sourceFrame||!s.anchors?.length||!finite(s.scaleX)||!finite(s.scaleY)||s.scaleX<=0||s.scaleY<=0))errors.push('ROOF_SOURCE');if((roof.extensions||[]).length>8||depth>0&&roof.extensions?.length)errors.push('ROOF_COMPONENTS');else for(const child of roof.extensions||[]){if(child.levelId!==roof.levelId||child.buildingId!==roof.buildingId||child.id===roof.id||issues(child,{confirm:false,depth:depth+1}).length)errors.push('ROOF_COMPONENTS');}if(!errors.includes('ROOF_PROFILE')){errors.push(...observedFasciaIssues(roof));errors.push(...pitchEvidenceIssues(roof,{confirm}));errors.push(...planEvidenceIssues(roof,{confirm}));if(confirm)for(const child of roof.extensions||[])errors.push(...pitchEvidenceIssues(child,{confirm:true}));}return [...new Set(errors)];}
 function clip(poly,a,b,c,side){const result=[],value=p=>side*(a*p[0]+b*p[1]+c);for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],u=value(p),v=value(q);if(u<=1e-9)result.push(p);if((u<-1e-9&&v>1e-9)||(u>1e-9&&v<-1e-9)){const t=u/(u-v);result.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}return result;}
 const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
 function supportingPlanes(roof){
  const result=[];for(const axis of ['x','y']){const profile=roof.profiles[axis];let previous=Infinity;for(let i=0;i<profile.length-1;i++){const a=profile[i],b=profile[i+1],slope=(b[1]-a[1])/(b[0]-a[0]);if(slope>previous+1e-8)return null;previous=slope;const plane=axis==='x'?[slope,0,a[1]-slope*a[0]]:[0,slope,a[1]-slope*a[0]];if(!result.some(p=>p.every((n,j)=>Math.abs(n-plane[j])<1e-8)))result.push(plane);}}return result;
 }
 function componentFaces(roof,center=[0,0],includeProposed=false){if(issues(roof,{confirm:!includeProposed}).length)return [];const result=[],xp=roof.profiles.x,yp=roof.profiles.y;
  const planes=supportingPlanes(roof);
  if(planes){
   // A concave silhouette bounds whole roof planes. Splitting it at every
   // profile coordinate created artificial seams and unstable painter order.
   for(let i=0;i<planes.length;i++){const [ax,ay,c]=planes[i];let p=[[xp[0][0],yp[0][0]],[xp.at(-1)[0],yp[0][0]],[xp.at(-1)[0],yp.at(-1)[0]],[xp[0][0],yp.at(-1)[0]]];for(let j=0;j<planes.length&&p.length>=3;j++){if(i===j)continue;const [bx,by,d]=planes[j];p=clip(p,ax-bx,ay-by,c-d,1);}if(p.length<3||area(p)<1e-8)continue;const n=[-ax,-ay,1],length=Math.hypot(...n);result.push({id:roof.id+':plane:'+i,roofId:roof.id,elementId:roof.id,levelId:roof.levelId,buildingId:roof.buildingId,type:'roof',role:'source-profile-roof',poly:p.map(([x,y])=>[x-center[0],y-center[1],ax*x+ay*y+c]),normal:n.map(v=>v/length),fillColor:/^#[0-9a-f]{6}$/i.test(roof.finish?.color||'')?roof.finish.color:'#6c716b',status:roof.status});}
  }else for(let i=0;i<xp.length-1;i++)for(let j=0;j<yp.length-1;j++){
   const [x0,zx0]=xp[i],[x1,zx1]=xp[i+1],[y0,zy0]=yp[j],[y1,zy1]=yp[j+1],ax=(zx1-zx0)/(x1-x0),bx=zx0-ax*x0,ay=(zy1-zy0)/(y1-y0),by=zy0-ay*y0,rectangle=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],same=Math.abs(ax)+Math.abs(ay)+Math.abs(bx-by)<1e-9;
   for(const dimension of ['x','y']){if(same&&dimension==='y')continue;const p=clip(rectangle,ax,-ay,bx-by,dimension==='x'?1:-1);if(p.length<3||area(p)<1e-8)continue;const n=dimension==='x'?[-ax,0,1]:[0,-ay,1],length=Math.hypot(...n),id=roof.id+':'+i+':'+j+':'+dimension;
    result.push({id,roofId:roof.id,elementId:roof.id,levelId:roof.levelId,buildingId:roof.buildingId,type:'roof',role:'source-profile-roof',poly:p.map(([x,y])=>[x-center[0],y-center[1],dimension==='x'?ax*x+bx:ay*y+by]),normal:n.map(v=>v/length),fillColor:/^#[0-9a-f]{6}$/i.test(roof.finish?.color||'')?roof.finish.color:'#6c716b',status:roof.status});
   }
  }
  if(finite(roof.fasciaBottom)){
   const evaluate=(profile,value)=>{const i=Math.max(0,Math.min(profile.length-2,profile.findIndex((p,i)=>i<profile.length-1&&value>=p[0]-1e-8&&value<=profile[i+1][0]+1e-8))),a=profile[i],b=profile[i+1];return a[1]+(b[1]-a[1])*(value-a[0])/(b[0]-a[0]);},edges=[['x-min',xp[0][0],yp,[ -1,0,0]],['x-max',xp.at(-1)[0],yp,[1,0,0]],['y-min',yp[0][0],xp,[0,-1,0]],['y-max',yp.at(-1)[0],xp,[0,1,0]]];
   for(const [edge,fixed,profile,normal]of edges){if(roof.joinedEdges?.includes(edge))continue;for(let i=0;i<profile.length-1;i++){const at=n=>edge[0]==='x'?[fixed,n]:[n,fixed],a=at(profile[i][0]),b=at(profile[i+1][0]),za=Math.min(evaluate(xp,a[0]),evaluate(yp,a[1])),zb=Math.min(evaluate(xp,b[0]),evaluate(yp,b[1])),bottom=roof.fasciaBottom;if(Math.min(za,zb)<=bottom+.002)continue;result.push({id:roof.id+':fascia:'+edge+':'+i,roofId:roof.id,elementId:roof.id,levelId:roof.levelId,buildingId:roof.buildingId,type:'fascia',role:'source-wall-to-eave-fascia',normal,poly:[[a[0]-center[0],a[1]-center[1],bottom],[b[0]-center[0],b[1]-center[1],bottom],[b[0]-center[0],b[1]-center[1],zb],[a[0]-center[0],a[1]-center[1],za]],fillColor:roof.finish?.fasciaColor||'#d5d8cf',status:roof.status,quantityStatus:'partial-unreviewed'});}}
  }
  // Explicit source faces can describe a stepped flat-roof edge without
  // extruding that front height through the hidden roof section.
  for(const face of roof.observedFascia||[])result.push({id:face.id,roofId:roof.id,elementId:roof.id,levelId:roof.levelId,buildingId:roof.buildingId,type:'fascia',role:'source-observed-roof-fascia',normal:face.normal.slice(),poly:face.poly.map(([x,y,z])=>[x-center[0],y-center[1],z]),fillColor:/^#[0-9a-f]{6}$/i.test(roof.finish?.fasciaColor||'')?roof.finish.fasciaColor:'#d5d8cf',status:roof.status,quantityStatus:'partial-unreviewed'});
  return result;
 }
 function planeAt(face){const [a,b,c]=face.poly,n=face.normal;return [-(n[0]/n[2]),-(n[1]/n[2]),a[2]+n[0]/n[2]*a[0]+n[1]/n[2]*a[1]];}
 function uncovered(subject,sourcePlane,occluder,keepEqual){
  const bounds=occluder.poly.map(p=>p.slice(0,2)),orientation=Math.sign(bounds.reduce((s,a,i)=>{const b=bounds[(i+1)%bounds.length];return s+a[0]*b[1]-a[1]*b[0];},0));let inside=subject;const pieces=[];
  for(let i=0;i<bounds.length&&inside.length>=3;i++){const a=bounds[i],b=bounds[(i+1)%bounds.length],dx=b[0]-a[0],dy=b[1]-a[1],line=[-dy,dx,dy*a[0]-dx*a[1]],outside=clip(inside,...line,orientation);if(outside.length>=3&&area(outside)>1e-8)pieces.push(outside);inside=clip(inside,...line,-orientation);}
  if(inside.length>=3){const target=planeAt(occluder),same=sourcePlane.every((n,i)=>Math.abs(n-target[i])<1e-8),keep=same&&!keepEqual?[]:clip(inside,sourcePlane[0]-target[0],sourcePlane[1]-target[1],sourcePlane[2]-target[2],-1);if(keep.length>=3&&area(keep)>1e-8)pieces.push(keep);}return pieces;
 }
 function mergeCoplanar(faces){
  const groups=[],other=faces.filter(f=>f.type!=='roof');for(const face of faces.filter(f=>f.type==='roof')){const plane=planeAt(face);let group=groups.find(g=>g.plane.every((n,i)=>Math.abs(n-plane[i])<1e-7));if(!group){group={plane,faces:[]};groups.push(group);}group.faces.push(face);}
  for(const group of groups){if(group.faces.length===1){other.push(group.faces[0]);continue;}const key=p=>p.map(n=>Math.round(n*1e7)).join(','),vertices=new Map();for(const face of group.faces)for(const p of face.poly)vertices.set(key(p.slice(0,2)),p.slice(0,2));const points=[...vertices.values()],edges=new Map();
   const add=(a,b)=>{const ak=key(a),bk=key(b),edge=ak+'|'+bk,reverse=bk+'|'+ak;if(edges.has(reverse))edges.delete(reverse);else edges.set(edge,{a:ak,b:bk});};
   for(const face of group.faces)for(let i=0;i<face.poly.length;i++){const a=face.poly[i],b=face.poly[(i+1)%face.poly.length],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;if(len<1e-12)continue;const on=points.map(p=>({p,t:((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len})).filter(v=>v.t>=-1e-8&&v.t<=1+1e-8&&Math.abs((v.p[0]-a[0])*dy-(v.p[1]-a[1])*dx)<1e-7).sort((a,b)=>a.t-b.t);for(let j=0;j<on.length-1;j++)if(key(on[j].p)!==key(on[j+1].p))add(on[j].p,on[j+1].p);}
   const outgoing=new Map();let invalid=false;for(const edge of edges.values()){if(outgoing.has(edge.a)){invalid=true;break;}outgoing.set(edge.a,edge.b);}const loops=[];while(outgoing.size&&!invalid){const start=outgoing.keys().next().value,loop=[];let cursor=start;for(let count=0;count<=edges.size;count++){loop.push(vertices.get(cursor));const next=outgoing.get(cursor);outgoing.delete(cursor);if(next===start){loops.push(loop);break;}if(!next){invalid=true;break;}cursor=next;}}
   if(loops.some(p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0)<0))invalid=true;
   if(invalid||!loops.length){other.push(...group.faces);continue;}
   loops.forEach((poly,i)=>{const clean=poly.filter((p,j)=>{const a=poly[(j+poly.length-1)%poly.length],b=poly[(j+1)%poly.length];return Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>1e-7;});other.push({...group.faces[0],id:group.faces[0].id+':merged:'+i,suppressOutline:false,poly:clean.map(([x,y])=>[x,y,group.plane[0]*x+group.plane[1]*y+group.plane[2]])});});
  }return other;
 }
 function faces(roof,center=[0,0],{includeProposed=false}={}){
  if(!['proposed','confirmed'].includes(roof.status)||issues(roof,{confirm:!includeProposed}).length)return [];const components=[roof,...(roof.extensions||[]).map(child=>({...child,status:roof.status,finish:roof.finish}))],groups=components.map(c=>componentFaces(c,center,includeProposed)),result=[];
  for(let i=0;i<groups.length;i++)for(const face of groups[i]){
   if(face.type!=='roof'){result.push(face);continue;}const plane=planeAt(face);let pieces=[face.poly.map(p=>p.slice(0,2))];for(let j=0;j<groups.length;j++){if(j===i)continue;for(const other of groups[j].filter(f=>f.type==='roof'))pieces=pieces.flatMap(p=>uncovered(p,plane,other,i>j));}
   pieces.forEach((p,k)=>result.push({...face,id:face.id+':visible:'+k,roofId:roof.id,elementId:roof.id,componentId:components[i].id,poly:p.map(([x,y])=>[x,y,plane[0]*x+plane[1]*y+plane[2]]),suppressOutline:groups.length>1}));
  }return mergeCoplanar(result);
 }
 return Object.freeze({version:1,issues,faces,pitchGeometry,pitchEvidenceIssues,pitchSourceIssues,pitchHistoryIssues,planEvidenceIssues,planSourceIssues,planHistoryIssues});
});
