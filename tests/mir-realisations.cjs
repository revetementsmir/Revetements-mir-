'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const names=['realisations-mir-contemporain-brun','realisations-mir-contrastes','realisations-mir-classique'];
let tests=0;function test(label,fn){fn();tests++;console.log('PASS '+label)}
test('L’accueil vitrine ouvre la galerie dédiée et redirige les anciens liens',()=>{
 const html=read('index.html');
 assert.match(html,/href="realisations\.html">Réalisations/);
 assert.match(html,/'#au-coeur-du-centre-ville':'realisations\.html#au-coeur-du-centre-ville'/);
 assert.doesNotMatch(html,/id="realisations"/);
});
test('Les réalisations existantes sont conservées et les nouvelles photos sont publiées',()=>{
 const h=read('realisations.html');
 for(const id of names){assert.match(h,new RegExp(id+'-large\\.webp'))}
 for(const file of ['multilogements-contemporains','residence-forestiere-hiver','residence-bois-pierre-terrasse','residence-fenetres-panoramiques','residence-brique-grise','residence-bois-pierre','residence-metal-contemporaine']){
  assert.match(h,new RegExp('nouveaux/'+file+'\\.webp'));
 }
 assert.equal((h.match(/class="mir-gallery-card(?: |")/g)||[]).length,10);
 assert.equal((h.match(/data-photo="/g)||[]).length,11);
 assert.match(h,/Des façades/);
 assert.doesNotMatch(h,/image générée pour la page d’accueil|palmier/i);
});
test('La galerie conserve les filtres et la sélection de l’ancien accueil',()=>{
 const html=read('realisations.html'), app=read('mir-realisations.js');
 assert.match(html,/data-gallery-filter="saved"/);
 assert.equal((html.match(/data-gallery-save=/g)||[]).length,10);
 assert.match(app,/localStorage.getItem\('mir-inspirations'\)/);
});
test('Les deux vues du même projet bois et pierre sont regroupées sans carte en double',()=>{
 const h=read('realisations.html');
 assert.equal((h.match(/<h3>Nature habitée<\/h3>/g)||[]).length,1);
 assert.match(h,/BOIS & PIERRE · 2 PHOTOS/);
 assert.match(h,/class="mir-gallery-related-view"[^>]+data-photo="5"/);
 assert.equal((h.match(/<article class="mir-gallery-card/g)||[]).length,10);
});
test('Les trois fichiers originaux ne sont ni écrasés ni publiés comme modèles artificiels',()=>{
 const h=read('realisations.html');
 assert.match(h,/Les photographies de certains projets ont été retouchées/);
 assert.doesNotMatch(h,/src="assets\/mir-home-hero/);
 const count=names.flatMap(id=>['large','mobile'].map(fmt=>id+'-'+fmt+'.webp'));
 for(const name of count){
  const b=fs.readFileSync(path.join(root,'assets','realisations',name));
  assert.ok(b.length>15000,name);
  assert.equal(b.toString('ascii',0,4),'RIFF',name);
  assert.equal(b.toString('ascii',8,12),'WEBP',name);
 }
});
test('Le parcours client a une entrée Réalisations propre sans modifier l’Admin',()=>{
 for(const f of ['boutique.html','produit.html','selection.html','materiaux.html','pliage.html','plan.html','chantier.html']){
  const h=read(f);assert.match(h,/href="realisations\.html">Réalisations<\/a>/,f);
 }
 const prod=read('production.html');
 assert.match(prod,/class="mir-client-links mir-production-client-nav"/);
 assert.match(prod,/href="realisations\.html">Réalisations<\/a>/);
 assert.match(prod,/data-admin-only>Bons de commande/);
});
test('La page Réalisations ne publie ni données privées ni comptes fictifs',()=>{
 const h=read('realisations.html');
 assert.match(h,/name="robots" content="noindex,nofollow"/);
 assert.match(h,/href="chantier\.html">Mon compte/);
 assert.doesNotMatch(h,/href="metres\.html"|data-admin-only/);
 assert.match(h,/mir-client-signature\.css\?v=1/);
 assert.match(h,/assets\/MIR-logo-officiel-original\.svg/);
});
test('Galerie en grand, clavier et retours accessibles',()=>{
 const h=read('realisations.html'),js=read('mir-realisations.js'),css=read('mir-realisations.css');
 assert.match(h,/<dialog id="mir-gallery-dialog"/);
 assert.match(h,/id="mir-gallery-close"/);
 assert.match(js,/showModal/);
 assert.match(js,/ArrowRight/);
 assert.match(js,/ArrowLeft/);
 assert.match(js,/dialog\.addEventListener\('close'/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/object-fit:cover/);
});
test('La réalisation urbaine en AVIF demeure publiée avec ses deux formats',()=>{
  const h=read('realisations.html'),js=read('mir-realisations.js');
  assert.match(h,/Au cœur du centre-ville de Québec/);
  assert.match(h,/id="au-coeur-du-centre-ville" data-gallery-category="contemporary"/);
  assert.match(h,/data-photo="10"/);
  assert.match(h,/aria-live="polite">1 sur 11/);
  assert.match(js,/Au cœur de Québec/);
  for(const kind of ['large','mobile']){
    const file='assets/realisations/realisations-mir-quebec-avec-voiture-'+kind+'.avif';
    if(kind==='large')assert.match(h,new RegExp(file.replaceAll('.','\\.')));
    const b=fs.readFileSync(path.join(root,file));
    assert.ok(b.length>15000,file);
    assert.equal(b.toString('ascii',4,8),'ftyp',file);
  }
});
console.log('MIR Réalisations : '+tests+'/'+tests+' tests réussis');
