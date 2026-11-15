'use strict';
/* Bilingual panel fabrication sheets: visual text changes, exact geometry does not. */
const assert=require('node:assert/strict');
const E=require('../dist/panel-layout-engine.js');
const O=require('../dist/panel-layout-output.js');
const M=require('../dist/production-model.js');
const P=require('../dist/mir-procurement.js');
const path=require.resolve('../dist/mir-panel-po-pdf.js');
const layout=E.build({widthIn:120,heightIn:96,lipIn:1,columns:2,rows:1,mode:'equal',precisionIn:0});
assert.equal(layout.ok,true);
const meta={id:'MIR-BILINGUAL-PDF-QA',name:'Mur fictif',revision:'A',project:'Maison témoin',poNumber:'MIR-QA-EN',
 sourceLabel:'Plan fictif',notes:'Client name unchanged',material:{type:'aluminium',name:'Unico (QA)',thickness:'2',thicknessUnit:'mm'},
 finish:{manufacturer:'Unico',name:'Arctic White',code:'COLOR-QA',selectionType:'manufacturer'},reliefIn:2,
 perforation:{enabled:false,edgeId:'bottom',details:''},dimensionsConfirmed:true};
const imported=O.prepareImport({id:'QA',project:'',poNumber:'',items:[],layoutImports:[],nextNumber:1},O.toTransfer(layout,meta));
assert.equal(imported.ok,true);
const form={poNumber:'MIR-QA-EN',job:'Maison témoin',shipTo:'123, rue Atelier',foreman:'Équipe de test',requestedDate:'2026-12-01',terms:'À confirmer'};
const po=P.createPo(form,{...P.seed()[0],verified:true},imported.order);
const inputSnapshot=JSON.stringify(po);
const fr=require('../dist/mir-panel-po-pdf.js').makeFaces(po,M);
const frSvg=fr.map(face=>face.svg);
delete require.cache[path];
global.window={location:{pathname:'/production.html',search:'?mode=client&kind=panel'},MIRClientLocale:{isClient:()=>true,getLocale:()=> 'en-CA'}};
const en=require('../dist/mir-panel-po-pdf.js').makeFaces(po,M);
delete global.window;
assert.equal(JSON.stringify(po),inputSnapshot,'purchase order source unchanged');
assert.equal(fr.length,en.length,'same pages');
assert.match(fr[0].svg,/BON DE COMMANDE/);
assert.match(en[0].svg,/PURCHASE ORDER/);
assert.match(en[0].svg,/NO AUTOMATIC SUBMISSION/);
assert.match(en[1].svg,/FABRICATION SHEET/);
assert.doesNotMatch(en[0].svg,/BON DE COMMANDE|PIÈCES À FABRIQUER|COTES FINIES/);
const geom=(str)=>([...str.matchAll(/<path[^>]*\bdata-mir-panel-main="[^"]+"[^>]*d="([^"]+)"/g)]).map(x=>x[1]);
for(let i=0;i<fr.length;i++){
 const f=geom(frSvg[i]),e=geom(en[i].svg);
 assert.deepEqual(e,f,'panel path geometry must match on page '+i);
}
assert.match(en[0].svg,/Maison témoin/,'user-entered project name remains unchanged');
assert.match(en[1].svg,/Arctic White/,'manufacturer colour name unchanged');
console.log('PASS MIR PDF panel FR/EN: page count, geometry, colour, codes and quantity unchanged');
