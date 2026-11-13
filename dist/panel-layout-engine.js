/* MIR architectural-panel layout. Dimensions describe the finished outer
 * piece, including its lips. One lip width overlaps at each interior joint.
 * This is a coverage calculation, not a sheet-metal development or a cutting
 * optimizer. No installation clearance or manufacturer limit is inferred. */
(function (factory) {
  const geometry = typeof module === 'object' && module.exports ? require('./architectural-wall-geometry.js') :
    typeof window === 'object' ? window.MIRArchitecturalWallGeometry : null;
  const api = factory(geometry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window === 'object') window.MIRPanelLayout = api;
})(function (geometry) {
  'use strict';
  const EPS = 1e-8, MAX_COUNT = 16, MAX_IN = 1000000, STEP = 1 / 16;
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const near = (a, b) => Math.abs(a - b) <= EPS;
  const sum = values => values.reduce((total, value) => total + value, 0);
  const issue = (code, path, message, details = {}) => ({ code, path, message, ...details });
  const AXES = Object.freeze({
    x: { span: 'widthIn', count: 'columns', axes: 'xAxesIn', sizes: 'columnWidthsIn', sizeLocks: 'widthLocks', jointLocks: 'xLocks', dimension: 'largeur', group: 'colonne', joint: 'vertical' },
    y: { span: 'heightIn', count: 'rows', axes: 'yAxesIn', sizes: 'rowHeightsIn', sizeLocks: 'heightLocks', jointLocks: 'yLocks', dimension: 'hauteur', group: 'rangée', joint: 'horizontal' }
  });

  function copyConfig(input) {
    const config = record(input) ? { ...input } : {};
    for (const key of ['xAxesIn', 'yAxesIn']) if (Array.isArray(config[key])) config[key] = config[key].slice();
    if (Array.isArray(config.contourIn)) config.contourIn = config.contourIn.map(point => Array.isArray(point) ? point.slice() : point);
    for (const key of ['widthLocks', 'heightLocks', 'xLocks', 'yLocks']) if (record(config[key])) config[key] = { ...config[key] };
    return config;
  }
  function empty(config, errors, warnings = []) {
    return { ok: false, errors, warnings, config: copyConfig(config),
      widthIn: finite(config?.widthIn) ? config.widthIn : null,
      heightIn: finite(config?.heightIn) ? config.heightIn : null,
      lipIn: finite(config?.lipIn) ? config.lipIn : null,
      columns: Number.isInteger(config?.columns) ? config.columns : null,
      rows: Number.isInteger(config?.rows) ? config.rows : null,
      xAxesIn: [], yAxesIn: [], columnWidthsIn: [], rowHeightsIn: [], pieces: [],
      checks: { assembledWidthIn: null, assembledHeightIn: null } };
  }
  function failedAction(previous, errors) {
    return { ...previous, ok: false, unchanged: true, errors: Array.isArray(errors) ? errors : [errors], config: copyConfig(previous.config) };
  }
  function onGrid(value, step) { return !step || Math.abs(value - Math.round(value / step) * step) <= EPS; }
  function valuesFromAxes(span, lip, axes) {
    if (!axes.length) return [span];
    return [axes[0] + lip / 2, ...axes.slice(1).map((position, i) => position - axes[i] + lip), span - axes.at(-1) + lip / 2];
  }
  function axesFromValues(values, lip) {
    const axes = []; let prefix = 0;
    for (let i = 0; i < values.length - 1; i++) { prefix += values[i]; axes.push(prefix - (i + .5) * lip); }
    return axes;
  }
  function initialValues(span, count, lip, mode) {
    if (mode === 'axes') return valuesFromAxes(span, lip, Array.from({ length: count - 1 }, (_, i) => span * (i + 1) / count));
    return Array(count).fill((span + (count - 1) * lip) / count);
  }
  function lockMap(value, key, count, errors) {
    if (value === undefined || value === null) return {};
    if (!record(value)) { errors.push(issue('INVALID_LOCKS', key, 'Les cotes verrouillées doivent être un ensemble de valeurs indexées.')); return {}; }
    const out = {};
    for (const [index, amount] of Object.entries(value)) {
      if (!/^(0|[1-9]\d*)$/.test(index) || Number(index) >= count) errors.push(issue('INVALID_LOCK_INDEX', key + '.' + index, 'Un verrou désigne une pièce ou un joint qui n’existe pas.'));
      else if (!finite(amount) || amount <= 0 || amount > MAX_IN) errors.push(issue('INVALID_LOCK_VALUE', key + '.' + index, 'Une cote verrouillée doit être un nombre positif en pouces.'));
      else out[index] = amount;
    }
    return out;
  }
  function normalize(input) {
    const config = copyConfig(input), errors = [];
    if (!record(input)) return { config, errors: [issue('INVALID_CONFIG', 'config', 'Renseignez les dimensions de la zone à répartir.')] };
    for (const key of ['widthIn', 'heightIn']) if (!finite(config[key]) || config[key] <= 0 || config[key] > MAX_IN) errors.push(issue('INVALID_DIMENSION', key, 'La ' + (key === 'widthIn' ? 'largeur' : 'hauteur') + ' de la zone doit être un nombre positif en pouces, dans la plage de calcul.'));
    if (!finite(config.lipIn) || config.lipIn < 0 || config.lipIn > MAX_IN) errors.push(issue('INVALID_LIP', 'lipIn', 'La largeur du lip doit être renseignée en pouces, avec une valeur positive ou zéro.'));
    for (const key of ['columns', 'rows']) if (!Number.isInteger(config[key]) || config[key] < 1 || config[key] > MAX_COUNT) errors.push(issue('INVALID_COUNT', key, 'Choisissez de 1 à 16 ' + (key === 'columns' ? 'colonnes' : 'rangées') + '.'));
    config.mode = config.mode === undefined ? 'equal' : config.mode;
    if (!['equal', 'axes'].includes(config.mode)) errors.push(issue('INVALID_MODE', 'mode', 'Choisissez des panneaux égaux ou des axes régulièrement espacés.'));
    config.precisionIn = config.precisionIn === undefined || config.precisionIn === null ? 0 : config.precisionIn;
    if (config.precisionIn !== 0 && config.precisionIn !== STEP) errors.push(issue('INVALID_PRECISION', 'precisionIn', 'Le pas disponible est 1/16 po, ou le calcul exact sans arrondi.'));
    for (const descriptor of Object.values(AXES)) {
      const count = config[descriptor.count];
      config[descriptor.sizeLocks] = lockMap(config[descriptor.sizeLocks], descriptor.sizeLocks, Number.isInteger(count) ? count : 0, errors);
      config[descriptor.jointLocks] = lockMap(config[descriptor.jointLocks], descriptor.jointLocks, Number.isInteger(count) ? count - 1 : 0, errors);
      const positions = config[descriptor.axes];
      if (positions === undefined || positions === null) { delete config[descriptor.axes]; continue; }
      if (!Array.isArray(positions) || positions.length !== count - 1 || positions.some(position => !finite(position))) errors.push(issue('INVALID_AXES', descriptor.axes, 'Le nombre de joints et leurs positions doivent correspondre à la répartition choisie.'));
    }
    return { config, errors };
  }

  /* Allocate the free dimensions between two fixed joint axes. Size locks
   * remain exact. The free central faces share the available face span in
   * proportion to their previous dimensions; no manufactured width is lost. */
  function allocate(total, indices, fixed, preferences, lip, step, descriptor) {
    const values = new Map(), free = [], errors = [], warnings = [];
    for (const index of indices) {
      if (own(fixed, index)) values.set(index, fixed[index]); else free.push(index);
    }
    const fixedTotal = sum([...values.values()]), remaining = total - fixedTotal;
    if (!free.length) {
      if (!near(remaining, 0)) errors.push(issue('LOCK_CONFLICT', descriptor.sizeLocks, 'Les ' + descriptor.dimension + 's verrouillées ne ferment pas la zone entre ses limites fixes.', { remainingIn: remaining }));
      return { values, errors, warnings };
    }
    const faceBudget = remaining - free.length * 2 * lip;
    if (faceBudget <= free.length * EPS) {
      errors.push(issue('INSUFFICIENT_SPACE', descriptor.sizeLocks, 'L’espace restant ne permet pas une face centrale positive pour chaque ' + descriptor.group + '.', { remainingIn: remaining }));
      return { values, errors, warnings };
    }
    const weights = free.map(index => Math.max(0, preferences[index] - 2 * lip));
    const weightTotal = sum(weights);
    const ideals = free.map((index, i) => 2 * lip + faceBudget * (weightTotal > EPS ? weights[i] / weightTotal : 1 / free.length));
    // Floating-point residue stays on a free piece, never on a locked one.
    ideals[ideals.length - 1] += remaining - sum(ideals);
    let result = ideals;
    if (step) {
      if (!onGrid(total, step) || [...values.values()].some(value => !onGrid(value, step))) {
        errors.push(issue('PRECISION_CONFLICT', descriptor.axes, 'Les cotes fixes de cette ' + descriptor.dimension + ' sont incompatibles avec des panneaux au 1/16 po. Conservez le calcul exact ou corrigez les cotes.'));
        return { values, errors, warnings };
      }
      const targetTicks = Math.round(remaining / step), minTicks = Math.floor((2 * lip + EPS) / step) + 1;
      if (targetTicks < free.length * minTicks) {
        errors.push(issue('PRECISION_FACE_COLLAPSE', descriptor.axes, 'Le pas de 1/16 po ne laisse pas assez de place pour les lips et une face centrale positive.'));
        return { values, errors, warnings };
      }
      const quotas = ideals.map(value => value / step), ticks = quotas.map(value => Math.max(minTicks, Math.floor(value + EPS)));
      let difference = targetTicks - sum(ticks);
      // The discrepancy is bounded by the number of pieces: each ideal is
      // positive and each floor differs by less than one tick (including the
      // strict minimum for a positive central face).
      while (difference !== 0) {
        const direction = difference > 0 ? 1 : -1;
        const candidates = free.map((index, i) => ({ index, i, score: direction > 0 ? quotas[i] - ticks[i] : ticks[i] - quotas[i] }))
          .filter(candidate => direction > 0 || ticks[candidate.i] > minTicks)
          .sort((a, b) => Math.abs(a.score - b.score) > EPS ? b.score - a.score : b.index - a.index);
        if (!candidates.length) { errors.push(issue('PRECISION_CONFLICT', descriptor.axes, 'Les contraintes ne peuvent pas être réparties au 1/16 po.')); return { values, errors, warnings }; }
        ticks[candidates[0].i] += direction; difference -= direction;
      }
      result = ticks.map(value => value * step);
      if (result.some((value, i) => !near(value, ideals[i]))) warnings.push(issue('ROUNDING_DISTRIBUTED', descriptor.axes, 'Le reste au 1/16 po a été réparti entre les ' + descriptor.group + 's libres pour conserver la cote totale.', { precisionIn: step }));
    }
    free.forEach((index, i) => values.set(index, result[i]));
    return { values, errors, warnings };
  }
  function solveAxis(config, descriptor, preferences, overrideSizes) {
    const span = config[descriptor.span], count = config[descriptor.count], lip = config.lipIn;
    const total = span + (count - 1) * lip, fixed = overrideSizes || config[descriptor.sizeLocks], joints = config[descriptor.jointLocks];
    const errors = [], warnings = [], values = Array(count);
    for (const [key, size] of Object.entries(fixed)) {
      if (size - 2 * lip <= EPS) errors.push(issue('FACE_COLLAPSE', descriptor.sizeLocks + '.' + key, 'La ' + descriptor.dimension + ' hors tout verrouillée doit dépasser deux largeurs de lip.'));
      if (config.precisionIn && !onGrid(size, config.precisionIn)) errors.push(issue('PRECISION_CONFLICT', descriptor.sizeLocks + '.' + key, 'La cote verrouillée de la ' + descriptor.group + ' ' + (Number(key) + 1) + ' ne tombe pas au 1/16 po.'));
    }
    const boundaries = [{ end: 0, sum: 0 }];
    for (const key of Object.keys(joints).sort((a, b) => Number(a) - Number(b))) {
      const index = Number(key), position = joints[key];
      if (!(position > 0 && position < span)) errors.push(issue('JOINT_OUTSIDE_ZONE', descriptor.jointLocks + '.' + key, 'Un joint verrouillé se trouve en dehors de la zone.'));
      boundaries.push({ end: index + 1, sum: position + (index + .5) * lip });
    }
    boundaries.push({ end: count, sum: total });
    if (errors.length) return { errors, warnings, values: [], axes: [] };
    for (let b = 1; b < boundaries.length; b++) {
      const previous = boundaries[b - 1], next = boundaries[b];
      const indices = Array.from({ length: next.end - previous.end }, (_, i) => previous.end + i);
      const allocated = allocate(next.sum - previous.sum, indices, fixed, preferences, lip, config.precisionIn, descriptor);
      errors.push(...allocated.errors); warnings.push(...allocated.warnings);
      for (const [index, value] of allocated.values) values[index] = value;
    }
    return { errors, warnings, values, axes: errors.length ? [] : axesFromValues(values, lip) };
  }
  function validateAxis(config, descriptor, axes, values) {
    const errors = [], span = config[descriptor.span], lip = config.lipIn;
    for (let i = 0; i < axes.length; i++) {
      if (!(axes[i] > 0 && axes[i] < span) || i > 0 && axes[i] <= axes[i - 1]) errors.push(issue('INVALID_JOINT_POSITION', descriptor.axes + '.' + i, 'Le joint ' + descriptor.joint + ' ' + (i + 1) + ' doit rester à l’intérieur de la zone, dans l’ordre des joints.'));
    }
    values.forEach((size, i) => {
      if (!finite(size) || size - 2 * lip <= EPS) errors.push(issue('FACE_COLLAPSE', descriptor.sizes + '.' + i, 'La ' + descriptor.group + ' ' + (i + 1) + ' doit conserver une face centrale positive après ses deux lips.'));
      if (config.precisionIn && !onGrid(size, config.precisionIn)) errors.push(issue('PRECISION_CONFLICT', descriptor.sizes + '.' + i, 'La ' + descriptor.dimension + ' de la ' + descriptor.group + ' ' + (i + 1) + ' ne respecte pas le pas de 1/16 po.'));
      if (own(config[descriptor.sizeLocks], i) && !near(size, config[descriptor.sizeLocks][i])) errors.push(issue('SIZE_LOCK_CONFLICT', descriptor.sizeLocks + '.' + i, 'La ' + descriptor.dimension + ' verrouillée de la ' + descriptor.group + ' ' + (i + 1) + ' empêche ce changement.'));
    });
    for (const [index, position] of Object.entries(config[descriptor.jointLocks])) if (!near(axes[Number(index)], position)) errors.push(issue('JOINT_LOCK_CONFLICT', descriptor.jointLocks + '.' + index, 'La position verrouillée du joint ' + descriptor.joint + ' ' + (Number(index) + 1) + ' empêche ce changement.'));
    if (!near(sum(values) - (values.length - 1) * lip, span)) errors.push(issue('COVERAGE_MISMATCH', descriptor.span, 'La somme des pièces et des recouvrements ne ferme pas la zone.'));
    return errors;
  }

  function build(input) {
    const normalized = normalize(input), config = normalized.config, errors = normalized.errors, warnings = [];
    if (errors.length) return empty(config, errors);
    const dimensions = {};
    for (const [axis, descriptor] of Object.entries(AXES)) {
      let positions, sizes;
      if (own(config, descriptor.axes)) {
        positions = config[descriptor.axes].slice(); sizes = valuesFromAxes(config[descriptor.span], config.lipIn, positions);
      } else {
        const preferences = initialValues(config[descriptor.span], config[descriptor.count], config.lipIn, config.mode);
        const solved = solveAxis(config, descriptor, preferences);
        errors.push(...solved.errors); warnings.push(...solved.warnings);
        if (solved.errors.length) continue;
        positions = solved.axes; sizes = solved.values;
      }
      errors.push(...validateAxis(config, descriptor, positions, sizes));
      dimensions[axis] = { axes: positions, sizes };
    }
    if (errors.length) return empty(config, errors, warnings);
    const x = dimensions.x, y = dimensions.y, lip = config.lipIn;
    config.xAxesIn = x.axes.slice(); config.yAxesIn = y.axes.slice();
    const pieces = [];
    for (let row = 0; row < config.rows; row++) for (let col = 0; col < config.columns; col++) {
      const widthIn = x.sizes[col], heightIn = y.sizes[row];
      pieces.push({ id: 'P' + String(pieces.length + 1).padStart(2, '0'), row, col,
        xIn: col ? x.axes[col - 1] - lip / 2 : 0, yIn: row ? y.axes[row - 1] - lip / 2 : 0,
        widthIn, heightIn, lipIn: lip, faceWidthIn: widthIn - 2 * lip, faceHeightIn: heightIn - 2 * lip, areaSqIn: widthIn * heightIn });
    }
    const layout = { ok: true, errors: [], warnings, config,
      widthIn: config.widthIn, heightIn: config.heightIn, lipIn: lip, columns: config.columns, rows: config.rows,
      xAxesIn: x.axes.slice(), yAxesIn: y.axes.slice(), columnWidthsIn: x.sizes.slice(), rowHeightsIn: y.sizes.slice(), pieces,
      checks: { assembledWidthIn: sum(x.sizes) - (config.columns - 1) * lip,
        assembledHeightIn: sum(y.sizes) - (config.rows - 1) * lip,
        equalColumns: x.sizes.every(value => near(value, x.sizes[0])), equalRows: y.sizes.every(value => near(value, y.sizes[0])),
        horizontalOverlapCount: config.columns - 1, verticalOverlapCount: config.rows - 1,
        lipBandsAcross: config.columns + 1, lipBandsDown: config.rows + 1,
        zoneAreaSqIn: config.widthIn * config.heightIn, totalPanelAreaSqIn: sum(pieces.map(piece => piece.areaSqIn)) } };
    if (own(config, 'contourIn')) {
      if (!geometry) return empty(config, [issue('CONTOUR_ENGINE_UNAVAILABLE', 'contourIn', 'Le moteur de découpe du contour n’est pas chargé.')], warnings);
      const clipped = geometry.clipLayout(layout, config.contourIn);
      if (!clipped.ok) return empty(config, clipped.errors, warnings);
      layout.contourIn = clipped.contourIn;
      layout.pieces = clipped.pieces;
      layout.warnings.push(...clipped.warnings);
      layout.checks.zoneAreaSqIn = clipped.zoneAreaSqIn;
      layout.checks.coverageAreaSqIn = clipped.coverageAreaSqIn;
      layout.checks.totalPanelAreaSqIn = clipped.totalPanelAreaSqIn;
      layout.checks.rectangularEnvelopeAreaSqIn = config.widthIn * config.heightIn;
      layout.checks.activeCells = new Set(clipped.pieces.map(piece => piece.cellId)).size;
      layout.checks.pieceCount = clipped.pieces.length;
    }
    return layout;
  }
  function actionContext(input, axis, index, joint) {
    const previous = build(input);
    if (!previous.ok) return { previous, failure: previous };
    const descriptor = AXES[axis];
    if (!descriptor) return { previous, failure: failedAction(previous, issue('INVALID_AXIS', 'axis', 'Choisissez l’axe x pour les colonnes ou y pour les rangées.')) };
    const count = previous.config[descriptor.count] - (joint ? 1 : 0);
    if (!Number.isInteger(index) || index < 0 || index >= count) return { previous, failure: failedAction(previous, issue('INVALID_INDEX', 'index', 'La pièce ou le joint sélectionné n’existe pas.')) };
    return { previous, descriptor };
  }
  function operationResult(previous, next, warnings = []) {
    const result = build(next);
    if (!result.ok) return failedAction(previous, result.errors);
    result.warnings = [...warnings, ...result.warnings]; return result;
  }
  function moveJoint(input, axis, index, positionIn, options = {}) {
    const context = actionContext(input, axis, index, true);
    if (context.failure) return context.failure;
    const { previous, descriptor } = context, config = copyConfig(previous.config), warnings = [];
    if (!finite(positionIn)) return failedAction(previous, issue('INVALID_JOINT_POSITION', descriptor.axes + '.' + index, 'Entrez une position de joint numérique en pouces.'));
    let target = positionIn;
    if (config.precisionIn && options?.snap === true) {
      const prefix = positionIn + (index + .5) * config.lipIn;
      target = Math.round(prefix / config.precisionIn) * config.precisionIn - (index + .5) * config.lipIn;
      if (!near(target, positionIn)) warnings.push(issue('JOINT_SNAPPED', descriptor.axes + '.' + index, 'Le joint a été ajusté au pas de 1/16 po des panneaux.', { requestedIn: positionIn, actualIn: target }));
    }
    if (own(config[descriptor.jointLocks], index) && !near(target, config[descriptor.jointLocks][index])) return failedAction(previous, issue('JOINT_LOCKED', descriptor.jointLocks + '.' + index, 'Déverrouillez ce joint avant de changer sa position.'));
    config[descriptor.axes][index] = target;
    return operationResult(previous, config, warnings);
  }
  function centerJoint(input, axis, index) {
    const descriptor = AXES[axis];
    if (!descriptor) return actionContext(input, axis, index, true).failure;
    return moveJoint(input, axis, index, input?.[descriptor.span] / 2);
  }
  function setPanelSize(input, axis, index, valueIn, options = {}) {
    const context = actionContext(input, axis, index, false);
    if (context.failure) return context.failure;
    const { previous, descriptor } = context, config = copyConfig(previous.config);
    if (!finite(valueIn) || valueIn - 2 * config.lipIn <= EPS || valueIn > MAX_IN) return failedAction(previous, issue('INVALID_PANEL_SIZE', descriptor.sizes + '.' + index, 'La dimension hors tout doit laisser une face centrale positive après les deux lips.'));
    if (config.precisionIn && !onGrid(valueIn, config.precisionIn)) return failedAction(previous, issue('PRECISION_CONFLICT', descriptor.sizes + '.' + index, 'Cette cote exacte ne tombe pas au 1/16 po. Conservez le calcul exact ou choisissez une autre cote.'));
    const fixed = { ...config[descriptor.sizeLocks], [index]: valueIn };
    const solved = solveAxis(config, descriptor, previous[descriptor.sizes], fixed);
    if (solved.errors.length) return failedAction(previous, solved.errors);
    config[descriptor.axes] = solved.axes;
    if (options?.lock === false) delete config[descriptor.sizeLocks][index];
    else config[descriptor.sizeLocks][index] = valueIn;
    return operationResult(previous, config, solved.warnings);
  }
  function setJointLock(input, axis, index, locked) {
    const context = actionContext(input, axis, index, true);
    if (context.failure) return context.failure;
    const { previous, descriptor } = context, config = copyConfig(previous.config);
    if (typeof locked !== 'boolean') return failedAction(previous, issue('INVALID_LOCK', 'locked', 'Indiquez si le joint est verrouillé ou déverrouillé.'));
    if (locked) config[descriptor.jointLocks][index] = previous[descriptor.axes][index]; else delete config[descriptor.jointLocks][index];
    return operationResult(previous, config);
  }
  function unlockPanelSize(input, axis, index) {
    const context = actionContext(input, axis, index, false);
    if (context.failure) return context.failure;
    const { previous, descriptor } = context, config = copyConfig(previous.config);
    delete config[descriptor.sizeLocks][index]; return operationResult(previous, config);
  }
  return Object.freeze({ version: '1.0.0', limits: Object.freeze({ maxColumns: MAX_COUNT, maxRows: MAX_COUNT, maxPieces: MAX_COUNT * MAX_COUNT, maxContourVertices: 64, maxContourPieces: 4096, maxDimensionIn: MAX_IN }),
    build, moveJoint, centerJoint, setPanelSize, setJointLock, unlockPanelSize });
});
