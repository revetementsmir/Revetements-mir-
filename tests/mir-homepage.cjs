'use strict';
/* MIR — contrats de l'accueil public (pas une simulation visuelle). */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dist=path.resolve(__dirname,'../dist');
const read=file=>fs.readFileSync(path.join(dist,file),'utf8');
let n=0;
const test=(title,fn)=>{fn();n++;console.log('PASS '+title)};
const html=read('index.html');
const css=read('mir-home-premium.css');
const header=html.match(/<header class="site-header mir-home-header">[\s\S]*?<\/header>/)?.[0];
const hero=html.match(/<section class="mir-home-showcase"[\s\S]*?<\/section>/)?.[0];
const services=html.match(/<section class="mir-home-services"[\s\S]*?<\/section>/)?.[0];

test('Accueil principal et logo original Illustrator inchangé dans la marque',()=>{
  assert.ok(header&&hero&&services);
  assert.ok(html.includes('mir-home-premium.css?v=20261105'));
  assert.equal((html.match(/MIR-logo-officiel-original\.svg/g)||[]).length,2);
  const logo=read('assets/MIR-logo-officiel-original.svg');
  assert.match(logo,/^<svg[^>]*viewBox="0 0 363\.68 91\.133"/);
  assert.match(logo,/fill="#57c03f"/);
  assert.match(logo,/fill="#a3a5a8"/);
  assert.doesNotMatch(logo,/<script|onload=|onerror=|<foreignObject/i);
});
test('Le compte est neutre pour futurs clients et équipe',()=>{
  assert.match(header,/href="chantier\.html"[^>]*>Mon compte<\/a>/);
  assert.doesNotMatch(header,/admin|employé|employer|connexion équipe/i);
  assert.doesNotMatch(header,/explorer sans connexion/i);
});
test('Le visiteur peut entrer sans compte ni action de connexion obligatoire',()=>{
  assert.match(header,/href="boutique\.html"[^>]*>Revêtements<\/a>/);
  assert.match(hero,/href="boutique\.html"[^>]*>Découvrir nos revêtements<\/a>/);
  assert.match(hero,/href="#realisations"[^>]*>Voir nos réalisations<\/a>/);
  assert.match(header,/href="#nous-joindre"[^>]*>Demander une estimation<\/a>/);
});
test('Maison du portfolio MIR utilisée, aucune image IA nouvelle ni palmiers',()=>{
  assert.match(hero,/src="assets\/mir-01\.jpg"/);
  assert.ok(fs.existsSync(path.join(dist,'assets/mir-01.jpg')));
  assert.doesNotMatch(hero,/palmier|généré par IA|image synthétique/i);
});
test('Pas de pictogrammes dans le nouveau bloc de services',()=>{
  assert.equal((services.match(/class="mir-home-service"/g)||[]).length,3);
  assert.doesNotMatch(services,/<svg|<i\b|data-icon|lucide|<img\b/i);
});
test('3D / plan PDF au troisième niveau et métier MIR au premier',()=>{
  assert.ok(services.indexOf('Revêtements extérieurs')<services.indexOf('Moulures et pliage'));
  assert.ok(services.indexOf('Moulures et pliage')<services.indexOf('Imaginez votre façade en 3D'));
  assert.doesNotMatch(hero,/<h1[^>]*>[^<]*(?:3D|PDF)/i);
  assert.match(services,/plan PDF/);
  assert.ok(html.includes('id="realisations"'));
  assert.ok(html.includes('id="nous-joindre"'));
});
test('Page responsive et logo non déformé',()=>{
  assert.match(css,/@media\(max-width:1100px\)/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:425px\)/);
  assert.match(css,/\.mir-home-brand img\{[^}]*object-fit:contain/);
  assert.match(css, /prefers-reduced-motion/);
});
test('Liens principaux locaux présents sans site de démonstration',()=>{
  for(const link of ['boutique.html','pliage.html','plan.html','chantier.html']){
    assert.ok(fs.existsSync(path.join(dist,link)),link+' absent');
  }
  assert.doesNotMatch(header, /atelier-essai|candidate\.html/i);
});
test('Les accès réels restent fermés tant que Auth et RLS ne sont pas actifs',()=>{
  assert.match(read('portal-config.js'),/enabled: false/);
});
console.log('MIR accueil premium : '+n+'/'+n+' tests réussis.');
