/* Opt-in migration helper. Not loaded by the public pages. Never mutates storage.
 * Exact source strings are retained; credentials and unrelated keys are excluded.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRLocalBackup=api;})(typeof window==='object'?window:null,function(){
  'use strict';
  const KEYS=Object.freeze([
    'mir_production_templates_v1','mir_production_requests_v1',
    'mir_production_admin_dossier_v1','mir_production_employee_dossier_v1',
    'mir_production_client_dossier_v1','mir_admin_procurement_v1','mir_production_admin_orders_v1'
  ]);
  const MAX_BYTES=10*1024*1024;
  function assert(ok,message){if(!ok)throw new Error(message);}
  function object(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
  function unique(rows,label){
    assert(Array.isArray(rows),label+' : liste requise');
    const ids=new Set();
    for(const row of rows){assert(object(row)&&typeof row.id==='string'&&row.id.length>0,label+' : identifiant requis');assert(!ids.has(row.id),label+' : identifiant dupliqué');ids.add(row.id);}
  }
  function validateValue(key,raw){
    assert(KEYS.includes(key),'Clé non autorisée');
    assert(typeof raw==='string','Valeur brute requise');
    const value=JSON.parse(raw);
    if(key==='mir_production_admin_orders_v1'){unique(value,'Anciens bons');return value;}
    assert(object(value)&&value.version===1,'Version locale inconnue');
    if(key==='mir_production_templates_v1'){
      unique(value.records,'Modèles');
      for(const r of value.records){assert(Array.isArray(r.versions)&&r.versions.length>0,'Versions modèle requises');}
    }else if(key==='mir_production_requests_v1')unique(value.requests,'Demandes');
    else if(key==='mir_admin_procurement_v1'){unique(value.suppliers,'Fournisseurs');unique(value.orders,'Bons');}
    else {assert(object(value.order),'Dossier requis');unique(value.order.items,'Pièces');}
    return value;
  }
  function validate(backup){
    assert(object(backup)&&backup.schema==='mir-local-backup-1','Format sauvegarde inconnu');
    assert(Array.isArray(backup.entries)&&backup.entries.length>0,'Sauvegarde vide');
    assert(new TextEncoder().encode(JSON.stringify(backup)).length<=MAX_BYTES,'Sauvegarde trop volumineuse');
    const seen=new Set();
    for(const e of backup.entries){assert(object(e)&&!seen.has(e.key),'Clé dupliquée');validateValue(e.key,e.raw);seen.add(e.key);}
    return backup;
  }
  function capture(storage){
    const entries=[];
    for(const key of KEYS){const raw=storage.getItem(key);if(raw!==null)entries.push({key,raw});}
    return validate({schema:'mir-local-backup-1',entries});
  }
  async function checksum(backup,cryptoAPI=globalThis.crypto){
    validate(backup);assert(cryptoAPI?.subtle,'SHA-256 indisponible');
    const entries=backup.entries.map(e=>({key:e.key,raw:e.raw})).sort((a,b)=>a.key.localeCompare(b.key));
    const digest=await cryptoAPI.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(entries)));
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  // Dry-run reconciliation only: no setItem/removeItem, including on conflict.
  function reconcile(storage,backup){
    validate(backup);
    return backup.entries.map(({key,raw})=>{const current=storage.getItem(key);return {key,state:current===raw?'unchanged':current===null?'missing':'conflict'};});
  }
  async function stage(client,organizationId,backup){
    validate(backup);assert(typeof organizationId==='string'&&organizationId.length>0,'Organisation requise');
    assert(client?.schema,'Client Supabase authentifié requis');
    const {data,error}=await client.schema('mir_core').rpc('stage_local_backup',{org:organizationId,payload:backup});
    if(error)throw new Error(error.message||'Sauvegarde serveur refusée');
    assert(typeof data==='string'&&data.length>0,'Confirmation serveur manquante');
    return {batchId:data,state:'staged'};
  }
  return Object.freeze({KEYS,MAX_BYTES,validateValue,validate,capture,checksum,reconcile,stage});
});
