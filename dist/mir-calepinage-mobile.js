/* MIR mobile calepinage: un seul groupe de tâches visible à la fois.
   Les champs sont ceux du vrai calculateur, sans seconde copie des mesures. */
(function(){
 'use strict';
 const mobile=()=>window.matchMedia('(max-width:740px)').matches;
 const $=s=>document.querySelector(s),steps=['wall','panels','order'];
 let current='wall';
 function advice(message){
  const box=$('#mir-cal-mobile-feedback');if(!box)return;
  box.textContent=message||'';box.hidden=!message;
 }
 function checkedDimensions(){
  const M=window.MIRProduction,w=M?.parseMeasurement?.($('#zone-width')?.value,'in'),h=M?.parseMeasurement?.($('#zone-height')?.value,'in');
  return w?.ok&&w.value>0&&h?.ok&&h.value>0;
 }
 function panelsReady(){
  const count=$('#piece-count')?.textContent||'';
  const match=count.match(/(\d+)\s+panneau/i);
  return match&&Number(match[1])>0;
 }
 function stepTo(next,{check=false}={}){
  if(!steps.includes(next))return;
  if(check&&current==='wall'&&next==='panels'&&!checkedDimensions()){
   advice('Entre la largeur et la hauteur réelles du mur avant de répartir les panneaux.');
   $('#zone-width')?.focus({preventScroll:false});return;
  }
  if(check&&current==='panels'&&next==='order'&&!panelsReady()){
   advice('Choisis combien de panneaux tu veux, puis vérifie les cotes du mur.');
   $('#columns')?.focus({preventScroll:false});return;
  }
  advice('');
  current=next;
  document.body.dataset.mirCalStep=next;
  document.querySelectorAll('[data-mir-cal-stage]').forEach(button=>{
    const on=button.dataset.mirCalStage===next;
    button.setAttribute('aria-current',on?'step':'false');
  });
  const index=steps.indexOf(next);
  const back=$('#mir-cal-mobile-back'),forward=$('#mir-cal-mobile-next');
  back.hidden=index===0;
  forward.textContent=index===0?'Continuer : les panneaux →':index===1?'Continuer : le bon →':'Préparer le bon fournisseur →';
  const confirmed=$('#dimensions-confirmed'),proxy=$('#mir-cal-mobile-confirm');
  if(confirmed&&proxy)proxy.checked=confirmed.checked;
  const n=$('#mir-cal-mobile-panel-count');
  if(n)n.textContent=$('#piece-count')?.textContent||'Les panneaux';
  if(next==='order'){
    // L'adjointe vérifie le chantier avant les options de fabrication ;
    // la fiche avancée reste accessible mais n'est pas imposée.
    $('#fabrication-details')?.removeAttribute('open');
  }
  if(mobile()){
   const nav=$('#mir-cal-mobile-nav');
   nav?.scrollIntoView({block:'start',behavior:'auto'});
  }
 }
 function build(){
  if(!mobile())return;
  const main=$('#main'),settings=$('.settings'),bar=$('.project-bar');
  if(!main||!settings||!bar||$('#mir-cal-mobile-nav'))return;
  const boundary=$('#panneaux-setup');
  let after=false;
  for(const node of [...settings.children]){
   if(node===boundary)after=true;
   node.dataset.mirCalGroup=after?'panels':'wall';
  }
  // Les cotes courantes restent visibles, les réglages de géométrie avancés
  // n'occupent plus plusieurs écrans au premier chargement.
  const shape=$('#wall-shape')?.closest('label');
  if(shape){
   const advanced=document.createElement('details');
   advanced.id='mir-cal-mobile-advanced';
   advanced.dataset.mirCalGroup='wall';
   advanced.innerHTML='<summary>Toit, plan PDF et réglages avancés</summary>'+
    '<p class="hint">Ouvre seulement si ton mur a une pointe, une pente ou des cotes spéciales.</p>';
   shape.after(advanced);
   for(const selector of ['#pdf-options','.clearances','#wall-preset-fields','#roof-pitch-fields',
      '#wall-free-fields','#wall-coordinate-details','#wall-edge-details','#wall-gap-method']){
    const node=$(selector);if(node)advanced.appendChild(node);
   }
   $('#wall-shape')?.addEventListener('change',e=>{
    if(['gable','slope','free'].includes(e.target.value))advanced.open=true;
   });
   $('#import-pdf')?.addEventListener('click',()=>advanced.open=true);
  }
  const nav=document.createElement('section');
  nav.id='mir-cal-mobile-nav';nav.className='mir-cal-mobile-nav';
  nav.innerHTML='<div class="mir-cal-mobile-title"><p>ATELIER MIR · PANNEAUX</p>'+
    '<h2>Créer mes panneaux</h2><span>Une étape à la fois, sans perdre les mesures.</span>'+ 
    '<button type="button" id="mir-cal-mobile-example">Essayer un mur exemple</button></div>'+
    '<div class="mir-cal-mobile-steps" role="navigation" aria-label="Étapes du calepinage">'+
    '<button type="button" data-mir-cal-stage="wall"><b>1</b>Mur</button>'+
    '<button type="button" data-mir-cal-stage="panels"><b>2</b>Panneaux</button>'+
    '<button type="button" data-mir-cal-stage="order"><b>3</b>Bon</button></div>'+
    '<p id="mir-cal-mobile-feedback" role="alert" hidden></p>';
  bar.before(nav);
  const footer=document.createElement('div');footer.id='mir-cal-mobile-footer';
  footer.innerHTML='<button type="button" id="mir-cal-mobile-back">← Retour</button>'+
    '<button type="button" id="mir-cal-mobile-next">Continuer : les panneaux →</button>';
  main.append(footer);
  const confirmed=$('#dimensions-confirmed');
  if(confirmed){
   const confirmation=document.createElement('label');confirmation.className='mir-cal-mobile-confirm';
   confirmation.innerHTML='<input type="checkbox" id="mir-cal-mobile-confirm"><span>J’ai vérifié les dimensions du mur et le lousse de pose.</span>';
   const send=$('#send-production'),bar=send?.closest('.export-bar');
   bar?.before(confirmation);
   confirmation.querySelector('input').addEventListener('change',e=>{
    confirmed.checked=e.target.checked;
    confirmed.dispatchEvent(new Event('change',{bubbles:true}));
   });
  }
  const table=$('#piece-table')?.closest('.table-wrap');
  if(table){
   const show=document.createElement('details');show.className='mir-cal-mobile-full-table';
   show.innerHTML='<summary>Afficher les cotes détaillées de chaque panneau</summary>';
   table.before(show);show.append(table);
  }
  const exports=$('.export-bar > div');
  if(exports){
   const extra=document.createElement('details');
   extra.className='mir-cal-mobile-extra-export';
   extra.innerHTML='<summary>Exports PDF de chantier et sauvegarde JSON</summary>';
   exports.before(extra);extra.append(exports);
  }
  const inspector=$('.inspector');
  if(inspector){
    const details=document.createElement('details');
    details.className='mir-cal-mobile-panel-inspector';
    details.innerHTML='<summary>Modifier les mesures d’un panneau (facultatif)</summary>'+
      '<p class="hint">Sélectionne un repère sur le mur, puis ouvre cette fiche seulement si tu veux ajuster ses cotes.</p>';
    inspector.before(details);details.append(inspector);
    $('#layout-svg')?.addEventListener('click',event=>{
      if(event.target.closest('[data-piece]'))details.open=true;
    });
  }
  const productionTitle=$('#fabrication-title');
  if(productionTitle)productionTitle.textContent='Préparer le bon fournisseur';
  const productionIntro=$('.production-heading>p');
  if(productionIntro)productionIntro.textContent='Renseigne le chantier, puis confirme les options seulement si elles sont connues. Les 10 panneaux gardent leurs mesures.';
  const fabricationSummary=$('#fabrication-details>summary');
  if(fabricationSummary)fabricationSummary.textContent='Matériau, épaisseur et couleur (à vérifier)';
  const count=document.createElement('p');count.className='mir-cal-mobile-count';
  count.id='mir-cal-mobile-panel-count';
  $('.production-heading')?.after(count);
  // Ne jamais proposer l'exemple avant la fin du chargement du calculateur.
  // Le moteur met `disabled=false` sur le bouton nouveau mur une fois l'état IndexedDB restauré.
  const example=$('#mir-cal-mobile-example'),starter=$('#new-traced-section');
  if(example&&starter){
    const syncReady=()=>{example.disabled=starter.disabled;};
    syncReady();
    new MutationObserver(syncReady).observe(starter,{attributes:true,attributeFilter:['disabled']});
    example.addEventListener('click',()=>{
      if(starter.disabled){advice('Le calculateur charge le dossier. Réessaie une fois le bouton disponible.');return;}
      $('#load-example')?.click();
    });
  }
  nav.addEventListener('click',e=>{
   const button=e.target.closest('[data-mir-cal-stage]');
   if(button)stepTo(button.dataset.mirCalStage);
  });
  $('#mir-cal-mobile-back').addEventListener('click',()=>{
   const i=steps.indexOf(current);stepTo(steps[Math.max(0,i-1)]);
  });
  $('#mir-cal-mobile-next').addEventListener('click',()=>{
   const i=steps.indexOf(current);
   if(i<2){stepTo(steps[i+1],{check:true});return;}
   const send=$('#send-production');
   if(!send||send.disabled){
    advice('La liste n’est pas encore prête. Vérifie les cotes, le lousse, les options de fabrication et la confirmation ci-dessous.');
    $('#mir-cal-mobile-confirm')?.focus();return;
   }
   advice('');send.click();
  });
  stepTo('wall');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
 window.matchMedia('(max-width:740px)').addEventListener('change',event=>{if(event.matches)build();});
})();
