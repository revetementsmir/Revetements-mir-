'use strict';
// This presentation-only lot must not change the concurrent PDF→3D engine,
// customer journeys, approved home, shared shell or staff workspaces.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const baseline='3d0eb311fc929b35fb97b4466ede2308633e141b';
const git=(args,encoding)=>cp.execFileSync('git',args,{cwd:root,encoding,maxBuffer:64*1024*1024});
const permitted=new Set(['dist/plan.html','dist/mir-client-workspaces.js']);
const original=git(['ls-tree','-r','-z',baseline,'--','dist'],'utf8').split('\0').filter(Boolean).map(entry=>{const [info,file]=entry.split('\t');return {file,hash:info.split(' ')[2]};});
const protectedFiles=original.filter(({file})=>!permitted.has(file));
for(const {file,hash} of protectedFiles){
 assert.ok(fs.existsSync(path.join(root,file)),`Protected file removed: ${file}`);
 const bytes=fs.readFileSync(path.join(root,file));
 const object=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 assert.equal(object,hash,`Protected file changed: ${file}`);
}
const engines=['plan-app.js','plan-3d.js','plan-import.js','project-store.js','studio-features.js'];
const report={baseline,protectedFiles:protectedFiles.length,permittedExistingFiles:[...permitted],engines:Object.fromEntries(engines.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist',file))).digest('hex')])),productionChanges:false};
const out=process.env.MIR_STUDIO03_OUT;
if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'protected-files.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
