'use strict';
const assert=require('node:assert/strict'),Portal=require('../dist/portal-client.js'),config=require('./mir-account-config-helper.cjs')();
const user={id:'00000000-0000-4000-8000-000000000004',email:'employe@example.test'},org='00000000-0000-4000-8000-000000000010';
const base={mode:'connected',demo:false,actorId:user.id,members:[{id:user.id,name:'Employé MIR',role:'employee',active:true}],jobs:[],planVersions:[],catalogue:[],orders:[],deliveries:[],movements:[],inventory:{},favorites:{}};
const sdk={auth:{getUser:async()=>({data:{user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},async rpc(name){
 if(name==='mir_account_snapshot')return{data:{userId:user.id,role:'employee',organizationId:org}};
 if(name==='mir_portal_snapshot')return{data:base};
 if(name==='mir_employee_operations_snapshot')return{data:{role:'employe'}};
 if(name==='mir_messaging_snapshot')return{data:{contacts:[],teams:[],conversations:[],messages:[]}};
 if(name==='mir_punch_snapshot')return{error:{code:'PGRST202',message:'routine missing'}};
 throw Error('unexpected rpc '+name);
}};
(async()=>{const client=Portal.create({config,origin:config.siteOrigin,sdk:{createClient:()=>sdk}});await client.start();const status=client.getStatus();assert.equal(status.phase,'ready');assert.equal(status.snapshot.punch.enabled,false);assert.equal(status.snapshot.punch.unavailable,true);assert.equal(status.error,null);client.dispose();console.log('Portail: module Punch absent traité comme désactivé sans masquer les autres erreurs OK');})().catch(error=>{console.error(error);process.exitCode=1});
