'use strict';
const assert=require('node:assert/strict');
const A=require('../dist/mir-panel-workbench.js');
const M=require('../dist/production-model.js');
const E=require('../dist/panel-layout-engine.js');
const O=require('../dist/panel-layout-output.js');
const V=require('../dist/production-volume.js');
const layout=E.build({widthIn:120,heightIn:96,lipIn:1,columns:5,rows:2,mode:'equal',precisionIn:0});
assert.equal(layout.ok,true);
const meta={id:'ZONE-ADJOINTE',name:'Mur arrière',revision:'A',project:'Chantier exemple',poNumber:'DEMO-MIR',sourceLabel:'Relevé fictif',
 dimensionsConfirmed:true,reliefIn:2,material:{type:'aluminium',thickness:'2',thicknessUnit:'mm'},
 finish:{manufacturer:'Unico',name:'Noir test',code:'TEST',selectionType:'manufacturer'},
 perforation:{enabled:false,edgeId:'bottom',details:''}};
const order={id:'D-ADJOINTE',items:[],layoutImports:[]};
const transfer=O.prepareImport(order,O.toTransfer(layout,meta));
assert.equal(transfer.ok,true,JSON.stringify(transfer));
assert.equal(transfer.order.items.length,10);
const start=A.render({dossier:order,api:M,volume:V});
assert.match(start,/Un mur complet/);
assert.match(start,/Un panneau seul/);
assert.equal((start.match(/data-mir-wb-pick=/g)||[]).length,0,'Pas de dix cartes en dossier vide');
const html=A.render({dossier:transfer.order,activeId:transfer.order.items[2].id,api:M,volume:V});
assert.equal((html.match(/data-mir-wb-pick=/g)||[]).length,10,'10 repères de mur réels');
assert.equal((html.match(/class="mir-wb-drawing"/g)||[]).length,1,'Une seule pièce développée');
assert.equal((html.match(/data-mir-panel-include=/g)||[]).length,1,'Une commande inclure par pièce active');
assert.equal((html.match(/data-panel-volume=/g)||[]).length,1,'3D du même panneau');
assert.match(html,/Panneau 3 SUR 10/i);
const filtered=A.render({dossier:transfer.order,api:M,volume:V,excludedIds:[transfer.order.items[0].id,transfer.order.items[4].id]});
assert.match(filtered,/8 panneau\(x\) sélectionné\(s\)/,'Dossier source intact, nombre ajusté');
const rows=A.orderRows(transfer.order.items,M);
assert.equal((rows.match(/data-mir-po-piece=/g)||[]).length,10,'10 lignes de bon, aucune répétition');
assert.equal((rows.match(/<svg/g)||[]).length,0,'Bon compact : dessins détaillés au PDF uniquement');
assert.equal(order.items.length,0,'Aucun changement de source du calcul');
console.log('PASS MIR : choix novice, un dessin principal, dix repères, 3D liée et bon compact sans doublon');
