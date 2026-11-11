'use strict';
// Local, reproducible, non-network suite. Does not read credentials or migrate Supabase.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),proof=process.env.MIR_CHAT_RESULTS_DIR||'/tmp/mir-chat-phase3a-validation';
const groups={
 'static-or-unit-simulated':[
  'mir-chat-phase3a','mir-today','mir-pages-regressions','mir-homepage','mir-boutique-audit-20261110','mir-pliage-audit-commercial','mir-magasin-merge','mir-warehouse-core','mir-warehouse-sql','mir-realisations','mir-studio-wall-sections','mir-role-navigation','mir-account-session','mir-six-role-certification','mir-portal-login','mir-portal-optional-modules'
 ],
 'disposable-postgres':[
  'mir-chat-phase3a-postgres','mir-chat-phase3a-guards','mir-chat-support-postgres','mir-chat-storage-probe-postgres','mir-employee-operations-postgres','mir-job-dossier-postgres','mir-punch-postgres','mir-operational-roles-postgres'
 ],
 'ui-simulated':[
  'mir-chat-phase3a-browser','mir-today-browser','mir-punch-browser','mir-employee-portal-browser','mir-chef-boss-browser','mir-homepage-browser','mir-boutique-audit-20261110-browser','mir-client-pliage-approved-browser','mir-warehouse-browser','mir-realisations-browser','mir-studio-wall-sections-browser','mir-job-dossier-browser','mir-production-signature-browser','mir-production-client-flow-browser','mir-unified-dossier-browser','mir-atelier-v4-browser'
 ]
};
const preload=process.env.MIR_CHROMIUM_PRELOAD;
function execute(file){return new Promise(resolve=>{
 const args=[...(preload?['--require',preload]:[]),'tests/'+file+'.cjs'],start=Date.now();let stdout='',stderr='';
 const child=spawn(process.execPath,args,{cwd:root,env:{...process.env,MIR_TODAY_PROOF_DIR:path.join(proof,'today'),MIR_CLIENT_PLIAGE_PROOF_DIR:path.join(proof,'pliage')}});
 const timeout=setTimeout(()=>child.kill('SIGTERM'),240000);child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 child.on('error',e=>{stderr+=e.message;});child.on('close',(code,signal)=>{clearTimeout(timeout);resolve({file:'tests/'+file+'.cjs',status:code===0?'passed':'failed',exitCode:code,signal,durationMs:Date.now()-start,stdout,stderr});});
});}
(async()=>{
 fs.mkdirSync(proof,{recursive:true});const report={baseSha:'39de53260a134bae48143c1bdb1aa235335d6187',workSha:/^[0-9a-f]{40}$/.test(process.env.MIR_CHAT_WORK_SHA||'')?process.env.MIR_CHAT_WORK_SHA:null,nodeVersion:process.versions.node,startedAt:new Date().toISOString(),hostedWrites:false,realMirTestCertification:'not-run: migration not authorized on hosted TEST',production:'not-accessed',suites:[]};
 for(const [kind,files]of Object.entries(groups))for(const file of files){const result={kind,...await execute(file)};report.suites.push(result);console.log(result.status.toUpperCase()+' '+result.file+' '+result.durationMs+'ms');if(result.status!=='passed')console.log(result.stderr||result.stdout);fs.writeFileSync(path.join(proof,'results.json'),JSON.stringify(report,null,2)+'\n');}
 report.finishedAt=new Date().toISOString();report.total=report.suites.length;report.passed=report.suites.filter(s=>s.status==='passed').length;report.failed=report.total-report.passed;
 fs.writeFileSync(path.join(proof,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed,report:path.join(proof,'results.json')}));if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
