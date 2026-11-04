const clone = (v) => JSON.parse(JSON.stringify(v));
const iso = (v = new Date()) => (v instanceof Date ? v : new Date(v)).toISOString();
const text = (v, label) => { const x = String(v ?? '').trim(); if (!x) throw new Error(`${label} requis`); return x; };
const qty = (v, label='Quantité') => { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new Error(`${label} invalide`); return n; };

function makeId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function conflict(expected,actual){const e=new Error(`Conflit de révision : attendu ${expected}, actuel ${actual}`);e.code='REVISION_CONFLICT';return e}

export function createStoreState({organizationId='MIR', now=new Date()}={}){
  return {schemaVersion:1,organizationId:text(organizationId,'Organisation'),revision:1,updatedAt:iso(now),catalog:[],inventory:{},orders:[],favoritesByUser:{},events:[]};
}

function mutate(state, expectedRevision, event, now=new Date()){
  if(expectedRevision!==state.revision) throw conflict(expectedRevision,state.revision);
  const next=clone(state);next.revision+=1;next.updatedAt=iso(now);next.events.push({at:next.updatedAt,kind:event,revision:next.revision});return next;
}

export function upsertCatalogItem(state,item,{expectedRevision,now=new Date()}={}){
  const id=text(item?.id,'ID article'), name=text(item?.name,'Nom article'), unit=text(item?.unit||'un','Unité');
  let next=mutate(state,expectedRevision,'catalog-upsert',now);
  const normalized={id,name,unit,category:String(item?.category||''),variant:String(item?.variant||''),active:item?.active!==false};
  const i=next.catalog.findIndex(x=>x.id===id); if(i>=0) next.catalog[i]=normalized; else next.catalog.push(normalized);
  next.inventory[id] ||= {physical:0,reserved:0}; return next;
}

export function adjustStock(state,{itemId,delta,idempotencyKey,reason='',actorRole='admin'},{expectedRevision,now=new Date()}={}){
  if(actorRole!=='admin') throw new Error('Admin requis pour ajuster le stock');
  const id=text(itemId,'Article'), key=text(idempotencyKey,'Clé idempotence');
  if(state.events.some(e=>e.kind==='stock-adjustment'&&e.idempotencyKey===key)) return clone(state);
  if(!state.inventory[id]) throw new Error('Article inventaire inconnu');
  const change=Number(delta); if(!Number.isFinite(change)||change===0) throw new Error('Ajustement stock invalide');
  const next=mutate(state,expectedRevision,'stock-adjustment',now);
  const inv=next.inventory[id];
  if(inv.physical+change < inv.reserved) throw new Error('Stock physique ne peut pas être inférieur au réservé');
  inv.physical+=change;
  const evt=next.events[next.events.length-1];Object.assign(evt,{itemId:id,delta:change,idempotencyKey:key,reason:String(reason||'')});
  return next;
}

export function createEmployeeOrder(state,{id,organizationId,chantierId,requestedBy,lines,authorized},{expectedRevision,now=new Date()}={}){
  if(!authorized) throw new Error('Accès chantier refusé');
  if(text(organizationId,'Organisation')!==state.organizationId) throw new Error('Organisation incompatible');
  const normalizedLines=(lines||[]).map((l,i)=>({lineId:String(l.lineId||`L${i+1}`),itemId:text(l.itemId,'Article'),requested:qty(l.quantity,'Quantité demandée'),reserved:0,delivered:0,note:String(l.note||'')}));
  if(!normalizedLines.length||normalizedLines.some(l=>l.requested<=0)) throw new Error('Commande sans quantité valide');
  for(const l of normalizedLines) if(!state.inventory[l.itemId]) throw new Error(`Article inconnu: ${l.itemId}`);
  const next=mutate(state,expectedRevision,'employee-order-created',now);
  next.orders.push({id:String(id||makeId('order')),organizationId:state.organizationId,chantierId:text(chantierId,'Chantier'),requestedBy:text(requestedBy,'Employé'),status:'requested',createdAt:next.updatedAt,updatedAt:next.updatedAt,lines:normalizedLines,deliveries:[],reservationKeys:[],cancelledAt:null});
  return next;
}

function orderIndex(state,orderId){const i=state.orders.findIndex(o=>o.id===orderId);if(i<0)throw new Error('Commande inconnue');return i}

export function reserveOrder(state,{orderId,quantities,idempotencyKey,actorRole='admin'},{expectedRevision,now=new Date()}={}){
  if(actorRole!=='admin') throw new Error('Admin requis pour réserver');
  const key=text(idempotencyKey,'Clé idempotence'); const oi=orderIndex(state,orderId); const order=state.orders[oi];
  if(order.reservationKeys.includes(key)) return clone(state);
  if(['delivered','cancelled'].includes(order.status)) throw new Error('Commande non réservable');
  const requestMap=new Map(Object.entries(quantities||{}).map(([k,v])=>[k,qty(v)]));
  const next=mutate(state,expectedRevision,'order-reserved',now);const o=next.orders[oi];
  for(const l of o.lines){const add=requestMap.get(l.lineId)??0;if(add===0)continue;const remaining=l.requested-l.reserved;if(add>remaining+1e-9)throw new Error(`Réservation dépasse le besoin ${l.lineId}`);const inv=next.inventory[l.itemId];const available=inv.physical-inv.reserved;if(add>available+1e-9)throw new Error(`Stock insuffisant ${l.itemId}`);l.reserved+=add;inv.reserved+=add;}
  o.reservationKeys.push(key);o.status=o.lines.every(l=>l.reserved>=l.requested-1e-9)?'preparing':'requested';o.updatedAt=next.updatedAt;Object.assign(next.events.at(-1),{orderId,key});return next;
}

export function recordEmployeeDelivery(state,{orderId,lines,idempotencyKey,deliveredBy,packingSlip=''},{expectedRevision,now=new Date()}={}){
  const key=text(idempotencyKey,'Clé idempotence');const oi=orderIndex(state,orderId);const order=state.orders[oi];
  if(order.deliveries.some(d=>d.idempotencyKey===key)) return clone(state);
  if(order.status==='cancelled') throw new Error('Commande annulée');
  const list=(lines||[]).map(x=>({lineId:text(x.lineId,'Ligne'),quantity:qty(x.quantity)}));if(!list.length||list.some(x=>x.quantity<=0))throw new Error('Livraison vide');
  const next=mutate(state,expectedRevision,'order-delivery',now);const o=next.orders[oi];
  for(const item of list){const l=o.lines.find(x=>x.lineId===item.lineId);if(!l)throw new Error(`Ligne inconnue ${item.lineId}`);const reservedRemaining=l.reserved-l.delivered;const requestedRemaining=l.requested-l.delivered;if(item.quantity>reservedRemaining+1e-9)throw new Error(`Livraison dépasse le réservé ${l.lineId}`);if(item.quantity>requestedRemaining+1e-9)throw new Error(`Livraison dépasse le demandé ${l.lineId}`);const inv=next.inventory[l.itemId];if(inv.physical<item.quantity-1e-9||inv.reserved<item.quantity-1e-9)throw new Error(`Inventaire incohérent ${l.itemId}`);inv.physical-=item.quantity;inv.reserved-=item.quantity;l.delivered+=item.quantity;}
  o.deliveries.push({id:makeId('delivery'),idempotencyKey:key,lines:clone(list),deliveredBy:text(deliveredBy,'Livreur'),packingSlip:String(packingSlip||''),at:next.updatedAt});
  const all=o.lines.every(l=>l.delivered>=l.requested-1e-9);o.status=all?'delivered':'partially_delivered';o.updatedAt=next.updatedAt;Object.assign(next.events.at(-1),{orderId,key});return next;
}

export function cancelEmployeeOrder(state,{orderId,reason='',actorRole='admin'},{expectedRevision,now=new Date()}={}){
  if(actorRole!=='admin') throw new Error('Admin requis pour annuler');const oi=orderIndex(state,orderId);const order=state.orders[oi];if(order.status==='delivered')throw new Error('Commande déjà livrée');if(order.status==='cancelled')return clone(state);
  const next=mutate(state,expectedRevision,'order-cancelled',now);const o=next.orders[oi];for(const l of o.lines){const release=l.reserved-l.delivered;if(release>0){next.inventory[l.itemId].reserved-=release;l.reserved=l.delivered;}}o.status='cancelled';o.cancelledAt=next.updatedAt;o.cancelReason=String(reason||'');o.updatedAt=next.updatedAt;return next;
}

export function orderSummary(order){return {requested:order.lines.reduce((s,l)=>s+l.requested,0),reservedOpen:order.lines.reduce((s,l)=>s+Math.max(0,l.reserved-l.delivered),0),delivered:order.lines.reduce((s,l)=>s+l.delivered,0),remaining:order.lines.reduce((s,l)=>s+Math.max(0,l.requested-l.delivered),0),status:order.status};}
export function inventoryView(state,itemId){const inv=state.inventory[itemId];if(!inv)throw new Error('Article inconnu');return {physical:inv.physical,reserved:inv.reserved,available:inv.physical-inv.reserved};}

export function searchCatalog(state,{query='',category='',activeOnly=true}={}){
  const q=String(query||'').trim().toLowerCase(); const cat=String(category||'').trim().toLowerCase();
  return state.catalog.filter(item=>{
    if(activeOnly && item.active===false) return false;
    if(cat && String(item.category||'').toLowerCase()!==cat) return false;
    if(!q) return true;
    return [item.id,item.name,item.variant,item.category].some(v=>String(v||'').toLowerCase().includes(q));
  }).map(clone);
}

export function setFavorite(state,{userId,itemId,favorite=true},{expectedRevision,now=new Date()}={}){
  const user=text(userId,'Utilisateur'), id=text(itemId,'Article'); if(!state.catalog.some(x=>x.id===id)) throw new Error('Article inconnu');
  const current=new Set(state.favoritesByUser?.[user]||[]); const wanted=!!favorite;
  if(current.has(id)===wanted) return clone(state);
  const next=mutate(state,expectedRevision,'favorite-updated',now); next.favoritesByUser ||= {}; const set=new Set(next.favoritesByUser[user]||[]); if(wanted)set.add(id);else set.delete(id);next.favoritesByUser[user]=[...set];Object.assign(next.events.at(-1),{userId:user,itemId:id,favorite:wanted});return next;
}

export function listFavorites(state,userId){const ids=new Set(state.favoritesByUser?.[String(userId)]||[]);return state.catalog.filter(x=>ids.has(x.id)&&x.active!==false).map(clone)}

export function serializeStore(state){return JSON.stringify(state,null,2)}
export function restoreStore(raw){const s=typeof raw==='string'?JSON.parse(raw):clone(raw);if(s?.schemaVersion!==1||!Number.isInteger(s.revision))throw new Error('Sauvegarde magasin invalide');s.favoritesByUser ||= {};return s}
