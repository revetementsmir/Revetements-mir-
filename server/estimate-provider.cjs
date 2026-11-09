'use strict';
/* Resend is an optional configured transport, never a browser dependency.
 * Its idempotency retention is 24 hours; the service stops automatic retries
 * at 23 hours instead of assuming an unbounded guarantee. */
function createResendProvider({apiKey,endpoint='https://api.resend.com/emails',fetchImpl=fetch,allowTestEndpoint=false}){
 const url=new URL(endpoint);
 if(url.protocol!=='https:'&&!(allowTestEndpoint&&url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw Error('HTTPS requis pour le prestataire courriel');
 if(!apiKey)throw Error('RESEND_API_KEY requis');
 return {supportsIdempotency:true,async send(message){
  const response=await fetchImpl(url,{method:'POST',headers:{authorization:'Bearer '+apiKey,'content-type':'application/json','idempotency-key':message.idempotencyKey},body:JSON.stringify({from:message.from,to:[message.to],subject:message.subject,text:message.text,attachments:message.attachments.map(a=>({filename:a.filename,content:Buffer.from(a.content).toString('base64'),content_type:a.contentType}))}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('EMAIL_PROVIDER_REJECTED');
  const data=await response.json();if(typeof data.id!=='string'||!data.id.trim())throw Error('EMAIL_PROVIDER_RECEIPT_MISSING');
  return {accepted:true,messageId:data.id};
 }};
}
function createSupabaseStaffAuthenticator({url,publishableKey,organizationId,fetchImpl=fetch}){
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url||'')||!publishableKey||!organizationId)throw Error('Configuration de vérification équipe requise');
 return async token=>{
  const headers={apikey:publishableKey,authorization:'Bearer '+token};
  const userResponse=await fetchImpl(url+'/auth/v1/user',{headers,signal:AbortSignal.timeout(10000)});
  if(!userResponse.ok)return null;const user=await userResponse.json();if(typeof user.id!=='string')return null;
  const response=await fetchImpl(url+'/rest/v1/rpc/mir_account_snapshot',{method:'POST',headers:{...headers,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return null;const account=await response.json();
  if(account?.userId!==user.id||account.organizationId!==organizationId||!['admin','employee'].includes(account.role))return null;
  return {id:user.id,role:account.role,organizationId:account.organizationId};
 };
}
module.exports={createResendProvider,createSupabaseStaffAuthenticator};
