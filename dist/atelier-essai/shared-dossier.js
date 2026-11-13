const clone = (v) => JSON.parse(JSON.stringify(v));

function nowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

function requireText(value, label) {
  const v = String(value ?? '').trim();
  if (!v) throw new Error(`${label} requis`);
  return v;
}

function safeId(value, prefix) {
  const raw = String(value || '').trim();
  if (raw) return raw;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}


function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function shortFingerprint(value) {
  const text = stableStringify(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function conflict(expected, actual) {
  const e = new Error(`Conflit de révision : attendu ${expected}, actuel ${actual}`);
  e.code = 'REVISION_CONFLICT';
  e.expectedRevision = expected;
  e.actualRevision = actual;
  return e;
}

export function createDossier({ id, chantierId, title, createdBy, now = new Date() } = {}) {
  const createdAt = nowIso(now);
  return {
    schemaVersion: 1,
    id: safeId(id, 'dossier'),
    chantierId: requireText(chantierId, 'Chantier'),
    title: requireText(title, 'Titre'),
    status: 'draft',
    revision: 1,
    createdAt,
    updatedAt: createdAt,
    createdBy: requireText(createdBy || 'MIR admin', 'Auteur'),
    updatedBy: requireText(createdBy || 'MIR admin', 'Auteur'),
    data: {
      calepinage: null,
      production: null,
      notes: '',
    },
    attachments: [],
    pdfPublications: [],
    fabricationPublications: [],
    productionTransfers: [],
    productionReleaseRefs: [],
    procurementRefs: [],
    facadeAnnotationRefs: [],
    history: [{ revision: 1, at: createdAt, by: createdBy || 'MIR admin', kind: 'created' }],
  };
}

export function saveDossier(current, patch = {}, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  if (!current?.id) throw new Error('Dossier invalide');
  if (!Number.isInteger(expectedRevision)) throw new Error('expectedRevision requis');
  if (expectedRevision !== current.revision) throw conflict(expectedRevision, current.revision);
  if (current.status === 'archived') throw new Error('Dossier archivé');
  const next = clone(current);
  if ('title' in patch) next.title = requireText(patch.title, 'Titre');
  if ('data' in patch) next.data = { ...next.data, ...clone(patch.data || {}) };
  if ('status' in patch) {
    const allowed = new Set(['draft', 'active', 'completed', 'archived']);
    if (!allowed.has(patch.status)) throw new Error('Statut dossier invalide');
    next.status = patch.status;
  }
  next.revision += 1;
  next.updatedAt = nowIso(now);
  next.updatedBy = requireText(actor, 'Auteur');
  next.history.push({ revision: next.revision, at: next.updatedAt, by: next.updatedBy, kind: 'saved' });
  return next;
}

export function addAttachment(current, attachment, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  const fileName = requireText(attachment?.fileName, 'Nom fichier');
  const sha256 = requireText(attachment?.sha256, 'SHA-256');
  if (!/^[a-f0-9]{64}$/i.test(sha256)) throw new Error('SHA-256 invalide');
  const kind = String(attachment?.kind || 'document');
  const existing = (current.attachments || []).find((a) => a.sha256 === sha256 && a.kind === kind);
  if (existing) return clone(current);
  const next = saveDossier(current, {}, { expectedRevision, actor, now });
  next.attachments.push({
    id: safeId(attachment.id, 'att'), fileName, sha256: sha256.toLowerCase(), kind,
    sourceRef: attachment.sourceRef ? String(attachment.sourceRef) : null,
    addedAt: next.updatedAt, addedBy: next.updatedBy,
  });
  next.history[next.history.length - 1].kind = 'attachment-added';
  return next;
}

export function publishChantierPdf(current, publication, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  const fileName = requireText(publication?.fileName, 'Nom PDF');
  const sha256 = requireText(publication?.sha256, 'SHA-256 PDF');
  const idempotencyKey = requireText(publication?.idempotencyKey, 'Clé idempotence');
  if (!/^[a-f0-9]{64}$/i.test(sha256)) throw new Error('SHA-256 PDF invalide');
  const previous = (current.pdfPublications || []).find((p) => p.idempotencyKey === idempotencyKey);
  if (previous) return clone(current);
  const next = saveDossier(current, {}, { expectedRevision, actor, now });
  const pubRevision = (next.pdfPublications.at(-1)?.publicationRevision || 0) + 1;
  next.pdfPublications.push({
    id: safeId(publication.id, 'pdfpub'),
    publicationRevision: pubRevision,
    dossierRevision: next.revision,
    fileName,
    sha256: sha256.toLowerCase(),
    storageRef: publication.storageRef ? String(publication.storageRef) : null,
    idempotencyKey,
    publishedAt: next.updatedAt,
    publishedBy: next.updatedBy,
    immutable: true,
    accessPolicy: { visibility: 'private', serverAuthorizationRequired: true, audience: publication.audience || 'assigned-employees' },
  });
  next.history[next.history.length - 1].kind = 'pdf-published';
  return next;
}


export function publishFabricationPdf(current, publication, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  const fileName = requireText(publication?.fileName, 'Nom PDF fabrication');
  const sha256 = requireText(publication?.sha256, 'SHA-256 PDF fabrication');
  const idempotencyKey = requireText(publication?.idempotencyKey, 'Clé idempotence fabrication');
  if (!/^[a-f0-9]{64}$/i.test(sha256)) throw new Error('SHA-256 PDF fabrication invalide');
  const previous = (current.fabricationPublications || []).find((p) => p.idempotencyKey === idempotencyKey);
  if (previous) return clone(current);
  const next = saveDossier(current, {}, { expectedRevision, actor, now });
  const publicationRevision = (next.fabricationPublications?.at(-1)?.publicationRevision || 0) + 1;
  next.fabricationPublications ||= [];
  next.fabricationPublications.push({
    id: safeId(publication.id, 'fabpdf'),
    publicationRevision,
    dossierRevision: next.revision,
    releaseId: publication.releaseId ? String(publication.releaseId) : null,
    releaseNumber: Number(publication.releaseNumber || 0) || null,
    contentFingerprint: publication.contentFingerprint ? String(publication.contentFingerprint) : null,
    fileName,
    sha256: sha256.toLowerCase(),
    storageRef: publication.storageRef ? String(publication.storageRef) : null,
    idempotencyKey,
    publishedAt: next.updatedAt,
    publishedBy: next.updatedBy,
    immutable: true,
    accessPolicy: { visibility: 'private', serverAuthorizationRequired: true, audience: 'workshop' },
  });
  next.history[next.history.length - 1].kind = 'fabrication-pdf-published';
  return next;
}

export function transferToProduction(current, { sourceItemId, snapshot, actor = 'MIR admin', now = new Date() } = {}, { expectedRevision } = {}) {
  const itemId = requireText(sourceItemId, 'Source item');
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Snapshot production requis');
  const transferKey = `${current.id}:${itemId}:${shortFingerprint(snapshot)}`;
  const existing = (current.productionTransfers || []).find((t) => t.transferKey === transferKey);
  if (existing) return clone(current);
  const next = saveDossier(current, {}, { expectedRevision, actor, now });
  next.productionTransfers.push({
    id: safeId(null, 'transfer'),
    transferKey,
    sourceItemId: itemId,
    sourceDossierRevision: current.revision,
    snapshot: clone(snapshot),
    transferredAt: next.updatedAt,
    transferredBy: next.updatedBy,
    redrawn: false,
  });
  next.history[next.history.length - 1].kind = 'production-transfer';
  return next;
}



export function linkProductionRelease(current, ref, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  const releaseId = requireText(ref?.releaseId, 'Libération production');
  const batchId = requireText(ref?.batchId, 'Dossier production');
  const releaseNumber = Number(ref?.releaseNumber || 0);
  const contentFingerprint = requireText(ref?.contentFingerprint, 'Empreinte production');
  if (!Number.isInteger(releaseNumber) || releaseNumber < 1) throw new Error('Numéro de libération invalide');
  const key = `${batchId}:${releaseId}:${contentFingerprint}`;
  const existing = (current.productionReleaseRefs || []).find((r) => r.key === key);
  if (existing) return clone(current);
  const next = saveDossier(current, {}, { expectedRevision, actor, now });
  next.productionReleaseRefs ||= [];
  next.productionReleaseRefs.push({
    key, batchId, releaseId, releaseNumber, contentFingerprint,
    releasedAt: ref.releasedAt ? String(ref.releasedAt) : null,
    releasedBy: ref.releasedBy ? String(ref.releasedBy) : null,
    linkedAt: next.updatedAt, linkedBy: next.updatedBy, immutable: true,
  });
  next.history[next.history.length - 1].kind = 'production-release-linked';
  return next;
}

export function linkSupplierPurchaseOrder(current, ref, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  const poId = requireText(ref?.poId, 'Bon fournisseur');
  const poNumber = requireText(ref?.poNumber, 'Numéro bon fournisseur');
  const revision = Number(ref?.revision || 1);
  if (!Number.isInteger(revision) || revision < 1) throw new Error('Révision bon fournisseur invalide');
  const key = `${poId}:r${revision}`;
  const existing = (current.procurementRefs || []).find((r) => r.key === key);
  if (existing) return clone(current);
  const next = saveDossier(current, {}, { expectedRevision, actor, now });
  next.procurementRefs ||= [];
  next.procurementRefs.push({
    key, poId, poNumber, revision,
    supplierName: ref.supplierName ? String(ref.supplierName) : '',
    status: ref.status ? String(ref.status) : 'draft',
    linkedAt: next.updatedAt,
    linkedBy: next.updatedBy,
  });
  next.history[next.history.length - 1].kind = 'supplier-po-linked';
  return next;
}

export function restoreRevision(current, targetRevision, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  if (!Number.isInteger(targetRevision) || targetRevision < 1) throw new Error('Révision cible invalide');
  if (expectedRevision !== current.revision) throw conflict(expectedRevision, current.revision);
  const marker = (current.history || []).find((h) => h.revision === targetRevision);
  if (!marker) throw new Error('Révision cible inconnue');
  // Historical full snapshots must come from the backend. Never fabricate content from event history.
  const e = new Error('Restauration complète requiert le snapshot backend de la révision cible');
  e.code = 'BACKEND_SNAPSHOT_REQUIRED';
  e.targetRevision = targetRevision;
  throw e;
}

export function mergeRemoteWithLocalDraft(remote, localDraft) {
  if (!localDraft) return { action: 'use-remote', dossier: clone(remote) };
  if (!remote) return { action: 'keep-local', dossier: clone(localDraft) };
  const base = Number(localDraft.baseRevision ?? localDraft.revision ?? 0);
  const dirty = !!localDraft.dirty;
  if (dirty && base < remote.revision) {
    return {
      action: 'conflict',
      reason: 'remote-newer-than-local-draft',
      remoteRevision: remote.revision,
      localBaseRevision: base,
      remote: clone(remote),
      localDraft: clone(localDraft),
    };
  }
  if (dirty) return { action: 'keep-local', dossier: clone(localDraft) };
  return { action: 'use-remote', dossier: clone(remote) };
}

export function serializeDossier(dossier) {
  return JSON.stringify(dossier, null, 2);
}

export function restoreDossier(serialized) {
  const value = typeof serialized === 'string' ? JSON.parse(serialized) : clone(serialized);
  if (value?.schemaVersion !== 1 || !value.id || !Number.isInteger(value.revision)) throw new Error('Dossier sérialisé invalide');
  value.attachments ||= [];
  value.pdfPublications ||= [];
  value.fabricationPublications ||= [];
  value.productionTransfers ||= [];
  value.productionReleaseRefs ||= [];
  value.procurementRefs ||= [];
  value.facadeAnnotationRefs ||= [];
  value.history ||= [];
  return value;
}

export function createSharedDossierProvider(client, { functionName = 'mir-shared-dossiers' } = {}) {
  if (!client?.functions?.invoke) throw new Error('Client backend authentifié requis');
  const invoke = async (action, payload) => {
    const { data, error } = await client.functions.invoke(functionName, { body: { action, payload } });
    if (error) throw new Error(error.message || 'Erreur backend dossiers');
    if (!data?.ok) throw new Error(data?.error || 'Réponse backend dossiers invalide');
    return data;
  };
  return {
    get: (id) => invoke('get', { id }),
    save: (dossier, expectedRevision) => invoke('save', { dossier, expectedRevision }),
    publishPdf: (id, publication, expectedRevision) => invoke('publish-pdf', { id, publication, expectedRevision }),
    publishFabricationPdf: (id, publication, expectedRevision) => invoke('publish-fabrication-pdf', { id, publication, expectedRevision }),
    linkProductionRelease: (id, ref, expectedRevision) => invoke('link-production-release', { id, ref, expectedRevision }),
    listRevisions: (id) => invoke('list-revisions', { id }),
    restoreRevision: (id, targetRevision, expectedRevision) => invoke('restore-revision', { id, targetRevision, expectedRevision }),
  };
}

export function linkFibroCutPlan(current, cutSnapshot, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  if (!cutSnapshot?.id || !cutSnapshot?.plan) throw new Error('Snapshot débit fibrociment invalide');
  const revision = Number(cutSnapshot.revision || 0);
  if (!revision) throw new Error('Révision débit fibrociment requise');
  const fingerprint = shortFingerprint(cutSnapshot);
  const key = `${cutSnapshot.id}:${revision}:${fingerprint}`;
  const existing = (current.fibroCutRefs || []).find((r) => r.key === key);
  if (existing) return clone(current);
  const next = saveDossier(current, {}, { expectedRevision, actor, now });
  next.fibroCutRefs ||= [];
  next.fibroCutRefs.push({
    key,
    cutPlanId: String(cutSnapshot.id),
    cutPlanRevision: revision,
    contentFingerprint: fingerprint,
    sheetCount: Number(cutSnapshot.plan.sheets?.length || 0),
    pieceCount: Number(cutSnapshot.plan.totalPieces || 0),
    linkedAt: next.updatedAt,
    linkedBy: next.updatedBy,
    immutable: true,
  });
  next.history[next.history.length - 1].kind = 'fibro-cut-plan-linked';
  return next;
}


export function linkFacadeAnnotationSet(current, annotationSnapshot, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  if (!annotationSnapshot?.id || !Number.isInteger(annotationSnapshot?.revision)) throw new Error('Snapshot annotations façade invalide');
  const contentFingerprint = String(annotationSnapshot.contentFingerprint || shortFingerprint(annotationSnapshot));
  const key = `${annotationSnapshot.id}:r${annotationSnapshot.revision}:${contentFingerprint}`;
  const existing = (current.facadeAnnotationRefs || []).find((r) => r.key === key);
  if (existing) return clone(current);
  const next = saveDossier(current, {}, { expectedRevision, actor, now });
  next.facadeAnnotationRefs ||= [];
  next.facadeAnnotationRefs.push({
    key,
    annotationSetId: String(annotationSnapshot.id),
    annotationSetRevision: Number(annotationSnapshot.revision),
    contentFingerprint,
    annotationCount: Number(annotationSnapshot.annotations?.length || 0),
    elevationIds: [...new Set((annotationSnapshot.annotations || []).map((a) => String(a.elevationId)))],
    linkedAt: next.updatedAt,
    linkedBy: next.updatedBy,
    immutable: true,
  });
  next.history[next.history.length - 1].kind = 'facade-annotations-linked';
  return next;
}
