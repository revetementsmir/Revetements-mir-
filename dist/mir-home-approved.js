/* Approved phone + iPad I01/I04. Index only. No data/API/auth changes. */
(() => {
  'use strict';
  const start = () => {
    const body = document.body;
    if (!body.classList.contains('mir-home-premium')) return;
    const copy = document.querySelector('.mir-prestige-home-copy');
    const header = document.getElementById('mir-prestige-header');
    if (!copy || !header) return;
    const intro = document.createElement('div');
    intro.className = 'mir-approved-intro';
    const heading = document.getElementById('hero-title');
    const lead = copy.querySelector('.mir-prestige-home-lead');
    heading.querySelector('br')?.after(document.createTextNode(' '));
    copy.prepend(intro);
    intro.append(copy.querySelector('.mir-editorial-overline'), heading, lead);
    const paths = [...copy.querySelectorAll('.mir-home-paths a')];
    const cards = [...document.querySelectorAll('.mir-home-service-copy strong')];
    const discover = copy.querySelector('.mir-home-discover');
    const originalDiscover = discover.getAttribute('href');
    const coarse = matchMedia('(any-pointer:coarse)');
    const language = document.createElement('div');
    language.className = 'mir-approved-language';
    language.setAttribute('aria-label', 'Langue / Language');
    for (const [locale, label] of [['fr-CA','FR'],['en-CA','EN']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label;
      button.dataset.homeLocale = locale;
      button.setAttribute('aria-label', locale === 'fr-CA' ? 'Français' : 'English');
      button.addEventListener('click', () => {
        // Retain the existing language engine and its storage/events.
        const original = [...header.querySelectorAll('.mir-client-locale-switch button')]
          .find(node => node.textContent.trim().toUpperCase() === label);
        original?.click();
      });
      language.append(button);
    }
    header.querySelector('.mir-prestige-actions').append(language);
    const set = (node, value) => { if (node.textContent !== value) node.textContent = value; };
    let lastLayout, lastEnglish;
    function refresh() {
      const w = innerWidth, h = innerHeight;
      const touchTablet = coarse.matches && Math.min(w,h) >= 600 && Math.max(w,h) <= 1400;
      const adaptive = w <= 1100 || touchTablet;
      const phone = w < 700;
      const layout = adaptive ? (phone ? 'phone' : w > h ? 'tablet-landscape' : 'tablet-portrait') : '';
      const english = /^en\b/i.test(document.documentElement.lang);
      body.style.setProperty('--mir-approved-view', `${Math.round(window.visualViewport?.height || h)}px`);
      if (layout) body.dataset.mirHomeLayout = layout;
      else delete body.dataset.mirHomeLayout;
      body.toggleAttribute('data-mir-home-desktop-locked', !layout);
      language.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.homeLocale === (english ? 'en-CA' : 'fr-CA'))));
      if (layout === lastLayout && english === lastEnglish) return;
      lastLayout = layout; lastEnglish = english;
      const labels = layout
        ? (english ? [['Homeowners','Inspiration, materials and estimates.'],['Professionals','Materials, custom bending and orders.']] : [['Particuliers','Inspiration, matériaux et estimation.'],['Professionnels','Matériaux, pliages et commandes.']])
        : (english ? [['For my home','Inspiration and materials.'],['For my jobs','Custom bending and order preparation.']] : [['Pour ma maison','Inspiration et matériaux.'],['Pour mes chantiers','Pliages et préparation de commande.']]);
      paths.forEach((a,i) => {
        const strong = a.querySelector('strong'), small = a.querySelector('small');
        strong.setAttribute('data-mir-user-content',''); small.setAttribute('data-mir-user-content','');
        set(strong, labels[i][0]); set(small, labels[i][1]);
      });
      lead.setAttribute('data-mir-user-content','');
      if (layout === 'phone') set(lead, english ? 'Materials and inspiration for your home or construction projects.' : 'Matériaux et inspiration pour votre maison ou vos chantiers de construction.');
      else {
        const text = english ? ['Renovating your home?','Planning a job?'] : ['Une maison à rénover?','Un chantier à préparer?'];
        lead.replaceChildren(document.createTextNode(text[0]),document.createElement('br'),document.createTextNode(' '+text[1]));
      }
      const titles = layout
        ? (english ? ['Siding','Custom bending','3D Studio'] : ['Revêtements','Pliages','Studio 3D'])
        : (english ? ['Exterior siding','Custom metal trim and bending','Picture your exterior in 3D'] : ['Revêtements extérieurs','Moulures et pliage sur mesure','Imaginez votre façade en 3D']);
      cards.forEach((card,i) => {card.setAttribute('data-mir-user-content','');set(card,titles[i]);});
      discover.setAttribute('href', layout ? '#mir-prestige-desktop-nav' : originalDiscover);
      if (layout) {
        discover.setAttribute('role','button'); discover.setAttribute('aria-controls','mir-prestige-desktop-nav');
        discover.setAttribute('aria-expanded','false');
      } else {
        discover.removeAttribute('role'); discover.removeAttribute('aria-controls'); discover.removeAttribute('aria-expanded');
      }
      window.MIRPrestige?.closeMenu();
    }
    discover.addEventListener('click', event => {
      if (!body.dataset.mirHomeLayout) return;
      event.preventDefault();
      const menu = document.getElementById('mir-client-menu-button');
      menu?.click();
      const opened = menu?.getAttribute('aria-expanded') === 'true';
      discover.setAttribute('aria-expanded', String(opened));
      if (opened) header.querySelector('.mir-prestige-nav a')?.focus({preventScroll:true});
    });
    discover.addEventListener('keydown', event => {
      if (body.dataset.mirHomeLayout && event.key === ' ') {event.preventDefault();discover.click();}
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && body.dataset.mirHomeLayout && discover.getAttribute('aria-expanded') === 'true') {
        window.MIRPrestige?.closeMenu(); discover.setAttribute('aria-expanded','false'); discover.focus({preventScroll:true});
      }
    });
    new MutationObserver(() => {
      if (body.dataset.mirHomeLayout) discover.setAttribute('aria-expanded',String(header.classList.contains('mir-client-menu-open')));
    }).observe(header, {attributes:true,attributeFilter:['class']});
    new MutationObserver(refresh).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
    addEventListener('resize', refresh); window.visualViewport?.addEventListener('resize',refresh);
    coarse.addEventListener('change',refresh);
    refresh();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
