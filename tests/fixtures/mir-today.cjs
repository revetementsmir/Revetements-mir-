'use strict';
module.exports = function fixture() {
  window.MIRPortalClient = {...window.MIRPortalClient, create() {
    const chef = location.search.includes('chef=1');
    const empty = location.search.includes('empty=1');
    const enabled = location.search.includes('punch=1');
    const id = chef ? 'qa-chef' : 'qa-employee';
    const job = {id:'qa-job',number:'353',name:'JOB 353 · Résidence exemple',address:'141, rue du Chantier, Québec',city:'Québec',phone:'4185550101',latitude:46.8139,longitude:-71.208,assignedMemberIds:[id]};
    const second = {...job,id:'qa-job-2',number:'454',name:'JOB 454 · Prochaine adresse',address:'20, rue Exemple, Lévis'};
    const task = {id:'qa-task',title:'Poser les moulures de la façade',completedAt:null};
    let publish = () => {};
    const state = {mode:'connected',demo:false,actorId:id,members:[{id,name:'Camille Exemple',role:'employee',active:true}],jobs:empty?[]:[job,second],planVersions:[],catalogue:[],orders:[],deliveries:[],movements:[],inventory:{},favorites:{},messaging:{contacts:[],teams:[],conversations:[],messages:[],unreadCount:2},operations:{role:chef?'chef_equipe':'employe',notifications:[{id:'notice',title:'Nouveau plan disponible',kind:'plan',read_at:null,route:{view:'job',jobId:job.id}},{id:'old',title:'Avis déjà lu',read_at:'2026-11-01'},{id:'malicious',title:'Action non disponible',read_at:null,route:{view:'members',url:'javascript:alert(1)'}}]},punch:{enabled,settings:{},activeShift:null,week:[],corrections:[],bankRequests:[],bankHistory:[],bankBalance:0}};
    if(chef)state.lead={assignment:empty?null:{id:'qa-assignment',teamId:'qa-team',jobId:job.id,startTime:'07:00:00'},team:[{id:'qa-worker',name:'Alex Exemple',status:'unconfirmed'}],tasks:[task],reports:[],activity:[],materialRequests:[]};
    if(location.search.includes('minimal=1'))state.jobs=state.jobs.map(j=>({id:j.id,name:j.name,assignedMemberIds:j.assignedMemberIds}));
    window.__todayCalls=[];
    const ready=()=>({phase:'ready',snapshot:state,reason:'refresh'});
    return {config:{projectRef:'fixture-only'},getStatus:ready,subscribe(fn){publish=fn;},async start(){publish(ready());},async refresh(){publish(ready());},
      async jobDossier(jobId){window.__todayCalls.push(['dossier',jobId]);if(location.search.includes('denied=1'))throw Error('Chantier inaccessible');const metadata={...(jobId===job.id?job:second)};if(location.search.includes('minimal=1')){delete metadata.latitude;delete metadata.longitude;}return {job:metadata,tasks:[{id:task.id,title:task.title,completed_at:task.completedAt}],access:{readOnly:false}};},
      async punchAction(action,jobId){window.__todayCalls.push(['punch',action,jobId]);state.punch.activeShift=action==='in'?{id:'qa-shift',started_at:new Date().toISOString(),segment:{job_id:jobId,segment_type:'job'}}:null;publish(ready());return{serverAt:new Date().toISOString()};},
      async leadAction(action,payload){window.__todayCalls.push(['lead',action,payload]);if(action==='task_complete')task.completedAt=new Date().toISOString();if(action==='attendance')state.lead.team[0].status=payload.status;publish(ready());},async signOut(){publish({phase:'anonymous'});}
    };
  }};
};
