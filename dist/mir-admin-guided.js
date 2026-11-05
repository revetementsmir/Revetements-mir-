/* MIR — Assistant de création d'une moulure Admin. Vue sans défilement de page,
 * 4 étapes et miniature 3D. Le moteur production-app.js garde toute l'autorité. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document){
  root.MIRAdminWizard=api;
  const boot=()=>api.init(root);
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 }
})(typeof window==='object'?window:null,function(root){
 'use strict';
 const LABELS=['Tracer','Confirmer les cotes','Face colorée','Métal et couleur'];
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function geometryKey(model){
  const s=model?.spec||{};
  return JSON.stringify({kind:s.kind,template:s.template,unit:s.unit,
   dimensions:s.dimensions,segments:s.segments,bends:s.bends,startAngle:s.startAngle});
 }
 function createController(win,config,drawing){
   const doc=win.document,body=doc.body,stage=doc.querySelector('#production-drawing');
   const app=win.MIRLiveProfile3D;
   if(!config||!drawing||!stage||!app?.render)return null;
   const views=doc.createElement('div');views.className='mir-guide-views';views.id='mir-guide-views';
   stage.parentNode.insertBefore(views,stage);views.append(stage);
   const mini=doc.createElement('aside');mini.className='mir-guide-3d';mini.id='mir-guide-3d';mini.setAttribute('aria-label','Miniature 3D synchronisée');
   mini.innerHTML='<div class="mir-guide-3d-head"><strong>MINIATURE 3D</strong><div><button type="button" id="mir-guide-3d-reset" aria-label="Recentrer la miniature 3D">↻</button><button type="button" id="mir-guide-3d-close" aria-label="Fermer la miniature 3D">✕</button></div></div><div id="mir-guide-3d-canvas" tabindex="0" aria-label="Tourner la miniature 3D avec le doigt ou la souris"></div><p class="mir-guide-3d-caption">Glisse pour tourner · échantillon 10 po</p>';
   views.append(mini);
   const mobileOpen=doc.createElement("button");mobileOpen.type="button";mobileOpen.id="mir-guide-3d-open";mobileOpen.className="secondary-button";mobileOpen.textContent="Voir en 3D";mobileOpen.setAttribute("aria-controls","mir-guide-3d");mobileOpen.setAttribute("aria-expanded","false");views.after(mobileOpen);
   const nav=doc.createElement('nav');nav.className='mir-guide-steps';nav.id='mir-guide-steps';nav.setAttribute('aria-label','Étapes de création');
   nav.innerHTML=LABELS.map((name,i)=>'<button type="button" data-mir-guide-step="'+(i+1)+'"><span class="mir-guide-num">'+(i+1)+'</span><span>'+safe(name)+'</span></button>').join('');
   const instruction=doc.createElement('section');instruction.id='mir-guide-instruction';instruction.className='mir-guide-instruction';
   const actions=doc.createElement('div');actions.className='mir-guide-actions';actions.id='mir-guide-actions';
   actions.innerHTML='<p role="status" id="mir-guide-feedback" aria-live="polite"></p><div class="mir-guide-actions-buttons"><button type="button" id="mir-guide-back" class="secondary-button">← Retour</button><button type="button" id="mir-guide-next" class="primary-button">Continuer →</button><div class="mir-guide-destinations" hidden><button type="button" id="mir-guide-add-po" class="primary-button">＋ Ajouter à un bon (sans modèle)</button><button type="button" id="mir-guide-save-model" class="secondary-button">Enregistrer comme modèle…</button></div></div>';
   config.prepend(nav,instruction);config.append(actions);
   let step=1,active=false,lastStep=0,session=false,confirmed=null,faceChosen=false,prevTool=null,prevPoints=0,state=null,yaw=-42,pitch=24,drag=null;
   const selector=s=>doc.querySelector(s);
   const feedback=selector('#mir-guide-feedback');
   const warning=text=>{feedback.textContent=text;};
   const validProfile=()=>!!state?.model?.valid&&Array.isArray(state.model.segments)&&state.model.segments.length>=2;
   function scene(){
    const src=state||{};
    const tool=src.tool;
    const points=tool==='draw'?src.drawPointsMM:src.model?.pointsMM;
    const label=src.model?.name||'Moulure en préparation';
    const model=src.model||{name:label,pointsMM:[]};
    const side=src.model?.coloredFace?.side;
    const finish=src.model?.spec?.finish;
    const svg=app.render(model,{pointsMM:points,yaw,pitch,side,hex:finish?.hex,engine:win.MIRProduction});
    const box=selector('#mir-guide-3d-canvas');
    if(box)box.innerHTML=svg;
   }
   function allowed(){
    const tab=body.dataset.mirTab||'draw',profile=body.dataset.profileAdmin==='true';
    return session&&profile&&tab==='draw'&&!body.classList.contains('mir-v4-dossier-open')&&!!selector('#author-banner')?.hidden&&!!selector('#cancel-piece-edit')?.hidden;
   }
   function apply(){
    const visible=allowed();
    if(active!==visible){active=visible;lastStep=0;body.classList.toggle('mir-admin-guided-active',visible);if(!visible){body.classList.remove('mir-guide-3d-open');mobileOpen.setAttribute('aria-expanded','false');}}
    if(!visible)return;
    if(lastStep===step)return;
    lastStep=step;
    body.dataset.mirGuideStep=String(step);
    nav.querySelectorAll('button').forEach((button,i)=>{
      button.setAttribute('aria-current',step===i+1?'step':'false');
      button.disabled=i+1>step+(step===1?0:1);
    });
    const blocks=Array.from(config.children);
    const show=new Set([nav,instruction,actions]);
    if(step===2)show.add(selector('#mir-v4-dimensions'));
    if(step===3)show.add(selector('#mir-v4-face'));
    if(step===4){
      for(const el of [selector('.piece-finish'),selector('#mir-v4-colors'),selector('.mir-v4-footer')])if(el)show.add(el);
    }
    for(const block of blocks)block.classList.toggle('mir-guide-visible',show.has(block));
    for(const id of ['mir-v4-dimensions','mir-v4-face','mir-v4-colors']){const el=selector('#'+id);if(el&&show.has(el))el.open=true;}
    if(step===3){const d=selector('#production-profile-options details');if(d)d.open=true;}
    if(step===4){const f=selector('.piece-finish');if(f)f.open=true;}
    const titles=[
      '<strong>1. Trace la moulure</strong><p>Glisse pour créer tes segments. Sur PC, la miniature suit ton dessin; sur téléphone, utilise « Voir en 3D » au besoin.</p>',
      '<strong>2. Confirme les mesures</strong><p>Vérifie A, B, C… au 1/16 po et corrige une cote directement. Le tracé reste en place.</p>',
      '<strong>3. Choisis la face colorée</strong><p>Regarde le sens de ton tracé et sélectionne la face gauche ou droite. Tourne la 3D pour contrôler.</p><div class="mir-guide-face-choices" role="group" aria-label="Confirmer le côté peint"><button type="button" data-mir-guide-face="left">Face gauche</button><button type="button" data-mir-guide-face="right">Face droite</button></div>',
      '<strong>4. Choisis le métal et la couleur</strong><p>Choisis aluminium ou acier, puis une teinte du fabricant. Vérifie la miniature avant d’enregistrer la pièce ou de l’ajouter au bon.</p>'
    ];
    instruction.innerHTML=titles[step-1];
    const back=selector('#mir-guide-back'),next=selector('#mir-guide-next');
    back.hidden=step===1;
    next.hidden=step===4;
    selector('.mir-guide-destinations').hidden=step!==4;
    next.textContent=step===1?'Terminer le tracé →':step===2?'Confirmer les cotes →':'Confirmer la face →';
    if(step===1)warning('Dessine au moins deux côtés avant de continuer.');
    else if(step===2)warning('Confirme les cotes pour accéder au choix de la face.');
    else if(step===3)warning(faceChosen?'Face choisie : confirme pour continuer.':'Appuie sur le côté de couleur souhaité.');
    else warning('Choisis : ajouter directement au bon, ou enregistrer un modèle réutilisable. Tu n’as pas besoin d’un modèle pour préparer un bon.');
    refreshFace();
   }
   function refreshFace(){
    if(step!==3)return;
    const side=state?.model?.coloredFace?.side;
    instruction.querySelectorAll('[data-mir-guide-face]').forEach(b=>{
      b.setAttribute('aria-pressed',b.dataset.mirGuideFace===side&&faceChosen?'true':'false');
    });
   }
   function go(to){
    if(to<1||to>4||!active)return;
    if(to<step){step=to;lastStep=0;apply();return;}
    if(to!==step+1)return;
    if(step===1){
      if(!validProfile()){warning('Trace au moins deux côtés avec des longueurs valides.');return;}
      if(state?.tool==='draw'){
        const native=selector('#drawing-tools [data-draw-tool="draw"]');
        if(native&&!native.disabled){native.click();return;}
        warning('Termine le tracé avec le bouton « Terminer et coter ».');return;
      }
    }
    if(step===2){
      if(!validProfile()){warning('Corrige les cotes ou les angles signalés avant de confirmer.');return;}
      confirmed=geometryKey(state.model);
      faceChosen=false; // Choix explicite, pas un ancien défaut silencieux.
    }
    if(step===3){
      if(!faceChosen||!['left','right'].includes(state?.model?.coloredFace?.side)){
        warning('Choisis explicitement la face gauche ou droite.');return;
      }
    }
    step=to;lastStep=0;apply();
   }
   function updatePreview(next){
     const wasDrawing=prevTool==='draw',drawing=next?.tool==='draw';
     if(drawing&&(!session||(prevPoints>1&&!(next.drawPointsMM||[]).length))){
       session=true;step=1;lastStep=0;confirmed=null;faceChosen=false;
     }
     if(next?.model?.spec?.template!=='custom'&&!drawing&&session){
       session=false;confirmed=null;faceChosen=false;step=1;lastStep=0;
     }
     state=next;prevTool=next?.tool;prevPoints=next?.drawPointsMM?.length||0;
     if(wasDrawing&&!drawing&&session&&step===1&&validProfile()){step=2;lastStep=0;}
     if(session&&step>=3&&confirmed&&geometryKey(next.model)!==confirmed){
       step=2;lastStep=0;faceChosen=false;
     }
     apply();if(active){scene();refreshFace();}
   }
   doc.addEventListener('click',event=>{
     if(event.target.closest('#mir-guide-3d-open')){if(!active)return;body.classList.add('mir-guide-3d-open');mobileOpen.setAttribute('aria-expanded','true');selector('#mir-guide-3d-canvas')?.focus();scene();return;}
     if(event.target.closest('#mir-guide-3d-close')){body.classList.remove('mir-guide-3d-open');mobileOpen.setAttribute('aria-expanded','false');mobileOpen.focus();return;}
     if(event.target.closest('#mir-guide-add-po')){if(step===4&&active){const native=selector('#mir-direct-po-add');if(native&&!native.disabled)native.click();else warning('Complète les détails de la pièce avant de l’ajouter au bon.');}return;}
     if(event.target.closest('#mir-guide-save-model')){if(step===4&&active&&!win.MIRProductionWorkspace?.openModelFromCurrent?.())warning('Ce profil doit être valide avant de créer un modèle.');return;}
     if(event.target.closest('#mir-guide-3d-reset')){
       yaw=-42;pitch=24;scene();return;
     }
     const face=event.target.closest('[data-mir-guide-face]');
     if(face&&active&&step===3){
       const select=selector('#profile-painted-side');
       if(select){select.value=face.dataset.mirGuideFace;faceChosen=true;select.dispatchEvent(new win.Event('change',{bubbles:true}));refreshFace();warning('Face '+(faceChosen&&face.dataset.mirGuideFace==='left'?'gauche':'droite')+' sélectionnée.');}
       return;
     }
     const btn=event.target.closest('#mir-guide-next,#mir-guide-back,[data-mir-guide-step]');
     if(!btn)return;
     if(btn.id==='mir-guide-next')go(step+1);
     else if(btn.id==='mir-guide-back')go(step-1);
     else go(Number(btn.dataset.mirGuideStep));
   });
   doc.addEventListener('click',event=>{
     if(event.target.closest('[data-focus-dimensions]')&&active&&step===1){step=2;lastStep=0;apply();}
   });
   doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&body.classList.contains('mir-guide-3d-open')){body.classList.remove('mir-guide-3d-open');mobileOpen.setAttribute('aria-expanded','false');mobileOpen.focus();}});
   const canvas=selector('#mir-guide-3d-canvas');
   canvas.addEventListener('pointerdown',event=>{
     if(!active)return;drag={x:event.clientX,y:event.clientY,id:event.pointerId};canvas.setPointerCapture?.(event.pointerId);
   });
   canvas.addEventListener('pointermove',event=>{
     if(!drag||drag.id!==event.pointerId)return;
     yaw=Math.max(-165,Math.min(165,yaw+(event.clientX-drag.x)*.7));
     pitch=Math.max(-65,Math.min(70,pitch+(drag.y-event.clientY)*.55));
     drag.x=event.clientX;drag.y=event.clientY;scene();
   });
   for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,()=>{drag=null;});
   canvas.addEventListener('keydown',event=>{
     if(!active||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
     event.preventDefault();
     if(event.key==='ArrowLeft')yaw-=12;
     if(event.key==='ArrowRight')yaw+=12;
     if(event.key==='ArrowUp')pitch+=8;
     if(event.key==='ArrowDown')pitch-=8;
     yaw=Math.max(-165,Math.min(165,yaw));pitch=Math.max(-65,Math.min(70,pitch));scene();
   });
   const observer=new win.MutationObserver(()=>apply());
   observer.observe(body,{attributes:true,attributeFilter:['class','data-mir-tab','data-profile-admin']});
   return Object.freeze({updatePreview,geometryKey,get step(){return step;},get active(){return active;}});
 }
 let controller=null;
 function init(win){
   if(new URLSearchParams(win.location.search).get('mode')==='client')return;
   if(controller)return controller;
   controller=createController(win,win.document.querySelector('.config-card'),win.document.querySelector('.drawing-card'));
   return controller;
 }
 function updatePreview(payload){controller?.updatePreview(payload);}
 return {version:'1.0.0',init,updatePreview,geometryKey,LABELS};
});
