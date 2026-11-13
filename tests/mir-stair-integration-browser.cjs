'use strict';
/* Browser contract: a calibrated pixel candidate survives project import and
 * becomes a correctly sized, explicitly unverified 3D stair proposal. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const filename=path.resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(!filename.startsWith(dist+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');
 fs.createReadStream(filename).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500});
   const url='http://127.0.0.1:'+server.address().port+'/plan.html';
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.MIRProjectStore?.saveActive,{timeout:30000});
   await page.evaluate(async()=>{
    const [data,seed]=await Promise.all([fetch('plan-data.json').then(x=>x.json()),fetch('takeoff-data.json').then(x=>x.json())]);
    data.projectKind='imported-pdf';data.title='Plan de marches calibrées';
    data.dimensionStatus='detected';data.detectedVolume={roofStyle:'duplex',foundationDrop:.30};
    data.stairCandidates=[{
      id:'stair-px-horizontal-350-230',source:'pdf-pixels',type:'stairs',
      page:4,assignedView:'floor',viewKind:'floor',widthFt:6.5,depthFt:5.58,treadFt:.93,
      count:6,confidence:.91,relativeCenter:[.65,.72],riserFt:null,
      positionVerified:false,riserHeightVerified:false,feetPerPixel:.03,needsReview:true
    }];
    await MIRProjectStore.saveActive({id:'pdf-mir-stair-browser-01',planData:data,takeoffSeed:seed,source:{filename:'measured-stair-plan.pdf'},createdAt:new Date().toISOString()});
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.MIR_STUDY?.snapshot&&document.querySelector('#project-name')?.textContent?.includes('Plan de marches calibrées'),null,{timeout:45000});
   const result=await page.evaluate(()=>{
    const s=window.MIR_STUDY.snapshot(),steps=s.concreteSteps;
    const mesh=window.MIR3D.mesh({...s,dimensions:s.dimensions||window.MIR3D.defaults});
    return {steps,numberOfTreads:mesh.faces.filter(f=>f.type==='concrete'&&f.id.endsWith('-top')).length};
   });
   assert.equal(result.steps.enabled,true,'Stairs not proposed automatically');
   assert.equal(result.steps.count,6);assert.ok(Math.abs(result.steps.width-6.5*.3048)<.01);
   assert.ok(Math.abs(result.steps.tread-.93*.3048)<.01);
   assert.equal(result.steps.positionVerified,false);
   assert.equal(result.steps.riserHeightVerified,false);
   assert.equal(result.steps.sourcePage,4);
   assert.equal(result.numberOfTreads,6);
   await page.locator('#volume-settings').click();
   assert.ok(Math.abs(Number(await page.locator('#mir-steps-width').inputValue())-6.5)<.02);
   assert.ok(Math.abs(Number(await page.locator('#mir-steps-tread').inputValue())-11.16)<.03);
   await page.locator('#volume-dialog .close-dialog').click();
   await page.locator('[data-part="structure"]').click();
   assert.ok(await page.locator('text=MARCHES DÉTECTÉES DANS LES PIXELS').count()>=1);
   assert.ok(await page.locator('[data-use-pixel-stair="0"]').count()>=1);
   console.log('PASS '+width+'px : marches importées depuis pixels, 3D mesurée, hauteur non inventée');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
