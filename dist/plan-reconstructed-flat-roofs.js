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
  for(let i=0;i<ink.length;i++){
   const p=i*4,red=data[p],green=data[p+1],blue=data[p+2],hi=Math.max(red,green,blue),lo=Math.min(red,green,blue);
   if(data[p+3]<=150)continue;
   if(thin){ink[i]=Number(hi<215&&(hi-lo<45||lo<80&&hi-lo<185));continue;}
   if(hi<140&&hi-lo<45){ink[i]=1;continue;}
   if(hi>=185||lo>=80||hi-lo>=140)continue;
   // A dark coloured guide by itself is not a structural edge. Recover a
   // stroke under translucent markup only when neighbouring background
   // differs by approximately the same amount in all three channels.
   const x=i%w,y=(i-x)/w;
   for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4],[8,0],[-8,0]]){
    if(x+dx<0||x+dx>=w||y+dy<0||y+dy>=h)continue;
    const q=((y+dy)*w+x+dx)*4,deltas=[data[q]-red,data[q+1]-green,data[q+2]-blue];
    if(Math.min(...deltas)>25&&Math.max(...deltas)-Math.min(...deltas)<25){ink[i]=1;break;}
   }
  }
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
 function closedRectangles(r,region,{minWidth=25,maxWidth=Infinity,minHeight=6,maxHeight=100,maxGap=2,expectedEnds=null}={}){
  const rows=horizontalRuns(r,region,minWidth,maxGap),result=[];
  for(const a of rows)for(const b of rows){
   const h=b.y-a.y;if(h<Math.max(minHeight,Math.max(a.thickness,b.thickness)*2+1)||h>maxHeight)continue;
   const endSupport=x=>{const s=r.support([x,a.y+1],[x,b.y-1]),tip=Math.min(8,h*.2),start=r.support([x,a.y+1],[x,a.y+tip]),end=r.support([x,b.y-tip],[x,b.y-1]);return start.ratio>=.75&&end.ratio>=.75&&s.maxGap<=Math.max(3,h*.15)&&s.ratio>=.8?{x,support:s.ratio}:null;};
   let pairs;
   if(expectedEnds){
    // Drafting strokes can continue beyond a fascia corner. Its real closure
    // is the perpendicular spine, not the end of that horizontal component.
    // Search only the independently calibrated left/right uncertainty bands.
    const ends=expectedEnds.positions.map(position=>{const groups=[];
     for(let x=Math.ceil(position-expectedEnds.tolerance);x<=position+expectedEnds.tolerance;x++){
      const end=endSupport(x);if(!end)continue;const group=groups.at(-1);if(!group||x-group.at(-1).x>1)groups.push([end]);else group.push(end);
     }
     return groups.map(g=>{const middle=(g[0].x+g.at(-1).x)/2;return g.sort((a,b)=>b.support-a.support||Math.abs(a.x-middle)-Math.abs(b.x-middle))[0];});
    });
    pairs=ends[0].flatMap(left=>ends[1].map(right=>[left,right]));
   }else pairs=[a,b].map(edge=>[edge.left,edge.right].map(x=>{let best=null;for(let dx=-2;dx<=2;dx++){const end=endSupport(x+dx);if(end&&(!best||end.support>best.support))best=end;}return best;}));
   for(const ends of pairs){
    if(ends.some(e=>!e))continue;
    const l=ends[0].x,right=ends[1].x,w=right-l;if(w<minWidth||w>maxWidth)continue;
    if([a,b].some(row=>row.left>l+3||row.right<right-3))continue;
    const horizontal=[r.support([l+2,a.y],[right-2,a.y]),r.support([l+2,b.y],[right-2,b.y])];
    if(horizontal.some(s=>s.ratio<.8))continue;
    const box=[ends[0].x,a.y,ends[1].x-ends[0].x,h];let clear=0,total=0;
    for(let y=Math.ceil(a.y+3);y<b.y-2;y++)for(let x=Math.ceil(box[0]+3);x<box[0]+box[2]-2;x+=2){total++;clear+=Number(!r.hit(x,y));}
    if(!total||clear/total<.55)continue;
    if(!result.some(c=>c.box.every((n,i)=>Math.abs(n-box[i])<=2)))result.push({box,anchors:rectangle(box),method:'paired-dark-boundaries-and-closed-ends'});
   }
  }return result;
 }
 // A written depth can complete collinear sides hidden by a wall finish. It
 // cannot supply an eave, rear attachment, width, or source association. Those
 // still need their own visible strokes and the linked roof note.
 function measuredFootprints(r,view,reviewed,transform,dimensions,region){
  const references=dimensions.filter(d=>d?.kind==='written'&&d.sourceViewId===view.id&&JSON.stringify(d.sourceFrame)===JSON.stringify(view.frame)&&finite(d.value)&&d.value>.06&&d.value<=3&&d.anchors?.length===2&&d.anchors.every(p=>p?.length===2&&p.every(finite)&&p[0]>=0&&p[1]>=0&&p[0]<r.w&&p[1]<r.h)&&Math.abs(d.anchors[0][0]-d.anchors[1][0])<=2&&Math.abs(d.anchors[0][1]-d.anchors[1][1])>=5&&d.textBox?.length===4&&d.textBox.every(finite)&&typeof d.label==='string'&&d.label.trim()&&!d.corrected);
  const depths=references.map(d=>({...copy(d),anchors:copy(d.anchors).sort((a,b)=>a[1]-b[1]),components:[copy(d)]}));
  const singles=depths.slice();for(const a of singles)for(const b of singles){
   if(a===b||M.distance(a.anchors[1],b.anchors[0])>2||Math.abs(a.anchors[0][0]-b.anchors[0][0])>2)continue;
   depths.push({...copy(a),value:a.value+b.value,anchors:[copy(a.anchors[0]),copy(b.anchors[1])],components:[...copy(a.components),...copy(b.components)],label:a.label+' + '+b.label,association:'contiguous-written-dimension-chain'});
  }
  const floor=M.modelPoints(reviewed),orientation=Math.sign(M.signedArea(floor)),frontEdges=floor.map((a,i)=>[a,floor[(i+1)%floor.length]]).filter(([a,b])=>Math.abs(a[1]-b[1])<1e-6&&orientation*(a[0]-b[0])<0),outward=Math.cos(reviewed.alignment.rotationDegrees*Math.PI/180)>0?1:-1,results=[];
  for(const dimension of depths){
   const [a,b]=dimension.anchors,span=b[1]-a[1],writtenTolerance=Math.max(.025,dimension.value*.05);
   // A correct total cannot hide two compensating wrong segment anchors.
   // Each written component must agree with this plan's calibrated pixels.
   if(dimension.components.some(c=>Math.abs(M.distance(...c.anchors)*transform.scale-c.value)>Math.max(.025,c.value*.05)))continue;
   if(Math.abs(span*transform.scale-dimension.value)>writtenTolerance||depths.some(other=>other!==dimension&&M.distance(other.anchors[0],a)<=2&&M.distance(other.anchors[1],b)<=2&&Math.abs(other.value-dimension.value)>.01))continue;
   const rear=outward>0?a[1]:b[1],eave=outward>0?b[1]:a[1],minWidth=Math.max(20,region[2]*.05),rows=horizontalRuns(r,[region[0],eave-2,region[2],4],minWidth,2);
   for(const row of rows){
    const l=row.left,right=row.right,width=right-l;
    if(width>region[2]*.75||a[0]<l+3||a[0]>right-3||row.thickness>Math.max(4,span*.12))continue;
    let cap=null;
    for(let y=Math.round(rear-2);y<=rear+2;y++){const support=r.support([l+2,y],[right-2,y]);if(support.ratio>=.82&&support.maxGap<=Math.max(3,width*.1)&&(!cap||Math.abs(y-rear)<Math.abs(cap.y-rear)))cap={y,support};}
    if(!cap)continue;
    const back=transform.point([(l+right)/2,cap.y]),xBounds=[transform.point([l,cap.y])[0],transform.point([right,cap.y])[0]].sort((a,b)=>a-b),tolerance=Math.max(.04,transform.scale*3);
    if(!frontEdges.some(([a,b])=>Math.abs(a[1]-back[1])<=tolerance&&xBounds[0]>=Math.min(a[0],b[0])-.04&&xBounds[1]<=Math.max(a[0],b[0])+.04))continue;
    const sides=[];
    for(const edge of [l,right]){
     let best=null;
     for(let dx=-2;dx<=2;dx++){
      let last=row.y,hits=0,gaps=0;
      for(let part=0;part<=span;part++){const y=Math.round(row.y-outward*part);if(r.hit(edge+dx,y)){hits++;last=y;gaps=0;}else if(++gaps>1)break;}
      const length=Math.abs(row.y-last);
      if(length>=Math.max(6,row.thickness*3)&&hits/(length+1)>=.8&&(!best||length>best.length))best={anchors:[[edge+dx,row.y],[edge+dx,last]],length};
     }
     sides.push(best);
    }
    if(sides.some(s=>!s))continue;
    const x0=sides[0].anchors[0][0],x1=sides[1].anchors[0][0],top=Math.min(cap.y,row.y),bottom=Math.max(cap.y,row.y),box=[x0,top,x1-x0,bottom-top];
    const dimensionEvidence={...copy(dimension),estimatedValue:box[3]*transform.scale,residual:box[3]*transform.scale-dimension.value};
    results.push({box,anchors:rectangle(box),method:'written-depth-between-observed-attachment-and-eave',depthConstraint:dimensionEvidence,boundaryEvidence:{rear:[[x0,cap.y],[x1,cap.y]],eave:[[x0,row.y],[x1,row.y]],observedSides:sides.map(s=>copy(s.anchors)),completedSides:sides.map((s,i)=>[copy(s.anchors[1]),[i?x1:x0,cap.y]]),completionKind:'collinear-continuation-constrained-by-written-depth'}});
   }
  }
  return results;
 }
 function estimatedFootprints(r,view,reviewed,transform,dimensions,region){
  const world=M.modelPoints(reviewed),orientation=Math.sign(M.signedArea(world)),source=reviewed.points.map(p=>p.xy),outward=Math.cos(reviewed.alignment.rotationDegrees*Math.PI/180)>0?1:-1,edges=world.map((a,i)=>({world:[a,world[(i+1)%world.length]],source:[source[i],source[(i+1)%source.length]]})).filter(e=>Math.abs(e.world[0][1]-e.world[1][1])<1e-6&&orientation*(e.world[0][0]-e.world[1][0])<0),rows=horizontalRuns(r,region,Math.max(20,region[2]*.05),2),results=[];
  for(const edge of edges)for(const row of rows){
   const rear=(edge.source[0][1]+edge.source[1][1])/2,span=(row.y-rear)*outward,left=Math.min(...edge.source.map(p=>p[0])),right=Math.max(...edge.source.map(p=>p[0]));
   if(span<8||span*transform.scale>3||row.left<left-2||row.right>right+2||row.right-row.left>region[2]*.75||row.thickness>Math.max(4,span*.12))continue;
   let cap=null;for(let y=Math.round(rear-2);y<=rear+2;y++){const support=r.support([row.left+2,y],[row.right-2,y]);if(support.ratio>=.82&&support.maxGap<=Math.max(3,(row.right-row.left)*.1)&&(!cap||Math.abs(y-rear)<Math.abs(cap.y-rear)))cap={y,support};}
   if(!cap)continue;
   const sides=[];
   for(const x of [row.left,row.right]){
    let best=null;
    for(let dx=-2;dx<=2;dx++){
     let last=row.y,hits=0,gaps=0;for(let part=0;part<=span;part++){const y=Math.round(row.y-outward*part);if(r.hit(x+dx,y)){hits++;last=y;gaps=0;}else if(++gaps>1)break;}
     const length=Math.abs(row.y-last);
     if(length>=Math.max(6,span*.4,row.thickness*3)&&hits/(length+1)>=.8&&(!best||length>best.length))best={anchors:[[x+dx,row.y],[x+dx,last]],length};
    }sides.push(best);
   }
   if(sides.some(s=>!s))continue;
   const x0=sides[0].anchors[0][0],x1=sides[1].anchors[0][0],box=[x0,Math.min(cap.y,row.y),x1-x0,Math.abs(row.y-cap.y)];
   // The independent pixel estimate cannot silently replace a conflicting
   // written dimension attached to these same two source boundaries.
   const relevant=dimensions.filter(d=>d?.kind==='written'&&!d.corrected&&d.sourceViewId===view.id&&JSON.stringify(d.sourceFrame)===JSON.stringify(view.frame)&&finite(d.value)&&d.value>0&&d.anchors?.length===2&&d.anchors.every(p=>p?.length===2&&p.every(finite))&&Math.abs(d.anchors[0][0]-d.anchors[1][0])<=2&&d.anchors[0][0]>=x0-3&&d.anchors[0][0]<=x1+3&&Math.abs(Math.min(...d.anchors.map(p=>p[1]))-box[1])<=3&&Math.abs(Math.max(...d.anchors.map(p=>p[1]))-box[1]-box[3])<=3);
   if(relevant.some(d=>Math.abs(d.value-box[3]*transform.scale)>Math.max(.025,d.value*.05)))continue;
   results.push({box,anchors:rectangle(box),method:'source-estimated-collinear-closure',requiresBothSides:true,boundaryEvidence:{rear:[[x0,cap.y],[x1,cap.y]],eave:[[x0,row.y],[x1,row.y]],observedSides:sides.map(s=>copy(s.anchors)),completedSides:sides.map((s,i)=>[copy(s.anchors[1]),[i?x1:x0,cap.y]]),completionKind:'collinear-continuation-between-observed-attachment-and-eave'}});
  }
  return results;
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
 function planCandidates(view,image,reviewed,transform,dimensions=[]){
  const labels=R.readings(view).filter(flatLabel).filter((row,i,rows)=>!rows.slice(0,i).some(old=>old.text===row.text&&old.box.every((n,k)=>Math.abs(n-row.box[k])<1))),result=[];
  if(!labels.length)return result;
  const [x,y,w,h]=bounds(reviewed.points.map(p=>p.xy)),masks=V.legendBoxes(image,R.readings(view)),r=raster(image,masks),leaderInk=raster(image,masks,{thin:true}),margin=Math.max(20,h*.2);
  // The current contract supports axis-aligned front entry roofs. A rotated
  // plan remains unresolved instead of receiving an arbitrary orientation.
  if(Math.abs(Math.sin(reviewed.alignment.rotationDegrees*Math.PI/180))>1e-6)return result;
  const facing=Math.cos(reviewed.alignment.rotationDegrees*Math.PI/180)>0?y+h:y;
  const region=[x-w*.1,Math.max(0,facing-margin),w*1.2,margin*2],rects=[...closedRectangles(r,region,{minWidth:Math.max(20,w*.06),maxWidth:w*.85,minHeight:5,maxHeight:Math.max(15,h*.2)}),...measuredFootprints(r,view,reviewed,transform,dimensions,region),...estimatedFootprints(r,view,reviewed,transform,dimensions,region)];
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
 function frontBands(front,image,registration,plan){
  const masks=[...(front.envelope.occlusions||[]),...V.legendBoxes(image,[])],r=raster(image,masks),[x,,width]=plan.physical,left=registration.pixelU(x),right=registration.pixelU(x+width),span=right-left;
  const pad=Math.max(6,span*.07),height=front.envelope.box[3],guide=registration.guide.y,region=[left-pad,guide-height*.22,span+pad*2,height*.44];
  const candidates=closedRectangles(r,region,{minWidth:span*.8,maxWidth:span*1.2,minHeight:5,maxHeight:Math.min(height*.22,1/registration.sz),maxGap:Math.max(2,Math.ceil(span*.1)),expectedEnds:{positions:[left,right],tolerance:pad}}).filter(c=>
   !masks.some(mask=>intersects(c.box,mask))&&Math.abs(c.box[0]-left)<=pad&&Math.abs(c.box[0]+c.box[2]-right)<=pad&&c.box[1]<=guide+height*.09&&c.box[1]+c.box[3]>=guide-height*.09);
  // Adjacent bands with common ends are one external envelope. The outer
  // bounds supply facing height; their subdivisions are not new roofs.
  candidates.sort((a,b)=>b.box[3]-a.box[3]||Math.abs(a.box[1]-guide)-Math.abs(b.box[1]-guide));
  return candidates.map(chosen=>({...chosen,top:registration.z(chosen.box[1]),bottom:registration.z(chosen.box[1]+chosen.box[3]),masks,extentResiduals:[registration.u(chosen.box[0])-x,registration.u(chosen.box[0]+chosen.box[2])-x-width]}));
 }
 function gradeLevelDoor(image,band,wall,registration){
  const box=band.box,base=registration.pixelZ(wall.base),height=wall.height/registration.sz,r=raster(image,band.masks),region=[box[0],box[1]+box[3]+2,box[2],base-box[1]-box[3]+6];
  const frames=closedRectangles(r,region,{minWidth:box[2]*.25,maxWidth:box[2]*.96,minHeight:Math.max(35,height*.5),maxHeight:height*.95,maxGap:3}).filter(c=>Math.abs(registration.z(c.box[1]+c.box[3])-wall.base)<=Math.max(.1,registration.sz*8)&&!band.masks.some(mask=>intersects(c.box,mask)));
  const observed=frames.filter(c=>{
   let neutral=0,panel=0,count=0;const [x,y,w,h]=c.box;
   for(let yy=Math.ceil(y+3);yy<y+h-3;yy+=2)for(let xx=Math.ceil(x+3);xx<x+w-3;xx+=2){const at=(yy*image.width+xx)*4,hi=Math.max(image.data[at],image.data[at+1],image.data[at+2]),lo=Math.min(image.data[at],image.data[at+1],image.data[at+2]);count++;neutral+=Number(hi-lo<35&&lo>60);panel+=Number(hi-lo<35&&lo>65&&hi<225);}
   return count&&neutral/count>.65&&panel/count>.35;
  }).sort((a,b)=>b.box[2]*b.box[3]-a.box[2]*a.box[3]);
  return observed[0]?{...observed[0],method:'closed-grade-level-frame-and-neutral-panel-content'}:null;
 }
 function ownerAndDoor(targets,inventory,front,image,registration,plan,band){
  const [x,y,w,depth]=plan.physical,back=y+depth;
  const owners=targets.flatMap(level=>M.wallsFor(level,inventory,{includeProposed:true}).filter(wall=>wall.normal[1]<-.999&&x>=Math.min(wall.from[0],wall.to[0])-.08&&x+w<=Math.max(wall.from[0],wall.to[0])+.08&&Math.abs(wall.from[1]-back)<=Math.max(.06,registration.sx*4)&&band.bottom>=wall.base-.04&&band.bottom<=wall.base+wall.height+.04).map(wall=>({level,wall})));
  for(const owner of owners){
   const {level,wall}=owner,box=band.box,base=registration.pixelZ(wall.base),searchTop=box[1]+box[3]-wall.height/registration.sz*.15,roi=[box[0]-8,searchTop,box[2]+16,base-searchTop+12];
   if(roi[3]<40)continue;
   const doors=V.grayDoorFrames(image,roi,{type:'door'}).filter(d=>d.box[1]>=box[1]+box[3]&&Math.abs(registration.z(d.box[1]+d.box[3])-wall.base)<=Math.max(.1,registration.sz*8)&&d.box[0]>=box[0]-3&&d.box[0]+d.box[2]<=box[0]+box[2]+3&&!band.masks.some(mask=>intersects(d.box,mask)));
   if(doors.length===1)return {...owner,door:doors[0]};
   const framed=gradeLevelDoor(image,band,wall,registration);if(framed)return {...owner,door:framed};
   // Existing source-backed door proposals are also usable; an anonymous
   // rectangular window or an assumed standard door width is not evidence.
   const mapped=(level.wallOpenings||[]).filter(o=>o.type==='door'&&o.wallId===wall.id&&o.sourceViewId===front.viewId&&o.sourceBox?.length===4&&!M.openingIssues([o],[wall]).length).filter(o=>o.sourceBox[0]>=box[0]-3&&o.sourceBox[0]+o.sourceBox[2]<=box[0]+box[2]+3&&o.sourceBox[1]>=box[1]+box[3]);
   if(mapped.length===1)return {...owner,door:{box:copy(mapped[0].sourceBox),method:'existing-source-observed-door'}};
  }return null;
 }
 function sideProjection(info,source,image,registration,plan,band){
  const direction=info.direction,sign=direction==='right'?-1:1,back=plan.physical[1]+plan.physical[3],attachment=registration.pixelU(direction==='right'?back:-back),top=registration.pixelZ(band.top),bottom=registration.pixelZ(band.bottom),masks=[...(info.envelope.occlusions||[]),...V.legendBoxes(image,R.readings(source))],r=raster(image,masks),tolerance=Math.max(3,.05/registration.sz),maxDepth=plan.physical[3]/registration.sx+4,candidates=[],walls=[];
  if(bottom-top<5)return null;
  // On a stepped facade the page envelope can end at a recessed wall. Locate
  // the visible wall spine from the registered plan attachment instead. It
  // must continue above and below the roof, so the roof's own rim is excluded.
  const lo=Math.floor(Math.min(attachment,attachment+sign*maxDepth)-3),hi=Math.ceil(Math.max(attachment,attachment+sign*maxDepth)+3),reach=Math.max(12,(bottom-top)*.7);
  for(let wx=lo;wx<=hi;wx++){
   const above=r.support([wx,top-reach],[wx,top-3],1),below=r.support([wx,bottom+3],[wx,bottom+reach],1);
   if(above.ratio<.8||below.ratio<.8)continue;
   const group=walls.at(-1);if(group&&wx-group.at(-1)>2||!group)walls.push([wx]);else group.push(wx);
  }
  const wallPixels=walls.map(g=>g.reduce((a,b)=>Math.abs(a-attachment)<Math.abs(b-attachment)?a:b));
  for(const wx of wallPixels)for(let dx=4;dx<=maxDepth;dx++)for(let yy=Math.round(top-tolerance);yy<=top+tolerance;yy++){
   const outside=Math.round(wx+sign*dx);if(!r.hit(outside,yy))continue;
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
     candidates.push({box,anchors:[[outside,yy],[wx,yy],[wx,low],lower],visibleDepth,top:registration.z(yy),bottom:registration.z(low),visibleWallX:wx,attachmentReferenceX:attachment,method:'closed-projecting-side-profile-at-plan-registered-wall',score:Math.abs(yy-top)+Math.abs(low-bottom)+Math.abs(wx-attachment)*.02-dx*.02});
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
  const candidates=planCandidates(planView,planImage,reviewed,transform,proposal.contourDimensions||[]);
  if(!candidates.length){issues.push('FLAT_ENTRY_PLAN_LEADER_OR_FOOTPRINT_UNRESOLVED');return result();}
  const views=(proposal.views||[]).filter(info=>info.envelope?.status==='proposed'&&images?.[info.viewId]?.data&&inventory.views.some(v=>v.id===info.viewId&&v.kind==='elevation'&&v.buildingId===proposal.buildingId&&v.direction===info.direction)),front=views.find(v=>v.direction==='front'),frontSource=inventory.views.find(v=>v.id===front?.viewId),fr=front&&R.elevationRegistration(front,reviewed,inventory);
  if(!front||!fr){issues.push('FLAT_ENTRY_FRONT_REGISTRATION_UNRESOLVED');return result();}
  const accepted=[];
  const allWalls=targets.flatMap(level=>M.wallsFor(level,inventory,{includeProposed:true}));
  for(const plan of candidates){
   const bands=frontBands(front,images[front.viewId],fr,plan);if(!bands.length){issues.push('FLAT_ENTRY_FRONT_FASCIA_UNRESOLVED');continue;}
   const compatible=[],failed=[];
   for(const band of bands){
   const owner=ownerAndDoor(targets,inventory,front,images[front.viewId],fr,plan,band);if(!owner){failed.push('FLAT_ENTRY_DOOR_OR_ATTACHMENT_UNRESOLVED');continue;}
   const [x,y,w,depth]=plan.physical;
   if(allWalls.some(wall=>wall.id!==owner.wall.id&&wall.normal[1]<-.999&&wall.from[1]<owner.wall.from[1]-.001&&
    Math.min(x+w,Math.max(wall.from[0],wall.to[0]))-Math.max(x,Math.min(wall.from[0],wall.to[0]))>.001&&
    Math.min(band.top,wall.base+wall.height)-Math.max(band.bottom,wall.base)>.001)){
    failed.push('FLAT_ENTRY_HIDDEN_BY_NEARER_VOLUME');continue;
   }
   const sides=[];let conflict=false;
   for(const info of views.filter(v=>['left','right'].includes(v.direction))){
    const source=inventory.views.find(v=>v.id===info.viewId),registration=R.elevationRegistration(info,reviewed,inventory);if(!registration)continue;
    const projection=sideProjection(info,source,images[info.viewId],registration,plan,band);
    if(!projection){conflict=true;continue;}
    sides.push({info,source,registration,projection});
   }
   if(!sides.length||conflict){failed.push('FLAT_ENTRY_SIDE_PROFILE_UNRESOLVED');continue;}
   if(plan.requiresBothSides&&(!sides.some(s=>s.info.direction==='left')||!sides.some(s=>s.info.direction==='right'))){failed.push('FLAT_ENTRY_TWO_SIDES_REQUIRED');continue;}
   const depthTolerance=Math.max(.05,...sides.map(s=>s.registration.sx*3));
   if(sides.some(s=>Math.abs(s.projection.visibleDepth-sides[0].projection.visibleDepth)>depthTolerance)){failed.push('FLAT_ENTRY_SIDE_DEPTH_CONFLICT');continue;}
   const heightResidual=sides.reduce((sum,s)=>sum+Math.abs(s.projection.top-band.top)+Math.abs(s.projection.bottom-band.bottom),0)/sides.length;
   compatible.push({plan,band,owner,sides,heightResidual});
   }
   // Side silhouettes choose the compatible full facing envelope. A longer
   // front-only rectangle can include cladding courses below the actual rim.
   compatible.sort((a,b)=>a.heightResidual-b.heightResidual||Math.abs(a.band.extentResiduals[1]-a.band.extentResiduals[0])-Math.abs(b.band.extentResiduals[1]-b.band.extentResiduals[0])||b.band.box[3]-a.band.box[3]);
   if(compatible.length)accepted.push(compatible[0]);else issues.push(...failed);
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
    planEvidence:{sourceViewId:planView.id,sourceFrame:copy(planView.frame),anchors:copy(plan.anchors),sourceBox:copy(plan.box),boxFormat:'xywh',scaleX:transform.scale,scaleY:transform.scale,kind:'estimated-calibrated',status:'proposed',alignment:copy(reviewed.alignment),footprint:copy(plan.footprint),label:labelRecord(plan.label),contextLabels:plan.context.map(labelRecord),leader:copy(plan.leader),boundaryMethod:plan.method,...(plan.depthConstraint?{depthConstraint:copy(plan.depthConstraint)}:{}),...(plan.boundaryEvidence?{boundaryEvidence:copy(plan.boundaryEvidence)}:{})},
    observedFascia:[fascia],connection:{kind:'plan-footprint-and-observed-flat-entry',parentWallId:wall.id,wallY:wall.from[1],frontExtentResiduals:copy(band.extentResiduals),doorEvidence:{sourceViewId:frontSource.id,sourceBox:copy(owner.door.box),method:owner.door.method},visibleSideProjection:sides.map(s=>({sourceViewId:s.source.id,visibleDepth:s.projection.visibleDepth,fullFootprintDepth:d,extentStatus:'visible-subset-of-plan-footprint',topResidual:s.projection.top-z,bottomResidual:s.projection.bottom-band.bottom}))},
    drainage:{slope:null,status:'unresolved',indicated:drainageIndicated},thickness:null,structuralSection:null,supportMaterial:'unknown',soffitStatus:'unresolved',complete:false,confirmationRequired:true,quantityStatus:'partial-unreviewed',note:'Flat exterior envelope from a linked plan footprint and observed fascia profiles; drainage slope, internal section and hidden underside are unmeasured.'};
   const report=byLevel.find(l=>l.levelId===level.id);report.reconstructedRoofs.push(roof);report.issues.push('FLAT_ENTRY_DRAINAGE_SLOPE_UNRESOLVED','FLAT_ENTRY_STRUCTURAL_SECTION_UNRESOLVED','FLAT_ENTRY_UNDERSIDE_UNRESOLVED');
  }
  return result();
 }
 return Object.freeze({version:1,build});
});
