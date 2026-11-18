'use strict';
/* Public-scope and immutable-dictionary regression. No browser, network or storage. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../dist/mir-pliage03-en-ca.js'),'utf8');
const shared=require('../dist/mir-client-en-ca.js');
const {dictionary}=require('../dist/mir-pliage03-en-ca.js');
const cases=[
  ['/pliage.html','',true],
  ['/Revetements-mir-/pliage.html','?lang=en-CA',true],
  ['/production.html','?mode=client',true],
  ['/production.html','?mode=client&kind=profile',true],
  ['/selection.html','',true],
  ['/selection.html','?lang=en-CA',true],
  ['/production.html','',false],
  ['/production.html','?mode=admin',false],
  ['/production.html','?mode=client&source=store',false],
  ['/pliage.html','?source=store',false],
  ['/selection.html','?source=store',false],
  ['/index.html','',false],
  ['/chantier.html','?clientLocale=1',false],
  ['/production.html','?mode=client',false,'iframe'],
  ['/pliage.html','',false,'iframe'],
  ['/selection.html','',false,'iframe'],
  ['/production.html','?mode=client',false,'inaccessible-top']
];
const snapshot=JSON.stringify(shared);
for(const [pathname,search,applies,frame] of cases){
  const win={location:{pathname,search},MIRClientEnglish:shared};win.self=win;win.top=frame?{}:win;
  if(frame==='inaccessible-top')Object.defineProperty(win,'top',{get(){throw Error('Cross-origin frame');}});
  Object.defineProperty(win,'localStorage',{get(){throw Error('Storage must not be accessed');}});
  const context={window:win,URLSearchParams};
  vm.runInNewContext(script,context);
  if(applies){
    assert.notEqual(win.MIRClientEnglish,shared);
    assert.equal(Object.isFrozen(win.MIRClientEnglish),true);
    for(const [fr,en] of Object.entries(dictionary))assert.equal(win.MIRClientEnglish[fr],en);
    for(const [fr,en] of Object.entries(shared))if(!Object.hasOwn(dictionary,fr))assert.equal(win.MIRClientEnglish[fr],en);
  }else assert.equal(win.MIRClientEnglish,shared,pathname+search+' '+(frame||''));
}
assert.equal(JSON.stringify(shared),snapshot,'shared dictionary is not mutated');
const win={location:{pathname:'/production.html',search:'?mode=client'},MIRClientEnglish:shared};win.self=win;win.top=win;
vm.runInNewContext(script,{window:win,URLSearchParams});
// Check the actual locale consumer sees the merged object at load time.
const localeContext={window:win,URLSearchParams,module:{exports:{}},require};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/mir-client-i18n.js'),'utf8'),localeContext);
for(const [fr,en] of Object.entries(dictionary)){
  assert.equal(localeContext.module.exports.translate(fr,'en-CA'),en);
  assert.equal(localeContext.module.exports.translate(fr,'fr-CA'),fr);
}
for(const value of ['aluminium','acier','left','right','manufacturer','special','3 1/2','120','M001','canexel-noir'])assert.equal(localeContext.module.exports.translate(value,'en-CA'),value,'business value '+value);
for(const [source,translated]of [['Produit :','Product:'],['Référence produit :','Product reference:'],['Référence du produit :','Product reference:']])assert.equal(localeContext.module.exports.pdfText(source),translated,'fixed PDF label '+source);
const sourceProduct='Gentek — Feuille peinte aluminium 3037, 24po×98,5pi';
assert.equal(localeContext.module.exports.pdfText('Product: '+sourceProduct),'Product: '+sourceProduct,'pretranslated product prefix keeps the exact source name');
assert.equal(localeContext.module.exports.pdfText('gentek-coil-3037'),'gentek-coil-3037','product reference stays an opaque identifier');
console.log('PASS Pliage 03: '+cases.length+' scope cases, '+Object.keys(dictionary).length+' FR/EN strings; shared dictionary and business values preserved.');
