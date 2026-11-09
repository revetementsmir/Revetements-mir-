/* Presentation only: move the real controls, never copy a dossier or geometry. */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), wall=location.pathname.endsWith('/calepinage.html');
if(!wall&&new URLSearchParams(location.search).get('mode')==='client')return;
let mounted=false,root,inspector,stage,context,actions,returnFocus,moves=[],sheets=[],adapted=[];
let profileFrame=null,profileFrameKey='';
function fitProfileViewport(s){
 if(wall||s?.kind!=='profile'||s.tool!=='select'||s.preview!=='face')return;
 const svg=$('#production-drawing>svg');if(!svg)return;
 const key=JSON.stringify([s.model.pointsMM,s.model.bends]);
 if((key!==profileFrameKey||!profileFrame)&&s.zoom===1&&!s.pan.x&&!s.pan.y){
  const box=svg.getBBox(),pad=Math.max(box.width,box.height)*.12;
  if(box.width>0&&box.height>0){profileFrame=[box.x-pad,box.y-pad,box.width+pad*2,box.height+pad*2];profileFrameKey=key;}
 }
 // Only the camera frame changes. Native CTMs continue to map pan, zoom and taps.
 if(profileFrame)svg.setAttribute('viewBox',profileFrame.join(' '));
}
function adaptiveTools(){const short=matchMedia('(max-height:520px)').matches;for(const [node,marker,details]of adapted){if(short)details.append(node);else marker.after(node);details.hidden=!short;}}
const compact=()=>matchMedia('(max-width:959px), (orientation:portrait) and (pointer:coarse)').matches;
function dimension(key){
 const api=window.MIRCalepinageWorkspace,state=api?.getState();if(!state)return;
 const label={width:'A — Largeur hors tout du mur',height:'B — Hauteur hors tout du mur',projection:'C — Projection'}[key],value=key==='projection'?state.zone.meta.projection:state.zone.values[key];
 const d=document.createElement('dialog');d.className='mir-workspace-choice';d.innerHTML='<h2></h2><label>Nouvelle cote<input id="mir-workspace-dimension-value" inputmode="text"></label><label>Unité<select><option value="in">Pouces et fractions</option><option value="mm">Millimètres</option></select></label><p>Les cotes et les joints verrouillés sont conservés. C désigne la projection, pas l’épaisseur.</p><p role="alert"></p>';
 $('h2',d).textContent=label;$('input',d).value=value||'';
 d.append(button('Appliquer',()=>{const result=api.applyDimension(key,$('input',d).value,$('select',d).value);if(!result.ok){$('[role=alert]',d).textContent=result.error;return;}d.close();}),button('Annuler',()=>d.close()));
 d.addEventListener('close',()=>{d.remove();($('svg [data-wall-dimension="'+key+'"]')||$('.mir-workspace-dimensions [data-wall-dimension="'+key+'"]'))?.focus();});document.body.append(d);d.showModal();$('input',d).focus();$('input',d).select();
}
function wallDimensions(){
 const api=window.MIRCalepinageWorkspace,strip=$('.mir-workspace-dimensions');
 if(!api||!mounted||!strip)return;
 const {zone}=api.getState();
 for(const key of ['width','height','projection']){
  const b=$('[data-wall-dimension="'+key+'"]',strip);
  const value=key==='projection'?zone.meta.projection:zone.values[key];
  b.textContent=({width:'A · Largeur',height:'B · Hauteur',projection:'C · Projection'}[key])+' '+(value?value+' po':'à préciser');
 }
 wallDrawing();
}
function wallDrawing(){
 const strip=$('.mir-workspace-dimensions');
 if(!strip)return;
 for(const key of ['width','height']){
  $('[data-wall-dimension="'+key+'"]',strip).hidden=Boolean($('#layout-svg [data-wall-dimension="'+key+'"]'));
 }
 const selection=$('#layout-svg [data-piece][aria-pressed="true"]');
 const piece=$('.mir-wall-current-piece',strip);
 piece.hidden=!selection;
 if(selection){
  const label=selection.getAttribute('aria-label').replace(', ',' · ');
  if(piece.textContent!==label)piece.textContent=label;
 }
}
function move(node,target){if(!node)return;const marker=document.createComment('MIR workspace return');node.before(marker);moves.push([node,marker]);target.append(node);}
function fold(parent,label,nodes){const d=document.createElement('details');d.innerHTML='<summary></summary>';$('summary',d).textContent=label;parent.append(d);for(const n of nodes)move(n,d);return d;}
function button(text,fn,cls=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.addEventListener('click',fn);return b;}
function viewport(){const v=visualViewport;document.documentElement.style.setProperty('--mir-viewport-height',(v?.height||innerHeight)+'px');document.documentElement.style.setProperty('--mir-viewport-top',(v?.offsetTop||0)+'px');}
function openInspector(target){if(!mounted)return;returnFocus=document.activeElement;root.dataset.inspector='open';$('#mir-workspace-settings').setAttribute('aria-expanded','true');
 if(target){for(const d of inspector.querySelectorAll('details'))if(d.contains(target))d.open=true;target.scrollIntoView({block:'nearest'});target.focus({preventScroll:true});}
 else $('#mir-inspector-title').focus({preventScroll:true});}
function closeInspector(){root.dataset.inspector='closed';$('#mir-workspace-settings').setAttribute('aria-expanded','false');if(compact())returnFocus?.focus({preventScroll:true});}
function continueWorkspace(){
 if(wall){openInspector($('#project-name'));return;}
 const api=window.MIRProductionWorkspace,s=api?.getLivePreviewState();
 if(s?.kind==='panel'||s?.editingItemId){if(api.saveCurrentPiece())window.MIRProcurementUI?.openCreate?.({newOrder:false});return;}
 if(s?.tool==='draw'&&!api?.finishFreeformTrace())return;
 api?.openContinueMenu();
}
function choose(){const d=document.createElement('dialog');d.className='mir-workspace-choice';d.innerHTML='<h2>Que voulez-vous dessiner ?</h2><p>Les pièces restent dans votre dossier.</p>';
 for(const [text,href,kind]of [['Dessiner un pliage','production.html','profile'],['Dessiner un panneau seul','production.html?kind=panel','panel'],['Dessiner un mur complet','calepinage.html','wall']])d.append(button(text,()=>{d.close();if(!wall&&kind!=='wall'){$('[data-kind="'+kind+'"]')?.click();}else location.href=href;}));
 d.append(button('Retour au dessin',()=>d.close()));d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();}
function make(){
 root=document.createElement('section');root.id='mir-workspace';root.setAttribute('aria-label','Atelier MIR');root.dataset.inspector='closed';
 context=document.createElement('nav');context.className='mir-step-indicator';context.setAttribute('aria-label','Étapes de travail');
 for(const [text,fn]of [['1 Choisir',choose],['2 Dessiner',closeInspector],['3 Vérifier',()=>openInspector(wall?$('#selection-title'):$('#production-dimensions'))],['4 Commander',continueWorkspace]])context.append(button(text,fn));
 const body=document.createElement('div');body.className='mir-workspace-body';
 stage=document.createElement('section');stage.className='mir-drawing-stage';stage.setAttribute('aria-label','Dessin et mesures');
 inspector=document.createElement('aside');inspector.id='mir-inspector';inspector.className='mir-inspector';inspector.setAttribute('aria-label','Réglages du dessin');
 const heading=document.createElement('div');heading.className='mir-inspector-heading';heading.innerHTML='<h2 id="mir-inspector-title" tabindex="-1">Mesures et réglages</h2>';
 heading.append(button('Fermer',closeInspector));inspector.append(heading);
 const content=document.createElement('div');content.className='mir-inspector-content';inspector.append(content);
 actions=document.createElement('footer');actions.className='mir-action-bar';
 const settings=button('Mesures · Côtés',()=>root.dataset.inspector==='open'?closeInspector():openInspector());settings.id='mir-workspace-settings';settings.setAttribute('aria-controls','mir-inspector');settings.setAttribute('aria-expanded','false');
 actions.append(button('← Choisir',choose),settings,button(wall?'Sauvegarder':'Enregistrer',()=>wall?$('#export-json')?.click():window.MIRProductionWorkspace?.saveCurrentPiece(),'mir-workspace-save'),button('Continuer →',continueWorkspace,'mir-workspace-primary'));
 body.append(stage,inspector);root.append(context,body,actions);document.body.append(root);
 root.addEventListener('keydown',e=>{const key=e.target.closest('svg [data-wall-dimension]')?.dataset.wallDimension;if(key&&['Enter',' '].includes(e.key)){e.preventDefault();dimension(key);return;}if(e.key==='Escape'&&root.dataset.inspector==='open'){e.preventDefault();closeInspector();}});
 root.addEventListener('click',e=>{const key=e.target.closest('svg [data-wall-dimension]')?.dataset.wallDimension;if(key){e.preventDefault();e.stopPropagation();dimension(key);}});
 root.addEventListener('pointerdown',e=>{if(e.target.closest('svg [data-wall-dimension]'))e.stopPropagation();},true);
 inspector.addEventListener('focusin',()=>{if(compact()&&root.dataset.inspector!=='open')openInspector();});
 return content;
}
function mount(){if(mounted)return;mounted=true;const content=make();
 // These are alternative layout owners, not a stack of competing overrides.
 const obsolete=wall?['calepinage.css','mir-panel-po-journey.css','mir-calepinage-mobile.css']:['production-admin-v4.css','mir-freeform-workshop.css','mir-panel-admin.css','mir-panel-workbench.css'];
 sheets=[...document.querySelectorAll('link[rel="stylesheet"]')].filter(l=>obsolete.some(f=>l.getAttribute('href').split('?')[0]===f)).map(l=>[l,l.media]);for(const [l]of sheets)l.media='not all';
 document.body.dataset.mirWorkspace=wall?'wall':'piece';
 if(wall){
  move($('.canvas-card'),stage);move($('#calculation-errors'),stage);move($('#calculation-warnings'),stage);
  const originalTools=$('.drawing-toolbar'),compactTools=document.createElement('div');compactTools.className='drawing-toolbar';$('.canvas-card').append(compactTools);
  for(const s of ['#select-tool','#draw-outline','#zoom-out','#zoom-value','#zoom-in','#zoom-reset'])move($(s),compactTools);
  $('#draw-outline').textContent='Tracer';fold(content,'Outils de dessin et plan PDF',[originalTools]);
  move($('.project-bar'),content);move($('.settings'),content);move($('.inspector'),content);move($('.production-section'),content);
  for(const s of ['#layout-summary','.proof-card','.wall-measures','.intro-side'])move($(s),content);
  fold(content,'Pièce sélectionnée · mesures et angles',[$('.inspector',content)]);
  fold(content,'Commander · chantier et fabrication',[$('.production-section',content)]);
  const confirmed=$('#dimensions-confirmed')?.closest('label');if(confirmed)move(confirmed,$('.production-section',content));
  fold(content,'Dossier · zones et exemples',[$('.project-bar',content),$('.intro-side',content)]);
  fold(content,'Vérification du mur',[$('#layout-summary',content),$('.proof-card',content),$('.wall-measures',content)]);
  fold($('.settings',content),'Réglages avancés de répartition',[$('#distribution')?.closest('label'),$('#precision')?.closest('label'),$('#redistribute'),$('#unlock-all')]);
  const dims=document.createElement('div');dims.className='mir-workspace-dimensions';for(const key of ['width','height','projection']){const b=button('',()=>dimension(key));b.dataset.wallDimension=key;dims.append(b);}const piece=button('',()=>openInspector($('#selection-title')),'mir-wall-current-piece');piece.hidden=true;dims.prepend(piece);stage.append(dims);wallDimensions();
 }else{
  move($('#production-preview'),stage);move($('.config-card'),content);move($('.kind-bar'),content);move($('.mir-v4-technical'),content);
  const tools=document.createElement('div');tools.className='mir-workspace-tools';
  for(const [text,attr]of [['↶ Annuler','freeformUndo'],['↷ Refaire','freeformRedo'],['Terminer le tracé','freeformFinish']]){const b=button(text,()=>{});b.dataset[attr]='';tools.append(b);}
  tools.dataset.workspaceProfileTools='';$('#production-preview').append(tools);
  const advanced=document.createElement('details');advanced.innerHTML='<summary>Outils de tracé et retouche</summary>';content.append(advanced);move($('#drawing-tools'),advanced);
  // Name and detailed list remain reachable in the inspector, freeing the canvas.
  for(const s of ['#mir-piece-name-field','#profile-dimension-list','#production-validation','#production-note']){const n=$(s);if(n&&s!=='#production-note')move(n,content);}
  move($('#mir-panel-direct-tools'),content);
  const publishing=document.createElement('details');publishing.innerHTML='<summary>Modèle, boutique et magasin</summary>';content.append(publishing);
  move($('#mir-freeform-destination'),publishing);move($('#mir-v4-sheet-total'),publishing);
 }
 const shortTools=document.createElement('details');shortTools.innerHTML='<summary>Zoom et outils du dessin</summary>';content.append(shortTools);
 const adaptive=wall?$('.canvas-card>.drawing-toolbar'):$('#drawing-navigation');
 if(adaptive){const marker=document.createComment('MIR outils selon hauteur');adaptive.before(marker);adapted.push([adaptive,marker,shortTools]);}
 adaptiveTools();viewport();syncTitle();
}
function unmount(){if(!mounted)return;mounted=false;for(const [node,marker]of adapted)marker.replaceWith(node);adapted=[];$('[data-workspace-profile-tools]')?.remove();for(const [node,marker]of moves.reverse()){marker.replaceWith(node);}moves=[];for(const [l,media]of sheets)l.media=media;sheets=[];root.remove();delete document.body.dataset.mirWorkspace;}
function syncTitle(){if(!mounted)return;const s=window.MIRProductionWorkspace?.getLivePreviewState(),title=$('.mir-harmony-title');if(title)title.textContent=wall?'Mur complet':s?.kind==='panel'?'Panneaux':'Pliage';const picker=$('.mir-v4-picker-label');if(picker)picker.textContent=s?.kind==='panel'?'Forme : ':'Profil : ';
 fitProfileViewport(s);
 const tools=$('[data-workspace-profile-tools]');if(tools){tools.hidden=false;tools.querySelector('[data-freeform-undo]').disabled=!s?.canUndo;tools.querySelector('[data-freeform-redo]').disabled=!s?.canRedo;tools.querySelector('[data-freeform-finish]').hidden=s?.kind!=='profile';tools.querySelector('[data-freeform-finish]').disabled=s?.tool!=='draw'||!s?.model.valid;}}
function sync(){if(wall){mount();return;}
 const s=window.MIRProductionWorkspace?.getLivePreviewState(),b=document.body;
 const reviewingImport=new URLSearchParams(location.search).get('destination')==='bon'&&!!$('#create-panel-po,#open-panel-po');
 const active=s&&!s.authoring&&!reviewingImport&&b.dataset.mirTab==='draw'&&!b.classList.contains('mir-v4-dossier-open')&&!b.classList.contains('mir-v4-secondary-view');
 if(active)mount();else unmount();syncTitle();
}
function init(){if(!wall&&!window.MIRProductionWorkspace)return;sync();new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class','data-mir-tab']});
 if(wall){addEventListener('mir-calepinage-ready',wallDimensions);addEventListener('mir-calepinage-rendered',wallDimensions);addEventListener('mir-calepinage-drawn',wallDrawing);}
 if(!wall)new MutationObserver(syncTitle).observe($('#production-drawing'),{childList:true});
 addEventListener('resize',()=>{viewport();adaptiveTools();if(mounted&&!compact())closeInspector();});visualViewport?.addEventListener('resize',viewport);visualViewport?.addEventListener('scroll',viewport);
 document.addEventListener('focusin',e=>{if(mounted&&inspector.contains(e.target)&&compact())root.dataset.inspector='open';});
 window.MirWorkspace=Object.freeze({openInspector,closeInspector,sync,get active(){return mounted;}});
}
if(wall){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();}
else if(window.MIRProductionWorkspace)init();else addEventListener('mir-production-ready',init,{once:true});
})();
