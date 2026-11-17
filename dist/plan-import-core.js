/* MIR: dimension marks are matched to measured extension-line intersections.
 * No drawing scale or building dimension is assumed when evidence is absent. */
(function (root, factory) {
  const api = factory(() => typeof module === 'object' && module.exports ? require('./plan-dimension-source-evidence.js') : root.MIRDimensionSourceEvidence);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRPDFAnalysis = api;
})(typeof window === 'object' ? window : globalThis, function (dimensionSourceEvidence) {
  'use strict';
  const finite = Number.isFinite;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const median = values => { const a = values.filter(finite).sort((a, b) => a - b); return a.length ? a[Math.floor(a.length / 2)] : null; };
  const area = p => p.reduce((a, v, i) => { const q = p[(i + 1) % p.length]; return a + v[0] * q[1] - q[0] * v[1]; }, 0) / 2;
  const bbox = p => [Math.min(...p.map(p => p[0])), Math.min(...p.map(p => p[1])), Math.max(...p.map(p => p[0])), Math.max(...p.map(p => p[1]))];
  function fraction(s) {
    const m = String(s || '').trim().match(/^(?:(\d+)\s*[- ]\s*)?(\d+)\s*\/\s*(\d+)$/);
    if (m) return +m[1] + +m[2] / +m[3] || +m[2] / +m[3];
    const n = Number(String(s).replace(',', '.')); return finite(n) ? n : null;
  }
  function parseDimension(input, options = {}) {
    const original = String(input || '').trim();
    if (!original || original.length > 60 || /(?:pi\s*[²2]|ft\s*[²2]|m\s*[²2]|surface|aire|%|échelle|scale|\d{4}[-/]\d{2}[-/])/i.test(original)) return null;
    let text = original.replace(/(\d)([¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, '$1 $2').replace(/[″“”]/g, '"').normalize('NFKC').replace(/[′’‘`]/g, "'").replace(/[–—]/g, '-').replace(/⁄/g, '/').replace(/\s+/g, ' ').trim();
    // OCR substitutions are permitted only inside an otherwise explicit dimension.
    const explicit = /['"]|\b(?:pi|pieds?|ft|feet|po|in|mm|cm|m)\b/i.test(text);
    let corrected = false;
    if (options.ocr && explicit) {
      const clean = text.replace(/[oOØø]/g, '0').replace(/(?<=\d)D(?=['"-])/g, '0').replace(/^[|Il](?=\d)/, '1').replace(/^(\d+'\s*-?\s*\d+(?:\s*[- ]\s*\d+\/\d+)?)'$/, '$1"');
      corrected = clean !== text; text = clean;
    }
    if (/[x×]/i.test(text) || /\([^)]*\)/.test(text)) return null; // Opening sizes are not dimension-line lengths.
    let m = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:'|pi\b|pieds?\b|ft\b|feet\b)\s*(?:[- ]\s*)?(?:(\d+(?:[.,]\d+)?(?:\s*[- ]\s*\d+\s*\/\s*\d+)?|\d+\s*\/\s*\d+)\s*(?:"|po\b|in\b)?)?\s*$/i);
    if (m) {
      const feet = Number(m[1].replace(',', '.')), inches = m[2] ? fraction(m[2]) : 0;
      if (!finite(inches) || inches >= 12 || inches < 0) return null;
      const valueFt = feet + inches / 12;
      return valueFt > 0 && valueFt <= 2000 ? { valueFt, text: original, normalized: text, units: 'ft-in', corrected } : null;
    }
    m = text.match(/^(\d+(?:[.,]\d+)?(?:\s*[- ]\s*\d+\s*\/\s*\d+)?|\d+\s*\/\s*\d+)\s*(?:"|po\b|in\b)$/i);
    if (m) { const inches = fraction(m[1]); return inches > 0 && inches <= 24000 ? { valueFt: inches / 12, text: original, normalized: text, units: 'in', corrected } : null; }
    m = text.match(/^(\d+(?:[.,]\d+)?)\s*(mm|cm|m)\s*$/i);
    if (m) { const valueFt = +m[1].replace(',', '.') * ({ mm: 1 / 304.8, cm: 1 / 30.48, m: 1 / .3048 })[m[2].toLowerCase()]; return valueFt > 0 && valueFt <= 2000 ? { valueFt, text: original, normalized: text, units: m[2], corrected } : null; }
    // Bare metric numbers are accepted only when the page itself explicitly says mm.
    if (options.bareMetricMm && /^\d{3,6}$/.test(text)) return { valueFt: +text / 304.8, text: original, normalized: text, units: 'mm', corrected, pageUnitRequired: true };
    return null;
  }
  function wordsToLabels(words, options = {}) {
    const clean = words.filter(w => w && typeof w.text === 'string' && Array.isArray(w.box) && w.box.every(finite) && w.box[2] > w.box[0] && w.box[3] > w.box[1]);
    const labels = [...clean];
    // Merge adjacent words, because 22' - 0" may be split into three OCR tokens.
    for (const w of clean) {
      const h = w.box[3] - w.box[1], cy = (w.box[1] + w.box[3]) / 2;
      const line = clean.filter(q => q !== w && q.box[0] >= w.box[2] - 2 && q.box[0] - w.box[2] < h * 4 && Math.abs((q.box[1] + q.box[3]) / 2 - cy) < h * .7).sort((a, b) => a.box[0] - b.box[0]);
      let text = w.text, end = w.box[2], box = w.box.slice(), conf = w.confidence; const parts = [w];
      for (const q of line.slice(0, 3)) {
        if (q.box[0] - end > h * 1.9) break;
        text += ' ' + q.text; end = q.box[2]; box = [box[0], Math.min(box[1], q.box[1]), end, Math.max(box[3], q.box[3])]; conf = Math.min(conf ?? 80, q.confidence ?? 80);
        parts.push(q);
        labels.push({ text, box: box.slice(), confidence: conf, source: w.source || 'ocr', joined: true, ...(options.includeProvenance ? { readingParts: JSON.parse(JSON.stringify(parts)) } : {}) });
      }
    }
    return labels;
  }
  function inkMask(image, { threshold = 185, saturation = 75 } = {}) {
    const { width: w, height: h, data } = image, mask = new Uint8Array(w * h), channels = data.length === w * h ? 1 : 4;
    for (let i = 0; i < mask.length; i++) {
      if (channels === 1) mask[i] = data[i] < 145 ? 1 : 0;
      else { const p = i * 4, max = Math.max(data[p], data[p + 1], data[p + 2]), min = Math.min(data[p], data[p + 1], data[p + 2]); mask[i] = data[p + 3] > 160 && max < threshold && max - min < saturation ? 1 : 0; }
    }
    return { data: mask, width: w, height: h };
  }
  function paperLineContrast(image, x, y, axis = 0) {
    // Downsampled CAD hairlines can be almost white. This is a local,
    // two-sided paper contrast observation, not a new global ink threshold.
    // Broad grey fills, coloured markup and uniform paper have no such pair
    // of opposing brighter margins. Strong marks keep their old thresholds.
    x = Math.round(x); y = Math.round(y);
    if (image.data.length !== image.width * image.height * 4 || x < 5 || y < 5 || x >= image.width - 5 || y >= image.height - 5) return null;
    const pixel = (xx, yy) => {
      const i = (yy * image.width + xx) * 4, r = image.data[i], g = image.data[i + 1], b = image.data[i + 2];
      return image.data[i + 3] > 160 && Math.max(r, g, b) - Math.min(r, g, b) <= 12 ? (r + g + b) / 3 : null;
    };
    const value = pixel(x, y); if (value === null || value < 235 || value > 249) return null;
    const sides = [-1, 1].map(sign => [2, 3, 4].map(offset => pixel(x + (axis ? sign * offset : 0), y + (axis ? 0 : sign * offset))));
    if (sides.flat().some(v => v === null)) return null;
    // A nearby digit or JPEG ringing may contaminate one paper sample.
    // Require a majority of bright paper on EACH side, without changing the
    // contrast floor, stroke range, continuity or mark/witness requirements.
    const paper = sides.map(values => values.slice().sort((a, b) => a - b)[1]);
    if (paper.some(v => v < 248 || v - value < 6) || Math.abs(paper[0] - paper[1]) > 4) return null;
    // The nearest opposite margins must still be brighter than the stroke;
    // a median must not convert a five-pixel grey band into a thin hairline.
    if (sides.some(values => values[0] <= value)) return null;
    return { point: [x, y], value, paper, contrast: Math.min(...paper) - value, marginSamples: sides, marginOffsets: [2, 3, 4], paperStatistic: 'median-per-side' };
  }
  function paperLineMask(image, base) {
    const data = base.data.slice(), w = image.width, h = image.height;
    for (let y = 5; y < h - 5; y++) for (let x = 5; x < w - 5; x++) {
      const i = y * w + x;
      if (!data[i] && paperLineContrast(image, x, y)) data[i] = 1;
    }
    return { data, width: w, height: h };
  }
  function lineRun(mask, y, center, gap = 4, minimum = 50) {
    const { width: w, height: h, data } = mask;
    const black = x => { if (x < 0 || x >= w) return 0; for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) if (data[yy * w + x]) return 1; return 0; };
    if (!black(center)) return null;
    let left = center, right = center, misses = 0, count = 0;
    for (let x = center; x >= 0; x--) { if (black(x)) { left = x; misses = 0; count++; } else if (++misses > gap) break; }
    misses = 0;
    for (let x = center + 1; x < w; x++) { if (black(x)) { right = x; misses = 0; count++; } else if (++misses > gap) break; }
    const length = right - left;
    return length >= minimum && count / (length + 1) > .78 ? { left, right, y, density: count / (length + 1) } : null;
  }
  function intersections(mask, run, fontHeight, shortTicks = false) {
    const { width: w, height: h, data } = mask, reach = clamp(Math.round(fontHeight * .85), 10, 35), ys = run.y;
    const hits = [];
    for (let x = Math.max(2, run.left); x <= Math.min(w - 3, run.right); x++) {
      let above = 0, below = 0, continuous = 0, longest = 0;
      for (let dy = -reach; dy <= reach; dy++) {
        const y = ys + dy; if (y < 0 || y >= h) continue;
        const p = y * w + x, ink = data[p - 1] || data[p] || data[p + 1];
        if (ink) { continuous++; longest = Math.max(longest, continuous); if (dy < -3) above++; if (dy > 3) below++; } else continuous = 0;
      }
      let slash = false, markerStrength = 0;
      if (shortTicks && (above >= 4 || below >= 4)) for (const direction of [-1, 1]) {
        let upper = 0, lower = 0;
        for (let d = 1; d <= 4; d++) for (const sign of [-1, 1]) {
          const px = x + direction * sign * d, py = ys + sign * d;
          if (px > 0 && px < w - 1 && py >= 0 && py < h && (data[py*w+px-1] || data[py*w+px] || data[py*w+px+1])) { if (sign < 0) upper++; else lower++; }
        }
        if (upper >= 3 && lower >= 3) slash = true;
        // A nearby appliance/wall can have a stronger vertical intersection
        // than the dimension's short diagonal tick. Compare the tick's two
        // off-axis arms, excluding ink explained by a through-going vertical.
        // A thick orthogonal crossing alone must not acquire that priority.
        let upperDirect = 0, lowerDirect = 0, upperFree = 0, lowerFree = 0;
        for (let d = 2; d <= 6; d++) for (const sign of [-1, 1]) {
          const px = x + direction * sign * d, py = ys + sign * d;
          if (px < 0 || px >= w || py < 0 || py >= h || !data[py*w+px]) continue;
          const through = ys-reach >= 0 && ys+reach < h && data[(ys-reach)*w+px] && data[(ys+reach)*w+px];
          if (sign < 0) { upperDirect++; upperFree += Number(!through); }
          else { lowerDirect++; lowerFree += Number(!through); }
        }
        if (Math.min(upperDirect, lowerDirect) >= 2 && Math.min(upperFree, lowerFree) >= 1)
          markerStrength = Math.max(markerStrength, Math.min(upperDirect, lowerDirect)*10 + upperDirect + lowerDirect + Math.min(upperFree, lowerFree));
      }
      if (above >= reach * .45 && below >= reach * .23 && longest >= reach * 1.1 || slash) hits.push({ x, strength: above + below + longest, slash, markerStrength });
    }
    const clustered = [];
    for (const hit of hits) { const last = clustered[clustered.length - 1]; if (last && hit.x - last.right <= 5) { last.right = hit.x; last.slash ||= hit.slash; if (hit.markerStrength > last.markerStrength || hit.markerStrength === last.markerStrength && hit.strength > last.strength) { last.x = hit.x; last.strength = hit.strength; last.markerStrength = hit.markerStrength; } } else clustered.push({ ...hit, right: hit.x }); }
    return clustered;
  }
  function interruptedDimensionLine(mask, label, options) {
    const [x0, y0, x1, y1] = label.box, fh = Math.max(8, y1 - y0), cx = (x0 + x1) / 2;
    const { width: w, height: h, data } = mask, candidates = [], margin = Math.ceil(fh * 1.5);
    const ink = (x, y) => x >= 0 && x < w && y >= 0 && y < h && data[y * w + x];
    // A diagonal slash alone can be a glyph or an object corner. Its witness
    // must continue beyond the slash on at least one side of the line.
    const witnesses = (x, y) => {
      const reach = Math.ceil(fh * 3), radius = Math.max(4, Math.min(6, Math.round(fh * .4))), result = [];
      for (const direction of [-1, 1]) {
        let last = radius, misses = 0;
        for (let d = radius + 1; d <= reach; d++) {
          if (ink(x - 1, y + direction * d) || ink(x, y + direction * d) || ink(x + 1, y + direction * d)) { last = d; misses = 0; }
          else if (++misses > 1) break;
        }
        if (last - radius >= Math.max(6, Math.ceil(fh * .6))) result.push([[x, y], [x, y + direction * last]]);
      }
      return result;
    };
    for (let y = Math.max(2, Math.ceil(y0)); y <= Math.min(h - 3, Math.floor(y1)); y++) {
      let leftSeed = null, rightSeed = null;
      for (let d = 1; d <= margin && (leftSeed === null || rightSeed === null); d++) {
        if (leftSeed === null && ink(Math.floor(x0) - d, y)) leftSeed = Math.floor(x0) - d;
        if (rightSeed === null && ink(Math.ceil(x1) + d, y)) rightSeed = Math.ceil(x1) + d;
      }
      if (leftSeed === null || rightSeed === null) continue;
      const left = lineRun(mask, y, leftSeed, 2, Math.max(12, fh)), right = lineRun(mask, y, rightSeed, 2, Math.max(12, fh));
      if (!left || !right || left.right >= x0 || right.left <= x1 || left.right >= right.left) continue;
      const gap = right.left - left.right;
      if (gap > x1 - x0 + fh * 3 || x0 - left.right > margin || right.left - x1 > margin) continue;
      const support = run => { let count = 0; for (let x = run.left; x <= run.right; x++) count += ink(x, y) ? 1 : 0; return count / (run.right - run.left + 1); };
      const density = [support(left), support(right)];
      // Both arms must occupy this same source row. The neighbouring-row
      // tolerance in lineRun must not join two offset object edges.
      if (density.some(n => n < .85)) continue;
      const markers = run => intersections(mask, run, fh, true).filter(t => t.slash && t.markerStrength > 0).map(t => ({ ...t, witnesses: witnesses(t.x, y) }));
      const leftMarks = markers(left), rightMarks = markers(right);
      // Do not jump over a second tick to obtain a better-looking span.
      if (leftMarks.length !== 1 || rightMarks.length !== 1 || !leftMarks[0].witnesses.length || !rightMarks[0].witnesses.length) continue;
      const a = leftMarks[0].x, b = rightMarks[0].x, span = b - a;
      if (a >= left.right - fh || b <= right.left + fh || span < Math.max(options.minSpanPx ?? 55, (x1 - x0) * 1.3) || gap > span * .4) continue;
      const centered = Math.abs((a + b) / 2 - cx) / span;
      if (centered > .15) continue;
      candidates.push({ anchors: [[a, y], [b, y]], spanPx: span, score: .5 * (1 - centered / .2) + .3 + .2 * Math.min(...density),
        lineEvidence: { kind: 'caption-interrupted-dimension-line', captionBox: label.box.slice(),
          segments: [[[a, y], [left.right, y]], [[right.left, y], [b, y]]], gap: [[left.right, y], [right.left, y]],
          markers: [leftMarks[0], rightMarks[0]].map(t => ({ point: [t.x, y], kind: 'diagonal-tick', witnesses: t.witnesses })), pixelSupport: density } });
    }
    if (!candidates.length) return { candidate: null, ambiguous: false };
    const tolerance = Math.max(2, Math.min(4, Math.ceil(fh * .3))), groups = [];
    for (const c of candidates) {
      let group = groups.find(g => g.every(q => q.anchors.every((p, i) => p.every((n, axis) => Math.abs(n - c.anchors[i][axis]) <= tolerance))));
      if (!group) groups.push(group = []);
      group.push(c);
    }
    // Two distinct interrupted lines sharing a caption are unresolved. This
    // path never uses a majority of pixels to choose the measured objects.
    return groups.length === 1 ? { candidate: candidates.sort((a, b) => b.score - a.score)[0], ambiguous: false } : { candidate: null, ambiguous: true };
  }
  function matchDimensionLines(image, labels, options = {}) {
    const localPaperContrast = !!(options.lightConstructionLines && options.requireDimensionMarks), baseMask = inkMask(image, options.lightConstructionLines ? { threshold: 235, saturation: 30 } : {}),
      mask = localPaperContrast ? paperLineMask(image, baseMask) : baseMask, results = [], seen = new Set();
    const assessAssociation = !!(options.shortTicks && options.preferReliableReadings), associationReasons = ['DIMENSION_ANNOTATION_CONTEXT', 'DIMENSION_COLOURED_ANNOTATION', 'DIMENSION_MULTI_VALUE_CONTEXT', 'DIMENSION_CAPTION_ASSOCIATION_AMBIGUOUS', 'DIMENSION_CAPTION_FRAGMENT'];
    const eligible = evidence => !evidence || (options.requireDimensionMarks ? evidence.status === 'observed' : !associationReasons.includes(evidence.reason));
    const sameReading = (a, b) => {
      if (Math.abs(a.referenceFt - b.referenceFt) > 1e-9 || a.axis !== b.axis) return false;
      if (![b.anchors, b.anchors.slice().reverse()].some(points => a.anchors.every((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]) <= 2))) return false;
      const ar = a.sourceReading, br = b.sourceReading, av = ar?.sourceViewId || ar?.retry?.sourceViewId, bv = br?.sourceViewId || br?.retry?.sourceViewId;
      if (av && bv && av !== bv) return false;
      const af = ar?.sourceFrame || ar?.retry?.sourceFrame, bf = br?.sourceFrame || br?.retry?.sourceFrame;
      if (af && bf && JSON.stringify(af) !== JSON.stringify(bf)) return false;
      const x = a.textBox, y = b.textBox, area = p => (p[2] - p[0]) * (p[3] - p[1]), overlap = Math.max(0, Math.min(x[2], y[2]) - Math.max(x[0], y[0])) * Math.max(0, Math.min(x[3], y[3]) - Math.max(x[1], y[1]));
      return overlap / Math.min(area(x), area(y)) > .65;
    };
    const reliability = c => ({ trusted: ['pdf-text', 'manual-correction'].includes(c.source), confidence: Number.isFinite(c.sourceReading?.confidence) ? c.sourceReading.confidence : 0 });
    for (const label of wordsToLabels(labels, { includeProvenance: !!options.preferReliableReadings })) {
      const dim = parseDimension(label.text, { ocr: label.source !== 'pdf-text', bareMetricMm: options.bareMetricMm });
      if (!dim) continue;
      const [x0, y0, x1, y1] = label.box, cx = (x0 + x1) / 2, fh = Math.max(8, y1 - y0);
      // Very large text in annotations/legends is not a construction dimension.
      if (fh > image.height * .035 || x1 - x0 > image.width * .3) continue;
      let best = null;
      for (let y = Math.max(2, Math.floor(y0 - fh * 2.5)); y <= Math.min(image.height - 3, y1 + fh * 2.9); y++) {
        const textPadding = options.shortTicks ? 0 : 2;
        if (y >= y0 - textPadding && y <= y1 + textPadding) continue;
        // Short, explicitly ticked detail dimensions use the requested span
        // threshold for their line too. A fixed 50 px run discarded these
        // before the endpoint and caption checks could inspect them.
        const minRun = options.shortTicks ? Math.max(20, Math.min(50, options.minSpanPx ?? 55)) : 50;
        let run = lineRun(mask, y, Math.round(cx), 4, minRun), sourceLineSeed = null;
        if (!run && localPaperContrast) {
          // The caption centre may coincide with one JPEG-contaminated paper
          // probe. Start on observed ink within two pixels, keeping the same
          // run continuity and the original caption centre for association.
          const nearby = [-1, 1, -2, 2].map(offset => ({ offset, run: lineRun(mask, y, Math.round(cx) + offset, 4, minRun) })).filter(c => c.run);
          if (nearby.length && nearby.every(c => Math.abs(c.run.left - nearby[0].run.left) <= 2 && Math.abs(c.run.right - nearby[0].run.right) <= 2)) {
            run = nearby[0].run; sourceLineSeed = { point: [Math.round(cx) + nearby[0].offset, y], captionCenter: [cx, y], maximumOffsetPx: 2, method: 'nearby-observed-ink-same-source-run' };
          }
        }
        if (!run) continue;
        if (options.shortTicks) { let actual = 0; for (let x = run.left; x <= run.right; x++) actual += mask.data[y * mask.width + x]; if (actual / (run.right - run.left + 1) < .6) continue; }
        const ticks = intersections(mask, run, fh, options.shortTicks);
        for (let i = 0; i < ticks.length; i++) for (let j = i + 1; j < ticks.length; j++) {
          const a = ticks[i].x, b = ticks[j].x, span = b - a;
          if (options.shortTicks && ticks.slice(i+1,j).some(t=>t.slash)) continue;
          if (span < Math.max(options.minSpanPx ?? 55, (x1 - x0) * 1.3) || a > x0 + fh || b < x1 - fh) continue;
          const centered = Math.abs((a + b) / 2 - cx) / span; if (centered > .19) continue;
          const verticalGap = Math.min(Math.abs(y - y0), Math.abs(y - y1));
          const distanceScore = 1 - clamp(verticalGap / (fh * 3), 0, 1);
          const centeringScore = 1 - centered / .2;
          const score = .5 * centeringScore + .3 * distanceScore + .2 * run.density;
          if (!best || score > best.score) {
            const candidate = { text: dim.text, normalized: dim.normalized, referenceFt: dim.valueFt, anchors: [[a, y], [b, y]], spanPx: span, feetPerPixel: dim.valueFt / span, score, confidence: label.confidence ?? 100, source: label.source || 'ocr', textBox: label.box.slice(), corrected: dim.corrected, axis: options.axis || 'x', ...(sourceLineSeed ? { sourceLineSeed } : {}) };
            const evidence = options.requireDimensionMarks || assessAssociation ? dimensionLineEvidence(image, candidate, { labels, allowCrossedTerminals: !!options.allowCrossedTerminals, localPaperContrast }) : null;
            if (eligible(evidence)) best = options.requireDimensionMarks ? { ...candidate, lineEvidence: evidence } : candidate;
          }
        }
      }
      // Opt-in only: the import path keeps its existing line association.
      // A caption on the line needs observed arms, ticks and witnesses; no
      // source pixels are painted across the missing text interval.
      if (options.allowTextGap) {
        const interrupted = interruptedDimensionLine(mask, label, options), c = interrupted.candidate;
        const tolerance = Math.max(2, Math.min(4, Math.ceil(fh * .3)));
        const mixedAmbiguity = c && best && !best.anchors.every((p, i) => p.every((n, axis) => Math.abs(n - c.anchors[i][axis]) <= tolerance));
        if (interrupted.ambiguous || mixedAmbiguity) best = null;
        else if (c) best = { text: dim.text, normalized: dim.normalized, referenceFt: dim.valueFt, ...c, feetPerPixel: dim.valueFt / c.spanPx, confidence: label.confidence ?? 100, source: label.source || 'ocr', textBox: label.box.slice(), corrected: dim.corrected, axis: options.axis || 'x' };
      }
      if (best && (options.requireDimensionMarks || assessAssociation)) { const evidence = dimensionLineEvidence(image, best, { labels, allowCrossedTerminals: !!options.allowCrossedTerminals, localPaperContrast }); best = eligible(evidence) ? options.requireDimensionMarks ? { ...best, lineEvidence: evidence } : best : null; }
      if (best && best.feetPerPixel >= .00005 && best.feetPerPixel <= 10) {
        if (options.preferReliableReadings) {
          // A retry of this same inscription may improve its reading. Keep
          // the entire winning observation, not its confidence on old anchors.
          // Independent captions and contradictory values remain separate.
          best.sourceReading = JSON.parse(JSON.stringify(label));
          const index = results.findIndex(c => sameReading(c, best));
          if (index < 0) results.push(best);
          else { const previous = reliability(results[index]), next = reliability(best); if (Number(next.trusted) > Number(previous.trusted) || next.trusted === previous.trusted && next.confidence > previous.confidence) results[index] = best; }
        } else {
          const fingerprint = `${Math.round(best.anchors[0][0] / 6)}:${Math.round(best.anchors[1][0] / 6)}:${Math.round(best.anchors[0][1] / 6)}:${best.referenceFt}`;
          if (!seen.has(fingerprint)) { seen.add(fingerprint); results.push(best); }
        }
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }
  function dimensionLineEvidence(image, dimension, { labels = [], allowCrossedTerminals = false, localPaperContrast = false, rejectIntermediateMarks = false } = {}) {
    // A parsed number near a wall is not yet a measured span. This stricter
    // assessment is opt-in for automatic calibration; raw OCR candidates and
    // the legacy dimension reader remain available for review.
    const anchors = dimension?.anchors, box = dimension?.textBox;
    const unresolved = (reason, evidence = {}) => ({ status: 'unresolved', reason, ...evidence });
    if (!image?.data || anchors?.length !== 2 || !anchors.every(p => p?.length === 2 && p.every(finite)) || box?.length !== 4 || !box.every(finite)) return unresolved('DIMENSION_SOURCE_REQUIRED');
    const axis = Math.abs(anchors[0][1] - anchors[1][1]) <= 2 ? 0 : Math.abs(anchors[0][0] - anchors[1][0]) <= 2 ? 1 : null;
    if (axis === null) return unresolved('DIMENSION_AXIS_UNRESOLVED');
    const across = 1 - axis, coordinate = (anchors[0][across] + anchors[1][across]) / 2, span = anchors.map(p => p[axis]).sort((a, b) => a - b), font = Math.max(8, box[across + 2] - box[across]), caption = [box[axis], box[axis + 2]], extent = [box[across], box[across + 2]];
    if (span[1] - span[0] < 20 || caption[0] < span[0] - font || caption[1] > span[1] + font) return unresolved('DIMENSION_CAPTION_ASSOCIATION');
    const point = (u, v) => axis === 0 ? [u, v] : [v, u];
    const sample = (u, v, strong = false) => {
      const [x, y] = point(Math.round(u), Math.round(v));
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) return 0;
      if (image.data.length === image.width * image.height) return Number(image.data[y * image.width + x] < 145);
      const i = (y * image.width + x) * 4, hi = Math.max(...image.data.subarray(i, i + 3)), lo = Math.min(...image.data.subarray(i, i + 3));
      return Number(image.data[i + 3] > 160 && hi < (strong ? 185 : 235) && hi - lo < (strong ? 75 : 30));
    };
    // Joined opening labels, schedule cells and fire-rating text cannot lend
    // their individual number tokens to an adjacent construction/wall line.
    const covers = row => row.box?.length === 4 && row.box.every(finite) && box[0] >= row.box[0] - 1 && box[1] >= row.box[1] - 1 && box[2] <= row.box[2] + 1 && box[3] <= row.box[3] + 1;
    const context = labels.filter(covers).map(row => String(row.text || ''));
    const lineContext = labels.filter(row => row.box?.length === 4 && row.box.every(finite) && Math.abs((row.box[1] + row.box[3] - box[1] - box[3]) / 2) <= font * .7 && Math.max(0, row.box[0] - box[2], box[0] - row.box[2]) < font * 4).map(row => String(row.text || ''));
    if (context.some(text => /(?:\d[\d\s'".,/−-]*(?:mm|cm|m|ft|in|po|pi)?\s*[x×]\s*[\d\s'".,/−-]*\d|\b(?:notes?|tableau|schedule|index)\b)/i.test(text)) || lineContext.some(text => /\b\d+\s*min(?:utes?)?\b/i.test(text))) return unresolved('DIMENSION_ANNOTATION_CONTEXT');
    // OCR can lose the separator in a compact two-value inscription. Keep
    // its literal ambiguity instead of inventing an X or treating each
    // quoted value as an independent construction length.
    const multiValue = text => !/['′’]|\b(?:ft|feet|pi|pieds?)\b/i.test(text) && /\d+(?:[.,]\d+)?\s*["″][^\d'′’]{0,8}\d+(?:[.,]\d+)?\s*["″]/.test(text);
    if (context.some(multiValue)) return unresolved('DIMENSION_MULTI_VALUE_CONTEXT', { anchors: anchors.map(p => p.slice()), captionBox: box.slice(), sourceCaptions: labels.filter(row => covers(row) && multiValue(String(row.text || ''))).map(row => ({ text: row.text, box: row.box.slice(), source: row.source || 'ocr', confidence: row.confidence ?? null })) });
    const fragment = dimensionSourceEvidence()?.captionFragment(dimension, labels);
    if (fragment) return fragment;
    if (image.data.length !== image.width * image.height) {
      let neutral = 0, coloured = 0;
      for (let y = Math.max(0, Math.ceil(box[1])); y < Math.min(image.height, box[3]); y++) for (let x = Math.max(0, Math.ceil(box[0])); x < Math.min(image.width, box[2]); x++) {
        const i = (y * image.width + x) * 4, r = image.data[i], g = image.data[i + 1], b = image.data[i + 2], hi = Math.max(r, g, b), lo = Math.min(r, g, b);
        if (hi < 185 && hi - lo < 75) neutral++;
        if ((r + g + b) / 3 < 180 && hi - lo > 100) coloured++;
      }
      if (coloured >= 4 && coloured > neutral * 2) return unresolved('DIMENSION_COLOURED_ANNOTATION');
    }
    // A wall/window edge can contain incidental diagonal strokes. It cannot
    // take a caption across another uninterrupted, nearer parallel source
    // line. Keep that association ambiguous; do not choose a different value
    // merely because it would agree with the rest of the drawing.
    const captionEdge = coordinate < extent[0] ? extent[0] : coordinate > extent[1] ? extent[1] : coordinate, captionGap = Math.abs(coordinate - captionEdge), separation = Math.max(4, font * .5);
    if (captionGap > font * 1.5 && span[1] - span[0] >= 80) {
      const direction = Math.sign(coordinate - captionEdge), first = captionEdge + direction * 2, last = coordinate - direction * separation;
      for (let v = first; direction * (last - v) >= 0; v += direction) {
        let supported = 0, total = 0, gapRun = 0, longestGap = 0;
        for (let u = Math.ceil(span[0]); u <= Math.floor(span[1]); u++) {
          const hit = sample(u, v); total++;
          if (hit) { supported++; gapRun = 0; } else longestGap = Math.max(longestGap, ++gapRun);
        }
        if (supported / total >= .9 && longestGap <= 4) return unresolved('DIMENSION_CAPTION_ASSOCIATION_AMBIGUOUS', { anchors: anchors.map(p => p.slice()), captionBox: box.slice(), interveningLine: { anchors: [point(span[0], Math.round(v)), point(span[1], Math.round(v))], pixelSupport: supported / total, maxGap: longestGap, method: 'nearer-continuous-parallel-source-line' } });
      }
    }
    const textOnLine = coordinate >= extent[0] - 1 && coordinate <= extent[1] + 1;
    const gap = textOnLine ? [Math.floor(caption[0] - 1), Math.ceil(caption[1] + 1)] : null;
    let hits = 0, count = 0, misses = 0, maxGap = 0, contrastCount = 0, minimumContrast = Infinity;
    const contrastSamples = [];
    for (let u = Math.ceil(span[0]); u <= Math.floor(span[1]); u++) {
      if (gap && u >= gap[0] && u <= gap[1]) { misses = 0; continue; }
      let hit = sample(u, coordinate - 1) || sample(u, coordinate) || sample(u, coordinate + 1); count++;
      if (!hit && localPaperContrast) for (const delta of [0, -1, 1]) {
        const p = point(u, coordinate + delta), observed = paperLineContrast(image, p[0], p[1], axis);
        if (!observed) continue;
        hit = 1; contrastCount++; minimumContrast = Math.min(minimumContrast, observed.contrast);
        if (contrastSamples.length < 12 && (contrastSamples.length === 0 || u - contrastSamples.at(-1).point[axis] >= (span[1] - span[0]) / 12)) contrastSamples.push(observed);
        break;
      }
      if (hit) { hits++; misses = 0; } else maxGap = Math.max(maxGap, ++misses);
    }
    const pixelSupport = hits / (count || 1), markers = [], radius = Math.max(4, Math.min(6, Math.round(font * .4))), reach = Math.ceil(font * 3);
    const witnessesAt = (x, y) => {
        const found = [];
        for (const sign of [-1, 1]) {
          let last = radius, missing = 0;
          for (let d = radius + 1; d <= reach; d++) {
            if (sample(x - 1, y + sign * d) || sample(x, y + sign * d) || sample(x + 1, y + sign * d)) { last = d; missing = 0; } else if (++missing > 1) break;
          }
          if (last - radius >= Math.max(6, Math.ceil(font * .6))) found.push([point(x, y), point(x, y + sign * last)]);
        }
        return found;
    };
    const observeMark = endpoint => {
      const u = endpoint[axis], v = endpoint[across];
      let mark = null;
      // An intersection cluster can select the edge of a two-pixel stroke.
      // Locate the mark within that bounded raster uncertainty, retaining
      // both the measured anchor and the actually observed mark centre.
      for (let du = -2; du <= 2; du++) for (let dv = -2; dv <= 2; dv++) {
        if (Math.hypot(du, dv) > 2) continue;
        const centerU = u + du, centerV = v + dv, crossingReach = clamp(Math.round(font * .85), 10, 35);
        for (const direction of [-1, 1]) {
          const direct = [0, 0], free = [0, 0];
          for (let d = 2; d <= 6; d++) for (const sign of [-1, 1]) {
            const x = centerU + direction * sign * d, y = centerV + sign * d;
            if (!sample(x, y, true)) continue;
            const k = sign < 0 ? 0 : 1; direct[k]++;
            const acrossStroke = sample(x, centerV - crossingReach, true) && sample(x, centerV + crossingReach, true), alongStroke = sample(centerU - crossingReach, y, true) && sample(centerU + crossingReach, y, true);
            if (!acrossStroke && !alongStroke) free[k]++;
          }
          if (Math.min(...direct) < 2 || Math.min(...free) < 1) continue;
          const witnesses = witnessesAt(centerU, centerV); if (!witnesses.length) continue;
          const score = Math.min(...direct) * 10 + Math.min(...free) - Math.hypot(du, dv);
          if (!mark || score > mark.score) mark = { score, center: point(centerU, centerV), witnesses };
        }
      }
      // At thumbnail resolution a real diagonal can retain only one strong
      // off-axis pixel on either side. It is considered only for this long
      // faded-line path, with two independent continuing witnesses; the
      // complete line's real terminals are checked below as well.
      if (!mark && contrastCount >= count * .65 && span[1] - span[0] >= Math.max(160, font * 12)) {
        for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) {
          if (Math.hypot(du, dv) > 1) continue;
          const centerU = u + du, centerV = v + dv, crossingReach = clamp(Math.round(font * .85), 10, 35), witnesses = witnessesAt(centerU, centerV);
          if (witnesses.length !== 2) continue;
          for (const direction of [-1, 1]) {
            const free = [[], []];
            for (let d = 2; d <= 3; d++) for (const sign of [-1, 1]) {
              const x = centerU + direction * sign * d, y = centerV + sign * d;
              if (!sample(x, y, true)) continue;
              const acrossStroke = sample(x, centerV - crossingReach, true) && sample(x, centerV + crossingReach, true), alongStroke = sample(centerU - crossingReach, y, true) && sample(centerU + crossingReach, y, true);
              if (!acrossStroke && !alongStroke) free[sign < 0 ? 0 : 1].push(point(x, y));
            }
            if (!free.every(points => points.length)) continue;
            const score = Math.min(...free.map(points => points.length)) * 10 - Math.hypot(du, dv);
            if (!mark || score > mark.score) mark = { score, center: point(centerU, centerV), witnesses, compact: true, offAxisPixels: free };
          }
        }
      }
      return { point: endpoint.slice(), kind: mark ? mark.compact ? 'compact-diagonal-tick' : 'diagonal-tick' : 'unresolved-end-mark', witnesses: mark?.witnesses || witnessesAt(u, v), ...(mark ? { strokeCenter: mark.center, anchorTolerancePx: mark.compact ? 1 : 2, ...(mark.compact ? { offAxisPixels: mark.offAxisPixels } : {}) } : {}) };
    };
    markers.push(...anchors.map(observeMark));
    const lineAt = (u, v) => sample(u, v) || localPaperContrast && (() => { const p = point(u, v); return !!paperLineContrast(image, p[0], p[1], axis); })();
    const terminalExtensions = () => span.map((u, i) => {
      const direction = i ? 1 : -1, limit = Math.ceil(font * 1.5); let last = 0, missing = 0;
      for (let d = 1; d <= limit; d++) {
        const at = u + direction * d;
        if (lineAt(at, coordinate - 1) || lineAt(at, coordinate) || lineAt(at, coordinate + 1)) { last = d; missing = 0; } else if (++missing > 1) break;
      }
      return last;
    });
    if (allowCrossedTerminals && markers.every(m => m.witnesses.length === 2)) {
      // Some source dimensions terminate at plain crossed extension lines.
      // Only the actual two ends of the observed run qualify: a pair of
      // internal wall intersections cannot borrow the longer wall's line.
      const ends = terminalExtensions();
      if (ends.every(length => length <= Math.max(3, Math.ceil(font * .75)))) for (const marker of markers) if (marker.kind === 'unresolved-end-mark') { marker.kind = 'crossed-terminal-witnesses'; marker.terminalExtensions = ends.slice(); }
    }
    const evidence = { kind: 'dimension-line-with-end-marks-and-witnesses', axis: axis === 0 ? 'x' : 'y', anchors: anchors.map(p => p.slice()), captionBox: box.slice(), segments: gap ? [[point(span[0], coordinate), point(gap[0], coordinate)], [point(gap[1], coordinate), point(span[1], coordinate)]] : [anchors.map(p => p.slice())], gap: gap?.map(u => point(u, coordinate)) || null, pixelSupport, maxGap, markers,
      ...(contrastCount ? { paperContrast: { method: 'opposing-local-paper-margins', pixels: contrastCount, minimumContrast, samples: contrastSamples, maximumStrokeWidthPx: 3, minimumPaperValue: 248 } } : {}), ...(dimension.sourceLineSeed ? { sourceLineSeed: JSON.parse(JSON.stringify(dimension.sourceLineSeed)) } : {}) };
    if (pixelSupport < .85 || maxGap > 4 || count < 12) return unresolved('DIMENSION_LINE_SUPPORT', evidence);
    if (markers.some(m => !['diagonal-tick', 'compact-diagonal-tick', 'crossed-terminal-witnesses'].includes(m.kind) || !m.witnesses.length)) return unresolved('DIMENSION_END_MARKS_REQUIRED', evidence);
    if (rejectIntermediateMarks) {
      // A caption belongs to one marked interval, not an entire dimension
      // chain. Reuse the exact endpoint detector on actual witness strokes;
      // the numerical value never supplies or moves a source point.
      const internal = [], margin = 5;
      for (let u = Math.ceil(span[0] + margin); u <= Math.floor(span[1] - margin); u++) {
        if (!witnessesAt(u, coordinate).length) continue;
        const marker = observeMark(point(u, coordinate));
        if (!marker.strokeCenter || !['diagonal-tick', 'compact-diagonal-tick'].includes(marker.kind)) continue;
        if (markers.some(end => Math.abs((end.strokeCenter || end.point)[axis] - marker.strokeCenter[axis]) <= margin)) continue;
        if (!internal.some(other => Math.abs(other.strokeCenter[axis] - marker.strokeCenter[axis]) <= 3)) internal.push(marker);
      }
      evidence.intermediateMarkCheck = { method: 'source-witnesses-and-shared-diagonal-detector', searchedSpan: span.slice(), markers: internal };
      if (internal.length) return unresolved('DIMENSION_INTERMEDIATE_MARKS', evidence);
    }
    // This opt-in path recovers long, consistently faded drafting strokes.
    // Isolated compression pixels must not repair arbitrary structural gaps;
    // both dark diagonal ticks and continuing witnesses remain mandatory.
    if (contrastCount && (span[1] - span[0] < Math.max(160, font * 12) || contrastCount < count * .65 || markers.some(m => !['diagonal-tick', 'compact-diagonal-tick'].includes(m.kind) || !m.witnesses.length) || markers.some(m => m.kind === 'compact-diagonal-tick') && terminalExtensions().some(length => length > Math.max(3, Math.ceil(font * .75))))) return unresolved('DIMENSION_PAPER_CONTRAST_UNRESOLVED', evidence);
    return { status: 'observed', ...evidence, confirmationRequired: true };
  }
  function resolveScale(candidates) {
    const geometric = candidates.filter(c => c.score >= .61 && c.spanPx >= 60 && c.referenceFt > 0 && finite(c.feetPerPixel));
    // OCR confidence is not a probability. It is used as an exclusion threshold,
    // then independent written dimensions must agree geometrically. Never turn a
    // lone, low-confidence "2" read in place of "10" into a measured project.
    const possible = geometric.filter(c => c.source === 'pdf-text' || c.source === 'manual-correction' || c.confidence >= 25);
    if (!possible.length) return { status: geometric.length ? 'low_confidence' : 'not_found', feetPerPixel: null, candidates: geometric, accepted: [], message: geometric.length ? 'Des cotes ont été repérées, mais leur lecture est trop incertaine. Aucune échelle n’est appliquée.' : 'Aucune cote lisible n’a encore pu être reliée à deux repères du dessin.' };
    const clusters = [];
    for (const c of possible) {
      let bucket = clusters.find(g => Math.abs(c.feetPerPixel / median(g.map(v => v.feetPerPixel)) - 1) <= .035);
      if (!bucket) { bucket = []; clusters.push(bucket); } bucket.push(c);
    }
    const independent = list => { const output = []; for (const c of list) if (!output.some(q => q.axis === c.axis && Math.abs(q.referenceFt - c.referenceFt) < .001 && Math.abs(q.anchors[0][0] - c.anchors[0][0]) < 8 && Math.abs(q.anchors[0][1] - c.anchors[0][1]) < 8)) output.push(c); return output; };
    const ranked = clusters.map(g => { const unique = independent(g); return { members: unique, score: unique.reduce((a, c) => a + c.score * Math.min(2, c.spanPx / 200), 0) }; }).sort((a, b) => b.score - a.score);
    const group = ranked[0].members, consensus = median(group.map(c => c.feetPerPixel)), longest = group.slice().sort((a, b) => b.spanPx - a.spanPx)[0];
    const rival = ranked[1], groupAxes = new Set(group.map(c => c.axis));
    const axisConflict = ranked.slice(1).some(r => r.members.some(c => !groupAxes.has(c.axis) && c.spanPx >= 150 && c.score >= .8 && (c.source === 'pdf-text' || (c.confidence >= 85 && !c.corrected))));
    const ambiguous = axisConflict || !!(rival && rival.members.length >= 2 && rival.score >= ranked[0].score * .7);
    const reliableText = c => c.source === 'pdf-text' || c.source === 'manual-correction' || c.confidence >= 55;
    const enoughEvidence = group.length >= 2 ? group.some(reliableText) : longest.source === 'pdf-text' || longest.source === 'manual-correction' || (longest.confidence >= 85 && !longest.corrected && longest.score >= .85);
    const axisX = group.filter(c => c.axis === 'x'), axisY = group.filter(c => c.axis === 'y');
    const scaleX = median(axisX.map(c => c.feetPerPixel)), scaleY = median(axisY.map(c => c.feetPerPixel));
    const distortion = scaleX && scaleY ? Math.abs(scaleX / scaleY - 1) : null;
    const spread = Math.max(...group.map(c => Math.abs(c.feetPerPixel / consensus - 1)));
    const status = ambiguous ? 'conflict' : !enoughEvidence ? 'low_confidence' : group.length >= 2 ? 'cross_checked' : 'single_dimension';
    // The saved calibration is the longest accepted written dimension and its
    // actual endpoints, not a synthetic reference manufactured from an average.
    return { status, feetPerPixel: ambiguous || !enoughEvidence ? null : longest.feetPerPixel, consensusFeetPerPixel: consensus, referenceFt: longest.referenceFt, anchors: longest.anchors, accepted: enoughEvidence && !ambiguous ? group : [], candidates: geometric, scaleX, scaleY, spread, distortion, axisConflict, source: longest.source, message: axisConflict ? 'Les cotes de largeur et de hauteur ne concordent pas. Vérifiez la vue ou un étirement de l’image.' : ambiguous ? 'Plusieurs échelles incompatibles ont été trouvées. Sélectionnez la cote de cette vue.' : !enoughEvidence ? 'La lecture des cotes reste incertaine. Aucune échelle n’est appliquée avant vérification.' : group.length >= 2 ? `${group.length} cotes concordent; échelle calculée automatiquement.` : 'Une cote a été reliée au dessin; une seconde cote est recommandée pour la vérifier.' };
  }
  function unrotateCandidate(c, originalWidth, originalHeight, direction = 'ccw') {
    const map = direction === 'cw' ? p => [p[1], originalHeight - p[0]] : p => [originalWidth - p[1], p[0]];
    const mapBox = box => { const p = [map([box[0], box[1]]), map([box[2], box[3]])]; return [Math.min(p[0][0], p[1][0]), Math.min(p[0][1], p[1][1]), Math.max(p[0][0], p[1][0]), Math.max(p[0][1], p[1][1])]; };
    const mapReading = r => ({ ...r, box: mapBox(r.box), ...(r.readingParts ? { readingParts: r.readingParts.map(mapReading) } : {}) });
    const q = [map([c.textBox[0], c.textBox[1]]), map([c.textBox[2], c.textBox[3]])];
    const result = { ...c, anchors: c.anchors.map(map), textBox: [Math.min(q[0][0], q[1][0]), Math.min(q[0][1], q[1][1]), Math.max(q[0][0], q[1][0]), Math.max(q[0][1], q[1][1])], axis: 'y' };
    const mapSeed = seed => ({ ...seed, point: map(seed.point), captionCenter: map(seed.captionCenter) });
    if (c.sourceLineSeed) result.sourceLineSeed = mapSeed(c.sourceLineSeed);
    if (c.sourceReading) result.sourceReading = mapReading(c.sourceReading);
    if (['caption-interrupted-dimension-line', 'dimension-line-with-end-marks-and-witnesses'].includes(c.lineEvidence?.kind)) result.lineEvidence = { ...c.lineEvidence, ...(c.lineEvidence.axis ? { axis: 'y' } : {}), ...(c.lineEvidence.anchors ? { anchors: c.lineEvidence.anchors.map(map) } : {}), captionBox: result.textBox.slice(), segments: c.lineEvidence.segments.map(s => s.map(map)), gap: c.lineEvidence.gap?.map(map) || null, markers: c.lineEvidence.markers.map(m => ({ ...m, point: map(m.point), ...(m.strokeCenter ? { strokeCenter: map(m.strokeCenter) } : {}), ...(m.offAxisPixels ? { offAxisPixels: m.offAxisPixels.map(points => points.map(map)) } : {}), witnesses: m.witnesses.map(s => s.map(map)) })), ...(c.lineEvidence.paperContrast ? { paperContrast: { ...c.lineEvidence.paperContrast, samples: c.lineEvidence.paperContrast.samples.map(s => ({ ...s, point: map(s.point) })) } } : {}), ...(c.lineEvidence.sourceLineSeed ? { sourceLineSeed: mapSeed(c.lineEvidence.sourceLineSeed) } : {}) };
    return result;
  }
  function simplify(poly, tolerance = 2) {
    if (poly.length < 5) return poly;
    const sq = tolerance * tolerance;
    const lineDistance = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1); return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2; };
    const recurse = (arr, from, to, out) => { let max = sq, index = -1; for (let i = from + 1; i < to; i++) { const d = lineDistance(arr[i], arr[from], arr[to]); if (d > max) { max = d; index = i; } } if (index >= 0) { recurse(arr, from, index, out); out.push(arr[index]); recurse(arr, index, to, out); } };
    const closed = [...poly, poly[0]], output = [poly[0]]; recurse(closed, 0, closed.length - 1, output); return output.length >= 3 ? output : poly;
  }
  function traceRegion(cells, width) {
    const occupied = new Set(cells), edges = new Map();
    const add = (a, b) => { const key = a.join(','); if (!edges.has(key)) edges.set(key, []); edges.get(key).push(b); };
    for (const cell of cells) { const x = cell % width, y = Math.floor(cell / width); if (!occupied.has(cell - width)) add([x, y], [x + 1, y]); if (x === width - 1 || !occupied.has(cell + 1)) add([x + 1, y], [x + 1, y + 1]); if (!occupied.has(cell + width)) add([x + 1, y + 1], [x, y + 1]); if (!x || !occupied.has(cell - 1)) add([x, y + 1], [x, y]); }
    const loops = [];
    while (edges.size) {
      const first = edges.keys().next().value, start = first.split(',').map(Number), loop = [start]; let current = start, limit = cells.length * 8 + 16;
      do { const k = current.join(','), next = edges.get(k); if (!next?.length) break; current = next.pop(); if (!next.length) edges.delete(k); loop.push(current); } while (current.join(',') !== first && --limit > 0);
      if (loop.length > 3 && current.join(',') === first) loops.push(loop.slice(0, -1));
    }
    return loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  }
  function proposeColoredZones(image, crop = [0, 0, image.width, image.height]) {
    const step = image.width > 2200 ? 3 : 2, [cx, cy, cw, ch] = crop, w = Math.ceil(cw / step), h = Math.ceil(ch / step), labels = new Uint8Array(w * h), visited = new Uint8Array(w * h), { data, width } = image;
    const minPixels = Math.max(40, w * h * .0015);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (clamp(Math.floor(cy + y * step), 0, image.height - 1) * width + clamp(Math.floor(cx + x * step), 0, width - 1)) * 4, r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min; if (data[i + 3] < 180 || delta < .19 || max < .35) continue; let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4; hue = (hue * 60 + 360) % 360; labels[y * w + x] = hue < 25 || hue > 338 ? 1 : hue < 85 ? 2 : hue < 165 ? 3 : hue < 225 ? 4 : hue < 290 ? 5 : 6; }
    const components = [];
    for (let start = 0; start < labels.length; start++) {
      if (!labels[start] || visited[start]) continue; const color = labels[start], queue = [start]; visited[start] = 1;
      for (let head = 0; head < queue.length; head++) { const p = queue[head], x = p % w, y = Math.floor(p / w); const near = []; if (x) near.push(p - 1); if (x < w - 1) near.push(p + 1); if (y) near.push(p - w); if (y < h - 1) near.push(p + w); for (const q of near) if (!visited[q] && labels[q] === color) { visited[q] = 1; queue.push(q); } }
      if (queue.length < minPixels) continue;
      const loops = traceRegion(queue, w); if (!loops.length) continue;
      const poly = simplify(loops[0].map(([x, y]) => [Math.min(cw, x * step), Math.min(ch, y * step)]), step * 2), box = bbox(poly), boxArea = (box[2] - box[0]) * (box[3] - box[1]);
      if (poly.length < 3 || boxArea < cw * ch * .002 || queue.length * step * step / boxArea < .11 || box[2] - box[0] < 14 || box[3] - box[1] < 14) continue;
      const holes = loops.slice(1).filter(p => Math.abs(area(p)) * step * step > boxArea * .018).map(p => simplify(p.map(([x, y]) => [Math.min(cw, x * step), Math.min(ch, y * step)]), step * 2));
      components.push({ polygon: poly, holes, areaPx: queue.length * step * step, box, colorBucket: color, provenance: 'Surface colorée repérée automatiquement; contour et usage à vérifier.', confidence: 'candidate' });
    }
    return components.sort((a, b) => b.areaPx - a.areaPx).slice(0, 24);
  }
  return { parseDimension, wordsToLabels, inkMask, matchDimensionLines, dimensionLineEvidence, resolveScale, unrotateCandidate, proposeColoredZones, bbox, area, median };
});
