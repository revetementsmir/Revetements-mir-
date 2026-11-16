/* Shared import/project review; all source images stay in this browser. */
(function(root){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const english={
    'Choisissez le bâtiment à travailler':'Choose the building to work on','Choisir le bâtiment':'Choose a building',
    'Bâtiment à confirmer':'Building to confirm','Maison':'House','Cabanon':'Shed','Bâtiment':'Building',
    'Bâtiment et vues':'Building and views','Toutes les vues du PDF':'All PDF views','À confirmer':'To confirm',
    'Niveau':'Floor','Direction':'Direction','Avant':'Front','Droite':'Right','Arrière':'Rear','Gauche':'Left',
    'Cette vue montre':'This view shows','Élévation':'Elevation','Plan d’un niveau':'Floor plan','Fondations':'Foundations','Toiture':'Roof','Coupe':'Section','Autre document':'Other document',
    'RDC':'Ground floor','Étage':'Upper floor','Sous-sol':'Basement','Ajouter un bâtiment':'Add a building','Nom du bâtiment':'Building name',
    'Cette dimension reste à confirmer':'This dimension still needs confirmation',
    'Ce plan montre l’étage':'This plan shows the upper floor',
    'Plusieurs vues dans cette direction : choisissez celle à afficher':'Multiple views in this direction: choose one to display',
    'Vue à confirmer':'View to confirm','Contenu conservé sur cet appareil.':'Content kept on this device.'
  };
  const t=s=>root.MIRClientLocale?.getLocale()==='en-CA'?(english[s]||s):s;
  function mount(container,inventory,onChange){
    const I=root.MIRViewInventory;
    function options(rows,value){return rows.map(([id,name])=>`<option value="${esc(id)}"${(value||'')===id?' selected':''}>${esc(t(name))}</option>`).join('');}
    function render(){
      const buildingRows=[['','À confirmer'],...inventory.buildings.map(b=>[b.id,b.name])];
      const active=inventory.activeBuildingId;
      container.innerHTML=`<div class="mir-view-review"><label>${t('Choisissez le bâtiment à travailler')}<select data-active-building>${options([['','Choisir le bâtiment'],...buildingRows.slice(1)],active)}</select></label>
        <div class="mir-view-slots">${['front','right','back','left'].map(direction=>{
          const views=I.candidates(inventory,active,direction);
          if(views.length<2)return '';
          return `<label>${t({front:'Avant',right:'Droite',back:'Arrière',left:'Gauche'}[direction])} · ${t('Plusieurs vues dans cette direction : choisissez celle à afficher')}<select data-slot="${direction}">${options([['','Vue à confirmer'],...views.map(v=>[v.id,v.payload.name+' · p. '+v.page])],inventory.rendererSelections[active]?.[direction])}</select></label>`;
        }).join('')}</div>
        <details><summary>${t('Toutes les vues du PDF')} (${inventory.views.length})</summary><button type="button" data-add-building>${t('Ajouter un bâtiment')}</button>${inventory.buildings.map(b=>`<label>${t('Nom du bâtiment')}<input data-building-name="${esc(b.id)}" value="${esc(t(b.name))}" maxlength="80"></label>`).join('')}<div class="mir-view-list">${inventory.views.map(v=>`<fieldset data-source-view="${esc(v.id)}"><legend>${esc(v.payload.name)} · p. ${v.page}</legend>
          <img src="${esc(v.payload.sourceImage||'')}" alt="${esc(v.payload.name)}" loading="lazy">
          ${v.levelId==='upper'?`<p>${t('Ce plan montre l’étage')}</p>`:''}
          <label>${t('Cette vue montre')}<select data-view-kind="${esc(v.id)}">${options([['elevation','Élévation'],['floor','Plan d’un niveau'],['foundation','Fondations'],['roof','Toiture'],['section','Coupe'],['reference','Autre document']],v.kind)}</select></label>
          <label>${t('Bâtiment')}<select data-view-building="${esc(v.id)}">${options(buildingRows,v.buildingId)}</select></label>
          <label>${t('Niveau')}<select data-view-level="${esc(v.id)}">${options([['','À confirmer'],['ground','RDC'],['upper','Étage'],['basement','Sous-sol'],...Array.from({length:20},(_,i)=>['level-'+i,String(i)])],v.levelId)}</select></label>
          ${v.kind==='elevation'||v.kind==='reference'?`<label>${t('Direction')}<select data-view-direction="${esc(v.id)}">${options([['','À confirmer'],['front','Avant'],['right','Droite'],['back','Arrière'],['left','Gauche']],v.direction)}</select></label>`:''}
          ${!v.calibration.referenceFt||['conflict','low_confidence'].includes(v.calibration.status)?`<p>${t('Cette dimension reste à confirmer')}</p>`:''}
        </fieldset>`).join('')}</div></details><p>${t('Contenu conservé sur cet appareil.')}</p></div>`;
      container.querySelector('[data-active-building]').onchange=e=>{inventory.activeBuildingId=e.target.value||null;changed();};
      container.querySelectorAll('[data-building-name]').forEach(input=>input.onchange=()=>{const name=input.value.trim();if(name)inventory.buildings.find(b=>b.id===input.dataset.buildingName).name=name;changed();});
      container.querySelector('[data-add-building]').onclick=()=>{
        const id='building-'+crypto.randomUUID();inventory.buildings.push({id,name:t('Bâtiment')+' '+(inventory.buildings.length+1),status:'user-added',contours:[],wallPlanes:[]});changed();
      };
      for(const [attribute,field] of [['building','buildingId'],['level','levelId'],['direction','direction'],['kind','kind']])
        container.querySelectorAll('[data-view-'+attribute+']').forEach(select=>select.onchange=()=>{
          const view=inventory.views.find(v=>v.id===select.getAttribute('data-view-'+attribute));
          view[field]=select.value||null;view.associationStatus='confirmed';
          (view.associations||={})[attribute]=select.value?'confirmed':'unresolved';
          if(field==='direction'&&view.direction)view.kind='elevation';
          I.refresh(inventory);changed();
        });
      container.querySelectorAll('[data-slot]').forEach(select=>select.onchange=()=>{
        (inventory.rendererSelections[active]||={})[select.dataset.slot]=select.value||null;changed();
      });
    }
    function changed(){const open=container.querySelector('details')?.open;render();container.querySelector('details').open=open;onChange?.();}
    render();return {render};
  }
  root.MIRViewReview=Object.freeze({mount,t});
})(window);
