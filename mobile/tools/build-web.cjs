'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'mobile/www');
if(process.env.MIR_ANDROID_ENV&&process.env.MIR_ANDROID_ENV!=='test')throw Error('Seule la recette MIR TEST est autorisée');
for(const name of ['MIR_TEST_GOOGLE_ENABLED','MIR_TEST_RECOVERY_ENABLED','MIR_TEST_INVITATIONS_ENABLED','MIR_TEST_ENROLLMENT_ENABLED'])if(process.env[name]!==undefined&&!['true','false'].includes(process.env[name]))throw Error('Indicateur TEST invalide : '+name);
const project='hxtztkmbfpmzrieccwsg',key='sb_publishable_jk8zsTWqQi6Borv44aaDJw_k7JSbzZh';
const publicModules=new Set(['mir-estimate.js','mir-estimate-drafts.js','mir-estimate-upload.js']);
const files=cp.execFileSync('git',['ls-files','-z','dist'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
fs.mkdirSync(out,{recursive:true});
// Generated build directory only; no source, server or historical data is edited.
for(const entry of fs.readdirSync(out))fs.rmSync(path.join(out,entry),{recursive:true,force:true});
for(const file of files){
 if(publicModules.has(path.basename(file)))continue;
 if(file.endsWith('.html')&&!require('../web/policy.cjs').allowedRoute('https://localhost/'+file.slice(5)))continue;
 if(/atelier-essai\/.*(?:-candidate|index)\.html$/.test(file))continue;
 const dest=path.join(out,file.slice(5));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);
}
// New local assets must also be included before their first commit.
for(const file of ['google-signin.svg','mir-field-cart.js','mir-field-views.js','mir-field.css'])fs.copyFileSync(path.join(root,'dist',file),path.join(out,file));
const capabilities={fieldExperienceEnabled:true,googleEnabled:process.env.MIR_TEST_GOOGLE_ENABLED==='true',recoveryEnabled:process.env.MIR_TEST_RECOVERY_ENABLED==='true',teamInvitationsEnabled:process.env.MIR_TEST_INVITATIONS_ENABLED!=='false',teamEnrollmentEnabled:process.env.MIR_TEST_ENROLLMENT_ENABLED!=='false'};
fs.writeFileSync(path.join(out,'mir-team-test-config.js'),'window.MIRTeamTestConfig=Object.freeze('+JSON.stringify(capabilities)+');');
const config={enabled:true,fieldExperienceEnabled:true,accountEnabled:true,passwordEnabled:true,emailEnabled:capabilities.recoveryEnabled,googleEnabled:capabilities.googleEnabled,signupEnabled:false,invitationsEnabled:capabilities.teamInvitationsEnabled,teamInvitationsEnabled:capabilities.teamInvitationsEnabled,teamEnrollmentEnabled:capabilities.teamEnrollmentEnabled,manualInvitations:true,documentsEnabled:false,environment:'test',projectRef:project,supabaseUrl:`https://${project}.supabase.co`,publishableKey:key,siteOrigin:'https://localhost',callbackPath:'/chantier.html'};
fs.writeFileSync(path.join(out,'portal-config.js'),'window.MIRPortalConfig=Object.freeze('+JSON.stringify(config)+');');
fs.writeFileSync(path.join(out,'shared-config.js'),'window.MIRSharedConfig=Object.freeze('+JSON.stringify({enabled:true,supabaseUrl:config.supabaseUrl,publishableKey:key})+');');
fs.writeFileSync(path.join(out,'mir-estimate-config.js'),'window.MIREstimateConfig=Object.freeze({enabled:false,environment:"test",apiBase:null});');
for(const name of ['native-checks.html','native-checks.js','native-pdf.html','native-pdf.js','native-pdf-worker.mjs','team.css'])fs.copyFileSync(path.join(root,'mobile/web',name),path.join(out,name));
const esbuild=require('esbuild');
for(const name of ['compat','bootstrap','sdk'])esbuild.buildSync({entryPoints:[path.join(root,'mobile/web/'+name+'.js')],outfile:path.join(out,'mir-native-'+name+'.js'),bundle:true,format:'iife',target:'es2022'});
const csp="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: https://"+project+".supabase.co wss://"+project+".supabase.co; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; form-action 'none'; base-uri 'self'";
for(const file of fs.readdirSync(out).filter(p=>p.endsWith('.html'))){
 const pageCsp=file==='native-checks.html'?csp.replace(/connect-src[^;]+;/,"connect-src 'none';"):csp;
 const p=path.join(out,file);let html=fs.readFileSync(p,'utf8');
 html=html.replace(/<head([^>]*)>/i,'<head$1><meta http-equiv="Content-Security-Policy" content="'+pageCsp+'"><script src="mir-native-compat.js"></script>'+(html.includes('src="mir-native-bootstrap.js"')?'':'<script src="mir-native-bootstrap.js"></script>'));
 html=html.replace(/(<script[^>]*src="vendor\/supabase-client\.js[^>]*><\/script>)/g,'$1<script src="mir-native-sdk.js" defer></script>');
 html=html.replace(/<footer\b[^>]*(?:data-portal-public-footer|class="mir-signature-footer")[^>]*>[\s\S]*?<\/footer>/gi,'');
 html=html.replace(/<script\b[^>]*src="(?:mir-estimate(?:-drafts|-upload)?\.js)[^"]*"[^>]*><\/script>/gi,'');
 html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="team.css"></head>');
 fs.writeFileSync(p,html);
}
// Business help keeps the existing scoped support and role permissions, with
// native fallback answers instead of public estimate/cart/contact instructions.
const helpPath=path.join(out,'mir-help-center.js');
const businessFAQ=[
 {kind:'faq',category:'account',question:'Comment accéder à mon compte équipe?',answer:'Utilisez votre compte MIR TEST autorisé. Votre rôle et vos affectations sont vérifiés par le serveur. Pour un accès refusé, contactez votre responsable MIR.'},
 {kind:'faq',category:'order',question:'Où suivre le travail autorisé?',answer:'Utilisez les outils de votre espace métier. Seuls les chantiers, commandes et actions autorisés pour votre compte sont disponibles.'}
];
let help=fs.readFileSync(helpPath,'utf8');
if(!/const fallbackFAQ=\[[\s\S]*?\];/.test(help))throw Error('Structure du Centre d’aide à revoir');
help=help.replace(/const fallbackFAQ=\[[\s\S]*?\];/,'const fallbackFAQ='+JSON.stringify(businessFAQ)+';');
if(!help.includes('const remote=await api()?.helpFAQ?.();'))throw Error('Chargement FAQ native à revoir');
help=help.replace('const remote=await api()?.helpFAQ?.();','const remote=fallbackFAQ;');
fs.writeFileSync(helpPath,help);
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=chantier.html"></head><body><a href="chantier.html">Connexion équipe MIR — TEST</a></body></html>');
console.log('Ressources MIR embarquées; projet TEST '+project+'; aucun server.url distant.');
