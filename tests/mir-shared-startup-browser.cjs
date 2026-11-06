'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{const root=path.resolve(__dirname,'../dist');let browser;const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+req.url.split('?')[0]);if(!p.startsWith(root+path.sep)||!fs.existsSync(p)){res.statusCode=404;res.end();return;}
 res.setHeader('content-type',({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);
});try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p)),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**.supabase.co/**',route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port+'/espace-partage.html');
 await page.waitForTimeout(300);
 assert.deepEqual(errors,[],'aucune erreur avec le vrai SDK embarqué');
 assert.equal(await page.locator('#login').isVisible(),true,'formulaire de connexion visible avec le vrai SDK');
 assert.equal(await page.locator('[name=password]').getAttribute('type'),'password');
 console.log('PASS : démarrage avec MIRSupabase réel, formulaire visible, aucun compte ni mot de passe transmis');
 await page.route('**/vendor/supabase-client.js',route=>route.abort());await page.reload();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.length>0);
 assert.equal(await page.locator('#login').isVisible(),false,'pas de formulaire sans SDK');
 console.log('PASS : SDK indisponible signalé sans page blanche ni formulaire inopérant');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
