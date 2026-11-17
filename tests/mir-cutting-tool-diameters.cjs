'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module'),{execFileSync}=require('node:child_process');
const Q=require('../dist/mir-commerce-quantity.js'),Store=require('../dist/employee-store-model.js');
const root=path.resolve(__dirname,'..'),BASELINE='b6e88dfd71942173d8520156c98bcf8213ed337c';
function historical(file){try{return execFileSync('git',['show',BASELINE+':'+file],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});}catch(error){throw Error('Lecture locale de la référence Git impossible : '+file+' ('+(error.code||error.status)+')');}}
function baselineModule(file){const m=new Module(path.join(root,file),module);m.filename=path.join(root,file);m.paths=module.paths;m._compile(historical(file),m.filename);return m.exports;}
const fixture=()=>({id:'test-hole-saw',name:'Scie-cloche de recette',brand:'Marque de recette',family:'Outil de coupe',applications:['cutting-tool','accessory'],unit:'pièce',colorStatus:'not_applicable',dimensions:{},formatAxis:'diameter',formats:[
 {id:'d2',label:'2 po',diameterIn:2,diameterMm:50.8,manufacturerCode:'TEST-2',unit:'pièces'},
 {id:'d5',label:'5 po',diameterIn:5,diameterMm:127,manufacturerCode:'TEST-5',unit:'pièces'}]});
const built=m=>Store.buildCatalogue([m]).find(x=>x.id===m.id);

test('diamètres pouces et mm acceptés, zéro longueur fictive et zéro surface',()=>{
 const m=fixture(),unchanged=JSON.stringify(m);
 assert.deepEqual(Q.formats(m).map(f=>f.id),['d2','d5']);
 assert.equal(Q.policy(m).missingFormat,true);
 assert.equal(Q.validate(m,{unit:'pièces',quantity:2}).ok,false);
 for(const f of m.formats){
  const policy=Q.policy(m,f.id);assert.equal(policy.area,null);assert.deepEqual(policy.rules,[{unit:'pièces',step:1}]);
  assert.equal(Q.validate(m,{formatId:f.id,unit:'pièces',quantity:2}).ok,true);
  assert.equal(Q.validate(m,{formatId:f.id,unit:'pièces',quantity:1.5}).ok,false);
  assert.equal(Q.validate(m,{formatId:f.id,unit:'pi²',quantity:2}).ok,false);
 }
 assert.equal(Q.validate(m,{formatId:'absent',unit:'pièces',quantity:2}).ok,false);
 const mm={...m,formats:[{id:'metric',diameterMm:51,unit:'pièces'}]};
 assert.equal(Q.formats(mm).length,1);assert.equal(Q.validate(mm,{formatId:'metric',quantity:2,unit:'pièces'}).ok,true);
 const invalid={...m,formats:[{id:'zero',diameterIn:0},{id:'negative',diameterMm:-1},{id:'string',diameterIn:'2'},{id:'nonfinite',diameterIn:Infinity},{id:'wrong-axis',lengthIn:2}]};
 assert.deepEqual(Q.formats(invalid),[]);assert.deepEqual(built(invalid).formats,[]);
 assert.equal(JSON.stringify(m),unchanged);
});

test('catalogue employé : classement, sélection obligatoire et deux clés distinctes',()=>{
 const item=built(fixture()),state={catalogue:[item]};
 assert.equal(item.category,'lames-consommables');assert.equal(item.formatAxis,'diameter');assert.equal(item.formats.length,2);assert.equal(item.stockLengthIn,null);
 const missing=Store.configureLine(state,{itemId:item.id,quantity:2});assert.equal(missing.error.code,'FORMAT_REQUIRED');assert.match(missing.error.message,/diamètre/);
 assert.equal(Store.configureLine(state,{itemId:item.id,quantity:2,formatId:'unknown'}).error.code,'FORMAT_UNKNOWN');
 assert.equal(Store.configureLine(state,{itemId:item.id,quantity:.5,formatId:'d2'}).error.code,'INVALID_QUANTITY');
 const lines=item.formats.map(f=>{const result=Store.configureLine(state,{itemId:item.id,quantity:2,formatId:f.id});assert.equal(result.ok,true);return result.line;});
 assert.notEqual(lines[0].stockKey,lines[1].stockKey);
 for(const [index,line] of lines.entries()){
  const f=item.formats[index];assert.equal(line.formatId,f.id);assert.deepEqual(line.format,f);assert.equal(line.formatLabel,f.label);assert.equal(line.manufacturerReference,f.manufacturerCode);assert.equal(line.stockLengthIn,null);
  assert.deepEqual(line.snapshot.dimensions,{diameterIn:f.diameterIn,diameterMm:f.diameterMm});assert.equal(Object.hasOwn(line.snapshot.dimensions,'lengthIn'),false);assert.deepEqual(line.snapshot.format,f);
  assert.equal(JSON.stringify(line.stockKey).includes('lengthIn'),false);
 }
 const snapshot=JSON.stringify(lines[0].snapshot);item.formats[0].diameterIn=99;item.formats[0].label='Nouvelle étiquette';assert.equal(JSON.stringify(lines[0].snapshot),snapshot);
});

test('format millimétrique et largeur de lame de 44 mm restent des mesures distinctes',()=>{
 const mm=built({...fixture(),formats:[{id:'metric',label:'51 mm',diameterMm:51,manufacturerCode:'TEST-MM',unit:'pièces'}]});
 const metric=Store.configureLine({catalogue:[mm]},{itemId:mm.id,quantity:2});assert.equal(metric.ok,true);assert.deepEqual(metric.line.snapshot.dimensions,{diameterMm:51});assert.equal(metric.line.stockLengthIn,null);
 const blade=built({id:'test-oscillating-blade',name:'Lame HCS de recette',brand:'Marque de recette',family:'Outil de coupe',applications:['cutting-tool','accessory'],unit:'pièce',colorStatus:'not_applicable',dimensions:{widthMm:44}});
 assert.equal(blade.category,'lames-consommables');assert.deepEqual(blade.formats,[]);
 const result=Store.configureLine({catalogue:[blade]},{itemId:blade.id,quantity:2});assert.equal(result.ok,true);assert.deepEqual(result.line.snapshot.dimensions,{widthMm:44});assert.equal(result.line.stockLengthIn,null);
});

test('restrictions de couleur et commande bloquée restent actives',()=>{
 const m={...fixture(),colors:[{id:'permitted',name:'Référence test',formatIds:['d2']}]};assert.deepEqual(Q.formats(m,'permitted').map(f=>f.id),['d2']);assert.equal(Q.validate(m,{formatId:'d5',colorId:'permitted',unit:'pièces',quantity:1}).ok,false);
 const item=built({...fixture(),orderable:false,orderableReason:'Référence en attente'});assert.equal(Store.configureLine({catalogue:[item]},{itemId:item.id,formatId:'d2',quantity:1}).error.code,'ITEM_NOT_ORDERABLE');
});

test('corpus historique de 129 références inchangé : règles, snapshots et clés de stock',()=>{
 const catalog=JSON.parse(historical('dist/catalogue-fd6866b49d21.json')),OldQ=baselineModule('dist/mir-commerce-quantity.js'),OldStore=baselineModule('dist/employee-store-model.js');
 assert.equal(catalog.materials.length,129);const before=JSON.stringify(catalog);
 for(const m of catalog.materials){
  assert.deepEqual(Q.formats(m),OldQ.formats(m),m.id);
  for(const formatId of [null,...(m.formats||[]).map(f=>f.id)]){
   assert.deepEqual(Q.policy(m,formatId),OldQ.policy(m,formatId),m.id+' '+formatId);
   for(const quantity of [1,2,1.5]){const spec={formatId,quantity,unit:OldQ.policy(m,formatId).defaultUnit};assert.deepEqual(Q.validate(m,spec),OldQ.validate(m,spec),m.id+' '+formatId);}
  }
 }
 const current=Store.buildCatalogue(catalog),prior=OldStore.buildCatalogue(catalog);assert.deepEqual(current,prior,'old catalogue rows are unchanged');
 for(const item of prior){
  for(const formatId of [undefined,...(item.formats||[]).map(f=>f.id)]){
   const spec={itemId:item.id,quantity:1,formatId,colorId:item.colorPolicy==='required'?item.colors[0]?.id:undefined,dimensionsIn:Object.fromEntries((item.measureFields||[]).map(f=>[f.key,Math.min(f.max||1,1)]))};
   assert.deepEqual(Store.configureLine({catalogue:current},spec),OldStore.configureLine({catalogue:prior},spec),item.id+' '+formatId);
  }
 }
 assert.equal(JSON.stringify(catalog),before,'historical catalogue was not mutated');
});
