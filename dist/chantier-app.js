(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STORE_KEY = 'mir_employee_portal_demo_v1';
  const UI_KEY = 'mir_employee_portal_ui_v1';
  const INVITATION_KEY = 'mir_portal_invitation_v1';
  const categoryNames = {'fixations':'Clous & vis','membranes-joints':'Membranes & joints','soffites-moulures':'Soffites & moulures','lames-consommables':'Outils & consommables','revetements':'Revêtements','pliages':'Pliages & aluminium'};
  const iconPaths = {
    house:'M3 10 12 3l9 7v11H3V10Zm6 11v-8h6v8', cart:'M3 3h2l2 12h11l3-8H6M9 20h.01M18 20h.01',
    orders:'M3 5h12v13H3V5Zm12 5h4l3 4v4h-7M6 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    box:'m3 7 9-4 9 4v11l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v11M7.5 5 17 9',
    people:'M16 21v-2a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v2M15 3a4 4 0 0 1 0 8M22 21v-2a5 5 0 0 0-4-4.8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    plan:'M5 3h9l5 5v13H5V3Zm9 0v6h5M8 13h8M8 17h6',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z', info:'M12 10v7M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    plus:'M12 5v14M5 12h14', check:'m5 12 4 4L19 6', arrow:'M4 12h16m-6-6 6 6-6 6',
    fold:'M4 3h7v14h9v4H7V7H4V3Z', tool:'m3 21 8-8m2-10a6 6 0 0 0-6 8l6 6a6 6 0 0 0 8-6l-5 2-5-5 2-5Z'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[name] || iconPaths.box}"/></svg>`;
  const num = value => Number.isFinite(value) ? new Intl.NumberFormat('fr-CA',{maximumFractionDigits:2}).format(value) : 'À confirmer';
  const date = value => { const d=new Date(value); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short'}).format(d) : 'Date à préciser'; };
  const requestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let model, state, materials=[], materialMap=new Map(), ui, mode='employee', view='projects', actorId='demo-employee-1', query='', category='all', favoritesOnly=false, orderFilter='pending', toastTimer, customModelController=null;
  let connectionMode='connected', portalClient=null, clientStatus=null, authCallback=null, invitationToken=null, authMessage='', authError='', authBusy=false, invitations=[], uiStorageKey=UI_KEY;
  const isDemo=()=>connectionMode==='demo';
  const load = (key,fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  function save() {
    try {
      if(isDemo()){localStorage.setItem(STORE_KEY,JSON.stringify(state));localStorage.setItem(UI_KEY,JSON.stringify(ui));}
      else if(actorId&&ui){
        const cart=currentCart().map(line=>Object.fromEntries(['itemId','quantity','colorId','formatId','dimensionsIn','cartKey'].filter(key=>line[key]!==undefined).map(key=>[key,line[key]])));
        localStorage.setItem(uiStorageKey,JSON.stringify({cart,jobId:ui.jobs[actorId]||''}));
      }
    } catch { toast('Votre brouillon reste en mémoire. Le stockage local est indisponible.'); }
  }
  const actor = () => state.members.find(member=>member.id===actorId);
  const jobById = id => state.jobs.find(job=>job.id===id);
  const itemById = id => state.catalogue.find(item=>item.id===id);
  const currentCart = () => ui.carts[actorId] || (ui.carts[actorId]=[]);
  const jobsForActor = () => model.listJobs(state,actorId);
  function currentJobId() { const jobs=jobsForActor(); if (!jobs.some(job=>job.id===ui.jobs[actorId])) ui.jobs[actorId]=jobs[0]?.id || ''; return ui.jobs[actorId]; }
  const isFold = item => !!item && (item.customBending===true || (Array.isArray(item.measureFields) && item.measureFields.length>0));
  function toast(message) { const node=$('#portal-toast');node.textContent=message;node.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),4200); }
  const errorMessage = error => error?.message || 'Cette action n’a pas pu être appliquée.';
  const stockFor=key=>isDemo()?model.stockFor(state,key):window.MIRPortalClient.stockFor(state,key);
  async function act(type,payload={}) {
    try {
      if(!isDemo()){
        const command=type==='TOGGLE_FAVORITE'?'SET_FAVORITE':type;
        const data=type==='TOGGLE_FAVORITE'?{itemId:payload.itemId,favorite:!favoriteIds().includes(payload.itemId)}:payload;
        const out=await portalClient.command(command,data);state=out.snapshot;syncOperation();return {...out,state};
      }
      const out=model.reduce(state,{type,actorId,at:new Date().toISOString(),requestId:requestId(),...payload});
      if(!out.ok){toast(errorMessage(out.error));return out;}state=out.state;save();return out;
    }catch(error){toast(errorMessage(error));if(error?.needsRetry&&$('#portal-dialog').open)closeDialog();syncOperation();return {ok:false,error};}
  }
  function setView(next,{focus=false}={}) {
    const allowed=mode==='admin'?['admin-orders','inventory','members','projects','catalogue','orders']:['projects','catalogue','orders'];
    if(!allowed.includes(next))return;
    view=next;query='';category='all';favoritesOnly=false;render();
    if(next==='members'&&!isDemo())refreshInvitations();
    if(focus){$('#portal-main').focus({preventScroll:true});$('#portal-main').scrollIntoView({behavior:'smooth',block:'start'});}
  }
  function renderNavigation() {
    document.body.dataset.portalMode=mode;
    const pending=model.listOrders(state,actorId,{view:'pending'}).length;
    const entries=mode==='admin'?[...(!isDemo()?[['projects','house','Chantiers']]:[]),['admin-orders','orders','Commandes'],['inventory','box','Inventaire'],['members','people','Équipe & accès']]:[['projects','house','Mes chantiers'],['catalogue','cart','Commander'],['orders','orders','Mes commandes']];
    $('#portal-navigation').innerHTML=entries.map(([key,glyph,label])=>`<button type="button" data-view="${key}" aria-current="${key===view?'page':'false'}">${icon(glyph)}<span>${label}</span>${key.includes('orders')&&pending?`<span class="nav-count">${pending}</span>`:''}</button>`).join('');
    document.querySelectorAll('[data-demo-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.demoMode===mode)));
    if(isDemo())$('#demo-profile').innerHTML=state.members.filter(member=>member.active&&member.role===mode).map(member=>`<option value="${esc(member.id)}"${member.id===actorId?' selected':''}>${esc(member.name)} · exemple</option>`).join('');
    else {$('#account-name').textContent=actor()?.name||'Équipe MIR';$('#account-role').textContent=mode==='admin'?'Administration':'Employé';}
  }
  const heading=(eyebrow,title,description,extra='')=>`<div class="view-heading"><div><p class="portal-eyebrow">${esc(eyebrow)}</p><h1>${title}</h1><p>${esc(description)}</p></div>${extra}</div>`;
  const empty=(glyph,title,text,button='')=>`<section class="portal-empty">${icon(glyph)}<h2>${esc(title)}</h2><p>${esc(text)}</p>${button}</section>`;
  const note=(title,text,warning=false)=>`<div class="portal-note${warning?' warning':''}">${icon('info')}<div><strong>${esc(title)}</strong>${esc(text)}</div></div>`;
  function orderNumbers(order) { const n={requested:0,delivered:0,cancelled:0,reserved:0,remaining:0};for(const line of order.lines||[]){const q=Number(line.requestedQty??line.quantity)||0,d=Number(line.deliveredQty)||0,c=Number(line.cancelledQty)||0;n.requested+=q;n.delivered+=d;n.cancelled+=c;n.reserved+=Number(line.reservedQty)||0;n.remaining+=Math.max(0,q-d-c);}return n; }
  function statusBadge(order) { const original=state.orders.find(o=>o.id===order.id)||order,summary=order.orderSummaryOriginal||model.orderSummary(original),n=orderNumbers(original);const label=summary.statusLabel||(n.remaining?(n.delivered?'Livraison partielle':'À préparer'):'Livrée');return `<span class="pill${n.remaining&&n.delivered?' amber':(!n.delivered&&!n.reserved?' muted':'')}">${esc(label)}</span>`; }
  function renderProjects() {
    const jobs=jobsForActor(),orders=model.listOrders(state,actorId,{view:'pending'}),published=jobs.filter(job=>job.publishedVersionId).length;
    const admin=mode==='admin'&&!isDemo();
    return heading(admin?'LES DOSSIERS DE VOTRE ÉQUIPE':'LE QUOTIDIEN DE VOTRE ÉQUIPE',admin?'Des chantiers <em>bien organisés.</em>':'Prêt pour <em>le chantier.</em>',`Bonjour ${actor()?.name?.split(' ')[0]||''}. Retrouvez vos dossiers et demandez votre matériel en quelques gestes.`,admin?`<button type="button" class="button" data-create-job>${icon('plus')}Créer un chantier</button>`:`<button type="button" class="button" data-view="catalogue">${icon('plus')}Commander du matériel</button>`)+
      `<div class="stats-row"><div class="stat-card"><span>${admin?'LES CHANTIERS':'VOS CHANTIERS'}</span><strong>${jobs.length}</strong><small>${isDemo()?'Assignés dans cet aperçu':admin?'Dossiers de l’équipe':'Vos dossiers attribués'}</small></div><div class="stat-card"><span>VERSIONS DE PLAN</span><strong>${published}</strong><small>${isDemo()?'Publications de démonstration':'Plans publiés'}</small></div><div class="stat-card"><span>DEMANDES EN COURS</span><strong>${orders.length}</strong><small>Suivi du matériel</small></div></div><div class="section-label"><h2>${admin?'Les chantiers':'Mes chantiers'}</h2><p>${admin?'Retrouvez les dossiers de l’équipe.':'Les dossiers qui vous sont assignés.'}</p></div>`+
      (jobs.length?`<div class="project-grid">${jobs.map((job,index)=>{const version=state.planVersions.find(v=>v.id===job.publishedVersionId),jobOrders=orders.filter(order=>order.jobId===job.id);return `<article class="project-card">${isDemo()?`<div class="project-cover"><img src="assets/${index%2?'mir-03.jpg':'mir-01.jpg'}" alt="Réalisation MIR illustrant un chantier de démonstration" loading="lazy"><span>CHANTIER DE DÉMONSTRATION</span></div>`:`<div class="project-cover project-cover-neutral">${icon('house')}<span>DOSSIER MIR</span></div>`}<div class="project-body"><div class="project-meta"><span>ÉQUIPE MIR</span><span>${jobOrders.length} demande${jobOrders.length>1?'s':''} en cours</span></div><h3>${esc(job.name)}</h3><p>${esc(job.address||(isDemo()?'Dossier fictif pour essayer le portail':'Adresse à préciser'))}</p><div class="project-plan-row">${icon('plan')}<div><strong>${esc(version?.label||'Plan à publier')}</strong><small>${esc(version?.revision||'Aucune version publiée')}</small></div><span class="pill muted">${version?(isDemo()?'Publié · démo':'Publié'):'À venir'}</span></div><div class="project-actions"><button type="button" class="button secondary" data-job="${esc(job.id)}">Consulter le dossier</button><button type="button" class="button" data-order-for="${esc(job.id)}">Commander ${icon('arrow')}</button></div></div></article>`;}).join('')}</div>`:empty('house',admin?'Votre premier chantier':'Aucun chantier assigné',admin?'Créez un dossier, puis attribuez-le aux membres de votre équipe.':'Un gestionnaire pourra vous attribuer vos dossiers.'))+
      (isDemo()?note('Une version claire pour chaque chantier','Les affectations et les publications de cet aperçu sont simulées. Les vrais plans et les accès seront reliés au service de publication.'):note('Les documents utiles sur le chantier','Retrouvez ici les versions de plan publiées par MIR et les demandes de matériel associées.'));
  }
  
  const reviewAPI=window.MIRStoreReview;
  let reviewState=reviewAPI?.empty()||{annotations:{},hidden:[],showHidden:false};
  function writeReview(){
    try{if(!reviewAPI?.save(localStorage,reviewState))toast('Sauvegarde indisponible : exportez vos notes.');}
    catch(_){toast('Sauvegarde indisponible : exportez vos notes.');}
  }
  function reviewTools(item){
    if(!isDemo()||!reviewAPI)return '';
    const note=reviewState.annotations[item.id]||'',hidden=reviewState.hidden.includes(item.id);
    return '<div class="mir-review-tools"><button type="button" data-review-note="'+esc(item.id)+'">'+
      (note?'Modifier la note':'Annoter')+'</button><button type="button" data-review-remove="'+esc(item.id)+'">'+
      (hidden?'Remettre au magasin':'Retirer du magasin')+'</button>'+
      (note?'<p class="mir-review-note">'+esc(note)+'</p>':'')+'</div>';
  }
  function reviewToolbar(){
    if(!isDemo()||!reviewAPI)return '';
    return '<div class="mir-review-toolbar">'+
      '<button type="button" id="review-export">Exporter les notes JSON</button>'+
      '<button type="button" id="review-import">Importer des notes</button>'+
      '<input type="file" id="review-import-file" accept="application/json,.json" hidden>'+
      (reviewState.hidden.length?'<button type="button" id="review-hidden-toggle">'+
      (reviewState.showHidden?'Masquer les retirés':'Voir les retirés ('+reviewState.hidden.length+')')+'</button>':'')+'</div>';
  }
function imageFor(item) {const path=item.primaryImage||item.image||materialMap.get(item.materialId)?.primaryImage;return typeof path==='string'&&/^(\.\/)?assets\//.test(path)?path:null;}
  function productVisual(item) {const path=imageFor(item);return path?`<img src="${esc(path)}" alt="${esc(item.name)} — illustration du profil ou de la gamme" loading="lazy">`:isFold(item)?foldSVG(item):icon(item.category==='lames-consommables'?'tool':'box');}
  const favoriteIds=()=>state.favorites[actorId]||[];
  function colorOptions(item,value='') {const selected=value||item.baseColorId||'';return `<option value=""${selected?'':' selected'}>${item.colors?.length?'Choisir la couleur':'Teinte à confirmer'}</option>`+(item.colors||[]).map(color=>`<option value="${esc(color.id)}"${selected===color.id?' selected':''}>${esc(color.name)}</option>`).join('');}
  function formatLabel(format){return format?.label||(format?.widthIn?`${num(format.widthIn)} × ${num(format.lengthIn)} po`:format?.lengthIn?`${num(format.lengthIn)} po`:'');}
  function formatOptions(item,value=''){return '<option value="">Choisir le format</option>'+(item.formats||[]).map(format=>`<option value="${esc(format.id)}"${value===format.id?' selected':''}>${esc(formatLabel(format))}</option>`).join('');}
  async function updateProductPreview(card,item){
    const element=card?.querySelector('[data-product-sample]'),caption=card?.querySelector('.product-preview-caption'),M=window.MIRMaterialPreview,material=materialMap.get(item?.materialId);if(!element||!M||!material)return;
    const color=(item.colors||[]).find(c=>c.id===card.querySelector('[data-product-color]')?.value),formatId=card.querySelector('[data-product-format]')?.value||item.formats?.[0]?.id||'';
    const rendering=M.render(element,{...material,selectedFormatId:formatId},color);
    if(caption){const recipe=M.recipe({...material,selectedFormatId:formatId},color);caption.textContent=color?(recipe.kind==='exact_variant'?`${color.name} · photo couleur${recipe.formatMatch?'':' · format à confirmer'}`:`${color.name} · échantillon à l’écran`):'';}
    await rendering;
  }
  function packageLabel(item) {const quantity=item.packaging?.piecesPerBox;if(item.unit!=='boîte'||!Number.isSafeInteger(quantity)||quantity<=0)return '';const noun=/clou/i.test(item.name||'')?'clous':/vis\b/i.test(item.name||'')?'vis':'pièces';return `${num(quantity)} ${noun} / boîte`;}
  function renderCustomModels() {
    const host=$('#store-custom-models');if(!host)return 0;
    if(!isDemo()){host.hidden=true;return 0;}
    if(favoritesOnly||!['all','pliages'].includes(category)){host.hidden=true;return 0;}
    if(!window.MIRCustomModelCards){host.hidden=true;return 0;}
    const options={channel:'store',title:'Les modèles de l’atelier',headingLevel:2,compact:true,hideEmpty:category!=='pliages',query};
    if(!customModelController)customModelController=window.MIRCustomModelCards.mount(host,options);else customModelController.update(options);
    return customModelController.total;
  }
  function productCard(item) {
    const custom=isFold(item),favorite=favoriteIds().includes(item.id),group=item.reviewVariants?.length>1,
      needsColor=!group&&item.colorPolicy!=='none'&&item.colors?.length;
    const variant=group?'<label>Couleur / type<select data-product-variant="'+esc(item.id)+'" aria-label="Couleur ou type de '+esc(item.name)+'">'+
      item.reviewVariants.map((v,i)=>'<option value="'+i+'" data-item-id="'+esc(v.itemId)+'" data-color-id="'+esc(v.colorId||'')+'">'+esc(v.label)+'</option>').join('')+'</select></label>':'';
    return '<article class="product-card mir-simple-card'+(item.id==='mir-request-soffit-staples-1in'?' mir-prime-card':'')+
      '" data-product="'+esc(item.id)+'"><div class="product-visual"><div class="product-sample" data-product-sample>'+productVisual(item)+
      '</div><button type="button" class="favorite-button" data-favorite="'+esc(item.id)+'" aria-pressed="'+favorite+'" aria-label="'+
      (favorite?'Retirer des favoris':'Ajouter aux favoris')+' : '+esc(item.name)+'">'+icon('heart')+'</button></div>'+
      '<p class="product-preview-caption"></p><div class="product-body"><h3>'+esc(item.name)+'</h3>'+
      variant+
      (!custom&&!group&&(item.formats||[]).length>1?'<label>Longueur / format<select data-product-format="'+esc(item.id)+'">'+formatOptions(item)+'</select></label>':'')+
      (!custom&&!group&&item.formats?.length===1?'<p class="product-format">'+esc(formatLabel(item.formats[0]))+'</p>':'')+
      (needsColor&&!custom?'<label>Couleur<select data-product-color="'+esc(item.id)+'">'+colorOptions(item)+'</select></label>':'')+
      (item.referencePending?'<small class="mir-review-pending">Référence ou disponibilité à confirmer</small>':'')+
      '<p class="product-unit">'+esc(item.unit)+(packageLabel(item)?' · '+esc(packageLabel(item)):'')+'</p>'+
      (custom?'<button type="button" class="button secondary full" data-configure="'+esc(item.id)+'">Configurer le pliage</button>':
      '<div class="product-add"><input type="number" data-product-qty="'+esc(item.id)+'" min="'+(item.quantityStep||1)+
      '" step="'+(item.quantityStep||1)+'" value="'+(item.quantityStep||1)+'" aria-label="Quantité de '+esc(item.name)+'">'+
      '<button type="button" class="button" data-add-item="'+esc(item.id)+'">Ajouter</button></div>')+
      reviewTools(item)+'</div></article>';
  }
  function renderCatalogue() {
    return heading('LE MATÉRIEL DU CHANTIER','Tout pour <em>avancer.</em>',isDemo()?'Choisissez votre chantier, ajoutez vos articles et envoyez une demande de démonstration.':'Choisissez votre chantier, ajoutez vos articles et transmettez votre demande à l’équipe MIR.',`<div class="job-choice"><label for="order-job">Pour quel chantier ?<select id="order-job">${jobsForActor().map(job=>`<option value="${esc(job.id)}"${job.id===currentJobId()?' selected':''}>${esc(job.name)}</option>`).join('')||'<option value="">Aucun chantier assigné</option>'}</select></label></div>`)+
      `<div class="order-workspace"><section aria-label="Catalogue du chantier"><div class="catalogue-tools"><label class="search-field"><span class="sr-only">Rechercher un article</span>${icon('search')}<input id="catalogue-search" type="search" placeholder="Clous, soffite, pliage…" value="${esc(query)}"></label><button type="button" class="favorites-filter" id="favorites-filter" aria-pressed="${favoritesOnly}">${icon('heart')}Mes favoris</button>${reviewToolbar()}</div><div class="category-tabs" aria-label="Catégories"><button type="button" data-category="all" aria-pressed="${category==='all'}">Tout le matériel</button>${Object.entries(categoryNames).map(([id,label])=>`<button type="button" data-category="${id}" aria-pressed="${category===id}">${label}</button>`).join('')}</div><p class="catalogue-results" id="catalogue-count"></p><div id="store-custom-models" hidden></div><div class="catalogue-grid" id="catalogue-grid"></div></section><aside class="order-cart" id="order-cart" tabindex="-1" aria-label="Votre demande"></aside></div><div id="mobile-cart"></div>`;
  }
  function renderCatalogueGrid() {
    const words=query.trim().toLocaleLowerCase('fr').split(/\s+/).filter(Boolean),favs=favoriteIds();
    const items=state.catalogue.filter(item=>(category==='all'||item.category===category)&&(!favoritesOnly||favs.includes(item.id))&&words.every(word=>`${item.name} ${item.brand} ${item.manufacturerReference||''} ${categoryNames[item.category]||''} ${item.description||''} ${packageLabel(item)}`.toLocaleLowerCase('fr').includes(word)));
    const presented=(reviewAPI?.present(items,{demo:isDemo()})||items).filter(item=>!isDemo()||reviewState.showHidden||!reviewState.hidden.includes(item.id));
    const modelCount=renderCustomModels();
    $('#catalogue-count').textContent=`${presented.length} article${presented.length>1?'s':''}${modelCount?' · '+modelCount+' modèle'+(modelCount>1?'s':'')+' sur mesure':''} · Disponibilités à confirmer`;
    $('#catalogue-grid').innerHTML=presented.length?presented.map(productCard).join(''):empty('search','Aucun article trouvé','Essayez un autre mot ou une autre catégorie.');
  }
  function lineDescription(line) {const reference=line.manufacturerReference||line.snapshot?.manufacturerReference,packaging=line.packaging||line.snapshot?.packaging;return [line.brand,reference?'Réf. '+reference:null,line.formatLabel||line.snapshot?.formatLabel,packageLabel({...line,packaging}),line.colorName,...Object.entries(line.dimensionsIn||{}).map(([key,value])=>`${key} ${num(value)} po`)].filter(Boolean).join(' · ');}
  function renderCart() {
    const cart=currentCart(),job=jobById(currentJobId());
    $('#order-cart').innerHTML=`<div class="cart-heading"><h2>Votre demande</h2><span class="cart-count">${cart.length}</span></div>${cart.length?`<div class="cart-items">${cart.map(line=>`<div class="cart-item"><div><strong>${esc(line.name)}</strong><small>${esc(lineDescription(line))}</small><div class="cart-qty"><input type="number" data-cart-qty="${esc(line.cartKey)}" value="${line.quantity}" min="${itemById(line.itemId)?.quantityStep||1}" step="${itemById(line.itemId)?.quantityStep||1}" aria-label="Quantité de ${esc(line.name)}"><span>${esc(line.unit)}</span></div></div><button type="button" class="remove-item" data-cart-remove="${esc(line.cartKey)}" aria-label="Retirer ${esc(line.name)}">×</button></div>`).join('')}</div>`:`<div class="cart-empty">${icon('cart')}<p>Ajoutez le matériel dont vous avez besoin.</p></div>`}<form id="create-order-form"><div class="cart-fields"><label>Réception<select name="deliveryMode"><option value="delivery">Livraison au chantier</option><option value="pickup">Ramassage</option></select></label><label>Précision pour l’équipe<textarea name="note" rows="2" maxlength="500" placeholder="Accès, étage, détail utile…"></textarea></label></div><div class="cart-submit-row"><button type="submit" class="button full"${!cart.length||!job?' disabled':''}>${isDemo()?'Créer la demande démo':'Envoyer ma demande'} ${icon('arrow')}</button><p class="cart-local-note">${isDemo()?'Simulation locale. Aucun achat, envoi ni paiement n’est effectué.':'Votre demande sera transmise au responsable MIR. Les quantités reçues seront suivies ici.'}</p></div></form>`;
    $('#mobile-cart').innerHTML=cart.length?`<div class="mobile-cart-bar"><div><p>${cart.length} article${cart.length>1?'s':''} dans la demande</p><small>${esc(job?.name||'Choisir un chantier')}</small></div><button type="button" data-scroll-cart>Voir la demande ↑</button></div>`:'';
  }
  function orderCard(order,admin) {
    const original=state.orders.find(o=>o.id===order.id)||order,n=orderNumbers(original),member=state.members.find(m=>m.id===order.requestedById),deliveries=state.deliveries.filter(d=>d.orderId===order.id);
    const rows=order.lines.map(line=>{const remaining=Math.max(0,(line.requestedQty??line.quantity)-line.deliveredQty-line.cancelledQty);return `<div class="order-line"><div><strong>${esc(line.name)}</strong><small>${esc(lineDescription(line))}</small><small>Demandé : ${num(line.requestedQty??line.quantity)} ${esc(line.unit)}</small></div><div><span class="qty-big">${num(line.deliveredQty)}</span><small>${esc(line.unit)} livré${line.deliveredQty>1?'s':''}</small></div><div><span class="qty-big${remaining?' qty-pending':''}">${num(remaining)}</span><small>${esc(line.unit)} restant${remaining>1?'s':''}</small></div></div>`;}).join('');
    return `<article class="order-card" data-order="${esc(order.id)}"><div class="order-top"><div><span class="order-number">${esc(order.id)}</span><h2>${esc(jobById(order.jobId)?.name||'Chantier')}</h2><small>${date(order.createdAt)} · ${esc(member?.name||'Équipe MIR')}</small></div>${statusBadge(order)}</div><div class="order-info"><span>${order.deliveryMode==='pickup'?'Ramassage':'Livraison au chantier'}</span>${order.note?`<span>${esc(order.note)}</span>`:''}</div><div class="order-lines">${rows}</div><div class="order-bottom"><p>${n.remaining?(orderFilter==='history'?'Ces articles sont clôturés. D’autres articles de cette demande restent en cours.':'Le reliquat reste visible jusqu’à sa livraison ou son annulation.'):(isDemo()?'Cette demande est clôturée dans l’aperçu.':'Cette demande est clôturée.')}</p>${admin&&n.remaining&&orderFilter!=='history'?`<div class="admin-actions"><button type="button" class="button secondary" data-reserve-order="${esc(order.id)}">Réserver</button><button type="button" class="button" data-deliver-order="${esc(order.id)}">Saisir une livraison</button><button type="button" class="button quiet" data-cancel-order="${esc(order.id)}">Annuler le reliquat</button></div>`:''}</div>${deliveries.length?`<details class="delivery-history"><summary>${deliveries.length} livraison${deliveries.length>1?'s':''} enregistrée${deliveries.length>1?'s':''} · voir le détail</summary><ul>${deliveries.map(d=>`<li>${date(d.createdAt||d.at)}${(d.lines||[]).map(line=>`<span class="delivery-event-line">${num(line.quantity)} ${esc(line.unit||original.lines.find(l=>l.id===line.lineId)?.unit||'')} · ${esc(line.name||original.lines.find(l=>l.id===line.lineId)?.name||line.lineId)}</span>`).join('')}</li>`).join('')}</ul></details>`:''}</article>`;
  }
  function renderOrders(admin=false) {
    const all=model.listOrders(state,actorId,{view:'all'}),orders=model.listOrders(state,actorId,{view:orderFilter});
    return heading(admin?'LA PRÉPARATION DES CHANTIERS':'VOS DEMANDES DE MATÉRIEL',admin?'Préparer. <em>Livrer. Suivre.</em>':'Du matériel. <em>Du suivi.</em>',admin?'Réservez le stock connu, saisissez les quantités réellement livrées et gardez le reliquat visible.':'Retrouvez les articles attendus et l’historique des articles reçus.')+
      (admin?`<div class="stats-row"><div class="stat-card"><span>À PRÉPARER</span><strong>${all.filter(o=>{const n=orderNumbers(o);return n.remaining&&!n.delivered;}).length}</strong><small>Demandes ouvertes</small></div><div class="stat-card"><span>LIVRAISONS PARTIELLES</span><strong>${all.filter(o=>{const n=orderNumbers(o);return n.remaining&&n.delivered;}).length}</strong><small>Reliquats conservés</small></div><div class="stat-card"><span>DEMANDES CLÔTURÉES</span><strong>${all.filter(o=>!orderNumbers(o).remaining).length}</strong><small>${isDemo()?'Dans cet aperçu':'Demandes terminées'}</small></div></div>`:'')+
      `<div class="order-filters" aria-label="Filtrer les demandes">${[['pending','En cours'],['history','Historique'],['all','Tout voir']].map(([id,label])=>`<button type="button" data-order-filter="${id}" aria-pressed="${id===orderFilter}">${label}</button>`).join('')}</div><div class="orders-list">${orders.length?orders.map(order=>orderCard(order,admin)).join(''):empty('orders','Aucune demande dans cette vue',orderFilter==='history'?'Les articles entièrement reçus ou annulés apparaîtront ici.':'Ajoutez du matériel depuis le catalogue de chantier.')}</div>`+
      (admin?note('Le stock commence à « inconnu »',isDemo()?'Saisissez un stock de simulation dans Inventaire avant de réserver ou livrer. Le portail ne crée aucun stock réel.':'Enregistrez le comptage physique dans Inventaire avant de réserver ou livrer. Les réservations ne modifient pas le stock physique.'): '');
  }
  function stockHTML(stock,unit) {return stock.known?`<strong>${num(stock.available)} ${esc(unit)}</strong><small>Disponible · ${num(stock.reserved)} réservé${stock.reserved>1?'s':''}</small>`:`<strong>Stock inconnu</strong><small>${isDemo()?'Comptage de simulation requis':'Comptage physique requis'}</small>`;}
  function inventoryCard(item) {
    const conf=model.configureLine(state,{itemId:item.id,quantity:item.quantityStep||1}),stock=conf.ok?stockFor(conf.line.stockKey):{known:false};
    return `<form class="inventory-card" data-inventory-form="${esc(item.id)}"><div><h3>${esc(item.name)}</h3><p>${esc(item.brand)} · ${esc(item.unit)}${packageLabel(item)?' · '+esc(packageLabel(item)):''}${item.manufacturerReference?' · Réf. '+esc(item.manufacturerReference):''}</p>${(item.formats||[]).length>1?`<label class="inventory-format-label">Format à compter<select name="formatId" data-inventory-format="${esc(item.id)}" required>${formatOptions(item)}</select></label>`:item.formats?.length===1?`<p class="product-format">${esc(formatLabel(item.formats[0]))}</p>`:''}${item.colorPolicy!=='none'&&item.colors?.length?`<label class="inventory-color-label">Couleur à compter<select name="colorId" data-inventory-color="${esc(item.id)}"${item.colorPolicy==='required'?' required':''}>${colorOptions(item)}</select></label>`:''}${item.colorNote?`<p class="product-color-note">${esc(item.colorNote)}</p>`:''}</div><div class="stock-value" data-inventory-value="${esc(item.id)}">${stockHTML(stock,item.unit)}</div><div class="stock-editor"><input name="quantity" type="number" min="0" step="${item.quantityStep||1}" placeholder="Stock"${stock.known?` value="${stock.onHand}"`:''} aria-label="Stock physique ${isDemo()?'de simulation ':''}de ${esc(item.name)}" required><button type="submit" class="button secondary">Enregistrer</button></div></form>`;
  }
  function renderInventory() {return heading('LE MATÉRIEL DISPONIBLE','Un stock <em>bien suivi.</em>',isDemo()?'Saisissez un comptage de simulation. Chaque couleur et chaque configuration possède son propre stock.':'Enregistrez vos quantités physiques. Chaque couleur, format et configuration possède son propre stock.')+`<div class="inventory-tools"><label class="search-field"><span class="sr-only">Rechercher dans l’inventaire</span>${icon('search')}<input id="inventory-search" type="search" placeholder="Rechercher une référence ou un fabricant…" value="${esc(query)}"></label><p>${isDemo()?'Les quantités affichées sont des données de démonstration.':'Physique, réservé et disponible : des quantités distinctes, partagées avec l’équipe.'}</p></div><section id="fabricated-inventory"></section><div class="inventory-layout" id="inventory-list"></div>`;}
  function renderInventoryList() {
    const words=query.toLocaleLowerCase('fr').trim().split(/\s+/).filter(Boolean),matches=item=>words.every(word=>`${item.name} ${item.brand} ${item.manufacturerReference||''} ${packageLabel(item)}`.toLocaleLowerCase('fr').includes(word));
    const items=state.catalogue.filter(item=>!isFold(item)&&matches(item));$('#inventory-list').innerHTML=items.length?items.map(inventoryCard).join(''):empty('box','Aucune référence trouvée','Essayez un autre mot.');
    const configured=new Map();for(const order of state.orders)for(const line of order.lines||[])if(isFold(itemById(line.itemId))&&matches(line))configured.set(line.stockKey,line);
    $('#fabricated-inventory').innerHTML=configured.size?`<div class="section-label" style="margin-top:25px"><h2>Pliages demandés · pièces fabriquées</h2></div>${note('Un comptage après fabrication','Ce stock concerne les pièces finies de dimensions et de couleur identiques. Aucun rouleau d’aluminium n’est consommé automatiquement.')}<div class="inventory-layout">${[...configured.values()].map(line=>`<form class="inventory-card" data-fabricated-stock="${esc(line.stockKey)}" data-stock-unit="${esc(line.unit)}"><div><h3>${esc(line.name)}</h3><p>${esc(lineDescription(line))}</p></div><div class="stock-value">${stockHTML(stockFor(line.stockKey),line.unit)}</div><div class="stock-editor"><input name="quantity" type="number" min="0" step="1" placeholder="Stock" aria-label="Nombre de pièces fabriquées" required><button type="submit" class="button secondary">Enregistrer</button></div></form>`).join('')}</div>`:'';
  }
  const memberJobs=member=>state.jobs.filter(job=>(member.jobIds||[]).includes(job.id)||(job.assignedMemberIds||[]).includes(member.id));
  function renderMembers() {
    const members=state.members.filter(member=>member.role==='employee'),canInvite=!isDemo()&&portalClient?.config.invitationsEnabled;
    const rows=isDemo()?state.invitationDrafts:invitations;
    const memberCards=members.length?members.map(member=>`<article class="member-card"><div class="member-avatar" aria-hidden="true">${esc((member.name||'MIR').split(' ').map(n=>n[0]).slice(0,2).join(''))}</div><div class="member-body"><h3>${esc(member.name||'Membre MIR')}</h3><p>${esc(member.email||(isDemo()?'Profil fictif · aucun compte connecté':''))}</p><span class="pill ${member.active?'muted':'danger'}">${member.active?(isDemo()?'Actif dans la démo':'Accès actif'):(isDemo()?'Désactivé dans la démo':'Accès suspendu')}</span><div class="member-jobs">${memberJobs(member).map(job=>`<span class="pill">${esc(job.name)}</span>`).join('')||'<span class="pill muted">Aucun chantier</span>'}</div><button type="button" class="button quiet" data-assign-member="${esc(member.id)}">Modifier les chantiers ${icon('arrow')}</button>${!isDemo()?`<button type="button" class="button quiet" data-member-active="${esc(member.id)}" data-active="${member.active?'false':'true'}">${member.active?'Suspendre l’accès':'Réactiver l’accès'}</button>`:''}</div></article>`).join(''):empty('people','Votre équipe commence ici','Invitez vos employés et attribuez leurs chantiers.');
    const invitationRows=rows.length?`<div class="invitation-drafts"><h3>${isDemo()?'Brouillons d’invitation':'Invitations'}</h3>${rows.map(row=>`<div class="invitation-row"><strong>${esc(row.email)}</strong><small>${isDemo()?'Brouillon local · aucun envoi.':esc(invitationLabel(row))}</small>${!isDemo()&&canInvite&&!['accepted','revoked','expired'].includes(row.status)?`<button type="button" class="button quiet" data-revoke-invitation="${esc(row.id||row.invitationId)}">Révoquer ce lien</button>`:''}</div>`).join('')}</div>`:'';
    return heading('L’ÉQUIPE & LES ACCÈS','Chacun a <em>son dossier.</em>',isDemo()?'Préparez les affectations de chantier et les invitations. Cet aperçu ne crée aucun compte réel.':'Attribuez les chantiers et gérez les accès de votre équipe.')+
      `<div class="admin-grid"><section><div class="members-list">${memberCards}</div>${invitationRows}</section><aside class="admin-panel"><h2>Inviter un employé</h2><p>${isDemo()?'Préparez le courriel et les chantiers auxquels la personne pourra accéder.':canInvite?'Le lien d’accès est envoyé à cette adresse. La personne pourra consulter uniquement les chantiers attribués.':'L’envoi des liens sécurisés doit être activé avant la première invitation.'}</p><form id="invitation-form"><label class="form-wide">Adresse courriel<input name="email" type="email" maxlength="254" placeholder="nom@entreprise.ca" required${!isDemo()&&!canInvite?' disabled':''}></label><fieldset class="form-wide"${!isDemo()&&!canInvite?' disabled':''}><legend>Chantiers à attribuer</legend><div class="checklist">${state.jobs.map(job=>`<label class="checkline"><input name="jobIds" type="checkbox" value="${esc(job.id)}"><span>${esc(job.name)}</span></label>`).join('')||'<p>Créez un chantier pour l’attribuer à votre équipe.</p>'}</div></fieldset><p class="cart-local-note form-wide">${isDemo()?'Aucun courriel ni lien sécurisé n’est généré.':canInvite?'Invitation MIR valable 72 heures. Le lien de connexion reçu par courriel peut expirer plus tôt.':'Les comptes et les envois ne sont pas actifs sur cet aperçu.'}</p><button type="submit" class="button form-wide"${!isDemo()&&!canInvite?' disabled':''}>${isDemo()?'Enregistrer le brouillon':canInvite?'Envoyer l’invitation':'Invitations en cours d’activation'} ${icon('arrow')}</button></form></aside></div>`;
  }
  function invitationLabel(row) {
    if(row.status==='accepted')return 'Invitation acceptée';
    if(row.status==='revoked')return 'Lien révoqué';
    if(row.status==='expired')return 'Lien expiré';
    if(row.deliveryStatus==='sent'||row.delivery_status==='sent')return `Courriel demandé · invitation valable jusqu’au ${date(row.expiresAt||row.expires_at)}`;
    if(['unknown','dispatching'].includes(row.deliveryStatus||row.delivery_status))return 'Envoi à vérifier avant de réémettre un lien';
    if(row.deliveryStatus==='failed'||row.delivery_status==='failed')return 'Envoi refusé';
    return 'Invitation préparée · envoi à vérifier';
  }
  async function refreshInvitations() {
    if(isDemo()||!portalClient?.config.invitationsEnabled)return;
    const forActor=actorId;
    try {const rows=await portalClient.listInvitations();if(forActor!==actorId||view!=='members')return;invitations=rows;render();}
    catch(error){toast(errorMessage(error));}
  }
  function render() {if(!state)return renderAuth();if(customModelController){customModelController.destroy();customModelController=null;}renderNavigation();$('#portal-content').innerHTML=view==='projects'?renderProjects():view==='catalogue'?renderCatalogue():view==='orders'?renderOrders(false):view==='admin-orders'?renderOrders(true):view==='inventory'?renderInventory():renderMembers();if(view==='catalogue'){renderCatalogueGrid();renderCart();}if(view==='inventory')renderInventoryList();syncOperation();}
  function openDialog(html) {$('#portal-dialog-content').innerHTML=html;if(!$('#portal-dialog').open)$('#portal-dialog').showModal();}
  function closeDialog() {$('#portal-dialog').close();}
  function dialogError(message) {let element=$('#dialog-error');if(!element){element=document.createElement('p');element.id='dialog-error';element.className='dialog-error';element.setAttribute('role','alert');$('#portal-dialog-content').append(element);}element.hidden=false;element.textContent=message;element.scrollIntoView({block:'nearest'});}
  const dialogHeader=(eyebrow,title,intro='')=>`<p class="dialog-eyebrow">${esc(eyebrow)}</p><h2 class="dialog-title" id="portal-dialog-title">${esc(title)}</h2>${intro?`<p class="dialog-intro">${esc(intro)}</p>`:''}`;
  function safeDocumentURL(value) {try{const url=new URL(value,location.href);return /^https?:$/.test(url.protocol)?url.href:null;}catch{return null;}}
  function showJob(id) {
    const job=jobsForActor().find(candidate=>candidate.id===id);if(!job)return;
    const version=state.planVersions.find(v=>v.id===job.publishedVersionId);
    const documents=isDemo()?(version?.documents||[]).filter(doc=>safeDocumentURL(doc.url)):(version?.documents||[]).filter(doc=>doc.id);
    const links=documents.map(doc=>isDemo()?`<a class="document-link" href="${esc(safeDocumentURL(doc.url))}" target="_blank" rel="noopener">${icon('plan')}<span>${esc(doc.name||doc.label||'Plan publié')}</span>${icon('arrow')}</a>`:`<button type="button" class="document-link" data-download-plan="${esc(doc.id)}" data-document-name="${esc(doc.name||'Plan-chantier.pdf')}"${portalClient?.config.documentsEnabled?'':' disabled'}>${icon('plan')}<span>${esc(doc.name||'Plan publié')}</span>${icon('arrow')}</button>`).join('');
    openDialog(dialogHeader(isDemo()?'DOSSIER DE DÉMONSTRATION':'DOSSIER CHANTIER',job.name,version?`${version.label} · ${version.revision}`:'Aucune version publiée')+
      (documents.length?links:isDemo()?note('Aucun PDF réel n’est joint à cet exemple','Ce dossier illustre une version publiée. Aucun plan client n’est joint à la démonstration.'):note('Le plan sera disponible ici','L’administrateur publiera la version destinée au chantier.'))+
      (!isDemo()&&documents.length&&!portalClient?.config.documentsEnabled?note('Accès aux documents en préparation','Les téléchargements sécurisés seront disponibles après l’activation de la publication des plans.'):'')+
      ((version?.notes||[]).length?`<ul class="dialog-list">${version.notes.map(n=>`<li>${esc(typeof n==='string'?n:n.text||n.message||'')}</li>`).join('')}</ul>`:'')+
      `<div class="dialog-actions"><button type="button" class="button secondary" data-close-dialog>Fermer</button><button type="button" class="button" data-order-for="${esc(job.id)}">Commander pour ce chantier ${icon('arrow')}</button></div>`);
  }
  function foldSVG(item,values={}) {
    const profile=String(item.profile||item.id||'').toLowerCase();let points;
    if(profile.includes('column')||profile.includes('colonne'))points=[[95,35],[200,35],[200,125],[95,125],[95,35]];
    else if(profile.includes('beam')||profile.includes('poutre'))points=[[90,35],[90,125],[210,125],[210,35]];
    else if(profile==='j'||/-j-/.test(profile))points=[[110,35],[110,125],[200,125],[200,90]];
    else if(profile==='z'||/-z-/.test(profile))points=[[70,40],[150,40],[150,125],[240,125]];
    else points=[[110,35],[110,125],[230,125]];
    const keys=(item.measureFields||[]).map(field=>field.key).filter(key=>key!=='L');
    const labels=points.slice(1).map((b,index)=>{const a=points[index],vertical=a[0]===b[0],key=keys[index]||String.fromCharCode(65+index);return `<text x="${(a[0]+b[0])/2+(vertical?-17:0)}" y="${(a[1]+b[1])/2+(vertical?5:-10)}" text-anchor="${vertical?'end':'middle'}" fill="#31573b" font-size="13" font-weight="600">${esc(key)}${values[key]?` · ${esc(values[key])}`:''}</text>`;}).join('');
    return `<svg viewBox="0 0 340 170" role="img" aria-label="Schéma de repérage des mesures du pliage" xmlns="http://www.w3.org/2000/svg"><polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#697a65" stroke-width="11" stroke-linejoin="miter"/><polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#c7d2bd" stroke-width="6" stroke-linejoin="miter"/>${labels}<path d="M275 38v87m-4-82 4-5 4 5m-8 77 4 5 4-5" fill="none" stroke="#8e9b83" stroke-width="1.4"/><text x="285" y="85" fill="#31573b" font-size="13" font-weight="600">L${values.L?` · ${esc(values.L)}`:''}</text><text x="170" y="158" text-anchor="middle" fill="#7a8570" font-size="9">Schéma de repérage · non à l’échelle</text></svg>`;
  }
  function showFold(id) {
    const item=itemById(id);if(!isFold(item))return;
    openDialog(dialogHeader(item.brand||'ATELIER MIR',item.name,'Indiquez chaque côté en pouces. Les fractions comme 3 1/2 sont acceptées.')+
      `<div class="fold-diagram" id="fold-diagram">${foldSVG(item)}</div><form id="fold-form" class="dialog-form" data-item="${esc(id)}"><div class="dialog-fields">${(item.measureFields||[]).map(field=>`<label>${esc(field.key)} · ${esc(field.label)} (po)<input name="dim-${esc(field.key)}" data-fold-dimension="${esc(field.key)}" type="text" inputmode="decimal" placeholder="${field.key==='L'?'120':'3 1/2'}"${field.required?' required':''}></label>`).join('')}<label>Couleur fabricant<select name="colorId"${item.colorPolicy==='required'?' required':''}>${colorOptions(item)}</select></label><label>Quantité (${esc(item.unit)})<input name="quantity" type="number" value="1" min="1" step="${item.quantityStep||1}" required></label></div>${item.colorNote?note('Couleur du pliage',item.colorNote):''}<p class="cart-local-note">La longueur maximale et les côtés requis sont vérifiés. Les mesures et la faisabilité du profil seront à valider avant fabrication.</p><p id="dialog-error" class="dialog-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button secondary" data-close-dialog>Annuler</button><button type="submit" class="button">Ajouter à la demande ${icon('plus')}</button></div></form>`);
  }
  function addToCart(spec) {
    const configured=model.configureLine(state,spec);if(!configured.ok)return configured;
    const cart=currentCart(),existing=cart.find(line=>line.stockKey===configured.line.stockKey);
    if(existing){const combined=model.configureLine(state,{...spec,quantity:existing.quantity+configured.line.quantity});if(!combined.ok)return combined;Object.assign(existing,combined.line,{cartKey:existing.cartKey});}
    else cart.push({...configured.line,cartKey:requestId()});save();return configured;
  }
  function showDelivery(id) {
    const order=model.listOrders(state,actorId,{view:'all'}).find(o=>o.id===id);if(!order)return;
    const lines=order.lines.filter(line=>(line.requestedQty??line.quantity)-line.deliveredQty-line.cancelledQty>0);
    openDialog(dialogHeader(isDemo()?'LIVRAISON DE DÉMONSTRATION':'LIVRAISON AU CHANTIER',`Livrer ${order.id}`,isDemo()?'Indiquez uniquement les quantités réellement remises dans ce scénario. Le reliquat restera ouvert.':'Indiquez les quantités réellement remises. Les articles restants resteront dans les commandes en cours.')+
      `<form id="delivery-form" class="dialog-form" data-order="${esc(id)}" data-request="${requestId()}">${lines.map(line=>{const remaining=(line.requestedQty??line.quantity)-line.deliveredQty-line.cancelledQty,stock=stockFor(line.stockKey);return `<label class="delivery-input-row"><span><strong>${esc(line.name)}</strong><small>${esc(lineDescription(line))}</small><small>${num(remaining)} ${esc(line.unit)} à livrer · ${stock.known?`${num(stock.onHand)} au stock physique`:'stock inconnu, renseigner l’inventaire'}</small></span><input name="line-${esc(line.id)}" type="number" value="0" min="0" max="${remaining}" step="${itemById(line.itemId)?.quantityStep||1}" aria-label="Quantité livrée de ${esc(line.name)}" required></label>`;}).join('')}${note('Une livraison garde sa trace','La réserve disponible et le stock sont vérifiés. Un double clic sur cette même livraison ne la comptabilise pas deux fois.')}<p id="dialog-error" class="dialog-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button secondary" data-close-dialog>Annuler</button><button type="submit" class="button">Enregistrer la livraison ${icon('check')}</button></div></form>`);
  }
  function showAssignment(id) {
    const member=state.members.find(m=>m.id===id);if(!member)return;const assigned=new Set(memberJobs(member).map(j=>j.id));
    openDialog(dialogHeader(isDemo()?'AFFECTATIONS DE DÉMONSTRATION':'ACCÈS AUX CHANTIERS',member.name,isDemo()?'Choisissez les dossiers qui apparaîtront dans son aperçu employé.':'Choisissez les dossiers que cet employé pourra consulter et pour lesquels il pourra commander.')+
      `<form id="assignment-form" class="dialog-form" data-member="${esc(id)}"><div class="checklist">${state.jobs.map(job=>`<label class="checkline"><input type="checkbox" name="jobIds" value="${esc(job.id)}"${assigned.has(job.id)?' checked':''}><span>${esc(job.name)}<small>${isDemo()?'Dossier de démonstration':'Accès aux plans publiés et aux demandes'}</small></span></label>`).join('')}</div><p id="dialog-error" class="dialog-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button secondary" data-close-dialog>Annuler</button><button type="submit" class="button">Enregistrer les affectations</button></div></form>`);
  }
  function showAbout() {openDialog(dialogHeader('À PROPOS DE CET APERÇU','Un portail à essayer.','Cette maquette utilise uniquement des données de démonstration enregistrées localement dans ce navigateur.')+note('Le sélecteur de présentation n’est pas une authentification','Il permet de comparer les écrans employé et gestion. Il ne constitue aucune protection d’accès réelle.')+`<div class="auth-preview"><button type="button" class="button secondary" disabled>Connexion Google · à intégrer</button><button type="button" class="button secondary" disabled>Connexion par courriel · à intégrer</button></div><p class="dialog-intro">Les comptes, les invitations, les plans publiés et les livraisons partagées devront être reliés à un service sécurisé. Aucun message, achat ni paiement ne part de cet aperçu.</p><div class="dialog-actions"><button type="button" class="button" data-close-dialog>Continuer l’aperçu</button></div>`);}
  async function handleClick(event) {
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-close-dialog'))return closeDialog();
    if(button.id==='auth-confirm-link')return runAuth(async()=>{const callback=authCallback;authCallback=null;await portalClient.completeCallback(callback);});
    if(button.id==='auth-google')return runAuth(()=>portalClient.signInGoogle());
    if(button.id==='auth-retry'||button.id==='portal-refresh')return runAuth(()=>portalClient.refresh(),false);
    if(button.id==='portal-signout'||button.id==='auth-signout')return runAuth(()=>portalClient.signOut());
    if(button.id==='auth-accept-invitation')return runAuth(async()=>{await portalClient.acceptInvitation(invitationToken);clearInvitation();authMessage='Votre accès MIR est activé.';applyConnectedStatus(portalClient.getStatus());});
    if(button.id==='portal-retry-action')return retryOperation();
    if(!state)return;
    if(!isDemo()&&clientStatus?.pending&&!button.dataset.view&&!button.dataset.job&&!button.dataset.orderFilter&&!button.hasAttribute('data-scroll-cart')){toast('Vérifiez d’abord l’action dont la confirmation manque.');return;}
    if(button.hasAttribute('data-create-job')){openDialog(dialogHeader('NOUVEAU DOSSIER','Créer un chantier','Donnez un nom clair au dossier. Vous pourrez ensuite l’attribuer à votre équipe.')+'<form id="create-job-form" class="dialog-form"><label>Nom du chantier<input name="name" maxlength="160" required placeholder="Adresse ou nom du projet"></label><label>Adresse<input name="address" maxlength="300" autocomplete="street-address"></label><p id="dialog-error" class="dialog-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button secondary" data-close-dialog>Annuler</button><button type="submit" class="button">Créer le chantier</button></div></form>');return;}
    if(button.dataset.memberActive){const out=await act('SET_MEMBER_ACTIVE',{memberId:button.dataset.memberActive,active:button.dataset.active==='true'});if(out.ok){render();toast(button.dataset.active==='true'?'Accès réactivé.':'Accès suspendu.');}return;}
    if(button.dataset.revokeInvitation){const out=await act('REVOKE_INVITATION',{invitationId:button.dataset.revokeInvitation});if(out.ok){toast('Le lien a été révoqué.');await refreshInvitations();}return;}
    if(button.dataset.downloadPlan){button.disabled=true;try{const blob=await portalClient.downloadPlan(button.dataset.downloadPlan),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=(button.dataset.documentName||'Plan-chantier.pdf').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-');link.rel='noopener';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(error){dialogError(errorMessage(error));}finally{button.disabled=false;}return;}
    if(button.dataset.demoMode&&isDemo()){mode=button.dataset.demoMode;actorId=state.members.find(member=>member.active&&member.role===mode)?.id||actorId;view=mode==='admin'?'admin-orders':'projects';orderFilter='pending';query='';render();return;}
    if(button.dataset.view){if($('#portal-dialog').open)closeDialog();return setView(button.dataset.view,{focus:true});}
    if(button.dataset.job)return showJob(button.dataset.job);
    if(button.dataset.orderFor){ui.jobs[actorId]=button.dataset.orderFor;save();if($('#portal-dialog').open)closeDialog();return setView('catalogue',{focus:true});}
    if(button.dataset.category){category=button.dataset.category;document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));return renderCatalogueGrid();}
    if(button.id==='favorites-filter'){favoritesOnly=!favoritesOnly;button.setAttribute('aria-pressed',String(favoritesOnly));return renderCatalogueGrid();}
    if(button.dataset.favorite){const out=await act('TOGGLE_FAVORITE',{itemId:button.dataset.favorite});if(out.ok){if(favoritesOnly)renderCatalogueGrid();else{const selected=favoriteIds().includes(button.dataset.favorite);button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',`${selected?'Retirer des favoris':'Ajouter aux favoris'} : ${itemById(button.dataset.favorite)?.name||''}`);}}return;}
    
     if(isDemo()&&button.id==='review-export'&&reviewAPI){
       const json=reviewAPI.exportAnnotations(reviewState,state.catalogue);
       const blob=new Blob([JSON.stringify(json,null,2)],{type:'application/json;charset=utf-8'});
       const url=URL.createObjectURL(blob),link=document.createElement('a');
       link.href=url;link.download='MIR-annotations-magasin.json';
       document.body.append(link);link.click();link.remove();
       setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Notes exportées en JSON.');return;
     }
     if(isDemo()&&button.id==='review-import'){document.querySelector('#review-import-file')?.click();return;}
     if(isDemo()&&button.id==='review-hidden-toggle'){
       reviewState.showHidden=!reviewState.showHidden;
       const y=window.scrollY;render();window.scrollTo(0,y);return;
     }
     if(isDemo()&&button.dataset.reviewNote){
       const id=button.dataset.reviewNote,item=itemById(id);if(!item)return;
       openDialog(dialogHeader('REVUE MAGASIN','Annoter '+item.name,'La note reste sur cet appareil, et peut être exportée.')+
         '<form id="review-annotation-form" data-review-item="'+esc(id)+'">'+
         '<label>Note<textarea name="note" maxlength="2000" rows="6">'+esc(reviewState.annotations[id]||'')+'</textarea></label>'+
         '<div class="dialog-actions"><button class="button secondary" type="button" data-close-dialog>Annuler</button>'+
         '<button class="button" type="submit">Enregistrer la note</button></div></form>');return;
     }
     if(isDemo()&&button.dataset.reviewRemove){
       const id=button.dataset.reviewRemove;if(!itemById(id))return;
       const hidden=new Set(reviewState.hidden);hidden.has(id)?hidden.delete(id):hidden.add(id);
       reviewState.hidden=[...hidden];writeReview();
       const y=window.scrollY;render();window.scrollTo(0,y);
       toast(hidden.has(id)?'Article masqué uniquement dans cette revue.':'Article remis au magasin.');return;
     }
     if(button.dataset.configure)return showFold(button.dataset.configure);
    if(button.dataset.addItem){const card=button.closest('[data-product]'),chosen=reviewAPI?.selection(card,itemById),item=chosen?.item||itemById(button.dataset.addItem),out=addToCart({itemId:item?.id||button.dataset.addItem,quantity:Number(card.querySelector('[data-product-qty]').value),colorId:chosen?.colorId||card.querySelector('[data-product-color]')?.value||undefined,formatId:card.querySelector('[data-product-format]')?.value||(card.querySelector('[data-product-variant]')?item?.formats?.[0]?.id:undefined)});if(!out.ok)toast(errorMessage(out.error));else{renderCart();toast('Article ajouté à votre demande.');}return;}
    if(button.dataset.cartRemove){ui.carts[actorId]=currentCart().filter(line=>line.cartKey!==button.dataset.cartRemove);save();return renderCart();}
    if(button.hasAttribute('data-scroll-cart')){$('#order-cart').scrollIntoView({behavior:'smooth',block:'start'});$('#order-cart').focus({preventScroll:true});return;}
    if(button.dataset.orderFilter){orderFilter=button.dataset.orderFilter;return render();}
    if(button.dataset.reserveOrder){const out=await act('RESERVE_ORDER',{orderId:button.dataset.reserveOrder});if(out.ok){render();const warnings=out.result?.warnings||[];if(warnings.length){const reserved=out.result?.reservedQty||0,units=out.result?.summary?.byUnit;let counts=[];if(Array.isArray(units))counts=units.filter(u=>u.reservedQty>0||u.reserved>0).map(u=>`${num(u.reservedQty??u.reserved)} ${u.unit}`);else if(units&&typeof units==='object')counts=Object.entries(units).filter(([,u])=>(u.reservedQty??u.reserved)>0).map(([unit,u])=>`${num(u.reservedQty??u.reserved)} ${u.unit||unit}`);openDialog(dialogHeader('VÉRIFICATION DU STOCK',reserved?'Réservation partielle':'Le stock reste à vérifier',reserved?`${counts.length?counts.join(' · '):'Une partie des articles'} réservée. Les autres quantités restent à préparer.`:'Aucune quantité réservée. Renseignez le stock avant la préparation.')+`<ul class="dialog-list">${warnings.map(w=>`<li>${esc(typeof w==='string'?w:w.message||w.code)}</li>`).join('')}</ul><div class="dialog-actions"><button type="button" class="button secondary" data-close-dialog>Fermer</button><button type="button" class="button" data-view="inventory">Vérifier l’inventaire ${icon('arrow')}</button></div>`);}else toast((out.result?.reservedQty||0)>0?'Stock réservé pour cette demande.':'Les quantités disponibles étaient déjà réservées.');}return;}
    if(button.dataset.deliverOrder)return showDelivery(button.dataset.deliverOrder);
    if(button.dataset.cancelOrder){openDialog(dialogHeader(isDemo()?'RELIQUAT DE DÉMONSTRATION':'RELIQUAT DE LA DEMANDE','Annuler les quantités restantes ?','Les livraisons déjà enregistrées restent dans l’historique. Cette action ne concerne que le reliquat de cette demande.')+`<div class="dialog-actions"><button type="button" class="button secondary" data-close-dialog>Garder le reliquat</button><button type="button" class="button danger" data-confirm-cancel="${esc(button.dataset.cancelOrder)}">Annuler le reliquat</button></div>`);return;}
    if(button.dataset.confirmCancel){const out=await act('CANCEL_REMAINDER',{orderId:button.dataset.confirmCancel});if(out.ok){closeDialog();render();toast(isDemo()?'Reliquat annulé dans l’aperçu.':'Reliquat annulé. Les livraisons restent dans l’historique.');}return;}
    if(button.dataset.assignMember)return showAssignment(button.dataset.assignMember);
    if(button.id==='demo-about'&&isDemo())return showAbout();
    if(button.id==='demo-reset'&&isDemo()){openDialog(dialogHeader('RÉINITIALISATION LOCALE','Recommencer la démonstration ?','Les demandes, stocks et affectations de cet aperçu seront remplacés par les exemples de départ. Les données du studio ne sont pas touchées.')+'<div class="dialog-actions"><button type="button" class="button secondary" data-close-dialog>Annuler</button><button type="button" class="button danger" data-confirm-demo-reset>Réinitialiser cet aperçu</button></div>');return;}
    if(button.hasAttribute('data-confirm-demo-reset')&&isDemo()){state=model.createDemoState(materials,{seedExamples:true});ui={carts:{},jobs:{}};mode='employee';actorId='demo-employee-1';view='projects';orderFilter='pending';save();closeDialog();render();toast('Données de démonstration réinitialisées.');}
  }
  function handleChange(event) {
    const element=event.target;
    if(element.id==='demo-profile'&&isDemo()){actorId=element.value;view=mode==='admin'?'admin-orders':'projects';orderFilter='pending';render();return;}
    if(element.id==='order-job'){ui.jobs[actorId]=element.value;save();renderCart();return;}
    if(element.dataset.cartQty){const old=currentCart().find(line=>line.cartKey===element.dataset.cartQty);if(!old)return;const out=model.configureLine(state,{...old,quantity:Number(element.value)});if(!out.ok){toast(errorMessage(out.error));element.value=old.quantity;}else{Object.assign(old,out.line,{cartKey:old.cartKey});save();renderCart();}return;}
    
     if(element.dataset.productVariant){
       const card=element.closest('[data-product]'),chosen=reviewAPI?.selection(card,itemById);
       if(chosen?.item){const sample=card.querySelector('[data-product-sample]');
         if(sample)sample.innerHTML=productVisual(chosen.item);
         updateProductPreview(card,chosen.item);}
       return;
     }
     if(element.id==='review-import-file'&&isDemo()&&reviewAPI){
       const file=element.files?.[0];if(!file)return;
       if(file.size>500000){toast('Fichier JSON trop volumineux.');element.value='';return;}
       file.text().then(raw=>{
         const result=reviewAPI.importAnnotations(raw,reviewState);reviewState=result.state;
         writeReview();const y=window.scrollY;render();window.scrollTo(0,y);
         toast(result.count+' notes importées; aucun article supprimé.');
       }).catch(e=>toast('Import impossible : '+e.message)).finally(()=>{element.value='';});
       return;
     }
     if(element.dataset.productColor||element.dataset.productFormat){const card=element.closest('[data-product]');updateProductPreview(card,itemById(card.dataset.product));return;}
    if(element.dataset.inventoryColor||element.dataset.inventoryFormat){const item=itemById(element.dataset.inventoryColor||element.dataset.inventoryFormat),form=element.closest('form'),out=model.configureLine(state,{itemId:item.id,quantity:item.quantityStep||1,colorId:form.elements.colorId?.value||undefined,formatId:form.elements.formatId?.value||undefined}),stock=out.ok?stockFor(out.line.stockKey):{known:false};form.querySelector('.stock-value').innerHTML=stockHTML(stock,item.unit);form.elements.quantity.value=stock.known?stock.onHand:'';}
  }
  function handleInput(event) {const element=event.target;if(element.id==='catalogue-search'){query=element.value;renderCatalogueGrid();}else if(element.id==='inventory-search'){query=element.value;renderInventoryList();}else if(element.dataset.foldDimension){const form=element.closest('form'),values={};form.querySelectorAll('[data-fold-dimension]').forEach(input=>values[input.dataset.foldDimension]=input.value);$('#fold-diagram').innerHTML=foldSVG(itemById(form.dataset.item),values);}}
  const showFormError=error=>clientStatus?.pending?toast(errorMessage(error)):dialogError(errorMessage(error));
  async function handleSubmit(event) {
    const form=event.target;
    if(form.id==='auth-email-form'){
      event.preventDefault();const email=String(new FormData(form).get('email')||'');
      return runAuth(async()=>{const result=await portalClient.sendEmail(email);authMessage=result.message;});
    }
    
     if(isDemo()&&form.id==='review-annotation-form'){
       event.preventDefault();const id=form.dataset.reviewItem,note=String(new FormData(form).get('note')||'').trim();
       if(!id||!itemById(id))return;
       if(note)reviewState.annotations[id]=note;else delete reviewState.annotations[id];
       writeReview();closeDialog();
       const card=Array.from(document.querySelectorAll('[data-product]')).find(c=>c.dataset.product===id);
       const button=card?.querySelector('[data-review-note]');if(button)button.textContent=note?'Modifier la note':'Annoter';
       const tools=card?.querySelector('.mir-review-tools');
       if(tools){tools.querySelector('.mir-review-note')?.remove();
         if(note){const p=document.createElement('p');p.className='mir-review-note';p.textContent=note;tools.append(p);}}
       toast('Note enregistrée sans déplacer la liste.');return;
     }
     if(!form.matches('#create-order-form,#fold-form,#delivery-form,#assignment-form,#invitation-form,#create-job-form,[data-inventory-form],[data-fabricated-stock]'))return;
    if(!state)return;
    if(!isDemo()&&(clientStatus?.busy||clientStatus?.pending)){event.preventDefault();toast('Vérifiez d’abord l’action en attente de confirmation.');return;}
    event.preventDefault();const data=new FormData(form);
    if(form.id==='create-job-form'){const out=await act('CREATE_JOB',{name:String(data.get('name')||'').trim(),address:String(data.get('address')||'').trim()});if(!out.ok)showFormError(out.error);else{closeDialog();setView('projects');toast('Chantier créé. Attribuez-le aux membres de votre équipe.');}return;}
    if(form.id==='create-order-form'){const cart=currentCart();if(!cart.length||!currentJobId())return;const out=await act('CREATE_ORDER',{jobId:currentJobId(),lines:cart.map(({cartKey,...line})=>line),note:String(data.get('note')||''),deliveryMode:String(data.get('deliveryMode')||'delivery')});if(out.ok){ui.carts[actorId]=[];save();orderFilter='pending';setView(mode==='admin'?'admin-orders':'orders',{focus:true});toast(isDemo()?'Demande enregistrée dans l’aperçu.':'Votre demande a été transmise à MIR.');}return;}
    if(form.id==='fold-form'){const item=itemById(form.dataset.item),dimensionsIn={};for(const field of item.measureFields||[])dimensionsIn[field.key]=model.parseInches(String(data.get(`dim-${field.key}`)||''));const out=addToCart({itemId:item.id,quantity:Number(data.get('quantity')),colorId:String(data.get('colorId')||''),dimensionsIn});if(!out.ok)showFormError(out.error);else{closeDialog();renderCart();toast('Pliage ajouté avec vos mesures.');}return;}
    if(form.id==='delivery-form'){const order=state.orders.find(o=>o.id===form.dataset.order),quantities={};for(const line of order?.lines||[]){const amount=Number(data.get(`line-${line.id}`));if(amount>0)quantities[line.id]=amount;}const out=await act('RECORD_DELIVERY',{orderId:form.dataset.order,quantities,requestId:form.dataset.request});if(!out.ok)showFormError(out.error);else{closeDialog();render();toast('Livraison enregistrée. Le reliquat est conservé.');}return;}
    if(form.id==='assignment-form'){if(!isDemo()){const out=await act('ASSIGN_MEMBER_JOBS',{memberId:form.dataset.member,jobIds:data.getAll('jobIds')});if(!out.ok)showFormError(out.error);else{closeDialog();render();toast('Accès aux chantiers enregistrés.');}return;}const member=state.members.find(m=>m.id===form.dataset.member),before=new Set(memberJobs(member).map(j=>j.id)),after=new Set(data.getAll('jobIds'));for(const job of state.jobs){if(before.has(job.id)===after.has(job.id))continue;const out=await act('ASSIGN_JOB',{memberId:member.id,jobId:job.id,assigned:after.has(job.id)});if(!out.ok){showFormError(out.error);return;}}closeDialog();render();toast('Affectations de démonstration enregistrées.');return;}
    if(form.id==='invitation-form'){
      const out=await act(isDemo()?'SAVE_INVITATION_DRAFT':'INVITE_EMPLOYEE',{email:String(data.get('email')||'').trim(),jobIds:data.getAll('jobIds'),expiresInHours:72});
      if(out.ok){if(isDemo()){render();toast('Brouillon enregistré. Aucun courriel n’a été envoyé.');}else{toast(invitationLabel(out.result));form.reset();await refreshInvitations();}}return;
    }
    if(form.hasAttribute('data-fabricated-stock')){const out=await act('SET_INVENTORY',{stockKey:form.dataset.fabricatedStock,quantity:Number(data.get('quantity')),unit:form.dataset.stockUnit,note:isDemo()?'Comptage de pièces fabriquées dans l’aperçu':'Comptage physique de pièces fabriquées'});if(out.ok){form.querySelector('.stock-value').innerHTML=stockHTML(stockFor(form.dataset.fabricatedStock),form.dataset.stockUnit);toast(isDemo()?'Stock de simulation enregistré.':'Comptage enregistré dans l’inventaire partagé.');}return;}
    if(form.dataset.inventoryForm){const item=itemById(form.dataset.inventoryForm),configured=model.configureLine(state,{itemId:item.id,quantity:item.quantityStep||1,colorId:String(data.get('colorId')||'')||undefined,formatId:String(data.get('formatId')||'')||undefined});if(!configured.ok){toast(errorMessage(configured.error));return;}const out=await act('SET_INVENTORY',{stockKey:configured.line.stockKey,quantity:Number(data.get('quantity')),unit:item.unit,note:isDemo()?'Comptage de simulation dans le portail':'Comptage physique dans le portail'});if(out.ok){form.querySelector('.stock-value').innerHTML=stockHTML(stockFor(configured.line.stockKey),item.unit);toast(isDemo()?'Stock de simulation enregistré.':'Comptage enregistré dans l’inventaire partagé.');}}
  }
  function setChrome(showPortal) {
    document.body.dataset.portalConnection=isDemo()?'demo':showPortal?'connected':'login';
    document.body.dataset.portalMode=showPortal?mode:'login';
    // La connexion principale n'affiche jamais de contrôles de démonstration.
    document.querySelector('.demo-banner')?.setAttribute('hidden','');
    document.querySelector('.demo-controls')?.setAttribute('hidden','');
    document.querySelector('.portal-sidebar').hidden=!showPortal;
    document.querySelector('.portal-shell').classList.toggle('auth-shell',!showPortal);
    $('#account-bar').hidden=isDemo()||!showPortal;
    $('#demo-reset')?.setAttribute('hidden','');$('#demo-exit')?.setAttribute('hidden','');
    $('#portal-footer-label').textContent=isDemo()?'Les Revêtements MIR · Aperçu avec données fictives':'Les Revêtements MIR · Le portail chantier';
    document.querySelectorAll('[data-management-link]').forEach(link=>link.hidden=!showPortal||mode!=='admin');
    // Le bandeau public reste accessible; seuls les droits serveur ouvrent les fonctions privées.
    if(!showPortal)$('#portal-operation').hidden=true;
  }
  function clearInvitation() {invitationToken=null;try{sessionStorage.removeItem(INVITATION_KEY);}catch(_) {}}
  function restoreInvitation(token) {
    try {
      if(token){sessionStorage.setItem(INVITATION_KEY,JSON.stringify({token,receivedAt:Date.now()}));return token;}
      const saved=JSON.parse(sessionStorage.getItem(INVITATION_KEY)||'null');
      if(saved&&/^[A-Za-z0-9_-]{43}$/.test(saved.token)&&Date.now()-saved.receivedAt<72*3600000&&Date.now()>=saved.receivedAt)return saved.token;
      sessionStorage.removeItem(INVITATION_KEY);
    }catch(_){}
    return token||null;
  }
  function renderAuth() {
    if(isDemo())return;
    setChrome(false);if(customModelController){customModelController.destroy();customModelController=null;}
    const config=portalClient?.config||window.MIRPortalConfig||{},phase=clientStatus?.phase||'unavailable',user=clientStatus?.user;
    let title='Votre équipe.<br><em>Au même endroit.</em>',intro='Vos plans, votre matériel et le suivi des demandes, réunis dans le portail chantier MIR.',body='';
    if(authCallback&&config.enabled){
      title=invitationToken?'Bienvenue<br><em>dans l’équipe.</em>':'Votre lien<br><em>de connexion.</em>';
      intro=invitationToken?'Validez votre lien, puis acceptez votre invitation pour rejoindre les chantiers qui vous sont attribués.':'Validez ce lien pour ouvrir votre espace MIR.';
      body=`<button type="button" id="auth-confirm-link" class="button full"${authBusy?' disabled':''}>${authBusy?'Vérification…':'Valider mon lien'} ${icon('arrow')}</button>`;
    }else if(invitationToken&&user&&config.enabled){
      title='Votre invitation<br><em>vous attend.</em>';intro='Votre compte est identifié. Acceptez l’invitation pour ouvrir les chantiers que MIR vous a attribués.';
      body=`<p class="auth-account">Connecté avec <strong>${esc(user.email)}</strong></p><button type="button" id="auth-accept-invitation" class="button full"${authBusy?' disabled':''}>${authBusy?'Activation…':'Accepter mon invitation'} ${icon('arrow')}</button><button type="button" id="auth-signout" class="button quiet full"${authBusy?' disabled':''}>Utiliser un autre compte</button>`;
    }else if(phase==='loading'){
      body='<div class="auth-loading"><span class="loading-dot"></span><p>Vérification de votre accès…</p></div>';
    }else if(!config.enabled){
      body='<div class="auth-activation"><span class="pill">Activation sécurisée en attente</span><h2>L’espace MIR se prépare.</h2><p>Un espace commun permettra plus tard aux clients de retrouver leurs commandes, et à l’équipe d’accéder à ses chantiers et à l’administration selon ses droits.</p><p>Le service sécurisé MIR doit être raccordé et vérifié avant que les connexions Google, courriel et les invitations soient activées.</p></div><p class="auth-footnote">Aucun compte n’est créé ici et aucune donnée privée n’est accessible sans autorisation serveur.</p>';
    }else if(user&&['access_denied','error'].includes(phase)){
      title=phase==='access_denied'?'Votre accès<br><em>reste à confirmer.</em>':'La connexion<br><em>a été interrompue.</em>';
      intro=phase==='access_denied'?'Votre compte est reconnu. Le responsable MIR doit activer votre accès ou vous envoyer une invitation.':'Vos demandes sont conservées par le service. Vérifiez la connexion avant de poursuivre.';
      body=`<p class="auth-account">${esc(user.email)}</p><button type="button" class="button full" id="auth-retry"${authBusy?' disabled':''}>Réessayer ${icon('arrow')}</button><button type="button" class="button quiet full" id="auth-signout"${authBusy?' disabled':''}>Déconnexion</button>`;
    }else{
      title=invitationToken?'Rejoignez<br><em>votre équipe.</em>':'Bienvenue dans<br><em>votre espace.</em>';
      intro=invitationToken?'Connectez-vous avec l’adresse qui a reçu l’invitation MIR.':'L’accès est réservé aux personnes invitées par MIR.';
      body=(config.googleEnabled?`<button type="button" id="auth-google" class="button secondary full"${authBusy?' disabled':''}><span class="google-mark" aria-hidden="true">G</span>Continuer avec Google</button>${config.emailEnabled?'<div class="auth-divider"><span>ou par courriel</span></div>':''}`:'')+
        (config.emailEnabled?`<form id="auth-email-form"><label for="auth-email">Votre adresse courriel<input id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required placeholder="vous@entreprise.ca"${authBusy?' disabled':''}></label><button type="submit" class="button full"${authBusy?' disabled':''}>${authBusy?'Envoi…':'Recevoir mon lien de connexion'} ${icon('arrow')}</button></form><p class="auth-footnote">Ouvrez le lien reçu par courriel pour vous connecter. Aucun mot de passe à retenir.</p>`:'<p class="auth-footnote">Les méthodes de connexion sont en cours d’activation.</p>');
    }
    const expectedInvitation=invitationToken&&user&&clientStatus?.error?.code==='MEMBERSHIP_REQUIRED';
    const message=authError||(expectedInvitation?'':clientStatus?.error?.message);
    $('#portal-content').innerHTML=`<section class="auth-grid"><div class="auth-intro"><p class="portal-eyebrow">LES REVÊTEMENTS MIR · PORTAIL CHANTIER</p><h1>${title}</h1><p>${esc(intro)}</p><ul class="auth-benefits"><li>${icon('plan')}Les plans de vos chantiers</li><li>${icon('cart')}Votre matériel en quelques gestes</li><li>${icon('orders')}Le suivi des quantités reçues</li></ul></div><div class="auth-card">${body}${authMessage?`<p class="auth-message" role="status">${esc(authMessage)}</p>`:''}${message?`<p class="auth-error" role="alert">${esc(message)}</p>`:''}</div></section>`;
  }
  function connectedUI(snapshot) {
    uiStorageKey=`mir_employee_portal_ui_connected_${portalClient.config.projectRef}_${snapshot.actorId}`;
    const saved=load(uiStorageKey,{cart:[],jobId:''}),cart=[];
    for(const spec of Array.isArray(saved.cart)?saved.cart:[]){const line=model.configureLine(snapshot,spec);if(line.ok)cart.push({...line.line,cartKey:typeof spec.cartKey==='string'?spec.cartKey:requestId()});}
    return {carts:{[snapshot.actorId]:cart},jobs:{[snapshot.actorId]:typeof saved.jobId==='string'?saved.jobId:''}};
  }
  function applyConnectedStatus(next) {
    clientStatus=next;
    if(next.phase==='ready'&&next.snapshot){
      const changed=actorId!==next.snapshot.actorId||!state;
      state=next.snapshot;actorId=state.actorId;const role=actor()?.role||'employee';
      if(changed){ui=connectedUI(state);mode=role;view=mode==='admin'?'admin-orders':'projects';invitations=[];}
      else if(mode!==role){mode=role;view=mode==='admin'?'admin-orders':'projects';}
      if(authCallback||invitationToken){renderAuth();return;}
      setChrome(true);
      if(next.reason==='command')syncOperation();else render();
    }else if(next.reason!=='command'){
      state=null;actorId=null;ui={carts:{},jobs:{}};invitations=[];
      if($('#portal-dialog').open)closeDialog();renderAuth();
    }else syncOperation();
  }
  function syncOperation() {
    const banner=$('#portal-operation');if(isDemo()||!state){banner.hidden=true;return;}
    const pending=clientStatus?.pending,busy=!!clientStatus?.busy,lock=!!pending||busy;
    banner.hidden=!lock;
    banner.innerHTML=lock?`<div>${icon('info')}<p><strong>${busy?'Enregistrement en cours…':'Une confirmation reste à vérifier.'}</strong><span>${busy?'Votre demande garde la même référence jusqu’à sa confirmation.':'Réessayez cette action. Elle conserve sa référence pour éviter un doublon.'}</span></p></div>${!busy?'<button type="button" class="button secondary small" id="portal-retry-action">Vérifier cette action</button>':''}`:'';
    const controls=document.querySelectorAll('#portal-content input,#portal-content select,#portal-content textarea,#portal-content button,#portal-dialog-content input,#portal-dialog-content select,#portal-dialog-content textarea,#portal-dialog-content button');
    controls.forEach(control=>{
      if(control.matches('[data-close-dialog],[data-job],[data-order-filter],[data-download-plan]'))return;
      if(lock&&!control.disabled){control.disabled=true;control.dataset.operationLock='1';}
      else if(!lock&&control.dataset.operationLock){control.disabled=false;delete control.dataset.operationLock;}
    });
    $('#portal-main').setAttribute('aria-busy',String(busy));
  }
  async function runAuth(operation,showGate=true) {
    if(authBusy)return;authBusy=true;authError='';authMessage='';if(showGate)renderAuth();
    try {await operation();}
    catch(error){authError=invitationToken&&portalClient?.getStatus()?.user&&error?.code==='MEMBERSHIP_REQUIRED'?'':errorMessage(error);}
    finally {authBusy=false;if(state&&clientStatus?.phase==='ready'&&!authCallback&&!invitationToken){setChrome(true);render();if(authError)toast(authError);}else renderAuth();}
  }
  async function retryOperation() {
    if(!portalClient||clientStatus?.busy)return;
    try {
      const out=await portalClient.retry();state=out.snapshot;
      if(out.command==='CREATE_ORDER'){ui.carts[actorId]=[];save();orderFilter='pending';view=mode==='admin'?'admin-orders':'orders';}
      if(out.command==='INVITE_EMPLOYEE'||out.command==='REVOKE_INVITATION'){await refreshInvitations();toast(invitationLabel(out.result));}
      else toast('Action confirmée. Elle a été enregistrée une seule fois.');
      if($('#portal-dialog').open)closeDialog();render();
    }catch(error){toast(errorMessage(error));syncOperation();}
  }
  function startDemo() {
    connectionMode='demo';
    const saved=load(STORE_KEY,null),restored=saved&&model.restoreState?model.restoreState(saved,materials):null;
    state=restored?.ok?restored.state:model.createDemoState(materials,{seedExamples:true});
    try{reviewState=reviewAPI?.load(localStorage)||reviewState;}catch(_){}
    ui=load(UI_KEY,{carts:{},jobs:{}});if(!ui||typeof ui!=='object')ui={carts:{},jobs:{}};if(!ui.carts||typeof ui.carts!=='object')ui.carts={};if(!ui.jobs||typeof ui.jobs!=='object')ui.jobs={};
    actorId=state.members.find(member=>member.id==='demo-employee-1'&&member.active)?.id||state.members.find(member=>member.role==='employee'&&member.active)?.id||state.members[0]?.id;
    mode=actor()?.role||'employee';view=mode==='admin'?'admin-orders':'projects';setChrome(true);render();
    if(saved&&!restored?.ok)toast('Les données de démonstration invalides ont été réinitialisées. Le studio est inchangé.');
  }
  async function boot() {
    model=window.MIREmployeeStore;if(!model||!window.MIRPortalClient)throw new Error('Le portail n’a pas pu être chargé.');
    const entry=window.MIRPortalClient.captureEntry(location.href);
    if(entry.cleanURL!==location.href)history.replaceState(null,'',entry.cleanURL);
    connectionMode=entry.mode;authCallback=entry.authCallback;
    if(!isDemo())invitationToken=restoreInvitation(entry.invitationToken);
    if(entry.invalidInvitation)authError='Ce lien d’invitation ne peut pas être utilisé. Demandez un nouveau lien au responsable MIR.';
    if(entry.callbackError)authError='Ce lien de connexion est expiré ou ne peut plus être utilisé. Demandez un nouveau lien.';
    document.addEventListener('click',event=>handleClick(event).catch(error=>toast(errorMessage(error))));
    document.addEventListener('change',handleChange);document.addEventListener('input',handleInput);
    document.addEventListener('submit',event=>handleSubmit(event).catch(error=>toast(errorMessage(error))));
    $('#portal-dialog').addEventListener('click',event=>{if(event.target!==$('#portal-dialog'))return;const rect=$('#portal-dialog').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog();});
    try {const response=await fetch('catalogue-fd6866b49d21.json');if(response.ok){const raw=await response.json();materials=Array.isArray(raw)?raw:raw.materials||[];materialMap=new Map(materials.map(material=>[material.id,material]));}}
    catch(_){if(isDemo())throw new Error('Le catalogue de démonstration n’a pas pu être chargé.');}
    if(isDemo()){startDemo();return;}
    let operationStorage;try{operationStorage=sessionStorage;}catch(_){}
    portalClient=window.MIRPortalClient.create({config:window.MIRPortalConfig,sdk:window.MIRSupabase,origin:location.origin,operationStorage});
    clientStatus=portalClient.getStatus();portalClient.subscribe(applyConnectedStatus);renderAuth();
    try {await portalClient.start();}catch(_){/* The client supplies an explicit error state, never demonstration data. */}
    const refreshWhenIdle=()=>{if(document.visibilityState==='visible'&&clientStatus?.phase==='ready'&&!clientStatus.busy&&!clientStatus.pending&&!$('#portal-dialog').open&&!document.activeElement?.matches('input,select,textarea'))portalClient.refresh().catch(()=>{});};
    document.addEventListener('visibilitychange',refreshWhenIdle);
    setInterval(refreshWhenIdle,45000);
  }
  boot().catch(error=>{
    state=null;connectionMode='connected';clientStatus={phase:'error',error};authError=errorMessage(error);
    renderAuth();
  });
})();
