'use strict';
const presentation=require('../dist/mir-estimate-presentation.js');
/* One endpoint for the four public estimate entries. Same guarantees as
 * supplier-send: immutable source bytes, durable receipt and provider idempotency.
 * A queued/stored record is never reported as received before email acceptance. */
const fs=require('node:fs/promises'),path=require('node:path');
const {createHash,createHmac,randomUUID}=require('node:crypto');
const {LIMITS,UUID,canonical,EstimateError,error,payloadOf,text}=require('../supabase/functions/_shared/estimate-contract.mjs');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function boundedBody(request,max){
 const declared=request.headers.get('content-length');if(declared&&Number(declared)>max)throw error('REQUEST_SIZE','La demande et ses fichiers dépassent la taille permise.',413);
 const reader=request.body?.getReader();if(!reader)return Buffer.alloc(0);let total=0;const parts=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw error('REQUEST_SIZE','La demande et ses fichiers dépassent la taille permise.',413);}parts.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return Buffer.concat(parts,total);
}
async function parseSubmission(request,limits){
 const contentType=request.headers.get('content-type')||'';if(!/^multipart\/form-data;\s*boundary=/i.test(contentType))throw error('CONTENT_TYPE','Utilisez le formulaire du site pour transmettre la demande.');
 const bytes=await boundedBody(request,limits.maxTotalFileBytes+limits.maxPayloadBytes+1024*1024);
 let form;try{form=await new Request('http://local/',{method:'POST',headers:{'content-type':contentType},body:bytes}).formData();}catch{throw error('FORM','Le formulaire transmis est incomplet. Réessayez.');}
 if(form.getAll('requestId').length!==1||form.getAll('payload').length!==1)throw error('FORM','La demande doit contenir un identifiant et un seul résumé.');
 const id=String(form.get('requestId')||'').toLowerCase();if(!UUID.test(id))throw error('REQUEST_ID','L’identifiant du brouillon est invalide.');
 const payload=payloadOf(form.get('payload'),limits.maxPayloadBytes),files=[];let total=0;
 for(const [field,file]of form.entries()){
  if(['requestId','payload'].includes(field))continue;
  if(!['plans','dossier'].includes(field)||typeof file==='string'||typeof file.arrayBuffer!=='function')throw error('FILE_FIELD','Une pièce jointe n’est pas reconnue.');
  if(files.length>=limits.maxFiles)throw error('FILE_COUNT','Un maximum de '+limits.maxFiles+' PDF est permis.',413);
  const filename=text(file.name,180,true).replace(/[\\/]/g,'-');
  if(!/\.pdf$/i.test(filename)||file.type!=='application/pdf')throw error('FILE_TYPE','Le fichier « '+filename+' » doit être un PDF.',415);
  if(file.size<=0||file.size>limits.maxFileBytes)throw error('FILE_SIZE','Le fichier « '+filename+' » dépasse la limite de '+Math.floor(limits.maxFileBytes/1024/1024)+' Mo ou est vide.',413);
  total+=file.size;if(total>limits.maxTotalFileBytes)throw error('FILES_SIZE','L’ensemble des PDF dépasse '+Math.floor(limits.maxTotalFileBytes/1024/1024)+' Mo.',413);
  const content=Buffer.from(await file.arrayBuffer());
  if(content.subarray(0,5).toString()!=='%PDF-'||!content.subarray(Math.max(0,content.length-4096)).includes(Buffer.from('%%EOF')))throw error('PDF_INVALID','Le fichier « '+filename+' » n’est pas un PDF complet.',415);
  files.push({id:String(files.length+1),field,filename,bytes:content.length,sha256:hash(content),content});
 }
 const dossiers=files.filter(f=>f.field==='dossier');
 if(dossiers.length>1||(['cart','bending'].includes(payload.source)&&dossiers.length!==1))throw error('DOSSIER_PDF','Joignez le PDF du dossier avant l’envoi.');
 const contentHash=hash(canonical({payload,files:files.map(({id,field,filename,bytes,sha256})=>({id,field,filename,bytes,sha256}))}));
 return {id,payload,files,contentHash};
}
async function atomicJSON(file,value){const tmp=file+'.'+randomUUID()+'.tmp';await fs.writeFile(tmp,JSON.stringify(value),{mode:0o600});const fd=await fs.open(tmp,'r');try{await fd.sync();}finally{await fd.close();}await fs.rename(tmp,file);const dir=await fs.open(path.dirname(file),'r');try{await dir.sync();}finally{await dir.close();}}
function createFileRepository(root,{now=()=>Date.now()}={}){
 if(!path.isAbsolute(root||''))throw Error('Un volume privé absolu est requis');
 const requests=path.join(root,'requests'),locks=path.join(root,'locks');
 const safe=id=>{if(!UUID.test(id))throw error('NOT_FOUND','Demande introuvable.',404);return path.join(requests,id.toLowerCase());};
 return {
  async init(){await fs.mkdir(requests,{recursive:true,mode:0o700});await fs.mkdir(locks,{recursive:true,mode:0o700});},
  async lock(id,fn){safe(id);const lock=path.join(locks,id),owner=randomUUID();
   try{await fs.mkdir(lock,{mode:0o700});}catch(e){
    if(e.code!=='EEXIST')throw e;
    const stat=await fs.stat(lock).catch(()=>null);
    if(stat&&now()-stat.mtimeMs>5*60*1000){
     const expired=lock+'.expired-'+owner;
     try{await fs.rename(lock,expired);await fs.rm(expired,{recursive:true,force:true});await fs.mkdir(lock,{mode:0o700});}catch{throw error('BUSY','Cette demande est déjà en cours. Réessayez avec le même brouillon.',409,true);}
    }else throw error('BUSY','Cette demande est déjà en cours. Réessayez avec le même brouillon.',409,true);
   }
   await fs.writeFile(path.join(lock,'owner'),owner,{mode:0o600});
   const heartbeat=setInterval(async()=>{try{if(await fs.readFile(path.join(lock,'owner'),'utf8')===owner){const time=new Date(now());await fs.utimes(lock,time,time);}}catch{}},30000);heartbeat.unref();
   try{return await fn();}finally{clearInterval(heartbeat);if(await fs.readFile(path.join(lock,'owner'),'utf8').catch(()=>null)===owner)await fs.rm(lock,{recursive:true,force:true});}
  },
  async get(id){try{return {record:JSON.parse(await fs.readFile(path.join(safe(id),'submission.json'),'utf8')),status:JSON.parse(await fs.readFile(path.join(safe(id),'status.json'),'utf8'))};}catch(e){if(e.code==='ENOENT')return null;throw e;}},
  async create(input,notification){const finalDir=safe(input.id),dir=path.join(root,'staging',input.id+'-'+randomUUID());await fs.mkdir(dir,{recursive:true,mode:0o700});const files=[];for(const file of input.files){const target=path.join(dir,'file-'+file.id+'.pdf');await fs.writeFile(target,file.content,{flag:'wx',mode:0o600});const fd=await fs.open(target,'r');try{await fd.sync();}finally{await fd.close();}files.push({id:file.id,field:file.field,filename:file.filename,bytes:file.bytes,sha256:file.sha256});}const record={id:input.id,requestNumber:'MIR-'+new Date(now()).toISOString().slice(0,10).replaceAll('-','')+'-'+input.id.replaceAll('-','').toUpperCase(),createdAt:new Date(now()).toISOString(),contentHash:input.contentHash,payload:input.payload,files,notification};await atomicJSON(path.join(dir,'submission.json'),record);await atomicJSON(path.join(dir,'status.json'),{state:'stored'});await fs.rename(dir,finalDir);const parent=await fs.open(requests,'r');try{await parent.sync();}finally{await parent.close();}return record;},
  async status(id,status){await atomicJSON(path.join(safe(id),'status.json'),status);},
  async file(id,fileId){if(!/^[1-5]$/.test(fileId))throw error('NOT_FOUND','Fichier introuvable.',404);return fs.readFile(path.join(safe(id),'file-'+fileId+'.pdf'));},
  async rateLimit(client,secret,{max=8,windowMs=60000}={}){
   if(!client||!secret)return;
   const key=createHmac('sha256',secret).update(client).digest('hex'),dir=path.join(root,'rate');await fs.mkdir(dir,{recursive:true,mode:0o700});const file=path.join(dir,key+'.json'),lock=path.join(dir,key+'.lock');
   try{await fs.mkdir(lock,{mode:0o700});}catch(e){if(e.code==='EEXIST'){const stat=await fs.stat(lock).catch(()=>null);if(stat&&now()-stat.mtimeMs>60000)await fs.rm(lock,{recursive:true,force:true});throw error('RATE_LIMIT','Une autre tentative est en cours. Reprenez ce brouillon dans un instant.',429,true);}throw e;}
   try{let state;try{state=JSON.parse(await fs.readFile(file,'utf8'));}catch{state={count:0,start:now()};}if(now()-state.start>windowMs)state={count:0,start:now()};if(state.count>=max)throw error('RATE_LIMIT','Trop de tentatives. Attendez une minute puis reprenez ce brouillon.',429,true);state.count++;await atomicJSON(file,state);}finally{await fs.rmdir(lock);}
  }
 };
}
function createService({repository,provider,authenticateStaff,config,now=()=>Date.now()}){
 const limits={...LIMITS,...config.limits};
 const allowed=new Set(config.allowedOrigins||[]);
 const configured=()=>!!(config.enabled&&config.sender&&config.recipient&&config.privateBaseUrl&&provider?.supportsIdempotency===true&&authenticateStaff);
 const reply=(data,status=200,headers={})=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
 async function notification(record){const p=record.payload,link=record.notification.privateBaseUrl+'?id='+record.id;const attachments=[];if(['cart','bending'].includes(p.source))for(const f of record.files.filter(f=>f.field==='dossier')){const bytes=await repository.file(record.id,f.id);if(hash(bytes)!==f.sha256)throw error('STORAGE','Le PDF enregistré ne peut pas être vérifié.',503,true);attachments.push({filename:f.filename,contentType:'application/pdf',content:bytes});}return {idempotencyKey:'mir-estimate-'+record.id,from:record.notification.sender,to:record.notification.recipient,...presentation.notification({payload:p,requestNumber:record.requestNumber,privateURL:link}),attachments};}
 return async function handle(request,{clientAddress}={}){
  const origin=request.headers.get('origin'),cors=origin&&allowed.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-headers':'Content-Type, Authorization','access-control-allow-methods':'GET, POST, OPTIONS'}:{};
  if(origin&&!allowed.has(origin))return reply({error:'ORIGIN',message:'Ce site n’est pas autorisé à utiliser ce service.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  try{
   const route=new URL(request.url).pathname.replace(/\/$/,'');
   if(route==='/api/estimates/config'&&request.method==='GET')return reply({version:1,enabled:configured(),limits,recipient:config.recipient||'estimation@revetementsmir.com',missingConfiguration:configured()?[]:(config.missingConfiguration||['MIR_ESTIMATE_ENABLED','MIR_ESTIMATE_DATA_DIR','MIR_ESTIMATE_FROM','MIR_ESTIMATE_TO','MIR_ESTIMATE_PRIVATE_URL','RESEND_API_KEY','MIR_ESTIMATE_ORGANIZATION_ID','MIR_ESTIMATE_SUPABASE_URL','MIR_ESTIMATE_SUPABASE_PUBLIC_KEY','MIR_ESTIMATE_RATE_SECRET']),privacy:'Accès équipe authentifié. Les PDF et la 3D ne sont jamais publics.'},200,cors);
   if(route==='/api/estimates'&&request.method==='POST'){
    if(!configured())throw error('UNCONFIGURED','Le service d’estimation n’est pas encore raccordé. Votre brouillon est conservé.',503,true);
    await repository.rateLimit?.(clientAddress,config.rateSecret,{max:config.rateMax||8});
    const input=await parseSubmission(request,limits);
    return await repository.lock(input.id,async()=>{
     let current=await repository.get(input.id);
     if(current&&current.record.contentHash!==input.contentHash)throw error('IDEMPOTENCY_CONFLICT','Ce brouillon correspond déjà à un autre contenu. Créez une nouvelle demande.',409);
     const record=current?.record||await repository.create(input,{sender:config.sender,recipient:config.recipient,privateBaseUrl:config.privateBaseUrl});
     const receipt=()=>reply({ok:true,state:'received',id:record.id,requestNumber:record.requestNumber},current?200:201,cors);
     if(current?.status.state==='received')return receipt();
     const firstAttemptAt=current?.status.firstAttemptAt||now();
     if(now()-firstAttemptAt>=23*60*60*1000)throw error('RECONCILIATION_REQUIRED','La transmission précédente doit être vérifiée par MIR avant tout nouvel envoi. Votre dossier est conservé.',503,false);
     await repository.status(record.id,{state:'sending',firstAttemptAt,updatedAt:now()});
     try{const result=await provider.send(await notification(record));if(result?.accepted!==true||typeof result.messageId!=='string'||!result.messageId)throw Error('NO_RECEIPT');await repository.status(record.id,{state:'received',firstAttemptAt,acceptedAt:now(),messageId:result.messageId});return receipt();}
     catch{await repository.status(record.id,{state:'uncertain',firstAttemptAt,updatedAt:now()});throw error('SEND_FAILED','L’envoi n’a pas pu être confirmé. Votre dossier et votre brouillon sont conservés. Réessayez sans créer une nouvelle demande.',503,true);}
    });
   }
   const match=/^\/api\/estimates\/([a-f0-9-]+)(?:\/(studio|files)(?:\/([1-5]))?)?$/.exec(route);
   if(match&&request.method==='GET'){
    const token=/^Bearer (\S+)$/.exec(request.headers.get('authorization')||'')?.[1];if(!token)throw error('AUTH_REQUIRED','Connectez-vous avec votre compte équipe MIR.',401);
    const actor=await authenticateStaff(token);if(!actor?.id||!['admin','employee'].includes(actor.role)||actor.organizationId!==config.organizationId||(actor.role==='employee'&&!(config.staffUserIds||[]).includes(actor.id)))throw error('FORBIDDEN','Votre compte n’a pas accès aux demandes MIR.',403);
    const found=await repository.get(match[1]);if(!found)throw error('NOT_FOUND','Demande introuvable.',404);
    if(match[2]==='files'){const file=found.record.files.find(f=>f.id===match[3]);if(!file)throw error('NOT_FOUND','Fichier introuvable.',404);const bytes=await repository.file(match[1],file.id);if(hash(bytes)!==file.sha256)throw error('STORAGE','Le fichier ne peut pas être vérifié.',503);return new Response(bytes,{headers:{...cors,'content-type':'application/octet-stream','content-disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(file.filename),'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"sandbox; default-src 'none'"}});}
    if(match[2]==='studio'){if(!found.record.payload.studio)throw error('NOT_FOUND','Cette demande ne contient pas de Studio.',404);return reply({id:found.record.id,requestNumber:found.record.requestNumber,submittedAt:found.record.createdAt,studio:found.record.payload.studio},200,cors);}
    const {notification:privateConfig,...record}=found.record;return reply({...record,status:found.status.state},200,cors);
   }
   throw error('NOT_FOUND','Page introuvable.',404);
  }catch(e){return reply({ok:false,error:e instanceof EstimateError?e.code:'INTERNAL',message:e instanceof EstimateError?e.message:'Le service ne peut pas traiter la demande. Votre brouillon est conservé.',retryable:e instanceof EstimateError?e.retryable:true},e instanceof EstimateError?e.status:503,cors);}
 };
}
module.exports={LIMITS,EstimateError,parseSubmission,createFileRepository,createService,hash,canonical};
