'use strict';
/* MOON — contrats du parcours Créer -> Modèles -> Boutique -> Commandes. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const P=require('../dist/mir-procurement.js');
const Cards=require('../dist/custom-model-cards.js');
let count=0;
function test(label,fn){fn();count++;console.log('PASS '+label);}
const mockTemplate={id:'mir-modele-test',version:1,kind:'profile',name:'Solin personnalisé',
 fields:[{key:'A',label:'A',required:true},{key:'B',label:'B',required:true}]};
const model={id:mockTemplate.id,name:mockTemplate.name,currentVersion:1,versions:[mockTemplate],
 channels:{client:false,store:false,po:true},allowed:{materials:['aluminium','acier'],colorSystems:['manufacturer']},archived:false};
const engine={templatePreview:()=>({ok:true,model:{valid:true,kind:'profile',name:mockTemplate.name,pointsMM:[[0,0],[30,0],[30,35]],segments:[{label:'A'},{label:'B'}]}})};
test('Tarifs français et anglais convertis en cents exacts',()=>{
 assert.equal(P.parsePrice('7,99'),799);assert.equal(P.parsePrice('10.99'),1099);
 assert.equal(P.parsePrice('100'),10000);assert.equal(P.priceLabel(799),'7,99 $ CA');
 for(const v of ['-1','2.999','1e4','NaN','0','100000.01','ABC'])assert.ok(Number.isNaN(P.parsePrice(v)),v);
 assert.equal(P.parsePrice(''),null);
});
test('Brouillon conserve les autres canaux et les versions sans fixer de prix',()=>{
 const input=JSON.stringify(model);
 const result=P.commercialUpdate(model,{action:'draft',aluminium:'',acier:'',store:true,po:true,conditions:'Fabrication sur confirmation',now:'2026-11-05'});
 assert.ok(result.ok);assert.equal(result.record.channels.client,false);
 assert.equal(result.record.channels.store,true);assert.equal(result.record.channels.po,true);
 assert.equal(result.record.commercial.lengthIn,120);assert.equal(result.record.commercial.currency,'CAD');
 assert.deepEqual(result.record.versions,model.versions);assert.equal(JSON.stringify(model),input);
 assert.equal(result.record.commercial.status,'draft');
});
test('Pas de publication locale sans prix autorisé pour chacun des deux métaux',()=>{
 const result=P.commercialUpdate(model,{action:'published',aluminium:'7.99',acier:''});
 assert.equal(result.ok,false);assert.match(result.errors.join(' '),/tarif/);
 assert.deepEqual(P.commercialUpdate({...model,archived:true},{action:'published',aluminium:'7.99',acier:'10.99'}).ok,false);
});
test('Publication explicite locale: 10 pi, deux prix, pas de rétroactivité',()=>{
 const previous={...model,orders:[{id:'M001',priceCents:4599}],commercial:{status:'draft'}};
 const result=P.commercialUpdate(previous,{action:'published',aluminium:'7,99',acier:'10.99',store:true,po:true,now:'2026-11-05'});
 assert.equal(result.ok,true);assert.equal(result.record.channels.client,true);
 assert.equal(result.record.commercial.status,'published');
 assert.deepEqual(result.record.commercial.priceCentsByMetal,{aluminium:799,acier:1099});
 assert.equal(result.record.commercial.lengthIn,120);
 assert.equal(previous.orders[0].priceCents,4599);assert.notEqual(previous,result.record);
 assert.equal(previous.commercial.status,'draft');
});
test('Boutique cliente: brouillons invisibles et tarifs visibles seulement sur modèle publié',()=>{
 const published=P.commercialUpdate(model,{action:'published',aluminium:'7,99',acier:'10,99',store:true,po:true}).record;
 const current=Cards.read({records:[published],engine,channel:'client'});
 assert.equal(current.total,1);assert.match(current.items[0].offerText,/Aluminium 7,99/);
 assert.match(current.items[0].offerText,/Acier 10,99/);
 assert.match(Cards.renderHTML(current),/10 pi/);
 const draft={...published,channels:{...published.channels,client:true},commercial:{...published.commercial,status:'draft'}};
 assert.equal(Cards.read({records:[draft],engine,channel:'client'}).total,0);
 assert.equal(Cards.read({records:[draft],engine,channel:'store'}).total,1,'Un brouillon boutique peut rester dans le magasin employé');
});
test('Compatibilité des anciennes références publiées sans tarifs',()=>{
 const legacy={...model,channels:{client:true,store:false,po:true}};
 const result=Cards.read({records:[legacy],engine,channel:'client'});
 assert.equal(result.total,1);assert.equal(result.items[0].offerText,'');
});
test('Navigation exclusive, Fournisseurs sous Commandes, aucune transmission implicite',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../dist/mir-procurement.js'),'utf8');
 const nav=js.match(/tabs\.innerHTML='([^']+)'/);
 assert.ok(nav);
 assert.equal((nav[1].match(/data-mir-tab=/g)||[]).length,4);
 assert.ok(nav[1].includes('data-mir-tab="boutique"'));
 assert.ok(!nav[1].includes('data-mir-tab="suppliers"'));
 assert.ok(js.includes('data-mir-tab="orders">← Retour aux commandes'));
 assert.ok(js.includes('aucune commande n’est envoyée automatiquement'));
 const workspace=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
 assert.ok(workspace.includes("channels:{client:false,store:data.has('store')"));
 assert.ok(workspace.includes('reloadLocalTemplates'));
});
console.log('MIR audit pliage : '+count+' contrôles métier réussis');
