'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const H=require('../tools/qa/helpers/mir-studio-automatic-proof.cjs');
const empty={steps:{import:true,conversion:true,render3d:true,finish:true,reopen:true,responsive:true},model:{walls:[]},reconstructionStatus:'partial-proposal',errors:{}};
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
assert.equal(H.evaluateProof({...completed,steps:{...completed.steps,responsive:false}},H.DEFAULT_EXPECTED).passed,false,'Responsive FR/EN checks cannot be skipped in a completed new recipe.');
assert.equal(H.evaluateProof({...completed,failure:{message:'synthetic failure'}},H.DEFAULT_EXPECTED).passed,false,'A caught case failure cannot disappear from the final verdict.');
assert.equal(H.evaluateProof({...completed,errors:{http:[{status:404}]}},H.DEFAULT_EXPECTED).passed,false,'A missing application resource cannot pass as successful.');
assert.equal(H.evaluateProof({...completed,reconstructionStatus:'preserved'},H.DEFAULT_EXPECTED).passed,false,'An old preserved model is not a fresh automatic proposal.');

const idleObservation={available:true,buttonPresent:true,buttonDisabled:false,stopVisible:false,pending:false,reportStatus:null,requestPending:true,visibleStatus:''};
const busyObservation={...idleObservation,buttonDisabled:true,stopVisible:true,visibleStatus:'Synthetic reading in progress'};
const stopped=H.conversionTerminalObserver();
assert.equal(stopped({available:false}),false);assert.equal(stopped(idleObservation),false,'An idle UI before automatic startup is not a completed conversion or a refusal.');
assert.equal(stopped(busyObservation),false);
assert.equal(stopped({...idleObservation,pending:true}),false,'A pending choice cannot be mistaken for a terminal transaction.');
assert.throws(()=>stopped({...idleObservation,visibleStatus:'Synthetic source validation refused'}),error=>error.code==='CONVERSION_STOPPED_WITHOUT_REPORT'&&/Synthetic source validation refused/.test(error.message),'A busy-to-idle transition without a persisted terminal report fails immediately with its visible reason.');
const successful=H.conversionTerminalObserver();assert.equal(successful(busyObservation),false);
assert.equal(successful({...idleObservation,reportStatus:'partial-proposal',requestPending:true}),false,'A pending reconstruction request still prevents completion.');
assert.equal(successful({...idleObservation,reportStatus:'partial-proposal',requestPending:false}),true);
const idleWithStaleReport=H.conversionTerminalObserver();assert.equal(idleWithStaleReport({...busyObservation,reportStatus:'partial-proposal',requestPending:false}),false,'A report cannot complete the recipe while the UI is still processing.');
for(const patch of [{buttonPresent:false},{buttonDisabled:true},{stopVisible:true},{pending:true}])assert.equal(H.conversionTerminalObserver()({...idleObservation,...patch,reportStatus:'partial-proposal',requestPending:false}),false,'Every terminal UI condition remains necessary.');

const model={walls:[{id:'synthetic-wall',height:3,status:'proposed',finish:{materialId:'before'}}],roofs:[],partial:true};
const changed=structuredClone(model);changed.walls[0].finish.materialId='after';
assert.deepEqual(H.withoutFinish(changed),H.withoutFinish(model));
changed.walls[0].status='confirmed';assert.notDeepEqual(H.withoutFinish(changed),H.withoutFinish(model),'Material selection must not confirm geometry.');
const before={levels:[{id:'synthetic-level',geometryRevision:1,contours:[{status:'proposed'}],wallFinishes:{a:{materialId:'one'},b:{materialId:'two'}},roofFinishes:{r:{materialId:'roof'}}}]};
const after=structuredClone(before);after.levels[0].geometryRevision++;after.levels[0].wallPlanes=[];after.levels[0].wallFinishes.a.materialId='changed';
assert.deepEqual(H.levelGeometry(before),H.levelGeometry(after));assert.deepEqual(H.unrelatedWallFinishes(before,'a'),H.unrelatedWallFinishes(after,'a'));
after.levels[0].wallFinishes.b.materialId='unexpected';assert.notDeepEqual(H.unrelatedWallFinishes(before,'a'),H.unrelatedWallFinishes(after,'a'));
after.levels[0].roofFinishes.r.materialId='unexpected';assert.notDeepEqual(H.levelGeometry(before),H.levelGeometry(after));

const large={sourceImage:'synthetic-private-raster-'+ 'x'.repeat(1000000),levels:[{id:'level',height:3}]};
H.assertDeepEqual(large,structuredClone(large),'Equal source inventory must pass.');
const unequal=structuredClone(large);unequal.levels[0].height=4;
assert.throws(()=>H.assertDeepEqual(unequal,large,'Geometry changed.'),error=>{
  assert.match(error.message,/Geometry changed\. Actual SHA-256: [a-f0-9]{64}; expected SHA-256: [a-f0-9]{64}\./);
  assert.ok(error.message.length<250,'Failure diagnostics must not format large source rasters.');
  assert.ok(!error.message.includes('synthetic-private-raster'));
  return true;
});
assert.throws(()=>H.assertDeepEqual({height:'3'},{height:3}),/Stored values changed/,'Strict equality must still reject type changes.');

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

  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv5kAAAAASUVORK5CYII=';
  const jpeg='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AD//Z';
  const frame={pdfToRaster:[2,0,0,-2,0,200],cropToRaster:[1,0,0,1,20,30],rasterSize:[1,1],units:'pixels'};
  const inventory={views:[{id:'../../client-name',fileId:'synthetic-file',page:1,zone:[20,30,1,1],orientation:270,frame,payload:{sourceWidth:1,sourceHeight:1,sourceImage:'data:image/png;base64,'+png}},{id:'other-view',page:2,payload:{sourceWidth:1,sourceHeight:1,sourceImage:'data:image/jpeg;base64,'+jpeg}}]};
  const originalInventory=structuredClone(inventory),caseOut=path.join(neighbor,'raster-case');fs.mkdirSync(caseOut);
  const exported=H.exportSourceRasters(inventory,caseOut,{projectId:'synthetic-project'});
  assert.equal(exported.status,'exported');assert.equal(exported.views.length,2);
  assert.deepEqual(exported.views.map(v=>v.path),['source-rasters/view-001.png','source-rasters/view-002.jpg'],'Untrusted view identifiers never determine private artifact paths.');
  for(const [i,encoded] of [png,jpeg].entries()){
    const file=path.join(caseOut,exported.views[i].path),bytes=Buffer.from(encoded,'base64');
    assert.deepEqual(fs.readFileSync(file),bytes,'The actual persisted JPEG/PNG bytes must survive without a PDF rerender or recompression.');
    assert.equal(exported.views[i].sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
    assert.equal(fs.statSync(file).mode&0o777,0o600);
  }
  assert.deepEqual(exported.views[0].frame,frame);assert.deepEqual(exported.views[0].cropToRaster,[1,0,0,1,20,30]);
  assert.deepEqual(inventory,originalInventory,'Capturing evidence must not mutate the persisted source observations.');
  assert.ok(!H.privateJSON({inventory,sourceRasters:exported}).includes(png),'Large raster data URLs stay out of the JSON proof.');
  assert.throws(()=>H.exportSourceRasters(inventory,caseOut),/EEXIST/,'Private raster evidence cannot silently overwrite a prior export.');
  for(const invalid of ['https://example.invalid/source.png','data:image/svg+xml;base64,'+png,'data:image/png;base64,AB==','data:image/png;base64,AAAA=','data:image/png;base64,'+png+'\n','data:image/jpeg;base64,'+png])assert.throws(()=>H.decodeSourceRaster(invalid));
  const failedOut=path.join(neighbor,'failed-raster-case');fs.mkdirSync(failedOut);
  assert.throws(()=>H.exportSourceRasters({views:[inventory.views[0],{id:'missing-source',payload:{}}]},failedOut),/data URL/);
  const partial=JSON.parse(fs.readFileSync(path.join(failedOut,'source-rasters','manifest.json')));
  assert.equal(partial.status,'failed');assert.equal(partial.views.length,1,'Earlier exact rasters remain inspectable when a later source is missing.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS automatic-originals harness: empty-model rejection, expected refusals, workflow completion, runtime failures, geometry/finish distinction, private output boundaries and exact persisted PNG/JPEG evidence.');

(async()=>{
  let elapsed=0,calls=0;
  await H.waitForAsync(async()=>{await Promise.resolve();calls++;return calls===3;},{timeoutMs:100,intervalMs:10,now:()=>elapsed,pause:async ms=>{elapsed+=ms;}});
  assert.equal(calls,3,'A Promise resolving false must be polled again, not accepted as completion.');assert.equal(elapsed,20);
  calls=0;elapsed=0;
  await assert.rejects(H.waitForAsync(async()=>{calls++;return false;},{timeoutMs:25,intervalMs:10,now:()=>elapsed,pause:async ms=>{elapsed+=ms;}}),/Timed out/);
  assert.equal(elapsed,25,'False terminal observations must respect the original deadline.');assert.equal(calls,4);
  await assert.rejects(H.waitForAsync(async()=>{throw Error('read failed');},{timeoutMs:100}),/read failed/,'An IndexedDB error cannot count as completion.');
  const started=Date.now();await assert.rejects(H.waitForAsync(()=>new Promise(()=>{}),{timeoutMs:30}),/Timed out/,'A never-resolving read is bounded by the same deadline.');assert.ok(Date.now()-started<1000,'A pending observation cannot hang the recipe.');
  const terminal=H.conversionTerminalObserver();let observations=0;
  await assert.rejects(H.waitForAsync(async()=>terminal(++observations===1?busyObservation:{...idleObservation,visibleStatus:'Synthetic store rejected'}),{timeoutMs:1000,intervalMs:1}),error=>error.code==='CONVERSION_STOPPED_WITHOUT_REPORT','A real async observation failure must propagate instead of becoming a truthy completion.');
  assert.equal(observations,2,'A stopped conversion is rejected on its first idle observation.');
  console.log('PASS asynchronous terminal wait: false Promise observations, bounded timeout, pending read and read failure.');
})().catch(error=>{console.error(error);process.exitCode=1;});
