const clone=v=>JSON.parse(JSON.stringify(v));
const norm=v=>String(v??'').trim();
const iso=v=>(v instanceof Date?v:new Date(v)).toISOString();
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}

export function createInvitationDraft({organizationId,email,role='employee',assignedChantiers=[],expiresAt,createdBy,serverAuthorized=false,now=new Date()}={}){
  if(!serverAuthorized) throw new Error('Autorisation serveur admin requise');
  const mail=norm(email).toLowerCase(); if(!validEmail(mail)) throw new Error('Courriel invalide');
  const expiry=iso(expiresAt); if(new Date(expiry)<=new Date(now)) throw new Error('Expiration doit être future');
  if(!['employee','admin'].includes(role)) throw new Error('Rôle invitation invalide');
  return {schemaVersion:1,id:`invite-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,organizationId:norm(organizationId),email:mail,role,assignedChantiers:[...new Set(assignedChantiers.map(String))],expiresAt:expiry,status:'pending',createdAt:iso(now),createdBy:norm(createdBy||'MIR admin'),usedAt:null,revokedAt:null,serverTokenRef:null,sendReceipt:null};
}

export function bindServerToken(invitation,{serverTokenRef}){
  if(invitation.status!=='pending') throw new Error('Invitation non active');
  const ref=norm(serverTokenRef); if(!ref) throw new Error('Référence jeton serveur requise');
  const next=clone(invitation);next.serverTokenRef=ref;return next;
}

export function validateInvitation(invitation,{email,organizationId,now=new Date()}={}){
  const reasons=[];
  if(invitation.status!=='pending') reasons.push(`status:${invitation.status}`);
  if(norm(email).toLowerCase()!==invitation.email) reasons.push('email-mismatch');
  if(norm(organizationId)!==invitation.organizationId) reasons.push('organization-mismatch');
  if(new Date(now)>=new Date(invitation.expiresAt)) reasons.push('expired');
  if(!invitation.serverTokenRef) reasons.push('server-token-missing');
  return {valid:reasons.length===0,reasons};
}

export function markInvitationUsed(invitation,{email,organizationId,now=new Date()}={}){
  const v=validateInvitation(invitation,{email,organizationId,now}); if(!v.valid) throw new Error(`Invitation invalide: ${v.reasons.join(',')}`);
  const next=clone(invitation);next.status='used';next.usedAt=iso(now);return next;
}

export function revokeInvitation(invitation,{serverAuthorized=false,now=new Date()}={}){
  if(!serverAuthorized) throw new Error('Autorisation serveur admin requise');
  if(invitation.status==='used') throw new Error('Invitation déjà utilisée');
  if(invitation.status==='revoked') return clone(invitation);
  const next=clone(invitation);next.status='revoked';next.revokedAt=iso(now);return next;
}

export function prepareInvitationSend(invitation){
  if(invitation.status!=='pending') throw new Error('Invitation non active');
  if(!invitation.serverTokenRef) throw new Error('Jeton serveur absent');
  return {kind:'employee-invitation',to:invitation.email,organizationId:invitation.organizationId,invitationId:invitation.id,serverTokenRef:invitation.serverTokenRef,idempotencyKey:`invite:${invitation.id}`};
}

export async function dispatchInvitation(invitation,{provider}={}){
  if(typeof provider!=='function') throw new Error('Service courriel serveur non connecté');
  if(invitation.sendReceipt?.ok) return clone(invitation);
  const req=prepareInvitationSend(invitation); const result=await provider(req);
  if(!result?.ok || !(result.messageId||result.providerReceipt)) throw new Error('Preuve envoi invitation absente');
  const next=clone(invitation);next.sendReceipt={ok:true,messageId:result.messageId||null,providerReceipt:result.providerReceipt||null,sentAt:result.sentAt||new Date().toISOString(),idempotencyKey:req.idempotencyKey};return next;
}
