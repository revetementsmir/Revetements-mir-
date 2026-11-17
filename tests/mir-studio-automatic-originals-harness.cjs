'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const H=require('../tools/qa/helpers/mir-studio-automatic-proof.cjs');
const empty={steps:{import:true,conversion:true,render3d:true,finish:true,reopen:true},model:{walls:[]},reconstructionStatus:'partial-proposal',errors:{}};
const verdict=H.evaluateProof(empty,H.DEFAULT_EXPECTED);
assert.equal(verdict.workflowVerified,false,'Empty reconstruction cannot pass even if stale step flags are all true.');
assert.equal(verdict.passed,false);assert.ok(verdict.violations.includes('MODEL_REQUIRED_BUT_EMPTY'));
const refusal={...empty,steps:{import:true,conversion:true},reconstructionStatus:'unresolved'};
const refusalVerdict=H.evaluateProof(refusal,{statuses:['unresolved'],requireModel:false,requireWorkflow:false});
assert.equal(refusalVerdict.passed,true,'An explicitly expected refusal can satisfy its contract.');
assert.equal(refusalVerdict.workflowVerified,false,'Expected refusal is never reported as the full product workflow.');
const completed={...empty,model:{walls:[{id:'synthetic-wall'}]}};
assert.equal(H.evaluateProof(completed,H.DEFAULT_EXPECTED).passed,true);
assert.equal(H.evaluateProof({...completed,steps:{...completed.steps,reopen:false}},H.DEFAULT_EXPECTED).passed,false,'Saving alone does not prove reopening.');
assert.equal(H.evaluateProof({...completed,failure:{message:'synthetic failure'}},H.DEFAULT_EXPECTED).passed,false,'A caught case failure cannot disappear from the final verdict.');
assert.equal(H.evaluateProof({...completed,errors:{http:[{status:404}]}},H.DEFAULT_EXPECTED).passed,false,'A missing application resource cannot pass as successful.');
assert.equal(H.evaluateProof({...completed,reconstructionStatus:'preserved'},H.DEFAULT_EXPECTED).passed,false,'An old preserved model is not a fresh automatic proposal.');

const model={walls:[{id:'synthetic-wall',height:3,status:'proposed',finish:{materialId:'before'}}],roofs:[],partial:true};
const changed=structuredClone(model);changed.walls[0].finish.materialId='after';
assert.deepEqual(H.withoutFinish(changed),H.withoutFinish(model));
changed.walls[0].status='confirmed';assert.notDeepEqual(H.withoutFinish(changed),H.withoutFinish(model),'Material selection must not confirm geometry.');
const before={levels:[{id:'synthetic-level',geometryRevision:1,contours:[{status:'proposed'}],wallFinishes:{a:{materialId:'one'},b:{materialId:'two'}},roofFinishes:{r:{materialId:'roof'}}}]};
const after=structuredClone(before);after.levels[0].geometryRevision++;after.levels[0].wallPlanes=[];after.levels[0].wallFinishes.a.materialId='changed';
assert.deepEqual(H.levelGeometry(before),H.levelGeometry(after));assert.deepEqual(H.unrelatedWallFinishes(before,'a'),H.unrelatedWallFinishes(after,'a'));
after.levels[0].wallFinishes.b.materialId='unexpected';assert.notDeepEqual(H.unrelatedWallFinishes(before,'a'),H.unrelatedWallFinishes(after,'a'));
after.levels[0].roofFinishes.r.materialId='unexpected';assert.notDeepEqual(H.levelGeometry(before),H.levelGeometry(after));

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mir-automatic-harness-contract-'));
try{
  const repo=path.join(temp,'repo'),neighbor=path.join(temp,'repo-neighbor'),original=path.join(neighbor,'synthetic.pdf'),manifest=path.join(neighbor,'cases.json');
  fs.mkdirSync(path.join(repo,'dist'),{recursive:true});fs.writeFileSync(path.join(repo,'dist','plan.html'),'synthetic');fs.mkdirSync(neighbor);
  const bytes=Buffer.from('%PDF-1.4\n% synthetic path validation fixture\n');fs.writeFileSync(original,bytes);
  const items=[{caseId:'SYNTHETIC',path:original,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),sourceKind:'synthetic-pdf'}];
  const write=rows=>fs.writeFileSync(manifest,JSON.stringify(rows));write(items);
  const args=['--manifest',manifest,'--out',path.join(neighbor,'new-proof'),'--case','SYNTHETIC'];
  assert.equal(H.parseArgs(args,repo).items[0].sourceKind,'synthetic-pdf','A sibling with the same prefix is outside the repo.');
  for(const output of [repo,path.join(repo,'proof')])assert.throws(()=>H.parseArgs(['--manifest',manifest,'--out',output],repo),/outside/);
  fs.symlinkSync(repo,path.join(neighbor,'repo-link'));
  assert.throws(()=>H.parseArgs(['--manifest',manifest,'--out',path.join(neighbor,'repo-link','new-proof')],repo),/outside/,'Symlink cannot place private captures inside git.');
  assert.throws(()=>H.parseArgs([...args,'--case','MISSING'],repo),/not present/);
  write([{...items[0],caseId:'../escape'}]);assert.throws(()=>H.parseArgs(args,repo),/case IDs/);
  write([{...items[0],expected:{fidelityVerified:true}}]);assert.throws(()=>H.parseArgs(args,repo),/fidelity/);
  const internal=path.join(repo,'private.pdf');fs.writeFileSync(internal,bytes);write([{...items[0],path:internal}]);assert.throws(()=>H.parseArgs(args,repo),/outside/);
  write(items);fs.mkdirSync(path.join(neighbor,'new-proof'));assert.throws(()=>H.parseArgs(args,repo),/new directory/,'Old evidence cannot silently be reused.');
  const secondRepo=path.join(temp,'baseline');fs.mkdirSync(path.join(secondRepo,'dist'),{recursive:true});fs.writeFileSync(path.join(secondRepo,'dist','plan.html'),'baseline');
  assert.throws(()=>H.parseArgs(['--manifest',manifest,'--out',path.join(secondRepo,'proof'),'--repo-root',secondRepo],repo),/outside/,'The frozen comparison repo is protected too.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS automatic-originals harness: empty-model rejection, expected refusals, workflow completion, runtime failures, geometry/finish distinction and private output boundaries.');
