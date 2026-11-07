/* MIR — tracé libre d'un panneau sans dimensions chantier supposées.
 * Les proportions du croquis sont distinctes des mesures de fabrication. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRPanelSketch=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const finite=Number.isFinite;
 function normalize(points){
  if(!Array.isArray(points)||points.length<3||points.length>64||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!finite(n))))return null;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  if(maxX-minX<4||maxY-minY<4)return null;
  return points.map(([x,y])=>[(x-minX)/(maxX-minX),(maxY-y)/(maxY-minY)]);
 }
 function orthogonal(last,point,enabled){
  if(!enabled||!last)return point.slice();
  return Math.abs(point[0]-last[0])>=Math.abs(point[1]-last[1])?[point[0],last[1]]:[last[0],point[1]];
 }
 function svg(points=[],cursor=null){
  const coords=cursor&&points.length?[...points,cursor]:points;
  const n=v=>String(Math.round(v*100)/100);
  let out='<svg viewBox="0 0 800 520" data-mir-panel-sketch="true" role="img" aria-label="Dessiner librement un panneau avant de saisir les cotes" style="touch-action:none">';
  out+='<defs><pattern id="mir-panel-sketch-grid" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d2dec9"/></pattern></defs><rect width="800" height="520" fill="#fafcf8"/><rect x="20" y="24" width="760" height="462" fill="url(#mir-panel-sketch-grid)"/>';
  if(coords.length>=3)out+='<polygon points="'+coords.map(p=>p.map(n).join(',')).join(' ')+'" fill="#cee3b9" fill-opacity=".6"/>';
  if(coords.length>=2)out+='<polyline points="'+coords.map(p=>p.map(n).join(',')).join(' ')+'" fill="none" stroke="#348511" stroke-width="3.5"/>';
  points.forEach((p,i)=>{out+='<circle cx="'+n(p[0])+'" cy="'+n(p[1])+'" r="6" fill="#348511" stroke="#fff" stroke-width="2"/><text x="'+n(p[0]+11)+'" y="'+n(p[1]-12)+'" fill="#294b30" font-size="16" font-weight="700">'+String.fromCharCode(65+i%26)+'</text>';});
  if(!points.length)out+='<text x="400" y="248" text-anchor="middle" font-size="23" fill="#365a37">Clique ou glisse pour tracer ton premier côté</text>';
  out+='<text x="400" y="508" text-anchor="middle" font-size="13" fill="#536d50">Maj = 90° · forme non cotée, mesures de fabrication à saisir après le tracé</text></svg>';
  return out;
 }
 return Object.freeze({normalize,orthogonal,svg,version:'1.0.0'});
});
