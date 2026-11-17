/* Source observations for keyed exterior walls. No catalogue of buildings. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-level-model.js'):root.MIRLevelModel,node?require('./plan-import-core.js'):root.MIRPDFAnalysis,node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision,()=>node?require('./plan-reconstruction.js'):root.MIRPlanReconstruction);if(node)module.exports=api;else root.MIRKeyedWallObservations=api;})(typeof window==='object'?window:globalThis,function(M,A,V,reconstruction){
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
   const font=found.map(n=>n.textBox[3]-n.textBox[1]).sort((a,b)=>a-b)[Math.floor(found.length/2)],frames=keyFrames(image,{minimum:Math.max(8,Math.floor(font*1.4)),maximum:Math.max(12,Math.ceil(font*4.4))}),glyphInk=inkFor(image),glyphs=new Map(frames.map(f=>[f.id,glyph(image,f,glyphInk)])),linked=new Map();
   for(const note of found){const [l,t,r,b]=note.textBox,f=b-t,keys=frames.filter(k=>l-k.box[2]>0&&l-k.box[2]<f*4&&Math.abs(t+b-k.box[1]-k.box[3])/2<f&&k.box[3]-k.box[1]>f*1.5);if(keys.length!==1){issues.push({sourceViewId:view.id,noteId:note.id,reason:'WALL_NOTE_KEY_AMBIGUOUS'});continue;}
    const key=keys[0],g=glyphs.get(key.id),ranked=frames.filter(k=>k.id!==key.id&&glyphs.get(k.id)).map(k=>({frame:k,difference:g?glyphs.get(k.id).reduce((n,p,i)=>n+Number(p!==g[i]),0)/400:1})).sort((a,b)=>a.difference-b.difference);notes.push({...note,keyFrame:copy(key)});
    // A similar glyph in another legend is not a wall callout. Screen a
    // bounded set for a real leader to a paired source band before spending
    // the unchanged native-reading budget; the key still comes only from OCR.
    const eligible=[{frame:key,difference:0,association:null}],screenLimit=maximumRegions*4;
    for(const candidate of ranked.slice(0,screenLimit)){const k=candidate.frame;if(!linked.has(k.id))linked.set(k.id,leaderAssociation(image,k,sourceBands(image,k,[],{ink:glyphInk}),{ink:glyphInk}));const association=linked.get(k.id);if(association.status==='proposed')eligible.push({...candidate,association});}
    if(ranked.length>screenLimit||eligible.length>maximumRegions)issues.push({sourceViewId:view.id,noteId:note.id,reason:'KEYED_WALL_REGION_BUDGET',candidateCount:eligible.length,screenedCandidates:Math.min(ranked.length,screenLimit),candidateScreenLimit:screenLimit,regionLimit:maximumRegions});
    for(const candidate of eligible){const k=candidate.frame;if(regions.some(r=>r.sourceViewId===view.id&&r.frame.id===k.id))continue;const [x,y,r,b]=k.box,association=candidate.association;regions.push({id:view.id+':'+k.id,sourceViewId:view.id,sourceFrame:copy(view.frame),region:[x+2,y+2,r-x-4,b-y-4],frame:copy(k),noteId:note.id,candidateEvidence:{method:association?'observed-leader-and-paired-source-band-select-ocr-region':'written-wall-note-key-frame',difference:candidate.difference,keyNotInferred:true,...(association?{sourceBand:copy(association.band),leaderEvidence:{method:association.leaderEvidence.method,status:association.leaderEvidence.status,targetBandId:association.band.id,candidatePathCount:association.leaderEvidence.candidatePathCount}}:{})},priority:association?1+candidate.difference:0});}
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
 function sourceBands(image,frame,contour,{ink=inkFor(image)}={}){
  const {width:w,height:h}=image,[l,t,r,b]=frame.box,font=Math.max(r-l,b-t),cx=(l+r)/2,cy=(t+b)/2,roi=[Math.max(0,Math.floor(cx-font*8)),Math.max(0,Math.floor(cy-font*8)),Math.min(w,Math.ceil(cx+font*8)),Math.min(h,Math.ceil(cy+font*8))],pairs=[];
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
 function leaderAssociation(image,frame,bands,{ink=inkFor(image)}={}){
  const {width:w,height:h}=image,[l,t,r,b]=frame.box,font=Math.max(r-l,b-t),center=[(l+r)/2,(t+b)/2],line=(a,b)=>{const n=Math.max(1,Math.ceil(M.distance(a,b)));let hits=0,gap=0,maxGap=0;for(let i=0;i<=n;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/n),y=Math.round(a[1]+(b[1]-a[1])*i/n);let hit=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)hit||=!!ink[(y+dy)*w+x+dx];if(hit){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}return {anchors:[a.slice(),b.slice()],support:hits/(n+1),maxGap};},targets=[];
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
 function sourceLine(ink,image,a,b){
  const count=Math.max(1,Math.ceil(M.distance(a,b)));let hits=0,gap=0,maxGap=0,firstHit=null,lastHit=null;
  for(let i=0;i<=count;i++){const p=a.map((n,axis)=>Math.round(n+(b[axis]-n)*i/count)),present=p[0]>=0&&p[0]<image.width&&p[1]>=0&&p[1]<image.height&&ink[p[1]*image.width+p[0]];if(present){hits++;gap=0;firstHit||=p;lastHit=p;}else maxGap=Math.max(maxGap,++gap);}
  return {anchors:[a,b],support:hits/(count+1),maxGap,firstHit,lastHit};
 }
 function continuousRuns(values){const out=[];let first=null;for(let n=0;n<=values.length;n++){if(n<values.length&&values[n]&&first===null)first=n;if((n===values.length||!values[n])&&first!==null){out.push([first,n-1]);first=null;}}return out;}
 function physicalExtent(observation,image,contour){
  const band=observation.band,cross=band.axis,along=1-cross,at=band.strokes.map(s=>s.coordinate),center=(at[0]+at[1])/2,point=(x,y)=>cross===0?[x,y]:[y,x],ink=inkFor(image),length=along===1?image.height:image.width;
  // Trace the complete source raster, not the discovery ROI or the clipped
  // outside-contour segment. A remote roof line separated by white pixels
  // cannot extend the wall; a search boundary cannot close it either.
  const pair=Array.from({length},(_,y)=>at.every(x=>{const p=point(x,y);return !!ink[p[1]*image.width+p[0]];})),leaderPoints=observation.leaderEvidence.paths.map(p=>p.segments.at(-1).anchors.at(-1)[along]),font=Math.max(observation.calloutFrame.box[2]-observation.calloutFrame.box[0],observation.calloutFrame.box[3]-observation.calloutFrame.box[1]),uninterrupted=continuousRuns(pair).filter(([a,b])=>b-a>=font*3.5&&leaderPoints.some(n=>n>=a&&n<=b));
  if(uninterrupted.length!==1)return {status:'unresolved',reason:'KEYED_WALL_CONTINUOUS_PAIR_REQUIRED',uninterrupted};
  const extent=uninterrupted[0];if(extent[0]<2||extent[1]>length-3)return {status:'unresolved',reason:'KEYED_WALL_SOURCE_EDGE_TERMINATION',extent};
  const caps=extent.map((n,i)=>({coordinate:n,closure:sourceLine(ink,image,point(at[0],n),point(at[1],n)),outside:[1,2].map(step=>({coordinate:n+(i?step:-step),pairedInk:!!pair[n+(i?step:-step)]}))}));
  if(caps.some(c=>c.closure.support<.9||c.outside.some(p=>p.pairedInk)))return {status:'unresolved',reason:'KEYED_WALL_FINITE_CAP_REQUIRED',caps};
  const points=contour.points.map(p=>p.xy),contacts=[];
  for(let edgeIndex=0;edgeIndex<points.length;edgeIndex++){const a=points[edgeIndex],b=points[(edgeIndex+1)%points.length];if(Math.abs(a[along]-b[along])>.01||center<Math.min(a[cross],b[cross])||center>Math.max(a[cross],b[cross]))continue;
   for(let end=0;end<2;end++){if(Math.abs(extent[end]-a[along])>1)continue;const width=at[1]-at[0],stroke=sourceLine(ink,image,point(at[0]-width*2,a[along]),point(at[1]+width*2,a[along]));if(stroke.support>=.94&&stroke.maxGap<=1)contacts.push({edgeIndex,end,coordinate:a[along],edgeAnchors:copy([a,b]),stroke,intersection:point(center,a[along]),method:'continuous-paired-wall-strokes-terminate-on-observed-parent-edge'});}
  }
  if(contacts.length!==1)return {status:'unresolved',reason:'KEYED_WALL_PARENT_CONTACT_AMBIGUOUS',extent,caps,contacts};
  return {status:'proposed',extent,caps,continuousSkins:at.map(x=>sourceLine(ink,image,point(x,extent[0]),point(x,extent[1]))),host:contacts[0],freeEnd:1-contacts[0].end,center,thicknessPixels:at[1]-at[0],strokeCoordinates:at,sourceFootprint:[point(at[0],extent[0]),point(at[1],extent[0]),point(at[1],extent[1]),point(at[0],extent[1])],sourceCentreline:[point(center,extent[0]),point(center,extent[1])],method:'full-raster-continuous-pair-with-finite-cap-and-independent-parent-contact',notRoiTermination:true};
 }
 function verticalWitness(image,ink,x,top,base,tolerance){
  const candidates=[];if(top<3||base>image.height-3||!(base-top>10))return {status:'unresolved',reason:'KEYED_WALL_VERTICAL_STROKE_REQUIRED',candidates};
  for(let at=Math.max(0,Math.ceil(x-tolerance));at<=Math.min(image.width-1,Math.floor(x+tolerance));at++){const stroke=sourceLine(ink,image,[at,Math.ceil(top)],[at,Math.floor(base)]);if(stroke.support<.9||stroke.maxGap>2)continue;let start=null;for(let y=Math.ceil(top-tolerance);y<=Math.floor(top+tolerance);y++)if(ink[y*image.width+at]){start=y;break;}if(start===null||start<3)continue;const outsideAbove=sourceLine(ink,image,[at,start-3],[at,start-1]);if(outsideAbove.support)continue;candidates.push({x:at,observedTop:start,expectedTop:top,topResidual:start-top,expectedX:x,xResidual:at-x,tolerancePixels:tolerance,stroke,outsideAbove});}
  const groups=[];for(const candidate of candidates){let group=groups.at(-1);if(!group||candidate.x-group.at(-1).x>1)groups.push(group=[]);group.push(candidate);}
  return {status:groups.length===1?'proposed':'unresolved',...(groups.length===1?{}:{reason:groups.length?'KEYED_WALL_VERTICAL_STROKE_AMBIGUOUS':'KEYED_WALL_VERTICAL_STROKE_REQUIRED'}),candidates,witness:groups.length===1?groups[0].sort((a,b)=>Math.abs(a.xResidual)-Math.abs(b.xResidual))[0]:null};
 }
 const facingNormal=direction=>({front:[0,-1],back:[0,1],left:[-1,0],right:[1,0]})[direction];
 function evidenceGeometry(observation,inventory,images,level,contour,proposal){
  const R=reconstruction(),floor=inventory.views.find(v=>v.id===observation.sourceViewId),extent=physicalExtent(observation,images[floor.id],contour);
  if(extent.status!=='proposed')return {status:'unresolved',extent};
  const alongName=observation.band.axis===0?'y':'x',centreline=M.modelPoints({...contour,points:extent.sourceCentreline.map((xy,i)=>({id:'keyed-axis-'+i,xy}))}),outward=centreline[extent.freeEnd].map((n,i)=>n-centreline[extent.host.end][i]),outwardLength=Math.hypot(...outward),sideProofs=[],baseProofs=[],refusals=[];
  for(const viewInfo of proposal.views||[]){const view=inventory.views.find(v=>v.id===viewInfo.viewId&&v.buildingId===level.buildingId&&v.kind==='elevation'),image=view&&images[view.id],axis=viewInfo.axisRegistration;if(!view||!sourceImage(view,image)||axis?.status!=='proposed'||axis.floorSourceViewId!==floor.id||axis.elevationSourceViewId!==view.id||!sameFrame(axis.sourceFrames?.floor,floor.frame)||!sameFrame(axis.sourceFrames?.elevation,view.frame))continue;
   const transform=axis.transform,normal=facingNormal(viewInfo.direction);if(!normal||!['x','y'].includes(transform?.floorAxis)||![transform.scale,transform.offset].every(finite)||!transform.scale)continue;
   // Only the elevation facing the projection away from the parent can
   // establish this deck contact. A similar front window is not a rear wall.
   if(transform.floorAxis!==alongName&&outward.reduce((sum,n,i)=>sum+n*normal[i],0)<outwardLength*.99)continue;
   const registration=R?.elevationRegistration(viewInfo,contour,inventory);if(!registration?.levelBand){refusals.push({sourceViewId:view.id,reason:'KEYED_WALL_REGISTERED_DATUM_PAIR_REQUIRED'});continue;}
   const ink=V.structuralInk(image),top=registration.pixelZ(contour.base.value+observation.sourceNote.value),base=registration.pixelZ(contour.base.value),tolerance=Math.max(1,axis.tolerancePixels||0),common={sourceViewId:view.id,sourceFrame:copy(view.frame),direction:viewInfo.direction,axisRegistration:copy(axis),levelBand:copy(registration.levelBand),baseValue:contour.base.value,topY:top,baseY:base,metricRegistration:{sx:registration.sx,sz:registration.sz,min:registration.min,max:registration.max}};
   if(transform.floorAxis===alongName){const coordinate=extent.extent[extent.freeEnd],x=coordinate*transform.scale+transform.offset,proof=verticalWitness(image,ink,x,top,base,tolerance);if(proof.status==='proposed')sideProofs.push({...common,planCoordinate:coordinate,...proof,purpose:'optional-projected-cap-corroboration',individualWallFaceObserved:false});else refusals.push({sourceViewId:view.id,kind:'free-cap-corroboration',...proof});}
   else {const expected=extent.strokeCoordinates.map(n=>n*transform.scale+transform.offset).sort((a,b)=>a-b),skins=expected.map(x=>verticalWitness(image,ink,x,top,base,tolerance));if(skins.some(s=>s.status!=='proposed')||skins[0].witness.x>=skins[1].witness.x){refusals.push({sourceViewId:view.id,kind:'base-skins',reason:'KEYED_WALL_TRANSVERSE_SKINS_REQUIRED',expected,skins});continue;}
    const deck=[],width=expected[1]-expected[0];for(let i=0;i<2;i++)for(let y=Math.floor(base)-1;y<=Math.ceil(base)+1;y++){const start=skins[i].witness.x,sign=i?1:-1,stroke=sourceLine(ink,image,[start,y],[start+sign*Math.max(6,width*3),y]);if(stroke.support>=.94&&stroke.maxGap<=1)deck.push({skinIndex:i,datumResidualPixels:y-base,...stroke});}
    if(!deck.length){refusals.push({sourceViewId:view.id,kind:'base',reason:'KEYED_WALL_DECK_CONTACT_REQUIRED',skins});continue;}
    baseProofs.push({...common,expectedSkinCoordinates:expected,skins,deck,method:'paired-finite-wall-skins-joined-to-observed-deck-at-registered-floor-datum'});
   }
  }
  // The plan determines both ends and the perpendicular coordinate. Its own
  // key/note determines height, while this transverse view proves the base.
  // A lateral view may be hidden or shared in projection; it is corroboration
  // only and is never claimed as an individual observation of both walls.
  return {status:baseProofs.length?'proposed':'unresolved',...(baseProofs.length?{}:{reason:'KEYED_WALL_BASE_UNRESOLVED'}),extent,sideProofs,baseProofs,refusals,height:copy(observation.sourceNote),base:contour.base.value,geometry:baseProofs.length?{footprint:M.modelPoints({...contour,points:extent.sourceFootprint.map((xy,i)=>({id:'keyed-skin-'+i,xy}))}),centreline,thickness:extent.thicknessPixels*M.scale(contour),height:observation.sourceNote.value,base:contour.base.value}:null};
 }
 function resolvedPlane(observation,proof,level,contour){
  const [from,to]=proof.geometry.centreline,length=M.distance(from,to),id='wall:'+level.id+':keyed:'+observation.sourceViewId+':'+observation.calloutFrame.id,normal=[(to[1]-from[1])/length,(from[0]-to[0])/length,0];
  return {version:1,id,kind:'source-keyed-wall',status:'proposed',buildingId:level.buildingId,levelId:level.id,sourceViewId:observation.sourceViewId,sourceFrame:copy(observation.sourceFrame),from:copy(from),to:copy(to),normal,height:proof.geometry.height,base:proof.geometry.base,footprint:copy(proof.geometry.footprint),thickness:proof.geometry.thickness,
   measurements:{width:{kind:'estimated-calibrated',status:'proposed',value:length,sourceViewId:observation.sourceViewId,sourceFrame:copy(observation.sourceFrame),anchors:copy(proof.extent.sourceCentreline),scaleUsed:M.scale(contour),reference:copy(contour.reference),method:'centreline-derived-from-two-observed-plan-skins',confirmationRequired:true},height:{kind:'written',status:'proposed',value:observation.sourceNote.value,sourceViewId:observation.sourceViewId,sourceFrame:copy(observation.sourceFrame),textBox:copy(observation.sourceNote.textBox),text:observation.sourceNote.text,sourceReading:copy(observation.sourceNote.sourceReading),confirmationRequired:true}},
   registration:{kind:'source-keyed-wall-registration',status:'proposed',sourceViewIds:[observation.sourceViewId,...proof.baseProofs.map(p=>p.sourceViewId)],sourceFloorViewId:observation.sourceViewId,sourceLevel:level.sourceLevel,parentContourId:contour.contourId,alignment:copy(contour.alignment),baseValue:contour.base.value,confirmationRequired:true},
   keyedWallEvidence:{version:1,method:'plan-paired-skins-and-written-keyed-height-with-registered-deck',sourceObservation:copy(observation),parentContourId:contour.contourId,physicalExtent:copy(proof.extent),baseProofs:copy(proof.baseProofs),lateralCorroborations:copy(proof.sideProofs),geometryMethod:'centre-plane-of-observed-paired-strokes',representation:'single-wall-plane-with-source-footprint-and-thickness',complete:false},complete:false,confirmationRequired:true,quantityStatus:'partial-unreviewed'};
 }
 function resolve(inventory,buildingId,images,level,contour,{proposal,discovery=null}={}){
  const source=propose(inventory,buildingId,images,level,contour,{discovery}),planes=[],observations=[],issues=source.issues.filter(i=>!['KEYED_WALL_EXTENT_UNRESOLVED','KEYED_WALL_BASE_UNRESOLVED','KEYED_WALL_ELEVATION_REGISTRATION_REQUIRED'].includes(i)),floor=inventory.views.find(v=>v.id===contour?.sourceViewId),ready=proposal?.status==='proposed'&&proposal.sourceViewId===contour?.sourceViewId&&proposal.levelId===level.id&&contour?.levelRegistration?.status==='proposed'&&contour.alignment?.status==='proposed'&&finite(contour.base?.value)&&!M.validateDraft(contour,inventory,level).length;
  for(const observation of source.observations){if(observation.status!=='proposed'||!ready||!sourceImage(floor,images[floor?.id])){observations.push({...observation,geometryStatus:'unresolved',unresolved:[observation.reason||'KEYED_WALL_ELEVATION_REGISTRATION_REQUIRED']});issues.push(observation.reason||'KEYED_WALL_ELEVATION_REGISTRATION_REQUIRED');continue;}
   const proof=evidenceGeometry(observation,inventory,images,level,contour,proposal);
   if(proof.status!=='proposed'){const reason=proof.reason||proof.extent?.reason||'KEYED_WALL_EXTENT_UNRESOLVED';observations.push({...observation,geometryStatus:'unresolved',resolution:proof,unresolved:[reason]});issues.push(reason);continue;}
   const plane=resolvedPlane(observation,proof,level,contour),registeredLevel={...level,contours:[contour],reconstruction:{...level.reconstruction,proposal}},errors=planeIssues(plane,inventory,registeredLevel,{confirm:false});
   if(errors.length){observations.push({...observation,geometryStatus:'unresolved',resolution:proof,unresolved:errors});issues.push(...errors);continue;}
   planes.push(plane);observations.push({...observation,geometryStatus:'proposed',resolvedWallId:plane.id,resolution:proof,unresolved:[]});
  }
  return {...source,status:planes.length?'partial-proposal':source.status,observations,observedPlanes:planes,issues:[...new Set(issues)],geometryCreated:planes.length>0,complete:false,confirmationRequired:observations.length>0};
 }
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<1e-8,point=p=>Array.isArray(p)&&p.length===2&&p.every(finite),samePoints=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((p,i)=>point(p)&&p.every((n,j)=>near(n,b[i][j])));
 const withoutStatus=value=>{const result=copy(value||{});delete result.status;return result;},referenceSource=value=>{const result=withoutStatus(value);delete result.pdfAnchors;return result;};
 function inSource(p,view){const size=[view?.payload?.sourceWidth||view?.zone?.[2]||view?.frame?.rasterSize?.[0],view?.payload?.sourceHeight||view?.zone?.[3]||view?.frame?.rasterSize?.[1]];return point(p)&&p.every((n,i)=>n>=0&&n<size[i]);}
 function retainedKeyView(view,inventory,level,frames){
  // Refinement is persisted beside the proposal. The imported source views
  // remain unchanged, so validate the exact retained readings without adding
  // them to those views or using a wall's own proof as its source record.
  const lists=[inventory.localReadingRetries,level.reconstruction?.proposal?.localReadingRetries,level.reconstructionDraft?.localReadingRetries,...(inventory.levels||[]).filter(l=>l.buildingId===level.buildingId).map(l=>l.reconstruction?.proposal?.localReadingRetries)].filter(rows=>rows!==undefined),errors=[],retained=[];
  if(lists.some(rows=>!Array.isArray(rows)||rows.length>1024))return {view,errors:['KEYED_WALL_NATIVE_READINGS_INVALID']};
  const ids=new Set(frames.map(f=>f.id)),wanted=new Set(frames.map(f=>view.id+':'+f.id)),relevant=r=>wanted.has(r?.id)||r?.sourceViewId===view.id&&ids.has(r.frameId),rows=[...(view.payload?.drawingReadings?.keyedWallKeys||[]),...lists.flat().filter(relevant)],file=inventory.files?.find(f=>f.id===view.fileId);
  for(const row of rows.filter(relevant)){
   const f=frames.find(f=>row.frameId===f.id),native=row.nativeSource,region=f&&[f.box[0]+2,f.box[1]+2,f.box[2]-f.box[0]-4,f.box[3]-f.box[1]-4],matrix=view.frame?.pdfToRaster,crop=view.frame?.cropToRaster;
   if(!f||row.id!==view.id+':'+f.id||row.source!=='native-keyed-wall-key'||row.purpose!=='source-boxed-wall-note-key'||row.sourceViewId!==view.id||!sameFrame(row.sourceFrame,view.frame)||!same(row.frame,f)||!same(row.box,f.box)||!same(row.region,region)||!file?.sha256||native?.sourceSha256!==file.sha256||native.method!=='retained-pdf-region'||native.sourceViewId!==view.id||native.sourceFileId!==view.fileId||native.sourcePage!==view.page||native.sourceRotation!==(view.orientation??view.payload?.sourceRotation)||!sameFrame(native.sourceFrame,view.frame)||!same(native.sourceRegion,region)||native.scaleFactor!==6||native.padding!==12||matrix?.length!==6||crop?.length!==6||![...matrix,...crop].every(finite)||!same(crop.slice(0,4),[1,0,0,1])){errors.push('KEYED_WALL_NATIVE_KEY_SOURCE_INVALID');continue;}
   const factor=native.scaleFactor,padding=native.padding,translation=[padding-factor*(region[0]+crop[4]),padding-factor*(region[1]+crop[5])],pdfToTile=matrix.map(n=>n*factor);pdfToTile[4]+=translation[0];pdfToTile[5]+=translation[1];
   const nearArray=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((n,i)=>near(n,b[i]));
   if(!nearArray(native.pdfToTile,pdfToTile)||!nearArray(native.viewToTile,[factor,0,0,factor,padding-factor*region[0],padding-factor*region[1]])||!nearArray(native.viewportTransform,matrix.map(n=>n*factor))||!same(native.sourcePageRegion,[region[0]+crop[4],region[1]+crop[5],region[2],region[3]])||!same(native.canvasSize,[Math.ceil(region[2]*factor)+padding*2,Math.ceil(region[3]*factor)+padding*2])){errors.push('KEYED_WALL_NATIVE_KEY_SOURCE_INVALID');continue;}
   const previous=retained.find(r=>r.id===row.id);if(previous&&!same(previous,row))errors.push('KEYED_WALL_NATIVE_KEY_CONFLICT');else if(!previous)retained.push(row);
  }
  return {view:{...view,payload:{...view.payload,drawingReadings:{...view.payload?.drawingReadings,keyedWallKeys:retained}}},errors};
 }
 function validStroke(stroke,view,{minimum=.9,gap=2}={}){
  if(stroke?.anchors?.length!==2||!stroke.anchors.every(p=>inSource(p,view))||!finite(stroke.support)||stroke.support<minimum||stroke.support>1||!Number.isInteger(stroke.maxGap)||stroke.maxGap<0||stroke.maxGap>gap)return false;
  if(!minimum)return true;
  const [a,b]=stroke.anchors,delta=b.map((n,i)=>n-a[i]),length=Math.hypot(...delta),position=p=>p?.reduce((n,v,i)=>n+(v-a[i])*delta[i],0)/length,onStroke=p=>inSource(p,view)&&length>0&&position(p)>=-.75&&position(p)<=length+.75&&Math.abs((p[0]-a[0])*delta[1]-(p[1]-a[1])*delta[0])/length<=.75;
  return onStroke(stroke.firstHit)&&onStroke(stroke.lastHit)&&position(stroke.firstHit)<=position(stroke.lastHit);
 }
 function sourceAssociationIssues(o,view,extent){
  const failures=[],band=o.band,cross=band.axis,along=1-cross,[left,right]=band.strokes.map(s=>s.coordinate),center=(left+right)/2,frame=o.calloutFrame,[l,t,r,b]=frame.box,font=Math.max(r-l,b-t),middle=[(l+r)/2,(t+b)/2],sign=center>middle[cross]?1:-1,edge=sign>0?frame.box[cross+2]-1:frame.box[cross],sourceSize=[view.payload?.sourceWidth||view.frame.rasterSize[0],view.payload?.sourceHeight||view.frame.rasterSize[1]],roi=[Math.max(0,Math.floor(middle[0]-font*8)),Math.max(0,Math.floor(middle[1]-font*8)),Math.min(sourceSize[0],Math.ceil(middle[0]+font*8)),Math.min(sourceSize[1],Math.ceil(middle[1]+font*8))];
  const validFrame=f=>box(f?.box)&&f.id==='key-frame:'+f.box.join('-')&&f.status==='observed'&&f.method==='four-observed-neutral-small-frame-sides'&&f.sideSupport?.length===2&&f.sideSupport.every(n=>finite(n)&&n>=.9&&n<=1)&&f.interiorInkFraction>=.05&&f.interiorInkFraction<=.65&&inSource([f.box[0],f.box[1]],view)&&inSource([f.box[2]-1,f.box[3]-1],view);
  if(!validFrame(frame)||!validFrame(o.sourceNote.keyFrame)||o.sourceNote.keyFrame.id===frame.id)failures.push('KEYED_WALL_KEY_FRAME_INVALID');
  const note=o.sourceNote,[nl,nt,,nb]=note.textBox,nf=nb-nt,nk=note.keyFrame.box;
  if(!(nl-nk[2]>0&&nl-nk[2]<nf*4&&Math.abs(nt+nb-nk[1]-nk[3])/2<nf&&nk[3]-nk[1]>nf*1.5))failures.push('KEYED_WALL_NOTE_KEY_ASSOCIATION_INVALID');
  if(band.status!=='proposed'||band.kind!=='paired-source-strokes'||band.extent?.length!==2||!band.extent.every(Number.isInteger)||!(band.extent[1]-band.extent[0]>=font*3.5)||!near(band.thicknessPixels,right-left)||right-left<2||right-left>font*1.1||!same(band.sourceRegion,roi)||!band.strokes.every(s=>Number.isInteger(s.coordinate)&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.end-s.start>=font*3.5&&s.support>=.94&&s.support<=1)||Math.abs(band.strokes[0].start-band.strokes[1].start)>2||band.extent[0]!==Math.max(...band.strokes.map(s=>s.start))||band.extent[1]!==Math.min(...band.strokes.map(s=>s.end))||band.id!=='wall-band:'+cross+':'+left+':'+right+':'+band.extent.join(':')||o.id!==view.id+':'+band.id)failures.push('KEYED_WALL_PAIRED_SOURCE_INVALID');
  const leaders=o.leaderEvidence,paths=leaders.paths,validSegment=s=>s?.anchors?.length===2&&s.anchors.every(p=>inSource(p,view))&&s.support>=.94&&s.support<=1&&Number.isInteger(s.maxGap)&&s.maxGap>=0&&s.maxGap<=1;
  if(leaders.method!=='unique-wall-band-reached-by-source-leader'||!Array.isArray(paths)||!paths.length||paths.length>12||!Number.isInteger(leaders.candidatePathCount)||leaders.candidatePathCount<paths.length)failures.push('KEYED_WALL_LEADER_EVIDENCE_INVALID');
  else for(const path of paths){const [a,z]=path.segments||[],start=a?.anchors?.[0],bend=a?.anchors?.[1],end=z?.anchors?.[1];
   if(path.status!=='observed'||path.method!=='two-observed-source-leader-segments-to-paired-wall-strokes'||path.segments?.length!==2||!validSegment(a)||!validSegment(z)||!samePoints([bend],[z.anchors[0]])||!near(start[cross],edge)||!near(start[along],bend[along])||Math.abs(start[along]-Math.round(middle[along]))>1||(bend[cross]-edge)*sign<3||(bend[cross]-edge)*sign>Math.round(font*.9)||bend[cross]>=left&&bend[cross]<=right||!near(end[cross],center)||end[along]<Math.max(band.extent[0],Math.round(middle[along]-font*2))||end[along]>Math.min(band.extent[1],Math.round(middle[along]+font*2))||end[along]<extent.extent[0]||end[along]>extent.extent[1]||Math.abs(end[along]-bend[along])<font*.6||Math.abs(center-bend[cross])<2)failures.push('KEYED_WALL_LEADER_EVIDENCE_INVALID');
  }
  return failures;
 }
 function witnessIssues(proof,expectedX,top,base,tolerance,view){
  const w=proof?.witness;if(proof?.status!=='proposed'||!w||!Number.isInteger(w.x)||!Number.isInteger(w.observedTop)||!near(w.expectedX,expectedX)||!near(w.expectedTop,top)||!near(w.xResidual,w.x-expectedX)||!near(w.topResidual,w.observedTop-top)||Math.abs(w.xResidual)>tolerance||Math.abs(w.topResidual)>tolerance||!near(w.tolerancePixels,tolerance)||!samePoints(w.stroke?.anchors,[[w.x,Math.ceil(top)],[w.x,Math.floor(base)]])||!validStroke(w.stroke,view)||!samePoints(w.outsideAbove?.anchors,[[w.x,w.observedTop-3],[w.x,w.observedTop-1]])||w.outsideAbove.support!==0||w.outsideAbove.maxGap!==3)return ['KEYED_WALL_VERTICAL_EVIDENCE_INVALID'];
  return [];
 }
 function planeIssues(plane,inventory,level,{confirm=true}={}){
  const errors=[];
  try{
   const e=plane?.keyedWallEvidence,o=e?.sourceObservation,view=inventory?.views?.find(v=>v.id===plane?.sourceViewId),contour=level?.contours?.find(c=>c.contourId===e?.parentContourId),extent=e?.physicalExtent,proposal=level?.reconstruction?.proposal,R=reconstruction();
   if(plane?.kind!=='source-keyed-wall'||e?.version!==1||e.method!=='plan-paired-skins-and-written-keyed-height-with-registered-deck'||e.geometryMethod!=='centre-plane-of-observed-paired-strokes'||e.representation!=='single-wall-plane-with-source-footprint-and-thickness'||!view||view.kind!=='floor'||view.buildingId!==level?.buildingId||view.levelId!==level?.sourceLevel||plane.buildingId!==level.buildingId||plane.levelId!==level.id||!sameFrame(plane.sourceFrame,view.frame)||!contour||contour.sourceViewId!==view.id||!M.scale(contour)||!finite(contour.base?.value)||!['proposed','confirmed'].includes(contour.levelRegistration?.status)||!proposal||proposal.sourceViewId!==view.id||proposal.levelId!==level.id||M.validateDraft(contour,inventory,level).length)return ['KEYED_WALL_SOURCE_REQUIRED'];
   if(!o||o.sourceViewId!==view.id||o.sourceLevel!==view.levelId||!sameFrame(o.sourceFrame,view.frame)||o.status!=='proposed'||o.leaderEvidence?.status!=='observed'||o.leaderEvidence?.targetBandId!==o.band?.id||o.leaderEvidence?.pointNotUsedAsWallEndpoint!==true)return ['KEYED_WALL_SOURCE_REQUIRED'];
   const stored=retainedKeyView(view,inventory,level,[o.sourceNote.keyFrame,o.calloutFrame]);errors.push(...stored.errors);
   const note=wallNotes(view).find(n=>n.id===o.sourceNote?.id),noteKey=note&&readKey(stored.view,o.sourceNote.keyFrame),calloutKey=readKey(stored.view,o.calloutFrame),keyMatches=(a,b)=>a&&b&&same(a,b);
   if(!note||!Object.entries(note).every(([key,value])=>same(value,o.sourceNote[key]))||!noteKey||!calloutKey||noteKey.text!==calloutKey.text||!keyMatches(noteKey,o.noteKey)||!keyMatches(calloutKey,o.calloutKey))errors.push('KEYED_WALL_KEY_OR_HEIGHT_SOURCE_INVALID');
   const band=o.band,cross=band?.axis,along=1-cross,at=band?.strokes?.map(s=>s.coordinate),atPoint=(x,y)=>cross===0?[x,y]:[y,x];
   if(![0,1].includes(cross)||at?.length!==2||!at.every(finite)||!(at[1]>at[0])||extent?.status!=='proposed'||extent.method!=='full-raster-continuous-pair-with-finite-cap-and-independent-parent-contact'||extent.notRoiTermination!==true||extent.extent?.length!==2||!extent.extent.every(Number.isInteger)||!(extent.extent[1]>extent.extent[0])||!same(extent.strokeCoordinates,at)||!near(extent.center,(at[0]+at[1])/2)||!near(extent.thicknessPixels,at[1]-at[0])||![0,1].includes(extent.host?.end)||extent.freeEnd!==1-extent.host.end)return [...errors,'KEYED_WALL_EXTENT_EVIDENCE_INVALID'];
   errors.push(...sourceAssociationIssues(o,view,extent));
   const footprint=[atPoint(at[0],extent.extent[0]),atPoint(at[1],extent.extent[0]),atPoint(at[1],extent.extent[1]),atPoint(at[0],extent.extent[1])],centreline=[atPoint(extent.center,extent.extent[0]),atPoint(extent.center,extent.extent[1])],sourceSize=[view.payload?.sourceWidth||view.frame.rasterSize[0],view.payload?.sourceHeight||view.frame.rasterSize[1]];
   if(!samePoints(extent.sourceFootprint,footprint)||!samePoints(extent.sourceCentreline,centreline)||extent.extent[0]<2||extent.extent[1]>sourceSize[along]-3||extent.caps?.length!==2)errors.push('KEYED_WALL_EXTENT_EVIDENCE_INVALID');
   else for(let i=0;i<2;i++){const cap=extent.caps[i];if(cap.coordinate!==extent.extent[i]||!samePoints(cap.closure?.anchors,[atPoint(at[0],cap.coordinate),atPoint(at[1],cap.coordinate)])||!validStroke(cap.closure,view,{minimum:.9,gap:1})||cap.outside?.length!==2||cap.outside.some((p,j)=>p.coordinate!==cap.coordinate+(i?j+1:-j-1)||p.pairedInk!==false))errors.push('KEYED_WALL_FINITE_CAP_REQUIRED');}
   if(extent.continuousSkins?.length!==2||extent.continuousSkins.some((skin,i)=>!samePoints(skin?.anchors,[atPoint(at[i],extent.extent[0]),atPoint(at[i],extent.extent[1])])||!validStroke(skin,view,{minimum:1,gap:0})))errors.push('KEYED_WALL_CONTINUOUS_PAIR_REQUIRED');
   const host=extent.host,points=contour.points.map(p=>p.xy),edge=points[host.edgeIndex],nextEdge=points[(host.edgeIndex+1)%points.length],width=at[1]-at[0];
   if(!edge||!nextEdge||!samePoints(host.edgeAnchors,[edge,nextEdge])||Math.abs(edge[along]-nextEdge[along])>.01||Math.abs(extent.extent[host.end]-edge[along])>1||!near(host.coordinate,edge[along])||extent.center<Math.min(edge[cross],nextEdge[cross])||extent.center>Math.max(edge[cross],nextEdge[cross])||!samePoints([host.intersection],[atPoint(extent.center,edge[along])])||!samePoints(host.stroke?.anchors,[atPoint(at[0]-width*2,edge[along]),atPoint(at[1]+width*2,edge[along])])||!validStroke(host.stroke,view,{minimum:.94,gap:1})||host.method!=='continuous-paired-wall-strokes-terminate-on-observed-parent-edge')errors.push('KEYED_WALL_PARENT_CONTACT_INVALID');
   const expectedFootprint=M.modelPoints({...contour,points:footprint.map((xy,i)=>({id:'keyed-skin-'+i,xy}))}),expectedLine=M.modelPoints({...contour,points:centreline.map((xy,i)=>({id:'keyed-axis-'+i,xy}))}),[from,to]=expectedLine,length=M.distance(from,to),normal=[(to[1]-from[1])/length,(from[0]-to[0])/length,0];
   if(!samePoints([plane.from,plane.to],expectedLine)||!samePoints(plane.footprint,expectedFootprint)||!near(plane.thickness,width*M.scale(contour))||!near(plane.height,note?.value)||!near(plane.base,contour.base.value)||!plane.normal?.every((n,i)=>near(n,normal[i]))||plane.normal.length!==3||M.validatePolygon(plane.footprint).length)errors.push('KEYED_WALL_GEOMETRY_MISMATCH');
   const wm=plane.measurements?.width,hm=plane.measurements?.height;
   if(wm?.kind!=='estimated-calibrated'||!near(wm.value,length)||wm.sourceViewId!==view.id||!sameFrame(wm.sourceFrame,view.frame)||!samePoints(wm.anchors,centreline)||!near(wm.scaleUsed,M.scale(contour))||!same(referenceSource(wm.reference),referenceSource(contour.reference))||[wm.reference,contour.reference].some(r=>r.pdfAnchors&&!samePoints(r.pdfAnchors,r.anchors.map(p=>M.pdfPoint(view,p))))||wm.method!=='centreline-derived-from-two-observed-plan-skins'||hm?.kind!=='written'||!near(hm.value,note?.value)||hm.sourceViewId!==view.id||!sameFrame(hm.sourceFrame,view.frame)||!same(hm.textBox,note?.textBox)||hm.text!==note?.text||!same(hm.sourceReading,note?.sourceReading)||hm.anchors!==undefined)errors.push('KEYED_WALL_MEASUREMENTS_INVALID');
   const reg=plane.registration;
   if(reg?.kind!=='source-keyed-wall-registration'||reg.parentContourId!==contour.contourId||reg.sourceFloorViewId!==view.id||reg.sourceLevel!==level.sourceLevel||!same(withoutStatus(reg.alignment),withoutStatus(contour.alignment))||!near(reg.baseValue,contour.base.value)||!['proposed','confirmed'].includes(reg.status))errors.push('KEYED_WALL_REGISTRATION_INVALID');
   if(!e.baseProofs?.length)errors.push('KEYED_WALL_BASE_UNRESOLVED');
   const outward=expectedLine[extent.freeEnd].map((n,i)=>n-expectedLine[host.end][i]),outwardLength=Math.hypot(...outward),alongName=cross===0?'y':'x';
   for(const proof of e.baseProofs||[]){const source=inventory.views.find(v=>v.id===proof.sourceViewId&&v.kind==='elevation'&&v.buildingId===level.buildingId),info=proposal.views?.find(v=>v.viewId===proof.sourceViewId),actual=info&&R?.elevationRegistration(info,contour,inventory),axis=info?.axisRegistration,transform=axis?.transform,n=facingNormal(info?.direction);
    if(!source||!actual?.levelBand||!sameFrame(proof.sourceFrame,source.frame)||!same(proof.axisRegistration,axis)||!same(proof.levelBand,actual.levelBand)||proof.direction!==info.direction||axis?.status!=='proposed'||axis.floorSourceViewId!==view.id||axis.elevationSourceViewId!==source.id||!sameFrame(axis.sourceFrames?.floor,view.frame)||!sameFrame(axis.sourceFrames?.elevation,source.frame)||!n||!['x','y'].includes(transform?.floorAxis)||![transform.scale,transform.offset].every(finite)||!transform.scale||transform.floorAxis===alongName||outward.reduce((sum,v,i)=>sum+v*n[i],0)<outwardLength*.99){errors.push('KEYED_WALL_BASE_REGISTRATION_INVALID');continue;}
    const top=actual.pixelZ(contour.base.value+note.value),base=actual.pixelZ(contour.base.value),tolerance=Math.max(1,axis.tolerancePixels||0),expected=at.map(v=>v*transform.scale+transform.offset).sort((a,b)=>a-b);
    if(!near(proof.baseValue,contour.base.value)||!near(proof.topY,top)||!near(proof.baseY,base)||!['sx','sz','min','max'].every(k=>near(proof.metricRegistration?.[k],actual[k]))||!same(proof.expectedSkinCoordinates,expected)||proof.skins?.length!==2||proof.method!=='paired-finite-wall-skins-joined-to-observed-deck-at-registered-floor-datum'){errors.push('KEYED_WALL_BASE_EVIDENCE_INVALID');continue;}
    for(let i=0;i<2;i++)errors.push(...witnessIssues(proof.skins[i],expected[i],top,base,tolerance,source));
    if(proof.skins[0].witness?.x>=proof.skins[1].witness?.x||!proof.deck?.length)errors.push('KEYED_WALL_DECK_CONTACT_REQUIRED');
    for(const deck of proof.deck||[]){const i=deck.skinIndex,skin=proof.skins[i]?.witness,y=deck.anchors?.[0]?.[1],reach=Math.max(6,(expected[1]-expected[0])*3);if(![0,1].includes(i)||!skin||!finite(y)||Math.abs(y-base)>1||!near(deck.datumResidualPixels,y-base)||!samePoints(deck.anchors,[[skin.x,y],[skin.x+(i?1:-1)*reach,y]])||!validStroke(deck,source,{minimum:.94,gap:1}))errors.push('KEYED_WALL_DECK_CONTACT_REQUIRED');}
   }
   if(!same(reg?.sourceViewIds,[view.id,...(e.baseProofs||[]).map(p=>p.sourceViewId)]))errors.push('KEYED_WALL_REGISTRATION_INVALID');
   if(!Array.isArray(e.lateralCorroborations))errors.push('KEYED_WALL_CORROBORATION_INVALID');
   for(const proof of e.lateralCorroborations||[]){const source=inventory.views.find(v=>v.id===proof.sourceViewId&&v.kind==='elevation'&&v.buildingId===level.buildingId),info=proposal.views?.find(v=>v.viewId===proof.sourceViewId),actual=info&&R?.elevationRegistration(info,contour,inventory),axis=info?.axisRegistration,transform=axis?.transform;
    if(proof.purpose!=='optional-projected-cap-corroboration'||proof.individualWallFaceObserved!==false||!source||!actual?.levelBand||!sameFrame(proof.sourceFrame,source.frame)||!same(proof.axisRegistration,axis)||!same(proof.levelBand,actual.levelBand)||proof.direction!==info.direction||axis?.status!=='proposed'||axis.floorSourceViewId!==view.id||axis.elevationSourceViewId!==source.id||!sameFrame(axis.sourceFrames?.floor,view.frame)||!sameFrame(axis.sourceFrames?.elevation,source.frame)||transform?.floorAxis!==alongName||![transform.scale,transform.offset].every(finite)||!transform.scale){errors.push('KEYED_WALL_CORROBORATION_INVALID');continue;}
    const coordinate=extent.extent[extent.freeEnd],expectedX=coordinate*transform.scale+transform.offset,top=actual.pixelZ(contour.base.value+note.value),base=actual.pixelZ(contour.base.value),tolerance=Math.max(1,axis.tolerancePixels||0);
    if(!near(proof.planCoordinate,coordinate)||!near(proof.baseValue,contour.base.value)||!near(proof.topY,top)||!near(proof.baseY,base)||!['sx','sz','min','max'].every(k=>near(proof.metricRegistration?.[k],actual[k]))||witnessIssues(proof,expectedX,top,base,tolerance,source).length)errors.push('KEYED_WALL_CORROBORATION_INVALID');
   }
   if(plane.id!=='wall:'+level.id+':keyed:'+view.id+':'+o.calloutFrame.id||(level.observedPlanes||[]).filter(p=>p.id===plane.id).length>1)errors.push('KEYED_WALL_ID_INVALID');
   if(!['proposed','confirmed'].includes(plane.status)||confirm&&(plane.status!=='confirmed'||reg?.status!=='confirmed'||wm?.status!=='confirmed'||hm?.status!=='confirmed'))errors.push('KEYED_WALL_UNCONFIRMED');
  }catch(_){errors.push('KEYED_WALL_EVIDENCE_INVALID');}
  return [...new Set(errors)];
 }
 function historyIssues(next,previous){
  const planes=value=>Array.isArray(value?.levels)?value.levels.flatMap(l=>l.observedPlanes||[]):Array.isArray(value?.observedPlanes)?value.observedPlanes:value?.id?[value]:[],before=planes(previous),after=planes(next),errors=[];
  const retained=plane=>{const value=copy(plane),registration=withoutStatus(value.registration),measurements=copy(value.measurements||{});if(registration.alignment)registration.alignment=withoutStatus(registration.alignment);for(const m of Object.values(measurements)){delete m.status;if(m.reference)m.reference=referenceSource(m.reference);}return {id:value.id,kind:value.kind,buildingId:value.buildingId,levelId:value.levelId,sourceViewId:value.sourceViewId,sourceFrame:value.sourceFrame,from:value.from,to:value.to,normal:value.normal,height:value.height,base:value.base,footprint:value.footprint,thickness:value.thickness,registration,measurements,keyedWallEvidence:value.keyedWallEvidence};};
  for(const old of before.filter(p=>p.kind==='source-keyed-wall'||p.keyedWallEvidence)){const current=after.find(p=>p.id===old.id);if(!current)errors.push('KEYED_WALL_SOURCE_REMOVED');else if(!same(retained(current),retained(old)))errors.push('KEYED_WALL_SOURCE_OR_GEOMETRY_CHANGED');}
  return [...new Set(errors)];
 }

 // Source observations are useful before a wall can be generated. The plan
 // note provides a local height, never an absolute balcony altitude. Competing
 // plan caps can be roof edges or guard rails; keep them until another view
 // identifies the physical ends and a visible deck/base establishes Z.
 function propose(inventory,buildingId,images,level,draft,{discovery=null}={}){
  const source=planCandidates(inventory,buildingId,images,level,draft,{discovery}),pending=['KEYED_WALL_EXTENT_UNRESOLVED','KEYED_WALL_BASE_UNRESOLVED','KEYED_WALL_ELEVATION_REGISTRATION_REQUIRED'];
  return {version:1,status:source.candidates.length?'unresolved':'not-found',buildingId,levelId:level.id,sourceLevel:level.sourceLevel,observations:source.candidates.map(c=>({...c,geometryStatus:'unresolved',unresolved:pending.slice()})),issues:[...new Set([...source.issues,...(source.candidates.length?pending:[])])],geometryCreated:false,complete:false,confirmationRequired:source.candidates.length>0};
 }

 return Object.freeze({version:1,sourceImage,inkFor,wallNotes,keyFrames,discover,readKey,sourceBands,leaderAssociation,planCandidates,physicalExtent,verticalWitness,evidenceGeometry,propose,resolve,issues:planeIssues,historyIssues});
});
