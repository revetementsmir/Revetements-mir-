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
  const count=67, sheets={
   2:[[35,35,'PLAN DES FONDATIONS'],[35,320,'DIMENSIONS DU BATIMENT : 40 pi x 35 pi'],[35,280,'HAUTEUR DU SOLAGE APPARENTE : 2 pi']],
   3:[[35,35,'PLAN DU REZ-DE-CHAUSSEE']],
   5:[[35,35,'COUPE A-A'],[35,320,'HAUTEUR DES MURS : 25 pi'],[35,280,'MONTEE DU TOIT : 8 pi'],[35,240,'TOIT A DEUX VERSANTS']],
   67:[[85,35,'ELEVATION AVANT'],[385,35,'ELEVATION ARRIERE'],[45,270,'POUTRE DE SOUTIEN']]
  };
  const kids=Array.from({length:count},(_,i)=>(i+4)+' 0 R');
  object('<< /Type /Pages /Count '+count+' /Kids ['+kids.join(' ')+'] >>');
  object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const common=count+4, separate=new Map(Object.keys(sheets).map((key,i)=>[Number(key),common+1+i]));
  for(let n=1;n<=count;n++)object('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 620 420] /Resources << /Font << /F1 3 0 R >> >> /Contents '+(separate.get(n)||common)+' 0 R >>');
  const draw='0.3 0.4 0.6 RG 2 w 35 80 240 150 re S 335 80 240 150 re S';
  const stream=lines=>{
   const glass=lines.some(([, ,text])=>text==='ELEVATION AVANT')?' 0.13 0.11 0.52 rg 110 98 130 45 re f 0 g':'';
   const content=draw+glass+' '+lines.map(([x,y,text])=>'BT /F1 14 Tf 1 0 0 1 '+x+' '+y+' Tm ('+text+') Tj ET').join(' ');
   object('<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream');
  };
  stream([[35,35,'FICHE TECHNIQUE DES MATERIAUX - DONNEES GENERALES DU PROJET']]);
  for(const row of Object.values(sheets))stream(row);
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

function makeScan(file,jpeg){
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 780 500] /Resources << /XObject << /Scan 4 0 R >> >> /Contents 5 0 R >>',
  Buffer.concat([Buffer.from('<< /Type /XObject /Subtype /Image /Width 1560 /Height 1000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n'),jpeg,Buffer.from('\nendstream')]),
  '<< /Length 31 >>\nstream\nq 780 0 0 500 0 0 cm /Scan Do Q\nendstream'
 ];
 const parts=[Buffer.from('%PDF-1.4\n')],offsets=[0];
 let cursor=parts[0].length;
 for(const [i,object] of objects.entries()){
  const part=Buffer.concat([Buffer.from((i+1)+' 0 obj\n'),Buffer.from(object),Buffer.from('\nendobj\n')]);
  offsets.push(cursor);cursor+=part.length;parts.push(part);
 }
 const xref=offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('');
 parts.push(Buffer.from('xref\n0 6\n0000000000 65535 f \n'+xref+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+cursor+'\n%%EOF\n'));
 fs.writeFileSync(file,Buffer.concat(parts));
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
   const errors=[], warnings=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('console',message=>{if(['warning','error'].includes(message.type()))warnings.push(message.text());});
   await page.goto(('http://127.0.0.1:'+server.address().port)+'/plan.html');
   await page.locator('#import-pdf').click();
   assert.match(await page.locator('.mir-pdf-upload').innerText(),/150 Mo/);
   const file=page.locator('#mir-pdf-file');
   async function assertImportReady(){
    await page.waitForFunction(()=>!document.querySelector('#mir-pdf-file').disabled,null,{timeout:45000});
    const status=await page.locator('#mir-pdf-status').textContent(),message=await page.locator('#mir-pdf-error').textContent();
    assert.ok(await page.locator('#mir-pdf-final').isEnabled(),[status,message,...warnings,...errors].filter(Boolean).join('\n'));
   }
   if(width===390){
    await file.setInputFiles(path.join(tmp,'plan-hors-limite.pdf'));
    await page.locator('#mir-pdf-error').filter({hasText:/dépasse 150 Mo/}).waitFor();
    const jpeg=await page.evaluate(()=>{
     const canvas=document.createElement('canvas');canvas.width=1560;canvas.height=1000;
     const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1560,1000);
     ctx.fillStyle='#000';ctx.font='bold 75px Arial';ctx.fillText('FRONT ELEVATION',160,820);
     return canvas.toDataURL('image/jpeg').split(',')[1];
    });
    const scan=path.join(tmp,'plan-scanné.pdf');
    makeScan(scan,Buffer.from(jpeg,'base64'));
    await file.setInputFiles(scan);
    await assertImportReady();
    assert.match(await page.locator('#mir-pdf-assigned').innerText(),/Avant/);
    assert.match(await page.locator('#mir-pdf-volume-note').innerText(),/À compléter/);
    console.log('PASS 390 px : élévation repérée sur une feuille scannée, cotes manquantes signalées');
   }
   await file.setInputFiles(path.join(tmp,'plan-108mo.pdf'));
   await page.locator('#mir-pdf-final').waitFor();
   await assertImportReady();
   assert.equal(await page.locator('#mir-pdf-page-range, #mir-pdf-face, [data-page]').count(),0);
   assert.match(await page.locator('#mir-pdf-assigned').innerText(),/PLAN DES FONDATIONS[\s\S]*PLAN DU REZ-DE-CHAUSSEE/);
   assert.match(await page.locator('#mir-pdf-volume-note').innerText(),/s’ouvrira automatiquement/);
   assert.ok(await page.evaluate(()=>document.querySelector('#mir-pdf-import').scrollWidth<=document.querySelector('#mir-pdf-import').clientWidth+2));
   await page.locator('#mir-pdf-final').click();
   await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='plan-108mo');
   const active=await page.evaluate(async()=>{
    const p=await MIRProjectStore.getActive();
    return {bytes:p.source.bytes,ref:p.planData.referencePages.map(({page,kind})=>[page,kind]),faces:p.planData.faces.filter(f=>f.page).map(f=>[f.key,f.page,f.sourceCrop]),frontScale:p.planData.faces.find(f=>f.key==='front').calibration.referenceFt,dimensions:p.planData.dimensions,status:p.planData.dimensionStatus,hints:p.planData.structuralHints};
   });
   assert.ok(active.bytes>108*1024*1024);
   assert.deepEqual(active.ref,[[2,'foundation'],[3,'floor'],[5,'section']]);
   assert.deepEqual(active.faces.map(([key,number])=>[key,number]),[['front',67],['back',67]]);
   assert.equal(active.faces[0][2][2],active.faces[1][2][0],'Une feuille produit deux vues distinctes');
   assert.deepEqual(active.dimensions,{width:40*.3048,depth:35*.3048,wallHeight:25*.3048,roofRise:8*.3048});
   assert.equal(active.status,'detected');
   assert.ok(active.hints.some(h=>h.type==='beam'&&h.assignedView==='front'));
   await page.locator('#three-canvas').waitFor();
   await page.waitForFunction(()=>window.MIR_RENDER_DIAGNOSTICS?.rendered===true).catch(async error=>{
    const status=await page.evaluate(()=>({render:window.MIR_RENDER_DIAGNOSTICS,stage:document.querySelector('#stage-note')?.textContent}));
    throw Error(`Rendu du PDF à ${width}px : ${JSON.stringify(status)}\n${[...warnings,...errors].join('\n')}`,{cause:error});
   });
   assert.equal(active.frontScale,null,'Le vitrage du PDF est visible même sans échelle de métrés');
   const texture=await page.evaluate(()=>{
    const canvas=document.querySelector('#three-canvas'),diagnostics=window.MIR_RENDER_DIAGNOSTICS;
    const front=diagnostics.hitSurfaces.find(surface=>surface.type==='wall'&&surface.view==='front');
    const {width,height}=canvas.getBoundingClientRect(),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const polygon=front?.screenPolygon||[];
    const inside=(x,y)=>polygon.reduce((hit,[a,b],i)=>{
     const [c,d]=polygon[(i+1)%polygon.length];
     if((b>y)===(d>y))return hit;
     return x<(c-a)*(y-b)/(d-b)+a?!hit:hit;
    },false);
    let glassPixels=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
     const i=(y*canvas.width+x)*4;
     if(pixels[i+2]-pixels[i]>35&&pixels[i+2]-pixels[i+1]>35&&inside((x+.5)*width/canvas.width,(y+.5)*height/canvas.height))glassPixels++;
    }
    return {errors:diagnostics.errors,missing:diagnostics.missingViews,scale:diagnostics.textureScales.front?.scaleStatus,glassPixels};
   });
   assert.deepEqual(texture.errors,[]);
   assert.ok(!texture.missing.includes('front'));
   assert.equal(texture.scale,'fit-to-wall');
   assert.ok(texture.glassPixels>20,`Vitrage bleu absent du mur avant en ${width} px (${texture.glassPixels} pixels)`);
   assert.equal(await page.evaluate(()=>window.MIR_RENDER_DIAGNOSTICS.foundationDrop),2*.3048);
   assert.equal(await page.evaluate(()=>window.MIR_STUDY.snapshot().roofStyle),'gable');
   await page.locator('#volume-settings').click();
   await page.locator('.volume-sheets summary').click();
   await page.locator('#volume-sheet').selectOption('0');
   await page.waitForFunction(()=>document.querySelector('.volume-sheets img').naturalWidth>0);
   assert.equal(await page.locator('[data-volume="width"]').inputValue(),'40');
   assert.deepEqual(errors,[]);
   console.log('PASS '+width+' px : PDF 108 Mo / 67 pages, cinq vues repérées sans sélection et rendu 3D automatique');
   await page.goto('http://127.0.0.1:'+server.address().port+'/plan.html?annoter');
   const annotations=page.getByRole('complementary',{name:'Annotations du Studio'});
   await annotations.getByRole('button',{name:'Pointer un élément'}).click();
   await page.locator('#import-pdf').click();
   await annotations.getByRole('textbox',{name:'Note',exact:true}).fill('Agrandir ce bouton');
   await annotations.getByRole('button',{name:'Ajouter',exact:true}).click();
   assert.match(await annotations.getByRole('listitem').innerText(),/Importer mon plan PDF.*Agrandir ce bouton/);
   assert.equal(await page.locator('#import-pdf.mir-annotation-selected').count(),1);
   assert.ok(await page.locator(".mir-annotation-pin").isVisible());
   assert.ok(await annotations.getByRole('button',{name:'Copier les notes'}).isEnabled());
   console.log('PASS '+width+' px : sélection et ajout d’une annotation du Studio');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
