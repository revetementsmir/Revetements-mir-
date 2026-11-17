/* Local original-PDF recipe. No source PDF, OCR or capture belongs in git.
 * Usage: node tools/qa/mir-studio-automatic-originals.cjs --manifest /private/cases.json --out /private/new-run --case C3
 * Optional: --repo-root /path/to/frozen-checkout --timeout-ms 900000
 * Manifest: [{caseId:'C3',path:'/private/original.pdf',sha256:'64 hex digits',
 *   buildingId:'optional explicit building',sourceKind:'private-original',
 *   expected:{statuses:['partial-proposal'],requireModel:true,requireWorkflow:true}}]
 * For an expected unsupported case, explicitly use statuses:['unresolved'] or
 * ['import-failed'], requireModel:false and requireWorkflow:false. An expected
 * refusal may pass its contract; it never becomes a successful full workflow.
 * Geometry fidelity is always unverified here: no independent reference is
 * compared. No model, dimensions, calibrations or source inventory are injected.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const H=require('./helpers/mir-studio-automatic-proof.cjs');
const runnerRoot=path.resolve(__dirname,'../..');
const help=[
  'Local original PDF -> automatic proposed model -> 3D -> finish -> reopen.',
  '--manifest FILE     Private JSON array (or {cases:[...]}) outside the repository.',
  '--out DIRECTORY     New private output directory outside both repositories.',
  '--case ID[,ID...]   Select cases; repeatable. Defaults to all manifest cases.',
  '--repo-root PATH   Test another checkout with this same runner.',
  '--timeout-ms N     Import and conversion timeout each; default 900000.',
  'MIR_PLAYWRIGHT_MODULE may name an installed Playwright module.',
  'MIR_CHROMIUM_BIN may name the Chromium executable.',
  'See the source header for manifest expectations. Fidelity remains unverified.'
].join('\n');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function writePrivate(file,value){fs.writeFileSync(file,H.privateJSON(value),{mode:0o600});}
function revision(repo){
  const run=args=>{try{return execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}};
  return {head:run(['rev-parse','HEAD']),changedTrackedFiles:run(['diff','HEAD','--name-only'])?.split('\n').filter(Boolean)||[],label:'working-tree; served asset hashes recorded separately'};
}
function playwright(){
  if(process.env.MIR_PLAYWRIGHT_MODULE)return require(process.env.MIR_PLAYWRIGHT_MODULE);
  try{return require('playwright');}catch(error){
    if(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
    throw Error('Playwright is required. Set MIR_PLAYWRIGHT_MODULE to an installed module.',{cause:error});
  }
}
function staticServer(dist){
  const assets=new Map(),errors=[];
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
  const server=http.createServer((req,res)=>{
    try{
      const url=new URL(req.url,'http://127.0.0.1');
      if(url.pathname==='/favicon.ico')return res.writeHead(204).end();
      const file=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
      if(!H.within(dist,file)||file===dist)return res.writeHead(403).end();
      if(!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
      if(!H.within(dist,fs.realpathSync(file)))return res.writeHead(403).end();
      const bytes=fs.readFileSync(file),key=path.relative(dist,file),sha256=hash(bytes),previous=assets.get(key);
      if(previous&&previous.sha256!==sha256)throw Error('A served application asset changed during this run: '+key);
      assets.set(key,{path:key,sha256,bytes:bytes.length});
      res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');
      res.end(req.method==='HEAD'?undefined:bytes);
    }catch(error){errors.push(error.message);res.writeHead(500).end();}
  });
  return {server,assets,errors};
}
async function readSnapshot(page,{hashSource=false}={}){
  return page.evaluate(async includeHash=>{
    const e=await MIRProjectStore.getActive();if(!e)return null;
    const inventory=e.planData.viewInventory,buildingId=inventory?.activeBuildingId;
    const sourceFileSha=includeHash&&e.sourceFile instanceof Blob?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await e.sourceFile.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join(''):null;
    return {id:e.id,source:{sha256:e.source?.sha256,bytes:e.sourceFile?.size,pages:e.source?.pageCount,sourceFileSha},buildingId,
      report:e.planData.automaticReconstruction?.[buildingId]||null,request:e.planData.reconstructionRequest||null,
      inventory,model:window.MIR_LEVEL_STUDIO?.scene()||null};
  },hashSource);
}
function assertModel(model,buildingId){
  for(const collection of ['walls','openings','roofs']){
    const values=model[collection]||[];assert.equal(new Set(values.map(value=>value.id)).size,values.length,'Duplicate '+collection+' IDs.');
  }
  for(const wall of model.walls){
    assert.equal(wall.buildingId,buildingId,'Wall belongs to another building.');
    assert.ok(Number.isFinite(wall.length)&&wall.length>0&&Number.isFinite(wall.height)&&wall.height>0&&Number.isFinite(wall.base),'Wall has invalid dimensions.');
    assert.ok(Array.isArray(wall.poly)&&wall.poly.length>=3&&wall.poly.every(p=>p.length===3&&p.every(Number.isFinite)),'Wall polygon has invalid coordinates.');
  }
}
async function verify3D(page,proof,caseOut,action){
  action('view','open 3D');await page.locator('#view-3d').click();
  const wallIds=new Set(proof.model.walls.map(w=>w.id));let actualWallHits=0;
  proof.rotations=[];
  for(const angle of [25,110,205,290]){
    const previous=await page.evaluate(()=>window.MIR_RENDER_DIAGNOSTICS?.renderId||0);
    action('view','rotate 3D',{angle});
    await page.locator('#rotation').evaluate((element,value)=>{element.value=String(value);element.dispatchEvent(new Event('input',{bubbles:true}));},angle);
    await page.waitForFunction(({angle,previous})=>{
      const d=window.MIR_RENDER_DIAGNOSTICS;
      return d?.rendered&&d.renderId>previous&&d.angle===angle&&document.querySelector('#view-3d')?.getAttribute('aria-pressed')==='true';
    },{angle,previous},{timeout:90000});
    const rendering=await page.evaluate(()=>MIR_RENDER_DIAGNOSTICS);
    assert.equal(rendering.levelModelVersion,1,'3D must render the reconstructed level model.');
    assert.deepEqual(rendering.errors||[],[],'3D texture/render errors.');
    assert.ok(rendering.wallParts?.length,'3D has no model wall geometry.');
    const hits=rendering.hitSurfaces.filter(surface=>wallIds.has(surface.surfaceId));actualWallHits+=hits.length;
    for(const hit of hits)assert.ok(hit.screenPolygon.length>=3&&hit.screenPolygon.every(point=>point.every(Number.isFinite)),'Invalid 3D hit polygon.');
    const screenshot=await page.locator('#three-canvas').screenshot({path:path.join(caseOut,'model-3d-'+angle+'.png')});
    proof.rotations.push({angle,renderId:rendering.renderId,wallHits:hits.length,screenshotSha256:hash(screenshot),rendering});
  }
  assert.ok(actualWallHits>0,'No reconstructed wall is selectable across the four 3D views.');
  proof.steps.render3d=true;
}
async function verifyFinishAndReopen(page,proof,caseOut,action,memory){
  action('view','open reconstructed elevation');await page.locator('#mir-level-clean-elevation').click();
  await page.waitForSelector('#elevation [data-reconstructed-elevation]');
  assert.equal(await page.locator('#elevation image').count(),0,'Reconstructed elevation must not embed a source raster.');
  proof.noSourceRasterInElevation=true;
  const options=await page.locator('#mir-level-wall option').evaluateAll(nodes=>nodes.filter(n=>n.value&&!n.disabled).map(n=>n.value));
  assert.ok(options.length,'No wall can be selected for a finish.');
  const selected=options[0];action('finish','select wall',{wallId:selected});await page.locator('#mir-level-wall').selectOption(selected);
  assert.equal(await page.evaluate(()=>MIR_LEVEL_STUDIO.snapshot().selectedWallId),selected);
  if(await page.locator('#mir-wall-surface').inputValue())await page.locator('#mir-wall-surface').selectOption('');
  const before=await readSnapshot(page),wall=before.model.walls.find(w=>w.id===selected);assert.ok(wall);
  const materials=await page.locator('#mir-wall-material option').evaluateAll(nodes=>nodes.filter(n=>n.value&&!n.disabled).map(n=>n.value));
  const materialId=materials.find(id=>id!==wall.finish?.materialId);assert.ok(materialId,'No different finish is available.');
  action('finish','select material',{wallId:selected,materialId});await page.locator('#mir-wall-material').selectOption(materialId);
  await page.waitForFunction(()=>MIR_LEVEL_STUDIO.pending());
  const previewStored=await readSnapshot(page);
  assert.deepEqual(previewStored.inventory,before.inventory,'Preview must not persist any source or geometry changes.');
  action('finish','confirm finish',{wallId:selected,materialId});await page.locator('#mir-level-confirm').click();
  await page.waitForFunction(()=>!MIR_LEVEL_STUDIO.pending(),null,{timeout:90000});
  const after=await readSnapshot(page);
  assert.equal(after.id,before.id);assert.equal(after.buildingId,before.buildingId);
  assert.equal(after.model.walls.find(w=>w.id===selected)?.finish?.materialId,materialId,'Saved finish differs from the selected material.');
  assert.deepEqual(H.withoutFinish(after.model),H.withoutFinish(before.model),'Choosing a finish changed the model geometry or its confirmation status.');
  assert.deepEqual(H.levelGeometry(after.inventory),H.levelGeometry(before.inventory),'Choosing a finish changed source geometry or non-wall finishes.');
  assert.deepEqual(H.unrelatedWallFinishes(after.inventory,selected),H.unrelatedWallFinishes(before.inventory,selected),'Another wall finish changed.');
  assert.deepEqual(after.inventory.views,before.inventory.views,'Source observations changed while saving a finish.');
  proof.finish={wallId:selected,materialId,exactAssignment:true,unrelatedSurfacesUnchanged:true,geometryAndStatusUnchanged:true};
  proof.steps.finish=true;await page.screenshot({path:path.join(caseOut,'finish-saved.png')});
  action('navigation','reload project');await page.reload();
  await page.waitForFunction(async id=>window.MIR_LEVEL_STUDIO&&window.MIRProjectStore&&(await MIRProjectStore.getActive())?.id===id,after.id,{timeout:90000});
  const reopened=await readSnapshot(page,{hashSource:true});
  assert.equal(reopened.id,after.id);assert.equal(reopened.buildingId,after.buildingId);
  assert.equal(reopened.source.sourceFileSha,proof.source.sha256);assert.equal(reopened.source.bytes,proof.source.bytes);
  assert.deepEqual(reopened.model,after.model,'Geometry, surface IDs, statuses or finishes changed after reopening.');
  assert.deepEqual(reopened.inventory,after.inventory,'Stored source inventory changed after reopening.');
  assert.deepEqual(reopened.report,after.report,'Reopening unexpectedly reran or replaced the conversion.');
  assert.equal(reopened.request,null);
  proof.reopened={id:reopened.id,buildingId:reopened.buildingId,sameGeometryAndFinishes:true,sourceFileSha:reopened.source.sourceFileSha};
  proof.steps.reopen=true;await memory('reopened');await page.screenshot({path:path.join(caseOut,'project-reopened.png')});
}
async function runCase(browser,base,item,config,app){
  const caseOut=path.join(config.out,item.caseId);fs.mkdirSync(caseOut,{mode:0o700});
  const started=Date.now(),serverErrorStart=app.errors.length;
  const proof={schemaVersion:1,caseId:item.caseId,sourceKind:item.sourceKind,expected:item.expected,sourceRevision:app.sourceRevision,startedAt:new Date().toISOString(),
    steps:{import:false,conversion:false,render3d:false,finish:false,reopen:false},reconstructionStatus:'not-run',workflowVerified:false,
    autonomy:{status:'not-demonstrated',freshBrowserContext:true,harnessGeometryEdits:0,scope:'This execution only; does not establish generalization or source-code independence.'},
    fidelity:{status:'unverified',reason:'No independent geometric reference or tolerance evaluation is performed by this runner.'},
    actions:[],errors:{page:[],requests:[],http:[],requestFailed:[],server:[],console:[]},jsHeapSamples:[]};
  const action=(category,operation,details={})=>proof.actions.push({category,operation,...details,at:new Date().toISOString()});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror',error=>proof.errors.page.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')proof.errors.console.push({type:message.type(),text:message.text()});});
  page.on('response',response=>{if(response.status()>=400)proof.errors.http.push({url:response.url(),status:response.status()});});
  page.on('requestfailed',request=>{const failure=request.failure()?.errorText||'';if(!failure.includes('ERR_ABORTED'))proof.errors.requestFailed.push({url:request.url(),failure});});
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===base||['data:','blob:'].includes(url.protocol))return route.continue();
    proof.errors.requests.push({origin:url.origin,pathname:url.pathname});return route.abort();
  });
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  const memory=async phase=>{const {metrics}=await cdp.send('Performance.getMetrics');proof.jsHeapSamples.push({phase,usedBytes:metrics.find(m=>m.name==='JSHeapUsedSize')?.value,note:'Sample, not peak or total browser memory.'});};
  try{
    const bytes=fs.readFileSync(item.path);proof.source={sha256:hash(bytes),bytes:bytes.length};assert.equal(proof.source.sha256,item.sha256,'Original SHA-256 differs from private manifest.');
    await page.goto(base+'/plan.html');await page.waitForFunction(()=>window.MIR_STUDY&&window.MIRProjectStore,null,{timeout:90000});
    assert.deepEqual(await page.evaluate(()=>MIRProjectStore.list()),[],'Browser context already contains projects.');
    assert.equal(await page.evaluate(()=>MIRProjectStore.activeId()),null,'A previous model is active before import.');
    action('input','select original PDF');await page.locator('#import-pdf').click();await page.locator('#mir-pdf-file').setInputFiles(item.path);
    await page.waitForFunction(()=>{
      const file=document.querySelector('#mir-pdf-file'),error=document.querySelector('#mir-pdf-error');
      return file?.files.length===1&&!file.disabled&&(!!error?.textContent.trim()||!!document.querySelector('#mir-pdf-assigned')?.children.length);
    },null,{timeout:config.timeoutMs});
    proof.importSeconds=(Date.now()-started)/1000;proof.importStatus=await page.locator('#mir-pdf-status').innerText();
    proof.importError=(await page.locator('#mir-pdf-error').textContent()).trim();
    await page.screenshot({path:path.join(caseOut,'source-import.png')});await memory('import');
    if(proof.importError){proof.reconstructionStatus='import-failed';}
    else{
      const chooser=page.locator('[data-active-building]');
      if(await chooser.count()){
        proof.buildingChoices=await chooser.locator('option').evaluateAll(options=>options.filter(o=>o.value&&!o.disabled).map(o=>({id:o.value,label:o.textContent})));
        let selected=await chooser.inputValue();
        if(item.buildingId){assert.ok(proof.buildingChoices.some(choice=>choice.id===item.buildingId),'Manifest building is unavailable.');if(selected!==item.buildingId){selected=item.buildingId;action('input','select building',{buildingId:selected,selection:'explicit private manifest'});await chooser.selectOption(selected);}}
        else if(!selected){assert.equal(proof.buildingChoices.length,1,'Ambiguous building selection: specify buildingId in the private manifest.');selected=proof.buildingChoices[0].id;action('input','select building',{buildingId:selected,selection:'only available choice'});await chooser.selectOption(selected);}
        proof.selectedBuildingId=selected;
      }
      assert.ok(await page.locator('#mir-pdf-final').isEnabled(),'Import is not ready to open.');
      const conversionStarted=Date.now();action('navigation','open imported project');await page.locator('#mir-pdf-final').click();
      await page.waitForFunction(()=>window.MIR_LEVEL_STUDIO&&window.MIRProjectStore,null,{timeout:90000});
      const opened=await readSnapshot(page,{hashSource:true});assert.ok(opened);
      assert.equal(opened.source.sha256,item.sha256);assert.equal(opened.source.sourceFileSha,item.sha256);assert.equal(opened.source.bytes,proof.source.bytes);
      assert.ok(opened.source.pages>0&&opened.inventory.views.length>0,'The imported PDF has no pages or views.');
      if(proof.selectedBuildingId)assert.equal(opened.buildingId,proof.selectedBuildingId);
      proof.imported={id:opened.id,buildingId:opened.buildingId,source:opened.source,views:opened.inventory.views.length};proof.steps.import=true;
      await page.waitForFunction(async statuses=>{
        if(!window.MIR_LEVEL_STUDIO||!window.MIRProjectStore)return false;
        const e=await MIRProjectStore.getActive(),buildingId=e?.planData.viewInventory?.activeBuildingId;
        const report=e?.planData.automaticReconstruction?.[buildingId],button=document.querySelector('#mir-level-convert');
        return statuses.includes(report?.status)&&!e.planData.reconstructionRequest&&button&&!button.disabled&&!document.querySelector('#mir-level-stop-conversion')&&!MIR_LEVEL_STUDIO.pending();
      },H.TERMINAL_STATUSES,{timeout:config.timeoutMs});
      const imported=await readSnapshot(page);assert.ok(imported);
      assert.equal(imported.id,opened.id);assert.equal(imported.buildingId,opened.buildingId);assert.equal(imported.source.sha256,item.sha256);
      proof.steps.conversion=true;proof.reconstructionStatus=imported.report.status;
      proof.report=imported.report;proof.reportText=await page.locator('#mir-conversion-report').innerText();
      proof.model=imported.model;proof.inventory=imported.inventory;
      assert.ok(proof.model&&Array.isArray(proof.model.walls),'The terminal pipeline did not expose a scene.');
      proof.automaticSeconds=(Date.now()-conversionStarted)/1000;
      proof.autonomy.status=proof.reconstructionStatus==='preserved'?'preserved-model':proof.reconstructionStatus==='cancelled'?'cancelled':proof.model.walls.length?'automatic-proposal':'automatic-no-model';
      proof.autonomy.automaticConversionTriggeredByImport=true;
      await page.screenshot({path:path.join(caseOut,'automatic-result.png')});await memory('model');
      if(proof.model.walls.length){
        assertModel(proof.model,imported.buildingId);
        if(proof.reconstructionStatus==='partial-proposal'){
          assert.equal(proof.model.partial,true,'A partial proposal must remain marked partial.');
          assert.ok(proof.model.walls.every(w=>w.previewOnly),'Fresh automatic measurements must remain proposed.');
          assert.equal(proof.model.quantities.rows.length,0,'Proposed measurements must not become confirmed quantities.');
        }
        await verify3D(page,proof,caseOut,action);
        await verifyFinishAndReopen(page,proof,caseOut,action,memory);
      }
    }
  }catch(error){
    proof.failure={message:error.message,stack:error.stack};
    proof.visibleStatus=await page.locator('#mir-level-status,#mir-conversion-report,#mir-pdf-error').allTextContents().catch(()=>[]);
    await page.screenshot({path:path.join(caseOut,'failure.png')}).catch(()=>{});
  }finally{
    proof.errors.server=app.errors.slice(serverErrorStart);
    Object.assign(proof,H.evaluateProof(proof,item.expected));proof.finishedAt=new Date().toISOString();proof.totalSeconds=(Date.now()-started)/1000;
    writePrivate(path.join(caseOut,'result.json'),proof);await context.close();
  }
  return proof;
}
async function main(args=process.argv.slice(2)){
  const config=H.parseArgs(args,runnerRoot);if(config.help){console.log(help);return;}
  fs.mkdirSync(path.dirname(config.out),{recursive:true,mode:0o700});fs.mkdirSync(config.out,{mode:0o700});
  const app=staticServer(path.join(config.repoRoot,'dist')),sourceRevision=revision(config.repoRoot),results=[];app.sourceRevision=sourceRevision;let browser;
  try{
    await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
    const base='http://127.0.0.1:'+app.server.address().port;
    const executablePath=process.env.MIR_CHROMIUM_BIN||['/usr/bin/chromium','/usr/bin/google-chrome'].find(file=>fs.existsSync(file));
    browser=await playwright().chromium.launch({...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
    writePrivate(path.join(config.out,'run.json'),{schemaVersion:1,startedAt:new Date().toISOString(),sourceRevision,cases:config.items.map(item=>item.caseId)});
    for(const item of config.items){
      const result=await runCase(browser,base,item,config,app);results.push(result);
      console.log(JSON.stringify({caseId:result.caseId,passed:result.passed,workflowVerified:result.workflowVerified,reconstructionStatus:result.reconstructionStatus,
        walls:result.model?.walls?.length||0,openings:result.model?.openings?.length||0,roofs:result.model?.roofs?.length||0,autonomy:result.autonomy.status,fidelity:result.fidelity.status,violations:result.violations,totalSeconds:result.totalSeconds}));
      writePrivate(path.join(config.out,'matrix.json'),{sourceRevision,servedAssets:[...app.assets.values()],results});
    }
    if(results.some(result=>!result.passed))process.exitCode=1;
  }finally{
    await browser?.close();await new Promise(resolve=>app.server.close(resolve));
    writePrivate(path.join(config.out,'run-final.json'),{sourceRevision,servedAssets:[...app.assets.values()],serverErrors:app.errors,completedCases:results.length,finishedAt:new Date().toISOString()});
  }
}
if(require.main===module)main().catch(error=>{console.error('Automatic PDF proof runner failed: '+error.message);process.exitCode=1;});
module.exports={main,staticServer,assertModel};
