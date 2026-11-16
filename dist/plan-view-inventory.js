/* Versioned, browser-local source inventory. Directions are renderer slots only. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MIRViewInventory=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const directions=['front','right','back','left'];
  const names={front:'Avant',right:'Droite',back:'Arrière',left:'Gauche'};
  const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'");
  const copy=x=>JSON.parse(JSON.stringify(x));
  function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(36);}
  function buildingHint(text){
    const s=normal(text),shed=/\b(cabanon|remise|shed|outbuilding)\b/.test(s),house=/\b(maison|residence|house|dwelling)\b/.test(s);
    if(shed===house)return null;
    const model=s.match(/\b(?:maison\s+modele|model\s+house)\s*#?\s*(\d{1,4})\b/);
    return shed?'shed':model?'house-model-'+model[1]:'house';
  }
  function levelHint(text){
    const s=normal(text);
    if(/\b(r\s*[-.]?\s*d\s*[-.]?\s*c\b|rez[ -]de[ -]chaussee|ground floor|main floor)/.test(s))return 'ground';
    if(/\b(sous[ -]sol|basement)/.test(s))return 'basement';
    const numbered=s.match(/\b(?:etage|niveau|level)\s+(\d+)\b/)||s.match(/\b(\d+)(?:er|e|eme)\s+etage\b/);
    if(numbered)return 'level-'+numbered[1];
    if(/\b(etage|upper floor|second floor|2nd floor|upper storey|upper story)\b/.test(s))return 'upper';
    if(/\b(first floor|1st floor)\b/.test(s))return null; // regional ambiguity
    return null;
  }
  function pageBuilding(rows,classify){
    const usable=rows.filter(r=>(r.confidence??100)>=55);
    const explicit=usable.filter(r=>classify(r.text)||/^(?:maison|residence|cabanon|remise|house|shed)(?:\s+\d+['′x×].*)?$/.test(normal(r.text).trim()));
    const identities=[...new Set(explicit.map(r=>buildingHint(r.text)).filter(Boolean))];
    if(identities.length>1)return null;
    if(identities.length===1){const row=explicit.find(r=>buildingHint(r.text)===identities[0]);return {id:identities[0],text:row.text,box:row.box,method:'explicit-building-label'};}
    // A project cartouche may name the house while the sheet itself explicitly
    // names a shed. The sheet label above always takes priority.
    const models=usable.filter(r=>/^(?:maison\s+modele|model\s+house)\s*#?\s*\d{1,4}\s*$/.test(normal(r.text).trim().replace(/[.,;:]+$/,'')));
    if(new Set(models.map(r=>buildingHint(r.text))).size!==1)return null;
    const model=models[0];return {id:buildingHint(model.text),text:model.text,box:model.box,method:'project-house-label-proposed'};
  }
  function placeholder(key){return {key,name:names[key],page:null,bbox:[0,0,1200,800],textureBox:[0,0,1200,800],physicalWidth:null,zones:[],openings:[],roof:[],base:[],fascia:[],soffit:[],detected:{},candidates:[],occlusions:[],printedDimensions:[],importedStatus:'unassigned',calibrationStatus:'not_found',textureBottom:0,sourceImage:null};}
  function create(records,source,pages=[]){
    const fileId='file-'+(source.sha256||hash(source.filename+':'+source.bytes));
    const views=records.map(record=>{
      const crop=record.sourceCrop||record.crop||null;
      const id='view-'+fileId+'-p'+record.page+'-r'+(record.sourceRotation||0)+'-z'+(crop?crop.join('-'):'legacy-'+(record.key||hash(record.name)));
      return {id,fileId,page:record.page,zone:crop,orientation:record.sourceRotation||0,
        frame:record.sourceFrame||null,kind:record.kind,direction:record.direction||record.key||null,
        buildingId:record.buildingHint||buildingHint(record.name),levelId:record.kind==='floor'?levelHint(record.name):null,
        associationStatus:'proposed',associations:{building:'proposed',level:'proposed',direction:'proposed'},calibration:copy(record.calibration||{}),
        provenance:{method:'local-pdf-titles-and-pixels',title:record.name,titleBox:record.titleBox||null,titleBoxFrame:'raster-page',building:record.buildingEvidence||null,needsReview:true},
        evidence:record.volumeEvidence||[],payload:copy(record)};
    });
    for(const view of views)for(const field of ['building','level','direction'])if(!view[field==='direction'?field:field+'Id'])view.associations[field]='unresolved';
    const known=[...new Set(views.map(v=>v.buildingId).filter(Boolean))];
    // No propagation from the first page: unlabeled views stay unresolved in
    // mixed documents. A wholly unlabeled document gets one provisional group.
    if(views.some(view=>!view.buildingId)){
      known.push('unresolved');for(const view of views)if(!view.buildingId)view.buildingId='unresolved';
    }
    const houseModels=known.filter(id=>id.startsWith('house-model-'));
    const buildings=known.map(id=>({id,name:id==='house'?'Maison':id.startsWith('house-model-')?'Maison'+(houseModels.length>1?' '+id.slice(12):''):id==='shed'?'Cabanon':'Bâtiment à confirmer',status:id==='unresolved'?'unresolved':'proposed',contours:[],wallPlanes:[]}));
    const inventory={schema:'mir-view-inventory',version:1,files:[{id:fileId,...source}],pages,buildings,views,levels:[],activeBuildingId:buildings.length===1?buildings[0].id:null,rendererSelections:{}};
    refresh(inventory);return inventory;
  }
  function refresh(inventory){
    for(const [building,slots]of Object.entries(inventory.rendererSelections||{}))for(const [direction,id]of Object.entries(slots))
      if(id&&!inventory.views.some(v=>v.id===id&&v.buildingId===building&&v.direction===direction))slots[direction]=null;
    inventory.levels=[...new Map(inventory.views.filter(v=>v.levelId).map(v=>{
      const id=(v.buildingId||'unresolved')+':'+v.levelId;
      return [id,{id,buildingId:v.buildingId,sourceLevel:v.levelId,status:v.associations?.level==='confirmed'?'confirmed':'proposed',contours:[],wallPlanes:[]}];
    })).values()];
    return inventory;
  }
  function candidates(inventory,buildingId,direction){return inventory.views.filter(v=>v.buildingId===buildingId&&v.kind==='elevation'&&v.direction===direction);}
  function selected(inventory,buildingId){
    const saved=inventory.rendererSelections[buildingId]||{};
    return Object.fromEntries(directions.map(key=>{
      const list=candidates(inventory,buildingId,key);
      return [key,list.find(v=>v.id===saved[key])||(list.length===1?list[0]:null)];
    }));
  }
  function adapt(planData,volumeFrom){
    const inventory=planData.viewInventory;if(!inventory)return planData;
    const buildingId=inventory.activeBuildingId,views=inventory.views.filter(v=>v.buildingId===buildingId),slots=selected(inventory,buildingId);
    const faces=directions.map(key=>{
      const view=slots[key];if(!view)return placeholder(key);
      const p=copy(view.payload),box=p.bbox||[0,0,...(view.zone?.slice(2)||[1200,800])];
      return {...placeholder(key),...p,key,kind:'elevation',bbox:box,textureBox:p.textureBox||box,viewId:view.id,buildingId,levelId:view.levelId};
    });
    const floorLevels=new Set(views.filter(v=>v.kind==='floor').map(v=>v.levelId));
    const evidence=views.filter(v=>['elevation','floor','foundation','section','roof'].includes(v.kind)&&(v.kind!=='floor'||floorLevels.size<=1)).flatMap(v=>v.evidence.map(e=>({...e,viewId:v.id,buildingId,levelId:v.levelId})));
    let volume=volumeFrom(evidence);
    if(inventory.migration&&buildingId===inventory.migration.originalBuildingId){
      volume={...volume,...copy(planData.detectedVolume||{}),dimensions:copy(planData.dimensions||volume.dimensions)};
    }
    return {...planData,faces,referencePages:views.filter(v=>!Object.values(slots).includes(v)).map(v=>({...copy(v.payload),viewId:v.id})),
      structuralHints:views.flatMap(v=>(v.payload.structuralHints||[]).map(h=>({...h,viewId:v.id,assignedView:v.direction||v.kind}))),
      stairCandidates:views.flatMap(v=>(v.payload.stairCandidates||[]).map(h=>({...h,viewId:v.id,assignedView:v.direction||v.kind}))),
      dimensions:volume.dimensions,dimensionStatus:Object.values(volume.dimensions).every(Number.isFinite)&&volume.roofStyle?'detected':'incomplete',
      detectedVolume:volume,footprint:inventory.migration?.originalBuildingId===buildingId?copy(planData.footprint||{type:'unknown'}):{type:'unknown',confirmed:false},
      recess:inventory.migration?.originalBuildingId===buildingId?copy(planData.recess||{enabled:false,confirmed:false}):{enabled:false,confirmed:false},
      rendererScopeKey:'building-'+(buildingId||'unresolved'),
      previewStatus:'indicative-contour-unknown'};
  }
  // An explicit migration retains the original faces and all unknown fields.
  // Reading/activating a legacy record never writes this migration to storage.
  function migrate(planData,source){
    if(planData.viewInventory)return copy(planData);
    const records=[...(planData.faces||[]).filter(f=>f.page||f.sourceImage),...(planData.referencePages||[])];
    const inventory=create(records,source||planData.sourceMetadata||{filename:planData.title,bytes:0});
    inventory.migration={fromVersion:planData.version,method:'source-facts-only',originalBuildingId:inventory.activeBuildingId,legacyFaces:copy(planData.faces||[])};
    for(const view of inventory.views){view.levelId=null;view.associationStatus='unresolved';view.associations={building:'unresolved',level:'unresolved',direction:'unresolved'};view.provenance.method='legacy-source-facts';}
    inventory.levels=[];
    return {...copy(planData),version:3,viewInventory:inventory};
  }
  function pdfToLocal(view,[x,y]){
    const m=view.frame?.pdfToRaster,c=view.frame?.cropToRaster;
    return m&&c?[m[0]*x+m[2]*y+m[4]-c[4],m[1]*x+m[3]*y+m[5]-c[5]]:null;
  }
  function localToPDF(view,[x,y]){
    const m=view.frame?.pdfToRaster,c=view.frame?.cropToRaster;
    if(!m||!c)return null;
    const determinant=m[0]*m[3]-m[1]*m[2];if(!determinant)return null;
    const a=x+c[4]-m[4],b=y+c[5]-m[5];
    return [(a*m[3]-b*m[2])/determinant,(b*m[0]-a*m[1])/determinant];
  }
  const mapFields=['selections','zoneOverrides','openingOverrides','bands','openingTrims','openingStyles','panelLayouts','manualTransitionModes','legacyStudyColors','windows','segments','soffits','coverage'];
  const faceFields=['customZones','addedOpenings','calibrations'];
  function translateState(state,plan,encode,previous={}){
    if(!plan.viewInventory)return state;
    const ids=Object.fromEntries(plan.faces.map(f=>[f.key,f.viewId||'missing-'+f.key]));
    const out=copy(state),mapping=encode?ids:Object.fromEntries(Object.entries(ids).map(([k,v])=>[v,k]));
    const translate=k=>{const first=Object.keys(mapping).find(id=>k===id||k.startsWith(id+':')||k.startsWith(id+'-'));return first?mapping[first]+k.slice(first.length):null;};
    for(const field of [...mapFields,...faceFields]){
      if(Array.isArray(state[field]))continue;
      const next=encode?{...(previous[field]||{})}:{};
      if(encode)for(const k of Object.keys(next))if(Object.values(ids).some(id=>k===id||k.startsWith(id+':')))delete next[k];
      for(const [k,v] of Object.entries(state[field]||{})){const target=translate(k);if(target)next[target]=v;}
      out[field]=next;
    }
    out.transitions=(encode?(previous.transitions||[]).filter(t=>!Object.values(ids).includes(t.face)):[])
      .concat((state.transitions||[]).filter(t=>mapping[t.face]).map(t=>({...t,face:mapping[t.face]})));
    for(const field of ['customSegments','customSoffits','panelLayouts'])if(Array.isArray(state[field])){
      const retained=encode?(previous[field]||[]).filter(t=>!Object.values(ids).includes(t.face)):[];
      out[field]=retained.concat(state[field].filter(t=>mapping[t.face]||!t.face).map(t=>({...t,...(t.face?{face:mapping[t.face]}:{})})));
    }
    out.face=mapping[state.face]||(encode?ids.front:'front');
    return out;
  }
  return Object.freeze({create,refresh,adapt,migrate,selected,candidates,placeholder,buildingHint,pageBuilding,levelHint,pdfToLocal,localToPDF,
    encodeState:(state,plan,previous)=>translateState(state,plan,true,previous),decodeState:(state,plan)=>translateState(state,plan,false)});
});
