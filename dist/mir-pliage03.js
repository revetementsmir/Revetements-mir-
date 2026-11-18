/* Presentation adapter for the public and explicitly opted-in personal profile wizard. The production controller
 * owns all business values, validation, persistence and cart mutations. */
(() => {
 'use strict';
 const params=new URLSearchParams(location.search);
 let field=null;
 try{if(params.get('source')==='store'&&window.parent!==window)field=window.parent.MIRFieldDrawingContext?.();}catch{}
 const fieldPliage03=params.get('kind')==='profile'&&field?.personal===true&&typeof field.ownerId==='string'&&field.ownerId.trim().length>0&&field.presentation==='pliage03';
 const publicClient=params.get('source')!=='store'&&window.self===window.top;
 if(params.get('mode')!=='client'||!publicClient&&!fieldPliage03)return;
 if(fieldPliage03){document.documentElement.dataset.fieldPliage03='true';document.body.classList.add('mir-prestige');}
 const $=s=>document.querySelector(s);
 const T=s=>s; // Canonical French source; shared locale observer owns FR/EN roundtrips.
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const put=(node,value)=>{if(node&&node.textContent!==T(value))node.textContent=T(value);};
 let mounted=false;
 let measurePage=0,measurePageSize=3,measureSignature='',measureStep=1,measureLayout='';
 function measurementIndices(count){
  const start=Math.min(measurePage*(measurePageSize-1),Math.max(0,count-1));
  return Array.from({length:Math.max(0,Math.min(measurePageSize,count-start))},(_,index)=>start+index);
 }
 function syncFieldMeasurementPages(){
  if(!fieldPliage03)return;
  const host=$('#production-dimensions');if(!host)return;
  const sides=Array.from(host.querySelectorAll('.client-measure-field'));
  const angles=Array.from(host.querySelectorAll('.client-angle-field'));
  const mobile=matchMedia('(max-width:959px)').matches;
  const signature=sides.map(node=>node.querySelector('.letter-label b')?.textContent||'').join('|');
  if(signature!==measureSignature){measureSignature=signature;measurePage=0;}
  const focused=document.activeElement,editing=host.contains(focused)&&focused?.tagName==='INPUT';
  // Do not change the page under an active input when the Android keyboard opens.
  if(!editing){
   const font=Math.max(parseFloat(getComputedStyle(document.documentElement).fontSize)||16,parseFloat(sides[0]?getComputedStyle(sides[0]).fontSize:'16')||16);
   measurePageSize=mobile&&(innerHeight<360||font>20)?2:3;
  }
  const count=mobile?Math.max(1,Math.ceil((sides.length-1)/(measurePageSize-1))):1;
  measurePage=Math.max(0,Math.min(count-1,measurePage));
  const start=mobile?measurePage*(measurePageSize-1):0,end=mobile?Math.min(sides.length,start+measurePageSize):sides.length;
  sides.forEach((node,index)=>{node.hidden=index<start||index>=end;node.dataset.fieldMeasureIndex=String(index);});
  angles.forEach((node,index)=>{node.hidden=index<start||index>=end-1;});
  host.dataset.fieldMeasurePage=String(measurePage+1);
  host.dataset.fieldMeasurePageSize=String(measurePageSize);
  host.dataset.fieldMeasurePageCount=String(count);
  let nav=host.querySelector('.client-measure-pages');
  if(!nav&&count>1){
   nav=document.createElement('nav');nav.className='client-measure-pages';nav.setAttribute('aria-label',T('Pages des mesures et angles'));
   nav.innerHTML='<button type="button" data-field-measure-page-step="-1" aria-label="'+esc(T('Mesures précédentes'))+'"><span aria-hidden="true">←</span><span>'+esc(T('Précédent'))+'</span></button><span class="client-measure-page-status" role="status" aria-live="polite"><span>'+esc(T('Côtés'))+'</span> <b id="client-measure-page-range"></b><small id="client-measure-page-count"></small></span><button type="button" data-field-measure-page-step="1" aria-label="'+esc(T('Mesures suivantes'))+'"><span>'+esc(T('Suivant'))+'</span><span aria-hidden="true">→</span></button>';
   host.prepend(nav);
  }
  if(nav){
   nav.hidden=count<=1||measureStep!==2;
   nav.querySelector('[data-field-measure-page-step="-1"]').disabled=measurePage===0;
   nav.querySelector('[data-field-measure-page-step="1"]').disabled=measurePage===count-1;
   $('#client-measure-page-range').textContent=(sides[start]?.querySelector('.letter-label b')?.textContent||'')+'–'+(sides[end-1]?.querySelector('.letter-label b')?.textContent||'');
   $('#client-measure-page-count').textContent=(measurePage+1)+' / '+count;
  }
  const layout=start+':'+end;
  if(layout!==measureLayout){measureLayout=layout;requestAnimationFrame(()=>window.dispatchEvent(new Event('mir:field-measure-page')));}
 }
 if(fieldPliage03){
  document.addEventListener('click',event=>{
   const button=event.target.closest?.('[data-field-measure-page-step]');if(!button||button.disabled)return;
   measurePage+=Number(button.dataset.fieldMeasurePageStep);
   syncFieldMeasurementPages();
  });
  window.addEventListener('resize',()=>requestAnimationFrame(syncFieldMeasurementPages));
 }
 function sync({model,step,entry,product,editing,selectedAngle}){
  if(!document.body.classList.contains('mir-pliage03'))return;
  const workspace=$('.production-workspace'),nav=$('.mir-production-steps');
  if(!mounted){
   nav.classList.add('mir-pliage03-steps');workspace.prepend(nav);
   nav.after($('#client-entry'));$('.config-card').classList.add('mir-pliage03-config');
   const heading=document.createElement('div');heading.className='mir-pliage03-heading';
   heading.innerHTML='<p class="eyebrow">PLIAGE SUR MESURE</p><a href="'+(fieldPliage03?'chantier.html?view=orders':'selection.html')+'">Voir mon panier <span aria-hidden="true">↗</span></a>';
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
  measureStep=step;syncFieldMeasurementPages();
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
 window.MIRPliage03=Object.freeze({sync,measurementIndices});
})();
