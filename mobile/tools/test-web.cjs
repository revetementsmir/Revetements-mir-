'use strict';
// Chromium simulation of the native adapter; this is not an Android proof.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../www'),proof=path.resolve(__dirname,'../../artifacts/phase11/web');
const AuthFlow=require('../web/auth-flow.cjs'),authProof=[];
// The real bundled adapter and SDK run against this local bridge. No provider,
// email, session or business request is sent by this browser recipe.
function nativeFixture(){
 window.__lockState={enabled:false,locked:false,cancel:false,unlocks:0};window.__appListeners={};window.__authSlots=new Map();window.__authOpened=[];window.androidBridge={postMessage(){}};
 window.Capacitor={PluginHeaders:[{name:'MIRNative',methods:['readAuth','writeAuth','removeAuthSlot','clearAuth','openAuth','clearTemporary','pdf','openExternal','pickFile','scanQr','authLockStatus','lockAuth','unlockAuth','setAuthLock'].map(name=>({name,rtype:'promise'}))},{name:'App',methods:[{name:'addListener',rtype:'callback'},{name:'minimizeApp',rtype:'promise'},{name:'getLaunchUrl',rtype:'promise'}]}],
  nativePromise:async(plugin,method,options={})=>{const s=window.__lockState,slot=options.slot||'session';if(method==='authLockStatus')return{available:true,enabled:s.enabled,locked:s.locked};if(method==='setAuthLock'){s.enabled=options.enabled;return{};}if(method==='lockAuth'){s.locked=true;return{};}if(method==='unlockAuth'){s.unlocks++;if(s.cancel)throw Error('Déverrouillage annulé');s.locked=false;return{};}if(method==='readAuth')return{value:window.__authSlots.get(slot)};if(method==='writeAuth'){window.__authSlots.set(slot,options.value);return{};}if(method==='removeAuthSlot'){window.__authSlots.delete(slot);return{};}if(method==='clearAuth'){window.__authSlots.clear();return{};}if(method==='openAuth'){window.__authOpened.push(options.url);return{};}return{};},
  nativeCallback:(plugin,method,options,callback)=>{if(plugin==='App'&&method==='addListener')window.__appListeners[options.eventName]=callback;return 'simulated-listener';}};
}
async function loginReady(page){
 await page.locator('body.mir-native-auth.mir-native-signin #auth-signin-form').waitFor({state:'visible'});
 await page.locator('#mir-native-password-toggle').waitFor({state:'visible'});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>{const logo=document.querySelector('.mir-native-auth-brand img');return logo?.complete&&logo.naturalWidth>0;});
}
async function authSnapshot(page,name){
 const state=await page.evaluate(()=>{
  const selectors=['.mir-native-auth-brand img','.auth-intro h1','#auth-email','#auth-password','#mir-native-password-toggle','#auth-signin-form button[type=submit]','[data-auth-screen=forgot]','.auth-divider','#auth-google','#mir-native-auth-help'];
  const elements=selectors.map(selector=>{const el=document.querySelector(selector);if(!el)return{selector,missing:true};const rect=el.getBoundingClientRect(),style=getComputedStyle(el);return{selector,visible:rect.width>0&&rect.height>0&&style.visibility!=='hidden',rect:rect.toJSON(),font:style.fontFamily,fontSize:style.fontSize,background:style.backgroundColor,disabled:el.disabled===true};});
  return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,bodyFont:getComputedStyle(document.body).fontSize,bodyBackground:getComputedStyle(document.body).backgroundColor,bodyFamily:getComputedStyle(document.body).fontFamily,elements};
 });
 authProof.push({name,...state});return state;
}
async function assertLoginSurface(page,name,{simultaneous=false}={}){
 await loginReady(page);
 assert.equal(await page.locator('#mir-email-toggle,#mir-account-workspace-pages').count(),0,name+': no extra step hides the login controls');
 assert.equal(await page.locator('#auth-signin-form').count(),1);assert.equal(await page.locator('#auth-email').count(),1);assert.equal(await page.locator('#auth-password').count(),1);
 assert.equal(await page.locator('#auth-signin-form button[type=submit]').innerText(),'Se connecter');
 assert.equal(await page.locator('#auth-password').getAttribute('autocomplete'),'current-password');
 assert.equal(await page.locator('#mir-native-password-toggle').getAttribute('type'),'button');
 assert.equal(await page.locator('#mir-native-password-toggle').getAttribute('aria-controls'),'auth-password');
 assert.equal(await page.locator('#mir-native-password-toggle').getAttribute('aria-pressed'),'false');
 assert.match(await page.locator('.mir-native-auth-brand img').getAttribute('src'),/MIR-logo-officiel-original\.svg(?:\?|$)/);
 const state=await authSnapshot(page,name),by=selector=>state.elements.find(item=>item.selector===selector);
 assert.equal(state.bodyBackground,'rgb(36, 37, 34)');assert.match(state.bodyFamily,/DM Sans/);
 assert.ok(state.scrollWidth<=state.width+2,name+': no horizontal overflow');
 for(const item of state.elements){assert.equal(item.missing,undefined,name+': '+item.selector+' exists');assert.equal(item.visible,true,name+': '+item.selector+' is rendered');assert.ok(item.rect.left>=-1&&item.rect.right<=state.width+1,name+': '+item.selector+' fits horizontally');if(simultaneous)assert.ok(item.rect.top>=0&&item.rect.bottom<=state.height+1,name+': '+item.selector+' is visible without changing page or scrolling');}
 const logo=by('.mir-native-auth-brand img').rect;assert.ok(logo.width>=130&&logo.width<=150,name+': original logo stays approximately 140 CSS px');assert.ok(Math.abs(logo.left+logo.width/2-state.width/2)<=2,name+': logo centered');
 const order=['#auth-email','#auth-password','#auth-signin-form button[type=submit]','[data-auth-screen=forgot]','.auth-divider','#auth-google'];for(let i=1;i<order.length;i++)assert.ok(by(order[i]).rect.top>=by(order[i-1]).rect.bottom-1,name+': login order and non-overlap '+order[i]);
 for(const selector of ['#auth-email','#auth-password','#mir-native-password-toggle','#auth-signin-form button[type=submit]','#auth-google'])assert.ok(by(selector).rect.height>=44,name+': touch height '+selector);
 const flags=await page.evaluate(()=>({google:!!MIRPortalConfig.googleEnabled,recovery:!!MIRTeamTestConfig.recoveryEnabled}));
 assert.equal(await page.locator('#auth-google').isDisabled(),!flags.google,name+': Google follows its real configuration');
 assert.ok(await page.locator('[data-auth-screen=forgot]').isEnabled(),name+': recovery screen remains accessible');
 if(!flags.google){const note=page.locator('.auth-card').getByText(/Google.*(?:configuration|activation|disponib)/i);assert.ok(await note.count()>0,name+': unavailable Google is explained');assert.ok(await note.first().isVisible());}
 return state;
}
async function reachableAuth(page,selector,name){
 const control=page.locator(selector);await control.waitFor({state:'visible'});await control.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=await control.evaluate(el=>{const r=el.getBoundingClientRect(),banner=document.querySelector('#mir-native-state')?.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{rect:r.toJSON(),width:innerWidth,height:visualViewport?.height||innerHeight,top:Math.max(0,banner?.bottom||0),hit:!!hit&&(hit===el||el.contains(hit))};});
 assert.ok(state.rect.left>=-1&&state.rect.right<=state.width+1&&state.rect.top>=state.top-1&&state.rect.bottom<=state.height+1,name+': control can be reached without being covered '+JSON.stringify(state));assert.equal(state.hit,true,name+': real hit target');if(!await control.isDisabled())await control.click({trial:true});
}
async function passwordEye(page){
 const value='Recette locale sans compte';await page.locator('#auth-password').fill(value);const eye=page.locator('#mir-native-password-toggle');await eye.click();assert.equal(await page.locator('#auth-password').getAttribute('type'),'text');assert.equal(await eye.getAttribute('aria-pressed'),'true');assert.match(await eye.getAttribute('aria-label'),/Masquer/);assert.equal(await page.locator('#auth-password').inputValue(),value);await eye.click();assert.equal(await page.locator('#auth-password').getAttribute('type'),'password');assert.equal(await eye.getAttribute('aria-pressed'),'false');assert.match(await eye.getAttribute('aria-label'),/Afficher/);assert.equal(await page.locator('#auth-password').inputValue(),value);await page.locator('#auth-password').fill('');
}
async function authStateRecipe(browser){
 const context=await browser.newContext({viewport:{width:390,height:844}}),unexpected=[],errors=[];let passwordRequests=0,recoveryRequests=0,releaseLogin,fixtureEnabled=false;
 const loginGate=new Promise(resolve=>{releaseLogin=resolve;});await context.addInitScript(nativeFixture);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin==='https://localhost'){
   const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'missing'});
   // Override flags only in this intercepted response, never in the application
   // build. Both handlers still use the real bundled UI and native SDK adapter.
   if(url.pathname==='/mir-team-test-config.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(file,'utf8')+`\nwindow.MIRTeamTestConfig=Object.freeze({...window.MIRTeamTestConfig,googleEnabled:${fixtureEnabled},recoveryEnabled:${fixtureEnabled}});`});
   if(url.pathname==='/portal-config.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(file,'utf8')+`\nwindow.MIRPortalConfig=Object.freeze({...window.MIRPortalConfig,googleEnabled:${fixtureEnabled},emailEnabled:${fixtureEnabled}});`});
   return route.fulfill({path:file});
  }
  const auth=url.origin===AuthFlow.PROJECT&&(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password'||url.pathname==='/auth/v1/recover');
  const headers={'access-control-allow-origin':'https://localhost','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':request.headers()['access-control-request-headers']||'apikey,authorization,content-type,x-client-info,x-supabase-api-version','content-type':'application/json'};
  if(auth&&request.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(auth&&request.method()==='POST'&&url.pathname==='/auth/v1/token'){
   passwordRequests++;await loginGate;
   return route.fulfill({status:400,headers,body:JSON.stringify({code:'invalid_credentials',error_code:'invalid_credentials',message:'Invalid login credentials',msg:'Invalid login credentials'})});
  }
  if(auth&&request.method()==='POST'&&url.pathname==='/auth/v1/recover'){recoveryRequests++;return route.fulfill({status:200,headers,body:'{}'});}
  unexpected.push(request.method()+' '+url.origin+url.pathname);return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto('https://localhost/chantier.html');await assertLoginSurface(page,'signin-08-disabled-fixture',{simultaneous:true});assert.equal(await page.locator('#auth-google').isDisabled(),true);await page.screenshot({path:path.join(proof,'signin-08-google-disabled-fixture.png')});
  await page.locator('[data-auth-screen=forgot]').click();await page.locator('#mir-native-recovery-note').waitFor({state:'visible'});assert.equal(await page.locator('.auth-intro h1').innerText(),'Mot de passe oublié');assert.equal(await page.locator('#auth-reset-form button[type=submit]').isDisabled(),true);assert.equal(await page.locator('[data-auth-screen=signin]').isEnabled(),true);await page.screenshot({path:path.join(proof,'signin-08-recovery-disabled-fixture.png'),fullPage:true});
  fixtureEnabled=true;await page.reload();await assertLoginSurface(page,'signin-08-enabled-fixture',{simultaneous:true});
  assert.equal(await page.locator('#auth-google').isEnabled(),true);assert.equal(await page.locator('#auth-google img').getAttribute('src'),'google-signin.svg');await page.screenshot({path:path.join(proof,'signin-08-google-enabled-fixture.png')});
  await page.locator('#auth-email').fill('recette-ui08@example.invalid');await page.locator('#auth-password').fill('Mot de passe de recette locale');await page.locator('#auth-signin-form button[type=submit]').click();
  await page.waitForFunction(()=>{const button=document.querySelector('#auth-signin-form button[type=submit]');return button?.disabled&&button.textContent==='Connexion…';});
  assert.equal(await page.locator('#auth-google').isDisabled(),true,'No second authentication while password sign-in is pending');await authSnapshot(page,'signin-08-loading-fixture');await page.screenshot({path:path.join(proof,'signin-08-loading-fixture.png')});releaseLogin();
  await page.locator('.auth-card .auth-error[role=alert]').waitFor({state:'visible'});assert.match(await page.locator('.auth-card .auth-error').innerText(),/Courriel ou mot de passe incorrect/);await loginReady(page);
  assert.equal(await page.locator('#auth-signin-form button[type=submit]').isEnabled(),true);assert.equal(await page.locator('#auth-email').inputValue(),'recette-ui08@example.invalid');await assertTeamScreen(page);await reachableAuth(page,'.auth-card .auth-error','error feedback');await authSnapshot(page,'signin-08-error-fixture');await page.screenshot({path:path.join(proof,'signin-08-error-fixture.png'),fullPage:true});
  await page.locator('[data-auth-screen=forgot]').click();await page.locator('#auth-reset-form').waitFor({state:'visible'});assert.equal(await page.locator('.auth-intro h1').innerText(),'Mot de passe oublié');assert.equal(await page.locator('#auth-reset-form button[type=submit]').isEnabled(),true);assert.equal(await page.locator('#auth-email').inputValue(),'recette-ui08@example.invalid');
  await page.locator('#auth-reset-form button[type=submit]').click();await page.locator('.auth-message[role=status]').waitFor({state:'visible'});assert.match(await page.locator('.auth-message').innerText(),/Si cette adresse possède un compte MIR/);assert.equal(await page.locator('.auth-intro h1').innerText(),'Mot de passe oublié');await page.screenshot({path:path.join(proof,'signin-08-recovery-local-fixture.png'),fullPage:true});
  await page.locator('[data-auth-screen=signin]').click();await loginReady(page);await page.locator('#auth-google').click();await page.waitForFunction(()=>window.__authOpened.length===1);
  const opened=await page.evaluate(()=>window.__authOpened);assert.equal(opened.length,1);assert.equal(AuthFlow.authorize(opened[0]),true,'Google button reaches the native PKCE handoff; no provider is contacted');
  assert.equal(passwordRequests,1);assert.equal(recoveryRequests,1);assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
  authProof.push({name:'local-auth-state-handlers',passwordRequests,recoveryRequests,googleNativeHandoffs:opened.length,realNetworkRequests:0});console.log('PASS login 08 local states: busy, invalid credentials, recovery, Google native handoff');
 }catch(error){await authSnapshot(page,'auth08-state-failure').catch(()=>{});await page.screenshot({path:path.join(proof,'auth08-state-failure.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{releaseLogin();await context.close();}
}
async function assertTeamScreen(page){
 const ratios=await page.evaluate(()=>{
  const rgb=v=>v.match(/[\d.]+/g).slice(0,3).map(Number);
  const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const card=document.querySelector('.auth-card');
  const ratios=['.auth-card label','.auth-card input[type=email]','.auth-card input[type=password]','.auth-card button[type=submit]'].map(selector=>{
   const el=document.querySelector(selector),style=getComputedStyle(el),background=selector.endsWith('label')?getComputedStyle(el.closest('form')||card).backgroundColor:style.backgroundColor;
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
 for(const [width,height] of [[360,780],[390,844],[430,932],[768,1024],[834,1112],[1366,768],[1440,900],[1920,1080]]){
  const context=await browser.newContext({viewport:{width,height}});const errors=[],requests=[];
  await context.addInitScript(nativeFixture);
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='https://localhost'){requests.push(url.href);return route.abort();}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'missing'});await route.fulfill({path:file});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://localhost/chantier.html');await loginReady(page);
  assert.equal(await page.evaluate(()=>MIRPortalConfig.projectRef),'hxtztkmbfpmzrieccwsg');
  await assertLoginSurface(page,`signin-08-${width}x${height}`,{simultaneous:width<=430});
  assert.equal(await page.locator('[data-auth-screen=signup]').evaluate(e=>e.hidden),true);
  if(width<=430){await passwordEye(page);await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.screenshot({path:path.join(proof,`signin-08-${width}x${height}.png`)});}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await assertTeamScreen(page);
  const blocked=await page.evaluate(async()=>{try{await fetch('https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/');return false;}catch{return true;}});assert.equal(blocked,true);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
  // Reproduce the native screenshots: Harmony moves public links into its menu
  // after authentication. Exercise late insertion and its stronger CSS selectors.
  for(const role of ['employee','chef','warehouse','assistant','boss']){
   await page.evaluate(role=>{
    document.body.dataset.portalMode=role;document.body.dataset.portalConnection='connected';
    document.querySelector('.auth-grid')?.remove();
    const menu=document.querySelector('#mir-harmony-menu');
    const nav=document.createElement('nav');nav.className='mir-client-links';
    nav.innerHTML='<a href="realisations.html">Réalisations</a><a href="plan.html">Studio 3D</a><a href="contact.html">Nous joindre</a>';
    const shortcuts=document.createElement('nav');shortcuts.dataset.clientShortcuts='';shortcuts.innerHTML='<a href="selection.html">Mon panier client</a><a href="estimation.html">Demander une estimation</a>';
    const tools=document.createElement('nav');tools.id='native-business-probe';tools.innerHTML='<a href="production.html?mode=client&source=store&kind=profile">Pliage interne</a><a href="production.html?mode=client">Panneaux client</a>';
    menu.append(nav,shortcuts,tools);menu.hidden=false;
    const outside=document.createElement('div');outside.id='native-public-probe';outside.innerHTML='<a href="production.html?mode=client&kind=panel">Configurer mes panneaux</a><button data-estimate-source="bending">Estimation publique</button>';document.body.append(outside);
   },role);
   await page.waitForTimeout(50);
   assert.equal(await page.getByRole('link',{name:'Réalisations',exact:true}).isVisible(),false,role+' public menu');
   assert.equal(await page.getByRole('link',{name:'Studio 3D',exact:true}).first().isVisible(),false,role+' studio menu');
   assert.equal(await page.getByRole('link',{name:'Demander une estimation',exact:true}).first().isVisible(),false,role+' client shortcuts');
   assert.equal(await page.getByRole('button',{name:'Centre d’aide métier',exact:true}).isVisible(),true);
   assert.equal(await page.getByRole('link',{name:'Pliage interne',exact:true}).isVisible(),true);
   assert.equal(await page.getByRole('link',{name:'Panneaux client',exact:true}).isVisible(),false);
   assert.equal(await page.getByRole('link',{name:'Configurer mes panneaux',exact:true}).isVisible(),false);
   assert.equal(await page.getByRole('button',{name:'Estimation publique',exact:true}).isVisible(),false);
   assert.equal(await page.evaluate(()=>typeof window.MIREstimate),'undefined');
   await page.evaluate(()=>{document.querySelector('#native-business-probe').remove();document.querySelector('#native-public-probe').remove();document.querySelector('#mir-harmony-menu').hidden=true;});
  }
  if(width===390){
   await page.evaluate(()=>{const node=document.createElement('button');node.id='private-lock-probe';node.textContent='Donnée privée locale de recette';document.querySelector('#portal-content').append(node);});
   await page.locator('#mir-device-lock-option').click();await page.evaluate(()=>window.__appListeners.appStateChange({isActive:false}));await page.locator('#mir-device-lock').waitFor();assert.equal(await page.locator('#private-lock-probe').isVisible(),false);await page.screenshot({path:path.join(proof,'lock-overlay-390x844.png')});
   await page.evaluate(()=>{window.__lockState.cancel=true;window.__appListeners.appStateChange({isActive:true});});await page.waitForFunction(()=>window.__lockState.unlocks===1);assert.equal(await page.locator('#private-lock-probe').isVisible(),false);
   await page.evaluate(async()=>{window.__lockState.cancel=false;await Promise.all([window.MIRAndroidUnlock(),window.MIRAndroidUnlock()]);});assert.equal(await page.locator('#mir-device-lock').count(),0);assert.equal(await page.locator('#private-lock-probe').isVisible(),true);assert.equal(await page.evaluate(()=>window.__lockState.unlocks),2);await page.locator('#private-lock-probe').evaluate(e=>e.remove());
  }
  await page.reload();await loginReady(page);
  if(width===390){
   await page.evaluate(()=>{
    window.MIRPortalActiveClient={getStatus:()=>({phase:'ready'}),helpFAQ:async()=>[],supportSnapshot:async()=>({conversations:[]})};
   });
   await page.locator('#mir-native-auth-help').click();
   await page.getByText('Comment accéder à mon compte équipe?',{exact:true}).waitFor();
   assert.equal(await page.getByText('Comment demander une estimation?',{exact:true}).count(),0);
   assert.equal(await page.locator('#mir-help-create').count(),0,'No customer support request form for staff');
   await page.screenshot({path:path.join(proof,'business-help-390x844.png')});
   await page.locator('.mir-help-close').click();await page.reload();await loginReady(page);
   // The recovery page is accessible even when mail delivery is not configured.
   await page.locator('#auth-email').fill('recette-ui08@example.invalid');await page.locator('[data-auth-screen=forgot]').click();await page.locator('#auth-reset-form').waitFor({state:'visible'});
   assert.equal(await page.locator('.auth-intro h1').innerText(),'Mot de passe oublié');assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('mir-native-auth')),true);assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('mir-native-signin')),false);
   assert.equal(await page.locator('#auth-email').inputValue(),'recette-ui08@example.invalid');
   const recoveryEnabled=await page.evaluate(()=>!!MIRTeamTestConfig.recoveryEnabled);assert.equal(await page.locator('#auth-reset-form button[type=submit]').isDisabled(),!recoveryEnabled);
   if(!recoveryEnabled){assert.equal(await page.locator('#mir-native-recovery-note').isVisible(),true);assert.match(await page.locator('#mir-native-recovery-note').innerText(),/pas encore activée/);}
   await page.screenshot({path:path.join(proof,'signin-08-forgot-390x844.png'),fullPage:true});await page.locator('[data-auth-screen=signin]').click();await loginReady(page);assert.equal(await page.locator('#auth-email').inputValue(),'recette-ui08@example.invalid');await page.locator('#auth-email').fill('');
   // A reduced browser viewport simulates keyboard space. Real Android IME
   // behavior is covered by instrumentation, not this browser recipe.
   await page.locator('#auth-password').fill('Recette clavier locale');await page.locator('#auth-password').focus();await page.setViewportSize({width,height:360});
   for(const selector of ['#auth-password','#mir-native-password-toggle','#auth-signin-form button[type=submit]'])await reachableAuth(page,selector,'keyboard viewport');
   assert.equal(await page.locator('#auth-password').inputValue(),'Recette clavier locale');await authSnapshot(page,'signin-08-keyboard-390x360');await page.screenshot({path:path.join(proof,'signin-08-keyboard-390x360.png')});await page.locator('#auth-password').fill('');await page.locator('#auth-password').blur();await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
  }
  // Background snapshot rendering must not erase a local, unsaved absence.
  await page.evaluate(()=>{
   window.MIRAndroidSession.currentUserId=()=> 'actor-a';
   const form=document.createElement('form');form.id='absence-draft-form';form.innerHTML='<textarea name="note"></textarea>';document.body.append(form);
   const field=form.elements.note;field.value='NOTE LOCALE';field.dispatchEvent(new Event('input',{bubbles:true}));
   form.outerHTML='<form id="absence-draft-form"><textarea name="note"></textarea></form>';
  });
  await page.waitForFunction(()=>document.querySelector('#absence-draft-form textarea').value==='NOTE LOCALE');
  await page.evaluate(()=>{window.MIRAndroidSession.currentUserId=()=> 'actor-b';document.querySelector('#absence-draft-form').outerHTML='<form id="absence-draft-form"><textarea name="note"></textarea></form>';});
  await page.waitForTimeout(50);assert.equal(await page.locator('#absence-draft-form textarea').inputValue(),'');
  await page.evaluate(()=>document.querySelector('#absence-draft-form').remove());
  // A field at the very end must remain reachable after the keyboard shrinks the viewport.
  await page.evaluate(()=>{const form=document.createElement('form');form.id='keyboard-end-probe';form.innerHTML='<label>Note locale<textarea id="keyboard-end-field"></textarea></label>';document.body.append(form);form.querySelector('textarea').focus();});
  await page.setViewportSize({width,height:360});
  try{await page.waitForFunction(()=>{const r=document.querySelector('#keyboard-end-field').getBoundingClientRect();return r.bottom<=innerHeight-8&&r.top>=30;});}catch(error){console.error(await page.evaluate(()=>({field:document.querySelector('#keyboard-end-field').getBoundingClientRect().toJSON(),active:document.activeElement?.id,height:innerHeight,scrollY,bodyHeight:document.body.scrollHeight,padding:getComputedStyle(document.body).paddingBottom,bodyBox:document.body.getBoundingClientRect().toJSON(),viewport:{height:visualViewport.height,top:visualViewport.offsetTop}})));throw error;}
  await page.evaluate(()=>document.querySelector('#keyboard-end-probe').remove());await page.setViewportSize({width,height});
  await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('#mir-native-state').textContent.includes('Hors ligne'));await context.setOffline(false);await page.waitForFunction(()=>document.querySelector('#mir-native-state').textContent.includes('actualisation'));
  await page.screenshot({path:path.join(proof,`signin-${width}x${height}.png`),fullPage:true});
  await page.evaluate(()=>MIRHarmonySettings.store({theme:'dark',textSize:'large',reducedMotion:'on',highContrast:true}));await page.reload();await loginReady(page);assert.equal(await page.locator('html').getAttribute('data-mir-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-mir-text'),'large');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await assertLoginSurface(page,`signin-08-large-${width}x${height}`);
  await assertTeamScreen(page);await page.screenshot({path:path.join(proof,`signin-dark-${width}x${height}.png`),fullPage:true});
  await page.evaluate(()=>MIRHarmonySettings.store({theme:'dark',highContrast:false}));await assertTeamScreen(page);await page.screenshot({path:path.join(proof,`signin-dark-standard-${width}x${height}.png`),fullPage:true});
  await page.evaluate(()=>MIRHarmonySettings.store({theme:'system'}));await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.mirTheme==='light');await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.mirTheme==='dark');await assertTeamScreen(page);
  if(width===390){
   // Match the 24/32 CSS-px body sizes observed in Android font trials. This is
   // a browser text-growth simulation, not a claim of native zoom equivalence.
   const previous=await page.evaluate(()=>[document.documentElement.getAttribute('style'),document.body.getAttribute('style')]);
   for(const size of [24,32]){
    await page.evaluate(size=>{document.documentElement.style.setProperty('font-size',size+'px','important');document.body.style.setProperty('font-size',size+'px','important');scrollTo(0,0);},size);
    await assertLoginSurface(page,`signin-08-text-${size}px-390x844`);
    for(const selector of ['#auth-email','#auth-password','#mir-native-password-toggle','#auth-signin-form button[type=submit]','[data-auth-screen=forgot]','#auth-google','#mir-native-auth-help'])await reachableAuth(page,selector,`text ${size}px`);
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(proof,`signin-08-text-${size}px-390x844.png`),fullPage:true});
   }
   await page.evaluate(values=>[document.documentElement,document.body].forEach((el,i)=>values[i]===null?el.removeAttribute('style'):el.setAttribute('style',values[i])),previous);
   await page.goto('https://localhost/production.html?mode=client&source=store&kind=profile');
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace);
   assert.equal(await page.evaluate(()=>typeof window.MIREstimate),'undefined');
   assert.equal(await page.locator('#mir-estimate-dialog').count(),0);
   assert.equal(await page.getByRole('link',{name:/Demander une estimation/}).count(),0);
   await page.screenshot({path:path.join(proof,'employee-folding-390x844.png')});
  }
  assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);await context.close();console.log(`PASS Chromium adapter ${width}×${height}, TEST, auth, offline, no overflow/errors`);
 }
 await authStateRecipe(browser);
}catch(error){
 for(const context of browser.contexts())for(const page of context.pages()){
  const viewport=page.viewportSize();await authSnapshot(page,'auth08-recipe-failure').catch(()=>{});await page.screenshot({path:path.join(proof,`auth08-recipe-failure-${viewport?.width||0}x${viewport?.height||0}.png`),fullPage:true}).catch(()=>{});
 }
 throw error;
}finally{fs.writeFileSync(path.join(proof,'auth08-proof.json'),JSON.stringify({kind:'Chromium bundled adapter; local fixtures only; no real authentication or email',screens:authProof},null,2));await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
