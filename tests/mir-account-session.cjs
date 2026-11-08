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
