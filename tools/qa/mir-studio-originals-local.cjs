/* Explicit local-only recipe. Paths and all output must be outside the repo.
 * No source text, thumbnails or originals are uploaded by this runner. */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../..'),dist=path.join(repo,'dist');
const manifestPath=process.env.MIR_PRIVATE_MANIFEST,out=path.resolve(process.env.MIR_PRIVATE_PROOFS||'/tmp/mir-private-import-proofs');
if(!manifestPath||out.startsWith(repo+path.sep)||path.resolve(manifestPath).startsWith(repo+path.sep))throw Error('Use private manifest and proofs outside the repository.');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));fs.mkdirSync(out,{recursive:true});
const override=process.env.MIR_PRIVATE_SOURCE_SNAPSHOT;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=path.resolve(dist,'.'+url.pathname);if(!file.startsWith(dist+path.sep))return res.writeHead(403).end();if(override){const replacement=path.resolve(override,path.relative(dist,file));if(fs.existsSync(replacement))file=replacement;}if(!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{
  let browser;
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
    const results=[];
    for(const item of manifest){
      const sha256=crypto.createHash('sha256').update(fs.readFileSync(item.path)).digest('hex');if(sha256!==item.sha256)throw Error('Original fingerprint mismatch: '+item.caseId);
      const caseOut=path.join(out,item.caseId);fs.mkdirSync(caseOut,{recursive:true});
      const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],blocked=[];
      await page.exposeFunction('__recipeProgress',progress=>fs.writeFileSync(path.join(caseOut,'progress-private.json'),JSON.stringify({...progress,at:new Date().toISOString()})));
      await page.route('**/*',route=>{const u=route.request().url();if(u.startsWith(base)||u.startsWith('data:')||u.startsWith('blob:'))return route.continue();blocked.push(new URL(u).hostname);return route.abort();});
      await page.addInitScript(()=>{
        window.__recipeOCR=[];
        let scanner;Object.defineProperty(window,'MIRScanOCR',{configurable:true,get:()=>scanner,set:api=>{scanner={...api,scan:async(...args)=>{const r=await api.scan(...args);window.__recipeOCR.push({mode:args[2]?.mode,rotation:args[1]?.rotation,width:args[1]?.width,height:args[1]?.height,rows:r.rows,text:r.text});await window.__recipeProgress({page:args[0]?.pageNumber,mode:args[2]?.mode,rotation:args[1]?.rotation});return r;}};}});
      });
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')errors.push(m.text());});
      const result={caseId:item.caseId,sha256,sourceSnapshot:process.env.MIR_PRIVATE_SNAPSHOT_LABEL||'working-tree',startedAt:new Date().toISOString(),imported:false};
      try{
        await page.goto(base+'/plan.html');await page.waitForFunction(()=>window.MIR_STUDY,null,{timeout:90000});
        await page.locator('#import-pdf').click();await page.locator('#mir-pdf-file').setInputFiles(item.path);
        await page.waitForFunction(()=>!document.querySelector('#mir-pdf-file').disabled,null,{timeout:900000});
        result.status=await page.locator('#mir-pdf-status').innerText();result.error=await page.locator('#mir-pdf-error').textContent();
        result.summary=await page.locator('#mir-pdf-assigned').innerText();
        fs.writeFileSync(path.join(caseOut,'ocr-private.json'),JSON.stringify(await page.evaluate(()=>window.__recipeOCR||[]),null,2));
        await page.screenshot({path:path.join(caseOut,'import.png')});
        const chooser=page.locator('[data-active-building]');
        if(await chooser.count()){
          result.buildingChoices=await chooser.locator('option').evaluateAll(options=>options.map(o=>({id:o.value,label:o.textContent})));
          if(!await chooser.inputValue()){const choice=result.buildingChoices.find(o=>o.id==='house')||result.buildingChoices.find(o=>o.id==='unresolved')||result.buildingChoices.find(o=>o.id);await chooser.selectOption(choice.id);result.recipeSelectedBuilding=choice.id;}
        }
        if(await page.locator('#mir-pdf-final').isEnabled()){
          await page.locator('#mir-pdf-final').click();await page.waitForFunction(title=>window.MIR_STUDY&&document.querySelector('#project-name').textContent===title,path.basename(item.path).replace(/\.pdf$/i,''),{timeout:90000});
          const data=await page.evaluate(async()=>{
            const e=await MIRProjectStore.getActive(),p=e.planData;
            const strip=r=>{const {sourceImage,sourceImageDataUrl,...rest}=r;return rest;};
            return {id:e.id,pageCount:e.source.pageCount,sourceBytes:e.sourceFile.size,sourceSha256:e.source.sha256,dimensions:p.dimensions,dimensionStatus:p.dimensionStatus,detectedVolume:p.detectedVolume,
              faces:p.faces.map(strip),references:p.referencePages.map(strip),viewInventory:p.viewInventory?{...p.viewInventory,views:p.viewInventory.views.map(v=>({...v,payload:strip(v.payload)}))}:null,
              rendering:window.MIR_RENDER_DIAGNOSTICS||null,snapshot:MIR_STUDY.snapshot()};
          });Object.assign(result,data);result.imported=true;
          const privateImages=await page.evaluate(async()=>{const e=await MIRProjectStore.getActive();return (e.planData.viewInventory?.views||[...e.planData.faces,...e.planData.referencePages]).map((v,i)=>({page:v.page,index:i,image:v.payload?.sourceImage||v.sourceImage})).filter(v=>v.image);});
          for(const view of privateImages)fs.writeFileSync(path.join(caseOut,`page-${view.page}-view-${view.index}.jpg`),Buffer.from(view.image.split(',')[1],'base64'));
          await page.locator('#view-2d').click();await page.locator('[data-face="front"]').click();await page.screenshot({path:path.join(caseOut,'studio-front.png'),fullPage:true});
          if(data.viewInventory){
            for(const b of data.viewInventory.buildings){
              await page.locator('#review-building-views').click();await page.locator('#building-views-dialog [data-active-building]').selectOption(b.id);
              await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.locator('#building-views-dialog button.primary').click()]);await page.waitForFunction(()=>window.MIR_STUDY);
              await page.locator('#view-2d').click();await page.locator('[data-face="front"]').click();await page.screenshot({path:path.join(caseOut,'building-'+b.id+'.png'),fullPage:true});
            }
          }
          await page.reload();await page.waitForFunction(()=>window.MIR_STUDY);result.reopened=await page.evaluate(async()=>{const e=await MIRProjectStore.getActive();return {id:e.id,sourceBytes:e.sourceFile.size,viewCount:e.planData.viewInventory?.views.length||null};});
        }
      }catch(e){result.failure=e.message;}
      result.finishedAt=new Date().toISOString();result.errors=errors;result.blockedExternalHosts=[...new Set(blocked)];
      fs.writeFileSync(path.join(caseOut,'result-private.json'),JSON.stringify(result,null,2));results.push(result);
      console.log(JSON.stringify({caseId:item.caseId,imported:result.imported,pages:result.pageCount,views:result.viewInventory?.views.length??(result.faces?.filter(f=>f.page).length||0)+(result.references?.length||0),failed:!!result.failure}));
      await page.close();
    }
    fs.writeFileSync(path.join(out,'matrix-private.json'),JSON.stringify(results,null,2));
  }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
