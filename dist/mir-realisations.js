'use strict';
(()=>{
  const dialog=document.getElementById('mir-gallery-dialog');
  if(!dialog)return;
  const names=[
    {title:'Jeux de matières',file:'realisations-mir-contemporain-brun-large.webp',alt:'Maison contemporaine à revêtement brun et maçonnerie claire',caption:'Les volumes, les revêtements et la pierre de cette réalisation MIR.'},
    {title:'Lignes contemporaines',file:'realisations-mir-contrastes-large.webp',alt:'Maison à toit incliné avec panneaux noirs, clins pâles et pierres grises',caption:'Jeux de panneaux, joints et lignes horizontales sur cette réalisation MIR.'},
    {title:'Un classique réinventé',file:'realisations-mir-classique-large.webp',alt:'Maison à pignons gris et blancs avec galerie donnant sur le jardin',caption:'Un revêtement gris et des encadrements clairs autour de grands pignons.'},
    {title:'Au cœur du centre-ville de Québec',file:'realisations-mir-urbain-crepuscule-large.avif',alt:'Immeuble résidentiel d’angle avec façade de brique, revêtement métallique et galerie vitrée',caption:'Au cœur du centre-ville de Québec : brique traditionnelle et revêtement métallique sur un immeuble urbain. Photographie retouchée pour la présentation; décor et aménagement paysager illustratifs.'}
  ];
  let index=0;
  const img=dialog.querySelector('#mir-gallery-dialog-photo');
  const title=dialog.querySelector('#mir-gallery-dialog-title');
  const caption=dialog.querySelector('#mir-gallery-dialog-caption');
  const position=dialog.querySelector('#mir-gallery-position');
  const close=dialog.querySelector('#mir-gallery-close');
  let opener=null;
  function show(i){
    index=(i+names.length)%names.length;
    const data=names[index];
    title.textContent=data.title;
    img.src='assets/realisations/'+data.file;
    img.alt=data.alt;
    caption.textContent=data.caption;
    position.textContent=(index+1)+' / '+names.length;
  }
  document.querySelectorAll('[data-photo]').forEach(button=>{
    button.addEventListener('click',()=>{
      opener=button;
      show(Number(button.dataset.photo)||0);
      if(typeof dialog.showModal==='function')dialog.showModal();
    });
  });
  dialog.querySelector('#mir-gallery-prev')?.addEventListener('click',()=>show(index-1));
  dialog.querySelector('#mir-gallery-next')?.addEventListener('click',()=>show(index+1));
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>opener?.focus());
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();show(index-1)}
    else if(event.key==='ArrowRight'){event.preventDefault();show(index+1)}
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
})();