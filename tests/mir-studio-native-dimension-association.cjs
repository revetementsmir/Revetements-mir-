'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const A = require('../dist/plan-import-core.js'), D = require('../dist/plan-dimension-source-evidence.js'), R = require('../dist/plan-reconstruction.js'), P = require('../dist/plan-reconstruction-pipeline.js');
const copy = value => JSON.parse(JSON.stringify(value));
const context = { URL, document: { currentScript: { src: 'http://localhost/plan-reconstruction-readings.js' } }, MIRPDFAnalysis: A, MIRDimensionSourceEvidence: D };
context.window = context; vm.createContext(context); vm.runInContext(fs.readFileSync(require.resolve('../dist/plan-reconstruction-readings.js'), 'utf8'), context);
const Q = context.MIRReconstructionReadings, api = { nativeDimensionTile: Q.nativeDimensionTile, mapDimensionProof: Q.mapDimensionProof, dimensionLineEvidence: A.dimensionLineEvidence };

function image(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4).fill(255) }; }
function line(im, a, b, width = 1) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
  for (let k = 0; k <= n; k++) {
    const x = Math.round(a[0] + (b[0] - a[0]) * k / (n || 1)), y = Math.round(a[1] + (b[1] - a[1]) * k / (n || 1));
    for (let dx = 0; dx < width; dx++) for (let dy = 0; dy < width; dy++) if (x + dx >= 0 && y + dy >= 0 && x + dx < im.width && y + dy < im.height) im.data.set([20, 20, 20, 255], ((y + dy) * im.width + x + dx) * 4);
  }
}
function downsample(native) {
  const out = image(native.width / 2, native.height / 2);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    let sum = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) sum += native.data[((y * 2 + dy) * native.width + x * 2 + dx) * 4];
    const value = sum / 4; out.data.set([value, value, value, 255], (y * out.width + x) * 4);
  }
  return out;
}
function transpose(im) {
  const out = image(im.height, im.width);
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) out.data.set(im.data.subarray((y * im.width + x) * 4, (y * im.width + x) * 4 + 4), (x * out.width + y) * 4);
  return out;
}
function scene({ falseWall = false, vertical = false, id = 'synthetic-span', second = false } = {}) {
  let native = image(800, 480);
  if (falseWall) {
    // Two ordinary U-shaped structural contours, with no diagonal marks.
    // Their genuine 2x reduction aliases the corners into apparent ticks.
    for (const inset of [0, 5]) {
      const [x0, y0, x1, y1] = [80 + inset, 120 + inset, 280 - inset, 190 - inset].map(n => n * 2);
      line(native, [x0, y0], [x1, y0], 3); line(native, [x0, y0], [x0, y1], 3); line(native, [x1, y0], [x1, y1], 3);
    }
  } else for (const y of second ? [121, 181] : [121]) {
    line(native, [168, y * 2], [552, y * 2], 2);
    for (const x of [168, 552]) { line(native, [x, y * 2 - 40], [x, y * 2 + 40], 2); line(native, [x - 8, y * 2 - 8], [x + 8, y * 2 + 8], 2); }
  }
  const sourceRows = [{ text: '18 ft', box: [166, 101, 194, 109], confidence: 92, source: 'ocr' }, ...(second ? [{ text: '23 ft', box: [166, 161, 194, 169], confidence: 94, source: 'ocr' }] : [])];
  if (vertical) { native = transpose(native); for (const row of sourceRows) row.box = [row.box[1], row.box[0], row.box[3], row.box[2]]; }
  const low = downsample(native), view = { id, fileId: 'synthetic-document', page: 3, orientation: 0, kind: 'floor', buildingId: 'house', frame: { units: 'pixels', rasterSize: [low.width, low.height], pdfToRaster: [1, 0, 0, -1, 0, low.height], cropToRaster: [1, 0, 0, 1, 0, 0] }, payload: { sourceWidth: low.width, sourceHeight: low.height, drawingReadings: { rows: vertical ? [] : sourceRows, verticalRows: vertical ? sourceRows : [] } } };
  const dimensions = sourceRows.map((row, i) => {
    const feet = i ? 23 : 18, points = [[84, i ? 181 : 121], [276, i ? 181 : 121]], anchors = vertical ? points.map(p => [p[1], p[0]]) : points;
    const d = { text: row.text, label: row.text, value: feet * .3048, referenceFt: feet, scale: feet * .3048 / 192, feetPerPixel: feet / 192, spanPx: 192, confidence: row.confidence, source: 'ocr', sourceReading: copy(row), textBox: row.box.slice(), anchors, axis: vertical ? 'y' : 'x', kind: 'written', status: 'proposed', sourceViewId: view.id, sourceFrame: copy(view.frame), confirmationRequired: true };
    d.lineEvidence = A.dimensionLineEvidence(low, d, { labels: sourceRows }); return d;
  });
  return { view, native, low, dimensions };
}
function nativeReader(scenes, { unavailable = false, foreignFrame = false, throws = false } = {}) {
  const calls = [], canvases = [];
  return { calls, canvases, async render(view, region, options) {
    calls.push(copy({ sourceViewId: view.id, region, options }));
    if (unavailable) return { status: 'unresolved', reason: 'SOURCE_PDF_UNAVAILABLE' };
    const source = scenes.find(s => s.view.id === view.id).native, plan = Q.sourceTilePlan(view, region, options), tile = image(plan.width, plan.height);
    for (let y = 0; y < tile.height; y++) for (let x = 0; x < tile.width; x++) {
      const sx = region[0] * 2 + x - 12, sy = region[1] * 2 + y - 12;
      if (sx >= 0 && sy >= 0 && sx < source.width && sy < source.height) tile.data.set(source.data.subarray((sy * source.width + sx) * 4, (sy * source.width + sx) * 4 + 4), (y * tile.width + x) * 4);
    }
    const canvas = { width: tile.width, height: tile.height, getContext: () => ({ getImageData: () => { if (throws) throw Error('synthetic raster failure'); return tile; } }) }; canvases.push(canvas);
    return { status: 'proposed', canvas, provenance: { method: 'retained-pdf-region', sourceViewId: view.id, sourceFileId: view.fileId, sourcePage: view.page, sourceSha256: 'synthetic-drawing-hash', sourceFrame: foreignFrame ? { ...view.frame, units: 'foreign' } : copy(view.frame), sourceRegion: copy(region), scaleFactor: 2, padding: 12, viewToTile: Array.from(plan.viewToTile), canvasSize: [plan.width, plan.height] } };
  } };
}
const candidatesFor = list => () => list;
const remember = (view, record) => { (view.payload.drawingReadings.nativeDimensionAssociations ||= []).push(record); };

(async () => {
  for (const vertical of [false, true]) {
    const s = scene({ falseWall: true, vertical }), d = s.dimensions[0], before = JSON.stringify([s.view, d]), pair = D.candidate(s.view, d), reader = nativeReader([s]);
    assert.equal(d.lineEvidence.status, 'observed', 'real downsampling creates a false positive in the existing detector');
    const result = await D.verify(reader, s.view, pair, api);
    assert.equal(result.status, 'conflict'); assert.equal(result.reason, 'DIMENSION_NATIVE_ASSOCIATION_CONFLICT');
    assert.equal(result.lineEvidence.reason, 'DIMENSION_END_MARKS_REQUIRED'); assert.equal(result.associationEligibility, 'rejected');
    for (const key of ['text', 'value', 'confidence', 'anchors', 'textBox', 'sourceViewId', 'sourceFrame']) assert.deepEqual(result[key], pair[key], key + ' stays the original observation');
    assert.deepEqual(result.lineEvidence.anchors, d.anchors); assert.equal(result.thumbnailLineEvidence.status, 'observed'); assert.equal(result.nativeLineEvidence.status, 'unresolved');
    assert.equal(result.nativeSource.scaleFactor, 2); assert.ok(reader.canvases.every(c => c.width === 1 && c.height === 1)); assert.equal(JSON.stringify([s.view, d]), before);
    remember(s.view, result); const attached = D.apply(s.view, d);
    const partial = R.partialScaleReferences(s.view, [attached], [0, 0, s.low.width, s.low.height], { image: s.low });
    assert.equal(partial.references.length, 0); assert.equal(partial.unresolvedReferences[0].lineEvidence.reason, 'DIMENSION_END_MARKS_REQUIRED', 'an observed thumbnail cannot override an available native refusal');
    if (!vertical) {
      const draft = { sourceViewId: s.view.id, reference: { value: d.value, anchors: copy(d.anchors), kind: 'written' }, points: [[84, 121], [276, 121], [276, 190], [84, 190]].map((xy, i) => ({ id: 'corner-' + i, xy })), alignment: { origin: [84, 190], offset: [0, 0], rotationDegrees: 0 } };
      const adjusted = R.constrainContour(draft, [attached]);
      assert.deepEqual(adjusted.points, draft.points); assert.equal(adjusted.dimensionAdjustment.evidence[0].reason, 'DIMENSION_SOURCE_ASSOCIATION_UNRESOLVED', 'even a numerically convenient source association stays refused');
    }
  }

  const good = scene({ second: true }), native = nativeReader([good]), inventory = { views: [good.view] }, values = copy(good.dimensions);
  const verified = await D.refine(inventory, 'house', { [good.view.id]: good.low }, native, { ...api, candidates: candidatesFor(good.dimensions) });
  assert.equal(native.calls.length, 2); assert.ok(verified.every(r => r.status === 'proposed' && r.associationEligibility === 'observed'));
  assert.deepEqual(verified.map(r => r.value), values.map(r => r.value)); assert.ok(verified.every(r => r.lineEvidence.markers.every(m => m.anchorTolerancePx === 1)));
  const accepted = R.partialScaleReferences(good.view, good.dimensions.map(d => D.apply(good.view, d)), [0, 0, 400, 240], { image: good.low });
  assert.equal(accepted.references.length, 2); assert.equal(accepted.conflict, true); assert.equal(P.resolveReference(accepted.references).status, 'conflict', 'real marked spans with contradictory values remain contradictory');
  for (const mutate of [
    record => { delete record.nativeSource; },
    record => { delete record.nativeLineEvidence; },
    record => { record.status = 'conflict'; record.associationEligibility = 'rejected'; record.reason = 'DIMENSION_NATIVE_ASSOCIATION_CONFLICT'; },
    record => { record.nativeSource.viewToTile[4] += 1; },
    record => { record.nativeSource.sourceFrame.cropToRaster[4] += 1; },
    record => { record.nativeLineEvidence.anchors[0][0] += 1; },
    record => { record.lineEvidence.anchors[0][0] += 1; },
    record => { record.nativeLineEvidence.markers[0].point[0] += 1; },
    record => { record.sourceCandidate.value += 1; }
  ]) {
    const source = copy(good.view), record = copy(verified[0]); mutate(record); source.payload.drawingReadings.nativeDimensionAssociations = [record];
    assert.equal(D.evidenceFor(source, good.dimensions[0]), null, 'incomplete, contradictory or geometrically changed evidence cannot replace the actual source association');
    assert.equal(P.resolveReference(good.dimensions.map(d => D.apply(source, d))).status, 'conflict', 'a malformed refusal cannot erase a genuine contradiction');
  }
  await D.refine(inventory, 'house', { [good.view.id]: good.low }, native, { ...api, candidates: candidatesFor(good.dimensions) });
  assert.equal(native.calls.length, 2, 'the same source associations are not rendered again');

  const alternatives = scene(), other = copy(alternatives.dimensions[0]); other.text = other.label = '22 ft'; other.value = 22 * .3048; other.referenceFt = 22; other.scale = other.value / 192; other.confidence = 90; other.sourceReading = { ...other.sourceReading, text: other.text, confidence: 90 };
  alternatives.view.payload.drawingReadings.rows.push(copy(other.sourceReading)); const reused = nativeReader([alternatives]);
  const readings = await D.refine({ views: [alternatives.view] }, 'house', {}, reused, { ...api, candidates: candidatesFor([alternatives.dimensions[0], other]) });
  assert.equal(reused.calls.length, 1, 'one source/anchor/crop raster suffices for alternative transcriptions'); assert.equal(readings.length, 2);
  assert.deepEqual(readings.map(r => r.value), [18 * .3048, 22 * .3048]); assert.equal(readings[1].nativeVerification.reusedSourceGeometry, true);
  assert.equal(P.resolveReference(readings).status, 'conflict', 'reusing geometric proof cannot merge contradictory inscriptions');

  const suffix = { text: '1/2"', box: [178, 101, 194, 109], confidence: 96, source: 'ocr' }, enclosing = { text: '6-7 1/2"', box: [155, 101, 194, 109], confidence: 38, source: 'ocr' };
  const fraction = { ...copy(good.dimensions[0]), text: suffix.text, label: suffix.text, textBox: suffix.box.slice(), sourceReading: copy(suffix), value: .0127, referenceFt: 1 / 24, confidence: 96 };
  assert.equal(A.parseDimension(enclosing.text), null, 'the invented enclosing caption is unparsed and has no anchors');
  const refused = A.dimensionLineEvidence(good.low, fraction, { labels: [suffix, enclosing] });
  assert.equal(refused.reason, 'DIMENSION_CAPTION_FRAGMENT'); assert.equal(refused.sourceCaptions[0].text, enclosing.text); assert.equal(refused.sourceCaptions[0].confidence, 38);
  assert.equal(D.captionFragment(fraction, [suffix, { ...enclosing, box: [210, 101, 249, 109] }]), null, 'a separate neighbouring caption is not an enclosing source line');
  assert.equal(D.captionFragment(fraction, [suffix]), null, 'a legitimate stand-alone fraction stays available');
  assert.equal(A.dimensionLineEvidence(good.low, fraction, { labels: [suffix] }).status, 'observed');
  assert.equal(A.matchDimensionLines(good.low, [suffix, enclosing], { minSpanPx: 20, shortTicks: true, allowTextGap: true, preferReliableReadings: true }).some(d => d.text === suffix.text), false);
  const fragmentView = copy(good.view); fragmentView.payload.drawingReadings = { rows: [suffix, enclosing] };
  fraction.lineEvidence = A.dimensionLineEvidence(good.low, fraction, { labels: [suffix] });
  const fragmentReader = nativeReader([good]), fragmentRecord = await D.verify(fragmentReader, fragmentView, D.candidate(fragmentView, fraction), api);
  assert.equal(fragmentReader.calls.length, 0); assert.equal(fragmentRecord.reason, 'DIMENSION_CAPTION_FRAGMENT'); remember(fragmentView, fragmentRecord);
  assert.equal(D.evidenceFor(fragmentView, fraction).associationEligibility, 'rejected', 'the sole non-native refusal is re-proved from its actual enclosing OCR row');
  fragmentView.payload.drawingReadings.rows = [suffix];
  assert.equal(D.evidenceFor(fragmentView, fraction), null, 'a stale enclosing caption cannot be kept as source evidence');

  for (const change of [{ value: 99 }, { confidence: 99 }, { text: '99 ft' }, { sourceViewId: 'foreign' }, { anchors: [[80, 121], [276, 121]] }]) {
    const s = scene(), reader = nativeReader([s]), pair = { ...D.candidate(s.view, s.dimensions[0]), ...change };
    assert.equal((await D.verify(reader, s.view, pair, api)).reason, 'NATIVE_DIMENSION_ASSOCIATION_SOURCE_MISMATCH'); assert.equal(reader.calls.length, 0);
  }
  const frameScene = scene(), foreign = nativeReader([frameScene], { foreignFrame: true });
  assert.equal((await D.verify(foreign, frameScene.view, D.candidate(frameScene.view, frameScene.dimensions[0]), api)).reason, 'NATIVE_DIMENSION_FRAME_MISMATCH'); assert.equal(foreign.canvases[0].width, 1);
  const broken = nativeReader([frameScene], { throws: true });
  await assert.rejects(D.verify(broken, frameScene.view, D.candidate(frameScene.view, frameScene.dimensions[0]), api), /synthetic raster failure/); assert.equal(broken.canvases[0].width, 1);

  const pending = scene({ second: true }), pendingNative = nativeReader([pending]), pendingInventory = { views: [pending.view] };
  const limited = await D.refine(pendingInventory, 'house', {}, pendingNative, { ...api, maxRegions: 0, candidates: candidatesFor(pending.dimensions) });
  assert.equal(pendingNative.calls.length, 0); assert.ok(limited.every(r => r.reason === 'NATIVE_DIMENSION_ASSOCIATION_BUDGET' && !r.verificationPerformed));
  const pendingScale = R.partialScaleReferences(pending.view, pending.dimensions.map(d => D.apply(pending.view, d)), [0, 0, 400, 240], { image: pending.low });
  assert.equal(pendingScale.references.length, 2); assert.equal(P.resolveReference(pendingScale.references).status, 'conflict'); assert.equal(pendingScale.unresolvedReferences.filter(r => r.reason === 'NATIVE_DIMENSION_ASSOCIATION_BUDGET').length, 2);
  const absent = scene(), unavailable = nativeReader([absent], { unavailable: true });
  const unavailableResult = await D.refine({ views: [absent.view] }, 'house', {}, unavailable, { ...api, candidates: candidatesFor(absent.dimensions) });
  assert.equal(unavailableResult[0].reason, 'SOURCE_PDF_UNAVAILABLE'); assert.equal(unavailableResult[0].verificationPerformed, false);
  const recovered = nativeReader([absent]);
  const recovery = await D.refine({ views: [absent.view] }, 'house', {}, recovered, { ...api, candidates: candidatesFor(absent.dimensions) });
  assert.equal(recovered.calls.length, 1); assert.equal(recovery[0].status, 'proposed', 'a retained PDF becoming available rechecks an earlier unavailable observation');
  for (const key of ['text', 'value', 'confidence', 'anchors', 'textBox', 'sourceViewId', 'sourceFrame']) assert.deepEqual(recovery[0][key], unavailableResult[0][key], 'resuming keeps ' + key);
  const unavailableAlternatives = copy(alternatives.view); delete unavailableAlternatives.payload.drawingReadings.nativeDimensionAssociations;
  const unavailableOnce = nativeReader([alternatives], { unavailable: true });
  const failedReadings = await D.refine({ views: [unavailableAlternatives] }, 'house', {}, unavailableOnce, { ...api, candidates: candidatesFor([alternatives.dimensions[0], other]) });
  assert.equal(unavailableOnce.calls.length, 1, 'an unavailable region is not attempted twice within the same phase'); assert.equal(failedReadings.length, 2); assert.ok(failedReadings.every(r => r.reason === 'SOURCE_PDF_UNAVAILABLE'));

  const many = Array.from({ length: 10 }, (_, i) => scene({ id: 'synthetic-floor-' + i })), foreignBuilding = scene({ id: 'foreign-building' }); foreignBuilding.view.buildingId = 'shed';
  context.MIRPlanReconstruction = { partialDimensionCandidates: candidatesFor([...many.flatMap(s => s.dimensions), ...foreignBuilding.dimensions]) };
  const boundedReader = nativeReader([...many, foreignBuilding]), oldDimensionBudget = { remaining: 0 };
  const bounded = await Q.refineDimensionAssociations({ views: [...many.map(s => s.view), foreignBuilding.view] }, 'house', {}, boundedReader, { maxRegions: 100, budget: oldDimensionBudget });
  assert.equal(boundedReader.calls.length, 8); assert.equal(bounded.length, 10); assert.equal(bounded.filter(r => r.reason === 'NATIVE_DIMENSION_ASSOCIATION_BUDGET').length, 2);
  assert.equal(oldDimensionBudget.remaining, 0, 'the original 12-region horizontal/vertical budget is not borrowed'); assert.equal(foreignBuilding.view.payload.drawingReadings.nativeDimensionAssociations, undefined);
  assert.ok(boundedReader.calls.every(c => c.options.factor === 2 && c.options.padding === 12)); assert.ok(bounded.every(r => sameBox(r.box, r.textBox) && r.phaseRegionLimit === 8));
  const cancelScene = scene(), cancelReader = nativeReader([cancelScene]);
  const cancelled = await D.refine({ views: [cancelScene.view] }, 'house', {}, cancelReader, { ...api, candidates: candidatesFor(cancelScene.dimensions), cancelled: () => true });
  assert.equal(cancelReader.calls.length, 0); assert.equal(cancelled[0].reason, 'NATIVE_DIMENSION_ASSOCIATION_CANCELLED');
  console.log('PASS native dimension association: real raster aliasing in both axes, exact-source native refusal, no thumbnail fallback, true contradictory values retained, enclosing OCR fraction guard, source/geometry cache, separate eight-region budget, cancellation, source isolation and tile cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
function sameBox(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
