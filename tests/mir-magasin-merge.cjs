'use strict';
/* Régression magasin MIR : source catalogue conservée, variantes sans fusion destructive,
 * commandes en données de démonstration et annotations JSON locales. */
const assert=require('node:assert/strict');
const Store=require('../dist/employee-store-model.js');
const Review=require('../dist/mir-store-review.js');
let tests=0;
function check(label,fn){fn();tests++;console.log('PASS '+label);}
const catalogue=Store.buildCatalogue([]);
const get=id=>catalogue.find(x=>x.id===id);
check('Ids de la passation conservés sans doublons',()=>{
 const ids=['mir-request-soffit-staples-1in','pending-kaycan-fascia-hex-quarter-inch',
 'mir-request-fascia-screws-black-2in','mir-request-fascia-screws-white-2in',
 'mir-request-adfast','canexel-joint-cedrvue-6','canexel-joint-cedrvue-9',
 'canexel-joint-ridgewood-d5-12','canexel-joint-vstyle-12'];
 ids.forEach(id=>assert.ok(get(id),id));assert.equal(new Set(catalogue.map(x=>x.id)).size,catalogue.length);
});
check('PRIME 40713, unité et conditionnement',()=>{
 const p=get('mir-request-soffit-staples-1in');
 assert.equal(p.manufacturerReference,'40713');assert.equal(p.unit,'boîte');
 assert.equal(p.packaging.piecesPerBox,5000);
});
check('ADSEAL remplace uniquement la fiche générique',()=>{
 const p=get('mir-request-adfast');
 assert.match(p.name,/ADSEAL/);assert.equal(p.unit,'contenant');
 assert.ok(p.referencePending);assert.match(p.sourceUrl,/lingettes-nettoyantes/);
});
check('Quatre demandes d’accessoires distinctes',()=>{
 ['mir-caulk-nozzle-45-5','mir-adfast-yellow-nozzles-5',
 'mir-caulk-sausage-nozzle','mir-bates-caulk-gun'].forEach(id=>assert.ok(get(id),id));
 assert.equal(get('mir-adfast-yellow-nozzles-5').packaging.piecesPerBox,5);
 assert.equal(get('mir-bates-caulk-gun').manufacturerReference,'FPMS001B351');
});
check('Joints Ced’R 6 et 9, D-5 et VStyle ne fusionnent pas',()=>{
 const ids=Review.CANEXEL_IDS;
 for(const id of ids)assert.ok(get(id));
 assert.equal(get(ids[0]).referencePending,true);
 const family=Review.present(catalogue,{demo:true});
 for(const id of ids)assert.ok(family.some(x=>x.id===id),id);
});
check('Une fiche fascia visible, source et variante noires conservées',()=>{
 const list=Review.present(catalogue,{demo:true});
 const group=list.find(x=>x.id==='mir-request-fascia-screws-black-2in');
 assert.ok(group);assert.equal(group.reviewVariants[0].label,'Noir');
 assert.equal(group.reviewVariants[1].label,'Blanc');
 assert.ok(!list.some(x=>x.id==='mir-request-fascia-screws-white-2in'));
 assert.ok(!list.some(x=>x.id==='pending-kaycan-fascia-hex-quarter-inch'));
 assert.ok(get('pending-kaycan-fascia-hex-quarter-inch'));
});
check('Panier fascia conserve l’itemId vrai de chaque teinte',()=>{
 const state={catalogue};
 const black=Store.configureLine(state,{itemId:'mir-request-fascia-screws-black-2in',quantity:1});
 const white=Store.configureLine(state,{itemId:'mir-request-fascia-screws-white-2in',quantity:1});
 assert.ok(black.ok);assert.ok(white.ok);
 assert.notEqual(black.line.stockKey,white.line.stockKey);
 assert.equal(black.line.colorName,'Noir');
 assert.equal(white.line.colorName,'Blanc');
});
check('Formats des rouleaux : 10/20/50/100 pi réellement distincts',()=>{
 const item=get('mir-coil-color-kaycan');
 assert.deepEqual(item.formats.map(x=>x.lengthIn),[120,240,600,1200]);
 const state={catalogue};
 assert.ok(!Store.configureLine(state,{itemId:item.id,quantity:1}).ok);
});
check('Boîte de 5 et pistolet à l’unité dans la demande',()=>{
 const state={catalogue};
 const five=Store.configureLine(state,{itemId:'mir-adfast-yellow-nozzles-5',quantity:2});
 const one=Store.configureLine(state,{itemId:'mir-bates-caulk-gun',quantity:1});
 assert.ok(five.ok);assert.ok(one.ok);
 assert.equal(five.line.unit,'paquet');assert.equal(one.line.unit,'pièce');
 assert.equal(five.line.packaging.piecesPerBox,5);assert.equal(one.line.quantity,1);
});
check('La présentation sans démo ne touche pas aux objets sources',()=>{
 const shown=Review.present(catalogue);
 assert.strictEqual(shown,catalogue);
 assert.equal(catalogue.filter(x=>Review.FASCIA_IDS.includes(x.id)).length,3);
});
check('Sélection de variante conserve itemId, colorId sans SKU inventé',()=>{
 const fake={dataset:{product:'mir-request-fascia-screws-black-2in'},
 querySelector:()=>({selectedOptions:[{dataset:{itemId:'mir-request-fascia-screws-white-2in',colorId:''}}]})};
 const selected=Review.selection(fake,get);
 assert.equal(selected.item.id,'mir-request-fascia-screws-white-2in');
 assert.equal(selected.item.sku,null);
});
check('Import et export JSON des 8 annotations',()=>{
 const data={schemaVersion:1,annotations:[{itemId:'mir-request-adfast',note:'ADSEAL'},{itemId:'canexel-joint-vstyle-12',note:'Couleurs'}]};
 const result=Review.importAnnotations(JSON.stringify(data),Review.empty());
 assert.equal(result.count,2);assert.equal(result.state.annotations['mir-request-adfast'],'ADSEAL');
 const out=Review.exportAnnotations(result.state,catalogue,'2026-11-07T00:00:00Z');
 assert.equal(out.schemaVersion,1);assert.equal(out.annotations.length,2);
 assert.equal(out.annotations[0].itemId,'mir-request-adfast');
});
check('Retirer du magasin est réversible et local uniquement',()=>{
 const storage=new Map(),api={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const state=Review.empty();state.hidden.push('mir-request-adfast');
 assert.ok(Review.save(api,state));const restored=Review.load(api);
 assert.deepEqual(restored.hidden,['mir-request-adfast']);
 assert.ok(get('mir-request-adfast'));
});
check('Invalid JSON est refusé sans toucher aux notes existantes',()=>{
 const old={annotations:{'mir-request-adfast':'À conserver'},hidden:[]};
 assert.throws(()=>Review.importAnnotations('{}',old),/incompatible/);
 assert.equal(old.annotations['mir-request-adfast'],'À conserver');
});
console.log('MIR magasin: '+tests+' vérifications réussies.');
