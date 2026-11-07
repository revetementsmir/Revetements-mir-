/* MIR — Atelier tactile en une page. Les calculs et sauvegardes restent dans production-app.js. */
(function(){
'use strict';
if(new URLSearchParams(location.search).get('mode')==='client')return;
const $=(selector,root=document)=>root.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let yaw=-42,pitch=24,drag=null,current=null,wasActive=false;
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
 if(active&&!wasActive){const b=$('#mir-freeform-client-toggle');if(b)b.checked=false;}
 wasActive=active;
 if(!active)return;
 const result=window.MIRProfileRecognition?.recognize(state.model)||{label:'Profil sur mesure',sides:0,certainty:'none'};
 const output=$('#mir-freeform-detected');
 if(output)output.textContent=result.sides>=2
  ?'Forme suggérée : '+result.label+' · '+result.sides+' côtés'
  :'Trace le premier côté; la forme sera reconnue automatiquement.';
 const metal=state.model?.material?.type||'à préciser',finish=state.model?.finish?.name||state.model?.finish?.code||'à choisir';
 const legend=$('#mir-freeform-3d-legend');
 if(legend)legend.textContent='Face colorée : '+finish+' · Métal : '+metal;
 const undo=$('[data-freeform-undo]'),redo=$('[data-freeform-redo]'),finishButton=$('[data-freeform-finish]'),save=$('#mir-freeform-save');
 if(undo)undo.disabled=!state.canUndo;
 if(redo)redo.disabled=!state.canRedo;
 if(finishButton)finishButton.disabled=state.tool!=='draw'||!state.model?.valid||(state.drawPointsMM||[]).length<3;
 if(save)save.disabled=!state.model?.valid;
 scene();
}
function init(){
 const workspace=$('.production-workspace'),drawing=$('.drawing-card'),config=$('.config-card');
 if(!workspace||!drawing||!config)return;
 const header=$('.production-header'),brand=$('.production-brand');
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
  header.append(save);
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
  target.innerHTML='<strong>Destination de cette moulure</strong><label><input id="mir-freeform-client-toggle" type="checkbox"> Boutique client <small>(facultatif)</small></label><p>Sans cette sélection, la moulure ne sera pas proposée à la boutique client. Prix et publication partagée à valider séparément.</p>';
  const dimension=$('#mir-v4-dimensions');if(dimension)dimension.before(target);else config.prepend(target);
 }
 if(!$('#mir-freeform-toolbar')){
  const toolbar=document.createElement('div');toolbar.id='mir-freeform-toolbar';toolbar.hidden=true;
  toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Actions du tracé');
  toolbar.innerHTML='<button type="button" class="mir-freeform-previous" data-freeform-undo title="Effacer le dernier côté du dessin">↶ <span>Précédent<small>Effacer le dernier côté</small></span></button><button type="button" class="mir-freeform-redo" data-freeform-redo title="Rétablir le côté effacé" aria-label="Rétablir le côté effacé">↷</button><button type="button" class="mir-freeform-finish" data-freeform-finish>Terminer le tracé</button><button type="button" class="mir-freeform-add" data-freeform-add><span aria-hidden="true">＋</span> Ajouter un côté</button>';
  workspace.after(toolbar);
 }
 for(const id of ['mir-v4-dimensions','mir-v4-face','mir-v4-colors']){
  const section=$('#'+id);if(section)section.open=true;
 }
 const finish=$('.piece-finish');if(finish)finish.open=true;
 const sync=()=>{const state=window.MIRProductionWorkspace?.getLivePreviewState?.();if(state)updatePreview(state);};
 window.addEventListener('mir-production-ready',sync);
 const watcher=new MutationObserver(sync);
 watcher.observe(document.body,{attributes:true,attributeFilter:['class','data-profile-admin','data-mir-tab']});
 sync();
}
window.MIRAdminWizard=Object.freeze({version:'freeform-1.0.0',updatePreview,get active(){return document.body.classList.contains('mir-freeform-active');}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
