/* Purchase-order revisions and PDF archive. No network send provider in this UI. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRPOWorkflow=api;})(typeof window==='object'?window:null,function(){
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v));
  const statuses=Object.freeze([['brouillon','Brouillon'],['a_valider','À valider'],['pret','Prêt à envoyer'],['envoye','Envoyé, non confirmé'],['envoye_manuellement','Déclaré envoyé manuellement'],['confirme','Confirmé, en attente de livraison'],['livraison_partielle','Livraison partielle'],['termine','Terminé'],['annule','Annulé']]);
  const locked=['envoye','envoye_manuellement','confirme','livraison_partielle','termine','annule'];
  const frozen=o=>!!o.pdf||!!o.sendReceipt||locked.includes(o.status)||(o.events||[]).some(e=>locked.includes(e.from)||locked.includes(e.to));
  function edit(order,orders,{reorder=false,number,id=globalThis.crypto?.randomUUID?.()}={}){
    const next=copy(order);if(!id)throw Error('Identifiant sûr indisponible');
    if(reorder||frozen(order)){
      next.id=id;next.rootId=reorder?id:(order.rootId||order.id);
      next.revision=reorder?1:Math.max(...orders.filter(x=>(x.rootId||x.id)===(order.rootId||order.id)).map(x=>Number(x.revision)||1))+1;
      next.previousId=order.id;next.status='brouillon';delete next.pdf;delete next.sendReceipt;
      next.createdAt=new Date().toISOString();next.events=[{type:reorder?'recommande':'revision',sourceId:order.id,at:next.createdAt}];
    }
    if(reorder){if(!String(number||'').trim())throw Error('Nouveau numéro requis');next.poNumber=String(number).trim();}
    return next;
  }
  function saveDraft(order,patch){
    if(frozen(order))throw Error('Créer une révision pour modifier ce bon');
    const next={...copy(order),...copy(patch),id:order.id,revision:order.revision,status:order.status};
    next.updatedAt=new Date().toISOString();return next;
  }
  function changeStatus(order,status){
    if(!statuses.some(([key])=>key===status))throw Error('Statut inconnu');
    if(status==='envoye')throw Error('Une preuve serveur est requise pour un envoi');
    const next=copy(order);next.status=status;next.updatedAt=new Date().toISOString();
    next.events=[...(next.events||[]),{type:'statut-manuel',from:order.status,to:status,at:next.updatedAt}];return next;
  }
  function search(orders,{history=false,query='',date=''}={}){
    const q=String(query).toLocaleLowerCase('fr-CA');
    return orders.filter(o=>['termine','annule'].includes(o.status)===history)
      .filter(o=>[o.poNumber,o.supplier?.name,o.job,o.createdAt,o.requestedDate].join(' ').toLocaleLowerCase('fr-CA').includes(q))
      .filter(o=>!date||String(o.createdAt||'').startsWith(date)||o.requestedDate===date).slice().reverse();
  }
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function pdfFaces(po,model){
    if(!po.items?.length)throw Error('Aucune pièce');
    for(const i of po.items){
      const kind=i?.spec?.kind||i?.kind;
      if(!['profile','panel'].includes(kind))throw Error('Type de pièce inconnu : '+(i?.id||'?'));
      const m=kind==='panel'?model.buildPanel(i.spec):model.buildProfile(i.spec);
      if(!m.valid||!m.complete)throw Error('Pièce incomplète : '+i.id+' — confirmez les cotes, le métal, les lèvres et la couleur avant le PDF.');
    }
    const lines=['LES REVÊTEMENTS MIR','BON DE COMMANDE '+po.poNumber+' — R'+po.revision,
      'Fournisseur : '+po.supplier.name,'Courriel : '+po.supplier.email,'Chantier : '+po.job,
      'Livrer à : '+po.shipTo,'Date souhaitée : '+(po.requestedDate||'À confirmer'),
      'Responsable : '+(po.foreman||'À préciser'),'Conditions : '+(po.terms||'À confirmer'),
      'Le fournisseur doit confirmer matériaux, prix et faisabilité.'];
    // Wrap long addresses/notes instead of clipping them out of the PDF.
    const wrapped=lines.flatMap(s=>String(s).match(/.{1,75}(?:\s|$)|.{1,75}/g)||['']);
    const covers=[];
    for(let offset=0;offset<wrapped.length;offset+=18)covers.push({name:'Bon '+po.poNumber,layout:'wide',summary:offset===0?[po.notes||'']:['Coordonnées — suite'],svg:'<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000"><rect width="1400" height="1000" fill="white"/>'+wrapped.slice(offset,offset+18).map((s,n)=>'<text x="45" y="'+(60+n*42)+'" font-family="Arial" font-size="25" fill="#283f31">'+esc(s)+'</text>').join('')+'</svg>'});
    return [...covers,...model.productionPages({poNumber:po.poNumber,project:po.job,foreman:po.foreman,date:po.requestedDate,notes:po.notes,revision:po.revision,items:po.items.map(i=>({...copy(i.spec),id:i.id}))},{layout:'bending-sheet'})];
  }
  function content(po){return JSON.stringify([po.poNumber,po.revision,po.supplier,po.job,po.shipTo,po.foreman,po.requestedDate,po.terms,po.notes,po.items]);}
  async function digest(bytes){return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
  async function archivePDF(po,make){
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('mir-purchase-order-pdfs',1);r.onupgradeneeded=()=>r.result.createObjectStore('documents',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const key=po.id+':r'+po.revision,contentHash=await digest(new TextEncoder().encode(content(po)));
    const get=()=>new Promise((resolve,reject)=>{const r=db.transaction('documents').objectStore('documents').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    try{
      const old=await get();if(old){if(old.contentHash!==contentHash)throw Error('PDF original conservé : créez une nouvelle révision');return old;}
      const result=await make();const doc={key,blob:result.blob,pages:result.pages,contentHash,sha256:await digest(await result.blob.arrayBuffer()),createdAt:new Date().toISOString()};
      await new Promise((resolve,reject)=>{const tx=db.transaction('documents','readwrite');tx.objectStore('documents').add(doc);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('Archivage impossible'));});
      return doc;
    }finally{db.close();}
  }
  return Object.freeze({statuses,frozen,edit,saveDraft,changeStatus,search,pdfFaces,archivePDF});
});
