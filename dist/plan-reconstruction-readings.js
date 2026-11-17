/* Targeted local OCR retries keep the first readings and every source region. */
(function(root){
 'use strict';const BASE=new URL('.',document.currentScript.src),asset=p=>new URL(p,BASE).href;
 async function dependencies(){if(root.Tesseract)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=asset('vendor/tesseract/tesseract.min.js');s.onload=resolve;s.onerror=()=>reject(Error('Lecture locale indisponible.'));document.head.append(s);});}
 function fragmentedCaptions(view){
  if(!['elevation','section'].includes(view.kind))return [];
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),rows=(view.payload.drawingReadings?.rows||[]).filter(r=>r.box?.length===4&&r.box.every(Number.isFinite)&&r.box[2]>r.box[0]&&r.box[3]>r.box[1]&&r.box[0]<view.payload.sourceWidth*.81&&String(r.text||'').length<=60),unique=[];
  for(const row of rows)if(!unique.some(r=>r.text===row.text&&r.box.every((n,i)=>Math.abs(n-row.box[i])<1)))unique.push(row);
  const result=[],caption=text=>{const clean=normalize(text),compact=clean.replace(/[^a-z0-9]/g,'');return !/\b(?:note|index|sommaire|contents|legend|legende|table|schedule)\b/.test(clean)&&/^(?:pla(?:n?c?)?her|plafond|floor|ceiling|dalle|slab)/.test(compact)&&/(?:etage?|upper|ground|niveau|level|niv\d|rdc|rez|first|second|1st|2nd)/.test(compact);};
  for(const seed of unique){if(!/^(?:pla(?:n(?:c(?:h(?:e(?:r)?)?)?)?)?|plaf(?:o(?:n(?:d)?)?)?|fl(?:o(?:o(?:r)?)?)?|cei(?:l(?:i(?:n(?:g)?)?)?)?|dal(?:l(?:e)?)?|sla(?:b)?)$/i.test(normalize(seed.text).trim()))continue;
   const parts=[seed];for(let i=0;i<3;i++){const last=parts.at(-1),font=last.box[3]-last.box[1],next=unique.filter(r=>!parts.includes(r)&&r.box[0]>=last.box[2]&&r.box[0]-last.box[2]<=font*2.5&&Math.abs((r.box[1]+r.box[3]-last.box[1]-last.box[3])/2)<=font*.4&&(r.box[3]-r.box[1])/font>=.6&&(r.box[3]-r.box[1])/font<=1.6).sort((a,b)=>a.box[0]-b.box[0])[0];if(!next)break;parts.push(next);const text=parts.map(p=>p.text).join(' ');if(text.length>80)break;if(!caption(text))continue;
    const box=[Math.min(...parts.map(p=>p.box[0])),Math.min(...parts.map(p=>p.box[1])),Math.max(...parts.map(p=>p.box[2])),Math.max(...parts.map(p=>p.box[3]))],alreadyRead=unique.some(r=>(r.confidence??0)>=70&&caption(r.text)&&r.box[0]<=box[0]+2&&r.box[2]>=box[2]-2&&Math.abs(r.box[1]-box[1])<font);
    if(!alreadyRead&&!result.some(r=>r.row.box.every((n,j)=>Math.abs(n-box[j])<1)))result.push({row:{text,box,confidence:Math.min(...parts.map(p=>p.confidence??0)),source:'observed-caption-fragments',readingParts:parts.map(p=>({text:p.text,box:p.box.slice(),confidence:p.confidence,source:p.source||'ocr'}))},caption:true,dimension:false,window:false,priority:1,purpose:'source-fragmented-level-caption'});break;
   }
  }return result;
 }
 function neighbouringMeasurements(view,references=[]){
  if(!['floor','elevation'].includes(view.kind))return [];
  const rows=(view.payload.drawingReadings?.rows||[]).filter(r=>r.box?.length===4&&r.box.every(Number.isFinite)&&r.box[2]>r.box[0]&&r.box[3]>r.box[1]&&r.box[0]<view.payload.sourceWidth*.81),token=/^\d{1,3}(?:\s+\d\/\d)?["'′’]$/,
   pair=/^\d{1,3}(?:\s+\d\/\d)?["'′’]\s+\d{1,3}(?:\s+\d\/\d)?["'′’]$/,out=[];
  const add=parts=>{const text=parts.map(r=>String(r.text||'').trim()).join(' '),box=[Math.min(...parts.map(r=>r.box[0])),Math.min(...parts.map(r=>r.box[1])),Math.max(...parts.map(r=>r.box[2])),Math.max(...parts.map(r=>r.box[3]))];if(!pair.test(text)||box[2]-box[0]>view.payload.sourceWidth*.12||box[3]-box[1]>24||out.some(r=>r.row.box.every((n,i)=>Math.abs(n-box[i])<1)))return;const paired=references.some(r=>r.textBox&&r.textBox[0]>=box[0]-1&&r.textBox[2]<=box[2]+1&&Math.abs(r.textBox[1]-box[1])<3);out.push({row:{text,box,confidence:Math.min(...parts.map(p=>p.confidence??0)),readingParts:parts.map(p=>({text:p.text,box:p.box.slice(),confidence:p.confidence,source:p.source||'ocr'}))},window:true,tight:true,priority:paired?.25:.75,purpose:'source-neighbouring-measurements'});};
  for(const row of rows){const text=String(row.text||'').trim();if(pair.test(text)){add([row]);continue;}if(!token.test(text))continue;const height=row.box[3]-row.box[1],next=rows.filter(r=>r!==row&&token.test(String(r.text||'').trim())&&r.box[0]>=row.box[2]&&r.box[0]-row.box[2]<=height*3&&Math.abs((r.box[1]+r.box[3]-row.box[1]-row.box[3])/2)<=height*.35&&(r.box[3]-r.box[1])/height>=.7&&(r.box[3]-r.box[1])/height<=1.4).sort((a,b)=>a.box[0]-b.box[0])[0];if(next)add([row,next]);}
  return out;
 }
 // Three independent source datum strokes establish only a search column.
 // Unread ink above other observed rules becomes a crop, never a level or guide.
 function datumCaptionBands(image,guides){
 const {width:w,height:h,data:d}=image,valid=guides.filter(g=>g.box?.length===4&&g.box.every(Number.isFinite)&&g.sourceGuide?.support>=.7&&g.sourceGuide.anchors?.length===2&&g.sourceGuide.anchors.every(p=>p?.length===2&&p.every(Number.isFinite)&&Math.abs(p[1]-g.y)<1)),groups=[],median=ns=>ns.slice().sort((a,b)=>a-b)[Math.floor(ns.length/2)];
 for(const g of valid){const font=Math.max(3,g.box[3]-g.box[1]);let group=groups.find(a=>a.every(v=>Math.abs(v.box[2]-g.box[2])<font*3));if(!group)groups.push(group=[]);group.push(g);}
 const neutral=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return false;const n=(y*w+x)*4,r=d[n],g=d[n+1],b=d[n+2];return d[n+3]>100&&Math.max(r,g,b)-Math.min(r,g,b)<25&&r+g+b<630;},result=[];
 for(const group of groups){if(new Set(group.map(g=>Math.round(g.y/4))).size<3)continue;const font=median(group.map(g=>Math.max(3,g.box[3]-g.box[1]))),left=Math.floor(median(group.map(g=>g.sourceGuide.anchors[0][0]))),right=Math.ceil(median(group.map(g=>g.sourceGuide.anchors[1][0]))),textLeft=Math.floor(Math.min(...group.map(g=>g.box[0]))-font*.6),textRight=Math.ceil(median(group.map(g=>g.box[2]))+font*.6),bands=[];
  if(right-left<font*8)continue;
  for(let y=Math.ceil(font*4);y<h-font;y++){let n=0,gap=0,maxGap=0;for(let x=left;x<=right;x++){if(neutral(x,y)){n++;gap=0;}else maxGap=Math.max(maxGap,++gap);}const support=n/(right-left+1);if(support<.85||maxGap>Math.max(3,font))continue;const prev=bands.at(-1);if(prev&&y===prev.bottom+1){prev.bottom=y;if(support>prev.support){prev.y=y;prev.support=support;}}else bands.push({y,top:y,bottom:y,support});}
  for(const band of bands){if(group.some(g=>Math.abs(g.y-band.y)<=3))continue;const top=Math.max(0,Math.floor(band.top-font*2.5)),bottom=band.top-2,columns=new Set(),pixels=[];for(let y=top;y<=bottom;y++)for(let x=textLeft;x<=textRight;x++)if(neutral(x,y)){columns.add(x);pixels.push([x,y]);}if(pixels.length<font*2||columns.size<font*3)continue;
   const xs=pixels.map(p=>p[0]),ys=pixels.map(p=>p[1]),box=[Math.max(textLeft,Math.min(...xs)-1),Math.max(top,Math.min(...ys)-1),Math.min(textRight,Math.max(...xs)+1),Math.min(bottom,Math.max(...ys)+1)];if(box[3]-box[1]<font*.5||box[3]-box[1]>font*2)continue;
   result.push({region:[box[0],box[1],box[2]-box[0]+1,box[3]-box[1]+1],sourceGuideCandidate:{anchors:[[left,band.y],[right,band.y]],support:band.support,strokeBand:[band.top,band.bottom]},regionEvidence:{method:'unread-horizontal-stroke-in-observed-datum-caption-column',sourceCaptionBoxes:group.map(g=>g.box),fontPixels:font,observedTextPixels:pixels.length},expectedText:null});
  }
 }
 return result;
}

 function datumCaptionRegions(view,image){
  const R=root.MIRPlanReconstruction;if(!['elevation','section'].includes(view.kind)||!image?.data||!R?.floorGuide)return [];
  const guides=R.floorGuide(view,image).filter(g=>g.sourceViewId===view.id&&JSON.stringify(g.sourceFrame)===JSON.stringify(view.frame)),rows=view.payload.drawingReadings?.rows||[];
  return datumCaptionBands(image,guides).filter(item=>{const [x,y,w,h]=item.region,box=[x,y,x+w,y+h];return !rows.some(row=>(row.confidence??0)>=70&&captionOverlap(row.box,box)>=.65&&!/plancher|floor|plafond|ceiling|dalle|slab|niveau|level|\bniv\b/i.test(row.text||''));}).map(item=>{
   const [x,y,w,h]=item.region;return {row:{text:'',box:[x,y,x+w,y+h],confidence:0,source:'source-datum-caption-column'},caption:true,dimension:false,window:false,priority:.9,purpose:'source-datum-caption-column',sourceRegion:item.region.slice(),captionRegionEvidence:{...JSON.parse(JSON.stringify(item.regionEvidence)),sourceGuideCandidate:JSON.parse(JSON.stringify(item.sourceGuideCandidate)),notAModelGuide:true}};
  });
 }
 function readingCrop(view,region){
  const [x0,y0,x1,y1]=region.row.box,font=Math.max(5,y1-y0),w=view.payload.sourceWidth,h=view.payload.sourceHeight,completeCaption=region.caption&&/etage?|upper|ground|r[.\s-]*d[.\s-]*c|(?:niveau|level|niv\.?)\b/i.test(region.row.text),raw=region.sourceRegion;
  if(raw?.length===4&&raw.every(Number.isFinite)&&raw[0]>=0&&raw[1]>=0&&raw[2]>0&&raw[3]>0&&raw[0]+raw[2]<=w&&raw[1]+raw[3]<=h)return {x0,y0,x1,y1,font,w,h,left:raw[0],top:raw[1],right:raw[0]+raw[2],bottom:raw[1]+raw[3]};
  return {x0,y0,x1,y1,font,w,h,left:Math.max(0,Math.floor(x0-(region.grid?0:font*(completeCaption?.25:region.caption?1.5:.5)))),top:Math.max(0,Math.floor(y0-font*(region.grid||completeCaption?0:region.tight?.1:.35))),right:Math.min(w,Math.ceil(x1+(region.grid?0:font*(completeCaption?1:region.caption?3:.5)))),bottom:Math.min(h,Math.ceil(y1+font*(region.grid||completeCaption?0:region.tight?.1:.4)))};
 }
 function regions(view,image){
  const rows=view.payload.drawingReadings?.rows||[],references=image&&root.MIRPlanReconstruction?.references?root.MIRPlanReconstruction.references(view,image):[],candidates=[...datumCaptionRegions(view,image),...fragmentedCaptions(view),...neighbouringMeasurements(view,references)];
  const sameBox=(a,b)=>a?.length===4&&b?.length===4&&a.every((n,i)=>Math.abs(n-b[i])<=1),overlap=(a,b)=>{const intersection=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));return intersection/Math.min((a[2]-a[0])*(a[3]-a[1]),(b[2]-b[0])*(b[3]-b[1]));};
  // A construction caption can be split into several OCR tokens. Retry its
  // whole observed box only when every part belongs to this view's readings.
  for(const reference of references){
   const reading=reference.sourceReading,parts=reading?.readingParts;if(!reading?.joined||!parts?.length||(reading.confidence??100)>=70)continue;
   if(!parts.every(part=>rows.some(row=>row.text===(part.originalText||part.text)&&sameBox(row.box,part.box))))continue;
   const text=parts.map(part=>part.originalText||part.text).join(' ');if(!/^[\dOGB\s'"’′.,/−-]{2,24}$/.test(text))continue;
   const row={...reading,text,box:reading.box.slice()};candidates.push({row,caption:false,dimension:true,window:false,priority:0,purpose:'source-paired-scale-dimension',scaleSpanPixels:reference.spanPx});
  }
  for(const row of rows){
   if(!Array.isArray(row.box)||row.box.length!==4||!row.box.every(Number.isFinite)||row.box[2]<=row.box[0]||row.box[3]<=row.box[1]||row.box[0]>view.payload.sourceWidth*.81)continue;
   const text=String(row.text||'').trim(),caption=/plancher|floor|dalle|slab|plafond|ceiling/i.test(text)&&!/\b(?:note|index|sommaire|contents|legend|legende|table|schedule)\b/i.test(text)&&((row.confidence??100)<70||!/etage|upper|r[.\s-]*d[.\s-]*c|ground|(?:niveau|level|niv\.?)\s*[-:#]?\s*\d+/i.test(text)),dimension=(row.confidence??100)<70&&/^[\dOGB\s'"’′.,/−-]{2,24}$/.test(text),window=/^[\dOGB][\dOGB\s'"*.,/−-]{0,16}[x×][\dOGB\s'"*°.,/−-]{1,16}$/i.test(text);
   if(!caption&&!dimension&&!window)continue;
   // Retry the inscription actually paired with observed dimension marks.
   // Duplicate low-quality OCR at the same position must not hide this row.
   const reference=dimension?references.filter(r=>(r.label||r.text).trim()===text&&sameBox(r.textBox,row.box)).sort((a,b)=>b.spanPx-a.spanPx)[0]:null;
   candidates.push({row,caption,dimension,window,priority:reference?0:caption?1:dimension?2:3,...(reference?{purpose:'source-paired-scale-dimension',scaleSpanPixels:reference.spanPx}:{})});
  }
  candidates.sort((a,b)=>a.priority-b.priority||(b.scaleSpanPixels||0)-(a.scaleSpanPixels||0));
  const out=[];for(const candidate of candidates){if(out.some(item=>overlap(item.row.box,candidate.row.box)>.65))continue;out.push(candidate);if(out.length===6)break;}return out;
 }
 function openingRegions(view,image){
  if(view.kind!=='floor'||!image||!root.MIRReconstructionVision)return [];
  const V=root.MIRReconstructionVision,outline=V.floorEnvelope(image,{sourceViewId:view.id,frame:view.frame,rows:view.payload.drawingReadings?.rows||[]});if(outline.status!=='proposed')return [];
  const points=outline.points,orientation=Math.sign(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-p[1]*q[0];},0)),gaps=V.floorOpenings(image,points),out=[],masks=V.legendBoxes(image,view.payload.drawingReadings?.rows||[]);
  const joined=[];for(let i=0;i<gaps.length;i++){const a=gaps[i],b=gaps[i+1];if(b&&a.edgeIndex===b.edgeIndex&&b.from-a.to>0&&b.from-a.to<=40&&b.to-a.from<image.width*.12)joined.push({...a,anchors:[a.anchors[0],b.anchors[1]],to:b.to,parts:[a,b]});}
  for(const gap of [...gaps,...joined]){const a=points[gap.edgeIndex],b=points[(gap.edgeIndex+1)%points.length];if(Math.abs(a[1]-b[1])>2)continue;const outward=-Math.sign(b[0]-a[0])*orientation,pad=Math.max(30,Math.abs(gap.anchors[0][0]-gap.anchors[1][0])*.4),center=(gap.anchors[0][0]+gap.anchors[1][0])/2,left=Math.max(0,Math.floor(center-pad)),right=Math.min(image.width-1,Math.ceil(center+pad)),top=Math.max(0,Math.floor(a[1]+(outward<0?-100:12))),bottom=Math.min(image.height-1,Math.ceil(a[1]+(outward<0?-12:100))),counts=[];
   for(let y=top;y<=bottom;y++){let ink=0;for(let x=left;x<=right;x++){const i=(y*image.width+x)*4,r=image.data[i],g=image.data[i+1],b=image.data[i+2];if(Math.max(r,g,b)-Math.min(r,g,b)<65&&(r+g+b)/3<190)ink++;}counts.push(ink);}
   const background=counts.slice().sort((a,b)=>a-b)[Math.floor(counts.length*.2)]||0,threshold=Math.max(5,background+4);let start=null;
   for(let i=0;i<=counts.length;i++){const active=i<counts.length&&counts[i]>threshold&&counts[i]<(right-left)*.7;if(active&&start==null)start=i;if(!active&&start!=null){const height=i-start;if(height>=4&&height<=20){const box=[left,top+start-1,right,top+i+1],cx=(left+right)/2,cy=(box[1]+box[3])/2;if(!masks.some(([x,y,w,h])=>cx>=x&&cx<=x+w&&cy>=y&&cy<=y+h)&&!out.some(r=>Math.abs(r.row.box[0]-left)<12&&Math.abs(r.row.box[1]-box[1])<6))out.push({row:{text:'',box,confidence:0},window:true,purpose:'caption-near-exterior-floor-opening',gap:JSON.parse(JSON.stringify(gap)),tight:true});}start=null;}}
  }return out.slice(0,18);
 }
 function gridRegions(view,image,{includeRoof=false}={}){
  // Grid numerals and letters are too small for full-page OCR in large PDFs.
  // Source ink first finds candidate circles. Local OCR reads only interiors.
  const layout=view.kind==='floor'||includeRoof&&view.kind==='roof'?'floor':view.kind==='elevation'&&['front','back'].includes(view.direction)?'elevation-number':view.kind==='elevation'&&['left','right'].includes(view.direction)?'elevation-letter':null;
  if(!layout||!image||!root.MIRGridRegistration?.bubbleRegions)return [];
  const detected=root.MIRGridRegistration.bubbleRegions(image,{layout});
  if(detected.status!=='proposed')return [];
  const prior=view.payload.drawingReadings?.rows||[];
  return detected.bubbles.filter(circle=>!prior.some(row=>{
   if(!(row.confidence>=70)||row.box?.length!==4)return false;
   const word=String(row.text||'').trim().toUpperCase(),valid=circle.kind==='number'?/^\d{1,2}$/.test(word)&&Number(word)>0:/^[A-Z]$/.test(word);
   return valid&&Math.hypot((row.box[0]+row.box[2])/2-circle.center[0],(row.box[1]+row.box[3])/2-circle.center[1])<circle.radius*.6;
  })).slice(0,40).map(circle=>{
   const [x,y]=circle.center,half=Math.max(3,circle.radius*.65);
   return {row:{text:'',box:[x-half,y-half,x+half,y+half],confidence:0},
    priority:.5,grid:true,tight:true,gridCircle:JSON.parse(JSON.stringify(circle)),
    purpose:'source-raster-grid-bubble'};
  });
 }
 function workItems(inventory,buildingId,sourceImages={}){
  const roofIds=new Set(inventory.views.filter(v=>v.buildingId===buildingId&&v.kind==='roof'&&root.MIRRoofPitchEvidence?.regions(v).length).map(v=>v.id)),roofRegistration=roofIds.size>0&&inventory.views.some(v=>v.buildingId===buildingId&&v.kind==='floor');
  const views=inventory.views.filter(v=>v.buildingId===buildingId&&(['floor','elevation'].includes(v.kind)||roofRegistration&&roofIds.has(v.id))&&v.payload.sourceImage).sort((a,b)=>Number(b.kind==='floor')-Number(a.kind==='floor'));
  // Grid OCR runs for cross-level registration or an observed roof pitch
  // requiring a real floor-to-roof transform. No roof kind is rewritten as
  // a floor; the same bubble detector, thresholds and total budget apply.
  const multiLevel=new Set(views.filter(v=>v.kind==='floor').map(v=>v.levelId).filter(Boolean)).size>1;
  return views.flatMap(view=>(view.kind==='roof'?gridRegions(view,sourceImages[view.id],{includeRoof:true}):[...regions(view,sourceImages[view.id]),...(multiLevel||roofRegistration&&view.kind==='floor'?gridRegions(view,sourceImages[view.id]):[]),...openingRegions(view,sourceImages[view.id]).map(region=>({...region,priority:4}))]).map(region=>({view,region}))).sort((a,b)=>a.region.priority-b.region.priority).slice(0,multiLevel?64:42);
 }
 // Re-read a bounded region from the retained PDF, never from a resampled
 // screenshot. Coordinates remain those of the upright imported view.
 function captionGuideMasks(canvas,{padding=0,scale=1,left=0,top=0}={}){
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(0,0,canvas.width,canvas.height),width=canvas.width,start=Math.ceil(padding),end=width-Math.ceil(padding),masks=[];if(end-start<20)return masks;
  for(let y=Math.ceil(padding);y<canvas.height-padding;y++){let run=0,runStart=start,best=null;for(let x=start;x<end;x++){const i=(y*width+x)*4,d=pixels.data,hi=Math.max(d[i],d[i+1],d[i+2]),lo=Math.min(d[i],d[i+1],d[i+2]);if(d[i+3]>120&&hi<210&&hi-lo<55){if(!run)runStart=x;run++;if(!best||run>best.length)best={start:runStart,length:run};}else run=0;}if(best&&best.length>=(end-start)*.8){for(let x=best.start;x<best.start+best.length;x++)pixels.data.set([255,255,255,255],(y*width+x)*4);masks.push({kind:'ocr-only-horizontal-guide',canvasRegion:[best.start,y,best.length,1],sourceRegion:[left+(best.start-padding)/scale,top+(y-padding)/scale,best.length/scale,1/scale]});}}
  if(masks.length)ctx.putImageData(pixels,0,0);return masks;
 }
 function sourceTilePlan(view,region,{factor=6,padding=12}={}){
  const frame=view?.frame,m=frame?.pdfToRaster,c=frame?.cropToRaster,size=[view?.payload?.sourceWidth||view?.zone?.[2]||frame?.rasterSize?.[0],view?.payload?.sourceHeight||view?.zone?.[3]||frame?.rasterSize?.[1]],valid=a=>Array.isArray(a)&&a.every(Number.isFinite),rotation=view?.orientation??view?.payload?.sourceRotation;
  if(!valid(m)||m.length!==6||!valid(c)||c.length!==6||c.slice(0,4).some((n,i)=>n!==[1,0,0,1][i])||!valid(size)||size.some(n=>n<=0)||![0,90,180,270].includes(rotation))return {status:'unresolved',reason:'SOURCE_FRAME_REQUIRED'};
  if(!valid(region)||region.length!==4||region[0]<0||region[1]<0||region[2]<=0||region[3]<=0||region[0]+region[2]>size[0]+.001||region[1]+region[3]>size[1]+.001||!Number.isFinite(factor)||factor<1||factor>8||!Number.isFinite(padding)||padding<0||padding>64)return {status:'unresolved',reason:'SOURCE_REGION_INVALID'};
  const scale=Math.hypot(m[0],m[1]),other=Math.hypot(m[2],m[3]);if(!(scale>0)||Math.abs(scale-other)>scale*.000001||Math.abs(m[0]*m[2]+m[1]*m[3])>scale*scale*.000001)return {status:'unresolved',reason:'SOURCE_FRAME_INVALID'};
  const width=Math.ceil(region[2]*factor)+padding*2,height=Math.ceil(region[3]*factor)+padding*2;if(width>4096||height>4096||width*height>2000000)return {status:'unresolved',reason:'SOURCE_REGION_TOO_LARGE'};
  const translation=[padding-factor*(c[4]+region[0]),padding-factor*(c[5]+region[1])],pdfToTile=m.map((n,i)=>n*factor+(i===4?translation[0]:i===5?translation[1]:0));
  return {status:'ready',width,height,factor,padding,rotation,sourceScale:scale,region:region.slice(),sourceFrame:JSON.parse(JSON.stringify(frame)),pageRegion:[c[4]+region[0],c[5]+region[1],region[2],region[3]],translation,pdfToTile,viewToTile:[factor,0,0,factor,padding-factor*region[0],padding-factor*region[1]]};
 }
 async function pdfDependencies(){const library=await import(asset('vendor/pdfjs/pdf.min.mjs'));library.GlobalWorkerOptions.workerSrc=asset('vendor/pdfjs/pdf.worker.min.mjs');return library;}
 function sourceReader(sourceFile,files=[],{loadLibrary=pdfDependencies}={}){
  let loading=null,job=null,pdf=null,page=null,pageNumber=null,sha256=null,closed=false;
  const open=()=>loading||(loading=(async()=>{if(!sourceFile||typeof sourceFile.arrayBuffer!=='function')return {status:'unresolved',reason:'SOURCE_PDF_UNAVAILABLE'};const bytes=await sourceFile.arrayBuffer();sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');if(!files.some(f=>f.sha256===sha256))return {status:'unresolved',reason:'SOURCE_FILE_MISMATCH'};if(closed)return {status:'unresolved',reason:'SOURCE_READER_CLOSED'};const library=await loadLibrary();job=library.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,enableXfa:false,cMapUrl:asset('vendor/pdfjs/cmaps/'),cMapPacked:true,standardFontDataUrl:asset('vendor/pdfjs/standard_fonts/'),wasmUrl:asset('vendor/pdfjs/wasm/'),stopAtErrors:false});pdf=await job.promise;return {status:'ready'};})());
  return {async render(view,region,options={}){const plan=sourceTilePlan(view,region,options);if(plan.status!=='ready')return plan;let canvas=null;try{if(closed)return {status:'unresolved',reason:'SOURCE_READER_CLOSED'};const opened=await open();if(opened.status!=='ready')return opened;if(!files.some(f=>f.id===view.fileId&&f.sha256===sha256)||!Number.isInteger(view.page)||view.page<1||view.page>pdf.numPages)return {status:'unresolved',reason:'SOURCE_FILE_MISMATCH'};if(pageNumber!==view.page){page?.cleanup();page=await pdf.getPage(view.page);pageNumber=view.page;}const base=page.getViewport({scale:plan.sourceScale/(page.userUnit||1),rotation:plan.rotation});if(base.transform.some((n,i)=>Math.abs(n-plan.sourceFrame.pdfToRaster[i])>Math.max(.00001,Math.abs(n)*.000001)))return {status:'unresolved',reason:'SOURCE_FRAME_MISMATCH'};if(plan.pageRegion[0]<0||plan.pageRegion[1]<0||Number.isFinite(base.width)&&plan.pageRegion[0]+plan.pageRegion[2]>Math.ceil(base.width)||Number.isFinite(base.height)&&plan.pageRegion[1]+plan.pageRegion[3]>Math.ceil(base.height))return {status:'unresolved',reason:'SOURCE_REGION_INVALID'};const viewport=page.getViewport({scale:plan.sourceScale*plan.factor/(page.userUnit||1),rotation:plan.rotation});canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height;await page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[1,0,0,1,...plan.translation],background:'rgb(255,255,255)'}).promise;if(plan.padding){const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,plan.width,plan.padding);ctx.fillRect(0,plan.height-plan.padding,plan.width,plan.padding);ctx.fillRect(0,0,plan.padding,plan.height);ctx.fillRect(plan.width-plan.padding,0,plan.padding,plan.height);}return {status:'proposed',canvas,provenance:{method:'retained-pdf-region',sourceFileId:view.fileId,sourceSha256:sha256,sourceViewId:view.id,sourcePage:view.page,sourceFrame:plan.sourceFrame,sourceRotation:plan.rotation,sourceRegion:plan.region,sourcePageRegion:plan.pageRegion,scaleFactor:plan.factor,padding:plan.padding,pdfToTile:plan.pdfToTile,viewToTile:plan.viewToTile,viewportTransform:Array.from(viewport.transform),canvasSize:[plan.width,plan.height]}};}catch(error){if(canvas)canvas.width=canvas.height=1;return {status:'unresolved',reason:'SOURCE_PDF_READ_FAILED',message:String(error?.message||error)};}},async close(){closed=true;try{if(loading)await loading;}catch(_){}page?.cleanup();page=null;try{if(job?.destroy)await job.destroy();else if(pdf?.destroy)await pdf.destroy();}finally{pdf=job=null;}}};
 }
 function dimensionWordRetryNeeded(region,data,source){return !!region.dimension&&!!source?.nativeSource&&(Number(data?.confidence)||0)<70;}
 async function dimensionWordRetry(worker,native,view,region,data,source){
  if(!dimensionWordRetryNeeded(region,data,source))return {data,readingAttempts:null,workerMode:null};
  const [x0,y0,x1,y1]=region.row.box,font=Math.max(5,y1-y0),left=Math.max(0,Math.floor(x0-font*.35)),top=Math.max(0,Math.floor(y0-font*.4)),right=Math.min(view.payload.sourceWidth,Math.ceil(x1+font*.35)),bottom=Math.min(view.payload.sourceHeight,Math.ceil(y1+font*.4)),wordRegion=[left,top,right-left,bottom-top],word=await native.render(view,wordRegion,{factor:6,padding:12}),readingAttempts=[{psm:7,text:data.text,confidence:data.confidence,region:source.region.slice()}];
  if(word.status!=='proposed'){readingAttempts.push({psm:8,status:'unresolved',reason:word.reason,region:wordRegion});return {data,readingAttempts,workerMode:null};}
  try{await worker.setParameters({tessedit_pageseg_mode:'8',tessedit_char_whitelist:''});const second=await worker.recognize(word.canvas,{}, {blocks:true});readingAttempts.push({psm:8,text:second.data.text,confidence:second.data.confidence,region:wordRegion,nativeSource:word.provenance});return {data:{...data,blocks:[...(data.blocks||[]).map(b=>({...b,readingPsm:7})),...(second.data.blocks||[]).map(b=>({...b,readingPsm:8,readingCapture:{left,top,scale:word.provenance.scaleFactor,padding:word.provenance.padding,nativeSource:word.provenance,region:wordRegion}}))]},readingAttempts,workerMode:'8:'};}finally{word.canvas.width=word.canvas.height=1;}
 }
 // Source floor/ceiling strokes only bound the search. A written value is
 // eligible for Y calibration only after the retained PDF supplies its own
 // dimension rail, two ticks and witnesses, without intermediate marks.
 // No horizontal calibration or assumed pixel isotropy supplies the height.
 function verticalDimensionPairs(view,image){
  const R=root.MIRPlanReconstruction,A=root.MIRPDFAnalysis,validBox=b=>b?.length===4&&b.every(Number.isFinite)&&b[2]>b[0]&&b[3]>b[1];
  if(!['elevation','section'].includes(view?.kind)||!image?.data||!R?.floorGuide||!A?.parseDimension)return [];
  const guides=R.floorGuide(view,image),rows=view.payload.drawingReadings?.verticalRows||[],pairs=[];
  for(const row of rows){
   if(!validBox(row.box)||(row.confidence??0)<30)continue;const parsed=A.parseDimension(row.text,{ocr:row.source!=='pdf-text'});if(!parsed||!(parsed.valueFt>0))continue;
   const font=Math.max(8,row.box[2]-row.box[0]),center=(row.box[1]+row.box[3])/2;
   for(const lower of guides.filter(g=>g.datumType==='floor'))for(const upper of guides.filter(g=>g.y<lower.y-20)){
    const next=/^level-\d+$/.test(lower.levelHint)?'level-'+(Number(lower.levelHint.slice(6))+1):lower.levelHint==='ground'?'upper':null;
    if(!(upper.datumType==='ceiling'&&upper.levelHint===lower.levelHint||upper.datumType==='floor'&&upper.levelHint===next))continue;
    if(row.box[1]<upper.y||row.box[3]>lower.y||Math.abs(center-(lower.y+upper.y)/2)/(lower.y-upper.y)>.19)continue;
    const left=Math.max(0,Math.floor(row.box[0]-font*3)),right=Math.min(image.width,Math.ceil(row.box[2]+font*3)),top=Math.max(0,Math.floor(upper.y-font*2)),bottom=Math.min(image.height,Math.ceil(lower.y+font*2)),region=[left,top,right-left,bottom-top],id=view.id+':vertical-dimension:'+row.box.join('-')+':'+row.text+':'+upper.y+'-'+lower.y;
    if(!pairs.some(p=>p.id===id))pairs.push({id,kind:'written',status:'unresolved',value:parsed.valueFt*.3048,unit:'m',text:row.text,confidence:row.confidence,sourceViewId:view.id,sourceFrame:JSON.parse(JSON.stringify(view.frame)),textBox:row.box.slice(),sourceReading:JSON.parse(JSON.stringify(row)),datumEvidence:{upper:JSON.parse(JSON.stringify(upper)),lower:JSON.parse(JSON.stringify(lower))},region,confirmationRequired:true});
   }
  }
  return pairs.sort((a,b)=>b.confidence-a.confidence||Number(b.datumEvidence.upper.datumType==='ceiling')-Number(a.datumEvidence.upper.datumType==='ceiling'));
 }
 function mapDimensionProof(proof,map){
  const out=JSON.parse(JSON.stringify(proof)),axis=proof.axis==='x'?0:1,unit=axis?[0,1]:[1,0],scale=Math.hypot(...map(unit).map((v,i)=>v-map([0,0])[i])),box=b=>{const a=map(b.slice(0,2)),z=map(b.slice(2));return [Math.min(a[0],z[0]),Math.min(a[1],z[1]),Math.max(a[0],z[0]),Math.max(a[1],z[1])];},marker=m=>({...m,point:map(m.point),...(m.strokeCenter?{strokeCenter:map(m.strokeCenter)}:{}),...(m.anchorTolerancePx!=null?{anchorTolerancePx:m.anchorTolerancePx*scale}:{}),...(m.terminalExtensions?{terminalExtensions:m.terminalExtensions.map(n=>n*scale)}:{}),...(m.offAxisPixels?{offAxisPixels:m.offAxisPixels.map(points=>points.map(map))}:{}),witnesses:m.witnesses.map(s=>s.map(map))});
  if(out.anchors)out.anchors=out.anchors.map(map);if(out.captionBox)out.captionBox=box(out.captionBox);if(out.segments)out.segments=out.segments.map(s=>s.map(map));if(out.gap)out.gap=out.gap.map(map);if(out.markers)out.markers=out.markers.map(marker);
  if(out.intermediateMarkCheck){out.intermediateMarkCheck.markers=out.intermediateMarkCheck.markers.map(marker);out.intermediateMarkCheck.searchedSpan=out.intermediateMarkCheck.searchedSpan.map(n=>map(axis?[0,n]:[n,0])[axis]);}
  if(out.interveningLine?.anchors)out.interveningLine.anchors=out.interveningLine.anchors.map(map);
  if(out.paperContrast?.samples){out.paperContrast.samples=out.paperContrast.samples.map(s=>({...s,point:map(s.point)}));out.paperContrast.maximumStrokeWidthPx*=scale;}
  if(Number.isFinite(out.maxGap))out.maxGap*=scale;
  return out;
 }
 async function nativeEvidenceTile(native,view,region,sourceRows,{factor=2,padding=12}={}){
  const tile=await native.render(view,region,{factor,padding});if(tile.status!=='proposed')return tile;
  const release=()=>{tile.canvas.width=tile.canvas.height=1;},p=tile.provenance,m=p?.viewToTile,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(!p||typeof p.sourceSha256!=='string'||!p.sourceSha256||p.sourceViewId!==view.id||p.sourceFileId!==view.fileId||p.sourcePage!==view.page||!same(p.sourceFrame,view.frame)||!same(p.sourceRegion,region)||p.scaleFactor!==factor||p.padding!==padding||!Array.isArray(m)||m.length!==6||!m.every(Number.isFinite)||!same(m,[factor,0,0,factor,padding-region[0]*factor,padding-region[1]*factor])){release();return {status:'unresolved',reason:'NATIVE_DIMENSION_FRAME_MISMATCH'};}
  try{const image=tile.canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,tile.canvas.width,tile.canvas.height),map=q=>[q[0]*m[0]+m[4],q[1]*m[3]+m[5]],back=q=>[(q[0]-m[4])/m[0],(q[1]-m[5])/m[3]],labels=(sourceRows||[]).filter(r=>r.box?.length===4).map(r=>({...r,box:[...map(r.box.slice(0,2)),...map(r.box.slice(2))]}));return {status:'proposed',image,map,back,labels,provenance:JSON.parse(JSON.stringify(p)),release};}catch(error){release();throw error;}
 }
 async function nativeDimensionTile(native,view,region,sourceRows){return nativeEvidenceTile(native,view,region,sourceRows,{factor:2,padding:12});}
 function captionOverlap(a,b){if(a?.length!==4||b?.length!==4)return 0;const area=p=>(p[2]-p[0])*(p[3]-p[1]);return Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]))/Math.min(area(a),area(b));}
 function sameDimensionSpan(a,b){return a?.length===2&&b?.length===2&&[b,b.slice().reverse()].some(points=>a.every((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])<=2));}
 function dimensionSourceReading(view,candidate){
  const rows=view.payload.drawingReadings?.rows||[],parts=candidate.sourceReading?.readingParts,exact=(row,part)=>row.box?.length===4&&part.box?.length===4&&row.box.every((n,i)=>n===part.box[i])&&row.text===(part.originalText||part.text);
  if(parts?.length)return parts.every(part=>rows.some(row=>exact(row,part)))?JSON.parse(JSON.stringify(candidate.sourceReading)):null;
  const source=candidate.sourceReading,text=source?.originalText||candidate.label||source?.text||candidate.text,row=rows.find(r=>r.text===text&&r.box?.length===4&&r.box.every((n,i)=>n===candidate.textBox[i]));return row?JSON.parse(JSON.stringify(row)):null;
 }
 function horizontalDimensionCandidates(view,image){
  const R=root.MIRPlanReconstruction;if(!image?.data||!R?.referenceObservations||!['floor','elevation','section'].includes(view.kind))return [];
  const observations=R.referenceObservations(view,image),result=[];
  for(const candidate of observations.unresolvedReferences||[]){const proof=candidate.lineEvidence,a=candidate.anchors,box=candidate.textBox;
   if(proof?.reason!=='DIMENSION_END_MARKS_REQUIRED'||proof.pixelSupport<.85||proof.maxGap>4||a?.length!==2||!a.every(p=>p.length===2&&p.every(Number.isFinite))||Math.abs(a[0][1]-a[1][1])>2||box?.length!==4||!box.every(Number.isFinite)||JSON.stringify(candidate.sourceFrame)!==JSON.stringify(view.frame)||candidate.sourceViewId!==view.id)continue;
   const sourceReading=dimensionSourceReading(view,candidate);if(!sourceReading)continue;const font=Math.max(8,box[3]-box[1]),left=Math.max(0,Math.floor(Math.min(...a.map(p=>p[0]),box[0])-font*3)),right=Math.min(image.width,Math.ceil(Math.max(...a.map(p=>p[0]),box[2])+font*3)),top=Math.max(0,Math.floor(Math.min(...a.map(p=>p[1]),box[1])-font*2.5)),bottom=Math.min(image.height,Math.ceil(Math.max(...a.map(p=>p[1]),box[3])+font*2.5));
   const pair={...JSON.parse(JSON.stringify(candidate)),id:view.id+':native-dimension:x:'+a.flat().join('-')+':'+box.join('-'),axis:'x',status:'unresolved',sourceReading,sourceCandidate:JSON.parse(JSON.stringify(candidate)),region:[left,top,right-left,bottom-top],confirmationRequired:true,notAMeasurementConfirmation:true};
   if(!result.some(r=>sameDimensionSpan(r.anchors,pair.anchors)&&captionOverlap(r.textBox,pair.textBox)>=.65))result.push(pair);
  }return result;
 }
 async function verifyHorizontalDimension(native,view,pair){
  const A=root.MIRPDFAnalysis,base=JSON.parse(JSON.stringify(pair)),unresolved=reason=>({...base,status:'unresolved',reason}),source=pair.sourceCandidate,reading=source&&dimensionSourceReading(view,source);
  if(!A?.dimensionLineEvidence||!reading||reading.confidence!==pair.confidence||pair.text!==source.text||pair.value!==source.value||pair.confidence!==source.confidence||pair.sourceViewId!==view.id||JSON.stringify(pair.sourceFrame)!==JSON.stringify(view.frame)||!sameDimensionSpan(pair.anchors,source.anchors)||JSON.stringify(pair.textBox)!==JSON.stringify(source.textBox)||JSON.stringify(pair.sourceReading)!==JSON.stringify(reading)||source.lineEvidence?.reason!=='DIMENSION_END_MARKS_REQUIRED')return unresolved('NATIVE_DIMENSION_SOURCE_MISMATCH');
  const tile=await nativeDimensionTile(native,view,pair.region,view.payload.drawingReadings.rows);if(tile.status!=='proposed')return unresolved(tile.reason||'SOURCE_PDF_UNAVAILABLE');
  try{const {image,map,back,labels}=tile,textBox=[...map(pair.textBox.slice(0,2)),...map(pair.textBox.slice(2))],anchors=pair.anchors.map(map),proof=A.dimensionLineEvidence(image,{...source,textBox,anchors},{labels,localPaperContrast:true,rejectIntermediateMarks:true}),lineEvidence=mapDimensionProof(proof,back);return {...base,status:proof.status==='observed'?'proposed':'unresolved',...(proof.status==='observed'?{}:{reason:proof.reason}),anchors:anchors.map(back),lineEvidence,nativeLineEvidence:proof,nativeSource:tile.provenance};}finally{tile.release();}
 }
 async function refineHorizontalDimensions(inventory,buildingId,sourceImages,native,{cancelled=()=>false,progress=()=>{},maxRegions=12,budget=null}={}){
  const work=inventory.views.filter(v=>v.buildingId===buildingId).flatMap(view=>horizontalDimensionCandidates(view,sourceImages[view.id]).map(pair=>({view,pair}))),evidence=[],capacity=Number.isFinite(maxRegions)?Math.max(0,Math.min(12,Math.floor(maxRegions))):12;let used=0;
  for(const {view,pair} of work){const rows=view.payload.drawingReadings.nativeDimensionLines||=([]);if(rows.some(r=>r.sourceViewId===view.id&&JSON.stringify(r.sourceFrame)===JSON.stringify(view.frame)&&sameDimensionSpan(r.anchors,pair.anchors)&&captionOverlap(r.textBox,pair.textBox)>=.65&&(r.nativeSource||r.reason==='SOURCE_PDF_UNAVAILABLE')))continue;
   let observation;if(cancelled())observation={...pair,reason:'NATIVE_DIMENSION_CANCELLED'};else if(used>=capacity||budget&&budget.remaining<=0)observation={...pair,reason:'NATIVE_DIMENSION_BUDGET'};else{used++;if(budget)budget.remaining--;observation=await verifyHorizontalDimension(native,view,pair);}
   const index=rows.findIndex(r=>r.id===pair.id);if(index>=0)rows[index]=observation;else rows.push(observation);evidence.push({sourceViewId:view.id,source:'native-horizontal-dimension',purpose:'source-horizontal-dimension-line',...observation,box:observation.textBox.slice()});progress(used,capacity,view.page);
  }return evidence;
 }
 async function verifyVerticalDimension(native,view,pair){
  const A=root.MIRPDFAnalysis,base=JSON.parse(JSON.stringify(pair)),unresolved=reason=>({...base,status:'unresolved',reason});
  if(!A?.dimensionLineEvidence||pair.sourceViewId!==view.id||JSON.stringify(pair.sourceFrame)!==JSON.stringify(view.frame))return unresolved('VERTICAL_DIMENSION_SOURCE_MISMATCH');
  const parsed=A.parseDimension(pair.text,{ocr:pair.sourceReading?.source!=='pdf-text'}),sourceRows=view.payload.drawingReadings?.verticalRows||[],sourceReading=sourceRows.some(row=>row.text===pair.text&&row.confidence===pair.confidence&&row.box?.length===4&&row.box.every((n,i)=>n===pair.textBox[i]));
  const datums=[pair.datumEvidence?.upper,pair.datumEvidence?.lower],validDatum=g=>g?.sourceViewId===view.id&&JSON.stringify(g.sourceFrame)===JSON.stringify(view.frame)&&g.sourceGuide?.support>=.7&&g.sourceGuide.anchors?.length===2&&g.sourceGuide.anchors.every(p=>p.length===2&&p.every(Number.isFinite)&&p[1]===g.y);
  if(!sourceReading||!parsed||Math.abs(parsed.valueFt*.3048-pair.value)>1e-9||!datums.every(validDatum))return unresolved('VERTICAL_DIMENSION_SOURCE_MISMATCH');
  const tile=await nativeDimensionTile(native,view,pair.region,view.payload.drawingReadings?.verticalRows||[]);if(tile.status!=='proposed')return unresolved(tile.reason||'SOURCE_PDF_UNAVAILABLE');
  try{
   const {image,map,back,labels}=tile,textBox=[...map(pair.textBox.slice(0,2)),...map(pair.textBox.slice(2))],y0=map([0,pair.datumEvidence.upper.y])[1],y1=map([0,pair.datumEvidence.lower.y])[1],candidates=[];
   base.nativeSource=JSON.parse(JSON.stringify(tile.provenance));
   for(let x=12+4;x<image.width-12-4;x++){
    if(x>=textBox[0]-1&&x<=textBox[2]+1)continue;
    const anchors=[[x,y0],[x,y1]],proof=A.dimensionLineEvidence(image,{text:pair.text,textBox,anchors,confidence:pair.confidence,referenceFt:pair.value/.3048},{labels,localPaperContrast:true,rejectIntermediateMarks:true});
    if(proof.status==='observed'||proof.pixelSupport>=.85&&proof.maxGap<=4)candidates.push({anchors:anchors.map(back),lineEvidence:mapDimensionProof(proof,back),nativeLineEvidence:proof});
   }
   const observed=candidates.filter(c=>c.lineEvidence.status==='observed'),groups=[];
   for(const c of observed){let group=groups.find(g=>g.every(q=>Math.abs(q.anchors[0][0]-c.anchors[0][0])<=2));if(!group)groups.push(group=[]);group.push(c);}
   base.candidateEvidence=candidates;
   if(groups.length!==1)return {...base,status:'unresolved',reason:groups.length?'VERTICAL_DIMENSION_ASSOCIATION_AMBIGUOUS':candidates.some(c=>c.lineEvidence.reason==='DIMENSION_INTERMEDIATE_MARKS')?'DIMENSION_INTERMEDIATE_MARKS':'VERTICAL_DIMENSION_SOURCE_MARKS_REQUIRED'};
   const captionCenter=(pair.textBox[0]+pair.textBox[2])/2,chosen=groups[0].sort((a,b)=>b.lineEvidence.pixelSupport-a.lineEvidence.pixelSupport||Math.abs(a.anchors[0][0]-captionCenter)-Math.abs(b.anchors[0][0]-captionCenter))[0];
   return {...base,...chosen,status:'proposed',calibration:{kind:'estimated-calibrated',axis:'y',metresPerPixel:pair.value/Math.abs(chosen.anchors[1][1]-chosen.anchors[0][1]),sourceReferenceId:pair.id,confirmationRequired:true}};
  }finally{tile.release();}
 }
 async function refineVerticalDimensions(inventory,buildingId,sourceImages,native,{cancelled=()=>false,progress=()=>{},maxRegions=12,budget:sharedBudget=null}={}){
  const work=inventory.views.filter(v=>v.buildingId===buildingId).flatMap(view=>verticalDimensionPairs(view,sourceImages[view.id]).map(pair=>({view,pair}))).sort((a,b)=>b.pair.confidence-a.pair.confidence),evidence=[],budget=Number.isFinite(maxRegions)?Math.max(0,Math.min(12,Math.floor(maxRegions))):12;
  for(let i=0;i<work.length;i++){
   const {view,pair}=work[i],observation=cancelled()?{...pair,reason:'VERTICAL_DIMENSION_CANCELLED'}:i>=budget||sharedBudget&&sharedBudget.remaining<=0?{...pair,reason:'VERTICAL_DIMENSION_BUDGET'}:await (async()=>{if(sharedBudget)sharedBudget.remaining--;return verifyVerticalDimension(native,view,pair);})();
   const rows=view.payload.drawingReadings.verticalDimensions||=([]),index=rows.findIndex(r=>r.id===observation.id);if(index>=0)rows[index]=observation;else rows.push(observation);
   evidence.push({sourceViewId:view.id,source:'native-vertical-dimension',purpose:'source-datum-bound-vertical-dimension',...observation,box:observation.textBox.slice()});if(i<budget)progress(i+1,Math.min(work.length,budget),view.page);
  }
  // Written ROUGH and foundation chains may have no named floor datum.
  // Preserve these source measurements without silently assigning a level.
  for(const view of inventory.views.filter(v=>v.buildingId===buildingId)){
   if(cancelled())break;
   const observations=root.MIRPlanReconstruction?.constructionHeightObservations?.(view,sourceImages[view.id])||[];if(!observations.length)continue;
   view.payload.drawingReadings.constructionHeights=observations;
   evidence.push(...observations.map(observation=>({sourceViewId:view.id,source:'source-construction-height',purpose:'source-construction-height-without-level-association',...observation,box:observation.textBox.slice()})));
  }
  return evidence;
 }
 // Boxed note keys are read from their own retained-source pixels. The
 // nearby height note selects a search region, never an expected key value.
 async function refineKeyedWallKeys(inventory,buildingId,sourceImages,native,worker,{cancelled=()=>false,progress=()=>{},discovery=null}={}){
  const K=root.MIRKeyedWallObservations;if(!K)return [];
  const found=discovery||K.discover(inventory,buildingId,sourceImages),evidence=[];
  for(let i=0;i<found.regions.length;i++){
   const region=found.regions[i],view=inventory.views.find(v=>v.id===region.sourceViewId&&v.buildingId===buildingId);if(!view)continue;
   const observation={id:region.id,sourceViewId:view.id,sourceFrame:JSON.parse(JSON.stringify(view.frame)),frameId:region.frame.id,frame:JSON.parse(JSON.stringify(region.frame)),box:region.frame.box.slice(),region:region.region.slice(),candidateEvidence:JSON.parse(JSON.stringify(region.candidateEvidence)),source:'native-keyed-wall-key',purpose:'source-boxed-wall-note-key',status:'unresolved',text:'',confidence:0,confirmationRequired:true};
   const tile=cancelled()?{status:'unresolved',reason:'KEYED_WALL_READING_CANCELLED'}:await native.render(view,region.region,{factor:6,padding:12});
   if(tile.status==='proposed')try{const p=tile.provenance,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);if(p?.method!=='retained-pdf-region'||p.sourceViewId!==view.id||p.sourceFileId!==view.fileId||p.sourcePage!==view.page||!same(p.sourceFrame,view.frame)||!same(p.sourceRegion,region.region)){observation.reason='KEYED_WALL_SOURCE_FRAME_REQUIRED';}else {await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:''});const {data}=await worker.recognize(tile.canvas,{}, {blocks:true}),text=String(data.text||'').trim().replace(/\s+/g,'').toUpperCase(),confidence=Number(data.confidence)||0;Object.assign(observation,{text,confidence,nativeSource:JSON.parse(JSON.stringify(tile.provenance)),status:/^[A-Z0-9]{1,4}$/.test(text)&&confidence>=70?'proposed':'unresolved',...(!/^[A-Z0-9]{1,4}$/.test(text)||confidence<70?{reason:'KEYED_WALL_KEY_UNCERTAIN'}:{})});}}finally{tile.canvas.width=tile.canvas.height=1;}
   else observation.reason=tile.reason||'SOURCE_PDF_UNAVAILABLE';
   const values=view.payload.drawingReadings.keyedWallKeys||=([]),index=values.findIndex(v=>v.id===observation.id);if(index>=0){const previous=values[index],history=[...(previous.previousReadings||[]),{...previous,previousReadings:undefined}];observation.previousReadings=history.slice(-4);if(history.some(r=>r.confidence>=70&&r.status==='proposed'&&observation.status==='proposed'&&r.text!==observation.text)||previous.status==='conflict'){observation.status='conflict';observation.reason='KEYED_WALL_KEY_CONFLICT';}values[index]=observation;}else values.push(observation);evidence.push(observation);progress(i+1,found.regions.length,view.page);
  }
  return evidence;
 }
 // A pitch caption schedules native OCR; no expected rise, denominator or
 // target house is passed to the worker. Every transcription keeps its own
 // source tile and the bounding box of the actual observed ratio.
 async function refineRoofPitches(inventory,buildingId,native,worker,{cancelled=()=>false,progress=()=>{},maxRegions=8}={}){
  const P=root.MIRRoofPitchEvidence;if(!P)return [];
  const copy=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),work=inventory.views.filter(v=>v.buildingId===buildingId&&v.kind==='roof').flatMap(view=>P.regions(view).map(region=>({view,region}))),limit=Math.max(0,Math.min(8,Number.isFinite(maxRegions)?Math.floor(maxRegions):8)),evidence=[];
  for(let i=0;i<work.length;i++){
   const {view,region}=work[i],observation={...copy(region),kind:'written',source:'ocr-local-native-roof-pitch',text:'',confidence:0,sourceBox:copy(region.caption.sourceBox),readingAttempts:[]},valid=[];
   if(cancelled())observation.reason='ROOF_PITCH_READING_CANCELLED';else if(i>=limit)observation.reason='ROOF_PITCH_READING_BUDGET';else for(const [box,psm,threshold] of [[region.region,6,null],[region.ratioRegion,7,null],[region.ratioRegion,7,140]]){
    if(cancelled()){observation.reason='ROOF_PITCH_READING_CANCELLED';break;}
    const tile=await native.render(view,box,{factor:6,padding:12});
    if(tile.status!=='proposed'){observation.readingAttempts.push({region:copy(box),psm,status:'unresolved',reason:tile.reason||'SOURCE_PDF_UNAVAILABLE'});continue;}
    try{const p=tile.provenance,file=inventory.files?.find(f=>f.id===view.fileId);
     if(p?.method!=='retained-pdf-region'||p.sourceViewId!==view.id||p.sourceFileId!==view.fileId||p.sourcePage!==view.page||!file?.sha256||p.sourceSha256!==file.sha256||!same(p.sourceFrame,view.frame)||!same(p.sourceRegion,box)||!(p.scaleFactor>0)||!Number.isFinite(p.padding)){observation.readingAttempts.push({region:copy(box),psm,status:'unresolved',reason:'ROOF_PITCH_SOURCE_FRAME_REQUIRED'});continue;}
     if(psm===6&&!threshold){const ctx=tile.canvas.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(0,0,tile.canvas.width,tile.canvas.height),captionBox=region.caption.sourceBox.map((n,j)=>(n-box[j%2])*p.scaleFactor+p.padding),nativeArrow=P.arrow(pixels,{caption:{sourceBox:captionBox}});if(nativeArrow)observation.nativeArrow={...copy(nativeArrow),anchors:nativeArrow.anchors.map(a=>a.map((n,j)=>(n-p.padding)/p.scaleFactor+box[j])),head:{depth:nativeArrow.head.depth/p.scaleFactor,halfWidth:nativeArrow.head.halfWidth/p.scaleFactor},nativeAnchors:copy(nativeArrow.anchors),nativeSource:copy(p),sourceViewId:view.id,sourceFrame:copy(view.frame)};}
     // The independent contrast attempt removes pale hatch/colour only in
     // the OCR tile. It never supplies roof strokes or replaces source ink.
     if(threshold){const ctx=tile.canvas.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(0,0,tile.canvas.width,tile.canvas.height);for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data,hi=Math.max(d[i],d[i+1],d[i+2]),lo=Math.min(d[i],d[i+1],d[i+2]),value=hi<threshold&&hi-lo<65?0:255;d.set([value,value,value,255],i);}ctx.putImageData(pixels,0,0);}
     await worker.setParameters({tessedit_pageseg_mode:String(psm),tessedit_char_whitelist:''});const {data}=await worker.recognize(tile.canvas,{}, {blocks:true}),lines=[];
     for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){const b=line.bbox;if(!b||![b.x0,b.y0,b.x1,b.y1].every(Number.isFinite)||b.x1<=b.x0||b.y1<=b.y0)continue;const mapped=[(b.x0-p.padding)/p.scaleFactor+box[0],(b.y0-p.padding)/p.scaleFactor+box[1],(b.x1-p.padding)/p.scaleFactor+box[0],(b.y1-p.padding)/p.scaleFactor+box[1]];if(mapped[0]<box[0]-.01||mapped[1]<box[1]-.01||mapped[2]>box[0]+box[2]+.01||mapped[3]>box[1]+box[3]+.01)continue;lines.push({text:String(line.text||'').trim(),confidence:Number(line.confidence)||0,sourceBox:mapped});}
     const attempt={region:copy(box),psm,preprocessing:threshold?'ocr-only-neutral-contrast-140':'native-source-colours',text:String(data.text||'').trim(),confidence:Number(data.confidence)||0,lines,nativeSource:copy(p)};observation.readingAttempts.push(attempt);
     for(const line of lines){const ratio=P.parse(line.text);if(ratio)valid.push({...line,ratio,nativeSource:copy(p),psm});}
    }finally{tile.canvas.width=tile.canvas.height=1;}
   }
   const best=valid.sort((a,b)=>b.confidence-a.confidence)[0];
   if(best){const captionConfidence=Math.max(region.caption.confidence||0,...observation.readingAttempts.flatMap(a=>(a.lines||[]).filter(l=>/^\s*(?:pente|pitch|slope)\s*$/i.test(l.text)).map(l=>l.confidence))),confidence=Math.min(best.confidence,captionConfidence),conflict=valid.some(v=>v.confidence>=70&&best.confidence>=70&&v.ratio.value!==best.ratio.value);Object.assign(observation,{text:best.text,confidence,sourceBox:best.sourceBox,ratio:best.ratio,nativeSource:best.nativeSource,status:conflict?'conflict':confidence>=70?'proposed':'unresolved',reason:conflict?'ROOF_PITCH_TRANSCRIPTION_CONFLICT':confidence>=70?null:'ROOF_PITCH_TRANSCRIPTION_UNCERTAIN'});}
   else observation.reason||='ROOF_PITCH_TRANSCRIPTION_UNCERTAIN';
   const readings=view.payload.drawingReadings.roofPitchReadings||=([]),at=readings.findIndex(r=>r.id===observation.id);
   if(at>=0){const old=readings[at];observation.previousReadings=[...(old.previousReadings||[]),{...old,previousReadings:undefined}].slice(-4);if(old.status==='conflict'||old.status==='proposed'&&observation.status==='proposed'&&P.parse(old.text)?.value!==P.parse(observation.text)?.value){observation.status='conflict';observation.reason='ROOF_PITCH_TRANSCRIPTION_CONFLICT';}readings[at]=observation;}else readings.push(observation);
   evidence.push({...copy(observation),box:observation.sourceBox.slice()});if(i<limit)progress(i+1,Math.min(work.length,limit),view.page);
  }return evidence;
 }
 // Native aperture tiles refine source observations only. Their search seed is
 // an existing floor gap projected by the same reconstruction module.
 function mapOpeningFrameProof(proof,back,size){
  const out=JSON.parse(JSON.stringify(proof)),box=b=>{const a=back(b.slice(0,2)),z=back([b[0]+b[2],b[1]+b[3]]);return [a[0],a[1],z[0]-a[0],z[1]-a[1]];};
  if(out.box)out.box=box(out.box);if(out.edges)for(const edge of Object.values(out.edges))if(edge.anchors)edge.anchors=edge.anchors.map(back);if(out.cornerPoints)out.cornerPoints=out.cornerPoints.map(back);if(out.extensions)for(const group of Object.values(out.extensions))for(const edge of group)if(edge.anchors)edge.anchors=edge.anchors.map(back);if(out.jambContinuationAbove)for(const edge of out.jambContinuationAbove)if(edge.anchors)edge.anchors=edge.anchors.map(back);
  out.rasterSize=size.slice();out.coordinateSystem='source-raster-pixels';out.metricsUnit='native-samples';return out;
 }
 async function verifyOpeningFrame(native,inventory,view,search,{cancelled=()=>false}={}){
  const V=root.MIRReconstructionVision,copy=x=>JSON.parse(JSON.stringify(x)),base=copy(search),unresolved=reason=>({...base,status:'unresolved',reason,candidates:[],confirmationRequired:true}),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite),floor=inventory.views.find(v=>v.id===search.floorSourceViewId),level=inventory.levels?.find(l=>l.id===search.levelId),region=search.region,seed=search.seed,band=search.band,size=[view.payload?.sourceWidth||view.zone?.[2]||view.frame?.rasterSize?.[0],view.payload?.sourceHeight||view.zone?.[3]||view.frame?.rasterSize?.[1]];
  if(!V?.patternedFrameAtSeed||view.kind!=='elevation'||!floor||floor.kind!=='floor'||!level||level.buildingId!==view.buildingId||level.sourceLevel!==floor.levelId||search.buildingId!==view.buildingId||floor.buildingId!==view.buildingId||search.sourceViewId!==view.id||!same(search.sourceFrame,view.frame)||!same(search.floorSourceFrame,floor.frame)||search.sourceGap?.kind!=='source-gap'||search.sourceGap.status!=='proposed'||search.sourceGap.colouredOcclusion||!search.sourceGap.sourcePixelEvidence||search.sourceGap.anchors?.length!==2||!search.sourceGap.anchors.every(point)||!region?.every(Number.isFinite)||region.length!==4||!Number.isFinite(seed?.left)||!Number.isFinite(seed?.right)||seed.left>=seed.right||!Number.isFinite(band?.top)||!Number.isFinite(band?.bottom)||band.top>=band.bottom||seed.left<region[0]||seed.right>region[0]+region[2]||band.top<region[1]||band.bottom>region[1]+region[3])return unresolved('NATIVE_OPENING_SOURCE_MISMATCH');
  if(cancelled())return unresolved('NATIVE_OPENING_CANCELLED');const tile=await nativeEvidenceTile(native,view,region,[],{factor:4,padding:12});if(tile.status!=='proposed')return unresolved(tile.reason||'SOURCE_PDF_UNAVAILABLE');
  try{
   if(cancelled())return {...unresolved('NATIVE_OPENING_CANCELLED'),nativeSource:copy(tile.provenance)};
   const nativeSeed={left:tile.map([seed.left,0])[0],right:tile.map([seed.right,0])[0]},nativeBand={top:tile.map([0,band.top])[1],bottom:tile.map([0,band.bottom])[1]},result=V.patternedFrameAtSeed(tile.image,nativeSeed,{...nativeBand,sourceScale:4}),raw=result.candidates||[],mapped=raw.map(candidate=>{const b=candidate.box,a=tile.back(b.slice(0,2)),z=tile.back([b[0]+b[2],b[1]+b[3]]);return {...copy(candidate),box:[a[0],a[1],z[0]-a[0],z[1]-a[1]],...(candidate.frameEvidence?{frameEvidence:mapOpeningFrameProof(candidate.frameEvidence,tile.back,size)}:{}),confirmationRequired:true};});
   return {...base,status:result.status==='proposed'?'proposed':'unresolved',...(result.reason?{reason:result.reason}:{}),candidates:mapped,nativeCandidates:copy(raw),nativeSource:copy(tile.provenance),nativeSearch:{seed:nativeSeed,band:nativeBand},confirmationRequired:true};
  }catch(error){return {...unresolved('NATIVE_OPENING_READ_FAILED'),nativeSource:copy(tile.provenance),errorName:String(error?.name||'Error')};}finally{tile.release();}
 }
 async function refineOpeningFrames(inventory,buildingId,sourceImages,native,{cancelled=()=>false,progress=()=>{},maxRegions=24}={}){
  const R=root.MIRPlanReconstruction,P=root.MIRReconstructionPipeline;if(!R?.openingFrameSearches)return [];
  const work=[],preparationRefusals=[],copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),limit=Number.isFinite(maxRegions)?Math.max(0,Math.min(24,Math.floor(maxRegions))):24;
  for(const level of inventory.levels||[]){if(level.buildingId!==buildingId)continue;const floor=inventory.views.find(v=>v.kind==='floor'&&v.buildingId===buildingId&&v.levelId===level.sourceLevel),refuse=reason=>{if(!floor)return;const w=floor.payload?.sourceWidth||floor.zone?.[2]||floor.frame?.rasterSize?.[0],h=floor.payload?.sourceHeight||floor.zone?.[3]||floor.frame?.rasterSize?.[1];if(w>0&&h>0)preparationRefusals.push({status:'unresolved',reason,sourceViewId:floor.id,sourceFrame:copy(floor.frame),buildingId,levelId:level.id,purpose:'source-native-opening-preparation',source:'native-opening-frame',box:[0,0,w,h],confirmationRequired:true});};if(!P?.prepare||!R.recoupRegistrations){refuse('NATIVE_OPENING_PIPELINE_REQUIRED');continue;}const proposal=R.propose(inventory,buildingId,sourceImages,{levelId:level.id});if(proposal.status!=='proposed'){refuse(proposal.reason||'NATIVE_OPENING_PROPOSAL_REQUIRED');continue;}const prepared=P.prepare(proposal,inventory,level);if(!prepared.constrained||prepared.errors?.length||!prepared.resolution?.reference){refuse(prepared.errors?.[0]||'NATIVE_OPENING_PREPARATION_REQUIRED');continue;}R.recoupRegistrations(proposal,inventory,sourceImages,prepared.constrained);for(const search of R.openingFrameSearches(proposal,inventory,sourceImages,prepared.constrained)||[]){const view=inventory.views.find(v=>v.id===search.sourceViewId&&v.buildingId===buildingId);if(!view||work.some(w=>w.search.floorSourceViewId===search.floorSourceViewId&&w.search.sourceViewId===search.sourceViewId&&same(w.search.sourceGap?.anchors,search.sourceGap?.anchors)&&same(w.search.region,search.region)))continue;work.push({view,search});}}
  const evidence=preparationRefusals;let used=0;for(const {view,search}of work){view.payload||={};view.payload.drawingReadings||={rows:[]};const rows=view.payload.drawingReadings.nativeOpeningFrames||=([]),at=rows.findIndex(r=>r.floorSourceViewId===search.floorSourceViewId&&r.sourceViewId===search.sourceViewId&&same(r.sourceFrame,search.sourceFrame)&&same(r.sourceGap?.anchors,search.sourceGap?.anchors)&&same(r.region,search.region));
   if(at>=0&&rows[at].nativeSource&&rows[at].status==='proposed')continue;
   let observation;if(cancelled())observation={...copy(search),status:'unresolved',reason:'NATIVE_OPENING_CANCELLED',candidates:[],confirmationRequired:true};else if(used>=limit)observation={...copy(search),status:'unresolved',reason:'NATIVE_OPENING_BUDGET',candidates:[],confirmationRequired:true};else{used++;observation=await verifyOpeningFrame(native,inventory,view,search,{cancelled});}
   if(at>=0){observation.previousReadings=[...(rows[at].previousReadings||[]),{...copy(rows[at]),previousReadings:undefined}].slice(-4);rows[at]=observation;}else rows.push(observation);
   const [x,y,w,h]=search.region;evidence.push({...copy(observation),source:'native-opening-frame',purpose:'source-floor-gap-to-native-elevation-frame',box:[x,y,x+w,y+h]});if(used<=limit)progress(used,Math.min(work.length,limit),view.page);
  }return evidence;
 }
 async function refine(inventory,buildingId,{images:sourceImages={},progress=()=>{},cancelled=()=>false,sourceFile=null}={}){
  const next=JSON.parse(JSON.stringify(inventory)),evidence=[],native=sourceReader(sourceFile,next.files||[]),dimensionBudget={remaining:12};let work,keyDiscovery,pitchRegions;try{evidence.push(...await refineHorizontalDimensions(next,buildingId,sourceImages,native,{progress,cancelled,budget:dimensionBudget}));work=workItems(next,buildingId,sourceImages);keyDiscovery=root.MIRKeyedWallObservations?.discover(next,buildingId,sourceImages);pitchRegions=next.views.filter(v=>v.buildingId===buildingId&&v.kind==='roof').flatMap(v=>root.MIRRoofPitchEvidence?.regions(v)||[]);}catch(error){await native.close();throw error;}if(!work.length&&!keyDiscovery?.regions.length&&!pitchRegions.length){try{evidence.push(...await refineVerticalDimensions(next,buildingId,sourceImages,native,{progress,cancelled,budget:dimensionBudget}));evidence.push(...await refineOpeningFrames(next,buildingId,sourceImages,native,{progress,cancelled}));return {inventory:next,evidence};}finally{await native.close();}}
  await dependencies();const worker=await root.Tesseract.createWorker('eng',1,{workerPath:asset('vendor/tesseract/worker.min.js'),corePath:asset('vendor/tesseract-core/'),langPath:asset('vendor/tessdata/'),workerBlobURL:false,gzip:true});
  let activeCanvas=null;try{await worker.setParameters({tessedit_pageseg_mode:'7',preserve_interword_spaces:'1'});let workerMode='7';const images=new Map();
   for(let i=0;i<work.length;i++){
    if(cancelled())break;const {view,region}=work[i];progress(i+1,work.length,view.page);let image=images.get(view.id);if(!image){image=new Image();image.src=view.payload.sourceImage;await image.decode();images.set(view.id,image);}
    const {x0,y0,x1,y1,font,w,h,left,top,right,bottom}=readingCrop(view,region),initialScale=region.grid?5:4;let scale=initialScale,padding=region.grid?scale*4:0,canvas=document.createElement('canvas'),nativeSource=null,nativeAttempt=null,ocrMasks=[];activeCanvas=canvas;canvas.width=(right-left)*scale+padding*2;canvas.height=(bottom-top)*scale+padding*2;let ctx=canvas.getContext('2d',{willReadFrequently:!!region.grid});if(region.grid){ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(image,left,top,right-left,bottom-top,padding,padding,(right-left)*scale,(bottom-top)*scale);
    if(region.purpose==='source-paired-scale-dimension'||region.purpose==='source-neighbouring-measurements'||region.caption){const source=await native.render(view,[left,top,right-left,bottom-top],{factor:6,padding:12});nativeAttempt={status:source.status,reason:source.reason};if(source.status==='proposed'){canvas.width=canvas.height=1;canvas=source.canvas;activeCanvas=canvas;ctx=canvas.getContext('2d',{willReadFrequently:true});scale=source.provenance.scaleFactor;padding=source.provenance.padding;nativeSource=source.provenance;}}
    if(region.caption)ocrMasks=captionGuideMasks(canvas,{padding,scale,left,top});
    if(region.grid){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),[cx,cy]=region.gridCircle.center,r=region.gridCircle.radius;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(Math.hypot((x-padding)/scale+left-cx,(y-padding)/scale+top-cy)>r*.7)pixels.data.set([255,255,255,255],(y*canvas.width+x)*4);ctx.putImageData(pixels,0,0);}
    const maskedSource=region.grid?ctx.getImageData(0,0,canvas.width,canvas.height):null;
    const kind=region.gridCircle?.kind,whitelist=region.grid?(kind==='number'?'0123456789':'ABCDEFGHIJKLMNOPQRSTUVWXYZ'):'',desired=(region.grid?'10':'7')+':'+whitelist;
    if(workerMode!==desired){await worker.setParameters({tessedit_pageseg_mode:region.grid?'10':'7',tessedit_char_whitelist:whitelist});workerMode=desired;}
    let {data}=await worker.recognize(canvas,{}, {blocks:true}),readingAttempts=null;
    if(region.purpose==='source-neighbouring-measurements'){readingAttempts=[{psm:7,text:data.text,confidence:data.confidence}];if(!/[x×]/i.test(data.text||'')){await worker.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:''});workerMode='11:';const second=await worker.recognize(canvas,{}, {blocks:true});readingAttempts.push({psm:11,text:second.data.text,confidence:second.data.confidence});data={...data,blocks:[...(data.blocks||[]).map(b=>({...b,readingPsm:7})),...(second.data.blocks||[]).map(b=>({...b,readingPsm:11}))]};}}
    // One source inscription, two segmentations: keep alternatives and their
    // own crop frames; they must never count as independent scale references.
    if(dimensionWordRetryNeeded(region,data,{nativeSource})){const second=await dimensionWordRetry(worker,native,view,region,data,{nativeSource,region:[left,top,right-left,bottom-top]});data=second.data;readingAttempts=second.readingAttempts;if(second.workerMode)workerMode=second.workerMode;}

    if(region.grid){
     const attempts=[],decode=(data,psm,preprocessing)=>{const token=String(data.text||'').trim().toUpperCase().replace(/\s+/g,'').replace(/[.,:;]+$/,'');const good=kind==='number'?/^\d{1,2}$/.test(token)&&Number(token)>0:/^[A-Z]$/.test(token),confidence=Number(data.confidence)||0;const read={token,confidence,psm,preprocessing,usable:good&&confidence>=55};attempts.push(read);return read;};
     let read=decode(data,10,'masked-circle-interior-with-white-border');
     // A failed character segmentation may be retried as one word. The source
     // glyph, label family and acceptance threshold stay unchanged.
     if(!read.usable){await worker.setParameters({tessedit_pageseg_mode:'8',tessedit_char_whitelist:whitelist});workerMode='8:'+whitelist;({data}=await worker.recognize(canvas,{}, {blocks:true}));read=decode(data,8,'masked-circle-interior-with-white-border');}
     if(!read.usable){const pixels=ctx.createImageData(canvas.width,canvas.height);pixels.data.set(maskedSource.data);for(let i=0;i<pixels.data.length;i+=4){const ink=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3<200?0:255;pixels.data.set([ink,ink,ink,255],i);}ctx.putImageData(pixels,0,0);await worker.setParameters({tessedit_pageseg_mode:'10',tessedit_char_whitelist:whitelist});workerMode='10:'+whitelist;({data}=await worker.recognize(canvas,{}, {blocks:true}));read=decode(data,10,'masked-circle-interior-threshold-200-with-white-border');}
     let labelConflict=false;
     // Numeric glyphs can remain confidently ambiguous (for example I/1/4).
     // Compare a second source-preserving contrast reading; never fill a
     // missing axis from its order. Conflicting valid reads stay explicit.
     if(read.usable&&kind==='number'){const pixels=ctx.createImageData(canvas.width,canvas.height);pixels.data.set(maskedSource.data);for(let i=0;i<pixels.data.length;i+=4){const ink=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3<140?0:255;pixels.data.set([ink,ink,ink,255],i);}ctx.putImageData(pixels,0,0);await worker.setParameters({tessedit_pageseg_mode:'10',tessedit_char_whitelist:whitelist});workerMode='10:'+whitelist;({data}=await worker.recognize(canvas,{}, {blocks:true}));const check=decode(data,10,'masked-circle-interior-threshold-140-with-white-border');labelConflict=check.usable&&check.token!==read.token;}
     if(!read.usable||labelConflict){const source=await native.render(view,[left,top,right-left,bottom-top],{factor:6,padding:24});nativeAttempt={status:source.status,reason:source.reason};if(source.status==='proposed'){const tile=source.canvas,tileCtx=tile.getContext('2d',{willReadFrequently:true}),pixels=tileCtx.getImageData(0,0,tile.width,tile.height),factor=source.provenance.scaleFactor,pad=source.provenance.padding,[cx,cy]=region.gridCircle.center,r=region.gridCircle.radius;try{for(let y=0;y<tile.height;y++)for(let x=0;x<tile.width;x++)if(Math.hypot((x-pad)/factor+left-cx,(y-pad)/factor+top-cy)>r*.7)pixels.data.set([255,255,255,255],(y*tile.width+x)*4);tileCtx.putImageData(pixels,0,0);let observed=null;for(const psm of [10,8]){await worker.setParameters({tessedit_pageseg_mode:String(psm),tessedit_char_whitelist:whitelist});workerMode=psm+':'+whitelist;({data}=await worker.recognize(tile,{}, {blocks:true}));observed=decode(data,psm,'retained-pdf-region-masked-circle');observed.nativeSource=source.provenance;if(observed.usable)break;}if(observed?.usable){if(read.usable&&observed.token!==read.token)labelConflict=true;read=observed;nativeSource=source.provenance;}}finally{tile.width=tile.height=1;}}}
     canvas.width=canvas.height=1;const {token,confidence}=read;
     {
      const circle=region.gridCircle,[cx,cy]=circle.center,r=circle.radius;
      const row={text:token,confidence,source:'ocr-local-grid-bubble',labelStatus:labelConflict?'conflict':read.usable?'proposed':'unresolved',box:[cx-r*.45,cy-r*.45,cx+r*.45,cy+r*.45],
       retry:{purpose:'source-raster-grid-bubble',gridCircle:JSON.parse(JSON.stringify(circle)),sourceViewId:view.id,sourceFrame:JSON.parse(JSON.stringify(view.frame)),region:[left,top,right-left,bottom-top],scale,psm:read.psm,padding,maskRadius:circle.radius*.7,preprocessing:read.preprocessing,attempts,labelConflict,...(nativeSource?{nativeSource}:{}),...(nativeAttempt?{nativeAttempt}:{})}};
      if(read.usable)view.payload.drawingReadings.rows.push(row);evidence.push({sourceViewId:view.id,...row});
     }
     continue;
    }
    canvas.width=canvas.height=1;for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){if(!line.text.trim()||!line.bbox)continue;const b=line.bbox,capture=block.readingCapture||{left,top,scale,padding,nativeSource,region:[left,top,right-left,bottom-top]},row={text:line.text.trim(),confidence:line.confidence,source:'ocr-local-region-retry',box:[(b.x0-capture.padding)/capture.scale+capture.left,(b.y0-capture.padding)/capture.scale+capture.top,(b.x1-capture.padding)/capture.scale+capture.left,(b.y1-capture.padding)/capture.scale+capture.top],retry:{originalText:region.row.text,originalConfidence:region.row.confidence,...(region.row.readingParts?{readingParts:JSON.parse(JSON.stringify(region.row.readingParts))}:{}),...(region.captionRegionEvidence?{captionRegionEvidence:JSON.parse(JSON.stringify(region.captionRegionEvidence))}:{}),region:capture.region,scale:capture.scale,padding:capture.padding,psm:block.readingPsm||7,...(readingAttempts?{readingAttempts}:{}),...(ocrMasks.length?{ocrMasks}:{}),...(capture.nativeSource?{nativeSource:capture.nativeSource}:{}),...(nativeAttempt?{nativeAttempt}:{}),purpose:region.purpose||(region.caption?'level-caption':region.dimension?'dimension-label':'opening-caption'),sourceViewId:view.id,sourceFrame:JSON.parse(JSON.stringify(view.frame))}};view.payload.drawingReadings.rows.push(row);evidence.push({sourceViewId:view.id,...row});}
   }
   evidence.push(...await refineHorizontalDimensions(next,buildingId,sourceImages,native,{progress,cancelled,budget:dimensionBudget}));
   evidence.push(...await refineVerticalDimensions(next,buildingId,sourceImages,native,{progress,cancelled,budget:dimensionBudget}));
   evidence.push(...await refineKeyedWallKeys(next,buildingId,sourceImages,native,worker,{progress,cancelled,discovery:keyDiscovery}));
   evidence.push(...await refineRoofPitches(next,buildingId,native,worker,{progress,cancelled}));
   evidence.push(...await refineOpeningFrames(next,buildingId,sourceImages,native,{progress,cancelled}));
  }finally{if(activeCanvas)activeCanvas.width=activeCanvas.height=1;try{await worker.terminate();}finally{await native.close();}}return {inventory:next,evidence};
 }
 root.MIRReconstructionReadings=Object.freeze({datumCaptionBands,datumCaptionRegions,readingCrop,fragmentedCaptions,neighbouringMeasurements,regions,openingRegions,gridRegions,workItems,captionGuideMasks,sourceTilePlan,sourceReader,dimensionWordRetry,mapDimensionProof,nativeEvidenceTile,nativeDimensionTile,horizontalDimensionCandidates,verifyHorizontalDimension,refineHorizontalDimensions,verticalDimensionPairs,verifyVerticalDimension,refineVerticalDimensions,refineKeyedWallKeys,refineRoofPitches,mapOpeningFrameProof,verifyOpeningFrame,refineOpeningFrames,refine});
})(window);
