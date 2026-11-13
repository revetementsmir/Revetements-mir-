/* Shared, runtime-independent validation. Used by Node and Supabase Edge. */
const LIMITS=Object.freeze({maxFiles:5,maxFileBytes:20*1024*1024,maxTotalFileBytes:25*1024*1024,maxPayloadBytes:8*1024*1024});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const canonical=value=>JSON.stringify(value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):Array.isArray(value)?value.map(x=>JSON.parse(canonical(x))):value);
const clone=value=>JSON.parse(JSON.stringify(value));
class EstimateError extends Error{constructor(code,message,status=400,retryable=false){super(message);Object.assign(this,{code,status,retryable});}}
const error=(code,message,status,retryable)=>new EstimateError(code,message,status,retryable);
function text(value,max,required=false){if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw error('INPUT','Un champ est invalide ou trop long.');const out=value.trim();if(required&&!out)throw error('INPUT','Complétez les coordonnées et l’adresse du chantier.');return out;}
function payloadOf(raw,limit){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>limit)throw error('PAYLOAD_SIZE','Les choix du projet dépassent la taille permise.',413);
 let p;try{p=JSON.parse(raw);}catch{throw error('INPUT','Le résumé de la demande est illisible.');}
 if(p?.version!==1||!['general','studio','cart','bending'].includes(p.source))throw error('INPUT','La provenance de la demande est invalide.');
 const c=p.contact||{},a=p.address||{};
 const contact={name:text(c.name,160,true),email:text(c.email,254,true),phone:text(c.phone||'',60)};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)||/[\r\n]/.test(contact.email))throw error('EMAIL','Entrez une adresse courriel valide.');
 const address={street:text(a.street,300,true),city:text(a.city,160,true),postalCode:text(a.postalCode,30,true)};
 if(p.source==='studio'&&(!p.studio||typeof p.studio!=='object'||Array.isArray(p.studio)))throw error('STUDIO_REQUIRED','Le résumé du Studio est manquant.');
 if(['cart','bending'].includes(p.source)&&(!p.selection||typeof p.selection!=='object'))throw error('SELECTION_REQUIRED','La sélection du dossier est manquante.');
 // The server never injects client HTML into an email or a private page. The
 // snapshot is JSON only; originals are delivered as attachments, never inline.
 return {version:1,source:p.source,contact,address,note:text(p.note||'',5000),...(p.selection?{selection:clone(p.selection)}:{}),...(p.studio?{studio:clone(p.studio)}:{})};
}

function fileMetadata(file,index,limits=LIMITS){
 if(!['plans','dossier'].includes(file?.field))throw error('FILE_FIELD','Une pièce jointe n’est pas reconnue.');
 const filename=text(file.filename,180,true).replace(/[\\/]/g,'-');
 if(!/\.pdf$/i.test(filename)||file.contentType&&file.contentType!=='application/pdf')throw error('FILE_TYPE','Le fichier « '+filename+' » doit être un PDF.',415);
 if(!Number.isSafeInteger(file.bytes)||file.bytes<=0||file.bytes>limits.maxFileBytes)throw error('FILE_SIZE','Le fichier « '+filename+' » dépasse 20 Mio ou est vide.',413);
 if(!/^[a-f0-9]{64}$/.test(file.sha256||''))throw error('FILE_HASH','L’empreinte du PDF est manquante.');
 return {id:String(index+1),field:file.field,filename,bytes:file.bytes,sha256:file.sha256};
}
function submissionManifest(input,limits=LIMITS){
 const id=String(input?.requestId||'').toLowerCase();if(!UUID.test(id))throw error('REQUEST_ID','L’identifiant du brouillon est invalide.');
 const payload=payloadOf(JSON.stringify(input.payload),limits.maxPayloadBytes);
 if(!Array.isArray(input.files)||input.files.length>limits.maxFiles)throw error('FILE_COUNT','Un maximum de 5 PDF est permis.',413);
 const files=input.files.map((f,i)=>fileMetadata(f,i,limits));
 if(files.reduce((n,f)=>n+f.bytes,0)>limits.maxTotalFileBytes)throw error('FILES_SIZE','L’ensemble des PDF dépasse 25 Mio.',413);
 const dossiers=files.filter(f=>f.field==='dossier');if(dossiers.length>1||(['cart','bending'].includes(payload.source)&&dossiers.length!==1))throw error('DOSSIER_PDF','Joignez le PDF du dossier avant l’envoi.');
 return {id,payload,files};
}
function pdfSignature(bytes){return new TextDecoder().decode(bytes.subarray(0,5))==='%PDF-'&&new TextDecoder().decode(bytes.subarray(Math.max(0,bytes.length-4096))).includes('%%EOF');}
export {LIMITS,UUID,canonical,EstimateError,error,text,payloadOf,fileMetadata,submissionManifest,pdfSignature};
