/* A flat entrance roof needs a labelled, closed plan footprint and compatible
 * front/side observations. A fascia is not a structural section. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-reconstruction.js'):root.MIRPlanReconstruction,node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision);
 if(node)module.exports=api;else root.MIRReconstructedFlatRoofs=api;
})(typeof window==='object'?window:globalThis,function(M,R,V){
 'use strict';
 const copy=M.clone,finite=Number.isFinite,normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const rectangle=([x,y,w,h])=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
 const bounds=points=>{const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];};
 const intersects=(a,b)=>Math.min(a[0]+a[2],b[0]+b[2])>Math.max(a[0],b[0])&&Math.min(a[1]+a[3],b[1]+b[3])>Math.max(a[1],b[1]);
 const generated=l=>l.reconstruction?.status==='automatic-proposal'&&!l.geometryRevision&&!(l.contours||[]).some(c=>c.status==='confirmed')&&!(l.observedPlanes||[]).some(p=>p.status==='confirmed');
 const usableRow=r=>r?.box?.length===4&&r.box.every(finite)&&r.box[2]>r.box[0]&&r.box[3]>r.box[1]&&(r.source==='pdf-text'||r.confidence>=40);
 const flatLabel=r=>usableRow(r)&&/\b(?:toit(?:ure)?\s+plat(?:e)?|flat\s+roof)\b/.test(normal(r.text))&&!/\b(?:sans|aucun|no|without)\b/.test(normal(r.text));
 function sourceTransform(reviewed){
  const scale=M.scale(reviewed),a=reviewed.alignment;
  if(!scale||!a?.origin?.every(finite)||!a.offset?.every(finite)||!finite(a.rotationDegrees))return null;
  const r=a.rotationDegrees*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return {scale,point:([px,py])=>{const x=(px-a.origin[0])*scale,y=-(py-a.origin[1])*scale;return [x*c-y*s+a.offset[0],x*s+y*c+a.offset[1]];}};
 }
 // Neutral gray infill is not boundary ink. This darker mask retains black
 // outlines seen through a translucent colour annotation without using that
 // annotation's perimeter or area as a roof boundary.
 function raster(image,masks=[],{thin=false}={}){
  const {width:w,height:h,data}=image,ink=new Uint8Array(w*h);
  for(let i=0;i<ink.length;i++){const p=i*4,r=data[p],g=data[p+1],b=data[p+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);ink[i]=Number(data[p+3]>150&&(thin?hi<215&&(hi-lo<45||lo<80&&hi-lo<185):hi<140&&(hi-lo<45||lo<65&&hi-lo<130)));}
  for(const [x,y,bw,bh]of masks)for(let yy=Math.max(0,Math.floor(y));yy<Math.min(h,y+bh);yy++)for(let xx=Math.max(0,Math.floor(x));xx<Math.min(w,x+bw);xx++)ink[yy*w+xx]=0;
  const hit=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&!!ink[Math.round(y)*w+Math.round(x)];
  const support=(a,b,pad=0)=>{const count=Math.max(1,Math.ceil(M.distance(a,b)));let n=0,gap=0,maxGap=0;
   for(let i=0;i<=count;i++){const x=a[0]+(b[0]-a[0])*i/count,y=a[1]+(b[1]-a[1])*i/count;let found=false;
    for(let dy=-pad;dy<=pad&&!found;dy++)for(let dx=-pad;dx<=pad&&!found;dx++)found=hit(x+dx,y+dy);
    if(found){n++;gap=0;}else maxGap=Math.max(maxGap,++gap);
   }return {ratio:n/(count+1),maxGap};
  };
  return {w,h,ink,hit,support};
 }
 function horizontalRuns(r,region,minWidth,maxGap=2){
  const [bx,by,bw,bh]=region,groups=[];
  for(let y=Math.max(0,Math.floor(by));y<=Math.min(r.h-1,Math.ceil(by+bh));y++){
   const runs=[];let start=null,last=null,hits=0;
   const finish=()=>{if(start!==null&&last-start>=minWidth&&hits/(last-start+1)>=.8)runs.push({left:start,right:last,top:y,bottom:y});};
   for(let x=Math.max(0,Math.floor(bx));x<=Math.min(r.w-1,Math.ceil(bx+bw));x++){
    if(!r.hit(x,y))continue;
    if(last===null||x-last>maxGap+1){finish();start=x;hits=0;}last=x;hits++;
   }finish();
   for(const run of runs){const previous=groups.find(g=>y-g.bottom===1&&Math.abs(g.left-run.left)<=2&&Math.abs(g.right-run.right)<=2);
    if(previous){previous.bottom=y;previous.left=Math.min(previous.left,run.left);previous.right=Math.max(previous.right,run.right);}else groups.push(run);
   }
  }return groups.map(g=>({...g,y:(g.top+g.bottom)/2,thickness:g.bottom-g.top+1}));
 }
 function closedRectangles(r,region,{minWidth=25,maxWidth=Infinity,minHeight=6,maxHeight=100,maxGap=2}={}){
  const rows=horizontalRuns(r,region,minWidth,maxGap),result=[];
  for(const a of rows)for(const b of rows){
   const h=b.y-a.y;if(h<Math.max(minHeight,Math.max(a.thickness,b.thickness)*2+1)||h>maxHeight)continue;
   for(const edge of [a,b]){
    const l=edge.left,right=edge.right,w=right-l;if(w<minWidth||w>maxWidth)continue;
    const other=edge===a?b:a;if(other.left>l+3||other.right<right-3)continue;
    const horizontal=[r.support([l+2,a.y],[right-2,a.y]),r.support([l+2,b.y],[right-2,b.y])];
    if(horizontal.some(s=>s.ratio<.8))continue;
    const ends=[l,right].map(x=>{let best=null;for(let dx=-2;dx<=2;dx++){const s=r.support([x+dx,a.y+1],[x+dx,b.y-1]);if(!best||s.ratio>best.support)best={x:x+dx,support:s.ratio};}return best;});
    if(ends.some(e=>e.support<.8))continue;
    const box=[ends[0].x,a.y,ends[1].x-ends[0].x,h];let clear=0,total=0;
    for(let y=Math.ceil(a.y+3);y<b.y-2;y++)for(let x=Math.ceil(box[0]+3);x<box[0]+box[2]-2;x+=2){total++;clear+=Number(!r.hit(x,y));}
    if(!total||clear/total<.55)continue;
    if(!result.some(c=>c.box.every((n,i)=>Math.abs(n-box[i])<=2)))result.push({box,anchors:rectangle(box),method:'paired-dark-boundaries-and-closed-ends'});
   }
  }return result;
 }
 // The note must have its own horizontal leader stem, then a supported leg
 // ending inside the footprint. Proximity to an unrelated note is insufficient.
 function noteLeader(r,row,footprint){
  const [l,t,right,b]=row.box,font=Math.max(5,b-t),stems=[];
  for(const sign of [-1,1]){
   const edge=sign<0?l:right,region=[sign<0?edge-font*12:edge, t-2,font*12,b-t+5];
   for(const run of horizontalRuns(r,region,Math.max(10,font*2),2)){
    const near=sign<0?run.right:run.left,far=sign<0?run.left:run.right;
    if(Math.abs(near-edge)>Math.max(8,font*1.3)||Math.abs(near-far)>font*12)continue;
    stems.push({sign,near:[near,run.y],elbow:[far,run.y]});
   }
  }
  const [x,y,w,h]=footprint.box,margin=Math.max(2,Math.min(5,h*.15)),candidates=[];
  for(const stem of stems)for(let yy=Math.ceil(y+margin);yy<y+h-margin;yy++)for(let xx=Math.ceil(x+margin);xx<x+w-margin;xx++){
   if(!r.hit(xx,yy)||(xx-stem.elbow[0])*stem.sign<8)continue;
   const tip=[xx,yy],length=M.distance(stem.elbow,tip);if(length<12||length>r.w*.35)continue;
   const support=r.support(stem.elbow,tip,1);if(support.ratio<.93||support.maxGap>3)continue;
   const unit=[(xx-stem.elbow[0])/length,(yy-stem.elbow[1])/length];
   // A line crossing the footprint is not an arrow terminating within it.
   const after=r.support([xx+unit[0]*4,yy+unit[1]*4],[xx+unit[0]*10,yy+unit[1]*10],0);
   if(after.ratio>.5)continue;
   candidates.push({points:[stem.near,stem.elbow,tip],method:'connected-note-leader-to-closed-footprint',support:support.ratio,score:length});
  }
  return candidates.sort((a,b)=>b.score-a.score)[0]||null;
 }
 function planCandidates(view,image,reviewed,transform){
  const labels=R.readings(view).filter(flatLabel).filter((row,i,rows)=>!rows.slice(0,i).some(old=>old.text===row.text&&old.box.every((n,k)=>Math.abs(n-row.box[k])<1))),result=[];
  if(!labels.length)return result;
  const [x,y,w,h]=bounds(reviewed.points.map(p=>p.xy)),masks=V.legendBoxes(image,R.readings(view)),r=raster(image,masks),leaderInk=raster(image,masks,{thin:true}),margin=Math.max(20,h*.2);
  // The current contract supports axis-aligned front entry roofs. A rotated
  // plan remains unresolved instead of receiving an arbitrary orientation.
  if(Math.abs(Math.sin(reviewed.alignment.rotationDegrees*Math.PI/180))>1e-6)return result;
  const facing=Math.cos(reviewed.alignment.rotationDegrees*Math.PI/180)>0?y+h:y;
  const region=[x-w*.1,Math.max(0,facing-margin),w*1.2,margin*2],rects=closedRectangles(r,region,{minWidth:Math.max(20,w*.06),maxWidth:w*.85,minHeight:5,maxHeight:Math.max(15,h*.2)});
  for(const candidate of rects){
   if(masks.some(mask=>intersects(candidate.box,mask)))continue;
   const footprint=candidate.anchors.map(transform.point),physical=bounds(footprint);
   if(physical[2]<.3||physical[3]<.06||physical[2]<physical[3]*1.4||physical[3]>3)continue;
   for(const label of labels){const leader=noteLeader(leaderInk,label,candidate);if(!leader)continue;
    const font=label.box[3]-label.box[1],context=R.readings(view).filter(row=>usableRow(row)&&row!==label&&Math.abs(row.box[0]-label.box[0])<font*2&&row.box[1]>=label.box[3]-1&&row.box[1]-label.box[3]<font*4).filter((row,i,rows)=>!rows.slice(0,i).some(old=>old.text===row.text&&old.box.every((n,k)=>Math.abs(n-row.box[k])<1)));
    result.push({...candidate,footprint,physical,label,context,leader});break;
   }
  }
  return result.filter((a,i)=>!result.slice(0,i).some(b=>a.box.every((n,k)=>Math.abs(n-b.box[k])<=3)));
 }
 function frontBand(front,image,registration,plan){
  const masks=[...(front.envelope.occlusions||[]),...V.legendBoxes(image,[])],r=raster(image,masks),[x,,width]=plan.physical,left=registration.pixelU(x),right=registration.pixelU(x+width),span=right-left;
  const pad=Math.max(6,span*.07),height=front.envelope.box[3],guide=registration.guide.y,region=[left-pad,guide-height*.22,span+pad*2,height*.44];
  const candidates=closedRectangles(r,region,{minWidth:span*.8,maxWidth:span*1.2,minHeight:5,maxHeight:Math.min(height*.22,1/registration.sz),maxGap:Math.max(2,Math.ceil(span*.1))}).filter(c=>
   !masks.some(mask=>intersects(c.box,mask))&&Math.abs(c.box[0]-left)<=pad&&Math.abs(c.box[0]+c.box[2]-right)<=pad&&c.box[1]<=guide+height*.09&&c.box[1]+c.box[3]>=guide-height*.09);
  // Adjacent bands with common ends are one external envelope. The outer
  // bounds supply facing height; their subdivisions are not new roofs.
  candidates.sort((a,b)=>b.box[3]-a.box[3]||Math.abs(a.box[1]-guide)-Math.abs(b.box[1]-guide));
  const chosen=candidates[0];if(!chosen)return null;
  const top=registration.z(chosen.box[1]),bottom=registration.z(chosen.box[1]+chosen.box[3]);
  return {...chosen,top,bottom,masks,extentResiduals:[registration.u(chosen.box[0])-x,registration.u(chosen.box[0]+chosen.box[2])-x-width]};
 }
 function ownerAndDoor(targets,inventory,front,image,registration,plan,band){
  const [x,y,w,depth]=plan.physical,back=y+depth;
  const owners=targets.flatMap(level=>M.wallsFor(level,inventory,{includeProposed:true}).filter(wall=>wall.normal[1]<-.999&&x>=Math.min(wall.from[0],wall.to[0])-.08&&x+w<=Math.max(wall.from[0],wall.to[0])+.08&&Math.abs(wall.from[1]-back)<=Math.max(.06,registration.sx*4)&&band.bottom>=wall.base-.04&&band.bottom<=wall.base+wall.height+.04).map(wall=>({level,wall})));
  for(const owner of owners){
   const {level,wall}=owner,box=band.box,base=registration.pixelZ(wall.base),searchTop=box[1]+box[3]-wall.height/registration.sz*.15,roi=[box[0]-8,searchTop,box[2]+16,base-searchTop+12];
   if(roi[3]<40)continue;
   const doors=V.grayDoorFrames(image,roi,{type:'door'}).filter(d=>d.box[1]>=box[1]+box[3]&&Math.abs(registration.z(d.box[1]+d.box[3])-wall.base)<=Math.max(.1,registration.sz*8)&&d.box[0]>=box[0]-3&&d.box[0]+d.box[2]<=box[0]+box[2]+3&&!band.masks.some(mask=>intersects(d.box,mask)));
   if(doors.length===1)return {...owner,door:doors[0]};
   // Existing source-backed door proposals are also usable; an anonymous
   // rectangular window or an assumed standard door width is not evidence.
   const mapped=(level.wallOpenings||[]).filter(o=>o.type==='door'&&o.wallId===wall.id&&o.sourceViewId===front.viewId&&o.sourceBox?.length===4&&!M.openingIssues([o],[wall]).length).filter(o=>o.sourceBox[0]>=box[0]-3&&o.sourceBox[0]+o.sourceBox[2]<=box[0]+box[2]+3&&o.sourceBox[1]>=box[1]+box[3]);
   if(mapped.length===1)return {...owner,door:{box:copy(mapped[0].sourceBox),method:'existing-source-observed-door'}};
  }return null;
 }
 function sideProjection(info,source,image,registration,plan,band){
  const direction=info.direction,sign=direction==='right'?-1:1,wall=direction==='right'?info.envelope.box[0]:info.envelope.box[0]+info.envelope.box[2],top=registration.pixelZ(band.top),bottom=registration.pixelZ(band.bottom),masks=[...(info.envelope.occlusions||[]),...V.legendBoxes(image,R.readings(source))],r=raster(image,masks),tolerance=Math.max(3,.05/registration.sz),maxDepth=plan.physical[3]/registration.sx+4,candidates=[];
  if(bottom-top<5)return null;
  for(let dx=4;dx<=maxDepth;dx++)for(let yy=Math.round(top-tolerance);yy<=top+tolerance;yy++){
   const outside=Math.round(wall+sign*dx);if(!r.hit(outside,yy))continue;
   for(let wx=Math.round(wall-3);wx<=wall+3;wx++){
    if(Math.abs(outside-wx)<4)continue;
    const cap=r.support([outside,yy],[wx,yy],1);if(cap.ratio<.9||cap.maxGap>2)continue;
    for(let low=Math.round(bottom-tolerance);low<=bottom+tolerance;low++){
     const attached=r.support([wx,yy],[wx,low],1);if(attached.ratio<.85)continue;
     // A shallow step in the visible outer edge is allowed. Every sampled
     // row still needs a boundary, and the bottom must meet that boundary.
     const path=[],step=Math.max(2,Math.min(5,dx*.25));let supported=0;
     for(let y=yy;y<=low;y++){let found=null;for(let inset=0;inset<=step;inset++){const xx=outside-sign*inset;if(r.hit(xx,y)){found=[xx,y];break;}}if(found){path.push(found);supported++;}}
     if(supported/(low-yy+1)<.88||!path.length)continue;
     const lower=path.at(-1),base=r.support(lower,[wx,low],1);if(base.ratio<.9||base.maxGap>2)continue;
     const box=[Math.min(outside,wx),yy,Math.abs(outside-wx),low-yy];if(masks.some(mask=>intersects(box,mask)))continue;
     let clear=0,total=0;for(let y=yy+3;y<low-2;y++)for(let k=3;k<dx-2;k++){total++;clear+=Number(!r.hit(outside-sign*k,y));}if(total&&clear/total<.5)continue;
     const visibleDepth=Math.abs(outside-wx)*registration.sx;
     if(visibleDepth>plan.physical[3]+Math.max(.04,registration.sx*3))continue;
     candidates.push({box,anchors:[[outside,yy],[wx,yy],[wx,low],lower],visibleDepth,top:registration.z(yy),bottom:registration.z(low),method:'closed-projecting-side-profile-at-visible-wall',score:Math.abs(yy-top)+Math.abs(low-bottom)+Math.abs(wx-wall)*.2-dx*.02});
    }
   }
  }
  return candidates.sort((a,b)=>a.score-b.score)[0]||null;
 }
 function build(proposal,inventory,images,reviewed,generatedLevels=[]){
  const targets=generatedLevels.filter(l=>l.buildingId===proposal.buildingId&&generated(l)),byLevel=targets.map(l=>({levelId:l.id,reconstructedRoofs:[],exteriorElements:[],issues:[]})),issues=[],result=()=>({byLevel,issues:[...new Set([...issues,...byLevel.flatMap(l=>l.issues)])]});
  if(!targets.length)return result();
  const planView=inventory.views.find(v=>v.id===reviewed?.sourceViewId&&v.kind==='floor'&&v.buildingId===proposal.buildingId),planImage=images?.[planView?.id],transform=reviewed&&sourceTransform(reviewed);
  if(!planView||!planImage?.data||!transform)return result();
  const labels=R.readings(planView).filter(flatLabel);if(!labels.length)return result();
  const candidates=planCandidates(planView,planImage,reviewed,transform);
  if(!candidates.length){issues.push('FLAT_ENTRY_PLAN_LEADER_OR_FOOTPRINT_UNRESOLVED');return result();}
  const views=(proposal.views||[]).filter(info=>info.envelope?.status==='proposed'&&images?.[info.viewId]?.data&&inventory.views.some(v=>v.id===info.viewId&&v.kind==='elevation'&&v.buildingId===proposal.buildingId&&v.direction===info.direction)),front=views.find(v=>v.direction==='front'),frontSource=inventory.views.find(v=>v.id===front?.viewId),fr=front&&R.elevationRegistration(front,reviewed,inventory);
  if(!front||!fr){issues.push('FLAT_ENTRY_FRONT_REGISTRATION_UNRESOLVED');return result();}
  const accepted=[];
  const allWalls=targets.flatMap(level=>M.wallsFor(level,inventory,{includeProposed:true}));
  for(const plan of candidates){
   const band=frontBand(front,images[front.viewId],fr,plan);if(!band){issues.push('FLAT_ENTRY_FRONT_FASCIA_UNRESOLVED');continue;}
   const owner=ownerAndDoor(targets,inventory,front,images[front.viewId],fr,plan,band);if(!owner){issues.push('FLAT_ENTRY_DOOR_OR_ATTACHMENT_UNRESOLVED');continue;}
   const [x,y,w,depth]=plan.physical;
   if(allWalls.some(wall=>wall.id!==owner.wall.id&&wall.normal[1]<-.999&&wall.from[1]<y+depth-.001&&
    Math.min(x+w,Math.max(wall.from[0],wall.to[0]))-Math.max(x,Math.min(wall.from[0],wall.to[0]))>.001&&
    Math.min(band.top,wall.base+wall.height)-Math.max(band.bottom,wall.base)>.001)){
    issues.push('FLAT_ENTRY_HIDDEN_BY_NEARER_VOLUME');continue;
   }
   const sides=[];let conflict=false;
   for(const info of views.filter(v=>['left','right'].includes(v.direction))){
    const source=inventory.views.find(v=>v.id===info.viewId),registration=R.elevationRegistration(info,reviewed,inventory);if(!registration)continue;
    const projection=sideProjection(info,source,images[info.viewId],registration,plan,band);
    if(!projection){conflict=true;continue;}
    sides.push({info,source,registration,projection});
   }
   if(!sides.length||conflict){issues.push('FLAT_ENTRY_SIDE_PROFILE_UNRESOLVED');continue;}
   const depthTolerance=Math.max(.05,...sides.map(s=>s.registration.sx*3));
   if(sides.some(s=>Math.abs(s.projection.visibleDepth-sides[0].projection.visibleDepth)>depthTolerance)){issues.push('FLAT_ENTRY_SIDE_DEPTH_CONFLICT');continue;}
   accepted.push({plan,band,owner,sides});
  }
  // More than one different footprint attached to the same note is ambiguous.
  const ambiguous=new Set();for(let i=0;i<accepted.length;i++)for(let j=i+1;j<accepted.length;j++)if(accepted[i].plan.label===accepted[j].plan.label){ambiguous.add(i);ambiguous.add(j);}
  for(const [index,item]of accepted.entries()){
   if(ambiguous.has(index)){issues.push('FLAT_ENTRY_PLAN_AMBIGUOUS');continue;}
   const {plan,band,owner,sides}=item,{level,wall}=owner,id='entry-flat:'+wall.id+':'+planView.id+':'+plan.box.map(n=>Math.round(n)).join('-'),assembly={version:1,id,frontViewId:frontSource.id,sideViewIds:sides.map(s=>s.source.id),parentWallId:wall.id};
   const sourceRecord=(source,anchors,registration,axis)=>({axis,sourceViewId:source.id,sourceFrame:copy(source.frame),anchors:copy(anchors),scaleX:registration.sx,scaleY:registration.sz,kind:'estimated-calibrated',status:'proposed',referenceGuide:copy(registration.guide)});
   const [x,y,w,d]=plan.physical,z=band.top,poly=[[x,y,band.bottom],[x+w,y,band.bottom],[x+w,y,z],[x,y,z]],fascia={...sourceRecord(frontSource,band.anchors,fr,'x'),id:id+':fascia:front',sourceBox:copy(band.box),boxFormat:'xywh',poly,normal:[0,-1,0],extentStatus:'visible-facing-not-structural-thickness',height:z-band.bottom};
   const labelRecord=row=>({text:row.text,sourceBox:copy(row.box),boxFormat:'xyxy'}),drainageIndicated=[plan.label,...plan.context].some(row=>/\b(?:pente|slope|drain|ecoulement)\b/.test(normal(row.text)));
   const roof={version:1,id:id+':roof',levelId:level.id,buildingId:proposal.buildingId,status:'proposed',kind:'estimated-calibrated',sourceCategory:'pdf-entry-assembly',entryAssembly:assembly,roofForm:'flat',
    profiles:{x:[[x,z],[x+w,z]],y:[[y,z],[y+d,z]]},sources:[sourceRecord(frontSource,band.anchors,fr,'x'),...sides.map(s=>({...sourceRecord(s.source,s.projection.anchors,s.registration,'y'),extentStatus:'visible-subset-of-plan-footprint'}))],
    planEvidence:{sourceViewId:planView.id,sourceFrame:copy(planView.frame),anchors:copy(plan.anchors),sourceBox:copy(plan.box),boxFormat:'xywh',scaleX:transform.scale,scaleY:transform.scale,kind:'estimated-calibrated',status:'proposed',alignment:copy(reviewed.alignment),footprint:copy(plan.footprint),label:labelRecord(plan.label),contextLabels:plan.context.map(labelRecord),leader:copy(plan.leader)},
    observedFascia:[fascia],connection:{kind:'plan-footprint-and-observed-flat-entry',parentWallId:wall.id,wallY:wall.from[1],frontExtentResiduals:copy(band.extentResiduals),doorEvidence:{sourceViewId:frontSource.id,sourceBox:copy(owner.door.box),method:owner.door.method},visibleSideProjection:sides.map(s=>({sourceViewId:s.source.id,visibleDepth:s.projection.visibleDepth,fullFootprintDepth:d,extentStatus:'visible-subset-of-plan-footprint',topResidual:s.projection.top-z,bottomResidual:s.projection.bottom-band.bottom}))},
    drainage:{slope:null,status:'unresolved',indicated:drainageIndicated},thickness:null,structuralSection:null,supportMaterial:'unknown',soffitStatus:'unresolved',complete:false,confirmationRequired:true,quantityStatus:'partial-unreviewed',note:'Flat exterior envelope from a linked plan footprint and observed fascia profiles; drainage slope, internal section and hidden underside are unmeasured.'};
   const report=byLevel.find(l=>l.levelId===level.id);report.reconstructedRoofs.push(roof);report.issues.push('FLAT_ENTRY_DRAINAGE_SLOPE_UNRESOLVED','FLAT_ENTRY_STRUCTURAL_SECTION_UNRESOLVED','FLAT_ENTRY_UNDERSIDE_UNRESOLVED');
  }
  return result();
 }
 return Object.freeze({version:1,build});
});
