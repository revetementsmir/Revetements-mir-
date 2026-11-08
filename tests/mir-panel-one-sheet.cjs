'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/panel-layout-engine.js');
const O=require('../dist/panel-layout-output.js');
const M=require('../dist/production-model.js');
const W=require('../dist/mir-po-workflow.js');
const P=require('../dist/mir-procurement.js');
const shape=E.build({widthIn:120,heightIn:96,lipIn:1,columns:5,rows:2,mode:'equal',precisionIn:0});
assert.equal(shape.ok,true,JSON.stringify(shape.errors));
assert.equal(shape.pieces.length,10);
const meta={id:'TEST-ONE-SHEET',name:'Mur fictif',revision:'A',project:'Chantier test',poNumber:'PO-UN-PANNEAU',
 sourceLabel:'Exemple fictif',notes:'Ne pas transmettre',dimensionsConfirmed:true,reliefIn:2,
 material:{type:'aluminium',thickness:'2',thicknessUnit:'mm'},
 finish:{manufacturer:'Unico',name:'Noir de test',code:'NOIR-TEST',selectionType:'manufacturer'},
 perforation:{enabled:false,edgeId:'bottom',details:''}};
const payload=O.toTransfer(shape,meta);
const dossier={id:'DOS-PDF-10',items:[],layoutImports:[],nextNumber:1};
const imported=O.prepareImport(dossier,payload);
assert.equal(imported.ok,true,JSON.stringify(imported));
assert.equal(imported.added,10);
const fake={...P.seed()[0],verified:true};
const form={poNumber:'PO-10-PANNEAUX',job:'Exemple fictif',shipTo:'123 rue de test, Québec',notes:'NE PAS ENVOYER',foreman:'Responsable de test',requestedDate:'2026-12-01'};
const po=P.createPo(form,fake,imported.order);
const before=JSON.stringify(po);
const faces=W.pdfFaces(po,M);
assert.equal(faces.length,11,'Une couverture et dix pages de panneaux');
assert.equal((faces[0].svg.match(/data-mir-panel-wall=/g)||[]).length,10,'Vue de principe : un repère par panneau');
assert.match(faces[0].svg,/SCHÉMA DE REPÉRAGE/);
const refs=new Set();
for(let i=1;i<faces.length;i++){
 const f=faces[i],main=(f.svg.match(/data-mir-panel-main=/g)||[]);
 assert.equal(main.length,1,'Un seul contour géométrique principal sur la fiche '+i);
 assert.equal(f.svg.includes('SUITE, ne pas compter'),false,'Aucune répétition du panneau');
 assert.match(f.svg,/CÔTÉS, LIPS ET ANGLES/,'Cotes + lèvres sur la même fiche');
 assert.match(f.svg,/QTÉ 1/,'Quantité visible sur la même fiche');
 refs.add(f.name);
}
assert.equal(refs.size,10,'10 repères différents sur dix fiches');
assert.equal(JSON.stringify(po),before,'Génération sans modifier les pièces ou le PO');
const profSpec={kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2},length:120,quantity:1,material:{type:'acier',gauge:'26'},finish:{name:'Noir',manufacturer:'Test',code:'TEST'},coloredFace:{side:'left',segmentId:'A'}};
const profPo=P.createPo(form,fake,{id:'PROF',items:[{id:'M111',kind:'profile',spec:profSpec}]});
const original=W.pdfFaces(profPo,M);
assert.ok(original.length>=2,'Bon de moulures préservé');
const mixed={...po,items:po.items.concat({id:'M111',kind:'profile',spec:profSpec})};
const mixedFaces=W.pdfFaces(mixed,M);
assert.ok(mixedFaces.length>faces.length,'La moulure ajoutée conserve sa fiche distincte');
assert.equal(mixedFaces.slice(1,11).reduce((n,f)=>n+(f.svg.match(/data-mir-panel-main=/g)||[]).length,0),10,'Aucun panneau ajouté deux fois en mélange');
assert.throws(()=>W.pdfFaces({...po,items:[po.items[0],po.items[0]]},M),/Repères répétés/,'Références dupliquées refusées');
const unknown={...po.items[0],spec:{...po.items[0].spec,finish:{}}};
assert.throws(()=>W.pdfFaces({...po,items:[unknown]},M),/Pièce incomplète/,'PDF non généré quand la couleur manque');
console.log('PASS MIR GOD MODE: un bon = 10 repères = 10 fiches uniques, aucun doublon, pas de SUITE, moulures préservées');
