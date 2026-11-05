/* Client-facing controls around the shared plan model. No separate geometry store. */
(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ft=m=>m==null?null:m/.3048,metres=n=>n*.3048,finite=n=>typeof n==='number'&&Number.isFinite(n),fmt=n=>finite(n)?Number(n.toFixed(3)):'';
 function setup(api){
  const {$,state,data,materials,modify,save,render,renderDrawing,officialColor,colorsFor,openMaterial,toast}=api;
  const imported=data().projectKind==='imported-pdf',byId=new Map(materials.map(m=>[m.id,m])),C=root.MIRMaterialCoverage;
  const roofs=materials.filter(m=>m.applications.includes('roofing'));
  const roofControls=api.roofControls!==false;
  const roofBrands=[...new Set(roofs.map(m=>m.brand))];
  const wraps=materials.filter(m=>m.applications.includes('bending'));
  // L'habillage métallique est distinct de la matière porteuse.
  const metalWraps=metal=>wraps.filter(m=>metal==='steel'?
    /acier|steel|vicwest/i.test(m.name+' '+m.family+' '+m.brand):
    metal==='aluminum'?/aluminium|aluminum|kaycan|gentek/i.test(m.name+' '+m.family+' '+m.brand):true);
  const siding=materials.filter(m=>m.applications.some(a=>['siding','masonry'].includes(a)));
  let part='facade',returnId=state().selected?.kind==='return'&&state().selected.id==='return-right'?'return-right':'return-left';
  const study=!imported&&root.MIR3D?.studyDefaults?root.MIR3D.studyDefaults(data().dimensions):{};
  const copy=value=>JSON.parse(JSON.stringify(value));
  function ensureState(){
   const s=state();
   // Reset and cross-tab restoration replace the state object after setup.
   // Clone the study defaults so editing a beam cannot mutate its reset value.
   if(!Array.isArray(s.structures))s.structures=copy(study.structures||[]);
   if(!s.porch||typeof s.porch!=='object'||Array.isArray(s.porch))s.porch=copy(study.porch||{enabled:false});
   // One-time migration preserves existing edited column positions and
   // respects later removal of the proposed beam.
   if(!imported&&study.porch?.balconyEnabled===true&&s.porch.balconyEnabled==null)s.porch.balconyEnabled=true;
   if(!imported&&s.studySupportBeamRevision!==1){
    const beam=study.structures?.find(o=>o.id==='porch-front-beam');
    if(beam&&s.structures.some(o=>o.id==='porch-column-left')&&s.structures.some(o=>o.id==='porch-column-right')&&!s.structures.some(o=>o.id===beam.id))s.structures.push(copy(beam));
    s.studySupportBeamRevision=1;
   }
   if(!['duplex','gable','hip','flat'].includes(s.roofStyle))s.roofStyle=imported
    ?data().detectedVolume?.roofStyle||(data().detectedVolume?'':'flat')
    :study.roofStyle||'duplex';
   if(!finite(s.cameraElevation))s.cameraElevation=22;
   s.cameraElevation=Math.max(5,Math.min(75,s.cameraElevation));
   if(!finite(s.cameraZoom))s.cameraZoom=1;
   s.cameraZoom=Math.max(.7,Math.min(3.5,s.cameraZoom));
   if(!['commercial','none'].includes(s.siteStyle))s.siteStyle=imported?'none':'commercial';
   const existingSteps=!!s.concreteSteps&&typeof s.concreteSteps==='object'&&!Array.isArray(s.concreteSteps);
   if(!existingSteps)s.concreteSteps={enabled:false,count:4,width:1.8,tread:.30,riser:.16};
   // Une nouvelle étude PDF peut proposer des marches sans mot OCR explicite.
   // Ne jamais écraser un choix déjà enregistré sur un appareil.
   if(imported&&!existingSteps){
     const c=(data().stairCandidates||[]).filter(x=>x.source==='pdf-pixels'&&x.confidence>=.72&&x.widthFt>0&&x.treadFt>0)
       .sort((a,b)=>Number(b.context==='balcony-stairs')-Number(a.context==='balcony-stairs')||b.confidence-a.confidence)[0];
     if(c){
       const d=s.volumeOverride||data().dimensions;
       const x=Number.isFinite(d?.width)?(c.relativeCenter[0]-.5)*d.width:0;
       s.concreteSteps={...s.concreteSteps,enabled:true,count:Math.max(1,Math.min(12,c.count)),
         width:Math.max(.8,Math.min(4,metres(c.widthFt))),tread:Math.max(.22,Math.min(.55,metres(c.treadFt))),
         centerX:x,sourceCandidateId:c.id,sourcePage:c.page,
         sourceStatus:'calibrated-pixels-position-to-verify',widthMeasuredFromPdf:true,
         treadMeasuredFromPdf:true,riserHeightVerified:false,positionVerified:false,needsReview:true};
     }
   }
   if(!s.returnFinishes||typeof s.returnFinishes!=='object'||Array.isArray(s.returnFinishes))s.returnFinishes={};
   if(!s.cornerFinishes||typeof s.cornerFinishes!=='object'||Array.isArray(s.cornerFinishes))
     s.cornerFinishes={enabled:!imported||data().dimensionStatus==='detected',metal:'aluminum',color:'#8d9690',widthMeters:.08,
       sourceStatus:'geometric-corners-proposed-not-certified'};
   s.cornerFinishes.widthMeters=Math.max(.035,Math.min(.24,Number(s.cornerFinishes.widthMeters)||.08));
   if(!s.roofId&&roofs.length){s.roofId=roofs[0].id;const colors=colorsFor(roofs[0]),c=colors.find(c=>c.id==='bp-mystique-noir-2-tons')||colors[0];s.roofColorId=c?.id;}
   // The admin keeps the client's roof appearance, without a roof editing panel.
   if(!roofControls&&s.selected?.kind==='roof')s.selected={kind:'zone',id:api.allZones(api.face())[0]?.id||null};
   normalizeRoof();return s;
  }
  function normalizeRoof(){const m=byId.get(state().roofId),c=officialColor(m,{colorId:state().roofColorId});state().roofColor=c.color;state().roofColorId=c.colorId;}
  ensureState();
  function currentStructure(){ensureState();return state().structures.find(x=>x.id===state().selected?.id)||state().structures[0];}
  function dimensions(){return state().volumeOverride||data().dimensions;}
  function canRender(){const s=ensureState(),d=dimensions();return !!s.roofStyle&&d&&['width','depth','wallHeight'].every(k=>finite(d[k])&&d[k]>0)&&finite(d.roofRise)&&d.roofRise>=0;}
  function finish(m,raw={}){return {...raw,materialId:m?.id||null,...officialColor(m,raw)};}
  function returnChoice(id){ensureState();const raw=state().returnFinishes[id];if(raw)return api.normalChoice(raw);const f=data().faces.find(f=>f.key==='front'),z=f?.zones.find(z=>z.id==='centre_RDC')||f?.zones[0];return z?api.choice(f,z):api.normalChoice({},siding[0]?.id);}
  function selectPart(next,id){
   if(next==='roof'&&!roofControls)return;
   part=next;if(next==='return')returnId=id||'return-left';
   if(next==='structure')state().selected={kind:'structure',id:id||state().structures?.[0]?.id||null};
   else if(next==='corner')state().selected={kind:'corner',id:'corner-trim'};
   else if(['roof','soffit','fascia','return'].includes(next))state().selected={kind:next,id:id||next};
   else if(next==='facade'&&!['zone','opening'].includes(state().selected.kind))state().selected={kind:'zone',id:api.allZones(api.face())[0]?.id||null};
   save();render();if(window.innerWidth<801)$('#studio-controls').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function inferredPart(){const kind=state().selected.kind;return kind==='zone'||kind==='opening'?'facade':['roof','soffit','fascia','structure','return','corner'].includes(kind)?kind:part;}
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
   const notes=Array.isArray(data().structuralHints)?data().structuralHints:[];
   const evidence=notes.length?`<section class="mir-structure-evidence"><p class="eyebrow">REPÈRES PDF · À CONFIRMER</p><p>${notes.length} mention(s) trouvée(s) dans les pages sélectionnées. Le nom, la position et la portée doivent être vérifiés.</p>${notes.slice(0,12).map((h,i)=>{const linked=h.type==='stairs'?state().concreteSteps?.sourceHintId==='hint-'+i:state().structures.some(s=>s.sourceHintId==='hint-'+i);return `<p><strong>${esc(h.type==='column'?'Poteau / colonne':h.type==='beam'?'Poutre':h.type==='stairs'?'Marches / escalier'+(h.concreteMaterialHint?' en béton':' · matière à vérifier'):h.type==='corner'?'Coin / moulure d’angle':'Balcon / galerie')}</strong> · page ${esc(h.page||'?')} · ${esc(h.label||'mention détectée')} ${h.type==='balcony'?'(voir Volume & retours)':h.type==='corner'?'(voir l’onglet Coins aluminium)':linked?'(proposé dans le modèle)':`<button type="button" data-add-hint="${i}">Ajouter une proposition 3D</button>`}</p>`;}).join('')}</section>`:'';
   const pixelStairs=(data().stairCandidates||[]).filter(c=>c.source==='pdf-pixels');
   const pixelEvidence=pixelStairs.length?
     '<section class="mir-structure-evidence"><p class="eyebrow">MARCHES DÉTECTÉES DANS LES PIXELS</p><p>Échelle du plan appliquée aux traits répétés. Emplacement, nombre réel et hauteur à confirmer.</p>'+
     pixelStairs.slice(0,8).map((c,i)=>'<p><strong>'+esc(c.count)+' marches estimées</strong> · feuille '+esc(c.page)+
       ' · largeur '+fmt(c.widthFt)+' pi · giron '+fmt(c.treadFt)+' pi · profondeur '+fmt(c.depthFt)+' pi · confiance '+Math.round(c.confidence*100)+
       ' % <button type="button" data-use-pixel-stair="'+i+'">Placer ces dimensions en 3D</button></p>').join('')+'</section>':'';
   const o=currentStructure();if(!o)return `<div class="extra-panel"><p class="eyebrow">LES ÉLÉMENTS MÉTALLIQUES</p><h2>Poutres & colonnes</h2>${pixelEvidence}${evidence}<p>Ajoutez un élément repéré sur votre plan pour choisir son habillage. Un poteau dessiné ne permet pas, à lui seul, de connaître sa matière.</p><div class="compact-actions"><button data-add-structure="column">＋ Colonne</button><button data-add-structure="beam">＋ Poutre</button></div></div>`;
   const m=byId.get(o.finishMaterialId),c=officialColor(m,{colorId:o.colorId}),d=dimensions()||{width:0,depth:0};
   const metal=o.finishMetal||'aluminum';
   const compatible=metalWraps(metal);
   const selectedColor=/^#[0-9a-f]{6}$/i.test(o.finishColorOverride||'')?o.finishColorOverride:
     /^#[0-9a-f]{6}$/i.test(c.color||'')?c.color:/^#[0-9a-f]{6}$/i.test(o.color||'')?o.color:'#a9aaa7';
   const fields=[['x','Depuis la gauche (pi)',ft(o.origin[0]+d.width/2)],['y','Devant la façade (pi)',ft(-o.origin[1]-d.depth/2)],['z','Hauteur de départ (pi)',ft(o.origin[2])],['w','Largeur (po)',o.size[0]/.0254],['depth','Profondeur (po)',o.size[1]/.0254],['h','Hauteur (pi)',ft(o.size[2])]];
   return `<div class="extra-panel"><p class="eyebrow">POUTRES & COLONNES</p><h2>Les détails qui changent tout.</h2>${pixelEvidence}${evidence}<label for="structure-select">Élément à modifier</label><select id="structure-select">${state().structures.map(x=>`<option value="${esc(x.id)}"${x.id===o.id?' selected':''}>${esc(x.label||x.id)}</option>`).join('')}</select><p class="structure-meta">${esc(o.sourceStatus==='user-added'?'Élément ajouté au projet.':o.provenance||'Repéré sur le plan; dimensions de représentation à confirmer.')} Le support et son habillage sont deux choix distincts.</p><label for="structure-finish-metal">Métal de l'habillage (indépendant du support)</label><select id="structure-finish-metal"><option value="aluminum"${metal==='aluminum'?' selected':''}>Aluminium</option><option value="steel"${metal==='steel'?' selected':''}>Acier</option></select><label for="structure-wrap">Fournisseur / feuille de finition</label><select id="structure-wrap"><option value="">Sélectionner la feuille ou le rouleau</option>${optionHTML(compatible,o.finishMaterialId)}</select><label for="structure-custom-color">Couleur visible de l'habillage / poutre / colonne</label><input type="color" id="structure-custom-color" value="${selectedColor}" aria-label="Choisir la couleur de l'habillage de la poutre ou colonne"><p class="small-note">La couleur manuelle sert à la visualisation. Utilisez un nuancier fabricant pour la référence à commander.</p>${choiceHTML(m,o.colorId,'data-structure-color')}<p class="small-note">${esc(m?.colorStatus==='collection_only'?'Teintes de collection; disponibilité du rouleau à confirmer.':'Choisissez une couleur documentée du produit d’habillage.')}</p><details><summary>Position et dimensions</summary><div class="pair">${fields.map(([k,label,v])=>`<label>${label}<input type="number" data-structure-field="${k}" value="${fmt(v)}" step="0.125"></label>`).join('')}</div><label for="structure-support">Matière du support</label><select id="structure-support"><option value="unknown">À confirmer sur le plan</option><option value="steel"${o.material==='steel'?' selected':''}>Acier</option><option value="aluminum"${o.material==='aluminum'?' selected':''}>Aluminium</option><option value="wood"${o.material==='wood'?' selected':''}>Bois</option></select><button data-delete-structure class="delete-region">Retirer cet élément du projet</button></details><div class="compact-actions"><button data-add-structure="column">＋ Colonne</button><button data-add-structure="beam">＋ Poutre</button></div></div>`;
  }
  function renderUI(){
   ensureState();
   part=inferredPart();if(part==='return'&&['return-left','return-right'].includes(state().selected.id))returnId=state().selected.id;const extra=$('#extra-controls');if(!extra)return;
   const names={facade:'FAÇADE',roof:'TOITURE',soffit:'SOFFITE',fascia:'FASCIA',structure:'POUTRES & COLONNES',corner:'COINS EN ALUMINIUM',return:'RETOUR DE MUR'};
   $('#control-part-name').textContent=names[part];
   document.querySelectorAll('[data-part]').forEach(b=>{b.hidden=b.dataset.part==='roof'&&!roofControls;b.setAttribute('aria-pressed',b.dataset.part===(part==='return'?'facade':part));});
   $('.zone-controls').hidden=part!=='facade';$('#finish-controls').hidden=!['soffit','fascia'].includes(part);$('#finish-controls').open=['soffit','fascia'].includes(part);
   extra.hidden=!['roof','structure','return','corner'].includes(part);
   const finish=$('#finish-controls');finish.querySelector('summary span:nth-child(2)').textContent=part==='fascia'?'Fascia · bord de toiture':'Soffite · dessous de toiture';
   for(const k of ['soffit','fascia']){for(const e of finish.querySelectorAll(`[id^="${k}-"],label[for^="${k}-"]`))e.hidden=part!==k;}
   finish.querySelector('.finish-divider').hidden=true;
   if(part==='roof'){
    const m=byId.get(state().roofId),cs=colorsFor(m),selected=cs.find(c=>c.id===state().roofColorId),rows=roofs.filter(r=>r.brand===m?.brand);
    extra.innerHTML=`<div class="extra-panel roof-panel"><p class="eyebrow">LE BARDEAU</p><h2>Le toit qui complète votre façade.</h2><p>Choisissez votre fabricant, votre gamme et sa couleur.</p><label for="roof-brand">Fabricant du bardeau</label><select id="roof-brand">${roofBrands.map(brand=>`<option value="${esc(brand)}"${brand===m?.brand?' selected':''}>${esc(brand)}</option>`).join('')}</select><label for="roof-product">Gamme de bardeaux</label><select id="roof-product">${rows.map(r=>`<option value="${esc(r.id)}"${r.id===m?.id?' selected':''}>${esc(r.collection||r.name)}</option>`).join('')}</select><p class="roof-palette-label">${cs.length} couleurs de cette gamme</p>${choiceHTML(m,state().roofColorId,'data-roof-color')}<p class="roof-selection" role="status">${selected?`Couleur choisie : <strong>${esc(selected.name)}</strong>`:'Choisissez une couleur de cette gamme.'}</p><p class="small-note">${esc(m?.regionalAvailabilityNote||'Nuancier du fabricant. Disponibilité locale à confirmer.')} Le rendu à l’écran est indicatif; l’échantillon physique reste la référence.</p><button data-roof-docs class="small-link">Couleurs & documentation du fabricant ↗</button><p class="small-note roof-visualization-note">Choix visuel seulement, enregistré avec votre projet.</p>${roofDetails()}</div>`;
   }else if(part==='structure')extra.innerHTML=structurePanel();
   else if(part==='corner'){
     const c=state().cornerFinishes,code=(data().structuralHints||[]).filter(h=>h.type==='corner').slice(0,8);
     extra.innerHTML='<div class="extra-panel mir-corner-panel"><p class="eyebrow">COINS DE MÉTAL</p><h2>Coins aluminium et acier.</h2>'+
       '<p>Angles proposés d’après le périmètre du bâtiment et ses retraits, sans supposer le fournisseur ni les longueurs. Un coin est détecté géométriquement; son matériau reste à confirmer.</p>'+
       (code.length?'<p>'+code.length+' mention(s) de coin relevée(s) sur le PDF : '+code.map(h=>'page '+esc(h.page)+' « '+esc(h.label)+' »').join(', ')+'</p>':'')+
       '<label class="mir-corner-toggle"><input type="checkbox" id="mir-corner-enabled" '+(c.enabled?'checked':'')+'> Afficher les coins sur le bâtiment 3D</label>'+
       '<label for="mir-corner-metal">Matière visible</label><select id="mir-corner-metal"><option value="aluminum" '+(c.metal==='aluminum'?'selected':'')+'>Aluminium</option><option value="steel" '+(c.metal==='steel'?'selected':'')+'>Acier</option></select>'+
       '<label for="mir-corner-color">Couleur des coins (aperçu)</label><input type="color" id="mir-corner-color" value="'+esc(c.color)+'">'+
       '<label for="mir-corner-width">Largeur visible approximative (po)</label><input id="mir-corner-width" type="number" min="1.5" max="9" step=".125" value="'+fmt(c.widthMeters/.0254)+'">'+
       '<p class="small-note">Aucune couleur, épaisseur, quantité ou fixation commerciale n’est certifiée par cette proposition.</p></div>';
   }
   else if(part==='return'){
    const c=returnChoice(returnId),m=byId.get(c.materialId);extra.innerHTML=`<div class="extra-panel"><p class="eyebrow">LES COINS DU BÂTIMENT</p><h2>${returnId==='return-left'?'Retour gauche':'Retour droit'} du retrait</h2><p>Cette surface latérale a son propre revêtement. Sa profondeur suit le volume du retrait.</p><label for="return-product">Matériau de ce retour</label><select id="return-product">${optionHTML(siding,c.materialId)}</select>${choiceHTML(m,c.colorId,'data-return-color')}${returnSizeHTML(m,c)}<label for="return-orientation">Sens de pose</label><select id="return-orientation">${(m.allowedOrientations||[]).map(v=>`<option value="${v}"${v===c.orientation?' selected':''}>${v==='vertical'?'Vertical':'Horizontal'}</option>`).join('')}</select><div class="compact-actions"><button data-select-return="return-left">Retour gauche</button><button data-select-return="return-right">Retour droit</button></div></div>`;
   }
   $('#duplicate-zone').disabled=state().selected.kind!=='zone'||!api.currentZone();
   $('#project-name').textContent=imported?data().title||'Mon plan importé':'Étude MIR · jumelé';
   const f=api.face(),cal=api.readTakeoff().calibrations?.[f.key]||api.takeoffSeed.calibrations?.[f.key];
   $('#project-scale').textContent=imported?(api.feetPerPixel(f)>0?`Échelle issue des cotes · ${f.name}`:`${f.name} · échelle non déterminée`):'Plan MIR · cotes de référence enregistrées';
   $('#dimension-note').textContent=data().dimensionNote||(imported?'Cotes du PDF · quantités à vérifier avant commande':'Étude MIR · dimensions de référence');
  }
  const hardieAluminumMatches={
   'hardie-beige-navajo':'431 Amande','hardie-gris-fer':'447 Gris cendre',
   'hardie-ecorce':'4H1 Brun grange','hardie-blanc-arctique':'4H2 Blanc pur',
   'hardie-taupe-monterey':'4H5 Sable du désert','hardie-gris-perle':'4H4 Gris pierre'
  };
  function upperFlashing(){
   const s=state(),front=data().faces.find(f=>f.key==='front');
   const upper=front&&api.allZones(front).find(z=>z.id==='centre_etage');
   if(!s.porch?.enabled||byId.get(s.roofId)?.renderPattern!=='shingle'||!upper)return null;
   const finish=api.choice(front,upper);
   if(!finish.colorId||!/^#[0-9a-f]{6}$/i.test(finish.color))return null;
   const match=byId.get(finish.materialId)?.brand==='James Hardie'?hardieAluminumMatches[finish.colorId]:null;
   return {color:finish.color,match};
  }
  function roofDetails(){
   const s=state(),flashing=upperFlashing();
   const cornices=['gable','duplex'].includes(s.roofStyle)?'<div class="compact-actions"><button type="button" data-gable-cornices aria-pressed="'+(s.gableCornices===true)+'">'+
     (s.gableCornices?'Retirer les corniches de pignon':'＋ Ajouter des corniches de pignon')+'</button></div>':'';
   return cornices+
     (flashing?.match?'<p class="small-note">Éloignement des eaux · Gentek aluminium 3037, '+esc(flashing.match)+
       ' · <a href="https://www.gentek.ca/wp-content/uploads/sites/2/2023/08/Gentek-Product-Directory-FRE-Mars2026.pdf#page=63" target="_blank" rel="noopener">Table fabricant ↗</a></p>':
       flashing?'<p class="small-note">Éloignement des eaux · aluminium assorti au revêtement supérieur dans l’aperçu. Teinte fournisseur à confirmer.</p>':'');
  }
  function threeOptions(){
   ensureState();
   const c=state(),rs={};for(const id of ['return-left','return-right'])rs[id]=returnChoice(id).color;
   const roof=C?.coverageSpec(byId.get(c.roofId)||{}),soffit=C?.coverageSpec(byId.get(c.soffitId)||{});
   const front=data().faces.find(f=>f.key==='front');
   const band=front&&api.frontMasonryBand(front,dimensions());
   const masonry=band&&api.allZones(front).find(z=>z.id===band.sourceZoneId);
   const brick=masonry&&api.choice(front,masonry);
   const returnMasonry=brick?{...band,color:brick.color,materialId:brick.materialId,sourceStatus:'same-front-masonry-Z-unverified'}:null;
   return {zoom:c.cameraZoom,siteStyle:c.siteStyle,concreteSteps:c.concreteSteps,cornerFinishes:c.cornerFinishes,returnMasonry,gableCornices:c.gableCornices===true,waterDiverterColor:upperFlashing()?.color||null,roofColor:c.roofColor||'#4a4c4b',roofStyle:c.roofStyle,foundationDrop:data().detectedVolume?(data().detectedVolume.foundationDrop??0):.8,roofExposureIn:roof?.exposureIn||null,soffitCoverageIn:soffit?.pieceCoverageIn||soffit?.exposureIn||null,elevation:c.cameraElevation,porch:c.porch,structures:c.structures.map(o=>({...o,color:o.finishColorOverride|| (o.finishMaterialId?officialColor(byId.get(o.finishMaterialId),{colorId:o.colorId}).color:o.color||'#a9aaa7')})),dimensions:dimensions(),returnColors:rs};
  }
  function returnViews(patternDef){
   ensureState();
   const geo=api.sceneGeometryBase(),r=geo.recess;if(!r||r.enabled===false||!(r.depth>0&&r.height>0))return {};
   const front=data().faces.find(f=>f.key==='front');
   const band=front&&api.frontMasonryBand(front,dimensions());
   const masonry=band&&api.allZones(front).find(z=>z.id===band.sourceZoneId);
   const brickChoice=masonry&&api.choice(front,masonry);
   return Object.fromEntries(['return-left','return-right'].map(id=>{
    const c=returnChoice(id),m=byId.get(c.materialId),w=ft(r.depth)*100,h=ft(r.height)*100;
    // Each return is calibrated at 100 drawing units per foot. The bottom is
    // the common physical z=0 datum, also used by the facade material anchors.
    const f={key:id,renderFeetPerPixel:.01,textureBox:[0,0,w,h],textureBottom:0},z={id,polygon:[[0,0],[w,0],[w,h],[0,h]]};
    const p=patternDef('return-pattern-'+id,c,f,z,false),grid=C?.panelGrid([0,0,w,h],.01,m||{},c);
    const joints=grid?.complete?`<g data-panel-layout="product" data-format-id="${esc(grid.formatId)}" fill="none" stroke="#485044" stroke-width="2">${grid.vertical.map(j=>`<path d="M${j.coordinate} 0V${h}"/>`).join('')}${grid.horizontal.map(j=>`<path d="M0 ${j.coordinate}H${w}"/>`).join('')}</g>`:'';
    // Rétablir sur chaque retour la maçonnerie du soubassement frontal,
    // à la même altitude physique. Ne pas changer le matériau du mur au-dessus.
    const bandTop=band&&brickChoice?Math.max(0,h-band.topMeters/.003048):h;
    const bandBottom=band&&brickChoice?Math.min(h,h-band.bottomMeters/.003048):h;
    const bandH=Math.max(0,bandBottom-bandTop),brickId='return-masonry-'+id;
    const zBrick={id:brickId,polygon:[[0,bandTop],[w,bandTop],[w,bandBottom],[0,bandBottom]]};
    const brickDef=bandH>0?patternDef(brickId,brickChoice,f,zBrick,false):'';
    const brickOverlay=bandH>0?`<rect data-mir-continuous-masonry="${id}" x="0" y="${fmt(bandTop)}" width="${fmt(w)}" height="${fmt(bandH)}" fill="url(#${brickId})"/>`:'';
    return [id,`<svg xmlns="http://www.w3.org/2000/svg" data-meters-per-unit="0.003048" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${p}${brickDef}</defs><rect width="${w}" height="${h}" fill="url(#return-pattern-${id})"/>${joints}${brickOverlay}</svg>`];
   }));
  }
  function modal(id,title,body){let d=document.getElementById(id);if(d){if(d.open)d.close();d.remove();}d=document.createElement('dialog');d.id=id;d.className='studio-dialog';d.innerHTML=`<div class="dialog-top"><h2>${title}</h2><button class="close-dialog" aria-label="Fermer">Fermer ×</button></div>${body}`;document.body.appendChild(d);d.querySelector('.close-dialog').onclick=()=>d.close();d.showModal();return d;}
  function volumeSheets(box){
   const project=data(),sheets=[...(project.referencePages||[]),...project.faces]
    .filter(sheet=>Number.isInteger(sheet.page)&&/^data:image\/(?:png|jpeg);base64,/.test(sheet.sourceImage||''));
   if(!sheets.length)return;
   const section=document.createElement('details');
   section.className='volume-sheets';
   section.innerHTML=`<summary>Feuilles du PDF utilisées pour le volume</summary><label for="volume-sheet">Vue de référence</label><select id="volume-sheet"><option value="">Choisir une vue</option>${sheets.map((sheet,i)=>`<option value="${i}">${esc(sheet.name)} · page ${sheet.page}</option>`).join('')}</select><img alt="" hidden>`;
   box.querySelector('.field-grid').before(section);
   const select=section.querySelector('select'),image=section.querySelector('img');
   select.onchange=()=>{
    const sheet=select.value===''?null:sheets[Number(select.value)];
    image.hidden=!sheet;
    if(!sheet){image.removeAttribute('src');return;}
    image.alt=`${sheet.name} · page ${sheet.page}`;
    image.src=sheet.sourceImage;
   };
  }
  function openVolume(){const d=dimensions()||{},r=api.sceneGeometryBase().recess||{},p=state().porch||{};const fields=[['width','Largeur totale (pi)',ft(d.width)],['depth','Profondeur totale (pi)',ft(d.depth)],['wallHeight','Hauteur du mur (pi)',ft(d.wallHeight)],['roofRise','Montée du toit (pi)',ft(d.roofRise)],['recessWidth','Largeur du retrait (pi)',ft(r.width)],['recessDepth','Profondeur du retrait (pi)',ft(r.depth)],['porchProjection','Avancée du porche (pi)',p.enabled?ft(p.projection):0]];
   const box=modal('volume-dialog','Le volume de votre maison',`<p>Les cotes du PDF sont utilisées lorsqu’elles sont reliées au dessin. Une élévation seule ne montre pas la profondeur : complétez uniquement les dimensions manquantes ou incertaines. Ces réglages modifient le volume 3D; ils ne changent pas l’échelle des élévations.</p>${r.upperStorey==='recessed-confirmed'?'<p>Le retrait reste identique au rez-de-chaussée et à l’étage. Le porche conserve sa hauteur propre.</p>':''}<label for="roof-style">Forme de toiture</label><select id="roof-style">${[['','Choisir la forme'],['duplex','Deux pignons avant — étude MIR'],['gable','Deux versants'],['hip','Quatre versants'],['flat','Toit plat / volume provisoire']].map(([v,l])=>`<option value="${v}"${v===state().roofStyle?' selected':''}>${l}</option>`).join('')}</select><div class="field-grid">${fields.map(([k,l,v])=>`<label><span>${l}</span><input data-volume="${k}" type="number" min="0" max="1000" step="0.125" value="${fmt(v)}"></label>`).join('')}</div><label class="mir-balcony-toggle"><input id="porch-balcony-enabled" type="checkbox" ${p.balconyEnabled?'checked':''}>Afficher le balcon / plancher du porche dans la vue 3D (emplacement à vérifier sur le PDF)</label><label class="mir-balcony-toggle" for="mir-site-style">Paysagement 3D</label><select id="mir-site-style"><option value="none" ${state().siteStyle==='none'?'selected':''}>Sans aménagement ajouté</option><option value="commercial" ${state().siteStyle==='commercial'?'selected':''}>Commercial illustratif : stationnement, asphalte, trottoirs, plantations</option></select><label class="mir-balcony-toggle"><input id="mir-concrete-steps" type="checkbox" ${state().concreteSteps?.enabled?'checked':''}>Afficher les marches de béton indicatives (à valider sur le PDF)</label><label for="mir-steps-count">Nombre de marches à confirmer</label><input id="mir-steps-count" type="number" min="1" max="12" step="1" value="${state().concreteSteps?.count||4}"><label for="mir-steps-width">Largeur des marches (pi)</label><input id="mir-steps-width" type="number" min="2.5" max="13" step=".01" value="${fmt(ft(state().concreteSteps?.width||1.8))}"><label for="mir-steps-tread">Giron (pouces)</label><input id="mir-steps-tread" type="number" min="8.5" max="22" step=".01" value="${fmt((state().concreteSteps?.tread||.30)/.0254)}"><label for="mir-steps-center">Décalage gauche/droite depuis le centre (pi)</label><input id="mir-steps-center" type="number" step=".01" value="${fmt(ft(state().concreteSteps?.centerX||0))}"><p class="small-note">${state().concreteSteps?.sourceCandidateId?'Largeur et giron mesurés sur les pixels calibrés (feuille '+esc(state().concreteSteps.sourcePage)+').':'Dimensions visuelles provisoires.'} La position, les contremarches et le nombre restent à confirmer sur les plans.</p><p id="volume-error" role="alert"></p><div class="dialog-actions"><button id="apply-volume" class="primary">Appliquer au volume 3D</button></div>`);
   if(imported)volumeSheets(box);
   box.querySelector('#apply-volume').onclick=()=>{const style=box.querySelector('#roof-style').value;const vals=Object.fromEntries([...box.querySelectorAll('[data-volume]')].map(i=>[i.dataset.volume,i.value.trim()===''?null:Number(i.value)]));if(!style||['width','depth','wallHeight'].some(k=>!(vals[k]>0&&vals[k]<=1000))||!finite(vals.roofRise)||vals.roofRise<0||vals.roofRise>1000||['recessWidth','recessDepth','porchProjection'].some(k=>vals[k]!==null&&(!finite(vals[k])||vals[k]<0||vals[k]>1000))||vals.recessWidth>=vals.width||vals.recessDepth>=vals.depth){box.querySelector('#volume-error').textContent='Précisez la forme du toit, les dimensions positives du bâtiment et la montée du toit. Le retrait doit tenir dans la largeur et la profondeur du bâtiment; chaque valeur doit rester entre 0 et 1 000 pi.';return;}
    modify(()=>{state().volumeOverride=Object.fromEntries(['width','depth','wallHeight','roofRise'].map(k=>[k,metres(vals[k])]));state().roofStyle=style;state().recessOverride={...r,enabled:vals.recessWidth>0&&vals.recessDepth>0,start:Math.max(0,Math.min(r.start||metres((vals.width-(vals.recessWidth||0))/2),metres(vals.width-(vals.recessWidth||0)))),width:metres(vals.recessWidth||0),depth:metres(vals.recessDepth||0),height:r.upperStorey==='recessed-confirmed'?metres(vals.wallHeight):Math.min(r.height||metres(vals.wallHeight),metres(vals.wallHeight))};state().porch={...state().porch,enabled:vals.porchProjection>0,projection:metres(vals.porchProjection||0),balconyEnabled:box.querySelector('#porch-balcony-enabled').checked};state().siteStyle=box.querySelector('#mir-site-style').value;state().concreteSteps={...state().concreteSteps,enabled:box.querySelector('#mir-concrete-steps').checked,
        count:Math.max(1,Math.min(12,Number(box.querySelector('#mir-steps-count').value)||4)),
        width:Math.max(.8,Math.min(4,metres(Number(box.querySelector('#mir-steps-width').value)||5.9))),
        tread:Math.max(.22,Math.min(.55,(Number(box.querySelector('#mir-steps-tread').value)||12)*.0254)),
        centerX:metres(Number(box.querySelector('#mir-steps-center').value)||0),positionVerified:false};state().volumeProvenance='user-confirmed';});box.close();toast('Volume mis à jour. Les cotes du plan conservent leur propre échelle.');};
  }
  function addStructure(type){if(!canRender())return openVolume();const d=dimensions(),id='element-'+Date.now().toString(36),column=type==='column';modify(()=>{state().structures.push({id,type,label:column?'Nouvelle colonne':'Nouvelle poutre',origin:[-.0762,-d.depth/2-.2,0],size:column?[.1524,.1524,2.7]:[2.5,.2,.3],material:'unknown',sourceStatus:'user-added',color:'#a9aaa7'});state().selected={kind:'structure',id};if(!column)state().structures.at(-1).origin=[-1.25,-d.depth/2-.2,2.7];});selectPart('structure',id);}
  function applyPixelStairs(index){
   const c=(data().stairCandidates||[]).filter(x=>x.source==='pdf-pixels')[index];
   if(!c||!(c.widthFt>0&&c.treadFt>0))return toast('Dimensions des marches non déterminées.');
   const d=dimensions(),x=Number.isFinite(d?.width)?(c.relativeCenter[0]-.5)*d.width:0;
   modify(()=>state().concreteSteps={...state().concreteSteps,enabled:true,
     count:Math.max(1,Math.min(12,c.count)),
     width:Math.max(.8,Math.min(4,metres(c.widthFt))),tread:Math.max(.22,Math.min(.55,metres(c.treadFt))),
     centerX:x,sourceCandidateId:c.id,sourcePage:c.page,needsReview:true,
     widthMeasuredFromPdf:true,treadMeasuredFromPdf:true,
     positionVerified:false,riserHeightVerified:false,sourceStatus:'calibrated-pixels-position-to-verify'});
   toast('Dimensions reprises des pixels et cotes du PDF. Vérifiez nombre, position et hauteur avant commande.');
  }
  function addDetectedHint(index){
   const h=data().structuralHints?.[index];if(!h||!['column','beam','stairs'].includes(h.type))return;
   if(!canRender())return openVolume();
   if(h.type==='stairs'){
     const pixel=(data().stairCandidates||[]).filter(x=>x.source==='pdf-pixels'),index=pixel.findIndex(c=>c.page===h.page);
     if(index>=0)return applyPixelStairs(index);
     modify(()=>state().concreteSteps={...state().concreteSteps,enabled:true,count:4,needsReview:true,sourceHintId:'hint-'+index,sourcePage:h.page});
     toast('Marches proposées en 3D. Nombre, position et matière à confirmer sur le PDF.');
     return;
   }
   const s=state(),existing=s.structures.find(x=>x.sourceHintId==='hint-'+index);
   if(existing){selectPart('structure',existing.id);return;}
   const d=dimensions(),column=h.type==='column',id='pdf-support-'+Date.now().toString(36)+'-'+index;
   modify(()=>{const o={id,type:h.type,sourceHintId:'hint-'+index,
     label:(column?'Colonne':'Poutre')+' · repère page '+h.page,
     origin:column?[-.0762,-d.depth/2-.2,0]:[-1.25,-d.depth/2-.2,2.7],
     size:column?[.1524,.1524,2.7]:[2.5,.2,.3],
     material:'unknown',color:'#a9aaa7',sourcePage:h.page,needsReview:true,
     sourceStatus:'pdf-mention-proposed-unverified',
     provenance:'Mention « '+String(h.label||'').slice(0,70)+' » dans le PDF; emplacement illustratif à corriger avant utilisation.'};
     state().structures.push(o);state().selected={kind:'structure',id};
   });
   selectPart('structure',id);
   toast('Proposition créée. Vérifiez sa position et ses dimensions sur les plans avant de l’utiliser.');
  }
  function updateStructure(field,value){const o=currentStructure(),d=dimensions();if(!o||!d||!finite(value)||Math.abs(value)>1000)return;modify(()=>{if(field==='x')o.origin[0]=metres(value)-d.width/2;else if(field==='y')o.origin[1]=-d.depth/2-metres(value);else if(field==='z')o.origin[2]=metres(value);else if(value>0){if(field==='w')o.size[0]=value*.0254;if(field==='depth')o.size[1]=value*.0254;if(field==='h')o.size[2]=metres(value);}});}
  async function openProjects(){if(!root.MIRProjectStore)return toast('Les projets locaux n’ont pas chargé.');try{const list=await root.MIRProjectStore.list();const box=modal('projects-dialog','Mes plans sur cet appareil',`<p>Les fichiers restent dans ce navigateur. Exportez vos choix pour en garder une copie.</p>${list.map(p=>`<button class="project-choice" data-project-id="${esc(p.id)}"><span>${esc(p.title||p.filename||p.planData?.title||p.source?.filename||'Plan importé')}<small>${esc(p.filename||p.source?.filename||'PDF importé')}</small></span><span>Ouvrir ↗</span></button>`).join('')||'<p>Aucun PDF importé sur cet appareil.</p>'}<button id="open-demo-project" class="project-choice"><span>Étude MIR · jumelé<small>Revenir au plan d’exemple</small></span><span>↗</span></button>`);box.querySelectorAll('[data-project-id]').forEach(b=>b.onclick=async()=>{await root.MIRProjectStore.activate(b.dataset.projectId);location.reload();});box.querySelector('#open-demo-project').onclick=async()=>{await root.MIRProjectStore.clearActive();location.reload();};}catch(e){toast('Impossible d’ouvrir les projets : '+e.message);}}
  function openSource(){const available=data().faces.filter(f=>f.sourceImage||f.sourceImageDataUrl);if(!available.length){const box=modal('source-dialog','Le plan de référence',`<p>Étude issue du PDF MIR. Les pages anonymisées peuvent être ouvertes séparément.</p><a class="download-link" href="assets/MIR_Plan_anonymise_niveaux_de_gris.pdf" target="_blank" rel="noopener">Ouvrir le PDF de référence ↗</a>`);return;}
   const box=modal('source-dialog','Votre plan importé',`<div class="source-pages">${available.map(f=>`<button data-source-face="${f.key}">${esc(f.name)}</button>`).join('')}</div><img class="source-image" alt="Page du plan importé"><p id="source-scale-note"></p>`);function show(f){box.querySelector('img').src=f.sourceImage||f.sourceImageDataUrl;box.querySelectorAll('[data-source-face]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sourceFace===f.key));box.querySelector('#source-scale-note').textContent=f.calibrationStatus==='unresolved'?'Cotes insuffisantes ou ambiguës. Aucun métré fiable n’est calculé.':'Les cotes détectées sont conservées avec cette élévation.';}box.querySelectorAll('[data-source-face]').forEach(b=>b.onclick=()=>show(available.find(f=>f.key===b.dataset.sourceFace)));show(available.find(f=>f.key===state().face)||available[0]);
  }
  $('#extra-controls').onclick=e=>{
   if(roofControls&&e.target.closest('[data-gable-cornices]'))modify(()=>{state().gableCornices=state().gableCornices!==true;});
   const rc=e.target.closest('[data-roof-color]'),sc=e.target.closest('[data-structure-color]'),ret=e.target.closest('[data-return-color]'),add=e.target.closest('[data-add-structure]'),hint=e.target.closest('[data-add-hint]'),pixelStair=e.target.closest('[data-use-pixel-stair]'),sel=e.target.closest('[data-select-return]');
   if(rc&&roofControls&&colorsFor(byId.get(state().roofId)).some(c=>c.id===rc.dataset.roofColor)){const colorId=rc.dataset.roofColor;modify(()=>{state().roofColorId=colorId;normalizeRoof();});[...$('#extra-controls').querySelectorAll('[data-roof-color]')].find(b=>b.dataset.roofColor===colorId)?.focus({preventScroll:true});}
   if(sc){const o=currentStructure();if(o)modify(()=>{o.colorId=sc.dataset.structureColor;o.finishColorOverride=null;o.color=officialColor(byId.get(o.finishMaterialId),{colorId:o.colorId}).color;});}
   if(ret)modify(()=>state().returnFinishes[returnId]=api.normalChoice({...returnChoice(returnId),colorId:ret.dataset.returnColor}));
   if(add)addStructure(add.dataset.addStructure);if(pixelStair)applyPixelStairs(Number(pixelStair.dataset.usePixelStair));if(hint)addDetectedHint(Number(hint.dataset.addHint));if(sel)selectPart('return',sel.dataset.selectReturn);
   if(roofControls&&e.target.closest('[data-roof-docs]'))openMaterial(state().roofId);
   if(e.target.closest('[data-delete-structure]')){const o=currentStructure();if(o)modify(()=>{state().structures=state().structures.filter(x=>x.id!==o.id);state().selected={kind:'structure',id:state().structures[0]?.id||null};});}
  };
  $('#extra-controls').onchange=e=>{
   const t=e.target;
   if(t.id==='roof-brand'&&roofControls){const m=roofs.find(m=>m.brand===t.value);if(m)selectRoof(m.id,'roof-brand');}
   if(t.id==='roof-product')selectRoof(t.value);
   if(t.id==='structure-select')selectPart('structure',t.value);
   if(t.id==='structure-finish-metal'){
    const o=currentStructure();if(o)modify(()=>{o.finishMetal=t.value;o.finishMaterialId=null;o.colorId=null;
      o.finishColorOverride=null;o.color=t.value==='steel'?'#70777b':'#a9aaa7';});
   }
   if(t.id==='structure-wrap'){const o=currentStructure();if(o)modify(()=>{
     const m=byId.get(t.value);
     if(m&&!metalWraps(o.finishMetal||'aluminum').some(p=>p.id===m.id))return;
     o.finishMaterialId=m?.id||null;o.colorId=null;o.finishColorOverride=null;
     o.color=m?officialColor(m,{}).color:(o.finishMetal==='steel'?'#70777b':'#a9aaa7');
   });}
   if(t.id==='structure-custom-color'){const o=currentStructure();if(o&&/^#[0-9a-f]{6}$/i.test(t.value))modify(()=>{
     o.finishColorOverride=t.value;o.color=t.value;o.colorId=null;
   });}
   if(t.id==='structure-support'){const o=currentStructure();if(o)modify(()=>o.material=t.value);}
   if(t.id==='mir-corner-enabled')modify(()=>state().cornerFinishes.enabled=t.checked);
   if(t.id==='mir-corner-metal'&&['steel','aluminum'].includes(t.value))modify(()=>state().cornerFinishes.metal=t.value);
   if(t.id==='mir-corner-color'&&/^#[0-9a-f]{6}$/i.test(t.value))modify(()=>state().cornerFinishes.color=t.value);
   if(t.id==='mir-corner-width'&&Number(t.value)>=1.5&&Number(t.value)<=9)
     modify(()=>state().cornerFinishes.widthMeters=Number(t.value)*.0254);
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
  $('#orbit-left').onclick=()=>{state().rotation=(state().rotation-30+360)%360;save();renderDrawing();};$('#orbit-right').onclick=()=>{state().rotation=(state().rotation+30)%360;save();renderDrawing();};$('#orbit-under').onclick=()=>{state().cameraElevation=5;save();renderDrawing();toast('Caméra maintenue au niveau du sol.');};$('#orbit-reset').onclick=()=>{state().rotation=28;state().cameraElevation=22;state().cameraZoom=1;save();renderDrawing();};
  function handleHit(hit){if(hit.returnId){selectPart('return',hit.returnId);return true;}if(hit.type==='roof-detail'){selectPart('roof');return true;}if(['roof','fascia','soffit'].includes(hit.type)){selectPart(hit.type);return true;}if(['beam','column'].includes(hit.type)){selectPart('structure',hit.structureId);return true;}
   if(hit.type==='corner'||hit.role==='aluminum-corner-proposal'){selectPart('corner');return true;}return false;}
  return {renderUI,threeOptions,returnViews,handleHit,selectPart,canRender,returnChoice,dimensions,normalizeRoof,ensureState};
 }
 root.MIRStudioFeatures={setup};
})(window);
