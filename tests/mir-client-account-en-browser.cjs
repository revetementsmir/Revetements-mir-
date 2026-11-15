'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist'),base='https://revetementsmir.github.io/Revetements-mir-/',basePath='/Revetements-mir-/';
const out=path.resolve(__dirname,'../docs/verification/account');fs.mkdirSync(out,{recursive:true});
// Only the external SDK transport is simulated. Real HTML, Auth adapter, app,
// cart storage, callback parser, error mapping and responsive CSS run unchanged.
const mock=`(()=>{let user=JSON.parse(localStorage.getItem('qa-user')||'null'),role=localStorage.getItem('qa-role')||'client',listener=()=>{},addresses=[];window.qaCalls=[];
const set=(u)=>{user=u;localStorage.setItem('qa-user',JSON.stringify(u));};
const auth={onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){}}}}},async getUser(){return {data:{user},error:user?null:{name:'AuthSessionMissingError'}}},async signInWithPassword(p){qaCalls.push(['password']);if(p.password!=='valid-password-123')return {error:{code:'invalid_credentials'}};set({id:p.email.startsWith('b')?'client-b':'client-a',email:p.email});return {}},async signUp(p){qaCalls.push(['signup',p.options]);return {}},async resend(p){qaCalls.push(['resend',p.options]);return {}},async resetPasswordForEmail(email,p){qaCalls.push(['reset',p]);return {}},async signInWithOAuth(p){qaCalls.push(['google',p]);return {}},async exchangeCodeForSession(code){if(code==='expired')return {error:{code:'otp_expired'}};set({id:'client-a',email:'a@example.invalid'});return {}},async verifyOtp(p){return this.exchangeCodeForSession(p.token_hash)},async setSession(){return this.exchangeCodeForSession('valid')},async updateUser(p){qaCalls.push(['updatePassword']);return {data:{user}}},async signOut(){set(null);listener('SIGNED_OUT',null);return {}}};
window.MIRSupabase={createClient(url,key,options){window.qaOptions=options;return {auth,async rpc(name,p){qaCalls.push([name]);if(name==='mir_account_snapshot')return {data:{userId:user.id,role,orders:[{id:'ORDER-'+user.id,status:'draft',events:[]}],addresses}};if(name==='mir_account_save_address'){addresses.push({...p.p_address,id:'address-1'});return {data:'address-1'}};if(name==='mir_account_remove_address'){addresses=[];return {data:true}};if(name==='mir_portal_accept_invitation'){if(user.id==='client-b')return {error:{code:'42501',message:'Cette invitation appartient à une autre adresse courriel.'}};role='employee';localStorage.setItem('qa-role',role);return {data:{accepted:true}}};if(name==='mir_portal_snapshot')return {data:{mode:'connected',demo:false,actorId:user.id,members:[{id:user.id,name:'Équipe de recette',role:'employee',active:true}],jobs:[{id:'job-a',name:'Chantier attribué',assignedMemberIds:[user.id]}],planVersions:[],catalogue:[],orders:[],sharedOrders:[],deliveries:[],movements:[],inventory:{},favorites:{}}};return {data:[]}}}}};})();`;
async function setup(browser,viewport={width:390,height:844},initial={},fixtureCapabilities=null){
 const context=await browser.newContext({viewport,recordVideo:process.env.MIR_RECORD_ACCOUNT?{dir:out}:undefined});
 await context.addInitScript(initial=>{if(!sessionStorage.getItem('qa-seeded')){for(const [k,v]of Object.entries(initial))localStorage.setItem(k,JSON.stringify(v));sessionStorage.setItem('qa-seeded','1');}},initial);
 await context.route(base+'**',async route=>{const u=new URL(route.request().url()),file=path.join(root,decodeURIComponent(u.pathname.slice(basePath.length)));if(u.pathname.endsWith('/vendor/supabase-client.js'))return route.fulfill({body:mock,contentType:'application/javascript'});
 // Isolated SDK fixture only; never enable these capabilities in published production.
 if(u.pathname.endsWith('/portal-config.js')&&fixtureCapabilities){const code=fs.readFileSync(file,'utf8');return route.fulfill({contentType:'application/javascript',body:code+'\nwindow.MIRPortalConfig=Object.freeze({...window.MIRPortalConfig,...'+JSON.stringify(fixtureCapabilities)+'});'});}if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({path:file});});
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));return {context,page,errors};
}

(async()=>{
 let browser;try{
  try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}
  catch{browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});}
  for(const [width,height] of [[390,844],[834,1112],[1440,900]]){
   const {page,context,errors}=await setup(browser,{width,height},{});
   // The existing account mock and all real client Auth/role code remain intact.
   await page.goto(base+'chantier.html?view=account&clientLocale=1&mir-locale-preview=1');
   await page.getByRole('heading',{name:'Mon compte MIR',exact:true}).waitFor({timeout:25000});
   await page.locator('button[data-mir-locale="en-CA"]').click();
   await page.getByRole('heading',{name:'My MIR account',exact:true}).waitFor({timeout:25000});
   assert.equal(await page.locator('html').getAttribute('lang'),'en-CA');
   assert.equal(await page.locator('.mir-client-locale-switch button[aria-pressed=true]').innerText(),'EN');
   assert.ok(await page.getByRole('button',{name:'Sign in',exact:true}).isVisible());
   await page.locator('#auth-email').fill('a@example.invalid');
   await page.locator('#auth-password').fill('valid-password-123');
   const email=await page.locator('#auth-email').inputValue(),password=await page.locator('#auth-password').inputValue();
   await page.locator('button[data-mir-locale="fr-CA"]').click();
   assert.equal(await page.locator('html').getAttribute('lang'),'fr-CA');
   assert.equal(await page.locator('#auth-email').inputValue(),email);
   assert.equal(await page.locator('#auth-password').inputValue(),password);
   await page.locator('button[data-mir-locale="en-CA"]').click();
   assert.equal(await page.locator('#auth-email').inputValue(),email);
   await page.getByRole('button',{name:'Sign in',exact:true}).click();
   await page.getByRole('heading',{name:'My account',exact:true}).waitFor();
   assert.equal(await page.locator('html').getAttribute('lang'),'en-CA');
   assert.ok((await page.locator('.customer-account').innerText()).includes('My orders'));
   assert.ok((await page.locator('.customer-account').innerText()).includes('No addresses saved.'));
   await page.locator('.account-tabs button[data-account-view="orders"]').click();
   const orderTitle=await page.locator('.account-order h3').first().innerText();
   assert.equal(orderTitle,'Order ORDER-client-a','customer order ID and translated heading preserved');
   await page.locator('.account-tabs button[data-account-view="overview"]').click();
   await page.locator('details:has(#account-address-form) > summary').click();
   const savedAddress=page.locator('#account-address-form');
   await savedAddress.locator('[name=label]').fill('Panier');
   await savedAddress.locator('[name=recipient]').fill('Réalisations');
   await savedAddress.locator('[name=line1]').fill('Mon compte');
   await savedAddress.locator('[name=city]').fill('Québec');
   await savedAddress.locator('[name=province]').fill('QC');
   await savedAddress.locator('[name=postalCode]').fill('G1A 1A1');
   await savedAddress.getByRole('button',{name:'Save address'}).click();
   await page.locator('.account-address h3').first().waitFor();
   assert.equal(await page.locator('.account-address h3').first().innerText(),'Panier','saved address name is user data, never translated');
   const savedAddressText=await page.locator('.account-address p').first().innerText();
   assert.ok(savedAddressText.includes('Réalisations')&&savedAddressText.includes('Mon compte'),'user recipient and street must remain original, not English translated');
   assert.ok((await page.locator('body').innerText()).includes('a@example.invalid'));
   const checkoutCart=JSON.stringify({version:1,project:'Maison donnée client',items:[{id:'MIR-QA-1',quantity:2}]});
   await page.evaluate(raw=>localStorage.setItem('mir-shopping-list-v1',raw),checkoutCart);
   assert.equal(await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1')),checkoutCart);
   await page.screenshot({path:path.join(out,'bilingual-client-account-'+width+'.png'),fullPage:true,animations:'disabled'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'account no horizontal overflow '+width);
   assert.deepEqual(errors,[],errors.join('; '));
   console.log('PASS customer FR-CA/EN-CA account and cart without backend side effects '+width);
   await context.close();
  }
  const {page,context,errors}=await setup(browser,{width:390,height:844},{});
  await page.goto(base+'chantier.html?view=account&clientLocale=1&mir-locale-preview=1');
  await page.getByRole('heading',{name:'Mon compte MIR'}).waitFor();
  await page.locator('button[data-mir-locale="en-CA"]').click();
  await page.getByRole('heading',{name:'My MIR account'}).waitFor();
  await page.evaluate(()=>localStorage.setItem('qa-role','employee'));
  await page.reload();
  await page.getByRole('heading',{name:'My MIR account'}).waitFor();
  await page.locator('#auth-email').fill('a@example.invalid');
  await page.locator('#auth-password').fill('valid-password-123');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForFunction(()=>document.body.dataset.portalMode==='employee',{timeout:20000});
  await page.waitForFunction(()=>document.documentElement.lang==='fr-CA');
  assert.equal(await page.locator('.mir-client-locale-switch').count(),0,'all staff locales stay French');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS staff account: English client entry cannot translate employee UI');
 }finally{await browser?.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
