'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright'),{serve}=require('./helpers/mir-static-http.cjs');
const root=path.resolve(__dirname,'..'),output=path.join(root,'docs/verification/pliage-harmonie-20261117');
(async()=>{
 const server=await serve(path.join(root,'.prestige-preview')),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
 const report={cases:[],externalTransmitted:0,realSubmissions:0,errors:[],physicalDevices:false};
 try{
  for(const width of [1440,834,390]){
   const context=await browser.newContext({viewport:{width,height:width===1440?1100:width===834?1112:844},serviceWorkers:'block',hasTouch:width!==1440});
   await context.route('**/*',route=>new URL(route.request().url()).origin===server.base&&['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(server.base+'/test/pliage-harmonie-20261117.html');
   assert.ok(await page.locator('script[src$="mir-prestige-preview-guard.js"]').count());
   for(const topic of ['geometry','journey','samples','pdf']){
    await page.locator('#topic').selectOption(topic);await page.locator('#width').selectOption(topic==='pdf'?'pdf':String(width));
    assert.ok(await page.locator('figure:visible').count(),topic+' evidence '+width);
    const first=page.locator('figure:visible img').first();await first.scrollIntoViewIfNeeded();await first.evaluate(img=>img.decode());
    assert.ok(await first.evaluate(img=>img.naturalWidth>0));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    report.cases.push({width,topic,captures:await page.locator('figure:visible').count(),overflow:false});
   }
   await page.locator('#topic').selectOption('samples');await page.locator('#width').selectOption(String(width));await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:path.join(output,'gallery-'+width+'.png'),fullPage:false});
   const pdfLinks=await page.locator('.downloads a').evaluateAll(links=>links.map(a=>a.href));
   assert.ok(pdfLinks.length>=6);
   if(width===1440){for(const href of pdfLinks){const response=await context.request.get(href);assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,5).toString(),'%PDF-');}report.pdfs=pdfLinks.length;}
   const guard=await page.evaluate(async()=>{const out=[];for(const [url,init]of[['https://example.invalid/no-request',{}],['./not-a-real-submit',{method:'POST'}]])try{await fetch(url,init);out.push('unexpected-success')}catch(e){out.push(e.message)}return out;});assert.deepEqual(guard,['TEST_ENDPOINT_DENIED','PREVIEW_EXTERNAL_REQUEST_DISABLED']);
   await page.goto(server.base+'/test/production.html?mode=client&kind=profile');
   await page.locator('.mir-mobile-tabs a[href*="pliage.html"][aria-current="page"]').waitFor({state:'attached'});
   assert.equal(await page.locator('.mir-mobile-tabs [aria-current="page"]').count(),1);
   report.cases.push({width,topic:'mobile-navigation',bendingActive:true});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
  report.files=Object.fromEntries(['production-app.js','production-model.js','mir-profile-recognition.js','pliage.js','mir-client-siding-previews.js','mir-store-siding-previews.js','material-preview.js','commerce.js','chantier-app.js','magasin-revue.js','mir-client-en-ca.js','mir-dossier-pdf.js','mir-selection-pdf.js','annotated-pdf.js','mir-panel-po-pdf.js','production.html','mir-pliage-journey.css','pliage.html','mir-client-pliage-viewport.js','mir-client-pliage.css','magasin-revue.html','chantier.html','mir-prestige.js'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist',name))).digest('hex')]));
  fs.writeFileSync(path.join(output,'preview-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,cases:report.cases.length,pdfs:report.pdfs,errors:0,externalTransmitted:0}));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
