/* An orthographic view of the exact panel polygons. Dimensions remain physical. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRArchitecturalWallView=api;})(typeof window==='object'?window:null,function(root){
  'use strict';
  const Volume=root?.MIRProductionVolume||(typeof require==='function'?require('./production-volume.js'):null);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pointsAttr=ps=>ps.map(p=>p.slice(0,2).map(n=>Math.round(n*1000)/1000).join(',')).join(' ');
  const polygon=p=>p.polygonIn||[[p.xIn,p.yIn],[p.xIn+p.widthIn,p.yIn],[p.xIn+p.widthIn,p.yIn+p.heightIn],[p.xIn,p.yIn+p.heightIn]];
  function labelPoint(points){
    const ys=[...new Set(points.map(p=>p[1]))].sort((a,b)=>a-b),middle=(ys[0]+ys.at(-1))/2,candidates=[middle,...ys.slice(1).map((y,i)=>(y+ys[i])/2)];
    let best=null;
    for(const y of candidates){const xs=[];points.forEach((a,i)=>{const b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));});xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2){const score=(xs[i+1]-xs[i])/(1+Math.abs(y-middle)/Math.max(ys.at(-1)-ys[0],1));if(!best||score>best.score)best={score,point:[(xs[i]+xs[i+1])/2,y]};}}
    return best?.point||points[0];
  }
  function geometry(layout,{projectionIn=0,yaw=-24,pitch=12}={}){
    const C=Number.isFinite(projectionIn)&&projectionIn>=0?projectionIn:0;
    const cy=Math.cos(yaw*Math.PI/180),sy=Math.sin(yaw*Math.PI/180),cx=Math.cos(pitch*Math.PI/180),sx=Math.sin(pitch*Math.PI/180);
    const transform=([x,y,z=0])=>{x-=layout.widthIn/2;y=layout.heightIn/2-y;z-=C/2;const a=cy*x+sy*z,b=-sy*x+cy*z;return [a,-(cx*y-sx*b),sx*y+cx*b];};
    const faces=[],warnings=[];
    for(const p of layout.pieces){
      const poly=polygon(p),baseX=p.xIn,baseY=p.yIn;
      // Use the same lip/return mesh as the individual production panel when
      // its complete geometry is available. There is no separate shape fit.
      const mesh=Volume?.buildMesh({kind:'panel',shape:'polygon',pointsMM:poly.map(([x,y])=>[(x-baseX)*25.4,-(y-baseY)*25.4]),reliefMM:C*25.4,edges:poly.map((_,i)=>({id:String(i+1),lipMM:layout.lipIn*25.4}))});
      if(mesh?.valid){
        for(const f of mesh.faces){const raw=f.points.map(([x,y,z])=>[baseX+x/25.4,baseY-y/25.4,z/25.4]);faces.push({pieceId:p.id,kind:f.kind,raw,points:raw.map(transform)});}
      }else{
        warnings.push(p.id+' : '+(layout.lipIn>0?'lips et retours':'volume')+' à valider, contour à plat');
        // Keep a rejected lip inset visible as the exact flat cutting outline;
        // never fabricate a plausible but incorrect folded face.
        const raw=poly.map(([x,y])=>[x,y,0]);faces.push({pieceId:p.id,kind:'outline',raw,points:raw.map(transform)});
      }
    }
    faces.sort((a,b)=>a.points.reduce((s,p)=>s+p[2],0)/a.points.length-b.points.reduce((s,p)=>s+p[2],0)/b.points.length);
    return {faces,projectionIn:C,transform,warnings};
  }
  function render(layout,options={}){
    if(!layout?.ok)return {svg:'',warnings:[]};
    const scene=geometry(layout,options),W=1000,H=720,all=scene.faces.flatMap(f=>f.points);
    if(!all.length)return {svg:'',warnings:scene.warnings};
    const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));
    const scale=Math.min(780/Math.max(maxX-minX,1),490/Math.max(maxY-minY,1));
    const screen=p=>[W/2+(p[0]-(minX+maxX)/2)*scale,325+(p[1]-(minY+maxY)/2)*scale,p[2]];
    const project=p=>screen(scene.transform(p));
    const fmt=options.format||((n)=>String(Math.round(n*10000)/10000)+' po');
    let out='<rect width="1000" height="720" fill="#fafbf6"/>';
    out+='<text x="30" y="35" font-size="14" fill="#61705e">VOLUME DES PANNEAUX · MÊMES COTES QUE LE PLAN 2D</text>';
    for(const f of scene.faces){const active=f.pieceId===options.selectedId,color=active?(f.kind==='face'?'#527445':f.kind==='wall'?'#334f2b':'#718761'):(f.kind==='face'?'#4e5556':f.kind==='wall'?'#303739':f.kind==='outline'?'#899184':'#778078');out+='<polygon data-piece="'+esc(f.pieceId)+'" points="'+pointsAttr(f.points.map(screen))+'" fill="'+color+'" stroke="'+(active?'#e3efce':'#242d29')+'" stroke-width=".8" vector-effect="non-scaling-stroke"/>';}
    for(const p of layout.pieces){const face=scene.faces.find(f=>f.pieceId===p.id&&f.kind==='face')||scene.faces.find(f=>f.pieceId===p.id);if(!face)continue;const local=labelPoint(face.raw),center=project([local[0],local[1],face.raw[0][2]]);const fs=Math.max(9,Math.min(17,p.widthIn*scale/7));out+='<text x="'+center[0]+'" y="'+center[1]+'" font-size="'+fs+'" fill="white" text-anchor="middle" pointer-events="none" font-weight="700">'+esc(p.id)+'</text>';}
    function dimension(a,b,label,offsetX,offsetY){const p=project(a),q=project(b),x1=p[0]+offsetX,y1=p[1]+offsetY,x2=q[0]+offsetX,y2=q[1]+offsetY;return '<path d="M'+p[0]+' '+p[1]+'L'+x1+' '+y1+'L'+x2+' '+y2+'L'+q[0]+' '+q[1]+'" fill="none" stroke="#6c8460" stroke-width="1.2"/><text x="'+((x1+x2)/2)+'" y="'+((y1+y2)/2+18)+'" text-anchor="middle" font-size="15" fill="#355238" stroke="#fafbf6" stroke-width="5" paint-order="stroke">'+esc(label)+'</text>';}
    out+=dimension([0,layout.heightIn,0],[layout.widthIn,layout.heightIn,0],fmt(layout.widthIn)+' utile',0,30);
    out+=dimension([0,0,0],[0,layout.heightIn,0],fmt(layout.heightIn),-45,0);
    out+='<text x="500" y="675" text-anchor="middle" font-size="14" fill="#52634d">'+esc(Number.isFinite(options.projectionIn)?'Projection C saisie : '+fmt(options.projectionIn)+(scene.warnings.length?' · certains contours restent à plat':' · glissez pour tourner'):'Projection C à renseigner · contours affichés à plat')+'</text>';
    return {svg:out,warnings:[...new Set(scene.warnings)],scene,viewBox:'0 0 1000 720'};
  }
  return Object.freeze({version:'1.0.0',geometry,render,labelPoint});
});
