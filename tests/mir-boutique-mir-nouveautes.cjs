const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const catalog = JSON.parse(fs.readFileSync('dist/catalogue-fd6866b49d21.json', 'utf8'));
const products = catalog.materials;
const ids = new Set(products.map(m => m.id));
assert.equal(ids.size, products.length, 'Aucun ID produit en double');
const expected = [
 'prime-siding-2-30724','prime-staples-inox-40869','prime-paper-strip-20031',
 'prime-gsi-staples-40713','mir-joint-fibro-6','mir-joint-fibro-8','beck-panelfast-ags100'
];
for (const id of expected) {
 const item = products.find(m => m.id === id);
 assert.ok(item, 'Produit MIR absent : ' + id);
 assert.ok(item.primaryImage, 'Photo principale manquante : ' + id);
 for (const photo of item.images || []) {
   assert.ok(fs.existsSync('dist/' + photo.src.replace(/^\.\//, '')), 'Visuel absent : ' + photo.src);
 }
}
const beck = products.find(m => m.id === 'beck-panelfast-ags100');
assert.deepEqual(beck.formats.map(f => f.lengthIn), [1.5]);
assert.deepEqual(beck.dimensions.availableLengthsIn, [1.5]);
assert.equal(beck.manufacturerCode, 'AGS1000150-NA');
const ctx = { window: {}, Intl };
vm.runInNewContext(fs.readFileSync('dist/mir-boutique-pricing.js', 'utf8'), ctx);
assert.equal(ctx.window.MIRBoutiquePricing.resolve(beck.id, beck.formats[0].id).amountCents, 51599);
assert.equal(ctx.window.MIRBoutiquePricing.rows().filter(x => x.itemId === beck.id).length, 1);
assert.equal(products.find(m => m.id === 'prime-paper-strip-20031').dimensions.lengthIn, 3.25);
for (const path of ['dist/boutique.html', 'dist/produit.html', 'dist/selection.html']) {
 const html = fs.readFileSync(path, 'utf8');
 assert.match(html, /mir-boutique-pricing\.js\?v=mir-20261111/);
}
console.log('Boutique MIR produits : '+expected.length+' fiches validées; prix BECK 515,99 $ / boîte.');
