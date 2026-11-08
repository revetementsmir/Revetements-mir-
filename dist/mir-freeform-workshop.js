/* MIR — Atelier tactile en une page. Les calculs et sauvegardes restent dans production-app.js. */
(function(){
'use strict';
if(new URLSearchParams(location.search).get('mode')==='client')return;
const $=(selector,root=document)=>root.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let yaw=-42,pitch=24,drag=null,current=null,wasActive=false,lastFaceView='',mobileStep=1;
const phoneLayout=()=>matchMedia('(max-width:650px), (max-width:950px) and (max-height:520px) and (pointer:coarse)').matches;
const mobileStepNames=['Tracé libre','Mesures et angles','Matériau et couleur','Confirmation 2D/3D'];
function closeMobileSections({restoreFocus=false}={}){
 const menu=$('#mir-mobile-section-menu'),toggle=$('#mir-mobile-section-toggle');
 if(!menu||menu.hidden)return;
 menu.hidden=true;
 document.body.classList.remove('mir-mobile-sections-open');
 if(toggle){toggle.setAttribute('aria-expanded','false');if(restoreFocus)toggle.focus({preventScroll:true});}
}
function initMobileSections(header){
 if(document.documentElement.hasAttribute('data-mir-harmony'))return;
 if(!header||$('#mir-mobile-section-toggle'))return;
 const toggle=document.createElement('button');
 toggle.type='button';toggle.id='mir-mobile-section-toggle';
 toggle.setAttribute('aria-label','Ouvrir les sections de l’atelier MIR');
 toggle.setAttribute('aria-controls','mir-mobile-section-menu');
 toggle.setAttribute('aria-expanded','false');
 toggle.textContent='☰';
 const menu=document.createElement('nav');
 menu.id='mir-mobile-section-menu';menu.hidden=true;
 menu.setAttribute('aria-label','Naviguer dans les sections MIR');
 const sections=[['draw','Créer'],['models','Mes pliages'],['boutique','Boutique'],['store','Magasin employés'],['orders','Bons de commande']];
 menu.innerHTML=sections.map(([id,name])=>
  '<button type="button" data-mir-mobile-tab="'+id+'">'+escape(name)+'</button>').join('');
 header.append(toggle,menu);
 toggle.addEventListener('click',()=>{
  const isOpen=!menu.hidden;
  if(!document.body.classList.contains('mir-mobile-stepper'))return;
  menu.hidden=isOpen;
  document.body.classList.toggle('mir-mobile-sections-open',!isOpen);
  toggle.setAttribute('aria-expanded',String(!isOpen));
  if(!isOpen)menu.querySelector('button')?.focus({preventScroll:true});
 });
 menu.addEventListener('click',event=>{
  const button=event.target.closest('[data-mir-mobile-tab]');if(!button)return;
  const tab=$('#mir-procurement-tabs [data-mir-tab="'+button.dataset.mirMobileTab+'"]');
  closeMobileSections();
  tab?.click(); // Réutiliser la vraie navigation et les permissions existantes.
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!menu.hidden){event.preventDefault();closeMobileSections({restoreFocus:true});}
 });
 document.addEventListener('click',event=>{
  if(!menu.hidden&&!menu.contains(event.target)&&event.target!==toggle)closeMobileSections();
 });
}
function setMobileStep(value){
 if(!phoneLayout()||!document.body.classList.contains('mir-freeform-active'))return;
 const requested=Math.max(1,Math.min(4,Number(value)||1));
 if(requested>mobileStep&&mobileStep===1){
  if(!current?.model?.valid||(current.model.segments||[]).length<2)return;
  if(window.MIRProductionWorkspace?.finishFreeformTrace?.()===false)return;
 }
 mobileStep=requested;
 const config=$('.config-card'),workspace=$('.production-workspace');
 if(config)config.scrollTop=0;
 if(workspace)workspace.scrollTop=0;
 renderMobileStep();
}
function renderMobileStep(){
 const on=phoneLayout()&&document.body.classList.contains('mir-freeform-active')&&!document.body.classList.contains('mir-v4-dossier-open');
 document.body.classList.toggle('mir-mobile-stepper',on);
 document.body.dataset.mirMobileStep=on?String(mobileStep):'0';
 if(!on)closeMobileSections();
 const header=$('#mir-mobile-steps');
 if(header){
  header.hidden=!on;
  if(on)header.innerHTML='<div class="mir-mobile-step-title"><strong>Étape '+mobileStep+' / 4</strong><span>'+mobileStepNames[mobileStep-1]+'</span></div>'+
   '<div class="mir-mobile-step-progress" aria-label="Progression des étapes">'+mobileStepNames.map((t,i)=>'<span class="'+(i<mobileStep?'done':'')+'" title="'+t+'"></span>').join('')+'</div>';
 }
 const prev=$('[data-freeform-undo]'),next=$('[data-freeform-next]');
 if(prev){
  prev.innerHTML=on&&mobileStep>1?'← <span>Précédent<small>Étape '+(mobileStep-1)+'</small></span>':
    '↶ <span>Précédent<small>Effacer le dernier pli</small></span>';
  prev.disabled=on&&mobileStep>1?false:!current?.canUndo;
 }
 if(next){
  next.textContent=on?(mobileStep===4?'Enregistrer / bon de commande':'Suivant →'):'Continuer';
  next.disabled=!current?.model?.valid||!((current.model.segments||[]).length>=2);
 }
}
function scene(){
 const canvas=$('#mir-freeform-3d-canvas'),V=window.MIRLiveProfile3D;
 if(!canvas||!V?.render)return;
 const state=current||{},model=state.model||{name:'Tracé en cours',pointsMM:[],segments:[]},
  points=state.tool==='draw'?state.drawPointsMM:model.pointsMM;
 try{canvas.innerHTML=V.render(model,{pointsMM:points,yaw,pitch,
   side:model.coloredFace?.side,hex:model.finish?.hex,engine:window.MIRProduction});}
 catch{canvas.textContent='Aperçu 3D à compléter après le tracé.';}
}
function updatePreview(state){
 current=state||null;
 const active=!!state&&state.kind==='profile'&&!state.authoring&&!state.editingItemId&&
   (!document.body.dataset.mirTab||document.body.dataset.mirTab==='draw')&&!document.body.classList.contains('mir-v4-secondary-view');
 if(document.body.classList.contains('mir-freeform-active')!==active)document.body.classList.toggle('mir-freeform-active',active);
 const toolbar=$('#mir-freeform-toolbar');
 if(toolbar)toolbar.hidden=!active;
 if(active&&!wasActive){for(const id of ['#mir-freeform-client-toggle','#mir-freeform-store-toggle']){const toggle=$(id);if(toggle)toggle.checked=false;}lastFaceView='';mobileStep=1;}
 wasActive=active;
 if(!active){renderMobileStep();return;}
 // Positionner la caméra sur la vraie face peinte lors d'une inversion.
 const V=window.MIRLiveProfile3D,face=state.model?.coloredFace,segment=state.model?.segments?.find(item=>item.label===face?.segmentId);
 const faceView=face?.side&&segment?`${face.side}:${face.segmentId}:${Math.round(segment.headingDeg*10)/10}`:'';
 if(faceView&&faceView!==lastFaceView&&V?.preferredView){const view=V.preferredView(state.model,{yaw,pitch});yaw=view.yaw;pitch=view.pitch;}
 lastFaceView=faceView;
 const result=window.MIRProfileRecognition?.recognize(state.model)||{label:'Profil sur mesure',sides:0,certainty:'none'};
 const output=$('#mir-freeform-detected');
 if(output)output.textContent=result.sides>=2
  ?'Forme suggérée : '+result.label+' · '+result.sides+' côtés'
  :'Trace le premier côté; la forme sera reconnue automatiquement.';
 const metal=state.model?.material?.type||'à préciser',finish=state.model?.finish?.name||state.model?.finish?.code||'à choisir';
 const legend=$('#mir-freeform-3d-legend');
 if(legend)legend.textContent='Face colorée : '+finish+' · Métal : '+metal;
 const tools=$('#drawing-tools');
 if(tools&&!$('#mir-freeform-finish-top')){const finish=document.createElement('button');finish.type='button';finish.id='mir-freeform-finish-top';finish.dataset.freeformFinish='1';finish.textContent='Terminer le tracé';finish.setAttribute('aria-label','Terminer le tracé et modifier les cotes');tools.append(finish);}
 const undo=$('[data-freeform-undo]'),finishButton=$('[data-freeform-finish]'),save=$('#mir-freeform-save');
 if(undo)undo.disabled=!state.canUndo;
 if(finishButton)finishButton.disabled=state.tool!=='draw'||!state.model?.valid||(state.drawPointsMM||[]).length<3;
 if(save)save.disabled=!state.model?.valid;
 const proceed=$('[data-freeform-next]');
 if(proceed)proceed.disabled=!state.model?.valid||(state.model?.segments?.length||0)<2;
 scene();
 renderMobileStep();
}
function init(){
 const workspace=$('.production-workspace'),drawing=$('.drawing-card'),config=$('.config-card');
 if(!workspace||!drawing||!config)return;
 const header=$('.production-header'),brand=$('.production-brand');
 initMobileSections(header);
 if(brand&&!$('#mir-freeform-title')){
  const title=document.createElement('div');title.id='mir-freeform-title';
  title.innerHTML='<strong>Atelier de pliage</strong><small>Création de moulure sur mesure</small>';
  brand.after(title);
 }
 if(header&&!$('#mir-freeform-save')){
  const save=document.createElement('button');save.type='button';save.id='mir-freeform-save';save.textContent='Enregistrer la moulure';
  save.addEventListener('click',()=>{if(!window.MIRProductionWorkspace?.openModelFromCurrent?.()){
   const toast=$('#production-toast');if(toast){toast.textContent='Termine le dessin et les cotes avant de l’enregistrer.';toast.classList.add('visible');}
  }});
  if(document.documentElement.hasAttribute('data-mir-harmony'))$('.drawing-head')?.append(save);else header.append(save);
 }
 if(!$('#mir-freeform-detected')){
  const detected=document.createElement('p');detected.id='mir-freeform-detected';detected.className='mir-freeform-detected';
  detected.setAttribute('role','status');detected.setAttribute('aria-live','polite');
  $('.drawing-head',drawing)?.append(detected);
 }
 if(!$('#mir-freeform-3d')){
  const mini=document.createElement('section');mini.id='mir-freeform-3d';mini.className='mir-freeform-3d';
  mini.setAttribute('aria-label','Aperçu en volume synchronisé');
  mini.innerHTML='<div class="mir-freeform-3d-head"><strong>APERÇU 3D</strong><button type="button" id="mir-freeform-3d-reset" aria-label="Recentrer la vue 3D">↻</button></div><div id="mir-freeform-3d-canvas" tabindex="0" aria-label="Tourner l’aperçu 3D au toucher ou à la souris"></div><p id="mir-freeform-3d-legend">Couleur et métal à choisir</p>';
  $('.drawing-stage',drawing)?.after(mini);
  const canvas=$('#mir-freeform-3d-canvas');
  canvas.addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;
   yaw=Math.max(-165,Math.min(165,yaw+(event.clientX-drag.x)*.7));
   pitch=Math.max(-65,Math.min(70,pitch+(drag.y-event.clientY)*.55));
   drag.x=event.clientX;drag.y=event.clientY;scene();
  });
  for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,()=>{drag=null;});
  canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
   event.preventDefault();if(event.key==='ArrowLeft')yaw-=12;if(event.key==='ArrowRight')yaw+=12;
   if(event.key==='ArrowUp')pitch+=8;if(event.key==='ArrowDown')pitch-=8;scene();});
  $('#mir-freeform-3d-reset').addEventListener('click',()=>{yaw=-42;pitch=24;scene();});
 }
 if(!$('#mir-freeform-destination')){
  const target=document.createElement('section');target.id='mir-freeform-destination';
  target.innerHTML='<strong>Destination de cette moulure</strong><label class="mir-workshop-switch"><span>Boutique client <small>(optionnel)</small></span><input id="mir-freeform-client-toggle" type="checkbox" aria-label="Ajouter aux créations destinées à la Boutique client"></label><label class="mir-workshop-switch"><span>Magasin employés <small>(optionnel)</small></span><input id="mir-freeform-store-toggle" type="checkbox" aria-label="Ajouter aux créations disponibles pour le Magasin employés"></label><p>Les deux choix sont indépendants. Le bon de commande direct n’enregistre pas la moulure dans Mes pliages. La Boutique attend les tarifs et la validation avant publication.</p>';
  const dimension=$('#mir-v4-dimensions');if(dimension)dimension.before(target);else config.prepend(target);
 }
 // Les utilitaires historiques restent accessibles sans occuper deux rangées.
 const shortcuts=$('#mir-proc-shortcuts'),clear=$('.mir-proc-reset-link');
 if(shortcuts&&clear&&!shortcuts.contains(clear))shortcuts.append(clear);
 const models=shortcuts?.querySelector('[data-mir-tab="models"]');
 if(models)models.textContent='Mes pliages';
 // Le nom se règle avec les autres informations de la pièce, jamais au-dessus du tableau.
 const pieceName=$('#mir-piece-name-field'),destination=$('#mir-freeform-destination');
 if(pieceName&&destination&&!config.contains(pieceName))destination.before(pieceName);
 if(!$('#mir-mobile-steps')){
  const stageHeader=document.createElement('section');
  stageHeader.id='mir-mobile-steps';stageHeader.className='mir-mobile-steps';stageHeader.hidden=true;
  stageHeader.setAttribute('aria-label','Étapes de création mobile');
  workspace.before(stageHeader);
 }
 if(!$('#mir-freeform-toolbar')){
  const toolbar=document.createElement('div');toolbar.id='mir-freeform-toolbar';toolbar.hidden=true;
  toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Actions du tracé');
  toolbar.innerHTML='<button type="button" class="mir-freeform-previous" data-freeform-undo title="Supprimer le dernier côté ou pli du tracé">↶ <span>Précédent<small>Effacer le dernier pli</small></span></button><button type="button" class="mir-freeform-add" data-freeform-next title="Choisir Enregistrer, Ajouter au bon existant ou Créer un bon">Continuer</button>';
  toolbar.addEventListener('click',event=>{
   if(event.target.closest('[data-freeform-next]')){
    if(phoneLayout()&&document.body.classList.contains('mir-mobile-stepper')&&mobileStep<4){
     event.preventDefault();event.stopPropagation();setMobileStep(mobileStep+1);
    }else window.MIRProductionWorkspace?.openContinueMenu?.();
   }
   if(event.target.closest('[data-freeform-undo]')&&phoneLayout()&&mobileStep>1){
    event.preventDefault();event.stopPropagation();setMobileStep(mobileStep-1);
   }
  });
  workspace.after(toolbar);
 }
 if(!$('#mir-freeform-finish-top')){
  const topTools=$('#drawing-tools');
  if(topTools){const finish=document.createElement('button');finish.type='button';finish.id='mir-freeform-finish-top';finish.dataset.freeformFinish='1';finish.textContent='Terminer le tracé';finish.setAttribute('aria-label','Terminer le tracé et modifier les cotes');topTools.append(finish);}
 }
 for(const id of ['mir-v4-dimensions','mir-v4-face','mir-v4-colors']){
  const section=$('#'+id);if(section)section.open=true;
 }
 const finish=$('.piece-finish');if(finish)finish.open=true;
 const sync=()=>{const state=window.MIRProductionWorkspace?.getLivePreviewState?.();if(state)updatePreview(state);};
 window.addEventListener('mir-production-ready',sync);
 window.addEventListener('resize',renderMobileStep);
 // Le dossier reste ouvrable sur téléphone : sortir temporairement des 4 étapes
 // sans perdre la pièce, puis les rétablir quand le dossier se referme.
 $('#mode-link')?.addEventListener('click',()=>{
  requestAnimationFrame(()=>{
   renderMobileStep();
   if(phoneLayout()&&document.body.classList.contains('mir-v4-dossier-open'))
    $('#production-order')?.scrollIntoView({block:'start',behavior:'instant'});
  });
 });
 const watcher=new MutationObserver(sync);
 watcher.observe(document.body,{attributes:true,attributeFilter:['class','data-profile-admin','data-mir-tab']});
 sync();
}
window.MIRAdminWizard=Object.freeze({version:'freeform-1.2.0',updatePreview,get active(){return document.body.classList.contains('mir-freeform-active');}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
