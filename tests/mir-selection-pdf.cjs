'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const PDF=require('../dist/mir-selection-pdf.js');
const dist=path.resolve(__dirname,'../dist');
function fixture(index=1){return {materialId:'mir-'+index,brand:'Fabricant Québec',name:'Revêtement à relief '+index,colorName:'Cèdre & noir <édition>',formatName:'4 × 8 pi',quantity:index+0.5,unit:'pi²'};}
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('PDF non transactionnel généré depuis les données de sélection',()=>{
  const options=PDF.buildOptions({project:'Projet Tremblay',items:[fixture()]});
  assert.equal(PDF.version,'1.0.0');
  assert.equal(options.filename,'MIR-selection-materiaux.pdf');
  assert.equal(options.faces.length,1);
  const svg=options.faces[0].svg;
  assert.match(svg,/Projet : Projet Tremblay/);
  assert.match(svg,/Revêtement à relief 1/);
  assert.match(svg,/Fabricant Québec/);
  assert.match(svg,/4 × 8 pi/);
  assert.match(svg,/Cèdre &amp; noir &lt;édition&gt;/);
  assert.match(svg,/ne constitue PAS une commande/);
  assert.match(svg,/Prix, stocks, unités de vente/);
  assert.doesNotMatch(svg,/<script|<foreignObject|<image/i);
});
test('Plusieurs pages sans tronquer les produits de la sélection',()=>{
  const opts=PDF.buildOptions({project:'Projet A',items:Array.from({length:22},(_,i)=>fixture(i+1))});
  assert.ok(opts.faces.length>=2);
  assert.equal(opts.faces.map(x=>(x.svg.match(/font-weight="700">(\d{2})<\/text>/g)||[]).length).reduce((a,n)=>a+n,0),22);
  assert.ok(opts.faces.every(f=>/SÉLECTION DE MATÉRIAUX/.test(f.svg)));
});
test('Articles exclus annoncés sans ajouter des prix fictifs',()=>{
  const opts=PDF.buildOptions({project:'Un projet',items:[fixture()],excludedCount:2});
  assert.match(opts.faces[0].svg,/2 référence\(s\) masquée\(s\)/);
  assert.doesNotMatch(opts.faces[0].svg,/Prix total|TVA|TPS|TVQ|checkout/i);
});
test('Sélection vide, quantité impossible ou structure invalide sont refusées',()=>{
  for(const values of [[],null])assert.throws(()=>PDF.buildOptions({items:values}),/Aucun matériau|invalide/);
  for(const quantity of [0,-1,Infinity,1000001,NaN]){
    assert.throws(()=>PDF.buildOptions({items:[{...fixture(),quantity}]}),/Quantité/);
  }
});
test('HTML existant conserve JSON et ajoute PDF avec le moteur original',()=>{
  const html=fs.readFileSync(path.join(dist,'selection.html'),'utf8');
  const js=fs.readFileSync(path.join(dist,'commerce.js'),'utf8');
  assert.match(html,/mir-selection-pdf\.js\?v=1/);
  assert.match(html,/id="selection-export-pdf"/);
  assert.match(html,/id="selection-export"/);
  assert.match(html,/id="selection-pdf-status" role="status" aria-live="polite"/);
  assert.match(js,/MIRSelectionPDF\.buildOptions/);
  assert.match(js,/MIRPDF\.exportPlan/);
  assert.match(js,/MIR-selection-materiaux\.json/);
  assert.doesNotMatch(html,/action="https:\/\/.*"/);
});
console.log('MIR sélection PDF : '+checks+'/'+checks+' vérifications réussies');
