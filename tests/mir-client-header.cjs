'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../dist');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
let count=0;
function test(name,fn){fn();console.log('PASS '+name);count++}
const customerPages=['boutique.html','produit.html','selection.html','pliage.html','materiaux.html','plan.html','chantier.html'];
const navTargets=['boutique.html','realisations.html','pliage.html','plan.html','contact.html'];
test('Entête client commun sur toutes les pages publiques',()=>{
 for(const name of customerPages){
  const h=read(name);
  assert.match(h,/<header[^>]*mir-client-header/,'Entête absent: '+name);
  assert.match(h,/mir-client-header\.css\?v=1/,'Feuille partagée absente: '+name);
  assert.match(h,/mir-client-links/,'Navigation partagée absente: '+name);
  assert.match(h,/assets\/MIR-logo-officiel-original\.svg/,'Logo absent: '+name);
  assert.match(h,/>Mon compte<\/a>/,'Compte neutre absent: '+name);
  assert.match(h,/>Demander une estimation<\/a>/,'Estimation absente: '+name);
  const head=h.slice(0,h.indexOf('</header>')+9);
  for(const url of navTargets)assert.ok(head.includes('href="'+url+'"'),name+' lien '+url+' absent');
 }
});
test('Le site principal conserve aussi le même menu',()=>{
 const h=read('index.html');
 assert.match(h,/href="boutique\.html"[^>]*>Revêtements<\/a>/);
 assert.match(h,/href="realisations\.html"[^>]*>Réalisations<\/a>/);
 assert.match(h,/href="chantier\.html"[^>]*>Mon compte<\/a>/);
});
test('Boutique, produit et sélection préservent les comptes de la demande',()=>{
 for(const name of ['boutique.html','produit.html','selection.html']){
   assert.match(read(name),/data-list-count/,'Compteur absent '+name);
   if(name!=='selection.html')assert.match(read(name),/href="selection\.html"[^>]*>Panier/);
 }
});
test('Le studio conserve son bouton de bibliothèque fonctionnel',()=>{
 const s=read('plan.html');
 assert.equal((s.match(/id="open-library"/g)||[]).length,1);
 assert.match(s,/mir-studio-tools/);
 assert.match(read('plan-app.js'),/\$\('#open-library'\)\.onclick=openLibrary/);
});
test('Le configurateur client dispose du menu commun, Admin garde le sien',()=>{
 const html=read('production.html');
 assert.match(html,/mir-production-client-nav/);
 assert.match(html,/mir-production-client-account/);
 assert.match(html,/id="mode-link"/);
 assert.match(html.split('<body',1)[0],/if \(params\.get\('mode'\) !== 'client'\) return;/);
 assert.match(html,/data-admin-only>Atelier/);
 const css=read('mir-client-header.css');
 assert.match(css,/html\.mir-production-client \.production-header nav\[aria-label="Navigation du site"\]\{display:none!important\}/);
 assert.match(css,/html\.mir-production-client \.production-header #mode-link\{display:inline-flex!important;flex:1 0 100%/);
});
test('Les couleurs du vrai bandeau sont cohérentes avec la maquette',()=>{
 const css=read('mir-home-premium.css');
 const shared=read('mir-client-header.css');
 assert.match(css,/\.mir-home-main-cta\{background:#348511/);
 assert.match(shared,/\.mir-home-estimate\{border:1px solid #348511;background:#348511/);
 assert.match(css,/\.mir-home-second-cta\{color:#fff;border:1px solid rgba\(255,255,255,.78\)/);
});
test('Le second bouton va réellement à la boutique et les trois images sont maintenues',()=>{
 const h=read('index.html');
 assert.match(h,/<a class="mir-home-second-cta" href="boutique\.html">Voir notre boutique<\/a>/);
 const m=h.match(/<section class="mir-home-services wrap"[\s\S]*?<\/section>/)?.[0];
 assert.ok(m,'Section absente');
 assert.equal((m.match(/<img /g)||[]).length,3);
 assert.equal((m.match(/class="mir-home-service(?: mir-home-service-studio)?"/g)||[]).length,3);
 assert.doesNotMatch(m,/<svg|class="icon"|lucide/i);
 for(const n of ['mir-01.jpg','mir-02.jpg','mir-03.jpg'])assert.ok(fs.existsSync(path.join(dir,'assets',n)));
});
test('Les clients explorent sans connexion et Mon compte exige une identité vérifiée',()=>{
 const home=read('index.html');
 const cfg=read('portal-config.js');
 assert.match(home,/href="boutique\.html">Voir notre boutique/);
 assert.doesNotMatch(home,/Explorer sans connexion|Connexion Admin/i);
 assert.equal(require('./mir-account-config-helper.cjs')().enabled,true);
 assert.match(read('portal-client.js'),/sdk.auth.getUser/);
});
console.log('MIR en-têtes client : '+count+'/'+count+' vérifications réussies');
