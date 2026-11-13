'use strict';
// Chromium simulation of the native adapter; this is not an Android proof.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../www'),proof=path.resolve(__dirname,'../../artifacts/phase11/web');
(async()=>{fs.mkdirSync(proof,{recursive:true});const browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const [width,height] of [[360,780],[390,844],[768,1024],[834,1112],[1366,768],[1440,900],[1920,1080]]){
  const context=await browser.newContext({viewport:{width,height}});const errors=[],requests=[];
  await context.addInitScript(()=>{window.androidBridge={postMessage(){}};window.Capacitor={PluginHeaders:[{name:'MIRNative',methods:['readAuth','writeAuth','clearAuth','clearTemporary','pdf','openExternal','pickFile','scanQr'].map(name=>({name,rtype:'promise'}))},{name:'App',methods:[{name:'addListener',rtype:'callback'},{name:'minimizeApp',rtype:'promise'}]}],nativePromise:async(plugin,method)=>method==='readAuth'?{}:{},nativeCallback:()=> 'simulated-listener'};});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='https://localhost'){requests.push(url.href);return route.abort();}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'missing'});await route.fulfill({path:file});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://localhost/chantier.html');await page.locator('#auth-signin-form').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>MIRPortalConfig.projectRef),'hxtztkmbfpmzrieccwsg');assert.equal(await page.locator('#auth-google').evaluate(e=>e.hidden),true);assert.equal(await page.locator('[data-auth-screen=signup]').evaluate(e=>e.hidden),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  const blocked=await page.evaluate(async()=>{try{await fetch('https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/');return false;}catch{return true;}});assert.equal(blocked,true);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
  await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('#mir-native-state').textContent.includes('Hors ligne'));await context.setOffline(false);await page.waitForFunction(()=>document.querySelector('#mir-native-state').textContent.includes('actualisation'));
  await page.screenshot({path:path.join(proof,`signin-${width}x${height}.png`),fullPage:true});
  await page.evaluate(()=>MIRHarmonySettings.store({theme:'dark',textSize:'large',reducedMotion:'on',highContrast:true}));await page.reload();await page.locator('#auth-signin-form').waitFor({state:'visible'});assert.equal(await page.locator('html').getAttribute('data-mir-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-mir-text'),'large');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await page.evaluate(()=>MIRHarmonySettings.store({theme:'system'}));await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.mirTheme==='light');await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.mirTheme==='dark');assert.deepEqual(errors,[]);await context.close();console.log(`PASS Chromium adapter ${width}×${height}, TEST, auth, offline, no overflow/errors`);
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
