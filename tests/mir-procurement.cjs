'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const P=require('../dist/mir-procurement.js');
const M=require('../dist/production-model.js');
let n=0;
function test(name,fn){fn();n++;console.log('PASS '+name);}
const sampleSpec={kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2},length:120,quantity:2,material:{type:'acier',gauge:'26'},finish:{name:'Noir',manufacturer:'Test',code:'NOIR-TEST'},coloredFace:{side:'left',segmentId:'A'}};
const dossier={id:'DOS-TEST',poNumber:'PO-2026-1',project:'Chantier de test',items:[{id:'M001',kind:'profile',spec:sampleSpec}]};
const form={poNumber:'PO-2026-TEST',job:'Chantier fictif',shipTo:'123 rue Test, Québec',foreman:'Responsable',requestedDate:'2026-11-20',terms:'Sur compte',notes:''};
function supplier(){return {...P.seed()[0],verified:true};}
test('Quatre fournisseurs référencés et aucune adresse approuvée par défaut',()=>{
 assert.equal(P.seed().length,4);
 assert.deepEqual(P.seed().map(s=>s.id),['unico','breton','alnordica','pliage-quebec']);
 assert.ok(P.seed().every(s=>s.verified===false));
});
test('Les modifications de contact sont conservées lors du semis des fournisseurs',()=>{
 const customized={...P.seed()[0],email:'achat@entreprise-test.example',verified:true};
 const merged=P.mergeSuppliers([customized]);
 assert.equal(merged.length,4);
 assert.equal(merged[0].email,customized.email);
 assert.equal(merged[0].verified,true);
});
test('Le bon exige fournisseur confirmé et coordonnées de chantier',()=>{
 const errors=P.validatePo({...form,shipTo:''},P.seed()[0],dossier,{buildProfile:()=>({valid:true,complete:true})});
 assert.ok(errors.some(s=>/Vérifier le courriel/.test(s)));
 assert.ok(errors.some(s=>/adresse de livraison/.test(s)));
});
test('La vérification des cotes utilise le modèle de fabrication existant',()=>{
 const result=M.buildProfile(sampleSpec);
 assert.equal(result.valid,true);
 const errors=P.validatePo(form,supplier(),dossier,M);
 assert.equal(errors.length,0,errors.join(' ; '));
});
test('La création du bon conserve un instantané indépendant des pièces et du fournisseur',()=>{
 const s=supplier(),p=P.createPo(form,s,dossier);
 assert.equal(p.items.length,1);assert.equal(p.status,'brouillon');
 dossier.items[0].spec.dimensions.A=200;
 s.name='Autre';
 assert.equal(p.items[0].spec.dimensions.A,3);
 assert.equal(p.supplier.name,'Unico Revêtement Métallique');
 dossier.items[0].spec.dimensions.A=3;
});
test('Aucun document ne prétend avoir été envoyé',()=>{
 const p=P.createPo(form,supplier(),dossier);
 assert.equal(p.status,'brouillon');
 const printable=P.printHTML(p,M);
 assert.match(printable,/BON DE COMMANDE DE PLIAGE/);
 assert.match(printable,/avant corrections de pliage/);
 assert.match(printable,/ne prouve pas un envoi/);
});
test('Courriel prérempli seulement, sans pièce jointe ni statut envoyé',()=>{
 const p=P.createPo(form,supplier(),dossier);
 const u=P.mailtoDraft(p);
 assert.ok(u.startsWith('mailto:'));
 assert.match(decodeURIComponent(u),/JOINDRE LE PDF COTÉ/);
 assert.equal(p.status,'brouillon');
});
test('Injection HTML échappée dans le bon',()=>{
 const p=P.createPo({...form,job:'<script>alert(1)</script>'},supplier(),dossier);
 const html=P.printHTML(p,M);
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('&lt;script&gt;'));
});
test('Stockage local restaure sans détruire les fournisseurs déjà saisis',()=>{
 const initial=JSON.stringify({version:1,suppliers:[{id:'unico',name:'Mon nom de fournisseur',email:'a@example.com',verified:true}],orders:[]});
 const storage={getItem:k=>k==='mir_admin_procurement_v1'?initial:null};
 const state=P.readState(storage);
 assert.equal(state.suppliers.length,4);
 assert.equal(state.suppliers[0].name,'Mon nom de fournisseur');
 assert.equal(state.suppliers[0].verified,true);
});
test('Page admin charge les scripts et styles du module',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../dist/production.html'),'utf8');
 assert.match(html,/mir-procurement\.js\?v=orders-pdf-2/);
 assert.match(html,/mir-procurement\.css\?v=orders-pdf-2/);
});
test('Accès direct aux bons et fournisseurs sur la page principale',()=>{
 const script=fs.readFileSync(path.join(__dirname,'../dist/mir-procurement.js'),'utf8');
 assert.ok(script.includes("const requestedView=new URLSearchParams(win.location.search).get('view')"));
 assert.ok(script.includes("['orders','suppliers','models','panels'].includes(requestedView)"),'Accès direct aux bons, fournisseurs, modèles et nouvel onglet Panneaux');
 assert.ok(!script.includes("win.location.href='production.html?view=models'"));
});
console.log('MIR procurement: '+n+' tests OK');
