'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(process.env.MIR_APK_PREVIEW_ROOT||'artifacts/apk-preview-site'),proof='artifacts/apk-preview-proofs';
const server=http.createServer((req,res)=>{const name=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!name.startsWith(root+path.sep)||!fs.existsSync(name)||!fs.statSync(name).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml'})[path.extname(name)]||'application/octet-stream');fs.createReadStream(name).pipe(res);});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,...(process.env.MIR_CHROMIUM_BIN?{executablePath:process.env.MIR_CHROMIUM_BIN}:{})});try{
 fs.mkdirSync(proof,{recursive:true});const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text());});
 await page.addInitScript(()=>{window.originalStorage=localStorage;localStorage.setItem('production-sentinel','untouched');});
 await page.route('**/*.supabase.co/**',route=>{network.push(route.request().url());return route.abort();});
 const url='http://127.0.0.1:'+server.address().port+'/test/application/responsive.html?app-preview=1&app-platform=android&phone=galaxy-s26-ultra';
 await page.goto(url);await page.locator('[data-mir-responsive-ready=true]').waitFor({timeout:30000});
 const app=page.locator('[data-mir-responsive-page]');await app.locator('#auth-signin-form').waitFor();
 assert.equal(await page.locator('iframe').count(),0);assert.equal(await app.locator('#auth-google').isVisible(),false);
 assert.equal(await page.evaluate(()=>MIRPortalConfig.projectRef),'hxtztkmbfpmzrieccwsg');
 assert.equal(await page.evaluate(()=>document.querySelector('#mir-native-state').closest('[data-mir-responsive-page]')!==null),true);
 for(const layout of ['phone','tablet']){
  await page.locator('button[data-layout='+layout+']').click();
  assert.equal(await app.locator('#auth-signin-form').isVisible(),true);
  await page.screenshot({animations:'disabled',path:proof+'/'+layout+'.png'});
 }
 await page.locator('button[data-layout=phone]').click();
 await page.getByRole('button',{name:'Annoter',exact:true}).click();
 await app.locator('#auth-signin-form input[type=email]').click();
 await page.getByPlaceholder('Qu’aimerais-tu changer ?').fill('Corriger ce champ dans l’APK, pas seulement le site.');
 await page.getByRole('button',{name:'Ajouter l’annotation au tableau',exact:true}).click();
 const notes=await page.evaluate(()=>MIRAPKPreview.getAnnotations());
 assert.equal(notes.length,1);const serialized=JSON.stringify(notes);assert.match(serialized,/d1876c75/);assert.match(serialized,/mobile\/web\/team.css/);assert.match(serialized,/Application Android TEST/);assert.match(serialized,/dist\/chantier.html/);
 await page.locator('.preview-annotation-toggle').click();await page.screenshot({animations:'disabled',path:proof+'/annotation-APK-source.png'});
 assert.equal(await page.evaluate(async()=>{localStorage.clear();await MIRAPKPreview.Native.writeAuth({value:'fixture-only'});const read=await MIRAPKPreview.Native.readAuth();await MIRAPKPreview.Native.clearAuth();return originalStorage.getItem('production-sentinel')==='untouched'&&read.value==='fixture-only';}),true);
 assert.equal(await page.evaluate(async()=>{try{await fetch('https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/');return false;}catch{return true;}}),true);
 assert.equal(await page.locator('[data-preview-environment=production]').getAttribute('aria-disabled'),'true');
 await page.locator('[data-app-platform=apple]').click();assert.equal(await page.locator('.preview-stage').isVisible(),false);assert.match(await page.locator('.preview-application-notice').textContent(),/non raccordé/);
 assert.deepEqual(network,[]);assert.deepEqual(errors,[]);console.log('PASS same APK UI sources, Android phone/tablet, source-bound annotations, TEST-only networking, isolated storage and unavailable Apple/PRODUCTION.');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
