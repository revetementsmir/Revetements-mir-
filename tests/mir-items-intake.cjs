'use strict';
// Intake regression: local files and pure store rules only. Never calls a service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const catalogue = JSON.parse(read('dist/catalogue-fd6866b49d21.json'));
const materials = catalogue.materials;
const get = id => materials.find(item => item.id === id);
const Store = require('../dist/employee-store-model.js');
const Quantity = require('../dist/mir-commerce-quantity.js');
const kitId = 'hardie-colorplus-touch-up-kit';
const primeId = 'prime-paper-strip-20031';
const macId = 'mir-request-mac-screws';
const kit = get(kitId), prime = get(primeId), mac = get(macId);
let checks = 0;
function check(label, run) { run(); checks++; console.log('PASS ' + label); }

check('Une seule identité pour chacun des trois articles', () => {
  assert.equal(new Set(materials.map(item => item.id)).size, materials.length);
  for (const id of [kitId, primeId, macId]) {
    assert.equal(materials.filter(item => item.id === id).length, 1, id);
  }
  assert.deepEqual(materials.filter(item => /colorplus/i.test(item.name) && /kit/i.test(item.name)).map(item => item.id), [kitId]);
  assert.deepEqual(materials.filter(item => item.manufacturerCode === '20031').map(item => item.id), [primeId]);
  assert.deepEqual(materials.filter(item => /\bvis\b.*\bMAC\b/i.test(item.name)).map(item => item.id), [macId]);
});

check('PRIME 20031 : données et deux photos antérieures intégralement conservées', () => {
  // Snapshot taken from pre-intake commit 1104e2eccab7202a7aab08e96dc0f68fb759c048.
  assert.equal(hash(JSON.stringify(prime)), 'a118485c86d9e7079f8a2172493c2504c7bbcd473f6e024542a8dbc71faab1da');
  assert.deepEqual(prime.dimensions, {lengthIn: 3.25, diameterIn: 0.12, collationAngleDeg: 34});
  assert.equal(prime.packaging.piecesPerBox, 2000);
  assert.equal(prime.unit, 'boîte de 2 000 clous');
  for (const [name, expected] of [
    ['prime-20031-strips.webp', '3ffb332d9049149de3e7057f13d78d2f559c613622bfab24f3fc1f3f26d7e46c'],
    ['prime-20031-box.webp', '7d85b164c4085db05c7b2ea6ce4f761cc98e143468b53a7edcf27e6786f808d4']
  ]) assert.equal(hash(fs.readFileSync(path.join(root, 'dist/assets/products/mir-provided-20261111', name))), expected, name);
  assert.equal(Quantity.policy(prime).defaultUnit, 'boîtes');
  assert.equal(Quantity.validate(prime, {quantity: 1, unit: 'boîtes'}).ok, true);
  assert.equal(Quantity.validate(prime, {quantity: 0.5, unit: 'boîtes'}).ok, false);
});

check('Midnight Black et Blackwater restent les alias du même kit', () => {
  assert.equal(kit.colors.length, 1, 'Le nuancier du revêtement ne constitue pas une offre de kits');
  const colour = kit.colors[0];
  assert.equal(colour.id, 'hardie-noir-minuit');
  assert.deepEqual(colour.packagingAliases, [
    {name: 'Midnight Black', code: '4960831'},
    {name: 'Blackwater', code: '4100703'}
  ]);
  assert.equal(colour.evidence.packagingCode, 'LLA0531');
  assert.equal(colour.evidence.upc, '856296003436');
  assert.equal(colour.evidence.originalFileAvailable, false);
  assert.equal(colour.evidence.kind, 'MIR_user_provided_packaging_photo');
  assert.equal(kit.sku, null, 'Les inscriptions sur la boîte ne sont pas un SKU MIR');
  assert.equal(kit.manufacturerCode, null);
  assert.equal(kit.orderable, false);
  assert.equal(kit.colorAvailability.exactSkuPerColorConfirmed, false);
  assert.deepEqual(kit.colorAvailability.documentedPackagingColours, ['hardie-noir-minuit']);
  assert.equal(kit.images.length, 1);
  assert.equal(kit.images[0].exactProductMatch, false, 'La photo de gamme ne doit pas devenir une photo du kit noir');
  assert.equal(kit.primaryImage, './assets/products/hardie-colorplus-touch-up-kit.jpg');
  assert.equal(hash(fs.readFileSync(path.join(root, 'dist/assets/products/hardie-colorplus-touch-up-kit.jpg'))), '1c73df7e11626bd384e251a948a53a5a764afac219ac9f3d9f2c1c0b2e13bc9f');
});

check('La surcouche boutique conserve la référence noire et ajoute Étain vieilli sans doublon', () => {
  const source = read('dist/commerce.js');
  const start = source.indexOf('  function applyBoutiqueReview(');
  const end = source.indexOf('  async function init()', start);
  assert.ok(start >= 0 && end > start, 'Entrée de préparation boutique introuvable');
  const local = [clone(kit), clone(get('hardieplank-select-825'))];
  const originalBlack = clone(kit.colors[0]);
  // Execute the actual preparation function without booting the browser or fetching.
  const context = vm.createContext({materials: local, colors: item => item.colors || [], window: {}});
  vm.runInContext(source.slice(start, end), context);
  vm.runInContext('applyBoutiqueReview({}); applyBoutiqueReview({});', context);
  const prepared = clone(local[0]);
  assert.deepEqual(prepared.colors.map(colour => colour.id), ['hardie-noir-minuit', 'hardie-etain-vieilli']);
  assert.deepEqual(prepared.colors[0], originalBlack);
  assert.equal(prepared.orderable, false);
  assert.equal(prepared.keepProductPhoto, true);
});

check('Vis pour MAC : longueur 1½ po confirmée par MIR, quantités entières de boîtes de 500', () => {
  assert.equal(mac.brand, 'MAC Métal architectural');
  assert.equal(mac.retailerCode, '1790291');
  assert.equal(mac.sourceUrl, 'https://boutique.aluminiumbbouchard.ca/produit/vis-mac-metal-1-1-2-500pcs/');
  assert.equal(mac.manufacturerCode, null);
  assert.equal(mac.sku, null);
  assert.equal(mac.status, 'mir_reference');
  assert.equal(mac.orderable, true);
  assert.equal(mac.requestableWithoutPhoto, true);
  assert.equal(mac.unit, 'boîte de 500 vis');
  assert.deepEqual(mac.dimensions, {lengthIn: 1.5});
  assert.deepEqual(mac.packaging, {piecesPerBox: 500, unit: 'boîte'});
  assert.equal(Quantity.policy(mac).defaultUnit, 'boîtes');
  assert.equal(Quantity.validate(mac, {quantity: 1, unit: 'boîtes'}).ok, true);
  for (const quantity of [0, -1, 0.5, 1.5]) {
    assert.equal(Quantity.validate(mac, {quantity, unit: 'boîtes'}).ok, false, 'Quantité ' + quantity);
  }
  assert.equal(Quantity.validate(mac, {quantity: 500, unit: 'pièces'}).ok, false, 'Aucune vente unitaire déduite de la boîte');
  assert.deepEqual(mac.colors, []);
  assert.deepEqual(mac.images, []);
  assert.equal(mac.primaryImage, null);
  assert.equal(mac.sourceEvidence.userIdentification, 'vis pour mac');
  assert.equal(mac.sourceEvidence.originalFileAvailable, false);
  assert.equal(mac.sourceEvidence.linkedImageDownloaded, false);
  assert.equal(mac.sourceEvidence.retailerProductCode, '1790291');
  assert.deepEqual(mac.sourceEvidence.lengthConflict, {
    observedTitleIn: 1.125,
    observedSpecificationsIn: 1.5,
    confirmation: 'MIR_confirmed_1.5in'
  });
  assert.deepEqual(mac.sourceEvidence.userLengthConfirmation, {
    receivedOn: '2026-11-17', answer: '1½ po', lengthIn: 1.5
  });
  assert.match(mac.notes.join(' '), /référence détaillant, pas un SKU MIR/);
  assert.ok(mac.specifications.some(spec => spec.label === 'Longueur' && spec.value === '1½ po — confirmée par MIR'));
});

check('Garde boutique : seule une référence MIR explicitement autorisée peut être demandée sans photo', () => {
  const source = read('dist/commerce.js');
  const declarations = ['safe', 'localAsset', 'sold', 'hasExactImage', 'requestable'].map(name => {
    const line = source.split('\n').find(value => value.startsWith('  const ' + name + ' ' ) || value.startsWith('  const ' + name + '='));
    assert.ok(line, 'Fonction de garde absente : ' + name);
    return line;
  });
  const photoFunctions = ['images', 'heroImage'].map(name => {
    const line = source.split('\n').find(value => value.startsWith('  function ' + name + '('));
    assert.ok(line, 'Fonction photo absente : ' + name);
    return line;
  });
  const toolGuardStart = source.indexOf('  function confirmedToolReference(');
  const toolGuardEnd = source.indexOf('  // The two cutting tools', toolGuardStart);
  assert.ok(toolGuardStart >= 0 && toolGuardEnd > toolGuardStart);
  const toolGuard = source.slice(toolGuardStart, toolGuardEnd);
  const hiddenProducts = new Set(JSON.parse(read('dist/boutique-visibilite.json')).hidden);
  const context = vm.createContext({hiddenProducts, formats: Quantity.formats, URL, document: {baseURI: 'http://127.0.0.1/produit.html'}, location: {origin: 'http://127.0.0.1'}});
  vm.runInContext(declarations.concat(photoFunctions).join('\n') + '\n' + toolGuard + '\n' +
    'globalThis.allowed = m => Boolean(requestable(m));\n' +
    'globalThis.before = m => Boolean(sold(m) && hasExactImage(m) && m.status !== "pending_identity" && m.orderable !== false);', context);
  assert.equal(context.allowed(mac), true);
  assert.equal(context.allowed(prime), true, 'Les produits photographiés restent accessibles sans le nouveau drapeau');
  assert.equal(context.allowed(kit), false);
  assert.equal(context.allowed(null), false);
  for (const changes of [
    {requestableWithoutPhoto: false}, {requestableWithoutPhoto: undefined}, {requestableWithoutPhoto: 'true'},
    {status: 'pending_identity'}, {status: 'documented_reference'}, {status: 'visualization_only'},
    {retailerCode: null}, {retailerCode: ''}, {sourceUrl: null}, {sourceUrl: ''},
    {orderable: false}, {commercialStatus: 'not_for_sale'}
  ]) assert.equal(context.allowed({...mac, ...changes}), false, JSON.stringify(changes));
  hiddenProducts.add(macId);
  assert.equal(context.allowed(mac), false, 'Le drapeau ne contourne pas la visibilité boutique');
  hiddenProducts.delete(macId);
  assert.deepEqual(materials.filter(item => !['dewalt-bimetal-hole-saws', 'leiluo-oscillating-hcs-44mm'].includes(item.id)).filter(item => context.allowed(item) !== context.before(item)).map(item => item.id), [macId], 'Aucun autre article ancien du catalogue ne change de droit d’ajout');
});

check('Catalogue employé : MAC accepté localement en boîtes entières, kit toujours bloqué', () => {
  const original = JSON.stringify(catalogue);
  const employee = Store.buildCatalogue(catalogue);
  assert.equal(new Set(employee.map(item => item.id)).size, employee.length);
  for (const id of [kitId]) {
    const item = employee.find(candidate => candidate.id === id);
    assert.ok(item, id);
    assert.equal(item.orderable, false);
    assert.equal(item.referencePending, true);
    const attempt = Store.configureLine({catalogue: employee}, {itemId: id, quantity: 1, colorId: 'hardie-noir-minuit'});
    assert.equal(attempt.ok, false, id);
    assert.equal(attempt.error.code, 'ITEM_NOT_ORDERABLE', id);
  }
  const employeeKit = employee.find(item => item.id === kitId);
  assert.deepEqual(employeeKit.colors.map(colour => colour.id), ['hardie-noir-minuit']);
  const employeeMac = employee.find(item => item.id === macId);
  assert.equal(employeeMac.primaryImage, null);
  assert.equal(employeeMac.manufacturerReference, null);
  assert.equal(employeeMac.sku, null);
  assert.equal(employeeMac.unit, 'boîte');
  assert.equal(employeeMac.packaging.piecesPerBox, 500);
  assert.deepEqual(employeeMac.dimensions, {lengthIn: 1.5});
  assert.equal(employeeMac.stockLengthIn, 1.5);
  assert.equal(employeeMac.orderable, true);
  assert.equal(employeeMac.referencePending, false);
  const macLine = Store.configureLine({catalogue: employee}, {itemId: macId, quantity: 1, unit: 'boîte'});
  assert.equal(macLine.ok, true);
  assert.equal(macLine.line.itemId, macId);
  assert.equal(macLine.line.unit, 'boîte');
  assert.equal(macLine.line.packaging.piecesPerBox, 500);
  assert.equal(macLine.line.sku, null);
  assert.equal(macLine.line.manufacturerReference, null);
  const halfBox = Store.configureLine({catalogue: employee}, {itemId: macId, quantity: 0.5});
  assert.equal(halfBox.ok, false);
  assert.equal(halfBox.error.code, 'INVALID_QUANTITY');
  const primeLine = Store.configureLine({catalogue: employee}, {itemId: primeId, quantity: 1});
  assert.equal(primeLine.ok, true);
  assert.equal(primeLine.line.itemId, primeId);
  assert.equal(primeLine.line.unit, 'boîte');
  assert.equal(JSON.stringify(catalogue), original, 'La préparation employé ne modifie pas le catalogue partagé');
});

check('Aucun prix ni stock ajouté; le tarif local reste sur demande', () => {
  const regional = JSON.parse(read('dist/mir-regional-pricing-20261110.json'));
  const pricing = {window: {}, Intl};
  vm.runInNewContext(read('dist/mir-boutique-pricing.js'), pricing);
  for (const item of [mac, kit, prime]) {
    for (const field of ['price', 'priceCents', 'amountCents', 'regionalPricing', 'stock', 'onHand']) {
      assert.equal(item[field] == null, true, item.id + ' / ' + field);
    }
    assert.equal(regional.priced?.[item.id], undefined);
    assert.equal(pricing.window.MIRBoutiquePricing.resolve(item.id).amountCents, null);
    assert.equal(pricing.window.MIRBoutiquePricing.resolve(item.id).state, 'on_request');
  }
});

console.log(`${checks} contrôles réussis — fichiers locaux uniquement, aucun envoi ni service externe.`);
