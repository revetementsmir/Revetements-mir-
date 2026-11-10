'use strict';
const fs=require('node:fs'),path=require('node:path');
const output=path.resolve(__dirname,'../../artifacts/real-role-certification.json');
const roles=[
 ['ADMIN','admin','mir-recette-admin@example.com'],['BOSS','boss','mir-recette-boss@example.com'],
 ['CHEF_EQUIPE','chef_equipe','mir-recette-chef@example.com'],['EMPLOYEE','employe','mir-recette-employe@example.com'],
 ['ADJOINTE','assistant','mir-recette-adjointe@example.com'],['ENTREPOT','warehouse','mir-recette-entrepot@example.com']
];
const report={project:'MIR TEST',physicalDevice:false,startedAt:new Date().toISOString(),checks:[]};
function save(status,error){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({...report,status,error:error||null,finishedAt:new Date().toISOString()},null,2),{mode:0o600});}
async function json(url,options={}){const response=await fetch(url,options),text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}if(!response.ok)throw Error(`HTTP ${response.status}: ${typeof data==='string'?data.slice(0,160):data?.message||data?.error_description||'request failed'}`);return data;}
(async()=>{
 const base=process.env.MIR_SUPABASE_URL,key=process.env.MIR_SANDBOX_PUBLISHABLE_KEY,org=process.env.MIR_SANDBOX_ORG_ID;
 const required=['MIR_SUPABASE_URL','MIR_SANDBOX_PUBLISHABLE_KEY','MIR_SANDBOX_ORG_ID',...roles.flatMap(([name])=>[`MIR_SANDBOX_${name}_EMAIL`,`MIR_SANDBOX_${name}_PASSWORD`])];
 const missing=required.filter(name=>!process.env[name]);
 if(missing.length)throw Error('Secrets GitHub manquants: '+missing.join(', '));
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base)||!/^[0-9a-f-]{36}$/i.test(org))throw Error('Configuration MIR TEST invalide');
 const mismatched=roles.flatMap(([name,,expectedEmail])=>[
  process.env[`MIR_SANDBOX_${name}_EMAIL`]===expectedEmail?null:`MIR_SANDBOX_${name}_EMAIL`,
  process.env[`MIR_SANDBOX_${name}_PASSWORD`]==='MIR-Recette-2026!'?null:`MIR_SANDBOX_${name}_PASSWORD`
 ]).filter(Boolean);
 if(mismatched.length)throw Error('Valeurs GitHub incorrectes: '+mismatched.join(', '));
 for(const [name,expected] of roles){
  const email=process.env[`MIR_SANDBOX_${name}_EMAIL`],password=process.env[`MIR_SANDBOX_${name}_PASSWORD`];
  const auth=await json(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({email,password})});
  const headers={apikey:key,authorization:'Bearer '+auth.access_token,'content-type':'application/json'};
  const memberships=await json(base+'/rest/v1/rpc/mir_my_memberships',{method:'POST',headers,body:'{}'});
  if(!Array.isArray(memberships)||!memberships.some(item=>item.id===org))throw Error(`${name}: organisation MIR TEST absente`);
  const snapshot=await json(base+'/rest/v1/rpc/mir_employee_operations_snapshot',{method:'POST',headers,body:JSON.stringify({org,job:null})});
  if(snapshot.role!==expected)throw Error(`${name}: rôle reçu ${snapshot.role||'absent'}, attendu ${expected}`);
  report.checks.push({role:name,authenticated:true,organizationConfirmed:true,roleConfirmed:expected});
 }
 save('PASS');console.log('PASS six comptes réels MIR TEST: Auth, organisation et rôles confirmés');
})().catch(error=>{save('FAIL',error.message);console.error(error.message);process.exitCode=1});
