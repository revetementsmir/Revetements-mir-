const {test}=require('node:test'),assert=require('node:assert/strict');const {create}=require('../dist/mir-shared-client.js');
test('Coupure après commit : même référence conservée, pas de doublon',async()=>{
 const entries=new Map(),calls=[];let fail=true;
 const sdk={auth:{getUser:async()=>({data:{user:{id:'client'}}})},rpc:async(name,p)=>{calls.push(p);if(fail)throw Error('network');return {data:'order-id'};}};
 const client=create({sdk,storage:{getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)}}),model={id:'model',revision:1},c={quantity:2};
 await assert.rejects(client.submit('org',model,c));assert.equal(entries.size,1);
 await assert.rejects(client.submit('org',model,{quantity:3}),/confirmation/);
 fail=false;assert.equal(await client.submit('org',model,c),'order-id');assert.equal(calls[0].request_id,calls[1].request_id);assert.equal(entries.size,0);
});
test('Aucune écriture réseau si la sauvegarde du brouillon échoue',async()=>{
 let calls=0;const client=create({sdk:{auth:{getUser:async()=>({data:{user:{id:'user'}}})},rpc:async()=>{calls++;}},storage:{getItem:()=>null,setItem:()=>{throw Error('quota');}}});
 await assert.rejects(client.submit('org',{id:'m',revision:1},{quantity:1}),/quota/);assert.equal(calls,0);
});
test('Le vrai fichier Exporter mes modèles est importable sans perdre les sources',()=>{
 const M=require('../dist/production-model.js'),B=require('../dist/template-library-backup.js'),{readModelBackup}=require('../dist/mir-shared-client.js');
 const t=M.createTemplate({kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2}},{id:'local-test',name:'Solin'}).template;
 const record={id:'local-test',name:'Solin',currentVersion:1,versions:[t]};
 const exported=B.create([record]);assert.equal(exported.ok,true);assert.equal(JSON.parse(exported.content).schema,'mir-template-library-backup-1');
 const rows=readModelBackup(exported.content,B);assert.equal(rows.length,1);assert.deepEqual(rows[0].versions,[t]);
 const raw={...record,commercial:{priceCentsByMetal:{aluminium:2500,acier:3000}},noteSource:'à conserver'};
 assert.deepEqual(readModelBackup(JSON.stringify({version:1,records:[raw]}),B),[raw]);
 assert.throws(()=>readModelBackup(JSON.stringify({schema:'inconnu',records:[record]}),B));
 assert.throws(()=>readModelBackup(JSON.stringify({version:1,records:[{...record,currentVersion:99}]}),B));
});
