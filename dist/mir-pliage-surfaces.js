/* MIR Pliage 03 — pure, opt-in projected surface marks.
 * These are annotations of a directed sheet section, never a material colour,
 * a bend allowance or a fabrication radius. No model or source point is edited.
 *
 * surfacePaths(projectedPoints, {
 *   offset: 3, handedness: -1, miterLimit: 4,
 *   section: MIRProduction.profileSectionPath(projectedPoints, model.bends),
 *   bends: model.bends
 * }) returns {left, right, centerline, geometry, diagnostics}.
 * `left`/`right` are SVG d strings. handedness=-1 is the existing Y-down SVG
 * projection of physical X-right/Y-up coordinates; use +1 for a Y-up plot.
 * Supply the existing section to preserve its separated/rounded hems. Raw
 * antiparallel points alone cannot describe the two physical hem surfaces.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRPliageSurfaces=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const EPS=1e-8;
 const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
 const mul=(a,k)=>[a[0]*k,a[1]*k];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
 const size=a=>Math.hypot(a[0],a[1]);
 const normal=a=>[-a[1],a[0]];
 const midpoint=(a,b)=>mul(add(a,b),.5);
 const equal=(a,b)=>size(sub(a,b))<EPS;
 const number=n=>String(Number(n.toFixed(7)));
 const xy=p=>p.map(number).join(' ');
 function point(value){
  if(!Array.isArray(value)||value.length!==2||!value.every(Number.isFinite))throw new TypeError('SURFACE_POINTS: finite 2D points are required.');
  return value.slice();
 }
 function line(from,to,index){return {type:'line',from:from.slice(),to:to.slice(),sourceSegment:index};}
 function arc(from,to,center,radius,sweep,extra={}){return {type:'arc',from:from.slice(),to:to.slice(),center:center.slice(),radius,sweep,...extra};}
 function path(primitives){
  if(!primitives.length)return '';
  return 'M'+xy(primitives[0].from)+primitives.map(p=>p.type==='arc'
   ?' A'+number(p.radius)+' '+number(p.radius)+' 0 0 '+p.sweep+' '+xy(p.to)
   :' L'+xy(p.to)).join('');
 }
 function surfacePaths(input,options={}){
  if(!Array.isArray(input)||input.length<2)throw new TypeError('SURFACE_POINTS: at least two points are required.');
  const points=input.map(point),requestedOffset=options.offset===undefined?3:options.offset;
  const handedness=options.handedness===undefined?-1:options.handedness,miterLimit=options.miterLimit===undefined?4:options.miterLimit;
  if(!Number.isFinite(requestedOffset)||requestedOffset<=0)throw new RangeError('SURFACE_OFFSET: a positive display offset is required.');
  if(![1,-1].includes(handedness))throw new RangeError('SURFACE_HANDEDNESS: use +1 or -1.');
  if(!Number.isFinite(miterLimit)||miterLimit<1)throw new RangeError('SURFACE_MITER_LIMIT: use a finite limit of at least 1.');
  const supplied=options.section?.segments,bends=options.bends||[];
  if(supplied&&(!Array.isArray(supplied)||supplied.length!==points.length-1))throw new TypeError('SURFACE_SECTION: one directed run per source segment is required.');
  const runs=points.slice(0,-1).map((p,i)=>{
   const original=sub(points[i+1],p),length=size(original);
   if(length<=EPS)throw new RangeError('SURFACE_SEGMENT: zero-length segments cannot define a surface.');
   const pair=supplied?supplied[i]:[p,points[i+1]];
   if(!Array.isArray(pair)||pair.length!==2)throw new TypeError('SURFACE_SECTION: each run needs two endpoints.');
   const a=point(pair[0]),b=point(pair[1]),delta=sub(b,a),distance=size(delta);
   if(distance<=EPS||dot(delta,original)/(distance*length)<1-1e-7)throw new RangeError('SURFACE_SECTION: source orientation must be preserved.');
   return {a,b,u:mul(delta,1/distance),index:i};
  });
  const warnings=new Set(),returns=new Map();
  let offset=requestedOffset;
  for(let i=0;i<runs.length-1;i++){
   const run=runs[i],next=runs[i+1];
   if(equal(run.b,next.a))continue;
   if(!supplied||bends[i]?.mode!=='hem')throw new RangeError('SURFACE_SECTION: a separated join must be an explicit hem.');
   const center=midpoint(run.b,next.a),radius=size(sub(run.b,center));
   const radial=mul(sub(run.b,center),1/radius),sweep=dot(normal(radial),run.u)>0?1:0;
   if(Math.abs(dot(radial,run.u))>1e-6||dot(run.u,next.u)>-1+1e-6)throw new RangeError('SURFACE_SECTION: the hem must be a tangent half-circle.');
   returns.set(i,{center,radius,sweep});
   offset=Math.min(offset,radius*.8);
  }
  if(offset<requestedOffset-EPS)warnings.add('OFFSET_REDUCED_FOR_RETURN');
  const centerline=[];
  runs.forEach((run,i)=>{
   centerline.push(line(run.a,run.b,i));
   const hem=returns.get(i);
   if(hem)centerline.push(arc(run.b,runs[i+1].a,hem.center,hem.radius,hem.sweep,{sourceBend:i,hem:true}));
  });
  function sideGeometry(side){
   const distance=(side==='left'?1:-1)*handedness*offset;
   const lines=runs.map(run=>{const shift=mul(normal(run.u),distance);return line(add(run.a,shift),add(run.b,shift),run.index);});
   const joins=new Map();
   for(let i=0;i<runs.length-1;i++){
    const run=runs[i],next=runs[i+1],before=lines[i],after=lines[i+1],hem=returns.get(i);
    if(hem){
     const sign=hem.sweep?1:-1,radius=hem.radius-sign*distance;
     joins.set(i,arc(before.to,after.from,hem.center,radius,hem.sweep,{sourceBend:i,hem:true}));
     continue;
    }
    const turn=cross(run.u,next.u),alignment=dot(run.u,next.u),joint=run.b;
    if(Math.abs(turn)<EPS&&alignment>0){const shared=midpoint(before.to,after.from);before.to=shared;after.from=shared.slice();continue;}
    if(Math.abs(turn)<EPS&&alignment<0){
     // There is no supplied hem separation/radius. The round connection is
     // explicitly schematic, not a claim about the manufactured inside face.
     warnings.add('UNRESOLVED_RETURN_GEOMETRY');
     const physical=bends[i]?.direction==='left'?1:bends[i]?.direction==='right'?-1:1;
     const sweep=physical*handedness>0?1:0;
     joins.set(i,arc(before.to,after.from,joint,offset,sweep,{sourceBend:i,schematicReturn:true}));
     continue;
    }
    if(turn*distance<0){
     joins.set(i,arc(before.to,after.from,joint,offset,turn>0?1:0,{sourceBend:i,join:true}));
     continue;
    }
    const t=cross(sub(after.from,before.to),next.u)/turn;
    const intersection=add(before.to,mul(run.u,t));
    if(size(sub(intersection,joint))<=offset*miterLimit+EPS){before.to=intersection;after.from=intersection.slice();}
    else{
     warnings.add('MITER_LIMIT_REACHED');
     joins.set(i,{...line(before.to,after.from,null),sourceBend:i,bevel:true});
    }
   }
   const result=[];
   lines.forEach((p,i)=>{
    result.push(p);
    if(joins.has(i))result.push(joins.get(i));
   });
   return result;
  }
  let left=sideGeometry('left'),right=sideGeometry('right'),reduction=1;
  // A short real run must never reverse because the two nearby inside joins
  // consume its display offset. Reduce the same offset on both whole surfaces.
  // Join trims are linear in the offset, so this retains at least 20% of a run.
  for(const pieces of [left,right])for(const piece of pieces){
   if(piece.type!=='line'||piece.sourceSegment===null||piece.sourceSegment===undefined)continue;
   const run=runs[piece.sourceSegment],length=size(sub(run.b,run.a));
   const remaining=dot(sub(piece.to,piece.from),run.u);
   if(remaining<=length*.05)reduction=Math.min(reduction,.8*length/(length-remaining));
  }
  if(reduction<1){offset*=reduction;warnings.add('OFFSET_REDUCED_FOR_SHORT_SEGMENT');left=sideGeometry('left');right=sideGeometry('right');}
  return {
   left:path(left),right:path(right),centerline:path(centerline),
   geometry:{centerline,left,right},
   diagnostics:{requestedOffset,appliedOffset:offset,handedness,sourceSegments:runs.length,resolvedReturns:returns.size,
    fabricationRadiusKnown:false,warnings:[...warnings]}
  };
 }
 function markerSVG(result,{side,strokeWidth=3}={}){
  if(!['left','right'].includes(side))return '';
  if(!result||typeof result[side]!=='string'||!/^M[-+\d.eE AL,]+$/.test(result[side]))throw new TypeError('SURFACE_MARKER: surfacePaths output is required.');
  if(!Number.isFinite(strokeWidth)||strokeWidth<=0)throw new RangeError('SURFACE_MARKER: a positive stroke width is required.');
  return '<path class="mir-pliage-painted-surface" data-painted-side="'+side+'" d="'+result[side]+'" fill="none" stroke="#175b94" stroke-width="'+number(strokeWidth)+'" stroke-linejoin="round" stroke-linecap="round" pointer-events="none" aria-hidden="true"/>';
 }
 return Object.freeze({version:'1.0.0',surfacePaths,markerSVG});
});
