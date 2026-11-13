/* MIR — Miniatures techniques : cadrage indépendant du grand canevas.
 * La projection est centrée et ajustée aux bounds de chaque profil/panneau.
 * Aucune image produit, texture de soffite, quadrillage ou cote inventée.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRMiniature=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const SIZE=120,PADDING=12;
 const finite=Number.isFinite;
 const number=value=>String(Math.round(value*1000)/1000);
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[char]));
 function project(points,{size=SIZE,padding=PADDING}={}){
  if(!Array.isArray(points)||points.length<2||
    points.some(p=>!Array.isArray(p)||p.length<2||!finite(p[0])||!finite(p[1])))return null;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const width=maxX-minX,height=maxY-minY;
  const usable=size-2*padding;
  if(usable<=0||!finite(width)||!finite(height)||width+height<=1e-8)return null;
  const scale=Math.min(usable/Math.max(width,1e-8),usable/Math.max(height,1e-8));
  const centerX=(maxX+minX)/2,centerY=(maxY+minY)/2;
  const mapped=points.map(([x,y])=>[size/2+(x-centerX)*scale,size/2-(y-centerY)*scale]);
  return {mapped,scale,bounds:{minX,maxX,minY,maxY,width,height},size,padding};
 }
 function render(model,engine,options={}){
  const size=options.size||SIZE,pad=options.padding??PADDING;
  const frame=project(model?.pointsMM,{size,padding:pad});
  const label=esc((model?.name||'Pièce')+' — aperçu centré de la forme');
  if(!frame)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}" data-mir-miniature="empty"><path d="M40 60H80" stroke="#9eafa1" stroke-width="2" stroke-linecap="square"/></svg>`;
  const points=frame.mapped,panel=model.kind==='panel';
  let content='';
  if(panel){
   const edges=points.map(p=>p.map(number).join(',')).join(' ');
   content=`<polygon points="${edges}" fill="#e0e8df" stroke="#526f5b" stroke-width="2.7" stroke-linejoin="miter"/>`;
  }else{
   const section=typeof engine?.profileSectionPath==='function'
    ?engine.profileSectionPath(points,model.bends||[],1.35)
    :null;
   const d=section?.path||'M'+points.map(p=>p.map(number).join(' ')).join(' L');
   content=`<path d="${esc(d)}" fill="none" stroke="#57715e" stroke-width="4" stroke-linejoin="miter" stroke-linecap="square"/><path d="${esc(d)}" fill="none" stroke="#c3d0c0" stroke-width="1.35" stroke-linejoin="miter" stroke-linecap="square"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}" data-mir-miniature="${panel?'panel':'profile'}"><title>${label}</title>${content}</svg>`;
 }
 return Object.freeze({version:'1.0.0',project,render,SIZE,PADDING});
});
