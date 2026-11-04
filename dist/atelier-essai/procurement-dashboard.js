(function(root,factory){const P=(typeof module==='object'&&module.exports)?require('./supplier-purchase-order.js'):root.MIRSupplierPO;const api=factory(P);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRProcurementDashboard=api;})(typeof window==='object'?window:null,function(P){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));const text=v=>String(v??'').trim();
function latestOrders(register){const by=new Map();for(const po of register?.orders||[]){const key=text(po.poNumber)||po.id;const cur=by.get(key);if(!cur||Number(po.revision)>Number(cur.revision))by.set(key,po)}return [...by.values()].map(clone)}
function unresolvedRejected(po){let count=0,qty=0;for(const receipt of po.receipts||[])for(const item of receipt.items||[]){const rejected=Number(item.rejectedQuantity)||0;if(rejected<=0)continue;const claimed=(po.claims||[]).filter(c=>c.receiptId===receipt.id&&c.lineId===item.lineId&&c.status!=='void').reduce((s,c)=>s+(Number(c.quantity)||0),0);const open=Math.max(0,rejected-claimed);if(open>1e-9){count++;qty+=open}}return{count,quantity:qty}}
function dashboard(register,{now=new Date().toISOString(),confirmationAfterHours=24,invoiceRegister=null}={}){const orders=latestOrders(register);const attention=[];let openClaims=0,resolvedClaims=0,overdue=0,awaitingConfirmation=0,unclaimedRejected=0;
 for(const po of orders){
   const claims=po.claims||[];openClaims+=claims.filter(c=>!['resolved','void'].includes(c.status)).length;resolvedClaims+=claims.filter(c=>c.status==='resolved').length;
   const unclaimed=unresolvedRejected(po);unclaimedRejected+=unclaimed.count;if(unclaimed.count)attention.push({priority:1,type:'rejected-unclaimed',poId:po.id,poNumber:po.poNumber,label:`${unclaimed.quantity} unité(s) refusée(s) sans réclamation`});
   if(P){const d=P.deliveryState(po,{now});if(d.overdue){overdue++;attention.push({priority:2,type:'delivery-overdue',poId:po.id,poNumber:po.poNumber,label:`Livraison en retard de ${d.daysLate} jour(s)`,targetDate:d.targetDate})}const f=P.followUpState(po,{now,afterHours:confirmationAfterHours});if(f.needed){awaitingConfirmation++;attention.push({priority:3,type:'confirmation-overdue',poId:po.id,poNumber:po.poNumber,label:'Confirmation fournisseur en retard',dueAt:f.dueAt})}}
   for(const c of claims)if(!['resolved','void'].includes(c.status))attention.push({priority:c.status==='notice_failed'?1:2,type:'claim-open',poId:po.id,poNumber:po.poNumber,claimId:c.id,label:`Réclamation ${c.status} · ${c.quantity}`});
 }
 attention.sort((a,b)=>a.priority-b.priority||String(a.poNumber).localeCompare(String(b.poNumber)));
 const active=orders.filter(po=>!['cancelled','received','revised'].includes(po.status)).length;
 const invoices=(invoiceRegister?.invoices||[]).filter(x=>x.status!=='void');
 const invoicePending=invoices.filter(x=>x.status==='draft').length;
 const invoiceApproved=invoices.filter(x=>x.status==='approved_for_accounting').length;
 for(const inv of invoices.filter(x=>x.status==='draft')) attention.push({priority:3,type:'invoice-review',poId:inv.poId,poNumber:inv.poNumber,invoiceId:inv.id,label:`Facture ${inv.invoiceNumber} à rapprocher`});
 attention.sort((a,b)=>a.priority-b.priority||String(a.poNumber).localeCompare(String(b.poNumber)));
 return {orders:orders.length,active,overdue,awaitingConfirmation,openClaims,resolvedClaims,unclaimedRejected,invoicePending,invoiceApproved,attention};
}
function filterAttention(result,{type='',poNumber=''}={}){return (result?.attention||[]).filter(x=>(!type||x.type===type)&&(!poNumber||x.poNumber===poNumber)).map(clone)}
return{latestOrders,unresolvedRejected,dashboard,filterAttention};
});
