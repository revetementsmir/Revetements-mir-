'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const W=require('../dist/mir-po-workflow.js'),P=require('../dist/mir-procurement.js'),M=require('../dist/production-model.js');
const spec={kind:'profile',template:'l',unit:'in',dimensions:{A:'3 1/2',B:2},length:120,quantity:2,material:{type:'acier',gauge:'26'},finish:{name:'Noir',manufacturer:'Test',code:'NOIR'},coloredFace:{side:'left',segmentId:'A'}};
const make=()=>P.createPo({poNumber:'PO-TEST',job:'Chantier',shipTo:'Adresse',notes:'Note',foreman:'Chef Test',requestedDate:'2026-12-01'}, {...P.seed()[0],verified:true},{id:'dossier',items:[{id:'M001',spec}]});
test('Modifier un brouillon sans toucher sa copie précédente',()=>{
  const o=make(),n=W.saveDraft(o,{items:[{id:'M002',spec:{...spec,quantity:4}}]});
  assert.equal(o.items[0].spec.quantity,2);assert.equal(n.items[0].spec.quantity,4);assert.equal(n.id,o.id);
});
test('PDF ou envoi fige la version; révision et recommandation restent distinctes',()=>{
  const o={...make(),status:'envoye',sendReceipt:{messageId:'receipt'},pdf:{sha256:'old'}};const before=JSON.stringify(o);
  assert.throws(()=>W.saveDraft(o,{job:'Autre'}));
  const r=W.edit(o,[o],{id:'revision'});assert.equal(r.revision,2);assert.equal(r.rootId,o.id);assert.equal(r.pdf,undefined);assert.equal(r.sendReceipt,undefined);
  r.items[0].spec.dimensions.A=10;assert.equal(JSON.stringify(o),before);
  const r3=W.edit(o,[o,r],{id:'revision3'});assert.equal(r3.revision,3);
  const repeat=W.edit(o,[o],{id:'repeat',reorder:true,number:'PO-NEW'});assert.equal(repeat.revision,1);assert.equal(repeat.rootId,'repeat');assert.equal(repeat.status,'brouillon');
});
test('Aucun changement manuel ne peut inventer une preuve d’envoi',()=>{
  assert.throws(()=>W.changeStatus(make(),'envoye'),/preuve serveur/);
  const n=W.changeStatus(make(),'a_valider');assert.equal(n.events.at(-1).type,'statut-manuel');
  const sent={...make(),status:'envoye_manuellement'};
  assert.equal(W.frozen(W.changeStatus(sent,'brouillon')),true,'un changement de statut ne doit pas dégeler un ancien bon envoyé');
});
test('Recherche historique par fournisseur, numéro, chantier et date',()=>{
  const a=make(),b={...make(),id:'archived',status:'termine',createdAt:'2026-01-02T12:00:00Z'};
  assert.equal(W.search([a,b],{history:true,query:'unico',date:'2026-01-02'}).length,1);
  assert.equal(W.search([a,b],{history:false,query:'chantier'}).length,1);
  assert.equal(W.search([a,b],{history:true,query:'introuvable'}).length,0);
});
test('PDF réutilise les vrais dessins cotés et conserve les métadonnées',()=>{
  const o=make(),faces=W.pdfFaces(o,M);assert.ok(faces.length>=2);
  assert.deepEqual(faces[0].summary,['Note'],'le moteur PDF attend une liste pour les notes');
  assert.match(faces[0].svg,/PO-TEST/);assert.match(faces[0].svg,/Adresse/);
  const drawings=faces.slice(1).map(f=>f.svg).join('');assert.match(drawings,/<svg/);assert.match(drawings,/3 1\/2|3½|3\.5/);assert.match(drawings,/Noir/);assert.match(drawings,/Chef Test/);assert.match(drawings,/2026-12-01/);
  assert.throws(()=>W.pdfFaces({...o,items:[{id:'bad',spec:{kind:'profile',template:'l',dimensions:{A:-1}}}]},M),/incomplète/);
});
