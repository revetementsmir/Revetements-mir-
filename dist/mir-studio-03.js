/* Studio 03: presentation only. Original controls, listeners and renderer stay authoritative. */
(function () {
  'use strict';
  const query = new URLSearchParams(location.search);
  if (location.pathname.split('/').pop() !== 'plan.html' || query.has('embed') || query.get('context') === 'admin' || query.get('mode') === 'atelier') return;
  // The following script (the older workspace pager) reads this synchronously.
  document.body.dataset.mirStudioLayout = 'materials-bottom';
  const $ = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const language = () => String(window.MIRClientLocale?.getLocale?.() || document.documentElement.lang || 'fr-CA').startsWith('en') ? 'en' : 'fr';
  const text = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
  const localized = (node, fr, en) => { node.dataset.studio03Fr = fr; node.dataset.studio03En = en; text(node, language() === 'en' ? en : fr); return node; };
  const fallbackLabel = value => {
    const pairs = [['Choisissez un fini','Choose a finish'],['Finition à confirmer','Finish to confirm'],['Teinte à confirmer','Colour to confirm'],['Choisissez une zone','Choose a zone'],['Sélectionnez une zone','Select a zone']];
    const pair = pairs.find(values => values.includes(value));
    return pair ? pair[language() === 'en' ? 1 : 0] : value;
  };
  const element = (tag, className, id) => { const node = document.createElement(tag); if (className) node.className = className; if (id) node.id = id; return node; };
  const append = (parent, ...nodes) => nodes.filter(Boolean).forEach(node => parent.append(node));
  const move = (parent, ...selectors) => selectors.forEach(selector => append(parent, $(selector)));
  function protectSourceNames() {
    // This is the existing locale engine's exclusion marker. UI labels around
    // these nodes still translate; official product/finish names never do.
    all('#zone-colors,#color-name,#material-brand,#material-name,.extra-colors,.mir-studio-03-finish-proxy,#mir-studio-03-summary,#mir-studio-03-selection,.roof-selection strong,.mir-corner-panel [role="status"] strong').forEach(node => node.setAttribute('data-mir-source-color',''));
    for (const id of ['material-manufacturer','material','soffit-brand','soffit-product','soffit-color','fascia-brand','fascia-product','fascia-color','roof-brand','roof-product','structure-wrap','mir-corner-product','return-product','band-brand','band-product','band-color','trim-brand','trim-product','trim-color']) {
      all('option', $('#' + id) || document.createElement('select')).filter(option => option.value).forEach(option => option.setAttribute('data-mir-source-color',''));
    }
  }
  protectSourceNames();
  function localizeStageTitle() {
    const node = $('#stage-title');
    if (!node) return;
    const value = node.textContent;
    if (['VOTRE PROJET / VUE 360°','YOUR PROJECT / 360° VIEW'].includes(value)) {
      text(node, language() === 'en' ? 'YOUR PROJECT / 360° VIEW' : 'VOTRE PROJET / VUE 360°');
      return;
    }
    const match = /^(.*?)(?:ÉLÉVATION|ELEVATION) (.+)$/.exec(value);
    if (!match) return;
    const pairs = [['AVANT','FRONT'],['DROITE','RIGHT'],['ARRIÈRE','BACK'],['GAUCHE','LEFT']];
    const face = pairs.find(pair => pair.includes(match[2]));
    text(node, match[1] + (language() === 'en' ? 'ELEVATION ' : 'ÉLÉVATION ') + (face ? face[language() === 'en' ? 1 : 0] : match[2]));
  }
  function disclosure(className, id, fr, en) {
    const details = element('details', className, id);
    details.append(localized(element('summary'), fr, en));
    return details;
  }
  function field(id, parent, root = document) {
    const input = $('#' + id, root);
    if (!input) return null;
    const wrapper = element('div', 'mir-studio-03-field');
    append(wrapper, $('label[for="' + id + '"]', root), input);
    parent.append(wrapper);
    return wrapper;
  }
  const paletteMemory = new Map(); // Expansion/search only; never product or project state.
  const palettes = new Set();
  let sequence = 0;
  function palette(container, host, key) {
    if (!container || container.dataset.studio03Palette) return;
    container.dataset.studio03Palette = 'true';
    if (!container.id) container.id = 'mir-studio-03-colours-' + (++sequence);
    const tools = element('div', 'mir-studio-03-palette-tools');
    const toggle = element('button', 'mir-studio-03-palette-toggle');
    toggle.type = 'button'; toggle.dataset.studio03PaletteToggle = ''; toggle.setAttribute('aria-controls', container.id);
    const search = element('input', 'mir-studio-03-palette-search');
    search.type = 'search'; search.dataset.studio03PaletteSearch = ''; search.autocomplete = 'off';
    const empty = element('p', 'mir-studio-03-palette-empty'); empty.setAttribute('role', 'status');
    tools.append(toggle, search, empty); host.append(tools);
    const state = {container, host, tools, toggle, search, empty, key, currentKey: null};
    palettes.add(state);
    toggle.addEventListener('click', () => {
      const saved = paletteMemory.get(state.currentKey); if (!saved) return;
      saved.expanded = !saved.expanded; if (!saved.expanded) saved.search = '';
      updatePalette(state); if (saved.expanded) search.focus({preventScroll:true});
    });
    search.addEventListener('input', () => { const saved = paletteMemory.get(state.currentKey); if (saved) saved.search = search.value; updatePalette(state); });
    search.addEventListener('keydown', event => { if (event.key === 'Escape' && search.value) { event.preventDefault(); search.value = ''; search.dispatchEvent(new Event('input', {bubbles:true})); } });
    updatePalette(state);
  }
  function updatePalette(state) {
    if (!state.container.isConnected) { palettes.delete(state); return; }
    const key = state.key(); state.currentKey = key;
    if (!paletteMemory.has(key)) paletteMemory.set(key, {expanded:false, search:''});
    const saved = paletteMemory.get(key), buttons = all('button', state.container);
    const selected = buttons.find(button => button.getAttribute('aria-pressed') === 'true');
    const first = buttons.slice(0, 6);
    if (selected && !first.includes(selected)) first[Math.min(5, first.length)] = selected;
    const normalized = saved.search.trim().toLocaleLowerCase(language());
    let count = 0;
    buttons.forEach(button => {
      const shown = saved.expanded ? (!normalized || (button.title + ' ' + button.textContent).toLocaleLowerCase(language()).includes(normalized)) : first.includes(button);
      if (button.hidden === shown) button.hidden = !shown;
      if (shown) count++;
    });
    state.host.classList.toggle('mir-studio-03-palette-expanded', saved.expanded);
    state.toggle.hidden = buttons.length <= 6;
    state.toggle.setAttribute('aria-expanded', String(saved.expanded));
    text(state.toggle, language() === 'en' ? (saved.expanded ? 'Fewer colours' : 'All colours (' + buttons.length + ')') : (saved.expanded ? 'Moins de couleurs' : 'Toutes les couleurs (' + buttons.length + ')'));
    state.search.hidden = !saved.expanded;
    state.search.placeholder = language() === 'en' ? 'Find a colour' : 'Rechercher une couleur';
    state.search.setAttribute('aria-label', state.search.placeholder);
    if (state.search.value !== saved.search) state.search.value = saved.search;
    state.empty.hidden = !saved.expanded || count > 0;
    text(state.empty, language() === 'en' ? 'No matching colour.' : 'Aucune couleur correspondante.');
  }
  function mount() {
    if ($('#mir-studio-03-zone')) return;
    const workspace = $('#workspace'), controls = $('#studio-controls'), stage = $('#stage');
    if (!workspace || !controls || !stage) return;
    const heading = $('.studio-intro h1');
    if (heading) localized(heading, 'Studio 3D', '3D Studio');
    const intro = $('.studio-intro .intro-copy');
    if (intro) localized(intro, 'Votre projet, matière par matière.', 'Your project, material by material.');
    const viewerTools = element('div', 'mir-studio-03-view-tools');
    move(viewerTools, '.view-toolbar', '#rotate-control'); stage.after(viewerTools);
    const viewInfo = element('div', 'mir-studio-03-view-info');
    viewInfo.append(localized(element('p', 'mir-studio-03-instruction'), 'Cliquez sur une zone pour la modifier.', 'Click a zone to edit it.'));
    const viewSummary = element('p', 'mir-studio-03-summary', 'mir-studio-03-summary');
    viewInfo.append(viewSummary); viewerTools.after(viewInfo);
    const band = element('div', 'mir-studio-03-band');
    const zoneGroup = element('div', 'mir-studio-03-zone-group', 'mir-studio-03-zone-group');
    const zoneLabel = localized(element('label'), 'Zone', 'Zone'); zoneLabel.htmlFor = 'mir-studio-03-zone';
    const zoneSelect = element('select', '', 'mir-studio-03-zone');
    const selectionNote = element('p', 'mir-studio-03-selection', 'mir-studio-03-selection');
    zoneGroup.append(zoneLabel, zoneSelect, selectionNote);
    const context = element('div', 'mir-studio-03-context');
    move(context, '.zone-controls', '#extra-controls', '#finish-controls');
    band.append(zoneGroup, context); controls.prepend(band);
    move(zoneGroup, '.controls-top');

    const material = $('#material-controls');
    const product = element('div', 'mir-studio-03-product-group');
    field('material-manufacturer', product); field('material', product);
    const colours = element('div', 'mir-studio-03-palette-group');
    // renderControl() relies on this exact adjacent label / palette relationship.
    append(colours, $('#zone-colors').previousElementSibling, $('#zone-colors'));
    const materialDetails = disclosure('mir-studio-03-material-details', 'mir-studio-03-material-details', 'Pose, dimensions et documents', 'Installation, dimensions and documents');
    Array.from(material.children).forEach(node => materialDetails.append(node));
    material.append(product, colours, materialDetails);
    palette($('#zone-colors'), colours, () => 'facade:' + $('#material').value);

    const selectionDetails = disclosure('mir-studio-03-selection-details', '', 'Détails de la sélection', 'Selection details');
    move(selectionDetails, '.control-heading', '#zone-origin', '#mir-accent-actions', '#geometry-controls');
    $('.zone-controls').append(selectionDetails);

    const finish = $('#finish-controls .finish-content');
    const finishProduct = element('div', 'mir-studio-03-product-group');
    const finishColours = element('div', 'mir-studio-03-palette-group');
    for (const kind of ['soffit', 'fascia']) {
      field(kind + '-brand', finishProduct); field(kind + '-product', finishProduct);
      field(kind + '-color', finishColours);
    }
    const finishDetails = disclosure('mir-studio-03-material-details', '', 'Finition et documents', 'Finish and documents');
    Array.from(finish.children).forEach(node => finishDetails.append(node));
    finish.append(finishProduct, finishColours, finishDetails);

    const actions = element('div', 'mir-studio-03-actions');
    const exports = disclosure('mir-studio-03-exports', 'mir-studio-03-exports', 'Exporter mes choix', 'Export my choices');
    move(exports, '#export-project', '.export-actions');
    localized($('#export-project', exports), 'Projet JSON', 'Project JSON');
    exports.addEventListener('keydown', event => {
      if (event.key === 'Escape' && exports.open) { event.preventDefault(); exports.open = false; $('summary',exports).focus({preventScroll:true}); }
    });
    actions.append(exports); move(actions, '[data-estimate-source="studio"]');
    const advanced = disclosure('mir-studio-03-advanced', 'mir-studio-03-advanced', 'Outils, projet et exports', 'Tools, project and exports');
    const advancedContent = element('div', 'mir-studio-03-advanced-content'); advanced.append(advancedContent);
    move(advancedContent, '.project-bar', '.display-toolbar', '.edit-toolbar', '#mode-help', '.zones-heading', '#zone-list', '#coverage-summary', '#detection-panel', '.drawing-footer', '.save-panel', '.project-notes', '.studio-source-links', '.mir-studio-tools', '#studio-example', '.studio-start small');
    const sceneOptions = element('div', 'mir-studio-03-scene-options');
    move(sceneOptions, '#mir-site-toggle', '#mir-stairs-toggle'); advancedContent.prepend(sceneOptions);
    workspace.append(actions, advanced);
    // The original edit controls focus their own targets. Open only the necessary
    // disclosure after an explicit action, not on every geometry repaint.
    $('#mir-edit-accent')?.addEventListener('click', () => { selectionDetails.open = true; });
    $('#show-detection')?.addEventListener('click', () => { advanced.open = true; });
    document.addEventListener('focusin', event => {
      if (!event.target.closest?.('#workspace')) return;
      let parent = event.target.parentElement;
      while (parent && parent !== workspace) {
        if (parent.tagName === 'DETAILS' && !parent.open && !Array.from(parent.children).find(child => child.tagName === 'SUMMARY')?.contains(event.target)) parent.open = true;
        parent = parent.parentElement;
      }
    });
    zoneSelect.addEventListener('change', () => {
      // Use the existing delegated handler. Never mutate MIR_STUDY/localStorage.
      const id = zoneSelect.value;
      if (!id) return;
      if ($('[data-part="facade"]').getAttribute('aria-pressed') !== 'true') $('[data-part="facade"]').click();
      const target = all('[data-select-zone]', $('#zone-list')).find(button => button.dataset.selectZone === id);
      if (target) target.click();
    });
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; sync(); }); };
    // Mark freshly rendered dynamic names in this mutation delivery, before the
    // shared locale observer's queued translation pass. Grouping waits for RAF.
    const observer = new MutationObserver(() => { protectSourceNames(); schedule(); });
    const roots = [$('#zone-list'), $('#zone-colors'), $('#extra-controls'), $('#finish-controls'), $('.zone-controls'), $('#control-part-name'), $('#stage-title')];
    const observe = () => roots.forEach(root => observer.observe(root, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden', 'aria-pressed']}));
    function sync() {
      observer.disconnect();
      try {
        enhanceDynamic();
        const state = window.MIR_STUDY?.snapshot?.();
        const kind = state?.selected?.kind || 'zone';
        const buttons = all('[data-select-zone]', $('#zone-list'));
        const selected = buttons.find(button => button.getAttribute('aria-pressed') === 'true');
        const rows = buttons.map(button => ({id:button.dataset.selectZone, label:button.querySelector('span:last-child')?.childNodes[0]?.textContent?.trim() || button.textContent.trim()}));
        const active = kind === 'zone' && selected;
        if (!$('#zone-colors [aria-pressed="true"]')) text($('#color-name'), fallbackLabel($('#color-name').textContent));
        const contextName = kind === 'opening' ? $('#selected-title').textContent : $('#control-part-name').textContent;
        const signature = JSON.stringify([rows, active ? selected.dataset.selectZone : '', active ? '' : contextName]);
        if (zoneSelect.dataset.signature !== signature) {
          zoneSelect.dataset.signature = signature; zoneSelect.replaceChildren();
          if (!active) zoneSelect.add(new Option(contextName, ''));
          rows.forEach(row => zoneSelect.add(new Option(row.label, row.id)));
          zoneSelect.value = active ? selected.dataset.selectZone : '';
        }
        zoneSelect.disabled = !rows.length;
        const activeZone = active ? rows.find(row => row.id === selected.dataset.selectZone)?.label : contextName;
        let productName = '', colourName = '';
        if (kind === 'zone') { productName = $('#material').selectedOptions[0]?.textContent || ''; colourName = $('#color-name').textContent; }
        else if (['soffit','fascia'].includes(kind)) { productName = $('#' + kind + '-product').selectedOptions[0]?.textContent || ''; colourName = $('#' + kind + '-color').selectedOptions[0]?.textContent || ''; }
        else {
          const productNode = $('#roof-product,#structure-wrap,#mir-corner-product,#return-product', $('#extra-controls'));
          productName = productNode?.selectedOptions[0]?.textContent || '';
          colourName = $('.extra-colors button[aria-pressed="true"]', $('#extra-controls'))?.textContent?.trim() || '';
        }
        text(selectionNote, kind === 'zone' ? ($('#color-name').textContent || '') : contextName);
        text(viewSummary, [activeZone,productName,fallbackLabel(colourName)].filter(Boolean).join(' · '));
        context.dataset.studio03Part = kind;
        all('.mir-studio-03-field', finish).forEach(wrapper => {
          const control = $('select,input', wrapper);
          wrapper.hidden = !!control?.hidden;
        });
        all('[data-studio03-fr]').forEach(node => text(node, language() === 'en' ? node.dataset.studio03En : node.dataset.studio03Fr));
        syncFinishPalettes();
        protectSourceNames();
        localizeStageTitle();
        palettes.forEach(updatePalette);
      } finally { observe(); }
    }
    observe(); sync();
    // Catalogue metadata is used only to illustrate the options in the ORIGINAL
    // finish selects. Those selects remain the sole source of valid IDs/choices.
    fetch('catalogue-fd6866b49d21.json?v=maconnerie-1').then(response => response.ok ? response.json() : null).then(data => {
      if (!Array.isArray(data?.materials)) return;
      finishCatalogue = new Map(data.materials.map(material => [material.id, material])); schedule();
    }).catch(() => { /* The native named selects remain usable without thumbnails. */ });
    window.addEventListener('mir:client-locale-changed', schedule);
    new MutationObserver(schedule).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
    // Initial engine setup is asynchronous; its first control render is observed.
    document.body.dataset.mirStudio03Ready = 'true';
  }

  let finishCatalogue = new Map();
  function syncFinishPalettes() {
    for (const kind of ['soffit','fascia']) {
      const select = $('#' + kind + '-color'), product = $('#' + kind + '-product');
      const fieldNode = select.closest('.mir-studio-03-field');
      let proxy = $('.mir-studio-03-finish-proxy', fieldNode);
      if (!proxy) {
        proxy = element('div', 'product-colors mir-studio-03-finish-proxy', 'mir-studio-03-' + kind + '-colours');
        proxy.setAttribute('role','group');
        fieldNode.append(proxy);
        proxy.addEventListener('click', event => {
          const button = event.target.closest('[data-studio03-finish-value]');
          if (!button || select.disabled || !Array.from(select.options).some(option => !option.disabled && option.value === button.dataset.studio03FinishValue)) return;
          select.value = button.dataset.studio03FinishValue;
          select.dispatchEvent(new Event('change', {bubbles:true}));
        });
        palette(proxy, fieldNode, () => kind + ':' + product.value);
      }
      const options = Array.from(select.options).filter(option => option.value && !option.disabled);
      const material = finishCatalogue.get(product.value);
      const signature = JSON.stringify([product.value,options.map(option=>[option.value,option.textContent]),!!material]);
      if (proxy.dataset.signature !== signature) {
        const focusedValue = proxy.contains(document.activeElement) ? document.activeElement.dataset.studio03FinishValue : null;
        proxy.dataset.signature = signature; proxy.replaceChildren();
        options.forEach(option => {
          const colour = material?.colors?.find(item => item.id === option.value);
          const button = element('button','product-swatch'); button.type = 'button'; button.dataset.studio03FinishValue = option.value;
          button.setAttribute('aria-pressed',String(option.value === select.value)); button.title = option.textContent;
          const chip = element('i');
          if (/^#[\da-f]{6}$/i.test(colour?.hex || '')) chip.style.background = colour.hex;
          else chip.className = 'no-swatch';
          if (/^assets\/[\w./%()+ -]+\.(webp|png|jpe?g|avif|svg)(\?[^#]*)?$/i.test(colour?.swatchUrl || '')) {
            const image = element('img'); image.src = colour.swatchUrl; image.alt = ''; image.loading = 'lazy'; image.width = 20; image.height = 20; chip.append(image);
          }
          const label = element('span'); label.textContent = option.textContent; button.append(chip,label); proxy.append(button);
        });
        if (focusedValue) all('[data-studio03-finish-value]',proxy).find(button => button.dataset.studio03FinishValue === focusedValue)?.focus({preventScroll:true});
      }
      all('[data-studio03-finish-value]',proxy).forEach(button => {
        const pressed = String(button.dataset.studio03FinishValue === select.value);
        if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed',pressed);
      });
      proxy.setAttribute('aria-label', language() === 'en' ? 'Manufacturer colours' : 'Couleurs du fabricant');
    }
  }

  function enhanceDynamic() {
    const root = $('#extra-controls'), panel = root?.firstElementChild;
    if (!panel || panel.dataset.studio03Grouped) return;
    const focused = panel.contains(document.activeElement) ? document.activeElement : null;
    panel.dataset.studio03Grouped = 'true';
    const product = element('div', 'mir-studio-03-product-group');
    const colours = element('div', 'mir-studio-03-palette-group');
    const dynamicZone = element('div', 'mir-studio-03-dynamic-zone');
    const keys = ['roof-product', 'structure-wrap', 'mir-corner-product', 'return-product'];
    const productId = keys.find(id => $('#' + id, panel));
    for (const id of ['structure-select', 'mir-corner-scope']) field(id, dynamicZone, panel);
    for (const id of ['roof-brand', 'roof-product', 'structure-finish-metal', 'structure-wrap', 'mir-corner-metal', 'mir-corner-product', 'return-product']) field(id, product, panel);
    const swatches = $('.extra-colors', panel);
    if (swatches) {
      const label = localized(element('p', 'mir-studio-03-palette-label'), 'Couleurs', 'Colours');
      colours.append(label, swatches);
    }
    // Custom colour controls remain explicit illustrative options, not invented
    // manufacturer swatches. Their original explanatory notes stay available.
    const details = disclosure('mir-studio-03-material-details', '', 'Réglages et documents', 'Settings and documents');
    Array.from(panel.children).forEach(node => details.append(node));
    if (dynamicZone.children.length) panel.append(dynamicZone);
    if (product.children.length) panel.append(product);
    if (colours.children.length) panel.append(colours);
    panel.append(details);
    if (swatches) palette(swatches, colours, () => 'extra:' + productId + ':' + ($('#' + productId, root)?.value || ''));
    // An empty structure list must still expose its actual add buttons immediately.
    if (!productId) details.open = true;
    if (focused?.isConnected && document.activeElement !== focused) {
      if (details.contains(focused)) details.open = true;
      focused.focus({preventScroll:true});
    }
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount, {once:true}) : mount();
})();
