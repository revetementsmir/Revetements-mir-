/* Explicit MIR TEST bridge to the existing private job document bucket and versions. */
(function(root){'use strict';const TEST='hxtztkmbfpmzrieccwsg';let loading,client,pending=null,phase='idle';
 function guard(){const c=root.MIRPortalConfig;if(c?.environment!=='test'||c?.projectRef!==TEST||c?.supabaseUrl!==`https://${TEST}.supabase.co`)throw Error('Le rattachement attend MIR TEST. Aucun repli vers la production.');return c;}
 async function sdk(){const c=guard();if(!root.MIRSupabase){if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='vendor/supabase-client.js';s.onload=resolve;s.onerror=()=>{loading=null;reject(Error('Connexion indisponible.'));};document.head.append(s);});await loading;}
  return client||=(root.MIRSupabase.createClient(c.supabaseUrl,c.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:false,storageKey:'mir_portal_auth_'+TEST}}));}
 async function context(){phase='session';const c=await sdk(),session=await c.auth.getSession();phase='account';if(!session.data?.session?.user?.id)throw Error('Connectez-vous à l’espace chantier TEST avec votre compte équipe, puis revenez ici.');const {data,error}=await c.rpc('mir_account_snapshot');if(error)throw error;return {client:c,organizationId:data.organizationId,userId:session.data.session.user.id};}
 async function rpc(ctx,name,args){const r=await ctx.client.rpc(name,args);if(r.error)throw r.error;return r.data;}
 async function jobs(){const ctx=await context();return rpc(ctx,'mir_studio_site_jobs',{org:ctx.organizationId});}
 async function history(jobId,projectId,buildingId){const ctx=await context();return rpc(ctx,'mir_studio_site_history',{org:ctx.organizationId,job:jobId,project:projectId,building:buildingId});}
 const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
 async function attach({jobId,snapshot,pdf,familyId,expectedVersion=0}){
  if(pdf.pages!==5||pdf.blob?.type!=='application/pdf'||pdf.blob.size>20*1024*1024)throw Error('Le PDF chantier doit avoir cinq pages et moins de 20 Mo.');
  phase='prepare';const ctx=await context(),digest=await hash(pdf.blob),signature=JSON.stringify([ctx.userId,ctx.organizationId,jobId,snapshot,digest,familyId,expectedVersion]);
  if(pending&&pending.signature!==signature)throw Error('Un rattachement reste à vérifier. Réessayez le même dossier avant de changer de révision.');
  if(!pending){const family=familyId||crypto.randomUUID();pending={signature,family,path:[ctx.organizationId,jobId,family,crypto.randomUUID()+'.pdf'].join('/'),uploaded:false};}
  if(!pending.uploaded){phase='upload';const upload=await ctx.client.storage.from('mir-job-documents').upload(pending.path,pdf.blob,{contentType:'application/pdf',upsert:false});if(upload.error)throw upload.error;pending.uploaded=true;}
  phase='session-check';const now=await context();if(now.userId!==ctx.userId||now.organizationId!==ctx.organizationId)throw Error('La session a changé. Le dossier reste à vérifier.');
  phase='commit';const saved=await rpc(ctx,'mir_studio_site_commit',{org:ctx.organizationId,job:jobId,family:pending.family,path:pending.path,name:'MIR · '+snapshot.projectName+' · '+snapshot.buildingName+' · R'+snapshot.revision,expected_version:expectedVersion,site_snapshot:snapshot,pdf_sha256:digest});
  phase='readback';const reread=await history(jobId,snapshot.projectId,snapshot.buildingId),record=reread.find(x=>x.documentId===saved.documentId);
  if(!saved.ok||saved.jobId!==jobId||!record||record.pdfSha256!==digest||record.pageCount!==5||record.version!==snapshot.revision)throw Error('La confirmation serveur du rattachement manque. Réessayez ce dossier.');
  pending=null;phase='confirmed';return {...saved,verified:true,history:reread};
 }
 root.MIRStudioJobDocuments=Object.freeze({jobs,history,attach,hash,guard,diagnostics:()=>({phase,pending:!!pending,uploaded:pending?.uploaded===true})});
})(window);
