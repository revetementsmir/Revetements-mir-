'use strict';
// Release gate: PR36 alone must never publish. Only the reviewed PR37 merge on
// main may deploy. No Supabase call, no mail, no Google, no payment activation.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const RELEASE=path.resolve('docs/verification/mir-pages-final-20261115.json');
const expectedSubject='Merge PR #37 — MIR intégration finale vers main';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
function check(){
  if(process.env.GITHUB_REF&&process.env.GITHUB_REF!=='refs/heads/main')throw Error('Pages release requires main');
  const marker=JSON.parse(fs.readFileSync(RELEASE,'utf8'));
  assert.equal(marker.release,'MIR-20261115-PR36-37-40');
  assert.equal(marker.approved,true);
  assert.equal(git('log','-1','--pretty=%s'),expectedSubject,'exact reviewed merge only');
  const parents=git('rev-list','--parents','-n','1','HEAD').split(/\s+/);
  assert.equal(parents.length,3,'two-parent merge commit required');
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
