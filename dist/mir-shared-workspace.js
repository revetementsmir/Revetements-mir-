(async()=>{'use strict';
 const $=s=>document.querySelector(s),config=window.MIRSharedConfig;
 const status=message=>$('#status').textContent=message;
 if(!config?.enabled||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||'')){status('Espace partagé non activé. Le raccordement Supabase reste à valider.');return;}
 if(!window.MIRSupabase?.createClient){status('Le module de connexion n’a pas pu être chargé. Rechargez cette page.');return;}
 let snapshot,readSequence=0;
 function clearWorkspace(){readSequence++;snapshot=null;$('#workspace').hidden=true;for(const id of ['#catalogue','#orders','#job-admin','#organization'])$(id).replaceChildren();$('#import').value='';$('#retry').hidden=true;$('#login').hidden=false;}
 const client=MIRSharedClient.create({sdk:window.MIRSupabase.createClient(config.supabaseUrl,config.publishableKey),storage:localStorage,onSessionInvalidated:clearWorkspace});
 const text=(tag,value,parent)=>{const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;};
 const org=()=>$('#organization').value;
 function openLocalRequest(request){
  const key='mir_production_requests_v1',raw=localStorage.getItem(key),saved=raw?JSON.parse(raw):{version:1,requests:[]};
  if(saved.version!==1||!Array.isArray(saved.requests))throw Error('Anciennes données non reconnues : sauvegarde nécessaire');
  if(!saved.requests.some(row=>row.id===request.id)){
   saved.requests.push(request);if(localStorage.getItem(key)!==raw)throw Error('Un autre onglet a modifié les demandes');localStorage.setItem(key,JSON.stringify(saved));
  }
  location.href='production.html?shared-request='+encodeURIComponent(request.id);
 }
 async function refresh(){
  const sequence=++readSequence,requestedOrg=org(),next=await client.snapshot(requestedOrg);if(sequence!==readSequence||requestedOrg!==org())return;snapshot=next;$('#import-label').hidden=snapshot.role!=='admin';$('#catalogue').replaceChildren();$('#orders').replaceChildren();$('#job-admin').replaceChildren();
  if(snapshot.role==='admin'){const f=document.createElement('form'),name=document.createElement('input'),employee=document.createElement('select');name.placeholder='Nom du chantier';name.required=true;for(const m of snapshot.members.filter(m=>m.role==='employee')){const o=document.createElement('option');o.value=m.id;o.textContent=m.email||('Employé '+m.id);employee.append(o);}f.append(name,employee);text('button','Créer / affecter le chantier',f);$('#job-admin').append(f);f.onsubmit=async e=>{e.preventDefault();try{await client.assignJob(org(),name.value,employee.value);await refresh();}catch(e){status(e.message);}};}
  for(const model of snapshot.catalogue){
   const article=document.createElement('article');article.dataset.revision=model.revision;article.dataset.modelId=model.id;$('#catalogue').append(article);text('h2',model.name,article);
   text('p','Version '+model.version+' · '+model.conditions,article);
   const template=model.specification.template||model.specification,rules=model.configurationRules||{};
   if(snapshot.role==='admin'){
    if(model.supplierPo&&!model.archived){
     const prepare=text('button','Préparer un bon avec ce modèle partagé',article);prepare.type='button';prepare.dataset.sharedModelPo=model.id;
     prepare.onclick=async()=>{prepare.disabled=true;try{
      const requestedOrg=org(),current=await client.snapshot(requestedOrg),fresh=current.catalogue.find(row=>row.id===model.id);
      if(requestedOrg!==org()||current.role!=='admin'||!fresh||fresh.archived||!fresh.supplierPo||fresh.revision!==model.revision)throw Error('Publication modifiée : actualisez le catalogue');
      const options=fresh.configurationRules||{},t=fresh.specification.template||fresh.specification;
      const metal=(options.materials||fresh.specification.allowed?.materials||['aluminium','acier'])[0],color=options.fixed_color||options.colors?.[0]||'À confirmer';
      const result=MIRProduction.instantiateTemplate(t,{id:'M001',instanceId:'M001',measurements:{...fresh.standards,...fresh.locks,length:String(fresh.saleLengthIn)},unit:'in',length:fresh.saleLengthIn,quantity:1,material:{type:metal},finish:{name:color}});
      if(!result.ok)throw Error('Renseignez les mesures standards du modèle avant de préparer le bon');
      const id='MIR-MODELE-'+fresh.id+'-V'+fresh.version+'-P'+fresh.revision;
      openLocalRequest({id,createdAt:new Date().toISOString(),source:'shared-model-snapshot',status:'prepared_local',order:{notes:'Modèle partagé '+fresh.name+' · V'+fresh.version+' · '+fresh.conditions},items:[{id:'M001',kind:'profile',spec:result.spec,snapshot:result.snapshot,history:[],sourceSharedModel:{organizationId:requestedOrg,modelId:fresh.id,version:fresh.version,publicationRevision:fresh.revision}}]});
     }catch(e){status('Bon non préparé : '+e.message);}finally{prepare.disabled=false;}};
     text('p','Le bon de travail et son PDF seront préparés sur cet appareil. Aucun envoi automatique.',article);
    }
    const form=document.createElement('form');article.append(form);const controls={};
    for(const [key,label,value,type] of [['boutique','Boutique',model.boutique,'checkbox'],['store','Magasin employés',model.store,'checkbox'],['supplier_po','Bons fournisseurs',model.supplierPo,'checkbox'],['archived','Archivé',model.archived,'checkbox'],['aluminum_cents','Prix aluminium en cents / 10 pi',model.aluminumCents,'number'],['steel_cents','Prix acier en cents / 10 pi',model.steelCents,'number'],['sale_length_in','Longueur de vente (120 po; 144 uniquement J à soffite)',model.saleLengthIn,'number'],['conditions','Conditions',model.conditions,'text']]){
     const input=document.createElement('input');input.type=type;input.value=value??'';input.checked=value===true;if(type==='number'){input.min='1';input.step='1';}text('label',label,form).append(input);controls[key]=input;
    }
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
    const version=document.createElement('input');version.type='file';version.accept='.json,application/json';text('label','Charger une nouvelle version exportée — publication retirée pour revalidation',article).append(version);version.onchange=async()=>{try{const t=JSON.parse(await version.files[0].text());if(!MIRProduction.templatePreview(t).ok)throw Error('Géométrie non valide');await client.addVersion(org(),model,t);await refresh();}catch(e){status(e.message);}};
    const bar=document.createElement('div');bar.className='shared-save-bar';form.append(bar);const save=text('button','Enregistrer la publication',bar);save.type='submit';save.className='shared-save';const feedback=text('p','',bar);feedback.className='shared-save-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');form.onsubmit=async e=>{e.preventDefault();if(save.disabled)return;save.disabled=true;save.textContent='Enregistrement…';feedback.setAttribute('role','status');feedback.textContent='Enregistrement sur le serveur…';try{const settings={};for(const [key,input] of Object.entries(controls))settings[key]=input.type==='checkbox'?input.checked:input.type==='number'?(input.value?Number(input.value):null):key.endsWith('_measures')?JSON.parse(input.value):input.value;settings.standard_measures={};settings.locked_measures={};for(const [key,row] of Object.entries(measureControls)){if(row.value.value!=='')settings.standard_measures[key]=row.value.value;if(row.lock.checked){if(!row.value.value)throw Error('Renseignez la cote avant de la verrouiller');settings.locked_measures[key]=row.value.value;}}if(readRules)settings.configuration_rules=readRules();await client.publish(org(),model,settings);await refresh();const confirmation=document.querySelector('[data-model-id="'+model.id+'"] .shared-save-feedback');if(confirmation){confirmation.textContent='Publication enregistrée sur le serveur.';confirmation.scrollIntoView({block:'nearest'});}status('Publication enregistrée sur le serveur.');}catch(e){feedback.setAttribute('role','alert');feedback.textContent='Enregistrement non confirmé : '+e.message;status('Publication non confirmée : '+e.message);}finally{save.disabled=false;save.textContent='Enregistrer la publication';}};continue;
   }
   const form=document.createElement('form');article.append(form);
   const metal=document.createElement('select');for(const m of (rules.materials||(Array.isArray(model.specification.allowed?.materials)?model.specification.allowed.materials:['aluminium','acier'])).filter(m=>['aluminium','acier'].includes(m))){const o=document.createElement('option');o.value=m;o.textContent=m;metal.append(o);}text('label','Métal',form).append(metal);
   const color=document.createElement(rules.colors?.length?'select':'input');if(rules.colors?.length){for(const name of rules.colors){const option=document.createElement('option');option.value=name;option.textContent=name;color.append(option);}}else color.placeholder='Couleur demandée — à valider';color.required=true;if(rules.fixed_color)color.value=rules.fixed_color;color.disabled=Array.isArray(rules.color_edit_roles)&&!rules.color_edit_roles.includes(snapshot.role);text('label','Couleur demandée',form).append(color);
   const quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.max='10000';quantity.step='1';quantity.value='1';text('label','Quantité',form).append(quantity);
   text('p','Cotes en pouces — fractions acceptées, par exemple 3 1/2.',form);const measures={...model.standards,...model.locks},fields={};
   for(const field of template.fields||[]){const label=text('label',field.label||field.key,form);const input=document.createElement('input');input.value=field.key==='length'?String(model.saleLengthIn):measures[field.key]??'';input.required=field.required!==false;input.disabled=field.key==='length'||Object.hasOwn(model.locks,field.key)||(Array.isArray(rules.measure_edit_roles)&&!rules.measure_edit_roles.includes(snapshot.role));label.append(input);fields[field.key]=input;}
   const chantier=document.createElement('select');if(snapshot.role==='employee'){chantier.required=true;const empty=document.createElement('option');empty.value='';empty.textContent='Choisir un chantier affecté';chantier.append(empty);for(const job of snapshot.jobs){const o=document.createElement('option');o.value=job.id;o.textContent=job.name;chantier.append(o);}text('label','Chantier affecté',form).append(chantier);}
   const price=text('p','',form),drawing=document.createElement('div'),volume=document.createElement('div');let volumeOpen=false;form.append(drawing,volume);const toggle=text('button','Afficher la 3D',form);toggle.type='button';toggle.onclick=()=>{volumeOpen=!volumeOpen;toggle.textContent=volumeOpen?'Masquer la 3D':'Afficher la 3D';preview();};
   function preview(){const values=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]));
    const result=MIRProduction.instantiateTemplate(template,{measurements:values,unit:'in',length:model.saleLengthIn,quantity:Number(quantity.value),material:{type:metal.value},finish:{name:color.value||'À valider'}});
    drawing.innerHTML=result.ok?MIRProduction.profileSVG(result.spec,{width:620,height:260}):'';volume.innerHTML=volumeOpen&&result.ok?MIRProductionVolume.render(MIRProduction.buildProfile(result.spec),{width:620,height:320}):'';
    const cents=metal.value==='aluminium'?model.aluminumCents:model.steelCents;price.textContent=snapshot.role==='employee'?'Demande interne — disponibilité à confirmer':cents==null||model.saleLengthIn!==120?'Soumission requise':(cents/100).toFixed(2)+' $ CA / 10 pi · total de référence '+((cents*Number(quantity.value))/100).toFixed(2)+' $ CA · prix revérifié au serveur';
   }
   form.addEventListener('input',preview);preview();const submit=text('button','Transmettre pour validation',form);submit.type='submit';
   form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;try{
    const configuration={metal:metal.value,color:color.value,quantity:Number(quantity.value),measures:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,Object.hasOwn(model.locks,k)?model.locks[k]:v.value]))};
    if(snapshot.role==='employee')configuration.chantier=chantier.value;
    const id=await client.submit(org(),model,configuration);status('Demande enregistrée : '+id);await refresh();
   }catch(error){status('Non confirmé : '+error.message+' Votre demande reste conservée pour reprise.');$('#retry').hidden=false;}finally{button.disabled=false;}};
  }
  for(const order of snapshot.orders){const article=document.createElement('article');$('#orders').append(article);text('h3',order.id+' · '+(order.status==='draft'?'À valider par MIR':order.status),article);const request=order.snapshot,configuration=request.configuration||{};text('p','Quantité : '+(configuration.quantity??'À confirmer')+' · Métal : '+(configuration.metal||'À confirmer')+' · Couleur : '+(configuration.color||'À confirmer'),article);text('p','Cotes : '+Object.entries(configuration.measures||{}).map(([key,value])=>key+' = '+value).join(' · '),article);text('p',request.totalCents==null?'Demande de validation — tarif et disponibilité à confirmer':'Montant de référence : '+(request.totalCents/100).toFixed(2)+' $ CA · conditions de la demande conservées',article);
   if(snapshot.role==='admin'){
    const button=text('button','Préparer une copie dans les bons de pliage',article);button.onclick=()=>{try{
     const s=order.snapshot,c=s.configuration,t=s.specification.template||s.specification;
     const result=MIRProduction.instantiateTemplate(t,{id:'M001',instanceId:'M001',measurements:c.measures,unit:'in',length:s.saleLengthIn,quantity:c.quantity,material:{type:c.metal},finish:{name:c.color}});
     if(!result.ok)throw Error('Configuration à corriger avant production');
     openLocalRequest({id:order.id,createdAt:order.createdAt,status:'submitted',order:{project:c.chantier||'',notes:'Demande partagée '+order.id},items:[{id:'M001',kind:'profile',spec:result.spec,snapshot:result.snapshot,history:[]}]});
    }catch(e){status('Copie non préparée : '+e.message);}};
   }
  }
  const focusId=new URLSearchParams(location.search).get('model');if(focusId)document.querySelector('[data-model-id="'+CSS.escape(focusId)+'"]')?.scrollIntoView({block:'start'});$('#retry').hidden=!(await client.pending(org()));status('Données relues depuis le serveur. Stock et fabrication restent à valider.');
 }
 async function start(){const memberships=await client.memberships();$('#organization').replaceChildren();for(const m of memberships){const option=document.createElement('option');option.value=m.id;option.textContent=m.name+' — '+m.role;$('#organization').append(option);}if(!memberships.length)throw Error('Aucun accès MIR actif');$('#login').hidden=true;$('#workspace').hidden=false;await refresh();}
 $('#login').hidden=false;$('#login').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await client.login(f.get('email'),f.get('password'));e.target.reset();await start();}catch(error){status(error.message);}};
 $('#import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024)throw Error('Sauvegarde trop volumineuse (maximum 3 Mo)');const original=await file.text(),records=MIRSharedClient.readModelBackup(original,window.MIRTemplateBackup);let n=0;for(const record of records){await client.importMaster(org(),record);n++;status(n+' modèle(s) importé(s). La sauvegarde originale reste intacte.');}await refresh();}catch(error){status('Import interrompu, reprise possible sans doublon : '+error.message);}};
 $('#refresh').onclick=()=>refresh().catch(e=>status('Actualisation impossible : '+e.message));$('#organization').onchange=$('#refresh').onclick;
 $('#retry').onclick=async()=>{try{const p=await client.pending(org());if(p){await client.submit(org(),p.model,p.configuration);await refresh();}}catch(e){status(e.message);}};
 $('#logout').onclick=async()=>{clearWorkspace();try{await client.logout();status('Déconnexion effectuée sur cet appareil.');}catch(e){status('Données masquées. Déconnexion non confirmée : '+e.message);}};
 try{await start();}catch(e){status(e.message);}
})().catch(()=>{document.querySelector('#status').textContent='Impossible de démarrer la connexion. Rechargez cette page.';});
