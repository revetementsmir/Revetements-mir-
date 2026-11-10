const assert = require('node:assert/strict');
const catalogue = require('../dist/catalogue-fd6866b49d21.json');
const pricing = require('../dist/mir-regional-pricing-20261110.json');

const ids = new Set(catalogue.materials.map(material => material.id));
assert.equal(pricing.markupPercent, 15);
assert.equal(pricing.currency, 'CAD');
assert.equal(pricing.taxesIncluded, false);

for (const [id, row] of Object.entries(pricing.priced)) {
  assert(ids.has(id), `Référence tarifée absente du catalogue: ${id}`);
  assert(row.unit, `Unité manquante: ${id}`);
  assert(Array.isArray(row.sources) && row.sources.length, `Source manquante: ${id}`);
  const prices = row.formatPrices ? Object.values(row.formatPrices) : [row];
  for (const price of prices) {
    assert(Number.isFinite(price.marketAverage) && price.marketAverage > 0, `Moyenne invalide: ${id}`);
    assert(Number.isFinite(price.amount) && price.amount > 0, `Prix MIR invalide: ${id}`);
    assert.equal(price.amount, Math.round(price.marketAverage * 1.15 * 100) / 100, `Majoration invalide: ${id}`);
  }
}

for (const id of pricing.nonSellable) assert(ids.has(id), `Visualisation absente du catalogue: ${id}`);
assert.equal(new Set([...Object.keys(pricing.priced), ...pricing.nonSellable]).size,
  Object.keys(pricing.priced).length + pricing.nonSellable.length,
  'Une référence ne peut pas être tarifée et non vendable');

console.log(`Prix régionaux MIR: ${Object.keys(pricing.priced).length} références tarifées; majoration de 15 % vérifiée.`);
