'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalogue=require('../dist/catalogue-fd6866b49d21.json');
const policy=require('../dist/mir-catalogue-policy.js');
const Store=require('../dist/employee-store-model.js');

const materials=catalogue.materials;
const byId=new Map(materials.map(item=>[item.id,item]));
const accessories=['mir-caulk-nozzle-45-5','mir-adfast-yellow-nozzles-5','mir-caulk-sausage-nozzle','mir-bates-caulk-gun'];

test('inventaire canonique sans identifiant en double',()=>{
  assert.equal(materials.length,128);
  assert.equal(byId.size,materials.length);
  for(const item of materials)assert.ok(item.id&&item.name&&item.brand,`identité incomplète: ${item.id}`);
});
test('Noir puis Blanc, sans créer les options absentes',()=>{
  const input=[{id:'rouge',name:'Rouge'},{id:'blanc',name:'Blanc Glacier'},{id:'noir',name:'Noir minuit'}];
  assert.deepEqual(policy.sortColors(input).map(x=>x.id),['noir','blanc','rouge']);
  assert.deepEqual(policy.sortColors(input.filter(x=>x.id!=='noir')).map(x=>x.id),['blanc','rouge']);
  assert.deepEqual(policy.sortColors(input.filter(x=>x.id!=='blanc')).map(x=>x.id),['noir','rouge']);
  assert.deepEqual(policy.sortColors([{id:'wood',name:'Chêne Blanc'},{id:'red',name:'Rouge'}]).map(x=>x.id),['wood','red']);
  assert.equal(input.length,3);
});

test('couleurs archivées, incompatibles ou indisponibles exclues',()=>{
  const rows=[{id:'ok',name:'Noir'},{id:'old',name:'Blanc',archived:true},{id:'bad',name:'Rouge',compatible:false},{id:'gone',name:'Bleu',available:false}];
  assert.deepEqual(policy.sortColors(rows).map(x=>x.id),['ok']);
});

test('quatre accessoires centralisés et honnêtement bloqués',()=>{
  const built=Store.buildCatalogue(catalogue);
  for(const id of accessories){
    const canonical=byId.get(id),item=built.find(row=>row.id===id);
    assert.ok(canonical&&item,id);
    assert.equal(canonical.orderable,false,id);
    assert.equal(canonical.primaryImage,null,id);
    assert.match(canonical.imageStatus,/missing_exact_image/,id);
    const configured=Store.configureLine({catalogue:built},{itemId:id,quantity:1});
    assert.equal(configured.ok,false,id);
    assert.equal(configured.error.code,'ITEM_NOT_ORDERABLE',id);
  }
  assert.equal(byId.get('mir-adfast-yellow-nozzles-5').packaging.piecesPerPack,5);
  assert.equal(byId.get('mir-bates-caulk-gun').manufacturerCode,'FPMS001B351');
  assert.match(byId.get('mir-bates-caulk-gun').retailerCode,/B0CQZ3HWY7/);
});

test('BECK et PRIME conservent les seules données approuvées',()=>{
  const beck=byId.get('beck-panelfast-ags100'),prime=byId.get('prime-siding-2-30644');
  assert.deepEqual(beck.formats.map(x=>x.lengthIn),[1.5]);
  assert.equal(beck.mirFixedPriceCents,51599);
  assert.equal(prime.dimensions.lengthIn,2);
  assert.equal(prime.packaging.piecesPerBox,5400);
  assert.equal(prime.dimensions.diameterIn,0.09);
  assert.equal(prime.dimensions.collationAngleDeg,15);
  assert.equal(prime.finish,'Brillant');
});

test('images déclarées locales présentes et textes alternatifs non vides',()=>{
  for(const item of materials)for(const image of item.images||[]){
    if(!/^\.\/assets\//.test(image.src||''))continue;
    assert.ok(fs.existsSync(path.join(__dirname,'..','dist',image.src)),`${item.id}: ${image.src}`);
    assert.ok(String(image.alt||'').trim(),`${item.id}: alt manquant`);
  }
});

test('politique commune chargée dans tous les parcours catalogue',()=>{
  for(const file of ['boutique.html','produit.html','selection.html','materiaux.html','chantier.html','magasin-revue.html','entrepot.html','production.html','pliage.html','plan.html','metres.html']){
    assert.match(fs.readFileSync(path.join(__dirname,'..','dist',file),'utf8'),/mir-catalogue-policy\.js/,file);
  }
});

test('instantanés de ligne indépendants du catalogue modifiable',()=>{
  const built=Store.buildCatalogue(catalogue),item=built.find(x=>x.id==='beck-panelfast-ags100');
  const configured=Store.configureLine({catalogue:built},{itemId:item.id,quantity:1,formatId:item.formats[0].id});
  assert.ok(configured.ok);
  const snapshot=JSON.parse(JSON.stringify(configured.line.snapshot));
  item.name='Nom futur'; item.formats[0].label='Format futur';
  assert.notEqual(snapshot.name,item.name);
  assert.notEqual(snapshot.format.label,item.formats[0].label);
});
