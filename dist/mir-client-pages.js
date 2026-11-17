/* Client presentation only: keep the original nodes, listeners, fields and data.
 * Sections and list pages replace long client pages. No Auth/API/storage writes.
 * An unsupported oversized block remains readable and is reported; it is never
 * clipped with a global overflow rule. Staff routes and the Studio are excluded.
 */
(() => {
  'use strict';
  const doc = document, body = doc.body;
  const route = location.pathname.split('/').pop() || 'index.html';
  const supported = new Set(['index.html', 'maison.html', 'chantiers.html',
    'contact.html', 'aide.html', 'produit.html', 'selection.html', 'estimation.html',
    'materiaux.html', 'pliage.html']);
  if (!supported.has(route)) return;
  const controllers = [], lists = [], knownLists = new WeakMap();
  let serial = 0, measureQueued = false;
  const $ = (selector, root = doc) => root.querySelector(selector);
  const all = (selector, root = doc) => [...root.querySelectorAll(selector)];
  const compact = () => innerWidth < 760;
  const isEnglish = () => /^en\b/i.test(window.MIRClientLocale?.getLocale?.() || doc.documentElement.lang || 'fr');
  const text = (fr, en) => isEnglish() ? en : fr;
  const wording = label => typeof label === 'string' ? label : text(label[0], label[1]);
  const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const clean = nodes => nodes.flat().filter(node => node instanceof Element);
  const section = (fr, en, nodes, onShow) => ({label:[fr, en], nodes:clean(nodes), onShow});
  function button(attribute, label, glyph) {
    const node = doc.createElement('button');
    node.type = 'button'; node.setAttribute(attribute, '');
    node.setAttribute('aria-label', label); node.textContent = glyph;
    return node;
  }
  function measure() {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => {
      measureQueued = false;
      const height = Math.round(window.visualViewport?.height || innerHeight);
      body.style.setProperty('--mir-client-view-height', height + 'px');
      body.dataset.mirClientCompactHeight = String(height < 620);
      const overflow = Math.max(doc.documentElement.scrollHeight, body.scrollHeight) - innerHeight;
      body.dataset.mirClientOverflow = String(overflow > 2);
      body.dataset.mirClientOverflowPixels = String(Math.max(0, Math.ceil(overflow)));
    });
  }
  function pager(host, initialGroups, options = {}) {
    const groups = initialGroups.filter(group => group.nodes.length);
    if (!groups.length) return null;
    const nav = doc.createElement('nav');
    nav.className = 'mir-client-pages-nav';
    nav.setAttribute('aria-label', text('Sections de cette page', 'Page sections'));
    nav.setAttribute('data-mir-user-content', '');
    const previous = button('data-mir-page-prev', text('Section précédente', 'Previous section'), '←');
    const label = doc.createElement('label'), select = doc.createElement('select');
    const caption = doc.createElement('span'), status = doc.createElement('output');
    caption.className = 'mir-client-pages-caption';
    select.id = 'mir-client-section-' + (++serial);
    select.setAttribute('data-mir-section-select', '');
    label.htmlFor = select.id; label.append(caption, select);
    const next = button('data-mir-page-next', text('Section suivante', 'Next section'), '→');
    status.setAttribute('data-mir-page-status', '');
    status.setAttribute('aria-live', 'polite');
    nav.append(previous, label, status, next);
    let before = options.before || host.firstChild;
    /* A product component can be nested inside the page shell. insertBefore
     * requires a direct child, so use that component's containing page block. */
    while (before && before.parentNode !== host) before = before.parentNode;
    host.insertBefore(nav, before || host.firstChild);
    let current = 0;
    const api = {
      nav, groups,
      get index() { return current; },
      show(index, userAction = false) {
        current = Math.max(0, Math.min(groups.length - 1, Number(index) || 0));
        const visible = new Set(groups[current].nodes);
        for (const node of new Set(groups.flatMap(group => group.nodes))) {
          node.dataset.mirPageVisible = String(visible.has(node));
        }
        if (select.options.length !== groups.length) {
          select.replaceChildren(...groups.map((group, i) => {
            const option = doc.createElement('option'); option.value = String(i);
            option.textContent = wording(group.label); return option;
          }));
        } else groups.forEach((group, i) => setText(select.options[i], wording(group.label)));
        select.value = String(current);
        setText(caption, text('Afficher', 'Show'));
        setText(status, (current + 1) + ' / ' + groups.length);
        previous.disabled = current === 0; next.disabled = current === groups.length - 1;
        previous.setAttribute('aria-label', text('Section précédente', 'Previous section'));
        next.setAttribute('aria-label', text('Section suivante', 'Next section'));
        nav.dataset.mirPageIndex = String(current);
        nav.dataset.mirPageCount = String(groups.length);
        groups[current].onShow?.();
        if (userAction && !nav.closest('dialog')) window.scrollTo({top:0, left:0, behavior:'instant'});
        measure();
      },
      refresh() { api.show(current); }
    };
    previous.addEventListener('click', () => api.show(current - 1, true));
    next.addEventListener('click', () => api.show(current + 1, true));
    select.addEventListener('change', () => api.show(Number(select.value), true));
    controllers.push(api); api.show(0);
    return api;
  }
  function listPager(container, selector, limit, options = {}) {
    if (!container) return null;
    if (knownLists.has(container)) return knownLists.get(container);
    const nav = doc.createElement('nav');
    nav.className = 'mir-client-list-controls';
    nav.setAttribute('data-mir-list-pager', '');
    nav.setAttribute('data-mir-user-content', '');
    const previous = button('data-mir-list-prev', text('Page précédente', 'Previous page'), '←');
    const status = doc.createElement('output'); status.setAttribute('aria-live', 'polite');
    status.setAttribute('data-mir-list-status', '');
    const next = button('data-mir-list-next', text('Page suivante', 'Next page'), '→');
    nav.append(previous, status, next);
    const before = options.before || container;
    before.parentNode.insertBefore(nav, before);
    let current = 0, entries = [], perPage = 1;
    const api = {
      nav, container,
      get index() { return current; },
      get entries() { return entries; },
      show(index) { current = Math.max(0, Number(index) || 0); api.refresh(); measure(); },
      reveal(node) {
        const index = entries.findIndex(entry => entry === node || entry.contains(node));
        if (index >= 0) api.show(Math.floor(index / perPage));
      },
      refresh() {
        const rows = all(selector, container);
        entries = rows.filter(row => !row.hidden);
        perPage = Math.max(1, typeof limit === 'function' ? limit() : limit);
        const count = Math.max(1, Math.ceil(entries.length / perPage));
        current = Math.min(current, count - 1);
        const shown = new Set(entries.slice(current * perPage, (current + 1) * perPage));
        rows.forEach(row => { row.dataset.mirListVisible = String(shown.has(row)); });
        if (options.groupHeaders) all(options.groupHeaders, container).forEach(header => {
          let sibling = header.nextElementSibling, hasVisible = false;
          while (sibling && !sibling.matches(options.groupHeaders)) {
            if (shown.has(sibling)) hasVisible = true;
            sibling = sibling.nextElementSibling;
          }
          header.dataset.mirListVisible = String(hasVisible);
        });
        nav.hidden = count < 2;
        nav.dataset.mirListPage = String(current);
        nav.dataset.mirListPageCount = String(count);
        const first = entries.length ? current * perPage + 1 : 0;
        const last = Math.min(entries.length, (current + 1) * perPage);
        const prefix = wording(options.label || ['Éléments', 'Items']);
        setText(status, prefix + ' ' + first + (first !== last ? '–' + last : '') + ' / ' + entries.length);
        nav.setAttribute('aria-label', prefix);
        previous.disabled = current === 0; next.disabled = current === count - 1;
        previous.setAttribute('aria-label', text('Page précédente', 'Previous page'));
        next.setAttribute('aria-label', text('Page suivante', 'Next page'));
        measure();
      }
    };
    knownLists.set(container, api); lists.push(api);
    previous.addEventListener('click', () => api.show(current - 1));
    next.addEventListener('click', () => api.show(current + 1));
    new MutationObserver(() => api.refresh()).observe(container, {
      childList:true, subtree:!!options.subtree, attributes:true, attributeFilter:['hidden']
    });
    api.refresh(); return api;
  }
  function reveal(node) {
    if (!node) return;
    for (const controller of controllers) {
      const matches = controller.groups.map((group, index) => ({index, nodes:group.nodes.filter(candidate => candidate === node || candidate.contains(node))}))
        .filter(group => group.nodes.length);
      if (!matches.length) continue;
      /* A nested document panel is more specific than its shared outer details. */
      matches.sort((a, b) => {
        const depth = group => Math.max(...group.nodes.map(candidate => {
          let n = candidate, result = 0; while ((n = n.parentElement)) result++; return result;
        }));
        return depth(b) - depth(a);
      });
      controller.show(matches[0].index);
    }
    lists.filter(list => list.container.isConnected).forEach(list => list.reveal(node));
  }
  function editorial(main) {
    if (route === 'index.html') {
      const hero = $('.mir-prestige-home-hero'), services = $('#decouvrir');
      const cards = listPager(services, ':scope > a', () => compact() ? 1 : 3, {label:['Expertises', 'Expertise']});
      pager(main, [
        section('Accueil', 'Home', [hero]),
        section('Découvrir MIR', 'Discover MIR', [cards?.nav, services])
      ]);
    } else if (route === 'maison.html' || route === 'chantiers.html') {
      const intro = $('.mir-entry-intro'), steps = $('.mir-entry-steps'), next = $('.mir-entry-next');
      const cards = listPager(steps, ':scope > article', () => compact() ? 1 : 3, {label:['Étapes', 'Steps']});
      pager(main, [
        section('Votre projet', 'Your project', [intro]),
        section('Préparer le projet', 'Prepare your project', [cards?.nav, steps]),
        section('Parlons-en', 'Let’s talk', [next])
      ]);
    } else if (route === 'contact.html') {
      const contact = $('.mir-contact'), intro = $('.mir-contact-intro'), details = $('.mir-contact-details');
      pager(main, [
        section('Nous joindre', 'Contact us', [details]),
        section('Votre projet', 'Your project', [intro]),
        section('Besoin d’aide', 'Need help', [$('.mir-editorial-help')])
      ]);
      if (contact) contact.classList.add('mir-client-contact-sections');
    }
  }
  function help(main) {
    const answers = $('#help-answers'), aside = $('.mir-prestige-help-grid > aside');
    if (!answers) return;
    const search = $('.mir-prestige-help-search');
    const introduction = $('.mir-prestige-help-intro > div:nth-child(2) > p');
    const pages = listPager(answers, ':scope > details', () => compact() ? 1 : 2, {label:['Réponses', 'Answers']});
    const helpPager = pager(main, [
      section('Questions fréquentes', 'Frequently asked questions', [search, answers, pages.nav]),
      section('Un conseil personnalisé', 'Personal advice', [introduction, aside])
    ], {before:$('.mir-prestige-help-grid')});
    const openVisible = () => {
      for (const row of pages.entries) if (row.dataset.mirListVisible === 'true') row.open = true;
    };
    pages.nav.addEventListener('click', openVisible);
    $('#help-search')?.addEventListener('input', () => {
      pages.show(0); helpPager.show(0); openVisible();
    });
    openVisible();
  }
  function product(main) {
    const detail = $('#product-detail');
    if (!detail) return;
    const install = () => {
      const info = $('.product-info', detail), title = $('.mir-product-title', detail);
      if (!info || !title || detail.dataset.mirClientSectionsReady) return false;
      detail.dataset.mirClientSectionsReady = 'true';
      const gallery = $('.product-gallery', detail), colour = $('.product-color-section', detail);
      const picker = $('.product-color-picker', detail);
      if (picker) listPager(picker, ':scope > [data-color]', () => compact() ? 8 : 16, {
        label:['Couleurs', 'Colours'], groupHeaders:'.mir-colour-group'
      });
      const technical = $('#product-technical'), docs = $('#product-docs'), photos = $('.mir-product-photos');
      const facts = docs?.children[0], documents = docs?.children[1];
      const tableBody = $('tbody', facts || doc);
      if (tableBody && facts) listPager(tableBody, ':scope > tr', () => compact() ? 5 : 9, {
        before:tableBody.closest('table'), label:['Détails', 'Details']
      });
      const documentPages = documents ? listPager(documents, ':scope > .product-resource', () => compact() ? 2 : 4, {label:['Documents', 'Documents']}) : null;
      const related = $('.product-related'), relatedGrid = $('#related-grid');
      if (relatedGrid) {
        listPager(relatedGrid, ':scope > *', () => compact() ? 1 : 3, {label:['Produits', 'Products']});
        all('.shop-card-swatches', relatedGrid).forEach(swatches => {
          listPager(swatches, ':scope > [data-card-color]', 5, {label:['Couleurs', 'Colours'], groupHeaders:'.mir-colour-group'});
          const details = swatches.closest('details'); if (details) details.open = false;
        });
      }
      const technicalExtras = technical ? [...technical.children].filter(node => node !== docs && node.tagName !== 'SUMMARY') : [];
      const price = [$('#product-price-note'), $('#product-price-details')];
      const groups = [
        section('Aperçu', 'Overview', [gallery, $('.product-intro', title), ...price, $('.product-quickfacts', info)]),
        section('Couleur', 'Colour', [gallery, colour]),
        section('Quantité et panier', 'Quantity and cart', [
          ...price, $('.product-format', info), $('.product-order-fields', info),
          $('#product-quantity-note'), $('.product-actions-main', info),
          $('#product-added'), $('.product-save-note', info)
        ]),
        section('Fiche technique', 'Technical details', [technical, facts], () => { if (technical) technical.open = true; }),
        section('Documents et sources', 'Documents and sources', [technical, documents, documentPages?.nav, ...technicalExtras], () => { if (technical) technical.open = true; }),
        section('À découvrir aussi', 'Related products', [related])
      ];
      if (!colour || colour.hidden) groups.splice(1, 1);
      pager(main, groups, {before:detail});
      if (photos) photos.open = false;
      return true;
    };
    if (!install()) {
      const observer = new MutationObserver(() => { if (install()) observer.disconnect(); });
      observer.observe(detail, {childList:true, subtree:true});
    }
  }
  function cart(main) {
    const area = $('.selection-page');
    if (!area) return;
    const items = $('#selection-items'), custom = $('#mir-unified-dossier');
    const itemPages = listPager(items, ':scope > .selection-item', 1, {label:['Articles', 'Items']});
    const pieces = listPager($('#mir-unified-pieces'), ':scope > li', 1, {label:['Pièces', 'Pieces']});
    const project = $('#mir-project-dossier');
    const groups = [
      section('Matériaux', 'Materials', [items, itemPages?.nav, $('#selection-summary')]),
      section('Pièces sur mesure', 'Custom pieces', [custom]),
      section('Vérifier et demander', 'Review and request', [$('#mir-cart-confirm'), $('.selection-note')]),
      section('Projet et sauvegardes', 'Project and backups', [project, $('.mir-cart-project-links')], () => { if (project) project.open = true; })
    ];
    const controller = pager(area, groups, {before:$('.mir-cart-workspace')});
    const addAccount = () => {
      const account = $('.mir-account-checkout');
      if (account && !controller.groups.some(group => group.nodes.includes(account))) {
        controller.groups.push(section('Compte client', 'Customer account', [account]));
        controller.refresh();
      }
    };
    new MutationObserver(addAccount).observe(area, {childList:true, subtree:true}); addAccount();
    doc.addEventListener('click', event => {
      if (event.target.closest('#cart-estimate')) {
        const invalid = $('.mir-quantity-status[role="alert"]', items);
        if (invalid) reveal(invalid);
      }
    }, true);
    if (location.hash === '#mir-unified-dossier' || new URLSearchParams(location.search).get('view') === 'dossier') controller.show(1);
    void pieces;
  }
  function materials(main) {
    const brands = $('#brand-buttons'), products = $('#product-list');
    if (!brands || !products) return;
    listPager(brands, ':scope > button', 6, {label:['Fabricants', 'Manufacturers']});
    const references = listPager(products, ':scope > .product-card', () => compact() ? 1 : 2, {
      label:['Références', 'References'], groupHeaders:'.catalogue-group-heading'
    });
    const controls = $('.catalogue-controls'), toolbar = $('.catalogue-toolbar');
    const showResults = button('data-mir-show-material-results', '', '');
    showResults.className = 'mir-client-section-action';
    showResults.removeAttribute('aria-label');
    showResults.setAttribute('data-mir-user-content', '');
    controls?.append(showResults);
    const updateResultsLabel = () => setText(showResults, text('Voir les références', 'View references'));
    const controller = pager(main, [
      section('Choisir un fabricant', 'Choose a manufacturer', [$('.page-heading'), $('.brand-sidebar')]),
      section('Les références', 'References', [products, references.nav, $('#catalogue-empty')]),
      section('Rechercher et filtrer', 'Search and filter', [toolbar, controls, $('#brand-note')], updateResultsLabel),
      section('Le guide des matériaux', 'Materials guide', [$('.catalogue-guidance'), $('.subnav')])
    ]);
    const materialLinks = $('.subnav', main);
    if (materialLinks) main.insertBefore(materialLinks, controller.nav.nextSibling);
    updateResultsLabel();
    showResults.addEventListener('click', () => { references.show(0); controller.show(1, true); });
    brands.addEventListener('click', event => {
      if (event.target.closest('[data-brand]')) { references.show(0); controller.show(1, true); }
    });
    const releaseReplacedPanels = () => {
      for (let index = controllers.length - 1; index >= 0; index--)
        if (!controllers[index].nav.isConnected) controllers.splice(index, 1);
      for (let index = lists.length - 1; index >= 0; index--)
        if (!lists[index].container.isConnected) lists.splice(index, 1);
    };
    const installCards = () => {
      releaseReplacedPanels();
      all(':scope > .product-card', products).forEach(card => {
        if (card.dataset.mirMaterialCardPages) return;
        card.dataset.mirMaterialCardPages = 'true';
        pager(card, [
          section('Profil et formats', 'Profile and sizes', [
            $('.catalogue-product-photo', card), $('.product-meta', card), $('.product-specs', card)
          ]),
          section('Description et couleurs', 'Description and colours', [
            $('.product-description', card), $('.color-strip', card)
          ])
        ]);
      });
    };
    new MutationObserver(installCards).observe(products, {childList:true});
    installCards();
    const dialog = $('#material-dialog'), content = $('#material-body');
    let dialogController = null;
    const installDialog = () => {
      const lead = $(':scope > p', content);
      if (!lead || lead.dataset.mirMaterialPages) return;
      lead.dataset.mirMaterialPages = 'true';
      releaseReplacedPanels();
      if (dialogController) {
        const index = controllers.indexOf(dialogController);
        if (index >= 0) controllers.splice(index, 1);
      }
      const panels = all(':scope > .material-section', content);
      const dimensions = panels.find(panel => $('.material-dimensions', panel));
      const colours = panels.find(panel => $('.official-colors', panel) || $('.source-link', panel));
      const documents = panels.find(panel => $('.material-documents', panel));
      const notes = panels.find(panel => $('.material-notes', panel));
      if (dimensions) listPager($('.material-dimensions', dimensions), ':scope > div', () => compact() ? 4 : 8, {
        label:['Dimensions', 'Dimensions']
      });
      if (colours) listPager($('.official-colors', colours), ':scope > .official-color', () => compact() ? 4 : 8, {
        label:['Couleurs', 'Colours']
      });
      if (documents) listPager($('.material-documents', documents), ':scope > a', () => compact() ? 2 : 4, {
        label:['Documents', 'Documents']
      });
      if (notes) listPager($('.material-notes', notes), ':scope > li', () => compact() ? 1 : 3, {
        label:['Notes', 'Notes']
      });
      const groups = [
        section('Présentation', 'Overview', [lead]),
        section('Dimensions et pose', 'Dimensions and installation', [dimensions]),
        section('Couleurs', 'Colours', [colours]),
        section('Documentation', 'Documentation', [documents]),
        section('À savoir', 'Good to know', [notes]),
        section('Sources et projet', 'Sources and project', [$('.material-action-row', content)])
      ];
      dialogController = pager(content, groups);
      dialog.dataset.mirClientMaterialPages = 'true';
    };
    if (dialog && content) {
      new MutationObserver(installDialog).observe(content, {childList:true, subtree:true});
      installDialog();
    }
  }
  function bendingLanding(main) {
    const quick = $('#client-bend-quick'), content = $('.client-bend-quick-content');
    if (!quick || !content) return;
    const form = $('.bend-form'), workspace = $('.bend-workspace'), preview = $('.bend-view');
    const formSections = all(':scope > .form-section', form);
    const dimensions = formSections[0], finish = formSections[1], review = formSections[2];
    const errors = $('#bend-errors'), status = $('#page-status');
    /* Keep the exact validation/status nodes and their IDs. Sharing them between
     * steps avoids a disabled action whose explanation is on a hidden step. */
    if (errors) content.append(errors);
    if (status) content.append(status);
    const profiles = listPager($('#profile-tabs'), ':scope > [data-profile]', 6, {label:['Profils', 'Profiles']});
    const colours = listPager($('#bend-colors'), ':scope > [data-color]', () => compact() ? 8 : 16, {label:['Couleurs', 'Colours']});
    listPager($('#bend-items'), ':scope > .bend-item', 1, {label:['Pièces', 'Pieces']});
    const material = $('#bend-material')?.closest('label');
    const finishTitle = $('.form-section-title', finish), finishFields = $('.bend-fields', finish);
    const finishNote = finish?.lastElementChild;
    const custom = $('[data-custom-model-channel]', content);
    const initiallyOpen = quick.open;
    const openQuick = () => { if (!quick.open) quick.open = true; };
    const quickSection = (fr, en, nodes) => section(fr, en, [quick, ...nodes], openQuick);
    const groups = [
      section('Pliage sur mesure', 'Custom bending', [$('.client-bend-hero')]),
      section('Comment ça fonctionne', 'How it works', [$('.prestige-bend-steps'), $('.subnav')]),
      quickSection('Formulaire rapide · profil', 'Quick form · profile', [
        $(':scope > .notice-inline', content), profiles?.nav, $('#profile-tabs')
      ]),
      quickSection('Toutes les mesures', 'All measurements', [workspace, form, dimensions, errors]),
      quickSection('Aperçu de la pièce', 'Piece preview', [
        workspace, preview, $('.bend-view-head'), $('#bend-drawing'), $('.bend-view-foot')
      ]),
      quickSection('À savoir sur l’aperçu', 'About the preview', [
        workspace, preview, $('.bend-view-head'), $('.bend-view-foot'), $('#bend-preview-note')
      ]),
      quickSection('Le matériau', 'Material', [
        workspace, form, finish, finishTitle, material, finishFields, finishNote, errors
      ]),
      quickSection('La couleur', 'Colour', [
        workspace, form, finish, finishTitle, material, $('#bend-color-search-label'),
        $('#bend-color-count'), colours?.nav, $('#bend-colors'), $('#bend-color-name'), $('#bend-color-note'), errors
      ]),
      quickSection('Vérifier cette pièce', 'Review this piece', [workspace, form, review, errors, status]),
      quickSection('Mon dossier de pliages', 'My bending project', [$('.bend-list-section'), status])
    ];
    /* These existing containers only provide layout. Each visible child belongs
     * to a real section; the inputs, draft listeners and drawing remain intact. */
    const controller = pager(main, groups);
    const bendingLinks = $('.subnav', main);
    if (bendingLinks) main.insertBefore(bendingLinks, controller.nav.nextSibling);
    const choose = index => {
      controller.show(index, true);
      $('[data-mir-section-select]', controller.nav)?.focus({preventScroll:true});
    };
    $('#profile-tabs')?.addEventListener('click', event => {
      if (event.target.closest('[data-profile]')) choose(3);
    });
    const colourReset = () => colours?.show(0);
    $('#bend-material')?.addEventListener('change', colourReset);
    $('#bend-color-search')?.addEventListener('input', colourReset);
    const revealChosenColour = () => {
      const chosen = $('#bend-colors [aria-pressed="true"]');
      if (chosen) colours?.reveal(chosen);
    };
    new MutationObserver(revealChosenColour).observe($('#bend-colors'), {childList:true});
    revealChosenColour();
    const installCustomModels = () => {
      if (!custom || custom.hidden || !custom.children.length) return;
      const grid = $('.mir-custom-model-grid', custom);
      if (grid) listPager(grid, ':scope > .mir-custom-model-card', () => compact() ? 1 : 3, {
        label:['Modèles', 'Models']
      });
      if (!controller.groups.some(group => group.nodes.includes(custom))) {
        controller.groups.push(quickSection('Les modèles de l’atelier', 'Workshop models', [custom]));
        controller.refresh();
      }
    };
    if (custom) {
      custom.dataset.mirPageVisible = 'false';
      new MutationObserver(installCustomModels).observe(custom, {
        childList:true, subtree:true, attributes:true, attributeFilter:['hidden']
      });
      installCustomModels();
    }
    /* Restoring a source-owned draft opens the original details after its fetch.
     * Keep that intent and its values; never recreate or persist the draft here. */
    new MutationObserver(() => {
      if (quick.open && controller.index < 2) controller.show(3);
    }).observe(quick, {attributes:true, attributeFilter:['open']});
    if (initiallyOpen) controller.show(3);
  }
  function estimate() {
    const dialog = $('#mir-estimate-dialog'), form = $('#estimate-form'), fields = $('#estimate-fields');
    if (!dialog || !form || !fields || form.dataset.mirClientSteps) return;
    form.dataset.mirClientSteps = 'true';
    dialog.dataset.mirClientEstimatePages = 'true';
    const fieldLabel = name => form.elements.namedItem(name)?.closest('label');
    const fileList = $('#estimate-file-list');
    const files = listPager(fileList, ':scope > li', () => compact() ? 2 : 4, {label:['PDF joints', 'Attached PDFs']});
    const groups = [
      section('Vos coordonnées', 'Contact details', [fieldLabel('name'), fieldLabel('email'), fieldLabel('phone'), $('legend', fields)]),
      section('Votre chantier', 'Job site', [fieldLabel('street'), fieldLabel('city'), fieldLabel('postalCode'), $('legend', fields)]),
      section('Note et plans PDF', 'Notes and PDF plans', [
        fieldLabel('note'), $('#estimate-files')?.closest('label'), $('#estimate-limits'), fileList, files?.nav
      ]),
      section('Vérifier la demande', 'Review request', [$('.estimate-review', form), $('.estimate-privacy', form), $('.estimate-submit', form)])
    ];
    const pageIntro = route === 'estimation.html' ? $('.estimate-intro') : null;
    if (pageIntro) groups.unshift(section('Votre demande', 'Your request', [pageIntro]));
    const controller = pager(pageIntro ? $('main') : form, groups, {before:pageIntro || fields});
    let validating = false;
    const markValidation = event => {
      if (event.type === 'keydown' && event.key !== 'Enter') return;
      if (event.type === 'click' && !event.target.closest('#estimate-send')) return;
      validating = true; setTimeout(() => { validating = false; }, 0);
    };
    form.addEventListener('click', markValidation, true);
    form.addEventListener('keydown', markValidation, true);
    /* checkValidity() is also called while typing by the original component.
     * Reveal only an actual submission attempt, never jump between blank fields. */
    form.addEventListener('invalid', event => { if (validating) reveal(event.target); }, true);
    const summaries = $('#estimate-summary');
    const installSummaryLists = () => {
      all('ul', summaries).forEach(ul => listPager(ul, ':scope > li', () => compact() ? 3 : 6, {label:['Lignes du projet', 'Project lines']}));
    };
    new MutationObserver(installSummaryLists).observe(summaries, {childList:true, subtree:true});
    installSummaryLists();
    const received = () => { if (dialog.dataset.received === 'true') controller.show(groups.length - 1); };
    new MutationObserver(received).observe(dialog, {attributes:true, attributeFilter:['data-received']});
    received();
  }
  function start() {
    const main = $('main');
    if (!main || body.dataset.mirClientPages) return;
    body.dataset.mirClientPages = route.replace('.html', '');
    main.classList.add('mir-client-pages-main');
    editorial(main);
    if (route === 'aide.html') help(main);
    if (route === 'produit.html') product(main);
    if (route === 'selection.html') cart(main);
    if (route === 'materiaux.html') materials(main);
    if (route === 'pliage.html') bendingLanding(main);
    if (route === 'estimation.html' || route === 'selection.html') estimate();
    doc.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || link.getAttribute('href') === '#') return;
      const target = doc.getElementById(link.hash.slice(1));
      if (!target || !controllers.some(controller => controller.groups.some(group => group.nodes.some(node => node === target || node.contains(target))))) return;
      event.preventDefault(); reveal(target);
      history.replaceState(history.state, '', location.pathname + location.search + link.hash);
    });
    const fromHash = () => { if (location.hash) reveal(doc.getElementById(location.hash.slice(1))); };
    window.addEventListener('hashchange', fromHash); fromHash();
    const refresh = () => {
      controllers.forEach(controller => controller.refresh());
      lists.filter(list => list.container.isConnected).forEach(list => list.refresh());
      measure();
    };
    window.addEventListener('resize', refresh);
    window.visualViewport?.addEventListener('resize', measure);
    doc.addEventListener('mir:locale-change', refresh);
    window.addEventListener('mir:client-locale-changed', refresh);
    new MutationObserver(measure).observe(main, {childList:true, subtree:true});
    new ResizeObserver(measure).observe(main);
    window.MIRClientPages = Object.freeze({
      inspect:() => ({
        route, sections:controllers.filter(c => c.nav.isConnected).map(c => ({
          index:c.index, count:c.groups.length, label:wording(c.groups[c.index].label)
        })),
        lists:lists.filter(l => l.container.isConnected).map(l => ({
          id:l.container.id, page:l.index, count:l.entries.length
        })),
        overflowPixels:Number(body.dataset.mirClientOverflowPixels || 0)
      })
    });
    measure();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
