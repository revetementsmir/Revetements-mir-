'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {TEST,assertMirTestConfig}=require('../tools/validation/mir-phase3c-test-guard.cjs');
test('le prévol accepte exclusivement la configuration MIR TEST exacte',()=>{
 assert.equal(assertMirTestConfig({...TEST,environment:'test'}),true);
 for(const config of [null,{...TEST,environment:'production'},{...TEST,environment:'test',projectRef:'gccltmaulvrnthrbnrpd'},{...TEST,environment:'test',supabaseUrl:'https://gccltmaulvrnthrbnrpd.supabase.co'},{...TEST,environment:'test',publishableKey:'incorrecte'}])assert.throws(()=>assertMirTestConfig(config),/preflight refused/);
});
test('un refus de prévol survient avant la fonction Auth et sans réseau',async()=>{
 let authCalls=0,networkCalls=0;
 const authenticate=async()=>{authCalls++;networkCalls++;};
 try{assertMirTestConfig({...TEST,environment:'production'});await authenticate();}catch(error){assert.match(error.message,/preflight refused/);}
 assert.equal(authCalls,0);assert.equal(networkCalls,0);
});
