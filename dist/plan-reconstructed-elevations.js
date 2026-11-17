/* Orthographic elevations of the physical Studio scene. No source raster. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./plan-reconstructed-roofs.js'):root.MIRReconstructedRoofs,typeof module==='object'&&module.exports?require('./studio-exterior-model.js'):root.MIRStudioExterior,typeof module==='object'&&module.exports?require('./plan-scene-order.js'):root.MIRSceneOrder);if(typeof module==='object'&&module.exports)module.exports=api;else root.MIRReconstructedElevations=api;})(typeof window==='object'?window:globalThis,function(Roofs,Exterior,Order){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const frames={front:{u:[1,0],normal:[0,-1]},right:{u:[0,1],normal:[1,0]},back:{u:[-1,0],normal:[0,1]},left:{u:[0,-1],normal:[-1,0]}};
 const dot=(p,v)=>p[0]*v[0]+p[1]*v[1];
 function project(scene,direction='front'){
  const frame=frames[direction];if(!frame)throw Error('ELEVATION_DIRECTION');
  const walls=scene.walls.filter(w=>dot(w.normal,frame.normal)>.001).map(w=>({wall:w,left:dot(w.from,frame.u)*100,right:dot(w.to,frame.u)*100,top:-(w.base+w.height)*100,bottom:-w.base*100,depth:dot(w.from,frame.normal)})).sort((a,b)=>a.depth-b.depth||a.wall.id.localeCompare(b.wall.id));
  const roofFaces=(scene.roofs||[]).flatMap(r=>Roofs.faces(r,[0,0],{includeProposed:scene.includeProposed})),extraFaces=[...(scene.elements||[]).flatMap(e=>Exterior.elementFaces(e)),...(scene.corners||[]).flatMap(c=>Exterior.cornerFaces(c,scene.walls))],all=[...scene.walls.flatMap(w=>w.poly),...roofFaces.flatMap(f=>f.poly),...extraFaces.flatMap(f=>f.poly)].map(p=>[dot(p,frame.u)*100,-p[2]*100]);
  if(!all.length)return {direction,walls:[],viewBox:[0,0,100,100]};
  const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),pad=Math.max(20,(Math.max(...xs)-Math.min(...xs))*.04);
  return {direction,walls,extraFaces:extraFaces.filter(f=>dot(f.normal,frame.normal)>.001).map(f=>({...f,projected:f.poly.map(p=>[dot(p,frame.u)*100,-p[2]*100]),depth:f.poly.reduce((n,p)=>n+dot(p,frame.normal)/f.poly.length,0)})),roofFaces:roofFaces.filter(f=>dot(f.normal,frame.normal)>.001).map(f=>({...f,projected:f.poly.map(p=>[dot(p,frame.u)*100,-p[2]*100]),depth:f.poly.reduce((n,p)=>n+dot(p,frame.normal)/f.poly.length,0)})).sort((a,b)=>a.depth-b.depth),viewBox:[Math.min(...xs)-pad,Math.min(...ys)-pad,Math.max(...xs)-Math.min(...xs)+pad*2,Math.max(...ys)-Math.min(...ys)+pad*2]};
 }
 function svg(scene,{direction='front',textures={},selectedWallId=null,label='Reconstructed elevation',roofLabel='Toiture'}={}){
  const p=project(scene,direction);
  const body=p.walls.map(({wall:w,left,right,top,bottom,depth})=>{
   const texture=textures[w.id],scale=(right-left)/(w.length*100),height=bottom-top;
   // Catalogue surfaces are the exact atlases used by 3D, including insertions
   // and physical opening IDs. External PDF/image references are never read.
   const proposed=(scene.proposedOpenings||[]).filter(o=>o.wallId===w.id).map(o=>`<rect x="${o.offset*100}" y="${(w.height-o.sill-o.height)*100}" width="${o.width*100}" height="${o.height*100}" fill="#a6c0bc55" stroke="#aa752c" stroke-width="2" stroke-dasharray="6 4" data-proposed-opening="${esc(o.id)}" pointer-events="none"/>`).join('');
   const surface=texture?texture.replace('<svg ',`<svg width="${w.length*100}" height="${height}" `).replace(/data-wall-opening=/g,'data-level-opening=').replace(/data-wall-surface=/g,'data-level-surface='):'';
   const outline=w.poly.map(v=>[dot(v,frames[direction].u)*100,-v[2]*100]),clipId='wall-clip-'+encodeURIComponent(w.id),local=w.poly.map(v=>[((v[0]-w.from[0])*(w.to[0]-w.from[0])+(v[1]-w.from[1])*(w.to[1]-w.from[1]))/w.length*100,(w.base+w.height-v[2])*100]);
   return {depth,poly:w.poly,svg:`<g data-level-wall="${esc(w.id)}" data-level-id="${esc(w.levelId)}" tabindex="0" role="button" aria-label="${esc(label)}"><g transform="translate(${left} ${top}) scale(${scale} 1)"><defs><clipPath id="${clipId}"><polygon points="${local.map(p=>p.join(',')).join(' ')}"/></clipPath></defs><g clip-path="url(#${clipId})">${surface||`<rect width="${w.length*100}" height="${height}" fill="${esc(w.finish?.color||'#d7d8d0')}"/>`}${proposed}</g></g><polygon points="${outline.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${w.id===selectedWallId?'#348511':'#59645c'}" stroke-width="${w.id===selectedWallId?4:1}" pointer-events="none"/></g>`};
  });
  const roofs=(p.roofFaces||[]).map(f=>({depth:f.depth,poly:f.poly,svg:`<polygon data-reconstructed-roof="${esc(f.roofId)}" data-level-id="${esc(f.levelId)}" points="${f.projected.map(p=>p.join(',')).join(' ')}" fill="${esc(f.fillColor)}" stroke="#505850" stroke-width="1" tabindex="0" role="button" aria-label="${esc(roofLabel)}"/>`}));
  const extras=(p.extraFaces||[]).map(f=>({depth:f.depth,poly:f.poly,svg:`<polygon data-level-${f.cornerId?'corner':'element'}="${esc(f.cornerId||f.elementId)}" data-level-id="${esc(f.levelId)}" points="${f.projected.map(p=>p.join(',')).join(' ')}" fill="${esc(f.fillColor)}" stroke="#536357" stroke-width="1" tabindex="0" role="button" aria-label="${esc(f.cornerId?'Corner':f.role)}"/>`}));
  const frame=frames[direction],drawing=Order.order([...body,...roofs,...extras].sort((a,b)=>a.depth-b.depth),{project:p=>[dot(p,frame.u)*100,-p[2]*100],depth:p=>dot(p,frame.normal)}).map(item=>item.svg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${p.viewBox.join(' ')}" data-reconstructed-elevation="${direction}" data-source-raster="absent" role="group" aria-label="${esc(label)}">${drawing}</svg>`;
 }
 return Object.freeze({version:1,project,svg});
});
