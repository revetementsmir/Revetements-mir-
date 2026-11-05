/* MIR — surfaces détachées en élévation et continuité du soubassement.
 * Les positions verticales viennent du modèle 3D et de l'élévation étudiée;
 * ce sont des repères VISUELS, pas un métrage certifié pour fabrication. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRStudioWallParts=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const bound=points=>{
    if(!Array.isArray(points)||!points.length)return null;
    const p=points.filter(q=>Array.isArray(q)&&q.length>=2&&finite(q[0])&&finite(q[1]));
    if(!p.length)return null;
    return {minX:Math.min(...p.map(q=>q[0])),maxX:Math.max(...p.map(q=>q[0])),
      minY:Math.min(...p.map(q=>q[1])),maxY:Math.max(...p.map(q=>q[1]))};
  };
  const round=n=>Number(n.toFixed(3));
  function masonryBand(front,dimensions){
    const h=dimensions?.wallHeight,brick=front?.zones?.find(z=>z.kind==='masonry'),b=bound(brick?.polygon);
    const gables=front?.zones?.filter(z=>z.polygon?.length===5&&z.id?.includes('pignon'))||[];
    const shoulders=gables.flatMap(z=>[z.polygon[0]?.[1],z.polygon[2]?.[1]]).filter(finite);
    if(!finite(h)||h<=0||!b||!shoulders.length)return null;
    const eave=shoulders.reduce((s,n)=>s+n,0)/shoulders.length;
    const denom=b.maxY-eave,brickPixels=b.maxY-b.minY;
    if(denom<=0||brickPixels<=0||brickPixels>denom)return null;
    const height=h*brickPixels/denom;
    return {heightMeters:height,sourceZoneId:brick.id,sourceFace:front.key,
      method:'elevation-brick-band-normalized-to-wall-height',
      status:'schematic-from-reviewed-raster-not-certified'};
  }
  function wallSections(mesh){
    const faces=mesh?.faces||mesh?.wallParts||[];
    const kinds=[['return-left','Retour gauche'],['front','Mur du fond'],['return-right','Retour droit']];
    const found=[];
    for(const [id,name] of kinds){
      const f=faces.find(row=>row.id===id&&row.type==='wall'&&Array.isArray(row.poly));
      if(!f)return [];
      const p=f.poly,zs=p.map(q=>q[2]).filter(finite);
      if(zs.length!==p.length||zs.length<3)return [];
      const bottom=Math.min(...zs),top=Math.max(...zs);
      const horizontal=[];
      const ground=p.filter(q=>Math.abs(q[2]-bottom)<1e-5);
      for(let i=0;i<ground.length;i++)for(let j=i+1;j<ground.length;j++)
        horizontal.push(Math.hypot(ground[i][0]-ground[j][0],ground[i][1]-ground[j][1]));
      const width=Math.max(...horizontal,0);
      if(width<.03||top<=bottom)return [];
      found.push({id,name,widthMeters:width,bottomMeters:bottom,topMeters:top,
        status:'3d-schematic-face',sourceFaceId:f.id});
    }
    return found;
  }
  function sideScale(face,wallHeight){
    const main=face?.zones?.find(z=>z.id==='mur_droit'||z.id==='mur_gauche');
    const box=bound(main?.polygon);
    if(!box||!finite(wallHeight)||wallHeight<=0||box.maxY<=box.minY)return null;
    return {pixelsPerMeter:(box.maxY-box.minY)/wallHeight,groundY:box.maxY,topY:box.minY};
  }
  function safeColor(value,alternative){
    return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:alternative;
  }
  // Montrer les vraies baies du mur du fond : les positions viennent des
  // ouvertures de l'élévation de face, et non d'une maquette inventée.
  function frontOpenings(front,dimensions,{x,width,yGround,pixelsPerMeter,top,bottom}){
    const zones=(front?.zones||[]).filter(z=>['centre_RDC','centre_etage'].includes(z.id));
    const boxes=zones.map(z=>bound(z.polygon)).filter(Boolean);
    const masonry=bound(front?.zones?.find(z=>z.kind==='masonry')?.polygon);
    const gables=(front?.zones||[]).filter(z=>z.polygon?.length===5&&z.id?.includes('pignon'));
    const shoulders=gables.flatMap(z=>[z.polygon[0]?.[1],z.polygon[2]?.[1]]).filter(finite);
    if(!boxes.length||!masonry||!shoulders.length||!Array.isArray(front?.openings))return '';
    const fromX=Math.min(...boxes.map(b=>b.minX)),toX=Math.max(...boxes.map(b=>b.maxX));
    const eave=shoulders.reduce((sum,v)=>sum+v,0)/shoulders.length;
    if(toX-fromX<1||masonry.maxY-eave<1)return '';
    const zPerPixel=dimensions.wallHeight/(masonry.maxY-eave);
    const shape=(p,i)=>{
      const b=bound(p.polygon);if(!b)return '';
      const center=(b.minX+b.maxX)/2;
      if(center<fromX||center>toX)return '';
      const pts=p.polygon.map(([px,py])=>[
        x+(px-fromX)/(toX-fromX)*width,
        yGround-(masonry.maxY-py)*zPerPixel*pixelsPerMeter
      ]);
      const points=pts.map(pt=>pt.map(round).join(',')).join(' ');
      const fill=p.type==='door'?'#c8cec5':'#cbded7';
      return '<polygon data-mir-wall-opening="'+String(p.id||'baie-'+i).replace(/[^a-zA-Z0-9_-]/g,'')+
        '" points="'+points+'" fill="'+fill+'" stroke="#3e5145" stroke-width="2.2"/>';
    };
    const nodes=front.openings.map(shape).join('');
    if(!nodes)return '';
    return '<defs><clipPath id="mir-explode-recess-openings"><rect x="'+round(x)+'" y="'+round(top)+'" width="'+round(width)+'" height="'+round(bottom-top)+'"/></clipPath></defs>'+
      '<g clip-path="url(#mir-explode-recess-openings)">'+nodes+'</g>';
  }
  function explodeSideSVG(mainSvg,{sideFace,dimensions,mesh,brickBand:band,brickPattern='',colors={},frontFace=null}={}){
    if(!mainSvg||!sideFace||!dimensions||!mesh)return null;
    const parts=wallSections(mesh),frame=sideScale(sideFace,dimensions.wallHeight);
    const match=/viewBox="([^"]+)"/.exec(mainSvg);
    const vb=match?.[1].trim().split(/[\s,]+/).map(Number);
    if(!frame||parts.length!==3||!vb||vb.length!==4||!vb.every(finite))return null;
    const gap=28,startX=vb[0]+vb[2]+55,marginRight=46;
    const totalWidth=parts.reduce((s,p)=>s+p.widthMeters*frame.pixelsPerMeter,0)+gap*2;
    const expandedWidth=startX+totalWidth+marginRight-vb[0];
    const grade=frame.groundY,ppm=frame.pixelsPerMeter;
    const brickHeight=band&&finite(band.heightMeters)?Math.max(0,Math.min(band.heightMeters,dimensions.wallHeight)):0;
    const safeFill=part=>safeColor(colors[part.id],part.id==='front'?'#586159':'#90988a');
    let x=startX;
    const blocks=parts.map(part=>{
      const w=part.widthMeters*ppm,top=grade-part.topMeters*ppm,bottom=grade-part.bottomMeters*ppm;
      const y0=Math.max(top,vb[1]+1),height=Math.max(0,bottom-y0);
      const foundationTop=grade,bandY=grade-brickHeight*ppm;
      const masonryY=Math.max(y0,bandY),masonryBottom=Math.min(bottom,grade);
      const bandH=Math.max(0,masonryBottom-masonryY);
      const label=part.id==='front'?'Fond':part.id==='return-left'?'Gauche':'Droite';
      const node='<g data-mir-wall-part="'+part.id+'" data-world-top="'+round(part.topMeters)+'" data-world-bottom="'+round(part.bottomMeters)+'" data-width-m="'+round(part.widthMeters)+'" pointer-events="none">'+
        '<rect x="'+round(x)+'" y="'+round(y0)+'" width="'+round(w)+'" height="'+round(height)+'" fill="'+safeFill(part)+'" fill-opacity=".96" stroke="#536855" stroke-width="2"/>'+
        (bandH>0?'<rect data-mir-masonry-band="'+part.id+'" x="'+round(x)+'" y="'+round(masonryY)+'" width="'+round(w)+'" height="'+round(bandH)+'" fill="'+(brickPattern?'url(#mir-exploded-brick)':'#a3a59a')+'"/>':'')+
        (part.id==='front'?frontOpenings(frontFace,dimensions,{x,width:w,yGround:grade,pixelsPerMeter:ppm,top:y0,bottom}):'')+
        '<text x="'+round(x+w/2)+'" y="'+round(Math.max(vb[1]+55,top-13))+'" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" fill="#40533d" paint-order="stroke" stroke="#fafbf5" stroke-width="3">'+label+'</text>'+
        '<title>'+part.name+' — sommet '+round(part.topMeters)+' m, pied '+round(part.bottomMeters)+' m</title></g>';
      x+=w+gap;return node;
    }).join('');
    const note='<text x="'+round(startX)+'" y="'+round(vb[1]+34)+'" font-size="23" font-weight="700" fill="#3f5944">3 murs détachés · hauteurs du volume</text>'+
      '<path d="M'+round(startX)+' '+round(grade)+'H'+round(x-gap)+'" stroke="#8ca18a" stroke-width="1.7" stroke-dasharray="10 6"/>';
    const overlay='<g class="mir-exploded-side-walls" data-mir-three-wall-explode="true" pointer-events="none">'+
      (brickPattern?'<defs>'+brickPattern+'</defs>':'')+note+blocks+'</g>';
    let result=mainSvg.replace(match[0],'viewBox="'+vb[0]+' '+vb[1]+' '+round(expandedWidth)+' '+vb[3]+'"');
    result=result.replace(/(<svg\b[^>]*?)\bwidth="[^"]+"/,'$1width="'+round(expandedWidth)+'"');
    result=result.replace('<svg ','<svg data-mir-three-wall-explode="true" ');
    result=result.replace('</svg>',overlay+'</svg>');
    return {svg:result,parts,expandedViewBox:[vb[0],vb[1],expandedWidth,vb[3]],bandHeightMeters:brickHeight,gradeY:grade};
  }
  return Object.freeze({version:'1.0.0',masonryBand,wallSections,sideScale,explodeSideSVG});
});
