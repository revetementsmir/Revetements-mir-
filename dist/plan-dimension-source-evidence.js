/* Recheck an existing written span against its retained PDF, without changing
 * its inscription, numerical value or anchors to obtain a convenient scale. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRDimensionSourceEvidence = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const point = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  const box = b => Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[2] > b[0] && b[3] > b[1];
  const close = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((n, i) => Number.isFinite(n) && Math.abs(n - b[i]) < 1e-7);
  const rows = view => [...(view.payload?.drawingReadings?.rows || []), ...(view.payload?.drawingReadings?.verticalRows || [])];
  const normalized = text => String(text || '').replace(/(\d)([¼½¾⅛⅜⅝⅞])/g, '$1 $2').normalize('NFKC').replace(/⁄/g, '/').replace(/[″“”]/g, '"').replace(/[′’‘]/g, "'").replace(/[−–—]/g, '-').trim();

  function captionFragment(dimension, labels = []) {
    const b = dimension?.textBox || dimension?.box, text = normalized(dimension?.text);
    // A stand-alone fraction is legitimate. Only an actual enclosing OCR
    // line containing a numeric prefix proves that this token is a suffix.
    // The enclosing line need not parse, have anchors, or have high confidence.
    if (!box(b) || !/^\d+\s*\/\s*\d+\s*(?:"|in|po)$/i.test(text)) return null;
    const compact = s => normalized(s).replace(/\s+/g, ''), token = compact(text), enclosing = [];
    for (const row of labels) {
      if (!box(row?.box) || b[0] < row.box[0] - 1 || b[1] < row.box[1] - 1 || b[2] > row.box[2] + 1 || b[3] > row.box[3] + 1) continue;
      const full = normalized(row.text), value = compact(full);
      if (value === token || !value.endsWith(token) || !/^[\d\s'".,/\-]+(?:in|po)?$/i.test(full)) continue;
      const prefix = value.slice(0, -token.length);
      if (!/\d/.test(prefix) || /"|(?:in|po)$/i.test(prefix)) continue;
      enclosing.push({ text: row.text, box: row.box.slice(), source: row.source || 'ocr', confidence: row.confidence ?? null, ...(row.retry ? { retry: copy(row.retry) } : {}) });
    }
    return enclosing.length ? { status: 'unresolved', reason: 'DIMENSION_CAPTION_FRAGMENT', captionBox: b.slice(), sourceCaptions: enclosing, method: 'fraction-token-in-observed-ocr-line', confirmationRequired: true } : null;
  }

  function sourceReading(view, dimension) {
    const source = dimension?.sourceReading, all = rows(view), exact = (row, part) => box(row?.box) && box(part?.box) && close(row.box, part.box) && row.text === (part.originalText || part.text);
    if (source?.readingParts?.length) return source.readingParts.every(part => all.some(row => exact(row, part))) ? copy(source) : null;
    const text = source?.originalText || dimension?.label || source?.text || dimension?.text;
    const row = all.find(r => r.text === text && close(r.box, dimension?.textBox));
    return row ? copy(row) : null;
  }

  function candidate(view, dimension) {
    const a = dimension?.anchors, b = dimension?.textBox, frame = view?.frame, reading = sourceReading(view, dimension);
    if (!reading || !frame || dimension.sourceViewId !== view.id || !same(dimension.sourceFrame, frame) || a?.length !== 2 || !a.every(point) || !box(b) || !(dimension.value > 0) || dimension.lineEvidence?.status !== 'observed') return null;
    const axis = Math.abs(a[0][1] - a[1][1]) <= 2 ? 0 : Math.abs(a[0][0] - a[1][0]) <= 2 ? 1 : null;
    if (axis === null) return null;
    const w = view.payload?.sourceWidth || frame.rasterSize?.[0], h = view.payload?.sourceHeight || frame.rasterSize?.[1], font = Math.max(8, b[3 - axis] - b[1 - axis]);
    if (!(w > 0 && h > 0) || a.some(p => p[0] < 0 || p[1] < 0 || p[0] >= w || p[1] >= h) || b[0] < 0 || b[1] < 0 || b[2] > w || b[3] > h) return null;
    const left = Math.max(0, Math.floor(Math.min(a[0][0], a[1][0], b[0]) - font * 3)), top = Math.max(0, Math.floor(Math.min(a[0][1], a[1][1], b[1]) - font * 3));
    const right = Math.min(w, Math.ceil(Math.max(a[0][0], a[1][0], b[2]) + font * 3)), bottom = Math.min(h, Math.ceil(Math.max(a[0][1], a[1][1], b[3]) + font * 3));
    const original = copy(dimension); delete original.nativeAssociationEvidence;
    return { ...original, id: view.id + ':native-association:' + a.flat().join('-') + ':' + b.join('-') + ':' + dimension.text + ':' + dimension.value,
      axis: axis === 0 ? 'x' : 'y', status: 'unresolved', sourceReading: reading, sourceCandidate: original, sourceFileId: view.fileId, sourcePage: view.page,
      region: [left, top, right - left, bottom - top], thumbnailLineEvidence: copy(dimension.lineEvidence), verificationPerformed: false,
      confirmationRequired: true, notAMeasurementConfirmation: true };
  }

  function geometryKey(pair) {
    const anchors = pair.anchors?.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return JSON.stringify([pair.sourceViewId, pair.sourceFileId, pair.sourcePage, pair.sourceFrame, anchors, pair.textBox, pair.region]);
  }

  function validPair(view, pair) {
    try {
      const original = pair?.sourceCandidate, expected = original && candidate(view, original);
      return expected && ['text', 'value', 'confidence', 'sourceViewId', 'sourceFileId', 'sourcePage', 'sourceFrame', 'anchors', 'textBox', 'sourceReading', 'region', 'thumbnailLineEvidence'].every(key => same(expected[key], pair[key]));
    } catch (_) { return false; }
  }

  async function verify(native, view, pair, { nativeDimensionTile, mapDimensionProof, dimensionLineEvidence, cached = null } = {}) {
    const base = copy(pair), unavailable = reason => ({ ...base, status: 'unresolved', reason, verificationPerformed: false, associationEligibility: 'unchanged-pending-source-verification' });
    if (!validPair(view, pair)) return unavailable('NATIVE_DIMENSION_ASSOCIATION_SOURCE_MISMATCH');
    const fragment = captionFragment(pair, rows(view));
    if (fragment) return { ...base, status: 'unresolved', reason: fragment.reason, associationEligibility: 'rejected', verificationPerformed: true, lineEvidence: fragment, nativeVerification: { status: 'not-needed', reason: 'ENCLOSING_SOURCE_CAPTION' } };
    if (typeof nativeDimensionTile !== 'function' || typeof mapDimensionProof !== 'function' || typeof dimensionLineEvidence !== 'function') return unavailable('NATIVE_DIMENSION_ASSOCIATION_API_REQUIRED');
    const outcome = (proof, lineEvidence, nativeSource, reused = false) => {
      const observed = proof.status === 'observed';
      return { ...base, status: observed ? 'proposed' : 'conflict', ...(observed ? {} : { reason: 'DIMENSION_NATIVE_ASSOCIATION_CONFLICT' }),
        verificationPerformed: true, associationEligibility: observed ? 'observed' : 'rejected', lineEvidence: copy(lineEvidence), nativeLineEvidence: copy(proof), nativeSource: copy(nativeSource),
        nativeVerification: { status: observed ? 'corroborated' : 'conflict', reason: observed ? null : proof.reason, method: 'retained-pdf-same-caption-and-anchors', sourceAnchorsPreserved: true, writtenValuePreserved: true, confidencePreserved: true, reusedSourceGeometry: reused } };
    };
    if (cached && geometryKey(cached) === geometryKey(pair)) {
      if (nativeRecordValid(view, cached)) {
        const reverse = !close(cached.anchors[0], pair.anchors[0]), ordered = proof => { const p = copy(proof); if (reverse) { p.anchors.reverse(); p.markers?.reverse(); } return p; };
        return outcome(ordered(cached.nativeLineEvidence), ordered(cached.lineEvidence), cached.nativeSource, true);
      }
      if (!cached.verificationPerformed && cached.reason) return unavailable(cached.reason);
    }
    const tile = await nativeDimensionTile(native, view, pair.region, rows(view));
    if (tile.status !== 'proposed') return unavailable(tile.reason || 'SOURCE_PDF_UNAVAILABLE');
    try {
      const { image, map, back, labels } = tile, textBox = [...map(pair.textBox.slice(0, 2)), ...map(pair.textBox.slice(2))], anchors = pair.anchors.map(map);
      const raw = dimensionLineEvidence(image, { ...pair.sourceCandidate, textBox, anchors }, { labels, localPaperContrast: true, rejectIntermediateMarks: true });
      // Early context refusals also retain the exact request that was checked.
      const proof = { ...raw, axis: raw.axis || pair.axis, anchors: raw.anchors || copy(anchors), captionBox: raw.captionBox || textBox.slice() };
      return outcome(proof, mapDimensionProof(proof, back), tile.provenance);
    } finally { tile.release(); }
  }

  function nativeRecordValid(view, record) {
    try {
    const n = record.nativeSource, native = record.nativeLineEvidence, source = record.lineEvidence, region = record.region;
    if (!record.verificationPerformed || !n || !native || !source || n.method !== 'retained-pdf-region' || typeof n.sourceSha256 !== 'string' || !n.sourceSha256 || n.sourceViewId !== view.id || n.sourceFileId !== view.fileId || n.sourcePage !== view.page || !same(n.sourceFrame, view.frame) || !same(n.sourceRegion, region) || n.scaleFactor !== 2 || n.padding !== 12) return false;
    const affine = [2, 0, 0, 2, 12 - region[0] * 2, 12 - region[1] * 2], dimensions = [Math.ceil(region[2] * 2) + 24, Math.ceil(region[3] * 2) + 24];
    if (!same(n.viewToTile, affine) || !same(n.canvasSize, dimensions)) return false;
    const map = p => [p[0] * 2 + affine[4], p[1] * 2 + affine[5]], back = p => [(p[0] - affine[4]) / 2, (p[1] - affine[5]) / 2];
    if (native.axis !== record.axis || source.axis !== record.axis || native.status !== source.status || !['observed', 'unresolved'].includes(native.status) || !same(native.reason, source.reason) || native.anchors?.length !== 2 || source.anchors?.length !== 2 || !native.anchors.every((p, i) => close(p, map(record.anchors[i]))) || !source.anchors.every((p, i) => close(p, record.anchors[i])) || !close(native.captionBox, [...map(record.textBox.slice(0, 2)), ...map(record.textBox.slice(2))]) || !close(source.captionBox, record.textBox)) return false;
    const observed = native.status === 'observed';
    if (record.status !== (observed ? 'proposed' : 'conflict') || record.associationEligibility !== (observed ? 'observed' : 'rejected') || (observed ? record.reason != null : record.reason !== 'DIMENSION_NATIVE_ASSOCIATION_CONFLICT') || record.nativeVerification?.status !== (observed ? 'corroborated' : 'conflict') || record.nativeVerification?.method !== 'retained-pdf-same-caption-and-anchors') return false;
    if (observed && (native.kind !== 'dimension-line-with-end-marks-and-witnesses' || source.kind !== native.kind || !(native.pixelSupport >= .85) || !(native.maxGap <= 4) || native.markers?.length !== 2)) return false;
    const mappedPoints = (nativePoints, sourcePoints) => Array.isArray(nativePoints) && Array.isArray(sourcePoints) && nativePoints.length === sourcePoints.length && nativePoints.every((p, i) => point(p) && close(back(p), sourcePoints[i]));
    const mappedSegments = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((segment, i) => mappedPoints(segment, b[i]));
    if (native.segments && !mappedSegments(native.segments, source.segments) || native.gap && !mappedPoints(native.gap, source.gap) || !same(native.pixelSupport, source.pixelSupport) || Number.isFinite(native.maxGap) && Math.abs(source.maxGap - native.maxGap / 2) > 1e-7) return false;
    if (native.markers) {
      if (source.markers?.length !== native.markers.length) return false;
      for (let i = 0; i < native.markers.length; i++) {
        const m = native.markers[i], s = source.markers[i];
        if (!point(m.point) || !close(m.point, native.anchors[i]) || !close(back(m.point), s.point) || m.kind !== s.kind || !mappedSegments(m.witnesses, s.witnesses)) return false;
        if (m.strokeCenter && (!point(m.strokeCenter) || !close(back(m.strokeCenter), s.strokeCenter) || !(m.anchorTolerancePx > 0 && m.anchorTolerancePx <= 2) || Math.abs(s.anchorTolerancePx - m.anchorTolerancePx / 2) > 1e-7 || Math.hypot(m.strokeCenter[0] - m.point[0], m.strokeCenter[1] - m.point[1]) > m.anchorTolerancePx + 1e-7)) return false;
        if (observed && (!['diagonal-tick', 'compact-diagonal-tick'].includes(m.kind) || !m.strokeCenter || !m.witnesses.length)) return false;
      }
    }
    if (native.interveningLine && !mappedPoints(native.interveningLine.anchors, source.interveningLine?.anchors)) return false;
    if (native.intermediateMarkCheck && (source.intermediateMarkCheck?.markers?.length !== native.intermediateMarkCheck.markers?.length || observed && native.intermediateMarkCheck.markers.length)) return false;
    if (n.sourcePageRegion && !same(n.sourcePageRegion, [region[0] + view.frame.cropToRaster[4], region[1] + view.frame.cropToRaster[5], region[2], region[3]])) return false;
    if (n.pdfToTile) { const translation = [12 - (view.frame.cropToRaster[4] + region[0]) * 2, 12 - (view.frame.cropToRaster[5] + region[1]) * 2], expected = view.frame.pdfToRaster.map((v, i) => v * 2 + (i === 4 ? translation[0] : i === 5 ? translation[1] : 0)); if (!close(n.pdfToTile, expected)) return false; }
    return true;
    } catch (_) { return false; }
  }

  function evidenceFor(view, dimension) {
    for (const record of view.payload?.drawingReadings?.nativeDimensionAssociations || []) {
      if (record.sourceViewId !== view.id || record.sourceFileId !== view.fileId || record.sourcePage !== view.page || !same(record.sourceFrame, view.frame) || record.text !== dimension.text || record.value !== dimension.value || record.confidence !== dimension.confidence || !close(record.textBox, dimension.textBox) || record.anchors?.length !== 2 || !record.anchors.every((p, i) => close(p, dimension.anchors?.[i]))) continue;
      if (!validPair(view, record)) continue;
      if (record.verificationPerformed) {
        if (record.nativeSource) { if (!nativeRecordValid(view, record)) continue; }
        else { const fragment = captionFragment(record, rows(view)); if (!fragment || record.status !== 'unresolved' || record.associationEligibility !== 'rejected' || record.reason !== fragment.reason || !same(record.lineEvidence, fragment) || record.nativeVerification?.status !== 'not-needed' || record.nativeVerification?.reason !== 'ENCLOSING_SOURCE_CAPTION') continue; }
      } else if (record.status !== 'unresolved' || record.associationEligibility !== 'unchanged-pending-source-verification' || typeof record.reason !== 'string' || !record.reason) continue;
      return copy(record);
    }
    return null;
  }

  function apply(view, dimension) {
    const evidence = evidenceFor(view, dimension);
    return evidence ? { ...dimension, nativeAssociationEvidence: evidence, ...(evidence.verificationPerformed ? { lineEvidence: copy(evidence.lineEvidence), ...(evidence.associationEligibility === 'rejected' ? { status: 'unresolved', reason: evidence.reason } : {}) } : {}) } : dimension;
  }

  async function refine(inventory, buildingId, sourceImages, native, { candidates, nativeDimensionTile, mapDimensionProof, dimensionLineEvidence, cancelled = () => false, progress = () => {}, maxRegions = 8 } = {}) {
    if (typeof candidates !== 'function') return [];
    const capacity = Number.isFinite(maxRegions) ? Math.max(0, Math.min(8, Math.floor(maxRegions))) : 8, work = [], evidence = [], cache = new Map();
    for (const entry of candidates(inventory, buildingId, sourceImages)) {
      const view = inventory.views.find(v => v.id === entry.sourceViewId && v.buildingId === buildingId && v.kind === 'floor'), pair = view && candidate(view, entry);
      if (!pair || work.some(item => item.pair.id === pair.id)) continue;
      const previous = evidenceFor(view, entry);
      if (previous?.verificationPerformed) { if (previous.nativeSource) cache.set(geometryKey(previous), previous); continue; }
      work.push({ view, pair });
    }
    // Round-robin source views, retaining source order within a view. Neither
    // a candidate's metric value nor its agreement with an expected scale
    // enters this bounded raster verification queue.
    const queues = [...new Set(work.map(item => item.view.id))].map(id => work.filter(item => item.view.id === id)), ordered = [];
    while (queues.some(queue => queue.length)) for (const queue of queues) if (queue.length) ordered.push(queue.shift());
    let used = 0;
    for (const { view, pair } of ordered) {
      const key = geometryKey(pair), cached = cache.get(key); let observation;
      if (cancelled()) observation = { ...pair, reason: 'NATIVE_DIMENSION_ASSOCIATION_CANCELLED', associationEligibility: 'unchanged-pending-source-verification' };
      else if (!cached && used >= capacity) observation = { ...pair, reason: 'NATIVE_DIMENSION_ASSOCIATION_BUDGET', associationEligibility: 'unchanged-pending-source-verification' };
      else {
        if (!cached) used++;
        observation = await verify(native, view, pair, { nativeDimensionTile, mapDimensionProof, dimensionLineEvidence, cached });
        cache.set(key, observation);
      }
      const stored = view.payload.drawingReadings.nativeDimensionAssociations ||= [], at = stored.findIndex(row => row.id === pair.id);
      if (at < 0) stored.push(observation); else stored[at] = observation;
      evidence.push({ ...copy(observation), source: 'native-dimension-association', purpose: 'source-partial-dimension-association', phaseRegionLimit: 8, box: pair.textBox.slice() });
      progress(used, capacity, view.page);
    }
    return evidence;
  }

  return Object.freeze({ captionFragment, sourceReading, candidate, geometryKey, verify, evidenceFor, apply, refine });
});
