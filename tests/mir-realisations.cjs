'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const names=['realisations-mir-contemporain-brun','realisations-mir-contrastes','realisations-mir-classique'];
let tests=0;function test(label,fn){fn();tests++;console.log('PASS '+label)}
test('L’accueil approuvé est préservé avant sa section Réalisations',()=>{
 const html=read('index.html');
 const prefix=html.slice(0,html.indexOf('<section id="realisations"'));
 let h=0;for(const ch of prefix)h=(Math.imul(h,31)+ch.charCodeAt(0))>>>0;
 assert.equal(h,3906695709,'La maison, le logo, les cartes ou le header ont changé !');
 assert.match(prefix,/mir-home-hero-20261105\.avif/);
 assert.equal((prefix.match(/mir-home-card-[a-z]+-20261105\.webp/g)||[]).length,3);
 assert.match(prefix,/Voir notre boutique/);
});
test('Les trois maisons de MIR sont présentes dans Réalisations sans changement d’architecture',()=>{
 const h=read('realisations.html');
 for(const id of names){assert.match(h,new RegExp(id+'-large\\.webp'));assert.match(h,new RegExp(id+'-mobile\\.webp'))}
 assert.equal((h.match(/class="mir-gallery-photo-button"/g)||[]).length,4);
 assert.match(h,/Nos réalisations/);
 assert.doesNotMatch(h,/image générée pour la page d’accueil|voiture|palmier|véhicule/i);
});
test('La section Réalisations existante conserve ses filtres et sélection',()=>{
 const h=read('index.html');
 assert.match(h,/data-filter="saved"/);
 assert.equal((h.match(/class="image-trigger"/g)||[]).length,3);
 const section=h.slice(h.indexOf('<section id="realisations"'),h.indexOf('</section>',h.indexOf('<section id="realisations"')));
 for(const id of names)assert.match(section,new RegExp(id+'-large\\.webp'));
 const app=read('app.js');
 for(const id of names)assert.match(app,new RegExp(id+'-large\\.webp'));
 assert.match(app,/dialog\.showModal\(\)/);
});
test('Les trois fichiers originaux ne sont ni écrasés ni publiés comme modèles artificiels',()=>{
 const h=read('realisations.html');
 assert.match(h,/Réalisations réelles présentées par MIR/);
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
 assert.match(css,/@media\(min-width:2200px\)/);
 assert.match(css,/object-fit:cover/);
});
test('Quatrième réalisation publiée en AVIF, originale et variante mobile',()=>{
  const h=read('realisations.html'),js=read('mir-realisations.js'),css=read('mir-realisations.css');
  assert.match(h,/Architecture urbaine au crépuscule/);
  assert.match(h,/data-photo="3"/);
  assert.match(h,/aria-live="polite">1 \/ 4/);
  assert.match(js,/Architecture urbaine au crépuscule/);
  assert.match(css,/mir-gallery-card-twilight/);
  for(const kind of ['large','mobile']){
    const file='assets/realisations/realisations-mir-urbain-crepuscule-'+kind+'.avif';
    assert.match(h,new RegExp(file.replaceAll('.','\\.')));
    const b=fs.readFileSync(path.join(root,file));
    assert.ok(b.length>15000,file);
    assert.equal(b.toString('ascii',4,8),'ftyp',file);
  }
});
console.log('MIR Réalisations : '+tests+'/'+tests+' tests réussis');