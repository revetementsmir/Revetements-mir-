'use strict';
/* Independent browser QA. Real local engine and synthetic PDFs only. No real transport. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{once}=require('node:events'),{chromium}=require('playwright'),{PNG}=require('pngjs');
const {startPaintProof,finishPaintProof,verifyStudioPDF}=require('./helpers/mir-studio-pdf-proof.cjs');
const repo=path.resolve(__dirname,'..'),reference=path.resolve(process.env.MIR_STUDIO_HARMONY_REFERENCE_REPO||repo);
const out=path.resolve(process.env.MIR_STUDIO_HARMONY_OUT||path.join(repo,'docs/verification/studio-harmonie-20261118/qa'));
const baseline='e0cd92d9e6dd01b3f6697dd7de972df95839c8e1',phase=process.env.MIR_STUDIO_HARMONY_PHASE||'before';
const previewRoot=path.resolve(process.env.MIR_STUDIO_HARMONY_PREVIEW_DIR||path.join(repo,'.prestige-preview'));
const sizes=[{width:1440,height:900},{width:834,height:1194},{width:390,height:844}],locales=['fr-CA','en-CA'];
const filters=(process.env.MIR_STUDIO_HARMONY_CHECKS||'').split(',').filter(Boolean),report={phase,baseline,generatedAt:new Date().toISOString(),captures:[],checks:[],errors:[],consoleErrors:[],httpErrors:[],blocked:[]};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),folder=path.join(out,phase),fixture=path.join(out,'fixtures/studio-harmony-synthetic-67-pages.pdf');
const norm=s=>String(s).replace(/\s+/g,' ').trim(),executingTestSha256=sha(fs.readFileSync(__filename));
function committed(file){return execFileSync('git',['show',baseline+':dist/'+file],{cwd:reference,maxBuffer:50*1024*1024,stdio:['ignore','pipe','ignore']});}
async function serve(){const cache=new Map(),root=phase==='preview'?previewRoot:path.join(repo,'dist');const server=http.createServer((req,res)=>{if(req.method!=='GET')return res.writeHead(405).end();try{const file=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\/+/,''),absolute=path.resolve(root,file);if(!absolute.startsWith(root+path.sep))throw Error('path');if(!cache.has(file))cache.set(file,phase==='before'?committed(file):fs.readFileSync(absolute));res.writeHead(200,{'cache-control':'no-store','content-type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.pdf':'application/pdf','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream'});res.end(cache.get(file));}catch{res.writeHead(404).end();}});server.listen(0,'127.0.0.1');await once(server,'listening');return{origin:'http://127.0.0.1:'+server.address().port,cache,close:()=>new Promise(r=>server.close(r))};}
async function ready(p,studio=false){await p.waitForFunction(()=>!!window.MIRClientLocale&&!!window.MIRPrestige);if(studio)await p.waitForFunction(()=>typeof window.MIR_STUDY?.snapshot==='function',null,{timeout:60000});await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height;}).map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
async function rendered(p){await p.waitForFunction(()=>window.MIR3D?.diagnostics(document.querySelector('#three-canvas'))?.rendered===true,null,{timeout:60000});}
async function language(p,locale){const home=p.locator('[data-home-locale="'+locale+'"]');const button=await home.isVisible()?home:p.locator('.mir-client-locale-switch button[lang="'+locale+'"]');if(!await button.isVisible())await p.locator('.mir-client-menu-button').click();await button.click();await p.waitForFunction(l=>document.documentElement.lang===l,locale);if(await p.locator('.mir-client-menu-button').getAttribute('aria-expanded')==='true')await p.keyboard.press('Escape');}
async function open(browser,srv,size,locale,file='plan.html',options={}){const context=await browser.newContext({viewport:size,deviceScaleFactor:options.dpr||1,hasTouch:size.width<1000,isMobile:false,reducedMotion:'reduce',locale:'fr-CA',serviceWorkers:'block'});if(phase!=='preview')await context.addInitScript(locale=>localStorage.setItem('mir-client-locale-v1',locale),locale);await context.route('**/*',route=>{const req=route.request();if(new URL(req.url()).origin===srv.origin&&req.method()==='GET')return route.continue();report.blocked.push({url:req.url(),method:req.method()});return route.abort();});const p=await context.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>report.errors.push({file,size,locale,message:e.message}));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push({file,size,locale,message:m.text(),location:m.location()});});p.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});const target=(phase==='preview'?'test/':'')+file;await p.goto(srv.origin+'/'+target,{waitUntil:'domcontentloaded'});const studio=file.split('?')[0]==='plan.html';await ready(p,studio);if(phase==='preview'&&!options.excluded){await language(p,locale);await ready(p,studio);}if(!options.excluded)assert.equal(await p.locator('html').getAttribute('lang'),locale);return{context,p};}
async function shot(p,name,meta={},fullPage=false){await ready(p,meta.page==='plan.html');if(meta.locale)assert.equal(await p.locator('html').getAttribute('lang'),meta.locale);await p.mouse.move(0,0);const file=path.join(folder,name+'.png');await p.screenshot({path:file,fullPage,animations:'disabled',caret:'hide'});const item={file:path.relative(out,file),sha256:sha(fs.readFileSync(file)),fullPage,...meta};report.captures.push(item);console.log('CAPTURE '+name);return item;}
async function pollAsync(p,predicate,arg,label){const deadline=Date.now()+60000;do{const value=await p.evaluate(predicate,arg);if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}while(Date.now()<deadline);throw Error('Timed out waiting for '+label);}
async function check(name,fn){if(filters.length&&!filters.includes(name))return;try{const detail=await fn();report.checks.push({name,passed:true,detail});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
async function ensureVisible(p,selector){const loc=p.locator(selector);if(!await loc.isVisible()){const details=await loc.evaluate(el=>{const a=[];for(let n=el.parentElement;n;n=n.parentElement)if(n.tagName==='DETAILS'&&!n.open)a.push(n.id||null);return a.reverse();});for(const id of details){assert.ok(id,'collapsed group needs an accessible named owner');await p.locator('#'+id+' > summary').click();}}await loc.scrollIntoViewIfNeeded();assert.equal(await loc.isVisible(),true,'real control visible: '+selector);return loc;}
async function click(p,selector){const loc=await ensureVisible(p,selector);await loc.click();}
async function state(p){return p.evaluate(()=>{const captured=MIR_STUDY.captureEstimation();return{state:captured.state,dimensions:captured.planData.dimensions,faces:captured.planData.faces.map(f=>({key:f.key,bbox:f.bbox,zones:f.zones,openings:f.openings,importedStatus:f.importedStatus||null,page:f.page||null})),projectId:captured.projectId};});}
async function surface(p,id,name,size,locale){
 const node=p.locator(id);await node.waitFor({state:'visible'});
 await node.evaluate(async el=>{await document.fonts.ready;await Promise.all([...el.querySelectorAll('img[src]')].filter(i=>i.getAttribute('src')).map(i=>i.decode().catch(()=>{})));});
 const details=await node.evaluate(el=>{const r=el.getBoundingClientRect(),css=getComputedStyle(el);return{id:el.id,rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,background:css.backgroundColor,color:css.color,focusInside:el.contains(document.activeElement),text:el.innerText};});
 if(phase!=='before'){
  assert.ok(details.rect.x>=-1&&details.rect.y>=-1&&details.rect.right<=size.width+1&&details.rect.bottom<=size.height+1,'surface fits viewport: '+id);
  assert.ok(details.scrollWidth<=details.clientWidth+1,'no hidden horizontal content: '+id);
  const rgb=details.background.match(/\d+/g)?.slice(0,3).map(Number),fg=details.color.match(/\d+/g)?.slice(0,3).map(Number);
  assert.ok(['36,37,34','52,53,47','45,46,41'].includes(rgb?.join(',')),'approved anthracite surface: '+id);
  const light=cs=>cs.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);
  details.textContrast=(Math.max(light(rgb),light(fg))+.05)/(Math.min(light(rgb),light(fg))+.05);assert.ok(details.textContrast>=4.5,'readable surface text contrast: '+id);
 }
 await shot(p,name+'-'+locale+'-'+size.width,{page:'plan.html',locale,size,surface:id});return details;
}
async function closeSurface(p,id,{escape=false}={}){
 if(escape)await p.keyboard.press('Escape');
 else await p.locator(id+' .close-dialog,'+id+' #mir-pdf-close,'+id+' #estimate-close,'+id+' > button').first().click();
 await p.locator(id).waitFor({state:'hidden'});
}
async function rasterPreparedPDF(p,name){
 const pages=await p.evaluate(async()=>{
  const PDF=await import('./vendor/pdfjs/pdf.min.mjs');PDF.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',location.href).href;
  const bytes=new Uint8Array(await(await fetch(document.querySelector('#mir-pdf-ready a[download]').href)).arrayBuffer());
  window.__mirQaPDFDocument=await PDF.getDocument({data:bytes,isEvalSupported:false}).promise;return window.__mirQaPDFDocument.numPages;
 });
 const dir=path.join(folder,'pdf-pages',name);fs.mkdirSync(dir,{recursive:true});const rasters=[];
 try{for(let number=1;number<=pages;number++){
  const raster=await p.evaluate(async number=>{const page=await __mirQaPDFDocument.getPage(number),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:1600/Math.max(base.width,base.height)}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const ctx=canvas.getContext('2d');await page.render({canvasContext:ctx,viewport}).promise;return{width:canvas.width,height:canvas.height,paper:[base.width,base.height],corner:[...ctx.getImageData(10,10,1,1).data],png:canvas.toDataURL('image/png').split(',')[1]};},number);
  assert.ok(Math.abs(raster.paper[0]-1190.551)<1&&Math.abs(raster.paper[1]-841.890)<1,'actual PDF page is A3 landscape');
  if(phase!=='before')assert.ok(raster.corner.slice(0,3).every((value,i)=>Math.abs(value-[36,37,34][i])<=8),'actual PDF has the approved anthracite page background');
  const bytes=Buffer.from(raster.png,'base64'),file=path.join(dir,'page-'+String(number).padStart(2,'0')+'.png');fs.writeFileSync(file,bytes);rasters.push({file:path.relative(out,file),sha256:sha(bytes),page:number,width:raster.width,height:raster.height,paper:raster.paper,corner:raster.corner});
 }}finally{await p.evaluate(async()=>{await __mirQaPDFDocument.loadingTask.destroy();delete window.__mirQaPDFDocument;});}
 return rasters;
}
async function exportPDF(p,size,locale,{technical=false}={}){
 const faces=await p.evaluate(()=>MIR_STUDY.exportFaces());
 if(phase!=='before'){
  await startPaintProof(p);
  await p.evaluate(()=>{const original=MIRPDF;delete window.__mirQaExportInput;window.MIRPDF=Object.freeze({...original,exportPlan(options){window.MIRPDF=original;window.__mirQaExportInput=JSON.parse(JSON.stringify(options));return original.exportPlan(options);}});});
 }
 if(!await p.locator('#mir-studio-03-exports').evaluate(el=>el.open))await click(p,'#mir-studio-03-exports > summary');
 if(phase!=='before'){
  const option=await ensureVisible(p,'#mir-studio-pdf-details');
  assert.equal(norm(await option.locator('..').innerText()),locale==='en-CA'?'Include dimensions and technical details':'Inclure les cotes et détails techniques');
  if(technical)await option.check();else assert.equal(await option.isChecked(),false,'four-page presentation is the default');
 }
 await click(p,'#export-pdf');
 await p.locator('#mir-pdf-ready a[download]').waitFor({timeout:60000});
 let proof;
 if(phase!=='before'){
  const paint=await finishPaintProof(p),audit=await p.evaluate(()=>{const options=MIRClientLocale.localizePdfOptions(window.__mirQaExportInput);delete window.__mirQaExportInput;return{diagnostics:MIRStudioPDF.diagnostics(),options,faces:options.faces};});
  proof=verifyStudioPDF(audit.diagnostics,audit.faces,paint,{technical,presentationFaces:audit.options.presentationFaces});
  fs.writeFileSync(path.join(folder,locale+'-'+size.width+'-'+(technical?'detailed':'simple')+'-pdf-proof.json'),JSON.stringify({...audit,paint,proof},null,2)+'\n');
 }
 const panel=await surface(p,'#mir-pdf-ready','pdf-ready'+(technical?'-detailed':''),size,locale);
 const pending=p.waitForEvent('download');await p.locator('#mir-pdf-ready a[download]').click();const item=await pending;
 const bytes=fs.readFileSync(await item.path());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
 const filename=locale+'-'+size.width+'-'+(phase==='before'?'':technical?'detailed-':'simple-')+item.suggestedFilename();fs.writeFileSync(path.join(folder,filename),bytes);
 fs.writeFileSync(path.join(folder,locale+'-'+size.width+'-export-faces.json'),JSON.stringify(faces,null,2)+'\n');
 const rasters=size.width===1440?await rasterPreparedPDF(p,locale+'-'+(technical?'detailed':'simple')):[];
 await closeSurface(p,'#mir-pdf-ready');
 return{panel,file:filename,bytes:bytes.length,sha256:sha(bytes),proof,rasters,faces:faces.map(f=>({key:f.key,name:f.name,svgSha256:sha(f.svg),summary:f.summary,scaleNote:f.scaleNote,footerNote:f.footerNote}))};
}
async function windows(browser,srv,size,locale){
 const {context,p}=await open(browser,srv,size,locale);const screens={};
 try{
  await rendered(p);const original=await state(p);
  await click(p,'#open-library');screens.library=await surface(p,'#library-dialog','library',size,locale);
  await p.locator('#library-search').fill('HardiePanel');await p.locator('#library-dialog [data-doc="hardiepanel"]').click();
  screens.material=await surface(p,'#material-dialog','material',size,locale);
  assert.ok(await p.locator('#material-dialog .document-link').count());
  await closeSurface(p,'#material-dialog',{escape:true});assert.ok(await p.locator('#library-dialog').isVisible());
  await closeSurface(p,'#library-dialog');
  await click(p,'#edit-openings');screens.openings=await surface(p,'#openings-dialog','openings',size,locale);assert.ok(await p.locator('[data-edit-opening]').count());await closeSurface(p,'#openings-dialog',{escape:true});
  await click(p,'#volume-settings');screens.volume=await surface(p,'#volume-dialog','volume',size,locale);assert.ok(await p.locator('#volume-dialog [data-volume]').count());await closeSurface(p,'#volume-dialog');
  const exported=await exportPDF(p,size,locale);
  const detailed=phase!=='before'&&size.width===1440?await exportPDF(p,size,locale,{technical:true}):null;
  await click(p,'[data-estimate-source="studio"]');screens.estimate=await surface(p,'#mir-estimate-dialog','estimate-disabled',size,locale);
  await pollAsync(p,async()=>{const d=await MIREstimateDrafts.get('studio');return d?.context?.studio?.faces?.length===4;},null,'local Studio draft');
  assert.ok(await p.locator('#estimate-send').isDisabled());await closeSurface(p,'#mir-estimate-dialog');
  assert.deepEqual(await state(p),original,'opening, reading and closing panels does not change model/state');
  await click(p,'#project-menu');screens.projectsEmpty=await surface(p,'#projects-dialog','projects-empty',size,locale);assert.equal(await p.locator('[data-project-id]').count(),0);await closeSurface(p,'#projects-dialog');
  await click(p,'#import-pdf');screens.importEmpty=await surface(p,'#mir-pdf-import','import-empty',size,locale);assert.ok(await p.locator('#mir-pdf-final').isDisabled());
  await p.locator('#mir-pdf-file').setInputFiles({name:'empty-local-qa.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-')});
  await p.locator('#mir-pdf-error').waitFor({state:'visible'});assert.ok(await p.locator('#mir-pdf-final').isDisabled());screens.importError=await surface(p,'#mir-pdf-import','import-error',size,locale);
  await p.locator('#mir-pdf-file').setInputFiles(fixture);await p.waitForFunction(()=>!document.querySelector('#mir-pdf-final').disabled,null,{timeout:120000});
  screens.importSuccess=await surface(p,'#mir-pdf-import','import-success',size,locale);
  await Promise.all([p.waitForEvent('domcontentloaded'),p.locator('#mir-pdf-final').click()]);await ready(p,true);await rendered(p);
  const imported=await p.evaluate(async()=>{const d=await MIRProjectStore.getActive();return{id:d.id,source:d.source,faces:d.planData.faces.map(f=>({key:f.key,page:f.page||null})),dimensions:d.planData.dimensions};});
  assert.deepEqual(imported.faces.filter(f=>f.page).map(f=>[f.key,f.page]),[['front',67],['back',67]],'only the two true synthetic elevations are assigned');
  await click(p,'#project-menu');screens.projectsSaved=await surface(p,'#projects-dialog','projects-saved',size,locale);assert.equal(await p.locator('[data-project-id]').count(),1);
  await Promise.all([p.waitForEvent('domcontentloaded'),p.locator('[data-project-id]').click()]);await ready(p,true);await rendered(p);
  assert.equal(await p.evaluate(async()=>(await MIRProjectStore.getActive()).id),imported.id,'real saved-project action resumes the imported project');
  await click(p,'#show-source');screens.source=await surface(p,'#source-dialog','source-imported',size,locale);
  assert.equal(await p.locator('#source-dialog [data-source-face]').count(),2);assert.ok(await p.locator('#source-dialog img').evaluate(i=>i.naturalWidth>0));
  await p.locator('#source-dialog [data-source-face="back"]').click();assert.equal(await p.locator('#source-dialog [data-source-face="back"]').getAttribute('aria-pressed'),'true');await closeSurface(p,'#source-dialog',{escape:true});
  if(phase!=='before'){
   const base=JSON.parse(fs.readFileSync(path.join(out,'before/results.json'))).checks.find(c=>c.name==='windows-'+size.width+'-'+locale)?.detail;
   assert.ok(base,'matching immutable baseline exists');
   for(const [name,current] of Object.entries(screens))if(!(locale==='en-CA'&&['importEmpty','importError','importSuccess','volume','material'].includes(name))&&!(phase==='preview'&&name==='estimate'))assert.equal(norm(current.text),norm(base.screens[name].text),'essential original surface content preserved: '+name);
   assert.deepEqual(JSON.parse(JSON.stringify(exported.faces)),base.exported.faces,'all original annotated SVG bytes, summaries, dimensions and references preserved');
  }
  return{screens,exported,detailed,imported,noSubmission:true,scope:'Synthetic PDF only; no external document links opened'};
 }finally{await context.close();}
}
async function linkedDemo(browser,srv){
 const {context,p}=await open(browser,srv,sizes[0],'en-CA','studio.html');try{
  const source=p.url();await p.locator('.mir-studio-demo-notice a[href*="plan.html"]').click();await p.waitForURL(url=>url.pathname.endsWith('/plan.html'));await ready(p,true);
  assert.equal(await p.locator('html').getAttribute('lang'),'en-CA');assert.equal(await p.locator('body').getAttribute('data-mir-studio-layout'),'materials-bottom');
  const destination=p.url();await p.goBack({waitUntil:'domcontentloaded'});await ready(p);assert.ok(p.url().includes('studio.html'));assert.equal(await p.locator('html').getAttribute('lang'),'en-CA');return{source,destination,realLink:true,returnAndLocale:true};
 }finally{await context.close();}
}
async function main(){
 assert.ok(['before','after','preview'].includes(phase));fs.mkdirSync(folder,{recursive:true});fs.mkdirSync(path.dirname(fixture),{recursive:true});require('./helpers/mir-pdf-fixture.cjs').makePdf(fixture,{paddingBytes:0});
 const srv=await serve(),browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});report.browser=browser.version();
 try{
  for(const size of sizes)for(const locale of locales)await check('windows-'+size.width+'-'+locale,()=>windows(browser,srv,size,locale));
  if(phase!=='before')await check('demo-real-studio-link',()=>linkedDemo(browser,srv));
  report.resourceSha256=Object.fromEntries([...srv.cache].map(([file,bytes])=>[file,sha(bytes)]));report.testSha256=executingTestSha256;
 }catch(e){report.fatal=e.stack;throw e;}finally{
  report.passed=!report.fatal&&report.checks.length>0&&report.checks.every(c=>c.passed)&&!report.errors.length&&!report.consoleErrors.length&&!report.httpErrors.length&&!report.blocked.length;
  fs.writeFileSync(path.join(folder,filters.length?'selected-results.json':'results.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await srv.close();
 }
 assert.ok(report.passed,'see report');console.log('PASS '+phase+': '+report.checks.length+' groups, '+report.captures.length+' captures, local GET only.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
