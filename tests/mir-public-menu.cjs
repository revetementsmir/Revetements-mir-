'use strict';
/* Contrat client MIR : navigation mobile progressive, sans toucher aux modules Admin. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const menu=require('../dist/mir-public-menu.js');
const routes=['realisations','materiaux','boutique','produit','selection','pliage','plan'];
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('Le menu a une API stable et son activation reste explicitement mobile/tablette',()=>{
 assert.equal(menu.version,'1.0.0');
 assert.equal(menu.breakpoint,'(max-width: 1100px)');
 assert.equal(typeof menu.init,'function');
});
test('Les sept pages clients utilisent les mêmes fichiers de menu, sans bibliothèques ajoutées',()=>{
 for(const route of routes){
   const html=read(route+'.html');
   assert.match(html,/mir-public-menu\.css\?v=1/,route);
   assert.match(html,/mir-public-menu\.js\?v=1/,route);
   assert.match(html,/<header[^>]*mir-client-header/,route);
   assert.match(html,/assets\/MIR-logo-officiel-original\.svg/,route);
   assert.match(html,/name="robots" content="noindex,nofollow"/,route);
   assert.match(html,/href="contact.html"[^>]*>Demander une estimation<\/a>/,route);
 }
});
test('Le menu accueil est compact et le mode Admin reste isolé',()=>{
 assert.match(read('index.html'),/mir-public-menu\.js\?v=vitrine-1/);
 for(const route of ['chantier']){
   assert.doesNotMatch(read(route+'.html'),/mir-public-menu\.(?:css|js)/,route);
 }
 const production=read('production.html'),bridge=read('mir-production-client-nav.js');
 assert.match(production,/mir-public-menu\.css\?v=1/);
 assert.match(production,/mir-public-menu\.js\?v=1/);
 assert.match(production,/mir-production-client-nav\.js\?v=1/);
 assert.match(bridge,/classList\.contains\('mir-production-client'\)/,
   'seul le mode client doit être activé');
 assert.match(bridge,/header\.classList\.add\('mir-client-header'\)/);
 assert.match(production,/nav aria-label="Navigation du site"/,
   'le menu Admin original est conservé');
});
test('Le JavaScript conserve aria-controls, aria-expanded et le support Échap',()=>{
 const code=read('mir-public-menu.js');
 assert.match(code,/aria-controls/);
 assert.match(code,/aria-expanded/);
 assert.match(code,/event\.key==='Escape'/);
 assert.match(code,/event\.target\.closest\?\.\('a'\)/);
 assert.match(code,/header\.contains\(event\.target\)/);
});
test('Les actions estimation et sélection restent accessibles, sans masquer les liens si JS manque',()=>{
 const css=read('mir-public-menu.css');
 assert.match(css,/@media\(max-width:1100px\)/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/nav\.mir-client-links\[hidden\]\{[\s\S]*?display:none!important/);
 assert.doesNotMatch(css,/body\.mir-signature\s+header\.mir-client-header\s*>\s*nav\[hidden\]/);
 assert.match(css,/\.mir-client-actions a\{/);
});
console.log('MIR menu client : '+checks+'/'+checks+' contrats réussis');
