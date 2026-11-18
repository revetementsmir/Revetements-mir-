'use strict';
// Local browser proof: locale roundtrips change presentation only. All external
// requests and non-GET/HEAD transport are blocked; no real submission occurs.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {once}=require('node:events'),{chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),root=path.join(repo,'dist');
const width=Number(process.env.MIR_PLIAGE03_I18N_WIDTH)||1440;
const output=path.join(repo,'docs/verification/pliage03-20261118/i18n-browser-results'+(width===1440?'':'-'+width)+'.json');
const report={viewport:{width,height:width===390?844:width===834?1194:900},checks:[],blocked:[],pageErrors:[],files:{}};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
report.testSha256=sha(fs.readFileSync(__filename));
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
 try{
  const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
  if(!file.startsWith(root+path.sep))throw Error('outside dist');
  const data=fs.readFileSync(file);report.files[path.relative(root,file)]=sha(data);
  res.writeHead(200,{'cache-control':'no-store','content-type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});
  res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404).end();}
});
async function setLocale(page,locale){await page.evaluate(locale=>{MIRClientLocale.setLocale(locale);MIRClientLocale.render();},locale);await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);}
async function ready(page){await page.waitForFunction(()=>window.MIRClientLocale);await page.evaluate(()=>MIRClientLocale.render());}
async function invariant(page){return page.evaluate(()=>({spec:window.MIRProductionWorkspace?.getLivePreviewState().model.spec,cart:window.MIRUnifiedOrderCart?.list(),values:[...document.querySelectorAll('input,select,textarea')].filter(n=>!n.closest('[data-admin-only]')).map(n=>({id:n.id,type:n.type,value:n.value,checked:n.checked}))}));}
async function roundtrip(page,name,pairs){
 await ready(page);const before=await invariant(page);
 for(const locale of ['fr-CA','en-CA']){
  await setLocale(page,locale);
  for(const {selector,fr,en,attr}of pairs){const node=page.locator(selector).first(),expected=locale==='en-CA'?en:fr;await node.waitFor({state:'attached'});const text=attr?await node.getAttribute(attr):(await node.innerText()).trim();assert.equal(text,expected,name+' '+locale+' '+selector);}
  assert.deepEqual(await invariant(page),before,name+' locale preserves form values, geometry, finish and cart');
 }
 report.checks.push({name,passed:true,pairs:pairs.length});
}
async function main(){
 server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});report.browser=browser.version();
 const context=await browser.newContext({viewport:report.viewport,hasTouch:width<1000,serviceWorkers:'block',locale:'en-CA',reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('mir-client-locale-v1','en-CA'));
 await context.route('**/*',route=>{const request=route.request();if(new URL(request.url()).origin===origin&&['GET','HEAD'].includes(request.method()))return route.continue();report.blocked.push({method:request.method(),url:request.url()});return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.pageErrors.push(error.message));
 try{
  await page.goto(origin+'/pliage.html',{waitUntil:'domcontentloaded'});await ready(page);
  await roundtrip(page,'landing',[{selector:'#client-bend-title',fr:'Votre pliage sur mesure.',en:'Your custom metal trim.'}]);
  await page.goto(origin+'/production.html?mode=client&kind=profile',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.MIRProductionWorkspace);await ready(page);
  await roundtrip(page,'choice',[{selector:'#client-entry-title',fr:'Votre pliage sur mesure',en:'Your custom metal trim'},{selector:'#client-choose-model strong',fr:'Choisir un modèle',en:'Choose a model'}]);
  await page.locator('#client-choose-model').click();await ready(page);
  await roundtrip(page,'models',[{selector:'#client-entry-title',fr:'Choisissez votre modèle',en:'Choose your model'}]);
  await page.locator('[data-client-profile="l"]').click();await page.locator('[data-measure="A"]').fill('3.5');await page.locator('[data-measure="B"]').fill('2.25');
  await roundtrip(page,'measurements',[{selector:'#client-step-hint',fr:'Chaque angle se règle séparément.',en:'Each angle can be adjusted separately.'},{selector:'[data-measure="A"]',attr:'aria-label',fr:'Côté A — Aile A (po)',en:'Side A — Flange A (in.)'},{selector:'[data-client-angle-nudge="0"][data-delta="1"]',attr:'aria-label',fr:'Augmenter l’angle A–B',en:'Increase angle A–B'}]);
  await page.locator('#client-step-next').click();await page.locator('#material-type').selectOption('aluminium');await page.locator('[data-production-color]').first().click();await page.locator('[data-client-face="left"]').click();
  await roundtrip(page,'finish',[{selector:'.client-painted-face>strong',fr:'Côté peint',en:'Painted side'},{selector:'.client-painted-face>.field-hint',fr:'La ligne bleue indique le côté peint.',en:'The blue line marks the painted side.'}]);
  const officialColours=await page.locator('[data-production-color] .name').evaluateAll(nodes=>nodes.map(n=>n.textContent));await setLocale(page,'fr-CA');assert.deepEqual(await page.locator('[data-production-color] .name').evaluateAll(nodes=>nodes.map(n=>n.textContent)),officialColours,'official manufacturer colour labels remain unchanged');await setLocale(page,'en-CA');
  report.checks.push({name:'official-colour-labels',passed:true,count:officialColours.length});
  const accessibleColours=[];
  for(const locale of ['en-CA','fr-CA','en-CA']){
   await setLocale(page,locale);
   const observed=[];
   for(const [name,code]of [['Ivoire','302'],['Sable','920']]){
    // getByRole resolves the browser's accessible name, including labelledby.
    // The source references are also verified; visible text alone is insufficient.
    const button=page.getByRole('button',{name:name+' '+code,exact:true});
    assert.equal(await button.count(),1,locale+' exact accessible manufacturer reference '+name);
    const detail=await button.evaluate(button=>{
     const ids=(button.getAttribute('aria-labelledby')||'').trim().split(/\s+/).filter(Boolean);
     return{id:button.dataset.productionColor,ariaLabel:button.getAttribute('aria-label'),references:ids.map(id=>{
      const target=document.getElementById(id);
      return{id,text:target?.textContent,protected:target?.hasAttribute('data-mir-source-color'),inside:!!target&&button.contains(target),unique:[...document.querySelectorAll('[id]')].filter(n=>n.id===id).length===1};
     })};
    });
    assert.equal(detail.ariaLabel,null,'no translatable aria-label replaces the official reference');
    assert.deepEqual(detail.references.map(ref=>ref.text),[name,code]);
    assert.ok(detail.references.every(ref=>ref.protected&&ref.inside&&ref.unique),'valid protected name and code references');
    observed.push(detail);
   }
   if(accessibleColours.length)assert.deepEqual(observed,accessibleColours[0].colours,'locale preserves accessible manufacturer names and codes');
   accessibleColours.push({locale,colours:observed});
  }
  report.checks.push({name:'official-colour-accessible-names',passed:true,detail:accessibleColours});
  await page.locator('#client-step-next').click();await page.locator('#production-quantity').fill('2');
  await roundtrip(page,'review',[{selector:'#client-step-title',fr:'Vérifier mon pliage',en:'Review my trim'},{selector:'.mir-pliage03-recap-edit [data-client-step="2"]',fr:'Modifier les mesures ↗',en:'Edit dimensions ↗'}]);
  await page.locator('#client-step-next').click();await page.locator('#production-dialog[open]').waitFor();
  await roundtrip(page,'added',[{selector:'#production-dialog h2',fr:'Pliage ajouté',en:'Trim piece added'},{selector:'[data-new-client-custom]',fr:'Dessiner un autre pliage',en:'Draw another trim piece'}]);
  assert.equal(await page.evaluate(()=>MIRUnifiedOrderCart.list().length),1);
  await page.locator('[data-new-client-custom]').click();
  const touch=await page.evaluate(()=>matchMedia('(any-pointer:coarse)').matches);
  await roundtrip(page,'draw',[{selector:'.client-trace-help',fr:(touch?'Touchez':'Cliquez sur')+' la grille pour placer le premier point.',en:(touch?'Tap':'Click')+' the grid to place the first point.'},{selector:'.client-keyboard-trace summary',fr:'Saisir les points au clavier',en:'Enter points using the keyboard'},{selector:'#drawing-tools [data-draw-tool="draw"]',attr:'aria-label',fr:'Suivant — terminer le dessin',en:'Next — finish the drawing'}]);
  await page.goto(origin+'/selection.html',{waitUntil:'domcontentloaded'});await ready(page);await setLocale(page,'en-CA');
  const pdf=await page.evaluate(()=>{
   const sentences=['Face colorée : Face 1 — côté indiqué par le liseré bleu','Face colorée : Face 2 — côté indiqué par le liseré bleu','Face colorée : Face 1 — côté indiqué par','Face colorée : Face 2 — côté indiqué par','le liseré bleu','Produit :','Référence produit :'];
   const options={filename:'proof.pdf',title:'Pliage ajouté',faces:[{svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path d="M1 2L30 40"/><text x="2" y="4">Face colorée : Face 1 — côté indiqué par</text><text x="2" y="8">le liseré bleu</text><text x="2" y="12"><tspan>Produit :</tspan><tspan>Gentek — Feuille peinte aluminium 3037, 24po×98,5pi</tspan></text><text x="2" y="16"><tspan>Référence produit :</tspan><tspan>gentek-coil-3037</tspan></text></svg>'}]};
   const source=JSON.stringify(options),translated=MIRClientLocale.localizePdfOptions(options),key='mir-bending-v1',previous=localStorage.getItem(key);
   let protectedOutput;try{localStorage.setItem(key,JSON.stringify({notes:'le liseré bleu / Produit : / Référence produit :'}));protectedOutput=MIRClientLocale.localizePdfOptions(options);}finally{previous===null?localStorage.removeItem(key):localStorage.setItem(key,previous);}
   return{labels:sentences.map(s=>MIRClientLocale.pdfText(s)),translated,protectedOutput,unchanged:JSON.stringify(options)===source};
  });
  assert.deepEqual(pdf.labels,['Painted face: Face 1 — side marked by the blue line','Painted face: Face 2 — side marked by the blue line','Painted face: Face 1 — side marked by','Painted face: Face 2 — side marked by','the blue line','Product:','Product reference:']);
  assert.match(pdf.translated.faces[0].svg,/Painted face: Face 1 — side marked by/);assert.match(pdf.translated.faces[0].svg,/>the blue line<\/text>/);assert.match(pdf.translated.faces[0].svg,/d="M1 2L30 40"/);assert.match(pdf.protectedOutput.faces[0].svg,/>le liseré bleu<\/text>/);assert.equal(pdf.unchanged,true);
  assert.match(pdf.translated.faces[0].svg,/>Product:<\/tspan><tspan>Gentek — Feuille peinte aluminium 3037, 24po×98,5pi<\/tspan>/);
  assert.match(pdf.translated.faces[0].svg,/>Product reference:<\/tspan><tspan>gentek-coil-3037<\/tspan>/);
  assert.match(pdf.protectedOutput.faces[0].svg,/>Produit :<\/tspan>/);assert.match(pdf.protectedOutput.faces[0].svg,/>Référence produit :<\/tspan>/);
  report.checks.push({name:'cart-pdf-fixed-labels-and-protected-notes',passed:true,detail:pdf});
  const productPdf=await page.evaluate(()=>{
   const source=JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')),order=source.order||source;
   const material=order.items[0].spec?.material||order.items[0].snapshot?.spec?.material;
   const before=JSON.stringify(source),states=[];
   for(const locale of ['fr-CA','en-CA']){
    MIRClientLocale.setLocale(locale);
    const faces=MIRProduction.productionPages(order,{document:'client-request',profileSurfaceRenderer:MIRPliageDocuments.clientRenderer(window)});
    const output=MIRClientLocale.localizePdfOptions({filename:'product-proof.pdf',faces});
    const svgText=output.faces.flatMap(face=>[...new DOMParser().parseFromString(face.svg,'image/svg+xml').querySelectorAll('text')].map(n=>n.textContent)).join(' ').replace(/\s+/g,' ');
    states.push({locale,svgText,summary:output.faces.flatMap(face=>face.summary||[]).join(' ')});
   }
   return{material,states,unchanged:JSON.stringify(source)===before&&localStorage.getItem('mir_production_client_dossier_v1')===JSON.stringify(source)};
  });
  assert.ok(productPdf.material?.name&&productPdf.material?.productRef,'real saved product name and reference are available');
  for(const {locale,svgText,summary}of productPdf.states){
   const prefix=locale==='en-CA'?'Product: ':'Produit : ',referencePrefix=locale==='en-CA'?'Product reference: ':'Référence produit : ';
   assert.ok(svgText.includes(prefix+productPdf.material.name),'actual rendered PDF includes exact '+locale+' product name');
   assert.ok(svgText.includes(referencePrefix+productPdf.material.productRef),'actual rendered PDF includes exact '+locale+' product reference');
   assert.ok(summary.includes(prefix+productPdf.material.name));assert.ok(summary.includes(referencePrefix+productPdf.material.productRef));
  }
  assert.equal(productPdf.unchanged,true);report.checks.push({name:'cart-pdf-real-product-and-reference',passed:true,detail:productPdf});
  assert.deepEqual(report.pageErrors,[]);report.passed=true;
 }catch(error){report.passed=false;report.error=error.stack;throw error;}
 finally{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));}
 console.log('PASS Pliage 03 i18n browser: '+report.checks.length+' checks, local transport only.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
