'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../dist/chantier-app.js'),'utf8');
const start=source.indexOf('  function mergeFieldMetadata('),end=source.indexOf('\n  function ',start+1);
assert.ok(start>=0&&end>start);
const context=vm.createContext({});vm.runInContext(source.slice(start,end),context);
const merge=context.mergeFieldMetadata;
const id='89000000-0000-4000-8000-000000000011';
const completed=()=>({id,name:'Chantier confirmé',number:'855',address:'85 rue Confirmée',city:'Québec',phone:'4185550100',clientName:'Client confirmé',closed:false,temporary:false,detailsStatus:'complete',teamId:'89000000-0000-4000-8000-000000000021',teamAssigned:true,revision:2});
test('une réponse dossier retardée ne rétablit pas la fiche provisoire après complétion',async()=>{
 let finish;const delayed=new Promise(resolve=>finish=resolve),target=completed(),before=JSON.stringify(target);
 const request=delayed.then(rich=>merge(target,rich));
 finish({id,name:'Repère avant complétion',number:'',address:'Adresse provisoire',city:'',closed:false,temporary:true,detailsStatus:'pending_details',teamId:null,teamAssigned:false,revision:1});
 assert.equal(await request,false);assert.equal(JSON.stringify(target),before);
});
test('une source sans révision ne peut écraser les métadonnées du DTO versionné',()=>{
 const target=completed(),before=JSON.stringify(target);
 assert.equal(merge(target,{id,name:'Ancien libellé',address:'Ancienne adresse',closed:true}),false);
 assert.equal(JSON.stringify(target),before);
});
test('le cache plus récent enrichit aussi un nouveau snapshot plus ancien',()=>{
 const rich=completed(),target={...rich,name:'Ancien repère',address:'Ancienne adresse',temporary:true,detailsStatus:'pending_details',revision:1};
 assert.equal(merge(target,rich,true),true);assert.deepEqual(target,rich);
});
test('la mise à jour suivante garde la même fiche et les champs historiques hors métadonnées',()=>{
 const target={...completed(),assignedMemberIds:['89000000-0000-4000-8000-000000000001'],punchReference:'même chantier'};
 assert.equal(merge(target,{...completed(),name:'Nom corrigé par le bureau',revision:3}),true);
 assert.equal(target.id,id);assert.equal(target.name,'Nom corrigé par le bureau');assert.equal(target.revision,3);
 assert.equal(target.punchReference,'même chantier');assert.deepEqual(target.assignedMemberIds,['89000000-0000-4000-8000-000000000001']);
});
test('les chantiers historiques sans DTO versionné conservent leur enrichissement habituel',()=>{
 const target={id,name:'Nom existant'};
 assert.equal(merge(target,{id,name:'Nom du dossier',address:'50 rue Historique',closed:false}),true);
 assert.equal(target.name,'Nom du dossier');assert.equal(target.address,'50 rue Historique');assert.equal(target.closed,false);
});
