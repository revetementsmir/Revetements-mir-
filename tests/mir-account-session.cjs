'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Auth=require('../dist/portal-client.js'),config=require('./mir-account-config-helper.cjs')();
test('A verified identity change clears the first customer before the next snapshot resolves',async()=>{
 let user={id:'client-a',email:'a@example.invalid'},resolveSnapshot,hold=false;
 const client=Auth.create({config,origin:config.siteOrigin,sdk:{createClient:()=>({auth:{getUser:async()=>({data:{user}}),onAuthStateChange:()=>({})},rpc:async()=>{const id=user.id;if(hold)await new Promise(resolve=>resolveSnapshot=resolve);return {data:{userId:id,role:'client',orders:[{id:'private-'+id}],addresses:[]}};}})}});
 await client.start();assert.equal(client.getStatus().account.userId,'client-a');const observations=[];client.subscribe(s=>observations.push(s));user={id:'client-b',email:'b@example.invalid'};hold=true;const pending=client.refresh();await new Promise(r=>setImmediate(r));assert.equal(client.getStatus().account,null);assert.equal(client.getStatus().phase,'loading');resolveSnapshot();await pending;assert.equal(client.getStatus().account.userId,'client-b');assert.equal(observations.some(s=>s.user?.id==='client-b'&&s.account?.userId==='client-a'),false);client.dispose();
});
test('A pending account read cannot restore private data after sign out',async()=>{
 let listener,resolveSnapshot,hold=false,user={id:'client-a',email:'a@example.invalid'};
 const sdk={auth:{getUser:async()=>({data:{user}}),onAuthStateChange:fn=>(listener=fn,{}),signOut:async()=>{user=null;listener('SIGNED_OUT');return {}}},rpc:async()=>{if(hold)await new Promise(r=>resolveSnapshot=r);return {data:{userId:'client-a',role:'client',orders:[{id:'private'}],addresses:[]}};}};
 const client=Auth.create({config,origin:config.siteOrigin,sdk:{createClient:()=>sdk}});await client.start();hold=true;const pending=client.refresh();await new Promise(r=>setImmediate(r));await client.signOut();resolveSnapshot();await pending;assert.equal(client.getStatus().phase,'signed_out');assert.equal(client.getStatus().account,null);client.dispose();
});
function userReadRace(){
 let user={id:'account-a'},listener,release,hold=false;const scheduled=[];
 const sdk={auth:{getUser:async()=>{if(hold){hold=false;return new Promise(r=>release=r);}return{data:{user}};},onAuthStateChange:fn=>(listener=fn,{}),signInWithPassword:async()=>{user={id:'account-b'};listener('SIGNED_IN',{user});return{data:{user},error:null};},signOut:async()=>{user=null;listener('SIGNED_OUT');return{error:null};}},rpc:async()=>({data:{userId:user.id,role:'client',orders:[],addresses:[]}})};
 const client=Auth.create({config,origin:config.siteOrigin,sdk:{createClient:()=>sdk},schedule:fn=>scheduled.push(fn)});
 return{client,hold:()=>hold=true,release:result=>release(result)};
}
for(const result of[{data:{user:null},error:{status:401,name:'AuthApiError'}},{data:{user:null},error:{status:403,name:'AuthApiError'}},{data:{user:null},error:null}])test('A late missing/denied user read cannot clear the next verified account: '+(result.error?.status||'missing'),async()=>{
 const f=userReadRace();try{await f.client.start();f.hold();const stale=f.client.refresh();await new Promise(r=>setImmediate(r));await f.client.signInPassword('b@example.invalid','local-password');assert.equal(f.client.getStatus().phase,'customer_ready');f.release(result);await stale;assert.equal(f.client.getStatus().phase,'customer_ready');assert.equal(f.client.getStatus().account.userId,'account-b');}finally{f.client.dispose();}
});
test('A late denied user read cannot clear a more recent read of the same account',async()=>{
 const f=userReadRace();try{await f.client.start();f.hold();const stale=f.client.refresh();await new Promise(r=>setImmediate(r));await f.client.refresh();f.release({data:{user:null},error:{status:401,name:'AuthApiError'}});await stale;assert.equal(f.client.getStatus().phase,'customer_ready');assert.equal(f.client.getStatus().account.userId,'account-a');}finally{f.client.dispose();}
});
test('A current denied user read still clears the current private account',async()=>{
 const f=userReadRace();try{await f.client.start();f.hold();const current=f.client.refresh();await new Promise(r=>setImmediate(r));f.release({data:{user:null},error:{status:401,name:'AuthApiError'}});await current;assert.equal(f.client.getStatus().phase,'signed_out');assert.equal(f.client.getStatus().account,null);assert.equal(f.client.getStatus().user,null);}finally{f.client.dispose();}
});
