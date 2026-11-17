'use strict';
// Independent review of the generated static preview. Never uses real Auth.
// A second browser-level barrier aborts every external or mutating request.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=process.env.MIR_PREVIEW_ORIGIN||'http://127.0.0.1:8768';
const results=[],attempts=[];
const check=async(name,run)=>{try{results.push({name,passed:true,detail:await run()});}catch(error){results.push({name,passed:false,error:error.message});}};
function walk(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(folder,e.name)):[path.join(folder,e.name)]);}
(async()=>{
 await check('Every generated HTML has the restrictive policy and early guard',()=>{
  const files=walk(path.join(root,'.prestige-preview/test')).filter(f=>f.endsWith('.html'));
  for(const file of files){const html=fs.readFileSync(file,'utf8');assert.match(html,/<meta http-equiv="Content-Security-Policy" content="[^"]*connect-src 'self';/);assert.match(html,/<script src="(?:\.\.\/)*mir-prestige-preview-guard\.js"><\/script>/);assert.ok(html.indexOf('mir-prestige-preview-guard.js')<html.indexOf('mir-test-guard.js')||!html.includes('mir-test-guard.js'));}
  assert.ok(fs.statSync(path.join(root,'.prestige-preview/test/prestige-captures.tar.gz')).size>1000);
  const portal=fs.readFileSync(path.join(root,'.prestige-preview/test/portal-config.js'),'utf8');
  assert.match(portal,/"environment":"test"/);assert.match(portal,/"emailEnabled":false/);assert.match(portal,/"googleEnabled":false/);assert.match(portal,/"signupEnabled":false/);
  return {htmlFiles:files.length,archiveAvailable:true};
 });
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base||!['GET','HEAD'].includes(req.method())){attempts.push({url:req.url(),method:req.method()});return route.abort();}return route.continue();});
 const page=await context.newPage();page.setDefaultTimeout(12000);
 await check('TEST navigation, cart and locale stay under the preview prefix',async()=>{
  await page.goto(base+'/test/boutique.html?recette=1');await page.locator('#mir-prestige-header').waitFor();
  const links=await page.locator('#mir-prestige-header a[href]').evaluateAll(nodes=>nodes.map(a=>a.href));
  links.forEach(href=>{const url=new URL(href);assert.equal(url.origin,base);assert.ok(url.pathname.startsWith('/test/'));assert.equal(url.searchParams.get('recette'),'1');});
  await page.evaluate(()=>localStorage.setItem('mir-client-locale-v1','en-CA'));
  await page.goto(base+'/test/aide.html?recette=1');await page.locator('#mir-prestige-header').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'en-CA');
  const state=await context.storageState();const keys=state.origins.flatMap(o=>o.localStorage.map(k=>k.name));assert.ok(keys.includes('mir-test:hxtztkmbfpmzrieccwsg:mir-client-locale-v1'));assert.ok(!keys.includes('mir-client-locale-v1'));
  return {links:links.length,language:'en-CA',storage:'TEST namespace'};
 });
 await check('Fetch, XHR, sockets, beacon and same-origin writes are blocked before transfer',async()=>{
  const count=attempts.length;
  const output=await page.evaluate(async()=>{
   const result={};for(const [name,url,init] of [['external','https://example.invalid/mir-preview-probe',{}],['localWrite','./__preview_no_write__',{method:'POST',body:'synthetic'}],['outsidePreview','/outside-preview',{}]]){try{await fetch(url,init);result[name]=false;}catch{result[name]=true;}}
   for(const [name,run] of [['xhr',()=>{const x=new XMLHttpRequest();x.open('POST','./__preview_no_write__');x.send('synthetic');}],['socket',()=>new WebSocket('wss://example.invalid/probe')],['events',()=>new EventSource('https://example.invalid/probe')]]){try{run();result[name]=false;}catch{result[name]=true;}}
   try{result.beacon=navigator.sendBeacon('https://example.invalid/probe','synthetic')===false;}catch{result.beacon=true;}
   result.localRead=(await fetch('./mir-test-environment.json')).ok;return result;
  });
  Object.entries(output).forEach(([key,value])=>assert.equal(value,true,key));assert.equal(attempts.length,count);return output;
 });
 await check('CSP blocks non-fetch external resources on normal and public Studio pages',async()=>{
  const count=attempts.length;const reports=[];
  for(const route of ['aide.html','studio-public.html']){
   await page.goto(base+'/test/'+route);await page.locator('#mir-prestige-header').waitFor();
   const blocked=await page.evaluate(async()=>{
    const directives=[];document.addEventListener('securitypolicyviolation',e=>directives.push(e.effectiveDirective));
    const img=document.createElement('img');img.src='https://example.invalid/mir-preview-probe.png';document.body.append(img);
    const script=document.createElement('script');script.src='https://example.invalid/mir-preview-probe.js';document.head.append(script);
    const frame=document.createElement('iframe');frame.src='https://example.invalid/mir-preview-probe.html';document.body.append(frame);
    await new Promise(resolve=>setTimeout(resolve,200));img.remove();script.remove();frame.remove();return directives;
   });
   for(const kind of ['img-src','script-src-elem','frame-src'])assert.ok(blocked.includes(kind),route+': '+kind);
   reports.push({route,blocked});
  }
  assert.equal(attempts.length,count);return reports;
 });
 await check('Known submission forms stop before business handlers and native submit',async()=>{
  await page.goto(base+'/test/aide.html');const count=attempts.length;
  const result=await page.evaluate(()=>{
   let businessCalls=0;document.addEventListener('submit',()=>businessCalls++);
   const ids=['auth-signin-form','auth-signup-form','auth-reset-form','estimate-form','mir-help-create','mir-help-reply'];
   const blocked=ids.map(id=>{const f=document.createElement('form');f.id=id;f.action='./__preview_no_submit__';document.body.append(f);const event=new Event('submit',{bubbles:true,cancelable:true});f.dispatchEvent(event);f.submit();f.remove();return event.defaultPrevented;});
   return {blocked,businessCalls};
  });
  assert.equal(result.businessCalls,0);assert.ok(result.blocked.every(Boolean));assert.equal(attempts.length,count);return result;
 });
 await check('Outgoing links are blocked while local PDF and JSON downloads remain usable',async()=>{
  const count=attempts.length;const before=page.url();
  const blocked=await page.evaluate(()=>['https://example.invalid/probe','mailto:preview@example.invalid','tel:+10000000000'].map(href=>{const a=document.createElement('a');a.href=href;document.body.append(a);const e=new MouseEvent('click',{bubbles:true,cancelable:true});a.dispatchEvent(e);a.remove();return e.defaultPrevented;}));
  assert.ok(blocked.every(Boolean));assert.equal(page.url(),before);assert.equal(attempts.length,count);
  for(const [name,type,content] of [['preview-only.json','application/json','{"preview":true}'],['preview-only.pdf','application/pdf','%PDF-1.4\n%%EOF']]){
   const download=page.waitForEvent('download');await page.evaluate(({name,type,content})=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.append(a);a.click();a.remove();},{name,type,content});assert.equal((await download).suggestedFilename(),name);
  }
  return {externalLinksBlocked:blocked.length,downloads:['JSON Blob','PDF Blob']};
 });
 await check('Account preview clearly labels disabled authentication without signing in',async()=>{
  await page.goto(base+'/test/chantier.html?view=account&clientLocale=1&recette=1');const notice=page.locator('[data-mir-preview-account-notice]');await notice.waitFor();assert.match(await notice.innerText(),/TEST preview: sign-in and submissions are disabled/);
  await page.evaluate(()=>localStorage.setItem('mir-client-locale-v1','fr-CA'));await page.reload();await page.waitForFunction(()=>document.querySelector('[data-mir-preview-account-notice]').textContent==='Aperçu TEST : connexion et envois désactivés.');
  return {noteFR:true,noteEN:true,realAuth:false};
 });
 await check('Preview guard preserves local material and multiple-fold additions to the common cart',async()=>{
  await page.goto(base+'/test/produit.html?id=hardieplank-select-625&color=hardie-pierre-des-champs');await page.locator('#product-add').waitFor();await page.locator('[data-color="hardie-pierre-des-champs"]').click();await page.locator('#product-unit').selectOption('pièces');await page.locator('#product-quantity').fill('2');await page.locator('#product-add').click();await page.locator('#product-added').waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-shopping-list-v1')).items[0].quantity),2);
  await page.goto(base+'/test/production.html?mode=client&kind=profile');await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
  await page.evaluate(()=>{const geometry={kind:'profile',template:'custom',unit:'in',name:'Preview local fixture',segments:[{label:'A',length:3.5},{label:'B',length:2.25}],bends:[{mode:'interior',angle:90,direction:'left'}],startAngle:0,length:120,quantity:1,material:{type:'aluminium'},finish:{},coloredFace:{side:'left',segmentId:'A'}};const created=window.MIRProduction.createTemplate(geometry,{name:'Preview local fixture'});if(!created.ok)throw Error('invalid local fixture');const t=created.template;localStorage.setItem('mir_production_templates_v1',JSON.stringify({version:1,records:[{id:t.id,name:t.name,currentVersion:1,versions:[t],channels:{client:true,store:false,po:true},allowed:{materials:['aluminium','acier'],colorSystems:['manufacturer','special']},archived:false,commercial:{status:'draft',wantsClient:true}}]}));});
  for(const quantity of [2,3]){
   await page.goto(base+'/test/production.html?mode=client&kind=profile');await page.waitForFunction(()=>!!window.MIRProductionWorkspace);await page.locator('#client-choose-model').click();await page.locator('[data-saved-template]').click();await page.locator('[data-segment-length="0"]').fill('3 1/2');await page.locator('[data-segment-length="1"]').fill('2 1/4');const next=page.locator('#client-step-next');await next.click();await page.locator('[data-client-face="right"]').click();await next.click();await page.locator('#material-type').selectOption('aluminium');await page.locator('#color-system').selectOption('special');await page.locator('#special-color-system').fill('Preview local fixture');await page.locator('#special-color-code').fill('LOCAL-'+quantity);await page.locator('#special-color-name').fill('Synthetic colour');await page.locator('#production-quantity').fill(String(quantity));await next.click();
  }
  const pieces=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')).order.items);assert.equal(pieces.length,2);assert.deepEqual(pieces.map(i=>i.spec.quantity),[2,3]);
  await page.goto(base+'/test/selection.html');await page.waitForFunction(()=>document.querySelector('[data-prestige-cart-count]')?.textContent==='3');return {materialLines:1,materialQuantity:2,foldLines:2,foldQuantities:[2,3],commonCount:3,realSubmissions:0};
 });
 await check('Internal production routes retain their original presentation',async()=>{
  const outputs=[];for(const route of ['production.html','production.html?mode=client&source=store']){await page.goto(base+'/test/'+route);await page.waitForLoadState('domcontentloaded');const state=await page.evaluate(()=>({prestige:document.body.classList.contains('mir-prestige'),tools:document.body.dataset.mirPrestigeTools||null}));assert.equal(state.prestige,false);assert.equal(state.tools,null);outputs.push({route,...state});}return outputs;
 });
 await check('Account shell excludes invitations and staff (isolated presentation fixture)',async()=>{
  const source=fs.readFileSync(path.join(root,'dist/mir-prestige.js'),'utf8');const outputs=[];
  const ctx=await browser.newContext();await ctx.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr-CA"><head></head><body data-portal-mode="login"></body></html>'}));
  for(const query of ['?clientLocale=1&invite=synthetic','?clientLocale=1&invitation=synthetic','?clientLocale=1&token=synthetic','?clientLocale=1','']){
   const p=await ctx.newPage();await p.goto(base+'/test/chantier.html'+query);if(query==='?clientLocale=1')await p.evaluate(()=>sessionStorage.setItem('mir_portal_invitation_v1','synthetic-presence-only'));await p.addScriptTag({content:source});assert.equal(await p.locator('.mir-prestige-account-header').count(),0);outputs.push({query,excluded:true});await p.close();
  }
  const p=await ctx.newPage();await p.goto(base+'/test/chantier.html?clientLocale=1');await p.addScriptTag({content:source});assert.equal(await p.locator('.mir-prestige-account-header').isVisible(),true);await p.evaluate(()=>document.body.dataset.portalMode='boss');await p.waitForFunction(()=>!document.body.classList.contains('mir-prestige'));assert.equal(await p.locator('.mir-prestige-account-header').isVisible(),false);outputs.push({dynamicStaffMode:'boss',hidden:true});await ctx.close();return outputs;
 });
 await check('No request escaped the preview guards during review',()=>{assert.equal(attempts.length,0,JSON.stringify(attempts));return {networkFallbackAborts:attempts.length};});
 await context.close();await browser.close();
 const report={reviewedAt:new Date().toISOString(),base,results,attempts,limitations:['Local Chromium only; no real Auth, invitation, email, estimate, payment or Google request.','PDF→3D engine not recertified; this review covers preview perimeter and presentation only.','Worker response CSP is configured in vercel.json and must be checked on the deployed response; the local Python server does not apply host headers.']};
 fs.writeFileSync(path.join(root,'docs/verification/prestige-20261117/preview-security-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,total:results.length,failures:results.filter(r=>!r.passed),attempts}));if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
