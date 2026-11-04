/* Shared study layout geometry. No product dimensions are inferred here.
 * Coordinate input: source pixels; feetPerPixel is an explicit calibrated scale.
 * Decoration layers are consumed by BOTH SVG painting and MIRTakeoff.measureFace.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRPlanLayout=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const finite=Number.isFinite;
  const bbox=poly=>[Math.min(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[1]))];
  const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const key=(f,id)=>`${f}:${id}`;
  const validPoly=p=>Array.isArray(p)&&p.length>=3&&p.every(v=>Array.isArray(v)&&v.length>=2&&v.slice(0,2).every(finite));
  function topOfWall(zone){
    const p=zone.polygon,b=bbox(p);
    // The reviewed five-point gable begins shoulder, apex, shoulder, bottom,
    // bottom. A band is only created when enabled; no automatic gable baseline.
    if(p.length===5&&p[1][1]<p[0][1]&&p[1][1]<p[2][1])return Math.max(p[0][1],p[2][1]);
    return b[1];
  }
  function materialSelection(config,materials){
    const m=(materials||[]).find(m=>m.id===config.materialId);
    const c=(m?.colors||[]).find(c=>typeof c==='object'&&c.id===config.colorId);
    return {materialId:m?.id||config.materialId||null,colorId:c?.id||null,
      color:/^#[\da-f]{6}$/i.test(c?.hex||'')?c.hex:c&&config.colorValueSource==='sampled_official_swatch_for_display'&&/^#[\da-f]{6}$/i.test(config.color||'')?config.color:'#d3d6cd',
      colorName:c?.name||null,colorSelectionStatus:c?'documented':'unassigned',brand:m?.brand||config.brand||null,colorValueSource:c?(config.colorValueSource||null):'neutral_placeholder',pattern:'plain'};
  }
  function decorateFace(face,state={},materials=[]){
    const originals=(face.zones||[]).filter(z=>!z.decorationType&&!String(z.id).startsWith('__mir-'));
    const output={...face,zones:originals.map(z=>({...z})),decorationWarnings:[]};
    const fpp=face.feetPerPixel;
    if(!(finite(fpp)&&fpp>0)){
      if(Object.keys(state.bands||{}).length||Object.keys(state.openingTrims||{}).length)output.decorationWarnings.push('Échelle absente : bandeaux et contours non reconstruits.');
      return output;
    }
    const px=inches=>inches/(fpp*12);
    for(const z of originals){
      const band=state.bands?.[key(face.key,z.id)];
      if(!band?.enabled||!validPoly(z.polygon))continue;
      if(!(finite(band.heightIn)&&band.heightIn>0)){output.decorationWarnings.push(`${z.name||z.id} : hauteur du bandeau à renseigner.`);continue;}
      const b=bbox(z.polygon),top=topOfWall(z),bottom=Math.min(b[3],top+px(band.heightIn));
      if(bottom<=top)continue;
      output.zones.push({id:`__mir-band-${z.id}`,name:`Bandeau · ${z.name||z.id}`,parent:z.id,kind:'trim',
        polygon:rect(b[0],top,b[2],bottom),selection:materialSelection(band,materials),
        decorationType:'band',decorationLayer:1,decorationKey:key(face.key,z.id),priority:1000,
        sourceZoneId:z.id,provenance:'Bandeau choisi au haut du mur; pignon : départ des rampants. Hauteur vers le bas, limitée au parent.'});
    }
    for(const opening of face.openings||[]){
      const trim=state.openingTrims?.[key(face.key,opening.id)];
      if(!trim||trim.mode==='none'||!['capping','material'].includes(trim.mode)||!validPoly(opening.polygon))continue;
      if(!(finite(trim.faceWidthIn)&&trim.faceWidthIn>0)){output.decorationWarnings.push(`${opening.id} : largeur apparente du contour à renseigner.`);continue;}
      const [x0,y0,x1,y1]=bbox(opening.polygon),w=px(trim.faceWidthIn);
      const sides=[['top',rect(x0-w,y0-w,x1+w,y0)],['left',rect(x0-w,y0,x0,y1)],['right',rect(x1,y0,x1+w,y1)]];
      if(opening.type!=='door')sides.push(['bottom',rect(x0-w,y1,x1+w,y1+w)]);
      if(opening.polygon.length!==4)output.decorationWarnings.push(`${opening.id} : contour proposé autour de la boîte englobante, à valider.`);
      // Copies clip to each existing zone; analytic paint attribution deduplicates
      // intersections. Thus no trim area is invented outside the facade body.
      for(const [side,polygon] of sides)for(const parent of originals){
        if(!validPoly(parent.polygon))continue;
        const a=bbox(polygon),b=bbox(parent.polygon);
        if(a[2]<=b[0]||a[0]>=b[2]||a[3]<=b[1]||a[1]>=b[3])continue;
        output.zones.push({id:`__mir-trim-${opening.id}-${side}-${parent.id}`,name:`Contour ${opening.id} · ${side}`,
          parent:parent.id,kind:'trim',polygon,selection:materialSelection(trim,materials),decorationType:'opening-trim',
          decorationLayer:2,decorationKey:key(face.key,opening.id),priority:1000,sourceOpeningId:opening.id,side,
          trimMode:trim.mode,provenance:'Largeur apparente choisie; encadrement extérieur à la baie, trois côtés pour une porte. Clip au corps de façade.'});
      }
    }
    return output;
  }
  function normaliseLines(lines){
    const seen=new Set();
    return (Array.isArray(lines)?lines:[]).filter(x=>x&&finite(x.position)&&x.position>0&&x.position<1).map((x,i)=>({id:String(x.id||`joint-${i+1}`),position:x.position})).sort((a,b)=>a.position-b.position).filter(x=>{const rounded=Math.round(x.position*1e8);if(seen.has(rounded))return false;seen.add(rounded);return true;});
  }
  function inches(value){
    if(!finite(value))return 'À calibrer';
    const sign=value<0?'−':'',n=Math.round(Math.abs(value)*16),whole=Math.floor(n/16);let numerator=n%16,denominator=16;
    while(numerator&&numerator%2===0){numerator/=2;denominator/=2;}
    return `${sign}${whole||!numerator?whole:''}${numerator?`${whole?' ':''}${numerator}/${denominator}`:''} po`;
  }
  function snapPoint(point,face,threshold=10){
    const xs=[],ys=[];
    for(const item of [...(face.zones||[]),...(face.openings||[])])if(validPoly(item.polygon))for(const [x,y] of item.polygon){xs.push(x);ys.push(y);}
    const snap=(v,values)=>values.reduce((best,n)=>Math.abs(n-v)<Math.abs(best-v)&&Math.abs(n-v)<=threshold?n:best,v+threshold+.0001);
    const x=snap(point.x,xs),y=snap(point.y,ys);
    return {x:Math.abs(x-point.x)<=threshold?x:point.x,y:Math.abs(y-point.y)<=threshold?y:point.y};
  }
  function alignAccentToWindow(polygon,face,parent,{enabled=true}={}){
    const unchanged={polygon,aligned:false,reason:enabled?'no-nearby-window':'disabled'};
    if(!enabled||!validPoly(polygon)||!validPoly(parent?.polygon))return unchanged;
    const b=bbox(polygon),p=bbox(parent.polygon),cx=(b[0]+b[2])/2,width=b[2]-b[0],height=b[3]-b[1];
    if(!(width>0&&height>0))return unchanged;
    const candidates=[];
    for(const opening of face.openings||[]){
      if(opening.type!=='window'||!validPoly(opening.polygon))continue;
      const w=bbox(opening.polygon),windowWidth=w[2]-w[0],windowHeight=w[3]-w[1],windowCentre=(w[0]+w[2])/2;
      const overlap=Math.min(b[2],w[2])-Math.max(b[0],w[0]);
      const sameParent=Math.min(p[2],w[2])>Math.max(p[0],w[0]);
      const centresOverlap=(windowCentre>=b[0]&&windowCentre<=b[2])||(cx>=w[0]&&cx<=w[2]);
      const gap=w[1]-b[3],maximumGap=Math.max(height*3,windowHeight,(p[3]-p[1])*.25);
      if(!sameParent||overlap<=0||(!centresOverlap&&overlap<Math.min(width,windowWidth)*.4)||b[1]>=w[1]||gap<-Math.max(2,height*.1)||gap>maximumGap)continue;
      candidates.push({opening,bounds:w,gap:Math.max(0,gap),score:Math.hypot(windowCentre-cx,Math.max(0,gap)),windowWidth});
    }
    candidates.sort((a,b)=>a.score-b.score);
    if(!candidates.length)return unchanged;
    const best=candidates[0],second=candidates[1];
    // A broad accent between two plausible windows must not silently choose one.
    if(second&&second.score-best.score<=Math.max(8,Math.min(best.windowWidth,second.windowWidth)*.25))return {...unchanged,reason:'ambiguous-windows',candidateIds:candidates.map(c=>c.opening.id)};
    const [x0,,x1]=best.bounds,y0=b[1],y1=Math.min(b[3],best.bounds[1]);
    if(y1<=y0)return unchanged;
    return {polygon:rect(x0,y0,x1,y1),aligned:true,openingId:best.opening.id,reason:'window-bounds',
      alignment:{method:'window-bounds-at-accent-creation',openingId:best.opening.id,parentClip:true,originalBounds:b,windowBounds:best.bounds}};
  }
  function splitPositions(length,maximum){
    if(!(finite(length)&&length>0&&finite(maximum)&&maximum>0))return [];
    const count=Math.ceil(length/maximum);
    return Array.from({length:Math.max(0,count-1)},(_,i)=>({id:`auto-${i+1}`,position:(i+1)/count}));
  }
  return Object.freeze({version:'1.1.0',decorateFace,topOfWall,normaliseLines,inches,snapPoint,alignAccentToWindow,splitPositions,bbox});
});
