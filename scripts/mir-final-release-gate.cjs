'use strict';
// Release gate: PR36 alone must never publish. Only the reviewed PR37 merge on
// main may deploy. No Supabase call, no mail, no Google, no payment activation.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const RELEASE=path.resolve('docs/verification/mir-pages-final-20261115.json');
const expectedSubject='Merge PR #37 — MIR intégration finale vers main';
const FINAL_MERGE='adfe5847a00ad5b0989079a4cd494df0ba5d0b13';
const PR36_MAIN='26b0acb98aa3a17e360128fe6a69c5121094f97f';
const PR37_REVIEWED='bee9527ce4bbf2cbbf9718123346396c4bc3ff19';
const POST_RELEASE_QA_SUBJECT="test(pages): verify disabled production estimate service after PR37 release";
const QA_OLD_STATUS="Connectez-vous avec votre compte équipe MIR, puis revenez à cette fiche.";
const QA_NEW_STATUS="L’accès aux fiches privées n’est pas encore raccordé au service d’estimation.";

const GUARDED_GET_PARENT='45cc28da0f0500d09e5b0ac4e276947be8ca741d';
const GUARDED_GET_SUBJECT="fix(pages): allow isolated MIR TEST read-only estimate configuration";
const GUARDED_GET_FIX_PARENT='196bfc45bd2ca562cffa7afc19cc4b3a50ea111e';
const GUARDED_GET_FIX_SUBJECT="fix(ci): certify strict Pages gate newline parsing";
const GUARDED_GET_OLD="const invitationService=url.pathname==='/functions/v1/mir-team-invitations'&&verb==='POST';if(url.pathname.startsWith('/functions/')&&!invitationService||(auth&&!safeAuth))throw Error('TEST_EXTERNAL_DELIVERY_DISABLED');";
const GUARDED_GET_NEW="const invitationService=url.pathname==='/functions/v1/mir-team-invitations'&&verb==='POST';const readonlyEstimateConfig=url.pathname==='/functions/v1/mir-estimates/config'&&verb==='GET';if(url.pathname.startsWith('/functions/')&&!invitationService&&!readonlyEstimateConfig||(auth&&!safeAuth))throw Error('TEST_EXTERNAL_DELIVERY_DISABLED');";
const GUARDED_TEST_OLD1="let xhrBlocked=false;try{new XMLHttpRequest().open('GET','https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/proof');}catch{xhrBlocked=true;}";
const GUARDED_TEST_NEW1="const configStatus=await fetch('https://hxtztkmbfpmzrieccwsg.supabase.co/functions/v1/mir-estimates/config',{method:'GET'});const readOnlyConfigOk=configStatus.ok;let otherFunctionBlocked=false;try{await fetch('https://hxtztkmbfpmzrieccwsg.supabase.co/functions/v1/mir-estimates/challenge',{method:'GET'});}catch{otherFunctionBlocked=true;}let xhrBlocked=false;try{new XMLHttpRequest().open('GET','https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/proof');}catch{xhrBlocked=true;}";
const GUARDED_TEST_OLD2="return {before,blocked,xhrBlocked,property:";
const GUARDED_TEST_NEW2="return {before,blocked,readOnlyConfigOk,otherFunctionBlocked,xhrBlocked,property:";
const GUARDED_TEST_OLD3="assert.deepEqual(state.blocked,[true,true,true,true]);assert(state.xhrBlocked);";
const GUARDED_TEST_NEW3="assert.deepEqual(state.blocked,[true,true,true,true]);assert.equal(state.readOnlyConfigOk,true,'GET config allowed in MIR TEST only');assert.equal(state.otherFunctionBlocked,true,'other service GET remains blocked');assert(state.xhrBlocked);";

const RELEASE_TRIGGER_PARENT='ee3c832104618b88b1cb688343d81d41d6b354b0';
const RELEASE_TRIGGER_SUBJECT="ci(pages): include guarded release gate in trigger paths";
const RELEASE_TRIGGER_OLD_PATHS="'scripts/build-mir-test.cjs', '.github/workflows/pages.yml'";
const RELEASE_TRIGGER_NEW_PATHS="'scripts/build-mir-test.cjs', 'scripts/mir-final-release-gate.cjs', '.github/workflows/pages.yml'";
const POST_RELEASE_RECHECK_PARENT='586a7125a3f90bac0c53cf8a9c59cdb265b20cae';
const POST_RELEASE_RECHECK_SUBJECT="ci(pages): fresh guarded verification of MIR TEST published origin";
const POST_RELEASE_REPAIR_PARENT='ee9a2a0ac7e0c228c9cb46d6e5960cb5bf601f31';
const POST_RELEASE_REPAIR_SUBJECT="fix(ci): repair guarded Pages fresh-run verification";
const CLIENT_RELEASE_BASE='33eacb5741e801067178fdeec83a9489332333c6';
const CLIENT_RELEASE_SUBJECT='Merge PR #41 — MIR client FR-CA / EN-CA';
const CLIENT_FINAL_COMMIT_SUBJECT='fix(client-release): preserve public header and fresh isolated QA';
const CLIENT_RELEASE_CHANGED=[".github/workflows/mir-client-i18n-pr.yml",".github/workflows/pages.yml","dist/annotated-pdf.js","dist/boutique.html","dist/catalogue.js","dist/chantier.html","dist/commerce.js","dist/contact.html","dist/estimation-dossier.html","dist/estimation.html","dist/index.html","dist/materiaux.html","dist/mir-account-flow.js","dist/mir-client-en-ca.js","dist/mir-client-i18n.css","dist/mir-client-i18n.js","dist/mir-dossier-pdf.js","dist/mir-estimate.js","dist/mir-panel-po-pdf.js","dist/mir-selection-pdf.js","dist/mir-unified-client-dossier.js","dist/plan-app.js","dist/plan.html","dist/pliage.html","dist/pliage.js","dist/production-model.js","dist/production.html","dist/produit.html","dist/realisations.html","dist/selection.html","dist/studio.html","docs/verification/client-localisation-20261115.md","mobile/tools/verify-pr39-native-fixture.cjs","scripts/mir-final-release-gate.cjs","supabase/test-only/fixtures/pr41-android-native-active-20261115.sql","supabase/test-only/fixtures/pr41-android-native-active-close-20261115.sql","supabase/test-only/fixtures/pr41-android-native-chef-today-20261115.sql","supabase/test-only/fixtures/pr41-android-native-chef-today-close-20261115.sql","tests/mir-chat-phase3a.cjs","tests/mir-client-accessibility-browser.cjs","tests/mir-client-account-en-browser.cjs","tests/mir-client-account-isolation.cjs","tests/mir-client-commerce-approved-browser.cjs","tests/mir-client-email-boundary.cjs","tests/mir-client-i18n-browser.cjs","tests/mir-client-i18n-pdf-browser.cjs","tests/mir-client-i18n-static.cjs","tests/mir-client-i18n.cjs","tests/mir-client-mail-simulation-browser.cjs","tests/mir-client-pdf-bilingual.cjs","tests/mir-client-published-browser.cjs","tests/mir-client-qa-isolation.cjs","tests/mir-client-signature-browser.cjs","tests/mir-client-unified-bilingual-browser.cjs"];
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
function check(){
  if(process.env.GITHUB_REF&&process.env.GITHUB_REF!=='refs/heads/main')throw Error('Pages release requires main');
  const marker=JSON.parse(fs.readFileSync(RELEASE,'utf8'));
  assert.equal(marker.release,'MIR-20261115-PR36-37-40');
  assert.equal(marker.approved,true);
  // First publication requires the exact PR36→PR37 merge. The *single*
  // post-release QA correction must be a direct child of that merge and may
  // only change this gate and the published estimate browser expectation.
  // Every other production/TEST/SEO release assertion below still applies.
  const subject=git('log','-1','--pretty=%s');
  const parents=git('rev-list','--parents','-n','1','HEAD').split(/\s+/);
  const reviewedParents=git('rev-list','--parents','-n','1',FINAL_MERGE).split(/\s+/);
  assert.equal(git('log','-1','--pretty=%s',FINAL_MERGE),expectedSubject,'original final merge subject preserved');
  assert.deepEqual(reviewedParents,[FINAL_MERGE,PR36_MAIN,PR37_REVIEWED],'original reviewed two-parent merge preserved');
  if(subject===CLIENT_RELEASE_SUBJECT){
    // Only the authorized PR41 true merge may succeed after the reviewed PR37
    // release. The prior release and its global capability checks stay intact.
    assert.equal(parents.length,3,'PR41 must preserve both merge parents');
    assert.equal(parents[1],CLIENT_RELEASE_BASE,'PR41 must merge onto reviewed main');
    assert.equal(git('log','-1','--pretty=%s',parents[2]),CLIENT_FINAL_COMMIT_SUBJECT,'PR41 must end at reviewed release commit');
    assert.equal(git('merge-base',parents[1],parents[2]),CLIENT_RELEASE_BASE,'PR41 branch ancestry mismatch');
    const changed=git('diff','--name-only',parents[1],parents[2]).split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(changed,CLIENT_RELEASE_CHANGED,'PR41 exact file inventory must remain certified');
    const client=fs.readFileSync('dist/mir-client-i18n.js','utf8');
    assert.match(client,/if\(!win\|\|!isClient\(win.location.pathname,win.location.search\)\|\|staffReady\(\)\)return false/,'staff segregation preserved');
    assert.doesNotMatch(client,/mir-client-locale-preview-v1|if\(!preview\)return false/,'public EN must not depend on preview');
    assert.match(fs.readFileSync('dist/index.html','utf8'),/mir-client-i18n\.js\?v=release-pr41-20261115/,'new client JS cache identity required');
    execFileSync('node',['tests/mir-client-qa-isolation.cjs'],{env:{...process.env,MIR_CLIENT_BASE_SHA:CLIENT_RELEASE_BASE},stdio:'pipe'});
  }else if(parents.length===3){
    assert.equal(subject,expectedSubject,'exact reviewed final merge only');
    assert.deepEqual(parents,reviewedParents,'no substitute release merge');
  }else if(subject===RELEASE_TRIGGER_SUBJECT){
    // A publish-trigger-only continuation of the fully reviewed PR36/PR37
    // release and its two QA guard repairs. No product or backend files change.
    assert.equal(parents.length,2,'publish trigger must be one direct child');
    assert.equal(parents[1],RELEASE_TRIGGER_PARENT,'exact reviewed trigger parent');
    assert.equal(git('log','-1','--pretty=%s',RELEASE_TRIGGER_PARENT),GUARDED_GET_FIX_SUBJECT);
    const changed=git('diff-tree','--no-commit-id','--name-only','-r','HEAD').split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(changed,['.github/workflows/pages.yml','scripts/mir-final-release-gate.cjs'],'release trigger and gate only');
    const priorWorkflow=git('show',RELEASE_TRIGGER_PARENT+':.github/workflows/pages.yml');
    const nowWorkflow=fs.readFileSync('.github/workflows/pages.yml','utf8').trim();
    assert.equal(priorWorkflow.split(RELEASE_TRIGGER_OLD_PATHS).length,2);
    assert.equal(nowWorkflow,priorWorkflow.replace(RELEASE_TRIGGER_OLD_PATHS,RELEASE_TRIGGER_NEW_PATHS),'release gate trigger must be the only workflow change');
    const priorFix=git('rev-list','--parents','-n','1',RELEASE_TRIGGER_PARENT).split(/\s+/);
    assert.equal(priorFix[1],GUARDED_GET_FIX_PARENT,'read-only TEST QA lineage preserved');
  }else if(subject===POST_RELEASE_REPAIR_SUBJECT){
    // Separate clean GitHub Pages run, since same-run retry duplicated the named
    // Pages artifact. Product, environment, workflow and deployment files
    // must remain byte-identical to the already verified public deployment.
    assert.equal(parents.length,2,'exact one-parent CI repair');
    assert.equal(parents[1],POST_RELEASE_REPAIR_PARENT,'strict previously published parent');
    assert.equal(git('log','-1','--pretty=%s',POST_RELEASE_REPAIR_PARENT),POST_RELEASE_RECHECK_SUBJECT);
    const changed=git('diff-tree','--no-commit-id','--name-only','-r','HEAD').split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(changed,['scripts/mir-final-release-gate.cjs'],'only release-gate CI correction permitted');
  }else if(subject===POST_RELEASE_RECHECK_SUBJECT){
    // Exact CI-only continuation of the successfully deployed release after
    // fixing MIR TEST's old-domain CORS allowlist. A separate Actions run ID
    // avoids duplicate github-pages artifacts on the same-run job retry.
    assert.equal(parents.length,2,'single-parent recheck commit required');
    assert.equal(parents[1],POST_RELEASE_RECHECK_PARENT,'exact previously published parent required');
    assert.equal(git('log','-1','--pretty=%s',POST_RELEASE_RECHECK_PARENT),RELEASE_TRIGGER_SUBJECT);
    const changed=git('diff-tree','--no-commit-id','--name-only','-r','HEAD').split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(changed,['scripts/mir-final-release-gate.cjs'],'no production, TEST or Pages workflow asset may change');
    const parentGate=git('show',POST_RELEASE_RECHECK_PARENT+':scripts/mir-final-release-gate.cjs');
    const currentGate=fs.readFileSync('scripts/mir-final-release-gate.cjs','utf8');
    const start=currentGate.indexOf('  }else if(subject===POST_RELEASE_RECHECK_SUBJECT){');
    const finish=currentGate.indexOf('  }else if(subject===GUARDED_GET_FIX_SUBJECT){',start);
    assert.ok(start>=0&&finish>start,'recheck branch must occur only once');
    const stripped=currentGate.slice(0,start)+currentGate.slice(finish);
    const insertedConstants="const POST_RELEASE_RECHECK_PARENT='"+POST_RELEASE_RECHECK_PARENT+"';\n"+
      'const POST_RELEASE_RECHECK_SUBJECT="'+POST_RELEASE_RECHECK_SUBJECT+'";\n';
    assert.equal(stripped.split(insertedConstants).length,2,'exactly one recheck constant pair');
    assert.equal(stripped.replace(insertedConstants,'').trim(),parentGate,'the original strict release gate must remain byte-identical');
  }else if(subject===GUARDED_GET_FIX_SUBJECT){
    // The previous release QA commit changed only the reviewed isolated TEST
    // read-only config rule, its refusal assertions and this release gate.
    // This corrective child may change ONLY the gate parser; no site bytes,
    // production capability or TEST backend routing can be modified here.
    assert.equal(parents.length,2,'exact direct child of the reviewed TEST read-only patch required');
    assert.equal(parents[1],GUARDED_GET_FIX_PARENT);
    assert.equal(git('log','-1','--pretty=%s',GUARDED_GET_FIX_PARENT),GUARDED_GET_SUBJECT);
    const changed=git('diff-tree','--no-commit-id','--name-only','-r','HEAD').split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(changed,['scripts/mir-final-release-gate.cjs'],'release gate parsing only');
    const previousChanged=git('diff-tree','--no-commit-id','--name-only','-r',GUARDED_GET_FIX_PARENT).split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(previousChanged,['dist/mir-test-guard.js','scripts/mir-final-release-gate.cjs','tests/mir-test-production-browser.cjs'],'reviewed read-only TEST patch only');
    const originalGuard=git('show',GUARDED_GET_PARENT+':dist/mir-test-guard.js');
    const actualGuard=fs.readFileSync('dist/mir-test-guard.js','utf8').trim();
    assert.equal(originalGuard.split(GUARDED_GET_OLD).length,2);
    assert.equal(actualGuard,originalGuard.replace(GUARDED_GET_OLD,GUARDED_GET_NEW),'exact read-only TEST metadata route only');
    const originalTest=git('show',GUARDED_GET_PARENT+':tests/mir-test-production-browser.cjs');
    const expectedTest=originalTest.replace(GUARDED_TEST_OLD1,GUARDED_TEST_NEW1).replace(GUARDED_TEST_OLD2,GUARDED_TEST_NEW2).replace(GUARDED_TEST_OLD3,GUARDED_TEST_NEW3);
    assert.equal(fs.readFileSync('tests/mir-test-production-browser.cjs','utf8').trim(),expectedTest,'exact read-only TEST assertions only');
  }else if(subject===GUARDED_GET_SUBJECT){
    // Exactly one additional release QA fix. The first PR37 merge and previous
    // post-merge QA commit are immutable parents; no product, policy or backend
    // behavior may change except a single read-only TEST metadata endpoint.
    assert.equal(parents.length,2,'only a direct child of the certified release is permitted');
    assert.equal(parents[1],GUARDED_GET_PARENT,'guard fix must follow the certified QA correction');
    assert.equal(git('log','-1','--pretty=%s',GUARDED_GET_PARENT),POST_RELEASE_QA_SUBJECT);
    const changed=git('diff-tree','--no-commit-id','--name-only','-r','HEAD').split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(changed,['dist/mir-test-guard.js','scripts/mir-final-release-gate.cjs','tests/mir-test-production-browser.cjs']);
    const parentGuard=git('show',GUARDED_GET_PARENT+':dist/mir-test-guard.js');
    const nextGuard=fs.readFileSync('dist/mir-test-guard.js','utf8').trim();
    assert.equal(parentGuard.split(GUARDED_GET_OLD).length,2,'reviewed blocked function rule expected exactly once');
    assert.equal(nextGuard,parentGuard.replace(GUARDED_GET_OLD,GUARDED_GET_NEW),'only GET of MIR TEST estimate status may be added');
    const parentTest=git('show',GUARDED_GET_PARENT+':tests/mir-test-production-browser.cjs');
    const nextTest=fs.readFileSync('tests/mir-test-production-browser.cjs','utf8').trim();
    for(const oldPart of [GUARDED_TEST_OLD1,GUARDED_TEST_OLD2,GUARDED_TEST_OLD3])assert.equal(parentTest.split(oldPart).length,2,'reviewed test change expected exactly once');
    const expectedTest=parentTest.replace(GUARDED_TEST_OLD1,GUARDED_TEST_NEW1).replace(GUARDED_TEST_OLD2,GUARDED_TEST_NEW2).replace(GUARDED_TEST_OLD3,GUARDED_TEST_NEW3);
    assert.equal(nextTest,expectedTest,'only the strict read-only TEST probe and refusals may change');
  }else{
    assert.equal(parents.length,2,'only a direct one-parent QA correction is permitted after PR37');
    assert.equal(subject,POST_RELEASE_QA_SUBJECT,'QA-only correction subject required');
    assert.equal(parents[1],FINAL_MERGE,'QA correction must directly follow reviewed PR37 merge');
    const changed=git('diff-tree','--no-commit-id','--name-only','-r','HEAD').split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(changed,['scripts/mir-final-release-gate.cjs','tests/mir-estimate-published-browser.cjs'],'no business, security or publication assets changed');
    const prior=execFileSync('git',['show',FINAL_MERGE+':tests/mir-estimate-published-browser.cjs'],{encoding:'utf8'});
    const actual=fs.readFileSync('tests/mir-estimate-published-browser.cjs','utf8');
    assert.equal(prior.split(QA_OLD_STATUS).length,2,'old expectation appears exactly once in original test');
    assert.equal(actual,prior.replace(QA_OLD_STATUS,QA_NEW_STATUS),'exact approved fail-closed test expectation correction');
  }
  for(const [label,sha] of Object.entries(marker.ancestors||{})){
    assert.match(sha,/^[a-f0-9]{40}$/,label);
    try{git('merge-base','--is-ancestor',sha,'HEAD');}catch{throw Error('Missing reviewed ancestor: '+label);}
  }
  const run=(relative,pathname,search)=>{
    const sandbox={window:{},location:{hostname:'revetementsmir.github.io',pathname,search},URLSearchParams};
    vm.runInNewContext(fs.readFileSync(relative,'utf8'),sandbox,{timeout:3000});
    return sandbox.window;
  };
  const config=run('dist/portal-config.js','/Revetements-mir-/chantier.html','?recette=1').MIRPortalConfig;
  assert.equal(config.environment,'production','production URL cannot switch to TEST by query');
  assert.equal(config.projectRef,'gccltmaulvrnthrbnrpd');
  assert.equal(config.accountEnabled,true);
  assert.equal(config.passwordEnabled,true);
  for(const key of ['googleEnabled','emailEnabled','signupEnabled','invitationsEnabled','manualInvitations','documentsEnabled'])
    assert.equal(config[key],false,'production capability must remain disabled: '+key);
  assert.notEqual(config.supabaseUrl,'https://hxtztkmbfpmzrieccwsg.supabase.co');
  const estimate=run('dist/mir-estimate-config.js','/Revetements-mir-/estimation.html','?recette=1').MIREstimateConfig;
  assert.equal(estimate.environment,'production');assert.equal(estimate.apiBase,'','production estimate sending must remain disabled');
  const shared=run('dist/shared-config.js','/Revetements-mir-/chantier.html','').MIRSharedConfig;
  assert.match(shared.supabaseUrl,/^https:\/\/gccltmaulvrnthrbnrpd\.supabase\.co$/);
  assert.equal(fs.existsSync('dist/test'),false,'no TEST output committed to dist');
  const forbidden=['service_role','sb_secret_','sk_live_','pk_live_'];
  for(const relative of ['dist/portal-config.js','dist/shared-config.js','dist/mir-estimate-config.js']){
    const text=fs.readFileSync(relative,'utf8');
    for(const word of forbidden)assert.equal(text.includes(word),false,relative+' contains a privileged marker');
  }
  for(const relative of ['dist/index.html','dist/mir-public-menu.js','dist/mir-public-menu.css']){
    assert.equal(fs.existsSync(relative),true,'missing public output '+relative);
  }
  assert.match(fs.readFileSync('dist/index.html','utf8'),/noindex,nofollow/);
  console.log('PASS main release gate: PR36+PR38+PR39+PR40 ancestors, server capabilities fail-closed, TEST isolated, exact merge, SEO retained');
}
if(require.main===module)try{check();}catch(error){console.error('MIR release blocked: '+error.message);process.exitCode=1;}
module.exports={check,expectedSubject};
