/* Physical repeat geometry for MIR's material drawing.
 * Source coordinates stay in drawing units; feetPerPixel is the one explicit
 * calibration. Visible courses, installed pieces and physical sheet formats
 * are different quantities and are deliberately reported separately.
 * This module does not infer a covering width from a product's name, a colour
 * photograph, nominal sheet dimensions or sales area. No browser or storage.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MIRMaterialCoverage = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const validDirection = value => value === 'horizontal' || value === 'vertical';
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const limits = Object.freeze({ lines: 2000, cells: 10000 });
  const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  // Snap only arithmetic round-off at whole module boundaries. A real remainder
  // is never redistributed across the preceding full modules.
  const snapInteger = value => near(value, Math.round(value)) ? Math.round(value) : value;
  const countModules = (length, size) => Math.ceil(snapInteger(length / size));
  const validBounds = bounds => Array.isArray(bounds) && bounds.length === 4 && bounds.every(finite) && bounds[2] > bounds[0] && bounds[3] > bounds[1];
  const url = (...values) => values.find(value => typeof value === 'string' && /^https?:\/\//.test(value)) || null;
  const firstPositive = (...values) => values.find(positive) ?? null;
  const dimensionId = value => String(Number(value.toFixed(6)));
  const selectedPattern = (material, choice) => choice.pattern || material.renderPattern || 'plain';

  function formats(material = {}) {
    const result = [], seen = new Set(), declared = Array.isArray(material.formats) ? material.formats : [];
    function add(format, fallback) {
      if (!format || format.measurementKind !== 'physical_piece' || format.verified === false || format.stockConfirmationRequired === true) return;
      if (!positive(format.widthIn) || !positive(format.lengthIn)) return;
      const sourceUrl = url(format.sourceUrl, material.maxPiece?.sourceUrl, material.sourceUrl);
      if (!sourceUrl && format.verified !== true) return;
      const id = String(format.id || `${dimensionId(format.widthIn)}x${dimensionId(format.lengthIn)}`);
      const size = `${format.widthIn}:${format.lengthIn}`;
      if (seen.has(id) || (fallback && result.some(item => near(item.widthIn, format.widthIn) && near(item.lengthIn, format.lengthIn)))) return;
      seen.add(id);
      result.push({ ...format, id, widthIn: format.widthIn, lengthIn: format.lengthIn,
        label: format.label || `${dimensionId(format.widthIn)} × ${dimensionId(format.lengthIn)} po`,
        sourceUrl, measurementKind: 'physical_piece', status: 'documented', sizeKey: size });
    }
    declared.forEach(format => add(format, false));
    // maxPiece is a physical stock ceiling, never a permission to convert a
    // nominal catalogue format into a measured sheet.
    if (material.maxPiece?.verified === true) add(material.maxPiece, true);
    return result;
  }

  function directionFor(material, choice, pattern) {
    const allowed = (Array.isArray(material.allowedOrientations) ? material.allowedOrientations : []).filter(validDirection);
    const supplied = validDirection(choice.orientation) ? choice.orientation : null;
    if (supplied && allowed.length && !allowed.includes(supplied)) return { orientation: null, orientationVerified: false, reason: 'orientation_not_allowed' };
    const orientation = supplied || allowed[0] || (pattern === 'vertical' ? 'vertical' : ['lap', 'shingle'].includes(pattern) ? 'horizontal' : null);
    return { orientation, orientationVerified: !!orientation && allowed.includes(orientation), reason: orientation ? null : 'orientation_missing' };
  }

  function coverageSpec(material = {}, choice = {}) {
    const coverage = material.coverage || {}, dimensions = material.dimensions || {}, pattern = selectedPattern(material, choice);
    // Soffit panels are repeated narrow profiles, not facade sheet stock. Their
    // useful piece width can be documented even when no physical sheet exists.
    const soffitOnly = material.applications?.includes('soffit') && !material.applications?.includes('siding');
    const direction = directionFor(material, choice, soffitOnly ? 'lap' : pattern);
    const panel = !soffitOnly && (pattern === 'panel' || material.renderPattern === 'panel');
    const board = !panel && (soffitOnly || ['lap', 'vertical', 'shingle'].includes(pattern) || positive(material.exposureMm) || positive(coverage.visualExposureIn) || positive(coverage.exposureIn) || positive(dimensions.exposureIn) || positive(coverage.usefulWidthIn));
    const base = { type: panel ? 'panel' : board ? 'board' : 'unknown', pattern, ...direction,
      status: 'unresolved', complete: false, reason: 'coverage_missing',
      exposureIn: null, pieceCoverageIn: null, coursesPerPiece: null,
      exposureRangeIn: null, exposureBasis: null, pieceCoverageBasis: null,
      widthIn: null, lengthIn: null, moduleWidthIn: null, moduleLengthIn: null,
      displayWidthIn: null, displayHeightIn: null, formatId: null, format: null,
      formatDefaulted: false, sourceUrl: null,
      referenceUrl: url(coverage.sourceUrl, material.sourceUrl), countBasis: null };

    if (panel) {
      const available = formats(material), requested = typeof choice.formatId === 'string' && choice.formatId ? choice.formatId : null;
      const format = requested ? available.find(item => item.id === requested) :
        available.find(item => near(item.widthIn, material.maxPiece?.widthIn || 0) && near(item.lengthIn, material.maxPiece?.lengthIn || 0)) || available[0];
      if (!format) return { ...base, reason: requested ? 'format_not_available' : 'physical_format_missing', requestedFormatId: requested };
      // A lap/shiplap panel can be physically wider than its covering module.
      // The source must state that useful dimension explicitly.
      const moduleWidthIn = firstPositive(format.usefulWidthIn, format.coverageWidthIn, coverage.usefulWidthIn, format.widthIn);
      const moduleLengthIn = firstPositive(format.usefulLengthIn, format.coverageLengthIn, coverage.usefulLengthIn, format.lengthIn);
      const orientation = direction.orientation;
      return { ...base, status: 'documented', complete: !!orientation,
        reason: direction.reason, formatId: format.id, format: { ...format }, formatDefaulted: !requested,
        widthIn: format.widthIn, lengthIn: format.lengthIn, moduleWidthIn, moduleLengthIn,
        displayWidthIn: orientation ? orientation === 'horizontal' ? moduleLengthIn : moduleWidthIn : null,
        displayHeightIn: orientation ? orientation === 'horizontal' ? moduleWidthIn : moduleLengthIn : null,
        physicalDisplayWidthIn: orientation ? orientation === 'horizontal' ? format.lengthIn : format.widthIn : null,
        physicalDisplayHeightIn: orientation ? orientation === 'horizontal' ? format.widthIn : format.lengthIn : null,
        sourceUrl: format.sourceUrl, referenceUrl: url(format.sourceUrl, base.referenceUrl),
        coveringSourceUrl: url(format.coverageSourceUrl, coverage.sourceUrl),
        moduleBasis: near(moduleWidthIn, format.widthIn) && near(moduleLengthIn, format.lengthIn) ? 'physical-format-edge-to-edge' : 'published-covering',
        jointGapIn: 0, countBasis: 'bounding-box-grid' };
    }
    if (!board) return { ...base, reason: 'profile_not_dimensioned' };

    const range = Array.isArray(coverage.exposureRangeIn) && coverage.exposureRangeIn.length === 2 && coverage.exposureRangeIn.every(positive) && coverage.exposureRangeIn[0] <= coverage.exposureRangeIn[1] ? coverage.exposureRangeIn.slice() : null;
    const conflict = coverage.dimensionConflict === true || coverage.exposureConflict === true;
    const unverified = coverage.verified === false || coverage.verificationStatus === 'official_index_only';
    const explicitlyCounted = firstPositive(coverage.coursesPerPiece, coverage.coursesPerPanel, dimensions.coursesPerPanel);
    const knownCourseCount = Number.isInteger(explicitlyCounted) && explicitlyCounted <= 64 ? explicitlyCounted : null;
    const publishedPiece = unverified ? null : firstPositive(coverage.usefulWidthIn, coverage.pieceCoverageIn);
    const measuredExposure = unverified || conflict || range ? null : firstPositive(coverage.visualExposureIn, coverage.exposureIn, dimensions.exposureIn,
      positive(material.exposureMm) ? material.exposureMm / 25.4 : null,
      publishedPiece && knownCourseCount ? publishedPiece / knownCourseCount : null,
      publishedPiece && !knownCourseCount ? publishedPiece : null);
    // A manual dimension is a project input, not a manufacturer fact. For a
    // fixed documented exposure the immutable product value takes precedence.
    const explicit = !measuredExposure && positive(choice.exposureIn) ? choice.exposureIn : null;
    if (explicit && range && !conflict && (explicit < range[0] && !near(explicit, range[0]) || explicit > range[1] && !near(explicit, range[1]))) {
      return { ...base, exposureRangeIn: range, reason: 'exposure_out_of_range', requestedExposureIn: explicit };
    }
    const exposureIn = measuredExposure || explicit;
    if (!exposureIn) return { ...base, exposureRangeIn: range, status: range || conflict ? 'selection-required' : 'unresolved',
      reason: conflict ? 'exposure_conflict' : range ? 'exposure_selection_required' : unverified ? 'coverage_unverified' : 'coverage_missing' };
    const derived = coverage.measurementBasis === 'derived' || coverage.exposureBasis === 'derived';
    const status = explicit ? 'user-specified' : derived ? 'derived' : 'documented';
    // Unknown products are assumed to have one visual course per project-
    // specified repeat, explicitly flagged as a project assumption below.
    const ratio = publishedPiece ? publishedPiece / exposureIn : null;
    const ratioCount = ratio && near(ratio, Math.round(ratio)) && ratio >= 1 && ratio <= 64 ? Math.round(ratio) : null;
    const coursesPerPiece = knownCourseCount || ratioCount || (!publishedPiece ? 1 : null);
    const pieceCoverageIn = explicit ? exposureIn * (knownCourseCount || 1) : publishedPiece || exposureIn * (knownCourseCount || 1);
    return { ...base, status, complete: !!direction.orientation, reason: direction.reason,
      exposureIn, pieceCoverageIn, coursesPerPiece, exposureRangeIn: range,
      exposureBasis: explicit ? 'project-input' : derived ? 'documented-dimensions-derived' : 'published-exposure',
      pieceCoverageBasis: explicit ? 'project-input' : publishedPiece ? 'published-covering' : knownCourseCount ? 'exposure-times-course-count' : 'single-course',
      sourceUrl: explicit ? null : url(coverage.sourceUrl, material.sourceUrl),
      widthIn: firstPositive(material.maxPiece?.widthIn, dimensions.actualWidthIn, dimensions.widthIn),
      lengthIn: firstPositive(material.maxPiece?.lengthIn, dimensions.lengthIn, positive(dimensions.lengthFt) ? dimensions.lengthFt * 12 : null),
      countBasis: direction.orientation === 'vertical' ? 'bounding-box-width' : 'bounding-box-height' };
  }

  function unresolvedGrid(reason, spec) {
    return { mode: 'product', complete: false, reason, status: spec?.status || 'unresolved',
      formatId: spec?.formatId || null, vertical: [], horizontal: [], columns: [], rows: [],
      columnCount: null, rowCount: null, cellCount: null, spec: spec || null };
  }

  function panelGrid(bounds, feetPerPixel, material = {}, choice = {}) {
    const spec = coverageSpec(material, choice);
    if (spec.type !== 'panel' || !spec.complete) return unresolvedGrid(spec.reason || 'physical_format_missing', spec);
    if (!validBounds(bounds)) return unresolvedGrid('invalid_bounds', spec);
    if (!positive(feetPerPixel)) return unresolvedGrid('scale_missing', spec);
    const [x0, y0, x1, y1] = bounds, scale = feetPerPixel * 12;
    const widthIn = (x1 - x0) * scale, heightIn = (y1 - y0) * scale;
    if (!positive(widthIn) || !positive(heightIn)) return unresolvedGrid('invalid_extent', spec);
    const moduleWidthIn = spec.displayWidthIn, moduleHeightIn = spec.displayHeightIn;
    const columnCount = countModules(widthIn, moduleWidthIn), rowCount = countModules(heightIn, moduleHeightIn);
    if (!(columnCount > 0 && rowCount > 0) || columnCount + rowCount - 2 > limits.lines || columnCount * rowCount > limits.cells) return unresolvedGrid('layout_limit', spec);
    const columns = Array.from({ length: columnCount }, (_, index) => {
      const startIn = index * moduleWidthIn, endIn = Math.min(widthIn, (index + 1) * moduleWidthIn);
      return { index, number: index + 1, startIn, endIn, widthIn: endIn - startIn,
        startPx: x0 + startIn / scale, endPx: x0 + endIn / scale, full: near(endIn - startIn, moduleWidthIn) };
    });
    // SVG Y grows downwards; the first physical sheet starts at the bottom.
    const rows = Array.from({ length: rowCount }, (_, index) => {
      const startIn = index * moduleHeightIn, endIn = Math.min(heightIn, (index + 1) * moduleHeightIn);
      return { index, number: index + 1, startIn, endIn, heightIn: endIn - startIn,
        startPx: y1 - endIn / scale, endPx: y1 - startIn / scale, full: near(endIn - startIn, moduleHeightIn) };
    });
    const vertical = columns.slice(1).map(column => ({ id: `product-v-${column.index}`, index: column.index,
      position: (column.startPx - x0) / (x1 - x0), coordinate: column.startPx, fromOriginIn: column.startIn }));
    const horizontal = rows.slice(1).map(row => ({ id: `product-h-${row.index}`, index: row.index,
      position: (row.endPx - y0) / (y1 - y0), coordinate: row.endPx, fromOriginIn: row.startIn })).sort((a, b) => a.position - b.position);
    return { mode: 'product', complete: true, reason: null, status: spec.status, formatId: spec.formatId,
      formatDefaulted: spec.formatDefaulted, widthIn, heightIn, moduleWidthIn, moduleHeightIn,
      vertical, horizontal, columns, rows, columnCount, rowCount, cellCount: columnCount * rowCount,
      origin: { x: x0, y: y1 }, countBasis: 'bounding-box-grid', clipped: false, spec };
  }

  function repeatBands(start, end, repeat) {
    const firstIndex = Math.floor(snapInteger(start / repeat)), exclusive = Math.ceil(snapInteger(end / repeat));
    const count = exclusive - firstIndex;
    if (!(count > 0) || count > limits.lines + 1) return null;
    return Array.from({ length: count }, (_, offset) => {
      const index = firstIndex + offset, nominalStart = index * repeat, nominalEnd = (index + 1) * repeat;
      const startIn = Math.max(start, nominalStart), endIn = Math.min(end, nominalEnd), visibleIn = endIn - startIn;
      return { index, number: offset + 1, startIn, endIn, visibleIn,
        full: near(visibleIn, repeat), cutAtStart: startIn > nominalStart && !near(startIn, nominalStart),
        cutAtEnd: endIn < nominalEnd && !near(endIn, nominalEnd) };
    });
  }

  function courseLayout(bounds, feetPerPixel, spec, anchors = {}) {
    const unresolved = reason => ({ complete: false, reason, status: spec?.status || 'unresolved', lines: [], bands: [],
      count: null, fullCount: null, partialCount: null, partialWidthsIn: [], pieceCount: null, pieceBands: [], countBasis: spec?.countBasis || null });
    if (spec?.type !== 'board' || spec.complete === false || !positive(spec?.exposureIn)) return unresolved(spec?.reason || 'coverage_missing');
    if (!validBounds(bounds)) return unresolved('invalid_bounds');
    if (!positive(feetPerPixel)) return unresolved('scale_missing');
    if (!validDirection(spec.orientation)) return unresolved('orientation_missing');
    const [x0, y0, x1, y1] = bounds, vertical = spec.orientation === 'vertical', scale = feetPerPixel * 12;
    const anchor = vertical ? finite(anchors.anchorX) ? anchors.anchorX : x0 : finite(anchors.anchorY) ? anchors.anchorY : y1;
    const start = (vertical ? x0 - anchor : anchor - y1) * scale, end = (vertical ? x1 - anchor : anchor - y0) * scale;
    if (!finite(start) || !finite(end) || !(end > start)) return unresolved('invalid_extent');
    const raw = repeatBands(start, end, spec.exposureIn);
    if (!raw) return unresolved('layout_limit');
    const coordinate = inches => vertical ? anchor + inches / scale : anchor - inches / scale;
    const bands = raw.map(band => {
      const a = coordinate(band.startIn), b = coordinate(band.endIn);
      return { ...band, id: `course-band-${band.index}`, courseIndex: band.index,
        startPx: Math.min(a, b), endPx: Math.max(a, b),
        boundsPx: vertical ? [Math.min(a, b), y0, Math.max(a, b), y1] : [x0, Math.min(a, b), x1, Math.max(a, b)] };
    });
    const lines = bands.slice(1).map(band => {
      const positionPx = coordinate(band.startIn);
      return { id: `course-${band.index}`, index: band.index, courseIndex: band.index,
        position: vertical ? (positionPx - x0) / (x1 - x0) : (positionPx - y0) / (y1 - y0),
        coordinate: positionPx, fromOriginIn: band.startIn };
    }).sort((a, b) => a.position - b.position);
    const rawPieces = positive(spec.pieceCoverageIn) ? repeatBands(start, end, spec.pieceCoverageIn) : null;
    if (positive(spec.pieceCoverageIn) && !rawPieces) return unresolved('layout_limit');
    const fullCount = bands.filter(band => band.full).length;
    return { complete: true, reason: null, status: spec.status, orientation: spec.orientation,
      exposureIn: spec.exposureIn, stepPx: spec.exposureIn / scale, anchor,
      anchorX: vertical ? anchor : finite(anchors.anchorX) ? anchors.anchorX : x0,
      anchorY: vertical ? finite(anchors.anchorY) ? anchors.anchorY : y1 : anchor,
      extentIn: end - start, lines, bands, count: bands.length, fullCount, partialCount: bands.length - fullCount,
      partialWidthsIn: bands.filter(band => !band.full).map(band => band.visibleIn),
      firstBandIn: bands[0].visibleIn, lastBandIn: bands[bands.length - 1].visibleIn,
      firstIndex: bands[0].index, lastIndex: bands[bands.length - 1].index,
      pieceCoverageIn: spec.pieceCoverageIn, coursesPerPiece: spec.coursesPerPiece,
      pieceCount: rawPieces?.length ?? null, pieceFullCount: rawPieces?.filter(band => band.full).length ?? null,
      piecePartialCount: rawPieces?.filter(band => !band.full).length ?? null,
      pieceBands: rawPieces || [], countBasis: vertical ? 'bounding-box-width' : 'bounding-box-height', areaAdjusted: false };
  }

  function isLegacyAutomatic(layout, bounds, feetPerPixel, material = {}) {
    if (!layout || own(layout, 'mode') || !validBounds(bounds) || !positive(feetPerPixel)) return false;
    if (!Array.isArray(layout.vertical) || !Array.isArray(layout.horizontal) || !layout.vertical.length && !layout.horizontal.length) return false;
    const scale = feetPerPixel * 12, width = (bounds[2] - bounds[0]) * scale, height = (bounds[3] - bounds[1]) * scale;
    if (!positive(width) || !positive(height)) return false;
    const expected = (length, maximum) => {
      // Match the historical implementation exactly, including Math.ceil.
      const count = Math.ceil(length / maximum);
      if (count > limits.lines + 1) return null;
      return Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({ id: `auto-${i + 1}`, position: (i + 1) / count }));
    };
    const checks = [
      ['vertical', expected(width, positive(material.maxPiece?.widthIn) ? material.maxPiece.widthIn : 48)],
      ['horizontal', expected(height, positive(material.maxPiece?.lengthIn) ? material.maxPiece.lengthIn : 120)]
    ];
    return checks.every(([axis, old]) => old && layout[axis].length === old.length && layout[axis].every((line, i) =>
      line && line.id === old[i].id && finite(line.position) && near(line.position, old[i].position) && !line.locked && !line.manual));
  }

  return Object.freeze({ version: '1.0.0', limits, formats, coverageSpec, panelGrid, courseLayout, isLegacyAutomatic });
});
