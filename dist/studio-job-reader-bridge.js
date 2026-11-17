/* Additive TEST-only document reader. The canonical portal/Auth/Punch bytes stay intact. */
(function(root){'use strict';
 const config=root.MIRPortalConfig,TEST='hxtztkmbfpmzrieccwsg';
 if(config?.environment!=='test'||config.projectRef!==TEST||config.supabaseUrl!==`https://${TEST}.supabase.co`)return;
 const portal=root.MIRPortalClient,indexByPath=new Map();if(!portal)return;
 root.MIRPortalClient=Object.freeze({...portal,create(options){
  const factory=options.sdk;let client,epoch=0;
  const sdk={...factory,createClient(...args){const canonical=factory.createClient(...args);return new Proxy(canonical,{get(target,key){
   if(key!=='rpc'){const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}
   return async(name,args)=>{const generation=epoch,user=client?.getStatus().user?.id,result=await target.rpc(name,args);
    if(name!=='mir_job_dossier_snapshot'||result.error||!(result.data?.documents||[]).some(d=>String(d.name||'').startsWith('MIR · ')))return result;
    const index=await target.rpc('mir_studio_site_document_index',{org:args.org,job:args.job});
    if(generation!==epoch||client?.getStatus().user?.id!==user)return {data:null,error:{code:'SESSION_CHANGED',message:'La session a changé. Rechargez le dossier autorisé.'}};
    if(index.error){if(index.error.code==='PGRST202')return result;return {data:null,error:index.error};}
    if(!Array.isArray(index.data))return {data:null,error:{code:'RESPONSE_UNCERTAIN',message:'Les versions chantier restent à vérifier.'}};
    for(const document of result.data.documents){const item=index.data.find(x=>x.documentId===document.id);if(item)indexByPath.set(document.object_path,item);}
    return result;
   };
  }});}};
  client=portal.create({...options,sdk});let identity='';client.subscribe(status=>{const next=[status.phase,status.user?.id,status.account?.organizationId].join(':');if(identity!==next){epoch++;indexByPath.clear();identity=next;}});return client;
 }});
 document.addEventListener('click',async event=>{const button=event.target.closest('[data-job-document]');if(!button||!root.MIRPrivateDocumentViewer)return;event.preventDefault();event.stopImmediatePropagation();button.disabled=true;
  try{const client=root.MIRPortalActiveClient,state=client?.getStatus();if(state?.phase!=='ready'||!state.user?.id)throw Error('Rechargez votre accès au chantier.');const url=await client.jobDocumentURL(button.dataset.jobDocument),current=client.getStatus();if(current.phase!=='ready'||current.user?.id!==state.user.id)throw Error('La session a changé.');await root.MIRPrivateDocumentViewer.open({url,name:button.closest('article')?.querySelector('h2')?.textContent||'Document chantier'});}
  catch(error){const toast=document.querySelector('#portal-toast');if(toast)toast.textContent=error.message;}finally{button.disabled=false;}
 },true);
 const observer=new MutationObserver(()=>{for(const button of document.querySelectorAll('[data-job-document]')){const article=button.closest('article'),item=indexByPath.get(button.dataset.jobDocument);if(!article||!item||article.querySelector('[data-studio-document-version]'))continue;const label=document.createElement('small');label.dataset.studioDocumentVersion='';label.textContent=(item.current?'Version courante':'Historique')+' · 5 pages · '+(item.status==='validated'?'Vérifié':'Brouillon avec réserves');button.before(label);}});observer.observe(document.body,{childList:true,subtree:true});
})(window);
