/* MIR fabrication workspace. Local model versions and order snapshots are kept
 * separate from studio measurements, employee demo data and external services. */
(function(){
'use strict';
const $=s=>document.querySelector(s),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy=value=>JSON.parse(JSON.stringify(value));
const finite=Number.isFinite;
const params=new URLSearchParams(location.search),client=params.get('mode')==='client';
const compactPanel=matchMedia('(max-width: 600px)');
const shortPanel=matchMedia('(max-height: 520px) and (min-aspect-ratio: 3/2)');
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
let freeformRedo=[];
const traceHeights=[6,8,10,12,14];
let traceHeight=14,traceGridDivisor=4;
let activeDefaultLocks={},M,materials=[],ral={colors:[]},draft,kind=client||params.get('kind')==='panel'?'panel':'profile',view='face',workflow='configure',authoring=false,editingTemplateId=null,editingItemId=null,selectedTemplate=null,templates=[],requests=[],order,tool='select',snap=true,drawPoints=[],drawTransform=null,drag=null,orbit=-35,pitch=23,zoom=1,viewPan={x:0,y:0},pointers=new Map(),busy=false,colorSystem='manufacturer',colorId='',materialId='',colorQuery='',toastTimer,suppressClick=false;
let clientStep=1,clientUnlocked=1,clientProfileSelected=false,clientWizardPlaces=[],clientEntry='choice';
let clientDraftReady=false,legacyQuickId=null;
let panelSketchPoints=[],panelSketchHover=null,panelSketchBefore=null;
const clientProfileWizard=()=>client&&catalogueChannel!=='store'&&kind==='profile';
const clientEditableTrace=()=>clientProfileWizard()&&draft?.template==='custom'&&(!editingItemId||existingItem()?.editableTrace===true||existingItem()?.snapshot?.templateId?.startsWith('modele-piece-'));
const publicProfileMaterials=['aluminium','acier'];
const publicProfileColors=['manufacturer','special'];
const ralOption=$('#color-system option[value="ral"]');
const supportsPublicChoices=record=>[['materials',publicProfileMaterials],['colorSystems',publicProfileColors]]
 .every(([key,options])=>!record.allowed?.[key]?.length||record.allowed[key].some(value=>options.includes(value)));

let activeStoreColorLock=false;
// Imported panel metadata is authoritative until a user explicitly edits it.
let preservedPanelMetadata=null;
function applyStoreColorLock(){
 if(!client||catalogueChannel!=='store'||!activeStoreColorLock)return;
 const block=$('#production-color-fields');
 if(!block)return;
 block.querySelectorAll('input,select,button').forEach(element=>{element.disabled=true;});
 for(const id of ['color-system','material-type']){const input=$('#'+id);if(input)input.disabled=true;}
 if(!block.querySelector('.mir-store-color-locked')){
  const notice=document.createElement('p');
  notice.className='field-hint mir-store-color-locked';
  notice.textContent='Couleur conservée par MIR : fabricant et référence verrouillés. Demande une nouvelle version du modèle à l’admin pour la changer.';
  block.append(notice);
 }
}
const profiles={l:{name:'Pliage en L',dimensions:{A:3,B:2}},j:{name:'Pliage en J',dimensions:{A:1,B:3,C:1}},z:{name:'Pliage en Z',dimensions:{A:2,B:4,C:2}},beam5:{name:'Cache-poutre · 5 côtés',dimensions:{A:1,B:6,C:8,D:6,E:1}},omega:{name:'Oméga',dimensions:{A:1,B:2,C:4,D:2,E:1}},custom:{name:'Profil personnalisé',segments:[{label:'A',length:4},{label:'B',length:3},{label:'C',length:2}],bends:[{mode:'interior',angle:90,direction:'left'},{mode:'interior',angle:90,direction:'right'}],startAngle:0},...window.MIRBendingPresets?.catalog(),j_soffite:{name:'J à soffite · 12 pi',template:'j',mirProfileId:'j_soffite',dimensions:{A:1,B:3,C:1}}};
const shapes=[['rectangle','Rectangle'],['square','Carré'],['right-triangle','Triangle rectangle'],['triangle','Triangle à sommet'],['roof-slope','Panneau haut rampant X/12'],['trapezoid','Trapèze'],['parallelogram','Parallélogramme'],['pointed','Côté en pointe']];
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));if(key===KEYS.draft)window.dispatchEvent(new CustomEvent('mir:workshop-saved'));if(client&&catalogueChannel!=='store'&&[KEYS.draft,'mir_client_active_profile_v1'].includes(key)){const label=document.querySelector('.workshop-banner span:last-child');if(label)label.textContent=(key===KEYS.draft?'Dossier':'Tracé')+' enregistré sur cet appareil';if(clientProfileWizard()){let status=$('#client-local-save');if(!status){status=document.createElement('p');status.id='client-local-save';status.className='field-hint';status.setAttribute('role','status');$('#client-step-hint')?.after(status);}status.textContent=(key===KEYS.draft?'Dossier':'Tracé')+' enregistré sur cet appareil';}}return true;}catch{const status=$('#client-local-save');if(status)status.textContent='Sauvegarde locale indisponible · exportez votre dossier';toast('La sauvegarde locale est indisponible. Exportez votre dossier JSON.');return false;}}
function persist(){store(KEYS.draft,{version:1,order});}
function toast(text,{quiet=false}={}){$('#production-toast').textContent=text;$('#production-toast').classList.toggle('visible',!quiet);clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#production-toast').classList.remove('visible'),4400);}
function closeDialog(){pendingPOAfterSave=null;$('#production-dialog').close();}
function dialog(title,text,body){$('#production-dialog-content').innerHTML=`<p class="eyebrow">L’ATELIER MIR</p><h2 id="production-dialog-title" class="dialog-heading">${esc(title)}</h2>${text?`<p class="dialog-intro">${esc(text)}</p>`:''}${body}`;if(!$('#production-dialog').open)$('#production-dialog').showModal();}
function messageError(message){let el=$('#production-dialog-error');if(!el){el=document.createElement('p');el.id='production-dialog-error';el.className='dialog-error';el.setAttribute('role','alert');$('#production-dialog-content').append(el);}el.textContent=message;}
function sampleSpec(type,id){const spec={kind:type,unit:'in',quantity:client?'':1,material:{type:'aluminium',thickness:'',gauge:''},finish:{},coloredFace:{side:'left',segmentId:'A'},location:'',note:''};if(type==='profile')return {...spec,template:id,...copy(profiles[id]||profiles.custom),length:window.MIRBendingLengths.requiredLengthIn(id)};return {...spec,material:{type:'acier',name:'Unico U-P1 — Acier',productRef:'unico-up1-acier',thickness:'',thicknessUnit:'mm',gauge:''},mirrorX:false,dimensionBasis:'overall-including-lips',shape:id,name:shapes.find(s=>s[0]===id)?.[1]||'Panneau',width:48,height:id==='square'?48:36,relief:2,lip:1,apexX:24,topWidth:30,topOffset:9,offset:10,pointSide:'top',tipDepth:12,apexOffset:24,rightAngle:'bottom-left',roofPitch:id==='roof-slope'?'6/12':'',roofDirection:'right',bottomEdgeId:'bottom',perforation:{enabled:false,edgeId:'bottom',details:''},lips:{}};}
function blankMeasurements(spec){const out=copy(spec);if(out.kind==='profile'){if(out.template==='custom')out.segments.forEach(s=>s.length='');else Object.keys(out.dimensions).forEach(k=>out.dimensions[k]='');out.length='';out.coloredFace={side:'',segmentId:'A'};}else{['width','height','relief','lip','apexX','topWidth','topOffset','offset','tipDepth','apexOffset','roofPitch'].forEach(k=>out[k]='');out.lips={};}out.finish={};out.material={type:out.kind==='panel'?'acier':'aluminium',name:out.kind==='panel'?'Unico U-P1 — Acier':'',productRef:out.kind==='panel'?'unico-up1-acier':null,thickness:'',thicknessUnit:out.kind==='panel'?'mm':'in',gauge:''};return out;}
function defaultOrder(){return {id:'DOS-'+uid(),project:'',poNumber:'',foreman:'',date:new Date().toISOString().slice(0,10),revision:'A',notes:'',items:[],nextNumber:1};}
function build(spec=draft){return spec.kind==='panel'?M.buildPanel(spec):M.buildProfile(spec);}
function existingItem(){return order?.items?.find(item=>item.id===editingItemId)||null;}
function stockLengthIn(spec){return window.MIRBendingLengths.requiredLengthIn(spec?.mirProfileId||'');}
function stockLengthCheck(spec=draft,previous=existingItem()){
 const current=M.parseMeasurement(spec.length,spec.unit||'in');
 const former=previous?.spec?M.parseMeasurement(previous.spec.length,previous.spec.unit||'in'):null;
 return window.MIRBendingLengths.check({profileId:spec.mirProfileId||previous?.stockProfileType||'',
  lengthIn:current.ok?current.mm/25.4:NaN,previousLengthIn:former?.ok?former.mm/25.4:null});
}
function templateForBuiltin(type,id){if(!M.createTemplate)return null;const r=M.createTemplate(sampleSpec(type,id),{id:`mir-standard-${type}-${id}`,name:type==='profile'?profiles[id].name:shapes.find(s=>s[0]===id)?.[1],version:1,description:'Modèle standard MIR; cotes de fabrication à renseigner.'});return r.ok?r.template:null;}
function latest(record){return record?.versions?.find(t=>t.version===record.currentVersion)||record?.versions?.at(-1)||record?.template||null;}
function reloadLocalTemplates(){
 const saved=read(KEYS.templates,{version:1,records:[]});
 templates=Array.isArray(saved.records)?saved.records.filter(record=>record?.id&&latest(record)&&M.templatePreview(latest(record)).ok):[];
 // Pendant boot(), le dossier de travail n'est pas encore initialisé.
 if(!draft||!$('#production-workflow'))return;
 if(workflow==='models')renderModels();else if(workflow==='configure')renderTemplates();
}
function availableForPO(){return client||authoring||editingItemId||templates.find(record=>record.id===selectedTemplate?.id)?.channels?.po!==false;}
function visibleTemplate(record){return !!record&&!record.archived&&(!client||record.archived===false&&record.channels?.[catalogueChannel]===true&&(catalogueChannel==='store'||latest(record)?.kind!=='profile'||supportsPublicChoices(record)));}
function availableMaterials(){
 if(clientProfileWizard()){
  return window.MIRBendingFinishes.forMetal(materials,draft?.material?.type);
 }
 return kind==='panel'?materials.filter(m=>m.architecturalPanel&&m.metalType===draft?.material?.type&&(!m.allowedGauges||!draft.material.gauge||m.allowedGauges.includes(Number(draft.material.gauge)))):materials.filter(m=>!m.architecturalPanel&&(!m.steelProfileOnly||draft?.material?.type==='acier'));}
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
let bendTariff, bendTariffLoading=false;
function dossierPricing(items=order.items){return M.priceDossier(items,{bendTariff});}
async function refreshBendTariff(){
 if(bendTariffLoading)return;
 bendTariffLoading=true;
 try{bendTariff=await window.MIRBendPricing.load(window.MIRSharedConfig);}
 catch{bendTariff=undefined;}
 finally{
  bendTariffLoading=false;
  if(workflow==='configure'){
   if(clientProfileWizard())renderPiecePrice(build());
   renderOrder();
  }
 }
}
function renderPiecePrice(model,geometryErrors=[]){
 const box=$('#panel-price');
 if(model.kind==='profile'){
  const price=M.pricePiece(model,{bendTariff});
  box.hidden=!clientProfileWizard()||!model.valid||!model.material.type||!model.finish.code||price.requiresQuote;
  box.innerHTML=box.hidden?'':price.status==='priced'
   ? `<span class="price-eyebrow">PRIX CALCULÉ SUR 10 PI</span><div class="price-main"><strong>${esc(money(price.unitCents))}</strong><span>par moulure</span></div><small>Avant taxes et livraison. Ajustez la quantité dans votre dossier.</small>`
   : `<p>${bendTariffLoading?'Chargement du tarif MIR…':bendTariff?'Prix à confirmer par MIR.':'Tarif MIR temporairement indisponible.'}</p>`;
  return;
 }
 const price=M.pricePiece(model),tariff=window.MIRUnico?.pricing,eligible=model.kind==='panel'&&model.spec?.material?.type==='aluminium'&&model.spec?.material?.productRef==='unico-up1-aluminium';
 box.hidden=authoring||!eligible||price.requiresQuote||tariff?.calculationEnabled!==true;
 if(box.hidden){box.innerHTML='';return;}
 const ready=price.status==='priced'&&geometryErrors.length===0;
 box.innerHTML=`<span class="price-eyebrow">TARIF MIR · ${esc(surface(tariff.amount))} $ CA / po²</span>${ready?`<div class="price-main"><strong>${esc(money(price.unitCents))}</strong><span>par panneau</span></div><p>${esc(surface(price.areaSqIn))} po² × ${esc(surface(price.rate))} $ CA / po²</p><div class="price-quantity"><span>${esc(price.quantity)} pièce${price.quantity>1?'s':''}</span><strong>${esc(money(price.lineCents))}</strong></div>`:`<strong>${geometryErrors.length?'Corrigez les dimensions des lips.':esc(price.label||'Complétez votre panneau pour voir son prix.')}</strong><p>${geometryErrors.length?'Le prix sera calculé lorsque la géométrie sera valide.':esc(price.note||'Choisissez les dimensions et une couleur du fabricant.')}</p>`}<small>Surface de la forme hors tout, lips inclus. Projection C non ajoutée. Taxes et livraison non calculées; fini et fabrication à confirmer.</small>`;
}
function linePriceMarkup(spec){const price=M.pricePiece(spec,{bendTariff});return price.status==='priced'?`<p class="production-line-price"><strong>${esc(money(price.lineCents))}</strong><span>${esc(surface(price.areaSqIn))} po²${price.folds===undefined?'':' · '+esc(price.folds)+' pli'+(price.folds===1?'':'s')} · ${esc(money(price.unitCents))} / pièce × ${esc(price.quantity)}</span></p>`:'';}
function renderDossierPrice(pricing){
 const box=$('#production-pricing-summary'),hasPriced=pricing.items.some(item=>item.status==='priced');box.hidden=!hasPriced;
 if(!hasPriced){box.innerHTML='';return;}
 const complete=Number.isSafeInteger(pricing.totalCents),amount=complete?pricing.totalCents:pricing.pricedSubtotalCents;
 box.innerHTML=`<div><span>${complete?'Montant calculé du dossier':'Sous-total des pièces chiffrées'}</span><strong>${esc(money(amount))}</strong></div><p>${complete?'Taxes et livraison non calculées.':pricing.requiresQuote?'Les pièces de couleur personnalisée restent sur soumission; aucun total global n’est calculé.':'Certaines pièces restent à chiffrer; aucun total global n’est calculé.'}</p>`;
}
function exportOrder(){return {...copy(order),pricing:dossierPricing()};}
function choose(type,id,{template=null,spec=null,empty=client,profileChosen=false}={}){
 panelDirectUndo=[];panelDirectRedo=[];
 jException=null;activeStoreColorLock=false;preservedPanelMetadata=null;
 kind=type;editingItemId=null;legacyQuickId=null;activeDefaultLocks={};selectedTemplate=template||templateForBuiltin(type,id);
 draft=spec?copy(spec):(empty?blankMeasurements(sampleSpec(type,id)):sampleSpec(type,id));draft.kind=type;if(type==='profile')draft.length=String(stockLengthIn(draft)*(draft.unit==='mm'?25.4:1));
 if(clientProfileWizard()){
  clientStep=clientUnlocked=1;
  clientProfileSelected=profileChosen;
  if(empty){draft.length=String(stockLengthIn(draft)*(draft.unit==='mm'?25.4:1));draft.material.type='';}
 }
 if(draft.shape!=='right-triangle')draft.mirrorX=false;
 tool='select';view='face';zoom=1;viewPan={x:0,y:0};pointers.clear();drawPoints=[];colorId='';colorSystem='manufacturer';draft.finish={};
 materialId=availableMaterials()[0]?.id||'';render();
}
function injectWorkflow(){const node=document.createElement('nav');node.id='production-workflow';node.className='workflow-tabs';node.setAttribute('aria-label','Espace de fabrication');node.dataset.adminOnly='';node.innerHTML='<button type="button" data-workflow="configure" aria-current="page">Bon de commande</button><button type="button" data-workflow="models">Mes modèles</button><button type="button" data-workflow="requests">Demandes clients <span id="request-count">0</span></button>';$('.production-intro').after(node);node.insertAdjacentHTML('afterend','<section id="production-library" hidden></section><section id="production-requests" hidden></section><div id="author-banner" class="author-banner" hidden></div>');$('#order-heading');$('.order-bottom>div').insertAdjacentHTML('beforeend','<button type="button" class="primary-button" id="prepare-local-request" hidden>Préparer ma demande ↗</button>');}
function templateIcon(type,id){if(type==='profile'&&window.MIRBendingPresets?.icon(id))return window.MIRBendingPresets.icon(id);let path;if(type==='profile')path=({l:'M20 8V40H60',j:'M20 8V40H59V27',z:'M12 10H38V40H66',beam5:'M67 8H55V39H26V8H14',omega:'M10 40H22V10H57V40H70',custom:'M8 37H23L36 12H49V37H70'})[id]||'M10 37H28V12H48L68 37';else path=({rectangle:'M12 10H68V40H12Z',square:'M23 5H58V40H23Z','right-triangle':'M18 7V42H68Z',triangle:'M8 42L40 7L72 42Z',trapezoid:'M10 42L24 9H57L70 42Z',parallelogram:'M10 42L24 9H70L56 42Z',pointed:'M14 42V21L40 5L66 21V42Z'})[id]||'M12 10H68V40H12Z';return `<svg viewBox="0 0 80 50" aria-hidden="true"><path d="${path}" fill="${type==='panel'?'#dfe8d4':'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/></svg>`;}
function renderTemplates(){const current=draft.kind==='profile'?draft.template:draft.shape;$('#template-heading').textContent=kind==='profile'?'Moulures dessinées':'Choisir la forme';const entries=kind==='profile'?[]:shapes;const records=templates.filter(record=>visibleTemplate(record)&&latest(record)?.kind===kind);$('#production-templates').innerHTML=entries.filter(([id])=>!clientProfileWizard()||id!=='custom').map(([id,name])=>`<button type="button" class="template-button" data-template="${id}" aria-pressed="${(!clientProfileWizard()||clientProfileSelected)&&(!editingTemplateId&&selectedTemplate?.id===`mir-standard-${kind}-${id}`||!selectedTemplate&&current===id)}">${templateIcon(kind,id)}<span>${esc(name)}</span></button>`).join('')+(!authoring&&(client||kind==='panel')?records.map(record=>`<button type="button" class="template-button saved-template" data-saved-template="${esc(record.id)}" aria-pressed="${selectedTemplate?.id===record.id}">${templateIcon(kind,latest(record).topology?.template||'custom')}<span>${esc(record.name||latest(record).name)}</span><small>MODÈLE MIR · V${latest(record).version}</small></button>`).join(''):'');}
function measureField(key,label,value,letter='',extra=''){return `<label${extra?' class="'+extra+'"':''}><span class="letter-label">${letter?`<b>${esc(letter)}</b>`:''}${esc(label)}</span><input data-measure="${esc(key)}" inputmode="decimal" value="${esc(value??'')}" placeholder="${authoring?'Proportion':'Votre cote'}" aria-label="${esc((letter?letter+' — ':'')+label)}"></label>`;}

function roofFactor(){return window.MIRPanelRoof?.pitchFactor(draft.roofPitch);}
function updateRoofDerivedHeight(){
 if(kind!=='panel'||!['triangle','right-triangle'].includes(draft.shape)||!String(draft.roofPitch||'').trim())return false;
 const factor=roofFactor(),w=M.parseMeasurement(draft.shape==='triangle'?draft.apexX:draft.width,draft.unit||'in');
 if(!finite(factor)||factor<=0||!w.ok||w.mm<=0)return false;
 draft.height=fmt(unitValue(w.mm*factor,draft.unit||'in'));
 return true;
}
function roofReadout(){
 const target=$('#mir-panel-roof-result');if(!target||kind!=='panel')return;
 const factor=roofFactor();if(!String(draft.roofPitch||'').trim()){target.textContent='Aucune pente imposée. Les cotes sont prises au chantier.';return;}
 if(!finite(factor)||factor<=0){target.textContent='Pente invalide. Entrez 6 ou 6/12.';return;}
 const run=M.parseMeasurement(draft.shape==='triangle'?draft.apexX:draft.width,draft.unit||'in');
 if(!run.ok){target.textContent='Entrez la portée horizontale pour calculer la montée.';return;}
 const rise=window.MIRPanelRoof.riseForRun(run.mm,draft.roofPitch);
 target.textContent='Pente '+draft.roofPitch+' · portée '+M.formatMeasurement(run.mm,draft.unit)+' · montée '+M.formatMeasurement(rise,draft.unit)+(draft.shape==='roof-slope'?' · vers la '+(draft.roofDirection==='left'?'gauche':'droite'):'');
}
function renderDimensions(){
 const openBends=new Set(Array.from($('#production-dimensions').querySelectorAll('details[data-angle-details][open]'),el=>el.dataset.angleDetails));
 const unit=draft.unit||'in';$('#production-unit').value=unit;$('#measure-hint').textContent=authoring?'Les proportions servent seulement au dessin du modèle. Les clients saisiront toutes les cotes de fabrication.':unit==='in'?(kind==='panel'?'A et B incluent les lips. ':'')+'Fractions acceptées : 3 1/2 ou 3½.':(kind==='panel'?'A et B incluent les lips. ':'')+'Cotes en millimètres.';let body='';
 if(kind==='profile'){if(draft.template==='custom')body=`<div class="segment-editor">${(draft.segments||[]).map((segment,index)=>`<div class="segment-row"><div class="segment-top"><span class="segment-id">${esc(segment.label)}</span><label>${authoring?'Proportion du segment':esc(segment.name||'Longueur du côté')}<input data-segment-length="${index}" inputmode="decimal" value="${esc(segment.length??'')}" placeholder="${authoring?'Proportion':'Votre cote'}" aria-label="Côté ${esc(segment.label)}"></label>${!client&&!editingItemId?`<button type="button" data-remove-segment="${index}" aria-label="Retirer le segment ${esc(segment.label)}"${draft.segments.length<=2?' disabled':''}>×</button>`:''}</div>${index<draft.segments.length-1?bendFields(draft.bends[index],index,openBends.has(String(index))):''}</div>`).join('')}</div>${!client&&!editingItemId?'<div class="segment-actions"><button type="button" data-add-segment>＋ Segment</button><button type="button" data-add-double>Ajouter deux angles</button></div>':''}`;else{const definition=M.TEMPLATES[draft.template];body=`<div class="dimension-fields">${(definition?.labels||[]).map((key,index)=>measureField(key,definition.fieldLabels[index],draft.dimensions?.[key],key)).join('')}</div>${!client&&!editingItemId?'<div class="segment-actions"><button type="button" data-customize>Modifier les angles et les côtés</button><button type="button" data-add-double>Ajouter deux angles</button></div>':''}`;}if(!authoring&&!clientProfileWizard())body+=`<div class="dimension-fields">${measureField('length','Longueur de vente',draft.length,'L','full-field')}</div>`;
 }else{body=`<div class="dimension-fields">${measureField('width',draft.shape==='square'?'Côté du carré':'Largeur hors tout',draft.width,'A')}${draft.shape==='square'?'':measureField('height','Hauteur hors tout',draft.height,'B')}${!authoring?measureField('relief','Projection de la pièce finie',draft.relief,'C'):''}</div>`;if(draft.shape==='triangle')body+=`<div class="dimension-fields">${measureField('apexX','Sommet depuis la gauche',draft.apexX,'S','full-field')}</div>`;
  if(['roof-slope','triangle','right-triangle'].includes(draft.shape)){
    body+=`<section class="mir-panel-roof-settings" aria-label="Pente de toit du panneau"><label>Pente de toiture X/12
    <input id="mir-panel-roof-pitch" inputmode="decimal" value="${esc(draft.roofPitch??'')}" placeholder="Ex. 6/12"></label>
    ${draft.shape==='roof-slope'?'<label>Montée du haut<select id="mir-panel-roof-direction"><option value="right"'+(draft.roofDirection!=='left'?' selected':'')+'>Vers la droite</option><option value="left"'+(draft.roofDirection==='left'?' selected':'')+'>Vers la gauche</option></select></label>':''}
    <p id="mir-panel-roof-result" class="field-hint" role="status">Montée = portée horizontale × X/12. Les mesures exactes restent visibles.</p></section>`;
  }if(draft.shape==='right-triangle')body+=`<label class="shape-field">Angle droit<select data-spec-select="rightAngle"${editingItemId||client&&selectedTemplate&&!selectedTemplate.id.startsWith('mir-standard-')?' disabled':''}>${[['bottom-left','En bas à gauche'],['bottom-right','En bas à droite'],['top-left','En haut à gauche'],['top-right','En haut à droite']].map(([id,name])=>`<option value="${id}"${(draft.mirrorX?({'bottom-left':'bottom-right','bottom-right':'bottom-left','top-left':'top-right','top-right':'top-left'}[draft.rightAngle]):draft.rightAngle)===id?' selected':''}>${name}</option>`).join('')}</select></label><div class="panel-mirror-row"><button type="button" class="secondary-button" id="mirror-panel" aria-pressed="${draft.mirrorX===true}">↔ Miroir gauche / droite</button><span>${draft.mirrorX?'Vue inversée':'Vue d’origine'}</span></div>`;if(draft.shape==='trapezoid')body+=`<div class="dimension-fields">${measureField('topWidth','Largeur du haut',draft.topWidth,'D')}${measureField('topOffset','Décalage du haut à gauche',draft.topOffset,'E')}</div>`;if(draft.shape==='parallelogram')body+=`<div class="dimension-fields">${measureField('offset','Décalage du haut (+ droite / − gauche)',draft.offset,'D','full-field')}</div><p class="field-hint">A est la largeur hors tout. Le décalage reste distinct de la longueur de base.</p>`;if(draft.shape==='pointed')body+=`<label class="shape-field">Côté terminé en pointe<select data-spec-select="pointSide"${editingItemId||client&&selectedTemplate&&!selectedTemplate.id.startsWith('mir-standard-')?' disabled':''}>${[['top','Haut'],['right','Droite'],['bottom','Bas'],['left','Gauche']].map(([id,name])=>`<option value="${id}"${draft.pointSide===id?' selected':''}>${name}</option>`).join('')}</select></label><div class="dimension-fields">${measureField('tipDepth','Profondeur de la pointe',draft.tipDepth,'D')}${measureField('apexOffset','Position du sommet sur ce côté',draft.apexOffset,'E')}</div>`;
 }
 if(clientProfileWizard()&&draft.template==='custom')body+='<button type="button" data-end-hem>Ajouter un double pli (retour écrasé)</button><button type="button" data-add-double>Ajouter deux angles consécutifs</button>';
 if(kind==='panel'&&!authoring)body+='<button type="button" class="secondary-button" id="panel-flat">Pièce plate · projection C = 0</button>';
 if(kind==='profile'&&(draft.template==='custom'||clientProfileWizard()))body+='<section id="mir-angle-summary" class="mir-angle-summary" aria-label="Angles des jonctions A-B, B-C et suivantes"></section>';
 $('#production-dimensions').innerHTML=body;
 $('#client-step-length').innerHTML=clientProfileWizard()
  ?measureField('length','Longueur de vente ('+(unit==='mm'?'mm':'po')+')',draft.length,'L'):'';
 if(kind==='profile'&&!authoring){
  const stock=stockLengthCheck();
  for(const input of document.querySelectorAll('#production-dimensions [data-measure="length"],#client-step-length [data-measure="length"]')){
   input.readOnly=true;input.setAttribute('aria-readonly','true');
   input.title=stock.legacy?'Longueur historique conservée':window.MIRBendingLengths.label(draft);
   input.insertAdjacentHTML('afterend','<small class="mir-profile-stock-note">'+esc(stock.message)+'</small>');
  }
 }

 if(client&&catalogueChannel==='store')for(const input of $('#production-dimensions').querySelectorAll('input[data-measure],input[data-segment-length]')){
  const key=input.dataset.measure||draft.segments?.[Number(input.dataset.segmentLength)]?.label;
  if(!activeDefaultLocks[key])continue;
  input.readOnly=true;
  input.setAttribute('aria-readonly','true');
  input.title='Mesure verrouillée par le modèle MIR';
  input.insertAdjacentHTML('afterend','<small class="mir-default-readonly">Mesure fixe du magasin MIR</small>');
 }
}
function bendFields(bend,index,expanded){
 const b=bend||{mode:'interior',angle:90,direction:'left'};
 if(clientProfileWizard()&&draft.template!=='custom')return '';
 if((client&&!clientProfileWizard())||(editingItemId&&!clientEditableTrace()))return `<p class="field-hint">Pli ${index+1} : ${b.mode==='hem'?'retour écrasé 180°':esc(b.angle)+'° '+(b.mode==='interior'?'intérieur':'de rotation')}${b.direction?' · '+(b.direction==='left'?'gauche':'droite'):''} · défini par le modèle</p>`;
 const legend='Sens du pli '+(index+1);
 const sense=b.mode==='signed'?
  '<p class="field-hint">Le signe de l’angle indique le sens de la rotation.</p>':
  b.mode==='hem'?hemChoiceCards('bend-direction-'+index,{selected:b.direction||'left',index,legend}):
  bendChoiceMarkup('bend-direction-'+index,b.direction||'left',b.angle,{index,legend});
 return `<details class="angle-details" data-angle-details="${index}"${expanded||draft.bends.length===1?' open':''}><summary>Pli ${esc(draft.segments[index].label)} → ${esc(draft.segments[index+1].label)}</summary>
 <div class="bend-fields mir-bend-controls">
 <label>Type du pli<select data-bend-mode="${index}"><option value="interior"${b.mode==='interior'?' selected':''}>Angle intérieur</option><option value="signed"${b.mode==='signed'?' selected':''}>Rotation signée</option><option value="hem"${b.mode==='hem'?' selected':''}>Retour écrasé 180°</option></select></label>
 <label>Angle (°)<input data-bend-angle="${index}" type="number" step="any" value="${esc(b.mode==='hem'?180:b.angle)}"${b.mode==='hem'?' disabled':''}></label>
 </div>${sense}</details>`;
}
/* Deux vrais aperçus du même profil MIR : seule la face peinte change,
   jamais la géométrie ni les cotes du modèle. */
function faceChoiceCards(side,segment,clientChoice=false){
 const options=['left','right'].map((direction,index)=>{
  const next={...copy(draft),coloredFace:{...draft.coloredFace,side:direction,segmentId:segment}};
  const model=build(next);
  const fallback='<svg viewBox="0 0 260 115" role="img" aria-label="Face '+(index+1)+'"><path d="M25 32H130V84H230" fill="none" stroke="#a3a5a8" stroke-width="7"/><path d="M25 '+(direction==='left'?'22':'42')+'H130" stroke="#348511" stroke-width="7" stroke-linecap="round"/></svg>';
  const preview=model.valid?diagramSVG(model,{small:true,interactive:false}):fallback;
  return '<button type="button" class="mir-face-choice" '+(clientChoice?'data-client-face':'data-face-select')+'="'+direction+'" aria-pressed="'+(side===direction)+'" aria-label="Colorer la face '+(index+1)+(direction==='left'?', côté gauche':', côté droit')+' du tracé">'+
   '<span class="mir-face-choice-image">'+preview+'</span><strong>Face '+(index+1)+'</strong><small>'+(direction==='left'?'Gauche du tracé':'Droite du tracé')+'</small></button>';
 }).join('');
 return '<div class="mir-face-choice-grid" role="group" aria-label="Deux images pour sélectionner la face colorée">'+options+'</div>'+
  (clientChoice?'<p class="field-hint mir-face-choice-help">★ indique la face peinte.</p>':'<p class="field-hint mir-face-choice-help">Le liseré indique la face colorée. Suivez A, puis B, C… pour définir le sens.</p>');
}
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
 if(clientProfileWizard()){
  const face=draft.coloredFace||{},side=face.side;
  $('#production-profile-options').innerHTML=`<div data-client-stage="4">${faceChoiceCards(side,face.segmentId||labels[0]||'A',true)}
   </div>${rule?`<div data-client-stage="2">${rule}</div>`:''}`;
  return;
 }
 const faceOpen=$('#production-profile-options details')?.open||draft.coloredFace?.side;
 $('#production-profile-options').innerHTML=`<details class="profile-face-options"${faceOpen?' open':''}><summary>Face colorée</summary>
  ${faceChoiceCards(draft.coloredFace?.side||'',draft.coloredFace?.segmentId||labels[0]||'A')}
  <div class="two-fields mir-face-details"><label>Choix textuel de la face<select id="profile-painted-side"><option value="">Choisir le côté</option><option value="left"${draft.coloredFace?.side==='left'?' selected':''}>À gauche du tracé</option><option value="right"${draft.coloredFace?.side==='right'?' selected':''}>À droite du tracé</option></select></label><label>Repère sur le côté<select id="profile-painted-segment">${labels.map(label=>`<option${draft.coloredFace?.segmentId===label?' selected':''}>${esc(label)}</option>`).join('')}</select></label></div></details>`+rule;
}

function renderPanelOptions(){
 if(kind!=='panel'||authoring){$('#production-panel-options').innerHTML='';return;}
 const actual=build();
 const tentative=draft.shape==='polygon'&&Array.isArray(draft.contourRatios)
  ?build({...draft,width:48,height:36,relief:0,lip:draft.lip||'0'})
  :build(sampleSpec('panel',draft.shape));
 const edges=actual.edges.length?actual.edges:tentative.edges||[];
 const perEdge=edges.map((edge,i)=>{
  const override=draft.lips?.[edge.id],withoutLip=String(override)==='0';
  return `<div class="mir-lip-side"><label>${i+1} · ${esc(edge.name)}
    <input data-panel-lip="${esc(edge.id)}" inputmode="decimal" value="${esc(override??'')}" placeholder="Commun · 0 = sans lip"
    aria-label="Lip du côté ${esc(edge.name)}"></label>
    <button type="button" class="secondary-button mir-no-lip" data-panel-no-lip="${esc(edge.id)}" aria-pressed="${withoutLip}" aria-label="Supprimer le lip du côté ${esc(edge.name)}">Sans lip</button></div>`;
 }).join('');
 $('#production-panel-options').innerHTML=`<div class="config-section mir-panel-lips"><div class="section-heading compact"><div>
  <span class="step-dot">↳</span><h2>Lips et face visible</h2></div></div>
  <p class="field-hint">Les cotes A/B sont HORS TOUT de fabrication. Les lèvres restent à l'intérieur du hors tout; elles ne sont jamais ajoutées deux fois.</p>
  <button type="button" class="secondary-button" id="panel-no-folds">Sans repli · tous les lips à 0</button><label>Lip commun à tous les côtés<input id="panel-lip" inputmode="decimal" value="${esc(draft.lip??'')}" placeholder="0 = sans lip"></label>
  <details class="options-details mir-panel-edge-options" open><summary>Lip de chaque côté, y compris sans lip (0)</summary>
  <div class="mir-lip-sides">${perEdge||'<p class="field-hint">Fermez d’abord le dessin pour identifier les côtés.</p>'}</div></details>
  <div id="mir-panel-net-summary" class="mir-panel-net-summary" role="status" aria-live="polite">Entrez vos cotes pour voir la face nette, sans les lips.</div>
  <label>Quel côté est en bas après pose ?<select id="panel-bottom">
    <option value="">Choisir le bas</option>${edges.map((edge,i)=>`<option value="${esc(edge.id)}"${draft.bottomEdgeId===edge.id?' selected':''}>${i+1} · ${esc(edge.name)}</option>`).join('')}
  </select></label>
  <label class="check-field"><input id="panel-perforation" type="checkbox"${draft.perforation?.enabled?' checked':''}>
    <span>Demander la perforation du bas<small>Le côté choisi est repéré en bleu sur le dessin.</small></span>
  </label>${draft.perforation?.enabled?`<label>Détail ou référence de perforation<textarea id="panel-perforation-details" rows="2" placeholder="À définir avec l’atelier" maxlength="300">${esc(draft.perforation.details||'')}</textarea></label><p class="field-hint">Le motif exact doit être confirmé par l’atelier.</p>`:''}
  </div>`;
 if(client&&catalogueChannel==='store'&&(activeDefaultLocks.lip||activeDefaultLocks.lips)){
  for(const input of $('#production-panel-options').querySelectorAll('#panel-lip,[data-panel-lip]')){input.readOnly=true;input.setAttribute('aria-readonly','true');input.title='Lip verrouillé par le modèle MIR';}
  for(const button of $('#production-panel-options').querySelectorAll('[data-panel-no-lip]'))button.disabled=true;
 }
}
function renderColors(){const block=$('#production-color-fields');$('#color-system').value=colorSystem;if(colorSystem==='manufacturer'){block.innerHTML=`<div class="color-source-field"><label>Fabricant / produit de référence<select id="production-material"><option value="">Choisir le fabricant et le produit</option>${availableMaterials().map(m=>`<option value="${esc(m.id)}"${m.id===materialId?' selected':''}>${esc(m.brand+' · '+m.name)}</option>`).join('')}</select></label>${(chosenMaterial()?.colors||[]).length>20?`<label>Rechercher une teinte du fabricant<input id="production-color-search" class="color-search" type="search" placeholder="Nom ou code, ex. 56068, noir…" value="${esc(colorQuery)}"></label><p id="color-count" class="color-count"></p>`:""}<div id="production-color-grid" class="color-choice-grid" role="group" aria-label="Couleurs du fabricant"></div><p class="field-hint">${kind==='panel'?'Références Unico publiées. La disponibilité du fini sur le calibre choisi reste à confirmer.':'Chaque échantillon appartient au nuancier de ce produit. L’offre sur votre pièce doit être confirmée.'}</p></div>`;renderColorGrid();}else if(colorSystem==='ral'){block.innerHTML=`<div class="color-source-field"><label>Rechercher un code RAL Classic<input id="production-color-search" class="color-search" type="search" placeholder="Ex. 7016, black, vert…" value="${esc(colorQuery)}"></label><label>Code de la couleur<select id="production-ral"><option value="">Choisir un code RAL</option>${ral.colors.map(c=>`<option value="${esc(c.id)}"${c.id===colorId?' selected':''}>${esc(c.code+' · '+(c.nameEn||c.name))}</option>`).join('')}</select></label><p id="color-count" class="color-count"></p><div id="production-color-grid" class="color-choice-grid" role="group" aria-label="Codes RAL Classic"></div><p class="field-hint">${esc(ral.displayNotice||'Aperçu écran indicatif. Valider la teinte demandée sur un nuancier physique avant fabrication.')}</p></div>`;renderColorGrid();}else{block.innerHTML=`<div class="color-source-field"><label>Nuancier ou fabricant<input id="special-color-system" value="${esc(draft.finish?.system||'')}" maxlength="60" placeholder="Ex. Nuancier à préciser"></label><div class="two-fields"><label>Code exact<input id="special-color-code" value="${esc(draft.finish?.code||'')}" maxlength="80" placeholder="Référence demandée"></label><label>Nom de la couleur<input id="special-color-name" value="${esc(draft.finish?.name||'')}" maxlength="100" placeholder="Si connu"></label></div><p class="field-hint">Cette référence est une demande spéciale à faire confirmer. Aucun équivalent fabricant ni teinte numérique n’est inventé.</p></div>`;}updateFinish();applyStoreColorLock();}
function renderColorGrid(){
 const grid=$('#production-color-grid');if(!grid)return;
 if(clientProfileWizard()&&(!draft.material?.type||colorSystem==='manufacturer'&&!chosenMaterial())){grid.innerHTML='<p class="field-hint">'+(!draft.material?.type?'Choisissez d’abord le matériau pour consulter son nuancier.':'Choisissez le fabricant et le produit pour consulter ses teintes.')+'</p>';if($('#color-count'))$('#color-count').textContent='';return;}
 const colors=colorSystem==='ral'
  ?ral.colors.filter(c=>`${c.code} ${c.nameEn||''} ${c.family||c.familyFR||''}`.toLocaleLowerCase('fr').includes(colorQuery.toLocaleLowerCase('fr')))
  :(chosenMaterial()?.colors||[]).filter(c=>`${c.name||''} ${c.code||''} ${c.collection||''}`.toLocaleLowerCase('fr').includes(colorQuery.toLocaleLowerCase('fr')));
 if($('#color-count'))$('#color-count').textContent=`${colors.length} codes · aperçus indicatifs`;
 const flat=kind==='profile'&&colorSystem==='manufacturer'&&
  (chosenMaterial()?.brand==='Kaycan'||chosenMaterial()?.brand==='MAC Métal architectural')
  ?window.MIRKaycanFlatPreview:null;
 grid.innerHTML=colors.map(c=>{
  const image=safeAsset(c.swatchUrl||c.swatchImage),
    hex=/^#[0-9a-f]{6}$/i.test(c.hex||'')?c.hex:null,
    name=colorSystem==='ral'?c.code+' · '+(c.nameEn||c.name):c.code?`${c.name} · ${c.code}`:c.name;
  const flatColor=flat?(flat.get(image)||'#e5e9e0'):null;
  return `<button type="button" class="color-choice${flat?' kaycan-flat-choice':''}" data-production-color="${esc(c.id)}" aria-pressed="${c.id===colorId}" title="${esc(name)}" aria-label="${esc(name)}"${flat?` style="background:${flatColor};color:${flat.foreground(flatColor)}"`:hex?` style="background:${hex}"`:''}>${flat?`<span class="color-text">${esc(name)}</span>`:image?`<img src="${esc(image)}" alt="" loading="lazy">`:!hex?`<span class="color-text">${esc(name)}</span>`:''}</button>`;
 }).join('')||'<p class="field-hint">Aucune teinte documentée pour cette référence. Choisissez une référence spéciale à confirmer.</p>';
 if(flat)for(const c of colors){
  const url=safeAsset(c.swatchUrl||c.swatchImage);if(!url)continue;
  flat.sample(url,color=>{
   if(!color)return;
   const swatch=Array.from(grid.querySelectorAll('[data-production-color]')).find(node=>node.dataset.productionColor===c.id);
   if(swatch){swatch.style.backgroundColor=color;swatch.style.color=flat.foreground(color);}
   if(draft?.finish?.swatchUrl===url){
    const chip=$('#selected-finish .kaycan-flat-chip');
    if(chip)chip.style.backgroundColor=color;
    updateDrawing({keepForm:true});
   }
  });
 }
}
function updateFinish(){if(clientProfileWizard()&&!draft.material?.type){$('#selected-finish').innerHTML='<p>Choisissez d’abord le matériau pour consulter son nuancier.</p>';return;}if(authoring){$('#selected-finish').innerHTML='';return;}draft.finish=preservedPanelMetadata?.id===editingItemId?copy(preservedPanelMetadata.finish):currentFinish();const c=chosenColor(),image=safeAsset(c?.swatchUrl||c?.swatchImage),finish=draft.finish,source=safeURL(c?.sourceUrl||chosenMaterial()?.sourceUrl||''),flat=kind==='profile'&&window.MIRKaycanFlatPreview?.isFlatPreview(finish)?window.MIRKaycanFlatPreview:null,flatHex=flat?.get(image)||'#e5e9e0';$('#selected-finish').innerHTML=(finish.code||finish.name)?`${flat?`<span class="kaycan-flat-chip" role="img" aria-label="Aperçu uni indicatif de ${esc(finish.name)}" style="background:${flatHex}"></span>`:image?`<img src="${esc(image)}" alt="Échantillon fabricant de ${esc(finish.name)}">`:''}<div><strong>${esc(finish.name||finish.code)}</strong><span>${esc(finish.code||'Code à confirmer')} · ${esc(finish.manufacturer||finish.system||'Référence spéciale')}</span><p>${esc(colorSystem==='ral'?ral.displayNotice:colorSystem==='special'?'Demande spéciale : faisabilité, teinte et disponibilité à confirmer.':flat?'Aperçu uni estimé du visuel fabricant, non certifié. Teinte, texture et disponibilité à confirmer sur un échantillon réel.':c?.availabilityNote||'Disponibilité sur ce profil à confirmer. Écran indicatif.')}</p>${colorSystem==='manufacturer'&&source?`<a href="${esc(source)}" target="_blank" rel="noopener">Source du fabricant ↗</a>`:''}</div>`:'<div><strong>La teinte reste à choisir.</strong><p>Choisissez une référence précise pour votre pièce.</p></div>';}
function fitModel(model){const p=model.pointsMM||[],xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);const scale=Math.min(580/Math.max(1,maxX-minX),340/Math.max(1,maxY-minY));return {scale,ox:400-(minX+maxX)*scale/2,oy:255+(minY+maxY)*scale/2};}
function pointOnView(point,tr){return [tr.ox+point[0]*tr.scale,tr.oy-point[1]*tr.scale];}

function panelSketchPreview(points=panelSketchPoints){
 const ratios=window.MIRPanelSketch?.normalize(points);if(!ratios)return null;
 const model=build({...draft,shape:'polygon',contourRatios:ratios,width:48,height:36,
  relief:0,lip:'0',lips:{},bottomEdgeId:'edge-1',perforation:{enabled:false}});
 if(!model.valid)return null;
 return window.MIRProductionVolume?.buildMesh(model)?.valid?model:null;
}
function startPanelSketch(){
 if(editingItemId)return toast('Un panneau d’une commande doit conserver sa forme. Crée une nouvelle pièce pour un autre contour.');
 panelSketchBefore=copy(draft);panelSketchPoints=[];panelSketchHover=null;
 draft={...draft,kind:'panel',shape:'polygon',contourRatios:undefined,width:'',height:'',relief:'',
  lip:'0',lips:{},roofPitch:'',bottomEdgeId:'',perforation:{enabled:false,edgeId:'',details:''}};
 selectedTemplate=null;tool='panel-trace';view='face';zoom=1;render();
}
function cancelPanelSketch(){
 if(panelSketchBefore)draft=panelSketchBefore;
 panelSketchBefore=null;panelSketchHover=null;panelSketchPoints=[];tool='select';render();
}
function finishPanelSketch(){
 const ratios=window.MIRPanelSketch?.normalize(panelSketchPoints);
 if(!ratios)return toast('Ferme un contour de 3 à 64 sommets non alignés.');
 const model=panelSketchPreview();
 if(!model)return toast('La forme se croise ou elle est incompatible avec les lips. Corrige les sommets.');
 draft.shape='polygon';draft.contourRatios=ratios;draft.width='';draft.height='';draft.relief='';
 draft.lip='0';draft.lips=Object.fromEntries(panelSketchPoints.map((_,i)=>['edge-'+(i+1),'0']));
 draft.bottomEdgeId='edge-1';draft.perforation={enabled:false,edgeId:'edge-1',details:''};
 panelSketchPoints=[];panelSketchHover=null;panelSketchBefore=null;tool='select';view='face';
 render();toast('Panneau dessiné. Entre les cotes A/B réelles, puis choisis les lips côté par côté.');
}
function panelSketchHit(event){
 const svg=$('#production-drawing svg');if(!svg||!drawingCanvasHit(event,{targetRequired:false}))return null;
 const m=svg.getScreenCTM?.();if(m&&svg.createSVGPoint){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const q=p.matrixTransform(m.inverse());return [q.x,q.y];}
 const r=svg.getBoundingClientRect();return[(event.clientX-r.left)*800/r.width,(event.clientY-r.top)*520/r.height];
}
function appendPanelSketchPoint(point){
 if(!point||panelSketchPoints.length>=64)return;
 const first=panelSketchPoints[0],last=panelSketchPoints.at(-1);
 if(last&&Math.hypot(point[0]-last[0],point[1]-last[1])<4)return;
 if(first&&panelSketchPoints.length>=3&&Math.hypot(point[0]-first[0],point[1]-first[1])<=14)return finishPanelSketch();
 panelSketchPoints.push(point);panelSketchHover=null;updateDrawing();
}
function drawingModel(){const actual=build();if(actual.valid)return {model:actual,illustrative:authoring};
 if(kind==='panel'&&draft.shape==='polygon'&&Array.isArray(draft.contourRatios)){
  const preview=build({...draft,width:48,height:36,relief:0,lip:draft.lip??'0'});
  if(preview.valid)return {model:preview,illustrative:true};
 }const example=selectedTemplate&&M.templatePreview(selectedTemplate);return {model:example?.ok?example.model:build(sampleSpec(kind,kind==='profile'?draft.template:draft.shape)),illustrative:true};}
function traceGridStepMM(unit=draft.unit){return unit==='mm'?1:25.4/traceGridDivisor;}
function traceGridSVG(unit){
 if(!snap||!drawTransform)return '';
 const {scale,ox,oy}=drawTransform;
 const spacing=traceGridStepMM(unit)*scale,step=fmt(spacing);
 if(clientProfileWizard()){
  const major=fmt(spacing*(unit==='mm'?10:traceGridDivisor));
  return `<defs><pattern id="mir-trace-minor" width="${step}" height="${step}" x="${fmt(ox)}" y="${fmt(oy)}" patternUnits="userSpaceOnUse"><path d="M${step} 0H0V${step}" fill="none" stroke="#a8b5ad" stroke-opacity=".75"/></pattern><pattern id="mir-trace-major" width="${major}" height="${major}" x="${fmt(ox)}" y="${fmt(oy)}" patternUnits="userSpaceOnUse"><path d="M${major} 0H0V${major}" fill="none" stroke="#71877c" stroke-opacity=".75" stroke-width="1.3"/></pattern></defs><g aria-hidden="true" pointer-events="none"><rect width="800" height="520" fill="#fff"/><rect width="800" height="520" fill="url(#mir-trace-minor)"/><rect width="800" height="520" fill="url(#mir-trace-major)"/></g>`;
 }
 return `<defs><pattern id="mir-trace-grid" width="${step}" height="${step}" x="${fmt(ox)}" y="${fmt(oy)}" patternUnits="userSpaceOnUse"><path d="M${step} 0H0V${step}" fill="none" stroke="#c3cebc" stroke-opacity=".58" stroke-width="1"/></pattern></defs><g aria-hidden="true" pointer-events="none"><rect width="800" height="520" fill="#fcfcf8"/><rect width="800" height="520" fill="url(#mir-trace-grid)"/></g>`;
}

/* Les arcs et les étiquettes sont calculés à partir des cotes du profil,
   sans changer la géométrie sauvegardée. */
function bendAngleLabel(bend){
 if(bend?.mode==='hem')return '180° repli';
 if(bend?.mode==='signed'){
  // La rotation du tracé n'est PAS l'angle intérieur entre deux côtés.
  // Exemple : rotation de 30° => angle intérieur réel de 150°.
  const turn=Number(bend.angle);
  return Number.isFinite(turn)?fmt(180-Math.abs(turn))+'°':'À préciser';
 }
 const angle=Number(bend?.angle);
 return Number.isFinite(angle)?fmt(angle)+'°':'À préciser';
}
function profileAnglesOverlay(model,{segments,folds},labels,handles,[leftEdge,rightEdge]){
 const pointBounds=[...folds,...handles].map(([x,y])=>[x,y,9,9]);
 return (model.bends||[]).map((bend,i)=>{
  if(!bend||bend.mode==='hem'||!segments[i]||!segments[i+1])return '';
  const label=bendAngleLabel(bend);
  if(label==='180°'||label==='À préciser')return '';
  const [a,joint]=segments[i],b=segments[i+1][1];
  const left=[a[0]-joint[0],a[1]-joint[1]],right=[b[0]-joint[0],b[1]-joint[1]];
  const d1=Math.hypot(...left),d2=Math.hypot(...right);
  if(Math.min(d1,d2)<2)return '';
  const u=left.map(v=>v/d1),w=right.map(v=>v/d2);
  const bis=[u[0]+w[0],u[1]+w[1]],len=Math.hypot(...bis);
  if(len<1e-6)return '';
  const [nx,ny]=bis.map(v=>v/len),r=Math.min(23,d1*.45,d2*.45);
  const start=[joint[0]+u[0]*r,joint[1]+u[1]*r],end=[joint[0]+w[0]*r,joint[1]+w[1]*r];
  const sweep=u[0]*w[1]-u[1]*w[0]>=0?1:0;
  const visualLabel=fmt(Math.round(Number.parseFloat(label)*100)/100)+'°';
  const halfWidth=visualLabel.length*4.6+3,halfHeight=11;
  const clear=([x,y])=>{
   if(x<leftEdge+halfWidth+4||x>rightEdge-halfWidth-4||y<halfHeight+4||y>516-halfHeight)return false;
   if(labels.some(([px,py,w,h])=>Math.abs(x-px)<halfWidth+w+4&&Math.abs(y-py)<halfHeight+h+4))return false;
   if(pointBounds.some(([px,py,w,h])=>Math.abs(x-px)<halfWidth+w&&Math.abs(y-py)<halfHeight+h))return false;
   // A scaled distance leaves clearance around the text and the thick profile stroke.
   const scale=([px,py])=>[(px-x)/(halfWidth+6),(py-y)/(halfHeight+6)];
   return segments.every(side=>{
    const [[ax,ay],[bx,by]]=side.map(scale),dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(ax+t*dx,ay+t*dy)>1.25;
   });
  };
  const compact=rightEdge-leftEdge<800;
  const mobileCandidates=compact?[
   [joint[0]-42,joint[1]-30],
   [joint[0]-45,joint[1]+30],
   [joint[0]+42,joint[1]-30],
   [joint[0]+45,joint[1]+30]
  ]:[];
  const regularCandidates=[16,28,43,60].flatMap(gap=>[0,16,-16].map(shift=>[
   joint[0]+nx*(r+gap)-ny*shift,joint[1]+ny*(r+gap)+nx*shift
  ]));
  const position=visualLabel!=='180°'&&[...mobileCandidates,...regularCandidates].find(clear);
  let text='';
  if(position){
   const [x,y]=position;
   labels.push([x,y,halfWidth,halfHeight]);
   text=`<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" dominant-baseline="central" font-size="17" font-weight="700" fill="#243c2b" stroke="#fcfcf8" stroke-width="2.5" paint-order="stroke" aria-hidden="true">${esc(visualLabel)}</text>`;
  }
  const sides=[i,i+1].map(index=>model.segments?.[index]?.label||String.fromCharCode(65+index)).join('–');
  return `<g class="mir-angle-annotation" pointer-events="none" role="img" aria-label="${esc('Angle '+sides+' : '+label)}"><path d="M ${start.map(fmt).join(' ')} A ${fmt(r)} ${fmt(r)} 0 0 ${sweep} ${end.map(fmt).join(' ')}" fill="none" stroke="#348511" stroke-width="2.5"/>${text}</g>`;
 }).join('');
}
function diagramSVG(model,{illustrative=false,small=false,interactive=true}={}){
 if(model.kind==='panel'&&window.MIRProductionVolume)return panelDiagramSVG(model,{illustrative,small,interactive});
 const freehand=interactive&&tool==='draw'&&model.kind==='profile';
 const grid=freehand?traceGridSVG(model.unit):'';
 const publicProfile=clientProfileWizard()&&model.kind==='profile';
 const compactTrace=freehand&&publicProfile&&matchMedia('(max-width:600px)').matches;
 const horizontalBounds=compactTrace?[100,540]:[0,800];
 const [left,right]=horizontalBounds,viewBox=left+' 0 '+(right-left)+' 520';
 const points=freehand?(drawPoints.length>=3&&model.pointsMM.length===drawPoints.length
  ?model.pointsMM.map(([x,y])=>[x+drawPoints[0][0],y+drawPoints[0][1]]):drawPoints):model.pointsMM||[];if(!points.length)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${grid}<text x="${(left+right)/2}" y="250" text-anchor="middle" font-family="Arial" font-size="${compactTrace?13:19}" fill="#7b8b6c">${clientProfileWizard()?esc(clientTracePrompt()):'Glisse pour tracer le premier côté.'}</text></svg>`;
 const tr=(tool==='draw'||drag?.type==='point')&&drawTransform?drawTransform:fitModel({...model,pointsMM:points});
 if(interactive&&!small&&view==='face'&&tool!=='draw'&&drag?.type!=='point'&&zoom!==1){tr.scale*=zoom;tr.ox=400+(tr.ox-400)*zoom;tr.oy=260+(tr.oy-260)*zoom;}
 if(interactive&&!small&&view==='face'&&tool==='select'&&kind==='profile'){tr.ox+=viewPan.x;tr.oy+=viewPan.y;}
 if(interactive&&!drag)drawTransform=tr;
 const mapped=points.map(p=>pointOnView(p,tr)),polygon=model.kind==='panel',pointString=mapped.map(p=>p.map(fmt).join(',')).join(' '),hex=/^#[0-9a-f]{6}$/i.test(model.finish?.hex||'')?model.finish.hex:'#dce5d4';let output=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="group" aria-label="${esc(model.name)} — ${illustrative?'illustration du modèle':'cotes de la pièce finie'}" font-family="Arial,sans-serif"><title>${esc(model.name)} — ${illustrative?'proportions illustratives, sans cotes de fabrication':'dimensions de la pièce finie'}</title>${grid}`;
 if(polygon)output+=`<polygon points="${pointString}" fill="${hex}" fill-opacity=".65" stroke="#546b4a" stroke-width="2"/>`;else {
 output+=M.profileDiagramContent(model,mapped,{bends:freehand&&drawPoints.length<3?[]:model.bends||[],markers:!small,markerModel:freehand||publicProfile?{segments:model.segments?.map(({label})=>({label}))}:model,paintedMarker:publicProfile?'star':'stripe',highContrast:publicProfile,handles:tool==='draw'||tool==='edit'?mapped:[],illustrative:illustrative||(interactive&&tool!=='select'),togglePaintedFace:interactive&&!small&&tool==='select'&&!illustrative&&(!clientProfileWizard()||clientStep===4),
  horizontalBounds,angleOverlay:!small&&!illustrative?(section,labels,handles)=>profileAnglesOverlay(model,section,labels,handles,horizontalBounds):undefined});
 }
 const count=polygon?points.length:Math.max(0,points.length-1);for(let i=0;i<count;i++){const a=mapped[i],b=mapped[(i+1)%mapped.length],delta=[b[0]-a[0],b[1]-a[1]],len=Math.hypot(...delta)||1,mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],normal=[-delta[1]/len,delta[0]/len];if(polygon){const edge=model.edges?.[i],bottom=edge?.id===model.bottomEdgeId;if(bottom&&!illustrative)output+=`<line x1="${fmt(a[0])}" y1="${fmt(a[1])}" x2="${fmt(b[0])}" y2="${fmt(b[1])}" stroke="${model.perforation?.enabled?'#26758d':'#54863f'}" stroke-width="6"${model.perforation?.enabled?' stroke-dasharray="11 6"':''}/>`;output+=`<g${interactive&&edge&&!authoring?` data-select-bottom="${esc(edge.id)}" role="button" tabindex="0" aria-label="Choisir ${esc(edge.name)} comme bas"`:''}><circle cx="${fmt(mid[0])}" cy="${fmt(mid[1])}" r="13" fill="#fff" stroke="#b2c4a1"/><text x="${fmt(mid[0])}" y="${fmt(mid[1]+4.5)}" text-anchor="middle" font-size="13" fill="#4f6c3c">${i+1}</text></g>`;}
 }
 if(polygon){const xs=mapped.map(p=>p[0]),ys=mapped.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);output+=`<path d="M${fmt(left)},${fmt(bottom+35)}H${fmt(right)}M${fmt(left)},${fmt(bottom+29)}V${fmt(bottom+41)}M${fmt(right)},${fmt(bottom+29)}V${fmt(bottom+41)}" fill="none" stroke="#8ba475" stroke-width="1.4"/><text x="${fmt((left+right)/2)}" y="${fmt(bottom+60)}" text-anchor="middle" font-size="18" fill="#577c3d">${esc(illustrative?'A · largeur':'A · '+M.formatMeasurement(model.widthMM,model.unit))}</text><text x="${fmt(right+25)}" y="${fmt((top+bottom)/2)}" font-size="17" fill="#577c3d">B</text>`;if(!illustrative)output+=`<text x="400" y="495" text-anchor="middle" font-size="14" fill="#7b8e6b">${esc('B · '+M.formatMeasurement(model.heightMM,model.unit)+' / C · '+M.formatMeasurement(model.reliefMM,model.unit))}</text>`;
 }
 if(interactive&&!polygon&&(tool==='edit'||tool==='draw')&&!client&&!editingItemId){mapped.forEach((point,index)=>{output+=`<circle cx="${fmt(point[0])}" cy="${fmt(point[1])}" r="${tool==='edit'?8:5}" fill="#fff" stroke="#5d8d43" stroke-width="2" data-draw-point="${index}" tabindex="0" role="button" aria-label="Point ${index+1}, déplacez-le ou utilisez les flèches"/>`;});}
 if(interactive&&!small&&!illustrative&&tool==='select'&&model.kind==='profile')output=output.replace(/<g class="profile-side-marker" data-marker-label="([^"]+)" pointer-events="none" aria-hidden="true">/g,(match,label)=>{
  const index=model.segments.findIndex(s=>s.label===label);
  return index>=0&&profileMeasureInput(index,label)?`<g class="profile-side-marker" data-marker-label="${label}" data-edit-profile-measure="${index}" role="button" tabindex="0" aria-label="Modifier la cote ${label}" style="cursor:pointer">`:match;
 });
 if(publicProfile&&interactive&&!small&&clientStep===2&&innerWidth<=650){
  const height=Math.max(110,Math.min(innerHeight*.2,185)),width=$('#production-drawing').clientWidth||innerWidth-64;
  const scale=1/Math.min(width/800,height/520);
  output=output.replace(/(<g class="profile-side-marker"[^>]*>)([\s\S]*?)(<\/g>)/g,(all,open,content,close)=>{
   const center=/<circle cx="([^"]+)" cy="([^"]+)"/.exec(content);if(!center)return all;
   const [,x,y]=center;
   return open+'<g transform="translate('+x+' '+y+') scale('+scale+') translate('+(-Number(x))+' '+(-Number(y))+')">'+content+'<circle cx="'+x+'" cy="'+y+'" r="22" fill="transparent" pointer-events="all"/></g>'+close;
  });
 }
 if(illustrative&&!small)output+=`<text x="400" y="35" text-anchor="middle" font-size="12" fill="#879677">MODÈLE ILLUSTRATIF · LES COTES RESTENT À SAISIR</text>`;return output+'</svg>';
}
function panelDiagramSVG(model,{illustrative=false,small=false,interactive=true}={}){
 const mesh=window.MIRProductionVolume.buildMesh(model);
 if(!mesh.valid)return window.MIRProductionVolume.render(model,{yaw:0,pitch:0,zoom:1,illustrative,formatMeasurement:M.formatMeasurement});
 const short=!small&&shortPanel.matches,compact=!small&&!short&&compactPanel.matches;
 const canvas=compact?400:760,height=short?235:compact?400:500;
 const face={left:compact?28:48,right:canvas-(short?340:compact?132:172),top:short?43:58,bottom:height-(short?62:118)};
 const {minX,maxX,minY,maxY}=mesh.bounds,z=small?1:zoom;
 const scale=Math.min((face.right-face.left)/Math.max(1,maxX-minX),(face.bottom-face.top)/Math.max(1,maxY-minY))*z;
 const tr={scale,ox:(face.left+face.right-(minX+maxX)*scale)/2,oy:(face.top+face.bottom+(minY+maxY)*scale)/2};
 const outer=mesh.outer.map(p=>pointOnView(p,tr));
 const coords=pts=>pts.map(p=>p.map(fmt).join(',')).join(' ');
 const hex=/^#[0-9a-f]{6}$/i.test(model.finish?.hex||'')?model.finish.hex:'#b8c5ae';
 const swatch=safeAsset(model.spec?.finish?.swatchUrl||model.finish?.swatchUrl);
 const suffix=small?'thumb-'+esc(model.spec?.id||'panel'):'main',paint='panel-face-paint-'+suffix,clip='panel-face-clip-'+suffix;
 const editable=interactive&&!authoring&&!small;
 const fill=swatch?'url(#'+paint+')':hex;
 const xs=outer.map(p=>p[0]),ys=outer.map(p=>p[1]);
 const left=Math.max(18,Math.min(...xs)),right=Math.min(face.right+12,Math.max(...xs));
 const top=Math.max(face.top-18,Math.min(...ys)),bottom=Math.min(face.bottom+10,Math.max(...ys));
 const dimX=right+28,dimY=bottom+(short?21:32),center=(left+right)/2,middle=(top+bottom)/2;
 const value=mm=>illustrative?'À saisir':M.formatMeasurement(mm,model.unit).replace(/(\d) (?=\d+\/\d+ po$)/,'$1\u00a0');
 const measure=(key,label,x,y,w,content)=>`<g class="mir-panel-plan-measure" ${editable?`data-edit-panel-measure="${key}" role="button" tabindex="0" aria-label="Modifier ${label}"`:''}><rect class="mir-panel-plan-hit" x="${x-w/2}" y="${y-26}" width="${w}" height="52" rx="7" fill="transparent"/>${content}</g>`;
 const text=(x,y,label,align='middle')=>`<text x="${x}" y="${y}" text-anchor="${align}" dominant-baseline="middle" font-size="${short?22:compact?16:19}" font-weight="700" fill="#294734" pointer-events="none">${esc(label)}</text>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${height}" role="group" aria-label="${esc(model.name)} — vue cotée, lips compris" data-panel-face="true" data-zoom="${z}" font-family="Arial,sans-serif"><title>${esc(model.name)} — dimensions hors tout avec lèvres</title><defs><clipPath id="${clip}"><rect x="12" y="${face.top-20}" width="${face.right}" height="${face.bottom-face.top+30}"/></clipPath>${swatch?`<pattern id="${paint}" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="${hex}"/><image href="${esc(swatch)}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>`:''}</defs><text x="${canvas/2}" y="25" text-anchor="middle" font-size="${compact?13:15}" fill="#49614a">${illustrative?'Aperçu · cotes à saisir':'Vue de face · lèvres incluses dans A et B'}</text><g clip-path="url(#${clip})"><polygon points="${coords(outer)}" fill="${fill}" stroke="#4b5b46" stroke-width="1.5"/><polygon points="${coords(mesh.front.map(p=>pointOnView(p,tr)))}" fill="${fill}" stroke="#4b5b46" stroke-width="2"/>`;
 for(const [i,edge] of (model.edges||[]).entries()){
  const [ax,ay]=outer[i],[bx,by]=outer[(i+1)%outer.length];
  const path=`M${ax},${ay}L${bx},${by}`;
  const midX=(ax+bx)/2,midY=(ay+by)/2;
  if(edge.id===model.bottomEdgeId&&!illustrative)svg+=`<path d="${path}" stroke="${model.perforation?.enabled?'#26758d':'#54863f'}" stroke-width="4"${model.perforation?.enabled?' stroke-dasharray="10 5"':''}/>`;
  if(editable)svg+=`<g class="mir-panel-plan-edge" data-edit-panel-edge="${esc(edge.id)}" tabindex="0" role="button" aria-label="Modifier ${esc(edge.name)}"><title data-panel-edge-lip="${esc(edge.id)}">${esc(edge.name)}</title><path class="mir-panel-plan-edge-line" d="${path}" fill="none" stroke="transparent" stroke-width="4" vector-effect="non-scaling-stroke"/><path d="${path}" fill="none" stroke="transparent" stroke-width="34" vector-effect="non-scaling-stroke" pointer-events="stroke"/><rect x="${midX-24}" y="${midY-24}" width="48" height="48" fill="transparent"/></g>`;
 }
 svg+=`</g><g fill="none" stroke="#658064" stroke-width="1.2" pointer-events="none"><path d="M${left},${bottom+8}V${dimY+6} M${right},${bottom+8}V${dimY+6} M${left},${dimY}H${center-Math.min(53,(right-left)/3)} M${center+Math.min(53,(right-left)/3)},${dimY}H${right} M${left},${dimY}l6,-3m-6,3l6,3 M${right},${dimY}l-6,-3m6,3l-6,3 M${right+8},${top}H${dimX+6} M${right+8},${bottom}H${dimX+6} M${dimX},${top}V${bottom} M${dimX},${top}l-3,6m3,-6l3,6 M${dimX},${bottom}l-3,-6m3,6l3,-6"/></g>`;
 svg+=measure('width','A — Largeur hors tout',center,dimY+10,142,text(center,dimY+12,'A · '+value(model.widthMM)));
 svg+=measure('height','B — Hauteur hors tout',dimX+47,middle,94,text(dimX+9,middle-10,'B','start')+text(dimX+9,middle+10,value(model.heightMM),'start'));
 const profileX=short?canvas-112:canvas/2,profileY=short?middle:height-29;
 svg+=measure('relief','C — Projection',profileX,profileY,196,`<path d="M${profileX-76},${profileY-10}h30v19h15 M${profileX-40},${profileY-10}v19" fill="none" stroke="#658064" stroke-width="1.5" pointer-events="none"/>${text(profileX-21,profileY,'C · '+value(model.reliefMM),'start')}`);
 return svg+'</svg>';
}
function profileHemRadius(model){return Math.min(1.5,Math.max(.5,model.material?.thicknessMM||.65));}
function profileVolumeStrips(model,radius=profileHemRadius(model)){
 const section=M.profileSectionPath(model.pointsMM.map(([x,y])=>[x,-y]),model.bends,radius);
 const runs=section.segments.map(pair=>pair.map(([x,y])=>[x,-y]));
 return runs.flatMap(([a,b],index)=>{
  const result=[{a,b,segmentIndex:index}];
  if(model.bends[index]?.mode!=='hem'||!runs[index+1])return result;
  const c=runs[index+1][0],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(!length)return result;
  const center=[(b[0]+c[0])/2,(b[1]+c[1])/2];
  let last=b;
  for(let step=1;step<=8;step++){
   const angle=step*Math.PI/8;
   const end=step===8?c:[0,1].map(axis=>center[axis]+(b[axis]-center[axis])*Math.cos(angle)+(b[axis]-a[axis])/length*radius*Math.sin(angle));
   result.push({a:last,b:end,segmentIndex:index,rounded:true});
   last=end;
  }
  return result;
 });
}
// Extruded faces share the same longitudinal axis. A partition in the
// cross-section orders the opaque faces and splits any intersecting strips.
function orderProfileStrips(strips,eye){
 if(strips.length<2)return strips;
 const [split,...rest]=strips;
 const dx=split.b[0]-split.a[0],dy=split.b[1]-split.a[1];
 const side=([x,y])=>dx*(y-split.a[1])-dy*(x-split.a[0]);
 const left=[],right=[],flat=[split];
 const epsilon=1e-7;
 for(const strip of rest){
  const a=side(strip.a),b=side(strip.b);
  if(Math.abs(a)<=epsilon&&Math.abs(b)<=epsilon){flat.push(strip);continue;}
  if(Math.min(a,b)>=-epsilon){left.push(strip);continue;}
  if(Math.max(a,b)<=epsilon){right.push(strip);continue;}
  const intersection=strip.a.map((value,i)=>value+(strip.b[i]-value)*a/(a-b));
  (a>0?left:right).push({...strip,b:intersection});
  (b>0?left:right).push({...strip,a:intersection});
 }
 const leftNear=dx*eye[1]-dy*eye[0]>0;
 return [...orderProfileStrips(leftNear?right:left,eye),...flat,...orderProfileStrips(leftNear?left:right,eye)];
}
function showProfilePaintedFace(){
 if(kind!=='profile'||view!=='volume')return;
 const model=drawingModel().model,face=model.coloredFace;
 if(!face?.side||!model.valid)return;
 const segment=model.segments.find(s=>s.label===face.segmentId);
 if(!segment)return;
 const heading=segment.headingDeg*Math.PI/180,sign=face.side==='left'?1:-1;
 const nx=-Math.sin(heading)*sign,ny=Math.cos(heading)*sign;
 const yaw=orbit*Math.PI/180,tilt=pitch*Math.PI/180;
 if(-nx*Math.sin(yaw)*Math.cos(tilt)+ny*Math.sin(tilt)>.12)return;
 orbit=-Math.atan2(nx,.75)*180/Math.PI;
 pitch=Math.atan2(ny,Math.hypot(nx,.75))*180/Math.PI;
}
function profileVolumeSVG(model,illustrative){
 const yaw=orbit*Math.PI/180,tilt=pitch*Math.PI/180;
 const eye=[-Math.sin(yaw)*Math.cos(tilt),Math.sin(tilt)];
 const project=([x,y],z)=>{
  const depth=-x*Math.sin(yaw)+z*Math.cos(yaw);
  return [x*Math.cos(yaw)+z*Math.sin(yaw),y*Math.cos(tilt)-depth*Math.sin(tilt)];
 };
 const sampleLengthMM=10*25.4;
 const length=Math.min(model.lengthMM||sampleLengthMM,sampleLengthMM);
 const strips=profileVolumeStrips(model).map(strip=>{
  const facing=(strip.b[0]-strip.a[0])*eye[1]-(strip.b[1]-strip.a[1])*eye[0];
  return {...strip,facing};
 }).filter(strip=>Math.abs(strip.facing)>1e-8);
 const points=strips.flatMap(({a,b})=>[project(a,0),project(b,0),project(a,length),project(b,length)]);
 if(!points.length)return diagramSVG(model,{illustrative});
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const scale=zoom*Math.min(610/Math.max(1,Math.max(...xs)-Math.min(...xs)),355/Math.max(1,Math.max(...ys)-Math.min(...ys)));
 const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;
 const pixel=([x,y])=>[fmt(400+(x-cx)*scale),fmt(255-(y-cy)*scale)].join(',');
 const finish=illustrative&&!authoring?draft.finish||{}:model.spec?.finish||model.finish||{};
 const flatPreview=window.MIRKaycanFlatPreview?.isFlatPreview(finish)===true;
 const swatch=flatPreview?null:safeAsset(finish.swatchUrl);
 const paint=/^#[0-9a-f]{6}$/i.test(finish.hex||'')?finish.hex
  :(flatPreview?window.MIRKaycanFlatPreview.get(safeAsset(finish.swatchUrl)):null);
 const pattern=swatch?`<defs><pattern id="production-paint" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="${paint||'#a9adb1'}"/><image href="${esc(swatch)}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern></defs>`:'';
 const polygons=orderProfileStrips(strips,eye).map(({a,b,facing})=>{
  const side=facing>0?'left':'right';
  const painted=side===model.coloredFace?.side&&!!(paint||swatch||flatPreview);
  const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
  const gray=Math.round(170+30*Math.abs(Math.sin(angle)));
  const fill=painted?(swatch?'url(#production-paint)':paint||'#c0c7bc'):`rgb(${gray},${gray+3},${gray+6})`;
  const corners=[project(a,0),project(b,0),project(b,length),project(a,length)];
  return `<polygon points="${corners.map(pixel).join(' ')}" fill="${fill}" data-profile-finish="${painted?'painted':'metal'}"/>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="img" aria-label="Volume schématique de ${esc(model.name)}" font-family="Arial,sans-serif">${pattern}<text x="400" y="35" text-anchor="middle" font-size="12" fill="#7c8e6a">VOLUME SCHÉMATIQUE · GLISSEZ POUR TOURNER</text>${polygons}<text x="400" y="482" text-anchor="middle" font-size="13" fill="#7c8e6b">${esc('Échantillon 3D · '+M.formatMeasurement(length,model.unit))}</text></svg>`;
}
function volumeSVG(model,{illustrative=false}={}){
 if(model.kind==='profile'&&model.pointsMM?.length>=2)return profileVolumeSVG(model,illustrative);
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
 if(kind==='panel'){
  el.hidden=!!editingItemId;
  if(el.hidden){el.innerHTML='';return;}
  el.innerHTML=tool==='panel-trace'
   ?'<p class="draw-help">Clique ou glisse pour les sommets · Maj = 90° · cote après le dessin.</p>'+
    '<button type="button" class="secondary-button" data-panel-sketch-undo'+(!panelSketchPoints.length?' disabled':'')+'>↶ Dernier point</button>'+
    '<button type="button" class="secondary-button" data-panel-sketch-cancel>Annuler</button>'+
    '<button type="button" class="primary-button" data-panel-sketch-finish'+(panelSketchPoints.length<3?' disabled':'')+'>Terminer le panneau</button>'
   :'<button type="button" class="secondary-button" data-panel-sketch-start>✎ Dessiner un panneau libre</button><span class="draw-help">Comme une moulure · 2D/3D synchronisés · sans lip possible.</span>';
  return;
 }
 el.hidden=kind!=='profile'||client&&!(clientProfileWizard()&&tool==='draw')||view==='volume'||(!!editingItemId&&!clientEditableTrace());
 if(el.hidden){el.innerHTML='';return;}
 const drawing=tool==='draw';
 if(clientProfileWizard()){
  const instruction=!drawPoints.length?clientTracePrompt():drawPoints.length<3?'Placez au moins trois points pour créer deux côtés.':build().valid?'Ajoutez un côté ou terminez le dessin.':'Annulez le dernier point et réessayez.';
  el.innerHTML=`<p class="client-trace-help">${esc(instruction)}</p>${!drawPoints.length?'<button type="button" id="client-example-l">Essayer un L en trois points</button>':''}<details class="client-keyboard-trace"><summary>Saisir les points au clavier</summary><p>Coordonnées absolues en ${draft.unit==='mm'?'mm':'po'} : X vers la droite, Y vers le haut.</p><label>X<input id="client-point-x" inputmode="decimal" value="0"></label><label>Y<input id="client-point-y" inputmode="decimal" value="0"></label><button type="button" id="client-keyboard-point">Ajouter ce point</button></details><button type="button" id="client-new-trace">Nouveau tracé</button><label class="client-trace-scale">Échelle de la grille<select id="trace-height">${traceHeights.map(height=>`<option value="${height}"${height===traceHeight?' selected':''}>${height} po de haut</option>`).join('')}</select></label><button type="button" data-drawing-undo${!drawPoints.length?' disabled':''}>Annuler le point</button><button type="button" class="draw-primary" data-draw-tool="draw"${drawPoints.length<3||!build().valid?' disabled':''} aria-label="Suivant — terminer le dessin">Suivant</button>`;
  return;
 }
 const recentHem=draft.template==='custom'?(draft.bends||[]).findLastIndex(bend=>bend.mode==='hem'):-1;
 const hemNotice=recentHem<0?'':`<p class="draw-help hem-notice">Double pli · ${esc(draft.segments[recentHem].label)} → ${esc(draft.segments[recentHem+1].label)} <button type="button" data-focus-bend="${recentHem}">Modifier le pli</button></p>`;
 const compact=matchMedia('(any-pointer: coarse)').matches;
 const fullscreen=compact&&!$('.drawing-card').classList.contains('mobile-trace')
  ?'<button type="button" data-open-mobile-trace>Plein écran</button>':'';
 const settingsStart=compact?'<details class="trace-more"><summary>Réglages du tracé</summary><div>':'';
 const settingsEnd=compact?'</div></details>':'';
 el.innerHTML=drawing?`<button type="button" class="draw-primary" data-draw-tool="draw"${drawPoints.length<3?' disabled':''}>Terminer et coter</button><button type="button" data-drawing-undo${!drawPoints.length?' disabled':''}>Annuler le dernier point</button><button type="button" class="discard-current-drawing" data-discard-current-piece${!drawPoints.length?' disabled':''}>Supprimer le tracé</button>${fullscreen}${settingsStart}<label>Grille<select id="drawing-snap"><option value="off"${snap?'':' selected'}>Désactivée</option>${draft.unit==='mm'?'<option value="metric"'+(snap?' selected':'')+'>1 mm</option>':[[8,'⅛ po'],[4,'¼ po']].map(([divisor,label])=>`<option value="${divisor}"${snap&&traceGridDivisor===divisor?' selected':''}>${label}</option>`).join('')}</select></label><label><input id="drawing-right-angle" type="checkbox"${rightAngleSnap?' checked':''}>Aimant 45° / 90°</label><label>Hauteur du plan<select id="trace-height">${traceHeights.map(height=>`<option value="${height}"${traceHeight===height?' selected':''}>${height} po</option>`).join('')}</select></label>${settingsEnd}<p class="draw-help">Clique-glisse et relâche pour ajouter un côté. Shift verrouille à 90°. Pour un double pli, reviens presque sur le trait précédent.</p>${hemNotice}`:
 `${tool==='select'?'<button type="button" class="draw-primary" data-end-hem>Ajouter un double pli</button>':''}<button type="button" class="draw-primary" data-new-drawing>Nouveau dessin</button><button type="button" class="discard-current-drawing" data-discard-current-piece>Supprimer la pièce en cours</button><button type="button" class="draw-primary" data-focus-dimensions>Cotes et angles ↓</button><button type="button" data-draw-tool="edit" aria-pressed="${tool==='edit'}">${tool==='edit'?'Terminer la retouche':'Déplacer les points'}</button><button type="button" data-draw-tool="draw" aria-pressed="false">Reprendre le tracé</button>${hemNotice}`;
}
function profileMeasureInput(index,label){
 const selector=draft.template==='custom'? `[data-segment-length="${index}"]`:
  /^[A-Z][A-Z0-9]*$/.test(label)?`[data-measure="${label}"]`:'';
 const input=selector&&$('#production-dimensions').querySelector(selector);
 return input&&!input.disabled&&!input.readOnly?input:null;
}
function renderFractionPickers(){
 if(draft.unit!=='in')return;
 const fields=document.querySelectorAll('#production-dimensions input[data-measure], #production-dimensions input[data-segment-length], #client-step-length input, #panel-lip, input[data-panel-lip]');
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
 // Les valeurs en seizièmes ont une écriture décimale exacte (4 chiffres au maximum).
 // Le moteur accepte aussi les fractions saisies à la main; ici seul le sélecteur
 // remplit visiblement le champ en décimal pour éviter l'ambiguïté sur iPad.
 input.value=String(amount);
 handleInput({target:input});
}
function updateV4Totals(model){
 const totalNode=$('#mir-v4-sheet-total'),totalValue=$('#mir-v4-sheet-value');
 if(totalNode&&totalValue){
  const isProfile=model.kind==='profile';
  totalNode.hidden=!isProfile;
  const rawWidth=isProfile&&Number.isFinite(model.finishedSegmentSumMM)?M.formatMeasurement(model.finishedSegmentSumMM,model.unit):'À préciser';
  const glyphs={'1/2':'½','1/4':'¼','3/4':'¾','1/8':'⅛','3/8':'⅜','5/8':'⅝','7/8':'⅞'};
  const mixed=/^(-?[0-9]+) ([0-9]+\/[0-9]+) po$/.exec(rawWidth);
  totalValue.textContent=mixed&&glyphs[mixed[2]]?mixed[1]+glyphs[mixed[2]]+' po':rawWidth;
 }
 const put=(selector,value)=>{const node=$(selector);if(node)node.textContent=value||'À préciser';};
 const materialLabels={'acier':'Acier','aluminium':'Aluminium','acier-inoxydable':'Acier inoxydable','autre':'Autre matériau'};
 put('#mir-v4-recap-material',model.material?.name||materialLabels[model.material?.type]||materialLabels[draft.material?.type]);
 put('#mir-v4-recap-color',model.finish?.name||model.finish?.code);
 if(model.kind==='profile'){
  put('#mir-v4-recap-face',model.coloredFace?.side?(model.coloredFace.side==='left'?'Gauche':'Droite')+' · '+(model.coloredFace.segmentId||'A'):'À préciser');
  put('#mir-v4-recap-length',Number.isFinite(model.lengthMM)?M.formatMeasurement(model.lengthMM,model.unit):'À préciser');
 }else{
  put('#mir-v4-recap-face',model.perforation?.enabled?'Bas perforé':'Sans perforation');
  put('#mir-v4-recap-length',Number.isFinite(model.widthMM)&&Number.isFinite(model.heightMM)?M.formatMeasurement(model.widthMM,model.unit)+' × '+M.formatMeasurement(model.heightMM,model.unit):'À préciser');
 }
 const lengthTitle=$('#mir-v4-recap-length')?.previousElementSibling;if(lengthTitle)lengthTitle.textContent=model.kind==='profile'?'Longueur de la pièce':'Dimensions du panneau';
 const faceTitle=$('#mir-v4-recap-face')?.previousElementSibling;if(faceTitle)faceTitle.textContent=model.kind==='profile'?'Face colorée':'Perforation';
 put('#mir-v4-recap-quantity',String(model.quantity||draft.quantity||1));
 const typeLabel=model.material?.name||materialLabels[model.material?.type]||materialLabels[draft.material?.type];
 put('#mir-v4-material-status',typeLabel);
 put('#mir-v4-colors-status',model.finish?.name||model.finish?.code);
 put('#mir-v4-face-status',model.kind==='profile'
  ?(model.coloredFace?.side?(model.coloredFace.side==='left'?'Gauche':'Droite')+' · '+(model.coloredFace.segmentId||'A'):'À préciser')
  :(model.perforation?.enabled?'Bas perforé':'Sans perforation'));
 put('#mir-v4-details-status','Qté '+String(model.quantity||draft.quantity||1));
 const dims=model.kind==='profile'
  ?(model.segments||[]).map(segment=>segment.label+' '+M.formatMeasurement(segment.lengthMM,model.unit)).join(' · ')
  :(Number.isFinite(model.widthMM)?'A '+M.formatMeasurement(model.widthMM,model.unit):'');
 put('#mir-v4-dimensions-status',dims);
}
function syncPieceNameField(){
 const field=$('#mir-piece-name-field'),input=$('#production-piece-name');
 if(!field||!input)return;
 field.hidden=client||kind!=='profile'||authoring;
 if(document.activeElement!==input){
  const name=String(draft?.name||'');
  input.value=['Profil dessiné','Profil personnalisé','Profil libre'].includes(name)?'':name;
 }
}
const clientStages=[
 {title:'Choisissez votre moulure',hint:'Sélectionnez un modèle ci-dessous ou dessinez votre propre profil.',action:'Passer aux mesures'},
 {title:'Vérifiez les mesures et les angles',hint:'Vérifiez chaque côté et son angle sur le dessin.',action:'Suivant'},
 {title:'Longueur de vente MIR',hint:'Longueur fixe : 10 pi pour les moulures; 12 pi uniquement pour le J à soffite. Les cotes des côtés restent personnalisables.',action:'Suivant'},
 {title:'Choisissez la face colorée',hint:'Suivez le tracé de A vers le dernier côté. Choisissez de quel côté du trait se trouve la face à peindre.',action:'Suivant'},
 {title:'Choisissez le matériau et la couleur',hint:'Sélectionnez le matériau, puis la teinte. Vous pourrez ensuite ajouter la pièce à votre dossier.'}
];
function clientTracePrompt(){return matchMedia('(any-pointer:coarse)').matches?'Touchez la grille pour placer le premier point.':'Cliquez sur la grille pour placer le premier point.';}
function focusClientEntry(selector='#client-entry-title'){
 window.scrollTo({top:0,left:0,behavior:'auto'});$(selector)?.focus({preventScroll:true});
}
function renderClientEntry(active){
 const entry=$('#client-entry');
 if(!active){
  if(document.body.dataset.clientEntry)$('.drawing-head')?.after($('#drawing-tools'));
  delete document.body.dataset.clientEntry;
  entry.hidden=true;
  return;
 }
 const options=$('#client-standard-options');
 if(!options.hasChildNodes()){
  options.innerHTML=Object.entries(profiles).filter(([id])=>id!=='custom').map(([id,p])=>'<button type="button" class="template-button" data-client-profile="'+esc(id)+'">'+templateIcon('profile',id)+'<span>'+esc(p.name)+'</span></button>').join('');
  $('#client-choose-model').disabled=false;
  $('#client-draw-profile').disabled=false;
 }
 for(const button of $('#client-standard-options').querySelectorAll('[data-client-profile]'))button.setAttribute('aria-pressed',String(clientProfileSelected&&selectedTemplate?.id==='mir-standard-profile-'+button.dataset.clientProfile));
 const state=clientStep!==1?'measures':tool==='draw'?'draw':clientEntry;
 document.body.dataset.clientEntry=state;entry.hidden=clientStep!==1;
 $('#client-entry-title').textContent=state==='models'?'Choisissez votre modèle':state==='draw'?'Dessiner ma moulure':'Comment voulez-vous commencer?';
 $('#client-entry-intro').hidden=state!=='choice';$('.client-entry-cards').hidden=state!=='choice';
 entry.querySelector('a').hidden=state!=='choice';$('#client-entry-back').hidden=state==='choice';$('#client-model-options').hidden=state!=='models';
 const templatesSection=$('.template-section');const destination=state==='models'?$('#client-saved-options'):$('#client-step-type');if(templatesSection.parentElement!==destination)destination.append(templatesSection);
 const tools=$('#drawing-tools'),grid=$('.mir-panel-synced-views')||$('#production-drawing');if(state==='draw')grid.after(tools);else $('.drawing-head').after(tools);
}
function mountClientWizard(active){
 const config=$('.config-card'),scroll=$('#client-step-scroll'),optional=$('#client-optional-metal');
 if(active===!scroll.hidden)return;
 if(active){
  const type=$('#client-step-type');
  const nodes=[
   [$('.template-section'),type,1],
   [config.querySelector('.section-heading'),scroll,2],[$('#measure-hint'),scroll,2],
   [$('#production-dimensions'),scroll,2],[$('#production-profile-options'),scroll,null],
   [$('.piece-finish'),scroll,5],[$('#add-production-piece').closest('.config-section'),scroll,5],
   [$('#material-thickness').closest('.two-fields'),optional,null],[$('#thickness-hint'),optional,null],
   [$('#production-location').closest('label'),optional,null],[$('#production-note').closest('label'),optional,null],[$('#panel-price'),$('#client-step-actions'),null]
  ];
  clientWizardPlaces=nodes.map(([node,destination,stage])=>{
   const marker=document.createComment('configurateur client');
   node.before(marker);
   if(stage)node.dataset.clientStage=stage;
   destination.append(node);
   return [node,marker];
  });
 }else{
  for(const [node,marker] of clientWizardPlaces){delete node.dataset.clientStage;marker.replaceWith(node);}
  clientWizardPlaces=[];
 }
 optional.hidden=!active;
 optional.open=false;
 $('#production-title').innerHTML=active?'Configurez votre <em>moulure.</em>':'Votre pièce.<br>À vos <em>mesures.</em>';
 $('#production-description').textContent=active?'Préparez votre moulure sur mesure.':'Choisissez la forme. Entrez vos cotes, votre métal et votre couleur. Votre dessin suit vos choix.';
 config.setAttribute('aria-labelledby',active?'client-step-title':'configure-heading');
 scroll.hidden=!active;
 $('#client-step-actions').hidden=!active;
 $('#client-step-list').hidden=!active;
}
function clientStepIssues(model,blockJ){
 const pending=model.validation.pending||[];
 const issues={
  1:!clientProfileSelected?(tool==='draw'?'Tracez au moins deux côtés, puis cliquez sur « Suivant ».':'Sélectionnez un modèle ou dessinez une moulure.'):'',
  2:model.validation.errors.find(issue=>issue.code!=='QUANTITY_REQUIRED'&&issue.path!=='quantity')?.message||(blockJ?'Vérifiez le clouage du J dans les mesures.':''),
  3:(stockLengthCheck().ok?'':stockLengthCheck().message)||pending.find(issue=>issue.code==='LENGTH_REQUIRED')?.message||'',
  4:pending.find(issue=>issue.path.startsWith('coloredFace.'))?.message||'',
  5:pending.find(issue=>['MATERIAL_REQUIRED','COLOR_SOURCE_REQUIRED','COLOR_CODE_REQUIRED','THICKNESS_INVALID','QUANTITY_REQUIRED','GAUGE_UNCONFIRMED'].includes(issue.code))?.message||''
 };
 if(!publicProfileMaterials.includes(model.material.type))issues[5]='Choisissez un matériau.';
 else if(!model.finish.code)issues[5]=colorSystem==='special'?'Entrez le code exact de votre couleur spéciale.':'Choisissez une couleur.';
 return issues;
}
function renderClientWizard(model,blockJ){
 const active=clientProfileWizard();
 mountClientWizard(active);
 if(!active){delete document.body.dataset.clientStage;delete document.body.dataset.clientTrace;renderClientEntry(false);return;}
 const issues=clientStepIssues(model,blockJ);
 document.body.dataset.clientStage=clientStep;
 document.body.dataset.clientTrace=String(tool==='draw');
 const stage=clientStages[clientStep-1],count=$('#client-step-count'),title=$('#client-step-title');
 if(title.textContent!==stage.title){
  count.textContent=clientStep===3?'LONGUEUR À VÉRIFIER':'ÉTAPE '+(clientStep>3?clientStep-1:clientStep)+' SUR 4';
  title.textContent=stage.title;
 }
 $('#client-step-hint').textContent=clientStep===2?stage.hint+' Longueur vendue : '+stockLengthIn(draft)/12+' pi.':stage.hint;
 $('.piece-finish').open=true;
 for(const button of $('#client-step-list').querySelectorAll('button')){
  const step=Number(button.dataset.clientStep);
  button.disabled=step===1&&!!editingItemId&&!clientEditableTrace()||step>clientUnlocked||Array.from({length:step-1},(_,i)=>issues[i+1]).some(Boolean);
  if(step===clientStep)button.setAttribute('aria-current','step');
  else button.removeAttribute('aria-current');
  button.classList.toggle('is-complete',step<clientUnlocked&&!issues[step]);
 }
 const next=$('#client-step-next');
 $('#client-step-back').hidden=clientStep===1||clientStep===2&&!!editingItemId&&!clientEditableTrace();
 $('#client-step-back').textContent=clientStep===2&&draft.template==='custom'?'Modifier le tracé':'Retour';
 const status=$('#client-step-status'),message=issues[clientStep]||'';
 if(status.textContent!==message)status.textContent=message;
 next.disabled=Boolean(message)||busy||clientStep===5&&$('#add-production-piece').disabled;
 next.innerHTML=clientStep===5?$('#add-production-piece').innerHTML:stage.action+' <span aria-hidden="true">→</span>';
 renderClientEntry(true);
}
function goClientStep(step,{confirm=false}={}){
 if(!clientProfileWizard()||step<1||step>5||step===1&&editingItemId&&!clientEditableTrace())return;
 const jRule=window.MIRBendingPresets?.checkJ(draft);
 const blockJ=jRule&&!jRule.pending&&(!jRule.valid||(!jRule.ok&&!window.MIRBendingPresets.exceptionMatches(jRule,jException)));
 const issues=clientStepIssues(build(),blockJ);
 if(step>clientUnlocked&&(!confirm||step!==clientStep+1))return;
 // A fixed, valid stock length does not need its own confirmation.
 if(step===3&&!issues[3])step=clientStep===4?2:4;
 if(Array.from({length:step-1},(_,i)=>issues[i+1]).some(Boolean))return;
 clientStep=step;if(step===1)clientEntry='choice';
 clientUnlocked=Math.max(clientUnlocked,step);
 if(step===2||step===4){view='face';zoom=1;viewPan={x:0,y:0};}
 updateDrawing();
 $('#client-step-scroll').scrollTop=0;
 if(step===1){focusClientEntry();return;}
 $('#client-step-title').focus({preventScroll:true});
 $('#client-step-title').scrollIntoView({block:'nearest'});
}
function updateDrawing({keepForm=false}={}){
 if(clientProfileWizard()&&draft&&order&&clientDraftReady)store('mir_client_active_profile_v1',{version:1,draft,drawPoints,clientStep,clientUnlocked,clientProfileSelected,clientEntry,tool,colorSystem,colorId,materialId,selectedTemplate,legacyQuickId,editingItemId});
 document.body.dataset.panelSketch=String(kind==='panel'&&tool==='panel-trace');
 syncPieceNameField();
 renderFractionPickers();
 refreshInlineHemCards();
 const actual=build(),shown=drawingModel(),mesh=kind==='panel'&&actual.valid&&!authoring?window.MIRProductionVolume?.buildMesh(actual):null;
 const angleList=$('#mir-angle-summary');
 if(angleList){
  const angleModel=clientProfileWizard()&&draft.template!=='custom'&&!actual.bends?.length?shown.model:actual;
  const bends=angleModel.bends||[];
  angleList.hidden=!bends.length;
  angleList.innerHTML=bends.map((bend,i)=>'<p><strong>'+esc(angleModel.segments[i]?.label||String.fromCharCode(65+i))+'–'+esc(angleModel.segments[i+1]?.label||String.fromCharCode(66+i))+'</strong><span>'+esc(bend.mode==='hem'&&clientProfileWizard()?'Double pli':bendAngleLabel(bend))+'</span></p>').join('');
 }

 const geometryErrors=mesh&&!mesh.valid?mesh.errors:[];
 const waiting=clientProfileWizard()&&!clientProfileSelected&&tool!=='draw';
 $('#drawing-title').textContent=waiting?'Aperçu de la moulure':authoring?'Modèle · '+(draft.name||actual.name):draft.name||actual.name;
 const stage=$('#production-drawing');if(tool!=='draw'||view!=='face')closeMobileTrace();stage.dataset.tool=tool;stage.dataset.view=view;stage.dataset.kind=kind;stage.style.touchAction=tool==='panel-trace'||canDrawProfile()||view==='volume'||(!client&&kind==='profile')?'none':'';$('#trace-readout').hidden=!canDrawProfile();
 stage.innerHTML=tool==='panel-trace'&&kind==='panel'?window.MIRPanelSketch.svg(panelSketchPoints,panelSketchHover):
  waiting?'<div class="drawing-hint">Choisissez une moulure pour voir son profil ici.</div>':
  view==='volume'?volumeSVG(shown.model,{illustrative:shown.illustrative}):diagramSVG(shown.model,{illustrative:shown.illustrative});

 let directTools=$('#mir-panel-direct-tools');
 if(!directTools){directTools=document.createElement('div');directTools.id='mir-panel-direct-tools';directTools.className='mir-panel-direct-tools';stage.after(directTools);}
 directTools.hidden=kind!=='panel'||authoring||tool==='panel-trace';
 directTools.innerHTML=directTools.hidden?'':'<details><summary>Modifier les cotes et les lèvres</summary><div>'+['width','height','relief'].map(key=>'<button type="button" data-edit-panel-measure="'+key+'">'+({width:'A — Largeur hors tout',height:'B — Hauteur hors tout',relief:'C — Projection'}[key])+'</button>').join('')+(actual.edges||[]).map(edge=>'<button type="button" data-edit-panel-edge="'+esc(edge.id)+'">'+esc(edge.name)+' · '+esc(edge.lipMM?M.formatMeasurement(edge.lipMM,actual.unit):'Sans lèvre')+'</button>').join('')+'</div></details>';

 const twin=$('#mir-panel-live-alt');
 if(twin){
  twin.hidden=kind!=='panel';
  if(kind==='panel'){
   const points=tool==='panel-trace'&&panelSketchHover&&panelSketchPoints.length>=2?
    [...panelSketchPoints,panelSketchHover]:panelSketchPoints;
   const twinModel=tool==='panel-trace'?panelSketchPreview(points):shown.model;
   const twinValid=twinModel?.valid&&window.MIRProductionVolume?.buildMesh(twinModel)?.valid;
   const volume=view!=='volume';
   twin.dataset.panelTwin=volume?'3d':'2d';
   twin.dataset.geometryStatus=twinValid?(tool==='panel-trace'||shown.illustrative?'illustrative':'measured'):'pending';
   twin.dataset.syncedShape=twinModel?.shape||'pending';
   twin.innerHTML='<header class="mir-panel-live-heading"><strong>'+(volume?'Volume 3D':'Vue 2D cotée')+
    '</strong><small> même géométrie</small></header>'+
    (twinValid?(volume?volumeSVG(twinModel,{illustrative:tool==='panel-trace'||shown.illustrative}):
      panelDiagramSVG(twinModel,{illustrative:shown.illustrative,small:true,interactive:false})):
     '<p class="field-hint mir-panel-live-empty">Tracez trois sommets pour afficher le volume 3D, sans inventer de cotes.</p>');
  }
 }
 const net=$('#mir-panel-net-summary');
 if(net){
  const face=actual.valid&&mesh?.valid?window.MIRPanelRoof?.visibleFace(mesh):null;
  if(face){
   const outside=M.formatMeasurement(actual.widthMM,actual.unit)+' × '+M.formatMeasurement(actual.heightMM,actual.unit);
   const inside=M.formatMeasurement(face.widthMM,actual.unit)+' × '+M.formatMeasurement(face.heightMM,actual.unit);
   net.innerHTML='<p><strong>Hors tout de fabrication</strong> <span>'+esc(outside)+'</span></p>'+
    '<p><strong>Face nette hors lèvres</strong> <span>'+esc(inside)+'</span></p>'+
    '<p class="field-hint">Les lèvres sont comprises dans le hors tout, jamais ajoutées au calcul. Pour les rampants, la face nette est la boîte englobante du contour avant.</p>';
  }else net.textContent=actual.valid?'Les lèvres ne permettent pas une face nette valide : corrigez les côtés.':
    'Renseignez les cotes réelles A/B et les lèvres pour connaître la face nette, sans compter les lips.';
 }
 roofReadout();
 const dimensions=$('#profile-dimension-list');
 const sides=tool==='draw'?drawPoints.slice(1).map((point,index)=>({
  label:String.fromCharCode(65+index),
  lengthMM:Math.hypot(point[0]-drawPoints[index][0],point[1]-drawPoints[index][1])
 })):shown.illustrative?[]:shown.model.segments||[];
 if(dimensions){
  dimensions.hidden=kind!=='profile'||!sides.length;
  dimensions.innerHTML=dimensions.hidden?'':sides.map((segment,index)=>{
   const text=esc(segment.label)+' · '+esc(M.formatMeasurement(segment.lengthMM,draft.unit));
   return tool==='select'&&(!clientProfileWizard()||clientStep===2)&&profileMeasureInput(index,segment.label)
    ?`<li><button type="button" class="secondary-button" data-edit-profile-measure="${index}" aria-label="Modifier la cote ${esc(segment.label)} : ${esc(M.formatMeasurement(segment.lengthMM,draft.unit))}">${text}</button></li>`
    :`<li>${text}</li>`;
  }).join('');
 }

 $('#drawing-navigation').hidden=client&&kind!=='panel'&&view!=='volume';$('#zoom-controls').hidden=client&&kind!=='panel'&&view!=='volume';$('#panel-zoom-value').textContent=Math.round(zoom*100)+' %';$('#panel-zoom-out').disabled=zoom<=.5;$('#panel-zoom-in').disabled=zoom>=4;
 $('#drawing-gesture-hint').textContent=view==='volume'?'Glissez pour tourner · molette ou pincement pour zoomer':kind==='profile'&&!client?'Glisse dans la vue pour déplacer · Vue complète pour recentrer':'Molette ou pincement pour zoomer';
 document.querySelectorAll('[data-preview]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preview===view)));
 $('#finish-summary').textContent=draft.finish?.name||draft.finish?.code||'';
 $('#drawing-finish').textContent=authoring?'Proportions de présentation seulement':draft.finish?.name||draft.finish?.code||'Finition à sélectionner';
 $('#drawing-basis').textContent=shown.illustrative?'Modèle sans cotes de fabrication':kind==='panel'?'Hors tout, lèvres comprises':'Cotes de la pièce finie';
 $('#drawing-note').textContent=authoring?'Dessinez la forme et réglez ses angles. Les cotes restent des champs vides dans le modèle publié.':kind==='panel'?'A et B comprennent les lips. C est la projection. Les coins sont schématiques; les détails de fabrication seront validés par l’atelier.':'Le liseré bleu indique la face colorée. Touche-le pour inverser le côté. Le développé, les rayons et les corrections de pliage seront validés par l’atelier.';
 renderValidation({...actual,validation:{...actual.validation,errors:[...(actual.validation.errors||[]),...geometryErrors]}});
  const blockLength=kind==='profile'&&!authoring&&!stockLengthCheck().ok;
  if(blockLength)$('#production-validation').insertAdjacentHTML('beforeend','<div class="validation-group error"><strong>Longueur non vendue</strong><p>'+esc(stockLengthCheck().message)+'</p></div>');
 const jRule=window.MIRBendingPresets?.checkJ(draft);
  const blockJ=jRule&&!jRule.pending&&(!jRule.valid||(!jRule.ok&&!window.MIRBendingPresets.exceptionMatches(jRule,jException)));
  $('#add-production-piece').disabled=!actual.valid||geometryErrors.length>0||busy||!!blockJ||blockLength||!availableForPO();
 if(clientProfileWizard())$('#add-production-piece').disabled||=clientStep!==5||Object.values(clientStepIssues(actual,blockJ)).some(Boolean);
 const directPO=$('#mir-direct-po-add');
 if(directPO){
   directPO.hidden=client||kind!=='profile'||authoring||!!editingItemId;
   directPO.disabled=!actual.valid||geometryErrors.length>0||busy||!!blockJ||blockLength||!availableForPO();
 }
  renderPieceGuidance(actual,blockJ);
  updateV4Totals(actual);
 const quote=M.quotePolicy(draft);$('#custom-color-quote').hidden=authoring||!quote.required;renderPiecePrice(actual,geometryErrors);
 $('#add-production-piece').innerHTML=authoring?'Enregistrer le modèle <span aria-hidden="true">＋</span>':editingItemId?'Enregistrer la révision <span aria-hidden="true">✓</span>':quote.required?'Ajouter à ma soumission <span aria-hidden="true">＋</span>':(client?'Ajouter au dossier':'Enregistrer dans mon dossier')+' <span aria-hidden="true">'+(client?'＋':'✓')+'</span>';if(!keepForm)renderTools();
 renderClientWizard(actual,blockJ);
 if(!client)window.MIRAdminWizard?.updatePreview({model:actual,tool,kind,authoring,editingItemId,drawPointsMM:drawPoints.map(point=>point.slice()),canUndo:kind==='panel'?panelDirectUndo.length>0:freeformCanUndo(),canRedo:kind==='panel'?panelDirectRedo.length>0:freeformRedo.length>0});
}
function renderPieceGuidance(model,blockJ){
 const box=$('#piece-guidance');
 if(kind==='panel'&&!authoring){
  box.hidden=false;
  const mesh=window.MIRProductionVolume?.buildMesh(model);
  const issue=model.validation.errors?.[0]||mesh?.errors?.[0]||model.validation.pending?.[0];
  const field=issue?.path||issue?.field||'';
  const key=field.replace(/^dimensions\./,'');
  let target=['width','height','relief','apexX','topWidth','topOffset','offset','tipDepth','apexOffset'].includes(key)?'[data-measure="'+key+'"]':field==='lip'?'#panel-lip':field.startsWith('lips.')?'[data-panel-lip="'+field.slice(5)+'"]':({'quantity':'#production-quantity','material.type':'#material-type','material.thickness':'#material-thickness','finish':'#color-system','finish.code':'#color-system','finish.system':'#color-system'}[field]);
  if(issue?.code==='LIP_REQUIRED'&&issue.edgeId)target='[data-panel-lip="'+issue.edgeId+'"]';
  if(issue?.code==='PROJECTION_REQUIRED')target='[data-measure="relief"]';
  const message=issue?.message||'Les cotes permettent l’ajout. Les précisions de fabrication seront validées par MIR.';
  const html='<strong>'+(issue?'À compléter : ':'Prêt à ajouter : ')+'</strong>'+esc(message)+(target&&$(target)?' <button type="button" data-piece-focus="'+esc(target)+'">Aller au champ</button>':'');
  if(box.dataset.guidance!==html){box.innerHTML=html;box.dataset.guidance=html;}
  return;
 }

 box.hidden=client||kind!=='profile'||authoring;
 if(box.hidden)return;
 const blocking=model.validation.errors||[];
 const pending=model.validation.pending||[];
 if(!availableForPO()){box.textContent='Ce modèle est désactivé pour les bons. Réactive-le dans Mes modèles.';delete box.dataset.guidance;return;}
  if(!stockLengthCheck().ok){box.textContent=stockLengthCheck().message;delete box.dataset.guidance;return;}
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
 const publicProfile=clientProfileWizard();
 $('#production-material-label').textContent=publicProfile?'Matériau':'Type de métal';
 if(publicProfile){
  const publicOptions=options.filter(([id])=>publicProfileMaterials.includes(id));
  options.splice(0,options.length,['','Choisir le matériau'],...publicOptions);
  ralOption.remove();
 }else{
  if(panel&&!m.type)options.unshift(['','Choisir le métal']);
  if(m.type&&!options.some(x=>x[0]===m.type))options.push([m.type,'Matière du dossier · '+m.type]);
  if(!ralOption.isConnected)$('#color-system option[value="special"]').before(ralOption);
 }
 $('#material-type').innerHTML=options.map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('');
 const thickness=$('#material-thickness'),needSelect=panel&&m.type!=='acier',isSelect=thickness.tagName==='SELECT';
 if(needSelect!==isSelect){const field=document.createElement(needSelect?'select':'input');field.id='material-thickness';field.setAttribute('aria-describedby','thickness-hint');if(!needSelect){field.inputMode='decimal';field.placeholder='À confirmer';}thickness.replaceWith(field);}
 if(needSelect){const values=m.type==='aluminium-extrude'?['2','3']:['2','3.2'];const current=String(m.thickness??'');if(current&&!values.includes(current))values.push(current);$('#material-thickness').innerHTML='<option value="">À confirmer</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v.replace('.',','))} mm</option>`).join('');}
 const gauge=$('#material-gauge'),gaugeSelect=panel&&m.type==='acier';if(gaugeSelect!==(gauge.tagName==='SELECT')){const field=document.createElement(gaugeSelect?'select':'input');field.id='material-gauge';if(!gaugeSelect){field.maxLength=40;field.placeholder='À préciser';}gauge.replaceWith(field);}if(gaugeSelect){const values=['18','20','22'];if(m.gauge&&!values.includes(String(m.gauge)))values.push(String(m.gauge));$('#material-gauge').innerHTML='<option value="">À confirmer</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v)} ga</option>`).join('');}
 $('#material-thickness').closest('label').hidden=panel&&m.type==='acier';$('#material-gauge').closest('label').hidden=panel&&m.type!=='acier';
 $('#thickness-hint').textContent=panel?(m.type==='acier'?'U-P1 : acier 18, 20 ou 22 ga. Choisissez le calibre à confirmer pour votre pièce.':m.type==='aluminium'?'U-P1 : aluminium plié de 2 ou 3,2 mm, selon la fiche Unico.':m.type?'Aluminium extrudé sur mesure : 2 ou 3 mm.':'Sélectionnez la matière avant de préciser son épaisseur.'): 'Épaisseur de tôle dans l’unité choisie. Le gage reste la valeur saisie.';
 $('#unico-panel-reference').hidden=!panel||m.type==='aluminium-extrude'||(!!editingItemId&&!m.productRef);
 const manufacturer=$('#color-system option[value="manufacturer"]');manufacturer.disabled=panel&&m.type==='aluminium-extrude';manufacturer.textContent=panel?'Couleurs Unico':'Nuancier du fabricant';
 if(client&&catalogueChannel!=='store'){
  const record=clientProfileWizard()&&templates.find(row=>row.id===selectedTemplate?.id);
  applyTemplateOptions(record);
  if(!record?.allowed?.colorSystems?.length){
   for(const option of $('#color-system').options)option.disabled=option===manufacturer&&panel&&m.type==='aluminium-extrude';
  }
 }
 if(panel&&m.type==='aluminium-extrude'&&colorSystem==='manufacturer'){colorSystem='ral';colorId='';}
}
function formMetadata(){draft.material=draft.material||{};draft.material.type=$('#material-type').value;draft.material.thickness=$('#material-thickness').value;draft.material.thicknessUnit=kind==='panel'?'mm':draft.unit;draft.material.gauge=$('#material-gauge').value;draft.quantity=Number($('#production-quantity').value);draft.location=$('#production-location').value;draft.note=$('#production-note').value;if(colorSystem==='special')draft.finish={system:$('#special-color-system')?.value||'',code:$('#special-color-code')?.value||'',name:$('#special-color-name')?.value||'',selectionType:'custom',special:true};else draft.finish=currentFinish();if(preservedPanelMetadata?.id===editingItemId){draft.finish=copy(preservedPanelMetadata.finish);draft.material=copy(preservedPanelMetadata.material);}}
function renderFormMetadata(){const m=draft.material||{};if(kind==='panel'&&m.thickness!==''&&m.thickness!==null&&m.thickness!==undefined&&(m.thicknessUnit||draft.unit)!=='mm'){const parsed=M.parseMeasurement(m.thickness,m.thicknessUnit||draft.unit);if(parsed.ok){m.thickness=fmt(parsed.mm);m.thicknessUnit='mm';}}renderPanelMaterialControls();$('#material-type').value=m.type||(kind==='panel'||clientProfileWizard()?'':'aluminium');$('#material-thickness').value=m.thickness??'';$('#material-gauge').value=m.gauge||'';$('#production-quantity').value=draft.quantity||'';$('#production-quantity').min='1';$('#production-quantity').step='1';$('#production-quantity').required=true;$('#production-quantity').placeholder='Quantité';$('#production-location').value=draft.location||'';$('#production-note').value=draft.note||'';$('#cancel-piece-edit').hidden=!editingItemId;for(const el of document.querySelectorAll('.config-card>.config-section'))el.hidden=authoring;$('#add-production-piece').closest('.config-section').hidden=false;if(authoring){for(const child of $('#add-production-piece').closest('.config-section').children)child.hidden=!child.classList.contains('piece-submit');}else for(const child of $('#add-production-piece').closest('.config-section').children)child.hidden=false;}
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
 dialog(intent==='add'?'Ajouter la moulure à un bon de commande':intent?'Choisir le bon pour cette pièce':'Bons de commande en cours',
  (description?description+' · ':'')+'Entre un numéro pour créer un bon ou retrouver un bon enregistré sur cet appareil.',
  `<form id="mir-po-form" data-po-intent="${intent}" class="dialog-form"><label>Numéro du bon<input name="po" maxlength="100" list="mir-po-list" required placeholder="Ex. PO-2026-084"></label><datalist id="mir-po-list">${rows.filter(row=>row.poNumber).map(row=>`<option value="${esc(row.poNumber)}">${esc(row.project)}</option>`).join('')}</datalist><button class="primary-button" type="submit">${intent?'Ajouter à ce bon':'Ouvrir ce bon'}</button></form>`+
  (rows.length?`<ul class="mir-po-list">${rows.map(row=>`<li><button type="button" class="secondary-button" data-open-po="${esc(row.id)}" data-po-intent="${intent}"${intent&&!row.poNumber?' disabled':''}>${esc(row.poNumber||'Brouillon sans numéro')} · ${row.items.length} ligne(s)${row.project?' · '+esc(row.project):''}</button></li>`).join('')}</ul>`:''));
}

let pendingPOAfterSave=null;
/* Continuer ouvre trois destinations FINALES et ne crée jamais de côté.
 * Mesures, plis et couleurs restent disponibles sur une même page. */
function openContinueMenu(){
 if(client||kind!=='profile'||authoring||editingItemId)return false;
 formMetadata();
 const model=build();
 if(!model.valid||(draft.segments||[]).length<2){toast('Trace au moins deux côtés et corrige les cotes avant de continuer.');return false;}
 if(tool==='draw')freeformFinish();
 const measures=model.segments.map(segment=>esc(segment.label)+' '+esc(M.formatMeasurement(segment.lengthMM,model.unit))).join(' · ');
 const bends=(model.bends||[]).map((bend,index)=>esc(model.segments[index]?.label||'')+'→'+esc(model.segments[index+1]?.label||'')+' '+(bend.mode==='hem'?'180°':esc(Math.round(Number(bend.angle)*10)/10)+'°')).join(' · ');
 const note=model.complete?'Moulure prête pour la préparation du bon.':'Certaines informations de fabrication restent à vérifier avant la validation du bon.';
 dialog('Que veux-tu faire avec cette moulure ?',note,
   '<div class="mir-continue-summary"><strong>'+esc(model.name||'Moulure dessinée')+'</strong><p>'+measures+'</p><p>'+bends+'</p><p>Longueur : '+esc(M.formatMeasurement(model.lengthMM,model.unit))+' · Qté : '+esc(model.quantity||1)+'</p></div>'+
   '<label class="mir-continue-save-choice"><input id="mir-continue-save" type="checkbox" aria-label="Enregistrer aussi dans Mes pliages"> <span><strong>Enregistrer aussi dans Mes pliages</strong><small>Coche si tu veux réutiliser cette moulure. Les choix Boutique et Magasin sont conservés, sans publication automatique.</small></span></label>'+ 
   '<div class="mir-continue-actions" role="group" aria-label="Destination du pliage">'+
   '<button type="button" data-mir-continue-action="save"><strong>Enregistrer seulement</strong><small>Enregistrer ce pliage, sans créer de bon.</small></button>'+
   '<button type="button" data-mir-continue-action="existing"><strong>Ajouter à un bon existant</strong><small>Avec ou sans enregistrement dans Mes pliages.</small></button>'+
   '<button type="button" data-mir-continue-action="new"><strong>Créer un nouveau bon</strong><small>Avec ou sans enregistrement. Fournisseur, chantier et livraison ensuite.</small></button>'+
   '</div><p class="field-hint">Sans la case cochée, un bon ne crée jamais de fiche Mes pliages. Aucun bon n’est envoyé automatiquement.</p>'+
   '<div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Retour au dessin</button></div>');
 return true;
}
function existingPOChoice(){
 const rows=[order,...openOrders().filter(row=>row.id!==order.id)].filter(row=>String(row.poNumber||'').trim());
 if(!rows.length){
  dialog('Aucun bon existant','Aucun bon numéroté n’est disponible sur cet appareil.',
   '<p>Crée un bon sans perdre ton dessin.</p><div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Retour au dessin</button><button type="button" class="primary-button" data-mir-continue-action="new">Créer un nouveau bon</button></div>');
  return;
 }
 dialog('Choisir un bon existant','Choisis le bon à compléter. Mes pliages ne sera pas modifié.',
  '<div class="mir-continue-existing">'+rows.map(row=>'<button type="button" class="secondary-button" data-open-po="'+esc(row.id)+'" data-po-intent="add"><strong>'+esc(row.poNumber)+'</strong><small>'+esc(row.project||'Chantier à nommer')+' · '+row.items.length+' référence(s)</small></button>').join('')+
  '</div><div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Annuler</button></div>');
}
function createNewPOFromCurrent(){
 if(!switchWorkshopOrder(defaultOrder()))return;
 const count=order.items.length;
 addPiece();
 if(order.items.length>count)window.MIRProcurementUI?.openCreate?.({newOrder:true});
 else toast('Le bon reste brouillon : vérifie la quantité, les cotes et les paramètres avant de reprendre.');
}
function continueChoice(action){
 if(client||kind!=='profile'||authoring||editingItemId)return;
 if(!['save','existing','new'].includes(action))return;
 if(action==='save'){pendingPOAfterSave=null;saveTemplateDialog();return;}
 if($('#mir-continue-save')?.checked===true){
  // La forme est enregistrée EXPLICITEMENT avant d'ajouter une ligne au bon.
  // Annuler le dialogue de sauvegarde annule aussi l'ajout au bon.
  pendingPOAfterSave=action;
  saveTemplateDialog();
  return;
 }
 pendingPOAfterSave=null;
 if(action==='existing'){existingPOChoice();return;}
 closeDialog();
 createNewPOFromCurrent();
}
function finishPOChoice(intent){
 closeDialog();
 if(intent==='add'){const count=order.items.length;addPiece();if(order.items.length>count)window.MIRProcurementUI?.openCreate?.({newOrder:false});}
 if(intent==='transfer')offerProfileImport(true);
}
function publicClientDossier(){return client&&catalogueChannel!=='store';}
function configurePublicDossier(){
 $('#order-title').replaceChildren('Ma demande sur mesure ', $('#production-count'));
 $('#order-metadata-label').textContent='Projet et date souhaitée';
 $('#order-reference-label').textContent='Référence du projet (facultative)';
 $('#order-po').placeholder='Votre référence';
 $('#order-contact-label').textContent='Personne responsable (facultative)';
 $('#order-revision-field').hidden=true;
 $('#order-notes-label').textContent='Précisions pour MIR';
 $('#order-metadata-hint').textContent='Ces renseignements sont repris dans le PDF de votre demande.';
 $('#prepare-local-request').classList.replace('primary-button','secondary-button');
}
function updateOrderReference(){
 const box=$('#order-po-summary');
 const reference=String(order.poNumber||'').trim();
 box.textContent=reference?' · '+reference:publicClientDossier()?'':' · PO à préciser';
}
function renameFormMarkup(item,model){
 if(client||model.kind!=='profile')return '';
 const id=esc(item.id),name=esc(model.name);
 return '<form class="production-rename-form" data-rename-form="'+id+'" hidden>'+
  '<label>Nom de la moulure<input type="text" name="name" maxlength="140" required autocomplete="off" value="'+name+'" placeholder="Ex. Solin fenêtre avant"></label>'+
  '<div class="production-rename-actions"><button type="submit">Enregistrer le nom</button>'+
  '<button type="button" data-cancel-rename="'+id+'">Annuler</button></div></form>';
}
function renameButtonMarkup(item,model){
 if(client||model.kind!=='profile')return '';
 return '<button type="button" class="rename-piece" data-rename-piece="'+esc(item.id)+
  '" aria-label="Renommer la moulure '+esc(model.name)+'">✎ Renommer</button>';
}

/* Bon de commande : la quantité modifiée ici passe par le moteur de révisions.
 * Le cliché de fabrication et ses cotes restent synchronisés et sauvegardés. */
function setOrderItemQuantity(id,value){
 if(client||!activeWorkshopOrderMatches())return {ok:false,error:'Dossier indisponible ou modifié dans un autre onglet.'};
 const old=order.items.find(item=>item.id===id),quantity=Number(value);
 if(!old)return {ok:false,error:'Pièce introuvable dans le dossier.'};
 if(!Number.isSafeInteger(quantity)||quantity<1)return {ok:false,error:'Choisir une quantité entière supérieure à zéro.'};
 if(quantity===Number(old.spec?.quantity))return {ok:true,quantity,unchanged:true};
 const revised=M.reviseInstance({snapshot:old.snapshot,history:old.history||[]},{quantity});
 if(!revised.ok)return {ok:false,error:revised.errors?.map(error=>error.message).join(' ')||'Quantité invalide.'};
 const nextOrder={...order,items:order.items.map(item=>item.id!==id?item:{
  ...item,spec:copy(revised.spec),snapshot:copy(revised.snapshot),history:copy(revised.history),savedAt:new Date().toISOString()
 })};
 if(!store(KEYS.draft,{version:1,order:nextOrder}))return {ok:false,error:'Échec de sauvegarde du dossier.'};
 order=nextOrder;
 if(editingItemId===id){draft.quantity=quantity;const input=$('#production-quantity');if(input)input.value=quantity;}
 renderOrder();
 return {ok:true,quantity};
}
function renderOrder(){const validItems=order.items||[];
 updateOrderReference();
$('#order-head-count').textContent=String(validItems.length).padStart(2,'0');$('#production-count').textContent=String(validItems.length).padStart(2,'0');for(const [id,key] of [['order-project','project'],['order-po','poNumber'],['order-foreman','foreman'],['order-date','date'],['order-revision','revision'],['order-notes','notes']])$('#'+id).value=order[key]||'';
 const renderItem=item=>{const model=build(item.spec),geometryIssue=hasPanelGeometryIssue(item),snapshot=item.snapshot,thumb=publicClientDossier()&&model.kind==='profile'?diagramSVG(model,{small:true,interactive:false}):window.MIRMiniature?.render(model,M)||diagramSVG(model,{small:true,interactive:false});return `<article class="production-item" data-production-item="${esc(item.id)}"><div class="production-item-thumb">${thumb}</div><div class="production-item-info"><span class="production-item-label">${esc(item.id)}${snapshot?` · modèle V${snapshot.templateVersion} / pièce R${snapshot.revision}`:''}</span><h3>${esc(model.name)}</h3>${renameFormMarkup(item,model)}<p>${esc(model.kind==='profile'?model.segments.map(s=>s.label+' '+M.formatMeasurement(s.lengthMM,model.unit)).join(' · ')+' · L '+M.formatMeasurement(model.lengthMM,model.unit):M.formatMeasurement(model.widthMM,model.unit)+' × '+M.formatMeasurement(model.heightMM,model.unit)+' · C '+M.formatMeasurement(model.reliefMM,model.unit))}</p><p>${esc([model.finish.manufacturer||model.finish.system,model.finish.name||model.finish.code,model.location].filter(Boolean).join(' · '))}</p><span class="item-status${model.complete&&!geometryIssue?' complete':''}">${geometryIssue?'Géométrie à corriger':M.quotePolicy(item.spec).required?'Soumission obligatoire · couleur personnalisée':model.complete?'Renseignée · validation atelier':'Précisions à compléter'}</span>${linePriceMarkup(item.spec)}</div><label class="production-item-qty">Quantité<input data-item-quantity="${esc(item.id)}" type="number" min="1" step="1" value="${model.quantity||1}" aria-label="Quantité de la pièce ${esc(item.id)}"></label><div class="production-item-actions">${!client&&model.kind==='profile'?profileGroupControl(item):''}${renameButtonMarkup(item,model)}<button type="button" data-edit-piece="${esc(item.id)}">Modifier le dessin ↗</button><button type="button" data-duplicate-piece="${esc(item.id)}">Dupliquer</button><button type="button" class="remove-piece" data-remove-piece="${esc(item.id)}">Retirer</button></div></article>`;};
 if(!validItems.length)$('#production-items').innerHTML='<div class="production-empty"><strong>La bonne pièce commence ici.</strong><p>'+
  (publicClientDossier()?'Ajoutez une pièce pour préparer votre demande.':'Ajoutez vos pièces pour préparer leur dossier coté et leur bon de commande.')+'</p></div>';
 else if(client)$('#production-items').innerHTML=validItems.map(renderItem).join('');
 else{
  const byId=new Map(validItems.map(item=>[item.id,item]));
  const models=validItems.map(item=>({...build(item.spec),id:item.id}));
  $('#production-items').innerHTML=[...M.groupProfiles(models,profileGroupOverrides())].map(([family,models])=>
   `<section class="production-family"><h3>${esc(family)} <small>· ${models.length}</small></h3>${models.map(model=>renderItem(byId.get(model.id))).join('')}</section>`).join('');
 }
 const qty=validItems.reduce((n,item)=>n+(item.spec.quantity||0),0),pending=validItems.filter(item=>!build(item.spec).complete||hasPanelGeometryIssue(item)).length;$('#production-total').textContent=validItems.length?`${validItems.length} référence${validItems.length>1?'s':''} · ${qty} pièce${qty>1?'s':''}${pending?' · '+pending+' fiche'+(pending>1?'s':'')+' à compléter':''}`:'Votre dossier attend sa première pièce.';$('#production-json').disabled=!validItems.length;$('#production-pdf').disabled=!validItems.length||busy||invalidPanelItems().length>0;$('#prepare-local-request').hidden=!client;$('#prepare-local-request').disabled=!validItems.length||busy||invalidPanelItems().length>0;const pricing=dossierPricing();renderDossierPrice(pricing);const publicDossier=publicClientDossier();
 const pricedProfiles=publicDossier&&pricing.automaticPricingAllowed&&validItems.every(item=>item.kind==='profile');
 if(pricedProfiles)$('#prepare-local-request').hidden=true;
 $('#prepare-local-request').textContent=publicDossier
  ? (pricing.requiresQuote?'Préparer ma demande de soumission ici':'Préparer ma demande ici')
  : (pricing.requiresQuote?'Préparer ma demande de soumission ↗':'Préparer ma demande ↗');
 $('#production-pdf').textContent=publicDossier?(pricedProfiles?'Récapitulatif PDF ↓':'PDF de ma demande ↓'):pricing.requiresQuote?'Dossier de soumission PDF ↓':usesBendingSheet(pricing.requiresQuote)?'Bon de commande · Fiche PDF ↓':'Bon de commande PDF ↓';
 $('.document-status').textContent=pricing.requiresQuote?'Soumission obligatoire pour les pièces personnalisées':publicDossier?(pricedProfiles?'Prix calculé · fabrication à confirmer':'Demande à faire valider par MIR'):!client&&kind==='profile'?'Brouillon sur cet appareil':'Brouillon à valider';
 renderLayoutImport();
}
function renderLayoutImport(){
 const banner=$('#panel-layout-import');if(!banner)return;banner.hidden=true;if(client)return;
 const output=window.MIRPanelLayoutOutput;if(!output)return;
 let raw;try{raw=localStorage.getItem(output.STORAGE_KEY);}catch{return;}if(!raw)return;
 banner.hidden=false;
 try{
  const payload=JSON.parse(raw),preview=output.inspectImport(order,payload),transfer=preview.transfer;
  const sourceHref='calepinage.html#'+encodeURIComponent(transfer.zoneId),count=transfer.items.length;
  const otherRevision=(order.layoutImports||[]).some(row=>row.zoneId===transfer.zoneId&&row.id!==transfer.id);
  const status=preview.alreadyImported?'Les '+count+' panneaux sont déjà dans ce dossier. Aucun doublon créé.':'Les '+count+' panneaux sont prêts à importer ensemble, avec leurs repères et leurs vraies cotes.';
  const actions=preview.alreadyImported
   ?'<button type="button" id="open-panel-po" class="primary-button">Ouvrir le bon de commande de ces pièces →</button>'
   :'<button type="button" id="create-panel-po" class="primary-button"'+(layoutImportBusy||busy?' disabled':'')+'>Créer un bon avec les '+count+' panneaux →</button>'+
    '<button type="button" id="import-panel-layout" class="secondary-button"'+(layoutImportBusy||busy?' disabled':'')+'>Ajouter les '+count+' au dossier courant</button>';
  banner.innerHTML='<div class="mir-po-layout-journey">'+
   '<p class="eyebrow">VOTRE MUR → BON DE COMMANDE</p>'+
   '<h2>'+esc(transfer.name)+' · '+count+' panneaux</h2>'+
   '<p>'+esc(status)+'</p>'+
   '<p class="field-hint">1. Vérifier les pièces · 2. Choisir le fournisseur · 3. Enregistrer le bon PDF. Rien n’est envoyé automatiquement.</p>'+
   (otherRevision?'<p class="field-hint">Attention : une autre révision de cette zone figure au dossier. Elle sera conservée.</p>':'')+
   '<div class="piece-submit mir-po-layout-actions">'+actions+
   '<a class="text-link" href="'+esc(sourceHref)+'">Retour au mur et aux dimensions ↗</a></div></div>';
 }catch(error){banner.innerHTML='<strong>Mur à vérifier</strong><p>'+esc(error.message)+'</p><a class="text-link" href="calepinage.html">Revenir au tracé ↗</a>';}
}
async function importPanelLayout({startNew=false,openBon=false}={}){
 if(client||busy||layoutImportBusy)return;
 const output=window.MIRPanelLayoutOutput;if(!output)return;
 layoutImportBusy=true;renderLayoutImport();
 try{
  if(startNew){
   const raw=localStorage.getItem(output.STORAGE_KEY);
   if(!raw)throw Error('Le mur ne se trouve plus dans ce navigateur. Ouvre le calepinage.');
   const fresh=defaultOrder(),payload=JSON.parse(raw);
   output.inspectImport(fresh,payload);
   if((order.items.length||order.poNumber||order.project)&&!window.confirm('Créer un nouveau bon uniquement avec les panneaux de ce mur ? Le dossier en cours sera conservé séparément.'))return;
   if(!switchWorkshopOrder(fresh))return;
  }
  const perform=()=>output.importStored(localStorage,KEYS.draft,{fallbackOrder:order,expectedOrder:order});
  const result=globalThis.navigator?.locks?.request?await navigator.locks.request('mir-production-admin-dossier',perform):perform();
  if(!result.ok){toast(result.error||'Le calepinage n’a pas été ajouté.');return;}
  order=result.order;workflow='configure';authoring=false;editingItemId=null;
  render();
  const count=result.transfer?.items?.length||result.added;
  toast(result.alreadyImported?'Cette révision est déjà présente : aucun doublon ajouté.':count+' panneaux ajoutés ensemble au dossier.');
  if(openBon){
   if(!window.MIRProcurementUI?.openCreate?.({newOrder:false})){
    toast('Les panneaux sont enregistrés; ouvre Bons de commande pour choisir le fournisseur.');
    $('#production-order')?.scrollIntoView({behavior:'smooth',block:'start'});
   }
  }else if(!result.alreadyImported)$('#production-order')?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){toast('Les panneaux n’ont pas été ajoutés : '+error.message);}
 finally{layoutImportBusy=false;renderLayoutImport();}
}
function valuesFromDraft(spec,id){const measurements={};if(spec.kind==='profile'){if(spec.template==='custom')for(const s of spec.segments||[])measurements[s.label]=s.length;else Object.assign(measurements,spec.dimensions||{});measurements.length=spec.length;}else{for(const key of ['width','height','relief','lip','apexX','topWidth','topOffset','offset','tipDepth','apexOffset','roofPitch'])measurements[key]=spec[key];measurements.lips=copy(spec.lips||{});}return {id,instanceId:id,name:spec.name,unit:spec.unit,measurements,quantity:spec.quantity,material:copy(spec.material||{}),finish:{manufacturer:'',selectionType:null,hex:null,swatchUrl:null,swatchImage:null,source:null,availabilityNote:'',displayOnly:false,...copy(spec.finish||{})},length:spec.length,coloredFace:copy(spec.coloredFace||{}),mirrorX:spec.mirrorX===true,dimensionBasis:spec.dimensionBasis,bottomEdgeId:spec.bottomEdgeId,perforation:copy(spec.perforation||{}),lips:copy(spec.lips||{}),location:spec.location,note:spec.note};}
function makeItem(spec,id,{old=null,template=selectedTemplate}={}){let result;const stock=spec.kind==='profile'?stockLengthCheck(spec,old):{ok:true};if(!stock.ok)return {ok:false,errors:[{message:stock.message}]};if(old?.snapshot&&clientEditableTrace()){result=M.reviseProfileTrace({snapshot:old.snapshot,history:old.history||[]},spec,valuesFromDraft(spec,id));}else if(old?.snapshot){result=M.reviseInstance({snapshot:old.snapshot,history:old.history||[]},valuesFromDraft(spec,id));}else{let source=template;const created=M.createTemplate(spec,{id:source?.id||`modele-piece-${id}-${uid()}`,name:spec.name||source?.name,version:source?.version||1});if(!created.ok)return created;const structural=topology=>{const value=copy(topology);delete value.coloredFace;return JSON.stringify(value);};if(!source)source=created.template;else if(structural(source.topology)!==structural(created.template.topology)){if(client&&!source.id.startsWith('mir-standard-'))return {ok:false,errors:[{message:'La forme de ce modèle est fixe. Choisissez un autre modèle pour changer ses angles.'}]};const variant=M.createTemplate(spec,{id:source.id+'-variante-'+uid(),name:spec.name||source.name,version:1});if(!variant.ok)return variant;source=variant.template;}result=M.instantiateTemplate(source,valuesFromDraft(spec,id));}if(!result.ok)return result;return {ok:true,item:{id,...(clientEditableTrace()?{editableTrace:true}:{}),...(old?.legacyQuickId?{legacyQuickId:old.legacyQuickId}:{}),kind:result.model.kind,spec:copy(result.spec),snapshot:copy(result.snapshot),history:copy(result.history||[]),...(old?.profileGroup?{profileGroup:old.profileGroup}:{}),...(old?.sourceProfile?{sourceProfile:copy(old.sourceProfile)}:{}),...(old?.sourceLayout?{sourceLayout:copy(old.sourceLayout)}:{}),selection:{materialId,colorSystem,colorId,storeColorMode:client&&catalogueChannel==='store'&&activeStoreColorLock?'fixed':'employee'},...(spec.mirProfileId||old?.stockProfileType?{stockProfileType:spec.mirProfileId||old.stockProfileType}:{}),savedAt:new Date().toISOString()},model:result.model};}
function addPiece(){
 formMetadata();if(authoring)return saveTemplateDialog();
 if(!Number.isSafeInteger(draft.quantity)||draft.quantity<1)return toast('Indiquez une quantité entière supérieure à zéro.');
 if(clientProfileWizard()&&(clientStep!==5||Object.values(clientStepIssues(build(),false)).some(Boolean)))return;
 if(!client&&!activeWorkshopOrderMatches())return;
 // La saisie d'un bon reste optionnelle dans l'atelier de traçage admin.
 if(!availableForPO())return toast('Activez Bon de commande pour ce modèle dans Mes modèles.');
  const stock=kind==='profile'?stockLengthCheck():{ok:true};if(!stock.ok)return toast(stock.message);
 const imported=order.items.find(item=>item.id===editingItemId)?.sourceProfile;
 if(imported&&draft.template==='custom'){
   const previous=order.items.find(item=>item.id===editingItemId).spec;
   const dimensions=spec=>spec.segments.map(segment=>M.parseMeasurement(segment.length,spec.unit).mm);
   if(dimensions(previous).some((mm,i)=>Math.abs(mm-dimensions(draft)[i])>0.001||!Number.isFinite(dimensions(draft)[i]))||draft.note!==previous.note)
     return toast('Pour modifier les cotes ou la dérogation, reprenez la pièce dans Pliage.');
 }
 const model=build();
 if(!model.valid||kind==='panel'&&!window.MIRProductionVolume.buildMesh(model).valid)
   return toast(model.validation.errors?.[0]?.message||window.MIRProductionVolume.buildMesh(model).errors?.[0]?.message||'Vérifiez les dimensions de la pièce.');
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
 if(legacyQuickId)result.item.legacyQuickId=legacyQuickId;
 const nextOrder={...order,items:old?order.items.map(item=>item===old?result.item:item):[...order.items,result.item]};
 if(!old)nextOrder.nextNumber=(order.nextNumber||1)+1;
 if(!store(KEYS.draft,{version:1,order:nextOrder}))return;
 order=nextOrder;
 if(client&&kind==='profile')window.MIRUnifiedOrderCart?.upsert?.({id:`fold:${result.item.id}`,kind:'fold',quantity:result.item.spec.quantity,snapshot:copy(result.item.snapshot),line:{itemId:selectedTemplate?.id||result.item.snapshot?.templateId||result.item.id,name:result.model.name||'Pliage sur mesure',brand:'Atelier MIR',unit:'pièce',quantity:result.item.spec.quantity,dimensionsIn:copy(result.item.snapshot?.values?.measurements||{}),colorId:result.item.spec.finish?.code||'',specification:{kind:'fold',templateSnapshot:copy(result.item.snapshot?.templateSnapshot),instanceSnapshot:copy(result.item.snapshot)}}});
 if(clientProfileWizard()&&legacyQuickId){
  const oldQuick=read('mir-bending-v1',null);
  if(oldQuick?.version===1&&Array.isArray(oldQuick.items)){oldQuick.items=oldQuick.items.filter(item=>item.id!==legacyQuickId);store('mir-bending-v1',oldQuick);}
  legacyQuickId=null;
 }
 editingItemId=null;
 if(clientProfileWizard()){choose('profile','l');goClientStep(1);dialog('Pliage ajouté','Il reste dans votre commande pendant la suite du parcours.',`<div class="dialog-actions stacked"><button type="button" class="secondary-button" data-close-production-dialog>Choisir dans la banque de pliages</button><button type="button" class="secondary-button" data-new-client-custom>Ajouter un pliage sur mesure</button><a class="primary-button" href="chantier.html?view=orders">Vérifier ma commande</a></div>`);}
 else {renderOrder();renderFormMetadata();updateDrawing();}
 toast(old?'Nouvelle révision enregistrée. La version précédente reste conservée.':id+(client?' ajouté au dossier.':order.poNumber?' ajouté au bon.':' enregistré dans le dossier local.'));
}
function saveWorkspacePiece(){
 if(client||authoring)return false;
 if(tool==='draw')freeformFinish();
 const id=editingItemId||'M'+String(order.nextNumber||1).padStart(3,'0'),before=order;
 addPiece();
 if(order===before)return false;
 // Reattach the saved instance so another Save revises it instead of adding a duplicate.
 editingItemId=id;renderDimensions();renderProfileOptions();updateDrawing();return true;
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
function editPiece(id){panelDirectUndo=[];panelDirectRedo=[];const item=order.items.find(row=>row.id===id);if(!item)return;jException=null;activeStoreColorLock=!!(client&&catalogueChannel==='store'&&item.selection?.storeColorMode==='fixed');workflow='configure';authoring=false;editingTemplateId=null;editingItemId=id;activeDefaultLocks={};kind=item.kind;draft=copy(item.spec);preservedPanelMetadata=kind==='panel'?{id,finish:copy(draft.finish||{}),material:copy(draft.material||{})}:null;if(item.stockProfileType)draft.mirProfileId=item.stockProfileType;selectedTemplate=item.snapshot?.templateSnapshot||null;restoreSelection(item);tool='select';view='face';if(clientProfileWizard()){
 if(!publicProfileMaterials.includes(draft.material?.type)){
  draft.material={type:'',thickness:'',gauge:''};
  materialId='';
  colorId='';
  if(colorSystem==='manufacturer')draft.finish={};
 }
 if(!publicProfileColors.includes(colorSystem)){
  colorSystem='manufacturer';colorId='';draft.finish={};
 }
 clientProfileSelected=true;
 clientStep=clientUnlocked=2;
 draft.length=draft.length||unitValue(120*25.4,draft.unit);
 }render();$('.production-workspace').scrollIntoView({behavior:'smooth',block:'start'});toast(`${id} : la correction sera enregistrée comme une nouvelle révision.`);}
function reconcilePanelStageDOM(){
 // Les moulures doivent garder le dessin DIRECTEMENT dans la carte, comme
 // avant l'ajout des deux aperçus panneaux. Les événements du SVG suivent
 // l'élément déplacé, sans retirer aucun gestionnaire tactile/clavier.
 const stage=$('#production-drawing'),twin=$('#mir-panel-live-alt');
 if(!stage||!twin)return;
 const wrapper=stage.parentElement?.classList.contains('mir-panel-synced-views')?stage.parentElement:null;
 if(kind==='panel'){
  if(wrapper)return;
  const newWrapper=document.createElement('div');newWrapper.className='mir-panel-synced-views';
  stage.before(newWrapper);newWrapper.append(stage,twin);
 }else if(wrapper){
  // Le module Pliage ajoute son aperçu 3D juste après le dessin. Conserver
  // TOUS les enfants de la grille, pas seulement le dessin : autrement
  // l'aperçu 3D des quatre étapes mobiles est détruit à la sortie du wrapper.
  const parent=wrapper.parentElement;
  while(wrapper.firstChild)parent.insertBefore(wrapper.firstChild,wrapper);
  wrapper.remove();
 }
}
function render(){
 reconcilePanelStageDOM();
 const freeButton=$('#mir-draw-single-panel');if(freeButton)freeButton.hidden=kind!=='panel'||!!editingItemId||authoring;
 document.body.dataset.panelSync=String(kind==='panel');
 document.body.dataset.client=String(client);
 document.body.dataset.publicProduction=String(client&&catalogueChannel!=='store');
 const profileAdmin=!client&&kind==='profile';
 const previous=document.body.dataset.profileAdmin;
 document.body.dataset.profileAdmin=String(profileAdmin);
 if(previous!==String(profileAdmin)&&!client){
  $('.piece-finish').open=false;
  $('#order-metadata').open=!profileAdmin;
  $('#production-title').textContent=profileAdmin?'Créer une moulure':'Panneaux architecturaux';
  $('#production-eyebrow').textContent='ATELIER MIR';
  $('#production-description').textContent=profileAdmin?'Trace librement ta moulure, puis choisis si elle doit rejoindre la boutique.':'Tracez et configurez vos panneaux architecturaux sur mesure.';
 }document.querySelectorAll('[data-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kind===kind)));document.querySelectorAll('[data-workflow]').forEach(button=>button.setAttribute('aria-current',button.dataset.workflow===workflow?'page':'false'));$('#request-count').textContent=requests.length;const configure=workflow==='configure';for(const selector of ['.kind-bar','.template-section','.production-workspace'])$(selector).hidden=!configure;$('#production-order').hidden=!configure||authoring;$('#production-library').hidden=workflow!=='models';$('#production-requests').hidden=workflow!=='requests';$('#author-banner').hidden=!authoring||!configure;if(authoring)$('#author-banner').innerHTML=`<div><strong>Édition d’un modèle${editingTemplateId?' · nouvelle version':''}</strong><span>La forme et les angles sont définis ici. Les mesures de commande restent vides pour le client.</span></div><button type="button" data-cancel-author>Quitter les modèles</button>`;if(configure){renderTemplates();renderDimensions();renderProfileOptions();renderPanelOptions();renderFormMetadata();renderColors();updateDrawing();renderOrder();}if(workflow==='models')renderModels();if(workflow==='requests')renderRequests();}
function renderModels(){const records=templates.filter(record=>!record.archived&&latest(record)?.kind==='profile');$('#production-library').innerHTML=`<div class="library-heading"><div><p class="eyebrow">MES PLIAGES</p><h2>Mes pliages <em>enregistrés.</em></h2><p>Seuls les pliages enregistrés volontairement apparaissent ici. Une moulure envoyée directement à un bon de commande reste uniquement dans ce bon, sans fiche réutilisable.</p></div><div><button type="button" class="primary-button" data-new-model="profile">Nouveau pliage ＋</button></div></div><div class="mir-template-backup-actions"><button type="button" class="secondary-button" data-export-mir-models="1">Exporter mes modèles (JSON)</button><button type="button" class="secondary-button" data-import-mir-models="1">Importer une sauvegarde</button><input id="mir-template-backup-file" type="file" accept=".json,application/json" hidden aria-label="Fichier JSON de modèles MIR"></div><div class="local-scope-note"><strong>Bibliothèque des pliages enregistrés</strong><p><a class="text-link" href="gestion-boutique.html">Gérer la visibilité du catalogue public ↗</a></p><p>Chaque fiche est issue d’un enregistrement explicite. La sélection Boutique ou Magasin ne publie rien sans les validations prévues. Les commandes directes restent dans leurs bons.</p></div><div class="model-library-grid">${records.length?records.map(record=>{const t=latest(record),preview=M.templatePreview(t);return `<article class="model-library-card"><div class="model-preview">${preview.ok?(window.MIRMiniature?.render(preview.model,M)||diagramSVG(preview.model,{illustrative:true,small:true,interactive:false})):''}</div><div class="model-library-body"><span class="eyebrow">${t.kind==='profile'?'PLIAGE':'PANNEAU MÉTALLIQUE'} · VERSION ${t.version}</span><h3>${esc(t.name)}</h3><p>${t.fields.filter(f=>f.required).length} cotes requises · ${Object.values(record.measurementDefaults?.values||{}).filter(v=>String(v?.value??'').trim()).length} cote(s) préremplie(s) pour le magasin</p><p class="model-channels">${[record.channels?.client===true?'Boutique':'',record.channels?.store===true?'Magasin employés':'',record.channels?.po!==false?'Bon de commande':''].filter(Boolean).join(' · ')||'Usage interne'}</p><div class="model-actions"><button type="button" class="primary-button" data-use-saved-model="${esc(record.id)}">Remplir les cotes ↗</button><button type="button" class="plain-button" data-edit-model="${esc(record.id)}">Nouvelle version</button><button type="button" class="plain-button" data-archive-model="${esc(record.id)}">Retirer du catalogue</button></div></div></article>`;}).join(''):'<div class="production-empty"><strong>Aucun pliage enregistré pour le moment.</strong><p>Trace puis enregistre une moulure pour la retrouver ici. Les pièces ajoutées directement à un bon n’apparaissent pas dans cette liste.</p></div>'}</div>`;}
function beginAuthor(type,record=null){activeStoreColorLock=false;workflow='configure';authoring=true;editingItemId=null;activeDefaultLocks={};editingTemplateId=record?.id||null;kind=type;selectedTemplate=record?latest(record):null;if(record){const p=M.templatePreview(selectedTemplate);if(!p.ok){toast('Ce modèle est invalide.');return;}draft=copy(p.model.spec);draft.name=selectedTemplate.name;draft.kind=type;}else draft=sampleSpec(type,type==='profile'?'custom':'rectangle');tool='select';view='face';drawPoints=[];render();$('.production-workspace').scrollIntoView({behavior:'smooth',block:'start'});}
function useSavedTemplate(id){const record=templates.find(r=>r.id===id);if(!visibleTemplate(record)){toast('Ce modèle n’est pas proposé dans ce catalogue.');return;}
const storeColorResult=client&&catalogueChannel==='store'
 ?window.MIRStoreColorPolicy?.resolve(record.storeColor,materials)
 :{ok:true,locked:false};
if(!storeColorResult?.ok)return toast(storeColorResult?.error||'Le choix de couleur du magasin est indisponible.');
if(storeColorResult.locked&&!window.MIRBendingFinishes.forMetal(materials,storeColorResult.metalType).some(item=>item.id===storeColorResult.materialId))
 return toast('La couleur fixée ne correspond pas au métal du fabricant. Demande une correction du modèle à l’admin.');
const t=latest(record),defaults=window.MIRModelDefaults?.prepare(t,record.measurementDefaults);
if(defaults&&!defaults.ok){toast(defaults.errors.join(' '));return;}
const blank=M.instantiateTemplate(t,{unit:'in',measurements:defaults?.measurements||{},length:defaults?.length||'',quantity:1,material:{type:record.allowed?.materials?.[0]||'aluminium'},finish:{},bottomEdgeId:'bottom',perforation:{enabled:false},coloredFace:{side:'',segmentId:'A'}});
activeDefaultLocks=client&&catalogueChannel==='store'?(defaults?.locks||{}):{};
workflow='configure';authoring=false;editingTemplateId=null;editingItemId=null;selectedTemplate=t;draft=copy(blank.spec||blank.model?.spec||{});draft.kind=t.kind;kind=t.kind;if(kind==='profile')draft.length=String(stockLengthIn(draft)*(draft.unit==='mm'?25.4:1));draft.name=t.name;draft.perforation=draft.perforation||{enabled:false,details:''};draft.lips=draft.lips||{};colorSystem=record.allowed?.colorSystems?.[0]||'manufacturer';colorId='';view='face';tool='select';if(clientProfileWizard()){
 colorSystem=publicProfileColors.find(value=>!record.allowed?.colorSystems?.length||record.allowed.colorSystems.includes(value))||'manufacturer';

 clientProfileSelected=true;
 clientStep=clientUnlocked=1;
 draft.length=draft.length||String(stockLengthIn(draft)*(draft.unit==='mm'?25.4:1));
 draft.material.type='';
 materialId='';
 }
activeStoreColorLock=!!storeColorResult.locked;
if(activeStoreColorLock){
 draft.material.type=storeColorResult.metalType;
 colorSystem='manufacturer';
 materialId=storeColorResult.materialId;
 colorId=storeColorResult.colorId;
}else if(client&&catalogueChannel==='store'&&record.allowed?.colorSystems?.includes('manufacturer')){
 colorSystem='manufacturer';materialId='';colorId='';
}
render();applyTemplateOptions(record);if(clientProfileWizard())goClientStep(2,{confirm:true});}
function applyTemplateOptions(record){const allowed=record?.allowed;if(!allowed)return;for(const opt of $('#material-type').options)opt.disabled=!!opt.value&&!!allowed.materials?.length&&!allowed.materials.includes(opt.value);for(const opt of $('#color-system').options)opt.disabled=allowed.colorSystems?.length?!allowed.colorSystems.includes(opt.value):false;}
function saveTemplateDialog(){const old=templates.find(record=>record.id===editingTemplateId),current=old?latest(old):null;
 const detected=window.MIRProfileRecognition?.recognize(build());
 const suggestedName=draft.name&&!['Profil dessiné','Profil personnalisé','Mon modèle MIR'].includes(draft.name)?draft.name:detected?.suggestedName||'Moulure dessinée';
 const boutiqueChecked=document.querySelector('#mir-freeform-client-toggle')?.checked===true;
 const storeChecked=document.querySelector('#mir-freeform-store-toggle')?.checked===true;
 const provisional=M.createTemplate(draft,{name:suggestedName});
 const model=build();
 const previewModel=model.valid?model:(provisional.template?M.templatePreview(provisional.template).model:null);
 const preview=previewModel?.valid?`<figure class="save-template-preview" aria-label="Repères du modèle"><figcaption>Repère tes côtés sur le dessin</figcaption>${diagramSVG(previewModel,{illustrative:true,interactive:false})}</figure>`:'';
 const fields=provisional.template?.fields||current?.fields||[];
 const fieldRows=fields.map(field=>{
  const saved=old?.measurementDefaults?.values?.[field.key]||{};
  return `<div class="mir-default-row"><label>${esc(field.label)}<input name="mir-default-${esc(field.key)}" inputmode="decimal" placeholder="Laisser vide" value="${esc(saved.value??'')}"></label><label class="mir-default-lock"><input type="checkbox" name="mir-lock-${esc(field.key)}"${saved.locked===true?' checked':''}>Verrouiller</label></div>`;
 }).join('');
 const oldStoreMode=old?.storeColor?.mode==='fixed'?'fixed':'employee';
 const savedColorName=old?.storeColor?.colorName||currentFinish().name||currentFinish().code||'la couleur choisie au dessin';
 const storeColorChoices=`<section class="mir-store-color-choice" data-mir-store-color-choice${old?.channels?.store===true||storeChecked?'':' hidden'}><strong>Couleur au Magasin</strong><label class="check-field"><input type="radio" name="storeColorMode" value="employee"${oldStoreMode==='employee'?' checked':''}>L’employé choisit la teinte dans le nuancier du fabricant</label><label class="check-field"><input type="radio" name="storeColorMode" value="fixed"${oldStoreMode==='fixed'?' checked':''}>Conserver la couleur exacte : ${esc(savedColorName)}</label><p class="field-hint">Aucun équivalent entre marques n’est supposé. Une teinte fixe doit appartenir au métal et au nuancier choisis.</p></section>`;
 dialog(current?'Nouvelle version de la moulure':'Enregistrer cette moulure','La forme dessinée est conservée avec ses angles. La boutique est facultative; aucune vente ni publication serveur automatique.',`${preview}<form class="dialog-form" id="save-production-template"><label>Nom de la moulure<input name="name" maxlength="140" value="${esc(current?.name||suggestedName)}" required></label><label>Description<textarea name="description" rows="2" maxlength="500" placeholder="À quoi sert cette moulure ?">${esc(current?.description||'')}</textarea></label><fieldset><legend>Matières proposées</legend><div class="choice-checks">${[['aluminium','Aluminium'],['acier','Acier'],['acier-inoxydable','Inox']].map(([id,label])=>`<label class="check-field"><input type="checkbox" name="materials" value="${id}"${(old?.allowed?.materials||['aluminium','acier']).includes(id)?' checked':''}>${label}</label>`).join('')}</div></fieldset><fieldset><legend>Références de couleur proposées</legend><div class="choice-checks">${[['manufacturer','Nuancier fabricant'],['ral','RAL Classic'],['special','Référence spéciale']].map(([id,label])=>`<label class="check-field"><input type="checkbox" name="colorSystems" value="${id}"${(old?.allowed?.colorSystems||['manufacturer','ral','special']).includes(id)?' checked':''}>${label}</label>`).join('')}</div></fieldset><div class="choice-checks"><label class="check-field"><input type="checkbox" name="client"${old?.commercial?.wantsClient===true||old?.channels?.client===true||boutiqueChecked?' checked':''}>Boutique client (prix et publication partagée à valider)</label><label class="check-field"><input type="checkbox" name="store"${old?.channels?.store===true||storeChecked?' checked':''}>Magasin (commandes employés)</label><label class="check-field"><input type="checkbox" name="po"${old?.channels?.po!==false?' checked':''}>Bon de commande</label></div>${storeColorChoices}<fieldset class="mir-standard-measures"><legend>Mesures standards du magasin</legend><p class="field-hint">En pouces. Laissez vide pour une mesure à renseigner; cochez « Verrouiller » pour une cote fixe chez les employés. Ces réglages restent sur cet appareil tant que le portail partagé n'est pas activé.</p>${fieldRows}</fieldset><p class="field-hint">Nouveau modèle privé par défaut sur cet appareil : cochez un canal seulement si vous souhaitez l’y proposer. Les anciennes demandes conservent leurs dessins et leurs cotes.</p>${window.MIRDirectModelSave?.available&&kind==='profile'?'<fieldset><legend>Enregistrement</legend><label><input type="radio" name="saveTarget" value="shared" checked> Enregistrer un brouillon dans le catalogue partagé</label><label><input type="radio" name="saveTarget" value="local"> Garder uniquement sur cet appareil</label><p>La copie locale est conservée. Les prix et destinations se confirment dans l’espace partagé.</p></fieldset>':''}<p id="production-dialog-error" class="dialog-error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Annuler</button><button type="submit" class="primary-button">Enregistrer le pliage</button></div></form>`);}
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
 const pricing=dossierPricing(),quote=pricing.requiresQuote,bending=usesBendingSheet(quote),publicDossier=publicClientDossier();
 busy=true;renderOrder();
 const status=$('#production-export-status');
 status.textContent=quote?'Préparation du dossier de soumission…':'Préparation du PDF…';
 try{
  const pages=M.productionPages({...order,items:order.items.map(item=>item.snapshot||item.spec)},publicDossier?{document:'client-request',bendTariff}:bending?{layout:'bending-sheet',profileGroups:profileGroupOverrides()}:undefined);
  const profilesOnly=publicDossier&&order.items.every(item=>item.kind==='profile');
  const prefix=quote?'MIR-demande-soumission-':publicDossier?(profilesOnly?(pricing.automaticPricingAllowed?'MIR-recapitulatif-pliage-':'MIR-demande-pliage-'):'MIR-demande-sur-mesure-'):bending?'MIR-mise-en-production-':'MIR-bon-production-';
  const result=await window.MIRPDF.exportPlan({
   faces:pages,title:publicDossier?'MIR — '+pages[0].documentTitle:quote?'MIR — Demande de soumission':bending?'Mise en production':'MIR — Dossier de fabrication',
   subtitle:order.project||(publicDossier?'Pièces sur mesure · validation par MIR':'Pièces sur mesure · dossier à valider'),
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
function unlockCustom(){if((client&&!clientProfileWizard())||(editingItemId&&!clientEditableTrace())){toast('Cette pièce conserve la forme de son modèle. Modifiez les cotes ou créez un nouveau modèle.');return false;}const model=build();if(!model.valid){toast('Complétez les cotes de section pour modifier sa forme.');return false;}if(draft.template!=='custom'){draft={...draft,template:'custom',segments:model.segments.map(s=>({label:s.label,name:s.name,length:fmt(unitValue(s.lengthMM,draft.unit))})),bends:model.bends.map(b=>({mode:b.mode,angle:b.angle,direction:b.direction})),startAngle:model.segments[0].headingDeg};delete draft.dimensions;}return true;}
function doubleFoldDialog(){
 if((client&&!clientProfileWizard())||(editingItemId&&!clientEditableTrace()))return toast('Créez une nouvelle version du modèle pour modifier sa forme.');
 const model=build();if(!model.valid)return toast('Renseignez la section avant d’ajouter deux plis.');
 dialog('Ajouter deux plis consécutifs',
  'Choisissez les cotes et le sens de chaque pli en touchant ou cliquant sur le dessin. Ces deux plis sont différents d’un retour écrasé de 180°.',
  `<form id="double-fold-form" class="dialog-form">
   <label>Côté à remplacer<select name="segmentIndex">${model.segments.map((segment,i)=>`<option value="${i}">${esc(segment.label+' · '+M.formatMeasurement(segment.lengthMM,model.unit))}</option>`).join('')}</select></label>
   <div class="three-fields">
   <label>Avant le premier pli<input name="beforeLength" inputmode="decimal" required></label>
   <label>Entre les deux plis<input name="betweenLength" inputmode="decimal" required></label>
   <label>Après le second pli<input name="afterLength" inputmode="decimal" required></label>
   </div>
   <label>Angle intérieur du pli 1 (°)<input name="firstAngle" type="number" value="90" min="0.1" max="180" step="any" required></label>
   ${bendChoiceMarkup('firstDirection','left',90,{legend:'Sens du premier pli'})}
   <label>Angle intérieur du pli 2 (°)<input name="secondAngle" type="number" value="90" min="0.1" max="180" step="any" required></label>
   ${bendChoiceMarkup('secondDirection','right',90,{legend:'Sens du deuxième pli'})}
   <p class="field-hint">Schémas du sens des angles, sans modification des cotes. ${authoring?'Proportions illustratives : aucune cote de commande ne sera publiée.':'Mesures de pièce finie en '+(draft.unit==='mm'?'millimètres':'pouces')+'.'}</p>
   <p id="production-dialog-error" class="dialog-error" role="alert"></p>
   <div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Annuler</button><button type="submit" class="primary-button">Ajouter les deux plis</button></div>
  </form>`);
 const form=$('#double-fold-form');
 for(const prefix of ['first','second']){
  const input=form.elements.namedItem(prefix+'Angle');
  input?.addEventListener('input',()=>{
   form.querySelectorAll('[data-bend-pick="'+prefix+'Direction"] [data-bend-icon]').forEach(icon=>{icon.innerHTML=bendTurnSketch(icon.dataset.bendIcon,input.value);});
  });
 }
}
/* Seul le SVG du tableau produit des nouveaux côtés. La sortie du
 * tableau annule le geste, y compris avec la capture du pointeur tactile. */
function drawingCanvasHit(event,{targetRequired=true}={}){
 const stage=$('#production-drawing'),svg=stage?.querySelector('svg');
 if(!svg||!Number.isFinite(event?.clientX)||!Number.isFinite(event?.clientY))return false;
 if(targetRequired&&event.target?.closest?.('svg')!==svg)return false;
 const box=svg.viewBox?.baseVal,x0=box?.x??0,y0=box?.y??0,w=box?.width||800,h=box?.height||520;
 let x,y;
 if(svg.createSVGPoint&&svg.getScreenCTM){
  const ctm=svg.getScreenCTM();if(!ctm)return false;
  try{const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const q=p.matrixTransform(ctm.inverse());x=q.x;y=q.y;}catch{return false;}
 }else{
  const rect=svg.getBoundingClientRect(),scale=Math.min(rect.width/w,rect.height/h);
  if(!Number.isFinite(scale)||scale<=0)return false;
  x=(event.clientX-rect.left-(rect.width-w*scale)/2)/scale+x0;
  y=(event.clientY-rect.top-(rect.height-h*scale)/2)/scale+y0;
 }
 return x>=x0&&x<=x0+w&&y>=y0&&y<=y0+h;
}
function localPoint(event, useGrid=snap){const svg=$('#production-drawing svg'),tr=drawTransform;if(!svg||!tr||!drawingCanvasHit(event,{targetRequired:false}))return null;let x,y;if(svg.createSVGPoint&&svg.getScreenCTM){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const matrix=svg.getScreenCTM();if(!matrix)return null;const q=p.matrixTransform(matrix.inverse());x=q.x;y=q.y;}else{const r=svg.getBoundingClientRect();if(!r.width||!r.height)return null;const scale=Math.min(r.width/800,r.height/520);x=(event.clientX-r.left-(r.width-800*scale)/2)/scale;y=(event.clientY-r.top-(r.height-520*scale)/2)/scale;}let result=[(x-tr.ox)/tr.scale,(tr.oy-y)/tr.scale];if(useGrid){const step=traceGridStepMM();result=result.map(v=>Math.round(v/step)*step);}return result;}
function canDrawProfile(){
 return kind==='profile'&&tool==='draw'&&view==='face'&&(!client||clientProfileWizard()&&clientStep===1)&&(!editingItemId||clientEditableTrace());
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
 const step=snap?traceGridStepMM():draft.unit==='mm'?1:25.4/16;
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
 const label=(x,y,value,halo=6)=>`<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(17*scale)}" font-weight="700" fill="#603b20" stroke="#fff5e3" stroke-width="${fmt(halo*scale)}" stroke-linejoin="round" paint-order="stroke">${esc(value)}</text>`;
 const size=Math.hypot(ex-x,ey-y), outgoing=Math.atan2(ey-y,ex-x);
 const normal=[-Math.sin(outgoing),Math.cos(outgoing)];
 // La cote suit le côté sans recouvrir le trait, les badges B/C ou l'angle.
 // Sur les petits écrans, un décalage normal est indispensable puisque le
 // texte de fraction est souvent plus large que le segment affiché.
 const measureGap=30*scale;
 const measureT=size<150*scale?.68:.56;
 const measurePoint=[
  x+(ex-x)*measureT+normal[0]*measureGap,
  y+(ey-y)*measureT+normal[1]*measureGap
 ];
 let angle='';
 if(segment.angle>0&&segment.angle<180){
  const incoming=Math.PI-gesture.heading;
  const sweep=Math.atan2(Math.sin(outgoing-incoming),Math.cos(outgoing-incoming));
  const r=Math.min(38*scale,size*.36), mid=incoming+sweep/2;
  const ray=(direction,distance)=>[x+Math.cos(direction)*distance,y+Math.sin(direction)*distance];
  const [ax,ay]=ray(mid,r+9*scale);
  angle=`<path d="M ${ray(incoming,r).map(fmt).join(' ')} A ${fmt(r)} ${fmt(r)} 0 0 ${sweep>=0?1:0} ${ray(outgoing,r).map(fmt).join(' ')}" fill="none" stroke="#9c5a22" stroke-width="2"/>`+label(ax,ay,segment.angle+'°',2.5);
 }
 const line=`<line x1="${fmt(x)}" y1="${fmt(y)}" x2="${fmt(ex)}" y2="${fmt(ey)}" stroke="#9c5a22" stroke-width="3" stroke-dasharray="8 6" vector-effect="non-scaling-stroke"/>`;
 const guide=segment.guide?pointOnView(segment.guide,drawTransform):null;
 const alignment=guide?`<line x1="${fmt(guide[0])}" y1="${fmt(guide[1])}" x2="${fmt(ex)}" y2="${fmt(ey)}" stroke="#517e48" stroke-width="2" stroke-dasharray="4 5" vector-effect="non-scaling-stroke"/>`:'';
 const content=`<g data-trace-preview pointer-events="none">${alignment}${line}${angle}${label(measurePoint[0],measurePoint[1],segment.lengthLabel)}</g>`;
 const marker=svg.querySelector('.profile-side-marker');
 if(marker)marker.insertAdjacentHTML('beforebegin',content);
 else svg.insertAdjacentHTML('beforeend',content);
}
function traceShift(event){
 if(event.key!=='Shift'||drag?.type!=='trace'||!drag.last)return;
 drag.last={...drag.last,shiftKey:event.shiftKey};
 drawDragPreview(draggedSegment(drag.last,drag),drag);
}
function viewCursorPoint(event){
 const svg=$('#production-drawing svg');if(!svg)return null;
 if(svg.createSVGPoint&&svg.getScreenCTM){
  const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
  const matrix=svg.getScreenCTM();
  if(matrix){const v=p.matrixTransform(matrix.inverse());return [v.x,v.y];}
 }
 const r=svg.getBoundingClientRect();
 return r.width&&r.height?[(event.clientX-r.left)*800/r.width,(event.clientY-r.top)*520/r.height]:null;
}
function beginPointDrag(event){
 if(event.target.closest("[data-edit-panel-measure],[data-edit-panel-edge]"))return;
 const stage=$('#production-drawing');if(!stage.contains(event.target))return;
 if(tool==='panel-trace'&&kind==='panel'&&event.isPrimary&&(event.button===0||event.pointerType==='touch')){
  const pt=panelSketchHit(event);if(!pt)return;
  drag={type:'panel-sketch',id:event.pointerId,start:pt,x:event.clientX,y:event.clientY,hadBefore:panelSketchPoints.length>0};
  stage.setPointerCapture?.(event.pointerId);event.preventDefault();return;
 }
 if(canDrawProfile()&&drawingCanvasHit(event)&&event.button===0&&event.isPrimary){
  suppressClick=false;
  const start=drawPoints.at(-1)||localPoint(event);
  if(!start)return;
  const prior=drawPoints.length>=3?build().segments.at(-1)?.headingDeg:undefined;
  const before=drawPoints.at(-2);
  const heading=finite(prior)?prior*Math.PI/180:before?Math.atan2(start[1]-before[1],start[0]-before[0]):undefined;
  drag={type:'trace',id:event.pointerId,x:event.clientX,y:event.clientY,start,heading,moved:false};
  if(event.pointerType==='touch')stage.setPointerCapture?.(event.pointerId);
  return;
 }

 if(kind==='panel'||(view==='volume'&&event.pointerType==='touch')||(!client&&kind==='profile'&&view==='face'&&tool==='select'&&event.pointerType==='touch')){
  if(pointers.size>=2)return;
  pointers.set(event.pointerId,[event.clientX,event.clientY]);stage.setPointerCapture?.(event.pointerId);
  if(pointers.size===2){const a=[...pointers.values()];drag={type:'pinch',distance:Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1]),zoom};event.preventDefault();return;}
 }
 if(!client&&kind==='profile'&&view==='face'&&tool==='select'&&
   (event.button===0||event.pointerType==='touch')&&
   !event.target.closest('[data-toggle-painted-face]')){
  const at=viewCursorPoint(event);
  if(at){drag={type:'pan',id:event.pointerId,x:at[0],y:at[1],
   originX:viewPan.x,originY:viewPan.y,moved:false};return;}
 }
 if(view==='volume'){drag={type:'orbit',id:event.pointerId,x:event.clientX,y:event.clientY,orbit,pitch,moved:false};stage.setPointerCapture?.(event.pointerId);return;}
 const circle=event.target.closest('[data-draw-point]');if(circle&&tool==='edit'&&!client&&!editingItemId){event.preventDefault();const model=build();if(!model.valid)return;drawPoints=copy(model.pointsMM);drawTransform=fitModel(model);drag={type:'point',index:Number(circle.dataset.drawPoint),pointerId:event.pointerId,moved:false};stage.setPointerCapture?.(event.pointerId);}
}

function movePoint(event){
 if(drag?.type==='panel-sketch'){
  if(event.pointerId!==drag.id)return;
  const pt=panelSketchHit(event);if(!pt)return;
  panelSketchHover=window.MIRPanelSketch.orthogonal(panelSketchPoints.at(-1),pt,event.shiftKey);
  updateDrawing({keepForm:true});event.preventDefault();return;
 }
 if(pointers.has(event.pointerId))pointers.set(event.pointerId,[event.clientX,event.clientY]);
 if(!drag)return;
 if(drag.type==='pan'){
  if(event.pointerId!==drag.id)return;
  const p=viewCursorPoint(event);if(!p)return;
  const dx=p[0]-drag.x,dy=p[1]-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)<5)return;
  drag.moved=true;viewPan={x:Math.max(-650,Math.min(650,drag.originX+dx)),
   y:Math.max(-650,Math.min(650,drag.originY+dy))};
  $('#production-drawing').dataset.moving='true';
  updateDrawing({keepForm:true});event.preventDefault();return;
 }
 if(drag.type==='trace'){
  if(event.pointerId!==drag.id)return;
  if(!drawingCanvasHit(event,{targetRequired:false})){drawDragPreview(null,drag);return;}
  if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<4)return;
  if(!drag.moved)$('#production-drawing').setPointerCapture?.(event.pointerId);
  drag.moved=true;
  drag.last={clientX:event.clientX,clientY:event.clientY,shiftKey:event.shiftKey};
  drawDragPreview(draggedSegment(drag.last,drag),drag);
  return;
 }
 if(drag.type==='pinch'){const a=[...pointers.values()];if(pointers.has(event.pointerId)&&a.length===2&&drag.distance>0){event.preventDefault();setZoom(drag.zoom*Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1])/drag.distance);}return;}
 if(drag.type==='orbit'){if(event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.moved=drag.moved||Math.hypot(dx,dy)>3;orbit=drag.orbit+dx*.55;pitch=Math.max(-85,Math.min(85,drag.pitch+dy*.3));updateDrawing({keepForm:true});return;}
 const p=localPoint(event);if(!p)return;drawPoints[drag.index]=p;const spec=toCustom(drawPoints);if(spec){draft=spec;drag.moved=true;updateDrawing({keepForm:true});}
}

function endPoint(event){
 const tracked=pointers.delete(event.pointerId);const stage=$('#production-drawing');
 if(drag?.type==='panel-sketch'){
  if(event.pointerId!==drag.id)return;
  const previous=drag;const endpoint=panelSketchHit(event),moved=Math.hypot(event.clientX-previous.x,event.clientY-previous.y)>8;
  if(stage.hasPointerCapture?.(event.pointerId))stage.releasePointerCapture(event.pointerId);
  drag=null;panelSketchHover=null;suppressClick=true;
  if(event.type==='pointerup'&&endpoint){
   if(!previous.hadBefore&&moved)panelSketchPoints.push(previous.start);
   const point=window.MIRPanelSketch.orthogonal(panelSketchPoints.at(-1),endpoint,event.shiftKey);
   appendPanelSketchPoint(point);
  }else updateDrawing();
  return;
 }
 if(stage.hasPointerCapture?.(event.pointerId))stage.releasePointerCapture(event.pointerId);
 if(drag?.type==='pan'){
  if(event.pointerId!==drag.id)return;
  const moved=drag.moved;drag=null;stage.dataset.moving='false';suppressClick=moved;
  if(moved)updateDrawing({keepForm:true});
  return;
 }
 if(drag?.type==='trace'){
  if(event.pointerId!==drag.id)return;
  const gesture=drag;
  drag=null;
  drawDragPreview(null,gesture);
  if(event.type!=='pointerup'||!canDrawProfile()||!drawingCanvasHit(event,{targetRequired:false})){suppressClick=true;return;}
  if(!gesture.moved){
   if(event.pointerType==='touch'){const point=localPoint(event);if(point)appendTracePoint(point);suppressClick=true;}
   return;
  }
  suppressClick=true;
  const segment=draggedSegment(event,gesture);
  if(segment)appendTracePoint(segment.point,gesture.start);
  return;
 }
 if(drag?.type==='pinch'){
  if(!tracked)return;
  const [remaining]=pointers;
  drag=remaining&&view==='volume'
   ?{type:'orbit',id:remaining[0],x:remaining[1][0],y:remaining[1][1],orbit,pitch,moved:true}
   :null;
  suppressClick=true;
  return;
 }
 if(drag?.type==='orbit'&&drag.id!==event.pointerId)return;
 if(!drag)return;const moved=drag.type==='point'&&drag.moved;
 suppressClick=!!drag.moved;drag=null;
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
 // La refonte admin place les cotes dans un accordéon fermé sur mobile.
 // Le titre historique est masqué; diriger l'action vers un vrai champ visible.
 const group=$('#mir-v4-dimensions');
 if(group&&group.tagName==='DETAILS')group.open=true;
 const target=bendIndex===undefined
  ?$('#production-dimensions input:not(:disabled)')||$('#production-unit')||$('#configure-heading')
  :$('[data-angle-details="'+bendIndex+'"] summary');
 if(!target)return;
 if(window.MirWorkspace?.active)window.MirWorkspace.openInspector(target);
 if(bendIndex!==undefined)target.parentElement.open=true;
 target.scrollIntoView?.({behavior:'smooth',block:'center'});
 target.focus();
}

/* Both options use the same section and rounded strips as the live 3D view.
   Align their supporting edge, then fit them together to keep a fixed camera. */
function hemChoiceCaption(direction,atStart=false){
 // The detail camera looks at the supporting flange in the direction of the edge.
 // At the start, it is the supporting flange that moves through the bend.
 return (direction==='left')!==atStart?'Repli au-dessus':'Repli au-dessous';
}
const hemDirections=['left','right'];
function hemChoicePreviews(specs,atStart=false,index=null){
 const width=218,height=128;
 const project=([x,y],z)=>[x+z*.48,-y-z*.28];
 const eye=[.48,.28];
 const corners=({a,b},length)=>[project(a,0),project(b,0),project(b,length),project(a,length)];
 const candidates=specs.map(spec=>{
  if(!spec)return null;
  const model=build(spec);
  if(!model.valid)return null;
  const {minX,maxX,minY,maxY}=model.bbox;
  const span=Math.max(maxX-minX,maxY-minY,32);
  // Visually open the hem in this small illustration; the part's measurements stay intact.
  const radius=Math.max(profileHemRadius(model),Math.min(5,span*.035));
  const strips=profileVolumeStrips(model,radius);
  const bendIndex=index??(atStart?0:model.bends.length-1);
  const support=strips.find(s=>s.segmentIndex===bendIndex+(atStart?1:0)&&!s.rounded);
  if(!support)return null;
  const joint=atStart?support.a:support.b;
  const axis=support.b.map((b,i)=>(b-support.a[i])*(atStart?-1:1));
  const length=Math.hypot(...axis)||1;
  const [ux,uy]=axis.map(v=>v/length);
  const align=([x,y])=>{
   x-=joint[0];y-=joint[1];
   return [x*ux+y*uy,y*ux-x*uy];
  };
  const whole=strips.map(s=>({...s,a:align(s.a),b:align(s.b)}));
  const edge=whole.filter(s=>s.segmentIndex===bendIndex&&s.rounded||
   s.segmentIndex===bendIndex+(atStart?0:1)&&!s.rounded);
  return {whole,edge,sample:Math.min(model.lengthMM||254,span*.62)};
 });
 const valid=candidates.filter(Boolean);
 const unavailable='<span class="mir-hem-invalid">Aperçu indisponible. Vérifiez les cotes.</span>';
 if(!valid.length)return specs.map(()=>unavailable);
 const sample=valid[0].sample;
 const all=valid.flatMap(c=>c.whole.flatMap(s=>corners(s,sample)));
 const [[minX,maxX],[minY,maxY]]=[0,1].map(i=>[Math.min(...all.map(p=>p[i])),Math.max(...all.map(p=>p[i]))]);
 const scale=Math.min((width-28)/Math.max(1,maxX-minX),(height-22)/Math.max(1,maxY-minY));
 const pixel=([x,y])=>[fmt(width/2+(x-(maxX+minX)/2)*scale),fmt(height/2+(y-(maxY+minY)/2)*scale)].join(',');
 return candidates.map((candidate,i)=>{
  if(!candidate)return unavailable;
  const gradient='mir-hem-metal-'+uid();
  const volume=orderProfileStrips(candidate.whole,eye).map(s=>{
   const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1];
   const litSide=dx*eye[1]-dy*eye[0]>0;
   const tone=Math.round((litSide?166:136)+56*Math.abs(dx+dy*.55)/(Math.hypot(dx,dy)*1.15||1));
   const [a,b,c,d]=corners(s,sample).map(pixel);
   return `<polygon points="${a} ${b} ${c} ${d}" fill="rgb(${tone},${tone+4},${tone+8})"/><polygon points="${a} ${b} ${c} ${d}" fill="url(#${gradient})"/><path d="M${a} L${b} M${c} L${d}" fill="none" stroke="#42505a" stroke-width=".85"/>`;
  }).join('');
  const edge=candidate.edge.map(s=>`M${pixel(project(s.a,0))} L${pixel(project(s.b,0))}`).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Aperçu 3D · ${hemChoiceCaption(hemDirections[i],atStart)}">
   <defs><linearGradient id="${gradient}" x2=".75" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".64"/><stop offset=".43" stop-color="#fff" stop-opacity=".06"/>
    <stop offset=".58" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#273744" stop-opacity=".36"/>
   </linearGradient></defs>
   ${volume}
   <path data-hem-edge d="${edge}" fill="none" stroke="#317133" stroke-width="3.4" stroke-linecap="round"/>
   </svg>`;
 });
}
function hemChoiceCards(name,{selected=null,index=null,hideLegend=false,legend='Sens du retour',previews=[],atStart=false}={}){
 const cards=hemDirections.map((direction,i)=>{
  const label=hemChoiceCaption(direction,atStart);
  const control=index===null?'':' data-bend-direction="'+index+'"';
  return `<label class="mir-hem-option">
   <span class="mir-hem-image" data-hem-preview="${direction}">${previews[i]||''}</span>
   <input type="radio" name="${name}" value="${direction}"${control}${selected===direction?' checked':''} required aria-label="${label}">
   <span class="mir-hem-copy"><strong>${label}</strong><small>Le métal revient ${label.endsWith('dessus')?'sur':'sous'} le bord.</small></span>
   </label>`;
 }).join('');
 return `<fieldset class="mir-hem-choice-fieldset"><legend${hideLegend?' class="sr-only"':''}>${legend}</legend>
  <div class="mir-hem-choice-grid" data-hem-cards${index===null?'':' data-hem-index="'+index+'"'}>${cards}</div></fieldset>`;
}
function refreshInlineHemCards(){
 const grids=document.querySelectorAll('#production-dimensions [data-hem-index]');
 if(!grids.length)return;
 const key=JSON.stringify([draft.segments,draft.bends,draft.unit,draft.startAngle,draft.material?.thickness,draft.material?.thicknessUnit]);
 for(const grid of grids){
  if(grid.dataset.hemGeometry===key)continue;
  grid.dataset.hemGeometry=key;
  const index=Number(grid.dataset.hemIndex);
  const candidates=hemDirections.map(direction=>{
   const next=copy(draft);
   next.bends[index].direction=direction;
   return next;
  });
  const previews=hemChoicePreviews(candidates,false,index);
  grid.querySelectorAll('[data-hem-preview]').forEach((span,i)=>{span.innerHTML=previews[i];});
 }
}
/* Même composant de direction sur PC, téléphone et tablette. */
function bendTurnSketch(direction,angle=90){
 const numeric=Number(angle), interior=Number.isFinite(numeric)&&numeric>0&&numeric<=180?numeric:90;
 const turn=(180-interior)*Math.PI/180,pivot=[115,76];
 const end=[pivot[0]+72*Math.cos(turn),pivot[1]+(direction==='left'?-1:1)*72*Math.sin(turn)];
 return '<svg viewBox="0 0 240 158" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Illustration du pli vers '+(direction==='left'?'la gauche':'la droite')+'">'
  +'<rect x="1" y="1" width="238" height="156" rx="12" fill="#f7faf5"/>'
  +'<path d="M 22,76 L 115,76" stroke="#536c61" stroke-width="7" stroke-linecap="round" fill="none"/>'
  +'<path d="M 115,76 L '+end.map(fmt).join(' ')+'" stroke="#d27b25" stroke-width="8" stroke-linecap="round" fill="none"/>'
  +'<circle cx="115" cy="76" r="6" fill="#28553a"/>'
  +'<circle cx="'+fmt(end[0])+'" cy="'+fmt(end[1])+'" r="5" fill="#b25c11"/>'
  +'<text x="120" y="148" fill="#805026" font-size="12" text-anchor="middle">Orange = côté replié</text></svg>';
}
function bendChoiceMarkup(name,selected,angle,{index=null,legend='Sens du pli'}={}){
 const options=['left','right'].map((direction,i)=>{
  const extra=index===null?'':' data-bend-direction="'+index+'"';
  return '<label class="mir-bend-option"><input type="radio" name="'+esc(name)+'" value="'+direction+'"'+extra+
   (selected===direction?' checked':'')+' required aria-label="'+esc(legend+(direction==='left'?' vers la gauche':' vers la droite'))+'">'+
   '<span class="mir-bend-diagram" data-bend-icon="'+direction+'">'+bendTurnSketch(direction,angle)+'</span>'+
   '<strong>Choix '+(i+1)+' · '+(direction==='left'?'Gauche':'Droite')+'</strong></label>';
 }).join('');
 return '<fieldset class="mir-bend-direction" data-bend-pick="'+esc(name)+'"><legend>'+esc(legend)+'</legend>'+
  '<div class="mir-bend-direction-grid" role="radiogroup" aria-label="'+esc(legend)+'">'+options+'</div></fieldset>';
}
function appendTracePoint(point, start){
 if(drawPoints.length>=27)return toast('Un profil peut contenir au maximum 26 segments.');
 const last=drawPoints.at(-1);
 if(last&&Math.hypot(point[0]-last[0],point[1]-last[1])<.01)return;
 const points=!last&&start?[start,point]:[...drawPoints,point];
 const spec=toCustom(points);
 const bend=spec?.bends.at(-1);
 if(bend?.mode==='hem'){
  const candidates=hemDirections.map(direction=>{
   const candidate=copy(spec);
   candidate.bends.at(-1).direction=direction;
   return candidate;
  });
  dialog('De quel côté replier le bord ?',
   'Le trait vert indique le retour sur la moulure.',
   '<form id="trace-hem-form" class="dialog-form">'+
   hemChoiceCards('direction',{hideLegend:true,previews:hemChoicePreviews(candidates)})+
   '<div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Annuler</button>'+
   '<button type="submit" class="primary-button">Confirmer le repli</button></div></form>');
  $('#trace-hem-form').addEventListener('submit',event=>{
   event.preventDefault();
   const index=hemDirections.indexOf(new FormData(event.currentTarget).get('direction'));
   if(index<0)return;
   closeDialog();commitTrace(points,candidates[index]);
  });
  return;
 }
 commitTrace(points,spec);
}
function commitTrace(points,spec){
 freeformRedo=[];
 drawPoints=points;
 if(spec){draft=spec;renderDimensions();}
 renderTools();
 updateDrawing({keepForm:true});
}
function drawingClick(event){
 if(event.target.closest("[data-edit-panel-measure],[data-edit-panel-edge]"))return;
 if(suppressClick){suppressClick=false;return;}
 if(!canDrawProfile()||!drawingCanvasHit(event))return;
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
 if(!model.valid)return toast('Complète les cotes avant d’ajouter un retour écrasé.');
 if(model.segments.length>=26)return toast('Le profil contient déjà 26 côtés.');
 const first=model.segments[0],last=model.segments.at(-1);
 const side=(x,other)=>Math.abs(x-other)<.001?'':x<other?' · à gauche':' · à droite';
 const start=first.start[0],end=last.end[0];
 dialog('Ajouter un retour écrasé',
  'Choisis l’extrémité et la longueur, puis compare les deux aperçus 3D du métal replié.',
  `<form id="end-hem-form" class="dialog-form">
    <label>Extrémité<select name="end"><option value="start">Début · ${esc(first.label+side(start,end))}</option><option value="end">Fin · ${esc(last.label+side(end,start))}</option></select></label>
    <label>Longueur du retour (${draft.unit==='mm'?'mm':'po'})<input name="length" value="${draft.unit==='mm'?'13':'1/2'}" inputmode="decimal" required></label>
    ${hemChoiceCards('direction')}
    <p id="production-dialog-error" class="dialog-error" role="alert"></p>
    <div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Annuler</button><button class="primary-button" type="submit">Ajouter ce retour</button></div>
   </form>`);
 const form=$('#end-hem-form');
 const showChoices=()=>{
  const atStart=form.elements.namedItem('end').value==='start';
  const edge=atStart?model.segments[0]:model.segments.at(-1);
  const length=String(form.elements.namedItem('length').value||'').trim();
  const parsed=M.parseMeasurement(length,draft.unit);
  const directions=['left','right'];
  const valid=parsed.ok&&parsed.mm>0&&parsed.mm<=edge.lengthMM;
  const specs=directions.map(direction=>valid?profileWithEndHem(draft,model,atStart,length,direction):null);
  const previews=hemChoicePreviews(specs,atStart);
  directions.forEach((direction,i)=>{
   const preview=form.querySelector('[data-hem-preview="'+direction+'"]');
   const radio=form.querySelector('input[name="direction"][value="'+direction+'"]');
   preview.innerHTML=previews[i];
   const label=hemChoiceCaption(direction,atStart);
   radio.setAttribute('aria-label',label);
   const copy=radio.closest('label').querySelector('.mir-hem-copy');
   copy.querySelector('strong').textContent=label;
   copy.querySelector('small').textContent='Le métal revient '+(label.endsWith('dessus')?'sur':'sous')+' le bord.';
   radio.disabled=!specs[i]||!build(specs[i]).valid;
   if(radio.disabled)radio.checked=false;
  });
 };
 form.elements.namedItem('length').addEventListener('input',showChoices);
 form.elements.namedItem('end').addEventListener('change',()=>{
  form.querySelectorAll('input[name="direction"]').forEach(radio=>{radio.checked=false;});
  showChoices();
 });
 showChoices();
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
 if(kind!=='profile'||view!=='face'||tool!=='select'||!face?.side||clientProfileWizard()&&clientStep!==4)return;
 face.side=face.side==='left'?'right':'left';
 const select=$('#profile-painted-side');
 if(select)select.value=face.side;
 if(clientProfileWizard())renderProfileOptions();
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

/* Effacer le dernier côté du dessin de travail, jamais une pièce déjà commandée. */
function freeformCanUndo(){
 return !client&&kind==='profile'&&!authoring&&!editingItemId&&draft.template==='custom'&&
  (tool==='draw'?drawPoints.length>0:(draft.segments||[]).length>0);
}
function freeformUndoLast(){
 if(!freeformCanUndo())return;
 const previous={draft:copy(draft),points:copy(drawPoints),tool,view};
 if(tool==='select'&&draft.segments.length>2){
  draft={...copy(draft),segments:draft.segments.slice(0,-1),bends:draft.bends.slice(0,-1)};
  const model=build();drawPoints=model.valid?copy(model.pointsMM):[];
 }else{
  const model=build();
  const points=tool==='draw'?drawPoints.slice(0,-1):model.valid?model.pointsMM.slice(0,-1):drawPoints.slice(0,-1);
  drawPoints=copy(points);
  const next=toCustom(points);
  if(next&&points.length>=3){
   draft={...draft,template:'custom',segments:next.segments,bends:next.bends,startAngle:next.startAngle};
  }else{draft={...draft,template:'custom',segments:[],bends:[]};tool='draw';}
 }
 if(draft.coloredFace?.segmentId&&!draft.segments.some(row=>row.label===draft.coloredFace.segmentId))
  draft.coloredFace={...draft.coloredFace,segmentId:'A'};
 freeformRedo.push(previous);jException=null;renderDimensions();renderProfileOptions();updateDrawing();
}
function freeformRedoLast(){
 if(client||!freeformRedo.length||authoring||editingItemId||kind!=='profile')return;
 const previous=freeformRedo.pop();draft=copy(previous.draft);
 drawPoints=copy(previous.points);tool=previous.tool;view=previous.view;
 jException=null;renderDimensions();renderProfileOptions();updateDrawing();
}
function freeformAddSide(){
 if(client||kind!=='profile'||authoring||editingItemId)return;
 if(draft.template!=='custom'&&!unlockCustom())return;
 if(tool!=='draw'&&(draft.segments||[]).length>=2){
  if(draft.segments.length>=26)return toast('Maximum 26 côtés.');
  draft={...copy(draft),
   segments:[...draft.segments,{label:String.fromCharCode(65+draft.segments.length),length:draft.unit==='mm'?'25.4':'1'}],
   bends:[...draft.bends,{mode:'interior',angle:90,direction:'left'}]};
  freeformRedo=[];const model=build();drawPoints=model.valid?copy(model.pointsMM):[];
  renderDimensions();renderProfileOptions();updateDrawing();return;
 }
 if(!drawTransform)drawTransform={scale:520/(traceHeight*25.4),ox:140,oy:395};
 tool='draw';view='face';
 if(!drawPoints.length)drawPoints=[[0,0]];
 if(drawPoints.length>=27)return toast('Maximum 26 côtés.');
 const end=drawPoints.at(-1);
 let next=[end[0]+25.4,end[1]];
 if(drawPoints.length>1){
  const start=drawPoints.at(-2),dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy)||1;
  next=[end[0]-dy*25.4/length,end[1]+dx*25.4/length];
 }
 appendTracePoint(next);
}
function freeformFinish(){
 if(client||tool!=='draw'||!build().valid||drawPoints.length<3)return;
 tool='select';renderDimensions();renderProfileOptions();updateDrawing();
}
function resumeClientTrace(){
 const model=build();
 if(model.valid){const origin=drawPoints[0]||[0,0];drawPoints=model.pointsMM.map(([x,y])=>[x+origin[0],y+origin[1]]);}
 clientStep=1;clientEntry='draw';tool='draw';view='face';
 renderDimensions();updateDrawing();focusClientEntry('#production-drawing');
}
function startProfileDrawing({fullscreen=true}={}){
 freeformRedo=[];selectedTemplate=null;
 kind='profile';
 draft={...draft,kind:'profile',template:'custom',segments:[],bends:[],startAngle:0,name:'Profil dessiné',length:120,...(clientProfileWizard()?{quantity:1}:{})};delete draft.mirProfileId;
 delete draft.dimensions;
 tool='draw';view='face';drawPoints=[];viewPan={x:0,y:0};
 drawTransform={scale:520/(traceHeight*25.4),ox:140,oy:395};
 if(fullscreen&&!window.MirWorkspace?.active&&matchMedia('(any-pointer: coarse)').matches)void openMobileTrace($('.drawing-card'));
 renderDimensions();
 updateDrawing();
}
let panelDirectEdit=null;
let panelDirectUndo=[],panelDirectRedo=[];
function undoPanelDirect(redo=false){
 if(kind!=='panel'||authoring)return;
 const source=redo?panelDirectRedo:panelDirectUndo,target=redo?panelDirectUndo:panelDirectRedo,next=source.at(-1);
 if(!next||!build(next).valid||!window.MIRProductionVolume.buildMesh(build(next)).valid)return;
 target.push(copy(draft));source.pop();draft=copy(next);renderDimensions();renderPanelOptions();updateDrawing();
 toast('Dessin mis à jour. Enregistrez pour réviser la pièce du dossier.',{quiet:true});
}
let profileDirectEdit=null;
function openProfileMeasure(index){
 const segment=build().segments?.[index],input=segment&&profileMeasureInput(index,segment.label);
 if(!input||activeDefaultLocks[segment.label])return toast('Cette cote est verrouillée par le modèle.');
 profileDirectEdit={index,label:segment.label,before:copy(draft)};
 dialog('Cote '+segment.label,'Le moteur MIR conserve les angles et les autres longueurs. La pièce enregistrée reste inchangée tant que vous ne l’enregistrez pas.',`<label>Nouvelle cote<input id="mir-profile-direct-value" inputmode="text" value="${esc(input.value)}"></label>${panelDirectUnit()}<p>Fractions acceptées : ½, 2 1/4, 2¼. Choisissez millimètres pour une cote métrique.</p><button type="button" class="primary-button" id="mir-profile-direct-apply">Appliquer</button>`);
 $('#mir-profile-direct-value').focus();$('#mir-profile-direct-value').select();
}
function applyProfileDirect(){
 if(!profileDirectEdit)return;
 const {index,label,before}=profileDirectEdit,input=profileMeasureInput(index,label);
 if(!input||activeDefaultLocks[label])return messageError('Cette cote est verrouillée.');
 const parsed=M.parseMeasurement($('#mir-profile-direct-value').value,$('#mir-panel-direct-unit').value);
 if(!parsed.ok||parsed.mm<=0)return messageError(parsed.error||'Entrez une cote positive. La valeur précédente est conservée.');
 const next=copy(before),value=String(Number(unitValue(parsed.mm,next.unit).toPrecision(15)));
 if(next.template==='custom')next.segments[index].length=value;else next.dimensions={...next.dimensions,[label]:value};
 const model=build(next);if(!model.valid)return messageError(model.validation?.errors?.[0]?.message||'Cette cote est impossible. La valeur précédente est conservée.');
 draft=next;freeformRedo=[];profileDirectEdit=null;closeDialog();renderDimensions();renderProfileOptions();updateDrawing();
}
function panelDirectUnit(){return '<label>Unité<select id="mir-panel-direct-unit"><option value="in"'+(draft.unit==='in'?' selected':'')+'>Pouces</option><option value="mm"'+(draft.unit==='mm'?' selected':'')+'>Millimètres</option></select></label>';}
function openPanelMeasure(key){
 if(kind!=='panel'||authoring)return;
 const input=$('#production-dimensions [data-measure="'+key+'"]');
 if(input?.disabled||input?.readOnly||activeDefaultLocks[key]||draft.shape==='square'&&key!=='relief'&&(activeDefaultLocks.width||activeDefaultLocks.height))return toast('Cette cote est verrouillée par le modèle.');
 if(key==='height'&&draft.roofPitch)return toast('La hauteur dépend de la pente X/12. Modifiez la pente ou la largeur dans le formulaire.');
 panelDirectEdit={key,before:copy(draft)};
 const label={width:'A — Largeur hors tout',height:'B — Hauteur hors tout',relief:'C — Projection'}[key];
 dialog(label,draft.shape==='square'&&key!=='relief'?'Carré : cette cote ajuste ensemble A et B. Les lips sont inclus dans le hors tout.':'Les autres cotes restent conservées. Les lips sont inclus dans A et B.',`<label>Nouvelle cote<input id="mir-panel-direct-value" inputmode="text" value="${esc(draft[key]??'')}" aria-describedby="mir-panel-direct-hint"></label>${panelDirectUnit()}<p id="mir-panel-direct-hint">Exemples : 1/2, ½, 2 1/4, 2¼. C désigne la projection, pas l’épaisseur de tôle.</p><button type="button" class="primary-button" id="mir-panel-direct-apply">Appliquer</button>`);
 $('#mir-panel-direct-value').focus();$('#mir-panel-direct-value').select();
}
function openPanelEdge(id){
 if(kind!=='panel'||authoring)return;
 const edge=build().edges.find(e=>e.id===id);if(!edge)return;
 if(activeDefaultLocks.lip||activeDefaultLocks.lips||activeDefaultLocks['lips.'+id])return toast('Les lèvres sont verrouillées par le modèle.');
 panelDirectEdit={edge:id,before:copy(draft)};
 dialog(edge.name,'Le lip de ce côté est indépendant des autres.',`<label>Largeur du lip<input id="mir-panel-direct-value" inputmode="text" value="${esc(fmt(unitValue(edge.lipMM,draft.unit)))}"></label>${panelDirectUnit()}<label><input id="mir-panel-direct-no-lip" type="checkbox" ${edge.lipMM===0?'checked':''}> Sans lip</label><p>Angle dans le plan : ${esc(fmt(edge.interiorAngleDeg))}° (défini par la forme)</p><label><input id="mir-panel-direct-bottom" type="checkbox" ${draft.bottomEdgeId===id?'checked':''}> Côté du bas après installation</label><label><input id="mir-panel-direct-perforation" type="checkbox" ${draft.perforation?.enabled&&draft.bottomEdgeId===id?'checked':''}> Perforation du bas</label><button type="button" class="primary-button" id="mir-panel-direct-apply">Appliquer</button>`);
 $('#mir-panel-direct-value').focus();
}
function applyPanelDirect(){
 if(!panelDirectEdit)return;
 const {key,edge,before}=panelDirectEdit,next=copy(before),raw=$('#mir-panel-direct-no-lip')?.checked?'0':$('#mir-panel-direct-value').value;
 const parsed=M.parseMeasurement(raw,$('#mir-panel-direct-unit').value);
 if(!parsed.ok||parsed.mm<0||key&&key!=='relief'&&parsed.mm===0)return messageError(parsed.error||'Entrez une cote positive. La mesure précédente est conservée.');
 const value=String(parsed.unit===next.unit?parsed.value:Number(unitValue(parsed.mm,next.unit).toPrecision(15)));
 if(key){next[key]=value;if(next.shape==='square'&&key!=='relief')next.width=next.height=value;
 // Do not silently move the derived roof point when its width changes.
 if(key==='width'&&next.roofPitch)return messageError('Cette largeur est liée à une pente X/12. Utilisez le formulaire de pente pour vérifier ensemble la largeur et la hauteur.');
 }else{
 next.lips={...next.lips,[edge]:value};
 const bottom=$('#mir-panel-direct-bottom').checked,perforation=$('#mir-panel-direct-perforation').checked;
 if(perforation&&!bottom)return messageError('La perforation concerne le côté du bas. Choisissez ce côté comme bas.');
 if(bottom){next.bottomEdgeId=edge;next.perforation={...next.perforation,edgeId:edge,enabled:perforation};}
 else if(next.bottomEdgeId===edge){next.bottomEdgeId='';next.perforation={...next.perforation,enabled:false,edgeId:''};}
 }
 const model=build(next),mesh=window.MIRProductionVolume.buildMesh(model);
 if(!model.valid||!mesh.valid)return messageError(model.validation?.errors?.[0]?.message||mesh.errors?.[0]?.message||'Cette cote ne permet pas de construire les lèvres. La mesure précédente est conservée.');
 panelDirectUndo.push(copy(draft));panelDirectRedo=[];draft=next;panelDirectEdit=null;closeDialog();renderDimensions();renderPanelOptions();updateDrawing();toast('Cote appliquée au dessin. Enregistrez la pièce pour mettre à jour le dossier.',{quiet:true});
}
function handleClick(event){if(event.target.closest('[data-toggle-painted-face]'))return toggleProfilePaintedFace();const button=event.target.closest('button,[data-select-bottom],[data-edit-panel-measure],[data-edit-panel-edge],[data-edit-profile-measure]');if(!button)return;const d=button.dataset;
 if(kind==='panel'&&(button.id==='panel-flat'||button.id==='panel-no-folds')){
  if(button.id==='panel-flat'){const input=$('[data-measure="relief"]');if(input?.readOnly)return;draft.relief='0';}
  else{if($('#panel-lip')?.readOnly)return;draft.lip='0';draft.lips=Object.fromEntries(Object.keys(draft.lips||{}).map(id=>[id,'0']));}
  renderDimensions();renderPanelOptions();updateDrawing();return;
 }
 if(button.id==='mir-profile-direct-apply')return applyProfileDirect();
 if(d.editPanelMeasure)return openPanelMeasure(d.editPanelMeasure);
 if(d.editPanelEdge)return openPanelEdge(d.editPanelEdge);
 if(button.id==='mir-panel-direct-apply')return applyPanelDirect();
 if(d.panelSketchStart!==undefined||button.id==='mir-draw-single-panel'){startPanelSketch();return;}
 if(d.panelSketchUndo!==undefined){panelSketchPoints.pop();panelSketchHover=null;updateDrawing();return;}
 if(d.panelSketchCancel!==undefined){cancelPanelSketch();return;}
 if(d.panelSketchFinish!==undefined){finishPanelSketch();return;}
 if(d.panelNoLip&&kind==='panel'&&!editingItemId){
  draft.lips={...draft.lips,[d.panelNoLip]:'0'};
  renderPanelOptions();updateDrawing();return;
 }
 if(d.faceSelect){
  if(client||editingItemId||!['left','right'].includes(d.faceSelect))return;
  draft.coloredFace={...draft.coloredFace,side:d.faceSelect,segmentId:$('#profile-painted-segment')?.value||draft.coloredFace?.segmentId||'A'};
  renderProfileOptions();updateDrawing();
  return;
 }
 if(d.freeformUndo!==undefined)return kind==='panel'?undoPanelDirect():freeformUndoLast();
 if(d.freeformRedo!==undefined)return kind==='panel'?undoPanelDirect(true):freeformRedoLast();
 if(d.freeformFinish!==undefined)return freeformFinish();
 if(d.mirContinueAction!==undefined)return continueChoice(d.mirContinueAction);
 if(clientProfileWizard()){
  if(d.clientStep)return goClientStep(Number(d.clientStep));
  if(button.id==='client-step-back'){if(clientStep===2&&draft.template==='custom')return resumeClientTrace();return goClientStep(clientStep-1);}
  if(button.id==='client-new-trace'){choose('profile','custom');startProfileDrawing({fullscreen:false});return;}
  if(button.id==='client-example-l'){appendTracePoint([50.8,50.8]);appendTracePoint([152.4,50.8]);appendTracePoint([152.4,127]);return;}
  if(button.id==='client-keyboard-point'){const x=M.parseMeasurement($('#client-point-x').value,draft.unit),y=M.parseMeasurement($('#client-point-y').value,draft.unit);if(!x.ok||!y.ok)return toast('Entrez deux coordonnées valides.');appendTracePoint([x.mm,y.mm]);const editor=$('.client-keyboard-trace');if(editor){editor.open=true;$('#client-point-x').value=String(x.value);$('#client-point-y').value=String(y.value);$('#client-point-x').focus();$('#client-point-x').select();}return;}
  if(button.id==='client-step-next')return clientStep===5?addPiece():goClientStep(clientStep+1,{confirm:true});
  if(d.clientFace&&clientStep===4){
   draft.coloredFace={side:d.clientFace,segmentId:draft.coloredFace?.segmentId||build().segments[0]?.label||'A'};
   renderProfileOptions();
   updateDrawing();
   $(`[data-client-face="${d.clientFace}"]`).focus();
   return;
  }
  if(button.id==='client-choose-model'){clientEntry='models';updateDrawing();focusClientEntry();return;}
  if(button.id==='client-entry-back'){clientEntry='choice';tool='select';updateDrawing();focusClientEntry();return;}
  if(d.clientProfile){if(!clientProfileSelected||button.getAttribute('aria-pressed')!=='true')choose('profile',d.clientProfile,{profileChosen:true});return goClientStep(2,{confirm:true});}
  if(button.id==='client-draw-profile'&&clientStep===1){
   if((drawPoints.length||build().valid)&&draft.template==='custom'){resumeClientTrace();updateDrawing();focusClientEntry('#production-drawing');return;}
   choose('profile','custom');
   selectedTemplate=null;
   startProfileDrawing({fullscreen:false});
   focusClientEntry('#production-drawing');
   return;
  }
  if(d.drawTool==='draw'&&canDrawProfile()&&drawPoints.length>=3&&build().valid){
   tool='select';
   clientProfileSelected=true;
   renderProfileOptions();
   return goClientStep(2,{confirm:true});
  }
 }
 if(d.editProfileMeasure!==undefined){
  return openProfileMeasure(Number(d.editProfileMeasure));
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
 if(button.id==='create-panel-po')return importPanelLayout({startNew:true,openBon:true});
 if(button.id==='open-panel-po')return window.MIRProcurementUI?.openCreate?.({newOrder:false});
 if(button.id==='import-panel-layout')return importPanelLayout();
 if(button.hasAttribute('data-close-production-dialog'))return closeDialog();
 if(d.workflow){workflow=d.workflow;authoring=false;editingTemplateId=null;render();return;}
 if(d.kind){if(!clientProfileWizard()||d.kind!==kind){choose(d.kind,d.kind==='panel'?'rectangle':'custom');if(!client&&d.kind==='profile')startProfileDrawing({fullscreen:false});}return;}
 if(d.template){
  if(clientProfileWizard()&&clientProfileSelected&&button.getAttribute('aria-pressed')==='true')return goClientStep(2,{confirm:true});
  choose(kind,d.template,{empty:client&&!authoring,profileChosen:true});
  if(clientProfileWizard())$(`[data-template="${d.template}"]`)?.focus();
  return;
 }
 if(d.savedTemplate||d.useSavedModel){
  if(clientProfileWizard()&&clientProfileSelected&&button.getAttribute('aria-pressed')==='true')return goClientStep(2,{confirm:true});
  useSavedTemplate(d.savedTemplate||d.useSavedModel);
  return;
 }
 if(d.preview){view=d.preview;tool='select';showProfilePaintedFace();updateDrawing();return;}
 if(button.id==='mirror-panel'){draft=M.mirrorPanelSpec(draft);renderDimensions();renderPanelOptions();updateDrawing();toast('Panneau inversé. Les lips et le bas suivent la pièce.');return;}
 if(button.id==='panel-zoom-in'){setZoom(zoom*1.2);return;}
 if(button.id==='panel-zoom-out'){setZoom(zoom/1.2);return;}
 if(button.id==='panel-view-reset'){zoom=1;viewPan={x:0,y:0};orbit=-35;pitch=23;updateDrawing();return;}
 if(d.productionColor){preservedPanelMetadata=null;colorId=d.productionColor;renderColorGrid();if($('#production-ral'))$('#production-ral').value=colorId;updateFinish();showProfilePaintedFace();updateDrawing();return;}
 if(d.selectBottom&&!authoring){draft.bottomEdgeId=d.selectBottom;draft.perforation={...draft.perforation,edgeId:d.selectBottom};renderPanelOptions();updateDrawing();return;}
 if(button.id==='mir-direct-po-add'&&!client){
  formMetadata();
  const model=build();
  if(kind!=='profile'||authoring||editingItemId||!model.valid||!stockLengthCheck().ok||!availableForPO())
    return toast('Complète les cotes et sélectionne une moulure avant de l’ajouter au bon.');
  const check=window.MIRBendingPresets?.checkJ(draft);
  if(check&&!check.valid||check&&!check.ok&&!window.MIRBendingPresets.exceptionMatches(check,jException))
    return toast(check.message||'Corrige d’abord le clouage de cette moulure.');
  return choosePODialog('add',model.name+' · '+M.formatMeasurement(model.lengthMM,model.unit)+' · quantité '+(model.quantity||1));
 }
 if(button.id==='add-production-piece')return addPiece();
 if(button.id==='cancel-piece-edit'){editingItemId=null;choose(kind,kind==='panel'?'rectangle':'l');return;}
 if(d.renamePiece&&!client){
  const item=order.items.find(row=>row.id===d.renamePiece);
  const form=button.closest('[data-production-item]')?.querySelector('[data-rename-form]');
  if(!item||!form)return;
  form.hidden=false;
  const input=form.querySelector('input[name="name"]');
  if(input){input.value=build(item.spec).name;input.setCustomValidity('');input.focus();input.select();}
  return;
 }
 if(d.cancelRename&&!client){const form=button.closest('[data-rename-form]');if(form)form.hidden=true;return;}
 if(d.editPiece)return editPiece(d.editPiece);
 if(d.removePiece){order.items=order.items.filter(item=>item.id!==d.removePiece);if(editingItemId===d.removePiece)editingItemId=null;persist();renderOrder();renderFormMetadata();updateDrawing();return;}
 if(d.duplicatePiece){const original=order.items.find(item=>item.id===d.duplicatePiece);if(!original)return;if(original.kind==='profile'&&!stockLengthCheck({...original.spec,mirProfileId:original.stockProfileType||''},null).ok)return toast('Ancienne longueur non duplicable : créez une nouvelle pièce au format MIR.');if(hasPanelGeometryIssue(original))return toast('Corrigez les lips de cette pièce avant de la dupliquer.');const id='M'+String(order.nextNumber||1).padStart(3,'0'),result=M.instantiateTemplate(original.snapshot.templateSnapshot,{...copy(original.snapshot.values),id,instanceId:id});if(!result.ok)return toast(result.errors.map(e=>e.message).join(' '));order.items.push({...copy(original),id,spec:copy(result.spec),snapshot:copy(result.snapshot),history:[],savedAt:new Date().toISOString()});order.nextNumber=(order.nextNumber||1)+1;persist();renderOrder();toast(`${id} créée à partir de ${original.id}.`);return;}
 if(button.id==='production-json'){downloadJSON({schema:'mir-production-dossier-1',localOnly:true,transmitted:false,order:exportOrder()},publicClientDossier()?'MIR-demande-sur-mesure.json':'MIR-dossier-fabrication.json');return;}
 if(button.id==='production-pdf')return exportPDF();
 if(button.id==='prepare-local-request')return prepareRequest();
 if(d.downloadRequest){const request=requests.find(r=>r.id===d.downloadRequest);if(request)downloadJSON({schema:'mir-production-request-1',localOnly:true,request},request.id+'.json');return;}
 if(d.endHem!==undefined&&(!client||clientProfileWizard())&&(!editingItemId||clientEditableTrace())&&tool==='select')return endHemDialog();
 if(button.hasAttribute('data-discard-current-piece')&&!client&&!editingItemId){
  if(!drawPoints.length&&!(draft.segments||[]).length)return;
  return dialog('Supprimer la pièce en cours ?',
   'Seul le dessin non enregistré sera effacé. Les modèles, bons de commande et pièces déjà enregistrés restent intacts.',
   '<div class="dialog-actions"><button type="button" class="secondary-button" data-close-production-dialog>Garder le dessin</button><button type="button" class="primary-button" id="confirm-discard-current-piece">Supprimer le dessin</button></div>');
 }
 if(button.id==='confirm-discard-current-piece'&&!client&&!editingItemId){
  closeDialog();
  choose('profile','custom');
  startProfileDrawing({fullscreen:false});
  toast('Pièce en cours effacée; modèles et dossier conservés.');
  return;
 }
 if(d.newModel){
  if(d.newModel==='profile'){workflow='configure';authoring=false;editingTemplateId=null;startProfileDrawing({fullscreen:false});render();return;}
  beginAuthor(d.newModel);
  if(d.newModel==='profile'&&matchMedia('(any-pointer: coarse)').matches)startProfileDrawing();
  return;
 }
 if(d.openMobileTrace!==undefined&&canDrawProfile()){void openMobileTrace($('.drawing-card'));renderTools();return;}
 if(d.exitMobileTrace!==undefined){closeMobileTrace();if(canDrawProfile())renderTools();return;}
 if(d.editModel){const record=templates.find(r=>r.id===d.editModel);if(record)beginAuthor(latest(record).kind,record);return;}
 if(d.archiveModel){const record=templates.find(r=>r.id===d.archiveModel);if(record){record.archived=true;store(KEYS.templates,{version:1,records:templates});renderModels();toast('Modèle retiré du catalogue local. Les demandes existantes conservent leur version.');}return;}
 if(button.hasAttribute('data-cancel-author')){authoring=false;workflow='models';render();return;}
 if(d.viewRequest)return showRequest(d.viewRequest);
 if(d.openRequest)return openRequest(d.openRequest);
 if(d.confirmOpenRequest)return openRequest(d.confirmOpenRequest,true);
 if(button.hasAttribute('data-customize')){if(unlockCustom()){renderDimensions();renderProfileOptions();updateDrawing();}return;}
 if(button.hasAttribute('data-add-double'))return doubleFoldDialog();
 if(button.hasAttribute('data-add-segment')){if(!client&&kind==='profile'&&!authoring&&!editingItemId)return toast('Ajoute les côtés directement sur le tableau de tracé.');if(!unlockCustom())return;if(draft.segments.length>=26)return toast('Maximum 26 segments.');draft.segments.push({label:String.fromCharCode(65+draft.segments.length),length:draft.unit==='mm'?25.4:1});draft.bends.push({mode:'interior',angle:90,direction:'left'});renderDimensions();renderProfileOptions();updateDrawing();return;}
 if(d.removeSegment!==undefined){if(client||editingItemId||draft.segments.length<=2)return;freeformRedo=[];const index=Number(d.removeSegment);draft.segments.splice(index,1);draft.bends.splice(Math.max(0,index-1),1);draft.segments.forEach((s,i)=>s.label=String.fromCharCode(65+i));renderDimensions();renderProfileOptions();updateDrawing();return;}
 if(d.drawTool){if(client||editingItemId)return;if(tool===d.drawTool){const finished=tool==='draw';tool='select';updateDrawing();if(finished)focusProfileDimensions();return;}if(!unlockCustom())return;tool=d.drawTool;view='face';const model=build();drawPoints=copy(model.pointsMM);drawTransform=fitModel(model);renderDimensions();updateDrawing();return;}
 if(button.hasAttribute('data-new-drawing')){if(!client&&!editingItemId)startProfileDrawing();return;}
 if(button.hasAttribute('data-drawing-undo')){if(!drawPoints.length||!canDrawProfile())return;drawPoints.pop();const next=toCustom(drawPoints);if(next)draft=next;else{draft.segments=[];draft.bends=[];}renderDimensions();updateDrawing();return;}
}
function releasePanelMetadataOnEdit(target){
 if(/^(material-(type|thickness|gauge)|color-system|production-(material|ral)|special-color-(system|code|name))$/.test(target.id||''))preservedPanelMetadata=null;
}
function handleInput(event){const e=event.target,d=e.dataset;
 if(kind==='panel'&&!e.closest('#production-dialog')){panelDirectUndo=[];panelDirectRedo=[];}
 releasePanelMetadataOnEdit(e);
 if(d.segmentLength!==undefined||d.bendAngle!==undefined||d.measure!==undefined)freeformRedo=[];
 if(e.matches('[data-rename-form] input[name="name"]')){e.setCustomValidity('');return;}
 if(e.id==='production-piece-name'&&!client&&kind==='profile'&&!authoring){
  draft.name=e.value;
  updateDrawing({keepForm:true});
  return;
 }
 if(d.measure){if(kind==='profile'&&d.measure!=='length'){draft.dimensions=draft.dimensions||{};draft.dimensions[d.measure]=e.value;}else draft[d.measure]=e.value;if(kind==='panel'&&draft.shape==='square'&&d.measure==='width')draft.height=e.value;
 if(kind==='panel'&&['width','apexX'].includes(d.measure)&&updateRoofDerivedHeight()){
  const field=$('#production-dimensions [data-measure="height"]');if(field)field.value=draft.height;
 }
 updateDrawing({keepForm:true});roofReadout();return;}
 if(d.segmentLength!==undefined){draft.segments[Number(d.segmentLength)].length=e.value;jException=null;renderProfileOptions();updateDrawing({keepForm:true});return;}
 if(d.bendAngle!==undefined){if((client&&!clientProfileWizard())||(editingItemId&&!clientEditableTrace()))return;draft.bends[Number(d.bendAngle)].angle=e.value===''?'':Number(e.value);e.closest('details[data-angle-details]')?.querySelectorAll('[data-bend-icon]').forEach(icon=>{icon.innerHTML=bendTurnSketch(icon.dataset.bendIcon,e.value);});updateDrawing({keepForm:true});return;}
 if(d.panelLip){draft.lips=draft.lips||{};if(e.value.trim())draft.lips[d.panelLip]=e.value;else delete draft.lips[d.panelLip];updateDrawing({keepForm:true});return;}
 if(e.id==='panel-lip'){draft.lip=e.value;updateDrawing({keepForm:true});return;}
 if(e.id==='panel-perforation-details'){draft.perforation.details=e.value;updateDrawing({keepForm:true});return;}
 if(e.id==='production-color-search'){colorQuery=e.value;renderColorGrid();return;}
 if(['material-thickness','material-gauge','production-quantity','production-location','production-note','special-color-system','special-color-code','special-color-name'].includes(e.id)){formMetadata();updateFinish();updateDrawing({keepForm:true});return;}
 const mapping={'order-project':'project','order-po':'poNumber','order-foreman':'foreman','order-date':'date','order-revision':'revision','order-notes':'notes'};if(mapping[e.id]&&(client||e.id!=='order-po')){order[mapping[e.id]]=e.value;persist();if(e.id==='order-po')updateOrderReference();}
}
function changeUnit(next){const previous=draft.unit||'in';if(next===previous)return;jException=null;const convert=value=>{if(value===''||value===null||value===undefined)return value;const p=M.parseMeasurement(value,previous);return p.ok?fmt(unitValue(p.mm,next)):value;};if(kind==='profile'){if(draft.template==='custom')draft.segments.forEach(s=>s.length=convert(s.length));else for(const k of Object.keys(draft.dimensions||{}))draft.dimensions[k]=convert(draft.dimensions[k]);draft.length=convert(draft.length);}else{for(const k of ['width','height','relief','lip','apexX','topWidth','topOffset','offset','tipDepth','apexOffset'])draft[k]=convert(draft[k]);for(const k of Object.keys(draft.lips||{}))draft.lips[k]=convert(draft.lips[k]);}if(draft.material?.thickness&&kind!=='panel'){draft.material.thickness=convert(draft.material.thickness);draft.material.thicknessUnit=next;}draft.unit=next;tool='select';renderDimensions();renderProfileOptions();renderPanelOptions();renderFormMetadata();updateDrawing();}
function handleChange(event){const e=event.target,d=e.dataset;
 releasePanelMetadataOnEdit(e);
 if(e.matches('#save-production-template input[name="store"]')){
  const section=$('[data-mir-store-color-choice]');
  if(section)section.hidden=!e.checked;
  return;
 }
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
 if(e.id==='mir-panel-roof-pitch'&&kind==='panel'){
  draft.roofPitch=e.value;updateRoofDerivedHeight();renderDimensions();renderPanelOptions();updateDrawing();roofReadout();return;
 }
 if(e.id==='mir-panel-roof-direction'&&kind==='panel'){
  draft.roofDirection=e.value;renderDimensions();renderPanelOptions();updateDrawing();roofReadout();return;
 }
 if(d.specSelect){draft[d.specSelect]=e.value;if(d.specSelect==='rightAngle'){draft.mirrorX=false;renderDimensions();}if(d.specSelect==='pointSide'&&authoring){const p=sampleSpec('panel','pointed');draft.apexOffset=['top','bottom'].includes(e.value)?(M.parseMeasurement(draft.width,draft.unit).value||p.width)/2:(M.parseMeasurement(draft.height,draft.unit).value||p.height)/2;}renderPanelOptions();updateDrawing();return;}
 if(d.bendMode!==undefined){if((client&&!clientProfileWizard())||(editingItemId&&!clientEditableTrace()))return;freeformRedo=[];const index=Number(d.bendMode),old=draft.bends[index];draft.bends[index]={mode:e.value,angle:e.value==='hem'?180:e.value==='signed'?0:90,direction:old.direction||'left'};renderDimensions();updateDrawing();return;}
 if(d.bendDirection!==undefined){if((client&&!clientProfileWizard())||(editingItemId&&!clientEditableTrace()))return;freeformRedo=[];draft.bends[Number(d.bendDirection)].direction=e.value;updateDrawing();return;}
 if(e.id==='profile-painted-side'||e.id==='profile-painted-segment'){draft.coloredFace={side:$('#profile-painted-side')?.value||draft.coloredFace?.side||'',segmentId:$('#profile-painted-segment').value};updateDrawing();return;}
 if(e.id==='panel-bottom'){draft.bottomEdgeId=e.value;draft.perforation={...draft.perforation,edgeId:e.value};updateDrawing();return;}
 if(e.id==='panel-perforation'){draft.perforation={...draft.perforation,enabled:e.checked,edgeId:draft.bottomEdgeId,details:draft.perforation?.details||''};renderPanelOptions();updateDrawing();return;}
 if(e.id==='color-system'){colorSystem=e.value;colorId='';colorQuery='';draft.finish={};renderColors();updateDrawing();return;}
 if(e.id==='production-material'){materialId=e.value;colorId='';colorQuery='';draft.finish={};const m=chosenMaterial();if(m&&!clientProfileWizard()){const type=/acier/i.test(m.family||m.name)?'acier':'aluminium';draft.material.type=type;$('#material-type').value=type;}renderColors();updateDrawing();return;}
 if(e.id==='production-ral'){colorId=e.value;renderColorGrid();updateFinish();showProfilePaintedFace();updateDrawing();return;}
 if(e.id==='material-type'){draft.material={type:e.value,name:kind==='panel'&&e.value!=='aluminium-extrude'?'Unico U-P1 — '+(e.value==='acier'?'Acier':'Aluminium plié'):'',productRef:kind==='panel'&&e.value!=='aluminium-extrude'?'unico-up1-'+e.value:null,thickness:'',thicknessUnit:kind==='panel'?'mm':draft.unit,gauge:''};colorId='';draft.finish={};colorSystem=kind==='panel'?(e.value==='aluminium-extrude'?'ral':'manufacturer'):colorSystem;materialId=availableMaterials().find(m=>m.metalType===e.value)?.id||availableMaterials()[0]?.id||'';renderFormMetadata();renderColors();updateDrawing();return;}
 if(e.id==='material-thickness'){formMetadata();updateDrawing();return;}
 if(e.id==='material-gauge'&&kind==='panel'){formMetadata();if(!availableMaterials().some(m=>m.id===materialId)){materialId=availableMaterials()[0]?.id||'';colorId='';draft.finish={};}renderColors();updateDrawing();return;}
 if(e.id==='trace-height'){
  const height=Number(e.value);
  if(!traceHeights.includes(height))return;
  traceHeight=height;
  const scale=520/(traceHeight*25.4);
  const old=drawTransform;
  const centerX=clientProfileWizard()&&matchMedia('(max-width:600px)').matches?320:400;
  drawTransform=drawPoints.length&&old
   ?{scale,ox:centerX+(old.ox-centerX)*scale/old.scale,oy:260+(old.oy-260)*scale/old.scale}
   :{scale,ox:140,oy:395};
  updateDrawing({keepForm:true});
  return;
 }
 if(e.id==='drawing-snap'){
  snap=e.value!=='off';
  if(e.value==='4'||e.value==='8')traceGridDivisor=Number(e.value);
  updateDrawing({keepForm:true});
  return;
 }
 if(e.id==='drawing-right-angle'){rightAngleSnap=e.checked;return;}
 if(d.itemQuantity){const item=order.items.find(row=>row.id===d.itemQuantity),quantity=Number(e.value);if(!item||!Number.isSafeInteger(quantity)||quantity<1){e.value=item?.spec.quantity||1;toast('Indiquez une quantité entière supérieure à zéro.');return;}if(quantity===item.spec.quantity)return;const out=M.reviseInstance({snapshot:item.snapshot,history:item.history||[]},{quantity});if(!out.ok){toast(out.errors.map(err=>err.message).join(' '));return;}item.spec=copy(out.spec);item.snapshot=copy(out.snapshot);item.history=copy(out.history);persist();renderOrder();if(editingItemId===item.id){draft.quantity=quantity;$('#production-quantity').value=quantity;}return;}
}
function handleSubmit(event){
 const form=event.target;
 if(form.matches('[data-rename-form]')){
  event.preventDefault();
  if(client)return;
  const id=form.dataset.renameForm,old=order.items.find(item=>item.id===id);
  const input=form.querySelector('input[name="name"]');
  const name=String(input?.value||'').trim();
  if(!old)return toast('Moulure introuvable dans ce dossier.');
  if(!name||name.length>140){
   if(input){input.setCustomValidity('Entre un nom de 1 à 140 caractères.');input.reportValidity();}
   return;
  }
  input?.setCustomValidity('');
  if(!activeWorkshopOrderMatches())return;
  if(name===build(old.spec).name){form.hidden=true;return;}
  const result=M.reviseInstance({snapshot:old.snapshot,history:old.history||[]},{name});
  if(!result.ok)return toast(result.errors?.map(error=>error.message).join(' ')||'Impossible de renommer cette pièce.');
  const renamed={...old,spec:copy(result.spec),snapshot:copy(result.snapshot),history:copy(result.history),savedAt:new Date().toISOString()};
  const nextOrder={...order,items:order.items.map(item=>item.id===id?renamed:item)};
  if(!store(KEYS.draft,{version:1,order:nextOrder}))return;
  order=nextOrder;
  if(editingItemId===id){draft.name=name;updateDrawing({keepForm:true});}
  renderOrder();
  toast('Moulure '+id+' renommée : '+name);
  return;
 }
 if(!form.matches('#end-hem-form,#double-fold-form,#save-production-template,#mir-j-exception-form,#mir-po-form'))return;
 event.preventDefault();const data=new FormData(form);
 if(form.id==='end-hem-form'){
  const model=build(),atStart=data.get('end')==='start',length=String(data.get('length')||'').trim();
  const parsed=M.parseMeasurement(length,draft.unit),edge=atStart?model.segments[0]:model.segments.at(-1);
  if(!model.valid||!parsed.ok||parsed.mm<=0||parsed.mm>edge.lengthMM)return messageError('Le retour doit être positif et au plus aussi long que le côté choisi.');
  const direction=data.get('direction');
  if(!['left','right'].includes(direction))return messageError('Choisis l’un des deux aperçus du retour.');
  const next=profileWithEndHem(draft,model,atStart,length,direction);
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
 if(pendingPOAfterSave&&!data.has('po'))return messageError('Pour enregistrer ET ajouter à un bon, garde « Bon de commande » coché. Sinon, reviens à Continuer et choisis uniquement Enregistrer.');
 const allowed={materials:data.getAll('materials'),colorSystems:data.getAll('colorSystems')};if(!allowed.materials.length||!allowed.colorSystems.length)return messageError('Choisissez au moins une matière et un mode de référence couleur.');
 if(data.has('store')&&!allowed.colorSystems.includes('manufacturer'))return messageError('Le Magasin doit proposer le nuancier fabricant pour permettre le choix d’une couleur vérifiable.');const old=templates.find(record=>record.id===editingTemplateId),options={name:String(data.get('name')||'').trim(),description:String(data.get('description')||'')};if(!options.name)return messageError('Donnez un nom au modèle.');const result=old?M.createTemplateRevision(latest(old),draft,options):M.createTemplate(draft,{...options,id:'mir-modele-'+uid(),version:1});if(!result.ok)return messageError(result.errors.map(e=>e.message).join(' '));
 const inputDefaults={};
 for(const field of result.template.fields)inputDefaults[field.key]={
  value:String(data.get('mir-default-'+field.key)||'').trim(),
  locked:data.has('mir-lock-'+field.key)
 };
 const checked=window.MIRModelDefaults?.validate(result.template,inputDefaults);
 if(!checked?.ok)return messageError(checked?.errors?.join(' ')||'Vérification des cotes standards indisponible.');
 const requestedStoreColorMode=String(data.get('storeColorMode')||'employee');
 const savedFixed=old?.storeColor?.mode==='fixed'&&requestedStoreColorMode==='fixed'&&(!colorId||colorSystem!=='manufacturer');
 const storeColor=savedFixed?{ok:true,policy:old.storeColor}:window.MIRStoreColorPolicy?.create({
  channelStore:data.has('store'),mode:requestedStoreColorMode,colorSystem,
  material:chosenMaterial(),color:chosenColor(),metalType:draft.material.type
 });
 if(!storeColor?.ok)return messageError(storeColor?.error||'Le réglage de la couleur du Magasin est indisponible.');
 if(data.has('store')&&storeColor.policy.mode==='fixed'&&!allowed.materials.includes(storeColor.policy.metalType))
  return messageError('La teinte conservée doit correspondre à un métal autorisé dans ce modèle.');
 if(data.has('store')&&storeColor.policy.mode==='fixed'&&
    !window.MIRBendingFinishes.forMetal(materials,storeColor.policy.metalType).some(item=>item.id===storeColor.policy.materialId))
  return messageError('Ce nuancier fabricant ne correspond pas au métal choisi. Sélectionne le bon rouleau avant de conserver sa couleur.');
 const record={storeColor:storeColor.policy,measurementDefaults:checked.data,id:result.template.id,name:result.template.name,currentVersion:result.template.version,versions:old?[...old.versions,copy(result.template)]:[copy(result.template)],channels:{client:data.has('client'),store:data.has('store'),po:data.has('po')},allowed,archived:false,commercial:{...(old?.commercial||{}),status:'draft',lengthIn:120,currency:'CAD',priceCentsByMetal:old?.commercial?.priceCentsByMetal||{},wantsClient:data.has('client'),updatedAt:new Date().toISOString()},updatedAt:new Date().toISOString()};const nextRecords=old?templates.map(row=>row.id===old.id?record:row):[...templates,record];if(!store(KEYS.templates,{version:1,records:nextRecords}))return;
 templates=nextRecords;
 const nextPOAction=pendingPOAfterSave;
 pendingPOAfterSave=null;
 closeDialog();authoring=false;editingTemplateId=null;
 workflow=nextPOAction?'configure':'models';
 if(nextPOAction)selectedTemplate=result.template;
 render();
 toast(data.has('client')?'Pliage enregistré. Boutique sélectionnée : tarifs et publication à valider.':data.has('store')?'Pliage enregistré pour le magasin employés.':'Pliage enregistré dans Mes pliages, sans publication en Boutique ni Magasin.');
 if(data.get('saveTarget')==='shared'&&window.MIRDirectModelSave)void window.MIRDirectModelSave.save(record);
 if(nextPOAction==='existing')existingPOChoice();
 if(nextPOAction==='new')createNewPOFromCurrent();
}
function handleKey(event){const direct=event.target.closest('[data-edit-panel-measure],[data-edit-panel-edge],[data-edit-profile-measure]');if(direct&&['Enter',' '].includes(event.key)){event.preventDefault();direct.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}if(event.target.matches('[data-toggle-painted-face]')&&['Enter',' '].includes(event.key)){event.preventDefault();toggleProfilePaintedFace();$('[data-toggle-painted-face]')?.focus();return;}if(event.target.id==='production-drawing'&&(kind==='panel'||(!client&&kind==='profile'&&tool!=='draw'))){if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();if(event.key==='+'||event.key==='=')setZoom(zoom*1.2);else if(event.key==='-')setZoom(zoom/1.2);else if(event.key==='0'){zoom=1;orbit=-35;pitch=23;updateDrawing();}else if(view==='volume'){if(event.key==='ArrowLeft')orbit-=10;if(event.key==='ArrowRight')orbit+=10;if(event.key==='ArrowUp')pitch=Math.min(85,pitch+10);if(event.key==='ArrowDown')pitch=Math.max(-85,pitch-10);updateDrawing();}return;}}const point=event.target.closest('[data-draw-point]');if(point&&tool==='edit'&&!client&&!editingItemId&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const model=build();if(!model.valid)return;const points=copy(model.pointsMM),i=Number(point.dataset.drawPoint),step=draft.unit==='mm'?(event.shiftKey?10:1):(event.shiftKey?25.4:25.4/16);if(event.key==='ArrowLeft')points[i][0]-=step;if(event.key==='ArrowRight')points[i][0]+=step;if(event.key==='ArrowUp')points[i][1]+=step;if(event.key==='ArrowDown')points[i][1]-=step;const spec=toCustom(points);if(spec){draft=spec;renderDimensions();updateDrawing();$(`[data-draw-point="${i}"]`)?.focus();}}const edge=event.target.closest('[data-select-bottom]');if(edge&&['Enter',' '].includes(event.key)){event.preventDefault();edge.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}
async function boot(){M=window.MIRProduction;if(!M?.createTemplate)throw new Error('Le moteur de modèles n’est pas disponible.');if(!window.MIRBendingLengths?.check)throw new Error('Les longueurs de vente MIR sont indisponibles.');const fetched=await Promise.allSettled([fetch('catalogue-fd6866b49d21.json').then(r=>{if(!r.ok)throw new Error('catalogue');return r.json();}),fetch('ral-classic.json').then(r=>{if(!r.ok)throw new Error('nuancier RAL');return r.json();})]);if(fetched[0].status==='fulfilled'){const raw=fetched[0].value;const catalogue=Array.isArray(raw)?raw:raw.materials||[];materials=window.MIRBendingFinishes.catalogue(catalogue);}if(fetched[1].status==='fulfilled'&&Array.isArray(fetched[1].value.colors))ral=fetched[1].value;
 const unico=window.MIRUnico;if(unico)for(const palette of unico.palettes){const usable=palette.colors.filter(c=>!c.publishedGauges||c.publishedGauges.some(g=>[18,20,22].includes(g)));if(!usable.length)continue;materials.push({id:'unico-palette-'+palette.id,brand:'Unico',name:'U-P1 · '+palette.label,architecturalPanel:true,metalType:palette.materialId,family:palette.materialId,allowedGauges:palette.id==='signature'?[22]:null,sourceUrl:palette.sourceUrl,colors:usable.map(c=>({...c,availabilityNote:c.uP1Compatibility.note+' Écran indicatif.'}))});}materialId=materials[0]?.id||'';
 reloadLocalTemplates();const savedRequests=read(KEYS.requests,{version:1,requests:[]});requests=Array.isArray(savedRequests.requests)?savedRequests.requests.filter(request=>request?.id&&Array.isArray(request.items)&&request.items.every(item=>item.spec&&item.snapshot?.schema==='mir-production-instance-1')):[];
 const saved=read(KEYS.draft,null);order=saved?.version===1&&Array.isArray(saved.order?.items)?normalizeWorkshopOrder(saved.order):defaultOrder();
 injectWorkflow();if(publicClientDossier()){configurePublicDossier();const estimate=document.createElement('a');estimate.href='#';estimate.dataset.estimateSource='bending';estimate.className='primary-button';estimate.textContent='Demander une estimation';$('#production-order').append(estimate);}if(client){$('#production-eyebrow').textContent='L’ATELIER MIR / VOS PIÈCES SUR MESURE';$('#production-title').innerHTML='Votre pièce.<br>À vos <em>mesures.</em>';$('#production-description').textContent='Choisissez la forme. Entrez vos cotes, votre métal et votre couleur. Votre dessin suit vos choix.';$('#mode-link').href='#production-order';$('#mode-link').innerHTML='Mon dossier <span aria-hidden="true">↘</span>';$('#order-metadata').open=false;}
 window.addEventListener('mir-template-catalogue-updated',reloadLocalTemplates);
 window.addEventListener('storage',event=>{if(event.key===KEYS.templates)reloadLocalTemplates();});
 document.addEventListener('click',handleClick);document.addEventListener('input',handleInput);document.addEventListener('change',handleChange);document.addEventListener('submit',handleSubmit);document.addEventListener('keydown',handleKey);document.addEventListener('keydown',traceShift);document.addEventListener('keyup',traceShift);
 const stage=$('#production-drawing');stage.addEventListener('pointerdown',beginPointDrag);stage.addEventListener('pointermove',movePoint);stage.addEventListener('pointerup',endPoint);stage.addEventListener('pointercancel',endPoint);stage.addEventListener('pointerleave',event=>{if(drag?.type==='trace'&&!drag.moved)endPoint(event);});stage.addEventListener('click',drawingClick);stage.addEventListener('wheel',event=>{if(client&&kind!=='panel'&&view!=='volume')return;event.preventDefault();setZoom(zoom*Math.exp(-event.deltaY*.001));},{passive:false});
 const modal=$('#production-dialog');
 let modalPressed=false,backdropPressed=false;
 modal.addEventListener('pointerdown',event=>{
  const bounds=modal.getBoundingClientRect();
  modalPressed=true;
  backdropPressed=event.target===modal&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom);
 });
 modal.addEventListener('click',event=>{
  // A touch that ends on the drawing can open this dialog before the browser
  // sends its click. Wait for a new press while keeping keyboard clicks.
  if(event.detail>0&&!modalPressed){event.preventDefault();event.stopPropagation();}
  else if(event.target===modal&&backdropPressed)closeDialog();
  modalPressed=backdropPressed=false;
 },true);
 modal.addEventListener('close',()=>{modalPressed=backdropPressed=false;});
 choose(kind,kind==='panel'?'rectangle':'l');const requestedMaterial=params.get('material');if(kind==='panel'&&['unico-up1-acier','unico-up1-aluminium'].includes(requestedMaterial)){const type=requestedMaterial.endsWith('aluminium')?'aluminium':'acier';draft.material={type,name:'Unico U-P1 — '+(type==='acier'?'Acier':'Aluminium plié'),productRef:requestedMaterial,thickness:'',thicknessUnit:'mm',gauge:''};materialId=availableMaterials()[0]?.id||'';colorSystem='manufacturer';const requestedColor=params.get('color'),palette=availableMaterials().find(m=>m.colors.some(c=>c.id===requestedColor));if(palette){materialId=palette.id;colorId=requestedColor;}render();}const linked=params.get('template');if(linked&&templates.some(record=>record.id===linked))useSavedTemplate(linked);if(!client&&params.get('view')==='models'){workflow='models';render();}if(!client&&params.get('view')==='requests'){workflow='requests';render();}if(client&&params.get('kind')==='profile'&&!linked)choose('profile','custom');
 if(clientProfileWizard()&&!linked&&!params.get('profile')){
  const active=read('mir_client_active_profile_v1',null);
  if(active?.version===1&&active.draft?.kind==='profile'&&Array.isArray(active.drawPoints)&&(Array.isArray(active.draft.segments)||active.draft.dimensions&&typeof active.draft.dimensions==='object')){
   editingItemId=order.items.some(item=>item.id===active.editingItemId)?active.editingItemId:null;selectedTemplate=active.selectedTemplate||null;legacyQuickId=active.legacyQuickId||null;draft=copy(active.draft);drawPoints=copy(active.drawPoints);clientStep=Math.min(5,Math.max(1,Number(active.clientStep)||1));clientUnlocked=Math.max(clientStep,Number(active.clientUnlocked)||1);clientProfileSelected=!!active.clientProfileSelected;clientEntry=active.clientEntry||'choice';tool=active.tool==='draw'?'draw':'select';colorSystem=active.colorSystem||'manufacturer';colorId=active.colorId||'';materialId=active.materialId||'';render();
  }
 }
 clientDraftReady=true;
 if(clientProfileWizard()&&params.get('quick')&&legacyQuickId!==params.get('quick')&&order.items.find(item=>item.id===editingItemId)?.legacyQuickId!==params.get('quick')){
  const quick=read('mir-bending-v1',null),item=quick?.items?.find(row=>row.id===params.get('quick'));
  const migrated=order.items.find(row=>row.legacyQuickId===params.get('quick'));
  if(migrated){editPiece(migrated.id);toast('Cette pièce est déjà dans le dossier commun.');}
  else if(item){
   const d=item.dimensions||{},shapes={l:[[0,-d.A],[0,0],[d.B,0]],fascia:[[0,-d.A],[0,0],[d.B,0]],j:[[0,-d.A],[0,0],[d.B,0],[d.B,-d.C]],beam:[[0,-d.A],[0,0],[d.B,0],[d.B,-d.C]],z:[[-d.A,-d.B],[0,-d.B],[0,0],[d.C,0]],column:[[d.A,-d.B],[0,-d.B],[0,0],[d.C,0],[d.C,-d.D],[d.C-d.E,-d.D]]};shapes.j_soffite=shapes.j;
   const points=shapes[item.profile]?.map(p=>p.map(n=>n*25.4));
   if(points?.every(p=>p.every(Number.isFinite))){
    choose('profile','custom');selectedTemplate=null;draft.unit='in';draft=toCustom(points);draft.quantity=item.quantity;draft.length=item.lengthIn;draft.mirProfileId=item.profile==='j_soffite'?'j_soffite':undefined;draft.note=item.note||'';draft.material={type:/acier/i.test(item.materialName)?'acier':'aluminium',gauge:item.gauge||''};draft.coloredFace={side:item.painted==='inside'?'left':'right',segmentId:'A'};
    materialId=item.materialId||'';colorId=item.colorId||'';colorSystem='manufacturer';
    if(!chosenMaterial()?.colors?.some(c=>c.id===colorId)){colorSystem='special';draft.finish={system:item.brand||'Référence du formulaire rapide',code:item.colorCode||item.colorName||'',name:item.colorName||''};}
    drawPoints=points;legacyQuickId=item.id;clientProfileSelected=true;clientStep=clientUnlocked=2;
    if(!order.project&&quick.project){order.project=quick.project;persist();}render();toast('Cotes et finition reprises. Vérifiez la pièce avant de l’ajouter au dossier commun.');
   }
  }
 }
 const requestedProfile=params.get('profile');
 if(requestedProfile&&Object.prototype.hasOwnProperty.call(profiles,requestedProfile)){choose('profile',requestedProfile,{profileChosen:true});if(clientProfileWizard())goClientStep(2,{confirm:true});}
 if(!client)window.addEventListener('storage',event=>{if([KEYS.draft,window.MIRPanelLayoutOutput?.STORAGE_KEY].includes(event.key))renderLayoutImport();});
 if(!client&&kind==='profile'&&workflow==='configure'&&!linked&&!requestedProfile&&params.get('profil-mir')!=='1'&&location.hash!=='#production-order'){
  selectedTemplate=null;
  startProfileDrawing({fullscreen:false});
  renderTemplates();
 }
 for(const media of [compactPanel,shortPanel])media.addEventListener('change',()=>{
  if(kind==='panel'&&view==='face'&&workflow==='configure'&&tool!=='panel-trace')updateDrawing({keepForm:true});
 });
 offerProfileImport();
 if(!client&&params.get('shared-request'))openRequest(params.get('shared-request'));
 window.MIRProductionWorkspace=Object.freeze({version:'1.1.0',storageKeys:{...KEYS},localOnly:true,newPurchaseOrder(){if(client||!switchWorkshopOrder(defaultOrder()))return false;workflow='configure';render();return true;},openPurchaseOrder(po){if(client)return false;if(!po.items?.every(i=>i.spec&&i.snapshot?.schema==='mir-production-instance-1'&&build(i.spec).valid)){toast('Ancien format ou géométrie à vérifier : dessin conservé; exportez le dossier avant une conversion.');return false;}const next={...defaultOrder(),id:'procurement-'+po.id,poNumber:po.poNumber,project:po.job,foreman:po.foreman,date:po.requestedDate,revision:po.revision,notes:po.notes,items:copy(po.items)};if(!switchWorkshopOrder(next))return false;workflow='configure';authoring=false;render();return true;},getEstimationDossier(){return client?copy(order):null;},getLivePreviewState(){return {model:build(),tool,kind,authoring,editingItemId,preview:view,zoom,pan:{...viewPan},drawPointsMM:drawPoints.map(point=>point.slice()),canUndo:kind==='panel'?panelDirectUndo.length>0:freeformCanUndo(),canRedo:kind==='panel'?panelDirectRedo.length>0:freeformRedo.length>0};},saveCurrentPiece:saveWorkspacePiece,setOrderItemQuantity,openContinueMenu,openOrderPanelEditor(id,key,edge){if(client||!order.items.some(row=>row.id===id&&row.kind==='panel'))return false;editPiece(id);if(edge)openPanelEdge(edge);else openPanelMeasure(key);return true;},editOrderItem(id){if(client||!order.items.some(row=>row.id===id))return false;editPiece(id);return true;},finishFreeformTrace(){if(client||kind!=='profile'||authoring||editingItemId)return false;if(!build().valid||(draft.segments||[]).length<2)return false;if(tool==='draw')freeformFinish();return true;},openModelFromCurrent(){if(client||kind!=='profile'||authoring||editingItemId)return false;if(!build().valid){toast('Termine les cotes avant d’enregistrer ce modèle.');return false;}saveTemplateDialog();return true;}});
 matchMedia('(max-width:600px)').addEventListener('change',()=>{if(clientProfileWizard()&&tool==='draw'&&!drag)updateDrawing();});
 if(publicClientDossier()){
  void refreshBendTariff();
  window.addEventListener('pageshow',event=>{if(event.persisted)void refreshBendTariff();});
 }
 delete document.documentElement.dataset.mirProfileStartup;
 window.dispatchEvent(new Event('mir-production-ready'));
}
boot().catch(error=>{
 console.error('MIR production',error);
 if(document.documentElement.dataset.mirProfileStartup){
  document.documentElement.dataset.mirProfileStartup='error';
  $('#client-startup-message').textContent='Le configurateur n’a pas pu démarrer.';
  $('#client-startup a').hidden=false;
  return;
 }
$('#production-drawing').innerHTML=`<div class="drawing-hint"><strong>Le configurateur n’a pas pu démarrer.</strong><p>${esc(error.message)}</p><button type="button" class="secondary-button" onclick="location.reload()">Réessayer</button></div>`;$('#add-production-piece').disabled=true;});
})();
