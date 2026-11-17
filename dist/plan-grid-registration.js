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
 function bubbleRegions(image){
  // Discover candidate ring locations from source ink BEFORE OCR. This avoids
  // depending on tiny 1/A/B labels in an entire 17-page raster document.
  // Labels are read separately from the interior, never inferred by ordering.
  if(!image?.data||image.width<250||image.height<250||image.width*image.height>12000000)
   return {status:'unresolved',reason:'GRID_SOURCE_UNAVAILABLE',bubbles:[]};
  const {width:w,height:h}=image,N=24,dirs=Array.from({length:N},(_,i)=>[Math.cos(2*Math.PI*i/N),Math.sin(2*Math.PI*i/N)]);
  const score=(x,y,r)=>{let hits=0;for(const [u,v] of dirs)if(dark(image,x+u*r,y+v*r)||dark(image,x+u*(r-1),y+v*(r-1))||dark(image,x+u*(r+1),y+v*(r+1)))hits++;return hits/N;};
  const minRadius=Math.max(7,Math.round(Math.min(w,h)*.007)),maxRadius=Math.min(42,Math.max(22,Math.round(Math.min(w,h)*.03)));
  const bands=[['number',[.08,.02,.83,.20]],['letter',[.06,.13,.20,.87]]],bubbles=[];
  for(const [kind,[xl,yl,xr,yb]]of bands){
   const rough=[];for(let y=Math.floor(h*yl);y<h*yb;y+=4)for(let x=Math.floor(w*xl);x<w*xr;x+=4){
    let best=null;for(let r=minRadius;r<=maxRadius;r+=3){const value=score(x,y,r);if(value>=.68&&(!best||value>best.score))best={x,y,r,score:value};}
    if(best)rough.push(best);
   }
   rough.sort((a,b)=>b.score-a.score);
   const unique=[];
   for(const first of rough){
    if(unique.some(c=>Math.hypot(c.x-first.x,c.y-first.y)<Math.max(14,c.r*1.5)))continue;
    let best=first;for(let y=first.y-4;y<=first.y+4;y++)for(let x=first.x-4;x<=first.x+4;x++)for(let r=Math.max(minRadius,first.r-3);r<=Math.min(maxRadius,first.r+3);r++){
     const value=score(x,y,r);if(value>best.score)best={x,y,r,score:value};
    }
    if(best.score>=.9)unique.push(best);
    if(unique.length>=80)break;
   }
   const axis=kind==='number'?'y':'x',tolerance=kind==='number'?Math.max(3,h*.0025):Math.max(8,w*.006);
   let chosen=[];
   for(const c of unique){
    const group=unique.filter(v=>Math.abs(v[axis]-c[axis])<=tolerance&&Math.abs(v.r-c.r)<=Math.max(3,c.r*.20));
    if(group.length>chosen.length||group.length===chosen.length&&group.reduce((sum,v)=>sum+v.score,0)>chosen.reduce((sum,v)=>sum+v.score,0))chosen=group;
   }
   const linear=kind==='number'?'x':'y';chosen.sort((a,b)=>a[linear]-b[linear]);
   const span=chosen.length?chosen.at(-1)[linear]-chosen[0][linear]:0;
   if(chosen.length<(kind==='number'?3:2)||span<(kind==='number'?w:h)*.18)continue;
   bubbles.push(...chosen.slice(0,12).map(v=>({kind,center:[v.x,v.y],radius:v.r,ringSupport:v.score,
    sourceMethod:'source-raster-closed-grid-ring',confirmationRequired:true})));
  }
  const ok=bubbles.filter(b=>b.kind==='number').length>=3&&bubbles.filter(b=>b.kind==='letter').length>=2;
  return {status:ok?'proposed':'unresolved',reason:ok?null:'GRID_AXES_INSUFFICIENT',bubbles,confirmationRequired:true};
 }
 function markers(view,image){
  if(!view||view.kind!=='floor'||!image?.data||image.width<250||image.height<250||image.width*image.height>3e7)return {status:'unresolved',reason:'GRID_SOURCE_UNAVAILABLE'};
  const rows=view.payload?.drawingReadings?.rows||[],numeric=[],letters=[];
  for(const row of rows){
   if(row.box?.length!==4||!row.box.every(finite)||(row.confidence??0)<55)continue;
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
   const middle=median(items.map(v=>v.center[axis])),tolerance=Math.max(5,extent*.015),close=items.filter(v=>Math.abs(v.center[axis]-middle)<=tolerance),count=new Map();
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
 function alignViews(referenceView,movingView,referenceImage,movingImage){
  if(!referenceView||!movingView||referenceView.buildingId!==movingView.buildingId||referenceView.levelId===movingView.levelId||referenceView.kind!=='floor'||movingView.kind!=='floor')return {status:'unresolved',reason:'GRID_SOURCE_LEVEL'};
  const reference=markers(referenceView,referenceImage),moving=markers(movingView,movingImage);
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
 return Object.freeze({version:1,bubbleRegions,markers,alignViews,forBuilding});
});