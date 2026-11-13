/* MIR — règles de finition verticales du projet, indépendantes des devis.
 * S'applique à l'élévation, à la texture 3D et aux exports.
 * Aucune longueur non documentée n'est présumée fabricant.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MIRVerticalLayout=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
 const bounds=poly=>{
  if(!Array.isArray(poly)||poly.length<3)return null;
  const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
  if(!xs.concat(ys).every(Number.isFinite))return null;
  return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
 };
 function verticalRule(material={},choice={}){
  const v=material.verticalLayout;
  if(!v||choice.orientation!=='vertical'||!positive(v.maxRunIn))return null;
  const format=Array.isArray(material.formats)&&choice.formatId?material.formats.find(f=>f.id===choice.formatId):null;
  const formatLimit=material.id==='hardie-board-batten'&&positive(format?.lengthIn)?format.lengthIn:null;
  const maxRunIn=formatLimit?Math.min(v.maxRunIn,formatLimit):v.maxRunIn;
  return {...v,maxRunIn,battenSpacingOptionsIn:Array.isArray(v.battenSpacingOptionsIn)?v.battenSpacingOptionsIn:[]};
 }
 function windowsWithin(openings=[],box){
  const [x0,y0,x1,y1]=box;
  return openings.flatMap(o=>{
   const b=bounds(o.polygon);
   if(!b)return [];
   const overlap=Math.max(0,Math.min(x1,b[2])-Math.max(x0,b[0]));
   if(overlap<Math.min(x1-x0,b[2]-b[0])*.20||b[3]<=y0||b[1]>=y1)return [];
   return [{...o,box:b,centre:(b[0]+b[2])/2,head:b[1]}];
  });
 }
 function breaks({polygon,feetPerPixel,material,choice={},openings=[],manualTransitions=[]}={}){
  const rule=verticalRule(material,choice),box=bounds(polygon);
  if(!rule)return {complete:true,items:[],maxRunIn:null,reason:'not_applicable'};
  if(!box||!positive(feetPerPixel))return {complete:false,items:[],maxRunIn:rule.maxRunIn,reason:'scale_missing'};
  const maxPx=rule.maxRunIn/(feetPerPixel*12),[x0,top,x1,bottom]=box;
  if(!(maxPx>0))return {complete:false,items:[],maxRunIn:rule.maxRunIn,reason:'invalid_scale'};
  const existing=manualTransitions.filter(t=>t.orientation==='horizontal'&&Number.isFinite(t.position)&&t.position>0&&t.position<1)
   .map(t=>top+(bottom-top)*t.position).sort((a,b)=>a-b);
  const cuts=[top,...existing,bottom],items=[],windows=windowsWithin(openings,box);
  for(let segment=0;segment<cuts.length-1;segment++){
   let cursor=cuts[segment],limit=cuts[segment+1],cycles=0;
   while(limit-cursor>maxPx+.5&&cycles++<200){
    const preferred=Math.min(cursor+maxPx,limit-maxPx*.34);
    const lower=Math.max(cursor+maxPx*.55,cursor+Math.min(8,maxPx*.12));
    const possible=windows.filter(w=>w.head>=lower&&w.head<=cursor+maxPx&&w.head<limit-2);
    possible.sort((a,b)=>Math.abs(a.head-preferred)-Math.abs(b.head-preferred));
    const head=possible[0],near=head&&Math.abs(head.head-preferred)<=maxPx*.36;
    const candidate=near?head.head:preferred;
    const y=Math.min(cursor+maxPx,Math.max(cursor+1,candidate));
    if(!(y>cursor&&y<limit))break;
    items.push({y,position:(y-top)/(bottom-top),source:near?'top-of-window':'maximum-run',
      maxRunIn:rule.maxRunIn,runAboveIn:Number(((y-cursor)*feetPerPixel*12).toFixed(2)),
      windowId:near?head.id:null,needsReview:true});
    cursor=y;
   }
  }
  return {complete:true,items,maxRunIn:rule.maxRunIn,reason:null,
    longestRunIn:Math.max(...[top,...existing,...items.map(t=>t.y),bottom].sort((a,b)=>a-b).slice(1)
      .map((y,i,arr)=>y-([top,...existing,...items.map(t=>t.y),bottom].sort((a,b)=>a-b))[i]))*feetPerPixel*12};
 }
 function battens({polygon,feetPerPixel,material,choice={},openings=[]}={}){
  const rule=verticalRule(material,choice),box=bounds(polygon);
  if(!rule?.battenSpacingOptionsIn?.length)return {complete:true,lines:[],reason:'not_applicable'};
  if(!positive(feetPerPixel)||!box)return {complete:false,lines:[],reason:'scale_missing'};
  const options=rule.battenSpacingOptionsIn;
  const spacingIn=options.includes(choice.battenSpacingIn)?choice.battenSpacingIn:options[0];
  const step=spacingIn/(feetPerPixel*12),[x0,y0,x1,y1]=box;
  if(!(step>2))return {complete:false,lines:[],reason:'scale_too_small'};
  const gable=polygon.length===5;
  const apex=gable?polygon.reduce((best,p)=>p[1]<best[1]?p:best,polygon[0]):null;
  const windows=windowsWithin(openings,box);
  let anchor=apex?apex[0]:(x0+x1)/2,alignment=apex?'gable-apex':'zone-centred';
  if(!apex&&windows.length){
   // Compare phases: battens near jambs, not through window centres.
   const jambs=windows.flatMap(w=>[w.box[0],w.box[2]]);
   let best=Infinity,phase=0;
   for(let k=0;k<40;k++){
    const candidate=x0+k*step/40;
    const seamDist=x=>{const d=Math.abs(((x-candidate)%step+step)%step);return Math.min(d,step-d);};
    const score=jambs.reduce((s,x)=>s+Math.min(1,seamDist(x)/(step*.3)),0)
      +windows.reduce((s,w)=>s+Math.max(0,1-seamDist(w.centre)/(step*.24))*1.6,0);
    if(score<best){best=score;phase=candidate;}
   }
   anchor=phase;alignment='window-jambs';
  }
  const lines=[];let n=0;
  for(let k=Math.ceil((x0-anchor)/step);k<=(x1-anchor)/step&&n<400;k++,n++){
   const x=anchor+k*step;
   if(x>x0+1&&x<x1-1)lines.push({x,spacingIn,source:alignment,needsReview:true});
  }
  return {complete:true,spacingIn,alignment,anchorX:anchor,lines,reason:null,
    gableApexX:apex?apex[0]:null,boardCount:null,notCertifiedTakeoff:true};
 }
 return Object.freeze({version:'1.0.0',verticalRule,breaks,battens});
});