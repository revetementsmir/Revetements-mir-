'use strict';
/* Un mur = 10 panneaux = un vrai bon fournisseur, sans recopie ni doublons. */
const assert=require('node:assert/strict');
const E=require('../dist/panel-layout-engine.js');
const O=require('../dist/panel-layout-output.js');
const M=require('../dist/production-model.js');
const P=require('../dist/mir-procurement.js');
const W=require('../dist/mir-po-workflow.js');
const equal=(a,b)=>assert.equal(a,b);
const layout=E.build({widthIn:120,heightIn:96,lipIn:1,columns:5,rows:2,mode:'equal',precisionIn:0});
equal(layout.ok,true);equal(layout.pieces.length,10);
const meta={
 id:'MIR-MUR-10',name:'Mur arrière',revision:'A',project:'Chantier exemple',poNumber:'MIR-PO-EXEMPLE',
 sourceLabel:'Relevé chantier fictif',notes:'Exemple sans données client',
 material:{type:'aluminium',name:'Unico (test)',thickness:'2',thicknessUnit:'mm'},
 finish:{manufacturer:'Unico',name:'Noir fictif',code:'TEST-NOIR',selectionType:'manufacturer'},
 reliefIn:2,perforation:{enabled:false,edgeId:'bottom',details:''},
 dimensionsConfirmed:true
};
const payload=O.toTransfer(layout,meta);
equal(payload.items.length,10);
equal(O.validateTransfer(payload).items.length,10);
const order={id:'DOS-10',project:'',poNumber:'',items:[],layoutImports:[],nextNumber:1};
const imported=O.prepareImport(order,payload);
assert.ok(imported.ok,JSON.stringify(imported));
equal(imported.added,10);
equal(imported.order.items.length,10);
equal(new Set(imported.order.items.map(i=>i.id)).size,10);
for(const item of imported.order.items){
 equal(item.kind,'panel');
 assert.ok(item.snapshot?.schema==='mir-production-instance-1');
 assert.ok(item.sourceLayout?.transferId===payload.id);
 const model=M.buildPanel(item.spec);
 assert.ok(model.valid,'Géométrie '+item.id+': '+JSON.stringify(model.validation.errors));
 assert.ok(model.complete,'Pièce complète '+item.id+': '+JSON.stringify(model.validation.pending));
}
equal(order.items.length,0,'Dossier initial inchangé avant sauvegarde');
const duplicate=O.prepareImport(imported.order,payload);
assert.ok(duplicate.ok);equal(duplicate.alreadyImported,true);equal(duplicate.added,0);
equal(duplicate.order.items.length,10);
const changed={...payload,revision:'B'};
const rejected=O.prepareImport(imported.order,changed);
assert.ok(!rejected.ok,'Une charge altérée doit être rejetée');
const form={poNumber:'MIR-PO-EXEMPLE',job:'Chantier fictif',shipTo:'123 rue Atelier',foreman:'Équipe 1',requestedDate:'2026-12-01',terms:'À confirmer'};
const supplier={...P.seed()[0],verified:true};
const errors=P.validatePo(form,supplier,imported.order,M);
assert.deepEqual(errors,[],errors.join(' | '));
const po=P.createPo(form,supplier,imported.order);
equal(po.items.length,10);equal(po.status,'brouillon');
po.items.forEach((item,i)=>equal(item.sourceLayout.sourcePieceId,imported.order.items[i].sourceLayout.sourcePieceId));
assert.ok(P.printHTML(po,M).includes('PANNEAUX ET PLIAGES'));
assert.ok(P.printHTML(po,M).includes('lip'));
const pdf=W.pdfFaces(po,M);
assert.ok(pdf.length>=6,'Page de couverture + au moins 5 feuilles panneaux');
assert.ok(pdf.slice(1).some(face=>face.svg.includes('Panneau')));
const message=decodeURIComponent(P.mailtoDraft(po));
assert.ok(message.includes('dimensions'));
assert.ok(message.includes('JOINDRE LE PDF COTÉ'));
assert.ok(!po.pdf,'Le brouillon n’a pas été envoyé ou archivé automatiquement');
const profile={kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2},length:120,quantity:1,material:{type:'acier',gauge:'26'},finish:{manufacturer:'Test',name:'Noir',code:'NOIR'},coloredFace:{side:'left',segmentId:'A'}};
const mixed={...po,items:[...po.items,{id:'M011',kind:'profile',spec:profile}]};
assert.deepEqual(P.validatePo(form,supplier,{items:mixed.items},M),[]);
assert.ok(W.pdfFaces(mixed,M).length>=7,'Le PDF contient aussi la moulure');
const incomplete={...imported.order,items:imported.order.items.map((i,index)=>index===0?{...i,spec:{...i.spec,finish:{}}}:i)};
assert.deepEqual(P.validatePo(form,supplier,incomplete,M,{draftOnly:true}),[],'Brouillon local de panneaux incomplets autorisé');
assert.ok(P.validatePo(form,supplier,incomplete,M).some(s=>/incomplets/.test(s)),'Envoi/PDF refusé tant que la couleur manque');
assert.throws(()=>W.pdfFaces(P.createPo(form,supplier,incomplete),M),/Pièce incomplète/);
console.log('PASS MIR : mur 5 × 2, 10 panneaux intacts, anti-doublon, bon fournisseur, PDF, mélange et brouillon sécurisé');
