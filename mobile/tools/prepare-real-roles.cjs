'use strict';
const {spawnSync}=require('node:child_process');
const roles=[['EMPLOYEE','employe'],['CHEF','chef_equipe'],['WAREHOUSE','warehouse'],['ASSISTANT','assistant'],['BOSS','boss'],['ADMIN','admin']];
// Fixed target, not a caller supplied URL. No authentication or business mutation here.
const config={project:'hxtztkmbfpmzrieccwsg',roles:roles.map(([key,role])=>{const email=process.env['MIR_SANDBOX_'+key+'_EMAIL'],password=process.env['MIR_SANDBOX_'+key+'_PASSWORD'];if(!email||!password)throw Error('Compte MIR TEST manquant : '+key);return{role,email,password};})};
const result=spawnSync('adb',['shell','run-as','ca.revetementsmir.equipe.test','sh','-c',"'umask 077; mkdir -p files && cat > files/phase11-roles.json && chmod 600 files/phase11-roles.json'"],{input:JSON.stringify(config),encoding:'utf8'});
if(result.status!==0)throw Error('Injection privée des comptes TEST refusée');
console.log('Six comptes injectés dans le stockage privé de l’émulateur TEST; aucun secret dans l’APK.');
