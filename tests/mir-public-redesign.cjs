'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pages=['index','boutique','produit','selection','materiaux','pliage','plan','realisations','contact','estimation'];
const menu=read('mir-public-menu.js'),commerce=read('commerce.js');

for(const page of pages){
  const html=read(page+'.html');
  assert.match(html,/mir-public-menu\.js\?v=public-shell-3/,page);
  assert.match(html,/mir-public-menu\.css\?v=2/,page);
}
assert.match(menu,/\['index\.html','Accueil'/);
assert.match(menu,/\['boutique\.html','Boutique'/);
assert.match(menu,/\['pliage\.html','Pliage'/);
assert.match(menu,/\['chantier\.html\?view=orders','Commandes'/);
assert.match(menu,/\['chantier\.html\?view=account','Compte'/);
for(const label of ['Réalisations','Aide','Contact'])assert.match(menu,new RegExp(`'${label}'`));
assert.match(menu,/mir-public-cart/);
assert.match(commerce,/Ajouter au panier/);
assert.match(commerce,/availableFormats\.length===1\?availableFormats\[0\]/);
assert.doesNotMatch(read('boutique.html'),/>Ma demande <b data-list-count>/);
assert.doesNotMatch(read('produit.html'),/>Ma demande <b data-list-count>/);
assert.match(read('selection.html'),/Mon <em>panier\./);
console.log('Refonte publique : navigation, vocabulaire et format unique conformes.');
