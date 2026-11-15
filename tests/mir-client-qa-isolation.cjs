'use strict';
/* Fail-closed MIR PR41 review of TEST-only fixture changes.
 * Never allow app / Auth / APK / migration code under the bilingual client lot.
 * File blob hashes correspond to the exact reviewed, guarded QA fixture SQL.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const pin=Object.freeze({
 'mobile/tools/verify-pr39-native-fixture.cjs':'feec522e459f3b3a10e6dd5898a40371e1e36fef',
 'supabase/test-only/fixtures/pr41-android-native-active-20261115.sql':'e450d0e392f92346c7f729e28091d4fe0b9bbfbd',
 'supabase/test-only/fixtures/pr41-android-native-active-close-20261115.sql':'ae0679a21c56fc888c719bff5e9adcdaf482d896',
 'supabase/test-only/fixtures/pr41-android-native-chef-today-20261115.sql':'829640d0554b844647eb15c7247050e771c8842f',
 'supabase/test-only/fixtures/pr41-android-native-chef-today-close-20261115.sql':'dc8a5c5f83a927c3c6251c3b01ecd9cd6298581c'
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
  assert.match(source,/7da20261-1115-4000-92(?:00|10|20|30)-00000000000/,'Exact allocated QA prefix, including the SQL generator suffix');
  assert.doesNotMatch(source,/7da20261-1114-4000-91/);
 }else{
  assert.match(source,/const HOST='hxtztkmbfpmzrieccwsg\.supabase\.co'/);
  assert.match(source,/readOnly:true/);
  assert.match(source,/7da20261-1115-4000-9200-000000000001/);
  assert.match(source,/7da20261-1115-4000-9210-000000000001/);
 }
}
console.log('PASS PR41 synthetic MIR TEST exception: five SHA-pinned fixture/preflight files only; staff, production and APK protected');
