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
   const inBand=type==='number'?center[1]<image.height*.2&&center[0]>image.width*.08&&center[0]<image.width*.82:center[0]<image.width*.25&&center[1]>image.height*.12&&center[1]<image.height*.9;
   if(!inBand)continue;
   const support=circleSupport(image,center,height);if(support<.68)continue;
   (type==='number'?numeric:letters).push({label,center,box:copy(row.box),confidence:row.confidence,ringSupport:support,sourceViewId:view.id});
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
 return Object.freeze({version:1,markers,alignViews,forBuilding});
});