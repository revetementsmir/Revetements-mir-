'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Auth=require('../dist/portal-client.js'),config=require('./mir-account-config-helper.cjs')();
test('offline punch is scoped to verified account/organization; legacy input is never adopted or erased',async()=>{
 const oldNav=Object.getOwnPropertyDescriptor(globalThis,'navigator'),oldStorage=globalThis.localStorage;
 const values=new Map([['mir_punch_queue_v1',JSON.stringify([{id:'legacy-unknown-owner',action:'in'}])]]);globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 let user={id:'employee-a',email:'a@example.invalid'},listener,calls=0;
 const org='00000000-0000-4000-8000-000000000010';
 const sdk={auth:{getUser:async()=>({data:{user}}),onAuthStateChange:fn=>(listener=fn,{}),signOut:async()=>{user=null;listener('SIGNED_OUT',null);return{};}},rpc:async name=>{
  if(name==='mir_account_snapshot')return{data:{userId:user.id,role:'employee',organizationId:org}};
  if(name==='mir_portal_snapshot')return{data:{mode:'connected',demo:false,actorId:user.id,members:[{id:user.id,role:'employee',active:true}],jobs:[],planVersions:[],catalogue:[],orders:[],deliveries:[],movements:[],inventory:{},favorites:{}}};
  if(name==='mir_punch_snapshot')return{data:{settings:{offlineEnabled:true}}};
  if(name==='mir_punch_action'){calls++;return{error:{code:'NETWORK_UNCERTAIN',definitive:false}};}return{data:[]};
 }};
 const client=Auth.create({config,origin:config.siteOrigin,sdk:{createClient:()=>sdk},uuid:()=> '00000000-0000-4000-8000-000000000020'});
 try{
  await client.start();await client.punchAction('in');const owned=[...values.keys()].find(k=>k.startsWith('mir_punch_queue_v2_'));assert.ok(owned.endsWith('_employee-a'));assert.equal(JSON.parse(values.get(owned))[0].actor,'employee-a');
  user={id:'employee-b',email:'b@example.invalid'};await client.refresh();const before=calls;assert.equal(await client.syncPunchQueue(),0);assert.equal(calls,before);assert.equal(JSON.parse(values.get(owned)).length,1);assert.ok(values.has('mir_punch_queue_v1'));
  await client.signOut();assert.equal(await client.syncPunchQueue(),0);assert.equal(calls,before);
 }finally{client.dispose();if(oldNav)Object.defineProperty(globalThis,'navigator',oldNav);else delete globalThis.navigator;globalThis.localStorage=oldStorage;}
});
