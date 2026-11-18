/* Client-only opt-in for continuous painted faces in newly generated documents.
 * Stored specs, snapshots, prices and staff output are never rewritten. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRPliageDocuments=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 function createRenderer({production,surfaces}={}){
  if(typeof production?.profileSectionPath!=='function'||typeof surfaces?.surfacePaths!=='function'||typeof surfaces?.markerSVG!=='function')return undefined;
  return function profileSurfaceRenderer(model,mapped,section){
   if(model?.kind!=='profile'||!model.valid||!['left','right'].includes(model.coloredFace?.side)||!Array.isArray(mapped)||mapped.length<2)return '';
   const actualSection=section||production.profileSectionPath(mapped,model.bends||[]);
   const result=surfaces.surfacePaths(mapped,{offset:6,handedness:-1,section:actualSection,bends:model.bends||[],miterLimit:4});
   const annotation=surfaces.markerSVG(result,{side:model.coloredFace.side,strokeWidth:3});
   if(typeof annotation!=='string'||!annotation.trim())throw Error('La face peinte ne peut pas être représentée sur cette pièce.');
   return annotation;
  };
 }
 function isPublicClient(win){
  if(!win?.location)return false;
  try{if(win.parent&&win.parent!==win)return false;}catch{return false;}
  const params=new URLSearchParams(win.location.search||''),page=(win.location.pathname||'').split('/').pop();
  if(params.get('source')==='store'||params.has('embed')||params.has('admin')||params.get('mode')==='admin')return false;
  return page==='selection.html'||page==='pliage.html'||page==='production.html'&&params.get('mode')==='client';
 }
 function clientRenderer(win){
  if(!isPublicClient(win))return undefined;
  return createRenderer({production:win.MIRProduction,surfaces:win.MIRPliageSurfaces});
 }
 return Object.freeze({version:'1.0.0',createRenderer,isPublicClient,clientRenderer});
});
