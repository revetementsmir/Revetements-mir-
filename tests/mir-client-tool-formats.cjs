'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const Q=require('../dist/mir-commerce-quantity.js');
const file=path.resolve(__dirname,'../dist/commerce.js');
let code=fs.readFileSync(file,'utf8');
const start=code.lastIndexOf('  init().catch(');assert.ok(start>0);
code=code.slice(0,start)+'window.testToolFormats={withFormat,dimensions,formatLabel,formatOptions,formatSummary,facts,requestable};\n})();';
const window={MIRCommerceQuantity:Q,MIRCatalogueOrder:{categories:[]},MIRMaterialPreview:{},addEventListener(){}};
vm.runInNewContext(code,{window,document:{baseURI:'http://127.0.0.1/produit.html',querySelector(){return null},addEventListener(){}},location:{search:'',origin:'http://127.0.0.1'},localStorage:{getItem(){return null}},URLSearchParams,URL,Intl,console},{timeout:1000});
const ui=window.testToolFormats;
const saw={id:'test-diameter',brand:'Test',name:'Scie-cloche',family:'Accessoire',applications:['accessory'],unit:'pièces',formatAxis:'diameter',dimensions:{},formats:[
 {id:'d2',label:'2 po',diameterIn:2,diameterMm:51,manufacturerCode:'DWA2',unit:'pièces'},
 {id:'d218',label:'2 1/8 po',diameterIn:2.125,diameterMm:54,manufacturerCode:'DWA218',unit:'pièces'},
 {id:'d5',label:'5 po',diameterIn:5,diameterMm:127,manufacturerCode:'DWA5',unit:'pièces'}
]};
const before=JSON.stringify(saw),chosen=ui.withFormat(saw,saw.formats[1]);
assert.equal(chosen.dimensions.diameterIn,2.125);assert.equal(chosen.dimensions.diameterMm,54,'published metric value retained, not recalculated');
assert.equal(chosen.manufacturerCode,'DWA218');assert.equal(chosen.selectedFormatId,'d218');assert.equal(chosen.unit,'pièces');
for(const name of ['lengthIn','lengthFt','lengthM','nominalLengthIn','widthIn'])assert.equal(Object.hasOwn(chosen.dimensions,name),false,name+' must never represent diameter');
assert.equal(ui.dimensions(chosen),'Diamètre : 2 1/8 po · 54 mm');
assert.equal(ui.formatSummary(saw),'Diamètres : 2 à 5 po');
assert.match(ui.formatOptions(saw,null,'d218',true),/Choisir le diamètre/);assert.doesNotMatch(ui.formatOptions(saw,null,'d218',true),/×|Longueur/);
const facts=ui.facts(chosen,null);assert.ok(facts.some(([key,value])=>key==='Code fabricant'&&value==='DWA218'));assert.ok(facts.some(([key,value])=>key==='Diamètre'&&value==='2 1/8 po · 54 mm'));assert.equal(facts.some(([key])=>/Longueur/.test(key)),false);
const many={...saw,formats:Array.from({length:28},(_,i)=>({id:'fixture-'+i,diameterIn:i===27?5:2+i/10,unit:'pièces'}))};assert.equal(ui.formatSummary(many),'Diamètres : 2 à 5 po','28 options stay a compact range on card');
assert.equal(ui.formatLabel({diameterMm:44}),'44 mm');
assert.equal(ui.dimensions({dimensions:{widthMm:44}}),'Largeur : 44 mm');assert.ok(ui.facts({dimensions:{widthMm:44},applications:['accessory']},null).some(([key,value])=>key==='Largeur'&&value==='44 mm'));
assert.equal(JSON.stringify(saw),before,'source catalogue object remains unchanged');
assert.equal(Q.policy(saw,'d218').area,null);assert.equal(Q.validate(saw,{formatId:'d218',unit:'pièces',quantity:2}).ok,true);assert.equal(Q.validate(saw,{formatId:'d218',unit:'pi²',quantity:2}).ok,false);
const stock=ui.withFormat({dimensions:{widthIn:48,lengthIn:96}}, {id:'48x120',widthIn:48,lengthIn:120});assert.equal(stock.dimensions.widthIn,48);assert.equal(stock.dimensions.lengthIn,120,'existing panel length preserved');
assert.equal(ui.withFormat({dimensions:{}},{id:'tube-304',label:'304 ml',volumeMl:304}).dimensions.volumeMl,304,'existing volume format preserved');
console.log('PASS client tool formats: diameter/length separation, published units and manufacturer code, compact 28-format card, 44 mm width, immutable catalogue, quantity and legacy formats.');

const actual=require('../dist/catalogue-fd6866b49d21.json').materials;
const dewalt=actual.find(m=>m.id==='dewalt-bimetal-hole-saws'),leiluo=actual.find(m=>m.id==='leiluo-oscillating-hcs-44mm');
assert.ok(dewalt&&leiluo,'Canonical tools must be present');
for(const tool of [dewalt,leiluo]){
 assert.equal(Boolean(ui.requestable(tool)),true,tool.id);
 for(const patch of [{requestableWithoutPhoto:false},{requestableWithoutPhoto:'true'},{status:'pending_identity'},{status:'documented_reference'},{requestReference:{...tool.requestReference,verified:false}},{requestReference:{...tool.requestReference,kind:'unknown'}},{orderable:false},{commercialStatus:'not_for_sale'},{id:'unrelated-item'},{brand:'Unconfirmed'}])assert.equal(Boolean(ui.requestable({...tool,...patch})),false,tool.id+' '+JSON.stringify(patch));
}
for(const formats of [[],[{...dewalt.formats[0],manufacturerCode:''}],[{...dewalt.formats[0],sourceUrl:'https://example.com/product'}],[{...dewalt.formats[0],sourceUrl:'javascript:alert(1)'}],[{...dewalt.formats[0],lengthIn:2}],[{...dewalt.formats[0],diameterIn:0,diameterMm:0}]])assert.equal(Boolean(ui.requestable({...dewalt,formats})),false,'Unverified diameter variant');
assert.equal(Boolean(ui.requestable({...dewalt,formatAxis:'length'})),false);
assert.equal(Boolean(ui.requestable({...leiluo,dimensions:{widthMm:45}})),false);
assert.equal(Boolean(ui.requestable({...leiluo,sourceEvidence:{type:'unconfirmed'}})),false);
assert.equal(Boolean(ui.requestable({...leiluo,formats:[dewalt.formats[0]]})),false);
assert.equal(Boolean(ui.requestable({...saw,images:[],primaryImage:null,imageStatus:'missing',requestableWithoutPhoto:true,status:'mir_reference'})),false,'generic missing-photo flag never enough');
const oldCode=execFileSync('git',['show','b6e88df:dist/commerce.js'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',maxBuffer:16*1024*1024});
const oldCatalogue=JSON.parse(execFileSync('git',['show','b6e88df:dist/catalogue-fd6866b49d21.json'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',maxBuffer:16*1024*1024})).materials;
const oldStart=oldCode.lastIndexOf('  init().catch('),oldWindow={...window};
vm.runInNewContext(oldCode.slice(0,oldStart)+'window.legacy={withFormat,dimensions,formatLabel,formatOptions,facts,requestable};\n})();',{window:oldWindow,document:{baseURI:'http://127.0.0.1/produit.html',querySelector(){return null},addEventListener(){}},location:{search:'',origin:'http://127.0.0.1'},localStorage:{getItem(){return null}},URLSearchParams,URL,Intl,console},{timeout:1000});
const legacy=oldWindow.legacy;let combinations=0;
for(const m of oldCatalogue){
 assert.equal(Boolean(ui.requestable(m)),Boolean(legacy.requestable(m)),m.id+' add permission unchanged');
 assert.equal(ui.dimensions(m),legacy.dimensions(m),m.id+' card dimensions unchanged');
 for(const f of [null,...Q.formats(m)]){
  const before=legacy.withFormat(m,f),after=ui.withFormat(m,f);
  assert.equal(ui.dimensions(after),legacy.dimensions(before),m.id+' '+f?.id+' selected dimensions unchanged');
  assert.equal(JSON.stringify(ui.facts(after,null)),JSON.stringify(legacy.facts(before,null)),m.id+' '+f?.id+' technical facts unchanged');
  assert.equal(ui.formatLabel(f),legacy.formatLabel(f),m.id+' '+f?.id+' format name unchanged');
  assert.equal(ui.formatOptions(m,null,f?.id,true),legacy.formatOptions(m,null,f?.id,true),m.id+' '+f?.id+' dropdown unchanged');
  combinations++;
 }
}
assert.equal(oldCatalogue.length,129);
console.log('PASS two explicit missing-photo guards and negative cases; '+oldCatalogue.length+' legacy products / '+combinations+' format states have unchanged dimensions, facts, labels and add permissions.');
