'use strict';
/* Contrôles de non-régression MIR sur la source GitHub Pages. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const X = require('../dist/atelier-essai/mir-calepinage-extension.js');
const P = require('../dist/production-model.js');
const Transfer = require('../dist/profile-production-transfer.js');
let total = 0;
function test(name, fn) { fn(); total++; console.log('PASS ' + name); }
test('6/12 : portée 108 po, montée 27 po et pointe 123 po', () => {
  const x = X.gableFromPitch(108, 96, '6/12');
  assert.equal(x.riseIn, 27);
  assert.equal(x.heightIn, 123);
  assert.equal(x.peakXIn, 54);
});
test('Pente 6 / 12 avec espaces', () => assert.equal(X.gableFromPitch('108', '96', '6 / 12').riseIn, 27));
test('Pente numérique 6', () => assert.equal(X.gableFromPitch(108, 96, 6).heightIn, 123));
test('Pentes gauche/droite indépendantes', () => assert.ok(Math.abs(X.gableFromPitch(108, 96, '6/12', '8/12').peakXIn - 108 * 8 / 14) < 1e-8));
test('Fractions chantier', () => {
  assert.equal(X.parseDimension('32½'), 32.5);
  assert.equal(X.parseDimension('2 1/4'), 2.25);
  assert.equal(X.parseDimension('⅜'), .375);
});
test('Largeur verrouillée, fermeture exacte', () => {
  const x = X.redistributePanels({totalAssemblyIn:108,panelCount:3,overlapIn:1,locked:{1:'32½'}});
  assert.equal(x.ok, true);
  assert.equal(x.widthsIn[1],32.5);
  assert.equal(x.closureIn,108);
});
test('Solin brique sans cotes inventées', () => {
  assert.ok(X.PROFILE_TEMPLATES.solin_brique.fields.every(f => f.defaultValue === ''));
});
test('Coin 86 degrés possible', () => {
  const x = X.buildProfileGeometry('coin_arch_90',{faceA:2,faceB:3},{angleOverrides:{faceB:86}});
  assert.equal(x.segments[1].headingDeg,86);
});
test('Coin J : clouage minimum = retour + 1¼', () => {
  assert.equal(X.checkJRule({jReturn:1,nailing:2}).minimumIn,2.25);
  assert.equal(X.autoCorrectJ({jReturn:1,nailing:2}).nailing,2.25);
});
test('Exception J requiert acceptation explicite', () => {
  assert.throws(() => X.acceptJException({jReturn:1,nailing:2},{accepted:false}));
});
test('Snapshot J avec exception transférable en production', () => {
  const s=X.finalizeProfileOrder('coin_arch_j',{faceA:5,faceB:6,jDepth:1,jReturn:1,nailing:2},{exception:{accepted:true,acceptedBy:'MIR',note:'essai'}});
  assert.equal(s.ruleExceptions[0].minimumIn,2.25);
  const prepared=Transfer.prepare(X,s,120,1);
  assert.ok(prepared.spec.note.includes('Dérogation'));
  assert.equal(P.buildProfile(prepared.spec).valid,true);
});
test('Tracé SHIFT orthogonal', () => assert.deepEqual(X.applyDrawingConstraint([0,0],[9,3],{keyboardShift:true}),[9,0]));
test('Le lien production vers coins/solin est présent', () => {
  const html=fs.readFileSync(path.join(__dirname,'../dist/production.html'),'utf8');
  assert.ok(html.includes('atelier-essai/pliages-integration-candidate.html?production=1'));
});
test('La page des coins charge les composants de production', () => {
  const html=fs.readFileSync(path.join(__dirname,'../dist/atelier-essai/pliages-integration-candidate.html'),'utf8');
  assert.ok(html.includes('../profile-production-transfer.js'));
  assert.ok(html.includes('MIR — Solin brique et coins architecturaux'));
});
console.log('Tests MIR : '+total+'/'+total+' réussis.');