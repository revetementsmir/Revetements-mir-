package ca.revetementsmir.equipe.test;

/** Read-only measurements of the real field iframe, never a replacement page. */
final class MirPliageCompactProbe {
 private MirPliageCompactProbe() {}
 static final String SCRIPT = """
 (()=>{
  const frame=document.querySelector('#field-drawing-frame');
  if(!frame?.contentDocument)return {ready:false};
  const d=frame.contentDocument,w=frame.contentWindow,state=w.MIRProductionWorkspace?.getLivePreviewState();
  if(!state)return {ready:false};
  const fr=frame.getBoundingClientRect(),head=document.querySelector('#field-header')?.getBoundingClientRect(),nav=document.querySelector('#portal-navigation')?.getBoundingClientRect();
  const box=n=>n?.getBoundingClientRect().toJSON()||null;
  const sx=fr.width/frame.offsetWidth,sy=fr.height/frame.offsetHeight;
  const visible=n=>{
   if(!n||n.closest('[hidden]'))return false;
   const r=n.getBoundingClientRect(),x=fr.left+(frame.clientLeft+r.left+r.width/2)*sx,y=fr.top+(frame.clientTop+r.top+r.height/2)*sy;
   return r.width>0&&r.height>0&&r.left>=-1&&r.top>=-1&&r.right<=w.innerWidth+1&&r.bottom<=w.innerHeight+1&&
    fr.top+(frame.clientTop+r.top)*sy>=(head?.bottom||0)-1&&fr.top+(frame.clientTop+r.bottom)*sy<=(nav?.top||innerHeight)+1&&document.elementFromPoint(x,y)===frame;
  };
  const control=selector=>{
   const n=d.querySelector(selector),r=n?.getBoundingClientRect(),hit=r&&d.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   return {selector,exists:!!n,visible:visible(n),hit:!!hit&&(hit===n||n.contains(hit)),rect:box(n),value:n?.value,disabled:!!n?.disabled,readOnly:!!n?.readOnly,inputMode:n?.inputMode||'',text:n?.textContent.trim()};
  };
  const sides=[...d.querySelectorAll('.client-measure-field input')].map(n=>({...control(n.hasAttribute('data-segment-length')?'[data-segment-length="'+n.dataset.segmentLength+'"]':'[data-measure="'+n.dataset.measure+'"]'),label:n.closest('label').querySelector('.letter-label b')?.textContent,index:Number(n.dataset.segmentLength)}));
  const angles=[...d.querySelectorAll('[data-client-bend-angle]')].map(n=>({...control('[data-client-bend-angle="'+n.dataset.clientBendAngle+'"]'),index:Number(n.dataset.clientBendAngle)}));
  const markers=[...d.querySelectorAll('#production-drawing .profile-side-marker')].map(n=>{
   const text=n.querySelector('text'),style=text&&w.getComputedStyle(text),matrix=text?.getScreenCTM(),scale=matrix?Math.hypot(matrix.c,matrix.d):0,rect=box(text),g=n.querySelector('g'),point=g?.transform.baseVal.consolidate()?.matrix;
   return {label:n.dataset.markerLabel,caption:text?.textContent,rect,visible:visible(text),fontCssPx:parseFloat(style?.fontSize||0)*scale,stroke:style?.stroke,strokeCssPx:style?.stroke==='none'?0:parseFloat(style?.strokeWidth||0)*(style?.vectorEffect==='non-scaling-stroke'?1:scale),anchor:[Number(n.dataset.anchorX),Number(n.dataset.anchorY)],start:[Number(n.dataset.segmentStartX),Number(n.dataset.segmentStartY)],end:[Number(n.dataset.segmentEndX),Number(n.dataset.segmentEndY)],center:point?[point.e,point.f]:null};
  });
  const paths=[...d.querySelectorAll('#production-drawing svg>path')].map(n=>{const style=w.getComputedStyle(n),matrix=n.getScreenCTM(),scale=matrix?Math.hypot(matrix.a,matrix.b):0;return {stroke:style.stroke,strokeCssPx:parseFloat(style.strokeWidth||0)*(style.vectorEffect==='non-scaling-stroke'?1:scale)};}).filter(n=>n.stroke!=='none'&&n.stroke!=='transparent');
  const overlap=(a,b)=>a&&b&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
  const containers=['.production-workspace','.config-card','#client-step-scroll','#production-dimensions'].map(selector=>{const n=d.querySelector(selector);return n?{selector,height:n.clientHeight,scrollHeight:n.scrollHeight,scrollTop:n.scrollTop,overflowY:w.getComputedStyle(n).overflowY}:null;}).filter(Boolean);
  const dimensions=d.querySelector('#production-dimensions'),diagram=d.querySelector('#production-drawing');
  return {ready:true,stage:d.body.dataset.clientStage,fieldShell:document.body.dataset.fieldShell,fieldPliage:d.documentElement.dataset.fieldPliage03,
   parent:{width:innerWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight,scrollY,header:head?.toJSON(),navigation:nav?.toJSON()},
   frame:{rect:fr.toJSON(),width:w.innerWidth,height:w.innerHeight,scrollY:w.scrollY,documentHeight:d.documentElement.scrollHeight,bodyHeight:d.body.scrollHeight},
   noScroll:document.documentElement.scrollHeight<=innerHeight+1&&d.documentElement.scrollHeight<=w.innerHeight+1&&Math.abs(w.scrollY)<1&&containers.every(n=>!/(auto|scroll)/.test(n.overflowY)||n.scrollHeight<=n.height+1),containers,
   duplicateNativeBanner:!!d.querySelector('#mir-native-state')?.getClientRects().length,
   diagram:{rect:box(diagram),visible:visible(diagram)},dimensions:box(dimensions),sides,angles,markers,paths,
   labelsOverlap:markers.some((a,i)=>markers.slice(i+1).some(b=>overlap(a.rect,b.rect))),
   minusPlus:d.querySelectorAll('[data-client-angle-nudge],[data-client-angle-step]').length,
   controls:{undo:control('[data-drawing-undo]'),restart:control('#client-new-trace'),continue:control('[data-draw-tool="draw"]'),back:control('#client-step-back'),next:control('#client-step-next'),pageBack:control('[data-field-measure-page-step="-1"]'),pageNext:control('[data-field-measure-page-step="1"]')},
   page:{number:Number(dimensions?.dataset.fieldMeasurePage||1),count:Number(dimensions?.dataset.fieldMeasurePageCount||1),range:d.querySelector('#client-measure-page-range')?.textContent||''},
   model:{valid:state.model.valid,points:state.model.pointsMM,segments:state.model.segments?.map(s=>({label:s.label,lengthMM:s.lengthMM})),bends:state.model.bends?.map(b=>({mode:b.mode,angle:b.angle,turnDeg:b.turnDeg}))},
   focused:{tag:d.activeElement?.tagName,measure:d.activeElement?.dataset.segmentLength,angle:d.activeElement?.dataset.clientBendAngle,visible:visible(d.activeElement),rect:box(d.activeElement)},
   cartIds:window.MIRUnifiedOrderCart?.list().map(row=>row.id)||[]
  };
 })()
 """;
}
