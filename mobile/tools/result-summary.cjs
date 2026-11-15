'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.resolve(__dirname,'../../artifacts/phase11');
for(const [name,count]of [['webview-tests',8],['upgrade-prepare',1],['upgrade-verify',1],['real-roles',1]]){
 const log=fs.readFileSync(path.join(dir,name+'.txt'),'utf8');assert.match(log,new RegExp('^OK \\('+count+' tests?\\)','m'),name+' incomplet');assert.doesNotMatch(log,/FAILURES|INSTRUMENTATION_FAILED|Process crashed/);
}
const nativeScreens=require('./native-screen-proofs.cjs').verifyNativeScreens(path.join(dir,'phase11-proof'));
const sharedAuthLock=JSON.parse(fs.readFileSync(path.join(dir,'phase11-proof/auth-webview-lock.json'),'utf8'));assert.equal(sharedAuthLock.originA,'https://localhost');assert.equal(sharedAuthLock.originB,sharedAuthLock.originA);assert.equal(sharedAuthLock.lockName,'mir-android-auth-transition');assert.equal(sharedAuthLock.secureContext,true);assert.equal(sharedAuthLock.heldAndPendingObserved,true);assert.equal(sharedAuthLock.secondWaited,true);assert.equal(sharedAuthLock.secondAcquiredAfterRelease,true);assert.equal(sharedAuthLock.physicalDevice,false);
for(const key of ['heldAndPendingBeforeRecreate','peerAcquiredAfterRecreateWithoutRelease','newNativeBridgeResponsive'])assert.equal(sharedAuthLock[key],true,'WebView lifecycle proof: '+key);
const report={nativeScreens,sharedAuthLock,source:fs.readFileSync(path.join(dir,'pr-head-sha.txt'),'utf8').trim(),base:fs.readFileSync(path.join(dir,'base-sha.txt'),'utf8').trim(),project:'hxtztkmbfpmzrieccwsg',androidApi:35,emulator:true,physicalDevice:false,nativeTests:8,updateChecks:2,roles:['employe','chef_equipe','warehouse','assistant','boss'],technicalAdminDenied:true,foreignOrganizationDenied:true,businessMutationRequested:false,productionAccess:false,signature:'debug only',versionCode:130002};
fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS recette Android : WebView, permissions, PDF, mise à jour et cinq rôles TEST; Admin technique refusé.');
