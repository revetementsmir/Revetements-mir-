'use strict';
module.exports=function(){window.MIRTeamTestConfig={...window.MIRTeamTestConfig,fieldExperienceEnabled:true};
window.MIRPortalClient={...window.MIRPortalClient,create(){
 const chef=location.search.includes('chef=1'),id=chef?'qa-chef':'qa-employee',model=window.MIREmployeeStore;
 const jobs=[{id:'00000000-0000-4000-8000-000000000353',number:'353',name:'Résidence des Érables',address:'141, rue du Chantier, Québec',city:'Québec',assignedMemberIds:[id]},{id:'00000000-0000-4000-8000-000000000454',number:'454',name:'Pavillon du Parc',address:'20, rue Exemple, Lévis',city:'Lévis',assignedMemberIds:[id]}];
 const state={...model.createDemoState([]),mode:'connected',demo:false,actorId:id,members:[{id,name:chef?'Camille Fortin':'Alex Martin',role:'employee',active:true}],jobs,planVersions:[],orders:[],messaging:{contacts:[{id:'assistant',name:'Esther Exemple',role:'assistant'}],teams:[],conversations:[],messages:[],unreadCount:0},operations:{role:chef?'chef_equipe':'employe',notifications:[]},notifications:{items:[],unreadCount:0},punch:{enabled:true,settings:{},activeShift:null,week:[],bankRequests:[],bankHistory:[],bankBalance:0},absences:{role:chef?'chef_equipe':'employe_chantier',requests:[]},expenses:{role:chef?'chef_equipe':'employe_chantier',categories:[{code:'materials',label:'Matériaux'}],expenses:[]}};
 if(chef)state.lead={assignment:{jobId:jobs[0].id},team:[{id:'worker',name:'Alex Martin',status:'unconfirmed'}],tasks:[{id:'task',title:'Poser les moulures',completedAt:null}],reports:[],activity:[]};
 let publish=()=>{};const calls=[],activities=[],ready=()=>({phase:'ready',snapshot:state,user:{id,email:'qa@example.invalid'}});window.__fieldFixture={state,calls,activities,publish:()=>publish(ready())};
 return{config:{projectRef:'fixture-only',fieldExperienceEnabled:true},getStatus:ready,subscribe(fn){publish=fn;},async start(){publish(ready());},async refresh(){publish(ready());},async signOut(){publish({phase:'anonymous'});},
 async jobDossier(jobId){calls.push(['dossier',jobId]);return{job:jobs.find(j=>j.id===jobId),documents:[],tasks:state.lead?.tasks||[],reports:[],extras:[],orders:[],activity:activities.filter(a=>a.job_id===jobId)};},
 async fieldAction(jobId,kind,payload,requestId){calls.push(['field',jobId,kind,payload,requestId]);if(window.__fieldFixture.fail)throw Error('Serveur indisponible. Réessayez.');const item={id:requestId,job_id:jobId,activity_type:kind,created_at:new Date().toISOString(),payload:{...payload,status:'open'}};activities.push(item);return{ok:true,id:requestId,jobId,status:'open'};},
 async uploadInternal(file,scope,jobId){calls.push(['upload',scope,jobId]);return 'fixture/'+scope+'/'+jobId+'/qa/photo.jpg';},
 async punchAction(action,jobId){calls.push(['punch',action,jobId]);state.punch.activeShift=action==='in'?{started_at:new Date().toISOString(),segment:{job_id:jobId,segment_type:'job'}}:null;publish(ready());return{serverAt:new Date().toISOString()};},
 async leadAction(action,payload){calls.push(['lead',action,payload]);publish(ready());return{ok:true,id:crypto.randomUUID()};},
 async openConversation(kind,target){calls.push(['conversation',kind,target]);const cid=crypto.randomUUID();state.messaging.conversations.push({id:cid,kind,participants:[id,target]});return cid;},async chatMessages(){return{items:[],hasMore:false};},
 async harmonySettings(){return{theme:'light',textSize:'standard',reducedMotion:'auto',highContrast:false,notifications:{},applicable:[]};},
 async submitOrder(payload){calls.push(['order',payload]);if(window.__fieldFixture.orderWait)await window.__fieldFixture.orderWait;if(window.__fieldFixture.fail)throw Error('Commande non confirmée');const orderId=crypto.randomUUID(),receiptId=crypto.randomUUID();return{orderId,receiptId,status:'submitted'};},
 async setOrderShortcut(){return{};},async command(command,payload){calls.push(['command',command,payload]);return{ok:true,result:{id:crypto.randomUUID()},snapshot:state};}
 };
}};
};
