/* MIR study editor. Source geometry: reviewed raster elevations, not measured CAD.
 * Local plan import and edits. Geometric reconstruction uses only known or explicitly supplied dimensions. */
(async function () {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = x => JSON.parse(JSON.stringify(x));
  const key = (face, id) => `${face}:${id}`;
  const pts = poly => poly.map(p => p.join(',')).join(' ');
  const rect = (x,y,w,h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const bounds = poly => {const xs=poly.map(p=>p[0]), ys=poly.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];};
  const validHex = c => /^#[\da-f]{6}$/i.test(c);
  let STORAGE = 'mir-plan-study-v2';
  let TAKEOFF_STORAGE = 'mir-takeoff-v1';
  const RECESS_FIELDS = {recessStartFt:'start',recessWidthFt:'width',recessDepthFt:'depth',recessHeightFt:'height'};
  let data, materials, takeoffSeed, activeProject=null, studioFeatures=null;
  const facadeVisuals = new Map();

  async function prepareFacadeVisual(f) {
    const source = f.sourceImage || f.sourceImageDataUrl;
    if (!/^data:image\/(?:png|jpeg);base64,/.test(source||'')) return;
    const image = new Image();
    image.src = source;
    await image.decode();
    const w = image.naturalWidth, h = image.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    try {
      const ctx = canvas.getContext('2d', {willReadFrequently:true});
      ctx.drawImage(image,0,0);
      const width = ['front','back'].includes(f.key)?data.dimensions?.width:data.dimensions?.depth;
      const ratio = width / data.dimensions?.wallHeight;
      const pixels=ctx.getImageData(0,0,w,h);
      const saved=f.visualFrame;
      const plausible=Array.isArray(saved)&&(!Number.isFinite(ratio)||Math.abs(saved[2]/saved[3]/ratio-1)<.2);
      const frame=(plausible?saved:null)||window.MIRFacadeVisual?.detect({image:pixels,crop:[0,0,w,h],ratio})?.box||saved;
      if (!Array.isArray(frame) || frame.length!==4 || !frame.every(Number.isFinite)) return;
      const [x,y,fw,fh] = frame.map(Math.round);
      if (x<0 || y<0 || fw<20 || fh<20 || x+fw>w || y+fh>h) return;
      const ink = ctx.getImageData(x,y,fw,fh);
      for(let i=0;i<ink.data.length;i+=4){
        const red=ink.data[i],green=ink.data[i+1],blue=ink.data[i+2];
        const light=.213*red+.715*green+.072*blue;
        const chroma=Math.max(red,green,blue)-Math.min(red,green,blue);
        if(chroma<40){ink.data[i]=28;ink.data[i+1]=32;ink.data[i+2]=30;}
        ink.data[i+3]=ink.data[i+3]/255*Math.max(0,Math.min(245,(238-light)*1.65,chroma<40?245:chroma*1.4));
      }
      canvas.width=fw; canvas.height=fh;
      ctx.putImageData(ink,0,0);
      const imageBox=f.sourceImageBox;
      const [sx,sy,sw,sh] = Array.isArray(imageBox)&&imageBox.length===4&&imageBox.every(Number.isFinite)?imageBox:[0,0,w,h];
      const storedFoundation=f.foundation;
      const sameFrame=storedFoundation?.box&&Math.abs(storedFoundation.box[0]-x)<fw*.06&&Math.abs(storedFoundation.box[2]-fw)<fw*.06;
      const sourceFoundation=(sameFrame?storedFoundation:null)||window.MIRFacadeVisual?.foundation({image:pixels,box:[x,y,fw,fh],anchors:f.foundationGuides});
      const toSource=([a,b,c,d])=>[sx+a*sw/w,sy+b*sh/h,c*sw/w,d*sh/h];
      facadeVisuals.set(f.key,{box:toSource([x,y,fw,fh]),linework:canvas.toDataURL('image/png'),
        foundation:Array.isArray(sourceFoundation?.box)&&sourceFoundation.box.length===4&&sourceFoundation.box.every(Number.isFinite)?{...sourceFoundation,box:toSource(sourceFoundation.box)}:null});
    } finally { canvas.width=canvas.height=1; }
  }

  $('#import-pdf').onclick=()=>window.MIRPlanImport?.open?window.MIRPlanImport.open({onImport:()=>location.reload()}):null;
  try {
    const responses = await Promise.all([fetch('plan-data.json'),fetch('catalogue-fd6866b49d21.json?v=maconnerie-1'),fetch('takeoff-data.json')]);
    if(responses.some(r=>!r.ok)) throw Error('Chargement indisponible');
    [data, {materials}, takeoffSeed] = await Promise.all(responses.map(r=>r.json()));
    const bending=window.MIRBendingFinishes?.catalogue(materials)||[];
    for(const product of bending)if(!materials.some(m=>m.id===product.id))materials.push({...product,applications:['bending']});
    activeProject=await window.MIRProjectStore?.getActive();
    if(activeProject?.planData){for(const link of document.querySelectorAll('.studio-source-links a[href^="assets/"]'))link.hidden=true;data=activeProject.planData;takeoffSeed=activeProject.takeoffSeed;STORAGE+=':'+activeProject.id;TAKEOFF_STORAGE+=':'+activeProject.id;}
    if(!Array.isArray(data.faces)||!data.faces.length)throw Error('Aucune élévation dans le dossier');
    for(const f of data.faces){for(const k of ['zones','openings','roof','base','fascia','soffit','detected'])if(!Array.isArray(f[k]))f[k]=[];f.candidates||=0;f.textureBox||=f.bbox;}
    if(data.projectKind==='imported-pdf')for(const f of data.faces){
      try{await prepareFacadeVisual(f);}catch(error){console.warn('MIR : dessin de façade indisponible',f.key,error);}
    }

  } catch(e) {$('#elevation').textContent='Le dossier n’a pas pu être chargé. Rechargez cette page pour réessayer.';return;}
  const swatchImages=new Map();
  const swatchUrls=[...new Set(materials.flatMap(m=>(m.colors||[]).map(c=>c?.swatchUrl).filter(url=>typeof url==='string'&&/^(?:\.\/)?assets\/[a-zA-Z0-9_./-]+$/.test(url)&&!url.includes('..'))))];
  // Inline local, documented samples: SVG-as-image rendering in 3D cannot
  // reliably load external relative resources. The PDF receives the same bytes.
  const loadSwatch=async url=>{
    const response=await fetch(url);if(!response.ok)throw Error('Nuancier indisponible');
    const blob=await response.blob(),bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const sample={dataUri:`data:${blob.type||'image/jpeg'};base64,${btoa(binary)}`,displayHex:null};
    // This sampled colour is only a rendering fallback for solid 3D trim.
    // It never becomes an official hexadecimal colour in the catalogue.
    if(typeof window.createImageBitmap==='function')try{
      const bitmap=await window.createImageBitmap(blob,{resizeWidth:256,resizeQuality:'high'}),canvas=document.createElement('canvas');canvas.width=canvas.height=16;
      sample.width=bitmap.width;sample.height=bitmap.height;
      const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(bitmap,0,0,16,16);bitmap.close();
      const pixels=context.getImageData(0,0,16,16).data,sum=[0,0,0];let count=0;
      for(let y=3;y<13;y++)for(let x=3;x<13;x++){const i=(y*16+x)*4;if(pixels[i+3]<128)continue;for(let c=0;c<3;c++)sum[c]+=pixels[i+c];count++;}
      if(count)sample.displayHex='#'+sum.map(n=>Math.round(n/count).toString(16).padStart(2,'0')).join('');
    }catch(_){}
    swatchImages.set(url,sample);
  };
  let swatchCursor=0;const swatchLoads=[];
  await Promise.all(Array.from({length:Math.min(4,swatchUrls.length)},async()=>{while(swatchCursor<swatchUrls.length){const index=swatchCursor++;try{await loadSwatch(swatchUrls[index]);swatchLoads[index]={status:'fulfilled'};}catch(error){swatchLoads[index]={status:'rejected',reason:String(error.message||error)};}}}));
  const missingSwatchCount=swatchLoads.filter(result=>result.status==='rejected').length;
  const materialById = new Map(materials.map(m=>[m.id,m]));
  const facadeMaterials = materials.filter(m=>m.applications.some(a=>['siding','masonry'].includes(a)));
  const soffits = materials.filter(m=>m.applications.includes('soffit'));
  const fascias = materials.filter(m=>m.applications.includes('fascia'));
  const L=window.MIRPlanLayout, E=window.MIRTakeoff, C=window.MIRMaterialCoverage, V=window.MIRVerticalLayout;
  if(!L||!E||!C){$('#elevation').textContent='Les outils de dessin et de métrés n’ont pas chargé. Rechargez la page.';return;}
  const NEUTRAL='#d3d6cd', patternNames={lap:'Clin',vertical:'Lames verticales',panel:'Panneau',brick:'Maçonnerie',plain:'Uni',shingle:'Bardeau'};
  const orientationNames={horizontal:'Horizontale',vertical:'Verticale'};
  const defaults = () => ({version:2,catalogueVersion:4,face:data.faces.find(f=>f.importedStatus==='assigned')?.key||'front',view:'3d',displayMode:'client',alignWindow:true,selected:{kind:'zone',id:'pignon_gauche'},selections:{},customZones:{front:[],right:[],back:[],left:[]},zoneOverrides:{},openingOverrides:{},addedOpenings:{front:[],right:[],back:[],left:[]},bands:{},openingTrims:{},openingStyles:{},panelLayouts:{},transitions:[],manualTransitionModes:{},panelStockRotation:true,volumeOverride:null,recessOverride:null,soffitId:'kaycan-sp600-vented',soffitColor:NEUTRAL,fasciaId:'kaycan-fascia-6-0480',fasciaColor:NEUTRAL,rotation:28});
  let state=defaults(),history=[],detection=false,neutral=false,drawMode=null,drag=null,toastTimer,selectedJoint=null,suppressClick=false;
  try {const old=JSON.parse(localStorage.getItem(STORAGE));if(old?.version===2&&data.faces.some(f=>f.key===old.face))state={...state,...old};}catch(_){}
  for(const field of ['selections','customZones','zoneOverrides','openingOverrides','addedOpenings','bands','openingTrims','openingStyles','panelLayouts'])if(!state[field]||typeof state[field]!=='object'||Array.isArray(state[field]))state[field]=defaults()[field];
  for(const f of data.faces){if(!Array.isArray(state.customZones[f.key]))state.customZones[f.key]=[];if(!Array.isArray(state.addedOpenings[f.key]))state.addedOpenings[f.key]=[];}
  if(!Array.isArray(state.transitions))state.transitions=[];
  if(!state.manualTransitionModes||typeof state.manualTransitionModes!=='object'||Array.isArray(state.manualTransitionModes))state.manualTransitionModes={};
  if(!['client','atelier'].includes(state.displayMode))state.displayMode='client';
  if(!materialById.has(state.soffitId))state.soffitId=soffits[0]?.id;
  if(!materialById.has(state.fasciaId))state.fasciaId=fascias[0]?.id;
  const face=()=>data.faces.find(f=>f.key===state.face);
  const allZones=f=>[...f.zones,...(state.customZones[f.key]||[])].map(z=>({...z,polygon:state.zoneOverrides[key(f.key,z.id)]||z.polygon}));
  const allOpenings=f=>[...f.openings,...(state.addedOpenings[f.key]||[])].map(o=>({...o,polygon:state.openingOverrides[key(f.key,o.id)]||o.polygon}));
  const currentZone=()=>allZones(face()).find(z=>z.id===state.selected.id);
  const currentOpening=()=>allOpenings(face()).find(o=>o.id===state.selected.id);
  const openingAppearance=(f,o)=>{
    const saved=state.openingStyles[key(f.key,o.id)]||{};
    const b=bounds(o.polygon),wide=o.type==='door'&&(b[2]-b[0])>(b[3]-b[1])*.65;
    return {frameColor:validHex(saved.frameColor)?saved.frameColor:'#596b62',
      battenColor:validHex(saved.battenColor)?saved.battenColor:'#f0eee5',
      showBatten:saved.showBatten===true,
      doorColor:validHex(saved.doorColor)?saved.doorColor:'#374944',
      design:['solid','half-glass','patio'].includes(saved.design)?saved.design:(wide?'patio':'half-glass')};
  };
  function setOpeningAppearance(patch){
    const o=currentOpening();if(!o)return;
    modify(()=>{
      const k=key(state.face,o.id);
      state.openingStyles[k]={...openingAppearance(face(),o),...patch};
    });
  }
  const hasPreviewPalette=m=>m?.status==='visualization_only'&&Array.isArray(m.previewColors);
  const colorsFor=m=>((hasPreviewPalette(m)?m.previewColors:m?.colors)||[]).filter(c=>c&&typeof c==='object'&&c.id&&c.name);
  const patternsFor=m=>Array.isArray(m?.allowedPatterns)?m.allowedPatterns:[];
  const orientationsFor=m=>Array.isArray(m?.allowedOrientations)?m.allowedOrientations:[];
  function officialColor(m,old={}){
    const colors=colorsFor(m),matched=colors.find(c=>c.id===old.colorId);
    const hadChoice=['colorId','colorName','color'].some(k=>Object.prototype.hasOwnProperty.call(old,k))||old.colorSelectionStatus==='unassigned';
    // Only a documented identifier for this product can carry an existing finish.
    // A fresh MIR proposal may use its first swatch; a stale choice is never replaced.
    const illustrative=hasPreviewPalette(m);
    const color=matched||(illustrative||!hadChoice?colors[0]:null),sample=swatchImages.get(color?.swatchUrl);
    return {colorId:color?.id||null,colorName:color?.name||null,colorSelectionStatus:color?(illustrative?'illustrative':'documented'):'unassigned',color:validHex(color?.hex||'')?color.hex:sample?.displayHex||NEUTRAL,colorSwatchUrl:color?.swatchUrl||null,colorValueSource:validHex(color?.hex||'')?(illustrative?'illustrative_hex':'official_hex'):sample?.displayHex?'sampled_official_swatch_for_display':'neutral_placeholder',brand:m?.brand||null};
  }
  function normalChoice(raw={},fallback){
    const m=materialById.get(raw.materialId)||materialById.get(fallback)||facadeMaterials[0];
    const patterns=patternsFor(m),orientations=orientationsFor(m);
    const orientation=orientations.includes(raw.orientation)?raw.orientation:orientations[0]||null;
    let pattern=patterns.includes(raw.pattern)?raw.pattern:patterns.includes(m.renderPattern)?m.renderPattern:patterns[0]||'plain';
    if(['lap','vertical'].includes(pattern)){
      const directed=orientation==='vertical'?'vertical':'lap';if(patterns.includes(directed))pattern=directed;
    }
    const sizing=C.coverageSpec(m,{...raw,pattern,orientation});
    const spacingOptions=m.verticalLayout?.battenSpacingOptionsIn||[];
    const battenSpacingIn=spacingOptions.includes(Number(raw.battenSpacingIn))?Number(raw.battenSpacingIn):spacingOptions[0]||null;
    return {...raw,materialId:m.id,...officialColor(m,raw),pattern,orientation,...(battenSpacingIn?{battenSpacingIn}:{}),...(pattern==='panel'&&sizing.formatId?{formatId:sizing.formatId}:{})};
  }
  function defaultChoice(z){return normalChoice({},z.kind==='masonry'?'generic-brick-preview':z.id.includes('insert')||z.custom?'mac-norwood':z.id.includes('pignon')||z.id==='pilier'?'hardiepanel':'canexel-ridgewood-d5');}
  function choice(f,z){return normalChoice(state.selections[key(f.key,z.id)]||defaultChoice(z));}
  // Preserve product choices while removing the former free-colour/pattern overrides.
  // Their old colour values remain in the JSON for reference, never as a product finish.
  if(!state.legacyStudyColors){state.legacyStudyColors=Object.fromEntries(Object.entries(state.selections).map(([id,c])=>[id,{color:c.color,colorName:c.colorName}]));state.catalogueVersion=4;}
  for(const f of data.faces)for(const z of allZones(f))state.selections[key(f.key,z.id)]=choice(f,z);
  function normalizeFinish(kind){const m=materialById.get(state[kind+'Id']),c=officialColor(m,{colorId:state[kind+'ColorId']});state[kind+'ColorId']=c.colorId;state[kind+'Color']=c.color;}
  normalizeFinish('soffit');normalizeFinish('fascia');
  function readTakeoff(){try{const item=JSON.parse(localStorage.getItem(TAKEOFF_STORAGE));return item?.version===1?item:{};}catch(_){return {};}}
  function feetPerPixel(f){if(f.renderFeetPerPixel>0)return f.renderFeetPerPixel;const c=readTakeoff().calibrations?.[f.key]||takeoffSeed.calibrations?.[f.key];return E.calibrate(c?.anchors,c?.referenceFt);}
  function normalFace(f){return {...f,feetPerPixel:feetPerPixel(f),zones:allZones(f).map(z=>({...z,selection:choice(f,z)})),openings:allOpenings(f)};}
  function decoratedFace(f,projected=false){
    const prepared=normalFace(f);
    if(projected)prepared.openings=prepared.openings.filter(o=>{
      const id=key(f.key,o.id),trim=state.openingTrims[id]?.mode;
      return !o.needsReview||o.custom||state.openingOverrides[id]||(trim&&trim!=='none');
    });
    return L.decorateFace(prepared,state,materials);
  }
  function panelSpec(m,c={}){
    const spec=C.coverageSpec(m,c);
    return {maxWidthIn:spec.physicalDisplayWidthIn||null,maxLengthIn:spec.physicalDisplayHeightIn||null,rotationAllowed:state.panelStockRotation!==false,formatId:spec.formatId,known:!!spec.complete,stockKnown:!!spec.complete};
  }
  function panelLayoutFor(f,z){
    const c=z.selection||choice(f,z),m=materialById.get(c.materialId),b=bounds(z.polygon),scale=feetPerPixel(f),id=key(f.key,z.id),saved=state.panelLayouts[id];
    const generated=C.panelGrid(b,scale,m,c);
    const manual=saved&&saved.mode!=='product'&&!C.isLegacyAutomatic?.(saved,b,scale,m);
    const layout=manual?{...saved,mode:'manual',vertical:L.normaliseLines(saved.vertical),horizontal:L.normaliseLines(saved.horizontal)}:generated;
    const rule=V?.verticalRule(m,c);
    if(!rule||c.pattern!=='panel')return layout;
    // Pour Board & Batten, la moulure de transition EST la jointure
    // horizontale du panneau, pas un trait décoratif indépendant.
    const existing=state.transitions.filter(t=>t.face===f.key&&t.zoneId===z.id&&t.orientation==='horizontal');
    const automatic=state.manualTransitionModes[id]?[]:V.breaks({
      polygon:z.polygon,feetPerPixel:scale,material:m,choice:c,openings:allOpenings(f),
      manualTransitions:existing
    }).items.map(t=>({position:t.position,source:'auto'}));
    const horizontal=L.normaliseLines([...existing.map(t=>({id:'transition-'+t.id,position:t.position})),
      ...automatic.map((t,i)=>({id:'auto-transition-'+i,position:t.position}))]);
    return {...layout,mode:'mir-transition-linked',horizontal,
      linkedTransitionMaxIn:rule.maxRunIn,linkedTransitionCount:horizontal.length};
  }
  function panelResult(f,z,prepared){
    const spec=panelSpec(materialById.get(choice(f,z).materialId),choice(f,z));
    const result=E.panelLayout(prepared||decoratedFace(f),z.id,panelLayoutFor(f,z),spec);
    if(!spec.known){result.complete=false;result.cells=result.cells.map(c=>({...c,fits:null}));}
    return result;
  }
  function materialAnchors(f){
    const scale=feetPerPixel(f),box=f.textureBox||f.bbox;
    return {anchorX:box?.[0]||0,anchorY:box&&scale>0?box[1]+box[3]+(f.textureBottom||0)/.3048/scale:0};
  }
  function readTakeoffGeometry() {
    let saved;
    try {const item=JSON.parse(localStorage.getItem(TAKEOFF_STORAGE));if(item?.version===1)saved=item.geometry;} catch(_) {}
    const result={};
    for(const field of Object.keys(RECESS_FIELDS)) {
      const value=saved?.[field], fallback=takeoffSeed.geometry?.[field];
      if(typeof value==='number'&&Number.isFinite(value)) result[field]=value;
      else if(typeof fallback==='number'&&Number.isFinite(fallback)) result[field]=fallback;
    }
    return result;
  }
  let takeoffGeometry=readTakeoffGeometry(), takeoffGeometrySignature=JSON.stringify({geometry:takeoffGeometry,calibrations:readTakeoff().calibrations});
  function sceneGeometryBase() {
    const footprint=typeof data.footprint==='string'?data.footprint:{...(data.footprint||{})};
    const nested=footprint&&typeof footprint==='object'?footprint.recess:null;
    const recess={...(nested&&typeof nested==='object'?nested:{}),...(data.recess||{})};
    if(data.recess===false)recess.enabled=false;
    if(!recess.upperStorey)recess.upperStorey='flush-assumption';
    for(const [field,target] of Object.entries(RECESS_FIELDS))if(takeoffGeometry[field]!=null)recess[target]=takeoffGeometry[field]*.3048;
    const front=data.faces.find(f=>f.key==='front'),centre=front&&allZones(front).find(z=>z.id==='centre_RDC');
    if(centre)recess.returnColor=choice(front,centre).color;
    if(state.recessOverride)Object.assign(recess,state.recessOverride);
    // The former study preset stopped the recess at the porch ceiling. Fred
    // confirmed continuous alignment at both storeys; existing saved volume
    // edits must inherit this correction without losing depths or finishes.
    // Client-imported plans never inherit this study-specific interpretation.
    if(data.projectKind!=='imported-pdf'&&data.recessRevision>=4&&data.recess?.upperStorey==='recessed-confirmed'){
      recess.upperStorey='recessed-confirmed';
      recess.height=(state.volumeOverride||data.dimensions)?.wallHeight;
    }
    if(['width','depth','height'].some(field=>Number.isFinite(recess[field])&&recess[field]<=0))recess.enabled=false;
    return {footprint,recess};
  }
  function sceneGeometry(){const base=sceneGeometryBase(),extra=studioFeatures?.threeOptions()||{};if(extra.returnColors)base.recess.returnColors=extra.returnColors;return {...base,...extra};}
  function syncTakeoffGeometry() {
    const next=readTakeoffGeometry(),signature=JSON.stringify({geometry:next,calibrations:readTakeoff().calibrations});
    if(signature===takeoffGeometrySignature)return;
    takeoffGeometry=next;takeoffGeometrySignature=signature;
    renderDrawing();renderControl();
  }
  function toast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
  let studyRevision=0;
  function notifyStudy(){if(window.parent&&window.parent!==window)window.parent.postMessage({type:'mir:study-change',source:'mir-studio',version:2,revision:++studyRevision},window.location.origin);}
  function save(){for(const field of ['bands','openingTrims'])for(const [id,config] of Object.entries(state[field]))state[field][id]={...config,...officialColor(materialById.get(config.materialId),config)};for(const f of data.faces)for(const z of allZones(f))if(choice(f,z).pattern==='panel')state.panelLayouts[key(f.key,z.id)]=panelLayoutFor(f,z);try{localStorage.setItem(STORAGE,JSON.stringify(state));notifyStudy();$('#saved-label').textContent='Choix enregistrés sur cet appareil';}catch(_){$('#saved-label').textContent='Mémoire locale indisponible · exportez vos choix';}}
  function checkpoint() {history.push(clone(state));if(history.length>30)history.shift();$('#undo').disabled=false;}
  function modify(fn) {checkpoint();fn();save();render();}
  function setChoice(patch){const z=currentZone();if(!z)return;modify(()=>{const old=choice(face(),z),changedProduct=patch.materialId&&patch.materialId!==old.materialId,raw={...old,...patch};if(changedProduct){delete raw.formatId;delete raw.exposureIn;delete raw.battenSpacingIn;delete state.manualTransitionModes[key(state.face,z.id)];}state.selections[key(state.face,z.id)]=normalChoice(raw);if(changedProduct||Object.hasOwn(patch,'formatId')||Object.hasOwn(patch,'orientation'))delete state.panelLayouts[key(state.face,z.id)];selectedJoint=null;});}
  function ensureSelected() {if(!data.faces.some(f=>f.key===state.face))state.face=data.faces[0].key;if((state.selected.kind==='zone'&&!currentZone())||(state.selected.kind==='opening'&&!currentOpening()))state.selected={kind:'zone',id:allZones(face())[0]?.id||null};}
  function renderPattern(c){return c.pattern==='lap'&&c.orientation==='vertical'?'vertical':c.pattern;}
  function patternDef(id,c,f,z,monochrome=neutral){
    const material=materialById.get(c.materialId),selected=colorsFor(material).find(v=>v.id===c.colorId),rawSample=swatchImages.get(selected?.swatchUrl);
    // Photos containing several installed boards cannot become repeating profile
    // geometry. Keep the official grain only for the fibre-cement colour textures.
    const sample=material?.family==='Fibrociment'&&rawSample?{...rawSample,assetKind:selected?.assetKind}:null;
    return window.MIRMaterialSurface.patternDef({id,material,choice:c,feetPerPixel:feetPerPixel(f),bounds:bounds(z.polygon),...materialAnchors(f),sample,monochrome});
  }
  function ancestorClips(z, zones, prefix) {
    const ancestors=[], seen=new Set([z.id]); let parent=z.parent;
    while(parent&&!seen.has(parent)){const p=zones.find(v=>v.id===parent);if(!p)break;ancestors.push(`<g clip-path="url(#${prefix}clip-${p.id})">`);seen.add(parent);parent=p.parent;}
    return [ancestors.join(''),'</g>'.repeat(ancestors.length)];
  }
  function orderedZones(zones) {
    // Same paint contract as takeoff-engine: ancestor depth, numeric priority
    // (masonry defaults to -2), then stable input order. Invalid parent chains
    // are excluded instead of painting an accent outside an unknown parent.
    const byId=new Map(),rows=zones.map((zone,index)=>({zone,index,depth:0,valid:true}));
    for(const row of rows){if(byId.has(row.zone.id))row.valid=false;else byId.set(row.zone.id,row);}
    const visiting=new Set(),finished=new Set();
    function resolve(row) {
      if(finished.has(row.index))return row.valid;
      if(visiting.has(row.index)){row.valid=false;return false;}
      visiting.add(row.index);
      if(row.zone.parent!=null){const parent=byId.get(row.zone.parent);if(!parent||!resolve(parent))row.valid=false;else row.depth=parent.depth+1;}
      visiting.delete(row.index);finished.add(row.index);return row.valid;
    }
    rows.forEach(resolve);
    const priority=z=>typeof z.priority==='number'&&Number.isFinite(z.priority)?z.priority:z.kind==='masonry'?-2:0;
    return rows.filter(row=>row.valid).sort((a,b)=>(a.zone.decorationLayer||0)-(b.zone.decorationLayer||0)||a.depth-b.depth||priority(a.zone)-priority(b.zone)||a.index-b.index).map(row=>row.zone);
  }
  function pointInside(point,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
  function roofTrimPaths(f,type){
    return (f[type]||[]).filter(points=>{
      if(points.length!==2||Math.abs(points[0][1]-points[1][1])>2)return true;
      const centre=[(points[0][0]+points[1][0])/2,(points[0][1]+points[1][1])/2];
      return !allZones(f).some(z=>z.polygon.length===5&&z.id.includes('pignon')&&pointInside(centre,z.polygon));
    });
  }
  function facadeSVG(f,options={}){
    if(options===true)options={texture:true};
    const texture=!!options.texture,interactive=!texture&&!options.export,annotated=options.annotated??(!texture&&state.displayMode==='atelier'),monochrome=options.monochrome??neutral;
    const sourceVisual=facadeVisuals.get(f.key),visual=texture?sourceVisual:null;
    const prepared=decoratedFace(f,!!visual),zones=orderedZones(prepared.zones),openings=prepared.openings,vb=visual?.box||(texture?f.textureBox:f.bbox),prefix=`v${f.key}-`;
    const poly=(points,attrs='')=>`<polygon points="${pts(points)}" ${attrs}/>`;
    const holes=openings.map(o=>poly(o.polygon,'fill="black"')).join(''),defs=[];
    defs.push(`<pattern id="${prefix}roof" width="35" height="13" patternUnits="userSpaceOnUse"><rect width="35" height="13" fill="${monochrome?'#f1f2ec':state.roofColor||'#59605a'}"/><path d="M0 12H35M17 0V12" stroke="${monochrome?'#a6ada2':'#414941'}" stroke-width=".8"/></pattern>`);
    defs.push(`<pattern id="${prefix}occlusion" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V14" stroke="#a47935" stroke-width="3" opacity=".25"/></pattern>`);
    for(const z of zones){defs.push(patternDef(prefix+z.id,z.selection||choice(f,z),f,z,monochrome));defs.push(`<clipPath id="${prefix}clip-${esc(z.id)}">${poly(z.polygon)}</clipPath>`);}
    for(let i=0;i<zones.length;i++){
      const z=zones[i],covers=zones.slice(i+1).map(later=>{const [a,b]=ancestorClips(later,zones,prefix);return a+poly(later.polygon,'fill="black"')+b;}).join('');
      defs.push(`<mask id="${prefix}mask-${esc(z.id)}" maskUnits="userSpaceOnUse" x="${vb[0]-100}" y="${vb[1]-100}" width="${vb[2]+200}" height="${vb[3]+200}">${poly(z.polygon,'fill="white"')}${holes}${covers}</mask>`);
    }
    let content=texture?'':`<ellipse cx="${vb[0]+vb[2]/2}" cy="${vb[1]+vb[3]-38}" rx="${vb[2]*.45}" ry="12" fill="#2430240b"/>`;
    if(!texture&&f.sourceImage)content+=`<image href="${esc(f.sourceImage)}" x="${f.sourceImageBox?.[0]||0}" y="${f.sourceImageBox?.[1]||0}" width="${f.sourceImageBox?.[2]||f.sourceWidth||f.bbox[2]}" height="${f.sourceImageBox?.[3]||f.sourceHeight||f.bbox[3]}" opacity=".45" preserveAspectRatio="none"/>`;
    if(!texture)content+=poly(f.roof,`fill="url(#${prefix}roof)" stroke="#485244" stroke-width="2"`);
    content+=poly(f.base,`fill="${monochrome?'#fff':'#d7d7cc'}" stroke="#9ca594" stroke-width="2"`);
    for(const z of zones){
      const [a,b]=ancestorClips(z,zones,prefix),target=z.decorationType==='opening-trim'?`data-opening="${esc(z.sourceOpeningId)}"`:`data-zone="${esc(z.sourceZoneId||z.id)}"`;
      const select=interactive?`class="paint-zone" ${target} role="button" tabindex="0" aria-label="${esc(z.name)}"`:'';
      content+=a+`<polygon ${select} points="${pts(z.polygon)}" fill="url(#${prefix+esc(z.id)})" mask="url(#${prefix}mask-${esc(z.id)})" stroke="${monochrome?'#6c7865':'#3c49384d'}" stroke-width="1.3"><title>${esc(z.name)}</title></polygon>`+b;
    }
    // Visible configured seams are also used by the takeoff engine; openings,
    // nested accents, bands and opening trims are removed by the exact same mask.
    for(const z of zones.filter(z=>!z.decorationType)){
      const c=z.selection||choice(f,z),[x0,y0,x1,y1]=bounds(z.polygon),[a,b]=ancestorClips(z,zones,prefix);
      let lines='';
      if(c.pattern==='panel'){
        const layout=panelLayoutFor(f,z),result=annotated?panelResult(f,z,prepared):{cells:[]};
        for(const orientation of ['vertical','horizontal'])for(const joint of layout[orientation]){
          const selected=selectedJoint?.zoneId===z.id&&selectedJoint.id===joint.id&&selectedJoint.orientation===orientation;
          const x=x0+(x1-x0)*joint.position,y=y0+(y1-y0)*joint.position,d=orientation==='vertical'?`M${x} ${y0}V${y1}`:`M${x0} ${y}H${x1}`;
          const attrs=interactive?`data-joint="${esc(joint.id)}" data-joint-zone="${esc(z.id)}" data-orientation="${orientation}" role="button" tabindex="0" aria-label="Joint ${orientation==='vertical'?'vertical':'horizontal'} de ${esc(z.name)}, déplacer ou saisir sa position"`:'';
          lines+=`<path d="${d}" fill="none" stroke="${selected?'#b16b32':'#485044'}" stroke-width="${selected?3.5:2}" pointer-events="none"/>`;
          if(interactive)for(const segment of E.clipLineToZone(prepared,z.id,orientation,joint.position).segments)lines+=`<path ${attrs} d="M${segment[0].join(' ')}L${segment[1].join(' ')}" fill="none" stroke="transparent" stroke-width="16" class="joint-hit ${orientation}"/>`;
        }
        if(annotated)for(const cell of result.cells||[]){
          if(!(cell.areaFt2>0))continue;
          const bb=cell.boundsPx||[x0,y0,x1,y1],centre=cell.labelPoint||[(bb[0]+bb[2])/2,(bb[1]+bb[3])/2],font=Math.max(9,Math.min(17,(bb[2]-bb[0])*.105,(bb[3]-bb[1])*.25));
          lines+=`<text x="${centre[0]}" y="${centre[1]}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${font}" font-weight="600" fill="${cell.fits===false?'#9a3e2b':'#25362d'}" paint-order="stroke" stroke="#f9faf5" stroke-width="5" stroke-linejoin="round" pointer-events="none">${esc(L.inches(cell.widthIn))} × ${esc(L.inches(cell.heightIn))}</text>`;
        }
      }
      for(const t of state.transitions.filter(t=>t.face===f.key&&t.zoneId===z.id)){
        const x=x0+(x1-x0)*t.position,y=y0+(y1-y0)*t.position,d=t.orientation==='vertical'?`M${x} ${y0}V${y1}`:`M${x0} ${y}H${x1}`;
        lines+=`<path d="${d}" fill="none" stroke="${validHex(t.color)?t.color:'#56654d'}" stroke-width="4" stroke-dasharray="${annotated?'9 3':''}" pointer-events="none"/>`;
        if(interactive)for(const segment of E.clipLineToZone(prepared,z.id,t.orientation,t.position).segments)lines+=`<path d="M${segment[0].join(' ')}L${segment[1].join(' ')}" fill="none" stroke="transparent" stroke-width="17" data-transition="${esc(t.id)}" class="joint-hit ${t.orientation}" role="button" tabindex="0" aria-label="Déplacer la transition de ${esc(z.name)}"/>`;
      }
      // Transitions horizontales : longueur du profil (10 ou 12 pi) et
      // préférence pour le dessus d'un châssis, même dans la texture 3D.
      const rule=V?.verticalRule(materialById.get(c.materialId),c);
      if(rule&&!state.manualTransitionModes[key(f.key,z.id)]){
        const proposed=V.breaks({polygon:z.polygon,feetPerPixel:feetPerPixel(f),
          material:materialById.get(c.materialId),choice:c,openings,
          manualTransitions:state.transitions.filter(t=>t.face===f.key&&t.zoneId===z.id)});
        for(const t of proposed.items){
          lines+='<path data-mir-auto-transition="'+esc(z.id)+'" data-mir-max-length="'+rule.maxRunIn+
            '" data-mir-transition-origin="'+esc(t.source)+'" d="M'+x0+' '+t.y+'H'+x1+
            '" stroke="#425c4b" stroke-width="3" stroke-dasharray="'+(annotated?'7 3':'none')+
            '" fill="none" pointer-events="none"/>';
        }
        const battens=V.battens({polygon:z.polygon,feetPerPixel:feetPerPixel(f),
          material:materialById.get(c.materialId),choice:c,openings});
        if(battens.complete&&battens.lines.length){
          const perIn=1/(feetPerPixel(f)*12),under=Math.max(1,1.7*perIn),visible=Math.max(.8,1.35*perIn);
          for(const line of battens.lines){
            const d='M'+line.x+' '+y0+'V'+y1;
            lines+='<path data-mir-batten-spacing="'+battens.spacingIn+
              '" data-mir-batten-anchor="'+esc(battens.alignment)+'" d="'+d+
              '" fill="none" stroke="#1d2b22" stroke-width="'+under+
              '" stroke-opacity=".48" pointer-events="none"/>'+
              '<path d="'+d+'" fill="none" stroke="'+esc(c.battenColor||c.color||'#d3d6cd')+
              '" stroke-width="'+visible+'" pointer-events="none"/>';
          }
        }
      }
      if(lines)content+=a+`<g mask="url(#${prefix}mask-${esc(z.id)})">${lines}</g>`+b;
    }
    if(!texture&&f.extraRoof)content+=poly(f.extraRoof,`fill="url(#${prefix}roof)" stroke="#46503f" stroke-width="2"`);
    // The stored soffit paths locate undersides; they are not vertical faces.
    // Thick strokes here painted a false strip onto the wall in orthographic
    // elevations and their SVG/PDF exports. Soffit finishes remain on the real
    // 3D undersides and in the takeoff data; only the fascia faces this view.
    const fasciaColor=monochrome?'#75816e':state.fasciaColor;
    if(!texture)roofTrimPaths(f,'fascia').forEach(p=>content+=`<polyline points="${pts(p)}" fill="none" stroke="${fasciaColor}" stroke-linejoin="round" stroke-width="10"/>`);
    if(sourceVisual?.foundation){
      const [fx,fy,fw,fh]=sourceVisual.foundation.box;
      content+=`<rect data-mir-foundation="${esc(sourceVisual.foundation.source)}" x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="${monochrome?'#eeeeea':'#c3c5bc'}"><title>Solage repéré sur le PDF</title></rect>`;
    }
    // Reference the facade raster once, even if dozens of windows use it.
    const windowLineworkId=prefix+'window-linework';
    if(sourceVisual&&(visual||openings.some(o=>o.type==='window'&&!o.custom))){
      const [sx,sy,sw,sh]=sourceVisual.box;
      defs.push(`<image id="${windowLineworkId}" href="${sourceVisual.linework}" x="${sx}" y="${sy}" width="${sw}" height="${sh}" preserveAspectRatio="none"/>`);
    }
    if(visual)content+=`<use data-mir-plan-linework="true" href="#${windowLineworkId}"/>`;
    // Vitrages et portes MIR : échelle du PDF conservée.
    for(const o of openings){
      const [x0,y0,x1,y1]=bounds(o.polygon),w=x1-x0,h=y1-y0,mid=(x0+x1)/2;
      const style=openingAppearance(f,o),frame=monochrome?'#59645b':style.frameColor;
      const door=monochrome?'#b0b7b0':style.doorColor;
      const scale=feetPerPixel(f),side=Math.min(w,h);
      const rim=o.type==='door'?Math.max(2,side*.06):Math.min(side*.026,Number.isFinite(scale)&&scale>0?2/12/scale:Infinity);
      const planWindow=o.type==='window'&&sourceVisual&&!o.custom&&!state.openingOverrides[key(f.key,o.id)];
      const glass=monochrome?'#e1e5df':'#cee1dd';
      const clip=prefix+'opening-'+esc(o.id);
      const attrs=interactive?' data-opening="'+esc(o.id)+'" class="opening-hit" role="button" tabindex="0" aria-label="'+(o.type==='door'?'Porte ':'Fenêtre ')+esc(o.id)+'"':'';
      let art='<g'+attrs+' data-mir-opening-type="'+o.type+'" data-mir-opening-design="'+esc(style.design)+'" data-mir-frame-color="'+esc(frame)+'" data-mir-frame-width="'+rim.toFixed(3)+'">';
      art+='<clipPath id="'+clip+'">'+poly(o.polygon)+'</clipPath>';
      art+=poly(o.polygon,'fill="'+(o.type==='door'?door:glass)+'" stroke="'+frame+'" stroke-width="'+(rim*1.45)+'"');
      art+='<g clip-path="url(#'+clip+')">';
      if(o.type==='door'){
        const inset=Math.max(3,rim),ix=x0+inset,iy=y0+inset,iw=Math.max(1,w-2*inset),ih=Math.max(1,h-2*inset);
        art+='<rect x="'+ix+'" y="'+iy+'" width="'+iw+'" height="'+ih+'" rx="'+Math.max(1,rim*.25)+'" fill="'+door+'" stroke="'+frame+'" stroke-width="'+Math.max(.8,rim*.32)+'"/>';
        if(style.design==='patio'){
          const gap=Math.max(1,rim*.32),sw=Math.max(1,(iw-gap)/2);
          for(let k=0;k<2;k++){const gx=ix+k*(sw+gap)+inset*.18,gw=Math.max(1,sw-inset*.36);
            art+='<rect x="'+gx+'" y="'+(iy+inset*.17)+'" width="'+gw+'" height="'+(ih-inset*.5)+'" fill="'+glass+'" stroke="'+frame+'" stroke-width="'+Math.max(1,rim*.45)+'"/>';
            art+='<path d="M'+gx+' '+(iy+ih*.83)+'l'+gw+' '+(-ih*.48)+'" stroke="#fff" stroke-opacity=".28" stroke-width="'+Math.max(1,rim*.52)+'"/>';}
          art+='<path d="M'+mid+' '+iy+'V'+(iy+ih)+'" stroke="'+frame+'" stroke-width="'+Math.max(2,rim*.75)+'"/>';
          art+='<rect x="'+(mid-rim*.95)+'" y="'+(iy+ih*.55)+'" width="'+(rim*.4)+'" height="'+(ih*.15)+'" rx="1" fill="#d1d9d5"/>';
          art+='<rect x="'+(mid+rim*.55)+'" y="'+(iy+ih*.55)+'" width="'+(rim*.4)+'" height="'+(ih*.15)+'" rx="1" fill="#d1d9d5"/>';
        }else{
          const panelTop=iy+inset*.42,panelWidth=Math.max(1,iw-inset*.75);
          if(style.design==='half-glass'){
            art+='<rect x="'+(ix+inset*.4)+'" y="'+panelTop+'" width="'+panelWidth+'" height="'+(ih*.47)+'" fill="'+glass+'" stroke="'+frame+'" stroke-width="'+Math.max(1,rim*.43)+'"/>';
            art+='<path d="M'+(ix+inset*.4)+' '+(panelTop+ih*.35)+'l'+panelWidth+' '+(-ih*.27)+'" stroke="#ffffff" stroke-opacity=".33" stroke-width="'+Math.max(1,rim*.52)+'"/>';
          }
          art+='<rect x="'+(ix+inset*.4)+'" y="'+(iy+ih*.62)+'" width="'+panelWidth+'" height="'+(ih*.29)+'" rx="1" fill="none" stroke="'+frame+'" stroke-opacity=".8" stroke-width="'+Math.max(1,rim*.35)+'"/>';
          art+='<circle cx="'+(ix+iw*.83)+'" cy="'+(iy+ih*.56)+'" r="'+Math.max(1,rim*.19)+'" fill="#e3e7e2" stroke="#607069" stroke-width=".9"/>';
          art+='<rect x="'+(ix+iw*.81)+'" y="'+(iy+ih*.56)+'" width="'+Math.max(1,rim*.19)+'" height="'+Math.max(3,ih*.105)+'" rx="1" fill="#dee3df"/>';
        }
        art+='<rect x="'+x0+'" y="'+(y1-Math.max(2,rim*.4))+'" width="'+w+'" height="'+Math.max(2,rim*.4)+'" fill="#8c9690"/>';
      } else if(planWindow){
        art+=`<use data-mir-window-source="pdf" href="#${windowLineworkId}"/>`;
      } else {
        art+='<path d="M'+x0+' '+(y1-h*.18)+'L'+x1+' '+(y0+h*.18)+'" stroke="#fff" stroke-opacity=".27" stroke-width="'+Math.max(1,rim)+'"/>';
        art+='<path d="M'+mid+' '+y0+'V'+y1+'" stroke="'+frame+'" stroke-width="'+Math.max(.55,rim*.65)+'"/>';
        art+='<path d="M'+x0+' '+(y1-h*.28)+'H'+x1+'" stroke="'+frame+'" stroke-width="'+Math.max(.45,rim*.47)+'"/>';
        art+='<path d="M'+(x0+rim*.5)+' '+(y0+rim*.6)+'H'+(x1-rim*.5)+'" stroke="#f0f7f1" stroke-opacity=".43" stroke-width="'+Math.max(1,rim*.34)+'"/>';
      }
      art+='</g>'+poly(o.polygon,'fill="none" stroke="'+frame+'" stroke-width="'+Math.max(1,rim*.63)+'"');
      if(o.type==='window'&&style.showBatten)art+=poly(o.polygon,'fill="none" stroke="'+style.battenColor+
        '" stroke-width="'+Math.max(1,rim*1.45)+'" stroke-linejoin="miter" data-mir-window-batten="true"');
      art+='</g>';
      content+=art;
    }
    if(interactive&&detection){content+=(f.detected||[]).map(z=>poly(z.polygon,`fill="${z.color}" fill-opacity=".17" stroke="${z.color}" stroke-width="2.5" pointer-events="none"`)).join('');content+=(f.occlusions||[]).map(b=>`<rect x="${b[0]}" y="${b[1]}" width="${b[2]-b[0]}" height="${b[3]-b[1]}" fill="url(#${prefix}occlusion)" pointer-events="none"/>`).join('');}
    if((interactive||options.selection)&&f.key===state.face){const selected=state.selected.kind==='zone'?zones.find(z=>z.id===state.selected.id):openings.find(o=>o.id===state.selected.id);if(selected){const [a,b]=ancestorClips(selected,zones,prefix);content+=a+poly(selected.polygon,'fill="none" stroke="#91a863" stroke-width="3" stroke-dasharray="9 5" class="selection-outline"')+b;}}
    const scale=feetPerPixel(f);
    const placement=visual?' data-fit-wall-height="true"':Number.isFinite(scale)&&scale>0?` data-meters-per-unit="${scale*.3048}"`:'';
    return `<svg xmlns="http://www.w3.org/2000/svg"${placement} viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}" aria-label="Élévation ${esc(f.name)}"><defs>${defs.join('')}</defs>${content}</svg>`;
  }
  let rendering=0,textureCache={signature:null,views:null};
  function threeViews(){
    const signature=JSON.stringify({face:state.face,selected:state.selected,mode:state.displayMode,neutral,roofColor:state.roofColor,returnFinishes:state.returnFinishes,selections:state.selections,customZones:state.customZones,zoneOverrides:state.zoneOverrides,openingOverrides:state.openingOverrides,addedOpenings:state.addedOpenings,bands:state.bands,openingTrims:state.openingTrims,openingStyles:state.openingStyles,panelLayouts:state.panelLayouts,transitions:state.transitions,calibrations:readTakeoff().calibrations||takeoffSeed.calibrations});
    if(signature!==textureCache.signature){textureCache={signature,views:Object.fromEntries(data.faces.filter(f=>f.importedStatus!=='unassigned').map(f=>[f.key,facadeSVG(f,{texture:true,annotated:state.displayMode==='atelier',selection:true})]))};}
    return {...textureCache.views,...(studioFeatures?.returnViews(patternDef)||{})};
  }

  function frontFoundationHeight(f,dim){
    const visual=facadeVisuals.get(f.key);
    if(visual?.foundation)return visual.foundation.box[3]/visual.box[3]*dim.wallHeight;
    if(data.projectKind==='imported-pdf'||!f.base.length)return 0;
    // The reviewed study drawing marks the base of the masonry above the
    // exposed concrete. Convert its PDF drawing distance into the same Z datum.
    const box=f.textureBox,scale=f.physicalWidth/box[2];
    return Math.max(0,(box[1]+box[3]-bounds(f.base)[3])*scale);
  }
  function frontMasonryBand(f,dim){
    const visual=facadeVisuals.get(f.key);
    const zones=allZones(f).map(zone=>{
      const material=materialById.get(choice(f,zone).materialId);
      return {...zone,kind:material?.applications.includes('masonry')?'masonry':'siding'};
    });
    const source={...f,zones,textureBox:visual?.box||f.textureBox};
    return window.MIRStudioWallParts?.masonryBand(source,dim,{feetPerPixel:feetPerPixel(f),fitWall:!!visual});
  }

  // Vues de côté 2D : afficher côte à côte les deux retours et le mur du
  // fond de l'entrée, avec les Z du même volume que la vue 3D. Import PDF
  // et facades non concernées conservent exactement leur vue actuelle.
  function sideStudyWithDetachedWalls(f,plain){
    const parts=window.MIRStudioWallParts;
    if(!parts||data.projectKind==='imported-pdf'||!['right','left'].includes(f.key)||!studioFeatures?.canRender())return plain;
    try{
      const front=data.faces.find(row=>row.key==='front');
      const dim=state.volumeOverride||data.dimensions;
      const band=front&&frontMasonryBand(front,dim);
      const mesh=window.MIR3D.mesh({dimensions:data.dimensions,...sceneGeometry(),foundationDrop:.8});
      const scale=parts.sideScale(f,dim.wallHeight);
      if(!scale)return plain;
      const masonry=band&&allZones(front).find(z=>z.id===band.sourceZoneId);
      const masonrySelection=band&&masonry?choice(front,masonry):null;
      let brickPattern='';
      if(masonrySelection){
        const pxPerFoot=1/(scale.pixelsPerMeter*.3048);
        const source={key:'mir-side-exploded',renderFeetPerPixel:pxPerFoot,
          textureBox:[0,0,1,scale.groundY],textureBottom:0};
        const z={id:'mir-exploded-brick',polygon:[[0,0],[100,0],[100,100],[0,100]]};
        brickPattern=patternDef('mir-exploded-brick',masonrySelection,source,z,false);
      }
      const colors={
        'return-left':studioFeatures.returnChoice('return-left').color,
        'return-right':studioFeatures.returnChoice('return-right').color
      };
      const rendered=parts.explodeSideSVG(plain,{sideFace:f,dimensions:dim,mesh,
        brickBand:band,brickPattern,colors});
      return rendered?.svg||plain;
    }catch(error){
      // Une élévation 2D existante ne disparaît jamais si une surface manque.
      window.MIR_SIDE_WALL_WARNING=String(error?.message||error);
      return plain;
    }
  }
  async function renderDrawing(){
    const f=face(),n=++rendering;
    renderCoverageSummary();
    $('#elevation').hidden=state.view==='3d';$('#three-canvas').hidden=state.view!=='3d';$('#rotate-control').hidden=state.view!=='3d';
    $('#volume-unavailable').hidden=true;
    const sideView=$('#elevation'),sideButton=$('#mir-side-wall-scroll');
    let homeViewBox=null,detachedViewBox=null;
    if(state.view==='2d'){
      const original=facadeSVG(f),view=sideStudyWithDetachedWalls(f,original);
      sideView.innerHTML=view;
      const sideSvg=sideView.querySelector('svg[data-mir-three-wall-explode="true"]');
      sideView.classList.toggle('mir-studio-detached-side',!!sideSvg);
      sideView.dataset.mode=state.displayMode;
      if(sideSvg&&matchMedia('(max-width:650px)').matches){
        // Sur un téléphone, garder toute la maison lisible. Le même SVG
        // affiche les trois murs à leur altitude sur une deuxième vue ciblée.
        const source=original.match(/viewBox="([^"]+)"/)?.[1].split(/[\s,]+/).map(Number);
        const full=sideSvg.viewBox.baseVal;
        if(source?.length===4&&source.every(Number.isFinite)&&full.width>source[2]){
          homeViewBox=source;
          const startX=source[0]+source[2]+40;
          detachedViewBox=[startX,source[1],Math.max(1,full.x+full.width-startX),source[3]];
          sideSvg.setAttribute('viewBox',homeViewBox.join(' '));
          sideSvg.dataset.mirHomeViewBox=homeViewBox.join(' ');
          sideSvg.dataset.mirWallsViewBox=detachedViewBox.join(' ');
        }
      }
    } else sideView.classList.remove('mir-studio-detached-side');
    if(sideButton){
      sideButton.hidden=!homeViewBox||!detachedViewBox;
      sideButton.textContent='Voir les retours →';
      let showingWalls=false;
      sideButton.onclick=()=>{
        const svg=sideView.querySelector('svg[data-mir-three-wall-explode="true"]');
        if(!svg||!homeViewBox||!detachedViewBox)return;
        showingWalls=!showingWalls;
        svg.setAttribute('viewBox',(showingWalls?detachedViewBox:homeViewBox).join(' '));
        sideButton.textContent=showingWalls?'← Voir la maison':'Voir les retours →';
      };
    }
    $('#stage-title').textContent=state.view==='3d'?'VOTRE PROJET / VUE 360°':`${f.page?String(f.page).padStart(2,'0')+' / ':''}ÉLÉVATION ${f.name.toLocaleUpperCase('fr')}`;
    $('#stage-subtitle').textContent=state.view==='3d'?'Cliquez pour choisir · glissez pour tourner et incliner':state.displayMode==='atelier'?'Déplacez les joints · cotes en pouces':'Cliquez sur une matière pour la modifier';
    $('#stage-note').textContent=state.view==='3d'?'Matières et finitions · vue interactive':'Fenêtres et portes protégées';
    $('#view-2d').setAttribute('aria-pressed',state.view==='2d');$('#view-3d').setAttribute('aria-pressed',state.view==='3d');
    $('#mir-fullscreen').hidden=state.view!=='3d';
    $('#mir-site-toggle').hidden=state.view!=='3d';
    $('#mir-stairs-toggle').hidden=state.view!=='3d';
    $('#mir-stairs-toggle').setAttribute('aria-pressed',String(state.concreteSteps?.enabled===true));
    $('#mir-stairs-toggle').textContent=state.concreteSteps?.enabled?'Masquer les marches':'Marches du balcon';
    $('#mir-zoom-controls').hidden=state.view!=='3d';
    $('#mir-zoom-label').textContent=Math.round((state.cameraZoom||1)*100)+' %';
    $('#mir-site-toggle').setAttribute('aria-pressed',String(state.siteStyle==='commercial'));
    $('#mir-site-toggle').textContent=state.siteStyle==='commercial'?'Masquer le terrain':'Terrain commercial';
    $('#rotation').value=state.rotation;$('#rotation-value').textContent=`${state.rotation}°`;
    $('#toggle-lines').setAttribute('aria-pressed',neutral);
    $('#draw-accent').disabled=false;
    $$('.face-tabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.face===state.face));
    if(state.view==='3d'){
      if(studioFeatures&&!studioFeatures.canRender()){$('#three-canvas').hidden=true;$('#volume-unavailable').hidden=false;$('#stage-note').textContent='Volume incomplet · vos élévations 2D restent accessibles';return;}
      try {
        const result=await window.MIR3D.render($('#three-canvas'),{views:threeViews(),angle:state.rotation,fasciaColor:state.fasciaColor,soffitColor:state.soffitColor,soffitType:materialById.get(state.soffitId)?.soffitType||'unknown',dimensions:data.dimensions,...sceneGeometry(),textureBottoms:Object.fromEntries(data.faces.map(v=>[v.key,v.textureBottom||0]))});
        if(n!==rendering)return;
        if(result.errors?.length)$('#stage-note').textContent='Une texture n’a pas chargé · revenez à l’élévation';
        else if(result.textureScaleWarnings?.length)$('#stage-note').textContent='Volume et élévation à recaler · les matériaux gardent leur taille réelle';
        else if(data.projectKind==='imported-pdf'&&data.faces.some(v=>v.sourceImage&&!facadeVisuals.has(v.key)))$('#stage-note').textContent='Certaines élévations restent à cadrer · ouvrez le plan 2D';
        else if(facadeVisuals.size)$('#stage-note').textContent='Détails des élévations projetés sur le volume';
        if(result.rendered&&data.projectKind==='imported-pdf'&&state.concreteSteps?.sourceCandidateId&&!result.errors?.length)
          $('#stage-note').textContent='Marches détectées par pixels et cotes du PDF · position et hauteur à confirmer';
        window.MIR_RENDER_DIAGNOSTICS=result;
      } catch(error) {
        if(n!==rendering)return;
        const canvas=$('#three-canvas');canvas.width=canvas.width;
        $('#stage-note').textContent=error.name==='RangeError'?'Géométrie à corriger dans Super admin · Métrés':'Rendu 3D indisponible · réessayez';
        $('#stage-subtitle').textContent=String(error.message||'Le rendu n’a pas pu être calculé.');
        window.MIR_RENDER_DIAGNOSTICS={rendered:false,error:String(error.message||error)};
      }
    }
  }
  function renderZones(){
    const f=face(),zs=allZones(f);
    $('#zone-count').textContent=`${zs.length} zones éditables`;
    $('#zone-list').innerHTML=zs.map(z=>{const c=choice(f,z);return `<button class="zone-button" data-select-zone="${esc(z.id)}" aria-pressed="${state.selected.kind==='zone'&&state.selected.id===z.id}"><span class="zone-chip" style="background:${c.color}"></span><span>${esc(z.name)}<small>${state.displayMode==='atelier'?esc((materialById.get(c.materialId)?.brand||'')+' · '+(materialById.get(c.materialId)?.name||'')):z.viewOnly==='2d'?'2D · retour d’entrée':z.parent?'Accent dans une zone':z.kind==='masonry'?'Visualisation seulement':z.custom?'Zone ajoutée':z.needsReview?'Contour proposé · à vérifier':'Tracé revu sur le plan'}</small></span></button>`;}).join('');
    $('#detection-panel').hidden=!detection;
    $('#show-detection').setAttribute('aria-pressed',detection);
    $('#detection-stats').innerHTML=`<div><strong>${f.detected.length}</strong><span>composantes détectées</span></div><div><strong>${f.candidates}</strong><span>candidats d’ouverture</span></div><div><strong>${f.openings.length}</strong><span>ouvertures revues</span></div>`;
  }
  function patternBackground(pattern,color){const line='#00000035';if(pattern==='vertical')return`repeating-linear-gradient(90deg,transparent 0 11px,${line} 11px 12px),${color}`;if(pattern==='brick')return`repeating-linear-gradient(0deg,transparent 0 11px,#ded9cd 11px 13px),repeating-linear-gradient(90deg,transparent 0 24px,#ded9cd 24px 26px),${color}`;if(pattern==='lap')return`repeating-linear-gradient(0deg,transparent 0 11px,${line} 11px 12px),${color}`;if(pattern==='panel')return`linear-gradient(90deg,transparent 48%,${line} 49% 51%,transparent 52%),${color}`;return color;}
  function productOptions(brandId,productId,rows,selectedId){
    const selected=rows.find(m=>m.id===selectedId)||rows[0],brands=[...new Set(rows.map(m=>m.brand))];
    $(brandId).innerHTML=brands.length?brands.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join(''):'<option value="">Référence à compléter</option>';
    $(brandId).disabled=!brands.length;if(selected)$(brandId).value=selected.brand;
    const filtered=rows.filter(m=>m.brand===selected?.brand);
    $(productId).innerHTML=filtered.length?filtered.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join(''):'<option value="">Aucun produit vérifié associé</option>';
    $(productId).disabled=!filtered.length;if(selected)$(productId).value=selected.id;
    return selected;
  }
  function colorOptions(selector,m,colorId){const cs=colorsFor(m),valid=cs.some(c=>c.id===colorId);$(selector).innerHTML=cs.length?`${valid?'':'<option value="" disabled>Choisissez un fini</option>'}${cs.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}`:'<option value="">Finition à confirmer</option>';$(selector).disabled=!cs.length;$(selector).value=valid?colorId:'';}
  const bandMaterials=()=>materials.filter(m=>m.applications.includes('band'));
  const trimMaterials=mode=>materials.filter(m=>m.applications.includes(mode==='capping'?'capping':'opening-trim'));
  function bandConfig(f,z){const saved=state.bands[key(f.key,z.id)]||{},m=bandMaterials().find(m=>m.id===saved.materialId)||bandMaterials()[0];return {enabled:false,heightIn:6,...saved,materialId:m?.id||null,...officialColor(m,saved)};}
  function trimConfig(f,o){const saved=state.openingTrims[key(f.key,o.id)]||{},mode=saved.mode||'none',rows=trimMaterials(mode),m=rows.find(m=>m.id===saved.materialId)||rows[0];return {mode,faceWidthIn:3.5,...saved,materialId:m?.id||null,...officialColor(m,saved)};}
  function setBand(patch){const z=currentZone();if(!z)return;modify(()=>{const merged={...bandConfig(face(),z),...patch};state.bands[key(state.face,z.id)]={...merged,...officialColor(materialById.get(merged.materialId),merged)};});}
  function setTrim(patch){const o=currentOpening();if(!o)return;modify(()=>{const merged={...trimConfig(face(),o),...patch};state.openingTrims[key(state.face,o.id)]={...merged,...officialColor(materialById.get(merged.materialId),merged)};});}
  function layoutDimension(f,z,orientation){const b=bounds(z.polygon);return (orientation==='vertical'?b[2]-b[0]:b[3]-b[1])*feetPerPixel(f)*12;}
  function parseInches(value){const v=String(value).trim().replace(',','.').replace(/\s*(po|in|[″"])$/i,''),mixed=v.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/),fraction=v.match(/^(\d+)\/(\d+)$/);if(mixed&&Number(mixed[3]))return Number(mixed[1])+Number(mixed[2])/Number(mixed[3]);if(fraction&&Number(fraction[2]))return Number(fraction[1])/Number(fraction[2]);return v!==''&&Number.isFinite(Number(v))?Number(v):NaN;}
  function positionText(value){return L.inches(value).replace(/ po$/,'');}
  function coverageInches(value){return Number.isFinite(value)?`${Number(value.toFixed(4)).toLocaleString('fr-CA',{maximumFractionDigits:4})} po`:'à confirmer';}
  function renderCoverageSummary(){
    const box=$('#coverage-summary'),kind=state.selected.kind;
    box.hidden=!['zone','return','roof','soffit'].includes(kind);if(box.hidden)return;
    let f=face(),z=kind==='zone'?currentZone():null,c,m,title;
    if(kind==='zone'){if(!z){box.hidden=true;return;}c=choice(f,z);m=materialById.get(c.materialId);title=z.name;}
    else if(kind==='return'){
      const r=sceneGeometryBase().recess;if(!r||!(r.depth>0&&r.height>0)||!studioFeatures){box.hidden=true;return;}
      c=studioFeatures.returnChoice(state.selected.id);m=materialById.get(c.materialId);title=state.selected.id==='return-right'?'Retour droit du retrait':'Retour gauche du retrait';
      const w=r.depth/.3048*100,h=r.height/.3048*100;f={key:state.selected.id,renderFeetPerPixel:.01,textureBox:[0,0,w,h],textureBottom:0};z={id:state.selected.id,polygon:rect(0,0,w,h),selection:c};
    }else{m=materialById.get(state[kind+'Id']);c={materialId:m?.id};title=kind==='roof'?'Toiture':'Soffite';}
    const spec=C.coverageSpec(m||{},c),source=spec.sourceUrl;
    box.dataset.coverageStatus=spec.status;box.dataset.exposureIn=spec.exposureIn||'';box.dataset.formatId=spec.formatId||'';box.dataset.courseCount='';
    let headline='',detail='',note='',complete=false;
    if(kind==='roof'||kind==='soffit'){
      const step=kind==='soffit'?spec.pieceCoverageIn||spec.exposureIn:spec.exposureIn;
      complete=step>0;headline=complete?`${kind==='soffit'?'Pièce couvrante':'Pureau'} de ${coverageInches(step)}`:'Couvrance à confirmer';
      detail=complete?(kind==='roof'?'L’espacement des rangs est mesuré sur la pente du toit.':'Les joints suivent la largeur couvrante; la dernière pièce est coupée au bord.'):'Aucune répétition de dimensions inventées n’est dessinée pour ce produit.';
      note='Les dimensions du volume doivent correspondre au plan.';
    }else if(!(feetPerPixel(f)>0)){
      headline='Échelle du plan à compléter';detail='Calibrez cette élévation à partir d’une cote pour dessiner et compter les matériaux à leur taille réelle.';
    }else if(spec.reason==='orientation_missing'||spec.reason==='orientation_not_allowed'){
      headline='Sens de pose à confirmer';detail=spec.exposureIn>0?`La couvrance documentée est de ${coverageInches(spec.exposureIn)}, mais le sens de pose doit être confirmé avant d’afficher un compte de rangs.`:'Un format documenté et son sens de pose sont nécessaires pour tracer les joints à leur taille réelle.';
    }else if(spec.type==='panel'){
      const layout=kind==='return'?C.panelGrid(bounds(z.polygon),feetPerPixel(f),m,c):panelLayoutFor(f,z);
      complete=spec.complete&&layout.complete!==false;
      if(complete){
        headline=`Panneau ${spec.format.label} · ${c.orientation==='horizontal'?'pose horizontale':'pose verticale'}`;
        const columns=(layout.vertical||[]).length+1,rows=(layout.horizontal||[]).length+1;
        detail=`${columns} colonne${columns>1?'s':''} × ${rows} rangée${rows>1?'s':''} sur l’enveloppe de la zone. Module couvrant : ${coverageInches(spec.displayWidthIn)} × ${coverageInches(spec.displayHeightIn)}.`;
        note=layout.mode==='manual'?'Joints personnalisés conservés. « Repartir au format réel » rétablit les panneaux entiers depuis le bas et la gauche.':'Panneaux entiers depuis le bas et la gauche; coupes au haut, à droite et suivant les contours.';
        note+=' Les ouvertures et les chutes sont traitées dans les métrés.';
      }else{headline='Format physique à confirmer';detail='Les joints automatiques attendent un format fournisseur documenté. Les joints que vous placez restent personnalisés.';}
    }else if(spec.type==='board'&&spec.complete){
      const layout=C.courseLayout(bounds(z.polygon),feetPerPixel(f),spec,materialAnchors(f));complete=layout.complete;
      if(complete){
        const vertical=spec.orientation==='vertical',unit=vertical?'lame':'rang';box.dataset.courseCount=layout.count;
        headline=`${coverageInches(spec.exposureIn)} couvrants · ${layout.count} ${unit}${layout.count>1?'s':''} visibles`;
        detail=`Sur la ${vertical?'largeur':'hauteur'} maximale d’environ ${L.inches(layout.extentIn)} : ${layout.fullCount} complet${layout.fullCount>1?'s':''}`;
        if(layout.partialCount)detail+=` + ${layout.partialCount} coupe${layout.partialCount>1?'s':''} d’environ ${layout.partialWidthsIn.map(L.inches).join(' et ')}`;
        detail+='.';
        if(spec.coursesPerPiece>1)detail+=` Profil double${spec.coursesPerPiece===2?'':` (${spec.coursesPerPiece} rangs)`} : une pièce couvre ${coverageInches(spec.pieceCoverageIn)}; ${layout.pieceCount} rangs de pièces sur cette enveloppe.`;
        note=`${spec.status==='user-specified'?'Couvrance saisie pour ce projet. ':spec.status==='derived'?'Couvrance calculée à partir des dimensions fabricant. ':''}Rangs alignés à l’échelle de l’élévation. Ce compte ne déduit pas les ouvertures et ne constitue pas une quantité de commande.`;
      }else{headline='Dimensions de la zone à vérifier';detail='Le nombre de rangs sera affiché lorsque l’échelle et le contour seront définis.';}
    }else{
      headline='Couvrance à confirmer';
      detail=spec.reason==='exposure_conflict'?'Les documents du fabricant donnent des valeurs différentes. Saisissez la couvrance de pose retenue pour ce projet.':spec.exposureRangeIn?`Ce produit permet plusieurs pureaux (${spec.exposureRangeIn.map(coverageInches).join(' à ')}). Choisissez la valeur de pose ci-dessous.`:spec.type==='board'?'La largeur couvrante documentée manque. Vous pouvez la préciser dans les réglages du matériau.':'Ce produit reste un aperçu de matière; aucun nombre de rangs exact n’est annoncé.';
    }
    box.classList.toggle('is-unresolved',!complete);
    box.innerHTML=`<span class="coverage-label">${esc(title)} · ${complete?'à l’échelle du plan':'dimensions de pose'}</span><strong>${esc(headline)}</strong><p>${esc(detail)}</p>${note?`<small>${esc(note)}</small>`:''}${source?`<a href="${esc(source)}" target="_blank" rel="noopener">Dimensions du fabricant ↗</a>`:''}`;
  }
  function renderCoverageControls(m,c){
    const spec=C.coverageSpec(m,c),available=C.formats(m),panel=spec.type==='panel';
    $('#material-format-field').hidden=!panel;
    $('#material-format').innerHTML=available.length?available.map(format=>`<option value="${esc(format.id)}">${esc(format.label)}</option>`).join(''):'<option value="">Format fournisseur à confirmer</option>';
    $('#material-format').value=spec.formatId||'';$('#material-format').disabled=!available.length;
    const base=C.coverageSpec(m,{...c,exposureIn:null}),editable=base.type==='board'&&!(base.exposureIn>0);
    $('#coverage-input-field').hidden=!editable;$('#coverage-input').value=Number.isFinite(c.exposureIn)?c.exposureIn:'';
    $('#coverage-input').min=base.reason!=='exposure_conflict'&&base.exposureRangeIn?.[0]||.125;$('#coverage-input').max=base.reason!=='exposure_conflict'&&base.exposureRangeIn?.[1]||96;
  }
  function renderPanelEditor(f,z,c,m){
    const isPanel=c.pattern==='panel';$('#panel-editor').hidden=!isPanel;
    const linkedPanels=!!V?.verticalRule(m,c)&&isPanel;
    const manualHorizontalButton=$('[data-add-joint="horizontal"]');
    if(manualHorizontalButton)manualHorizontalButton.hidden=linkedPanels;
    const alerts=[];
    if(isPanel){
      const layout=panelLayoutFor(f,z),result=panelResult(f,z),spec=panelSpec(m,c);
      $('#joint-list').innerHTML=['vertical','horizontal'].filter(orientation=>!(linkedPanels&&orientation==='horizontal')).flatMap(orientation=>layout[orientation].map((joint,i)=>{const selected=selectedJoint?.zoneId===z.id&&selectedJoint.id===joint.id&&selectedJoint.orientation===orientation;return `<div class="joint-row ${selected?'is-selected':''}"><label for="joint-${esc(orientation+joint.id)}">${orientation==='vertical'?'Vertical':'Horizontal'} ${i+1}<small>Depuis ${orientation==='vertical'?'le bord gauche':'le haut'} · po</small></label><input id="joint-${esc(orientation+joint.id)}" data-joint-position="${esc(joint.id)}" data-orientation="${orientation}" inputmode="decimal" value="${positionText(layoutDimension(f,z,orientation)*joint.position)}" aria-label="Position du joint ${orientation} ${i+1} en pouces"><button data-delete-joint="${esc(joint.id)}" data-orientation="${orientation}" aria-label="Retirer ce joint">×</button></div>`;})).join('')||`<p class="small-note">${linkedPanels?'Les joints horizontaux sont les moulures de transition; modifiez-les dans « Joints & transitions ».':spec.known?'Aucun joint intérieur dans cette zone.':'Format à confirmer. Vous pouvez placer des joints personnalisés.'}</p>`;
      const invalid=(result.cells||[]).filter(c=>c.fits===false&&c.areaFt2>0),cells=(result.cells||[]).filter(c=>c.areaFt2>0);
      if(spec.known)alerts.push(`<div class="layout-alert ${invalid.length?'':'good'}"><strong>${invalid.length?`${invalid.length} pièce${invalid.length>1?'s':''} dépasse${invalid.length>1?'nt':''} le format`:`${cells.length} section${cells.length>1?'s':''} de panneau dessinée${cells.length>1?'s':''}`}</strong><p>Format choisi : ${coverageInches(spec.maxWidthIn)} × ${coverageInches(spec.maxLengthIn)}. Rotation ${spec.rotationAllowed?'autorisée':'désactivée'} pour le contrôle de découpe.</p>${invalid.slice(0,3).map(c=>`<p>${esc(L.inches(c.widthIn))} × ${esc(L.inches(c.heightIn))} : ajoutez ou déplacez un joint.</p>`).join('')}</div>`);
      else alerts.push('<div class="layout-alert">Format physique fournisseur à confirmer. Aucun contrôle de découpe dans un panneau supposé n’est validé.</div>');
    }
    const maximum=m.maxPiece?.lengthIn,isBoard=!isPanel&&Number.isFinite(maximum)&&['lap','vertical'].includes(c.pattern);
    $('#suggest-board-joints').hidden=!isBoard;
    if(isBoard){const orientation=c.orientation==='vertical'?'horizontal':'vertical',total=layoutDimension(f,z,orientation),cuts=[0,...state.transitions.filter(t=>t.face===f.key&&t.zoneId===z.id&&t.orientation===orientation).map(t=>t.position).sort((a,b)=>a-b),1],longest=Math.max(...cuts.slice(1).map((n,i)=>(n-cuts[i])*total));
      if(longest>maximum+.01)alerts.push(`<div class="layout-alert"><strong>Joint de longueur à prévoir</strong><p>Enveloppe du segment : ${L.inches(longest)}. Longueur du produit : ${L.inches(maximum)}. Les ouvertures peuvent interrompre certaines lames ; vérifiez les segments utiles dans les métrés.</p></div>`);
    }
    $('#layout-alerts').innerHTML=alerts.join('');
  }

  function manualizeSuggestedTransitions(){
    const z=currentZone();if(!z)return;
    const c=choice(face(),z),m=materialById.get(c.materialId),rule=V?.verticalRule(m,c);
    if(!rule)return toast('Aucune règle de longueur verticale pour ce matériau.');
    const id=key(state.face,z.id);
    if(state.manualTransitionModes[id])return toast('Ces transitions sont déjà modifiables.');
    const proposal=V.breaks({polygon:z.polygon,feetPerPixel:feetPerPixel(face()),material:m,choice:c,
      openings:allOpenings(face()),manualTransitions:state.transitions.filter(t=>t.face===state.face&&t.zoneId===z.id)});
    if(!proposal.complete)return toast('L’échelle du plan doit être vérifiée avant le placement des joints.');
    modify(()=>{
      proposal.items.forEach(t=>state.transitions.push({id:newId('transition'),face:state.face,zoneId:z.id,
        orientation:'horizontal',position:t.position,profile:'panel-z',color:c.color,
        source:'mir-auto-converted',sourceRuleLengthIn:rule.maxRunIn,needsReview:true}));
      state.manualTransitionModes[id]=true;
    });
    toast('Joints devenus modifiables : glissez chaque ligne ou saisissez sa position. Vous pouvez en supprimer.');
  }
  function restoreAutomaticTransitions(){
    const z=currentZone();if(!z)return;
    const id=key(state.face,z.id);
    modify(()=>{
      state.transitions=state.transitions.filter(t=>!(t.face===state.face&&t.zoneId===z.id&&t.source==='mir-auto-converted'));
      delete state.manualTransitionModes[id];
    });
    toast('Proposition automatique recalculée. Les transitions ajoutées manuellement sont conservées.');
  }
  const profileNames={'panel-z':'Z · raccord horizontal','panel-l-7/8':'L 7/8 · raccord vertical','brick-j':'J · transition','brick-l':'L · transition'};
  function renderTransitions(f,z){
    const mode=!!state.manualTransitionModes[key(f.key,z.id)],c=choice(f,z),m=materialById.get(c.materialId),rule=V?.verticalRule(m,c);
    $('#edit-auto-transitions').hidden=!rule||mode;$('#restore-auto-transitions').hidden=!rule||!mode;
    $('#auto-transition-note').hidden=!rule;
    if(rule)$('#auto-transition-note').textContent=mode?'Joints ajustables : cliquez sur la ligne, glissez-la ou modifiez sa cote. La limite de '+rule.maxRunIn/12+' pi reste à vérifier.':'Joints proposés automatiquement (maximum '+rule.maxRunIn/12+' pi). Activez leur édition pour les déplacer ou supprimer.';
    $('#transition-list').innerHTML=state.transitions.filter(t=>t.face===f.key&&t.zoneId===z.id).map(t=>`<div class="joint-row"><label for="transition-${esc(t.id)}">${t.orientation==='vertical'?'Verticale':'Horizontale'}<small>Position depuis ${t.orientation==='vertical'?'la gauche':'le haut'} · po</small></label><input id="transition-${esc(t.id)}" data-transition-position="${esc(t.id)}" inputmode="decimal" value="${positionText(layoutDimension(f,z,t.orientation)*t.position)}"><button data-delete-transition="${esc(t.id)}" aria-label="Retirer cette transition">×</button><select data-transition-profile="${esc(t.id)}" aria-label="Profil de la transition">${Object.entries(profileNames).map(([id,name])=>`<option value="${id}" ${t.profile===id?'selected':''}>${name}</option>`).join('')}</select></div>`).join('');}
  function renderControl(){
    const f=face(),opening=state.selected.kind==='opening',item=opening?currentOpening():currentZone();if(!['zone','opening'].includes(state.selected.kind))return;if(!item){$('#selected-title').textContent='Choisissez une zone';$('#zone-origin').textContent='Tracez une zone sur le plan pour lui attribuer un revêtement.';$('#material-controls').hidden=true;$('#opening-controls').hidden=true;$('#geometry-controls').hidden=true;return;}
    $('#selected-title').textContent=opening?(item.type==='door'?'Porte':'Fenêtre'):item.name;
    $('#zone-origin').textContent=opening?(item.occluded?'Partiellement cachée sur le PDF · à valider':'Ouverture protégée du revêtement'):(item.viewOnly==='2d'?'Contour latéral étudié en 2D. Les retours sont réglés dans les métrés.':item.parent?'Accent indépendant, limité à la zone parente.':data.projectKind==='imported-pdf'?'Contour proposé sur votre plan · matériau initial à personnaliser.':'Tracé d’étude revu sur le PDF · contours masqués à valider.');
    $('#material-controls').hidden=opening;$('#opening-controls').hidden=!opening;
    const accentSelected=!opening&&item.custom===true;
    $('#mir-accent-actions').hidden=!accentSelected;
    if(accentSelected){$('#geometry-controls').open=true;$('#geometry-note').textContent='Déplacez ou redimensionnez l’accent avec Gauche, Haut, Largeur et Hauteur (% de l’élévation) ou glissez-le directement.';}
    if(!opening){
      const c=choice(f,item),m=materialById.get(c.materialId);productOptions('#material-manufacturer','#material',facadeMaterials,c.materialId);
      renderCoverageControls(m,c);
      $('#material-brand').textContent=m.brand;$('#material-name').textContent=m.name;$('#material-sample').style.background=patternBackground(renderPattern(c),c.color);
      const cs=colorsFor(m),chosen=cs.find(v=>v.id===c.colorId);$('#color-name').textContent=c.colorName||'Choisissez un fini';if(chosen?.swatchUrl&&!/lisse|smooth/i.test(`${m.finish||''} ${m.name||''}`))$('#material-sample').style.backgroundImage=`url("${chosen.swatchUrl.replace(/"/g,'%22')}")`;
      $('#zone-colors').innerHTML=cs.map(color=>`<button class="product-swatch" data-color-id="${esc(color.id)}" aria-pressed="${color.id===c.colorId}" title="${esc(color.name)}"><i class="${validHex(color.hex||'')?'':'no-swatch'}" ${validHex(color.hex||'')?`style="background:${color.hex}"`:''}>${color.swatchUrl?`<img src="${esc(color.swatchUrl)}" alt="" loading="lazy" width="20" height="20">`:''}</i><span>${esc(color.name)}</span></button>`).join('');
      $('#color-note').textContent=cs.length&&!chosen?'Aucun fini fabricant n’est attribué à cette zone. Choisissez un échantillon ci-dessus ; une ancienne teinte d’étude ne constitue pas une référence produit.':!cs.length?'Nuancier exact à associer. Aperçu neutre, sans couleur commerciale inventée.':chosen?.assetKind==='manufacturer_material_sphere'?'Échantillon fabricant présenté en volume dans le nuancier. Le dessin utilise un motif de profil et une teinte approximative ; la sphère n’est pas répétée comme une texture plane.':swatchImages.has(chosen?.swatchUrl)&&m.family==='Fibrociment'?(/lisse|smooth/i.test(`${m.finish||''} ${m.name||''}`)?'Fini lisse : couleur issue du nuancier, sans grain ajouté. L’échantillon physique reste la référence.':`Grain issu de l’échantillon officiel. Relief, grain et éclairage illustratifs; validez le fini sur un échantillon physique.`):swatchImages.has(chosen?.swatchUrl)?'Teinte issue de l’échantillon officiel. Les espacements suivent la couvrance documentée; l’aspect de surface reste illustratif.':!validHex(chosen?.hex||'')?'Fini nommé dans les ressources du fabricant. Image locale indisponible : aperçu neutre sur le dessin ; consultez le nuancier et l’échantillon.':'Couleur numérique documentée. L’écran ne remplace pas l’échantillon physique.';
      $('#zone-colors').previousElementSibling.querySelector('label').textContent=hasPreviewPalette(m)?'Teintes d’aperçu':'Fini du fabricant';
      if(hasPreviewPalette(m)){
        $('#color-note').textContent='Teintes et motifs d’aperçu. Choisissez une référence fournisseur pour la commande.';
        const id='mir-masonry-sample',def=window.MIRMaterialSurface.patternDef({id,material:m,choice:c,bounds:[0,0,150,72]});
        const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 72"><defs>'+def+'</defs><rect width="150" height="72" fill="url(#'+id+')"/></svg>';
        $('#material-sample').style.backgroundImage='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
      }
      if(m.colorStatus==='collection_only')$('#color-note').textContent+=' Association à ce profil et disponibilité à confirmer.';
      const link=chosen?.sourceUrl||m.colorSourceUrl||m.sourceUrl;$('#color-source').hidden=!link;if(link)$('#color-source').href=link;
      const patterns=patternsFor(m),orientations=orientationsFor(m);$('#pattern').innerHTML=patterns.length?patterns.map(v=>`<option value="${esc(v)}">${esc(patternNames[v]||v)}</option>`).join(''):'<option value="plain">Aspect non spécifié</option>';$('#pattern').value=c.pattern;$('#pattern').disabled=patterns.length<=1;
      $('#orientation').innerHTML=orientations.length?orientations.map(v=>`<option value="${esc(v)}">${esc(orientationNames[v]||v)}</option>`).join(''):'<option value="">Pose à confirmer</option>';$('#orientation').value=c.orientation||'';$('#orientation').disabled=orientations.length<=1;
      $('#pattern-note').textContent=orientations.length?'Seuls les sens de pose documentés sont proposés. Pour les panneaux, changer de format ou de sens rétablit la trame à la taille réelle.':'Aucun sens de pose validé dans cette fiche. Consultez les instructions du fabricant avant spécification.';
      const rule=V?.verticalRule(m,c),ruleSummary=$('#vertical-rule-summary'),battenField=$('#batten-spacing-field');
      const battenOptions=rule?.battenSpacingOptionsIn||[];
      battenField.hidden=!battenOptions.length;
      $('#batten-spacing').value=String(c.battenSpacingIn||battenOptions[0]||12);
      $('#batten-color').value=validHex(c.battenColor)?c.battenColor:(validHex(c.color)?c.color:'#d3d6cd');
      if(rule){
        const auto=V.breaks({polygon:item.polygon,feetPerPixel:feetPerPixel(f),material:m,choice:c,openings:allOpenings(f),
          manualTransitions:state.transitions.filter(t=>t.face===f.key&&t.zoneId===item.id)});
        const aligned=auto.items.filter(t=>t.source==='top-of-window').length;
        ruleSummary.hidden=false;
        ruleSummary.textContent=auto.complete?
          'Maximum '+(rule.maxRunIn/12)+' pi entre transitions · '+auto.items.length+' transition(s) automatique(s), dont '+aligned+' au-dessus des châssis.'+
          (battenOptions.length?' Battens '+(c.battenSpacingIn||battenOptions[0])+' po c/c.':''):
          'Maximum '+(rule.maxRunIn/12)+' pi : échelle du plan nécessaire pour dessiner les joints.';
      } else {ruleSummary.hidden=true;battenField.hidden=true;}
      renderPanelEditor(f,item,c,m);renderTransitions(f,item);
      const band=bandConfig(f,item);$('#band-enabled').checked=band.enabled;$('#band-fields').hidden=!band.enabled;$('#band-height').value=band.heightIn;const bm=productOptions('#band-brand','#band-product',bandMaterials(),band.materialId);colorOptions('#band-color',bm,band.colorId);$('#band-docs').disabled=!bm;
    }else{
      const appearance=openingAppearance(f,item);
      $('#opening-frame-color').value=appearance.frameColor;
      $('#opening-batten-color').value=appearance.battenColor;
      $('#opening-batten-enabled').checked=appearance.showBatten;
      $('#opening-batten-enabled').closest('label').hidden=item.type!=='window';
      $('#opening-batten-color').hidden=item.type!=='window';
      document.querySelector('label[for="opening-batten-color"]').hidden=item.type!=='window';
      $('#opening-door-color').value=appearance.doorColor;
      $('#opening-door-design').value=appearance.design;
      $('#mir-door-style-controls').hidden=item.type!=='door';
      const t=trimConfig(f,item);$('#trim-mode').value=t.mode;$('#trim-fields').hidden=t.mode==='none';$('#trim-width').value=t.faceWidthIn;const tm=productOptions('#trim-brand','#trim-product',trimMaterials(t.mode),t.materialId);colorOptions('#trim-color',tm,t.colorId);$('#trim-docs').disabled=!tm;
      $('#trim-note').textContent=`${item.type==='door'?'Trois côtés, sans seuil.':'Quatre côtés.'} Largeur apparente extérieure à la baie. Les surfaces de contour remplacent le parement qu’elles recouvrent. ${t.mode!=='none'&&!tm?'Référence commerciale de contour à compléter.':''}`;
    }
    const editable=opening||item.polygon.length===4||item.custom===true;$('#geometry-controls').hidden=!editable;
    if(editable){const [x0,y0,x1,y1]=bounds(item.polygon),[bx,by,bw,bh]=f.bbox,vs={x:(x0-bx)/bw*100,y:(y0-by)/bh*100,w:(x1-x0)/bw*100,h:(y1-y0)/bh*100};for(const [k,v] of Object.entries(vs))$(`#geo-${k}`).value=Number(v.toFixed(1));$('#delete-region').textContent=item.custom?'Supprimer '+(opening?'cette ouverture':'cet accent'):'Rétablir le contour du plan';$('#geometry-note').textContent=item.custom?'Accent modifiable : choisissez sa position et ses dimensions en % de la façade, ou glissez-le dans le plan 2D.':'Proportions du tracé. Échelle et contours à valider dans le dossier de métrés.';}
  }
  function renderFinish(){for(const kind of ['soffit','fascia']){const rows=kind==='soffit'?soffits:fascias,m=productOptions('#'+kind+'-brand','#'+kind+'-product',rows,state[kind+'Id']);colorOptions('#'+kind+'-color',m,state[kind+'ColorId']);}const sm=materialById.get(state.soffitId);$('#soffit-type').textContent=sm?.soffitType==='vented'?'Ventilé / perforé · échantillon à valider':sm?.soffitType==='solid'?'Plein / non perforé · ventilation du système à vérifier':sm?.soffitType==='concealed'?'Ventilation cachée · ouvertures dans les rainures du profil':'Ventilation à confirmer · rendu neutre';}
  function render(){ensureSelected();$('#align-window').checked=state.alignWindow!==false;renderDrawing();renderZones();renderControl();renderFinish();studioFeatures?.renderUI();$('#undo').disabled=!history.length;$('#display-client').setAttribute('aria-pressed',state.displayMode==='client');$('#display-atelier').setAttribute('aria-pressed',state.displayMode==='atelier');$('#display-note').textContent=state.displayMode==='atelier'?'Dimensions de découpe en pouces · échelle à valider.':'Une vue claire des matières et des finitions.';}
  function selectZone(id){state.selected={kind:'zone',id};let selected=currentZone();const zs=allZones(face()), seen=new Set();while(selected?.parent&&!seen.has(selected.id)){seen.add(selected.id);selected=zs.find(z=>z.id===selected.parent);}if(selected?.viewOnly==='2d'){state.view='2d';toast('Ce contour latéral reste éditable en 2D. Les retours du retrait sont réglés dans Super admin · Métrés.');}save();render();}
  function openLibrary(){renderLibrary();$('#library-dialog').showModal();}
  function renderLibrary(){
    const q=$('#library-search').value.toLocaleLowerCase('fr'),family=$('#library-family').value;
    const list=materials.filter(m=>(!adminContext||!m.applications.includes('roofing'))&&(family==='all'||m.applications.includes(family))&&`${m.brand} ${m.name} ${m.family}`.toLocaleLowerCase('fr').includes(q));
    $('#library-grid').innerHTML=list.length?list.map(m=>`<article class="library-card"><p class="eyebrow">${esc(m.brand)}</p><h3>${esc(m.name)}</h3><p>${esc(m.family)} · ${m.documents.length} ressource${m.documents.length>1?'s':''}</p><button data-doc="${m.id}">Voir la fiche & les documents ↗</button></article>`).join(''):'<p>Aucune fiche ne correspond à cette recherche.</p>';
  }
  const kinds={technical:'Données techniques',installation:'Installation',warranty:'Garantie',maintenance:'Entretien',safety:'Sécurité',colors:'Couleurs'};
  const dimensionLabels={diameterNumber:'Diamètre (#)',drive:'Empreinte',lengthFt:'Longueur (pi)',lengthIn:'Longueur (po)',lengthMm:'Longueur (mm)',lengthM:'Longueur (m)',widthIn:'Largeur (po)',widthMm:'Largeur (mm)',thicknessIn:'Épaisseur (po)',thicknessMm:'Épaisseur (mm)',heightIn:'Hauteur (po)',lengthOptionsFt:'Longueurs (pi)',nominalWidthIn:'Largeur nominale (po)',actualWidthIn:'Largeur réelle (po)',profileWidthMm:'Largeur du profil (mm)',usefulWidthMm:'Largeur utile (mm)'};
  function openMaterial(id){
    const m=materialById.get(id);if(!m)return;
    $('#doc-brand').textContent=m.brand;
    const dimensions=Object.entries(m.dimensions||{}).filter(([k,v])=>dimensionLabels[k]&&v!=null).map(([k,v])=>`<dt>${dimensionLabels[k]}</dt><dd>${esc(Array.isArray(v)?v.join(' / '):v)}</dd>`).join('');
    const docs=m.documents.map(d=>`<a class="document-link" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="document-badge">${esc(kinds[d.kind]||d.kind)} · ${d.scope==='resource-center'?'Centre de ressources':d.scope==='product'?'Produit':'Gamme / système'}</span><strong>${esc(d.title)} ↗</strong><span>${d.verified?'Source officielle consultée.':'Lien officiel repéré; ouverture du document à vérifier.'} ${esc(d.note||'')}</span></a>`).join('');
    const missing=['technical','installation'].filter(kind=>!m.documents.some(d=>d.kind===kind&&d.exactProductMatch!==false));
    const colors=m.colors||[];
    $('#material-detail').innerHTML=`<div class="doc-intro"><h2 id="doc-title">${esc(m.name)}</h2><p>${esc(m.description)}</p>${m.sourceUrl?`<a href="${esc(m.sourceUrl)}" target="_blank" rel="noopener">Consulter la page officielle ↗</a>`:''}</div><section class="doc-section"><h3>Format & application</h3><dl><dt>Famille</dt><dd>${esc(m.family)}</dd>${m.manufacturerCode?`<dt>Code fabricant</dt><dd>${esc(m.manufacturerCode)}</dd>`:''}${dimensions}<dt>Unité</dt><dd>${esc(m.unit||'À confirmer')}</dd>${m.exposureMm?`<dt>Exposition indiquée</dt><dd>${new Intl.NumberFormat('fr-CA',{maximumFractionDigits:2}).format(m.exposureMm)} mm</dd>`:''}${m.soffitType?`<dt>Ventilation</dt><dd>${m.soffitType==='vented'?'Ventilé':m.soffitType==='solid'?'Plein':m.soffitType==='concealed'?'Ventilation dissimulée':'À confirmer pour cette référence'}</dd>`:''}</dl><p>La disponibilité, le prix, l’unité de vente MIR et les conditions du chantier restent à confirmer.</p></section><section class="doc-section"><h3>Documentation du matériau</h3>${docs||'<p class="doc-missing">Maçonnerie d’aperçu. Choisissez une référence fournisseur pour spécifier ou acheter le produit.</p>'}${missing.length&&!hasPreviewPalette(m)?`<p class="doc-missing">À compléter : ${missing.map(k=>kinds[k].toLocaleLowerCase('fr')).join(', ')} pour cette référence exacte.</p>`:''}</section><section class="doc-section"><h3>Palette & finition</h3>${colors.length?`<div class="doc-colors">${colors.map(c=>`<span>${esc(typeof c==='string'?c:c.name)}${c.code?` · ${esc(c.code)}`:''}</span>`).join('')}</div><p>Finitions issues des ressources du fabricant. Association exacte au profil et disponibilité locale à confirmer; une image de nuancier ne constitue pas une valeur colorimétrique.</p>`:'<p>Le nuancier exact de cette référence reste à associer. Le dessin conserve un aperçu neutre tant qu’aucune couleur numérique documentée n’est associée.</p>'}<p>Les couleurs à l’écran ne remplacent pas un échantillon physique.</p></section>${m.notes?.length?`<section class="doc-section"><h3>Points à vérifier</h3><ul>${m.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></section>`:''}`;
    if(!$('#material-dialog').open)$('#material-dialog').showModal();
  }
  function makeAccent(poly){
    const parent=currentZone();
    const aligned=parent?L.alignAccentToWindow(poly,normalFace(face()),parent,{enabled:state.alignWindow!==false}):{polygon:poly,aligned:false};
    const id=`accent-${Date.now().toString(36)}`;
    modify(()=>{state.customZones[state.face].push({id,name:`Accent ${state.customZones[state.face].length+1}`,polygon:aligned.polygon,kind:'siding',...(parent?{parent:parent.id}:{}),custom:true,...(aligned.alignment?{alignment:aligned.alignment}:{})});state.selections[key(state.face,id)]=parent?normalChoice(choice(face(),parent)):normalChoice({},facadeMaterials[0]?.id);state.selected={kind:'zone',id};});
    toast(aligned.aligned?`Accent aligné sur les deux côtés de la fenêtre ${aligned.openingId}, puis limité à sa zone parente.`:aligned.reason==='ambiguous-windows'?'Accent ajouté sans alignement forcé : plusieurs fenêtres sont possibles. Ajustez ses proportions ou tracez plus près de la fenêtre souhaitée.':'Accent ajouté. Changez sa matière, sa teinte ou ses proportions.');
  }
  function addAccent(){
    if(state.selected.kind!=='zone'){toast('Choisissez d’abord une zone de revêtement.');return;}
    const source=currentZone(),b=source?bounds(source.polygon):[face().bbox[0],face().bbox[1],face().bbox[0]+face().bbox[2],face().bbox[1]+face().bbox[3]], w=(b[2]-b[0])*.5,h=(b[3]-b[1])*.18;
    makeAccent(rect(b[0]+(b[2]-b[0]-w)/2,b[1]+(b[3]-b[1])*.55,w,h));
  }
  function updateGeometry(){
    const [bx,by,bw,bh]=face().bbox, v={};
    for(const k of ['x','y','w','h'])v[k]=Number($(`#geo-${k}`).value);
    if(Object.values(v).some(n=>!Number.isFinite(n))){toast('Entrez quatre valeurs numériques.');return;}
    v.x=Math.max(0,Math.min(99.5,v.x));v.y=Math.max(0,Math.min(99.5,v.y));v.w=Math.max(.5,Math.min(100-v.x,v.w));v.h=Math.max(.5,Math.min(100-v.y,v.h));
    const target=[bx+v.x/100*bw,by+v.y/100*bh,v.w/100*bw,v.h/100*bh];
    const item=state.selected.kind==='opening'?currentOpening():currentZone(), b=bounds(item.polygon);
    const poly=item.polygon.map(([x,y])=>[target[0]+(x-b[0])/(b[2]-b[0])*target[2],target[1]+(y-b[1])/(b[3]-b[1])*target[3]]);
    modify(()=>{(state.selected.kind==='opening'?state.openingOverrides:state.zoneOverrides)[key(state.face,item.id)]=poly;});
  }
  function openOpenings(){
    $('#openings-list').innerHTML=allOpenings(face()).map((o,i)=>`<button class="opening-row" data-edit-opening="${o.id}">${o.type==='door'?'Porte':'Fenêtre'} ${i+1}${o.custom?' · ajoutée':''}<span>${esc(o.dimension||'Dimensions à confirmer')}${o.occluded?' · partiellement masquée sur le PDF':''}</span></button>`).join('');
    $('#openings-dialog').showModal();
  }
  function exportFile(name,type,body){const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function selectOpening(id){state.selected={kind:'opening',id};selectedJoint=null;save();render();}
  function newId(prefix){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
  function nextPosition(lines){const cuts=[0,...lines.map(l=>l.position).sort((a,b)=>a-b),1];let best=[0,1];for(let i=1;i<cuts.length;i++)if(i===1||cuts[i]-cuts[i-1]>best[1]-best[0])best=[cuts[i-1],cuts[i]];return (best[0]+best[1])/2;}
  function editLayout(fn){const z=currentZone();if(!z)return;modify(()=>{const layout=clone(panelLayoutFor(face(),z));fn(layout);state.panelLayouts[key(state.face,z.id)]={...layout,mode:'manual'};});}
  function setJointPosition(id,orientation,value){const z=currentZone(),dimension=z&&layoutDimension(face(),z,orientation),inches=parseInches(value);if(!(dimension>0&&inches>0&&inches<dimension)){toast('La position doit être comprise entre les deux bords de la zone.');renderControl();return;}editLayout(layout=>{const line=layout[orientation].find(x=>x.id===id);if(line)line.position=inches/dimension;});}
  function addTransition(orientation,position){const z=currentZone();if(!z)return;const c=choice(face(),z);modify(()=>state.transitions.push({id:newId('transition'),face:state.face,zoneId:z.id,orientation,position:position??nextPosition(state.transitions.filter(t=>t.face===state.face&&t.zoneId===z.id&&t.orientation===orientation)),profile:orientation==='vertical'?'panel-l-7/8':'panel-z',color:c.color}));}
  function touchFinish(kind,materialId,colorId){modify(()=>{if(materialId)state[kind+'Id']=materialId;const m=materialById.get(state[kind+'Id']),c=officialColor(m,{colorId});state[kind+'ColorId']=c.colorId;state[kind+'Color']=c.color;});}
  $('#zone-list').addEventListener('click',e=>{const b=e.target.closest('[data-select-zone]');if(b){selectedJoint=null;selectZone(b.dataset.selectZone);}});
  $('#elevation').addEventListener('click',e=>{if(drawMode||suppressClick){suppressClick=false;return;}const opening=e.target.closest('[data-opening]');if(opening)return selectOpening(opening.dataset.opening);const z=e.target.closest('[data-zone]');if(z){selectedJoint=null;selectZone(z.dataset.zone);}});
  $('#elevation').addEventListener('keydown',e=>{
    const joint=e.target.closest('[data-joint]'),transition=e.target.closest('[data-transition]');
    if((joint||transition)&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();const direction=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
      if(joint){const z=allZones(face()).find(z=>z.id===joint.dataset.jointZone),orientation=joint.dataset.orientation;state.selected={kind:'zone',id:z.id};const l=panelLayoutFor(face(),z)[orientation].find(l=>l.id===joint.dataset.joint);setJointPosition(l.id,orientation,l.position*layoutDimension(face(),z,orientation)+direction*(e.shiftKey?6:1));}
      else{const t=state.transitions.find(t=>t.id===transition.dataset.transition),z=allZones(face()).find(z=>z.id===t.zoneId),step=(e.shiftKey?6:1)/layoutDimension(face(),z,t.orientation);modify(()=>t.position=Math.max(.001,Math.min(.999,t.position+direction*step)));}return;
    }
    if(e.key==='Enter'||e.key===' '){const opening=e.target.closest('[data-opening]'),zone=e.target.closest('[data-zone]');if(opening){e.preventDefault();selectOpening(opening.dataset.opening);}else if(zone){e.preventDefault();selectZone(zone.dataset.zone);}}
  });
  $$('.face-tabs button').forEach(b=>b.addEventListener('click',()=>{state.face=b.dataset.face;state.selected={kind:'zone',id:allZones(face())[0]?.id||null};state.rotation={front:28,right:90,back:180,left:270}[state.face];drawMode=null;selectedJoint=null;$('#mode-help').hidden=true;save();render();}));
  $('#view-2d').onclick=()=>{state.view='2d';save();renderDrawing();};$('#view-3d').onclick=()=>{state.view='3d';drawMode=null;$('#mode-help').hidden=true;save();renderDrawing();};
  for(const mode of ['client','atelier'])$('#display-'+mode).onclick=()=>{state.displayMode=mode;save();render();};
  $('#rotation').addEventListener('input',e=>{state.rotation=Number(e.target.value);$('#rotation-value').textContent=`${state.rotation}°`;renderDrawing();});$('#rotation').addEventListener('change',save);
  $('#toggle-lines').onclick=()=>{neutral=!neutral;renderDrawing();};
  $('#material-manufacturer').onchange=e=>{const m=facadeMaterials.find(m=>m.brand===e.target.value);if(m)setChoice({materialId:m.id,colorId:null,colorName:null,pattern:null,orientation:null});};
  $('#material').onchange=e=>setChoice({materialId:e.target.value,colorId:null,colorName:null,pattern:null,orientation:null});
  $('#material-format').onchange=e=>setChoice({formatId:e.target.value});
  $('#coverage-input').onchange=e=>{const value=e.target.value.trim(),n=value===''?null:Number(value),m=materialById.get(choice(face(),currentZone()).materialId),c=choice(face(),currentZone());if(value!==''&&(!(n>=.125&&n<=96)||!C.coverageSpec(m,{...c,exposureIn:n}).exposureIn)){toast('Saisissez une couvrance de pose valide en pouces.');renderControl();return;}setChoice({exposureIn:n});};
  $('#pattern').onchange=e=>{const m=materialById.get(choice(face(),currentZone()).materialId),pattern=e.target.value,orientation=pattern==='vertical'?'vertical':'horizontal';setChoice({pattern,...(['lap','vertical'].includes(pattern)&&orientationsFor(m).includes(orientation)?{orientation}:{})});};$('#orientation').onchange=e=>setChoice({orientation:e.target.value});
  $('#batten-spacing').onchange=e=>{const c=choice(face(),currentZone()),m=materialById.get(c.materialId),n=Number(e.target.value);if((m.verticalLayout?.battenSpacingOptionsIn||[]).includes(n))setChoice({battenSpacingIn:n});};
  $('#batten-color').onchange=e=>{if(validHex(e.target.value))setChoice({battenColor:e.target.value});};
  $('#zone-colors').onclick=e=>{const b=e.target.closest('[data-color-id]');if(b)setChoice({colorId:b.dataset.colorId});};
  for(const kind of ['soffit','fascia']){
    $('#'+kind+'-brand').onchange=e=>{const rows=kind==='soffit'?soffits:fascias,m=rows.find(m=>m.brand===e.target.value);if(m)touchFinish(kind,m.id);};
    $('#'+kind+'-product').onchange=e=>touchFinish(kind,e.target.value);$('#'+kind+'-color').onchange=e=>touchFinish(kind,null,e.target.value);$('#'+kind+'-docs').onclick=()=>openMaterial(state[kind+'Id']);
  }
  $('#band-enabled').onchange=e=>setBand({enabled:e.target.checked});$('#band-height').onchange=e=>{const n=Number(e.target.value);if(n>0)setBand({heightIn:n});else renderControl();};
  $('#band-brand').onchange=e=>{const m=bandMaterials().find(m=>m.brand===e.target.value);if(m)setBand({materialId:m.id,colorId:null});};$('#band-product').onchange=e=>setBand({materialId:e.target.value,colorId:null});$('#band-color').onchange=e=>setBand({colorId:e.target.value});$('#band-docs').onclick=()=>openMaterial(bandConfig(face(),currentZone()).materialId);
  $('#opening-frame-color').onchange=e=>{if(validHex(e.target.value))setOpeningAppearance({frameColor:e.target.value});};
  $('#opening-batten-enabled').onchange=e=>setOpeningAppearance({showBatten:e.target.checked});
  $('#opening-batten-color').onchange=e=>{if(validHex(e.target.value))setOpeningAppearance({showBatten:true,battenColor:e.target.value});};
  $('#opening-door-color').onchange=e=>{if(validHex(e.target.value))setOpeningAppearance({doorColor:e.target.value});};
  $('#opening-door-design').onchange=e=>setOpeningAppearance({design:e.target.value});
  $('#trim-mode').onchange=e=>{const m=trimMaterials(e.target.value)[0];setTrim({mode:e.target.value,materialId:m?.id||null,colorId:null});};$('#trim-width').onchange=e=>{const n=Number(e.target.value);if(n>0)setTrim({faceWidthIn:n});else renderControl();};
  $('#trim-brand').onchange=e=>{const m=trimMaterials(trimConfig(face(),currentOpening()).mode).find(m=>m.brand===e.target.value);if(m)setTrim({materialId:m.id,colorId:null});};$('#trim-product').onchange=e=>setTrim({materialId:e.target.value,colorId:null});$('#trim-color').onchange=e=>setTrim({colorId:e.target.value});$('#trim-docs').onclick=()=>openMaterial(trimConfig(face(),currentOpening()).materialId);
  $$('[data-add-joint]').forEach(b=>b.onclick=()=>{const orientation=b.dataset.addJoint;editLayout(layout=>{layout[orientation].push({id:newId('joint'),position:nextPosition(layout[orientation])});});});
  $('#reset-layout').onclick=()=>modify(()=>{delete state.panelLayouts[key(state.face,currentZone().id)];selectedJoint=null;});
  $('#joint-list').onchange=e=>{const input=e.target.closest('[data-joint-position]');if(input)setJointPosition(input.dataset.jointPosition,input.dataset.orientation,input.value);};
  $('#joint-list').onclick=e=>{const b=e.target.closest('[data-delete-joint]');if(b)editLayout(layout=>layout[b.dataset.orientation]=layout[b.dataset.orientation].filter(l=>l.id!==b.dataset.deleteJoint));};
  $$('[data-add-transition]').forEach(b=>b.onclick=()=>addTransition(b.dataset.addTransition));
  $('#edit-auto-transitions').onclick=manualizeSuggestedTransitions;
  $('#restore-auto-transitions').onclick=restoreAutomaticTransitions;
  $('#transition-list').onchange=e=>{const p=e.target.closest('[data-transition-position]'),profile=e.target.closest('[data-transition-profile]');if(p){const t=state.transitions.find(t=>t.id===p.dataset.transitionPosition),z=currentZone(),dim=layoutDimension(face(),z,t.orientation),inch=parseInches(p.value);if(!(inch>0&&inch<dim)){toast('Saisissez une position intérieure à la zone.');renderControl();return;}modify(()=>t.position=inch/dim);}else if(profile)modify(()=>{const t=state.transitions.find(t=>t.id===profile.dataset.transitionProfile);t.profile=profile.value;});};
  $('#transition-list').onclick=e=>{const b=e.target.closest('[data-delete-transition]');if(b)modify(()=>state.transitions=state.transitions.filter(t=>t.id!==b.dataset.deleteTransition));};
  $('#suggest-board-joints').onclick=()=>{const f=face(),z=currentZone(),c=choice(f,z),m=materialById.get(c.materialId),orientation=c.orientation==='vertical'?'horizontal':'vertical',dimension=layoutDimension(f,z,orientation),positions=L.splitPositions(dimension,m.maxPiece?.lengthIn);modify(()=>{state.transitions=state.transitions.filter(t=>!(t.face===f.key&&t.zoneId===z.id&&t.orientation===orientation));for(const p of positions)state.transitions.push({id:newId('joint-longueur'),face:f.key,zoneId:z.id,orientation,position:p.position,profile:orientation==='vertical'?'panel-l-7/8':'panel-z',color:c.color});});toast('Joints proposés selon la longueur maximale. Le profil et le détail de pose restent à valider.');};
  $('#open-material').onclick=()=>openMaterial(choice(face(),currentZone()).materialId);$('#open-library').onclick=openLibrary;$('#open-library-bottom').onclick=openLibrary;$('#library-search').oninput=renderLibrary;$('#library-family').onchange=renderLibrary;$('#library-grid').onclick=e=>{const b=e.target.closest('[data-doc]');if(b)openMaterial(b.dataset.doc);};$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  $('#align-window').onchange=e=>{state.alignWindow=e.target.checked;save();};
  $('#mir-edit-accent').onclick=()=>{const g=$('#geometry-controls');g.open=true;g.scrollIntoView({behavior:'smooth',block:'nearest'});$('#geo-x').focus({preventScroll:true});};
  $('#mir-remove-accent').onclick=()=>{if(currentZone()?.custom&&state.selected.kind==='zone')$('#delete-region').click();};
  $('#add-accent').onclick=addAccent;$('#draw-accent').onclick=()=>{if(state.selected.kind!=='zone')state.selected={kind:'zone',id:allZones(face())[0]?.id||null};state.view='2d';render();drawMode=drawMode?null:'accent';$('#mode-help').hidden=!drawMode;$('#mode-help').textContent='Tracez la nouvelle zone. L’option d’alignement cale ses deux côtés sur la fenêtre située dessous lorsqu’elle est identifiable. Les autres bords proches restent aimantés. Échap annule ; les dimensions restent modifiables.';};
  function zoneContains(point,z,zones){
    if(!pointInside(point,z.polygon))return false;const seen=new Set([z.id]);let parent=z.parent;
    while(parent){if(seen.has(parent))return false;seen.add(parent);const ancestor=zones.find(x=>x.id===parent);if(!ancestor||!pointInside(point,ancestor.polygon))return false;parent=ancestor.parent;}
    return true;
  }
  function pickThree(clientX,clientY){
    const hit=window.MIR3D.pick?.($('#three-canvas'),clientX,clientY);if(!hit)return false;
    if(studioFeatures?.handleHit(hit))return true;
    if(hit.type==='fascia'||hit.type==='soffit'){const kind=hit.type==='fascia'?'fascia':'soffit';$('.finish-section').open=true;$('#'+kind+'-product').focus();toast(kind==='fascia'?'Fascia sélectionné : choisissez le fabricant et le fini.':'Soffite sélectionné : choisissez le profil et le fini.');return true;}
    if(hit.type!=='wall'){toast('Toiture du volume d’étude. Cliquez sur un mur, une fenêtre, un soffite ou un fascia pour les modifier.');return false;}
    const f=data.faces.find(f=>f.key===hit.view);if(!f)return false;
    let target,decoration;
    if(hit.sharedFinish&&hit.zoneId)target={kind:'zone',id:hit.zoneId};
    else if(hit.sourcePoint){
      const foundation=facadeVisuals.get(f.key)?.foundation?.box;
      if(foundation){
        const [x,y,w,h]=foundation,[px,py]=hit.sourcePoint;
        if(px>=x&&px<=x+w&&py>=y&&py<=y+h){toast('Solage repéré sur le PDF.');return true;}
      }
      const prepared=decoratedFace(f,facadeVisuals.has(f.key));
      const opening=prepared.openings.slice().reverse().find(o=>pointInside(hit.sourcePoint,o.polygon));
      if(opening)target={kind:'opening',id:opening.id};
      else{const zones=orderedZones(prepared.zones),z=zones.slice().reverse().find(z=>zoneContains(hit.sourcePoint,z,zones));if(z){decoration=z.decorationType;target=z.decorationType==='opening-trim'?{kind:'opening',id:z.sourceOpeningId}:{kind:'zone',id:z.sourceZoneId||z.id};}}
    }
    if(!target){toast('Cette partie du volume n’a pas de zone de revêtement attribuée. Utilisez la liste des zones pour poursuivre.');return false;}
    state.face=f.key;state.selected=target;selectedJoint=null;save();render();
    if(decoration==='band')$('#band-editor').open=true;
    $('#stage-note').textContent=hit.sharedFinish?'Retour du retrait · fini partagé avec le centre RDC':`${f.name} · ${target.kind==='opening'?'ouverture sélectionnée':currentZone()?.name||'zone sélectionnée'}`;
    return true;
  }
  let orbitDrag=null,orbitFrame=null,pinch=null,pinching=false,saveWheel=null;
  const threeCanvas=$('#three-canvas'),touch=new Map();
  const zoomLimit=v=>Math.max(.7,Math.min(3.5,Number(v)||1));
  const groundAngle=v=>Math.max(5,Math.min(75,Number(v)||22));
  function repaint3D(){if(!orbitFrame)orbitFrame=requestAnimationFrame(()=>{orbitFrame=null;renderDrawing();});}
  function zoom3D(v,store=true){state.cameraZoom=zoomLimit(v);repaint3D();if(store)save();}
  threeCanvas.addEventListener('pointerdown',e=>{
    if(state.view!=='3d'||e.button>0)return;e.preventDefault();
    if(e.pointerType==='touch'){
      touch.set(e.pointerId,[e.clientX,e.clientY]);
      if(touch.size>=2){
        const [a,b]=[...touch.values()];
        pinch={distance:Math.max(5,Math.hypot(a[0]-b[0],a[1]-b[1])),zoom:state.cameraZoom||1};
        orbitDrag=null;pinching=true;
      }else orbitDrag={id:e.pointerId,x:e.clientX,y:e.clientY,angle:state.rotation,elevation:state.cameraElevation??22,moved:false};
    }else orbitDrag={id:e.pointerId,x:e.clientX,y:e.clientY,angle:state.rotation,elevation:state.cameraElevation??22,moved:false};
    try{threeCanvas.setPointerCapture(e.pointerId);}catch(_){}
  });
  threeCanvas.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'&&touch.has(e.pointerId)){
      touch.set(e.pointerId,[e.clientX,e.clientY]);
      if(touch.size>=2&&pinch){
        const [a,b]=[...touch.values()];
        state.cameraZoom=zoomLimit(pinch.zoom*Math.hypot(a[0]-b[0],a[1]-b[1])/pinch.distance);
        repaint3D();return;
      }
    }
    if(!orbitDrag||orbitDrag.id!==e.pointerId||pinching)return;
    const dx=e.clientX-orbitDrag.x,dy=e.clientY-orbitDrag.y;
    if(Math.hypot(dx,dy)>6)orbitDrag.moved=true;
    if(!orbitDrag.moved)return;
    state.rotation=Math.round((orbitDrag.angle+dx/Math.max(200,threeCanvas.clientWidth)*180+720)%360);
    state.cameraElevation=groundAngle(orbitDrag.elevation-dy/Math.max(200,threeCanvas.clientHeight)*90);
    repaint3D();
  });
  threeCanvas.addEventListener('pointerup',e=>{
    const didPinch=pinching||!!pinch,moved=orbitDrag?.id===e.pointerId&&orbitDrag.moved;
    touch.delete(e.pointerId);if(touch.size<2)pinch=null;if(touch.size===0)pinching=false;
    if(orbitDrag?.id===e.pointerId)orbitDrag=null;
    try{threeCanvas.releasePointerCapture(e.pointerId);}catch(_){}
    if(didPinch||moved){save();return;}
    if(e.pointerType==='touch'&&touch.size)return;
    if(state.view==='3d')pickThree(e.clientX,e.clientY);
  });
  threeCanvas.addEventListener('pointercancel',e=>{touch.delete(e.pointerId);pinch=null;orbitDrag=null;pinching=false;save();});
  threeCanvas.addEventListener('wheel',e=>{
    if(state.view!=='3d')return;e.preventDefault();
    zoom3D((state.cameraZoom||1)*Math.exp(-e.deltaY*.0012),false);
    clearTimeout(saveWheel);saveWheel=setTimeout(save,150);
  },{passive:false});
  threeCanvas.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();
      if(e.key==='ArrowLeft'||e.key==='ArrowRight')state.rotation=(state.rotation+(e.key==='ArrowRight'?10:-10)+360)%360;
      else state.cameraElevation=groundAngle((state.cameraElevation??22)+(e.key==='ArrowUp'?5:-5));
      save();renderDrawing();
    }
  });
  $('#mir-zoom-in').onclick=()=>zoom3D((state.cameraZoom||1)*1.25);
  $('#mir-zoom-out').onclick=()=>zoom3D((state.cameraZoom||1)/1.25);
  $('#mir-site-toggle').onclick=()=>{state.siteStyle=state.siteStyle==='commercial'?'none':'commercial';save();renderDrawing();};
  $('#mir-stairs-toggle').onclick=()=>{
    studioFeatures?.ensureState();
    const previous=state.concreteSteps||{count:4,width:1.8,tread:.30,riser:.16};
    const proposed=state.porch?.enabled&&Number.isFinite(state.porch.floorHeight)?
      Math.max(3,Math.min(12,Math.ceil(state.porch.floorHeight/.18))):previous.count;
    state.concreteSteps={...previous,enabled:!previous.enabled,
      count:previous.sourceCandidateId||previous.manuallyEdited?previous.count:proposed,
      sourceStatus:previous.sourceCandidateId?'pdf-pixel-proposed-unverified':'porch-geometry-proposed-unverified',
      riserHeightVerified:false,positionVerified:false,needsReview:true};
    save();renderDrawing();toast('Marches du balcon : proposition à valider sur le plan, sans métré certifié.');
  };
  const stage3D=$('#stage');
  function syncFull(){
    const on=document.fullscreenElement===stage3D||stage3D.classList.contains('mir-stage-fullscreen');
    $('#mir-fullscreen').setAttribute('aria-pressed',String(on));
    $('#mir-fullscreen').textContent=on?'Quitter le plein écran ×':'Plein écran ⛶';
    $('#mir-fullscreen').setAttribute('aria-label',on?'Quitter le plein écran':'Agrandir la vue 3D');
    repaint3D();
  }
  async function leaveFull(){
    if(document.fullscreenElement===stage3D&&document.exitFullscreen)await document.exitFullscreen().catch(()=>{});
    stage3D.classList.remove('mir-stage-fullscreen');
    document.documentElement.classList.remove('mir-stage-locked');document.body.classList.remove('mir-stage-locked');
    syncFull();
  }
  $('#mir-fullscreen').onclick=async()=>{
    if(document.fullscreenElement===stage3D||stage3D.classList.contains('mir-stage-fullscreen'))return leaveFull();
    try{if(!stage3D.requestFullscreen)throw Error('Full screen unsupported');await stage3D.requestFullscreen();}
    catch(_){stage3D.classList.add('mir-stage-fullscreen');document.documentElement.classList.add('mir-stage-locked');document.body.classList.add('mir-stage-locked');}
    syncFull();
  };
  document.addEventListener('fullscreenchange',syncFull);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stage3D.classList.contains('mir-stage-fullscreen'))leaveFull();});
  const point=e=>{const svg=$('svg',$('#elevation')),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
  const snappedPoint=e=>{const p=point(e),svg=$('svg',$('#elevation')),threshold=face().bbox[2]/Math.max(1,svg.getBoundingClientRect().width)*8;return L.snapPoint(p,normalFace(face()),threshold);};
  function dragLine(e){const p=point(e),z=allZones(face()).find(z=>z.id===drag.zoneId),b=bounds(z.polygon),orientation=drag.orientation,position=Math.max(.001,Math.min(.999,(orientation==='vertical'?p.x-b[0]:p.y-b[1])/(orientation==='vertical'?b[2]-b[0]:b[3]-b[1])));if(drag.type==='joint'){state.panelLayouts[key(state.face,z.id)][orientation].find(l=>l.id===drag.lineId).position=position;}else{state.transitions.find(t=>t.id===drag.lineId).position=position;}drag.changed=true;renderDrawing();}
  $('#elevation').addEventListener('pointerdown',e=>{
    if(state.view!=='2d'||e.button>0)return;
    const joint=e.target.closest('[data-joint]'),transition=e.target.closest('[data-transition]');
    const accent=e.target.closest('[data-zone]'),selected=accent&&allZones(face()).find(z=>z.id===accent.dataset.zone);
    if(!drawMode&&!joint&&!transition&&selected?.custom===true&&state.selected.kind==='zone'&&state.selected.id===selected.id){
      const p=snappedPoint(e);
      drag={type:'move-accent',zoneId:selected.id,id:e.pointerId,original:selected.polygon.map(p=>p.slice()),
        start:p,moved:false,changed:false};
      try{$('#elevation').setPointerCapture(e.pointerId);}catch(_){}
      e.preventDefault();return;
    }
    if(!drawMode&&(joint||transition)){
      e.preventDefault();checkpoint();const t=transition&&state.transitions.find(t=>t.id===transition.dataset.transition),zoneId=joint?.dataset.jointZone||t.zoneId,orientation=joint?.dataset.orientation||t.orientation,lineId=joint?.dataset.joint||t.id;
      state.selected={kind:'zone',id:zoneId};if(joint)state.panelLayouts[key(state.face,zoneId)]={...clone(panelLayoutFor(face(),currentZone())),mode:'manual'};selectedJoint=joint?{zoneId,orientation,id:lineId}:null;drag={type:joint?'joint':'transition',zoneId,orientation,lineId,id:e.pointerId,changed:false};$('#elevation').setPointerCapture(e.pointerId);renderControl();return;
    }
    if(!drawMode)return;e.preventDefault();const p=snappedPoint(e);drag={type:'accent',x:p.x,y:p.y,id:e.pointerId};$('#elevation').setPointerCapture(e.pointerId);
  });
  $('#elevation').addEventListener('pointermove',e=>{
    if(!drag)return;
    if(drag.type==='move-accent'){
      const pointNow=snappedPoint(e),dx=pointNow.x-drag.start.x,dy=pointNow.y-drag.start.y;
      if(Math.hypot(dx,dy)<2&&!drag.moved)return;
      drag.moved=true;drag.changed=true;
      const source=allZones(face()).find(z=>z.id===drag.zoneId),parent=allZones(face()).find(z=>z.id===source?.parent);
      const bb=bounds(drag.original),limit=parent?bounds(parent.polygon):[face().bbox[0],face().bbox[1],face().bbox[0]+face().bbox[2],face().bbox[1]+face().bbox[3]];
      const offsetX=Math.max(limit[0]-bb[0],Math.min(limit[2]-bb[2],dx));
      const offsetY=Math.max(limit[1]-bb[1],Math.min(limit[3]-bb[3],dy));
      state.zoneOverrides[key(state.face,drag.zoneId)]=drag.original.map(([x,y])=>[x+offsetX,y+offsetY]);
      renderDrawing();return;
    }
    if(drag.type!=='accent')return dragLine(e);const p=snappedPoint(e),svg=$('svg',$('#elevation'));$('#drag-preview',svg)?.remove();const r=document.createElementNS('http://www.w3.org/2000/svg','rect');r.id='drag-preview';for(const [k,v] of Object.entries({x:Math.min(drag.x,p.x),y:Math.min(drag.y,p.y),width:Math.abs(drag.x-p.x),height:Math.abs(drag.y-p.y),fill:'#a8bb7c66',stroke:'#5a733e','stroke-width':3,'pointer-events':'none'}))r.setAttribute(k,v);svg.appendChild(r);});
  $('#elevation').addEventListener('pointerup',e=>{if(!drag)return;suppressClick=true;try{$('#elevation').releasePointerCapture(e.pointerId);}catch(_){}if(drag.type!=='accent'){if(!drag.changed&&history.length&&drag.type!=='move-accent')history.pop();const changed=drag.changed,moved=drag.type==='move-accent';drag=null;if(moved&&changed)suppressClick=true;save();render();return;}const p=snappedPoint(e),x=Math.min(drag.x,p.x),y=Math.min(drag.y,p.y),w=Math.abs(drag.x-p.x),h=Math.abs(drag.y-p.y);drag=null;drawMode=null;$('#mode-help').hidden=true;if(w>10&&h>10){const z=currentZone(),parent=z?bounds(z.polygon):null;if(parent&&(x+w<parent[0]||x>parent[2]||y+h<parent[1]||y>parent[3])){toast('Tracez l’accent dans la zone sélectionnée.');renderDrawing();return;}makeAccent(rect(x,y,w,h));}else{renderDrawing();toast('Le rectangle est trop petit. Réessayez ou utilisez « Ajouter un accent ».');}});
  function cancelDrag(){if(drag&&drag.type!=='accent'&&history.length)state=history.pop();drag=null;drawMode=null;$('#mode-help').hidden=true;render();}
  $('#elevation').addEventListener('pointercancel',cancelDrag);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(drawMode||drag))cancelDrag();});
  ['x','y','w','h'].forEach(k=>$(`#geo-${k}`).onchange=updateGeometry);
  $('#delete-region').onclick=()=>modify(()=>{const opening=state.selected.kind==='opening',item=opening?currentOpening():currentZone();if(item.custom){const collection=opening?state.addedOpenings:state.customZones,removed=new Set([item.id]);let grew=true;while(grew){grew=false;for(const z of collection[state.face])if(removed.has(z.parent)&&!removed.has(z.id)){removed.add(z.id);grew=true;}}collection[state.face]=collection[state.face].filter(z=>!removed.has(z.id));for(const id of removed)for(const field of ['selections','zoneOverrides','openingOverrides','bands','openingTrims','panelLayouts'])delete state[field][key(state.face,id)];state.transitions=state.transitions.filter(t=>t.face!==state.face||!removed.has(t.zoneId));state.selected={kind:'zone',id:allZones(face())[0]?.id||null};}else delete(opening?state.openingOverrides:state.zoneOverrides)[key(state.face,item.id)];});
  $('#edit-openings').onclick=openOpenings;$('#openings-list').onclick=e=>{const b=e.target.closest('[data-edit-opening]');if(b){state.view='2d';$('#openings-dialog').close();selectOpening(b.dataset.editOpening);}};
  $('#add-window').onclick=()=>{const f=face(),[x,y,w,h]=f.bbox,id=newId('window');modify(()=>{state.addedOpenings[f.key].push({id,type:'window',polygon:rect(x+w*.45,y+h*.42,w*.1,h*.15),custom:true,dimension:'Ouverture ajoutée · à valider'});state.selected={kind:'opening',id};state.view='2d';});$('#openings-dialog').close();toast('Fenêtre ajoutée. Ajustez sa position et ses dimensions.');};
  $('#undo').onclick=()=>{if(!history.length)return;state=history.pop();selectedJoint=null;save();render();toast('Dernière modification annulée.');};$('#show-detection').onclick=()=>{detection=!detection;state.view='2d';render();};
  $('#reset').onclick=()=>modify(()=>{state=defaults();studioFeatures?.ensureState();if(data.projectKind==='imported-pdf'&&!studioFeatures?.canRender())state.view='2d';for(const f of data.faces)for(const z of allZones(f))state.selections[key(f.key,z.id)]=choice(f,z);normalizeFinish('soffit');normalizeFinish('fascia');neutral=false;detection=false;selectedJoint=null;});
  function measuredFace(f){const prepared=decoratedFace(f),omitted=new Set(prepared.zones.filter(z=>z.viewOnly==='2d'||z.id.startsWith('retour_')).map(z=>z.id));let more=true;while(more){more=false;for(const z of prepared.zones)if(omitted.has(z.parent)&&!omitted.has(z.id)){omitted.add(z.id);more=true;}}return {...prepared,zones:prepared.zones.filter(z=>!omitted.has(z.id))};}
  function exportFaces(){return data.faces.map(f=>{
    const prepared=measuredFace(f),measurement=E.measureFace(prepared),format=n=>Number.isFinite(n)?new Intl.NumberFormat('fr-CA',{maximumFractionDigits:1}).format(n):'à calibrer';
    const summary=[`Élévation ${f.name} · estimation sur tracé d’étude, à valider avant commande.`,`Surface nette de façade : ${format(measurement.netFt2)} pi². Retours 3D traités séparément dans les métrés.`,`Ouvertures : ${allOpenings(f).length}. Dimensions de pièces arrondies au 1/16 po ; échelle uniforme à confirmer.`,`Images de nuanciers officiels si disponibles ; textures illustratives, échantillons physiques à valider.`];
    for(const z of allZones(f)){
      if(z.viewOnly==='2d'||z.id.startsWith('retour_'))continue;
      const c=choice(f,z),m=materialById.get(c.materialId),area=measurement.zones.find(x=>x.id===z.id);
      summary.push(`${z.name} : ${m.brand} · ${m.name} · ${c.colorName||'Fini à choisir'} · ${format(area?.netFt2)} pi².`);
      const rule=V?.verticalRule(m,c);
      if(rule){
        const auto=V.breaks({polygon:z.polygon,feetPerPixel:feetPerPixel(f),
          material:m,choice:c,openings:allOpenings(f),
          manualTransitions:state.transitions.filter(t=>t.face===f.key&&t.zoneId===z.id)});
        summary.push('  Profils verticaux : '+(rule.maxRunIn/12)+' pi maximum entre raccords; '+auto.items.length+' transitions de hauteur proposées ('+auto.items.filter(t=>t.source==='top-of-window').length+' au-dessus des châssis).');
        if(rule.battenSpacingOptionsIn?.length)summary.push('  Battens : '+(c.battenSpacingIn||12)+' po c/c, centrés sur le pignon ou alignés avec les fenêtres, vérification terrain requise.');
      }
      if(c.pattern==='panel'){const result=panelResult(f,z,prepared);for(const cell of result.cells||[])if(cell.areaFt2>0)summary.push(`  ${cell.id} : ${L.inches(cell.widthIn)} × ${L.inches(cell.heightIn)}${cell.fits===false?' · FORMAT DÉPASSÉ':cell.rotationRequired?' · rotation de débit':''}${cell.special?' · coupe spéciale à valider':''}`);}
      const band=state.bands[key(f.key,z.id)];if(band?.enabled)summary.push(`  Bandeau de haut de mur : ${L.inches(band.heightIn)} de hauteur apparente.`);
    }
    const trims=allOpenings(f).filter(o=>state.openingTrims[key(f.key,o.id)]?.mode&&state.openingTrims[key(f.key,o.id)].mode!=='none');if(trims.length)summary.push(`${trims.length} contour(s) configuré(s), déduits du parement selon leur largeur apparente.`);
    return {key:f.key,name:f.name,svg:facadeSVG(f,{export:true,annotated:true,monochrome:false}),summary};
  });}
  $('#export-svg').onclick=()=>{exportFile(`MIR_${state.face}_etude.svg`,'image/svg+xml',facadeSVG(face(),{export:true,annotated:state.displayMode==='atelier'}));toast('Vue SVG exportée · échelles et contours à calibrer.');};
  $('#export-pdf').onclick=async()=>{if(!window.MIRPDF?.exportPlan)return toast('L’export PDF n’a pas chargé. Rechargez la page.');const button=$('#export-pdf');button.disabled=true;button.textContent='Préparation du PDF…';try{await window.MIRPDF.exportPlan({title:'MIR · étude des quatre élévations',subtitle:'Choix fabricants, calepinage et estimations à calibrer — sans valeur de construction',filename:'MIR_Etude_annotee_4_elevations.pdf',faces:exportFaces()});toast('PDF des quatre élévations préparé avec les choix et annotations actuels.');}catch(e){toast('Le PDF n’a pas pu être créé : '+String(e.message||e));}finally{button.disabled=false;button.textContent='PDF des 4 élévations ↗';}};
  $('#export-project').onclick=()=>{const result={...clone(state),project:data.title||'MIR · étude',exportedAt:new Date().toISOString(),sourceSha256:data.sourceSha256,...sceneGeometry(),disclaimer:'Choix d’étude et estimations à calibrer. Finitions documentées quand une référence fabricant est indiquée. Maçonneries génériques et teintes numériques utilisées pour la visualisation. Quantités à valider avant commande.',facades:data.faces.map(f=>({face:f.key,zones:allZones(f).map(z=>({...z,selection:choice(f,z)})),openings:allOpenings(f)})),soffit:materialById.get(state.soffitId),fascia:materialById.get(state.fasciaId)};exportFile('MIR_choix_du_projet.json','application/json',JSON.stringify(result,null,2));toast('Choix, joints, contours et géométrie exportés.');};
  const sharedFields=['selections','customZones','zoneOverrides','openingOverrides','addedOpenings','bands','openingTrims','openingStyles','panelLayouts','transitions','manualTransitionModes','panelStockRotation','soffitId','soffitColorId','soffitColor','fasciaId','fasciaColorId','fasciaColor','roofId','roofColorId','roofColor','roofStyle','gableCornices','porch','structures','concreteSteps','siteStyle','returnFinishes','volumeOverride','recessOverride'];
  function syncStudy(){
    if((window.MIRProjectStore?.activeId()||null)!==(activeProject?.id||null)){location.reload();return;}
    let incoming;try{incoming=JSON.parse(localStorage.getItem(STORAGE));}catch(_){return;}if(incoming?.version!==2)return;
    const next=Object.fromEntries(sharedFields.filter(k=>Object.prototype.hasOwnProperty.call(incoming,k)).map(k=>[k,incoming[k]]));
    const current=Object.fromEntries(Object.keys(next).map(k=>[k,state[k]]));if(JSON.stringify(next)===JSON.stringify(current))return;
    // Share edits, keep each window's camera, selected face and display mode.
    state={...state,...next};for(const f of data.faces){state.customZones[f.key]||=[];state.addedOpenings[f.key]||=[];for(const z of allZones(f))state.selections[key(f.key,z.id)]=choice(f,z);}
    normalizeFinish('soffit');normalizeFinish('fascia');studioFeatures?.normalizeRoof();history=[];selectedJoint=null;render();
  }
  window.addEventListener('storage',event=>{if(event.key===TAKEOFF_STORAGE||event.key===null)syncTakeoffGeometry();if(event.key===STORAGE||event.key===null||event.key==='mir-active-project-v1')syncStudy();});
  window.addEventListener('focus',()=>{syncTakeoffGeometry();syncStudy();});window.addEventListener('pageshow',()=>{syncTakeoffGeometry();syncStudy();});
  window.addEventListener('message',event=>{if(event.origin!==window.location.origin||!window.parent||event.source!==window.parent)return;if(event.data?.type==='mir:takeoff-change'&&event.data?.source==='mir-takeoff'){syncTakeoffGeometry();syncStudy();}});
  const incoming=new URL(window.location.href),materialId=incoming.searchParams.get('material'),embedded=incoming.searchParams.get('embed')==='1',adminContext=incoming.searchParams.get('context')==='admin'||incoming.searchParams.get('mode')==='atelier';
  if(embedded)document.body?.classList.add('embed-studio');
  if(['atelier','client'].includes(incoming.searchParams.get('mode')))state.displayMode=incoming.searchParams.get('mode');
  if(['2d','3d'].includes(incoming.searchParams.get('view')))state.view=incoming.searchParams.get('view');
  if(materialId&&facadeMaterials.some(m=>m.id===materialId)){ensureSelected();if(state.selected.kind!=='zone')state.selected={kind:'zone',id:allZones(face())[0]?.id||null};state.selections[key(state.face,state.selected.id)]=normalChoice({materialId});incoming.searchParams.delete('material');window.history.replaceState(null,'',incoming.pathname+incoming.search+incoming.hash);}
  window.MIR_STUDY={snapshot:()=>clone({face:state.face,view:state.view,displayMode:state.displayMode,alignWindow:state.alignWindow!==false,selected:state.selected,zoneCount:allZones(face()).length,openingCount:allOpenings(face()).length,soffitId:state.soffitId,soffitColor:state.soffitColor,fasciaId:state.fasciaId,fasciaColor:state.fasciaColor,choices:state.selections,bands:state.bands,openingTrims:state.openingTrims,panelLayouts:state.panelLayouts,transitions:state.transitions,...sceneGeometry(),paintOrder:orderedZones(decoratedFace(face()).zones).map(z=>z.id)}),exportFaces,pickThree,embedded,swatches:{loaded:swatchImages.size,missing:missingSwatchCount},source:data.analysis};
  studioFeatures=window.MIRStudioFeatures?.setup({$,state:()=>state,data:()=>data,materials,roofControls:!adminContext,modify,save,render,renderDrawing,officialColor,colorsFor,openMaterial,toast,normalChoice,choice,allZones,face,currentZone,feetPerPixel,readTakeoff,takeoffSeed,sceneGeometryBase,patternDef,frontMasonryBand,frontFoundationHeight});
  $('#duplicate-zone').onclick=()=>{const z=currentZone();if(!z)return toast('Choisissez une zone à reproduire.');const b=bounds(z.polygon),dx=(b[2]-b[0])*.05,dy=(b[3]-b[1])*.05,id=newId('copie');modify(()=>{const copyZone={...clone(z),id,name:z.name+' · copie',parent:z.parent||z.id,custom:true,polygon:z.polygon.map(([x,y])=>[x+dx,y+dy])};state.customZones[state.face].push(copyZone);state.selections[key(state.face,id)]=normalChoice(choice(face(),z));if(state.panelLayouts[key(state.face,z.id)])state.panelLayouts[key(state.face,id)]=clone(state.panelLayouts[key(state.face,z.id)]);state.selected={kind:'zone',id};state.view='2d';});$('#geometry-controls').open=true;toast('Zone reproduite avec sa matière. Ajustez sa position et sa taille.');};
  if(data.projectKind==='imported-pdf'&&!studioFeatures?.canRender())state.view='2d';
  save();render();
})();
