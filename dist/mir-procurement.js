/* MIR — Admin pliage : fournisseurs et bons d'achat. Sans serveur d'envoi.
   Le dossier de production courant reste la source de vérité des pièces.
   Une adresse publique n'est jamais automatiquement autorisée pour l'envoi. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.MIRProcurement = api;
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { api.init(root); }, {once:true});
    else api.init(root);
  }
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  const KEY='mir_admin_procurement_v1', DRAFT='mir_production_admin_dossier_v1', MODEL_KEY='mir_production_templates_v1', VERSION=1;
  const SOURCES=[
    {id:'unico',name:'Unico Revêtement Métallique',email:'commande@unicorevetement.com',phone:'418-827-5588',address:'5, rue Industrielle, Beaupré (Québec) G0A 1E0',website:'https://unicorevetement.com/contact',source:'https://www.unicorevetement.com/contact',note:'Courriel commande indiqué sur le site officiel; confirmer le destinataire avant un premier envoi.'},
    {id:'breton',name:'Breton Revêtements Métalliques',email:'info@bretonrm.com',phone:'418-475-9999',address:'110, rue des Entreprises, Saint-Bernard (Québec) G0S 2G0',website:'https://bretonrevetements.com',source:'https://aeclafontaine.ca/images/Magazine_partenaires_edition_2022.pdf',note:'Courriel publié en 2022, À RECONFIRMER; adresse et téléphone recensés par la municipalité de Saint-Bernard.'},
    {id:'alnordica',name:'Moulures Alnordica',email:'info@mouluresalnordica.com',phone:'418-889-9761',address:'219, rue Léon-Vachon, Saint-Lambert-de-Lauzon (Québec) G0S 2W0',website:'https://mouluresalnordica.com',source:'https://regionlotbiniere.com/entreprises/moulures-alnordica/',note:'Coordonnées de sources publiques discordantes (103 route du Parc, 1230 des Érables et 219 Léon-Vachon). Adresse de livraison/contact et courriel À RECONFIRMER.'},
    {id:'pliage-quebec',name:'Pliage Québec',email:'info@pliagequebec.com',phone:'418-682-8653',address:'1023, rue Rivard, Québec (Québec) G1M 3G8',website:'https://pliagequebec.com',source:'https://www.pagesjaunes.ca/bus/Quebec/Quebec/Pliage-Quebec/101928222.html',note:'Courriel dans PagesJaunes; à confirmer auprès du fournisseur avant premier envoi.'}
  ];
  const safe=(v,max=500)=>String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  const esc=v=>safe(v,4000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mailValid=email=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(safe(email,254));

  // Tarifs de vente de la longueur 10 pi uniquement. L'enregistrement local n'est
  // jamais une publication multiu​tilisateur ou un prix de commande rétroactif.
  function parsePrice(value) {
    const normalized=String(value??'').trim().replace(',','.');
    if(!normalized)return null;
    if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(normalized))return NaN;
    const parts=normalized.split('.'),cents=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
    return Number.isSafeInteger(cents)&&cents>0&&cents<=10000000?cents:NaN;
  }
  const priceLabel=cents=>Number.isSafeInteger(cents)?(cents/100).toFixed(2).replace('.',',')+' $ CA':'Prix à définir';
  function commercialUpdate(record,values={}) {
    const status=values.action==='published'?'published':'draft',prices={},errors=[];
    for(const metal of ['aluminium','acier']){
      const parsed=parsePrice(values[metal]);
      if(Number.isNaN(parsed))errors.push('Prix '+metal+' invalide : utilisez un montant positif avec deux décimales maximum.');
      else if(parsed!==null)prices[metal]=parsed;
    }
    const metals=(Array.isArray(record?.allowed?.materials)?record.allowed.materials:['aluminium','acier']).filter(m=>m==='aluminium'||m==='acier');
    if(status==='published'&&record?.archived!==false)errors.push('Ce modèle est archivé : impossible de le rendre disponible.');
    if(status==='published'&&metals.some(m=>!Number.isSafeInteger(prices[m])))errors.push('Renseignez le tarif de chaque métal autorisé avant la mise en boutique locale.');
    if(status==='published'&&!metals.length)errors.push('Ce modèle ne propose ni aluminium ni acier avec un tarif de 10 pi.');
    if(errors.length)return {ok:false,errors};
    const next={...record,channels:{...record.channels,client:status==='published',store:values.store===true,po:values.po===true},
      commercial:{status,lengthIn:120,currency:'CAD',priceCentsByMetal:prices,conditions:safe(values.conditions,600),updatedAt:values.now||new Date().toISOString()}};
    return {ok:true,record:next};
  }
  const seed=()=>SOURCES.map(x=>Object.assign({verified:false,archived:false,terms:'',contact:''},x));
  function normalizeSupplier(input) {
    const s=input||{};
    return {id:safe(s.id,80),name:safe(s.name,160),email:safe(s.email,254),phone:safe(s.phone,60),
      address:safe(s.address,360),website:safe(s.website,300),source:safe(s.source,300),
      note:safe(s.note,800),terms:safe(s.terms,300),contact:safe(s.contact,150),
      verified:s.verified===true,archived:s.archived===true};
  }
  function mergeSuppliers(existing) {
    const indexed=new Map((Array.isArray(existing)?existing:[]).filter(x=>x&&x.id).map(x=>[x.id,normalizeSupplier(x)]));
    for(const source of seed()) if(!indexed.has(source.id)) indexed.set(source.id,normalizeSupplier(source));
    return [...indexed.values()];
  }
  function readState(storage) {
    let old={};
    try{old=JSON.parse(storage.getItem(KEY)||'{}')||{};}catch{}
    return {...old,version:VERSION,suppliers:mergeSuppliers(old.suppliers),orders:Array.isArray(old.orders)?old.orders:[]};
  }
  function getDossier(storage) {
    try{
      const row=JSON.parse(storage.getItem(DRAFT)||'null');
      return row&&row.version===1&&Array.isArray(row.order?.items)?row.order:null;
    }catch{return null;}
  }
  function validatePo(draft,supplier,dossier,modelAPI,{draftOnly=false}={}) {
    const errors=[];
    if(!supplier||supplier.archived) errors.push('Choisir un fournisseur actif.');
    if(!supplier?.verified) errors.push('Vérifier le courriel du fournisseur et confirmer sa fiche.');
    if(!mailValid(supplier?.email||'')) errors.push('Adresse courriel du fournisseur invalide.');
    if(!safe(draft?.poNumber,100)) errors.push('Inscrire le numéro de bon de commande.');
    if(!safe(draft?.job,160)) errors.push('Inscrire le nom ou numéro du chantier.');
    if(!safe(draft?.shipTo,360)) errors.push("Inscrire l'adresse de livraison ou de cueillette.");
    if(!dossier||!dossier.items?.length) errors.push('Ajouter des panneaux ou moulures dans le dossier avant de créer le bon.');
    for(const item of dossier?.items||[]){
      const kind=item?.spec?.kind||item?.kind,label=safe(item?.id,80)||'sans repère';
      if(!['panel','profile'].includes(kind)){errors.push('Type de pièce inconnu pour '+label+'.');continue;}
      if(!Number.isInteger(Number(item?.spec?.quantity))||Number(item.spec.quantity)<1)errors.push('Quantité invalide pour '+label+'.');
      if(!modelAPI?.buildPanel||!modelAPI?.buildProfile){errors.push('Moteur de fabrication non chargé.');continue;}
      try{
        const m=kind==='panel'?modelAPI.buildPanel(item.spec):modelAPI.buildProfile(item.spec);
        if(!m.valid)errors.push('Géométrie ou cotes invalides pour '+label+'.');
        else if(!draftOnly&&!m.complete)errors.push('Cotes, lèvres, projection, métal ou couleur incomplets pour '+label+'.');
      }catch{errors.push('Impossible de vérifier la géométrie de '+label+'.');}
    }
    return errors;
  }
  function createPo(draft,supplier,dossier) {
    const now=new Date().toISOString(), copy=x=>JSON.parse(JSON.stringify(x));
    return {id:'MIR-PO-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
      version:1,revision:1,status:'brouillon',createdAt:now,updatedAt:now,
      poNumber:safe(draft.poNumber,100),job:safe(draft.job,160),foreman:safe(draft.foreman,150),
      shipTo:safe(draft.shipTo,360),requestedDate:safe(draft.requestedDate,20),terms:safe(draft.terms,300),
      notes:safe(draft.notes,800),supplier:copy(normalizeSupplier(supplier)),sourceDossierId:safe(dossier.id,140),
      items:copy(dossier.items),events:[{type:'création-brouillon',at:now}]};
  }
  const moneyLabel=po=>po?.items?.length+' référence(s) de fabrication';
  function mailtoDraft(po) {
    const subject='MIR | Bon de commande '+po.poNumber+' | '+po.job;
    const items=po.items.map((i,n)=>{const s=i.spec||{},panel=s.kind==='panel',size=panel?'dimensions '+safe(s.width,32)+' × '+safe(s.height,32)+' '+(s.unit==='mm'?'mm':'po'):'longueur '+safe(s.length||120,30)+' po';return '  '+(n+1)+'. '+safe(i.id,40)+' '+safe(s.name||(panel?'Panneau':'Moulure'),100)+' — Qté '+safe(s.quantity||1,20)+' — '+size;}).join('\n');
    const body='Bonjour,\n\nVeuillez trouver notre bon de commande de pièces sur mesure.\n'
      +'Bon : '+po.poNumber+'\nChantier : '+po.job+'\nResponsable : '+(po.foreman||'À préciser')
      +'\nLivrer à : '+po.shipTo+'\nDate souhaitée : '+(po.requestedDate||'À confirmer')
      +'\nConditions : '+(po.terms||'À confirmer')+'\n\n'+items
      +'\n\nNOTA : JOINDRE LE PDF COTÉ avant d’envoyer le courriel.\n'
      +'Merci de confirmer les prix, couleurs, calibres et la date de fabrication.\n\nLes Revêtements MIR';
    return 'mailto:'+encodeURIComponent(po.supplier.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  }
  function printHTML(po,modelAPI) {
    const hasPanels=po.items.some(i=>i?.spec?.kind==='panel'),title=hasPanels?'BON DE COMMANDE — PANNEAUX ET PLIAGES':'BON DE COMMANDE DE PLIAGE';
    const rows=po.items.map((i,n)=>{
      const spec=i.spec||{},panel=spec.kind==='panel';
      let m,svg='',measure='',face='',size='';
      try{
        m=panel?modelAPI.buildPanel(spec):modelAPI.buildProfile(spec);
        if(!m.valid)throw Error('Géométrie à corriger');
        svg=panel?modelAPI.panelSVG(spec,{width:620,height:260,legend:false,notes:false,header:false}):modelAPI.profileSVG(spec,{width:620,height:260,legend:false,notes:false,header:false});
        if(panel){
          size=modelAPI.formatMeasurement(m.widthMM,m.unit)+' × '+modelAPI.formatMeasurement(m.heightMM,m.unit);
          measure=m.edges.map(e=>e.name+' '+modelAPI.formatMeasurement(e.lengthMM,m.unit)+' / lip '+modelAPI.formatMeasurement(e.lipMM,m.unit)+' / angle '+Math.round(e.interiorAngleDeg*100)/100+'°').join(' · ');
        }else{
          measure=m.segments.map(s=>s.label+' = '+modelAPI.formatMeasurement(s.lengthMM,m.unit)).join(' · ');
          face=m.finishedSegmentSumMM!=null?modelAPI.formatMeasurement(m.finishedSegmentSumMM,'in'):'À confirmer';
        }
      }catch{svg='<p>Géométrie indisponible — ne pas mettre en fabrication.</p>';}
      const mat=safe(spec.material?.type,40),color=safe(spec.finish?.name||spec.finish?.code,100);
      return '<section class="piece"><h3>'+esc(i.id||'P'+(n+1))+' — '+esc(spec.name||(panel?'Panneau':'Moulure'))+'</h3><div class="draw">'+svg+'</div>'
       +(panel?'<p><b>Dimensions hors tout :</b> '+esc(size)+' · <b>Projection C :</b> '+esc(spec.relief||'À confirmer')+'</p><p><b>Chaque côté, lip et angle :</b> '+esc(measure)+'</p>':'<p>'+esc(measure)+'</p><p><b>Somme des côtés :</b> '+esc(face)+' (avant corrections de pliage, pas un développé de fabrication)</p>')
       +'<p><b>Matériau :</b> '+esc(mat)+' · <b>Couleur :</b> '+esc(color)+' · <b>Calibre :</b> '+esc(spec.material?.gauge||'À confirmer')+'</p>'
       +(panel?'<p><b>Perforation :</b> '+esc(spec.perforation?.enabled===true?'Oui':spec.perforation?.enabled===false?'Non':'À confirmer')+'</p>':'<p><b>Longueur finie :</b> '+esc(spec.length||'À confirmer')+' po</p>')
       +'<p><b>Quantité :</b> '+esc(spec.quantity||1)+'</p></section>';
    }).join('');
    return '<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><title>Bon MIR '+esc(po.poNumber)+'</title>'
      +'<style>body{font:14px/1.5 Arial,sans-serif;color:#263a2b;margin:24px;max-width:1000px}header{border-bottom:3px solid #28553a;padding-bottom:16px;margin-bottom:16px}h1{font-size:27px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}.piece{page-break-inside:avoid;border-top:1px solid #d5ddce;margin-top:20px}.draw svg{max-width:100%;max-height:220px}p{margin:6px 0}small{color:#5d6a60}@media print{body{margin:12mm}.piece{break-inside:avoid}}</style></head><body>'
      +'<header><strong>LES REVÊTEMENTS MIR</strong><h1>'+esc(title)+' — '+esc(po.poNumber)+'</h1><p>Révision '+po.revision+' · Statut '+esc(po.status)+'</p></header>'
      +'<div class="meta"><p><b>Fournisseur</b><br>'+esc(po.supplier.name)+'<br>'+esc(po.supplier.email)+'<br>'+esc(po.supplier.phone)+'</p>'
      +'<p><b>Chantier</b><br>'+esc(po.job)+'<br>Responsable : '+esc(po.foreman||'À préciser')+'</p>'
      +'<p><b>Livraison</b><br>'+esc(po.shipTo)+'<br>Souhaitée : '+esc(po.requestedDate||'À confirmer')+'</p>'
      +'<p><b>Conditions</b><br>'+esc(po.terms||'À confirmer')+'</p></div>'
      +'<p><b>Notes :</b> '+esc(po.notes||'Aucune')+'</p><h2>'+po.items.length+' référence(s)</h2>'+rows
      +'<footer><small>Dimensions de pièce finie. Le fournisseur doit confirmer le développé, les tolérances, les corrections de pliage, les matériaux, les prix et la faisabilité. Ce document ne prouve pas un envoi.</small></footer>'
      +'</body></html>';
  }
  function init(win) {
    if(new URLSearchParams(win.location.search).get('mode')==='client') return;
    const doc=win.document,main=doc.querySelector('#production-main');
    if(!main||!win.localStorage||doc.querySelector('#mir-procurement-tabs'))return;
    const W=win.MIRPOWorkflow;
    let stored=win.localStorage.getItem(KEY);
    let state=readState(win.localStorage),tab='draw',supplierEditing=null,pendingWorkflowObserver=null,poView='pending',panelFilter='',activePanelId=null;
    const ui={supplierId:'unico',poNumber:'',job:'',foreman:'',shipTo:'',requestedDate:'',terms:'',notes:'',...state.formDraft};
    let query='',filterDate='';
    function save(){try{if(win.localStorage.getItem(KEY)!==stored)throw Error('Le suivi a changé dans un autre onglet. Rechargez la page.');const raw=JSON.stringify(state);win.localStorage.setItem(KEY,raw);stored=raw;return true;}catch{win.alert('Sauvegarde impossible ou données modifiées dans un autre onglet. Rechargez avant de continuer.');return false;}}
    save();
    const tabs=doc.createElement('nav');tabs.id='mir-procurement-tabs';tabs.setAttribute('aria-label','Atelier MIR : dessins, modèles et bons fournisseur');
    tabs.innerHTML='<button type="button" data-mir-tab="draw">Créer</button><button type="button" data-mir-tab="panels">Panneaux</button><button type="button" data-mir-tab="models">Mes pliages</button><button type="button" data-mir-tab="boutique">Boutique</button><button type="button" data-mir-tab="store">Magasin employés</button><button type="button" data-mir-tab="orders">Bons de commande</button>';
    const panel=doc.createElement('section');panel.id='mir-procurement-panel';panel.hidden=true;
    main.insertBefore(tabs,main.firstChild);main.append(panel);doc.body.classList.add('mir-procurement-ready');
    const shortcuts=doc.createElement('div');shortcuts.id='mir-proc-shortcuts';shortcuts.innerHTML='<button type="button" data-mir-tab="draw">＋ Nouveau dessin</button>';
    tabs.after(shortcuts);
    const clearLink=doc.createElement('a');clearLink.href='vider-atelier.html';clearLink.className='mir-proc-reset-link';clearLink.textContent='Gérer les sauvegardes locales';tabs.insertAdjacentElement('afterend',clearLink);
    function currentOrder(){return getDossier(win.localStorage);}
    function sharedCatalogue(destination,label){return win.MIRSharedConfig?.enabled===true?'<p><a class="primary-button" href="espace-partage.html?destination='+destination+'">'+label+'</a></p>':'';}
    function populateOrder(){const o=currentOrder();if(o&&state.formSource!==o.id&&!state.editingId){ui.poNumber=o.poNumber||'';ui.job=o.project||'';ui.foreman=o.foreman||'';ui.requestedDate=o.date||'';state.formSource=o.id;}if(o){if(!ui.poNumber)ui.poNumber=o.poNumber||'';if(!ui.job)ui.job=o.project||'';if(!ui.foreman)ui.foreman=o.foreman||'';if(!ui.requestedDate)ui.requestedDate=o.date||'';}}
    function field(name,label,kind='text',extra='') {
      const value=ui[name]||'';
      return '<label class="mir-proc-field"><span>'+esc(label)+'</span><input type="'+kind+'" data-mir-po="'+name+'" value="'+esc(value)+'" '+extra+'></label>';
    }
    function supplierOptions(){return state.suppliers.filter(s=>!s.archived).map(s=>'<option value="'+esc(s.id)+'"'+(ui.supplierId===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('');}
    /* Le bon affiche une vue de chaque vraie pièce. Ni dessin ni prix ne sont
       recopiés dans un second configurateur ; le dossier reste la source. */
    function bonPieceCards(dossier){
      const items=(dossier?.items||[]).filter(item=>['profile','panel'].includes(item?.spec?.kind||item?.kind));
      if(!items.length)return '<div class="mir-po-empty"><strong>Ce bon attend ses pièces.</strong><p>Trace une moulure, dessine un panneau ou prépare une section entière de mur.</p><button type="button" data-mir-tab="draw">Retour à mon dessin</button></div>';
      return '<div class="mir-po-piece-list">'+items.map((item,index)=>{
        const spec=item.spec||{},api=win.MIRProduction,isPanel=spec.kind==='panel';
        let model=null,preview='',dimensions='',angles='',length='',color='',metal='',ready=false;
        try{
          model=isPanel?api?.buildPanel(spec):api?.buildProfile(spec);
          if(!model?.valid)throw Error('Géométrie incomplète');
          ready=Boolean(model.complete);
          preview=isPanel?api.panelSVG(spec,{width:580,height:250,legend:false,header:false,notes:false}):
            api.profileSVG(spec,{width:580,height:250,legend:false,header:false,notes:false});
          if(isPanel){
            dimensions='Hors tout '+api.formatMeasurement(model.widthMM,model.unit)+' × '+api.formatMeasurement(model.heightMM,model.unit);
            angles=(model.edges||[]).map((edge,i)=>(i+1)+' · '+esc(edge.name)+' : '+esc(api.formatMeasurement(edge.lengthMM,model.unit))+' · lip '+esc(api.formatMeasurement(edge.lipMM,model.unit))+' · '+esc(Math.round(edge.interiorAngleDeg*100)/100)+'°').join(' — ');
            length='Projection C : '+api.formatMeasurement(model.reliefMM,model.unit);
          }else{
            dimensions=model.segments.map(segment=>esc(segment.label)+' : '+esc(api.formatMeasurement(segment.lengthMM,model.unit))).join(' · ');
            angles=(model.bends||[]).map((bend,i)=>esc(model.segments[i]?.label||'')+'→'+esc(model.segments[i+1]?.label||'')+' : '+(bend.mode==='hem'?'180°':esc(Math.round(Number(bend.angle)*10)/10)+'°')).join(' · ');
            length='Longueur : '+api.formatMeasurement(model.lengthMM,model.unit);
          }
          metal=model.material?.type||spec.material?.type||'À confirmer';
          color=model.finish?.name||model.finish?.code||spec.finish?.name||spec.finish?.code||'À confirmer';
        }catch(error){preview='<p class="mir-po-piece-error">Géométrie à vérifier : retourne au dessin.</p>';}
        const quantity=Number.isInteger(Number(spec.quantity))&&Number(spec.quantity)>0?Number(spec.quantity):1;
        const summary=angles||'Côtés et angles à confirmer';
        return '<article class="mir-po-piece" data-mir-po-piece="'+esc(item.id)+'">'+
          '<div class="mir-po-piece-visual">'+preview+'</div>'+
          '<div class="mir-po-piece-info"><span class="mir-po-piece-index">'+(isPanel?'PANNEAU':'MOULURE')+' '+(index+1)+' · '+esc(item.id)+'</span>'+
          '<h4>'+esc(spec.name||model?.name||(isPanel?'Panneau architectural':'Moulure sur mesure'))+'</h4>'+
          '<p class="mir-po-piece-dimensions">'+(dimensions||'Cotes à vérifier')+'</p>'+
          (isPanel?'<details class="mir-po-piece-details"><summary>Voir les côtés, lips et angles</summary><p class="mir-po-piece-angles">'+summary+'</p></details>':
            '<p class="mir-po-piece-angles">'+summary+'</p>')+
          '<p><strong>'+esc(length||'À préciser')+'</strong> · <strong>Métal :</strong> '+esc(metal)+' · <strong>Couleur :</strong> '+esc(color)+'</p>'+
          (ready?'<p class="mir-po-piece-ready">Cotes et options renseignées · à valider en atelier</p>':'<p class="mir-po-piece-to-complete">Options à confirmer avant le PDF fournisseur</p>')+
          '<div class="mir-po-piece-actions"><label class="mir-proc-field"><span>Quantité</span>'+
          '<input type="number" min="1" step="1" inputmode="numeric" data-mir-po-qty="'+esc(item.id)+'" aria-label="Quantité pièce '+esc(item.id)+'" value="'+quantity+'"></label>'+
          '<button type="button" data-mir-po-edit-line="'+esc(item.id)+'">Modifier la pièce</button></div></div></article>';
      }).join('')+'</div>';
    }

    /* One shared workshop dossier; selection is a reversible PO choice only.
       Never remove or re-number fabrication pieces when a checkbox changes. */
    const skippedFor=dossier=>new Set(state.excludedItemIdsByDossier?.[dossier?.id]||[]);
    function includedDossier(dossier){
      if(!dossier)return null;
      const skipped=skippedFor(dossier);
      return {...dossier,items:dossier.items.filter(item=>!skipped.has(item.id))};
    }
    function refreshPanelSelections(){
      const dossier=currentOrder(),chosen=includedDossier(dossier);
      if(!dossier)return;
      for(const control of panel.querySelectorAll('[data-mir-panel-include],[data-mir-po-include]')){
        const selected=!skippedFor(dossier).has(control.dataset.mirPanelInclude||control.dataset.mirPoInclude);
        control.checked=selected;
        control.closest('[data-mir-panel-card],[data-mir-po-piece]')?.classList.toggle('mir-panel-excluded',!selected);
      }
      const count=chosen.items.filter(item=>item.spec?.kind==='panel').length;
      panel.querySelectorAll('[data-mir-panel-count]').forEach(node=>node.textContent=String(count));
      panel.querySelectorAll('[data-mir-po-count]').forEach(node=>node.textContent=String(chosen.items.length));
      panel.querySelectorAll('[data-mir-wb-pick]').forEach(button=>{
        const excluded=skippedFor(dossier).has(button.dataset.mirWbPick);
        button.classList.toggle('is-out',excluded);
        const original=button.getAttribute('aria-label')||'';
        button.setAttribute('aria-label',original.replace(/, exclu du bon/g,'')+(excluded?', exclu du bon':''));
      });
      panel.querySelectorAll('[data-mir-panel-to-po]').forEach(button=>{button.disabled=count===0;});
    }
    function changeIncluded(id,checked){
      const dossier=currentOrder();
      if(!dossier||!dossier.items.some(item=>item.id===id))return false;
      const oldState=JSON.stringify(state.excludedItemIdsByDossier||{});
      const exclude=skippedFor(dossier);
      if(checked)exclude.delete(id);else exclude.add(id);
      state.excludedItemIdsByDossier={...(state.excludedItemIdsByDossier||{}),[dossier.id]:[...exclude]};
      if(!save()){
        state.excludedItemIdsByDossier=JSON.parse(oldState);
        return false;
      }
      refreshPanelSelections();
      return true;
    }
    function panelCards(dossier){
      const api=win.MIRProduction,parts=(dossier?.items||[]).filter(item=>item.spec?.kind==='panel');
      const excluded=skippedFor(dossier);
      return parts.map((item,index)=>{
        const spec=item.spec||{},id=String(item.id),label=item.sourceLayout?.sourcePieceId||id;
        let preview='',measure='',notes='',complete=false,metal='',color='';
        try{
          const m=api.buildPanel(spec);
          if(!m.valid)throw Error('Cotes invalides');
          preview=api.panelSVG(spec,{width:510,height:290,legend:false,header:false,notes:false});
          measure=api.formatMeasurement(m.widthMM,m.unit)+' × '+api.formatMeasurement(m.heightMM,m.unit);
          complete=m.complete;
          metal=m.material?.name||m.material?.type||'Métal à choisir';
          color=m.finish?.name||m.finish?.code||'Couleur à choisir';
          notes=(m.edges||[]).map((e,i)=>(i+1)+'. '+e.name+' : '+api.formatMeasurement(e.lengthMM,m.unit)+
            ' • lip '+api.formatMeasurement(e.lipMM,m.unit)+' • '+Math.round(e.interiorAngleDeg*100)/100+'°').join(' · ');
          if(!m.complete)notes+='<MIROPTIONS>'+((m.validation.pending||[]).slice(0,3).map(p=>p.message).join(' · '));
        }catch{preview='<div class="mir-panel-card-error">Dessin à corriger dans Panneau seul.</div>';}
        const qty=Number.isSafeInteger(Number(spec.quantity))&&Number(spec.quantity)>0?Number(spec.quantity):1;
        const source=item.sourceLayout?.zoneName||'Panneau seul';
        const selected=!excluded.has(id);
        return '<article class="mir-panel-card'+(selected?'':' mir-panel-excluded')+'" data-mir-panel-card="'+esc(id)+'" data-panel-search-text="'+esc(label+' '+source+' '+measure)+'">'+
          '<div class="mir-panel-card-head"><span class="mir-panel-card-id">'+esc(label)+'</span>'+
          '<span class="mir-panel-card-status'+(complete?' mir-panel-card-complete':'')+'">'+(complete?'Cotes complètes':'À vérifier avant PDF')+'</span></div>'+
          '<div class="mir-panel-card-drawing">'+preview+'</div>'+
          '<h3>'+esc(spec.name||'Panneau sur mesure')+'</h3>'+
          '<p class="mir-panel-card-size">'+esc(measure||'Dimensions à préciser')+'</p>'+
          '<p class="mir-panel-card-line">'+esc(source)+' · '+esc(metal)+' · '+esc(color)+'</p>'+
          '<details class="mir-panel-card-details"><summary>Voir lips, angles et options</summary><p>'+esc(notes.replace('<MIROPTIONS>',' • Options à préciser : '))+'</p></details>'+
          '<div class="mir-panel-card-controls"><label>Qté<input type="number" min="1" step="1" value="'+qty+'" data-mir-panel-qty="'+esc(id)+'" aria-label="Quantité panneau '+esc(label)+'"></label>'+
          '<label class="mir-panel-card-check"><input type="checkbox" data-mir-panel-include="'+esc(id)+'"'+(selected?' checked':'')+'><span>Inclure au bon</span></label></div>'+
          '<div class="mir-panel-card-buttons"><button type="button" data-mir-panel-edit="'+esc(id)+'">Modifier</button>'+ 
          '<button type="button" data-mir-panel-duplicate="'+esc(id)+'">Dupliquer</button>'+
          '<a href="calepinage.html'+(item.sourceLayout?.zoneId?'#'+encodeURIComponent(item.sourceLayout.zoneId):'')+'">Voir le mur</a></div></article>';
      }).join('');
    }
    function panelsHTML(){
      const dossier=currentOrder(),render=win.MIRPanelWorkbench?.render;
      if(!render)return '<section class="mir-proc-card"><h2>Panneaux indisponibles</h2><p>Le module de l’atelier n’a pas chargé. Recharge la page sans effacer tes données.</p></section>';
      return render({dossier,activeId:activePanelId,excludedIds:[...skippedFor(dossier)],
        api:win.MIRProduction,volume:win.MIRProductionVolume});
    }
    function showPanel(id){
      const choices=(currentOrder()?.items||[]).filter(i=>i.spec?.kind==='panel');
      if(!choices.some(x=>x.id===id))return;
      activePanelId=id;
      panel.innerHTML=panelsHTML();
      panel.querySelector('.mir-wb-focus')?.scrollIntoView({block:'start',behavior:'smooth'});
    }
    function panelOrderHTML(dossier,items){
      const count=items.filter(x=>x.spec?.kind==='panel').length;
      return '<section class="mir-wb-order" data-mir-wb-order>'+
        '<div class="mir-wb-order-heading"><button type="button" data-mir-tab="panels">← Retour aux panneaux</button>'+
        '<p class="mir-wb-eyebrow">L’ATELIER MIR · BON FOURNISSEUR</p>'+
        '<h2>Préparer le bon de commande</h2>'+
        '<p>'+count+' panneau(x) à commander. Confirme les coordonnées, puis enregistre le brouillon.</p>'+
        '<nav class="mir-wb-progress" aria-label="Parcours de commande">'+
        '<span class="mir-wb-step"><strong>1</strong>Dessiner</span>'+
        '<span class="mir-wb-step"><strong>2</strong>Vérifier</span>'+
        '<span class="mir-wb-step is-current" aria-current="step"><strong>3</strong>Commander</span></nav></div>'+
        '<section class="mir-wb-order-section"><h3>1. Quel fournisseur ?</h3>'+
        '<p>Vérifie le nom du fournisseur avant de préparer le PDF.</p>'+
        '<label class="mir-proc-field"><span>Fournisseur</span><select data-mir-po="supplierId" required><option value="">Choisir un fournisseur…</option>'+
        supplierOptions()+'</select></label>'+
        '<p class="mir-wb-supplier-help">Le fournisseur et ses coordonnées doivent être confirmés avant tout envoi.</p>'+
        '<button type="button" data-mir-tab="suppliers">Gérer les fournisseurs</button></section>'+
        '<section class="mir-wb-order-section"><h3>2. Quel chantier et où livrer ?</h3><div class="mir-wb-order-fields">'+
        '<div class="mir-po-number-field">'+field('poNumber','Numéro du bon','text','required maxlength="100"')+
        '<button type="button" id="mir-po-suggest-number">Proposer un numéro</button></div>'+
        field('job','Nom ou numéro du chantier','text','required maxlength="160"')+
        field('shipTo','Adresse de livraison ou de cueillette','text','required maxlength="360"')+
        field('requestedDate','Date demandée','date')+'</div>'+
        '<details class="mir-wb-extra"><summary>Informations supplémentaires (facultatives)</summary>'+
        field('foreman','Responsable / contremaître','text','maxlength="150"')+
        field('terms','Transport / conditions','text','maxlength="300"')+
        '<label class="mir-proc-field"><span>Notes fournisseur</span><textarea data-mir-po="notes" rows="3" maxlength="800">'+esc(ui.notes)+'</textarea></label></details></section>'+
        '<section class="mir-wb-order-section"><details class="mir-wb-order-items" open>'+
        '<summary>3. Vérifier les '+items.length+' pièces du bon</summary>'+
        win.MIRPanelWorkbench.orderRows(items,win.MIRProduction)+
        '</details></section>'+
        '<section class="mir-wb-save"><p id="mir-proc-error" role="alert" class="mir-proc-error" hidden></p>'+
        '<p id="mir-draft-feedback" role="status" aria-live="polite"></p>'+
        '<p>Ce bouton enregistre un brouillon sur cet appareil. Il n’envoie rien au fournisseur.</p>'+
        '<button type="button" class="mir-panel-primary" id="mir-create-po">Enregistrer le bon brouillon →</button></section></section>';
    }
    function supplierQuickPick(){
      const active=state.suppliers.filter(s=>!s.archived),selected=active.find(row=>row.id===ui.supplierId);
      const buttons=active.map(s=>
        '<button type="button" class="mir-po-supplier-choice" data-mir-po-supplier="'+esc(s.id)+'"'+(ui.supplierId===s.id?' aria-pressed="true"':' aria-pressed="false"')+'>'+
        '<strong>'+esc(s.name)+'</strong><small>'+esc(s.verified?'Contact confirmé':'Contact à confirmer')+'</small></button>'
      ).join('');
      return '<div class="mir-po-suppliers" role="group" aria-label="Choisir un fournisseur de fabrication">'+buttons+'</div>'+
        '<label class="mir-proc-field mir-po-supplier-select"><span>Fournisseur choisi</span><select data-mir-po="supplierId">'+supplierOptions()+'</select></label>'+
        '<p class="mir-po-contact">'+(selected?'<strong>'+esc(selected.name)+'</strong> · '+esc(selected.phone||'Téléphone à préciser')+
          ' · '+esc(selected.email||'Courriel à confirmer')+'<br>'+esc(selected.verified?'Courriel vérifié par MIR':'Vérifier les coordonnées du fournisseur avant tout envoi'):'Sélectionne un fournisseur')+'</p>'+
        '<button type="button" class="mir-po-manage-supplier" data-mir-tab="suppliers">Gérer / vérifier les fournisseurs</button>';
    }
    function ordersHTML(){
      if(poView!=='create')return orderListsHTML();
      populateOrder();
      const dossier=includedDossier(currentOrder()),items=(dossier?.items||[]).filter(i=>['profile','panel'].includes(i?.spec?.kind||i?.kind));
      const quantity=items.reduce((sum,item)=>sum+Number(item.spec?.quantity||0),0),panelCount=items.filter(item=>item.spec?.kind==='panel').length;
      if(panelCount>0)return panelOrderHTML(dossier,items);
      return poMenu()+
        '<section class="mir-po-editor" aria-label="Créer ou modifier un bon de pliage">'+
        '<div class="mir-po-editor-heading"><div><h2>Bon de commande · Panneaux et pliages</h2><p>'+items.length+' référence(s) dont '+panelCount+' panneau(x) · '+quantity+' pièce(s) · mêmes cotes que le tracé</p></div>'+
        '<button type="button" id="mir-new-draft">＋ Nouveau bon</button></div>'+
        '<section class="mir-proc-card mir-po-lines"><header class="mir-po-card-heading"><div><h3>1. Pièces à commander</h3><p>Chaque panneau ou moulure garde ses repères, ses cotes, ses lèvres et sa quantité.</p></div><button type="button" id="mir-edit-lines">Retour au dessin</button></header>'+
        bonPieceCards(dossier)+'</section>'+
        '<section class="mir-proc-card mir-po-supplier-card"><h3>2. Fournisseur</h3><p>Choisis directement un des fournisseurs enregistrés. Le contact reste modifiable.</p>'+
        supplierQuickPick()+'</section>'+
        '<section class="mir-proc-card mir-po-project-card"><h3>3. Chantier et livraison</h3><div class="mir-po-fields">'+
        '<div class="mir-po-number-field">'+field('poNumber','Numéro de bon','text','required maxlength="100"')+'<button type="button" id="mir-po-suggest-number" title="Proposer un numéro local modifiable">Proposer un numéro</button></div>'+
        field('job','Chantier / numéro de job','text','required maxlength="160"')+
        field('shipTo','Adresse de livraison ou cueillette','text','required maxlength="360"')+
        field('requestedDate','Date souhaitée','date')+
        '</div><details class="mir-po-extra"><summary>Autres détails (facultatifs)</summary><div class="mir-po-fields">'+
        field('foreman','Contremaître / responsable','text','maxlength="150"')+
        field('terms','Transport / conditions','text','maxlength="300"')+
        '</div><label class="mir-proc-field"><span>Notes au fournisseur</span><textarea data-mir-po="notes" rows="3" maxlength="800">'+esc(ui.notes)+'</textarea></label></details>'+
        '<p id="mir-proc-error" role="alert" class="mir-proc-error" hidden></p>'+
        '<p id="mir-draft-feedback" role="status" aria-live="polite"></p>'+
        '<div class="mir-po-editor-actions"><p>Brouillon local : aucune commande n’est envoyée automatiquement. Export PDF après vérification.</p>'+
        '<button type="button" class="mir-proc-primary" id="mir-create-po">Enregistrer le bon brouillon</button></div></section></section>';
    }

    function readModelRecords(){
      try{
        const saved=JSON.parse(win.localStorage.getItem(MODEL_KEY)||'null');
        return saved?.version===1&&Array.isArray(saved.records)?saved.records:[];
      }catch{return [];}
    }
    function boutiqueHTML(){
      const records=readModelRecords().filter(record=>record?.id&&record.archived===false&&Array.isArray(record.versions));
      const cards=records.map(record=>{
        const commercial=record.commercial||{},prices=commercial.priceCentsByMetal||{},allowed=record.allowed?.materials||['aluminium','acier'];
        const published=commercial.status==='published'&&record.channels?.client===true;
        const field=metal=>!allowed.includes(metal)?'':('<label class="mir-proc-field"><span>Prix '+(metal==='aluminium'?'aluminium':'acier')+' / longueur 10 pi (CAD)</span><input name="'+metal+'" data-mir-price="'+metal+'" type="text" inputmode="decimal" placeholder="Ex. 7,99" autocomplete="off" value="'+esc(Number.isSafeInteger(prices[metal])?(prices[metal]/100).toFixed(2):'')+'"></label>');
        return '<form class="mir-proc-card mir-proc-model-form" data-mir-boutique-form="'+esc(record.id)+'">'
          +'<div class="mir-proc-model-head"><div><h3>'+esc(record.name||'Modèle sans nom')+'</h3><p>Version '+esc(record.currentVersion)+' · '+esc(record.versions?.find(t=>t.version===record.currentVersion)?.kind==='panel'?'Panneau':'Moulure')+'</p></div>'
          +'<span class="mir-proc-model-state">'+(published?'Visible localement':'Brouillon / privé')+'</span></div>'
          +'<p class="mir-proc-local-note">Une longueur vendue = <strong>10 pi (120 po)</strong>. Les prix n’affectent pas les commandes enregistrées.</p>'
          +'<div class="mir-proc-grid">'+field('aluminium')+field('acier')+'</div>'
          +'<label class="mir-proc-field"><span>Conditions de vente / précisions</span><textarea name="conditions" rows="2" maxlength="600" placeholder="Ex. Fabrication sur confirmation">'+esc(commercial.conditions||'')+'</textarea></label>'
          +'<div class="mir-proc-channel"><label><input type="checkbox" name="store" '+(record.channels?.store===true?'checked':'')+'> Magasin employés</label><label><input type="checkbox" name="po" '+(record.channels?.po!==false?'checked':'')+'> Bon de commande fournisseur</label></div>'
          +'<p class="mir-proc-error" data-mir-boutique-error role="alert" hidden></p>'
          +'<div class="mir-proc-actions"><button type="submit" name="action" value="draft">Garder en brouillon</button><button type="submit" class="mir-proc-primary" name="action" value="published">Rendre visible sur cet appareil</button></div></form>';
      }).join('');
      return '<div class="mir-proc-top"><h2>Boutique de pliages</h2><p>Définissez les prix et les canaux de chaque modèle, sans refaire son dessin.</p></div>'
        +sharedCatalogue('boutique','Ouvrir la Boutique partagée')
        +'<p class="mir-proc-alert">Mode local : les anciens prix et modèles ci-dessous restent sur cet appareil. Le catalogue partagé permet de retrouver les modèles publiés avec votre compte autorisé. Aucun paiement ni synchronisation Shopify n’est actif.</p>'
        +'<p id="mir-boutique-feedback" role="status" aria-live="polite"></p>'
        +(cards||'<div class="mir-proc-card"><h3>Pas encore de modèles enregistrés</h3><p>Dessinez puis enregistrez votre première moulure dans Modèles. Les tarifs ne sont jamais imposés par défaut.</p><button type="button" data-mir-tab="models">Créer mon premier modèle</button></div>');
    }
    function saveBoutique(form,action){
      const rows=readModelRecords(),index=rows.findIndex(row=>row.id===form.dataset.mirBoutiqueForm);
      const error=form.querySelector('[data-mir-boutique-error]');
      if(index<0){error.hidden=false;error.textContent='Modèle introuvable. Rechargez cette page avant de réessayer.';return;}
      const values={action,aluminium:form.elements.namedItem('aluminium')?.value||'',acier:form.elements.namedItem('acier')?.value||'',
        conditions:form.elements.namedItem('conditions')?.value||'',store:form.elements.namedItem('store')?.checked===true,po:form.elements.namedItem('po')?.checked===true};
      const updated=commercialUpdate(rows[index],values);
      if(!updated.ok){error.hidden=false;error.textContent=updated.errors.join(' ');return;}
      rows[index]=updated.record;
      try{win.localStorage.setItem(MODEL_KEY,JSON.stringify({version:1,records:rows}));}
      catch{error.hidden=false;error.textContent='Sauvegarde locale impossible. Exportez vos modèles depuis Modèles.';return;}
      // Ne pas transformer une simple visibilité locale en véritable publication.
      panel.innerHTML=boutiqueHTML();
      const feedback=panel.querySelector('#mir-boutique-feedback');
      if(feedback)feedback.textContent=updated.record.name+(action==='published'?' : disponible dans le catalogue de ce navigateur.': ' : conservé en brouillon privé.');
      win.dispatchEvent(new win.Event('mir-template-catalogue-updated'));
      win.MIRCustomModelCards?.refresh?.();
    }

    const PO_STATUS=W?.statuses||Object.freeze([
      ['brouillon','Brouillon'],
      ['a_valider','À valider'],
      ['pret','Prêt à commander'],
      ['envoye_manuellement','Déclaré envoyé manuellement'],
      ['confirme','Confirmé par le fournisseur'],
      ['livraison_partielle','Livraison partielle'],
      ['termine','Terminé'],
      ['annule','Annulé']
    ]);
    const archivedPO=status=>['termine','annule'].includes(status);
    function poMenu(){
      return '<div class="mir-proc-top"><h2>Bons de commande</h2><p>Créer un bon, gérer les bons en attente ou retrouver l’historique.</p></div>'
        +'<nav class="mir-po-tabs" aria-label="Suivi des bons">'+[['create','＋ Créer un bon'],['pending','En attente'],['history','Historique']].map(([key,label])=>'<button type="button" data-mir-po-view="'+key+'"'+(poView===key?' aria-current="page"':'')+'>'+label+'</button>').join('')+'</nav>'+(poView==='create'?'':'<button type="button" class="mir-po-suppliers" data-mir-tab="suppliers">Gérer les fournisseurs</button>');
    }
    function orderListsHTML(){
      const archived=poView==='history';
      const rows=W?W.search(state.orders,{history:archived,query,date:filterDate}):state.orders.filter(o=>archivedPO(o.status)===archived).slice().reverse();
      const cards=rows.map(o=>{
        const status=PO_STATUS.find(([id])=>id===o.status)?.[1]||'Brouillon';
        const supplier=o.supplier?.name||'Fournisseur à préciser';
        const updates=Array.isArray(o.events)?o.events.length:0;
        return '<article class="mir-proc-card mir-po-tracked" data-mir-order-id="'+esc(o.id)+'">'
         +'<div class="mir-proc-model-head"><div><h3>'+esc(o.poNumber||'Bon sans numéro')+' · R'+esc(o.revision||1)+'</h3><p>'+esc(supplier)+' · '+esc(o.job||'Chantier à préciser')+'</p></div><span class="mir-proc-model-state">'+esc(status)+'</span></div>'
         +'<p>'+esc(o.items?.length||0)+' référence(s) · '+updates+' événement(s) dans le suivi local.</p>'
         +'<label class="mir-proc-field"><span>Faire évoluer le suivi</span><select data-mir-order-status="'+esc(o.id)+'" aria-label="Statut du bon '+esc(o.poNumber)+'">'
         +PO_STATUS.filter(([value])=>value!=='envoye'||o.status==='envoye').map(([value,label])=>'<option value="'+value+'"'+((o.status||'brouillon')===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'
         +'<div class="mir-proc-actions"><button type="button" data-mir-open="'+esc(o.id)+'">'+(W?.frozen(o)?'Créer une révision':'Modifier le bon')+'</button><button type="button" data-mir-review="'+esc(o.id)+'">Vérifier / envoyer</button><button type="button" data-mir-pdf="'+esc(o.id)+'">Télécharger le PDF</button></div>'
         +'<details><summary>Versions et historique · révision '+esc(o.revision||1)+'</summary><div class="mir-proc-actions"><button type="button" data-mir-repeat="'+esc(o.id)+'">Recommander ce bon</button><button type="button" data-mir-print="'+esc(o.id)+'">Prévisualiser le PDF coté</button><button type="button" data-mir-mail="'+esc(o.id)+'">Préparer courriel manuel</button></div><ul>'+(o.events||[]).map(event=>'<li>'+esc(event.at)+' · '+esc(event.type)+'</li>').join('')+'</ul></details></article>';
      }).join('');
      return poMenu()+'<div class="mir-proc-grid"><label class="mir-proc-field"><span>Rechercher fournisseur, chantier ou numéro</span><input id="mir-po-search" value="'+esc(query)+'"></label><label class="mir-proc-field"><span>Date de création ou livraison</span><input id="mir-po-date" type="date" value="'+esc(filterDate)+'"></label></div><p id="mir-po-feedback" role="status" aria-live="polite"></p>'+'<p class="mir-proc-alert">Suivi local sur cet appareil. « Envoyé manuellement » est une déclaration, pas une preuve d’envoi. Aucun envoi automatique avec pièce jointe n’est branché.</p>'
       +(cards||'<div class="mir-proc-card"><h3>'+ (archived?'Aucun bon terminé':'Aucun bon en attente') +'</h3><p>Les bons sauvegardés apparaîtront ici.</p><button type="button" data-mir-po-view="create">Créer un bon</button></div>');
    }
    function storeHTML(){
      const records=readModelRecords().filter(record=>record?.archived===false&&record.channels?.store===true);
      const cards=records.map(record=>{
        const template=record.versions?.find(t=>t.version===record.currentVersion),defaults=record.measurementDefaults?.values||{};
        const locks=Object.values(defaults).filter(row=>row?.locked===true).length;
        let thumb='';
        try{const preview=template&&win.MIRProduction?.templatePreview(template);if(preview?.ok)thumb=win.MIRMiniature?.render(preview.model,win.MIRProduction)||'';}catch{}
        return '<article class="mir-proc-card mir-store-card"><div class="mir-store-visual">'+thumb+'</div><div><h3>'+esc(record.name||'Modèle')+'</h3><p>Version '+esc(record.currentVersion)+' · '+locks+' cote(s) verrouillée(s) · Usage employés.</p><p>'+esc((record.allowed?.materials||[]).join(' / '))+'</p><button type="button" data-mir-tab="models">Modifier ce modèle dans ma bibliothèque</button></div></article>';
      }).join('');
      return '<div class="mir-proc-top"><h2>Magasin employés</h2><p>Les moulures autorisées pour les employés, distinctes de celles vendues aux clients.</p></div>'
      +sharedCatalogue('store','Ouvrir le Magasin partagé')
      +'<p class="mir-proc-alert">Catalogue local à cet appareil : les anciens modèles ci-dessous sont conservés. Le Magasin partagé nécessite un compte employé ou Admin autorisé; aucune commande n’est envoyée automatiquement.</p>'
      +(cards||'<div class="mir-proc-card"><h3>Aucune moulure offerte au magasin</h3><p>Enregistre un modèle et coche « Magasin employés ». Aucun tarif public obligatoire.</p><button type="button" data-mir-tab="models">Voir mes modèles</button></div>');
    }

    function supplierHTML(){
      const cards=state.suppliers.filter(s=>!s.archived).map(s=>'<article class="mir-proc-row"><div><b>'+esc(s.name)+'</b><small>'+esc(s.email||'Courriel à renseigner')+' · '+esc(s.phone)+'</small><small>'+(s.verified?'Courriel confirmé par MIR':'Courriel à confirmer avant envoi')+'</small></div><button type="button" data-mir-edit="'+esc(s.id)+'">Modifier</button></article>').join('');
      const s=state.suppliers.find(s=>s.id===supplierEditing)||{id:'',name:'',email:'',phone:'',address:'',website:'',source:'',contact:'',terms:'',note:'',verified:false};
      function sf(name,label){return '<label class="mir-proc-field"><span>'+esc(label)+'</span><input data-mir-supplier="'+name+'" value="'+esc(s[name])+'" maxlength="400"></label>';}
      return '<button type="button" class="mir-proc-back" data-mir-tab="orders">← Retour aux commandes</button><h2>Fournisseurs de pliage</h2><p>Quatre fiches préremplies avec leurs sources publiques. Vérifie les contacts avant une première commande.</p><p class="mir-proc-alert">Les fournisseurs et les bons sont sauvegardés seulement dans ce navigateur; aucun compte employé ni envoi automatique n’est activé.</p>'
        +'<div class="mir-proc-card"><h3>Répertoire</h3>'+cards+'<button type="button" id="mir-new-supplier">Ajouter un fournisseur</button></div>'
        +'<form id="mir-supplier-form" class="mir-proc-card"><h3>'+(s.id?'Modifier le fournisseur':'Nouveau fournisseur')+'</h3><div class="mir-proc-grid">'
        +sf('name','Nom de la compagnie')+sf('email','Courriel pour les commandes')+sf('phone','Téléphone')
        +sf('address','Adresse')+sf('website','Site Web')+sf('contact','Personne-ressource')
        +sf('terms','Conditions habituelles')+'</div>'
        +'<label class="mir-proc-field"><span>Notes / réserves</span><textarea data-mir-supplier="note" rows="3">'+esc(s.note)+'</textarea></label>'
        +'<p class="mir-proc-source">Source publique : '+esc(s.source||'Aucune — fournisseur ajouté manuellement')+'</p>'
        +'<label class="mir-proc-check"><input type="checkbox" data-mir-supplier="verified" '+(s.verified?'checked':'')+'> J’ai vérifié le courriel de commande auprès de ce fournisseur.</label>'
        +'<p id="mir-supplier-error" class="mir-proc-error" role="alert" hidden></p><div class="mir-proc-actions"><button type="submit" class="mir-proc-primary">Enregistrer la fiche</button><button type="button" id="mir-new-supplier">Nouvelle fiche</button></div></form>';
    }
    function switchTab(next){
      if(pendingWorkflowObserver){pendingWorkflowObserver.disconnect();pendingWorkflowObserver=null;}
      tab=['draw','panels','models','boutique','store','orders','suppliers'].includes(next)?next:'draw';
      doc.body.dataset.mirPanelOrder=tab==='orders'&&poView==='create'&&includedDossier(currentOrder())?.items.some(i=>i.spec?.kind==='panel')?'true':'false';
      doc.body.dataset.mirTab=tab;shortcuts.hidden=tab!=='draw'&&tab!=='models';panel.hidden=!['panels','orders','suppliers','boutique','store'].includes(tab);
      tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.mirTab===(tab==='suppliers'?'orders':tab)?'page':'false'));
      shortcuts.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.mirTab===tab?'page':'false'));
      if(tab==='draw'||tab==='models'){
        const workflow=doc.querySelector('#production-workflow [data-workflow="'+(tab==='draw'?'configure':'models')+'"]');
        if(workflow) workflow.click();
        else if(win.MutationObserver){
          pendingWorkflowObserver=new win.MutationObserver(()=>{
            const button=doc.querySelector('#production-workflow [data-workflow="'+(tab==='models'?'models':'configure')+'"]');
            if(button){pendingWorkflowObserver.disconnect();pendingWorkflowObserver=null;button.click();}
          });
          pendingWorkflowObserver.observe(main,{childList:true,subtree:true});
        }
        return;
      }
      panel.innerHTML=tab==='panels'?panelsHTML():tab==='orders'?ordersHTML():tab==='boutique'?boutiqueHTML():tab==='store'?storeHTML():supplierHTML();
      panel.scrollIntoView({block:'start',behavior:'smooth'});
    }
    function editSupplier(id){supplierEditing=id;switchTab('suppliers');}
    function saveSupplier(form){
      const previous=state.suppliers.find(x=>x.id===supplierEditing);
      const next=normalizeSupplier(Object.assign({},previous||{},{
        id:previous?.id||'fourn-'+Date.now().toString(36),name:form.querySelector('[data-mir-supplier="name"]').value,
        email:form.querySelector('[data-mir-supplier="email"]').value,phone:form.querySelector('[data-mir-supplier="phone"]').value,
        address:form.querySelector('[data-mir-supplier="address"]').value,website:form.querySelector('[data-mir-supplier="website"]').value,
        contact:form.querySelector('[data-mir-supplier="contact"]').value,terms:form.querySelector('[data-mir-supplier="terms"]').value,
        note:form.querySelector('[data-mir-supplier="note"]').value,verified:form.querySelector('[data-mir-supplier="verified"]').checked
      }));
      if(!next.name||next.email&&!mailValid(next.email)){const e=doc.querySelector('#mir-supplier-error');e.hidden=false;e.textContent='Nom obligatoire et courriel valide si renseigné.';return;}
      state.suppliers=state.suppliers.filter(s=>s.id!==next.id).concat(next);
      if(save()){supplierEditing=next.id;ui.supplierId=next.id;switchTab('suppliers');}
    }
    function suggestedPONumber(){
      const date=new Date(),stamp=date.getFullYear().toString()+String(date.getMonth()+1).padStart(2,'0')+String(date.getDate()).padStart(2,'0');
      const prefix='MIR-'+stamp+'-',used=new Set(state.orders.map(po=>String(po.poNumber||'').trim().toLowerCase()));
      const current=currentOrder()?.poNumber;if(current)used.add(String(current).trim().toLowerCase());
      let n=1;while(used.has((prefix+String(n).padStart(3,'0')).toLowerCase()))n++;
      return prefix+String(n).padStart(3,'0');
    }
    function newPo() {
      const supplier=state.suppliers.find(s=>s.id===ui.supplierId),dossier=includedDossier(currentOrder()),errs=validatePo(ui,supplier,dossier,win.MIRProduction,{draftOnly:true}).filter(text=>!/^(Vérifier le courriel|Adresse courriel du fournisseur)/.test(text));
      if(errs.length){const e=doc.querySelector('#mir-proc-error');e.hidden=false;e.innerHTML='<strong>À compléter :</strong><ul>'+errs.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>';return;}
      if(state.orders.some(o=>o.id!==state.editingId&&o.poNumber.toLowerCase()===ui.poNumber.toLowerCase()&&(!state.editingId||(o.rootId||o.id)!==(state.orders.find(x=>x.id===state.editingId)?.rootId||state.editingId)))){const e=doc.querySelector('#mir-proc-error');e.hidden=false;e.textContent='Ce numéro existe déjà : ouvre ce bon depuis En attente ou Historique pour le modifier ou créer une révision.';return;}
      const previous=state.orders.find(o=>o.id===state.editingId);
      const fresh=createPo(ui,supplier,dossier);
      const po=previous&&W?W.saveDraft(previous,{...fresh,id:previous.id,createdAt:previous.createdAt,events:[...(previous.events||[]),{type:'brouillon-enregistre',at:fresh.updatedAt}]}):fresh;
      if(previous)state.orders[state.orders.indexOf(previous)]=po;else state.orders.push(po);state.editingId=po.id;state.formDraft={...ui};
      if(save()){poView='pending';switchTab('orders');const notice=panel.querySelector('.mir-proc-alert');if(notice)notice.insertAdjacentText('afterbegin','Bon brouillon enregistré localement. ');}
    }
    function autosave(){
      state.formDraft={...ui};
      const index=state.orders.findIndex(o=>o.id===state.editingId),source=currentOrder();
      if(index>=0&&W&&!W.frozen(state.orders[index])){
        const old=state.orders[index],supplier=state.suppliers.find(s=>s.id===ui.supplierId)||old.supplier;
        const patch={...ui,supplier:{...supplier}};
        if(source?.id===old.sourceDossierId)patch.items=JSON.parse(JSON.stringify(includedDossier(source).items));
        state.orders[index]=W.saveDraft(old,patch);
      }
      const saved=save(),feedback=doc.querySelector('#mir-draft-feedback');if(feedback)feedback.textContent=saved?'Brouillon enregistré sur cet appareil.':'Sauvegarde non confirmée.';return saved;
    }
    function openEditor(id,reorder=false){
      const old=state.orders.find(o=>o.id===id);if(!old||!W)return;
      const number=reorder?win.prompt('Nouveau numéro pour recommander ce bon') : null;
      if(reorder&&!number)return;
      if(reorder&&state.orders.some(o=>o.poNumber.toLowerCase()===number.trim().toLowerCase()))return win.alert('Ce numéro existe déjà.');
      const next=W.edit(old,state.orders,{reorder,number});
      if(!win.MIRProductionWorkspace?.openPurchaseOrder(next))return;
      next.sourceDossierId='procurement-'+next.id;
      const i=state.orders.findIndex(o=>o.id===next.id);if(i<0)state.orders.push(next);else state.orders[i]=next;
      state.editingId=next.id;
      Object.assign(ui,{supplierId:next.supplier.id,poNumber:next.poNumber,job:next.job,foreman:next.foreman,shipTo:next.shipTo,requestedDate:next.requestedDate,terms:next.terms,notes:next.notes});
      state.formDraft={...ui};if(save()){poView='create';switchTab('orders');}
    }
    async function downloadPdf(id,button,preview=false){
      const po=state.orders.find(o=>o.id===id);if(!po||!W)return;
      const popup=preview?win.open('','_blank'):null;if(preview&&!popup)return win.alert('Autorisez la fenêtre du PDF.');
      button.disabled=true;doc.body.inert=true;const progress=doc.querySelector('#mir-po-feedback');if(progress)progress.textContent='Préparation et archivage du PDF…';
      try{
        const record=await W.archivePDF(po,()=>win.MIRPDF.makePlan({faces:W.pdfFaces(po,win.MIRProduction),title:'Bon MIR '+po.poNumber,subtitle:po.supplier.name}));
        const url=win.URL.createObjectURL(record.blob),a=doc.createElement('a');a.href=url;a.download='MIR-BC-'+String(po.poNumber).replace(/[^a-zA-Z0-9_-]/g,'-')+'-R'+po.revision+'.pdf';if(popup)popup.location.href=url;else a.click();win.setTimeout(()=>win.URL.revokeObjectURL(url),60000);
        po.pdf={key:record.key,sha256:record.sha256,createdAt:record.createdAt};
        po.events=[...(po.events||[]),{type:'pdf-archive',sha256:record.sha256,at:new Date().toISOString()}];
        if(save()){if(state.editingId===po.id)state.editingId=null;save();switchTab('orders');}
      }catch(error){popup?.close();win.alert('PDF non préparé : '+error.message);}finally{doc.body.inert=false;button.disabled=false;}
    }
    function review(id){
      const po=state.orders.find(o=>o.id===id);if(!po)return;
      const supplier=state.suppliers.find(s=>s.id===po.supplier.id);
      const errors=validatePo({poNumber:po.poNumber,job:po.job,shipTo:po.shipTo},supplier,{items:po.items},win.MIRProduction);
      if(supplier?.email!==po.supplier.email)errors.push('Le contact a changé : créer une révision et confirmer le destinataire.');
      const box=doc.createElement('section');box.className='mir-proc-card';box.id='mir-send-review';
      box.innerHTML='<h3>Vérifier → PDF → Destinataire → Envoi</h3>'+(errors.length?'<ul>'+errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul>':'<p>Bon complet. Destinataire : <strong>'+esc(po.supplier.email)+'</strong></p>')
        +'<div class="mir-proc-actions"><button type="button" data-mir-preview="'+esc(id)+'">Prévisualiser le PDF coté</button><button type="button" data-mir-pdf="'+esc(id)+'">Télécharger et archiver le PDF</button></div>'
        +'<label class="mir-proc-check"><input type="checkbox" '+(errors.length?'disabled':'')+'> Je confirme le destinataire '+esc(po.supplier.email)+'</label>'
        +'<button type="button" disabled>Envoyer le PDF — service non connecté</button><p>À connecter : authentification Admin serveur, base Supabase, stockage privé et expéditeur MIR vérifié auprès du service courriel. Aucun courriel automatique ne sera envoyé.</p><button type="button" data-mir-po-view="pending">Retour aux bons sans perdre le travail</button>';
      doc.querySelector('#mir-send-review')?.remove();panel.prepend(box);box.scrollIntoView({block:'start'});
    }
    win.addEventListener('mir:workshop-saved',()=>{const selected=state.orders.find(o=>o.id===state.editingId),source=currentOrder();if(selected&&source?.id!==selected.sourceDossierId){state.editingId=null;state.formSource=null;populateOrder();}if(state.editingId)autosave();});
    function printPo(id){
      const po=state.orders.find(o=>o.id===id);if(!po)return;
      const popup=win.open('','_blank');if(!popup){win.alert('Fenêtre bloquée : autorise une nouvelle fenêtre pour ouvrir le PDF.');return;}
      popup.document.open();popup.document.write(printHTML(po,win.MIRProduction));popup.document.close();
      popup.focus();
    }
    function mailPo(id){
      const po=state.orders.find(o=>o.id===id);if(!po)return;
      const current=state.suppliers.find(s=>s.id===po.supplier.id);
      if(!current?.verified||current.email!==po.supplier.email||!mailValid(current.email)){win.alert('Le courriel a changé ou n’est pas vérifié. Confirme la fiche fournisseur avant de préparer le message.');return;}
      if(!win.confirm('Ouvrir le courriel pour '+current.email+' ? Tu dois joindre le PDF toi-même puis envoyer depuis ta messagerie. Le site ne marquera PAS ce bon comme envoyé.'))return;
      win.location.href=mailtoDraft(po);
    }
    tabs.addEventListener('click',function(e){const b=e.target.closest('[data-mir-tab]');if(b)switchTab(b.dataset.mirTab);});
    shortcuts.addEventListener('click',function(e){const b=e.target.closest('[data-mir-tab]');if(b)switchTab(b.dataset.mirTab);});
    panel.addEventListener('click',function(e){
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.mirTab){switchTab(b.dataset.mirTab);return;}
      if(b.dataset.mirPoView){poView=b.dataset.mirPoView;switchTab('orders');return;}
      if(b.dataset.mirEdit){editSupplier(b.dataset.mirEdit);return;}
      if(b.id==='mir-new-supplier'){supplierEditing=null;switchTab('suppliers');return;}
      if(b.dataset.mirWbPick){
        showPanel(b.dataset.mirWbPick);return;
      }
      if(b.dataset.mirWbPrev!==undefined||b.dataset.mirWbNext!==undefined){
        const items=(currentOrder()?.items||[]).filter(i=>i.spec?.kind==='panel');
        const index=items.findIndex(i=>i.id===activePanelId);
        const next=Math.max(0,Math.min(items.length-1,(index<0?0:index)+(b.dataset.mirWbNext!==undefined?1:-1)));
        if(items[next])showPanel(items[next].id);
        return;
      }
      if(b.dataset.mirPanelNew!==undefined){
        switchTab('draw');doc.querySelector('[data-kind="panel"]')?.click();return;
      }
      if(b.dataset.mirPanelEdit){
        if(win.MIRProductionWorkspace?.editOrderItem?.(b.dataset.mirPanelEdit))switchTab('draw');
        return;
      }
      if(b.dataset.mirPanelDuplicate){
        const previous=currentOrder()?.items?.length||0;
        const source=[...doc.querySelectorAll('[data-duplicate-piece]')].find(el=>el.dataset.duplicatePiece===b.dataset.mirPanelDuplicate);
        if(!source)return win.alert('Ouvre d’abord la fiche de cette pièce avant de la dupliquer.');
        source.click();
        if((currentOrder()?.items?.length||0)>previous)switchTab('panels');
        else win.alert('La pièce n’a pas été dupliquée. Vérifie ses cotes dans le dessin.');
        return;
      }
      if(b.dataset.mirPanelHistory!==undefined){poView='history';switchTab('orders');return;}
      if(b.dataset.mirPanelToPo!==undefined){
        const dossier=includedDossier(currentOrder());
        if(!dossier?.items.some(item=>item.spec?.kind==='panel'))return win.alert('Coche au moins un panneau avant de préparer le bon.');
        if(!win.MIRProcurementUI?.openCreate?.({newOrder:false})){poView='create';switchTab('orders');}
        return;
      }
      if(b.dataset.mirPanelAll!==undefined){
        const dossier=currentOrder();if(!dossier)return;
        const checked=b.dataset.mirPanelAll==='true';
        const excluded=skippedFor(dossier);
        for(const item of dossier.items.filter(item=>item.spec?.kind==='panel')){
          if(checked)excluded.delete(item.id);else excluded.add(item.id);
        }
        const previous=JSON.stringify(state.excludedItemIdsByDossier||{});
        state.excludedItemIdsByDossier={...(state.excludedItemIdsByDossier||{}),[dossier.id]:[...excluded]};
        if(!save())state.excludedItemIdsByDossier=JSON.parse(previous);
        refreshPanelSelections();
        return;
      }
      if(b.id==='mir-po-suggest-number'){
        const field=panel.querySelector('[data-mir-po="poNumber"]');if(!field)return;
        if(field.value.trim()&&!win.confirm('Remplacer ce numéro de bon par une proposition locale ?'))return;
        ui.poNumber=suggestedPONumber();field.value=ui.poNumber;autosave();field.focus();return;
      }
      if(b.id==='mir-edit-lines'){const hasPanels=currentOrder()?.items?.some(item=>item.spec?.kind==='panel');switchTab(hasPanels?'panels':'draw');if(!hasPanels)doc.querySelector('#production-drawing')?.focus({preventScroll:true});return;}
      if(b.dataset.mirPoEditLine){if(win.MIRProductionWorkspace?.editOrderItem?.(b.dataset.mirPoEditLine))switchTab('draw');return;}
      if(b.dataset.mirPoSupplier){const supplier=state.suppliers.find(row=>row.id===b.dataset.mirPoSupplier&&!row.archived);if(!supplier)return;ui.supplierId=supplier.id;autosave();switchTab('orders');return;}
      if(b.id==='mir-new-draft'){if(win.MIRProductionWorkspace?.newPurchaseOrder()){state.editingId=null;Object.assign(ui,{poNumber:'',job:'',foreman:'',shipTo:'',requestedDate:'',terms:'',notes:''});state.formDraft={...ui};save();poView='create';switchTab('orders');}return;}
      if(b.id==='mir-create-po'){newPo();return;}
      if(b.dataset.mirOpen){openEditor(b.dataset.mirOpen);return;}
      if(b.dataset.mirRepeat){openEditor(b.dataset.mirRepeat,true);return;}
      if(b.dataset.mirReview){review(b.dataset.mirReview);return;}
      if(b.dataset.mirPreview){downloadPdf(b.dataset.mirPreview,b,true);return;}
      if(b.dataset.mirPdf){downloadPdf(b.dataset.mirPdf,b);return;}
      if(b.dataset.mirPrint){printPo(b.dataset.mirPrint);return;}
      if(b.dataset.mirMail){mailPo(b.dataset.mirMail);}
    });
    panel.addEventListener('input',function(e){
      if(e.target.matches('[data-mir-panel-search]')){
        panelFilter=e.target.value.trim().toLocaleLowerCase('fr-CA');
        for(const item of panel.querySelectorAll('[data-mir-panel-card]')){
          item.hidden=!item.getAttribute('data-panel-search-text').toLocaleLowerCase('fr-CA').includes(panelFilter);
        }
        return;
      }
      if(e.target.id==='mir-po-search'){query=e.target.value;const start=e.target.selectionStart;switchTab('orders');const field=doc.querySelector('#mir-po-search');field.focus();field.setSelectionRange(start,start);return;}if(e.target.dataset.mirPo){ui[e.target.dataset.mirPo]=e.target.value;autosave();}});
    panel.addEventListener('change',function(e){
      if(e.target.dataset.mirPanelInclude!==undefined || e.target.dataset.mirPoInclude!==undefined){
        const id=e.target.dataset.mirPanelInclude||e.target.dataset.mirPoInclude;
        if(!changeIncluded(id,e.target.checked))e.target.checked=!e.target.checked;
        return;
      }
      if(e.target.dataset.mirPanelQty!==undefined){
        const result=win.MIRProductionWorkspace?.setOrderItemQuantity?.(e.target.dataset.mirPanelQty,e.target.value);
        if(!result?.ok){win.alert(result?.error||'Quantité invalide : aucune modification enregistrée.');return;}
        const countNode=panel.querySelector('[data-mir-panel-count]');
        if(countNode)countNode.textContent=String(includedDossier(currentOrder()).items.filter(i=>i.spec.kind==='panel').length);
        return;
      }
      if(e.target.dataset.mirPoQty){
        const id=e.target.dataset.mirPoQty,result=win.MIRProductionWorkspace?.setOrderItemQuantity?.(id,e.target.value);
        if(!result?.ok){
          const error=doc.querySelector('#mir-proc-error');
          if(error){error.hidden=false;error.textContent=result?.error||'Impossible de modifier la quantité.';}
          return;
        }
        switchTab('orders');return;
      }
      if(e.target.id==='mir-po-date'){filterDate=e.target.value;switchTab('orders');return;}
      if(e.target.dataset.mirPo){ui[e.target.dataset.mirPo]=e.target.value;autosave();}
      const id=e.target.dataset.mirOrderStatus;
      if(id){
        const index=state.orders.findIndex(o=>o.id===id),po=state.orders[index];
        if(index<0||!PO_STATUS.some(([value])=>value===e.target.value))return;
        if(po.status===e.target.value)return;
        const previous=po.status||'brouillon',next=e.target.value,now=new Date().toISOString();
        try{state.orders[index]=W?W.changeStatus(po,next):{...po,status:next,updatedAt:now,events:[...(po.events||[]),{type:'statut-manuel',from:previous,to:next,at:now}]};}catch(error){win.alert(error.message);return;}
        if(!save()){state.orders[index]=po;return;}
        switchTab('orders');
      }
    });
    panel.addEventListener('submit',function(e){if(e.target.matches('[data-mir-boutique-form]')){e.preventDefault();saveBoutique(e.target,e.submitter?.value);return;}if(e.target.id==='mir-supplier-form'){e.preventDefault();saveSupplier(e.target);}});
    /* API de navigation du bon : reprend les fournisseurs et le dossier
       existants, sans inventer une deuxième base de commandes. */
    win.MIRProcurementUI=Object.freeze({
      version:'1.0.0',
      isFrozenNumber(number){
        const key=String(number||'').trim().toLowerCase();
        return state.orders.some(po=>String(po.poNumber||'').trim().toLowerCase()===key&&!!W?.frozen?.(po));
      },
      openCreate({newOrder=false}={}){
        const dossier=currentOrder();if(!dossier)return false;
        const oldUi={...ui},oldState={editingId:state.editingId,formSource:state.formSource,formDraft:state.formDraft};
        const saved=!newOrder&&state.orders.find(po=>(
          po.sourceDossierId===dossier.id||!!dossier.poNumber&&po.poNumber===dossier.poNumber
        )&&!W?.frozen?.(po));
        if(!newOrder&&dossier.poNumber&&state.orders.some(po=>po.poNumber===dossier.poNumber&&W?.frozen?.(po))){
          win.alert('Ce bon a déjà été finalisé. Crée une révision avant d’ajouter une pièce.');
          return false;
        }
        state.editingId=saved?.id||null;state.formSource=dossier.id;
        Object.assign(ui,{
          supplierId:saved?.supplier?.id||oldUi.supplierId||state.suppliers.find(x=>!x.archived)?.id||'',
          poNumber:newOrder?'':saved?.poNumber||dossier.poNumber||'',
          job:newOrder?'':saved?.job||dossier.project||'',
          foreman:newOrder?'':saved?.foreman||dossier.foreman||'',
          requestedDate:saved?.requestedDate||dossier.date||'',
          shipTo:saved?.shipTo||'',
          terms:saved?.terms||'',
          notes:saved?.notes||''
        });
        state.formDraft={...ui};
        if(!save()){Object.assign(ui,oldUi);Object.assign(state,oldState);return false;}
        poView='create';switchTab('orders');return true;
      }
    });
    const requestedView=new URLSearchParams(win.location.search).get('view');
    switchTab(['orders','suppliers','models','panels'].includes(requestedView)||['boutique','store'].includes(requestedView)?requestedView:'draw');
  }
  return {VERSION,SOURCES,seed,normalizeSupplier,mergeSuppliers,readState,getDossier,validatePo,createPo,mailtoDraft,printHTML,parsePrice,priceLabel,commercialUpdate,init};
});
