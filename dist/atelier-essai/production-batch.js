'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.MIRProductionBatch=api;
})(typeof window==='object'?window:null,function(){
  const STATUS=Object.freeze({DRAFT:'draft',READY:'ready',RELEASED:'released',REVISED:'revised',CANCELLED:'cancelled'});
  const clone=(v)=>JSON.parse(JSON.stringify(v));
  const deepFreeze=(v)=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))deepFreeze(x)}return v};
  const text=(v)=>String(v??'').trim();
  const num=(v)=>{if(v===''||v===null||v===undefined)return null;const n=Number(v);return Number.isFinite(n)?n:null};
  const nowIso=(v)=>v?new Date(v).toISOString():new Date().toISOString();
  const assert=(c,m)=>{if(!c)throw new Error(m)};
  const makeId=(p='id')=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  function stableStringify(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return`[${v.map(stableStringify).join(',')}]`;return`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`}
  function fingerprint(v){const s=stableStringify(v);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}
  function conflict(expected,actual){const e=new Error(`Conflit de révision : attendu ${expected}, actuel ${actual}`);e.code='REVISION_CONFLICT';return e}
  function ensureExpected(batch,expected){if(!Number.isInteger(expected))throw new Error('expectedRevision requis');if(expected!==batch.revision)throw conflict(expected,batch.revision)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function sanitizeSvg(svg){const s=text(svg);if(!s)return'';if(!/^<svg[\s>]/i.test(s))throw new Error('Dessin SVG invalide');if(/<script\b|<foreignObject\b|\son[a-z]+\s*=|javascript:/i.test(s))throw new Error('Dessin SVG non sécuritaire');return s}

  function createProductionBatch(input={}){
    const at=nowIso(input.now);
    return {
      schemaVersion:1,
      id:text(input.id)||makeId('prod'),
      dossierId:text(input.dossierId),
      chantierId:text(input.chantierId),
      chantierName:text(input.chantierName),
      clientName:text(input.clientName),
      foreman:text(input.foreman),
      internalOrderRef:text(input.internalOrderRef),
      status:STATUS.DRAFT,
      revision:1,
      items:[],
      supplierRefs:[],
      releases:[],
      notes:text(input.notes),
      createdAt:at,updatedAt:at,createdBy:text(input.createdBy)||'MIR admin',updatedBy:text(input.createdBy)||'MIR admin',
      history:[{kind:'created',revision:1,at,by:text(input.createdBy)||'MIR admin'}]
    };
  }

  function normalizeItem(input={},index=0){
    const sourceSnapshot=input.sourceSnapshot?clone(input.sourceSnapshot):null;
    const quantity=num(input.quantity??sourceSnapshot?.metadata?.quantity??1);
    assert(quantity!==null&&quantity>0,`Quantité invalide pour la pièce ${index+1}`);
    const lengthIn=num(input.lengthIn??sourceSnapshot?.metadata?.lengthIn);
    const item={
      id:text(input.id)||makeId('piece'),
      sourceItemId:text(input.sourceItemId||sourceSnapshot?.metadata?.sourceItemId),
      sourceTransferKey:text(input.sourceTransferKey),
      kind:text(input.kind||sourceSnapshot?.kind||'manual-production-piece'),
      description:text(input.description||sourceSnapshot?.metadata?.description||sourceSnapshot?.templateId||`Pièce ${index+1}`),
      material:text(input.material||sourceSnapshot?.metadata?.material),
      gauge:text(input.gauge||sourceSnapshot?.metadata?.gauge||sourceSnapshot?.metadata?.thickness),
      color:text(input.color||sourceSnapshot?.metadata?.color),
      colorCode:text(input.colorCode||sourceSnapshot?.metadata?.colorCode),
      quantity,
      lengthIn,
      unit:text(input.unit||'pièce'),
      drawingSvg:sanitizeSvg(input.drawingSvg||sourceSnapshot?.drawingSvg||''),
      sourceSnapshot,
      ruleExceptions:clone(input.ruleExceptions||sourceSnapshot?.ruleExceptions||[]),
      ruleActions:clone(input.ruleActions||sourceSnapshot?.ruleActions||[]),
      metadata:clone(input.metadata||sourceSnapshot?.metadata||{}),
      createdAt:nowIso(input.now)
    };
    item.snapshotFingerprint=fingerprint({sourceSnapshot:item.sourceSnapshot,quantity:item.quantity,lengthIn:item.lengthIn,material:item.material,gauge:item.gauge,color:item.color,colorCode:item.colorCode,drawingSvg:item.drawingSvg,ruleExceptions:item.ruleExceptions});
    return item;
  }

  function mutate(batch,expectedRevision,kind,actor='MIR admin',now){
    ensureExpected(batch,expectedRevision);assert(batch.status===STATUS.DRAFT,'Le dossier de production doit être en brouillon.');
    const next=clone(batch);next.revision+=1;next.updatedAt=nowIso(now);next.updatedBy=text(actor)||'MIR admin';next.history.push({kind,revision:next.revision,at:next.updatedAt,by:next.updatedBy});return next;
  }

  function addProductionItem(batch,input={},opts={}){
    const item=normalizeItem(input,batch.items.length);
    const key=text(input.sourceTransferKey)||`${text(input.sourceItemId)||item.id}:${item.snapshotFingerprint}`;
    const existing=batch.items.find(x=>x.sourceTransferKey===key||(!x.sourceTransferKey&&x.sourceItemId&&x.sourceItemId===item.sourceItemId&&x.snapshotFingerprint===item.snapshotFingerprint));
    if(existing)return clone(batch);
    const next=mutate(batch,opts.expectedRevision,'production-item-added',opts.actor,opts.now);item.sourceTransferKey=key;next.items.push(item);return next;
  }

  function importDossierTransfers(batch,dossier,opts={}){
    let next=clone(batch);let expected=opts.expectedRevision;
    for(const transfer of dossier?.productionTransfers||[]){
      const before=next.revision;
      next=addProductionItem(next,{sourceItemId:transfer.sourceItemId,sourceTransferKey:transfer.transferKey,sourceSnapshot:transfer.snapshot,description:transfer.snapshot?.metadata?.description||transfer.sourceItemId},{expectedRevision:expected,actor:opts.actor,now:opts.now});
      if(next.revision!==before)expected=next.revision;
    }
    return next;
  }

  function updateProductionItem(batch,itemId,patch={},opts={}){
    const idx=batch.items.findIndex(x=>x.id===itemId);if(idx<0)throw new Error('Pièce de production inconnue');
    const next=mutate(batch,opts.expectedRevision,'production-item-updated',opts.actor,opts.now);
    const current=next.items[idx];const merged=normalizeItem({...current,...clone(patch),id:current.id,sourceSnapshot:current.sourceSnapshot,sourceItemId:current.sourceItemId,sourceTransferKey:current.sourceTransferKey,now:current.createdAt},idx);
    merged.createdAt=current.createdAt;next.items[idx]=merged;return next;
  }

  function removeProductionItem(batch,itemId,opts={}){
    const idx=batch.items.findIndex(x=>x.id===itemId);if(idx<0)return clone(batch);
    const next=mutate(batch,opts.expectedRevision,'production-item-removed',opts.actor,opts.now);next.items.splice(idx,1);return next;
  }

  function linkSupplierPo(batch,ref={},opts={}){
    const poId=text(ref.poId),poNumber=text(ref.poNumber);assert(poId&&poNumber,'Référence bon fournisseur requise');
    const revision=Number(ref.revision||1);assert(Number.isInteger(revision)&&revision>0,'Révision bon fournisseur invalide');
    const key=`${poId}:r${revision}`;if(batch.supplierRefs.some(x=>x.key===key))return clone(batch);
    const next=mutate(batch,opts.expectedRevision,'supplier-po-linked',opts.actor,opts.now);next.supplierRefs.push({key,poId,poNumber,revision,supplierName:text(ref.supplierName),status:text(ref.status||'draft'),linkedAt:next.updatedAt});return next;
  }

  function validationIssues(batch){
    const issues=[];
    if(!text(batch.chantierId)&&!text(batch.chantierName))issues.push({code:'CHANTIER_REQUIRED',message:'Chantier requis'});
    if(!batch.items.length)issues.push({code:'ITEM_REQUIRED',message:'Au moins une pièce de production est requise'});
    batch.items.forEach((item,i)=>{
      const label=item.description||`Pièce ${i+1}`;
      if(!item.material)issues.push({code:'MATERIAL_REQUIRED',itemId:item.id,message:`Matière requise — ${label}`});
      if(!item.color)issues.push({code:'COLOR_REQUIRED',itemId:item.id,message:`Couleur requise — ${label}`});
      if(!(item.quantity>0))issues.push({code:'QUANTITY_INVALID',itemId:item.id,message:`Quantité invalide — ${label}`});
      if(item.kind==='mir-production-profile'&&!item.sourceSnapshot?.geometry)issues.push({code:'GEOMETRY_REQUIRED',itemId:item.id,message:`Géométrie requise — ${label}`});
      for(const ex of item.ruleExceptions||[]){
        if(ex?.accepted!==true||!text(ex.acceptedBy))issues.push({code:'UNAPPROVED_EXCEPTION',itemId:item.id,message:`Exception non approuvée — ${label}`});
      }
    });
    return issues;
  }

  function markReady(batch,opts={}){
    ensureExpected(batch,opts.expectedRevision);assert(batch.status===STATUS.DRAFT,'Le dossier doit être en brouillon');const issues=validationIssues(batch);if(issues.length){const e=new Error(issues.map(x=>x.message).join(' | '));e.code='PRODUCTION_VALIDATION_FAILED';e.issues=issues;throw e}
    const next=clone(batch);next.status=STATUS.READY;next.revision+=1;next.updatedAt=nowIso(opts.now);next.updatedBy=text(opts.actor)||'MIR admin';next.readyAt=next.updatedAt;next.history.push({kind:'ready',revision:next.revision,at:next.updatedAt,by:next.updatedBy});return next;
  }

  function releaseProduction(batch,opts={}){
    ensureExpected(batch,opts.expectedRevision);assert(batch.status===STATUS.READY,'Le dossier doit être prêt avant libération');assert(text(opts.releasedBy),'Identité du libérateur requise');
    const content={dossierId:batch.dossierId,chantierId:batch.chantierId,chantierName:batch.chantierName,clientName:batch.clientName,foreman:batch.foreman,internalOrderRef:batch.internalOrderRef,items:batch.items,supplierRefs:batch.supplierRefs,notes:batch.notes};
    const fp=fingerprint(content);const existing=(batch.releases||[]).find(r=>r.contentFingerprint===fp);if(existing)return clone(batch);
    const next=clone(batch);const at=nowIso(opts.now);const releaseNumber=(next.releases.at(-1)?.releaseNumber||0)+1;
    const release=deepFreeze({id:makeId('release'),releaseNumber,batchId:next.id,batchRevision:next.revision,contentFingerprint:fp,releasedAt:at,releasedBy:text(opts.releasedBy),status:'released',snapshot:clone(content),immutable:true});
    next.releases.push(release);next.status=STATUS.RELEASED;next.revision+=1;next.updatedAt=at;next.updatedBy=text(opts.releasedBy);next.releasedAt=at;next.history.push({kind:'released',revision:next.revision,releaseNumber,at,by:next.updatedBy,contentFingerprint:fp});return next;
  }

  function createProductionRevision(batch,reason='',opts={}){
    assert(batch.status===STATUS.RELEASED,'Seul un dossier libéré peut être révisé');const previous=clone(batch);previous.status=STATUS.REVISED;
    const next=clone(batch);next.id=makeId('prod');next.previousBatchId=batch.id;next.status=STATUS.DRAFT;next.revision=1;next.releases=[];next.readyAt=null;next.releasedAt=null;next.createdAt=nowIso(opts.now);next.updatedAt=next.createdAt;next.createdBy=text(opts.actor)||'MIR admin';next.updatedBy=next.createdBy;next.history=[{kind:'revision-created',revision:1,at:next.createdAt,by:next.createdBy,fromBatchId:batch.id,fromReleaseNumber:batch.releases.at(-1)?.releaseNumber||null,reason:text(reason)}];return {previous:deepFreeze(previous),revision:next};
  }

  function renderPieceDetails(item){
    const fields=item.sourceSnapshot?.values||item.sourceSnapshot?.fields||{};const geometry=item.sourceSnapshot?.geometry||{};
    const dims=Object.entries(fields).map(([k,v])=>`<li><b>${esc(k)}</b> : ${esc(v)}</li>`).join('');
    const angles=(geometry.segments||[]).map(s=>`<li>${esc(s.id||s.fieldId)} : ${esc(Number(s.headingDeg).toFixed(1))}° · ${esc(s.length)} po</li>`).join('');
    const ex=(item.ruleExceptions||[]).map(x=>`<li>${esc(x.rule||x.code||'Exception')} — actuel ${esc(x.currentIn??'—')} · minimum ${esc(x.minimumIn??'—')} · accepté par ${esc(x.acceptedBy||'—')}</li>`).join('');
    return `${dims?`<div><b>Cotes</b><ul>${dims}</ul></div>`:''}${angles?`<div><b>Segments / angles</b><ul>${angles}</ul></div>`:''}${ex?`<div class="warn"><b>Exception(s) acceptée(s)</b><ul>${ex}</ul></div>`:''}`;
  }

  function renderFabricationHtml(release,opts={}){
    assert(release?.immutable===true&&release?.snapshot,'Libération de production invalide');const s=release.snapshot;
    const cards=(s.items||[]).map((item,i)=>`<section class="piece"><div class="head"><h2>${esc(item.description||`Pièce ${i+1}`)}</h2><span>${esc(item.id)}</span></div><div class="meta"><b>Matière</b> ${esc(item.material||'—')} · <b>Calibre/épaisseur</b> ${esc(item.gauge||'—')} · <b>Couleur</b> ${esc(item.color||'—')} ${esc(item.colorCode||'')} · <b>Qté</b> ${esc(item.quantity)} ${esc(item.unit||'')}</div>${item.lengthIn!==null&&item.lengthIn!==undefined?`<div class="meta"><b>Longueur</b> ${esc(item.lengthIn)} po</div>`:''}${item.drawingSvg?`<div class="drawing">${sanitizeSvg(item.drawingSvg)}</div>`:''}${renderPieceDetails(item)}</section>`).join('');
    const suppliers=(s.supplierRefs||[]).map(x=>`${esc(x.poNumber)} r${esc(x.revision)} — ${esc(x.supplierName||'fournisseur')}`).join('<br>')||'Aucun bon fournisseur lié';
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>MIR — Mise en production</title><style>@page{size:letter;margin:12mm}body{font:12px system-ui;color:#17231d}header{border-bottom:3px solid #254b3c;padding-bottom:10px;margin-bottom:14px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.box{border:1px solid #ccd7d1;border-radius:7px;padding:9px}.piece{break-inside:avoid;border:1px solid #cfd9d4;border-radius:8px;padding:10px;margin:0 0 12px}.piece:nth-of-type(4n){break-after:page}.head{display:flex;justify-content:space-between;gap:12px}.head h2{font-size:16px;margin:0}.head span,.meta{color:#53645c}.drawing svg{width:100%;max-height:260px}.warn{background:#fff6df;border:1px solid #e6ce92;padding:8px;border-radius:6px}ul{margin:5px 0 0;padding-left:20px}</style></head><body><header><div>LES REVÊTEMENTS MIR</div><h1>Mise en production</h1><b>Libération #${esc(release.releaseNumber)}</b> · ${esc(release.releasedAt)} · ${esc(release.releasedBy)}</header><div class="grid"><div class="box"><b>Chantier</b><br>${esc(s.chantierName||s.chantierId||'—')}<br><b>Client</b> ${esc(s.clientName||'—')}<br><b>Contremaître</b> ${esc(s.foreman||'—')}</div><div class="box"><b>Référence / PO</b><br>${esc(s.internalOrderRef||'—')}<br><b>Bons fournisseurs</b><br>${suppliers}</div></div>${s.notes?`<div class="box"><b>Notes</b><br>${esc(s.notes).replace(/\n/g,'<br>')}</div>`:''}<h2>Pièces à fabriquer (${(s.items||[]).length})</h2>${cards}<footer>Snapshot immuable · empreinte ${esc(release.contentFingerprint)} · aucune pièce ne doit être redessinée sans nouvelle révision.</footer></body></html>`;
  }

  function fabricationManifest(release){assert(release?.snapshot,'Libération invalide');return deepFreeze({kind:'mir-fabrication-document',visibility:'private',serverAuthorizationRequired:true,audience:'workshop',releaseId:release.id,releaseNumber:release.releaseNumber,contentFingerprint:release.contentFingerprint,generatedAt:nowIso(),items:release.snapshot.items.map(x=>({id:x.id,sourceItemId:x.sourceItemId,quantity:x.quantity,snapshotFingerprint:x.snapshotFingerprint})),immutable:true});}

  function serialize(batch){return JSON.stringify(batch,null,2)}
  function restore(raw){const b=typeof raw==='string'?JSON.parse(raw):clone(raw);assert(b?.schemaVersion===1&&b.id&&Number.isInteger(b.revision),'Dossier production invalide');b.items=Array.isArray(b.items)?b.items:[];b.supplierRefs=Array.isArray(b.supplierRefs)?b.supplierRefs:[];b.releases=Array.isArray(b.releases)?b.releases:[];b.history=Array.isArray(b.history)?b.history:[];return b}

  return {STATUS,createProductionBatch,normalizeItem,addProductionItem,importDossierTransfers,updateProductionItem,removeProductionItem,linkSupplierPo,validationIssues,markReady,releaseProduction,createProductionRevision,renderFabricationHtml,fabricationManifest,serialize,restore,fingerprint,sanitizeSvg};
});
