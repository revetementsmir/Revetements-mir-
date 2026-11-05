'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=path.resolve(__dirname,'../dist'),read=p=>fs.readFileSync(path.join(D,p),'utf8');
const A=require('../dist/plan-structure-notes.js');
const hints=A.detect([
 {text:'POTEAU 6 po',box:[10,15,92,29],source:'pdf-text'},
 {text:'POUTRE SOUS TOIT',box:[20,44,160,59],source:'ocr'},
 {text:'BALCON',box:[20,90,110,106],source:'ocr'},
 {text:'Fenêtre',box:[20,130,105,148],source:'pdf-text'}]);
assert.deepEqual(hints.map(v=>v.type),['column','beam','balcony']);
assert.ok(hints.every(v=>v.needsReview&&v.structuralVerification===false));
assert.equal(A.detect([{text:'Aucun poteau',box:[0,0,130,16],source:'ocr'}]).length,1);
assert.equal(A.detect([{text:'Maçonnerie',box:[0,0,90,20],source:'ocr'}]).length,0);
assert.equal(A.detect([],'PLAN ÉLÉVATION POUTRE PRINCIPALE').length,1);
assert.equal(A.withinCrop(hints,[0,0,95,70]).length,2);
assert.equal(A.withinCrop(hints,[0,70,150,50]).length,1);
assert.equal(A.withinCrop([{type:'beam',box:null}],[0,0,10,10]).length,1);
assert.ok(read('plan-import.js').includes('MIRStructuralNotes.withinCrop'));
assert.match(read('plan-import.js'),/const structuralHints\s*=/);
assert.ok(read('studio-features.js').includes('data-add-hint'));
assert.match(read('plan.html'),/src="plan-import\.js\?v=[^"]+" defer/);
assert.ok(read('studio-ui.css').includes('.mir-structure-evidence'));
console.log('MIR repères PDF : 14 contrôles validés');
