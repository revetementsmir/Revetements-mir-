'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
function configuration(env=process.env){
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist/shared-config.js'),'utf8'),sandbox);
 let publicConfig=sandbox.window.MIRSharedConfig;
 if(!publicConfig.enabled||new URL(publicConfig.supabaseUrl).hostname!=='gccltmaulvrnthrbnrpd.supabase.co'||!publicConfig.publishableKey.startsWith('sb_publishable_'))throw Error('Configuration publique MIR inattendue');
 // Select credentials and destination together. Never redirect production secrets.
 if(env.MIR_TEST_TARGET==='sandbox'){
  publicConfig={enabled:true,supabaseUrl:'https://hxtztkmbfpmzrieccwsg.supabase.co',publishableKey:env.MIR_SANDBOX_PUBLISHABLE_KEY||''};
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicConfig.publishableKey))throw Error('Clé publique du bac à sable requise');
  const mapped={MIR_TEST_ORG_ID:env.MIR_SANDBOX_ORG_ID,MIR_TEST_FOREIGN_ORG_ID:env.MIR_SANDBOX_FOREIGN_ORG_ID};
  for(const role of ['ADMIN','EMPLOYEE','CLIENT','OTHER_CLIENT','OUTSIDER'])for(const field of ['EMAIL','PASSWORD'])mapped[`MIR_TEST_${role}_${field}`]=env[`MIR_SANDBOX_${role}_${field}`];
  env={...mapped};
 }else if(env.MIR_TEST_TARGET&&env.MIR_TEST_TARGET!=='production')throw Error('Cible de recette inconnue');
 const required=['MIR_TEST_ORG_ID',...['ADMIN','EMPLOYEE','CLIENT'].flatMap(role=>[`MIR_TEST_${role}_EMAIL`,`MIR_TEST_${role}_PASSWORD`])];
 const missing=required.filter(k=>!env[k]);
 const accounts={};for(const role of ['ADMIN','EMPLOYEE','CLIENT','OTHER_CLIENT','OUTSIDER'])if(env[`MIR_TEST_${role}_EMAIL`]&&env[`MIR_TEST_${role}_PASSWORD`])accounts[role.toLowerCase()]={email:env[`MIR_TEST_${role}_EMAIL`],password:env[`MIR_TEST_${role}_PASSWORD`]};
 if(!missing.length&&new Set(Object.values(accounts).map(a=>a.email.toLowerCase())).size!==Object.keys(accounts).length)throw Error('Utilisez des comptes distincts pour chaque rôle');
 if(env.MIR_TEST_ORG_ID&&!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(env.MIR_TEST_ORG_ID))throw Error('MIR_TEST_ORG_ID doit être un UUID');
 if(env.MIR_TEST_FOREIGN_ORG_ID===env.MIR_TEST_ORG_ID&&env.MIR_TEST_FOREIGN_ORG_ID)throw Error('La seconde organisation doit être distincte');
 return {root,publicConfig,missing,accounts,org:env.MIR_TEST_ORG_ID,foreignOrg:env.MIR_TEST_FOREIGN_ORG_ID};
}
module.exports={configuration};
