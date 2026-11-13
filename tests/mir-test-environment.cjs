'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {build,productionManifest,candidateRelease}=require('../scripts/build-mir-test.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mir-test-contract-'));
try{
 const source=path.join(dir,'site'),target=path.join(source,'test');fs.mkdirSync(source);
 for(const name of ['portal-config.js','shared-config.js','mir-estimate-config.js','mir-test-guard.js','index.html','responsive.html'])fs.copyFileSync(path.join(__dirname,'../dist',name),path.join(source,name));
 const revision='a'.repeat(40),result=build(source,target,revision);assert.equal(result.projectRef,'hxtztkmbfpmzrieccwsg');
 const scope={window:{},location:{search:'?recette=0'},URLSearchParams};
 for(const name of ['portal-config.js','shared-config.js','mir-estimate-config.js']){const text=fs.readFileSync(path.join(target,name),'utf8');assert(!text.includes('gccltmaulvrnthrbnrpd'));vm.runInNewContext(text,scope);}
 assert.equal(scope.window.MIRPortalConfig.environment,'test');assert.equal(scope.window.MIRPortalConfig.projectRef,'hxtztkmbfpmzrieccwsg');assert.equal(scope.window.MIRPortalConfig.callbackPath,'/Revetements-mir-/test/chantier.html');
 for(const flag of ['signupEnabled','googleEnabled','emailEnabled','invitationsEnabled'])assert.equal(scope.window.MIRPortalConfig[flag],false);
 assert.equal(scope.window.MIRSharedConfig.supabaseUrl,'https://hxtztkmbfpmzrieccwsg.supabase.co');assert.equal(scope.window.MIREstimateConfig.environment,'test');
 const html=fs.readFileSync(path.join(target,'index.html'),'utf8');assert(html.includes('Content-Security-Policy'));assert(html.indexOf('mir-test-guard.js')<html.indexOf('mir-public-menu.js'));
 assert(!fs.readFileSync(path.join(target,'responsive.html'),'utf8').includes('<script src="mir-test-guard.js">'));
 assert.equal(JSON.parse(fs.readFileSync(path.join(target,'mir-test-environment.json'))).revision,revision);
 assert.throws(()=>build(source,target,revision));assert.throws(()=>build(source,path.join(dir,'bad'),'main'));
 assert.equal(fs.readFileSync(path.join(source,'portal-config.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../dist/portal-config.js'),'utf8'),'production configuration is unchanged');
 const production=productionManifest(source,revision),candidate=path.join(dir,'candidate'),release=path.join(dir,'release');
 fs.mkdirSync(candidate);for(const name of fs.readdirSync(source)){if(name!=='test')fs.copyFileSync(path.join(source,name),path.join(candidate,name));}
 fs.writeFileSync(path.join(candidate,'index.html'),'<html><head></head><body>CANDIDAT TEST SEULEMENT</body></html>');
 candidateRelease(source,candidate,release,production,'b'.repeat(40));
 assert.equal(fs.readFileSync(path.join(release,'index.html'),'utf8'),fs.readFileSync(path.join(source,'index.html'),'utf8'));
 assert(fs.readFileSync(path.join(release,'test/index.html'),'utf8').includes('CANDIDAT TEST SEULEMENT'));
 assert.deepEqual(productionManifest(release,revision),production,'TEST-only publication preserves every production byte');
 fs.writeFileSync(path.join(source,'index.html'),'PRODUCTION MODIFIEE');assert.throws(()=>candidateRelease(source,candidate,path.join(dir,'refused'),production,'b'.repeat(40)),/Production source differs/);
 console.log('PASS isolated TEST generation, fixed sandbox configuration, disabled deliveries, callback, first-script guard, CSP, manifest and unchanged production');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
