/* The existing product controls, moved beside the model for one reversible choice. */
(function(root){
 'use strict';
 root.MIRClientPreviewUI={setup(api){
  const box=document.createElement('section');box.id='mir-client-choice';box.hidden=true;box.setAttribute('role','region');box.setAttribute('aria-label','Aperçu de la sélection');
  box.innerHTML='<header><strong id="mir-choice-name"></strong><button id="mir-choice-close" type="button" aria-label="Fermer / Close">×</button></header><label id="mir-choice-scope-label"></label><select id="mir-choice-scope"></select><p id="mir-choice-status" role="status"></p><div id="mir-choice-content"></div><footer><button id="mir-choice-cancel" type="button"></button><button id="mir-choice-confirm" type="button" class="primary"></button></footer>';
  document.querySelector('#workspace').append(box);
  const $=s=>box.querySelector(s),parked=new Map(),en=()=>root.MIRClientLocale?.getLocale()==='en-CA';let initiator=null;
  function restore(){for(const [node,mark]of parked){mark.replaceWith(node);}parked.clear();}
  function move(id){const node=document.getElementById(id);if(!node)return;const mark=document.createComment('MIR choice controls');node.before(mark);parked.set(node,mark);$('#mir-choice-content').append(node);}
  function cancel(){api.cancel();initiator?.focus?.({preventScroll:true});}
  $('#mir-choice-close').onclick=cancel;$('#mir-choice-cancel').onclick=cancel;
  $('#mir-choice-confirm').onclick=async()=>{try{await api.confirm();initiator?.focus?.({preventScroll:true});}catch(e){$('#mir-choice-status').textContent=e.message;}};
  $('#mir-choice-scope').onchange=e=>api.scope(e.target.value);
  document.addEventListener('keydown',e=>{if(!box.hidden&&e.key==='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();cancel();}});
  root.addEventListener('popstate',()=>{if(!box.hidden)cancel();});
  function render(target){
   restore();const opening=!!target;box.hidden=!opening;document.body.classList.toggle('mir-client-preview-active',opening);if(!target)return;
   if(!initiator||!box.contains(document.activeElement))initiator=document.activeElement;
   box.setAttribute('aria-label',en()?'Selection preview':'Aperçu de la sélection');$('#mir-choice-name').textContent=target.name||target.kind;
   $('#mir-choice-cancel').textContent=en()?'Cancel':'Annuler';$('#mir-choice-confirm').textContent=en()?'Confirm':'Confirmer';
   $('#mir-choice-scope-label').textContent=en()?'Apply to':'Appliquer à';
   const scopes=api.scopes(target),select=$('#mir-choice-scope');select.replaceChildren(...scopes.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));select.value=target.scope;
   select.hidden=scopes.length<2;$('#mir-choice-scope-label').hidden=select.hidden;
   $('#mir-choice-status').textContent=(en()?'Preview · ':'Aperçu · ')+api.count(target)+(en()?' selected. Confirm to save.':' sélection(s). Confirmez pour enregistrer.');
   for(const id of api.panels(target))move(id);
  }
  return {render,restore,element:box};
 }};
})(window);
