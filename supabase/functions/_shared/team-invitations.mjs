import {renderInvitation} from './team-invitation-email.mjs';
export const TEST_URL='https://hxtztkmbfpmzrieccwsg.supabase.co';
const TOKEN=/^[A-Za-z0-9_-]{43}$/,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const origins=new Set(['https://localhost','https://revetementsmir.github.io']);
class Failure extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}
const deny=(code,status)=>{throw new Failure(code,status);};
const messages={INVITATION_DENIED:'Ce lien ne permet pas cette activation. Vérifiez le courriel ou demandez un nouveau lien.',ACCOUNT_EXISTS:'Un compte MIR existe déjà. Connectez-vous avec votre mot de passe ou Google, puis activez votre invitation.',BUSY:'Cette activation est déjà en cours. Attendez avant de réessayer.',AUTH_UNCERTAIN:'L’activation reste à confirmer. Essayez votre connexion avant de recommencer.',SERVICE_DISABLED:'Ce service MIR TEST attend sa configuration.',INPUT:'Vérifiez les informations saisies.',ACCESS_DENIED:'Votre accès ne permet pas cette action.'};
// No SMTP/HTTP email provider is installed here. A local transport can be injected
// for tests; its acknowledgement is explicitly simulated, never persisted as sent.
export function createTeamInvitationService({env,fetchImpl=fetch,transport=null}){
 const get=k=>typeof env?.get==='function'?env.get(k):env?.[k];
 const base=String(get('SUPABASE_URL')||'').replace(/\/$/,'');
 const service=get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(get('SUPABASE_SECRET_KEYS')||'{}').default;
 const publishable=get('SUPABASE_ANON_KEY')||JSON.parse(get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default;
 async function remote(path,{privileged=false,bearer,body,method='POST'}={}){
  if(base!==TEST_URL||!service||!publishable)deny('SERVICE_DISABLED',503);
  const response=await fetchImpl(base+path,{method,headers:{apikey:privileged?service:publishable,authorization:'Bearer '+(privileged?service:bearer||publishable),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(15000)});
  let data;try{data=await response.json();}catch{deny('AUTH_UNCERTAIN',503);}
  if(!response.ok){const detail=data?.details||data?.detail;if(detail==='TEAM_ACCOUNT_EXISTS')deny('ACCOUNT_EXISTS',409);if(detail==='TEAM_BUSY')deny('BUSY',409);deny(path.includes('/admin/')?'AUTH_UNCERTAIN':'INVITATION_DENIED',response.status===429?429:403);}
  return data;
 }
 const rpc=(name,body,options={})=>remote('/rest/v1/rpc/'+name,{body,...options});
 async function activate(body){
  if(get('MIR_TEAM_ENROLLMENT_ENABLED')!=='true')deny('SERVICE_DISABLED',503);
  if(!TOKEN.test(body.token||'')||!UUID.test(body.requestId||'')||typeof body.email!=='string'||body.email.length>254||typeof body.password!=='string'||body.password.length<12||body.password.length>256)deny('INPUT');
  const email=body.email.trim().toLowerCase();
  const hmacKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(service),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const passwordTag=[...new Uint8Array(await crypto.subtle.sign('HMAC',hmacKey,new TextEncoder().encode(email+'\n'+body.password)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const claim=await rpc('mir_team_enrollment',{p_action:'claim',p_token:body.token,p_email:email,p_request_id:body.requestId,p_user_id:null,p_password_tag:passwordTag},{privileged:true});
  if(claim.existingAccount)deny('ACCOUNT_EXISTS',409);
  if(!UUID.test(claim.invitationId||'')||claim.email!==email)deny('INVITATION_DENIED',403);
  let userId=claim.userId;
  if(!userId){
   // Only CREATE. Never update/reset an existing identity or trust role metadata.
   const created=await remote('/auth/v1/admin/users',{privileged:true,body:{email,password:body.password,email_confirm:false,app_metadata:{mir_team_invitation:claim.invitationId}}});
   userId=created.id;if(!UUID.test(userId||'')||created.email?.toLowerCase()!==email)deny('AUTH_UNCERTAIN',503);
  }
  const owned=await rpc('mir_team_enrollment',{p_action:'bind',p_token:body.token,p_email:email,p_request_id:body.requestId,p_user_id:userId,p_password_tag:passwordTag},{privileged:true});
  if(owned.existingAccount)deny('ACCOUNT_EXISTS',409);
  // generate_link does not send email. The personal invitation is the mailbox
  // capability; only its exact newly created, unconfirmed identity is eligible.
  const link=await remote('/auth/v1/admin/generate_link',{privileged:true,body:{type:'invite',email}});
  if(!link.hashed_token||link.verification_type!=='invite'||link.id&&link.id!==userId)deny('AUTH_UNCERTAIN',503);
  const session=await remote('/auth/v1/verify',{body:{type:'invite',token_hash:link.hashed_token}});
  if(!session.access_token||!session.refresh_token)deny('AUTH_UNCERTAIN',503);
  const user=await remote('/auth/v1/user',{method:'GET',bearer:session.access_token});
  if(user.id!==userId||user.email?.toLowerCase()!==email||!user.email_confirmed_at)deny('INVITATION_DENIED',403);
  const accepted=await rpc('mir_team_accept_invitation',{p_token:body.token},{bearer:session.access_token});
  if(accepted?.ok!==true)deny('INVITATION_DENIED',403);
  return {ok:true,activated:true,session:{access_token:session.access_token,refresh_token:session.refresh_token,expires_in:session.expires_in,token_type:'bearer'}};
 }
 async function preview(body,bearer){
  if(!TOKEN.test(body.token||''))deny('INPUT');
  const details=await rpc('mir_team_invitation_preview',{p_token:body.token},{bearer});
  if(!details?.email||!details?.expiresAt)deny('ACCESS_DENIED',403);
  const activationUrl='https://revetementsmir.github.io/Revetements-mir-/test/chantier.html?invitation='+encodeURIComponent(body.token);
  const message=renderInvitation({name:details.name,organization:'Les Revêtements MIR',manager:'Votre responsable MIR',expiresAt:details.expiresAt,activationUrl,helpEmail:get('MIR_TEAM_HELP_EMAIL')});
  const envelope={to:details.email,...message};
  if(body.action==='simulate'){
   if(get('MIR_TEAM_TRANSPORT')!=='simulation'||!transport)deny('SERVICE_DISABLED',503);
   const result=await transport(envelope);
   if(result?.simulated!==true||typeof result.receipt!=='string'||!result.receipt)deny('AUTH_UNCERTAIN',503);
   return {ok:true,deliveryStatus:'pending',simulated:true,receipt:result.receipt,emailSent:false};
  }
  return {ok:true,deliveryStatus:'pending',emailSent:false,envelope};
 }
 return async request=>{
  const origin=request.headers.get('origin');
  const headers={'content-type':'application/json','cache-control':'no-store','referrer-policy':'no-referrer',...(origins.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-headers':'authorization,apikey,content-type,x-client-info','access-control-allow-methods':'POST,OPTIONS'}:{})};
  const answer=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  try{
   if(base!==TEST_URL)deny('SERVICE_DISABLED',503);
   if(origin&&!origins.has(origin))deny('ACCESS_DENIED',403);
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(request.method!=='POST')deny('INPUT',405);
   const reader=request.body?.getReader();let bytes=0,text='';const decoder=new TextDecoder();if(!reader)deny('INPUT');
   try{for(;;){const r=await reader.read();if(r.done)break;bytes+=r.value.length;if(bytes>4096){await reader.cancel();deny('INPUT',413);}text+=decoder.decode(r.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
   let body;try{body=JSON.parse(text);}catch{deny('INPUT');}
   if(!body||Array.isArray(body)||!['activate','preview','simulate'].includes(body.action))deny('INPUT');
   const fields=body.action==='activate'?['action','token','email','password','requestId']:['action','token'];if(Object.keys(body).some(k=>!fields.includes(k)))deny('INPUT');
   if(body.action==='activate')return answer(await activate(body));
   const bearer=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!bearer)deny('ACCESS_DENIED',401);
   await remote('/auth/v1/user',{method:'GET',bearer});
   return answer(await preview(body,bearer));
  }catch(error){const known=error instanceof Failure;return answer({ok:false,error:{code:known?error.code:'AUTH_UNCERTAIN',message:messages[known?error.code:'AUTH_UNCERTAIN']||messages.INVITATION_DENIED}},known?error.status:503);}
 };
}
