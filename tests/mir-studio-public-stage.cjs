'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {stage}=require('../scripts/stage-mir-studio-public.cjs');
const ROOT=path.resolve(__dirname,'..'),DIST=path.join(ROOT,'dist');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mir-studio-stage-')),test=path.join(dir,'test');
try{
 fs.mkdirSync(test);
 const sources={};
 for(const name of ['plan.html','studio.html']){
   const origin=path.join(DIST,name);sources[name]=sha(origin);
   fs.copyFileSync(origin,path.join(dir,name));
   fs.writeFileSync(path.join(test,name),fs.readFileSync(origin,'utf8').replace(/<head>/i,'<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"><script src="mir-test-guard.js"></script>'));
 }
 fs.writeFileSync(path.join(test,'mir-test-environment.json'),JSON.stringify({environment:'test',projectRef:'hxtztkmbfpmzrieccwsg',revision:'a'.repeat(40)}));
 assert.throws(()=>stage(DIST),/Refus/);
 const before=Object.fromEntries(['plan.html','studio.html'].map(name=>[name,sha(path.join(test,name))]));
 const result=stage(dir);assert.equal(result.testPagesUnchanged,true);
 for(const name of ['plan.html','studio.html']){
   const html=fs.readFileSync(path.join(dir,name),'utf8');
   assert.match(html,/En construction par l’équipe MIR/);
   assert.match(html,/Under construction by the MIR team/);
   assert.match(html,/prefers-reduced-motion/);
   assert.match(html,/href="boutique\.html"/);
   assert.match(html,/href="index\.html"/);
   const presentationScripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1].split('?')[0]);
   assert.deepEqual(presentationScripts,['mir-public-menu.js','mir-prestige.js'],'only public navigation presentation scripts are allowed');
   assert.doesNotMatch(html,/src="(?:plan|studio|production|portal|shared|mir-estimate)[^"\s]*\.js/,'no Studio engine or backend script on public construction page');
   assert.doesNotMatch(html,/mir-test-guard\.js|supabase\.co/);
   assert.equal(sha(path.join(test,name)),before[name]);
   assert.equal(sha(path.join(DIST,name)),sources[name],'original Studio source must remain unchanged');
   assert.equal(sha(path.join(dir,'plan.html')),sha(path.join(dir,'studio.html')));
 }
 for(const forbidden of ['production.html','pliage.html','boutique.html','selection.html','chantier.html'])assert.equal(fs.existsSync(path.join(dir,forbidden)),false,'stage must not create '+forbidden);
 assert.throws(()=>stage(dir),/Source Studio originale absente/,'cannot silently restage old public page');
 console.log('PASS public-only Studio overlay, 2 TEST originals hashed unchanged, assets/drafts untouched, no production override');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
