/* MIR: dimension marks are matched to measured extension-line intersections.
 * No drawing scale or building dimension is assumed when evidence is absent. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRPDFAnalysis = api;
})(typeof window === 'object' ? window : globalThis, function () {
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
  function wordsToLabels(words) {
    const clean = words.filter(w => w && typeof w.text === 'string' && Array.isArray(w.box) && w.box.every(finite) && w.box[2] > w.box[0] && w.box[3] > w.box[1]);
    const labels = [...clean];
    // Merge adjacent words, because 22' - 0" may be split into three OCR tokens.
    for (const w of clean) {
      const h = w.box[3] - w.box[1], cy = (w.box[1] + w.box[3]) / 2;
      const line = clean.filter(q => q !== w && q.box[0] >= w.box[2] - 2 && q.box[0] - w.box[2] < h * 4 && Math.abs((q.box[1] + q.box[3]) / 2 - cy) < h * .7).sort((a, b) => a.box[0] - b.box[0]);
      let text = w.text, end = w.box[2], box = w.box.slice(), conf = w.confidence;
      for (const q of line.slice(0, 3)) {
        if (q.box[0] - end > h * 1.9) break;
        text += ' ' + q.text; end = q.box[2]; box = [box[0], Math.min(box[1], q.box[1]), end, Math.max(box[3], q.box[3])]; conf = Math.min(conf ?? 80, q.confidence ?? 80);
        labels.push({ text, box: box.slice(), confidence: conf, source: w.source || 'ocr', joined: true });
      }
    }
    return labels;
  }
  function inkMask(image) {
    const { width: w, height: h, data } = image, mask = new Uint8Array(w * h), channels = data.length === w * h ? 1 : 4;
    for (let i = 0; i < mask.length; i++) {
      if (channels === 1) mask[i] = data[i] < 145 ? 1 : 0;
      else { const p = i * 4, max = Math.max(data[p], data[p + 1], data[p + 2]), min = Math.min(data[p], data[p + 1], data[p + 2]); mask[i] = data[p + 3] > 160 && max < 185 && max - min < 75 ? 1 : 0; }
    }
    return { data: mask, width: w, height: h };
  }
  function lineRun(mask, y, center, gap = 4) {
    const { width: w, height: h, data } = mask;
    const black = x => { if (x < 0 || x >= w) return 0; for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) if (data[yy * w + x]) return 1; return 0; };
    if (!black(center)) return null;
    let left = center, right = center, misses = 0, count = 0;
    for (let x = center; x >= 0; x--) { if (black(x)) { left = x; misses = 0; count++; } else if (++misses > gap) break; }
    misses = 0;
    for (let x = center + 1; x < w; x++) { if (black(x)) { right = x; misses = 0; count++; } else if (++misses > gap) break; }
    const length = right - left;
    return length >= 50 && count / (length + 1) > .78 ? { left, right, y, density: count / (length + 1) } : null;
  }
  function intersections(mask, run, fontHeight) {
    const { width: w, height: h, data } = mask, reach = clamp(Math.round(fontHeight * .85), 10, 35), ys = run.y;
    const hits = [];
    for (let x = Math.max(2, run.left); x <= Math.min(w - 3, run.right); x++) {
      let above = 0, below = 0, continuous = 0, longest = 0;
      for (let dy = -reach; dy <= reach; dy++) {
        const y = ys + dy; if (y < 0 || y >= h) continue;
        const p = y * w + x, ink = data[p - 1] || data[p] || data[p + 1];
        if (ink) { continuous++; longest = Math.max(longest, continuous); if (dy < -3) above++; if (dy > 3) below++; } else continuous = 0;
      }
      if (above >= reach * .45 && below >= reach * .23 && longest >= reach * 1.1) hits.push({ x, strength: above + below + longest });
    }
    const clustered = [];
    for (const hit of hits) { const last = clustered[clustered.length - 1]; if (last && hit.x - last.right <= 5) { last.right = hit.x; if (hit.strength > last.strength) { last.x = hit.x; last.strength = hit.strength; } } else clustered.push({ ...hit, right: hit.x }); }
    return clustered;
  }
  function matchDimensionLines(image, labels, options = {}) {
    const mask = inkMask(image), results = [], seen = new Set();
    for (const label of wordsToLabels(labels)) {
      const dim = parseDimension(label.text, { ocr: label.source !== 'pdf-text', bareMetricMm: options.bareMetricMm });
      if (!dim) continue;
      const [x0, y0, x1, y1] = label.box, cx = (x0 + x1) / 2, fh = Math.max(8, y1 - y0);
      // Very large text in annotations/legends is not a construction dimension.
      if (fh > image.height * .035 || x1 - x0 > image.width * .3) continue;
      let best = null;
      for (let y = Math.max(2, Math.floor(y0 - fh * 2.5)); y <= Math.min(image.height - 3, y1 + fh * 2.9); y++) {
        if (y >= y0 - 2 && y <= y1 + 2) continue;
        const run = lineRun(mask, y, Math.round(cx)); if (!run) continue;
        const ticks = intersections(mask, run, fh);
        for (let i = 0; i < ticks.length; i++) for (let j = i + 1; j < ticks.length; j++) {
          const a = ticks[i].x, b = ticks[j].x, span = b - a;
          if (span < Math.max(55, (x1 - x0) * 1.3) || a > x0 + fh || b < x1 - fh) continue;
          const centered = Math.abs((a + b) / 2 - cx) / span; if (centered > .19) continue;
          const verticalGap = Math.min(Math.abs(y - y0), Math.abs(y - y1));
          const distanceScore = 1 - clamp(verticalGap / (fh * 3), 0, 1);
          const centeringScore = 1 - centered / .2;
          const score = .5 * centeringScore + .3 * distanceScore + .2 * run.density;
          if (!best || score > best.score) best = { text: dim.text, normalized: dim.normalized, referenceFt: dim.valueFt, anchors: [[a, y], [b, y]], spanPx: span, feetPerPixel: dim.valueFt / span, score, confidence: label.confidence ?? 100, source: label.source || 'ocr', textBox: label.box.slice(), corrected: dim.corrected, axis: options.axis || 'x' };
        }
      }
      if (best && best.feetPerPixel >= .00005 && best.feetPerPixel <= 10) {
        const fingerprint = `${Math.round(best.anchors[0][0] / 6)}:${Math.round(best.anchors[1][0] / 6)}:${Math.round(best.anchors[0][1] / 6)}:${best.referenceFt}`;
        if (!seen.has(fingerprint)) { seen.add(fingerprint); results.push(best); }
      }
    }
    return results.sort((a, b) => b.score - a.score);
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
    const q = [map([c.textBox[0], c.textBox[1]]), map([c.textBox[2], c.textBox[3]])];
    return { ...c, anchors: c.anchors.map(map), textBox: [Math.min(q[0][0], q[1][0]), Math.min(q[0][1], q[1][1]), Math.max(q[0][0], q[1][0]), Math.max(q[0][1], q[1][1])], axis: 'y' };
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
  return { parseDimension, wordsToLabels, inkMask, matchDimensionLines, resolveScale, unrotateCandidate, proposeColoredZones, bbox, area, median };
});
