/* MIR — Atelier admin, présentation du concept 4. Le configurateur et ses données
   restent gérés par production-app.js, sans seconde source de vérité. */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('mode') === 'client') return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const make = (tag, className, html) => {
    const element = document.createElement(tag);
    element.className = className;
    if (html !== undefined) element.innerHTML = html;
    return element;
  };
  function section(label, id, open = false) {
    const details = make('details', 'mir-v4-section');
    details.id = id;
    details.open = open;
    const summary = make('summary', '', '<span class="mir-v4-section-label">' + label + '</span><span class="mir-v4-section-status" id="' + id + '-status"></span><span class="mir-v4-chevron" aria-hidden="true">⌄</span>');
    const content = make('div', 'mir-v4-section-body');
    details.append(summary, content);
    return { details, content };
  }
  function init() {
    const main = $('#production-main'), workspace = $('.production-workspace'),
      drawing = $('.drawing-card'), config = $('.config-card'),
      typeBar = $('.kind-bar'), intro = $('.production-intro'),
      templates = $('.template-section');
    if (!main || !workspace || !drawing || !config || !typeBar || !intro || !templates) return;
    document.body.classList.add('mir-admin-v4');
    main.insertBefore(typeBar, intro);

    const profileButton = $('[data-kind="profile"]', typeBar);
    const panelButton = $('[data-kind="panel"]', typeBar);
    profileButton.innerHTML = '<span class="kind-icon" aria-hidden="true">⌞</span>Moulures';
    panelButton.innerHTML = '<span class="kind-icon" aria-hidden="true">▱</span>Panneaux architecturaux';

    const picker = make('details', 'mir-v4-picker');
    const pickerSummary = make('summary', '', '<span class="mir-v4-picker-label">Profil :</span><strong id="mir-v4-profile-name">Pliage en L</strong><span aria-hidden="true">⌄</span>');
    picker.append(pickerSummary, templates);
    const heading = $('.drawing-head', drawing);
    heading.insertBefore(picker, heading.firstChild);
    const updateProfileName = () => {
      const title = $('#drawing-title');
      const label = $('#mir-v4-profile-name');
      if (title && label && title.textContent.trim()) {
        label.textContent = title.textContent.trim().replace(/^Modèle\s*·\s*/, '');
        $('.mir-v4-picker-label').textContent = $('[data-kind="panel"]')?.getAttribute('aria-pressed') === 'true' ? 'Forme :' : 'Profil :';
      }
    };
    const drawingTitle = $('#drawing-title');
    if (drawingTitle) new MutationObserver(updateProfileName).observe(drawingTitle, { childList: true, characterData: true, subtree: true });
    document.addEventListener('click', (event) => {
      if (event.target.closest('.mir-v4-picker [data-template],.mir-v4-picker [data-saved-template]')) {
        picker.open = false;
        requestAnimationFrame(updateProfileName);
      }
    });
    updateProfileName();

    const drawingTools = $('#drawing-tools');
    const drawingNav = $('#drawing-navigation');
    if (drawingTools && drawingNav) drawingNav.after(drawingTools);

    const originalHeading = $('.config-card > .section-heading');
    const dim = section('Dimensions', 'mir-v4-dimensions', matchMedia('(min-width: 1151px)').matches);
    const unitField = $('.unit-field', originalHeading);
    const hint = $('#measure-hint');
    if (unitField) dim.content.append(unitField);
    if (hint) dim.content.append(hint);
    dim.content.append($('#production-dimensions'), $('#production-panel-options'));
    config.insertBefore(dim.details, originalHeading);
    originalHeading.hidden = true;

    const finish = $('.piece-finish', config);
    const finishSummary = $('summary', finish);
    if (finishSummary) finishSummary.innerHTML = '<span class="mir-v4-section-label">Matériaux</span><span class="mir-v4-section-status" id="mir-v4-material-status"></span><span class="mir-v4-chevron" aria-hidden="true">⌄</span><span id="finish-summary" hidden></span>';
    finish.classList.add('mir-v4-section', 'mir-v4-materials');
    finish.open = false;
    const matLabel = $('#material-type')?.closest('label');
    if (matLabel?.firstChild?.nodeType === Node.TEXT_NODE) matLabel.firstChild.textContent = 'Matériau';

    const colors = section('Couleur', 'mir-v4-colors', false);
    const colorSystem = $('#color-system')?.closest('label');
    for (const element of [colorSystem, $('#production-color-fields'), $('#selected-finish'), $('#custom-color-quote'), $('#panel-price')]) {
      if (element) colors.content.append(element);
    }
    finish.after(colors.details);

    const face = section('Face colorée', 'mir-v4-face', false);
    face.content.append($('#production-profile-options'));
    colors.details.after(face.details);

    const footer = $('#add-production-piece')?.closest('.config-section');
    if (footer) {
      footer.classList.add('mir-v4-footer');
      const extras = section('Détails de la pièce', 'mir-v4-details', false);
      const fields = $('.two-fields', footer);
      const note = Array.from(footer.children).find(el => el.tagName === 'LABEL');
      if (fields) extras.content.append(fields);
      if (note) extras.content.append(note);
      footer.prepend(extras.details);
    }

    const sheet = make('div', 'mir-v4-sheet-total');
    sheet.id = 'mir-v4-sheet-total';
    sheet.setAttribute('aria-live', 'polite');
    sheet.innerHTML = '<span class="mir-v4-sheet-heading">Somme des côtés finis <small>(ce n’est pas le développé de fabrication)</small></span><strong id="mir-v4-sheet-value">À préciser</strong><span class="mir-v4-sheet-note">Longueur de la pièce vendue : 10 pi sauf J à soffite</span>';
    config.insertBefore(sheet, config.firstChild);

    const summary = make('section', 'mir-v4-technical', '<h2>Résumé technique</h2><div class="mir-v4-technical-grid"><p><span>Matériaux</span><strong id="mir-v4-recap-material">À préciser</strong></p><p><span>Couleur</span><strong id="mir-v4-recap-color">À préciser</strong></p><p><span>Face colorée</span><strong id="mir-v4-recap-face">À préciser</strong></p><p><span>Longueur de la pièce</span><strong id="mir-v4-recap-length">À préciser</strong></p><p><span>Quantité</span><strong id="mir-v4-recap-quantity">1</strong></p></div>');
    workspace.after(summary);

    const dossierTrigger = $('#mode-link');
    if (dossierTrigger) {
      dossierTrigger.innerHTML = '<span aria-hidden="true">▱</span> Mon dossier <span id="mir-v4-dossier-count">0</span>';
      dossierTrigger.href = '#production-order';
      dossierTrigger.setAttribute('aria-controls', 'production-order');
      dossierTrigger.setAttribute('aria-expanded', 'false');
      dossierTrigger.addEventListener('click', event => {
        event.preventDefault();
        const open = document.body.classList.toggle('mir-v4-dossier-open');
        dossierTrigger.setAttribute('aria-expanded', String(open));
        if (open) $('#production-order')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
    const count = $('#order-head-count');
    const updateDossier = () => {
      const badge = $('#mir-v4-dossier-count');
      if (badge && count) badge.textContent = String(Number(count.textContent) || 0);
    };
    if (count) new MutationObserver(updateDossier).observe(count, { childList: true, characterData: true, subtree: true });
    updateDossier();

    // La navigation avancée existe déjà dans les onglets Admin; ne pas ajouter « Autres actions » au tracé.

    const restoreNav = () => {
      const workflow = $('#production-workflow');
      if (!workflow || workflow.dataset.mirV4Prepared === '1') return;
      workflow.dataset.mirV4Prepared = '1';
      const configure = $('[data-workflow="configure"]', workflow);
      if (configure) configure.textContent = 'Retour au traçage';
      const sync = () => document.body.classList.toggle('mir-v4-secondary-view', !!workflow.querySelector('[data-workflow="models"][aria-current="page"],[data-workflow="requests"][aria-current="page"]'));
      new MutationObserver(sync).observe(workflow, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
      sync();
    };
    if ($('#production-workflow')) restoreNav();
    else {
      const watch = new MutationObserver(() => { if ($('#production-workflow')) { watch.disconnect(); restoreNav(); } });
      watch.observe(main, { childList: true });
    }
    const updateKindLayout = () => {
      const isProfile = $('[data-kind="profile"]')?.getAttribute('aria-pressed') === 'true';
      face.details.hidden = !isProfile;
      sheet.hidden = !isProfile;
      updateProfileName();
    };
    new MutationObserver(updateKindLayout).observe(typeBar, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
    updateKindLayout();

    // La version ordinateur garde les réglages ouverts ; mobile et tablette
    // présentent des accordéons sans cacher le bouton d'enregistrement.
    const media = matchMedia('(max-width: 1150px)');
    const applyDevice = () => {
      dim.details.open = !media.matches;
      for (const group of [finish, colors.details, face.details, extrasSafe()]) {
        if (group) group.open = false;
      }
    };
    function extrasSafe() { return $('#mir-v4-details'); }
    // N'impose pas l'état d'un volet lors d'un simple redimensionnement du
    // clavier virtuel ; réagir uniquement au changement de seuil.
    media.addEventListener?.('change', applyDevice);
    updateKindLayout();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
