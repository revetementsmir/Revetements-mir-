'use strict';
/* PR42-specific, SHA-based isolation review. Keep the original PR41
 * five-file pinning test unchanged for historic bilingual deliveries.
 * This exception NEVER permits modifying client or staff implementations. */
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs');
const BASE='65b3145f735ea11ee0f77d331270649ece7266ec';
assert.equal(process.env.MIR_CLIENT_BASE_SHA,BASE,'PR42 must be reviewed against its exact released main SHA');
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8'}).trim();
const changed=git('diff','--name-only',BASE,'HEAD').split('\n').filter(Boolean).sort();
const allowed=new Set([
 '.github/workflows/mir-client-i18n-pr.yml',
 '.github/workflows/mir-phase11-android-pr.yml',
 '.github/workflows/mir-studio-mail-recipe-pr.yml',
 '.github/workflows/pages.yml',
 'docs/verification/studio-public-courriels-20261115.md',
 'mobile/tools/native-qa-fixture.cjs',
 'mobile/tools/prepare-real-qa-manifest.cjs',
 'mobile/android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirRealRolesTest.java',
 'mobile/tools/test-native-qa-fixture.cjs',
 'mobile/tools/test-pr39-native-fixture.cjs',
 'mobile/tools/verify-pr39-native-fixture.cjs',
 'ops/studio-public/under-construction.html',
 'scripts/stage-mir-studio-public.cjs',
 'supabase/test-only/README.md',
 'supabase/test-only/migrations/20261115235000_mir_native_qa_run_lease_test.sql',
 'tests/mir-client-pr42-isolation.cjs',
 'tests/mir-client-followup-browser.cjs',
 'tests/mir-final-release-gate-pr42.cjs',
 'scripts/mir-final-release-gate.cjs',
 'tests/mir-client-account-isolation.cjs',
 'tests/mir-mail-recipe-offline.cjs',
 'tests/mir-native-qa-sql-guards.cjs',
 'tests/mir-pr39-native-chef-fixture.cjs',
 'tests/mir-studio-public-browser.cjs',
 'tests/mir-studio-public-stage.cjs',
 'tools/qa/mir-mail-recipe.cjs'
]);
assert.ok(changed.length>0,'Expected a reviewable diff');
assert.deepEqual(changed.filter(f=>!allowed.has(f)),[],'PR42 may only modify the exact listed source-free QA/Studio packaging files');
for(const p of ['dist','server','supabase/functions','supabase/migrations']){
 const files=git('diff','--name-only',BASE,'HEAD','--',p).split('\n').filter(Boolean);
 assert.deepEqual(files,[],p+' must be byte-identical to main, including production/Auth/APK and guarded Pages release gate');
}
// Native Android source files remain immutable; only one instrumented TEST
// assertion may follow the exact runtime fixture IDs of its own CI run.
const javaFixture='mobile/android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirRealRolesTest.java';
assert.deepEqual(git('diff','--name-only',BASE,'HEAD','--','mobile/android').split('\n').filter(Boolean),[javaFixture],
  'Only the native Android TEST assertion may change; app/APK sources remain byte-identical');
const native=fs.readFileSync(javaFixture,'utf8');
assert.match(native,/native-qa-run-manifest\.json/);
assert.match(native,/Exact per-run synthetic marker/);
assert.doesNotMatch(native,/QA-TEAMS-HOURS-SYNTHETIC-NOT-PHYSICAL/);
for(const [file,hash]of Object.entries({
 'supabase/test-only/fixtures/pr41-android-native-active-20261115.sql':'e450d0e392f92346c7f729e28091d4fe0b9bbfbd',
 'supabase/test-only/fixtures/pr41-android-native-active-close-20261115.sql':'ae0679a21c56fc888c719bff5e9adcdaf482d896',
 'supabase/test-only/fixtures/pr41-android-native-chef-today-20261115.sql':'829640d0554b844647eb15c7247050e771c8842f',
 'supabase/test-only/fixtures/pr41-android-native-chef-today-close-20261115.sql':'dc8a5c5f83a927c3c6251c3b01ecd9cd6298581c'
}))assert.equal(git('hash-object',file),hash,'Historic PR41 QA SQL unchanged: '+file);
const migration=fs.readFileSync('supabase/test-only/migrations/20261115235000_mir_native_qa_run_lease_test.sql','utf8');
assert.match(migration,/^-- MIR TEST ONLY/);
assert.doesNotMatch(migration,/gccltmaulvrnthrbnrpd|delete from mir_core\.punch_shifts|drop table/i);
// The only release-gate modification permitted is the isolated PR42
// branch and its constants. Old PR36/37/41 gate must survive byte-for-byte.
const gateNow=fs.readFileSync('scripts/mir-final-release-gate.cjs','utf8');
const oldGate=cp.execFileSync('git',['show',BASE+':scripts/mir-final-release-gate.cjs'],{encoding:'utf8'});
const constantsStart=gateNow.indexOf('const PR42_PUBLIC_BASE='),constantsEnd=gateNow.indexOf('const git=',constantsStart);
assert.ok(constantsStart>0&&constantsEnd>constantsStart,'PR42 extension constants required');
const noConstants=gateNow.slice(0,constantsStart)+gateNow.slice(constantsEnd);
const branchStart=noConstants.indexOf('  if(subject===PR42_MERGE_SUBJECT){');
const branchToken='  }else if(subject===CLIENT_RELEASE_SUBJECT){';
const branchEnd=noConstants.lastIndexOf(branchToken);
assert.ok(branchStart>0&&branchEnd>branchStart,'PR42 release gate branch required');
const originalGate=noConstants.slice(0,branchStart)+'  if(subject===CLIENT_RELEASE_SUBJECT){'+noConstants.slice(branchEnd+branchToken.length);
assert.equal(originalGate,oldGate,'original MIR production release gate must remain byte-identical');
assert.match(gateNow,/PR42_CERTIFIED_HEAD='8d9641f2c1df84c6fec3c4e4fb417168b3c92c4c'/);
const qa=fs.readFileSync('mobile/tools/native-qa-fixture.cjs','utf8');
assert.match(qa,/const BASE='https:\/\/'\+TEST\+'\.supabase\.co'/);
assert.match(qa,/GITHUB_ACTIONS!=='true'/);
assert.match(qa,/MIR_TEST_TARGET!=='sandbox'/);
const followup=fs.readFileSync('tests/mir-client-followup-browser.cjs','utf8');
assert.match(followup,/html\[data-mir-studio-public-state="construction"\]/,'Published client followup must check public construction');
assert.match(followup,/\/test\/plan\.html/,'Published client followup must test Studio tools in isolated TEST');
const studio=fs.readFileSync('scripts/stage-mir-studio-public.cjs','utf8');
assert.match(studio,/testPagesUnchanged:true/);
const mail=fs.readFileSync('tools/qa/mir-mail-recipe.cjs','utf8');
assert.match(mail,/transportCalled:false/);
console.log('PASS PR42 isolated from published bilingual client, staff, Auth, APK, SQL PROD and release gate; historical PR41 fixture SHAs preserved. '+changed.length+' exact allowed files.');
