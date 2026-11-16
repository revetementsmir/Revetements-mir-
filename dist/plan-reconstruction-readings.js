/* Targeted local OCR retries keep the first readings and every source region. */
(function(root){
 'use strict';const BASE=new URL('.',document.currentScript.src),asset=p=>new URL(p,BASE).href;
 async function dependencies(){if(root.Tesseract)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=asset('vendor/tesseract/tesseract.min.js');s.onload=resolve;s.onerror=()=>reject(Error('Lecture locale indisponible.'));document.head.append(s);});}
 function regions(view){const rows=view.payload.drawingReadings?.rows||[],out=[];for(const row of rows){const text=row.text.trim(),caption=/plancher|floor|dalle|slab/i.test(text)&&!/etage|upper|r[.\s-]*d[.\s-]*c|ground/i.test(text),dimension=(row.confidence??100)<60&&/^[\dOGB\s'"’′.,−-]{2,18}$/.test(text),window=/^[\dOGB][\dOGB\s'"*.,−-]{0,12}[x×][\dOGB\s'"*°.,−-]{1,12}$/i.test(text);if(!row.box||!caption&&!dimension&&!window||row.box[0]>view.payload.sourceWidth*.81)continue;if(out.some(x=>Math.abs(x.row.box[0]-row.box[0])<8&&Math.abs(x.row.box[1]-row.box[1])<8))continue;out.push({row,caption,dimension,window});}return out.sort((a,b)=>Number(b.caption)-Number(a.caption)||Number(b.window)-Number(a.window)).slice(0,6);}
 async function refine(inventory,buildingId,{progress=()=>{},cancelled=()=>false}={}){
  const next=JSON.parse(JSON.stringify(inventory)),views=next.views.filter(v=>v.buildingId===buildingId&&['floor','elevation'].includes(v.kind)&&v.payload.sourceImage),work=views.flatMap(view=>regions(view).map(region=>({view,region}))).slice(0,24),evidence=[];if(!work.length)return {inventory:next,evidence};
  await dependencies();const worker=await root.Tesseract.createWorker('eng',1,{workerPath:asset('vendor/tesseract/worker.min.js'),corePath:asset('vendor/tesseract-core/'),langPath:asset('vendor/tessdata/'),workerBlobURL:false,gzip:true});
  try{await worker.setParameters({tessedit_pageseg_mode:'7',preserve_interword_spaces:'1'});const images=new Map();
   for(let i=0;i<work.length;i++){
    if(cancelled())break;const {view,region}=work[i];progress(i+1,work.length,view.page);let image=images.get(view.id);if(!image){image=new Image();image.src=view.payload.sourceImage;await image.decode();images.set(view.id,image);}
    const [x0,y0,x1,y1]=region.row.box,font=Math.max(5,y1-y0),w=view.payload.sourceWidth,h=view.payload.sourceHeight,left=Math.max(0,Math.floor(x0-font*(region.caption?1.5:.5))),top=Math.max(0,Math.floor(y0-font*.35)),right=Math.min(w,Math.ceil(x1+font*(region.caption?3:.5))),bottom=Math.min(h,Math.ceil(y1+font*.4)),scale=4,canvas=document.createElement('canvas');canvas.width=(right-left)*scale;canvas.height=(bottom-top)*scale;canvas.getContext('2d').drawImage(image,left,top,right-left,bottom-top,0,0,canvas.width,canvas.height);
    const {data}=await worker.recognize(canvas,{}, {blocks:true});canvas.width=canvas.height=1;
    for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){if(!line.text.trim()||!line.bbox)continue;const b=line.bbox,row={text:line.text.trim(),confidence:line.confidence,source:'ocr-local-region-retry',box:[b.x0/scale+left,b.y0/scale+top,b.x1/scale+left,b.y1/scale+top],retry:{originalText:region.row.text,originalConfidence:region.row.confidence,region:[left,top,right-left,bottom-top],scale,psm:7,sourceViewId:view.id,sourceFrame:JSON.parse(JSON.stringify(view.frame))}};view.payload.drawingReadings.rows.push(row);evidence.push({sourceViewId:view.id,...row});}
   }
  }finally{await worker.terminate();}return {inventory:next,evidence};
 }
 root.MIRReconstructionReadings=Object.freeze({regions,refine});
})(window);
