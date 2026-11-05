/* MIR fabrication workspace. Local model versions and order snapshots are kept
 * separate from studio measurements, employee demo data and external services. */
(function(){
'use strict';
const $=s=>document.querySelector(s),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy=value=>JSON.parse(JSON.stringify(value));
const finite=Number.isFinite;
const params=new URLSearchParams(location.search),client=params.get('mode')==='client';
// This selects a local catalogue only; it is not authentication or authorization.
const catalogueChannel=params.get('source')==='store'?'store':'client';
const KEYS={templates:'mir_production_templates_v1',requests:'mir_production_requests_v1',draft:!client?'mir_production_admin_dossier_v1':catalogueChannel==='store'?'mir_production_employee_dossier_v1':'mir_production_client_dossier_v1'};
const unitValue=(mm,unit)=>unit==='mm'?mm:mm/25.4;
const fmt=value=>finite(value)?String(Math.round(value*10000)/10000):'';
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
const safeAsset=value=>typeof value==='string'&&/^(\.\/)?assets\/[A-Za-z0-9._/-]+$/.test(value)?value:null;
const safeURL=value=>{try{const u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
let layoutImportBusy=false;
let jException=null;
let rightAngleSnap=true;
let traceHeight=14;
let activeDefaultLocks={},M,materials=[],ral={colors:[]},draft,kind=client?'panel':'profile',view='face',workflow='configure',authoring=false,editingTemplateId=null,editingItemId=null,selectedTemplate=null,templates=[],requests=[],order,tool='select',snap=true,drawPoints=[],drawTransform=null,drag=null,orbit=-35,pitch=23,zoom=1,pointers=new Map(),busy=false,colorSystem='manufacturer',colorId='',materialId='',colorQuery='',toastTimer,suppressClick=false;
const profiles={l:{name:'Pliage en L',dimensions:{A:3,B:2}},j:{name:'Pliage en J',dimensions:{A:1,B:3,C:1}},z:{name:'Pliage en Z',dimensions:{A:2,B:4,C:2}},beam5:{name:'Cache-poutre · 5 côtés',dimensions:{A:1,B:6,C:8,D:6,E:1}},omega:{name:'Oméga',dimensions:{A:1,B:2,C:4,D:2,E:1}},custom:{name:'Profil personnalisé',segments:[{label:'A',length:4},{label:'B',length:3},{label:'C',length:2}],bends:[{mode:'interior',angle:90,direction:'left'},{mode:'interior',angle:90,direction:'right'}],startAngle:0},...window.MIRBendingPresets?.catalog()};
const shapes=[['rectangle','Rectangle'],['square','Carré'],['right-triangle','Triangle rectangle'],['trapezoid','Trapèze'],['parallelogram','Parallélogramme'],['pointed','Côté en pointe']];
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('La sauvegarde locale est indisponible. Exportez votre dossier JSON.');return false;}}
function persist(){store(KEYS.draft,{version:1,order});}
function toast(text){$('#production-toast').textContent=text;$('#production-toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#production-toast').classList.remove('visible'),4400);}
function closeDialog(){$('#production-dialog').close();}
function dialog(title,text,body){$('#production-dialog-content').innerHTML=`<p class="eyebrow">L’ATELIER MIR</p><h2 id="production-dialog-title" class="dialog-heading">${esc(title)}</h2>${text?`<p class="dialog-intro">${esc(text)}</p>`:''}${body}`;if(!$('#production-dialog').open)$('#production-dialog').showModal();}
function messageError(message){let el=$('#production-dialog-error');if(!el){el=document.createElement('p');el.id='production-dialog-error';el.className='dialog-error';el.setAttribute('role','alert');$('#production-dialog-content').append(el);}el.textContent=message;}
function sampleSpec(type,id){const spec={kind:type,unit:'in',quantity:1,material:{type:'aluminium',thickness:'',gauge:''},finish:{},coloredFace:{side:'left',segmentId:'A'},location:'',note:''};if(type==='profile')return {...spec,template:id,...copy(profiles[id]||profiles.custom),length:120};return {...spec,material:{type:'acier',name:'Unico U-P1 — Acier',productRef:'unico-up1-acier',thickness:'',thicknessUnit:'mm',gauge:''},mirrorX:false,dimensionBasis:'overall-including-lips',shape:id,name:shapes.find(s=>s[0]===id)?.[1]||'Panneau',width:48,height:id==='square'?48:36,relief:2,lip:1,apexX:24,topWidth:30,topOffset:9,offset:10,pointSide:'top',tipDepth:12,apexOffset:24,rightAngle:'bottom-left',bottomEdgeId:'bottom',perforation:{enabled:false,edgeId:'bottom',details:''},lips:{}};}
function blankMeasurements(spec){const out=copy(spec);if(out.kind==='profile'){if(out.template==='custom')out.segments.forEach(s=>s.length='');else Object.keys(out.dimensions).forEach(k=>out.dimensions[k]='');out.length='';out.coloredFace={side:'',segmentId:'A'};}else{['width','height','relief','lip','apexX','topWidth','topOffset','offset','tipDepth','apexOffset'].forEach(k=>out[k]='');out.lips={};}out.finish={};out.material={type:out.kind==='panel'?'acier':'aluminium',name:out.kind==='panel'?'Unico U-P1 — Acier':'',productRef:out.kind==='panel'?'unico-up1-acier':null,thickness:'',thicknessUnit:out.kind==='panel'?'mm':'in',gauge:''};return out;}
function defaultOrder(){return {id:'DOS-'+uid(),project:'',poNumber:'',foreman:'',date:new Date().toISOString().slice(0,10),revision:'A',notes:'',items:[],nextNumber:1};}
function build(spec=draft){return spec.kind==='panel'?M.buildPanel(spec):M.buildProfile(spec);}
function templateForBuiltin(type,id){if(!M.createTemplate)return null;const r=M.createTemplate(sampleSpec(type,id),{id:`mir-standard-${type}-${id}`,name:type==='profile'?profiles[id].name:shapes.find(s=>s[0]===id)?.[1],version:1,description:'Modèle standard MIR; cotes de fabrication à renseigner.'});return r.ok?r.template:null;}
function latest(record){return record?.versions?.find(t=>t.version===record.currentVersion)||record?.versions?.at(-1)||record?.template||null;}
function availableForPO(){return client||authoring||editingItemId||templates.find(record=>record.id===selectedTemplate?.id)?.channels?.po!==false;}
function visibleTemplate(record){return !!record&&!record.archived&&(!client||record.archived===false&&record.channels?.[catalogueChannel]===true);}
function availableMaterials(){return kind==='panel'?materials.filter(m=>m.architecturalPanel&&m.metalType===draft?.material?.type&&(!m.allowedGauges||!draft.material.gauge||m.allowedGauges.includes(Number(draft.material.gauge)))):materials.filter(m=>!m.architecturalPanel&&(!m.steelProfileOnly||draft?.material?.type==='acier'));}
function chosenMaterial(){return materials.find(m=>m.id===materialId);}
function chosenColor(){return colorSystem==='ral'?ral.colors.find(c=>c.id===colorId):(chosenMaterial()?.colors||[]).find(c=>c.id===colorId);}
function currentFinish(){
 if(colorSystem==='special')return {...draft.finish,selectionType:'custom',special:true};
 const c=chosenColor(),m=chosenMaterial();
 if(!c)return colorSystem==='ral'?{selectionType:'ral',system:'RAL Classic',code:'',name:'',special:false}:{selectionType:'manufacturer',system:m?`Nuancier ${m.brand}`:'',manufacturer:m?.brand||'',code:'',name:'',special:false};
 return colorSystem==='ral'?{selectionType:'ral',system:'RAL Classic',name:c.nameEn?`${c.code} · ${c.nameEn}`:c.code,code:c.code,hex:c.hex||null,special:false,displayOnly:true,source:ral.reference}:{selectionType:'manufacturer',system:`Nuancier ${m.brand}`,manufacturer:m.brand,name:c.name,code:m.architecturalPanel?(c.code||''):(c.code||c.name),hex:c.hex||null,swatchUrl:safeAsset(c.swatchUrl||c.swatchImage),special:m.architecturalPanel&&c.uP1Compatibility?.confirmed!==true,source:c.sourceUrl||m.sourceUrl,availabilityNote:c.availabilityNote||'Disponibilité sur ce profil à confirmer.'};
}
const money=cents=>Number.isSafeInteger(cents)?new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(cents/100)+' CA':'À préciser';
const surface=value=>new Intl.NumberFormat('fr-CA',{maximumFractionDigits:4}).format(value);
function dossierPricing(items=order.items){return M.priceDossier(items);}
function renderPiecePrice(model,geometryErrors=[]){
 const box=$('#panel-price'),price=M.pricePiece(model),tariff=window.MIRUnico?.pricing,eligible=model.kind==='panel'&&model.spec?.material?.type==='aluminium'&&model.spec?.material?.productRef==='unico-up1-aluminium';
 box.hidden=authoring||!eligible||price.requiresQuote||tariff?.calculationEnabled!==true;
 if(box.hidden){box.innerHTML='';return;}
 const ready=price.status==='priced'&&geometryErrors.length===0;
 box.innerHTML=`<span class="price-eyebrow">TARIF MIR · ${esc(surface(tariff.amount))} $ CA / po²</span>${ready?`<div class="price-main"><strong>${esc(money(price.unitCents))}</strong><span>par panneau</span></div><p>${esc(surface(price.areaSqIn))} po² × ${esc(surface(price.rate))} $ CA / po²</p><div class="price-quantity"><span>${esc(price.quantity)} pièce${price.quantity>1?'s':''}</span><strong>${esc(money(price.lineCents))}</strong></div>`:`<strong>${geometryErrors.length?'Corrigez les dimensions des lips.':esc(price.label||'Complétez votre panneau pour voir son prix.')}</strong><p>${geometryErrors.length?'Le prix sera calculé lorsque la géométrie sera valide.':esc(price.note||'Choisissez les dimensions et une couleur du fabricant.')}</p>`}<small>Surface de la forme hors tout, lips inclus. Projection C non ajoutée. Taxes et livraison non calculées; fini et fabrication à confirmer.</small>`;
}
function linePriceMarkup(spec){const price=M.pricePiece(spec);return price.status==='priced'?`<p class="production-line-price"><strong>${esc(money(price.lineCents))}</strong><span>${esc(surface(price.areaSqIn))} po² · ${esc(money(price.unitCents))} / pièce × ${esc(price.quantity)}</span></p>`:'';}
function renderDossierPrice(pricing){
 const box=$('#production-pricing-summary'),hasPriced=pricing.items.some(item=>item.status==='priced');box.hidden=!hasPriced;
 if(!hasPriced){box.innerHTML='';return;}
 const complete=Number.isSafeInteger(pricing.totalCents),amount=complete?pricing.totalCents:pricing.pricedSubtotalCents;
 box.innerHTML=`<div><span>${complete?'Montant calculé du dossier':'Sous-total des pièces chiffrées'}</span><strong>${esc(money(amount))}</strong></div><p>${complete?'Taxes et livraison non calculées.':pricing.requiresQuote?'Les pièces de couleur personnalisée restent sur soumission; aucun total global n’est calculé.':'Certaines pièces restent à chiffrer; aucun total global n’est calculé.'}</p>`;
}
function exportOrder(){return {...copy(order),pricing:dossierPricing()};}
function choose(type,id,{template=null,spec=null,empty=client}={}){
 jException=null;
 kind=type;editingItemId=null;activeDefaultLocks={};selectedTemplate=template||templateForBuiltin(type,id);
 draft=spec?copy(spec):(empty?blankMeasurements(sampleSpec(type,id)):sampleSpec(type,id));draft.kind=type;
 if(draft.shape!=='right-triangle')draft.mirrorX=false;
 tool='select';view='face';zoom=1;pointers.clear();drawPoints=[];colorId='';colorSystem='manufacturer';draft.finish={};
 materialId=availableMaterials()[0]?.id||'';render();
}
function injectWorkflow(){const node=document.createElement('nav');node.id='production-workflow';node.className='workflow-tabs';node.setAttribute('aria-label','Espace de fabrication');node.dataset.adminOnly='';node.innerHTML='<button type="button" data-workflow="configure" aria-current="page">Bon de commande</button><button type="button" data-workflow="models">Mes modèles</button><button type="button" data-workflow="requests">Demandes clients <span id="request-count">0</span></button>';$('.production-intro').after(node);node.insertAdjacentHTML('afterend','<section id="production-library" hidden></section><section id="production-requests" hidden></section><div id="author-banner" class="author-banner" hidden></div>');$('#order-heading');$('.order-bottom>div').insertAdjacentHTML('beforeend','<button type="button" class="primary-button" id="prepare-local-request" hidden>Préparer ma demande ↗</button>');}
function templateIcon(type,id){if(type==='profile'&&window.MIRBendingPresets?.icon(id))return window.MIRBendingPresets.icon(id);let path;if(type==='profile')path=({l:'M20 8V40H60',j:'M20 8V40H59V27',z:'M12 10H38V40H66',beam5:'M67 8H55V39H26V8H14',omega:'M10 40H22V10H57V40H70',custom:'M8 37H23L36 12H49V37H70'})[id]||'M10 37H28V12H48L68 37';else path=({rectangle:'M12 10H68V40H12Z',square:'M23 5H58V40H23Z','right-triangle':'M18 7V42H68Z',triangle:'M8 42L40 7L72 42Z',trapezoid:'M10 42L24 9H57L70 42Z',parallelogram:'M10 42L24 9H70L56 42Z',pointed:'M14 42V21L40 5L66 21V42Z'})[id]||'M12 10H68V40H12Z';return `<svg viewBox="0 0 80 50" aria-hidden="true"><path d="${path}" fill="${type==='panel'?'#dfe8d4':'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/></svg>`;}
function renderTemplates(){const current=draft.kind==='profile'?draft.template:draft.shape;$('#template-heading').textContent=authoring?'Le modèle à dessiner':'Choisir la forme';const entries=kind==='profile'?Object.entries(profiles).map(([id,p])=>[id,p.name]):shapes;const records=templates.filter(record=>visibleTemplate(record)&&latest(record)?.kind===kind);$('#production-templates').innerHTML=entries.map(([id,name])=>`<button type="button" class="template-button" data-template="${id}" aria-pressed="${!editingTemplateId&&selectedTemplate?.id===`mir-standard-${kind}-${id}`||!selectedTemplate&&current===id}">${templateIcon(kind,id)}<span>${esc(name)}</span></button>`).join('')+(!authoring?records.map(record=>`<button type="button" class="template-button saved-template" data-saved-template="${esc(record.id)}" aria-pressed="${selectedTemplate?.id===record.id}">${templateIcon(kind,latest(record).topology?.template||'custom')}<span>${esc(record.name||latest(record).name)}</span><small>MODÈLE MIR · V${latest(record).version}</small></button>`).join(''):'');}
function measureField(key,label,value,letter='',extra=''){return `<label${extra?' class="'+extra+'"':''}><span class="letter-label">${letter?`<b>${esc(letter)}</b>`:''}${esc(label)}</span><input data-measure="${esc(key)}" inputmode="decimal" value="${esc(value??'')}" placeholder="${authoring?'Proportion':'Votre cote'}" aria-label="${esc((letter?letter+' — ':'')+label)}"></label>`;}
function renderDimensions(){
 const openBends=new Set(Array.from($('#production-dimensions').querySelectorAll('details[data-angle-details][open]'),el=>el.dataset.angleDetails));
 const unit=draft.unit||'in';$('#production-unit').value=unit;$('#measure-hint').textContent=authoring?'Les proportions servent seulement au dessin du modèle. Les clients saisiront toutes les cotes de fabrication.':unit==='in'?(kind==='panel'?'A et B incluent les lips. ':'')+'Fractions acceptées : 3 1/2 ou 3½.':(kind==='panel'?'A et B incluent les lips. ':'')+'Cotes en millimètres.';let body='';
 if(kind==='profile'){if(draft.template==='custom')body=`<div class="segment-editor">${(draft.segments||[]).map((segment,index)=>`<div class="segment-row"><div class="segment-top"><span class="segment-id">${esc(segment.label)}</span><label>${authoring?'Proportion du segment':esc(segment.name||'Longueur du côté')}<input data-segment-length="${index}" inputmode="decimal" value="${esc(segment.length??'')}" placeholder="${authoring?'Proportion':'Votre cote'}" aria-label="Côté ${esc(segment.label)}"></label>${!client&&!editingItemId?`<button type="button" data-remove-segment="${index}" aria-label="Retirer le segment ${esc(segment.label)}"${draft.segments.length<=2?' disabled':''}>×</button>`:''}</div>${index<draft.segments.length-1?bendFields(draft.bends[index],index,openBends.has(String(index))):''}</div>`).join('')}</div>${!client&&!editingItemId?'<div class="segment-actions"><button type="button" data-add-segment>＋ Segment</button><button type="button" data-add-double>Ajouter deux angles</button></div>':''}`;else{const definition=M.TEMPLATES[draft.template];body=`<div class="dimension-fields">${(definition?.labels||[]).map((key,index)=>measureField(key,definition.fieldLabels[index],draft.dimensions?.[key],key)).join('')}</div>${!client&&!editingItemId?'<div class="segment-actions"><button type="button" data-customize>Modifier les angles et les côtés</button><button type="button" data-add-double>Ajouter deux angles</button></div>':''}`;}if(!authoring)body+=`<div class="dimension-fields">${measureField('length','Longueur de la pièce',draft.length,'L','full-field')}</div>`;
 }else{body=`<div class="dimension-fields">${measureField('width',draft.shape==='square'?'Côté du carré':'Largeur hors tout',draft.width,'A')}${draft.shape==='square'?'':measureField('height','Hauteur hors tout',draft.height,'B')}${!authoring?measureField('relief','Projection de la pièce finie',draft.relief,'C'):''}</div>`;if(draft.shape==='triangle')body+=`<div class="dimension-fields">${measureField('apexX','Sommet depuis la gauche',draft.apexX,'S','full-field')}</div>`;if(draft.shape==='right-triangle')body+=`<label class="shape-field">Angle droit<select data-spec-select="rightAngle"${editingItemId||client&&selectedTemplate&&!selectedTemplate.id.startsWith('mir-standard-')?' disabled':''}>${[['bottom-left','En bas à gauche'],['bottom-right','En bas à droite'],['top-left','En haut à gauche'],['top-right','En haut à droite']].map(([id,name])=>`<option value="${id}"${(draft.mirrorX?({'bottom-left':'bottom-right','bottom-right':'bottom-left','top-left':'top-right','top-right':'top-left'}[draft.rightAngle]):draft.rightAngle)===id?' selected':''}>${name}</option>`).join('')}</select></label><div class="panel-mirror-row"><button type="button" class="secondary-button" id="mirror-panel" aria-pressed="${draft.mirrorX===true}">↔ Miroir gauche / droite</button><span>${draft.mirrorX?'Vue inversée':'Vue d’origine'}</span></div>`;if(draft.shape==='trapezoid')body+=`<div class="dimension-fields">${measureField('topWidth','Largeur du haut',draft.topWidth,'D')}${measureField('topOffset','Décalage du haut à gauche',draft.topOffset,'E')}</div>`;if(draft.shape==='parallelogram')body+=`<div class="dimension-fields">${measureField('offset','Décalage du haut (+ droite / − gauche)',draft.offset,'D','full-field')}</div><p class="field-hint">A est la largeur hors tout. Le décalage reste distinct de la longueur de base.</p>`;if(draft.shape==='pointed')body+=`<label class="shape-field">Côté terminé en pointe<select data-spec-select="pointSide"${editingItemId||client&&selectedTemplate&&!selectedTemplate.id.startsWith('mir-standard-')?' disabled':''}>${[['top','Haut'],['right','Droite'],['bottom','Bas'],['left','Gauche']].map(([id,name])=>`<option value="${id}"${draft.pointSide===id?' selected':''}>${name}</option>`).join('')}</select></label><div class="dimension-fields">${measureField('tipDepth','Profondeur de la pointe',draft.tipDepth,'D')}${measureField('apexOffset','Position du sommet sur ce côté',draft.apexOffset,'E')}</div>`;
 }$('#production-dimensions').innerHTML=body;
 if(client&&catalogueChannel==='store')for(const input of $('#production-dimensions').querySelectorAll('input[data-measure],input[data-segment-length]')){
  const key=input.dataset.measure||draft.segments?.[Number(input.dataset.segmentLength)]?.label;
  if(!activeDefaultLocks[key])continue;
  input.readOnly=true;
  input.setAttribute('aria-readonly','true');
  input.title='Mesure verrouillée par le modèle MIR';
  input.insertAdjacentHTML('afterend','<small class="mir-default-readonly">Mesure fixe du magasin MIR</small>');
 }
}
function bendFields(bend,index,expanded){const b=bend||{mode:'interior',angle:90,direction:'left'};if(client||editingItemId)return `<p class="field-hint">Pli ${index+1} : ${b.mode==='hem'?'retour écrasé 180°':esc(b.angle)+'° '+(b.mode==='interior'?'intérieur':'de rotation')}${b.direction?' · '+(b.direction==='left'?'gauche':'droite'):''} · défini par le modèle</p>`;return `<details class="angle-details" data-angle-details="${index}"${expanded||draft.bends.length===1?' open':''}><summary>Pli ${esc(draft.segments[index].label)} → ${esc(draft.segments[index+1].label)}</summary><div class="bend-fields"><label>Type du pli<select data-bend-mode="${index}"><option value="interior"${b.mode==='interior'?' selected':''}>Angle intérieur</option><option value="signed"${b.mode==='signed'?' selected':''}>Rotation signée</option><option value="hem"${b.mode==='hem'?' selected':''}>Retour écrasé 180°</option></select></label><label>Angle (°)<input data-bend-angle="${index}" type="number" step="any" value="${esc(b.mode==='hem'?180:b.angle)}"${b.mode==='hem'?' disabled':''}></label><label>Sens<select data-bend-direction="${index}"${b.mode==='signed'?' disabled':''}><option value="left"${b.direction==='left'?' selected':''}>Gauche</option><option value="right"${b.direction==='right'?' selected':''}>Droite</option></select></label></div></details>`;}
function renderProfileOptions(){
 if(kind!=='profile'||authoring){$('#production-profile-options').innerHTML='';return;}
 const labels=draft.template==='custom'?(draft.segments||[]).map(s=>s.label):M.TEMPLATES[draft.template]?.labels||[];
 const check=window.MIRBendingPresets?.checkJ(draft);
 let rule='';
 if(check){
  if(check.pending)rule='<div class="mir-j-rule">Coin J intégré : entrez toutes les cotes pour vérifier le clouage minimum.</div>';
  else if(!check.valid)rule='<div class="mir-j-rule warn" role="alert">'+esc(check.message)+'</div>';
  else if(check.ok)rule='<div class="mir-j-rule good">✓ Clouage conforme : minimum '+esc(window.MIRCalepinageExtension.formatInches(check.minimumIn))+'.</div>';
  else{
   const accepted=window.MIRBendingPresets.exceptionMatches(check,jException);
   rule='<div class="mir-j-rule warn" role="alert"><strong>Clouage J insuffisant</strong><p>Retour du J : '+esc(window.MIRCalepinageExtension.formatInches(check.jReturnIn))+
     ' · Clouage : '+esc(window.MIRCalepinageExtension.formatInches(check.nailingIn))+
     ' · Minimum : '+esc(window.MIRCalepinageExtension.formatInches(check.minimumIn))+'</p>'+
     (accepted?'<p>Dérogation explicitement acceptée par '+esc(jException.acceptedBy)+'. Elle sera conservée avec le dossier.</p>':
     '<div class="mir-j-rule-actions"><button type="button" data-mir-fix-j="1">Corriger automatiquement</button><button type="button" data-mir-accept-j="1">Garder quand même</button></div>')+'</div>';
  }
 }
 const faceOpen=$('#production-profile-options details')?.open||draft.coloredFace?.side;
 $('#production-profile-options').innerHTML=`<details class="profile-face-options"${faceOpen?' open':''}><summary>Face colorée</summary><div class="two-fields"><label>Sens de la face<select id="profile-painted-side"><option value="">Choisir le côté</option><option value="left"${draft.coloredFace?.side==='left'?' selected':''}>À gauche du tracé</option><option value="right"${draft.coloredFace?.side==='right'?' selected':''}>À droite du tracé</option></select></label><label>Repère sur le côté<select id="profile-painted-segment">${labels.map(label=>`<option${draft.coloredFace?.segmentId===label?' selected':''}>${esc(label)}</option>`).join('')}</select></label></div><p class="field-hint">La gauche et la droite se lisent en suivant A, puis B et les côtés suivants. Le côté peint est marqué sur le dessin.</p></details>`+rule;
}
function renderPanelOptions(){if(kind!=='panel'||authoring){$('#production-panel-options').innerHTML='';return;}const model=build(),reference=model.edges.length?model:build(sampleSpec('panel',draft.shape)),edges=reference.edges||[];$('#production-panel-options').innerHTML=`<div class="config-section"><div class="section-heading compact"><div><span class="step-dot">↳</span><h2>Les lèvres & le bas</h2></div></div><p class="field-hint">Les lips sont compris dans A et B. Ils réduisent la face centrale, sans augmenter le hors tout.</p><label>Lip commun à tous les côtés<input id="panel-lip" inputmode="decimal" value="${esc(draft.lip??'')}" placeholder="0 = sans lip"></label><details class="options-details"><summary>Un lip différent selon le côté</summary><div class="dimension-fields">${edges.map((edge,index)=>`<label>${index+1} · ${esc(edge.name)}<input data-panel-lip="${esc(edge.id)}" inputmode="decimal" value="${esc(draft.lips?.[edge.id]??'')}" placeholder="Lip commun"></label>`).join('')}</div></details><label>Quel côté est en bas après pose ?<select id="panel-bottom"><option value="">Choisir le bas</option>${edges.map((edge,index)=>`<option value="${esc(edge.id)}"${draft.bottomEdgeId===edge.id?' selected':''}>${index+1} · ${esc(edge.name)}</option>`).join('')}</select></label><label class="check-field"><input id="panel-perforation" type="checkbox"${draft.perforation?.enabled?' checked':''}><span>Demander la perforation du bas<small>Le côté choisi est repéré en bleu sur le dessin.</small></span></label>${draft.perforation?.enabled?`<label>Détail ou référence de perforation<textarea id="panel-perforation-details" rows="2" placeholder="À définir avec l’atelier" maxlength="300">${esc(draft.perforation.details||'')}</textarea></label><p class="field-hint">Le diamètre et l’espacement des trous restent à préciser. Aucun motif de perforation n’est présumé.</p>`:''}</div>`;}
function renderColors(){const block=$('#production-color-fields');$('#color-system').value=colorSystem;if(colorSystem==='manufacturer'){block.innerHTML=`<div class="color-source-field"><label>Fabricant / produit de référence<select id="production-material"><option value="">Choisir le fabricant et le produit</option>${availableMaterials().map(m=>`<option value="${esc(m.id)}"${m.id===materialId?' selected':''}>${esc(m.brand+' · '+m.name)}</option>`).join('')}</select></label><div id="production-color-grid" class="color-choice-grid" role="group" aria-label="Couleurs du fabricant"></div><p class="field-hint">${kind==='panel'?'Références Unico publiées. La disponibilité du fini sur le calibre choisi reste à confirmer.':'Chaque échantillon appartient au nuancier de ce produit. L’offre sur votre pièce doit être confirmée.'}</p></div>`;renderColorGrid();}else if(colorSystem==='ral'){block.innerHTML=`<div class="color-source-field"><label>Rechercher un code RAL Classic<input id="production-color-search" class="color-search" type="search" placeholder="Ex. 7016, black, vert…" value="${esc(colorQuery)}"></label><label>Code de la couleur<select id="production-ral"><option value="">Choisir un code RAL</option>${ral.colors.map(c=>`<option value="${esc(c.id)}"${c.id===colorId?' selected':''}>${esc(c.code+' · '+(c.nameEn||c.name))}</option>`).join('')}</select></label><p id="color-count" class="color-count"></p><div id="production-color-grid" class="color-choice-grid" role="group" aria-label="Codes RAL Classic"></div><p class="field-hint">${esc(ral.displayNotice||'Aperçu écran indicatif. Valider la teinte demandée sur un nuancier physique avant fabrication.')}</p></div>`;renderColorGrid();}else{block.innerHTML=`<div class="color-source-field"><label>Nuancier ou fabricant<input id="special-color-system" value="${esc(draft.finish?.system||'')}" maxlength="60" placeholder="Ex. Nuancier à préciser"></label><div class="two-fields"><label>Code exact<input id="special-color-code" value="${esc(draft.finish?.code||'')}" maxlength="80" placeholder="Référence demandée"></label><label>Nom de la couleur<input id="special-color-name" value="${esc(draft.finish?.name||'')}" maxlength="100" placeholder="Si connu"></label></div><p class="field-hint">Cette référence est une demande spéciale à faire confirmer. Aucun équivalent fabricant ni teinte numérique n’est inventé.</p></div>`;}updateFinish();}
function renderColorGrid(){const grid=$('#production-color-grid');if(!grid)return;const colors=colorSystem==='ral'?ral.colors.filter(c=>`${c.code} ${c.nameEn||''} ${c.family||c.familyFR||''}`.toLocaleLowerCase('fr').includes(colorQuery.toLocaleLowerCase('fr'))):chosenMaterial()?.colors||[];if($('#color-count'))$('#color-count').textContent=`${colors.length} codes · aperçus indicatifs`;
 grid.innerHTML=colors.map(c=>{const image=safeAsset(c.swatchUrl||c.swatchImage),hex=/^#[0-9a-f]{6}$/i.test(c.hex||'')?c.hex:null,name=colorSystem==='ral'?c.code+' · '+(c.nameEn||c.name):c.name;return `<button type="button" class="color-choice" data-production-color="${esc(c.id)}" aria-pressed="${c.id===colorId}" title="${esc(name)}" aria-label="${esc(name)}"${hex?` style="background:${hex}"`:''}>${image?`<img src="${esc(image)}" alt="" loading="lazy">`:!hex?`<span class="color-text">${esc(name)}</span>`:''}</button>`;}).join('')||'<p class="field-hint">Aucune teinte documentée pour cette référence. Choisissez une référence spéciale à confirmer.</p>';
}
function updateFinish(){if(authoring){$('#selected-finish').innerHTML='';return;}draft.finish=currentFinish();const c=chosenColor(),image=safeAsset(c?.swatchUrl||c?.swatchImage),finish=draft.finish,source=safeURL(c?.sourceUrl||chosenMaterial()?.sourceUrl||'');$('#selected-finish').innerHTML=(finish.code||finish.name)?`${image?`<img src="${esc(image)}" alt="Échantillon fabricant de ${esc(finish.name)}">`:''}<div><strong>${esc(finish.name||finish.code)}</strong><span>${esc(finish.code||'Code à confirmer')} · ${esc(finish.manufacturer||finish.system||'Référence spéciale')}</span><p>${esc(colorSystem==='ral'?ral.displayNotice:colorSystem==='special'?'Demande spéciale : faisabilité, teinte et disponibilité à confirmer.':c?.availabilityNote||'Disponibilité sur ce profil à confirmer. Écran indicatif.')}</p>${colorSystem==='manufacturer'&&source?`<a href="${esc(source)}" target="_blank" rel="noopener">Source du fabricant ↗</a>`:''}</div>`:'<div><strong>La teinte reste à choisir.</strong><p>Choisissez une référence précise pour votre pièce.</p></div>';}
function fitModel(model){const p=model.pointsMM||[],xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);const scale=Math.min(580/Math.max(1,maxX-minX),340/Math.max(1,maxY-minY));return {scale,ox:400-(minX+maxX)*scale/2,oy:255+(minY+maxY)*scale/2};}
function pointOnView(point,tr){return [tr.ox+point[0]*tr.scale,tr.oy-point[1]*tr.scale];}
function drawingModel(){const actual=build();if(actual.valid)return {model:actual,illustrative:authoring};const example=selectedTemplate&&M.templatePreview(selectedTemplate);return {model:example?.ok?example.model:build(sampleSpec(kind,kind==='profile'?draft.template:draft.shape)),illustrative:true};}
function diagramSVG(model,{illustrative=false,small=false,interactive=true}={}){
 if(model.kind==='panel'&&window.MIRProductionVolume)return panelDiagramSVG(model,{illustrative,small,interactive});
 const freehand=interactive&&tool==='draw'&&model.kind==='profile';
 const points=freehand?(drawPoints.length>=3&&model.pointsMM.length===drawPoints.length
  ?model.pointsMM.map(([x,y])=>[x+drawPoints[0][0],y+drawPoints[0][1]]):drawPoints):model.pointsMM||[];if(!points.length)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><text x="400" y="250" text-anchor="middle" font-family="Arial" font-size="19" fill="#7b8b6c">Cliquez pour dessiner votre premier segment.</text></svg>`;
 const tr=(tool==='draw'||drag?.type==='point')&&drawTransform?drawTransform:fitModel({...model,pointsMM:points});if(interactive&&!drag)drawTransform=tr;
 const mapped=points.map(p=>pointOnView(p,tr)),polygon=model.kind==='panel',pointString=mapped.map(p=>p.map(fmt).join(',')).join(' '),hex=/^#[0-9a-f]{6}$/i.test(model.finish?.hex||'')?model.finish.hex:'#dce5d4';let output=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="group" aria-label="${esc(model.name)} — ${illustrative?'illustration du modèle':'cotes de la pièce finie'}" font-family="Arial,sans-serif"><title>${esc(model.name)} — ${illustrative?'proportions illustratives, sans cotes de fabrication':'dimensions de la pièce finie'}</title>`;
 if(polygon)output+=`<polygon points="${pointString}" fill="${hex}" fill-opacity=".65" stroke="#546b4a" stroke-width="2"/>`;else {
 output+=M.profileDiagramContent(model,mapped,{bends:freehand&&drawPoints.length<3?[]:model.bends||[],markers:!small,markerModel:freehand?{}:model,handles:tool==='draw'||tool==='edit'?mapped:[],illustrative:illustrative||(interactive&&tool!=='select'),togglePaintedFace:interactive&&!small&&tool==='select'&&!illustrative});
 }
 const count=polygon?points.length:Math.max(0,points.length-1);for(let i=0;i<count;i++){const a=mapped[i],b=mapped[(i+1)%mapped.length],delta=[b[0]-a[0],b[1]-a[1]],len=Math.hypot(...delta)||1,mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],normal=[-delta[1]/len,delta[0]/len];if(polygon){const edge=model.edges?.[i],bottom=edge?.id===model.bottomEdgeId;if(bottom&&!illustrative)output+=`<line x1="${fmt(a[0])}" y1="${fmt(a[1])}" x2="${fmt(b[0])}" y2="${fmt(b[1])}" stroke="${model.perforation?.enabled?'#26758d':'#54863f'}" stroke-width="6"${model.perforation?.enabled?' stroke-dasharray="11 6"':''}/>`;output+=`<g${interactive&&edge&&!authoring?` data-select-bottom="${esc(edge.id)}" role="button" tabindex="0" aria-label="Choisir ${esc(edge.name)} comme bas"`:''}><circle cx="${fmt(mid[0])}" cy="${fmt(mid[1])}" r="13" fill="#fff" stroke="#b2c4a1"/><text x="${fmt(mid[0])}" y="${fmt(mid[1]+4.5)}" text-anchor="middle" font-size="13" fill="#4f6c3c">${i+1}</text></g>`;}
 }
 if(polygon){const xs=mapped.map(p=>p[0]),ys=mapped.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);output+=`<path d="M${fmt(left)},${fmt(bottom+35)}H${fmt(right)}M${fmt(left)},${fmt(bottom+29)}V${fmt(bottom+41)}M${fmt(right)},${fmt(bottom+29)}V${fmt(bottom+41)}" fill="none" stroke="#8ba475" stroke-width="1.4"/><text x="${fmt((left+right)/2)}" y="${fmt(bottom+60)}" text-anchor="middle" font-size="18" fill="#577c3d">${esc(illustrative?'A · largeur':'A · '+M.formatMeasurement(model.widthMM,model.unit))}</text><text x="${fmt(right+25)}" y="${fmt((top+bottom)/2)}" font-size="17" fill="#577c3d">B</text>`;if(!illustrative)output+=`<text x="400" y="495" text-anchor="middle" font-size="14" fill="#7b8e6b">${esc('B · '+M.formatMeasurement(model.heightMM,model.unit)+' / C · '+M.formatMeasurement(model.reliefMM,model.unit))}</text>`;
 }
 if(interactive&&!polygon&&(tool==='edit'||tool==='draw')&&!client&&!editingItemId){mapped.forEach((point,index)=>{output+=`<circle cx="${fmt(point[0])}" cy="${fmt(point[1])}" r="${tool==='edit'?8:5}" fill="#fff" stroke="#5d8d43" stroke-width="2" data-draw-point="${index}" tabindex="0" role="button" aria-label="Point ${index+1}, déplacez-le ou utilisez les flèches"/>`;});}
 if(illustrative&&!small)output+=`<text x="400" y="35" text-anchor="middle" font-size="12" fill="#879677">MODÈLE ILLUSTRATIF · LES COTES RESTENT À SAISIR</text>`;return output+'</svg>';
}
function panelDiagramSVG(model,{illustrative=false,small=false,interactive=true}={}){
 const V=window.MIRProductionVolume,mesh=V.buildMesh(model);
 if(!mesh.valid)return V.render(model,{yaw:0,pitch:0,zoom:1,illustrative,formatMeasurement:M.formatMeasurement});
 const z=small?1:zoom,tr=fitModel(model);tr.scale*=z;tr.ox=400-(mesh.bounds.minX+mesh.bounds.maxX)*tr.scale/2;tr.oy=231+(mesh.bounds.minY+mesh.bounds.maxY)*tr.scale/2;
 const map=pts=>pts.map(p=>pointOnView(p,tr).map(fmt).join(',')).join(' '),hex=/^#[0-9a-f]{6}$/i.test(model.finish?.hex||'')?model.finish.hex:'#b8c5ae',swatch=safeAsset(model.spec?.finish?.swatchUrl||model.finish?.swatchUrl),suffix=small?'thumb-'+esc(model.spec?.id||'panel'):'main',paint='panel-face-paint-'+suffix,clip='panel-face-clip-'+suffix;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="group" aria-label="${esc(model.name)} — vue cotée, lips compris" data-panel-face="true" data-zoom="${z}" font-family="Arial,sans-serif"><title>${esc(model.name)} — dimensions hors tout avec lèvres</title><defs><clipPath id="${clip}"><rect x="16" y="45" width="768" height="365"/></clipPath>${swatch?`<pattern id="${paint}" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="${hex}"/><image href="${esc(swatch)}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>`:''}</defs><text x="400" y="30" text-anchor="middle" font-size="12" fill="#6f8064">${illustrative?'PROPORTIONS DU MODÈLE · COTES À SAISIR':'VUE DE FACE · LIPS INCLUS DANS LE HORS TOUT'}</text><g clip-path="url(#${clip})"><polygon points="${map(mesh.outer)}" fill="${swatch?'url(#'+paint+')':hex}" stroke="#4b5b46" stroke-width="1.5"/><polygon points="${map(mesh.front)}" fill="${swatch?'url(#'+paint+')':hex}" stroke="#4b5b46" stroke-width="2.2"/>`;
 (model.edges||[]).forEach((edge,i)=>{const a=pointOnView(mesh.outer[i],tr),b=pointOnView(mesh.outer[(i+1)%mesh.outer.length],tr);if(edge.id===model.bottomEdgeId&&!illustrative)svg+=`<path d="M${a.map(fmt).join(',')}L${b.map(fmt).join(',')}" stroke="${model.perforation?.enabled?'#26758d':'#54863f'}" stroke-width="5"${model.perforation?.enabled?' stroke-dasharray="10 5"':''}/>`;if(interactive&&!authoring)svg+=`<path d="M${a.map(fmt).join(',')}L${b.map(fmt).join(',')}" stroke="transparent" stroke-width="22" data-select-bottom="${esc(edge.id)}" tabindex="0" role="button" aria-label="Choisir ${esc(edge.name)} comme bas"/>`;});
 svg+='</g><rect x="0" y="420" width="800" height="100" fill="#fcfcf8"/>';
 const dims=[['A','Largeur hors tout',model.widthMM],['B','Hauteur hors tout',model.heightMM],['C','Projection',model.reliefMM]];
 svg+=dims.map(([letter,label,value],i)=>`<text x="${135+i*265}" y="448" text-anchor="middle" font-size="13" fill="#6f8064">${letter} · ${label}</text><text x="${135+i*265}" y="478" text-anchor="middle" font-size="24" fill="#294734" font-weight="600">${esc(illustrative?'À saisir':M.formatMeasurement(value,model.unit))}</text>`).join('');return svg+'</svg>';
}
function volumeSVG(model,{illustrative=false}={}){
 if(model.kind==='panel'&&window.MIRProductionVolume)return window.MIRProductionVolume.render(model,{yaw:orbit,pitch,zoom,illustrative,formatMeasurement:M.formatMeasurement});
 const points=model.pointsMM||[];if(points.length<2)return diagramSVG(model,{illustrative});const z=model.kind==='profile'?(model.lengthMM||Math.max(...points.flat().map(Math.abs),100)*2):(model.reliefMM||0),yaw=orbit*Math.PI/180,tilt=pitch*Math.PI/180;
 const project=([x,y,z])=>{const xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=-x*Math.sin(yaw)+z*Math.cos(yaw);return [xx,y*Math.cos(tilt)-zz*Math.sin(tilt),y*Math.sin(tilt)+zz*Math.cos(tilt)];};
 const front=points.map(([x,y])=>project([x,y,0])),back=points.map(([x,y])=>project([x,y,z])),all=[...front,...back],xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),scale=Math.min(610/Math.max(1,Math.max(...xs)-Math.min(...xs)),355/Math.max(1,Math.max(...ys)-Math.min(...ys))),cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2,pixel=p=>[400+(p[0]-cx)*scale,255-(p[1]-cy)*scale];
 let surfaces=[];const n=model.kind==='panel'?points.length:points.length-1;for(let i=0;i<n;i++){const j=(i+1)%points.length,p=[front[i],front[j],back[j],back[i]];surfaces.push({p,depth:p.reduce((s,v)=>s+v[2],0)/4,index:i});}if(model.kind==='panel')surfaces.push({p:front,depth:front.reduce((s,v)=>s+v[2],0)/front.length,index:100});surfaces.sort((a,b)=>a.depth-b.depth);const source=chosenColor(),swatch=safeAsset(source?.swatchUrl||source?.swatchImage),hex=/^#[0-9a-f]{6}$/i.test(model.finish?.hex||'')?model.finish.hex:'#b7c3ac';let out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="img" aria-label="Volume schématique de ${esc(model.name)}" font-family="Arial,sans-serif">${swatch?`<defs><pattern id="production-paint" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="${hex}"/><image href="${esc(swatch)}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern></defs>`:''}<text x="400" y="35" text-anchor="middle" font-size="12" fill="#7c8e6a">VOLUME SCHÉMATIQUE · GLISSEZ POUR TOURNER</text>`;
 for(const s of surfaces){const poly=s.p.map(pixel).map(p=>p.map(fmt).join(',')).join(' ');out+=`<polygon points="${poly}" fill="${swatch?'url(#production-paint)':hex}" stroke="#66775e" stroke-width="1.2"/><polygon points="${poly}" fill="${s.index%2?'#fff':'#122b10'}" fill-opacity="${s.index%2?.18:.08}"/>`;}
 if(model.kind==='panel')out+=`<polyline points="${[...front,front[0]].map(pixel).map(p=>p.map(fmt).join(',')).join(' ')}" fill="none" stroke="#4b6440" stroke-width="2.5"/>`;
 out+=`<text x="400" y="482" text-anchor="middle" font-size="13" fill="#7c8e6b">${esc(illustrative?'Proportions du modèle · aucune cote de fabrication renseignée':model.kind==='profile'?'Longueur : '+M.formatMeasurement(model.lengthMM,model.unit):'Projection C : '+M.formatMeasurement(model.reliefMM,model.unit)+' · lips cotés séparément')}</text></svg>`;return out;
}
function renderTools(){
 const el=$('#drawing-tools');
 el.hidden=kind!=='profile'||client||view==='volume'||!!editingItemId;
 if(el.hidden){el.innerHTML='';return;}
 const drawing=tool==='draw';
 const recentHem=draft.template==='custom'?(draft.bends||[]).findLastIndex(bend=>bend.mode==='hem'):-1;
 const hemNotice=recentHem<0?'':`<p class="draw-help hem-notice">Double pli · ${esc(draft.segments[recentHem].label)} → ${esc(draft.segments[recentHem+1].label)} <button type="button" data-focus-bend="${recentHem}">Modifier le pli</button></p>`;
 const compact=matchMedia('(any-pointer: coarse)').matches;
 const settingsStart=compact?'<details class="trace-more"><summary>Réglages du tracé</summary><div>':'';
 const moreStart=compact?'<details class="trace-more"><summary>Autres actions</summary><div>':'';
 const settingsEnd=compact?'</div></details>':'';
 el.innerHTML=drawing?`<button type="button" class="draw-primary" data-draw-tool="draw"${drawPoints.length<3?' disabled':''}>Terminer et coter</button><button type="button" data-drawing-undo${!drawPoints.length?' disabled':''}>Annuler le dernier point</button>${settingsStart}<label><input id="drawing-snap" type="checkbox"${snap?' checked':''}>Grille ${draft.unit==='mm'?'1 mm':'1/4 po'}</label><label><input id="drawing-right-angle" type="checkbox"${rightAngleSnap?' checked':''}>Aimant 45° / 90°</label><label>Hauteur du plan<select id="trace-height"><option value="10"${traceHeight===10?' selected':''}>10 po</option><option value="14"${traceHeight===14?' selected':''}>14 po</option></select></label>${settingsEnd}<p class="draw-help">Clique-glisse et relâche pour ajouter un côté. Shift verrouille à 90°. Pour un double pli, reviens presque sur le trait précédent.</p>${hemNotice}`:
 `${tool==='select'?'<button type="button" class="draw-primary" data-end-hem>Ajouter un double pli</button>':''}<button type="button" class="draw-primary" data-new-drawing>Nouveau dessin</button>${tool==='select'?moreStart:''}<button type="button" data-draw-tool="edit" aria-pressed="${tool==='edit'}">${tool==='edit'?'Terminer la retouche':'Déplacer les points'}</button><button type="button" data-draw-tool="draw" aria-pressed="false">Continuer le tracé</button><button type="button" data-focus-dimensions>Cotes et angles ↓</button>${hemNotice}${tool==='select'?settingsEnd:''}`;
}
function profileMeasureInput(index,label){
 const selector=draft.template==='custom'? `[data-segment-length="${index}"]`:
  /^[A-Z][A-Z0-9]*$/.test(label)?`[data-measure="${label}"]`:'';
 const input=selector&&$('#production-dimensions').querySelector(selector);
 return input&&!input.disabled&&!input.readOnly?input:null;
}
function renderFractionPickers(){
 if(draft.unit!=='in')return;
 const fields=document.querySelectorAll('#production-dimensions input[data-measure], #production-dimensions input[data-segment-length], #panel-lip, input[data-panel-lip]');
 const options=Array.from({length:16},(_,i)=>`<option value="${i}">${i?M.formatMeasurement(i*25.4/16,'in').replace(/ po$/,''):'0 · Sans fraction'}</option>`).join('');
 for(const input of fields){
  if(input.readOnly||input.disabled||input.parentElement.classList.contains('fraction-field'))continue;
  const row=document.createElement('span');
  row.className='fraction-field';
  input.before(row);
  row.append(input);
  const name=input.getAttribute('aria-label')||row.closest('label')?.textContent.trim()||'la mesure';
  row.insertAdjacentHTML('beforeend',`<select data-pick-fraction aria-label="Choisir la fraction pour ${esc(name)}"><option value="">Fraction</option>${options}</select>`);
 }
}
function applyMeasureFraction(select){
 const input=select.previousElementSibling;
 const fraction=Number(select.value);
 if(!select.value||!Number.isInteger(fraction)||fraction<0||fraction>15||draft.unit!=='in'||!input||input.readOnly||input.disabled)return;
 select.value='';
 const parsed=M.parseMeasurement(input.value,'in');
 if(!parsed.ok&&input.value.trim())return toast('Corrige la mesure avant de choisir sa fraction.');
 const value=parsed.ok?parsed.value:0;
 const amount=(Math.trunc(Math.abs(value))+fraction/16)*(value<0?-1:1);
 input.value=M.formatMeasurement(amount*25.4,'in').replace(/ po$/,'');
 handleInput({target:input});
}
function updateDrawing({keepForm=false}={}){
 renderFractionPickers();
 const actual=build(),shown=drawingModel(),mesh=kind==='panel'&&actual.valid&&!authoring?window.MIRProductionVolume?.buildMesh(actual):null;
 const geometryErrors=mesh&&!mesh.valid?mesh.errors:[];
 $('#drawing-title').textContent=authoring?'Modèle · '+(draft.name||actual.name):draft.name||actual.name;
 const stage=$('#production-drawing');if(tool!=='draw'||view!=='face')closeMobileTrace();stage.dataset.tool=tool;stage.dataset.view=view;stage.dataset.kind=kind;stage.style.touchAction=canDrawProfile()?'none':'';$('#trace-readout').hidden=!canDrawProfile();
 stage.innerHTML=view==='volume'?volumeSVG(shown.model,{illustrative:shown.illustrative}):diagramSVG(shown.model,{illustrative:shown.illustrative});
 const dimensions=$('#profile-dimension-list');
 const sides=tool==='draw'?drawPoints.slice(1).map((point,index)=>({
  label:String.fromCharCode(65+index),
  lengthMM:Math.hypot(point[0]-drawPoints[index][0],point[1]-drawPoints[index][1])
 })):shown.illustrative?[]:shown.model.segments||[];
 if(dimensions){
  dimensions.hidden=kind!=='profile'||!sides.length;
  dimensions.innerHTML=dimensions.hidden?'':sides.map((segment,index)=>{
   const text=esc(segment.label)+' · '+esc(M.formatMeasurement(segment.lengthMM,draft.unit));
   return tool==='select'&&profileMeasureInput(index,segment.label)
    ?`<li><button type="button" class="secondary-button" data-edit-profile-measure="${index}" aria-label="Modifier la cote ${esc(segment.label)} : ${esc(M.formatMeasurement(segment.lengthMM,draft.unit))}">${text}</button></li>`
    :`<li>${text}</li>`;
  }).join('');
 }

 $('#drawing-navigation').hidden=kind!=='panel'&&view!=='volume';$('#zoom-controls').hidden=kind!=='panel'&&(client||view!=='volume');$('#panel-zoom-value').textContent=Math.round(zoom*100)+' %';$('#panel-zoom-out').disabled=zoom<=.5;$('#panel-zoom-in').disabled=zoom>=4;
 $('#drawing-gesture-hint').textContent=view==='volume'?'Glissez pour tourner · molette ou pincement pour zoomer':'Molette ou pincement pour zoomer';
 document.querySelectorAll('[data-preview]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preview===view)));
 $('#finish-summary').textContent=draft.finish?.name||draft.finish?.code||'';
 $('#drawing-finish').textContent=authoring?'Proportions de présentation seulement':draft.finish?.name||draft.finish?.code||'Finition à sélectionner';
 $('#drawing-basis').textContent=shown.illustrative?'Modèle sans cotes de fabrication':kind==='panel'?'Hors tout, lèvres comprises':'Cotes de la pièce finie';
 $('#drawing-note').textContent=authoring?'Dessinez la forme et réglez ses angles. Les cotes restent des champs vides dans le modèle publié.':kind==='panel'?'A et B comprennent les lips. C est la projection. Les coins sont schématiques; les détails de fabrication seront validés par l’atelier.':'La face colorée est repérée par *. Le développé, les rayons et les corrections de pliage seront validés par l’atelier.';
 renderValidation({...actual,validation:{...actual.validation,errors:[...(actual.validation.errors||[]),...geometryErrors]}});
 const jRule=window.MIRBendingPresets?.checkJ(draft);
  const blockJ=jRule&&!jRule.pending&&(!jRule.valid||(!jRule.ok&&!window.MIRBendingPresets.exceptionMatches(jRule,jException)));
  $('#add-production-piece').disabled=!actual.valid||geometryErrors.length>0||busy||!!blockJ||!availableForPO();
  renderPieceGuidance(actual,blockJ);
 const quote=M.quotePolicy(draft);$('#custom-color-quote').hidden=authoring||!quote.required;renderPiecePrice(actual,geometryErrors);
 $('#add-production-piece').innerHTML=authoring?'Enregistrer le modèle <span aria-hidden="true">＋</span>':editingItemId?'Enregistrer la révision <span aria-hidden="true">✓</span>':quote.required?'Ajouter à ma soumission <span aria-hidden="true">＋</span>':(client?'Ajouter au dossier':order.poNumber?'Ajouter au bon '+esc(order.poNumber):'Choisir un bon et ajouter')+' <span aria-hidden="true">＋</span>';if(!keepForm)renderTools();
}
function renderPieceGuidance(model,blockJ){
 const box=$('#piece-guidance');
 box.hidden=client||kind!=='profile'||authoring;
 if(box.hidden)return;
 const blocking=model.validation.errors||[];
 const pending=model.validation.pending||[];
 if(!availableForPO()){box.textContent='Ce modèle est désactivé pour les bons. Réactive-le dans Mes modèles.';delete box.dataset.guidance;return;}
 const first=blocking[0]||(blockJ?null:pending[0]);
 const field=first?.path;
 const indexed=/^(segments|bends)\.(\d+)(?:\.(length))?$/.exec(field||'');
 const targets={
  length:'[data-measure="length"]',quantity:'#production-quantity',
  'material.type':'#material-type',material:'#material-thickness',
  'material.thickness':'#material-thickness',finish:'#color-system',
  'coloredFace.side':'#profile-painted-side',segments:'[data-new-drawing]',unit:'#production-unit'
 };
 let target=blockJ&&!blocking.length?'[data-mir-fix-j]':targets[field];
 let message=first?.message||(blockJ?'Vérifie le clouage du coin J.':'Pièce prête à ajouter au dossier.');
 if(indexed){
  const [,type,index,length]=indexed;
  if(type==='segments'&&length){
   const label=model.segments[Number(index)]?.label;
   message=label?'Côté '+label+' : '+message:message;
   target=draft.template==='custom'?`[data-segment-length="${index}"]`:
    /^[A-Z][A-Z0-9]*$/.test(label||'')?`[data-measure="${label}"]`:'';
  }else if(type==='bends')target=`[data-bend-angle="${index}"]:not(:disabled), [data-bend-direction="${index}"]:not(:disabled)`;
 }
 const heading=blocking.length||blockJ?'À corriger':pending.length?'À compléter pour la fabrication':'';
 const html=`${heading?`<strong>${heading}</strong> `:''}${esc(message)}${target&&$(target)?` <button type="button" data-piece-focus="${esc(target)}">Aller au champ</button>`:''}`;
 if(box.dataset.guidance!==html){box.innerHTML=html;box.dataset.guidance=html;}
}
function setZoom(value){zoom=Math.max(.5,Math.min(4,value));updateDrawing({keepForm:true});}

function renderValidation(model){const box=$('#production-validation');const errors=model.validation.errors||[],pending=authoring?[]:model.validation.pending||[],warnings=(model.validation.warnings||[]).filter(w=>w.code!=='GAUGE_NOT_CONVERTED');if(authoring&&model.valid){box.innerHTML='<div class="validation-group good"><strong>Modèle paramétrique sans cotes de commande.</strong><p>Les proportions de ce croquis servent à reconnaître la pièce. Les dimensions seront obligatoires à la commande.</p></div>';return;}let html='';if(errors.length)html+=`<div class="validation-group error"><strong>${client?'Renseignez vos cotes pour voir la pièce.':'Le dessin demande une correction.'}</strong><details><summary>${errors.length} cote${errors.length>1?'s':''} ou détail${errors.length>1?'s':''} à renseigner</summary><ul>${errors.map(e=>`<li>${esc(e.message)}</li>`).join('')}</ul></details></div>`;if(pending.length&&!errors.length)html+=`<div class="validation-group"><strong>Le dessin est prêt, la fiche reste à compléter.<span class="validation-count">${pending.length}</span></strong><details><summary>Voir les précisions à confirmer</summary><ul>${pending.map(e=>`<li>${esc(e.message)}</li>`).join('')}</ul></details></div>`;if(warnings.length)html+=`<div class="validation-group"><strong>À vérifier avec l’atelier</strong><ul>${warnings.map(e=>`<li>${esc(e.message)}</li>`).join('')}</ul></div>`;if(!errors.length&&!pending.length)html+='<div class="validation-group good"><strong>Les cotes et les options sont renseignées.</strong><p>La validation de fabrication reste à faire par l’atelier.</p></div>';box.innerHTML=html;}
function renderPanelMaterialControls(){
 const panel=kind==='panel',m=draft.material||{},options=panel?[['aluminium-extrude','Aluminium extrudé · sur mesure'],['aluminium',editingItemId&&!m.productRef&&m.type==='aluminium'?'Aluminium · référence du dossier':'Aluminium plié · Unico U-P1'],['acier',editingItemId&&!m.productRef&&m.type==='acier'?'Acier · référence du dossier':'Acier · Unico U-P1']]:[['aluminium','Aluminium'],['acier','Acier'],['acier-inoxydable','Acier inoxydable'],['autre','Autre métal à préciser']];
 if(panel&&!m.type)options.unshift(['','Matière à préciser']);
 if(m.type&&!options.some(x=>x[0]===m.type))options.push([m.type,'Matière du dossier · '+m.type]);
 $('#material-type').innerHTML=options.map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('');
 const thickness=$('#material-thickness'),needSelect=panel&&m.type!=='acier',isSelect=thickness.tagName==='SELECT';
 if(needSelect!==isSelect){const field=document.createElement(needSelect?'select':'input');field.id='material-thickness';field.setAttribute('aria-describedby','thickness-hint');if(!needSelect){field.inputMode='decimal';field.placeholder='À confirmer';}thickness.replaceWith(field);}
 if(needSelect){const values=m.type==='aluminium-extrude'?['2','3']:['2','3.2'];const current=String(m.thickness??'');if(current&&!values.includes(current))values.push(current);$('#material-thickness').innerHTML='<option value="">À confirmer</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v.replace('.',','))} mm</option>`).join('');}
 const gauge=$('#material-gauge'),gaugeSelect=panel&&m.type==='acier';if(gaugeSelect!==(gauge.tagName==='SELECT')){const field=document.createElement(gaugeSelect?'select':'input');field.id='material-gauge';if(!gaugeSelect){field.maxLength=40;field.placeholder='À préciser';}gauge.replaceWith(field);}if(gaugeSelect){const values=['18','20','22'];if(m.gauge&&!values.includes(String(m.gauge)))values.push(String(m.gauge));$('#material-gauge').innerHTML='<option value="">À confirmer</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v)} ga</option>`).join('');}
 $('#material-thickness').closest('label').hidden=panel&&m.type==='acier';$('#material-gauge').closest('label').hidden=panel&&m.type!=='acier';
 $('#thickness-hint').textContent=panel?(m.type==='acier'?'U-P1 : acier 18, 20 ou 22 ga. Choisissez le calibre à confirmer pour votre pièce.':m.type==='aluminium'?'U-P1 : aluminium plié de 2 ou 3,2 mm, selon la fiche Unico.':m.type?'Aluminium extrudé sur mesure : 2 ou 3 mm.':'Sélectionnez la matière avant de préciser son épaisseur.'): 'Épaisseur de tôle dans l’unité choisie. Le gage reste la valeur saisie.';
 $('#unico-panel-reference').hidden=!panel||m.type==='aluminium-extrude'||(!!editingItemId&&!m.productRef);
 const manufacturer=$('#color-system option[value="manufacturer"]');manufacturer.disabled=panel&&m.type==='aluminium-extrude';manufacturer.textContent=panel?'Couleurs Unico':'Nuancier du fabricant';
 if(panel&&m.type==='aluminium-extrude'&&colorSystem==='manufacturer'){colorSystem='ral';colorId='';}
}
function formMetadata(){draft.material=draft.material||{};draft.material.type=$('#material-type').value;draft.material.thickness=$('#material-thickness').value;draft.material.thicknessUnit=kind==='panel'?'mm':draft.unit;draft.material.gauge=$('#material-gauge').value;draft.quantity=Number($('#production-quantity').value);draft.location=$('#production-location').value;draft.note=$('#production-note').value;if(colorSystem==='special')draft.finish={system:$('#special-color-system')?.value||'',code:$('#special-color-code')?.value||'',name:$('#special-color-name')?.value||'',selectionType:'custom',special:true};else draft.finish=currentFinish();}
function renderFormMetadata(){const m=draft.material||{};if(kind==='panel'&&m.thickness!==''&&m.thickness!==null&&m.thickness!==undefined&&(m.thicknessUnit||draft.unit)!=='mm'){const parsed=M.parseMeasurement(m.thickness,m.thicknessUnit||draft.unit);if(parsed.ok){m.thickness=fmt(parsed.mm);m.thicknessUnit='mm';}}renderPanelMaterialControls();$('#material-type').value=m.type||(kind==='panel'?'':'aluminium');$('#material-thickness').value=m.thickness??'';$('#material-gauge').value=m.gauge||'';$('#production-quantity').value=draft.quantity||1;$('#production-location').value=draft.location||'';$('#production-note').value=draft.note||'';$('#cancel-piece-edit').hidden=!editingItemId;for(const el of document.querySelectorAll('.config-card>.config-section'))el.hidden=authoring;$('#add-production-piece').closest('.config-section').hidden=false;if(authoring){for(const child of $('#add-production-piece').closest('.config-section').children)child.hidden=!child.classList.contains('piece-submit');}else for(const child of $('#add-production-piece').closest('.config-section').children)child.hidden=false;}
function hasPanelGeometryIssue(item){const model=build(item.spec||item);if(model.kind!=='panel')return false;const mesh=window.MIRProductionVolume.buildMesh(model);if(item.sourceLayout&&model.valid&&mesh.errors?.length&&mesh.errors.every(error=>error.code==='PROJECTION_REQUIRED'))return !window.MIRProductionVolume.buildMesh(M.buildPanel({...model.spec,relief:0})).valid;return !mesh.valid;}
function invalidPanelItems(){return (order.items||[]).filter(hasPanelGeometryIssue);}
function profileGroupOverrides(){
 return Object.fromEntries(order.items.filter(item=>item.profileGroup).map(item=>[item.id,item.profileGroup]));
}
function profileGroupControl(item){
 return `<label class="profile-group-choice">Groupe<select data-profile-group="${esc(item.id)}"><option value="">Automatique</option>${M.PROFILE_GROUPS.map(group=>`<option${group===item.profileGroup?' selected':''}>${esc(group)}</option>`).join('')}</select></label>`;
}
const PO_ARCHIVE='mir_production_admin_orders_v1';
const poKey=value=>String(value||'').trim().toLocaleUpperCase('fr-CA');
function openOrders(){
 const saved=read(PO_ARCHIVE,[]);
 return Array.isArray(saved)?saved.filter(row=>row?.id&&Array.isArray(row.items)):[];
}
function normalizeWorkshopOrder(saved){
 const items=saved.items.filter(item=>item?.spec&&item.snapshot?.schema==='mir-production-instance-1'&&build(item.spec).valid);
 const nextNumber=Math.max(saved.nextNumber||1,1+Math.max(0,...items.map(item=>Number(/^M(\d{1,12})$/.exec(String(item.id))?.[1]||0))));
 return {...saved,items,nextNumber};
}
function activeWorkshopOrderMatches(){
 const stored=read(KEYS.draft,null)?.order;
 if(!stored||Array.isArray(stored.items)&&JSON.stringify(normalizeWorkshopOrder(stored))===JSON.stringify(order))return true;
 toast('Le dossier a changé dans un autre onglet. Rechargez cette page.');
 return false;
}
function switchWorkshopOrder(next){
 if(!activeWorkshopOrderMatches())return false;
 next=normalizeWorkshopOrder(next);
 const saved=openOrders().filter(row=>row.id!==order.id);
 if(order.id!==next.id&&(order.poNumber||order.items.length||order.sourceRequestId||order.project||order.notes||order.foreman))saved.push(order);
 if(!store(PO_ARCHIVE,saved)||!store(KEYS.draft,{version:1,order:next}))return false;
 order=next;editingItemId=null;
 return true;
}
function pickPO(number){
 const reference=String(number||'').trim();
 if(!reference){toast('Entre un numéro de bon.');return false;}
 if(poKey(order.poNumber)===poKey(reference))return true;
 const found=openOrders().find(row=>row.id!==order.id&&poKey(row.poNumber)===poKey(reference));
 const next=found||(!order.poNumber?{...order,poNumber:reference}:{...defaultOrder(),poNumber:reference});
 if(!switchWorkshopOrder(next))return false;
 renderOrder();renderFormMetadata();updateDrawing();
 return true;
}
function choosePODialog(intent='',description=''){
 const rows=[order,...openOrders().filter(row=>row.id!==order.id)]
  .filter(row=>row.poNumber||row.items.length);
 dialog(intent?'Choisir le bon pour cette pièce':'Bons de commande en cours',
  (description?description+' · ':'')+'Entre un numéro pour créer un bon ou retrouver un bon enregistré sur cet appareil.',
  `<form id="mir-po-form" data-po-intent="${intent}" class="dialog-form"><label>Numéro du bon<input name="po" maxlength="100" list="mir-po-list" required placeholder="Ex. PO-2026-084"></label><datalist id="mir-po-list">${rows.filter(row=>row.poNumber).map(row=>`<option value="${esc(row.poNumber)}">${esc(row.project)}</option>`).join('')}</datalist><button class="primary-button" type="submit">${intent?'Ajouter à ce bon':'Ouvrir ce bon'}</button></form>`+
  (rows.length?`<ul class="mir-po-list">${rows.map(row=>`<li><button type="button" class="secondary-button" data-open-po="${esc(row.id)}" data-po-intent="${intent}"${intent&&!row.poNumber?' disabled':''}>${esc(row.poNumber||'Brouillon sans numéro')} · ${row.items.length} ligne(s)${row.project?' · '+esc(row.project):''}</button></li>`).join('')}</ul>`:''));
}
function finishPOChoice(intent){
 closeDialog();
 if(intent==='add')addPiece();
 if(intent==='transfer')offerProfileImport(true);
}
function updateOrderReference(){
 const box=$('#order-po-summary');
 const reference=String(order.poNumber||'').trim();
 box.textContent=reference?' · '+reference:' · PO à préciser';
}
function renderOrder(){const validItems=order.items||[];
 updateOrderReference();
$('#order-head-count').textContent=String(validItems.length).padStart(2,'0');$('#production-count').textContent=String(validItems.length).padStart(2,'0');for(const [id,key] of [['order-project','project'],['order-po','poNumber'],['order-foreman','foreman'],['order-date','date'],['order-revision','revision'],['order-notes','notes']])$('#'+id).value=order[key]||'';
 const renderItem=item=>{const model=build(item.spec),geometryIssue=hasPanelGeometryIssue(item),snapshot=item.snapshot,thumb=diagramSVG(model,{small:true,interactive:false});return `<article class="production-item" data-production-item="${esc(item.id)}"><div class="production-item-thumb">${thumb}</div><div class="production-item-info"><span class="production-item-label">${esc(item.id)}${snapshot?` · modèle V${snapshot.templateVersion} / pièce R${snapshot.revision}`:''}</span><h3>${esc(model.name)}</h3><p>${esc(model.kind==='profile'?model.segments.map(s=>s.label+' '+M.formatMeasurement(s.lengthMM,model.unit)).join(' · ')+' · L '+M.formatMeasurement(model.lengthMM,model.unit):M.formatMeasurement(model.widthMM,model.unit)+' × '+M.formatMeasurement(model.heightMM,model.unit)+' · C '+M.formatMeasurement(model.reliefMM,model.unit))}</p><p>${esc([model.finish.manufacturer||model.finish.system,model.finish.name||model.finish.code,model.location].filter(Boolean).join(' · '))}</p><span class="item-status${model.complete&&!geometryIssue?' complete':''}">${geometryIssue?'Géométrie à corriger':M.quotePolicy(item.spec).required?'Soumission obligatoire · couleur personnalisée':model.complete?'Renseignée · validation atelier':'Précisions à compléter'}</span>${linePriceMarkup(item.spec)}</div><label class="production-item-qty">Quantité<input data-item-quantity="${esc(item.id)}" type="number" min="1" step="1" value="${model.quantity||1}" aria-label="Quantité de la pièce ${esc(item.id)}"></label><div class="production-item-actions">${!client&&model.kind==='profile'?profileGroupControl(item):''}<button type="button" data-edit-piece="${esc(item.id)}">Modifier ↗</button><button type="button" data-duplicate-piece="${esc(item.id)}">Dupliquer</button><button type="button" class="remove-piece" data-remove-piece="${esc(item.id)}">Retirer</button></div></article>`;};
 if(!validItems.length)$('#production-items').innerHTML='<div class="production-empty"><strong>La bonne pièce commence ici.</strong><p>Ajoutez vos pièces pour préparer leur dossier coté et leur bon de commande.</p></div>';
 else if(client)$('#production-items').innerHTML=validItems.map(renderItem).join('');
 else{
  const byId=new Map(validItems.map(item=>[item.id,item]));
  const models=validItems.map(item=>({...build(item.spec),id:item.id}));
  $('#production-items').innerHTML=[...M.groupProfiles(models,profileGroupOverrides())].map(([family,models])=>
   `<section class="production-family"><h3>${esc(family)} <small>· ${models.length}</small></h3>${models.map(model=>renderItem(byId.get(model.id))).join('')}</section>`).join('');
 }
 const qty=validItems.reduce((n,item)=>n+(item.spec.quantity||0),0),pending=validItems.filter(item=>!build(item.spec).complete||hasPanelGeometryIssue(item)).length;$('#production-total').textContent=validItems.length?`${validItems.length} référence${validItems.length>1?'s':''} · ${qty} pièce${qty>1?'s':''}${pending?' · '+pending+' fiche'+(pending>1?'s':'')+' à compléter':''}`:'Votre dossier attend sa première pièce.';$('#production-json').disabled=!validItems.length;$('#production-pdf').disabled=!validItems.length||busy||invalidPanelItems().length>0;$('#prepare-local-request').hidden=!client;$('#prepare-local-request').disabled=!validItems.length||busy||invalidPanelItems().length>0;const pricing=dossierPricing();renderDossierPrice(pricing);$('#prepare-local-request').textContent=pricing.requiresQuote?'Préparer ma demande de soumission ↗':'Préparer ma demande ↗';$('#production-pdf').textContent=pricing.requiresQuote?'Dossier de soumission PDF ↓':usesBendingSheet(pricing.requiresQuote)?'Bon de commande · Fiche PDF ↓':'Bon de commande PDF ↓';$('.document-status').textContent=pricing.requiresQuote?'Soumission obligatoire pour les pièces personnalisées':!client&&kind==='profile'?'Brouillon sur cet appareil':'Brouillon à valider';
 renderLayoutImport();
}
function renderLayoutImport(){
 const banner=$('#panel-layout-import');if(!banner)return;banner.hidden=true;if(client)return;
 const output=window.MIRPanelLayoutOutput;if(!output)return;
 let raw;try{raw=localStorage.getItem(output.STORAGE_KEY);}catch{return;}if(!raw)return;
 banner.hidden=false;
 try{
  const payload=JSON.parse(raw),preview=output.inspectImport(order,payload),transfer=preview.transfer;
  const sourceHref='calepinage.html#'+encodeURIComponent(transfer.zoneId),otherRevision=(order.layoutImports||[]).some(row=>row.zoneId===transfer.zoneId&&row.id!==transfer.id);
  banner.innerHTML=`<strong>${esc(transfer.name)} · ${transfer.items.length} panneaux · révision ${esc(transfer.revision)}</strong><p>${preview.alreadyImported?'Cette révision a déjà été ajoutée au dossier. Aucun doublon ne sera créé.':'Vos panneaux gardent les cotes hors tout et les repères du calepinage. La matière, la projection et la perforation restent à préciser si elles ne sont pas renseignées.'}</p>${otherRevision?'<p>Une autre révision de cette zone existe dans le dossier. Cet ajout crée de nouvelles lignes; il ne remplace pas les pièces existantes.</p>':''}<p>Données locales sur ce navigateur · dossier à valider par l’atelier. Aucun bon n’est envoyé à Zoho Books.</p><div class="piece-submit"><button type="button" id="import-panel-layout" class="primary-button" ${preview.alreadyImported||layoutImportBusy||busy?'disabled':''}>${preview.alreadyImported?'Panneaux déjà ajoutés':layoutImportBusy?'Enregistrement…':'Ajouter ces '+transfer.items.length+' panneaux au dossier'}</button><a class="text-link" href="${esc(sourceHref)}">Retour au calepinage ↗</a></div>`;
 }catch(error){banner.innerHTML=`<strong>Calepinage à vérifier</strong><p>${esc(error.message)}</p><a class="text-link" href="calepinage.html">Ouvrir le calepinage ↗</a>`;}
}
async function importPanelLayout(){
 if(client||busy||layoutImportBusy)return;
 const output=window.MIRPanelLayoutOutput;if(!output)return;
 layoutImportBusy=true;renderLayoutImport();
 try{
  const perform=()=>output.importStored(localStorage,KEYS.draft,{fallbackOrder:order,expectedOrder:order});
  const result=globalThis.navigator?.locks?.request?await navigator.locks.request('mir-production-admin-dossier',perform):perform();
  if(!result.ok){toast(result.error||'Le calepinage n’a pas été ajouté.');return;}
  // The stored dossier is adopted only after the complete batch was saved.
  order=result.order;workflow='configure';authoring=false;editingItemId=null;
  render();toast(result.alreadyImported?'Cette révision est déjà présente : aucun doublon ajouté.':result.added+' panneaux ajoutés et enregistrés dans le dossier.');
  if(!result.alreadyImported)$('#production-order').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){toast('Le calepinage n’a pas été ajouté : '+error.message);}
 finally{layoutImportBusy=false;renderLayoutImport();}
}
function valuesFromDraft(spec,id){const measurements={};if(spec.kind==='profile'){if(spec.template==='custom')for(const s of spec.segments||[])measurements[s.label]=s.length;else Object.assign(measurements,spec.dimensions||{});measurements.length=spec.length;}else{for(const key of ['width','height','relief','lip','apexX','topWidth','topOffset','offset','tipDepth','apexOffset'])measurements[key]=spec[key];measurements.lips=copy(spec.lips||{});}return {id,instanceId:id,name:spec.name,unit:spec.unit,measurements,quantity:spec.quantity,material:copy(spec.material||{}),finish:{manufacturer:'',selectionType:null,hex:null,swatchUrl:null,swatchImage:null,source:null,availabilityNote:'',displayOnly:false,...copy(spec.finish||{})},length:spec.length,coloredFace:copy(spec.coloredFace||{}),mirrorX:spec.mirrorX===true,dimensionBasis:spec.dimensionBasis,bottomEdgeId:spec.bottomEdgeId,perforation:copy(spec.perforation||{}),lips:copy(spec.lips||{}),location:spec.location,note:spec.note};}
function makeItem(spec,id,{old=null,template=selectedTemplate}={}){let result;if(old?.snapshot){result=M.reviseInstance({snapshot:old.snapshot,history:old.history||[]},valuesFromDraft(spec,id));}else{let source=template;const created=M.createTemplate(spec,{id:source?.id||`modele-piece-${id}-${uid()}`,name:spec.name||source?.name,version:source?.version||1});if(!created.ok)return created;const structural=topology=>{const value=copy(topology);delete value.coloredFace;return JSON.stringify(value);};if(!source)source=created.template;else if(structural(source.topology)!==structural(created.template.topology)){if(client&&!source.id.startsWith('mir-standard-'))return {ok:false,errors:[{message:'La forme de ce modèle est fixe. Choisissez un autre modèle pour changer ses angles.'}]};const variant=M.createTemplate(spec,{id:source.id+'-variante-'+uid(),name:spec.name||source.name,version:1});if(!variant.ok)return variant;source=variant.template;}result=M.instantiateTemplate(source,valuesFromDraft(spec,id));}if(!result.ok)return result;return {ok:true,item:{id,kind:result.model.kind,spec:copy(result.spec),snapshot:copy(result.snapshot),history:copy(result.history||[]),...(old?.profileGroup?{profileGroup:old.profileGroup}:{}),...(old?.sourceProfile?{sourceProfile:copy(old.sourceProfile)}:{}),...(old?.sourceLayout?{sourceLayout:copy(old.sourceLayout)}:{}),selection:{materialId,colorSystem,colorId},savedAt:new Date().toISOString()},model:result.model};}
function addPiece(){
 formMetadata();if(authoring)return saveTemplateDialog();
 if(!client&&!activeWorkshopOrderMatches())return;
 if(!client&&!editingItemId&&!order.poNumber)return choosePODialog('add');
 if(!availableForPO())return toast('Activez Bon de commande pour ce modèle dans Mes modèles.');
 const imported=order.items.find(item=>item.id===editingItemId)?.sourceProfile;
 if(imported&&draft.template==='custom'){
   const previous=order.items.find(item=>item.id===editingItemId).spec;
   const dimensions=spec=>spec.segments.map(segment=>M.parseMeasurement(segment.length,spec.unit).mm);
   if(dimensions(previous).some((mm,i)=>Math.abs(mm-dimensions(draft)[i])>0.001||!Number.isFinite(dimensions(draft)[i]))||draft.note!==previous.note)
     return toast('Pour modifier les cotes ou la dérogation, reprenez la pièce dans Pliage.');
 }
 const model=build();
 if(!model.valid||kind==='panel'&&!window.MIRProductionVolume.buildMesh(model).valid)
   return toast('Complétez les cotes et les lips avant d’ajouter la pièce.');
 const jRule=window.MIRBendingPresets?.checkJ(draft);
 if(jRule&&!jRule.valid)return toast(jRule.message||'Complétez le coin J.');
 if(jRule&&!jRule.ok&&!window.MIRBendingPresets.exceptionMatches(jRule,jException))
   return toast('Le clouage J est trop court : corrigez-le ou acceptez explicitement une dérogation.');
 let jSnapshot=null;
 if(jRule)try{jSnapshot=window.MIRBendingPresets.finalizeJ(draft,jException);}catch(error){return toast(error.message);}
 const id=editingItemId||'M'+String(order.nextNumber||1).padStart(3,'0'),
   old=order.items.find(item=>item.id===editingItemId);
 const spec={...draft,id};
 if(jSnapshot?.ruleExceptions?.length){
   const exception=jSnapshot.ruleExceptions[0];
   const note='Dérogation clouage J : '+window.MIRCalepinageExtension.formatInches(exception.currentIn)+
     ' (min. '+window.MIRCalepinageExtension.formatInches(exception.minimumIn)+
     ') · acceptée par '+exception.acceptedBy+(exception.note?' · '+exception.note:'');
   spec.note=[spec.note,note].filter(Boolean).join(' · ').slice(0,500);
 }
 const result=makeItem(spec,id,{old});
 if(!result.ok)return toast(result.errors?.map(e=>e.message).join(' ')||'La pièce n’a pas pu être configurée.');
 if(jSnapshot&&!old)result.item.sourceProfile=jSnapshot;
 const nextOrder={...order,items:old?order.items.map(item=>item===old?result.item:item):[...order.items,result.item]};
 if(!old)nextOrder.nextNumber=(order.nextNumber||1)+1;
 if(!store(KEYS.draft,{version:1,order:nextOrder}))return;
 order=nextOrder;
 editingItemId=null;renderOrder();renderFormMetadata();updateDrawing();
 toast(old?'Nouvelle révision enregistrée. La version précédente reste conservée.':id+(client?' ajouté au dossier.':' ajouté au bon. Aucune diffusion en boutique ou au magasin.'));
}
function offerProfileImport(confirmedPO=false){
 const bridge=window.MIRProfileProductionTransfer;
 if(client||params.get('profil-mir')!=='1'||!bridge)return;
 const pending=read(bridge.KEY,null);
 if(!pending?.id)return toast('Aucune pièce de pliage à transférer sur cet appareil.');
 if([order,...openOrders()].some(row=>row.profileImports?.includes(pending.id)))return toast('Cette pièce a déjà été transférée dans un bon.');
 try{
  const prepared=bridge.prepare(window.MIRCalepinageExtension,pending.snapshot,pending.length,pending.quantity);
  if(!confirmedPO||!order.poNumber)return choosePODialog('transfer',prepared.spec.name+' · '+pending.length+' po · quantité '+pending.quantity);
  dialog('Ajouter au bon '+order.poNumber,prepared.spec.name+' · '+pending.length+' po · quantité '+pending.quantity+(prepared.spec.note?' · '+prepared.spec.note:''),'<div class="dialog-actions"><button type="button" class="primary-button" id="confirm-profile-import">Ajouter la pièce</button></div>');
  $('#confirm-profile-import').onclick=()=>{
   if(read(bridge.KEY,null)?.id!==pending.id)return toast('Le transfert a changé. Retournez dans Pliage.');
   if(!activeWorkshopOrderMatches())return;
   const id='M'+String(order.nextNumber||1).padStart(3,'0');
   const result=makeItem({...prepared.spec,id},id,{template:null});
   if(!result.ok)return toast(result.errors?.map(e=>e.message).join(' ')||'La pièce est invalide.');
   result.item.sourceProfile=prepared.source;
   const next={...order,items:[...order.items,result.item],nextNumber:(order.nextNumber||1)+1,profileImports:[...(order.profileImports||[]),pending.id]};
   if(!store(KEYS.draft,{version:1,order:next}))return;
   order=next;
   try{localStorage.removeItem(bridge.KEY);}catch{}
   closeDialog();renderOrder();$('#production-order').scrollIntoView({block:'start'});
   toast(id+' ajoutée au dossier, avec son dessin et sa dérogation le cas échéant.');
  };
 }catch(error){toast(error.message);}
}
function restoreSelection(item){const selection=item.selection||{};colorSystem=selection.colorSystem||({manufacturer:'manufacturer',ral:'ral',custom:'special'}[item.spec.finish?.selectionType])||((item.spec.finish||{}).system==='RAL Classic'?'ral':item.spec.finish?.manufacturer||/^Nuancier /i.test(item.spec.finish?.system||'')?'manufacturer':item.spec.finish?.special?'special':'manufacturer');materialId=selection.materialId||materials.find(m=>m.brand===item.spec.finish?.manufacturer)?.id||'';colorId=selection.colorId||'';if(!colorId&&colorSystem==='ral')colorId=ral.colors.find(c=>c.code===item.spec.finish?.code)?.id||'';if(!colorId&&colorSystem==='manufacturer')colorId=(chosenMaterial()?.colors||[]).find(c=>(c.code||c.name)===item.spec.finish?.code)?.id||'';}
function editPiece(id){const item=order.items.find(row=>row.id===id);if(!item)return;jException=null;workflow='configure';authoring=false;editingTemplateId=null;editingItemId=id;activeDefaultLocks={};kind=item.kind;draft=copy(item.spec);selectedTemplate=item.snapshot?.templateSnapshot||null;restoreSelection(item);tool='select';view='face';render();$('.production-workspace').scrollIntoView({behavior:'smooth',block:'start'});toast(`${id} : la correction sera enregistrée comme une nouvelle révision.`);}
function render(){
 document.body.dataset.client=String(client);
 const profileAdmin=!client&&kind==='profile';
 const previous=document.body.dataset.profileAdmin;
 document.body.dataset.profileAdmin=String(profileAdmin);
 if(previous!==String(profileAdmin)&&!client){
  $('.piece-finish').open=!profileAdmin;
  $('#order-metadata').open=!profileAdmin;
  $('#production-title').textContent=profileAdmin?'Pliage sur mesure':'Panneaux métalliques';
  $('#production-eyebrow').textContent='ATELIER MIR';
  $('#production-description').textContent=profileAdmin?'Choisis un profil ou dessine-le, puis entre tes cotes.':'Configurez vos panneaux sur mesure.';
 }document.querySelectorAll('[data-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kind===kind)));document.querySelectorAll('[data-workflow]').forEach(button=>button.setAttribute('aria-current',button.dataset.workflow===workflow?'page':'false'));$('#request-count').textContent=requests.length;const configure=workflow==='configure';for(const selector of ['.kind-bar','.template-section','.production-workspace'])$(selector).hidden=!configure;$('#production-order').hidden=!configure||authoring;$('#production-library').hidden=workflow!=='models';$('#production-requests').hidden=workflow!=='requests';$('#author-banner').hidden=!authoring||!configure;if(authoring)$('#author-banner').innerHTML=`<div><strong>Édition d’un modèle${editingTemplateId?' · nouvelle version':''}</strong><span>La forme et les angles sont définis ici. Les mesures de commande restent vides pour le client.</span></div><button type="button" data-cancel-author>Quitter les modèles</button>`;if(configure){renderTemplates();renderDimensions();renderProfileOptions();renderPanelOptions();renderFormMetadata();renderColors();updateDrawing();renderOrder();}if(workflow==='models')renderModels();if(workflow==='requests')renderRequests();}
function renderModels(){const records=templates.filter(record=>!record.archived);$('#production-library').innerHTML=`<div class="library-heading"><div><p class="eyebrow">VOS MODÈLES RÉUTILISABLES</p><h2>Une forme. <em>Toutes les mesures.</em></h2><p>Dessinez le modèle une fois. Le client saisit ses cotes, et sa pièce arrive dans les demandes avec son dessin enregistré.</p></div><div><button type="button" class="primary-button" data-new-model="profile">Dessiner un pliage ＋</button><button type="button" class="secondary-button" data-new-model="panel">Créer un panneau ＋</button></div></div><div class="mir-template-backup-actions"><button type="button" class="secondary-button" data-export-mir-models="1">Exporter mes modèles (JSON)</button><button type="button" class="secondary-button" data-import-mir-models="1">Importer une sauvegarde</button><input id="mir-template-backup-file" type="file" accept=".json,application/json" hidden aria-label="Fichier JSON de modèles MIR"></div><div class="local-scope-note"><strong>Catalogue de modèles local</strong><p><a class="text-link" href="gestion-boutique.html">Gérer la visibilité du catalogue public ↗</a></p><p>Les modèles disponibles apparaissent dans le parcours client et le magasin sur ce navigateur. Leur partage entre appareils reste à connecter.</p></div><div class="model-library-grid">${records.length?records.map(record=>{const t=latest(record),preview=M.templatePreview(t);return `<article class="model-library-card"><div class="model-preview">${preview.ok?diagramSVG(preview.model,{illustrative:true,small:true,interactive:false}):''}</div><div class="model-library-body"><span class="eyebrow">${t.kind==='profile'?'PLIAGE':'PANNEAU MÉTALLIQUE'} · VERSION ${t.version}</span><h3>${esc(t.name)}</h3><p>${t.fields.filter(f=>f.required).length} cotes requises · ${Object.values(record.measurementDefaults?.values||{}).filter(v=>String(v?.value??'').trim()).length} cote(s) préremplie(s) pour le magasin</p><p class="model-channels">${[record.channels?.client===true?'Boutique':'',record.channels?.store===true?'Magasin employés':'',record.channels?.po!==false?'Bon de commande':''].filter(Boolean).join(' · ')||'Usage interne'}</p><div class="model-actions"><button type="button" class="primary-button" data-use-saved-model="${esc(record.id)}">Remplir les cotes ↗</button><button type="button" class="plain-button" data-edit-model="${esc(record.id)}">Nouvelle version</button><button type="button" class="plain-button" data-archive-model="${esc(record.id)}">Retirer du catalogue</button></div></div></article>`;}).join(''):'<div class="production-empty"><strong>Votre premier modèle, prêt à servir.</strong><p>Les modèles contiennent la forme, les angles et les champs à remplir. Aucune cote de commande n’est publiée.</p></div>'}</div>`;}
function beginAuthor(type,record=null){workflow='configure';authoring=true;editingItemId=null;activeDefaultLocks={};editingTemplateId=record?.id||null;kind=type;selectedTemplate=record?latest(record):null;if(record){const p=M.templatePreview(selectedTemplate);if(!p.ok){toast('Ce modèle est invalide.');return;}draft=copy(p.model.spec);draft.name=selectedTemplate.name;draft.kind=type;}else draft=sampleSpec(type,type==='profile'?'custom':'rectangle');tool='select';view='face';drawPoints=[];render();$('.production-workspace').scrollIntoView({behavior:'smooth',block:'start'});}
function useSavedTemplate(id){const record=templates.find(r=>r.id===id);if(!visibleTemplate(record)){toast('Ce modèle n’est pas proposé dans ce catalogue.');return;}const t=latest(record),defaults=window.MIRModelDefaults?.prepare(t,record.measurementDefaults);
if(defaults&&!defaults.ok){toast(defaults.errors.join(' '));return;}
const blank=M.instantiateTemplate(t,{unit:'in',measurements:defaults?.measurements||{},length:defaults?.length||'',quantity:1,material:{type:record.allowed?.materials?.[0]||'aluminium'},finish:{},bottomEdgeId:'bottom',perforation:{enabled:false},coloredFace:{side:'',segmentId:'A'}});
activeDefaultLocks=client&&catalogueChannel==='store'?(defaults?.locks||{}):{};
workflow='configure';authoring=false;editingTemplateId=null;editingItemId=null;selectedTemplate=t;draft=copy(blank.spec||blank.model?.spec||{});draft.kind=t.kind;kind=t.kind;draft.name=t.name;draft.perforation=draft.perforation||{enabled:false,details:''};draft.lips=draft.lips||{};colorSystem=record.allowed?.colorSystems?.[0]||'manufacturer';colorId='';view='face';tool='select';render();applyTemplateOptions(record);}
function applyTemplateOptions(record){const allowed=record?.allowed;if(!allowed)return;for(const opt of $('#material-type').options)opt.disabled=allowed.materials?.length?!allowed.materials.includes(opt.value):false;for(const opt of $('#color-system').options)opt.disabled=allowed.colorSystems?.length?!allowed.colorSystems.includes(opt.value):false;}
function saveTemplateDialog(){const old=templates.find(record=>record.id===editingTemplateId),current=old?latest(old):null;
 const provisional=M.createTemplate(draft,{name:draft.name||'Modèle MIR'});
 const fields=provisional.template?.fields||current?.fields||[];
 const fieldRows=fields.map(field=>{
  const saved=old?.measurementDefaults?.values?.[field.key]||{};
  return `<div class="mir-default-row"><label>${esc(field.label)}<input name="mir-default-${esc(field.key)}" inputmode="decimal" placeholder="Laisser vide" value="${esc(saved.value??'')}"></label><label class="mir-default-lock"><input type="checkbox" name="mir-lock-${esc(field.key)}"${saved.locked===true?' checked':''}>Verrouiller</label></div>`;
 }).join('');
 dialog(current?'Nouvelle version du modèle':'Enregistrer le modèle','Le modèle conserve sa forme et ses angles. Chaque mesure de fabrication sera demandée au client.',`<form class="dialog-form" id="save-production-template"><label>Nom du modèle<input name="name" maxlength="140" value="${esc(current?.name||draft.name||'Mon modèle MIR')}" required></label><label>Description<textarea name="description" rows="2" maxlength="500" placeholder="À quoi sert ce modèle ?">${esc(current?.description||'')}</textarea></label><fieldset><legend>Matières proposées</legend><div class="choice-checks">${[['aluminium','Aluminium'],['acier','Acier'],['acier-inoxydable','Inox']].map(([id,label])=>`<label class="check-field"><input type="checkbox" name="materials" value="${id}"${(old?.allowed?.materials||['aluminium','acier']).includes(id)?' checked':''}>${label}</label>`).join('')}</div></fieldset><fieldset><legend>Références de couleur proposées</legend><div class="choice-checks">${[['manufacturer','Nuancier fabricant'],['ral','RAL Classic'],['special','Référence spéciale']].map(([id,label])=>`<label class="check-field"><input type="checkbox" name="colorSystems" value="${id}"${(old?.allowed?.colorSystems||['manufacturer','ral','special']).includes(id)?' checked':''}>${label}</label>`).join('')}</div></fieldset><div class="choice-checks"><label class="check-field"><input type="checkbox" name="client"${old?.channels?.client===true?' checked':''}>Boutique (vente)</label><label class="check-field"><input type="checkbox" name="store"${old?.channels?.store===true?' checked':''}>Magasin (commandes employés)</label><label class="check-field"><input type="checkbox" name="po"${old?.channels?.po!==false?' checked':''}>Bon de commande</label></div><fieldset class="mir-standard-measures"><legend>Mesures standards du magasin</legend><p class="field-hint">En pouces. Laissez vide pour une mesure à renseigner; cochez « Verrouiller » pour une cote fixe chez les employés. Ces réglages restent sur cet appareil tant que le portail partagé n'est pas activé.</p>${fieldRows}</fieldset><p class="field-hint">Nouveau modèle privé par défaut sur cet appareil : cochez un canal seulement si vous souhaitez l’y proposer. Les anciennes demandes conservent leurs dessins et leurs cotes.</p><p id="production-dialog-error" class="dialog-error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Annuler</button><button type="submit" class="primary-button">Enregistrer le modèle</button></div></form>`);}
function renderRequests(){$('#production-requests').innerHTML=`<div class="library-heading"><div><p class="eyebrow">DEMANDES PRÉPARÉES PAR LES CLIENTS</p><h2>Le dessin est <em>déjà là.</em></h2><p>Reprenez les cotes et les dessins enregistrés pour remplir votre bon de production. Le modèle courant ne remplace jamais la version de la demande.</p></div></div><div class="local-scope-note"><strong>File de demandes sur cet appareil</strong><p>Aucune commande n’a été envoyée. Les comptes clients, le partage entre appareils et Zoho Books restent à connecter.</p></div><div class="request-list">${requests.length?requests.slice().reverse().map(request=>{const qty=request.items.reduce((s,item)=>s+(item.spec?.quantity||0),0),quote=dossierPricing(request.items).requiresQuote;return `<article class="request-card"><div><p class="eyebrow">${esc(request.id)} · ${quote?'SOUMISSION REQUISE':'DEMANDE LOCALE'}</p><h3>${esc(request.order?.project||'Projet à nommer')}</h3><p>${request.items.length} référence${request.items.length>1?'s':''} · ${qty} pièce${qty>1?'s':''} · ${esc(new Date(request.createdAt).toLocaleDateString('fr-CA'))}</p><p class="field-hint">${quote?'Couleur personnalisée : aucun prix automatique. ':''}Chaque pièce conserve son modèle, ses cotes, son dessin et son numéro de révision.</p></div><div><button type="button" class="secondary-button" data-view-request="${esc(request.id)}">Voir les pièces</button><button type="button" class="primary-button" data-open-request="${esc(request.id)}">Reprendre en production ↗</button></div></article>`;}).join(''):'<div class="production-empty"><strong>Aucune demande préparée ici.</strong><p>Le bouton « Préparer ma demande » du parcours client crée un dossier local avec les pièces et leurs dessins.</p><a class="text-link" href="production.html?mode=client">Ouvrir le parcours client ↗</a></div>'}</div>`;}
function prepareRequest(){
 if(!order.items.length)return;
 if(invalidPanelItems().length)return toast('Corrigez la géométrie des panneaux signalés avant de préparer la demande.');
 const pricing=dossierPricing(),requestKind=pricing.requiresQuote?'quote':'configuration';
 const metadata={project:order.project,poNumber:order.poNumber,foreman:order.foreman,date:order.date,revision:order.revision,notes:order.notes};
 const signature=JSON.stringify({order:metadata,items:order.items.map(item=>item.snapshot?.revisionId||item.id),requestKind,pricingSchema:pricing.schema,priceLines:pricing.items.map(item=>[item.itemId,item.status,item.unitCents,item.quantity,item.lineCents])});
 const previous=requests.find(request=>request.sourceDossierId===order.id&&request.signature===signature);
 if(previous){toast('Cette version de la demande est déjà préparée sur cet appareil.');return;}
 const request={id:'MIR-DEM-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+String(requests.length+1).padStart(3,'0'),createdAt:new Date().toISOString(),source:'local_demo',status:'prepared_local',requestKind,pricing,sourceDossierId:order.id,signature,order:metadata,items:copy(order.items)};
 requests.push(request);store(KEYS.requests,{version:1,requests});$('#request-count').textContent=requests.length;
 dialog(pricing.requiresQuote?'Votre demande de soumission est préparée.':'Votre demande est préparée.','Les pièces et les dessins sont conservés ensemble. Dans cet aperçu, la demande est disponible uniquement sur ce navigateur.',`<div class="local-scope-note"><strong>${esc(request.id)}</strong><p>${request.items.length} référence${request.items.length>1?'s':''} · ${esc(order.project||'Projet à nommer')}<br>${pricing.requiresQuote?'Couleur personnalisée : prix à établir par MIR. Aucun prix automatique.<br>':''}Aucun envoi, achat ni paiement n’a eu lieu.</p></div><div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Continuer</button><button type="button" class="primary-button" data-download-request="${esc(request.id)}">Télécharger le dossier JSON ↓</button></div>`);
}
function showRequest(id){const request=requests.find(r=>r.id===id);if(!request)return;dialog(request.id,request.order?.project||'Demande locale',`<div class="request-piece-list">${request.items.map(item=>{const model=build(item.spec);return `<article><strong>${esc(item.id+' · '+model.name)}</strong><span>${model.quantity||'À préciser'} pièce(s) · modèle V${item.snapshot?.templateVersion||'?'} · révision R${item.snapshot?.revision||1}</span><div>${diagramSVG(model,{interactive:false,small:true})}</div></article>`;}).join('')}</div><div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Fermer</button><button type="button" class="primary-button" data-open-request="${esc(id)}">Reprendre une copie en production</button></div>`);}
function openRequest(id,confirmed=false){
 const request=requests.find(r=>r.id===id);
 if(client||!request)return;
 if((order.poNumber||order.items.length)&&!confirmed){
  dialog('Reprendre cette demande ?','Le dossier actuel sera conservé dans Bons en cours. La demande s’ouvrira dans un dossier séparé.',`<div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Garder le dossier actuel</button><button type="button" class="primary-button" data-confirm-open-request="${esc(id)}">Reprendre la demande</button></div>`);
  return;
 }
 const existing=[order,...openOrders()].find(row=>row.sourceRequestId===id);
 const {poNumber:clientReference,notes='',...metadata}=request.order||{};
 const next=existing||{...defaultOrder(),...metadata,poNumber:'',
  notes:[clientReference?'Référence du client : '+clientReference:'',notes].filter(Boolean).join(' · '),
  sourceRequestId:id,items:copy(request.items),
  nextNumber:Math.max(0,...request.items.map(item=>Number(String(item.id).replace(/\D/g,''))||0))+1};
 if(next.id!==order.id&&!switchWorkshopOrder(next))return;
 workflow='configure';authoring=false;
 if($('#production-dialog').open)closeDialog();
 render();$('#production-order').scrollIntoView({behavior:'smooth',block:'start'});
 toast('Demande ouverte. Tes autres bons sont conservés.');
}
function downloadJSON(value,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function usesBendingSheet(requiresQuote){
 return !client&&!requiresQuote&&order.items.length>0&&order.items.every(item=>item.spec.kind==='profile');
}
async function exportPDF(){
 if(!order.items.length||busy)return;
 if(invalidPanelItems().length)return toast('Corrigez les lips des panneaux signalés avant de produire le PDF. Le dossier JSON reste disponible.');
 const quote=dossierPricing().requiresQuote,bending=usesBendingSheet(quote);
 busy=true;renderOrder();
 const status=$('#production-export-status');
 status.textContent=quote?'Préparation du dossier de soumission…':'Préparation du PDF…';
 try{
  const pages=M.productionPages({...order,items:order.items.map(item=>item.snapshot||item.spec)},bending?{layout:'bending-sheet',profileGroups:profileGroupOverrides()}:undefined);
  const prefix=quote?'MIR-demande-soumission-':bending?'MIR-mise-en-production-':'MIR-bon-production-';
  const result=await window.MIRPDF.exportPlan({
   faces:pages,title:quote?'MIR — Demande de soumission':bending?'Mise en production':'MIR — Dossier de fabrication',
   subtitle:order.project||'Pièces sur mesure · dossier à valider',
   filename:prefix+(order.poNumber||order.revision||'brouillon').replace(/[^a-zA-Z0-9_-]/g,'-')+'.pdf',
   onProgress:message=>status.textContent=message
  });
  status.textContent=`PDF prêt · ${result.pages} page${result.pages>1?'s':''}.`;
 }catch(error){status.textContent='Export impossible : '+error.message;}
 finally{busy=false;renderOrder();}
}
function toCustom(points,base=draft){
 if(points.length<3)return null;
 const unit=base.unit||'in',segments=[],bends=[];
 const heading=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
 const startAngle=heading(points[0],points[1]);
 let renderedHeading=startAngle;
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(length<.001)return null;
  segments.push({label:String.fromCharCode(65+i),length:fmt(unitValue(length,unit))});
  if(i===points.length-2)continue;
  const c=points[i+2],nextHeading=heading(b,c);
  const turn=((nextHeading-renderedHeading+540)%360+360)%360-180;
  const departure=180-Math.abs(turn);
  const oldHem=base?.bends?.[i]?.mode==='hem';
  // Le tracé crée un repli à la main; une retouche de ses points conserve
  // ce repli tant que l'écart avec 180° reste dans la tolérance de 12°.
  const nearReturn=departure<=12&&(
    tool==='draw'&&length>=Math.hypot(c[0]-b[0],c[1]-b[1])||oldHem);
  if(departure<1e-5||nearReturn){
   bends.push({mode:'hem',angle:180,direction:oldHem?base.bends[i].direction:(departure<1e-5||turn>0?'left':'right')});
   renderedHeading+=180;
  }else{
   bends.push({mode:'signed',angle:Number(fmt(turn))});
   renderedHeading=nextHeading;
  }
 }
 const spec={...copy(base),kind:'profile',template:'custom',segments,bends,startAngle:Number(fmt(startAngle)),name:authoring?'Profil dessiné':base.name||'Profil personnalisé'};
 delete spec.dimensions;
 return spec;
}
function unlockCustom(){if(client||editingItemId){toast('Cette pièce conserve la forme de son modèle. Modifiez les cotes ou créez un nouveau modèle.');return false;}const model=build();if(!model.valid){toast('Complétez les cotes de section pour modifier sa forme.');return false;}if(draft.template!=='custom'){draft={...draft,template:'custom',segments:model.segments.map(s=>({label:s.label,name:s.name,length:fmt(unitValue(s.lengthMM,draft.unit))})),bends:model.bends.map(b=>({mode:b.mode,angle:b.angle,direction:b.direction})),startAngle:model.segments[0].headingDeg};delete draft.dimensions;}return true;}
function doubleFoldDialog(){if(client||editingItemId)return toast('Créez une nouvelle version du modèle pour modifier sa forme.');const model=build();if(!model.valid)return toast('Renseignez la section avant d’ajouter deux plis.');dialog('Ajouter un double pli','Remplacez un côté par trois segments : avant le pli, entre les deux plis et après le second. Ces deux plis sont distincts d’un retour écrasé de 180°.',`<form id="double-fold-form" class="dialog-form"><label>Côté à remplacer<select name="segmentIndex">${model.segments.map((s,i)=>`<option value="${i}">${esc(s.label+' · '+M.formatMeasurement(s.lengthMM,model.unit))}</option>`).join('')}</select></label><div class="three-fields"><label>Avant le premier pli<input name="beforeLength" inputmode="decimal" required></label><label>Entre les deux plis<input name="betweenLength" inputmode="decimal" required></label><label>Après le second pli<input name="afterLength" inputmode="decimal" required></label></div><div class="two-fields"><label>Angle intérieur du pli 1<input name="firstAngle" type="number" value="90" min="0.1" max="180" step="any" required></label><label>Sens du pli 1<select name="firstDirection"><option value="left">Gauche</option><option value="right">Droite</option></select></label></div><div class="two-fields"><label>Angle intérieur du pli 2<input name="secondAngle" type="number" value="90" min="0.1" max="180" step="any" required></label><label>Sens du pli 2<select name="secondDirection"><option value="right">Droite</option><option value="left">Gauche</option></select></label></div><p class="field-hint">${authoring?'Proportions illustratives : aucune cote de commande ne sera publiée.':'Mesures de pièce finie en '+(draft.unit==='mm'?'millimètres':'pouces')+'.'}</p><p id="production-dialog-error" class="dialog-error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Annuler</button><button type="submit" class="primary-button">Ajouter les deux plis</button></div></form>`);}
function localPoint(event, useGrid=snap){const svg=$('#production-drawing svg'),tr=drawTransform;if(!svg||!tr)return null;let x,y;if(svg.createSVGPoint&&svg.getScreenCTM){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const matrix=svg.getScreenCTM();if(!matrix)return null;const q=p.matrixTransform(matrix.inverse());x=q.x;y=q.y;}else{const r=svg.getBoundingClientRect();if(!r.width||!r.height)return null;const scale=Math.min(r.width/800,r.height/520);x=(event.clientX-r.left-(r.width-800*scale)/2)/scale;y=(event.clientY-r.top-(r.height-520*scale)/2)/scale;}let result=[(x-tr.ox)/tr.scale,(tr.oy-y)/tr.scale];if(useGrid){const step=draft.unit==='mm'?1:6.35;result=result.map(v=>Math.round(v/step)*step);}return result;}
function canDrawProfile(){
 return kind==='profile'&&tool==='draw'&&view==='face'&&!client&&!editingItemId;
}
function magneticHeading(raw, gesture){
 const difference=target=>Math.abs(Math.atan2(Math.sin(raw-target),Math.cos(raw-target)));
 if(gesture.magnetHeading!==undefined){
  if(difference(gesture.magnetHeading)<=5*Math.PI/180)return gesture.magnetHeading;
  delete gesture.magnetHeading;
 }
 const step=Math.PI/4;
 let target=Math.round(raw/step)*step;
 if(gesture.heading!==undefined){
  for(const normal of [gesture.heading-Math.PI/2,gesture.heading+Math.PI/2]){
   if(difference(normal)<difference(target))target=normal;
  }
 }
 if(difference(target)<=2.5*Math.PI/180){
  gesture.magnetHeading=target;
  return target;
 }
 return raw;
}
function traceAlignment(start, heading, length, gesture){
 const direction=[Math.cos(heading),Math.sin(heading)];
 const tolerance=10/drawTransform.scale;
 const match=target=>{
  const component=direction[target.axis];
  if(Math.abs(component)<.2)return null;
  const distance=(target.anchor[target.axis]-start[target.axis])/component;
  return distance>0?{...target,distance,error:Math.abs(distance-length)}:null;
 };
 if(gesture.alignment){
  const held=match(gesture.alignment);
  if(held&&held.error<=tolerance*1.8)return held;
  delete gesture.alignment;
 }
 let best=null;
 for(const anchor of drawPoints.slice(0,-1)){
  for(const axis of [0,1]){
   const candidate=match({anchor,axis});
   if(candidate&&candidate.error<=tolerance&&(!best||candidate.error<best.error))best=candidate;
  }
 }
 gesture.alignment=best;
 return best;
}
function draggedSegment(event, gesture){
 const end=localPoint(event,false);
 if(!end)return null;
 const start=gesture.start,dx=end[0]-start[0],dy=end[1]-start[1];
 const previous=gesture.heading;
 const rawHeading=Math.atan2(dy,dx);
 const base=previous??0;
 const heading=event.shiftKey?base+Math.round((rawHeading-base)/(Math.PI/2))*Math.PI/2:rightAngleSnap?magneticHeading(rawHeading,gesture):rawHeading;
 const length=heading!==rawHeading?Math.abs(dx*Math.cos(heading)+dy*Math.sin(heading)):Math.hypot(dx,dy);
 const step=draft.unit==='mm'?1:25.4/(snap?4:16);
 const aligned=rightAngleSnap?traceAlignment(start,heading,length,gesture):null;
 const rounded=aligned?.distance??Math.round(length/step)*step;
 if(!rounded)return null;
 const point=[start[0]+rounded*Math.cos(heading),start[1]+rounded*Math.sin(heading)];
 const turn=previous===undefined?null:Math.abs(Math.atan2(Math.sin(heading-previous),Math.cos(heading-previous)))*180/Math.PI;
 const angle=turn===null?null:Math.round((180-turn)*10)/10;
 return {point, lengthLabel:M.formatMeasurement(rounded,draft.unit), angle, guide:aligned?.anchor};
}
function drawDragPreview(segment, gesture){
 const readout=$('#trace-readout');
 readout.textContent=segment?'Relâche pour ajouter le côté':'Glisse pour tracer un côté';
 const svg=$('#production-drawing svg');
 if(!svg)return;
 svg.querySelector('[data-trace-preview]')?.remove();
 if(!segment)return;
 const [x,y]=pointOnView(gesture.start,drawTransform),[ex,ey]=pointOnView(segment.point,drawTransform);
 const scale=Math.max(1,Math.min(2.2,800/svg.clientWidth));
 const label=(x,y,value)=>`<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(17*scale)}" font-weight="700" fill="#603b20" stroke="#fff5e3" stroke-width="${fmt(6*scale)}" stroke-linejoin="round" paint-order="stroke">${esc(value)}</text>`;
 const size=Math.hypot(ex-x,ey-y), outgoing=Math.atan2(ey-y,ex-x);
 let angle='';
 if(segment.angle!==null){
  const incoming=Math.PI-gesture.heading;
  const sweep=Math.atan2(Math.sin(outgoing-incoming),Math.cos(outgoing-incoming));
  const r=Math.min(38*scale,size*.36), mid=incoming+sweep/2;
  const ray=(direction,distance)=>[x+Math.cos(direction)*distance,y+Math.sin(direction)*distance];
  const [ax,ay]=ray(mid,r+16*scale);
  angle=`<path d="M ${ray(incoming,r).map(fmt).join(' ')} A ${fmt(r)} ${fmt(r)} 0 0 ${sweep>=0?1:0} ${ray(outgoing,r).map(fmt).join(' ')}" fill="none" stroke="#9c5a22" stroke-width="2"/>`+label(ax,ay,segment.angle+'°');
 }
 const line=`<line x1="${fmt(x)}" y1="${fmt(y)}" x2="${fmt(ex)}" y2="${fmt(ey)}" stroke="#9c5a22" stroke-width="3" stroke-dasharray="8 6" vector-effect="non-scaling-stroke"/>`;
 const guide=segment.guide?pointOnView(segment.guide,drawTransform):null;
 const alignment=guide?`<line x1="${fmt(guide[0])}" y1="${fmt(guide[1])}" x2="${fmt(ex)}" y2="${fmt(ey)}" stroke="#517e48" stroke-width="2" stroke-dasharray="4 5" vector-effect="non-scaling-stroke"/>`:'';
 const content=`<g data-trace-preview pointer-events="none">${alignment}${line}${angle}${label((x+ex)/2,(y+ey)/2,segment.lengthLabel)}</g>`;
 const marker=svg.querySelector('.profile-side-marker');
 if(marker)marker.insertAdjacentHTML('beforebegin',content);
 else svg.insertAdjacentHTML('beforeend',content);
}
function traceShift(event){
 if(event.key!=='Shift'||drag?.type!=='trace'||!drag.last)return;
 drag.last={...drag.last,shiftKey:event.shiftKey};
 drawDragPreview(draggedSegment(drag.last,drag),drag);
}
function beginPointDrag(event){
 const stage=$('#production-drawing');if(!stage.contains(event.target))return;
 if(canDrawProfile()&&event.target.closest('svg')&&event.button===0&&event.isPrimary){
  suppressClick=false;
  const start=drawPoints.at(-1)||localPoint(event,false);
  if(!start)return;
  const prior=drawPoints.length>=3?build().segments.at(-1)?.headingDeg:undefined;
  const before=drawPoints.at(-2);
  const heading=finite(prior)?prior*Math.PI/180:before?Math.atan2(start[1]-before[1],start[0]-before[0]):undefined;
  drag={type:'trace',id:event.pointerId,x:event.clientX,y:event.clientY,start,heading,moved:false};
  if(event.pointerType==='touch')stage.setPointerCapture?.(event.pointerId);
  return;
 }

 if(kind==='panel'){
  pointers.set(event.pointerId,[event.clientX,event.clientY]);stage.setPointerCapture?.(event.pointerId);
  if(pointers.size===2){const a=[...pointers.values()];drag={type:'pinch',distance:Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1]),zoom};event.preventDefault();return;}
 }
 if(view==='volume'){drag={type:'orbit',x:event.clientX,y:event.clientY,orbit,pitch,moved:false};stage.setPointerCapture?.(event.pointerId);return;}
 const circle=event.target.closest('[data-draw-point]');if(circle&&tool==='edit'&&!client&&!editingItemId){event.preventDefault();const model=build();if(!model.valid)return;drawPoints=copy(model.pointsMM);drawTransform=fitModel(model);drag={type:'point',index:Number(circle.dataset.drawPoint),pointerId:event.pointerId,moved:false};stage.setPointerCapture?.(event.pointerId);}
}

function movePoint(event){
 if(pointers.has(event.pointerId))pointers.set(event.pointerId,[event.clientX,event.clientY]);
 if(!drag)return;
 if(drag.type==='trace'){
  if(event.pointerId!==drag.id)return;
  if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<4)return;
  if(!drag.moved)$('#production-drawing').setPointerCapture?.(event.pointerId);
  drag.moved=true;
  drag.last={clientX:event.clientX,clientY:event.clientY,shiftKey:event.shiftKey};
  drawDragPreview(draggedSegment(drag.last,drag),drag);
  return;
 }
 if(drag.type==='pinch'){const a=[...pointers.values()];if(a.length===2&&drag.distance>0){event.preventDefault();setZoom(drag.zoom*Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1])/drag.distance);}return;}
 if(drag.type==='orbit'){const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.moved=drag.moved||Math.hypot(dx,dy)>3;orbit=drag.orbit+dx*.55;pitch=Math.max(-85,Math.min(85,drag.pitch+dy*.3));updateDrawing({keepForm:true});return;}
 const p=localPoint(event);if(!p)return;drawPoints[drag.index]=p;const spec=toCustom(drawPoints);if(spec){draft=spec;drag.moved=true;updateDrawing({keepForm:true});}
}

function endPoint(event){
 pointers.delete(event.pointerId);const stage=$('#production-drawing');if(stage.hasPointerCapture?.(event.pointerId))stage.releasePointerCapture(event.pointerId);
 if(drag?.type==='trace'){
  if(event.pointerId!==drag.id)return;
  const gesture=drag;
  drag=null;
  drawDragPreview(null,gesture);
  if(event.type!=='pointerup'||!canDrawProfile())return;
  if(!gesture.moved){
   if(event.pointerType==='touch'){const point=localPoint(event);if(point)appendTracePoint(point);suppressClick=true;}
   return;
  }
  suppressClick=true;
  const segment=draggedSegment(event,gesture);
  if(segment)appendTracePoint(segment.point,gesture.start);
  return;
 }
 if(!drag)return;const moved=drag.type==='point'&&drag.moved;
 suppressClick=drag.type==='pinch'||!!drag.moved;drag=null;
 if(moved){renderDimensions();renderProfileOptions();updateDrawing();}
}

function magneticTapPoint(point, previousDegrees){
 const start=drawPoints.at(-1),before=drawPoints.at(-2);
 const dx=point[0]-start[0],dy=point[1]-start[1],raw=Math.atan2(dy,dx);
 const previous=finite(previousDegrees)?previousDegrees*Math.PI/180:before?Math.atan2(start[1]-before[1],start[0]-before[0]):undefined;
 const heading=magneticHeading(raw,{heading:previous});
 if(heading===raw)return point;
 const along=dx*Math.cos(heading)+dy*Math.sin(heading);
 return [start[0]+along*Math.cos(heading),start[1]+along*Math.sin(heading)];
}
function focusProfileDimensions(bendIndex){
 const target=bendIndex===undefined?$('#configure-heading'):$('[data-angle-details="'+bendIndex+'"] summary');
 if(!target)return;
 if(bendIndex!==undefined)target.parentElement.open=true;
 target.focus();
}
function appendTracePoint(point, start){
 if(drawPoints.length>=27)return toast('Un profil peut contenir au maximum 26 segments.');
 const last=drawPoints.at(-1);
 if(last&&Math.hypot(point[0]-last[0],point[1]-last[1])<.01)return;
 if(!last&&start)drawPoints.push(start);
 drawPoints.push(point);
 const spec=toCustom(drawPoints);
 if(spec){draft=spec;renderDimensions();}
 renderTools();
 updateDrawing({keepForm:true});
}
function drawingClick(event){
 if(suppressClick){suppressClick=false;return;}
 if(!canDrawProfile())return;
 const raw=localPoint(event);
 if(!raw)return;
 const heading=drawPoints.length>=3?build().segments.at(-1)?.headingDeg:undefined;
 const point=event.shiftKey&&drawPoints.length
  ?draggedSegment(event,{start:drawPoints.at(-1),heading:finite(heading)?heading*Math.PI/180:drawPoints.length===2?Math.atan2(drawPoints[1][1]-drawPoints[0][1],drawPoints[1][0]-drawPoints[0][0]):undefined})?.point
  :rightAngleSnap&&drawPoints.length?magneticTapPoint(raw,heading):raw;
 if(point)appendTracePoint(point);
}
function exportMirTemplates(){
 const output=window.MIRTemplateBackup?.create(templates);
 if(!output?.ok)return toast(output?.error||'Sauvegarde de modèles indisponible.');
 try{
  const blob=new Blob([output.content],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=output.filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  toast(output.count+' modèle(s) sauvegardé(s) dans un fichier JSON. Les commandes ne sont pas incluses.');
 }catch(error){toast('Export impossible : '+error.message);}
}
async function importMirTemplates(input){
 const file=input.files?.[0];
 if(!file)return;
 try{
  if(file.size>window.MIRTemplateBackup?.MAX_BYTES){toast('Fichier trop volumineux (maximum 3 Mo).');return;}
  const raw=await file.text(),result=window.MIRTemplateBackup?.merge(raw,templates);
  if(!result?.ok){toast(result?.error||'Fichier de modèles invalide.');return;}
  if(!result.added){toast('Aucun nouveau modèle à importer : '+result.skipped+' déjà présent(s), conservé(s).');return;}
  if(!store(KEYS.templates,{version:1,records:result.records}))return;
  templates=result.records;workflow='models';render();
  toast(result.added+' nouveau(x) modèle(s) importé(s) en privé; '+result.skipped+' modèle(s) existant(s) inchangé(s).');
 }catch(error){toast('Import impossible : '+error.message);}
 finally{input.value='';}
}
function endHemDialog(){
 const model=build();
 if(!model.valid)return toast('Complète les cotes avant d’ajouter un double pli.');
 if(model.segments.length>=26)return toast('Le profil contient déjà 26 côtés.');
 const first=model.segments[0],last=model.segments.at(-1);
 const side=(x,other)=>Math.abs(x-other)<.001?'':x<other?' · à gauche':' · à droite';
 const start=first.start[0],end=last.end[0];
 dialog('Ajouter un double pli','Choisis une extrémité, la longueur du retour et son sens.',`<form id="end-hem-form" class="dialog-form"><label>Extrémité<select name="end"><option value="start">Début · ${esc(first.label+side(start,end))}</option><option value="end">Fin · ${esc(last.label+side(end,start))}</option></select></label><label>Longueur du retour (${draft.unit==='mm'?'mm':'po'})<input name="length" value="${draft.unit==='mm'?'13':'1/2'}" required></label><label>Sens du retour<select name="direction"><option value="left">Gauche du tracé</option><option value="right">Droite du tracé</option></select></label><p id="production-dialog-error" class="dialog-error" role="alert"></p><button class="primary-button" type="submit">Ajouter le retour</button></form>`);
}
function profileWithEndHem(spec,model,atStart,length,direction){
 const segments=model.segments.map((segment,index)=>({
  ...spec.segments?.[index],label:segment.label,name:segment.name,
  length:spec.template==='custom'?spec.segments[index].length:spec.dimensions[segment.label]
 }));
 const bends=model.bends.map(({mode,angle,direction})=>({mode,angle,direction}));
 const hem={mode:'hem',angle:180,direction};
 const added={length};
 if(atStart){segments.unshift(added);bends.unshift(hem);}
 else{segments.push(added);bends.push(hem);}
 const coloredIndex=segments.findIndex(s=>s.label===model.coloredFace.segmentId);
 segments.forEach((segment,index)=>{segment.label=String.fromCharCode(65+index);});
 const startAngle=model.segments[0].headingDeg+(atStart?180:0);
 const next={...spec,template:'custom',segments,bends,startAngle:((startAngle%360)+360)%360,
  coloredFace:{...model.coloredFace,segmentId:segments[coloredIndex]?.label||'A'}};
 delete next.dimensions;
 return next;
}
function toggleProfilePaintedFace(){
 const face=draft.coloredFace;
 if(kind!=='profile'||view!=='face'||tool!=='select'||!face?.side)return;
 face.side=face.side==='left'?'right':'left';
 const select=$('#profile-painted-side');
 if(select)select.value=face.side;
 updateDrawing();
}
function closeMobileTrace(){
 const card=$('.drawing-card');
 card.classList.remove('mobile-trace');
 if(document.fullscreenElement===card)document.exitFullscreen().catch(()=>{});
}
async function openMobileTrace(card){
 card.classList.add('mobile-trace');
 try{
  await card.requestFullscreen?.();
  if(document.fullscreenElement===card&&card.classList.contains('mobile-trace'))await screen.orientation?.lock?.('landscape');
 }catch{
  // Embedded browsers can reject fullscreen or orientation locking.
  // The fixed drawing card remains available in either orientation.
 }
}
function startProfileDrawing(){
 kind='profile';
 draft={...draft,kind:'profile',template:'custom',segments:[],bends:[],startAngle:0,name:'Profil dessiné'};
 delete draft.dimensions;
 tool='draw';view='face';drawPoints=[];
 drawTransform={scale:520/(traceHeight*25.4),ox:140,oy:395};
 if(matchMedia('(any-pointer: coarse)').matches)void openMobileTrace($('.drawing-card'));
 renderDimensions();
 updateDrawing();
}
function handleClick(event){if(event.target.closest('[data-toggle-painted-face]'))return toggleProfilePaintedFace();const button=event.target.closest('button,[data-select-bottom]');if(!button)return;const d=button.dataset;
 if(d.editProfileMeasure!==undefined){
  const index=Number(d.editProfileMeasure),label=build().segments?.[index]?.label;
  const input=label&&profileMeasureInput(index,label);
  if(input){
   const details=input.closest('details');
   if(details)details.open=true;
   input.focus();
   input.select();
  }
  return;
 }
 if(button.hasAttribute('data-focus-dimensions'))return focusProfileDimensions();
 if(d.focusBend!==undefined){
  if(tool==='draw'){tool='select';updateDrawing();}
  return focusProfileDimensions(Number(d.focusBend));
 }
 if(button.id==='mir-choose-po'&&!client)return choosePODialog();
 if(d.openPo&&!client){
  const row=[order,...openOrders()].find(value=>value.id===d.openPo);
  if(!row)return;
  if(row.id===order.id||row.poNumber&&pickPO(row.poNumber))finishPOChoice(d.poIntent);
  else if(!row.poNumber&&switchWorkshopOrder(row)){
   closeDialog();renderOrder();renderFormMetadata();updateDrawing();
  }
  return;
 }
 if(d.pieceFocus){
  const target=$(d.pieceFocus);
  if(target){
   for(let section=target.closest('details');section;section=section.parentElement.closest('details'))section.open=true;
   target.focus();
  }
  return;
 }
 if(d.exportMirModels&&!client){exportMirTemplates();return;}
 if(d.importMirModels&&!client){$('#mir-template-backup-file')?.click();return;}
  if(d.mirFixJ){try{draft=window.MIRBendingPresets.autoCorrectJ(draft);jException=null;renderDimensions();renderProfileOptions();updateDrawing();toast('Clouage ajusté au minimum requis.');}catch(error){toast(error.message);}return;}
  if(d.mirAcceptJ){const check=window.MIRBendingPresets?.checkJ(draft);if(!check?.valid||check.ok)return;dialog('Garder le clouage hors règle','Le minimum est '+window.MIRCalepinageExtension.formatInches(check.minimumIn)+'. La dérogation sera enregistrée sur la pièce et dans la production.',`<form id="mir-j-exception-form" class="dialog-form"><label class="check-field"><input type="checkbox" name="accepted" required> J’accepte explicitement ce clouage hors règle.</label><label>Acceptée par (nom ou identifiant)<input name="acceptedBy" maxlength="100" required></label><label>Note chantier facultative<input name="note" maxlength="220" placeholder="Contexte de fabrication"></label><p id="production-dialog-error" class="dialog-error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Annuler</button><button type="submit" class="primary-button">Confirmer la dérogation</button></div></form>`);return;}
 if(button.id==='import-panel-layout')return importPanelLayout();
 if(button.hasAttribute('data-close-production-dialog'))return closeDialog();
 if(d.workflow){workflow=d.workflow;authoring=false;editingTemplateId=null;render();return;}
 if(d.kind){kind=d.kind;choose(kind,kind==='panel'?'rectangle':'l');return;}
 if(d.template){choose(kind,d.template,{empty:client&&!authoring});return;}
 if(d.savedTemplate||d.useSavedModel){useSavedTemplate(d.savedTemplate||d.useSavedModel);return;}
 if(d.preview){view=d.preview;tool='select';updateDrawing();return;}
 if(button.id==='mirror-panel'){draft=M.mirrorPanelSpec(draft);renderDimensions();renderPanelOptions();updateDrawing();toast('Panneau inversé. Les lips et le bas suivent la pièce.');return;}
 if(button.id==='panel-zoom-in'){setZoom(zoom*1.2);return;}
 if(button.id==='panel-zoom-out'){setZoom(zoom/1.2);return;}
 if(button.id==='panel-view-reset'){zoom=1;orbit=-35;pitch=23;updateDrawing();return;}
 if(d.productionColor){colorId=d.productionColor;renderColorGrid();if($('#production-ral'))$('#production-ral').value=colorId;updateFinish();updateDrawing();return;}
 if(d.selectBottom&&!authoring){draft.bottomEdgeId=d.selectBottom;draft.perforation={...draft.perforation,edgeId:d.selectBottom};renderPanelOptions();updateDrawing();return;}
 if(button.id==='add-production-piece')return addPiece();
 if(button.id==='cancel-piece-edit'){editingItemId=null;choose(kind,kind==='panel'?'rectangle':'l');return;}
 if(d.editPiece)return editPiece(d.editPiece);
 if(d.removePiece){order.items=order.items.filter(item=>item.id!==d.removePiece);if(editingItemId===d.removePiece)editingItemId=null;persist();renderOrder();renderFormMetadata();updateDrawing();return;}
 if(d.duplicatePiece){const original=order.items.find(item=>item.id===d.duplicatePiece);if(!original)return;if(hasPanelGeometryIssue(original))return toast('Corrigez les lips de cette pièce avant de la dupliquer.');const id='M'+String(order.nextNumber||1).padStart(3,'0'),result=M.instantiateTemplate(original.snapshot.templateSnapshot,{...copy(original.snapshot.values),id,instanceId:id});if(!result.ok)return toast(result.errors.map(e=>e.message).join(' '));order.items.push({...copy(original),id,spec:copy(result.spec),snapshot:copy(result.snapshot),history:[],savedAt:new Date().toISOString()});order.nextNumber=(order.nextNumber||1)+1;persist();renderOrder();toast(`${id} créée à partir de ${original.id}.`);return;}
 if(button.id==='production-json'){downloadJSON({schema:'mir-production-dossier-1',localOnly:true,transmitted:false,order:exportOrder()},'MIR-dossier-fabrication.json');return;}
 if(button.id==='production-pdf')return exportPDF();
 if(button.id==='prepare-local-request')return prepareRequest();
 if(d.downloadRequest){const request=requests.find(r=>r.id===d.downloadRequest);if(request)downloadJSON({schema:'mir-production-request-1',localOnly:true,request},request.id+'.json');return;}
 if(d.endHem!==undefined&&!client&&!editingItemId&&tool==='select')return endHemDialog();
 if(d.newModel){
  beginAuthor(d.newModel);
  if(d.newModel==='profile'&&matchMedia('(any-pointer: coarse)').matches)startProfileDrawing();
  return;
 }
 if(d.exitMobileTrace!==undefined){closeMobileTrace();return;}
 if(d.editModel){const record=templates.find(r=>r.id===d.editModel);if(record)beginAuthor(latest(record).kind,record);return;}
 if(d.archiveModel){const record=templates.find(r=>r.id===d.archiveModel);if(record){record.archived=true;store(KEYS.templates,{version:1,records:templates});renderModels();toast('Modèle retiré du catalogue local. Les demandes existantes conservent leur version.');}return;}
 if(button.hasAttribute('data-cancel-author')){authoring=false;workflow='models';render();return;}
 if(d.viewRequest)return showRequest(d.viewRequest);
 if(d.openRequest)return openRequest(d.openRequest);
 if(d.confirmOpenRequest)return openRequest(d.confirmOpenRequest,true);
 if(button.hasAttribute('data-customize')){if(unlockCustom()){renderDimensions();renderProfileOptions();updateDrawing();}return;}
 if(button.hasAttribute('data-add-double'))return doubleFoldDialog();
 if(button.hasAttribute('data-add-segment')){if(!unlockCustom())return;if(draft.segments.length>=26)return toast('Maximum 26 segments.');draft.segments.push({label:String.fromCharCode(65+draft.segments.length),length:draft.unit==='mm'?25.4:1});draft.bends.push({mode:'interior',angle:90,direction:'left'});renderDimensions();renderProfileOptions();updateDrawing();return;}
 if(d.removeSegment!==undefined){if(client||editingItemId||draft.segments.length<=2)return;const index=Number(d.removeSegment);draft.segments.splice(index,1);draft.bends.splice(Math.max(0,index-1),1);draft.segments.forEach((s,i)=>s.label=String.fromCharCode(65+i));renderDimensions();renderProfileOptions();updateDrawing();return;}
 if(d.drawTool){if(client||editingItemId)return;if(tool===d.drawTool){const finished=tool==='draw';tool='select';updateDrawing();if(finished)focusProfileDimensions();return;}if(!unlockCustom())return;tool=d.drawTool;view='face';const model=build();drawPoints=copy(model.pointsMM);drawTransform=fitModel(model);renderDimensions();updateDrawing();return;}
 if(button.hasAttribute('data-new-drawing')){if(!client&&!editingItemId)startProfileDrawing();return;}
 if(button.hasAttribute('data-drawing-undo')){if(!drawPoints.length||client||editingItemId)return;drawPoints.pop();const next=toCustom(drawPoints);if(next)draft=next;else{draft.segments=[];draft.bends=[];}renderDimensions();updateDrawing();return;}
}
function handleInput(event){const e=event.target,d=e.dataset;
 if(d.measure){if(kind==='profile'&&d.measure!=='length'){draft.dimensions=draft.dimensions||{};draft.dimensions[d.measure]=e.value;}else draft[d.measure]=e.value;if(kind==='panel'&&draft.shape==='square'&&d.measure==='width')draft.height=e.value;updateDrawing({keepForm:true});return;}
 if(d.segmentLength!==undefined){draft.segments[Number(d.segmentLength)].length=e.value;jException=null;renderProfileOptions();updateDrawing({keepForm:true});return;}
 if(d.bendAngle!==undefined){if(client||editingItemId)return;draft.bends[Number(d.bendAngle)].angle=e.value===''?'':Number(e.value);updateDrawing({keepForm:true});return;}
 if(d.panelLip){draft.lips=draft.lips||{};if(e.value.trim())draft.lips[d.panelLip]=e.value;else delete draft.lips[d.panelLip];updateDrawing({keepForm:true});return;}
 if(e.id==='panel-lip'){draft.lip=e.value;updateDrawing({keepForm:true});return;}
 if(e.id==='panel-perforation-details'){draft.perforation.details=e.value;updateDrawing({keepForm:true});return;}
 if(e.id==='production-color-search'){colorQuery=e.value;renderColorGrid();return;}
 if(['material-thickness','material-gauge','production-quantity','production-location','production-note','special-color-system','special-color-code','special-color-name'].includes(e.id)){formMetadata();updateFinish();updateDrawing({keepForm:true});return;}
 const mapping={'order-project':'project','order-po':'poNumber','order-foreman':'foreman','order-date':'date','order-revision':'revision','order-notes':'notes'};if(mapping[e.id]&&(client||e.id!=='order-po')){order[mapping[e.id]]=e.value;persist();if(e.id==='order-po')updateOrderReference();}
}
function changeUnit(next){const previous=draft.unit||'in';if(next===previous)return;jException=null;const convert=value=>{if(value===''||value===null||value===undefined)return value;const p=M.parseMeasurement(value,previous);return p.ok?fmt(unitValue(p.mm,next)):value;};if(kind==='profile'){if(draft.template==='custom')draft.segments.forEach(s=>s.length=convert(s.length));else for(const k of Object.keys(draft.dimensions||{}))draft.dimensions[k]=convert(draft.dimensions[k]);draft.length=convert(draft.length);}else{for(const k of ['width','height','relief','lip','apexX','topWidth','topOffset','offset','tipDepth','apexOffset'])draft[k]=convert(draft[k]);for(const k of Object.keys(draft.lips||{}))draft.lips[k]=convert(draft.lips[k]);}if(draft.material?.thickness&&kind!=='panel'){draft.material.thickness=convert(draft.material.thickness);draft.material.thicknessUnit=next;}draft.unit=next;tool='select';renderDimensions();renderProfileOptions();renderPanelOptions();renderFormMetadata();updateDrawing();}
function handleChange(event){const e=event.target,d=e.dataset;
 if(d.pickFraction!==undefined)return applyMeasureFraction(e);
 if(d.profileGroup&&!client){
  const profileGroup=M.PROFILE_GROUPS.includes(e.value)?e.value:'';
  const nextOrder={...order,items:order.items.map(item=>item.id===d.profileGroup?{...item,profileGroup}:item)};
  if(!store(KEYS.draft,{version:1,order:nextOrder})){renderOrder();return;}
  order=nextOrder;renderOrder();
  Array.from(document.querySelectorAll('[data-profile-group]')).find(field=>field.dataset.profileGroup===d.profileGroup)?.focus();
  return;
 }
 if(e.id==='mir-template-backup-file'&&!client){void importMirTemplates(e);return;}
 if(e.id==='production-unit')return changeUnit(e.value);
 if(d.specSelect){draft[d.specSelect]=e.value;if(d.specSelect==='rightAngle'){draft.mirrorX=false;renderDimensions();}if(d.specSelect==='pointSide'&&authoring){const p=sampleSpec('panel','pointed');draft.apexOffset=['top','bottom'].includes(e.value)?(M.parseMeasurement(draft.width,draft.unit).value||p.width)/2:(M.parseMeasurement(draft.height,draft.unit).value||p.height)/2;}renderPanelOptions();updateDrawing();return;}
 if(d.bendMode!==undefined){if(client||editingItemId)return;const index=Number(d.bendMode),old=draft.bends[index];draft.bends[index]={mode:e.value,angle:e.value==='hem'?180:e.value==='signed'?0:90,direction:old.direction||'left'};renderDimensions();updateDrawing();return;}
 if(d.bendDirection!==undefined){if(client||editingItemId)return;draft.bends[Number(d.bendDirection)].direction=e.value;updateDrawing();return;}
 if(e.id==='profile-painted-side'||e.id==='profile-painted-segment'){draft.coloredFace={side:$('#profile-painted-side').value,segmentId:$('#profile-painted-segment').value};updateDrawing();return;}
 if(e.id==='panel-bottom'){draft.bottomEdgeId=e.value;draft.perforation={...draft.perforation,edgeId:e.value};updateDrawing();return;}
 if(e.id==='panel-perforation'){draft.perforation={...draft.perforation,enabled:e.checked,edgeId:draft.bottomEdgeId,details:draft.perforation?.details||''};renderPanelOptions();updateDrawing();return;}
 if(e.id==='color-system'){colorSystem=e.value;colorId='';colorQuery='';draft.finish={};renderColors();updateDrawing();return;}
 if(e.id==='production-material'){materialId=e.value;colorId='';draft.finish={};const m=chosenMaterial();if(m){const type=/acier/i.test(m.family||m.name)?'acier':'aluminium';draft.material.type=type;$('#material-type').value=type;}renderColors();updateDrawing();return;}
 if(e.id==='production-ral'){colorId=e.value;renderColorGrid();updateFinish();updateDrawing();return;}
 if(e.id==='material-type'){draft.material={type:e.value,name:kind==='panel'&&e.value!=='aluminium-extrude'?'Unico U-P1 — '+(e.value==='acier'?'Acier':'Aluminium plié'):'',productRef:kind==='panel'&&e.value!=='aluminium-extrude'?'unico-up1-'+e.value:null,thickness:'',thicknessUnit:kind==='panel'?'mm':draft.unit,gauge:''};colorId='';draft.finish={};colorSystem=kind==='panel'?(e.value==='aluminium-extrude'?'ral':'manufacturer'):colorSystem;materialId=availableMaterials().find(m=>m.metalType===e.value)?.id||availableMaterials()[0]?.id||'';renderFormMetadata();renderColors();updateDrawing();return;}
 if(e.id==='material-thickness'){formMetadata();updateDrawing();return;}
 if(e.id==='material-gauge'&&kind==='panel'){formMetadata();if(!availableMaterials().some(m=>m.id===materialId)){materialId=availableMaterials()[0]?.id||'';colorId='';draft.finish={};}renderColors();updateDrawing();return;}
 if(e.id==='trace-height'){
  traceHeight=Number(e.value);
  const scale=520/(traceHeight*25.4);
  const old=drawTransform;
  drawTransform=drawPoints.length
   ?{scale,ox:400+(old.ox-400)*scale/old.scale,oy:260+(old.oy-260)*scale/old.scale}
   :{scale,ox:140,oy:395};
  updateDrawing({keepForm:true});
  return;
 }
 if(e.id==='drawing-snap'){snap=e.checked;return;}
 if(e.id==='drawing-right-angle'){rightAngleSnap=e.checked;return;}
 if(d.itemQuantity){const item=order.items.find(row=>row.id===d.itemQuantity),quantity=Number(e.value);if(!item||!Number.isSafeInteger(quantity)||quantity<1){e.value=item?.spec.quantity||1;toast('Indiquez une quantité entière supérieure à zéro.');return;}const out=M.reviseInstance({snapshot:item.snapshot,history:item.history||[]},{quantity});if(!out.ok){toast(out.errors.map(err=>err.message).join(' '));return;}item.spec=copy(out.spec);item.snapshot=copy(out.snapshot);item.history=copy(out.history);persist();renderOrder();if(editingItemId===item.id){draft.quantity=quantity;$('#production-quantity').value=quantity;}return;}
}
function handleSubmit(event){const form=event.target;if(!form.matches('#end-hem-form,#double-fold-form,#save-production-template,#mir-j-exception-form,#mir-po-form'))return;event.preventDefault();const data=new FormData(form);
 if(form.id==='end-hem-form'){
  const model=build(),atStart=data.get('end')==='start',length=String(data.get('length')||'').trim();
  const parsed=M.parseMeasurement(length,draft.unit),edge=atStart?model.segments[0]:model.segments.at(-1);
  if(!model.valid||!parsed.ok||parsed.mm<=0||parsed.mm>edge.lengthMM)return messageError('Le retour doit être positif et au plus aussi long que le côté choisi.');
  const next=profileWithEndHem(draft,model,atStart,length,data.get('direction')==='right'?'right':'left');
  if(!build(next).valid)return messageError('Le retour ne peut pas être ajouté à ce profil.');
  draft=next;jException=null;drawPoints=[];
  closeDialog();renderDimensions();renderProfileOptions();updateDrawing();
  return;
 }
 if(form.id==='mir-po-form'){
  if(!client&&pickPO(data.get('po')))finishPOChoice(form.dataset.poIntent);
  return;
 }
 if(form.id==='mir-j-exception-form'){
  const check=window.MIRBendingPresets?.checkJ(draft);
  if(!check?.valid||check.ok)return messageError('La règle J doit être revérifiée.');
  if(!data.has('accepted'))return messageError('L’acceptation explicite est obligatoire.');
  const acceptedBy=String(data.get('acceptedBy')||'').trim();
  if(!acceptedBy)return messageError('Indiquez le nom de la personne qui accepte.');
  try{
   jException=window.MIRCalepinageExtension.acceptJException(
     {jReturn:check.jReturnIn,nailing:check.nailingIn},
     {accepted:true,acceptedBy,note:String(data.get('note')||'').trim()});
   closeDialog();renderProfileOptions();updateDrawing();toast('Exception J enregistrée pour cette pièce.');
  }catch(error){messageError(error.message);}
  return;
 }
 if(form.id==='double-fold-form'){const result=M.insertDoubleFold(draft,{segmentIndex:Number(data.get('segmentIndex')),beforeLength:data.get('beforeLength'),betweenLength:data.get('betweenLength'),afterLength:data.get('afterLength'),firstBend:{mode:'interior',angle:Number(data.get('firstAngle')),direction:data.get('firstDirection')},secondBend:{mode:'interior',angle:Number(data.get('secondAngle')),direction:data.get('secondDirection')}});if(!result.ok)return messageError(result.errors.map(e=>e.message).join(' '));draft=copy(result.spec);draft.kind='profile';closeDialog();renderDimensions();renderProfileOptions();updateDrawing();toast('Deux plis consécutifs ajoutés avec un segment entre les deux.');return;}
 const allowed={materials:data.getAll('materials'),colorSystems:data.getAll('colorSystems')};if(!allowed.materials.length||!allowed.colorSystems.length)return messageError('Choisissez au moins une matière et un mode de référence couleur.');const old=templates.find(record=>record.id===editingTemplateId),options={name:String(data.get('name')||'').trim(),description:String(data.get('description')||'')};if(!options.name)return messageError('Donnez un nom au modèle.');const result=old?M.createTemplateRevision(latest(old),draft,options):M.createTemplate(draft,{...options,id:'mir-modele-'+uid(),version:1});if(!result.ok)return messageError(result.errors.map(e=>e.message).join(' '));
 const inputDefaults={};
 for(const field of result.template.fields)inputDefaults[field.key]={
  value:String(data.get('mir-default-'+field.key)||'').trim(),
  locked:data.has('mir-lock-'+field.key)
 };
 const checked=window.MIRModelDefaults?.validate(result.template,inputDefaults);
 if(!checked?.ok)return messageError(checked?.errors?.join(' ')||'Vérification des cotes standards indisponible.');
 const record={measurementDefaults:checked.data,id:result.template.id,name:result.template.name,currentVersion:result.template.version,versions:old?[...old.versions,copy(result.template)]:[copy(result.template)],channels:{client:data.has('client'),store:data.has('store'),po:data.has('po')},allowed,archived:false,updatedAt:new Date().toISOString()};if(old)templates[templates.indexOf(old)]=record;else templates.push(record);store(KEYS.templates,{version:1,records:templates});closeDialog();authoring=false;editingTemplateId=null;workflow='models';render();toast('Modèle enregistré. Les mesures standards sont prêtes pour le magasin local.');
}
function handleKey(event){if(event.target.matches('[data-toggle-painted-face]')&&['Enter',' '].includes(event.key)){event.preventDefault();toggleProfilePaintedFace();$('[data-toggle-painted-face]')?.focus();return;}if(event.target.id==='production-drawing'&&kind==='panel'){if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();if(event.key==='+'||event.key==='=')setZoom(zoom*1.2);else if(event.key==='-')setZoom(zoom/1.2);else if(event.key==='0'){zoom=1;orbit=-35;pitch=23;updateDrawing();}else if(view==='volume'){if(event.key==='ArrowLeft')orbit-=10;if(event.key==='ArrowRight')orbit+=10;if(event.key==='ArrowUp')pitch=Math.min(85,pitch+10);if(event.key==='ArrowDown')pitch=Math.max(-85,pitch-10);updateDrawing();}return;}}const point=event.target.closest('[data-draw-point]');if(point&&tool==='edit'&&!client&&!editingItemId&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const model=build();if(!model.valid)return;const points=copy(model.pointsMM),i=Number(point.dataset.drawPoint),step=draft.unit==='mm'?(event.shiftKey?10:1):(event.shiftKey?25.4:25.4/16);if(event.key==='ArrowLeft')points[i][0]-=step;if(event.key==='ArrowRight')points[i][0]+=step;if(event.key==='ArrowUp')points[i][1]+=step;if(event.key==='ArrowDown')points[i][1]-=step;const spec=toCustom(points);if(spec){draft=spec;renderDimensions();updateDrawing();$(`[data-draw-point="${i}"]`)?.focus();}}const edge=event.target.closest('[data-select-bottom]');if(edge&&['Enter',' '].includes(event.key)){event.preventDefault();edge.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}
function macSteelPalette(catalogue){
 const sourceUrl='https://macmetalarchitectural.com/nos-couleurs/';
 const swatches=new Map(catalogue.filter(m=>m.brand==='MAC Métal architectural').flatMap(m=>(m.colors||[]).map(c=>[c.name,c.swatchUrl||c.swatchImage])));
 const collections=[
  ['Inspiration',[[101,'Blanc Titane'],[102,'Noir Titane'],[103,'Gris Métallique'],[104,'Cuivre Métallisé'],[105,'Gris Ardoise'],[106,'Gris Fusain'],[107,'Rouge Vif'],[108,'Bleu Automne'],[109,'Rouge Grès'],[110,'Vert Anglais'],[111,'Brun Foncé'],[112,'Noir Onyx']]],
  ['Signature',[[202,'Anthracite'],[203,'Zinc Brossé'],[204,'Quartz Cendré'],[205,'Bronze Cuivré']]],
  ['Bois',[[301,'Torréfié'],[302,'Cèdre'],[303,'Noyer Noir'],[304,'Bouleau Fumé'],[305,'Frêne Gris'],[306,'Pin Scandinave'],[310,'Chêne Blanc'],[312,'Teck'],[313,'Liège']]]
 ];
 return {id:'mac-acier-moulures',brand:'MAC Métal architectural',name:'Nuancier acier pour moulures',family:'acier',steelProfileOnly:true,sourceUrl,
  colors:collections.flatMap(([collection,entries])=>entries.map(([code,name])=>({id:'mac-acier-'+code,code:String(code),name,collection,sourceUrl,swatchUrl:swatches.get(name),availabilityNote:'Référence MAC. Disponibilité du rouleau, calibre et fini à confirmer pour cette moulure.'})))};
}
async function boot(){M=window.MIRProduction;if(!M?.createTemplate)throw new Error('Le moteur de modèles n’est pas disponible.');const fetched=await Promise.allSettled([fetch('catalogue-fd6866b49d21.json').then(r=>{if(!r.ok)throw new Error('catalogue');return r.json();}),fetch('ral-classic.json').then(r=>{if(!r.ok)throw new Error('nuancier RAL');return r.json();})]);if(fetched[0].status==='fulfilled'){const raw=fetched[0].value;const catalogue=Array.isArray(raw)?raw:raw.materials||[];materials=catalogue.filter(m=>(m.applications||[]).includes('bending'));materials.push(macSteelPalette(catalogue));}if(fetched[1].status==='fulfilled'&&Array.isArray(fetched[1].value.colors))ral=fetched[1].value;
 const unico=window.MIRUnico;if(unico)for(const palette of unico.palettes){const usable=palette.colors.filter(c=>!c.publishedGauges||c.publishedGauges.some(g=>[18,20,22].includes(g)));if(!usable.length)continue;materials.push({id:'unico-palette-'+palette.id,brand:'Unico',name:'U-P1 · '+palette.label,architecturalPanel:true,metalType:palette.materialId,family:palette.materialId,allowedGauges:palette.id==='signature'?[22]:null,sourceUrl:palette.sourceUrl,colors:usable.map(c=>({...c,availabilityNote:c.uP1Compatibility.note+' Écran indicatif.'}))});}materialId=materials[0]?.id||'';
 const savedTemplates=read(KEYS.templates,{version:1,records:[]});templates=Array.isArray(savedTemplates.records)?savedTemplates.records.filter(record=>record?.id&&latest(record)&&M.templatePreview(latest(record)).ok):[];const savedRequests=read(KEYS.requests,{version:1,requests:[]});requests=Array.isArray(savedRequests.requests)?savedRequests.requests.filter(request=>request?.id&&Array.isArray(request.items)&&request.items.every(item=>item.spec&&item.snapshot?.schema==='mir-production-instance-1')):[];
 const saved=read(KEYS.draft,null);order=saved?.version===1&&Array.isArray(saved.order?.items)?normalizeWorkshopOrder(saved.order):defaultOrder();
 injectWorkflow();if(client){$('#production-eyebrow').textContent='L’ATELIER MIR / VOS PIÈCES SUR MESURE';$('#production-title').innerHTML='Votre pièce.<br>À vos <em>mesures.</em>';$('#production-description').textContent='Choisissez la forme. Entrez vos cotes, votre métal et votre couleur. Votre dessin suit vos choix.';$('#mode-link').href='#production-order';$('#mode-link').innerHTML='Mon dossier <span aria-hidden="true">↘</span>';$('#order-metadata').open=false;}
 document.addEventListener('click',handleClick);document.addEventListener('input',handleInput);document.addEventListener('change',handleChange);document.addEventListener('submit',handleSubmit);document.addEventListener('keydown',handleKey);document.addEventListener('keydown',traceShift);document.addEventListener('keyup',traceShift);
 const stage=$('#production-drawing');stage.addEventListener('pointerdown',beginPointDrag);stage.addEventListener('pointermove',movePoint);stage.addEventListener('pointerup',endPoint);stage.addEventListener('pointercancel',endPoint);stage.addEventListener('pointerleave',event=>{if(drag?.type==='trace'&&!drag.moved)endPoint(event);});stage.addEventListener('click',drawingClick);stage.addEventListener('wheel',event=>{if(kind!=='panel'&&view!=='volume')return;event.preventDefault();setZoom(zoom*Math.exp(-event.deltaY*.001));},{passive:false});
 $('#production-dialog').addEventListener('click',event=>{if(event.target!==$('#production-dialog'))return;const r=$('#production-dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();});
 choose(kind,kind==='panel'?'rectangle':'l');const requestedMaterial=params.get('material');if(kind==='panel'&&['unico-up1-acier','unico-up1-aluminium'].includes(requestedMaterial)){const type=requestedMaterial.endsWith('aluminium')?'aluminium':'acier';draft.material={type,name:'Unico U-P1 — '+(type==='acier'?'Acier':'Aluminium plié'),productRef:requestedMaterial,thickness:'',thicknessUnit:'mm',gauge:''};materialId=availableMaterials()[0]?.id||'';colorSystem='manufacturer';const requestedColor=params.get('color'),palette=availableMaterials().find(m=>m.colors.some(c=>c.id===requestedColor));if(palette){materialId=palette.id;colorId=requestedColor;}render();}const linked=params.get('template');if(linked&&templates.some(record=>record.id===linked))useSavedTemplate(linked);if(!client&&params.get('view')==='models'){workflow='models';render();}if(!client&&params.get('view')==='requests'){workflow='requests';render();}if(client&&params.get('kind')==='profile'&&!linked)choose('profile','l');
 if(!client)window.addEventListener('storage',event=>{if([KEYS.draft,window.MIRPanelLayoutOutput?.STORAGE_KEY].includes(event.key))renderLayoutImport();});
 offerProfileImport();
 window.MIRProductionWorkspace=Object.freeze({version:'1.0.0',storageKeys:{...KEYS},localOnly:true});
}
boot().catch(error=>{console.error('MIR production',error);$('#production-drawing').innerHTML=`<div class="drawing-hint"><strong>Le configurateur n’a pas pu démarrer.</strong><p>${esc(error.message)}</p><button type="button" class="secondary-button" onclick="location.reload()">Réessayer</button></div>`;$('#add-production-piece').disabled=true;});
})();
