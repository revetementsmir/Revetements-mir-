/* MIR - supplier panels: one panel, one drawing, one fabrication sheet.
 * Visual repérage is indicative, all production dimensions come from the exact model.
 * No network, no transmission and no invented developed sheet dimensions. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRPanelPOPDF=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const num=value=>Number.isFinite(value)?Number(value.toFixed(2)).toLocaleString('fr-CA'):'?';
  const txt=(x,y,value,size=21,extra='')=>'<text x="'+x+'" y="'+y+'" font-family="Arial,Helvetica,sans-serif" font-size="'+size+'" fill="#263f30" '+extra+'>'+esc(value)+'</text>';
  const rect=(x,y,w,h,fill='#fff',stroke='#d8e3d8',radius=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+radius+'" fill="'+fill+'" stroke="'+stroke+'"/>';
  const line=(x,y,x2,y2,color='#dbe3d9',sw=2)=>'<path d="M '+x+' '+y+' L '+x2+' '+y2+'" fill="none" stroke="'+color+'" stroke-width="'+sw+'"/>';
  const svg=body=>'<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000"><rect width="1400" height="1000" fill="white"/>'+body+'</svg>';
  const fmt=(model,mm,api)=>api.formatMeasurement(mm,model.unit);
  const row=v=>String(v||'').trim();
  const max=(str,n)=>String(str??'').slice(0,n);
  function sectionHeading(title,kicker){
    return rect(0,0,1400,15,'#28553a','#28553a')+
      txt(62,73,'MIR',41,'font-weight="800" fill="#28553a"')+
      txt(185,72,title,30,'font-weight="700"')+
      txt(1338,69,kicker,16,'text-anchor="end" fill="#657869"')+
      line(60,103,1340,103,'#d3dfd4',2);
  }
  function property(x,y,label,value){
    return txt(x,y,label,15,'fill="#667967" font-weight="700"')+
      txt(x,y+27,max(value||'À confirmer',48),21,'font-weight="600"');
  }
  function footer(y='955'){
    return line(62,918,1338,918,'#dae3d8',2)+
      txt(62,948,'COTES FINIES • CROQUIS NON À L’ÉCHELLE • VALIDATION ATELIER OBLIGATOIRE',15,'fill="#6a7b6b"')+
      txt(1338,948,'AUCUN ENVOI AUTOMATIQUE',15,'text-anchor="end" fill="#6a7b6b"');
  }
  function geometry(model,box,attribute='data-mir-panel-main'){
    const points=model.pointsMM||[];
    if(points.length<3)return '';
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const bounds={left:Math.min(...xs),right:Math.max(...xs),bottom:Math.min(...ys),top:Math.max(...ys)};
    const w=Math.max(1,bounds.right-bounds.left),h=Math.max(1,bounds.top-bounds.bottom);
    const scale=Math.min((box.w-40)/w,(box.h-40)/h);
    const ox=box.x+(box.w-w*scale)/2,oy=box.y+(box.h-h*scale)/2;
    const project=p=>[ox+(p[0]-bounds.left)*scale,oy+(bounds.top-p[1])*scale];
    const drawn=points.map(project);
    const d=drawn.map((p,i)=>(i?'L ':'M ')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ')+' Z';
    let out='<path '+attribute+'="'+esc(model.id||model.name)+'" d="'+d+'" fill="'+(model.finish?.hex||'#e7efe5')+'" stroke="#28553a" stroke-width="3"/>';
    for(let i=0;i<drawn.length;i++){
      const a=drawn[i],b=drawn[(i+1)%drawn.length],edge=model.edges?.[i];
      const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
      if(edge?.id===model.bottomEdgeId)out+=line(a[0],a[1],b[0],b[1],model.perforation?.enabled?'#15798d':'#4e9854',6);
      if(attribute==='data-mir-panel-main'){
        out+='<circle cx="'+mx+'" cy="'+my+'" r="15" fill="white" stroke="#9fb4a1" stroke-width="1.5"/>'+
          txt(mx,my+6,i+1,15,'font-weight="700" text-anchor="middle"');
      }
    }
    return out;
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
      txt(83,384,'SCHÉMA DE REPÉRAGE DU MUR',18,'font-weight="700"')+
      txt(830,384,'vue de principe',14,'text-anchor="end" fill="#658269"');
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
    return out+txt(84,805,'Chaque repère correspond à une seule pièce du bon. Emplacement indicatif, hors tout à confirmer sur les fiches.',15,'fill="#657869"');
  }
  function cover(po,panels,api){
    const quantity=panels.reduce((n,i)=>n+(Number(i.spec.quantity)||0),0);
    let body=sectionHeading('BON DE COMMANDE · PANNEAUX','RÉVISION '+(po.revision||1));
    body+=txt(65,156,max(po.poNumber,90),31,'font-weight="700"')+
      txt(1338,157,panels.length+' références • '+quantity+' pièces',23,'text-anchor="end" font-weight="700" fill="#28553a"');
    body+=rect(64,183,1274,154,'#f3f7ef','#dce5d7',12);
    body+=property(85,218,'CHANTIER',max(po.job,60))+property(518,218,'FOURNISSEUR',max(po.supplier?.name,55))+property(990,218,'LIVRAISON',max(po.shipTo,46));
    body+=txt(85,315,'Responsable : '+max(po.foreman||'À préciser',55),16,'fill="#56705d"')+
      txt(518,315,'Contact : '+max(po.supplier?.email||'À vérifier',62),16,'fill="#56705d"')+
      txt(990,315,'Date demandée : '+max(po.requestedDate||'À confirmer',25),16,'fill="#56705d"');
    body+=wallSketch(panels,api);
    body+=txt(874,378,'PIÈCES À FABRIQUER',21,'font-weight="700"');
    body+=line(875,393,1325,393,'#cbdacb',2);
    const shown=panels.slice(0,12);
    shown.forEach((item,i)=>{
      const model=api.buildPanel(item.spec),top=422+i*31,reference=item.sourceLayout?.sourcePieceId||item.id;
      body+=txt(880,top,max(reference,15),17,'font-weight="700"')+
        txt(972,top,max(fmt(model,model.widthMM,api)+' × '+fmt(model,model.heightMM,api),28),16)+
        txt(1310,top,'× '+model.quantity,16,'text-anchor="end"');
    });
    if(panels.length>shown.length)body+=txt(878,807,'+'+(panels.length-shown.length)+' références : voir leurs fiches cotées.',16,'fill="#a3662b"');
    body+=rect(68,841,1264,52,'#edf3e9','#d7e5d2',7)+txt(84,872,'Une pièce par fiche • aucune pièce répétée • bon local non transmis',19,'font-weight="700" fill="#31563a"');
    body+=footer();
    return {name:'Résumé du bon '+po.poNumber,layout:'wide',svg:svg(body),summary:['Résumé, mur et repères. Validation fournisseur et atelier requise.']};
  }
  function panelPage(po,item,index,total,api){
    const m=api.buildPanel(item.spec);
    let body=sectionHeading('FICHE DE FABRICATION · PANNEAU '+(index+1)+'/'+total,'BON '+max(po.poNumber,45));
    const reference=item.sourceLayout?.sourcePieceId||item.id;
    body+=txt(65,151,'Panneau '+max(reference,64),34,'font-weight="800"')+
      txt(1330,150,'QTÉ '+m.quantity,26,'font-weight="800" text-anchor="end" fill="#28553a"');
    body+=rect(62,177,720,708,'#f8faf6','#dce5d8',12);
    body+=txt(85,215,'VUE COTÉE · UNE PIÈCE',19,'font-weight="700"');
    body+=geometry(m,{x:100,y:248,w:630,h:505});
    body+=txt(110,788,'A · '+fmt(m,m.widthMM,api),22,'font-weight="700"')+
      txt(110,824,'B · '+fmt(m,m.heightMM,api),22,'font-weight="700"');
    body+=txt(110,859,'Hors tout, lips inclus. Le dessin n’est pas une échelle de coupe.',15,'fill="#607162"');
    body+=rect(806,177,531,708,'#fff','#dce5d8',12);
    body+=property(831,214,'PROJECTION C',fmt(m,m.reliefMM,api));
    body+=property(1090,214,'MATIÈRE',m.material?.name||m.material?.type||'À préciser');
    body+=property(831,291,'FINITION',m.finish?.name||'À préciser');
    body+=property(1090,291,'CODE / GAGE',max((m.finish?.code||'À préciser')+' · '+(m.material?.gauge||m.material?.thicknessMM&&num(m.material.thicknessMM)+' mm'||'épaisseur à confirmer'),30));
    body+=property(831,370,'BAS APRÈS POSE',m.edges.find(e=>e.id===m.bottomEdgeId)?.name||'À préciser');
    body+=property(1090,370,'PERFORATION',m.perforation.enabled?'Oui — détails à valider':'Non');
    body+=line(830,421,1311,421,'#d7e5d7',2);
    body+=txt(832,454,'CÔTÉS, LIPS ET ANGLES',20,'font-weight="800"')+
      txt(832,484,'Côté',15,'font-weight="700"')+
      txt(1000,484,'Longueur',15,'font-weight="700"')+
      txt(1145,484,'Lip',15,'font-weight="700"')+
      txt(1260,484,'Angle',15,'font-weight="700"');
    body+=line(831,497,1312,497,'#d8e4d8',1);
    const limit=7;
    m.edges.slice(0,limit).forEach((edge,i)=>{
      const y=528+i*45;
      body+=txt(832,y,(i+1)+'. '+max(edge.name,16),16)+
        txt(1000,y,fmt(m,edge.lengthMM,api),15)+
        txt(1144,y,fmt(m,edge.lipMM,api),15)+
        txt(1260,y,num(edge.interiorAngleDeg)+'°',15);
      body+=line(832,y+13,1312,y+13,'#edf2ec',1);
    });
    const detailsAfter=m.edges.slice(limit);
    if(!detailsAfter.length){
      body+=txt(833,866,'Cotes réelles conservées • développé de pli à valider.',14,'fill="#667d68"');
    }else{
      body+=txt(832,872,detailsAfter.length+' autres côtés : liste complémentaire sans second dessin.',15,'fill="#955e2a"');
    }
    body+=footer();
    const pages=[{name:'Panneau '+reference,layout:'wide',svg:svg(body),summary:['Panneau '+reference+' • 1 dessin • quantité '+m.quantity+' • fabrication à confirmer.']}];
    for(let start=0;start<detailsAfter.length;start+=14){
      const group=detailsAfter.slice(start,start+14),offset=limit+start;
      let extra=sectionHeading('DÉTAILS DE COUPE · '+reference,'AUCUN NOUVEAU PANNEAU');
      extra+=txt(75,160,'Longueurs complémentaires, lèvres et angles',25,'font-weight="700"')+
        txt(75,200,'Ce tableau complète le même panneau. Aucun deuxième croquis ni quantité supplémentaire.',17,'fill="#6e756c"');
      extra+=rect(68,245,1264,595,'#fff','#dbe4d8',11);
      group.forEach((e,i)=>{
        const y=293+i*39;
        extra+=txt(90,y,(offset+i+1)+'. '+max(e.name,28),19)+
          txt(510,y,'Côté '+fmt(m,e.lengthMM,api),19)+
          txt(815,y,'Lip '+fmt(m,e.lipMM,api),19)+
          txt(1142,y,num(e.interiorAngleDeg)+'°',19);
        extra+=line(90,y+12,1308,y+12,'#ebf0e7',1);
      });
      extra+=footer();
      pages.push({name:'Cotes complémentaires '+reference,layout:'wide',svg:svg(extra),summary:['Même panneau '+reference+', aucune pièce additionnelle.']});
    }
    return pages;
  }
  function makeFaces(po,api){
    if(!po?.items?.length)throw Error('Le bon de commande est vide.');
    const panels=po.items.filter(i=>(i.spec?.kind||i.kind)==='panel');
    if(!panels.length)throw Error('Aucun panneau dans le bon.');
    if(new Set(po.items.map(i=>String(i.id))).size!==po.items.length)throw Error('Repères répétés : vérifiez le bon avant PDF.');
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
  return Object.freeze({version:'1.0.0',makeFaces});
});
