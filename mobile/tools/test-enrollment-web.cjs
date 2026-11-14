'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServiceFixture}=require('../../tests/helpers/mir-team-service-fixture.cjs'),{id}=require('../../tests/helpers/mir-team-fixture.cjs');
const base='https://revetementsmir.github.io/Revetements-mir-/',api='https://hxtztkmbfpmzrieccwsg.supabase.co',root=path.resolve(__dirname,'../../dist'),out=path.resolve(__dirname,'../../artifacts/employee-auth-audit/enrollment-web');
const sdk=`(()=>{let session=JSON.parse(localStorage.getItem('qa-invite-session')||'null'),listener=()=>{};const headers=()=>({'content-type':'application/json',authorization:'Bearer '+(session?.access_token||'sb_publishable_test')});
const auth={onAuthStateChange(fn){listener=fn;return{data:{subscription:{unsubscribe(){}}}}},async getUser(){if(!session)return{data:{user:null},error:{name:'AuthSessionMissingError'}};const r=await fetch('${api}/qa/user',{headers:headers()});return{data:{user:await r.json()}}},async setSession(value){session=value;localStorage.setItem('qa-invite-session',JSON.stringify(session));return{data:{session},error:null}},async signOut(){session=null;localStorage.removeItem('qa-invite-session');listener('SIGNED_OUT',null);return{}},async signInWithPassword(body){const r=await fetch('${api}/qa/sign-in',{method:'POST',headers:headers(),body:JSON.stringify(body)});if(!r.ok)return{error:{code:'invalid_credentials'}};return this.setSession(await r.json())},async signInWithOAuth(){throw Error('Google disabled in this recipe')},async updateUser(){return{}},async resetPasswordForEmail(){throw Error('No mail transport in this recipe')}};
const client={auth,functions:{async invoke(name,{body}){const r=await fetch('${api}/functions/v1/'+name,{method:'POST',headers:headers(),body:JSON.stringify(body)});if(!r.ok)return{error:{context:r},data:null};return{data:await r.json(),error:null}}},async rpc(name,body){const r=await fetch('${api}/rest/v1/rpc/'+name,{method:'POST',headers:headers(),body:JSON.stringify(body||{})});const data=await r.json();return r.ok?{data,error:null}:{data:null,error:data}}};window.MIRSupabase={createClient:()=>client};})();`;
(async()=>{fs.mkdirSync(out,{recursive:true});const h=await createServiceFixture();const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const [width,height]of [[390,844],[834,1112],[1440,900]]){
  const email='personne-'+width+'@example.invalid',password='phrase-locale-'+width+'-123456',inv=await h.prepare(2,1000+width,email),token=h.token(inv);const context=await browser.newContext({viewport:{width,height}}),errors=[],blocked=[];
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin===api){
    if(u.pathname==='/functions/v1/mir-team-invitations'){const r=await h.handler(new Request(req.url(),{method:req.method(),headers:req.headers(),...(req.method()==='POST'?{body:req.postData()}: {})}));return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()});}
    const access=req.headers().authorization?.match(/^Bearer local-access-(\d+)$/)?.[1],user=access?h.users.get(Number(access)):null,cors={'access-control-allow-origin':'https://revetementsmir.github.io','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    let data=[],status=200;
    if(u.pathname==='/qa/sign-in'){const body=req.postDataJSON(),found=h.checkPassword(body.email,body.password);if(!found)status=403;else data={access_token:'local-access-'+[...h.users].find(([,x])=>x.id===found.id)[0],refresh_token:'local-refresh'};}
    else if(!user)status=401;
    else if(u.pathname==='/qa/user')data=user;
    else if(u.pathname.endsWith('/mir_account_snapshot')){const m=(await h.db.query('select role,active,organization_id from mir_core.memberships where user_id=$1',[user.id])).rows[0];if(!m?.active){status=403;data={code:'42501',message:'Accès suspendu'};}else data={userId:user.id,role:m.role,organizationId:m.organization_id};}
    else if(u.pathname.endsWith('/mir_portal_snapshot'))data={mode:'connected',demo:false,actorId:user.id,members:[{id:user.id,name:'Employé TEST',role:'employee',active:true}],jobs:[{id:id(30),name:'Chantier TEST',assignedMemberIds:[user.id]}],planVersions:[],catalogue:[],orders:[],deliveries:[],movements:[],inventory:{},favorites:{}};
    return route.fulfill({status,headers:cors,contentType:'application/json',body:JSON.stringify(data)});
   }
   if(req.url().startsWith(base)){
    const rel=decodeURIComponent(u.pathname.slice(new URL(base).pathname.length));if(rel==='vendor/supabase-client.js')return route.fulfill({contentType:'application/javascript',body:sdk});
    if(rel==='mir-team-test-config.js')return route.fulfill({contentType:'application/javascript',body:'window.MIRTeamTestConfig={teamInvitationsEnabled:true,teamEnrollmentEnabled:true,googleEnabled:false,recoveryEnabled:false};'});
    const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({path:file});
   }
   blocked.push(req.url());return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
  await page.goto(base+'chantier.html?recette=1&invitation='+token);await page.getByRole('button',{name:'Créer mon accès invité avec un mot de passe',exact:true}).click();
  await page.getByRole('heading',{name:'Vous êtes invité à rejoindre Les Revêtements MIR',exact:true}).waitFor();assert.equal(await page.locator('[name=role]').count(),0);assert.equal(await page.locator('[data-auth-screen=signup]').count(),0);assert.equal(new URL(page.url()).searchParams.has('invitation'),false);
  await page.locator('#auth-email').fill('wrong@example.invalid');await page.locator('#auth-password').fill(password);await page.getByRole('button',{name:'Créer et activer mon accès invité',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(h.createCount(),width===390?0:width===834?1:2);
  await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill(password);await page.screenshot({path:path.join(out,`activation-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Créer et activer mon accès invité',exact:true}).click();await page.waitForFunction(()=>window.MIRPortalActiveClient?.getStatus().phase==='ready');await page.getByText('Chantier TEST',{exact:true}).first().waitFor();
  const uid=await page.evaluate(()=>MIRPortalActiveClient.getStatus().user.id);await page.screenshot({path:path.join(out,`active-${width}.png`),fullPage:true});
  await page.reload();await page.waitForFunction(()=>window.MIRPortalActiveClient?.getStatus().phase==='ready');assert.equal(await page.evaluate(()=>MIRPortalActiveClient.getStatus().user.id),uid);
  await page.evaluate(()=>MIRPortalActiveClient.signOut());await page.waitForFunction(()=>window.MIRPortalActiveClient?.getStatus().phase==='signed_out');assert.equal(await page.getByText('Chantier TEST',{exact:true}).count(),0);
  await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill(password);await page.getByRole('button',{name:'Me connecter',exact:true}).click();await page.waitForFunction(()=>window.MIRPortalActiveClient?.getStatus().phase==='ready');
  await h.db.query('update mir_core.memberships set active=false where user_id=$1',[uid]);await page.reload();await page.getByRole('heading',{name:'Votre accès reste à confirmer',exact:true}).waitFor();assert.equal(await page.getByText('Chantier TEST',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);await context.close();console.log('PASS web '+width+': no-account activation via real local service/SQL, wrong email, no role choice, reload/session, signout/login, disabled employee hidden; Auth simulated, no email.');
 }
}finally{await browser.close();await h.db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
