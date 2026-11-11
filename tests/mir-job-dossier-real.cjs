'use strict';
/* Contrat de certification hébergée: exécuter uniquement contre MIR TEST avec les six comptes configurés. */
const test=require('node:test'),assert=require('node:assert/strict');
const {ROLE_DEFINITIONS,configuration}=require('../tools/validation/certify-six-roles.cjs');
test('la recette Phase 1 exige six comptes distincts et interdit la production',()=>{assert.deepEqual(ROLE_DEFINITIONS.map(r=>r.key),['ADMIN','BOSS','CHEF','EMPLOYEE','ADJOINTE','ENTREPOT']);assert.throws(()=>configuration({MIR_TEST_SUPABASE_URL:'https://gccltmaulvrnthrbnrpd.supabase.co'}),/MIR_TEST|production|variable/i);});
