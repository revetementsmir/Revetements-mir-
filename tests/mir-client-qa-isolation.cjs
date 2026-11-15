'use strict';
/* Fail-closed MIR PR41 review of TEST-only fixture changes.
 * Never allow app / Auth / APK / migration code under the bilingual client lot.
 * File blob hashes correspond to the exact reviewed, guarded QA fixture SQL.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const pin=Object.freeze({
 'mobile/tools/verify-pr39-native-fixture.cjs':'06d8a25e9e974c19620c0ea5fcd9e0ae05523001',
 'supabase/test-only/fixtures/pr41-android-native-active-20261115.sql':'c4922773669d1f3d36a788bc1a1c377118b276f5',
 'supabase/test-only/fixtures/pr41-android-native-active-close-20261115.sql':'064207f3a5d19717d79e8d36799c6ca46ef057f3',
 'supabase/test-only/fixtures/pr41-android-native-chef-today-20261115.sql':'aaa8f3831d681b6e3cf9479e1d677b3f4fdf53fc',
 'supabase/test-only/fixtures/pr41-android-native-chef-today-close-20261115.sql':'e6d037654ee5c6009a3f4b14eccb6ebed37f4911'
});
const protectedFiles=['mobile','supabase','dist/chantier-app.js','dist/portal-client.js',
 'dist/entrepot.html','dist/entrepot-app.js','dist/coordination.html',
 'dist/production-app.js','dist/mir-estimate-presentation.js',
 'dist/mir-help-center.js','dist/mir-client-return.js'];
const base=process.env.MIR_CLIENT_BASE_SHA||'33eacb5741e801067178fdeec83a9489332333c6';
assert.match(base,/^[0-9a-f]{40}$/);
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8'}).trim();
const changed=git('diff','--name-only',base,'HEAD','--',...protectedFiles).split('\n').filter(Boolean);
assert.deepEqual(changed.sort(),Object.keys(pin).sort(),
 'Only five explicitly reviewed MIR TEST-only files may differ; all staff/Auth/APK/production remains protected');
for(const [file,blob]of Object.entries(pin)){
 assert.equal(git('hash-object',file),blob,'Approved exact Git blob required: '+file);
 assert.ok(fs.statSync(file).isFile());
 const source=fs.readFileSync(file,'utf8');
 assert.doesNotMatch(source,/gccltmaulvrnthrbnrpd|\.supabase\.co\/rest\/v1\/rpc\/mir_punch_action/);
 if(file.endsWith('.sql')){
  assert.ok(file.startsWith('supabase/test-only/fixtures/pr41-android-native-'));
  assert.match(source,/select set_config\('mir\.target_project','hxtztkmbfpmzrieccwsg',true\)/);
  assert.match(source,/current_setting\('mir\.target_project',true\)/);
  assert.match(source,/pg_advisory_xact_lock/);
  assert.match(source,/(?:9100|9110|9120|9130)-000000000001/);
  assert.doesNotMatch(source,/7da20261-1114-4000-91/);
 }else{
  assert.match(source,/const HOST='hxtztkmbfpmzrieccwsg\.supabase\.co'/);
  assert.match(source,/readOnly:true/);
  assert.match(source,/7da20261-1115-4000-9100-000000000001/);
  assert.match(source,/7da20261-1115-4000-9110-000000000001/);
 }
}
console.log('PASS PR41 synthetic MIR TEST exception: five SHA-pinned fixture/preflight files only; staff, production and APK protected');
