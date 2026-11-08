'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/panel-layout-engine.js');
const O=require('../dist/panel-layout-output.js');
const M=require('../dist/production-model.js');
const W=require('../dist/mir-po-workflow.js');
const P=require('../dist/mir-procurement.js');
const shape=E.build({widthIn:120,heightIn:96,lipIn:1,columns:5,rows:2,mode:'equal',precisionIn:0});
assert.equal(shape.ok,true,JSON.stringify(shape.errors));
assert.equal(shape.pieces.length,10);
const meta={id:'TEST-ONE-SHEET',name:'Mur fictif',revision:'A',project:'Chantier test',poNumber:'PO-UN-PANNEAU',
 sourceLabel:'Exemple fictif',notes:'Ne pas transmettre',dimensionsConfirmed:true,reliefIn:2,
 material:{type:'aluminium',thickness:'2',thicknessUnit:'mm'},
 finish:{manufacturer:'Unico',name:'Noir de test',code:'NOIR-TEST',selectionType:'manufacturer'},
 perforation:{enabled:false,edgeId:'bottom',details:''}};
const payload=O.toTransfer(shape,meta);
const dossier={id:'DOS-PDF-10',items:[],layoutImports:[],nextNumber:1};
const imported=O.prepareImport(dossier,payload);
assert.equal(imported.ok,true,JSON.stringify(imported));
assert.equal(imported.added,10);
const fake={...P.seed()[0],verified:true};
const form={poNumber:'PO-10-PANNEAUX',job:'Exemple fictif',shipTo:'123 rue de test, Québec',notes:'NE PAS ENVOYER',foreman:'Responsable de test',requestedDate:'2026-12-01'};
const po=P.createPo(form,fake,imported.order);
const before=JSON.stringify(po);
const faces=W.pdfFaces(po,M);
assert.equal(faces.length,11,'Une couverture et dix pages de panneaux');
assert.equal((faces[0].svg.match(/data-mir-panel-wall=/g)||[]).length,10,'Vue de principe : un repère par panneau');
assert.match(faces[0].svg,/SCHÉMA DE REPÉRAGE/);
// The previous PDF visually crossed the panel lines with long "Gauche · Lip 1 po"
// callouts. Keep short side names entirely OUTSIDE the outer-envelope contour.
function assertSideCallouts(svg,names){
 const main=svg.match(/<path data-mir-panel-main="[^"]+" d="([^"]+)"/);
 assert.ok(main,'Main measured panel contour');
 const pairs=[...main[1].matchAll(/(?:M|L)\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
  .map(m=>[Number(m[1]),Number(m[2])]);
 assert.ok(pairs.length>=3,'Un panneau a au moins trois sommets');
 const xs=pairs.map(p=>p[0]),ys=pairs.map(p=>p[1]);
 const outer={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
 const boxes=[...svg.matchAll(/<rect data-mir-side-label-box="([^"]+)" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g)]
 .map(a=>({id:a[1],x:Number(a[2]),y:Number(a[3]),w:Number(a[4]),h:Number(a[5])}));
 const labels=[...svg.matchAll(/<text[^>]*data-mir-lip-label="([^"]+)"[^>]*>([^<]+)<\/text>/g)]
 .map(m=>m[2]);
 assert.deepEqual(new Set(labels),new Set(names),'Uniquement les noms des vrais côtés : pas de lip ni mesure sur l’étiquette');
 assert.equal(labels.length,names.length,'Un nom par côté');
 assert.equal(boxes.length,labels.length,'Un encadré par étiquette');
 const overlaps=(a,b,pad=0)=>a.x<a.w+b.x+pad&&a.x+a.w+pad>b.x&&a.y<a.y+b.h+pad&&a.y+a.h+pad>b.y;
 for(let i=0;i<boxes.length;i++){
  const a=boxes[i];
  assert.ok(Number.isFinite(a.x+a.y+a.w+a.h));
  const insideX=Math.min(a.x+a.w,outer.x+outer.w)-Math.max(a.x,outer.x);
  const insideY=Math.min(a.y+a.h,outer.y+outer.h)-Math.max(a.y,outer.y);
  assert.ok(insideX<=0||insideY<=0,'L’étiquette '+a.id+' ne recouvre aucun trait du panneau');
  for(let j=0;j<i;j++){
   const b=boxes[j],ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
   assert.ok(ox<=0||oy<=0,'Étiquettes de côtés sans superposition');
  }
 }
}

const refs=new Set();
for(let i=1;i<faces.length;i++){
 const f=faces[i],main=(f.svg.match(/data-mir-panel-main=/g)||[]);
 assert.equal(main.length,1,'Un seul contour géométrique principal sur la fiche '+i);
 assert.equal(f.svg.includes('SUITE, ne pas compter'),false,'Aucune répétition du panneau');
 assert.equal((f.svg.match(/data-mir-lip-label=/g)||[]).length,4,'Le dessin montre les quatre lèvres nommées, même sans lip');
 assert.equal((f.svg.match(/data-mir-lip-inner=/g)||[]).length,1,'La face intérieure suit les retours réels du modèle');
 assert.equal((f.svg.match(/data-mir-dimension-a=/g)||[]).length,1,'A est une vraie ligne de cote largeur hors tout');
 assert.equal((f.svg.match(/data-mir-dimension-b=/g)||[]).length,1,'B est une vraie ligne de cote hauteur hors tout');
 assert.equal((f.svg.match(/data-mir-ab-summary=/g)||[]).length,2,'A et B hors tout visibles en grand');
 assertSideCallouts(f.svg,['Bas','Droite','Haut','Gauche']);
 assert.equal((f.svg.match(/data-mir-side-label-box=/g)||[]).length,4,'Quatre étiquettes extérieures sans chevauchement');
 assert.match(f.svg,/>1 po<\/text>/,'La largeur de lip est conservée au tableau de fabrication');
 assert.equal((f.svg.match(/<circle/g)||[]).length,0,'Plus de numéros 1-2-3-4 isolés sur le dessin');

 assert.match(f.svg,/CÔTÉS, LIPS ET ANGLES/,'Cotes + lèvres sur la même fiche');
 assert.match(f.svg,/QTÉ 1/,'Quantité visible sur la même fiche');
 refs.add(f.name);
}
assert.equal(refs.size,10,'10 repères différents sur dix fiches');
assert.equal(JSON.stringify(po),before,'Génération sans modifier les pièces ou le PO');
const profSpec={kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2},length:120,quantity:1,material:{type:'acier',gauge:'26'},finish:{name:'Noir',manufacturer:'Test',code:'TEST'},coloredFace:{side:'left',segmentId:'A'}};
const profPo=P.createPo(form,fake,{id:'PROF',items:[{id:'M111',kind:'profile',spec:profSpec}]});
const original=W.pdfFaces(profPo,M);
assert.ok(original.length>=2,'Bon de moulures préservé');
const mixed={...po,items:po.items.concat({id:'M111',kind:'profile',spec:profSpec})};
const mixedFaces=W.pdfFaces(mixed,M);
assert.ok(mixedFaces.length>faces.length,'La moulure ajoutée conserve sa fiche distincte');
assert.equal(mixedFaces.slice(1,11).reduce((n,f)=>n+(f.svg.match(/data-mir-panel-main=/g)||[]).length,0),10,'Aucun panneau ajouté deux fois en mélange');
assert.throws(()=>W.pdfFaces({...po,items:[po.items[0],po.items[0]]},M),/Repères répétés/,'Références dupliquées refusées');
const unknown={...po.items[0],spec:{...po.items[0].spec,finish:{}}};
assert.throws(()=>W.pdfFaces({...po,items:[unknown]},M),/Pièce incomplète/,'PDF non généré quand la couleur manque');

const PDraw=require('../dist/mir-panel-po-pdf.js');
const triangleSpec={...po.items[0].spec,shape:'right-triangle',rightAngle:'bottom-left',width:'48',height:'36',
 lips:{bottom:'1',slope:0,left:'2'},bottomEdgeId:'bottom',perforation:{enabled:false,edgeId:'bottom'}};
const triangleModel=M.buildPanel(triangleSpec);
assert.equal(triangleModel.valid,true,JSON.stringify(triangleModel.validation.errors));
assert.equal(triangleModel.edges.length,3,'Un triangle n’a pas de quatrième côté inventé');
const triangleSvg=PDraw.previewSVG(triangleModel,M);
assert.equal((triangleSvg.match(/data-mir-lip-label=/g)||[]).length,3,'Trois lèvres, chacune reliée à son véritable côté');
assertSideCallouts(triangleSvg,['Base','Pente','Gauche']);
assert.equal((triangleSvg.match(/data-mir-side-label-box=/g)||[]).length,3,'Les trois étiquettes du triangle sont extérieures');
assert.equal((triangleSvg.match(/data-mir-lip-inner=/g)||[]).length,1,'Le contour des lips reste géométriquement exact, même sans lip sur la pente');
assert.match(triangleSvg,/A · LARGEUR HORS TOUT : 48 po/);
assert.match(triangleSvg,/B · HAUTEUR HORS TOUT : 36 po/);
assert.equal((triangleSvg.match(/data-mir-panel-main=/g)||[]).length,1,'Un seul dessin géométrique pour le triangle');

console.log('PASS MIR GOD MODE: un bon = 10 repères = 10 fiches uniques, aucun doublon, pas de SUITE, moulures préservées');
