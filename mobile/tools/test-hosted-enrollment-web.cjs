'use strict';
// Local assets + real bundled SDK + real MIR TEST backend. No Pages publication.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {build}=require('../../scripts/build-mir-test.cjs');
const root=path.resolve(__dirname,'../..'),proof=path.join(root,'artifacts/employee-auth-audit/hosted'),qa=JSON.parse(fs.readFileSync(path.join(proof,'.private-qa-session.json'),'utf8'));
const api='https://hxtztkmbfpmzrieccwsg.supabase.co',base='https://revetementsmir.github.io/Revetements-mir-/test/';
(async()=>{const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mir-hosted-auth-')),assets=path.join(temp,'test');build(path.join(root,'dist'),assets,'0'.repeat(40),{employeeAuth:true});const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});const checks=[];
try{for(const [width,height]of [[390,844],[1440,900]]){
 const context=await browser.newContext({viewport:{width,height}}),errors=[],forbidden=[],calls=[];
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin===api){
   const name=u.pathname.split('/').pop(),readonlyRpc=['mir_account_snapshot','mir_portal_snapshot','mir_employee_operations_snapshot','mir_messaging_snapshot','mir_punch_snapshot','mir_expense_snapshot','mir_absence_snapshot','mir_notification_center','mir_harmony_settings'];
   const allowed=u.pathname==='/functions/v1/mir-team-invitations'&&req.method()==='POST'||u.pathname.startsWith('/auth/v1/')&&['token','user','logout','settings'].includes(name)||u.pathname.startsWith('/rest/v1/rpc/')&&readonlyRpc.includes(name);
   if(!allowed){forbidden.push(u.pathname);return route.abort();}
   calls.push(u.pathname);const headers={};for(const k of ['origin','apikey','authorization','content-type','x-client-info','x-supabase-api-version','prefer','accept-profile','content-profile','accept'])if(req.headers()[k])headers[k]=req.headers()[k];
   try{const r=await fetch(req.url(),{method:req.method(),headers,...(['POST','PUT','PATCH'].includes(req.method())?{body:req.postData()}:{}),redirect:'error',signal:AbortSignal.timeout(25000)});return route.fulfill({status:r.status,headers:Object.fromEntries([...r.headers].filter(([k])=>!['content-encoding','content-length','transfer-encoding'].includes(k))),body:Buffer.from(await r.arrayBuffer())});}catch(error){return route.abort();}
  }
  if(req.url().startsWith(base)){const relative=decodeURIComponent(u.pathname.slice(new URL(base).pathname.length)),file=path.resolve(assets,relative);if(!file.startsWith(assets+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({path:file});}
  forbidden.push(u.origin+u.pathname);return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
 const activation=qa.webActivation,activateNew=!!activation&&!activation.userId&&width===390;
 if(activateNew){
  await page.goto(base+'chantier.html?invitation='+encodeURIComponent(activation.token));await page.getByRole('button',{name:'Créer mon accès invité avec un mot de passe',exact:true}).click();await page.locator('#auth-email').fill(activation.email);await page.locator('#auth-password').fill(activation.password);await page.getByRole('button',{name:'Créer et activer mon accès invité',exact:true}).click();
 }else{await page.goto(base+'chantier.html');await page.locator('#auth-signin-form').waitFor();await page.locator('#auth-email').fill(activation?.email||qa.email);await page.locator('#auth-password').fill(activation?.password||qa.password);await page.getByRole('button',{name:'Me connecter',exact:true}).click();}
 try{await page.waitForFunction(()=>window.MIRPortalActiveClient?.getStatus().phase==='ready');}catch(e){const s=await page.evaluate(()=>{const s=MIRPortalActiveClient.getStatus();return{phase:s.phase,error:s.error?.code,message:s.error?.message};});console.log(JSON.stringify({width,status:s,forbidden,errors}));throw e;}
 const activeUser=await page.evaluate(()=>MIRPortalActiveClient.getStatus().user.id);if(!activation)assert.equal(activeUser,qa.userId);else{if(width===390){qa.webActivation.userId=activeUser;fs.writeFileSync(path.join(proof,'.private-qa-session.json'),JSON.stringify(qa),{mode:0o600});}assert.equal(activeUser,qa.webActivation.userId);}assert.equal(await page.locator('[data-today-block]').count()>0,true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await page.screenshot({path:path.join(proof,`hosted-web-${width}.png`),fullPage:true});const tokens=calls.filter(p=>p==='/auth/v1/token').length;
 await page.reload();await page.waitForFunction(()=>window.MIRPortalActiveClient?.getStatus().phase==='ready');assert.equal(calls.filter(p=>p==='/auth/v1/token').length,tokens,'reload must reuse stored session');
 await page.evaluate(()=>MIRPortalActiveClient.signOut());await page.waitForFunction(()=>window.MIRPortalActiveClient?.getStatus().phase==='signed_out');assert.equal(await page.evaluate(()=>MIRPortalActiveClient.getStatus().snapshot),null);assert.equal(await page.locator('[data-today-block]').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[]);checks.push({width,height,noAccountActivation:activateNew,passwordLogin:!activateNew,serverRole:true,reloadWithoutPassword:true,logoutPurgesPrivateView:true,productionRequests:false});await context.close();console.log('PASS real hosted TEST web '+width+': bundled SDK, login/server role, reload without password, logout; local assets, no Pages publication or email.');
 }
 fs.writeFileSync(path.join(proof,'web-results.json'),JSON.stringify({assets:'working tree TEST build, not published',auth:'real hosted MIR TEST',emailSent:false,checks},null,2)+'\n');
}finally{await browser.close();fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
