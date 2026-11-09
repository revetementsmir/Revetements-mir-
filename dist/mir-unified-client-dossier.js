/* MIR — Vue commune du dossier client. Les deux sources existantes restent intactes.
 * Aucun nouvel espace de stockage ni écriture vers Supabase. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root){
  root.MIRUnifiedClientDossier=api;
  if(root.document){
   const start=()=>api.mount(root);
   if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});
   else start();
  }
 }
})(typeof window==='object'?window:null,function(){
 'use strict';
 const KEYS=Object.freeze({materials:'mir-shopping-list-v1',pieces:'mir_production_client_dossier_v1'});
 const copy=value=>JSON.parse(JSON.stringify(value));
 const clean=value=>String(value==null?'':value).trim().slice(0,120);
 const sameName=(left,right)=>clean(left).replace(/\s+/g,' ').toLocaleLowerCase('fr-CA')===clean(right).replace(/\s+/g,' ').toLocaleLowerCase('fr-CA');
 const filename=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'projet';
 function parse(storage,key){
  const raw=storage.getItem(key);
  if(raw===null)return {value:null};
  try{return {value:JSON.parse(raw)};}
  catch{return {error:'Sauvegarde locale illisible ('+key+'). Aucun fichier combiné ne sera produit.'};}
 }
 function read(storage,{allowedMaterialIndices=null}={}){
  const errors=[];
  let materialsRaw,piecesRaw,legacyRaw;
  try{
   const m=parse(storage,KEYS.materials),p=parse(storage,KEYS.pieces),legacy=parse(storage,'mir-bending-v1');
   if(legacy.error)errors.push(legacy.error);
   legacyRaw=legacy.value;
   if(m.error)errors.push(m.error);
   if(p.error)errors.push(p.error);
   materialsRaw=m.value;piecesRaw=p.value;
  }catch{errors.push('Lecture locale refusée. Vérifiez les paramètres du navigateur.');}
  if(materialsRaw!==undefined&&materialsRaw!==null&&
    (materialsRaw.version!==1||!Array.isArray(materialsRaw.items)))errors.push('Format de sélection de matériaux inconnu.');
  if(piecesRaw!==undefined&&piecesRaw!==null&&
    (piecesRaw.version!==1||!piecesRaw.order||!Array.isArray(piecesRaw.order.items)))errors.push('Format de dossier de fabrication inconnu.');
  if(legacyRaw!=null&&(legacyRaw.version!==1||!Array.isArray(legacyRaw.items)))errors.push('Ancien dossier de pliage illisible.');
  const legacyCount=Array.isArray(legacyRaw?.items)?legacyRaw.items.length:0;
  const allMaterials=Array.isArray(materialsRaw?.items)?materialsRaw.items:[];
  const allowed=allowedMaterialIndices==null?null:new Set(allowedMaterialIndices.filter(n=>Number.isInteger(n)&&n>=0));
  const materials=allMaterials.filter((item,i)=>{
   if(allowed&&!allowed.has(i))return false;
   if(!item||typeof item.materialId!=='string'||!item.materialId||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>1000000){
    errors.push('Une ligne de matériaux est invalide. Corrigez-la dans Ma sélection.');return false;
   }
   return true;
  });
  const order=piecesRaw?.order&&Array.isArray(piecesRaw.order.items)?piecesRaw.order:null;
  const pieces=(order?.items||[]).filter(item=>{
   if(!item||!item.spec||!item.snapshot||item.snapshot.schema!=='mir-production-instance-1'){
    errors.push('Une pièce n’a pas de dessin ou de version compatible. Ouvrez le configurateur avant export.');return false;
   }
   return true;
  });
  const materialProject=clean(materialsRaw?.project),pieceProject=clean(order?.project);
  let link='ready';
  if(materials.length&&pieces.length&&!sameName(materialProject,pieceProject)){
   if(materialProject&&!pieceProject)link='associate-pieces';
   else if(!materialProject&&pieceProject)link='associate-materials';
   else link='conflict';
  }
  const project=materialProject||pieceProject;
  const state={schema:'mir-unified-client-view-1',materialProject,pieceProject,project,
   materials:copy(materials),pieces:copy(pieces),order:order?copy(order):null,
   excludedMaterials:allMaterials.length-materials.length,legacyCount,link,
   errors:[...new Set(errors)]};
  // Les anciens pliages rapides ne sont pas des dessins de fabrication versionnés : ne pas les exclure silencieusement.
  state.ready=state.errors.length===0&&state.legacyCount===0&&state.link==='ready'&&(state.materials.length+state.pieces.length)>0;
  return state;
 }
 function payload(state,now=new Date().toISOString()){
  if(!state.ready)throw Error('Le dossier commun nécessite un projet cohérent et des sauvegardes valides.');
  return {schema:'mir-unified-client-dossier-1',version:1,createdAt:now,
   status:'preparation_locale_non_commandee',localOnly:true,transmitted:false,
   project:state.project||'',
   materials:{sourceKey:KEYS.materials,version:1,items:copy(state.materials),excludedCount:state.excludedMaterials},
   pieces:{sourceKey:KEYS.pieces,version:1,order:state.order?copy(state.order):null},
   notes:['Dossier de préparation uniquement. Aucun paiement, commande ou envoi.',
    'Prix, stock, couleurs, dimensions et règles de fabrication à confirmer par MIR.']};
 }
 function pdfOptions(state,{selectionPDF,production,bendTariff}={}){
  if(!state.ready)throw Error('Vérifiez les noms de projet et les éléments enregistrés avant export.');
  const faces=[];
  if(state.materials.length){
   if(!selectionPDF?.buildOptions)throw Error('Moteur de PDF des matériaux indisponible.');
   faces.push(...selectionPDF.buildOptions({project:state.project,items:state.materials,excludedCount:state.excludedMaterials}).faces);
  }
  if(state.pieces.length){
   if(!production?.productionPages)throw Error('Moteur de fiches cotées indisponible.');
   faces.push(...production.productionPages({
    ...state.order,items:state.pieces.map(item=>item.snapshot||item.spec)
   },{document:'client-request',bendTariff}));
  }
  if(!faces.length)throw Error('Aucune pièce ou aucun matériau à exporter.');
  return {title:'MIR — Dossier matériaux et pièces sur mesure',
   subtitle:state.project||'Projet sans nom',
   filename:'MIR-dossier-complet-'+filename(state.project)+'.pdf',faces};
 }
 function associate(storage,state){
  if(state.link!=='associate-pieces'||state.errors.length)return false;
  const raw=storage.getItem(KEYS.pieces);if(!raw)return false;
  const current=JSON.parse(raw);
  if(current.version!==1||!Array.isArray(current.order?.items)||clean(current.order.project)||
    current.order.items.length!==state.pieces.length||!state.materialProject)return false;
  current.order.project=state.materialProject;
  storage.setItem(KEYS.pieces,JSON.stringify(current));
  return true;
 }
 function mount(win){
  const doc=win.document,section=doc.querySelector('#mir-unified-dossier');
  if(!section)return null;
  const $=sel=>section.querySelector(sel);
  const message=$('#mir-unified-message'),list=$('#mir-unified-pieces'),count=$('#mir-unified-count');
  const join=$('#mir-unified-associate'),pdf=$('#mir-unified-pdf'),json=$('#mir-unified-json'),status=$('#mir-unified-export-status');
  let busy=false,current=null,bendTariff,loadingTariff=false;
  const currency=new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'});
  async function refreshTariff(){
   if(loadingTariff||!current?.pieces.some(item=>item.spec.kind==='profile'))return;
   loadingTariff=true;
   try{bendTariff=await win.MIRBendPricing.load(win.MIRPortalConfig);}
   catch{bendTariff=undefined;}
   finally{loadingTariff=false;render();}
  }
  const render=()=>{
   const available=[...doc.querySelectorAll('#selection-items [data-selection-preview]')]
    .map(el=>Number(el.dataset.selectionPreview));
   current=read(win.localStorage,{allowedMaterialIndices:available});
   const n=current.pieces.length;
   count.textContent=n+' pièce'+(n===1?'':'s')+' sur mesure';
   list.replaceChildren();
   if(n){
    for(const item of current.pieces){
     const row=doc.createElement('li'),strong=doc.createElement('strong');
     strong.textContent=clean(item.spec?.name||item.snapshot?.templateSnapshot?.name||item.id||'Pièce');
     const detail=doc.createElement('span'),quantity=Number(item.spec?.quantity)||1;
     const code=clean(item.spec?.finish?.code||item.spec?.finish?.name||'Couleur à confirmer');
     detail.textContent=' · '+quantity+' pièce'+(quantity===1?'':'s')+' · '+code+' · repère '+clean(item.id);
     const price=item.spec.kind==='profile'?win.MIRProduction?.pricePiece(item,{bendTariff}):null;
     if(price?.status==='priced')detail.textContent+=' · '+currency.format(price.lineCents/100)+' avant taxes et livraison';
     row.append(strong,detail);list.append(row);
    }
   }else{
    const row=doc.createElement('li');row.textContent='Aucune pièce sur mesure dans le configurateur de ce navigateur.';list.append(row);
   }
   join.hidden=true;join.disabled=true;
   if(current.errors.length)message.textContent=current.errors.join(' ');
   else if(current.link==='associate-pieces'){
    message.textContent='Les matériaux sont au projet « '+current.materialProject+' », mais les pliages n’ont pas de nom de projet. Vous pouvez les associer explicitement.';
    join.textContent='Associer ces pliages au projet « '+current.materialProject+' »';
    join.hidden=false;join.disabled=false;
   }else if(current.link==='associate-materials'){
    message.textContent='Les pliages sont au projet « '+current.pieceProject+' », mais la sélection n’a pas de nom. Vous pouvez utiliser le même nom.';
    join.textContent='Nommer ma sélection « '+current.pieceProject+' »';
    join.hidden=false;join.disabled=false;
   }else if(current.link==='conflict'){
    message.textContent='Projets différents : matériaux « '+current.materialProject+' » et pièces « '+current.pieceProject+' ». Corrigez le nom dans le configurateur; aucun regroupement automatique.';
   }else if(!current.materials.length&&!current.pieces.length){
    message.textContent='Ajoutez un matériau ou une moulure pour préparer votre dossier.';
   }else{
    message.textContent='Même projet pour les matériaux et les pièces. Aucun nouvel espace de sauvegarde ni envoi automatique.';
   }
   if(current.legacyCount){
    message.textContent+=' '+current.legacyCount+' ancien(s) pliage(s) du formulaire rapide restent séparés. Leur reprise dans le configurateur coté est nécessaire avant un PDF déclaré complet; rien n’a été effacé.';
   }
   const active=current.ready&&current.pieces.length>0&&!busy;
   pdf.disabled=!active;json.disabled=!active;
   return current;
  };
  join.addEventListener('click',()=>{
   const state=render();
   if(state.link==='associate-pieces'){
    try{
     if(!associate(win.localStorage,state))throw Error('Le dossier a changé : vérifiez-le puis réessayez.');
     status.textContent='Les pièces ont été associées sans modifier les dessins ni leurs versions.';
    }catch(error){status.textContent=error.message;}
   }else if(state.link==='associate-materials'){
    const input=doc.querySelector('#selection-project-name');
    if(input){input.value=state.pieceProject;input.dispatchEvent(new win.Event('input',{bubbles:true}));
     status.textContent='Nom du projet appliqué à la sélection existante.';}
   }
   render();
  });
  json.addEventListener('click',()=>{
   try{
    const state=render(),data=payload(state);
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=doc.createElement('a');a.href=url;a.download='MIR-dossier-complet-'+filename(data.project)+'.json';
    a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    status.textContent='Sauvegarde JSON complète prête. Aucun envoi.';
   }catch(error){status.textContent='Sauvegarde impossible : '+error.message;}
  });
  pdf.addEventListener('click',async()=>{
   if(busy)return;
   busy=true;pdf.disabled=true;json.disabled=true;
   status.textContent='Préparation des pages matériaux et des croquis cotés…';
   try{
    const state=render(),options=pdfOptions(state,{selectionPDF:win.MIRSelectionPDF,production:win.MIRProduction,bendTariff});
    if(!win.MIRPDF?.exportPlan)throw Error('Moteur PDF indisponible.');
    const result=await win.MIRPDF.exportPlan(options);
    status.textContent='Dossier complet prêt · '+result.pages+' page'+(result.pages===1?'':'s')+'. Utilisez Télécharger dans le panneau.';
   }catch(error){status.textContent='PDF non préparé : '+error.message+'. Le JSON et les dossiers originaux restent disponibles.';}
   finally{busy=false;render();}
  });
  const selection=doc.querySelector('#selection-items');
  if(selection&&win.MutationObserver){
   const observer=new win.MutationObserver(()=>render());
   observer.observe(selection,{childList:true,subtree:true});
  }
  doc.addEventListener('input',event=>{if(event.target?.id==='selection-project-name')queueMicrotask(render);});
  doc.addEventListener('change',event=>{if(event.target?.closest?.('#selection-items'))queueMicrotask(render);});
  win.addEventListener('storage',event=>{if([KEYS.materials,KEYS.pieces].includes(event.key))render();});
  win.addEventListener('pageshow',event=>{render();if(event.persisted)void refreshTariff();});
  render();
  void refreshTariff();
  return Object.freeze({render});
 }
 return Object.freeze({version:'1.0.0',KEYS,read,associate,payload,pdfOptions,mount});
});