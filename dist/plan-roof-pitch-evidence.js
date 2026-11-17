/* Written roof pitches are observations, not defaults for every roof face. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-grid-registration.js'):root.MIRGridRegistration,node?require('./plan-reconstructed-roofs.js'):root.MIRReconstructedRoofs,node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision);if(node)module.exports=api;else root.MIRRoofPitchEvidence=api;})(typeof window==='object'?window:globalThis,function(M,Grid,Roof,V){
 'use strict';
 const copy=M.clone,finite=Number.isFinite,normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),validBox=b=>Array.isArray(b)&&b.length===4&&b.every(finite)&&b[2]>b[0]&&b[3]>b[1],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const sourceSize=view=>[view.payload?.sourceWidth||view.frame?.rasterSize?.[0],view.payload?.sourceHeight||view.frame?.rasterSize?.[1]];
 function parse(text){
  const clean=normalize(text).trim().replace(/\s+/g,' '),match=clean.match(/^(?:(?:pente|pitch|slope)\s*[:=]?\s*)?(\d{1,2}(?:[.,]\d+)?)\s*[:/]\s*(\d{1,2}(?:[.,]\d+)?)\s*$/);
  if(!match)return null;const rise=Number(match[1].replace(',','.')),run=Number(match[2].replace(',','.'));
  return rise>0&&run>0&&rise/run<=4?{rise,run,value:rise/run,notation:'explicit-rise-run'}:null;
 }
 function captionRows(view){
  if(view?.kind!=='roof')return [];const rows=view.payload?.drawingReadings?.rows||[],out=[];
  for(const row of rows){if(!validBox(row.box)||!(row.source==='pdf-text'||row.confidence>=30)||!/^[-—=\s]*(?:pente|pitch|slope)(?:\s*[:=]?\s*[\d:/. ,]+)?[-—=\s]*$/.test(normalize(row.text)))continue;
   if(!out.some(r=>r.box.every((n,i)=>Math.abs(n-row.box[i])<2)))out.push(copy(row));
  }return out;
 }
 function regions(view){
  const [width,height]=sourceSize(view);if(![width,height].every(n=>finite(n)&&n>0))return [];
  return captionRows(view).map(row=>{const [x,y,r,b]=row.box,font=b-y,left=Math.max(0,Math.floor(x-font)),top=Math.max(0,Math.floor(y-font*.5)),right=Math.min(width,Math.ceil(r+font)),bottom=Math.min(height,Math.ceil(b+font*2.5));
   const ratioLeft=Math.max(0,Math.floor(x-font*.3)),ratioTop=Math.max(0,Math.floor(b+font*.15)),ratioRight=Math.min(width,Math.ceil(r+font*.3)),ratioBottom=Math.min(height,ratioTop+Math.ceil(font*1.6));
   return {id:'roof-pitch:'+view.id+':'+row.box.map(n=>Math.round(n*10)/10).join('-'),sourceViewId:view.id,sourceFileId:view.fileId,sourcePage:view.page,sourceFrame:copy(view.frame),caption:{text:row.text,sourceBox:copy(row.box),confidence:row.confidence??100,source:row.source||'ocr'},region:[left,top,right-left,bottom-top],ratioRegion:[ratioLeft,ratioTop,ratioRight-ratioLeft,ratioBottom-ratioTop],purpose:'source-roof-pitch-caption',status:'unresolved',confirmationRequired:true};
  });
 }
 function observations(view){
  if(view?.kind!=='roof')return [];const found=[],rows=view.payload?.drawingReadings?.rows||[],captions=captionRows(view);
  for(const caption of captions){const height=caption.box[3]-caption.box[1],direct=parse(caption.text),near=rows.filter(row=>validBox(row.box)&&row.box[1]>=caption.box[3]-height*.15&&row.box[1]<=caption.box[3]+height*2.5&&Math.min(row.box[2],caption.box[2])-Math.max(row.box[0],caption.box[0])>0);
   for(const row of direct?[caption]:near){const ratio=parse(row.text);if(!ratio)continue;const confidence=Math.min(caption.confidence??100,row.confidence??100),id='roof-pitch:'+view.id+':'+caption.box.map(n=>Math.round(n*10)/10).join('-');
    if(found.some(r=>r.id===id&&r.ratio.value===ratio.value))continue;found.push({id,kind:'written',status:confidence>=70?'proposed':'unresolved',reason:confidence>=70?null:'ROOF_PITCH_TRANSCRIPTION_UNCERTAIN',ratio,text:row.text,confidence,sourceViewId:view.id,sourceFileId:view.fileId,sourcePage:view.page,sourceFrame:copy(view.frame),sourceBox:copy(row.box),caption:{text:caption.text,sourceBox:copy(caption.box),confidence:caption.confidence??100},source:row.source||'ocr',confirmationRequired:true});
   }
  }
  for(const stored of view.payload?.drawingReadings?.roofPitchReadings||[]){
   if(stored.sourceViewId!==view.id||stored.sourceFileId!==view.fileId||stored.sourcePage!==view.page||!same(stored.sourceFrame,view.frame)||!validBox(stored.sourceBox))continue;
   const ratio=parse(stored.text);found.push({...copy(stored),ratio,status:stored.status==='conflict'?'conflict':stored.status==='proposed'&&stored.confidence>=70&&ratio?'proposed':'unresolved'});
  }
  const unique=[];for(const item of found){const at=unique.findIndex(v=>v.id===item.id);if(at<0){unique.push(item);continue;}const old=unique[at],conflict=[old,item].some(v=>v.status==='conflict')||old.status==='proposed'&&item.status==='proposed'&&old.ratio?.value!==item.ratio?.value,best=item.confidence>old.confidence?item:old,other=best===item?old:item;unique[at]={...best,alternatives:[...(old.alternatives||[]),copy({...other,alternatives:undefined})],...(conflict?{status:'conflict',reason:'ROOF_PITCH_TRANSCRIPTION_CONFLICT'}:{})};}
  return unique;
 }
 function inside(point,polygon){let value=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])value=!value;}return value;}
 // Require a source shaft and a compact arrowhead beside the observed pitch
 // caption. Text location alone cannot identify a face of a compound roof.
 function arrow(image,observation){
  const box=observation.caption?.sourceBox;if(!image?.data||!validBox(box))return null;const font=box[3]-box[1],[cx,cy,r,b]=box,ink=V.monochrome(image),w=image.width,h=image.height,at=(x,y)=>{x=Math.round(x);y=Math.round(y);return x>=0&&y>=0&&x<w&&y<h&&ink[y*w+x];},candidates=[];
  for(const axis of [0,1]){const point=(u,v)=>axis===0?[u,v]:[v,u],lo=Math.max(0,Math.floor(box[axis]-font*2)),hi=Math.min(axis===0?w:h,Math.ceil(box[axis+2]+font*2)),from=Math.max(0,Math.floor(box[1-axis]-font*.5)),to=Math.min(axis===0?h:w,Math.ceil(box[3-axis]+font*1.2));
   for(let v=from;v<to;v++){let start=null,last=null;for(let u=lo;u<hi;u++){const [x,y]=point(u,v);if(x>cx-font*.2&&x<r+font*.2&&y>cy-font*.2&&y<b-font*.1){start=last=null;continue;}if(!at(x,y))continue;if(last===null||u-last>1)start=u;last=u;if(u-start<font*2)continue;
    for(const sign of [-1,1]){const tip=sign<0?start:u,tail=sign<0?u:start,length=Math.abs(tip-tail);let head=null;
     for(let depth=Math.max(2,Math.round(font*.3));depth<=Math.ceil(font*.9);depth++){const across=tip-sign*depth;if(across<start||across>u)continue;let above=0,below=0;for(let d=1;d<=Math.max(2,Math.ceil(font*.45));d++){const a=point(across,v-d),z=point(across,v+d);if(at(...a))above=d;if(at(...z))below=d;}if(above>=2&&below>=2&&Math.abs(above-below)<=1){head={depth,halfWidth:Math.min(above,below)};break;}}
     if(!head||length<font*2.5)continue;
     let supported=0;for(let d=1;d<=head.depth;d++)for(const side of [-1,1]){const p=point(tip-sign*d,v+side*head.halfWidth*d/head.depth);if(at(...p))supported++;}if(supported/(head.depth*2)<.8)continue;
     const tipPoint=point(tip,v),tailPoint=point(tail,v),outside=point(tip+sign*Math.max(2,Math.round(font*.4)),v);if(at(...outside))continue;
     candidates.push({axis,anchors:[tailPoint,tipPoint],head,source:'observed-neutral-shaft-and-arrowhead',status:'proposed',confirmationRequired:true});
    }
   }}
  }
  const distinct=[];for(const c of candidates.sort((a,b)=>M.distance(...b.anchors)-M.distance(...a.anchors)))if(!distinct.some(d=>d.axis===c.axis&&M.distance(d.anchors[1],c.anchors[1])<font*.6))distinct.push(c);
  return distinct.length===1?distinct[0]:null;
 }
 function slopeUncertainty(roof,componentId,slope){
  const component=[roof,...(roof.extensions||[])].find(r=>r.id===componentId),candidates=[];
  for(const source of component?.sources||[])for(let i=0;i<source.anchors.length-1;i++){
   const a=source.anchors[i],b=source.anchors[i+1],dx=Math.abs(b[0]-a[0]),dy=Math.abs(b[1]-a[1]);if(dx<=4||dy<=2)continue;
   const nominal=dy*source.scaleY/(dx*source.scaleX),low=Math.max(0,(dy-2)*source.scaleY/((dx+2)*source.scaleX)),high=(dy+2)*source.scaleY/((dx-2)*source.scaleX);
   if(slope<low-1e-8||slope>high+1e-8)continue;
   candidates.push({sourceViewId:source.sourceViewId,sourceFrame:copy(source.sourceFrame),anchors:[copy(a),copy(b)],scaleX:source.scaleX,scaleY:source.scaleY,nominal,interval:[low,high],tolerance:Math.max(slope-low,high-slope)});
  }
  if(!candidates.length)return null;
  return {method:'one-source-pixel-per-slope-endpoint',endpointTolerancePixels:1,tolerance:Math.max(...candidates.map(c=>c.tolerance)),candidates};
 }
 function nativeArrow(observation){
  const a=observation.nativeArrow,p=a?.nativeSource,point=v=>Array.isArray(v)&&v.length===2&&v.every(finite);
  if(a?.status!=='proposed'||a.source!=='observed-neutral-shaft-and-arrowhead'||a.sourceViewId!==observation.sourceViewId||!same(a.sourceFrame,observation.sourceFrame)||p?.method!=='retained-pdf-region'||p.sourceViewId!==observation.sourceViewId||p.sourceFileId!==observation.sourceFileId||p.sourcePage!==observation.sourcePage||!same(p.sourceFrame,observation.sourceFrame)||!(p.scaleFactor>0)||!finite(p.padding)||!Array.isArray(p.sourceRegion)||p.sourceRegion.length!==4||!p.sourceRegion.every(finite)||a.anchors?.length!==2||!a.anchors.every(point)||a.nativeAnchors?.length!==2||!a.nativeAnchors.every(point)||!a.head||!(a.head.depth>0&&a.head.halfWidth>0))return null;
  if(a.anchors.some((q,i)=>q.some((n,j)=>Math.abs(n-((a.nativeAnchors[i][j]-p.padding)/p.scaleFactor+p.sourceRegion[j]))>1e-8)))return null;
  if(a.anchors.some(q=>q.some((n,j)=>n<p.sourceRegion[j]||n>p.sourceRegion[j]+p.sourceRegion[j+2])))return null;
  return copy(a);
 }
 function assess(roof,inventory,reviewed,images={}){
  const views=inventory.views.filter(v=>v.kind==='roof'&&v.buildingId===roof.buildingId),floor=inventory.views.find(v=>v.id===reviewed.sourceViewId&&v.kind==='floor'&&v.buildingId===roof.buildingId),all=[],checks=[],geometry={profiles:copy(roof.profiles),extensions:(roof.extensions||[]).map(r=>({id:r.id,profiles:copy(r.profiles)}))},unit=M.scale(reviewed);
  const clean=copy(roof);delete clean.pitchEvidence;for(const e of clean.extensions||[])delete e.pitchEvidence;
  // A rendered union of coplanar components does not retain unique ownership.
  // Leave that association open instead of attributing a porch label to its
  // parent solely because both faces happen to share a plane.
  const faces=Roof.faces(clean,[0,0],{includeProposed:true}).filter(f=>f.type==='roof'&&!f.id.includes(':merged:')),a=reviewed.alignment||{};
  for(const view of views){const items=observations(view);if(!items.length)continue;const registration=floor?Grid.alignRoofPlan(floor,view,images[floor.id],images[view.id]):{status:'unresolved',reason:'ROOF_FLOOR_SOURCE_REQUIRED'};
   const project=p=>{const t=registration.transform,x=(p[0]*t.scaleX+t.offsetX-a.origin[0])*unit,y=-(p[1]*t.scaleY+t.offsetY-a.origin[1])*unit,r=a.rotationDegrees*Math.PI/180;return [x*Math.cos(r)-y*Math.sin(r)+a.offset[0],x*Math.sin(r)+y*Math.cos(r)+a.offset[1]];};
   for(const item of items){const out={...copy(item),association:{status:'unresolved',reason:item.status==='proposed'?'ROOF_PITCH_FACE_UNRESOLVED':'ROOF_PITCH_TRANSCRIPTION_UNCERTAIN'}};all.push(out);
    if(item.status!=='proposed'||!item.ratio)continue;
    if(registration.status!=='proposed'||!unit||!Array.isArray(a.origin)||!Array.isArray(a.offset)||!finite(a.rotationDegrees)){out.association.reason=registration.reason||'ROOF_PITCH_REGISTRATION_UNRESOLVED';continue;}
    const sourceArrow=nativeArrow(item)||arrow(images[view.id],item);if(!sourceArrow){out.association.reason='ROOF_PITCH_ARROW_UNRESOLVED';continue;}
    const [x,y,r,b]=item.sourceBox,region=[[x,y],[r,y],[r,b],[x,b]].map(project),projectedArrow=sourceArrow.anchors.map(project),candidates=faces.filter(f=>[...region,...projectedArrow].every(p=>inside(p,f.poly)));
    if(candidates.length!==1){out.association.reason=candidates.length?'ROOF_PITCH_FACE_AMBIGUOUS':'ROOF_PITCH_OUTSIDE_RECONSTRUCTED_FACES';continue;}
    const face=candidates[0],gradient=[-face.normal[0]/face.normal[2],-face.normal[1]/face.normal[2]],direction=projectedArrow[1].map((n,i)=>n-projectedArrow[0][i]),len=Math.hypot(...direction),slope=Math.hypot(...gradient);
    if(!(len>0&&slope>0)||Math.abs(gradient[0]*direction[1]-gradient[1]*direction[0])>slope*len*.05){out.association.reason='ROOF_PITCH_ARROW_FACE_DIRECTION';continue;}
    const componentId=face.componentId||face.roofId,toleranceEvidence=slopeUncertainty(clean,componentId,slope);if(!toleranceEvidence){out.association.reason='ROOF_PITCH_PLANE_SOURCE_UNRESOLVED';continue;}const tolerance=toleranceEvidence.tolerance,difference=item.ratio.value-slope;
    out.association={status:'proposed',kind:'estimated-calibrated',method:'registered-pitch-arrow-and-caption-inside-single-roof-face',componentId,faceId:face.id,modelRegion:region,projectedArrow,sourceArrow,facePolygon:copy(face.poly),gridRegistration:copy(registration),contourId:reviewed.contourId,floorSourceViewId:floor.id,floorSourceFrame:copy(floor.frame),floorReference:copy(reviewed.reference),floorAlignment:copy(a),confirmationRequired:true};
    checks.push({observationId:item.id,componentId,faceId:face.id,writtenRatio:item.ratio.value,measuredRatio:slope,difference,tolerance,toleranceEvidence,status:Math.abs(difference)>tolerance?'conflict':'consistent',comparison:'written-rise-run-versus-source-calibrated-roof-plane',confirmationRequired:true});
   }
  }
  return {version:1,roofId:roof.id,levelId:roof.levelId,buildingId:roof.buildingId,status:checks.some(c=>c.status==='conflict')?'conflict':all.some(o=>o.association.status!=='proposed')?'unresolved':checks.length?'consistent':'not-found',geometry,observations:all,checks,confirmationRequired:true};
 }
 return Object.freeze({version:1,parse,regions,observations,arrow,assess});
});
