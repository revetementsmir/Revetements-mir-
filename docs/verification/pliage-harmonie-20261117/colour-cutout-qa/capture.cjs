'use strict';
/* Local/preview GET only. Palette QA; background removal is excluded.
   Retouches remain unorderable. Before serves source at the saved commit. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright'),{PNG}=require('pngjs');
const root=path.resolve(__dirname,'../../../..'),{serve}=require(path.join(root,'tests/helpers/mir-static-http.cjs'));
const baseline='bb39e142e646022a20eb804dacd8001321c7ee19',phase=process.env.MIR_COLOUR_CUTOUT_PHASE||'before';
const out=path.join(__dirname,phase);fs.mkdirSync(out,{recursive:true});
const cases=[
 {id:'hardie-colorplus-touch-up-kit',slug:'hardie-kit',query:'ColorPlus',expected:19,before:2,storeBefore:1,unorderable:true},
 {id:'canexel-touch-up-284ml',slug:'canexel-paint',query:'Peinture de retouche',expected:20,before:20,storeBefore:16,unorderable:true},
 {id:'st-laurent-lap-625',slug:'st-laurent',query:'Bardage à clin 6,25',expected:24,before:24,storeBefore:24,unorderable:false}
];
const report={phase,createdAt:new Date().toISOString(),scope:'Chromium 390/834/1440; same-origin GET only; no business requests; no physical device certification',baseline,sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),hashes:{},results:[],checks:[]};
const cached=new Map(),types={'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html; charset=utf-8'};
function oldSource(file){if(!cached.has(file))cached.set(file,execFileSync('git',['show',baseline+':dist/'+file],{cwd:root,maxBuffer:20*1024*1024,stdio:['ignore','pipe','ignore']}));return cached.get(file);}
for(const f of ['commerce.js','catalogue-fd6866b49d21.json','mir-client-colour-palettes.json','material-preview.js','mir-client-siding-previews.js','magasin-revue.js','chantier-app.js','mir-store-siding-previews.js','mir-field-samsung.css'])report.hashes[f]=crypto.createHash('sha256').update(phase==='before'?oldSource(f):fs.readFileSync(path.join(root,'dist',f))).digest('hex');
function save(){fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');}
function check(name,fn){try{fn();report.checks.push({name,pass:true});}catch(e){report.checks.push({name,pass:false,error:e.message});}}
async function settle(p){await p.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('img').forEach(i=>i.loading='eager');await Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,2000))]);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});await p.waitForTimeout(300);}
function pixels(a,b){const aa=PNG.sync.read(a),bb=PNG.sync.read(b);assert.equal(aa.width,bb.width);assert.equal(aa.height,bb.height);let changed=0;for(let i=0;i<aa.data.length;i+=4)if(Math.max(Math.abs(aa.data[i]-bb.data[i]),Math.abs(aa.data[i+1]-bb.data[i+1]),Math.abs(aa.data[i+2]-bb.data[i+2]))>4)changed++;return {changedPixels:changed,ratio:changed/(aa.width*aa.height)};}
async function info(p){return p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,htmlLanguage:document.documentElement.lang,colors:[...document.querySelectorAll('[data-color]')].map(n=>({id:n.dataset.color,name:n.innerText,pressed:n.getAttribute('aria-pressed'),label:n.getAttribute('aria-label')})),image:[...document.querySelectorAll('#product-photo img,#product-photo canvas,#product-photo svg')].map(n=>({tag:n.tagName,src:n.getAttribute('src'),viewBox:n.getAttribute('viewBox'),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})),note:document.querySelector('#product-photo-note')?.textContent,selectedName:document.querySelector('#selected-color-name')?.textContent,addDisabled:document.querySelector('#product-add')?.disabled}));}
async function screenshot(p,row,name){const f=`${phase}-${name}-${row.width}.png`;await p.screenshot({path:path.join(out,f),animations:'disabled'});row.files.push(f);return f;}
function choiceIds(x,ids){return x.id==='st-laurent-lap-625'?['st-laurent-blanc','st-laurent-noir']:[ids[0],ids.at(-1)];}
async function productScene(p,base,row,x){
 await p.goto(base+'/produit.html?id='+x.id+'&recette=1',{waitUntil:'domcontentloaded'});await p.locator('#product-add').waitFor();await settle(p);row.product=await info(p);
 check(x.slug+' '+row.width+' product palette count',()=>assert.equal(row.product.colors.length,phase==='before'?x.before:x.expected));
 check(x.slug+' '+row.width+' product no overflow',()=>assert(row.product.scrollWidth<=row.width+1));
 check(x.slug+' '+row.width+' commercial limits preserved',()=>assert.equal(row.product.addDisabled,x.unorderable));
 await screenshot(p,row,'product-'+x.slug);
 const palette=p.locator('.product-color-section');await palette.evaluate(e=>{const g=document.querySelector('.product-gallery'),offset=innerWidth<701&&getComputedStyle(g).position==='sticky'?g.getBoundingClientRect().height+24:25;scrollTo(0,e.getBoundingClientRect().top+scrollY-offset);});await settle(p);await screenshot(p,row,'palette-'+x.slug);
 const optionIds=await p.locator('[data-color]').evaluateAll(nodes=>nodes.map(n=>n.dataset.color));const [firstId,lastId]=choiceIds(x,optionIds);
 const selected=[],samplePixels=[];for(const id of [firstId,lastId]){await p.locator('[data-color="'+id+'"]').click();await settle(p);selected.push({id,pressed:await p.locator('[data-color="'+id+'"]').getAttribute('aria-pressed'),urlColor:new URL(p.url()).searchParams.get('color'),info:await info(p)});if(x.id==='st-laurent-lap-625')samplePixels.push(await p.locator('#product-photo').screenshot({animations:'disabled'}));}row.selections=selected;if(samplePixels.length===2){row.productPixels=pixels(...samplePixels);check(x.slug+' '+row.width+' actual sample colour changes',()=>assert(row.productPixels.ratio>.002));}
 check(x.slug+' '+row.width+' colour selection and URL',()=>{for(const s of selected){assert.equal(s.pressed,'true');assert.equal(s.urlColor,s.id);}});
 await p.reload();await p.locator('#product-add').waitFor();await settle(p);row.reloadedColor=await p.locator('[data-color][aria-pressed="true"]').getAttribute('data-color');check(x.slug+' '+row.width+' colour reload',()=>assert.equal(row.reloadedColor,lastId));
 if(x.unorderable){row.cart={notAttempted:'Unorderable reference; disabled button preserved'};return;}
 const fmt=p.locator('#product-format');if(await fmt.count()){const value=await fmt.locator('option').evaluateAll(ns=>ns.find(n=>n.value)?.value);if(value)await fmt.selectOption(value);}
 const quantity=p.locator('#product-quantity'),step=Number(await quantity.getAttribute('step'));assert(Number.isFinite(step)&&step>0,'The quantity field must expose a positive increment');await quantity.fill(String(2*step));
 row.productQuantity=await quantity.evaluate(n=>({quantity:Number(n.value),unit:document.querySelector('#product-unit').value,step:Number(n.step),valid:n.checkValidity(),message:n.validationMessage}));assert.equal(row.productQuantity.valid,true,row.productQuantity.message);await p.locator('#product-add').click();await p.locator('#product-added').waitFor({state:'visible'});
 await p.goto(base+'/selection.html?recette=1',{waitUntil:'domcontentloaded'});await p.locator('.selection-item').first().waitFor();await settle(p);
 const line=p.locator('.selection-item').filter({has:p.locator('a[href*="id='+x.id+'"]')}).first();row.cart={before:await line.locator('[data-cart-color]').inputValue(),optionCount:await line.locator('[data-cart-color] option').count()};const cartPixels=[await line.locator('.selection-item-photo').screenshot({animations:'disabled'})];check(x.slug+' '+row.width+' cart selected colour',()=>{assert.equal(row.cart.before,lastId);assert.equal(row.cart.optionCount,x.expected);});
 await line.locator('[data-cart-color]').selectOption(firstId);await settle(p);row.cart.after=await line.locator('[data-cart-color]').inputValue();cartPixels.push(await line.locator('.selection-item-photo').screenshot({animations:'disabled'}));row.cart.pixels=pixels(...cartPixels);check(x.slug+' '+row.width+' cart sample colour changes',()=>assert(row.cart.pixels.ratio>.002));await p.reload();await p.locator('[data-cart-color]').waitFor();row.cart.reloaded=await p.locator('[data-cart-color]').inputValue();check(x.slug+' '+row.width+' cart change persists',()=>assert.equal(row.cart.reloaded,firstId));await screenshot(p,row,'cart-'+x.slug);
}
async function shopScene(p,base,row,x){
 await p.goto(base+'/boutique.html?q='+encodeURIComponent(x.id)+'&recette=1',{waitUntil:'domcontentloaded'});const card=p.locator('[data-shop-card="'+x.id+'"]');await card.waitFor();await card.scrollIntoViewIfNeeded();await settle(p);row.boutique=await card.evaluate(n=>({colors:[...n.querySelectorAll('[data-card-color]')].map(n=>({id:n.dataset.cardColor,label:n.getAttribute('aria-label')})),images:[...n.querySelectorAll('img,canvas,svg')].map(n=>({tag:n.tagName,src:n.getAttribute('src')}))}));check(x.slug+' '+row.width+' shop palette count',()=>assert.equal(row.boutique.colors.length,phase==='before'?x.before:x.expected));await screenshot(p,row,'shop-'+x.slug);
 const last=card.locator('[data-card-color]').last();await last.click();await settle(p);const selected=await last.getAttribute('data-card-color');const links=await card.locator('[data-card-link]').evaluateAll(ns=>ns.map(n=>new URL(n.href).searchParams.get('color')));check(x.slug+' '+row.width+' shop choice to detail',()=>assert(links.length>0&&links.every(c=>c===selected)));
}
async function storeScene(p,base,row,x){
 await p.goto(base+'/magasin-revue.html',{waitUntil:'domcontentloaded'});await p.locator('#products [data-product]').first().waitFor();await p.locator('#search').fill(x.query);const card=p.locator('#products [data-product="'+x.id+'"]');await card.waitFor();await settle(p);await card.scrollIntoViewIfNeeded();
 row.magasin=await card.evaluate(n=>({id:n.dataset.product,name:n.querySelector('h2')?.textContent,colors:[...n.querySelectorAll('[data-product-color] option')].filter(n=>n.value).map(n=>({id:n.value,name:n.textContent})),images:[...n.querySelectorAll('[data-visual] img,[data-visual] canvas,[data-visual] svg')].map(n=>({tag:n.tagName,src:n.getAttribute('src')})),label:n.querySelector('[data-visual-label]')?.textContent}));
 check(x.slug+' '+row.width+' store palette count',()=>assert.equal(row.magasin.colors.length,phase==='before'?x.storeBefore:x.expected));
 const select=card.locator('[data-product-color]');if(await select.count()){row.magasinSelections=[];const storePixels=[];for(const id of choiceIds(x,row.magasin.colors.map(c=>c.id)).filter(Boolean)){await select.selectOption(id);await settle(p);const state=await card.evaluate(n=>({color:n.querySelector('[data-product-color]')?.value,images:[...n.querySelectorAll('[data-visual] img,[data-visual] canvas,[data-visual] svg')].map(n=>({tag:n.tagName,src:n.getAttribute('src')})),label:n.querySelector('[data-visual-label]')?.textContent,swatch:n.querySelector('[data-touch-up-swatch]')?.dataset.colorId,swatchColor:n.querySelector('[data-touch-up-swatch]')?getComputedStyle(n.querySelector('[data-touch-up-swatch]')).backgroundColor:null,unavailable:!!n.querySelector('.sample-unavailable,.field-product-no-photo,[data-no-photo]')}));row.magasinSelections.push(state);if(phase!=='before')check(x.slug+' '+row.width+' store image retained for '+id,()=>{assert.equal(state.color,id);assert(state.images.length>0);assert.equal(state.unavailable,false);if(x.id==='hardie-colorplus-touch-up-kit')assert.equal(state.swatch,id);});if(x.id==='st-laurent-lap-625')storePixels.push(await card.locator('[data-visual]').screenshot({animations:'disabled'}));}if(storePixels.length===2){row.storePixels=pixels(...storePixels);check(x.slug+' '+row.width+' store sample colour changes',()=>assert(row.storePixels.ratio>.002));}}
 await screenshot(p,row,'magasin-'+x.slug);
}
async function employeeScene(p,base,row,x){
 const fixture=require(path.join(root,'tests/helpers/mir-field-fixture.cjs'));
 const fixtureSource=fixture.toString().replace('model.createDemoState([])','model.createDemoState(window.__sampleMaterials)');
 assert.notEqual(fixtureSource,fixture.toString(),'Employee fixture must load the catalogue under test');
 const portalRoute=url=>url.pathname.endsWith('/portal-client.js');
 const portal=phase==='before'?oldSource('portal-client.js').toString():fs.readFileSync(path.join(root,'dist/portal-client.js'),'utf8');
 const materials=JSON.parse(phase==='before'?oldSource('catalogue-fd6866b49d21.json').toString():fs.readFileSync(path.join(root,'dist/catalogue-fd6866b49d21.json'),'utf8')).materials;
 await p.addInitScript(rows=>window.__sampleMaterials=rows,materials);
 await p.route(portalRoute,r=>r.fulfill({contentType:'application/javascript',body:portal+';('+fixtureSource+')();'}));
 try{
  await p.goto(base+'/chantier.html?recette=1',{waitUntil:'domcontentloaded'});await p.locator('#field-header').waitFor();await p.locator('#portal-navigation [data-view=command]').click();await p.locator('[data-field-catalogue=material]').click();await p.locator('#catalogue-search').fill(x.query);await p.locator('[data-field-product="'+x.id+'"]').click();
  const card=p.locator('.field-store-detail [data-product="'+x.id+'"]'),select=card.locator('[data-product-color]');await select.waitFor({state:'attached'});await settle(p);
  row.employee={colors:await select.locator('option').evaluateAll(ns=>ns.filter(n=>n.value).map(n=>({id:n.value,name:n.textContent})))};
  check(x.slug+' '+row.width+' employee palette count',()=>assert.equal(row.employee.colors.length,phase==='before'?x.storeBefore:x.expected));
  row.employee.selections=[];
  for(const id of choiceIds(x,row.employee.colors.map(c=>c.id)).filter(Boolean)){
   await select.locator('xpath=following-sibling::button[1]').click();const index=await select.locator('option').evaluateAll((ns,id)=>ns.findIndex(n=>n.value===id),id);await p.locator('.mir-choice-sheet [data-choice-index="'+index+'"]').click();await settle(p);
   const state=await card.evaluate(n=>({color:n.querySelector('[data-product-color]')?.value,images:[...n.querySelectorAll('[data-product-sample] img,[data-product-sample] canvas,[data-product-sample] svg')].map(n=>({tag:n.tagName,src:n.getAttribute('src')})),swatch:n.querySelector('[data-touch-up-swatch]')?.dataset.colorId,label:n.querySelector('.product-preview-caption')?.textContent,unavailable:!!n.querySelector('.sample-unavailable,.field-product-no-photo,[data-no-photo]')}));
   row.employee.selections.push(state);if(phase!=='before')check(x.slug+' '+row.width+' employee image retained '+id,()=>{assert.equal(state.color,id);assert(state.images.length>0);assert.equal(state.unavailable,false);if(x.id==='hardie-colorplus-touch-up-kit')assert.equal(state.swatch,id);});
   if(phase!=='before'&&x.unorderable){const caption=card.locator('.product-preview-caption[data-keep-product-photo-caption]'),swatch=card.locator('[data-touch-up-swatch]');state.captionVisible=await caption.isVisible();state.swatchPresent=await swatch.count()>0;state.swatchVisible=state.swatchPresent?await swatch.isVisible():null;check(x.slug+' '+row.width+' employee touch-up caption visible '+id,()=>{assert.equal(state.captionVisible,true,'Touch-up caption must be visible');if(state.swatchPresent)assert.equal(state.swatchVisible,true,'Present touch-up swatch must be visible');});}
  }
  row.employee.businessCalls=await p.evaluate(()=>__fieldFixture.calls.filter(c=>['order','upload','command','field','punch','lead'].includes(c[0])).length);check(x.slug+' '+row.width+' employee no business calls',()=>assert.equal(row.employee.businessCalls,0));await screenshot(p,row,'employee-'+x.slug);
 }finally{await p.unroute(portalRoute);}
}
(async()=>{let browser;const local=process.env.MIR_COLOUR_CUTOUT_BASE_URL?null:await serve(path.join(root,'dist')),base=(process.env.MIR_COLOUR_CUTOUT_BASE_URL||local.base).replace(/\/$/,'');report.baseOrigin=new URL(base).origin;try{
 browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const size of [{width:1440,height:1050},{width:834,height:1112},{width:390,height:844}]){
  const context=await browser.newContext({viewport:size,reducedMotion:'reduce',serviceWorkers:'block'}),blocked=[];
  await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url()),b=new URL(base);if(u.origin===b.origin&&r.method()==='GET'){
   if(phase==='before'&&types[path.extname(u.pathname)]){const file=u.pathname.replace(b.pathname.replace(/\/$/,''),'').replace(/^\//,'');try{return route.fulfill({contentType:types[path.extname(file)],body:oldSource(file)});}catch{}}
   return route.continue();}blocked.push({method:r.method(),url:u.origin+u.pathname});return route.abort();});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(25000);
  for(const x of cases){const row={id:x.id,width:size.width,files:[]};for(const [scene,fn]of [['product',productScene],['shop',shopScene],['store',storeScene],['employee',employeeScene]]){try{await fn(p,base,row,x);}catch(e){row[scene+'Error']=e.message;report.checks.push({name:x.slug+' '+size.width+' '+scene+' scenario',pass:false,error:e.message});}}row.errors=errors.splice(0);row.blocked=blocked.splice(0);check(x.slug+' '+size.width+' no JS errors',()=>assert.deepEqual(row.errors,[]));report.results.push(row);save();console.log(x.slug+' '+size.width+' captured');}
  await context.close();
 }
}catch(e){report.executionError=e.message;throw e;}finally{if(browser)await browser.close();if(local)await local.close();save();}
 const failed=report.checks.filter(x=>!x.pass);console.log(JSON.stringify({phase,scenes:report.results.length,checks:report.checks.length,failed:failed.length}));if(failed.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
