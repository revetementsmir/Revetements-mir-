const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs');
const http=require('node:http');

function makePdf(file){
 const handle=fs.openSync(file,'w');
 const offsets=[0];
 let cursor=0;
 const write=text=>{cursor+=fs.writeSync(handle,text,cursor,'ascii');};
 const object=content=>{
  offsets.push(cursor);
  write((offsets.length-1)+' 0 obj\n'+content+'\nendobj\n');
 };
 try {
  write('%PDF-1.4\n');
  object('<< /Type /Catalog /Pages 2 0 R >>');
  const kids=Array.from({length:67},(_,i)=>(i+5)+' 0 R');
  object('<< /Type /Pages /Count 67 /Kids ['+kids.join(' ')+'] >>');
  object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const content='0.3 0.4 0.6 RG 2 w 30 30 150 150 re S BT /F1 16 Tf 40 50 Td (MIR - Plan de test) Tj ET';
  object('<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream');
  for(const _ of kids)object('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 220 220] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>');
  const length=108*1024*1024;
  offsets.push(cursor);
  write((offsets.length-1)+' 0 obj\n<< /Length '+length+' >>\nstream\n');
  cursor+=length;
  write('\nendstream\nendobj\n');
  const xref=cursor;
  write('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
  for(const offset of offsets.slice(1))write(String(offset).padStart(10,'0')+' 00000 n \n');
  write('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 }finally{fs.closeSync(handle);}
}

const dist=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const filename=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname);
 if(!filename.startsWith(dist+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){
  res.writeHead(404).end();return;
 }
 res.setHeader('Content-Type',mime[path.extname(filename)]||'application/octet-stream');
 fs.createReadStream(filename).pipe(res);
});
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mir-pdf-'));
 let browser;
 try {
  makePdf(path.join(tmp,'plan-108mo.pdf'));
  const oversize=path.join(tmp,'plan-hors-limite.pdf');
  fs.closeSync(fs.openSync(oversize,'w'));
  fs.truncateSync(oversize,150*1024*1024+1);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(('http://127.0.0.1:'+server.address().port)+'/plan.html');
   await page.locator('#import-pdf').click();
   assert.match(await page.locator('.mir-pdf-upload').innerText(),/150 Mo/);
   const file=page.locator('#mir-pdf-file');
   if(width===390){
    await file.setInputFiles(path.join(tmp,'plan-hors-limite.pdf'));
    await page.locator('#mir-pdf-error').filter({hasText:/dépasse 150 Mo/}).waitFor();
   }
   await file.setInputFiles(path.join(tmp,'plan-108mo.pdf'));
   await page.waitForFunction(()=>document.querySelector('#mir-pdf-status').textContent.startsWith('Page 1 prête.'),null,{timeout:45000});
   const range=page.locator('#mir-pdf-page-range');
   await range.fill('70');
   await range.press('Enter');
   await page.locator('#mir-pdf-error').filter({hasText:/1 à 67/}).waitFor();
   await range.fill('2-3, 67');
   await range.press('Enter');
   await page.waitForFunction(()=>document.querySelector('#mir-pdf-status').textContent.startsWith('Page 2 prête.'));
   assert.deepEqual(await page.locator('[data-page]').allTextContents(),['2Page 2','3Page 3','67Page 67']);
   const role=page.locator('#mir-pdf-face');
   await role.selectOption('foundation');
   await page.locator('#mir-pdf-assign').click();
   await page.locator('[data-page="3"]').click();
   await role.selectOption('floor');
   await page.locator('#mir-pdf-level').fill('Rez-de-chaussée');
   await page.locator('#mir-pdf-assign').click();
   await page.locator('[data-page="67"]').click();
   await role.selectOption('front');
   await page.locator('#mir-pdf-assign').click();
   await role.selectOption('right');
   await page.locator('#mir-pdf-assign').click();
   await page.locator('[data-remove-pdf-sheet="right"]').click();
   assert.equal(await page.locator('[data-remove-pdf-sheet="right"]').count(),0);
   assert.ok(await page.evaluate(()=>document.querySelector('#mir-pdf-import').scrollWidth<=document.querySelector('#mir-pdf-import').clientWidth+2));
   await page.locator('#mir-pdf-final').click();
   await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='plan-108mo');
   const active=await page.evaluate(async()=>{
    const p=await MIRProjectStore.getActive();
    return {bytes:p.source.bytes,ref:p.planData.referencePages.map(({page,kind})=>[page,kind]),front:p.planData.faces.find(f=>f.key==='front').page};
   });
   assert.ok(active.bytes>108*1024*1024);
   assert.deepEqual(active.ref,[[2,'foundation'],[3,'floor']]);
   assert.equal(active.front,67);
   await page.locator('#volume-settings').click();
   await page.locator('.volume-sheets summary').click();
   await page.locator('#volume-sheet').selectOption('0');
   await page.waitForFunction(()=>document.querySelector('.volume-sheets img').naturalWidth>0);
   for(const [key,value] of Object.entries({width:40,depth:35,wallHeight:25,roofRise:8}))await page.locator('[data-volume="'+key+'"]').fill(String(value));
   await page.locator('#roof-style').selectOption('gable');
   await page.locator('#apply-volume').click();
   await page.locator('#view-3d').click();
   await page.locator('#three-canvas').waitFor();
   assert.deepEqual(errors,[]);
   console.log('PASS '+width+' px : PDF 108 Mo / 67 pages, filtre, classement, reprise des feuilles et rendu 3D');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
