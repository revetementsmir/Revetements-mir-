/* Browser-local architectural PDF import. Only the detected views are rendered at full resolution. */
(function () {
  'use strict';
  const BASE = new URL('.', document.currentScript?.src || location.href);
  const asset = path => new URL(path, BASE).href;
  const FACE_NAMES = { front: 'Avant', right: 'Droite', back: 'Arrière', left: 'Gauche' };
  const VOLUME_NAMES = { width: 'largeur', depth: 'profondeur', wallHeight: 'hauteur des murs', roofRise: 'montée du toit', roofStyle: 'forme de toiture' };
  const MIB = 1024 * 1024, MAX_FILE_MB = 150;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let dialog, current, pdfLibrary, callback, sequence = 0;
  const $ = selector => dialog.querySelector(selector);
  function script(path, expected) {
    if (window[expected]) return Promise.resolve(window[expected]);
    return new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = asset(path);
      tag.onload = () => resolve(window[expected]);
      tag.onerror = () => { tag.remove(); reject(new Error('Un outil de lecture du PDF n’a pas chargé. Rechargez la page puis réessayez.')); };
      document.head.append(tag);
    });
  }
  async function dependencies() {
    await Promise.all([
      script('plan-import-core.js', 'MIRPDFAnalysis'),
      script('plan-structure-notes.js', 'MIRStructuralNotes'),
      script('plan-sheet-detection.js?v=1', 'MIRSheetDetection'),
      script('project-store.js', 'MIRProjectStore')
    ]);
    if (!pdfLibrary) {
      pdfLibrary = await import(asset('vendor/pdfjs/pdf.min.mjs'));
      pdfLibrary.GlobalWorkerOptions.workerSrc = asset('vendor/pdfjs/pdf.worker.min.mjs');
    }
  }
  function progress(message, percent) {
    $('#mir-pdf-status').textContent = message;
    const bar = $('#mir-pdf-progress');
    bar.hidden = percent == null;
    if (percent != null) bar.value = percent;
  }
  function error(message) {
    $('#mir-pdf-error').textContent = message;
    $('#mir-pdf-error').hidden = !message;
  }
  function busy(value) {
    current.busy = value;
    $('#mir-pdf-file').disabled = value;
    $('#mir-pdf-final').disabled = value || !current.ready;
  }
  function element() {
    if (dialog) return;
    if (!document.querySelector('link[data-mir-pdf-style]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = asset('plan-import.css?v=analyse-auto'); css.dataset.mirPdfStyle = '';
      document.head.append(css);
    }
    dialog = document.createElement('dialog');
    dialog.id = 'mir-pdf-import';
    dialog.className = 'mir-pdf-dialog';
    dialog.setAttribute('aria-labelledby', 'mir-pdf-title');
    dialog.innerHTML = `<div class="mir-pdf-shell">
      <header class="mir-pdf-head"><div><p class="mir-pdf-eyebrow">VOTRE MAISON, VOTRE PROJET</p><h2 id="mir-pdf-title">Importez votre plan.</h2><p>Le Studio repère le solage, les étages et les élévations pour préparer votre maquette.</p></div><button type="button" id="mir-pdf-close" aria-label="Fermer l’import du PDF">Fermer ×</button></header>
      <div class="mir-pdf-steps" aria-label="Étapes de l’import"><span><b>1</b> Votre PDF</span><span><b>2</b> Analyse automatique</span><span><b>3</b> Votre studio</span></div>
      <div class="mir-pdf-upload"><label for="mir-pdf-file"><strong>Choisir mon PDF</strong><span>Fichier de ${MAX_FILE_MB} Mo maximum</span><input id="mir-pdf-file" type="file" accept="application/pdf,.pdf"></label><p>Le PDF et son analyse restent sur cet appareil.</p></div>
      <div id="mir-pdf-error" class="mir-pdf-error" role="alert" hidden></div>
      <div class="mir-pdf-working"><p id="mir-pdf-status" role="status" aria-live="polite"></p><progress id="mir-pdf-progress" aria-label="Analyse du PDF" max="100" hidden></progress></div>
      <footer class="mir-pdf-bottom"><div><h3>Vues repérées</h3><div id="mir-pdf-assigned" class="mir-pdf-assigned"></div><p id="mir-pdf-volume-note" class="mir-pdf-fine"></p></div><button type="button" id="mir-pdf-final" class="mir-pdf-primary" disabled>Ouvrir mon projet →</button></footer>
    </div>`;
    document.body.append(dialog);
    $('#mir-pdf-close').onclick = () => close();
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    $('#mir-pdf-file').onchange = event => void load(event.target.files?.[0]);
    $('#mir-pdf-final').onclick = finish;
  }
  function fresh() { return { file: null, job: null, pageCount: 0, assignments: {}, references: [], sha256: null, ready: false }; }
  function open(options = {}) {
    element();
    callback = typeof options.onImport === 'function' ? options.onImport : null;
    if (dialog.open) return;
    current = fresh();
    $('#mir-pdf-file').value = '';
    $('#mir-pdf-close').disabled = false;
    error('');
    progress('Choisissez le PDF de votre projet.', null);
    renderSummary();
    busy(false);
    dialog.showModal();
    $('#mir-pdf-file').focus();
  }
  function close() {
    if (!dialog?.open || current.saving) return;
    sequence++;
    const job = current.job;
    current.job = null;
    job?.destroy().catch(() => {});
    dialog.close();
    current = null;
  }
  async function load(file) {
    if (!file) return;
    const token = ++sequence, imported = current = fresh();
    imported.file = file;
    error('');
    progress('Vérification du fichier…', 0);
    renderSummary();
    busy(true);
    try {
      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('Choisissez un fichier PDF.');
      if (file.size > MAX_FILE_MB * MIB) throw new Error(`Ce PDF dépasse ${MAX_FILE_MB} Mo. Exportez une copie contenant seulement les feuilles utiles.`);
      if (file.size < 32) throw new Error('Ce fichier est vide ou incomplet.');
      await dependencies();
      if (token !== sequence) return;
      const buffer = await file.arrayBuffer();
      if (token !== sequence) return;
      if (!new TextDecoder('latin1').decode(buffer.slice(0, 1024)).includes('%PDF-')) throw new Error('Le contenu de ce fichier ne correspond pas à un PDF.');
      if (file.size <= 50 * MIB && globalThis.crypto?.subtle?.digest) {
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        if (token !== sequence) return;
        imported.sha256 = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
      }
      imported.job = pdfLibrary.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, enableXfa: false, cMapUrl: asset('vendor/pdfjs/cmaps/'), cMapPacked: true, standardFontDataUrl: asset('vendor/pdfjs/standard_fonts/'), wasmUrl: asset('vendor/pdfjs/wasm/'), stopAtErrors: false });
      const pdf = await imported.job.promise;
      if (token !== sequence) return;
      imported.pageCount = pdf.numPages;
      await detectSheets(pdf, imported, token);
      if (token !== sequence) return;
      imported.ready = !!(Object.keys(imported.assignments).length || imported.references.length);
      renderSummary();
      progress(imported.ready ? 'Analyse terminée. Votre dossier est prêt.' : 'Analyse terminée. Aucune vue utilisable repérée.', null);
      if (!imported.ready) error('Le PDF doit contenir des vues dont les titres sont lisibles, par exemple « Plan des fondations », « Plan du rez-de-chaussée » ou « Élévation avant ».');
    } catch (e) {
      if (token === sequence) { error(readableError(e)); progress('Le PDF n’a pas été importé.', null); }
    } finally {
      const job = imported.job;
      imported.job = null;
      await job?.destroy().catch(() => {});
      imported.ocrPromise?.then(worker => worker.terminate()).catch(() => {});
      if (token === sequence) busy(false);
    }
  }
  function readableError(e) {
    if (e?.name === 'PasswordException') return 'Ce PDF est protégé par un mot de passe. Importez une copie déverrouillée.';
    if (e?.name === 'InvalidPDFException') return 'Ce PDF semble endommagé. Essayez une nouvelle exportation.';
    if (e?.name === 'QuotaExceededError') return 'L’espace disponible sur cet appareil est insuffisant pour conserver ce PDF.';
    const message = String(e?.message || '');
    if (/^(?:Ce |Le |La |Les |Choisissez |Importez |Un |Une |Fermez |L’|L'|Votre )/.test(message)) return message;
    console.warn('MIR PDF : lecture interrompue', e);
    return 'La lecture de ce PDF n’a pas réussi. Réessayez ou importez une nouvelle exportation de votre plan.';
  }

  function pdfWords(items, viewport, clockwise = false) {
    const matrix = clockwise
      ? pdfLibrary.Util.transform([0, 1, -1, 0, Math.round(viewport.height), 0], viewport.transform)
      : viewport.transform;
    return items.slice(0, 12000).flatMap(item => {
      if (!item.str?.trim() || !item.transform) return [];
      const tr = pdfLibrary.Util.transform(matrix, item.transform), length = Math.abs(item.width * viewport.scale), height = Math.hypot(tr[2], tr[3]);
      if (!(length > 0 && height > 0) || Math.abs(Math.sin(Math.atan2(tr[1], tr[0]))) > .28) return [];
      const x0 = Math.min(tr[4], tr[4] + Math.sign(tr[0]) * length);
      return [{ text: item.str, box: [x0, tr[5] - height, x0 + length, tr[5]], confidence: 100, source: 'pdf-text' }];
    });
  }
  async function raster(page, viewport) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    try {
      await page.render({ canvasContext: ctx, viewport, background: '#fff', annotationMode: pdfLibrary.AnnotationMode.DISABLE }).promise;
      return canvas;
    } catch (e) { canvas.width = canvas.height = 1; throw e; }
  }
  function ocr(imported) {
    if (!imported.ocrPromise) imported.ocrPromise = (async () => {
      await script('vendor/tesseract/tesseract.min.js', 'Tesseract');
      const worker = await Tesseract.createWorker('eng', 1, { workerPath: asset('vendor/tesseract/worker.min.js'), corePath: asset('vendor/tesseract-core/'), langPath: asset('vendor/tessdata/'), workerBlobURL: false, gzip: true });
      try { await worker.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' }); }
      catch (e) { await worker.terminate(); throw e; }
      return worker;
    })();
    return imported.ocrPromise;
  }
  async function recognize(page, base, imported) {
    const scale = Math.min(3, 1550 / Math.max(base.width, base.height));
    const canvas = await raster(page, page.getViewport({ scale }));
    try {
      const worker = await ocr(imported);
      const result = await worker.recognize(canvas, {}, { blocks: true });
      const words = [];
      for (const block of result.data.blocks || []) for (const paragraph of block.paragraphs || [])
        for (const line of paragraph.lines || []) for (const word of line.words || []) {
          if (!word.text?.trim() || !word.bbox) continue;
          const {x0, y0, x1, y1} = word.bbox;
          words.push({ text: word.text, box: [x0, y0, x1, y1].map(value => value / scale), confidence: word.confidence, source: 'ocr' });
        }
      return words;
    } finally { canvas.width = canvas.height = 1; }
  }
  const inCrop = (word, [x, y, w, h]) => {
    const [left, top, right, bottom] = word.box;
    return (left + right) / 2 >= x && (left + right) / 2 <= x + w && (top + bottom) / 2 >= y && (top + bottom) / 2 <= y + h;
  };

  async function detectSheets(pdf, imported, token) {
    const detector = window.MIRSheetDetection, prepared = [];
    let skipped = 0, ocrFailed = false;
    for (let number = 1; number <= pdf.numPages; number++) {
      if (token !== sequence) return;
      if (number === 1 || number % 5 === 0 || number === pdf.numPages) progress(`Analyse des feuilles · ${number} sur ${pdf.numPages}…`, 5 + number / pdf.numPages * 55);
      let page;
      try {
        page = await pdf.getPage(number);
        const base = page.getViewport({ scale: 1 }), items = (await page.getTextContent()).items;
        if (token !== sequence) return;
        let words = pdfWords(items, base), rows = detector.lines(words), views = detector.viewsForPage(rows);
        const textLength = words.reduce((total, word) => total + word.text.trim().length, 0);
        if (!views.length && textLength < 45 && !ocrFailed) {
          try {
            const scanned = await recognize(page, base, imported);
            if (token !== sequence) return;
            if (scanned.length) { words = scanned; rows = detector.lines(words); views = detector.viewsForPage(rows); }
          } catch (e) { ocrFailed = true; if (token === sequence) console.warn('MIR PDF : lecture des feuilles scannées indisponible', e); }
        }
        if (views.length) prepared.push({ number, words, views: detector.divideViews(views, base.width, base.height) });
      } catch (e) { if (token === sequence) { skipped++; console.warn('MIR PDF : feuille illisible', number, e); } }
      finally { page?.cleanup(); }
    }
    const evidence = [];
    for (const [i, sheet] of prepared.entries()) {
      if (token !== sequence) return;
      progress(`Préparation des vues · feuille ${i + 1} sur ${prepared.length}…`, 62 + i / prepared.length * 34);
      let page, canvas;
      try {
        page = await pdf.getPage(sheet.number);
        const base = page.getViewport({ scale: 1 }), scale = Math.min(3, 2100 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        canvas = await raster(page, viewport);
        if (token !== sequence) return;
        const words = sheet.words.map(word => ({ ...word, box: word.box.map(value => value * scale) }));
        const rows = detector.lines(words);
        let hints = window.MIRStructuralNotes.detect(rows, '');
        if (!hints.length && !ocrFailed && sheet.views.some(view => view.face) && words.every(word => word.source === 'pdf-text')) {
          try {
            const scanned = await recognize(page, base, imported);
            hints = window.MIRStructuralNotes.detect(detector.lines(scanned.map(word => ({ ...word, box: word.box.map(value => value * scale) }))), '');
          } catch (e) { ocrFailed = true; if (token === sequence) console.warn('MIR PDF : lecture des repères dessinés indisponible', e); }
          if (token !== sequence) return;
        }
        hints = hints.map(hint => ({ ...hint, page: sheet.number, needsReview: true }));
        const items = (await page.getTextContent()).items;
        if (token !== sequence) return;
        const verticalWords = pdfWords(items, viewport, true);
        for (const view of sheet.views) {
          const crop = view.crop.map(value => Math.round(value * scale));
          crop[2] = Math.min(crop[2], canvas.width - crop[0]);
          crop[3] = Math.min(crop[3], canvas.height - crop[1]);
          if (crop[2] < 40 || crop[3] < 40) continue;
          const localRows = rows.filter(word => inCrop(word, crop));
          const scale = measureLines(canvas, words, verticalWords, crop);
          const structuralHints = window.MIRStructuralNotes.withinCrop(hints, crop);
          const result = prepareView(canvas, crop, structuralHints, sheet.number, view, scale);
          evidence.push(...detector.volumeEvidence(localRows, view, sheet.number, MIRPDFAnalysis.parseDimension, scale.feetPerPixel ? scale.accepted : []));
          if (view.face && !imported.assignments[view.face]) imported.assignments[view.face] = result;
          else imported.references.push(result);
        }
      } catch (e) { if (token === sequence) { skipped++; console.warn('MIR PDF : vue non préparée', sheet.number, e); } }
      finally { if (canvas) canvas.width = canvas.height = 1; page?.cleanup(); }
    }
    imported.volume = detector.volumeFrom(evidence);
    imported.skipped = skipped;
    imported.ocrFailed = ocrFailed;
  }

  function measureLines(canvas, words, verticalWords, crop) {
    const A = window.MIRPDFAnalysis, [x, y, width, height] = crop;
    const isDimension = word => /^[\d\s'’′"″“”¼½¾⅛⅜⅝⅞.,+\-–—/⁄]+$/.test(word.text) || A.parseDimension(word.text);
    const select = (list, box) => list.filter(word => inCrop(word, box) && isDimension(word)).slice(0, 800);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const horizontal = select(words, crop);
    const vertical = select(verticalWords, [canvas.height - y - height, x, height, width]);
    const candidates = horizontal.length ? A.matchDimensionLines(ctx.getImageData(0, 0, canvas.width, canvas.height), horizontal) : [];
    if (vertical.length) {
      const turned = document.createElement('canvas'); turned.width = canvas.height; turned.height = canvas.width;
      try {
        const context = turned.getContext('2d', { willReadFrequently: true });
        context.translate(turned.width, 0); context.rotate(Math.PI / 2); context.drawImage(canvas, 0, 0);
        const matches = A.matchDimensionLines(context.getImageData(0, 0, turned.width, turned.height), vertical, { axis: 'y' });
        candidates.push(...matches.map(c => A.unrotateCandidate(c, canvas.width, canvas.height, 'cw')));
      } finally { turned.width = turned.height = 1; }
    }
    return A.resolveScale(candidates.filter(candidate => candidate.anchors.every(([a, b]) => a >= x && a <= x + width && b >= y && b <= y + height)));
  }
  function prepareView(canvas, crop, structuralHints, number, view, scale) {
    const [x, y, w, h] = crop, A = window.MIRPDFAnalysis;
    const image = document.createElement('canvas'); image.width = w; image.height = h;
    const context = image.getContext('2d', { willReadFrequently: true });
    let sourceImage, regions;
    try {
      context.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      sourceImage = image.toDataURL('image/jpeg', .91);
      regions = view.face ? A.proposeColoredZones(context.getImageData(0, 0, w, h)) : [];
    } finally { image.width = image.height = 1; }
    const cal = calibration(scale, crop);
    if (!view.face) return { page: number, crop, sourceImage, calibration: cal, kind: view.kind, name: view.name, structuralHints };
    const zones = regions.map((r, i) => ({ id: `pdf-zone-${i + 1}`, name: `Zone ${i + 1}`, polygon: r.polygon, kind: 'siding', parent: null, provenance: r.provenance, needsReview: true, detected: true }));
    const openings = regions.flatMap((r, i) => r.holes.filter(p => { const b = A.bbox(p); return b[2] - b[0] > 15 && b[3] - b[1] > 15; }).map((p, j) => ({ id: `pdf-opening-${i + 1}-${j + 1}`, type: 'window', polygon: p, bbox: A.bbox(p), occluded: false, dimension: 'Ouverture détectée à vérifier.', needsReview: true })));
    return { ...placeholder(view.face), kind: 'elevation', page: number, bbox: [0, 0, w, h], textureBox: [0, 0, w, h], zones, openings, sourceImage, sourceImageBox: [0, 0, w, h], sourceWidth: w, sourceHeight: h, sourcePageSize: [canvas.width, canvas.height], sourceCrop: crop, calibration: cal, importedStatus: 'assigned', calibrationStatus: cal.status, structuralHints, detected: { regions: zones.length, openings: openings.length, method: 'Surfaces colorées repérées localement.' }, printedDimensions: cal.evidence.map(c => c.normalized || c.text), textureReference: view.split ? 'Cadrage automatique d’une feuille avec plusieurs vues.' : 'Élévation repérée par le titre de la feuille.' };
  }
  function placeholder(key) { return { key, name: FACE_NAMES[key], page: null, bbox: [0, 0, 1200, 800], textureBox: [0, 0, 1200, 800], physicalWidth: null, zones: [], openings: [], roof: [], base: [], fascia: [], soffit: [], detected: {}, candidates: [], occlusions: [], printedDimensions: [], importedStatus: 'unassigned', calibrationStatus: 'not_found', textureBottom: 0, textureReference: 'Façade non importée.', sourceImage: null }; }
  function calibration(s, crop) {
    const [x, y] = crop;
    if (!s?.feetPerPixel || !s.referenceFt || !s.anchors) return { referenceFt: null, anchors: [], verified: false, status: s?.status || 'not_found', provenance: 'Aucune échelle retenue; aucune surface calculable.', evidence: [] };
    return { referenceFt: s.referenceFt, anchors: s.anchors.map(p => [p[0] - x, p[1] - y]), verified: false, status: s.status, provenance: 'Cote écrite reliée automatiquement aux intersections de sa ligne et de ses rappels; échelle proposée à vérifier.', evidence: (s.accepted || []).map(c => ({ text: c.text, normalized: c.normalized, referenceFt: c.referenceFt, anchors: c.anchors.map(p => [p[0] - x, p[1] - y]), spanPx: c.spanPx, axis: c.axis, source: c.source, ocrConfidence: c.confidence ?? null, correctedCharacters: !!c.corrected })), spread: s.spread ?? null, axesCompared: !!(s.scaleX && s.scaleY) };
  }
  function renderSummary() {
    const rows = [...Object.values(current.assignments), ...current.references];
    $('#mir-pdf-assigned').innerHTML = rows.map(row => `<span class="ready"><b>${esc(row.name)}</b><small>Page ${row.page}</small></span>`).join('') || '<p>Les vues détectées apparaîtront ici.</p>';
    const volume = current.volume;
    if (!volume) { $('#mir-pdf-volume-note').textContent = ''; return; }
    const missing = Object.entries(VOLUME_NAMES).filter(([key]) => (key === 'roofStyle' ? volume.roofStyle : volume.dimensions[key]) == null).map(([, label]) => label);
    const cautions = [];
    if (volume.conflicts.length) cautions.push('Des cotes se contredisent.');
    if (current.skipped || current.ocrFailed) cautions.push('Certaines feuilles n’ont pas pu être lues.');
    if (!Object.keys(current.assignments).length) cautions.push('Aucune élévation orientée avant, arrière, gauche ou droite n’a été reconnue.');
    $('#mir-pdf-volume-note').textContent = [
      missing.length ? `À compléter dans Volume & retours : ${missing.join(', ')}.` : 'Cotes principales repérées. La maquette 3D s’ouvrira automatiquement.',
      ...cautions
    ].join(' ');
  }

  async function finish() {
    if (current.busy || !current.ready) return;
    const imported = current, done = callback;
    imported.saving = true; $('#mir-pdf-close').disabled = true;
    busy(true); error(''); progress('Enregistrement du dossier…', 98);
    try {
      const id = `pdf-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)}`;
      const faces = Object.keys(FACE_NAMES).map(key => imported.assignments[key] || placeholder(key));
      const calibrations = Object.fromEntries(faces.map(f => [f.key, f.calibration || { referenceFt: null, anchors: [], verified: false, status: 'not_found', provenance: 'Façade non repérée.', evidence: [] }]));
      const source = { filename: imported.file.name, bytes: imported.file.size, pageCount: imported.pageCount, sha256: imported.sha256, fingerprintStatus: imported.sha256 ? 'sha256' : imported.file.size > 50 * MIB ? 'skipped-for-large-file' : 'unavailable-in-this-context', privacy: 'browser-local', importedAt: new Date().toISOString() };
      const structuralHints = [...faces.flatMap(f => (f.structuralHints || []).map(h => ({ ...h, assignedView: f.key }))), ...imported.references.flatMap(r => (r.structuralHints || []).map(h => ({ ...h, assignedView: r.kind })))];
      const volume = imported.volume;
      const dimensionStatus = Object.values(volume.dimensions).every(Number.isFinite) && volume.roofStyle ? 'detected' : 'incomplete';
      const planData = {
        version: 2, projectKind: 'imported-pdf', id, title: imported.file.name.replace(/\.pdf$/i, ''), source: `PDF importé · ${imported.pageCount} pages`,
        sourceSha256: imported.sha256, analysis: 'Titres et cotes du PDF relevés automatiquement. Les contours et la maquette restent à vérifier.',
        faces, referencePages: imported.references, sourceMetadata: source, structuralHints,
        dimensions: volume.dimensions, dimensionStatus, detectedVolume: { roofStyle: volume.roofStyle, foundationDrop: volume.foundationDrop, conflicts: volume.conflicts, evidence: volume.evidence },
        dimensionNote: dimensionStatus === 'detected' ? 'Volume préliminaire à partir des cotes repérées dans le PDF.' : 'Géométrie 3D à compléter dans Volume & retours.',
        recess: { enabled: false, confirmed: false }, footprint: { type: 'unknown' }
      };
      const takeoffSeed = { version: 1, calibrations, geometry: { buildingWidthFt: null, buildingDepthFt: null, recessStartFt: null, recessWidthFt: null, recessDepthFt: null, recessHeightFt: null, returnCladHeightFt: null, confirmed: false }, footprintEvidence: null, note: 'Échelles automatiques proposées à partir des cotes. Contrôler les mesures avant une commande.' };
      const entry = { id, planData, takeoffSeed, source, sourceFile: imported.file, createdAt: new Date().toISOString() };
      await MIRProjectStore.saveActive(entry);
      imported.saving = false;
      close();
      if (done) await done({ ...entry, projectData: planData, takeoffData: takeoffSeed }); else location.reload();
    } catch (e) {
      if (!dialog.open) return;
      imported.saving = false; $('#mir-pdf-close').disabled = false;
      error(readableError(e)); progress('Votre projet précédent est conservé. Réessayez l’enregistrement.', null); busy(false);
    }
  }
  window.MIRPlanImport = Object.freeze({ open, close, version: '2.0-auto' });
})();
