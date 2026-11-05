'use strict';
/* Recette déterministe du nouveau traçage admin MIR.
 * Les mesures ici sont des cotes de pièce finie; les corrections de pliage
 * restent volontairement des paramètres de fabrication non inventés. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../dist/production-model.js');
const read = name => fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
let count = 0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function spec(template,dimensions,unit='in'){
 return {kind:'profile',template,unit,dimensions,length:unit==='mm'?3048:120,
   quantity:1,coloredFace:{side:'left',segmentId:'A'},material:{type:'acier'},
   finish:{name:'Vert test'}};
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-5,actual+' != '+expected);
test('Moulure L : addition exacte des segments A=3 et B=2 (5 po)',()=>{
 const model=P.buildProfile(spec('l',{A:3,B:2}));
 assert.equal(model.valid,true);
 close(model.finishedSegmentSumMM,5*25.4);
 assert.equal(P.formatMeasurement(model.finishedSegmentSumMM,'in'),'5 po');
});
test('Moulure J : 3 + 2 + 3⅛ = 8⅛ po',()=>{
 const model=P.buildProfile(spec('j',{A:3,B:2,C:'3 1/8'}));
 assert.equal(model.valid,true);
 close(model.finishedSegmentSumMM,8.125*25.4);
 assert.equal(P.formatMeasurement(model.finishedSegmentSumMM,'in'),'8 1/8 po');
});
test('La largeur est également disponible en millimètres',()=>{
 const model=P.buildProfile(spec('l',{A:76.2,B:50.8},'mm'));
 assert.equal(model.valid,true);
 close(model.finishedSegmentSumMM,127);
 assert.equal(P.formatMeasurement(model.finishedSegmentSumMM,'mm'),'127 mm');
});
test('Chaque profil intégré utilise la somme de ses côtés',()=>{
 for(const [template,definition] of Object.entries(P.TEMPLATES)){
   const dim=Object.fromEntries(definition.labels.map((letter,i)=>[letter,i+1]));
   const model=P.buildProfile(spec(template,dim));
   assert.equal(model.valid,true,template+': '+JSON.stringify(model.validation.errors));
   close(model.finishedSegmentSumMM,definition.labels.reduce((sum,_,i)=>sum+i+1,0)*25.4);
 }
});
test('Ajout de deux plis : recalcul de la largeur sans compter les plis comme côtés',()=>{
 const start=spec('l',{A:3,B:2});
 const result=P.insertDoubleFold(start,{segmentIndex:0,beforeLength:1,betweenLength:1,afterLength:1,
   firstBend:{mode:'interior',angle:90,direction:'left'},
   secondBend:{mode:'interior',angle:90,direction:'right'}});
 assert.equal(result.ok,true,JSON.stringify(result.errors));
 close(result.model.finishedSegmentSumMM,5*25.4);
});
test('La page charge les ressources admin et garde les scripts métier',()=>{
 const html=read('production.html');
 for(const asset of ['production-model.js','production-app.js','production-admin-v4.css','production-admin-v4.js'])
   assert.ok(html.includes(asset),asset);
});
test('Les deux choix supérieurs sont Moulures et Panneaux architecturaux',()=>{
 const js=read('production-admin-v4.js');
 for(const name of ['Moulures','Panneaux architecturaux']) assert.ok(js.includes(name));
 assert.ok(js.includes("main.insertBefore(typeBar, intro)"));
});
test('Total des côtés affiché dans les réglages, jamais sous le dessin',()=>{
 const js=read('production-admin-v4.js');
 assert.ok(js.includes("config.insertBefore(sheet, config.firstChild)"));
 assert.ok(!js.includes("drawing.append(sheet)"));
 const app=read('production-app.js');
 assert.ok(app.includes('model.finishedSegmentSumMM'));
 assert.ok(app.includes('updateV4Totals(actual)'));
 assert.ok(app.includes("glyphs[mixed[2]]"));
 assert.ok(!js.includes('mir-v4-sheet-total</div>'));
});
test('Matériaux et Couleur sont des panneaux séparés, finition client conservée',()=>{
 const js=read('production-admin-v4.js');
 assert.ok(js.includes("section('Couleur'"));
 assert.ok(js.includes("mir-v4-materials"));
 assert.ok(js.includes("Matériaux"));
 assert.ok(js.includes("append(element)"));
});
test('Le magasin et la boutique ne polluent pas la page de traçage admin',()=>{
 const css=read('production-admin-v4.css');
 assert.ok(css.includes('body.mir-admin-v4 .mir-destinations'));
 assert.ok(css.includes('body.mir-admin-v4 .production-header nav'));
 assert.ok(css.includes('body.mir-admin-v4 #mir-capture-toolbar'));
 assert.ok(css.includes('body.mir-admin-v4:not(.mir-v4-dossier-open) #production-order'));
});
test('Le parcours client ne charge pas la refonte admin',()=>{
 const js=read('production-admin-v4.js');
 assert.ok(js.includes("get('mode') === 'client') return"));
 assert.ok(read('production-admin-v4.css').includes('body.mir-admin-v4'));
});
test('Responsive tablette et téléphone, tailles tactiles et champs sans débordement',()=>{
 const css=read('production-admin-v4.css');
 assert.ok(css.includes('@media (max-width: 1150px)'));
 assert.ok(css.includes('@media (max-width: 650px)'));
 assert.ok(css.includes('grid-template-columns: minmax(0,1fr)'));
 assert.ok(css.includes('min-height: 44px'));
 assert.ok(css.includes('.fraction-field'));
});
test('Zoom 2D des moulures: boutons, pincement et molette',()=>{
 const js=read('production-app.js');
 assert.ok(js.includes("!client&&kind==='profile'&&view==='face'&&tool==='select'"));
 assert.ok(js.includes("tr.scale*=zoom"));
 assert.ok(js.includes("stage.addEventListener('wheel'"));
});
console.log('MIR atelier v4: '+count+' scénarios réussis');
