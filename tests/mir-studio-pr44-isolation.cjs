'use strict';
/* The authorized Studio document extension is separate from Auth/Punch. Historical
 * PR41/42 contracts and whole-file pins remain unchanged. No broad path exemption. */
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{createHash}=require('node:crypto');
const BASE='e9bd39bc5dd4c40663c56bfc21759c543ab4e8d9';
const tags='<link rel="stylesheet" href="mir-private-document-viewer.css"><script src="mir-private-document-viewer.js" defer></script><script src="studio-job-reader-bridge.js" defer></script>';
function staffMarkup(original){
 const anchor='<script src="chantier-app.js?v=chantier-ux-1" defer></script>';
 assert.equal(original.split(anchor).length,2,'one canonical staff entry');
 assert.equal(original.includes(tags),false,'the extension is additive to the certified base');
 return original.replace(anchor,tags+anchor);
}
function verify(){
 assert.equal(process.env.MIR_CLIENT_BASE_SHA,BASE,'Studio PR44 exact reviewed main');
 const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8'}).trim();
 const migrations={
  'supabase/migrations/20261116115844_mir_studio_job_snapshots.sql':'8a97d7dc2fe4d9b71f57b12f5a3e5342ab66b2ace748630d93fef3def2bb124f',
  'supabase/migrations/20261116123805_mir_studio_site_document_index.sql':'031996b2d541e82824ac7a4633596c6479cec1b52739d155f48e2d5e98747902'
 };
 const protectedPaths=['mobile','server','supabase','dist/portal-client.js','dist/portal-config.js','dist/chantier-app.js','dist/chantier-employee.css','dist/employee-store-model.js','dist/entrepot.html','dist/entrepot-app.js','dist/coordination.html','dist/production-app.js','dist/mir-estimate-presentation.js','dist/mir-help-center.js','dist/mir-client-return.js','scripts/mir-final-release-gate.cjs','scripts/stage-mir-studio-public.cjs','ops/studio-public'];
 const changed=git('diff','--name-only',BASE,'HEAD','--',...protectedPaths).split('\n').filter(Boolean).sort();
 assert.deepEqual(changed,Object.keys(migrations).sort(),'only the two exact additive Studio SQL files; all prior staff/Auth/Punch/mobile/release bytes remain intact');
 for(const [file,hash]of Object.entries(migrations))assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
 const original=cp.execFileSync('git',['show',BASE+':dist/chantier.html'],{encoding:'utf8'});
 assert.equal(fs.readFileSync('dist/chantier.html','utf8'),staffMarkup(original),'exactly three new document assets, no staff/Auth markup change');
 assert.match(fs.readFileSync('dist/studio-job-reader-bridge.js','utf8'),/projectRef!==TEST/);
 assert.match(fs.readFileSync('dist/studio-job-reader-bridge.js','utf8'),/generation!==epoch/);
 console.log('PASS PR44: canonical staff/Auth/Punch/mobile and release gates byte-identical; two SHA-pinned additive SQL files and exact three-asset reader integration');
}
module.exports={staffMarkup,verify};if(require.main===module)verify();
