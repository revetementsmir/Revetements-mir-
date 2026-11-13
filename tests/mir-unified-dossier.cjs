'use strict';
/* MIR — contrats lecture uniquement, lien de projet explicite et export sans double stockage. */
const assert=require('node:assert/strict');
const U=require('../dist/mir-unified-client-dossier.js');
let passed=0;
function test(name,run){run();passed++;console.log('PASS '+name);}
const material={materialId:'hardie-test',brand:'James Hardie',name:'Clin test',colorName:'Gris test',quantity:55,unit:'pi²'};
const piece={id:'M001',kind:'profile',spec:{kind:'profile',name:'Solin de fenêtre',quantity:2,finish:{code:'NOIR'},material:{type:'aluminium'}},
 snapshot:{schema:'mir-production-instance-1',templateVersion:1,revision:1,geometry:{segments:[{label:'A',lengthMM:88.9}]}}};
const make=(m={version:1,project:'Chalet de Québec',items:[material]},p={version:1,order:{id:'DOS-1',project:'Chalet de Québec',items:[piece]}})=>{
 const map=new Map([[U.KEYS.materials,JSON.stringify(m)],[U.KEYS.pieces,JSON.stringify(p)]]);
 return {map,getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
};
test('Une lecture commune ne crée pas de troisième sauvegarde ni ne modifie les données',()=>{
 const s=make(),before=[...s.map.entries()],state=U.read(s);
 assert.equal(state.ready,true);assert.equal(state.link,'ready');
 assert.deepEqual(state.materials,[material]);assert.deepEqual(state.pieces,[piece]);
 assert.deepEqual([...s.map.entries()],before);
});
test('Une sauvegarde JSON conserve les cotes, le modèle versionné et le refus d’envoi',()=>{
 const state=U.read(make()),data=U.payload(state,'2026-11-06T00:00:00.000Z');
 assert.equal(data.schema,'mir-unified-client-dossier-1');
 assert.equal(data.localOnly,true);assert.equal(data.transmitted,false);
 assert.equal(data.status,'preparation_locale_non_commandee');
 assert.equal(data.materials.items[0].quantity,55);
 assert.equal(data.pieces.order.items[0].snapshot.geometry.segments[0].lengthMM,88.9);
 assert.equal(data.createdAt,'2026-11-06T00:00:00.000Z');
});
test('Le PDF reprend les pages des moteurs existants, jamais de nouveaux faux développés',()=>{
 const a=[],state=U.read(make());
 const opt=U.pdfOptions(state,{selectionPDF:{buildOptions:args=>{a.push('material');assert.equal(args.project,state.project);return {faces:[{name:'Matériaux',svg:'<svg/>'}]};}},
 production:{productionPages:args=>{a.push('pieces');assert.equal(args.items[0].schema,'mir-production-instance-1');return [{name:'Moulure cotée',svg:'<svg/>'}];}}});
 assert.deepEqual(a,['material','pieces']);assert.equal(opt.faces.length,2);
 assert.match(opt.filename,/^MIR-dossier-complet-Chalet-de-Quebec\.pdf$/);
});
test('Deux projets nommés différemment ne sont jamais fusionnés automatiquement',()=>{
 const s=make(undefined,{version:1,order:{project:'Autre chantier',items:[piece]}}),state=U.read(s);
 assert.equal(state.link,'conflict');assert.equal(state.ready,false);
 assert.throws(()=>U.payload(state),/projet cohérent/);
 assert.equal(U.associate(s,state),false);
});
test('Une association autorisée ne change que le nom du dossier existant',()=>{
 const s=make(undefined,{version:1,order:{id:'DOS-1',project:'',revision:'A',items:[piece]}}),state=U.read(s);
 assert.equal(state.link,'associate-pieces');assert.equal(state.ready,false);
 const storedBefore=JSON.parse(s.getItem(U.KEYS.pieces));
 assert.equal(U.associate(s,state),true);
 const updated=JSON.parse(s.getItem(U.KEYS.pieces));
 assert.equal(updated.order.project,'Chalet de Québec');
 assert.deepEqual(updated.order.items,storedBefore.order.items);
 assert.equal(updated.order.id,'DOS-1');
 assert.equal(U.read(s).ready,true);
 assert.equal(s.map.size,2,'aucune troisième clé');
});
test('Une sélection non nommée propose un nom, sans modification automatique',()=>{
 const s=make({version:1,project:'',items:[material]}),state=U.read(s);
 assert.equal(state.link,'associate-materials');
 assert.equal(U.associate(s,state),false);
 assert.equal(JSON.parse(s.getItem(U.KEYS.materials)).project,'');
});
test('Une référence masquée ne rejoint pas un export à partir de l’écran sélection',()=>{
 const s=make({version:1,project:'Chalet de Québec',items:[material,{...material,materialId:'hidden'}]});
 const state=U.read(s,{allowedMaterialIndices:[0]});
 assert.equal(state.materials.length,1);assert.equal(state.excludedMaterials,1);
 assert.equal(U.payload(state).materials.excludedCount,1);
});
test('L’ancien formulaire rapide bloque un faux dossier complet sans effacer son historique',()=>{
 const s=make();s.setItem('mir-bending-v1',JSON.stringify({version:1,items:[{profile:'l'}]}));
 const original=s.getItem('mir-bending-v1'),state=U.read(s);
 assert.equal(state.legacyCount,1);assert.equal(state.ready,false);
 assert.throws(()=>U.pdfOptions(state),/projet|Vérifiez/);
 assert.equal(s.getItem('mir-bending-v1'),original);
});
test('Données illisibles, inconnues et dossiers vides : aucune perte silencieuse',()=>{
 const s=make();s.setItem(U.KEYS.materials,'{"');
 assert.equal(U.read(s).ready,false);
 s.setItem(U.KEYS.materials,'{"version":99,"items":[]}');
 assert.equal(U.read(s).ready,false);
 const empty={getItem:()=>null};assert.equal(U.read(empty).ready,false);
});
console.log('MIR dossier commun : '+passed+'/'+passed+' contrats réussis');