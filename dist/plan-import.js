/* Browser-local PDF import. PDF rendering and OCR workers are self-hosted.
 * A PDF page is never uploaded. Automatic scales retain their supporting cotes. */
(function () {
  'use strict';
  const BASE = new URL('.', document.currentScript?.src || location.href);
  const asset = path => new URL(path, BASE).href;
  const FACE_NAMES = { front: 'Avant', right: 'Droite', back: 'Arrière', left: 'Gauche' };
  const REFERENCE_NAMES = { foundation: 'Solage / fondations', floor: 'Plan d’étage', reference: 'Autre référence' };
  const MIB = 1024 * 1024, MAX_FILE_MB = 150, MAX_VISIBLE_PAGES = 60;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, digits = 2) => Number.isFinite(n) ? new Intl.NumberFormat('fr-CA', { maximumFractionDigits: digits }).format(n) : 'À confirmer';
  const statusNames = { cross_checked: 'Échelle trouvée', single_dimension: 'Une cote trouvée', selected_dimension: 'Cote sélectionnée', conflict: 'Échelles à départager', low_confidence: 'Lecture à vérifier', not_found: 'Échelle à vérifier', manual: 'Cote corrigée' };
  let dialog, root, current, pdfLibrary, ocrPromise, callback, sequence = 0, mode = null, pointerStart = null, calibrationClicks = [];
  const $ = selector => root?.querySelector(selector);
  const $$ = selector => [...(root?.querySelectorAll(selector) || [])];
  function script(path, expected) {
    if (window[expected]) return Promise.resolve(window[expected]);
    return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = asset(path); s.onload = () => resolve(window[expected]); s.onerror = () => reject(new Error('Un outil de lecture du PDF n’a pas chargé. Rechargez la page puis réessayez.')); document.head.append(s); });
  }
  async function dependencies() {
    if (!window.MIRPDFAnalysis) await script('plan-import-core.js', 'MIRPDFAnalysis');
    if (!window.MIRProjectStore) await script('project-store.js', 'MIRProjectStore');
    if (!pdfLibrary) { pdfLibrary = await import(asset('vendor/pdfjs/pdf.min.mjs')); pdfLibrary.GlobalWorkerOptions.workerSrc = asset('vendor/pdfjs/pdf.worker.min.mjs'); }
    return pdfLibrary;
  }
  function progress(message, percent) { if (!root) return; $('#mir-pdf-status').textContent = message; const bar = $('#mir-pdf-progress'); bar.hidden = percent == null; if (percent != null) bar.value = Math.max(0, Math.min(100, percent)); }
  function error(message) { if (!root) return; $('#mir-pdf-error').textContent = message; $('#mir-pdf-error').hidden = !message; }
  function busy(value) { current.busy = value; $$('[data-page], #mir-pdf-page-filter input, #mir-pdf-page-filter button, [data-remove-pdf-sheet]').forEach(b => b.disabled = value); $('#mir-pdf-file').disabled = value; $('#mir-pdf-assign').disabled = value || !current.page; $('#mir-pdf-final').disabled = value || !Object.keys(current.assignments).length; }
  function element() {
    if (dialog) return;
    if (!document.querySelector('link[data-mir-pdf-style]')) { const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = asset('plan-import.css'); css.dataset.mirPdfStyle = ''; document.head.append(css); }
    dialog = document.createElement('dialog'); dialog.id = 'mir-pdf-import'; dialog.className = 'mir-pdf-dialog'; dialog.setAttribute('aria-labelledby', 'mir-pdf-title');
    dialog.innerHTML = `<div class="mir-pdf-shell"><header class="mir-pdf-head"><div><p class="mir-pdf-eyebrow">VOTRE MAISON, VOTRE PROJET</p><h2 id="mir-pdf-title">Importez votre plan.</h2><p>Les cotes du dessin servent à trouver l’échelle automatiquement.</p></div><button type="button" id="mir-pdf-close" aria-label="Fermer l’import du PDF">Fermer ×</button></header>
      <div class="mir-pdf-steps" aria-label="Étapes de l’import"><span><b>1</b> Votre PDF</span><span><b>2</b> Vos façades</span><span><b>3</b> Votre studio</span></div>
      <div class="mir-pdf-upload"><label for="mir-pdf-file"><strong>Choisir mon PDF</strong><span>Fichier de ${MAX_FILE_MB} Mo maximum</span><input id="mir-pdf-file" type="file" accept="application/pdf,.pdf"></label><p>Votre fichier reste sur cet appareil. La lecture des cotes se fait dans votre navigateur.</p></div>
      <div id="mir-pdf-error" class="mir-pdf-error" role="alert" hidden></div><div class="mir-pdf-working"><p id="mir-pdf-status" role="status" aria-live="polite">Choisissez le PDF de votre projet.</p><progress id="mir-pdf-progress" max="100" hidden></progress></div>
      <form id="mir-pdf-page-filter" hidden><label for="mir-pdf-page-range">Choisir les pages à afficher</label><p id="mir-pdf-page-hint" class="mir-pdf-fine"></p><div><input id="mir-pdf-page-range" type="text" placeholder="Ex. 3, 7-10, 14" aria-describedby="mir-pdf-page-hint"><button type="submit">Afficher les pages</button><button type="reset">Réinitialiser</button></div></form>
      <section id="mir-pdf-workspace" class="mir-pdf-workspace" hidden><nav class="mir-pdf-pages" aria-label="Pages du PDF"><h3>Pages</h3><div id="mir-pdf-pages"></div></nav><div class="mir-pdf-drawing"><div class="mir-pdf-view-tools"><h3 id="mir-pdf-page-title">Page 1</h3><div><button type="button" id="mir-pdf-crop">Ajuster le cadrage</button><button type="button" id="mir-pdf-full">Page entière</button></div></div><p id="mir-pdf-canvas-help">Choisissez la page, cadrez la vue, puis indiquez ce qu’elle représente.</p><div class="mir-pdf-canvas-shell"><canvas id="mir-pdf-canvas" aria-label="Page du PDF sélectionnée"></canvas><svg id="mir-pdf-overlay" role="img" aria-label="Cadrage et cotes détectées"></svg></div></div>
      <aside class="mir-pdf-options"><div class="mir-pdf-scale"><span id="mir-pdf-scale-badge">Lecture des cotes</span><h3>L’échelle du dessin</h3><p id="mir-pdf-scale-message"></p><p id="mir-pdf-scale-value"></p><details id="mir-pdf-evidence"><summary>Voir les cotes utilisées</summary><div id="mir-pdf-cotes"></div><label for="mir-pdf-cote-select">Choisir une cote détectée</label><select id="mir-pdf-cote-select"></select><p class="mir-pdf-fine">Une échelle peut différer entre deux vues de la même page. Cadrez la vue concernée et choisissez sa cote si nécessaire.</p></details><details class="mir-pdf-manual"><summary>Corriger une cote illisible</summary><p>Si la lecture automatique échoue, entrez la cote écrite sur le plan et pointez ses deux extrémités.</p><label for="mir-pdf-manual-value">Dimension indiquée</label><input id="mir-pdf-manual-value" placeholder="Ex. 22′-0″ ou 6705 mm"><button type="button" id="mir-pdf-manual-points">Pointer les deux extrémités</button></details></div>
      <div class="mir-pdf-zone-summary"><h3>Surfaces repérées</h3><p id="mir-pdf-zone-count"></p><label class="mir-pdf-check"><input id="mir-pdf-keep-zones" type="checkbox" checked> Reprendre les zones proposées</label><p class="mir-pdf-fine">Vous pourrez modifier, tracer ou dupliquer les zones dans le studio. Les surfaces masquées par des notes ne sont pas inventées.</p></div>
      <label for="mir-pdf-face">Cette vue représente</label><select id="mir-pdf-face"><optgroup label="Élévations extérieures"><option value="front">La façade avant</option><option value="right">Le côté droit</option><option value="back">La façade arrière</option><option value="left">Le côté gauche</option></optgroup><optgroup label="Feuilles de référence">${Object.entries(REFERENCE_NAMES).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</optgroup></select><div id="mir-pdf-level-field" hidden><label for="mir-pdf-level">Nom de l’étage (facultatif)</label><input id="mir-pdf-level" maxlength="60" placeholder="Ex. Rez-de-chaussée, 2e étage"></div><button type="button" id="mir-pdf-assign" class="mir-pdf-primary" disabled>Ajouter cette vue au dossier</button><p id="mir-pdf-assignment-note" class="mir-pdf-fine"></p></aside></section>
      <footer class="mir-pdf-bottom"><div><h3>Votre dossier</h3><div id="mir-pdf-assigned" class="mir-pdf-assigned">Aucune vue sélectionnée.</div><p class="mir-pdf-fine">Une élévation suffit pour commencer en 2D. Pour préparer le volume 3D, ajoutez le solage, les plans de chaque étage et les élévations extérieures, puis confirmez les dimensions dans le studio.</p></div><button type="button" id="mir-pdf-final" class="mir-pdf-primary" disabled>Ouvrir mon projet →</button></footer></div>`;
    document.body.append(dialog); root = dialog;
    $('#mir-pdf-close').onclick = close; dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    $('#mir-pdf-file').onchange = e => load(e.target.files?.[0]);
    $('#mir-pdf-page-filter').onsubmit = e => { e.preventDefault(); filterPages($('#mir-pdf-page-range').value); };
    $('#mir-pdf-page-filter').onreset = () => filterPages('');
    $('#mir-pdf-crop').onclick = () => { if (!current.page) return; mode = mode === 'crop' ? null : 'crop'; $('#mir-pdf-crop').setAttribute('aria-pressed', mode === 'crop'); $('#mir-pdf-canvas-help').textContent = mode === 'crop' ? 'Glissez sur le dessin pour entourer uniquement la façade. L’échelle ne change pas.' : 'Les repères verts montrent les cotes qui ont servi au calcul.'; };
    $('#mir-pdf-full').onclick = () => { if (!current.page) return; current.crop = [0, 0, current.page.canvas.width, current.page.canvas.height]; refreshZones(); draw(); };
    $('#mir-pdf-cote-select').onchange = e => chooseCote(Number(e.target.value));
    $('#mir-pdf-manual-points').onclick = beginManual;
    $('#mir-pdf-face').onchange = () => assignmentHint();
    $('#mir-pdf-assign').onclick = assign;
    $('#mir-pdf-assigned').onclick = e => {
      const button = e.target.closest('[data-remove-pdf-sheet]');
      if (!button || current.busy) return;
      const key = button.dataset.removePdfSheet;
      if (Object.hasOwn(FACE_NAMES, key)) delete current.assignments[key];
      else current.references.splice(Number(key), 1);
      renderAssignments(); assignmentHint();
    };
    $('#mir-pdf-final').onclick = finish;
    const overlay = $('#mir-pdf-overlay');
    overlay.onpointerdown = e => { if (!current.page || current.busy || !mode) return; const p = point(e); if (mode === 'calibration') { calibrationClicks.push(p); if (calibrationClicks.length === 2) completeManual(); draw(); return; } pointerStart = p; overlay.setPointerCapture(e.pointerId); e.preventDefault(); };
    overlay.onpointermove = e => { if (!pointerStart || mode !== 'crop') return; const p = point(e); current.crop = rectBetween(pointerStart, p); draw(); };
    overlay.onpointerup = e => { if (!pointerStart) return; const p = point(e), crop = rectBetween(pointerStart, p); pointerStart = null; if (crop[2] >= 40 && crop[3] >= 40) current.crop = crop; mode = null; $('#mir-pdf-crop').setAttribute('aria-pressed', 'false'); refreshZones(); draw(); $('#mir-pdf-canvas-help').textContent = 'Cadrage enregistré. L’échelle provient toujours des cotes originales.'; };
    overlay.onpointercancel = () => { pointerStart = null; };
  }
  const rectBetween = (a, b) => [Math.round(Math.min(a[0], b[0])), Math.round(Math.min(a[1], b[1])), Math.round(Math.abs(a[0] - b[0])), Math.round(Math.abs(a[1] - b[1]))];
  function point(e) { const r = $('#mir-pdf-overlay').getBoundingClientRect(), c = current.page.canvas; return [Math.max(0, Math.min(c.width, (e.clientX - r.left) * c.width / r.width)), Math.max(0, Math.min(c.height, (e.clientY - r.top) * c.height / r.height))]; }
  function fresh() { return { file: null, pdf: null, page: null, pageNumber: 0, cache: new Map(), assignments: {}, references: [], crop: null, regions: [], busy: false, analysisId: 0, sha256: null }; }
  async function open(options = {}) { element(); callback = typeof options.onImport === 'function' ? options.onImport : null; if (!current) current = fresh(); if (!dialog.open) dialog.showModal(); $('#mir-pdf-file').focus(); }
  function close() { sequence++; mode = null; pointerStart = null; dialog?.close(); if (ocrPromise) { ocrPromise.then(w => w.terminate()).catch(() => {}); ocrPromise = null; } if (current) busy(false); }
  async function load(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return error('Choisissez un fichier PDF.');
    if (file.size > MAX_FILE_MB * MIB) return error(`Ce PDF dépasse ${MAX_FILE_MB} Mo. Exportez une copie contenant seulement les pages utiles.`);
    if (file.size < 32) return error('Ce fichier est vide ou incomplet.');
    const token = ++sequence, previous = current.pdf;
    current = fresh(); current.file = file; busy(true); error('');
    $('#mir-pdf-workspace').hidden = $('#mir-pdf-page-filter').hidden = true;
    $('#mir-pdf-page-range').value = ''; $('#mir-pdf-level').value = ''; renderAssignments();
    try {
      if (previous) await previous.destroy();
      if (token !== sequence) return;
      progress('Ouverture de votre PDF…', 4); await dependencies(); if (token !== sequence) return; const buffer = await file.arrayBuffer(); if (token !== sequence) return;
      const header = new TextDecoder('latin1').decode(buffer.slice(0, 1024)); if (!header.includes('%PDF-')) throw new Error('Le contenu de ce fichier ne correspond pas à un PDF.');
      // Avoid copying the entire buffer again for an optional fingerprint on large files.
      if (file.size <= 50 * MIB && globalThis.crypto?.subtle?.digest) { const digest = await crypto.subtle.digest('SHA-256', buffer); if (token !== sequence) return; current.sha256 = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join(''); }
      const job = pdfLibrary.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, enableXfa: false, cMapUrl: asset('vendor/pdfjs/cmaps/'), cMapPacked: true, standardFontDataUrl: asset('vendor/pdfjs/standard_fonts/'), wasmUrl: asset('vendor/pdfjs/wasm/'), stopAtErrors: false });
      const pdf = await job.promise; if (token !== sequence) { await pdf.destroy(); return; }
      current.pdf = pdf;
      $('#mir-pdf-page-hint').textContent = `${pdf.numPages} page(s) dans le PDF. Entrez les numéros ou plages à afficher, par exemple 3, 7-10, 14. Jusqu’à ${MAX_VISIBLE_PAGES} à la fois.`;
      $('#mir-pdf-page-filter').hidden = $('#mir-pdf-workspace').hidden = false;
      busy(false); filterPages('');
    } catch (e) { if (token === sequence) { error(readableError(e)); progress('Le PDF n’a pas été importé.', null); busy(false); } }
  }
  function filterPages(value) {
    if (!current.pdf || current.busy) return;
    const count = current.pdf.numPages, numbers = new Set();
    if (value.trim()) {
      for (const part of value.trim().split(/\s*[,;]\s*/)) {
        const match = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(part);
        if (!match) return error('Indiquez des numéros ou des plages de pages, par exemple 3, 7-10, 14.');
        const first = Number(match[1]), last = Number(match[2] || first);
        if (first < 1 || last < first || last > count) return error(`Choisissez des pages de 1 à ${count}, dans l’ordre croissant pour chaque plage.`);
        if (last - first >= MAX_VISIBLE_PAGES) return error(`Choisissez au plus ${MAX_VISIBLE_PAGES} pages à afficher à la fois.`);
        for (let page = first; page <= last; page++) numbers.add(page);
        if (numbers.size > MAX_VISIBLE_PAGES) return error(`Choisissez au plus ${MAX_VISIBLE_PAGES} pages à afficher à la fois.`);
      }
    } else {
      for (let page = 1; page <= Math.min(count, MAX_VISIBLE_PAGES); page++) numbers.add(page);
    }
    const pages = [...numbers].sort((a, b) => a - b);
    error('');
    $('#mir-pdf-pages').innerHTML = pages.map(page => `<button type="button" data-page="${page}" aria-pressed="${page === current.pageNumber}"><span aria-hidden="true">${page}</span>Page ${page}</button>`).join('');
    $$('[data-page]').forEach(button => button.onclick = () => showPage(Number(button.dataset.page)));
    if (!numbers.has(current.pageNumber)) void showPage(pages[0]);
  }
  function readableError(e) { if (e?.name === 'PasswordException') return 'Ce PDF est protégé par un mot de passe. Importez une copie déverrouillée.'; if (e?.name === 'InvalidPDFException') return 'Ce PDF semble endommagé. Essayez une nouvelle exportation.'; if (e?.name === 'QuotaExceededError') return 'L’espace disponible sur cet appareil est insuffisant pour conserver ce PDF.'; const message = String(e?.message || ''); if (/^(?:Ce |Le |La |Les |Choisissez |Importez |Un |Une |Fermez |L’|L'|Votre )/.test(message)) return message; console.warn('MIR PDF : lecture interrompue', e); return 'La lecture de ce PDF n’a pas réussi. Réessayez ou importez une nouvelle exportation de votre plan.'; }
  async function renderPage(number) {
    const page = await current.pdf.getPage(number), base = page.getViewport({ scale: 1 }), longest = Math.max(base.width, base.height), scale = Math.min(2.5, Math.max(1, 2400 / longest), 3200 / longest, Math.sqrt(8e6 / (base.width * base.height)));
    const viewport = page.getViewport({ scale }), canvas = document.createElement('canvas'); canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); await page.render({ canvasContext: ctx, viewport, background: '#fff', annotationMode: pdfLibrary.AnnotationMode.DISABLE }).promise;
    const text = await page.getTextContent({ disableNormalization: false }), words = [];
    for (const item of text.items) { if (!item.str?.trim()) continue; const tr = pdfLibrary.Util.transform(viewport.transform, item.transform), angle = Math.atan2(tr[1], tr[0]), height = Math.hypot(tr[2], tr[3]); if (Math.abs(Math.sin(angle)) > .3) continue; words.push({ text: item.str, box: [tr[4], tr[5] - height, tr[4] + Math.abs(item.width * scale), tr[5]], confidence: 100, source: 'pdf-text' }); }
    return { canvas, image: ctx.getImageData(0, 0, canvas.width, canvas.height), text: text.items.map(i => i.str || '').join(' '), words, number, scale: null, candidates: [], detectedWith: null };
  }
  async function worker(token) {
    if (!ocrPromise) ocrPromise = (async () => { await script('vendor/tesseract/tesseract.min.js', 'Tesseract'); const w = await Tesseract.createWorker('eng', 1, { workerPath: asset('vendor/tesseract/worker.min.js'), corePath: asset('vendor/tesseract-core/'), langPath: asset('vendor/tessdata/'), workerBlobURL: false, gzip: true, logger: m => { if (dialog?.open && current?.busy && m.status === 'recognizing text') progress('Lecture des cotes du dessin…', 25 + (m.progress || 0) * 48); } }); await w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' }); return w; })();
    try { return await ocrPromise; } catch (e) { ocrPromise = null; throw e; }
  }
  function ocrWords(result) { const words = []; for (const b of result.data.blocks || []) for (const p of b.paragraphs || []) for (const line of p.lines || []) for (const w of line.words || []) { if (!w.text?.trim() || !w.bbox) continue; const q = w.bbox; words.push({ text: w.text, box: [q.x0, q.y0, q.x1, q.y1], confidence: w.confidence, source: 'ocr' }); } return words; }
  async function analyze(page, token) {
    const A = window.MIRPDFAnalysis; let words = page.words, candidates = A.matchDimensionLines(page.image, words), found = A.resolveScale(candidates); const enoughText = words.filter(w => A.parseDimension(w.text)).length >= 2;
    if (!enoughText || found.status === 'not_found') {
      progress('Le PDF est une image. Lecture automatique des cotes…', 18); const w = await worker(token); if (token !== sequence) return;
      const result = await w.recognize(page.canvas, {}, { blocks: true }); if (token !== sequence) return;
      words = ocrWords(result); page.ocrText = result.data.text || ''; candidates = [...candidates, ...A.matchDimensionLines(page.image, words, { bareMetricMm: /(?:dimensions?|cotes?)[^\n]{0,90}(?:millim[eè]tres|\bmm\b)/i.test(page.text + '\n' + page.ocrText) })]; page.detectedWith = 'ocr-local';
      found = A.resolveScale(candidates);
      // A second orientation is necessary for heights, skewed page exports and side views.
      progress('Vérification des cotes verticales…', 76);
      const rotated = document.createElement('canvas'); rotated.width = page.canvas.height; rotated.height = page.canvas.width; const ctx = rotated.getContext('2d', { willReadFrequently: true }); ctx.translate(rotated.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(page.canvas, 0, 0);
      const vertical = await w.recognize(rotated, {}, { blocks: true }); if (token !== sequence) return;
      const verticalWords = ocrWords(vertical), rotatedImage = ctx.getImageData(0, 0, rotated.width, rotated.height);
      // Upward-reading vertical cotes become horizontal after a clockwise turn.
      const verticalCandidates = A.matchDimensionLines(rotatedImage, verticalWords, { axis: 'y' }).map(c => A.unrotateCandidate(c, page.canvas.width, page.canvas.height, 'cw'));
      candidates.push(...verticalCandidates); rotated.width = rotated.height = 1; found = A.resolveScale(candidates);
    } else page.detectedWith = 'pdf-text';
    page.words = words; page.candidates = candidates; page.scale = found; return page;
  }
  function suggestedCrop(page) {
    const all = MIRPDFAnalysis.proposeColoredZones(page.image); if (!all.length) return [0, 0, page.canvas.width, page.canvas.height];
    // A detached colored callout is not part of the house. Start from the largest
    // connected group of nearby colored shapes for the suggested framing only.
    // The client can always restore the entire page or draw a different crop.
    const groups = [], remaining = new Set(all), gap = Math.max(page.canvas.width, page.canvas.height) * .03;
    while (remaining.size) { const first = remaining.values().next().value, group = [first]; remaining.delete(first); for (let i = 0; i < group.length; i++) for (const q of [...remaining]) { const a = group[i].box, b = q.box; if (Math.max(0, a[0] - b[2], b[0] - a[2]) <= gap && Math.max(0, a[1] - b[3], b[1] - a[3]) <= gap) { group.push(q); remaining.delete(q); } } groups.push(group); }
    groups.sort((a, b) => b.reduce((s, r) => s + r.areaPx, 0) - a.reduce((s, r) => s + r.areaPx, 0));
    const points = groups[0].flatMap(r => r.polygon), [x0, y0, x1, y1] = MIRPDFAnalysis.bbox(points), w = x1 - x0, h = y1 - y0;
    const x = Math.max(0, Math.floor(x0 - w * .06)), y = Math.max(0, Math.floor(y0 - h * .36));
    return [x, y, Math.min(page.canvas.width - x, Math.ceil(w * 1.12)), Math.min(page.canvas.height - y, Math.ceil(h * 1.61))];
  }
  async function showPage(number) {
    if (!current.pdf || current.busy) return; const token = sequence; busy(true); error(''); mode = null; progress(`Affichage de la page ${number}…`, 8);
    try {
      let page = current.cache.get(number); if (!page) page = await renderPage(number); if (token !== sequence) return;
      current.page = page; current.pageNumber = number; current.crop = page.crop || suggestedCrop(page); $('#mir-pdf-page-title').textContent = `Page ${number} sur ${current.pdf.numPages}`; $$('[data-page]').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.page) === number));
      const canvas = $('#mir-pdf-canvas'); canvas.width = page.canvas.width; canvas.height = page.canvas.height; canvas.getContext('2d').drawImage(page.canvas, 0, 0); $('#mir-pdf-overlay').setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`); draw();
      if (!page.scale) await analyze(page, token); if (token !== sequence) return; current.cache.set(number, page);
      // Avoid holding dozens of full-resolution pages in memory on a phone.
      const cacheLimit = current.file.size > 50 * MIB ? 1 : 3;
      for (const [k, cached] of current.cache) if (current.cache.size > cacheLimit && k !== number) { cached.canvas.width = cached.canvas.height = 1; current.cache.delete(k); }
      refreshZones(); renderScale(); draw(); assignmentHint(); progress(`Page ${number} prête. ${page.scale.message}`, null); busy(false);
    } catch (e) { if (token === sequence) { error(readableError(e)); progress('Vous pouvez réessayer cette page ou choisir une autre page.', null); busy(false); } }
  }
  function refreshZones() { if (!current.page || !current.crop) return; current.regions = MIRPDFAnalysis.proposeColoredZones(current.page.image, current.crop); current.page.crop = current.crop.slice(); $('#mir-pdf-zone-count').textContent = current.regions.length ? `${current.regions.length} zones colorées proposées. Leurs contours restent modifiables.` : 'Aucune surface colorée fiable repérée. Vous pourrez tracer vos zones directement sur le PDF dans le studio.'; }
  function renderScale() {
    const s = current.page?.scale; if (!s) return; $('#mir-pdf-scale-badge').textContent = statusNames[s.status] || 'À vérifier'; $('#mir-pdf-scale-badge').dataset.state = s.feetPerPixel ? 'found' : 'warning'; $('#mir-pdf-scale-message').textContent = s.message;
    $('#mir-pdf-scale-value').textContent = s.feetPerPixel ? `1 pixel = ${fmt(s.feetPerPixel, 6)} pi · ${s.accepted?.length || 1} cote${s.accepted?.length > 1 ? 's' : ''}${s.scaleX && s.scaleY ? ' · largeur et hauteur comparées' : ' · contrôle vertical à compléter'}` : 'Les superficies restent inconnues tant que l’échelle n’est pas déterminée.';
    const cs = current.page.candidates;
    $('#mir-pdf-cotes').innerHTML = (s.accepted || []).map(c => `<p><strong>${esc(c.normalized || c.text)}</strong> · ${fmt(c.spanPx, 0)} pixels entre les repères${c.corrected ? ' · caractères OCR rapprochés' : ''}</p>`).join('') || '<p>Aucune cote retenue automatiquement.</p>';
    $('#mir-pdf-cote-select').innerHTML = `<option value="-1">Choix automatique</option>${cs.map((c, i) => `<option value="${i}">${esc(c.normalized || c.text)} · ${c.axis === 'y' ? 'verticale' : 'horizontale'} · ${fmt(c.spanPx, 0)} px</option>`).join('')}`; $('#mir-pdf-cote-select').disabled = !cs.length;
  }
  function chooseCote(index) { if (!current.page) return; const c = current.page.candidates[index]; current.page.scale = c ? { status: 'selected_dimension', feetPerPixel: c.feetPerPixel, referenceFt: c.referenceFt, anchors: c.anchors, source: c.source, accepted: [c], candidates: current.page.candidates, message: 'La cote choisie est reliée à ses deux repères. Vérifiez qu’elle appartient à cette vue.' } : MIRPDFAnalysis.resolveScale(current.page.candidates); renderScale(); $('#mir-pdf-cote-select').value = String(index); draw(); }
  function beginManual() { if (!current.page || current.busy) return; const value = MIRPDFAnalysis.parseDimension($('#mir-pdf-manual-value').value); if (!value) return error('Entrez la dimension avec son unité, par exemple 22′-0″, 6705 mm ou 6,705 m.'); error(''); current.manualDimension = value; mode = 'calibration'; calibrationClicks = []; $('#mir-pdf-canvas-help').textContent = 'Cliquez sur les deux extrémités de la cote écrite sur le plan.'; }
  function completeManual() { const [a, b] = calibrationClicks, span = Math.hypot(b[0] - a[0], b[1] - a[1]); if (span < 30) { calibrationClicks = []; return error('Les deux repères sont trop proches. Choisissez les extrémités complètes de la cote.'); } const c = { text: current.manualDimension.text, normalized: current.manualDimension.normalized, referenceFt: current.manualDimension.valueFt, anchors: [a, b], spanPx: span, feetPerPixel: current.manualDimension.valueFt / span, axis: Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) ? 'x' : 'y', source: 'manual-correction', score: 1, textBox: [0, 0, 0, 0] }; current.page.scale = { status: 'manual', feetPerPixel: c.feetPerPixel, referenceFt: c.referenceFt, anchors: c.anchors, accepted: [c], source: c.source, message: 'Échelle corrigée à partir de la cote que vous avez indiquée.' }; mode = null; calibrationClicks = []; renderScale(); $('#mir-pdf-canvas-help').textContent = 'Cote corrigée. Les surfaces suivent cette échelle.'; }
  function draw() {
    if (!current.page) return; const c = current.page.canvas, crop = current.crop || [0, 0, c.width, c.height], [x, y, w, h] = crop; let html = `<path d="M0 0H${c.width}V${c.height}H0Z M${x} ${y}V${y + h}H${x + w}V${y}Z" fill="#14241b" fill-opacity=".26" fill-rule="evenodd"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#557746" stroke-width="4" stroke-dasharray="14 7"/>`;
    for (const r of current.regions || []) html += `<polygon points="${r.polygon.map(p => `${p[0] + x},${p[1] + y}`).join(' ')}" fill="#8bc062" fill-opacity=".08" stroke="#416a34" stroke-width="2"/>`;
    for (const cote of current.page.scale?.accepted || []) { const [a, b] = cote.anchors; html += `<path d="M${a.join(' ')}L${b.join(' ')}" stroke="#117555" stroke-width="5"/><circle cx="${a[0]}" cy="${a[1]}" r="8" fill="#fff" stroke="#117555" stroke-width="4"/><circle cx="${b[0]}" cy="${b[1]}" r="8" fill="#fff" stroke="#117555" stroke-width="4"/><text x="${(a[0] + b[0]) / 2}" y="${(a[1] + b[1]) / 2 - 15}" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="#155d44" paint-order="stroke" stroke="#fff" stroke-width="5">${esc(fmt(cote.referenceFt) + ' pi')}</text>`; }
    for (const p of calibrationClicks) html += `<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="#b2783b"/>`;
    $('#mir-pdf-overlay').innerHTML = html;
  }
  function assignmentHint() {
    const key = $('#mir-pdf-face').value;
    $('#mir-pdf-level-field').hidden = key !== 'floor';
    $('#mir-pdf-assignment-note').textContent = Object.hasOwn(REFERENCE_NAMES, key)
      ? 'Cette vue sera disponible avec les dimensions du volume dans le studio.'
      : current.assignments[key]
        ? `La vue de la page ${current.assignments[key].page} sera remplacée dans votre dossier.`
        : 'Une feuille peut contenir plusieurs élévations. Cadrez et ajoutez chacune à la façade correspondante.';
  }
  function placeholder(key) { return { key, name: FACE_NAMES[key], page: null, bbox: [0, 0, 1200, 800], textureBox: [0, 0, 1200, 800], physicalWidth: null, zones: [], openings: [], roof: [], base: [], fascia: [], soffit: [], detected: {}, candidates: [], occlusions: [], printedDimensions: [], importedStatus: 'unassigned', calibrationStatus: 'not_found', textureBottom: 0, textureReference: 'Façade non importée.', sourceImage: null }; }
  function calibration(page, crop) {
    const s = page.scale, [x, y] = crop;
    if (!s?.feetPerPixel || !s.referenceFt || !s.anchors) return { referenceFt: null, anchors: [], verified: false, status: s?.status || 'not_found', provenance: 'Aucune échelle retenue; aucune surface calculable.', evidence: [] };
    return { referenceFt: s.referenceFt, anchors: s.anchors.map(p => [p[0] - x, p[1] - y]), verified: false, status: s.status, provenance: s.source === 'manual-correction' ? 'Cote et repères corrigés par la personne.' : 'Cote écrite reliée automatiquement aux intersections de sa ligne et de ses rappels; échelle proposée à vérifier.', evidence: (s.accepted || []).map(c => ({ text: c.text, normalized: c.normalized, referenceFt: c.referenceFt, anchors: c.anchors.map(p => [p[0] - x, p[1] - y]), spanPx: c.spanPx, axis: c.axis, source: c.source, ocrConfidence: c.confidence ?? null, correctedCharacters: !!c.corrected })), spread: s.spread ?? null, axesCompared: !!(s.scaleX && s.scaleY) };
  }
  function assign() {
    if (!current.page || current.busy) return; const key = $('#mir-pdf-face').value, page = current.page, crop = current.crop.map(Math.round), [x, y, w, h] = crop;
    if (w < 40 || h < 40) return error('Le cadrage est trop petit. Entourez la façade complète.');
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; canvas.getContext('2d').drawImage(page.canvas, x, y, w, h, 0, 0, w, h); const sourceImage = canvas.toDataURL('image/png'); canvas.width = canvas.height = 1;
    const cal = calibration(page, crop);
    const isReference = Object.hasOwn(REFERENCE_NAMES, key);
    if (isReference) {
      const level = key === 'floor' ? $('#mir-pdf-level').value.trim() : '';
      const name = level ? `${REFERENCE_NAMES[key]} · ${level}` : REFERENCE_NAMES[key];
      const ref = { page: page.number, crop, sourceImage, calibration: cal, kind: key, name };
      const index = current.references.findIndex(r => r.kind === key && r.page === page.number && r.crop.every((v, i) => v === crop[i]));
      if (index < 0) current.references.push(ref); else current.references[index] = ref;
    } else {
      const regions = $('#mir-pdf-keep-zones').checked ? current.regions : [], zones = regions.map((r, i) => ({ id: `pdf-zone-${i + 1}`, name: `Zone ${i + 1}`, polygon: r.polygon, kind: 'siding', parent: null, provenance: r.provenance, needsReview: true, detected: true }));
      const openings = regions.flatMap((r, i) => r.holes.filter(p => { const b = MIRPDFAnalysis.bbox(p); return b[2] - b[0] > 15 && b[3] - b[1] > 15; }).map((p, j) => ({ id: `pdf-opening-${i + 1}-${j + 1}`, type: 'window', polygon: p, bbox: MIRPDFAnalysis.bbox(p), occluded: false, dimension: 'Dimension issue de l’échelle; ouverture à vérifier.', provenance: 'Vide repéré dans une zone colorée; nature fenêtre/porte à confirmer.', needsReview: true })));
      current.assignments[key] = { ...placeholder(key), page: page.number, bbox: [0, 0, w, h], textureBox: [0, 0, w, h], zones, openings, sourceImage, sourceImageBox: [0, 0, w, h], sourceWidth: w, sourceHeight: h, sourcePageSize: [page.canvas.width, page.canvas.height], sourceCrop: crop, calibration: cal, importedStatus: 'assigned', calibrationStatus: cal.status, detected: { regions: zones.length, openings: openings.length, method: 'Surfaces colorées et vides repérés localement; aucune reconstruction des parties cachées.' }, candidates: [], printedDimensions: cal.evidence.map(c => c.normalized || c.text), textureReference: 'Cadrage du PDF importé; volume 3D à compléter avec les autres vues.' };
    }
    const next = Object.keys(FACE_NAMES).find(k => !current.assignments[k]);
    if (next && !isReference) $('#mir-pdf-face').value = next;
    error(''); renderAssignments(); assignmentHint();
    progress(isReference ? `Page ${page.number} ajoutée · ${REFERENCE_NAMES[key]}.` : `La façade ${FACE_NAMES[key].toLowerCase()} utilise la page ${page.number}.`, null);
  }
  function renderAssignments() {
    const sheet = (label, page, key) => page
      ? `<span class="ready"><b>${esc(label)}</b><small>Page ${page}</small><button type="button" data-remove-pdf-sheet="${key}" aria-label="Retirer ${esc(label)}, page ${page}">Retirer</button></span>`
      : `<span><b>${label}</b>À ajouter</span>`;
    const refs = current.references;
    $('#mir-pdf-assigned').innerHTML = Object.entries(FACE_NAMES).map(([key, label]) => sheet(label, current.assignments[key]?.page, key)).join('')
      + ['foundation', 'floor'].filter(key => !refs.some(ref => ref.kind === key)).map(key => sheet(REFERENCE_NAMES[key])).join('')
      + refs.map((ref, index) => sheet(ref.name, ref.page, index)).join('');
    $('#mir-pdf-final').disabled = !Object.keys(current.assignments).length || current.busy;
  }
  async function finish() {
    if (current.busy || !Object.keys(current.assignments).length) return; busy(true); error(''); progress('Préparation de votre studio…', 95);
    try {
      const id = `pdf-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)}`, faces = Object.keys(FACE_NAMES).map(k => current.assignments[k] || placeholder(k));
      const calibrations = Object.fromEntries(faces.map(f => [f.key, f.calibration || { referenceFt: null, anchors: [], verified: false, status: 'not_found', provenance: 'Façade non importée.', evidence: [] }]));
      const source = { filename: current.file.name, bytes: current.file.size, pageCount: current.pdf.numPages, sha256: current.sha256, fingerprintStatus: current.sha256 ? 'sha256' : current.file.size > 50 * MIB ? 'skipped-for-large-file' : 'unavailable-in-this-context', privacy: 'browser-local', importedAt: new Date().toISOString() };
      const planData = { version: 2, projectKind: 'imported-pdf', id, title: current.file.name.replace(/\.pdf$/i, ''), source: `PDF importé · ${current.pdf.numPages} pages`, sourceSha256: current.sha256, analysis: 'Lecture locale des cotes, liaison aux lignes de dimension, vérification de cohérence et propositions de surfaces colorées. Les zones restent modifiables et les volumes cachés non déduits restent inconnus.', faces, dimensions: { width: null, depth: null, wallHeight: null, roofRise: null }, dimensionStatus: 'incomplete', dimensionNote: 'Échelles calculées à partir des cotes détectées. Géométrie 3D à compléter; aucune dimension de la démonstration MIR n’est réutilisée.', recess: { enabled: false, confirmed: false }, footprint: { type: 'unknown' }, referencePages: current.references, sourceMetadata: source };
      const takeoffSeed = { version: 1, calibrations, geometry: { buildingWidthFt: null, buildingDepthFt: null, recessStartFt: null, recessWidthFt: null, recessDepthFt: null, recessHeightFt: null, returnCladHeightFt: null, confirmed: false }, footprintEvidence: null, note: 'Échelles automatiques proposées à partir des cotes. Contrôler les contours, les masques et les mesures avant une commande.' };
      const entry = { id, planData, takeoffSeed, source, sourceFile: current.file, createdAt: new Date().toISOString() };
      await MIRProjectStore.saveActive(entry); progress('Votre projet est prêt.', 100); busy(false); const done = callback; close(); if (done) await done({ ...entry, projectData: planData, takeoffData: takeoffSeed }); else location.reload();
    } catch (e) { error(readableError(e)); progress('Votre projet précédent est conservé. Réessayez l’enregistrement.', null); busy(false); }
  }
  window.MIRPlanImport = Object.freeze({ open, close, version: 1 });
})();
