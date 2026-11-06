(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRSharedClient=api;})(typeof window==='object'?window:null,function(){
'use strict';
function create({sdk,storage}){
 let identity=null,generation=0;
 async function rpc(name,args){const epoch=generation;const {data,error}=await sdk.rpc(name,args);if(epoch!==generation)throw Error('Session modifiée');if(error)throw error;return data;}
 async function verify(){const epoch=generation;const {data,error}=await sdk.auth.getUser();if(epoch!==generation)throw Error('Session modifiée');if(error||!data?.user?.id)throw Error('Connexion requise');identity=data.user.id;return identity;}
 return {
 async login(email,password){generation++;const {error}=await sdk.auth.signInWithPassword({email,password});if(error)throw error;await verify();return rpc('mir_my_memberships',{});},
 async memberships(){await verify();return rpc('mir_my_memberships',{});},
 async snapshot(org){await verify();return rpc('mir_shared_snapshot',{org});},
 async submit(org,model,configuration){
  await verify();const key='mir_shared_pending_'+identity+'_'+org,signature=JSON.stringify({model:model.id,revision:model.revision,configuration});
  let pending=JSON.parse(storage.getItem(key)||'null');
  if(pending&&pending.signature!==signature)throw Error('Une demande attend confirmation. Reprenez-la avant de changer son contenu.');
  if(!pending){pending={signature,requestId:globalThis.crypto.randomUUID(),model,configuration};storage.setItem(key,JSON.stringify(pending));}
  const id=await rpc('mir_submit_request',{org,request_id:pending.requestId,model:model.id,publication_revision:model.revision,configuration});
  storage.removeItem(key);return id;
 },
 async pending(org){await verify();return JSON.parse(storage.getItem('mir_shared_pending_'+identity+'_'+org)||'null');},
 async assignJob(org,job_name,employee){await verify();return rpc('mir_assign_job',{org,job_name,employee});},
 async importMaster(org,record){await verify();return rpc('mir_import_master',{org,record});},
 async addVersion(org,model,template){await verify();return rpc('mir_add_master_version',{org,model:model.id,expected_revision:model.revision,template});},
 async publish(org,model,settings){await verify();return rpc('mir_admin_publish_model',{org,model:model.id,expected_revision:model.revision,settings});},
 async logout(){generation++;identity=null;const {error}=await sdk.auth.signOut({scope:'local'});if(error)throw error;}
 };
}
function readModelBackup(content,validator){
 if(typeof content!=='string'||new TextEncoder().encode(content).length>3*1024*1024)throw Error('Sauvegarde trop volumineuse (maximum 3 Mo)');
 const backup=JSON.parse(content);
 if(!backup||!(backup.schema==='mir-template-library-backup-1'||(!backup.schema&&backup.version===1))||!Array.isArray(backup.records))throw Error('Sauvegarde de modèles MIR requise');
 if(!validator?.validate)throw Error('Contrôle des modèles indisponible');
 const checked=validator.validate(backup.records);if(!checked.ok)throw Error(checked.error);
 // Validation does not rewrite the source: metadata and existing tariffs survive.
 return backup.records;
}
return {create,readModelBackup};
});
