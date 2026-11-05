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
    return {version:VERSION,suppliers:mergeSuppliers(old.suppliers),orders:Array.isArray(old.orders)?old.orders:[]};
  }
  function getDossier(storage) {
    try{
      const row=JSON.parse(storage.getItem(DRAFT)||'null');
      return row&&row.version===1&&Array.isArray(row.order?.items)?row.order:null;
    }catch{return null;}
  }
  function validatePo(draft,supplier,dossier,modelAPI) {
    const errors=[];
    if(!supplier||supplier.archived) errors.push('Choisir un fournisseur actif.');
    if(!supplier?.verified) errors.push('Vérifier le courriel du fournisseur et confirmer sa fiche.');
    if(!mailValid(supplier?.email||'')) errors.push('Adresse courriel du fournisseur invalide.');
    if(!safe(draft?.poNumber,100)) errors.push('Inscrire le numéro de bon de commande.');
    if(!safe(draft?.job,160)) errors.push('Inscrire le nom ou numéro du chantier.');
    if(!safe(draft?.shipTo,360)) errors.push("Inscrire l'adresse de livraison ou de cueillette.");
    if(!dossier||!dossier.items?.length) errors.push('Ajouter une moulure dans le dossier avant de créer le bon.');
    for(const item of dossier?.items||[]) {
      if(item?.kind!=='profile'&&item?.spec?.kind!=='profile') {errors.push('Les bons de pliage acceptent seulement les moulures.');continue;}
      if(!Number.isInteger(Number(item?.spec?.quantity))||Number(item.spec.quantity)<1) errors.push('Quantité invalide pour '+safe(item.id,80)+'.');
      if(modelAPI?.buildProfile) {
        try{
          const m=modelAPI.buildProfile(item.spec);
          if(!m.valid||!m.complete) errors.push('Cotes, métal ou couleur incomplets pour '+safe(item.id,80)+'.');
        }catch {errors.push('Impossible de vérifier la géométrie de '+safe(item.id,80)+'.');}
      } else errors.push('Moteur de pliage non chargé.');
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
  const moneyLabel=po=>po?.items?.length+' référence(s) de moulure';
  function mailtoDraft(po) {
    const subject='MIR | Bon de pliage '+po.poNumber+' | '+po.job;
    const items=po.items.map((i,n)=>'  '+(n+1)+'. '+safe(i?.spec?.name||i?.kind||'Moulure',100)+' — Qté '+safe(i?.spec?.quantity||1,20)+' — longueur '+safe(i?.spec?.length||120,30)+' po').join('\n');
    const body='Bonjour,\n\nVeuillez trouver notre demande de pliage.\n'
      +'Bon : '+po.poNumber+'\nChantier : '+po.job+'\nResponsable : '+(po.foreman||'À préciser')
      +'\nLivrer à : '+po.shipTo+'\nDate souhaitée : '+(po.requestedDate||'À confirmer')
      +'\nConditions : '+(po.terms||'À confirmer')+'\n\n'+items
      +'\n\nNOTA : JOINDRE LE PDF COTÉ avant d’envoyer le courriel.\n'
      +'Merci de confirmer les prix, couleurs, calibres et la date de fabrication.\n\nLes Revêtements MIR';
    return 'mailto:'+encodeURIComponent(po.supplier.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  }
  function printHTML(po,modelAPI) {
    const rows=po.items.map((i,n)=>{
      let m,svg='',measure='',face='';
      try {
        m=modelAPI.buildProfile(i.spec);
        svg=modelAPI.profileSVG(i.spec,{width:620,height:260,legend:false,notes:false,header:false});
        measure=m.segments.map(s=>esc(s.label)+' = '+esc(modelAPI.formatMeasurement(s.lengthMM,m.unit))).join(' · ');
        face=m.finishedSegmentSumMM!=null?modelAPI.formatMeasurement(m.finishedSegmentSumMM,'in'):'À confirmer';
      }catch{svg='<p>Géométrie indisponible — ne pas mettre en fabrication.</p>';}
      const mat=safe(i.spec?.material?.type,40),color=safe(i.spec?.finish?.name||i.spec?.finish?.code,100);
      return '<section class="piece"><h3>'+esc(i.id||'P'+(n+1))+' — '+esc(i.spec?.name||'Moulure')+'</h3><div class="draw">'+svg+'</div><p>'+measure+'</p>'
       +'<p><b>Somme des côtés :</b> '+esc(face)+' (avant corrections de pliage, pas un développé de fabrication)</p>'
       +'<p><b>Matériau :</b> '+esc(mat)+' · <b>Couleur :</b> '+esc(color)+' · <b>Calibre :</b> '+esc(i.spec?.material?.gauge||'À confirmer')+'</p>'
       +'<p><b>Longueur finie :</b> '+esc(i.spec?.length||'À confirmer')+' po · <b>Quantité :</b> '+esc(i.spec?.quantity||1)+'</p></section>';
    }).join('');
    return '<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><title>Bon de pliage MIR '+esc(po.poNumber)+'</title>'
      +'<style>body{font:14px/1.5 Arial,sans-serif;color:#263a2b;margin:24px;max-width:1000px}header{border-bottom:3px solid #28553a;padding-bottom:16px;margin-bottom:16px}h1{font-size:27px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}.piece{page-break-inside:avoid;border-top:1px solid #d5ddce;margin-top:20px}.draw svg{max-width:100%;max-height:220px}p{margin:6px 0}small{color:#5d6a60}@media print{body{margin:12mm}.piece{break-inside:avoid}}</style></head><body>'
      +'<header><strong>LES REVÊTEMENTS MIR</strong><h1>BON DE COMMANDE DE PLIAGE — '+esc(po.poNumber)+'</h1><p>Révision '+po.revision+' · Statut '+esc(po.status)+'</p></header>'
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
    let state=readState(win.localStorage),tab='draw',supplierEditing=null,pendingWorkflowObserver=null;
    const ui={supplierId:'unico',poNumber:'',job:'',foreman:'',shipTo:'',requestedDate:'',terms:'',notes:''};
    function save(){try{win.localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{win.alert('Stockage local indisponible : impossible d’enregistrer.');return false;}}
    save();
    const tabs=doc.createElement('nav');tabs.id='mir-procurement-tabs';tabs.setAttribute('aria-label','Administration du pliage');
    tabs.innerHTML='<button type="button" data-mir-tab="draw">Créer</button><button type="button" data-mir-tab="models">Modèles</button><button type="button" data-mir-tab="boutique">Boutique</button><button type="button" data-mir-tab="orders">Commandes</button>';
    const panel=doc.createElement('section');panel.id='mir-procurement-panel';panel.hidden=true;
    main.insertBefore(tabs,main.firstChild);main.append(panel);doc.body.classList.add('mir-procurement-ready');
    const clearLink=doc.createElement('a');clearLink.href='vider-atelier.html';clearLink.className='mir-proc-reset-link';clearLink.textContent='Vider mes profils et essais enregistrés';tabs.insertAdjacentElement('afterend',clearLink);
    function currentOrder(){return getDossier(win.localStorage);}
    function populateOrder(){const o=currentOrder();if(o){if(!ui.poNumber)ui.poNumber=o.poNumber||'';if(!ui.job)ui.job=o.project||'';if(!ui.foreman)ui.foreman=o.foreman||'';if(!ui.requestedDate)ui.requestedDate=o.date||'';}}
    function field(name,label,kind='text',extra='') {
      const value=ui[name]||'';
      return '<label class="mir-proc-field"><span>'+esc(label)+'</span><input type="'+kind+'" data-mir-po="'+name+'" value="'+esc(value)+'" '+extra+'></label>';
    }
    function supplierOptions(){return state.suppliers.filter(s=>!s.archived).map(s=>'<option value="'+esc(s.id)+'"'+(ui.supplierId===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('');}
    function ordersHTML(){
      populateOrder();
      const dossier=currentOrder(),number=dossier?.items?.filter(i=>i.spec?.kind==='profile'||i.kind==='profile').length||0;
      const warnings=!dossier?'Aucun dossier de moulures sur cet appareil.':dossier.items?.length+' pièce(s) dans le dossier courant.';
      const list=state.orders.slice().reverse().slice(0,30).map(o=>'<article class="mir-proc-row"><div><b>'+esc(o.poNumber)+'</b><small>'+esc(o.supplier?.name||'')+' · '+esc(o.job)+' · '+esc(o.status)+'</small></div><div class="mir-proc-actions"><button data-mir-print="'+esc(o.id)+'" type="button">PDF</button><button data-mir-mail="'+esc(o.id)+'" type="button">Préparer courriel</button></div></article>').join('');
      return '<div class="mir-proc-top"><div><h2>Bons de commande de pliage</h2><p>Une commande = un fournisseur + le dessin exact des pièces au moment de la création.</p></div></div>'
        +'<p class="mir-proc-alert">Démonstration locale : aucune commande n’est envoyée automatiquement. Ouvrir un courriel n’est pas une preuve d’envoi; le PDF doit être joint manuellement.</p>'
        +'<div class="mir-proc-grid"><div class="mir-proc-card"><h3>1. Pièces à commander</h3><p>'+esc(warnings)+'</p><p>'+number+' moulure(s) reconnue(s). Les panneaux restent dans leur propre parcours.</p><button type="button" data-mir-tab="draw">Dessiner / ajouter une moulure</button></div>'
        +'<div class="mir-proc-card"><h3>2. Fournisseur</h3><label class="mir-proc-field"><span>Choisir</span><select data-mir-po="supplierId">'+supplierOptions()+'</select></label><button type="button" data-mir-tab="suppliers">Gérer les fournisseurs</button></div></div>'
        +'<div class="mir-proc-card"><h3>3. Chantier et livraison</h3><div class="mir-proc-grid">'
        +field('poNumber','Numéro du bon de commande','text','required maxlength="100"')
        +field('job','Chantier / numéro de job','text','required maxlength="160"')
        +field('foreman','Contremaître / responsable','text','maxlength="150"')
        +field('requestedDate','Date souhaitée','date')
        +field('shipTo','Adresse de livraison ou cueillette','text','required maxlength="360"')
        +field('terms','Conditions / transport','text','maxlength="300"')+'</div>'
        +'<label class="mir-proc-field"><span>Notes au fournisseur</span><textarea data-mir-po="notes" rows="3" maxlength="800">'+esc(ui.notes)+'</textarea></label>'
        +'<p id="mir-proc-error" role="alert" class="mir-proc-error" hidden></p>'
        +'<div class="mir-proc-actions"><button type="button" class="mir-proc-primary" id="mir-create-po">Enregistrer le bon brouillon</button></div></div>'
        +'<div class="mir-proc-card"><h3>4. Bons enregistrés sur cet appareil</h3>'+ (list||'<p>Aucun bon enregistré.</p>')+'</div>';
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
        +'<p class="mir-proc-alert">Mode local : ces prix et modèles ne sont visibles que sur ce navigateur. Une vraie boutique partagée exige un serveur et une connexion administrateur sécurisée. Aucun paiement ni synchronisation Shopify n’est actif.</p>'
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
      tab=['draw','models','boutique','orders','suppliers'].includes(next)?next:'draw';
      doc.body.dataset.mirTab=tab;panel.hidden=tab!=='orders'&&tab!=='suppliers'&&tab!=='boutique';
      tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.mirTab===(tab==='suppliers'?'orders':tab)?'page':'false'));
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
      panel.innerHTML=tab==='orders'?ordersHTML():tab==='boutique'?boutiqueHTML():supplierHTML();
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
    function newPo() {
      const supplier=state.suppliers.find(s=>s.id===ui.supplierId),dossier=currentOrder(),errs=validatePo(ui,supplier,dossier,win.MIRProduction);
      if(errs.length){const e=doc.querySelector('#mir-proc-error');e.hidden=false;e.innerHTML='<strong>À compléter :</strong><ul>'+errs.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>';return;}
      if(state.orders.some(o=>o.poNumber.toLowerCase()===ui.poNumber.toLowerCase())){const e=doc.querySelector('#mir-proc-error');e.hidden=false;e.textContent='Ce numéro de bon existe déjà. Change le numéro pour créer une autre commande.';return;}
      const po=createPo(ui,supplier,dossier);state.orders.push(po);
      if(save()){switchTab('orders');win.alert('Brouillon enregistré sur cet appareil. Utilise PDF puis Préparer courriel. Aucun envoi automatique.');}
    }
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
    panel.addEventListener('click',function(e){
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.mirTab){switchTab(b.dataset.mirTab);return;}
      if(b.dataset.mirEdit){editSupplier(b.dataset.mirEdit);return;}
      if(b.id==='mir-new-supplier'){supplierEditing=null;switchTab('suppliers');return;}
      if(b.id==='mir-create-po'){newPo();return;}
      if(b.dataset.mirPrint){printPo(b.dataset.mirPrint);return;}
      if(b.dataset.mirMail){mailPo(b.dataset.mirMail);}
    });
    panel.addEventListener('input',function(e){if(e.target.dataset.mirPo)ui[e.target.dataset.mirPo]=e.target.value;});
    panel.addEventListener('change',function(e){if(e.target.dataset.mirPo)ui[e.target.dataset.mirPo]=e.target.value;});
    panel.addEventListener('submit',function(e){if(e.target.matches('[data-mir-boutique-form]')){e.preventDefault();saveBoutique(e.target,e.submitter?.value);return;}if(e.target.id==='mir-supplier-form'){e.preventDefault();saveSupplier(e.target);}});
    const requestedView=new URLSearchParams(win.location.search).get('view');
    switchTab(['orders','suppliers','models'].includes(requestedView)||requestedView==='boutique'?requestedView:'draw');
  }
  return {VERSION,SOURCES,seed,normalizeSupplier,mergeSuppliers,readState,getDossier,validatePo,createPo,mailtoDraft,printHTML,parsePrice,priceLabel,commercialUpdate,init};
});
