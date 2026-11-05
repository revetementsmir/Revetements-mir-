/* MIR — reconnaissance locale de marches : traits répétés + cotes mesurées.
 * Aucun réseau, aucune inférence de hauteur ou de structure portante.
 * Toutes les coordonnées sont sur le raster du PDF (non l'écran HTML).
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MIRStairVision=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
 const median=a=>{const b=a.slice().sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:0;};
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 function detect({image,crop,feetPerPixel,kind='floor',textHints=[],maxCandidates=8}={}){
  if(!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||!image.data)return [];
  if(!Array.isArray(crop)||crop.length!==4||!crop.every(Number.isFinite))return [];
  // Une longueur en pixels n'est pas une dimension tant que l'échelle manque.
  if(!(feetPerPixel>0&&Number.isFinite(feetPerPixel)))return [];
  if(!['floor','foundation','elevation'].includes(kind))return [];
  let [cx,cy,cw,ch]=crop.map(Math.round);
  cx=clamp(cx,0,image.width-1);cy=clamp(cy,0,image.height-1);
  cw=clamp(cw,0,image.width-cx);ch=clamp(ch,0,image.height-cy);
  if(cw<45||ch<45)return [];
  const stride=Math.max(1,Math.ceil(Math.max(cw,ch)/1200)),w=Math.floor(cw/stride),h=Math.floor(ch/stride);
  const fpp=feetPerPixel*stride;
  if(w<25||h<25||!Number.isFinite(w*h)||w*h>1500000)return [];
  const grid=new Uint8Array(w*h),raw=image.data,channels=raw.length===image.width*image.height?1:4;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const px=(cy+y*stride)*image.width+(cx+x*stride),i=px*channels;
   if(channels===1)grid[y*w+x]=raw[i]<150?1:0;
   else{
    const r=raw[i],g=raw[i+1],b=raw[i+2];
    grid[y*w+x]=raw[i+3]>120&&Math.max(r,g,b)<172&&Math.max(r,g,b)-Math.min(r,g,b)<85?1:0;
   }
  }
  // Chaque ligne de marche doit avoir une largeur vraisemblable en pieds.
  const minRun=Math.max(16,Math.ceil(1.75/fpp)),maxRun=Math.min(750,Math.ceil(16/fpp));
  const minGap=Math.max(3,Math.round(.53/fpp)),maxGap=Math.max(minGap+2,Math.ceil(1.90/fpp));
  if(minRun>Math.max(w,h)||minGap>Math.max(w,h))return [];
  function runs(vertical){
   const rows=vertical?w:h,cols=vertical?h:w,res=[];
   const ink=(v,u)=>vertical?grid[u*w+v]:grid[v*w+u];
   for(let v=0;v<rows;v++){
    let begin=-1,last=-1,hit=0;
    function finish(){
     if(begin<0)return;
     const len=last-begin+1;
     if(len>=minRun&&len<=maxRun&&hit/len>.74)res.push({v,start:begin,end:last,len});
     begin=-1;last=-1;hit=0;
    }
    for(let u=0;u<cols;u++){
     if(ink(v,u)){
      if(begin<0)begin=u;
      last=u;hit++;
     }else if(begin>=0&&u-last>2)finish();
    }
    finish();
   }
   // Plusieurs rangées noires contiguës forment un seul trait épais.
   const clustered=[];
   for(const item of res){
    let previous=clustered[clustered.length-1];
    if(previous&&item.v-previous.v<=3&&Math.abs(item.start-previous.start)<=4&&
      Math.abs(item.end-previous.end)<=4){
      if(item.len>previous.len){previous.start=item.start;previous.end=item.end;previous.len=item.len;}
      previous.v=item.v;previous.thickness++;
    }else clustered.push({...item,thickness:1});
   }
   return clustered.map(o=>({...o,v:o.v-(o.thickness-1)/2}));
  }
  const horizontal=runs(false),vertical=runs(true);
  const hints=(Array.isArray(textHints)?textHints:[]).filter(h=>h?.type==='stairs');
  function propose(lines,cross,axis){
   const out=[];
   for(let i=0;i<lines.length;i++){
    const first=lines[i],best=[];
    for(let j=i+1;j<lines.length;j++){
      const b=lines[j],spacing=b.v-first.v;
      if(spacing>maxGap)break;
      if(spacing<minGap)continue;
      const overlap=Math.min(first.end,b.end)-Math.max(first.start,b.start)+1;
      if(overlap<Math.min(first.len,b.len)*.78||Math.abs(first.len-b.len)>first.len*.23)continue;
      const group=[first,b];let target=b.v+spacing;
      for(let k=j+1;k<lines.length&&group.length<14;k++){
       const row=lines[k];if(row.v>target+Math.max(3,spacing*.22))break;
       if(Math.abs(row.v-target)>Math.max(2,spacing*.22))continue;
       const common=Math.min(first.end,row.end)-Math.max(first.start,row.start)+1;
       if(common<Math.min(first.len,row.len)*.75||Math.abs(row.len-first.len)>first.len*.25)continue;
       group.push(row);target+=spacing;
      }
      if(group.length>=4&&group.length>best.length){best.splice(0,best.length,...group);}
    }
    if(best.length<4)continue;
    const start=median(best.map(r=>r.start)),end=median(best.map(r=>r.end));
    const pitch=median(best.slice(1).map((r,j)=>r.v-best[j].v));
    const gaps=best.slice(1).map((r,j)=>r.v-best[j].v);
    const cv=Math.sqrt(mean(gaps.map(n=>(n-mean(gaps))**2)))/mean(gaps);
    if(!(pitch>=minGap&&pitch<=maxGap)||cv>.22)continue;
    const widthFt=(end-start)*fpp,depthFt=(best[best.length-1].v-best[0].v+pitch)*fpp;
    if(widthFt<1.75||widthFt>16||depthFt<1.5||depthFt>24)continue;
    const crossMin=best[0].v,crossMax=best[best.length-1].v+pitch;
    const rails=cross.filter(line=>Math.abs(line.v-start)<5||Math.abs(line.v-end)<5)
      .filter(line=>line.start<=crossMin+pitch*.4&&line.end>=crossMax-pitch*.4);
    const railCount=Number(rails.some(r=>Math.abs(r.v-start)<5))+Number(rails.some(r=>Math.abs(r.v-end)<5));
    const box=axis==='horizontal'
      ?[cx+start*stride,cy+crossMin*stride,cx+end*stride,cy+crossMax*stride]
      :[cx+crossMin*stride,cy+start*stride,cx+crossMax*stride,cy+end*stride];
    const center=[(box[0]+box[2])/2,(box[1]+box[3])/2];
    const nearHint=hints.some(h=>{
      if(!Array.isArray(h.box))return false;
      const hCenter=[(h.box[0]+h.box[2])/2,(h.box[1]+h.box[3])/2];
      return dist(center,hCenter)<Math.max(100*stride,Math.max(box[2]-box[0],box[3]-box[1])*1.6);
    });
    const confidence=clamp(.35+.15*(1-Math.min(cv,1))+.14*(Math.min(best.length,9)/9)+.14*(railCount/2)+
      .13*(kind==='floor')+.10*(nearHint?1:0),.2,.98);
    if(kind==='elevation'&&!nearHint)continue;
    const relative=[(center[0]-cx)/cw,(center[1]-cy)/ch];
    out.push({
      id:'stair-px-'+axis+'-'+Math.round(center[0])+'-'+Math.round(center[1]),
      type:'stairs',method:'raster-parallel-risers-calibrated',source:'pdf-pixels',
      box:box.map(Math.round),cropBox:box.map((v,i)=>Math.round(v-(i%2?cy:cx))),
      relativeCenter:relative.map(v=>clamp(v,0,1)),axis,
      detectedLines:best.length,count:best.length,
      widthFt:Number(widthFt.toFixed(3)),depthFt:Number(depthFt.toFixed(3)),
      treadFt:Number((pitch*fpp).toFixed(3)),riserFt:null,
      feetPerPixel,scaleSource:'dimension-line-calibration',confidence:Number(confidence.toFixed(2)),
      confidenceLabel:confidence>=.78?'good':'review',needsReview:true,
      positionVerified:false,riserHeightVerified:false,concreteVerified:false,
      statement:'Forme mesurée sur pixels; nombre de marches, implantation et hauteur à vérifier sur une coupe.',
      evidence:{regularity:Number((1-cv).toFixed(3)),rails:railCount,nearStairAnnotation:nearHint}
    });
   }
   return out;
  }
  const all=[...propose(horizontal,vertical,'horizontal'),...propose(vertical,horizontal,'vertical')];
  all.sort((a,b)=>b.confidence-a.confidence||b.detectedLines-a.detectedLines);
  const result=[];
  for(const candidate of all){
   const [l,t,r,b]=candidate.box;
   const exists=result.some(c=>{
     const [a,y,z,u]=c.box,overlap=Math.max(0,Math.min(r,z)-Math.max(l,a))*Math.max(0,Math.min(b,u)-Math.max(t,y));
     const smaller=Math.min((r-l)*(b-t),(z-a)*(u-y));
     return smaller>0&&overlap/smaller>.55;
   });
   if(!exists)result.push(candidate);
   if(result.length>=Math.max(1,Math.min(20,maxCandidates)))break;
  }
  return result;
 }
 return Object.freeze({detect,version:'1.0.0'});
});