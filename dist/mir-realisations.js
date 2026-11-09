'use strict';
(()=>{
  const dialog=document.getElementById('mir-gallery-dialog');
  if(!dialog)return;
  const names=[
    {title:'Jeux de matières',file:'realisations-mir-contemporain-brun-large.webp',alt:'Maison contemporaine à revêtement brun et maçonnerie claire',caption:'Les volumes, les revêtements et la pierre de cette réalisation MIR.'},
    {title:'Lignes contemporaines',file:'realisations-mir-contrastes-large.webp',alt:'Maison à toit incliné avec panneaux noirs, clins pâles et pierres grises',caption:'Jeux de panneaux, joints et lignes horizontales sur cette réalisation MIR.'},
    {title:'Un classique réinventé',file:'realisations-mir-classique-large.webp',alt:'Maison à pignons gris et blancs avec galerie donnant sur le jardin',caption:'Un revêtement gris et des encadrements clairs autour de grands pignons.'},
    {title:'Au cœur du centre-ville de Québec',file:'realisations-mir-quebec-avec-voiture-large.avif',alt:'Immeuble de brique et revêtement métallique au centre-ville de Québec, voiture sport noire à l’avant',caption:'Au cœur du centre-ville de Québec : brique traditionnelle et revêtement métallique, avec la voiture noire de la photographie fournie par MIR.'}
  ];
  let index=0;
  const filters=document.querySelector('.mir-gallery-filters');
  const cards=[...document.querySelectorAll('[data-gallery-category]')];
  let filter='all';
  let saved=new Set();
  try {
    saved=new Set(JSON.parse(localStorage.getItem('mir-inspirations')||'[]').filter(id=>Number.isInteger(id)&&names[id]));
  } catch {}
  function renderFilter(){
    let visible=0;
    for(const card of cards){
      const save=card.querySelector('[data-gallery-save]');
      const id=Number(save.dataset.gallerySave), selected=saved.has(id);
      card.hidden=!(filter==='all'||(filter==='saved'?selected:card.dataset.galleryCategory===filter));
      if(!card.hidden)visible++;
      save.hidden=false;
      save.setAttribute('aria-pressed',String(selected));
      save.setAttribute('aria-label','Garder '+names[id].title+' dans mes inspirations');
      save.textContent=selected?'Dans mes inspirations ✓':'Garder dans mes inspirations';
    }
    for(const button of filters.querySelectorAll('button')){
      button.setAttribute('aria-pressed',String(button.dataset.galleryFilter===filter));
    }
    document.getElementById('mir-gallery-empty').hidden=visible>0;
  }
  if(filters){
    filters.hidden=false;
    filters.addEventListener('click',event=>{
      const button=event.target.closest('[data-gallery-filter]');
      if(!button)return;
      filter=button.dataset.galleryFilter;
      renderFilter();
    });
    for(const card of cards){
      const button=card.querySelector('[data-gallery-save]');
      button.addEventListener('click',()=>{
        const id=Number(button.dataset.gallerySave);
        if(saved.has(id))saved.delete(id);else saved.add(id);
        try {localStorage.setItem('mir-inspirations',JSON.stringify([...saved]));} catch {}
        renderFilter();
        if(card.hidden)filters.querySelector('[data-gallery-filter="saved"]').focus();
      });
    }
    renderFilter();
  }
  const img=dialog.querySelector('#mir-gallery-dialog-photo');
  const title=dialog.querySelector('#mir-gallery-dialog-title');
  const caption=dialog.querySelector('#mir-gallery-dialog-caption');
  const position=dialog.querySelector('#mir-gallery-position');
  const close=dialog.querySelector('#mir-gallery-close');
  let opener=null;
  function visibleIds(){return cards.filter(c=>!c.hidden).map(c=>Number(c.querySelector('[data-gallery-save]').dataset.gallerySave));}
  function move(delta){const ids=visibleIds();if(ids.length)show(ids[(ids.indexOf(index)+delta+ids.length)%ids.length]);}
  function show(i){
    index=i;
    const data=names[index];
    title.textContent=data.title;
    img.src='assets/realisations/'+data.file;
    img.alt=data.alt;
    caption.textContent=data.caption;
    const ids=visibleIds();position.textContent=(ids.indexOf(index)+1)+' sur '+ids.length;for(const arrow of dialog.querySelectorAll('#mir-gallery-prev,#mir-gallery-next')){arrow.hidden=ids.length<2;arrow.disabled=ids.length<2;}
  }
  document.querySelectorAll('[data-photo]').forEach(button=>{
    button.addEventListener('click',()=>{
      opener=button;
      show(Number(button.dataset.photo)||0);
      if(typeof dialog.showModal==='function')dialog.showModal();
    });
  });
  dialog.querySelector('#mir-gallery-prev')?.addEventListener('click',()=>move(-1));
  dialog.querySelector('#mir-gallery-next')?.addEventListener('click',()=>move(1));
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>opener?.focus());
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}
    else if(event.key==='ArrowRight'){event.preventDefault();move(1)}
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
})();