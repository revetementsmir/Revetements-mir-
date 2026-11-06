/* MIR — Miniature 3D liée au tracé Admin. Même géométrie, rendu technique
 * autonome, sans second modèle, mutation, stockage ni développé de tôle. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRLiveProfile3D=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const finite=Number.isFinite;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
 const n=x=>Number.isFinite(x)?String(Math.round(x*1000)/1000):'0';
 const SAMPLE_MM=254; // Échantillon visuel de 10 po, pas la longueur vendue.
 function isPoint(p){return Array.isArray(p)&&p.length>=2&&finite(p[0])&&finite(p[1]);}
 function segments(model,points,engine){
   if(points.length<2)return [];
   if(engine?.profileSectionPath&&points===model?.pointsMM){
    try{
      const outline=engine.profileSectionPath(points.map(([x,y])=>[x,-y]),model.bends||[],1.35);
      if(Array.isArray(outline?.segments)&&outline.segments.length){
        const rounded=outline.segments.filter(row=>Array.isArray(row)&&row.length===2&&row.every(isPoint))
          .map(row=>row.map(([x,y])=>[x,-y]));
        if(rounded.length)return rounded;
      }
    }catch{} // Pendant le tracé, certains plis ne sont pas encore définis.
   }
   return points.slice(1).map((p,i)=>[points[i],p]).filter(([a,b])=>Math.hypot(a[0]-b[0],a[1]-b[1])>.01);
 }
 function render(model,options={}){
   const pts=Array.isArray(options.pointsMM)?options.pointsMM:model?.pointsMM||[];
   const points=pts.filter(isPoint);
   const yaw=limit(finite(options.yaw)?options.yaw:-42,-165,165)*Math.PI/180;
   const pitch=limit(finite(options.pitch)?options.pitch:24,-65,70)*Math.PI/180;
   const side=['left','right'].includes(options.side)?options.side:model?.coloredFace?.side;
   const finish=model?.spec?.finish||model?.finish||{};
   const hex=/^#[0-9a-f]{6}$/i.test(options.hex||finish.hex||'')?(options.hex||finish.hex):null;
   const metal=model?.spec?.material?.type||'';
   const label=esc(model?.name||'Moulure en préparation');
   if(points.length<2)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 250" role="img" aria-label="Miniature 3D en attente du premier côté" data-mir-live-3d="empty"><text x="180" y="124" text-anchor="middle" fill="#718070" font-family="Arial" font-size="14">Trace un premier côté</text></svg>';
   const edges=segments(model,points,options.engine).filter(([a,b])=>Math.hypot(a[0]-b[0],a[1]-b[1])>.01);
   if(!edges.length)return '';
   const depth=finite(options.lengthMM)&&options.lengthMM>0?Math.min(options.lengthMM,SAMPLE_MM):SAMPLE_MM;
   const project=([x,y],z)=>{
     const back=-x*Math.sin(yaw)+z*Math.cos(yaw);
     return [x*Math.cos(yaw)+z*Math.sin(yaw), y*Math.cos(pitch)-back*Math.sin(pitch)];
   };
   const eye=[-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch)];
   const panels=edges.map(([a,b],index)=>{
     const facing=(b[0]-a[0])*eye[1]-(b[1]-a[1])*eye[0];
     return {a,b,index,facing,face:facing>=0?'left':'right'};
   }).filter(v=>Math.abs(v.facing)>1e-7);
   const visible=panels.length?panels:edges.map(([a,b],index)=>({a,b,index,facing:1,face:'left'}));
   const projected=visible.map(item=>({
     ...item,
     quad:[project(item.a,0),project(item.b,0),project(item.b,depth),project(item.a,depth)]
   }));
   const all=projected.flatMap(item=>item.quad);
   const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
   const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
   const scale=Math.min(298/Math.max(1,maxX-minX),174/Math.max(1,maxY-minY));
   const cx=(maxX+minX)/2,cy=(maxY+minY)/2;
   const px=([x,y])=>(180+(x-cx)*scale);
   const py=([x,y])=>(120-(y-cy)*scale);
   const rows=projected.map((item,i)=>{
     const filled=!!side&&side===item.face;
     const shade=180+Math.round(Math.abs(item.facing)/(Math.hypot(item.b[0]-item.a[0],item.b[1]-item.a[1])||1)*35);
     const base='rgb('+shade+','+(shade+2)+','+(shade+5)+')';
     const fill=filled?(hex||'#8db7d2'):base;
     const verts=item.quad.map(p=>n(px(p))+','+n(py(p))).join(' ');
     return '<polygon points="'+verts+'" fill="'+fill+'" stroke="'+(filled?'#4a748b':'#7e8b89')+'" stroke-width="1.5" stroke-linejoin="round" data-face="'+(filled?'painted':'metal')+'" data-edge="'+i+'"/>';
   }).join('');
   const sideLabel=side==='left'?'gauche':side==='right'?'droite':'à sélectionner';
   return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 250" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Miniature 3D du profil '+label+'" data-mir-live-3d="ready" data-side="'+esc(side||'none')+'" data-metal="'+esc(metal)+'"><title>Miniature 3D : '+label+'</title><rect width="360" height="250" rx="10" fill="#f9fbf7"/><g>'+rows+'</g><text x="180" y="227" font-family="Arial,sans-serif" font-size="12" fill="#5c725d" text-anchor="middle">Échantillon 10 po · Face '+sideLabel+'</text></svg>';
 }
 return Object.freeze({SAMPLE_MM,render,version:'1.0.0'});
});
