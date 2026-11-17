/* Source-supported exterior proposals. Missing extents and material identities stay unknown. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-reconstruction.js'):root.MIRPlanReconstruction,node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision,node?require('./plan-import-core.js'):root.MIRPDFAnalysis,node?require('./plan-reconstructed-flat-roofs.js'):root.MIRReconstructedFlatRoofs);
 if(node)module.exports=api;else root.MIRReconstructedExterior=api;
})(typeof window==='object'?window:globalThis,function(M,R,V,A,FlatRoofs){
 'use strict';
 const copy=M.clone,finite=Number.isFinite,INCH=.0254;
 const normal=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const frames={front:{u:[1,0],n:[0,-1]},back:{u:[-1,0],n:[0,1]},right:{u:[0,1],n:[1,0]},left:{u:[0,-1],n:[-1,0]}};
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1],rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
 const validBox=b=>Array.isArray(b)&&b.length===4&&b.every(finite)&&b[2]>0&&b[3]>0;
 const intersection=(a,b)=>{const x=Math.max(a[0],b[0]),y=Math.max(a[1],b[1]),r=Math.min(a[0]+a[2],b[0]+b[2]),bottom=Math.min(a[1]+a[3],b[1]+b[3]);return r>x&&bottom>y?[x,y,r-x,bottom-y]:null;};
 const area=b=>b[2]*b[3];
 const sourceKey=box=>box.map(n=>Math.round(n*10)/10).join('-');
 const median=values=>{const a=values.slice().sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;};
 function subtractBoxes(box,masks){
  let parts=[box.slice()];
  for(const mask of masks.filter(validBox)){
   parts=parts.flatMap(p=>{const cut=intersection(p,mask);if(!cut)return [p];const [x,y,w,h]=p,[cx,cy,cw,ch]=cut;return [[x,y,w,cy-y],[x,cy+ch,w,y+h-cy-ch],[x,cy,cx-x,ch],[cx+cw,cy,x+w-cx-cw,ch]].filter(b=>b[2]>1&&b[3]>1);});
   if(parts.length>80)return []; // Excessive segmentation is unresolved, never filled over.
  }
  return parts;
 }
 function materialLabels(view){
  return R.readings(view).filter(row=>row.box?.length===4&&(row.source==='pdf-text'||row.confidence>=40)&&/\b(?:briques?|maconnerie|masonry|brick(?:work)?|pierres?|stone)\b/.test(normal(row.text))&&!/\b(?:sans|aucun[e]?|no|without)\s+(?:de\s+)?(?:briques?|maconnerie|masonry|brick(?:work)?|pierres?|stone)\b/.test(normal(row.text)));
 }
 function writtenThickness(view,type){
  const subject=type==='foundation'?/\b(?:fondations?|solage|foundation(?:\s+walls?)?)\b/:/\b(?:briques?|maconnerie|masonry|brick(?:work)?|pierres?|stone)\b/;
  const found=[];
  for(const row of R.readings(view)){
   if(!row.box?.every(finite)||row.box.length!==4||row.source!=='pdf-text'&&!(row.confidence>=40))continue;
   const text=normal(row.text).replace(/''/g,'"'),hit=subject.exec(text);if(!hit)continue;
   if(/\b(?:sans|aucun[e]?|no|without)\s+(?:de\s+)?$/.test(text.slice(0,hit.index)))continue;
   const rest=text.slice(hit.index+hit[0].length),match=rest.match(/^[^\d]{0,28}(\d+(?:[.,]\d+)?(?:\s+\d+\s*\/\s*\d+)?\s*(?:"|po\b|pouces?\b|in(?:ches)?\b|mm\b|cm\b))/);
   if(!match)continue;
   const measured=A.parseDimension(match[1].replace(/pouces?/g,'po').replace(/inches/g,'in'),{ocr:row.source==='ocr'});
   if(!measured||measured.corrected)continue;
   const value=measured.valueFt*.3048;if(!(value>.01&&value<1.5))continue;
   if(found.some(r=>Math.abs(r.value-value)<1e-9&&r.sourceBox.every((n,i)=>n===row.box[i])))continue;
   found.push({value,unit:'m',kind:'written',status:'proposed',sourceViewId:view.id,sourceFrame:copy(view.frame),sourceBox:copy(row.box),boxFormat:'xyxy',label:row.text,scope:'source-view; association-to-this-element-requires-review',confirmationRequired:true});
  }
  return found;
 }
 function thickness(view,type,hasMasonry){
  const ruleInches=type==='masonry'?4:hasMasonry?10:8,ruleValue=ruleInches*INCH,candidates=writtenThickness(view,type);
  const conflict=candidates.some(c=>Math.abs(c.value-ruleValue)>.001)||candidates.some(c=>Math.abs(c.value-candidates[0].value)>.001);
  return {value:conflict?null:ruleValue,unit:'m',kind:conflict?'conflicting-evidence':'user-rule',status:conflict?'conflict':'proposed',ruleInches,ruleValue,
   ruleSource:'Frederick: masonry 4 in; foundation 10 in with masonry, otherwise 8 in',condition:type==='masonry'?'masonry':hasMasonry?'masonry-observed':'otherwise',
   conditionStatus:type==='foundation'&&!hasMasonry?'unverified':'proposed',writtenCandidates:candidates,confirmationRequired:true,structuralVerification:false};
 }
 // A coloured fill, horizontal siding courses or a note alone do not establish masonry.
 // Require several visible courses with staggered interior joints, inside a known wall.
 function masonryHatches(image,box){
  if(!image?.data||!validBox(box))return [];
  const b=intersection(box,[0,0,image.width,image.height]);if(!b||b[2]<45||b[3]<18)return [];
  const x0=Math.ceil(b[0]),x1=Math.floor(b[0]+b[2]-1),y0=Math.ceil(b[1]),y1=Math.floor(b[1]+b[3]-1),minRun=Math.max(25,b[2]*.55);
  const ink=(x,y)=>{if(x<0||y<0||x>=image.width||y>=image.height)return false;const p=(y*image.width+x)*4,r=image.data[p],g=image.data[p+1],bl=image.data[p+2];return image.data[p+3]>160&&Math.min(r,g,bl)<145&&(Math.max(r,g,bl)<205||Math.max(r,g,bl)-Math.min(r,g,bl)>55);};
  const rows=[];
  for(let y=y0;y<=y1;y++){
   let begin=null,last=-10,best=null;
   for(let x=x0;x<=x1;x++){if(!ink(x,y))continue;if(x-last>2)begin=x;last=x;if(!best||last-begin>best.right-best.left)best={left:begin,right:last};}
   if(best&&best.right-best.left>=minRun){const previous=rows.at(-1);if(previous&&y-previous.bottom<=2){previous.bottom=y;previous.left=Math.max(previous.left,best.left);previous.right=Math.min(previous.right,best.right);}else rows.push({y,bottom:y,...best});}
  }
  const courses=[];
  for(let i=1;i<rows.length;i++){
   const a=rows[i-1],z=rows[i],top=a.bottom,bottom=z.y,pitch=bottom-top,left=Math.max(a.left,z.left),right=Math.min(a.right,z.right);
   if(pitch<4||pitch>Math.min(80,b[3]*.35)||right-left<Math.max(30,pitch*4))continue;
   const jointPixels=[];
   for(let x=Math.ceil(left+Math.max(3,pitch*.25));x<=Math.floor(right-Math.max(3,pitch*.25));x++){
    let hits=0,total=0;for(let y=top+2;y<bottom-1;y++){total++;hits+=Number(ink(x,y)||ink(x-1,y)||ink(x+1,y));}
    if(total>=2&&hits/total>=.8)jointPixels.push(x);
   }
   const groups=[];for(const x of jointPixels){if(!groups.length||x-groups.at(-1).at(-1)>1)groups.push([x]);else groups.at(-1).push(x);}
   const joints=groups.filter(g=>g.length<=Math.max(5,pitch*.45)).map(g=>(g[0]+g.at(-1))/2);
   if(joints.length<2)continue;
   const spacing=median(joints.slice(1).map((x,j)=>x-joints[j]));if(!(spacing>=pitch*1.3&&spacing<=pitch*12))continue;
   let clear=0,count=0;for(let y=top+2;y<bottom-1;y+=2)for(let x=Math.ceil(left+2);x<right-2;x+=3){count++;clear+=Number(!ink(x,y));}
   if(!count||clear/count<.55)continue;
   courses.push({top,bottom,left,right,pitch,joints,spacing});
  }
  const groups=[];
  for(const c of courses){const group=groups.at(-1),last=group?.at(-1);if(last&&c.top-last.bottom<=3&&Math.max(c.pitch,last.pitch)/Math.min(c.pitch,last.pitch)<1.5&&Math.min(c.right,last.right)-Math.max(c.left,last.left)>Math.min(c.right-c.left,last.right-last.left)*.7)group.push(c);else groups.push([c]);}
  return groups.filter(g=>g.length>=3&&g.slice(1).some((c,i)=>{
   const previous=g[i],moved=c.joints.filter(x=>Math.min(...previous.joints.map(y=>Math.abs(x-y)))>Math.max(2,c.pitch*.25));return moved.length>=c.joints.length*.5;
  })).map(g=>({box:[Math.max(...g.map(c=>c.left)),g[0].top,Math.min(...g.map(c=>c.right))-Math.max(...g.map(c=>c.left)),g.at(-1).bottom-g[0].top],
   method:'visible-courses-and-staggered-interior-joints',courses:g.length,coursePixels:median(g.map(c=>c.pitch)),jointSpacingPixels:median(g.map(c=>c.spacing)),status:'proposed',confirmationRequired:true}));
 }
 function sourceMasks(viewInfo,view,image){
  const masks=[...(viewInfo.envelope.occlusions||[]),...V.legendBoxes(image,R.readings(view))].filter(validBox);
  return masks.filter((box,i)=>!masks.slice(0,i).some(other=>box.every((n,j)=>Math.abs(n-other[j])<1)));
 }
 function wallBox(w,registration,frame){
  const xs=[registration.pixelU(dot(w.from,frame.u)),registration.pixelU(dot(w.to,frame.u))].sort((a,b)=>a-b);
  const top=registration.pixelZ(w.base+w.height),bottom=registration.pixelZ(w.base);
  return [xs[0],top,xs[1]-xs[0],bottom-top];
 }
 function pointAt(w,frame,u){const a=dot(w.from,frame.u),b=dot(w.to,frame.u),t=(u-a)/(b-a);return [w.from[0]+(w.to[0]-w.from[0])*t,w.from[1]+(w.to[1]-w.from[1])*t];}
 function projectedOpeningBoxes(w,level,registration,frame){
  const vector=[(w.to[0]-w.from[0])/w.length,(w.to[1]-w.from[1])/w.length];
  return (level.wallOpenings||[]).filter(o=>o.wallId===w.id&&!M.openingIssues([o],[w]).length).map(o=>{
   const p=o.offset,q=o.offset+o.width,a=[w.from[0]+vector[0]*p,w.from[1]+vector[1]*p],b=[w.from[0]+vector[0]*q,w.from[1]+vector[1]*q],x=[registration.pixelU(dot(a,frame.u)),registration.pixelU(dot(b,frame.u))].sort((a,b)=>a-b),top=registration.pixelZ(w.base+o.sill+o.height),bottom=registration.pixelZ(w.base+o.sill);
   return [x[0]-2,top-2,x[1]-x[0]+4,bottom-top+4];
  });
 }
 function nearerWallBoxes(w,allWalls,registration,frame,{foundationBottom=null}={}){
  return allWalls.filter(other=>other.id!==w.id&&dot(other.normal,frame.n)>.999&&dot(other.from,frame.n)>dot(w.from,frame.n)+.001).map(other=>{
   const box=wallBox(other,registration,frame);
   // A nearer volume reaching this foundation datum hides the foundation behind it.
   // Its own foundation remains an independent source proposal, never a duplicate.
   if(finite(foundationBottom)&&other.base<=w.base+.03)box[3]=Math.max(box[3],foundationBottom-box[1]);
   return box;
  }).filter(validBox);
 }
 function provenance(view,box,registration,method){
  return {kind:'estimated-calibrated',method,sourceCategory:'pdf-source-proposal',sourceViewId:view.id,sourceFrame:copy(view.frame),sourceBox:copy(box),boxFormat:'xywh',
   anchors:[[box[0],box[1]],[box[0]+box[2],box[1]+box[3]]],scalesUsed:{x:registration.sx,y:registration.sz},referenceGuide:copy(registration.guide),status:'proposed',confirmationRequired:true};
 }
 function foundationCandidate(view,viewInfo,registration,w,image){
  const stored=view.payload.foundation;
  if(validBox(stored?.box)&&['pdf-foundation-guides','pdf-pixel-transition'].includes(stored.source))return {...copy(stored),basis:stored.source};
  const guides=view.payload.foundationGuides?.levels,grade=guides?.grade?.line?.y;
  const tops=(guides?.foundations||[]).map(g=>g.line?.y).filter(y=>finite(y)&&finite(grade)&&grade>y+2);
  if(!tops.length)return null;
  const wb=wallBox(w,registration,frames[viewInfo.direction]),top=Math.max(...tops);
  if(grade-top>wb[3]*.5)return null;
  return {box:[wb[0],top,wb[2],grade-top],source:'pdf-foundation-guides',basis:'explicit-foundation-and-finished-grade-guides',multipleLevels:tops.some(y=>top-y>3)};
 }
 function foundationElement(w,view,box,registration,frame,thicknessEvidence,candidate){
  let a=pointAt(w,frame,registration.u(box[0])),b=pointAt(w,frame,registration.u(box[0]+box[2]));
  const d=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...d);if(!(length>.01))return null;
  if((d[1]*w.normal[0]-d[0]*w.normal[1])<0)[a,b]=[b,a];
  const base=registration.z(box[1]+box[3]),height=box[3]*registration.sz;
  return {id:'foundation:'+w.id+':'+view.id+':'+sourceKey(box),type:'foundation',phase:'existing',status:'proposed',levelId:w.levelId,buildingId:w.buildingId,parentWallId:w.id,
   origin:[a[0],a[1],base],size:[length,thicknessEvidence.value,height],rotationDegrees:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI,surfaceOnly:thicknessEvidence.value===null,
   sourceViewId:view.id,sourceFrame:copy(view.frame),sourceBox:copy(box),color:'#b6b8af',quantityStatus:'partial-unreviewed',extentStatus:'visible-above-grade-only',belowGradeDepth:null,confirmationRequired:true,
   provenance:{...provenance(view,box,registration,'registered-visible-foundation-band'),foundationEvidence:copy(candidate),thickness:copy(thicknessEvidence),structuralVerification:false}};
 }
 function masonryZone(w,view,box,registration,frame,hatch,thicknessEvidence,labels){
  const a=pointAt(w,frame,registration.u(box[0])),b=pointAt(w,frame,registration.u(box[0]+box[2])),offsets=[M.distance(w.from,a),M.distance(w.from,b)].sort((a,b)=>a-b);
  const top=Math.max(0,w.base+w.height-registration.z(box[1])),height=Math.min(w.height-top,box[3]*registration.sz),width=Math.min(w.length,offsets[1])-offsets[0];
  if(!(width>.01&&height>.01))return null;
  return {id:'masonry:'+w.id+':'+view.id+':'+sourceKey(box),wallId:w.id,levelId:w.levelId,buildingId:w.buildingId,kind:'masonry',polygon:rect(offsets[0],top,width,height),
   selection:{pattern:'brick',color:'#ad9989'},appearanceStatus:'illustrative-masonry; product-and-colour-unselected',status:'proposed',sourceViewId:view.id,sourceFrame:copy(view.frame),sourceBox:copy(box),thickness:copy(thicknessEvidence),
   quantityStatus:'partial-unreviewed',confirmationRequired:true,provenance:{...provenance(view,box,registration,hatch.method),hatch:copy(hatch),materialLabels:labels.map(row=>({label:row.text,sourceViewId:view.id,sourceBox:copy(row.box),boxFormat:'xyxy'})),extentStatus:'observed-courses-only',unseenArea:null}};
 }
 function generated(level){return level.reconstruction?.status==='automatic-proposal'&&!level.geometryRevision&&!(level.contours||[]).some(c=>c.status==='confirmed')&&!(level.observedPlanes||[]).some(p=>p.status==='confirmed');}
 function physicalDuplicates(result){
  const equal=(a,b)=>a.length===b.length&&a.every((n,i)=>Math.abs(n-b[i])<=.001),bounds=polygon=>[Math.min(...polygon.map(p=>p[0])),Math.min(...polygon.map(p=>p[1])),Math.max(...polygon.map(p=>p[0])),Math.max(...polygon.map(p=>p[1]))];
  const remember=(existing,item)=>{existing.provenance.alternateObservations||=[];existing.provenance.alternateObservations.push(copy(item.provenance));const a=existing.thickness||existing.provenance.thickness,b=item.thickness||item.provenance.thickness;
   if(a&&b&&(a.status==='conflict'||b.status==='conflict'||a.value!==null&&b.value!==null&&Math.abs(a.value-b.value)>.001)){
    const evidence={...copy(a),value:null,status:'conflict',kind:'conflicting-evidence',alternateEvidence:copy(b)};
    if(existing.type==='foundation'){existing.provenance.thickness=evidence;existing.size[1]=null;existing.surfaceOnly=true;result.issues.push('FOUNDATION_THICKNESS_CONFLICT');}else{existing.thickness=evidence;result.issues.push('MASONRY_THICKNESS_CONFLICT');}
   }
  };
  const zones=[];
  for(const zone of result.wallZones){const duplicate=zones.find(z=>z.wallId===zone.wallId&&equal(z.polygon.flat(),zone.polygon.flat()));if(duplicate)remember(duplicate,zone);else zones.push(zone);}
  // Different views of one wall must not silently paint contradictory overlapping extents.
  const conflicting=new Set();result.conflicts||=[];
  for(let i=0;i<zones.length;i++)for(let j=i+1;j<zones.length;j++){
   const a=zones[i],b=zones[j];if(a.wallId!==b.wallId||a.sourceViewId===b.sourceViewId)continue;
   const x=bounds(a.polygon),y=bounds(b.polygon),overlap=Math.max(0,Math.min(x[2],y[2])-Math.max(x[0],y[0]))*Math.max(0,Math.min(x[3],y[3])-Math.max(x[1],y[1]));
   if(overlap>.001){conflicting.add(a);conflicting.add(b);result.conflicts.push({type:'masonry',reason:'MASONRY_MULTIVIEW_EXTENT_CONFLICT',candidates:[copy(a),copy(b)]});}
  }
  result.wallZones=zones.filter(z=>!conflicting.has(z));if(conflicting.size)result.issues.push('MASONRY_MULTIVIEW_EXTENT_CONFLICT');
  const elements=[];
  for(const element of result.exteriorElements){const duplicate=elements.find(e=>e.type===element.type&&e.parentWallId===element.parentWallId&&equal(e.origin,element.origin)&&equal([e.size[0],e.size[2]],[element.size[0],element.size[2]])&&Math.abs(e.rotationDegrees-element.rotationDegrees)<.001);if(duplicate)remember(duplicate,element);else elements.push(element);}
  const conflicts=new Set();
  for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){
   const a=elements[i],b=elements[j];if(a.type!=='foundation'||b.type!=='foundation'||a.parentWallId!==b.parentWallId||a.sourceViewId===b.sourceViewId||Math.abs(a.rotationDegrees-b.rotationDegrees)>.001)continue;
   const angle=a.rotationDegrees*Math.PI/180,u=[Math.cos(angle),Math.sin(angle)],x=[dot(a.origin,u),a.origin[2],a.size[0],a.size[2]],y=[dot(b.origin,u),b.origin[2],b.size[0],b.size[2]];
   if(intersection(x,y)){conflicts.add(a);conflicts.add(b);result.conflicts.push({type:'foundation',reason:'FOUNDATION_MULTIVIEW_EXTENT_CONFLICT',candidates:[copy(a),copy(b)]});}
  }
  result.exteriorElements=elements.filter(e=>!conflicts.has(e));if(conflicts.size)result.issues.push('FOUNDATION_MULTIVIEW_EXTENT_CONFLICT');
 }
 // Retained low-level candidate helpers. A candidate alone never enters the
 // client model; entranceDetails additionally checks complete source profiles.
 // Detect a beam face only when two independent horizontal ink edges are
 // visible above the same two source-supported posts. A line weight is NOT
 // a physical section; the depth remains unknown until separately reviewed.
 function entryBeamFace(image,canopy,masks=[]){
  const guide=canopy?.beamLine;if(!image?.data||!validBox(guide)||canopy.columns?.length!==2||canopy.columns.some(c=>!(c.width>0)))return {status:'unresolved',reason:'ENTRY_BEAM_SECTION_UNRESOLVED'};
  const ink=V.structuralInk(image),w=image.width,h=image.height,[x,y,width,weight]=guide,first=Math.max(1,Math.round(x+width*.08)),last=Math.min(w-2,Math.round(x+width*.92)),n=Math.max(1,Math.ceil((last-first)/160));
  const row=at=>{let hits=0,total=0;for(let px=first;px<=last;px+=n){total++;let found=false;for(let delta=-1;delta<=1;delta++){const py=Math.round(at+delta);if(py>=0&&py<h&&ink[py*w+px])found=true;}hits+=Number(found);}return hits/(total||1);};
  const top=Math.round(y+weight*.5);if(row(top)<.73)return {status:'unresolved',reason:'ENTRY_BEAM_TOP_EDGE_UNRESOLVED'};
  const minGap=Math.max(6,Math.ceil(weight+3)),maxGap=Math.min(52,Math.floor(canopy.box[3]*.11));let bottom=null;
  for(let py=top+minGap;py<=top+maxGap&&py<h;py++){const test=[x,y,width,py-y];if(masks.some(mask=>intersection(test,mask)))continue;if(row(py)>.73){bottom=py;break;}}
  if(bottom===null)return {status:'unresolved',reason:'ENTRY_BEAM_SECTION_UNRESOLVED'};
  return {status:'proposed',box:[x,y,width,bottom-y],anchors:[[x,y],[x+width,bottom]],method:'two-supported-horizontal-beam-edges-between-posts',confirmationRequired:true};
 }
 // A secondary roof is proposed only when a continuous roof line is visible
 // in a second orthographic view; porch/beam edges alone are insufficient.
 function entryRoofStroke(image,xFront,xBack,yFront,masks=[]){
  if(!image?.data||![xFront,xBack,yFront].every(finite)||Math.abs(xBack-xFront)<20)return {status:'unresolved',reason:'ENTRY_ROOF_SIDE_PROFILE_UNRESOLVED'};
  const ink=V.structuralInk(image),w=image.width,h=image.height,span=Math.abs(xBack-xFront),count=Math.max(18,Math.ceil(span/3)),rise=Math.min(72,Math.floor(span*.75));let best=null;
  for(let offset=-4;offset<=4;offset+=2)for(let delta=-rise;delta<=rise;delta+=2){let hits=0,first=0,last=0,blocked=0;
   for(let i=0;i<=count;i++){const t=i/count,x=Math.round(xFront+(xBack-xFront)*t),y=Math.round(yFront+offset+delta*t);if(x<1||x>=w-1||y<2||y>=h-2){blocked++;continue;}if(masks.some(b=>validBox(b)&&x>=b[0]-2&&x<=b[0]+b[2]+2&&y>=b[1]-2&&y<=b[1]+b[3]+2)){blocked++;continue;}let found=false;for(let dy=-2;dy<=2&&!found;dy++)for(let dx=-1;dx<=1;dx++)if(ink[(y+dy)*w+x+dx]){found=true;break;}hits+=Number(found);if(i<count*.18)first+=Number(found);if(i>count*.82)last+=Number(found);
   }
   const score=hits/(count+1);if(blocked||score<.77||first/Math.max(1,Math.ceil(count*.18))<.64||last/Math.max(1,Math.ceil(count*.18))<.64)continue;
   const rank=score-Math.abs(offset)*.002-Math.abs(delta)*.00005;if(!best||rank>best.rank)best={status:'proposed',anchors:[[xFront,yFront+offset],[xBack,yFront+offset+delta]],support:score,rank,method:'continuous-side-roof-stroke-with-front-height-cross-check',confirmationRequired:true};
  }
  return best||{status:'unresolved',reason:'ENTRY_ROOF_SIDE_PROFILE_UNRESOLVED'};
 }
 function entranceDetails({proposal,inventory,images,front,source,fr,canopy,sideCandidates,columns,owners,byLevel,hints,frontMasks}){
  const report=byLevel.find(r=>r.levelId===columns[0]?.levelId);
  if(!report||!columns.length||columns.some(column=>column.parentWallId!==columns[0].parentWallId)){
   for(const item of byLevel)item.issues.push('ENTRY_ASSEMBLY_SUPPORT_UNRESOLVED');return;
  }
  // A source annotation can hide one post without hiding the roof above it.
  // Keep that support unresolved while retaining independently observed roof
  // profiles; never complete the missing post by symmetry or by its neighbour.
  if(columns.length<2)report.issues.push('ENTRY_ASSEMBLY_SUPPORT_PARTIAL');
  const wall=owners.find(o=>o.wall.id===columns[0].parentWallId).wall,wallY=wall.from[1],levelId=columns[0].levelId;
  const blockers=(xs,ys,zs)=>owners.filter(({wall:other})=>other.id!==wall.id&&other.from[1]<ys[1]-.001&&
   Math.min(xs[1],Math.max(other.from[0],other.to[0]))-Math.max(xs[0],Math.min(other.from[0],other.to[0]))>.001&&
   Math.min(zs[1],other.base+other.height)-Math.max(zs[0],other.base)>.001).map(o=>o.wall.id);
  const id='entry:'+wall.id+':'+source.id+':'+sourceKey(canopy.beamLine),assembly={version:1,id,frontViewId:source.id,sideViewIds:sideCandidates.map(s=>s.source.id),parentWallId:wall.id,supportStatus:columns.length===2?'observed-proposed':'partial-unresolved'};
  const sourceFor=(s,box,method)=>provenance(s.source,box,s.registration,method),frontSpan=[canopy.columns[0].x,canopy.columns[1].x+canopy.columns[1].width];
  const frontBands=V.entryBands(images[front.viewId],{left:frontSpan[0],right:frontSpan[1],nearY:canopy.box[1],height:canopy.box[3],occlusions:frontMasks});
  const sides=sideCandidates.map(side=>{
   const sign=frames[side.direction].u[1],wallX=side.registration.pixelU(sign*wallY),postX=side.direction==='right'?side.box[0]:side.box[0]+side.box[2];
   const bands=V.entryBands(images[side.source.id],{left:Math.min(postX,wallX),right:Math.max(postX,wallX),nearY:side.box[1],height:side.box[3],occlusions:side.masks});
   return {...side,sign,wallX,bands};
  });
  const beamLabel=hints.some(row=>/\b(?:poutres?|beams?)\b/.test(normal(row.text))),matches=[];
  if(beamLabel)for(const band of frontBands){
   const top=fr.z(band.box[1]),base=fr.z(band.box[1]+band.box[3]),tolerance=Math.max(.035,fr.sz*2),matched=[];let conflict=false;
   for(const side of sides){
    const compatible=side.bands.filter(b=>Math.abs(side.registration.z(b.box[1])-top)<=Math.max(tolerance,side.registration.sz*2)&&Math.abs(side.registration.z(b.box[1]+b.box[3])-base)<=Math.max(tolerance,side.registration.sz*2));
    if(!compatible.length){if(side.bands.length)conflict=true;continue;}
    const chosen=compatible[0],ys=[side.registration.u(chosen.box[0])*side.sign,side.registration.u(chosen.box[0]+chosen.box[2])*side.sign].sort((a,b)=>a-b);
    if(Math.abs(ys[1]-wallY)>.05||ys[0]>=wallY-.05){conflict=true;continue;}
    matched.push({...side,band:chosen,ys});
   }
   if(matched.length&&!conflict)matches.push({band,top,base,sides:matched});
  }
  const beam=matches[0];
  if(beam){
   const xs=[fr.u(beam.band.box[0]),fr.u(beam.band.box[0]+beam.band.box[2])],position=beam.sides[0].ys[0],tolerance=Math.max(.035,...beam.sides.map(s=>s.registration.sx*2));
   const hiddenBy=blockers(xs,[position,wallY],[beam.base,beam.top]);
   if(hiddenBy.length){report.issues.push('ENTRY_BEAM_HIDDEN_BY_NEARER_VOLUME');report.conflicts||=[];report.conflicts.push({type:'beam',reason:'ENTRY_BEAM_HIDDEN_BY_NEARER_VOLUME',entryAssemblyId:id,occludingWallIds:hiddenBy});}
   else if(beam.sides.some(s=>Math.abs(s.ys[0]-position)>tolerance))report.issues.push('ENTRY_BEAM_DEPTH_CONFLICT');
   else {
    const frontEvidence=provenance(source,beam.band.box,fr,beam.band.method),observations=[frontEvidence,...beam.sides.map(s=>sourceFor(s,s.band.box,s.band.method))];
    const element=(part,origin,width,rotation,primary,box)=>({id:id+':beam:'+part,type:'beam',phase:'existing',status:'proposed',levelId,buildingId:proposal.buildingId,parentWallId:wall.id,entryAssembly:{...copy(assembly),part},
     origin,size:[width,null,beam.top-beam.base],rotationDegrees:rotation,surfaceOnly:true,sourceViewId:primary.id,sourceFrame:copy(primary.frame),sourceBox:copy(box),color:'#a6aca3',supportMaterial:'unknown',quantityStatus:'partial-unknown-section',confirmationRequired:true,
     provenance:{...provenance(primary,box,primary.id===source.id?fr:beam.sides.find(s=>s.source.id===primary.id).registration,'two-view-observed-beam-face'),sources:copy(observations),sourceViewIds:observations.map(s=>s.sourceViewId),sectionDepth:{value:null,kind:'unknown',status:'unresolved'},extentStatus:'visible-faces-only',structuralVerification:false,sectionStatus:'unknown',supportLabels:hints.map(row=>({label:row.text,sourceViewId:source.id,sourceBox:copy(row.box)}))}});
    // The lateral band is the visible return, never the section of the front
    // beam. Only observed faces are generated; the hidden section stays null.
    const created=[element('front',[xs[0],position,beam.base],xs[1]-xs[0],0,source,beam.band.box)];
    for(const side of beam.sides){const right=side.direction==='right';created.push(element(side.direction,[right?xs[1]:xs[0],right?side.ys[0]:wallY,beam.base],wallY-side.ys[0],right?90:-90,side.source,side.band.box));}
    report.exteriorElements.push(...created);report.issues.push('ENTRY_BEAM_SECTION_DEPTH_UNRESOLVED');
    for(const column of columns){const height=beam.base-column.origin[2],oldTop=column.origin[2]+column.size[2];if(height>0&&oldTop>=beam.base-tolerance&&oldTop<=beam.top+tolerance){column.size[2]=height;column.sourceBox[1]=fr.pixelZ(beam.base);column.sourceBox[3]=fr.pixelZ(column.origin[2])-column.sourceBox[1];column.provenance={...column.provenance,...provenance(source,column.sourceBox,fr,'two-view-column-edges-and-observed-beam-underside'),topEvidence:copy(frontEvidence)};}}
   }
  }else report.issues.push(frontBands.length&&sides.some(s=>s.bands.length)?'ENTRY_BEAM_LEVEL_CONFLICT':'ENTRY_BEAM_SECTION_UNRESOLVED');

  // The canopy has its own observed eaves, independent of the post footprint.
  const [bx,by,bw]=canopy.beamLine,profile=V.roofProfile(images[front.viewId],{...front.envelope,box:[bx,by,bw,canopy.box[3]],occlusions:frontMasks},R.readings(source),{entry:true});
  if(profile.status!=='proposed'){report.issues.push('ENTRY_ROOF_GEOMETRY_UNRESOLVED');return;}
  const [a,b]=profile.slopes,frontPoints=[[a.eaveX,a.eaveY],[a.highX,profile.points[1][1]],[b.highX,profile.points[2][1]],[b.eaveX,b.eaveY]].filter((p,i,points)=>!i||p[0]-points[i-1][0]>.5);
  if(frontPoints.length<3||frontPoints.some((p,i)=>!p.every(finite)||i&&p[0]<=frontPoints[i-1][0])){report.issues.push('ENTRY_ROOF_GEOMETRY_UNRESOLVED');return;}
  const bounds=[Math.min(...frontPoints.map(p=>p[0])),Math.min(...frontPoints.map(p=>p[1])),Math.max(...frontPoints.map(p=>p[0]))-Math.min(...frontPoints.map(p=>p[0])),Math.max(...frontPoints.map(p=>p[1]))-Math.min(...frontPoints.map(p=>p[1]))];
  if(frontMasks.some(mask=>intersection(bounds,mask))){report.issues.push('ENTRY_ROOF_SOURCE_OCCLUDED');return;}
  const xProfile=frontPoints.map(([x,y])=>[fr.u(x),fr.z(y)]),eaveZ=xProfile[0][1],crestZ=Math.max(...xProfile.map(p=>p[1])),tol=Math.max(.04,fr.sz*3);
  if(Math.abs(xProfile.at(-1)[1]-eaveZ)>tol||crestZ-eaveZ<.08||xProfile[0][0]>fr.u(frontSpan[0])||xProfile.at(-1)[0]<fr.u(frontSpan[1])){report.issues.push('ENTRY_ROOF_FRONT_PROFILE_CONFLICT');return;}
  const profiles=[];
  for(const side of sides){
   const raw=V.entrySideRoof(images[side.source.id],{wallX:side.wallX,postBox:side.box,eaveY:side.registration.pixelZ(eaveZ),crestY:side.registration.pixelZ(crestZ),direction:side.direction,tolerance:Math.max(5,tol/side.registration.sz),occlusions:side.masks});
   if(raw.status!=='proposed'){report.issues.push(raw.reason);continue;}
   const points=raw.points.map(([x,y])=>[side.sign*side.registration.u(x),side.registration.z(y)]).sort((a,b)=>a[0]-b[0]),tolerance=Math.max(tol,side.registration.sz*3);
   if(Math.abs(points[0][1]-eaveZ)>tolerance||Math.abs(points.at(-1)[1]-crestZ)>tolerance||Math.abs(points.at(-1)[0]-wallY)>.04){report.issues.push('ENTRY_ROOF_HEIGHT_CONFLICT');continue;}
   profiles.push({side,raw,points,residual:Math.max(Math.abs(points[0][1]-eaveZ),Math.abs(points.at(-1)[1]-crestZ))});
  }
  // If a second observed side cannot support the same assembly, do not hide
  // that discrepancy by silently choosing the first one.
  if(!profiles.length||profiles.length!==sides.length){report.issues.push('ENTRY_ROOF_GEOMETRY_UNRESOLVED');return;}
  const chosen=profiles[0];
  if(profiles.some(p=>Math.abs(p.points[0][0]-chosen.points[0][0])>Math.max(.05,p.side.registration.sx*3)||Math.abs(p.points[0][1]-chosen.points[0][1])>tol)){report.issues.push('ENTRY_ROOF_DEPTH_CONFLICT');return;}
  const hiddenBy=blockers([xProfile[0][0],xProfile.at(-1)[0]],[chosen.points[0][0],wallY],[eaveZ,crestZ]);
  if(hiddenBy.length){report.issues.push('ENTRY_ROOF_HIDDEN_BY_NEARER_VOLUME');report.conflicts||=[];report.conflicts.push({type:'roof',reason:'ENTRY_ROOF_HIDDEN_BY_NEARER_VOLUME',entryAssemblyId:id,occludingWallIds:hiddenBy});return;}
  const sourceRecord=(view,anchors,registration,axis)=>({axis,sourceViewId:view.id,sourceFrame:copy(view.frame),anchors:copy(anchors),scaleX:registration.sx,scaleY:registration.sz,kind:'estimated-calibrated',status:'proposed',referenceGuide:copy(registration.guide)});
  report.reconstructedRoofs.push({version:1,id:id+':roof',levelId,buildingId:proposal.buildingId,status:'proposed',kind:'estimated-calibrated',sourceCategory:'pdf-entry-assembly',entryAssembly:copy(assembly),
   profiles:{x:xProfile,y:chosen.points},sources:[sourceRecord(source,frontPoints,fr,'x'),...profiles.map(p=>sourceRecord(p.side.source,p.raw.points,p.side.registration,'y'))],
   connection:{kind:'observed-entry-roof-at-wall',parentWallId:wall.id,wallY,orthogonalHeightResiduals:profiles.map(p=>({sourceViewId:p.side.source.id,residual:p.residual})),frontAndSidePitches:'independent-source-profiles'},
   complete:false,confirmationRequired:true,quantityStatus:'partial-unreviewed',thickness:null,soffitStatus:'unresolved',note:'Observed entrance roof surface; hidden section, underside and structural assembly remain unknown.'});
  report.issues.push('ENTRY_ROOF_UNDERSIDE_UNRESOLVED');
 }
 function canopyColumns(proposal,inventory,images,reviewed,targets,byLevel){
  const views=(proposal.views||[]).filter(info=>info.envelope?.status==='proposed'&&inventory.views.some(v=>v.id===info.viewId&&v.buildingId===proposal.buildingId&&v.kind==='elevation'&&v.direction===info.direction)&&images?.[info.viewId]?.data),front=views.find(v=>v.direction==='front');
  if(!front)return;
  const source=inventory.views.find(v=>v.id===front.viewId),hints=R.readings(source).filter(row=>(row.source==='pdf-text'||row.confidence>=40)&&/\b(?:colonnes?|poteaux?|posts?|columns?|poutres?|beams?)\b/.test(normal(row.text))&&!/\b(?:sans|aucun[e]?|no|without)\s+(?:de\s+)?(?:colonnes?|poteaux?|posts?|columns?|poutres?|beams?)\b/.test(normal(row.text)));
  if(!hints.length)return;
  const fr=R.elevationRegistration(front,reviewed,inventory);
  if(!fr||![fr.sx,fr.sz].every(n=>finite(n)&&n>0))return;
  const canopy=V.canopyEnvelope(images[front.viewId],front.envelope,fr.guide.y);
  if(canopy.status!=='proposed')return;
  const frontMasks=sourceMasks(front,source,images[front.viewId]);
  const owners=targets.flatMap(level=>M.wallsFor(level,inventory,{includeProposed:true}).filter(w=>w.normal[1]<-.999).map(wall=>({level,wall}))),ownerFor=(column,depth=null)=>{
   const center=fr.u(column.x+column.width/2),base=fr.z(column.bottom),top=fr.z(canopy.box[1]);
   // A post can start on an observed raised landing. Its base remains the
   // elevation reading; ownership only requires the whole vertical span to
   // belong to the parent wall, rather than snapping it to the foundation.
   return owners.filter(o=>{const tolerance=Math.max(.08,o.wall.height*.05);return center>=Math.min(o.wall.from[0],o.wall.to[0])&&center<=Math.max(o.wall.from[0],o.wall.to[0])&&base>=o.wall.base-tolerance&&top<=o.wall.base+o.wall.height+tolerance&&top>base&&(!depth||o.wall.from[1]>=depth[1]-.001);}).sort((a,b)=>a.wall.from[1]-b.wall.from[1])[0];
  };
  const possibleOwner=canopy.columns.map(column=>ownerFor(column)).find(Boolean);if(!possibleOwner)return;
  const report=byLevel.find(r=>r.levelId===possibleOwner.level.id),sideCandidates=[],sideConflicts=[];
  const visibleFrontPosts=canopy.columns.filter(column=>{const box=[column.x,canopy.box[1],column.width,column.bottom-canopy.box[1]];return validBox(box)&&!frontMasks.some(mask=>intersection(box,mask));});
  if(!visibleFrontPosts.length){report.issues.push('COLUMN_DEPTH_UNRESOLVED');return;}
  // Both side views may support a depth. A disagreement is kept unresolved.
  for(const side of views.filter(v=>['left','right'].includes(v.direction))){
   const sr=R.elevationRegistration(side,reviewed,inventory);if(!sr||![sr.sx,sr.sz].every(n=>finite(n)&&n>0))continue;
   const targetY=sr.pixelZ(fr.z(canopy.box[1])),sidePost=V.canopySide(images[side.viewId],side.envelope,targetY,{direction:side.direction});
   if(sidePost.status!=='proposed')continue;
   const sideSource=inventory.views.find(v=>v.id===side.viewId),masks=sourceMasks(side,sideSource,images[side.viewId]);
   if(masks.some(mask=>intersection(sidePost.box,mask))){report.issues.push('COLUMN_SOURCE_OCCLUDED');continue;}
   const sign=frames[side.direction].u[1],ys=[sr.u(sidePost.box[0])*sign,sr.u(sidePost.box[0]+sidePost.box[2])*sign].sort((a,b)=>a-b),base=sr.z(sidePost.box[1]+sidePost.box[3]),top=sr.z(sidePost.box[1]);
   const frontTop=fr.z(canopy.box[1]);
   // A truncated post ends at the annotation, not at the entrance landing.
   // Compare the side against independently visible front feet only.
   const consistent=visibleFrontPosts.some(column=>{const frontBase=fr.z(column.bottom),tolerance=Math.max(.05,(frontTop-frontBase)*.04);return Math.abs(base-frontBase)<=tolerance&&Math.abs(top-frontTop)<=tolerance;});
   if(!consistent){
    report.issues.push('COLUMN_LEVEL_CONFLICT');
    sideConflicts.push({type:'column',reason:'COLUMN_LEVEL_CONFLICT',status:'conflict',sourceViewId:sideSource.id,sourceFrame:copy(sideSource.frame),sourceBox:copy(sidePost.box),
     observation:{base,top,provenance:provenance(sideSource,sidePost.box,sr,sidePost.method)},
     frontObservations:visibleFrontPosts.map(column=>({base:fr.z(column.bottom),top:frontTop,provenance:provenance(source,[column.x,canopy.box[1],column.width,column.bottom-canopy.box[1]],fr,'visible-front-post-edges')}))});
    continue;
   }
   sideCandidates.push({source:sideSource,box:sidePost.box,registration:sr,ys,base,top,method:sidePost.method,direction:side.direction,masks});
  }
  // A missing or masked view supplies no contradictory measurement. An
  // observed conflicting side does: retain it and stop the dependent
  // assembly instead of silently taking the other side's depth/level.
  if(sideConflicts.length){report.conflicts||=[];report.conflicts.push(...sideConflicts);return;}
  if(!sideCandidates.length){report.issues.push('COLUMN_DEPTH_UNRESOLVED');return;}
  const side=sideCandidates[0];
  if(sideCandidates.some(other=>Math.abs(other.ys[0]-side.ys[0])>.05||Math.abs(other.ys[1]-side.ys[1])>.05)){report.issues.push('COLUMN_DEPTH_CONFLICT');return;}
  const accepted=[];
  for(const column of canopy.columns){
   if(!(column.width>0)){report.issues.push('COLUMN_SECTION_UNRESOLVED');continue;}
   const owner=ownerFor(column,side.ys);if(!owner){report.issues.push('COLUMN_OWNER_DEPTH_CONFLICT');continue;}
   const result=byLevel.find(r=>r.levelId===owner.level.id),box=[column.x,canopy.box[1],column.width,column.bottom-canopy.box[1]];
   if(!validBox(box)||frontMasks.some(mask=>intersection(box,mask))){result.issues.push('COLUMN_SOURCE_OCCLUDED');continue;}
   const element={id:'column:'+owner.wall.id+':'+source.id+':'+sourceKey(box),type:'column',phase:'existing',status:'proposed',levelId:owner.level.id,buildingId:proposal.buildingId,parentWallId:owner.wall.id,
    origin:[fr.u(column.x),side.ys[0],fr.z(column.bottom)],size:[column.width*fr.sx,side.ys[1]-side.ys[0],box[3]*fr.sz],rotationDegrees:0,sourceViewId:source.id,sourceFrame:copy(source.frame),sourceBox:box,
    color:'#a6aca3',supportMaterial:'unknown',quantityStatus:'partial-unreviewed',confirmationRequired:true,
    provenance:{...provenance(source,box,fr,'two-view-column-edges-and-compatible-levels'),depth:{value:side.ys[1]-side.ys[0],unit:'m',kind:'estimated-calibrated',status:'proposed',...provenance(side.source,side.box,side.registration,side.method)},
     alternateDepthObservations:sideCandidates.slice(1).map(c=>provenance(c.source,c.box,c.registration,c.method)),sourceViewIds:[source.id,...sideCandidates.map(c=>c.source.id)],
     supportLabels:hints.map(row=>({label:row.text,sourceViewId:source.id,sourceBox:copy(row.box)})),structuralVerification:false}};
   if(!element.size.every(n=>finite(n)&&n>0)||!element.origin.every(finite))continue;
   // A front projection cannot establish a visible post behind a nearer opaque
   // volume. Test the complete section, including partial overlap at its edge,
   // after its side-view depth is known and before attaching it to a wall.
   const blockers=owners.filter(({wall})=>wall.from[1]<side.ys[1]-.001&&
    Math.min(element.origin[0]+element.size[0],Math.max(wall.from[0],wall.to[0]))-Math.max(element.origin[0],Math.min(wall.from[0],wall.to[0]))>.001&&
    Math.min(element.origin[2]+element.size[2],wall.base+wall.height)-Math.max(element.origin[2],wall.base)>.001);
   if(blockers.length){
    const reason=blockers.some(o=>o.wall.from[1]<side.ys[0]+.001)?'COLUMN_HIDDEN_BY_NEARER_VOLUME':'COLUMN_WALL_INTERSECTION';
    result.issues.push(reason);result.conflicts||=[];result.conflicts.push({type:'column',reason,candidates:[copy(element)],occludingWallIds:blockers.map(o=>o.wall.id)});continue;
   }
   result.exteriorElements.push(element);accepted.push(element);
  }
  entranceDetails({proposal,inventory,images,front,source,fr,canopy,sideCandidates,columns:accepted,owners,byLevel,hints,frontMasks});
  report.issues.push('BALCONY_SLAB_EXTENT_UNRESOLVED');
 }
 function build(proposal,inventory,images,reviewed,generatedLevels=[]){
  const byLevel=[],issues=[];
  const targets=generatedLevels.filter(l=>l.buildingId===proposal.buildingId&&generated(l));
  const allWalls=targets.flatMap(l=>M.wallsFor(l,inventory,{includeProposed:true}));
  for(const level of targets){
   const result={levelId:level.id,exteriorElements:[],reconstructedRoofs:[],wallZones:[],issues:[]};byLevel.push(result);
   const walls=M.wallsFor(level,inventory,{includeProposed:true});
   for(const info of proposal.views||[]){
    const view=inventory.views.find(v=>v.id===info.viewId),frame=frames[info.direction],image=images?.[info.viewId];
    if(!view||view.kind!=='elevation'||view.buildingId!==proposal.buildingId||view.direction!==info.direction||!frame||!image?.data||info.envelope?.status!=='proposed')continue;
    const registration=R.elevationRegistration(info,reviewed,inventory);
    if(!registration||![registration.sx,registration.sz].every(n=>finite(n)&&n>0)){result.issues.push('EXTERIOR_REGISTRATION_UNRESOLVED');continue;}
    const masks=sourceMasks(info,view,image),labels=materialLabels(view);
    for(const wall of walls.filter(w=>dot(w.normal,frame.n)>.999)){
     const wb=wallBox(wall,registration,frame);if(!validBox(wb))continue;
     const openings=projectedOpeningBoxes(wall,level,registration,frame),nearer=nearerWallBoxes(wall,allWalls,registration,frame),blocked=[...masks,...openings,...nearer];
     const intersected=masks.some(mask=>intersection(wb,mask));
     if(intersected)result.issues.push('EXTERIOR_SOURCE_OCCLUDED');
     if(nearer.some(mask=>intersection(wb,mask)))result.issues.push('EXTERIOR_HIDDEN_BY_NEARER_VOLUME');
     const observed=[];
     if(labels.length){
      const thick=thickness(view,'masonry',true);
      if(thick.status==='conflict')result.issues.push('MASONRY_THICKNESS_CONFLICT');
      for(const part of subtractBoxes(wb,blocked))for(const hatch of masonryHatches(image,part)){
       const box=intersection(hatch.box,wb);if(!box)continue;
       const zone=masonryZone(wall,view,box,registration,frame,hatch,thick,labels);if(zone)observed.push(zone);
      }
      if(!observed.length)result.issues.push('MASONRY_EXTENT_UNRESOLVED');
     }
     result.wallZones.push(...observed);
     const foundation=foundationCandidate(view,info,registration,wall,image);
     if(!foundation){if(wall.base===Math.min(...walls.filter(w=>dot(w.normal,frame.n)>.999).map(w=>w.base)))result.issues.push('FOUNDATION_VISIBLE_BAND_UNRESOLVED');continue;}
     const expected=registration.pixelZ(wall.base),difference=Math.abs(foundation.box[1]-expected);
     if(difference>Math.max(4,wb[3]*.06))continue; // A foundation belongs to the wall that reaches its top datum.
     const withinWall=intersection(foundation.box,[wb[0],foundation.box[1],wb[2],foundation.box[3]]),crop=withinWall&&intersection(withinWall,[0,0,image.width,image.height]);if(!crop)continue;
     const thick=thickness(view,'foundation',observed.length>0);
     if(thick.status==='conflict')result.issues.push('FOUNDATION_THICKNESS_CONFLICT');
     if(thick.conditionStatus==='unverified')result.issues.push('FOUNDATION_MASONRY_CONDITION_UNVERIFIED');
     if(masks.some(mask=>intersection(crop,mask)))result.issues.push('FOUNDATION_SOURCE_OCCLUDED');
     const foundationBlocked=[...masks,...openings,...nearerWallBoxes(wall,allWalls,registration,frame,{foundationBottom:crop[1]+crop[3]})];
     for(const part of subtractBoxes(crop,foundationBlocked)){
      const element=foundationElement(wall,view,part,registration,frame,thick,foundation);if(element)result.exteriorElements.push(element);
     }
    }
   }
  }
  canopyColumns(proposal,inventory,images,reviewed,targets,byLevel);
  const flat=FlatRoofs?.build(proposal,inventory,images,reviewed,targets);
  for(const detail of flat?.byLevel||[]){const target=byLevel.find(l=>l.levelId===detail.levelId);if(!target)throw Error('FLAT_ENTRY_LEVEL_MISMATCH');target.reconstructedRoofs.push(...detail.reconstructedRoofs);target.exteriorElements.push(...detail.exteriorElements);target.issues.push(...detail.issues);}
  issues.push(...(flat?.issues||[]));
  for(const result of byLevel){physicalDuplicates(result);result.roofProposals=result.reconstructedRoofs;result.issues=[...new Set(result.issues)];issues.push(...result.issues);}
  return {version:1,byLevel,issues:[...new Set(issues)],complete:false,status:byLevel.some(l=>l.exteriorElements.length||l.wallZones.length||l.reconstructedRoofs.length)?'partial-proposal':'unresolved'};
 }
 return Object.freeze({version:1,build,entryBeamFace,entryRoofStroke,subtractBoxes,masonryHatches,materialLabels,writtenThickness,thickness});
});
