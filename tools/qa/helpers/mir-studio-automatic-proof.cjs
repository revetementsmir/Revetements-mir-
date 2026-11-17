'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{isDeepStrictEqual}=require('node:util'),crypto=require('node:crypto');

const TERMINAL_STATUSES=['partial-proposal','unresolved','preserved','cancelled'];
const DEFAULT_EXPECTED={statuses:['partial-proposal'],requireModel:true,requireWorkflow:true};

function canonicalPath(value){
  let ancestor=path.resolve(value);const suffix=[];
  while(!fs.existsSync(ancestor)){
    const parent=path.dirname(ancestor);if(parent===ancestor)throw Error('Cannot resolve a private path.');
    suffix.unshift(path.basename(ancestor));ancestor=parent;
  }
  return path.join(fs.realpathSync(ancestor),...suffix);
}
function within(root,candidate){const relative=path.relative(root,candidate);return !relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));}
function outsideRepositories(value,repositories,label){
  const resolved=canonicalPath(value);
  assert.ok(repositories.every(repo=>!within(repo,resolved)),label+' must be outside both the runner and tested repository.');
  return resolved;
}
function parseArgs(args,runnerRoot){
  const config={repoRoot:runnerRoot,cases:[],timeoutMs:900000};
  const names={'--manifest':'manifestPath','--out':'out','--repo-root':'repoRoot','--timeout-ms':'timeoutMs'};
  for(let i=0;i<args.length;i++){
    const arg=args[i];if(arg==='--help'){config.help=true;continue;}
    assert.ok(names[arg]||arg==='--case','Unknown argument. Use --help.');
    assert.ok(args[i+1]&&!args[i+1].startsWith('--'),'Missing argument value.');
    const value=args[++i];if(arg==='--case')config.cases.push(...value.split(','));else config[names[arg]]=value;
  }
  if(config.help)return config;
  assert.ok(config.manifestPath&&config.out,'Provide --manifest and --out explicitly.');
  config.repoRoot=fs.realpathSync(path.resolve(config.repoRoot));
  assert.ok(fs.existsSync(path.join(config.repoRoot,'dist','plan.html')),'The tested repository must contain dist/plan.html.');
  const repositories=[fs.realpathSync(runnerRoot),config.repoRoot];
  config.manifestPath=outsideRepositories(config.manifestPath,repositories,'Manifest');
  config.out=outsideRepositories(config.out,repositories,'Evidence output');
  assert.ok(!fs.existsSync(config.out),'Evidence output must be a new directory to avoid stale or overwritten proof.');
  config.timeoutMs=Number(config.timeoutMs);
  assert.ok(Number.isSafeInteger(config.timeoutMs)&&config.timeoutMs>=1000&&config.timeoutMs<=3600000,'Timeout must be between 1000 and 3600000 milliseconds.');
  const raw=JSON.parse(fs.readFileSync(config.manifestPath,'utf8')),items=Array.isArray(raw)?raw:raw.cases;
  assert.ok(Array.isArray(items)&&items.length,'Manifest must contain a nonempty cases array.');
  const ids=new Set();
  config.items=items.map(item=>{
    assert.ok(item&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(item.caseId||''),'Use short, unique, pseudonymous case IDs.');
    assert.ok(!ids.has(item.caseId),'Duplicate case ID.');ids.add(item.caseId);
    assert.ok(typeof item.path==='string'&&item.path,'Each case needs a PDF path.');
    const source=outsideRepositories(path.resolve(path.dirname(config.manifestPath),item.path),repositories,'Source PDF');
    assert.ok(fs.statSync(source).isFile(),'The source must be a file.');
    assert.ok(/^[a-f0-9]{64}$/i.test(item.sha256||''),'Each case needs its expected SHA-256.');
    const expected={...DEFAULT_EXPECTED,...item.expected};
    assert.ok(!item.expected||Object.keys(item.expected).every(key=>Object.hasOwn(DEFAULT_EXPECTED,key)),'Unknown expectation; geometric fidelity is not evaluated by this runner.');
    assert.ok(Array.isArray(expected.statuses)&&expected.statuses.length&&expected.statuses.every(s=>[...TERMINAL_STATUSES,'import-failed'].includes(s)),'Expected statuses must name actual pipeline or import outcomes.');
    assert.equal(typeof expected.requireModel,'boolean');assert.equal(typeof expected.requireWorkflow,'boolean');
    assert.ok(!expected.requireWorkflow||expected.requireModel,'A complete workflow requires a model.');
    assert.ok(item.buildingId===undefined||(typeof item.buildingId==='string'&&item.buildingId.length>0),'buildingId must be a nonempty string when specified.');
    assert.ok(item.sourceKind===undefined||['private-original','synthetic-pdf'].includes(item.sourceKind),'Invalid sourceKind.');
    return {...item,path:source,sha256:item.sha256.toLowerCase(),sourceKind:item.sourceKind||'private-original',expected};
  });
  if(config.cases.length){
    assert.ok(config.cases.every(id=>ids.has(id)),'Requested case not present in manifest.');
    const requested=new Set(config.cases);config.items=config.items.filter(item=>requested.has(item.caseId));
  }
  return config;
}
function evaluateProof(proof,expected){
  const steps=proof.steps||{},modelPresent=(proof.model?.walls?.length||0)>0;
  const errors=proof.errors||{};
  const infrastructureOK=!proof.failure&&['page','requests','http','requestFailed','server'].every(key=>!(errors[key]||[]).length);
  const workflowVerified=!!(infrastructureOK&&steps.import&&steps.conversion&&modelPresent&&steps.render3d&&steps.finish&&steps.reopen&&steps.responsive);
  const violations=[];
  if(!infrastructureOK)violations.push('RUNTIME_OR_HARNESS_FAILURE');
  if(!expected.statuses.includes(proof.reconstructionStatus))violations.push('UNEXPECTED_RECONSTRUCTION_STATUS');
  if(expected.requireModel&&!modelPresent)violations.push('MODEL_REQUIRED_BUT_EMPTY');
  if(expected.requireWorkflow&&!workflowVerified)violations.push('WORKFLOW_INCOMPLETE');
  return {passed:violations.length===0,workflowVerified,violations};
}
function withoutFinish(model){
  const omitFinish=value=>{
    if(Array.isArray(value))return value.map(omitFinish);
    if(!value||typeof value!=='object')return value;
    return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='finish').map(([key,entry])=>[key,omitFinish(entry)]));
  };
  return Object.fromEntries(['walls','openings','roofs','soffits','corners','elements','partial','includeProposed'].map(key=>[key,omitFinish(model[key]??null)]));
}
function levelGeometry(inventory){
  // saveLevelGeometry increments the revision and regenerates its wall cache.
  // Every source, dimension, confirmation and non-wall finish remains compared.
  return inventory.levels.map(level=>{const {geometryRevision,wallPlanes,wallFinishes,...geometry}=level;return geometry;});
}
function unrelatedWallFinishes(inventory,selectedWallId){
  return inventory.levels.map(level=>({id:level.id,wallFinishes:Object.fromEntries(Object.entries(level.wallFinishes||{}).filter(([id])=>id!==selectedWallId))}));
}
function privateJSON(value){return JSON.stringify(value,(key,entry)=>['sourceImage','sourceImageDataUrl'].includes(key)?undefined:entry,2);}

function assertDeepEqual(actual,expected,message='Stored values changed.'){
  // Keep the same strict equality semantics without Node formatting enormous
  // raster strings into a character-by-character assertion diff on failure.
  if(isDeepStrictEqual(actual,expected))return;
  const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)??String(value)).digest('hex');
  assert.fail(message+' Actual SHA-256: '+digest(actual)+'; expected SHA-256: '+digest(expected)+'.');
}

async function waitForAsync(check,{timeoutMs,intervalMs=100,now=Date.now,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  assert.ok(Number.isFinite(timeoutMs)&&timeoutMs>0,'An explicit positive timeout is required.');
  const deadline=now()+timeoutMs;
  // Browser waitForFunction polling treats the returned Promise as truthy in
  // some Playwright versions. Await the IndexedDB observation in Node before
  // accepting it; an unresolved or false observation is never completion.
  while(true){
    let timer;
    const timeout=()=>Error('Timed out waiting for asynchronous terminal observation.');
    try{
      const observation=await Promise.race([
        Promise.resolve().then(check),
        new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(timeout()),Math.max(0,deadline-now()));})
      ]);
      if(observation)return;
    }finally{clearTimeout(timer);}
    const remaining=deadline-now();
    if(remaining<=0)throw timeout();
    await pause(Math.min(intervalMs,remaining));
  }
}

module.exports={TERMINAL_STATUSES,DEFAULT_EXPECTED,canonicalPath,within,outsideRepositories,parseArgs,evaluateProof,withoutFinish,levelGeometry,unrelatedWallFinishes,privateJSON,waitForAsync,assertDeepEqual};
