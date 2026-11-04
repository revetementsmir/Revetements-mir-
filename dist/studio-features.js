/* Client-facing controls around the shared plan model. No separate geometry store. */
(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ft=m=>m/.3048,metres=n=>n*.3048,finite=n=>typeof n==='number'&&Number.isFinite(n),fmt=n=>finite(n)?Number(n.toFixed(3)):'';
 function setup(api){
  const {$,state,data,materials,modify,save,render,renderDrawing,officialColor,colorsFor,openMaterial,toast}=api;
  const imported=data().projectKind==='imported-pdf',byId=new Map(materials.map(m=>[m.id,m])),C=root.MIRMaterialCoverage;
  const roofs=materials.filter(m=>m.applications.includes('roofing'));
  const roofControls=api.roofControls!==false;
  const roofBrands=[...new Set(roofs.map(m=>m.brand))];
  const wraps=materials.filter(m=>m.applications.includes('bending'));
  const siding=materials.filter(m=>m.applications.some(a=>['siding','masonry'].includes(a)));
  let part='facade',returnId=state().selected?.kind==='return'&&state().selected.id==='return-right'?'return-right':'return-left',objectUrl=null;
  const study=!imported&&root.MIR3D?.studyDefaults?root.MIR3D.studyDefaults(data().dimensions):{};
  const copy=value=>JSON.parse(JSON.stringify(value));
  function ensureState(){
   const s=state();
   // Reset and cross-tab restoration replace the state object after setup.
   // Clone the study defaults so editing a beam cannot mutate its reset value.
   if(!Array.isArray(s.structures))s.structures=copy(study.structures||[]);
   if(!s.porch||typeof s.porch!=='object'||Array.isArray(s.porch))s.porch=copy(study.porch||{enabled:false});
   if(!['duplex','gable','hip','flat'].includes(s.roofStyle))s.roofStyle=imported?'flat':study.roofStyle||'duplex';
   if(!finite(s.cameraElevation))s.cameraElevation=22;
   if(!s.returnFinishes||typeof s.returnFinishes!=='object'||Array.isArray(s.returnFinishes))s.returnFinishes={};
   if(!s.roofId&&roofs.length){s.roofId=roofs[0].id;const colors=colorsFor(roofs[0]),c=colors.find(c=>c.id==='bp-mystique-noir-2-tons')||colors[0];s.roofColorId=c?.id;}
   // The admin keeps the client's roof appearance, without a roof editing panel.
   if(!roofControls&&s.selected?.kind==='roof')s.selected={kind:'zone',id:api.allZones(api.face())[0]?.id||null};
   normalizeRoof();return s;
  }
  function normalizeRoof(){const m=byId.get(state().roofId),c=officialColor(m,{colorId:state().roofColorId});state().roofColor=c.color;state().roofColorId=c.colorId;}
  ensureState();
  function currentStructure(){ensureState();return state().structures.find(x=>x.id===state().selected?.id)||state().structures[0];}
  function dimensions(){return state().volumeOverride||data().dimensions;}
  function canRender(){ensureState();const d=dimensions();return d&&['width','depth','wallHeight'].every(k=>finite(d[k])&&d[k]>0)&&finite(d.roofRise)&&d.roofRise>=0;}
  function finish(m,raw={}){return {...raw,materialId:m?.id||null,...officialColor(m,raw)};}
  function returnChoice(id){ensureState();const raw=state().returnFinishes[id];if(raw)return api.normalChoice(raw);const f=data().faces.find(f=>f.key==='front'),z=f?.zones.find(z=>z.id==='centre_RDC')||f?.zones[0];return z?api.choice(f,z):api.normalChoice({},siding[0]?.id);}
  function selectPart(next,id){
   if(next==='roof'&&!roofControls)return;
   part=next;if(next==='return')returnId=id||'return-left';
   if(next==='structure')state().selected={kind:'structure',id:id||state().structures?.[0]?.id||null};
   else if(['roof','soffit','fascia','return'].includes(next))state().selected={kind:next,id:id||next};
   else if(next==='facade'&&!['zone','opening'].includes(state().selected.kind))state().selected={kind:'zone',id:api.allZones(api.face())[0]?.id||null};
   save();render();if(window.innerWidth<801)$('#studio-controls').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function inferredPart(){const kind=state().selected.kind;return kind==='zone'||kind==='opening'?'facade':['roof','soffit','fascia','structure','return'].includes(kind)?kind:part;}
  function choiceHTML(m,colorId,attr){const cs=colorsFor(m);return `<div class="extra-colors">${cs.map(c=>`<button ${attr}="${esc(c.id)}" aria-pressed="${c.id===colorId}" title="${esc(c.name)}">${c.swatchUrl?`<img src="${esc(c.swatchUrl)}" alt="" loading="lazy">`:''}<span>${esc(c.name)}</span></button>`).join('')}</div>${cs.length?'':'<p>Le nuancier exact de ce produit reste à confirmer.</p>'}`;}
  function returnSizeHTML(m,c){
   if(!C||!m)return '';
   const spec=C.coverageSpec(m,c),fixed=C.coverageSpec(m,{...c,exposureIn:undefined});
   if(spec.type==='panel'){
    const formats=C.formats(m);
    if(!formats.length)return '<p class="small-note">Dimensions physiques du panneau à confirmer : les joints de format ne sont pas dessinés.</p>';
    return `<label for="return-format">Format du panneau</label><select id="return-format">${!spec.formatId?'<option value="" selected>Choisir un format documenté</option>':''}${formats.map(f=>`<option value="${esc(f.id)}"${f.id===spec.formatId?' selected':''}>${esc(f.label)}</option>`).join('')}</select><p class="small-note">Les joints suivent le format choisi et le sens de pose. La dernière pièce conserve sa coupe.</p>`;
   }
   if(spec.type!=='board'||fixed.exposureIn)return '';
   const range=fixed.exposureRangeIn,value=finite(c.exposureIn)&&c.exposureIn>0?c.exposureIn:'';
   return `<label for="return-exposure">Couvrance visible par rang (po)</label><input id="return-exposure" type="number" min="${range?range[0]:0}"${range?` max="${range[1]}"`:''} step="any" inputmode="decimal" value="${esc(value)}" placeholder="À préciser"><p class="small-note">${range?`Choisissez le pureau de pose entre ${fmt(range[0])} et ${fmt(range[1])} po.`:'Précisez la largeur réellement visible après recouvrement.'} Cette mesure est votre saisie de projet. Sans elle, aucun nombre de rangs n’est supposé.</p>`;
  }
  function optionHTML(rows,id){return rows.map(m=>`<option value="${esc(m.id)}"${m.id===id?' selected':''}>${esc(m.brand)} · ${esc(m.name)}</option>`).join('');}
  function selectRoof(id,focusId='roof-product'){const m=roofs.find(m=>m.id===id);if(!roofControls||!m)return;modify(()=>{state().roofId=m.id;state().roofColorId=(colorsFor(m).find(c=>c.id===m.defaultColorId)||colorsFor(m)[0])?.id||null;normalizeRoof();});$('#'+focusId)?.focus({preventScroll:true});}
  function structurePanel(){
   const o=currentStructure();if(!o)return `<div class="extra-panel"><p class="eyebrow">LES ÉLÉMENTS MÉTALLIQUES</p><h2>Poutres & colonnes</h2><p>Ajoutez un élément repéré sur votre plan pour choisir son habillage. Un poteau dessiné ne permet pas, à lui seul, de connaître sa matière.</p><div class="compact-actions"><button data-add-structure="column">＋ Colonne</button><button data-add-structure="beam">＋ Poutre</button></div></div>`;
   const m=byId.get(o.finishMaterialId),c=officialColor(m,{colorId:o.colorId}),d=dimensions()||{width:0,depth:0};
   const fields=[['x','Depuis la gauche (pi)',ft(o.origin[0]+d.width/2)],['y','Devant la façade (pi)',ft(-o.origin[1]-d.depth/2)],['z','Hauteur de départ (pi)',ft(o.origin[2])],['w','Largeur (po)',o.size[0]/.0254],['depth','Profondeur (po)',o.size[1]/.0254],['h','Hauteur (pi)',ft(o.size[2])]];
   return `<div class="extra-panel"><p class="eyebrow">POUTRES & COLONNES</p><h2>Les détails qui changent tout.</h2><label for="structure-select">Élément à modifier</label><select id="structure-select">${state().structures.map(x=>`<option value="${esc(x.id)}"${x.id===o.id?' selected':''}>${esc(x.label||x.id)}</option>`).join('')}</select><p class="structure-meta">${esc(o.sourceStatus==='user-added'?'Élément ajouté au projet.':o.provenance||'Repéré sur le plan; dimensions de représentation à confirmer.')} Le support et son habillage sont deux choix distincts.</p><label for="structure-wrap">Habillage / métal de finition</label><select id="structure-wrap"><option value="">Choisir un produit de finition</option>${optionHTML(wraps,o.finishMaterialId)}</select>${choiceHTML(m,o.colorId,'data-structure-color')}<p class="small-note">${esc(m?.colorStatus==='collection_only'?'Teintes de collection; disponibilité du rouleau à confirmer.':'Choisissez une couleur documentée du produit d’habillage.')}</p><details><summary>Position et dimensions</summary><div class="pair">${fields.map(([k,label,v])=>`<label>${label}<input type="number" data-structure-field="${k}" value="${fmt(v)}" step="0.125"></label>`).join('')}</div><label for="structure-support">Matière du support</label><select id="structure-support"><option value="unknown">À confirmer sur le plan</option><option value="steel"${o.material==='steel'?' selected':''}>Acier</option><option value="aluminum"${o.material==='aluminum'?' selected':''}>Aluminium</option><option value="wood"${o.material==='wood'?' selected':''}>Bois</option></select><button data-delete-structure class="delete-region">Retirer cet élément du projet</button></details><div class="compact-actions"><button data-add-structure="column">＋ Colonne</button><button data-add-structure="beam">＋ Poutre</button></div></div>`;
  }
  function renderUI(){
   ensureState();
   part=inferredPart();if(part==='return'&&['return-left','return-right'].includes(state().selected.id))returnId=state().selected.id;const extra=$('#extra-controls');if(!extra)return;
   const names={facade:'FAÇADE',roof:'TOITURE',soffit:'SOFFITE',fascia:'FASCIA',structure:'POUTRES & COLONNES',return:'RETOUR DE MUR'};
   $('#control-part-name').textContent=names[part];
   document.querySelectorAll('[data-part]').forEach(b=>{b.hidden=b.dataset.part==='roof'&&!roofControls;b.setAttribute('aria-pressed',b.dataset.part===(part==='return'?'facade':part));});
   $('.zone-controls').hidden=part!=='facade';$('#finish-controls').hidden=!['soffit','fascia'].includes(part);$('#finish-controls').open=['soffit','fascia'].includes(part);
   extra.hidden=!['roof','structure','return'].includes(part);
   const finish=$('#finish-controls');finish.querySelector('summary span:nth-child(2)').textContent=part==='fascia'?'Fascia · bord de toiture':'Soffite · dessous de toiture';
   for(const k of ['soffit','fascia']){for(const e of finish.querySelectorAll(`[id^="${k}-"],label[for^="${k}-"]`))e.hidden=part!==k;}
   finish.querySelector('.finish-divider').hidden=true;
   if(part==='roof'){
    const m=byId.get(state().roofId),cs=colorsFor(m),selected=cs.find(c=>c.id===state().roofColorId),rows=roofs.filter(r=>r.brand===m?.brand);
    extra.innerHTML=`<div class="extra-panel roof-panel"><p class="eyebrow">LE BARDEAU</p><h2>Le toit qui complète votre façade.</h2><p>Choisissez votre fabricant, votre gamme et sa couleur.</p><label for="roof-brand">Fabricant du bardeau</label><select id="roof-brand">${roofBrands.map(brand=>`<option value="${esc(brand)}"${brand===m?.brand?' selected':''}>${esc(brand)}</option>`).join('')}</select><label for="roof-product">Gamme de bardeaux</label><select id="roof-product">${rows.map(r=>`<option value="${esc(r.id)}"${r.id===m?.id?' selected':''}>${esc(r.collection||r.name)}</option>`).join('')}</select><p class="roof-palette-label">${cs.length} couleurs de cette gamme</p>${choiceHTML(m,state().roofColorId,'data-roof-color')}<p class="roof-selection" role="status">${selected?`Couleur choisie : <strong>${esc(selected.name)}</strong>`:'Choisissez une couleur de cette gamme.'}</p><p class="small-note">${esc(m?.regionalAvailabilityNote||'Nuancier du fabricant. Disponibilité locale à confirmer.')} Le rendu à l’écran est indicatif; l’échantillon physique reste la référence.</p><button data-roof-docs class="small-link">Couleurs & documentation du fabricant ↗</button><p class="small-note roof-visualization-note">Choix visuel seulement, enregistré avec votre projet.</p></div>`;
   }else if(part==='structure')extra.innerHTML=structurePanel();
   else if(part==='return'){
    const c=returnChoice(returnId),m=byId.get(c.materialId);extra.innerHTML=`<div class="extra-panel"><p class="eyebrow">LES COINS DU BÂTIMENT</p><h2>${returnId==='return-left'?'Retour gauche':'Retour droit'} du retrait</h2><p>Cette surface latérale a son propre revêtement. Sa profondeur suit le volume du retrait.</p><label for="return-product">Matériau de ce retour</label><select id="return-product">${optionHTML(siding,c.materialId)}</select>${choiceHTML(m,c.colorId,'data-return-color')}${returnSizeHTML(m,c)}<label for="return-orientation">Sens de pose</label><select id="return-orientation">${(m.allowedOrientations||[]).map(v=>`<option value="${v}"${v===c.orientation?' selected':''}>${v==='vertical'?'Vertical':'Horizontal'}</option>`).join('')}</select><div class="compact-actions"><button data-select-return="return-left">Retour gauche</button><button data-select-return="return-right">Retour droit</button></div></div>`;
   }
   $('#duplicate-zone').disabled=state().selected.kind!=='zone'||!api.currentZone();
   $('#project-name').textContent=imported?data().title||'Mon plan importé':'Étude MIR · jumelé';
   const f=api.face(),cal=api.readTakeoff().calibrations?.[f.key]||api.takeoffSeed.calibrations?.[f.key];
   $('#project-scale').textContent=imported?(api.feetPerPixel(f)>0?`Échelle issue des cotes · ${f.name}`:`${f.name} · échelle non déterminée`):'Plan MIR · cotes de référence enregistrées';
   $('#dimension-note').textContent=imported?'Cotes détectées sur votre PDF · quantités à vérifier avant commande':data().dimensionNote||'Étude MIR · dimensions de référence';
   $('#export-render').disabled=!canRender()&&state().view==='3d';
  }
  function threeOptions(){
   ensureState();
   const c=state(),rs={};for(const id of ['return-left','return-right'])rs[id]=returnChoice(id).color;
   const roof=C?.coverageSpec(byId.get(c.roofId)||{}),soffit=C?.coverageSpec(byId.get(c.soffitId)||{});
   return {roofColor:c.roofColor||'#4a4c4b',roofStyle:c.roofStyle,roofExposureIn:roof?.exposureIn||null,soffitCoverageIn:soffit?.pieceCoverageIn||soffit?.exposureIn||null,elevation:c.cameraElevation,porch:c.porch,structures:c.structures.map(o=>({...o,color:o.finishMaterialId?officialColor(byId.get(o.finishMaterialId),{colorId:o.colorId}).color:o.color||'#a9aaa7'})),dimensions:dimensions(),returnColors:rs};
  }
  function returnViews(patternDef){
   ensureState();
   const geo=api.sceneGeometryBase(),r=geo.recess;if(!r||r.enabled===false||!(r.depth>0&&r.height>0))return {};
   return Object.fromEntries(['return-left','return-right'].map(id=>{
    const c=returnChoice(id),m=byId.get(c.materialId),w=ft(r.depth)*100,h=ft(r.height)*100;
    // Each return is calibrated at 100 drawing units per foot. The bottom is
    // the common physical z=0 datum, also used by the facade material anchors.
    const f={key:id,renderFeetPerPixel:.01,textureBox:[0,0,w,h],textureBottom:0},z={id,polygon:[[0,0],[w,0],[w,h],[0,h]]};
    const p=patternDef('return-pattern-'+id,c,f,z,false),grid=C?.panelGrid([0,0,w,h],.01,m||{},c);
    const joints=grid?.complete?`<g data-panel-layout="product" data-format-id="${esc(grid.formatId)}" fill="none" stroke="#485044" stroke-width="2">${grid.vertical.map(j=>`<path d="M${j.coordinate} 0V${h}"/>`).join('')}${grid.horizontal.map(j=>`<path d="M0 ${j.coordinate}H${w}"/>`).join('')}</g>`:'';
    return [id,`<svg xmlns="http://www.w3.org/2000/svg" data-meters-per-unit="0.003048" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${p}</defs><rect width="${w}" height="${h}" fill="url(#return-pattern-${id})"/>${joints}</svg>`];
   }));
  }
  function modal(id,title,body){let d=document.getElementById(id);if(d){if(d.open)d.close();d.remove();}d=document.createElement('dialog');d.id=id;d.className='studio-dialog';d.innerHTML=`<div class="dialog-top"><h2>${title}</h2><button class="close-dialog" aria-label="Fermer">Fermer ×</button></div>${body}`;document.body.appendChild(d);d.querySelector('.close-dialog').onclick=()=>d.close();d.showModal();return d;}
  function openVolume(){const d=dimensions()||{},r=api.sceneGeometryBase().recess||{},p=state().porch||{};const fields=[['width','Largeur totale (pi)',ft(d.width)],['depth','Profondeur totale (pi)',ft(d.depth)],['wallHeight','Hauteur du mur (pi)',ft(d.wallHeight)],['roofRise','Montée du toit (pi)',ft(d.roofRise)],['recessWidth','Largeur du retrait (pi)',ft(r.width)],['recessDepth','Profondeur du retrait (pi)',ft(r.depth)],['porchProjection','Avancée du porche (pi)',p.enabled?ft(p.projection):0]];
   const box=modal('volume-dialog','Le volume de votre maison',`<p>Les cotes du PDF sont utilisées lorsqu’elles sont reliées au dessin. Une élévation seule ne montre pas la profondeur : complétez uniquement les dimensions manquantes ou incertaines. Ces réglages modifient le volume 3D; ils ne changent pas l’échelle des élévations.</p>${r.upperStorey==='recessed-confirmed'?'<p>Le retrait reste identique au rez-de-chaussée et à l’étage. Le porche conserve sa hauteur propre.</p>':''}<label for="roof-style">Forme de toiture</label><select id="roof-style">${[['duplex','Deux pignons avant — étude MIR'],['gable','Deux versants'],['hip','Quatre versants'],['flat','Toit plat / volume provisoire']].map(([v,l])=>`<option value="${v}"${v===state().roofStyle?' selected':''}>${l}</option>`).join('')}</select><div class="field-grid">${fields.map(([k,l,v])=>`<label><span>${l}</span><input data-volume="${k}" type="number" min="0" max="1000" step="0.125" value="${fmt(v)}"></label>`).join('')}</div><p id="volume-error" role="alert"></p><div class="dialog-actions"><button id="apply-volume" class="primary">Appliquer au volume 3D</button></div>`);
   box.querySelector('#apply-volume').onclick=()=>{const vals=Object.fromEntries([...box.querySelectorAll('[data-volume]')].map(i=>[i.dataset.volume,i.value.trim()===''?null:Number(i.value)]));if(['width','depth','wallHeight'].some(k=>!(vals[k]>0&&vals[k]<=1000))||!finite(vals.roofRise)||vals.roofRise<0||vals.roofRise>1000||['recessWidth','recessDepth','porchProjection'].some(k=>vals[k]!==null&&(!finite(vals[k])||vals[k]<0||vals[k]>1000))||vals.recessWidth>=vals.width||vals.recessDepth>=vals.depth){box.querySelector('#volume-error').textContent='Précisez les dimensions positives du bâtiment et la montée du toit. Le retrait doit tenir dans la largeur et la profondeur du bâtiment; chaque valeur doit rester entre 0 et 1 000 pi.';return;}
    modify(()=>{state().volumeOverride=Object.fromEntries(['width','depth','wallHeight','roofRise'].map(k=>[k,metres(vals[k])]));state().roofStyle=box.querySelector('#roof-style').value;state().recessOverride={...r,enabled:vals.recessWidth>0&&vals.recessDepth>0,start:Math.max(0,Math.min(r.start||metres((vals.width-(vals.recessWidth||0))/2),metres(vals.width-(vals.recessWidth||0)))),width:metres(vals.recessWidth||0),depth:metres(vals.recessDepth||0),height:r.upperStorey==='recessed-confirmed'?metres(vals.wallHeight):Math.min(r.height||metres(vals.wallHeight),metres(vals.wallHeight))};state().porch={...state().porch,enabled:vals.porchProjection>0,projection:metres(vals.porchProjection||0)};state().volumeProvenance='user-confirmed';});box.close();toast('Volume mis à jour. Les cotes du plan conservent leur propre échelle.');};
  }
  function addStructure(type){if(!canRender())return openVolume();const d=dimensions(),id='element-'+Date.now().toString(36),column=type==='column';modify(()=>{state().structures.push({id,type,label:column?'Nouvelle colonne':'Nouvelle poutre',origin:[-.0762,-d.depth/2-.2,0],size:column?[.1524,.1524,2.7]:[2.5,.2,.3],material:'unknown',sourceStatus:'user-added',color:'#a9aaa7'});state().selected={kind:'structure',id};if(!column)state().structures.at(-1).origin=[-1.25,-d.depth/2-.2,2.7];});selectPart('structure',id);}
  function updateStructure(field,value){const o=currentStructure(),d=dimensions();if(!o||!d||!finite(value)||Math.abs(value)>1000)return;modify(()=>{if(field==='x')o.origin[0]=metres(value)-d.width/2;else if(field==='y')o.origin[1]=-d.depth/2-metres(value);else if(field==='z')o.origin[2]=metres(value);else if(value>0){if(field==='w')o.size[0]=value*.0254;if(field==='depth')o.size[1]=value*.0254;if(field==='h')o.size[2]=metres(value);}});}
  async function openProjects(){if(!root.MIRProjectStore)return toast('Les projets locaux n’ont pas chargé.');try{const list=await root.MIRProjectStore.list();const box=modal('projects-dialog','Mes plans sur cet appareil',`<p>Les fichiers restent dans ce navigateur. Exportez vos choix pour en garder une copie.</p>${list.map(p=>`<button class="project-choice" data-project-id="${esc(p.id)}"><span>${esc(p.title||p.filename||p.planData?.title||p.source?.filename||'Plan importé')}<small>${esc(p.filename||p.source?.filename||'PDF importé')}</small></span><span>Ouvrir ↗</span></button>`).join('')||'<p>Aucun PDF importé sur cet appareil.</p>'}<button id="open-demo-project" class="project-choice"><span>Étude MIR · jumelé<small>Revenir au plan d’exemple</small></span><span>↗</span></button>`);box.querySelectorAll('[data-project-id]').forEach(b=>b.onclick=async()=>{await root.MIRProjectStore.activate(b.dataset.projectId);location.reload();});box.querySelector('#open-demo-project').onclick=async()=>{await root.MIRProjectStore.clearActive();location.reload();};}catch(e){toast('Impossible d’ouvrir les projets : '+e.message);}}
  function openSource(){const available=data().faces.filter(f=>f.sourceImage||f.sourceImageDataUrl);if(!available.length){const box=modal('source-dialog','Le plan de référence',`<p>Étude issue du PDF MIR. Les pages anonymisées peuvent être ouvertes séparément.</p><a class="download-link" href="assets/MIR_Plan_anonymise_niveaux_de_gris.pdf" target="_blank" rel="noopener">Ouvrir le PDF de référence ↗</a>`);return;}
   const box=modal('source-dialog','Votre plan importé',`<div class="source-pages">${available.map(f=>`<button data-source-face="${f.key}">${esc(f.name)}</button>`).join('')}</div><img class="source-image" alt="Page du plan importé"><p id="source-scale-note"></p>`);function show(f){box.querySelector('img').src=f.sourceImage||f.sourceImageDataUrl;box.querySelectorAll('[data-source-face]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sourceFace===f.key));box.querySelector('#source-scale-note').textContent=f.calibrationStatus==='unresolved'?'Cotes insuffisantes ou ambiguës. Aucun métré fiable n’est calculé.':'Les cotes détectées sont conservées avec cette élévation.';}box.querySelectorAll('[data-source-face]').forEach(b=>b.onclick=()=>show(available.find(f=>f.key===b.dataset.sourceFace)));show(available.find(f=>f.key===state().face)||available[0]);
  }
  async function exportRender(){
   const button=$('#export-render');button.disabled=true;button.textContent='Création de votre aperçu…';const canvas=document.createElement('canvas');canvas.width=2200;canvas.height=1500;try{
    if(state().view==='3d'){if(!canRender())throw Error('Complétez le volume ou choisissez le plan 2D.');const rendered=await root.MIR3D.render(canvas,{views:api.threeViews(),angle:state().rotation,...api.sceneGeometry(),...threeOptions(),exportSize:{width:2200,height:1500},fasciaColor:state().fasciaColor,soffitColor:state().soffitColor,soffitType:byId.get(state().soffitId)?.soffitType||'unknown',foundationDrop:.8,textureBottoms:Object.fromEntries(data().faces.map(f=>[f.key,f.textureBottom||0]))});if(!rendered?.rendered)throw Error('La vue 3D n’a pas pu être rendue.');}
    else{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(api.facadeSVG(api.face(),{export:true,annotated:false}));await img.decode();const ctx=canvas.getContext('2d');ctx.fillStyle='#f6f7f0';ctx.fillRect(0,0,canvas.width,canvas.height);const ratio=Math.min(2000/img.width,1250/img.height);ctx.drawImage(img,(2200-img.width*ratio)/2,(1500-img.height*ratio)/2,img.width*ratio,img.height*ratio);}
    const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#294332';ctx.font='22px Arial';ctx.fillText('MIR · Aperçu de vos matières — rendu illustratif',45,canvas.height-36);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Export image indisponible')),'image/png'));if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(blob);
    const box=modal('render-dialog','Votre aperçu est prêt',`<img class="render-preview" src="${objectUrl}" alt="Aperçu de vos choix de matériaux"><p class="export-note">Cette image reprend les choix et la vue du studio. C’est un rendu illustratif, pas une photographie ni un plan de construction.</p><div class="dialog-actions"><a class="download-link" href="${objectUrl}" download="MIR_mon_apercu.png">Télécharger mon aperçu PNG ↓</a><button id="render-brief" class="primary">Préparer un rendu photoréaliste</button></div><div id="realistic-brief" hidden></div>`);
    box.querySelector('#render-brief').onclick=()=>{const summary=api.renderBrief(),target=box.querySelector('#realistic-brief');target.hidden=false;target.innerHTML=`<p>Le dossier de rendu rassemble votre vue et les choix exacts. La génération photoréaliste depuis le site demande un service de rendu connecté; elle n’est pas active dans cet aperçu.</p><label for="render-prompt">Consignes de rendu</label><textarea id="render-prompt" rows="8" style="width:100%;padding:12px;font:12px/1.6 Arial">${esc(summary)}</textarea><p class="small-note">Une image générée peut modifier les formes et les teintes. Les mesures restent celles du plan et des cotes vérifiées.</p>`;};
   }catch(e){toast('Aperçu non créé : '+e.message);}finally{root.MIR3D?.dispose?.(canvas);button.disabled=false;button.innerHTML='Créer mon aperçu HD <span>↗</span>';}
  }
  $('#extra-controls').onclick=e=>{
   const rc=e.target.closest('[data-roof-color]'),sc=e.target.closest('[data-structure-color]'),ret=e.target.closest('[data-return-color]'),add=e.target.closest('[data-add-structure]'),sel=e.target.closest('[data-select-return]');
   if(rc&&roofControls&&colorsFor(byId.get(state().roofId)).some(c=>c.id===rc.dataset.roofColor)){const colorId=rc.dataset.roofColor;modify(()=>{state().roofColorId=colorId;normalizeRoof();});[...$('#extra-controls').querySelectorAll('[data-roof-color]')].find(b=>b.dataset.roofColor===colorId)?.focus({preventScroll:true});}
   if(sc){const o=currentStructure();if(o)modify(()=>{o.colorId=sc.dataset.structureColor;o.color=officialColor(byId.get(o.finishMaterialId),{colorId:o.colorId}).color;});}
   if(ret)modify(()=>state().returnFinishes[returnId]=api.normalChoice({...returnChoice(returnId),colorId:ret.dataset.returnColor}));
   if(add)addStructure(add.dataset.addStructure);if(sel)selectPart('return',sel.dataset.selectReturn);
   if(roofControls&&e.target.closest('[data-roof-docs]'))openMaterial(state().roofId);
   if(e.target.closest('[data-delete-structure]')){const o=currentStructure();if(o)modify(()=>{state().structures=state().structures.filter(x=>x.id!==o.id);state().selected={kind:'structure',id:state().structures[0]?.id||null};});}
  };
  $('#extra-controls').onchange=e=>{
   const t=e.target;
   if(t.id==='roof-brand'&&roofControls){const m=roofs.find(m=>m.brand===t.value);if(m)selectRoof(m.id,'roof-brand');}
   if(t.id==='roof-product')selectRoof(t.value);
   if(t.id==='structure-select')selectPart('structure',t.value);
   if(t.id==='structure-wrap'){const o=currentStructure();if(o)modify(()=>{o.finishMaterialId=t.value;o.colorId=null;o.color='#a9aaa7';});}
   if(t.id==='structure-support'){const o=currentStructure();if(o)modify(()=>o.material=t.value);}
   if(t.dataset.structureField)updateStructure(t.dataset.structureField,Number(t.value));
   if(t.id==='return-product')modify(()=>state().returnFinishes[returnId]=api.normalChoice({materialId:t.value}));
   if(t.id==='return-orientation')modify(()=>state().returnFinishes[returnId]=api.normalChoice({...returnChoice(returnId),orientation:t.value}));
   if(t.id==='return-format'){
    const c=returnChoice(returnId),m=byId.get(c.materialId);
    if(C?.formats(m||{}).some(f=>f.id===t.value))modify(()=>state().returnFinishes[returnId]=api.normalChoice({...c,formatId:t.value}));
   }
   if(t.id==='return-exposure'){
    const c={...returnChoice(returnId)},m=byId.get(c.materialId),value=t.value.trim();
    if(value==='')delete c.exposureIn;
    else{
     const exposure=Number(value);
     if(!finite(exposure)||exposure<=0){toast('Saisissez une couvrance positive en pouces.');return;}
     c.exposureIn=exposure;
     const spec=C?.coverageSpec(m||{},c);
     if(spec?.reason==='exposure_out_of_range'){toast(`La couvrance doit être comprise entre ${fmt(spec.exposureRangeIn[0])} et ${fmt(spec.exposureRangeIn[1])} po.`);return;}
    }
    modify(()=>state().returnFinishes[returnId]=api.normalChoice(c));
   }
  };
  document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>selectPart(b.dataset.part));
  $('#focus-model').onclick=()=>$('#stage').scrollIntoView({behavior:'smooth',block:'center'});
  $('#volume-settings').onclick=openVolume;$('#complete-volume').onclick=openVolume;$('#stay-2d').onclick=()=>{state().view='2d';save();render();};
  $('#project-menu').onclick=openProjects;$('#show-source').onclick=openSource;
  $('#import-pdf').onclick=()=>root.MIRPlanImport?.open?root.MIRPlanImport.open({onImport:()=>location.reload()}):toast('L’import PDF n’a pas chargé. Rechargez la page.');
  $('#orbit-left').onclick=()=>{state().rotation=(state().rotation-30+360)%360;save();renderDrawing();};$('#orbit-right').onclick=()=>{state().rotation=(state().rotation+30)%360;save();renderDrawing();};$('#orbit-under').onclick=()=>{state().cameraElevation=-12;save();renderDrawing();toast('Vue par dessous : les soffites sont sous les débords de toit.');};$('#orbit-reset').onclick=()=>{state().rotation=28;state().cameraElevation=22;save();renderDrawing();};
  $('#export-render').onclick=exportRender;
  function handleHit(hit){if(hit.returnId){selectPart('return',hit.returnId);return true;}if(['roof','fascia','soffit'].includes(hit.type)){selectPart(hit.type);return true;}if(['beam','column'].includes(hit.type)){selectPart('structure',hit.structureId);return true;}return false;}
  return {renderUI,threeOptions,returnViews,handleHit,selectPart,canRender,returnChoice,dimensions,normalizeRoof,ensureState};
 }
 root.MIRStudioFeatures={setup};
})(window);
