/* MIR — sauvegarde portable des modèles uniquement. Aucun compte ni commande exporté. */
(function(root,factory){
  const M=typeof module==='object'&&module.exports?require('./production-model.js'):root?.MIRProduction;
  const D=typeof module==='object'&&module.exports?require('./model-measure-defaults.js'):root?.MIRModelDefaults;
  const api=factory(M,D);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRTemplateBackup=api;
})(typeof window==='object'?window:null,function(M,D){
 'use strict';
 const SCHEMA='mir-template-library-backup-1',MAX_BYTES=3*1024*1024,MAX_MODELS=500,MAX_VERSIONS=60;
 const clone=v=>JSON.parse(JSON.stringify(v));
 const bytes=text=>typeof TextEncoder==='function'?new TextEncoder().encode(text).length:text.length*3;
 const fail=message=>({ok:false,error:message});
 function validateRecord(record,index){
   const error=message=>{throw new Error('Modèle '+(index+1)+' : '+message);};
   if(!record||typeof record!=='object'||Array.isArray(record))error('format invalide.');
   if(typeof record.id!=='string'||!/^[-a-zA-Z0-9_:.]{3,140}$/.test(record.id))error('identifiant invalide.');
   if(!Array.isArray(record.versions)||record.versions.length<1||record.versions.length>MAX_VERSIONS)error('historique de versions invalide.');
   if(!Number.isSafeInteger(record.currentVersion)||record.currentVersion<1)error('version courante invalide.');
   const seen=new Set();
   for(const t of record.versions){
     if(t?.id!==record.id||!Number.isSafeInteger(t.version)||seen.has(t.version))error('version du modèle incohérente ou répétée.');
     seen.add(t.version);
     let verified;
     try{verified=M.templatePreview(t);}catch{error('structure du modèle illisible.');}
     if(!verified?.ok)error('géométrie du modèle ou signature invalide.');
   }
   const current=record.versions.find(t=>t.version===record.currentVersion);
   if(!current)error('version active introuvable.');
   let defaults=null;
   if(record.measurementDefaults){
     if(!D?.validate)error('contrôle des mesures standards indisponible.');
     const checked=D.validate(current,record.measurementDefaults);
     if(!checked.ok)error('mesures permanentes invalides : '+checked.errors.join(' '));
     defaults=checked.data;
   }
   const materials=['aluminium','acier','acier-inoxydable'],colors=['manufacturer','ral','special'];
   const allowed=record.allowed&&typeof record.allowed==='object'&&!Array.isArray(record.allowed)?record.allowed:{};
   const safeMaterials=Array.isArray(allowed.materials)?allowed.materials.filter(v=>materials.includes(v)):['aluminium','acier'];
   const safeColors=Array.isArray(allowed.colorSystems)?allowed.colorSystems.filter(v=>colors.includes(v)):['manufacturer','ral','special'];
   if(!safeMaterials.length||!safeColors.length)error('matières ou couleurs autorisées invalides.');
   return {id:record.id,name:current.name,currentVersion:record.currentVersion,
     versions:clone(record.versions),allowed:{materials:[...new Set(safeMaterials)],colorSystems:[...new Set(safeColors)]},
     measurementDefaults:defaults,channels:{client:record.channels?.client===true,store:record.channels?.store===true,...(record.channels?.po===false?{po:false}:{})},
     archived:record.archived===true,updatedAt:typeof record.updatedAt==='string'?record.updatedAt:''};
 }
 function validate(records){
   if(!M?.templatePreview)return fail('Moteur de modèles MIR indisponible.');
   if(!Array.isArray(records)||records.length>MAX_MODELS)return fail('Nombre de modèles invalide ou trop élevé (maximum '+MAX_MODELS+').');
   const clean=[],ids=new Set();
   try{
     records.forEach((record,i)=>{
       const row=validateRecord(record,i);
       if(ids.has(row.id))throw new Error('Identifiant de modèle répété : '+row.id);
       ids.add(row.id);clean.push(row);
     });
   }catch(e){return fail(e.message);}
   return {ok:true,records:clean};
 }
 function create(records){
   const checked=validate(records);
   if(!checked.ok)return checked;
   const payload={schema:SCHEMA,exportedAt:new Date().toISOString(),source:'MIR local',records:checked.records};
   const content=JSON.stringify(payload,null,2);
   if(bytes(content)>MAX_BYTES)return fail('La sauvegarde dépasse 3 Mo. Réduisez la bibliothèque avant l’export.');
   return {ok:true,content,count:checked.records.length,filename:'MIR-modeles-atelier-'+new Date().toISOString().slice(0,10)+'.json'};
 }
 function merge(content,existing=[]){
   if(typeof content!=='string'||bytes(content)>MAX_BYTES)return fail('Fichier JSON trop volumineux (maximum 3 Mo).');
   let payload;
   try{payload=JSON.parse(content);}catch{return fail('Le fichier ne contient pas un JSON valide.');}
   if(payload?.schema!==SCHEMA||!Array.isArray(payload.records))return fail('Ce fichier n’est pas une sauvegarde de modèles MIR.');
   const restored=validate(payload.records),local=validate(existing);
   if(!restored.ok)return restored;
   if(!local.ok)return fail('La bibliothèque locale est invalide : '+local.error);
   const ids=new Set(local.records.map(r=>r.id)),add=[];
   for(const record of restored.records){
     if(ids.has(record.id))continue; // Ne jamais remplacer une variante locale plus récente.
     ids.add(record.id);
     add.push({...record,channels:{client:false,store:false,...(record.channels?.po===false?{po:false}:{})},updatedAt:new Date().toISOString()});
   }
   if(local.records.length+add.length>MAX_MODELS)return fail('L’import dépasserait '+MAX_MODELS+' modèles.');
   return {ok:true,records:[...clone(existing),...add],added:add.length,skipped:restored.records.length-add.length,
     privateByDefault:true};
 }
 return Object.freeze({SCHEMA,MAX_BYTES,create,merge,validate});
});

