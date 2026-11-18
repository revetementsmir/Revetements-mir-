'use strict';
// Studio follow-up: the approved interface remains the base. The PDF client
// presentation and its route-local surfaces are now explicitly in scope.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const baseline='e0cd92d9e6dd01b3f6697dd7de972df95839c8e1';
const git=(args,encoding)=>cp.execFileSync('git',args,{cwd:root,encoding,maxBuffer:64*1024*1024});
const permitted=new Set(['dist/plan.html','dist/plan-app.js','dist/annotated-pdf.js','dist/studio.html']);
const original=git(['ls-tree','-r','-z',baseline,'--','dist'],'utf8').split('\0').filter(Boolean).map(entry=>{const [info,file]=entry.split('\t');return {file,hash:info.split(' ')[2]};});
const protectedFiles=original.filter(({file})=>!permitted.has(file));
for(const {file,hash} of protectedFiles){
 assert.ok(fs.existsSync(path.join(root,file)),`Protected file removed: ${file}`);
 const bytes=fs.readFileSync(path.join(root,file));
 const object=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 assert.equal(object,hash,`Protected file changed: ${file}`);
}
// The Studio engine may only receive a read-only presentation helper and three
// export arguments. Its geometry, input, persistence and estimate capture must
// still match the base exactly; this is stricter than excluding the whole file.
const app=fs.readFileSync(path.join(root,'dist/plan-app.js'),'utf8');
const helper=/  \/\/ Presentation-only copies for the client PDF\.[\s\S]*?(?=  \$\('#export-svg'\))/;
assert.equal((app.match(/function studioPresentationFaces\(/g)||[]).length,1);
const canonical=app.replace(helper,'').replace("theme:'studio-client',includeTechnical:document.getElementById('mir-studio-pdf-details')?.checked===true,presentationFaces:document.body.dataset.mirStudioLayout==='materials-bottom'?studioPresentationFaces():undefined,",'');
assert.equal(canonical,git(['show',baseline+':dist/plan-app.js'],'utf8'),'Studio engine unchanged outside isolated PDF presentation');
const engines=['plan-app.js','plan-3d.js','plan-import.js','project-store.js','studio-features.js'];
const report={baseline,protectedFiles:protectedFiles.length,permittedExistingFiles:[...permitted],engines:Object.fromEntries(engines.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist',file))).digest('hex')])),productionChanges:false};
const out=process.env.MIR_STUDIO03_OUT;
if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'protected-files.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
