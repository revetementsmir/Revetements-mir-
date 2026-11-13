/* MIR production drawings: finished dimensions, never an inferred sheet-metal development. */
(function (factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window === 'object') window.MIRProduction = api;
})(function () {
  'use strict';
  const VERSION = '1.0.0', EPS = 1e-8, MAX_MM = 100000, MAX_SEGMENTS = 26;
  const roof = typeof window==='object'?window.MIRPanelRoof:typeof require==='function'?require('./mir-panel-roof.js'):null;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const copy = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
  const text = (v, max = 160) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
  const esc = v => text(v, 800).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const decimal = n => finite(n) ? String(Math.round(n * 10000) / 10000) : 'À préciser';
  const round = n => Math.abs(n) < EPS ? 0 : Math.round(n * 1e10) / 1e10;
  const cleanPoint = p => p.map(round);
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const bounds = points => ({ minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])), minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])) });
  const area = points => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const units = u => /^(in|po|inch|inches)$/i.test(String(u || 'in')) ? 'in' : String(u).toLowerCase() === 'mm' ? 'mm' : null;
  const issue = (code, path, message) => ({ code, path, message });

  // Free outlines are finished, local Y-up coordinates. A template stores only
  // unitless vertex ratios; its instance supplies the outside A/B measurements.
  function simplePanelPolygon(points, width, height) {
    if (!finite(width) || !finite(height) || width <= 0 || height <= 0) return 'La largeur et la hauteur hors tout du contour doivent être positives.';
    if (!Array.isArray(points) || points.length < 3 || points.length > 128 || points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !finite(n)))) return 'Le contour doit contenir de 3 à 128 sommets numériques.';
    const tolerance = Math.max(1, width, height) * 1e-8, b = bounds(points);
    if (Math.abs(b.minX) > tolerance || Math.abs(b.minY) > tolerance || Math.abs(b.maxX - width) > tolerance || Math.abs(b.maxY - height) > tolerance) return 'Le contour local doit correspondre exactement à la largeur et à la hauteur hors tout.';
    if (area(points) <= tolerance * tolerance || points.some((p, i) => dist(p, points[(i + 1) % points.length]) <= tolerance)) return 'Le contour doit avoir une surface positive et des côtés non nuls.';
    const on = (a, b, p) => Math.abs(cross(a, b, p)) <= tolerance * Math.max(1, dist(a, b)) && p[0] >= Math.min(a[0], b[0]) - tolerance && p[0] <= Math.max(a[0], b[0]) + tolerance && p[1] >= Math.min(a[1], b[1]) - tolerance && p[1] <= Math.max(a[1], b[1]) + tolerance;
    const intersects = (a, b, c, d) => {
      const ab = Math.max(1, dist(a, b)) * tolerance, cd = Math.max(1, dist(c, d)) * tolerance;
      const x = cross(a, b, c), y = cross(a, b, d), z = cross(c, d, a), t = cross(c, d, b);
      return ((x > ab && y < -ab || x < -ab && y > ab) && (z > cd && t < -cd || z < -cd && t > cd)) || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
    };
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || i === 0 && j === points.length - 1) continue;
      if (intersects(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) return 'Le contour se croise ou se touche. Utilisez un contour simple, sans trou.';
    }
    return null;
  }
  function panelPolygonPoints(spec, width, height) {
    const valid = points => Array.isArray(points) && points.every(p => Array.isArray(p) && p.length === 2 && p.every(finite));
    if (own(spec, 'contourRatios')) return valid(spec.contourRatios) ? spec.contourRatios.map(p => [p[0] * width, p[1] * height]) : null;
    if (own(spec, 'pointsIn')) return valid(spec.pointsIn) ? spec.pointsIn.map(p => [p[0] * 25.4, p[1] * 25.4]) : null;
    return null;
  }

  // Recompute the colour rule from the selection, never a saved pricing flag.
  // A named manufacturer finish awaiting availability is distinct from custom.
  function colorQuotePolicy(value = {}) {
    const spec = value?.snapshot?.spec || value?.spec || value || {}, finish = spec.finish || {};
    const normalize = v => text(v, 120).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const system = normalize(finish.system), manufacturer = normalize(finish.manufacturer), code = text(finish.code, 80);
    let selectionType = ['manufacturer', 'ral', 'custom'].includes(finish.selectionType) ? finish.selectionType : null;
    if (!selectionType) {
      if (/\bral\b/.test(system) || !system && /^ral\s*\d/i.test(code)) selectionType = 'ral';
      else if (/\b(custom|personnalise|personnalisee|special|speciale|sur mesure|pantone|ncs)\b/.test(system)) selectionType = 'custom';
      else if (manufacturer || /^(nuancier(?: du)?|catalogue(?: du)?|fabricant|manufacturer)\b/.test(system) || /^(unico|kaycan|gentek|vicwest|james hardie|maibec|canexel|rialux|mac metal|royal|light trim)$/.test(system)) selectionType = 'manufacturer';
      else if (finish.special === true || system || code) selectionType = 'custom';
      else selectionType = 'unspecified';
    }
    // A stale/forged manufacturer flag must not turn a RAL or custom request
    // into a standard finish. An explicit custom choice always stays custom.
    if (selectionType === 'manufacturer') {
      if (/\bral\b/.test(system) || /^ral\s*\d/i.test(code)) selectionType = 'ral';
      else if (/\b(custom|personnalise|personnalisee|special|speciale|sur mesure|pantone|ncs)\b/.test(system)) selectionType = 'custom';
    }
    const customColor = selectionType === 'ral' || selectionType === 'custom';
    const status = customColor ? 'quote_required' : !code ? 'finish_required' : finish.special === true ? 'manufacturer_confirmation_required' : 'price_unconfigured';
    const label = customColor ? 'Soumission obligatoire' : !code ? 'Couleur à préciser' : finish.special === true ? 'Disponibilité à confirmer' : 'Prix sur demande';
    const reason = customColor ? 'Toute couleur personnalisée, y compris RAL, exige une soumission. Aucun prix automatique.' : !code ? 'Choisissez une référence de couleur avant de demander le prix.' : finish.special === true ? 'La couleur appartient au nuancier du fabricant; sa disponibilité sur cette pièce reste à confirmer.' : 'Le tarif et la disponibilité de cette référence fabricant restent à confirmer.';
    return { version: 'mir-color-quote-1', required: customColor, reason, automaticPricingAllowed: false, customColor, label, selectionType, status };
  }

  // Both dependencies are read when a piece is priced, after deferred scripts
  // have loaded. Node consumers use the same reference data and mesh validator.
  function pricingReferences() {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return { unico: require('./unico-data.js'), volume: require('./production-volume.js') };
    }
    return { unico: typeof window === 'object' ? window.MIRUnico : null,
      volume: typeof window === 'object' ? window.MIRProductionVolume : null };
  }
  const PRICING_BASIS = 'projected_outer_area_including_lips';
  const pricingNote = 'Surface de la forme hors tout, lips compris. La projection C et les retours ne sont pas ajoutés une seconde fois. Taxes et livraison non calculées; disponibilité et fabrication à confirmer.';
  const normalizeReference = value => text(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function knownAluminiumFinish(spec, unico, policy) {
    if (policy.selectionType !== 'manufacturer') return null;
    const finish = spec.finish || {}, manufacturer = normalizeReference(finish.manufacturer), system = normalizeReference(finish.system);
    if (manufacturer ? manufacturer !== 'unico' : !/^(?:nuancier\s+)?unico(?:\s|$)/.test(system)) return null;
    const allowedPalettes = unico?.materials?.find(material => material.id === 'aluminium')?.paletteIds || [];
    const colors = (unico?.palettes || []).filter(palette => palette.materialId === 'aluminium' && allowedPalettes.includes(palette.id)).flatMap(palette => palette.colors || []);
    const code = normalizeReference(finish.code), name = normalizeReference(finish.name), id = text(finish.colorId || finish.id, 100);
    // An official name identifies Graphite/Corten alu even when Unico does not
    // publish a code. Never create a code or accept a mismatched name/code pair.
    return colors.find(color => {
      if (id && id !== color.id) return false;
      if (code && code !== normalizeReference(color.code)) return false;
      if (name && name !== normalizeReference(color.name)) return false;
      return !!(code || name || id);
    }) || null;
  }
  function pricingForModel(model, policy) {
    const spec = model.spec || {}, rawMaterial = spec.material || {}, quantity = model.quantity ?? null;
    const result = { schema: 'mir-piece-pricing-1', status: 'on_request', requiresQuote: policy.required,
      automaticPricingAllowed: false, currency: 'CAD', rate: null, rateUnit: 'in2', rateCents: null,
      areaSqIn: null, unitAmount: null, unitCents: null, quantity, lineAmount: null, lineCents: null,
      basis: PRICING_BASIS, tariffId: null, taxIncluded: null, taxStatus: 'not_calculated', shippingStatus: 'not_calculated',
      label: 'Prix sur demande', note: 'Aucun tarif automatique n’est configuré pour cette pièce.',
      sourceKind: 'user_instruction', geometryErrors: [] };
    if (policy.required) return { ...result, status: 'quote_required', label: 'Soumission obligatoire', note: policy.reason };
    if (model.kind !== 'panel' || rawMaterial.type !== 'aluminium' || rawMaterial.productRef !== 'unico-up1-aluminium') return result;
    const { unico, volume } = pricingReferences(), tariff = unico?.pricing;
    if (!tariff || tariff.calculationEnabled !== true || tariff.status !== 'configured' || tariff.currency !== 'CAD' || tariff.unit !== 'in2' || tariff.basis !== PRICING_BASIS || tariff.scope !== 'aluminium' || !tariff.productIds?.includes(rawMaterial.productRef) || !finite(tariff.amount) || tariff.amount <= 0) return result;
    if (!knownAluminiumFinish(spec, unico, policy)) return { ...result, status: 'finish_required', label: 'Couleur fabricant à préciser', note: 'Choisissez une couleur de la collection aluminium Unico pour calculer le prix. Une couleur personnalisée exige une soumission.' };
    if (!model.valid || !finite(model.areaMM2) || model.areaMM2 <= 0) return { ...result, status: 'dimensions_required', label: 'Cotes à compléter', note: 'Renseignez les dimensions valides de la forme pour calculer sa surface.' };
    if (!volume?.buildMesh) return { ...result, status: 'geometry_unverified', label: 'Géométrie à vérifier', note: 'Le contrôle de la projection et des lips est indisponible; aucun prix automatique.' };
    const mesh = volume.buildMesh(model);
    if (!mesh.valid) return { ...result, status: 'dimensions_required', label: 'Géométrie à corriger', note: mesh.errors.map(error => error.message).join(' '), geometryErrors: copy(mesh.errors) };
    if (quantity === null) return { ...result, status: 'quantity_required', label: 'Quantité à préciser', note: 'Indiquez une quantité entière valide pour calculer le montant de cette ligne.' };
    const areaSqIn = model.areaMM2 / (25.4 * 25.4), rateCents = tariff.amount * 100, rawUnitCents = areaSqIn * rateCents;
    // Do not round the area. Round the unit price once, then multiply that exact
    // cent amount by quantity. A tiny relative allowance absorbs binary error at
    // a half-cent boundary (e.g. an equivalent dimension entered in mm).
    const unitCents = Math.round(rawUnitCents + Number.EPSILON * Math.max(1, Math.abs(rawUnitCents)) * 4), lineCents = unitCents * quantity;
    if (!finite(areaSqIn) || areaSqIn <= 0 || !Number.isSafeInteger(rateCents) || !Number.isSafeInteger(unitCents) || unitCents < 0 || !Number.isSafeInteger(lineCents) || lineCents < 0) return { ...result, status: 'amount_out_of_range', label: 'Montant à vérifier', note: 'Le montant dépasse la précision de calcul autorisée; aucun total automatique.' };
    return { ...result, status: 'priced', automaticPricingAllowed: true, rate: tariff.amount, rateCents, areaSqIn,
      unitCents, unitAmount: unitCents / 100, lineCents, lineAmount: lineCents / 100,
      tariffId: text(tariff.id, 100) || null, label: 'Prix de base calculé', note: pricingNote,
      availabilityConfirmationRequired: true };
  }
  function withPricing(model) {
    const policy = colorQuotePolicy(model.spec), pricing = pricingForModel(model, policy);
    model.quotePolicy = { ...policy, automaticPricingAllowed: pricing.automaticPricingAllowed };
    if (pricing.status === 'priced') Object.assign(model.quotePolicy, {
      status: 'manufacturer_confirmation_required', label: 'Prix calculé · disponibilité à confirmer',
      reason: 'Le prix de base suit le tarif MIR au pouce carré. La disponibilité de la couleur fabricant et la fabrication restent à confirmer.'
    });
    model.pricing = { ...pricing, quotePolicy: copy(model.quotePolicy) };
    return model;
  }
  function profilePricing(model, tariff) {
    const result = model.pricing;
    if (!tariff || !model.valid || result.requiresQuote || model.quotePolicy.selectionType !== 'manufacturer' ||
      !model.finish.code || !['aluminium', 'acier'].includes(model.material.type) || model.quantity === null ||
      model.lengthMM === null || model.lengthMM > 120 * 25.4 + 0.001) return result;
    const calculator = typeof module === 'object' && module.exports
      ? require('./mir-bend-pricing.js') : window.MIRBendPricing;
    const areaSqIn = model.finishedSegmentSumMM / 25.4 * 120;
    const folds = model.bends.filter(bend => bend.turnDeg !== 0).length;
    const unitCents = calculator.unitCents(tariff, model.material.type, null, areaSqIn, folds);
    if (unitCents === null) return result;
    const lineCents = unitCents * model.quantity;
    return { ...result, status: 'priced', automaticPricingAllowed: true, basis: 'profile_120in_and_bends',
      tariffRevision: tariff.revision, billingLengthIn: 120, areaSqIn, folds,
      rate: tariff.area_rate, bendCents: tariff.bend_cents,
      aluminumBasisPoints: model.material.type === 'aluminium' ? tariff.aluminum_basis_points : 0,
      unitCents, unitAmount: unitCents / 100, lineCents, lineAmount: lineCents / 100,
      label: 'Prix de base calculé', note: 'Prix calculé sur 10 pi, avant taxes et livraison. Disponibilité et fabrication à confirmer.',
      availabilityConfirmationRequired: true };
  }
  function currentPricing(model, bendTariff) {
    return model.kind === 'profile' ? profilePricing(model, bendTariff) : model.pricing;
  }
  function pricePiece(value = {}, { bendTariff } = {}) { return copy(currentPricing(modelOf(value), bendTariff)); }
  function quotePolicy(value = {}) { return copy(modelOf(value).quotePolicy); }
  function priceDossier(values = [], { bendTariff } = {}) {
    if (!Array.isArray(values)) throw new TypeError('Le dossier doit contenir un tableau de pièces.');
    if (values.length > 1000) throw new RangeError('Un dossier est limité à 1 000 lignes; créez plusieurs lots.');
    const items = values.map((value, index) => {
      const model = modelOf(value), itemId = text(value?.id || value?.snapshot?.id || model.id, 100) || 'M' + String(index + 1).padStart(3, '0');
      return { itemId, ...copy(currentPricing(model, bendTariff)) };
    });
    const quoteItemIds = items.filter(item => item.requiresQuote).map(item => item.itemId), unpricedItemIds = items.filter(item => item.status !== 'priced').map(item => item.itemId);
    const seen = new Set(), duplicateItemIds = [];
    for (const item of items) { if (seen.has(item.itemId)) duplicateItemIds.push(item.itemId); seen.add(item.itemId); }
    let pricedSubtotalCents = 0;
    for (const item of items.filter(item => item.status === 'priced')) {
      const next = pricedSubtotalCents + item.lineCents;
      if (!Number.isSafeInteger(next)) { pricedSubtotalCents = null; break; }
      pricedSubtotalCents = next;
    }
    const complete = items.length > 0 && unpricedItemIds.length === 0 && duplicateItemIds.length === 0 && pricedSubtotalCents !== null;
    return { schema: 'mir-dossier-pricing-2', currency: 'CAD', basis: PRICING_BASIS,
      status: pricedSubtotalCents === null ? 'amount_out_of_range' : duplicateItemIds.length ? 'invalid_dossier' : quoteItemIds.length ? 'quote_required' : complete ? 'priced' : items.some(item => item.status === 'priced') ? 'partial' : 'not_priced',
      requiresQuote: quoteItemIds.length > 0, automaticPricingAllowed: complete,
      pricedSubtotalCents, pricedSubtotal: pricedSubtotalCents === null ? null : pricedSubtotalCents / 100,
      totalCents: complete ? pricedSubtotalCents : null, total: complete ? pricedSubtotalCents / 100 : null,
      quoteItemIds, unpricedItemIds, duplicateItemIds, items, taxIncluded: null, taxStatus: 'not_calculated', shippingStatus: 'not_calculated',
      note: 'Seules les lignes tarifées composent le sous-total. Les autres pièces restent à chiffrer; taxes et livraison non calculées.' };
  }

  function parseMeasurement(value, unit = 'in') {
    const u = units(unit), bad = reason => ({ ok: false, value: null, mm: null, unit: u, error: reason });
    if (!u) return bad('Unité non reconnue; choisissez po ou mm.');
    if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return bad('Cote à préciser.');
    let n = value;
    if (typeof value === 'string') {
      const fractions = { '¼': '1/4', '½': '1/2', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' };
      let s = value.trim().replace(/[¼½¾⅛⅜⅝⅞]/g, f => ' ' + fractions[f]).replace(',', '.').replace(/\s+/g, ' ').trim().replace(/^([-+])\s+/, '$1');
      const suffix = s.match(/\s*(mm|po|in|["″])$/i);
      if (suffix) {
        const writtenUnit = suffix[1].toLowerCase() === 'mm' ? 'mm' : 'in';
        if (writtenUnit !== u) return bad('La cote et le sélecteur d’unité ne correspondent pas.');
        s = s.slice(0, suffix.index).trim();
      }
      const mixed = s.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/), fraction = s.match(/^([+-]?\d+)\/(\d+)$/);
      if (mixed) n = Number(mixed[1]) + (mixed[1].startsWith('-') ? -1 : 1) * Number(mixed[2]) / Number(mixed[3]);
      else if (fraction) n = Number(fraction[1]) / Number(fraction[2]);
      else if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) n = Number(s);
      else return bad('Entrez un nombre ou une fraction, par exemple 3 1/2.');
    }
    if (!finite(n)) return bad('Cote non finie ou non numérique.');
    const mm = n * (u === 'in' ? 25.4 : 1);
    if (!finite(mm) || Math.abs(mm) > MAX_MM) return bad('Cote hors de la plage du dessin.');
    return { ok: true, value: n, mm, unit: u, error: null };
  }

  function formatMeasurement(mm, unit = 'in') {
    if (!finite(mm)) return 'À préciser';
    const u = units(unit) || 'in', value = u === 'in' ? mm / 25.4 : mm;
    if (u === 'mm') return decimal(value) + ' mm';
    const sixteenths = Math.round(value * 64);
    if (Math.abs(value * 64 - sixteenths) < 1e-7) {
      const sign = sixteenths < 0 ? '-' : '', absolute = Math.abs(sixteenths), whole = Math.floor(absolute / 64), num = absolute % 64;
      if (!num) return sign + whole + ' po';
      const gcd = (a, b) => b ? gcd(b, a % b) : a, d = gcd(num, 64);
      return sign + (whole ? whole + ' ' : '') + num / d + '/' + 64 / d + ' po';
    }
    return decimal(value) + ' po';
  }

  const TEMPLATES = Object.freeze({
    l: Object.freeze({ id: 'l', label: 'L', labels: ['A', 'B'], fieldLabels: ['Aile A', 'Aile B'], startAngle: 0, turns: [90] }),
    j: Object.freeze({ id: 'j', label: 'J', labels: ['A', 'B', 'C'], fieldLabels: ['Retour A', 'Hauteur B', 'Base C'], startAngle: 180, turns: [90, 90] }),
    z: Object.freeze({ id: 'z', label: 'Z', labels: ['A', 'B', 'C'], fieldLabels: ['Aile A', 'Hauteur B', 'Aile C'], startAngle: 0, turns: [90, -90] }),
    beam5: Object.freeze({ id: 'beam5', label: 'Beam · cinq cotes', labels: ['A', 'B', 'C', 'D', 'E'], fieldLabels: ['Aile supérieure droite', 'Hauteur droite', 'Base', 'Hauteur gauche', 'Aile supérieure gauche'], startAngle: 180, turns: [90, -90, -90, 90] }),
    omega: Object.freeze({ id: 'omega', label: 'Oméga · cinq cotes', labels: ['A', 'B', 'C', 'D', 'E'], fieldLabels: ['Patte gauche', 'Hauteur gauche', 'Dessus', 'Hauteur droite', 'Patte droite'], startAngle: 0, turns: [90, -90, -90, 90] })
  });
  const SHAPES = Object.freeze([
    { id: 'rectangle', label: 'Rectangle' }, { id: 'square', label: 'Carré' },
    { id: 'right-triangle', label: 'Triangle rectangle' }, { id: 'triangle', label: 'Triangle à sommet réglable' },
    { id: 'trapezoid', label: 'Trapèze' }, { id: 'parallelogram', label: 'Parallélogramme' },
    { id: 'pointed', label: 'Rectangle avec côté en pointe' },
    { id: 'roof-slope', label: 'Panneau à haut rampant (X/12)' }
  ]);
  const MIRRORED_RIGHT_ANGLES = Object.freeze({ 'bottom-left': 'bottom-right', 'bottom-right': 'bottom-left', 'top-left': 'top-right', 'top-right': 'top-left' });
  const PANEL_OUTER_DIMENSIONS = 'outer_including_lips';

  function measure(value, unit, path, errors, { zero = false, signed = false, required = true } = {}) {
    const parsed = parseMeasurement(value, unit);
    if (!parsed.ok) { if (required) errors.push(issue('MISSING_OR_INVALID_MEASURE', path, parsed.error)); return null; }
    if (!signed && (parsed.mm < 0 || (!zero && parsed.mm <= 0))) { errors.push(issue('NON_POSITIVE_MEASURE', path, zero ? 'La cote doit être positive ou nulle.' : 'La cote doit être supérieure à zéro.')); return null; }
    return parsed.mm;
  }
  function angleValue(value) { if (typeof value === 'string' && !value.trim()) return null; const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value; return finite(n) ? n : null; }
  function normalizeBend(raw, index, errors) {
    const path = 'bends.' + index, mode = raw?.mode || raw?.type;
    if (mode === 'hem') {
      if (!['left', 'right'].includes(raw.direction)) { errors.push(issue('MISSING_BEND_DIRECTION', path, 'Précisez le sens du retour écrasé.')); return null; }
      return { mode, angle: 180, direction: raw.direction, turnDeg: raw.direction === 'left' ? 180 : -180, label: 'Retour écrasé 180° · ' + (raw.direction === 'left' ? 'gauche' : 'droite') };
    }
    const n = angleValue(raw?.angle);
    if (mode === 'signed') {
      if (n === null || n <= -180 || n >= 180) { errors.push(issue('INVALID_SIGNED_ANGLE', path, 'L’angle signé doit être entre −180° et 180°; utilisez « retour écrasé » pour 180°.')); return null; }
      return { mode, angle: n, turnDeg: n, label: 'Rotation ' + decimal(n) + '°' };
    }
    if (mode === 'interior') {
      if (n === null || n <= 0 || n > 180 || !['left', 'right'].includes(raw?.direction)) { errors.push(issue('INVALID_INTERIOR_ANGLE', path, 'Précisez un angle intérieur de plus de 0° à 180° et son sens.')); return null; }
      const turn = (180 - n) * (raw.direction === 'left' ? 1 : -1);
      return { mode, angle: n, direction: raw.direction, turnDeg: turn, label: decimal(n) + '° intérieur · ' + (raw.direction === 'left' ? 'gauche' : 'droite') };
    }
    errors.push(issue('MISSING_BEND', path, 'Précisez le pli : angle intérieur, rotation signée ou retour écrasé.'));
    return null;
  }

  function metadata(spec, unit, kind) {
    const pending = [], warnings = [], rawMat = spec.material || {}, rawFinish = spec.finish || {};
    const quantity = Number.isSafeInteger(spec.quantity) && spec.quantity > 0 && spec.quantity <= 100000 ? spec.quantity : null;
    if (quantity === null) pending.push(issue('QUANTITY_REQUIRED', 'quantity', 'Quantité entière à préciser.'));
    const material = { type: text(rawMat.type, 40), name: text(rawMat.name, 100), productRef: text(rawMat.productRef, 100) || null, gauge: text(rawMat.gauge, 40), thicknessMM: null };
    const extruded = material.type === 'aluminium-extrude';
    if (extruded) { material.name = material.name || 'Aluminium extrudé'; material.form = 'extruded'; }
    if (!material.type) pending.push(issue('MATERIAL_REQUIRED', 'material.type', 'Matière à préciser.'));
    if (rawMat.thickness !== null && rawMat.thickness !== undefined && rawMat.thickness !== '') {
      // The extruded panel choices are millimetres even when A/B/C are in inches.
      // An explicit, contradictory unit remains visible and cannot pass validation.
      const thicknessUnit = rawMat.thicknessUnit || (extruded ? 'mm' : unit);
      const t = parseMeasurement(rawMat.thickness, thicknessUnit);
      if (t.ok && t.mm > 0) material.thicknessMM = t.mm;
      else pending.push(issue('THICKNESS_INVALID', 'material.thickness', 'Épaisseur de tôle invalide.'));
      if (extruded && units(thicknessUnit) !== 'mm') pending.push(issue('EXTRUDED_THICKNESS_UNIT', 'material.thicknessUnit', 'L’épaisseur de l’aluminium extrudé se choisit en millimètres : 2 mm ou 3 mm.'));
    }
    const gaugePlaceholder = material.gauge.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const unknownGauge = /^(?:unknown|inconnu|inconnue|a preciser|a confirmer|non renseigne|non specifie|tbd|n\/?a|\?|—|-)$/i.test(gaugePlaceholder);
    if (unknownGauge) pending.push(issue('GAUGE_UNCONFIRMED', 'material.gauge', 'Le gage indiqué comme inconnu reste à préciser; aucune épaisseur n’est supposée.'));
    if (extruded) {
      if (material.thicknessMM === null) pending.push(issue('EXTRUDED_THICKNESS_REQUIRED', 'material.thickness', 'Choisissez l’épaisseur de l’aluminium extrudé : 2 mm ou 3 mm.'));
      else if (![2, 3].some(t => Math.abs(material.thicknessMM - t) < EPS)) pending.push(issue('EXTRUDED_THICKNESS_CHOICE', 'material.thickness', 'Ce modèle d’aluminium extrudé propose seulement 2 mm ou 3 mm.'));
    } else if (!material.gauge && material.thicknessMM === null) pending.push(issue('GAUGE_OR_THICKNESS_REQUIRED', 'material', 'Gage ou épaisseur de tôle à préciser.'));
    if (material.gauge && !unknownGauge) warnings.push(issue('GAUGE_NOT_CONVERTED', 'material.gauge', 'Le gage est conservé tel que saisi; aucune conversion en épaisseur n’est supposée.'));
    const finish = { manufacturer: text(rawFinish.manufacturer, 100), name: text(rawFinish.name, 100), code: text(rawFinish.code, 80), system: text(rawFinish.system, 60), selectionType: ['manufacturer', 'ral', 'custom'].includes(rawFinish.selectionType) ? rawFinish.selectionType : null, special: rawFinish.special === true, hex: /^#[0-9a-f]{6}$/i.test(rawFinish.hex || '') ? rawFinish.hex : null };
    const pricing = colorQuotePolicy({ finish });
    if (!finish.manufacturer && !finish.system) pending.push(issue('COLOR_SOURCE_REQUIRED', 'finish', 'Précisez le fabricant ou le nuancier de la couleur.'));
    if (!finish.code) pending.push(issue('COLOR_CODE_REQUIRED', 'finish.code', 'Référence de couleur à préciser.'));
    if (finish.special) pending.push(issue(pricing.customColor ? 'SPECIAL_COLOR_CONFIRMATION' : 'MANUFACTURER_COLOR_CONFIRMATION', 'finish', pricing.customColor ? 'La référence spéciale doit être confirmée par l’atelier et le fournisseur.' : 'La disponibilité de cette couleur fabricant sur la pièce doit être confirmée.'));
    let lengthMM = null;
    if (kind === 'profile') {
      const p = parseMeasurement(spec.length, spec.lengthUnit || unit);
      if (p.ok && p.mm > 0) lengthMM = p.mm;
      else pending.push(issue('LENGTH_REQUIRED', 'length', 'Longueur de la pièce à préciser.'));
    }
    return { quantity, material, finish, quotePolicy: pricing, lengthMM, pending, warnings, location: text(spec.location, 120), note: text(spec.note, 500) };
  }
  function validation(errors, pending, warnings) {
    return { valid: errors.length === 0, geometryComplete: errors.length === 0, specificationComplete: errors.length === 0 && pending.length === 0, productionReady: errors.length === 0 && pending.length === 0, errors, pending, warnings, workshopValidationRequired: true };
  }

  function buildProfile(input = {}) {
    const spec = copy(input) || {}, errors = [], warnings = [], unit = units(spec.unit || 'in'), rawId = String(spec.template || 'custom').toLowerCase(), templateId = rawId === 'beam' ? 'beam5' : rawId;
    if (!unit) errors.push(issue('INVALID_UNIT', 'unit', 'Choisissez po ou mm.'));
    const template = TEMPLATES[templateId], dimensions = spec.dimensions || {}, custom = templateId === 'custom';
    if (!custom && !template) errors.push(issue('UNKNOWN_TEMPLATE', 'template', 'Profil non reconnu.'));
    let rawSegments = custom ? spec.segments : template?.labels.map((label, i) => ({ label, name: template.fieldLabels[i], length: dimensions[label] }));
    if (!Array.isArray(rawSegments) || rawSegments.length < 2 || rawSegments.length > MAX_SEGMENTS) { errors.push(issue('SEGMENTS_REQUIRED', 'segments', 'Entrez de 2 à 26 segments droits.')); rawSegments = []; }
    const used = new Set(), segments = rawSegments.map((s, i) => {
      const label = text(s?.label || String.fromCharCode(65 + i), 5);
      if (!/^[A-Z][A-Z0-9]{0,4}$/.test(label) || used.has(label)) errors.push(issue('INVALID_SEGMENT_LABEL', 'segments.' + i, 'Chaque segment doit avoir un repère distinct, par exemple A, B ou C.'));
      used.add(label);
      return { id: label, label, name: text(s?.name, 100), lengthMM: measure(s?.length, unit, 'segments.' + i + '.length', errors) };
    });
    const rawBends = custom ? spec.bends : template?.turns.map(turn => ({ mode: 'interior', angle: 90, direction: turn > 0 ? 'left' : 'right' }));
    if (!Array.isArray(rawBends) || rawBends.length !== Math.max(0, segments.length - 1)) errors.push(issue('BEND_COUNT', 'bends', 'Il faut un pli défini entre chaque paire de segments.'));
    const bends = Array.from({ length: Math.max(0, segments.length - 1) }, (_, i) => normalizeBend(rawBends?.[i], i, errors));
    let heading = template ? template.startAngle : own(spec, 'startAngle') ? angleValue(spec.startAngle) : 0;
    if (heading === null || Math.abs(heading) > 360) { errors.push(issue('INVALID_START_ANGLE', 'startAngle', 'Orientation initiale invalide.')); heading = 0; }
    const pointsMM = [];
    if (!errors.length) {
      pointsMM.push([0, 0]);
      for (let i = 0; i < segments.length; i++) {
        const a = pointsMM[i], rad = heading * Math.PI / 180, p = cleanPoint([a[0] + Math.cos(rad) * segments[i].lengthMM, a[1] + Math.sin(rad) * segments[i].lengthMM]);
        segments[i].start = a.slice(); segments[i].end = p.slice(); segments[i].headingDeg = heading; pointsMM.push(p);
        if (bends[i]) { bends[i].at = p.slice(); bends[i].from = segments[i].id; bends[i].to = segments[i + 1].id; heading += bends[i].turnDeg; }
      }
      for (let i = 0; i < segments.length; i++) for (let j = i + 2; j < segments.length; j++) {
        const a = segments[i], b = segments[j];
        const crosses = cross(a.start, a.end, b.start) * cross(a.start, a.end, b.end) < -EPS && cross(b.start, b.end, a.start) * cross(b.start, b.end, a.end) < -EPS;
        if (crosses) warnings.push(issue('PROFILE_CROSSING', 'segments', 'Les segments ' + a.id + ' et ' + b.id + ' se croisent dans le croquis; détail à revoir.'));
      }
    }
    const meta = metadata(spec, unit, 'profile'), coloredFace = { side: ['left', 'right'].includes(spec.coloredFace?.side) ? spec.coloredFace.side : null, segmentId: text(spec.coloredFace?.segmentId || segments[0]?.id, 5) };
    if (!coloredFace.side) meta.pending.push(issue('COLORED_FACE_REQUIRED', 'coloredFace.side', 'Indiquez le côté coloré, gauche ou droit en suivant A vers les segments suivants.'));
    if (!used.has(coloredFace.segmentId)) meta.pending.push(issue('COLORED_FACE_SEGMENT', 'coloredFace.segmentId', 'Choisissez un segment existant pour le repère de face colorée.'));
    if (warnings.some(w => w.code === 'PROFILE_CROSSING')) meta.pending.push(issue('CROSSING_REVIEW', 'segments', 'Le croisement doit être résolu avant validation atelier.'));
    const check = validation(errors, meta.pending, [...warnings, ...meta.warnings]);
    return withPricing({ version: VERSION, kind: 'profile', id: text(spec.id, 80), name: text(spec.name || spec.label || template?.label || 'Profil libre', 140), template: templateId, unit, spec, segments, bends, pointsMM, bbox: pointsMM.length ? bounds(pointsMM) : null, coloredFace, quantity: meta.quantity, material: meta.material, finish: meta.finish, quotePolicy: meta.quotePolicy, lengthMM: meta.lengthMM, location: meta.location, note: meta.note, finishedSegmentSumMM: errors.length ? null : segments.reduce((sum, s) => sum + s.lengthMM, 0), developedWidthMM: null, developedWidth: null, developmentStatus: 'requires_workshop_bend_parameters', validation: check, valid: check.valid, complete: check.specificationComplete, productionReady: check.productionReady });
  }

  function insertDoubleFold(input, options = {}) {
    const source = buildProfile(input), index = options.segmentIndex;
    if (!source.valid || !Number.isInteger(index) || index < 0 || index >= source.segments.length) return { ok: false, spec: null, model: null, errors: [issue('DOUBLE_FOLD_SOURCE', 'segmentIndex', 'Choisissez un segment valide du profil.')] };
    const errors = [], unit = source.unit;
    for (const [key, value] of [['beforeLength', options.beforeLength], ['betweenLength', options.betweenLength], ['afterLength', options.afterLength]]) measure(value, unit, key, errors);
    normalizeBend(options.firstBend, 0, errors); normalizeBend(options.secondBend, 1, errors);
    if (options.firstBend?.mode === 'hem' || options.secondBend?.mode === 'hem') errors.push(issue('DOUBLE_FOLD_IS_NOT_HEM', 'bends', 'Deux plis successifs ont une distance intermédiaire; le retour écrasé reste une option distincte.'));
    if (source.segments.length + 2 > MAX_SEGMENTS) errors.push(issue('TOO_MANY_SEGMENTS', 'segments', 'Le profil dépasserait 26 segments.'));
    if (errors.length) return { ok: false, spec: null, model: null, errors };
    const value = mm => unit === 'in' ? mm / 25.4 : mm;
    const segments = source.segments.map(s => ({ length: value(s.lengthMM), name: s.name }));
    segments.splice(index, 1, { length: options.beforeLength }, { length: options.betweenLength, name: 'Entre les deux plis' }, { length: options.afterLength });
    segments.forEach((s, i) => { s.label = String.fromCharCode(65 + i); });
    const bends = source.bends.map(b => ({ mode: b.mode, angle: b.angle, direction: b.direction }));
    bends.splice(index, 0, copy(options.firstBend), copy(options.secondBend));
    const spec = { ...copy(input), template: 'custom', startAngle: source.segments[0].headingDeg, segments, bends, doubleFoldNote: 'Deux plis consécutifs; cotes avant, entre et après saisies indépendamment.' };
    if (spec.coloredFace?.segmentId) {
      const oldIndex = source.segments.findIndex(s => s.id === spec.coloredFace.segmentId), newIndex = oldIndex > index ? oldIndex + 2 : oldIndex;
      spec.coloredFace.segmentId = segments[Math.max(0, newIndex)].label;
    }
    delete spec.dimensions;
    const model = buildProfile(spec);
    return { ok: model.valid, spec, model, errors: model.validation.errors };
  }

  function panelEdges(points, ids, names) {
    const signed = points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - p[1] * q[0]; }, 0), winding = Math.sign(signed) || 1;
    return points.map((a, i) => {
      const b = points[(i + 1) % points.length], previous = points[(i + points.length - 1) % points.length];
      const incoming = [a[0] - previous[0], a[1] - previous[1]], outgoing = [b[0] - a[0], b[1] - a[1]];
      const turn = Math.atan2(incoming[0] * outgoing[1] - incoming[1] * outgoing[0], incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) * 180 / Math.PI;
      return { id: ids[i], name: names[i], start: a.slice(), end: b.slice(), lengthMM: dist(a, b), headingDeg: Math.atan2(outgoing[1], outgoing[0]) * 180 / Math.PI, interiorAngleDeg: 180 - winding * turn };
    });
  }
  function mirrorPanelSpec(input = {}) {
    const source = copy(input?.snapshot?.spec || (input?.version === VERSION && input.spec ? input.spec : input)) || {};
    if (source.shape !== 'right-triangle') throw new TypeError('Le miroir horizontal s’applique au triangle rectangle.');
    if (own(source, 'mirrorX') && typeof source.mirrorX !== 'boolean') throw new TypeError('Le choix miroir doit être un booléen.');
    const remapEdge = id => id === 'left' ? 'right' : id === 'right' ? 'left' : id;
    const remapLips = value => Object.fromEntries(Object.entries(value).map(([id, amount]) => [remapEdge(id), copy(amount)]));
    source.mirrorX = source.mirrorX !== true;
    source.dimensionBasis = source.dimensionBasis || PANEL_OUTER_DIMENSIONS;
    // These maps follow the physical edge, including asymmetric lips and a
    // perforated edge. The topology's original rightAngle is never rewritten.
    for (const key of ['lips', 'borders']) if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) source[key] = remapLips(source[key]);
    if (own(source, 'bottomEdgeId')) source.bottomEdgeId = remapEdge(source.bottomEdgeId);
    if (source.perforation && typeof source.perforation === 'object' && own(source.perforation, 'edgeId')) source.perforation.edgeId = remapEdge(source.perforation.edgeId);
    return source;
  }
  function buildPanel(input = {}) {
    const spec = copy(input) || {}, errors = [], warnings = [], unit = units(spec.unit || 'in'), shape = String(spec.shape || 'rectangle').toLowerCase(), dimensions = spec.dimensions || {};
    if (!unit) errors.push(issue('INVALID_UNIT', 'unit', 'Choisissez po ou mm.'));
    if (own(spec, 'mirrorX') && typeof spec.mirrorX !== 'boolean') errors.push(issue('INVALID_PANEL_MIRROR', 'mirrorX', 'Le choix miroir doit être activé ou désactivé.'));
    const mirrorX = spec.mirrorX === true;
    if (mirrorX && shape !== 'right-triangle') errors.push(issue('MIRROR_SHAPE_UNSUPPORTED', 'mirrorX', 'Le miroir horizontal s’applique au triangle rectangle.'));
    const dimensionBasis = spec.dimensionBasis || (own(spec, 'mirrorX') || spec.material?.type === 'aluminium-extrude' ? PANEL_OUTER_DIMENSIONS : null);
    const widthMM = measure(spec.width ?? dimensions.A, unit, 'width', errors), rawHeight = spec.height ?? dimensions.B;
    const heightMM = shape === 'square' && (rawHeight === null || rawHeight === undefined || rawHeight === '') ? widthMM : measure(rawHeight, unit, 'height', errors);
    if (shape === 'square' && finite(widthMM) && finite(heightMM) && Math.abs(widthMM - heightMM) > EPS) errors.push(issue('SQUARE_DIMENSIONS', 'height', 'Le carré doit avoir la même largeur et la même hauteur.'));
    const reliefMM = measure(spec.relief ?? spec.projection ?? dimensions.C, unit, 'relief', [], { zero: true, required: false });
    const meta = metadata(spec, unit, 'panel');
    if (reliefMM === null) meta.pending.push(issue('RELIEF_REQUIRED', 'relief', 'Projection C de la pièce finie à préciser; entrez 0 pour un panneau plat.'));
    const w = widthMM, h = heightMM;
    let pointsMM = [], ids = [], names = [], parameters = {}, interpretation = '';
    if (w !== null && h !== null && unit) {
      if (shape === 'rectangle' || shape === 'square') {
        pointsMM = [[0, 0], [w, 0], [w, h], [0, h]]; ids = ['bottom', 'right', 'top', 'left']; names = ['Bas', 'Droite', 'Haut', 'Gauche'];
      } else if (shape === 'roof-slope') {
        const pitch=roof?.pitchFactor(spec.roofPitch),direction=spec.roofDirection||'right';
        parameters.roofPitch=spec.roofPitch;parameters.roofDirection=direction;
        if(!finite(pitch)||pitch<=0)errors.push(issue('ROOF_PITCH_REQUIRED','roofPitch','Entrez une pente positive X/12, par exemple 6/12.'));
        else {
          const shapePoints=roof.slopePanel(w,h,spec.roofPitch,direction);
          if(!shapePoints)errors.push(issue('ROOF_PANEL_IMPOSSIBLE','height','La hauteur maximale doit dépasser la montée de la pente : largeur × pente/12. Vérifiez le sens gauche/droite.'));
          else {pointsMM=shapePoints;ids=['bottom','right','slope','left'];names=['Bas','Droite','Pente du toit','Gauche'];parameters.riseMM=w*pitch;interpretation='Hauteur B mesurée au côté haut. Montée='+decimal(w*pitch)+' mm. Pente du haut '+spec.roofPitch+' · '+direction+'.';}
        }
      } else if (shape === 'triangle') {
        const x = measure(spec.apexX, unit, 'apexX', errors, { zero: true }); parameters.apexXMM = x;
        if(spec.roofPitch!==undefined&&String(spec.roofPitch).trim()){
          const factor=roof?.pitchFactor(spec.roofPitch);
          if(!finite(factor)||factor<=0)errors.push(issue('ROOF_PITCH_INVALID','roofPitch','La pente du triangle doit être X/12, par exemple 6/12.'));
          else if(x!==null&&Math.abs(h-x*factor)>Math.max(.01,h*.000001))errors.push(issue('ROOF_PITCH_DIMENSION','height','La hauteur B ne correspond pas à la montée calculée depuis la gauche (pente X/12 × distance S). Corrigez le champ pente ou la hauteur.'));
          else parameters.roofPitch=spec.roofPitch;
        }
        if (x !== null && x <= w) { pointsMM = [[0, 0], [w, 0], [x, h]]; ids = ['bottom', 'right-slope', 'left-slope']; names = ['Base', 'Pente droite', 'Pente gauche']; }
        else if (x !== null) errors.push(issue('APEX_OUTSIDE', 'apexX', 'Le sommet doit rester entre 0 et la largeur hors tout.'));
      } else if (shape === 'right-triangle') {
        const baseRightAngle = spec.rightAngle || 'bottom-left', rightAngle = mirrorX ? MIRRORED_RIGHT_ANGLES[baseRightAngle] || baseRightAngle : baseRightAngle; parameters.rightAngle = rightAngle;
        const variants = {
          'bottom-left': { p: [[0, 0], [w, 0], [0, h]], ids: ['bottom', 'slope', 'left'], names: ['Base', 'Pente', 'Gauche'] },
          'bottom-right': { p: [[0, 0], [w, 0], [w, h]], ids: ['bottom', 'right', 'slope'], names: ['Base', 'Droite', 'Pente'] },
          'top-left': { p: [[0, 0], [w, h], [0, h]], ids: ['slope', 'top', 'left'], names: ['Pente', 'Haut', 'Gauche'] },
          'top-right': { p: [[w, 0], [w, h], [0, h]], ids: ['right', 'top', 'slope'], names: ['Droite', 'Haut', 'Pente'] }
        };
        const variant = variants[rightAngle];
        if (!variant) errors.push(issue('RIGHT_ANGLE_POSITION', 'rightAngle', 'Choisissez la position de l’angle droit.'));
        else { pointsMM = variant.p; ids = variant.ids; names = variant.names; interpretation = 'Triangle rectangle : angle droit ' + ({ 'bottom-left': 'en bas à gauche', 'bottom-right': 'en bas à droite', 'top-left': 'en haut à gauche', 'top-right': 'en haut à droite' }[rightAngle]) + '.'; }
      } else if (shape === 'trapezoid') {
        const topWidth = measure(spec.topWidth, unit, 'topWidth', errors), offset = measure(spec.topOffset, unit, 'topOffset', errors, { zero: true });
        parameters = { topWidthMM: topWidth, topOffsetMM: offset };
        if (topWidth !== null && offset !== null && topWidth + offset <= w + EPS) { pointsMM = [[0, 0], [w, 0], [offset + topWidth, h], [offset, h]]; ids = ['bottom', 'right-slope', 'top', 'left-slope']; names = ['Base', 'Côté droit', 'Haut', 'Côté gauche']; }
        else if (topWidth !== null && offset !== null) errors.push(issue('TOP_OUTSIDE', 'topWidth', 'Le haut et son décalage doivent rester dans la largeur hors tout.'));
      } else if (shape === 'parallelogram') {
        const offset = measure(spec.offset, unit, 'offset', errors, { zero: true, signed: true }); parameters.offsetMM = offset;
        if (offset !== null && Math.abs(offset) < w - EPS) {
          const base = w - Math.abs(offset), bottomX = offset < 0 ? -offset : 0, topX = offset > 0 ? offset : 0;
          pointsMM = [[bottomX, 0], [bottomX + base, 0], [topX + base, h], [topX, h]]; ids = ['bottom', 'right-slope', 'top', 'left-slope']; names = ['Bas', 'Côté droit', 'Haut', 'Côté gauche']; parameters.baseWidthMM = base;
        } else if (offset !== null) errors.push(issue('PARALLELOGRAM_OFFSET', 'offset', 'La valeur absolue du décalage doit être inférieure à la largeur hors tout.'));
      } else if (shape === 'pointed') {
        const side = spec.pointSide || 'top', depth = measure(spec.tipDepth, unit, 'tipDepth', errors), apex = measure(spec.apexOffset, unit, 'apexOffset', errors, { zero: true }); parameters = { pointSide: side, tipDepthMM: depth, apexOffsetMM: apex };
        if (!['top', 'right', 'bottom', 'left'].includes(side)) errors.push(issue('POINT_SIDE', 'pointSide', 'Choisissez le côté terminé en pointe.'));
        const along = ['top', 'bottom'].includes(side) ? w : h, across = ['top', 'bottom'].includes(side) ? h : w;
        if (depth !== null && apex !== null && depth < across && apex > 0 && apex < along) {
          if (side === 'top') { pointsMM = [[0, 0], [w, 0], [w, h - depth], [apex, h], [0, h - depth]]; ids = ['bottom', 'right', 'upper-right', 'upper-left', 'left']; names = ['Bas', 'Droite', 'Pente droite', 'Pente gauche', 'Gauche']; }
          if (side === 'bottom') { pointsMM = [[0, depth], [apex, 0], [w, depth], [w, h], [0, h]]; ids = ['lower-left', 'lower-right', 'right', 'top', 'left']; names = ['Pente gauche', 'Pente droite', 'Droite', 'Haut', 'Gauche']; }
          if (side === 'right') { pointsMM = [[0, 0], [w - depth, 0], [w, apex], [w - depth, h], [0, h]]; ids = ['bottom', 'lower-right', 'upper-right', 'top', 'left']; names = ['Bas', 'Pente basse', 'Pente haute', 'Haut', 'Gauche']; }
          if (side === 'left') { pointsMM = [[depth, 0], [w, 0], [w, h], [depth, h], [0, apex]]; ids = ['bottom', 'right', 'top', 'upper-left', 'lower-left']; names = ['Bas', 'Droite', 'Haut', 'Pente haute', 'Pente basse']; }
        } else if (depth !== null && apex !== null) errors.push(issue('POINT_PARAMETERS', 'tipDepth', 'La profondeur doit être inférieure au côté traversé et le sommet strictement entre les deux coins.'));
      } else if (shape === 'polygon') {
        const vertices = panelPolygonPoints(spec, w, h), reason = simplePanelPolygon(vertices, w, h);
        if (reason) errors.push(issue('INVALID_PANEL_POLYGON', 'pointsIn', reason));
        else {
          pointsMM = vertices;
          ids = vertices.map((_, i) => 'edge-' + (i + 1)); names = vertices.map((_, i) => 'Côté ' + (i + 1));
          parameters.contourRatios = vertices.map(p => [p[0] / w, p[1] / h]);
          interpretation = 'Contour architectural exact. Les angles indiqués sont les angles intérieurs aux sommets; les retours et les raccords restent à valider en atelier.';
          warnings.push(issue('POLYGON_WORKSHOP_VALIDATION', 'shape', 'Le contour de coupe et sa surface sont conservés. Les raccords des lips aux pointes et aux angles rentrants nécessitent une validation d’atelier.'));
        }
      } else if (shape === 'pld' || shape === 'plg') errors.push(issue('UNDEFINED_SHAPE', 'shape', 'PLD / PLG : définition géométrique à préciser; aucune forme n’est supposée.'));
      else errors.push(issue('UNKNOWN_SHAPE', 'shape', 'Forme de panneau non reconnue.'));
    }
    if (pointsMM.length && (area(pointsMM) <= EPS || pointsMM.some((p, i) => dist(p, pointsMM[(i + 1) % pointsMM.length]) <= EPS))) errors.push(issue('DEGENERATE_PANEL', 'shape', 'Le panneau doit avoir une surface positive et des côtés de longueur non nulle.'));
    if (errors.length) pointsMM = [];
    const edgeList = panelEdges(pointsMM, ids, names), lips = spec.lips || spec.borders || {};
    for (const e of edgeList) {
      const raw = own(lips, e.id) ? lips[e.id] : spec.lip;
      e.lipMM = measure(raw?.value ?? raw, unit, 'lips.' + e.id, [], { zero: true, required: false });
      if (e.lipMM === null) meta.pending.push(issue('LIP_REQUIRED', 'lips.' + e.id, 'Largeur du lip « ' + e.name + ' » à préciser; 0 signifie sans lip.'));
    }
    const bottomEdgeId = text(spec.bottomEdgeId, 40), bottom = edgeList.find(e => e.id === bottomEdgeId);
    if (!bottom) meta.pending.push(issue('BOTTOM_EDGE_REQUIRED', 'bottomEdgeId', 'Sélectionnez le côté du bas après pose.'));
    const requested = typeof spec.perforation === 'boolean' ? { enabled: spec.perforation } : spec.perforation || {};
    const perforation = { enabled: typeof requested.enabled === 'boolean' ? requested.enabled : null, edgeId: text(requested.edgeId || bottomEdgeId, 40), details: text(requested.details, 300) };
    if (perforation.enabled === null) meta.pending.push(issue('PERFORATION_CHOICE_REQUIRED', 'perforation.enabled', 'Choisissez avec ou sans perforation.'));
    if (perforation.enabled) {
      if (!bottom || perforation.edgeId !== bottomEdgeId) meta.pending.push(issue('PERFORATION_BOTTOM_MISMATCH', 'perforation.edgeId', 'La perforation demandée doit correspondre au côté du bas sélectionné.'));
      if (!perforation.details) meta.pending.push(issue('PERFORATION_DETAIL_REQUIRED', 'perforation.details', 'Diamètre, pas ou référence de perforation à définir par l’atelier. Aucun motif n’est inventé.'));
    }
    if (spec.thickness !== undefined && !spec.material?.thickness) warnings.push(issue('AMBIGUOUS_THICKNESS', 'thickness', 'Distinguez la projection C de la pièce finie et l’épaisseur de tôle dans Matière.'));
    const check = validation(errors, meta.pending, [...warnings, ...meta.warnings]);
    return withPricing({ version: VERSION, kind: 'panel', id: text(spec.id, 80), name: text(spec.name || spec.label || SHAPES.find(s => s.id === shape)?.label || 'Panneau', 140), spec, shape, unit, mirrorX, dimensionBasis, widthMM, heightMM, reliefMM, parameters, interpretation, pointsMM: pointsMM.map(cleanPoint), edges: edgeList, bbox: pointsMM.length ? bounds(pointsMM) : null, areaMM2: pointsMM.length ? area(pointsMM) : null, bottomEdgeId: bottom?.id || null, perforation, quantity: meta.quantity, material: meta.material, finish: meta.finish, quotePolicy: meta.quotePolicy, lengthMM: null, location: meta.location, note: meta.note, developedWidthMM: null, developedWidth: null, developmentStatus: 'requires_workshop_bend_parameters', validation: check, valid: check.valid, complete: check.specificationComplete, productionReady: check.productionReady });
  }

  // Views below use Y-up model coordinates. They never alter the finished geometry.
  function modelOf(value) {
    const stored = value?.snapshot?.spec || value?.spec;
    const spec = stored || value || {};
    return value?.kind === 'panel' || spec.kind === 'panel' || spec.shape ? buildPanel(spec) : buildProfile(spec);
  }

  function wrapLines(value, width = 44) {
    const lines = []; let line = '';
    for (let word of text(value, 2000).split(/\s+/).filter(Boolean)) {
      if (word.length > width) {
        if (line) { lines.push(line); line = ''; }
        while (word.length > width) { lines.push(word.slice(0, width)); word = word.slice(width); }
      }
      if (!word) continue;
      if (line.length + word.length + 1 > width && line) { lines.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
  function svgText(x, y, value, attrs = '') { return '<text x="' + decimal(x) + '" y="' + decimal(y) + '" ' + attrs + '>' + esc(value) + '</text>'; }
  function multiline(x, y, values, { width = 42, lineHeight = 21, attrs = '' } = {}) {
    let out = '', pos = y;
    for (const value of values) for (const line of wrapLines(value, width)) { out += svgText(x, pos, line, attrs); pos += lineHeight; }
    return { svg: out, bottom: pos };
  }
  function svgOpen(width, height, label) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + esc(label) + '"><title>' + esc(label) + '</title><rect width="' + width + '" height="' + height + '" fill="#fff"/><g font-family="Arial,sans-serif" fill="#26332b">';
  }
  const svgClose = '</g></svg>';
  function projection(points, box) {
    const b = bounds(points), w = Math.max(b.maxX - b.minX, EPS), h = Math.max(b.maxY - b.minY, EPS), scale = Math.min(box.w / w, box.h / h);
    const ox = box.x + (box.w - w * scale) / 2, oy = box.y + (box.h - h * scale) / 2;
    return p => [ox + (p[0] - b.minX) * scale, oy + (b.maxY - p[1]) * scale];
  }
  const pointsAttr = points => points.map(p => p.map(decimal).join(',')).join(' ');
  function safeSize(value, fallback) { return finite(value) && value >= 200 && value <= 4000 ? value : fallback; }
  function unfinishedSVG(model, width, height) {
    let out = svgOpen(width, height, model.name + ' · cotes à préciser');
    out += svgText(28, 44, model.name, 'font-size="24" font-weight="700"');
    out += svgText(28, 80, 'Croquis en attente de cotes valides', 'font-size="18" fill="#8b5526"');
    out += multiline(28, 116, model.validation.errors.map(e => e.message), { width: Math.max(25, Math.floor(width / 10)), lineHeight: 24, attrs: 'font-size="16"' }).svg;
    return out + svgClose;
  }
  function segmentLabelMap(points, labels, width, height) {
    const used = [], result = [];
    for (let i = 0; i < labels.length; i++) {
      const a = points[i], b = points[i + 1], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], length = Math.max(dist(a, b), EPS), normal = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
      let p;
      for (const radius of [22, -22, 42, -42, 62, -62, 84]) {
        const candidate = [Math.max(18, Math.min(width - 18, mid[0] + normal[0] * radius)), Math.max(48, Math.min(height - 44, mid[1] + normal[1] * radius))];
        p = candidate;
        if (!used.some(q => dist(q, candidate) < 30)) break;
      }
      used.push(p); result.push({ label: labels[i], mid, point: p });
    }
    return result;
  }
  function profileDetailLines(model) {
    const lines = model.segments.map(s => s.label + ' = ' + formatMeasurement(s.lengthMM, model.unit) + (s.name ? ' · ' + s.name : ''));
    for (const b of model.bends) if (b) lines.push('Pli ' + b.from + '–' + b.to + ' : ' + b.label);
    lines.push('* Face colorée : ' + (model.coloredFace.side ? (model.coloredFace.side === 'left' ? 'gauche' : 'droite') + ' en suivant A → dernier segment' : 'à préciser'));
    lines.push('Développé de tôle : à valider par l’atelier.');
    return lines;
  }
  function profileSVG(value, options = {}) {
    const model = modelOf(value), width = safeSize(options.width, 900), legend = options.legend !== false, details = profileDetailLines(model), height = safeSize(options.height, Math.max(480, legend ? 96 + details.length * 24 : 480));
    if (model.kind !== 'profile') throw new TypeError('profileSVG attend un profil.');
    if (!model.valid || !model.pointsMM.length) return unfinishedSVG(model, width, height);
    const diagramWidth = legend ? width * .62 : width, topSpace = options.header === false ? 35 : 83, bottomSpace = options.notes === false ? 36 : 92, box = { x: 50, y: topSpace, w: Math.max(80, diagramWidth - 100), h: height - topSpace - bottomSpace }, project = projection(model.pointsMM, box), points = model.pointsMM.map(project);
    let out = svgOpen(width, height, model.name + ' · coupe et cotes finies');
    if (options.header !== false) out += svgText(24, 34, (model.id ? model.id + ' · ' : '') + model.name, 'font-size="23" font-weight="700"');
    out += '<polyline points="' + pointsAttr(points) + '" fill="none" stroke="#25352d" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter"/>';
    for (const item of segmentLabelMap(points, model.segments.map(s => s.label), diagramWidth, height)) {
      out += '<line x1="' + decimal(item.mid[0]) + '" y1="' + decimal(item.mid[1]) + '" x2="' + decimal(item.point[0]) + '" y2="' + decimal(item.point[1]) + '" stroke="#94a08f" stroke-width="1"/>';
      out += '<circle cx="' + decimal(item.point[0]) + '" cy="' + decimal(item.point[1]) + '" r="14" fill="#f4f7f0" stroke="#dce4d4"/>';
      out += svgText(item.point[0], item.point[1] + 5, item.label, 'font-size="17" font-weight="700" text-anchor="middle" fill="#527539"');
    }
    const coloredIndex = model.segments.findIndex(s => s.id === model.coloredFace.segmentId);
    if (model.coloredFace.side && coloredIndex >= 0) {
      const a = points[coloredIndex], b = points[coloredIndex + 1], len = Math.max(dist(a, b), EPS), sign = model.coloredFace.side === 'left' ? -1 : 1, normal = [-(b[1] - a[1]) / len * sign, (b[0] - a[0]) / len * sign], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const tangent = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], half = Math.min(24, len * .3), center = [mid[0] + normal[0] * 8, mid[1] + normal[1] * 8];
      out += '<line x1="' + decimal(center[0] - tangent[0] * half) + '" y1="' + decimal(center[1] - tangent[1] * half) + '" x2="' + decimal(center[0] + tangent[0] * half) + '" y2="' + decimal(center[1] + tangent[1] * half) + '" stroke="#568443" stroke-width="3"/>';
      out += svgText(mid[0] + normal[0] * 26, mid[1] + normal[1] * 26 + 6, '*', 'font-size="28" font-weight="700" fill="#568443" text-anchor="middle"');
    }
    for (const b of model.bends.filter(b => b?.mode === 'hem')) {
      const p = project(b.at);
      out += '<circle cx="' + decimal(p[0]) + '" cy="' + decimal(p[1]) + '" r="7" fill="#fff" stroke="#a56624" stroke-width="2"/>';
      out += svgText(p[0] + 12, p[1] - 12, '180°', 'font-size="14" fill="#a56624"');
    }
    if (legend) {
      out += '<line x1="' + decimal(diagramWidth) + '" y1="62" x2="' + decimal(diagramWidth) + '" y2="' + decimal(height - 56) + '" stroke="#dde4d7"/>';
      out += multiline(diagramWidth + 20, 86, details, { width: Math.max(24, Math.floor((width - diagramWidth - 35) / 8)), lineHeight: 21, attrs: 'font-size="15"' }).svg;
    }
    if (options.notes !== false) {
      out += svgText(24, height - 39, 'L = ' + formatMeasurement(model.lengthMM, model.unit) + ' · coupe à rayon nul pour la cotation', 'font-size="14" fill="#5c685e"');
      out += svgText(24, height - 17, 'Pièce finie. Rayons, épaisseur réelle et compensation de pliage : atelier.', 'font-size="13" fill="#5c685e"');
    }
    return out + svgClose;
  }

  function panelDetailLines(model) {
    const lines = ['A · largeur hors tout, lips compris = ' + formatMeasurement(model.widthMM, model.unit), 'B · hauteur hors tout, lips compris = ' + formatMeasurement(model.heightMM, model.unit), 'C · projection finie = ' + formatMeasurement(model.reliefMM, model.unit)];
    for (const [key, value] of Object.entries(model.parameters)) {
      if (key === 'contourRatios') continue;
      const labels = { apexXMM: 'Position horizontale du sommet', topWidthMM: 'Largeur du haut', topOffsetMM: 'Décalage du haut', offsetMM: 'Décalage signé du haut', baseWidthMM: 'Largeur de la base', tipDepthMM: 'Profondeur de la pointe', apexOffsetMM: 'Position du sommet sur son côté', rightAngle: 'Angle droit', pointSide: 'Côté de la pointe' };
      lines.push((labels[key] || key) + ' = ' + (key.endsWith('MM') ? formatMeasurement(value, model.unit) : ({ top: 'haut', bottom: 'bas', left: 'gauche', right: 'droite', 'bottom-left': 'bas gauche', 'bottom-right': 'bas droite', 'top-left': 'haut gauche', 'top-right': 'haut droite' }[value] || value)));
    }
    if (model.shape === 'polygon') lines.push('Surface réelle hors tout = ' + decimal(model.areaMM2 / 25.4 ** 2) + ' po²');
    for (const e of model.edges) {
      lines.push(e.name + ' : côté ' + formatMeasurement(e.lengthMM, model.unit) + ' · lip ' + formatMeasurement(e.lipMM, model.unit));
      if (model.shape === 'polygon') lines.push('Sommet de départ : angle intérieur ' + decimal(e.interiorAngleDeg) + '° · direction ' + decimal((e.headingDeg + 360) % 360) + '°');
    }
    if (model.shape === 'polygon') lines.push('Direction depuis +X, sens antihoraire en coordonnées Y vers le haut. Les angles sont ceux du contour de coupe.');
    lines.push('Bas après pose : ' + (model.edges.find(e => e.id === model.bottomEdgeId)?.name || 'à sélectionner'));
    lines.push('Perforation : ' + (model.perforation.enabled === null ? 'à choisir' : model.perforation.enabled ? 'oui · ' + (model.perforation.details || 'détail à préciser') : 'non'));
    return lines;
  }
  function dimensionLine(a, b, label, color = '#6d7e68') {
    const len = Math.max(dist(a, b), EPS), n = [-(b[1] - a[1]) / len * 5, (b[0] - a[0]) / len * 5];
    return '<path d="M ' + pointsAttr([a, b]).replace(' ', ' L ') + ' M ' + decimal(a[0] - n[0]) + ',' + decimal(a[1] - n[1]) + ' L ' + decimal(a[0] + n[0]) + ',' + decimal(a[1] + n[1]) + ' M ' + decimal(b[0] - n[0]) + ',' + decimal(b[1] - n[1]) + ' L ' + decimal(b[0] + n[0]) + ',' + decimal(b[1] + n[1]) + '" fill="none" stroke="' + color + '" stroke-width="1.2"/>' + svgText((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 8, label, 'font-size="14" text-anchor="middle" fill="' + color + '"');
  }
  function panelSVG(value, options = {}) {
    const model = modelOf(value), width = safeSize(options.width, 900), legend = options.legend !== false, details = panelDetailLines(model);
    const legendCharacters = Math.max(24, Math.floor((width * .38 - 35) / 8));
    const legendLineCount = details.reduce((count, line) => count + wrapLines(line, legendCharacters).length, 0);
    const height = safeSize(options.height, Math.max(500, legend ? legendLineCount * 21 + 145 : 500));
    if (model.kind !== 'panel') throw new TypeError('panelSVG attend un panneau.');
    if (!model.valid || !model.pointsMM.length) return unfinishedSVG(model, width, height);
    const diagramWidth = legend ? width * .62 : width, topSpace = options.header === false ? 26 : 87, bottomSpace = options.notes === false ? 62 : 117, box = { x: 60, y: topSpace, w: Math.max(80, diagramWidth - 143), h: height - topSpace - bottomSpace }, project = projection(model.pointsMM, box), points = model.pointsMM.map(project), projectedBounds = bounds(points);
    let out = svgOpen(width, height, model.name + ' · face et cotes finies');
    if (options.header !== false) out += svgText(24, 34, (model.id ? model.id + ' · ' : '') + model.name, 'font-size="23" font-weight="700"');
    out += '<path d="M ' + points.map(p => p.map(decimal).join(',')).join(' L ') + ' Z" fill="' + (model.finish.hex || '#e7eddf') + '" fill-opacity="0.5" stroke="#2a3a30" stroke-width="2.5"/>';
    for (let i = 0; i < model.edges.length; i++) {
      const e = model.edges[i], a = points[i], b = points[(i + 1) % points.length], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bottom = e.id === model.bottomEdgeId;
      if (bottom) out += '<line x1="' + decimal(a[0]) + '" y1="' + decimal(a[1]) + '" x2="' + decimal(b[0]) + '" y2="' + decimal(b[1]) + '" stroke="' + (model.perforation.enabled ? '#1d7796' : '#568443') + '" stroke-width="6"' + (model.perforation.enabled ? ' stroke-dasharray="10 5"' : '') + '/>';
      out += '<circle cx="' + decimal(mid[0]) + '" cy="' + decimal(mid[1]) + '" r="11" fill="#fff" stroke="#52664d"/>' + svgText(mid[0], mid[1] + 4, i + 1, 'font-size="13" text-anchor="middle"');
    }
    const left = projectedBounds.minX, right = projectedBounds.maxX, top = projectedBounds.minY, bottom = projectedBounds.maxY;
    out += dimensionLine([left, bottom + 34], [right, bottom + 34], 'A · ' + formatMeasurement(model.widthMM, model.unit));
    out += '<path d="M ' + decimal(right + 30) + ',' + decimal(top) + ' L ' + decimal(right + 30) + ',' + decimal(bottom) + '" stroke="#6d7e68" stroke-width="1.2"/>';
    out += svgText(right + 38, (top + bottom) / 2, 'B', 'font-size="17" fill="#527539"');
    if (legend) {
      out += '<line x1="' + decimal(diagramWidth) + '" y1="62" x2="' + decimal(diagramWidth) + '" y2="' + decimal(height - 58) + '" stroke="#dde4d7"/>';
      const sideLines = details.map(line => { const edgeIndex = model.edges.findIndex(e => line.startsWith(e.name + ' :')); return edgeIndex >= 0 ? (edgeIndex + 1) + ' · ' + line : line; });
      out += multiline(diagramWidth + 20, 86, sideLines, { width: Math.max(24, Math.floor((width - diagramWidth - 35) / 8)), lineHeight: 21, attrs: 'font-size="15"' }).svg;
    }
    if (options.notes !== false) {
      out += svgText(24, height - 39, 'C = ' + formatMeasurement(model.reliefMM, model.unit) + ' · projection distincte de l’épaisseur de tôle', 'font-size="13" fill="#5c685e"');
      out += svgText(24, height - 18, model.perforation.enabled ? 'Trait bleu = côté demandé perforé; aucun motif de perçage n’est dessiné.' : 'Les lips sont cotés séparément; aucun développé ni angle de retour n’est supposé.', 'font-size="12" fill="#5c685e"');
    }
    return out + svgClose;
  }

  function buildOrder(input = {}, { bendTariff } = {}) {
    if (!Array.isArray(input.items)) throw new TypeError('La commande doit contenir un tableau items.');
    if (input.items.length > 1000) throw new RangeError('Un dossier est limité à 1 000 lignes; créez plusieurs lots.');
    const items = input.items.map((item, i) => { const model = modelOf(item); if (!model.id) model.id = 'M' + String(i + 1).padStart(3, '0'); model.pricing = currentPricing(model, bendTariff); return model; });
    const ids = new Set(), errors = [];
    for (const item of items) { if (ids.has(item.id)) errors.push(issue('DUPLICATE_ITEM_ID', 'items', 'Identifiant de pièce répété : ' + item.id)); ids.add(item.id); }
    if (!items.length) errors.push(issue('EMPTY_ORDER', 'items', 'Ajoutez une pièce au dossier.'));
    const complete = errors.length === 0 && items.every(item => item.complete), knownQuantity = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const pricing = priceDossier(items, { bendTariff }), quoteRequiredItemIds = pricing.quoteItemIds;
    return { version: VERSION, poNumber: text(input.poNumber ?? input.po, 100), project: text(input.project, 160), foreman: text(input.foreman, 120), date: text(input.date, 40), revision: text(input.revision, 60), notes: text(input.notes, 1000), items, complete, errors, knownQuantity, quantity: complete ? knownQuantity : null, requiresQuote: quoteRequiredItemIds.length > 0, quoteRequiredItemIds, automaticPricingAllowed: pricing.automaticPricingAllowed, pricing, localReferenceOnly: true, transmitted: false, workshopValidationRequired: true };
  }
  function materialLines(item) {
    const type = { aluminum: 'Aluminium', aluminium: 'Aluminium', 'aluminium-extrude': 'Aluminium extrudé', steel: 'Acier', acier: 'Acier' }[item.material.type] || item.material.name || item.material.type || 'À préciser';
    return [type, item.material.gauge ? 'Gage ' + item.material.gauge : '', item.material.thicknessMM !== null ? formatMeasurement(item.material.thicknessMM, 'mm') : ''].filter(Boolean);
  }
  function finishLines(item) { return [item.finish.manufacturer || item.finish.system || 'À préciser', item.finish.name, item.finish.code ? 'Code ' + item.finish.code : 'Code à préciser', item.quotePolicy.required ? 'Soumission obligatoire' : item.finish.special ? 'Disponibilité à confirmer' : ''].filter(Boolean); }
  function priceText(cents) { return Number.isSafeInteger(cents) ? (cents / 100).toFixed(2).replace('.', ',') + ' CAD' : 'À préciser'; }
  function pricingDetailLines(item) {
    const price = item.pricing;
    return price?.status === 'priced' ? [
      'Surface tarifée = ' + decimal(price.areaSqIn) + ' po²',
      'Tarif MIR = ' + decimal(price.rate) + ' CAD/po²',
      ...(price.folds === undefined ? [] : [price.folds + ' pli(s) × ' + priceText(price.bendCents),
        ...(price.aluminumBasisPoints ? ['Majoration aluminium : ' + decimal(price.aluminumBasisPoints / 100) + ' %'] : [])]),
      'Prix par pièce = ' + priceText(price.unitCents),
      'Ligne × ' + price.quantity + ' = ' + priceText(price.lineCents)
    ] : [];
  }
  function productionDetailLines(item) {
    if (item.kind === 'profile') {
      const lines = item.segments.map(s => s.label + ' = ' + formatMeasurement(s.lengthMM, item.unit));
      for (const b of item.bends) if (b) lines.push('Pli ' + b.from + '–' + b.to + ' : ' + b.label);
      lines.push('Face colorée : ' + (item.coloredFace.side ? (item.coloredFace.side === 'left' ? 'gauche' : 'droite') + ' de A → ' + item.segments.at(-1).label : 'à préciser'));
      lines.push(...pricingDetailLines(item));
      return lines;
    }
    const lines = ['A hors tout, lips compris = ' + formatMeasurement(item.widthMM, item.unit), 'B hors tout, lips compris = ' + formatMeasurement(item.heightMM, item.unit), 'C projection = ' + formatMeasurement(item.reliefMM, item.unit)];
    const labels = { apexXMM: 'Sommet depuis gauche', topWidthMM: 'Largeur du haut', topOffsetMM: 'Décalage du haut', offsetMM: 'Décalage signé', baseWidthMM: 'Largeur de base', tipDepthMM: 'Profondeur pointe', apexOffsetMM: 'Position sommet', rightAngle: 'Angle droit', pointSide: 'Pointe' };
    for (const [key, value] of Object.entries(item.parameters)) if (key !== 'contourRatios') lines.push((labels[key] || key) + ' : ' + (key.endsWith('MM') ? formatMeasurement(value, item.unit) : ({ top: 'haut', bottom: 'bas', left: 'gauche', right: 'droite', 'bottom-left': 'bas gauche', 'bottom-right': 'bas droite', 'top-left': 'haut gauche', 'top-right': 'haut droite' }[value] || value)));
    if (item.shape === 'polygon') lines.push('Surface réelle hors tout = ' + decimal(item.areaMM2 / 25.4 ** 2) + ' po²');
    item.edges.forEach((e, i) => {
      lines.push((i + 1) + ' : ' + formatMeasurement(e.lengthMM, item.unit) + ' · lip ' + formatMeasurement(e.lipMM, item.unit));
      if (item.shape === 'polygon') {
        lines.push('S' + (i + 1) + ' intérieur = ' + decimal(e.interiorAngleDeg) + '°');
        lines.push('S' + (i + 1) + ' : X ' + formatMeasurement(e.start[0], item.unit) + ' · Y ' + formatMeasurement(e.start[1], item.unit));
        lines.push('Direction = ' + decimal((e.headingDeg + 360) % 360) + '°');
      }
    });
    if (item.shape === 'polygon') lines.push('Origine : bas gauche du hors tout. X vers la droite, Y vers le haut. Direction depuis +X, antihoraire. Angle intérieur au sommet de départ du côté.');
    lines.push('Bas posé : ' + (item.edges.find(e => e.id === item.bottomEdgeId)?.name || 'à sélectionner'));
    lines.push('Perforation : ' + (item.perforation.enabled === null ? 'à choisir' : item.perforation.enabled ? 'oui · ' + (item.perforation.details || 'à préciser') : 'non'));
    lines.push(...pricingDetailLines(item));
    return lines;
  }
  function placeSVG(svg, x, y) {
    // Flatten nested SVG roots: this also renders consistently in PDF rasterizers.
    return '<g transform="translate(' + x + ' ' + y + ')">' + String(svg).replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '') + '</g>';
  }
function profileSectionPath(points,bends,hemRadius=5){
 let offsetX=0,offsetY=0;
 const segments=[],folds=[];
 let start=points[0];
 let path=`M${points[0].map(decimal).join(' ')}`;
 for(let i=1;i<points.length;i++){
  const [x,y]=points[i];
  const end=[x+offsetX,y+offsetY];
  segments.push([start,end]);
  start=end;
  path+=` L${end.map(decimal).join(' ')}`;
  if(bends[i-1]?.mode!=='hem'||i===points.length-1)continue;
  const dx=points[i+1][0]-x,dy=points[i+1][1]-y,length=Math.hypot(dx,dy);
  if(!length)continue;
  const radius=5, side=bends[i-1].direction==='right'?-1:1;
  const foldRadius=hemRadius===5?radius:hemRadius;
  offsetX-=dy/length*2*foldRadius*side;
  offsetY+=dx/length*2*foldRadius*side;
  start=[x+offsetX,y+offsetY];
  folds.push([(end[0]+start[0])/2,(end[1]+start[1])/2]);
  path+=` A${foldRadius} ${foldRadius} 0 0 ${side<0?1:0} ${decimal(start[0])} ${decimal(start[1])}`;
 }
 return {path,segments,folds};
}

// Rendu 2D seulement : lorsque les extrémités A/D sont jointives, que leurs
// côtés ont la même cote et sont antiparallèles, dessiner le retour symétrique
// de celui déjà présent entre B/C. Ne JAMAIS modifier les cotes ni les bends.
function profileDrawingSection(points,bends){
 const original=profileSectionPath(points,bends);
 if(!Array.isArray(points)||points.length<5||!Array.isArray(bends)||
    !bends.slice(1,-1).some(b=>b?.mode==='hem'))return original;
 const sides=original.segments,first=sides[0],last=sides.at(-1);
 if(!first||!last)return original;
 const v=[first[1][0]-first[0][0],first[1][1]-first[0][1]],
       w=[last[1][0]-last[0][0],last[1][1]-last[0][1]];
 const vl=Math.hypot(...v),wl=Math.hypot(...w);
 if(vl<15||wl<15||Math.abs(vl-wl)>Math.max(3,vl*.025)||
    (v[0]*w[0]+v[1]*w[1])/(vl*wl)>-.985)return original;
 const start=first[0],end=last[1],u=v.map(q=>q/vl),normal=[-u[1],u[0]];
 const delta=[end[0]-start[0],end[1]-start[1]];
 const along=delta[0]*u[0]+delta[1]*u[1],across=delta[0]*normal[0]+delta[1]*normal[1];
 // Si les extrémités sont trop éloignées, aucune fermeture ne doit être inventée.
 if(Math.abs(along)>20||Math.abs(across)>20)return original;
 const middle=sides[1]||first;
 const mid=[(middle[0][0]+middle[1][0])/2,(middle[0][1]+middle[1][1])/2];
 const inside=(mid[0]-start[0])*normal[0]+(mid[1]-start[1])*normal[1];
 const side=inside<0?-1:1,radius=5;
 const target=[start[0]+normal[0]*side*radius*2,start[1]+normal[1]*side*radius*2];
 const visual=points.map(p=>p.slice());
 // Déplacer uniquement la fin schématique du retour, pas le modèle de fabrication.
 // Garder la même longueur graphique pour le dernier côté.
 let section=original;
 for(let attempt=0;attempt<3;attempt++){
  const tip=section.segments.at(-1)[1],dx=target[0]-tip[0],dy=target[1]-tip[1];
  if(Math.hypot(dx,dy)<.02)break;
  for(const index of [visual.length-2,visual.length-1]){
   visual[index][0]+=dx;
   visual[index][1]+=dy;
  }
  section=profileSectionPath(visual,bends);
 }
 const tip=section.segments.at(-1)[1];
 if(Math.hypot(tip[0]-target[0],tip[1]-target[1])>1)return original;
 section.path+=' A'+radius+' '+radius+' 0 0 '+(side>0?1:0)+' '+start.map(decimal).join(' ');
 section.folds.push([(tip[0]+start[0])/2,(tip[1]+start[1])/2]);
 section.closedReturn=true;
 return section;
}

function profileSideMarkers({segments,folds},model,handles,annotationBounds,[left,right]=[0,800]){
 const placed=[];
 const distance=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
 function distanceToSide(p,[a,b]){
  const dx=b[0]-a[0],dy=b[1]-a[1],lengthSquared=dx*dx+dy*dy;
  const t=lengthSquared?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/lengthSquared)):0;
  return distance(p,[a[0]+t*dx,a[1]+t*dy]);
 }
 const points=segments.flat();
 const center=[0,1].map(axis=>{
  const coordinates=points.map(point=>point[axis]);
  return (Math.min(...coordinates)+Math.max(...coordinates))/2;
 });
 const missing=[],leaders=[];
 const markers=segments.map(([a,b],index)=>{
  const label=model.segments?.[index]?.label||String.fromCharCode(65+index);
  const mm=model.segments?.[index]?.lengthMM;
  const caption=Number.isFinite(mm)?label+' · '+formatMeasurement(mm,model.unit):label;
  const length=distance(a,b),halfWidth=caption===label?11:Math.ceil(caption.length*4.1+8);
  const anchor=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const compact=right-left<800;
  const clear=([x,y])=>{
   const near=(q,margin)=>Math.abs(x-q[0])<halfWidth+margin&&Math.abs(y-q[1])<12+margin;
   const relative=([px,py])=>[(px-x)/(halfWidth+7),(py-y)/19];
   return x>=left+halfWidth+2&&x<=right-halfWidth-2&&y>=14&&y<=462&&
    !placed.some(q=>compact?distance([x,y],q.point)<50:
      near(q.point,q.halfWidth+4)&&Math.abs(y-q.point[1])<28)&&
    !folds.some(q=>near(q,10))&&!handles.some(q=>near(q,12))&&
    !segments.some(line=>distanceToSide([0,0],line.map(relative))<1.42);
  };
  let position=null, adjacent=false;
  if(length){
   const nx=(a[1]-b[1])/length,ny=(b[0]-a[0])/length;
   // Repères du côté droit du tracé : A au-dessus, B à droite,
   // C à gauche, D sous le retour. Les plis voisins ne partagent plus
   // la même rangée de badges ni des flèches traversant le profil.
   const preferred=-1;
   const gap=Math.max(compact?52:38,Math.ceil(1.48/Math.hypot(nx/(halfWidth+7),ny/19))+2);
   const candidate=(side,extra,slide=0)=>[
    anchor[0]+side*(gap+extra)*nx+slide*(b[0]-a[0])/length,
    anchor[1]+side*(gap+extra)*ny+slide*(b[1]-a[1])/length
   ];
   position=[candidate(preferred,0),candidate(preferred,10),
    candidate(preferred,24),candidate(preferred,8,22),candidate(preferred,8,-22)].find(clear);
   adjacent=!!position;
   if(!position){
    for(const extra of [18,35,55,85,120,160]){
     position=[candidate(preferred,extra),candidate(-preferred,extra),
       candidate(preferred,extra,26),candidate(-preferred,extra,-26)].find(clear);
     if(position)break;
    }
   }
  }
  if(!position&&(caption!==label||right-left<800)){
   let nearest=Infinity;
   for(let y=16;y<=452;y+=20)for(let x=left+halfWidth+2;x<=right-halfWidth-2;x+=24){
    const candidate=[x,y],gap=distance(candidate,anchor);
    if(gap<nearest&&clear(candidate)){position=candidate;nearest=gap;}
   }
  }
  if(!position){
   missing.push({label,caption,anchor,halfWidth});
   return '';
  }
  placed.push({point:position,halfWidth,anchor:caption===label||adjacent?null:anchor});
  annotationBounds?.push([position[0],position[1],halfWidth,12]);
  return badge(position,caption,halfWidth,caption===label);
 }).join('');
 function badge([x,y],caption,halfWidth,letterOnly){
  const shape=letterOnly?`<circle cx="${decimal(x)}" cy="${decimal(y)}" r="11"`:
   `<rect x="${decimal(x-halfWidth)}" y="${decimal(y-12)}" width="${halfWidth*2}" height="24" rx="9"`;
  return `<g class="profile-side-marker" data-marker-label="${esc(caption.split(" · ")[0])}" pointer-events="none" aria-hidden="true">${shape} fill="#fff" stroke="#779068"/><text x="${decimal(x)}" y="${decimal(y+4)}" text-anchor="middle" font-size="${letterOnly?12:14}" font-weight="700" fill="#345d3d">${esc(caption)}</text></g>`;
 }
 function leader(from,to){
  const gap=distance(from,to);
  if(gap<12)return '';
  const dx=(to[0]-from[0])/gap,dy=(to[1]-from[1])/gap;
  const tip=[to[0]-dx*5,to[1]-dy*5];
  const wing=sign=>[tip[0]-dx*7-dy*4*sign,tip[1]-dy*7+dx*4*sign].map(decimal).join(',');
  return `<path class="profile-measure-leader" d="M${from.map(decimal).join(',')}L${tip.map(decimal).join(',')} M${wing(-1)}L${tip.map(decimal).join(',')}L${wing(1)}" fill="none" stroke="#667e60" stroke-width="1.7" pointer-events="none"/>`;
 }
 for(const position of placed){
  if(position.anchor)leaders.push(leader(position.point,position.anchor));
 }
 if(!missing.length)return leaders.join('')+markers;
 const fallback=missing.map(({caption,label,anchor,halfWidth},index)=>{
  const letterOnly=caption===label;
  const columns=letterOnly?Math.floor((right-left)/30):7;
  const row=Math.floor(index/columns);
  const inRow=Math.min(columns,missing.length-row*columns);
  const x=letterOnly?(left+right)/2+(index%columns-(inRow-1)/2)*30:61+(index%columns)*113;
  const y=letterOnly?495-row*24:466+row*14;
  const point=[x,y];
  annotationBounds?.push([x,y,letterOnly?11:halfWidth*.55,letterOnly?11:6.6]);
  if(!letterOnly)leaders.push(leader(point,anchor));
  return letterOnly?badge(point,caption,halfWidth,true):
   `<g transform="translate(${x} ${y}) scale(.55)">${badge([0,0],caption,halfWidth,false)}</g>`;
 }).join('');
 return leaders.join('')+markers+`<g class="profile-marker-overflow" aria-label="Repères déportés">${fallback}</g>`;

}

function profileDiagramContent(model, mapped, {bends=model.bends||[], markers=true, markerModel=model, handles=[], illustrative=false, togglePaintedFace=false, horizontalBounds, angleOverlay, paintedMarker='stripe', highContrast=false}={}){
 const section=profileDrawingSection(mapped,bends);
 let output=`<path d="${section.path}" fill="none" stroke="${highContrast?'#304b3d':'#97a68b'}" stroke-width="9" stroke-linejoin="miter"/><path d="${section.path}" fill="none" stroke="${highContrast?'#dfe8e3':'#dbe3d4'}" stroke-width="4" stroke-linejoin="miter"/>`;
 const reserved=[...handles];
 section.segments.forEach(([a,b],i)=>{
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],normal=[-dy/len,dx/len];
 const segment=model.segments?.[i],label=segment?.label||String.fromCharCode(65+i);
 if(!illustrative&&model.coloredFace?.side&&model.coloredFace.segmentId===label){const side=model.coloredFace.side==='left'?-1:1;
 const at=gap=>[mid[0]+normal[0]*gap*side,mid[1]+normal[1]*gap*side];
 const haloCenter=at(12),haloHalf=Math.min(34,len*.4),haloEnd=sign=>[haloCenter[0]+dx/len*haloHalf*sign,haloCenter[1]+dy/len*haloHalf*sign];
 const haloEnds=[haloEnd(-1),haloEnd(1)];
 output+=`<path class="profile-painted-face-highlight" d="M${haloEnds[0].map(decimal).join(',')}L${haloEnds[1].map(decimal).join(',')}" fill="none" stroke="${highContrast?'#8fd36f':'#b8ddb0'}" stroke-opacity=".58" stroke-width="18" stroke-linecap="round"/>`;
 if(paintedMarker==='star'){
  const center=at(32);
  const points=Array.from({length:10},(_,index)=>{
   const angle=index*Math.PI/5-Math.PI/2,radius=index%2===0?23:10;
   return [decimal(center[0]+Math.cos(angle)*radius),decimal(center[1]+Math.sin(angle)*radius)].join(',');
  }).join(' ');
  reserved.push(center,[center[0]-14,center[1]],[center[0]+14,center[1]]);
  const action=togglePaintedFace?' data-toggle-painted-face role="button" tabindex="0" aria-label="Inverser la face peinte" style="cursor:pointer"':'';
  output+=`<g${action}><polygon class="profile-painted-star" points="${points}" fill="#ffcf4d" stroke="#202e29" stroke-width="4" stroke-linejoin="round"/></g>`;
  return;
 }
 const stripeCenter=at(9),half=Math.min(24,len*.34);
 const point=sign=>[stripeCenter[0]+dx/len*half*sign,stripeCenter[1]+dy/len*half*sign];
 const ends=[point(-1),point(1)];
 reserved.push(stripeCenter,...ends);
 const action=togglePaintedFace?' data-toggle-painted-face role="button" tabindex="0" aria-label="Inverser la face colorée" style="cursor:pointer"':'';
 const stripe=`M${ends[0].map(decimal).join(',')}L${ends[1].map(decimal).join(',')}`;
 output+=`<g${action}>${togglePaintedFace?`<path d="${stripe}" fill="none" stroke="transparent" stroke-width="38" stroke-linecap="round"/>`:''}<path class="profile-painted-stripe" d="${stripe}" fill="none" stroke="#175b94" stroke-width="5" stroke-linecap="round"/></g>`;}
 });
 const annotationBounds=angleOverlay?[]:null;
 if(markers)output+=profileSideMarkers(section,illustrative?{...markerModel,segments:markerModel.segments?.map(({label})=>({label}))}:markerModel,reserved,annotationBounds,horizontalBounds);
 if(angleOverlay)output+=angleOverlay(section,annotationBounds,reserved);
 return output;
}

  function bendingSheetSketch(item, scale=.25, options) {
    if (!item.valid || item.pointsMM.length < 2) return svgText(16,65,'Croquis à compléter','font-size="12" fill="#8b5526"');
    const project=projection(item.pointsMM,{x:110,y:85,w:580,h:340});
    return '<g font-family="Arial,sans-serif" transform="scale('+scale+')">'+profileDiagramContent(item,item.pointsMM.map(project),options)+'</g>';
  }

  const PROFILE_GROUPS = ['L','L replié','J','Z','Fascia','Oméga','Beam','Colonne','Solin brique','Coin architectural','Éloignement des eaux','Profils personnalisés'];
  function profileFamily(item) {
    const name=item.name.toLowerCase();
    for(const [pattern,label] of [[/^fascia/,'Fascia'],[/^beam|^cache-poutre/,'Beam'],[/^colonne/,'Colonne'],[/solin brique/,'Solin brique'],[/^coin architectural/,'Coin architectural'],[/^éloignement des eaux/,'Éloignement des eaux'],[/^oméga/,'Oméga']]){
      if(pattern.test(name))return label;
    }
    const bends=item.bends.filter(bend=>bend&&Math.abs(bend.turnDeg)>1e-5);
    const regular=bends.filter(bend=>bend.mode!=='hem');
    if(regular.length===1)return bends.length===1?'L':'L replié';
    if(regular.length===2&&bends.length===2)return Math.sign(regular[0].turnDeg)===Math.sign(regular[1].turnDeg)?'J':'Z';
    return null;
  }
  function groupProfiles(items,overrides={}) {
    const groups=new Map(), customLabels=new Map(), counts=new Map();
    for(const item of items){
      let group=item.kind==='profile'?(PROFILE_GROUPS.includes(overrides[item.id])?overrides[item.id]:profileFamily(item)):'Panneaux';
      if(!group){
        const turns=item.bends.map(bend=>bend?.mode==='hem'?'R':!bend?.turnDeg?'D':bend.turnDeg>0?'+':'-').join('');
        const mirror=value=>value.replace(/[+-]/g,sign=>sign==='+'?'-':'+');
        const reverse=[...turns].reverse().join('');
        const signature=[turns,mirror(turns),reverse,mirror(reverse)].sort()[0];
        if(!customLabels.has(signature)){
          const sides=item.segments.length,index=(counts.get(sides)||0)+1;
          counts.set(sides,index);
          customLabels.set(signature,'Profil personnalisé · '+sides+' côtés · type '+index);
        }
        group=customLabels.get(signature);
      }
      if(!groups.has(group))groups.set(group,[]);
      groups.get(group).push(item);
    }
    return groups;
  }
  function bendingSheetPages(order, profileGroups) {
    const width=850,height=1100,columns=[40,458,550,665,733,810],lineHeight=14;
    const documentFields=[
      ['BON DE COMMANDE',order.poNumber],['CHANTIER',order.project],
      ['DATE SOUHAITÉE',order.date],['CONTREMAÎTRE',order.foreman]
    ].map(([label,value])=>[label,wrapLines(value||'À préciser',44)]);
    const topLines=Math.max(documentFields[0][1].length,documentFields[1][1].length);
    const bottomLines=Math.max(documentFields[2][1].length,documentFields[3][1].length);
    const firstFieldY=111,secondFieldY=firstFieldY+30+topLines*lineHeight;
    const tableY=secondFieldY+43+bottomLines*lineHeight,headingH=28;
    const bodyLimit=1016,rows=[],pages=[[]];
    const missingOrderFields=!order.poNumber||!order.project||!order.date||!order.foreman;
    const status=missingOrderFields||!order.complete?'BROUILLON · À COMPLÉTER':'À VALIDER PAR L’ATELIER';
    const lines=(values,max)=>values.flatMap(value=>wrapLines(value,max));
    const take=(values,start)=>values.slice(start,start+23);
    const bodyText='font-size="11.5"';
    const compactLengths=item=>item.segments.flatMap((segment,index)=>{
      const bend=item.bends[index];
      return [segment.label+' = '+formatMeasurement(segment.lengthMM,item.unit),...(bend?['Pli '+bend.from+'–'+bend.to+' : '+bend.label]:[])];
    });
    for(const [family,items] of groupProfiles(order.items,profileGroups))for(const item of items){
      const title=lines([item.id+' · '+item.name],55);
      const face=item.coloredFace?.side?['Face colorée : '+(item.coloredFace.side==='left'?'gauche':'droite')+' · côté '+item.coloredFace.segmentId]:[];
      const details=lines([...compactLengths(item),...face,...(item.location?['Repère : '+item.location]:[]),...(item.note?[item.note]:[])],33);
      const material=lines(materialLines(item),13),finish=lines(finishLines(item),16);
      const checks=lines([...item.validation.errors,...item.validation.pending].map(issue=>issue.message),90).filter(Boolean);
      for(let start=0;start<Math.max(details.length,material.length,finish.length,1);start+=23){
        const fragment={family,item,title:start?lines([item.id+' · Suite des cotes'],55):title,details:take(details,start),material:take(material,start),finish:take(finish,start),continuation:start>0};
        const textHeight=Math.max(fragment.details.length,fragment.material.length,fragment.finish.length,1)*lineHeight;
        fragment.height=Math.max(215,fragment.title.length*lineHeight+textHeight+24);
        rows.push(fragment);
      }
      for(let start=0;start<checks.length;start+=23){
        const content=take(checks,start);
        rows.push({family,title:[item.id+' · Points à compléter'],note:content,height:content.length*lineHeight+42});
      }
    }
    const orderNotes=lines([...(order.notes?['Notes du dossier : '+order.notes]:[]),...order.errors.map(error=>error.message)],90);
    for(let start=0;start<orderNotes.length;start+=23){
      const note=take(orderNotes,start);
      rows.push({title:[start?'Dossier · Suite':'Dossier'],note,height:note.length*lineHeight+42});
    }
    let y=tableY+headingH;
    for(const row of rows){
      let heading=row.family&&pages.at(-1).at(-1)?.family!==row.family;
      if(y+row.height+(heading?23:0)>bodyLimit&&pages.at(-1).length){
        pages.push([]);y=tableY+headingH;heading=!!row.family;
      }
      if(heading)y+=23;
      pages.at(-1).push({...row,y,heading});y+=row.height;
    }
    const rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#727c72"/>`;
    return pages.map((page,index)=>{
      let svg=svgOpen(width,height,'MIR · Mise en production · Feuille '+(index+1)).replace('<svg ','<svg xmlns:xlink="http://www.w3.org/1999/xlink" ');
      svg+='<rect x="40" y="30" width="5" height="59" rx="2" fill="#518944"/>';
      svg+=svgText(55,51,'BON DE COMMANDE','font-size="26" font-weight="700" fill="#244733"');
      svg+=svgText(55,76,'MISE EN PRODUCTION · MOULURES','font-size="13" font-weight="700" fill="#506650"');
      svg+='<image xlink:href="assets/MIR-logo-HD.png" x="654" y="25" width="156" height="55" preserveAspectRatio="xMaxYMid meet"/>';
      svg+=svgText(810,95,status,'font-size="11" font-weight="700" text-anchor="end" fill="#52684e"');
      svg+=`<rect x="40" y="101" width="770" height="${tableY-122}" rx="6" fill="#f3f6f0" stroke="#d5ded1"/>`;
      documentFields.forEach(([label,values],i)=>{
        const x=i%2?434:53,y=i<2?firstFieldY:secondFieldY;
        svg+=svgText(x,y+11,label,'font-size="10" font-weight="700" fill="#52684e"');
        svg+=multiline(x,y+27,values,{width:44,lineHeight,attrs:'font-size="13" font-weight="700"'}).svg;
      });
      svg+=svgText(40,tableY-7,order.items.length+' ligne'+(order.items.length>1?'s':'')+' · '+order.knownQuantity+' pièce'+(order.knownQuantity>1?'s':'' )+' (quantités renseignées)','font-size="11" fill="#52684e"');
      if(order.revision)svg+=svgText(810,tableY-7,'Rév. '+order.revision,'font-size="11" text-anchor="end" fill="#52684e"');
      svg+='<rect x="40" y="'+tableY+'" width="770" height="'+headingH+'" fill="#244733"/>';
      ['MOULURES','MÉTAL / GAGE','COULEUR','QUANTITÉ','LONGUEUR'].forEach((label,column)=>{
        svg+=svgText(columns[column]+7,tableY+18,label,'font-size="10.5" font-weight="700" fill="#fff"');
      });
      for(const x of columns.slice(1,-1))svg+=`<path d="M${x} ${tableY}v${headingH}" stroke="#727c72"/>`;
      for(const row of page){
        const {item,y}=row;
        if(row.heading){
          svg+=rect(40,y-23,770,23,'#edf2eb');
          svg+=svgText(49,y-7,row.family,'font-size="12" font-weight="700"');
        }
        svg+=rect(40,y,770,row.height,'#fff');
        svg+=multiline(49,y+17,row.title,{width:55,lineHeight,attrs:'font-size="12" font-weight="700"'}).svg;
        if(row.note){
          svg+=multiline(49,y+35,row.note,{width:90,lineHeight,attrs:bodyText}).svg;
          continue;
        }
        for(const x of columns.slice(1,-1))svg+=`<path d="M${x} ${y}v${row.height}" stroke="#727c72"/>`;
        const detailY=y+20+row.title.length*lineHeight;
        if(!row.continuation)svg+='<g transform="translate(48 '+(detailY+3)+')">'+bendingSheetSketch(item)+'</g>';
        svg+=multiline(254,detailY,row.details,{width:33,lineHeight,attrs:bodyText}).svg;
        svg+=multiline(465,y+18,row.material,{width:13,lineHeight,attrs:bodyText}).svg;
        svg+=multiline(557,y+18,row.finish,{width:16,lineHeight,attrs:bodyText}).svg;
        svg+=svgText(699,y+21,row.continuation?'—':item.quantity??'À préciser','font-size="15" font-weight="700" text-anchor="middle"');
        if(!row.continuation)svg+=multiline(740,y+18,[formatMeasurement(item.lengthMM,item.unit)],{width:11,lineHeight,attrs:bodyText}).svg;
      }
      svg+='<line x1="40" x2="810" y1="1031" y2="1031" stroke="#aebcaa"/>';
      svg+=svgText(40,1046,'Liseré bleu : face colorée. Cotes de la pièce finie. Rayons et développé à valider par l’atelier.','font-size="11"');
      svg+=svgText(40,1068,'Validation MIR avant transmission.','font-size="11"');
      svg+=svgText(810,1068,'Feuille '+(index+1)+' / '+pages.length,'font-size="12" text-anchor="end"');
      return {name:'Mise en production · '+(index+1)+'/'+pages.length,svg:svg+svgClose,layout:'bending-sheet'};
    });
  }
  function clientDossierPages(order,{production=false}={}){
    const pages=[];
    for(const item of order.items){
      const details=[...productionDetailLines(item),...(item.location?['Emplacement : '+item.location]:[]),...(item.note?[item.note]:[]),...item.validation.errors.map(v=>v.message),...item.validation.pending.map(v=>v.message),...(item.quotePolicy.required?['Soumission obligatoire : '+item.quotePolicy.reason]:[]),...(order.notes?['Notes : '+order.notes]:[])].flatMap(line=>wrapLines(line,87));
      const primary=details.slice(0,24),columns=[primary.slice(0,12),primary.slice(12,24)];
      {
        let svg=svgOpen(850,1100,'Pièce cotée '+item.id);
        svg+=multiline(40,91,[production?'MISE EN PRODUCTION · PROFIL UNIQUE':'DOSSIER DE PLIAGE'],{width:75,lineHeight:18,attrs:'font-size="12" font-weight="700" fill="#52634f"'}).svg;
        svg+=multiline(40,121,[item.id+' · '+item.name],{width:75,lineHeight:23,attrs:'font-size="18" font-weight="700"'}).svg;
        svg+=multiline(40,154,[['Commande : '+(order.poNumber||'À préciser'),'Chantier : '+(order.project||'À préciser'),'Chef : '+(order.foreman||'À préciser'),'Date : '+(order.date||'À préciser'),'Révision : '+(order.revision||'À préciser')].join(' · ')],{width:95,lineHeight:18,attrs:'font-size="12"'}).svg;
        svg+='<rect x="40" y="230" width="770" height="345" fill="#fafbf8" stroke="#d7ded2"/>';
        if(item.kind==='profile'&&item.valid){const map=projection(item.pointsMM,{x:110,y:85,w:580,h:245});svg+='<g transform="translate(65 235) scale(.9)">'+profileDiagramContent(item,item.pointsMM.map(map),{paintedMarker:'star',highContrast:true,markerModel:item})+'</g>';}
        else if(item.kind==='panel')svg+=placeSVG(panelSVG(item,{width:710,height:325,legend:false,header:false,notes:false}),70,240);
        else svg+=svgText(65,380,'Croquis à compléter','font-size="20"');
        svg+=svgText(40,603,'MATÉRIAU / FINI','font-size="12" font-weight="700" fill="#52634f"');
        svg+=multiline(40,628,[...materialLines(item),...finishLines(item)],{width:48,lineHeight:21,attrs:'font-size="15"'}).svg;
        svg+=svgText(500,603,'QUANTITÉ / LONGUEUR','font-size="12" font-weight="700" fill="#52634f"');
        svg+=svgText(500,633,(item.quantity??'À préciser')+' pièce(s)','font-size="22" font-weight="700"');
        svg+=multiline(500,662,item.kind==='profile'?[formatMeasurement(item.lengthMM,item.unit)]:[formatMeasurement(item.widthMM,item.unit)+' × '+formatMeasurement(item.heightMM,item.unit)],{width:32,lineHeight:23,attrs:'font-size="18"'}).svg;
        svg+=svgText(40,764,'COTES FINIES ET POINTS À VALIDER','font-size="12" font-weight="700" fill="#52634f"');
        svg+=multiline(40,790,columns[0],{width:42,lineHeight:18,attrs:'font-size="13"'}).svg;
        svg+=multiline(430,790,columns[1],{width:42,lineHeight:18,attrs:'font-size="13"'}).svg;
        svg+=svgText(40,1003,'Étoile : face peinte. Rayons, développé et réglages à valider par l’atelier.','font-size="12"');
        pages.push({name:item.id+' · '+item.name,layout:production?'bending-sheet':'mir-dossier',documentTitle:production?'Mise en production':order.requiresQuote?'Demande de soumission':order.automaticPricingAllowed?'Récapitulatif de pliage':'DOSSIER DE PLIAGE',reference:[order.poNumber||order.dossierReference,order.project].filter(Boolean).join(' · ')||'Projet à confirmer',svg:svg+svgClose,summary:primary});
      }
      for(let start=24;start<details.length;start+=40){
        const extra=details.slice(start,start+40),left=extra.slice(0,20),right=extra.slice(20,40);
        let svg=svgOpen(850,1100,'Continuation '+item.id);
        svg+=multiline(40,120,['Continuation — quantité déjà comptée',item.id+' · '+item.name],{width:75,lineHeight:27,attrs:'font-size="20" font-weight="700"'}).svg;
        svg+=svgText(40,205,'Bloc complémentaire seulement · aucun dessin, matériau, longueur ou quantité répété.','font-size="13" fill="#52634f"');
        svg+=multiline(40,260,left,{width:43,lineHeight:22,attrs:'font-size="14"'}).svg;
        svg+=multiline(430,260,right,{width:43,lineHeight:22,attrs:'font-size="14"'}).svg;
        pages.push({name:item.id+' · Continuation',layout:production?'bending-sheet':'mir-dossier',documentTitle:production?'Mise en production':'DOSSIER DE PLIAGE',reference:[order.poNumber||order.dossierReference,order.project].filter(Boolean).join(' · ')||'Projet à confirmer',svg:svg+svgClose,summary:extra});
      }
    }
    return pages;
  }
  function productionPages(input = {}, {layout, profileGroups, document, bendTariff} = {}) {
    const order = buildOrder(input, { bendTariff: document === 'client-request' ? bendTariff : undefined }), fragments = [];
    if (document !== 'client-request' && layout === 'bending-sheet' && !order.requiresQuote && order.items.length && order.items.every(item => item.kind === 'profile')) return clientDossierPages(order,{production:true});
    const clientRequest = document === 'client-request';
    if(clientRequest)return clientDossierPages({...order,dossierReference:input.poNumber||input.id});
    const pricedProfiles = clientRequest && order.automaticPricingAllowed && order.items.every(item => item.kind === 'profile');
    const documentTitle = order.requiresQuote ? 'Demande de soumission' :
      pricedProfiles ? 'Récapitulatif de pliage' :
      clientRequest ? (order.items.every(item => item.kind === 'profile') ? 'Demande de pliage' : 'Demande de pièces sur mesure') : 'Mise en production';
    for (const item of order.items) {
      const details = productionDetailLines(item).flatMap(line => wrapLines(line, 37));
      if (item.location) details.push(...wrapLines('Emplacement : ' + item.location, 37));
      if (item.note) details.push(...wrapLines(item.note, 37));
      for (let n = 0; n < Math.max(1, details.length); n += 13) fragments.push({ item, details: details.slice(n, n + 13), continuation: n > 0 });
    }
    if (!fragments.length) fragments.push({ empty: true });
    const count = Math.ceil(fragments.length / 2), pages = [];
    for (let page = 0; page < count; page++) {
      const rows = fragments.slice(page * 2, page * 2 + 2), width = 1400, height = 1000, tableX = 32, tableY = 172, tableW = 1336, headerH = 42, rowH = 326, columns = [32, 812, 972, 1148, 1244, 1368];
      let svg = svgOpen(width, height, 'MIR · ' + documentTitle + ' · ' + (page + 1));
      svg += svgText(32, 45, documentTitle.toLocaleUpperCase('fr-CA'), 'font-size="29" font-weight="700"');
      svg += svgText(1368, 45, 'MIR', 'font-size="34" font-weight="700" text-anchor="end" fill="#527539"');
      svg += svgText(32, 82, (clientRequest ? 'Référence du projet : ' : 'PO / bon de commande Zoho Books : ') + (order.poNumber || 'À préciser'), 'font-size="17"');
      svg += svgText(32, 110, 'Chantier : ' + (order.project || 'À préciser'), 'font-size="17"');
      svg += svgText(32, 138, (clientRequest ? 'Personne responsable : ' : 'Contremaître : ') + (order.foreman || 'À préciser'), 'font-size="17"');
      svg += svgText(1368, 82, 'Date souhaitée : ' + (order.date || 'À préciser'), 'font-size="16" text-anchor="end"');
      if (!clientRequest) svg += svgText(1368, 110, 'Révision : ' + (order.revision || 'À préciser'), 'font-size="16" text-anchor="end"');
      const hasPricedLines = order.pricing.items.some(item => item.status === 'priced');
      svg += svgText(1368, 138, order.requiresQuote ? hasPricedLines ? 'Couleurs personnalisées sur soumission' : 'Soumission obligatoire · aucun prix automatique' : pricedProfiles ? 'Prix de base calculé sur 10 pi' : clientRequest ? 'Demande à faire valider par MIR' : 'Préparation locale · validation atelier requise', 'font-size="14" text-anchor="end" fill="#8a572c"');
      svg += '<rect x="32" y="' + tableY + '" width="' + tableW + '" height="' + headerH + '" fill="#eef2e9" stroke="#697568"/>';
      const headers = ['CROQUIS ET COTES FINIES', 'MATIÈRE / GAGE', 'COULEUR / CODE', 'QUANTITÉ', 'LONGUEUR / FORMAT'];
      headers.forEach((label, i) => { svg += svgText(columns[i] + 10, tableY + 27, label, 'font-size="' + (i === 4 ? 9 : 12) + '" font-weight="700"'); });
      rows.forEach((fragment, rowIndex) => {
        const y = tableY + headerH + rowIndex * rowH;
        svg += '<rect x="' + tableX + '" y="' + y + '" width="' + tableW + '" height="' + rowH + '" fill="#fff" stroke="#697568"/>';
        for (const x of columns.slice(1, -1)) svg += '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + rowH) + '" stroke="#abb4a6"/>';
        if (fragment.empty) { svg += svgText(60, y + 70, 'Aucune pièce dans ce dossier.', 'font-size="22"'); return; }
        const item = fragment.item, header = item.id + ' · ' + item.name + (fragment.continuation ? ' · SUITE, ne pas recompter' : '');
        svg += svgText(48, y + 27, header, 'font-size="16" font-weight="700"');
        const drawing = item.kind === 'profile' ? bendingSheetSketch(item,.5,clientRequest?{
          paintedMarker:'star',highContrast:true,markerModel:{segments:item.segments.map(({label})=>({label}))}
        }:undefined) : panelSVG(item, { width: 408, height: 270, legend: false, header: false, notes: false });
        svg += placeSVG(drawing, 42, y + 44);
        svg += multiline(466, y + 53, fragment.details, { width: 37, lineHeight: 20, attrs: 'font-size="14"' }).svg;
        svg += multiline(822, y + 42, materialLines(item), { width: 16, lineHeight: 24, attrs: 'font-size="15"' }).svg;
        svg += multiline(982, y + 42, finishLines(item), { width: 19, lineHeight: 24, attrs: 'font-size="15"' }).svg;
        svg += svgText(1196, y + 51, fragment.continuation ? '—' : item.quantity ?? 'À préciser', 'font-size="' + (item.quantity === null ? 12 : 25) + '" font-weight="700" text-anchor="middle"');
        if (fragment.continuation) svg += svgText(1196, y + 76, 'suite', 'font-size="12" text-anchor="middle"');
        const lengthLines = item.kind === 'profile' ? [formatMeasurement(item.lengthMM, item.unit)] : [formatMeasurement(item.widthMM, item.unit), '× ' + formatMeasurement(item.heightMM, item.unit)];
        svg += multiline(1254, y + 42, lengthLines, { width: 12, lineHeight: 23, attrs: 'font-size="14"' }).svg;
      });
      const footY = 904;
      const faceNote = !clientRequest ? 'Liseré bleu : face colorée. ' :
        rows.some(row => row.item?.kind === 'profile' && row.item.coloredFace?.side) ? 'Étoile : face peinte. ' : '';
      svg += svgText(32, footY, faceNote + 'Cotes de la pièce finie. Les rayons, le développé et les réglages de pliage restent à valider.', 'font-size="14"');
      svg += svgText(32, footY + 25, pricedProfiles ? 'Récapitulatif sur cet appareil. Disponibilité et fabrication à confirmer par MIR.' : clientRequest ? 'Demande préparée sur cet appareil. Transmission à MIR à faire séparément.' : 'La référence Zoho Books est saisie localement. Aucun bon de commande n’a été envoyé ni synchronisé.', 'font-size="13" fill="#5b685e"');
      if (hasPricedLines) {
        const totalLine = order.pricing.totalCents !== null ? 'Total de base : ' + priceText(order.pricing.totalCents) : order.pricing.pricedSubtotalCents !== null ? 'Sous-total des lignes tarifées : ' + priceText(order.pricing.pricedSubtotalCents) + '; autres pièces à chiffrer.' : 'Montant du dossier à vérifier; aucun total automatique.';
        svg += svgText(32, footY + 49, totalLine + ' Taxes et livraison non calculées.', 'font-size="12" fill="#5b685e"');
      }
      svg += svgText(1368, 969, 'Feuille ' + (page + 1) + ' / ' + count, 'font-size="15" text-anchor="end"');
      const summary = [...order.errors.map(e => e.message)];
      for (const fragment of rows) if (fragment.item) {
        const item = fragment.item;
        if (item.quotePolicy.required) summary.push(item.id + ' : ' + item.quotePolicy.reason);
        if (item.pricing.status === 'priced') summary.push(item.id + ' : ' + pricingDetailLines(item).join(' · ') + '. ' + item.pricing.note);
        for (const e of [...item.validation.errors, ...item.validation.pending]) summary.push(item.id + ' : ' + e.message);
        for (const e of item.validation.warnings.filter(w => w.code !== 'GAUGE_NOT_CONVERTED')) summary.push(item.id + ' : ' + e.message);
      }
      if (order.notes) summary.push('Notes du dossier : ' + order.notes);
      if (!summary.length) summary.push('Cotes et options renseignées. Validation de l’atelier requise avant fabrication.');
      pages.push({ ...(clientRequest?{documentTitle}:{}), name: documentTitle + ' · ' + (page + 1) + '/' + count, svg: svg + svgClose, summary: [...new Set(summary)], layout: 'wide', sidebarTitle: 'POINTS À VALIDER', scaleNote: 'Croquis coté de pièce finie. Ne pas relever de mesures sur la taille imprimée.', footerNote: clientRequest ? 'Demande client à faire valider par MIR.' : 'Document local — aucune transmission Zoho Books. Développé et compensations de pliage à valider par l’atelier.' });
    }
    return pages;
  }

  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
    return value;
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function fingerprint(value) {
    const s = canonical(value); let hash = 2166136261;
    for (let i = 0; i < s.length; i++) { hash ^= s.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  function templateMeasureFields(topology) {
    const field = (key, label, required = true) => ({ key, label, type: 'measure', value: null, required });
    if (topology.kind === 'profile') return topology.segments.map(s => field(s.label, s.label + (s.name ? ' · ' + s.name : ''))).concat(field('length', 'Longueur de la pièce'));
    const out = [field('width', 'A · largeur hors tout, lips compris')];
    if (topology.shape !== 'square') out.push(field('height', 'B · hauteur hors tout, lips compris'));
    out.push(field('relief', 'C · projection de la pièce finie'), field('lip', 'Largeur commune des lips', false));
    if (topology.shape === 'triangle') out.push(field('apexX', 'Position du sommet depuis la gauche'));
    if (topology.shape === 'roof-slope') out.push(field('roofPitch', 'Pente du haut en X/12'));
    if (topology.shape === 'trapezoid') out.push(field('topWidth', 'Largeur du haut'), field('topOffset', 'Décalage du haut depuis la gauche'));
    if (topology.shape === 'parallelogram') out.push(field('offset', 'Décalage signé du haut'));
    if (topology.shape === 'pointed') out.push(field('tipDepth', 'Profondeur de la pointe'), field('apexOffset', 'Position du sommet sur le côté'));
    return out;
  }
  function specFromTopology(topology, values = {}) {
    const m = values.measurements || values.dimensions || values, allowedMeta = ['id', 'unit', 'length', 'lengthUnit', 'quantity', 'material', 'finish', 'location', 'note', 'bottomEdgeId', 'perforation', 'mirrorX', 'dimensionBasis'];
    const spec = { kind: topology.kind };
    for (const key of allowedMeta) if (own(values, key)) spec[key] = copy(values[key]);
    if (topology.kind === 'profile') {
      spec.template = 'custom'; spec.startAngle = topology.startAngle; spec.bends = copy(topology.bends);
      spec.segments = topology.segments.map(s => ({ label: s.label, name: s.name, length: own(m, s.label) ? m[s.label] : values.segments?.find(v => v.label === s.label)?.length ?? null }));
      if (own(m, 'length')) spec.length = m.length;
      spec.coloredFace = copy(values.coloredFace || topology.coloredFace || {});
    } else {
      spec.shape = topology.shape;
      if (topology.rightAngle) spec.rightAngle = topology.rightAngle;
      if (topology.pointSide) spec.pointSide = topology.pointSide;
      if (topology.shape === 'roof-slope') spec.roofDirection = topology.roofDirection || 'right';
      if (own(m,'roofPitch'))spec.roofPitch=m.roofPitch;
      if (topology.shape === 'polygon') spec.contourRatios = copy(topology.contourRatios);
      for (const key of ['width', 'height', 'relief', 'lip', 'apexX', 'topWidth', 'topOffset', 'offset', 'tipDepth', 'apexOffset']) spec[key] = own(m, key) ? m[key] : null;
      if (spec.width === null && own(m, 'A')) spec.width = m.A;
      if (spec.height === null && own(m, 'B')) spec.height = m.B;
      if (spec.relief === null && own(m, 'C')) spec.relief = m.C;
      spec.lips = copy(m.lips || values.lips || values.borders || {});
    }
    return spec;
  }
  function createTemplate(input = {}, options = {}) {
    const source = copy(input?.version === VERSION && input.spec ? input.spec : input) || {}, errors = [], warnings = [];
    const kind = source.kind === 'panel' || source.shape ? 'panel' : 'profile';
    let topology, proportions;
    if (kind === 'profile') {
      const id = String(source.template || 'custom').toLowerCase(), preset = TEMPLATES[id === 'beam' ? 'beam5' : id], segments = preset ? preset.labels.map((label, i) => ({ label, name: preset.fieldLabels[i] })) : Array.isArray(source.segments) ? source.segments.map((s, i) => ({ label: text(s.label || String.fromCharCode(65 + i), 5), name: text(s.name, 100) })) : [];
      const bends = preset ? preset.turns.map(turn => ({ mode: 'interior', angle: 90, direction: turn > 0 ? 'left' : 'right' })) : copy(source.bends || []);
      const startAngle = preset ? preset.startAngle : source.startAngle ?? 0;
      const initial = segments.map((s, i) => parseMeasurement(preset ? source.dimensions?.[s.label] : source.segments?.[i]?.length, source.unit || 'in'));
      const largest = Math.max(1, ...initial.filter(p => p.ok && p.mm > 0).map(p => p.mm));
      const ratios = initial.map(p => p.ok && p.mm > 0 ? Math.max(.02, p.mm / largest) : 1);
      topology = { kind, segments, bends, startAngle, coloredFace: { side: ['left', 'right'].includes(source.coloredFace?.side) ? source.coloredFace.side : null, segmentId: text(source.coloredFace?.segmentId || segments[0]?.label, 5) } };
      proportions = { illustrative: true, unitless: true, segmentRatios: ratios };
      const probe = buildProfile({ template: 'custom', unit: 'mm', segments: segments.map((s, i) => ({ ...s, length: ratios[i] * 100 })), bends, startAngle });
      errors.push(...probe.validation.errors); warnings.push(...probe.validation.warnings);
    } else {
      const shape = String(source.shape || 'rectangle').toLowerCase();
      if (shape !== 'polygon' && !SHAPES.some(s => s.id === shape)) errors.push(issue('UNDEFINED_TEMPLATE_SHAPE', 'shape', 'Choisissez une forme définie; PLD / PLG restent à préciser.'));
      topology = { kind, shape };
      if (shape === 'right-triangle') topology.rightAngle = source.rightAngle || 'bottom-left';
      if (shape === 'pointed') topology.pointSide = source.pointSide || 'top';
      if (shape === 'roof-slope') topology.roofDirection = source.roofDirection || 'right';
      const a = parseMeasurement(source.width ?? source.dimensions?.A, source.unit || 'in'), b = parseMeasurement(source.height ?? source.dimensions?.B, source.unit || 'in');
      if (shape === 'polygon') {
        const vertices = a.ok && b.ok ? panelPolygonPoints(source, a.mm, b.mm) : null;
        const reason = simplePanelPolygon(vertices, a.mm, b.mm);
        if (reason) errors.push(issue('INVALID_TEMPLATE_POLYGON', 'contourRatios', reason));
        else topology.contourRatios = vertices.map(p => [p[0] / a.mm, p[1] / b.mm]);
      }
      const scale = Math.max(a.ok && a.mm > 0 ? a.mm : 1, b.ok && b.mm > 0 ? b.mm : 1), ratio = (value, fallback) => { const p = parseMeasurement(value, source.unit || 'in'); return p.ok ? p.mm / scale : fallback; };
      const width = a.ok && a.mm > 0 ? a.mm / scale : 1, height = shape === 'square' ? width : b.ok && b.mm > 0 ? b.mm / scale : .7;
      proportions = { illustrative: true, unitless: true, width, height, relief: .07, lip: .03, apexX: ratio(source.apexX, width / 2), topWidth: ratio(source.topWidth, width * .65), topOffset: ratio(source.topOffset, width * .15), offset: ratio(source.offset, width * .2), tipDepth: ratio(source.tipDepth, Math.min(width, height) * .25), apexOffset: ratio(source.apexOffset, (['right', 'left'].includes(topology.pointSide) ? height : width) / 2) };
      const probeValues = Object.fromEntries(Object.entries(proportions).filter(([k, v]) => typeof v === 'number').map(([k, v]) => [k, v * 100]));
      if(shape==='roof-slope')probeValues.roofPitch=source.roofPitch||'6/12';
      const probe = buildPanel({ ...specFromTopology(topology, { measurements: probeValues }), unit: 'mm' });
      errors.push(...probe.validation.errors);
    }
    const version = options.version === undefined ? 1 : options.version;
    if (!Number.isSafeInteger(version) || version < 1) errors.push(issue('TEMPLATE_VERSION', 'version', 'La version du modèle doit être un entier positif.'));
    const name = text(options.name || source.name || source.label || (kind === 'profile' ? 'Modèle de pliage' : 'Modèle de panneau'), 140), id = text(options.id || 'modele-' + fingerprint({ name, topology }), 100);
    if (!id) errors.push(issue('TEMPLATE_ID', 'id', 'Identifiant du modèle à préciser.'));
    if (errors.length) return { ok: false, template: null, errors, warnings };
    const template = { schema: 'mir-production-template-1', id, name, version, description: text(options.description, 500), kind, topology, fields: templateMeasureFields(topology), previewProportions: proportions, clientDefaults: {}, measurementDefaults: null, referenceUnit: null, previousVersion: options.previousVersion ?? null };
    template.fingerprint = fingerprint(template);
    return { ok: true, template: deepFreeze(template), errors: [], warnings };
  }
  function templateCheck(template) {
    const errors = [];
    if (!template || template.schema !== 'mir-production-template-1' || !template.id || !Number.isSafeInteger(template.version) || template.version < 1 || !['profile', 'panel'].includes(template.kind) || template.topology?.kind !== template.kind) errors.push(issue('INVALID_TEMPLATE', 'template', 'Modèle paramétrique invalide.'));
    if (!Array.isArray(template?.fields) || template.fields.some(f => f.value !== null)) errors.push(issue('TEMPLATE_HAS_ORDER_DIMENSIONS', 'fields', 'Les champs d’un modèle doivent rester sans cotes de commande.'));
    if (errors.length) return errors;
    const topology = template.topology;
    if (template.kind === 'profile') {
      if (!Array.isArray(topology.segments) || topology.segments.length < 2 || topology.segments.length > MAX_SEGMENTS) errors.push(issue('INVALID_TEMPLATE_SEGMENTS', 'topology.segments', 'Topologie de segments invalide.'));
      else {
        const used = new Set();
        for (const s of topology.segments) { if (!s || !/^[A-Z][A-Z0-9]{0,4}$/.test(s.label) || used.has(s.label) || own(s, 'length')) errors.push(issue('INVALID_TEMPLATE_SEGMENT', 'topology.segments', 'Les segments d’un modèle doivent avoir des repères distincts et aucune longueur de commande.')); used.add(s?.label); }
        if (!Array.isArray(topology.bends) || topology.bends.length !== topology.segments.length - 1) errors.push(issue('INVALID_TEMPLATE_BENDS', 'topology.bends', 'Topologie de plis invalide.'));
        else topology.bends.forEach((b, i) => normalizeBend(b, i, errors));
      }
      const angle = angleValue(topology.startAngle);
      if (angle === null || Math.abs(angle) > 360) errors.push(issue('INVALID_TEMPLATE_ANGLE', 'topology.startAngle', 'Orientation du modèle invalide.'));
    } else {
      if (topology.shape !== 'polygon' && !SHAPES.some(s => s.id === topology.shape)) errors.push(issue('INVALID_TEMPLATE_SHAPE', 'topology.shape', 'Forme de panneau non définie.'));
      if (topology.shape === 'right-triangle' && !['bottom-left', 'bottom-right', 'top-left', 'top-right'].includes(topology.rightAngle)) errors.push(issue('INVALID_TEMPLATE_RIGHT_ANGLE', 'topology.rightAngle', 'Position de l’angle droit invalide.'));
      if (topology.shape === 'pointed' && !['top', 'right', 'bottom', 'left'].includes(topology.pointSide)) errors.push(issue('INVALID_TEMPLATE_POINT', 'topology.pointSide', 'Côté de la pointe invalide.'));
      if(topology.shape==='roof-slope'&&!['left','right'].includes(topology.roofDirection))errors.push(issue('INVALID_ROOF_DIRECTION','topology.roofDirection','Choisissez la montée à gauche ou à droite.'));
      if (topology.shape === 'polygon') {
        const reason = simplePanelPolygon(topology.contourRatios, 1, 1);
        if (reason) errors.push(issue('INVALID_TEMPLATE_POLYGON', 'topology.contourRatios', reason));
      }
    }
    if (!errors.length) {
      const expected = templateMeasureFields(topology).map(f => f.key), actual = template.fields.map(f => f.key);
      if (canonical(actual) !== canonical(expected)) errors.push(issue('TEMPLATE_FIELD_SCHEMA', 'fields', 'Le schéma des cotes ne correspond pas à la topologie.'));
    }
    if (template.fingerprint) { const value = copy(template); delete value.fingerprint; if (fingerprint(value) !== template.fingerprint) errors.push(issue('TEMPLATE_CHANGED_WITHOUT_REVISION', 'template', 'Le modèle a changé sans nouvelle révision; créez une version distincte.')); }
    return errors;
  }
  function templatePreview(template) {
    const errors = templateCheck(template);
    if (errors.length) return { ok: false, model: null, errors, illustrative: true };
    const p = template.previewProportions || {}, measurements = {};
    if (template.kind === 'profile') template.topology.segments.forEach((s, i) => { measurements[s.label] = (p.segmentRatios?.[i] || 1) * 100; });
    else for (const [key, value] of Object.entries(p)) if (typeof value === 'number') measurements[key] = value * 100;
    if(template.kind==='panel'&&template.topology.shape==='roof-slope')measurements.roofPitch=p.roofPitch||'6/12';
    const spec = specFromTopology(template.topology, { unit: 'mm', measurements }); spec.name = template.name;
    const model = modelOf(spec); model.illustrative = true; model.productionReady = false; model.complete = false;
    return { ok: model.valid, model, errors: model.validation.errors, illustrative: true, unitless: true };
  }
  function makeInstance(template, values, revisionNumber = 1, previousRevisionId = null, history = []) {
    const errors = templateCheck(template);
    if (errors.length) return { ok: false, spec: null, model: null, snapshot: null, history: copy(history), errors, pending: [] };
    const savedValues = copy(values || {}), spec = specFromTopology(template.topology, savedValues);
    spec.name = text(savedValues.name || savedValues.label || template.name, 140);
    const model = modelOf(spec), id = text(savedValues.instanceId || savedValues.id || 'piece-' + fingerprint({ templateId: template.id, version: template.version, spec }), 100);
    spec.id = id; model.spec.id = id; model.id = id;
    const geometry = model.kind === 'profile' ? { kind: 'profile', pointsMM: model.pointsMM, segments: model.segments, bends: model.bends, coloredFace: model.coloredFace } : { kind: 'panel', shape: model.shape, pointsMM: model.pointsMM, edges: model.edges, widthMM: model.widthMM, heightMM: model.heightMM, reliefMM: model.reliefMM, parameters: model.parameters, bottomEdgeId: model.bottomEdgeId, perforation: model.perforation, mirrorX: model.mirrorX, dimensionBasis: model.dimensionBasis };
    if (model.shape === 'polygon') Object.assign(geometry, { areaMM2: model.areaMM2, perimeterMM: model.edges.reduce((sum, e) => sum + e.lengthMM, 0), vertexAnglesDeg: model.edges.map(e => e.interiorAngleDeg), coordinateConvention: 'local-x-right-y-up' });
    const snapshot = { schema: 'mir-production-instance-1', id, templateId: template.id, templateVersion: template.version, templateSnapshot: copy(template), modelVersion: VERSION, revision: revisionNumber, previousRevisionId, values: savedValues, spec: copy(spec), measurements: copy(savedValues.measurements || savedValues.dimensions || {}), geometry: copy(geometry), drawingSVG: model.kind === 'profile' ? profileSVG(model) : panelSVG(model), status: model.complete ? 'specified' : 'draft', quotePolicy: copy(model.quotePolicy), pricing: copy(model.pricing), workshopValidationRequired: true };
    snapshot.revisionId = id + '-r' + revisionNumber + '-' + fingerprint({ template: snapshot.templateSnapshot, spec: snapshot.spec, revisionNumber, previousRevisionId });
    return { ok: model.valid, spec: deepFreeze(copy(spec)), model, snapshot: deepFreeze(snapshot), history: deepFreeze(copy(history)), errors: copy(model.validation.errors), pending: copy(model.validation.pending) };
  }
  function instantiateTemplate(template, values = {}) { return makeInstance(template, values); }
  function reviseInstance(instance, changes = {}) {
    const current = instance?.snapshot || instance;
    if (!current || current.schema !== 'mir-production-instance-1') return { ok: false, spec: null, model: null, snapshot: null, errors: [issue('INSTANCE_REQUIRED', 'instance', 'Une version existante de la pièce est requise.')], pending: [] };
    const topologyChanges = ['kind', 'template', 'shape', 'segments', 'bends', 'startAngle', 'rightAngle', 'pointSide', 'roofDirection', 'pointsIn', 'contourRatios'].filter(key => own(changes, key) && canonical(changes[key]) !== canonical(current.spec[key]));
    if (topologyChanges.length) return { ok: false, spec: null, model: null, snapshot: null, errors: [issue('TOPOLOGY_REVISION_REQUIRED', topologyChanges.join(','), 'Un changement de forme ou de plis nécessite une nouvelle version du modèle, puis une nouvelle pièce. La commande originale reste conservée.')], pending: [] };
    const old = copy(current.values), updated = { ...old, ...copy(changes), instanceId: current.id };
    for (const key of ['measurements', 'dimensions', 'material', 'finish', 'coloredFace', 'perforation', 'lips', 'borders']) {
      if (old[key] && typeof old[key] === 'object' && !Array.isArray(old[key]) && changes[key] && typeof changes[key] === 'object' && !Array.isArray(changes[key])) updated[key] = { ...old[key], ...copy(changes[key]) };
    }
    const history = [...(Array.isArray(instance.history) ? instance.history : []), copy(current)];
    return makeInstance(current.templateSnapshot, updated, current.revision + 1, current.revisionId, history);
  }
  // Explicitly revise a free profile's topology while preserving its instance history.
  function reviseProfileTrace(instance, spec, values = {}) {
    const current=instance?.snapshot;
    if(current?.schema!=='mir-production-instance-1'||current.spec?.kind!=='profile'||current.spec.template!=='custom'||spec?.kind!=='profile'||spec.template!=='custom')
      return {ok:false,errors:[issue('FREE_PROFILE_REQUIRED','template','Un tracé libre existant est requis.')]};
    const revised=createTemplateRevision(current.templateSnapshot,spec);
    if(!revised.ok)return revised;
    return makeInstance(revised.template,{...copy(values),instanceId:current.id},current.revision+1,current.revisionId,[...(instance.history||[]),copy(current)]);
  }
  function createTemplateRevision(template, spec, options = {}) {
    const errors = templateCheck(template);
    if (errors.length) return { ok: false, template: null, errors, warnings: [] };
    let source = spec;
    if (!source) {
      const preview = templatePreview(template);
      if (!preview.ok) return { ok: false, template: null, errors: preview.errors, warnings: [] };
      source = preview.model.spec;
    }
    return createTemplate(source, { id: template.id, name: options.name || template.name, description: options.description ?? template.description, version: template.version + 1, previousVersion: template.version });
  }

  function validate(spec) { return modelOf(spec).validation; }
  return Object.freeze({ version: VERSION, TEMPLATES, SHAPES, PROFILE_GROUPS:Object.freeze(PROFILE_GROUPS), groupProfiles, parseMeasurement, formatMeasurement, quotePolicy, pricePiece, priceDossier, buildProfile, buildPanel, mirrorPanelSpec, insertDoubleFold, validate, profileSVG, profileSectionPath, profileDiagramContent, panelSVG, buildOrder, productionPages, createTemplate, templatePreview, instantiateTemplate, configureTemplate: instantiateTemplate, createOrderSnapshot: instantiateTemplate, reviseInstance, reviseProfileTrace, revision: reviseInstance, createTemplateRevision });
});
