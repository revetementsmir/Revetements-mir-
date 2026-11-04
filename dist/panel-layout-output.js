/* MIR panel layout output: exact outside dimensions, explicit local transfer and
 * chantier pages. This module performs no network request or external order. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./production-model.js'), require('./panel-layout-engine.js'));
  else root.MIRPanelLayoutOutput = factory(root.MIRProduction, root.MIRPanelLayout);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Production, LayoutEngine) {
  'use strict';
  const SCHEMA = 'mir-panel-layout-transfer-1';
  const STORAGE_KEY = 'mir_panel_layout_transfer_v1';
  const DOSSIER_KEY = 'mir_production_admin_dossier_v1';
  const EPS = 1e-7;
  const clone = value => JSON.parse(JSON.stringify(value));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
  const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
  function fail(message, code = 'INVALID_LAYOUT') { const error = new Error(message); error.code = code; throw error; }
  function text(value, max, field, required = false) {
    if (value === undefined || value === null) value = '';
    if (typeof value !== 'string' && typeof value !== 'number') fail(field + ' doit être un texte.');
    const result = String(value).trim();
    if (result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) fail(field + ' est trop long ou contient des caractères non permis.');
    if (required && !result) fail(field + ' est requis.');
    return result;
  }
  function number(value, field, min = 0, max = 3937) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(field + ' doit être une mesure valide en pouces.');
    return value;
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
    return JSON.stringify(value);
  }
  function fingerprint(value) { let hash = 2166136261; for (const c of canonical(value)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619); return (hash >>> 0).toString(16).padStart(8, '0'); }
  function fields(value, names, label) {
    if (value === undefined || value === null || value === '') return {};
    if (typeof value !== 'object' || Array.isArray(value)) fail(label + ' doit être une fiche de référence.');
    const result = {};
    for (const key of names) if (own(value, key) && value[key] !== undefined) {
      if (typeof value[key] === 'boolean' || value[key] === null) result[key] = value[key];
      else result[key] = text(value[key], 300, label + ' · ' + key);
    }
    return result;
  }
  function normalizeMeta(meta = {}, requireId = false) {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) fail('Les références de la zone sont invalides.');
    const out = {
      id: text(meta.id, 160, 'Identifiant de zone', requireId),
      name: text(meta.name || 'Zone de panneaux', 140, 'Nom de zone'),
      project: text(meta.project, 160, 'Projet'), poNumber: text(meta.poNumber, 100, 'Bon de commande'),
      revision: text(meta.revision ?? 'A', 60, 'Révision', true),
      sourceLabel: text(meta.sourceLabel, 300, 'Source du plan'), notes: text(meta.notes, 8000, 'Notes chantier'),
      material: fields(meta.material, ['type', 'name', 'productRef', 'thickness', 'thicknessUnit', 'gauge'], 'Matière'),
      finish: fields(meta.finish, ['manufacturer', 'name', 'code', 'system', 'selectionType', 'special', 'hex', 'source', 'availabilityNote', 'displayOnly'], 'Couleur'),
      reliefIn: meta.reliefIn === undefined || meta.reliefIn === null || meta.reliefIn === '' ? null : number(meta.reliefIn, 'Projection C'),
      perforation: fields(meta.perforation, ['enabled', 'edgeId', 'details'], 'Perforation')
    };
    if (out.perforation.enabled === null) delete out.perforation.enabled;
    if (own(out.perforation, 'enabled') && typeof out.perforation.enabled !== 'boolean') fail('Le choix de perforation doit être explicite.');
    if (out.perforation.enabled && out.perforation.edgeId && out.perforation.edgeId !== 'bottom') fail('Le calepinage rectangulaire utilise le bas du panneau pour la perforation.');
    if (own(out.perforation, 'enabled')) out.perforation.edgeId = 'bottom';
    if (meta.clearances !== undefined && meta.clearances !== null) {
      if (typeof meta.clearances !== 'object' || Array.isArray(meta.clearances)) fail('Les jeux périphériques sont invalides.');
      out.clearances = {};
      for (const [key, value] of Object.entries(meta.clearances)) {
        if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key)) fail('Un repère de jeu périphérique est invalide.');
        out.clearances[key] = number(value, 'Jeu ' + key);
      }
    }
    const dimensionKeys = ['measuredWidthIn', 'measuredHeightIn', 'totalGapWidthIn', 'totalGapHeightIn'];
    if (dimensionKeys.some(key => own(meta, key))) {
      for (const key of dimensionKeys) out[key] = number(meta[key], key, key.startsWith('measured') ? EPS : 0);
      if (meta.clearanceMethod !== 'overall-axial') fail('La déduction des jeux doit être définie par axe hors tout.');
      out.clearanceMethod = 'overall-axial';
      if (meta.measuredContourIn !== undefined) {
        if (!Array.isArray(meta.measuredContourIn) || meta.measuredContourIn.length < 3 || meta.measuredContourIn.length > 65 || meta.measuredContourIn.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !Number.isFinite(n)))) fail('Le contour chantier est invalide.');
        out.measuredContourIn = clone(meta.measuredContourIn);
      }
    }
    if (own(meta, 'dimensionsConfirmed')) {
      if (typeof meta.dimensionsConfirmed !== 'boolean') fail('La confirmation des cotes doit être explicite.');
      out.dimensionsConfirmed = meta.dimensionsConfirmed;
    }
    return out;
  }
  const samePolygon = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((p, i) => Array.isArray(p) && p.length === 2 && near(p[0], b[i][0]) && near(p[1], b[i][1]));
  function checkedBuild(config) {
    if (!LayoutEngine?.build) fail('Le moteur du contour est indisponible. Rechargez l’outil avant de préparer le dossier.');
    const built = LayoutEngine.build(config);
    if (!built.ok) fail('Le contour ne peut pas être recalculé : ' + (built.errors || []).map(e => e.message).join(' '));
    return built;
  }
  function polygonLayout(layout, dimensions) {
    const expected = checkedBuild({ ...dimensions, contourIn: layout.contourIn, precisionIn: 0 });
    if (!Array.isArray(layout.pieces) || layout.pieces.length !== expected.pieces.length) fail('La liste des pièces ne correspond pas aux composantes découpées du contour.');
    const byId = new Map();
    for (const piece of layout.pieces) {
      if (!piece || byId.has(piece.id)) fail('Deux panneaux ont le même repère.');
      byId.set(piece.id, piece);
    }
    const pieces = expected.pieces.map(piece => {
      const supplied = byId.get(piece.id);
      if (!supplied) fail('Une pièce découpée du contour est manquante.');
      for (const key of ['row', 'col', 'xIn', 'yIn', 'widthIn', 'heightIn', 'lipIn']) if (!near(supplied[key], piece[key])) fail('La géométrie de ' + piece.id + ' ne correspond pas au contour et aux joints.');
      if (!samePolygon(supplied.polygonIn, piece.polygonIn)) fail('Le contour de ' + piece.id + ' a été modifié. Recalculez la zone.');
      if (supplied.localPolygonIn !== undefined && !samePolygon(supplied.localPolygonIn, piece.localPolygonIn)) fail('Le contour local de ' + piece.id + ' est incohérent.');
      for (const key of ['cellXIn', 'cellYIn', 'cellWidthIn', 'cellHeightIn', 'componentIndex', 'componentCount', 'areaSqIn', 'coverageAreaSqIn', 'perimeterIn']) if (supplied[key] !== undefined && !near(supplied[key], piece[key])) fail('Les mesures de ' + piece.id + ' ne correspondent pas à sa découpe.');
      return clone(piece);
    });
    for (const key of ['columnWidthsIn', 'rowHeightsIn']) if (layout[key] !== undefined && (!Array.isArray(layout[key]) || layout[key].length !== expected[key].length || expected[key].some((n, i) => !near(n, layout[key][i])))) fail('Les dimensions de la grille sont incohérentes.');
    return { ok: true, ...dimensions, contourIn: clone(expected.contourIn), geometryType: 'polygon',
      columnWidthsIn: expected.columnWidthsIn.slice(), rowHeightsIn: expected.rowHeightsIn.slice(), pieces,
      checks: clone(expected.checks) };
  }
  function validateMeasuredDimensions(layout, meta) {
    if (meta.measuredWidthIn === undefined) return;
    if (!near(meta.measuredWidthIn - meta.totalGapWidthIn, layout.widthIn) || !near(meta.measuredHeightIn - meta.totalGapHeightIn, layout.heightIn)) fail('Les dimensions assemblées doivent être les cotes chantier moins le jeu total, déduit une seule fois par axe.');
    const gaps = meta.clearances;
    if (gaps && ['left', 'right', 'top', 'bottom'].every(key => own(gaps, key)) && (!near(gaps.left + gaps.right, meta.totalGapWidthIn) || !near(gaps.top + gaps.bottom, meta.totalGapHeightIn))) fail('Les jeux de chaque côté ne correspondent pas aux jeux totaux.');
    if (meta.measuredContourIn) {
      const measured = checkedBuild({ widthIn: meta.measuredWidthIn, heightIn: meta.measuredHeightIn, lipIn: 0, columns: 1, rows: 1, contourIn: meta.measuredContourIn });
      const net = checkedBuild({ widthIn: layout.widthIn, heightIn: layout.heightIn, lipIn: 0, columns: 1, rows: 1,
        contourIn: measured.contourIn.map(([x, y]) => [x * layout.widthIn / meta.measuredWidthIn, y * layout.heightIn / meta.measuredHeightIn]) });
      const actual = checkedBuild({ widthIn: layout.widthIn, heightIn: layout.heightIn, lipIn: 0, columns: 1, rows: 1,
        contourIn: layout.contourIn || [[0, 0], [layout.widthIn, 0], [layout.widthIn, layout.heightIn], [0, layout.heightIn]] });
      if (!samePolygon(net.contourIn, actual.contourIn)) fail('Le contour assemblé ne correspond pas au contour chantier et aux jeux par axe.');
    }
  }
  function validateLayout(layout) {
    if (!layout || layout.ok !== true) fail('Calculez une zone valide avant de préparer son dossier.');
    const widthIn = number(layout.widthIn, 'Largeur de zone', EPS), heightIn = number(layout.heightIn, 'Hauteur de zone', EPS), lipIn = number(layout.lipIn, 'Lip');
    const columns = layout.columns, rows = layout.rows;
    if (!Number.isInteger(columns) || columns < 1 || columns > 16 || !Number.isInteger(rows) || rows < 1 || rows > 16) fail('Une zone contient de 1 à 16 colonnes et de 1 à 16 rangées.');
    if (own(layout, 'contourIn')) return polygonLayout(layout, { widthIn, heightIn, lipIn, columns, rows, xAxesIn: layout.xAxesIn, yAxesIn: layout.yAxesIn });
    const axis = (values, count, total, label) => {
      if (!Array.isArray(values) || values.length !== count - 1) fail('Les joints ' + label + ' sont incomplets.');
      let previous = 0;
      for (const value of values) { number(value, 'Joint ' + label, EPS, total - EPS); if (value <= previous + EPS) fail('Les joints ' + label + ' doivent rester ordonnés.'); previous = value; }
      const origins = Array.from({ length: count }, (_, i) => i ? values[i - 1] - lipIn / 2 : 0);
      const sizes = origins.map((start, i) => (i === count - 1 ? total : values[i] + lipIn / 2) - start);
      if (origins.some(x => x < -EPS) || sizes.some(x => x - 2 * lipIn <= EPS)) fail('Chaque panneau doit conserver une face centrale positive après ses lips.');
      return { axes: values.slice(), origins, sizes };
    };
    const x = axis(layout.xAxesIn, columns, widthIn, 'verticaux'), y = axis(layout.yAxesIn, rows, heightIn, 'horizontaux');
    if (!Array.isArray(layout.pieces) || layout.pieces.length !== columns * rows) fail('La liste des panneaux ne correspond pas à la grille.');
    for (const [key, expected] of [['columnWidthsIn', x.sizes], ['rowHeightsIn', y.sizes]]) {
      if (layout[key] !== undefined && (!Array.isArray(layout[key]) || layout[key].length !== expected.length || expected.some((n, i) => !near(n, layout[key][i])))) fail('Les cotes de la grille ne correspondent pas aux joints.');
    }
    const ids = new Set(), positions = new Set();
    const pieces = layout.pieces.map(piece => {
      if (!piece || !Number.isInteger(piece.row) || !Number.isInteger(piece.col) || piece.row < 0 || piece.row >= rows || piece.col < 0 || piece.col >= columns) fail('Le repère d’un panneau est hors de la zone.');
      const id = text(piece.id, 40, 'Repère de panneau', true), position = piece.row + ':' + piece.col;
      if (ids.has(id) || positions.has(position)) fail('Deux panneaux ont le même repère ou le même emplacement.');
      ids.add(id); positions.add(position);
      for (const [key, expected] of [['xIn', x.origins[piece.col]], ['yIn', y.origins[piece.row]], ['widthIn', x.sizes[piece.col]], ['heightIn', y.sizes[piece.row]], ['lipIn', lipIn]]) if (!near(piece[key], expected)) fail('La géométrie de ' + id + ' ne correspond pas aux cotes de la zone.');
      return { id, row: piece.row, col: piece.col, xIn: piece.xIn, yIn: piece.yIn, widthIn: piece.widthIn, heightIn: piece.heightIn, lipIn };
    }).sort((a, b) => a.row - b.row || a.col - b.col);
    return { ok: true, widthIn, heightIn, lipIn, columns, rows, xAxesIn: x.axes, yAxesIn: y.axes, columnWidthsIn: x.sizes, rowHeightsIn: y.sizes, pieces };
  }
  function sourceImage(meta) {
    if (meta.sourceImageDataUrl === undefined || meta.sourceImageDataUrl === null || meta.sourceImageDataUrl === '') return null;
    const data = meta.sourceImageDataUrl;
    if (typeof data !== 'string' || data.length > 16000000 || !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(data)) fail('Le fond du plan doit être une image PNG ou JPEG locale.', 'INVALID_SOURCE_IMAGE');
    const box = meta.sourceBox;
    if (!Array.isArray(box) || box.length !== 4 || box.some(x => !Number.isFinite(x)) || box[0] < 0 || box[1] < 0 || box[2] <= 0 || box[3] <= 0 || box[0] + box[2] > 1 + EPS || box[1] + box[3] > 1 + EPS) fail('Le cadrage de la zone sur le PDF est invalide.', 'INVALID_SOURCE_BOX');
    const width = meta.sourceWidthPx, height = meta.sourceHeightPx;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 60000 || height > 60000) fail('Les dimensions de l’image source sont requises pour placer la zone sans déformation.', 'INVALID_SOURCE_SIZE');
    return { data, box: box.slice(), width, height };
  }
  function panelSpec(piece, meta) {
    const source = ['Calepinage : ' + meta.name, 'Rév. ' + meta.revision, 'Repère source : ' + piece.id, meta.sourceLabel].filter(Boolean).join(' · ');
    const note = source + (meta.notes ? '\n' + meta.notes : '');
    const polygon = Array.isArray(piece.polygonIn), pointsIn = polygon ? piece.localPolygonIn.map(([x, y]) => [x, piece.heightIn - y]) : null;
    const bottomEdges = pointsIn ? pointsIn.map((a, i) => ({ a, b: pointsIn[(i + 1) % pointsIn.length], id: 'edge-' + (i + 1) })).filter(e => near(e.a[1], 0) && near(e.b[1], 0)) : [];
    const bottomEdgeId = polygon ? bottomEdges.length === 1 ? bottomEdges[0].id : '' : 'bottom';
    const perforation = clone(meta.perforation);
    if (own(perforation, 'enabled')) perforation.edgeId = bottomEdgeId;
    return {
      kind: 'panel', shape: polygon ? 'polygon' : 'rectangle', ...(polygon ? { pointsIn } : {}), id: piece.id, name: 'Panneau ' + piece.id, unit: 'in',
      width: piece.widthIn, height: piece.heightIn, lip: piece.lipIn, lips: {}, relief: meta.reliefIn,
      dimensionBasis: 'outer_including_lips', mirrorX: false, bottomEdgeId,
      quantity: 1, material: clone(meta.material), finish: clone(meta.finish), perforation,
      location: (meta.name + ' · ' + piece.id).slice(0, 120), note: note.length <= 500 ? note : note.slice(0, 443) + '\nNotes complètes : dossier de calepinage, même révision.'
    };
  }
  function toTransfer(layout, meta = {}) {
    const geometry = validateLayout(layout), metadata = normalizeMeta(meta, true);
    validateMeasuredDimensions(geometry, metadata);
    // Validate supplied image references even though image pixels stay in the
    // source workspace; the small transfer never copies a large PDF bitmap.
    if (meta.sourceImageDataUrl) sourceImage(meta);
    const id = 'zone:' + encodeURIComponent(metadata.id) + ':revision:' + encodeURIComponent(metadata.revision);
    const items = geometry.pieces.map(piece => ({ id: piece.id, sourcePieceId: piece.id, spec: panelSpec(piece, metadata) }));
    const body = { schema: SCHEMA, id, zoneId: metadata.id, revision: metadata.revision, name: metadata.name, project: metadata.project, poNumber: metadata.poNumber, sourceLabel: metadata.sourceLabel, notes: metadata.notes, geometry, meta: metadata, items };
    return { ...body, fingerprint: fingerprint({ geometry, meta: metadata }) };
  }
  function validateTransfer(payload) {
    if (!payload || payload.schema !== SCHEMA || !payload.meta || !payload.geometry) fail('Le transfert de calepinage est invalide.', 'INVALID_TRANSFER');
    const normalized = toTransfer(payload.geometry, payload.meta);
    for (const key of ['id', 'zoneId', 'revision', 'name', 'project', 'poNumber', 'sourceLabel', 'notes', 'items', 'fingerprint']) if (canonical(payload[key]) !== canonical(normalized[key])) fail('Le transfert a été modifié. Repréparez-le depuis la zone source.', 'TRANSFER_MISMATCH');
    return normalized;
  }
  function validateOrder(order) {
    if (!order || typeof order !== 'object' || !Array.isArray(order.items) || order.items.length > 1000) fail('Le dossier existant est illisible. Il a été conservé.', 'INVALID_ORDER');
    const ids = new Set();
    for (const item of order.items) {
      if (!item || !item.id || ids.has(item.id) || !item.spec || item.snapshot?.schema !== 'mir-production-instance-1') fail('Le dossier existant contient une ligne invalide. Il a été conservé.', 'INVALID_ORDER');
      ids.add(item.id);
    }
    if (order.layoutImports !== undefined && !Array.isArray(order.layoutImports)) fail('Les références de calepinage du dossier sont illisibles.', 'INVALID_ORDER');
    return ids;
  }
  function inspectImport(order, payload) {
    const transfer = validateTransfer(payload), ids = validateOrder(order);
    const signature = canonical({ geometry: transfer.geometry, meta: transfer.meta });
    const receipts = order.layoutImports || [], previous = receipts.find(receipt => receipt.id === transfer.id);
    if (previous) {
      if (previous.contentSignature !== signature) fail('Cette révision existe déjà avec d’autres cotes. Créez une nouvelle révision dans le calepinage.', 'REVISION_CONFLICT');
      return { transfer, signature, ids, alreadyImported: true, receipt: previous };
    }
    if (order.items.some(item => item.sourceLayout?.transferId === transfer.id)) fail('Des pièces de cette révision sont déjà présentes. Vérifiez le dossier avant un nouvel ajout.', 'EXISTING_LAYOUT_ITEMS');
    if (order.items.length + transfer.items.length > 1000) fail('Cet ajout dépasserait 1 000 lignes. Préparez un autre dossier.', 'ORDER_LIMIT');
    for (const [key, label] of [['project', 'projet'], ['poNumber', 'bon de commande']]) if (order.items.length && String(order[key] || '').trim() && transfer[key] && String(order[key]).trim() !== transfer[key]) fail('Le ' + label + ' du calepinage diffère du dossier ouvert. Ouvrez un dossier correspondant avant de regrouper les pièces.', 'ORDER_REFERENCE_CONFLICT');
    return { transfer, signature, ids, alreadyImported: false };
  }
  function prepareImport(order, payload) {
    try {
      if (!Production?.createTemplate || !Production?.instantiateTemplate) fail('Le moteur de production n’est pas disponible.');
      const state = inspectImport(order, payload), { transfer } = state;
      if (state.alreadyImported) return { ok: true, alreadyImported: true, order: clone(order), added: 0, transfer };
      const result = clone(order), addedItems = [], prefix = transfer.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'Zone';
      for (const item of transfer.items) {
        let id = item.id;
        if (state.ids.has(id)) id = prefix + '-' + item.id;
        let suffix = 2, base = id;
        while (state.ids.has(id)) id = base + '-' + suffix++;
        state.ids.add(id);
        const spec = { ...clone(item.spec), id, name: 'Panneau ' + id };
        const template = Production.createTemplate(spec, { id: 'calepinage-' + fingerprint(transfer.id) + '-' + fingerprint(id), name: spec.name, version: 1 });
        if (!template.ok) fail('La pièce ' + item.id + ' ne peut pas être préparée : ' + (template.errors || []).map(e => e.message).join(' '));
        const instance = Production.instantiateTemplate(template.template, {
          id, instanceId: id, name: spec.name, unit: 'in', measurements: { width: spec.width, height: spec.height, lip: spec.lip, relief: spec.relief, lips: {} },
          quantity: 1, material: spec.material, finish: spec.finish, dimensionBasis: spec.dimensionBasis, mirrorX: false,
          bottomEdgeId: spec.bottomEdgeId, perforation: spec.perforation, location: spec.location, note: spec.note
        });
        if (!instance.ok || !instance.model.valid || !near(instance.model.widthMM / 25.4, spec.width) || !near(instance.model.heightMM / 25.4, spec.height)) fail('La pièce ' + item.id + ' ne conserve pas ses cotes dans le dossier. Aucun panneau n’a été ajouté.');
        if (spec.shape === 'polygon' && !samePolygon(instance.model.pointsMM.map(p => p.map(n => n / 25.4)), spec.pointsIn)) fail('La pièce ' + item.id + ' ne conserve pas son contour dans le dossier. Aucun panneau n’a été ajouté.');
        addedItems.push({ id, kind: 'panel', spec: clone(instance.spec), snapshot: clone(instance.snapshot), history: clone(instance.history || []), selection: { materialId: '', colorId: '', colorSystem: spec.finish.selectionType === 'custom' ? 'special' : spec.finish.selectionType === 'ral' ? 'ral' : 'manufacturer' }, sourceLayout: { transferId: transfer.id, zoneId: transfer.zoneId, zoneName: transfer.name, revision: transfer.revision, sourcePieceId: item.sourcePieceId, sourceLabel: transfer.sourceLabel, row: transfer.geometry.pieces.find(p => p.id === item.id).row, col: transfer.geometry.pieces.find(p => p.id === item.id).col }, savedAt: new Date().toISOString() });
        if (transfer.meta.measuredWidthIn !== undefined) addedItems.at(-1).sourceLayout.zoneDimensions = {
          measuredWidthIn: transfer.meta.measuredWidthIn, measuredHeightIn: transfer.meta.measuredHeightIn,
          totalGapWidthIn: transfer.meta.totalGapWidthIn, totalGapHeightIn: transfer.meta.totalGapHeightIn,
          assembledWidthIn: transfer.geometry.widthIn, assembledHeightIn: transfer.geometry.heightIn,
          clearanceMethod: transfer.meta.clearanceMethod
        };
      }
      result.items.push(...addedItems);
      if (!result.project) result.project = transfer.project;
      if (!result.poNumber) result.poNumber = transfer.poNumber;
      result.layoutImports = [...(result.layoutImports || []), { id: transfer.id, zoneId: transfer.zoneId, name: transfer.name, revision: transfer.revision, sourceLabel: transfer.sourceLabel, notes: transfer.notes, contentSignature: state.signature, itemIds: addedItems.map(item => item.id), sourceIds: transfer.items.map(item => item.id), importedAt: new Date().toISOString() }];
      if (transfer.geometry.contourIn || transfer.meta.measuredWidthIn !== undefined) result.layoutImports.at(-1).sourceGeometry = { meta: clone(transfer.meta), contourIn: clone(transfer.geometry.contourIn || [[0, 0], [transfer.geometry.widthIn, 0], [transfer.geometry.widthIn, transfer.geometry.heightIn], [0, transfer.geometry.heightIn]]), widthIn: transfer.geometry.widthIn, heightIn: transfer.geometry.heightIn };
      return { ok: true, alreadyImported: false, order: result, added: addedItems.length, transfer, itemIds: addedItems.map(item => item.id) };
    } catch (error) { return { ok: false, added: 0, error: error.message, code: error.code || 'IMPORT_FAILED' }; }
  }
  function importStored(storage, dossierKey = DOSSIER_KEY, options = {}) {
    try {
      if (dossierKey !== DOSSIER_KEY) fail('Le calepinage se transfère uniquement dans le dossier local de l’atelier.', 'ADMIN_DOSSIER_ONLY');
      const rawTransfer = storage.getItem(STORAGE_KEY), rawOrder = storage.getItem(dossierKey);
      if (!rawTransfer) fail('Aucun calepinage n’attend dans ce navigateur.', 'EMPTY_TRANSFER');
      let payload, saved;
      try { payload = JSON.parse(rawTransfer); saved = rawOrder ? JSON.parse(rawOrder) : null; } catch { fail('Les données locales sont illisibles. Rien n’a été remplacé.', 'INVALID_STORAGE'); }
      if (rawOrder && (saved?.version !== 1 || !saved.order)) fail('Le dossier local a un format inconnu. Il a été conservé.', 'INVALID_STORAGE');
      const order = saved ? saved.order : options.fallbackOrder;
      if (saved && options.expectedOrder) {
        const displayed = clone(options.expectedOrder), stored = clone(order);
        // The M### counter is recalculated at boot. It is not dossier content.
        delete displayed.nextNumber; delete stored.nextNumber;
        if (canonical(displayed) !== canonical(stored)) fail('Le dossier affiché contient des changements non enregistrés ou a changé dans un autre onglet. Sauvegardez ou rechargez le dossier avant cet ajout.', 'STALE_DOSSIER');
      }
      const prepared = prepareImport(order, payload);
      if (!prepared.ok || prepared.alreadyImported) return prepared;
      if (storage.getItem(dossierKey) !== rawOrder || storage.getItem(STORAGE_KEY) !== rawTransfer) fail('Le dossier ou la zone a changé dans un autre onglet. Rechargez avant de réessayer.', 'STALE_STORAGE');
      try { storage.setItem(dossierKey, JSON.stringify({ version: 1, order: prepared.order })); } catch { fail('La sauvegarde locale est indisponible ou pleine. Aucun ajout n’a été confirmé; exportez vos dossiers avant de libérer de l’espace.', 'STORAGE_FAILED'); }
      return prepared;
    } catch (error) { return { ok: false, added: 0, error: error.message, code: error.code || 'IMPORT_FAILED' }; }
  }
  function formatIn(value) {
    if (!Number.isFinite(value)) return 'À préciser';
    const whole = Math.floor(value), sixteenths = Math.round((value - whole) * 64);
    if (Math.abs(value * 64 - Math.round(value * 64)) < 1e-7) {
      if (!sixteenths) return whole + ' po';
      if (sixteenths === 64) return (whole + 1) + ' po';
      let a = sixteenths, b = 64; while (a % 2 === 0) { a /= 2; b /= 2; }
      return (whole ? whole + ' ' : '') + a + '/' + b + ' po';
    }
    return String(Number(value.toFixed(6))).replace('.', ',') + ' po';
  }
  const svgText = (x, y, value, size = 22, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(value)}</text>`;
  const rect = (x, y, w, h, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${extra || ''}/>`;
  const line = (x, y, x2, y2, extra) => `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" ${extra || ''}/>`;
  const pointString = points => points.map(p => p.join(',')).join(' ');
  const angleText = value => String(Number(value.toFixed(3))).replace('.', ',') + '°';
  const areaText = value => String(Number(value.toFixed(6))).replace('.', ',') + ' po²';
  function labelPoint(points) {
    const ys = [...new Set(points.map(p => p[1]))].sort((a, b) => a - b), middle = (ys[0] + ys.at(-1)) / 2;
    let best = null;
    for (const y of [middle, ...ys.slice(1).map((v, i) => (v + ys[i]) / 2)]) {
      const xs = [];
      points.forEach((a, i) => { const b = points[(i + 1) % points.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); });
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const score = (xs[i + 1] - xs[i]) / (1 + Math.abs(y - middle) / Math.max(ys.at(-1) - ys[0], 1));
        if (!best || score > best.score) best = { score, point: [(xs[i] + xs[i + 1]) / 2, y] };
      }
    }
    return best?.point || points[0];
  }
  function polygonGridSVG(layout, x, y, width, height, showDimensions, overlay) {
    const sx = width / layout.widthIn, sy = height / layout.heightIn, project = p => [x + p[0] * sx, y + p[1] * sy];
    const clipId = 'contour-' + fingerprint([layout.contourIn, x, y, width, height]);
    let svg = `<defs><clipPath id="${clipId}"><polygon points="${pointString(layout.contourIn.map(project))}"/></clipPath></defs>`;
    svg += `<g clip-path="url(#${clipId})">`;
    for (const piece of layout.pieces) {
      svg += `<polygon data-panel="${esc(piece.id)}" points="${pointString(piece.polygonIn.map(project))}" fill="${overlay ? 'none' : '#e8eee4'}" stroke="#a8b99b" stroke-width="1"/>`;
      if (!overlay && piece.facePolygonIn) svg += `<polygon points="${pointString(piece.facePolygonIn.map(project))}" fill="#f8faf5" stroke="none"/>`;
    }
    for (const axis of layout.xAxesIn) svg += rect(x + (axis - layout.lipIn / 2) * sx, y, layout.lipIn * sx, height, 'fill="#6d8955" fill-opacity=".23" data-overlap="vertical"') + line(x + axis * sx, y, x + axis * sx, y + height, 'stroke="#527136" stroke-width="2" data-joint="vertical"');
    for (const axis of layout.yAxesIn) svg += rect(x, y + (axis - layout.lipIn / 2) * sy, width, layout.lipIn * sy, 'fill="#6d8955" fill-opacity=".23" data-overlap="horizontal"') + line(x, y + axis * sy, x + width, y + axis * sy, 'stroke="#527136" stroke-width="2" data-joint="horizontal"');
    svg += `</g><polygon data-wall-contour="true" points="${pointString(layout.contourIn.map(project))}" fill="none" stroke="#263e2d" stroke-width="3"/>`;
    for (const piece of layout.pieces) {
      const anchor = labelPoint(piece.polygonIn), [cx, cy] = project(anchor);
      const spans = [];
      piece.polygonIn.forEach((a, i) => { const b = piece.polygonIn[(i + 1) % piece.polygonIn.length]; if ((a[1] <= anchor[1] && b[1] > anchor[1]) || (b[1] <= anchor[1] && a[1] > anchor[1])) spans.push(a[0] + (anchor[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); });
      spans.sort((a, b) => a - b);
      let labelWidth = piece.widthIn * sx;
      for (let i = 0; i + 1 < spans.length; i += 2) if (anchor[0] >= spans[i] && anchor[0] <= spans[i + 1]) labelWidth = (spans[i + 1] - spans[i]) * sx;
      const narrow = labelWidth < 115 || piece.heightIn * sy < 85;
      const size = Math.max(12, Math.min(23, piece.widthIn * sx / (piece.id.length + 1.5)));
      if (overlay) svg += rect(cx - 34, cy - 20, 68, 29, 'rx="4" fill="white" fill-opacity=".92"');
      svg += svgText(cx, cy - (showDimensions && !narrow ? 20 : 0), piece.id, size, 'text-anchor="middle" font-weight="700"');
      if (showDimensions && !narrow) {
        const labels = ['L ' + formatIn(piece.widthIn), 'H ' + formatIn(piece.heightIn)], fontSize = Math.min(14, (labelWidth - 18) / (Math.max(...labels.map(label => label.length)) * .58));
        svg += svgText(cx, cy + 2, labels[0], fontSize, 'text-anchor="middle"') + svgText(cx, cy + 22, labels[1], fontSize, 'text-anchor="middle"');
      }
    }
    return svg;
  }
  function shell(body) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 960"><rect width="1400" height="960" fill="white"/><g font-family="Arial,sans-serif" fill="#24392b">${body}</g></svg>`; }
  function header(meta, heading) { return svgText(38, 45, heading, 30, 'font-weight="700"') + svgText(38, 78, meta.name + ' · Révision ' + meta.revision, 20) + svgText(38, 108, [meta.project, meta.poNumber ? 'BC ' + meta.poNumber : ''].filter(Boolean).join(' · '), 18); }
  function gridSVG(layout, x, y, width, height, showDimensions = true, overlay = false) {
    if (layout.contourIn) return polygonGridSVG(layout, x, y, width, height, showDimensions, overlay);
    const sx = width / layout.widthIn, sy = height / layout.heightIn, lipX = layout.lipIn * sx, lipY = layout.lipIn * sy;
    let svg = overlay ? '' : rect(x, y, width, height, 'fill="#e8eee4"');
    if (!overlay) for (const p of layout.pieces) svg += rect(x + (p.xIn + p.lipIn) * sx, y + (p.yIn + p.lipIn) * sy, (p.widthIn - p.lipIn * 2) * sx, (p.heightIn - p.lipIn * 2) * sy, 'fill="#f8faf5" stroke="#d0dbc9" stroke-width="1"');
    // One band / axis per shared overlap, not the two overlaid panel edges.
    for (let i = 0; i < layout.xAxesIn.length; i++) {
      const axisX = x + layout.xAxesIn[i] * sx;
      svg += rect(axisX - lipX / 2, y, lipX, height, 'fill="#6d8955" fill-opacity=".23" data-overlap="vertical"') + line(axisX, y, axisX, y + height, 'stroke="#527136" stroke-width="2" data-joint="vertical"');
    }
    for (let i = 0; i < layout.yAxesIn.length; i++) {
      const axisY = y + layout.yAxesIn[i] * sy;
      svg += rect(x, axisY - lipY / 2, width, lipY, 'fill="#6d8955" fill-opacity=".23" data-overlap="horizontal"') + line(x, axisY, x + width, axisY, 'stroke="#527136" stroke-width="2" data-joint="horizontal"');
    }
    svg += rect(x, y, width, height, 'fill="none" stroke="#263e2d" stroke-width="3"');
    for (const p of layout.pieces) {
      const centerX = x + (p.xIn + p.widthIn / 2) * sx, centerY = y + (p.yIn + p.heightIn / 2) * sy;
      const narrow = p.widthIn * sx < 145 || p.heightIn * sy < 75;
      const size = Math.max(13, Math.min(24, p.widthIn * sx / (p.id.length + 1.5)));
      if (overlay) svg += rect(centerX - 34, centerY - 20, 68, 29, 'rx="4" fill="white" fill-opacity=".92"');
      svg += svgText(centerX, centerY - (showDimensions && !narrow ? 20 : 0), p.id, size, 'text-anchor="middle" font-weight="700"');
      if (showDimensions && !narrow) {
        const labels = ['L ' + formatIn(p.widthIn), 'H ' + formatIn(p.heightIn)], fontSize = Math.min(14, (p.widthIn * sx - 18) / (Math.max(...labels.map(label => label.length)) * .58));
        svg += svgText(centerX, centerY + 2, labels[0], fontSize, 'text-anchor="middle"') + svgText(centerX, centerY + 22, labels[1], fontSize, 'text-anchor="middle"');
      }
    }
    return svg;
  }
  function dimensionsSVG(layout, x, y, width, height) {
    return line(x, y + height + 28, x + width, y + height + 28, 'stroke="#527136" stroke-width="1.5"') + line(x, y + height + 18, x, y + height + 38, 'stroke="#527136"') + line(x + width, y + height + 18, x + width, y + height + 38, 'stroke="#527136"') + svgText(x + width / 2, y + height + 60, formatIn(layout.widthIn) + ' · zone assemblée', 21, 'text-anchor="middle"') + line(x - 32, y, x - 32, y + height, 'stroke="#527136" stroke-width="1.5"') + line(x - 42, y, x - 22, y, 'stroke="#527136"') + line(x - 42, y + height, x - 22, y + height, 'stroke="#527136"') + `<text transform="translate(${x - 54} ${y + height / 2}) rotate(-90)" text-anchor="middle" font-size="21">${esc(formatIn(layout.heightIn))} · zone assemblée</text>`;
  }
  function sitePages(input, metadata = {}) {
    const layout = validateLayout(input), meta = normalizeMeta(metadata), source = sourceImage(metadata), pages = [];
    validateMeasuredDimensions(layout, meta);
    const common = { layout: 'wide', scaleNote: 'Schéma coté · échelle d’impression variable. Utiliser les cotes indiquées.', footerNote: 'Document chantier · même repère et même révision pour le calepinage et les panneaux. Validation atelier avant fabrication.' };
    const summary = [
      `${layout.columns} colonnes × ${layout.rows} rangées · ${layout.pieces.length} panneaux · cotes hors tout, lips inclus.`,
      `Lip ${formatIn(layout.lipIn)} · un seul recouvrement par joint. Projection C ${formatIn(meta.reliefIn)}.`,
      meta.sourceLabel ? 'Source : ' + meta.sourceLabel : 'Zone dessinée · cotes de référence saisies.',
      'Bas des panneaux : côté inférieur du schéma. Perforation : ' + (meta.perforation.enabled === true ? 'au bas · ' + (meta.perforation.details || 'détails à préciser') : meta.perforation.enabled === false ? 'non demandée' : 'à préciser')
    ];
    const dimensionLines = meta.measuredWidthIn === undefined ? [] : [
      'Largeur chantier ' + formatIn(meta.measuredWidthIn) + ' − jeu total ' + formatIn(meta.totalGapWidthIn) + ' = assemblée ' + formatIn(layout.widthIn),
      'Hauteur chantier ' + formatIn(meta.measuredHeightIn) + ' − jeu total ' + formatIn(meta.totalGapHeightIn) + ' = assemblée ' + formatIn(layout.heightIn)
    ];
    summary.push(...dimensionLines);
    if (dimensionLines.length) summary.push('Les jeux sont déduits une seule fois sur les dimensions hors tout X/Y; les pentes sont recalculées. Ce n’est pas un retrait perpendiculaire aux pentes.');
    if (layout.contourIn) summary.push('Surface du mur assemblé : ' + areaText(layout.checks.zoneAreaSqIn) + '. Les composantes séparées portent chacune leur repère.');
    if (meta.notes) summary.push('!! ' + meta.notes);
    const factor = Math.min(1120 / layout.widthIn, 600 / layout.heightIn), w = layout.widthIn * factor, h = layout.heightIn * factor, x = (1400 - w) / 2 + 16, y = 168 + (600 - h) / 2;
    const body = header(meta, 'CALEPINAGE · REPÈRES DE POSE') + gridSVG(layout, x, y, w, h) + dimensionsSVG(layout, x, y, w, h) + svgText(48, 880, dimensionLines[0] || 'Les lignes vertes indiquent les joints; la bande correspond au lip partagé.', 20) + svgText(48, 916, dimensionLines[1] || 'Chaque cote de panneau comprend ses lips. Dimensions détaillées dans la liste suivante.', 18);
    pages.push({ ...common, name: meta.name + ' · calepinage R' + meta.revision, svg: shell(body), summary });
    if (source) {
      const scale = Math.min(1300 / source.width, 750 / source.height), iw = source.width * scale, ih = source.height * scale, ix = (1400 - iw) / 2, iy = 145 + (750 - ih) / 2;
      const [bx, by, bw, bh] = source.box;
      const overlay = header(meta, 'EMPLACEMENT SUR LE PLAN') + `<image href="${esc(source.data)}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid meet"/>` + gridSVG(layout, ix + bx * iw, iy + by * ih, bw * iw, bh * ih, false, true);
      pages.push({ ...common, name: meta.name + ' · source R' + meta.revision, svg: shell(overlay), summary: [meta.sourceLabel || 'Plan importé', 'Emplacement de la zone et repères. Les cotes exactes sont celles du calepinage, à vérifier sur le chantier.'] });
    }
    const perPage = 19;
    for (let start = 0; start < layout.pieces.length; start += perPage) {
      const subset = layout.pieces.slice(start, start + perPage);
      let body = header(meta, 'LISTE DES PANNEAUX · ' + (Math.floor(start / perPage) + 1) + '/' + Math.ceil(layout.pieces.length / perPage));
      body += rect(36, 142, 1328, 46, 'fill="#e8eee4"') + svgText(55, 172, 'Repère', 21, 'font-weight="700"') + svgText(240, 172, 'Col. / rangée', 21) + svgText(470, 172, 'Largeur hors tout', 21) + svgText(790, 172, 'Hauteur hors tout', 21) + svgText(1115, 172, 'Lip', 21) + svgText(1290, 172, 'Qté', 21);
      subset.forEach((piece, i) => {
        const y = 188 + i * 35;
        if (i % 2 === 0) body += rect(36, y, 1328, 35, 'fill="#f8faf6"');
        body += svgText(55, y + 24, piece.id, 19, 'font-weight="700"') + svgText(240, y + 24, (piece.col + 1) + ' / ' + (piece.row + 1), 18) + svgText(470, y + 24, formatIn(piece.widthIn), 19) + svgText(790, y + 24, formatIn(piece.heightIn), 19) + svgText(1115, y + 24, formatIn(piece.lipIn), 18) + svgText(1303, y + 24, '1', 18);
      });
      body += svgText(42, 904, 'Cotes en pouces. Les lèvres périphériques sont comprises dans chaque hors tout.', 19) + svgText(42, 936, 'Projection C : ' + formatIn(meta.reliefIn) + ' · source et révision identiques au schéma de pose.', 18);
      pages.push({ ...common, name: meta.name + ' · panneaux ' + (start + 1) + ' à ' + (start + subset.length), svg: shell(body), summary: [layout.pieces.length + ' pièces au total · aucun développé de tôle déduit de ces dimensions.', 'Référence source : ' + (meta.sourceLabel || 'cotes saisies') + ' · Révision ' + meta.revision] });
    }
    if (layout.contourIn) for (const piece of layout.pieces) {
      const rowsPerPage = 12, pageCount = Math.ceil(piece.edges.length / rowsPerPage);
      for (let start = 0; start < piece.edges.length; start += rowsPerPage) {
        const edges = piece.edges.slice(start, start + rowsPerPage), pageNumber = Math.floor(start / rowsPerPage) + 1;
        let body = header(meta, 'PANNEAU ' + piece.id + ' · CÔTÉS ET ANGLES' + (pageCount > 1 ? ' · ' + pageNumber + '/' + pageCount : ''));
        body += svgText(45, 151, 'Hors tout ' + formatIn(piece.widthIn) + ' × ' + formatIn(piece.heightIn) + ' · surface réelle ' + areaText(piece.areaSqIn), 20, 'font-weight="700"');
        const factor = Math.min(540 / piece.widthIn, 480 / piece.heightIn), w = piece.widthIn * factor, h = piece.heightIn * factor, x = 100 + (540 - w) / 2, y = 245 + (480 - h) / 2;
        const project = p => [x + p[0] * factor, y + p[1] * factor];
        body += `<polygon data-piece-contour="${esc(piece.id)}" points="${pointString(piece.localPolygonIn.map(project))}" fill="#edf2e8" stroke="#31533c" stroke-width="3"/>`;
        if (piece.facePolygonIn) body += `<polygon points="${pointString(piece.facePolygonIn.map(p => project([p[0] - piece.xIn, p[1] - piece.yIn])))}" fill="#fff" stroke="#92a67d" stroke-width="1"/>`;
        const markedVertices = piece.localPolygonIn.map(project), labels = [];
        for (let i = start; i < Math.min(start + rowsPerPage, piece.localPolygonIn.length); i++) {
          const [vx, vy] = markedVertices[i], crowded = markedVertices.some((p, j) => j !== i && Math.hypot(p[0] - vx, p[1] - vy) < 36);
          let lx = vx, ly = vy;
          if (crowded || labels.some(p => Math.hypot(p[0] - lx, p[1] - ly) < 36)) {
            const direction = Math.atan2(vy - (y + h / 2), vx - (x + w / 2));
            const candidates = [];
            for (const radius of [30, 48, 68, 90]) for (const offset of [0, .6, -.6, 1.2, -1.2, 1.8, -1.8, Math.PI]) candidates.push([vx + Math.cos(direction + offset) * radius, vy + Math.sin(direction + offset) * radius]);
            const candidate = candidates.find(p => p[0] >= 65 && p[0] <= 704 && p[1] >= 205 && p[1] <= 805 && labels.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) >= 36) && markedVertices.every((q, j) => j === i || Math.hypot(p[0] - q[0], p[1] - q[1]) >= 24));
            if (candidate) [lx, ly] = candidate;
            body += line(vx, vy, lx, ly, 'stroke="#547542" stroke-width="1"') + `<circle cx="${vx}" cy="${vy}" r="3" fill="#31533c"/>`;
          }
          labels.push([lx, ly]);
          body += `<circle cx="${lx}" cy="${ly}" r="15" fill="white" stroke="#547542"/>` + svgText(lx, ly + 5, 'S' + (i + 1), 12, 'text-anchor="middle" font-weight="700"');
        }
        body += dimensionsSVG({ widthIn: piece.widthIn, heightIn: piece.heightIn }, x, y, w, h).replace(/zone assemblée/g, 'hors tout');
        body += rect(750, 185, 610, 44, 'fill="#e8eee4"') + svgText(762, 214, 'Côté', 18, 'font-weight="700"') + svgText(852, 214, 'Longueur', 18) + svgText(1088, 214, 'Intérieur', 18) + svgText(1232, 214, 'Direction', 18);
        edges.forEach((edge, index) => {
          const y = 229 + index * 50, vertex = start + index, p = piece.localPolygonIn[vertex];
          if (index % 2 === 0) body += rect(750, y, 610, 50, 'fill="#f8faf6"');
          body += svgText(762, y + 21, 'E' + (vertex + 1), 19, 'font-weight="700"') + svgText(852, y + 21, formatIn(edge.lengthIn), 18) + svgText(1088, y + 21, angleText(edge.interiorAngleDeg), 18) + svgText(1232, y + 21, angleText(edge.angleDeg), 18);
          body += svgText(762, y + 42, 'S' + (vertex + 1) + ' : X ' + formatIn(p[0]) + ' · Y ' + formatIn(p[1]), 15, 'fill="#607058"');
        });
        body += svgText(45, 856, 'Lip ' + formatIn(piece.lipIn) + ' compris dans le hors tout · projection C ' + formatIn(meta.reliefIn) + ' · aucun développé de pli déduit.', 19);
        body += svgText(45, 892, 'Le côté Ei part du sommet Si vers le suivant. Angle intérieur à Si. Direction depuis +X, sens horaire.', 18);
        body += svgText(45, 928, 'Coordonnées locales : origine en haut à gauche, Y vers le bas. Raccords et retours à valider en atelier.', 18);
        pages.push({ ...common, name: piece.id + ' · cotes et angles ' + pageNumber + '/' + pageCount, svg: shell(body), summary: [
          piece.id + ' · ' + piece.edges.length + ' côtés · surface réelle ' + areaText(piece.areaSqIn) + ' · quantité 1.',
          'Cotes hors tout et longueur de chaque arête calculées sur le même contour. Affichage des angles à 0,001°; calcul sans arrondi intermédiaire.',
          piece.faceStatus === 'valid' ? 'La face intérieure géométrique est représentée. Les détails de fabrication restent à confirmer.' : 'Le contour de coupe est exact. Les lips aux pointes ou angles rentrants nécessitent un détail d’atelier.'
        ] });
      }
    }
    return pages;
  }
  return Object.freeze({ version: '1.0.0', SCHEMA, STORAGE_KEY, DOSSIER_KEY, validateLayout, validateTransfer, inspectImport, toTransfer, prepareImport, importStored, sitePages, formatIn });
});
