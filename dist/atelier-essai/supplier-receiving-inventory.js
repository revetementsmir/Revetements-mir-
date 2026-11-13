import { adjustStock, inventoryView } from './employee-store-model.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const text=v=>String(v??'').trim();

export function reconcileSupplierReceiptToInventory(store, po, receiptId, { expectedRevision, actor='MIR', mapping={} }={}){
  if(!store || !Number.isInteger(store.revision)) throw new Error('Inventaire MIR invalide');
  const receipt=(po?.receipts||[]).find(r=>r.id===receiptId); if(!receipt) throw new Error('Réception fournisseur introuvable');
  const lineById=Object.fromEntries((po.lines||[]).map(l=>[l.id,l]));
  let next=clone(store), applied=[], directToProject=[];
  let revision=expectedRevision;
  if(revision!==next.revision) throw Object.assign(new Error(`Conflit de révision : attendu ${revision}, actuel ${next.revision}`),{code:'REVISION_CONFLICT'});
  for(const item of receipt.items||[]){
    const qty=Number(item.quantity)||0; if(qty<=0) continue; // rejected quantities never enter stock
    const line=lineById[item.lineId]; if(!line) throw new Error(`Ligne fournisseur inconnue: ${item.lineId}`);
    const destination=line.destination==='inventory'?'inventory':'chantier';
    if(destination==='chantier'){
      directToProject.push({poId:po.id,poNumber:po.poNumber,revision:po.revision,receiptId,lineId:line.id,quantity:qty,chantierId:po.project?.id||po.project?.chantier||'',description:line.description});
      continue;
    }
    const itemId=text(mapping[line.id]||line.inventoryItemId); if(!itemId) throw new Error(`SKU inventaire requis pour ${line.id}`);
    if(!next.inventory?.[itemId]) throw new Error(`Article inventaire inconnu: ${itemId}`);
    const key=`supplier-receipt:${po.id}:r${po.revision}:${receipt.id}:${line.id}`;
    const before=next.revision;
    next=adjustStock(next,{itemId,delta:qty,idempotencyKey:key,reason:`Réception fournisseur ${po.poNumber} / ${receipt.packingSlip||receipt.id}`,actorRole:'admin'},{expectedRevision:next.revision,now:receipt.at||new Date()});
    const duplicate=next.revision===before;
    if(!duplicate){
      const evt=next.events.at(-1); Object.assign(evt,{source:'supplier-receipt',actor,poId:po.id,poNumber:po.poNumber,poRevision:po.revision,receiptId:receipt.id,packingSlip:receipt.packingSlip||'',supplierId:po.supplier?.id||'',supplierName:po.supplier?.name||'',lineId:line.id,chantierId:po.project?.id||po.project?.chantier||''});
      applied.push({itemId,lineId:line.id,quantity:qty,idempotencyKey:key,inventory:inventoryView(next,itemId)});
    }
  }
  return {store:next,applied,directToProject,receiptId,poId:po.id,poNumber:po.poNumber,revision:po.revision};
}
