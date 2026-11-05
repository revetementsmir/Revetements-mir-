/* Classifies architectural view titles and retains traceable building dimensions. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRSheetDetection = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const normal = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const directions = [
    ['front', /(?:avant|principale|front)(?:\s|$)/],
    ['back', /(?:arriere|posterieur[e]?|rear|back)(?:\s|$)/],
    ['left', /(?:gauche|left)(?:\s|$)/],
    ['right', /(?:droit[e]?|right)(?:\s|$)/]
  ];
  const center = (box, axis) => (box[axis] + box[axis + 2]) / 2;

  function lines(words) {
    const sorted = words.filter(w => w.box && w.text.trim()).slice(0, 10000)
      .sort((a, b) => center(a.box, 1) - center(b.box, 1));
    const rows = [];
    for (const word of sorted) {
      const y = center(word.box, 1), height = word.box[3] - word.box[1];
      const row = rows.at(-1);
      if (!row || Math.abs(row.y - y) > Math.min(row.height, height) * .55) rows.push({ y, height, words: [word] });
      else row.words.push(word);
    }
    return rows.flatMap(row => {
      const result = [];
      for (const word of row.words.sort((a, b) => a.box[0] - b.box[0])) {
        const previous = result.at(-1);
        if (previous && word.box[0] - previous.box[2] <= row.height * 2.6) {
          previous.text += ' ' + word.text;
          previous.box = [previous.box[0], Math.min(previous.box[1], word.box[1]), Math.max(previous.box[2], word.box[2]), Math.max(previous.box[3], word.box[3])];
          previous.confidence = Math.min(previous.confidence, word.confidence ?? 100);
        } else result.push({ ...word, confidence: word.confidence ?? 100, box: [...word.box] });
      }
      return result;
    });
  }

  function classify(text) {
    const title = normal(text).replace(/^\s*\d{1,2}\s*(?:[.)/–-]\s*|\s+)/, '');
    if (/\b(?:existant[e]?s?|demolition|existing|detail|details|typique|typical|legende|legend|voir|see)\b/.test(title)) return null;
    const frontTitle = title.match(/^(?:elevations?|facades?|vues?\s+(?:de\s+)?(?:face\s+)?|cote)\s+(?:(?:exterieur[e]?s?|facade|laterale|du|de la)\s+)*(.*)$/);
    const englishTitle = title.match(/^(front|rear|back|left(?: side)?|right(?: side)?)\s+elevation\b/);
    const direction = frontTitle?.[1] || englishTitle?.[1];
    if (direction) {
      const side = directions.find(([, re]) => re.test(direction));
      if (side) return { kind: 'elevation', face: side[0] };
      if (/\b(?:nord|sud|est|ouest|north|south|east|west)\b/.test(direction)) return { kind: 'reference' };
    }
    if (/^(?:plan\s+(?:(?:du|de|des|d'|de la)\s*)?(?:solage|fondations?)|(?:solage|fondations?)\s*(?:[-–:]|$)|foundation\s+plan\b)/.test(title)) return { kind: 'foundation' };
    if (/^(?:plan\s+(?:(?:du|des|de la|de l'|de|d')\s*)?(?:rez[ -]de[ -]chaussee|sous[ -]sol|etages?|niveaux?|niveau|(?:\d{1,2}(?:e|er|eme)?|premier|deuxieme|troisieme)\s+etage)|rez[ -]de[ -]chaussee\s*(?:[-–:]|$)|(?:basement|ground|first|second|third|upper|main)\s+floor\s+plan\b|floor\s+plan\b)/.test(title)) return { kind: 'floor' };
    if (/^(?:coupe|(?:building |cross )?section)\s+(?:[a-z]\s*[-–/]\s*[a-z]|[a-z0-9]{1,3}\b|(?:du\s+)?batiment\b)/.test(title)) return { kind: 'section' };
    return null;
  }

  function viewsForPage(rows) {
    const result = [];
    for (const row of rows) {
      if (row.confidence < 55 || row.text.length > 105) continue;
      const view = classify(row.text);
      if (!view) continue;
      const title = normal(row.text), previous = result.find(r => r.title === title && Math.abs(center(r.box, 0) - center(row.box, 0)) < 6 && Math.abs(center(r.box, 1) - center(row.box, 1)) < 6);
      if (!previous) result.push({ ...view, name: row.text, title, box: row.box, source: row.source });
    }
    return result;
  }

  function divideViews(views, width, height) {
    if (views.length <= 1) return views.map(view => ({ ...view, crop: [0, 0, width, height] }));
    const rows = [];
    for (const view of [...views].sort((a, b) => center(a.box, 1) - center(b.box, 1))) {
      const y = center(view.box, 1), row = rows.at(-1);
      if (!row || Math.abs(row.y - y) > height * .10) rows.push({ y, views: [view] });
      else row.views.push(view);
    }
    const titlesBelow = rows[0].y > height - rows.at(-1).y;
    const cuts = [0, ...rows.slice(1).map((row, i) => Math.round(titlesBelow ? rows[i].y + height * .035 : row.y - height * .035)), height];
    return rows.flatMap((row, i) => {
      const ordered = row.views.sort((a, b) => center(a.box, 0) - center(b.box, 0));
      const columns = [0, ...ordered.slice(1).map((view, j) => Math.round((center(view.box, 0) + center(ordered[j].box, 0)) / 2)), width];
      return ordered.map((view, j) => ({ ...view, crop: [columns[j], cuts[i], columns[j + 1] - columns[j], cuts[i + 1] - cuts[i]], split: true }));
    });
  }

  const dimensions = [
    ['width', /^(?:largeur\s+(?:totale|hors tout|(?:du\s+)?batiment)|overall\s+(?:building\s+)?width)\s*[:=]?\s*/],
    ['depth', /^(?:profondeur\s+(?:totale|hors tout|(?:du\s+)?batiment)|overall\s+(?:building\s+)?depth)\s*[:=]?\s*/],
    ['wallHeight', /^(?:hauteur\s+(?:totale\s+)?(?:des murs?|du mur)(?:\s+(?:exterieurs?|exterieur[e]?))?|(?:overall\s+)?(?:exterior\s+)?wall height)\s*[:=]?\s*/],
    ['roofRise', /^(?:montee\s+(?:du toit|de la toiture)|hauteur\s+(?:du toit|de la toiture)\s+(?:au-dessus des murs|depuis la sabliere)|roof rise)\s*[:=]?\s*/],
    ['foundationDrop', /^(?:hauteur\s+(?:du solage|des fondations?)\s+apparente|(?:exposed|visible)\s+foundation height)\s*[:=]?\s*/]
  ];
  const roofStyles = [
    ['flat', /^(?:(?:toit|toiture)\s+plat[e]?|flat roof)$/],
    ['gable', /^(?:(?:toit|toiture)\s+(?:a\s+)?(?:deux|2)\s+versants|gable roof)$/],
    ['hip', /^(?:(?:toit|toiture)\s+(?:a\s+)?(?:quatre|4)\s+versants|hip roof)$/]
  ];
  const levels = [
    ['base', /^(?:base du mur(?: exterieur)?|dessus (?:du solage|des fondations?)|top of foundation)\s*[:=]?\s*/],
    ['eaves', /^(?:haut (?:du mur|des murs)(?: exterieurs?)?|(?:niveau |ligne de )?(?:la )?sabliere|top of (?:exterior )?wall|eaves? level)\s*[:=]?\s*/],
    ['ridge', /^(?:niveau (?:du )?faite|faite du toit|ridge level)\s*[:=]?\s*/]
  ];
  function outlineEvidence(accepted, view, page) {
    if (!view.face) return [];
    const field = ['left', 'right'].includes(view.face) ? 'depth' : 'width';
    const spans = accepted.filter(c => c.axis === 'x' && c.score >= .77 && c.referenceFt >= 3 && !c.corrected)
      .map(c => {
        const [a, b] = [...c.anchors].sort((p, q) => p[0] - q[0]);
        return { start: a[0], end: b[0], y: (a[1] + b[1]) / 2, feet: c.referenceFt, text: c.normalized };
      }).sort((a, b) => (b.end - b.start) - (a.end - a.start));
    // An overall dimension must span the other accepted dimensions and be
    // corroborated by a continuous chain on a separate dimension line.
    const overall = spans[0];
    if (!overall || overall.feet < 12) return [];
    const tolerance = Math.max(4, (overall.end - overall.start) * .018);
    if (spans.some(s => s.start < overall.start - tolerance || s.end > overall.end + tolerance)) return [];
    for (const first of spans.slice(1)) {
      if (Math.abs(first.start - overall.start) > tolerance || Math.abs(first.y - overall.y) < tolerance || first.end >= overall.end - tolerance) continue;
      let end = first.end, feet = first.feet;
      for (const part of spans.filter(s => s.start >= first.start && Math.abs(s.y - first.y) <= tolerance).sort((a, b) => a.start - b.start)) {
        if (Math.abs(part.start - end) <= tolerance && part.end > end + tolerance) { end = part.end; feet += part.feet; }
      }
      if (Math.abs(end - overall.end) <= tolerance && Math.abs(feet - overall.feet) <= .08)
        return [{ field, value: overall.feet * .3048, text: overall.text, page, view: view.name, method: 'chaîne de cotes concordante' }];
    }
    return [];
  }
  function volumeEvidence(rows, view, page, parseDimension, accepted = []) {
    const entries = [];
    const markedLevels = {};
    for (const row of rows) {
      if (row.confidence < 70 || row.text.length > 140) continue;
      const text = normal(row.text), roof = text.replace(/^(?:forme de toiture|type de toit|roof type)\s*[:=]\s*/, '');
      for (const [value, re] of roofStyles) if (re.test(roof)) entries.push({ field: 'roofStyle', value, text: row.text, page, view: view.name });
      const pair = text.match(/^(?:dimensions\s+(?:hors tout|du batiment)|overall building dimensions)\s*[:=]?\s*(.+?)\s*[x×]\s*(.+)$/);
      if (pair && ['foundation', 'floor'].includes(view.kind)) {
        const values = pair.slice(1).map(value => parseDimension(value)?.valueFt);
        if (values.every(Number.isFinite)) for (const [i, field] of ['width', 'depth'].entries()) entries.push({ field, value: values[i] * .3048, text: row.text, page, view: view.name });
      }
      for (const [key, re] of dimensions) {
        const match = text.match(re);
        if (!match) continue;
        const field = key === 'width' && ['left', 'right'].includes(view.face) && !/batiment|building/.test(match[0]) ? 'depth' : key;
        const value = parseDimension(text.slice(match[0].length))?.valueFt;
        if (Number.isFinite(value) && value <= 1000) entries.push({ field, value: value * .3048, text: row.text, page, view: view.name });
      }
      if (view.face || view.kind === 'section') for (const [key, re] of levels) {
        const match = text.match(re);
        if (!match) continue;
        const raw = text.slice(match[0].length).trim(), number = raw.replace(/^[+−-]\s*/, '');
        const magnitude = /^0(?:[.,]0+)?\s*(?:m|mm|cm|pi|ft|')$/.test(number) ? 0 : parseDimension(number)?.valueFt;
        if (Number.isFinite(magnitude)) (markedLevels[key] ||= []).push({ value: magnitude * (/^[-−]/.test(raw) ? -1 : 1), text: row.text });
      }
    }
    for (const [field, top, bottom] of [['wallHeight', 'eaves', 'base'], ['roofRise', 'ridge', 'eaves']]) {
      const upper = markedLevels[top], lower = markedLevels[bottom];
      if (upper?.length !== 1 || lower?.length !== 1) continue;
      const difference = upper[0].value - lower[0].value;
      if (difference > 0 && difference <= 1000)
        entries.push({ field, value: difference * .3048, text: upper[0].text + ' / ' + lower[0].text, page, view: view.name, method: 'écart entre niveaux repérés' });
    }
    return [...entries, ...outlineEvidence(accepted, view, page).filter(e => !entries.some(explicit => explicit.field === e.field))];
  }

  function volumeFrom(evidence) {
    const result = {}, conflicts = [];
    for (const field of [...dimensions.map(([field]) => field), 'roofStyle']) {
      const values = evidence.filter(e => e.field === field).map(e => e.value);
      const agrees = values.every(v => typeof v === 'number' ? Math.abs(v - values[0]) <= .015 : v === values[0]);
      result[field] = values.length && agrees ? values[0] : null;
      if (values.length && !agrees) conflicts.push(field);
    }
    if (result.roofStyle === 'flat') {
      if (result.roofRise > 0 || conflicts.includes('roofRise')) {
        result.roofStyle = null;
        result.roofRise = null;
        conflicts.push('roofStyle');
      } else result.roofRise = 0;
    }
    return { dimensions: { width: result.width, depth: result.depth, wallHeight: result.wallHeight, roofRise: result.roofRise }, roofStyle: result.roofStyle, foundationDrop: result.foundationDrop, conflicts, evidence };
  }

  return Object.freeze({ lines, classify, viewsForPage, divideViews, volumeEvidence, volumeFrom });
});
