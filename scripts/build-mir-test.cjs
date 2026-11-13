'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const TEST='hxtztkmbfpmzrieccwsg',PROD='gccltmaulvrnthrbnrpd';
function build(source,target,revision,{configFile,guardFile}={}){
 source=path.resolve(source);target=path.resolve(target);
 if(!/^[a-f0-9]{40}$/.test(revision)||source===target||fs.existsSync(target))throw Error('A new target and an exact revision are required');
 const context={window:{},location:{search:'?recette=1'},URLSearchParams};vm.runInNewContext(fs.readFileSync(configFile||path.join(source,'portal-config.js'),'utf8'),context);
 const config=context.window.MIRPortalConfig;
 if(config?.projectRef!==TEST||config.supabaseUrl!==`https://${TEST}.supabase.co`||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey))throw Error('Verified MIR TEST public configuration required');
 const entries=fs.readdirSync(source);fs.mkdirSync(target,{recursive:true});
 for(const entry of entries){if(entry==='test')continue;fs.cpSync(path.join(source,entry),path.join(target,entry),{recursive:true});}
 if(guardFile)fs.copyFileSync(guardFile,path.join(target,'mir-test-guard.js'));
 const callback=config.callbackPath.replace(/\/[^/]+$/,'/test/chantier.html');
 const portal={...config,environment:'test',projectRef:TEST,supabaseUrl:`https://${TEST}.supabase.co`,callbackPath:callback,emailEnabled:false,googleEnabled:false,signupEnabled:false,invitationsEnabled:false,manualInvitations:false};
 const write=(name,global,value)=>fs.writeFileSync(path.join(target,name),`window.${global}=Object.freeze(${JSON.stringify(value)});\n`);
 write('portal-config.js','MIRPortalConfig',portal);
 write('shared-config.js','MIRSharedConfig',{enabled:true,environment:'test',supabaseUrl:portal.supabaseUrl,publishableKey:portal.publishableKey});
 write('mir-estimate-config.js','MIREstimateConfig',{environment:'test',apiBase:`${portal.supabaseUrl}/functions/v1/mir-estimates`});
 fs.writeFileSync(path.join(target,'mir-test-environment.json'),JSON.stringify({environment:'test',projectRef:TEST,revision},null,2)+'\n');
 const policy=`default-src 'self'; script-src 'self' https://atelier.atelier-app-001.workers.dev 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' https://atelier.atelier-app-001.workers.dev 'unsafe-inline'; connect-src 'self' https://${TEST}.supabase.co wss://${TEST}.supabase.co https://atelier.atelier-app-001.workers.dev; img-src 'self' data: blob: https://${TEST}.supabase.co; font-src 'self' data:; media-src 'self' data: blob:; worker-src 'self' blob:; frame-src https://atelier.atelier-app-001.workers.dev; object-src 'none'; base-uri 'self'; form-action 'self'`;
 function visit(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory()){visit(file);continue;}if(!entry.name.endsWith('.html'))continue;let text=fs.readFileSync(file,'utf8');const loader=['responsive.html','annoter.html'].includes(entry.name);const header=`<meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="${policy}">${loader?'':'<script src="'+path.relative(path.dirname(file),path.join(target,'mir-test-guard.js')).split(path.sep).join('/')+'"></script>'}`;text=text.replace(/<head(?:\s[^>]*)?>/i,match=>match+header);fs.writeFileSync(file,text);}}
 visit(target);
 for(const file of ['portal-config.js','shared-config.js','mir-estimate-config.js'])if(fs.readFileSync(path.join(target,file),'utf8').includes(PROD))throw Error('Production reference in TEST configuration');
 return {environment:'test',projectRef:TEST,revision,target};
}
function productionManifest(directory,revision){
 if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Exact production revision required');
 const files={};function visit(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(folder,entry.name),relative=path.relative(directory,file).split(path.sep).join('/');if(relative==='test'||relative==='mir-production-release.json')continue;if(entry.isDirectory())visit(file);else if(entry.isFile())files[relative]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');else throw Error('Non-regular release entry');}}
 visit(directory);return {environment:'production',revision,files};
}
function writeProductionManifest(directory,revision){const manifest=productionManifest(directory,revision);fs.writeFileSync(path.join(directory,'mir-production-release.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;}
function candidateRelease(productionSource,candidateSource,target,production,revision){
 if(production.environment!=='production'||!/^[a-f0-9]{40}$/.test(production.revision)||!production.files||fs.existsSync(target))throw Error('Verified production manifest and new output required');
 for(const [relative,hash]of Object.entries(production.files)){
  if(relative.includes('\\')||path.isAbsolute(relative)||relative.split('/').some(part=>!part||part==='.'||part==='..')||relative.startsWith('test/')||relative==='mir-production-release.json'||! /^[a-f0-9]{64}$/.test(hash))throw Error('Invalid release path or digest');
  const source=path.join(productionSource,relative);if(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')!==hash)throw Error('Production source differs: '+relative);
 }
 fs.mkdirSync(target,{recursive:true});
 for(const relative of Object.keys(production.files)){const destination=path.join(target,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(productionSource,relative),destination);}
 fs.writeFileSync(path.join(target,'mir-production-release.json'),JSON.stringify(production,null,2)+'\n');
 build(candidateSource,path.join(target,'test'),revision,{configFile:path.join(target,'portal-config.js'),guardFile:path.join(target,'mir-test-guard.js')});
 if(JSON.stringify(productionManifest(target,production.revision))!==JSON.stringify(production))throw Error('Production bytes changed while preparing TEST');
 return {production:production.revision,test:revision};
}
module.exports={build,productionManifest,writeProductionManifest,candidateRelease};
if(require.main===module){const args=process.argv.slice(2);if(args[0]==='--production-manifest')console.log(JSON.stringify(writeProductionManifest(args[1],args[2])));else if(args[0]==='--candidate')console.log(JSON.stringify(candidateRelease(args[1],args[2],args[3],JSON.parse(fs.readFileSync(args[4])),args[5])));else console.log(JSON.stringify(build(...args)));}
