'use strict';
const assert=require('node:assert/strict'),config=require('./mir-account-config-helper.cjs'),Auth=require('../dist/portal-client.js');
const file=process.argv[2],prod=config(file?{file}:{}),test=config(file?{file,test:true}:{test:true});
for(const c of [prod,test]){assert.equal(c.enabled,true);assert.equal(c.accountEnabled,true);assert.equal(c.passwordEnabled,true);assert.match(c.publishableKey,/^sb_publishable_/);assert.equal(Auth.validateConfig(c,c.siteOrigin).callbackPath,'/Revetements-mir-/chantier.html');assert.equal(c.documentsEnabled,false);}
assert.equal(prod.projectRef,'gccltmaulvrnthrbnrpd');assert.equal(test.projectRef,'hxtztkmbfpmzrieccwsg');assert.notEqual(prod.publishableKey,test.publishableKey);assert.equal(prod.googleEnabled,true);
assert.deepEqual(Auth.validateConfig({enabled:false}),{enabled:false});console.log('PASS public account config: active MIR, isolated MIR TEST, public keys only and strict callback');
