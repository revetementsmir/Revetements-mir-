'use strict';
/* Règles de vente et compatibilité de dossiers historiques, sans toucher au moteur de fabrication. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const L=require('../dist/mir-bending-lengths.js');
const P=require('../dist/production-model.js');
const source=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
let n=0;
function test(name,fn){fn();n++;console.log('PASS '+name);}
test('Une moulure standard est livrée en 120 po',()=>assert.equal(L.requiredLengthIn('l'),120));
test('Le J générique est de 10 pi',()=>assert.equal(L.requiredLengthIn('j'),120));
test('Un coin J intégré ne reçoit pas par erreur le 12 pi',()=>assert.equal(L.requiredLengthIn('coin_arch_j'),120));
test('Seul le J à soffite identifié est en 144 po',()=>assert.equal(L.requiredLengthIn('j_soffite'),144));
test('La longueur exacte 120 est admise sur une nouvelle commande',()=>assert.equal(L.check({profileId:'l',lengthIn:120}).ok,true));
test('La longueur exacte 144 du J soffite est admise',()=>assert.equal(L.check({profileId:'j_soffite',lengthIn:144}).ok,true));
test('La longueur 144 est refusée sur le J générique',()=>assert.equal(L.check({profileId:'j',lengthIn:144}).ok,false));
test('Les longueurs 96, 100 et 0 sont refusées sur les nouvelles commandes',()=>{for(const x of [96,100,0])assert.equal(L.check({profileId:'l',lengthIn:x}).ok,false);});
test('Les millimètres après conversion respectent les deux formats',()=>{for(const x of [120,144])assert.equal(L.check({profileId:x===120?'l':'j_soffite',lengthIn:x*25.4/25.4}).ok,true);});
test('L ancienne pièce 96 peut être révisée sans changer la longueur',()=>{const x=L.check({profileId:'l',lengthIn:96,previousLengthIn:96});assert.equal(x.ok,true);assert.equal(x.legacy,true);});
test('Une longueur historique changée ne bénéficie pas de l exception',()=>assert.equal(L.check({profileId:'l',lengthIn:100,previousLengthIn:96}).ok,false));
test('Un modèle préexistant reste valide pour lecture et PDF',()=>{const x=P.buildProfile({kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2},length:96,quantity:1});assert.equal(x.valid,true);assert.equal(x.lengthMM,96*25.4);});
test('Le configurateur principal charge le moteur avant son application',()=>{const s=source('production.html');assert.ok(s.indexOf('mir-bending-lengths.js')<s.indexOf('production-app.js'));});
test('Le configurateur standalone réutilise la même règle',()=>{const s=source('pliage.html');assert.ok(s.indexOf('mir-bending-lengths.js')<s.indexOf('pliage.js'));});
test('L identifiant J soffite est distinct dans le configurateur',()=>{assert.ok(source('production-app.js').includes("j_soffite:{name:"));assert.ok(source('pliage.js').includes("j_soffite:{name:"));});
test('Les modifications historiques restent séparées des snapshots',()=>{const s=source('production-app.js');assert.ok(s.includes('stockProfileType:spec.mirProfileId'));assert.ok(s.includes('previousLengthIn:former?.ok'));});
console.log('MIR longueurs: '+n+' tests réussis.');
