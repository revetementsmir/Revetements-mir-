/* Targeted local OCR retries keep the first readings and every source region. */
(function(root){
 'use strict';const BASE=new URL('.',document.currentScript.src),asset=p=>new URL(p,BASE).href;
 async function dependencies(){if(root.Tesseract)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=asset('vendor/tesseract/tesseract.min.js');s.onload=resolve;s.onerror=()=>reject(Error('Lecture locale indisponible.'));document.head.append(s);});}
 function regions(view,image){
  const rows=view.payload.drawingReadings?.rows||[],references=image&&root.MIRPlanReconstruction?.references?root.MIRPlanReconstruction.references(view,image):[],candidates=[];
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
   const text=String(row.text||'').trim(),caption=/plancher|floor|dalle|slab/i.test(text)&&!/etage|upper|r[.\s-]*d[.\s-]*c|ground/i.test(text),dimension=(row.confidence??100)<70&&/^[\dOGB\s'"’′.,/−-]{2,24}$/.test(text),window=/^[\dOGB][\dOGB\s'"*.,/−-]{0,16}[x×][\dOGB\s'"*°.,/−-]{1,16}$/i.test(text);
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
  if(view.kind!=='floor'||!image||!root.MIRGridRegistration?.bubbleRegions)return [];
  const detected=root.MIRGridRegistration.bubbleRegions(image);
  if(detected.status!=='proposed')return [];
  return detected.bubbles.slice(0,40).map(circle=>{
   const [x,y]=circle.center,half=Math.max(3,circle.radius*.48);
   return {row:{text:'',box:[x-half,y-half,x+half,y+half],confidence:0},
    priority:1.5,grid:true,tight:true,gridCircle:JSON.parse(JSON.stringify(circle)),
    purpose:'source-raster-grid-bubble'};
  });
 }
 function workItems(inventory,buildingId,sourceImages={}){
  const views=inventory.views.filter(v=>v.buildingId===buildingId&&['floor','elevation'].includes(v.kind)&&v.payload.sourceImage).sort((a,b)=>Number(b.kind==='floor')-Number(a.kind==='floor'));
  // Scale and level readings from every contributing view precede opening
  // details, while retaining the bounded six-label / 42-region OCR budget.
  return views.flatMap(view=>[...regions(view,sourceImages[view.id]),...gridRegions(view,sourceImages[view.id]),...openingRegions(view,sourceImages[view.id]).map(region=>({...region,priority:4}))].map(region=>({view,region}))).sort((a,b)=>a.region.priority-b.region.priority).slice(0,64);
 }
 async function refine(inventory,buildingId,{images:sourceImages={},progress=()=>{},cancelled=()=>false}={}){
  const next=JSON.parse(JSON.stringify(inventory)),work=workItems(next,buildingId,sourceImages),evidence=[];if(!work.length)return {inventory:next,evidence};
  await dependencies();const worker=await root.Tesseract.createWorker('eng',1,{workerPath:asset('vendor/tesseract/worker.min.js'),corePath:asset('vendor/tesseract-core/'),langPath:asset('vendor/tessdata/'),workerBlobURL:false,gzip:true});
  try{await worker.setParameters({tessedit_pageseg_mode:'7',preserve_interword_spaces:'1'});let workerMode='7';const images=new Map();
   for(let i=0;i<work.length;i++){
    if(cancelled())break;const {view,region}=work[i];progress(i+1,work.length,view.page);let image=images.get(view.id);if(!image){image=new Image();image.src=view.payload.sourceImage;await image.decode();images.set(view.id,image);}
    const [x0,y0,x1,y1]=region.row.box,font=Math.max(5,y1-y0),w=view.payload.sourceWidth,h=view.payload.sourceHeight,left=Math.max(0,Math.floor(x0-(region.grid?0:font*(region.caption?1.5:.5)))),top=Math.max(0,Math.floor(y0-font*(region.grid?0:region.tight?.1:.35))),right=Math.min(w,Math.ceil(x1+(region.grid?0:font*(region.caption?3:.5)))),bottom=Math.min(h,Math.ceil(y1+font*(region.grid?0:region.tight?.1:.4))),scale=region.grid?5:4,canvas=document.createElement('canvas');canvas.width=(right-left)*scale;canvas.height=(bottom-top)*scale;canvas.getContext('2d').drawImage(image,left,top,right-left,bottom-top,0,0,canvas.width,canvas.height);
    const desired=region.grid?'10':'7';
    if(workerMode!==desired){await worker.setParameters({tessedit_pageseg_mode:desired,tessedit_char_whitelist:region.grid?'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ':''});workerMode=desired;}
    const {data}=await worker.recognize(canvas,{}, {blocks:true});canvas.width=canvas.height=1;
    if(region.grid){
     const kind=region.gridCircle.kind,token=String(data.text||'').trim().toUpperCase().replace(/\\s+/g,'').replace(/[.,:;]+$/,'');
     const good=kind==='number'?/^\\d{1,2}$/.test(token)&&Number(token)>0:/^[A-Z]$/.test(token);
     const confidence=Number(data.confidence)||0;
     if(good&&confidence>=55){
      const circle=region.gridCircle,[cx,cy]=circle.center,r=circle.radius;
      const row={text:token,confidence,source:'ocr-local-grid-bubble',box:[cx-r*.45,cy-r*.45,cx+r*.45,cy+r*.45],
       retry:{purpose:'source-raster-grid-bubble',gridCircle:JSON.parse(JSON.stringify(circle)),sourceViewId:view.id,sourceFrame:JSON.parse(JSON.stringify(view.frame)),region:[left,top,right-left,bottom-top],scale,psm:10}};
      view.payload.drawingReadings.rows.push(row);evidence.push({sourceViewId:view.id,...row});
     }
     continue;
    }
    for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){if(!line.text.trim()||!line.bbox)continue;const b=line.bbox,row={text:line.text.trim(),confidence:line.confidence,source:'ocr-local-region-retry',box:[b.x0/scale+left,b.y0/scale+top,b.x1/scale+left,b.y1/scale+top],retry:{originalText:region.row.text,originalConfidence:region.row.confidence,region:[left,top,right-left,bottom-top],scale,psm:7,purpose:region.purpose||(region.caption?'level-caption':region.dimension?'dimension-label':'opening-caption'),sourceViewId:view.id,sourceFrame:JSON.parse(JSON.stringify(view.frame))}};view.payload.drawingReadings.rows.push(row);evidence.push({sourceViewId:view.id,...row});}
   }
  }finally{await worker.terminate();}return {inventory:next,evidence};
 }
 root.MIRReconstructionReadings=Object.freeze({regions,openingRegions,gridRegions,workItems,refine});
})(window);
