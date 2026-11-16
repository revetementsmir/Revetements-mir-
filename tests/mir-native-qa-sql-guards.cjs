'use strict';
/* Static fail-closed contract for the MIR TEST-only per-run SQL migration and
 * CI cleanup chain; the SQL never belongs in the production migration tree. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const file='supabase/test-only/migrations/20261115235000_mir_native_qa_run_lease_test.sql';
const sql=read(file),ci=read('.github/workflows/mir-phase11-android-pr.yml');
assert.match(file,/^supabase\/test-only\/migrations\//);
assert.doesNotMatch(sql,/gccltmaulvrnthrbnrpd/,'no PRODUCTION reference even in TEST migration');
for(const pattern of [
 /mir\.target_project','hxtztkmbfpmzrieccwsg'/,
 /'MIR TEST REQUIRED'/,
 /create table if not exists mir_core\.qa_native_runs/,
 /create unique index if not exists qa_native_one_active_run/,
 /state='active'/,
 /security definer set search_path=pg_catalog,mir_core/,
 /coalesce\(mir_core\.staff_role\(v_org,v_actor\),''\)<>'boss'/,
 /p_token !~ '\^\[0-9a-f\]\{64\}\$'/,
 /gen_random_uuid\(\)/,
 /QA_OTHER_RUN_ACTIVE_OR_STALE/,
 /QA_RECORD_CHANGED_OR_REFERENCED/,
 /team_attendance/,
 /punch_events/,
 /punch_corrections/,
 /qa_native_run_audit/,
 /select.*into v_row.*lease_until<clock_timestamp\(\)/s,
 /update mir_core\.punch_shifts set ended_at=v_closed,status='review'/,
 /revoke all on function public\.mir_qa_native_run.*from public,anon/s,
 /grant execute on function public\.mir_qa_native_run.*to authenticated/
 ])assert.match(sql,pattern);
assert.doesNotMatch(sql,/delete from mir_core\.punch_shifts|delete from mir_core\.punch_segments|delete from mir_core\.punch_audit|update mir_core\.punch_shifts set ended_at=null/i,'no history deletion or reopening');
assert.doesNotMatch(sql,/drop table|truncate|alter table mir_core\.punch_shifts|drop policy/i,'existing business objects unchanged');
assert.match(ci,/group: mir-native-qa-shared-\$\{\{ github\.repository \}\}/);
assert.match(ci,/cancel-in-progress: false/);
assert.match(ci,/node mobile\/tools\/native-qa-fixture\.cjs start/);
assert.match(ci,/node mobile\/tools\/prepare-real-qa-manifest\.cjs/);
assert.ok(ci.indexOf('node mobile/tools/native-qa-fixture.cjs start')<ci.indexOf('node mobile/tools/prepare-real-qa-manifest.cjs'),'Android manifest injected after confirmed server run');
assert.ok(ci.indexOf('node mobile/tools/prepare-real-qa-manifest.cjs')<ci.indexOf('node mobile/tools/verify-pr39-native-fixture.cjs'),'Preflight checks only after injecting native runtime fixture');
const native=read('mobile/android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirRealRolesTest.java');
assert.match(native,/native-qa-run-manifest\.json/,'Native role test reads private run manifest');
assert.match(native,/Exact per-run synthetic marker/,'Native role test validates server-sourced marker');
assert.match(native,/Exact per-run shift/,'Native role test validates correct shift');
assert.match(native,/Exact per-run segment/,'Native role test validates correct segment');
assert.doesNotMatch(native,/QA-TEAMS-HOURS-SYNTHETIC-NOT-PHYSICAL/,'Native role test cannot accept obsolete PR41 marker');
assert.match(native,/injectDeliberateNativeTap/,'Native dialog close uses a real touchscreen injection');
assert.match(native,/automation\.injectInputEvent\(down,true\)/,'Native down injected through Android UI automation');
assert.match(native,/automation\.injectInputEvent\(up,true\)/,'Native release injected through Android UI automation');
assert.match(native,/e\.type==='click'&&e\.close/,'Native close must still generate a real click');
assert.match(native,/document\.querySelector\('#portal-dialog'\)\?\.open===false/,'Real dialog closure must also be observed');
assert.match(ci,/node mobile\/tools\/verify-pr39-native-fixture\.cjs/);
assert.match(ci,/node mobile\/tools\/native-qa-fixture\.cjs finish/);
assert.match(ci,/if: always\(\)/);
assert.ok(ci.indexOf('node mobile/tools/native-qa-fixture.cjs start')<ci.indexOf("MirRealRolesTest"),'QA setup before dependent roles');
assert.ok(ci.lastIndexOf('node mobile/tools/native-qa-fixture.cjs finish')>ci.indexOf("MirRealRolesTest"),'always-cleanup after dependent roles');
const legacy=read('mobile/tools/verify-pr39-native-fixture.cjs');
assert.doesNotMatch(legacy,/9200-|9210-|9220-|9230-|2026-11-15'/,'no hardcoded PR41 fixture ids or date');
assert.match(legacy,/manifest\.marker/);
assert.match(legacy,/checkState/);
assert.match(legacy,/checkLead/);
for(const publicFile of ['dist/plan.html','dist/studio.html','dist/portal-config.js']){
 const content=read(publicFile);
 assert.doesNotMatch(content,/mir_qa_native_run|MIR_NATIVE_QA|QA-NATIVE-RUN-/,'QA server cannot be activated from public website');
}
console.log('PASS MIR TEST-only SQL migration, run-scoped UUIDs, serialized Android CI, two cleanup paths, strict old-data guards, no production migration');
