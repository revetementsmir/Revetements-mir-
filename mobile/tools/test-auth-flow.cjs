'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto');
const {sharedLocksFor}=require('./auth-lock-test-helper.cjs');
const Flow=require('../web/auth-flow.cjs'),Policy=require('../web/policy.cjs'),root=path.resolve(__dirname,'../..');
function harness({role='employee',exchangeError=false,slots=new Map(),team=false,denyInvitation=false,roleState=null,accountHook=null,userHook=null,tokenState=null,clearHook=null,browserStore=new Map(),locks}={}){
 const requests=[],opened=[],replaced=[];let exchanges=0,accepted=false,nativeClears=0;
 const jwt=()=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:'00000000-0000-4000-8000-000000000005',jti:tokenState?.value||'session-default',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.local-signature';
 const user={id:'00000000-0000-4000-8000-000000000005',email:'employee@example.invalid',aud:'authenticated',created_at:'2026-11-14T00:00:00Z'};
 const Native={readAuth:async({slot='session'}={})=>({value:slots.get(slot)}),writeAuth:async({slot='session',value})=>{slots.set(slot,value);},removeAuthSlot:async({slot})=>slots.delete(slot),clearAuth:async()=>{nativeClears++;if(clearHook?.run)return clearHook.run();slots.clear();},openAuth:async({url})=>opened.push(url)};
 const c=vm.createContext({navigator:locks===null?{}:{locks:locks||sharedLocksFor(slots)},console,URL,URLSearchParams,TextEncoder,TextDecoder,crypto:webcrypto,Headers,Request,Response,setTimeout,clearTimeout,setInterval,clearInterval,AbortController,Buffer,btoa,atob,WebSocket,
  location:{replace:url=>replaced.push(url)},localStorage:{clear:()=>browserStore.clear(),setItem:(k,v)=>browserStore.set(k,v),getItem:k=>browserStore.get(k)||null},sessionStorage:{clear(){}},indexedDB:{databases:async()=>[]},require:()=>Flow,
  fetch:async(input,init)=>{const url=String(input);requests.push(url);assert.ok(url.startsWith(Flow.PROJECT+'/'),url);let body={};
   if(url.includes('/token?grant_type=pkce')){exchanges++;body=exchangeError?{error:'invalid_grant',error_description:'Expired'}:{access_token:jwt(),refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user};}
   else if(url.includes('/rpc/mir_team_accept_invitation')){if(denyInvitation)return new Response(JSON.stringify({code:'42501',message:'Invitation refusée'}),{status:403});accepted=true;body={ok:true};}
   else if(url.includes('/rpc/mir_account_snapshot')){if(accountHook?.run)return accountHook.run();body={role:roleState?roleState.role:accepted?'employee':role};}
   else if(url.includes('/token?grant_type=password'))body={access_token:jwt(),refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user};
   else if(url.includes('/token?grant_type=refresh_token'))body={access_token:jwt(),refresh_token:'test-refresh-'+(tokenState?.value||'default'),expires_in:3600,token_type:'bearer',user};
   else if(url.endsWith('/user')){if(userHook?.run)return userHook.run();body=user;}
   else if(!url.includes('/recover')&&!url.includes('/logout'))throw Error('Unexpected transport '+url);
   return new Response(JSON.stringify(body),{status:exchangeError&&url.includes('grant_type=pkce')?400:200,headers:{'content-type':'application/json'}});
  }});
 c.window={MIRAndroid:{Native,Policy},MIRTeamTestConfig:{googleEnabled:true,recoveryEnabled:true,teamInvitationsEnabled:team}};
 vm.runInContext(fs.readFileSync(path.join(root,'dist/vendor/supabase-client.js'),'utf8'),c);c.window.MIRSupabase=c.MIRSupabase;
 vm.runInContext(fs.readFileSync(path.join(root,'mobile/web/sdk.js'),'utf8'),c);
 const client=c.window.MIRSupabase.createClient(Flow.PROJECT,'sb_publishable_test',{auth:{autoRefreshToken:false}});
 return{client,slots,opened,replaced,requests,accept:c.window.MIRAndroidAcceptAuth,resume:()=>c.window.MIRAndroidSession.resume(),browserStore,exchanges:()=>exchanges,nativeClears:()=>nativeClears};
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

test('native password invitation is accepted by the server before the first business snapshot',async()=>{
 const h=harness({role:'client',team:true});const r=await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'a-long-local-password',options:{mirInvitation:'a'.repeat(43)}});assert.equal(r.error,null);assert.ok(h.requests.findIndex(u=>u.includes('mir_team_accept_invitation'))<h.requests.findIndex(u=>u.includes('mir_account_snapshot')));await h.client.auth.signOut();
});
test('native Google retains invitation encrypted through callback, and wrong account is purged',async()=>{
 const h=harness({role:'client',team:true});await h.client.auth.signInWithOAuth({options:{mirInvitation:'a'.repeat(43)}});assert.equal(JSON.parse(h.slots.get('pending')).invitation,'a'.repeat(43));await h.accept(Flow.CALLBACK+'?flow=google&code=one');assert.ok(h.slots.has('session'));await h.client.auth.signOut();
 const bad=harness({role:'client',team:true,denyInvitation:true});await bad.client.auth.signInWithOAuth({options:{mirInvitation:'a'.repeat(43)}});await assert.rejects(()=>bad.accept(Flow.CALLBACK+'?flow=google&code=one'),/Invitation refusée/);assert.equal(bad.slots.size,0);
});
test('native session survives a fresh SDK instance and sign out purges every encrypted slot',async()=>{
 const a=harness();await a.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});assert.ok(a.slots.has('session'));const b=harness({slots:a.slots});const r=await b.client.auth.getSession();assert.equal(r.data.session.user.id,'00000000-0000-4000-8000-000000000005');await b.client.auth.signOut();assert.equal(a.slots.size,0);
});

test('a revoked role purges an already running native session on its next business RPC',async()=>{
 const state={role:'employee'},h=harness({roleState:state});await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});assert.ok(h.slots.has('session'));state.role='client';assert.equal((await h.client.rpc('mir_portal_snapshot')).error.code,'42501');assert.equal(h.slots.size,0);
});

test('a late denied account read from the previous session cannot purge the next login',async()=>{
 const hook={},h=harness({accountHook:hook});await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});
 let release,entered;const started=new Promise(r=>entered=r);hook.run=()=>{hook.run=null;entered();return new Promise(r=>release=r);};
 const old=h.client.rpc('mir_portal_snapshot');await started;
 assert.equal((await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'})).error,null);
 release(new Response(JSON.stringify({code:'42501',message:'Previous session denied'}),{status:403,headers:{'content-type':'application/json'}}));
 assert.equal((await old).error.code,'SESSION_CHANGED');assert.ok(h.slots.has('session'));assert.ok((await h.client.auth.getSession()).data.session);await h.client.auth.signOut();
});

const rejectedUser=code=>new Response(JSON.stringify({code,message:'Previous request denied'}),{status:403,headers:{'content-type':'application/json','x-supabase-api-version':'2024-01-01'}});
const drain=async()=>{for(let i=0;i<15;i++)await new Promise(r=>setTimeout(r,0));};
for(const code of['bad_jwt','session_not_found'])test('late resume '+code+' from before re-login preserves the new vault and browser data',async()=>{
 const hook={},state={value:'before-login'},h=harness({userHook:hook,tokenState:state});await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});
 let release,entered;const started=new Promise(r=>entered=r);hook.run=()=>{hook.run=null;entered();return new Promise(r=>release=r);};const pending=h.resume();await started;state.value='after-login';assert.equal((await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'})).error,null);h.browserStore.set('probe','new-login-marker');const current=h.slots.get('session');release(rejectedUser(code));await pending;await drain();assert.equal(h.slots.get('session')===current,true,'An obsolete user response must not alter the new encrypted session');assert.equal(h.browserStore.get('probe'),'new-login-marker');assert.ok((await h.client.auth.getSession()).data.session);await h.client.auth.signOut();
});
for(const code of['bad_jwt','session_not_found'])test('late resume '+code+' before same-account token refresh cannot clear the refreshed session',async()=>{
 const hook={},state={value:'before-refresh'},h=harness({userHook:hook,tokenState:state});await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});
 let release,entered;const started=new Promise(r=>entered=r);hook.run=()=>{hook.run=null;entered();return new Promise(r=>release=r);};const pending=h.resume();await started;state.value='after-refresh';assert.equal((await h.client.auth.refreshSession()).error,null);h.browserStore.set('probe','refreshed-marker');const current=h.slots.get('session');release(rejectedUser(code));await pending;await drain();assert.equal(h.slots.get('session')===current,true,'An obsolete user response must not alter the new encrypted session');assert.equal(h.browserStore.get('probe'),'refreshed-marker');await h.client.auth.signOut();
});
for(const code of['bad_jwt','session_not_found'])test('current resume '+code+' still signs out and purges the current private data',async()=>{
 const hook={},h=harness({userHook:hook});await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});h.browserStore.set('probe','current-private-data');hook.run=()=>{hook.run=null;return rejectedUser(code);};await h.resume();await drain();assert.equal(h.slots.size,0);assert.equal(h.browserStore.size,0);
});
test('a delayed old sign-out cannot purge a later login or its update probe',async()=>{
 const hook={},state={value:'old'},h=harness({clearHook:hook,tokenState:state});await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});
 let release,entered;const started=new Promise(r=>entered=r);hook.run=()=>{hook.run=null;entered();return new Promise(r=>release=()=>{h.slots.clear();r();});};const out=h.client.auth.signOut();await started;state.value='new';const login=h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'}).then(result=>{assert.equal(result.error,null);h.browserStore.set('probe','after-new-login');});await drain();release();await Promise.all([out,login]);assert.ok(h.slots.has('session'));assert.equal(h.browserStore.get('probe'),'after-new-login');await h.client.auth.signOut();
});
test('a current getUser verifies a session restored in a fresh SDK instance',async()=>{
 const a=harness();await a.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});const b=harness({slots:a.slots,browserStore:a.browserStore});const result=await b.client.auth.getUser();assert.equal(result.error,null);assert.equal(result.data.user.id,'00000000-0000-4000-8000-000000000005');await b.client.auth.signOut();
});
test('an old SDK instance cannot purge the new vault or update probe after recreation',async()=>{
 const hook={},state={value:'activity-before'},a=harness({userHook:hook,tokenState:state});await a.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});
 let release,entered;const started=new Promise(r=>entered=r);hook.run=()=>{hook.run=null;entered();return new Promise(r=>release=r);};const pending=a.resume();await started;
 const b=harness({slots:a.slots,browserStore:a.browserStore,tokenState:{value:'activity-after'}});assert.equal((await b.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'})).error,null);b.browserStore.set('mir_update_probe','RECETTE-PHASE11-LOCAL');const current=b.slots.get('session');release(rejectedUser('session_not_found'));await pending;await drain();assert.equal(b.slots.get('session')===current,true,'Old activity cannot clear the new encrypted session');assert.equal(b.browserStore.get('mir_update_probe'),'RECETTE-PHASE11-LOCAL');assert.equal((await b.client.auth.getUser()).error,null);await a.client.auth.stopAutoRefresh();await b.client.auth.signOut();
});
test('all public getUser reads reject an obsolete result before changing private state',async()=>{
 const hook={},state={value:'public-before'},h=harness({userHook:hook,tokenState:state});await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});
 let release,entered;const started=new Promise(r=>entered=r);hook.run=()=>{hook.run=null;entered();return new Promise(r=>release=r);};const pending=h.client.auth.getUser();await started;state.value='public-after';await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});h.browserStore.set('probe','current');release(rejectedUser('session_not_found'));const result=await pending;assert.equal(result.error.code,'SESSION_CHANGED');assert.ok(h.slots.has('session'));assert.equal(h.browserStore.get('probe'),'current');await h.client.auth.signOut();
});


test('old Activity RPC refusal preserves the replacement Activity vault and update probe',async()=>{
 const hook={},a=harness({accountHook:hook,tokenState:{value:'activity-rpc-before'}});
 await a.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});
 let release,entered;const started=new Promise(r=>entered=r);
 hook.run=()=>{hook.run=null;entered();return new Promise(r=>release=r);};
 const pending=a.client.rpc('mir_portal_snapshot');await started;
 const b=harness({slots:a.slots,browserStore:a.browserStore,tokenState:{value:'activity-rpc-after'}});
 await b.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});
 b.browserStore.set('mir_update_probe','RECETTE-PHASE11-LOCAL');const current=b.slots.get('session');
 release(new Response(JSON.stringify({code:'42501',message:'Old activity account denied'}),{status:401,headers:{'content-type':'application/json'}}));
 const result=await pending;await drain();
 const preserved=b.slots.get('session')===current,probe=b.browserStore.get('mir_update_probe')==='RECETTE-PHASE11-LOCAL';
 assert.equal(result.error.code,'SESSION_CHANGED');
 await a.client.auth.stopAutoRefresh();await b.client.auth.signOut();
 assert.equal(preserved,true);assert.equal(probe,true);
});
for(const status of[401,403])test('a current denied account RPC still purges the current vault: '+status,async()=>{
 const hook={},h=harness({accountHook:hook});await h.client.auth.signInWithPassword({email:'employee@example.invalid',password:'local-password'});h.browserStore.set('probe','private');hook.run=()=>{hook.run=null;return new Response(JSON.stringify({code:'42501',message:'Current account denied'}),{status,headers:{'content-type':'application/json'}});};assert.equal((await h.client.rpc('mir_portal_snapshot')).error.code,'42501');assert.equal(h.slots.size,0);assert.equal(h.browserStore.size,0);
});
test('a queued RPC refusal is revalidated after an earlier queued login completes',async()=>{
 let listener,session={user:{id:'actor-a'},access_token:'token-a'},vault='token-a',denyNext=true,release,entered;
 const browserStore=new Map(),started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const emit=async(event,value)=>listener?.(event,value);
 const auth={onAuthStateChange:fn=>(listener=fn,{}),getSession:async()=>({data:{session}}),setSession:async()=>{entered();await gate;return{error:null};},signOut:async()=>{session=null;await emit('SIGNED_OUT',null);return{error:null};},signInWithPassword:async()=>{session={user:{id:'actor-b'},access_token:'token-b'};vault='token-b';browserStore.set('probe','new-b');await emit('SIGNED_IN',session);return{data:{session},error:null};}};
 const rawClient={auth,rpc:async name=>{assert.equal(name,'mir_account_snapshot');if(denyNext){denyNext=false;return{data:null,error:{status:401,code:'42501'}};}return{data:{role:'employee'}};}};
 const context=vm.createContext({navigator:{locks:sharedLocksFor(new Map())},require:()=>Flow,localStorage:{clear:()=>browserStore.clear()},sessionStorage:{clear(){}},indexedDB:{databases:async()=>[]},window:{MIRAndroid:{Policy,Native:{readAuth:async()=>({value:vault}),clearAuth:async()=>{vault=null;}}},MIRTeamTestConfig:{},MIRSupabase:{createClient:()=>rawClient}}});
 vm.runInContext(fs.readFileSync(path.join(root,'mobile/web/sdk.js'),'utf8'),context);
 const client=context.window.MIRSupabase.createClient(Flow.PROJECT,'sb_publishable_test');await emit('SIGNED_IN',session);
 const occupied=client.auth.setSession({access_token:'token-a'});await started;
 const login=client.auth.signInWithPassword({email:'b@example.invalid',password:'local-password'});
 const refused=client.rpc('mir_portal_snapshot');await new Promise(r=>setImmediate(r));release();await occupied;assert.equal((await login).error,null);assert.equal((await refused).error.code,'SESSION_CHANGED');assert.equal(session.user.id,'actor-b');assert.equal(vault,'token-b');assert.equal(browserStore.get('probe'),'new-b');
});
test('missing shared Web Locks refuses native Auth instead of using an unsafe local fallback',()=>{
 assert.throws(()=>harness({locks:null}),error=>error.code==='ANDROID_AUTH_LOCK_UNAVAILABLE'&&/Android System WebView/.test(error.message));
});
for(const stage of['before-delete','after-delete'])test('two Activities serialize a new login across Native clear '+stage,async()=>{
 const accountHook={},clearHook={},a=harness({accountHook,clearHook,tokenState:{value:'activity-a'}});await a.client.auth.signInWithPassword({email:'a@example.invalid',password:'local-password'});const before=a.nativeClears();
 let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 clearHook.run=async()=>{clearHook.run=null;if(stage==='after-delete')a.slots.clear();entered();await gate;if(stage==='before-delete')a.slots.clear();};
 accountHook.run=()=>{accountHook.run=null;return new Response(JSON.stringify({code:'42501',message:'Current A denied'}),{status:401,headers:{'content-type':'application/json'}});};
 const refused=a.client.rpc('mir_portal_snapshot');await started;
 const b=harness({slots:a.slots,browserStore:a.browserStore,tokenState:{value:'activity-b'}});let loggedIn=false;
 const login=b.client.auth.signInWithPassword({email:'b@example.invalid',password:'local-password'}).then(result=>{assert.equal(result.error,null);loggedIn=true;b.browserStore.set('mir_update_probe','B survives');});
 await drain();assert.equal(loggedIn,false,'Replacement Activity must wait for the old native callback');assert.equal(b.requests.some(url=>url.includes('grant_type=password')),false,'No replacement session is written before the shared lock is released');
 release();await Promise.all([refused,login]);assert.equal(a.nativeClears(),before+1,'Supabase removal is not followed by a second native clear');assert.ok(b.slots.has('session'));assert.equal(b.browserStore.get('mir_update_probe'),'B survives');await a.client.auth.stopAutoRefresh();await b.client.auth.signOut();
});
