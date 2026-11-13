/* MIR — Supplier purchase orders integration candidate.
 * ChatGPT Sites remains the source of truth. This module has no network transport
 * of its own: a purchase order is marked SENT only after a connected provider
 * returns a real success receipt.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MIRSupplierPO = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const deepFreeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const child of Object.values(value)) deepFreeze(child);
    }
    return value;
  };
  const nowIso = () => new Date().toISOString();
  const STATUS = Object.freeze({
    DRAFT:'draft', READY:'ready', SENT:'sent', ACKNOWLEDGED:'acknowledged',
    PARTIALLY_RECEIVED:'partially_received', RECEIVED:'received', REVISED:'revised', CANCELLED:'cancelled'
  });
  const ALLOWED_CURRENCIES = new Set(['CAD','USD']);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function text(value) { return String(value ?? '').trim(); }
  function number(value) {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  function money(value) {
    const n = number(value);
    return n === null ? null : Math.round((n + Number.EPSILON) * 100) / 100;
  }
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function makeId(prefix='id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  }
  function stableStringify(value) {
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+stableStringify(value[k])).join(',') + '}';
    }
    return JSON.stringify(value);
  }
  function hashText(input) {
    // FNV-1a 32 bit: deterministic idempotency/diff fingerprint, not cryptographic.
    let h = 0x811c9dc5;
    const s = String(input);
    for (let i=0;i<s.length;i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8,'0');
  }


  function sanitizeMirSvg(svg) {
    const raw=text(svg);
    if (!raw) return '';
    if (!/^<svg\b/i.test(raw) || !/<\/svg>\s*$/i.test(raw)) throw new Error('Dessin SVG fournisseur invalide.');
    if (/<script\b|<foreignObject\b|\son[a-z]+\s*=|javascript:/i.test(raw)) throw new Error('Dessin SVG fournisseur non sécuritaire.');
    return raw;
  }

  function normalizeSupplier(input={}) {
    const supplier = {
      id: text(input.id) || makeId('supplier'),
      name: text(input.name),
      contactName: text(input.contactName),
      email: text(input.email).toLowerCase(),
      cc: Array.isArray(input.cc) ? input.cc.map(v=>text(v).toLowerCase()).filter(Boolean) : [],
      phone: text(input.phone),
      address: text(input.address),
      language: text(input.language) || 'fr-CA',
      currency: text(input.currency || 'CAD').toUpperCase(),
      paymentTerms: text(input.paymentTerms),
      accountNumber: text(input.accountNumber),
      notes: text(input.notes)
    };
    assert(supplier.name, 'Le nom du fournisseur est requis.');
    if (supplier.email) assert(EMAIL_RE.test(supplier.email), 'Le courriel du fournisseur est invalide.');
    for (const cc of supplier.cc) assert(EMAIL_RE.test(cc), `Courriel CC invalide: ${cc}`);
    assert(ALLOWED_CURRENCIES.has(supplier.currency), 'Devise fournisseur non prise en charge.');
    return supplier;
  }

  function normalizeLine(input={}, index=0) {
    const quantity = number(input.quantity);
    const unitCost = money(input.unitCost);
    const line = {
      id: text(input.id) || `L${String(index+1).padStart(3,'0')}`,
      supplierSku: text(input.supplierSku),
      description: text(input.description),
      quantity,
      unit: text(input.unit) || 'unité',
      unitCost,
      currency: text(input.currency || 'CAD').toUpperCase(),
      projectRef: text(input.projectRef),
      destination: text(input.destination).toLowerCase()==='inventory' ? 'inventory' : 'chantier',
      inventoryItemId: text(input.inventoryItemId),
      source: input.source ? clone(input.source) : null,
      notes: text(input.notes)
    };
    assert(line.description, `Description requise pour la ligne ${line.id}.`);
    assert(quantity !== null && quantity > 0, `Quantité invalide pour la ligne ${line.id}.`);
    if (unitCost !== null) assert(unitCost >= 0, `Coût invalide pour la ligne ${line.id}.`);
    assert(ALLOWED_CURRENCIES.has(line.currency), `Devise invalide pour la ligne ${line.id}.`);
    return line;
  }

  function lineFromProductionPiece(piece, options={}) {
    assert(piece && typeof piece === 'object', 'Pièce de production requise.');
    const fields = piece.fields || piece.fieldsSnapshot || {};
    const values = Object.entries(fields)
      .filter(([,v]) => v !== '' && v !== null && v !== undefined)
      .map(([k,v]) => `${k}: ${v}`)
      .join(' · ');
    const templateName = text(options.templateName || piece.templateName || piece.templateId || 'Pièce MIR');
    return normalizeLine({
      supplierSku: options.supplierSku || '',
      description: text(options.description) || `${templateName}${values ? ' — ' + values : ''}`,
      quantity: options.quantity ?? piece.quantity ?? 1,
      unit: options.unit || 'pièce',
      unitCost: options.unitCost ?? null,
      currency: options.currency || 'CAD',
      projectRef: options.projectRef || piece.projectRef || '',
      source: {
        type:'mir-production-piece',
        orderPieceId: piece.orderPieceId || piece.id || '',
        templateId: piece.templateId || '',
        templateVersion: piece.templateVersion ?? null,
        redrawn: piece.redrawn === false ? false : undefined,
        values: clone(piece.values || piece.fields || piece.fieldsSnapshot || {}),
        ruleExceptions: clone(piece.ruleExceptions || []),
        drawingSvg: options.drawingSvg ? sanitizeMirSvg(options.drawingSvg) : ''
      },
      notes: options.notes || ''
    }, 0);
  }

  function createPurchaseOrder(input={}) {
    const supplier = normalizeSupplier(input.supplier || {});
    const lines = (input.lines || []).map(normalizeLine);
    const createdAt = text(input.createdAt) || nowIso();
    return {
      schemaVersion:1,
      id:text(input.id) || makeId('po'),
      poNumber:text(input.poNumber),
      revision:Number.isInteger(input.revision) && input.revision > 0 ? input.revision : 1,
      previousPoId:text(input.previousPoId),
      project:{
        id:text(input.project?.id),
        name:text(input.project?.name),
        chantier:text(input.project?.chantier),
        internalOrderRef:text(input.project?.internalOrderRef),
        requestedBy:text(input.project?.requestedBy)
      },
      supplier,
      currency:text(input.currency || supplier.currency || 'CAD').toUpperCase(),
      lines,
      notes:text(input.notes),
      requestedDeliveryDate:text(input.requestedDeliveryDate),
      shipTo:text(input.shipTo),
      status:STATUS.DRAFT,
      createdAt,
      updatedAt:createdAt,
      readyAt:null,
      sentAt:null,
      acknowledgedAt:null,
      cancelledAt:null,
      sendLog:[],
      revisionHistory:[],
      supplierConfirmation:null,
      receipts:[],
      claims:[],
      supplierNotice:null,
      metadata:clone(input.metadata || {})
    };
  }

  function cloneMutable(po) { return clone(po); }
  function ensureDraft(po) { assert(po.status === STATUS.DRAFT, 'Le bon doit être en brouillon pour être modifié.'); }

  function addLine(po, lineInput) {
    ensureDraft(po);
    const next=cloneMutable(po);
    next.lines.push(normalizeLine(lineInput,next.lines.length));
    next.updatedAt=nowIso();
    return next;
  }
  function addProductionPiece(po, piece, options={}) {
    return addLine(po, lineFromProductionPiece(piece, options));
  }
  function removeLine(po, lineId) {
    ensureDraft(po);
    const next=cloneMutable(po);
    next.lines=next.lines.filter(x=>x.id!==lineId);
    assert(next.lines.length !== po.lines.length, 'Ligne introuvable.');
    next.updatedAt=nowIso();
    return next;
  }
  function updatePurchaseOrder(po, patch={}) {
    ensureDraft(po);
    const next=cloneMutable(po);
    if (patch.poNumber !== undefined) next.poNumber=text(patch.poNumber);
    if (patch.notes !== undefined) next.notes=text(patch.notes);
    if (patch.requestedDeliveryDate !== undefined) next.requestedDeliveryDate=text(patch.requestedDeliveryDate);
    if (patch.shipTo !== undefined) next.shipTo=text(patch.shipTo);
    if (patch.project) next.project={...next.project,...Object.fromEntries(Object.entries(patch.project).map(([k,v])=>[k,text(v)]))};
    if (patch.supplier) next.supplier=normalizeSupplier({...next.supplier,...patch.supplier,id:next.supplier.id});
    next.updatedAt=nowIso();
    return next;
  }

  function totals(po) {
    let knownSubtotal=0, pricedLines=0, unpricedLines=0;
    for (const line of po.lines) {
      if (line.currency !== po.currency) continue;
      if (line.unitCost === null) unpricedLines++;
      else { knownSubtotal += line.quantity * line.unitCost; pricedLines++; }
    }
    return {
      currency:po.currency,
      knownSubtotal:money(knownSubtotal),
      pricedLines,
      unpricedLines,
      complete:po.lines.length>0 && unpricedLines===0 && pricedLines===po.lines.length
    };
  }

  function validateReady(po) {
    const issues=[];
    if (!po.poNumber) issues.push('Numéro de bon de commande requis.');
    if (!po.supplier?.name || /^à préciser$/i.test(po.supplier.name)) issues.push('Fournisseur requis.');
    if (!po.supplier?.email) issues.push('Courriel fournisseur requis pour l’envoi direct.');
    else if (!EMAIL_RE.test(po.supplier.email)) issues.push('Courriel fournisseur invalide.');
    if (!po.lines?.length) issues.push('Au moins une ligne est requise.');
    for (let i=0;i<(po.lines||[]).length;i++) {
      try { normalizeLine(po.lines[i],i); } catch(e) { issues.push(e.message); }
    }
    return {ok:issues.length===0,issues};
  }

  function markReady(po) {
    ensureDraft(po);
    const check=validateReady(po);
    assert(check.ok, check.issues.join(' '));
    const next=cloneMutable(po);
    next.status=STATUS.READY;
    next.readyAt=nowIso(); next.updatedAt=next.readyAt;
    return deepFreeze(next);
  }

  function contentFingerprint(po) {
    return hashText(stableStringify({
      id:po.id,poNumber:po.poNumber,revision:po.revision,project:po.project,supplier:po.supplier,
      currency:po.currency,lines:po.lines,notes:po.notes,requestedDeliveryDate:po.requestedDeliveryDate,shipTo:po.shipTo
    }));
  }

  function emailContent(po, options={}) {
    const supplierName=po.supplier.name;
    const subject=text(options.subject) || `Bon de commande MIR ${po.poNumber}${po.revision>1 ? ` — Révision ${po.revision}` : ''}`;
    const intro=text(options.message) || `Bonjour${po.supplier.contactName ? ' '+po.supplier.contactName : ''},\n\nVeuillez trouver ci-joint le bon de commande ${po.poNumber} de Les Revêtements MIR.`;
    const delivery=po.requestedDeliveryDate ? `\nDate demandée : ${po.requestedDeliveryDate}.` : '';
    const revisionNote=po.revision>1 ? `\nCette révision ${po.revision} remplace toute version précédente de ce bon.` : '';
    const body=`${intro}${delivery}${revisionNote}\n\nMerci de confirmer la réception et, si possible, la disponibilité/délai.\n\nLes Revêtements MIR`;
    return {to:po.supplier.email,cc:po.supplier.cc||[],subject,body,supplierName};
  }

  function prepareSend(po, options={}) {
    assert(po.status===STATUS.READY || po.status===STATUS.SENT, 'Le bon doit être prêt avant l’envoi.');
    const check=validateReady(po); assert(check.ok,check.issues.join(' '));
    const email=emailContent(po,options);
    const fingerprint=contentFingerprint(po);
    const idempotencyKey=`mir-po:${po.id}:r${po.revision}:${fingerprint}:${hashText(email.to)}`;
    return deepFreeze({
      poId:po.id,poNumber:po.poNumber,revision:po.revision,channel:'email',
      recipient:email.to,cc:email.cc,subject:email.subject,body:email.body,
      attachment:{kind:'purchase-order-pdf',fileName:`MIR-BC-${po.poNumber}-R${po.revision}.pdf`,contentFingerprint:fingerprint,sourceHtml:renderDocumentHtml(po)},
      idempotencyKey,preparedAt:nowIso()
    });
  }

  function appendLog(po, entry) {
    const next=cloneMutable(po);
    next.sendLog.push(entry);
    next.updatedAt=entry.at || nowIso();
    return next;
  }
  function existingSuccessfulSend(po, idempotencyKey) {
    return (po.sendLog||[]).find(x=>x.idempotencyKey===idempotencyKey && x.status==='sent') || null;
  }

  async function dispatchPurchaseOrder(po, sendRequest, provider) {
    assert(typeof provider === 'function', 'Aucun service d’envoi fournisseur connecté.');
    assert(sendRequest && sendRequest.poId===po.id, 'Requête d’envoi incompatible avec le bon.');
    const previous=existingSuccessfulSend(po,sendRequest.idempotencyKey);
    if (previous) return {po,receipt:clone(previous),duplicate:true};
    let result;
    try {
      result=await provider(clone(sendRequest));
    } catch(error) {
      const at=nowIso();
      const failed=appendLog(po,{id:makeId('send'),idempotencyKey:sendRequest.idempotencyKey,status:'failed',at,error:text(error?.message||error)});
      return {po:deepFreeze(failed),receipt:null,duplicate:false,error:text(error?.message||error)};
    }
    assert(result && result.ok===true, 'Le service d’envoi n’a pas confirmé la transmission.');
    assert(text(result.messageId)||text(result.providerReceipt), 'Le service doit fournir une preuve d’envoi.');
    const at=text(result.sentAt)||nowIso();
    let next=appendLog(po,{
      id:makeId('send'),idempotencyKey:sendRequest.idempotencyKey,status:'sent',at,
      provider:text(result.provider)||'email-provider',messageId:text(result.messageId),providerReceipt:text(result.providerReceipt),
      recipient:sendRequest.recipient,subject:sendRequest.subject
    });
    next.status=STATUS.SENT; next.sentAt=at; next.updatedAt=at;
    return {po:deepFreeze(next),receipt:clone(next.sendLog.at(-1)),duplicate:false};
  }


  function prepareCancellationSend(po, options={}) {
    assert(po.status===STATUS.CANCELLED, 'Le bon doit être annulé avant l’avis fournisseur.');
    assert(po.supplierNotice?.required===true, 'Aucun avis fournisseur requis pour ce bon.');
    const subject=text(options.subject)||`ANNULATION — Bon de commande MIR ${po.poNumber} — Révision ${po.revision}`;
    const body=text(options.message)||`Bonjour${po.supplier.contactName ? ' '+po.supplier.contactName : ''},\n\nLes Revêtements MIR annule le bon de commande ${po.poNumber}, révision ${po.revision}. Merci de confirmer la prise en compte de cette annulation.\n\nLes Revêtements MIR`;
    const fingerprint=contentFingerprint(po);
    return deepFreeze({
      poId:po.id,poNumber:po.poNumber,revision:po.revision,channel:'email',operation:'cancellation',
      recipient:po.supplier.email,cc:po.supplier.cc||[],subject,body,
      attachment:{kind:'purchase-order-cancellation-copy',fileName:`MIR-ANNULATION-${po.poNumber}-R${po.revision}.pdf`,contentFingerprint:fingerprint,sourceHtml:renderDocumentHtml(po,{cancelled:true})},
      idempotencyKey:`mir-po-cancel:${po.id}:r${po.revision}:${fingerprint}:${hashText(po.supplier.email)}`,
      preparedAt:nowIso()
    });
  }

  async function dispatchCancellationNotice(po, request, provider) {
    assert(typeof provider==='function','Aucun service d’envoi fournisseur connecté.');
    assert(po.status===STATUS.CANCELLED,'Le bon doit être annulé avant l’avis fournisseur.');
    assert(request?.operation==='cancellation' && request.poId===po.id,'Requête d’annulation incompatible avec le bon.');
    const previous=(po.sendLog||[]).find(x=>x.idempotencyKey===request.idempotencyKey && x.status==='cancellation-sent');
    if (previous) return {po,receipt:clone(previous),duplicate:true};
    let result;
    try { result=await provider(clone(request)); }
    catch(error) {
      const at=nowIso(); const next=cloneMutable(po);
      next.sendLog.push({id:makeId('cancel-send'),idempotencyKey:request.idempotencyKey,status:'cancellation-failed',at,error:text(error?.message||error)});
      next.supplierNotice={...(next.supplierNotice||{}),status:'failed',lastAttemptAt:at,error:text(error?.message||error)};
      next.updatedAt=at; return {po:deepFreeze(next),receipt:null,duplicate:false,error:text(error?.message||error)};
    }
    assert(result&&result.ok===true,'Le service d’envoi n’a pas confirmé l’avis d’annulation.');
    assert(text(result.messageId)||text(result.providerReceipt),'Le service doit fournir une preuve d’envoi.');
    const at=text(result.sentAt)||nowIso(); const next=cloneMutable(po);
    const log={id:makeId('cancel-send'),idempotencyKey:request.idempotencyKey,status:'cancellation-sent',at,provider:text(result.provider)||'email-provider',messageId:text(result.messageId),providerReceipt:text(result.providerReceipt),recipient:request.recipient,subject:request.subject};
    next.sendLog.push(log); next.supplierNotice={...(next.supplierNotice||{}),status:'sent',sentAt:at,messageId:log.messageId,providerReceipt:log.providerReceipt}; next.updatedAt=at;
    return {po:deepFreeze(next),receipt:clone(log),duplicate:false};
  }

  function markAcknowledged(po, details={}) {
    assert(po.status===STATUS.SENT || po.status===STATUS.ACKNOWLEDGED, 'Le bon doit avoir été envoyé avant l’accusé de réception.');
    if (po.status===STATUS.ACKNOWLEDGED) return po;
    const next=cloneMutable(po); const at=text(details.at)||nowIso();
    next.status=STATUS.ACKNOWLEDGED; next.acknowledgedAt=at; next.updatedAt=at;
    next.sendLog.push({id:makeId('ack'),status:'acknowledged',at,by:text(details.by),note:text(details.note)});
    return deepFreeze(next);
  }


  function recordSupplierConfirmation(po, details={}) {
    assert([STATUS.SENT,STATUS.ACKNOWLEDGED,STATUS.PARTIALLY_RECEIVED].includes(po.status), 'Le bon doit avoir été envoyé avant de confirmer le fournisseur.');
    const next=cloneMutable(po); const at=text(details.at)||nowIso();
    next.supplierConfirmation={
      at,
      by:text(details.by),
      confirmationNumber:text(details.confirmationNumber),
      confirmedDeliveryDate:text(details.confirmedDeliveryDate),
      note:text(details.note)
    };
    if (next.status===STATUS.SENT) next.status=STATUS.ACKNOWLEDGED;
    next.acknowledgedAt=next.acknowledgedAt||at; next.updatedAt=at;
    next.sendLog.push({id:makeId('supplier-confirmation'),status:'supplier-confirmed',at,...clone(next.supplierConfirmation)});
    return deepFreeze(next);
  }

  function receiptSummary(po) {
    const ordered = Object.fromEntries((po.lines || []).map(line => [line.id, Number(line.quantity) || 0]));
    const received = Object.fromEntries(Object.keys(ordered).map(id => [id, 0]));
    const rejected = Object.fromEntries(Object.keys(ordered).map(id => [id, 0]));
    for (const receipt of po.receipts || []) {
      for (const item of receipt.items || []) {
        if (!Object.prototype.hasOwnProperty.call(received, item.lineId)) continue;
        received[item.lineId] += Number(item.quantity) || 0;
        rejected[item.lineId] += Number(item.rejectedQuantity) || 0;
      }
    }
    const lines=(po.lines || []).map(line => {
      const qty=ordered[line.id] || 0;
      const got=Math.round(((received[line.id] || 0)+Number.EPSILON)*1000000)/1000000;
      const bad=Math.round(((rejected[line.id] || 0)+Number.EPSILON)*1000000)/1000000;
      const remaining=Math.max(0,Math.round(((qty-got)+Number.EPSILON)*1000000)/1000000);
      return {lineId:line.id,description:line.description,ordered:qty,received:got,rejected:bad,remaining,unit:line.unit,destination:line.destination||'chantier',inventoryItemId:line.inventoryItemId||''};
    });
    const complete=lines.length>0 && lines.every(line => line.remaining <= 1e-9);
    const anyReceived=lines.some(line => line.received > 1e-9);
    const anyRejected=lines.some(line => line.rejected > 1e-9);
    return {lines,complete,anyReceived,anyRejected,totalLines:lines.length,openLines:lines.filter(x=>x.remaining>1e-9).length};
  }

  function receiptKey(po, details, normalized) {
    const explicit=text(details.idempotencyKey);
    if (explicit) return explicit;
    const slip=text(details.packingSlip);
    if (slip) return `mir-po-receipt:${po.id}:r${po.revision}:${slip.toLowerCase()}`;
    const id=text(details.id);
    if (id) return `mir-po-receipt:${po.id}:r${po.revision}:id:${id}`;
    return '';
  }

  function claimById(po, claimId) { return (po.claims||[]).find(c=>c.id===claimId) || null; }

  function recordReceipt(po, details={}) {
    assert([STATUS.SENT,STATUS.ACKNOWLEDGED,STATUS.PARTIALLY_RECEIVED].includes(po.status), 'Le bon doit avoir été envoyé avant une réception.');
    const items=Array.isArray(details.items)?details.items:[];
    assert(items.length>0,'Au moins une quantité reçue ou refusée est requise.');
    const summary=receiptSummary(po);
    const remainingById=Object.fromEntries(summary.lines.map(x=>[x.lineId,x.remaining]));
    const normalized=items.map((item,index)=>{
      const lineId=text(item.lineId); const quantity=number(item.quantity)??0; const rejectedQuantity=number(item.rejectedQuantity)??0;
      assert(lineId && Object.prototype.hasOwnProperty.call(remainingById,lineId),`Ligne de réception inconnue: ${lineId||index+1}`);
      assert(quantity>=0 && rejectedQuantity>=0 && quantity+rejectedQuantity>0,`Quantité reçue/refusée invalide pour ${lineId}.`);
      assert(quantity+rejectedQuantity<=remainingById[lineId]+1e-9,`Quantité reçue/refusée supérieure au restant pour ${lineId}.`);
      if (rejectedQuantity>0) assert(text(item.issue||details.issue),'Un motif est requis pour une quantité refusée/endommagée.');
      const claimId=text(item.claimId);
      if (claimId) {
        const claim=claimById(po,claimId);
        assert(claim,`Réclamation inconnue: ${claimId}.`);
        assert(claim.lineId===lineId,'La réclamation ne correspond pas à cette ligne.');
        assert(['replacement_pending','replacement_partial'].includes(claim.status),'La réclamation n’attend pas un remplacement.');
        assert(quantity>0 && rejectedQuantity===0,'Une réception de remplacement doit être acceptée.');
      }
      remainingById[lineId]-=(quantity+rejectedQuantity);
      return {lineId,quantity,rejectedQuantity,issue:text(item.issue||details.issue),claimId};
    });
    const key=receiptKey(po,details,normalized);
    const fingerprint=hashText(stableStringify({packingSlip:text(details.packingSlip),items:normalized,receivedBy:text(details.receivedBy)}));
    if (key) {
      const prior=(po.receipts||[]).find(r=>r.idempotencyKey===key);
      if (prior) {
        assert(prior.contentFingerprint===fingerprint,'Ce reçu/packing slip existe déjà avec un contenu différent.');
        return po;
      }
    }
    const at=text(details.at)||nowIso(); const next=cloneMutable(po);
    const receipt={id:text(details.id)||makeId('receipt'),idempotencyKey:key,contentFingerprint:fingerprint,at,receivedBy:text(details.receivedBy),packingSlip:text(details.packingSlip),note:text(details.note),items:normalized};
    next.receipts=[...(next.receipts||[]),receipt];
    // Replacement claims are resolved only by accepted replacement receipts.
    for (const item of normalized) {
      if (!item.claimId || item.quantity<=0) continue;
      const idx=(next.claims||[]).findIndex(c=>c.id===item.claimId);
      if (idx<0) continue;
      const c=next.claims[idx];
      const replacementReceived=(Number(c.replacementReceivedQuantity)||0)+item.quantity;
      c.replacementReceivedQuantity=replacementReceived;
      if (replacementReceived+1e-9 >= Number(c.resolutionQuantity||c.quantity||0)) {
        c.status='resolved'; c.resolvedAt=at; c.resolution={...(c.resolution||{}),type:'replacement',receiptId:receipt.id};
      } else c.status='replacement_partial';
    }
    const after=receiptSummary(next);
    next.status=after.complete?STATUS.RECEIVED:STATUS.PARTIALLY_RECEIVED;
    next.updatedAt=at;
    next.sendLog.push({id:makeId('receipt-log'),status:after.complete?'received':'partially-received',at,receiptId:receipt.id,packingSlip:receipt.packingSlip,items:clone(receipt.items)});
    return deepFreeze(next);
  }

  function rejectedUnclaimedQuantity(po, receiptId, lineId) {
    const receipt=(po.receipts||[]).find(r=>r.id===receiptId);
    assert(receipt,'Réception introuvable.');
    const rejected=(receipt.items||[]).filter(i=>i.lineId===lineId).reduce((a,i)=>a+(Number(i.rejectedQuantity)||0),0);
    const claimed=(po.claims||[]).filter(c=>c.receiptId===receiptId&&c.lineId===lineId&&c.status!=='void').reduce((a,c)=>a+(Number(c.quantity)||0),0);
    return Math.max(0,Math.round((rejected-claimed+Number.EPSILON)*1000000)/1000000);
  }

  function createSupplierClaim(po, details={}) {
    assert(![STATUS.DRAFT,STATUS.READY,STATUS.CANCELLED,STATUS.REVISED].includes(po.status),'Le bon doit avoir une réception fournisseur avant une réclamation.');
    const receiptId=text(details.receiptId), lineId=text(details.lineId), quantity=number(details.quantity);
    assert(receiptId && lineId,'Réception et ligne requises pour la réclamation.');
    assert(quantity!==null && quantity>0,'Quantité de réclamation invalide.');
    const available=rejectedUnclaimedQuantity(po,receiptId,lineId);
    assert(quantity<=available+1e-9,'Quantité réclamée supérieure à la quantité refusée disponible.');
    const reason=text(details.reason); assert(reason,'Motif de réclamation requis.');
    const createdBy=text(details.createdBy); assert(createdBy,'Identité requise pour ouvrir la réclamation.');
    const at=text(details.at)||nowIso(); const next=cloneMutable(po);
    const claim={id:text(details.id)||makeId('claim'),claimNumber:text(details.claimNumber),receiptId,lineId,quantity,reason,status:'open',createdBy,createdAt:at,updatedAt:at,notice:null,resolution:null,replacementReceivedQuantity:0};
    next.claims=[...(next.claims||[]),claim]; next.updatedAt=at;
    next.sendLog.push({id:makeId('claim-log'),status:'claim-opened',at,claimId:claim.id,receiptId,lineId,quantity,reason,createdBy});
    return deepFreeze(next);
  }

  function prepareClaimNotice(po, claimId, options={}) {
    const claim=claimById(po,claimId); assert(claim,'Réclamation introuvable.');
    assert(['open','notice_failed'].includes(claim.status),'Cette réclamation ne peut pas être envoyée dans son état actuel.');
    assert(po.supplier?.email,'Courriel fournisseur requis.');
    const line=(po.lines||[]).find(l=>l.id===claim.lineId); const receipt=(po.receipts||[]).find(r=>r.id===claim.receiptId);
    const subject=text(options.subject)||`RÉCLAMATION — ${po.poNumber} — ${claim.id}`;
    const body=text(options.message)||`Bonjour${po.supplier.contactName?' '+po.supplier.contactName:''},\n\nRéclamation liée au bon ${po.poNumber}, révision ${po.revision}.\nArticle : ${line?.description||claim.lineId}\nQuantité refusée : ${claim.quantity} ${line?.unit||''}\nBon de livraison : ${receipt?.packingSlip||'—'}\nMotif : ${claim.reason}\n\nMerci de confirmer le remplacement ou le crédit.\n\nLes Revêtements MIR`;
    return {operation:'supplier-claim',poId:po.id,poNumber:po.poNumber,revision:po.revision,claimId:claim.id,recipient:po.supplier.email,cc:clone(po.supplier.cc||[]),subject,body,idempotencyKey:`mir-po-claim:${po.id}:r${po.revision}:${claim.id}:${hashText(subject+body)}`};
  }

  async function dispatchClaimNotice(po, request, provider) {
    const claim=claimById(po,request?.claimId); assert(claim,'Réclamation introuvable.');
    assert(request?.operation==='supplier-claim'&&request.poId===po.id,'Requête de réclamation incompatible avec le bon.');
    const previous=(po.sendLog||[]).find(x=>x.idempotencyKey===request.idempotencyKey&&x.status==='claim-sent');
    if (previous) return {po,receipt:clone(previous),duplicate:true};
    assert(typeof provider==='function','Service d’envoi fournisseur non connecté.');
    let result; try { result=await provider(clone(request)); } catch(error) {
      const at=nowIso(); const next=cloneMutable(po); const idx=next.claims.findIndex(c=>c.id===claim.id); next.claims[idx].status='notice_failed'; next.claims[idx].updatedAt=at;
      next.sendLog.push({id:makeId('claim-send'),idempotencyKey:request.idempotencyKey,status:'claim-failed',at,claimId:claim.id,error:text(error?.message||error)}); next.updatedAt=at;
      return {po:deepFreeze(next),receipt:null,duplicate:false,error:text(error?.message||error)};
    }
    assert(result&&result.ok===true,'Le service d’envoi n’a pas confirmé la réclamation.');
    assert(text(result.messageId)||text(result.providerReceipt),'Le service doit fournir une preuve d’envoi.');
    const at=text(result.sentAt)||nowIso(); const next=cloneMutable(po); const idx=next.claims.findIndex(c=>c.id===claim.id);
    next.claims[idx].status='sent'; next.claims[idx].updatedAt=at; next.claims[idx].notice={sentAt:at,messageId:text(result.messageId),providerReceipt:text(result.providerReceipt),provider:text(result.provider)||'email-provider'};
    const log={id:makeId('claim-send'),idempotencyKey:request.idempotencyKey,status:'claim-sent',at,claimId:claim.id,messageId:text(result.messageId),providerReceipt:text(result.providerReceipt),provider:text(result.provider)||'email-provider'};
    next.sendLog.push(log); next.updatedAt=at; return {po:deepFreeze(next),receipt:clone(log),duplicate:false};
  }

  function authorizeClaimReplacement(po, claimId, details={}) {
    const claim=claimById(po,claimId); assert(claim,'Réclamation introuvable.'); assert(['open','sent','notice_failed'].includes(claim.status),'Réclamation déjà résolue ou en traitement.');
    const quantity=number(details.quantity)??claim.quantity; assert(quantity>0&&quantity<=claim.quantity+1e-9,'Quantité de remplacement invalide.');
    const reference=text(details.reference); assert(reference,'Référence/autorisation fournisseur requise pour le remplacement.');
    const at=text(details.at)||nowIso(); const next=cloneMutable(po); const idx=next.claims.findIndex(c=>c.id===claimId);
    next.claims[idx].status='replacement_pending'; next.claims[idx].resolutionQuantity=quantity; next.claims[idx].resolution={type:'replacement',reference,authorizedAt:at,authorizedBy:text(details.authorizedBy)}; next.claims[idx].updatedAt=at; next.updatedAt=at;
    return deepFreeze(next);
  }

  function resolveClaimWithCredit(po, claimId, details={}) {
    const claim=claimById(po,claimId); assert(claim,'Réclamation introuvable.'); assert(!['resolved','void'].includes(claim.status),'Réclamation déjà résolue.');
    const creditMemoNumber=text(details.creditMemoNumber); assert(creditMemoNumber,'Numéro de note de crédit requis.');
    const amount=money(details.amount); assert(amount!==null&&amount>=0,'Montant du crédit invalide.');
    const resolvedBy=text(details.resolvedBy); assert(resolvedBy,'Identité requise pour fermer la réclamation.');
    const at=text(details.at)||nowIso(); const next=cloneMutable(po); const idx=next.claims.findIndex(c=>c.id===claimId);
    next.claims[idx].status='resolved'; next.claims[idx].resolvedAt=at; next.claims[idx].updatedAt=at; next.claims[idx].resolution={type:'credit',creditMemoNumber,amount,currency:text(details.currency||po.currency||'CAD').toUpperCase(),resolvedBy,proof:text(details.proof)}; next.updatedAt=at;
    next.sendLog.push({id:makeId('claim-credit'),status:'claim-resolved-credit',at,claimId,creditMemoNumber,amount,resolvedBy});
    return deepFreeze(next);
  }

  function claimSummary(po) {
    const claims=(po.claims||[]).map(c=>clone(c));
    return {claims,total:claims.length,open:claims.filter(c=>c.status!=='resolved'&&c.status!=='void').length,resolved:claims.filter(c=>c.status==='resolved').length};
  }


  function deliveryState(po, options={}) {
    if (po.status===STATUS.RECEIVED) return {status:'received',overdue:false,daysLate:0,targetDate:po.supplierConfirmation?.confirmedDeliveryDate||po.requestedDeliveryDate||''};
    if ([STATUS.CANCELLED,STATUS.REVISED,STATUS.DRAFT].includes(po.status)) return {status:'not-applicable',overdue:false,daysLate:0,targetDate:''};
    const target=text(po.supplierConfirmation?.confirmedDeliveryDate||po.requestedDeliveryDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) return {status:'date-missing',overdue:false,daysLate:0,targetDate:''};
    const nowText=text(options.now)||nowIso(); const today=nowText.slice(0,10);
    const targetMs=Date.parse(target+'T23:59:59Z'); const nowMs=Date.parse(today+'T23:59:59Z');
    if (!Number.isFinite(targetMs)||!Number.isFinite(nowMs)) return {status:'date-invalid',overdue:false,daysLate:0,targetDate:target};
    const diffDays=Math.max(0,Math.floor((nowMs-targetMs)/86400000));
    if (nowMs>targetMs) return {status:'overdue',overdue:true,daysLate:diffDays||1,targetDate:target};
    if (today===target) return {status:'due-today',overdue:false,daysLate:0,targetDate:target};
    return {status:'scheduled',overdue:false,daysLate:0,targetDate:target};
  }

  function followUpState(po, options={}) {
    if (![STATUS.SENT,STATUS.ACKNOWLEDGED].includes(po.status)) return {needed:false,reason:'not-applicable'};
    if (po.supplierConfirmation || po.status===STATUS.ACKNOWLEDGED) return {needed:false,reason:'acknowledged'};
    const sentAt=Date.parse(po.sentAt||'');
    if (!Number.isFinite(sentAt)) return {needed:false,reason:'missing-sent-date'};
    const now=Date.parse(text(options.now)||nowIso());
    const hours=Math.max(1,Number(options.afterHours)||24);
    const dueAt=sentAt+hours*3600*1000;
    return {needed:now>=dueAt,reason:now>=dueAt?'supplier-confirmation-overdue':'waiting',dueAt:new Date(dueAt).toISOString(),hours};
  }

  function createRevision(po, reason='') {
    assert(po.status!==STATUS.DRAFT, 'Un brouillon peut être modifié directement; aucune révision n’est nécessaire.');
    const source=clone(po);
    const revised=clone(po);
    revised.id=makeId('po'); revised.previousPoId=po.id; revised.revision=po.revision+1;
    revised.status=STATUS.DRAFT; revised.createdAt=nowIso(); revised.updatedAt=revised.createdAt;
    revised.readyAt=null; revised.sentAt=null; revised.acknowledgedAt=null; revised.cancelledAt=null; revised.sendLog=[]; revised.supplierConfirmation=null; revised.receipts=[]; revised.claims=[];
    revised.revisionHistory=[...(po.revisionHistory||[]),{fromPoId:po.id,fromRevision:po.revision,reason:text(reason),at:revised.createdAt}];
    source.status=STATUS.REVISED;
    return {previous:deepFreeze(source),revision:revised};
  }

  function cancelPurchaseOrder(po, details={}) {
    assert(po.status!==STATUS.CANCELLED, 'Le bon est déjà annulé.');
    assert(po.status!==STATUS.RECEIVED, 'Un bon entièrement reçu ne peut pas être annulé.');
    const priorStatus=po.status; const next=cloneMutable(po); const at=text(details.at)||nowIso();
    next.status=STATUS.CANCELLED; next.cancelledAt=at; next.updatedAt=at;
    const noticeRequired=[STATUS.SENT,STATUS.ACKNOWLEDGED,STATUS.PARTIALLY_RECEIVED].includes(priorStatus);
    next.supplierNotice={type:'cancellation',required:noticeRequired,status:noticeRequired?'pending':'not-required',createdAt:at};
    next.sendLog.push({id:makeId('cancel'),status:'cancelled',at,by:text(details.by),note:text(details.note),supplierNoticeRequired:noticeRequired});
    return deepFreeze(next);
  }

  function escapeHtml(value) { return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function formatMoney(value,currency='CAD') { return value===null||value===undefined ? 'À confirmer' : new Intl.NumberFormat('fr-CA',{style:'currency',currency}).format(value); }
  function renderDocumentHtml(po, options={}) {
    const t=totals(po);
    const rows=po.lines.map((l,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(l.supplierSku||'—')}</td><td>${escapeHtml(l.description)}</td><td>${escapeHtml(l.quantity)} ${escapeHtml(l.unit)}</td><td>${formatMoney(l.unitCost,l.currency)}</td><td>${l.unitCost===null?'À confirmer':formatMoney(l.quantity*l.unitCost,l.currency)}</td></tr>`).join('');
    const drawings=po.lines.map((l,i)=>{
      if(l.source?.type!=='mir-production-piece'||!l.source?.drawingSvg)return '';
      const exceptions=(l.source.ruleExceptions||[]).map(x=>`<li>${escapeHtml(x.rule||x.code||'Exception')} — actuel ${escapeHtml(x.currentIn??'—')} · minimum ${escapeHtml(x.minimumIn??'—')} · accepté par ${escapeHtml(x.acceptedBy||'—')}</li>`).join('');
      return `<section class="drawing"><h2>Pièce ${i+1} — ${escapeHtml(l.description)}</h2>${sanitizeMirSvg(l.source.drawingSvg)}${exceptions?`<div class="notice"><b>Exception(s) de fabrication acceptée(s)</b><ul>${exceptions}</ul></div>`:''}</section>`;
    }).join('');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bon de commande ${escapeHtml(po.poNumber)}</title><style>@page{size:letter;margin:14mm}body{font:13px system-ui;color:#17231d}h1{font-size:24px;margin:0}.muted{color:#607068}.top{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #284b3d;padding-bottom:14px}.box{border:1px solid #ccd7d1;border-radius:8px;padding:12px;margin:12px 0}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border-bottom:1px solid #dbe3df;padding:8px 6px;text-align:left;vertical-align:top}th{font-size:11px;text-transform:uppercase}.total{text-align:right;margin-top:14px}.notice{background:#fff6df;border:1px solid #e6ce92;padding:9px;border-radius:7px}.drawing{break-inside:avoid;margin-top:20px;padding-top:14px;border-top:2px solid #284b3d}.drawing svg{width:100%;max-height:320px;display:block}.drawing h2{font-size:16px}</style></head><body><div class="top"><div><div class="muted">LES REVÊTEMENTS MIR</div><h1>Bon de commande</h1><b>${escapeHtml(po.poNumber)}</b> · révision ${po.revision}</div><div><b>${escapeHtml(po.supplier.name)}</b><br>${escapeHtml(po.supplier.contactName)}<br>${escapeHtml(po.supplier.email)}<br>${escapeHtml(po.supplier.address)}</div></div><div class="box"><b>Chantier :</b> ${escapeHtml(po.project.chantier||po.project.name||'—')}<br><b>Référence interne :</b> ${escapeHtml(po.project.internalOrderRef||'—')}<br><b>Date demandée :</b> ${escapeHtml(po.requestedDeliveryDate||'À confirmer')}<br><b>Livrer à :</b> ${escapeHtml(po.shipTo||'À confirmer')}</div><table><thead><tr><th>#</th><th>Réf.</th><th>Description</th><th>Qté</th><th>Coût</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="total"><b>Sous-total connu : ${formatMoney(t.knownSubtotal,t.currency)}</b><br><span class="muted">${t.unpricedLines ? `${t.unpricedLines} ligne(s) sans coût confirmé.` : 'Tous les coûts sont renseignés.'}</span></div>${po.notes?`<div class="box"><b>Notes</b><br>${escapeHtml(po.notes).replace(/\n/g,'<br>')}</div>`:''}${drawings}<p class="notice">Merci de confirmer la réception, la disponibilité et le délai. Ce document correspond à la révision ${po.revision}; toute modification ultérieure doit être émise comme nouvelle révision.</p></body></html>`;
  }

  function serialize(po) { return JSON.stringify(po); }
  function restore(raw) {
    const po=typeof raw==='string'?JSON.parse(raw):clone(raw);
    assert(po && po.schemaVersion===1, 'Format de bon fournisseur incompatible.');
    po.supplier=normalizeSupplier(po.supplier);
    po.lines=(po.lines||[]).map(normalizeLine);
    po.supplierConfirmation=po.supplierConfirmation||null;
    po.receipts=Array.isArray(po.receipts)?po.receipts:[];
    po.claims=Array.isArray(po.claims)?po.claims:[];
    po.supplierNotice=po.supplierNotice||null;
    po.sendLog=Array.isArray(po.sendLog)?po.sendLog:[];
    po.revisionHistory=Array.isArray(po.revisionHistory)?po.revisionHistory:[];
    assert(Object.values(STATUS).includes(po.status),'Statut de bon fournisseur invalide.');
    return po;
  }

  return {
    STATUS, normalizeSupplier, normalizeLine, lineFromProductionPiece,
    createPurchaseOrder, addLine, addProductionPiece, removeLine, updatePurchaseOrder,
    totals, validateReady, markReady, contentFingerprint, emailContent, prepareSend,
    dispatchPurchaseOrder, prepareCancellationSend, dispatchCancellationNotice, markAcknowledged, recordSupplierConfirmation, receiptSummary, recordReceipt, rejectedUnclaimedQuantity, createSupplierClaim, prepareClaimNotice, dispatchClaimNotice, authorizeClaimReplacement, resolveClaimWithCredit, claimSummary, deliveryState, followUpState, createRevision, cancelPurchaseOrder,
    renderDocumentHtml, sanitizeMirSvg, serialize, restore, formatMoney, hashText
  };
});
