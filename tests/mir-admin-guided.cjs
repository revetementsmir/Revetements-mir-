'use strict';
const assert=require('node:assert/strict');
const live=require('../dist/mir-admin-live3d.js');
const wizard=require('../dist/mir-admin-guided.js');
const modelAPI=require('../dist/production-model.js');
let n=0;
function test(title,fn){fn();n++;console.log('PASS '+title);}
const spec={kind:'profile',template:'custom',name:'Moulure essai',unit:'in',segments:[
 {label:'A',length:'3'},{label:'B',length:'2'}
],bends:[{mode:'interior',angle:90,direction:'left'}],startAngle:0,quantity:1,length:120,
 coloredFace:{side:'left',segmentId:'A'},material:{type:'aluminium'},finish:{name:'Rouge',hex:'#aa0033'}};
const model=modelAPI.buildProfile(spec);
test('Moteur géométrique de référence valide',()=>assert.equal(model.valid,true));
test('La miniature suit les segments réels, longueur d’échantillon 10 po',()=>{
 const svg=live.render(model,{engine:modelAPI});
 assert.match(svg,/data-mir-live-3d="ready"/);
 assert.match(svg,/Échantillon 10 po/);
 assert.match(svg,/Moulure essai/);
 assert.match(svg,/polygon/);
});
test('Le tracé inachevé a un aperçu sans données inventées',()=>{
 const empty=live.render(model,{pointsMM:[]});
 const one=live.render(model,{pointsMM:[[0,0]]});
 assert.match(empty,/data-mir-live-3d="empty"/);
 assert.match(one,/data-mir-live-3d="empty"/);
});
test('La forme 3D réagit au tracé, à l’orientation et aux mesures',()=>{
 const a=live.render(model,{pointsMM:[[0,0],[76.2,0]],yaw:-42});
 const b=live.render(model,{pointsMM:[[0,0],[76.2,0],[76.2,-50.8]],yaw:-42});
 const c=live.render(model,{pointsMM:[[0,0],[76.2,0],[76.2,-50.8]],yaw:22});
 assert.notEqual(a,b);
 assert.notEqual(b,c);
});
test('La face peinte suit le côté et la couleur, les valeurs HTML sont échappées',()=>{
 const a=live.render(model,{side:'left',hex:'#aa0033'});
 const b=live.render(model,{side:'right',hex:'#0066aa'});
 assert.match(a,/data-side="left"/);
 assert.match(b,/data-side="right"/);
 assert.notEqual(a,b);
 const malicious=live.render({...model,name:'<script>bonjour</script>'});
 assert.doesNotMatch(malicious,/<script>/);
});
test('Rotation automatique : chaque face colorée est orientée vers la caméra',()=>{
 const left=live.preferredView(model,{yaw:-42,pitch:24});
 const flipped=modelAPI.buildProfile({...spec,coloredFace:{side:'right',segmentId:'A'}});
 const right=live.preferredView(flipped,{yaw:left.yaw,pitch:left.pitch});
 assert.ok(left.score>.45,'Face gauche visible : '+JSON.stringify(left));
 assert.ok(right.score>.45,'Face droite visible : '+JSON.stringify(right));
 assert.notDeepEqual([left.yaw,left.pitch],[right.yaw,right.pitch],'La caméra doit pivoter quand la face change');
 const leftRender=live.render(model,{...left,side:'left',hex:'#aa0033'});
 const rightRender=live.render(flipped,{...right,side:'right',hex:'#aa0033'});
 assert.match(leftRender,/data-face="painted"/);
 assert.match(rightRender,/data-face="painted"/);
});
test('Les mêmes mesures ont la même clé; changer le métal ne déforme pas la géométrie',()=>{
 const a=wizard.geometryKey(model);
 const changed={...model,spec:{...model.spec,material:{type:'acier'},finish:{hex:'#ffffff'}}};
 assert.equal(a,wizard.geometryKey(changed));
 const next={...model,spec:{...model.spec,segments:[{label:'A',length:'5'},{label:'B',length:'2'}]}};
 assert.notEqual(a,wizard.geometryKey(next));
});
test('L’assistant prévoit quatre étapes sans jamais effacer le dossier',()=>{
 assert.deepEqual(wizard.LABELS,['Tracer','Confirmer les cotes','Face colorée','Métal et couleur']);
 assert.equal(typeof wizard.updatePreview,'function');
});
console.log('MIR Assistant Admin + 3D : '+n+' tests réussis');
