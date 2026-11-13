import * as pdfjs from './vendor/pdfjs/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc='./vendor/pdfjs/pdf.worker.min.mjs';
const id=new URLSearchParams(location.search).get('id');let encoded;
document.querySelector('#back').onclick=()=>history.back();
document.querySelector('#share').onclick=async()=>{if(!encoded)return;try{await MIRAndroid.Native.pdf({data:encoded,name:id.slice(37),action:'share'});}catch(error){document.querySelector('#status').textContent=error.message;}};
try{
 const result=await MIRAndroid.Native.readPdf({id});encoded=result.data;
 const pdf=await pdfjs.getDocument({data:Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))}).promise;
 for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),viewport=page.getViewport({scale:1.5}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;canvas.setAttribute('aria-label','Page '+i+' sur '+pdf.numPages);document.querySelector('#pages').append(canvas);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;}
 document.querySelector('#status').textContent=pdf.numPages+' page(s). Document conservé temporairement dans le stockage privé de cette application.';
}catch(error){document.querySelector('#status').textContent=error.message||'Document indisponible';}
