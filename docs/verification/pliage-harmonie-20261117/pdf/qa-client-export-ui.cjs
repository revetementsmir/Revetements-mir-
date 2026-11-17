'use strict';
/* Render actual FR-CA and EN-CA customer PDFs in Chrome, without external calls.
 * Both languages must retain identical underlying cart records. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../../../../dist'),artifacts=path.resolve(__dirname,'ui-exports');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.png':'image/png','.ttf':'font/ttf'};
const server=http.createServer((request,response)=>{
 const file=path.resolve(dist,'.'+decodeURIComponent((request.url||'/').split('?')[0]));
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end('Not found');return;}
 response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
 fs.createReadStream(file).pipe(response);
});
async function main(){
 fs.mkdirSync(artifacts,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 let browser,context;
 try{
  try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
  catch(e){const bin=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].find(x=>x&&fs.existsSync(x));if(!bin)throw e;browser=await chromium.launch({executablePath:bin,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
  context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,reducedMotion:'reduce'});
  await context.route('**/*',r=>(r.request().url().startsWith(base)||r.request().url().startsWith('blob:'))&&r.request().method()==='GET'?r.continue():r.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'selection.html?mir-locale-preview=1',{waitUntil:'domcontentloaded'});
  const material=await page.evaluate(async()=>{
   const res=await fetch('./catalogue-fd6866b49d21.json'),data=await res.json();
   const m=data.materials.find(x=>x.id==='hardieplank-select-625')||data.materials.find(x=>x.brand&&x.name&&x.status!=='pending_identity');
   if(!m)throw Error('No local catalogue fixture');
   return {materialId:m.id,brand:m.brand,name:m.name,colorId:m.colors?.[0]?.id||null,colorName:m.colors?.[0]?.name||'Unspecified',formatId:null,format:null,formatName:null,quantity:55,unit:'pi²'};
  });
  const input={version:1,project:'Maison MIR QA',items:[material]},saved=JSON.stringify(input);
  await page.evaluate(value=>localStorage.setItem('mir-shopping-list-v1',value),saved);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('.selection-item').length===1&&document.querySelector('#selection-export-pdf')&&!document.querySelector('#selection-export-pdf').disabled);
  const results=[];
  for(const lang of ['fr-CA','en-CA']){
   await page.locator('button[data-mir-locale="'+lang+'"]').click();
   await page.waitForFunction(l=>document.documentElement.lang===l,lang);
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),saved,'pre-export cart unchanged');
   await page.locator('#selection-export-pdf').click();
   const selector=page.locator('#mir-pdf-ready a[download]');
   await selector.waitFor({timeout:60000});
   const filename=await selector.getAttribute('download');
   const expected=lang==='en-CA'?'MIR-materials-selection-en-CA.pdf':'MIR-selection-materiaux.pdf';
   assert.equal(filename,expected,'correct language-specific file name');
   const rendered=await page.evaluate(async()=>{
    const anchor=document.querySelector('#mir-pdf-ready a[download]');
    if(!anchor)throw Error('PDF not ready');
    const buffer=await (await fetch(anchor.href)).arrayBuffer(),pdfByteLength=buffer.byteLength; // PDF.js may transfer/detach the input ArrayBuffer
    const PDF=await import('./vendor/pdfjs/pdf.min.mjs');
    PDF.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',location.href).href;
    const pdfDocument=await PDF.getDocument({data:new Uint8Array(buffer),useSystemFonts:true,isEvalSupported:false}).promise;
    const page=await pdfDocument.getPage(1),viewport=page.getViewport({scale:.82});
    const canvas=window.document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    const contents=await page.getTextContent();
    return {pages:pdfDocument.numPages,bytes:pdfByteLength,text:contents.items.map(x=>x.str).join(' '),image:canvas.toDataURL('image/png').split(',')[1]};
   });
   console.log('MIR PDF debug',lang,{bytes:rendered.bytes,pngLength:rendered.image.length,textLength:rendered.text.length});
   assert.ok(rendered.bytes>0&&Buffer.from(rendered.image,'base64').subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'PDF.js must parse a nonempty PDF and rasterize a valid PNG');
   console.log('MIR PDF proof',lang,'bytes',rendered.bytes,'png-base64-length',rendered.image.length,'text-length',rendered.text.length);
   assert.ok(rendered.pages>=1,'PDF must have at least one sheet');
   assert.match(rendered.text,/Maison MIR QA/,'user project name preserved');
   if(lang==='en-CA'){
    assert.match(rendered.text,/MATERIALS SELECTION|Materials selection/,'English heading in extracted real PDF');
    assert.match(rendered.text,/NOT an order/,'English warning in real PDF');
    assert.doesNotMatch(rendered.text,/ne constitue PAS une commande|SÉLECTION DE MATÉRIAUX/,'no FR disclaimer in English PDF');
   }else{
    assert.match(rendered.text,/SÉLECTION DE MATÉRIAUX|Sélection de matériaux/,'French heading in extracted real PDF');
    assert.match(rendered.text,/ne constitue PAS une commande/,'French warning in real PDF');
   }
   const image=Buffer.from(rendered.image,'base64');
   fs.writeFileSync(path.join(artifacts,'mir-customer-pdf-'+lang+'.png'),image);
   results.push({locale:lang,pages:rendered.pages,bytes:rendered.bytes,text:rendered.text.slice(0,450)});
   
   const downloadEvent=page.waitForEvent('download');
   await selector.click();
   const downloaded=await downloadEvent;
   assert.equal(downloaded.suggestedFilename(),expected);
   await downloaded.saveAs(path.join(artifacts,expected));
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),saved,'cart still byte-identical after PDF');
  }
  assert.equal(results[0].pages,results[1].pages,'same number of pages in both languages');
  assert.deepEqual(errors,[],'no browser script errors');
  console.log('MIR bilingue PDF real Chrome/render:',JSON.stringify(results));
 }finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
