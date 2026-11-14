'use strict';
// Uses the ephemeral QA employee created by the hosted enrollment recipe.
// Native Keystore is simulated here; the Auth SDK and TEST backend are real.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const Flow=require('../web/auth-flow.cjs'),Policy=require('../web/policy.cjs'),root=path.resolve(__dirname,'../..'),dir=path.join(root,'artifacts/employee-auth-audit/hosted'),allState=JSON.parse(fs.readFileSync(path.join(dir,'.private-qa-session.json'),'utf8')),state=process.argv.includes('--web-qa')?allState.webActivation:allState;
function sdk(slots=new Map()){
 const local=new Map([['private-marker','QA']]);
 const Native={readAuth:async({slot='session'}={})=>({value:slots.get(slot)}),writeAuth:async({slot='session',value})=>slots.set(slot,value),removeAuthSlot:async({slot})=>slots.delete(slot),clearAuth:async()=>slots.clear()};
 const c=vm.createContext({navigator:{locks:require('./auth-lock-test-helper.cjs').sharedLocksFor(slots)},console,URL,URLSearchParams,TextEncoder,TextDecoder,crypto:webcrypto,Headers,Request,Response,AbortController,WebSocket,Buffer,btoa,atob,setTimeout,clearTimeout,setInterval,clearInterval,require:()=>Flow,localStorage:{clear:()=>local.clear()},sessionStorage:{clear(){}},indexedDB:{databases:async()=>[]},fetch:async(input,init)=>{const u=new URL(String(input));assert.equal(u.origin,Flow.PROJECT,'TEST backend only');assert.equal(Policy.allowedRequest(u.href),true);return fetch(u,init);}});
 c.window={MIRAndroid:{Native,Policy},MIRTeamTestConfig:{googleEnabled:false,recoveryEnabled:false,teamInvitationsEnabled:true,teamEnrollmentEnabled:true}};
 vm.runInContext(fs.readFileSync(path.join(root,'dist/vendor/supabase-client.js'),'utf8'),c);c.window.MIRSupabase=c.MIRSupabase;vm.runInContext(fs.readFileSync(path.join(root,'mobile/web/sdk.js'),'utf8'),c);
 return{slots,local,client:c.window.MIRSupabase.createClient(Flow.PROJECT,'sb_publishable_jk8zsTWqQi6Borv44aaDJw_k7JSbzZh',{auth:{autoRefreshToken:false}})};
}
(async()=>{const first=sdk();const result=await first.client.auth.signInWithPassword({email:state.email,password:state.password});
 if(process.argv.includes('--disabled')){assert.equal(result.error?.code,'42501');assert.equal(first.slots.size,0);console.log('PASS hosted TEST + native JS adapter: disabled role refused, encrypted-slot simulation purged; no physical Android claim.');return;}
 assert.equal(result.error,null);
 if(process.argv.includes('--hold-for-revocation')){
  assert.ok(first.slots.has('session'));first.local.set('private-document','QA');console.log('READY hosted QA session established; waiting for TEST-only role revocation');
  await new Promise(resolve=>{const reader=require('node:readline').createInterface({input:process.stdin});reader.once('line',()=>{reader.close();process.stdin.pause();resolve();});});
  const r=await first.client.rpc('mir_portal_snapshot');assert.equal(r.error?.code,'42501');assert.equal(first.slots.size,0);assert.equal(first.local.size,0);
  fs.writeFileSync(path.join(dir,'running-session-revocation.json'),JSON.stringify({projectRef:Policy.TEST,auth:'real hosted TEST',sdk:'bundled/native JS adapter',nativeVault:'simulated slots',runningSessionPurgedAfterRoleRevocation:true,emailSent:false,physicalDevice:false},null,2)+'\n');console.log('PASS hosted running APK adapter session: role revocation denied next business RPC and purged session/private cache.');return;
 }
 assert.ok(first.slots.has('session'));assert.equal(first.local.size,0);assert.equal((await first.client.rpc('mir_account_snapshot')).data.role,'employee');
 const second=sdk(first.slots),user=await second.client.auth.getUser();assert.equal(user.data.user.id,state.userId);assert.equal((await second.client.rpc('mir_account_snapshot')).data.role,'employee');await second.client.auth.signOut();assert.equal(first.slots.size,0);assert.equal(second.local.size,0);
 fs.writeFileSync(path.join(dir,'native-adapter.json'),JSON.stringify({projectRef:Policy.TEST,auth:'real hosted TEST',sdk:'bundled SDK and native JS adapter',nativeVault:'simulated encrypted slots',persistentAcrossSdkRestart:true,signOutPurges:true,physicalDevice:false,emailSent:false,productionRequests:false},null,2)+'\n');
 console.log('PASS hosted TEST + native JS adapter: password, role revalidation, persistent restart, logout and private purge; Keystore simulated, not physical Android.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
