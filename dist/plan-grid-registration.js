/* Source-supported registration between independent architectural floor plans.
   Registration evidence is proposed only; no dimensions or geometry are confirmed. */
(function (root, factory) {
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MIRGridRegistration=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const finite=Number.isFinite,copy=v=>JSON.parse(JSON.stringify(v));
 const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
 function dark(image,x,y){
  x=Math.round(x);y=Math.round(y);
  if(!image?.data||x<0||y<0||x>=image.width||y>=image.height)return false;
  const i=(y*image.width+x)*4,d=image.data,hi=Math.max(d[i],d[i+1],d[i+2]),lo=Math.min(d[i],d[i+1],d[i+2]);
  return d[i+3]>120&&hi<190&&hi-lo<75;
 }
 function circleSupport(image,center,textHeight){
  const rmin=Math.max(5,textHeight*.8),rmax=Math.min(image.width*.025,Math.max(13,textHeight*2.7));let best=0;
  for(const dx of [-2,0,2])for(const dy of [-2,0,2])for(let r=rmin;r<=rmax;r+=1.5){
   let hits=0;for(let k=0;k<32;k++){const angle=2*Math.PI*k/32,u=Math.cos(angle),v=Math.sin(angle),x=center[0]+dx+u*r,y=center[1]+dy+v*r;
    if(dark(image,x,y)||dark(image,x+u,y+v)||dark(image,x-u,y-v))hits++;
   }best=Math.max(best,hits/32);
  }return best;
 }
 function bubbleRegions(image,{layout='floor'}={}){
  // Discover candidate ring locations from source ink BEFORE OCR. This avoids
  // depending on tiny 1/A/B labels in an entire 17-page raster document.
  // Labels are read separately from the interior, never inferred by ordering.
  if(!image?.data||image.width<250||image.height<250||image.width*image.height>12000000)
   return {status:'unresolved',reason:'GRID_SOURCE_UNAVAILABLE',bubbles:[]};
  const {width:w,height:h}=image,N=24,dirs=Array.from({length:N},(_,i)=>[Math.cos(2*Math.PI*i/N),Math.sin(2*Math.PI*i/N)]);
  const score=(x,y,r,coarse=false)=>{let hits=0;for(const [u,v] of dirs)if(dark(image,x+u*r,y+v*r)||dark(image,x+u*(r-1),y+v*(r-1))||dark(image,x+u*(r+1),y+v*(r+1))||coarse&&(dark(image,x+u*(r-2),y+v*(r-2))||dark(image,x+u*(r+2),y+v*(r+2))))hits++;return hits/N;};
  // A hatch fills arbitrary sampled circles as well as their surroundings.
  // A true outline has a mostly clear annulus on both sides; a central glyph
  // and a single axis leader may interrupt it without becoming a solid disk.
  const clearance=(x,y,r)=>{let inner=0,outer=0;for(const [u,v] of dirs){if(dark(image,x+u*r*.6,y+v*r*.6))inner++;if(dark(image,x+u*(r+Math.max(3,r*.3)),y+v*(r+Math.max(3,r*.3))))outer++;}return {innerInkFraction:inner/N,outerInkFraction:outer/N};};
  const minRadius=Math.max(7,Math.round(Math.min(w,h)*.007)),maxRadius=Math.min(42,Math.max(22,Math.round(Math.min(w,h)*.03)));
  const horizontalElevation=['elevation-number','elevation-letter'].includes(layout),elevationKind=layout==='elevation-letter'?'letter':'number';
  const bands=horizontalElevation?[[elevationKind,[.03,.02,.90,.28]]]:[['number',[.08,.02,.83,.20]],['letter',[.06,.13,.20,.87]]],bubbles=[];
  for(const [kind,[xl,yl,xr,yb]]of bands){
   const rough=[];for(let y=Math.floor(h*yl);y<h*yb;y+=4)for(let x=Math.floor(w*xl);x<w*xr;x+=4){
    let best=null;for(let r=minRadius;r<=maxRadius;r+=3){const value=score(x,y,r,true);if(value>=.68&&(!best||value>best.score))best={x,y,r,score:value};}
    if(best){const blank=clearance(best.x,best.y,best.r);if(blank.innerInkFraction<=.5&&blank.outerInkFraction<=.5)rough.push(best);}
   }
   rough.sort((a,b)=>b.score-a.score);
   const unique=[];
   for(const first of rough){
    if(unique.some(c=>Math.hypot(c.x-first.x,c.y-first.y)<Math.max(14,c.r*1.5)))continue;
    let best={...first,score:score(first.x,first.y,first.r)};for(let y=first.y-4;y<=first.y+4;y++)for(let x=first.x-4;x<=first.x+4;x++)for(let r=Math.max(minRadius,first.r-3);r<=Math.min(maxRadius,first.r+3);r++){
     const value=score(x,y,r);if(value>best.score)best={x,y,r,score:value};
    }
    if(best.score>=.9){const blank=clearance(best.x,best.y,best.r);if(blank.innerInkFraction<=.35&&blank.outerInkFraction<=.35)unique.push({...best,...blank});}
    if(unique.length>=80)break;
   }
   const horizontal=horizontalElevation||kind==='number',axis=horizontal?'y':'x',tolerance=horizontal?Math.max(3,h*.0025):Math.max(8,w*.006);
   let chosen=[];
   for(const c of unique){
    const group=unique.filter(v=>Math.abs(v[axis]-c[axis])<=tolerance&&Math.abs(v.r-c.r)<=Math.max(3,c.r*.20));
    if(horizontalElevation&&(group.length<(kind==='number'?3:2)||Math.max(...group.map(v=>v.x))-Math.min(...group.map(v=>v.x))<w*.18))continue;
    if(group.length>chosen.length||group.length===chosen.length&&group.reduce((sum,v)=>sum+v.score,0)>chosen.reduce((sum,v)=>sum+v.score,0))chosen=group;
   }
   const linear=horizontal?'x':'y';chosen.sort((a,b)=>a[linear]-b[linear]);
   const span=chosen.length?chosen.at(-1)[linear]-chosen[0][linear]:0;
   if(chosen.length<(kind==='number'?3:2)||span<(horizontal?w:h)*.18)continue;
   bubbles.push(...chosen.slice(0,12).map(v=>({kind,center:[v.x,v.y],radius:v.r,ringSupport:v.score,innerInkFraction:v.innerInkFraction,outerInkFraction:v.outerInkFraction,
    sourceMethod:'source-raster-closed-grid-ring',confirmationRequired:true})));
  }
  const ok=horizontalElevation?bubbles.filter(b=>b.kind===elevationKind).length>=(elevationKind==='number'?3:2):bubbles.filter(b=>b.kind==='number').length>=3&&bubbles.filter(b=>b.kind==='letter').length>=2;
  return {status:ok?'proposed':'unresolved',reason:ok?null:'GRID_AXES_INSUFFICIENT',bubbles,confirmationRequired:true};
 }
 function planMarkers(view,image,{includeRoof=false}={}){
  if(!view||!(view.kind==='floor'||includeRoof&&view.kind==='roof')||!image?.data||image.width<250||image.height<250||image.width*image.height>3e7)return {status:'unresolved',reason:'GRID_SOURCE_UNAVAILABLE'};
  const rows=view.payload?.drawingReadings?.rows||[],numeric=[],letters=[];
  for(const row of rows){
   if(row.retry?.labelConflict||row.box?.length!==4||!row.box.every(finite)||(row.confidence??0)<55)continue;
   const label=String(row.text||'').trim().replace(/[.\s]+$/,'').toUpperCase();
   const type=/^\d{1,2}$/.test(label)&&Number(label)>0?'number':/^[A-Z]$/.test(label)?'letter':null;
   if(!type)continue;
   const center=[(row.box[0]+row.box[2])/2,(row.box[1]+row.box[3])/2],height=row.box[3]-row.box[1];
   if(!(height>=3&&height<image.height*.055)||!(row.box[2]>row.box[0]))continue;
   const sourceCircle=row.retry?.gridCircle||null;
   if(sourceCircle&&(!['number','letter'].includes(sourceCircle.kind)||sourceCircle.kind!==type||!Array.isArray(sourceCircle.center)||sourceCircle.center.length!==2||!(sourceCircle.radius>3)||Math.hypot(center[0]-sourceCircle.center[0],center[1]-sourceCircle.center[1])>sourceCircle.radius*.4||!(sourceCircle.ringSupport>=.9)))continue;
   const inBand=type==='number'?center[1]<image.height*.2&&center[0]>image.width*.08&&center[0]<image.width*.82:center[0]<image.width*.25&&center[1]>image.height*.12&&center[1]<image.height*.9;
   if(!inBand)continue;
   const support=circleSupport(image,center,height);if(support<.68)continue;
   (type==='number'?numeric:letters).push({label,center,box:copy(row.box),confidence:row.confidence,ringSupport:support,sourceViewId:view.id,...(sourceCircle?{sourceCircle:copy(sourceCircle)}:{})});
  }
  const select=(items,axis,extent)=>{
   if(!items.length)return [];
   const anchors=items.filter(v=>v.sourceCircle),pool=anchors.length>=(axis===1?3:2)?anchors:items,middle=median(pool.map(v=>v.center[axis])),tolerance=Math.max(5,extent*.015),close=items.filter(v=>Math.abs(v.center[axis]-middle)<=tolerance),count=new Map();
   for(const v of close)count.set(v.label,(count.get(v.label)||0)+1);
   if([...count.values()].some(v=>v>1))return [];
   return close.sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true}));
  };
  const numbers=select(numeric,1,image.height),alphabetic=select(letters,0,image.width);
  const width=numbers.length?Math.max(...numbers.map(v=>v.center[0]))-Math.min(...numbers.map(v=>v.center[0])):0;
  const height=alphabetic.length?Math.max(...alphabetic.map(v=>v.center[1]))-Math.min(...alphabetic.map(v=>v.center[1])):0;
  if(numbers.length<3||alphabetic.length<2||width<image.width*.18||height<image.height*.18)return {status:'unresolved',reason:'GRID_AXES_INSUFFICIENT',numbers,letters:alphabetic};
  return {status:'observed',numbers,letters:alphabetic,sourceViewId:view.id,sourceFrame:view.frame?copy(view.frame):null,sourcePage:view.page,confirmationRequired:true};
 }
 function fit(pairs,axis){
  if(pairs.length<2)return null;
  const xs=pairs.map(v=>v[0].center[axis]),ys=pairs.map(v=>v[1].center[axis]),n=pairs.length;
  const mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n;let num=0,den=0;
  for(let i=0;i<n;i++){num+=(xs[i]-mx)*(ys[i]-my);den+=(xs[i]-mx)**2;}
  if(!(den>1))return null;
  const scale=num/den,offset=my-scale*mx;
  const errors=pairs.map(([from,to])=>scale*from.center[axis]+offset-to.center[axis]);
  return {scale,offset,maxResidual:Math.max(...errors.map(Math.abs))};
 }
 const matching=(a,b)=>{const index=new Map(b.map(v=>[v.label,v]));return a.filter(v=>index.has(v.label)).map(v=>[v,index.get(v.label)]);};
 function markers(view,image){return planMarkers(view,image);}
 function alignPlanViews(referenceView,movingView,referenceImage,movingImage,{roof=false}={}){
  if(!referenceView||!movingView||referenceView.buildingId!==movingView.buildingId||!roof&&referenceView.levelId===movingView.levelId||referenceView.kind!=='floor'||movingView.kind!==(roof?'roof':'floor'))return {status:'unresolved',reason:'GRID_SOURCE_LEVEL'};
  const reference=planMarkers(referenceView,referenceImage),moving=planMarkers(movingView,movingImage,{includeRoof:roof});
  if(reference.status!=='observed'||moving.status!=='observed')return {status:'unresolved',reason:'GRID_AXES_INSUFFICIENT',sources:[reference.reason,moving.reason]};
  const horizontal=matching(moving.numbers,reference.numbers),vertical=matching(moving.letters,reference.letters);
  if(horizontal.length<3||vertical.length<2)return {status:'unresolved',reason:'GRID_LABELS_INSUFFICIENT'};
  const x=fit(horizontal,0),y=fit(vertical,1);
  if(!x||!y||![x.scale,y.scale].every(v=>v>.2&&v<5))return {status:'unresolved',reason:'GRID_TRANSFORM_INVALID'};
  const tolerance=Math.max(3,Math.min(referenceImage.width,referenceImage.height)*.004),nonUniformity=Math.abs(x.scale/y.scale-1);
  if(x.maxResidual>tolerance||y.maxResidual>tolerance||nonUniformity>.05)return {status:'conflict',reason:'GRID_TRANSFORM_CONFLICT',residual:{x:x.maxResidual,y:y.maxResidual},nonUniformity};
  const evidence=[...horizontal.map(([from,to])=>({axis:'x',label:from.label,moving:{sourceViewId:movingView.id,sourceBox:copy(from.box),point:copy(from.center)},reference:{sourceViewId:referenceView.id,sourceBox:copy(to.box),point:copy(to.center)}})),...vertical.map(([from,to])=>({axis:'y',label:from.label,moving:{sourceViewId:movingView.id,sourceBox:copy(from.box),point:copy(from.center)},reference:{sourceViewId:referenceView.id,sourceBox:copy(to.box),point:copy(to.center)}}))];
  return {status:'proposed',method:'matched-labelled-raster-grid-bubbles',movingSourceViewId:movingView.id,referenceSourceViewId:referenceView.id,transform:{scaleX:x.scale,offsetX:x.offset,scaleY:y.scale,offsetY:y.offset},residual:{x:x.maxResidual,y:y.maxResidual},nonUniformity,matchedHorizontal:horizontal.length,matchedVertical:vertical.length,evidence,confirmationRequired:true,notAGeometryConfirmation:true};
 }
 function alignViews(referenceView,movingView,referenceImage,movingImage){return alignPlanViews(referenceView,movingView,referenceImage,movingImage);}
 function alignRoofPlan(floorView,roofView,floorImage,roofImage){
  const valid=(view,image)=>{
   const frame=view?.frame,page=frame?.rasterSize,crop=frame?.cropToRaster,size=[view?.payload?.sourceWidth??page?.[0],view?.payload?.sourceHeight??page?.[1]];
   if(!frame||!image?.data||image.data.length!==image.width*image.height*4||!Array.isArray(page)||page.length!==2||!page.every(n=>finite(n)&&n>0)||!size.every((n,i)=>finite(n)&&n===[image.width,image.height][i]))return false;
   if(crop===undefined)return size.every((n,i)=>n===page[i]);
   return Array.isArray(crop)&&crop.length===6&&crop.every(finite)&&crop.slice(0,4).every((n,i)=>n===[1,0,0,1][i])&&crop[4]>=0&&crop[5]>=0&&size.every((n,i)=>n+crop[i+4]<=page[i]);
  };
  if(!valid(floorView,floorImage)||!valid(roofView,roofImage))return {status:'unresolved',reason:'ROOF_GRID_SOURCE_FRAME_REQUIRED'};
  return {...alignPlanViews(floorView,roofView,floorImage,roofImage,{roof:true}),referenceSourceFrame:copy(floorView.frame),movingSourceFrame:copy(roofView.frame),scope:'roof-plan-to-floor-source-pixels'};
 }
 const order=label=>label==='basement'?-1:label==='ground'||label==='level-0'?0:label==='upper'?1:(/^level-\d+$/.test(String(label))?Number(label.slice(6)):1000);
 function forBuilding(inventory,buildingId,images){
  const floors=(inventory?.views||[]).filter(v=>v.kind==='floor'&&v.buildingId===buildingId).sort((a,b)=>order(a.levelId)-order(b.levelId)),byLevel={};
  if(floors.length<=1)return {status:'not-required',byLevel};
  const count=new Map();for(const v of floors)count.set(v.levelId,(count.get(v.levelId)||0)+1);
  if([...count.values()].some(n=>n>1))return {status:'unresolved',reason:'GRID_FLOOR_SOURCE_AMBIGUOUS',byLevel};
  const origin=floors[0];byLevel[origin.levelId]={status:'reference',sourceViewId:origin.id};
  for(const v of floors.slice(1))byLevel[v.levelId]=alignViews(origin,v,images[origin.id],images[v.id]);
  const valid=Object.values(byLevel).filter(v=>v.status==='proposed').length;
  return {status:valid===floors.length-1?'proposed':'partial',referenceLevelId:origin.levelId,referenceSourceViewId:origin.id,byLevel,confirmationRequired:true};
 }
 // Convert the already observed labelled axes to one metric frame. The
 // origin is a named grid intersection, never the bounding box of a floor.
 // Pixel points and independent floor calibrations are not changed here.
 const span=anchors=>Math.hypot(anchors[1][0]-anchors[0][0],anchors[1][1]-anchors[0][1]);
 const validAnchors=a=>Array.isArray(a)&&a.length===2&&a.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite))&&span(a)>1;
 const numericScale=r=>finite(r?.value)&&r.value>0&&validAnchors(r.anchors)?r.value/span(r.anchors):null;
 const metricTolerance=(a,b)=>Math.max(.02,3*Math.max(a,b));
 function metricAlignment(reference,moving,inventory,images){
  const rv=inventory.views.find(v=>v.id===reference.draft.sourceViewId),mv=inventory.views.find(v=>v.id===moving.draft.sourceViewId),rs=numericScale(reference.draft.reference),ms=numericScale(moving.draft.reference);
  if(!rv||!mv||rv.kind!=='floor'||mv.kind!=='floor'||rv.buildingId!==mv.buildingId||reference.draft.reference?.sourceViewId!==rv.id||moving.draft.reference?.sourceViewId!==mv.id||!rs||!ms)return {status:'unresolved',reason:'GRID_METRIC_REFERENCE_REQUIRED'};
  if([reference,moving].some(p=>p.draft.reference.conflict||p.draft.reference.status==='conflict'||p.draft.reference.kind==='hypothesis'||p.draft.dimensionAdjustment?.status==='conflict'))return {status:'conflict',reason:'GRID_METRIC_REFERENCE_CONFLICT'};
  const r=markers(rv,images[rv.id]),m=markers(mv,images[mv.id]);if(r.status!=='observed'||m.status!=='observed')return {status:'unresolved',reason:'GRID_AXES_INSUFFICIENT'};
  const horizontal=matching(m.numbers,r.numbers),vertical=matching(m.letters,r.letters);
  if(horizontal.length<3||vertical.length<2)return {status:'unresolved',reason:'GRID_LABELS_INSUFFICIENT'};
  const firstX=horizontal[0],firstY=vertical[0],origin=[firstX[0].center[0],firstY[0].center[1]],matchedReferenceOrigin=[firstX[1].center[0],firstY[1].center[1]],referenceOrigin=[r.numbers[0].center[0],r.letters[0].center[1]],offset=[(matchedReferenceOrigin[0]-referenceOrigin[0])*rs,-(matchedReferenceOrigin[1]-referenceOrigin[1])*rs],checks=[],tolerance=metricTolerance(rs,ms);
  for(const [axis,pairs]of [[0,horizontal],[1,vertical]])for(const [from,to]of pairs){const movingDistance=(from.center[axis]-origin[axis])*ms,referenceDistance=(to.center[axis]-matchedReferenceOrigin[axis])*rs,residual=movingDistance-referenceDistance;checks.push({axis:axis===0?'x':'y',label:from.label,movingDistance,referenceDistance,residual,tolerance,kind:'estimated-calibrated',moving:{sourceViewId:mv.id,sourceFrame:copy(mv.frame||null),sourcePage:mv.page,point:copy(from.center),textBox:copy(from.box)},reference:{sourceViewId:rv.id,sourceFrame:copy(rv.frame||null),sourcePage:rv.page,point:copy(to.center),textBox:copy(to.box)}});}
  const common={method:'metric-labelled-grid-intersection',sourceViewId:mv.id,referenceSourceViewId:rv.id,origin,referenceOrigin,matchedReferenceOrigin,offset,axisLabels:{x:firstX[0].label,y:firstY[0].label},scaleUsed:ms,referenceScaleUsed:rs,reference:copy(moving.draft.reference),referenceCalibration:copy(reference.draft.reference),checks,tolerance,toleranceReason:'20 mm minimum or three source pixels at the coarser independent calibration; proposed visual registration, not confirmed quantities',maxResidual:Math.max(...checks.map(c=>Math.abs(c.residual))),confirmationRequired:true};
  if(checks.some(c=>Math.abs(c.residual)>c.tolerance))return {...common,status:'conflict',reason:'GRID_METRIC_SCALE_CONFLICT'};
  return {...common,status:'proposed',alignment:{origin,offset,rotationDegrees:0,kind:'source-labelled-grid-registration',status:'proposed',axisLabels:copy(common.axisLabels),sourceViewId:mv.id,referenceSourceViewId:rv.id,checks:copy(checks),confirmationRequired:true}};
 }
 function datumNetwork(inventory,buildingId,prepared,referenceLevel,calibrations=[]){
  const allowedViews=new Map(inventory.views.filter(v=>v.buildingId===buildingId&&v.kind==='elevation').map(v=>[v.id,v])),bySource=new Map(),issues=[];
  const add=(id,key,item)=>{let v=bySource.get(id);if(!v){v={guides:[],calibrations:[]};bySource.set(id,v);}v[key].push(item);};
  for(const p of prepared){for(const v of p.proposal?.views||[])if(allowedViews.has(v.viewId))for(const g of v.guides||[])if(g.datumType==='floor'&&g.levelHint&&finite(g.y)&&g.sourceViewId===v.viewId&&g.box?.length===4&&g.box.every(finite)&&(g.confidence??0)>=30)add(v.viewId,'guides',g);for(const c of p.draft.height?.references||[])if(allowedViews.has(c.sourceViewId))add(c.sourceViewId,'calibrations',c);}
  for(const c of calibrations)if(allowedViews.has(c.sourceViewId))add(c.sourceViewId,'calibrations',c);
  const edges=[],labels=new Set(prepared.map(p=>p.sourceLevel));
  for(const [viewId,observations]of bySource){
   const view=allowedViews.get(viewId);if(observations.calibrations.some(c=>c.conflict||c.status==='conflict')){issues.push({sourceViewId:viewId,reason:'LEVEL_DATUM_CALIBRATION_CONFLICT',references:copy(observations.calibrations)});continue;}const cal=observations.calibrations.filter(c=>numericScale(c)&&['written','estimated-calibrated','user-measurement'].includes(c.kind)&&!['conflict','unresolved'].includes(c.status)&&!c.conflict&&(!c.scale||Math.abs(c.scale/numericScale(c)-1)<.001)&&((c.kind==='written'&&((c.confidence??c.ocrConfidence??0)>=70||c.source==='pdf-text'))||c.kind==='user-measurement'||c.kind==='estimated-calibrated'&&inventory.views.some(v=>v.id===(c.relationship?.sourceReference?.sourceViewId||c.relationship?.sourceViewId)&&v.buildingId===buildingId&&v.kind==='floor')));
   if(!cal.length){issues.push({sourceViewId:viewId,reason:'LEVEL_DATUM_CALIBRATION_REQUIRED'});continue;}
   const scales=cal.map(numericScale),calConflict=Math.max(...scales)/Math.min(...scales)-1>.01||cal.some((a,i)=>a.kind==='written'&&cal.slice(i+1).some(b=>b.kind==='written'&&Math.min(Math.hypot(a.anchors[0][0]-b.anchors[0][0],a.anchors[0][1]-b.anchors[0][1])+Math.hypot(a.anchors[1][0]-b.anchors[1][0],a.anchors[1][1]-b.anchors[1][1]),Math.hypot(a.anchors[0][0]-b.anchors[1][0],a.anchors[0][1]-b.anchors[1][1])+Math.hypot(a.anchors[1][0]-b.anchors[0][0],a.anchors[1][1]-b.anchors[0][1]))<4&&Math.abs(a.value-b.value)>.001));
   if(calConflict){issues.push({sourceViewId:viewId,reason:'LEVEL_DATUM_CALIBRATION_CONFLICT',references:copy(cal)});continue;}
   const grouped=new Map();for(const g of observations.guides.filter(g=>labels.has(g.levelHint))){let group=grouped.get(g.levelHint);if(!group){group=[];grouped.set(g.levelHint,group);}if(!group.some(v=>Math.abs(v.y-g.y)<1e-6&&v.label===g.label))group.push(g);}
   const clean=[];for(const [label,group]of grouped){const best=group.slice().sort((a,b)=>(b.confidence||0)-(a.confidence||0))[0];if(group.some(g=>Math.abs(g.y-best.y)>2)){issues.push({sourceViewId:viewId,levelHint:label,reason:'LEVEL_DATUM_POSITION_CONFLICT',observations:copy(group)});continue;}clean.push(best);}
   clean.sort((a,b)=>order(a.levelHint)-order(b.levelHint));
   for(let i=0;i<clean.length;i++)for(let j=i+1;j<clean.length;j++){const a=clean[i],b=clean[j],middle=(a.y+b.y)/2,unique=[];for(const c of cal)if(!unique.some(r=>JSON.stringify(r.anchors)===JSON.stringify(c.anchors)&&r.value===c.value&&r.kind===c.kind))unique.push(c);
    // A short native vertical dimension calibrates its own source region.
    // Keeping the first prepared floor's reference globally amplifies raster
    // rounding across distant storeys and makes Z depend on iteration order.
    // All references still pass the independent contradiction guard above.
    const vertical=unique.filter(c=>Math.abs(c.anchors[0][0]-c.anchors[1][0])<=2),distance=c=>Math.abs((c.anchors[0][1]+c.anchors[1][1])/2-middle),pool=(vertical.length?vertical:unique).slice().sort((a,b)=>(vertical.length?distance(a)-distance(b):0)||span(b.anchors)-span(a.anchors)||(b.confidence??b.ocrConfidence??0)-(a.confidence??a.ocrConfidence??0)||JSON.stringify(a.anchors).localeCompare(JSON.stringify(b.anchors))),chosen=pool[0],scale=numericScale(chosen),referenceSelection={method:vertical.length?'nearest-independent-vertical-dimension-to-datum-span':'independent-source-span-calibration',spanMidpointPixels:middle,alternatives:pool.map(c=>({sourceViewId:c.sourceViewId,anchors:copy(c.anchors),value:c.value,kind:c.kind,scaleUsed:numericScale(c),distancePixels:vertical.length?distance(c):null})),notAnAverage:true},delta=(a.y-b.y)*scale;if(!(delta>0)){issues.push({sourceViewId:viewId,reason:'LEVEL_DATUM_ORDER_CONFLICT',observations:[copy(a),copy(b)]});continue;}edges.push({from:a.levelHint,to:b.levelHint,delta,scaleUsed:scale,tolerance:metricTolerance(scale,scale),sourceViewId:viewId,sourceFrame:copy(view.frame||null),sourcePage:view.page,anchors:[[chosen.anchors[0][0],a.y],[chosen.anchors[0][0],b.y]],datums:{from:copy(a),to:copy(b)},reference:copy(chosen),referenceSelection,kind:'estimated-calibrated',status:'proposed',confirmationRequired:true});}
  }
  const values=new Map(),paths=new Map(),byLevel={},referenceLabel=referenceLevel.sourceLevel;
  // Coordinate zero is attached to an observed reference-floor datum. It is
  // not a terrain altitude and cannot be established from the grid alone.
  if(!edges.some(e=>e.from===referenceLabel||e.to===referenceLabel))return {status:'unresolved',reason:'LEVEL_VERTICAL_DATUM_REQUIRED',byLevel,edges,issues};
  values.set(referenceLabel,0);paths.set(referenceLabel,[]);const queue=[referenceLabel];
  while(queue.length){const from=queue.shift();for(const e of edges){const to=e.from===from?e.to:e.to===from?e.from:null;if(!to||values.has(to))continue;values.set(to,values.get(from)+(e.from===from?e.delta:-e.delta));paths.set(to,[...paths.get(from),e]);queue.push(to);}}
  const checks=edges.filter(e=>values.has(e.from)&&values.has(e.to)).map(e=>({...copy(e),residual:values.get(e.to)-values.get(e.from)-e.delta})),conflicts=checks.filter(e=>Math.abs(e.residual)>e.tolerance),sourceConflicts=issues.filter(i=>i.reason.endsWith('CONFLICT'));
  for(const p of prepared){const value=values.get(p.sourceLevel);if(value===undefined){byLevel[p.sourceLevel]={status:'unresolved',reason:'LEVEL_VERTICAL_DATUM_REQUIRED'};continue;}if(conflicts.length||sourceConflicts.length){byLevel[p.sourceLevel]={status:'conflict',reason:'LEVEL_VERTICAL_DATUM_CONFLICT',checks,issues:sourceConflicts};continue;}
   const path=paths.get(p.sourceLevel),rootEvidence=checks.filter(e=>e.from===referenceLabel||e.to===referenceLabel);byLevel[p.sourceLevel]={status:'proposed',base:{value,kind:p.sourceLevel===referenceLabel?'local-datum':'estimated-calibrated',status:'proposed',sourceViewId:(path[0]||rootEvidence[0]).sourceViewId,referenceLevelId:referenceLevel.levelId,referenceLevelHint:referenceLabel,label:'relative to observed reference-floor datum; not terrain elevation',references:copy(path.length?path:rootEvidence),checks:checks.filter(e=>e.from===p.sourceLevel||e.to===p.sourceLevel),confirmationRequired:true}};
  }
  return {status:conflicts.length||sourceConflicts.length?'conflict':Object.values(byLevel).every(v=>v.status==='proposed')?'proposed':'partial',byLevel,edges,checks,issues,confirmationRequired:true};
 }
 function registerPreparedLevels(inventory,buildingId,prepared,images,{elevationCalibrations=[]}={}){
  const levels=prepared.map(p=>({...p,sourceLevel:inventory.levels.find(l=>l.id===p.levelId&&l.buildingId===buildingId)?.sourceLevel})).filter(p=>p.sourceLevel&&p.draft?.sourceViewId&&inventory.views.some(v=>v.id===p.draft.sourceViewId&&v.buildingId===buildingId&&v.kind==='floor'&&v.levelId===p.sourceLevel)).sort((a,b)=>order(a.sourceLevel)-order(b.sourceLevel)),byLevel={};
  if(levels.length!==prepared.length)return {status:'unresolved',reason:'LEVEL_SOURCE_BUILDING',byLevel};
  if(levels.length<2||new Set(levels.map(p=>p.sourceLevel)).size!==levels.length)return {status:'unresolved',reason:'LEVEL_SOURCE_AMBIGUOUS',byLevel};
  const reference=levels[0],vertical=datumNetwork(inventory,buildingId,levels,reference,elevationCalibrations);
  for(const p of levels){const xy=metricAlignment(reference,p,inventory,images),z=vertical.byLevel[p.sourceLevel]||{status:'unresolved',reason:vertical.reason||'LEVEL_VERTICAL_DATUM_REQUIRED'},ok=xy.status==='proposed'&&z.status==='proposed';byLevel[p.levelId]={status:ok?'proposed':xy.status==='conflict'||z.status==='conflict'?'conflict':'unresolved',sourceLevel:p.sourceLevel,xy,z,...(ok?{alignment:copy(xy.alignment),base:copy(z.base)}:{}),issues:[xy.reason,z.reason].filter(Boolean),confirmationRequired:true};}
  return {version:1,status:Object.values(byLevel).every(v=>v.status==='proposed')?'proposed':Object.values(byLevel).some(v=>v.status==='proposed')?'partial':'unresolved',buildingId,referenceLevelId:reference.levelId,byLevel,vertical,confirmationRequired:true,notAGeometryConfirmation:true};
 }

 // Horizontal observation only. This neither creates a height nor supplies
 // the missing coordinate perpendicular to an elevation.
 function alignElevationAxes(floorView,elevationView,floorImage,elevationImage){
  const direction=elevationView?.direction,axis=['front','back'].includes(direction)?0:['left','right'].includes(direction)?1:null,family=axis===0?'number':'letter',minimum=axis===0?3:2;
  if(axis===null||floorView?.kind!=='floor'||elevationView?.kind!=='elevation'||floorView.buildingId!==elevationView.buildingId)return {status:'unresolved',reason:'ELEVATION_GRID_SOURCE_REQUIRED'};
  const frameMatches=(v,im)=>{const expected=[v.payload?.sourceWidth||v.zone?.[2]||v.frame?.rasterSize?.[0],v.payload?.sourceHeight||v.zone?.[3]||v.frame?.rasterSize?.[1]];return im?.data&&Number.isInteger(im.width)&&Number.isInteger(im.height)&&im.width>0&&im.height>0&&im.data.length===im.width*im.height*4&&expected.every((n,i)=>n==null||Number.isInteger(n)&&n>0&&n===[im.width,im.height][i]);};
  if(!frameMatches(floorView,floorImage)||!frameMatches(elevationView,elevationImage))return {status:'unresolved',reason:'ELEVATION_GRID_FRAME_REQUIRED'};
  const w=elevationImage?.width,h=elevationImage?.height;
  const floor=markers(floorView,floorImage);if(floor.status!=='observed')return {status:'unresolved',reason:'ELEVATION_GRID_FLOOR_AXES_REQUIRED'};
  const floorMarkers=axis===0?floor.numbers:floor.letters,known=new Map(floorMarkers.map(m=>[m.label,m])),circles=[],observations=elevationView.payload?.drawingReadings?.rows||[];
  for(const row of observations){
   if(row.retry?.labelConflict||!(row.confidence>=55)||row.box?.length!==4||!row.box.every(finite))continue;
   const label=String(row.text||'').trim().toUpperCase().replace(/[.\s]+$/,'');if(!known.has(label))continue;
   const center=[(row.box[0]+row.box[2])/2,(row.box[1]+row.box[3])/2],height=row.box[3]-row.box[1],sourceCircle=row.retry?.gridCircle;
   if(height<3||row.box[2]<=row.box[0]||row.box[0]<0||row.box[1]<0||row.box[2]>w||row.box[3]>h||center[1]>h*.28||sourceCircle&&(sourceCircle.kind!==family||!Array.isArray(sourceCircle.center)||sourceCircle.center.length!==2||!sourceCircle.center.every(finite)||!(sourceCircle.radius>3)||!(sourceCircle.ringSupport>=.9)||Math.hypot(center[0]-sourceCircle.center[0],center[1]-sourceCircle.center[1])>sourceCircle.radius*.4))continue;
   const support=circleSupport(elevationImage,center,height);if(support<.68)continue;
   let item=circles.find(c=>Math.hypot(c.center[0]-center[0],c.center[1]-center[1])<Math.max(3,height*.6));
   if(item){if(item.label!==label)item.conflict=true;continue;}
   circles.push({label,center,box:copy(row.box),confidence:row.confidence,ringSupport:support,sourceCircle:copy(sourceCircle||null),sourceViewId:elevationView.id});
  }
  const groups=[];for(const c of circles){if(c.conflict)continue;const group=circles.filter(v=>!v.conflict&&Math.abs(v.center[1]-c.center[1])<=Math.max(3,h*.003));if(group.length<minimum||new Set(group.map(m=>m.label)).size!==group.length||Math.max(...group.map(m=>m.center[0]))-Math.min(...group.map(m=>m.center[0]))<w*.18)continue;const key=group.map(m=>m.label+':'+m.center.join(',')).sort().join('|');if(!groups.some(g=>g.key===key))groups.push({key,markers:group});}
  const sign=['back','left'].includes(direction)?-1:1,expectedSign=axis===0?sign:-sign,fits=[];
  for(const group of groups){
   const pairs=group.markers.map(m=>[{center:[known.get(m.label).center[axis],0]},m]),f=fit(pairs,0);if(!f||!(f.scale*expectedSign>0)||!finite(f.offset))continue;
   const tolerance=3,checks=group.markers.map(m=>({label:m.label,floorPixelCoordinate:known.get(m.label).center[axis],sourcePixelX:m.center[0],predictedPixelX:f.scale*known.get(m.label).center[axis]+f.offset,residual:f.scale*known.get(m.label).center[axis]+f.offset-m.center[0],floor:{sourceViewId:floorView.id,point:copy(known.get(m.label).center),textBox:copy(known.get(m.label).box)},elevation:{sourceViewId:elevationView.id,point:copy(m.center),textBox:copy(m.box),sourceCircle:copy(m.sourceCircle)}}));
   fits.push({status:f.maxResidual>tolerance?'conflict':'proposed',reason:f.maxResidual>tolerance?'ELEVATION_GRID_RESIDUAL_CONFLICT':null,transform:{floorAxis:axis===0?'x':'y',scale:f.scale,offset:f.offset},maxResidualPixels:f.maxResidual,tolerancePixels:tolerance,checks});
  }
  if(!fits.length)return groups.length?{status:'conflict',reason:'ELEVATION_GRID_DIRECTION_CONFLICT'}:circles.some(c=>c.conflict)?{status:'conflict',reason:'ELEVATION_GRID_LABEL_CONFLICT'}:{status:'unresolved',reason:'ELEVATION_GRID_LABELS_REQUIRED'};
  const good=fits.filter(f=>f.status==='proposed');if(good.length>1&&good.some(f=>Math.abs(f.transform.offset-good[0].transform.offset)>3||Math.abs(f.transform.scale/good[0].transform.scale-1)>.01))return {status:'conflict',reason:'ELEVATION_GRID_GROUP_AMBIGUOUS',candidates:fits};
  const best=good[0]||fits[0];return {...best,version:1,buildingId:floorView.buildingId,sourceLevel:floorView.levelId,floorSourceViewId:floorView.id,elevationSourceViewId:elevationView.id,sourceFrames:{floor:copy(floorView.frame||null),elevation:copy(elevationView.frame||null)},units:'source-pixels',method:'shared-labelled-horizontal-axis-registration',verticalStatus:'unresolved',perpendicularStatus:'unresolved',confirmationRequired:true,notAGeometryConfirmation:true};
 }

 function elevationAxisRegistration(floorView,elevationView,floorImage,elevationImage,draft,{elevationReference=null}={}){
  if(draft?.sourceViewId!==floorView?.id||draft.reference?.sourceViewId!==floorView?.id)return {status:'unresolved',reason:'ELEVATION_GRID_SOURCE_REQUIRED'};
  const unit=numericScale(draft.reference),alignment=draft.alignment,reference=draft.reference;
  if(!unit||reference.status==='conflict'||reference.conflict||reference.kind==='hypothesis'||!Array.isArray(alignment?.origin)||alignment.origin.length!==2||!alignment.origin.every(finite)||!Array.isArray(alignment?.offset)||alignment.offset.length!==2||!alignment.offset.every(finite)||alignment.rotationDegrees!==0)return {status:'unresolved',reason:'ELEVATION_GRID_CALIBRATION_REQUIRED'};
  const observed=alignElevationAxes(floorView,elevationView,floorImage,elevationImage);if(observed.status!=='proposed')return observed;
  const direction=elevationView.direction,axis=observed.transform.floorAxis==='x'?0:1,planSign=axis===0?1:-1,projectionSign=['back','left'].includes(direction)?-1:1,a=observed.transform.scale,b=observed.transform.offset,pixelsPerMetre=a/(projectionSign*planSign*unit),offsetPixels=b+a*alignment.origin[axis]-a*alignment.offset[axis]/(planSign*unit),scaleUsed=1/pixelsPerMetre,calScale=elevationReference?numericScale(elevationReference):null;
  const conflict=elevationReference&&(elevationReference.sourceViewId!==elevationView.id||!calScale||elevationReference.status==='conflict'||elevationReference.conflict||elevationReference.kind==='hypothesis'||Math.abs(calScale/scaleUsed-1)>.05);
  return {...observed,status:conflict?'conflict':'proposed',reason:conflict?'ELEVATION_GRID_SCALE_CONFLICT':null,units:'metres-to-source-pixels',pixelRegistration:observed,transform:{modelAxis:observed.transform.floorAxis,projectionSign,pixelsPerMetre,offsetPixels},scaleUsed,reference:copy(reference),elevationReference:copy(elevationReference)};
 }

 return Object.freeze({version:1,alignElevationAxes,elevationAxisRegistration,bubbleRegions,markers,alignViews,alignRoofPlan,forBuilding,metricAlignment,datumNetwork,registerPreparedLevels});
});
