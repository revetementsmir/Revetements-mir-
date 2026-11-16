/* One staff snapshot: physical contour walls, existing MIR calculations, five site views. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./plan-level-model.js'):root.MIRLevelModel,typeof module==='object'&&module.exports?require('./takeoff-engine.js'):root.MIRTakeoff,typeof module==='object'&&module.exports?require('./material-coverage.js'):root.MIRMaterialCoverage,typeof module==='object'&&module.exports?require('./studio-surfaces.js'):root.MIRStudioSurfaces);if(typeof module==='object'&&module.exports)module.exports=api;else root.MIRStudioCotation=api;})(typeof window==='object'?window:globalThis,function(M,E,C,Surfaces){
 'use strict';const FT=1/.3048,keys=['front','right','back','left','soffits'],names={front:'Avant',right:'Droite',back:'Arrière',left:'Gauche',soffits:'Soffites'},rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])),n=x=>Number.isFinite(x)?Number(x.toFixed(2)):'?',copy=x=>x==null?null:M.clone(x);
 function direction(w){return Math.abs(w.normal[0])>Math.abs(w.normal[1])?(w.normal[0]>0?'right':'left'):(w.normal[1]>0?'back':'front');}
 function inputFor(inventory,buildingId,materials=[],settings={}){
  const scene=M.scene(inventory,buildingId),levels=inventory.levels.filter(l=>l.buildingId===buildingId),windows=[],panels=[],boards=[],segments=[],soffits=[],missing=[];
  if(scene.quantities.issues.length)throw Error('Rattachez et vérifiez les ouvertures de chaque mur avant la cotation.');
  const faces=scene.walls.map(w=>{const level=levels.find(l=>l.id===w.levelId),choice=w.finish||{},product=materials.find(m=>m.id===choice.materialId),width=w.length*FT,height=w.height*FT,rootId=w.id+':finish';
   const face=Surfaces.faceFor(w,level,materials);face.name=(level.name||level.sourceLevel||level.id)+' · '+names[direction(w)];const zones=face.zones;
   if(!level.openingsReviewed)missing.push({code:'OPENINGS_PENDING',wallId:w.id});if(!product)missing.push({code:'MATERIAL_PENDING',wallId:w.id});else if(product.status==='visualization_only')missing.push({code:'MATERIAL_PREVIEW_ONLY',wallId:w.id});if(!choice.colorId)missing.push({code:'FINISH_PENDING',wallId:w.id});
   for(const o of scene.openings.filter(o=>o.wallId===w.id&&(o.type||'window')==='window'))windows.push({id:o.id,openingId:o.id,face:w.id,widthIn:o.width/.0254,heightIn:o.height/.0254,ventedSill:typeof o.ventedSill==='boolean'?o.ventedSill:null,...copy(o.trim||{}),sourceId:o.sourceId});
   for(const z of zones){const material=materials.find(m=>m.id===z.selection?.materialId),spec=C.coverageSpec(material||{},z.selection||{});if(Surfaces.isBatten(material))missing.push({code:'BATTEN_CUT_DETAIL_PENDING',id:z.id});
    if(spec.type==='panel'){
     const {layout}=Surfaces.layoutFor(face,z,material,level);
     panels.push({id:z.id,face:w.id,zoneId:z.id,...copy(z.selection),layout,maxWidthIn:spec.widthIn,maxLengthIn:spec.lengthIn,stockKnown:!!(spec.widthIn&&spec.lengthIn),rotationAllowed:false});
    }
    if(spec.type==='board'){if(material?.maxPiece?.lengthIn>0)boards.push({id:z.id,face:w.id,zoneId:z.id,...copy(z.selection),maximumIn:material.maxPiece.lengthIn});else missing.push({code:'BOARD_STOCK_PENDING',id:z.id});}
   }
   for(const s of level.wallSegments||[])if(s.wallId===w.id){if(s.status==='confirmed')segments.push({...copy(s),face:w.id,points:s.points?.map(p=>p.map(v=>v*FT)),feetPerPixel:1});else missing.push({code:'DETAIL_PENDING',id:s.id});}
   return face;
  });
  for(const level of levels)for(const s of level.soffits||[]){if(s.status!=='confirmed'||!Number.isFinite(s.height))missing.push({code:'SOFFIT_PENDING',id:s.id});else soffits.push({...copy(s),fasciaLengthFt:Number.isFinite(s.length)?s.length*FT:null,depthIn:Number.isFinite(s.depth)?s.depth/.0254:null,edges:s.edges?.map(e=>({...e,lengthFt:Number.isFinite(e.length)?e.length*FT:null}))});for(const [i,e]of (s.edges||[]).entries())if(s.status==='confirmed'&&Number.isFinite(s.height)&&e.type==='fascia')segments.push({id:s.id+':fascia:'+i,kind:'fascia',lengthFt:Number.isFinite(e.length)?e.length*FT:null,color:s.color||null,materialId:s.fasciaMaterialId||null});}
  for(const level of levels){if(!level.soffitsReviewed)missing.push({code:'SOFFIT_SURVEY_PENDING',levelId:level.id});if(Object.keys(level.cornerFinishes||{}).length||(level.exteriorElements||[]).some(e=>['beam','column'].includes(e.type)))missing.push({code:'WRAP_PROFILE_PENDING',levelId:level.id});}
  const input={faces,windows,segments,soffits,panels,boards,settings:copy(settings)},result=E.calculate(input);
  // No new margin and no legacy elevation sum. A known amount is not a complete order.
  return {input,result,scene,missing,soffitAreaFt2:levels.length&&levels.every(l=>l.soffitsReviewed===true)&&!missing.some(m=>m.code==='SOFFIT_PENDING')?result.soffitAreaFt2:null,partial:scene.partial||missing.length>0||!result.complete,scope:'physical-wall-ids; replaces related elevation takeoff',areaUnit:'ft2',settingsSource:'existing MIR takeoff settings'};
 }
 function snapshot({inventory,buildingId,projectId,projectName,materials=[],settings={},revision=1,date=new Date().toISOString(),notes='',validated=false}){
  const building=inventory.buildings.find(b=>b.id===buildingId);if(!building)throw Error('Choisissez le bâtiment.');if(!Number.isInteger(revision)||revision<1)throw Error('Révision invalide.');
  const calculation=inputFor(inventory,buildingId,materials,settings),levels=inventory.levels.filter(l=>l.buildingId===buildingId);
  const reservations=[...new Set([...(calculation.partial?['Quantités partielles : mesures, ouvertures, matériaux ou détails à confirmer.']:[]),...(!levels.every(l=>l.soffitsReviewed===true)?['Relevé des soffites incomplet.']:[]),...(!calculation.scene.walls.length?['Aucun contour avec hauteur établi.']:[]),'Le contour ne reconstitue pas automatiquement la toiture.'])];
  if(validated&&reservations.some(r=>!r.startsWith('Le contour')))throw Error('Le dossier incomplet reste un brouillon.');
  return {schema:'mir-studio-site-1',version:1,projectId,projectName,buildingId,buildingName:building.name||buildingId,revision,date,notes:String(notes),status:validated?'validated':'draft',reservations,
   geometryRevision:levels.map(l=>({levelId:l.id,revision:l.geometryRevision||0})),walls:copy(calculation.scene.walls).map(w=>({...w,levelName:levels.find(l=>l.id===w.levelId)?.name||levels.find(l=>l.id===w.levelId)?.sourceLevel||w.levelId})),openings:copy(calculation.scene.openings),
   soffits:levels.flatMap(l=>(l.soffits||[]).map(s=>({...copy(s),levelId:l.id,levelName:l.name||l.sourceLevel||l.id}))),quantities:{rows:copy(calculation.scene.quantities.rows),partial:calculation.partial,knownNetFt2:calculation.scene.quantities.knownNetM2==null?null:calculation.scene.quantities.knownNetM2*FT*FT,materials:copy(calculation.result.areas.materialTotals),linearTotals:copy(calculation.result.linearTotals),soffitAreaFt2:calculation.soffitAreaFt2},
   sources:inventory.views.filter(v=>v.buildingId===buildingId).map(v=>({id:v.id,fileId:v.fileId,page:v.page,zone:copy(v.zone),orientation:v.orientation,kind:v.kind,direction:v.direction,levelId:v.levelId,frame:copy(v.frame),calibration:copy(v.calibration)})),
   rules:{engineVersion:calculation.result.version,settings:copy(settings)},viewOrder:keys.slice()};
 }
 function locator(walls,selected,x,y,width=130,height=90){if(!walls.length)return '';const xs=walls.flatMap(w=>[w.from[0],w.to[0]]),ys=walls.flatMap(w=>[w.from[1],w.to[1]]),a=Math.min(...xs),b=Math.min(...ys),s=Math.min((width-8)/Math.max(.01,Math.max(...xs)-a),(height-8)/Math.max(.01,Math.max(...ys)-b));return `<g transform="translate(${x} ${y})">`+walls.map((w,i)=>`<path d="M ${4+(w.from[0]-a)*s} ${height-4-(w.from[1]-b)*s} L ${4+(w.to[0]-a)*s} ${height-4-(w.to[1]-b)*s}" stroke="${w.id===selected?'#348511':'#a5aea0'}" stroke-width="${w.id===selected?4:1}" fill="none"/>`).join('')+'</g>';}
 function soffitLocator(snap,selected,x,y){const points=[...snap.walls.flatMap(w=>[w.from,w.to]),...snap.soffits.flatMap(s=>s.polygon||[])];if(!points.length)return '';const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),a=Math.min(...xs),b=Math.min(...ys),scale=Math.min(250/Math.max(.01,Math.max(...xs)-a),130/Math.max(.01,Math.max(...ys)-b)),at=p=>[x+(p[0]-a)*scale,y+130-(p[1]-b)*scale];return snap.walls.map(w=>`<path d="M ${at(w.from).join(' ')} L ${at(w.to).join(' ')}" stroke="#a5aea0" fill="none"/>`).join('')+snap.soffits.filter(s=>s.polygon?.length>=3).map(s=>`<polygon points="${s.polygon.map(p=>at(p).join(',')).join(' ')}" fill="${s.id===selected?'#34851166':'none'}" stroke="${s.id===selected?'#348511':'#bcc9b7'}" stroke-width="${s.id===selected?3:1}"/>`).join('');}
 function fiveViews(snap,inventory){
  if(snap.schema!=='mir-studio-site-1')throw Error('Cotation invalide.');
  const width=1190.55;
  return keys.map((key,page)=>{
   const walls=snap.walls.filter(w=>direction(w)===key),views=inventory.views.filter(v=>v.buildingId===snap.buildingId&&v.kind==='elevation'&&v.direction===key),sourceHeight=key==='soffits'?0:270;
   const rows=key==='soffits'?Math.max(1,snap.soffits.length):Math.max(1,Math.ceil(walls.length/2)),needed=220+sourceHeight+rows*(key==='soffits'?220:200)+snap.reservations.length*17+Math.ceil(snap.notes.length/110)*17;
   const height=[841.89,1683.78,2383.94,3370.39].find(h=>h>=needed);if(!height)throw Error('Trop de détails pour cinq feuilles lisibles. Réduisez le périmètre au bâtiment choisi.');
   const text=(x,y,value,size=12,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="#183c31" ${extra}>${esc(value)}</text>`;
   let body=text(35,40,'MIR · '+snap.projectName+' · '+snap.buildingName,18)+text(35,65,names[key]+' · Révision '+snap.revision+' · '+snap.date.slice(0,10)+' · '+(snap.status==='validated'?'VALIDÉ':'BROUILLON'),15)+text(width-80,40,(page+1)+' / 5',12);
   body+=text(35,87,'Cotes en pieds · surfaces en pi² · ne pas mesurer sur l’impression.',11);
   if(key!=='soffits'){
    if(views.length){const cell=(width-70)/views.length;for(const [i,v]of views.entries()){const w=v.payload.sourceWidth||v.zone?.[2]||1000,h=v.payload.sourceHeight||v.zone?.[3]||800;body+=`<image x="${35+i*cell}" y="105" width="${cell-15}" height="230" preserveAspectRatio="xMidYMid meet" href="${esc(v.payload.sourceImage||'')}"/>`+text(35+i*cell,350,'Vue source · p. '+v.page,10);}}
    else body+=text(35,160,'Élévation non fournie ou non associée : cette vue reste incomplète.',14);
    body+=text(35,390,'Pans de mur — même identité et emplacement qu’en 2D / 360°. Murs masqués inclus.',13);
    walls.forEach((w,i)=>{const x=35+i%2*560,y=420+Math.floor(i/2)*200,s=Math.min(350/w.length,105/w.height);body+=`<g data-wall-id="${esc(w.id)}"><rect x="${x}" y="${y}" width="${w.length*s}" height="${w.height*s}" fill="${esc(/^#[0-9a-f]{6}$/i.test(w.finish?.color||'')?w.finish.color:'#edf1e9')}" stroke="#536357"/>`;
     for(const o of snap.openings.filter(o=>o.wallId===w.id))body+=`<rect x="${x+o.offset*s}" y="${y+(w.height-o.sill-o.height)*s}" width="${o.width*s}" height="${o.height*s}" fill="#fff" stroke="#536357"/>`;
     body+=text(x,y+125,'Mur '+(snap.walls.findIndex(a=>a.id===w.id)+1)+' · '+n(w.length*FT)+' × '+n(w.height*FT)+' pi · '+n(w.length*w.height*FT*FT)+' pi² brut')+text(x,y+142,String(w.levelName||w.levelId),11)+text(x,y+158,(w.finish?.materialId||'Revêtement à confirmer')+' · '+(w.finish?.colorName||'Fini à confirmer'),11)+locator(snap.walls,w.id,x+370,y,150,100)+'</g>';
    });if(!walls.length)body+=text(35,450,'Aucun mur établi pour cette direction.');
   }else{
    body+=text(35,120,'Vue aérienne : sections séparées par niveau / hauteur, même emplacement repéré.',13);
    if(!snap.soffits.length)body+=text(35,175,'Aucune section de soffite confirmée. Dimensions, contours et hauteurs à relever.',14);
    snap.soffits.forEach((s,i)=>{const y=160+i*220,polygon=s.polygon||[],xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),a=Math.min(...xs),b=Math.min(...ys),scale=Math.min(600/Math.max(.01,Math.max(...xs)-a),130/Math.max(.01,Math.max(...ys)-b));if(polygon.length>=3)body+=`<polygon points="${polygon.map(p=>[35+(p[0]-a)*scale,y+(p[1]-b)*scale].join(',')).join(' ')}" fill="${esc(/^#[0-9a-f]{6}$/i.test(s.color||'')?s.color:'#d1e4bf')}" stroke="#536357"/>`;body+=soffitLocator(snap,s.id,850,y)+text(35,y+150,'S'+(i+1)+' · '+s.levelName+' · hauteur '+n(s.height*FT)+' pi · '+n(s.length*FT)+' × '+n(s.depth*FT)+' pi · '+(s.status==='confirmed'?n(s.length*s.depth*FT*FT):'?')+' pi²',12)+text(35,y+170,s.status==='confirmed'?'Section confirmée':'Section à confirmer',11);});
   }
   let footer=height-65-snap.reservations.length*17-Math.ceil(snap.notes.length/110)*17;for(const note of snap.reservations){body+=text(35,footer,note,11);footer+=17;}
   for(let i=0;i<snap.notes.length;i+=110){body+=text(35,footer,snap.notes.slice(i,i+110),11);footer+=17;}
   body+=text(35,height-25,'Dossier chantier · cotes et réserves du projet · aucun coût interne.',10);
   return {key,name:names[key],layout:'mir-site-five',paper:{width,height},svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="white"/>${body}</svg>`};
  });
 }
 return Object.freeze({version:1,keys,direction,inputFor,snapshot,fiveViews,locator});
});
