'use strict';
const assert=require('node:assert/strict'),M=require('../dist/production-model.js'),B=require('../dist/template-library-backup.js'),{save}=require('../dist/mir-direct-model-save.js');
(async()=>{
 const t=M.createTemplate({kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2}},{id:'direct-test',name:'Moulure directe'}).template;
 const record={id:t.id,name:t.name,currentVersion:1,versions:[t]};let uploads=0,catalogue=[];
 const client={async memberships(){return [{id:'org',role:'admin'}];},async snapshot(){return {role:'admin',catalogue};},async importMaster(org,r){uploads++;assert.equal(org,'org');assert.deepEqual(r,record);catalogue=[{id:'shared-id',version:1,specification:{template:t}}];return 'shared-id';}};
 const run=()=>save({client,record,validator:B});
 await assert.rejects(save({client,record:{},validator:B}));assert.equal(uploads,0);
 assert.deepEqual(await run(),{id:'shared-id',alreadySaved:false});
 assert.deepEqual(await run(),{id:'shared-id',alreadySaved:true});assert.equal(uploads,1,'retry must not create another master');
 catalogue[0].version=2;await assert.rejects(run(),/autre version/);assert.equal(uploads,1);
 catalogue=[];const employee={...client,async memberships(){return [{id:'org',role:'employee'}];}};await assert.rejects(save({client:employee,record,validator:B}),/Admin/);assert.equal(uploads,1);
 const denied={...client,async snapshot(){return {role:'employee',catalogue:[]};}};await assert.rejects(save({client:denied,record,validator:B}),/Admin/);
 const disconnected={...client,async importMaster(){throw Error('Réseau indisponible');}};await assert.rejects(save({client:disconnected,record,validator:B}),/Réseau/);assert.deepEqual(record.versions,[t],'source record unchanged after error');
 console.log('PASS : sauvegarde directe validée, permissions Admin, reprise sans doublon, conflit conservé, erreur réseau explicite');
})().catch(e=>{console.error(e);process.exitCode=1;});
