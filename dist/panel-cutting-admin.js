/* MIR · Workshop panel-cutting controls. The cutting engine remains the only quantity source. */
(function (factory) {
  'use strict';
  var root = typeof window === 'object' ? window : globalThis;
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window === 'object') window.MIRPanelCuttingAdmin = api;
})(function (root) {
  'use strict';
  var instances = new WeakMap();
  var MIN_GAP = .75;
  var defaults = { requireFactoryBottom: true, panelGapIn: MIN_GAP, allowedStockKeys: ['48x96', '48x120'] };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var finite = function (n) { return typeof n === 'number' && Number.isFinite(n); };
  var list = function (v) { return Array.isArray(v) ? v : []; };
  var gcd = function (a, b) { while (b) { var t = b; b = a % b; a = t; } return a; };
  var number = function (n, digits) { return finite(n) ? n.toLocaleString('fr-CA', { maximumFractionDigits: digits == null ? 1 : digits }) : 'À préciser'; };
  var stockName = function (key) { return key === '48x96' ? '4 × 8 pi' : key === '48x120' ? '4 × 10 pi' : String(key || 'Format à préciser'); };

  /** Inches at 1/16 precision; a rounded or unconfirmed measurement retains its approximation marker. */
  function formatIn(value, options) {
    options = typeof options === 'boolean' ? { approximate: options } : (options || {});
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'À préciser';
    var n = Number(value), ticks = Math.round(Math.abs(n) * 16);
    var whole = Math.floor(ticks / 16), numerator = ticks % 16, result = String(whole);
    if (numerator) {
      var divisor = gcd(numerator, 16);
      result = (whole ? whole + ' ' : '') + numerator / divisor + '/' + 16 / divisor;
    }
    if (n < 0 && ticks) result = '−' + result;
    if (options.unit !== false) result += '″';
    if (options.approximate || Math.abs(n - Math.sign(n) * ticks / 16) > 1e-8) result = '≈ ' + result;
    return result;
  }

  function init(options) {
    options = options || {};
    var element = options.element;
    if (typeof element === 'string' && root.document) element = root.document.querySelector(element);
    if (!element || typeof element.querySelector !== 'function') throw new TypeError('MIRPanelCuttingAdmin.init : élément du plan de coupe manquant.');
    if (instances.has(element)) return instances.get(element);
    var doc = element.ownerDocument || root.document;
    var q = function (selector) { return element.querySelector(selector); };
    var all = function (selector, host) { return Array.from((host || element).querySelectorAll(selector)); };
    var ref = function (id) { return q('#' + id) || (doc && doc.getElementById ? doc.getElementById(id) : null); };
    var refs = {};
    ['cut-factory', 'cut-stock', 'cut-gap', 'cut-summary', 'cut-status', 'cut-revision', 'cut-alerts',
      'cut-alert-list', 'cut-face', 'cut-face-drawing', 'cut-sheet', 'cut-sheet-drawing', 'cut-sheet-material',
      'cut-selection', 'cut-materials', 'cut-piece-rows', 'cut-pending', 'cut-zoom',
      'cut-zoom-title', 'cut-zoom-drawing', 'cut-zoom-caption'].forEach(function (id) { refs[id] = ref(id); });
    var plan = null, faces = [], selectedPieceId = null, selectedFaceKey = '', selectedSheetId = '';
    var piecesById = new Map(), sheetByPiece = new Map(), zoomKind = null, zoomReturnFocus = null, exporting = false;
    var view = element.getAttribute('data-cut-view') === 'elevations' ? 'elevations' : 'sheets';
    var dialog = refs['cut-zoom'];
    var notify = function (message) { if (typeof options.toast === 'function') options.toast(message); };
    var text = function (id, value) { if (refs[id]) refs[id].textContent = value; };
    var html = function (id, value) { if (refs[id]) refs[id].innerHTML = value; };

    function currentSettings() {
      var supplied = typeof options.getSettings === 'function' ? options.getSettings() : null;
      return Object.assign({}, defaults, plan && plan.settings || {}, supplied || {});
    }
    function productLabel(item) {
      var label = typeof options.materialLabel === 'function' ? options.materialLabel(item) : '';
      if (typeof label === 'string' && label.trim()) return label;
      return [item && item.brand, item && (item.materialName || item.name)].filter(Boolean).join(' · ') || 'Produit à préciser';
    }
    function colorLabel(item) {
      return item && (item.colorName || item.color && typeof item.color === 'object' && item.color.name) || 'Couleur à préciser';
    }
    function faceFor(key) { return faces.find(function (face) { return (face.key || face.id) === key; }); }
    function sheetFor(id) { return list(plan && plan.sheets).find(function (sheet) { return sheet.id === id; }); }
    function faceName(key) { var face = faceFor(key); return face && (face.name || face.label) || key || 'Élévation à préciser'; }
    function dimensionText(piece) {
      return formatIn(piece.widthIn, { approximate: piece.dimensionsConfirmed === false }) + ' × ' +
        formatIn(piece.heightIn, { approximate: piece.dimensionsConfirmed === false });
    }
    function messageText(issue) {
      if (typeof issue === 'string') return issue;
      return issue && typeof issue.message === 'string' ? issue.message : '';
    }
    function sourceLabel(issue) {
      if (!issue || typeof issue !== 'object') return '';
      var piece = piecesById.get(issue.pieceId);
      return [piece && piece.label, issue.face && faceName(issue.face), piece && piece.zoneName || issue.zoneId].filter(Boolean).join(' · ');
    }
    function unplacedMessages(item) {
      var messages = list(item && item.messages).map(messageText).filter(Boolean);
      if (messages.length) return messages;
      if (item && typeof item.message === 'string') return [item.message];
      return ['Découpe à préciser avant fabrication.'];
    }
    function bottomLabel(piece) {
      if (!piece.requireFactoryBottom) return 'Bas d’usine non exigé';
      return piece.bottomStatus === 'identified' ? 'BAS — USINE' : 'Bas après pose à confirmer';
    }
    function focusedDescriptor() {
      var active = doc && doc.activeElement;
      if (!active || !(element.contains(active) || dialog && dialog.contains(active))) return null;
      var piece = active.closest && active.closest('[data-panel-piece]');
      var host = active.closest && active.closest('#cut-face-drawing, #cut-sheet-drawing, #cut-zoom-drawing, #cut-piece-rows, #cut-pending');
      var descriptor = { original: active, id: active.id, pieceId: piece && piece.getAttribute('data-panel-piece'), hostId: host && host.id };
      if (typeof active.selectionStart === 'number') {
        descriptor.selectionStart = active.selectionStart;
        descriptor.selectionEnd = active.selectionEnd;
      }
      return descriptor;
    }
    function focusElement(target, descriptor) {
      if (!target || typeof target.focus !== 'function' || target.disabled) return;
      try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
      if (descriptor && finite(descriptor.selectionStart) && typeof target.setSelectionRange === 'function') {
        try { target.setSelectionRange(descriptor.selectionStart, descriptor.selectionEnd); } catch (_) { /* Number inputs have no text range. */ }
      }
    }
    function matchingPiece(host, id) {
      return host && all('[data-panel-piece]', host).find(function (node) { return node.getAttribute('data-panel-piece') === id; });
    }
    function restoreFocus(descriptor) {
      if (!descriptor) return;
      if (descriptor.original && descriptor.original.isConnected !== false && (element.contains(descriptor.original) || dialog && dialog.contains(descriptor.original))) {
        focusElement(descriptor.original, descriptor); return;
      }
      var target = descriptor.id && ref(descriptor.id);
      if (!target && descriptor.pieceId) {
        var host = descriptor.hostId && ref(descriptor.hostId);
        target = matchingPiece(host || element, descriptor.pieceId) || matchingPiece(refs['cut-piece-rows'], descriptor.pieceId);
      }
      if (!target && descriptor.hostId) target = refs[descriptor.hostId === 'cut-face-drawing' ? 'cut-face' : 'cut-sheet'];
      focusElement(target, descriptor);
    }

    function renderSettings() {
      var settings = currentSettings();
      if (refs['cut-factory']) refs['cut-factory'].checked = settings.requireFactoryBottom !== false;
      if (refs['cut-stock']) {
        var keys = list(settings.allowedStockKeys);
        refs['cut-stock'].value = keys.length === 1 && (keys[0] === '48x96' || keys[0] === '48x120') ? keys[0] : 'both';
      }
      if (refs['cut-gap']) {
        refs['cut-gap'].min = String(MIN_GAP);
        refs['cut-gap'].step = '.0625';
        refs['cut-gap'].value = finite(settings.panelGapIn) ? String(settings.panelGapIn) : String(MIN_GAP);
      }
    }
    function renderSummary() {
      if (!plan) {
        text('cut-status', 'Le plan de coupe attend les surfaces du projet.');
        text('cut-revision', '');
        html('cut-summary', '');
        return;
      }
      var summary = plan.summary || {}, sheets = list(plan.sheets), pieces = list(plan.pieces);
      var sheetKnown = finite(summary.sheetCountKnown) ? summary.sheetCountKnown : sheets.length;
      var pieceKnown = finite(summary.knownPieceCount) ? summary.knownPieceCount : pieces.length;
      var incomplete = plan.complete !== true;
      var sheetCount = !incomplete && finite(summary.sheetCount) ? number(summary.sheetCount, 0) : number(sheetKnown, 0) + ' + à définir';
      var pieceCount = finite(summary.pieceCount) ? number(summary.pieceCount, 0) : number(pieceKnown, 0) + ' + à définir';
      var netArea = finite(summary.netPieceAreaIn2) ? number(summary.netPieceAreaIn2 / 144, 2) + ' pi²' :
        finite(summary.knownNetPieceAreaIn2) && summary.knownNetPieceAreaIn2 > 0 ? number(summary.knownNetPieceAreaIn2 / 144, 2) + ' pi² connus + à définir' : 'À définir';
      var stats = [
        ['Feuilles', sheetCount, incomplete ? 'Quantité connue; les éléments incomplets restent à résoudre.' : 'Disposition proposée, à vérifier avant coupe.'],
        ['Morceaux', pieceCount, number(finite(summary.placedPieceCount) ? summary.placedPieceCount : 0, 0) + ' placés sur les feuilles.'],
        ['Surface nette', netArea, 'Ouvertures et contours découpés conservés.']
      ];
      html('cut-summary', stats.map(function (stat) { return '<div class="cut-admin-stat"><span>' + esc(stat[0]) + '</span><strong>' + esc(stat[1]) + '</strong><small>' + esc(stat[2]) + '</small></div>'; }).join(''));
      var invalid = plan.validation && plan.validation.valid === false;
      text('cut-status', invalid ? 'Disposition à corriger · vérification géométrique non satisfaite' :
        incomplete ? 'Débit partiel · compléments nécessaires' : 'Débit proposé · à vérifier avant coupe');
      if (refs['cut-status']) refs['cut-status'].setAttribute('data-state', invalid ? 'invalid' : incomplete ? 'partial' : 'ready');
      text('cut-revision', plan.revision ? 'Révision ' + plan.revision : 'Révision à préciser');
    }
    function renderWarnings() {
      var warnings = list(plan && plan.warnings).concat(list(plan && plan.pendingSources));
      if (plan && plan.validation && plan.validation.valid === false) warnings = warnings.concat(list(plan.validation.errors));
      var seen = new Set(), entries = [];
      warnings.forEach(function (issue) {
        var message = messageText(issue);
        if (!message) return;
        var source = sourceLabel(issue), key = source + '|' + message;
        if (seen.has(key)) return;
        seen.add(key);
        entries.push('<li>' + (source ? '<strong>' + esc(source) + '.</strong> ' : '') + esc(message) + '</li>');
      });
      html('cut-alert-list', entries.join(''));
      if (refs['cut-alerts']) refs['cut-alerts'].hidden = !entries.length;
      var pending = list(plan && plan.unplaced);
      html('cut-pending', pending.length ? '<h4>Morceaux à résoudre</h4><ul>' + pending.map(function (item) {
        var piece = piecesById.get(item.pieceId);
        return '<li>' + (piece ? '<button type="button" class="cut-admin-piece-link" data-panel-piece="' + esc(piece.id) + '" aria-pressed="' + (selectedPieceId === piece.id) + '">' + esc(piece.label) + '</button> ' : esc(item.label || 'Morceau') + ' ') +
          esc(unplacedMessages(item).join(' ')) + '</li>';
      }).join('') + '</ul>' : '');
      if (refs['cut-pending']) refs['cut-pending'].hidden = !pending.length;
    }
    function fillSelect(select, rows, current, placeholder) {
      if (!select) return;
      select.innerHTML = '<option value="">' + esc(placeholder) + '</option>' + rows.map(function (row) {
        return '<option value="' + esc(row.value) + '">' + esc(row.label) + '</option>';
      }).join('');
      select.value = current;
      select.disabled = !rows.length;
    }
    function renderSelectors() {
      fillSelect(refs['cut-face'], faces.map(function (face) { return { value: face.key || face.id, label: face.name || face.label || face.key || face.id }; }), selectedFaceKey, 'Choisir une élévation');
      fillSelect(refs['cut-sheet'], list(plan && plan.sheets).map(function (sheet) {
        return { value: sheet.id, label: (sheet.label || sheet.id) + ' · ' + stockName(sheet.stockKey) + ' · ' + colorLabel(sheet) };
      }), selectedSheetId, 'Choisir une feuille');
    }
    function drawingHTML(kind) {
      if (!plan) return '<p class="cut-admin-empty">Le dessin apparaîtra après le calcul des surfaces.</p>';
      var views = root.MIRPanelCuttingViews;
      if (!views) return '<p class="cut-admin-empty">Le module de dessin du plan de coupe est indisponible.</p>';
      if (kind === 'sheets') {
        var sheet = sheetFor(selectedSheetId);
        if (!sheet) return '<p class="cut-admin-empty">' + (selectedPieceId && !sheetByPiece.has(selectedPieceId) ? 'Cette pièce n’est pas encore affectée à une feuille. Consultez le détail à résoudre.' : 'Aucune feuille sélectionnée. Les cotes ou les contraintes peuvent rester à préciser.') + '</p>';
        return views.sheetSVG(sheet, plan, { selectedPieceId: selectedPieceId });
      }
      var face = faceFor(selectedFaceKey);
      if (!face) return '<p class="cut-admin-empty">Choisissez une élévation.</p>';
      if (typeof options.makeFaceSvg !== 'function') return '<p class="cut-admin-empty">Le dessin source de cette élévation est indisponible.</p>';
      var base = options.makeFaceSvg(face);
      base = typeof base === 'string' ? base : base && base.outerHTML || '';
      var end = base.lastIndexOf('</svg>');
      if (end < 0) return '<p class="cut-admin-empty">Le dessin source de cette élévation est indisponible.</p>';
      // A fresh base SVG is supplied for every redraw. Never append onto the previous decorated drawing.
      return base.slice(0, end) + views.faceOverlay(face, plan, { selectedPieceId: selectedPieceId, showDimensions: true }) + base.slice(end);
    }
    function zoomCaption(kind) {
      if (kind === 'elevations') return 'Même repère sur l’élévation et la feuille. Les dimensions des morceaux sont en pouces; ≈ indique une cote arrondie ou à confirmer.';
      var settings = plan && plan.settings || currentSettings();
      return 'Écart réservé entre les bruts : ' + formatIn(settings.panelGapIn) + '. BAS — USINE suit le bas après pose. Les traits inclinés et les ouvertures restent visibles.';
    }
    function renderZoom() {
      if (!zoomKind) return;
      var sheet = sheetFor(selectedSheetId);
      text('cut-zoom-title', zoomKind === 'elevations' ? 'Élévation · ' + faceName(selectedFaceKey) : sheet ? 'Feuille ' + (sheet.label || sheet.id) + ' · ' + stockName(sheet.stockKey) : 'Feuille à définir');
      html('cut-zoom-drawing', drawingHTML(zoomKind));
      text('cut-zoom-caption', zoomCaption(zoomKind));
    }
    function renderDrawings() {
      html('cut-face-drawing', drawingHTML('elevations'));
      html('cut-sheet-drawing', drawingHTML('sheets'));
      var sheet = sheetFor(selectedSheetId);
      text('cut-sheet-material', sheet ? productLabel(sheet) + ' · ' + colorLabel(sheet) + ' · ' + stockName(sheet.stockKey) : 'Feuille à définir');
      all('[data-cut-zoom]').forEach(function (button) {
        button.disabled = !plan || (button.getAttribute('data-cut-zoom') === 'elevations' ? !faceFor(selectedFaceKey) : !sheet);
      });
      renderZoom();
    }
    function renderRows() {
      var pieces = list(plan && plan.pieces);
      html('cut-piece-rows', pieces.length ? pieces.map(function (piece) {
        var sheet = sheetByPiece.get(piece.id), selected = piece.id === selectedPieceId;
        return '<tr data-cut-row-piece="' + esc(piece.id) + '"' + (selected ? ' class="cut-admin-row-selected"' : '') + '>' +
          '<th scope="row"><button type="button" class="cut-admin-piece-link" data-panel-piece="' + esc(piece.id) + '" aria-pressed="' + selected + '">' + esc(piece.label || piece.id) + '</button></th>' +
          '<td>' + esc(piece.faceName || faceName(piece.face)) + '<small>' + esc(piece.zoneName || piece.zoneId || 'Zone à préciser') + '</small></td>' +
          '<td>' + esc(productLabel(piece)) + '<small>' + esc(colorLabel(piece)) + '</small></td>' +
          '<td class="cut-admin-dimensions">' + esc(dimensionText(piece)) + (piece.special ? '<small>Forme découpée · voir le dessin</small>' : '') + '</td>' +
          '<td>' + esc(bottomLabel(piece)) + '</td><td>' + (sheet ? esc(sheet.label || sheet.id) : '<span class="cut-admin-to-define">À définir</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="cut-admin-empty">' + (list(plan && plan.pendingSources).length ? 'Les morceaux restent à définir à partir des cotes et des contours manquants.' : 'Aucun panneau de fibrociment dans les surfaces connues.') + '</td></tr>');
    }
    function renderSelection() {
      var piece = piecesById.get(selectedPieceId), sheet = piece && sheetByPiece.get(piece.id);
      if (!piece) {
        html('cut-selection', '<p class="cut-admin-empty">Sélectionnez un repère P dans le dessin ou le tableau pour retrouver sa feuille et sa position sur l’élévation.</p>');
      } else {
        var pending = list(plan && plan.unplaced).find(function (item) { return item.pieceId === piece.id; });
        html('cut-selection', '<div class="cut-admin-selected-heading"><b>' + esc(piece.label) + '</b><div><strong>' + esc(piece.faceName || faceName(piece.face)) + ' · ' + esc(piece.zoneName || piece.zoneId) + '</strong><p>' + esc(productLabel(piece)) + ' · ' + esc(colorLabel(piece)) + '</p></div></div>' +
          '<dl class="cut-admin-selection-details"><div><dt>Dimensions du brut</dt><dd>' + esc(dimensionText(piece)) + '</dd></div><div><dt>Bas après pose</dt><dd>' + esc(bottomLabel(piece)) + '</dd></div><div><dt>Feuille</dt><dd>' + esc(sheet ? sheet.label || sheet.id : 'À définir') + '</dd></div></dl>' +
          (pending ? '<p class="cut-admin-pending-reason">' + esc(unplacedMessages(pending).join(' ')) + '</p>' : ''));
      }
      all('[data-cut-edit-layout]').forEach(function (button) { button.disabled = !faceFor(selectedFaceKey); });
    }
    function renderMaterials() {
      html('cut-materials', list(plan && plan.groups).map(function (group) {
        var known = finite(group.knownSheetCount) ? group.knownSheetCount : list(group.sheetIds).length;
        var count = group.complete && finite(group.sheetCount) ? number(group.sheetCount, 0) : number(known, 0) + ' + à définir';
        var grain = group.grain === 'none' ? 'Sans grain · rotation permise au débit' : group.grain === 'directional' ? 'Sens du grain conservé' : 'Sens du grain à préciser';
        return '<article class="cut-admin-material"><div><h4>' + esc(productLabel(group)) + '</h4><p>' + esc(colorLabel(group)) + '</p></div><strong>' + esc(count) + ' feuille' + (known > 1 ? 's' : '') + '</strong><small>' +
          esc(list(group.stockKeys).map(stockName).join(' / ') || 'Format à préciser') + ' · ' + esc(grain) + '</small>' +
          (list(group.messages).length ? '<ul>' + group.messages.map(function (message) { return '<li>' + esc(messageText(message)) + '</li>'; }).join('') + '</ul>' : '') + '</article>';
      }).join(''));
    }
    function setView(nextView) {
      view = nextView === 'elevations' ? 'elevations' : 'sheets';
      element.setAttribute('data-cut-view', view);
      all('[data-cut-view-button]').forEach(function (button) {
        var active = button.getAttribute('data-cut-view-button') === view;
        button.setAttribute('aria-pressed', String(active));
        if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active));
      });
    }
    function renderSelectionViews() {
      var focus = focusedDescriptor();
      renderSelectors(); renderDrawings(); renderRows(); renderSelection(); renderWarnings();
      restoreFocus(focus);
    }
    function selectPiece(id, settings) {
      settings = settings || {};
      var piece = piecesById.get(id);
      if (!piece) return false;
      selectedPieceId = piece.id;
      selectedFaceKey = piece.face;
      var sheet = sheetByPiece.get(piece.id);
      selectedSheetId = sheet ? sheet.id : '';
      renderSelectionViews();
      if (settings.focus === true) focusElement(matchingPiece(refs['cut-piece-rows'], piece.id));
      return true;
    }
    function render(nextPlan, nextFaces) {
      var focus = focusedDescriptor();
      plan = nextPlan || null;
      faces = list(nextFaces || plan && plan.faces).filter(function (face) { return face && (face.key || face.id); });
      piecesById = new Map(list(plan && plan.pieces).map(function (piece) { return [piece.id, piece]; }));
      sheetByPiece = new Map();
      list(plan && plan.sheets).forEach(function (sheet) { list(sheet.placements).forEach(function (placement) { sheetByPiece.set(placement.pieceId, sheet); }); });
      if (!piecesById.has(selectedPieceId)) selectedPieceId = null;
      if (selectedPieceId) {
        var piece = piecesById.get(selectedPieceId), sheet = sheetByPiece.get(selectedPieceId);
        selectedFaceKey = piece.face;
        selectedSheetId = sheet ? sheet.id : '';
      } else {
        if (!faceFor(selectedFaceKey)) selectedFaceKey = faces.length ? faces[0].key || faces[0].id : '';
        if (!sheetFor(selectedSheetId)) selectedSheetId = list(plan && plan.sheets).length ? plan.sheets[0].id : '';
      }
      renderSettings(); renderSummary(); renderWarnings(); renderSelectors(); renderDrawings(); renderRows(); renderSelection(); renderMaterials(); setView(view);
      all('[data-cut-pdf]').forEach(function (button) { button.disabled = !plan || exporting; });
      restoreFocus(focus);
      return api;
    }
    function settingsChanged(patch) {
      if (typeof options.onSettings !== 'function') { notify('Les réglages de coupe ne sont pas disponibles.'); renderSettings(); return; }
      try {
        var result = options.onSettings(patch);
        if (result && typeof result.catch === 'function') result.catch(function () { notify('Le réglage n’a pas pu être enregistré.'); renderSettings(); });
      } catch (_) { notify('Le réglage n’a pas pu être enregistré.'); renderSettings(); }
    }
    function onChange(event) {
      var target = event.target;
      if (target === refs['cut-factory']) settingsChanged({ requireFactoryBottom: target.checked });
      else if (target === refs['cut-stock']) {
        if (!['both', '48x96', '48x120'].includes(target.value)) { renderSettings(); return; }
        settingsChanged({ allowedStockKeys: target.value === 'both' ? ['48x96', '48x120'] : [target.value] });
      } else if (target === refs['cut-gap']) {
        var value = target.value.trim() === '' ? NaN : Number(target.value);
        if (!Number.isFinite(value) || value < MIN_GAP) {
          notify('L’écart entre les morceaux doit être d’au moins ¾ po. Le réglage précédent est conservé.');
          renderSettings(); return;
        }
        settingsChanged({ panelGapIn: value });
      } else if (target === refs['cut-face']) {
        selectedFaceKey = target.value;
        if (selectedPieceId && piecesById.get(selectedPieceId).face !== selectedFaceKey) selectedPieceId = null;
        renderSelectionViews();
      } else if (target === refs['cut-sheet']) {
        selectedSheetId = target.value;
        if (selectedPieceId && (!sheetByPiece.get(selectedPieceId) || sheetByPiece.get(selectedPieceId).id !== selectedSheetId)) selectedPieceId = null;
        renderSelectionViews();
      }
    }
    function openZoom(kind, trigger) {
      if (!dialog || !plan) return;
      zoomKind = kind === 'elevations' ? 'elevations' : 'sheets';
      zoomReturnFocus = trigger || doc && doc.activeElement;
      renderZoom();
      if (!dialog.open) {
        if (typeof dialog.showModal !== 'function') { zoomKind = null; notify('L’agrandissement nécessite un navigateur prenant en charge les fenêtres de dialogue.'); return; }
        try { dialog.showModal(); } catch (_) { zoomKind = null; notify('L’agrandissement n’a pas pu être ouvert.'); }
      }
    }
    function closeZoom() { if (dialog && dialog.open && typeof dialog.close === 'function') dialog.close(); }
    function onZoomClosed() {
      zoomKind = null;
      focusElement(zoomReturnFocus);
      zoomReturnFocus = null;
    }
    function exportPlan(mode) {
      if (!plan || exporting) return;
      if (typeof options.exportPdf !== 'function') { notify('L’export PDF est indisponible.'); return; }
      exporting = true;
      all('[data-cut-pdf]').forEach(function (button) { button.disabled = true; });
      var done = function () { exporting = false; all('[data-cut-pdf]').forEach(function (button) { button.disabled = !plan; }); };
      try {
        var result = options.exportPdf(mode === 'site' ? 'site' : 'complete');
        if (result && typeof result.then === 'function') result.then(done, function () { notify('Le PDF n’a pas pu être préparé.'); done(); });
        else done();
      } catch (_) { notify('Le PDF n’a pas pu être préparé.'); done(); }
    }
    function actionTarget(event, selector) {
      var target = event.target;
      return target && target.closest ? target.closest(selector) : null;
    }
    function onClick(event) {
      var target = actionTarget(event, '[data-panel-piece], [data-cut-row-piece], [data-cut-view-button], [data-cut-zoom], [data-cut-zoom-close], [data-cut-pdf], [data-cut-edit-layout]');
      if (!target || target.disabled) return;
      if (target.hasAttribute('data-panel-piece') || target.hasAttribute('data-cut-row-piece')) {
        selectPiece(target.getAttribute('data-panel-piece') || target.getAttribute('data-cut-row-piece'));
      } else if (target.hasAttribute('data-cut-view-button')) setView(target.getAttribute('data-cut-view-button'));
      else if (target.hasAttribute('data-cut-zoom')) openZoom(target.getAttribute('data-cut-zoom'), target);
      else if (target.hasAttribute('data-cut-zoom-close')) closeZoom();
      else if (target.hasAttribute('data-cut-pdf')) exportPlan(target.getAttribute('data-cut-pdf'));
      else if (target.hasAttribute('data-cut-edit-layout') && typeof options.editLayout === 'function') options.editLayout(piecesById.get(selectedPieceId) || null, faceFor(selectedFaceKey) || null);
    }
    function onKeyDown(event) {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      var target = actionTarget(event, '[data-panel-piece]');
      if (!target || /^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/i.test(target.tagName || '')) return;
      event.preventDefault();
      selectPiece(target.getAttribute('data-panel-piece'));
    }
    element.addEventListener('change', onChange);
    element.addEventListener('click', onClick);
    element.addEventListener('keydown', onKeyDown);
    if (dialog) {
      dialog.addEventListener('close', onZoomClosed);
      if (!element.contains(dialog)) { dialog.addEventListener('click', onClick); dialog.addEventListener('keydown', onKeyDown); }
    }
    var api = Object.freeze({ render: render, selectPiece: selectPiece, formatIn: formatIn });
    instances.set(element, api);
    render(null, []);
    return api;
  }
  return Object.freeze({ init: init, formatIn: formatIn, version: '1.0.0' });
});
