(async()=>{'use strict';
 const $=s=>document.querySelector(s),config=window.MIRSharedConfig;
 const status=message=>$('#status').textContent=message;
 if(!config?.enabled||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||'')){status('Espace partagé non activé. Le raccordement Supabase reste à valider.');return;}
 if(!window.MIRSupabase?.createClient){status('Le module de connexion n’a pas pu être chargé. Rechargez cette page.');return;}
 const client=MIRSharedClient.create({sdk:window.MIRSupabase.createClient(config.supabaseUrl,config.publishableKey),storage:localStorage});let snapshot,readSequence=0;
 const text=(tag,value,parent)=>{const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;};
 const org=()=>$('#organization').value;
 async function refresh(){
  const sequence=++readSequence,requestedOrg=org(),next=await client.snapshot(requestedOrg);if(sequence!==readSequence||requestedOrg!==org())return;snapshot=next;$('#import-label').hidden=snapshot.role!=='admin';$('#catalogue').replaceChildren();$('#orders').replaceChildren();$('#job-admin').replaceChildren();
  if(snapshot.role==='admin'){const f=document.createElement('form'),name=document.createElement('input'),employee=document.createElement('select');name.placeholder='Nom du chantier';name.required=true;for(const m of snapshot.members.filter(m=>m.role==='employee')){const o=document.createElement('option');o.value=m.id;o.textContent=m.email||('Employé '+m.id);employee.append(o);}f.append(name,employee);text('button','Créer / affecter le chantier',f);$('#job-admin').append(f);f.onsubmit=async e=>{e.preventDefault();try{await client.assignJob(org(),name.value,employee.value);await refresh();}catch(e){status(e.message);}};}
  for(const model of snapshot.catalogue){
   const article=document.createElement('article');article.dataset.revision=model.revision;$('#catalogue').append(article);text('h2',model.name,article);
   text('p','Version '+model.version+' · '+model.conditions,article);
   const template=model.specification.template||model.specification;
   if(snapshot.role==='admin'){
    const form=document.createElement('form');article.append(form);const controls={};
    for(const [key,label,value,type] of [['boutique','Boutique',model.boutique,'checkbox'],['store','Magasin employés',model.store,'checkbox'],['supplier_po','Bons fournisseurs',model.supplierPo,'checkbox'],['archived','Archivé',model.archived,'checkbox'],['aluminum_cents','Prix aluminium en cents / 10 pi',model.aluminumCents,'number'],['steel_cents','Prix acier en cents / 10 pi',model.steelCents,'number'],['sale_length_in','Longueur de vente (120 po; 144 uniquement J à soffite)',model.saleLengthIn,'number'],['conditions','Conditions',model.conditions,'text']]){
     const input=document.createElement('input');input.type=type;input.value=value??'';input.checked=value===true;if(type==='number'){input.min='1';input.step='1';}text('label',label,form).append(input);controls[key]=input;
    }
    const measureControls={};for(const field of template.fields||[]){if(field.key==='length')continue;const row=text('label',field.label||field.key,form),value=document.createElement('input'),lock=document.createElement('input');value.value=model.standards[field.key]??model.locks[field.key]??'';value.placeholder='Mesure standard, ex. 3 1/2';lock.type='checkbox';lock.checked=Object.hasOwn(model.locks,field.key);row.append(value);text('span','Verrouiller cette cote',row).append(lock);measureControls[field.key]={value,lock};}
    const version=document.createElement('input');version.type='file';version.accept='.json,application/json';text('label','Charger une nouvelle version exportée — publication retirée pour revalidation',article).append(version);version.onchange=async()=>{try{const t=JSON.parse(await version.files[0].text());if(!MIRProduction.templatePreview(t).ok)throw Error('Géométrie non valide');await client.addVersion(org(),model,t);await refresh();}catch(e){status(e.message);}};
    text('button','Enregistrer la publication',form);form.onsubmit=async e=>{e.preventDefault();try{const settings={};for(const [key,input] of Object.entries(controls))settings[key]=input.type==='checkbox'?input.checked:input.type==='number'?(input.value?Number(input.value):null):key.endsWith('_measures')?JSON.parse(input.value):input.value;settings.standard_measures={};settings.locked_measures={};for(const [key,row] of Object.entries(measureControls)){if(row.value.value!=='')settings.standard_measures[key]=row.value.value;if(row.lock.checked){if(!row.value.value)throw Error('Renseignez la cote avant de la verrouiller');settings.locked_measures[key]=row.value.value;}}await client.publish(org(),model,settings);await refresh();}catch(e){status('Publication non confirmée : '+e.message);}};continue;
   }
   const form=document.createElement('form');article.append(form);
   const metal=document.createElement('select');for(const m of (Array.isArray(model.specification.allowed?.materials)?model.specification.allowed.materials:['aluminium','acier']).filter(m=>['aluminium','acier'].includes(m))){const o=document.createElement('option');o.value=m;o.textContent=m;metal.append(o);}text('label','Métal',form).append(metal);
   const color=document.createElement('input');color.placeholder='Couleur demandée — à valider';color.required=true;text('label','Couleur demandée',form).append(color);
   const quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.max='10000';quantity.step='1';quantity.value='1';text('label','Quantité',form).append(quantity);
   text('p','Cotes en pouces — fractions acceptées, par exemple 3 1/2.',form);const measures={...model.standards,...model.locks},fields={};
   for(const field of template.fields||[]){const label=text('label',field.label||field.key,form);const input=document.createElement('input');input.value=field.key==='length'?String(model.saleLengthIn):measures[field.key]??'';input.required=field.required!==false;input.disabled=field.key==='length'||Object.hasOwn(model.locks,field.key);label.append(input);fields[field.key]=input;}
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
     const key='mir_production_requests_v1',raw=localStorage.getItem(key),saved=raw?JSON.parse(raw):{version:1,requests:[]};
     if(saved.version!==1||!Array.isArray(saved.requests))throw Error('Anciennes données non reconnues : sauvegarde nécessaire');
     if(!saved.requests.some(r=>r.id===order.id)){
      saved.requests.push({id:order.id,createdAt:order.createdAt,status:'submitted',order:{project:c.chantier||'',notes:'Demande partagée '+order.id},items:[{id:'M001',kind:'profile',spec:result.spec,snapshot:result.snapshot,history:[]}]});
      if(localStorage.getItem(key)!==raw)throw Error('Un autre onglet a modifié les demandes');localStorage.setItem(key,JSON.stringify(saved));
     }
     location.href='production.html?shared-request='+encodeURIComponent(order.id);
    }catch(e){status('Copie non préparée : '+e.message);}};
   }
  }
  $('#retry').hidden=!(await client.pending(org()));status('Données relues depuis le serveur. Stock et fabrication restent à valider.');
 }
 async function start(){const memberships=await client.memberships();$('#organization').replaceChildren();for(const m of memberships){const option=document.createElement('option');option.value=m.id;option.textContent=m.name+' — '+m.role;$('#organization').append(option);}if(!memberships.length)throw Error('Aucun accès MIR actif');$('#login').hidden=true;$('#workspace').hidden=false;await refresh();}
 $('#login').hidden=false;$('#login').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await client.login(f.get('email'),f.get('password'));e.target.reset();await start();}catch(error){status(error.message);}};
 $('#import').onchange=async e=>{try{const original=await e.target.files[0].text(),backup=JSON.parse(original);if(backup.version!==1||!Array.isArray(backup.records))throw Error('Sauvegarde de modèles version 1 requise');let n=0;for(const record of backup.records){await client.importMaster(org(),record);n++;status(n+' modèle(s) importé(s). La sauvegarde originale reste intacte.');}await refresh();}catch(error){status('Import interrompu, reprise possible sans doublon : '+error.message);}};
 $('#refresh').onclick=()=>refresh().catch(e=>status('Actualisation impossible : '+e.message));$('#organization').onchange=$('#refresh').onclick;
 $('#retry').onclick=async()=>{try{const p=await client.pending(org());if(p){await client.submit(org(),p.model,p.configuration);await refresh();}}catch(e){status(e.message);}};
 $('#logout').onclick=async()=>{readSequence++;try{await client.logout();}finally{$('#workspace').hidden=true;$('#catalogue').replaceChildren();$('#orders').replaceChildren();$('#login').hidden=false;}};
 try{await start();}catch(e){status(e.message);}
})().catch(()=>{document.querySelector('#status').textContent='Impossible de démarrer la connexion. Rechargez cette page.';});
