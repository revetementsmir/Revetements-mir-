/* MIR — Purchase order register. Keeps all supplier POs/revisions; local candidate until shared backend. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRSupplierPORegister=api;})(typeof window==='object'?window:null,function(){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));const text=v=>String(v??'').trim();function assert(c,m){if(!c)throw new Error(m)}
function createRegister(items=[]){const r={schemaVersion:1,orders:[]};for(const po of items)r.orders=upsertOrder(r,po).orders;return r}
function validatePo(po){assert(po&&po.schemaVersion===1&&text(po.id),'Bon fournisseur invalide.');assert(text(po.poNumber)||po.status==='draft','Numéro de bon requis hors brouillon.');assert(Number.isInteger(po.revision)&&po.revision>0,'Révision invalide.');return po}
function upsertOrder(register,po){validatePo(po);const r=clone(register||createRegister());const copy=clone(po);const i=r.orders.findIndex(x=>x.id===copy.id);if(i>=0)r.orders[i]=copy;else r.orders.push(copy);return r}
function upsertMany(register,orders=[]){let r=clone(register||createRegister());for(const po of orders)r=upsertOrder(r,po);return r}
function getOrder(register,id){const x=(register?.orders||[]).find(o=>o.id===id);return x?clone(x):null}
function listOrders(register,{status='',supplier='',chantier='',query='',includeRevised=true,includeCancelled=true}={}){const q=text(query).toLowerCase(),s=text(supplier).toLowerCase(),c=text(chantier).toLowerCase();return (register?.orders||[]).filter(po=>{
 if(status&&po.status!==status)return false;if(!includeRevised&&po.status==='revised')return false;if(!includeCancelled&&po.status==='cancelled')return false;
 if(s&&!text(po.supplier?.name).toLowerCase().includes(s))return false;if(c&&!text(po.project?.chantier).toLowerCase().includes(c))return false;
 if(q){const hay=[po.poNumber,po.supplier?.name,po.project?.chantier,po.project?.internalOrderRef,po.supplier?.accountNumber,po.status].map(v=>text(v).toLowerCase()).join(' ');if(!hay.includes(q))return false}return true;
 }).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))}
function revisionsFor(register,poNumber){return (register?.orders||[]).filter(x=>x.poNumber===poNumber).slice().sort((a,b)=>a.revision-b.revision)}
function latestRevision(register,poNumber){return revisionsFor(register,poNumber).at(-1)||null}
function assertUniqueRevision(register,po){const duplicate=(register?.orders||[]).find(x=>x.id!==po.id&&x.poNumber===po.poNumber&&x.revision===po.revision);assert(!duplicate,`Le bon ${po.poNumber} révision ${po.revision} existe déjà.`);return true}
function dashboard(register){const orders=register?.orders||[];const counts={};for(const po of orders)counts[po.status]=(counts[po.status]||0)+1;const open=orders.filter(po=>!['cancelled','received','revised'].includes(po.status)).length;return {total:orders.length,open,counts};}
function serialize(r){return JSON.stringify(r)}
function restore(raw){const r=typeof raw==='string'?JSON.parse(raw):clone(raw);assert(r?.schemaVersion===1,'Format registre fournisseurs incompatible.');return createRegister(r.orders||[])}
return {createRegister,validatePo,upsertOrder,upsertMany,getOrder,listOrders,revisionsFor,latestRevision,assertUniqueRevision,dashboard,serialize,restore};
});
