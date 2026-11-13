'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/verification/refonte-site-public/final-v2');
const prod='gccltmaulvrnthrbnrpd.supabase.co',test='hxtztkmbfpmzrieccwsg.supabase.co';
const credentials=[['OUTSIDER','MIR_SANDBOX_OUTSIDER_EMAIL','MIR_SANDBOX_OUTSIDER_PASSWORD'],['OTHER_CLIENT','MIR_SANDBOX_OTHER_CLIENT_EMAIL','MIR_SANDBOX_OTHER_CLIENT_PASSWORD'],['CLIENT','MIR_SANDBOX_CLIENT_EMAIL','MIR_SANDBOX_CLIENT_PASSWORD']].flatMap(([label,emailKey,passwordKey])=>process.env[emailKey]&&process.env[passwordKey]?[{label,email:process.env[emailKey],password:process.env[passwordKey]}]:[]);
if(!credentials.length)throw Error('Identifiants client MIR TEST absents; aucun appel Auth effectué.');
fs.mkdirSync(out,{recursive:true});
const results={observedAt:new Date().toISOString(),target:'MIR TEST hxtztkmbfpmzrieccwsg',productionRequests:[],checks:[],screenshots:[],physicalDevices:false,estimateSubmitted:false,limits:[]};
function pass(name,kind='navigateur réel / frontend privé'){results.checks.push({name,passed:true,kind});console.log('PASS '+name);}
async function stable(page){await page.evaluate(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))]);await Promise.race([Promise.all([...document.images].filter(i=>i.complete).map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,3000))]);});}
async function snap(page,name){await stable(page);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' déborde');await page.screenshot({path:path.join(out,name+'.png')});results.screenshots.push(name+'.png');}
async function guardedRoute(route){
 const request=route.request(),url=new URL(request.url()),host=url.hostname;
 if(host==='revetementsmir.github.io'&&url.pathname.startsWith('/Revetements-mir-/')){
  const relative=decodeURIComponent(url.pathname.slice('/Revetements-mir-/'.length))||'index.html',file=path.resolve(root,'dist',relative);
  if(!file.startsWith(path.join(root,'dist')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  return route.fulfill({path:file});
 }
 if(host===prod){results.productionRequests.push(request.url().replace(/[?#].*/,''));return route.abort('blockedbyclient');}
 if(host!==test)return route.continue();
 const run=spawnSync('python3',[path.join(root,'tools/validation/https-relay.py')],{input:JSON.stringify({url:request.url(),method:request.method(),headers:await request.allHeaders(),body:request.postDataBuffer()?.toString('base64')}),encoding:'utf8',timeout:45000,maxBuffer:30*1024*1024});
 const response=JSON.parse(run.stdout||'{}');if(run.status||response.transportError)throw Error('Relais HTTPS MIR TEST indisponible');
 const headers={};for(const [key,value] of Object.entries(response.headers||{}))if(!['content-length','transfer-encoding','connection'].includes(key.toLowerCase()))headers[key]=value;
 return route.fulfill({status:response.status,headers,body:Buffer.from(response.body||'','base64')});
}
async function main(){
 const externalBase=process.env.MIR_PUBLIC_REDESIGN_BASE;
 const server=externalBase?null:await require('../../tests/helpers/mir-static-http.cjs').serve(path.join(root,'dist'));
 const base=externalBase||server.base;
 const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  await context.route('**/*',guardedRoute);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html?recette=1');await page.locator('.mir-mobile-tabs').waitFor();await snap(page,'accueil-telephone');
  for(const label of ['Accueil','Boutique','Pliage','Commandes','Compte'])assert.equal(await page.locator('.mir-mobile-tabs small',{hasText:label}).count(),1,label);
  pass('cinq destinations mobiles, panier en en-tête et Accueil téléphone');
  await page.goto(base+'/boutique.html?recette=1');await page.locator('#shop-brand-directory a').first().waitFor();await snap(page,'boutique-telephone');pass('Boutique téléphone chargée depuis MIR TEST');
  await page.goto(base+'/produit.html?id=beck-panelfast-ags100&recette=1');await page.locator('#product-add').waitFor();assert.match(page.url(),/recette=1/);await snap(page,'produit-telephone');
  const product=await page.locator('#product-detail h1').textContent();await page.locator('#product-quantity').fill('2');await page.locator('#product-add').click();await page.goto(base+'/selection.html?recette=1');await page.locator('.selection-item').waitFor();assert.match(await page.locator('.selection-item').innerText(),new RegExp(product.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.equal(await page.locator('[data-qty]').inputValue(),'2');await snap(page,'panier-telephone');pass('Produit → Panier conserve article, format et quantité');
  await page.locator('#cart-estimate').click();await page.locator('#mir-estimate-dialog[open]').waitFor();await page.waitForFunction(()=>document.querySelector('#estimate-summary')?.textContent.includes('Quantité 2'),null,{timeout:30000});assert.match(await page.locator('#estimate-summary').innerText(),/Quantité 2/);assert.equal(await page.locator('.selection-item').count(),1);pass('Panier → Demander une estimation ouvre le vrai formulaire avec sélection conservée');
  await page.locator('#estimate-close').click();await page.goto(base+'/chantier.html?view=account&recette=1');await page.getByRole('heading',{name:'Mon compte MIR',exact:true}).waitFor();await snap(page,'compte-deconnecte-telephone');pass('Compte déconnecté affiche la connexion sans quitter MIR TEST');
  await page.goto(base+'/chantier.html?view=account&recette=1#aide');await page.locator('.mir-help-dialog[open]').waitFor();assert.match(await page.locator('.mir-help-dialog').innerText(),/Centre d’aide|Aide et soutien/);pass('Centre d’aide réellement ouvert en session déconnectée');
  const cartFixture=await page.evaluate(()=>localStorage.getItem('mir-shopping-list-v1'));
  const privateBase='https://revetementsmir.github.io/Revetements-mir-';await page.goto(privateBase+'/chantier.html?view=account&recette=1');await page.evaluate(raw=>localStorage.setItem('mir-shopping-list-v1',raw),cartFixture);
  const login=await page.evaluate(async({credentials,test})=>{const c=MIRPortalConfig;if(new URL(c.supabaseUrl).hostname!==test)return {ok:false,reason:'wrong-target'};const s=MIRSupabase.createClient(c.supabaseUrl,c.publishableKey,{auth:{storageKey:'mir_portal_auth_'+c.projectRef,flowType:'pkce',detectSessionInUrl:false}});let fallback=null;for(const credential of credentials){const {error}=await s.auth.signInWithPassword({email:credential.email,password:credential.password});if(error)continue;const {data,error:snapshotError}=await s.rpc('mir_account_snapshot');const row=Array.isArray(data)?data[0]:data;if(!snapshotError&&row?.role==='client')return {ok:true,label:credential.label,role:'client'};if(!snapshotError&&row?.role&&!fallback)fallback={credential,role:row.role};await s.auth.signOut();}if(fallback){const {error}=await s.auth.signInWithPassword({email:fallback.credential.email,password:fallback.credential.password});if(!error)return {ok:true,label:fallback.credential.label,role:fallback.role};}return {ok:false,reason:'no-authorized-session'};},{credentials,test});
  assert.equal(login.ok,true,'aucune session MIR TEST autorisée disponible');await page.reload();
  if(login.role==='client'){
   await page.locator('.customer-account').waitFor({timeout:45000});assert.equal(await page.locator('.account-tabs [data-account-view=overview]').getAttribute('aria-pressed'),'true');assert.match(await page.locator('.customer-account').innerText(),/Mes commandes|commande/);await snap(page,'compte-connecte-telephone');pass('Compte client connecté ouvre son aperçu et ses données propres');
   await page.getByRole('link',{name:'Reprendre mon panier'}).click();await page.waitForURL('**/selection.html?**');await page.locator('.selection-item').waitFor();assert.equal(await page.locator('[data-qty]').inputValue(),'2');pass('Panier conservé après connexion client');
   await page.goto(privateBase+'/chantier.html?view=orders&recette=1');await page.locator('.customer-account').waitFor({timeout:45000});assert.equal(await page.locator('.account-tabs [data-account-view=orders]').getAttribute('aria-pressed'),'true');assert.match(await page.locator('.customer-account').innerText(),/Aucune commande enregistrée|Commande /);pass('Commandes client connectées ouvre un onglet distinct avec son état serveur');
  }else{
   await page.locator('#account-bar:not([hidden])').waitFor({timeout:45000});await snap(page,'compte-connecte-telephone');pass('Compte connecté ouvre le portail protégé correspondant au rôle serveur');
   await page.goto(privateBase+'/chantier.html?view=orders&recette=1');await page.locator('#account-bar:not([hidden])').waitFor({timeout:45000});pass('Commandes connectées conserve le portail protégé du rôle interne');results.limits.push('Aucun secret configuré ne correspondait à un client TEST; les onglets Aperçu/Commandes client connectés restent non rejoués dans cette recette.');
  }
  await page.goto(privateBase+'/chantier.html?view=account&recette=1#aide');await page.locator('.mir-help-launch').waitFor();if(!await page.locator('.mir-help-dialog[open]').count())await page.locator('.mir-help-launch').click();await page.locator('.mir-help-dialog[open]').waitFor();assert.match(await page.locator('.mir-help-dialog').innerText(),/Aide et soutien|Centre d’aide|Demandes/);pass('Centre d’aide réellement ouvert en session connectée');
  if(login.role==='client'){await page.locator('.mir-help-close').click();await page.locator('#portal-signout').click();await page.getByRole('heading',{name:'Mon compte MIR',exact:true}).waitFor();pass('Déconnexion client revient à l’authentification sans perdre le panier');}
  assert.deepEqual(results.productionRequests,[],'appel production détecté');assert.deepEqual(errors,[],'erreurs JavaScript téléphone');await context.close();
  for(const [label,width,height] of [['tablette',768,1024],['ordinateur',1440,900]]){
   const c=await browser.newContext({viewport:{width,height},hasTouch:label==='tablette'});await c.route('**/*',guardedRoute);const p=await c.newPage(),js=[];p.on('pageerror',e=>js.push(e.message));
   await p.goto(base+'/boutique.html?recette=1');await p.locator('#shop-brand-directory a').first().waitFor();await snap(p,'boutique-'+label);
   await p.goto(base+'/pliage.html?recette=1');await p.locator('#client-bend-quick').waitFor();await p.locator('#bend-material option').first().waitFor({state:'attached'});assert.ok(await p.locator('[data-dimension]').count()>=2);await snap(p,'pliage-'+label);
   await p.goto(base+'/plan.html?recette=1');await p.waitForFunction(()=>window.MIR_STUDY,{timeout:45000});assert.ok(await p.locator('canvas,svg').count()>0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(js,[],label+' erreurs JavaScript');pass('Boutique, moteur Pliage et moteur Studio sans régression — '+label);await c.close();
  }
  assert.deepEqual(results.productionRequests,[]);fs.writeFileSync(path.join(out,'integrated-results.json'),JSON.stringify(results,null,2));console.log('PASS intégré '+results.checks.length+'/'+results.checks.length);
 }finally{await browser.close();if(server)await new Promise(resolve=>server.server.close(resolve));}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
