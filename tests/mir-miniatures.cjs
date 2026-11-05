'use strict';
/* MIR — cadrage géométrique des vignettes, sans dépendance navigateur. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../dist/production-model.js');
const P=require('../dist/mir-miniature.js');
const raw=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
let passed=0;
function test(name,run){run();passed++;console.log('PASS '+name);}
function profile(template,dimensions,unit='in'){
 return M.buildProfile({kind:'profile',unit,template,dimensions,length:120,quantity:1,material:{type:'acier'},finish:{system:'Kaycan',name:'Noir',code:'Noir'},coloredFace:{side:'left',segmentId:'A'}});
}
function checkModel(model,title){
 assert.equal(model.valid,true,title+' model invalid '+JSON.stringify(model.validation?.errors));
 const preview=P.render(model,M);
 assert.match(preview,/viewBox="0 0 120 120"/);
 assert.match(preview,/data-mir-miniature="profile"/);
 assert.doesNotMatch(preview,/mir-trace-grid|<image|<pattern|<rect|profile-side-marker/);
 const geom=P.project(model.pointsMM);
 assert.ok(geom,title+' projected');
 const mapped=geom.mapped,center=[0,1].map(i=>(Math.min(...mapped.map(p=>p[i]))+Math.max(...mapped.map(p=>p[i])))/2);
 assert.ok(Math.abs(center[0]-60)<.001&&Math.abs(center[1]-60)<.001,title+' centered '+center);
 const xs=mapped.map(p=>p[0]),ys=mapped.map(p=>p[1]);
 const longest=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 assert.ok(Math.abs(longest-96)<.001,title+' fills silhouette '+longest);
 assert.ok(mapped.every(([x,y])=>x>=11.999&&x<=108.001&&y>=11.999&&y<=108.001),title+' out of bounds');
}
test('L correctement centré dans un carré 120×120',()=>checkModel(profile('l',{A:3,B:2}),'L'));
test('J, Z et cache-poutre : même cadrage, pas de miniatures minuscules',()=>{
 for(const [id,dimensions] of Object.entries({j:{A:3,B:2,C:1},z:{A:3,B:2,C:1},beam5:{A:1,B:6,C:8,D:6,E:1}}))
  checkModel(profile(id,dimensions),id);
});
test('Le profil très haut est recentré et garde sa vraie proportion',()=>checkModel(profile('l',{A:0.2,B:20}),'profil étroit'));
test('Le profil très large est recentré et garde sa vraie proportion',()=>checkModel(profile('l',{A:20,B:0.2}),'profil large'));
test('Aucun pli ou cote n’est modifié pendant la génération de vignette',()=>{
 const model=profile('j',{A:3,B:2,C:1}),before=JSON.stringify(model);
 P.render(model,M);
 assert.equal(JSON.stringify(model),before);
});
test('Les panneaux utilisent une silhouette fermée et sans photo',()=>{
 const model=M.buildPanel({kind:'panel',shape:'rectangle',unit:'in',width:48,height:36,relief:2,lip:1,quantity:1,material:{type:'acier'},finish:{system:'Kaycan',code:'Noir'}});
 assert.equal(model.valid,true,JSON.stringify(model.validation?.errors));
 const svg=P.render(model,M);
 assert.match(svg,/data-mir-miniature="panel"/);
 assert.match(svg,/<polygon/);
 assert.doesNotMatch(svg,/<image|<pattern/);
});
test('Le code charge le nouveau rendu sans supprimer le moteur du dessin',()=>{
 const app=raw('production-app.js'),html=raw('production.html');
 assert.ok(app.includes('window.MIRMiniature?.render(model,M)'));
 assert.ok(app.includes('diagramSVG(model,{small:true,interactive:false})'));
 assert.ok(html.includes('mir-miniature.js?v=1'));
 assert.ok(html.includes('production-model.js'));
});
test('Les espaces Boutique, Bons de commande et modèles partagent un fond discret',()=>{
 assert.ok(raw('commerce.css').includes('body.commerce { background:#f7f8f3; }'));
 assert.ok(raw('mir-procurement.css').includes('Harmonisation de surfaces'));
 assert.ok(raw('custom-model-cards.css').includes('Cartes des modèles partagées'));
});
console.log('MIR miniatures: '+passed+'/'+passed+' contrôles réussis');
