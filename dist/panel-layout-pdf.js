/* MIR architectural panel layout — browser-local PDF pages and dimension evidence.
 * Only the selected file's bytes enter PDF.js. Dependencies, fonts and workers
 * are served by this Site. No file, page, drawing or extracted text is uploaded.
 * A scanned page without a text layer remains measurable by manual calibration;
 * this adapter does not claim to have OCR or a confirmed architectural scale.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRPanelLayoutPDF = api;
})(typeof window === 'object' ? window : globalThis, function (root) {
  'use strict';
  const MAX_BYTES = 50 * 1024 * 1024, MAX_PAGES = 60, MAX_EDGE = 2200, MAX_PIXELS = 6e6;
  const MAX_TEXT_ITEMS = 12000, MAX_ANALYSIS_WORDS = 1600, CACHE_PAGES = 2;
  const finite = Number.isFinite;
  const copy = value => JSON.parse(JSON.stringify(value));
  const scriptURL = root.document?.currentScript?.src || root.document?.baseURI || root.location?.href || null;
  const baseURL = scriptURL ? new URL('.', scriptURL) : null;
  let defaultAdapter, dependencyPromise;

  function failure(code, message, name = 'Error') {
    const error = new Error(message); error.code = code; error.name = name; return error;
  }
  function cancelled() { return failure('PDF_RENDER_CANCELLED', 'La lecture de cette page a été remplacée ou fermée.', 'AbortError'); }
  function readableError(error) {
    if (error?.code?.startsWith('PDF_')) return error;
    if (error?.name === 'AbortError' || error?.name === 'RenderingCancelledException') return cancelled();
    if (error?.name === 'PasswordException') return failure('PDF_PASSWORD_REQUIRED', 'Ce PDF est protégé par un mot de passe. Importez une copie déverrouillée.');
    if (error?.name === 'InvalidPDFException') return failure('PDF_INVALID', 'Ce PDF semble endommagé. Essayez une nouvelle exportation de votre plan.');
    return failure('PDF_READ_FAILED', 'La lecture de ce PDF n’a pas réussi. Réessayez ou importez une nouvelle exportation du plan.');
  }
  function validateFile(file) {
    if (!file || typeof file.arrayBuffer !== 'function' || !finite(file.size)) throw failure('PDF_FILE_REQUIRED', 'Choisissez un fichier PDF sur votre appareil.');
    if (!/\.pdf$/i.test(String(file.name || '')) && file.type !== 'application/pdf') throw failure('PDF_FILE_TYPE', 'Choisissez un fichier PDF.');
    if (file.size > MAX_BYTES) throw failure('PDF_FILE_TOO_LARGE', 'Ce PDF dépasse 50 Mo. Exportez une copie contenant seulement les pages utiles.');
    if (file.size < 32) throw failure('PDF_FILE_EMPTY', 'Ce fichier est vide ou incomplet.');
  }
  function validateBytes(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 32) throw failure('PDF_FILE_EMPTY', 'Ce fichier est vide ou incomplet.');
    if (buffer.byteLength > MAX_BYTES) throw failure('PDF_FILE_TOO_LARGE', 'Ce PDF dépasse 50 Mo. Exportez une copie contenant seulement les pages utiles.');
    const bytes = new Uint8Array(buffer), signature = [37, 80, 68, 70, 45];
    let found = false;
    for (let i = 0; i <= Math.min(1024, bytes.length) - signature.length && !found; i++) found = signature.every((value, j) => bytes[i + j] === value);
    if (!found) throw failure('PDF_FILE_SIGNATURE', 'Le contenu de ce fichier ne correspond pas à un PDF.');
    return bytes;
  }
  function renderSize(width, height) {
    if (!finite(width) || !finite(height) || width <= 0 || height <= 0) throw failure('PDF_PAGE_SIZE', 'Les dimensions de cette page PDF sont invalides.');
    const scale = Math.min(2.5, MAX_EDGE / Math.max(width, height), Math.sqrt(MAX_PIXELS / width / height));
    if (!finite(scale) || scale <= 0) throw failure('PDF_PAGE_SIZE', 'Les dimensions de cette page PDF sont invalides.');
    return { scale, widthPx: Math.max(1, Math.floor(width * scale)), heightPx: Math.max(1, Math.floor(height * scale)) };
  }
  function multiply(a, b) {
    return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  }
  function extractWords(items, viewport, options = {}) {
    if (!Array.isArray(items) || !Array.isArray(viewport?.transform) || viewport.transform.length < 6 || !viewport.transform.every(finite)) return [];
    const factor = finite(viewport.scale) && viewport.scale > 0 ? viewport.scale : Math.hypot(viewport.transform[0], viewport.transform[1]);
    if (!(factor > 0)) return [];
    const transform = options.clockwise ? multiply([0, 1, -1, 0, viewport.height, 0], viewport.transform) : viewport.transform;
    const words = [];
    for (const item of items.slice(0, MAX_TEXT_ITEMS)) {
      if (!item || typeof item.str !== 'string' || !item.str.trim() || !Array.isArray(item.transform) || item.transform.length < 6 || !item.transform.every(finite) || !finite(item.width) || item.width <= 0) continue;
      const tr = multiply(transform, item.transform), angle = Math.atan2(tr[1], tr[0]);
      // Rotated cotes are read in a separate, rotated raster coordinate system.
      // Skewed or diagonal text remains unmeasured rather than approximated.
      if (Math.abs(Math.sin(angle)) > .18) continue;
      const width = Math.abs(item.width) * factor, height = Math.hypot(tr[2], tr[3]);
      if (!(width > 0 && height > 0)) continue;
      const advance = [Math.cos(angle) * width, Math.sin(angle) * width];
      const corners = [[tr[4], tr[5]], [tr[4] + advance[0], tr[5] + advance[1]],
        [tr[4] + tr[2], tr[5] + tr[3]], [tr[4] + advance[0] + tr[2], tr[5] + advance[1] + tr[3]]];
      const box = [Math.min(...corners.map(p => p[0])), Math.min(...corners.map(p => p[1])), Math.max(...corners.map(p => p[0])), Math.max(...corners.map(p => p[1]))];
      if (!box.every(finite) || box[2] <= box[0] || box[3] <= box[1]) continue;
      words.push({ text: item.str.trim().slice(0, 200), box, confidence: 100, source: 'pdf-text' });
    }
    return words;
  }
  function normalizeCandidates(input, widthPx, heightPx) {
    const result = [], seen = new Set();
    for (const raw of Array.isArray(input) ? input : []) {
      if (!raw || !Array.isArray(raw.anchors) || raw.anchors.length !== 2 || !raw.anchors.every(p => Array.isArray(p) && p.length === 2 && p.every(finite))) continue;
      const anchors = raw.anchors.map(p => p.slice());
      if (anchors.some(p => p[0] < 0 || p[1] < 0 || p[0] > widthPx || p[1] > heightPx)) continue;
      if (!finite(raw.referenceFt) || raw.referenceFt <= 0 || raw.referenceFt > 2000 || !finite(raw.score)) continue;
      if (!['pdf-text', 'ocr', 'manual-correction'].includes(raw.source)) continue;
      const spanPx = Math.hypot(anchors[1][0] - anchors[0][0], anchors[1][1] - anchors[0][1]);
      if (spanPx < 50) continue;
      const feetPerPixel = raw.referenceFt / spanPx;
      if (feetPerPixel < .00005 || feetPerPixel > 10) continue;
      const axis = Math.abs(anchors[1][0] - anchors[0][0]) >= Math.abs(anchors[1][1] - anchors[0][1]) ? 'x' : 'y';
      const ordered = anchors.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const key = axis + ':' + ordered.map(p => p.map(n => Math.round(n)).join(',')).join(';') + ':' + raw.referenceFt;
      if (seen.has(key)) continue; seen.add(key);
      result.push({ text: String(raw.text || '').slice(0, 120), normalized: String(raw.normalized || raw.text || '').slice(0, 120),
        referenceFt: raw.referenceFt, anchors, spanPx, feetPerPixel, axis,
        score: Math.max(0, Math.min(1, raw.score)), confidence: finite(raw.confidence) ? Math.max(0, Math.min(100, raw.confidence)) : 0,
        source: raw.source, corrected: raw.corrected === true,
        textBox: Array.isArray(raw.textBox) && raw.textBox.length === 4 && raw.textBox.every(finite) ? raw.textBox.slice() : null });
    }
    return result.sort((a, b) => b.score - a.score || b.spanPx - a.spanPx);
  }
  function unknownScale(message) {
    return { status: 'not_found', feetPerPixel: null, referenceFt: null, anchors: null, accepted: [], candidates: [], message, requiresReview: true };
  }
  function dimensionWords(analysis, words, bareMetricMm) {
    const parts = /^[\d\s'’′"″“”¼½¾⅛⅜⅝⅞⅓⅔.,+\-–—/⁄]+$/;
    const units = /^(?:pi|pieds?|ft|feet|po|in|inches?|mm|cm|m)$/i;
    const possible = words.filter(w => w.text.length <= 60 && (analysis.parseDimension(w.text, { bareMetricMm }) || parts.test(w.text) || units.test(w.text)));
    return { words: possible.slice(0, MAX_ANALYSIS_WORDS), limited: possible.length > MAX_ANALYSIS_WORDS };
  }
  function originalVerticalWord(word, originalHeight) {
    const [x0, y0, x1, y1] = word.box;
    return { ...word, box: [y0, originalHeight - x1, y1, originalHeight - x0], axis: 'y' };
  }
  function clonePage(page) {
    return { ...page, words: copy(page.words), candidates: copy(page.candidates), scale: copy(page.scale), detection: copy(page.detection), warnings: page.warnings.slice() };
  }

  // A small runtime boundary keeps file validation, page lifecycle and scale
  // evidence testable without network access or a simulated browser UI.
  function createAdapter(runtime) {
    if (typeof runtime?.loadDependencies !== 'function' || typeof runtime?.createCanvas !== 'function') throw new TypeError('Un moteur PDF et une surface de dessin sont requis.');
    const asset = runtime.asset || (path => path);
    async function open(file) {
      validateFile(file);
      let loadingTask, pdf;
      try {
        const data = validateBytes(await file.arrayBuffer());
        const { pdfjs, analysis } = await runtime.loadDependencies();
        if (typeof pdfjs?.getDocument !== 'function' || typeof analysis?.matchDimensionLines !== 'function' || typeof analysis?.resolveScale !== 'function' || typeof analysis?.parseDimension !== 'function') throw failure('PDF_DEPENDENCIES', 'Les outils de lecture du PDF n’ont pas chargé. Rechargez la page puis réessayez.');
        loadingTask = pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false,
          cMapUrl: asset('vendor/pdfjs/cmaps/'), cMapPacked: true,
          standardFontDataUrl: asset('vendor/pdfjs/standard_fonts/'), wasmUrl: asset('vendor/pdfjs/wasm/'),
          stopAtErrors: false });
        pdf = await loadingTask.promise;
        if (!Number.isInteger(pdf.numPages) || pdf.numPages < 1) throw failure('PDF_NO_PAGES', 'Ce PDF ne contient aucune page lisible.');
        if (pdf.numPages > MAX_PAGES) throw failure('PDF_TOO_MANY_PAGES', 'Ce PDF contient plus de 60 pages. Exportez les façades et les détails utiles dans un PDF plus court.');
        let closed = false, sequence = 0, activeTask = null;
        const cache = new Map();
        const current = version => { if (closed || version !== sequence) throw cancelled(); };
        const stopRender = () => { const task = activeTask; activeTask = null; if (task) { try { task.cancel(); } catch {} } };
        async function render(number) {
          if (closed) throw cancelled();
          if (!Number.isInteger(number) || number < 1 || number > pdf.numPages) throw failure('PDF_PAGE_RANGE', 'Choisissez une page existante dans ce PDF.');
          const version = ++sequence; stopRender();
          if (cache.has(number)) { const page = cache.get(number); cache.delete(number); cache.set(number, page); return clonePage(page); }
          let page, canvas, rotated, renderTask;
          try {
            page = await pdf.getPage(number); current(version);
            const base = page.getViewport({ scale: 1 }), size = renderSize(base.width, base.height);
            const viewport = page.getViewport({ scale: size.scale });
            canvas = runtime.createCanvas(size.widthPx, size.heightPx); canvas.width = size.widthPx; canvas.height = size.heightPx;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw failure('PDF_CANVAS', 'Le navigateur n’a pas pu préparer l’image de cette page.');
            renderTask = page.render({ canvasContext: ctx, viewport, background: '#ffffff', annotationMode: pdfjs.AnnotationMode?.DISABLE ?? 0 });
            activeTask = renderTask; await renderTask.promise; current(version);
            let items = [], textFailed = false;
            try { const content = await page.getTextContent({ disableNormalization: false }); items = Array.isArray(content.items) ? content.items : []; }
            catch { current(version); textFailed = true; }
            current(version);
            const horizontalWords = extractWords(items, viewport);
            // The rotated raster uses the integer canvas height, not a fractional
            // PDF viewport edge, so its word boxes and ink remain in one frame.
            const verticalWords = extractWords(items, { transform: viewport.transform, scale: viewport.scale, height: canvas.height }, { clockwise: true });
            const warnings = [];
            if (items.length > MAX_TEXT_ITEMS) warnings.push('Cette page contient beaucoup de texte; la lecture automatique est partielle. Vérifiez les cotes utilisées.');
            if (textFailed) warnings.push('Le texte de cette page n’a pas pu être extrait. Vous pouvez renseigner une cote exacte entre deux points.');
            let candidates = [], scale;
            const hasText = items.some(item => typeof item?.str === 'string' && item.str.trim());
            let detectionMode = hasText ? 'pdf-text' : 'no-text', limited = items.length > MAX_TEXT_ITEMS;
            if (!hasText) {
              scale = unknownScale('Cette page n’a pas de texte exploitable. Indiquez une cote exacte entre deux points pour trouver son échelle.');
            } else {
              try {
                const pageText = items.slice(0, MAX_TEXT_ITEMS).map(item => item.str || '').join(' ');
                const bareMetricMm = /(?:dimensions?|cotes?)[^\n]{0,90}(?:millim[eè]tres|\bmm\b)/i.test(pageText);
                const horizontal = dimensionWords(analysis, horizontalWords, bareMetricMm), vertical = dimensionWords(analysis, verticalWords, bareMetricMm);
                limited ||= horizontal.limited || vertical.limited;
                if (horizontal.words.length) candidates = analysis.matchDimensionLines(ctx.getImageData(0, 0, canvas.width, canvas.height), horizontal.words, { bareMetricMm });
                if (vertical.words.length) {
                  rotated = runtime.createCanvas(canvas.height, canvas.width); rotated.width = canvas.height; rotated.height = canvas.width;
                  const rctx = rotated.getContext('2d', { willReadFrequently: true });
                  if (!rctx) throw new Error('Rotated canvas unavailable');
                  rctx.translate(rotated.width, 0); rctx.rotate(Math.PI / 2); rctx.drawImage(canvas, 0, 0);
                  const matches = analysis.matchDimensionLines(rctx.getImageData(0, 0, rotated.width, rotated.height), vertical.words, { bareMetricMm, axis: 'y' });
                  candidates.push(...matches.map(c => analysis.unrotateCandidate(c, canvas.width, canvas.height, 'cw')));
                }
                candidates = normalizeCandidates(candidates, canvas.width, canvas.height);
                scale = { ...analysis.resolveScale(candidates), requiresReview: true };
                if (limited) warnings.push('La détection automatique est limitée aux premières cotes lisibles. Vérifiez la vue et les repères sélectionnés.');
              } catch {
                candidates = []; detectionMode = 'analysis-unavailable';
                scale = unknownScale('La lecture automatique des cotes n’a pas abouti. Indiquez une cote exacte entre deux points.');
                warnings.push('Le plan reste utilisable avec vos dimensions exactes et un calibrage manuel.');
              }
            }
            current(version);
            const imageDataUrl = canvas.toDataURL('image/jpeg', .92);
            if (!/^data:image\/(?:jpeg|png);base64,/.test(imageDataUrl)) throw failure('PDF_PAGE_IMAGE', 'L’image de cette page n’a pas pu être préparée.');
            const result = { pageNumber: number, widthPx: canvas.width, heightPx: canvas.height, imageDataUrl,
              words: [...horizontalWords, ...verticalWords.map(w => originalVerticalWord(w, canvas.height))], candidates, scale,
              detection: { mode: detectionMode, hasTextLayer: hasText, ocrPerformed: false, limited, candidateCount: candidates.length }, warnings };
            cache.set(number, result); while (cache.size > CACHE_PAGES) cache.delete(cache.keys().next().value);
            return clonePage(result);
          } catch (error) {
            if (closed || version !== sequence) throw cancelled();
            throw readableError(error);
          } finally {
            if (activeTask === renderTask) activeTask = null;
            if (canvas) canvas.width = canvas.height = 1;
            if (rotated) rotated.width = rotated.height = 1;
            try { page?.cleanup(); } catch {}
          }
        }
        async function close() {
          if (closed) return; closed = true; sequence++; stopRender(); cache.clear();
          try { await loadingTask.destroy(); } catch {}
        }
        return Object.freeze({ pageCount: pdf.numPages, fileName: String(file.name || 'Plan.pdf').slice(0, 240), render, close });
      } catch (error) {
        try { if (loadingTask?.destroy) await loadingTask.destroy(); else if (pdf?.destroy) await pdf.destroy(); } catch {}
        throw readableError(error);
      }
    }
    return Object.freeze({ open });
  }
  function browserAsset(path) {
    if (!baseURL || !root.document || baseURL.origin !== root.location?.origin) throw failure('PDF_DEPENDENCIES', 'Les outils PDF doivent être chargés depuis ce site.');
    return new URL(path, baseURL).href;
  }
  function loadAnalysis() {
    if (root.MIRPDFAnalysis) return Promise.resolve(root.MIRPDFAnalysis);
    return new Promise((resolve, reject) => {
      const script = root.document.createElement('script'); script.src = browserAsset('plan-import-core.js');
      script.onload = () => root.MIRPDFAnalysis ? resolve(root.MIRPDFAnalysis) : reject(failure('PDF_DEPENDENCIES', 'Le lecteur de cotes n’a pas chargé. Rechargez la page.'));
      script.onerror = () => { script.remove(); reject(failure('PDF_DEPENDENCIES', 'Le lecteur de cotes n’a pas chargé. Rechargez la page.')); };
      root.document.head.append(script);
    });
  }
  function browserDependencies() {
    if (!dependencyPromise) dependencyPromise = Promise.all([import(browserAsset('vendor/pdfjs/pdf.min.mjs')), loadAnalysis()]).then(([pdfjs, analysis]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = browserAsset('vendor/pdfjs/pdf.worker.min.mjs'); return { pdfjs, analysis };
    }).catch(() => { dependencyPromise = null; throw failure('PDF_DEPENDENCIES', 'Les outils de lecture du PDF n’ont pas chargé. Rechargez la page puis réessayez.'); });
    return dependencyPromise;
  }
  function open(file) {
    if (!defaultAdapter) defaultAdapter = createAdapter({ asset: browserAsset, loadDependencies: browserDependencies, createCanvas: () => root.document.createElement('canvas') });
    return defaultAdapter.open(file);
  }
  return Object.freeze({ version: '1.0.0', open, createAdapter, renderSize, extractWords, normalizeCandidates });
});
