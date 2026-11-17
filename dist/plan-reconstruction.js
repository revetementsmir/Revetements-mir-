/* Local source-to-model proposals. Review is explicit; legacy projects are read only. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision,node?require('./plan-import-core.js'):root.MIRPDFAnalysis,node?require('./plan-spatial-dimensions.js'):root.MIRSpatialDimensions,()=>node?require('./plan-grid-registration.js'):root.MIRGridRegistration);if(node)module.exports=api;else root.MIRPlanReconstruction=api;})(typeof window==='object'?window:globalThis,function(M,V,A,S,gridRegistration){
 'use strict';
 const normal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),size=v=>[v.payload.sourceWidth||v.zone?.[2]||v.frame?.rasterSize[0],v.payload.sourceHeight||v.zone?.[3]||v.frame?.rasterSize[1]];
 function readings(view){return view.payload.drawingReadings?.rows||[];}
 function contourDimensions(view,image){
  const rows=readings(view),vertical=view.payload.drawingReadings?.verticalRows||[],masks=V.legendBoxes(image,rows);
  const clean=rs=>rs.filter(r=>r.box?.length===4&&r.text.length<25&&r.box[0]<image.width*.81&&!masks.some(([x,y,w,h])=>(r.box[0]+r.box[2])/2>=x&&(r.box[0]+r.box[2])/2<=x+w&&(r.box[1]+r.box[3])/2>=y&&(r.box[1]+r.box[3])/2<=y+h)).map(r=>({...r,originalText:r.text,text:r.text.replace(/(\d)\s+[|Il](?=\s*['’′])/g,(_,d)=>d+'1').replace(/[*°]$/,'"').replace(/^(\d{1,2})[−-](\d{1,2})"?$/,`$1'$2"`)}));
  const labels=clean(rows),results=A.matchDimensionLines(image,labels,{minSpanPx:20,shortTicks:true,allowTextGap:true,preferReliableReadings:true});
  if(vertical.length){
   const turned={width:image.height,height:image.width,data:new Uint8ClampedArray(image.data.length)};
   for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const to=((image.width-1-x)*turned.width+y)*4,from=(y*image.width+x)*4;for(let c=0;c<4;c++)turned.data[to+c]=image.data[from+c];}
   const original=clean(vertical),rotated=original.map(r=>({...r,box:[r.box[1],image.width-r.box[2],r.box[3],image.width-r.box[0]]}));
   results.push(...A.matchDimensionLines(turned,rotated,{minSpanPx:20,shortTicks:true,allowTextGap:true,preferReliableReadings:true}).map(c=>A.unrotateCandidate(c,image.width,image.height)));
  }
  return results.map(r=>({...r,id:view.id+':dimension:'+r.anchors.flat().join('-')+':'+r.referenceFt,value:r.referenceFt*.3048,kind:'written',status:'proposed',sourceViewId:view.id,sourceFrame:M.clone(view.frame),label:r.text,scale:r.feetPerPixel*.3048,confirmationRequired:true}));
 }
 function floorDimensionAssociation(view,dimension,outline,image){
  const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
  if(!image?.data||!outline?.points?.length||!outline.points.every(point)||outline.sourceBounds?.length!==4||!outline.sourceBounds.every(Number.isFinite)||outline.sourceBounds[2]<=0||outline.sourceBounds[3]<=0||dimension.sourceViewId!==view.id||dimension.anchors?.length!==2||!dimension.anchors.every(point)||M.distance(...dimension.anchors)<20||view.frame&&JSON.stringify(dimension.sourceFrame)!==JSON.stringify(view.frame))return null;
  if(outline.sourceViewId&&outline.sourceViewId!==view.id||outline.sourceFrame&&JSON.stringify(outline.sourceFrame)!==JSON.stringify(view.frame))return null;
  for(const axis of [0,1]){const values=outline.points.map(p=>p[axis]);if(Math.abs(Math.min(...values)-outline.sourceBounds[axis])>3||Math.abs(Math.max(...values)-outline.sourceBounds[axis]-outline.sourceBounds[axis+2])>3)return null;}
  const points=outline.points,anchors=dimension.anchors,axis=Math.abs(anchors[0][0]-anchors[1][0])<=2?1:Math.abs(anchors[0][1]-anchors[1][1])<=2?0:null;
  if(axis===null)return null;
  const normalAxis=1-axis,ink=V.monochrome(image),w=image.width,h=image.height,pad=Math.max(1,Math.min(2,Math.round(w/1050))),bounds=outline.sourceBounds,reach=Math.max(20,Math.min(bounds[2],bounds[3])*.35),connections=[];
  for(const anchor of anchors){
   const candidates=[];
   for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];if(Math.abs(a[normalAxis]-b[normalAxis])>2||anchor[axis]<Math.min(a[axis],b[axis])-2||anchor[axis]>Math.max(a[axis],b[axis])+2)continue;
    const to=anchor.slice();to[normalAxis]=(a[normalAxis]+b[normalAxis])/2;const length=M.distance(anchor,to);if(length>reach)continue;
    let hits=0,gap=0,maxGap=0;const steps=Math.max(1,Math.ceil(length));
    for(let n=0;n<=steps;n++){
     const p=anchor.map((v,j)=>v+(to[j]-v)*n/steps);let hit=false;
     for(let d=-pad;d<=pad;d++){const q=p.slice();q[axis]+=d;const x=Math.round(q[0]),y=Math.round(q[1]);if(x>=0&&x<w&&y>=0&&y<h)hit||=!!ink[y*w+x];}
     if(hit){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);
    }
    const support=hits/(steps+1);if(support>=.82&&maxGap<=Math.max(3,pad*3))candidates.push({anchors:[anchor.slice(),to],contourEdgeIndex:i,support,maxGap,tolerancePx:pad,lengthPixels:length});
   }
   candidates.sort((a,b)=>a.lengthPixels-b.lengthPixels);if(!candidates.length)return null;connections.push(candidates[0]);
  }
  return {method:'observed-dimension-witnesses-to-floor',sourceViewId:view.id,sourceFrame:M.clone(view.frame),connections,confirmationRequired:true};
 }
 function floorExtentEvidence(dimension,outline,image){
  const bounds=outline?.sourceBounds,anchors=dimension?.anchors,points=outline?.points;
  if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[2]<=0||bounds[3]<=0||anchors?.length!==2||!anchors.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||!points?.length||!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return null;
  const axis=Math.abs(anchors[0][0]-anchors[1][0])<=2?1:Math.abs(anchors[0][1]-anchors[1][1])<=2?0:null;if(axis===null||M.distance(...anchors)<20)return null;
  const positions=anchors.map(p=>p[axis]).sort((a,b)=>a-b),ends=[bounds[axis],bounds[axis]+bounds[axis+2]],evidence=[],other=1-axis;let ink=null;
  for(let side=0;side<2;side++){
   const position=positions[side],extreme=ends[side],difference=Math.abs(position-extreme);
   if(difference<=3){evidence.push({method:'raster-endpoint-tolerance',differencePixels:difference,tolerancePx:3});continue;}
   // Thick source strokes have an outer edge distinct from the dimension's
   // centreline. A larger offset is allowed only inside the SAME observed
   // wall stroke, never from a percentage of the building's overall width.
   if(!image?.data||difference>8||side===0&&position<extreme||side===1&&position>extreme)return null;
   ink||=V.monochrome(image);let supported=null;
   for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],edge=(a[axis]+b[axis])/2;
    if(Math.abs(a[axis]-b[axis])>2||Math.abs(edge-extreme)>3||Math.abs(position-edge)>8)continue;
    const length=Math.abs(a[other]-b[other]),trim=Math.min(8,length*.1),start=Math.ceil(Math.min(a[other],b[other])+trim),end=Math.floor(Math.max(a[other],b[other])-trim);if(end-start<20)continue;
    const lo=Math.round(Math.min(edge,position)),hi=Math.round(Math.max(edge,position));let hits=0,gap=0,maxGap=0;
    for(let n=start;n<=end;n++){let hit=true;for(let u=lo;u<=hi;u++){const x=axis===0?u:n,y=axis===0?n:u;if(x<0||x>=image.width||y<0||y>=image.height||!ink[y*image.width+x]){hit=false;break;}}if(hit){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}
    const support=hits/(end-start+1);if(support>=.85&&maxGap<=Math.max(4,Math.min(10,length*.03))){supported={method:'observed-wall-stroke-band',contourEdgeIndex:i,position,sourceEdgePosition:edge,along:[start,end],support,maxGap,differencePixels:difference,maxOffsetPx:8};break;}
   }
   if(!supported)return null;evidence.push(supported);
  }
  return {axis:axis===0?'x':'y',sourceBounds:M.clone(bounds),endpoints:evidence,confirmationRequired:true};
 }
 function overallScaleReferences(view,dimensions,outline,image){
  const bounds=outline?.sourceBounds,references=[];
  if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[2]<=0||bounds[3]<=0)return references;
  for(const d of dimensions||[]){
   if(d.sourceViewId!==view.id||d.kind!=='written'||!Number.isFinite(d.value)||d.value<=0||d.anchors?.length!==2||!d.anchors.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||d.source!=='pdf-text'&&(d.confidence??0)<70)continue;
   const extentEvidence=floorExtentEvidence(d,outline,image);if(!extentEvidence)continue;
   const association=floorDimensionAssociation(view,d,outline,image);if(association)references.push({...M.clone(d),association:'observed-overall-floor-dimension',sourceAssociation:association,extentEvidence,confirmationRequired:true});
  }return references;
 }
 function partialScaleReferences(view,dimensions,bounds,{outline=null,image=null}={}){
  // Short written dimensions calibrate a view, not an entire wall.
  // Two distinct inscriptions must corroborate one common scale.
  if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[2]<=0||bounds[3]<=0)return {references:[],conflict:false};
  const [x,y,w,h]=bounds,pad=Math.max(12,Math.min(35,Math.min(w,h)*.08)),observed=[],unresolvedReferences=[];
  for(const d of dimensions||[]){
   if(d.sourceViewId!==view.id||d.kind!=='written'||!Number.isFinite(d.value)||d.value<=0||!Array.isArray(d.anchors)||d.anchors.length!==2||!d.anchors.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))continue;
   if(d.source!=='pdf-text'&&d.confidence!=null&&d.confidence<70)continue;
   const span=M.distance(...d.anchors);if(span<20||span>Math.max(w,h)*1.1)continue;
   const nearby=d.anchors.every(p=>p[0]>=x-pad&&p[0]<=x+w+pad&&p[1]>=y-pad&&p[1]<=y+h+pad),association=nearby?null:floorDimensionAssociation(view,d,outline,image);
   if(!nearby&&!association)continue;
   const lineEvidence=image?A.dimensionLineEvidence(image,d,{labels:[...readings(view),...(view.payload.drawingReadings?.verticalRows||[])]}):null;
   if(lineEvidence&&lineEvidence.status!=='observed'){unresolvedReferences.push({...M.clone(d),scaleEligibility:'unresolved',lineEvidence});continue;}
   if(observed.some(previous=>Math.min(M.distance(previous.anchors[0],d.anchors[0])+M.distance(previous.anchors[1],d.anchors[1]),M.distance(previous.anchors[0],d.anchors[1])+M.distance(previous.anchors[1],d.anchors[0]))<4&&Math.abs(previous.value-d.value)<.001))continue;
   observed.push({...d,...(association?{sourceAssociation:association}:{}),...(lineEvidence?{lineEvidence}:{})});
  }
  const captions=[];
  for(const d of observed){const box=d.textBox,duplicate=box?.length===4&&captions.some(previous=>{const p=previous.textBox;if(p?.length!==4)return false;const overlap=Math.max(0,Math.min(p[2],box[2])-Math.max(p[0],box[0]))*Math.max(0,Math.min(p[3],box[3])-Math.max(p[1],box[1]));return overlap/Math.min((p[2]-p[0])*(p[3]-p[1]),(box[2]-box[0])*(box[3]-box[1]))>.65;});if(!duplicate)captions.push(d);}
  if(captions.length<2)return {references:[],conflict:false,unresolvedReferences};
  // Assess these source-associated inscriptions only. A previous page-wide
  // OCR calibration may refer to another detail or include a stale reading.
  const assessment=M.referenceAssessment({...view,calibration:{}},observed);
  // Keep contradictory source readings in the candidate set so the pipeline
  // cannot silently replace their conflict with a separate overall dimension.
  return {references:observed.map(r=>({...M.clone(r),association:'independent-floor-dimensions',confirmationRequired:true})),conflict:!assessment.scale,assessment,unresolvedReferences};
 }
 function constrainContour(original,references){
  const draft=M.clone(original),unit=M.scale(draft),evidence=[];if(!unit)return draft;
  // This is a proposed, explicit operation. Loading a saved contour never
  // invokes it; source pixel points and stable corner IDs remain available.
  const source=original.points.map(p=>M.clone(p)),adjusted=source.map(p=>M.clone(p));
  for(const axis of [0,1]){
   const coords=[...new Set(source.map(p=>p.xy[axis]))].sort((a,b)=>a-b),links=[];
   for(const r of references){if(r.sourceViewId!==draft.sourceViewId||r.kind!=='written'||!(r.value>0)||r.anchors?.length!==2)continue;
    const [a,b]=r.anchors,other=1-axis;if(Math.abs(a[other]-b[other])>2||Math.abs(a[axis]-b[axis])<10)continue;
    const nearest=n=>coords.map((c,i)=>({i,d:Math.abs(c-n)})).sort((a,b)=>a.d-b.d)[0],lo=nearest(Math.min(a[axis],b[axis])),hi=nearest(Math.max(a[axis],b[axis]));
    if(lo.i===hi.i||lo.d>6||hi.d>6)continue;
    const raster=coords[hi.i]-coords[lo.i],target=r.value/unit,difference=target-raster,tolerance=Math.max(8,raster*.05);
    const uncertain=r.source!=='pdf-text'&&r.confidence!=null&&r.confidence<70;
    const item={axis,from:lo.i,to:hi.i,reference:M.clone(r),originalSpanPixels:raster,estimatedValue:raster*unit,value:r.value,differencePixels:difference,tolerancePixels:tolerance,status:!uncertain&&Math.abs(difference)<=tolerance?'proposed':'unresolved',reason:uncertain?'DIMENSION_TRANSCRIPTION_UNCERTAIN':Math.abs(difference)<=tolerance?null:'DIMENSION_SPAN_MISMATCH',confirmationRequired:true};evidence.push(item);if(item.status==='proposed')links.push(item);
   }
   const values=new Map(),conflicts=new Set();
   for(let root=0;root<coords.length;root++){if(values.has(root))continue;values.set(root,coords[root]);const queue=[root],component=new Set([root]);let conflict=false;
    while(queue.length){const i=queue.shift();for(const link of links.filter(l=>l.from===i||l.to===i)){const j=link.from===i?link.to:link.from,target=values.get(i)+(link.from===i?1:-1)*link.value/unit;
      if(values.has(j)){if(Math.abs(values.get(j)-target)*unit>.001)conflict=true;}else{values.set(j,target);queue.push(j);component.add(j);}}}
    if(conflict)for(const i of component)conflicts.add(i);
   }
   for(const link of links)if(conflicts.has(link.from)||conflicts.has(link.to))link.status='conflict';
   adjusted.forEach(p=>{const i=coords.indexOf(p.xy[axis]);if(!conflicts.has(i)){p.xy[axis]=values.get(i);delete p.pdfPoint;}});const originIndex=coords.indexOf(draft.alignment?.origin?.[axis]);if(originIndex>=0&&!conflicts.has(originIndex))draft.alignment.origin[axis]=values.get(originIndex);
  }
  if(M.validatePolygon(adjusted.map(p=>p.xy)).length)return {...draft,dimensionAdjustment:{status:'invalid',originalPoints:source,evidence}};
  draft.points=adjusted;draft.dimensionAdjustment={status:evidence.some(e=>e.status==='conflict')?'conflict':'proposed',originalPoints:source,evidence,kind:'written-dimensions-on-associated-contour-planes',confirmationRequired:true};return draft;
 }
 function openingSize(text){
  const original=String(text).trim(),normalized=original.replace(/^[|_\s]*[lL]?(?=\s*\d)/,'').replace(/[\s|_]+$/,'').replace(/\s+[lL]$/,'').trim().normalize('NFKC').replace(/[″“”°*]/g,'"').replace(/[′’]/g,"'").replace(/[oO]/g,'0').replace(/(?<=\d)G(?=["\s])/g,'6'),match=normalized.match(/^(?:(\d+)\s*[x×]\s*\()?\s*(\d+(?:\.\d+)?)\s*(?:"|po|in)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:"|po|in)\s*\)?$/i);
  if(!match)return null;const count=Number(match[1]||1),width=Number(match[2])*.0254,height=Number(match[3])*.0254;if(!(count>=1&&count<=12&&width>=.15&&width<=6&&height>=.15&&height<=4))return null;
  return {width,height,count,label:original,normalized,transcriptionReviewRequired:normalized!==original,kind:'written',status:'proposed',confirmationRequired:true};
 }
 function floorOpeningSizes(view,points,gaps){
  const orientation=Math.sign(M.signedArea(points)),result=[];
  for(const row of readings(view)){const parsed=openingSize(row.text);if(!parsed||!row.box)continue;const center=[(row.box[0]+row.box[2])/2,(row.box[1]+row.box[3])/2],font=Math.max(6,Math.min(row.box[2]-row.box[0],row.box[3]-row.box[1]));
   const matches=gaps.map((gap,i)=>{const a=points[gap.edgeIndex],b=points[(gap.edgeIndex+1)%points.length],length=M.distance(a,b),u=b.map((n,k)=>(n-a[k])/length),n=[orientation*u[1],-orientation*u[0]],out=(center[0]-a[0])*n[0]+(center[1]-a[1])*n[1],mid=gap.anchors[0].map((v,k)=>(v+gap.anchors[1][k])/2),along=Math.abs((center[0]-mid[0])*u[0]+(center[1]-mid[1])*u[1]),span=M.distance(...gap.anchors);return {i,out,along,span,score:along+out*.2};}).filter(m=>m.out>=-font&&m.out<=Math.max(95,font*12)&&m.along<Math.max(font*3,m.span*.55)).sort((a,b)=>a.score-b.score);
   if(!matches.length||matches[1]&&matches[1].score-matches[0].score<5)continue;
   const gap=gaps[matches[0].i],candidate={...parsed,sourceViewId:view.id,sourceFrame:M.clone(view.frame),sourceBox:M.clone(row.box),confidence:row.confidence,edgeIndex:gap.edgeIndex,anchors:M.clone(gap.anchors),association:'caption-adjacent-to-exterior-floor-opening',transcriptionReviewRequired:parsed.transcriptionReviewRequired||row.confidence<70};
   if(!result.some(r=>r.edgeIndex===candidate.edgeIndex&&r.width===candidate.width&&r.height===candidate.height&&M.distance(r.anchors[0],candidate.anchors[0])<4))result.push(candidate);
  }return result;
 }
 function constrainProposal(draft,proposal){
  const next=constrainContour(draft,proposal.contourDimensions||[]),height=next.height,v=proposal.views.find(v=>v.viewId===height?.sourceViewId);
  if(height?.kind==='estimated-calibrated'&&['floor-span-to-elevation-registration','two-visible-level-datums'].includes(height.relationship)&&v?.envelope.status==='proposed'){
   const scale=registeredSpan(M.modelPoints(next),v.direction,v.envelope,{world:true}).length/v.envelope.box[2];height.value=M.distance(...height.anchors)*scale;height.scaleUsed=scale;
   for(const ref of height.references){ref.value=M.distance(...ref.anchors)*scale;ref.relationship=height.relationship==='two-visible-level-datums'?{...ref.relationship,sourceReference:M.clone(next.reference),contourAdjustment:M.clone(next.dimensionAdjustment)}:{...M.clone(next.reference),contourAdjustment:M.clone(next.dimensionAdjustment)};}
  }
  return next;
 }
 function referenceObservations(view,image){
  const masks=V.legendBoxes(image,readings(view)),rows=readings(view).filter(r=>r.box?.length===4&&r.text.length<50&&r.box[0]<image.width*.81&&!masks.some(([x,y,w,h])=>(r.box[0]+r.box[2])/2>=x&&(r.box[0]+r.box[2])/2<=x+w&&(r.box[1]+r.box[3])/2>=y&&(r.box[1]+r.box[3])/2<=y+h));
  const labels=rows.map(r=>{const rewrite=r.text.replace(/^(\d{1,2})[−-](\d{1,2})\"?$/,`$1'$2"`);return {...r,text:rewrite,originalText:r.text,punctuationReview:rewrite!==r.text};});
  const ordinary=A.matchDimensionLines(image,labels,{shortTicks:true,allowTextGap:true,preferReliableReadings:true});
  // Raster downsampling can leave true dimension lines paler than wall ink.
  // This extra path requires original neutral strokes, two diagonal marks
  // and continuing witnesses; it never relaxes the wall/legacy ink mask.
  const longLabels=A.wordsToLabels(labels,{includeProvenance:true}).filter(r=>(A.parseDimension(r.text,{ocr:r.source!=='pdf-text'})?.valueFt||0)>=9),pale=A.matchDimensionLines(image,longLabels,{shortTicks:true,allowTextGap:true,preferReliableReadings:true,lightConstructionLines:true,requireDimensionMarks:true,allowCrossedTerminals:true});
  const matched=ordinary.slice();for(const candidate of pale){const same=matched.findIndex(r=>Math.abs(r.referenceFt-candidate.referenceFt)<1e-9&&r.textBox.every((n,i)=>Math.abs(n-candidate.textBox[i])<2));if(same<0)matched.push(candidate);else if(!matched[same].lineEvidence)matched[same]=candidate;}
  const observed=[],unresolvedReferences=[];
  for(const r of matched.filter(r=>r.referenceFt>=9&&r.spanPx>image.width*.18&&r.confidence>=0)){
   const original=labels.find(l=>l.box.every((n,i)=>Math.abs(n-r.textBox[i])<2)&&l.text===r.text),lineEvidence=r.lineEvidence?.status==='observed'?r.lineEvidence:A.dimensionLineEvidence(image,r,{labels:readings(view)});
   const candidate={...r,value:r.referenceFt*.3048,kind:'written',status:'proposed',sourceViewId:view.id,sourceFrame:M.clone(view.frame),label:original?.originalText||r.text,punctuationReview:!!original?.punctuationReview,transcriptionReviewRequired:r.confidence<50||!!original?.punctuationReview,scale:r.feetPerPixel*.3048,lineEvidence,confirmationRequired:true};
   // A high-confidence inscription does not prove its association to a span.
   // Keep the failed association for review, without using it as a metric
   // reference or declaring a contradiction against an independently read view.
   if(lineEvidence.status==='observed')observed.push(candidate);else unresolvedReferences.push({...candidate,scaleEligibility:'unresolved'});
  }
  return {references:observed,unresolvedReferences};
 }
 function references(view,image){return referenceObservations(view,image).references;}
 function wallSupport(view,image,envelope){
  const candidates=[];for(const row of readings(view)){const label=normal(row.text);if(!/sabliere|fermes de toit|appuis des|top of (?:wall|plate)|ceiling/.test(label)||!row.box||row.confidence<25)continue;const [l,t,r,b]=row.box,font=Math.max(5,b-t);if(Math.abs((t+b)/2-envelope.box[1])>45)continue;
   for(let y=Math.max(0,Math.floor(t-font*1.8));y<=Math.min(image.height-1,Math.ceil(b+font*1.8));y++){if(y>=t&&y<=b)continue;const line=S.horizontalRun(image,y,Math.max(0,Math.floor(l-font*3)),Math.min(image.width-1,Math.ceil(r+font*2)),230,18);if(!line||line.end-line.start<(r-l)*.8)continue;const distance=Math.abs(y-envelope.box[1]);if(distance>28)continue;candidates.push({y,line:{start:line.start,end:line.end},sourceViewId:view.id,label:row.text,box:M.clone(row.box),confidence:row.confidence,sourceFrame:M.clone(view.frame),score:(line.end-line.start)-distance*3});}
  }candidates.sort((a,b)=>b.score-a.score);return candidates[0]||null;
 }
 function datumFromCaption(text){
  const label=normal(text).replace(/^(?:[a-z0-9:|_]\s+)?(?:(?:dessus|top of)\s+)?/,'');
  // Preserve legacy English labels used by single-storey imports.
  const older=label.match(/^(upper|second|2nd|ground|main)\s+floor\b/);
  if(older)return {levelHint:/^(ground|main)$/.test(older[1])?'ground':'upper',datumType:'floor'};
  if(!/^(?:plancher|plafond|floor\b|ceiling\b)/.test(label))return null;
  const datumType=/^(?:plafond|ceiling\b)/.test(label)?'ceiling':'floor';
  const number=label.match(/\b(?:niv(?:eau)?\.?|level|etage)\s*(\d{1,2})\b/);
  const levelHint=number?'level-'+Number(number[1]):/\b(?:r[.\s-]*d[.\s-]*c|rez[ -]de[ -]chaussee|ground)\b/.test(label)?'ground':/\b(?:etage|upper|second|2nd)\b/.test(label)?'upper':null;
  return levelHint?{levelHint,datumType}:null;
 }
 function floorGuide(view,image,envelope){
  // Read actual datum strokes in the view frame before fitting a facade.
  // A partial wall spine must not erase the ceiling above or foundation below.
  const w=image?.width,h=image?.height;
  if(!view||!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||!image.data||image.data.length!==w*h*4||view.kind&&!['elevation','section'].includes(view.kind))return [];
  const declared=[view.payload?.sourceWidth||view.frame?.rasterSize?.[0],view.payload?.sourceHeight||view.frame?.rasterSize?.[1]];
  if(declared.some((n,i)=>n!=null&&(!Number.isFinite(n)||n!==[w,h][i])))return [];
  const rows=readings(view),crop=[0,0,w,h],items=[],masks=envelope?.occlusions||V.legendBoxes(image,rows);
  for(const row of rows){
   const datum=datumFromCaption(row.text),text=normal(row.text);
   if(!datum||/\b(?:notes?|index|sommaire|contents|legende|legend|cartouche|title|titre|schedule|tableau|table|plan|voir|see)\b/.test(text)||row.box?.length!==4||!row.box.every(Number.isFinite)||(row.confidence??0)<30)continue;
   const [left,top,right,bottom]=row.box;
   if(left<0||top<0||right>w||bottom>h||right<=left||bottom<=top||masks.some(([x,y,rw,rh])=>left<x+rw&&right>x&&top<y+rh&&bottom>y))continue;
   let line=S.guide(image,row.box,crop);
   if(!line){const font=Math.max(4,bottom-top);for(let y=Math.ceil(bottom+1);y<=Math.min(h-1,Math.ceil(bottom+font*1.7));y++){const candidate=S.horizontalRun(image,y,Math.max(0,Math.floor(left-font*3)),Math.min(w-1,Math.ceil(right+font*2)),238,18);if(candidate&&candidate.end-candidate.start>(right-left)*.85&&(!line||candidate.end-candidate.start-(y-bottom)*2>line.end-line.start-(line.y-bottom)*2))line=candidate;}}
   if(!line||!Number.isInteger(line.y)||line.y<0||line.y>=h||line.start<0||line.end>=w||masks.some(([x,y,rw,rh])=>line.start<x+rw&&line.end>x&&line.y>=y&&line.y<=y+rh))continue;
   // Text baselines and coloured markups are not physical datum guides.
   let supported=0;for(let x=line.start;x<=line.end;x++){const n=(line.y*w+x)*4,d=image.data,hi=Math.max(d[n],d[n+1],d[n+2]),lo=Math.min(d[n],d[n+1],d[n+2]);supported+=Number(d[n+3]>100&&hi<238&&hi-lo<45);}
   const support=supported/(line.end-line.start+1);if(support<.7)continue;
   items.push({sourceViewId:view.id,label:row.text,box:M.clone(row.box),y:line.y,sourceFrame:M.clone(view.frame),levelHint:datum.levelHint,datumType:datum.datumType,confidence:row.confidence,sourceGuide:{anchors:[[line.start,line.y],[line.end,line.y]],support,frameSize:[w,h],method:'caption-and-visible-monochrome-datum-stroke'},confirmationRequired:true});
  }
  const keep=[];for(const item of items.sort((a,b)=>b.confidence-a.confidence))if(!keep.some(q=>q.levelHint===item.levelHint&&q.datumType===item.datumType&&(Math.abs(q.y-item.y)<6||Math.max(0,Math.min(q.box[2],item.box[2])-Math.max(q.box[0],item.box[0]))*Math.max(0,Math.min(q.box[3],item.box[3])-Math.max(q.box[1],item.box[1]))/Math.min((q.box[2]-q.box[0])*(q.box[3]-q.box[1]))>.65)))keep.push(item);return keep;
 }
 function comparableDatumHeights(observations){
  // Floor-to-floor and floor-to-ceiling observations measure different spans.
  // Keep all source observations, but compare only one architectural pair.
  const floors=observations.filter(h=>h.datumEvidence.upper.datumType==='floor');
  return floors.length?floors:observations;
 }
 function heightFromLevelDatums(views,levelHint,reference,inventory,{includeAlternativePairs=false}={}){
  // No invented height: both limits must be visible on the same elevation.
  // A floor at level N is paired to level N+1, or a ceiling at level N.
  const next=/^level-\d+$/.test(levelHint)?'level-'+(Number(levelHint.slice(6))+1):levelHint==='ground'?'upper':null,found=[];
  if(!(reference?.scale>0))return found;
  for(const v of views){
   if(v.envelope?.status!=='proposed'||!(v.envelope.box?.[2]>0)||!(v.facing?.length>0))continue;
   const bottom=v.guides?.filter(g=>g.levelHint===levelHint&&g.datumType==='floor').sort((a,b)=>b.confidence-a.confidence)[0];if(!bottom)continue;
   const nextFloors=(v.guides||[]).filter(g=>g.levelHint===next&&g.datumType==='floor'&&g.y<bottom.y-10),ceilings=(v.guides||[]).filter(g=>g.levelHint===levelHint&&g.datumType==='ceiling'&&g.y<bottom.y-10);
   const top=(nextFloors.length?nextFloors:ceilings).sort((a,b)=>b.confidence-a.confidence)[0];if(!top)continue;
   const scale=reference.scale*v.facing.length/v.envelope.box[2],pixels=bottom.y-top.y,value=scale*pixels;
   const exactBand=v.envelope.gridRegistration?.status==='proposed'&&v.envelope.verticalDatums?.from?.y===bottom.y&&v.envelope.verticalDatums?.to?.y===top.y;
   if(!(value>=.45&&value<=20)||!exactBand&&pixels>v.envelope.box[3]*.8)continue;
   const anchors=[[v.envelope.box[0],bottom.y],[v.envelope.box[0],top.y]],sourceFrame=inventory?.views?.find(s=>s.id===v.viewId)?.frame||bottom.sourceFrame||null;
   // A reference measured in plan pixels is not an elevation calibration.
   // Preserve that written source through an explicit span correspondence, and
   // express the derived calibration with anchors in this elevation's frame.
   const elevationReference={kind:'estimated-calibrated',status:'proposed',value:scale*v.envelope.box[2],sourceViewId:v.viewId,sourceFrame:M.clone(sourceFrame),anchors:[[v.envelope.box[0],bottom.y],[v.envelope.box[0]+v.envelope.box[2],bottom.y]],relationship:{kind:'floor-to-elevation-span',sourceReference:M.clone(reference),sourcePlanSpan:M.clone(v.facing),...(v.envelope.gridRegistration?{gridRegistration:M.clone(v.envelope.gridRegistration)}:{})},confirmationRequired:true};
   found.push({kind:'estimated-calibrated',status:'proposed',value,sourceViewId:v.viewId,sourceFrame:M.clone(sourceFrame),anchors,scaleUsed:scale,label:bottom.label+' / '+top.label,references:[elevationReference],relationship:'two-visible-level-datums',datumEvidence:{lower:M.clone(bottom),upper:M.clone(top),differencePixels:pixels,sourceViewId:v.viewId},confirmationRequired:true});
  }
  found.sort((a,b)=>b.datumEvidence.lower.confidence+b.datumEvidence.upper.confidence-a.datumEvidence.lower.confidence-a.datumEvidence.upper.confidence);
  return includeAlternativePairs?found:comparableDatumHeights(found);
 }
 function faceSpan(points,direction,{world=false}={}){const n={front:[0,world?-1:1],back:[0,world?1:-1],right:[1,0],left:[-1,0]}[direction],axis=['front','back'].includes(direction)?0:1,sign=Math.sign(M.signedArea(points)),edges=points.map((a,i)=>[a,points[(i+1)%points.length]]).filter(([a,b])=>(sign*(b[1]-a[1])*n[0]+sign*(a[0]-b[0])*n[1])>0),coordinates=edges.flatMap(e=>e.map(p=>p[axis])),total=Math.max(...coordinates)-Math.min(...coordinates),dominant=edges.slice().sort((a,b)=>Math.abs(b[0][axis]-b[1][axis])-Math.abs(a[0][axis]-a[1][axis]))[0],chosen=dominant&&Math.abs(dominant[0][axis]-dominant[1][axis])>total*.75?dominant.map(p=>p[axis]):coordinates;return {axis,min:Math.min(...chosen),max:Math.max(...chosen),length:Math.max(...chosen)-Math.min(...chosen)};}
 function registeredSpan(points,direction,envelope,{world=false}={}){
  if(!envelope?.gridRegistration)return faceSpan(points,direction,{world});
  // Named axes register the whole contour projection, including its returns.
  // The legacy dominant facade span remains applicable to raster-only fits.
  const axis=['front','back'].includes(direction)?0:1,values=points.map(p=>p[axis]),min=Math.min(...values),max=Math.max(...values);
  return {axis,min,max,length:max-min};
 }
 function gridElevationEnvelope(Grid,floor,elevation,images,outline,guides){
  if(!Grid?.alignElevationAxes)return {status:'unresolved',reason:'ELEVATION_GRID_UNAVAILABLE'};
  if(outline.sourceViewId!==floor.id||!Array.isArray(outline.points)||outline.points.length<3||outline.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))return {status:'unresolved',reason:'ELEVATION_GRID_CONTOUR_SOURCE_REQUIRED'};
  const registration=Grid.alignElevationAxes(floor,elevation,images[floor.id],images[elevation.id]);if(registration.status!=='proposed')return registration;
  const hint=floor.levelId,next=/^level-\d+$/.test(hint)?'level-'+(Number(hint.slice(6))+1):hint==='ground'?'upper':null;
  const sourceGuides=guides.filter(g=>g.sourceViewId===elevation.id&&Number.isFinite(g.y)&&(g.confidence??0)>=30&&g.sourceGuide?.method==='caption-and-visible-monochrome-datum-stroke'&&g.sourceGuide.support>=.7&&g.sourceGuide.anchors?.length===2&&g.sourceGuide.anchors.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[1]===g.y));
  const select=(level,type)=>{const items=sourceGuides.filter(g=>g.levelHint===level&&g.datumType===type).sort((a,b)=>(b.confidence||0)-(a.confidence||0));return {items,chosen:items[0],conflict:items.some(g=>Math.abs(g.y-items[0].y)>2)};};
  const bottom=select(hint,'floor'),topNext=select(next,'floor'),topCeiling=select(hint,'ceiling'),top=topNext.items.length?topNext:topCeiling;
  if(bottom.conflict||top.conflict)return {status:'conflict',reason:'ELEVATION_GRID_DATUM_CONFLICT',registration,datums:{bottom,top}};
  if(!bottom.chosen||!top.chosen||!(bottom.chosen.y-top.chosen.y>10))return {status:'unresolved',reason:'ELEVATION_GRID_LEVEL_DATUM_REQUIRED',registration,datums:{bottom,top}};
  const axis=registration.transform.floorAxis==='x'?0:1,xs=outline.points.map(p=>p[axis]*registration.transform.scale+registration.transform.offset),left=Math.min(...xs),right=Math.max(...xs),im=images[elevation.id];
  if(left<0||right>im.width-1||!(right>left)||top.chosen.y<0||bottom.chosen.y>im.height-1)return {status:'unresolved',reason:'ELEVATION_GRID_OUTSIDE_SOURCE_FRAME',registration};
  return {status:'proposed',method:'floor-contour-shared-axes-and-visible-level-datums',sourceViewId:elevation.id,sourceFrame:M.clone(elevation.frame||null),box:[left,top.chosen.y,right-left,bottom.chosen.y-top.chosen.y],occlusions:[],gridRegistration:registration,verticalDatums:{from:M.clone(bottom.chosen),to:M.clone(top.chosen)},sourceContour:{sourceViewId:floor.id,sourceFrame:M.clone(floor.frame||null),points:M.clone(outline.points)},confirmationRequired:true,geometryCreated:false};
 }
 function crossFloorOutline(inventory,floor,images,original){
  // A detected contour on another level is only a search template. Every
  // projected edge must still exist in this level's own raster; aligned
  // axes never certify equal floor footprints, dimensions or wall heights.
  const image=images[floor.id],Grid=gridRegistration(),attempts=[],candidates=[];
  if(!Grid||!image?.data||!floor.buildingId||!floor.levelId||original.status==='proposed'||['SOURCE_SIZE','WALL_NETWORK_AMBIGUOUS'].includes(original.reason))return original;
  const floors=inventory.views.filter(v=>v.kind==='floor'&&v.buildingId===floor.buildingId),counts=new Map();
  for(const v of floors)counts.set(v.levelId,(counts.get(v.levelId)||0)+1);
  if(counts.get(floor.levelId)!==1)return original;
  for(const donor of floors.filter(v=>v.id!==floor.id&&v.levelId&&v.levelId!==floor.levelId).sort((a,b)=>a.id.localeCompare(b.id))){
   const attempt={sourceViewId:donor.id,sourceLevel:donor.levelId,status:'unresolved'};attempts.push(attempt);
   if(counts.get(donor.levelId)!==1){attempt.reason='FLOOR_SOURCE_AMBIGUOUS';continue;}
   const source=images[donor.id];if(!source?.data){attempt.reason='SOURCE_UNAVAILABLE';continue;}
   const outline=V.floorEnvelope(source,{sourceViewId:donor.id,frame:donor.frame,rows:readings(donor)});
   if(outline.status!=='proposed'||M.validatePolygon(outline.points).length){attempt.reason=outline.reason||'DONOR_BOUNDARY_INVALID';continue;}
   const registration=Grid.alignViews(donor,floor,source,image);attempt.registration=M.clone(registration);
   if(registration.status!=='proposed'){attempt.reason=registration.reason;continue;}
   // alignViews maps moving(target) pixels into reference(donor) pixels.
   // Keep its inverse explicit so crops/scales cannot swap source frames.
   const t=registration.transform,inverse={scaleX:1/t.scaleX,offsetX:-t.offsetX/t.scaleX,scaleY:1/t.scaleY,offsetY:-t.offsetY/t.scaleY};
   const projected=outline.points.map(([x,y])=>[x*inverse.scaleX+inverse.offsetX,y*inverse.scaleY+inverse.offsetY]);
   if(M.validatePolygon(projected).length||projected.some(([x,y])=>x<0||y<0||x>=image.width||y>=image.height)){attempt.reason='PROJECTED_BOUNDARY_INVALID';continue;}
   // Keep corner identity independent of the donor's start vertex/winding.
   const indexes=projected.map((_,i)=>i);if(M.signedArea(projected)<0)indexes.reverse();
   const left=Math.min(...projected.map(p=>p[0])),tolerance=Math.max(2,Math.round(image.width/525)),first=indexes.filter(i=>projected[i][0]<=left+tolerance).sort((a,b)=>projected[a][1]-projected[b][1]||projected[a][0]-projected[b][0])[0],at=indexes.indexOf(first),sourceIndexes=[...indexes.slice(at),...indexes.slice(0,at)],points=sourceIndexes.map(i=>projected[i]);
   const edgeEvidence=V.floorBoundaryEvidence(image,points);attempt.sourceEdgeEvidence=M.clone(edgeEvidence);
   attempt.status=edgeEvidence.every(e=>e.status==='proposed')?'proposed':'unresolved';attempt.reason=attempt.status==='proposed'?null:'BOUNDARY_SOURCE_SUPPORT';
   candidates.push({donor,outline,registration,inverse,points,sourceIndexes,edgeEvidence,attempt});
  }
  const recovery={method:'cross-floor-labelled-grid-and-target-strokes',originalReason:original.reason,attempts,confirmationRequired:true};
  if(!candidates.length)return {...original,recovery};
  // Different source-supported footprints are legitimate between levels.
  // Refuse a choice between incompatible donors, including when both happen
  // to coincide with parts of the target's interior wall network.
  const tolerance=Math.max(2,Math.round(image.width/525)),distanceTo=(p,polygon)=>Math.min(...polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dy);}));
  const follows=(a,b)=>a.every((p,i)=>{const q=a[(i+1)%a.length],n=Math.max(1,Math.ceil(M.distance(p,q)/tolerance));for(let k=0;k<=n;k++)if(distanceTo(p.map((v,j)=>v+(q[j]-v)*k/n),b)>tolerance)return false;return true;});
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++)if(!follows(candidates[i].points,candidates[j].points)||!follows(candidates[j].points,candidates[i].points))return {status:'unresolved',reason:'CROSS_FLOOR_OUTLINE_CONFLICT',recovery:{...recovery,conflictingSourceViewIds:[candidates[i].donor.id,candidates[j].donor.id],tolerancePx:tolerance}};
  const supported=candidates.filter(c=>c.attempt.status==='proposed');if(!supported.length)return {...original,recovery};
  const chosen=supported[0],xs=chosen.points.map(p=>p[0]),ys=chosen.points.map(p=>p[1]);
  return {status:'proposed',method:'cross-floor-labelled-grid-and-target-strokes',sourceViewId:floor.id,sourceFrame:M.clone(floor.frame||null),points:chosen.points,sourceBounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)],sourceEdgeEvidence:M.clone(chosen.edgeEvidence),metricScale:null,confirmationRequired:true,
   excludes:['coloured-masks','unobserved-target-edges','unregistered-levels','conflicting-floor-footprints'],
   recovery:{...recovery,sourceViewId:floor.id,sourceFrame:M.clone(floor.frame||null),sourcePoints:M.clone(chosen.points),donorSourceViewId:chosen.donor.id,donorSourceFrame:M.clone(chosen.donor.frame||null),donorOutline:M.clone(chosen.outline),donorPointIndices:M.clone(chosen.sourceIndexes),registration:M.clone(chosen.registration),donorToTargetTransform:M.clone(chosen.inverse),gridObservations:{donor:Grid.markers(chosen.donor,images[chosen.donor.id]),target:Grid.markers(floor,image)},corroboratingSourceViewIds:supported.map(c=>c.donor.id)},
   warning:'A registered contour is supported by this level’s own source strokes; ownership and measurements remain proposed.'};
 }
 function propose(inventory,buildingId,images,{levelId}={}){
  const levels=inventory.levels.filter(l=>l.buildingId===buildingId&&(!levelId||l.id===levelId)),level=levels.find(l=>inventory.views.some(v=>v.kind==='floor'&&v.levelId===l.sourceLevel&&v.buildingId===buildingId));
  if(!level)return {version:1,status:'unresolved',reason:'FLOOR_SOURCE_REQUIRED'};
  const plans=inventory.views.filter(v=>v.kind==='floor'&&v.levelId===level.sourceLevel&&v.buildingId===buildingId);if(plans.length!==1)return {version:1,status:'unresolved',reason:'FLOOR_SOURCE_AMBIGUOUS'};
  const floor=plans[0],image=images[floor.id];if(!image)return {version:1,status:'unresolved',reason:'SOURCE_UNAVAILABLE'};
  const detected=V.floorEnvelope(image,{sourceViewId:floor.id,frame:floor.frame,rows:readings(floor)}),outline=detected.status==='proposed'?detected:crossFloorOutline(inventory,floor,images,detected);if(outline.status!=='proposed')return {version:1,status:'unresolved',reason:outline.reason,...(outline.recovery?{outlineRecovery:outline.recovery}:{})};
  const bounds=outline.sourceBounds,elevations=inventory.views.filter(v=>v.buildingId===buildingId&&v.kind==='elevation'&&['front','right','back','left'].includes(v.direction)),views=[];
  for(const v of elevations){const im=images[v.id];if(!im)continue;const legacySpan=faceSpan(outline.points,v.direction),rasterEnvelope=V.wallEnvelope(im,legacySpan.length,{sourceViewId:v.id,frame:v.frame,occlusions:V.legendBoxes(im,readings(v)),rows:readings(v)}),referenceReading=referenceObservations(v,im),refs=referenceReading.references,guides=floorGuide(v,im,rasterEnvelope),axisEnvelope=gridElevationEnvelope(gridRegistration(),floor,v,images,outline,guides);
   // Missing axes preserve the existing single-house path. Contradictory axes,
   // frames or datums never fall back to a visually plausible facade box.
   const absent=['ELEVATION_GRID_UNAVAILABLE','ELEVATION_GRID_FLOOR_AXES_REQUIRED','ELEVATION_GRID_LABELS_REQUIRED'].includes(axisEnvelope.reason),envelope=axisEnvelope.status==='proposed'?{...axisEnvelope,occlusions:rasterEnvelope.occlusions||V.legendBoxes(im,readings(v))}:absent?rasterEnvelope:axisEnvelope,facing=registeredSpan(outline.points,v.direction,envelope),support=envelope.status==='proposed'&&!envelope.gridRegistration?wallSupport(v,im,envelope):null;
   views.push({viewId:v.id,direction:v.direction,facing,envelope,axisRegistration:axisEnvelope.gridRegistration||axisEnvelope.registration||axisEnvelope,supportY:support?.y??envelope.box?.[1],supportEvidence:support,roofProfile:V.roofProfile(im,envelope,readings(v)),references:refs,unresolvedScaleReferences:referenceReading.unresolvedReferences,guides});
  }
  const floorReferences=referenceObservations(floor,image),dimensions=contourDimensions(floor,image),direct=[...floorReferences.references.flatMap(r=>{const extentEvidence=floorExtentEvidence(r,outline,image);return extentEvidence?[{...r,extentEvidence}]:[];}),...overallScaleReferences(floor,dimensions,outline,image)];
  // Transferring a written elevation span to a plan is itself an estimated
  // correspondence, never a second written dimension on the floor plan.
  const transferred=views.filter(v=>v.envelope.status==='proposed').flatMap(v=>v.references.filter(r=>Math.abs(r.spanPx/v.envelope.box[2]-1)<.05).map(r=>{
   const axis=v.facing.axis,anchors=axis===0?[[v.facing.min,bounds[1]],[v.facing.max,bounds[1]]]:[[bounds[0],v.facing.min],[bounds[0],v.facing.max]];
   return {...r,kind:'estimated-calibrated',sourceViewId:floor.id,sourceFrame:M.clone(floor.frame),anchors,scale:r.value/M.distance(...anchors),sourceReference:M.clone(r),relationship:{kind:'floor-to-elevation-span',sourceViewId:v.viewId,direction:v.direction,status:'proposed',confirmationRequired:true}};
  }));
  const partial=partialScaleReferences(floor,dimensions,bounds,{outline,image});
  const candidates=[...direct,...partial.references,...transferred].sort((a,b)=>Number(String(b.normalized||'').includes("'"))-Number(String(a.normalized||'').includes("'"))||Number(a.kind!=='written')-Number(b.kind!=='written')||(b.confidence||0)-(a.confidence||0)||(b.score||0)-(a.score||0)),reference=candidates[0];
  const draft=M.draftFor(floor,level);draft.points=outline.points.map((xy,i)=>({id:'auto-'+floor.id+'-p'+i,xy}));draft.proposal={...outline,points:undefined};draft.alignment={origin:[bounds[0],bounds[1]+bounds[3]],offset:[0,0],rotationDegrees:0,status:'proposed',kind:'source-orientation-review'};
  if(reference)draft.reference={...M.clone(reference),controlReferences:[],assessment:{status:'review-required'},status:'proposed'};
  if(reference)for(const v of views.filter(v=>v.envelope.gridRegistration)){
   const source=inventory.views.find(s=>s.id===v.viewId),written=v.references.filter(r=>r.kind==='written'&&!r.transcriptionReviewRequired&&(r.confidence??0)>=70),checks=(written.length?written:[null]).map(elevationReference=>gridRegistration().elevationAxisRegistration(floor,source,image,images[v.viewId],draft,{elevationReference}));
   v.metricGridRegistration=checks.find(c=>c.status!=='proposed')||checks[0];
   if(v.metricGridRegistration.status!=='proposed')v.envelope={...v.envelope,status:v.metricGridRegistration.status,reason:v.metricGridRegistration.reason};
  }
  const legacyHeights=views.flatMap(v=>v.guides.filter(g=>g.levelHint===level.sourceLevel&&g.datumType==='floor'&&v.envelope.status==='proposed').map(g=>{
   const localScale=reference?reference.scale*v.facing.length/v.envelope.box[2]:null,anchors=[[v.envelope.box[0],g.y],[v.envelope.box[0],v.supportY??v.envelope.box[1]]];
   return {kind:'estimated-calibrated',status:'proposed',value:localScale?M.distance(...anchors)*localScale:null,sourceViewId:v.viewId,sourceFrame:M.clone(inventory.views.find(x=>x.id===v.viewId).frame),anchors,scaleUsed:localScale,label:g.label,references:reference?[{kind:'estimated-calibrated',value:localScale*v.envelope.box[2],anchors:[[v.envelope.box[0],g.y],[v.envelope.box[0]+v.envelope.box[2],g.y]],sourceViewId:v.viewId,relationship:M.clone(reference)}]:[],relationship:'floor-span-to-elevation-registration',confirmationRequired:true};
  })).filter(h=>h.value>0).sort((a,b)=>views.find(v=>v.viewId===b.sourceViewId).guides.find(g=>g.levelHint===level.sourceLevel).confidence-views.find(v=>v.viewId===a.sourceViewId).guides.find(g=>g.levelHint===level.sourceLevel).confidence);
  const datumObservations=heightFromLevelDatums(views,level.sourceLevel,reference,inventory,{includeAlternativePairs:true}),datumHeights=comparableDatumHeights(datumObservations),heightAlternatives=datumObservations.filter(h=>!datumHeights.includes(h)),heights=datumHeights.length?datumHeights:/^level-\d+$/.test(level.sourceLevel)?[]:legacyHeights;
  if(heights.length)draft.height=M.clone(heights[0]);draft.links=views.filter(v=>v.guides.some(g=>g.levelHint===level.sourceLevel)).map(v=>({sourceViewId:v.viewId,status:'proposed',relationship:'floor-elevation-registration'}));
  const spread=list=>list.length?Math.max(...list)/Math.min(...list)-1:0,scaleConflict=partial.conflict||spread(candidates.map(r=>r.scale))>.05;
  if(scaleConflict&&reference){draft.reference={...draft.reference,value:null,label:'',suggestedScale:reference.scale,suggestedValue:reference.value,conflict:true};}

  return {version:1,status:'proposed',buildingId,levelId:level.id,sourceViewId:floor.id,draft,referenceCandidates:candidates,unresolvedScaleReferences:[...floorReferences.unresolvedReferences,...(partial.unresolvedReferences||[])],heightCandidates:heights,heightAlternatives,views,sourceOpeningGaps:V.floorOpenings(image,outline.points),contourDimensions:dimensions,openingSizeCandidates:floorOpeningSizes(floor,outline.points,V.floorOpenings(image,outline.points)),scaleConflict,heightConflict:spread(heights.map(h=>h.value))>.05,confirmationRequired:true,complete:false};
 }
 function levelBand(viewInfo,draft,inventory){
  if(draft.height?.relationship!=='two-visible-level-datums')return null;
  const source=inventory.views.find(v=>v.id===draft.sourceViewId),elevation=inventory.views.find(v=>v.id===viewInfo.viewId),level=inventory.levels.find(l=>l.id===draft.levelId)||inventory.levels.find(l=>l.sourceLevel===source?.levelId&&l.buildingId===source?.buildingId),evidence=draft.height.datumEvidence;
  if(!level||!elevation||elevation.buildingId!==level.buildingId||!(draft.height.value>0)||!evidence?.lower||!evidence?.upper||evidence.lower.levelHint!==level.sourceLevel||evidence.lower.datumType!=='floor')return null;
  const hint=level.sourceLevel,next=/^level-\d+$/.test(hint)?'level-'+(Number(hint.slice(6))+1):hint==='ground'?'upper':null,upper=evidence.upper;
  if(!(upper.datumType==='ceiling'&&upper.levelHint===hint||upper.datumType==='floor'&&next&&upper.levelHint===next))return null;
  const select=(levelHint,datumType)=>{const matches=(viewInfo.guides||[]).filter(g=>g.sourceViewId===viewInfo.viewId&&g.levelHint===levelHint&&g.datumType===datumType&&Number.isFinite(g.y)).sort((a,b)=>(b.confidence||0)-(a.confidence||0));return matches.length&&matches.every(g=>Math.abs(g.y-matches[0].y)<=3)?matches[0]:null;};
  const lower=select(hint,'floor'),top=select(upper.levelHint,upper.datumType);
  if(!lower||!top||lower.y-top.y<=10)return null;
  // Match the SAME written datum pair used for this height. A ceiling cannot
  // substitute for the next floor while retaining its floor-to-floor value.
  return {sourceViewId:viewInfo.viewId,sourceFrame:M.clone(elevation.frame||null),levelId:level.id,lower:M.clone(lower),upper:M.clone(top),topY:top.y,bottomY:lower.y,scaleY:draft.height.value/(lower.y-top.y),heightSourceViewId:draft.height.sourceViewId,relationship:'same-level-datum-pair',confirmationRequired:true};
 }
 function openingsFor(proposal,inventory,images,draft=proposal.draft){
  if(!M.scale(draft)||!(draft.height.value>0)||M.validatePolygon(M.modelPoints(draft)).length)return [];
  const level=inventory.levels.find(l=>l.id===proposal.levelId),model=M.modelPoints(draft),height=draft.height.value,orientation=Math.sign(M.signedArea(model)),walls=model.map((from,i)=>{const to=model[(i+1)%model.length],length=M.distance(from,to);return {id:M.wallId(draft.contourId,draft.points[i].id,draft.points[(i+1)%model.length].id),from,to,length,normal:[orientation*(to[1]-from[1])/length,orientation*(from[0]-to[0])/length]};}),result=[];
  for(const v of proposal.views){if(v.envelope.status!=='proposed'||!images[v.viewId])continue;const band=levelBand(v,draft,inventory);if(draft.height.relationship==='two-visible-level-datums'&&!band)continue;const guide=band?.lower||v.guides.filter(g=>g.levelHint===level.sourceLevel).sort((a,b)=>b.confidence-a.confidence)[0];if(!guide)continue;const sourceTop=band?.topY??v.envelope.box[1];
   const frame={front:{u:[1,0],n:[0,-1]},back:{u:[-1,0],n:[0,1]},right:{u:[0,1],n:[1,0]},left:{u:[0,-1],n:[-1,0]}}[v.direction],dot=(p,u)=>p[0]*u[0]+p[1]*u[1],facing=walls.filter(w=>dot(w.normal,frame.n)>.9),xs=facing.flatMap(w=>[dot(w.from,frame.u),dot(w.to,frame.u)]),min=Math.min(...xs),max=Math.max(...xs),scaleX=(max-min)/v.envelope.box[2],scaleY=band?.scaleY??height/(guide.y-(v.supportY??v.envelope.box[1])),seeds=proposal.sourceOpeningGaps.filter(g=>facing.some(w=>w.id===walls[g.edgeIndex]?.id)).map(g=>{const a=draft.points[g.edgeIndex].xy,b=draft.points[(g.edgeIndex+1)%draft.points.length].xy,seed=g.anchors.map(p=>{const ratio=M.distance(a,p)/M.distance(a,b),point=walls[g.edgeIndex].from.map((n,i)=>n+(walls[g.edgeIndex].to[i]-n)*ratio);return v.envelope.box[0]+(dot(point,frame.u)-min)/scaleX;});return {left:Math.min(...seed),right:Math.max(...seed),gap:g};}),boxes=seeds.flatMap(seed=>{const pad=Math.max(12,(seed.right-seed.left)*.65),l=Math.max(v.envelope.box[0],seed.left-pad),r=Math.min(v.envelope.box[0]+v.envelope.box[2],seed.right+pad);const framed=V.frameAtSeed(images[v.viewId],seed,{top:sourceTop+3,bottom:guide.y-2});const sizes=(proposal.openingSizeCandidates||[]).filter(s=>s.edgeIndex===seed.gap.edgeIndex&&M.distance(s.anchors[0],seed.gap.anchors[0])<4),recovered=sizes.length===1?V.occludedFrameAtSeed(images[v.viewId],seed,{top:sourceTop+3,bottom:guide.y-2,width:sizes[0].width/scaleX,height:sizes[0].height/scaleY,occlusions:v.envelope.occlusions||[]}):[];return (recovered.length?recovered:framed.length?framed:V.glazingFrames(images[v.viewId],[l,v.envelope.box[1],r-l,v.envelope.box[3]],{top:sourceTop+3,bottom:guide.y-2})).filter(c=>Math.min(c.box[0]+c.box[2],seed.right)-Math.max(c.box[0],seed.left)>Math.min(c.box[2],seed.right-seed.left)*.55&&Math.abs(c.box[0]+c.box[2]/2-(seed.left+seed.right)/2)<Math.max(12,(c.occlusionEvidence?c.box[2]:seed.right-seed.left)*.45)).map(c=>({...c,floorGap:seed.gap}));});
   // A continuous floor wall line can hide its opening gap. A closed,
   // monochrome aperture in the compatible elevation is independent evidence;
   // it remains a proposal without claiming a floor-plan correspondence.
   for(const candidate of V.elevationOpenings(images[v.viewId],v.envelope.box,{top:(band?.topY??v.supportY??v.envelope.box[1])+3,bottom:guide.y-2})){
    if(!boxes.some(b=>overlapBox(b.box,candidate.box).fraction>.4))boxes.push({...candidate,floorCorrespondence:{status:'unresolved',reason:'FLOOR_GAP_NOT_DETECTED'}});
   }
   for(const candidate of boxes){if(!candidate.occlusionEvidence&&(v.envelope.occlusions||[]).some(([x,y,w,h])=>{const [l,t,bw,bh]=candidate.box;return Math.max(0,Math.min(l+bw,x+w)-Math.max(l,x))*Math.max(0,Math.min(t+bh,y+h)-Math.max(t,y))>bw*bh*.1;}))continue;const [x,y,bw,bh]=candidate.box,left=min+(x-v.envelope.box[0])*scaleX,right=left+bw*scaleX,wall=facing.filter(w=>Math.min(dot(w.from,frame.u),dot(w.to,frame.u))<=left+.03&&Math.max(dot(w.from,frame.u),dot(w.to,frame.u))>=right-.03).sort((a,b)=>dot(b.from,frame.n)-dot(a.from,frame.n))[0];if(!wall)continue;
    const first=dot(wall.from,frame.u),last=dot(wall.to,frame.u),offset=first<last?left-first:first-right,sill=(guide.y-y-bh)*scaleY,opening={id:'opening:'+v.viewId+':'+[x,y,bw,bh].map(Math.round).join('-'),sourceId:'frame:'+v.viewId+':'+[x,y,bw,bh].map(Math.round).join('-'),sourceViewId:v.viewId,sourceFrame:M.clone(inventory.views.find(s=>s.id===v.viewId).frame),sourceBox:candidate.box,...(candidate.floorCorrespondence?{floorCorrespondence:M.clone(candidate.floorCorrespondence)}:{}),wallId:wall.id,type:'window',offset,width:bw*scaleX,height:bh*scaleY,sill,status:'proposed',kind:'estimated-calibrated',scalesUsed:{x:scaleX,y:scaleY},references:[M.clone(draft.reference),M.clone(draft.height)],writtenSizeCandidates:(proposal.openingSizeCandidates||[]).filter(s=>s.edgeIndex===candidate.floorGap?.edgeIndex&&M.distance(s.anchors[0],candidate.floorGap.anchors[0])<4).map(M.clone),positionEvidence:{kind:'estimated-calibrated',sourceViewId:v.viewId,sourceBox:M.clone(candidate.box),scalesUsed:{x:scaleX,y:scaleY},...(candidate.occlusionEvidence?{occlusionEvidence:M.clone(candidate.occlusionEvidence)}:{}),status:'proposed'},confirmationRequired:true};
    if(offset>=0&&sill>=0&&offset+opening.width<=wall.length+.01&&sill+opening.height<=height+.01&&!result.some(o=>o.id===opening.id))result.push(opening);
   }
  }return result;
 }
 function foundationGuide(view,image,groundY,storeyPixels){
  if(!image)return null;const result=[];
  for(const row of readings(view)){if(row.confidence<40||!row.box||! /^(?:(?:dessus|haut|top of)\s+(?:the\s+)?)?(?:fondation|foundation)\b/.test(normal(row.text)))continue;
   let line=S.guide(image,row.box,[0,0,image.width,image.height]);const [l,t,r,b]=row.box,font=Math.max(5,b-t);
   if(!line)for(let y=Math.floor(b+1);y<=Math.ceil(b+font*1.8);y++){const candidate=S.horizontalRun(image,y,Math.max(0,Math.floor(l-font*3)),Math.min(image.width-1,Math.ceil(r+font*3)),230,12);if(candidate&&candidate.end-candidate.start>(r-l)*.8&&(!line||candidate.end-candidate.start>line.end-line.start))line=candidate;}
   if(!line||line.y<groundY+2||line.y>groundY+storeyPixels*.3)continue;
   result.push({sourceViewId:view.id,sourceFrame:M.clone(view.frame),label:row.text,box:M.clone(row.box),y:line.y,anchors:[[line.start,line.y],[line.end,line.y]],confidence:row.confidence,kind:'visible-foundation-top-guide',status:'proposed',confirmationRequired:true});
  }return result.sort((a,b)=>b.confidence-a.confidence)[0]||null;
 }
 function lowerPlanes(proposal,inventory,confirmedDraft,images={}){
  if(!M.scale(confirmedDraft)||!(confirmedDraft.height.value>0)||M.validatePolygon(M.modelPoints(confirmedDraft)).length)return {status:'unresolved',reason:'LEVEL_MEASUREMENTS_REQUIRED'};
  const level=inventory.levels.find(l=>l.id===proposal.levelId),supported=proposal.views.flatMap(v=>{if(v.envelope.status!=='proposed')return [];const upper=v.guides.filter(g=>g.levelHint===level.sourceLevel).sort((a,b)=>b.confidence-a.confidence)[0],ground=v.guides.filter(g=>g.levelHint==='ground').sort((a,b)=>b.confidence-a.confidence)[0];if(!upper||!ground||ground.y-upper.y<20)return [];return [{...v,upper,ground}];});
  if(!supported.some(v=>['front','back'].includes(v.direction))||!supported.some(v=>['right','left'].includes(v.direction)))return {status:'unresolved',reason:'TWO_COMPATIBLE_ELEVATIONS_REQUIRED'};
  const reviewed=confirmedDraft,points=M.modelPoints(reviewed),orientation=Math.sign(M.signedArea(points)),id=level.buildingId+':observed-ground',sourceViewIds=supported.map(v=>v.viewId),unit=M.scale(reviewed),planes=[];
  const floorHeightReferences=supported.map(v=>({sourceViewId:v.viewId,value:(v.ground.y-v.upper.y)*reviewed.height.value/(v.upper.y-(v.supportY??v.envelope.box[1])),kind:'estimated-calibrated',status:'proposed',anchors:[[v.envelope.box[0],v.ground.y],[v.envelope.box[0],v.upper.y]],label:v.ground.label}));
  for(const v of supported){v.floorGuide=M.clone(v.ground);v.foundation=foundationGuide(inventory.views.find(s=>s.id===v.viewId),images[v.viewId],v.ground.y,v.ground.y-v.upper.y);}
  const hasFoundation=supported.some(v=>v.foundation),heightReferences=supported.filter(v=>!hasFoundation||v.foundation).map(v=>{const base=v.foundation||v.ground;return {sourceViewId:v.viewId,value:(base.y-v.upper.y)*reviewed.height.value/(v.upper.y-(v.supportY??v.envelope.box[1])),kind:'estimated-calibrated',status:'proposed',anchors:[[v.envelope.box[0],base.y],[v.envelope.box[0],v.upper.y]],label:base.label+' → '+v.upper.label,baseGuide:M.clone(base),floorGuide:M.clone(v.floorGuide)};}),height=heightReferences[0].value;
  if(Math.max(...heightReferences.map(h=>h.value))/Math.min(...heightReferences.map(h=>h.value))>1.05)return {status:'unresolved',reason:'LOWER_WALL_HEIGHT_CONFLICT',heightReferences,confirmationRequired:true};
  if(hasFoundation)for(const v of supported)v.ground=v.foundation||{...M.clone(v.ground),y:v.upper.y+height*(v.upper.y-(v.supportY??v.envelope.box[1]))/reviewed.height.value,kind:'estimated-calibrated',transferredFrom:M.clone(heightReferences),label:'Foundation-top registration from compatible elevations',confirmationRequired:true};
  const available=supported.slice();for(const v of proposal.views){if(available.some(s=>s.viewId===v.viewId)||v.envelope.status!=='proposed')continue;const upper=v.guides.filter(g=>g.levelHint===level.sourceLevel).sort((a,b)=>b.confidence-a.confidence)[0],scaleX=reviewed.height.value/(upper?.y-(v.supportY??v.envelope.box[1]));if(!upper||!scaleX)continue;available.push({...v,upper,floorGuide:{y:upper.y+floorHeightReferences[0].value/scaleX,kind:'estimated-calibrated',status:'proposed',sourceViewId:v.viewId,transferredFrom:M.clone(floorHeightReferences),confirmationRequired:true},ground:{y:upper.y+height/scaleX,kind:'estimated-calibrated',status:'proposed',sourceViewId:v.viewId,transferredFrom:M.clone(heightReferences),label:'Compatible elevation floor-height transfer; source caption occluded or unreadable',confirmationRequired:true}});}
  for(let i=0;i<points.length;i++){const from=points[i],to=points[(i+1)%points.length],length=M.distance(from,to),normal=[orientation*(to[1]-from[1])/length,orientation*(from[0]-to[0])/length,0],v=available.find(v=>{const n={front:[0,-1],back:[0,1],right:[1,0],left:[-1,0]}[v.direction];return n[0]*normal[0]+n[1]*normal[1]>.999;});if(!v)continue;
   const u={front:[1,0],back:[-1,0],right:[0,1],left:[0,-1]}[v.direction],dot=p=>p[0]*u[0]+p[1]*u[1],facing=points.map((a,j)=>[a,points[(j+1)%points.length]]).filter(([a,b])=>{const n=[orientation*(b[1]-a[1]),orientation*(a[0]-b[0])];return n[0]*normal[0]+n[1]*normal[1]>0;}),xs=facing.flatMap(e=>e.map(dot)),min=Math.min(...xs),max=Math.max(...xs),scaleX=(max-min)/v.envelope.box[2],x1=v.envelope.box[0]+(dot(from)-min)/scaleX,x2=v.envelope.box[0]+(dot(to)-min)/scaleX,wallId='wall:'+id+':'+reviewed.points[i].id+':'+reviewed.points[(i+1)%points.length].id;
   planes.push({id:wallId,from:M.clone(from),to:M.clone(to),normal,height,base:reviewed.base.value-height,status:'proposed',sourceViewId:v.viewId,sourceBox:[Math.min(x1,x2),v.upper.y,Math.abs(x2-x1),v.ground.y-v.upper.y],registration:{kind:'multi-view-elevation-registration',sourceViewIds,floorGuide:M.clone(v.floorGuide||null),levelGuideTransfer:v.ground.transferredFrom?M.clone(v.ground):null,status:'proposed',counterpartWallId:M.wallId(reviewed.contourId,reviewed.points[i].id,reviewed.points[(i+1)%points.length].id),confirmationRequired:true},measurements:{width:{value:length,kind:'estimated-calibrated',status:'proposed',sourceViewId:v.viewId,anchors:[[x1,v.ground.y],[x2,v.ground.y]],scaleUsed:scaleX,reference:M.clone(reviewed.reference)},height:{value:height,kind:'estimated-calibrated',status:'proposed',sourceViewId:v.viewId,anchors:[[x1,v.ground.y],[x1,v.upper.y]],scaleUsed:height/(v.ground.y-v.upper.y),references:M.clone(heightReferences)}}});
  }
  return {status:'proposed',version:1,id,buildingId:level.buildingId,sourceLevel:null,name:'RDC — murs des élévations',nameKey:'observed-ground',contours:[],observedPlanes:planes,wallOpenings:[],openingsReviewed:false,contourStatus:'unknown',heightReferences,partial:true,confirmationRequired:true,registrationNote:'Review the visible lower walls and their correspondence to the upper floor. No ground-floor plan or complete ground contour is asserted.'};
 }
 function roofProposal(proposal,inventory,reviewed,{ridgeChoices={},images=null}={}){
  if(!M.scale(reviewed)||!(reviewed.height.value>0)||M.validatePolygon(M.modelPoints(reviewed)).length)return {status:'unresolved',reason:'LEVEL_MEASUREMENTS_REQUIRED'};
  if(reviewed.alignment.rotationDegrees!==0)return {status:'unresolved',reason:'ROOF_REGISTRATION_REQUIRED'};
  const points=M.modelPoints(reviewed),orientation=Math.sign(M.signedArea(points)),halves=[];
  for(const v of proposal.views){if(v.envelope.status!=='proposed')continue;const band=levelBand(v,reviewed,inventory);if(reviewed.height.relationship==='two-visible-level-datums'&&!band)continue;const guide=band?.lower||v.guides.filter(g=>g.levelHint===inventory.levels.find(l=>l.id===proposal.levelId).sourceLevel).sort((a,b)=>b.confidence-a.confidence)[0];if(!guide)continue;const frame={front:{u:[1,0],n:[0,-1],axis:'x',sign:1},back:{u:[-1,0],n:[0,1],axis:'x',sign:-1},right:{u:[0,1],n:[1,0],axis:'y',sign:1},left:{u:[0,-1],n:[-1,0],axis:'y',sign:-1}}[v.direction],dot=p=>p[0]*frame.u[0]+p[1]*frame.u[1],edges=points.map((a,i)=>[a,points[(i+1)%points.length]]).filter(([a,b])=>orientation*((b[1]-a[1])*frame.n[0]+(a[0]-b[0])*frame.n[1])>0),all=edges.flatMap(e=>e.map(dot)),total=Math.max(...all)-Math.min(...all),dominant=edges.slice().sort((a,b)=>Math.abs(dot(b[0])-dot(b[1]))-Math.abs(dot(a[0])-dot(a[1])))[0],range=!v.envelope.gridRegistration&&dominant&&Math.abs(dot(dominant[0])-dot(dominant[1]))>total*.75?dominant.map(dot):all,min=Math.min(...range),max=Math.max(...range),scaleX=(max-min)/v.envelope.box[2],scaleY=band?.scaleY??reviewed.height.value/(guide.y-(v.supportY??v.envelope.box[1]));
   for(const s of v.roofProfile?.slopes||[]){if(!s?.eaveY||band&&Math.abs(s.eaveY-band.topY)>Math.max(4,(band.bottomY-band.topY)*.04))continue;const eave=[frame.sign*(min+(s.eaveX-v.envelope.box[0])*scaleX),reviewed.base.value+(guide.y-s.eaveY)*scaleY],high=[frame.sign*(min+(s.highX-v.envelope.box[0])*scaleX),reviewed.base.value+(guide.y-s.highY)*scaleY];if(high[1]-eave[1]<.25)continue;
    halves.push({axis:frame.axis,side:eave[0]<high[0]?'min':'max',eave,high,ridgeEvidence:M.clone(s.ridgeEvidence||null),source:{sourceViewId:v.viewId,sourceFrame:M.clone(inventory.views.find(view=>view.id===v.viewId).frame),anchors:[[s.eaveX,s.eaveY],[s.highX,s.highY]],scaleX,scaleY,kind:'estimated-calibrated',status:'proposed',sourceWallBox:M.clone(v.envelope.box),sourceFloorGuide:M.clone(guide),...(s.eaveJunction?{eaveJunction:M.clone(s.eaveJunction)}:{}),relationship:'floor-elevation-and-roof-stroke-registration'}});
   }
  }
  const assembled=assembleRoofProfiles(halves,{ridgeChoices});if(assembled.status!=='proposed')return {...assembled,availableHalves:halves};
  const {profiles,sources,checks}=assembled;
  const roof={version:1,id:'roof:'+proposal.levelId+':main',levelId:proposal.levelId,buildingId:proposal.buildingId,status:'proposed',profiles,sources,checks,complete:false,confirmationRequired:true,kind:'estimated-calibrated',quantityStatus:'partial-unreviewed',registrationChoices:M.clone(ridgeChoices),fasciaBottom:reviewed.base.value+reviewed.height.value,note:'Only the roof bounded by these source profiles is proposed. Porches, garage roofs and unrepresented volumes remain separate.'};
  if(images)roof.extensions=roofExtensions(proposal,inventory,images,reviewed,roof);return roof;
 }
 function roofExtensions(proposal,inventory,images,reviewed,roof){
  const result=[],points=M.modelPoints(reviewed),front=proposal.views.find(v=>v.direction==='front'),fv=inventory.views.find(v=>v.id===front?.viewId),registration=front&&elevationRegistration(front,reviewed,inventory);if(!registration||!images[front.viewId])return result;
  const edges=points.map((a,i)=>({a,b:points[(i+1)%points.length],i})).filter(e=>Math.abs(e.a[1]-e.b[1])<1e-7&&e.b[0]<e.a[0]),frontY=Math.min(...edges.map(e=>e.a[1]));if(edges.length<2||edges.every(e=>Math.abs(e.a[1]-frontY)<.05))return result;
  for(const edge of edges.filter(e=>Math.abs(e.a[1]-frontY)<.001)){
   const xs=[registration.pixelU(edge.a[0]),registration.pixelU(edge.b[0])].sort((a,b)=>a-b),box=[xs[0],front.envelope.box[1],xs[1]-xs[0],front.envelope.box[3]];if(box[2]>front.envelope.box[2]*.75)continue;
   const profile=V.roofProfile(images[front.viewId],{...front.envelope,box},readings(fv)),[a,b]=profile.slopes||[];if(!a||!b)continue;const px=(b.c-a.c)/(a.m-b.m),py=a.m*px+a.c,crest=registration.z(py),peak=registration.u(px);if(px<=a.eaveX||px>=b.eaveX||crest>=Math.max(...roof.profiles.x.map(p=>p[1]))-.25||crest<=reviewed.base.value+reviewed.height.value+.25)continue;
   const candidates=[];
   for(const side of proposal.views.filter(v=>['right','left'].includes(v.direction))){const sr=elevationRegistration(side,reviewed,inventory),slope=side.roofProfile?.slopes?.[side.direction==='right'?0:1];if(!sr||!slope)continue;const sign=side.direction==='right'?1:-1,sourceY=(sr.pixelZ(crest)-slope.c)/slope.m,y=sign*sr.u(sourceY),eave=[sign*sr.u(slope.eaveX),sr.z(slope.eaveY)],difference=sr.z(slope.highY)-crest;
    if(Math.abs(difference)>.18||y<=eave[0]||y-eave[0]>points.reduce((max,p)=>Math.max(max,p[1]),0)*.5)continue;candidates.push({side,sr,slope,crestPoint:[sourceY,sr.pixelZ(crest)],y,eave,difference});
   }
   const candidate=candidates.sort((a,b)=>Math.abs(a.difference)-Math.abs(b.difference))[0];if(!candidate)continue;
   let join=null;for(let i=0;i<roof.profiles.y.length-1;i++){const p=roof.profiles.y[i],q=roof.profiles.y[i+1];if(q[1]<=p[1]||crest<p[1]||crest>q[1])continue;const y=p[0]+(crest-p[1])*(q[0]-p[0])/(q[1]-p[1]);if(y>candidate.y+.001){join=y;break;}}if(join==null)continue;
   const source=inventory.views.find(v=>v.id===candidate.side.viewId),id=roof.id+':front-return:'+reviewed.points[edge.i].id;
   result.push({version:1,id,levelId:proposal.levelId,buildingId:proposal.buildingId,status:'proposed',kind:'estimated-calibrated',profiles:{x:[[registration.u(a.eaveX),registration.z(a.eaveY)],[peak,crest],[registration.u(b.eaveX),registration.z(b.eaveY)]],y:[candidate.eave,[candidate.y,crest],[join,crest]]},sources:[{sourceViewId:front.viewId,sourceFrame:M.clone(fv.frame),anchors:[[a.eaveX,a.eaveY],[px,py],[b.eaveX,b.eaveY]],scaleX:registration.sx,scaleY:registration.sz},{sourceViewId:source.id,sourceFrame:M.clone(source.frame),anchors:[[candidate.slope.eaveX,candidate.slope.eaveY],candidate.crestPoint],scaleX:candidate.sr.sx,scaleY:candidate.sr.sz}],connection:{kind:'roof-return-at-floor-setback',parentRoofId:roof.id,wallPointIds:[reviewed.points[edge.i].id,reviewed.points[(edge.i+1)%points.length].id],intersection:[px,py],orthogonalHeightDifference:candidate.difference,join:{axis:'y',value:join,height:crest,method:'intersection-with-parent-roof-profile'}},complete:false,confirmationRequired:true,quantityStatus:'partial-unreviewed'});
   const joined=joinRoofReturn(roof,result.at(-1),Math.max(registration.sx,registration.sz)*2);
   result[result.length-1]=joined;
  }return result;
 }
 function joinRoofReturn(parent,original,tolerance){
  const child=M.clone(original),p=parent.profiles.x,q=child.profiles.x;
  if(q.length!==3||!(tolerance>0))return child;
  for(const side of ['min','max']){
   const a=side==='min'?p[0]:p.at(-1),b=side==='min'?p[1]:p.at(-2),end=side==='min'?0:2,other=side==='min'?2:0,c=q[end],peak=q[1],d=q[other],m=(b[1]-a[1])/(b[0]-a[0]),candidate=(peak[1]-c[1])/(peak[0]-c[0]),height=x=>a[1]+m*(x-a[0]);
   // Two samples of the same continuous stroke may differ by a pixel. Keep
   // the established parent plane; never average either source measurement.
   const residual=Math.max(Math.abs(height(c[0])-c[1]),Math.abs(height(peak[0])-peak[1]));
   if(Math.abs(c[0]-a[0])>tolerance||residual>tolerance||Math.abs(candidate-m)>.025)continue;
   const opposite=(peak[1]-d[1])/(peak[0]-d[0]),x=(d[1]-a[1]+m*a[0]-opposite*d[0])/(m-opposite),z=height(x);if(!Number.isFinite(x)||x<=Math.min(a[0],d[0])||x>=Math.max(a[0],d[0]))continue;
   const previous=M.clone(child.profiles);q[end]=M.clone(a);q[1]=[x,z];const oldPeak=Math.max(...previous.x.map(p=>p[1]));
   child.profiles.y=child.profiles.y.map(([y,h])=>[y,Math.abs(h-oldPeak)<1e-7?z:h]);
   child.connection.sharedPlane={parentRoofId:parent.id,axis:'x',side,method:'continuous-source-slope-registered-to-existing-parent-plane',residual,tolerance,originalProfiles:previous,kind:'estimated-calibrated',status:'proposed',confirmationRequired:true};
   break;
  }
  return child;
 }
 function assembleRoofProfiles(halves,{ridgeChoices={}}={}){
  const pairs={},profiles={},sources=[],checks=[];
  for(const axis of ['x','y']){
   const eligible=side=>halves.filter(h=>h.axis===axis&&h.side===side).sort((a,b)=>Math.abs(b.eave[0]-b.high[0])-Math.abs(a.eave[0]-a.high[0])),a=eligible('min')[0],b=eligible('max')[0];if(!a||!b)return {status:'unresolved',reason:'ROOF_COMPATIBLE_PROFILE_MISSING'};
   const ma=(a.high[1]-a.eave[1])/(a.high[0]-a.eave[0]),mb=(b.high[1]-b.eave[1])/(b.high[0]-b.eave[0]);if(!(ma>0&&mb<0))return {status:'unresolved',reason:'ROOF_PROFILE_BOUNDS'};
   const x=(b.eave[1]-a.eave[1]+ma*a.eave[0]-mb*b.eave[0])/(ma-mb),z=a.eave[1]+ma*(x-a.eave[0]);if(!Number.isFinite(x)||x<=a.eave[0]||x>=b.eave[0])return {status:'unresolved',reason:'ROOF_PROFILE_BOUNDS'};
   const ridges=[a,b].filter(h=>h.ridgeEvidence),tolerance=Math.max(.08,(z-Math.min(a.eave[1],b.eave[1]))*.06);let reference=null;
   if(ridges.length){
    if(ridges.length===2&&Math.abs(a.high[1]-b.high[1])>tolerance){reference=ridgeChoices[axis]==='min'?a:ridgeChoices[axis]==='max'?b:null;if(!reference)return {status:'unresolved',reason:'ROOF_DIMENSIONS_CONFLICT',conflictAxis:axis,reviewOptions:[a,b]};}
    else reference=ridges.slice().sort((a,b)=>(b.ridgeEvidence.end-b.ridgeEvidence.start)-(a.ridgeEvidence.end-a.ridgeEvidence.start))[0];
   }
   pairs[axis]={a,b,ma,mb,intersection:[x,z],reference,tolerance};sources.push(a.source,b.source);
  }
  for(const axis of ['x','y']){
   const {a,b,ma,mb,intersection,reference,tolerance}=pairs[axis],other=pairs[axis==='x'?'y':'x'];
   if(reference){
    const z=reference.high[1],x0=a.eave[0]+(z-a.eave[1])/ma,x1=b.eave[0]+(z-b.eave[1])/mb;
    if(x0>x1+.001)return {status:'unresolved',reason:'ROOF_RIDGE_SLOPE_CONFLICT',conflictAxis:axis};
    profiles[axis]=[a.eave,[x0,z],[x1,z],b.eave].filter((p,i,arr)=>!i||p[0]-arr[i-1][0]>.000001);
    checks.push({axis,method:'visible-horizontal-ridge-and-supported-slopes',ridgeSourceViewId:reference.source.sourceViewId,ridgeEvidence:M.clone(reference.ridgeEvidence),selectedHeight:z,otherSlopeEndpointHeights:[a.high[1],b.high[1]],differences:[a.high[1]-z,b.high[1]-z],status:'proposed',confirmationRequired:true});
   }else{
    const crossHeight=other.reference?.high[1]??other.intersection[1],difference=intersection[1]-crossHeight;
    if(Math.abs(difference)>Math.max(tolerance,other.tolerance))return {status:'unresolved',reason:'ROOF_ORTHOGONAL_HEIGHT_CONFLICT',conflictAxis:axis,difference};
    profiles[axis]=[a.eave,intersection,b.eave];
    checks.push({axis,method:'two-supported-slopes-intersection-cross-checked-with-orthogonal-height',intersection:M.clone(intersection),orthogonalHeight:crossHeight,difference,supportedEndpoints:[a.high,b.high],status:'proposed',confirmationRequired:true});
   }
  }
  const aligned=commonRidge(profiles);if(aligned.status!=='proposed')return aligned;checks.push(aligned.evidence);return {status:'proposed',profiles:aligned.profiles,sources,checks};
 }
 function commonRidge(original){
  const profiles=M.clone(original),triangular=['x','y'].filter(axis=>profiles[axis].length===3&&profiles[axis][1][1]>Math.max(profiles[axis][0][1],profiles[axis][2][1]));if(!triangular.length)return {status:'proposed',profiles,evidence:{method:'no-pointed-ridge-constraint',status:'proposed'}};
  const axis=triangular[0],height=profiles[axis][1][1],other=axis==='x'?'y':'x',p=profiles[other],oldHeight=Math.max(...p.map(v=>v[1])),difference=height-oldHeight,tolerance=Math.max(.08,(height-Math.min(p[0][1],p.at(-1)[1]))*.06);if(Math.abs(difference)>tolerance)return {status:'unresolved',reason:'ROOF_ORTHOGONAL_HEIGHT_CONFLICT',difference};
  if(p.length===4){const a=p[0],b=p.at(-1),ma=(p[1][1]-a[1])/(p[1][0]-a[0]),mb=(p[2][1]-b[1])/(p[2][0]-b[0]),x0=a[0]+(height-a[1])/ma,x1=b[0]+(height-b[1])/mb;if(!(x0<x1))return {status:'unresolved',reason:'ROOF_RIDGE_SLOPE_CONFLICT'};p[1]=[x0,height];p[2]=[x1,height];}
  else if(p.length===3&&Math.abs(p[0][1]-p[1][1])<.000001){const end=p[2],slope=(p[1][1]-end[1])/(p[1][0]-end[0]);p[0][1]=height;p[1]=[end[0]+(height-end[1])/slope,height];}
  else if(p.length===3&&triangular.includes(other)){p[1][1]=height;}
  else return {status:'unresolved',reason:'ROOF_COMMON_RIDGE_UNRESOLVED'};
  return {status:'proposed',profiles,evidence:{method:'single-pointed-ridge-height-from-supported-slope-intersection',referenceAxis:axis,referenceHeight:height,adjustedAxis:other,originalHeight:oldHeight,difference,originalProfiles:M.clone(original),kind:'estimated-calibrated',status:'proposed',confirmationRequired:true}};
 }
 function elevationRegistration(viewInfo,reviewed,inventory){
  if(viewInfo.envelope.status!=='proposed')return null;const floor=inventory.views.find(v=>v.id===reviewed.sourceViewId),level=inventory.levels.find(l=>l.contours?.some(c=>c.contourId===reviewed.contourId))||inventory.levels.find(l=>l.sourceLevel===floor?.levelId&&l.buildingId===floor?.buildingId),band=levelBand(viewInfo,reviewed,inventory),guide=band?.lower||viewInfo.guides.filter(g=>g.levelHint===level?.sourceLevel).sort((a,b)=>b.confidence-a.confidence)[0];if(!guide||reviewed.height.relationship==='two-visible-level-datums'&&!band)return null;
  // The raster envelope was fitted to the dominant facing span. Reusing the
  // union of recessed returns here stretches it and shifts attachments.
  const span=registeredSpan(M.modelPoints(reviewed),viewInfo.direction,viewInfo.envelope,{world:true}),reverse=['back','left'].includes(viewInfo.direction),min=reverse?-span.max:span.min,max=reverse?-span.min:span.max,sx=(max-min)/viewInfo.envelope.box[2],sz=band?.scaleY??reviewed.height.value/(guide.y-(viewInfo.supportY??viewInfo.envelope.box[1]));
  if(!(sx>0&&sz>0&&Number.isFinite(sx)&&Number.isFinite(sz)))return null;
  return {guide,...(band?{levelBand:band}:{}),sx,sz,min,max,u:pixel=>min+(pixel-viewInfo.envelope.box[0])*sx,z:pixel=>reviewed.base.value+(guide.y-pixel)*sz,pixelU:value=>viewInfo.envelope.box[0]+(value-min)/sx,pixelZ:value=>guide.y-(value-reviewed.base.value)/sz};
 }
 function recoupRegistrations(proposal,inventory,images,reviewed){
  const next=M.clone(proposal),level=inventory.levels.find(l=>l.id===proposal.levelId),unit=M.scale(reviewed);if(!level||!unit||!(reviewed.height.value>0))return next;
  for(const v of next.views){
   if(v.envelope.status!=='proposed'||v.guides.some(g=>g.levelHint===level.sourceLevel)||!images[v.viewId])continue;
   const image=images[v.viewId],box=v.envelope.box,span=faceSpan(M.modelPoints(reviewed),v.direction,{world:true}),scale=span.length/box[2],support=v.supportY??box[1],expected=support+reviewed.height.value/scale,tolerance=Math.max(3,(expected-support)*.035),matches=[];
   // A caption lost to OCR can be recouped from a visible datum outside the
   // building, with the reviewed height and this view's independent scale.
   // No visible datum means no registration, even if the height is known.
   for(const [a,b]of [[Math.max(0,box[0]-image.width*.16),box[0]-10],[box[0]+box[2]+10,Math.min(image.width*.81,box[0]+box[2]+image.width*.16)]]){
    if(b-a<image.width*.05)continue;
    for(let y=Math.floor(expected-tolerance);y<=Math.ceil(expected+tolerance);y++){
     if(y<0||y>=image.height)continue;const line=S.horizontalRun(image,y,Math.floor(a),Math.ceil(b),205,18);if(!line||line.end-line.start<image.width*.065)continue;
     matches.push({...line,score:(line.end-line.start)-Math.abs(y-expected)*12});
    }
   }
   const match=matches.sort((a,b)=>b.score-a.score)[0];if(!match)continue;
   v.guides.push({sourceViewId:v.viewId,sourceFrame:M.clone(inventory.views.find(s=>s.id===v.viewId).frame),levelHint:level.sourceLevel,y:match.y,label:'Visible datum recouped from compatible reviewed floor height',confidence:0,kind:'estimated-calibrated',status:'proposed',confirmationRequired:true,registrationEvidence:{method:'visible-datum-and-compatible-reviewed-height',anchors:[[match.start,match.y],[match.end,match.y]],expectedY:expected,pixelDifference:match.y-expected,scaleUsed:scale,heightReference:M.clone(reviewed.height),planReference:M.clone(reviewed.reference)}});
  }return next;
 }
 function secondaryVolumes(proposal,inventory,images,reviewed){
  if(!M.scale(reviewed)||!(reviewed.height.value>0))return [];
  const results=[],eligibleViews=proposal.views.filter(v=>inventory.views.some(source=>source.id===v.viewId&&source.buildingId===proposal.buildingId));
  for(const front of eligibleViews.filter(v=>v.direction==='front'&&v.envelope.status==='proposed'))for(const side of ['right','left']){
   const sideView=eligibleViews.find(v=>v.direction===side&&v.envelope.status==='proposed');if(!sideView||!images[front.viewId]||!images[sideView.viewId])continue;
   const fr=elevationRegistration(front,reviewed,inventory),sr=elevationRegistration(sideView,reviewed,inventory);if(!fr||!sr)continue;const frontRaw=V.secondaryEnvelope(images[front.viewId],front.envelope,{side});if(frontRaw.status!=='proposed')continue;
   const sideRaw=V.secondarySide(images[sideView.viewId],sideView.envelope,{...frontRaw,primaryTop:front.envelope.box[1]},{relativeScale:sr.sz?fr.sz/sr.sz:1});if(sideRaw.status!=='proposed')continue;
   const sourceView=inventory.views.find(v=>v.id===front.viewId),sourceSide=inventory.views.find(v=>v.id===sideView.viewId),widthRefs=(sourceView.calibration?.evidence||[]).filter(r=>r.referenceFt>0&&r.anchors?.length===2&&Math.abs(r.anchors[0][1]-r.anchors[1][1])<5&&Math.abs(M.distance(...r.anchors)/frontRaw.box[2]-1)<.1&&Math.abs(Math.min(...r.anchors.map(p=>p[0]))-frontRaw.box[0])<frontRaw.box[2]*.1).sort((a,b)=>(b.ocrConfidence??b.confidence??0)-(a.ocrConfidence??a.confidence??0)),written=widthRefs[0],frontBox=M.clone(frontRaw.box);
   if(written){frontBox[0]=Math.min(...written.anchors.map(p=>p[0]));frontBox[2]=M.distance(...written.anchors);}
   const width=written?written.referenceFt*.3048:frontBox[2]*fr.sx,sourceY=sideRaw.box[0],sourceY2=sourceY+sideRaw.box[2],ys=[sr.u(sourceY),sr.u(sourceY2)].map(n=>side==='right'?n:-n).sort((a,b)=>a-b),depth=ys[1]-ys[0],mainEdge=side==='right'?fr.max:fr.min,x0=side==='right'?mainEdge:mainEdge-width,x1=x0+width;
   let basePixel=frontBox[1]+frontBox[3],baseEvidence={kind:'estimated-calibrated',sourceViewId:front.viewId,anchors:[[frontBox[0],basePixel]],method:'visible-wall-spine-end'};
   for(const row of readings(sourceView)){if(!/^(?:(?:dessus|haut|top)\s+(?:de la\s+)?)?(?:dalle|slab)\b/.test(normal(row.text)))continue;const line=S.guide(images[front.viewId],row.box,[0,0,images[front.viewId].width,images[front.viewId].height]);if(line&&line.y>=basePixel&&line.y<=basePixel+frontRaw.box[3]*.22){basePixel=line.y;baseEvidence={kind:'source-level-guide',sourceViewId:front.viewId,label:row.text,box:M.clone(row.box),y:line.y};}}
   if(baseEvidence.method==='visible-wall-spine-end')for(const row of readings(sourceSide)){if(!/^(?:(?:dessus|haut|top)\s+(?:de la\s+)?)?(?:dalle|slab)\b/.test(normal(row.text)))continue;const line=S.guide(images[sideView.viewId],row.box,[0,0,images[sideView.viewId].width,images[sideView.viewId].height]);if(line&&Math.abs(line.y-(sideRaw.box[1]+sideRaw.box[3]))<sideRaw.box[3]*.22){const sourceBase=sr.z(line.y);basePixel=fr.pixelZ(sourceBase);baseEvidence={kind:'source-level-guide',sourceViewId:sideView.viewId,label:row.text,box:M.clone(row.box),y:line.y,transferredToView:front.viewId,transferredY:basePixel,sourceScale:sr.sz,targetScale:fr.sz,confirmationRequired:true};break;}}
   if(readings(sourceView).some(r=>/\bgarage\b/i.test(r.text))){const doors=V.grayDoorFrames(images[front.viewId],[frontBox[0],frontBox[1],frontBox[2],basePixel-frontBox[1]+frontRaw.box[3]*.12]).filter(d=>d.panelBox&&Math.abs(d.panelBox[1]+d.panelBox[3]-basePixel)<frontRaw.box[3]*.06).sort((a,b)=>b.box[2]*b.box[3]-a.box[2]*a.box[3]);if(doors[0]){const observed=doors[0].panelBox[1]+doors[0].panelBox[3];baseEvidence={kind:'estimated-calibrated',method:'compatible-slab-guide-refined-by-observed-door-threshold',sourceViewId:front.viewId,sourcePanelBox:M.clone(doors[0].panelBox),point:[doors[0].panelBox[0]+doors[0].panelBox[2]/2,observed],compatibleGuide:M.clone(baseEvidence),differencePixels:observed-basePixel,confirmationRequired:true};basePixel=observed;}}
   frontBox[3]=basePixel-frontBox[1];const base=fr.z(basePixel),height=fr.z(frontBox[1])-base,id=proposal.buildingId+':volume:'+front.viewId+':'+side,sourceIds=[front.viewId,sideView.viewId],planes=[];
   const make=(key,from,to,normal,view,box)=>{const length=M.distance(from,to),planeId='wall:'+id+':'+key;return {id:planeId,from,to,normal,height,base,status:'proposed',sourceViewId:view.viewId,sourceBox:box,registration:{kind:'multi-view-elevation-registration',sourceViewIds:sourceIds,status:'proposed',relationship:'secondary-attached-volume-from-independent-front-and-side-views',confirmationRequired:true},measurements:{width:{kind:key==='front'&&written?'written':'estimated-calibrated',value:length,status:'proposed',sourceViewId:view.viewId,anchors:[[box[0],box[1]+box[3]],[box[0]+box[2],box[1]+box[3]]],scaleUsed:length/box[2],...(key==='front'&&written?{sourceWrittenReference:M.clone(written),label:written.normalized||written.text}:{})},height:{kind:'estimated-calibrated',value:height,status:'proposed',sourceViewId:view.viewId,anchors:[[box[0],box[1]+box[3]],[box[0],box[1]]],scaleUsed:height/box[3],sourceReference:{viewId:front.viewId,baseEvidence:M.clone(baseEvidence),upperFloorGuide:M.clone(fr.guide),heightReference:M.clone(reviewed.height)}}}};};
   planes.push(make('front',[x0,ys[0]],[x1,ys[0]],[0,-1,0],front,frontBox));planes.push(make(side,side==='right'?[x1,ys[0]]:[x0,ys[1]],side==='right'?[x1,ys[1]]:[x0,ys[0]],side==='right'?[1,0,0]:[-1,0,0],sideView,M.clone(sideRaw.box)));
   const back=eligibleViews.find(v=>v.direction==='back'&&v.envelope.status==='proposed'),br=back&&elevationRegistration(back,reviewed,inventory);let backRaw=null;
   if(back&&br&&images[back.viewId]){backRaw=V.secondaryEnvelope(images[back.viewId],back.envelope,{side:side==='right'?'left':'right',expectedWidth:width/br.sx,expectedBase:br.pixelZ(base)});if(backRaw.status==='proposed'){sourceIds.push(back.viewId);planes.push(make('back',[x1,ys[1]],[x0,ys[1]],[0,1,0],back,M.clone(backRaw.box)));}}
   const labels=[sourceView,sourceSide].flatMap(v=>readings(v)).some(r=>/\bgarage\b/i.test(r.text)),secondary={version:1,status:'proposed',id,buildingId:proposal.buildingId,sourceLevel:null,name:labels?'Garage':'Volume à confirmer',contours:[],observedPlanes:planes,wallOpenings:[],openingsReviewed:false,contourStatus:'unknown',partial:true,confirmationRequired:true,volume:{id,kind:'source-backed-attached-volume',width:{value:width,kind:written?'written':'estimated-calibrated',sourceViewId:front.viewId,writtenReference:written||null},depth:{value:depth,kind:'estimated-calibrated',sourceViewId:sideView.viewId,anchors:[[sourceY,sideRaw.box[1]],[sourceY2,sideRaw.box[1]]],scaleUsed:sr.sx},height:{value:height,kind:'estimated-calibrated',sourceViewId:front.viewId},bounds:{x:[x0,x1],y:ys,z:[base,base+height]},sharedWall:'existing main-building wall retained independently; no duplicate party wall generated',registrations:{front:{sourceViewId:front.viewId,scaleX:fr.sx,scaleY:fr.sz,guide:M.clone(fr.guide),originZ:reviewed.base.value},side:{sourceViewId:sideView.viewId,scaleX:sr.sx,scaleY:sr.sz,guide:M.clone(sr.guide),originZ:reviewed.base.value}},sources:{front:{viewId:front.viewId,raw:frontRaw,box:frontBox},side:{viewId:sideView.viewId,raw:sideRaw},back:backRaw},baseEvidence}};
   results.push(secondary);
  }return results;
 }
 function overlapBox(a,b){const area=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));return {fraction:area/Math.min(a[2]*a[3],b[2]*b[3]),iou:area/(a[2]*a[3]+b[2]*b[3]-area)};}
 function distinctOpeningFrames(candidates){
  const result=[];for(const c of candidates.slice().sort((a,b)=>(b.priority||0)-(a.priority||0)||b.box[2]*b.box[3]-a.box[2]*a.box[3])){
   const same=result.find(k=>{const o=overlapBox(k.box,c.box);return o.fraction>.65||o.iou>.4;});
   if(same){same.alternateObservations||=[];same.alternateObservations.push(M.clone(c));}else result.push(M.clone(c));
  }return result;
 }
 function assignOpeningSurfaces(lower,volumes){
  const next=M.clone(lower);if(next.status!=='proposed')return next;
  const visible=volumes.flatMap(v=>(v.observedPlanes||[]).map(p=>({...p,volumeId:v.id,buildingId:v.buildingId}))),kept=[];
  for(const opening of next.openingProposals||[]){
   const owner=visible.find(p=>p.buildingId===next.buildingId&&p.sourceViewId===opening.sourceViewId&&overlapBox(p.sourceBox,opening.sourceBox).fraction>.8);
   if(owner){next.occludedSourceOpenings||=[];next.occludedSourceOpenings.push({...opening,status:'unresolved',reason:'VISIBLE_ON_SECONDARY_VOLUME',proposedWallId:owner.id,proposedVolumeId:owner.volumeId});}
   else kept.push(opening);
  }
  next.openingProposals=kept;return next;
 }
 function observedOpenings(level,proposal,inventory,images,{matchingOpenings=[]}={}){
  const results=[];
  for(const plane of level.observedPlanes||[]){
   const view=inventory.views.find(v=>v.id===plane.sourceViewId),image=images[plane.sourceViewId];if(!image||!view||view.buildingId!==level.buildingId)continue;
   const [x,y,w,h]=plane.sourceBox,scaleX=plane.measurements.width.scaleUsed,scaleY=plane.measurements.height.scaleUsed,dh=plane.registration.floorGuide?.y>y?plane.registration.floorGuide.y-y:h,detectionBox=[x,y,w,dh],band={top:y+3,bottom:y+dh-2};
   const seeds=matchingOpenings.filter(o=>o.sourceViewId===plane.sourceViewId&&o.sourceBox[0]>=x&&o.sourceBox[0]+o.sourceBox[2]<=x+w);
   const seeded=seeds.flatMap(o=>V.frameAtSeed(image,{left:o.sourceBox[0],right:o.sourceBox[0]+o.sourceBox[2]},band).map(c=>({...c,priority:4,type:'window',correspondence:o.id})));
   const nominal=V.elevationOpenings(image,detectionBox,band).map(c=>({...c,priority:3}));
   const assemblies=[];for(let i=0;i<nominal.length;i++)for(let j=i+1;j<nominal.length;j++){
    const [a,b]=[nominal[i].box,nominal[j].box].sort((a,b)=>a[0]-b[0]),gap=b[0]-a[0]-a[2];
    if(gap<3||gap>Math.min(a[2],b[2])*.23||Math.abs(a[1]-b[1])>5||Math.abs(a[1]+a[3]-b[1]-b[3])>5)continue;
    for(const c of V.frameAtSeed(image,{left:a[0],right:b[0]+b[2]},band))if(c.box[2]>a[2]+b[2])assemblies.push({...c,priority:5,method:'closed-outer-frame-around-adjacent-panes',paneObservations:[a,b]});
   }
   const glass=V.glazingFrames(image,detectionBox,band).map(c=>({...c,priority:1}));
   const neutral=['door','window'].flatMap(type=>V.grayDoorFrames(image,detectionBox,{type}).map(c=>({...c,priority:2.5,frameBox:c.box,box:c.panelBox||c.box})));
   const candidates=[...seeded,...assemblies,...nominal,...neutral,...glass],eligible=[];
   for(const c of candidates){
    const [l,t,ww,hh]=c.box;
    if((proposal.views.find(v=>v.viewId===plane.sourceViewId)?.envelope.occlusions||[]).some(b=>overlapBox(b,c.box).fraction>.1&&Math.min(b[0]+b[2],l+ww)>Math.max(b[0],l)))continue;
    const bottomGap=y+dh-t-hh,corresponding=seeds.some(o=>Math.abs(ww/o.sourceBox[2]-1)<.3&&Math.abs(l+ww/2-o.sourceBox[0]-o.sourceBox[2]/2)<Math.max(8,ww*.2));
    if(c.method==='closed-frame-and-neutral-glazing'&&bottomGap<dh*.12)continue;
    const label=readings(view).some(r=>r.box&&r.box[0]<=l+ww+8&&r.box[2]>=l-8&&r.box[1]<=t+hh+8&&r.box[3]>=t-8&&/\d{2,3}\s*["']?\s*[x×]/i.test(r.text));
    const door=c.type==='door'||c.type!=='window'&&!corresponding&&bottomGap<dh*.08&&(hh>dh*.68||hh>dh*.55&&ww>w*.18&&ww>hh);
    const narrowTransom=ww/hh>3.5&&ww>w*.25;
    if(c.priority===1&&!door&&!corresponding&&!label&&!narrowTransom&&!nominal.some(n=>overlapBox(n.box,c.box).fraction>.72))continue;
    if(!door&&c.priority===1&&ww*hh<h*w*.015&&!narrowTransom)continue;
    eligible.push({...c,type:door?'door':'window',priority:door?Math.max(3.5,c.priority):c.priority});
   }
   const keep=distinctOpeningFrames(eligible),face=proposal.views.find(v=>v.viewId===plane.sourceViewId),u={front:[1,0],back:[-1,0],right:[0,1],left:[0,-1]}[face?.direction];if(!u)continue;
   const forward=(plane.to[0]-plane.from[0])*u[0]+(plane.to[1]-plane.from[1])*u[1]>0;
   for(const c of keep){
    const [l,t,ww,hh]=c.box,width=ww*scaleX,height=hh*scaleY,offset=forward?(l-x)*scaleX:(x+w-l-ww)*scaleX,sill=(y+h-t-hh)*scaleY;if(offset<0||sill<-.04||offset+width>plane.measurements.width.value+.01||sill+height>plane.height+.01)continue;
    const id='opening:'+plane.id+':'+[l,t,ww,hh].map(Math.round).join('-');results.push({id,sourceId:'frame:'+plane.sourceViewId+':'+[l,t,ww,hh].map(Math.round).join('-'),wallId:plane.id,type:c.type,offset,sill:Math.max(0,sill),width,height,sourceViewId:plane.sourceViewId,sourceBox:M.clone(c.box),sourceFrame:M.clone(view.frame),kind:'estimated-calibrated',status:'proposed',method:c.method,...(c.fragmentEvidence?{fragmentEvidence:{...M.clone(c.fragmentEvidence),sourceViewId:view.id,sourceFrame:M.clone(view.frame)}}:{}),alternateObservations:c.alternateObservations||[],paneObservations:c.paneObservations||[],scalesUsed:{x:scaleX,y:scaleY},references:M.clone(plane.measurements),confirmationRequired:true});
   }
  }return results;
 }
 function volumeRoof(volume,proposal,inventory,images){
  const fronts=volume.volume.sources.front,side=volume.volume.sources.side,frontInfo=proposal.views.find(v=>v.viewId===fronts.viewId),sideInfo=proposal.views.find(v=>v.viewId===side.viewId),frontPlane=volume.observedPlanes.find(p=>p.sourceViewId===fronts.viewId),sidePlane=volume.observedPlanes.find(p=>p.sourceViewId===side.viewId);if(!frontPlane||!sidePlane)return {status:'unresolved',reason:'ROOF_PROFILE_SOURCE_MISSING'};
  const read=(info,box)=>V.roofProfile(images[info.viewId],{status:'proposed',box,sourceViewId:info.viewId,sourceFrame:inventory.views.find(v=>v.id===info.viewId).frame,occlusions:info.envelope.occlusions||[]},readings(inventory.views.find(v=>v.id===info.viewId))),fr=read(frontInfo,frontPlane.sourceBox),sr=read(sideInfo,sidePlane.sourceBox),direction=sideInfo.direction,bounds=volume.volume.bounds,sourceRefs=[];
  const transform=(plane,axis,sign)=>{const box=plane.sourceBox,sx=plane.measurements.width.scaleUsed,registration=axis==='x'?volume.volume.registrations.front:volume.volume.registrations.side;return ([x,y])=>[axis==='x'?bounds.x[0]+(x-box[0])*sx:sign>0?bounds.y[0]+(x-box[0])*sx:bounds.y[1]-(x-box[0])*sx,registration.originZ+(registration.guide.y-y)*registration.scaleY];},fx=transform(frontPlane,'x',1),fy=transform(sidePlane,'y',direction==='right'?1:-1),makeSource=(p,info,anchors)=>({sourceViewId:info.viewId,sourceFrame:M.clone(inventory.views.find(v=>v.id===info.viewId).frame),anchors,scaleX:p.measurements.width.scaleUsed,scaleY:(info.viewId===frontInfo.viewId?volume.volume.registrations.front:volume.volume.registrations.side).scaleY,eaveJunctions:M.clone((info.viewId===frontInfo.viewId?fr:sr).slopes?.flatMap(s=>s?.eaveJunction?[s.eaveJunction]:[])||[]),kind:'estimated-calibrated',status:'proposed'});
  let xp=null;const shared=volume.id.endsWith(':right')?'min':'max';
  if(fr.status==='proposed'){xp=fr.points.map(fx);sourceRefs.push(makeSource(frontPlane,frontInfo,fr.points));}
  else{
   const edge=fr.slopes?.find(s=>s&&(shared==='min'?s.m>0:s.m<0));if(!edge)return {status:'unresolved',reason:'ROOF_FRONT_PROFILE_OCCLUDED',front:fr,side:sr};
   const joint=shared==='min'?frontInfo.envelope.box[0]+frontInfo.envelope.box[2]:frontInfo.envelope.box[0],image=images[frontInfo.viewId],cropLeft=Math.floor(Math.min(joint,edge.highX)-4),cropRight=Math.ceil(Math.max(joint,edge.eaveX)-20);let ridge=null;
   for(let y=Math.round(edge.highY-6);y<=Math.min(Math.round(edge.eaveY-20),Math.round(edge.highY+frontPlane.sourceBox[2]*.13));y++){const line=S.horizontalRun(image,y,cropLeft,cropRight,180,2);if(line&&line.end-line.start>frontPlane.sourceBox[2]*.12&&Math.min(Math.abs(line.start-joint),Math.abs(line.end-joint))<12&&(!ridge||line.end-line.start>ridge.end-ridge.start))ridge=line;}
   if(!ridge)return {status:'unresolved',reason:'ROOF_JOIN_NOT_REPRESENTED',front:fr,side:sr};
   const joined=fx([joint,ridge.y]);joined[0]=shared==='min'?bounds.x[0]:bounds.x[1];const high=fx([shared==='min'?ridge.end:ridge.start,ridge.y]),eave=fx([edge.eaveX,edge.eaveY]);xp=shared==='min'?[joined,high,eave]:[eave,high,joined];sourceRefs.push(makeSource(frontPlane,frontInfo,[[joint,ridge.y],[shared==='min'?ridge.end:ridge.start,ridge.y],[edge.eaveX,edge.eaveY]]));
  }
  let sidePoints=sr.points,intersectionEvidence=null;
  if(sr.status!=='proposed'){
   const [a,b]=sr.slopes||[];if(!a||!b)return {status:'unresolved',reason:'ROOF_SIDE_PROFILE_OCCLUDED',front:fr,side:sr};const x=(b.c-a.c)/(a.m-b.m),y=a.m*x+a.c,peak=fy([x,y]),frontPeak=Math.max(...xp.map(p=>p[1]));
   if(!Number.isFinite(x)||x<=a.eaveX||x>=b.eaveX||Math.abs(peak[1]-frontPeak)>.15)return {status:'unresolved',reason:'ROOF_SIDE_PROFILE_HEIGHT_CONFLICT',front:fr,side:sr};
   sidePoints=[[a.eaveX,a.eaveY],[x,y],[b.eaveX,b.eaveY]];intersectionEvidence={kind:'estimated-calibrated',method:'two-visible-slopes-intersection-cross-checked-with-orthogonal-roof-height',sourceViewId:sideInfo.viewId,slopes:[a,b],point:[x,y],orthogonalPeak:frontPeak,derivedPeak:peak[1],status:'proposed',confirmationRequired:true};
  }
  let yp=sidePoints.map(fy).sort((a,b)=>a[0]-b[0]);const collapse=p=>p.filter((v,i)=>!i||Math.abs(v[0]-p[i-1][0])>.005);xp=collapse(xp);yp=collapse(yp);sourceRefs.push({...makeSource(sidePlane,sideInfo,sidePoints),intersectionEvidence});
  if(xp.some((p,i)=>i&&p[0]<=xp[i-1][0])||yp.some((p,i)=>i&&p[0]<=yp[i-1][0]))return {status:'unresolved',reason:'ROOF_PROFILE_REGISTRATION_CONFLICT'};
  const aligned=commonRidge({x:xp,y:yp});if(aligned.status!=='proposed')return aligned;return {version:1,id:'roof:'+volume.id+':main',buildingId:volume.buildingId,levelId:volume.id,status:'proposed',kind:'estimated-calibrated',profiles:aligned.profiles,checks:[aligned.evidence],sources:sourceRefs,joinedEdges:['x-'+shared],fasciaBottom:volume.volume.bounds.z[1],complete:false,confirmationRequired:true,quantityStatus:'partial-unreviewed'};
 }
 function reviseVolume(original,{width,depth,height}={}){
  const next=M.clone(original),old=original.volume.bounds,w=width??original.volume.width.value,d=depth??original.volume.depth.value,h=height??original.volume.height.value;if(![w,d,h].every(n=>Number.isFinite(n)&&n>0))throw Error('VOLUME_MEASUREMENT');
  const right=original.id.endsWith(':right'),nx=right?[old.x[0],old.x[0]+w]:[old.x[1]-w,old.x[1]],ny=[old.y[0],old.y[0]+d],nz=[old.z[0],old.z[0]+h],rx=w/original.volume.width.value,ry=d/original.volume.depth.value,rz=h/original.volume.height.value,point=([x,y])=>[nx[0]+(x-old.x[0])*rx,ny[0]+(y-old.y[0])*ry];
  next.volume.bounds={x:nx,y:ny,z:nz};for(const [field,value]of [['width',w],['depth',d],['height',h]])if(Math.abs(value-original.volume[field].value)>.00001)next.volume[field]={...next.volume[field],value,kind:'user-measurement',originalEstimate:M.clone(original.volume[field])};
  for(const p of next.observedPlanes){const before=original.observedPlanes.find(v=>v.id===p.id);p.from=point(before.from);p.to=point(before.to);p.height=h;p.base=nz[0];for(const [key,value]of [['width',M.distance(p.from,p.to)],['height',h]]){const m=p.measurements[key];if(Math.abs(m.value-value)>.00001){m.originalEstimate=M.clone(m);m.kind='user-measurement';m.value=value;m.scaleUsed=value/(key==='width'?p.sourceBox[2]:p.sourceBox[3]);m.label='Correction fournie pendant la revue du volume';}}}
  for(const o of next.openingProposals||[]){const p=next.observedPlanes.find(p=>p.id===o.wallId);if(!p)continue;const oldPlane=original.observedPlanes.find(p=>p.id===o.wallId),sx=p.measurements.width.value/oldPlane.measurements.width.value,sz=h/oldPlane.height;o.originalEstimate||=M.clone(o);o.offset*=sx;o.width*=sx;o.sill*=sz;o.height*=sz;o.scalesUsed={x:p.measurements.width.scaleUsed,y:p.measurements.height.scaleUsed};}
  if(next.roofProposal?.status==='proposed'){const roof=next.roofProposal;roof.profiles.x=roof.profiles.x.map(([x,z])=>[nx[0]+(x-old.x[0])*rx,nz[0]+(z-old.z[0])*rz]);roof.profiles.y=roof.profiles.y.map(([y,z])=>[ny[0]+(y-old.y[0])*ry,nz[0]+(z-old.z[0])*rz]);roof.fasciaBottom=nz[1];roof.userMeasurementCorrections={width:w,depth:d,height:h,originalBounds:M.clone(old)};}
  return next;
 }
 return Object.freeze({version:1,registeredSpan,gridElevationEnvelope,crossFloorOutline,levelBand,floorExtentEvidence,floorDimensionAssociation,overallScaleReferences,partialScaleReferences,propose,foundationGuide,constrainProposal,contourDimensions,constrainContour,openingSize,floorOpeningSizes,wallSupport,assignOpeningSurfaces,distinctOpeningFrames,joinRoofReturn,commonRidge,roofExtensions,assembleRoofProfiles,recoupRegistrations,reviseVolume,volumeRoof,observedOpenings,secondaryVolumes,elevationRegistration,roofProposal,openingsFor,lowerPlanes,faceSpan,referenceObservations,references,floorGuide,datumFromCaption,heightFromLevelDatums,size,readings});
});
