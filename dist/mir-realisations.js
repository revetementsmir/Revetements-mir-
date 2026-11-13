'use strict';
(()=>{
  const dialog=document.getElementById('mir-gallery-dialog');
  if(!dialog)return;
  const projects=[
    ['Rythme architectural','nouveaux/multilogements-contemporains.webp','Ensemble de multilogements contemporains aux parements orange, taupe et noir','Parements verticaux et horizontaux structurent cette réalisation multirésidentielle.'],
    ['Refuge en forêt','nouveaux/residence-forestiere-hiver.webp','Résidence forestière en hiver avec parement brun, pierre et grandes fenêtres','Une résidence chaleureuse où bois, pierre et profils foncés dialoguent avec la forêt.'],
    ['Nature habitée','nouveaux/residence-bois-pierre-terrasse.webp','Résidence bois et pierre avec terrasse et garde-corps noirs','La terrasse et les détails noirs prolongent l’architecture dans le paysage.'],
    ['Ouverte sur le paysage','nouveaux/residence-fenetres-panoramiques.webp','Grande résidence contemporaine avec fenêtres panoramiques et galerie noire','Les grandes ouvertures et les lignes horizontales mettent en valeur les volumes.'],
    ['Contrastes maîtrisés','nouveaux/residence-brique-grise.webp','Résidence contemporaine de brique grise, pierre claire et détails noirs','Une composition sobre de maçonnerie claire, brique grise et aluminium noir.'],
    ['Nature habitée — deuxième angle','nouveaux/residence-bois-pierre.webp','Deuxième vue de la résidence bois et pierre avec terrasse','La même réalisation vue depuis l’entrée, avec ses pignons de bois et ses détails de pierre.'],
    ['Géométrie pure','nouveaux/residence-metal-contemporaine.webp','Résidence contemporaine en revêtement métallique gris avec accents de bois','Le métal vertical et les accents de bois définissent une silhouette résolument contemporaine.'],
    ['Jeux de matières','realisations-mir-contemporain-brun-large.webp','Maison contemporaine à parement brun et maçonnerie claire','Les volumes, les revêtements et la pierre de cette réalisation MIR.'],
    ['Lignes contemporaines','realisations-mir-contrastes-large.webp','Résidence contemporaine avec panneaux noirs, clins pâles et pierre grise','Jeux de panneaux, joints et lignes horizontales.'],
    ['Un classique réinventé','realisations-mir-classique-large.webp','Maison à grands pignons avec revêtement gris et encadrements blancs','Un revêtement gris et des encadrements clairs autour de grands pignons.'],
    ['Au cœur de Québec','realisations-mir-quebec-avec-voiture-large.avif','Immeuble urbain en brique et revêtement métallique au centre-ville de Québec','Brique traditionnelle et revêtement métallique contemporain au cœur de Québec.']
  ].map(([title,file,alt,caption])=>({title,file,alt,caption}));
  const filters=document.querySelector('.mir-gallery-filters');
  const cards=[...document.querySelectorAll('[data-gallery-category]')];
  let filter='all',index=0,opener=null;
  let saved=new Set();
  try{saved=new Set(JSON.parse(localStorage.getItem('mir-inspirations')||'[]').filter(id=>Number.isInteger(id)&&projects[id]));}catch{}
  const categoryMatches=(card,value)=>card.dataset.galleryCategory.split(/\s+/).includes(value);
  function renderFilter(){
    let visible=0;
    cards.forEach(card=>{
      const save=card.querySelector('[data-gallery-save]');
      const id=Number(save.dataset.gallerySave),selected=saved.has(id);
      card.hidden=!(filter==='all'||(filter==='saved'?selected:categoryMatches(card,filter)));
      if(!card.hidden)visible++;
      save.setAttribute('aria-pressed',String(selected));
      save.setAttribute('aria-label',(selected?'Retirer ':'Garder ')+projects[id].title+(selected?' de mes inspirations':' dans mes inspirations'));
      save.textContent=selected?'♥':'♡';
    });
    filters?.querySelectorAll('[data-gallery-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.galleryFilter===filter)));
    document.getElementById('mir-gallery-empty').hidden=visible>0;
  }
  filters?.addEventListener('click',event=>{const button=event.target.closest('[data-gallery-filter]');if(!button)return;filter=button.dataset.galleryFilter;renderFilter();});
  cards.forEach(card=>card.querySelector('[data-gallery-save]').addEventListener('click',()=>{const id=Number(card.querySelector('[data-gallery-save]').dataset.gallerySave);saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('mir-inspirations',JSON.stringify([...saved]));}catch{}renderFilter();}));
  const image=dialog.querySelector('#mir-gallery-dialog-photo'),title=dialog.querySelector('#mir-gallery-dialog-title'),caption=dialog.querySelector('#mir-gallery-dialog-caption'),position=dialog.querySelector('#mir-gallery-position');
  const visibleIds=()=>[...document.querySelectorAll('.mir-gallery-card:not([hidden]) [data-photo]')].map(button=>Number(button.dataset.photo));
  function show(id){index=id;const data=projects[id];title.textContent=data.title;image.src='assets/realisations/'+data.file;image.alt=data.alt;caption.textContent=data.caption;const ids=visibleIds();position.textContent=(ids.indexOf(id)+1)+' sur '+ids.length;dialog.querySelectorAll('#mir-gallery-prev,#mir-gallery-next').forEach(button=>button.hidden=ids.length<2);}
  function move(delta){const ids=visibleIds(),current=ids.indexOf(index);if(ids.length)show(ids[(current+delta+ids.length)%ids.length]);}
  document.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{opener=button;show(Number(button.dataset.photo));dialog.showModal?.();}));
  dialog.querySelector('#mir-gallery-prev').addEventListener('click',()=>move(-1));
  dialog.querySelector('#mir-gallery-next').addEventListener('click',()=>move(1));
  dialog.querySelector('#mir-gallery-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>opener?.focus());
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}if(event.key==='ArrowRight'){event.preventDefault();move(1);}});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  renderFilter();
})();
