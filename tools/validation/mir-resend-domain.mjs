/* Explicit domain-only setup. Reads a secret from the process, never prints it.
 * Does not send email, edit DNS, alter the root mailbox, or purchase a plan. */
import {writeFile} from 'node:fs/promises';
const key=process.env.RESEND_API_KEY;if(!key)throw Error('RESEND_API_KEY manquante. Utiliser Resend → Domains ou un gestionnaire de secrets, jamais le chat.');
const domain='envoi.revetementsmir.com';
async function api(path,options={}){const r=await fetch('https://api.resend.com'+path,{...options,headers:{authorization:'Bearer '+key,'content-type':'application/json'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Resend refuse cette opération ('+r.status+'). Une clé ayant les droits de gestion des domaines est requise.');return r.json();}
const list=await api('/domains');let found=list.data?.find(d=>d.name===domain);if(!found){if(!process.argv.includes('--create'))throw Error('Domaine absent. Relancer avec --create ou le créer dans Resend → Domains.');found=await api('/domains',{method:'POST',body:JSON.stringify({name:domain})});}
const details=await api('/domains/'+found.id),records=(details.records||[]).map(r=>({type:r.type,name:r.name,value:r.value,priority:r.priority??null,ttl:r.ttl??null,status:r.status}));
const result={domain,id:found.id,status:details.status,records,mailboxPreserved:true,instruction:'Ajouter uniquement ces entrées dans la zone DNS revetementsmir.com. Ne pas remplacer les MX, SPF ou DKIM de la boîte existante à la racine.'};
await writeFile(process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'/tmp/mir-resend-dns.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
