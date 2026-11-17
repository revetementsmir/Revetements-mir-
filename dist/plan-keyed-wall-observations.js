/* Source observations for keyed exterior walls. No catalogue of buildings. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-import-core.js'):root.MIRPDFAnalysis);if(node)module.exports=api;else root.MIRKeyedWallObservations=api;})(typeof window==='object'?window:globalThis,function(M,A){
 'use strict';
 const copy=M.clone,finite=Number.isFinite,box=b=>b?.length===4&&b.every(finite)&&b[2]>b[0]&&b[3]>b[1],normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),sameFrame=(a,b)=>!!a&&!!b&&JSON.stringify(a)===JSON.stringify(b);
 function sourceImage(view,image){const size=[view?.payload?.sourceWidth||view?.zone?.[2]||view?.frame?.rasterSize?.[0],view?.payload?.sourceHeight||view?.zone?.[3]||view?.frame?.rasterSize?.[1]];return image?.data&&Number.isInteger(image.width)&&Number.isInteger(image.height)&&image.width>0&&image.height>0&&image.data.length===image.width*image.height*4&&size.every((n,i)=>n===[image.width,image.height][i]);}
 function inkFor(image){const ink=new Uint8Array(image.width*image.height),d=image.data;for(let i=0;i<ink.length;i++){const j=i*4,r=d[j],g=d[j+1],b=d[j+2];ink[i]=Number(d[j+3]>100&&r+g+b<630&&Math.max(r,g,b)-Math.min(r,g,b)<45);}return ink;}
 function wallNotes(view){
  if(view?.kind!=='floor'||!view.levelId)return [];
  const result=[];
  for(const row of view.payload?.drawingReadings?.rows||[]){const text=normal(row.text);if(!box(row.box)||row.source!=='pdf-text'&&!(row.confidence>=70)||!/\b(?:murets?|parapets?|privacy wall|guard wall|low wall)\b/.test(text)||/\b(?:coupe[ -]feu|firewall|retaining|soutenement)\b/.test(text))continue;
   const hit=text.match(/\b(?:hauteur|height|high)\s*[:=]?\s*(\d+(?:[.,]\d+)?(?:\s*['′’]\s*[-–]?\s*\d+(?:\s+\d+\/\d+)?\s*["″”]|\s*(?:["″”]|mm\b|cm\b|m\b|po\b|in\b|ft\b)))/),parsed=hit&&A.parseDimension(hit[1],{ocr:row.source!=='pdf-text'});if(!parsed||!(parsed.valueFt>0&&parsed.valueFt*.3048<=4))continue;
   if(result.some(n=>n.text===row.text&&n.textBox.every((x,i)=>Math.abs(x-row.box[i])<1)))continue;
   result.push({id:view.id+':wall-note:'+row.box.map(Math.round).join('-'),sourceViewId:view.id,sourceFrame:copy(view.frame),sourceLevel:view.levelId,text:row.text,textBox:row.box.slice(),value:parsed.valueFt*.3048,dimensionText:hit[1],kind:'written',status:'proposed',sourceReading:copy(row),confirmationRequired:true});
  }return result;
 }
 function keyFrames(image,{minimum=8,maximum=24}={}){
  const {width:w,height:h}=image,ink=inkFor(image),rows=[],frames=[];
  for(let y=0;y<h;y++){const runs=[];let start=null;for(let x=0;x<=w;x++){if(x<w&&ink[y*w+x]){if(start===null)start=x;}else if(start!==null){if(x-start>=minimum&&x-start<=maximum)runs.push([start,x-1]);start=null;}}rows.push(runs);}
  const support=(x,y0,y1)=>{let n=0;for(let y=y0;y<=y1;y++){let hit=false;for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w)hit||=!!ink[y*w+x+dx];n+=Number(hit);}return n/(y1-y0+1);};
  for(let y=0;y<h;y++)for(const[a,b]of rows[y])for(let bottom=y+Math.max(minimum,Math.round((b-a)*.8));bottom<Math.min(h,y+Math.round((b-a)*1.2)+1);bottom++)for(const[l,r]of rows[bottom]){
   if(Math.abs(a-l)>1||Math.abs(b-r)>1)continue;const left=Math.round((a+l)/2),right=Math.round((b+r)/2),sides=[support(left,y,bottom),support(right,y,bottom)];if(Math.min(...sides)<.9)continue;
   const rect=[Math.min(a,l),y,Math.max(b,r)+1,bottom+1];let n=0,total=0;for(let yy=y+2;yy<bottom-1;yy++)for(let x=rect[0]+2;x<rect[2]-2;x++){n+=ink[yy*w+x];total++;}const fraction=n/total;if(!total||fraction<.05||fraction>.65||frames.some(f=>Math.max(...rect.map((n,i)=>Math.abs(n-f.box[i])))<=2))continue;
   frames.push({id:'key-frame:'+rect.join('-'),box:rect,sideSupport:sides,method:'four-observed-neutral-small-frame-sides',interiorInkFraction:fraction,status:'observed'});
  }return frames;
 }
 function glyph(image,frame,ink){const [x,y,r,b]=frame.box,points=[];for(let yy=y+3;yy<b-3;yy++)for(let xx=x+3;xx<r-3;xx++)if(ink[yy*image.width+xx])points.push([xx,yy]);if(!points.length)return null;const l=Math.min(...points.map(p=>p[0])),t=Math.min(...points.map(p=>p[1])),rw=Math.max(...points.map(p=>p[0]))-l+1,rh=Math.max(...points.map(p=>p[1]))-t+1,out=[];for(let yy=0;yy<20;yy++)for(let xx=0;xx<20;xx++)out.push(ink[(t+Math.min(rh-1,Math.floor((yy+.5)*rh/20)))*image.width+l+Math.min(rw-1,Math.floor((xx+.5)*rw/20))]);return out;}
 function discover(inventory,buildingId,images,{maximumRegions=12}={}){
  const notes=[],regions=[],issues=[];
  for(const view of inventory.views.filter(v=>v.buildingId===buildingId&&v.kind==='floor')){const found=wallNotes(view),image=images[view.id];if(!found.length)continue;if(!sourceImage(view,image)){issues.push({sourceViewId:view.id,reason:'KEYED_WALL_SOURCE_FRAME_REQUIRED'});continue;}
   const font=found.map(n=>n.textBox[3]-n.textBox[1]).sort((a,b)=>a-b)[Math.floor(found.length/2)],frames=keyFrames(image,{minimum:Math.max(8,Math.floor(font*1.4)),maximum:Math.max(12,Math.ceil(font*4.4))}),glyphInk=inkFor(image),glyphs=new Map(frames.map(f=>[f.id,glyph(image,f,glyphInk)]));
   for(const note of found){const [l,t,r,b]=note.textBox,f=b-t,keys=frames.filter(k=>l-k.box[2]>0&&l-k.box[2]<f*4&&Math.abs(t+b-k.box[1]-k.box[3])/2<f&&k.box[3]-k.box[1]>f*1.5);if(keys.length!==1){issues.push({sourceViewId:view.id,noteId:note.id,reason:'WALL_NOTE_KEY_AMBIGUOUS'});continue;}
    const key=keys[0],g=glyphs.get(key.id),ranked=frames.filter(k=>glyphs.get(k.id)).map(k=>({frame:k,difference:g?glyphs.get(k.id).reduce((n,p,i)=>n+Number(p!==g[i]),0)/400:1})).sort((a,b)=>a.difference-b.difference);notes.push({...note,keyFrame:copy(key)});if(ranked.length>maximumRegions)issues.push({sourceViewId:view.id,noteId:note.id,reason:'KEYED_WALL_REGION_BUDGET',candidateCount:ranked.length,regionLimit:maximumRegions});
    for(const candidate of ranked.slice(0,maximumRegions)){const k=candidate.frame;if(regions.some(r=>r.sourceViewId===view.id&&r.frame.id===k.id))continue;const [x,y,r,b]=k.box;regions.push({id:view.id+':'+k.id,sourceViewId:view.id,sourceFrame:copy(view.frame),region:[x+2,y+2,r-x-4,b-y-4],frame:copy(k),noteId:note.id,candidateEvidence:{method:'glyph-similarity-selects-ocr-region-only',difference:candidate.difference,keyNotInferred:true},priority:k.id===key.id?0:candidate.difference});}
   }
  }
  regions.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));if(regions.length>maximumRegions)for(const region of regions.slice(maximumRegions))if(!issues.some(i=>i.sourceViewId===region.sourceViewId&&i.reason==='KEYED_WALL_REGION_BUDGET'))issues.push({sourceViewId:region.sourceViewId,reason:'KEYED_WALL_REGION_BUDGET',regionLimit:maximumRegions});return {notes,regions:regions.slice(0,maximumRegions),issues,complete:false};
 }
 function readKey(view,frame){
  const region=[frame.box[0]+2,frame.box[1]+2,frame.box[2]-frame.box[0]-4,frame.box[3]-frame.box[1]-4],same=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((n,i)=>n===b[i]),rows=view.payload?.drawingReadings?.keyedWallKeys||[],at=rows.filter(r=>r.frameId===frame.id&&r.sourceViewId===view.id&&sameFrame(r.sourceFrame,view.frame));
  if(at.some(r=>r.status==='conflict'))return null;
  const usable=at.filter(r=>r.status==='proposed'&&r.confidence>=70&&same(r.box,frame.box)&&same(r.region,region)&&r.nativeSource?.method==='retained-pdf-region'&&r.nativeSource.sourceViewId===view.id&&r.nativeSource.sourceFileId===view.fileId&&r.nativeSource.sourcePage===view.page&&sameFrame(r.nativeSource.sourceFrame,view.frame)&&same(r.nativeSource.sourceRegion,region)&&/^[A-Z0-9]{1,4}$/.test(r.text));
  if(!usable.length||new Set(usable.map(r=>r.text)).size!==1)return null;return usable[0];
 }
 function insidePolygon(p,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 function sourceBands(image,frame,contour){
  const ink=inkFor(image),{width:w,height:h}=image,[l,t,r,b]=frame.box,font=Math.max(r-l,b-t),cx=(l+r)/2,cy=(t+b)/2,roi=[Math.max(0,Math.floor(cx-font*8)),Math.max(0,Math.floor(cy-font*8)),Math.min(w,Math.ceil(cx+font*8)),Math.min(h,Math.ceil(cy+font*8))],pairs=[];
  for(const axis of [0,1]){const across=axis,along=1-axis,minimum=font*3.5,segments=[];
   for(let x=roi[across];x<roi[across+2];x++){let start=null,last=null,hits=0;const point=y=>axis===0?[x,y]:[y,x],finish=()=>{if(start!==null&&last-start>=minimum&&hits/(last-start+1)>=.94)segments.push({coordinate:x,start,end:last,support:hits/(last-start+1)});};
    for(let y=roi[along];y<roi[along+2];y++){const p=point(y);if(insidePolygon(p,contour)){finish();start=last=null;hits=0;continue;}if(!ink[p[1]*w+p[0]])continue;if(start===null){start=y;hits=0;}else if(y-last>3){finish();start=y;hits=0;}last=y;hits++;}finish();
   }
   const groups=[];for(const s of segments){let group=groups.find(g=>Math.abs(g.at(-1).coordinate-s.coordinate)<=1&&Math.abs(g.at(-1).start-s.start)<=2&&Math.abs(g.at(-1).end-s.end)<=2);if(!group)groups.push(group=[]);group.push(s);}const strokes=groups.map(g=>g.slice().sort((a,b)=>b.support-a.support)[0]);
   for(const a of strokes)for(const b of strokes){const thickness=b.coordinate-a.coordinate,start=Math.max(a.start,b.start),end=Math.min(a.end,b.end);if(thickness<2||thickness>font*1.1||end-start<minimum||Math.abs(a.start-b.start)>2)continue;
    const caps=[];for(let y=start;y<=end;y++){let hits=0;for(let x=a.coordinate;x<=b.coordinate;x++){const p=axis===0?[x,y]:[y,x];hits+=ink[p[1]*w+p[0]];}if(hits/(thickness+1)>=.9)caps.push({coordinate:y,support:hits/(thickness+1)});}if(!caps.some(c=>c.coordinate-start<=1))continue;
    pairs.push({id:'wall-band:'+axis+':'+a.coordinate+':'+b.coordinate+':'+start+':'+end,axis,strokes:copy([a,b]),extent:[start,end],thicknessPixels:thickness,caps,sourceRegion:roi.slice(),status:'proposed',kind:'paired-source-strokes',complete:false});
   }
  }return pairs;
 }
 function leaderAssociation(image,frame,bands){
  const ink=inkFor(image),{width:w,height:h}=image,[l,t,r,b]=frame.box,font=Math.max(r-l,b-t),center=[(l+r)/2,(t+b)/2],line=(a,b)=>{const n=Math.max(1,Math.ceil(M.distance(a,b)));let hits=0,gap=0,maxGap=0;for(let i=0;i<=n;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/n),y=Math.round(a[1]+(b[1]-a[1])*i/n);let hit=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)hit||=!!ink[(y+dy)*w+x+dx];if(hit){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}return {anchors:[a.slice(),b.slice()],support:hits/(n+1),maxGap};},targets=[];
  for(const band of bands){const cross=band.axis,along=1-cross,at=(band.strokes[0].coordinate+band.strokes[1].coordinate)/2,sign=at>center[cross]?1:-1,edge=sign>0?frame.box[cross+2]-1:frame.box[cross],point=(x,y)=>cross===0?[x,y]:[y,x],paths=[];
   for(let py=Math.round(center[along])-1;py<=Math.round(center[along])+1;py++)for(let hop=3;hop<=Math.round(font*.9);hop++){const bend=[edge+sign*hop,py];if(bend[0]>=band.strokes[0].coordinate&&bend[0]<=band.strokes[1].coordinate)continue;
    for(let y=Math.max(band.extent[0],Math.round(center[along]-font*2));y<=Math.min(band.extent[1],Math.round(center[along]+font*2));y++){if(Math.abs(y-py)<font*.6||Math.abs(at-bend[0])<2)continue;const a=line(point(edge,py),point(...bend)),b=line(point(...bend),point(at,y));if(Math.min(a.support,b.support)<.94||Math.max(a.maxGap,b.maxGap)>1)continue;paths.push({segments:[a,b],method:'two-observed-source-leader-segments-to-paired-wall-strokes',status:'observed'});}
   }
   if(paths.length)targets.push({band:copy(band),leaderEvidence:{status:'observed',targetBandId:band.id,paths:paths.slice(0,12),candidatePathCount:paths.length,method:'unique-wall-band-reached-by-source-leader',pointNotUsedAsWallEndpoint:true}});
  }
  return targets.length===1?{status:'proposed',...targets[0]}:{status:'unresolved',reason:targets.length?'WALL_NOTE_LEADER_AMBIGUOUS':'WALL_NOTE_LEADER_UNOBSERVED',candidates:targets};
 }
 function planCandidates(inventory,buildingId,images,level,draft,{discovery=null}={}){
  const view=inventory.views.find(v=>v.id===draft?.sourceViewId&&v.buildingId===buildingId&&v.kind==='floor'),result=[];
  if(!view||!wallNotes(view).length)return {candidates:[],issues:[],complete:false};
  const found=discovery||discover(inventory,buildingId,images),issues=found.issues.filter(i=>!i.sourceViewId||i.sourceViewId===view.id).map(i=>i.reason);
  if(view.levelId!==level.sourceLevel||!sourceImage(view,images[view.id])||!Array.isArray(draft.points)||draft.points.some(p=>!Array.isArray(p.xy)||p.xy.length!==2||!p.xy.every(finite))||M.validatePolygon(draft.points.map(p=>p.xy)).length)return {candidates:[],issues:['KEYED_WALL_PLAN_SOURCE_REQUIRED']};
  for(const note of found.notes.filter(n=>n.sourceViewId===view.id)){const key=readKey(view,note.keyFrame);if(!key){issues.push('WALL_NOTE_KEY_UNRESOLVED');continue;}
   const matches=found.regions.filter(r=>r.sourceViewId===view.id&&r.frame.id!==note.keyFrame.id).flatMap(r=>{const reading=readKey(view,r.frame);return reading?.text===key.text?[{frame:r.frame,reading}]:[];});
   for(const match of matches){const center=[(match.frame.box[0]+match.frame.box[2])/2,(match.frame.box[1]+match.frame.box[3])/2];if(insidePolygon(center,draft.points.map(p=>p.xy)))continue;const association=leaderAssociation(images[view.id],match.frame,sourceBands(images[view.id],match.frame,draft.points.map(p=>p.xy)));if(association.status!=='proposed'){issues.push(association.reason);continue;}
    result.push({id:view.id+':'+association.band.id,sourceViewId:view.id,sourceFrame:copy(view.frame),sourceLevel:view.levelId,sourceNote:copy(note),noteKey:copy(key),calloutKey:copy(match.reading),calloutFrame:copy(match.frame),...association,complete:false,confirmationRequired:true});
   }
  }
  const byId=new Map();for(const candidate of result){const old=byId.get(candidate.id);if(old){if(Math.abs(old.sourceNote.value-candidate.sourceNote.value)>.001){old.status='conflict';old.reason='WALL_NOTE_HEIGHT_CONFLICT';old.conflictingNotes||=[copy(old.sourceNote)];old.conflictingNotes.push(copy(candidate.sourceNote));issues.push('WALL_NOTE_HEIGHT_CONFLICT');}}else byId.set(candidate.id,candidate);}
  return {candidates:[...byId.values()],issues:[...new Set(issues)],complete:false};
 }
 // Source observations are useful before a wall can be generated. The plan
 // note provides a local height, never an absolute balcony altitude. Competing
 // plan caps can be roof edges or guard rails; keep them until another view
 // identifies the physical ends and a visible deck/base establishes Z.
 function propose(inventory,buildingId,images,level,draft,{discovery=null}={}){
  const source=planCandidates(inventory,buildingId,images,level,draft,{discovery}),pending=['KEYED_WALL_EXTENT_UNRESOLVED','KEYED_WALL_BASE_UNRESOLVED','KEYED_WALL_ELEVATION_REGISTRATION_REQUIRED'];
  return {version:1,status:source.candidates.length?'unresolved':'not-found',buildingId,levelId:level.id,sourceLevel:level.sourceLevel,observations:source.candidates.map(c=>({...c,geometryStatus:'unresolved',unresolved:pending.slice()})),issues:[...new Set([...source.issues,...(source.candidates.length?pending:[])])],geometryCreated:false,complete:false,confirmationRequired:source.candidates.length>0};
 }

 return Object.freeze({version:1,sourceImage,inkFor,wallNotes,keyFrames,discover,readKey,sourceBands,leaderAssociation,planCandidates,propose});
});
