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
const PREP='fix(ci): certify strict PR42 Pages gate anchor';
const FIRST_PREP='abbbcd951dba3de81368e4ce25eb49d1249b2e23';
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const candidate=git('rev-parse','HEAD');
assert.equal(git('rev-parse','HEAD^'),FIRST_PREP,'strict gate fix must directly follow first preparation');
assert.equal(git('rev-parse','HEAD^^'),REVIEWED,'reviewed green SHA must remain ancestor of release gate');
assert.equal(git('log','-1','--pretty=%s'),PREP,'certified gate preparation commit');
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