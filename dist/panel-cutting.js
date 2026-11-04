/* MIR panel cutting — pure geometry, deterministic conservative sheet packing.
 * Browser: load takeoff-engine.js and vendor/polygon-clipping/polygon-clipping.umd.min.js first.
 * geometryPx uses elevation coordinates; geometryIn has local bbox origin [0,0], Y down.
 * Placement x/y is the top-left of the ROTATED bounding box. No reflection is allowed.
 * The installed bottom is identified BEFORE packing, never chosen from a convenient slope.
 * Real polygon area and reserved rectangular blank area are deliberately separate.
 * This heuristic does not nest angled offcuts or holes and does not prove an optimum.
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(require('./takeoff-engine.js'), require('./vendor/polygon-clipping/polygon-clipping.umd.min.js'))
    : factory(root.MIRTakeoff, root.polygonClipping);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MIRPanelCutting = api;
})(typeof window === 'object' ? window : globalThis, function (E, PC) {
  'use strict';
  const VERSION = '1.0.0', EPS = 1e-7, MIN_GAP_IN = 0.75;
  const STOCKS = Object.freeze({
    '48x96': Object.freeze({key:'48x96', widthIn:48, heightIn:96, label:'4 × 8 pi'}),
    '48x120': Object.freeze({key:'48x120', widthIn:48, heightIn:120, label:'4 × 10 pi'})
  });
  const DEFAULT_SETTINGS = Object.freeze({requireFactoryBottom:true, panelGapIn:MIN_GAP_IN,
    allowedStockKeys:Object.freeze(['48x96','48x120']), pieceOverrides:Object.freeze({}), materialOverrides:Object.freeze({})});
  const MESSAGES = Object.freeze({
    DEPENDENCY_MISSING:'Le moteur de contours requis n’est pas chargé; aucun débit n’a été supposé.',
    INVALID_PANEL_GAP:'Il faut réserver au moins ¾ po entre deux morceaux; le réglage est invalide.',
    INVALID_STOCK_SELECTION:'Sélectionner au moins un format connu de feuille : 4 × 8 ou 4 × 10 pi.',
    MISSING_SCALE:'Échelle absente : les dimensions et le nombre de feuilles restent indéterminés.',
    INVALID_GEOMETRY:'Le contour, ses parents ou une ouverture sont invalides; corriger le plan avant le débit.',
    GEOMETRY_OPERATION_FAILED:'La découpe des contours n’a pas abouti; la zone reste à vérifier.',
    GEOMETRY_AREA_MISMATCH:'Le contour extrait ne correspond pas à la surface mesurée; débit bloqué pour vérification.',
    PANEL_SOURCE_MISSING:'La façade ou la zone de ce calepinage est absente.',
    DUPLICATE_PANEL_SOURCE:'Plusieurs calepinages décrivent la même zone; choisir une seule version.',
    MATERIAL_UNKNOWN:'La référence du panneau est inconnue; aucun format de feuille n’a été inventé.',
    COLOR_UNKNOWN:'La référence fabricant de la teinte manque; une couleur d’écran ne suffit pas pour regrouper les feuilles.',
    COLOR_NOT_IN_PRODUCT:'La référence de teinte n’appartient pas au panneau sélectionné.',
    GRAIN_UNKNOWN:'Le sens du fini reste à confirmer; la rotation et le débit sont bloqués.',
    STOCK_UNKNOWN:'Aucun format de feuille documenté ou confirmé pour ce panneau.',
    STOCK_NOT_SELECTED:'Les formats sélectionnés ne sont pas documentés ou confirmés pour ce panneau.',
    STOCK_DIMENSIONS_UNCONFIRMED:'Format nominal seulement : confirmer les dimensions physiques de la feuille avant fabrication.',
    FACTORY_BOTTOM_UNRESOLVED:'Aucun segment horizontal inférieur certain ne permet de conserver un bas d’usine.',
    FACTORY_BOTTOM_NON_HORIZONTAL:'Le bas après pose comporte une coupe inclinée : il ne peut pas être déclaré bord d’usine.',
    FACTORY_BOTTOM_INCOMPATIBLE:'La pièce possède plusieurs niveaux de bas incompatibles avec un seul bord d’usine.',
    PIECE_TOO_LARGE:'Le morceau dépasse les feuilles permises avec son sens de grain; ajouter un joint au plan ou revoir le calepinage.',
    FACTORY_BOTTOM_NO_PLACEMENT:'Le bas après pose ne peut pas coïncider avec un bord d’usine dans les formats permis.',
    INVALID_PIECE:'La géométrie ou les dimensions de la pièce sont invalides.',
    DUPLICATE_PIECE_ID:'Deux morceaux portent le même identifiant technique; débit bloqué.',
    PACKING_INVALID:'La vérification indépendante a détecté un placement invalide; ne pas utiliser ce débit.'
  });
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const positive = n => finite(n) && n > EPS;
  const sum = a => a.reduce((n,v)=>n+v,0);
  const text = s => typeof s === 'string' && s.trim() ? s.trim() : null;
  const same = (a,b) => Math.abs(a-b) <= EPS;
  const pointOK = p => Array.isArray(p) && p.length >= 2 && finite(p[0]) && finite(p[1]);
  const rect = (x,y,w,h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const bbox = p => [Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];
  const issue = (code, source={}, detail) => ({code,message:MESSAGES[code]||code,
    ...(source.face!=null?{face:source.face}:{}),...(source.zoneId!=null?{zoneId:source.zoneId}:{}),
    ...(source.pieceId!=null?{pieceId:source.pieceId}:{}),...(detail?{detail}:{})});
  const materialArray = value => Array.isArray(value)?value:Array.isArray(value?.materials)?value.materials:[];
  const cloneRing = ring => {
    const p=(ring||[]).map(v=>[v[0],v[1]]);
    if(p.length>1&&same(p[0][0],p[p.length-1][0])&&same(p[0][1],p[p.length-1][1]))p.pop();
    return p;
  };
  function ringArea(ring) {
    if(!Array.isArray(ring)||ring.length<3)return 0;
    const [ox,oy]=ring[0];let a=0;
    for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length];a+=(p[0]-ox)*(q[1]-oy)-(q[0]-ox)*(p[1]-oy);}
    return Math.abs(a)/2;
  }
  const geometryArea = g => g ? ringArea(g.outer)-sum((g.holes||[]).map(ringArea)) : 0;
  function inRing(p,ring) {
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[j],b=ring[i];
      if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
  }
  const inGeometry = (p,g) => inRing(p,g.outer)&&!(g.holes||[]).some(h=>inRing(p,h));
  function labelPoint(g) {
    const b=bbox(g.outer),center=[(b[0]+b[2])/2,(b[1]+b[3])/2];
    if(inGeometry(center,g))return center;
    const rings=[g.outer,...(g.holes||[])],ys=[...new Set(rings.flat().map(p=>p[1]))].sort((a,b)=>a-b);
    let best=null,score=-1;
    for(let j=1;j<ys.length;j++){
      if(ys[j]-ys[j-1]<=EPS)continue;
      const y=(ys[j]+ys[j-1])/2,xs=[];
      for(const ring of rings)for(let i=0;i<ring.length;i++){
        const a=ring[i],b=ring[(i+1)%ring.length];
        if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      xs.sort((a,b)=>a-b);
      for(let i=1;i<xs.length;i++){
        const p=[(xs[i-1]+xs[i])/2,y],s=(xs[i]-xs[i-1])*(ys[j]-ys[j-1]);
        if(s>score&&inGeometry(p,g)){best=p;score=s;}
      }
    }return best||center;
  }
  function bottomOf(g) {
    // Only outer edges with material directly above and exterior directly below
    // are lower edges AFTER INSTALLATION. Inner window holes are never factory edges.
    const b=bbox(g.outer),delta=Math.max(EPS/10,Math.min(b[2]-b[0],b[3]-b[1])*1e-8),edges=[],slopes=[];
    for(let i=0;i<g.outer.length;i++){
      const a=g.outer[i],z=g.outer[(i+1)%g.outer.length];
      if(Math.abs(z[0]-a[0])<=EPS)continue;
      const mid=[(a[0]+z[0])/2,(a[1]+z[1])/2];
      if(inGeometry([mid[0],mid[1]-delta],g)&&!inGeometry([mid[0],mid[1]+delta],g)){
        if(same(a[1],z[1]))edges.push([a.slice(),z.slice()]);else slopes.push([a.slice(),z.slice()]);
      }
    }
    let code=null;
    if(slopes.length)code='FACTORY_BOTTOM_NON_HORIZONTAL';
    else if(!edges.length)code='FACTORY_BOTTOM_UNRESOLVED';
    else if(edges.some(e=>!same(e[0][1],b[3])))code='FACTORY_BOTTOM_INCOMPATIBLE';
    return {edges,slopes,code};
  }
  function settingsOf(raw={}) {
    return {...DEFAULT_SETTINGS,...raw,
      allowedStockKeys:Array.isArray(raw.allowedStockKeys)?[...new Set(raw.allowedStockKeys)]:[...DEFAULT_SETTINGS.allowedStockKeys],
      pieceOverrides:raw.pieceOverrides||{},materialOverrides:raw.materialOverrides||{}};
  }
  function settingsIssues(s) {
    const out=[];
    if(!finite(s.panelGapIn)||s.panelGapIn<MIN_GAP_IN)out.push(issue('INVALID_PANEL_GAP'));
    if(!s.allowedStockKeys.length||s.allowedStockKeys.some(k=>!STOCKS[k]))out.push(issue('INVALID_STOCK_SELECTION'));
    return out;
  }
  function getMaterialOptions(materials,overrides={}) {
    return materialArray(materials).filter(m=>m.family==='Fibrociment'&&m.renderPattern==='panel'&&
      (!Array.isArray(m.applications)||m.applications.includes('siding'))).map(m=>{
      const ov=overrides[m.id]||{},d=m.dimensions||{},explicit=Array.isArray(m.formats)?m.formats:[],sourceUrl=m.maxPiece?.sourceUrl||m.sourceUrl||null;
      const dimensions=[];
      for(const f of explicit)dimensions.push({w:f.widthIn,h:f.lengthIn,nominal:f.measurementKind==='nominal'||f.stockConfirmationRequired===true,sourceUrl:f.sourceUrl||sourceUrl});
      if(positive(d.widthIn)){
        for(const h of Array.isArray(d.availableLengthsIn)?d.availableLengthsIn:[])dimensions.push({w:d.widthIn,h,nominal:false,sourceUrl});
        if(positive(d.lengthIn))dimensions.push({w:d.widthIn,h:d.lengthIn,nominal:false,sourceUrl});
      }
      if(!dimensions.length&&positive(d.nominalWidthIn)&&positive(d.nominalLengthIn))dimensions.push({w:d.nominalWidthIn,h:d.nominalLengthIn,nominal:true,sourceUrl});
      const map=new Map();
      for(const f of dimensions){const key=`${f.w}x${f.h}`;if(STOCKS[key]&&!map.has(key))map.set(key,{...STOCKS[key],nominal:f.nominal,sourceUrl:f.sourceUrl,provenance:'catalogue'});}
      if(Array.isArray(ov.stockKeys)){
        const wanted=[...new Set(ov.stockKeys)].filter(k=>STOCKS[k]);
        for(const key of [...map.keys()])if(!wanted.includes(key))map.delete(key);
        for(const key of wanted)if(!map.has(key))map.set(key,{...STOCKS[key],nominal:false,sourceUrl:null,provenance:'atelier_confirmed_override'});
      }
      if(ov.dimensionsConfirmed===true)for(const stock of map.values())stock.nominal=false;
      let grain='unknown',grainSource=null;
      if(m.id==='hardiepanel'||m.id==='allura-panel-smooth-4x10'){grain='none';grainSource='documented_smooth_profile';}
      else if(m.id==='hardiepanel-cedarmill'){grain='directional';grainSource='documented_cedarmill_profile';}
      else if(['none','directional'].includes(m.cutting?.grain)){grain=m.cutting.grain;grainSource='catalogue_cutting_metadata';}
      if(['none','directional'].includes(ov.grain)){grain=ov.grain;grainSource='atelier_confirmed_override';}
      const stocks=[...map.values()].sort((a,b)=>a.heightIn-b.heightIn);
      return {materialId:m.id,name:m.name,brand:m.brand||null,finish:m.finish||
        (m.id==='allura-panel-smooth-4x10'?'Smooth':m.id==='allura-panel-traditional-4x10'?'Traditional':null),
        thicknessIn:positive(ov.thicknessIn)?ov.thicknessIn:positive(d.thicknessIn)?d.thicknessIn:null,
        grain,grainSource,allowedRotations:grain==='none'?[0,90,180,270]:[0],stockKeys:stocks.map(s=>s.key),stocks,
        dimensionsConfirmed:stocks.length>0&&stocks.every(s=>!s.nominal),sourceUrl,
        colorStatus:m.colorStatus||null,colors:Array.isArray(m.colors)?m.colors:[],
        notes:[...(stocks.some(s=>s.nominal)?[MESSAGES.STOCK_DIMENSIONS_UNCONFIRMED]:[]),...(grain==='unknown'?[MESSAGES.GRAIN_UNKNOWN]:[])]};
    });
  }
  function registeredLabels(pieces,previous={}) {
    const registry={},used=new Set();let highest=0;
    // Keep retired IDs, so later changes cannot recycle an old printed label.
    for(const [id,label] of Object.entries(previous||{}).sort((a,b)=>a[0].localeCompare(b[0]))){
      if(!/^P\d{3,}$/.test(label)||used.has(label))continue;
      registry[id]=label;used.add(label);highest=Math.max(highest,Number(label.slice(1)));
    }
    for(const p of [...pieces].sort((a,b)=>a.id.localeCompare(b.id))){
      if(!registry[p.id]){let label;do{label=`P${String(++highest).padStart(3,'0')}`;}while(used.has(label));registry[p.id]=label;used.add(label);}
      p.label=registry[p.id];
    }return registry;
  }
  function extractPieces(input={}) {
    const settings=settingsOf(input.settings),warnings=settingsIssues(settings),pendingSources=[],pieces=[],skippedSources=[];
    const faces=Array.isArray(input.faces)?input.faces:[],materials=materialArray(input.materials),materialMap=new Map(materials.map(m=>[m.id,m]));
    const materialOptions=getMaterialOptions(materials,settings.materialOverrides),optionsMap=new Map(materialOptions.map(m=>[m.materialId,m]));
    const panels=Array.isArray(input.panels)?input.panels:faces.flatMap(f=>(f.zones||[]).filter(z=>!z.decorationType&&optionsMap.has(z.selection?.materialId||z.materialId)).map(z=>({face:f.key,zoneId:z.id,layout:z.panelLayout||z.layout||{}})));
    const sourceKeys=new Set(),faceContexts=new Map();
    const pending=(code,source,detail)=>{const w=issue(code,source,detail);pendingSources.push(w);warnings.push(w);};
    if(!E?.panelLayout||!PC?.intersection){pending('DEPENDENCY_MISSING');return {settings,faces,pieces,pendingSources,warnings,skippedSources,materialOptions,labelRegistry:{...(input.labelRegistry||{})}};}
    for(const panel of panels){
      const faceKey=panel.face,zoneId=panel.zoneId,source={face:faceKey,zoneId},sourceKey=JSON.stringify([faceKey,zoneId]);
      if(sourceKeys.has(sourceKey)){pending('DUPLICATE_PANEL_SOURCE',source);continue;}sourceKeys.add(sourceKey);
      const face=faces.find(f=>(f.key??f.face??f.id)===faceKey),zone=face?.zones?.find(z=>z.id===zoneId);
      if(!face||!zone){pending('PANEL_SOURCE_MISSING',source);continue;}
      const selection={...(zone.selection||{}),...Object.fromEntries(Object.entries(panel).filter(([,v])=>v!=null))};
      const materialId=selection.materialId||zone.materialId,material=materialMap.get(materialId),option=optionsMap.get(materialId);
      if(!material){pending('MATERIAL_UNKNOWN',source);continue;}
      if(!option){skippedSources.push({...source,materialId,reason:'outside_fiber_cement_panel_scope'});continue;}
      if(!positive(face.feetPerPixel)){pending('MISSING_SCALE',source);continue;}
      let context=faceContexts.get(faceKey);
      if(!context){
        const measured=E.measureFace(face),map=new Map((face.zones||[]).map(z=>[z.id,z]));
        context={measured,map,order:E.paintOrder(face),effective:new Map()};faceContexts.set(faceKey,context);
      }
      if(!context.measured.geometryValid){pending('INVALID_GEOMETRY',source,context.measured.warnings);continue;}
      try{
        function effective(z){
          if(context.effective.has(z.id))return context.effective.get(z.id);
          let value=[[cloneRing(z.polygon)]];
          if(z.parent)value=PC.intersection(value,effective(context.map.get(z.parent)));
          context.effective.set(z.id,value);return value;
        }
        let assigned=effective(zone);const i=context.order.findIndex(z=>z.id===zoneId);
        const subtract=[...context.order.slice(i+1).map(effective),...(face.openings||[]).map(o=>[[cloneRing(o.polygon)]])].filter(a=>a.length);
        if(subtract.length&&assigned.length)assigned=PC.difference(assigned,...subtract);
        const layout=E.panelLayout(face,zoneId,panel.layout||{},{}),sourcePieces=[];
        if(layout.warnings.some(w=>w.code==='PANEL_ZONE_UNKNOWN')){pending('INVALID_GEOMETRY',source);continue;}
        const scale=face.feetPerPixel*12;
        let colorId=text(selection.colorId),colorName=text(selection.colorName),colorCode=null;
        if(option.colorStatus==='primed_only'&&!colorId){colorId='primed';colorName='Apprêté';}
        else if(!colorId)colorCode='COLOR_UNKNOWN';
        else if(option.colors.length){const c=option.colors.find(c=>c.id===colorId);if(c)colorName=c.name;else colorCode='COLOR_NOT_IN_PRODUCT';}
        else if(option.colorStatus==='primed_only'&&colorId!=='primed')colorCode='COLOR_NOT_IN_PRODUCT';
        const stockKeys=option.stockKeys.filter(k=>settings.allowedStockKeys.includes(k));
        if(!option.dimensionsConfirmed&&stockKeys.length){pending('STOCK_DIMENSIONS_UNCONFIRMED',source,{materialId,stockKeys});}
        for(const cell of layout.cells){
          const b=cell.layoutBoundsPx,parts=assigned.length?PC.intersection(assigned,[[rect(b[0],b[1],b[2]-b[0],b[3]-b[1])]]):[];
          const components=parts.map(p=>({outer:cloneRing(p[0]),holes:p.slice(1).map(cloneRing)})).filter(g=>geometryArea(g)>EPS)
            .sort((a,b)=>{const x=bbox(a.outer),y=bbox(b.outer);return x[1]-y[1]||x[0]-y[0]||x[3]-y[3]||x[2]-y[2];});
          for(const [partIndex,geometryPx] of components.entries()){
            const b=bbox(geometryPx.outer),originPx=[b[0],b[1]],convert=p=>[(p[0]-b[0])*scale,(p[1]-b[1])*scale];
            const geometryIn={outer:geometryPx.outer.map(convert),holes:geometryPx.holes.map(r=>r.map(convert))};
            const id=`${faceKey}:${zoneId}:cell-${cell.row}-${cell.column}:part-${partIndex+1}`,ov=settings.pieceOverrides[id]||{};
            const requireFactoryBottom=typeof ov.requireFactoryBottom==='boolean'?ov.requireFactoryBottom:settings.requireFactoryBottom!==false;
            const lower=bottomOf(geometryIn),reasonCodes=[];
            if(colorCode)reasonCodes.push(colorCode);
            if(option.grain==='unknown')reasonCodes.push('GRAIN_UNKNOWN');
            if(!option.stockKeys.length)reasonCodes.push('STOCK_UNKNOWN');else if(!stockKeys.length)reasonCodes.push('STOCK_NOT_SELECTED');
            if(requireFactoryBottom&&lower.code)reasonCodes.push(lower.code);
            const widthIn=(b[2]-b[0])*scale,heightIn=(b[3]-b[1])*scale;
            const p={id,label:null,face:faceKey,faceName:face.name||faceKey,zoneId,zoneName:zone.name||zoneId,
              cellId:cell.id,row:cell.row,column:cell.column,partIndex:partIndex+1,geometryPx,geometryIn,originPx,
              labelPointPx:labelPoint(geometryPx),labelPointIn:labelPoint(geometryIn),widthIn,heightIn,
              areaIn2:geometryArea(geometryIn),blankAreaIn2:widthIn*heightIn,
              materialId,materialName:option.name,brand:option.brand,colorId,colorName,color:selection.color||null,
              finish:option.finish,thicknessIn:option.thicknessIn,grain:option.grain,grainSource:option.grainSource,
              allowedRotations:option.allowedRotations.slice(),stockKeys,requireFactoryBottom,
              bottomEdgesIn:lower.edges,bottomSlopesIn:lower.slopes,bottomStatus:lower.code||'identified',
              dimensionsConfirmed:option.dimensionsConfirmed,special:geometryIn.holes.length>0||Math.abs(widthIn*heightIn-geometryArea(geometryIn))>EPS,
              status:reasonCodes.length?'blocked':'ready',reasonCodes};
            sourcePieces.push(p);
          }
        }
        const area=sum(sourcePieces.map(p=>p.areaIn2)),expected=(context.measured.zones.find(z=>z.id===zoneId)?.netFt2??NaN)*144;
        if(!finite(expected)||Math.abs(area-expected)>Math.max(1e-5,Math.abs(expected)*1e-7)){
          pending('GEOMETRY_AREA_MISMATCH',source,{expectedIn2:finite(expected)?expected:null,extractedIn2:area});
          sourcePieces.forEach(p=>{p.status='blocked';p.reasonCodes.push('GEOMETRY_AREA_MISMATCH');});
        }
        pieces.push(...sourcePieces);
      }catch(error){pending('GEOMETRY_OPERATION_FAILED',source,{message:String(error?.message||error)});}
    }
    const labelRegistry=registeredLabels(pieces,input.labelRegistry);
    for(const p of pieces)for(const code of p.reasonCodes)warnings.push(issue(code,{face:p.face,zoneId:p.zoneId,pieceId:p.id}));
    return {settings,faces,pieces,pendingSources,warnings,skippedSources,materialOptions,labelRegistry};
  }
  function rotatedDimensions(p,deg){return deg===90||deg===270?[p.heightIn,p.widthIn]:[p.widthIn,p.heightIn];}
  function transformPiece(piece,placement) {
    const r=placement.rotationDeg||0,x=placement.xIn||0,y=placement.yIn||0,w=piece.widthIn,h=piece.heightIn;
    if(![0,90,180,270].includes(r))throw new Error('Only orthogonal rotations without reflection are supported.');
    const move=p=>{const q=r===90?[h-p[1],p[0]]:r===180?[w-p[0],h-p[1]]:r===270?[p[1],w-p[0]]:p;return [q[0]+x,q[1]+y];};
    return {geometrySheetIn:{outer:piece.geometryIn.outer.map(move),holes:(piece.geometryIn.holes||[]).map(ring=>ring.map(move))},
      bottomEdgesSheetIn:(piece.bottomEdgesIn||[]).map(e=>e.map(move)),labelPointSheetIn:move(piece.labelPointIn||labelPoint(piece.geometryIn))};
  }
  function factoryEdgeOf(edges,sheet) {
    if(!edges.length||edges.some(e=>!e.every(pointOK)||Math.hypot(e[1][0]-e[0][0],e[1][1]-e[0][1])<=EPS))return null;
    if(edges.every(e=>e.every(p=>same(p[1],0))))return 'top';
    if(edges.every(e=>e.every(p=>same(p[0],sheet.widthIn))))return 'right';
    if(edges.every(e=>e.every(p=>same(p[1],sheet.heightIn))))return 'bottom';
    if(edges.every(e=>e.every(p=>same(p[0],0))))return 'left';
    return null;
  }
  const groupKey = p => JSON.stringify([p.brand??null,p.materialId??null,p.colorId??null,p.finish??null,p.thicknessIn??null,p.grain??null]);
  function legalRotations(piece) {
    const allowed=piece.grain==='none'?[0,90,180,270]:[0];
    return allowed.filter(r=>!Array.isArray(piece.allowedRotations)||piece.allowedRotations.includes(r));
  }
  function pieceIssues(p) {
    const codes=[...(p.reasonCodes||[])];
    const g=p.geometryIn;
    if(!p.id||!positive(p.widthIn)||!positive(p.heightIn)||!positive(p.areaIn2)||!g?.outer?.every(pointOK)||g.outer.length<3||
       !Array.isArray(g.holes||[])||!(g.holes||[]).every(r=>r.length>=3&&r.every(pointOK))||!positive(geometryArea(g)))codes.push('INVALID_PIECE');
    else {
      const b=bbox(g.outer);
      if(!same(b[0],0)||!same(b[1],0)||!same(b[2],p.widthIn)||!same(b[3],p.heightIn)||
        finite(p.areaIn2)&&Math.abs(geometryArea(g)-p.areaIn2)>Math.max(EPS,p.areaIn2*1e-8))codes.push('INVALID_PIECE');
      const bottom=bottomOf(g);if(p.requireFactoryBottom&&bottom.code)codes.push(bottom.code);
    }
    if(!text(p.materialId))codes.push('MATERIAL_UNKNOWN');
    if(!text(p.colorId))codes.push('COLOR_UNKNOWN');
    if(!['none','directional'].includes(p.grain))codes.push('GRAIN_UNKNOWN');
    if(!Array.isArray(p.stockKeys)||!p.stockKeys.length)codes.push('STOCK_UNKNOWN');
    return [...new Set(codes)];
  }
  function freeFactoryEdges(r,sheet){
    return [...(same(r.yIn,0)?['top']:[]),...(same(r.xIn+r.widthIn,sheet.widthIn)?['right']:[]),
      ...(same(r.yIn+r.heightIn,sheet.heightIn)?['bottom']:[]),...(same(r.xIn,0)?['left']:[])];
  }
  function candidates(piece,sheet) {
    const out=[];
    for(const [fi,free] of sheet.free.entries())for(const rotationDeg of legalRotations(piece)){
      const [widthIn,heightIn]=rotatedDimensions(piece,rotationDeg);
      if(widthIn>free.widthIn+EPS||heightIn>free.heightIn+EPS)continue;
      const seen=new Set();
      for(const right of [false,true])for(const bottom of [false,true]){
        const xIn=right?free.xIn+free.widthIn-widthIn:free.xIn,yIn=bottom?free.yIn+free.heightIn-heightIn:free.yIn;
        const key=[xIn,yIn,rotationDeg].join(':');if(seen.has(key))continue;seen.add(key);
        const t=transformPiece(piece,{xIn,yIn,rotationDeg}),factoryEdge=factoryEdgeOf(t.bottomEdgesSheetIn,sheet);
        if(piece.requireFactoryBottom&&!factoryEdge)continue;
        out.push({fi,right,bottom,pieceId:piece.id,label:piece.label,xIn,yIn,widthIn,heightIn,rotationDeg,factoryEdge,...t,
          score:[free.widthIn*free.heightIn-widthIn*heightIn,Math.min(free.widthIn-widthIn,free.heightIn-heightIn),rotationDeg,xIn,yIn]});
      }
    }return out;
  }
  function lexCompare(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(Math.abs(d)>EPS)return d;}return 0;}
  function splitFree(free,p,gap,mode) {
    const oppositeX=p.right?free.xIn:p.xIn+p.widthIn+gap;
    const oppositeY=p.bottom?free.yIn:p.yIn+p.heightIn+gap;
    const wx=Math.max(0,free.widthIn-p.widthIn-gap),hy=Math.max(0,free.heightIn-p.heightIn-gap);
    const out=mode==='vertical'
      ?[{xIn:oppositeX,yIn:free.yIn,widthIn:wx,heightIn:free.heightIn},{xIn:p.xIn,yIn:oppositeY,widthIn:p.widthIn,heightIn:hy}]
      :[{xIn:free.xIn,yIn:oppositeY,widthIn:free.widthIn,heightIn:hy},{xIn:oppositeX,yIn:p.yIn,widthIn:wx,heightIn:p.heightIn}];
    return out.filter(r=>positive(r.widthIn)&&positive(r.heightIn));
  }
  function newSheet(stock,piece) {
    return {stockKey:stock.key,widthIn:stock.widthIn,heightIn:stock.heightIn,materialId:piece.materialId,
      materialName:piece.materialName||null,brand:piece.brand||null,colorId:piece.colorId,colorName:piece.colorName||null,
      finish:piece.finish||null,thicknessIn:piece.thicknessIn??null,grain:piece.grain,
      placements:[],free:[{xIn:0,yIn:0,widthIn:stock.widthIn,heightIn:stock.heightIn}]};
  }
  function runPacking(pieces,settings,variant) {
    const pending=[...pieces].sort((a,b)=>Number(b.requireFactoryBottom)-Number(a.requireFactoryBottom)||
      legalRotations(a).length-legalRotations(b).length||
      (variant.order==='area'?b.widthIn*b.heightIn-a.widthIn*a.heightIn:Math.max(b.widthIn,b.heightIn)-Math.max(a.widthIn,a.heightIn))||
      b.heightIn-a.heightIn||b.widthIn-a.widthIn||a.id.localeCompare(b.id));
    const sheets=[],unplaced=[];
    for(const piece of pending){
      let best=null,bestSheet=null;
      for(const sheet of sheets){
        if(!piece.stockKeys.includes(sheet.stockKey))continue;
        for(const c of candidates(piece,sheet))if(!best||lexCompare(c.score,best.score)<0){best=c;bestSheet=sheet;}
      }
      if(!best){
        const stocks=piece.stockKeys.filter(k=>settings.allowedStockKeys.includes(k)&&STOCKS[k]).map(k=>STOCKS[k])
          .sort((a,b)=>variant.stock==='large'?b.heightIn-a.heightIn:a.heightIn-b.heightIn);
        for(const stock of stocks){
          const fresh=newSheet(stock,piece),options=candidates(piece,fresh).sort((a,b)=>lexCompare(a.score,b.score));
          if(options.length){best=options[0];bestSheet=fresh;sheets.push(fresh);break;}
        }
      }
      if(!best){
        const fits=piece.stockKeys.filter(k=>settings.allowedStockKeys.includes(k)&&STOCKS[k]).some(k=>legalRotations(piece).some(r=>{const [w,h]=rotatedDimensions(piece,r);return w<=STOCKS[k].widthIn+EPS&&h<=STOCKS[k].heightIn+EPS;}));
        unplaced.push({piece,code:fits?'FACTORY_BOTTOM_NO_PLACEMENT':'PIECE_TOO_LARGE'});continue;
      }
      const free=bestSheet.free[best.fi];bestSheet.free.splice(best.fi,1,...splitFree(free,best,settings.panelGapIn,variant.split));
      const {fi,right,bottom,score,...placement}=best;bestSheet.placements.push(placement);
    }
    return {sheets,unplaced,score:[unplaced.length,sum(sheets.map(s=>s.widthIn*s.heightIn)),sheets.length,
      -sum(sheets.map(s=>Math.max(0,...s.free.map(r=>r.widthIn*r.heightIn))))]};
  }
  function packPieces(pieces=[],rawSettings={}) {
    const settings=settingsOf(rawSettings.settings||rawSettings),warnings=settingsIssues(settings),unplaced=[],groups=[],sheets=[];
    const badSettings=warnings.length>0,buckets=new Map(),ids=new Set(),duplicateIds=new Set();
    for(const p of pieces){if(ids.has(p.id))duplicateIds.add(p.id);ids.add(p.id);}
    function reject(p,codes){
      const row={pieceId:p.id,label:p.label||null,face:p.face??null,zoneId:p.zoneId??null,reasonCodes:[...new Set(codes)],messages:[]};
      row.messages=row.reasonCodes.map(c=>MESSAGES[c]||c);unplaced.push(row);
      for(const c of row.reasonCodes)warnings.push(issue(c,{pieceId:p.id,face:p.face,zoneId:p.zoneId}));
    }
    for(const p of pieces){
      const key=groupKey(p);if(!buckets.has(key))buckets.set(key,{all:[],ready:[]});const bucket=buckets.get(key);bucket.all.push(p);
      const codes=pieceIssues(p);if(duplicateIds.has(p.id))codes.push('DUPLICATE_PIECE_ID');
      if(badSettings)codes.push(...settingsIssues(settings).map(w=>w.code));
      if(codes.length)reject(p,codes);else bucket.ready.push(p);
    }
    for(const [key,bucket] of [...buckets.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
      let best={sheets:[],unplaced:[],score:[0,0,0,0]};
      if(bucket.ready.length){
        best=null;
        for(const order of ['area','longest'])for(const stock of ['small','large'])for(const split of ['vertical','horizontal']){
          const trial=runPacking(bucket.ready,settings,{order,stock,split});
          if(!best||lexCompare(trial.score,best.score)<0)best=trial;
        }
      }
      for(const row of best.unplaced)reject(row.piece,[row.code]);
      const first=bucket.all[0],groupSheets=[];
      for(const s of best.sheets){
        const label=`F${String(sheets.length+1).padStart(3,'0')}`;
        s.id=label;s.label=label;s.groupKey=key;
        s.offcuts=s.free.map((r,i)=>({id:`${label}:offcut-${i+1}`,...r,areaIn2:r.widthIn*r.heightIn,factoryEdges:freeFactoryEdges(r,s)}));delete s.free;
        const byId=new Map(bucket.all.map(p=>[p.id,p]));
        s.usedBlankAreaIn2=sum(s.placements.map(p=>p.widthIn*p.heightIn));
        s.netPieceAreaIn2=sum(s.placements.map(p=>byId.get(p.pieceId).areaIn2));
        s.unassignedAreaIn2=s.widthIn*s.heightIn-s.netPieceAreaIn2;
        s.reusableRectangularAreaIn2=sum(s.offcuts.map(r=>r.areaIn2));
        s.reservedGapAndShapeRemainderIn2=s.unassignedAreaIn2-s.reusableRectangularAreaIn2;
        sheets.push(s);groupSheets.push(s.id);
      }
      const complete=!unplaced.some(p=>bucket.all.some(q=>q.id===p.pieceId))&&bucket.all.every(p=>p.dimensionsConfirmed!==false);
      groups.push({key,materialId:first.materialId,materialName:first.materialName||null,brand:first.brand||null,colorId:first.colorId||null,
        colorName:first.colorName||null,finish:first.finish||null,thicknessIn:first.thicknessIn??null,grain:first.grain,
        stockKeys:[...new Set(bucket.all.flatMap(p=>p.stockKeys||[]))],pieceIds:bucket.all.map(p=>p.id),sheetIds:groupSheets,
        complete,knownSheetCount:groupSheets.length,sheetCount:complete?groupSheets.length:null,
        messages:[...new Set([...bucket.all.flatMap(p=>p.reasonCodes||[]).map(c=>MESSAGES[c]||c),
          ...unplaced.filter(p=>bucket.all.some(q=>q.id===p.pieceId)).flatMap(p=>p.messages)]),
          ...(bucket.all.some(p=>p.dimensionsConfirmed===false)?[MESSAGES.STOCK_DIMENSIONS_UNCONFIRMED]:[])]});
    }
    return {settings,pieces,sheets,groups,unplaced,warnings,complete:!badSettings&&!unplaced.length&&groups.every(g=>g.complete),optimality:'not_proven'};
  }
  function validatePlan(plan={}) {
    const errors=[],settings=settingsOf(plan.settings),byId=new Map((plan.pieces||[]).map(p=>[p.id,p])),placed=new Set();
    const err=(code,message,details={})=>errors.push({code,message,...details});
    for(const w of settingsIssues(settings))err(w.code,w.message);
    if(byId.size!==(plan.pieces||[]).length)err('DUPLICATE_PIECE_ID',MESSAGES.DUPLICATE_PIECE_ID);
    for(const sheet of plan.sheets||[]){
      if(!STOCKS[sheet.stockKey]||!same(sheet.widthIn,STOCKS[sheet.stockKey]?.widthIn)||!same(sheet.heightIn,STOCKS[sheet.stockKey]?.heightIn)||!settings.allowedStockKeys.includes(sheet.stockKey))err('INVALID_SHEET','Format de feuille invalide.',{sheetId:sheet.id});
      for(const p of sheet.placements||[]){
        const piece=byId.get(p.pieceId),details={pieceId:p.pieceId,sheetId:sheet.id};
        if(!piece){err('UNKNOWN_PLACEMENT','Le placement ne correspond à aucune pièce.',details);continue;}
        if(placed.has(piece.id))err('DUPLICATE_PLACEMENT','La même pièce est placée plusieurs fois.',details);placed.add(piece.id);
        if(pieceIssues(piece).length)err('BLOCKED_PIECE_PLACED','Une pièce bloquée a été placée.',details);
        if(!legalRotations(piece).includes(p.rotationDeg))err('INVALID_ROTATION','Rotation contraire au grain ou au sens permis.',details);
        if(!piece.stockKeys?.includes(sheet.stockKey)||groupKey(piece)!==groupKey(sheet))err('MATERIAL_MIX','La feuille ne correspond pas au matériau, à sa teinte ou à son format.',details);
        const [w,h]=rotatedDimensions(piece,p.rotationDeg);
        if(![p.xIn,p.yIn,p.widthIn,p.heightIn].every(finite)||!same(w,p.widthIn)||!same(h,p.heightIn)||p.xIn<-EPS||p.yIn<-EPS||p.xIn+w>sheet.widthIn+EPS||p.yIn+h>sheet.heightIn+EPS)err('OUTSIDE_STOCK','Le brut dépasse la feuille ou ses cotes sont incohérentes.',details);
        let transformed;
        try{transformed=transformPiece(piece,p);}catch(_){err('INVALID_ROTATION','Rotation non prise en charge.',details);continue;}
        const factoryEdge=factoryEdgeOf(transformed.bottomEdgesSheetIn,sheet);
        // Re-derive the installed bottom from geometry, independent of cached metadata.
        const lower=bottomOf(piece.geometryIn),actual=transformPiece({...piece,bottomEdgesIn:lower.edges},p);
        if(piece.requireFactoryBottom&&(lower.code||!factoryEdgeOf(actual.bottomEdgesSheetIn,sheet)))err('FACTORY_BOTTOM_INVALID','Le bas après pose n’est pas un bord d’usine de la feuille.',details);
        if(p.factoryEdge!==factoryEdge)err('FACTORY_MARKER_INVALID','Le repère du bord d’usine est incorrect.',details);
        if(p.geometrySheetIn&&JSON.stringify(p.geometrySheetIn)!==JSON.stringify(transformed.geometrySheetIn))err('TRANSFORM_MISMATCH','Le contour imprimé ne correspond pas au placement calculé.',details);
        if(p.bottomEdgesSheetIn&&JSON.stringify(p.bottomEdgesSheetIn)!==JSON.stringify(actual.bottomEdgesSheetIn))err('BOTTOM_MARKER_MISMATCH','Le bas imprimé ne correspond pas au bas après pose.',details);
      }
      const placements=sheet.placements||[];
      for(let i=0;i<placements.length;i++)for(let j=i+1;j<placements.length;j++){
        const a=placements[i],b=placements[j],gap=settings.panelGapIn;
        const separate=a.xIn+a.widthIn+gap<=b.xIn+EPS||b.xIn+b.widthIn+gap<=a.xIn+EPS||
          a.yIn+a.heightIn+gap<=b.yIn+EPS||b.yIn+b.heightIn+gap<=a.yIn+EPS;
        if(!separate)err('PANEL_GAP_VIOLATION','Deux bruts n’ont pas l’espace minimal exigé entre eux.',{sheetId:sheet.id,pieceIds:[a.pieceId,b.pieceId]});
      }
    }
    const unplacedIds=new Set((plan.unplaced||[]).map(p=>p.pieceId));
    for(const piece of plan.pieces||[]){
      if(!placed.has(piece.id)&&!unplacedIds.has(piece.id))err('PIECE_UNACCOUNTED','Une pièce n’est ni placée ni déclarée bloquée.',{pieceId:piece.id});
      if(placed.has(piece.id)&&unplacedIds.has(piece.id))err('PIECE_STATUS_CONFLICT','Une pièce est à la fois placée et déclarée bloquée.',{pieceId:piece.id});
    }
    return {valid:errors.length===0,errors,placedPieceCount:placed.size};
  }
  function revisionOf(value) {
    let h=2166136261;const s=JSON.stringify(value);
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return `pc1-${(h>>>0).toString(16).padStart(8,'0')}`;
  }
  function buildPlan(input={}) {
    const extracted=extractPieces(input),packed=packPieces(extracted.pieces,extracted.settings);
    const plan={version:VERSION,...extracted,...packed,warnings:[...extracted.warnings,...packed.warnings],
      complete:packed.complete&&extracted.pendingSources.length===0,optimality:'not_proven',
      method:'deterministic_multistart_guillotine_rectangular_blanks',
      notes:['Débit heuristique : une meilleure disposition peut exister.',
        'Bruts rectangulaires réservés; les creux, trous et chutes inclinées ne sont pas réutilisés automatiquement.',
        'L’écart entre morceaux est distinct du trait de scie des moulures. Aucune marge extérieure systématique.',
        'Le bas d’usine désigne le bas après pose, y compris sous un sommet incliné. La rotation de débit ne change pas la pose.']};
    const seen=new Set();plan.warnings=plan.warnings.filter(w=>{const k=JSON.stringify([w.code,w.face,w.zoneId,w.pieceId,w.detail]);if(seen.has(k))return false;seen.add(k);return true;});
    plan.validation=validatePlan(plan);
    if(!plan.validation.valid){plan.complete=false;plan.warnings.push(issue('PACKING_INVALID',{},plan.validation.errors));}
    const placedPieceCount=sum(plan.sheets.map(s=>s.placements.length));
    const unknownGeometry=plan.pendingSources.some(s=>s.code!=='STOCK_DIMENSIONS_UNCONFIRMED');
    plan.summary={pieceCount:unknownGeometry?null:plan.pieces.length,knownPieceCount:plan.pieces.length,
      placedPieceCount,unplacedPieceCount:plan.unplaced.length,
      pendingSourceCount:plan.pendingSources.length,sheetCountKnown:plan.sheets.length,sheetCount:plan.complete?plan.sheets.length:null,
      purchasedAreaIn2:sum(plan.sheets.map(s=>s.widthIn*s.heightIn)),
      netPieceAreaIn2:unknownGeometry?null:sum(plan.pieces.map(p=>p.areaIn2)),knownNetPieceAreaIn2:sum(plan.pieces.map(p=>p.areaIn2)),
      placedNetPieceAreaIn2:sum(plan.sheets.map(s=>s.netPieceAreaIn2)),unassignedAreaIn2:sum(plan.sheets.map(s=>s.unassignedAreaIn2)),
      reusableRectangularAreaIn2:sum(plan.sheets.map(s=>s.reusableRectangularAreaIn2))};
    plan.revision=revisionOf({faces:plan.faces.map(f=>[f.key,f.name,f.feetPerPixel,f.zones,f.openings]),
      pieces:plan.pieces.map(p=>[p.id,p.label,p.geometryPx,p.geometryIn,p.materialId,p.colorId,p.grain,p.requireFactoryBottom,p.stockKeys]),
      settings:plan.settings,sheets:plan.sheets.map(s=>[s.id,s.stockKey,s.placements.map(p=>[p.pieceId,p.xIn,p.yIn,p.rotationDeg])]),pendingSources:plan.pendingSources});
    return plan;
  }
  return Object.freeze({version:VERSION,MIN_GAP_IN,STOCKS,DEFAULT_SETTINGS,getMaterialOptions,extractPieces,packPieces,validatePlan,buildPlan,transformPiece});
});
