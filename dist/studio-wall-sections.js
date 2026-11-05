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
  function masonryBand(front,dimensions,{feetPerPixel,fitWall=false}={}){
    const h=dimensions?.wallHeight,w=dimensions?.width,box=front?.textureBox||front?.bbox;
    if(!finite(h)||h<=0||!Array.isArray(box)||!box.every(finite)||box[2]<=0||box[3]<=0)return null;
    const zPerPixel=fitWall?h/box[3]:feetPerPixel>0?feetPerPixel*.3048:w/box[2];
    if(!(zPerPixel>0))return null;
    const datum=(finite(front.textureBottom)?front.textureBottom:0)+(box[1]+box[3])*zPerPixel;
    // Match the elevation texture's exact vertical transform. A narrow masonry
    // accent elsewhere on the facade is not evidence of a continuous base.
    const bands=(front.zones||[]).filter(z=>z.kind==='masonry').flatMap(zone=>{
      const b=bound(zone.polygon);if(!b)return [];
      const span=b.maxX-b.minX,bottom=datum-b.maxY*zPerPixel,top=datum-b.minY*zPerPixel;
      return span>=box[2]*.55&&top>bottom&&top-bottom<=h*.5&&bottom<h*.35&&top>0?
        [{zone,span,bottom,top}]:[];
    }).sort((a,b)=>b.span-a.span||a.bottom-b.bottom);
    const band=bands[0];if(!band)return null;
    return {bottomMeters:band.bottom,topMeters:band.top,heightMeters:band.top-band.bottom,sourceZoneId:band.zone.id,sourceFace:front.key,
      method:'elevation-texture-world-datum',
      status:'schematic-from-reviewed-raster-not-certified'};
  }
  function wallSections(mesh){
    const faces=mesh?.faces||mesh?.wallParts||[];
    const kinds=[['return-left','Retour gauche'],['return-right','Retour droit']];
    const found=[];
    for(const [id,name] of kinds){
      const f=faces.find(row=>row.id===id&&row.role==='recess-return'&&Array.isArray(row.poly));
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
  function explodeSideSVG(mainSvg,{sideFace,dimensions,mesh,brickBand:band,brickPattern='',colors={}}={}){
    if(!mainSvg||!sideFace||!dimensions||!mesh)return null;
    const parts=wallSections(mesh),frame=sideScale(sideFace,dimensions.wallHeight);
    const match=/viewBox="([^"]+)"/.exec(mainSvg);
    const vb=match?.[1].trim().split(/[\s,]+/).map(Number);
    if(!frame||!parts.length||!vb||vb.length!==4||!vb.every(finite))return null;
    const gap=28,startX=vb[0]+vb[2]+55,marginRight=46;
    const totalWidth=parts.reduce((s,p)=>s+p.widthMeters*frame.pixelsPerMeter,0)+gap*(parts.length-1);
    const expandedWidth=startX+totalWidth+marginRight-vb[0];
    const grade=frame.groundY,ppm=frame.pixelsPerMeter;
    const brickTop=finite(band?.topMeters)?band.topMeters:0,brickBottom=finite(band?.bottomMeters)?band.bottomMeters:0;
    const safeFill=part=>safeColor(colors[part.id],'#90988a');
    let x=startX;
    const blocks=parts.map(part=>{
      const w=part.widthMeters*ppm,top=grade-part.topMeters*ppm,bottom=grade-part.bottomMeters*ppm;
      const y0=Math.max(top,vb[1]+1),height=Math.max(0,bottom-y0);
      const masonryY=Math.max(y0,grade-brickTop*ppm),masonryBottom=Math.min(bottom,grade-brickBottom*ppm);
      const bandH=Math.max(0,masonryBottom-masonryY);
      const label=part.id==='return-left'?'Gauche':'Droite';
      const node='<g data-mir-wall-part="'+part.id+'" data-world-top="'+round(part.topMeters)+'" data-world-bottom="'+round(part.bottomMeters)+'" data-width-m="'+round(part.widthMeters)+'" pointer-events="none">'+
        '<rect x="'+round(x)+'" y="'+round(y0)+'" width="'+round(w)+'" height="'+round(height)+'" fill="'+safeFill(part)+'" fill-opacity=".96" stroke="#536855" stroke-width="2"/>'+
        (bandH>0?'<rect data-mir-masonry-band="'+part.id+'" x="'+round(x)+'" y="'+round(masonryY)+'" width="'+round(w)+'" height="'+round(bandH)+'" fill="'+(brickPattern?'url(#mir-exploded-brick)':'#a3a59a')+'"/>':'')+
        '<text x="'+round(x+w/2)+'" y="'+round(Math.max(vb[1]+55,top-13))+'" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" fill="#40533d" paint-order="stroke" stroke="#fafbf5" stroke-width="3">'+label+'</text>'+
        '<title>'+part.name+' — sommet '+round(part.topMeters)+' m, pied '+round(part.bottomMeters)+' m</title></g>';
      x+=w+gap;return node;
    }).join('');
    const note='<text x="'+round(startX)+'" y="'+round(vb[1]+34)+'" font-size="23" font-weight="700" fill="#3f5944">Retours cachés</text>'+
      '<path d="M'+round(startX)+' '+round(grade)+'H'+round(x-gap)+'" stroke="#8ca18a" stroke-width="1.7" stroke-dasharray="10 6"/>';
    const overlay='<g class="mir-exploded-side-walls" data-mir-three-wall-explode="true" pointer-events="none">'+
      (brickPattern?'<defs>'+brickPattern+'</defs>':'')+note+blocks+'</g>';
    let result=mainSvg.replace(match[0],'viewBox="'+vb[0]+' '+vb[1]+' '+round(expandedWidth)+' '+vb[3]+'"');
    result=result.replace(/(<svg\b[^>]*?)\bwidth="[^"]+"/,'$1width="'+round(expandedWidth)+'"');
    result=result.replace('<svg ','<svg data-mir-three-wall-explode="true" ');
    result=result.replace('</svg>',overlay+'</svg>');
    return {svg:result,parts,expandedViewBox:[vb[0],vb[1],expandedWidth,vb[3]],bandHeightMeters:Math.max(0,brickTop-brickBottom),gradeY:grade};
  }
  return Object.freeze({version:'1.0.0',masonryBand,wallSections,sideScale,explodeSideSVG});
});
