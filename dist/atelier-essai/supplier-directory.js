/* MIR — Supplier directory candidate. Local-only adapter until shared backend is connected. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRSupplierDirectory=api;})(typeof window==='object'?window:null,function(){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));
const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text=v=>String(v??'').trim();
function assert(c,m){if(!c)throw new Error(m)}
function makeId(){return `supplier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function normalizeSupplierProfile(input={}){
 const p={id:text(input.id)||makeId(),name:text(input.name),contactName:text(input.contactName),email:text(input.email).toLowerCase(),cc:Array.isArray(input.cc)?input.cc.map(x=>text(x).toLowerCase()).filter(Boolean):[],phone:text(input.phone),address:text(input.address),language:text(input.language)||'fr-CA',currency:text(input.currency||'CAD').toUpperCase(),paymentTerms:text(input.paymentTerms),accountNumber:text(input.accountNumber),notes:text(input.notes),archived:!!input.archived,createdAt:text(input.createdAt)||new Date().toISOString(),updatedAt:new Date().toISOString()};
 assert(p.name,'Le nom du fournisseur est requis.'); if(p.email)assert(emailRe.test(p.email),'Le courriel du fournisseur est invalide.'); for(const cc of p.cc)assert(emailRe.test(cc),`Courriel CC invalide: ${cc}`); assert(['CAD','USD'].includes(p.currency),'Devise fournisseur non prise en charge.'); return p;
}
function createDirectory(items=[]){return {schemaVersion:1,items:items.map(normalizeSupplierProfile)}}
function upsertSupplier(directory,input){const d=clone(directory||createDirectory());const p=normalizeSupplierProfile(input);const i=d.items.findIndex(x=>x.id===p.id);if(i>=0){p.createdAt=d.items[i].createdAt;d.items[i]=p}else d.items.push(p);return d}
function archiveSupplier(directory,id,archived=true){const d=clone(directory);const i=d.items.findIndex(x=>x.id===id);assert(i>=0,'Fournisseur introuvable.');d.items[i].archived=!!archived;d.items[i].updatedAt=new Date().toISOString();return d}
function listSuppliers(directory,{includeArchived=false,query=''}={}){const q=text(query).toLowerCase();return (directory?.items||[]).filter(x=>(includeArchived||!x.archived)&&(!q||[x.name,x.contactName,x.email,x.accountNumber].some(v=>text(v).toLowerCase().includes(q)))).slice().sort((a,b)=>a.name.localeCompare(b.name,'fr'))}
function getSupplier(directory,id){const p=(directory?.items||[]).find(x=>x.id===id);return p?clone(p):null}
function toPurchaseOrderSupplier(profile){assert(profile,'Fournisseur requis.');return {id:profile.id,name:profile.name,contactName:profile.contactName,email:profile.email,cc:clone(profile.cc||[]),phone:profile.phone,address:profile.address,language:profile.language,currency:profile.currency,paymentTerms:profile.paymentTerms,accountNumber:profile.accountNumber,notes:profile.notes}}
function serialize(directory){return JSON.stringify(directory)}
function restore(raw){const d=typeof raw==='string'?JSON.parse(raw):clone(raw);assert(d?.schemaVersion===1,'Format de répertoire fournisseurs incompatible.');return createDirectory(d.items||[])}
return {normalizeSupplierProfile,createDirectory,upsertSupplier,archiveSupplier,listSuppliers,getSupplier,toPurchaseOrderSupplier,serialize,restore};
});
