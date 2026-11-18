'use strict';
/* Native client export using labelled local fixtures, never customer data. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright'),{serve}=require('./helpers/mir-static-http.cjs');
const M=require('../dist/production-model.js'),catalogue=require('../dist/catalogue-fd6866b49d21.json');
const root=path.resolve(__dirname,'..'),out=path.join(path.resolve(process.env.MIR_PLIAGE03_OUT||path.join(root,'docs/verification/pliage03-20261118')),'pdf');
const clone=x=>JSON.parse(JSON.stringify(x)),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const product=catalogue.materials.find(row=>row.id==='gentek-coil-3037');assert.ok(product);
function piece(index,side,quantity,angles){
 const colour=product.colors[index],id='M00'+(index+1),source={kind:'profile',template:'custom',id,name:'QA fictif — oblique face '+(index+1),unit:'in',length:120,quantity,startAngle:0,
  segments:[{label:'A',length:5},{label:'B',length:3},{label:'C',length:2}],bends:angles.map(angle=>({mode:'signed',angle})),
  material:{type:'aluminium',name:product.name,productRef:product.id,thickness:'',gauge:''},
  finish:{selectionType:'manufacturer',manufacturer:product.brand,system:'Nuancier '+product.brand,name:colour.name,code:colour.code||colour.name,swatchUrl:colour.swatchUrl,source:colour.sourceUrl,availabilityNote:colour.availabilityNote},
  coloredFace:{side,segmentId:'A'},location:'Recette locale seulement',note:'Fixture fictive. Aucun dossier utilisateur, aucune commande, aucun envoi.'};
 const made=M.createTemplate(source,{id:'pliage03-pdf-fixture-'+index,name:source.name,version:1});assert.equal(made.ok,true);
 const configured=M.instantiateTemplate(made.template,{instanceId:id,name:source.name,unit:source.unit,measurements:{A:5,B:3,C:2,length:120},length:120,quantity,
  material:source.material,finish:source.finish,coloredFace:source.coloredFace,location:source.location,note:source.note});assert.equal(configured.ok,true);
 return{id,kind:'profile',editableTrace:true,spec:clone(configured.spec),snapshot:clone(configured.snapshot),history:[],selection:{materialId:product.id,colorSystem:'manufacturer',colorId:colour.id}};
}
const order={id:'QA-PLIAGE03-PDF-LOCAL',project:'QA fictif — contrôle PDF local',poNumber:'QA-LOCAL-2-FACES',foreman:'Personne fictive',date:'2026-11-18',revision:'A',notes:'Deux pièces fictives pour recette uniquement. Aucun stock ou prix MIR confirmé.',nextNumber:3,
 items:[piece(0,'left',2,[-30,90]),piece(1,'right',3,[45.5,-67.25])]};
const report={fixture:true,customerData:false,submitted:false,externalRequestsCompleted:0,blocked:[],pageErrors:[],consoleErrors:[],httpErrors:[]};
async function main(){
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'fixture-order.json'),JSON.stringify(order,null,2)+'\n');
 const server=await serve(path.join(root,'dist'));let browser,context;
 try{
  browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});report.browser=browser.version();
  context=await browser.newContext({viewport:{width:1440,height:1000},locale:'fr-CA',acceptDownloads:true,reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(order=>{localStorage.setItem('mir-client-locale-v1','fr-CA');localStorage.setItem('mir_production_client_dossier_v1',JSON.stringify({version:1,order}));},order);
  await context.route('**/*',route=>{const request=route.request(),url=request.url(),method=request.method();if(new URL(url).origin===server.base&&method==='GET')return route.continue();report.blocked.push({url,method,knownTariffRead:/\/rpc\/mir_public_bend_tariff(?:\?|$)/.test(url)});return route.abort();});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>report.pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push({text:message.text(),url:message.location().url});});page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({status:response.status(),url:response.url()});});
  await page.goto(server.base+'/production.html?mode=client&kind=profile#production-order',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.MIRProductionWorkspace&&document.documentElement.lang==='fr-CA');
  const live=await page.evaluate(()=>MIRProductionWorkspace.getEstimationDossier());assert.deepEqual(live.items,order.items,'fixture loaded without reinterpretation');
  await page.locator('#production-pdf').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'client-dossier-before-export.png'),animations:'disabled'});
  const before=await page.evaluate(()=>localStorage.getItem('mir_production_client_dossier_v1'));
  report.presentedPages=await page.evaluate(()=>{
   const order=MIRProductionWorkspace.getEstimationDossier();
   return MIRProduction.productionPages({...order,items:order.items.map(item=>item.snapshot)},{document:'client-request',profileSurfaceRenderer:MIRPliageDocuments.clientRenderer(window)}).map(page=>({name:page.name,summary:page.summary,svg:page.svg}));
  });
  assert.equal(report.presentedPages.length,2);for(const [index,face] of report.presentedPages.entries()){assert.match(face.svg,new RegExp('data-painted-side="'+(index?'right':'left')+'"'));fs.writeFileSync(path.join(out,'source-page-'+(index+1)+'.svg'),face.svg);}
  await page.locator('#production-pdf').click();
  await page.locator('#mir-pdf-ready a[download]').waitFor({state:'visible',timeout:90000});
  await page.screenshot({path:path.join(out,'native-download-ready.png'),animations:'disabled'});
  const waiting=page.waitForEvent('download');await page.locator('#mir-pdf-ready a[download]').click();const download=await waiting;
  const filename='MIR-QA-local-deux-faces.pdf',file=path.join(out,filename);await download.saveAs(file);const pdf=fs.readFileSync(file);
  assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>25000);
  assert.equal(await page.evaluate(()=>localStorage.getItem('mir_production_client_dossier_v1')),before,'export leaves saved snapshots byte-identical');
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.httpErrors,[]);assert.ok(report.blocked.every(request=>request.knownTariffRead),'only the known tariff read may be attempted and blocked');
  assert.ok(report.consoleErrors.every(error=>report.blocked.some(request=>request.url===error.url)&&/ERR_FAILED/.test(error.text)),'no unexpected console error');
  report.download={file:filename,suggestedFilename:download.suggestedFilename(),bytes:pdf.length,sha256:sha(pdf),nativeButton:'#production-pdf',nativeLink:'#mir-pdf-ready a[download]'};
  report.savedOrderUnchanged=true;report.sourceSha256=Object.fromEntries(['production-app.js','production-model.js','mir-pliage-documents.js','mir-pliage-surfaces.js','annotated-pdf.js','mir-dossier-pdf.js'].map(file=>[file,sha(fs.readFileSync(path.join(root,'dist',file)))]));
  report.passed=true;console.log('PASS native client PDF download: '+pdf.length+' bytes, two local fixture pieces, no submission.');
 }catch(error){report.passed=false;report.error=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2)+'\n');if(context)await context.close();if(browser)await browser.close();await server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
