/* MIR - supplier panels: one panel, one drawing, one fabrication sheet.
 * Visual repérage is indicative, all production dimensions come from the exact model.
 * No network, no transmission and no invented developed sheet dimensions. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRPanelPOPDF=api;
})(typeof window==='object'?window:null,function(root){
  'use strict';
  // Localize PDF labels only when the active page is a customer route.
  const clientEN=()=>root?.MIRClientLocale?.isClient?.(root.location?.pathname,root.location?.search)===true&&root.MIRClientLocale?.getLocale?.()==='en-CA';
  const t=(fr,en)=>clientEN()?en:fr;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const num=value=>Number.isFinite(value)?Number(value.toFixed(2)).toLocaleString(clientEN()?'en-CA':'fr-CA'):'?';
  const txt=(x,y,value,size=21,extra='')=>'<text x="'+x+'" y="'+y+'" font-family="Arial,Helvetica,sans-serif" font-size="'+size+'"'+(/(?:^|\s)fill\s*=/.test(extra)?'':' fill="#242522"')+' '+extra+'>'+esc(value)+'</text>';
  const rect=(x,y,w,h,fill='#fff',stroke='#d8cdbc',radius=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+radius+'" fill="'+fill+'" stroke="'+stroke+'"/>';
  const line=(x,y,x2,y2,color='#d8cdbc',sw=2)=>'<path d="M '+x+' '+y+' L '+x2+' '+y2+'" fill="none" stroke="'+color+'" stroke-width="'+sw+'"/>';
  const svg=body=>'<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000"><rect width="1400" height="1000" fill="white"/>'+body+'</svg>';
  const fmt=(model,mm,api)=>api.formatMeasurement(mm,model.unit);
  const volumeAPI=root?.MIRProductionVolume||
    (typeof module==='object'&&module.exports?require('./production-volume.js'):null);
  const row=v=>String(v||'').trim();
  const max=(str,n)=>String(str??'').slice(0,n);
  function sectionHeading(title,kicker){
    return rect(0,0,1400,15,'#bda889','#bda889')+
      txt(62,73,'MIR',41,'font-weight="800" fill="#242522"')+
      txt(185,72,title,30,'font-weight="700"')+
      txt(1338,69,kicker,16,'text-anchor="end" fill="#625e55"')+
      line(60,103,1340,103,'#d8cdbc',2);
  }
  let measureContext;
  function propertyRows(value,width=230){
    const source=String(value||t('À confirmer','To confirm')),rows=[];let current='';
    if(root?.document)measureContext ||= root.document.createElement('canvas').getContext('2d');
    if(measureContext)measureContext.font='600 20px Arial';
    const measure=v=>measureContext?measureContext.measureText(v).width:[...v].reduce((sum,c)=>sum+(/[MW@%]/.test(c)?.9:/[ilI1 .,;:!|]/.test(c)?.28:/[A-Z0-9]/.test(c)?.65:.5)*20,0);
    for(let word of source.split(/\s+/)){
      while(measure(word)>width){if(current){rows.push(current);current='';}let end=word.length;while(end>1&&measure(word.slice(0,end))>width)end--;rows.push(word.slice(0,end));word=word.slice(end);}
      if(!word)continue;
      if(current&&measure(current+' '+word)>width){rows.push(current);current=word;}else current+=(current?' ':'')+word;
    }
    if(current)rows.push(current);return rows;
  }
  function property(x,y,label,value,width=230){
    const all=propertyRows(value,width-12),shown=all.slice(0,2);if(all.length>2)shown[1]+='…';
    return txt(x,y,label,15,'fill="#625e55" font-weight="700"')+shown.map((line,i)=>txt(x,y+27+i*24,line,20,'font-weight="600"')).join('');
  }
  function fullProperty(label,value,width=230){return propertyRows(value,width-12).length>2?[label+' : '+value]:[];}
  function footer(y='955'){
    return line(62,918,1338,918,'#d8cdbc',2)+
      txt(62,948,t('COTES FINIES • CROQUIS NON À L’ÉCHELLE • VALIDATION ATELIER OBLIGATOIRE','FINISHED DIMENSIONS • NOT TO SCALE • WORKSHOP APPROVAL REQUIRED'),15,'fill="#625e55"')+
      txt(1338,948,t('AUCUN ENVOI AUTOMATIQUE','NO AUTOMATIC SUBMISSION'),15,'text-anchor="end" fill="#625e55"');
  }
  // A = largeur hors tout, B = hauteur hors tout.
  // Les anciens ronds 1-2-3-4 représentent les côtés du contour, pas des
  // dimensions. Le bon fournisseur affiche à leur place le nom de chaque
  // côté, sans créer une pièce ni un développé supplémentaire.
  function geometry(model,box,attribute='data-mir-panel-main',api=null){
    const points=model.pointsMM||[];
    if(points.length<3)return '';
    const full=attribute==='data-mir-panel-main';
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const bounds={left:Math.min(...xs),right:Math.max(...xs),bottom:Math.min(...ys),top:Math.max(...ys)};
    const w=Math.max(1,bounds.right-bounds.left),h=Math.max(1,bounds.top-bounds.bottom);
    // Dedicated space around the actual geometry for dimension arrows and
    // readable lips; never shrink the true A/B measurements.
    const margins=full?{left:113,right:168,top:68,bottom:145}:{left:5,right:5,top:5,bottom:5};
    const maxW=Math.max(40,box.w-margins.left-margins.right);
    const maxH=Math.max(40,box.h-margins.top-margins.bottom);
    const scale=Math.min(maxW/w,maxH/h);
    const ox=box.x+margins.left+(maxW-w*scale)/2;
    const oy=box.y+margins.top+(maxH-h*scale)/2;
    const project=p=>[ox+(p[0]-bounds.left)*scale,oy+(bounds.top-p[1])*scale];
    const drawn=points.map(project);
    const shapePath=ps=>ps.map((p,i)=>(i?'L ':'M ')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ')+' Z';
    const d=shapePath(drawn);
    let out='<path '+attribute+'="'+esc(model.id||model.name)+'" d="'+d+'" fill="'+(model.finish?.hex||'#e9e2d6')+'" fill-opacity="0.55" stroke="#242522" stroke-width="'+(full?3.8:2.3)+'"/>';
    if(!full)return out;
    const lipTotal=model.edges.reduce((s,e)=>s+(e.lipMM||0),0);
    const mesh=volumeAPI?.buildMesh?.(model);
    if(lipTotal>0 && (!mesh?.valid||!mesh.front?.length)){
      throw Error(t('Impossible de tracer les lèvres réelles du panneau. Corrigez les cotes et les lèvres avant le PDF.','Cannot draw actual panel lips. Correct dimensions and lips before exporting the PDF.'));
    }
    // Only the true inward face from MIR's existing 3D geometry kernel.
    // No fictitious rectangle or approximate offset around sloped sides.
    if(mesh?.valid && lipTotal>0){
      const inner=mesh.front.map(project);
      out+='<path data-mir-lip-inner="true" d="'+shapePath(inner)+'" fill="#fff" fill-opacity="0.73" stroke="#bda889" stroke-width="2.5"/>';
    }
    const sign=Math.sign(points.reduce((s,p,i)=>s+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0))||1;
    const xL=Math.min(...drawn.map(p=>p[0])),xR=Math.max(...drawn.map(p=>p[0]));
    const yT=Math.min(...drawn.map(p=>p[1])),yB=Math.max(...drawn.map(p=>p[1]));
    const dimY=yB+66,dimX=xR+123;
    // True outer-envelope dimensions, not the lip-free face.
    out+=line(xL,yB+6,xL,dimY+8,'#607b65',1.5)+line(xR,yB+6,xR,dimY+8,'#607b65',1.5);
    out+=line(xL,dimY,xR,dimY,'#242522',2.1);
    out+='<path d="M '+(xL+2)+' '+dimY+' l 12,-6 v 12 z M '+(xR-2)+' '+dimY+' l -12,-6 v 12 z" fill="#242522"/>';
    out+=txt((xL+xR)/2,dimY+27,t('A · largeur hors tout','A · overall width'),17,'text-anchor="middle" font-weight="700" data-mir-dimension-a="true"');
    out+=line(xR+6,yT,dimX+8,yT,'#607b65',1.5)+line(xR+6,yB,dimX+8,yB,'#607b65',1.5);
    out+=line(dimX,yT,dimX,yB,'#242522',2.1);
    out+='<path d="M '+dimX+' '+(yT+2)+' l -6,12 h 12 z M '+dimX+' '+(yB-2)+' l -6,-12 h 12 z" fill="#242522"/>';
    const B=t('B · hauteur hors tout','B · overall height');
    out+=txt(dimX+33,(yT+yB)/2,B,17,'text-anchor="middle" font-weight="700" data-mir-dimension-b="true" transform="rotate(-90 '+(dimX+33)+' '+((yT+yB)/2)+')"');
    // Étiquettes courtes pour le chantier : uniquement le nom du côté.
    // Les valeurs de lips restent dans le tableau détaillé du bon et la vraie
    // géométrie du contour intérieur est visible sur le croquis.
    const usedLabels=[];
    const overlaps=(r,q,gap=5)=>
      r.x<q.x+q.w+gap && r.x+r.w+gap>q.x &&
      r.y<q.y+q.h+gap && r.y+r.h+gap>q.y;
    const labelBounds={x:box.x+4,y:box.y+4,w:box.w-8,h:box.h-94};
    const outsidePanel=r=>
      r.x+r.w<xL-6 || r.x>xR+6 || r.y+r.h<yT-6 || r.y>yB+6;
    const fits=r=>
      r.x>=labelBounds.x && r.y>=labelBounds.y &&
      r.x+r.w<=labelBounds.x+labelBounds.w &&
      r.y+r.h<=labelBounds.y+labelBounds.h &&
      outsidePanel(r) && usedLabels.every(q=>!overlaps(r,q));
    // Les dimensions A/B occupent des couloirs réservés à droite et en bas.
    // On n'y place jamais de texte de côté.
    const corridors={right:xR+123,bottom:yB+66};
    for(let i=0;i<drawn.length;i++){
      const a=drawn[i],b=drawn[(i+1)%drawn.length],edge=model.edges?.[i];
      if(!edge)continue;
      const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
      const nx=-sign*dy/len,ny=sign*dx/len;
      const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
      const label=String(edge.name||t('Côté','Side'));
      const font=label.length>13?11:label.length>8?12:14;
      const labelW=Math.min(108,Math.max(57,label.length*font*.57+19));
      const labelH=26;
      const side=Math.abs(nx)>=Math.abs(ny)?(nx<0?'left':'right'):(ny<0?'top':'bottom');
      const offset=15;
      const pointAt=(direction,k)=>{
        const shift=k%2===0?(k/2)*33:-(Math.ceil(k/2))*33;
        let cx,cy;
        if(direction==='left'||direction==='right'){
          cx=direction==='left'?xL-labelW/2-offset:xR+labelW/2+offset;
          cy=my+shift;
        }else{
          cy=direction==='top'?yT-labelH/2-offset:yB+labelH/2+offset;
          cx=mx+shift*2;
        }
        return {x:cx-labelW/2,y:cy-labelH/2,w:labelW,h:labelH};
      };
      const directions=[side,...['left','right','top','bottom'].filter(d=>d!==side)];
      let position=null;
      for(const direction of directions){
        for(let k=0;k<18;k++){
          const candidate=pointAt(direction,k);
          // Label blocks cannot cover the A/B dimension leaders.
          if(candidate.x+candidate.w>=corridors.right-9 && candidate.x<=corridors.right+9 &&
             candidate.y<yB+3 && candidate.y+candidate.h>yT-3)continue;
          if(candidate.y+candidate.h>=corridors.bottom-8 && candidate.y<=corridors.bottom+8 &&
             candidate.x<xR+3 && candidate.x+candidate.w>xL-3)continue;
          if(fits(candidate)){position=candidate;break;}
        }
        if(position)break;
      }
      if(position){
        usedLabels.push(position);
        const lx=position.x+position.w/2,ly=position.y+position.h/2;
        // La ligne guide s'arrête AU BORD de l'étiquette, jamais dans son texte.
        const ux=lx-mx,uy=ly-my;
        const tx=ux===0?Infinity:(position.w/2)/Math.abs(ux);
        const ty=uy===0?Infinity:(position.h/2)/Math.abs(uy);
        const factor=Math.min(tx,ty,1);
        const endX=lx-ux*factor,endY=ly-uy*factor;
        out+=line(mx,my,endX,endY,'#92ae98',1.25);
        out+='<rect data-mir-side-label-box="'+esc(edge.id)+'" x="'+position.x.toFixed(2)+'" y="'+position.y.toFixed(2)+
          '" width="'+position.w.toFixed(2)+'" height="'+position.h+'" rx="6" fill="#f4faf1" stroke="#b0c9ab"/>';
        out+=txt(lx,ly+5,label,font,'text-anchor="middle" font-weight="700" data-mir-lip-label="'+esc(edge.id)+'"');
      }else{
        // Très nombreux côtés/pointes : la table contient toujours tous les
        // noms et les lips exacts; une étiquette superposée est plus trompeuse.
        out+='<g data-mir-side-label-omitted="'+esc(edge.id)+'"/>';
      }
      if(edge?.id===model.bottomEdgeId){
        out+=line(a[0],a[1],b[0],b[1],model.perforation?.enabled?'#167da2':'#477e4e',4);
      }
    }
    return out;
  }
  function previewSVG(model,api){
    const body=rect(0,0,710,600,'#fff','#fff')+
      geometry(model,{x:6,y:4,w:685,h:500},'data-mir-panel-main',api)+
      rect(21,510,666,69,'#eaf3e7','#d7e6d5',9)+
      txt(40,540,t('A · LARGEUR HORS TOUT : ','A · OVERALL WIDTH: ')+fmt(model,model.widthMM,api),20,'font-weight="800"')+
      txt(40,567,t('B · HAUTEUR HORS TOUT : ','B · OVERALL HEIGHT: ')+fmt(model,model.heightMM,api),20,'font-weight="800"');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 710 600" role="img" aria-label="'+esc(model.name||'Panneau')+' · largeur et hauteur hors tout avec lèvres individuelles">'+body+'</svg>';
  }
  function panelGroups(items){
    const grouped=new Map();
    for(const item of items){
      const key=item.sourceLayout?.zoneId||'panneaux-libre';
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(item);
    }
    return [...grouped.values()];
  }
  function wallSketch(items,api){
    // This is a schematic location plan, never a cut-plan or a cutting scale.
    const groups=panelGroups(items),group=groups[0]||[];
    const hasIndices=group.length&&group.every(i=>Number.isInteger(i.sourceLayout?.col)&&Number.isInteger(i.sourceLayout?.row));
    const columns=hasIndices?Math.max(...group.map(i=>i.sourceLayout.col))+1:Math.min(5,Math.max(1,group.length));
    const rows=hasIndices?Math.max(...group.map(i=>i.sourceLayout.row))+1:Math.ceil(group.length/columns);
    const x=81,y=392,w=742,h=350,dx=Math.min(130,w/columns),dy=Math.min(145,h/rows);
    const actualW=dx*columns,actualH=dy*rows;
    const startX=x+(w-actualW)/2,startY=y+(h-actualH)/2;
    let out=rect(67,356,780,420,'#f5f8f2','#dde7dc',10)+
      txt(83,384,t('SCHÉMA DE REPÉRAGE DU MUR','WALL LOCATION DIAGRAM'),18,'font-weight="700"')+
      txt(830,384,t('vue de principe','schematic view'),14,'text-anchor="end" fill="#658269"');
    group.forEach((item,index)=>{
      const col=hasIndices?item.sourceLayout.col:index%columns;
      const row=hasIndices?item.sourceLayout.row:Math.floor(index/columns);
      const px=startX+col*dx,py=startY+row*dy;
      const model=api.buildPanel(item.spec);
      const slot={x:px+4,y:py+4,w:dx-8,h:dy-8};
      out+=rect(px+2,py+2,dx-4,dy-4,'#fff','#d4ded3',5);
      out+=geometry(model,slot,'data-mir-panel-wall');
      out+=rect(px+dx/2-22,py+dy/2-16,44,30,'#fff','#c6d5c7',5);
      out+=txt(px+dx/2,py+dy/2+5,item.sourceLayout?.sourcePieceId||item.id,14,'text-anchor="middle" font-weight="700"');
    });
    return out+txt(84,805,t('Chaque repère correspond à une seule pièce du bon. Emplacement indicatif, hors tout à confirmer sur les fiches.','Each reference identifies one piece on this order. Locations are indicative; verify overall dimensions on the fabrication sheets.'),15,'fill="#625e55"');
  }
  function cover(po,panels,api){
    const quantity=panels.reduce((n,i)=>n+(Number(i.spec.quantity)||0),0);
    let body=sectionHeading(t('BON DE COMMANDE · PANNEAUX','PURCHASE ORDER · PANELS'),t('RÉVISION ','REVISION ')+(po.revision||1));
    body+=txt(65,156,max(po.poNumber,90),31,'font-weight="700"')+
      txt(1338,157,panels.length+t(' références • ',' references • ')+quantity+t(' pièces',' pieces'),23,'text-anchor="end" font-weight="700" fill="#242522"');
    body+=rect(64,183,1274,154,'#f4f1ea','#d8cdbc',12);
    body+=property(85,218,t('CHANTIER','JOBSITE'),po.job,400)+property(518,218,t('FOURNISSEUR','SUPPLIER'),po.supplier?.name,440)+property(990,218,t('LIVRAISON','DELIVERY'),po.shipTo,320);
    body+=txt(85,315,t('Responsable : ','Person in charge: ')+max(po.foreman||'À préciser',55),16,'fill="#625e55"')+
      txt(518,315,t('Contact : ','Contact: ')+max(po.supplier?.email||'À vérifier',62),16,'fill="#625e55"')+
      txt(990,315,t('Date demandée : ','Requested date: ')+max(po.requestedDate||'À confirmer',25),16,'fill="#625e55"');
    body+=wallSketch(panels,api);
    body+=txt(874,378,t('PIÈCES À FABRIQUER','PIECES TO FABRICATE'),21,'font-weight="700"');
    body+=line(875,393,1325,393,'#d8cdbc',2);
    const shown=panels.slice(0,12);
    shown.forEach((item,i)=>{
      const model=api.buildPanel(item.spec),top=422+i*31,reference=item.sourceLayout?.sourcePieceId||item.id;
      body+=txt(880,top,max(reference,15),17,'font-weight="700"')+
        txt(972,top,max(fmt(model,model.widthMM,api)+' × '+fmt(model,model.heightMM,api),28),16)+
        txt(1310,top,'× '+model.quantity,16,'text-anchor="end"');
    });
    if(panels.length>shown.length)body+=txt(878,807,'+'+(panels.length-shown.length)+t(' références : voir leurs fiches cotées.',' references: see dimensioned sheets.'),16,'fill="#a3662b"');
    body+=rect(68,841,1264,52,'#f4f1ea','#d8cdbc',7)+txt(84,872,t('Une pièce par fiche • aucune pièce répétée • bon local non transmis','One piece per sheet • no duplicates • local order not submitted'),19,'font-weight="700" fill="#242522"');
    body+=footer();
    return {name:t('Résumé du bon ','Order summary ')+po.poNumber,layout:'wide',svg:svg(body),summary:[t('Résumé, mur et repères. Validation fournisseur et atelier requise.','Summary, wall and references. Supplier and workshop approval required.'),...fullProperty(t('Chantier','Jobsite'),po.job,400),...fullProperty(t('Fournisseur','Supplier'),po.supplier?.name,440),...fullProperty(t('Livraison','Delivery'),po.shipTo,320),...(String(po.foreman||'').length>55?[t('Responsable : ','Person in charge: ')+po.foreman]:[]),...(String(po.supplier?.email||'').length>62?[t('Contact : ','Contact: ')+po.supplier.email]:[])]};
  }
  function panelPage(po,item,index,total,api){
    const m=api.buildPanel(item.spec);
    let body=sectionHeading(t('FICHE DE FABRICATION · PANNEAU ','FABRICATION SHEET · PANEL ')+(index+1)+'/'+total,t('BON ','ORDER ')+max(po.poNumber,45));
    const reference=item.sourceLayout?.sourcePieceId||item.id;
    body+=txt(65,151,t('Panneau ','Panel ')+max(reference,64),34,'font-weight="800"')+
      txt(1330,150,t('QTÉ ','QTY ')+m.quantity,26,'font-weight="800" text-anchor="end" fill="#242522"');
    body+=rect(62,177,720,708,'#f4f1ea','#d8cdbc',12);
    body+=txt(85,215,t('VUE COTÉE · UNE PIÈCE','DIMENSIONED VIEW · ONE PIECE'),19,'font-weight="700"');
    body+=geometry(m,{x:100,y:248,w:630,h:505},'data-mir-panel-main',api);
    body+=rect(100,758,668,104,'#e9e2d6','#d8cdbc',9);
    body+=txt(119,792,t('A · LARGEUR HORS TOUT : ','A · OVERALL WIDTH: ')+fmt(m,m.widthMM,api),24,'font-weight="800" data-mir-ab-summary="A"')+
      txt(119,832,t('B · HAUTEUR HORS TOUT : ','B · OVERALL HEIGHT: ')+fmt(m,m.heightMM,api),24,'font-weight="800" data-mir-ab-summary="B"');
    body+=txt(110,878,t('A et B incluent les lèvres. Ne pas confondre avec la face visible.','A and B include the lips. Do not confuse them with the visible face.'),15,'fill="#625e55"');
    body+=rect(806,177,531,708,'#fff','#d8cdbc',12);
    body+=property(831,214,'PROJECTION C',fmt(m,m.reliefMM,api));
    body+=property(1090,214,t('MATIÈRE','MATERIAL'),m.material?.name||m.material?.type||'À préciser');
    body+=property(831,291,t('FINITION','FINISH'),m.finish?.name||'À préciser');
    body+=property(1090,291,t('CODE / GAGE','CODE / GAUGE'),(m.finish?.code||'À préciser')+' · '+(m.material?.gauge||m.material?.thicknessMM&&num(m.material.thicknessMM)+' mm'||t('épaisseur à confirmer','thickness to confirm')));
    body+=property(831,370,t('BAS APRÈS POSE','BOTTOM AFTER INSTALLATION'),m.edges.find(e=>e.id===m.bottomEdgeId)?.name||'À préciser');
    body+=property(1090,370,'PERFORATION',m.perforation.enabled?t('Oui — détails à valider','Yes — details need review'):t('Non','No'));
    body+=line(830,430,1311,430,'#d8cdbc',2);
    body+=txt(832,454,t('CÔTÉS, LIPS ET ANGLES','SIDES, LIPS AND ANGLES'),20,'font-weight="800"')+
      txt(832,484,t('Côté','Side'),15,'font-weight="700"')+
      txt(1000,484,t('Longueur','Length'),15,'font-weight="700"')+
      txt(1145,484,'Lip',15,'font-weight="700"')+
      txt(1260,484,t('Angle','Angle'),15,'font-weight="700"');
    body+=line(831,497,1312,497,'#d8cdbc',1);
    const limit=7;
    m.edges.slice(0,limit).forEach((edge,i)=>{
      const y=528+i*45;
      body+=txt(832,y,max(edge.name,20),16)+
        txt(1000,y,fmt(m,edge.lengthMM,api),15)+
        txt(1144,y,fmt(m,edge.lipMM,api),15)+
        txt(1260,y,num(edge.interiorAngleDeg)+'°',15);
      body+=line(832,y+13,1312,y+13,'#e9e2d6',1);
    });
    const detailsAfter=m.edges.slice(limit);
    if(!detailsAfter.length){
      body+=txt(833,866,t('Cotes réelles conservées • développé de pli à valider.','Actual dimensions retained • developed length requires approval.'),14,'fill="#625e55"');
    }else{
      body+=txt(832,872,detailsAfter.length+t(' autres côtés : liste complémentaire sans second dessin.',' additional sides: supplementary list, no second drawing.'),15,'fill="#955e2a"');
    }
    body+=footer();
    const pages=[{name:t('Panneau ','Panel ')+reference,layout:'wide',svg:svg(body),summary:[t('Panneau ','Panel ')+reference+t(' • 1 dessin • quantité ',' • 1 drawing • quantity ')+m.quantity+t(' • fabrication à confirmer.',' • fabrication to confirm.'),...fullProperty(t('Matière','Material'),m.material?.name||m.material?.type),...fullProperty(t('Finition','Finish'),m.finish?.name),...fullProperty(t('Code / gage','Code / gauge'),(m.finish?.code||'À préciser')+' · '+(m.material?.gauge||m.material?.thicknessMM&&num(m.material.thicknessMM)+' mm'||t('épaisseur à confirmer','thickness to confirm'))),...(m.note?[t('Note : ','Note: ')+m.note]:[]),...(m.perforation?.enabled&&m.perforation.details?[t('Perforation : ','Perforation: ')+m.perforation.details]:[])]}];
    for(let start=0;start<detailsAfter.length;start+=14){
      const group=detailsAfter.slice(start,start+14),offset=limit+start;
      let extra=sectionHeading(t('DÉTAILS DE COUPE · ','CUTTING DETAILS · ')+reference,t('AUCUN NOUVEAU PANNEAU','NO ADDITIONAL PANEL'));
      extra+=txt(75,160,t('Longueurs complémentaires, lèvres et angles','Additional lengths, lips and angles'),25,'font-weight="700"')+
        txt(75,200,t('Ce tableau complète le même panneau. Aucun deuxième croquis ni quantité supplémentaire.','This table completes the same panel. No second drawing or additional quantity.'),17,'fill="#6e756c"');
      extra+=rect(68,245,1264,595,'#fff','#dbe4d8',11);
      group.forEach((e,i)=>{
        const y=293+i*39;
        extra+=txt(90,y,max(e.name,28),19)+
          txt(510,y,t('Côté ','Side ')+fmt(m,e.lengthMM,api),19)+
          txt(815,y,'Lip '+fmt(m,e.lipMM,api),19)+
          txt(1142,y,num(e.interiorAngleDeg)+'°',19);
        extra+=line(90,y+12,1308,y+12,'#ebf0e7',1);
      });
      extra+=footer();
      pages.push({name:t('Cotes complémentaires ','Additional dimensions ')+reference,layout:'wide',svg:svg(extra),summary:[t('Même panneau ','Same panel ')+reference+t(', aucune pièce additionnelle.',', no additional piece.')]});
    }
    return pages;
  }
  function makeFaces(po,api){
    if(!po?.items?.length)throw Error(t('Le bon de commande est vide.','Purchase order is empty.'));
    const panels=po.items.filter(i=>(i.spec?.kind||i.kind)==='panel');
    if(!panels.length)throw Error(t('Aucun panneau dans le bon.','No panels on the order.'));
    if(new Set(po.items.map(i=>String(i.id))).size!==po.items.length)throw Error(t('Repères répétés : vérifiez le bon avant PDF.','Duplicate piece references: review the order before exporting the PDF.'));
    const faces=[cover(po,panels,api)];
    for(let i=0;i<panels.length;i++)faces.push(...panelPage(po,panels[i],i,panels.length,api));
    const profiles=po.items.filter(i=>(i.spec?.kind||i.kind)==='profile');
    if(profiles.length)faces.push(...api.productionPages({
      poNumber:po.poNumber,project:po.job,foreman:po.foreman,date:po.requestedDate,
      notes:po.notes,revision:po.revision,
      items:profiles.map(i=>({...i.spec,id:i.id}))
    },{layout:'bending-sheet'}));
    return faces;
  }
  return Object.freeze({version:'1.1.0',makeFaces,previewSVG});
});
