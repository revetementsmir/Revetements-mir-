const assert=require('node:assert/strict');
const fs=require('node:fs');

const catalogue=JSON.parse(fs.readFileSync('dist/catalogue-fd6866b49d21.json','utf8')).materials;
const hidden=new Set(JSON.parse(fs.readFileSync('dist/boutique-visibilite.json','utf8')).hidden);
const commerce=fs.readFileSync('dist/commerce.js','utf8');
const boutique=fs.readFileSync('dist/boutique.html','utf8');
const produit=fs.readFileSync('dist/produit.html','utf8');
const selection=fs.readFileSync('dist/selection.html','utf8');

const byId=id=>catalogue.find(item=>item.id===id);
const missing=catalogue.filter(item=>!item.primaryImage&&!(item.images||[]).length);
const visibleMissing=missing.filter(item=>!hidden.has(item.id));

assert.deepEqual(visibleMissing.map(item=>item.id),[],`Références sans image encore publiées: ${visibleMissing.map(item=>item.id).join(', ')}`);

const smooth=byId('hardieplank-smooth-625');
assert.equal(smooth.primaryImage,'./assets/products/hardieplank-smooth.png');
assert.equal(smooth.images[0].exactProductMatch,true);
assert.doesNotMatch(smooth.primaryImage,/cedarmill/i);

const hardieColors=smooth.colors||[];
assert.ok(hardieColors.length>0);
assert.ok(hardieColors.every(color=>/jameshardie\.ca/.test(color.sourceUrl)),'Le nuancier Hardie doit mener vers James Hardie');
assert.ok(hardieColors.every(color=>!/gentek\.ca/.test(color.sourceUrl)),'Le nuancier Hardie ne doit pas mener vers Gentek');

for(const id of [
  'canexel-joint-ridgewood-d5-12','canexel-joint-vstyle-12','canexel-joint-cedrvue-9','canexel-joint-cedrvue-6',
  'kaycan-coil-0721-30m','royal-alumipro-coil-132419','royal-alumipro-coil-132423','royal-alumipro-coil-132423-gaufre',
  'royal-cedar-renditions-coil-132423','hardie-board-batten','vicwest-bellara-flat-sheet','profilec-la-capitale',
  'profilec-la-multi-r-13-75','profilec-la-multi-r-17-75','profilec-la-multi-r-21-75','profilec-la-mural-bloc',
  'profilec-la-muralys','profilec-la-petite-renommee','profilec-la-renommee','profilec-muralys-soffite'
])assert.ok(hidden.has(id),`${id} doit rester retiré tant que son visuel exact manque`);

assert.match(commerce,/Ajouter à ma demande/);
assert.match(commerce,/Voir ma demande/);
assert.match(commerce,/slice\(0,3\)\.map\(card\)/);
assert.match(commerce,/const requestable=/);
assert.match(commerce,/if\(!requestable\(m\)\)return/);
assert.doesNotMatch(boutique+produit+selection,/Mon panier/);
assert.match(boutique,/Ma demande/);
assert.match(selection,/Ma demande/);
assert.doesNotMatch(boutique,/shop-studio-banner|shop-bottom-links/);

console.log(`MIR audit boutique: ${catalogue.length} références; ${missing.length} sans image retirées; P0/P1 contrôlés.`);
