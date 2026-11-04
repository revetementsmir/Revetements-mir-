const clone = (v) => JSON.parse(JSON.stringify(v));

function nowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}
function text(value, label) {
  const v = String(value ?? '').trim();
  if (!v) throw new Error(`${label} requis`);
  return v;
}
function optionalText(value) { return String(value ?? '').trim(); }
function finite(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label} invalide`);
  return n;
}
function positive(value, label) {
  const n = finite(value, label);
  if (n <= 0) throw new Error(`${label} invalide`);
  return n;
}
function anchorPoint(anchor = {}) {
  const x = finite(anchor.x, 'Ancrage X');
  const y = finite(anchor.y, 'Ancrage Y');
  if (x < 0 || x > 1 || y < 0 || y > 1) throw new Error('Ancrage hors élévation');
  return { x, y };
}
function safeId(value, prefix, seq = 1) {
  const raw = String(value || '').trim();
  return raw || `${prefix}${String(seq).padStart(3, '0')}`;
}
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}
function fingerprint(value) {
  const s = stableStringify(value);
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function deepFreeze(v) {
  if (!v || typeof v !== 'object' || Object.isFrozen(v)) return v;
  Object.freeze(v);
  Object.values(v).forEach(deepFreeze);
  return v;
}

export const FACADE_ANNOTATION_KINDS = Object.freeze({
  note: 'note',
  windowL: 'window_l',
  windowDrip: 'window_drip',
  departure: 'departure',
  rodentGuard: 'rodent_guard',
  corner: 'corner',
  soffitJ: 'soffit_j',
  panelJoint: 'panel_joint',
  masonryMeeting: 'masonry_meeting',
  roofL: 'roof_l',
});

export function createFacadeAnnotationSet({ id, chantierId, title, createdBy = 'MIR admin', now = new Date() } = {}) {
  const createdAt = nowIso(now);
  return {
    schemaVersion: 1,
    id: text(id || 'FAS-001', 'ID annotations'),
    chantierId: text(chantierId, 'Chantier'),
    title: text(title || 'Annotations façades', 'Titre'),
    revision: 1,
    createdAt,
    updatedAt: createdAt,
    createdBy: text(createdBy, 'Auteur'),
    updatedBy: text(createdBy, 'Auteur'),
    annotations: [],
    history: [{ revision: 1, at: createdAt, by: createdBy, kind: 'created' }],
  };
}

function validateBusinessRule(annotation) {
  const kind = annotation.kind;
  const out = { blocked: false, warnings: [] };

  if (kind === 'departure' || kind === 'rodent_guard') {
    if (optionalText(annotation.colorRef)) throw new Error(`${kind === 'departure' ? 'Départ' : 'Anti-rongeur'} sans couleur`);
    out.colorPolicy = 'none';
  } else if (kind === 'window_l') {
    out.colorPolicy = 'independent';
  } else {
    out.colorPolicy = optionalText(annotation.colorRef) ? 'explicit' : 'none';
  }

  if (kind === 'corner') {
    const totalLinearIn = positive(annotation.totalLinearIn, 'Longueur coin');
    out.stockLengthIn = 120;
    out.stockPieces = Math.ceil(totalLinearIn / out.stockLengthIn);
    out.totalLinearIn = totalLinearIn;
  }

  if (kind === 'masonry_meeting' && annotation.supportGeometryKnown !== true) {
    out.blocked = true;
    out.warnings.push('Géométrie réelle du support requise à la rencontre brique');
  }
  if (kind === 'rodent_guard' && annotation.claddingRuleConfirmed !== true) {
    out.blocked = true;
    out.warnings.push('Règle anti-rongeur du revêtement à confirmer');
  }
  if (kind === 'roof_l' && annotation.scenarioConfirmed !== true) {
    out.blocked = true;
    out.warnings.push('L 6 po au-dessus toiture seulement selon cas MIR confirmé');
  }
  if (kind === 'soffit_j' && String(annotation.edgeRole || '').toLowerCase() === 'fascia') {
    out.blocked = true;
    out.warnings.push('J soffite interdit sur rive fascia');
  }
  return out;
}

export function normalizeFacadeAnnotation(input = {}, seq = 1) {
  const kind = text(input.kind, 'Type annotation').toLowerCase();
  if (!Object.values(FACADE_ANNOTATION_KINDS).includes(kind)) throw new Error('Type annotation inconnu');
  const shortText = text(input.shortText || input.label, 'Texte annotation');
  if (shortText.length > 120) throw new Error('Texte annotation trop long');
  const base = {
    id: safeId(input.id, 'A', seq),
    kind,
    elevationId: text(input.elevationId, 'Élévation'),
    anchor: anchorPoint(input.anchor),
    shortText,
    label: optionalText(input.label) || shortText,
    colorRef: optionalText(input.colorRef) || null,
    sourceRef: optionalText(input.sourceRef) || null,
    sourceItemId: optionalText(input.sourceItemId) || null,
    supportGeometryKnown: input.supportGeometryKnown === true,
    claddingRuleConfirmed: input.claddingRuleConfirmed === true,
    scenarioConfirmed: input.scenarioConfirmed === true,
    edgeRole: optionalText(input.edgeRole) || null,
    totalLinearIn: input.totalLinearIn == null || input.totalLinearIn === '' ? null : Number(input.totalLinearIn),
    metadata: clone(input.metadata || {}),
  };
  const rule = validateBusinessRule(base);
  return { ...base, rule };
}

function revise(set, actor, now, kind) {
  const next = clone(set);
  next.revision += 1;
  next.updatedAt = nowIso(now);
  next.updatedBy = text(actor || 'MIR admin', 'Auteur');
  next.history.push({ revision: next.revision, at: next.updatedAt, by: next.updatedBy, kind });
  return next;
}

export function addFacadeAnnotation(set, input, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  if (!set?.id || !Number.isInteger(set.revision)) throw new Error('Jeu annotations invalide');
  if (!Number.isInteger(expectedRevision)) throw new Error('expectedRevision requis');
  if (expectedRevision !== set.revision) {
    const e = new Error(`Conflit de révision : attendu ${expectedRevision}, actuel ${set.revision}`);
    e.code = 'REVISION_CONFLICT'; throw e;
  }
  const annotation = normalizeFacadeAnnotation(input, (set.annotations?.length || 0) + 1);
  if ((set.annotations || []).some((a) => a.id === annotation.id)) throw new Error('ID annotation déjà utilisé');
  const next = revise(set, actor, now, 'annotation-added');
  next.annotations.push(annotation);
  return next;
}

export function updateFacadeAnnotation(set, annotationId, patch, { expectedRevision, actor = 'MIR admin', now = new Date() } = {}) {
  if (!Number.isInteger(expectedRevision)) throw new Error('expectedRevision requis');
  if (expectedRevision !== set.revision) {
    const e = new Error(`Conflit de révision : attendu ${expectedRevision}, actuel ${set.revision}`);
    e.code = 'REVISION_CONFLICT'; throw e;
  }
  const index = (set.annotations || []).findIndex((a) => a.id === annotationId);
  if (index < 0) throw new Error('Annotation inconnue');
  const merged = { ...set.annotations[index], ...clone(patch || {}), id: set.annotations[index].id };
  const normalized = normalizeFacadeAnnotation(merged, index + 1);
  const next = revise(set, actor, now, 'annotation-updated');
  next.annotations[index] = normalized;
  return next;
}

export function validateFacadeAnnotationSet(set) {
  const annotations = set?.annotations || [];
  const ids = new Set();
  const blocked = [];
  for (const a of annotations) {
    if (ids.has(a.id)) throw new Error(`ID annotation dupliqué : ${a.id}`);
    ids.add(a.id);
    if (a.rule?.blocked) blocked.push({ id: a.id, warnings: clone(a.rule.warnings || []) });
  }
  return {
    valid: blocked.length === 0,
    blocked,
    annotationCount: annotations.length,
    elevationIds: [...new Set(annotations.map((a) => a.elevationId))],
  };
}

export function buildFacadeDocumentModel(set, { audience = 'chantier' } = {}) {
  const mode = String(audience).toLowerCase();
  if (!['chantier', 'full'].includes(mode)) throw new Error('Audience document invalide');
  const validation = validateFacadeAnnotationSet(set);
  const annotations = (set.annotations || []).map((a) => {
    const common = {
      id: a.id,
      kind: a.kind,
      elevationId: a.elevationId,
      anchor: clone(a.anchor),
      shortText: a.shortText,
      colorPolicy: a.rule?.colorPolicy || 'none',
      colorRef: a.rule?.colorPolicy === 'none' ? null : a.colorRef,
      blocked: !!a.rule?.blocked,
      warnings: clone(a.rule?.warnings || []),
    };
    if (a.kind === 'corner') {
      common.totalLinearIn = a.rule.totalLinearIn;
      common.stockLengthIn = 120;
      common.stockPieces = a.rule.stockPieces;
    }
    if (mode === 'full') {
      common.label = a.label;
      common.sourceRef = a.sourceRef;
      common.sourceItemId = a.sourceItemId;
      common.metadata = clone(a.metadata || {});
      common.supportGeometryKnown = a.supportGeometryKnown;
      common.claddingRuleConfirmed = a.claddingRuleConfirmed;
      common.scenarioConfirmed = a.scenarioConfirmed;
      common.edgeRole = a.edgeRole;
    }
    return common;
  });
  return {
    schemaVersion: 1,
    annotationSetId: set.id,
    annotationSetRevision: set.revision,
    chantierId: set.chantierId,
    title: set.title,
    audience: mode,
    validation,
    annotations,
  };
}

export function createFacadeAnnotationSnapshot(set) {
  const validation = validateFacadeAnnotationSet(set);
  const core = {
    schemaVersion: 1,
    id: set.id,
    revision: set.revision,
    chantierId: set.chantierId,
    title: set.title,
    annotations: clone(set.annotations || []),
    validation,
    updatedAt: set.updatedAt,
    updatedBy: set.updatedBy,
  };
  core.contentFingerprint = fingerprint(core);
  return deepFreeze(core);
}

export function serializeFacadeAnnotationSet(set) { return JSON.stringify(set, null, 2); }
export function restoreFacadeAnnotationSet(serialized) {
  const v = typeof serialized === 'string' ? JSON.parse(serialized) : clone(serialized);
  if (v?.schemaVersion !== 1 || !v.id || !Number.isInteger(v.revision) || !Array.isArray(v.annotations)) throw new Error('Jeu annotations sérialisé invalide');
  v.history ||= [];
  return v;
}
