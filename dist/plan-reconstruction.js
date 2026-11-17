/* Local source-to-model proposals. Review is explicit; legacy projects are read only. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision,node?require('./plan-import-core.js'):root.MIRPDFAnalysis,node?require('./plan-spatial-dimensions.js'):root.MIRSpatialDimensions,()=>node?require('./plan-grid-registration.js'):root.MIRGridRegistration,()=>node?require('./plan-roof-pitch-evidence.js'):root.MIRRoofPitchEvidence,()=>node?require('./plan-roof-plan-evidence.js'):root.MIRRoofPlanEvidence,()=>node?require('./plan-dimension-source-evidence.js'):root.MIRDimensionSourceEvidence,()=>node?require('./plan-native-witness-measurement.js'):root.MIRNativeWitnessMeasurement);if(node)module.exports=api;else root.MIRPlanReconstruction=api;})(typeof window==='object'?window:globalThis,function(M,V,A,S,gridRegistration,roofPitchEvidence,roofPlanEvidence,dimensionSourceEvidence,nativeWitnessMeasurement){
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
  return results.map(r=>({...r,id:view.id+':dimension:'+r.anchors.flat().join('-')+':'+r.referenceFt,value:r.referenceFt*.3048,kind:'written',status:'proposed',sourceViewId:view.id,sourceFrame:M.clone(view.frame),label:r.text,scale:r.feetPerPixel*.3048,confirmationRequired:true})).map(r=>dimensionSourceEvidence()?.apply(view,r)||r);
 }
 // A rough/foundation/roof height inscription is a construction measurement,
 // not a named storey datum. Keep its real dimension marks and caption without
 // assigning the band to a floor, generating a missing level or adding joists.
 function constructionHeightObservations(view,image){
  const box=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[2]>b[0]&&b[3]>b[1],frame=view?.frame,w=image?.width,h=image?.height;
  if(!['elevation','section'].includes(view?.kind)||!frame||!Number.isInteger(w)||!Number.isInteger(h)||!image.data||image.data.length!==w*h*4||size(view).some((n,i)=>n!==[w,h][i]))return [];
  const vertical=(view.payload.drawingReadings?.verticalRows||[]).filter(r=>box(r.box)&&r.box[0]>=0&&r.box[1]>=0&&r.box[2]<=w*.81&&r.box[3]<=h),type=text=>{
   const t=normal(text).trim().replace(/\s+/g,' ');if(t.length>38||/\b(?:note|index|sommaire|contents|legend|legende|table|schedule|voir|see|toutes|all)\b/.test(t))return null;
   if(/^(?:hauteur rough|rough (?:framing )?height)$/.test(t))return 'rough';
   if(/^(?:hauteur (?:de )?fondation|foundation height)$/.test(t))return 'foundation';
   if(/^(?:hauteur (?:de )?toiture|roof height)$/.test(t))return 'roof';return null;
  },captions=[];
  for(const row of vertical){const kind=type(row.text);if(kind)captions.push({kind,text:row.text,box:M.clone(row.box),confidence:row.confidence??0,sourceReadings:[M.clone(row)]});}
  // Two adjacent rotated lines may spell HAUTEUR / FONDATION. Both observed
  // source boxes are retained; distant schedule headings cannot form a pair.
  for(const row of vertical.filter(r=>/^(?:hauteur|height)$/i.test(normal(r.text).trim()))){const font=row.box[2]-row.box[0];for(const next of vertical){
   const noun=normal(next.text).trim(),kind=/^(?:fondation|foundation)$/.test(noun)?'foundation':/^(?:toiture|roof)$/.test(noun)?'roof':null;if(!kind||next===row)continue;
   const font2=next.box[2]-next.box[0],gap=Math.max(next.box[0]-row.box[2],row.box[0]-next.box[2],0),overlap=Math.max(0,Math.min(row.box[3],next.box[3])-Math.max(row.box[1],next.box[1]));
   if(gap>Math.max(font,font2)*1.5||font2/font<.6||font2/font>1.6||overlap<Math.min(row.box[3]-row.box[1],next.box[3]-next.box[1])*.8)continue;
   captions.push({kind,text:row.text+' / '+next.text,box:[Math.min(row.box[0],next.box[0]),Math.min(row.box[1],next.box[1]),Math.max(row.box[2],next.box[2]),Math.max(row.box[3],next.box[3])],confidence:Math.min(row.confidence??0,next.confidence??0),sourceReadings:[M.clone(row),M.clone(next)]});
  }}
  if(!captions.length)return [];
  const observations=[];
  for(const d of contourDimensions(view,image)){
   if(d.axis!=='y'||d.anchors?.length!==2||!box(d.textBox))continue;
   const x=(d.anchors[0][0]+d.anchors[1][0])/2,top=Math.min(...d.anchors.map(p=>p[1])),bottom=Math.max(...d.anchors.map(p=>p[1])),span=bottom-top,numericCenter=(d.textBox[0]+d.textBox[2])/2;
   const matches=captions.filter(c=>{const font=Math.max(...c.sourceReadings.map(r=>r.box[2]-r.box[0])),cx=(c.box[0]+c.box[2])/2,cy=(c.box[1]+c.box[3])/2;return span>20&&cy>top+2&&cy<bottom-2&&c.box[1]>=top-2&&c.box[3]<=bottom+2&&(cx-x)*(numericCenter-x)<0&&Math.min(Math.abs(c.box[0]-x),Math.abs(c.box[2]-x))<=font*3;});
   if(!matches.length)continue;
   const proof=A.dimensionLineEvidence(image,d,{labels:vertical,rejectIntermediateMarks:true});if(proof.status!=='observed'||proof.axis!=='y')continue;
   const kinds=[...new Set(matches.map(c=>c.kind))],caption=matches.slice().sort((a,b)=>b.confidence-a.confidence)[0],reliable=(d.source==='pdf-text'||d.confidence>=70)&&caption.confidence>=70,status=kinds.length>1?'unresolved':reliable?'proposed':'unresolved';
   observations.push({...M.clone(d),id:d.id+':construction-height',status,measurementRole:kinds.length===1?kinds[0]:null,captionEvidence:M.clone(matches),lineEvidence:proof,scaleUsed:d.value/span,levelId:null,levelAssociation:{status:'unresolved',reason:'HEIGHT_LEVEL_ASSOCIATION_REQUIRED'},reason:kinds.length>1?'HEIGHT_CAPTION_ASSOCIATION_AMBIGUOUS':!reliable?'HEIGHT_TRANSCRIPTION_UNCERTAIN':'HEIGHT_LEVEL_ASSOCIATION_REQUIRED',confirmationRequired:true,quantityEligible:false,notALevelDatum:true});
  }
  for(const item of observations){const alternatives=observations.filter(other=>other!==item&&other.measurementRole===item.measurementRole&&other.anchors.every((p,i)=>M.distance(p,item.anchors[i])<=2)&&other.confidence>=70&&item.confidence>=70&&Math.abs(other.value-item.value)>.001);if(alternatives.length){item.status='conflict';item.reason='HEIGHT_WRITTEN_CONFLICT';item.conflictingObservationIds=alternatives.map(o=>o.id);}}
  return observations.sort((a,b)=>a.anchors[0][0]-b.anchors[0][0]||a.anchors[0][1]-b.anchors[0][1]||a.value-b.value);
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
   // An intersection cluster can anchor the edge of a diagonal tick. The
   // line reader retains its actual source centre separately. Use that
   // observed point only for association, preserving the original anchors,
   // written value and scale; neither tolerance is enlarged or accumulated.
   const line=dimension.lineEvidence,point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite),same=(a,b)=>point(a)&&point(b)&&M.distance(a,b)<1e-6;
   if(dimension.sourceViewId&&dimension.sourceViewId===outline.sourceViewId&&dimension.sourceFrame&&outline.sourceFrame&&JSON.stringify(dimension.sourceFrame)===JSON.stringify(outline.sourceFrame)&&line?.status==='observed'&&line.kind==='dimension-line-with-end-marks-and-witnesses'&&line.axis===(axis===0?'x':'y')&&line.anchors?.length===2&&line.anchors.every((p,i)=>same(p,anchors[i]))){
    const anchor=anchors.find(p=>p[axis]===position),marks=(line.markers||[]).filter(m=>same(m.point,anchor)&&['diagonal-tick','compact-diagonal-tick'].includes(m.kind)&&point(m.strokeCenter)&&m.anchorTolerancePx>0&&m.anchorTolerancePx<=2&&M.distance(m.strokeCenter,anchor)<=m.anchorTolerancePx&&m.witnesses?.length&&m.witnesses.every(w=>w.length===2&&w.every(point)&&same(w[0],m.strokeCenter))),mark=marks.length===1?marks[0]:null;
    if(mark&&Math.abs(mark.strokeCenter[axis]-extreme)<=3){evidence.push({method:'observed-dimension-mark-to-contour',sourceAnchor:anchor.slice(),strokeCenter:mark.strokeCenter.slice(),markEvidence:M.clone(mark),differencePixels:Math.abs(mark.strokeCenter[axis]-extreme),originalDifferencePixels:difference,tolerancePx:3,anchorsPreserved:true});continue;}
   }
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
   if(d.nativeAssociationEvidence?.associationEligibility==='rejected'||d.sourceViewId!==view.id||d.kind!=='written'||!Number.isFinite(d.value)||d.value<=0||d.anchors?.length!==2||!d.anchors.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||d.source!=='pdf-text'&&(d.confidence??0)<70)continue;
   const extentEvidence=floorExtentEvidence(d,outline,image);if(!extentEvidence)continue;
   const association=floorDimensionAssociation(view,d,outline,image);if(association)references.push({...M.clone(d),association:'observed-overall-floor-dimension',sourceAssociation:association,extentEvidence,confirmationRequired:true});
  }return references;
 }
 function partialScaleReferences(view,dimensions,bounds,{outline=null,image=null,controlReferences=[]}={}){
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
   const nativeAssociation=d.nativeAssociationEvidence||dimensionSourceEvidence()?.evidenceFor(view,d),lineEvidence=nativeAssociation?.verificationPerformed?nativeAssociation.lineEvidence:image?A.dimensionLineEvidence(image,d,{labels:[...readings(view),...(view.payload.drawingReadings?.verticalRows||[])]}):null;
   if(nativeAssociation&&!nativeAssociation.verificationPerformed)unresolvedReferences.push({...M.clone(d),scaleEligibility:'pending-native-source-verification',reason:nativeAssociation.reason,nativeAssociationEvidence:M.clone(nativeAssociation),confirmationRequired:true});
   if(lineEvidence&&lineEvidence.status!=='observed'){unresolvedReferences.push({...M.clone(d),scaleEligibility:'unresolved',lineEvidence});continue;}
   // OCR often returns both a complete feet/inches inscription and its
   // individual tokens. The suffix is not another dimension or independent
   // reference, even when its own OCR confidence is higher.
   const compact=t=>String(t||'').replace(/\s+/g,''),enclosing=dimensions.find(other=>other!==d&&other.sourceViewId===view.id&&other.kind==='written'&&other.value>0&&other.textBox?.length===4&&d.textBox?.length===4&&other.textBox.every(Number.isFinite)&&d.textBox.every(Number.isFinite)&&other.anchors?.length===2&&Math.min(M.distance(other.anchors[0],d.anchors[0])+M.distance(other.anchors[1],d.anchors[1]),M.distance(other.anchors[0],d.anchors[1])+M.distance(other.anchors[1],d.anchors[0]))<4&&compact(other.text).length>compact(d.text).length&&compact(other.text).includes(compact(d.text))&&d.textBox[0]>=other.textBox[0]-1&&d.textBox[1]>=other.textBox[1]-1&&d.textBox[2]<=other.textBox[2]+1&&d.textBox[3]<=other.textBox[3]+1);
   if(enclosing){unresolvedReferences.push({...M.clone(d),scaleEligibility:'unresolved',reason:'DIMENSION_CAPTION_FRAGMENT',enclosingCaption:{text:enclosing.text,textBox:M.clone(enclosing.textBox),sourceViewId:view.id},confirmationRequired:true});continue;}
   if(lineEvidence?.status==='observed'){
    // Endpoint search has finite raster precision. A short span whose two
    // marker tolerances exceed the existing 5% calibration agreement cannot
    // establish (or contradict) a whole-view scale at that precision. Keep
    // the written observation and request a better measurement of its marks.
    const endpointTolerance=(lineEvidence.markers||[]).map(m=>Math.max(1,m.anchorTolerancePx||1)),relativeSpanUncertainty=endpointTolerance.reduce((n,t)=>n+t,0)/span;
    const compatibleControls=controlReferences.filter(c=>c.kind==='written'&&c.sourceViewId===view.id&&JSON.stringify(c.sourceFrame)===JSON.stringify(view.frame)&&c.lineEvidence?.status==='observed'&&(c.source==='pdf-text'||c.confidence>=55)&&c.value>0&&c.anchors?.length===2&&floorExtentEvidence(c,outline,image)),tolerance=endpointTolerance.reduce((n,t)=>n+t,0),interval=[d.value/(span+tolerance),d.value/Math.max(1,span-tolerance)],contradictsControls=compatibleControls.length&&compatibleControls.every(c=>{const scale=c.value/M.distance(...c.anchors);return interval[1]<scale/1.05||interval[0]>scale*1.05;});
    if(endpointTolerance.length===2&&relativeSpanUncertainty>.05&&!contradictsControls){unresolvedReferences.push({...M.clone(d),scaleEligibility:'unresolved',reason:'DIMENSION_ENDPOINT_PRECISION_REQUIRED',lineEvidence,precision:{endpointTolerancePixels:endpointTolerance,spanPixels:span,relativeSpanUncertainty,requiredScaleAgreement:.05,scaleInterval:interval,controlReferences:compatibleControls.map(c=>({sourceViewId:c.sourceViewId,textBox:M.clone(c.textBox),value:c.value,anchors:M.clone(c.anchors)}))},confirmationRequired:true});continue;}
   }
   if(observed.some(previous=>Math.min(M.distance(previous.anchors[0],d.anchors[0])+M.distance(previous.anchors[1],d.anchors[1]),M.distance(previous.anchors[0],d.anchors[1])+M.distance(previous.anchors[1],d.anchors[0]))<4&&Math.abs(previous.value-d.value)<.001))continue;
   observed.push({...d,...(association?{sourceAssociation:association}:{}),...(lineEvidence?{lineEvidence}:{})});
  }
  const captions=[];
  for(const d of observed){const box=d.textBox,duplicate=box?.length===4&&captions.some(previous=>{const p=previous.textBox;if(p?.length!==4)return false;const overlap=Math.max(0,Math.min(p[2],box[2])-Math.max(p[0],box[0]))*Math.max(0,Math.min(p[3],box[3])-Math.max(p[1],box[1]));return overlap/Math.min((p[2]-p[0])*(p[3]-p[1]),(box[2]-box[0])*(box[3]-box[1]))>.65;});if(!duplicate)captions.push(d);}
  // A strong partial inscription may corroborate an independently observed
  // overall caption. Keep the existing moderate-OCR threshold used by the
  // pipeline for two captions; a duplicate reading is not a second source.
  const controls=captions.length&&image&&outline?controlReferences.filter(c=>c.kind==='written'&&c.sourceViewId===view.id&&c.sourceFrame&&JSON.stringify(c.sourceFrame)===JSON.stringify(view.frame)&&c.lineEvidence?.status==='observed'&&(c.source==='pdf-text'||c.confidence>=55)&&Number.isFinite(c.value)&&c.value>0&&c.textBox?.length===4&&floorExtentEvidence(c,outline,image)&&captions.every(d=>{
   const a=d.textBox,b=c.textBox;if(a?.length!==4)return false;
   const overlap=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
   return overlap/Math.min((a[2]-a[0])*(a[3]-a[1]),(b[2]-b[0])*(b[3]-b[1]))<=.65&&Math.min(M.distance(d.anchors[0],c.anchors[0])+M.distance(d.anchors[1],c.anchors[1]),M.distance(d.anchors[0],c.anchors[1])+M.distance(d.anchors[1],c.anchors[0]))>=4;
  })):[];
  if(captions.length<2&&!controls.length)return {references:[],conflict:false,unresolvedReferences};
  // Assess these source-associated inscriptions only. A previous page-wide
  // OCR calibration may refer to another detail or include a stale reading.
  const assessment=M.referenceAssessment({...view,calibration:{}},[...observed,...controls]);
  // Keep contradictory source readings in the candidate set so the pipeline
  // cannot silently replace their conflict with a separate overall dimension.
  return {references:observed.map(r=>({...M.clone(r),association:'independent-floor-dimensions',confirmationRequired:true})),conflict:!assessment.scale,assessment,unresolvedReferences,...(controls.length?{corroboratingOverallReferences:M.clone(controls)}:{})};
 }
 function partialDimensionCandidates(inventory,buildingId,images){
  // Select exactly the independently associated floor captions used by the
  // scale resolver. Native checking never selects a value by scale agreement.
  const result=[];
  for(const floor of inventory.views.filter(v=>v.buildingId===buildingId&&v.kind==='floor')){
   const image=images[floor.id];if(!image)continue;
   const detected=V.floorEnvelope(image,{sourceViewId:floor.id,frame:floor.frame,rows:readings(floor)}),outline=detected.status==='proposed'?detected:crossFloorOutline(inventory,floor,images,detected);if(outline.status!=='proposed')continue;
   const dimensions=contourDimensions(floor,image),written=referenceObservations(floor,image),direct=[...written.references.filter(r=>floorExtentEvidence(r,outline,image)),...overallScaleReferences(floor,dimensions,outline,image)];
   result.push(...partialScaleReferences(floor,dimensions,outline.sourceBounds,{outline,image,controlReferences:direct}).references);
  }return result;
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
    const associationRejected=r.nativeAssociationEvidence?.associationEligibility==='rejected',uncertain=associationRejected||r.source!=='pdf-text'&&r.confidence!=null&&r.confidence<70;
    const item={axis,from:lo.i,to:hi.i,reference:M.clone(r),originalSpanPixels:raster,estimatedValue:raster*unit,value:r.value,differencePixels:difference,tolerancePixels:tolerance,status:!uncertain&&Math.abs(difference)<=tolerance?'proposed':'unresolved',reason:associationRejected?'DIMENSION_SOURCE_ASSOCIATION_UNRESOLVED':uncertain?'DIMENSION_TRANSCRIPTION_UNCERTAIN':Math.abs(difference)<=tolerance?null:'DIMENSION_SPAN_MISMATCH',confirmationRequired:true};evidence.push(item);if(item.status==='proposed')links.push(item);
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
  if(height?.kind==='estimated-calibrated'&&height.calibrationMethod!=='independent-vertical-source'&&['floor-span-to-elevation-registration','two-visible-level-datums','visible-envelope-surface-limits'].includes(height.relationship)&&v?.envelope.status==='proposed'){
   const scale=registeredSpan(M.modelPoints(next),v.direction,v.envelope,{world:true}).length/v.envelope.box[2];height.value=M.distance(...height.anchors)*scale;height.scaleUsed=scale;
   for(const ref of height.references){ref.value=M.distance(...ref.anchors)*scale;ref.relationship=['two-visible-level-datums','visible-envelope-surface-limits'].includes(height.relationship)?{...ref.relationship,sourceReference:M.clone(next.reference),contourAdjustment:M.clone(next.dimensionAdjustment)}:{...M.clone(next.reference),contourAdjustment:M.clone(next.dimensionAdjustment)};}
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
   const original=labels.find(l=>l.box.every((n,i)=>Math.abs(n-r.textBox[i])<2)&&l.text===r.text),rasterEvidence=r.lineEvidence?.status==='observed'?r.lineEvidence:A.dimensionLineEvidence(image,r,{labels:readings(view)}),nativeEvidence=rasterEvidence.reason==='DIMENSION_END_MARKS_REQUIRED'?nativeDimensionEvidence(view,r):null,lineEvidence=nativeEvidence||rasterEvidence;
   let candidate={...r,value:r.referenceFt*.3048,kind:'written',status:'proposed',sourceViewId:view.id,sourceFrame:M.clone(view.frame),label:original?.originalText||r.text,punctuationReview:!!original?.punctuationReview,transcriptionReviewRequired:r.confidence<50||!!original?.punctuationReview,scale:r.feetPerPixel*.3048,lineEvidence,confirmationRequired:true};
   candidate=dimensionSourceEvidence()?.apply(view,candidate)||candidate;
   // A high-confidence inscription does not prove its association to a span.
   // Keep the failed association for review, without using it as a metric
   // reference or declaring a contradiction against an independently read view.
   if(candidate.lineEvidence.status==='observed')observed.push(candidate);else unresolvedReferences.push({...candidate,scaleEligibility:'unresolved'});
  }
  return {references:observed,unresolvedReferences};
 }
 function references(view,image){return referenceObservations(view,image).references;}
 function nativeDimensionEvidence(view,dimension){
  const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite),box=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[2]>b[0]&&b[3]>b[1],same=(a,b)=>point(a)&&point(b)&&M.distance(a,b)<=1e-6;
  if(dimension.anchors?.length!==2||!dimension.anchors.every(point)||!box(dimension.textBox))return null;
  const matches=[];
  for(const record of view.payload?.drawingReadings?.nativeDimensionLines||[]){
   const n=record.nativeSource,p=record.lineEvidence,b=record.textBox||record.sourceReading?.box,a=dimension.textBox;
   if(record.status!=='proposed'||record.axis!=='x'||record.sourceViewId!==view.id||!view.frame||JSON.stringify(record.sourceFrame)!==JSON.stringify(view.frame)||n?.method!=='retained-pdf-region'||n.sourceViewId!==view.id||n.sourceFileId!==view.fileId||n.sourcePage!==view.page||JSON.stringify(n.sourceFrame)!==JSON.stringify(view.frame)||p?.status!=='observed'||p.axis!=='x'||record.nativeLineEvidence?.status!=='observed'||!box(b))continue;
   if(record.anchors?.length!==2||!record.anchors.every(point)||p.anchors?.length!==2||!p.anchors.every((q,i)=>same(q,record.anchors[i])))continue;
   const direct=record.anchors.every((q,i)=>same(q,dimension.anchors[i])),reverse=record.anchors.every((q,i)=>same(q,dimension.anchors[1-i]));if(!direct&&!reverse)continue;
   const overlap=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));if(overlap/Math.min((a[2]-a[0])*(a[3]-a[1]),(b[2]-b[0])*(b[3]-b[1]))<.65)continue;
   const proof=M.clone(p);if(reverse){proof.anchors.reverse();proof.markers?.reverse();}matches.push({...proof,nativeSource:M.clone(n),nativeLineEvidence:M.clone(record.nativeLineEvidence),sourceReading:M.clone(record.sourceReading||null),sourceAssociation:'same-caption-and-source-anchors-native-mark-proof'});
  }
  return matches.length?matches[0]:null;
 }
 function wallSupport(view,image,envelope){
  if(!image?.data||envelope?.status!=='proposed'||!envelope.box?.every(Number.isFinite))return null;
  const [w,h]=size(view);if(w!==image.width||h!==image.height||image.data.length!==w*h*4)return null;
  const rows=readings(view),candidates=[],masks=envelope.occlusions||[];
  for(const row of rows){const label=normal(row.text).trim().replace(/^[a-z0-9:|_]\s+(?=sabliere\b)/,''),font=Math.max(3,(row.box?.[3]||0)-(row.box?.[1]||0));if(!/^(?:(?:dessus|haut|niveau|top of)\s+(?:de la |du |des |the )?)?(?:sabliere|fermes de toit|appuis des|(?:exterior )?(?:wall|plate)|ceiling)\b/.test(label)||!row.box?.every(Number.isFinite)||row.box.length!==4||row.confidence<25)continue;
   const [l,t,r,b]=row.box;if(l<0||t<0||r>w||b>h||r<=l||b<=t||Math.abs((t+b)/2-envelope.box[1])>45||masks.some(([x,y,rw,rh])=>l<x+rw&&r>x&&t<y+rh&&b>y))continue;
   // Datum captions sit above their guide. A split "APPUIS DES / FERMES
   // DE TOIT" caption can surround a dashed guide; the first part still
   // supplies a search below text. Never search above the second text row.
   const lines=[],first=S.guide(image,row.box,[0,0,w,h]);if(first)lines.push(first);
   for(let y=Math.ceil(b+1);y<=Math.min(h-1,Math.ceil(b+font*1.6));y++){const line=S.horizontalRun(image,y,Math.max(0,Math.floor(l-font*4)),Math.min(w-1,Math.ceil(r+font*2)),238,Math.ceil(font*1.5));if(line&&line.end-line.start>=Math.max(14,(r-l)*.77)&&!lines.some(p=>p.y===y&&p.start===line.start&&p.end===line.end))lines.push(line);}
   for(const line of lines){if(line.y<=b||Math.abs(line.y-envelope.box[1])>28||masks.some(([x,y,rw,rh])=>line.start<x+rw&&line.end>x&&line.y>=y&&line.y<=y+rh))continue;
    if(rows.some(other=>other!==row&&(other.source==='pdf-text'||other.confidence>=70)&&other.box?.length===4&&other.box.every(Number.isFinite)&&line.y>=other.box[1]&&line.y<=other.box[3]&&Math.min(line.end,other.box[2])-Math.max(line.start,other.box[0])>(line.end-line.start)*.25))continue;
    let observed=0;const runs=[];for(let x=line.start;x<=line.end;x++){const n=(line.y*w+x)*4,d=image.data,hi=Math.max(d[n],d[n+1],d[n+2]),lo=Math.min(d[n],d[n+1],d[n+2]),ink=d[n+3]>100&&hi<238&&hi-lo<45;observed+=Number(ink);const last=runs.at(-1);if(last?.ink===ink){last.end=x;last.pixels++;}else runs.push({ink,start:x,end:x,pixels:1});}
    const support=observed/(line.end-line.start+1),inkRuns=runs.filter(r=>r.ink),gaps=runs.filter(r=>!r.ink),interior=inkRuns.slice(1,-1),regularDashes=inkRuns.length>=3&&gaps.length>=2&&support>=.55&&interior.every(r=>r.pixels>=font)&&Math.max(...interior.map(r=>r.pixels))/Math.min(...interior.map(r=>r.pixels))<=1.35&&gaps.every(r=>r.pixels>=2&&r.pixels<=font*1.5+1)&&Math.max(...gaps.map(r=>r.pixels))-Math.min(...gaps.map(r=>r.pixels))<=2;
    if(support<.8&&!regularDashes)continue;
    candidates.push({y:line.y,line:{start:line.start,end:line.end},sourceViewId:view.id,label:row.text,box:M.clone(row.box),confidence:row.confidence,sourceFrame:M.clone(view.frame),sourceGuide:{anchors:[[line.start,line.y],[line.end,line.y]],support,method:'wall-top-caption-and-visible-guide-below-text',...(regularDashes?{dashEvidence:{method:'regular-neutral-datum-dashes',runs,captionHeightPixels:font}}:{})},score:(line.end-line.start)-Math.abs(line.y-envelope.box[1])*3});
   }
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
 function verticalReferenceAssessment(view){
  const observations=view?.payload?.drawingReadings?.verticalDimensions||[],point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite),references=[],unresolved=[],measurementIssues=[];
  for(const original of observations){
   const d=M.clone(original),native=d.nativeSource,proof=d.lineEvidence,anchors=d.anchors,span=anchors?.length===2&&anchors.every(point)?M.distance(...anchors):0;
   const sameFrame=d.sourceFrame&&view.frame&&JSON.stringify(d.sourceFrame)===JSON.stringify(view.frame),parsed=A.parseDimension(d.text||d.sourceReading?.text||'',{ocr:d.sourceReading?.source!=='pdf-text'});
   const sourceMatches=native?.method==='retained-pdf-region'&&native.sourceViewId===view.id&&native.sourceFileId===view.fileId&&native.sourcePage===view.page&&JSON.stringify(native.sourceFrame)===JSON.stringify(view.frame);
   const datumMatches=span>10&&d.datumEvidence?.upper?.sourceViewId===view.id&&d.datumEvidence?.lower?.sourceViewId===view.id&&Number.isFinite(d.datumEvidence.upper.y)&&Number.isFinite(d.datumEvidence.lower.y)&&Math.abs(Math.min(...anchors.map(p=>p[1]))-d.datumEvidence.upper.y)<=2&&Math.abs(Math.max(...anchors.map(p=>p[1]))-d.datumEvidence.lower.y)<=2;
   const supported=datumMatches&&d.kind==='written'&&d.status==='proposed'&&d.sourceViewId===view.id&&sameFrame&&sourceMatches&&span>10&&Math.abs(anchors[0][0]-anchors[1][0])<=2&&Number.isFinite(d.value)&&d.value>0&&parsed&&Math.abs(parsed.valueFt*.3048-d.value)<.001&&proof?.status==='observed'&&proof.axis==='y'&&proof.anchors?.length===2&&proof.anchors.every((p,i)=>point(p)&&M.distance(p,anchors[i])<=1e-6)&&d.nativeLineEvidence?.status==='observed'&&d.datumEvidence?.lower&&d.datumEvidence?.upper;
   if(!supported||d.sourceReading?.source!=='pdf-text'&&!(d.confidence>=70)){unresolved.push({...d,scaleEligibility:'unresolved'});continue;}
   if(d.measurementEvidence||d.measuredAnchors||d.originalAnchors){
    const N=nativeWitnessMeasurement(),issues=N?.validate?N.validate(d,{view}):['NATIVE_WITNESS_MODULE_REQUIRED'];
    if(issues.length){measurementIssues.push(...issues);unresolved.push({...d,scaleEligibility:'conflict',measurementIssues:issues});continue;}
    if(d.measurementEvidence.status==='observed'){
     // One normalisation point: consumers still use reference.anchors, while
     // the raw observation and both original marker proofs remain intact.
     const measuredScale=d.value/M.distance(...d.measuredAnchors);
     references.push({...d,originalAnchors:M.clone(d.anchors),anchors:M.clone(d.measuredAnchors),label:d.text,scale:measuredScale,calibration:{...d.calibration,metresPerPixel:measuredScale},source:d.sourceReading?.source||'ocr',confirmationRequired:true});continue;
    }
   }
   references.push({...d,label:d.text,scale:d.value/span,source:d.sourceReading?.source||'ocr',confirmationRequired:true});
  }
  const assessment=M.referenceAssessment({id:view?.id,calibration:{}},references);
  // The level datum graph already requires independently written Y scales
  // to agree within one percent. Apply that same guard before choosing a
  // height, so the result cannot depend on the order of source captions.
  if(assessment.spread>.01||measurementIssues.length)assessment.conflict=true;
  return {status:assessment.conflict?'conflict':assessment.scale?'proposed':observations.length?'unresolved':'not-found',references,unresolved,assessment,...(measurementIssues.length?{measurementIssues:[...new Set(measurementIssues)]}:{}),reference:assessment.scale?references.slice().sort((a,b)=>(b.confidence||0)-(a.confidence||0))[0]:null,confirmationRequired:true};
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
   const sourceView=inventory?.views?.find(s=>s.id===v.viewId),vertical=verticalReferenceAssessment(sourceView),matchesPair=d=>d.datumEvidence.lower.levelHint===bottom.levelHint&&d.datumEvidence.lower.datumType===bottom.datumType&&d.datumEvidence.upper.levelHint===top.levelHint&&d.datumEvidence.upper.datumType===top.datumType&&Math.abs(d.datumEvidence.lower.y-bottom.y)<=2&&Math.abs(d.datumEvidence.upper.y-top.y)<=2;
   if(vertical.status==='conflict')continue;
   if(vertical.reference){vertical.reference=vertical.references.filter(matchesPair).sort((a,b)=>(b.confidence||0)-(a.confidence||0))[0]||vertical.reference;vertical.references=[vertical.reference,...vertical.references.filter(r=>r!==vertical.reference)];}
   const horizontalScale=reference.scale*v.facing.length/v.envelope.box[2],scale=vertical.reference?.scale||horizontalScale,pixels=bottom.y-top.y,value=scale*pixels;
   const exactBand=v.envelope.gridRegistration?.status==='proposed'&&v.envelope.verticalDatums?.from?.y===bottom.y&&v.envelope.verticalDatums?.to?.y===top.y;
   if(!(value>=.45&&value<=20)||!exactBand&&pixels>v.envelope.box[3]*.8)continue;
   const anchors=[[v.envelope.box[0],bottom.y],[v.envelope.box[0],top.y]],sourceFrame=inventory?.views?.find(s=>s.id===v.viewId)?.frame||bottom.sourceFrame||null;
   // A reference measured in plan pixels is not an elevation calibration.
   // Preserve that written source through an explicit span correspondence, and
   // express the derived calibration with anchors in this elevation's frame.
   const elevationReference={kind:'estimated-calibrated',status:'proposed',value:scale*v.envelope.box[2],sourceViewId:v.viewId,sourceFrame:M.clone(sourceFrame),anchors:[[v.envelope.box[0],bottom.y],[v.envelope.box[0]+v.envelope.box[2],bottom.y]],relationship:{kind:'floor-to-elevation-span',sourceReference:M.clone(reference),sourcePlanSpan:M.clone(v.facing),...(v.envelope.gridRegistration?{gridRegistration:M.clone(v.envelope.gridRegistration)}:{})},confirmationRequired:true};
   const written=vertical.reference&&matchesPair(vertical.reference)&&Math.abs(M.distance(...vertical.reference.anchors)-pixels)<=2;
   found.push({kind:written?'written':'estimated-calibrated',status:'proposed',value:written?vertical.reference.value:value,sourceViewId:v.viewId,sourceFrame:M.clone(sourceFrame),anchors:written?M.clone(vertical.reference.anchors):anchors,scaleUsed:scale,label:written?vertical.reference.label:bottom.label+' / '+top.label,references:vertical.reference?M.clone(vertical.references):[elevationReference],relationship:'two-visible-level-datums',datumEvidence:{lower:M.clone(bottom),upper:M.clone(top),differencePixels:pixels,sourceViewId:v.viewId},...(vertical.reference?{calibrationMethod:'independent-vertical-source',datumProjectionScale:written?vertical.reference.value/pixels:scale,writtenDimension:written?M.clone(vertical.reference):null,axisScaleComparison:{x:horizontalScale,y:scale,relativeDifference:Math.abs(horizontalScale/scale-1),status:Math.abs(horizontalScale/scale-1)>.05?'review-required':'within-source-tolerance',confirmationRequired:true}}:{}),confirmationRequired:true});
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
 // A donor contour is a search template, not the target's exact stroke centre.
 // Relocalize an edge only when both target corners independently show the
 // same outer stroke and its inside parallel. Dimensions never guide this fit.
 // Ambiguous edges keep their projected coordinates; the entire target raster
 // must support the resulting polygon before any point is replaced.
function localizeTargetContour(image,points){
 if(!image?.data||M.validatePolygon(points).length)return {status:'unresolved',reason:'TARGET_BOUNDARY_INVALID'};
 const originalEvidence=V.floorBoundaryEvidence(image,points);if(originalEvidence.some(e=>e.status!=='proposed'))return {status:'unresolved',reason:'TARGET_BOUNDARY_UNSUPPORTED'};
 const {width:w,height:h}=image,ink=V.monochrome(image),search=Math.max(2,Math.round(w/525)),cornerTolerance=Math.max(1,Math.round(w/1100)),minimum=Math.max(18,Math.round(Math.max(w,h)*.015)),maximumBand=Math.min(w,h)*.04,orientation=Math.sign(points.reduce((s,p,i)=>{const b=points[(i+1)%points.length];return s+p[0]*b[1]-b[0]*p[1];},0));
 const hit=(x,y)=>{x=Math.round(x);y=Math.round(y);return x>=0&&x<w&&y>=0&&y<h&&!!ink[y*w+x];};
 const line=(p,u,axis,at,start,length=minimum)=>{let hits=0,gap=0,maxGap=0;for(let n=start;n<=start+length;n++){const q=p.map((v,i)=>i===axis?at:v+u[i]*n);if(hit(...q)){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}return {support:hits/(length+1),maxGap,anchors:[p.map((v,i)=>i===axis?at:v+u[i]*start),p.map((v,i)=>i===axis?at:v+u[i]*(start+length))]};};
 const groups=(lo,hi,read)=>{const out=[];for(let at=lo;at<=hi;at++){const obs=read(at);if(obs.support<.94||obs.maxGap>2)continue;const prior=out.at(-1);if(prior&&at===prior.high+1){prior.high=at;prior.samples.push(obs);}else out.push({low:at,high:at,samples:[obs]});}return out.map(g=>({...g,at:(g.low+g.high)/2}));};
 const cornerLine=(p,u,axis,inside)=>{
  const outer=groups(Math.floor(p[axis]-search),Math.ceil(p[axis]+search),at=>line(p,u,axis,at,search)),candidates=[];
  for(const stroke of outer){if(stroke.high-stroke.low>Math.max(6,search*2)||line(p,u,axis,stroke.low-1,search).support>=.94||line(p,u,axis,stroke.high+1,search).support>=.94)continue;let missing=0,ends=false;for(let n=1;n<=Math.max(5,cornerTolerance*4+2);n++){const q=p.map((v,i)=>i===axis?stroke.at:v-u[i]*n);if(!hit(...q)){if(++missing>=2){ends=true;break;}}else missing=0;}if(!ends)continue;
   const lo=inside>0?Math.ceil(stroke.high+cornerTolerance*1.5):Math.floor(stroke.low-maximumBand),hi=inside>0?Math.ceil(stroke.high+maximumBand):Math.floor(stroke.low-cornerTolerance*1.5);
   const parallels=groups(lo,hi,at=>line(p,u,axis,at,Math.max(search,Math.ceil(Math.abs(at-stroke.at)+cornerTolerance))));
   for(const inner of parallels){const start=Math.max(search,Math.ceil(Math.abs(inner.at-stroke.at)+cornerTolerance)),a=inside>0?stroke.high+1:inner.high+1,b=inside>0?inner.low-1:stroke.low-1;if(b-a<1)continue;
    let clear=0;for(let n=start;n<=start+minimum;n++){let white=false;for(let at=a;at<=b;at++){const q=p.map((v,i)=>i===axis?at:v+u[i]*n);white||=!hit(...q);}clear+=Number(white);}if(clear/(minimum+1)<.9)continue;
    candidates.push({at:stroke.at,stroke:{low:stroke.low,high:stroke.high,evidence:line(p,u,axis,stroke.at,search)},paired:{at:inner.at,low:inner.low,high:inner.high,evidence:line(p,u,axis,inner.at,start)},sourceCorner:p.slice(),axis,inside,ends:true,distance:Math.abs(stroke.at-p[axis]),clearSupport:clear/(minimum+1)});break;
   }
  }
  const distinct=candidates.filter((c,i)=>!candidates.slice(0,i).some(p=>p.at===c.at));return distinct.length===1?{status:'observed',...distinct[0]}:{status:'unresolved',reason:distinct.length?'TARGET_STROKE_AMBIGUOUS':'TARGET_PAIRED_CORNER_REQUIRED',candidates:distinct};
 };
 const edges=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),axis=Math.abs(dx)<1e-6?0:Math.abs(dy)<1e-6?1:null;if(axis===null)return {status:'unresolved',reason:'TARGET_AXIS_EDGE_REQUIRED'};const u=[dx/length,dy/length],inside=axis===0?-orientation*u[1]:orientation*u[0],from=cornerLine(a,u,axis,inside),to=cornerLine(b,u.map(n=>-n),axis,inside);if(from.status!=='observed'||to.status!=='observed'||Math.abs(from.at-to.at)>cornerTolerance){edges.push({i,status:'unresolved',from,to});continue;}edges.push({i,status:'observed',axis,at:(from.at+to.at)/2,from,to,residual:Math.abs(from.at-to.at),tolerancePx:cornerTolerance});}
 if(edges.every(e=>e.status!=='observed'))return {status:'unresolved',reason:'TARGET_CORNER_LOCALIZATION_REQUIRED',edges};
 const localized=points.map(p=>p.slice());for(const edge of edges.filter(e=>e.status==='observed')){localized[edge.i][edge.axis]=edge.at;localized[(edge.i+1)%points.length][edge.axis]=edge.at;}if(M.validatePolygon(localized).length)return {status:'unresolved',reason:'TARGET_LOCALIZATION_INVALID',edges};const evidence=V.floorBoundaryEvidence(image,localized);
 return {status:evidence.every(e=>e.status==='proposed')?'proposed':'unresolved',method:'target-local-paired-corners',points:localized,originalPoints:points,edges,sourceEdgeEvidence:evidence,localizedEdges:edges.filter(e=>e.status==='observed').map(e=>e.i),geometryConfirmed:false};
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
   const left=Math.min(...projected.map(p=>p[0])),tolerance=Math.max(2,Math.round(image.width/525)),first=indexes.filter(i=>projected[i][0]<=left+tolerance).sort((a,b)=>projected[a][1]-projected[b][1]||projected[a][0]-projected[b][0])[0],at=indexes.indexOf(first),sourceIndexes=[...indexes.slice(at),...indexes.slice(0,at)],projectedPoints=sourceIndexes.map(i=>projected[i]),localization=localizeTargetContour(image,projectedPoints),points=localization.status==='proposed'?localization.points:projectedPoints;
   const edgeEvidence=localization.status==='proposed'?localization.sourceEdgeEvidence:V.floorBoundaryEvidence(image,points);attempt.sourceEdgeEvidence=M.clone(edgeEvidence);attempt.targetLocalization=M.clone(localization);
   attempt.status=edgeEvidence.every(e=>e.status==='proposed')?'proposed':'unresolved';attempt.reason=attempt.status==='proposed'?null:'BOUNDARY_SOURCE_SUPPORT';
   candidates.push({donor,outline,registration,inverse,points,sourceIndexes,edgeEvidence,localization,attempt});
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
   recovery:{...recovery,sourceViewId:floor.id,sourceFrame:M.clone(floor.frame||null),sourcePoints:M.clone(chosen.points),donorSourceViewId:chosen.donor.id,donorSourceFrame:M.clone(chosen.donor.frame||null),donorOutline:M.clone(chosen.outline),donorPointIndices:M.clone(chosen.sourceIndexes),targetLocalization:M.clone(chosen.localization),registration:M.clone(chosen.registration),donorToTargetTransform:M.clone(chosen.inverse),gridObservations:{donor:Grid.markers(chosen.donor,images[chosen.donor.id]),target:Grid.markers(floor,image)},corroboratingSourceViewIds:supported.map(c=>c.donor.id)},
   warning:'A registered contour is supported by this level’s own source strokes; ownership and measurements remain proposed.'};
 }
 function elevationApertureFrames(image,rows=[]){
  if(!image?.data)return [];const w=image.width,h=image.height,panels=V.legendBoxes(image,rows),box=[w*.025,h*.15,w*.8,h*.72],height=Math.round(h*.3),found=[];
  // These overlapping bands only bound detection work. Each aperture needs
  // its own four neutral frame strokes and a coherent group of source panes.
  for(let top=Math.floor(box[1]);top+height<=Math.min(h,box[1]+box[3]);top+=Math.max(1,Math.round(height*.35)))for(const c of V.elevationOpenings(image,box,{top,bottom:top+height})){
   const [x,y,bw,bh]=c.box;if(panels.some(([l,t,pw,ph])=>x<l+pw&&x+bw>l&&y<t+ph&&y+bh>t)||documentLabelsIn(c.box))continue;
   const paneEvidence=V.coherentPaneGroup(image,c.box,{bandHeight:height});if(!paneEvidence||found.some(q=>q.box.every((n,i)=>Math.abs(n-c.box[i])<=3)))continue;found.push({...c,paneEvidence});
  }
  function documentLabelsIn([x,y,w,h]){return rows.some(r=>r.box?.length===4&&/\b(?:legend|legende|notes?|index|sommaire|elevation|sheet|titre)\b/.test(normal(r.text))&&(r.box[0]+r.box[2])/2>x&&(r.box[0]+r.box[2])/2<x+w&&(r.box[1]+r.box[3])/2>y&&(r.box[1]+r.box[3])/2<y+h);}
  return found.filter(c=>!found.some(q=>q!==c&&c.box[0]>=q.box[0]-3&&c.box[1]>=q.box[1]-3&&c.box[0]+c.box[2]<=q.box[0]+q.box[2]+3&&c.box[1]+c.box[3]<=q.box[1]+q.box[3]+3&&q.box[2]*q.box[3]>c.box[2]*c.box[3]*1.1)).sort((a,b)=>a.box[0]-b.box[0]);
 }
 function openingSpanRegistration(floor,elevation,outline,gaps,frames,image){
  const unresolved=reason=>({status:'unresolved',reason,confirmationRequired:true}),valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite),axis=['front','back'].includes(elevation?.direction)?0:1;
  if(!floor?.buildingId||floor.buildingId!==elevation?.buildingId||floor.kind!=='floor'||elevation.kind!=='elevation'||!['front','right','back','left'].includes(elevation.direction)||outline.sourceViewId!==floor.id||JSON.stringify(outline.sourceFrame)!==JSON.stringify(floor.frame)||!outline.points?.every(valid)||!image?.data||size(elevation).some((n,i)=>n!==[image.width,image.height][i]))return unresolved('ELEVATION_OPENING_SOURCE_MISMATCH');
  const points=outline.points,orientation=Math.sign(M.signedArea(points)),normalVector={front:[0,1],back:[0,-1],right:[1,0],left:[-1,0]}[elevation.direction],expectedSign=(['back','left'].includes(elevation.direction)?-1:1)*(axis===0?1:-1),facing=faceSpan(points,elevation.direction),byEdge=new Map();
  for(const gap of gaps||[]){const a=points[gap.edgeIndex],b=points[(gap.edgeIndex+1)%points.length];if(!a||!b||gap.status!=='proposed'||gap.kind!=='source-gap'||gap.colouredOcclusion||!gap.sourcePixelEvidence||gap.anchors?.length!==2||!gap.anchors.every(valid))continue;const length=M.distance(a,b),dot=orientation*((b[1]-a[1])*normalVector[0]+(a[0]-b[0])*normalVector[1])/length;if(dot<.999||Math.abs(Math.abs(b[axis]-a[axis])-facing.length)>3)continue;const edge=byEdge.get(gap.edgeIndex)||[];edge.push({...gap,center:(gap.anchors[0][axis]+gap.anchors[1][axis])/2,width:M.distance(...gap.anchors)});byEdge.set(gap.edgeIndex,edge);}
  const sourceGroups=Array.from(byEdge.values()).filter(g=>g.length>=2&&g.length<=8),targets=(frames||[]).filter(f=>f.paneEvidence?.status==='proposed'&&f.box?.length===4&&f.box.every(Number.isFinite)&&f.box[2]>20).sort((a,b)=>a.box[0]-b.box[0]);
  if(!sourceGroups.length||targets.length<2||targets.length>12)return unresolved('ELEVATION_OPENING_CORRESPONDENCES_REQUIRED');
  const ink=V.monochrome(image),w=image.width,h=image.height,panels=V.legendBoxes(image,readings(elevation)),minimum=Math.max(30,Math.min(h*.07,facing.length*.12)),sourceLimits=(x,tolerance)=>{
   const out=[];for(let px=Math.max(0,Math.floor(x-tolerance));px<=Math.min(w-1,Math.ceil(x+tolerance));px++){let start=-1,last=-1,count=0;const take=()=>{if(start<0||last-start<minimum||count/(last-start+1)<.85)return;out.push({x:px,top:start,bottom:last,support:count/(last-start+1),observedPixels:count,anchors:[[px,start],[px,last]],differencePixels:Math.abs(px-x)});};
    for(let y=Math.floor(h*.18);y<=Math.floor(h*.88);y++){const masked=panels.some(([l,t,bw,bh])=>px>=l&&px<=l+bw&&y>=t&&y<=t+bh),hit=!masked&&ink[y*w+px];if(hit){if(start<0)start=y;last=y;count++;}else if(start>=0&&y-last>2){take();start=last=-1;count=0;}}take();}
   return out;
  },fits=[];
  for(const group of sourceGroups){const ordered=group.slice().sort((a,b)=>(a.center-b.center)*expectedSign);for(let a=0;a<ordered.length-1;a++)for(let b=a+1;b<ordered.length;b++)for(let c=0;c<targets.length-1;c++)for(let d=c+1;d<targets.length;d++){
   const sourceSpan=ordered[b].center-ordered[a].center;if(Math.abs(sourceSpan)<facing.length*.25)continue;const targetCenter=f=>(f.box[0]+f.box[2]/2),scale=(targetCenter(targets[d])-targetCenter(targets[c]))/sourceSpan,offset=targetCenter(targets[c])-scale*ordered[a].center;if(!(scale*expectedSign>0)||Math.abs(scale)<.25||Math.abs(scale)>4)continue;
   const pairs=[[ordered[a],targets[c]],[ordered[b],targets[d]]],checks=pairs.map(([gap,frame])=>({sourceGap:M.clone(gap),elevationAperture:M.clone(frame),sourceCenter:gap.center,elevationCenter:targetCenter(frame),centerResidual:gap.center*scale+offset-targetCenter(frame),predictedWidth:gap.width*Math.abs(scale),observedWidth:frame.box[2],widthRelativeResidual:Math.abs(gap.width*Math.abs(scale)/frame.box[2]-1)}));
   // Two centres determine an affine fit exactly. Widths and independent
   // exterior source strokes must therefore corroborate it; centre residual
   // alone cannot establish a correspondence.
   if(checks.some(q=>q.widthRelativeResidual>.06))continue;
   const ends=[facing.min*scale+offset,facing.max*scale+offset].sort((a,b)=>a-b),span=ends[1]-ends[0],tolerance=Math.max(3,Math.min(span*.015,Math.max(...checks.map(q=>Math.abs(q.predictedWidth-q.observedWidth)))/2+3));if(ends[0]<0||ends[1]>=w)continue;
   const left=sourceLimits(ends[0],tolerance),right=sourceLimits(ends[1],tolerance),supports=[];for(const l of left)for(const r of right){const overlap=Math.min(l.bottom,r.bottom)-Math.max(l.top,r.top);if(overlap>=minimum*.7)supports.push({left:l,right:r,sharedVerticalPixels:overlap,score:l.differencePixels+r.differencePixels});}supports.sort((a,b)=>a.score-b.score);if(!supports.length)continue;
   const sourceLimitEvidence=supports[0],score=checks.reduce((n,q)=>n+q.widthRelativeResidual,0)+sourceLimitEvidence.score/span;
   if(!fits.some(f=>Math.abs(f.transform.scale-scale)<.00001&&Math.abs(f.transform.offset-offset)<1))fits.push({status:'proposed',reason:null,transform:{floorAxis:axis===0?'x':'y',scale,offset},projectedBounds:ends,tolerancePixels:tolerance,checks,sourceLimitEvidence,score});
  }}
  if(!fits.length)return unresolved('ELEVATION_OPENING_SCALE_OR_BOUNDARY_UNSUPPORTED');fits.sort((a,b)=>a.score-b.score);const chosen=fits[0];if(fits.slice(1).some(f=>Math.abs(f.projectedBounds[0]-chosen.projectedBounds[0])>chosen.tolerancePixels||Math.abs(f.projectedBounds[1]-chosen.projectedBounds[1])>chosen.tolerancePixels))return {status:'unresolved',reason:'ELEVATION_OPENING_MATCH_AMBIGUOUS',candidates:fits,confirmationRequired:true};
  return {...chosen,version:1,method:'floor-openings-to-neutral-elevation-frames',buildingId:floor.buildingId,floorSourceViewId:floor.id,elevationSourceViewId:elevation.id,sourceFrames:{floor:M.clone(floor.frame),elevation:M.clone(elevation.frame)},units:'source-pixels',verticalStatus:'unresolved',heightStatus:'unresolved',confirmationRequired:true,notAGeometryConfirmation:true};
 }
 function observedEnvelopeLimits(view,image,registration){
  const unresolved=reason=>({status:'unresolved',reason,physicalFloorDatum:'unresolved',confirmationRequired:true});
  if(registration?.status!=='proposed'||registration.elevationSourceViewId!==view.id||JSON.stringify(registration.sourceFrames?.elevation)!==JSON.stringify(view.frame)||!image?.data)return unresolved('ENVELOPE_SOURCE_REGISTRATION_REQUIRED');
  const [left,right]=registration.projectedBounds,width=right-left,edges=registration.sourceLimitEvidence,frames=registration.checks.map(c=>c.elevationAperture),minimumTop=Math.min(...frames.map(f=>f.box[1])),maximumBottom=Math.max(...frames.map(f=>f.box[1]+f.box[3])),ink=V.monochrome(image),panels=V.legendBoxes(image,readings(view)),pad=Math.max(2,Math.round(image.width/525)),limitTolerance=registration.tolerancePixels+pad,masked=(x,y)=>panels.some(([l,t,w,h])=>x>=l&&x<=l+w&&y>=t&&y<=t+h);
  const lineCache=new Map();
  function horizontalRuns(y){
   if(lineCache.has(y))return lineCache.get(y);let start=-1,last=-1,count=0;const runs=[],take=()=>{if(start>=0&&last-start>Math.max(30,width*.2))runs.push({anchors:[[start,y],[last,y]],support:count/(last-start+1)});};
   for(let x=Math.max(0,Math.floor(left-width*.08));x<=Math.min(image.width-1,Math.ceil(right+width*.08));x++){
    if(!masked(x,y)&&ink[y*image.width+x]){if(start<0)start=x;last=x;count++;}else if(start>=0&&(masked(x,y)||x-last>3)){take();start=last=-1;count=0;}
   }take();const relevant=runs.filter(r=>r.support>=.85&&r.anchors[1][0]>left&&r.anchors[0][0]<right);lineCache.set(y,relevant);return relevant;
  }
  function horizontal(y){
   const relevant=horizontalRuns(y),leftMasked=masked(left,y),rightMasked=masked(right,y);if(leftMasked&&rightMasked)return null;
   const endpoints=relevant.filter(r=>(leftMasked||Math.abs(r.anchors[0][0]-left)<=limitTolerance)&&(rightMasked||Math.abs(r.anchors[1][0]-right)<=limitTolerance));if(!endpoints.length)return null;
   const line=endpoints.sort((a,b)=>(b.anchors[1][0]-b.anchors[0][0])-(a.anchors[1][0]-a.anchors[0][0]))[0];return {...line,y,sourceViewId:view.id,sourceFrame:M.clone(view.frame),method:'neutral-envelope-edge-between-independently-registered-limits',occludedEnds:{left:leftMasked,right:rightMasked},confirmationRequired:true};
  }
  const lower=[];for(let y=Math.floor(Math.min(edges.left.top,edges.right.top)-pad);y<=Math.ceil(Math.max(edges.left.top,edges.right.top)+pad);y++){if(y<=maximumBottom+pad||Math.max(Math.abs(y-edges.left.top),Math.abs(y-edges.right.top))>pad)continue;const line=horizontal(y);if(line&&!line.occludedEnds.left&&!line.occludedEnds.right)lower.push(line);}
  if(!lower.length)return unresolved('ENVELOPE_LOWER_LIMIT_REQUIRED');lower.sort((a,b)=>b.support-a.support||a.y-b.y);const bottom=lower[0],upper=[];
  for(let y=Math.max(0,Math.floor(minimumTop-width*.5));y<minimumTop-pad;y++){const line=horizontal(y);if(line)upper.push(line);}
  // A horizontal shingle/hatch stroke can end near the projected wall edge.
  // The upper envelope edge must lie BELOW an independently observed pair
  // of parallel fascia/overhang strokes extending beyond those wall limits.
  const supportedUpper=upper.filter(candidate=>{const bands=[];for(let y=Math.max(0,Math.floor(candidate.y-width*.08));y<candidate.y-pad;y++)for(const line of horizontalRuns(y)){
    const leftMasked=masked(left,y),rightMasked=masked(right,y);if(leftMasked&&rightMasked)continue;if((leftMasked||line.anchors[0][0]<=left-pad*2)&&(rightMasked||line.anchors[1][0]>=right+pad*2))bands.push({...line,y,occludedEnds:{left:leftMasked,right:rightMasked}});
   }const pair=bands.flatMap((a,i)=>bands.slice(i+1).filter(b=>b.y-a.y>=pad&&b.y-a.y<=width*.04&&Math.abs(a.anchors[0][0]-b.anchors[0][0])<=pad*2&&Math.abs(a.anchors[1][0]-b.anchors[1][0])<=pad*2).map(b=>({upper:a,lower:b}))).sort((a,b)=>b.lower.y-a.lower.y)[0];if(!pair)return false;candidate.overhangEvidence={method:'two-neutral-parallel-overhang-strokes-above-envelope',...pair,sourceViewId:view.id,sourceFrame:M.clone(view.frame),confirmationRequired:true};return true;});
  if(!supportedUpper.length)return unresolved('ENVELOPE_UPPER_LIMIT_REQUIRED');supportedUpper.sort((a,b)=>a.y-b.y||b.support-a.support);const top=supportedUpper[0];if(bottom.y-top.y<image.height*.08||bottom.y-top.y>width)return unresolved('ENVELOPE_LIMITS_INCONSISTENT');
  return {status:'proposed',method:'independent-neutral-envelope-limits',sourceViewId:view.id,sourceFrame:M.clone(view.frame),box:[left,top.y,width,bottom.y-top.y],occlusions:panels,openingRegistration:M.clone(registration),surfaceBoundaries:{upper:top,lower:bottom,sideContinuations:M.clone(edges)},physicalFloorDatum:'unresolved',verticalMeaning:'visible-envelope-surface-not-storey-datum',confirmationRequired:true};
 }
 function propose(inventory,buildingId,images,{levelId}={}){
  const levels=inventory.levels.filter(l=>l.buildingId===buildingId&&(!levelId||l.id===levelId)),level=levels.find(l=>inventory.views.some(v=>v.kind==='floor'&&v.levelId===l.sourceLevel&&v.buildingId===buildingId));
  if(!level)return {version:1,status:'unresolved',reason:'FLOOR_SOURCE_REQUIRED'};
  const plans=inventory.views.filter(v=>v.kind==='floor'&&v.levelId===level.sourceLevel&&v.buildingId===buildingId);if(plans.length!==1)return {version:1,status:'unresolved',reason:'FLOOR_SOURCE_AMBIGUOUS'};
  const floor=plans[0],image=images[floor.id];if(!image)return {version:1,status:'unresolved',reason:'SOURCE_UNAVAILABLE'};
  const detected=V.floorEnvelope(image,{sourceViewId:floor.id,frame:floor.frame,rows:readings(floor)}),outline=detected.status==='proposed'?detected:crossFloorOutline(inventory,floor,images,detected);if(outline.status!=='proposed')return {version:1,status:'unresolved',reason:outline.reason,...(outline.recovery?{outlineRecovery:outline.recovery}:{})};
  const sourceOpeningGaps=V.floorOpenings(image,outline.points,{boundaryEvidence:outline.sourceEdgeEvidence}),bounds=outline.sourceBounds,elevations=inventory.views.filter(v=>v.buildingId===buildingId&&v.kind==='elevation'&&['front','right','back','left'].includes(v.direction)),views=[];
  for(const v of elevations){const im=images[v.id];if(!im)continue;const legacySpan=faceSpan(outline.points,v.direction),rasterEnvelope=V.wallEnvelope(im,legacySpan.length,{sourceViewId:v.id,frame:v.frame,occlusions:V.legendBoxes(im,readings(v)),rows:readings(v)}),referenceReading=referenceObservations(v,im),refs=referenceReading.references,guides=floorGuide(v,im,rasterEnvelope),axisEnvelope=gridElevationEnvelope(gridRegistration(),floor,v,images,outline,guides);
   // Missing axes preserve the existing single-house path. Contradictory axes,
   // frames or datums never fall back to a visually plausible facade box.
   const absent=['ELEVATION_GRID_UNAVAILABLE','ELEVATION_GRID_FLOOR_AXES_REQUIRED','ELEVATION_GRID_LABELS_REQUIRED'].includes(axisEnvelope.reason);let openingRegistration=null,registeredRaster=rasterEnvelope;
   if(absent&&rasterEnvelope.status==='unresolved'){
    openingRegistration=openingSpanRegistration(floor,v,outline,sourceOpeningGaps,elevationApertureFrames(im,readings(v)),im);
    if(openingRegistration.status==='proposed'){
     const [left,right]=openingRegistration.projectedBounds,candidate=V.wallEnvelope(im,right-left,{sourceViewId:v.id,frame:v.frame,occlusions:V.legendBoxes(im,readings(v)),rows:readings(v)}),tolerance=openingRegistration.tolerancePixels;
     registeredRaster=candidate.status==='proposed'&&(Math.abs(candidate.box[0]-left)>tolerance||Math.abs(candidate.box[0]+candidate.box[2]-right)>tolerance)?{status:'unresolved',reason:'ELEVATION_OPENING_BOUNDARY_MISMATCH',rejectedEnvelope:candidate}:candidate;
     if(registeredRaster.status==='unresolved'){const limits=observedEnvelopeLimits(v,im,openingRegistration);registeredRaster=limits.status==='proposed'?limits:{...registeredRaster,envelopeLimits:limits};}
    }
   }
   const envelope=axisEnvelope.status==='proposed'?{...axisEnvelope,occlusions:rasterEnvelope.occlusions||V.legendBoxes(im,readings(v))}:absent?registeredRaster:axisEnvelope,facing=registeredSpan(outline.points,v.direction,envelope),support=envelope.status==='proposed'&&!envelope.gridRegistration?wallSupport(v,im,envelope):null;
   if(envelope.surfaceBoundaries)guides.push({sourceViewId:v.id,sourceFrame:M.clone(v.frame),levelHint:level.sourceLevel,datumType:'envelope-base',physicalFloorDatum:'unresolved',kind:'estimated-calibrated',status:'proposed',label:'Observed envelope lower limit — physical floor datum unresolved',y:envelope.surfaceBoundaries.lower.y,sourceGuide:M.clone(envelope.surfaceBoundaries.lower),confidence:0,confirmationRequired:true});
   views.push({viewId:v.id,direction:v.direction,facing,envelope,...(openingRegistration?{openingRegistration}:{}),axisRegistration:axisEnvelope.gridRegistration||axisEnvelope.registration||axisEnvelope,supportY:support?.y??envelope.box?.[1],supportEvidence:support,roofProfile:V.roofProfile(im,envelope,readings(v)),references:refs,unresolvedScaleReferences:referenceReading.unresolvedReferences,guides});
  }
  const floorReferences=referenceObservations(floor,image),dimensions=contourDimensions(floor,image),direct=[...floorReferences.references.flatMap(r=>{const extentEvidence=floorExtentEvidence(r,outline,image);return extentEvidence?[{...r,extentEvidence}]:[];}),...overallScaleReferences(floor,dimensions,outline,image)];
  // Transferring a written elevation span to a plan is itself an estimated
  // correspondence, never a second written dimension on the floor plan.
  const transferred=views.filter(v=>v.envelope.status==='proposed').flatMap(v=>v.references.filter(r=>Math.abs(r.spanPx/v.envelope.box[2]-1)<.05).map(r=>{
   const axis=v.facing.axis,anchors=axis===0?[[v.facing.min,bounds[1]],[v.facing.max,bounds[1]]]:[[bounds[0],v.facing.min],[bounds[0],v.facing.max]];
   return {...r,kind:'estimated-calibrated',sourceViewId:floor.id,sourceFrame:M.clone(floor.frame),anchors,scale:r.value/M.distance(...anchors),sourceReference:M.clone(r),relationship:{kind:'floor-to-elevation-span',sourceViewId:v.viewId,direction:v.direction,status:'proposed',confirmationRequired:true}};
  }));
  const partial=partialScaleReferences(floor,dimensions,bounds,{outline,image,controlReferences:direct});
  const candidates=[...direct,...partial.references,...transferred].sort((a,b)=>Number(String(b.normalized||'').includes("'"))-Number(String(a.normalized||'').includes("'"))||Number(a.kind!=='written')-Number(b.kind!=='written')||(b.confidence||0)-(a.confidence||0)||(b.score||0)-(a.score||0)),reference=candidates[0];
  const draft=M.draftFor(floor,level);draft.points=outline.points.map((xy,i)=>({id:'auto-'+floor.id+'-p'+i,xy}));draft.proposal={...outline,points:undefined};draft.alignment={origin:[bounds[0],bounds[1]+bounds[3]],offset:[0,0],rotationDegrees:0,status:'proposed',kind:'source-orientation-review'};
  if(reference)draft.reference={...M.clone(reference),controlReferences:[],assessment:{status:'review-required'},status:'proposed'};
  if(reference)for(const v of views.filter(v=>v.envelope.gridRegistration)){
   const source=inventory.views.find(s=>s.id===v.viewId),written=v.references.filter(r=>r.kind==='written'&&!r.transcriptionReviewRequired&&(r.confidence??0)>=70),checks=(written.length?written:[null]).map(elevationReference=>gridRegistration().elevationAxisRegistration(floor,source,image,images[v.viewId],draft,{elevationReference}));
   v.metricGridRegistration=checks.find(c=>c.status!=='proposed')||checks[0];
   if(v.metricGridRegistration.status!=='proposed')v.envelope={...v.envelope,status:v.metricGridRegistration.status,reason:v.metricGridRegistration.reason};
  }
  for(const v of views.filter(v=>v.openingRegistration?.status==='proposed')){
   const registration=v.openingRegistration,scale=reference?.scale/Math.abs(registration.transform.scale),checks=v.references.filter(r=>r.kind==='written'&&!r.transcriptionReviewRequired&&(r.confidence??0)>=70&&r.anchors?.length===2&&Math.abs(r.anchors[0][1]-r.anchors[1][1])<=2).map(r=>({reference:M.clone(r),scaleUsed:r.value/M.distance(...r.anchors),relativeDifference:Math.abs(r.value/M.distance(...r.anchors)/scale-1)}));
   registration.metricCalibration={status:scale>0?'proposed':'unresolved',kind:'estimated-calibrated',axis:'x',scaleUsed:scale>0?scale:null,sourceReference:reference?M.clone(reference):null,checks,confirmationRequired:true};
   if(checks.some(c=>c.relativeDifference>.05)){registration.status='conflict';registration.reason='ELEVATION_OPENING_SCALE_CONFLICT';registration.metricCalibration.status='conflict';v.envelope={...v.envelope,status:'conflict',reason:registration.reason};}
  }
  const legacyHeights=views.flatMap(v=>v.guides.filter(g=>g.levelHint===level.sourceLevel&&g.datumType==='floor'&&v.envelope.status==='proposed').map(g=>{
   const localScale=reference?reference.scale*v.facing.length/v.envelope.box[2]:null,anchors=[[v.envelope.box[0],g.y],[v.envelope.box[0],v.supportY??v.envelope.box[1]]];
   return {kind:'estimated-calibrated',status:'proposed',value:localScale?M.distance(...anchors)*localScale:null,sourceViewId:v.viewId,sourceFrame:M.clone(inventory.views.find(x=>x.id===v.viewId).frame),anchors,scaleUsed:localScale,label:g.label,references:reference?[{kind:'estimated-calibrated',value:localScale*v.envelope.box[2],anchors:[[v.envelope.box[0],g.y],[v.envelope.box[0]+v.envelope.box[2],g.y]],sourceViewId:v.viewId,relationship:M.clone(reference)}]:[],relationship:'floor-span-to-elevation-registration',confirmationRequired:true};
  })).filter(h=>h.value>0).sort((a,b)=>views.find(v=>v.viewId===b.sourceViewId).guides.find(g=>g.levelHint===level.sourceLevel).confidence-views.find(v=>v.viewId===a.sourceViewId).guides.find(g=>g.levelHint===level.sourceLevel).confidence);
  const envelopeHeights=inventory.levels.filter(l=>l.buildingId===buildingId&&inventory.views.some(v=>v.buildingId===buildingId&&v.kind==='floor'&&v.levelId===l.sourceLevel)).length===1&&reference?views.filter(v=>v.envelope.status==='proposed'&&v.envelope.surfaceBoundaries&&v.openingRegistration?.metricCalibration?.status==='proposed').map(v=>{const bounds=v.envelope.surfaceBoundaries,scale=v.openingRegistration.metricCalibration.scaleUsed,anchors=[[v.envelope.box[0],bounds.lower.y],[v.envelope.box[0],bounds.upper.y]],view=inventory.views.find(s=>s.id===v.viewId);return {kind:'estimated-calibrated',status:'proposed',value:(bounds.lower.y-bounds.upper.y)*scale,sourceViewId:v.viewId,sourceFrame:M.clone(view.frame),anchors,scaleUsed:scale,relationship:'visible-envelope-surface-limits',physicalFloorDatum:'unresolved',axisScaleStatus:'horizontal-scale-projected-to-y-awaiting-confirmation',label:'Observed envelope height — floor datum unresolved',envelopeEvidence:M.clone(bounds),references:[{kind:'estimated-calibrated',status:'proposed',value:v.envelope.box[2]*scale,sourceViewId:v.viewId,sourceFrame:M.clone(view.frame),anchors:[[v.envelope.box[0],bounds.lower.y],[v.envelope.box[0]+v.envelope.box[2],bounds.lower.y]],relationship:{kind:'floor-to-elevation-openings',sourceReference:M.clone(reference),registration:M.clone(v.openingRegistration)},confirmationRequired:true}],confirmationRequired:true};}):[];
  const verticalCalibrations=views.map(v=>({sourceViewId:v.viewId,...verticalReferenceAssessment(inventory.views.find(s=>s.id===v.viewId))})).filter(a=>a.status!=='not-found'),datumObservations=heightFromLevelDatums(views,level.sourceLevel,reference,inventory,{includeAlternativePairs:true}),datumHeights=comparableDatumHeights(datumObservations),heightAlternatives=datumObservations.filter(h=>!datumHeights.includes(h)),heights=datumHeights.length?datumHeights:/^level-\d+$/.test(level.sourceLevel)?[]:legacyHeights.length?legacyHeights:envelopeHeights;
  if(heights.length){draft.height=M.clone(heights[0]);if(draft.height.relationship==='visible-envelope-surface-limits')draft.base={value:0,kind:'local-datum',status:'proposed',label:'Local observed envelope lower limit; not a floor or terrain altitude',physicalFloorDatum:'unresolved',sourceViewId:draft.height.sourceViewId,sourceFrame:M.clone(draft.height.sourceFrame),sourceBoundary:M.clone(draft.height.envelopeEvidence.lower),confirmationRequired:true};}draft.links=views.filter(v=>v.guides.some(g=>g.levelHint===level.sourceLevel)).map(v=>({sourceViewId:v.viewId,status:'proposed',relationship:v.envelope.surfaceBoundaries?'floor-contour-to-visible-envelope-registration':'floor-elevation-registration',...(v.envelope.surfaceBoundaries?{physicalFloorDatum:'unresolved'}:{})}));
  const spread=list=>list.length?Math.max(...list)/Math.min(...list)-1:0,scaleConflict=partial.conflict||spread(candidates.map(r=>r.scale))>.05;
  if(scaleConflict&&reference){draft.reference={...draft.reference,value:null,label:'',suggestedScale:reference.scale,suggestedValue:reference.value,conflict:true};}

  return {version:1,status:'proposed',buildingId,levelId:level.id,sourceViewId:floor.id,draft,referenceCandidates:candidates,unresolvedScaleReferences:[...floorReferences.unresolvedReferences,...(partial.unresolvedReferences||[])],heightCandidates:heights,heightAlternatives,verticalCalibrations,views,sourceOpeningGaps,contourDimensions:dimensions,openingSizeCandidates:floorOpeningSizes(floor,outline.points,sourceOpeningGaps),scaleConflict,heightConflict:verticalCalibrations.some(a=>a.status==='conflict')||spread(heights.map(h=>h.value))>.05,confirmationRequired:true,complete:false};
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
 function sourceOpeningType(proposal,inventory,draft,viewInfo,candidate,guide){
  const unresolved=reason=>({type:'window',typeEvidence:{status:'unresolved',reason,candidates:['window','door'],displayFallback:'window',confirmationRequired:true}}),gap=candidate.floorGap,evidence=gap?.sourcePixelEvidence;
  if(evidence?.kind!=='observed-door-swing')return unresolved('OPENING_TYPE_NOT_ESTABLISHED');
  const source=inventory.views.find(v=>v.id===proposal.sourceViewId),elevation=inventory.views.find(v=>v.id===viewInfo.viewId),level=inventory.levels.find(l=>l.id===proposal.levelId),outline=proposal.draft?.proposal,point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(!source||source.kind!=='floor'||!elevation||elevation.kind!=='elevation'||!level||source.buildingId!==level.buildingId||elevation.buildingId!==level.buildingId||source.levelId!==level.sourceLevel||draft.sourceViewId!==source.id||proposal.draft.sourceViewId!==source.id||outline?.sourceViewId!==source.id||!source.frame||!same(outline.sourceFrame,source.frame))return unresolved('OPENING_TYPE_SOURCE_MISMATCH');
  if(evidence.sourceViewId&&evidence.sourceViewId!==source.id||evidence.sourceFrame&&!same(evidence.sourceFrame,source.frame)||gap.sourceViewId&&gap.sourceViewId!==source.id||gap.sourceFrame&&!same(gap.sourceFrame,source.frame))return unresolved('OPENING_TYPE_SOURCE_MISMATCH');
  const points=proposal.draft.points?.map(p=>p.xy),edge=gap.edgeIndex,a=points?.[edge],b=points?.[(edge+1)%points.length];if(!point(a)||!point(b)||gap.anchors?.length!==2||!gap.anchors.every(point))return unresolved('OPENING_TYPE_SOURCE_MISMATCH');
  const length=M.distance(a,b),anchors=[evidence.from,evidence.to].map(n=>a.map((v,i)=>v+(b[i]-v)*n/length)),boundary=outline.sourceEdgeEvidence?.find(e=>e.edgeIndex===edge&&e.anchors?.length===2&&e.anchors.every((p,i)=>point(p)&&M.distance(p,[a,b][i])<.01)),sameSymbol=boundary?.openingEvidence?.some(e=>e.kind===evidence.kind&&e.from===evidence.from&&e.to===evidence.to&&same(e.sourcePoints,evidence.sourcePoints)&&same(e.arcPoints,evidence.arcPoints));
  if(!sameSymbol||!anchors.every((p,i)=>point(p)&&M.distance(p,gap.anchors[i])<.01)||evidence.status!=='proposed'||evidence.method!=='two-jambs-leaf-and-quarter-circle'||evidence.coordinateSystem!=='source-raster-pixels'||!(evidence.arc?.support>=.82)||!(evidence.leaf?.support>=.8)||evidence.jambs?.length!==2||!['hinge','leafTip','oppositeJamb'].every(k=>point(evidence.sourcePoints?.[k]))||!(evidence.arcPoints?.length>=3)||!evidence.arcPoints.every(point))return unresolved('DOOR_SWING_SOURCE_REQUIRED');
  const box=candidate.box,bottom=box[1]+box[3],distance=Number.isFinite(guide?.y)?guide.y-bottom:null,tolerance=2,datumSource=guide?.sourceViewId===elevation.id&&same(guide.sourceFrame,elevation.frame)&&guide.sourceGuide?.support>=.7;
  const thresholdEvidence={status:datumSource&&distance>=0&&distance<=tolerance?'proposed':'unresolved',reason:!datumSource?'FLOOR_DATUM_SOURCE_REQUIRED':distance>=0&&distance<=tolerance?null:'DOOR_THRESHOLD_OR_FRAME_TO_CONFIRM',sourceViewId:elevation.id,sourceFrame:M.clone(elevation.frame),sourceFrameBottom:[[box[0],bottom],[box[0]+box[2],bottom]],floorGuide:M.clone(guide),differencePixels:distance,tolerancePixels:tolerance,method:'observed-frame-bottom-compared-with-source-floor-datum',confirmationRequired:true};
  return {type:'door',typeEvidence:{status:'proposed',type:'door',subtype:'hinged-door',method:'source-door-swing-corresponding-to-elevation-frame',plan:{sourceViewId:source.id,sourceFrame:M.clone(source.frame),anchors:M.clone(gap.anchors),sourcePixelEvidence:M.clone(evidence)},elevation:{sourceViewId:elevation.id,sourceFrame:M.clone(elevation.frame),sourceBox:M.clone(candidate.box)},thresholdEvidence,confirmationRequired:true}};
 }
 // Both the native search and the model use this source-to-elevation mapping.
 // Native pixels refine a frame; they never supply a missing plan aperture.
 function openingViewContext(proposal,inventory,images,draft,v,walls,level){
  if(v.envelope.status!=='proposed'||!images[v.viewId])return null;const band=levelBand(v,draft,inventory);if(draft.height.relationship==='two-visible-level-datums'&&!band)return null;const guide=band?.lower||v.guides.filter(g=>g.levelHint===level.sourceLevel).sort((a,b)=>b.confidence-a.confidence)[0];if(!guide)return null;const sourceTop=band?.topY??v.envelope.box[1],frame={front:{u:[1,0],n:[0,-1]},back:{u:[-1,0],n:[0,1]},right:{u:[0,1],n:[1,0]},left:{u:[0,-1],n:[-1,0]}}[v.direction];if(!frame)return null;
  const dot=(p,u)=>p[0]*u[0]+p[1]*u[1],facing=walls.filter(w=>dot(w.normal,frame.n)>.9);if(!facing.length)return null;const xs=facing.flatMap(w=>[dot(w.from,frame.u),dot(w.to,frame.u)]),min=Math.min(...xs),max=Math.max(...xs),scaleX=(max-min)/v.envelope.box[2],scaleY=band?.scaleY??draft.height.value/(guide.y-(v.supportY??v.envelope.box[1])),seeds=(proposal.sourceOpeningGaps||[]).filter(g=>facing.some(w=>w.id===walls[g.edgeIndex]?.id)).map(g=>{const a=draft.points[g.edgeIndex].xy,b=draft.points[(g.edgeIndex+1)%draft.points.length].xy,seed=g.anchors.map(p=>{const ratio=M.distance(a,p)/M.distance(a,b),point=walls[g.edgeIndex].from.map((n,i)=>n+(walls[g.edgeIndex].to[i]-n)*ratio);return v.envelope.box[0]+(dot(point,frame.u)-min)/scaleX;});return {left:Math.min(...seed),right:Math.max(...seed),gap:g};});
  return {band,guide,sourceTop,frame,dot,facing,min,max,scaleX,scaleY,seeds};
 }
 function openingSearch(proposal,inventory,draft,v,seed,context,image){
  const floor=inventory.views.find(s=>s.id===proposal.sourceViewId),view=inventory.views.find(s=>s.id===v.viewId),level=inventory.levels.find(l=>l.id===proposal.levelId),gap=seed.gap,proof=gap?.sourcePixelEvidence,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(!floor||floor.kind!=='floor'||!view||view.kind!=='elevation'||!level||floor.buildingId!==level.buildingId||view.buildingId!==level.buildingId||floor.levelId!==level.sourceLevel||draft.sourceViewId!==floor.id||!same(proposal.draft.proposal?.sourceFrame,floor.frame)||proposal.draft.proposal?.sourceViewId!==floor.id||gap?.kind!=='source-gap'||gap.status!=='proposed'||gap.colouredOcclusion||!['observed-floor-frame','observed-door-swing','observed-sliding-frame'].includes(proof?.kind)||proof.coordinateSystem!=='source-raster-pixels'||proof.jambs?.length!==2)return null;
  const band={top:context.sourceTop+3,bottom:context.guide.y-2},left=Math.max(0,Math.floor(seed.left-12)),right=Math.min(image.width,Math.ceil(seed.right+12)),top=Math.max(0,Math.floor(band.top-4)),bottom=Math.min(image.height,Math.ceil(band.bottom+4));if(band.bottom<=band.top||right<=left||bottom<=top)return null;
  return {sourceViewId:view.id,sourceFrame:M.clone(view.frame),sourceFileId:view.fileId,sourcePage:view.page,buildingId:level.buildingId,levelId:level.id,floorSourceViewId:floor.id,floorSourceFrame:M.clone(floor.frame),sourceGap:M.clone(gap),seed:{left:seed.left,right:seed.right},band,region:[left,top,right-left,bottom-top]};
 }
 function openingFrameSearches(proposal,inventory,images,draft=proposal.draft){
  if(!M.scale(draft)||!(draft.height?.value>0)||M.validatePolygon(M.modelPoints(draft)).length)return [];
  const level=inventory.levels.find(l=>l.id===proposal.levelId);if(!level)return [];const model=M.modelPoints(draft),orientation=Math.sign(M.signedArea(model)),walls=model.map((from,i)=>{const to=model[(i+1)%model.length],length=M.distance(from,to);return {id:M.wallId(draft.contourId,draft.points[i].id,draft.points[(i+1)%model.length].id),from,to,length,normal:[orientation*(to[1]-from[1])/length,orientation*(from[0]-to[0])/length]};}),result=[];
  for(const v of proposal.views){const context=openingViewContext(proposal,inventory,images,draft,v,walls,level);if(!context)continue;for(const seed of context.seeds){const search=openingSearch(proposal,inventory,draft,v,seed,context,images[v.viewId]);if(!search||V.frameAtSeed(images[v.viewId],seed,search.band).length)continue;result.push(search);}}
  return result;
 }
 function nativeOpeningCandidates(view,inventory,search,{unresolvedCandidates=[]}={}){
  if(!search)return [];const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite),close=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Number.isFinite(v)&&Number.isFinite(b[i])&&Math.abs(v-b[i])<1e-6),file=inventory.files?.find(f=>f.id===view.fileId),result=[];
  for(const row of view.payload?.drawingReadings?.nativeOpeningFrames||[]){
   if(row.floorSourceViewId!==search.floorSourceViewId||row.sourceViewId!==view.id||!same(row.sourceGap?.anchors,search.sourceGap.anchors))continue;
   const refuse=reason=>unresolvedCandidates.push({status:'unresolved',reason,sourceViewId:view.id,sourceFrame:M.clone(view.frame),sourceBox:M.clone(search.region),evidence:M.clone(row),confirmationRequired:true});
   if(['sourceFrame','floorSourceFrame','sourceGap','seed','band','region'].some(k=>!same(row[k],search[k]))||row.levelId!==search.levelId||row.buildingId!==search.buildingId){refuse('NATIVE_OPENING_SOURCE_MISMATCH');continue;}
   if(row.status!=='proposed'){refuse(row.reason||'OPENING_FRAME_FOUR_SOURCE_EDGES_REQUIRED');continue;}
   const n=row.nativeSource,factor=n?.scaleFactor,padding=n?.padding,region=search.region,crop=view.frame?.cropToRaster,pdf=view.frame?.pdfToRaster;
   if(n?.method!=='retained-pdf-region'||n.sourceViewId!==view.id||n.sourceFileId!==view.fileId||n.sourcePage!==view.page||!file?.sha256||n.sourceSha256!==file.sha256||!same(n.sourceFrame,view.frame)||!same(n.sourceRegion,region)||factor!==4||padding!==12||crop?.length!==6||pdf?.length!==6||!close(n.viewToTile,[factor,0,0,factor,padding-factor*region[0],padding-factor*region[1]])||!close(n.pdfToTile,pdf.map((v,i)=>v*factor+(i===4?padding-factor*(crop[4]+region[0]):i===5?padding-factor*(crop[5]+region[1]):0)))||!close(n.canvasSize,[Math.ceil(region[2]*factor)+2*padding,Math.ceil(region[3]*factor)+2*padding])){refuse('NATIVE_OPENING_SOURCE_MISMATCH');continue;}
   const back=p=>[(p[0]-padding)/factor+region[0],(p[1]-padding)/factor+region[1]],mappedLine=(a,b)=>a&&b&&a.anchors?.length===2&&b.anchors?.length===2&&b.anchors.every(point)&&a.anchors.every((p,j)=>close(p,back(b.anchors[j])))&&Number.isFinite(a.support)&&a.support===b.support&&a.support>=0&&a.support<=1&&a.supportedSamples===b.supportedSamples&&a.totalSamples===b.totalSamples&&a.totalSamples>0&&Math.abs(a.supportedSamples/a.totalSamples-a.support)<1e-9&&a.maxUnsupportedSamples===b.maxUnsupportedSamples,mappedBox=b=>[...back(b.slice(0,2)),b[2]/factor,b[3]/factor];
   for(let i=0;i<(row.candidates||[]).length;i++){
    const candidate=row.candidates[i],native=row.nativeCandidates?.[i],proof=candidate.frameEvidence,raw=native?.frameEvidence,box=candidate.box,edges=['left','right','top','bottom'];
    const expectedEdges=Array.isArray(box)&&box.length===4?{left:[[box[0],box[1]],[box[0],box[1]+box[3]]],right:[[box[0]+box[2],box[1]],[box[0]+box[2],box[1]+box[3]]],top:[[box[0],box[1]],[box[0]+box[2],box[1]]],bottom:[[box[0],box[1]+box[3]],[box[0]+box[2],box[1]+box[3]]]}:{};
    if(!native?.box?.every(Number.isFinite)||!close(box,mappedBox(native.box))||proof?.status!=='proposed'||raw?.status!=='proposed'||proof.coordinateSystem!=='source-raster-pixels'||proof.samplingScale!==factor||proof.metricsUnit!=='native-samples'||!close(proof.box,box)||!close(proof.rasterSize,size(view))||!close(raw.rasterSize,n.canvasSize)||edges.some(k=>{const a=proof.edges?.[k],b=raw.edges?.[k];return !a||!b||a.anchors?.length!==2||b.anchors?.length!==2||!b.anchors.every(point)||!a.anchors.every((p,j)=>close(p,back(b.anchors[j]))&&close(p,expectedEdges[k]?.[j]))||a.support!==b.support||a.supportedSamples!==b.supportedSamples||a.totalSamples!==b.totalSamples||a.maxUnsupportedSamples!==b.maxUnsupportedSamples||!Number.isFinite(a.support)||a.support<.8||a.support>1||!(a.totalSamples>0)||Math.abs(a.supportedSamples/a.totalSamples-a.support)>1e-9||!Number.isFinite(a.maxUnsupportedSamples)||a.maxUnsupportedSamples<0||a.maxUnsupportedSamples>3*factor;})||proof.cornersObserved?.length!==4||!proof.cornersObserved.every(Boolean)||proof.cornerPoints?.length!==4||raw.cornerPoints?.length!==4||!proof.cornerPoints.every((p,j)=>point(raw.cornerPoints[j])&&close(p,back(raw.cornerPoints[j])))||!['top','bottom'].some(k=>proof.extensions?.[k]?.length===2&&proof.extensions[k].every((e,j)=>e.support<.35&&mappedLine(e,raw.extensions?.[k]?.[j])))){refuse('NATIVE_OPENING_FOUR_EDGES_REQUIRED');continue;}
    if(proof.jambContinuationAbove?.length!==2||raw.jambContinuationAbove?.length!==2||!proof.jambContinuationAbove.every((e,j)=>mappedLine(e,raw.jambContinuationAbove[j]))||proof.jambContinuationAbove.every(e=>e.support>=.8&&e.maxUnsupportedSamples<=3*factor)){refuse('NATIVE_OPENING_HEAD_NOT_ESTABLISHED');continue;}
    if(box[0]<search.region[0]||box[1]<search.band.top-2||box[0]+box[2]>search.region[0]+search.region[2]||box[1]+box[3]>search.band.bottom+2||Math.abs(box[2]-(search.seed.right-search.seed.left))>Math.max(6,(search.seed.right-search.seed.left)*.1)||Math.abs(box[0]+box[2]/2-(search.seed.left+search.seed.right)/2)>Math.max(3,(search.seed.right-search.seed.left)*.08)){refuse('NATIVE_OPENING_PROJECTION_MISMATCH');continue;}
    result.push({...M.clone(candidate),floorGap:M.clone(search.sourceGap),nativeFrameEvidence:{search:M.clone(search),nativeSource:M.clone(n),nativeCandidate:M.clone(native),frameEvidence:M.clone(proof),status:'proposed',confirmationRequired:true}});
   }
  }return result;
 }
 function openingsFor(proposal,inventory,images,draft=proposal.draft,{unresolvedCandidates=[]}={}){
  if(!M.scale(draft)||!(draft.height.value>0)||M.validatePolygon(M.modelPoints(draft)).length)return [];
  const level=inventory.levels.find(l=>l.id===proposal.levelId),model=M.modelPoints(draft),height=draft.height.value,orientation=Math.sign(M.signedArea(model)),walls=model.map((from,i)=>{const to=model[(i+1)%model.length],length=M.distance(from,to);return {id:M.wallId(draft.contourId,draft.points[i].id,draft.points[(i+1)%model.length].id),from,to,length,normal:[orientation*(to[1]-from[1])/length,orientation*(from[0]-to[0])/length]};}),result=[];
  for(const v of proposal.views){const context=openingViewContext(proposal,inventory,images,draft,v,walls,level);if(!context)continue;const {band,guide,sourceTop,frame,dot,facing,min,max,scaleX,scaleY,seeds}=context,boxes=seeds.flatMap(seed=>{const pad=Math.max(12,(seed.right-seed.left)*.65),l=Math.max(v.envelope.box[0],seed.left-pad),r=Math.min(v.envelope.box[0]+v.envelope.box[2],seed.right+pad);const framed=V.frameAtSeed(images[v.viewId],seed,{top:sourceTop+3,bottom:guide.y-2});const sizes=(proposal.openingSizeCandidates||[]).filter(s=>s.edgeIndex===seed.gap.edgeIndex&&M.distance(s.anchors[0],seed.gap.anchors[0])<4),recovered=sizes.length===1?V.occludedFrameAtSeed(images[v.viewId],seed,{top:sourceTop+3,bottom:guide.y-2,width:sizes[0].width/scaleX,height:sizes[0].height/scaleY,occlusions:v.envelope.occlusions||[]}):[];const search=openingSearch(proposal,inventory,draft,v,seed,context,images[v.viewId]),nativeFrames=nativeOpeningCandidates(inventory.views.find(s=>s.id===v.viewId),inventory,search,{unresolvedCandidates});return (nativeFrames.length?nativeFrames:recovered.length?recovered:framed.length?framed:V.glazingFrames(images[v.viewId],[l,v.envelope.box[1],r-l,v.envelope.box[3]],{top:sourceTop+3,bottom:guide.y-2})).filter(c=>Math.min(c.box[0]+c.box[2],seed.right)-Math.max(c.box[0],seed.left)>Math.min(c.box[2],seed.right-seed.left)*.55&&Math.abs(c.box[0]+c.box[2]/2-(seed.left+seed.right)/2)<Math.max(12,(c.occlusionEvidence?c.box[2]:seed.right-seed.left)*.45)).map(c=>({...c,floorGap:seed.gap}));});
   // A continuous floor wall line can hide its opening gap. A closed,
   // monochrome aperture in the compatible elevation is independent evidence;
   // it remains a proposal without claiming a floor-plan correspondence.
   const apertureBand={top:(band?.topY??v.supportY??v.envelope.box[1])+3,bottom:guide.y-2},paneOptions={bandHeight:apertureBand.bottom-apertureBand.top},independentFrames=V.elevationOpenings(images[v.viewId],v.envelope.box,apertureBand).flatMap(candidate=>{const paneEvidence=V.coherentPaneGroup(images[v.viewId],candidate.box,paneOptions);return paneEvidence?[{...candidate,paneEvidence}]:[];});
   // Closing white pixels can erase a thin dark window frame and connect its
   // glazing to the wall background. These untouched pane components provide
   // search seeds only: each resulting aperture still needs its actual frame.
   for(const pane of V.glazingFrames(images[v.viewId],v.envelope.box,{...apertureBand,preserveThinFrames:true}))for(const candidate of V.frameAtSeed(images[v.viewId],{left:pane.box[0],right:pane.box[0]+pane.box[2]},apertureBand))if(!independentFrames.some(c=>overlapBox(c.box,candidate.box).fraction>.4))independentFrames.push(candidate);
   for(const candidate of independentFrames){
    if(!boxes.some(b=>overlapBox(b.box,candidate.box).fraction>.4))boxes.push({...candidate,floorCorrespondence:{status:'unresolved',reason:'FLOOR_GAP_NOT_DETECTED'}});
   }
   for(const candidate of boxes){if(!candidate.occlusionEvidence&&(v.envelope.occlusions||[]).some(([x,y,w,h])=>{const [l,t,bw,bh]=candidate.box;return Math.max(0,Math.min(l+bw,x+w)-Math.max(l,x))*Math.max(0,Math.min(t+bh,y+h)-Math.max(t,y))>bw*bh*.1;}))continue;const [x,y,bw,bh]=candidate.box,left=min+(x-v.envelope.box[0])*scaleX,right=left+bw*scaleX,wall=facing.filter(w=>Math.min(dot(w.from,frame.u),dot(w.to,frame.u))<=left+.03&&Math.max(dot(w.from,frame.u),dot(w.to,frame.u))>=right-.03).sort((a,b)=>dot(b.from,frame.n)-dot(a.from,frame.n))[0];if(!wall)continue;
    const first=dot(wall.from,frame.u),last=dot(wall.to,frame.u),offset=first<last?left-first:first-right,sill=(guide.y-y-bh)*scaleY,opening={id:'opening:'+v.viewId+':'+[x,y,bw,bh].map(Math.round).join('-'),sourceId:'frame:'+v.viewId+':'+[x,y,bw,bh].map(Math.round).join('-'),sourceViewId:v.viewId,sourceFrame:M.clone(inventory.views.find(s=>s.id===v.viewId).frame),sourceBox:candidate.box,...(candidate.floorCorrespondence?{floorCorrespondence:M.clone(candidate.floorCorrespondence)}:{}),wallId:wall.id,type:'window',offset,width:bw*scaleX,height:bh*scaleY,sill,status:'proposed',kind:'estimated-calibrated',scalesUsed:{x:scaleX,y:scaleY},references:[M.clone(draft.reference),M.clone(draft.height)],writtenSizeCandidates:(proposal.openingSizeCandidates||[]).filter(s=>s.edgeIndex===candidate.floorGap?.edgeIndex&&M.distance(s.anchors[0],candidate.floorGap.anchors[0])<4).map(M.clone),positionEvidence:{kind:'estimated-calibrated',sourceViewId:v.viewId,sourceBox:M.clone(candidate.box),scalesUsed:{x:scaleX,y:scaleY},...(candidate.occlusionEvidence?{occlusionEvidence:M.clone(candidate.occlusionEvidence)}:{}),status:'proposed'},confirmationRequired:true};
    const sourceView=inventory.views.find(s=>s.id===v.viewId),sourceGap=candidate.floorGap?.sourcePixelEvidence,planAperture=['observed-floor-frame','observed-door-swing','observed-sliding-frame'].includes(sourceGap?.kind)&&candidate.floorGap.status==='proposed'&&sourceGap.coordinateSystem==='source-raster-pixels'&&sourceGap.jambs?.length===2,writtenAperture=readings(sourceView).some(row=>row.confidence>=70&&row.box?.length===4&&openingSize(row.text)&&row.box[0]>=x&&row.box[2]<=x+bw&&row.box[1]>=y&&row.box[3]<=y+bh);
    const texture=!planAperture&&!writtenAperture?V.closedCellNeighborhood(images[v.viewId],candidate.box):null;
    if(texture){unresolvedCandidates.push({id:opening.id,status:'unresolved',reason:texture.reason,sourceViewId:v.viewId,sourceFrame:M.clone(opening.sourceFrame),sourceBox:M.clone(candidate.box),candidate:M.clone(opening),evidence:M.clone(texture),confirmationRequired:true});continue;}
    Object.assign(opening,sourceOpeningType(proposal,inventory,draft,v,candidate,guide));
    if(candidate.nativeFrameEvidence)opening.nativeFrameEvidence=M.clone(candidate.nativeFrameEvidence);
    if(candidate.paneEvidence)opening.paneEvidence={...M.clone(candidate.paneEvidence),sourceViewId:v.viewId,sourceFrame:M.clone(opening.sourceFrame)};
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
  if(confirmedDraft.height?.physicalFloorDatum==='unresolved'||confirmedDraft.base?.physicalFloorDatum==='unresolved')return {status:'unresolved',reason:'LOWER_WALL_FLOOR_DATUM_REQUIRED'};
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
   const fascia=band&&images?.[v.viewId]?V.roofCeilingBand(images[v.viewId],v.roofProfile,band.upper,{wallHeightPixels:band.bottomY-band.topY,occlusions:v.envelope.occlusions||[],sourceView:inventory.views.find(view=>view.id===v.viewId)}):null;
   for(const s of v.roofProfile?.slopes||[]){const separated=band&&Math.abs(s?.eaveY-band.topY)>Math.max(4,(band.bottomY-band.topY)*.04);if(!s?.eaveY||separated&&fascia?.status!=='observed')continue;const eave=[frame.sign*(min+(s.eaveX-v.envelope.box[0])*scaleX),reviewed.base.value+(guide.y-s.eaveY)*scaleY],high=[frame.sign*(min+(s.highX-v.envelope.box[0])*scaleX),reviewed.base.value+(guide.y-s.highY)*scaleY];if(high[1]-eave[1]<.25)continue;
    halves.push({axis:frame.axis,side:eave[0]<high[0]?'min':'max',eave,high,ridgeEvidence:M.clone(s.ridgeEvidence||null),source:{sourceViewId:v.viewId,sourceFrame:M.clone(inventory.views.find(view=>view.id===v.viewId).frame),anchors:[[s.eaveX,s.eaveY],[s.highX,s.highY]],scaleX,scaleY,kind:'estimated-calibrated',status:'proposed',sourceWallBox:M.clone(v.envelope.box),sourceFloorGuide:M.clone(guide),...(s.eaveJunction?{eaveJunction:M.clone(s.eaveJunction)}:{}),...(separated?{ceilingBandEvidence:M.clone(fascia)}:{}),relationship:'floor-elevation-and-roof-stroke-registration'}});
   }
  }
  const assembled=assembleRoofProfiles(halves,{ridgeChoices});if(assembled.status!=='proposed')return {...assembled,availableHalves:halves};
  const {profiles,sources,checks}=assembled;
  const roof={version:1,id:'roof:'+proposal.levelId+':main',levelId:proposal.levelId,buildingId:proposal.buildingId,status:'proposed',profiles,sources,checks,complete:false,confirmationRequired:true,kind:'estimated-calibrated',quantityStatus:'partial-unreviewed',registrationChoices:M.clone(ridgeChoices),fasciaBottom:reviewed.base.value+reviewed.height.value,note:'Only the roof bounded by these source profiles is proposed. Porches, garage roofs and unrepresented volumes remain separate.'};
  if(images)roof.extensions=roofExtensions(proposal,inventory,images,reviewed,roof);
  // A separate roof plan can locate returns outside the room contour. It
  // supplies XY only: each added component still needs its own orthogonal
  // elevation profiles and an observed ridge reaching the parent surface.
  if(images&&inventory.views.some(v=>v.kind==='roof'&&v.buildingId===roof.buildingId)){
   const plan=roofPlanEvidence(),assessment=plan?.propose(roof,proposal,inventory,reviewed,images,{registerElevation:elevationRegistration});
   if(assessment?.evidence){roof.extensions=[...(roof.extensions||[]),...assessment.extensions];roof.roofPlanEvidence=assessment.evidence;}
  }
  const pitch=roofPitchEvidence();if(pitch){const evidence=pitch.assess(roof,inventory,reviewed,images||{});if(evidence.observations.length)roof.pitchEvidence=evidence;}
  return roof;
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
 return Object.freeze({version:1,constructionHeightObservations,elevationApertureFrames,openingSpanRegistration,observedEnvelopeLimits,nativeDimensionEvidence,verticalReferenceAssessment,localizeTargetContour,registeredSpan,gridElevationEnvelope,crossFloorOutline,levelBand,floorExtentEvidence,floorDimensionAssociation,overallScaleReferences,partialScaleReferences,partialDimensionCandidates,propose,foundationGuide,constrainProposal,contourDimensions,constrainContour,openingSize,floorOpeningSizes,wallSupport,assignOpeningSurfaces,distinctOpeningFrames,joinRoofReturn,commonRidge,roofExtensions,assembleRoofProfiles,recoupRegistrations,reviseVolume,volumeRoof,observedOpenings,secondaryVolumes,elevationRegistration,roofProposal,sourceOpeningType,openingFrameSearches,nativeOpeningCandidates,openingsFor,lowerPlanes,faceSpan,referenceObservations,references,floorGuide,datumFromCaption,heightFromLevelDatums,size,readings});
});
