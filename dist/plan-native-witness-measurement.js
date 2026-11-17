/* Native intersection metrology, after the existing dimension-mark detector.
 * No written value, expected scale or other drawing enters the pixel search. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MIRNativeWitnessMeasurement=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),finite=Number.isFinite;
 const point=p=>Array.isArray(p)&&p.length===2&&p.every(finite),anchors=a=>Array.isArray(a)&&a.length===2&&a.every(point),near=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((n,i)=>finite(n)&&Math.abs(n-b[i])<1e-7);
 const median=values=>{const a=values.slice().sort((x,y)=>x-y),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
 const METHOD='native-rail-witness-centres',MAX_SAMPLES=20000,MAX_COLUMNS=256;
 function sourceIssues(source,sourceAnchors,proof){
  const issues=[],m=source?.viewToTile,r=source?.sourceRegion,f=source?.scaleFactor,p=source?.padding,size=source?.canvasSize,frame=source?.sourceFrame,affine=frame?.pdfToRaster,crop=frame?.cropToRaster,valid=a=>Array.isArray(a)&&a.every(finite);
  if(source?.method!=='retained-pdf-region'||typeof source.sourceViewId!=='string'||typeof source.sourceFileId!=='string'||!Number.isInteger(source.sourcePage)||source.sourcePage<1||typeof source.sourceSha256!=='string'||!source.sourceSha256||!frame||!anchors(sourceAnchors))issues.push('NATIVE_WITNESS_SOURCE_REQUIRED');
  if(!finite(f)||f<1||f>8||!finite(p)||p<0||p>64||!Array.isArray(r)||r.length!==4||!r.every(finite)||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||!near(m,[f,0,0,f,p-r[0]*f,p-r[1]*f])||!near(size,[Math.ceil(r[2]*f)+2*p,Math.ceil(r[3]*f)+2*p])||size?.some(n=>!Number.isInteger(n)||n>4096)||size?.[0]*size?.[1]>2000000)issues.push('NATIVE_WITNESS_FRAME_INVALID');
  if(issues.length)return issues;
  if(!valid(affine)||affine.length!==6||!valid(crop)||crop.length!==6||!near(crop.slice(0,4),[1,0,0,1])||!valid(frame.rasterSize)||frame.rasterSize.length!==2||frame.rasterSize.some(n=>n<=0)||![0,90,180,270].includes(source.sourceRotation)){issues.push('NATIVE_WITNESS_FRAME_INVALID');return issues;}
  const scale=Math.hypot(affine[0],affine[1]),other=Math.hypot(affine[2],affine[3]),translation=[p-f*(crop[4]+r[0]),p-f*(crop[5]+r[1])],pdfToTile=affine.map((n,i)=>n*f+(i===4?translation[0]:i===5?translation[1]:0));
  if(!(scale>0)||Math.abs(scale-other)>scale*.000001||Math.abs(affine[0]*affine[2]+affine[1]*affine[3])>scale*scale*.000001||!near(source.pdfToTile,pdfToTile)||!near(source.sourcePageRegion,[crop[4]+r[0],crop[5]+r[1],r[2],r[3]])||source.viewportTransform&&!near(source.viewportTransform,affine.map(n=>n*f)))issues.push('NATIVE_WITNESS_FRAME_INVALID');
  const map=q=>[q[0]*f+m[4],q[1]*f+m[5]];
  if(proof?.status!=='observed'||proof.kind!=='dimension-line-with-end-marks-and-witnesses'||!['x','y'].includes(proof.axis)||!anchors(proof.anchors)||!proof.anchors.every((q,i)=>near(q,map(sourceAnchors[i])))||proof.pixelSupport<.85||proof.maxGap>4||proof.markers?.length!==2||proof.intermediateMarkCheck?.markers?.length!==0)issues.push('NATIVE_WITNESS_MARK_PROOF_REQUIRED');
  return issues;
 }
 function run(sample,width,height,proof,source){
  const axis=proof.axis==='x'?0:1,across=1-axis,endpoints=[],measured=copy(proof.anchors),f=source.scaleFactor;
  const at=(u,v)=>axis===0?[u,v]:[v,u],rgba=(u,v)=>sample(...at(u,v));
  const neutral=p=>Array.isArray(p)&&p.length===4&&p.every(Number.isInteger)&&p.every(n=>n>=0&&n<=255)&&p[3]>160&&Math.max(...p.slice(0,3))-Math.min(...p.slice(0,3))<30;
  const gray=p=>(p[0]+p[1]+p[2])/3;
  const unresolved=(reason,extra={})=>({status:'unresolved',reason,endpoints,...extra});
  for(let i=0;i<2;i++){
   const marker=proof.markers[i],anchor=proof.anchors[i],centre=marker.strokeCenter;
   if(!near(marker.point,anchor)||!point(centre)||!['diagonal-tick','compact-diagonal-tick'].includes(marker.kind)||!(marker.anchorTolerancePx>0&&marker.anchorTolerancePx<=2)||Math.hypot(...centre.map((v,j)=>v-anchor[j]))>marker.anchorTolerancePx+1e-7||!Array.isArray(marker.witnesses))return unresolved('NATIVE_WITNESS_MARK_PROOF_REQUIRED');
   const sides=[];
   for(const sign of [-1,1]){
    const witnesses=marker.witnesses.filter(w=>anchors(w)&&near(w[0],centre)&&Math.abs(w[1][axis]-centre[axis])<1e-7&&Math.sign(w[1][across]-centre[across])===sign);
    if(witnesses.length!==1)return unresolved('NATIVE_WITNESS_BOTH_SIDES_REQUIRED');
    const witness=witnesses[0],length=Math.abs(witness[1][across]-centre[across]);
    // The existing marker detector inspects diagonals out to six pixels.
    // Exclude that stencil plus two pixels, and stay inside its real witness.
    const first=centre[across]+sign*8,last=witness[1][across]-sign,positions=[];
    for(let v=sign>0?Math.ceil(first):Math.floor(first);sign*(last-v)>=0;v+=sign)positions.push(v);
    if(positions.length<6||positions.length>MAX_COLUMNS)return unresolved(positions.length>MAX_COLUMNS?'NATIVE_WITNESS_REGION_BUDGET':'NATIVE_WITNESS_CONTINUATION_REQUIRED');
    const radius=marker.anchorTolerancePx+1,lo=Math.ceil(anchor[axis]-radius),hi=Math.floor(anchor[axis]+radius),columns=[],centres=[];
    let missing=0,maxGap=0;
    for(const v of positions){
     const margins=[-1,1].map(s=>[2,3,4].map(d=>rgba(Math.round(anchor[axis]+s*(radius+d)),v))),validPaper=margins.flat().every(neutral),paper=validPaper?margins.map(list=>median(list.map(gray))):[];
     let column={at:v,status:'unresolved',reason:'NATIVE_WITNESS_PAPER_REQUIRED'};
     if(validPaper&&paper.every(n=>n>=248)&&Math.abs(paper[0]-paper[1])<=4){
      const background=Math.min(...paper),components=[];let component=[];
      for(let u=lo;u<=hi;u++){
       const pixel=rgba(u,v),weight=neutral(pixel)?background-gray(pixel):0;
       if(weight>=6)component.push({coordinate:u+.5,weight});
       else if(component.length){components.push(component);component=[];}
      }
      if(component.length)components.push(component);
      const lines=components.filter(c=>Math.max(...c.map(p=>p.weight))>=20);
      if(lines.length>1)return unresolved('NATIVE_WITNESS_MULTIPLE_STROKES',{ambiguousColumn:{endpoint:i,side:sign,at:v,components:lines}});
      if(lines.length===1&&lines[0].length<=Math.max(3,Math.ceil(3*f/2))){
       const pixels=lines[0],weight=pixels.reduce((sum,p)=>sum+p.weight,0),position=pixels.reduce((sum,p)=>sum+p.coordinate*p.weight,0)/weight;
       column={at:v,status:'observed',centre:position,paper,strokeWidthPx:pixels.length,pixelCentres:pixels.map(p=>p.coordinate),weights:pixels.map(p=>p.weight)};centres.push(position);
      }else column.reason=lines.length?'NATIVE_WITNESS_BROAD_STROKE':'NATIVE_WITNESS_STROKE_REQUIRED';
     }
     columns.push(column);if(column.status==='observed')missing=0;else maxGap=Math.max(maxGap,++missing);
    }
    const support=centres.length/positions.length;
    if(support<.85||maxGap>4||centres.length<6)return unresolved('NATIVE_WITNESS_SUPPORT_REQUIRED',{failedSide:{endpoint:i,side:sign,witness:copy(witness),columns,support,maxGap}});
    const position=median(centres),mad=median(centres.map(n=>Math.abs(n-position)));
    sides.push({side:sign,witness:copy(witness),lengthPixels:length,excludedMarkerRadiusPx:8,normalSearch:[lo,hi],columns,support,maxGap,centre:position,medianAbsoluteDeviationPx:mad});
   }
   const sideDifference=Math.abs(sides[0].centre-sides[1].centre),agreementBound=.5+sides.reduce((n,s)=>n+s.medianAbsoluteDeviationPx,0);
   if(sideDifference>agreementBound)return unresolved('NATIVE_WITNESS_SIDE_DISAGREEMENT',{failedEndpoint:{endpoint:i,sides,sideDifference,agreementBound}});
   const position=median(sides.map(s=>s.centre)),bound=marker.anchorTolerancePx+1+.5,displacement=position-anchor[axis];
   if(Math.abs(displacement)>bound+1e-7)return unresolved('NATIVE_WITNESS_LOCALISATION_BOUNDS');
   measured[i][axis]=position;
   endpoints.push({originalAnchor:copy(anchor),measuredAnchor:copy(measured[i]),marker:copy(marker),axis:proof.axis,sides,sideDifferencePx:sideDifference,sideAgreementBoundPx:agreementBound,displacementPx:displacement,maximumDisplacementPx:bound,
    resolution:{pixelCentreConvention:'integer pixel index plus one half',samplingHalfWidthPx:.5,sideDifferencePx:sideDifference,medianAbsoluteDeviationsPx:sides.map(s=>s.medianAbsoluteDeviationPx),notAStatisticalConfidence:true}});
  }
  if((measured[1][axis]-measured[0][axis])*(proof.anchors[1][axis]-proof.anchors[0][axis])<=0)return unresolved('NATIVE_WITNESS_ORDER_INVALID');
  return {status:'observed',measuredNativeAnchors:measured,endpoints};
 }
 function measure(image,{nativeLineEvidence,sourceAnchors,nativeSource},{cancelled=()=>false}={}){
  const evidence={version:1,method:METHOD,status:'unresolved',sourceAnchors:copy(sourceAnchors||[]),nativeAnchors:copy(nativeLineEvidence?.anchors||[]),nativeSource:copy(nativeSource||null),nativeLineEvidence:copy(nativeLineEvidence||null)},fail=reason=>({status:'unresolved',reason,measurementEvidence:{...evidence,reason}});
  const issues=sourceIssues(nativeSource,sourceAnchors,nativeLineEvidence);if(issues.length)return fail(issues[0]);
  if(cancelled())return fail('NATIVE_WITNESS_CANCELLED');
  if(!image?.data||image.width!==nativeSource.canvasSize[0]||image.height!==nativeSource.canvasSize[1]||image.data.length!==image.width*image.height*4)return fail('NATIVE_WITNESS_IMAGE_REQUIRED');
  const samples=new Map();let missing=false;
  const sample=(x,y)=>{
   if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=image.width||y>=image.height){missing=true;return null;}
   const at=(y*image.width+x)*4,pixel=Array.from(image.data.subarray(at,at+4)),key=x+':'+y;samples.set(key,[x,y,...pixel]);return pixel;
  };
  const result=run(sample,image.width,image.height,nativeLineEvidence,nativeSource);
  if(missing)return fail('NATIVE_WITNESS_REGION_OUTSIDE_TILE');
  if(samples.size>MAX_SAMPLES)return fail('NATIVE_WITNESS_REGION_BUDGET');
  const complete={...evidence,...result,rasterSamples:[...samples.values()]};
  if(result.status!=='observed')return {status:'unresolved',reason:result.reason,measurementEvidence:complete};
  const m=nativeSource.viewToTile,measuredAnchors=result.measuredNativeAnchors.map(p=>[(p[0]-m[4])/m[0],(p[1]-m[5])/m[3]]);
  return {status:'observed',measuredAnchors,measurementEvidence:{...complete,measuredAnchors:copy(measuredAnchors)}};
 }
 function validate(observation,{view,files,sourceObservation}={}){
  try{
   const e=observation?.measurementEvidence,issues=[],bad=code=>{if(!issues.includes(code))issues.push(code);};
   if(!e)return observation?.measuredAnchors||observation?.originalAnchors?['NATIVE_WITNESS_EVIDENCE_REQUIRED']:[];
   const original=observation.originalAnchors||observation.anchors,normalized=!!observation.originalAnchors,n=e.nativeSource;
   if(e.version!==1||e.method!==METHOD||!['observed','unresolved'].includes(e.status)||!anchors(original)||!same(e.sourceAnchors,original)||!same(e.nativeAnchors,e.nativeLineEvidence?.anchors)||!same(e.nativeLineEvidence,observation.nativeLineEvidence)||!same(n,observation.nativeSource))bad('NATIVE_WITNESS_SNAPSHOT_MISMATCH');
   for(const code of sourceIssues(n,original,e.nativeLineEvidence))bad(code);
   if(n?.sourceViewId!==observation.sourceViewId||!same(n?.sourceFrame,observation.sourceFrame))bad('NATIVE_WITNESS_SOURCE_MISMATCH');
   if(view&&(view.id!==observation.sourceViewId||view.fileId!==n?.sourceFileId||view.page!==n?.sourcePage||!same(view.frame,observation.sourceFrame)||(view.orientation??view.payload?.sourceRotation)!==n?.sourceRotation))bad('NATIVE_WITNESS_SOURCE_MISMATCH');
   if(view&&n?.sourceRegion){const size=[view.payload?.sourceWidth||view.zone?.[2]||view.frame?.rasterSize?.[0],view.payload?.sourceHeight||view.zone?.[3]||view.frame?.rasterSize?.[1]];if(size.some((v,i)=>!finite(v)||n.sourceRegion[i]+n.sourceRegion[i+2]>v+.001))bad('NATIVE_WITNESS_FRAME_INVALID');}
   if(files&&!files.some(file=>file.id===n?.sourceFileId&&file.sha256===n?.sourceSha256))bad('NATIVE_WITNESS_SOURCE_DIGEST');
   if(sourceObservation){
    for(const key of ['id','text','value','confidence','sourceViewId','sourceFrame','sourceReading','textBox','datumEvidence','lineEvidence','nativeLineEvidence','nativeSource','measuredAnchors','measurementEvidence'])if(!same(observation[key],sourceObservation[key]))bad('NATIVE_WITNESS_ORIGINAL_CHANGED');
    if(!same(original,sourceObservation.originalAnchors||sourceObservation.anchors))bad('NATIVE_WITNESS_ORIGINAL_CHANGED');
   }
   if(issues.length)return issues;
   if(e.status==='unresolved'&&(normalized||observation.measuredAnchors||e.measuredAnchors||e.measuredNativeAnchors||typeof e.reason!=='string'||!e.reason))bad('NATIVE_WITNESS_UNRESOLVED_MEASUREMENT');
   // Some valid marker proofs have only one witness or a continuation too
   // short for metrology. Replay those deterministic refusals even when no
   // pixel was requested; they preserve the original coarse calibration.
   const replayable=Array.isArray(e.rasterSamples);
   if(e.status==='observed'&&(!replayable||!e.rasterSamples.length))bad('NATIVE_WITNESS_PIXELS_REQUIRED');
   if(replayable){
    const samples=new Map(),used=new Set();let missing=false;
    if(e.rasterSamples.length>MAX_SAMPLES)bad('NATIVE_WITNESS_REGION_BUDGET');
    for(const p of e.rasterSamples){
     if(!Array.isArray(p)||p.length!==6||!p.every(Number.isInteger)||p[0]<0||p[1]<0||p[0]>=n.canvasSize[0]||p[1]>=n.canvasSize[1]||p.slice(2).some(c=>c<0||c>255)||samples.has(p[0]+':'+p[1])){bad('NATIVE_WITNESS_PIXELS_INVALID');break;}samples.set(p[0]+':'+p[1],p.slice(2));
    }
    if(issues.length)return issues;
    const sample=(x,y)=>{const key=x+':'+y;if(!samples.has(key)){missing=true;return null;}used.add(key);return samples.get(key);},result=run(sample,n.canvasSize[0],n.canvasSize[1],e.nativeLineEvidence,n);
    if(missing||used.size!==samples.size||['status','reason','endpoints','measuredNativeAnchors','ambiguousColumn','failedSide','failedEndpoint'].some(key=>!same(result[key],e[key])))bad('NATIVE_WITNESS_PIXEL_PROOF_MISMATCH');
    if(result.status==='observed'){
     const m=n.viewToTile,points=result.measuredNativeAnchors.map(p=>[(p[0]-m[4])/m[0],(p[1]-m[5])/m[3]]);
     if(!anchors(observation.measuredAnchors)||!same(points,e.measuredAnchors)||!same(points,observation.measuredAnchors)||normalized&&!same(points,observation.anchors))bad('NATIVE_WITNESS_MEASURED_ANCHORS');
     if(normalized){const span=Math.hypot(...points[1].map((v,i)=>v-points[0][i])),scale=observation.value/span;if(!(scale>0)||!finite(observation.scale)||Math.abs(observation.scale-scale)>1e-10||observation.calibration?.metresPerPixel!==scale)bad('NATIVE_WITNESS_SCALE_MISMATCH');}
    }
   }else if(e.status==='unresolved'&&!['NATIVE_WITNESS_CANCELLED','NATIVE_WITNESS_IMAGE_REQUIRED','NATIVE_WITNESS_REGION_OUTSIDE_TILE','NATIVE_WITNESS_REGION_BUDGET'].includes(e.reason))bad('NATIVE_WITNESS_PIXELS_REQUIRED');
   return issues;
  }catch(_){return ['NATIVE_WITNESS_EVIDENCE_INVALID'];}
 }
 return Object.freeze({measure,validate});
});
