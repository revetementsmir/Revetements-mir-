'use strict';
/* MIR Signature — contrat de style client, séparé de l'administration. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dist=path.resolve(__dirname,'../dist');
const text=n=>fs.readFileSync(path.join(dist,n),'utf8');
const pages=['boutique.html','produit.html','selection.html','materiaux.html','pliage.html','plan.html','chantier.html'];
let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('La charte MIR Signature définit les mêmes couleurs que la page d’accueil',()=>{
  const css=text('mir-client-signature.css');
  assert.match(css,/--mir-accent:#348511/);
  assert.match(css,/--mir-surface:#fafaf7/);
  assert.match(css,/--mir-ink:#18251d/);
  assert.match(css,/--mir-radius:12px/);
  assert.match(css,/body\.mir-signature/);
  assert.match(css,/@media\(min-width:2560px\)/);
  assert.match(css,/@media\(max-width:700px\)/);
});
test('Toutes les pages client utilisent le thème, aucun nouveau site ni formulaire factice',()=>{
  for(const p of pages){
    const html=text(p);
    assert.match(html,/<body\b[^>]*class="mir-signature(?: [^"]*)?"/,p);
    assert.match(html,/href="mir-client-signature\.css\?v=1-harmony"/,p);
    assert.match(html,/assets\/MIR-logo-officiel-original\.svg/,p);
    assert.match(html,/>Mon compte<\/a>/,p);
    assert.match(html,/>Demander une estimation<\/a>/,p);
    assert.match(html,/name="robots" content="noindex,nofollow"/,p);
  }
});
test('Les liens internes d’admin ne sont plus proposés en pied de page client',()=>{
  for(const p of ['boutique.html','produit.html','selection.html','materiaux.html','plan.html']){
    const html=text(p);
    assert.doesNotMatch(html,/href="metres\.html"/,p);
    assert.doesNotMatch(html,/Super admin · Métrés|Espace atelier ↗|Métrés de l’atelier ↗/,p);
  }
});
test('Les fonctionnalités client réelles sont toujours présentes',()=>{
  assert.match(text('produit.html'),/id="product-detail"/);
  assert.match(text('selection.html'),/id="selection-export-pdf"[^>]*>Télécharger ma sélection en PDF/);
  assert.match(text('selection.html'),/id="selection-export"[^>]*>Sauvegarder JSON/);
  assert.match(text('selection.html'),/mir-selection-pdf\.js\?v=1/);
  assert.match(text('commerce.js'),/MIRPDF\.exportPlan/);
  assert.match(text('commerce.js'),/MIR-selection-materiaux\.json/);
  assert.match(text('plan.html'),/id="open-library"/);
  assert.match(text('plan.html'),/id="studio-controls"/);
  assert.match(text('pliage.html'),/id="bend-length"/);
  assert.match(text('boutique.html'),/id="collections"/);
});
test('La sécurité du portail ne change pas et aucun réglage Admin ne devient public',()=>{
  assert.equal(require('./mir-account-config-helper.cjs')().enabled,true);
  assert.match(text('portal-client.js'),/sdk.auth.getUser/);
  assert.match(text('portal-client.js'),/checkedSnapshot\(\{\.\.\.data,operations:operationsResponse\.data,messaging:messagingResponse\.data,lead,boss,logistics,management,boutiquePricing,punch,expenses\}, user\.id\)/);
  const css=text('mir-client-signature.css');
  assert.doesNotMatch(css,/\.production-header|\.mir-admin-v4|data-admin-only/);
  assert.ok(!text('production.html').includes('mir-client-signature.css'));
});
test('Le texte de l’en-tête boutique garde le contraste sur sa photo sombre',()=>{
  const css=text('mir-client-signature.css');
  assert.match(css,/\.shop-hero-copy h1,[\s\S]*?\.shop-hero-copy p \{ color:#fff; \}/);
});
test('Direction photo Québec documentée sans changer les maisons',()=>{
  const md=text('../docs/MIR_PHOTO_REALISATIONS.md');
  assert.match(md,/La maison est intouchable/);
  assert.match(md,/Jamais aucun véhicule/);
  assert.match(md,/Québec crédible/);
  assert.match(md,/original intact/);
  assert.match(md,/visuel retouché/);
});
test('Estimation reste accessible en mobile et le Studio revient aux réalisations',()=>{
  const css=text('mir-client-signature.css');
  assert.match(css,/Mobile MIR : le contact\/estimation reste actionnable/);
  assert.match(css,/mir-client-header \.mir-home-estimate/);
  assert.match(text('plan.html'),/href="realisations\.html">← Retour aux réalisations/);
});
test('Le configurateur client partage les codes MIR sans modifier la version Admin',()=>{
  const page=text('production.html'),css=text('mir-production-signature.css');
  assert.match(page,/mir-production-signature\.css\?v=audit-client-20261109/);
  assert.match(page,/class="mir-production-steps"/);
  assert.match(css,/html\.mir-production-client/);
  assert.match(css,/--green:#348511/);
  assert.match(css,/\.mir-production-steps\{display:none\}/);
  assert.match(css,/@media\(min-width:2200px\)/);
});
console.log('MIR Signature : '+checks+'/'+checks+' tests réussis');
