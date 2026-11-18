/* Presentation adapter for the public profile wizard. The production controller
 * owns all business values, validation, persistence and cart mutations. */
(() => {
 'use strict';
 const params=new URLSearchParams(location.search);
 if(params.get('mode')!=='client'||params.get('source')==='store'||window.self!==window.top)return;
 const $=s=>document.querySelector(s);
 const T=s=>s; // Canonical French source; shared locale observer owns FR/EN roundtrips.
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const put=(node,value)=>{if(node&&node.textContent!==T(value))node.textContent=T(value);};
 let mounted=false;
 function sync({model,step,entry,product,editing,selectedAngle}){
  if(!document.body.classList.contains('mir-pliage03'))return;
  const workspace=$('.production-workspace'),nav=$('.mir-production-steps');
  if(!mounted){
   nav.classList.add('mir-pliage03-steps');workspace.prepend(nav);
   nav.after($('#client-entry'));$('.config-card').classList.add('mir-pliage03-config');
   const heading=document.createElement('div');heading.className='mir-pliage03-heading';
   heading.innerHTML='<p class="eyebrow">PLIAGE SUR MESURE</p><a href="selection.html">Voir mon panier <span aria-hidden="true">↗</span></a>';
   workspace.before(heading);
   $('#client-choose-model .client-entry-icon').innerHTML='<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M32 15V70H95" fill="none" stroke="currentColor" stroke-width="4"/></svg>';
   $('#client-draw-profile .client-entry-icon').innerHTML='<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M28 66L34 45 80 10 92 24 45 61Z M34 45L45 61 M72 17L84 31 M28 66L45 61" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';
   mounted=true;
  }
  ['Modèle','Mesures','Finition','Vérification'].forEach((label,i)=>{const button=$(`[data-client-step="${i+1}"]`);if(button&&button.dataset.p03Label!==label){button.innerHTML='<span>'+(i+1)+'</span><span>'+esc(T(label))+'</span>';button.dataset.p03Label=label;}});
  put($('#client-choose-model strong'),'Choisir un modèle');put($('#client-draw-profile strong'),'Dessiner ma moulure');
  if(entry==='choice')put($('#client-entry-title'),'Votre pliage sur mesure');
  put($('#client-entry-intro'),'Commencez par un modèle ou dessinez votre propre moulure.');
  if(step===2){put($('#client-step-hint'),'Chaque angle se règle séparément.');put($('.client-angle-heading h3'),'Angles individuels');}
  if(step===4){put($('#client-step-title'),'Vérifier mon pliage');put($('#client-step-hint'),'Vérifiez vos choix et indiquez la quantité à ajouter au panier.');}
  let faceHost=$('#mir-pliage03-faces');if(!faceHost){faceHost=document.createElement('div');faceHost.id='mir-pliage03-faces';$('#production-preview').append(faceHost);}
  const freshFace=$('#production-profile-options>.client-painted-face');
  if(freshFace){faceHost.replaceChildren(freshFace);}
  faceHost.hidden=step!==3;
  put($('.client-painted-face>strong'),'Côté peint');
  put($('.client-painted-face>.field-hint'),'La ligne bleue indique le côté peint.');
  document.querySelectorAll('[data-client-face]').forEach(button=>{
   button.classList.add('mir-pliage03-face-card');
   let check=button.querySelector('.face-check');if(!check){check=document.createElement('span');check.className='face-check';check.setAttribute('aria-hidden','true');button.append(check);}check.textContent=button.getAttribute('aria-pressed')==='true'?'✓':'';
  });
  document.querySelectorAll('.client-angle-field').forEach(field=>field.classList.toggle('is-selected',Number(field.dataset.angleIndex)===selectedAngle));
  // Manufacturer names are source data in every visible location, including
  // the drawing legend and selected sample, not only the swatch button.
  for(const node of [$('#drawing-finish'),$('#finish-summary'),$('#selected-finish strong')]){
   if(node)node.toggleAttribute('data-mir-source-color',Boolean(model.finish?.name||model.finish?.code));
  }
  const recap=$('#client-piece-recap');
  if(recap){
   recap.classList.add('mir-pliage03-recap');
   const dl=recap.querySelector('dl');
   if(product&&dl){const row=document.createElement('div');row.innerHTML='<dt>'+esc(T('Fabricant et produit'))+'</dt><dd>'+esc(product.brand+' · '+product.name)+'</dd>';dl.append(row);}
   if(model.finish?.code&&model.finish?.code!==model.finish?.name&&dl){const row=document.createElement('div');row.innerHTML='<dt>'+esc(T('Référence couleur'))+'</dt><dd>'+esc(model.finish.code)+'</dd>';dl.append(row);}
   const links=document.createElement('div');links.className='mir-pliage03-recap-edit';links.innerHTML='<button type="button" data-client-step="2">'+esc(T('Modifier les mesures'))+' ↗</button><button type="button" data-client-step="3">'+esc(T('Modifier la finition'))+' ↗</button>';recap.append(links);
   if(model.finish?.availabilityNote){const note=document.createElement('p');note.className='field-hint';note.textContent=T(model.finish.availabilityNote);recap.append(note);}
  }

 }
 window.MIRPliage03=Object.freeze({sync});
})();
