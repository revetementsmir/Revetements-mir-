'use strict';
/* MIR client: pure locale and PDF tests without altering saved business data. */
const assert=require('node:assert/strict');
const dictionary=require('../dist/mir-client-en-ca.js');
const locale=require('../dist/mir-client-i18n.js');
const PDF=require('../dist/mir-selection-pdf.js');
let checks=0;
function check(label,action){action();checks++;console.log('PASS '+label);}
check('Canadian-English dictionary and source preservation',()=>{
 assert.equal(dictionary['Pliage sur mesure'],'Custom metal bending');
 assert.equal(dictionary['Réalisations'],'Projects');
 assert.equal(locale.translate('Panier','en-CA'),'Cart');
 assert.equal(locale.translate('Panier','fr-CA'),'Panier');
 assert.equal(locale.translate('Référence non répertoriée','en-CA'),'Référence non répertoriée');
});
check('French default and CAD localization',()=>{
 assert.equal(locale.getLocale(),'fr-CA');
 assert.match(locale.cad(25.5,'en-CA'),/25[.,]50/);
 assert.match(locale.cad(25.5,'fr-CA'),/25[.,]50/);
 assert.match(locale.date(new Date('2026-11-15T14:00:00Z'),'en-CA',{timeZone:'America/Toronto',year:'numeric',month:'short',day:'numeric'}),/2026/);
});
check('Staff, warehouse, studio Admin and supplier interfaces are excluded',()=>{
 for(const page of ['chantier.html','entrepot.html','coordination.html','metres.html','calepinage.html','production.html']){
  assert.equal(locale.isClient('/site/'+page,''),false,page);
 }
 for(const page of ['index.html','boutique.html','selection.html','pliage.html','plan.html','contact.html','realisations.html','estimation.html']){
  assert.equal(locale.isClient('/site/'+page,''),true,page);
 }
 assert.equal(locale.isClient('/production.html','?mode=client&kind=profile'),true);
 assert.equal(locale.isClient('/production.html','?mode=client&source=store'),false);
 assert.equal(locale.isClient('/production.html','?mode=admin'),false);
});
const item=Object.freeze({materialId:'item-1',brand:'James Hardie',name:'HardiePlank Cedarmill',colorName:'Arctic White',manufacturerReference:'SKU-A123',formatName:'4 × 8 pi',quantity:2.5,unit:'pi²'});
const input={project:'Maison Tremblay',items:[item],reference:'Dossier 2026-A'};
const snapshot=JSON.stringify(input);
const fr=PDF.buildOptions({...input,locale:'fr-CA'});
const en=PDF.buildOptions({...input,locale:'en-CA'});
check('PDF exports preserve product, manufacturer names, SKU, colour and geometry',()=>{
 assert.equal(JSON.stringify(input),snapshot);
 assert.equal(fr.faces.length,en.faces.length);
 assert.equal(fr.faces[0].layout,en.faces[0].layout);
 assert.match(en.faces[0].svg,/viewBox="0 0 850 1100"/);
 for(const label of ['HardiePlank Cedarmill','Arctic White','SKU-A123','James Hardie','Maison Tremblay']){
  assert.ok(fr.faces[0].svg.includes(label),label);
  assert.ok(en.faces[0].svg.includes(label),label);
 }
});
check('English PDF heading, filename and warnings without fake checkout',()=>{
 assert.equal(fr.filename,'MIR-selection-materiaux.pdf');
 assert.equal(en.filename,'MIR-materials-selection-en-CA.pdf');
 assert.match(fr.faces[0].svg,/Projet : Maison Tremblay/);
 assert.match(en.faces[0].svg,/Project: Maison Tremblay/);
 assert.match(en.faces[0].svg,/Preparation document: this is NOT an order/);
 assert.match(en.faces[0].svg,/MIR must confirm pricing/);
 assert.doesNotMatch(en.faces[0].svg,/Projet :|ne constitue PAS une commande|QUANTITÉ|UNITÉ/);
});
check('Identical validations fail safely in both locales',()=>{
 for(const lang of ['fr-CA','en-CA']){
  assert.throws(()=>PDF.buildOptions({items:[{...item,quantity:0}],locale:lang}),/ligne|line/);
  assert.throws(()=>PDF.buildOptions({items:[],locale:lang}),/Aucun matériau|No materials/);
 }
});
console.log('MIR client locale: '+checks+' contract groups passed');
