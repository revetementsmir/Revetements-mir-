/* Exterior contours are source facts with explicit review, not four facade slots.
 * Model XY is metres, source XY is the upright cropped view's pixels; Z is up. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MIRLevelModel=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x)),finite=x=>typeof x==='number'&&Number.isFinite(x),positive=x=>finite(x)&&x>0;
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const signedArea=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function intersects(a,b,c,d){
    const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-8&&p[0]>=Math.min(a[0],b[0])-1e-8&&p[0]<=Math.max(a[0],b[0])+1e-8&&p[1]>=Math.min(a[1],b[1])-1e-8&&p[1]<=Math.max(a[1],b[1])+1e-8;
    return cross(a,b,c)*cross(a,b,d)<-1e-12&&cross(c,d,a)*cross(c,d,b)<-1e-12||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
  }
  function validatePolygon(points){
    if(!Array.isArray(points)||points.length<3||points.length>200)return ['POINT_COUNT'];
    if(points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(finite)||p.some(n=>Math.abs(n)>1e6)))return ['POINT_INVALID'];
    const errors=[];
    if(points.some((p,i)=>distance(p,points[(i+1)%points.length])<.001))errors.push('EDGE_ZERO');
    if(Math.abs(signedArea(points))<.001)errors.push('AREA_ZERO');
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(j!==i+1&&!(i===0&&j===points.length-1)&&intersects(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))errors.push('SELF_INTERSECTION');
    return [...new Set(errors)];
  }
  const established=m=>!!m&&m.status==='confirmed'&&finite(m.value)&&m.kind!=='hypothesis';
  function referenceAssessment(view,provided=[]){
    const cal=view.calibration||view.payload?.calibration||{},refs=[];
    for(const r of [...provided,...(cal.evidence||[])]){
      if(r.sourceViewId&&r.sourceViewId!==view.id)continue;
      if(r.kind==='hypothesis')continue;
      const value=positive(r.value)?r.value:positive(r.referenceFt)?r.referenceFt*.3048:null,anchors=r.anchors;
      if(!value||anchors?.length!==2||!anchors.every(p=>p.length===2&&p.every(finite))||distance(...anchors)<2||r.ocrConfidence!=null&&r.ocrConfidence<70)continue;
      const delta=anchors[1].map((n,i)=>Math.abs(n-anchors[0][i])),axis=delta[0]>delta[1]*4?'x':delta[1]>delta[0]*4?'y':'diagonal';
      const scale=value/distance(...anchors),key=anchors.flat().map(n=>n.toFixed(2)).join(':')+':'+value;
      if(!refs.some(x=>x.key===key))refs.push({key,value,anchors:clone(anchors),scale,axis,kind:r.kind||'written',sourceViewId:view.id,label:r.label||r.normalized||r.text||'',status:r.status||'proposed'});
    }
    if(!refs.length&&positive(cal.referenceFt)&&cal.anchors?.length===2&&!['conflict','low_confidence'].includes(cal.status))return referenceAssessment({...view,calibration:{evidence:[]}},[{value:cal.referenceFt*.3048,anchors:cal.anchors,label:cal.provenance}]);
    const spread=rs=>rs.length?Math.max(...rs.map(r=>r.scale))/Math.min(...rs.map(r=>r.scale))-1:0;
    const withinAxisConflict=['x','y','diagonal'].some(axis=>spread(refs.filter(r=>r.axis===axis))>.05);
    const x=refs.find(r=>r.axis==='x'),y=refs.find(r=>r.axis==='y'),deformed=!!(x&&y&&Math.abs(x.scale/y.scale-1)>.05);
    const sourceConflict=cal.status==='conflict'&&!provided.length;
    const conflict=withinAxisConflict||sourceConflict||!deformed&&spread(refs)>.05;
    const chosen=refs[0]||null; // Documented reference, never a silent average.
    return {references:refs,scale:!conflict&&!deformed?chosen?.scale||null:null,chosen,spread:spread(refs),conflict,deformed,status:conflict?'conflict':deformed?'deformed':refs.length>1?'cross_checked':refs.length?'single_reference':'not_found'};
  }
  function pdfPoint(view,p){const m=view.frame?.pdfToRaster,c=view.frame?.cropToRaster;if(!m||!c)return null;const det=m[0]*m[3]-m[1]*m[2];if(!det)return null;const x=p[0]+c[4]-m[4],y=p[1]+c[5]-m[5];return [(x*m[3]-y*m[2])/det,(y*m[0]-x*m[1])/det];}
  function estimateSegment(view,anchors,provided=[]){
    const assessment=referenceAssessment(view,provided),valid=anchors?.length===2&&anchors.every(p=>p.length===2&&p.every(finite));
    return {kind:'estimated-calibrated',status:assessment.scale&&valid?'proposed':assessment.status,value:assessment.scale&&valid?distance(...anchors)*assessment.scale:null,
      sourceViewId:view.id,sourceFrame:clone(view.frame||null),anchors:valid?clone(anchors):[],pdfAnchors:valid?anchors.map(p=>pdfPoint(view,p)):[],
      scaleUsed:assessment.scale,references:assessment.references,assessment,
      range:assessment.scale&&valid?['min','max'].map(op=>Math[op](...assessment.references.map(r=>r.scale))*distance(...anchors)):null,confirmationRequired:true};
  }
  function dimensionCandidates(inventory,level,field,links=[]){
    const linked=new Set(links.filter(l=>l.status==='confirmed').map(l=>l.sourceViewId));
    const views=inventory.views.filter(v=>v.buildingId===level.buildingId&&(v.kind==='floor'&&v.levelId===level.sourceLevel||v.levelId===level.sourceLevel||linked.has(v.id)));
    return views.flatMap(v=>(v.evidence||[]).filter(e=>e.field===field||field==='depth'&&e.field==='width'&&v.kind==='elevation'&&['right','left'].includes(v.direction)).map(e=>({
      ...clone(e),sourceViewId:v.id,kind:e.estimated||e.method==='cote horizontale entre les repères extérieurs'?'estimated-calibrated':'written',status:'proposed',
      levelConfirmed:v.kind==='floor'&&v.levelId===level.sourceLevel||v.levelId===level.sourceLevel,
      warning:v.kind==='elevation'&&field==='wallHeight'?'verify-level-height-not-total-building':null,
      compatibility:{buildingId:level.buildingId,levelId:level.id,explicitLink:linked.has(v.id)},confirmationRequired:true
    })));
  }
  function scale(draft){const r=draft.reference;return positive(r?.value)&&r.anchors?.length===2&&distance(...r.anchors)>1?r.value/distance(...r.anchors):null;}
  function modelPoints(draft){const s=scale(draft),a=draft.alignment||{},origin=a.origin||[0,0],offset=a.offset||[0,0],r=(a.rotationDegrees||0)*Math.PI/180;return s?draft.points.map(p=>{const x=(p.xy[0]-origin[0])*s,y=-(p.xy[1]-origin[1])*s;return [x*Math.cos(r)-y*Math.sin(r)+offset[0],x*Math.sin(r)+y*Math.cos(r)+offset[1]];}):[];}
  const wallId=(contourId,a,b)=>'wall:'+contourId+':'+[a,b].sort().join(':');
  function draftFor(view,level){
    const c=view?.calibration,assessment=view&&referenceAssessment(view),usable=!!assessment?.scale;
    return {version:1,contourId:'contour:'+level.id,sourceViewId:view?.id||null,points:[],edgeMeasures:{},
      reference:{value:usable?assessment.chosen.value:null,anchors:usable?clone(assessment.chosen.anchors):[],kind:'written',status:'proposed',sourceViewId:view?.id||null,label:'',sourceCalibration:clone(c||{}),assessment:assessment||null,controlReferences:[]},
      height:{value:null,kind:'user-measurement',status:'unresolved',sourceViewId:null,label:''},
      base:{value:0,kind:'local-datum',status:'proposed',label:'local level datum, not an inferred ground floor'},
      alignment:{origin:null,offset:[0,0],rotationDegrees:0,status:'proposed',kind:'user-registration'},links:[],status:'draft'};
  }
  function validateDraft(draft,inventory,level,{confirm=false}={}){
    const errors=[],view=inventory.views.find(v=>v.id===draft.sourceViewId);
    if(draft.version!==1)errors.push('SCHEMA');
    if(draft.sourceViewId&&(!view||view.buildingId!==level.buildingId||view.kind!=='floor'||view.levelId!==level.sourceLevel))errors.push('SOURCE_LEVEL');
    if(!draft.points?.every(p=>p.id&&p.xy?.length===2)||new Set(draft.points?.map(p=>p.id)).size!==draft.points?.length)errors.push('POINT_ID');
    if(!scale(draft))errors.push('SCALE_UNKNOWN');
    const points=modelPoints(draft);errors.push(...validatePolygon(points));
    if(confirm&&!established(draft.reference))errors.push('REFERENCE_UNCONFIRMED');
    if(view&&draft.reference?.controlReferences?.length){const assessment=referenceAssessment({...view,calibration:{}},[draft.reference,...draft.reference.controlReferences]);if(assessment.conflict)errors.push('REFERENCE_CONFLICT');if(assessment.deformed)errors.push('RASTER_DEFORMED');}
    if(!positive(draft.height?.value)||confirm&&!established(draft.height))errors.push('HEIGHT_UNKNOWN');
    if(!finite(draft.base?.value)||confirm&&!established(draft.base))errors.push('BASE_UNKNOWN');
    if(!draft.alignment?.origin?.every(finite)||draft.alignment.origin.length!==2||!draft.alignment.offset?.every(finite)||draft.alignment.offset.length!==2||!finite(draft.alignment.rotationDegrees)||confirm&&draft.alignment.status!=='confirmed')errors.push('ALIGNMENT_UNKNOWN');
    const validSources=new Set(inventory.views.filter(v=>v.buildingId===level.buildingId).map(v=>v.id));
    for(const item of [draft.reference,draft.height,...(draft.links||[])])if(item?.sourceViewId&&!validSources.has(item.sourceViewId))errors.push('SOURCE_BUILDING');
    for(const item of [draft.reference,draft.height])if(['written','estimated-calibrated'].includes(item?.kind)&&!item.sourceViewId)errors.push('SOURCE_BUILDING');
    for(const item of [draft.reference,draft.height])if(item?.kind==='written'&&!item.label?.trim())errors.push('MEASUREMENT_LABEL');
    if(draft.height?.kind==='estimated-calibrated'&&(!positive(draft.height.scaleUsed)||draft.height.anchors?.length!==2||!draft.height.references?.length))errors.push('HEIGHT_UNKNOWN');
    if(draft.height?.kind==='estimated-calibrated'&&positive(draft.height.scaleUsed)&&draft.height.anchors?.length===2&&draft.height.references?.length){
      const a=referenceAssessment({id:draft.height.sourceViewId,calibration:{}},draft.height.references);
      if(a.conflict)errors.push('REFERENCE_CONFLICT');if(a.deformed)errors.push('RASTER_DEFORMED');
      if(!a.scale||Math.abs(a.scale/draft.height.scaleUsed-1)>.01||Math.abs(distance(...draft.height.anchors)*draft.height.scaleUsed-draft.height.value)>.01)errors.push('HEIGHT_UNKNOWN');
    }
    for(let i=0;i<points.length;i++){
      const id=wallId(draft.contourId,draft.points[i].id,draft.points[(i+1)%points.length].id),m=draft.edgeMeasures?.[id];
      if(positive(m?.value)&&m.kind!=='hypothesis'&&Math.abs(distance(points[i],points[(i+1)%points.length])-m.value)>Math.max(.02,m.value*.01))errors.push('DIMENSION_CONFLICT');
    }
    return [...new Set(errors)];
  }
  function confirmDraft(draft,inventory,level){
    const errors=validateDraft(draft,inventory,level,{confirm:true});if(errors.length){const e=new Error(errors.join(', '));e.codes=errors;throw e;}
    const next=clone(draft),view=inventory.views.find(v=>v.id===draft.sourceViewId);next.status='confirmed';next.confirmation={method:'explicit-source-review',at:new Date().toISOString()};
    if(view){next.reference.pdfAnchors=next.reference.anchors.map(p=>pdfPoint(view,p));for(const p of next.points)p.pdfPoint=pdfPoint(view,p.xy);}
    return next;
  }
  function wallsFor(level,inventory){
    const c=level.contours?.find(c=>c.status==='confirmed');if(!c||validateDraft(c,inventory,level,{confirm:true}).length)return [];
    const p=modelPoints(c),orientation=Math.sign(signedArea(p)),z=c.base.value,h=c.height.value;
    return p.map((a,i)=>{const b=p[(i+1)%p.length],length=distance(a,b),id=wallId(c.contourId,c.points[i].id,c.points[(i+1)%p.length].id);
      return {id,wallId:id,levelId:level.id,buildingId:level.buildingId,contourId:c.contourId,sourceViewId:c.sourceViewId,
        pointIds:[c.points[i].id,c.points[(i+1)%p.length].id],from:a,to:b,length,height:h,base:z,
        poly:[[...a,z],[...b,z],[...b,z+h],[...a,z+h]],normal:[orientation*(b[1]-a[1])/length,orientation*(a[0]-b[0])/length,0],
        dimension:{kind:'estimated-calibrated',value:length,status:'confirmed',reference:clone(c.reference),written:clone(c.edgeMeasures?.[id]||null),anchors:[clone(c.points[i].xy),clone(c.points[(i+1)%p.length].xy)],sourceViewId:c.sourceViewId,scaleUsed:scale(c)},heightEvidence:clone(c.height),
        finish:clone(level.wallFinishes?.[id]||null),status:'confirmed-working-geometry',occlusionIndependent:true};
    });
  }
  function commitContour(inventory,levelId,draft){
    const next=clone(inventory),level=next.levels.find(l=>l.id===levelId);if(!level)throw Error('LEVEL_UNKNOWN');
    const confirmed=confirmDraft(draft,next,level),old=level.contours||[];
    level.contourHistory=[...(level.contourHistory||[]),...old].slice(-20);level.contours=[confirmed];delete level.contourDraft;
    level.wallPlanes=wallsFor(level,next);level.geometryRevision=(level.geometryRevision||0)+1;next.geometryVersion=1;return next;
  }
  function openingIssues(openings,walls){
    const issues=[],seen=new Set();
    for(const o of openings){const w=walls.find(w=>w.id===o.wallId),key=o.sourceId||o.id;
      if(seen.has(key))issues.push('OPENING_DUPLICATE');seen.add(key);
      if(!w)issues.push('OPENING_WALL');
      if(![o.offset,o.sill,o.width,o.height].every(finite)||o.width<=0||o.height<=0||o.offset<0||o.sill<0||w&&(o.offset+o.width>w.length+1e-6||o.sill+o.height>w.height+1e-6))issues.push('OPENING_BOUNDS');
    }
    return [...new Set(issues)];
  }
  function quantities(inventory,buildingId){
    const levels=inventory.levels.filter(l=>l.buildingId===buildingId),walls=levels.flatMap(l=>wallsFor(l,inventory));
    const openings=levels.flatMap(l=>l.wallOpenings||[]),issues=openingIssues(openings,walls),valid=issues.length===0;
    const rows=walls.map(w=>{const ops=openings.filter(o=>o.wallId===w.id&&o.status==='confirmed');
      // Union of rectangles, not sum: overlapping openings are deducted once.
      const xs=[...new Set(ops.flatMap(o=>[o.offset,o.offset+o.width]))].sort((a,b)=>a-b);let deduction=0;
      if(valid)for(let i=1;i<xs.length;i++){const spans=ops.filter(o=>o.offset<xs[i]&&o.offset+o.width>xs[i-1]).map(o=>[o.sill,o.sill+o.height]).sort((a,b)=>a[0]-b[0]);let top=-Infinity,covered=0;for(const [a,b]of spans){covered+=Math.max(0,b-Math.max(a,top));top=Math.max(top,b);}deduction+=(xs[i]-xs[i-1])*covered;}
      const openingsReviewed=levels.find(l=>l.id===w.levelId)?.openingsReviewed===true;
      return {wallId:w.id,levelId:w.levelId,grossM2:w.length*w.height,openingM2:valid?deduction:null,netM2:valid&&openingsReviewed?w.length*w.height-deduction:null,knownNetM2:valid?w.length*w.height-deduction:null,partial:!valid||!openingsReviewed,finish:w.finish};
    });
    return {rows,issues,grossM2:rows.reduce((s,r)=>s+r.grossM2,0),knownNetM2:valid?rows.reduce((s,r)=>s+r.knownNetM2,0):null,
      partial:!levels.length||levels.some(l=>!wallsFor(l,inventory).length)||rows.some(r=>r.partial)||openings.some(o=>o.status!=='confirmed'),
      scope:'contour-walls-only; never added to legacy elevation quantities',areaUnit:'m2',purchaseQuantities:null};
  }
  function scene(inventory,buildingId){
    const levels=inventory.levels.filter(l=>l.buildingId===buildingId),walls=levels.flatMap(l=>wallsFor(l,inventory)),quantitiesResult=quantities(inventory,buildingId);
    return {version:1,buildingId,walls,levels:levels.map(l=>({id:l.id,sourceLevel:l.sourceLevel,available:walls.some(w=>w.levelId===l.id)})),
      openings:levels.flatMap(l=>l.wallOpenings||[]).filter(o=>o.status==='confirmed'&&!openingIssues([o],walls).length),partial:quantitiesResult.partial,quantities:quantitiesResult};
  }
  // Monochrome enclosed-region proposal within a user-selected drawing area.
  // Coloured masks/legends never supply the boundary; open/ambiguous runs fail.
  function proposeRaster(image,region){
    const {width,height,data}=image,[rx,ry,rw,rh]=region.map(Math.round);if(rw<40||rh<40||rx<0||ry<0||rx+rw>width||ry+rh>height)return null;
    const step=Math.max(1,Math.ceil(Math.max(rw,rh)/600)),w=Math.floor(rw/step),h=Math.floor(rh/step),ink=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=((ry+y*step)*width+rx+x*step)*4,r=data[k],g=data[k+1],b=data[k+2];ink[y*w+x]=Math.max(r,g,b)-Math.min(r,g,b)<35&&Math.max(r,g,b)<130?1:0;}
    // Bridge small breaks along the actual wall direction, not filled colours.
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(!ink[y*w+x])for(const [dx,dy]of [[1,0],[0,1]])for(let gap=1;gap<=3;gap++)if(x-dx>=0&&y-dy>=0&&x+gap*dx<w&&y+gap*dy<h&&ink[(y-dy)*w+x-dx]&&ink[(y+gap*dy)*w+x+gap*dx]){for(let k=0;k<gap;k++)ink[(y+k*dy)*w+x+k*dx]=1;break;}
    const visited=new Uint8Array(w*h),regions=[];
    for(let seed=0;seed<ink.length;seed++)if(!ink[seed]&&!visited[seed]){const queue=[seed];visited[seed]=1;let edge=false;for(let q=0;q<queue.length;q++){const n=queue[q],x=n%w,y=Math.floor(n/w);if(x===0||y===0||x===w-1||y===h-1)edge=true;for(const m of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(m>=0&&!ink[m]&&!visited[m]){visited[m]=1;queue.push(m);}}if(!edge&&queue.length>w*h*.025)regions.push(queue);}
    regions.sort((a,b)=>b.length-a.length);if(!regions.length)return null;
    // An interior room alone does not establish an exterior footprint. Several
    // enclosed rooms can be proposed together for review only inside the area.
    const cells=new Set(regions.flat()),boundary=[];
    for(const n of cells){const x=n%w,y=Math.floor(n/w);if(!cells.has(n-w))boundary.push([[x,y],[x+1,y]]);if(!cells.has(n+1)||x===w-1)boundary.push([[x+1,y],[x+1,y+1]]);if(!cells.has(n+w))boundary.push([[x+1,y+1],[x,y+1]]);if(!cells.has(n-1)||x===0)boundary.push([[x,y+1],[x,y]]);}
    const byStart=new Map(boundary.map(e=>[e[0].join(','),e[1]])),loops=[];
    while(byStart.size){const start=byStart.keys().next().value;let key=start,loop=[],guard=0;do{const p=key.split(',').map(Number),next=byStart.get(key);if(!next)break;loop.push(p);byStart.delete(key);key=next.join(',');}while(key!==start&&guard++<w*h*4);if(key===start)loops.push(loop);}
    loops.sort((a,b)=>Math.abs(signedArea(b))-Math.abs(signedArea(a)));let p=loops[0];if(!p)return null;
    p=p.filter((b,i)=>Math.abs(cross(p[(i+p.length-1)%p.length],b,p[(i+1)%p.length]))>0);
    if(p.length>80||p.length<4)return null;
    return {points:p.map(([x,y])=>[rx+x*step,ry+y*step]),status:'proposed',method:'user-region-monochrome-enclosed-runs',exteriorUnverified:true,colourMasksUsed:false};
  }
  return Object.freeze({version:1,clone,distance,signedArea,validatePolygon,established,referenceAssessment,estimateSegment,dimensionCandidates,pdfPoint,scale,modelPoints,wallId,draftFor,validateDraft,confirmDraft,commitContour,wallsFor,openingIssues,quantities,scene,proposeRaster});
});
