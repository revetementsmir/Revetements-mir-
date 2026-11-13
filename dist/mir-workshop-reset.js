/* MIR — Remise à zéro locale de l'atelier. Aucune suppression serveur ou distante. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){
    root.MIRWorkshopReset=api;
    const boot=()=>api.init(root);
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
})(typeof window==='object'?window:null,function(){
  'use strict';
  const SCHEMA='mir-workshop-reset-backup-v1';
  const GROUPS=Object.freeze([
    {id:'models',label:'Mes moulures et modèles enregistrés',desc:'Profils personnalisés, versions et tarifs locaux.',keys:['mir_production_templates_v1'],selected:true},
    {id:'work',label:'Dossier de pliage en cours (Admin)',desc:'Pièces et brouillon de production de cet appareil.',keys:['mir_production_admin_dossier_v1'],selected:true},
    {id:'quick',label:'Liste du configurateur rapide',desc:'Pièces sauvegardées dans la page Pliage classique.',keys:['mir-bending-v1'],selected:true},
    {id:'requests',label:'Demandes préparées',desc:'Demandes clients locales en attente, à préserver si utilisées.',keys:['mir_production_requests_v1'],selected:false},
    {id:'other',label:'Dossiers client et magasin employés',desc:'Dossiers locaux dans les parcours client et magasin.',keys:['mir_production_client_dossier_v1','mir_production_employee_dossier_v1'],selected:false},
    {id:'orders',label:'Bons de commande archivés',desc:'Anciens bons de production et bons fournisseurs; les coordonnées fournisseurs restent conservées.',keys:['mir_production_admin_orders_v1','mir_admin_procurement_v1'],selected:false}
  ]);
  const getGroup=id=>GROUPS.find(g=>g.id===id);
  const select=(ids)=>[...new Set(ids||[])].map(getGroup).filter(Boolean);
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function scopeKeys(ids){return [...new Set(select(ids).flatMap(g=>g.keys))];}
  function snapshot(storage,ids){
    const entries={};
    for(const key of scopeKeys(ids)){
      const raw=storage.getItem(key);
      if(raw!==null)entries[key]=raw;
    }
    return entries;
  }
  function tally(raw){
    if(raw===null)return 0;
    try{
      const data=JSON.parse(raw);
      if(Array.isArray(data))return data.length;
      if(Array.isArray(data?.records))return data.records.length;
      if(Array.isArray(data?.requests))return data.requests.length;
      if(Array.isArray(data?.orders))return data.orders.length;
      if(Array.isArray(data?.items))return data.items.length;
      if(Array.isArray(data?.order?.items))return data.order.items.length;
      return 1;
    }catch{return 1;}
  }
  function preview(storage,ids){
    return select(ids).map(group=>{
      const info=group.keys.map(key=>{const raw=storage.getItem(key);return {key,present:raw!==null,count:tally(raw)};});
      return {id:group.id,label:group.label,stored:info.filter(x=>x.present).length,entries:info.reduce((n,x)=>n+x.count,0)};
    });
  }
  function backup(storage,ids){
    const picked=select(ids);
    if(!picked.length)throw new Error('Sélectionnez au moins une catégorie.');
    return {schema:SCHEMA,exportedAt:new Date().toISOString(),origin:'Atelier MIR · sauvegarde locale de ce navigateur',groups:picked.map(g=>g.id),entries:snapshot(storage,ids)};
  }
  function clear(storage,ids){
    const groups=select(ids),keys=scopeKeys(ids);
    if(!keys.length)return {ok:false,error:'Choisissez ce que vous voulez vider.'};
    let original;
    try{original=snapshot(storage,ids);}catch{return {ok:false,error:'Impossible de lire le stockage local.'};}
    let savedProcurement=null;
    if(keys.includes('mir_admin_procurement_v1')&&original.mir_admin_procurement_v1!=null){
      try{
        savedProcurement=JSON.parse(original.mir_admin_procurement_v1);
        if(!savedProcurement||Array.isArray(savedProcurement)||typeof savedProcurement!=='object'||!Array.isArray(savedProcurement.suppliers)||!Array.isArray(savedProcurement.orders))throw Error();
      }catch{return {ok:false,error:'Le fichier fournisseurs est illisible; aucune suppression effectuée.'};}
    }
    try{
      for(const key of keys){
        if(key==='mir_admin_procurement_v1'&&savedProcurement){
          storage.setItem(key,JSON.stringify({...savedProcurement,orders:[]}));
        }else storage.removeItem(key);
      }
    }catch{
      // Plusieurs clés localStorage ne forment pas une transaction. Restaurer si possible.
      let restored=true;
      for(const key of keys){try{if(Object.prototype.hasOwnProperty.call(original,key))storage.setItem(key,original[key]);else storage.removeItem(key);}catch{restored=false;}}
      return {ok:false,error:restored?'Le nettoyage a échoué; les données d’origine ont été restaurées.':'Nettoyage interrompu : vérifiez la sauvegarde et rechargez la page.',restored};
    }
    return {ok:true,groups:groups.map(g=>g.id),keys:keys.length,suppliersPreserved:true};
  }
  function init(win){
    const doc=win.document,form=doc.querySelector('#mir-reset-form');
    if(!form)return;
    const storage=win.localStorage,choices=doc.querySelector('#mir-reset-choices'),feedback=doc.querySelector('#mir-reset-feedback'),go=doc.querySelector('#mir-reset-confirm'),exportButton=doc.querySelector('#mir-reset-export');
    choices.innerHTML=GROUPS.map(g=>'<label class="mir-reset-option"><input type="checkbox" name="scope" value="'+escape(g.id)+'"'+(g.selected?' checked':'')+'><span><strong>'+escape(g.label)+'</strong><small>'+escape(g.desc)+'</small><em data-reset-count="'+escape(g.id)+'">Chargement…</em></span></label>').join('');
    const selected=()=>Array.from(form.querySelectorAll('input[name="scope"]:checked'),x=>x.value);
    function refresh(){
      try{
        const totals=preview(storage,GROUPS.map(x=>x.id));
        for(const row of totals){const node=doc.querySelector('[data-reset-count="'+row.id+'"]');if(node)node.textContent=row.stored?'Éléments enregistrés dans ce navigateur : '+row.entries:'Aucune donnée enregistrée';}
        const enabled=selected().length>0;go.disabled=!enabled;exportButton.disabled=!enabled;
      }catch(error){feedback.textContent='Stockage local inaccessible sur cet appareil : '+error.message;go.disabled=exportButton.disabled=true;}
    }
    form.addEventListener('change',refresh);
    exportButton.addEventListener('click',()=>{
      let payload;
      try{payload=backup(storage,selected());}catch(error){feedback.textContent=error.message;return;}
      const blob=new win.Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=win.URL.createObjectURL(blob),anchor=doc.createElement('a');
      anchor.href=url;anchor.download='MIR-sauvegarde-atelier-'+new Date().toISOString().slice(0,10)+'.json';
      doc.body.append(anchor);anchor.click();anchor.remove();
      win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);
      feedback.textContent='Copie locale préparée. Vérifiez le téléchargement avant de vider les données.';
    });
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const ids=selected(),labels=select(ids).map(g=>g.label).join('\n• ');
      if(!ids.length)return;
      if(!win.confirm('Vider dans CE navigateur :\n• '+labels+'\n\nCette action ne touche pas les autres appareils et ne peut pas être annulée sans sauvegarde. Les formes standards et les fournisseurs resteront disponibles.'))return;
      const result=clear(storage,ids);
      if(!result.ok){feedback.textContent=result.error;return;}
      feedback.textContent='Atelier remis à zéro sur cet appareil. '+ids.length+' catégorie(s) traitée(s).';
      doc.querySelector('#mir-reset-success').hidden=false;
      form.hidden=true;
    });
    refresh();
  }
  return Object.freeze({SCHEMA,GROUPS,scopeKeys,preview,backup,clear,init});
});
