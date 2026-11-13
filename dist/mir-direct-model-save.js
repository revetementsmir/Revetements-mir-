/* Optional direct save from the existing drawing editor. Local data stays intact. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root){
 let client=null,loading=null,busy=false,lastRecord=null;
 function panel(){let p=root.document.getElementById('mir-direct-model-save');if(!p){p=root.document.createElement('section');p.id='mir-direct-model-save';p.className='shared-model-save';p.setAttribute('aria-live','polite');root.document.getElementById('production-library')?.prepend(p);}return p;}
 function message(text,error=false){const p=panel();p.replaceChildren();p.setAttribute('role',error?'alert':'status');const line=root.document.createElement('p');line.textContent=text;p.append(line);return p;}
 async function sdk(){if(root.MIRSupabase?.createClient)return root.MIRSupabase;if(!loading)loading=new Promise((resolve,reject)=>{const s=root.document.createElement('script');s.src='vendor/supabase-client.js';s.onload=()=>root.MIRSupabase?.createClient?resolve(root.MIRSupabase):reject(Error('Module de connexion indisponible'));s.onerror=()=>{loading=null;reject(Error('Module de connexion non chargé'));};root.document.head.append(s);});return loading;}
 root.MIRDirectModelSave={available:root.MIRSharedConfig?.enabled===true,
 async save(record){if(busy)return;busy=true;lastRecord=JSON.parse(JSON.stringify(record));message('Copie locale enregistrée. Enregistrement du brouillon partagé…');try{
  const config=root.MIRSharedConfig;if(!config?.enabled||!/^sb_publishable_/.test(config.publishableKey||''))throw Error('Catalogue partagé non activé');
  if(!client){const lib=await sdk();client=root.MIRSharedClient.create({sdk:lib.createClient(config.supabaseUrl,config.publishableKey),storage:root.localStorage});}
  const result=await api.save({client,record:lastRecord,validator:root.MIRTemplateBackup});
  const p=message('Modèle enregistré dans le catalogue partagé. Vérifiez les tarifs et destinations avant publication.');const a=root.document.createElement('a');a.href='espace-partage.html?model='+encodeURIComponent(result.id);a.className='primary-button';a.textContent='Ouvrir ce modèle partagé';p.append(a);p.scrollIntoView({block:'nearest'});
 }catch(e){const p=message('Partage non confirmé : '+e.message+'. La copie locale reste conservée.',true);const login=root.document.createElement('a');login.href='espace-partage.html';login.target='_blank';login.rel='noopener';login.textContent='Se connecter au compte Admin';p.append(login);const retry=root.document.createElement('button');retry.type='button';retry.textContent='Réessayer le partage';retry.onclick=()=>root.MIRDirectModelSave.save(lastRecord);p.append(retry);p.scrollIntoView({block:'nearest'});}finally{busy=false;}}
 };
}})(typeof window==='object'?window:null,function(){
 'use strict';
 async function save({client,record,validator}){
  const checked=validator?.validate([record]);if(!checked?.ok)throw Error(checked?.error||'Modèle invalide');
  if(record.versions.some(t=>t.kind!=='profile'))throw Error('Le partage direct est réservé aux moulures');
  const memberships=await client.memberships(),admins=memberships.filter(m=>m.role==='admin');
  if(admins.length!==1)throw Error(admins.length?'Choisissez votre organisation dans l’espace partagé':'Connexion Admin MIR requise');
  const org=admins[0].id,snapshot=await client.snapshot(org);if(snapshot.role!=='admin')throw Error('Accès Admin requis');
  const existing=snapshot.catalogue.find(m=>(m.specification.template||m.specification).id===record.id);
  const local=record.versions.find(t=>t.version===record.currentVersion);
  if(existing){const remote=existing.specification.template||existing.specification;
   if(existing.version!==record.currentVersion||remote.fingerprint!==local.fingerprint)throw Error('Ce modèle a une autre version partagée : validez sa révision dans l’espace partagé');
   return {id:existing.id,alreadySaved:true};
  }
  const id=await client.importMaster(org,record);return {id,alreadySaved:false};
 }
 return {save};
});
