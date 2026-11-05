'use strict';
const assert = require('node:assert/strict');
const S = require('../dist/plan-sheet-detection.js');
const Spatial = require('../dist/plan-spatial-dimensions.js');
const {parseDimension} = require('../dist/plan-import-core.js');
assert.deepEqual(S.classify('Élévation latérale droite'), {kind:'elevation',face:'right'});
assert.deepEqual(S.classify('02. Élévation arrière'), {kind:'elevation',face:'back'});
assert.deepEqual(S.classify('((D) Élévation droite :'), {kind:'elevation',face:'right'});
assert.deepEqual(S.classify('Left Side Elevation'), {kind:'elevation',face:'left'});
assert.deepEqual(S.classify('Élévation nord'), {kind:'reference'});
assert.deepEqual(S.classify('West Elevation'), {kind:'reference'});
assert.deepEqual(S.classify('Élévation (arrière)'), {kind:'elevation',face:'back'});
assert.deepEqual(S.classify('Plan du rez-de-chaussée'), {kind:'floor'});
assert.deepEqual(S.classify('Plan d’étage 2'), {kind:'floor'});
assert.deepEqual(S.classify('2nd Floor Plan'), {kind:'floor'});
assert.deepEqual(S.classify('Plan des fondations'), {kind:'foundation'});
assert.deepEqual(S.classify('Coupe A-A'), {kind:'section'});
assert.deepEqual(S.classify('Coupe schématique'), {kind:'section'});
assert.deepEqual(S.classify('Plan de toiture'), {kind:'roof'});
for (const text of ['Voir élévation gauche', 'Élévation avant existante', 'Détail élévation avant', 'Hauteur du mur : 20 pi', 'Plan niveau', 'Coupe et'])
  assert.equal(S.classify(text), null, text);
const words = [
  {text:'Élévation',box:[30,350,74,365]}, {text:'avant',box:[79,350,114,365]},
  {text:'Élévation arrière',box:[340,350,430,365]}
];
const views = S.divideViews(S.viewsForPage(S.lines(words)), 500, 400);
assert.deepEqual(views.map(x=>x.face), ['front','back']);
assert.equal(views[0].crop[2],views[1].crop[0]);
const duplicateTitle = S.viewsForPage(S.lines([
  {text:'Élévation avant',box:[438,55,492,70]},
  {text:'A2 | Élévation avant',box:[52,350,141,365]}
]), 500);
assert.equal(duplicateTitle.length,1);
assert.deepEqual(duplicateTitle[0].box,[52,350,141,365]);
const indexTitles=['Plan niveau 0','Plan niveau 1','Plan niveau 2','Plan niveau 3'].map((text,i)=>({
  text,box:[380,180+i*7,440,186+i*7],confidence:92,source:'ocr'
}));
assert.deepEqual(S.viewsForPage(indexTitles,500,400),[]);
const rows = (...texts)=>texts.map(text=>({text,confidence:100}));
const foundation = S.volumeEvidence(rows('Dimensions hors tout : 40 pi × 35 pi','Hauteur du solage apparente : 2 pi'), {kind:'foundation',name:'Solage'}, 5, parseDimension);
const section = S.volumeEvidence(rows('Hauteur des murs : 25 pi','Montée du toit : 8 pi','Toit à deux versants','Largeur balcon : 5 pi'), {kind:'section',name:'Coupe A-A'}, 19, parseDimension);
const volume = S.volumeFrom([...foundation,...section]);
assert.deepEqual(volume.dimensions,{width:40*.3048,depth:35*.3048,wallHeight:25*.3048,roofRise:8*.3048});
assert.equal(volume.roofStyle,'gable');
assert.equal(volume.foundationDrop,2*.3048);
assert.equal(S.volumeFrom([...foundation,{field:'depth',value:25*.3048}]).dimensions.depth,null);
assert.equal(S.volumeFrom([{field:'roofStyle',value:'flat'}]).dimensions.roofRise,0);
assert.equal(S.volumeFrom([{field:'roofStyle',value:'flat'},{field:'roofRise',value:2}]).dimensions.roofRise,null);
const profile=(face,value)=>({field:'roofProfile',face,value});
assert.equal(S.volumeFrom([profile('front','trapezoid'),profile('left','triangle')]).roofStyle,'hip');
assert.equal(S.volumeFrom([profile('front','flat'),profile('left','triangle')]).roofStyle,'gable');
assert.equal(S.volumeFrom([profile('front','trapezoid'),profile('back','trapezoid')]).roofStyle,null);
assert.equal(S.volumeFrom([profile('front','trapezoid'),profile('back','flat'),profile('left','triangle')]).roofStyle,null);
const estimatedWidth = {field:'width',value:12,estimated:true};
assert.deepEqual(S.volumeFrom([estimatedWidth]).approximated,['width']);
assert.equal(S.volumeFrom([estimatedWidth,{field:'width',value:13}]).dimensions.width,13);
assert.deepEqual(S.volumeFrom([]).dimensions,{width:null,depth:null,wallHeight:null,roofRise:null});
const sectionLevels = S.volumeEvidence(rows('Dessus des fondations : 0.00 m','Ligne de sablière : +7.50 m','Niveau du faîte : +9.75 m'),{kind:'section',name:'Coupe B-B'},21,parseDimension);
assert.ok(Math.abs(sectionLevels.find(e=>e.field==='wallHeight').value-7.5)<1e-10);
assert.ok(Math.abs(sectionLevels.find(e=>e.field==='roofRise').value-2.25)<1e-10);
const cote=(x0,x1,y,referenceFt)=>({axis:'x',score:.9,anchors:[[x0,y],[x1,y]],referenceFt,normalized:referenceFt+' pi'});
const chain=[cote(10,410,10,40),cote(10,210,60,20),cote(210,410,60,20)];
assert.equal(S.volumeEvidence([], {kind:'elevation',face:'right',name:'Élévation droite'},11,parseDimension,chain)[0].value,40*.3048);
assert.deepEqual(S.volumeEvidence([], {kind:'elevation',face:'right',name:'Élévation droite'},11,parseDimension,chain.slice(0,2)),[]);
const levelRows = [
  {text:'Faîte de la toiture : +12.25 m',box:[250,50,400,62]},
  {text:'Plafond niv 3 : +9.5 m',box:[250,95,400,107]},
  {text:'Niveau du sol fini : +0.5 m',box:[250,200,400,212]},
].map(row=>({...row,confidence:100,source:'pdf-text'}));
const levelVolume = S.volumeFrom(Spatial.evidence({
  rows:levelRows,page:8,view:{kind:'elevation',face:'front',name:'Élévation avant'},crop:[0,0,500,400]
},parseDimension));
assert.ok(Math.abs(levelVolume.dimensions.wallHeight-9)<1e-10);
assert.ok(Math.abs(levelVolume.dimensions.roofRise-2.75)<1e-10);
console.log('MIR PDF : titres, cadrages multiples, cotes traçables et conflits vérifiés');
