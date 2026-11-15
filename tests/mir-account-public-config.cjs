'use strict';
const assert=require('node:assert/strict'),config=require('./mir-account-config-helper.cjs'),Auth=require('../dist/portal-client.js');
const file=process.argv[2],prod=config(file?{file}:{}),test=config(file?{file,test:true}:{test:true});
for(const c of [prod,test]){assert.equal(c.enabled,true);assert.equal(c.accountEnabled,true);assert.equal(c.passwordEnabled,true);assert.match(c.publishableKey,/^sb_publishable_/);assert.equal(Auth.validateConfig(c,c.siteOrigin).callbackPath,'/Revetements-mir-/chantier.html');assert.equal(c.documentsEnabled,false);}
assert.equal(prod.projectRef,'gccltmaulvrnthrbnrpd');assert.equal(test.projectRef,'hxtztkmbfpmzrieccwsg');assert.notEqual(prod.publishableKey,test.publishableKey);for(const flag of ['googleEnabled','emailEnabled','signupEnabled','invitationsEnabled','manualInvitations'])assert.equal(prod[flag],false,'production capability must stay disabled: '+flag);
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const official={window:{},location:{hostname:'revetementsmir.github.io',pathname:'/Revetements-mir-/chantier.html',search:'?recette=1'},URLSearchParams};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/portal-config.js'),'utf8'),official);
assert.equal(official.window.MIRPortalConfig.environment,'production','public query cannot enter MIR TEST');
assert.equal(official.window.MIRPortalConfig.projectRef,'gccltmaulvrnthrbnrpd');
assert.deepEqual(Auth.validateConfig({enabled:false}),{enabled:false});console.log('PASS public account config: active MIR, isolated MIR TEST, public keys only and strict callback');
