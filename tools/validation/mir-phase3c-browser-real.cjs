'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),dist=path.join(root,'dist'),origin='https://revetementsmir.github.io',base='/Revetements-mir-/';
const email=process.env.MIR_SANDBOX_OUTSIDER_EMAIL,password=process.env.MIR_SANDBOX_OUTSIDER_PASSWORD;
if(!email||!password)throw Error('Missing private client recipe settings');
const report={kind:'real-browser-MIR-TEST-phase3c',projectId:'hxtztkmbfpmzrieccwsg',production:'not-accessed',checks:[],formats:[],startedAt:new Date().toISOString()};
const check=(name,condition,evidence)=>{report.checks.push({name,status:condition?'passed':'failed',evidence});console.log((condition?'PASS ':'FAIL ')+name);assert.ok(condition,name);};
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
async function main(){
 const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',headless:true,proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY},args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:true});
 await context.route(origin+base+'**',async route=>{const u=new URL(route.request().url()),rel=decodeURIComponent(u.pathname.slice(base.length))||'index.html',file=path.resolve(dist,rel);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'not found'});return route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+base+'chantier.html?recette=1',{waitUntil:'domcontentloaded'});await page.locator('#auth-signin-form').waitFor();
  const auth=await page.evaluate(async({email,password})=>{const c=window.MIRSupabase.createClient(window.MIRPortalConfig.supabaseUrl,window.MIRPortalConfig.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'mir_portal_auth_'+window.MIRPortalConfig.projectRef}}),r=await c.auth.signInWithPassword({email,password});return {ok:!!r.data.session,code:r.error?.code||null};},{email,password});check('real client Auth browser session',auth.ok,auth.code);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.mir-help-launch').waitFor();await page.locator('.mir-help-launch').click();await page.locator('.mir-help-dialog[open]').waitFor();await page.locator('.mir-help-search input').waitFor();
  check('help opens over current page without navigation',page.url().includes('chantier.html'),{url:'same branch page'});
  await page.locator('.mir-help-search input').fill('introuvable-'+Date.now());await page.locator('.mir-help-search button').click();await page.getByText('Aucun résultat',{exact:true}).waitFor();check('search and explicit empty state',true);
  await page.locator('[data-help-category=all]').click();
  const form=page.locator('#mir-help-create');await form.waitFor({timeout:60000});await form.locator('select').selectOption('account');await form.locator('input[name=subject]').fill('Brouillon navigateur privé');await form.locator('textarea').fill('Texte conservé pendant une coupure réseau');
  await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));check('offline state disables send and preserves draft',await form.locator('button').isDisabled()&&await form.locator('textarea').inputValue()==='Texte conservé pendant une coupure réseau');
  check('offline attachment limitation is explicit',await page.getByText(/pièce jointe devra être choisie de nouveau/i).count()===1);
  await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')));
  const captures=path.join(root,'docs/verification/captures/help-phase3c');fs.mkdirSync(captures,{recursive:true});
  for(const [width,height,label] of [[390,844,'phone'],[768,1024,'tablet'],[1440,900,'desktop']]){await page.setViewportSize({width,height});check(label+' layout has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),{width,height});await page.screenshot({path:path.join(captures,`help-${width}x${height}.png`),fullPage:true});report.formats.push({label,width,height});}
  check('no browser script error',errors.length===0,{count:errors.length});report.status='PASSED';report.finishedAt=new Date().toISOString();
 }finally{await browser.close();fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/mir-phase3c-browser-real.json'),JSON.stringify(report,null,2));}
}
main().catch(e=>{report.status='FAILED';report.failureClass=e.name;report.finishedAt=new Date().toISOString();fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/mir-phase3c-browser-real.json'),JSON.stringify(report,null,2));console.error(e.message);process.exitCode=1;});
