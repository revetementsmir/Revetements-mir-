'use strict';
// Chromium simulation of the native adapter; this is not an Android proof.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../www'),proof=path.resolve(__dirname,'../../artifacts/phase11/web');
async function assertTeamScreen(page){
 const ratios=await page.evaluate(()=>{
  const rgb=v=>v.match(/[\d.]+/g).slice(0,3).map(Number);
  const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const card=document.querySelector('.auth-card');
  const ratios=['.auth-card label','.auth-card input[type=email]','.auth-card input[type=password]','.auth-card button[type=submit]'].map(selector=>{
   const el=document.querySelector(selector),style=getComputedStyle(el),background=selector.endsWith('label')?getComputedStyle(card).backgroundColor:style.backgroundColor;
   const a=luminance(rgb(style.color)),b=luminance(rgb(background));return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  });
  for(const kind of ['auth-error','auth-message']){
   const p=document.createElement('p');p.className=kind;p.textContent='Message de contrôle du contraste';card.append(p);const style=getComputedStyle(p),a=luminance(rgb(style.color)),b=luminance(rgb(style.backgroundColor));ratios.push({selector:'.'+kind,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});p.remove();
  }
  return ratios;
 });
 for(const {selector,ratio}of ratios)assert.ok(ratio>=4.5,selector+' contrast '+ratio);
 for(const selector of ['.mir-harmony-toggle','.mir-harmony-dossier','.mir-client-links','.mir-home-header-actions','.mir-signature-footer','.mir-help-launch'])assert.equal(await page.locator(selector).first().isVisible(),false,selector+' must not expose public chrome at login');
 assert.equal(await page.locator('[data-portal-public-footer]').count(),0);
 for(const name of ['plan.html','boutique.html','produit.html','selection.html','pliage.html','estimation.html']){assert.equal(fs.existsSync(path.join(root,name)),false);assert.equal(await page.evaluate(name=>MIRAndroid.Policy.allowedRoute('https://localhost/'+name),name),false);}
}
(async()=>{fs.mkdirSync(proof,{recursive:true});const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const [width,height] of [[360,780],[390,844],[768,1024],[834,1112],[1366,768],[1440,900],[1920,1080]]){
  const context=await browser.newContext({viewport:{width,height}});const errors=[],requests=[];
  await context.addInitScript(()=>{window.androidBridge={postMessage(){}};window.Capacitor={PluginHeaders:[{name:'MIRNative',methods:['readAuth','writeAuth','clearAuth','clearTemporary','pdf','openExternal','pickFile','scanQr'].map(name=>({name,rtype:'promise'}))},{name:'App',methods:[{name:'addListener',rtype:'callback'},{name:'minimizeApp',rtype:'promise'}]}],nativePromise:async(plugin,method)=>method==='readAuth'?{}:{},nativeCallback:()=> 'simulated-listener'};});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='https://localhost'){requests.push(url.href);return route.abort();}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'missing'});await route.fulfill({path:file});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://localhost/chantier.html');await page.locator('#auth-signin-form').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>MIRPortalConfig.projectRef),'hxtztkmbfpmzrieccwsg');assert.equal(await page.locator('#auth-google').evaluate(e=>e.hidden),true);assert.equal(await page.locator('[data-auth-screen=signup]').evaluate(e=>e.hidden),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await assertTeamScreen(page);
  const blocked=await page.evaluate(async()=>{try{await fetch('https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/');return false;}catch{return true;}});assert.equal(blocked,true);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
  // Reproduce the native screenshots: Harmony moves public links into its menu
  // after authentication. Exercise late insertion and its stronger CSS selectors.
  for(const role of ['employee','chef','warehouse','assistant','boss']){
   await page.evaluate(role=>{
    document.body.dataset.portalMode=role;
    document.querySelector('#auth-signin-form')?.remove();
    const menu=document.querySelector('#mir-harmony-menu');
    const nav=document.createElement('nav');nav.className='mir-client-links';
    nav.innerHTML='<a href="realisations.html">Réalisations</a><a href="plan.html">Studio 3D</a><a href="contact.html">Nous joindre</a>';
    const shortcuts=document.createElement('nav');shortcuts.dataset.clientShortcuts='';shortcuts.innerHTML='<a href="selection.html">Mon panier client</a><a href="estimation.html">Demander une estimation</a>';
    const tools=document.createElement('nav');tools.id='native-business-probe';tools.innerHTML='<button>Centre d’aide métier</button><a href="production.html?source=store">Pliage interne</a>';
    menu.append(nav,shortcuts,tools);menu.hidden=false;
   },role);
   await page.waitForTimeout(50);
   assert.equal(await page.getByRole('link',{name:'Réalisations',exact:true}).isVisible(),false,role+' public menu');
   assert.equal(await page.getByRole('link',{name:'Studio 3D',exact:true}).first().isVisible(),false,role+' studio menu');
   assert.equal(await page.getByRole('link',{name:'Demander une estimation',exact:true}).first().isVisible(),false,role+' client shortcuts');
   assert.equal(await page.getByRole('button',{name:'Centre d’aide métier',exact:true}).isVisible(),true);
   assert.equal(await page.getByRole('link',{name:'Pliage interne',exact:true}).isVisible(),true);
   await page.evaluate(()=>{document.querySelector('#native-business-probe').remove();document.querySelector('#mir-harmony-menu').hidden=true;});
  }
  await page.reload();await page.locator('#auth-signin-form').waitFor({state:'visible'});
  // A field at the very end must remain reachable after the keyboard shrinks the viewport.
  await page.evaluate(()=>{const form=document.createElement('form');form.id='keyboard-end-probe';form.innerHTML='<label>Note locale<textarea id="keyboard-end-field"></textarea></label>';document.body.append(form);form.querySelector('textarea').focus();});
  await page.setViewportSize({width,height:360});
  try{await page.waitForFunction(()=>{const r=document.querySelector('#keyboard-end-field').getBoundingClientRect();return r.bottom<=innerHeight-8&&r.top>=30;});}catch(error){console.error(await page.evaluate(()=>({field:document.querySelector('#keyboard-end-field').getBoundingClientRect().toJSON(),active:document.activeElement?.id,height:innerHeight,scrollY,bodyHeight:document.body.scrollHeight,padding:getComputedStyle(document.body).paddingBottom,bodyBox:document.body.getBoundingClientRect().toJSON(),viewport:{height:visualViewport.height,top:visualViewport.offsetTop}})));throw error;}
  await page.evaluate(()=>document.querySelector('#keyboard-end-probe').remove());await page.setViewportSize({width,height});
  await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('#mir-native-state').textContent.includes('Hors ligne'));await context.setOffline(false);await page.waitForFunction(()=>document.querySelector('#mir-native-state').textContent.includes('actualisation'));
  await page.screenshot({path:path.join(proof,`signin-${width}x${height}.png`),fullPage:true});
  await page.evaluate(()=>MIRHarmonySettings.store({theme:'dark',textSize:'large',reducedMotion:'on',highContrast:true}));await page.reload();await page.locator('#auth-signin-form').waitFor({state:'visible'});assert.equal(await page.locator('html').getAttribute('data-mir-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-mir-text'),'large');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await assertTeamScreen(page);await page.screenshot({path:path.join(proof,`signin-dark-${width}x${height}.png`),fullPage:true});
  await page.evaluate(()=>MIRHarmonySettings.store({theme:'dark',highContrast:false}));await assertTeamScreen(page);await page.screenshot({path:path.join(proof,`signin-dark-standard-${width}x${height}.png`),fullPage:true});
  await page.evaluate(()=>MIRHarmonySettings.store({theme:'system'}));await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.mirTheme==='light');await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.mirTheme==='dark');await assertTeamScreen(page);assert.deepEqual(errors,[]);await context.close();console.log(`PASS Chromium adapter ${width}×${height}, TEST, auth, offline, no overflow/errors`);
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
