'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../dist/mir-local-backup.js');
const crypto=require('node:crypto').webcrypto;
const raw=' {"version":1,"records":[{"id":"profile","versions":[{"version":1,"dimensions":{"A":"1 1/2"}}]}]} ';
const map=new Map([[B.KEYS[0],raw],['sb-auth-token','never export']]);
const storage={getItem:k=>map.get(k)??null,setItem(){throw Error('Unexpected write');},removeItem(){throw Error('Unexpected delete');}};
test('Capture exacte, clés explicites et aucun secret exporté',()=>{const b=B.capture(storage);assert.equal(b.entries.length,1);assert.equal(b.entries[0].raw,raw);assert.equal(map.size,2);});
test('Refus des formats inconnus, données corrompues et doublons',()=>{
  for(const value of ['null','[]','{','{"version":2,"records":[]}','{"version":1,"records":[{"id":"x"},{"id":"x"}]}'])assert.throws(()=>B.validateValue(B.KEYS[0],value));
  const b=B.capture(storage);b.entries.push(b.entries[0]);assert.throws(()=>B.validate(b));
  assert.throws(()=>B.validateValue('sb-auth-token','{}'));
});
test('Anciens bons conservés et ajouts directs sans modèle acceptés',()=>{
  B.validateValue('mir_production_admin_orders_v1','[{"id":"old","items":[{"id":"line","spec":{"dimensions":{"A":"1/2"}}}]}]');
  B.validateValue('mir_production_admin_dossier_v1','{"version":1,"order":{"items":[{"id":"direct","spec":{"kind":"profile"}}]}}');
});
test('Empreinte stable, changement détecté et comparaison sans écrasement',async()=>{
  const b=B.capture(storage),hash=await B.checksum(b,crypto);assert.match(hash,/^[a-f0-9]{64}$/);
  assert.deepEqual(B.reconcile(storage,b),[{key:B.KEYS[0],state:'unchanged'}]);
  assert.equal(B.reconcile({getItem:()=>null},b)[0].state,'missing');
  assert.equal(B.reconcile({getItem:()=>'{changed}'},b)[0].state,'conflict');
  const other=structuredClone(b);other.entries[0].raw=raw+' ';assert.notEqual(await B.checksum(other,crypto),hash);
});
test('Staging attend la confirmation et propage le refus serveur',async()=>{
  const backup=B.capture(storage);let received;
  const client={schema(s){assert.equal(s,'mir_core');return {async rpc(name,payload){received={name,payload};return {data:'batch-1',error:null};}};}};
  assert.deepEqual(await B.stage(client,'org',backup),{batchId:'batch-1',state:'staged'});
  assert.equal(received.name,'stage_local_backup');assert.equal(received.payload.payload,backup);
  await assert.rejects(B.stage({schema:()=>({rpc:async()=>({error:{message:'Admin requis'}})})},'org',backup),/Admin requis/);
  assert.equal(map.get(B.KEYS[0]),raw);
});
