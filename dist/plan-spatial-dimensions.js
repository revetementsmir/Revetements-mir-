/* Reads the overall dimensions and level guides printed beside elevations. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRSpatialDimensions = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const METRES_PER_FOOT = .3048;
  const normal = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const midpoint = (box, axis) => (box[axis] + box[axis + 2]) / 2;

  function dimension(text, parseDimension, ocr) {
    const raw = ocr ? text.replace(/^£(?=\d)/, '±') : text;
    const cleaned = raw.trim().replace(/^(?:±|\+\s*\/\s*-|\+|[−-])\s*/, '');
    if (/^0(?:[.,]0+)?\s*(?:m|cm|mm|pi|ft|')$/.test(cleaned)) return { valueFt: 0, normalized: cleaned };
    return parseDimension(cleaned, { ocr });
  }

  function ink(image, x, y, limit = 224) {
    if (x < 0 || x >= image.width || y < 0 || y >= image.height) return false;
    const i = (y * image.width + x) * 4, d = image.data;
    return d[i + 3] > 100 && Math.max(d[i], d[i + 1], d[i + 2]) < limit;
  }

  function horizontalRun(image, y, from, to, limit, gap) {
    let start = from, previous = from - gap - 1, longest = null;
    for (let x = from; x <= to; x++) {
      if (!ink(image, x, y, limit)) continue;
      if (x - previous > gap) start = x;
      previous = x;
      if (!longest || x - start > longest.end - longest.start) longest = { start, end: x, y };
    }
    return longest;
  }

  function hasTick(image, x, y) {
    let above = 0, below = 0;
    for (let dy = -9; dy <= 9; dy++) {
      if (Math.abs(dy) <= 1) continue;
      let found = false;
      for (let dx = -3; dx <= 3; dx++) found ||= ink(image, x + dx, y + dy, 238);
      if (found && dy < 0) above++;
      if (found && dy > 0) below++;
    }
    return above >= 3 && below >= 3;
  }

  function guide(image, box, crop) {
    const [left, top, right, bottom] = box, h = Math.max(3, bottom - top);
    const x0 = Math.max(crop[0], Math.floor(left - h * 4));
    const x1 = Math.min(crop[0] + crop[2] - 1, Math.ceil(right + h * 2));
    let best = null;
    for (let y = Math.max(crop[1], Math.round(bottom)); y <= Math.min(crop[1] + crop[3] - 1, Math.ceil(bottom + h * 1.6)); y++) {
      const line = horizontalRun(image, y, x0, x1, 238, 3);
      if (!line || line.end - line.start < Math.max(14, (right - left) * .77)) continue;
      if (!best || line.end - line.start > best.end - best.start) best = line;
    }
    return best;
  }

  function gradeGuide(image, line, box, crop) {
    if (!line) return null;
    // A grade label may sit on a jogged leader. Measure at the drawing-side
    // end when a second horizontal segment connects to that jog.
    const h = Math.max(4, box[3] - box[1]);
    const left = Math.max(crop[0], Math.round(line.start - 17 * h));
    const right = Math.round(line.start - 2);
    const adjacent = [];
    for (let dy = -Math.ceil(h * 2); dy <= Math.ceil(h * 2); dy++) {
      if (Math.abs(dy) < 3) continue;
      const next = horizontalRun(image, line.y + dy, left, right, 238, 3);
      if (!next || next.end - next.start < h * 5 || right - next.end > h * 2) continue;
      if (ink(image, Math.round(line.start + h * 2), next.y, 238)) continue;
      const slope = line.start - next.end;
      let connected = 0;
      for (let part = .2; part <= .8; part += .2) {
        const y = Math.round(next.y - dy * part), x = Math.round(next.end + slope * part);
        if (ink(image, x - 1, y, 238) || ink(image, x, y, 238) || ink(image, x + 1, y, 238)) connected++;
      }
      if (connected >= 3) adjacent.push(next);
    }
    return adjacent.sort((a, b) => Math.abs(a.y - line.y) - Math.abs(b.y - line.y))[0] || line;
  }

  const levelPatterns = [
    ['ridge', /^(?:(?:niveau (?:du )?)?faite(?: (?:de la |du )?(?:toit(?:ure)?)(?: principal[e]?)?)?|ridge (?:level|height)|roof ridge)\b\s*[:=]?\s*/],
    ['eaves', /^(?:(?:plafond|ceiling)\s+(?:(?:du |de l')?(?:niv(?:eau)?\.?|etage|level|floor)(?:\s*\d{1,2})?|(?:dernier|last|top)\s+(?:etage|floor))|(?:niveau |ligne de )?(?:la )?sabliere|haut (?:du mur|des murs)(?: exterieurs?)?|top of (?:exterior )?walls?|eaves? level)\b\s*[:=]?\s*/],
    ['grade', /^(?:niveau (?:du )?sol fini?|sol fini|terrain (?:fini|naturel)|finished (?:ground|grade)(?: level)?|ground level)\b\s*[:=]?\s*/],
    ['floor', /^(?:(?:plancher|floor)\s+(?:(?:du )?(?:niv(?:eau)?\.?|level|etage)\s*\d{1,2}))\b\s*[:=]?\s*/]
  ];

  function captionBox(box, words) {
    const [left, top, right, bottom] = box;
    const heights = words.filter(word => word.box[0] >= left - 1 && word.box[2] <= right + 1 && word.box[1] >= top - 1 && word.box[3] <= bottom + 1)
      .map(word => word.box).sort((a, b) => (a[3] - a[1]) - (b[3] - b[1]));
    if (heights.length < 2) return box;
    const sample = heights[Math.floor((heights.length - 1) * .45)];
    const h = sample[3] - sample[1], aligned = heights.filter(part => Math.abs(midpoint(part, 1) - midpoint(sample, 1)) <= h && part[3] - part[1] <= h * 1.65);
    return [left, Math.min(...aligned.map(part => part[1])), right, Math.max(...aligned.map(part => part[3]))];
  }

  function readLevels(rows, image, crop, parseDimension, words = []) {
    const levels = { storeys: [] };
    for (const row of rows) {
      if (row.confidence < 15 || !row.box || row.text.length > 120) continue;
      const label = normal(row.text);
      for (const [key, pattern] of levelPatterns) {
        const prefix = label.match(pattern)?.[0];
        if (!prefix) continue;
        const annotation = label.slice(prefix.length);
        const value = dimension(annotation, parseDimension, row.source === 'ocr');
        const box = captionBox(row.box, words);
        let line = image && guide(image, box, crop);
        if (row.confidence < 40 && (key !== 'ridge' || !line || !/toitur|ridge/.test(label))) continue;
        if (key === 'grade' && image) line = gradeGuide(image, line, box, crop);
        const signedValue = value && value.valueFt * (/^[-−]\s*\d/.test(annotation) ? -1 : 1);
        const record = { text: row.text, y: line?.y ?? box[3], line, box, value: signedValue,
          explicit: value && !value.corrected, ceiling: /^(?:plafond|ceiling)/.test(label), storey: Number(prefix.trim().match(/\b\d{1,2}$/)?.[0]) };
        if (line && (key === 'floor' || record.ceiling)) levels.storeys.push(record);
        if (key === 'floor') break;
        if (!levels[key]) levels[key] = record;
        else if (key === 'eaves' || key === 'ridge') {
          if (record.y + 4 < levels[key].y || Math.abs(record.y - levels[key].y) <= 4 && value && !levels[key].explicit) levels[key] = record;
        } else if (value && !levels[key].explicit) levels[key] = record;
        break;
      }
    }
    if (levels.eaves?.ceiling && levels.storeys.some(level => !level.ceiling && level.storey > levels.eaves.storey && level.y < levels.eaves.y)) delete levels.eaves;
    return levels;
  }

  function spatialSpan(image, box, crop) {
    const [left, top, right, bottom] = box, h = Math.max(4, bottom - top);
    const cx = midpoint(box, 0), x0 = crop[0], x1 = crop[0] + crop[2] - 1;
    let best = null;
    for (let y = Math.max(crop[1], Math.floor(top - h * 1.9)); y <= Math.min(crop[1] + crop[3] - 1, Math.ceil(bottom + h * 2.1)); y++) {
      if (y >= top && y <= bottom) continue;
      const line = horizontalRun(image, y, x0, x1, 239, 5);
      if (!line) continue;
      const span = line.end - line.start, centerError = Math.abs((line.start + line.end) / 2 - cx) / span;
      if (span < crop[2] * .24 || centerError > .09) continue;
      if (!hasTick(image, line.start, y) || !hasTick(image, line.end, y)) continue;
      const distance = Math.min(Math.abs(y - top), Math.abs(y - bottom));
      const score = 1 - centerError - distance / h * .12;
      if (!best || score > best.score) best = { ...line, span, score };
    }
    return best;
  }

  function readSpan(rows, accepted, image, crop, levels, parseDimension) {
    const candidates = [];
    const add = (start, end, y, feet, text, score) => {
      const span = end - start;
      if (span < crop[2] * .24 || feet < 12 || feet > 1000) return;
      if (levels.ridge && y >= levels.ridge.y - 3) return;
      if (!levels.ridge && y >= crop[1] + crop[3] * .32) return;
      candidates.push({ start, end, span, y, feet, text, score });
    };
    for (const c of accepted) {
      if (c.axis !== 'x' || c.score < .71 || c.corrected || c.confidence < 60) continue;
      const [a, b] = c.anchors;
      add(Math.min(a[0], b[0]), Math.max(a[0], b[0]), (a[1] + b[1]) / 2, c.referenceFt, c.normalized, c.score);
    }
    if (image) for (const row of rows) {
      if (!row.box || row.confidence < 57 || row.box[1] > (levels.ridge?.y ?? crop[1] + crop[3] * .32)) continue;
      const value = dimension(row.text, parseDimension, row.source === 'ocr');
      if (!value || value.corrected || value.valueFt < 12) continue;
      const line = spatialSpan(image, row.box, crop);
      if (line) add(line.start, line.end, line.y, value.valueFt, row.text, line.score);
    }
    const longest = Math.max(0, ...candidates.map(candidate => candidate.span));
    const overall = candidates.filter(candidate => candidate.span >= longest * .98);
    const best = overall.sort((a, b) => b.score - a.score)[0];
    if (!best) return null;
    // A label on the neighboring segmented dimension line can overlap the
    // same long span. Compare only labels with a similarly close match.
    const contradicts = overall.some(c => Math.abs(c.start - best.start) < best.span * .035 && c.score >= best.score - .09 && Math.abs(c.feet - best.feet) > .08);
    return contradicts ? null : best;
  }

  function byVerticalDimension(top, bottom, rows, accepted, feetPerPixel, parseDimension, width, minConfidence = 66) {
    const span = bottom.y - top.y;
    const expected = feetPerPixel ? span * feetPerPixel : null;
    const candidates = [];
    const agrees = ft => expected == null || Math.abs(ft - expected) <= Math.max(.14, expected * .045);
    for (const c of accepted) {
      if (c.axis !== 'y' || c.score < .71 || c.corrected || c.confidence < 60 || !agrees(c.referenceFt)) continue;
      const endpoints = c.anchors.map(p => p[1]).sort((a, b) => a - b);
      if (Math.abs(endpoints[0] - top.y) <= 5 && Math.abs(endpoints[1] - bottom.y) <= 5) candidates.push({ feet: c.referenceFt, text: c.normalized });
    }
    if (expected != null && top.line && bottom.line) for (const row of rows) {
      if (row.confidence < minConfidence || !row.box) continue;
      const centered = Math.abs(midpoint(row.box, 1) - (top.y + bottom.y) / 2) <= Math.max(5, span * .1);
      const labelHeight = row.box[3] - row.box[1];
      const displaced = span <= 40 && labelHeight >= span * .75 && (Math.abs(row.box[3] - top.y) <= 6 || Math.abs(row.box[1] - bottom.y) <= 6);
      if (!centered && !displaced) continue;
      const x = midpoint(row.box, 0), captionStart = Math.min(top.box[0], bottom.box[0]);
      if (x < captionStart - width * .075 || x >= captionStart) continue;
      const value = dimension(row.text.replace(/\s*\[\d{2,5}\]\s*$/, ''), parseDimension, row.source === 'ocr');
      if (value && !value.corrected && agrees(value.valueFt)) candidates.push({ feet: value.valueFt, text: value.normalized });
    }
    return candidates.length && candidates.every(c => Math.abs(c.feet - candidates[0].feet) < .04) ? candidates[0] : null;
  }

  function byVerticalChain(top, bottom, storeys, rows, accepted, feetPerPixel, parseDimension, width) {
    if (!top.line || !bottom.line || !feetPerPixel) return null;
    const onSameRuler = level => Math.abs(level.box[2] - top.box[2]) < width * .025;
    const intermediate = storeys.filter(level => level.y > top.y + 4 && level.y < bottom.y - 4 && onSameRuler(level))
      .sort((a, b) => a.y - b.y);
    const levels = [top];
    for (const level of intermediate) if (level.y > levels.at(-1).y + 4) levels.push(level);
    if (levels.length < 3) return null;
    levels.push(bottom);
    // A written dimension can span an intermediate level. Find continuous
    // paths and reject totals that differ across those paths.
    const paths = levels.map(() => []);
    paths[0].push({ feet: 0, labels: [] });
    for (let end = 1; end < levels.length; end++) for (let start = 0; start < end; start++) {
      if (!paths[start].length) continue;
      const dim = byVerticalDimension(levels[start], levels[end], rows, accepted, feetPerPixel, parseDimension, width, 52);
      if (!dim) continue;
      for (const path of paths[start]) {
        const feet = path.feet + dim.feet;
        if (!paths[end].some(candidate => Math.abs(candidate.feet - feet) < .04)) paths[end].push({ feet, labels: [...path.labels, dim.text] });
      }
      if (paths[end].length > 6) return null;
    }
    const final = paths.at(-1);
    if (final.length !== 1 || final[0].labels.length < 3) return null;
    const { feet, labels } = final[0];
    if (Math.abs(feet / ((bottom.y - top.y) * feetPerPixel) - 1) > .02) return null;
    return { feet, text: labels.join(' + ') };
  }

  function roofProfile(image, span, ridge, eaves) {
    if (!span || !ridge?.line || !eaves?.line || eaves.y - ridge.y < 15) return null;
    const rise = eaves.y - ridge.y;
    const from = Math.round(span.start + span.span * .05), to = Math.round(span.end - span.span * .05);
    let ridgeRun = null;
    for (let y = Math.round(ridge.y - rise * .045); y <= Math.round(ridge.y + rise * .07); y++) {
      const line = horizontalRun(image, y, from, to, 187, 3);
      if (line && (!ridgeRun || line.end - line.start > ridgeRun.end - ridgeRun.start)) ridgeRun = line;
    }
    const fraction = ridgeRun ? (ridgeRun.end - ridgeRun.start) / span.span : 0;
    if (fraction > .76) return 'flat';
    const midpoint = (span.start + span.end) / 2;
    const trapezoid = fraction >= .15 && fraction <= .66 && ridgeRun.start > from && ridgeRun.end < to;
    const leftRidge = trapezoid ? ridgeRun.start : midpoint;
    const rightRidge = trapezoid ? ridgeRun.end : midpoint;
    const followsSlope = (high, low) => {
      let supported = 0;
      for (const t of [.16, .29, .42, .55, .68, .81]) {
        const y = Math.round(ridge.y + t * rise), x = Math.round(high + t * (low - high));
        for (let q = x - Math.round(span.span * .05); q <= x + Math.round(span.span * .05); q++) {
          if (ink(image, q, y, 175)) { supported++; break; }
        }
      }
      return supported >= 5;
    };
    if (!followsSlope(leftRidge, span.start) || !followsSlope(rightRidge, span.end)) return null;
    if (trapezoid) return 'trapezoid';
    return fraction < .12 ? 'triangle' : null;
  }

  function evidence({ rows, words = [], verticalRows = [], page, view, crop, accepted = [], geometry }, parseDimension) {
    if (!view.face && view.kind !== 'section') return [];
    const image = geometry?.image;
    const levels = readLevels(rows, image, crop, parseDimension, words);
    const span = readSpan(rows, accepted, image, crop, levels, parseDimension);
    const feetPerPixel = span ? span.feet / span.span : null;
    const entries = [];
    const add = (field, value, text, method, details = {}) => entries.push({ field, value, text, method, page, view: view.name, ...details });
    if (span && view.face) {
      const field = ['left', 'right'].includes(view.face) ? 'depth' : 'width';
      add(field, span.feet * METRES_PER_FOOT, span.text, 'cote horizontale entre les repères extérieurs');
    }
    for (const [field, upper, lower] of [['wallHeight', 'eaves', 'grade'], ['roofRise', 'ridge', 'eaves']]) {
      const top = levels[upper], bottom = levels[lower];
      if (!top || !bottom || top.y >= bottom.y) continue;
      if (top.ceiling && !levels.ridge && !top.explicit) continue;
      const text = top.text + ' / ' + bottom.text;
      if (top.explicit && bottom.explicit && top.value > bottom.value) {
        add(field, (top.value - bottom.value) * METRES_PER_FOOT, text, 'écart entre niveaux cotés');
        continue;
      }
      if (!view.face) continue;
      const written = byVerticalDimension(top, bottom, verticalRows, accepted, feetPerPixel, parseDimension, crop[2]);
      const chain = field === 'wallHeight' && !written && byVerticalChain(top, bottom, levels.storeys, verticalRows, accepted, feetPerPixel, parseDimension, crop[2]);
      if (written) add(field, written.feet * METRES_PER_FOOT, written.text + ' · ' + text, 'cote verticale entre les niveaux repérés');
      else if (chain) add(field, chain.feet * METRES_PER_FOOT, chain.text + ' · ' + text, 'chaîne verticale entre les niveaux repérés');
      else if (feetPerPixel && top.line && bottom.line) {
        const feet = (bottom.y - top.y) * feetPerPixel;
        if (feet >= 1 && feet <= 300) add(field, feet * METRES_PER_FOOT, text, 'distance sur une élévation calibrée', { estimated: true });
      }
    }
    const profile = view.face && image && roofProfile(image, span, levels.ridge, levels.eaves);
    if (profile) add('roofProfile', profile, levels.ridge.text, 'silhouette de toiture', { face: view.face });
    return entries;
  }

  return Object.freeze({ evidence });
});
