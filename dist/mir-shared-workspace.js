(async()=>{'use strict';
 const $=s=>document.querySelector(s),config=window.MIRSharedConfig;
 const status=message=>$('#status').textContent=message;
 if(!config?.enabled||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||'')){status('Espace partagé non activé. Le raccordement Supabase reste à valider.');return;}
 if(!window.MIRSupabase?.createClient){status('Le module de connexion n’a pas pu être chargé. Rechargez cette page.');return;}
 let snapshot,readSequence=0;
 const legacyAdminTestOnly=config?.legacyTechnicalAdminTestOnly===true;
 const isManager=value=>value?.role==='boss'||value?.role==='assistant'||(legacyAdminTestOnly&&value?.role==='admin');
 function clearWorkspace(){readSequence++;snapshot=null;$('#workspace').hidden=true;for(const id of ['#catalogue','#orders','#job-admin','#bend-tariff-admin','#organization'])$(id).replaceChildren();$('#import').value='';$('#retry').hidden=true;$('#login').hidden=false;}
 const client=MIRSharedClient.create({sdk:window.MIRSupabase.createClient(config.supabaseUrl,config.publishableKey),storage:localStorage,onSessionInvalidated:clearWorkspace});
 const text=(tag,value,parent)=>{const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;};
 const org=()=>$('#organization').value;
 const requestedDestination=new URLSearchParams(location.search).get('destination'),destination=['boutique','store'].includes(requestedDestination)?requestedDestination:null;
 if(destination)document.querySelector('h1').textContent=destination==='boutique'?'Boutique partagée':'Magasin employés partagé';
 const cad=cents=>(cents/100).toFixed(2)+' $ CA';
 const bendPrice=window.MIRBendPricing.unitCents;
 function numberInput(parent,label,value,{step='1',min='0',max}={}){
  const input=document.createElement('input');
  input.type='number';input.inputMode='decimal';input.required=true;
  input.min=min;input.step=step;if(max)input.max=max;input.value=value??'';
  text('label',label,parent).append(input);return input;
 }
 function renderBendTariff(tariff,organization){
  const target=$('#bend-tariff-admin');target.replaceChildren();
  if(!tariff||!isManager(snapshot)||destination==='store')return;
  const article=text('article','',target);text('h2','Tarifs de la Boutique de pliages',article);
  text('p','Une pièce est facturée sur 10 pi, même si elle est coupée plus courte.',article);
  const form=text('form','',article);
  const rate=numberInput(form,'Surface ($ CA / po²)',tariff.area_rate,{step:'0.000001',min:'0.000001',max:'1000'});
  const bend=numberInput(form,'Prix par pli ($ CA)',tariff.bend_cents/100,{step:'0.01',max:'10000'});
  const markup=numberInput(form,'Majoration aluminium (%)',tariff.aluminum_basis_points/100,{step:'0.01',max:'1000'});
  const quick=text('button','+10 % aluminium',form);quick.type='button';
  const delivery=numberInput(form,'Frais de livraison par commande ($ CA)',tariff.delivery_cents/100,{step:'0.01',max:'10000'});
  text('p','Livraison gratuite au-delà de 300 $ avant taxes dans les 40 premiers km du 1653, avenue des Affaires, Québec. Au-delà de 80 km, sur soumission.',form);
  const preview=text('p','',form);preview.setAttribute('role','status');
  const feedback=text('p','',form);feedback.setAttribute('role','status');
  const reason=document.createElement('textarea');reason.required=true;reason.minLength=3;reason.maxLength=500;reason.placeholder='Raison de la modification';text('label','Raison obligatoire',form).append(reason);
  const save=text('button','Appliquer les tarifs',form);save.type='submit';save.className='shared-save';
  const values=()=>({area_rate:rate.valueAsNumber,bend_cents:Math.round(bend.valueAsNumber*100),
   aluminum_basis_points:Math.round(markup.valueAsNumber*100),delivery_cents:Math.round(delivery.valueAsNumber*100)});
  function update(){
   if(!form.checkValidity()){preview.textContent='Vérifiez les montants saisis.';return;}
   const before=bendPrice(tariff,'aluminium',null,600,1),after=bendPrice(values(),'aluminium',null,600,1);
   preview.textContent=after===null?'Exemple de prix hors limite.':'Exemple aluminium (600 po² et 1 pli) · '+(before===null?'Sur demande':cad(before))+' → '+cad(after);
  }
  quick.onclick=()=>{markup.value='10';update();};form.addEventListener('input',update);update();
  form.onsubmit=async event=>{
   event.preventDefault();if(save.disabled)return;save.disabled=true;
   try{
    if(!legacyAdminTestOnly&&!confirm('Appliquer ces tarifs confirmés? Aucun prix absent ne sera inventé.'))return;
    await client.saveBendTariff(organization,tariff.revision,values(),reason.value.trim());
    if(org()===organization){await refresh();status('Tarifs appliqués à la Boutique de pliages.');}
   }catch(error){feedback.textContent=error.message;}
   finally{save.disabled=false;}
  };
 }
 function renderDelivery(article,order){
  const saved=order.snapshot.delivery;if(!saved)return;
  text('p','Livraison · '+[saved.address.line1,saved.address.line2,saved.address.city,saved.address.postalCode].filter(Boolean).join(', '),article);
  if(saved.status==='confirmed'){
   text('p',saved.feeCents===0?'Livraison gratuite':cad(saved.feeCents)+' de livraison',article);
   text('p','Total avant taxes · '+cad(order.snapshot.totalCents+saved.feeCents),article);
  }else text('p',saved.status==='outside-zone'?'Livraison au-delà de 80 km · Sur soumission':'Livraison sur soumission · Adresse ou tarif à vérifier',article);
 }
 function openLocalRequest(request){
  const key='mir_production_requests_v1',raw=localStorage.getItem(key),saved=raw?JSON.parse(raw):{version:1,requests:[]};
  if(saved.version!==1||!Array.isArray(saved.requests))throw Error('Anciennes données non reconnues : sauvegarde nécessaire');
  if(!saved.requests.some(row=>row.id===request.id)){
   saved.requests.push(request);if(localStorage.getItem(key)!==raw)throw Error('Un autre onglet a modifié les demandes');localStorage.setItem(key,JSON.stringify(saved));
  }
  location.href='production.html?shared-request='+encodeURIComponent(request.id);
 }
 async function refresh(){
  const sequence=++readSequence,requestedOrg=org();let next=await client.snapshot(requestedOrg);if(!legacyAdminTestOnly)try{const management=await client.managementSnapshot(requestedOrg);next={...next,...management,catalogue:management.models,management:true};}catch(error){if(error.code&&error.code!=='42501')throw error;}if(sequence!==readSequence||requestedOrg!==org())return;snapshot=next;$('#import-label').hidden=!isManager(snapshot);$('#catalogue').replaceChildren();$('#orders').replaceChildren();$('#job-admin').replaceChildren();renderBendTariff(snapshot.bendTariff,requestedOrg);
  if(legacyAdminTestOnly&&snapshot.role==='admin'){const f=document.createElement('form'),name=document.createElement('input'),employee=document.createElement('select');name.placeholder='Nom du chantier';name.required=true;for(const m of snapshot.members.filter(m=>m.role==='employee')){const o=document.createElement('option');o.value=m.id;o.textContent=m.email||('Employé '+m.id);employee.append(o);}f.append(name,employee);text('button','Créer / affecter le chantier',f);$('#job-admin').append(f);f.onsubmit=async e=>{e.preventDefault();try{await client.assignJob(org(),name.value,employee.value);await refresh();}catch(error){status(error.message);}};}
  $('#all-models').hidden=!isManager(snapshot)||!destination;
  const destinationAllowed=!destination||isManager(snapshot)||(destination==='boutique'&&snapshot.role==='client')||(destination==='store'&&snapshot.role==='employee');
  const catalogue=destinationAllowed?snapshot.catalogue.filter(model=>!destination||(!model.archived&&(destination==='boutique'?model.boutique:model.store))):[];
  const distanceRequests=new Map();
  for(const model of catalogue){
   const article=document.createElement('article');article.dataset.revision=model.revision;article.dataset.modelId=model.id;$('#catalogue').append(article);text('h2',model.name,article);
   text('p','Version '+model.version+' · '+model.conditions,article);
   const template=model.specification.template||model.specification,rules=model.configurationRules||{};
   if(isManager(snapshot)){
    if(model.supplierPo&&!model.archived){
     const prepare=text('button','Préparer un bon avec ce modèle partagé',article);prepare.type='button';prepare.dataset.sharedModelPo=model.id;
     prepare.onclick=async()=>{prepare.disabled=true;try{
      const requestedOrg=org(),current=legacyAdminTestOnly?await client.snapshot(requestedOrg):await client.managementSnapshot(requestedOrg),fresh=(legacyAdminTestOnly?current.catalogue:current.models).find(row=>row.id===model.id);
      if(requestedOrg!==org()||!isManager(current)||!fresh||fresh.archived||!fresh.supplierPo||fresh.revision!==model.revision)throw Error('Publication modifiée : actualisez le catalogue');
      const options=fresh.configurationRules||{},t=fresh.specification.template||fresh.specification;
      const metal=(options.materials||fresh.specification.allowed?.materials||['aluminium','acier'])[0],color=options.fixed_color||options.colors?.[0]||'À confirmer';
      const result=MIRProduction.instantiateTemplate(t,{id:'M001',instanceId:'M001',measurements:{...fresh.standards,...fresh.locks,length:String(fresh.saleLengthIn)},unit:'in',length:fresh.saleLengthIn,quantity:1,material:{type:metal},finish:{name:color}});
      if(!result.ok)throw Error('Renseignez les mesures standards du modèle avant de préparer le bon');
      const id='MIR-MODELE-'+fresh.id+'-V'+fresh.version+'-P'+fresh.revision;
      openLocalRequest({id,createdAt:new Date().toISOString(),source:'shared-model-snapshot',status:'prepared_local',order:{notes:'Modèle partagé '+fresh.name+' · V'+fresh.version+' · '+fresh.conditions},items:[{id:'M001',kind:'profile',spec:result.spec,snapshot:result.snapshot,history:[],sourceSharedModel:{organizationId:requestedOrg,modelId:fresh.id,version:fresh.version,publicationRevision:fresh.revision}}]});
     }catch(e){status('Bon non préparé : '+e.message);}finally{prepare.disabled=false;}};
     text('p','Le bon de travail et son PDF seront préparés sur cet appareil. Aucun envoi automatique.',article);
    }
    const form=document.createElement('form');article.append(form);const controls={};const modelName=document.createElement('input');modelName.required=true;modelName.maxLength=140;modelName.value=model.name;text('label','Nom du modèle',form).append(modelName);
    for(const [key,label,value,type] of [['boutique','Boutique',model.boutique,'checkbox'],['store','Magasin employés',model.store,'checkbox'],['supplier_po','Bons fournisseurs',model.supplierPo,'checkbox'],['archived','Archivé',model.archived,'checkbox'],['aluminum_cents',snapshot.bendTariff?'Prix fixe aluminium en cents / 10 pi (facultatif)':'Prix aluminium en cents / 10 pi',model.aluminumCents,'number'],['steel_cents',snapshot.bendTariff?'Prix fixe acier en cents / 10 pi (facultatif)':'Prix acier en cents / 10 pi',model.steelCents,'number'],['sale_length_in','Longueur de vente (120 po; 144 uniquement J à soffite)',model.saleLengthIn,'number'],['conditions','Conditions',model.conditions,'text']]){
     const input=document.createElement('input');input.type=type;input.value=value??'';input.checked=value===true;if(type==='number'){input.min='1';input.step='1';}text('label',label,form).append(input);controls[key]=input;
    }
    if(snapshot.bendTariff)text('p','Laissez le prix fixe vide pour utiliser le tarif général. La majoration aluminium s’applique aussi au prix fixe.',form);
    const measureControls={};for(const field of template.fields||[]){if(field.key==='length')continue;const row=text('label',field.label||field.key,form),value=document.createElement('input'),lock=document.createElement('input');value.value=model.standards[field.key]??model.locks[field.key]??'';value.placeholder='Mesure standard, ex. 3 1/2';lock.type='checkbox';lock.checked=Object.hasOwn(model.locks,field.key);row.append(value);text('span','Verrouiller cette cote',row).append(lock);measureControls[field.key]={value,lock};}
    let readRules=null;
    if(snapshot.capabilities?.publicationRules){
     const group=document.createElement('fieldset');form.append(group);text('legend','Matériaux, couleurs et permissions',group);
     const choice=(key,label,values,selected)=>{const row=text('div',label,group),inputs=[];for(const value of values){const input=document.createElement('input');input.type='checkbox';input.dataset.rule=key;input.value=value;input.checked=selected.includes(value);text('label',value==='client'?'Client':value==='employee'?'Employé':value,row).append(input);inputs.push(input);}return ()=>inputs.filter(i=>i.checked).map(i=>i.value);};
     const metals=choice('materials','Métaux autorisés',['aluminium','acier'],rules.materials||model.specification.allowed?.materials||['aluminium','acier']);
     const colors=document.createElement('textarea');colors.dataset.rule='colors';colors.value=(rules.colors||[]).join('\n');colors.rows=3;text('label','Couleurs autorisées — une par ligne; vide : à valider',group).append(colors);
     const fixed=document.createElement('input');fixed.dataset.rule='fixed_color';fixed.value=rules.fixed_color||'';text('label','Couleur fixe pour les rôles verrouillés',group).append(fixed);
     const colorRoles=choice('color_edit_roles','Peut choisir la couleur',['client','employee'],rules.color_edit_roles||['client','employee']);
     const measureRoles=choice('measure_edit_roles','Peut modifier les mesures non verrouillées',['client','employee'],rules.measure_edit_roles||['client','employee']);
     readRules=()=>({materials:metals(),colors:colors.value.split('\n').map(v=>v.trim()).filter(Boolean),...(fixed.value.trim()?{fixed_color:fixed.value.trim()}:{}),color_edit_roles:colorRoles(),measure_edit_roles:measureRoles()});
    }
    const reason=document.createElement('textarea');reason.required=!legacyAdminTestOnly;reason.minLength=3;reason.maxLength=500;reason.value=legacyAdminTestOnly?'Test de non-régression':'';reason.placeholder='Raison de la nouvelle version';text('label','Raison obligatoire',form).append(reason);
    const version=document.createElement('input');version.type='file';version.accept='.json,application/json';text('label','Charger une nouvelle géométrie exportée',article).append(version);version.onchange=async()=>{try{const t=JSON.parse(await version.files[0].text());if(!MIRProduction.templatePreview(t).ok)throw Error('Géométrie non valide');if(reason.value.trim().length<3)throw Error('Indiquez la raison de la nouvelle version');if(!legacyAdminTestOnly&&!confirm('Créer la version '+(model.version+1)+'? La version publiée et les commandes historiques resteront intactes.'))return;if(legacyAdminTestOnly)await client.addVersion(org(),model,t);else await client.manageModel(org(),{action:'revise',modelId:model.id,expectedVersion:model.version,expectedRevision:model.revision,name:modelName.value.trim(),description:model.description||model.conditions,specification:t,settings:{},reason:reason.value.trim()});await refresh();}catch(e){status(e.message);}};
    const bar=document.createElement('div');bar.className='shared-save-bar';form.append(bar);const save=text('button','Créer et publier une nouvelle version',bar);save.type='submit';save.className='shared-save';const feedback=text('p','',bar);feedback.className='shared-save-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');form.onsubmit=async e=>{e.preventDefault();if(save.disabled||!form.reportValidity())return;if(!confirm('Créer la version '+(model.version+1)+' et conserver la version actuelle dans l’historique?'))return;save.disabled=true;save.textContent='Enregistrement…';feedback.setAttribute('role','status');feedback.textContent='Enregistrement sur le serveur…';try{const settings={};for(const [key,input] of Object.entries(controls))settings[key==='supplier_po'?'production':key]=input.type==='checkbox'?input.checked:input.type==='number'?(input.value?Number(input.value):null):input.value;settings.standard_measures={};settings.locked_measures={};for(const [key,row] of Object.entries(measureControls)){if(row.value.value!=='')settings.standard_measures[key]=row.value.value;if(row.lock.checked){if(!row.value.value)throw Error('Renseignez la cote avant de la verrouiller');settings.locked_measures[key]=row.value.value;}}if(readRules)settings.configuration_rules=readRules();await client.manageModel(org(),{action:controls.archived.checked?'archive':model.archived?'reactivate':'publish',modelId:model.id,expectedVersion:model.version,expectedRevision:model.revision,name:modelName.value.trim(),description:controls.conditions.value,specification:template,settings,reason:reason.value.trim()});await refresh();const confirmation=document.querySelector('[data-model-id="'+model.id+'"] .shared-save-feedback');if(confirmation){confirmation.textContent='Nouvelle version enregistrée sur le serveur.';confirmation.scrollIntoView({block:'nearest'});}status('Nouvelle version enregistrée. Les versions historiques restent intactes.');}catch(e){feedback.setAttribute('role','alert');feedback.textContent='Enregistrement non confirmé : '+e.message;status('Publication non confirmée : '+e.message);}finally{save.disabled=false;save.textContent='Créer et publier une nouvelle version';}};continue;
   }
   const form=document.createElement('form');article.append(form);
   const metal=document.createElement('select');for(const m of (rules.materials||(Array.isArray(model.specification.allowed?.materials)?model.specification.allowed.materials:['aluminium','acier'])).filter(m=>['aluminium','acier'].includes(m))){const o=document.createElement('option');o.value=m;o.textContent=m;metal.append(o);}text('label','Métal',form).append(metal);
   const color=document.createElement(rules.colors?.length?'select':'input');if(rules.colors?.length){for(const name of rules.colors){const option=document.createElement('option');option.value=name;option.textContent=name;color.append(option);}}else color.placeholder='Couleur demandée — à valider';color.required=true;if(rules.fixed_color)color.value=rules.fixed_color;color.disabled=Array.isArray(rules.color_edit_roles)&&!rules.color_edit_roles.includes(snapshot.role);text('label','Couleur demandée',form).append(color);
   const quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.max='10000';quantity.step='1';quantity.value='1';text('label','Quantité',form).append(quantity);
   text('p','Cotes en pouces — fractions acceptées, par exemple 3 1/2.',form);const measures={...model.standards,...model.locks},fields={};
   for(const field of template.fields||[]){const label=text('label',field.label||field.key,form);const input=document.createElement('input');input.value=field.key==='length'?String(model.saleLengthIn):measures[field.key]??'';input.required=field.required!==false;input.disabled=field.key==='length'||Object.hasOwn(model.locks,field.key)||(Array.isArray(rules.measure_edit_roles)&&!rules.measure_edit_roles.includes(snapshot.role));label.append(input);fields[field.key]=input;}
   const chantier=document.createElement('select');if(snapshot.role==='employee'){chantier.required=true;const empty=document.createElement('option');empty.value='';empty.textContent='Choisir un chantier affecté';chantier.append(empty);for(const job of snapshot.jobs){const o=document.createElement('option');o.value=job.id;o.textContent=job.name;chantier.append(o);}text('label','Chantier affecté',form).append(chantier);}
   const tariff=snapshot.role==='client'?snapshot.bendTariff:null;
   const addresses=snapshot.deliveryAddresses||[];
   let deliveryChoice,deliveryPrice,deliveryFee=null,deliveryLoading=false,distance=null,distanceSequence=0;
   const selectedAddress=()=>addresses.find(a=>a.id===deliveryChoice?.value);
   if(tariff){
    text('p','Prix par pièce facturé sur 10 pi, même après coupe.',form);
    deliveryChoice=document.createElement('select');
    text('option','Ramassage au bureau',deliveryChoice).value='pickup';
    for(const address of addresses)text('option','Livrer au '+address.label,deliveryChoice).value=address.id;
    if(addresses.length)deliveryChoice.value=addresses[0].id;
    text('label','Réception',form).append(deliveryChoice);
    text('a',addresses.length?'Gérer mes adresses':'Ajouter une adresse de livraison dans Mon compte',form).href='chantier.html';
    deliveryPrice=text('p','',form);deliveryPrice.setAttribute('aria-live','polite');
    text('p','Livraison jusqu’à 80 km du 1653, avenue des Affaires, Québec · '+cad(tariff.delivery_cents)+
      ' par commande. Gratuite au-delà de 300 $ avant taxes dans les 40 premiers km.',form);
    const source=text('a','Localisation des adresses : Adresses Québec (MRNF)',form);
    source.href='https://www.donneesquebec.ca/recherche/dataset/adresses-quebec/resource/64cbcdfc-4dd6-42e7-9a5d-489e775da83b';
   }
   const price=text('p','',form),drawing=document.createElement('div'),volume=document.createElement('div');let volumeOpen=false;form.append(drawing,volume);const toggle=text('button','Afficher la 3D',form);toggle.type='button';toggle.onclick=()=>{volumeOpen=!volumeOpen;toggle.textContent=volumeOpen?'Masquer la 3D':'Afficher la 3D';preview();};
   function preview(){const values=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]));
    const result=MIRProduction.instantiateTemplate(template,{measurements:values,unit:'in',length:model.saleLengthIn,quantity:Number(quantity.value),material:{type:metal.value},finish:{name:color.value||'À valider'}});
    drawing.innerHTML=result.ok?MIRProduction.profileSVG(result.spec,{width:620,height:260}):'';volume.innerHTML=volumeOpen&&result.ok?MIRProductionVolume.render(MIRProduction.buildProfile(result.spec),{width:620,height:320}):'';
    const fixedCents=metal.value==='aluminium'?model.aluminumCents:model.steelCents;
    const count=Number(quantity.value);
    let cents=model.saleLengthIn===120?fixedCents:null;
    if(tariff){
     if(!result.ok||!Number.isInteger(count)||count<1||count>10000){
      price.textContent='Renseignez les cotes et la quantité pour voir le prix.';
      deliveryPrice.textContent=deliveryLoading?'Calcul de la distance…':'';return false;
     }
     const profile=result.model.kind==='profile';
     const area=profile?result.model.finishedSegmentSumMM/25.4*120:0;
     const folds=profile?result.model.bends.filter(b=>b.turnDeg!==0).length:0;
     cents=profile||fixedCents!=null?bendPrice(tariff,metal.value,fixedCents,area,folds):null;
    }
    price.textContent=snapshot.role==='employee'?'Demande interne — disponibilité à confirmer':
     cents==null?'Soumission requise':cad(cents)+' / pièce · '+cad(cents*count)+' avant taxes et livraison · prix revérifié au serveur';
    if(deliveryPrice){
     const subtotal=cents==null?null:cents*count;
     deliveryFee=null;
     if(!selectedAddress())deliveryPrice.textContent='';
     else if(deliveryLoading)deliveryPrice.textContent='Calcul de la distance…';
     else if(distance===null||distance>80||subtotal===null)deliveryPrice.textContent='Livraison sur soumission';
     else{
      deliveryFee=distance<=40&&subtotal>30000?0:tariff.delivery_cents;
      deliveryPrice.textContent=(deliveryFee===0?'Livraison gratuite':cad(deliveryFee)+' de livraison')+
        ' · '+cad(subtotal+deliveryFee)+' avant taxes';
     }
    }
    return true;
   }
   async function updateDistance(){
    const sequence=++distanceSequence,address=selectedAddress();
    distance=null;deliveryLoading=!!address;preview();
    if(!address)return;
    try{
     if(!distanceRequests.has(address.id))distanceRequests.set(address.id,client.deliveryDistance(requestedOrg,address));
     const km=await distanceRequests.get(address.id);
     if(sequence===distanceSequence&&article.isConnected&&requestedOrg===org())distance=km===null?null:Number(km);
    }catch(error){
     if(sequence===distanceSequence&&article.isConnected&&error.code==='PT409')status(error.message);
    }finally{
     if(sequence===distanceSequence&&article.isConnected){deliveryLoading=false;preview();}
    }
   }
   form.addEventListener('input',preview);
   if(deliveryChoice){deliveryChoice.addEventListener('change',updateDistance);void updateDistance();}else preview();
   const submit=text('button','Transmettre pour validation',form);submit.type='submit';
   form.onsubmit=async e=>{e.preventDefault();if(tariff&&(!preview()||deliveryLoading))return;const button=form.querySelector('button[type=submit]');button.disabled=true;try{
    const configuration={metal:metal.value,color:color.value,quantity:Number(quantity.value),measures:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,Object.hasOwn(model.locks,k)?model.locks[k]:v.value]))};
    if(snapshot.role==='employee')configuration.chantier=chantier.value;
    if(tariff)configuration.tariffRevision=tariff.revision;
    const address=selectedAddress();
    if(address)Object.assign(configuration,{deliveryAddressId:address.id,deliveryAddressVersion:address.version,deliveryFeeCents:deliveryFee});
    const id=await client.submit(org(),model,configuration);status('Demande enregistrée : '+id);await refresh();
   }catch(error){
    if(error.code==='PT409'){await refresh();status(error.message+' Vérifiez le total avant de renvoyer la demande.');}
    else{status('Non confirmé : '+error.message+' Votre demande reste conservée pour reprise.');$('#retry').hidden=false;}
   }finally{button.disabled=false;}};
  }
  for(const order of snapshot.orders){const article=document.createElement('article');$('#orders').append(article);text('h3',order.id+' · '+(order.status==='draft'?'À valider par MIR':order.status),article);const request=order.snapshot,configuration=request.configuration||{};text('p','Quantité : '+(configuration.quantity??'À confirmer')+' · Métal : '+(configuration.metal||'À confirmer')+' · Couleur : '+(configuration.color||'À confirmer'),article);text('p','Cotes : '+Object.entries(configuration.measures||{}).map(([key,value])=>key+' = '+value).join(' · '),article);text('p',request.totalCents==null?'Demande de validation — tarif et disponibilité à confirmer':'Montant de référence : '+(request.totalCents/100).toFixed(2)+' $ CA · conditions de la demande conservées',article);
   renderDelivery(article,order);
   if(isManager(snapshot)){
    const button=text('button','Préparer une copie dans les bons de pliage',article);button.onclick=()=>{try{
     const s=order.snapshot,c=s.configuration,t=s.specification.template||s.specification;
     const result=MIRProduction.instantiateTemplate(t,{id:'M001',instanceId:'M001',measurements:c.measures,unit:'in',length:s.saleLengthIn,quantity:c.quantity,material:{type:c.metal},finish:{name:c.color}});
     if(!result.ok)throw Error('Configuration à corriger avant production');
     openLocalRequest({id:order.id,createdAt:order.createdAt,status:'submitted',order:{project:c.chantier||'',notes:'Demande partagée '+order.id},items:[{id:'M001',kind:'profile',spec:result.spec,snapshot:result.snapshot,history:[]}]});
    }catch(e){status('Copie non préparée : '+e.message);}};
    const details=document.createElement('details');article.append(details);text('summary','Corriger la commande reçue',details);
    if(order.productionStarted){const warning=text('p','Attention : la production a commencé. Cette correction créera une nouvelle révision et peut exiger une nouvelle mise en production.',details);warning.setAttribute('role','alert');}
    const edit=document.createElement('form');details.append(edit);const rows=[];
    for(const [index,line] of (order.lines||[]).entries()){
     const group=document.createElement('fieldset');edit.append(group);text('legend','Pièce '+(index+1),group);
     const selectedModel=document.createElement('select');for(const optionModel of snapshot.catalogue){const option=document.createElement('option');option.value=optionModel.id;option.textContent=optionModel.name+' · V'+optionModel.version;option.selected=optionModel.id===line.modelId;selectedModel.append(option);}text('label','Modèle ou pièce',group).append(selectedModel);
     const quantity=numberInput(group,'Quantité',Number(line.quantity),{step:'1',min:'1',max:'10000'});
     const length=numberInput(group,'Longueur',Number(line.specification?.length||120),{step:'0.001',min:'0.001',max:'100000'});
     const material=document.createElement('input');material.value=line.specification?.material?.type||'';text('label','Matériau',group).append(material);
     const gauge=document.createElement('input');gauge.value=line.specification?.material?.gauge||line.specification?.material?.thickness||'';text('label','Gage',group).append(gauge);
     const manufacturer=document.createElement('input');manufacturer.value=line.specification?.finish?.manufacturer||'';text('label','Fabricant',group).append(manufacturer);
     const color=document.createElement('input');color.value=line.specification?.finish?.name||'';text('label','Couleur',group).append(color);
     const face=document.createElement('select');for(const [value,label] of [['left','Face 1'],['right','Face 2']]){const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=(line.specification?.coloredFace?.side||'left')===value;face.append(option);}text('label','Face colorée',group).append(face);
     const measures=document.createElement('textarea');measures.value=JSON.stringify(line.specification?.measurements||line.specification?.dimensionsIn||{},null,2);text('label','Mesures confirmées',group).append(measures);
     rows.push({line,selectedModel,quantity,length,material,gauge,manufacturer,color,face,measures});
    }
    const jobReference=document.createElement('input');jobReference.value=order.jobReference||'';text('label','Chantier ou « Chantier à confirmer »',edit).append(jobReference);
    const notes=document.createElement('textarea');notes.value=order.snapshot?.notes||'';text('label','Notes de production',edit).append(notes);
    const statusSelect=document.createElement('select');for(const value of ['approved','draft','cancelled','closed']){const option=document.createElement('option');option.value=value;option.textContent=value;option.selected=order.status===value;statusSelect.append(option);}text('label','Statut',edit).append(statusSelect);
    const editReason=document.createElement('textarea');editReason.required=true;editReason.minLength=3;editReason.maxLength=500;editReason.placeholder='Pourquoi cette correction est-elle nécessaire?';text('label','Raison obligatoire',edit).append(editReason);
    const revise=text('button','Vérifier et créer la révision',edit);revise.type='submit';
    edit.onsubmit=async event=>{event.preventDefault();if(!edit.reportValidity())return;let lines;try{lines=rows.map(row=>{const specification=structuredClone(row.line.specification||{}),measurements=JSON.parse(row.measures.value||'{}'),chosen=snapshot.catalogue.find(model=>model.id===row.selectedModel.value);specification.length=row.length.valueAsNumber;specification.material={...(specification.material||{}),type:row.material.value.trim(),gauge:row.gauge.value.trim()};specification.finish={...(specification.finish||{}),name:row.color.value.trim(),manufacturer:row.manufacturer.value.trim()};specification.coloredFace={...(specification.coloredFace||{}),side:row.face.value};specification.measurements=measurements;return{...row.line,quantity:row.quantity.valueAsNumber,modelId:chosen?.id||row.line.modelId,modelVersion:chosen?.version||row.line.modelVersion,specification};});}catch{status('Mesures invalides : utilisez un objet simple, par exemple {"A":"3 1/2"}.');return;}
     const message=(order.productionStarted?'La production a commencé. Une nouvelle mise en production pourra être nécessaire. ':'')+'Créer la révision '+(order.revision+1)+' sans modifier la commande ni le PDF précédents?';if(!confirm(message))return;
     revise.disabled=true;try{for(const row of lines){const validation=MIRProduction.buildProfile(row.specification);if(!validation.valid)throw Error('Le dessin révisé contient des cotes invalides');}const result=await client.reviseReceivedOrder(org(),{orderId:order.id,expectedRevision:order.revision,reason:editReason.value.trim(),snapshot:{...order.snapshot,notes:notes.value.trim(),status:statusSelect.value,jobId:order.jobId,jobReference:jobReference.value.trim(),lines}});let pdfReady=false;try{const faces=MIRProduction.productionPages({id:order.id,revision:String(result.revision),project:jobReference.value.trim(),notes:notes.value.trim(),items:lines.map((line,index)=>({id:'M'+String(index+1).padStart(3,'0'),spec:line.specification}))},{layout:'bending-sheet'});await MIRPDF.exportPlan({faces,title:'MIR — Commande révisée',subtitle:'Révision '+result.revision+' · original conservé',filename:'MIR-'+order.id+'-R'+result.revision+'.pdf'});pdfReady=true;}catch(pdfError){status('Révision enregistrée, mais le nouveau PDF n’a pas pu être préparé : '+pdfError.message);}if(pdfReady)status(result.productionWarning?'Révision et PDF créés. Nouvelle mise en production à confirmer.':'Révision et PDF créés; les originaux sont conservés.');await refresh();}catch(error){status('Révision non confirmée : '+error.message);}finally{revise.disabled=false;}
    };
   }
  }
  const focusId=new URLSearchParams(location.search).get('model');if(focusId)document.querySelector('[data-model-id="'+CSS.escape(focusId)+'"]')?.scrollIntoView({block:'start'});$('#retry').hidden=!(await client.pending(org()));status(destinationAllowed?'Données relues depuis le serveur. Stock et fabrication restent à valider.':'Ce catalogue nécessite un compte autorisé pour cette destination.');
 }
 async function start(){const memberships=await client.memberships();$('#organization').replaceChildren();for(const m of memberships){const option=document.createElement('option');option.value=m.id;option.textContent=m.name+' — '+m.role;$('#organization').append(option);}if(!memberships.length)throw Error('Aucun accès MIR actif');$('#login').hidden=true;$('#workspace').hidden=false;await refresh();}
 $('#login').hidden=false;$('#login').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await client.login(f.get('email'),f.get('password'));e.target.reset();await start();}catch(error){status(error.message);}};
 $('#import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024)throw Error('Sauvegarde trop volumineuse (maximum 3 Mo)');const original=await file.text(),records=MIRSharedClient.readModelBackup(original,window.MIRTemplateBackup);let reason='Import de modèle vérifié';if(!legacyAdminTestOnly){reason=(prompt('Pourquoi créez-vous ce modèle?')||'').trim();if(reason.length<3)throw Error('Une raison est obligatoire');if(!confirm('Créer '+records.length+' nouveau(x) modèle(s) en version 1?'))return;}let n=0;for(const record of records){if(legacyAdminTestOnly)await client.importMaster(org(),record);else{const template=record.versions?.find(version=>version.version===record.currentVersion)||record.versions?.at(-1);if(!template)throw Error('Version de modèle absente');await client.manageModel(org(),{action:'create',modelId:crypto.randomUUID(),expectedVersion:0,expectedRevision:0,name:record.name,description:record.description||'',specification:template,settings:{},reason});}n++;status(n+' modèle(s) créé(s). La sauvegarde originale reste intacte.');}await refresh();}catch(error){status('Création interrompue, reprise possible sans doublon : '+error.message);}};
 $('#refresh').onclick=()=>refresh().catch(e=>status('Actualisation impossible : '+e.message));$('#organization').onchange=$('#refresh').onclick;
 $('#retry').onclick=async()=>{try{const p=await client.pending(org());if(p){await client.submit(org(),p.model,p.configuration);await refresh();}}catch(e){if(e.code==='PT409')await refresh();status(e.message);}};
 $('#logout').onclick=async()=>{clearWorkspace();try{await client.logout();status('Déconnexion effectuée sur cet appareil.');}catch(e){status('Données masquées. Déconnexion non confirmée : '+e.message);}};
 try{await start();}catch(e){status(e.message);}
})().catch(()=>{document.querySelector('#status').textContent='Impossible de démarrer la connexion. Rechargez cette page.';});
