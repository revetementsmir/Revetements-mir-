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
 function regions(view,image){
  const rows=view.payload.drawingReadings?.rows||[],references=image&&root.MIRPlanReconstruction?.references?root.MIRPlanReconstruction.references(view,image):[],candidates=[...fragmentedCaptions(view),...neighbouringMeasurements(view,references)];
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
 function gridRegions(view,image){
  // Grid numerals and letters are too small for full-page OCR in large PDFs.
  // Source ink first finds candidate circles. Local OCR reads only interiors.
  const layout=view.kind==='floor'?'floor':view.kind==='elevation'&&['front','back'].includes(view.direction)?'elevation-number':view.kind==='elevation'&&['left','right'].includes(view.direction)?'elevation-letter':null;
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
  const views=inventory.views.filter(v=>v.buildingId===buildingId&&['floor','elevation'].includes(v.kind)&&v.payload.sourceImage).sort((a,b)=>Number(b.kind==='floor')-Number(a.kind==='floor'));
  // Grid recognition runs only for separate floor plans that actually need
  // cross-level XY registration. Single-floor clients keep their OCR budget.
  const multiLevel=new Set(views.filter(v=>v.kind==='floor').map(v=>v.levelId).filter(Boolean)).size>1;
  return views.flatMap(view=>[...regions(view,sourceImages[view.id]),...(multiLevel?gridRegions(view,sourceImages[view.id]):[]),...openingRegions(view,sourceImages[view.id]).map(region=>({...region,priority:4}))].map(region=>({view,region}))).sort((a,b)=>a.region.priority-b.region.priority).slice(0,multiLevel?64:42);
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
 async function refine(inventory,buildingId,{images:sourceImages={},progress=()=>{},cancelled=()=>false,sourceFile=null}={}){
  const next=JSON.parse(JSON.stringify(inventory)),work=workItems(next,buildingId,sourceImages),evidence=[],native=sourceReader(sourceFile,next.files||[]);if(!work.length)return {inventory:next,evidence};
  await dependencies();const worker=await root.Tesseract.createWorker('eng',1,{workerPath:asset('vendor/tesseract/worker.min.js'),corePath:asset('vendor/tesseract-core/'),langPath:asset('vendor/tessdata/'),workerBlobURL:false,gzip:true});
  let activeCanvas=null;try{await worker.setParameters({tessedit_pageseg_mode:'7',preserve_interword_spaces:'1'});let workerMode='7';const images=new Map();
   for(let i=0;i<work.length;i++){
    if(cancelled())break;const {view,region}=work[i];progress(i+1,work.length,view.page);let image=images.get(view.id);if(!image){image=new Image();image.src=view.payload.sourceImage;await image.decode();images.set(view.id,image);}
    const [x0,y0,x1,y1]=region.row.box,font=Math.max(5,y1-y0),w=view.payload.sourceWidth,h=view.payload.sourceHeight,completeCaption=region.caption&&/etage?|upper|ground|r[.\s-]*d[.\s-]*c|(?:niveau|level|niv\.?)\s*[-:#]?\s*\d+/i.test(region.row.text),left=Math.max(0,Math.floor(x0-(region.grid?0:font*(completeCaption?.25:region.caption?1.5:.5)))),top=Math.max(0,Math.floor(y0-font*(region.grid||completeCaption?0:region.tight?.1:.35))),right=Math.min(w,Math.ceil(x1+(region.grid?0:font*(completeCaption?1:region.caption?3:.5)))),bottom=Math.min(h,Math.ceil(y1+font*(region.grid||completeCaption?0:region.tight?.1:.4))),initialScale=region.grid?5:4;let scale=initialScale,padding=region.grid?scale*4:0,canvas=document.createElement('canvas'),nativeSource=null,nativeAttempt=null,ocrMasks=[];activeCanvas=canvas;canvas.width=(right-left)*scale+padding*2;canvas.height=(bottom-top)*scale+padding*2;let ctx=canvas.getContext('2d',{willReadFrequently:!!region.grid});if(region.grid){ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(image,left,top,right-left,bottom-top,padding,padding,(right-left)*scale,(bottom-top)*scale);
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
    canvas.width=canvas.height=1;for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){if(!line.text.trim()||!line.bbox)continue;const b=line.bbox,capture=block.readingCapture||{left,top,scale,padding,nativeSource,region:[left,top,right-left,bottom-top]},row={text:line.text.trim(),confidence:line.confidence,source:'ocr-local-region-retry',box:[(b.x0-capture.padding)/capture.scale+capture.left,(b.y0-capture.padding)/capture.scale+capture.top,(b.x1-capture.padding)/capture.scale+capture.left,(b.y1-capture.padding)/capture.scale+capture.top],retry:{originalText:region.row.text,originalConfidence:region.row.confidence,...(region.row.readingParts?{readingParts:JSON.parse(JSON.stringify(region.row.readingParts))}:{}),region:capture.region,scale:capture.scale,padding:capture.padding,psm:block.readingPsm||7,...(readingAttempts?{readingAttempts}:{}),...(ocrMasks.length?{ocrMasks}:{}),...(capture.nativeSource?{nativeSource:capture.nativeSource}:{}),...(nativeAttempt?{nativeAttempt}:{}),purpose:region.purpose||(region.caption?'level-caption':region.dimension?'dimension-label':'opening-caption'),sourceViewId:view.id,sourceFrame:JSON.parse(JSON.stringify(view.frame))}};view.payload.drawingReadings.rows.push(row);evidence.push({sourceViewId:view.id,...row});}
   }
  }finally{if(activeCanvas)activeCanvas.width=activeCanvas.height=1;try{await worker.terminate();}finally{await native.close();}}return {inventory:next,evidence};
 }
 root.MIRReconstructionReadings=Object.freeze({fragmentedCaptions,neighbouringMeasurements,regions,openingRegions,gridRegions,workItems,captionGuideMasks,sourceTilePlan,sourceReader,dimensionWordRetry,refine});
})(window);
