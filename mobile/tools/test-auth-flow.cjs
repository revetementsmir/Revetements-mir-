'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto');
const Flow=require('../web/auth-flow.cjs'),Policy=require('../web/policy.cjs'),root=path.resolve(__dirname,'../..');
function harness({role='employee',exchangeError=false}={}){
 const slots=new Map(),requests=[],opened=[],replaced=[];let exchanges=0;
 const user={id:'00000000-0000-4000-8000-000000000005',email:'employee@example.invalid',aud:'authenticated',created_at:'2026-11-14T00:00:00Z'};
 const Native={readAuth:async({slot='session'}={})=>({value:slots.get(slot)}),writeAuth:async({slot='session',value})=>{slots.set(slot,value);},removeAuthSlot:async({slot})=>slots.delete(slot),clearAuth:async()=>slots.clear(),openAuth:async({url})=>opened.push(url)};
 const c=vm.createContext({console,URL,URLSearchParams,TextEncoder,TextDecoder,crypto:webcrypto,Headers,Request,Response,setTimeout,clearTimeout,setInterval,clearInterval,AbortController,Buffer,btoa,atob,WebSocket,
  location:{replace:url=>replaced.push(url)},localStorage:{clear(){}},sessionStorage:{clear(){}},indexedDB:{databases:async()=>[]},require:()=>Flow,
  fetch:async(input,init)=>{const url=String(input);requests.push(url);assert.ok(url.startsWith(Flow.PROJECT+'/'),url);let body={};
   if(url.includes('/token?grant_type=pkce')){exchanges++;body=exchangeError?{error:'invalid_grant',error_description:'Expired'}:{access_token:'a.b.c',refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user};}
   else if(url.includes('/rpc/mir_account_snapshot'))body={role};
   else if(url.endsWith('/user'))body=user;
   else if(!url.includes('/recover')&&!url.includes('/logout'))throw Error('Unexpected transport '+url);
   return new Response(JSON.stringify(body),{status:exchangeError&&url.includes('grant_type=pkce')?400:200,headers:{'content-type':'application/json'}});
  }});
 c.window={MIRAndroid:{Native,Policy},MIRTeamTestConfig:{googleEnabled:true,recoveryEnabled:true}};
 vm.runInContext(fs.readFileSync(path.join(root,'dist/vendor/supabase-client.js'),'utf8'),c);c.window.MIRSupabase=c.MIRSupabase;
 vm.runInContext(fs.readFileSync(path.join(root,'mobile/web/sdk.js'),'utf8'),c);
 const client=c.window.MIRSupabase.createClient(Flow.PROJECT,'sb_publishable_test',{auth:{autoRefreshToken:false}});
 return{client,slots,opened,replaced,requests,accept:c.window.MIRAndroidAcceptAuth,exchanges:()=>exchanges};
}
test('callback and authorize reject ambiguous, injected and foreign URLs',()=>{
 const good=Flow.CALLBACK+'?flow=google&code=code-123';assert.equal(Flow.callback(good).flow,'google');
 for(const url of [good+'&flow=recovery',good+'&code=other',good+'&error=access_denied',good+'#token',good.replace('auth/','auth:443/'),good.replace('mirtest:','https:'),good+'&unknown=x'])assert.equal(Flow.callback(url),null,url);
 const auth=Flow.PROJECT+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(Flow.CALLBACK+'?flow=google')+'&code_challenge_method=s256&code_challenge='+'a'.repeat(43);
 assert.equal(Flow.authorize(auth),true);for(const url of [auth+'&provider=github',auth+'#secret',auth.replace(Flow.PROJECT,'https://evil.example')])assert.equal(Flow.authorize(url),false);
});
test('real bundled SDK persists all PKCE keys in encrypted slot, exchanges once, and consumes pending callback',async()=>{
 const h=harness();assert.equal((await h.client.auth.signInWithOAuth()).error,null);assert.equal(h.opened.length,1);assert.equal(Flow.authorize(h.opened[0]),true);
 const bag=JSON.parse(h.slots.get('pkce'));assert.ok(Object.keys(bag).some(k=>/-flow-[a-f0-9]{32}-code-verifier$/.test(k)));assert.ok(bag['mir_android_test_auth-flows-code-verifier']);assert.equal(h.slots.has('session'),false);
 await h.accept(Flow.CALLBACK+'?flow=google&code=code-123');assert.equal(h.exchanges(),1);assert.deepEqual(h.replaced,['chantier.html']);assert.equal(h.slots.has('pending'),false);assert.ok(h.slots.has('session'));
 await assert.rejects(()=>h.accept(Flow.CALLBACK+'?flow=google&code=code-123'));assert.equal(h.exchanges(),1);await h.client.auth.signOut();assert.equal(h.slots.size,0);
});
test('simultaneous callbacks cannot both exchange a code',async()=>{
 const h=harness();await h.client.auth.signInWithOAuth();const result=await Promise.allSettled([h.accept(Flow.CALLBACK+'?flow=google&code=one'),h.accept(Flow.CALLBACK+'?flow=google&code=one')]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(h.exchanges(),1);await h.client.auth.signOut();
});
test('wrong flow and expired pending state never call token endpoint',async()=>{
 const h=harness();await h.client.auth.signInWithOAuth();await assert.rejects(()=>h.accept(Flow.CALLBACK+'?flow=recovery&code=one'));h.slots.set('pending',JSON.stringify({flow:'google',expires:Date.now()-1}));await assert.rejects(()=>h.accept(Flow.CALLBACK+'?flow=google&code=one'));assert.equal(h.exchanges(),0);await h.client.auth.signOut();
});
test('recovery uses actual SDK PKCE and refuses a client account before retaining session',async()=>{
 const h=harness({role:'client'});assert.equal((await h.client.auth.resetPasswordForEmail('employee@example.invalid')).error,null);assert.ok(h.slots.has('pkce'));await assert.rejects(()=>h.accept(Flow.CALLBACK+'?flow=recovery&code=one'),/équipe MIR/);assert.equal(h.slots.size,0);assert.deepEqual(h.replaced,[]);
});
