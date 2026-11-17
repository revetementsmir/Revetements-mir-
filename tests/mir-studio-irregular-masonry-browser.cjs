'use strict';
// Generated synthetic raster observations only; this is not original-PDF proof.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {isDeepStrictEqual}=require('node:util'),{chromium}=require(process.env.MIR_PLAYWRIGHT_MODULE||'playwright');
const fixture=require('./mir-studio-irregular-masonry.cjs');
const dist=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../artifacts/studio-irregular-masonry');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');if(url.pathname==='/favicon.ico')return res.writeHead(204).end();
  const file=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
});
const same=(actual,expected,message)=>assert.ok(isDeepStrictEqual(actual,expected),message);
const clone=value=>JSON.parse(JSON.stringify(value));
const area=polygon=>Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2);
const generated=fixture.levels.flatMap(level=>level.wallZones.map(zone=>({levelId:level.id,zone}))).sort((a,b)=>area(b.zone.polygon)-area(a.zone.polygon));
assert.ok(generated.length>1,'The detector must produce multiple source-linked masonry zones.');
const sample=generated[0],otherLevel=fixture.levels.find(level=>level.id!==sample.levelId);
assert.ok(otherLevel,'The fixture must exercise different source levels.');
async function stored(page){return page.evaluate(async()=>{const entry=await MIRProjectStore.getActive();return {id:entry.id,inventory:entry.planData.viewInventory,report:entry.planData.automaticReconstruction?.house};});}
async function ready(page){await page.waitForFunction(id=>window.MIR_LEVEL_STUDIO?.scene().walls.some(wall=>wall.id===id),sample.zone.wallId,{timeout:60000});}
async function selected(page){assert.equal(await page.locator('#mir-wall-surface').inputValue(),sample.zone.id);assert.equal(await page.evaluate(()=>MIR_LEVEL_STUDIO.snapshot().selectedWallId),sample.zone.wallId);assert.equal(await page.evaluate(()=>MIR_LEVEL_STUDIO.snapshot().levelId),sample.levelId);}
async function choose2D(page){
  await page.locator('#view-2d').click();await page.locator('#mir-level-clean-elevation').click();await page.locator('#mir-level-elevation-direction').selectOption('front');
  await page.locator('#mir-level-select').selectOption(otherLevel.id);
  const selector='#elevation [data-level-surface="'+sample.zone.id+'"]';await page.waitForSelector(selector);await page.locator(selector).first().scrollIntoViewIfNeeded();
  // A concave polygon's bounding-box centre can lie outside it. Find an actual
  // painted point, then send an ordinary browser pointer click at that point.
  const point=await page.locator(selector).first().evaluate(polygon=>{
    const box=polygon.getBBox(),matrix=polygon.getScreenCTM();
    for(let y=1;y<30;y++)for(let x=1;x<30;x++){
      const local=new DOMPoint(box.x+box.width*x/30,box.y+box.height*y/30);if(!polygon.isPointInFill(local))continue;
      const client=local.matrixTransform(matrix);if(document.elementFromPoint(client.x,client.y)===polygon)return {x:client.x,y:client.y};
    }return null;
  });
  assert.ok(point,'A generated masonry polygon must contain a visible 2D pick point.');await page.mouse.click(point.x,point.y);await selected(page);
}
async function choose3D(page){
  await page.locator('#view-3d').click();
  for(const angle of [25,110,205,290]){
    const previous=await page.evaluate(()=>MIR_RENDER_DIAGNOSTICS?.renderId||0);
    await page.locator('#rotation').evaluate((input,value)=>{input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));},angle);
    await page.waitForFunction(({angle,previous})=>MIR_RENDER_DIAGNOSTICS?.rendered&&MIR_RENDER_DIAGNOSTICS.angle===angle&&MIR_RENDER_DIAGNOSTICS.renderId>previous,{angle,previous});
    await page.locator('#three-canvas').scrollIntoViewIfNeeded();
    const point=await page.evaluate(async({zone,levelId})=>{
      const canvas=document.querySelector('#three-canvas'),wall=MIR_LEVEL_STUDIO.scene().walls.find(w=>w.id===zone.wallId),level=(await MIRProjectStore.getActive()).planData.viewInventory.levels.find(l=>l.id===levelId);
      const xs=zone.polygon.map(p=>p[0]),ys=zone.polygon.map(p=>p[1]),minX=Math.min(...xs),minY=Math.min(...ys),width=Math.max(...xs)-minX,height=Math.max(...ys)-minY;
      for(let y=1;y<22;y++)for(let x=1;x<22;x++){
        const local=[minX+width*x/22,minY+height*y/22];
        if(MIRStudioSurfaces.pickZone(wall,level,local)!==zone.id)continue;
        const projected=MIR3D.projectPoint(canvas,zone.wallId,local.map(v=>v*100));if(!projected)continue;
        if(document.elementFromPoint(projected.clientX,projected.clientY)!==canvas)continue;
        const hit=MIR3D.pick(canvas,projected.clientX,projected.clientY);
        if(hit?.surfaceId===zone.wallId&&hit.sourcePoint&&MIRStudioSurfaces.pickZone(wall,level,hit.sourcePoint.map(v=>v/100))===zone.id)return {x:projected.clientX,y:projected.clientY,wallId:hit.surfaceId};
      }return null;
    },sample);
    if(point){await page.mouse.click(point.x,point.y);await selected(page);return {angle,wallId:point.wallId,zoneId:sample.zone.id};}
  }
  assert.fail('The same generated zone must be selectable by an ordinary 3D pointer click.');
}
async function run(){
  let browser,context;const errors={page:[],http:[],external:[]},proof={syntheticOnly:true,runtime:'current working tree',originalPdfFidelity:'not-evaluated',steps:{},captures:[]};
  fs.mkdirSync(out,{recursive:true});
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});const page=await context.newPage();
    page.on('pageerror',error=>errors.page.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.http.push({status:response.status(),url:response.url()});});
    await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base+'/')||/^(data:|blob:)/.test(url))return route.continue();errors.external.push(url);return route.abort();});
    await page.goto(base+'/plan.html');await page.waitForFunction(()=>window.MIR_STUDY&&window.MIRProjectStore&&window.MIRStudioExterior);
    same(await page.evaluate(()=>MIRProjectStore.list()),[],'The test starts with fresh IndexedDB.');
    const saved=await page.evaluate(async fixture=>{
      const projectId='pdf-synthetic-irregular-masonry',buildingId='house',otherId=projectId+'-other';
      const make=id=>MIRViewInventory.adapt({id,version:3,projectKind:'imported-pdf',title:'SYNTHETIC — irregular masonry',viewInventory:structuredClone(fixture.inventory)},MIRSheetDetection.volumeFrom);
      await MIRProjectStore.saveActive({id:otherId,planData:make(otherId),takeoffSeed:{version:1,geometry:{},calibrations:{}}});const other=await MIRProjectStore.get(otherId);
      await MIRProjectStore.saveActive({id:projectId,planData:make(projectId),takeoffSeed:{version:1,geometry:{},calibrations:{}}});
      const initial=await MIRProjectStore.getActive(),expectedStamp=MIRProjectStore.reconstructionStamp(initial.planData.viewInventory),result={version:1,buildingId,status:'partial-proposal',reports:[{issues:fixture.issues}],levels:fixture.levels};
      const entry=await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp,result});
      return {inventory:entry.planData.viewInventory,other,confirmed:MIRStudioExterior.scene(entry.planData.viewInventory,buildingId),preview:MIRStudioExterior.scene(entry.planData.viewInventory,buildingId,{includeProposed:true})};
    },fixture);
    same(saved.inventory.levels.filter(l=>l.buildingId==='house').flatMap(l=>l.wallZones),fixture.levels.flatMap(l=>l.wallZones),'Saving preserves every generated zone, polygon and source observation.');
    same(saved.inventory.levels.filter(l=>l.buildingId!=='house'),fixture.inventory.levels,'Saving the house does not alter the shed.');
    assert.ok(saved.preview.walls.length>0);assert.equal(saved.preview.quantities.rows.length,0);assert.equal(saved.preview.quantities.purchaseQuantities,null);assert.equal(saved.confirmed.walls.length,0);
    proof.steps.generatedIndexedDBSave=true;
    await page.reload();await ready(page);const initial=await stored(page);await choose2D(page);same(await stored(page),initial,'Selecting a 2D zone does not persist changes.');
    const material='hardiepanel';await page.locator('#mir-wall-material').selectOption(material);assert.equal(await page.evaluate(()=>MIR_LEVEL_STUDIO.pending()),true);
    same(await stored(page),initial,'A masonry finish preview cannot persist geometry, provenance or material.');
    const preview=await page.evaluate(id=>MIR_LEVEL_STUDIO.textures()[id],sample.zone.wallId);assert.ok(preview.includes('data-profile="panel"'),'The selected product is rendered in the actual shared wall texture.');
    await page.locator('#stage').screenshot({path:path.join(out,'synthetic-masonry-preview-2d.png')});proof.captures.push('synthetic-masonry-preview-2d.png');
    await page.locator('#mir-level-cancel').click();await page.waitForFunction(()=>!MIR_LEVEL_STUDIO.pending());same(await stored(page),initial,'Cancel preserves the source-derived zones and unassigned products.');
    await choose2D(page);await page.locator('#mir-wall-material').selectOption(material);await page.locator('#mir-level-confirm').click();await page.waitForFunction(()=>!MIR_LEVEL_STUDIO.pending());const finished=await stored(page);
    const changed=finished.inventory.levels.find(l=>l.id===sample.levelId),before=initial.inventory.levels.find(l=>l.id===sample.levelId),zone=changed.wallZones.find(z=>z.id===sample.zone.id);
    assert.equal(zone.selection.materialId,material);const unchangedZone=clone(zone);unchangedZone.selection=clone(sample.zone.selection);same(unchangedZone,sample.zone,'Finishing changes no polygon, source, thickness, uncertainty or status.');
    same(changed.wallZones.filter(z=>z.id!==sample.zone.id),before.wallZones.filter(z=>z.id!==sample.zone.id),'Other zones on the same wall retain their individual finishes.');
    for(const key of ['contours','observedPlanes','wallOpenings','exteriorElements','reconstructedRoofs'])same(changed[key],before[key],'Finishing preserves '+key+'.');
    same(finished.inventory.levels.filter(l=>l.id!==sample.levelId),initial.inventory.levels.filter(l=>l.id!==sample.levelId),'Other levels and the shed stay unchanged.');
    proof.steps.previewCancelConfirm=true;
    await page.reload();await ready(page);same(await stored(page),finished,'The entire source geometry and finishes survive reload.');await choose2D(page);assert.equal(await page.locator('#mir-wall-material').inputValue(),material);
    await page.locator('#mir-wall-surface').selectOption('');proof.pointer=await choose3D(page);assert.equal(await page.locator('#mir-wall-material').inputValue(),material);same(await stored(page),finished,'The 3D pick resolves the same zone without persisting new changes.');
    await page.locator('#stage').screenshot({path:path.join(out,'synthetic-masonry-reopened-3d.png')});proof.captures.push('synthetic-masonry-reopened-3d.png');proof.steps.shared2D3DSelectionAndReload=true;
    const guard=await page.evaluate(async fixture=>{
      const entry=await MIRProjectStore.getActive(),before=JSON.stringify(entry),buildingId='house';let message=null;
      try{await MIRProjectStore.saveReconstruction({projectId:entry.id,buildingId,expectedStamp:MIRProjectStore.reconstructionStamp(entry.planData.viewInventory),result:{version:1,buildingId,status:'partial-proposal',reports:[],levels:fixture.levels}});}catch(error){message=error.message;}
      return {message,unchanged:before===JSON.stringify(await MIRProjectStore.getActive()),other:await MIRProjectStore.get(entry.id+'-other')};
    },fixture);
    assert.match(guard.message,/niveau modifié est conservé/);assert.equal(guard.unchanged,true);same(guard.other,saved.other,'Regeneration and finishing never change another project.');
    await page.evaluate(async id=>MIRProjectStore.activate(id),saved.other.id);await page.reload();await page.waitForFunction(()=>window.MIR_LEVEL_STUDIO);const other=await stored(page);assert.equal(other.id,saved.other.id);assert.equal(other.inventory.levels.flatMap(l=>l.wallZones||[]).length,0,'Opening the other project does not borrow the generated masonry.');
    await page.evaluate(async id=>MIRProjectStore.activate(id),finished.id);await page.reload();await ready(page);same(await stored(page),finished,'Project switching preserves exact geometry and confirmed finishes.');proof.steps.protectedRegenerationAndProjectIsolation=true;
    same(errors,{page:[],http:[],external:[]},'The browser has no page, HTTP or unexpected external request errors.');proof.passed=true;
    console.log('PASS irregular masonry browser: actual generated zones; atomic IndexedDB save; same 2D/3D pointer zone; finish preview/cancel/confirm; unchanged geometry and proposed status; reload; protected regeneration and project isolation.');
  }catch(error){proof.passed=false;proof.error=error.stack;throw error;}
  finally{proof.errors=errors;fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(proof,null,2));await context?.close();await browser?.close();server.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
