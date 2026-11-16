'use strict';
/* PR42 release-gate acceptance: simulate a true two-parent merge entirely
 * in a disposable Git worktree. No push, Pages action, Supabase or send.
 * The exact original release gate is also checked inside the candidate. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const cp=require('node:child_process');
const MAIN='65b3145f735ea11ee0f77d331270649ece7266ec';
const REVIEWED='8d9641f2c1df84c6fec3c4e4fb417168b3c92c4c';
const SUBJECT='Merge PR #42 — MIR Studio public et courriels de recette';
const PREP='fix(pages-qa): certify public construction and preserved TEST Studio browser';
const FIRST_PREP='a20bf2e83acc34d1fab94b7fb05c4ddb2112d0f8';
const SECOND_PREP='5dbb6ad8c16045505652214c78ff48e1a8ac193f';
const THIRD_PREP='94e954bc78660d3b01b84feed410f843df918751';
const FOURTH_PREP='abbbcd951dba3de81368e4ce25eb49d1249b2e23';
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
// GitHub Actions' default pull_request checkout is a temporary two-parent
// merge. Inspect the exact PR head (second parent), never the temporary merge.
const checkout=git('rev-parse','HEAD');
const checkoutParents=git('rev-list','--parents','-n','1',checkout).split(/\s+/);
const candidate=checkoutParents.length===3&&checkoutParents[1]===MAIN?checkoutParents[2]:checkout;
assert.equal(git('rev-parse',candidate+'^'),FIRST_PREP,'published-browser fix must follow verified native QA touch fix');
assert.equal(git('rev-parse',candidate+'^^'),SECOND_PREP,'previous release gate QA retained');
assert.equal(git('rev-parse',candidate+'^^^'),THIRD_PREP,'strict gate anchor retained');
assert.equal(git('rev-parse',candidate+'^^^^'),FOURTH_PREP,'original PR42 release gate retained');
assert.equal(git('rev-parse',candidate+'^^^^^'),REVIEWED,'original 14/14 green SHA retained');
assert.equal(git('log','-1','--pretty=%s',candidate),PREP,'certified gate preparation commit');
assert.equal(git('merge-base',MAIN,candidate),MAIN,'cannot issue Pages from an unreviewed main ancestor');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mir-pr42-gate-'));
const worktree=path.join(dir,'site');
const testEnv={...process.env,GITHUB_REF:'refs/heads/main'};
const commit=(subject,base=MAIN)=>{
 const env={...process.env,GIT_AUTHOR_NAME:'MIR local CI verification',GIT_COMMITTER_NAME:'MIR local CI verification',GIT_AUTHOR_EMAIL:'ci@example.invalid',GIT_COMMITTER_EMAIL:'ci@example.invalid'};
 return cp.execFileSync('git',['commit-tree',candidate+'^{tree}','-p',base,'-p',candidate],{input:subject+'\n\nLocal dry-run only — never pushed.\n',env,encoding:'utf8'}).trim();
};
let attached=false;
try{
  const synthetic=commit(SUBJECT);
  cp.execFileSync('git',['worktree','add','--detach',worktree,synthetic],{stdio:'pipe'});attached=true;
  const check=()=>cp.execFileSync('node',['scripts/mir-final-release-gate.cjs'],{cwd:worktree,env:testEnv,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const success=check();
  assert.match(success,/PASS main release gate/,'exact reviewed merge, old gate, server guards and isolation must all pass');
  // Negative: refuse a counterfeit PR42 merge with the same two parents.
  const wrongSubject=commit('Merge PR #42 — unauthorized variant');
  cp.execFileSync('git',['-C',worktree,'checkout','--detach',wrongSubject],{stdio:'pipe'});
  assert.throws(check,/Command failed|status 1/,'unapproved subject must fail closed');
  // Negative: the correct title must still fail if the first parent differs.
  const invalidBase=commit(SUBJECT,REVIEWED);
  cp.execFileSync('git',['-C',worktree,'checkout','--detach',invalidBase],{stdio:'pipe'});
  assert.throws(check,/Command failed|status 1/,'unapproved main parent must fail closed');
  console.log('PASS PR42 Pages gate: disposable local two-parent merge accepted; subject/base tampering rejected; zero publication');
}finally{
  if(attached)cp.execFileSync('git',['worktree','remove','--force',worktree],{stdio:'pipe'});
  fs.rmSync(dir,{force:true,recursive:true});
}