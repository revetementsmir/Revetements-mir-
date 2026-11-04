import { reconcileSupplierReceiptToInventory } from './supplier-receiving-inventory.js';

const text=v=>String(v??'').trim();
export function inventoryReceiptPlan(po, receiptId, {mappings={}}={}){
  const receipt=(po?.receipts||[]).find(r=>r.id===receiptId); if(!receipt) throw new Error('Réception fournisseur introuvable');
  const lineById=Object.fromEntries((po.lines||[]).map(l=>[l.id,l]));
  const credits=[], chantier=[];
  for(const item of receipt.items||[]){
    const quantity=Number(item.quantity)||0; if(quantity<=0) continue;
    const line=lineById[item.lineId]; if(!line) throw new Error(`Ligne fournisseur inconnue: ${item.lineId}`);
    if(line.destination==='inventory'){
      const itemId=text(mappings[line.id]||line.inventoryItemId); if(!itemId) throw new Error(`SKU inventaire requis pour ${line.id}`);
      credits.push({lineId:line.id,itemId,quantity,unit:line.unit,description:line.description,supplierName:po.supplier?.name||''});
    }else{
      chantier.push({lineId:line.id,quantity,unit:line.unit,description:line.description,chantier:po.project?.chantier||po.project?.name||''});
    }
  }
  return {receiptId:receipt.id,credits,chantier,rejected:(receipt.items||[]).filter(i=>Number(i.rejectedQuantity)>0).map(i=>({lineId:i.lineId,quantity:Number(i.rejectedQuantity)||0,issue:i.issue||''}))};
}
export function applySupplierReceiptToInventory(store,po,receiptId,{mappings={},actorRole='admin',actor='MIR'}={}){
  if(actorRole!=='admin') throw new Error('Admin requis pour comptabiliser une réception fournisseur');
  return reconcileSupplierReceiptToInventory(store,po,receiptId,{expectedRevision:store.revision,actor,mapping:mappings});
}
