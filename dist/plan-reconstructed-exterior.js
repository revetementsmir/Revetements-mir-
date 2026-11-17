/* Source-supported exterior proposals. Missing extents and material identities stay unknown. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-reconstruction.js'):root.MIRPlanReconstruction,node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision,node?require('./plan-import-core.js'):root.MIRPDFAnalysis,node?require('./plan-reconstructed-flat-roofs.js'):root.MIRReconstructedFlatRoofs);
 if(node)module.exports=api;else root.MIRReconstructedExterior=api;
})(typeof window==='object'?window:globalThis,function(M,R,V,A,FlatRoofs){
 'use strict';
 const copy=M.clone,finite=Number.isFinite,INCH=.0254;
 const normal=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const frames={front:{u:[1,0],n:[0,-1]},back:{u:[-1,0],n:[0,1]},right:{u:[0,1],n:[1,0]},left:{u:[0,-1],n:[-1,0]}};
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1],rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
 const validBox=b=>Array.isArray(b)&&b.length===4&&b.every(finite)&&b[2]>0&&b[3]>0;
 const intersection=(a,b)=>{const x=Math.max(a[0],b[0]),y=Math.max(a[1],b[1]),r=Math.min(a[0]+a[2],b[0]+b[2]),bottom=Math.min(a[1]+a[3],b[1]+b[3]);return r>x&&bottom>y?[x,y,r-x,bottom-y]:null;};
 const area=b=>b[2]*b[3];
 const sourceKey=box=>box.map(n=>Math.round(n*10)/10).join('-');
 const median=values=>{const a=values.slice().sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;};
 const nonMasonryPrefix=text=>/\b(?:couleurs?|colors?|colours?|teintes?|fibro[ -]?ciment|fibre[ -]?ciment|fiber[ -]?cement|fibre[ -]?cement|imitation|imit\.?|simili|faux)\b/.test(text);
 function subtractBoxes(box,masks){
  let parts=[box.slice()];
  for(const mask of masks.filter(validBox)){
   parts=parts.flatMap(p=>{const cut=intersection(p,mask);if(!cut)return [p];const [x,y,w,h]=p,[cx,cy,cw,ch]=cut;return [[x,y,w,cy-y],[x,cy+ch,w,y+h-cy-ch],[x,cy,cx-x,ch],[cx+cw,cy,x+w-cx-cw,ch]].filter(b=>b[2]>1&&b[3]>1);});
   if(parts.length>80)return []; // Excessive segmentation is unresolved, never filled over.
  }
  return parts;
 }
 function materialLabels(view){
  return R.readings(view).filter(row=>{const text=normal(row.text),hit=/\b(?:briques?|maconnerie|masonry|brick(?:work)?|pierres?|stone)\b/.exec(text);
   return row.box?.length===4&&(row.source==='pdf-text'||row.confidence>=40)&&hit&&!/\b(?:sans|aucun[e]?|no|without)\s+(?:de\s+)?$/.test(text.slice(0,hit.index))&&
    !nonMasonryPrefix(text.slice(0,hit.index));
  });
 }
 function writtenThickness(view,type){
  const subject=type==='foundation'?/\b(?:fondations?|solage|foundation(?:\s+walls?)?)\b/:/\b(?:briques?|maconnerie|masonry|brick(?:work)?|pierres?|stone)\b/;
  const found=[];
  for(const row of R.readings(view)){
   if(!row.box?.every(finite)||row.box.length!==4||row.source!=='pdf-text'&&!(row.confidence>=40))continue;
   const text=normal(row.text).replace(/''/g,'"'),hit=subject.exec(text);if(!hit)continue;
   if(/\b(?:sans|aucun[e]?|no|without)\s+(?:de\s+)?$/.test(text.slice(0,hit.index)))continue;
   // A post base/stone unit format is an element section, not wall thickness.
   // Keep uncertain OCR as an unassociated reading instead of turning its
   // first number into a conflicting wall dimension.
   if(type==='masonry'&&(/\b(?:bases?|socles?|piedestals?|pedestals?|colonnes?|columns?|poteaux|posts?|formats?|dimensions?)\b/.test(text)||nonMasonryPrefix(text.slice(0,hit.index))))continue;
   const rest=text.slice(hit.index+hit[0].length),match=rest.match(/^[^\d]{0,28}(\d+(?:[.,]\d+)?(?:\s+\d+\s*\/\s*\d+)?\s*(?:"|po\b|pouces?\b|in(?:ches)?\b|mm\b|cm\b))/);
   if(!match)continue;
   if(/^\s*(?:x|×|par\b|by\b)\s*\d/i.test(rest.slice(match[0].length)))continue;
   const measured=A.parseDimension(match[1].replace(/pouces?/g,'po').replace(/inches/g,'in'),{ocr:row.source==='ocr'});
   if(!measured||measured.corrected)continue;
   const value=measured.valueFt*.3048;if(!(value>.01&&value<1.5))continue;
   if(found.some(r=>Math.abs(r.value-value)<1e-9&&r.sourceBox.every((n,i)=>n===row.box[i])))continue;
   found.push({value,unit:'m',kind:'written',status:'proposed',sourceViewId:view.id,sourceFrame:copy(view.frame),sourceBox:copy(row.box),boxFormat:'xyxy',label:row.text,scope:'source-view; association-to-this-element-requires-review',confirmationRequired:true});
  }
  return found;
 }
 function thickness(view,type,hasMasonry){
  const ruleInches=type==='masonry'?4:hasMasonry?10:8,ruleValue=ruleInches*INCH,candidates=writtenThickness(view,type);
  const conflict=candidates.some(c=>Math.abs(c.value-ruleValue)>.001)||candidates.some(c=>Math.abs(c.value-candidates[0].value)>.001);
  return {value:conflict?null:ruleValue,unit:'m',kind:conflict?'conflicting-evidence':'user-rule',status:conflict?'conflict':'proposed',ruleInches,ruleValue,
   ruleSource:'Frederick: masonry 4 in; foundation 10 in with masonry, otherwise 8 in',condition:type==='masonry'?'masonry':hasMasonry?'masonry-observed':'otherwise',
   conditionStatus:type==='foundation'&&!hasMasonry?'unverified':'proposed',writtenCandidates:candidates,confirmationRequired:true,structuralVerification:false};
 }
 // A coloured fill, horizontal siding courses or a note alone do not establish masonry.
 // Require several visible courses with staggered interior joints, inside a known wall.
 function masonryHatches(image,box){
  if(!image?.data||!validBox(box))return [];
  const b=intersection(box,[0,0,image.width,image.height]);if(!b||b[2]<45||b[3]<18)return [];
  const x0=Math.ceil(b[0]),x1=Math.floor(b[0]+b[2]-1),y0=Math.ceil(b[1]),y1=Math.floor(b[1]+b[3]-1),minRun=Math.max(25,b[2]*.55);
  const ink=(x,y)=>{if(x<0||y<0||x>=image.width||y>=image.height)return false;const p=(y*image.width+x)*4,r=image.data[p],g=image.data[p+1],bl=image.data[p+2];return image.data[p+3]>160&&Math.min(r,g,bl)<145&&Math.max(r,g,bl)<205&&Math.max(r,g,bl)-Math.min(r,g,bl)<35;};
  const rows=[];
  for(let y=y0;y<=y1;y++){
   let begin=null,last=-10,best=null;
   for(let x=x0;x<=x1;x++){if(!ink(x,y))continue;if(x-last>2)begin=x;last=x;if(!best||last-begin>best.right-best.left)best={left:begin,right:last};}
   if(best&&best.right-best.left>=minRun){const previous=rows.at(-1);if(previous&&y-previous.bottom<=2){previous.bottom=y;previous.left=Math.max(previous.left,best.left);previous.right=Math.min(previous.right,best.right);}else rows.push({y,bottom:y,...best});}
  }
  const courses=[];
  for(let i=1;i<rows.length;i++){
   const a=rows[i-1],z=rows[i],top=a.bottom,bottom=z.y,pitch=bottom-top,left=Math.max(a.left,z.left),right=Math.min(a.right,z.right);
   if(pitch<4||pitch>Math.min(80,b[3]*.35)||right-left<Math.max(30,pitch*4))continue;
   const jointPixels=[];
   for(let x=Math.ceil(left+Math.max(3,pitch*.25));x<=Math.floor(right-Math.max(3,pitch*.25));x++){
    let hits=0,total=0;for(let y=top+2;y<bottom-1;y++){total++;hits+=Number(ink(x,y)||ink(x-1,y)||ink(x+1,y));}
    if(total>=2&&hits/total>=.8)jointPixels.push(x);
   }
   const groups=[];for(const x of jointPixels){if(!groups.length||x-groups.at(-1).at(-1)>1)groups.push([x]);else groups.at(-1).push(x);}
   const joints=groups.filter(g=>g.length<=Math.max(5,pitch*.45)).map(g=>(g[0]+g.at(-1))/2);
   if(joints.length<2)continue;
   const spacing=median(joints.slice(1).map((x,j)=>x-joints[j]));if(!(spacing>=pitch*1.3&&spacing<=pitch*12))continue;
   let clear=0,count=0;for(let y=top+2;y<bottom-1;y+=2)for(let x=Math.ceil(left+2);x<right-2;x+=3){count++;clear+=Number(!ink(x,y));}
   if(!count||clear/count<.55)continue;
   courses.push({top,bottom,left,right,pitch,joints,spacing});
  }
  const groups=[];
  for(const c of courses){const group=groups.at(-1),last=group?.at(-1);if(last&&c.top-last.bottom<=3&&Math.max(c.pitch,last.pitch)/Math.min(c.pitch,last.pitch)<1.5&&Math.min(c.right,last.right)-Math.max(c.left,last.left)>Math.min(c.right-c.left,last.right-last.left)*.7)group.push(c);else groups.push([c]);}
  return groups.filter(g=>g.length>=3&&g.slice(1).some((c,i)=>{
   const previous=g[i],moved=c.joints.filter(x=>Math.min(...previous.joints.map(y=>Math.abs(x-y)))>Math.max(2,c.pitch*.25));return moved.length>=c.joints.length*.5;
  })).map(g=>({box:[Math.max(...g.map(c=>c.left)),g[0].top,Math.min(...g.map(c=>c.right))-Math.max(...g.map(c=>c.left)),g.at(-1).bottom-g[0].top],
   method:'visible-courses-and-staggered-interior-joints',courses:g.length,coursePixels:median(g.map(c=>c.pitch)),jointSpacingPixels:median(g.map(c=>c.spacing)),status:'proposed',confirmationRequired:true}));
 }
 // Irregular stone does not have uniform brick courses. Observe its closed
 // source cells, then require a real leader from a material caption. Pixel
 // thresholds follow the caption's source height, not a particular PDF size.
 function stoneCaptions(rows,masks=[]){
  const labels=materialLabels({payload:{drawingReadings:{rows}}}).filter(r=>! /\b(?:notes?|index|sommaire|contents|tableau|schedule)\b/.test(normal(r.text)));
  return labels.map(row=>{const [x,y,r,b]=row.box,font=b-y,bounds=row.box.slice();
   for(const next of rows){if(next.box?.length!==4||next.box[1]<y||next.box[3]>b+font*3.5||next.box[0]<x-font||next.box[2]>r+font||next.box[2]<=x||next.box[0]>=r)continue;bounds[3]=Math.max(bounds[3],next.box[3]);}
   return {label:row.text,sourceBox:copy(row.box),box:[bounds[0],bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]],font,confidence:row.confidence,source:row.source};
  }).filter((c,i,a)=>c.font>0&&!masks.some(m=>intersection(c.box,m))&&!a.slice(0,i).some(p=>p.sourceBox.every((n,j)=>n===c.sourceBox[j])));
 }
 function stoneInk(image,x,y,threshold=205){
  x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=image.width||y>=image.height)return false;
  const p=(y*image.width+x)*4,r=image.data[p],g=image.data[p+1],b=image.data[p+2];
  return image.data[p+3]>160&&Math.max(r,g,b)-Math.min(r,g,b)<35&&(r+g+b)/3<threshold;
 }
 function stoneLeader(image,caption,box,masks,unit){
  const contains=(b,x,y)=>x>=b[0]&&y>=b[1]&&x<b[0]+b[2]&&y<b[1]+b[3],tolerance=Math.max(1,Math.round(unit));
  const segment=(a,b,minimum=20*unit)=>{const length=M.distance(a,b);if(length<minimum)return null;let hits=0,gap=0,maxGap=0;const count=Math.ceil(length);
   for(let i=0;i<=count;i++){const x=a[0]+(b[0]-a[0])*i/count,y=a[1]+(b[1]-a[1])*i/count;if(masks.some(m=>contains(m,x,y)))return null;
    let hit=false;for(let dy=-tolerance;dy<=tolerance&&!hit;dy++)for(let dx=-tolerance;dx<=tolerance;dx++)if(stoneInk(image,x+dx,y+dy,185)){hit=true;break;}
    if(hit){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);
   }
   return hits/(count+1)>=.9&&maxGap<=Math.max(1,3*unit)?{anchors:[a,b],support:hits/(count+1),maxGap,pixelTolerance:tolerance}:null;
  };
  const [cx,cy,cw,ch]=caption.box,[x,y,w,h]=box;if(intersection(caption.box,box))return null;
  const left=cx+cw<x,right=cx>x+w;if(!left&&!right)return null;
  const captionX=left?cx+cw+2*unit:cx-2*unit,edgeX=left?x-2*unit:x+w+2*unit,distance=Math.abs(edgeX-captionX),sign=left?1:-1;
  if(distance<8*unit||distance>caption.font*18)return null;
  const ylo=Math.max(y,cy-caption.font*5),yhi=Math.min(y+h,cy+ch+caption.font*5),step=Math.max(1,Math.floor(unit));let best=null;
  for(let ay=Math.ceil(cy);ay<=cy+ch+2*unit;ay+=step){const origin=[captionX,ay],stems=[{a:origin,stem:null}];
   for(let length=8*unit;length<=caption.font*2;length+=2*unit){const a=[captionX+length*sign,ay],stem=segment(origin,a,8*unit);if(stem)stems.push({a,stem});}
   for(const {a,stem}of stems)for(let by=Math.ceil(ylo);by<=yhi;by+=step){const b=[edgeX,by],ev=segment(a,b);if(!ev)continue;
    const slope=(by-ay)/(edgeX-a[0]),inside=[edgeX+sign*10*unit,by+slope*sign*10*unit],extension=segment(a,inside);if(!extension)continue;
    const proof={...extension,stem,caption:caption.label,captionBox:copy(caption.sourceBox),captionConfidence:caption.confidence??null,captionSource:caption.source||'ocr',method:'caption-adjacent-neutral-ink-leader-crosses-closed-cell-cluster'};
    if(!best||proof.support>best.support)best=proof;
   }
  }return best;
 }
 // Exact run boundaries give simple polygons. Split at branches/holes and
 // before the polygon vertex limit; no bounding rectangle fills unknown ink.
 function mergeStonePolygons(polygons){
  const join=(a,b)=>{const lines=new Map();for(const p of [a,b])for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length],axis=q[1]===r[1]?0:q[0]===r[0]?1:null;if(axis===null)return null;
    const key=axis+':'+q[1-axis],list=lines.get(key)||[];list.push({axis,c:q[1-axis],lo:Math.min(q[axis],r[axis]),hi:Math.max(q[axis],r[axis]),sign:Math.sign(r[axis]-q[axis])});lines.set(key,list);
   }
   const edges=[];let shared=0;
   for(const list of lines.values()){const cuts=[...new Set(list.flatMap(e=>[e.lo,e.hi]))].sort((a,b)=>a-b);
    for(let i=1;i<cuts.length;i++){const lo=cuts[i-1],hi=cuts[i],mid=(lo+hi)/2,owners=list.filter(e=>e.lo<mid&&e.hi>mid),sum=owners.reduce((n,e)=>n+e.sign,0);if(!sum){if(owners.length)shared+=hi-lo;continue;}if(Math.abs(sum)!==1)return null;
     const {axis,c}=owners[0],point=n=>axis===0?[n,c]:[c,n];edges.push(sum>0?[point(lo),point(hi)]:[point(hi),point(lo)]);
    }
   }
   if(!shared)return null;
   const key=p=>p.join(','),next=new Map();for(const [a,b]of edges){if(next.has(key(a)))return null;next.set(key(a),b);}
   const start=edges[0][0],points=[start];let cursor=next.get(key(start));while(cursor&&key(cursor)!==key(start)&&points.length<=edges.length){points.push(cursor);cursor=next.get(key(cursor));}
   if(!cursor||points.length!==edges.length)return null; // More than one loop is a hole, never a fill.
   const simple=points.filter((p,i)=>{const before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length];return (p[0]-before[0])*(after[1]-p[1])!==(p[1]-before[1])*(after[0]-p[0]);});
   return simple.length<=190&&!M.validatePolygon(simple).length?simple:null;
  };
  const merged=polygons.slice();let changed=true;
  while(changed){changed=false;for(let i=0;i<merged.length&&!changed;i++)for(let j=i+1;j<merged.length;j++){const combined=join(merged[i],merged[j]);if(!combined)continue;merged[i]=combined;merged.splice(j,1);changed=true;break;}}
  return merged;
 }
 function stonePolygons(mask,width,height,origin,{box=null,masks=[]}={}){
  const polygons=[];let active=[];
  const polygon=band=>{const left=[],right=[];let previous=null;
   for(const row of band){const [y,l,r]=row;if(!previous){left.push([l,y]);right.push([r,y]);}else {if(l!==previous[1])left.push([previous[1],y],[l,y]);if(r!==previous[2])right.push([previous[2],y],[r,y]);}previous=row;}
   left.push([previous[1],previous[0]+1]);right.push([previous[2],previous[0]+1]);
   return [...left,...right.reverse()].map(([x,y])=>[x+origin[0],y+origin[1]]);
  };
  const flush=()=>{for(const band of active)polygons.push(polygon(band));active=[];};
  const occupied=(x,y)=>{if(!mask[y*width+x])return false;const px=x+origin[0],py=y+origin[1];if(box&&(px<box[0]||py<box[1]||px+1>box[0]+box[2]||py+1>box[1]+box[3]))return false;return !masks.some(m=>px<m[0]+m[2]&&px+1>m[0]&&py<m[1]+m[3]&&py+1>m[1]);};
  for(let y=0;y<height;y++){const runs=[];for(let x=0;x<width;){if(!occupied(x,y)){x++;continue;}const l=x;while(x<width&&occupied(x,y))x++;runs.push([y,l,x]);}
   const compatible=runs.length===active.length&&runs.every((r,i)=>{const p=active[i].at(-1);return p[0]===y-1&&Math.min(r[2],p[2])>Math.max(r[1],p[1]);});
   if(!compatible||active.some((band,i)=>polygon([...band,runs[i]]).length>190))flush();
   if(!active.length)active=runs.map(r=>[r]);else runs.forEach((r,i)=>active[i].push(r));
   if(polygons.length+active.length>80){const merged=mergeStonePolygons(polygons);polygons.splice(0,polygons.length,...merged);if(polygons.length+active.length>80)return {status:'unresolved',reason:'MASONRY_REGION_COMPLEXITY',polygons:[]};}
  }flush();return {status:'observed',polygons:mergeStonePolygons(polygons)};
 }
 function irregularMasonry(image,box,rows,{masks=[]}={}){
  const empty=reason=>({status:'unresolved',reason,candidates:[]});
  if(!image?.data||image.data.length!==image.width*image.height*4||!validBox(box))return empty('MASONRY_SOURCE_REQUIRED');
  const bounds=intersection(box,[0,0,image.width,image.height]),captions=stoneCaptions(rows,masks);if(!bounds||!captions.length)return empty('MASONRY_CAPTION_REQUIRED');
  const unit=median(captions.map(c=>c.font))/8,x0=Math.ceil(bounds[0]),y0=Math.ceil(bounds[1]),w=Math.floor(bounds[0]+bounds[2])-x0,h=Math.floor(bounds[1]+bounds[3])-y0;
  if(!(unit>0)||w<1||h<1||w*h>6000000)return empty('MASONRY_SOURCE_COMPLEXITY');
  // Raster hatching itself frequently produces low-confidence OCR fragments
  // ("I", "ee", "—"). Only established text boxes mask the cell detector;
  // detected legends/openings remain unconditional exclusions.
  const captionMasks=rows.filter(r=>r.box?.length===4&&r.box.every(finite)&&(r.source==='pdf-text'||r.confidence>=70)&&/[a-z0-9]{2}/i.test(normal(r.text))).map(r=>[r.box[0],r.box[1],r.box[2]-r.box[0],r.box[3]-r.box[1]]),blocked=new Uint8Array(w*h),ink=new Uint8Array(w*h),labels=new Int32Array(w*h),work=new Int32Array(w*h),cells=[];
  for(const m of [...masks,...captionMasks].filter(validBox)){const cut=intersection(m,[x0,y0,w,h]);if(!cut)continue;for(let y=Math.max(0,Math.floor(cut[1]-y0));y<Math.min(h,Math.ceil(cut[1]+cut[3]-y0));y++)for(let x=Math.max(0,Math.floor(cut[0]-x0));x<Math.min(w,Math.ceil(cut[0]+cut[2]-x0));x++)blocked[y*w+x]=1;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)ink[y*w+x]=Number(stoneInk(image,x+x0,y+y0));
  for(let start=0;start<w*h;start++){
   if(labels[start]||blocked[start]||ink[start])continue;let head=0,tail=1,left=start%w,right=left,top=Math.floor(start/w),bottom=top,touches=false;work[0]=start;labels[start]=-1;
   while(head<tail){const id=work[head++],x=id%w,y=Math.floor(id/w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    for(const next of [x>0?id-1:-1,x+1<w?id+1:-1,y>0?id-w:-1,y+1<h?id+w:-1]){if(next<0){touches=true;continue;}if(blocked[next]){if(!ink[next])touches=true;continue;}if(labels[next]||ink[next])continue;labels[next]=-1;work[tail++]=next;}
   }
   const cw=right-left+1,ch=bottom-top+1;if(touches||cw<4*unit||ch<3*unit||tail<20*unit*unit||cw>120*unit||ch>65*unit||Math.max(cw/ch,ch/cw)>12||tail/(cw*ch)<.6)continue;
   const id=cells.length+1;for(let i=0;i<tail;i++)labels[work[i]]=id;cells.push({id,box:[left+x0,top+y0,cw,ch],interiorPixels:tail});
   if(cells.length>3000)return empty('MASONRY_CELL_COMPLEXITY');
  }
  const seen=new Set(),groups=[];
  for(const first of cells){if(seen.has(first.id))continue;const queue=[first],group=[];seen.add(first.id);
   while(queue.length){const a=queue.pop();group.push(a);for(const b of cells){if(seen.has(b.id))continue;const dx=Math.max(a.box[0]-b.box[0]-b.box[2],b.box[0]-a.box[0]-a.box[2],0),dy=Math.max(a.box[1]-b.box[1]-b.box[3],b.box[1]-a.box[1]-a.box[3],0);if(dx<=4*unit&&dy<=4*unit){seen.add(b.id);queue.push(b);}}}
   if(group.length<8)continue;const l=Math.min(...group.map(c=>c.box[0])),t=Math.min(...group.map(c=>c.box[1])),r=Math.max(...group.map(c=>c.box[0]+c.box[2])),b=Math.max(...group.map(c=>c.box[1]+c.box[3])),density=group.reduce((sum,c)=>sum+c.interiorPixels,0)/((r-l)*(b-t));
   if(density<.16||r-l<16*unit||b-t<15*unit)continue;
   const q=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.floor((values.length-1)*p)],variation=axis=>q(group.map(c=>c.box[axis]),.8)/q(group.map(c=>c.box[axis]),.2),heightVariation=variation(3),widthVariation=variation(2);
   if(heightVariation<1.4||widthVariation<1.4)continue;
   const cb=[l,t,r-l,b-t],leaders=captions.map(c=>stoneLeader(image,c,cb,masks,unit)).filter(Boolean);if(leaders.length)groups.push({box:cb,cells:group,leaders,density,heightVariation,widthVariation});
  }
  const candidates=[];
  for(const group of groups){const accepted=new Set(group.cells.map(c=>c.id)),mask=new Uint8Array(w*h),radius=Math.max(1,Math.round(unit));
   for(const c of group.cells)for(let y=c.box[1]-y0;y<c.box[1]-y0+c.box[3];y++)for(let x=c.box[0]-x0;x<c.box[0]-x0+c.box[2];x++){const id=y*w+x;if(!accepted.has(labels[id]))continue;mask[id]=1;
    // Include only the immediately observed neutral joint ink. Never bridge
    // white/coloured gaps or a source opening/legend with dilation.
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const next=yy*w+xx;if(!blocked[next]&&ink[next])mask[next]=1;}
   }
   const traced=stonePolygons(mask,w,h,[x0,y0]);if(traced.status!=='observed')return empty(traced.reason);
   const candidate={...group,polygons:traced.polygons,method:'source-linked-irregular-closed-stone-cells',normalization:{basis:'observed-material-caption-height',pixelsPerUnit:unit,captionHeight:unit*8},sourceExtent:'observed-cell-interiors-and-adjacent-neutral-joints',status:'proposed',confirmationRequired:true};
   // Working raster is never copied into project provenance or persistence.
   Object.defineProperty(candidate,'raster',{value:{mask,width:w,height:h,origin:[x0,y0]}});candidates.push(candidate);
  }
  return {status:candidates.length?'proposed':'unresolved',reason:candidates.length?null:'MASONRY_EXTENT_UNRESOLVED',candidates};
 }
 function sourceMasks(viewInfo,view,image){
  const masks=[...(viewInfo.envelope.occlusions||[]),...V.legendBoxes(image,R.readings(view))].filter(validBox);
  return masks.filter((box,i)=>!masks.slice(0,i).some(other=>box.every((n,j)=>Math.abs(n-other[j])<1)));
 }
 function wallBox(w,registration,frame){
  const xs=[registration.pixelU(dot(w.from,frame.u)),registration.pixelU(dot(w.to,frame.u))].sort((a,b)=>a-b);
  const top=registration.pixelZ(w.base+w.height),bottom=registration.pixelZ(w.base);
  return [xs[0],top,xs[1]-xs[0],bottom-top];
 }
 function pointAt(w,frame,u){const a=dot(w.from,frame.u),b=dot(w.to,frame.u),t=(u-a)/(b-a);return [w.from[0]+(w.to[0]-w.from[0])*t,w.from[1]+(w.to[1]-w.from[1])*t];}
 function projectedOpeningBoxes(w,level,registration,frame){
  const vector=[(w.to[0]-w.from[0])/w.length,(w.to[1]-w.from[1])/w.length];
  return (level.wallOpenings||[]).filter(o=>o.wallId===w.id&&!M.openingIssues([o],[w]).length).map(o=>{
   const p=o.offset,q=o.offset+o.width,a=[w.from[0]+vector[0]*p,w.from[1]+vector[1]*p],b=[w.from[0]+vector[0]*q,w.from[1]+vector[1]*q],x=[registration.pixelU(dot(a,frame.u)),registration.pixelU(dot(b,frame.u))].sort((a,b)=>a-b),top=registration.pixelZ(w.base+o.sill+o.height),bottom=registration.pixelZ(w.base+o.sill);
   return [x[0]-2,top-2,x[1]-x[0]+4,bottom-top+4];
  });
 }
 function nearerWallBoxes(w,allWalls,registration,frame,{foundationBottom=null}={}){
  return allWalls.filter(other=>other.id!==w.id&&dot(other.normal,frame.n)>.999&&dot(other.from,frame.n)>dot(w.from,frame.n)+.001).map(other=>{
   const box=wallBox(other,registration,frame);
   // A nearer volume reaching this foundation datum hides the foundation behind it.
   // Its own foundation remains an independent source proposal, never a duplicate.
   if(finite(foundationBottom)&&other.base<=w.base+.03)box[3]=Math.max(box[3],foundationBottom-box[1]);
   return box;
  }).filter(validBox);
 }
 function provenance(view,box,registration,method){
  return {kind:'estimated-calibrated',method,sourceCategory:'pdf-source-proposal',sourceViewId:view.id,sourceFrame:copy(view.frame),sourceBox:copy(box),boxFormat:'xywh',
   anchors:[[box[0],box[1]],[box[0]+box[2],box[1]+box[3]]],scalesUsed:{x:registration.sx,y:registration.sz},referenceGuide:copy(registration.guide),status:'proposed',confirmationRequired:true};
 }
 function foundationCandidate(view,viewInfo,registration,w,image){
  const stored=view.payload.foundation;
  if(validBox(stored?.box)&&['pdf-foundation-guides','pdf-pixel-transition'].includes(stored.source))return {...copy(stored),basis:stored.source};
  const guides=view.payload.foundationGuides?.levels,grade=guides?.grade?.line?.y;
  const tops=(guides?.foundations||[]).map(g=>g.line?.y).filter(y=>finite(y)&&finite(grade)&&grade>y+2);
  if(!tops.length)return null;
  const wb=wallBox(w,registration,frames[viewInfo.direction]),top=Math.max(...tops);
  if(grade-top>wb[3]*.5)return null;
  return {box:[wb[0],top,wb[2],grade-top],source:'pdf-foundation-guides',basis:'explicit-foundation-and-finished-grade-guides',multipleLevels:tops.some(y=>top-y>3)};
 }
 function foundationElement(w,view,box,registration,frame,thicknessEvidence,candidate){
  let a=pointAt(w,frame,registration.u(box[0])),b=pointAt(w,frame,registration.u(box[0]+box[2]));
  const d=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...d);if(!(length>.01))return null;
  if((d[1]*w.normal[0]-d[0]*w.normal[1])<0)[a,b]=[b,a];
  const base=registration.z(box[1]+box[3]),height=box[3]*registration.sz;
  return {id:'foundation:'+w.id+':'+view.id+':'+sourceKey(box),type:'foundation',phase:'existing',status:'proposed',levelId:w.levelId,buildingId:w.buildingId,parentWallId:w.id,
   origin:[a[0],a[1],base],size:[length,thicknessEvidence.value,height],rotationDegrees:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI,surfaceOnly:thicknessEvidence.value===null,
   sourceViewId:view.id,sourceFrame:copy(view.frame),sourceBox:copy(box),color:'#b6b8af',quantityStatus:'partial-unreviewed',extentStatus:'visible-above-grade-only',belowGradeDepth:null,confirmationRequired:true,
   provenance:{...provenance(view,box,registration,'registered-visible-foundation-band'),foundationEvidence:copy(candidate),thickness:copy(thicknessEvidence),structuralVerification:false}};
 }
 function masonryZone(w,view,box,registration,frame,hatch,thicknessEvidence,labels){
  const a=pointAt(w,frame,registration.u(box[0])),b=pointAt(w,frame,registration.u(box[0]+box[2])),offsets=[M.distance(w.from,a),M.distance(w.from,b)].sort((a,b)=>a-b);
  const top=Math.max(0,w.base+w.height-registration.z(box[1])),height=Math.min(w.height-top,box[3]*registration.sz),width=Math.min(w.length,offsets[1])-offsets[0];
  if(!(width>.01&&height>.01))return null;
  const polygon=hatch.sourcePolygon?hatch.sourcePolygon.map(([x,y])=>[M.distance(w.from,pointAt(w,frame,registration.u(x))),w.base+w.height-registration.z(y)]):rect(offsets[0],top,width,height);
  if(M.validatePolygon(polygon).length||polygon.some(([x,y])=>x<0||y<0||x>w.length||y>w.height))return null;
  return {id:'masonry:'+w.id+':'+view.id+':'+sourceKey(box)+(hatch.sourcePolygon?':outline:'+sourceKey(hatch.sourcePolygon.flat()):''),wallId:w.id,levelId:w.levelId,buildingId:w.buildingId,kind:'masonry',polygon,
   selection:{pattern:hatch.sourcePolygon?'plain':'brick',color:'#ad9989'},appearanceStatus:'illustrative-masonry; product-and-colour-unselected',status:'proposed',sourceViewId:view.id,sourceFrame:copy(view.frame),sourceBox:copy(box),thickness:copy(thicknessEvidence),
   quantityStatus:'partial-unreviewed',confirmationRequired:true,provenance:{...provenance(view,box,registration,hatch.method),hatch:copy(hatch),materialLabels:labels.map(row=>({label:row.text,sourceViewId:view.id,sourceBox:copy(row.box),boxFormat:'xyxy'})),extentStatus:hatch.sourcePolygon?'observed-cell-union-only':'observed-courses-only',unseenArea:null}};
 }
 function generated(level){return level.reconstruction?.status==='automatic-proposal'&&!level.geometryRevision&&!(level.contours||[]).some(c=>c.status==='confirmed')&&!(level.observedPlanes||[]).some(p=>p.status==='confirmed');}
 function physicalDuplicates(result){
  const equal=(a,b)=>a.length===b.length&&a.every((n,i)=>Math.abs(n-b[i])<=.001),bounds=polygon=>[Math.min(...polygon.map(p=>p[0])),Math.min(...polygon.map(p=>p[1])),Math.max(...polygon.map(p=>p[0])),Math.max(...polygon.map(p=>p[1]))];
  const remember=(existing,item)=>{existing.provenance.alternateObservations||=[];existing.provenance.alternateObservations.push(copy(item.provenance));const a=existing.thickness||existing.provenance.thickness,b=item.thickness||item.provenance.thickness;
   if(a&&b&&(a.status==='conflict'||b.status==='conflict'||a.value!==null&&b.value!==null&&Math.abs(a.value-b.value)>.001)){
    const evidence={...copy(a),value:null,status:'conflict',kind:'conflicting-evidence',alternateEvidence:copy(b)};
    if(existing.type==='foundation'){existing.provenance.thickness=evidence;existing.size[1]=null;existing.surfaceOnly=true;result.issues.push('FOUNDATION_THICKNESS_CONFLICT');}else{existing.thickness=evidence;result.issues.push('MASONRY_THICKNESS_CONFLICT');}
   }
  };
  const zones=[];
  for(const zone of result.wallZones){const duplicate=zones.find(z=>z.wallId===zone.wallId&&equal(z.polygon.flat(),zone.polygon.flat()));if(duplicate)remember(duplicate,zone);else zones.push(zone);}
  // Different views of one wall must not silently paint contradictory overlapping extents.
  const conflicting=new Set();result.conflicts||=[];
  for(let i=0;i<zones.length;i++)for(let j=i+1;j<zones.length;j++){
   const a=zones[i],b=zones[j];if(a.wallId!==b.wallId||a.sourceViewId===b.sourceViewId)continue;
   const x=bounds(a.polygon),y=bounds(b.polygon),overlap=Math.max(0,Math.min(x[2],y[2])-Math.max(x[0],y[0]))*Math.max(0,Math.min(x[3],y[3])-Math.max(x[1],y[1]));
   if(overlap>.001){conflicting.add(a);conflicting.add(b);result.conflicts.push({type:'masonry',reason:'MASONRY_MULTIVIEW_EXTENT_CONFLICT',candidates:[copy(a),copy(b)]});}
  }
  result.wallZones=zones.filter(z=>!conflicting.has(z));if(conflicting.size)result.issues.push('MASONRY_MULTIVIEW_EXTENT_CONFLICT');
  const elements=[];
  for(const element of result.exteriorElements){const duplicate=elements.find(e=>e.type===element.type&&e.parentWallId===element.parentWallId&&equal(e.origin,element.origin)&&equal([e.size[0],e.size[2]],[element.size[0],element.size[2]])&&Math.abs(e.rotationDegrees-element.rotationDegrees)<.001);if(duplicate)remember(duplicate,element);else elements.push(element);}
  const conflicts=new Set();
  for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){
   const a=elements[i],b=elements[j];if(a.type!=='foundation'||b.type!=='foundation'||a.parentWallId!==b.parentWallId||a.sourceViewId===b.sourceViewId||Math.abs(a.rotationDegrees-b.rotationDegrees)>.001)continue;
   const angle=a.rotationDegrees*Math.PI/180,u=[Math.cos(angle),Math.sin(angle)],x=[dot(a.origin,u),a.origin[2],a.size[0],a.size[2]],y=[dot(b.origin,u),b.origin[2],b.size[0],b.size[2]];
   if(intersection(x,y)){conflicts.add(a);conflicts.add(b);result.conflicts.push({type:'foundation',reason:'FOUNDATION_MULTIVIEW_EXTENT_CONFLICT',candidates:[copy(a),copy(b)]});}
  }
  result.exteriorElements=elements.filter(e=>!conflicts.has(e));if(conflicts.size)result.issues.push('FOUNDATION_MULTIVIEW_EXTENT_CONFLICT');
 }
 // Retained low-level candidate helpers. A candidate alone never enters the
 // client model; entranceDetails additionally checks complete source profiles.
 // Detect a beam face only when two independent horizontal ink edges are
 // visible above the same two source-supported posts. A line weight is NOT
 // a physical section; the depth remains unknown until separately reviewed.
 function entryBeamFace(image,canopy,masks=[]){
  const guide=canopy?.beamLine;if(!image?.data||!validBox(guide)||canopy.columns?.length!==2||canopy.columns.some(c=>!(c.width>0)))return {status:'unresolved',reason:'ENTRY_BEAM_SECTION_UNRESOLVED'};
  const ink=V.structuralInk(image),w=image.width,h=image.height,[x,y,width,weight]=guide,first=Math.max(1,Math.round(x+width*.08)),last=Math.min(w-2,Math.round(x+width*.92)),n=Math.max(1,Math.ceil((last-first)/160));
  const row=at=>{let hits=0,total=0;for(let px=first;px<=last;px+=n){total++;let found=false;for(let delta=-1;delta<=1;delta++){const py=Math.round(at+delta);if(py>=0&&py<h&&ink[py*w+px])found=true;}hits+=Number(found);}return hits/(total||1);};
  const top=Math.round(y+weight*.5);if(row(top)<.73)return {status:'unresolved',reason:'ENTRY_BEAM_TOP_EDGE_UNRESOLVED'};
  const minGap=Math.max(6,Math.ceil(weight+3)),maxGap=Math.min(52,Math.floor(canopy.box[3]*.11));let bottom=null;
  for(let py=top+minGap;py<=top+maxGap&&py<h;py++){const test=[x,y,width,py-y];if(masks.some(mask=>intersection(test,mask)))continue;if(row(py)>.73){bottom=py;break;}}
  if(bottom===null)return {status:'unresolved',reason:'ENTRY_BEAM_SECTION_UNRESOLVED'};
  return {status:'proposed',box:[x,y,width,bottom-y],anchors:[[x,y],[x+width,bottom]],method:'two-supported-horizontal-beam-edges-between-posts',confirmationRequired:true};
 }
 // A secondary roof is proposed only when a continuous roof line is visible
 // in a second orthographic view; porch/beam edges alone are insufficient.
 function entryRoofStroke(image,xFront,xBack,yFront,masks=[]){
  if(!image?.data||![xFront,xBack,yFront].every(finite)||Math.abs(xBack-xFront)<20)return {status:'unresolved',reason:'ENTRY_ROOF_SIDE_PROFILE_UNRESOLVED'};
  const ink=V.structuralInk(image),w=image.width,h=image.height,span=Math.abs(xBack-xFront),count=Math.max(18,Math.ceil(span/3)),rise=Math.min(72,Math.floor(span*.75));let best=null;
  for(let offset=-4;offset<=4;offset+=2)for(let delta=-rise;delta<=rise;delta+=2){let hits=0,first=0,last=0,blocked=0;
   for(let i=0;i<=count;i++){const t=i/count,x=Math.round(xFront+(xBack-xFront)*t),y=Math.round(yFront+offset+delta*t);if(x<1||x>=w-1||y<2||y>=h-2){blocked++;continue;}if(masks.some(b=>validBox(b)&&x>=b[0]-2&&x<=b[0]+b[2]+2&&y>=b[1]-2&&y<=b[1]+b[3]+2)){blocked++;continue;}let found=false;for(let dy=-2;dy<=2&&!found;dy++)for(let dx=-1;dx<=1;dx++)if(ink[(y+dy)*w+x+dx]){found=true;break;}hits+=Number(found);if(i<count*.18)first+=Number(found);if(i>count*.82)last+=Number(found);
   }
   const score=hits/(count+1);if(blocked||score<.77||first/Math.max(1,Math.ceil(count*.18))<.64||last/Math.max(1,Math.ceil(count*.18))<.64)continue;
   const rank=score-Math.abs(offset)*.002-Math.abs(delta)*.00005;if(!best||rank>best.rank)best={status:'proposed',anchors:[[xFront,yFront+offset],[xBack,yFront+offset+delta]],support:score,rank,method:'continuous-side-roof-stroke-with-front-height-cross-check',confirmationRequired:true};
  }
  return best||{status:'unresolved',reason:'ENTRY_ROOF_SIDE_PROFILE_UNRESOLVED'};
 }
 function entranceDetails({proposal,inventory,images,front,source,fr,canopy,sideCandidates,columns,owners,byLevel,hints,frontMasks}){
  const report=byLevel.find(r=>r.levelId===columns[0]?.levelId);
  if(!report||!columns.length||columns.some(column=>column.parentWallId!==columns[0].parentWallId)){
   for(const item of byLevel)item.issues.push('ENTRY_ASSEMBLY_SUPPORT_UNRESOLVED');return;
  }
  // A source annotation can hide one post without hiding the roof above it.
  // Keep that support unresolved while retaining independently observed roof
  // profiles; never complete the missing post by symmetry or by its neighbour.
  if(columns.length<2)report.issues.push('ENTRY_ASSEMBLY_SUPPORT_PARTIAL');
  const wall=owners.find(o=>o.wall.id===columns[0].parentWallId).wall,wallY=wall.from[1],levelId=columns[0].levelId;
  const blockers=(xs,ys,zs)=>owners.filter(({wall:other})=>other.id!==wall.id&&other.from[1]<ys[1]-.001&&
   Math.min(xs[1],Math.max(other.from[0],other.to[0]))-Math.max(xs[0],Math.min(other.from[0],other.to[0]))>.001&&
   Math.min(zs[1],other.base+other.height)-Math.max(zs[0],other.base)>.001).map(o=>o.wall.id);
  const id='entry:'+wall.id+':'+source.id+':'+sourceKey(canopy.beamLine),assembly={version:1,id,frontViewId:source.id,sideViewIds:sideCandidates.map(s=>s.source.id),parentWallId:wall.id,supportStatus:columns.length===2?'observed-proposed':'partial-unresolved'};
  const sourceFor=(s,box,method)=>provenance(s.source,box,s.registration,method),frontSpan=[canopy.columns[0].x,canopy.columns[1].x+canopy.columns[1].width];
  const frontBands=V.entryBands(images[front.viewId],{left:frontSpan[0],right:frontSpan[1],nearY:canopy.box[1],height:canopy.box[3],occlusions:frontMasks});
  const sides=sideCandidates.map(side=>{
   const sign=frames[side.direction].u[1],wallX=side.registration.pixelU(sign*wallY),postX=side.direction==='right'?side.box[0]:side.box[0]+side.box[2];
   const bands=V.entryBands(images[side.source.id],{left:Math.min(postX,wallX),right:Math.max(postX,wallX),nearY:side.box[1],height:side.box[3],occlusions:side.masks});
   return {...side,sign,wallX,bands};
  });
  const beamLabel=hints.some(row=>/\b(?:poutres?|beams?)\b/.test(normal(row.text))),matches=[];
  if(beamLabel)for(const band of frontBands){
   const top=fr.z(band.box[1]),base=fr.z(band.box[1]+band.box[3]),tolerance=Math.max(.035,fr.sz*2),matched=[];let conflict=false;
   for(const side of sides){
    const compatible=side.bands.filter(b=>Math.abs(side.registration.z(b.box[1])-top)<=Math.max(tolerance,side.registration.sz*2)&&Math.abs(side.registration.z(b.box[1]+b.box[3])-base)<=Math.max(tolerance,side.registration.sz*2));
    if(!compatible.length){if(side.bands.length)conflict=true;continue;}
    const chosen=compatible[0],ys=[side.registration.u(chosen.box[0])*side.sign,side.registration.u(chosen.box[0]+chosen.box[2])*side.sign].sort((a,b)=>a-b);
    if(Math.abs(ys[1]-wallY)>.05||ys[0]>=wallY-.05){conflict=true;continue;}
    matched.push({...side,band:chosen,ys});
   }
   if(matched.length&&!conflict)matches.push({band,top,base,sides:matched});
  }
  const beam=matches[0];
  if(beam){
   const xs=[fr.u(beam.band.box[0]),fr.u(beam.band.box[0]+beam.band.box[2])],position=beam.sides[0].ys[0],tolerance=Math.max(.035,...beam.sides.map(s=>s.registration.sx*2));
   const hiddenBy=blockers(xs,[position,wallY],[beam.base,beam.top]);
   if(hiddenBy.length){report.issues.push('ENTRY_BEAM_HIDDEN_BY_NEARER_VOLUME');report.conflicts||=[];report.conflicts.push({type:'beam',reason:'ENTRY_BEAM_HIDDEN_BY_NEARER_VOLUME',entryAssemblyId:id,occludingWallIds:hiddenBy});}
   else if(beam.sides.some(s=>Math.abs(s.ys[0]-position)>tolerance))report.issues.push('ENTRY_BEAM_DEPTH_CONFLICT');
   else {
    const frontEvidence=provenance(source,beam.band.box,fr,beam.band.method),observations=[frontEvidence,...beam.sides.map(s=>sourceFor(s,s.band.box,s.band.method))];
    const element=(part,origin,width,rotation,primary,box)=>({id:id+':beam:'+part,type:'beam',phase:'existing',status:'proposed',levelId,buildingId:proposal.buildingId,parentWallId:wall.id,entryAssembly:{...copy(assembly),part},
     origin,size:[width,null,beam.top-beam.base],rotationDegrees:rotation,surfaceOnly:true,sourceViewId:primary.id,sourceFrame:copy(primary.frame),sourceBox:copy(box),color:'#a6aca3',supportMaterial:'unknown',quantityStatus:'partial-unknown-section',confirmationRequired:true,
     provenance:{...provenance(primary,box,primary.id===source.id?fr:beam.sides.find(s=>s.source.id===primary.id).registration,'two-view-observed-beam-face'),sources:copy(observations),sourceViewIds:observations.map(s=>s.sourceViewId),sectionDepth:{value:null,kind:'unknown',status:'unresolved'},extentStatus:'visible-faces-only',structuralVerification:false,sectionStatus:'unknown',supportLabels:hints.map(row=>({label:row.text,sourceViewId:source.id,sourceBox:copy(row.box)}))}});
    // The lateral band is the visible return, never the section of the front
    // beam. Only observed faces are generated; the hidden section stays null.
    const created=[element('front',[xs[0],position,beam.base],xs[1]-xs[0],0,source,beam.band.box)];
    for(const side of beam.sides){const right=side.direction==='right';created.push(element(side.direction,[right?xs[1]:xs[0],right?side.ys[0]:wallY,beam.base],wallY-side.ys[0],right?90:-90,side.source,side.band.box));}
    report.exteriorElements.push(...created);report.issues.push('ENTRY_BEAM_SECTION_DEPTH_UNRESOLVED');
    for(const column of columns){const height=beam.base-column.origin[2],oldTop=column.origin[2]+column.size[2];if(height>0&&oldTop>=beam.base-tolerance&&oldTop<=beam.top+tolerance){column.size[2]=height;column.sourceBox[1]=fr.pixelZ(beam.base);column.sourceBox[3]=fr.pixelZ(column.origin[2])-column.sourceBox[1];column.provenance={...column.provenance,...provenance(source,column.sourceBox,fr,'two-view-column-edges-and-observed-beam-underside'),topEvidence:copy(frontEvidence)};}}
   }
  }else report.issues.push(frontBands.length&&sides.some(s=>s.bands.length)?'ENTRY_BEAM_LEVEL_CONFLICT':'ENTRY_BEAM_SECTION_UNRESOLVED');

  // The canopy has its own observed eaves, independent of the post footprint.
  const [bx,by,bw]=canopy.beamLine,profile=V.roofProfile(images[front.viewId],{...front.envelope,box:[bx,by,bw,canopy.box[3]],occlusions:frontMasks},R.readings(source),{entry:true});
  if(profile.status!=='proposed'){report.issues.push('ENTRY_ROOF_GEOMETRY_UNRESOLVED');return;}
  const [a,b]=profile.slopes,frontPoints=[[a.eaveX,a.eaveY],[a.highX,profile.points[1][1]],[b.highX,profile.points[2][1]],[b.eaveX,b.eaveY]].filter((p,i,points)=>!i||p[0]-points[i-1][0]>.5);
  if(frontPoints.length<3||frontPoints.some((p,i)=>!p.every(finite)||i&&p[0]<=frontPoints[i-1][0])){report.issues.push('ENTRY_ROOF_GEOMETRY_UNRESOLVED');return;}
  const bounds=[Math.min(...frontPoints.map(p=>p[0])),Math.min(...frontPoints.map(p=>p[1])),Math.max(...frontPoints.map(p=>p[0]))-Math.min(...frontPoints.map(p=>p[0])),Math.max(...frontPoints.map(p=>p[1]))-Math.min(...frontPoints.map(p=>p[1]))];
  if(frontMasks.some(mask=>intersection(bounds,mask))){report.issues.push('ENTRY_ROOF_SOURCE_OCCLUDED');return;}
  const xProfile=frontPoints.map(([x,y])=>[fr.u(x),fr.z(y)]),eaveZ=xProfile[0][1],crestZ=Math.max(...xProfile.map(p=>p[1])),tol=Math.max(.04,fr.sz*3);
  if(Math.abs(xProfile.at(-1)[1]-eaveZ)>tol||crestZ-eaveZ<.08||xProfile[0][0]>fr.u(frontSpan[0])||xProfile.at(-1)[0]<fr.u(frontSpan[1])){report.issues.push('ENTRY_ROOF_FRONT_PROFILE_CONFLICT');return;}
  const profiles=[];
  for(const side of sides){
   const raw=V.entrySideRoof(images[side.source.id],{wallX:side.wallX,postBox:side.box,eaveY:side.registration.pixelZ(eaveZ),crestY:side.registration.pixelZ(crestZ),direction:side.direction,tolerance:Math.max(5,tol/side.registration.sz),occlusions:side.masks});
   if(raw.status!=='proposed'){report.issues.push(raw.reason);continue;}
   const points=raw.points.map(([x,y])=>[side.sign*side.registration.u(x),side.registration.z(y)]).sort((a,b)=>a[0]-b[0]),tolerance=Math.max(tol,side.registration.sz*3);
   if(Math.abs(points[0][1]-eaveZ)>tolerance||Math.abs(points.at(-1)[1]-crestZ)>tolerance||Math.abs(points.at(-1)[0]-wallY)>.04){report.issues.push('ENTRY_ROOF_HEIGHT_CONFLICT');continue;}
   profiles.push({side,raw,points,residual:Math.max(Math.abs(points[0][1]-eaveZ),Math.abs(points.at(-1)[1]-crestZ))});
  }
  // If a second observed side cannot support the same assembly, do not hide
  // that discrepancy by silently choosing the first one.
  if(!profiles.length||profiles.length!==sides.length){report.issues.push('ENTRY_ROOF_GEOMETRY_UNRESOLVED');return;}
  const chosen=profiles[0];
  if(profiles.some(p=>Math.abs(p.points[0][0]-chosen.points[0][0])>Math.max(.05,p.side.registration.sx*3)||Math.abs(p.points[0][1]-chosen.points[0][1])>tol)){report.issues.push('ENTRY_ROOF_DEPTH_CONFLICT');return;}
  const hiddenBy=blockers([xProfile[0][0],xProfile.at(-1)[0]],[chosen.points[0][0],wallY],[eaveZ,crestZ]);
  if(hiddenBy.length){report.issues.push('ENTRY_ROOF_HIDDEN_BY_NEARER_VOLUME');report.conflicts||=[];report.conflicts.push({type:'roof',reason:'ENTRY_ROOF_HIDDEN_BY_NEARER_VOLUME',entryAssemblyId:id,occludingWallIds:hiddenBy});return;}
  const sourceRecord=(view,anchors,registration,axis)=>({axis,sourceViewId:view.id,sourceFrame:copy(view.frame),anchors:copy(anchors),scaleX:registration.sx,scaleY:registration.sz,kind:'estimated-calibrated',status:'proposed',referenceGuide:copy(registration.guide)});
  report.reconstructedRoofs.push({version:1,id:id+':roof',levelId,buildingId:proposal.buildingId,status:'proposed',kind:'estimated-calibrated',sourceCategory:'pdf-entry-assembly',entryAssembly:copy(assembly),
   profiles:{x:xProfile,y:chosen.points},sources:[sourceRecord(source,frontPoints,fr,'x'),...profiles.map(p=>sourceRecord(p.side.source,p.raw.points,p.side.registration,'y'))],
   connection:{kind:'observed-entry-roof-at-wall',parentWallId:wall.id,wallY,orthogonalHeightResiduals:profiles.map(p=>({sourceViewId:p.side.source.id,residual:p.residual})),frontAndSidePitches:'independent-source-profiles'},
   complete:false,confirmationRequired:true,quantityStatus:'partial-unreviewed',thickness:null,soffitStatus:'unresolved',note:'Observed entrance roof surface; hidden section, underside and structural assembly remain unknown.'});
  report.issues.push('ENTRY_ROOF_UNDERSIDE_UNRESOLVED');
 }
 function canopyColumns(proposal,inventory,images,reviewed,targets,byLevel){
  const views=(proposal.views||[]).filter(info=>info.envelope?.status==='proposed'&&inventory.views.some(v=>v.id===info.viewId&&v.buildingId===proposal.buildingId&&v.kind==='elevation'&&v.direction===info.direction)&&images?.[info.viewId]?.data),front=views.find(v=>v.direction==='front');
  if(!front)return;
  const source=inventory.views.find(v=>v.id===front.viewId),hints=R.readings(source).filter(row=>(row.source==='pdf-text'||row.confidence>=40)&&/\b(?:colonnes?|poteaux?|posts?|columns?|poutres?|beams?)\b/.test(normal(row.text))&&!/\b(?:sans|aucun[e]?|no|without)\s+(?:de\s+)?(?:colonnes?|poteaux?|posts?|columns?|poutres?|beams?)\b/.test(normal(row.text)));
  if(!hints.length)return;
  const fr=R.elevationRegistration(front,reviewed,inventory);
  if(!fr||![fr.sx,fr.sz].every(n=>finite(n)&&n>0))return;
  const canopy=V.canopyEnvelope(images[front.viewId],front.envelope,fr.guide.y);
  if(canopy.status!=='proposed')return;
  const frontMasks=sourceMasks(front,source,images[front.viewId]);
  const owners=targets.flatMap(level=>M.wallsFor(level,inventory,{includeProposed:true}).filter(w=>w.normal[1]<-.999).map(wall=>({level,wall}))),ownerFor=(column,depth=null)=>{
   const center=fr.u(column.x+column.width/2),base=fr.z(column.bottom),top=fr.z(canopy.box[1]);
   // A post can start on an observed raised landing. Its base remains the
   // elevation reading; ownership only requires the whole vertical span to
   // belong to the parent wall, rather than snapping it to the foundation.
   return owners.filter(o=>{const tolerance=Math.max(.08,o.wall.height*.05);return center>=Math.min(o.wall.from[0],o.wall.to[0])&&center<=Math.max(o.wall.from[0],o.wall.to[0])&&base>=o.wall.base-tolerance&&top<=o.wall.base+o.wall.height+tolerance&&top>base&&(!depth||o.wall.from[1]>=depth[1]-.001);}).sort((a,b)=>a.wall.from[1]-b.wall.from[1])[0];
  };
  const possibleOwner=canopy.columns.map(column=>ownerFor(column)).find(Boolean);if(!possibleOwner)return;
  const report=byLevel.find(r=>r.levelId===possibleOwner.level.id),sideCandidates=[],sideConflicts=[];
  const visibleFrontPosts=canopy.columns.filter(column=>{const box=[column.x,canopy.box[1],column.width,column.bottom-canopy.box[1]];return validBox(box)&&!frontMasks.some(mask=>intersection(box,mask));});
  if(!visibleFrontPosts.length){report.issues.push('COLUMN_DEPTH_UNRESOLVED');return;}
  // Both side views may support a depth. A disagreement is kept unresolved.
  for(const side of views.filter(v=>['left','right'].includes(v.direction))){
   const sr=R.elevationRegistration(side,reviewed,inventory);if(!sr||![sr.sx,sr.sz].every(n=>finite(n)&&n>0))continue;
   const targetY=sr.pixelZ(fr.z(canopy.box[1])),sidePost=V.canopySide(images[side.viewId],side.envelope,targetY,{direction:side.direction});
   if(sidePost.status!=='proposed')continue;
   const sideSource=inventory.views.find(v=>v.id===side.viewId),masks=sourceMasks(side,sideSource,images[side.viewId]);
   if(masks.some(mask=>intersection(sidePost.box,mask))){report.issues.push('COLUMN_SOURCE_OCCLUDED');continue;}
   const sign=frames[side.direction].u[1],ys=[sr.u(sidePost.box[0])*sign,sr.u(sidePost.box[0]+sidePost.box[2])*sign].sort((a,b)=>a-b),base=sr.z(sidePost.box[1]+sidePost.box[3]),top=sr.z(sidePost.box[1]);
   const frontTop=fr.z(canopy.box[1]);
   // A truncated post ends at the annotation, not at the entrance landing.
   // Compare the side against independently visible front feet only.
   const consistent=visibleFrontPosts.some(column=>{const frontBase=fr.z(column.bottom),tolerance=Math.max(.05,(frontTop-frontBase)*.04);return Math.abs(base-frontBase)<=tolerance&&Math.abs(top-frontTop)<=tolerance;});
   if(!consistent){
    report.issues.push('COLUMN_LEVEL_CONFLICT');
    sideConflicts.push({type:'column',reason:'COLUMN_LEVEL_CONFLICT',status:'conflict',sourceViewId:sideSource.id,sourceFrame:copy(sideSource.frame),sourceBox:copy(sidePost.box),
     observation:{base,top,provenance:provenance(sideSource,sidePost.box,sr,sidePost.method)},
     frontObservations:visibleFrontPosts.map(column=>({base:fr.z(column.bottom),top:frontTop,provenance:provenance(source,[column.x,canopy.box[1],column.width,column.bottom-canopy.box[1]],fr,'visible-front-post-edges')}))});
    continue;
   }
   sideCandidates.push({source:sideSource,box:sidePost.box,registration:sr,ys,base,top,method:sidePost.method,direction:side.direction,masks});
  }
  // A missing or masked view supplies no contradictory measurement. An
  // observed conflicting side does: retain it and stop the dependent
  // assembly instead of silently taking the other side's depth/level.
  if(sideConflicts.length){report.conflicts||=[];report.conflicts.push(...sideConflicts);return;}
  if(!sideCandidates.length){report.issues.push('COLUMN_DEPTH_UNRESOLVED');return;}
  const side=sideCandidates[0];
  if(sideCandidates.some(other=>Math.abs(other.ys[0]-side.ys[0])>.05||Math.abs(other.ys[1]-side.ys[1])>.05)){report.issues.push('COLUMN_DEPTH_CONFLICT');return;}
  const accepted=[];
  for(const column of canopy.columns){
   if(!(column.width>0)){report.issues.push('COLUMN_SECTION_UNRESOLVED');continue;}
   const owner=ownerFor(column,side.ys);if(!owner){report.issues.push('COLUMN_OWNER_DEPTH_CONFLICT');continue;}
   const result=byLevel.find(r=>r.levelId===owner.level.id),box=[column.x,canopy.box[1],column.width,column.bottom-canopy.box[1]];
   if(!validBox(box)||frontMasks.some(mask=>intersection(box,mask))){result.issues.push('COLUMN_SOURCE_OCCLUDED');continue;}
   const element={id:'column:'+owner.wall.id+':'+source.id+':'+sourceKey(box),type:'column',phase:'existing',status:'proposed',levelId:owner.level.id,buildingId:proposal.buildingId,parentWallId:owner.wall.id,
    origin:[fr.u(column.x),side.ys[0],fr.z(column.bottom)],size:[column.width*fr.sx,side.ys[1]-side.ys[0],box[3]*fr.sz],rotationDegrees:0,sourceViewId:source.id,sourceFrame:copy(source.frame),sourceBox:box,
    color:'#a6aca3',supportMaterial:'unknown',quantityStatus:'partial-unreviewed',confirmationRequired:true,
    provenance:{...provenance(source,box,fr,'two-view-column-edges-and-compatible-levels'),depth:{value:side.ys[1]-side.ys[0],unit:'m',kind:'estimated-calibrated',status:'proposed',...provenance(side.source,side.box,side.registration,side.method)},
     alternateDepthObservations:sideCandidates.slice(1).map(c=>provenance(c.source,c.box,c.registration,c.method)),sourceViewIds:[source.id,...sideCandidates.map(c=>c.source.id)],
     supportLabels:hints.map(row=>({label:row.text,sourceViewId:source.id,sourceBox:copy(row.box)})),structuralVerification:false}};
   if(!element.size.every(n=>finite(n)&&n>0)||!element.origin.every(finite))continue;
   // A front projection cannot establish a visible post behind a nearer opaque
   // volume. Test the complete section, including partial overlap at its edge,
   // after its side-view depth is known and before attaching it to a wall.
   const blockers=owners.filter(({wall})=>wall.from[1]<side.ys[1]-.001&&
    Math.min(element.origin[0]+element.size[0],Math.max(wall.from[0],wall.to[0]))-Math.max(element.origin[0],Math.min(wall.from[0],wall.to[0]))>.001&&
    Math.min(element.origin[2]+element.size[2],wall.base+wall.height)-Math.max(element.origin[2],wall.base)>.001);
   if(blockers.length){
    const reason=blockers.some(o=>o.wall.from[1]<side.ys[0]+.001)?'COLUMN_HIDDEN_BY_NEARER_VOLUME':'COLUMN_WALL_INTERSECTION';
    result.issues.push(reason);result.conflicts||=[];result.conflicts.push({type:'column',reason,candidates:[copy(element)],occludingWallIds:blockers.map(o=>o.wall.id)});continue;
   }
   result.exteriorElements.push(element);accepted.push(element);
  }
  entranceDetails({proposal,inventory,images,front,source,fr,canopy,sideCandidates,columns:accepted,owners,byLevel,hints,frontMasks});
  report.issues.push('BALCONY_SLAB_EXTENT_UNRESOLVED');
 }
 function build(proposal,inventory,images,reviewed,generatedLevels=[],options={}){
  const byLevel=[],issues=[],stoneByView=new Map();
  const targets=generatedLevels.filter(l=>l.buildingId===proposal.buildingId&&generated(l));
  const context=(options.occlusionLevels||targets).filter(l=>l.buildingId===proposal.buildingId),allWalls=context.flatMap(l=>M.wallsFor(l,inventory,{includeProposed:true}));
  for(const level of targets){
   const result={levelId:level.id,exteriorElements:[],reconstructedRoofs:[],wallZones:[],issues:[]};byLevel.push(result);
   const walls=M.wallsFor(level,inventory,{includeProposed:true});
   for(const info of proposal.views||[]){
    const view=inventory.views.find(v=>v.id===info.viewId),frame=frames[info.direction],image=images?.[info.viewId];
    if(!view||view.kind!=='elevation'||view.buildingId!==proposal.buildingId||view.direction!==info.direction||!frame||!image?.data||info.envelope?.status!=='proposed')continue;
    const sourceSize=[view.payload?.sourceWidth||view.frame?.rasterSize?.[0],view.payload?.sourceHeight||view.frame?.rasterSize?.[1]];
    if(sourceSize.some((n,i)=>n!=null&&n!==[image.width,image.height][i])){result.issues.push('EXTERIOR_SOURCE_FRAME_MISMATCH');continue;}
    const registration=R.elevationRegistration(info,reviewed,inventory);
    if(!registration||![registration.sx,registration.sz].every(n=>finite(n)&&n>0)){result.issues.push('EXTERIOR_REGISTRATION_UNRESOLVED');continue;}
    if(options.wallZonesOnly&&(!registration.levelBand||registration.levelBand.levelId!==level.id||registration.levelBand.sourceViewId!==view.id)){result.issues.push('EXTERIOR_LEVEL_BAND_UNRESOLVED');continue;}
    const masks=sourceMasks(info,view,image),labels=materialLabels(view);
    if(labels.length&&!stoneByView.has(view.id)){
     const openings=context.flatMap(l=>M.wallsFor(l,inventory,{includeProposed:true}).filter(w=>dot(w.normal,frame.n)>.999).flatMap(w=>projectedOpeningBoxes(w,l,registration,frame)));
     stoneByView.set(view.id,irregularMasonry(image,info.envelope.box,R.readings(view),{masks:[...masks,...openings]}));
    }
    for(const wall of walls.filter(w=>dot(w.normal,frame.n)>.999)){
     const wb=wallBox(wall,registration,frame);if(!validBox(wb))continue;
     const openings=projectedOpeningBoxes(wall,level,registration,frame),nearer=nearerWallBoxes(wall,allWalls,registration,frame),blocked=[...masks,...openings,...nearer];
     const intersected=masks.some(mask=>intersection(wb,mask));
     if(intersected)result.issues.push('EXTERIOR_SOURCE_OCCLUDED');
     if(nearer.some(mask=>intersection(wb,mask)))result.issues.push('EXTERIOR_HIDDEN_BY_NEARER_VOLUME');
     const observed=[];
     if(labels.length){
      const thick=thickness(view,'masonry',true);
      if(thick.status==='conflict')result.issues.push('MASONRY_THICKNESS_CONFLICT');
      for(const part of subtractBoxes(wb,blocked))for(const hatch of masonryHatches(image,part)){
       const box=intersection(hatch.box,wb);if(!box)continue;
       const zone=masonryZone(wall,view,box,registration,frame,hatch,thick,labels);if(zone)observed.push(zone);
      }
      const stone=stoneByView.get(view.id),regularZones=observed.slice();if(stone?.reason==='MASONRY_REGION_COMPLEXITY')result.issues.push(stone.reason);
      for(const cluster of stone?.candidates||[]){
       const raster=cluster.raster,traced=stonePolygons(raster.mask,raster.width,raster.height,raster.origin,{box:wb,masks:blocked});
       if(traced.status!=='observed'){result.issues.push(traced.reason);continue;}
       for(const polygon of traced.polygons){
        const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),box=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
        // Existing regular-course evidence owns its pixels already. A second
        // detector never adds another overlapping material deduction.
        if(regularZones.some(z=>intersection(z.sourceBox,box)))continue;
        const hatch={method:cluster.method,sourcePolygon:polygon,leaders:copy(cluster.leaders),normalization:copy(cluster.normalization),cellCount:cluster.cells.length,sourceCellBounds:cluster.cells.filter(c=>intersection(c.box,box)).map(c=>copy(c.box)),sourceExtent:cluster.sourceExtent,confirmationRequired:true};
        const zone=masonryZone(wall,view,box,registration,frame,hatch,thick,labels);if(zone)observed.push(zone);
       }
      }
      if(observed.length>80){observed.splice(regularZones.length);result.issues.push('MASONRY_REGION_COMPLEXITY');}
      if(!observed.length)result.issues.push('MASONRY_EXTENT_UNRESOLVED');
     }
     if(options.wallZonesOnly)for(const zone of observed)zone.provenance.levelBand={...copy(registration.levelBand),contourId:reviewed.contourId,floorSourceViewId:reviewed.sourceViewId,base:copy(reviewed.base),alignment:copy(reviewed.alignment)};
     result.wallZones.push(...observed);
     if(options.wallZonesOnly)continue;
     const foundation=foundationCandidate(view,info,registration,wall,image);
     if(!foundation){if(wall.base===Math.min(...walls.filter(w=>dot(w.normal,frame.n)>.999).map(w=>w.base)))result.issues.push('FOUNDATION_VISIBLE_BAND_UNRESOLVED');continue;}
     const expected=registration.pixelZ(wall.base),difference=Math.abs(foundation.box[1]-expected);
     if(difference>Math.max(4,wb[3]*.06))continue; // A foundation belongs to the wall that reaches its top datum.
     const withinWall=intersection(foundation.box,[wb[0],foundation.box[1],wb[2],foundation.box[3]]),crop=withinWall&&intersection(withinWall,[0,0,image.width,image.height]);if(!crop)continue;
     const thick=thickness(view,'foundation',observed.length>0);
     if(thick.status==='conflict')result.issues.push('FOUNDATION_THICKNESS_CONFLICT');
     if(thick.conditionStatus==='unverified')result.issues.push('FOUNDATION_MASONRY_CONDITION_UNVERIFIED');
     if(masks.some(mask=>intersection(crop,mask)))result.issues.push('FOUNDATION_SOURCE_OCCLUDED');
     const foundationBlocked=[...masks,...openings,...nearerWallBoxes(wall,allWalls,registration,frame,{foundationBottom:crop[1]+crop[3]})];
     for(const part of subtractBoxes(crop,foundationBlocked)){
      const element=foundationElement(wall,view,part,registration,frame,thick,foundation);if(element)result.exteriorElements.push(element);
     }
    }
   }
  }
  if(!options.wallZonesOnly)canopyColumns(proposal,inventory,images,reviewed,targets,byLevel);
  const flat=!options.wallZonesOnly&&FlatRoofs?.build(proposal,inventory,images,reviewed,targets);
  for(const detail of flat?.byLevel||[]){const target=byLevel.find(l=>l.levelId===detail.levelId);if(!target)throw Error('FLAT_ENTRY_LEVEL_MISMATCH');target.reconstructedRoofs.push(...detail.reconstructedRoofs);target.exteriorElements.push(...detail.exteriorElements);target.issues.push(...detail.issues);}
  issues.push(...(flat?.issues||[]));
  for(const result of byLevel){physicalDuplicates(result);result.roofProposals=result.reconstructedRoofs;result.issues=[...new Set(result.issues)];issues.push(...result.issues);}
  return {version:1,byLevel,issues:[...new Set(issues)],complete:false,status:byLevel.some(l=>l.exteriorElements.length||l.wallZones.length||l.reconstructedRoofs.length)?'partial-proposal':'unresolved'};
 }
 // Multi-level cladding consumes the registered contours, never a whole-house
 // height copied onto each storey. Assemblies need their own level/depth match
 // and deliberately do not enter this path. Call before the first save only.
 function buildRegisteredWallZones(inventory,buildingId,images,generatedLevels=[]){
  const byLevel=[],eligible=[],issues=[],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),known=inventory.levels.filter(l=>l.buildingId===buildingId);
  const source=(id,kind)=>inventory.views.find(v=>v.id===id&&v.buildingId===buildingId&&(!kind||v.kind===kind));
  for(const level of generatedLevels.filter(l=>l.buildingId===buildingId)){
   const result={levelId:level.id,exteriorElements:[],reconstructedRoofs:[],wallZones:[],issues:[]};byLevel.push(result);
   if(level.geometryRevision||level.wallZones?.length||Object.keys(level.wallFinishes||{}).length||(level.contours||[]).some(c=>c.status==='confirmed')){result.issues.push('EXTERIOR_EXISTING_LEVEL_PRESERVED');continue;}
   if(!generated(level)){result.issues.push('EXTERIOR_LEVEL_REGISTRATION_UNRESOLVED');continue;}
   const contour=level.contours?.length===1&&level.contours[0],proposal=level.reconstruction?.proposal,reg=contour?.levelRegistration,a=contour?.alignment,b=contour?.base;
   const original=known.find(l=>l.id===level.id),floor=contour&&source(contour.sourceViewId,'floor'),reference=source(reg?.xy?.referenceSourceViewId,'floor');
   const valid=original?.sourceLevel===level.sourceLevel&&floor?.levelId===level.sourceLevel&&reference&&reg?.status==='proposed'&&reg.sourceLevel===level.sourceLevel&&reg.xy?.status==='proposed'&&reg.z?.status==='proposed'&&
    reg.xy.sourceViewId===contour.sourceViewId&&a?.sourceViewId===contour.sourceViewId&&a.referenceSourceViewId===reference.id&&a.kind==='source-labelled-grid-registration'&&
    same(a,reg.alignment)&&same(a,reg.xy.alignment)&&same(b,reg.base)&&same(b,reg.z.base)&&finite(reg.xy.scaleUsed)&&Math.abs(reg.xy.scaleUsed-M.scale(contour))<1e-9&&
    known.some(l=>l.id===b.referenceLevelId)&&b.references?.length&&b.references.every(r=>source(r.sourceViewId,'elevation')&&same(r.sourceFrame,source(r.sourceViewId).frame))&&
    proposal?.levelId===level.id&&proposal.buildingId===buildingId&&proposal.draft&&['points','reference','height','base','alignment'].every(key=>same(proposal.draft[key],contour[key]))&&
    !M.validateDraft(contour,inventory,level).length;
   if(!valid){result.issues.push('EXTERIOR_LEVEL_REGISTRATION_UNRESOLVED');continue;}
   eligible.push({level,contour,proposal,result,frame:[reference.id,b.referenceLevelId].join('|')});
  }
  // Never project a wall from an unrelated XY/Z origin as an occluder. A
  // disagreement keeps every affected source region unresolved, not blended.
  if(new Set(eligible.map(e=>e.frame)).size>1)for(const e of eligible)e.result.issues.push('EXTERIOR_LEVEL_FRAME_CONFLICT');
  else for(const e of eligible){
   const output=build(e.proposal,inventory,images,e.contour,[e.level],{wallZonesOnly:true,occlusionLevels:eligible.map(item=>item.level)}),detail=output.byLevel.find(l=>l.levelId===e.level.id);
   if(detail)Object.assign(e.result,detail);
  }
  for(const result of byLevel)issues.push(...result.issues);
  return {version:1,byLevel,issues:[...new Set(issues)],complete:false,status:byLevel.some(l=>l.wallZones.length)?'partial-proposal':'unresolved'};
 }
 return Object.freeze({version:1,build,buildRegisteredWallZones,entryBeamFace,entryRoofStroke,subtractBoxes,masonryHatches,irregularMasonry,stonePolygons,materialLabels,writtenThickness,thickness});
});
