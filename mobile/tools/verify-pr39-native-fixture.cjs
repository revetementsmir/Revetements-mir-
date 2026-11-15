'use strict';
// Read-only preflight for the *two* exact MIR TEST QA accounts and fresh PR37 shifts.
// Historical synthetic 8900/8910 and 9000/9010 are closed; never reactivate them.
// Sign-in is limited to existing QA identities; no punch RPC or mutation is called.
const HOST='hxtztkmbfpmzrieccwsg.supabase.co';
const ORG='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';
const JOB='7da20261-1114-4000-8000-000000000001';
const MARKER='QA-TEAMS-HOURS-SYNTHETIC-NOT-PHYSICAL';
const LEAD_ASSIGNMENT='7da20261-1115-4000-9120-000000000001';
const LEAD_TASK='7da20261-1115-4000-9130-000000000001';
const LEAD_MEMBER='552233d5-ae18-4c14-be85-0206e6f18549';
const ACTORS=Object.freeze([
  Object.freeze({key:'EMPLOYEE',id:'3980647a-d83a-48ad-9d90-8fc2b314807f',shift:'7da20261-1115-4000-9100-000000000001',segment:'7da20261-1115-4000-9110-000000000001'}),
  Object.freeze({key:'CHEF',id:'ec421778-b39b-492e-9e4b-5e044015e98f',shift:'7da20261-1115-4000-9100-000000000002',segment:'7da20261-1115-4000-9110-000000000002'})
]);
function configuration(env){
  if(env.MIR_SANDBOX_ORG_ID!==ORG)throw Error('Organisation TEST incorrecte; accès refusé');
  const key=env.MIR_SANDBOX_PUBLISHABLE_KEY;
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key||''))throw Error('Clé publique MIR TEST manquante ou invalide');
  return {key,actors:ACTORS.map(actor=>{
    const email=env['MIR_SANDBOX_'+actor.key+'_EMAIL'],password=env['MIR_SANDBOX_'+actor.key+'_PASSWORD'];
    if(!email||!password)throw Error('Compte QA absent: '+actor.key);
    return {...actor,email,password};
  })};
}
function checkState(data,actor,nowMs=Date.now()){
  const shift=data?.activeShift,segment=shift?.segment;
  if(!shift||shift.id!==actor.shift||shift.device_id!==MARKER||
     shift.status!=='active'||shift.ended_at!==null||shift.ended_at===undefined||
     segment?.id!==actor.segment||segment?.job_id!==JOB||
     segment?.segment_type!=='job'||segment?.ended_at!==null||segment?.ended_at===undefined)
     throw Error('Quart/segment QA actif manquant ou incohérent: '+actor.key);
  const started=Date.parse(shift.started_at),seconds=(nowMs-started)/1000;
  if(!Number.isFinite(seconds)||seconds<900||seconds>8*3600)
    throw Error('Heure du quart QA hors de la fenêtre 15 min–8 h: '+actor.key);
  return {role:actor.key,shiftId:actor.shift,segmentId:actor.segment,jobId:JOB,secondsActive:Math.floor(seconds)};
}
function checkLead(data){
  if(data?.role!=='chef_equipe'||data?.today!=='2026-11-15'||
    data?.assignment?.id!==LEAD_ASSIGNMENT||data.assignment.jobId!==JOB||
    !Array.isArray(data.team)||!data.team.some(m=>m.id===LEAD_MEMBER)||
    !Array.isArray(data.tasks)||!data.tasks.some(t=>t.id===LEAD_TASK&&t.completedAt===null))
    throw Error('Affectation/équipe/tâche QA Chef du jour absente ou incohérente');
  return {assignmentId:LEAD_ASSIGNMENT,taskId:LEAD_TASK,jobId:JOB};
}
async function postJson(fetchFn,url,headers,data){
  const response=await fetchFn(url,{
    method:'POST',headers:{'content-type':'application/json',...headers},
    body:JSON.stringify(data),signal:AbortSignal.timeout(20000)
  });
  let body;try{body=await response.json();}catch{throw Error('Réponse QA illisible ('+response.status+')');}
  if(!response.ok)throw Error('Précondition QA RPC ou Auth refusée ('+response.status+')');
  return body;
}
async function run(env=process.env,fetchFn=fetch){
  const config=configuration(env),base='https://'+HOST,results=[];
  for(const actor of config.actors){
    const session=await postJson(fetchFn,base+'/auth/v1/token?grant_type=password',
      {apikey:config.key},{email:actor.email,password:actor.password});
    if(session?.user?.id!==actor.id||!session.access_token)
      throw Error('Identité de compte QA inattendue: '+actor.key);
    const punch=await postJson(fetchFn,base+'/rest/v1/rpc/mir_punch_snapshot',
      {apikey:config.key,authorization:'Bearer '+session.access_token},
      {org:ORG,employee:null});
    const result=checkState(punch,actor);
    if(actor.key==='CHEF'){
      const lead=await postJson(fetchFn,base+'/rest/v1/rpc/mir_lead_today_snapshot',
        {apikey:config.key,authorization:'Bearer '+session.access_token},{org:ORG});
      result.lead=checkLead(lead);
    }
    results.push(result);
  }
  return {project:HOST,organization:ORG,fixture:'PR41 isolated QA 9100/9110',readOnly:true,roles:results};
}
if(require.main===module)run().then(result=>{
  console.log('PASS préparation native MIR TEST: '+result.roles.length+' comptes, 2 quarts et segments actifs, identité exacte, sans écriture métier');
}).catch(error=>{console.error('MIR TEST précondition: '+error.message);process.exitCode=1;});
module.exports={ACTORS,HOST,ORG,JOB,MARKER,LEAD_ASSIGNMENT,LEAD_TASK,LEAD_MEMBER,configuration,checkState,checkLead,run};
