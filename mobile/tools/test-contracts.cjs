'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Policy=require('../web/policy.cjs'),root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'web/sdk.js'),'utf8');
function harness(role='employee'){
 let authListener;const calls=[],local=new Map([['old-private','value']]);let vault='old-session',options;
 const auth={signInWithPassword:async()=>({data:{user:{id:'test-user'}}}),signOut:async()=>({error:null}),onAuthStateChange:fn=>(authListener=fn,{}),stopAutoRefresh(){},startAutoRefresh(){},getUser:async()=>({data:{user:{id:'test-user'}}})};
 const raw={auth,rpc:async name=>{calls.push(name);return {data:name==='mir_account_snapshot'?{role}: {confirmed:true},error:null};}};
 const slots=new Map();
 const Native={readAuth:async({slot='session'}={})=>({value:slot==='session'?vault:slots.get(slot)}),writeAuth:async({value,slot='session'})=>{if(slot==='session')vault=value;else slots.set(slot,value);},removeAuthSlot:async({slot})=>slots.delete(slot),clearAuth:async()=>{vault=null;slots.clear();}};
 const window={MIRAndroid:{Native,Policy},MIRSupabase:{createClient:(url,key,opts)=>{options=opts;return raw;}}};
 vm.runInNewContext(source,{require:name=>{assert.equal(name,'./auth-flow.cjs');return require('../web/auth-flow.cjs');},window,localStorage:{clear:()=>local.clear()},sessionStorage:{clear(){}},indexedDB:{databases:async()=>[]},setTimeout});
 const client=window.MIRSupabase.createClient('https://'+Policy.TEST,'sb_publishable_test',{});
 return{window,client,calls,local,emit:(event,session)=>authListener(event,session),vault:()=>vault,options:()=>options};
}
test('Request boundary refuses production, lookalikes, cleartext and mail endpoints',()=>{
 for(const url of ['https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/','http://'+Policy.TEST+'/rest/v1/','https://'+Policy.TEST+'.evil.example/rest/v1/','https://user@'+Policy.TEST+'/rest/v1/','https://'+Policy.TEST+'/auth/v1/otp','https://'+Policy.TEST+'/functions/v1/send','https://smtp.example/'])assert.equal(Policy.allowedRequest(url),false,url);
 assert.equal(Policy.allowedRequest('https://'+Policy.TEST+'/rest/v1/rpc/mir_account_snapshot'),true);
 assert.equal(Policy.allowedRequest('https://'+Policy.TEST+'/auth/v1/recover'),true);
 assert.equal(Policy.allowedRequest('https://'+Policy.TEST+'/functions/v1/mir-team-invitations'),true);
 assert.equal(Policy.allowedRequest('https://'+Policy.TEST+'/functions/v1/mir-team-invitations/other'),false);
 assert.equal(Policy.allowedRequest('https://gccltmaulvrnthrbnrpd.supabase.co/auth/v1/recover'),false);
});
test('Only enumerated local routes enter the WebView; signed URLs stay out of external browser',()=>{
 for(const url of ['https://localhost/plan.html','https://localhost/boutique.html','https://localhost/produit.html','https://localhost/selection.html','https://localhost/pliage.html','https://localhost/estimation.html','https://evil.example/chantier.html','https://localhost/untrusted/chantier.html','javascript:alert(1)','file:///chantier.html'])assert.equal(Policy.allowedRoute(url),false);
 assert.equal(Policy.allowedRoute('https://localhost/chantier.html'),true);assert.equal(Policy.external('https://'+Policy.TEST+'/storage/v1/object/sign/private'),false);
});
test('Public configurator and estimate URL variants fail closed; employee folding stays available',()=>{
 for(const name of ['mir_client_center_snapshot_scoped','mir_client_support_action_scoped','mir_estimate_submit'])assert.equal(Policy.allowedRequest('https://'+Policy.TEST+'/rest/v1/rpc/'+name),false);
 assert.equal(Policy.allowedRequest('https://'+Policy.TEST+'/rest/v1/rpc/mir_%63lient_support_action_scoped'),false);
 assert.equal(Policy.allowedRequest('https://'+Policy.TEST+'/rest/v1/rpc/mir_management_action'),true);
 for(const url of ['https://www.revetementsmir.com/estimation.html','https://revetementsmir.com/','https://revetementsmir.github.io/Revetements-mir-/'])assert.equal(Policy.external(url),false);
 assert.equal(Policy.external('https://www.google.com/maps/dir/?destination=Quebec'),true);
 for(const suffix of ['?mode=client','?mode=client&kind=panel','?mode=client&source=store','?mode=client&source=store&kind=panel','?mode=client&source=store&kind=profile&mode=admin','?mode=client&source=store&source=client&kind=profile','?mode=client&source=store&kind=profile&kind=panel','?%6dode=client','?estimate=1','?estimate=0'])assert.equal(Policy.allowedRoute('https://localhost/production.html'+suffix),false,suffix);
 assert.equal(Policy.allowedRoute('https://localhost/production.html?mode=client&source=store&kind=profile'),true);
 assert.equal(Policy.allowedRoute('https://localhost/production.html?view=models'),true);
 assert.equal(Policy.allowedRoute('https://localhost/chantier.html?estimate=1'),false);
});
test('Public estimate implementation is absent from the embedded package',()=>{
 for(const file of ['mir-estimate.js','mir-estimate-drafts.js','mir-estimate-upload.js'])assert.equal(fs.existsSync(path.join(root,'www',file)),false,file);
 for(const file of fs.readdirSync(path.join(root,'www')).filter(name=>name.endsWith('.html')))assert.doesNotMatch(fs.readFileSync(path.join(root,'www',file),'utf8'),/src="mir-estimate(?:-drafts|-upload)?\.js/);
 const help=fs.readFileSync(path.join(root,'www/mir-help-center.js'),'utf8');assert.doesNotMatch(help,/Comment demander une estimation\?|depuis la page Nous joindre|Comment retrouver mon panier\?/);assert.match(help,/compte équipe/);
});
for(const role of ['employee','chef','warehouse','assistant','boss'])test(role+' is revalidated by the server before every business RPC',async()=>{
 const h=harness(role);assert.equal((await h.client.rpc('mir_business',{role:'admin'})).error,null);assert.deepEqual(h.calls,['mir_account_snapshot','mir_business']);await h.client.rpc('mir_business');assert.deepEqual(h.calls.slice(-2),['mir_account_snapshot','mir_business']);
});
for(const role of ['admin','client','unknown',null])test(String(role)+' cannot sign in or call business RPCs',async()=>{
 const h=harness(role);assert.equal((await h.client.auth.signInWithPassword({})).error.code,'42501');assert.equal(h.vault(),null);assert.equal((await h.client.rpc('mir_business')).error.code,'42501');assert.equal(h.calls.includes('mir_business'),false);
});
test('Account switch purges local data and SDK uses asynchronous native storage only',async()=>{
 const h=harness();await h.client.auth.signInWithPassword({});assert.equal(h.local.size,0);assert.equal(h.vault(),null);assert.equal(h.options().auth.detectSessionInUrl,false);await h.options().auth.storage.setItem(h.options().auth.storageKey,'session');assert.equal(h.vault(),'session');await h.client.auth.signOut();assert.equal(h.vault(),null);
});
test('Native identity follows Auth on every page, including outside chantier',()=>{const h=harness();h.emit('SIGNED_IN',{user:{id:'account-a'}});assert.equal(h.window.MIRAndroidSession.currentUserId(),'account-a');h.emit('SIGNED_OUT',null);assert.equal(h.window.MIRAndroidSession.currentUserId(),null);});
test('SDK secondary-key cleanup never erases the authenticated vault',async()=>{const h=harness(),storage=h.options().auth.storage,key=h.options().auth.storageKey;await storage.setItem(key,'session');await storage.removeItem(key+'-user');await storage.removeItem(key+'-flows-code-verifier');assert.equal(await storage.getItem(key),'session');assert.equal(await storage.getItem(key+'-user'),null);await assert.rejects(()=>storage.setItem(key+'-user','unexpected'));assert.equal(h.vault(),'session');});
test('All invitation/email/OAuth methods fail without invoking a transport',async()=>{
 const h=harness();for(const method of ['signUp','signInWithOAuth','signInWithOtp','resetPasswordForEmail','resend','inviteUserByEmail'])assert.equal((await h.client.auth[method]()).error.code,'ANDROID_TRANSPORT_DISABLED');assert.deepEqual(h.calls,[]);
});
test('Built configuration is TEST only and the web engines are unchanged',()=>{
 const config=JSON.parse(fs.readFileSync(path.join(root,'capacitor.config.json')));assert.equal(config.server.url,undefined);assert.equal(config.server.cleartext,false);assert.equal(config.android.webContentsDebuggingEnabled,false);
 const staged=fs.readFileSync(path.join(root,'www/portal-config.js'),'utf8');assert.ok(staged.includes('hxtztkmbfpmzrieccwsg'));assert.ok(!staged.includes('gccltmaulvrnthrbnrpd'));
 for(const file of ['production-model.js','mir-bending-presets.js','mir-catalogue.js','portal-client.js','chantier-app.js'])if(fs.existsSync(path.join(root,'../dist',file)))assert.deepEqual(fs.readFileSync(path.join(root,'www',file)),fs.readFileSync(path.join(root,'../dist',file)),file);
});

test('Every embedded service configuration stays TEST even when a production build is requested',()=>{
 const cp=require('node:child_process');
 for(const file of ['portal-config.js','shared-config.js','mir-estimate-config.js']){const content=fs.readFileSync(path.join(root,'www',file),'utf8');assert.doesNotMatch(content,/gccltmaulvrnthrbnrpd/);}
 assert.match(fs.readFileSync(path.join(root,'www/shared-config.js'),'utf8'),/hxtztkmbfpmzrieccwsg/);
 assert.match(fs.readFileSync(path.join(root,'www/mir-estimate-config.js'),'utf8'),/enabled:false/);
 const result=cp.spawnSync(process.execPath,[path.join(root,'tools/build-web.cjs')],{env:{...process.env,MIR_ANDROID_ENV:'production'},encoding:'utf8'});assert.equal(result.error,undefined);assert.notEqual(result.status,0);assert.match(result.stderr,/Seule la recette MIR TEST est autorisée/);
 assert.equal(fs.existsSync(path.join(root,'www/responsive.html')),false);assert.equal(fs.existsSync(path.join(root,'www/boutique.html')),false);
});
