'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PGlite}=require('../tools/database/node_modules/@electric-sql/pglite'),{chromium}=require('playwright'),M=require('../dist/production-model.js');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{const db=new PGlite();let browser,server;let chain=Promise.resolve();
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;`);
 for(const f of fs.readdirSync(path.join(__dirname,'../supabase/migrations')).sort())await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',f),'utf8'));
 await db.exec(`insert into mir_core.organizations values('${id(10)}','MIR test');`);
 const users={'admin@example.invalid':{id:id(1),role:'admin'},'client@example.invalid':{id:id(2),role:'client'},'employee@example.invalid':{id:id(3),role:'employee'}};
 for(const u of Object.values(users)){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into mir_core.memberships values($1,$2,$3,true)',[id(10),u.id,u.role]);}
 const sdk=`window.MIRSupabase={createClient(){return {auth:{async signInWithPassword({email,password}){if(password!=='test-only')return {error:{message:'Refus test'}};sessionStorage.setItem('fixture-user',email);return {};},async getUser(){const email=sessionStorage.getItem('fixture-user');return {data:{user:email?{id:email}:null}};},async signOut(){sessionStorage.removeItem('fixture-user');return {};}},async rpc(name,args){const r=await fetch('/test-rpc',{method:'POST',headers:{'content-type':'application/json','x-test-user':sessionStorage.getItem('fixture-user')||''},body:JSON.stringify({name,args})});return r.json();}}}};`;
 const functions={mir_my_memberships:[],mir_shared_snapshot:['org'],mir_submit_request:['org','request_id','model','publication_revision','configuration'],mir_import_master:['org','record'],mir_admin_publish_model:['org','model','expected_revision','settings'],mir_add_master_version:['org','model','expected_revision','template'],mir_assign_job:['org','job_name','employee']};
 server=http.createServer(async(req,res)=>{
  if(req.url==='/test-rpc'){
   let raw='';for await(const c of req)raw+=c;const {name,args}=JSON.parse(raw),u=users[req.headers['x-test-user']];
   const task=chain.then(async()=>{if(!u||!functions[name])throw Error('Test Auth required');await db.exec('begin;set local role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[u.id]);const r=await db.query('select public.'+name+'('+functions[name].map((_,i)=>'$'+(i+1)).join(',')+') as data',functions[name].map(k=>args[k]));await db.exec('commit');return {data:r.rows[0].data};}catch(e){await db.exec('rollback');return {error:{message:e.message,code:e.code}};}});chain=task.catch(()=>{});res.setHeader('content-type','application/json');try{res.end(JSON.stringify(await task));}catch(e){res.end(JSON.stringify({error:{message:e.message}}));}return;
  }
  if(req.url==='/vendor/supabase-client.js'){res.setHeader('content-type','application/javascript');res.end(sdk);return;}
  if(req.url==='/shared-config.js'){res.setHeader('content-type','application/javascript');res.end("window.MIRSharedConfig={enabled:true,supabaseUrl:'https://test.invalid',publishableKey:'sb_publishable_test'};");return;}
  const target=path.resolve(__dirname,'../dist','.'+req.url.split('?')[0]);if(!target.startsWith(path.resolve(__dirname,'../dist')+path.sep)||!fs.existsSync(target)){res.statusCode=404;res.end();return;}
  res.setHeader('content-type',({'.js':'application/javascript','.mjs':'application/javascript','.html':'text/html','.css':'text/css'})[path.extname(target)]||'application/octet-stream');fs.createReadStream(target).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const contexts=[];async function login(email,width){const context=await browser.newContext({viewport:{width,height:900}});contexts.push(context);const p=await context.newPage();p.on('pageerror',e=>{console.error(e);});await p.goto(base+'/espace-partage.html');await p.locator('[name=email]').fill(email);await p.locator('[name=password]').fill('test-only');await p.locator('#login button').click();await p.locator('#workspace').waitFor({state:'visible'});return p;}
 const admin=await login('admin@example.invalid',1440);
 const template=M.createTemplate({kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2}},{id:'local-l',name:'Solin partagé'}).template;
 const record={id:'local-l',name:'Solin partagé',currentVersion:1,versions:[template],allowed:{materials:['aluminium','acier']}};
 await admin.locator('#import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(require('../dist/template-library-backup.js').create([record]).content)});
 await admin.locator('#catalogue article').waitFor();
 // Import the same backup a second time: one master model, no duplicate.
 await admin.locator('#import').setInputFiles({name:'backup-again.json',mimeType:'application/json',buffer:Buffer.from(require('../dist/template-library-backup.js').create([record]).content)});
 await admin.waitForTimeout(150);assert.equal(await admin.locator('#catalogue article').count(),1);
 const inputs=admin.locator('#catalogue form input');await inputs.nth(0).check();await inputs.nth(1).check();await inputs.nth(4).fill('2500');await inputs.nth(5).fill('3000');await inputs.nth(8).fill('3');await inputs.nth(9).check();await inputs.nth(10).fill('2');await admin.locator('#catalogue form button').click();
 await admin.waitForFunction(()=>document.querySelector('#catalogue article')?.dataset.revision==='2');
 await admin.locator('#job-admin input').fill('Chantier test');await admin.locator('#job-admin button').click();
 const client=await login('client@example.invalid',390);await client.locator('#catalogue article').waitFor();assert.equal(await client.locator('#catalogue h2').textContent(),'Solin partagé');
 await client.locator('#catalogue form input').nth(0).fill('Noir');await client.locator('#catalogue form button[type=submit]').click();await client.locator('#orders article').waitFor();assert.match(await client.locator('#orders').textContent(),/25\.00/);
 await admin.locator('#catalogue form input').nth(4).fill('4500');await admin.locator('#catalogue form button').click();await admin.waitForFunction(()=>document.querySelector('#catalogue article')?.dataset.revision==='3'||document.querySelector('#status').textContent.startsWith('Publication non confirmée'));assert.doesNotMatch(await admin.locator('#status').textContent(),/Publication non confirmée/);
 await client.locator('#refresh').click();await client.waitForFunction(()=>document.querySelector('#catalogue form').textContent.includes('45.00'));
 assert.match(await client.locator('#orders').textContent(),/25\.00/,'ancien prix conservé dans la demande');
 const employee=await login('employee@example.invalid',1024);await employee.locator('#catalogue article').waitFor();const fields=employee.locator('#catalogue form input');assert.equal(await fields.nth(2).isDisabled(),true);await fields.nth(0).fill('Noir');await employee.locator('#catalogue form select').last().selectOption({label:'Chantier test'});await employee.locator('#catalogue form button[type=submit]').click();await employee.locator('#orders article').waitFor();
 await admin.locator('#refresh').click();await admin.waitForFunction(()=>document.querySelectorAll('#orders article').length===2);
 const sourceId=(await admin.locator('#orders h3').first().textContent()).split(' · ')[0];await admin.locator('#orders button').first().click();await admin.waitForFunction(()=>window.MIRProductionWorkspace);const copied=await admin.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_admin_dossier_v1')));assert.equal(copied.order.sourceRequestId,sourceId);assert.equal(copied.order.items.length,1);
 console.log('PASS : import sans doublon, publication Admin, client indépendant mobile, demande employé tablette avec cote verrouillée, récupération Admin');
 for(const c of contexts)await c.close();
}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
