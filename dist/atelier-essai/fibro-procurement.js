/* MIR fibrociment procurement bridge — candidate only. No automatic sending/order. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRFibroProcurement=api;})(typeof window==='object'?window:null,function(){
'use strict';const clone=v=>JSON.parse(JSON.stringify(v));
function text(v){return String(v??'').trim()}
function deriveSheetRequirement(snapshot,{skuByFormat={},materialKey='',descriptionPrefix='Fibrociment'}={}){
  if(!snapshot?.plan?.sheetFormat) throw new Error('Snapshot débit requis');
  const formatId=String(snapshot.plan.sheetFormat.id);const count=Number(snapshot.plan.sheets?.length||0);if(count<=0) throw new Error('Aucune feuille requise');
  const sku=text(skuByFormat[formatId]);const material=text(materialKey||snapshot.plan.material?.id||snapshot.plan.material?.name||'');
  return {cutPlanId:String(snapshot.id),cutPlanRevision:Number(snapshot.revision||1),formatId,formatLabel:String(snapshot.plan.sheetFormat.label||formatId),requiredSheets:count,inventoryItemId:sku||null,materialKey:material||null,description:`${descriptionPrefix} ${snapshot.plan.sheetFormat.label||formatId}`.trim(),source:{type:'mir-fibro-cut-plan',cutPlanId:String(snapshot.id),revision:Number(snapshot.revision||1),formatId}};
}
function availability(requirement,storeState){
  const id=requirement?.inventoryItemId;if(!id) return {...clone(requirement),mappingRequired:true,physical:0,reserved:0,available:0,shortage:requirement.requiredSheets};
  const inv=storeState?.inventory?.[id];if(!inv) return {...clone(requirement),mappingRequired:true,physical:0,reserved:0,available:0,shortage:requirement.requiredSheets};
  const physical=Number(inv.physical||0),reserved=Number(inv.reserved||0),available=Math.max(0,physical-reserved),shortage=Math.max(0,requirement.requiredSheets-available);
  return {...clone(requirement),mappingRequired:false,physical,reserved,available,shortage};
}
function buildSupplierLine(shortage,{destination,projectRef='',supplierSku='',unitCost=null,currency='CAD'}={}){
  if(!shortage||shortage.shortage<=0) return null;
  const dest=String(destination||'').toLowerCase();if(!['chantier','inventory'].includes(dest)) throw new Error('Destination Chantier ou Inventaire requise');
  if(dest==='inventory'&&!shortage.inventoryItemId) throw new Error('SKU inventaire requis pour une destination Inventaire');
  const cost=unitCost===null||unitCost===''?null:Number(unitCost);if(cost!==null&&(!Number.isFinite(cost)||cost<0))throw new Error('Coût unitaire invalide');
  return {supplierSku:text(supplierSku),description:shortage.description,quantity:shortage.shortage,unit:'feuille',unitCost:cost,currency:String(currency||'CAD').toUpperCase(),projectRef:text(projectRef),destination:dest,inventoryItemId:dest==='inventory'?shortage.inventoryItemId:'',source:clone(shortage.source),notes:`Besoin calculé depuis ${shortage.cutPlanId} r${shortage.cutPlanRevision}; stock disponible ${shortage.available}/${shortage.requiredSheets}.`};
}
function buildSupplierPoInput(shortage,{supplier,poNumber='',project={},destination,projectRef='',supplierSku='',unitCost=null,currency='CAD',requestedDeliveryDate='',shipTo='',notes=''}={}){
  const line=buildSupplierLine(shortage,{destination,projectRef,supplierSku,unitCost,currency});if(!line) return null;
  if(!supplier?.name) throw new Error('Fournisseur requis pour créer le brouillon');
  return {poNumber:String(poNumber||''),supplier:clone(supplier),currency:String(currency||supplier.currency||'CAD').toUpperCase(),project:clone(project),requestedDeliveryDate:String(requestedDeliveryDate||''),shipTo:String(shipTo||''),notes:String(notes||''),lines:[line],metadata:{sourceType:'fibro-cut-shortage',cutPlanId:shortage.cutPlanId,cutPlanRevision:shortage.cutPlanRevision,autoSend:false}};
}
return {deriveSheetRequirement,availability,buildSupplierLine,buildSupplierPoInput};
});
