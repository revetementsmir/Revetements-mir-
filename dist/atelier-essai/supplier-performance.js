/* MIR — Supplier performance analytics candidate.
 * Computes transparent operational metrics from MIR supplier POs.
 * No vendor score/blacklist is invented: raw metrics only.
 */
(function(root,factory){
  const P=(typeof module==='object'&&module.exports)?require('./supplier-purchase-order.js'):root.MIRSupplierPO;
  const api=factory(P);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRSupplierPerformance=api;
})(typeof window==='object'?window:null,function(P){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));
const text=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const round=(v,d=4)=>{const f=10**d;return Math.round((v+Number.EPSILON)*f)/f};
function latestOrders(register){
  const by=new Map();
  for(const po of register?.orders||[]){
    const key=text(po.poNumber)||text(po.id);
    const cur=by.get(key);
    if(!cur||num(po.revision)>num(cur.revision))by.set(key,po);
  }
  return [...by.values()].map(clone);
}
function supplierIdentity(po){
  const id=text(po?.supplier?.id);
  const name=text(po?.supplier?.name);
  return {key:id||name.toLowerCase(),id,name:name||'Fournisseur sans nom'};
}
function targetDate(po){return text(po?.supplierConfirmation?.confirmedDeliveryDate||po?.requestedDeliveryDate)}
function finalReceiptAt(po){
  const receipts=(po?.receipts||[]).map(r=>text(r.at)).filter(Boolean).sort();
  return receipts.at(-1)||'';
}
function daysLate(target,actual){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(target)||!actual)return null;
  const end=Date.parse(target+'T23:59:59.999Z');
  const at=Date.parse(actual);
  if(!Number.isFinite(end)||!Number.isFinite(at))return null;
  return Math.max(0,Math.ceil((at-end)/86400000));
}
function hoursBetween(a,b){const x=Date.parse(a||''),y=Date.parse(b||'');return Number.isFinite(x)&&Number.isFinite(y)&&y>=x?(y-x)/3600000:null}
function emptyMetric(identity){return {
  supplier:identity,
  orders:0,activeOrders:0,receivedOrders:0,
  orderedUnits:0,acceptedUnits:0,rejectedUnits:0,inspectedUnits:0,rejectionRate:null,
  deliveriesWithTarget:0,onTimeDeliveries:0,lateDeliveries:0,averageDaysLate:null,maxDaysLate:0,
  currentlyOverdue:0,
  confirmations:0,averageConfirmationHours:null,
  claims:{total:0,open:0,resolved:0,replacement:0,credit:0,averageResolutionHours:null,creditsByCurrency:{}},
  lastActivityAt:''
}}
function metricsForOrders(orders,{now=new Date().toISOString()}={}){
  const identity=supplierIdentity(orders[0]||{});const m=emptyMetric(identity);
  const confirmationHours=[],lateDays=[],resolutionHours=[];
  for(const po of orders){
    m.orders++;
    if(!['cancelled','received','revised'].includes(po.status))m.activeOrders++;
    if(po.status==='received')m.receivedOrders++;
    for(const l of po.lines||[])m.orderedUnits+=num(l.quantity);
    for(const r of po.receipts||[]){
      if(text(r.at)>m.lastActivityAt)m.lastActivityAt=text(r.at);
      for(const item of r.items||[]){m.acceptedUnits+=num(item.quantity);m.rejectedUnits+=num(item.rejectedQuantity)}
    }
    m.inspectedUnits=m.acceptedUnits+m.rejectedUnits;
    const target=targetDate(po);
    if(po.status==='received'&&target){
      const actual=finalReceiptAt(po);const late=daysLate(target,actual);
      if(late!==null){m.deliveriesWithTarget++;if(late===0)m.onTimeDeliveries++;else{m.lateDeliveries++;lateDays.push(late);m.maxDaysLate=Math.max(m.maxDaysLate,late)}}
    }else if(P&&typeof P.deliveryState==='function'){
      const d=P.deliveryState(po,{now});if(d.overdue)m.currentlyOverdue++;
    }
    const confirmationAt=text(po.supplierConfirmation?.at||po.acknowledgedAt);
    const ch=hoursBetween(po.sentAt,confirmationAt);if(ch!==null){m.confirmations++;confirmationHours.push(ch)}
    for(const c of po.claims||[]){
      m.claims.total++;
      if(c.status==='resolved')m.claims.resolved++;else if(c.status!=='void')m.claims.open++;
      const type=text(c.resolution?.type);
      if(type==='replacement')m.claims.replacement++;
      if(type==='credit'){
        m.claims.credit++;
        const cur=text(c.resolution?.currency||po.currency||'CAD').toUpperCase();
        m.claims.creditsByCurrency[cur]=round(num(m.claims.creditsByCurrency[cur])+num(c.resolution?.amount),2);
      }
      const rh=hoursBetween(c.createdAt,c.resolvedAt);if(rh!==null)resolutionHours.push(rh);
      if(text(c.updatedAt)>m.lastActivityAt)m.lastActivityAt=text(c.updatedAt);
    }
    for(const d of [po.updatedAt,po.sentAt,po.acknowledgedAt])if(text(d)>m.lastActivityAt)m.lastActivityAt=text(d);
  }
  m.orderedUnits=round(m.orderedUnits,3);m.acceptedUnits=round(m.acceptedUnits,3);m.rejectedUnits=round(m.rejectedUnits,3);m.inspectedUnits=round(m.inspectedUnits,3);
  m.rejectionRate=m.inspectedUnits>0?round(m.rejectedUnits/m.inspectedUnits,6):null;
  m.averageDaysLate=lateDays.length?round(lateDays.reduce((a,b)=>a+b,0)/lateDays.length,2):null;
  m.averageConfirmationHours=confirmationHours.length?round(confirmationHours.reduce((a,b)=>a+b,0)/confirmationHours.length,2):null;
  m.claims.averageResolutionHours=resolutionHours.length?round(resolutionHours.reduce((a,b)=>a+b,0)/resolutionHours.length,2):null;
  return m;
}
function supplierPerformance(register,options={}){
  const groups=new Map();
  for(const po of latestOrders(register)){
    const id=supplierIdentity(po);if(!id.key)continue;
    if(!groups.has(id.key))groups.set(id.key,[]);groups.get(id.key).push(po);
  }
  return [...groups.values()].map(g=>metricsForOrders(g,options)).sort((a,b)=>a.supplier.name.localeCompare(b.supplier.name,'fr-CA'));
}
function findSupplierPerformance(register,supplier,options={}){
  const q=text(supplier).toLowerCase();
  return supplierPerformance(register,options).find(m=>text(m.supplier.id).toLowerCase()===q||text(m.supplier.name).toLowerCase()===q)||null;
}
function sortPerformance(metrics,field='rejectedUnits',direction='desc'){
  const dir=direction==='asc'?1:-1;
  const value=(m)=>{
    if(field==='rejectionRate')return m.rejectionRate??-1;
    if(field==='lateDeliveries')return m.lateDeliveries;
    if(field==='openClaims')return m.claims.open;
    if(field==='orders')return m.orders;
    return num(m[field]);
  };
  return (metrics||[]).map(clone).sort((a,b)=>dir*(value(a)-value(b))||a.supplier.name.localeCompare(b.supplier.name,'fr-CA'));
}
function claimAging(register,{now=new Date().toISOString()}={}){
  const nowMs=Date.parse(now);const out=[];
  for(const po of latestOrders(register))for(const c of po.claims||[]){
    if(['resolved','void'].includes(c.status))continue;
    const start=Date.parse(c.createdAt||'');const age=Number.isFinite(start)&&Number.isFinite(nowMs)?Math.max(0,Math.floor((nowMs-start)/86400000)):null;
    out.push({supplier:supplierIdentity(po),poId:po.id,poNumber:po.poNumber,claimId:c.id,status:c.status,quantity:num(c.quantity),reason:text(c.reason),ageDays:age,createdAt:text(c.createdAt)});
  }
  return out.sort((a,b)=>(b.ageDays??-1)-(a.ageDays??-1)||String(a.poNumber).localeCompare(String(b.poNumber)));
}
return{latestOrders,supplierIdentity,targetDate,finalReceiptAt,daysLate,metricsForOrders,supplierPerformance,findSupplierPerformance,sortPerformance,claimAging};
});
