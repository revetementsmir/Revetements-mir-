'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http'),os=require('node:os');
const {makeRasterPDF}=require('./helpers/mir-studio-s1-fixture.cjs');
const dist=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../artifacts/studio-s1');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let file=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname);if(process.env.MIR_S1_BASELINE_DIR){const baseline=path.resolve(process.env.MIR_S1_BASELINE_DIR,path.relative(dist,file));if(fs.existsSync(baseline))file=baseline;}if(!(file.startsWith(dist+path.sep)||(process.env.MIR_S1_BASELINE_DIR&&file.startsWith(path.resolve(process.env.MIR_S1_BASELINE_DIR)+path.sep)))||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{
  let browser;const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mir-studio-s1-'));
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
    const launch=()=>chromium.launchPersistentContext(path.join(tmp,'profile'),{executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox'],viewport:{width:1440,height:1000}});
    browser=await launch();
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    // No backend, analytics or external inference requests are permitted.
    await page.route('**/*',route=>route.request().url().startsWith(base)||route.request().url().startsWith('data:')?route.continue():route.abort());
    await page.goto(base+'/plan.html');await page.waitForFunction(()=>window.MIR_STUDY);
    const file=path.join(tmp,'synthetic-house-shed.pdf');await makeRasterPDF(page,file);
    await page.locator('#import-pdf').click();await page.locator('#mir-pdf-file').setInputFiles(file);
    await page.waitForFunction(()=>!document.querySelector('#mir-pdf-file').disabled,null,{timeout:240000});
    const summary=await page.locator('#mir-pdf-assigned').innerText();
    if(process.env.MIR_S1_BASELINE_DIR){
      await page.screenshot({path:path.join(out,'baseline-synthetic.png')});
      assert.ok(await page.locator('#mir-pdf-final').isEnabled(),summary);
      await page.locator('#mir-pdf-final').click();await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='synthetic-house-shed');
      const baseline=await page.evaluate(async()=>{const p=await MIRProjectStore.getActive();return {faces:p.planData.faces.filter(f=>f.page).map(f=>({direction:f.key,page:f.page})),references:p.planData.referencePages.map(r=>({kind:r.kind,page:r.page})),dimensions:p.planData.dimensions};});
      fs.writeFileSync(path.join(out,'baseline-result.json'),JSON.stringify({fixture:'synthetic-raster-only',...baseline},null,2));console.log('BASELINE',JSON.stringify(baseline));return;
    }
    assert.equal(await page.locator('[data-source-view]').count(),8,summary);
    assert.equal(await page.locator('#mir-pdf-final').isEnabled(),false,'multiple buildings require a choice');
    await page.locator('[data-active-building]').selectOption('house');
    await page.evaluate(()=>MIRClientLocale.setLocale('en-CA'));
    await page.waitForFunction(()=>document.querySelector('#mir-pdf-assigned').innerText.includes('Front · FRONT ELEVATION SHED'));
    assert.match(await page.locator('#mir-pdf-volume-note').innerText(),/This plan shows the upper floor/);
    assert.doesNotMatch(await page.locator('#mir-pdf-volume-note').innerText(),/Ce plan montre|profondeur|hauteur des murs/);
    await page.locator('#mir-pdf-view-review [data-active-building]').selectOption('shed');
    assert.match(await page.locator('#mir-pdf-view-review').innerText(),/Choose the building to work on/);
    await page.screenshot({path:path.join(out,'import-en.png')});
    await page.evaluate(()=>MIRClientLocale.setLocale('fr-CA'));
    await page.locator('#mir-pdf-view-review [data-active-building]').selectOption('house');
    await page.waitForFunction(()=>document.querySelector('#mir-pdf-assigned').innerText.includes('Avant · FRONT ELEVATION SHED'));
    for(const [width,height]of [[390,844],[834,1112],[1440,1000]]){
      await page.setViewportSize({width,height});await page.screenshot({path:path.join(out,'import-'+width+'.png')});
      assert.ok(await page.locator('#mir-pdf-import').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('#mir-pdf-final').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'import-ready-390.png')});
    await page.locator('#mir-pdf-final').click();await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='synthetic-house-shed');
    const entry=await page.evaluate(()=>MIRProjectStore.getActive());
    assert.equal(entry.planData.version,3);assert.equal(entry.planData.viewInventory.views.length,8);
    assert.equal(entry.planData.viewInventory.buildings.length,2);
    const shedViews=entry.planData.viewInventory.views.filter(v=>v.buildingId==='shed');
    const frames=await page.evaluate(async()=>{const {views}= (await MIRProjectStore.getActive()).planData.viewInventory;return views.every(v=>{const p=[42,70],pdf=MIRViewInventory.localToPDF(v,p),back=MIRViewInventory.pdfToLocal(v,pdf);return back.every((n,i)=>Math.abs(n-p[i])<1e-8);});});assert.equal(frames,true);
    assert.equal(shedViews.length,5);assert.ok(shedViews.every(v=>v.orientation===270),'turned raster is upright with recorded transform');
    const centralPlan=shedViews.find(v=>v.kind==='floor');assert.equal(centralPlan.zone[1],0);assert.equal(centralPlan.zone[3],centralPlan.frame.rasterSize[1],'central plan spans both elevation rows');
    assert.equal(entry.planData.faces.filter(f=>f.page).length,2);
    assert.ok(entry.planData.faces.every(f=>f.zones.length===0&&f.openings.length===0),'colour legend never becomes wall geometry');
    assert.ok(entry.planData.viewInventory.levels.some(l=>l.buildingId==='house'&&l.sourceLevel==='upper'));
    assert.ok(!entry.planData.viewInventory.levels.some(l=>l.sourceLevel==='ground'));
    const originalId=entry.id;
    // Persist actual UI edits, reopen and switch buildings through the review UI.
    await page.locator('#view-2d').click();
    await page.locator('#add-accent').click();
    await page.locator('#edit-openings').click();await page.locator('#add-window').click();
    const houseEdits=await page.evaluate(()=>MIR_STUDY.snapshot());
    assert.equal(houseEdits.zoneCount,1);assert.equal(houseEdits.openingCount,1);
    await page.reload();await page.waitForFunction(()=>window.MIR_STUDY);
    assert.deepEqual(await page.evaluate(()=>({zones:MIR_STUDY.snapshot().zoneCount,openings:MIR_STUDY.snapshot().openingCount,choices:MIR_STUDY.snapshot().choices})),{zones:1,openings:1,choices:houseEdits.choices});
    await page.locator('#review-building-views').click();
    await page.locator('#building-views-dialog [data-active-building]').selectOption('shed');
    await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.locator('#building-views-dialog button.primary').click()]);
    await page.waitForFunction(()=>window.MIR_STUDY&&document.querySelector('#project-name').textContent==='synthetic-house-shed');
    assert.equal(await page.evaluate(async()=>(await MIRProjectStore.getActive()).planData.faces.filter(f=>f.page).length),4);
    await page.reload();await page.waitForFunction(()=>window.MIR_STUDY);
    assert.equal(await page.evaluate(()=>MIRProjectStore.activeId()),originalId);
    assert.equal(await page.evaluate(()=>MIR_STUDY.snapshot().zoneCount),0,'house edits never enter shed');
    await page.locator('#review-building-views').click();await page.locator('#building-views-dialog [data-active-building]').selectOption('house');
    await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.locator('#building-views-dialog button.primary').click()]);
    await page.waitForFunction(()=>window.MIR_STUDY);assert.equal(await page.evaluate(()=>MIR_STUDY.snapshot().openingCount),1);
    assert.deepEqual(await page.evaluate(()=>MIR_STUDY.snapshot().choices),houseEdits.choices);
    for(const [width,height]of [[390,844],[834,1112],[1440,1000]]){await page.setViewportSize({width,height});await page.screenshot({path:path.join(out,'studio-'+width+'.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===390){await page.locator('#elevation').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'studio-detail-390.png')});await page.evaluate(()=>scrollTo(0,0));}}
    await page.evaluate(async()=>{const e=await MIRProjectStore.getActive();await MIRProjectStore.saveActive({...e,id:'pdf-second-project-123',planData:{...e.planData,id:'pdf-second-project-123',title:'Second synthetic project'}});});
    assert.equal(await page.evaluate(async id=>(await MIRProjectStore.get(id)).planData.title,originalId),'synthetic-house-shed');
    // Legacy data and saved choices are unchanged by merely opening a project.
    const legacyBefore=await page.evaluate(async()=>{
      const e=await MIRProjectStore.getActive(),plan={...e.planData,id:'pdf-legacy-project-123',title:'Legacy synthetic project',version:2,footprint:{type:'front-recess',confirmed:true},recess:{enabled:true,confirmed:true,depth:1}};
      delete plan.viewInventory;delete plan.rendererScopeKey;
      const legacy={...e,id:plan.id,planData:plan};await MIRProjectStore.saveActive(legacy);
      const keys=MIRProjectStore.keys(plan.id),state={version:2,face:'front',selections:{},customZones:{front:[{id:'legacy-zone',polygon:[[10,10],[100,10],[100,100]],custom:true,kind:'siding'}]},addedOpenings:{front:[{id:'legacy-window',polygon:[[20,20],[40,20],[40,40]],custom:true,type:'window'}]},openingOverrides:{'front:legacy-window':[[21,21],[41,21],[41,41]]},recessOverride:{enabled:true,confirmed:true,depth:1}};
      localStorage.setItem(keys.studio,JSON.stringify(state));localStorage.setItem(keys.takeoff,JSON.stringify({version:1,geometry:{confirmed:true,recessDepthFt:3},calibrations:{front:{referenceFt:10,anchors:[[0,0],[100,0]],verified:true}}}));
      return {plan:JSON.stringify(plan),studio:localStorage.getItem(keys.studio),takeoff:localStorage.getItem(keys.takeoff)};
    });
    await page.reload();await page.waitForFunction(()=>window.MIR_STUDY);
    const legacyAfter=await page.evaluate(async()=>{const e=await MIRProjectStore.getActive(),keys=MIRProjectStore.keys(e.id);return {plan:JSON.stringify(e.planData),studio:localStorage.getItem(keys.studio),takeoff:localStorage.getItem(keys.takeoff)};});
    assert.deepEqual(legacyAfter,legacyBefore,'legacy open is read-only');
    await page.locator('#review-building-views').click();
    await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.locator('#building-views-dialog button.primary').click()]);await page.waitForFunction(()=>window.MIR_STUDY);
    const migrated=await page.evaluate(async()=>{const p=await MIRProjectStore.getActive();return {version:p.planData.version,footprint:p.planData.footprint,recess:p.planData.recess,snapshot:MIR_STUDY.snapshot(),sourceFileBytes:p.sourceFile.size};});
    assert.equal(migrated.version,3);assert.equal(migrated.footprint.confirmed,true);assert.equal(migrated.recess.confirmed,true);
    assert.equal(migrated.snapshot.openingCount,1);assert.equal(migrated.snapshot.zoneCount,1);assert.ok(migrated.sourceFileBytes>0);
    assert.deepEqual(errors,[]);
    await browser.close();browser=await launch();
    const reopened=await browser.newPage();await reopened.route('**/*',route=>route.request().url().startsWith(base)||route.request().url().startsWith('data:')?route.continue():route.abort());
    await reopened.goto(base+'/plan.html');await reopened.waitForFunction(()=>window.MIR_STUDY);
    const afterRestart=await reopened.evaluate(async()=>{const p=await MIRProjectStore.getActive();return {id:p.id,bytes:p.sourceFile.size,zones:MIR_STUDY.snapshot().zoneCount,openings:MIR_STUDY.snapshot().openingCount,originalProject:!!(await MIRProjectStore.get('pdf-second-project-123'))};});
    assert.deepEqual(afterRestart,{id:'pdf-legacy-project-123',bytes:migrated.sourceFileBytes,zones:1,openings:1,originalProject:true});
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({fixture:'synthetic-raster-only',views:8,buildings:2,rotatedViews:5,upperOnly:true,viewports:[390,834,1440],errors},null,2));
    console.log('PASS S1 Chromium: raster 5-view rotated shed + house + upper-only, building choice, no colour geometry, save/reopen, project isolation, 3 viewports');
  }finally{await browser?.close();server.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
