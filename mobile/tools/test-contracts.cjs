'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Policy=require('../web/policy.cjs'),root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'web/sdk.js'),'utf8');
function harness(role='employee'){
 const calls=[],local=new Map([['old-private','value']]);let vault='old-session',options;
 const auth={signInWithPassword:async()=>({data:{user:{id:'test-user'}}}),signOut:async()=>({error:null}),onAuthStateChange:()=>({}),stopAutoRefresh(){},startAutoRefresh(){},getUser:async()=>({data:{user:{id:'test-user'}}})};
 const raw={auth,rpc:async name=>{calls.push(name);return {data:name==='mir_account_snapshot'?{role}: {confirmed:true},error:null};}};
 const Native={readAuth:async()=>({value:vault}),writeAuth:async({value})=>{vault=value;},clearAuth:async()=>{vault=null;}};
 const window={MIRAndroid:{Native,Policy},MIRSupabase:{createClient:(url,key,opts)=>{options=opts;return raw;}}};
 vm.runInNewContext(source,{window,localStorage:{clear:()=>local.clear()},sessionStorage:{clear(){}},indexedDB:{databases:async()=>[]},setTimeout});
 const client=window.MIRSupabase.createClient('https://'+Policy.TEST,'sb_publishable_test',{});
 return{window,client,calls,local,vault:()=>vault,options:()=>options};
}
test('Request boundary refuses production, lookalikes, cleartext and mail endpoints',()=>{
 for(const url of ['https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/','http://'+Policy.TEST+'/rest/v1/','https://'+Policy.TEST+'.evil.example/rest/v1/','https://user@'+Policy.TEST+'/rest/v1/','https://'+Policy.TEST+'/auth/v1/recover','https://'+Policy.TEST+'/functions/v1/send','https://smtp.example/'])assert.equal(Policy.allowedRequest(url),false,url);
 assert.equal(Policy.allowedRequest('https://'+Policy.TEST+'/rest/v1/rpc/mir_account_snapshot'),true);
});
test('Only enumerated local routes enter the WebView; signed URLs stay out of external browser',()=>{
 for(const url of ['https://evil.example/chantier.html','https://localhost/untrusted/chantier.html','javascript:alert(1)','file:///chantier.html'])assert.equal(Policy.allowedRoute(url),false);
 assert.equal(Policy.allowedRoute('https://localhost/chantier.html'),true);assert.equal(Policy.external('https://'+Policy.TEST+'/storage/v1/object/sign/private'),false);
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
test('SDK secondary-key cleanup never erases the authenticated vault',async()=>{const h=harness(),storage=h.options().auth.storage,key=h.options().auth.storageKey;await storage.setItem(key,'session');await storage.removeItem(key+'-user');await storage.removeItem(key+'-flows-code-verifier');assert.equal(await storage.getItem(key),'session');assert.equal(await storage.getItem(key+'-user'),null);await assert.rejects(()=>storage.setItem(key+'-user','unexpected'));assert.equal(h.vault(),'session');});
test('All invitation/email/OAuth methods fail without invoking a transport',async()=>{
 const h=harness();for(const method of ['signUp','signInWithOAuth','signInWithOtp','resetPasswordForEmail','resend','inviteUserByEmail'])assert.equal((await h.client.auth[method]()).error.code,'ANDROID_TRANSPORT_DISABLED');assert.deepEqual(h.calls,[]);
});
test('Built configuration is TEST only and the web engines are unchanged',()=>{
 const config=JSON.parse(fs.readFileSync(path.join(root,'capacitor.config.json')));assert.equal(config.server.url,undefined);assert.equal(config.server.cleartext,false);assert.equal(config.android.webContentsDebuggingEnabled,false);
 const staged=fs.readFileSync(path.join(root,'www/portal-config.js'),'utf8');assert.ok(staged.includes('hxtztkmbfpmzrieccwsg'));assert.ok(!staged.includes('gccltmaulvrnthrbnrpd'));
 for(const file of ['production-model.js','mir-bending-presets.js','mir-catalogue.js','portal-client.js','chantier-app.js'])if(fs.existsSync(path.join(root,'../dist',file)))assert.deepEqual(fs.readFileSync(path.join(root,'www',file)),fs.readFileSync(path.join(root,'../dist',file)),file);
});
