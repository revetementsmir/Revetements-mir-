/* Selected phone / I01 portrait / I04 landscape. Home only; no business-data writes. */
(() => {
  'use strict';
  function init() {
    if (!document.body.classList.contains('mir-prestige-home')) return;
    const body = document.body, main = document.getElementById('contenu');
    if (!main || document.getElementById('mir-approved-home')) return;
    const root = document.createElement('section');
    root.id = 'mir-approved-home'; root.className = 'mir-approved-home';
    root.setAttribute('data-mir-user-content', '');
    root.setAttribute('aria-labelledby', 'mir-approved-title');
    root.innerHTML = `<div class="mir-approved-hero">
      <div class="mir-approved-photo"></div>
      <div class="mir-approved-intro"><p class="mir-approved-kicker">LES REVÊTEMENTS MIR</p>
        <h1 id="mir-approved-title"></h1><p class="mir-approved-lead"></p></div>
      </div>
      <div class="mir-approved-choices"><nav class="mir-approved-paths">
        <a href="maison.html"><span><strong></strong><small></small></span><span aria-hidden="true">↗</span></a>
        <a href="chantiers.html"><span><strong></strong><small></small></span><span aria-hidden="true">↗</span></a>
      </nav><a class="mir-approved-discover" href="#mir-approved-gallery"><span></span><span aria-hidden="true">→</span></a></div>
      <nav id="mir-approved-gallery" class="mir-approved-gallery"></nav>`;
    root.querySelector('.mir-approved-photo').append(document.querySelector('.mir-prestige-home-photo picture').cloneNode(true));
    const cards = [...document.querySelectorAll('#decouvrir > a')].map(source => {
      const a = document.createElement('a'); a.className = 'mir-approved-card';
      a.href = source.getAttribute('href');
      const img = source.querySelector('img').cloneNode(true); img.loading = 'eager';
      a.append(img); const label = document.createElement('span'); label.className = 'mir-approved-card-label';
      label.innerHTML = '<strong></strong><span aria-hidden="true">↗</span>'; a.append(label);
      root.querySelector('.mir-approved-gallery').append(a); return a;
    });
    main.append(root);
    const compact = matchMedia('(max-width:1100px)');
    const touchTablet = matchMedia('(max-width:1400px) and (hover:none) and (pointer:coarse)');
    const phone = matchMedia('(max-width:600px)');
    const portrait = matchMedia('(orientation:portrait)');
    const copy = {
      fr: ['Particuliers','Professionnels','Inspiration, matériaux et estimation.','Matériaux, pliages et commandes.','Découvrir tout MIR','Revêtements','Pliages','Studio 3D','Choisir votre parcours','Découvrez nos expertises'],
      en: ['Homeowners','Professionals','Inspiration, materials and estimates.','Materials, custom bending and orders.','Discover MIR','Siding','Metal bending','3D Studio','Choose your path','Discover our expertise']
    };
    let previous = '';
    function render() {
      const active = compact.matches || touchTablet.matches;
      const layout = active ? (phone.matches ? 'phone' : portrait.matches ? 'portrait' : 'landscape') : 'desktop';
      const en = /^en\b/i.test(document.documentElement.lang), lang = en ? 'en' : 'fr';
      body.classList.toggle('mir-home-approved', active); body.dataset.mirHomeLayout = layout;
      root.hidden = !active;
      const key = layout + lang; if (key === previous) return; previous = key;
      const c = copy[lang], isPhone = layout === 'phone';
      root.querySelector('h1').innerHTML = en ? `Your project${isPhone ? '<br>' : ' '}starts <em>here.</em>` : `Votre projet${isPhone ? '<br>' : ' '}commence <em>ici.</em>`;
      root.querySelector('.mir-approved-lead').innerHTML = isPhone
        ? (en ? 'Materials and inspiration for your home<br>or construction projects.' : 'Matériaux et inspiration pour votre maison<br>ou vos chantiers de construction.')
        : (en ? 'A home to renovate? A project to prepare?' : 'Une maison à rénover? Un chantier à préparer?');
      const paths = root.querySelector('.mir-approved-paths'); paths.setAttribute('aria-label', c[8]);
      paths.querySelectorAll('a').forEach((a,i) => { a.querySelector('strong').textContent=c[i]; a.querySelector('small').textContent=c[i+2]; });
      root.querySelector('.mir-approved-discover > span').textContent=c[4];
      cards.forEach((card,i) => card.querySelector('strong').textContent=c[i+5]);
      root.querySelector('.mir-approved-gallery').setAttribute('aria-label',c[9]);
    }
    [compact,touchTablet,phone,portrait].forEach(query => query.addEventListener('change',render));
    new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    render();
    root.querySelector('.mir-approved-discover').addEventListener('click',event => {
      event.preventDefault(); cards[0]?.focus({preventScroll:true});
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
