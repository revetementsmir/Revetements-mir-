/* MIR — procurement backup bundle for transition before shared backend. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRProcurementBackup=api;})(typeof window==='object'?window:null,function(){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));const text=v=>String(v??'').trim();function assert(c,m){if(!c)throw new Error(m)}
function createBackup({register,directory,currentPo=null,createdAt}={}){assert(register?.schemaVersion===1,'Registre de bons invalide.');assert(directory?.schemaVersion===1,'Répertoire fournisseurs invalide.');return {schema:'mir-procurement-backup',schemaVersion:1,createdAt:text(createdAt)||new Date().toISOString(),register:clone(register),directory:clone(directory),currentPo:currentPo?clone(currentPo):null};}
function validateBackup(value){const b=typeof value==='string'?JSON.parse(value):clone(value);assert(b?.schema==='mir-procurement-backup'&&b?.schemaVersion===1,'Sauvegarde Achats MIR incompatible.');assert(b.register?.schemaVersion===1,'Registre de bons manquant.');assert(b.directory?.schemaVersion===1,'Répertoire fournisseurs manquant.');return b;}
function serializeBackup(input){return JSON.stringify(createBackup(input),null,2)}
function restoreBackup(raw){return validateBackup(raw)}
function fileName(backup){const b=validateBackup(backup);const date=(b.createdAt||'').slice(0,10)||'date';return `MIR-achats-${date}.json`}
return {createBackup,validateBackup,serializeBackup,restoreBackup,fileName};
});
