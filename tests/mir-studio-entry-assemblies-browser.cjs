'use strict';
// Synthetic source observations only. This suite verifies the product store,
// rendering and finish controls; it does not claim original-PDF fidelity.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const E=require('../dist/plan-reconstructed-exterior.js'),X=require('../dist/studio-exterior-model.js'),Roofs=require('../dist/plan-reconstructed-roofs.js');
const {entryFixture}=require('./helpers/mir-studio-entry-fixture.cjs');
const dist=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../artifacts/studio-entry-assemblies');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');if(url.pathname==='/favicon.ico')return res.writeHead(204).end();
  const file=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
});
const clone=value=>JSON.parse(JSON.stringify(value));
function makeCase(name,sample,built){
  const levels=sample.levels.map(level=>{
    const generated=built.byLevel.find(row=>row.levelId===level.id);
    return {...clone(level),exteriorElements:clone(generated?.exteriorElements||[]),wallZones:clone(generated?.wallZones||[]),reconstructedRoofs:clone(generated?.reconstructedRoofs||[])};
  });
  const roof=levels.flatMap(level=>level.reconstructedRoofs)[0],beam=levels.flatMap(level=>level.exteriorElements).find(element=>element.type==='beam'&&element.entryAssembly?.part==='front');
  assert.ok(roof,'The source-driven synthetic fixture must produce an entrance roof.');
  if(name==='hip')assert.ok(beam,'The hip fixture must produce its observed front beam.');
  // The bad roof belongs to the later level: rejection must roll back the
  // valid earlier level as well, not merely discard the last shape.
  levels.sort((a,b)=>Number(a.id===roof.levelId)-Number(b.id===roof.levelId));
  for(const level of levels)assert.deepEqual(X.proposalIssues(level,sample.inventory),[]);
  const inventory=clone(sample.inventory);inventory.levels=inventory.levels.filter(level=>level.buildingId!=='house');delete inventory.levelStudio;delete inventory.geometryVersion;
  // A separate, already reviewed synthetic building protects the cross-level
  // ID namespace. Its simple manual objects are unrelated to the new detector.
  const preserved=inventory.levels.find(level=>level.buildingId!=='house');assert.ok(preserved);
  const column={id:'synthetic-preserved-column',levelId:preserved.id,buildingId:preserved.buildingId,type:'column',phase:'existing',status:'confirmed',origin:[0,0,0],size:[.2,.2,2.4],rotationDegrees:0,provenance:{kind:'user-measurement',label:'Synthetic reviewed column'}};
  assert.deepEqual(X.issues(column),[]);preserved.exteriorElements=[column];
  const sources=sample.inventory.views.filter(view=>view.kind==='elevation').slice(0,2).map((view,index)=>{
    const source=clone(view);source.id='synthetic-preserved-elevation-'+index;source.buildingId=preserved.buildingId;inventory.views.push(source);
    return {sourceViewId:source.id,sourceFrame:clone(source.frame),anchors:[[20,40],[120,40]],scaleX:.04,scaleY:.04};
  });
  const preservedRoof={id:'synthetic-preserved-roof',levelId:preserved.id,buildingId:preserved.buildingId,status:'confirmed',kind:'estimated-calibrated',profiles:{x:[[0,2.4],[2,3.4],[4,2.4]],y:[[0,2.4],[2,3.4],[4,2.4]]},sources,quantityStatus:'partial-unreviewed'};
  preservedRoof.extensions=[{...clone(preservedRoof),id:'synthetic-preserved-roof-extension',profiles:{x:[[3,2.4],[4,2.9],[5,2.4]],y:[[0,2.4],[1,2.9],[2,2.4]]}}];
  assert.deepEqual(Roofs.issues(preservedRoof),[]);preserved.reconstructedRoofs=[preservedRoof];
  return {name,inventory,result:{version:1,buildingId:'house',status:'partial-proposal',reports:[{issues:built.issues}],levels},roofId:roof.id,beamId:beam?.id||null,ownerLevelId:roof.levelId,otherLevelId:levels.find(level=>level.id!==roof.levelId)?.id||roof.levelId,preservedLevelId:preserved.id,preservedCollisionIds:[column.id,preservedRoof.id,preservedRoof.extensions[0].id],hasObservedFascia:!!roof.observedFascia?.length};
}
function makeHipCase(){const sample=entryFixture();return makeCase('hip',sample,E.build(sample.proposal,sample.inventory,sample.images,sample.reviewed,sample.levels));}
function makeFlatCase(){
  const {flatEntryFixture}=require('./helpers/mir-studio-flat-entry-fixture.cjs'),Flat=require('../dist/plan-reconstructed-flat-roofs.js'),sample=flatEntryFixture();
  const result=makeCase('flat',sample,Flat.build(sample.proposal,sample.inventory,sample.images,sample.reviewed,sample.levels));
  assert.equal(result.beamId,null);assert.equal(result.hasObservedFascia,true,'The flat fixture must contain a source-observed fascia.');return result;
}
function geometryWithoutElementFinish(element){
  const copy=clone(element);for(const key of ['color','colorId','colorIndex','colorName','colorStatus','finishMaterialId','colorSource','manufacturerCode','colorSelectionStatus','colorSwatchUrl','colorValueSource','brand'])delete copy[key];return copy;
}
async function stored(page){return page.evaluate(async()=>{const entry=await MIRProjectStore.getActive();return {id:entry.id,inventory:entry.planData.viewInventory,report:entry.planData.automaticReconstruction?.house};});}
function elements(inventory){return inventory.levels.filter(level=>level.buildingId==='house').flatMap(level=>level.exteriorElements||[]);}
function roofs(inventory){return inventory.levels.filter(level=>level.buildingId==='house').flatMap(level=>level.reconstructedRoofs||[]);}
async function waitForModel(page,roofId){await page.waitForFunction(id=>window.MIR_LEVEL_STUDIO&&MIR_LEVEL_STUDIO.scene().roofs.some(roof=>roof.id===id),roofId,{timeout:60000});}
async function renderAngle(page,angle){
  const previous=await page.evaluate(()=>window.MIR_RENDER_DIAGNOSTICS?.renderId||0);
  await page.locator('#view-3d').click();
  await page.locator('#rotation').evaluate((input,value)=>{input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));},angle);
  await page.waitForFunction(({angle,previous})=>window.MIR_RENDER_DIAGNOSTICS?.rendered&&MIR_RENDER_DIAGNOSTICS.renderId>previous&&MIR_RENDER_DIAGNOSTICS.angle===angle&&document.querySelector('#view-3d')?.getAttribute('aria-pressed')==='true',{angle,previous},{timeout:60000});
  const diagnostics=await page.evaluate(()=>MIR_RENDER_DIAGNOSTICS);
  assert.equal(diagnostics.levelModelVersion,1);assert.deepEqual(diagnostics.errors,[]);
  assert.ok(diagnostics.hitSurfaces.length,'The current 3D render must contain selectable geometry.');
  for(const hit of diagnostics.hitSurfaces)assert.ok(hit.screenPolygon.length>=3&&hit.screenPolygon.every(point=>point.every(Number.isFinite)),'Every rendered hit polygon has finite coordinates.');
  return diagnostics;
}
async function pickRoof3D(page,sample){
  // Read real render coordinates, then send an ordinary pointer click. The
  // production picker must resolve the roof through all nearer painted faces.
  if(await page.locator('#mir-roof-back').count())await page.locator('#mir-roof-back').click();
  for(const angle of [25,110,205,290]){
    await renderAngle(page,angle);await page.locator('#three-canvas').scrollIntoViewIfNeeded();
    const point=await page.evaluate(id=>{
      const canvas=document.querySelector('#three-canvas'),box=canvas.getBoundingClientRect(),faces=MIR_RENDER_DIAGNOSTICS.hitSurfaces.filter(face=>face.elementId===id&&face.type==='roof');
      for(const face of faces){
        const center=face.screenPolygon.reduce((sum,p)=>[sum[0]+p[0]/face.screenPolygon.length,sum[1]+p[1]/face.screenPolygon.length],[0,0]);
        const candidates=[center,...face.screenPolygon.flatMap((p,i)=>[.3,.6].map(t=>[center[0]*(1-t)+(p[0]+face.screenPolygon[(i+1)%face.screenPolygon.length][0])*t/2,center[1]*(1-t)+(p[1]+face.screenPolygon[(i+1)%face.screenPolygon.length][1])*t/2]))];
        for(const p of candidates){
          const clientX=box.left+p[0]*box.width/canvas.clientWidth,clientY=box.top+p[1]*box.height/canvas.clientHeight;
          if(document.elementFromPoint(clientX,clientY)!==canvas)continue;
          const hit=MIR3D.pick(canvas,clientX,clientY);if(hit?.elementId===id&&hit.type==='roof')return {clientX,clientY,surfaceId:hit.surfaceId};
        }
      }
      return null;
    },sample.roofId);
    if(point){await page.mouse.click(point.clientX,point.clientY);await page.waitForSelector('#mir-roof-material');assert.equal(await page.evaluate(()=>MIR_LEVEL_STUDIO.snapshot().levelId),sample.ownerLevelId);return {angle,surfaceId:point.surfaceId};}
  }
  assert.fail('A visible entrance roof must be selectable with an ordinary 3D pointer click.');
}
async function saveFixture(page,sample){
  return page.evaluate(async fixture=>{
    const projectId='pdf-synthetic-entry-'+fixture.name,buildingId='house';
    const plan=MIRViewInventory.adapt({id:projectId,version:3,projectKind:'imported-pdf',title:'SYNTHETIC — entrance '+fixture.name,viewInventory:fixture.inventory},MIRSheetDetection.volumeFrom);
    await MIRProjectStore.saveActive({id:projectId,planData:plan,takeoffSeed:{version:1,geometry:{},calibrations:{}}});
    const pristine=await MIRProjectStore.getActive(),before=JSON.stringify(pristine),expectedStamp=MIRProjectStore.reconstructionStamp(pristine.planData.viewInventory);
    const rejections=[],reject=async(name,result)=>{
      let message=null;try{await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp,result});}catch(error){message=error.message;}
      const rollback=before===JSON.stringify(await MIRProjectStore.getActive());rejections.push({name,message,rollback});return !!message&&rollback;
    };
    for(const id of fixture.preservedCollisionIds){
      const invalid=structuredClone(fixture.result),bad=invalid.levels.find(level=>level.id===fixture.ownerLevelId).reconstructedRoofs.find(roof=>roof.id===fixture.roofId);bad.id=id;
      if(!await reject('preserved-id:'+id,invalid))return {rejections};
    }
    // A generated child roof also participates in the same ID namespace.
    const extensionCollision=structuredClone(fixture.result),parent=extensionCollision.levels.find(level=>level.id===fixture.ownerLevelId).reconstructedRoofs.find(roof=>roof.id===fixture.roofId),child=structuredClone(parent);
    delete child.extensions;child.id=fixture.preservedCollisionIds[0];parent.extensions=[...(parent.extensions||[]),child];
    if(!await reject('generated-extension-id',extensionCollision))return {rejections};
    const invalid=structuredClone(fixture.result),bad=invalid.levels.find(level=>level.id===fixture.ownerLevelId).reconstructedRoofs.find(roof=>roof.id===fixture.roofId);
    // Frame tampering is invalid even when the view exists and the profile's
    // dimensions remain plausible. Every contributing view must be checked.
    bad.sources[1].sourceFrame.cropToRaster[4]+=1;
    if(!await reject('altered-roof-source-frame',invalid))return {rejections};
    const saved=await MIRProjectStore.saveReconstruction({projectId,buildingId,expectedStamp,result:fixture.result});
    return {rejections,inventory:saved.planData.viewInventory,preview:MIRStudioExterior.scene(saved.planData.viewInventory,buildingId,{includeProposed:true}),confirmed:MIRStudioExterior.scene(saved.planData.viewInventory,buildingId)};
  },sample);
}
async function chooseBeam(page,sample,color){
  const selector='#elevation [data-level-element="'+sample.beamId+'"]';
  await page.locator('#mir-level-clean-elevation').click();await page.locator('#mir-level-elevation-direction').selectOption('front');
  await page.locator('#mir-level-select').selectOption(sample.otherLevelId);
  assert.equal(await page.evaluate(()=>MIR_LEVEL_STUDIO.snapshot().levelId),sample.otherLevelId);
  await page.locator(selector).first().click();await page.waitForSelector('#mir-exterior-choice:not([hidden])');
  assert.equal(await page.evaluate(()=>MIR_LEVEL_STUDIO.snapshot().levelId),sample.ownerLevelId,'Picking the beam activates its own level.');
  assert.equal(await page.locator('#mir-exterior-scope').inputValue(),'single');
  assert.equal(await page.locator('[data-element-field="depth"]').inputValue(),'','The hidden beam section remains unknown.');
  const products=await page.locator('#mir-exterior-product option').evaluateAll(options=>options.filter(option=>option.value&&!option.disabled).map(option=>option.value));
  assert.ok(products.length,'A real wrapping product must be available.');
  const productId=products[0];
  await page.locator('#mir-exterior-product').selectOption(productId);
  await page.locator('#mir-exterior-color').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},color);
  await page.waitForFunction(({id,color,productId})=>MIR_LEVEL_STUDIO.pending()&&MIR_LEVEL_STUDIO.scene().elements.some(element=>element.id===id&&element.color===color&&element.finishMaterialId===productId),{id:sample.beamId,color,productId});
  return {selector,productId};
}
async function exerciseCase(browser,base,sample,sourceRevision){
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage();
  const errors={page:[],http:[],external:[]},evidence={case:sample.name,sourceRevision,syntheticOnly:true,originalPdfFidelity:'not-evaluated',steps:{},captures:[]};
  page.on('pageerror',error=>errors.page.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.http.push({status:response.status(),url:response.url()});});
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base+'/')||/^(data:|blob:)/.test(url))return route.continue();errors.external.push(url);return route.abort();});
  try{
    await page.goto(base+'/plan.html');await page.waitForFunction(()=>window.MIR_STUDY&&window.MIRProjectStore&&window.MIRStudioExterior);
    assert.deepEqual(await page.evaluate(()=>MIRProjectStore.list()),[],'Each assembly starts in a new browser context.');
    const saved=await saveFixture(page,sample);
    assert.equal(saved.rejections.length,5);for(const rejected of saved.rejections){assert.match(rejected.message,rejected.name==='altered-roof-source-frame'?/sources invalides|Toiture proposée invalide/:/Éléments extérieurs dupliqués/);assert.equal(rejected.rollback,true,'Rejected '+rejected.name+' must leave the entire IndexedDB record unchanged.');}
    assert.deepEqual(roofs(saved.inventory),sample.result.levels.flatMap(level=>level.reconstructedRoofs));
    assert.deepEqual(elements(saved.inventory),sample.result.levels.flatMap(level=>level.exteriorElements));
    assert.deepEqual(saved.inventory.levels.find(level=>level.id===sample.preservedLevelId),sample.inventory.levels.find(level=>level.id===sample.preservedLevelId),'The valid conversion preserves every other-building object.');
    assert.equal(saved.confirmed.walls.length,0);assert.equal(saved.confirmed.elements.length,0);assert.equal(saved.confirmed.roofs.length,0);
    assert.ok(saved.preview.walls.length);assert.equal(saved.preview.quantities.rows.length,0);assert.equal(saved.preview.quantities.purchaseQuantities,null);
    evidence.steps.atomicStore=true;evidence.rejections=saved.rejections;
    await page.reload();await waitForModel(page,sample.roofId);
    const initial=await stored(page),initialScene=await page.evaluate(()=>MIR_LEVEL_STUDIO.scene());
    assert.equal(initialScene.roofs.find(roof=>roof.id===sample.roofId).status,'proposed');
    if(sample.name==='flat'){const roof=roofs(initial.inventory).find(roof=>roof.id===sample.roofId);assert.equal(roof.roofForm,'flat');assert.equal(roof.thickness,null);assert.equal(roof.drainage.slope,null);}
    await renderAngle(page,25);await page.locator('#stage').screenshot({path:path.join(out,sample.name+'-unassigned-1440.png')});
    evidence.captures.push(sample.name+'-unassigned-1440.png');
    const beamColor='#537a93';let withBeam=initial;
    if(sample.beamId){
      const beamPreview=await chooseBeam(page,sample,beamColor);
      assert.deepEqual(await stored(page),initial,'A beam product/colour preview cannot persist geometry, sources or finishes.');
      assert.equal(await page.locator(beamPreview.selector).first().getAttribute('fill'),beamColor,'The elevation shows the preview colour.');
      await page.locator('[data-exterior-cancel]').click();await page.waitForFunction(()=>!MIR_LEVEL_STUDIO.pending()&&document.querySelector('#mir-exterior-choice').hidden);
      assert.deepEqual(await stored(page),initial);assert.deepEqual(await page.evaluate(()=>MIR_LEVEL_STUDIO.scene()),initialScene,'Cancel restores the exact proposed model.');
      const beamChoice=await chooseBeam(page,sample,beamColor);await page.locator('[data-exterior-confirm]').click();
      await page.waitForFunction(()=>!MIR_LEVEL_STUDIO.pending()&&document.querySelector('#mir-exterior-choice').hidden);
      withBeam=await stored(page);const selectedBeam=elements(withBeam.inventory).find(element=>element.id===sample.beamId),originalBeam=elements(initial.inventory).find(element=>element.id===sample.beamId);
      assert.equal(selectedBeam.color,beamColor);assert.equal(selectedBeam.finishMaterialId,beamChoice.productId);assert.equal(selectedBeam.status,'proposed');assert.equal(selectedBeam.size[1],null);
      assert.deepEqual(geometryWithoutElementFinish(selectedBeam),geometryWithoutElementFinish(originalBeam),'Choosing wrapping never changes the beam section, support material or observations.');
      assert.deepEqual(elements(withBeam.inventory).filter(element=>element.id!==sample.beamId),elements(initial.inventory).filter(element=>element.id!==sample.beamId),'Columns and other beam returns keep their independent finishes.');
      assert.deepEqual(roofs(withBeam.inventory),roofs(initial.inventory));
      evidence.steps.beamPreviewCancelConfirm=true;evidence.finishes={beamId:sample.beamId,beamProductId:beamChoice.productId,beamColor};
    }else{
      await page.locator('#mir-level-clean-elevation').click();await page.locator('#mir-level-elevation-direction').selectOption('front');
      assert.equal(elements(initial.inventory).filter(element=>['beam','column'].includes(element.type)).length,0,'The flat-roof fixture has no observed supports; the product must not invent them.');
    }
    const roofSelector='#elevation [data-reconstructed-roof="'+sample.roofId+'"]';
    await page.locator(roofSelector).first().click();await page.waitForSelector('#mir-roof-material');
    assert.equal(await page.evaluate(()=>MIR_LEVEL_STUDIO.snapshot().levelId),sample.ownerLevelId,'Picking a roof activates its own level.');
    const roofProducts=await page.locator('#mir-roof-material option').evaluateAll(options=>options.filter(option=>option.value&&!option.disabled).map(option=>option.value));assert.ok(roofProducts.length);
    const roofMaterialId=roofProducts[0];await page.locator('#mir-roof-material').selectOption(roofMaterialId);await page.waitForFunction(()=>MIR_LEVEL_STUDIO.pending());
    assert.deepEqual(await stored(page),withBeam,'Roof material preview remains uncommitted.');
    assert.equal(await page.evaluate(id=>MIR_LEVEL_STUDIO.scene().roofs.find(roof=>roof.id===id).finish.materialId,sample.roofId),roofMaterialId);
    await page.locator('#mir-roof-cancel').click();await page.waitForFunction(()=>!MIR_LEVEL_STUDIO.pending());assert.deepEqual(await stored(page),withBeam);
    await page.locator('#mir-roof-material').selectOption(roofMaterialId);
    const colors=await page.locator('#mir-roof-color option').evaluateAll(options=>options.filter(option=>option.value!==''&&!option.disabled).map(option=>option.value));if(colors.length)await page.locator('#mir-roof-color').selectOption(colors[0]);
    await page.locator('#mir-roof-confirm').click();await page.waitForFunction(()=>!MIR_LEVEL_STUDIO.pending());
    let finished=await stored(page),finishedScene=await page.evaluate(()=>MIR_LEVEL_STUDIO.scene());
    const finish=finished.inventory.levels.find(level=>level.id===sample.ownerLevelId).roofFinishes[sample.roofId];
    assert.equal(finish.materialId,roofMaterialId);assert.deepEqual(elements(finished.inventory),elements(withBeam.inventory),'Roof finish does not recolour any beam or column.');
    assert.deepEqual(roofs(finished.inventory),roofs(initial.inventory),'Roof profile/source geometry is unchanged by finishing.');
    assert.equal(finishedScene.quantities.rows.length,0);assert.ok(finishedScene.roofs.every(roof=>roof.status==='proposed'));
    evidence.steps.roofPreviewCancelConfirm=true;evidence.finishes={...evidence.finishes,roofId:sample.roofId,roofMaterialId};
    if(sample.hasObservedFascia){
      const fasciaColor='#935f3a',withRoof=finished,withRoofScene=finishedScene;
      const previewFascia=async()=>{
        await page.locator('#mir-roof-fascia-color').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},fasciaColor);
        await page.waitForFunction(({id,color})=>MIR_LEVEL_STUDIO.pending()&&MIR_LEVEL_STUDIO.scene().roofs.find(roof=>roof.id===id)?.finish.fasciaColor===color,{id:sample.roofId,color:fasciaColor});
      };
      await previewFascia();assert.deepEqual(await stored(page),withRoof,'Fascia colour preview cannot persist the roof finish.');
      const painted=await page.locator(roofSelector).evaluateAll(nodes=>nodes.map(node=>node.getAttribute('fill')));assert.ok(painted.includes(fasciaColor),'The source-observed fascia visibly previews its independent colour in 2D.');
      assert.equal(await page.evaluate(id=>MIR_LEVEL_STUDIO.scene().roofs.find(roof=>roof.id===id).finish.color,sample.roofId),finish.color,'Fascia preview does not recolour the roof covering.');
      await page.locator('#stage').screenshot({path:path.join(out,sample.name+'-fascia-preview-1440.png')});evidence.captures.push(sample.name+'-fascia-preview-1440.png');
      await page.locator('#mir-roof-cancel').click();await page.waitForFunction(()=>!MIR_LEVEL_STUDIO.pending());
      assert.deepEqual(await stored(page),withRoof);assert.deepEqual(await page.evaluate(()=>MIR_LEVEL_STUDIO.scene()),withRoofScene,'Cancel restores the exact covering and fascia finishes.');
      await previewFascia();await page.locator('#mir-roof-confirm').click();await page.waitForFunction(()=>!MIR_LEVEL_STUDIO.pending());
      finished=await stored(page);finishedScene=await page.evaluate(()=>MIR_LEVEL_STUDIO.scene());
      const after=finished.inventory.levels.find(level=>level.id===sample.ownerLevelId).roofFinishes[sample.roofId];assert.equal(after.fasciaColor,fasciaColor);
      const rest=clone(after),before=clone(finish);delete rest.fasciaColor;delete before.fasciaColor;assert.deepEqual(rest,before,'Fascia confirmation preserves the covering product and colour.');
      assert.deepEqual(roofs(finished.inventory),roofs(initial.inventory));assert.deepEqual(elements(finished.inventory),elements(withRoof.inventory));
      evidence.steps.fasciaPreviewCancelConfirm=true;evidence.finishes.fasciaColor=fasciaColor;
    }
    assert.deepEqual(finished.inventory.levels.find(level=>level.id===sample.preservedLevelId),sample.inventory.levels.find(level=>level.id===sample.preservedLevelId),'Finishing the entrance never modifies the other building.');
    await page.reload();await waitForModel(page,sample.roofId);
    assert.deepEqual(await stored(page),finished,'IndexedDB reopening keeps source observations, report and exact finishes.');
    assert.deepEqual(await page.evaluate(()=>MIR_LEVEL_STUDIO.scene()),finishedScene,'Reopening keeps the same physical elements, roof IDs and proposal statuses.');evidence.steps.reopen=true;
    const visible=new Set();for(const angle of [25,110,205,290]){const rendering=await renderAngle(page,angle);for(const hit of rendering.hitSurfaces)if(hit.elementId)visible.add(hit.elementId);}
    if(sample.beamId)assert.ok(visible.has(sample.beamId),'The saved front beam is represented by its real ID in the rendered 3D scene.');
    assert.ok(visible.has(sample.roofId),'The saved entrance roof is represented by its real ID in the rendered 3D scene.');evidence.steps.render3d=true;
    evidence.roofPointerPick=await pickRoof3D(page,sample);assert.deepEqual(await stored(page),finished,'A 3D roof selection cannot persist a finish or geometry change.');evidence.steps.roof3dPointerPick=true;
    for(const locale of ['fr-CA','en-CA']){
      await page.evaluate(value=>MIRClientLocale.setLocale(value),locale);
      assert.match(await page.locator('#mir-conversion-report').innerText(),locale==='fr-CA'?/Modèle proposé/:/Proposed model/);
      assert.equal(await page.locator('#stage-subtitle').textContent(),locale==='fr-CA'?'Toiture sélectionnée dans le même modèle 2D et 360°.':'Roof selected in the same 2D and 360° model.');
      if(sample.name==='flat')assert.match(await page.locator('[data-roof-drainage-note]').innerText(),locale==='fr-CA'?/Pente de drainage à confirmer/:/Drainage slope remains to be confirmed/);
      for(const [width,height]of [[390,844],[834,1112],[1440,1000]]){
        await page.setViewportSize({width,height});await renderAngle(page,25);await page.locator('#stage').scrollIntoViewIfNeeded();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No global horizontal overflow at '+locale+' '+width);
        const prefix=sample.name+'-finished-'+locale+'-'+width;
        await page.screenshot({path:path.join(out,prefix+'-screen.png')});await page.locator('#stage').screenshot({path:path.join(out,prefix+'-model.png')});
        evidence.captures.push(prefix+'-screen.png',prefix+'-model.png');
      }
    }
    evidence.steps.responsiveFrEn=true;assert.deepEqual(errors,{page:[],http:[],external:[]});evidence.passed=true;return evidence;
  }catch(error){evidence.passed=false;evidence.error=error.stack;try{const capture=sample.name+'-failure.png';await page.screenshot({path:path.join(out,capture)});evidence.captures.push(capture);}catch{}throw error;}
  finally{evidence.errors=errors;fs.writeFileSync(path.join(out,sample.name+'-result.json'),JSON.stringify(evidence,null,2));await context.close();}
}
async function run(){
  let browser;
  try{
    const sourceRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:path.join(__dirname,'..'),encoding:'utf8'}).trim();
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
    const results=[];for(const sample of [makeHipCase(),makeFlatCase()])results.push(await exerciseCase(browser,base,sample,sourceRevision));
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({sourceRevision,syntheticOnly:true,originalPdfFidelity:'not-evaluated',results},null,2));
    console.log('PASS synthetic hip/flat entrance assemblies: IndexedDB source/ID rejection and atomic save; independent beam, roof and fascia preview/cancel/confirm; geometry/status preservation; reopen; 3D pointer selection; Chromium FR/EN 390/834/1440.');
  }finally{await browser?.close();server.close();}
}
module.exports={makeHipCase,makeFlatCase};
if(require.main===module)run().catch(error=>{console.error(error.stack);process.exitCode=1;});
