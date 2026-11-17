/* Local raster geometry proposals. Pixels/labels are evidence, never a wall texture. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MIRReconstructionVision=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 function rectangleFilter(mask,w,h,radiusX,radiusY,all){
  const stride=w+1,sum=new Uint32Array(stride*(h+1)),out=new Uint8Array(mask.length);
  for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=mask[y*w+x];sum[(y+1)*stride+x+1]=sum[y*stride+x+1]+row;}}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=x-(all?Math.floor(radiusX):Math.ceil(radiusX)),b=x+(all?Math.ceil(radiusX):Math.floor(radiusX))+1,c=y-(all?Math.floor(radiusY):Math.ceil(radiusY)),d=y+(all?Math.ceil(radiusY):Math.floor(radiusY))+1;if(all&&(a<0||c<0||b>w||d>h))continue;const l=Math.max(0,a),r=Math.min(w,b),t=Math.max(0,c),bottom=Math.min(h,d),n=sum[bottom*stride+r]-sum[t*stride+r]-sum[bottom*stride+l]+sum[t*stride+l];out[y*w+x]=all?Number(n===(2*radiusX+1)*(2*radiusY+1)):Number(n>0);}
  return out;
 }
 const opening=(mask,w,h,rx,ry)=>rectangleFilter(rectangleFilter(mask,w,h,rx,ry,true),w,h,rx,ry,false);
 const closing=(mask,w,h,rx,ry)=>rectangleFilter(rectangleFilter(mask,w,h,rx,ry,false),w,h,rx,ry,true);
 function components(mask,w,h){const visited=new Uint8Array(mask.length),queue=new Uint32Array(mask.length),result=[];
  for(let start=0;start<mask.length;start++){if(!mask[start]||visited[start])continue;let head=0,tail=1;queue[0]=start;visited[start]=1;let left=w,right=0,top=h,bottom=0;
   while(head<tail){const i=queue[head++],x=i%w,y=(i-x)/w;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);for(const j of [x?i-1:-1,x+1<w?i+1:-1,y?i-w:-1,y+1<h?i+w:-1])if(j>=0&&mask[j]&&!visited[j]){visited[j]=1;queue[tail++]=j;}}
   result.push({area:tail,box:[left,top,right-left+1,bottom-top+1],pixels:queue.slice(0,tail)});
  }return result.sort((a,b)=>b.area-a.area);
 }
 function fillHoles(mask,w,h){const outside=new Uint8Array(mask.length),queue=new Uint32Array(mask.length);let head=0,tail=0;const add=i=>{if(!mask[i]&&!outside[i]){outside[i]=1;queue[tail++]=i;}};for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}while(head<tail){const i=queue[head++],x=i%w,y=(i-x)/w;if(x)add(i-1);if(x+1<w)add(i+1);if(y)add(i-w);if(y+1<h)add(i+w);}return outside.map(v=>Number(!v));}
 function outline(mask,w,h){const edges=new Map(),key=(x,y)=>y*(w+1)+x,add=(x,y,a,b)=>edges.set(key(x,y),key(a,b));let start=null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!mask[i])continue;if(!y||!mask[i-w]){add(x,y,x+1,y);if(start===null)start=key(x,y);}if(x+1===w||!mask[i+1])add(x+1,y,x+1,y+1);if(y+1===h||!mask[i+w])add(x+1,y+1,x,y+1);if(!x||!mask[i-1])add(x,y+1,x,y);}
  if(start===null)return [];let cursor=start;const points=[];for(let n=0;n<=edges.size;n++){points.push([cursor%(w+1),Math.floor(cursor/(w+1))]);cursor=edges.get(cursor);if(cursor===start)return points;if(cursor==null)return [];}return [];
 }
 function simplify(points,tolerance){
  const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
  function part(p){if(p.length<3)return p;let best=0,index=0;for(let i=1;i<p.length-1;i++){const d=distance(p[i],p[0],p.at(-1));if(d>best){best=d;index=i;}}return best>tolerance?[...part(p.slice(0,index+1)).slice(0,-1),...part(p.slice(index))]:[p[0],p.at(-1)];}
  if(points.length<4)return points;let opposite=1;for(let i=2;i<points.length;i++)if(Math.hypot(points[i][0]-points[0][0],points[i][1]-points[0][1])>Math.hypot(points[opposite][0]-points[0][0],points[opposite][1]-points[0][1]))opposite=i;
  return [...part(points.slice(0,opposite+1)).slice(0,-1),...part([...points.slice(opposite),points[0]]).slice(0,-1)];
 }
 function removeStraight(points){let next=points;for(let pass=0;pass<3;pass++){
  // Axis snapping can put neighbouring vertices on the same source corner.
  // Keep one copy before testing collinearity: deleting both copies cuts a
  // diagonal across the building, although no diagonal exists in the source.
  const before=next.filter((p,i)=>Math.hypot(p[0]-next[(i+next.length-1)%next.length][0],p[1]-next[(i+next.length-1)%next.length][1])>.01);
  next=before.filter((p,i)=>{const a=before[(i+before.length-1)%before.length],b=before[(i+1)%before.length];return Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>.01;});if(next.length===before.length)break;
 }return next;}
 function alignOutline(points,ink,w,h,k){
  points=removeStraight(points);const stride=w+1,sum=new Uint32Array(stride*(h+1));for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=ink[y*w+x];sum[(y+1)*stride+x+1]=sum[y*stride+x+1]+row;}}
  const count=(x0,y0,x1,y1)=>{const l=Math.max(0,Math.floor(x0)),t=Math.max(0,Math.floor(y0)),r=Math.min(w,Math.ceil(x1)),b=Math.min(h,Math.ceil(y1));return r>l&&b>t?(sum[b*stride+r]-sum[t*stride+r]-sum[b*stride+l]+sum[t*stride+l])/((r-l)*(b-t)):0;};
  const next=points.map(p=>p.slice());for(let i=0;i<points.length;i++){const j=(i+1)%points.length,a=points[i],b=points[j],dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]),vertical=dx<=k*2&&dy>k*3,horizontal=dy<=k*2&&dx>k*3;if(!vertical&&!horizontal)continue;const axis=vertical?0:1,position=(a[axis]+b[axis])/2;let best=null;for(let coordinate=Math.round(position-k*4);coordinate<=position+k*4;coordinate++){const support=vertical?count(coordinate-k/2,Math.min(a[1],b[1]),coordinate+k/2,Math.max(a[1],b[1])):count(Math.min(a[0],b[0]),coordinate-k/2,Math.max(a[0],b[0]),coordinate+k/2);if(support<.65)continue;const distance=Math.abs(coordinate-position);if(!best||distance<best.distance)best={coordinate,distance};}if(best){next[i][axis]=best.coordinate;next[j][axis]=best.coordinate;}}
  return removeStraight(next);
 }
 function consolidateAxes(points,tolerance){for(const axis of [0,1]){const ordered=points.map((p,i)=>({value:p[axis],i,weight:Math.abs(points[(i+points.length-1)%points.length][1-axis]-p[1-axis])+Math.abs(points[(i+1)%points.length][1-axis]-p[1-axis])})).sort((a,b)=>a.value-b.value),groups=[];for(const item of ordered){if(!groups.length||item.value-groups.at(-1).at(-1).value>tolerance)groups.push([item]);else groups.at(-1).push(item);}for(const group of groups){const chosen=group.reduce((a,b)=>b.weight>a.weight?b:a);for(const item of group)points[item.i][axis]=chosen.value;}}return removeStraight(points);}
 function monochrome(image){const out=new Uint8Array(image.width*image.height);for(let i=0;i<out.length;i++){const j=i*4,r=image.data[j],g=image.data[j+1],b=image.data[j+2];out[i]=Number(image.data[j+3]>100&&(r+g+b)<630&&Math.max(r,g,b)-Math.min(r,g,b)<45);}return out;}
 // A missing boundary segment is explainable only when its own raster shows
 // both jambs, the hinged leaf and a curved swing between them. Text, masks or
 // a simple L shape cannot substitute for that independent source evidence.
 function floorDoorEvidence(image,a,b,run,ink=monochrome(image)){
 const {width:w,height:h}=image,k=Math.max(2,Math.round(w/525)),length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],inside=run.inside,tolerance=Math.max(1,Math.round(k/2));
 const point=(n,v)=>[a[0]+u[0]*n+inside[0]*v,a[1]+u[1]*n+inside[1]*v];
 // Thin neutral swing arcs can survive the PDF/JPEG raster as pale strokes.
 // Require brighter paper on opposite sides of each such pixel; a colour
 // fill, blank patch, broad grey region or compression speck is not a stroke.
 const observedCache=new Map(),observed=(x,y)=>{const at=y*w+x;if(ink[at])return true;if(observedCache.has(at))return observedCache.get(at);const j=at*4,d=image.data,r=d[j],g=d[j+1],b=d[j+2];let found=false;
  if(d[j+3]>100&&Math.max(r,g,b)<240&&Math.max(r,g,b)-Math.min(r,g,b)<25)for(const [dx,dy]of [[3,0],[0,3],[3,3],[3,-3]]){if(x-dx<0||x-dx>=w||x+dx<0||x+dx>=w||y-dy<0||y-dy>=h||y+dy<0||y+dy>=h)continue;const neighbours=[((y-dy)*w+x-dx)*4,((y+dy)*w+x+dx)*4];if(neighbours.every(n=>Math.min(d[n]-r,d[n+1]-g,d[n+2]-b)>=18&&Math.max(d[n],d[n+1],d[n+2])-Math.min(d[n],d[n+1],d[n+2])<25)){found=true;break;}}
  observedCache.set(at,found);return found;};
 const hit=(n,v,pad=tolerance)=>{const [cx,cy]=point(n,v);for(let dy=-pad;dy<=pad;dy++)for(let dx=-pad;dx<=pad;dx++){const x=Math.round(cx+dx),y=Math.round(cy+dy);if(x>=0&&x<w&&y>=0&&y<h&&observed(x,y))return true;}return false;};
 const series=points=>{let hits=0,gap=0,maxGap=0;for(const p of points){if(hit(...p)){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}return {support:hits/points.length,maxGap};};
 const line=(n0,v0,n1,v1)=>{const len=Math.hypot(n1-n0,v1-v0),points=Array.from({length:Math.max(2,Math.ceil(len)+1)},(_,i)=>[n0+(n1-n0)*i/(Math.ceil(len)),v0+(v1-v0)*i/Math.ceil(len)]);return series(points);};
 const wallSupport=(n0,n1,depth)=>{let hits=0,gap=0,maxGap=0;const count=Math.max(1,Math.ceil(n1-n0));for(let i=0;i<=count;i++){const [x,y]=point(n0+(n1-n0)*i/count,depth).map(Math.round),hit=x>=0&&x<w&&y>=0&&y<h&&ink[y*w+x];if(hit){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}return {support:hits/(count+1),maxGap};};
 const adjacentWallPair=(left,right,radius)=>{for(let depth=-k;depth<=k;depth++){const before=wallSupport(left-radius,left-k,depth),after=wallSupport(right+k,right+radius,depth);if(before.support>=.9&&after.support>=.9&&before.maxGap<=2&&after.maxGap<=2)return {before,after,depth};}return null;};
 const gapWidth=run.to-run.from,maxWidth=Math.min(w*.07,length*.2,Math.max(k*8,gapWidth*4)),search=Math.ceil(Math.min(maxWidth,gapWidth*2)),jambs=[];
 for(let n=Math.floor(run.from-search);n<=Math.ceil(run.to+search);n++){if(n<k*3||n>length-k*3||n>run.from-tolerance&&n<run.to+tolerance)continue;for(let depth=k;depth<=k*6;depth++){const p=line(n,0,n,depth);if(p.support>=.85&&p.maxGap<=2)jambs.push({n,depth});}}
 const candidates=[];
 for(const left of jambs.filter(j=>j.n<=run.from))for(const right of jambs.filter(j=>j.n>=run.to)){
  const radius=right.n-left.n,depth=left.depth;if(depth!==right.depth||radius<Math.max(k*4,gapWidth)||radius>maxWidth||depth>radius*.65)continue;
  const neighbours=adjacentWallPair(left.n,right.n,radius);if(!neighbours)continue;const leftWall={...neighbours.before,normalOffset:neighbours.depth},rightWall={...neighbours.after,normalOffset:neighbours.depth};
  for(const side of [1,-1]){const center=side===1?left.n:right.n,leaf=line(center,depth,center,depth+radius);if(leaf.support<.8||leaf.maxGap>k*2)continue;
   const leafExtension=line(center,depth+radius+k,center,depth+radius+k*3);if(leafExtension.support>.65||leafExtension.maxGap<Math.max(3,tolerance+1))continue;
   const count=Math.ceil(Math.PI*radius/2),samples=Array.from({length:count+1},(_,i)=>[center+side*radius*Math.cos(i/count*Math.PI/2),depth+radius*Math.sin(i/count*Math.PI/2)]),arc=series(samples),middle=series(samples.slice(Math.floor(count/3),Math.ceil(count*2/3)));
   if(arc.support<.82||arc.maxGap>k*2||middle.support<.85)continue;
   const tangentLength=Math.max(3,Math.min(radius*.25,k*3)),tangentSteps=Math.ceil(tangentLength),atLeaf=series(Array.from({length:tangentSteps},(_,j)=>[center+side*(j+1),depth+radius])),atJamb=series(Array.from({length:tangentSteps},(_,j)=>[center+side*radius,depth+j+1]));
   candidates.push({from:left.n,to:right.n,depth,radius,side,score:arc.support+leaf.support+middle.support,arc,leaf,leafExtension,tangents:{atLeaf,atJamb},jambs:[left,right],sourcePoints:{hinge:point(center,depth),leafTip:point(center,depth+radius),oppositeJamb:point(center+side*radius,depth)},arcPoints:samples.filter((_,i)=>i%Math.max(1,Math.floor(count/8))===0).map(p=>point(...p)),leftWall,rightWall});
  }
 }
 candidates.sort((a,b)=>b.score-a.score||a.arc.maxGap-b.arc.maxGap||a.radius-b.radius);const best=candidates[0];return best?{...best,kind:'observed-door-swing',method:'two-jambs-leaf-and-quarter-circle',coordinateSystem:'source-raster-pixels',status:'proposed',confirmationRequired:true,tolerancePx:tolerance,sourcePixelRule:{primary:'monochrome',pale:{maximumChannelExclusive:240,maximumChromaExclusive:25,minimumOppositeContrast:18,oppositeProbePixels:3}},metricWidth:null,note:'The observed door gap explains missing wall ink; it does not establish a written width, height or confirmed opening.'}:null;
}
 // Sliding openings have no swing arc. Require their two jambs, a continuous
 // rail, two offset tracks and their visible joint on this same wall.
 function floorSlidingFrameEvidence(image,a,b,run,ink=monochrome(image)){
 const {width:w,height:h}=image,k=Math.max(2,Math.round(w/525)),length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],inside=run.inside,point=(n,d)=>[a[0]+u[0]*n+inside[0]*d,a[1]+u[1]*n+inside[1]*d],hit=(n,d)=>{const [x,y]=point(n,d).map(Math.round);return x>=0&&x<w&&y>=0&&y<h&&!!ink[y*w+x];};
 const support=values=>{let n=0,gap=0,maxGap=0;for(const h of values){if(h){n++;gap=0;}else maxGap=Math.max(maxGap,++gap);}return {support:n/values.length,maxGap};};
 const min=Math.max(k*4,Math.floor(run.from-Math.min(w*.12,length*.35))),max=Math.min(length-k*4,Math.ceil(run.to+Math.min(w*.12,length*.35))),caps=[];
 for(let n=min;n<=max;n++){if(n>=run.from&&n<=run.to)continue;let best=null;for(let start=-k;start<=k;start++)for(let end=start+k*2;end<=k*5;end++){const s=support(Array.from({length:end-start+1},(_,i)=>hit(n,start+i)));if(s.support<.9||s.maxGap>1)continue;const c={n,start,end,...s};if(!best||end-start>best.end-best.start)best=c;}if(best)caps.push(best);}
 const candidates=[];
 for(const left of caps.filter(c=>c.n<run.from))for(const right of caps.filter(c=>c.n>run.to)){
  const span=right.n-left.n,lo=Math.max(left.start,right.start),hi=Math.min(left.end,right.end),ns=Array.from({length:Math.max(0,right.n-left.n-3)},(_,i)=>left.n+i+2);if(span<k*6||span>Math.min(w*.12,length*.35)||hi-lo<k*2||!ns.length)continue;
  const rails=[];for(let d=lo+1;d<hi;d++){const s=support(ns.map(n=>hit(n,d)));if(s.support>=.9&&s.maxGap<=k)rails.push({depth:d,...s});}
  for(const rail of rails){const tracks=[];
   for(let d=lo+1;d<hi;d++){if(Math.abs(d-rail.depth)<3)continue;const observed=ns.map(n=>hit(n,d)&&Array.from({length:Math.abs(d-rail.depth)-1},(_,i)=>!hit(n,Math.min(d,rail.depth)+i+1)).some(Boolean));let first=null;for(let i=0;i<=observed.length;i++){if(observed[i]&&first===null)first=i;if((!observed[i]||i===observed.length)&&first!==null){if(i-first>=span*.28)tracks.push({depth:d,from:ns[first],to:ns[i-1],support:1});first=null;}}}
   for(const first of tracks)for(const second of tracks){if(Math.abs(first.depth-second.depth)<Math.max(2,k/2)||Math.abs(first.from-left.n)>k||Math.abs(second.to-right.n)>k||first.to>left.n+span*.75||second.from<left.n+span*.25||Math.abs(first.to-second.from)>k*2)continue;
    const union=support(ns.map(n=>hit(n,first.depth)||hit(n,second.depth)));if(union.support<.9||union.maxGap>k)continue;
    let joint=null;for(let n=Math.min(first.to,second.from)-k;n<=Math.max(first.to,second.from)+k;n++){const lo=Math.min(first.depth,second.depth),hi=Math.max(first.depth,second.depth),s=support(Array.from({length:hi-lo+1},(_,i)=>hit(n,lo+i)));if(s.support>=.9&&s.maxGap<=1){joint={n,from:point(n,lo),to:point(n,hi),...s};break;}}if(!joint)continue;
    // Both wall skins continue past the jambs; an isolated diagram or a pair
    // of dimension ticks cannot stand in for a bounded opening in this wall.
    let continuation=null;for(let d=-k;d<=k;d++){const before=support(Array.from({length:k*4},(_,i)=>hit(left.n-k-i,d))),after=support(Array.from({length:k*4},(_,i)=>hit(right.n+k+i,d)));if(before.support>=.9&&after.support>=.9&&before.maxGap<=1&&after.maxGap<=1){continuation={depth:d,before,after};break;}}if(!continuation)continue;
    candidates.push({from:left.n,to:right.n,kind:'observed-sliding-frame',method:'paired-jambs-continuous-rail-and-offset-sliding-tracks',status:'proposed',confirmationRequired:true,metricWidth:null,coordinateSystem:'source-raster-pixels',jambs:[left,right].map(c=>({...c,anchors:[point(c.n,c.start),point(c.n,c.end)]})),rail:{...rail,anchors:[point(left.n,rail.depth),point(right.n,rail.depth)]},tracks:[first,second].map(t=>({...t,anchors:[point(t.from,t.depth),point(t.to,t.depth)]})),joint,continuation,coverage:union,swing:null});
   }
  }
 }
 candidates.sort((a,b)=>b.coverage.support-a.coverage.support||(a.to-a.from)-(b.to-b.from));return candidates[0]||null;
}
 function floorBoundaryEvidence(image,points,ink=monochrome(image)){
  const {width:w,height:h}=image,k=Math.max(2,Math.round(w/525)),limit=Math.max(4,k*2),orientation=Math.sign(points.reduce((s,p,i)=>{const b=points[(i+1)%points.length];return s+p[0]*b[1]-b[0]*p[1];},0));
  return points.map((a,i)=>{const b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],diagonal=Math.abs(b[0]-a[0])>k&&Math.abs(b[1]-a[1])>k,pad=diagonal?Math.max(1,Math.round(k/2)):k,samples=[],runs=[];let hits=0,gap=0,maxGap=0;
   for(let n=0;n<=length;n++){let hit=false;for(let d=-pad;d<=pad;d++){const x=Math.round(a[0]+u[0]*n-u[1]*d),y=Math.round(a[1]+u[1]*n+u[0]*d);if(x>=0&&x<w&&y>=0&&y<h)hit||=!!ink[y*w+x];}samples.push(hit);if(hit){hits++;if(gap>limit)runs.push({from:n-gap,to:n-1});gap=0;}else maxGap=Math.max(maxGap,++gap);}
   if(gap>limit)runs.push({from:samples.length-gap,to:samples.length-1});
   const support=hits/(Math.floor(length)+1),enoughInk=length>0&&support>=(length<k*5?.65:.86),openingEvidence=[];
   if(enoughInk&&!diagonal&&runs.length&&runs.length<=12)for(const run of runs){const context={...run,inside:[-orientation*u[1],orientation*u[0]]},evidence=floorDoorEvidence(image,a,b,context,ink)||floorSlidingFrameEvidence(image,a,b,context,ink);if(evidence)openingEvidence.push({...evidence,edgeIndex:i,explainedRun:run});}
   let unexplainedMaxGap=0,unexplainedGap=0;for(let n=0;n<samples.length;n++){if(samples[n]||openingEvidence.some(e=>n>=e.from&&n<=e.to))unexplainedGap=0;else unexplainedMaxGap=Math.max(unexplainedMaxGap,++unexplainedGap);}
   const supported=enoughInk&&unexplainedMaxGap<=limit;
   return {edgeIndex:i,anchors:[a.slice(),b.slice()],support,maxGap,tolerancePx:pad,status:supported?'proposed':'unresolved',method:openingEvidence.some(e=>e.kind==='observed-sliding-frame')?'source-strokes-and-observed-sliding-frame':openingEvidence.length?'source-strokes-and-observed-door-swing':'source-stroke-along-boundary',...(openingEvidence.length?{unexplainedMaxGap,openingEvidence}:{} )};
  });
 }
 function documentLabelsInside(rows,left,top,right,bottom){const labels=rows.filter(row=>Array.isArray(row.box)&&row.box.length===4&&(row.confidence??100)>=50&&row.box[0]>left&&row.box[1]>top&&row.box[2]<right&&row.box[3]<bottom).map(row=>String(row.text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s*[:.]$/,''));return labels.some(text=>/^(?:legende|legend|notes?(?: generales?)?|general notes?|(?:door|window|finish) schedule|tableau(?: des? .+)?)$/i.test(text))||new Set(labels.filter(text=>/^(?:(?:nom|no\.?|numero) (?:du |de )?projet|project (?:name|number)|echelle|scale|date|dessine par|drawn by|revision)$/i.test(text))).size>=2;}
 function componentAxisSegments(component,ink,w,vertical,minimum,tolerance){
  const cross=vertical?0:1,start=component.box[cross],columns=Array.from({length:component.box[cross+2]},()=>[]),groups=[];
  // Work from the component's own pixels, not every point in its bounding
  // box. Connected parallel skins can share a component through a short
  // transverse block; their white middle is never a longitudinal stroke.
  for(const i of component.pixels){const x=i%w,y=(i-x)/w;columns[(vertical?x:y)-start].push(vertical?y:x);}
  let previous=[];
  for(let offset=0;offset<columns.length;offset++){
   const positions=columns[offset].sort((a,b)=>a-b),at=start+offset,current=[];
   for(let first=0;first<positions.length;){
    let last=first;while(last+1<positions.length&&positions[last+1]===positions[last]+1)last++;
    let a=positions[first],b=positions[last];first=last+1;
    const observed=n=>ink[vertical?n*w+at:at*w+n];
    while(a<=b&&!observed(a))a++;while(b>=a&&!observed(b))b--;
    if(b-a+1<minimum)continue;let hits=0,gap=0,maxGap=0;
    for(let n=a;n<=b;n++){if(observed(n)){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}
    if(hits/(b-a+1)<.94||maxGap>2)continue;
    current.push({at,start:a,end:b,length:b-a+1,sourceSupport:hits/(b-a+1)});
   }
   // Adjacent occupied columns of one thick stroke share their actual
   // interval. A short bridge cannot merge the two longer wall skins.
   let cursor=0;
   for(const segment of current){
    while(cursor<previous.length&&previous[cursor].end<segment.start)cursor++;
    let group=null;
    for(let i=cursor;i<previous.length&&previous[i].start<=segment.end;i++){
     const prior=previous[i],overlap=Math.min(prior.end,segment.end)-Math.max(prior.start,segment.start)+1;
     if(overlap/Math.max(prior.length,segment.length)>=.9&&Math.abs(prior.start-segment.start)<=tolerance&&Math.abs(prior.end-segment.end)<=tolerance){group=prior.group;break;}
    }
    if(!group){group={best:segment};groups.push(group);}else if(segment.length>group.best.length||segment.length===group.best.length&&segment.sourceSupport>group.best.sourceSupport)group.best=segment;
    segment.group=group;
   }
   previous=current;
  }
  return groups.map(({best})=>({at:best.at,start:best.start,end:best.end,length:best.length}));
 }
 function thinFloorEnvelope(image,{sourceViewId=null,frame=null,rows=[]}={},recoverWideComponents=false){
  const {width:w,height:h}=image,ink=monochrome(image),unit=Math.max(1,w/1000),minimum=Math.max(18,Math.round(Math.max(w,h)*.015)),tolerance=Math.max(1,Math.round(w/1100)),maximumBand=Math.min(w,h)*.04,lines={};
  let hasWideComponents=false;
  // Preserve thin source strokes. A search width bounds the pairing work; it
  // never supplies a wall thickness, length, or an absent corner.
  for(const axis of ['x','y']){
   const vertical=axis==='y',mask=opening(closing(ink,w,h,vertical?0:1,vertical?1:0),w,h,vertical?0:Math.floor(minimum/2),vertical?Math.floor(minimum/2):0),parts=components(mask,w,h),maximumWidth=Math.max(6,unit*4),segments=parts.filter(c=>c.box[vertical?2:3]<=maximumWidth&&c.box[vertical?3:2]>=minimum).map(c=>({at:c.box[vertical?0:1]+(c.box[vertical?2:3]-1)/2,start:c.box[vertical?1:0],end:c.box[vertical?1:0]+c.box[vertical?3:2]-1,length:c.box[vertical?3:2]})),groups=[];
   for(const component of parts){const width=component.box[vertical?2:3];if(width<=maximumWidth||width>maximumBand||component.box[vertical?3:2]<minimum)continue;hasWideComponents=true;if(recoverWideComponents)segments.push(...componentAxisSegments(component,ink,w,vertical,minimum,tolerance));}
   segments.sort((a,b)=>a.at-b.at);
   for(const segment of segments){const group=groups.at(-1);if(group&&segment.at-group.at<=tolerance){group.parts.push(segment);if(segment.length>group.best.length){group.best=segment;group.at=segment.at;}}else groups.push({axis,at:segment.at,parts:[segment],best:segment});}
   if(groups.length>350)return {status:'unresolved',reason:'WALL_NETWORK_COMPLEXITY'};
   for(const line of groups){const length=vertical?h:w;line.observed=new Uint8Array(length);line.sum=new Uint32Array(length+1);for(let n=0;n<length;n++){for(let d=-tolerance;d<=tolerance;d++){const x=vertical?Math.round(line.at+d):n,y=vertical?n:Math.round(line.at+d);if(x>=0&&x<w&&y>=0&&y<h&&ink[y*w+x]){line.observed[n]=1;break;}}line.sum[n+1]=line.sum[n]+line.observed[n];}line.start=Math.min(...line.parts.map(p=>p.start));line.end=Math.max(...line.parts.map(p=>p.end));}
   lines[axis]=groups;
  }
  const support=(line,a,b)=>{const start=Math.max(0,Math.round(Math.min(a,b))),end=Math.min(line.observed.length-1,Math.round(Math.max(a,b)));return end>start?(line.sum[end+1]-line.sum[start])/(end-start+1):0;};
  // A dimension rail can cross a wall and its parallel companion. Such a
  // crossing is not a source corner: both outer strokes must actually end
  // there. Check their own pixels, not the wider near-line support strip,
  // which could accidentally join a nearby dimension extension.
  const endsAt=(line,at,direction)=>{let missing=0;for(let n=1;n<=Math.max(5,tolerance*4+2);n++){const k=Math.round(at+direction*n),x=line.axis==='x'?k:Math.round(line.at),y=line.axis==='x'?Math.round(line.at):k;if(x<0||x>=w||y<0||y>=h||!ink[y*w+x]){if(++missing>=2)return true;}else missing=0;}return false;};
  const corners=new Map(),cornerKey=(hi,vi,sx,sy)=>[hi,vi,sx,sy].join(':');
  for(let hi=0;hi<lines.x.length;hi++)for(let vi=0;vi<lines.y.length;vi++){
   const horizontal=lines.x[hi],vertical=lines.y[vi],x=vertical.at,y=horizontal.at;if(x<horizontal.start-tolerance||x>horizontal.end+tolerance||y<vertical.start-tolerance||y>vertical.end+tolerance)continue;
   for(const sx of [-1,1])for(const sy of [-1,1]){
    if(support(horizontal,x,x+sx*minimum)<.9||support(vertical,y,y+sy*minimum)<.9||!endsAt(horizontal,x,-sx)||!endsAt(vertical,y,-sy))continue;
    const parallelH=lines.x.filter(l=>(l.at-y)*sy>=tolerance*1.5&&(l.at-y)*sy<=maximumBand),parallelV=lines.y.filter(l=>(l.at-x)*sx>=tolerance*1.5&&(l.at-x)*sx<=maximumBand);let best=null;
    for(const innerH of parallelH)for(const innerV of parallelV){const nx=innerV.at,ny=innerH.at,dx=Math.abs(nx-x),dy=Math.abs(ny-y);if(!innerH.parts.some(p=>nx>=p.start-tolerance&&nx<=p.end+tolerance)||!innerV.parts.some(p=>ny>=p.start-tolerance&&ny<=p.end+tolerance)||support(innerH,nx,nx+sx*minimum)<.9||support(innerV,ny,ny+sy*minimum)<.9||support(horizontal,x,x+sx*Math.max(minimum,dx))<.9||support(vertical,y,y+sy*Math.max(minimum,dy))<.9)continue;const distance=dx+dy;if(!best||distance<best.distance)best={point:[x,y],innerPoint:[nx,ny],distance,hi,vi};}
    if(best)corners.set(cornerKey(hi,vi,sx,sy),best);
   }
  }
  const edgeCache=new Map(),edge=(line,a,b,inside)=>{
   const key=[line.axis,line.at,a,b,inside].join(':'),cached=edgeCache.get(key);if(cached)return cached;
   const start=Math.round(Math.min(a,b)),end=Math.round(Math.max(a,b)),parallel=lines[line.axis].filter(l=>(l.at-line.at)*inside>=tolerance*1.5&&(l.at-line.at)*inside<=maximumBand);let paired=0,count=0,run=0,maxGap=0;
   for(let n=start;n<=end;n++){if(n<0||n>=line.observed.length)continue;count++;if(line.observed[n]){run=0;if(parallel.some(l=>l.observed[n]))paired++;}else maxGap=Math.max(maxGap,++run);}
   const value={support:support(line,a,b),pairedSupport:paired/(count||1),maxGap};value.valid=value.support>=.94&&value.pairedSupport>=.55&&maxGap<=Math.max(3,Math.round(unit*2));edgeCache.set(key,value);return value;
  };
  const interiorNetwork=(left,top,right,bottom)=>['x','y'].every(axis=>{
   const a=axis==='x'?left:top,b=axis==='x'?right:bottom,low=axis==='x'?top:left,high=axis==='x'?bottom:right;
   return lines[axis].some(line=>{if(line.at<=low+maximumBand||line.at>=high-maximumBand)return false;const start=Math.max(a,line.start),end=Math.min(b,line.end);if(end-start<(b-a)*.25||start>a+maximumBand&&end<b-maximumBand||support(line,start,end)<.55)return false;return [-1,1].some(sign=>edge(line,start,end,sign).pairedSupport>=.5);});
  });
  const titleInside=(left,top,right,bottom)=>documentLabelsInside(rows,left,top,right,bottom);
  const candidates=[];
  // This bounded recovery recognises a closed rectangular wall enclosure.
  // Four observed outer/inner corners and all four source-supported sides
  // are required. Open doors, patios, complex thin networks and a mere box
  // around long strokes remain unresolved until their boundary is proven.
  for(const [key,tl]of corners){if(!key.endsWith(':1:1'))continue;
   for(let rv=tl.vi+1;rv<lines.y.length;rv++){const tr=corners.get(cornerKey(tl.hi,rv,-1,1));if(!tr)continue;const left=tl.point[0],right=tr.point[0],top=tl.point[1];if(right-left<w*.15||!edge(lines.x[tl.hi],left,right,1).valid)continue;
    for(let bh=tl.hi+1;bh<lines.x.length;bh++){const bl=corners.get(cornerKey(bh,tl.vi,1,-1)),br=corners.get(cornerKey(bh,rv,-1,-1));if(!bl||!br)continue;const bottom=bl.point[1],area=(right-left)*(bottom-top);if(bottom-top<h*.15||area<w*h*.03)continue;
     const evidence=[edge(lines.x[tl.hi],left,right,1),edge(lines.y[rv],top,bottom,-1),edge(lines.x[bh],left,right,-1),edge(lines.y[tl.vi],top,bottom,1)];if(evidence.some(e=>!e.valid)||titleInside(left,top,right,bottom)||!interiorNetwork(left,top,right,bottom))continue;
     candidates.push({points:[tl.point,tr.point,br.point,bl.point].map(p=>p.slice()),sourceBounds:[left,top,right-left,bottom-top],area,sourceCorners:[tl,tr,br,bl].map(c=>({point:c.point.slice(),innerPoint:c.innerPoint.slice(),method:'paired-source-wall-corner'})),sourceEdgeEvidence:evidence.map((e,i)=>({edgeIndex:i,support:e.support,pairedSupport:e.pairedSupport,maxGap:e.maxGap,status:'proposed',method:'paired-source-wall-strokes'}))});
    }
   }
  }
  candidates.sort((a,b)=>b.area-a.area);const best=candidates[0];if(!best)return !recoverWideComponents&&hasWideComponents?thinFloorEnvelope(image,{sourceViewId,frame,rows},true):{status:'unresolved',reason:'THIN_WALL_BOUNDARY_UNRESOLVED'};
  if(candidates.some(other=>{if(other===best||other.area<best.area*.35)return false;const [x,y,bw,bh]=best.sourceBounds,[ox,oy,ow,oh]=other.sourceBounds,overlap=Math.max(0,Math.min(x+bw,ox+ow)-Math.max(x,ox))*Math.max(0,Math.min(y+bh,oy+oh)-Math.max(y,oy));return overlap<Math.min(best.area,other.area)*.8;}))return {status:'unresolved',reason:'WALL_NETWORK_AMBIGUOUS'};
  return {status:'proposed',method:'paired-source-wall-enclosure',sourceViewId,sourceFrame:frame,points:best.points,sourceBounds:best.sourceBounds,sourceCorners:best.sourceCorners.map(c=>({...c,tolerancePx:tolerance})),sourceEdgeEvidence:best.sourceEdgeEvidence.map((e,i)=>({...e,anchors:[best.points[i].slice(),best.points[(i+1)%4].slice()],tolerancePx:tolerance})),confirmationRequired:true,metricScale:null,excludes:['coloured-masks','unpaired-dimension-leaders','unconnected-furniture','labelled-notes-and-schedules'],warning:'A closed source wall network is a proposal; building/level ownership and measurements must be checked.'};
 }
 // Rebuild a filled-ink candidate from the wall strokes themselves.
 // Thin dimensions and opening swings may join the original filled region;
 // they are not perimeter walls. Only closed, paired source frames can bridge
 // separate thick wall strokes. The original raster verifies every final edge.
 function framedFloorEnvelope(image,legacy,{sourceViewId=null,frame=null,rows=[]}={}){
  const {width:w,height:h}=image,k=Math.max(2,Math.round(w/525)),minimum=k*4,tolerance=Math.max(1,Math.floor(k/2)),maximumBand=k*6;
  if(!legacy.sourceBounds)return null;
  const ink=monochrome(image),radius=Math.max(1,Math.floor(k/3)),thick=opening(ink,w,h,radius,radius),[bx,by,bw,bh]=legacy.sourceBounds;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x<bx-k*2||x>bx+bw+k*2||y<by-k*2||y>by+bh+k*2)thick[y*w+x]=0;
  const mask=thick.slice(),segments={x:[],y:[]};
  for(const axis of ['x','y']){
   const vertical=axis==='y',parts=components(opening(thick,w,h,vertical?0:minimum/2,vertical?minimum/2:0),w,h);
   for(const part of parts){const cross=part.box[vertical?2:3];
    if(cross>k*2.5){if(cross<maximumBand*2)segments[axis].push(...componentAxisSegments(part,thick,w,vertical,minimum,tolerance));continue;}
    segments[axis].push({at:part.box[vertical?0:1]+(cross-1)/2,start:part.box[vertical?1:0],end:part.box[vertical?1:0]+part.box[vertical?3:2]-1});
   }
   if(segments[axis].length>300)return null;
  }
  const point=(axis,n,d)=>axis==='x'?[n,d]:[d,n],pixel=(source,axis,n,d)=>{const [x,y]=point(axis,n,d).map(Math.round);return x>=0&&y>=0&&x<w&&y<h&&!!source[y*w+x];};
  function support(source,axis,start,end,at){let hits=0,gap=0,maxGap=0;for(let n=Math.ceil(start);n<=end;n++){if(pixel(source,axis,n,at)){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}return {support:hits/(Math.floor(end)-Math.ceil(start)+1),maxGap};}
  function fill(axis,start,end,at,other){for(let n=Math.ceil(start);n<=end;n++)for(let d=Math.floor(Math.min(at,other))-radius;d<=Math.ceil(Math.max(at,other))+radius;d++){const [x,y]=point(axis,n,d);if(x>=0&&y>=0&&x<w&&y<h)mask[y*w+x]=1;}}
  const bands=[];
  for(const axis of ['x','y'])for(const a of segments[axis])for(const b of segments[axis]){
   const depth=b.at-a.at,start=Math.max(a.start,b.start),end=Math.min(a.end,b.end);
   if(depth<k+1||depth>maximumBand||end-start<minimum)continue;
   bands.push({axis,from:start,to:end,at:a.at,depth});fill(axis,start,end,a.at,b.at);
  }
  if(bands.length<4||bands.length>1500)return null;
  // Source partitions in both directions distinguish a wall network from a
  // pair of frames, isolated furniture, or a dimension diagram.
  if(!['x','y'].every(axis=>segments[axis].some(s=>s.at>(axis==='x'?by:bx)+maximumBand&&s.at<(axis==='x'?by+bh:bx+bw)-maximumBand&&s.end-s.start>(axis==='x'?bw:bh)*.15)))return null;
  const links=[];
  for(const axis of ['x','y'])for(const a of segments[axis])for(const b of segments[axis]){
   if(b.start-a.end<k*2.5||b.start-a.end>w*.2||Math.abs(a.at-b.at)>tolerance)continue;
   let found=null;
   for(let at=Math.round((a.at+b.at)/2)-tolerance;at<=Math.round((a.at+b.at)/2)+tolerance&&!found;at++){
    const outer=support(ink,axis,a.end,b.start,at);if(outer.support<.95||outer.maxGap>tolerance)continue;
    for(const side of [-1,1])for(let depth=k+1;depth<=maximumBand;depth++){
     if(found)break;const parallel=support(ink,axis,a.end,b.start,at+side*depth);if(parallel.support<.95||parallel.maxGap>tolerance)continue;
     const neighbour=(before)=>Array.from({length:depth+1},(_,i)=>i+k).some(d=>{const start=before?a.end-d-k*2:b.start+d;return support(thick,axis,start,start+k*2,at+side*depth).support>=.9;});
     if(!neighbour(true)||!neighbour(false))continue;
     const cap=n=>{let hits=0;for(let d=0;d<=depth;d++)if(Array.from({length:radius*2+1},(_,i)=>i-radius).some(i=>pixel(ink,axis,n+i,at+side*d)))hits++;return hits/(depth+1);};
     const near=n=>Array.from({length:k*2+1},(_,i)=>n+i-k).find(p=>cap(p)>=.9),left=near(a.end),right=near(b.start);if(left===undefined||right===undefined)continue;
     found={axis,from:Math.min(left,a.end),to:Math.max(right,b.start),at,side,depth,outer,parallel,jambs:[left,right].map(n=>({anchors:[point(axis,n,at),point(axis,n,at+side*depth)],support:cap(n)})),method:'paired-source-frame-and-adjacent-wall-strokes'};
    }
   }
   if(found){links.push(found);fill(axis,found.from,found.to,found.at,found.at+found.side*found.depth);}
   if(links.length>256)return null;
  }
  if(!links.length)return null;
  const filled=fillHoles(closing(mask,w,h,radius,radius),w,h),parts=components(filled,w,h),largest=parts[0];
  if(!largest||largest.area<bw*bh*.5||parts.some(p=>p!==largest&&p.area>largest.area*.35))return null;
  const chosen=new Uint8Array(mask.length);for(const i of largest.pixels)chosen[i]=1;
  const clean=opening(chosen,w,h,Math.max(2,Math.round(k*.75)),Math.max(2,Math.round(k*.75))),simple=simplify(outline(clean,w,h),Math.max(2,k*1.25));
  // Align to the independently bounded wall bands, then check the source.
  // Aligning a thin frame to the darkest nearby line can select its inside
  // skin and shrink the building by a wall thickness.
  let points=consolidateAxes(alignOutline(simple,mask,w,h,k),k);const junctions=[];
  if(points.length<4||points.length>60)return null;
  for(let pass=0;pass<12;pass++){
   let fixed=false;const sign=Math.sign(points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a[0]*b[1]-b[0]*a[1];},0));
   for(let skip=points.length-3;skip>=2&&!fixed;skip--)for(let i=0;i<points.length&&!fixed;i++){
    const j=(i+skip)%points.length,a=points[i],b=points[j],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length||Math.min(Math.abs(dx),Math.abs(dy))>.01)continue;
    const normal=[-sign*dy/length,sign*dx/length],between=Array.from({length:skip-1},(_,t)=>points[(i+t+1)%points.length]),offsets=between.map(p=>(p[0]-a[0])*normal[0]+(p[1]-a[1])*normal[1]);
    if(offsets.some(d=>d<-.01)||Math.max(...offsets)>maximumBand||Math.max(...offsets)<1)continue;
    const evidence=floorBoundaryEvidence(image,[a,b],ink)[0];if(evidence.status!=='proposed'||evidence.support<.94)continue;
    const keep=points.filter((p,index)=>{const distance=(index-i+points.length)%points.length;return distance===0||distance>=skip;});junctions.push({anchors:[a.slice(),b.slice()],removed:between.map(p=>p.slice()),sourceEdgeEvidence:evidence,method:'source-supported-inner-band-junction'});points=removeStraight(keep);fixed=true;
   }
   if(!fixed)break;
  }
  if(points.length<4||points.length>40||points.some((a,i)=>{const b=points[(i+1)%points.length];return Math.min(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]))>.01;}))return null;
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
   if(j===i+1||i===0&&j===points.length-1)continue;
   const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
   if(Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))+.01&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]))+.01)return null;
  }
  const evidence=floorBoundaryEvidence(image,points,ink);if(evidence.some(e=>e.status!=='proposed'||e.support<.94))return null;
  // A small accepted island is not the whole building that failed above.
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
  if(bounds.some((value,i)=>Math.abs(value-legacy.sourceBounds[i])>maximumBand)||documentLabelsInside(rows,bounds[0],bounds[1],bounds[0]+bounds[2],bounds[1]+bounds[3]))return null;
  return {status:'proposed',method:'paired-source-framed-wall-network',sourceViewId,sourceFrame:frame,points,sourceBounds:bounds,sourceEdgeEvidence:evidence,sourceFrameConnections:links,sourceJunctionRepairs:junctions,confirmationRequired:true,metricScale:null,excludes:['coloured-masks','dimension-leaders','opening-swing-arcs','unproved-wall-gaps'],warning:'Source wall bands and closed opening frames propose this boundary; they do not confirm metric dimensions or openings.'};
 }
 function floorEnvelope(image,options={}){
  const legacy=solidFloorEnvelope(image,options);if(legacy.reason==='SOURCE_SIZE')return legacy;
  const evidence=legacy.status==='proposed'?floorBoundaryEvidence(image,legacy.points):null;
  if(evidence?.every(e=>e.status==='proposed'))return {...legacy,sourceEdgeEvidence:evidence};
  const framed=legacy.status==='proposed'?framedFloorEnvelope(image,legacy,options):null;if(framed)return framed;
  const recovered=thinFloorEnvelope(image,options);if(recovered.status==='proposed'||recovered.reason==='WALL_NETWORK_AMBIGUOUS')return recovered;
  return evidence?{status:'unresolved',reason:'BOUNDARY_SOURCE_SUPPORT',sourceEdgeEvidence:evidence}:legacy;
 }
 function solidFloorEnvelope(image,{sourceViewId=null,frame=null}={}){
  const {width:w,height:h}=image;if(!image.data||w*h>12000000||w<120||h<120)return {status:'unresolved',reason:'SOURCE_SIZE'};
  const ink=monochrome(image),roi=ink.slice(),sheet=w/h>1.25&&w/h<1.9,k=Math.max(2,Math.round(w/525)),radius=Math.max(1,(k-1)/2);
  const bounds=sheet?[Math.floor(w*.06),Math.floor(h*.13),Math.floor(w*.81),Math.floor(h*.9)]:[Math.floor(w*.025),Math.floor(h*.025),Math.floor(w*.975),Math.floor(h*.975)];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x<bounds[0]||x>=bounds[2]||y<bounds[1]||y>=bounds[3])roi[y*w+x]=0;
  const vertical=opening(roi,w,h,radius,Math.max(10,Math.round(h*.012))),score=new Uint32Array(w);let max=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)score[x]+=vertical[y*w+x];for(const value of score)max=Math.max(max,value);
  if(max<(bounds[3]-bounds[1])*.25)return {status:'unresolved',reason:'WALL_SUPPORT'};
  const groups=[];for(let x=bounds[0];x<bounds[2];x++)if(score[x]>max*.45){if(!groups.length||x-groups.at(-1).at(-1)>k*5)groups.push([x]);else groups.at(-1).push(x);}
  if(groups.length<2)return {status:'unresolved',reason:'WALL_SUPPORT'};
  const left=groups[0][0],right=groups.at(-1).at(-1),columns=[...groups[0],...groups.at(-1)];let top=h,bottom=0;for(let y=bounds[1];y<bounds[3];y++)if(columns.some(x=>vertical[y*w+x])){top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right-left<w*.15||right-left>w*.8||bottom-top<h*.15)return {status:'unresolved',reason:'AMBIGUOUS_EXTENT'};
  const pad=k*3,x0=Math.max(0,left-pad),y0=Math.max(0,top-pad),rw=Math.min(w-x0,right-left+pad*2+1),rh=Math.min(h-y0,bottom-top+pad*2+1),local=new Uint8Array(rw*rh);
  for(let y=0;y<rh;y++)local.set(ink.subarray((y+y0)*w+x0,(y+y0)*w+x0+rw),y*rw);
  const filled=fillHoles(closing(local,rw,rh,1,1),rw,rh),largest=components(filled,rw,rh)[0];
  if(!largest||largest.area<(right-left)*(bottom-top)*.35)return {status:'unresolved',reason:'OPEN_OR_AMBIGUOUS_BOUNDARY'};
  const chosen=new Uint8Array(local.length);for(const i of largest.pixels)chosen[i]=1;
  const clean=opening(chosen,rw,rh,Math.max(2,Math.round(k*.75)),Math.max(2,Math.round(k*.75))),loop=outline(clean,rw,rh);let points=simplify(loop,Math.max(2,k*1.25)).map(([x,y])=>[x+x0,y+y0]);
  points=points.map(([x,y])=>[Math.abs(x-left)<k*3?left:Math.abs(x-right)<k*3?right:x,Math.abs(y-top)<k*3?top:Math.abs(y-bottom)<k*3?bottom:y]);
  points=alignOutline(points,ink,w,h,k);
  const ends=group=>{let first=h,last=0;for(let y=top;y<=bottom;y++)if(group.some(x=>vertical[y*w+x])){first=Math.min(first,y);last=Math.max(last,y);}return [first,last];},leftEnds=ends(groups[0]),rightEnds=ends(groups.at(-1));
  for(let i=0;i<points.length;i++){const j=(i+1)%points.length,a=points[i],b=points[j];if(Math.abs(a[1]-b[1])>k*2)continue;for(const p of [a,b]){const limits=Math.abs(p[0]-left)<k*3?leftEnds:Math.abs(p[0]-right)<k*3?rightEnds:null;if(!limits)continue;for(const y of limits)if(Math.abs(p[1]-y)<=k*4){a[1]=y;b[1]=y;break;}}}
  points=consolidateAxes(points,k);

  if(points.length<4||points.length>60)return {status:'unresolved',reason:'BOUNDARY_COMPLEXITY'};
  return {status:'proposed',method:'monochrome-wall-network',sourceViewId,sourceFrame:frame,points,sourceBounds:[left,top,right-left,bottom-top],confirmationRequired:true,metricScale:null,excludes:['coloured-masks','thin-dimension-leaders','outside-sheet-cartouche'],warning:'A closed source boundary is a proposal; building/level ownership and measurements must be checked.'};
 }
 function structuralInk(image){
  const ink=monochrome(image),d=image.data,w=image.width,h=image.height;
  for(let i=0;i<ink.length;i++){if(ink[i])continue;const j=i*4,hi=Math.max(d[j],d[j+1],d[j+2]),lo=Math.min(d[j],d[j+1],d[j+2]);if(d[j+3]<=100||hi>=200||hi-lo>=130||d[j]+d[j+1]+d[j+2]>=370)continue;
   const x=i%w,y=(i-x)/w;let supported=false;for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4],[8,0],[-8,0]]){if(x+dx<0||x+dx>=w||y+dy<0||y+dy>=h)continue;const n=((y+dy)*w+x+dx)*4,a=d[n]-d[j],b=d[n+1]-d[j+1],c=d[n+2]-d[j+2];if(Math.min(a,b,c)>25&&Math.max(a,b,c)-Math.min(a,b,c)<25){supported=true;break;}}if(supported)ink[i]=1;
  }return ink;
 }
 function solidWallEnvelope(image,expectedWidth,{sourceViewId=null,frame=null,occlusions=[]}={}){
  const {width:w,height:h}=image,k=Math.max(2,Math.round(w/800)),ink=structuralInk(image),roi=ink.slice();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x<w*.15||x>w*.79||y<h*.29||y>h*.77)roi[y*w+x]=0;
  for(const [x0,y0,rw,rh]of occlusions)for(let y=Math.max(0,y0);y<Math.min(h,y0+rh);y++)for(let x=Math.max(0,x0);x<Math.min(w,x0+rw);x++)roi[Math.round(y)*w+Math.round(x)]=0;
  const vertical=opening(roi,w,h,0,Math.max(12,Math.round(h*.016))),scores=new Uint32Array(w);for(let i=0;i<vertical.length;i++)scores[i%w]+=vertical[i];
  const groups=[];for(let x=0;x<w;x++)if(scores[x]>h*.14){if(!groups.length||x-groups.at(-1).at(-1)>2)groups.push([x]);else groups.at(-1).push(x);}
  let best=null;for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++){
   const left=groups[a].reduce((a,b)=>scores[b]>scores[a]?b:a),right=groups[b].reduce((a,b)=>scores[b]>scores[a]?b:a),ratio=(right-left)/expectedWidth;if(ratio<.94||ratio>1.06)continue;
   const first=x=>{for(let y=0;y<h;y++)if(vertical[y*w+x])return y;return h;},topDifference=Math.abs(first(left)-first(right));const occludedTop=occlusions.some(([x,y,bw,bh])=>[left,right].some(at=>at>=x&&at<=x+bw&&Math.min(first(left),first(right))>=y&&Math.max(first(left),first(right))<=y+bh+5));if(topDifference>h*.04&&!occludedTop)continue;const score=Math.min(scores[left],scores[right])*(1-Math.abs(ratio-1))-(occludedTop?0:topDifference*2);if(!best||score>best.score)best={left,right,score};
  }
  if(!best)return {status:'unresolved',reason:'ELEVATION_WALL_SUPPORT'};
  const ends=x=>{let top=h,bottom=0;for(let y=0;y<h;y++)if(vertical[y*w+x]){top=Math.min(top,y);bottom=Math.max(bottom,y);}return [top,bottom];},a=ends(best.left),b=ends(best.right);
  return {status:'proposed',sourceViewId,sourceFrame:frame,box:[best.left,Math.min(a[0],b[0]),best.right-best.left,Math.min(a[1],b[1])-Math.min(a[0],b[0])],occlusions,spines:[a,b],method:'paired-monochrome-wall-spines',confirmationRequired:true};
 }
 // The historical detector is retained when its source spines are already
 // established. Thin or pale facades need additional independent evidence.
 function wallEnvelope(image,expectedWidth,options={}){
  const original=solidWallEnvelope(image,expectedWidth,options),rows=options.rows||[],panels=legendBoxes(image,rows.map(row=>/^(?:notes? (?:generales?|general)|general notes?|index|sommaire|table of contents|cartouche|title block)\s*[:.]?$/i.test(String(row.text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim())?{...row,text:'LEGEND'}:row),{minimumWidthRatio:.04});
  const box=original.box,pad=Math.max(2,Math.round(image.width/800)),documentFrame=original.status==='proposed'&&panels.some(([x,y,w,h])=>[box[0],box[0]+box[2]].some(edge=>edge>=x-pad&&edge<=x+w+pad)&&Math.min(box[1]+box[3],y+h)-Math.max(box[1],y)>box[3]*.5);
  if(original.status==='proposed'&&!documentFrame)return original;
  const fallback=contrastWallEnvelope(image,expectedWidth,{...options,occlusions:[...(options.occlusions||[]),...panels]});
  return documentFrame?{...fallback,rejectedEnvelope:{reason:'ELEVATION_DOCUMENT_FRAME',box:original.box,documentPanels:panels}}:fallback;
 }
 function contrastWallEnvelope(image,expectedWidth,{sourceViewId=null,frame=null,occlusions=[],rows=[]}={}){
  const {width:w,height:h,data}=image;
  if(!data||w*h>12000000||!(expectedWidth>0)||expectedWidth>w*.94)return {status:'unresolved',reason:'ELEVATION_WALL_SUPPORT'};
  const step=Math.max(2,Math.round(w/800)),gap=Math.max(2,Math.round(w/300));
  const ink=structuralInk(image),neutral=monochrome(image),mask=ink.slice(),high=new Uint8Array(w*h);
  for(let i=0;i<high.length;i++)high[i]=Math.max(data[i*4],data[i*4+1],data[i*4+2]);
  // Recover a pale stroke below a translucent mark only when it has local
  // contrast. A uniformly coloured area is never promoted to a dark stroke.
  for(let y=1;y<h-1;y++)for(let x=step;x<w-step;x++){
   const i=y*w+x;if(mask[i]||data[i*4+3]<=100||high[i]>=250)continue;
   const lo=Math.min(data[i*4],data[i*4+1],data[i*4+2]);
   if(high[i]-lo>=45)continue;
   const pairs=[[high[i-step]-high[i],high[i+step]-high[i]]];
   if(y>=step&&y<h-step)pairs.push([high[i-w*step]-high[i],high[i+w*step]-high[i]]);
   if(pairs.some(([a,b])=>Math.min(a,b)>6&&Math.max(a,b)>=12))mask[i]=1;
  }
  const excluded=new Uint8Array(w*h);
  for(const [x,y,bw,bh]of occlusions)for(let py=Math.max(0,Math.floor(y-gap));py<Math.min(h,Math.ceil(y+bh+gap));py++)for(let px=Math.max(0,Math.floor(x-gap));px<Math.min(w,Math.ceil(x+bw+gap));px++){const i=py*w+px;excluded[i]=1;mask[i]=0;}
  // Full-height page/cartouche rules are detected from their support, rather
  // than treating a fixed horizontal fraction as the drawing's right edge.
  let rightLimit=Math.floor(w*.97);
  for(let x=Math.floor(w*.65);x<rightLimit;x++){
   let n=0,first=h,last=0;for(let y=0;y<h;y++)if(neutral[y*w+x]){n++;first=Math.min(first,y);last=y;}
   if(n>h*.75&&first<h*.08&&last>h*.92){rightLimit=Math.max(0,x-gap);break;}
  }
  const leftLimit=Math.floor(w*.025),y0=Math.floor(h*.18),y1=Math.min(h-1,Math.floor(h*.88));
  const minimum=Math.max(30,Math.min(h*.09,expectedWidth*.12)),runs=[];
  function bestRun(x){
   let start=-1,last=-1,count=0,best=null;
   function take(){if(start<0)return;const span=last-start+1;if(span>=minimum&&count/span>=.8&&(!best||count>best.count))best={x,top:start,bottom:last,count,span,coverage:count/span};}
   for(let y=y0;y<=y1;y++){
    if(mask[y*w+x]){if(start<0)start=y;last=y;count++;}
    else if(start>=0&&y-last>gap){take();start=last=-1;count=0;}
   }take();return best;
  }
  for(let x=leftLimit;x<=rightLimit;x++){const run=bestRun(x);if(run)runs.push(run);}
  const groups=[];
  for(const run of runs){const last=groups.at(-1);if(last&&run.x-last.at(-1).x<=2)last.push(run);else groups.push([run]);}
  const candidates=groups.map(group=>group.reduce((a,b)=>b.count>a.count?b:a));
  function horizontal(left,right,top,bottom){
   const a=Math.max(0,Math.ceil(left+step)),b=Math.min(w-1,Math.floor(right-step));let best=null;
   for(let y=Math.max(1,Math.floor(top));y<=Math.min(h-2,Math.ceil(bottom));y++){
    let count=0,longest=0,current=0;
    for(let x=a;x<=b;x++){
     const yes=mask[y*w+x]||mask[(y-1)*w+x]||mask[(y+1)*w+x];
     if(yes){count++;current++;longest=Math.max(longest,current);}else current=0;
    }
    const coverage=count/Math.max(1,b-a+1),longestFraction=longest/Math.max(1,b-a+1);
    if(!best||coverage>best.coverage)best={y,coverage,longestFraction};
   }return best;
  }
  function body(left,right,top,bottom){
   const padX=(right-left)*.08,padY=(bottom-top)*.08;let seen=0,nonwhite=0;
   for(let y=Math.ceil(top+padY);y<bottom-padY;y+=3)for(let x=Math.ceil(left+padX);x<right-padX;x+=3){const i=y*w+x;if(excluded[i])continue;seen++;if(Math.min(data[i*4],data[i*4+1],data[i*4+2])<245)nonwhite++;}
   return {samples:seen,nonwhiteFraction:nonwhite/(seen||1)};
  }
  function edgeMaterial(x,insideSign,top,bottom){
   const band=Math.max(8,Math.round(expectedWidth*.025)),offset=step*2;
   function fraction(sign,from=offset,to=offset+band){let seen=0,count=0;for(let y=Math.ceil(top);y<=bottom;y+=2)for(let dx=from;dx<to;dx+=2){const px=x+sign*dx;if(px<0||px>=w)continue;const i=y*w+px;if(excluded[i])continue;seen++;if(Math.min(data[i*4],data[i*4+1],data[i*4+2])<245)count++;}return count/(seen||1);}
   const inside=fraction(insideSign),outside=fraction(-insideSign),nearInside=fraction(insideSign,step*2,step*4);return {inside,outside,nearInside,difference:inside-outside};
  }
  function interiorFrames(left,right,top,bottom){
   const box=[left,top,right-left,bottom-top];
   return elevationOpenings(image,box).filter(({box:[x,y,bw,bh]})=>bw<=box[2]*.65&&bh<=box[3]*.95&&!occlusions.some(([ox,oy,ow,oh])=>x<ox+ow&&x+bw>ox&&y<oy+oh&&y+bh>oy));
  }
  const pairs=[];
  for(let a=0;a<candidates.length;a++)for(let b=a+1;b<candidates.length;b++){
   const left=candidates[a],right=candidates[b],width=right.x-left.x,ratio=width/expectedWidth;
   if(ratio<.94||ratio>1.06)continue;
   const top=Math.min(left.top,right.top),bottom=Math.min(left.bottom,right.bottom),difference=Math.abs(left.top-right.top);
   const occludedTop=occlusions.some(([x,y,bw,bh])=>[left.x,right.x].some(at=>at>=x&&at<=x+bw&&top>=y&&Math.max(left.top,right.top)<=y+bh+gap));
   if(difference>h*.04&&!occludedTop||bottom-top<minimum||documentLabelsInside(rows,left.x,Math.max(left.top,right.top),right.x,bottom))continue;
   const topLine=horizontal(left.x,right.x,top-gap*2,Math.max(left.top,right.top)+gap*2),bottomLine=horizontal(left.x,right.x,bottom-gap*2,bottom+gap*2),inside=body(left.x,right.x,Math.max(left.top,right.top),bottom);
   const leftMaterial=edgeMaterial(left.x,1,Math.max(left.top,right.top),bottom),rightMaterial=edgeMaterial(right.x,-1,Math.max(left.top,right.top),bottom);
   let supported=topLine?.coverage>=.4&&topLine.longestFraction>=.2&&bottomLine?.coverage>=.3&&inside.nonwhiteFraction>=.03&&leftMaterial.inside>=.15&&rightMaterial.inside>=.15&&leftMaterial.difference>=.1&&rightMaterial.difference>=.1&&leftMaterial.nearInside>=.15&&rightMaterial.nearInside>=.15;
   const frames=supported?interiorFrames(left.x,right.x,Math.max(left.top,right.top),bottom):[];
   supported=supported&&frames.length>0;
   const score=Math.min(left.count,right.count)*(1-Math.abs(ratio-1))-(occludedTop?0:difference*2);
   pairs.push({left,right,width,ratio,top,bottom,topLine,bottomLine,inside,leftMaterial,rightMaterial,frames,supported,score});
  }
  const accepted=pairs.filter(p=>p.supported).sort((a,b)=>b.score-a.score),best=accepted[0];
  if(!best)return {status:'unresolved',reason:'ELEVATION_WALL_SUPPORT'};
  if(accepted.slice(1).some(p=>p.score>=best.score*.95&&(Math.abs(p.left.x-best.left.x)>gap*3||Math.abs(p.right.x-best.right.x)>gap*3)))return {status:'unresolved',reason:'ELEVATION_WALL_AMBIGUOUS'};
  return {status:'proposed',sourceViewId,sourceFrame:frame,box:[best.left.x,best.top,best.width,best.bottom-best.top],occlusions,spines:[[best.left.top,best.left.bottom],[best.right.top,best.right.bottom]],method:'paired-contrast-wall-spines',confirmationRequired:true,supportEvidence:{maxGapPixels:gap,left:{coverage:best.left.coverage,observedPixels:best.left.count,material:best.leftMaterial},right:{coverage:best.right.coverage,observedPixels:best.right.count,material:best.rightMaterial},topLine:best.topLine,bottomLine:best.bottomLine,body:best.inside,interiorFrames:best.frames,expectedSpanRatio:best.ratio}};
 }
 function floorOpenings(image,points){
  const ink=monochrome(image),{width:w,height:h}=image,orientation=Math.sign(points.reduce((s,p,i)=>{const b=points[(i+1)%points.length];return s+p[0]*b[1]-b[0]*p[1];},0)),k=Math.max(2,Math.round(w/525)),result=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],inside=[-orientation*u[1],orientation*u[0]],samples=[];
   for(let n=0;n<=length;n++){let sum=0,coloured=0,count=0;for(let d=1;d<=k;d++){const x=Math.round(a[0]+u[0]*n+inside[0]*d),y=Math.round(a[1]+u[1]*n+inside[1]*d);if(x<0||x>=w||y<0||y>=h)continue;const at=y*w+x,j=at*4;sum+=ink[at];coloured+=Number(Math.max(...image.data.subarray(j,j+3))-Math.min(...image.data.subarray(j,j+3))>60);count++;}samples.push({coverage:sum/(count||1),coloured:coloured/(count||1)});}
   const gaps=[];let start=null;for(let n=3;n<samples.length-3;n++){const around=samples.slice(n-2,n+3),gap=around.reduce((s,v)=>s+v.coverage,0)/5<.45;if(gap&&start===null)start=n;if(!gap&&start!==null){if(n-start>k*4&&start>k*2&&n<length-k*2)gaps.push([start,n]);start=null;}}
   const merged=[];for(const gap of gaps){const last=merged.at(-1);if(last&&gap[0]-last[1]<=k*3)last[1]=gap[1];else merged.push(gap.slice());}
   for(const [from,to]of merged){const colour=samples.slice(from,to).reduce((s,v)=>s+v.coloured,0)/(to-from);result.push({colouredOcclusion:colour>.15,edgeIndex:i,from,to,anchors:[from,to].map(n=>[a[0]+u[0]*n,a[1]+u[1]*n]),status:'proposed',kind:'source-gap',confirmationRequired:true});}
  }return result;
 }
 function elevationOpenings(image,box,{top=box[1],bottom=box[1]+box[3]}={}){
  const {width:w,height:h}=image,ink=monochrome(image);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x<box[0]||x>box[0]+box[2]||y<top||y>bottom)ink[y*w+x]=0;const bridged=closing(ink,w,h,1,0),horizontal=opening(bridged,w,h,Math.max(10,Math.round(w/120)),0),lines=components(horizontal,w,h).map(c=>c.box).filter(([x,y,bw,bh])=>x>=box[0]-4&&x+bw<=box[0]+box[2]+4&&y>=top&&y<=bottom&&bh<=8&&bw<box[2]-4&&x>box[0]+1&&x+bw<box[0]+box[2]-1),candidates=[];
  const edge=(x,y0,y1)=>{let best=0;for(let dx=-2;dx<=2;dx++){let count=0;for(let y=y0;y<y1;y++)count+=ink[y*w+Math.max(0,Math.min(w-1,x+dx))];best=Math.max(best,count/(y1-y0));}return best;};
  for(const a of lines)for(const b of lines){const t=Math.round(a[1]+a[3]/2),bt=Math.round(b[1]+b[3]/2),height=bt-t,width=(a[2]+b[2])/2;if(height<Math.max(25,(bottom-top)*.24)||height>(bottom-top)*.95||width<20||Math.abs(a[0]-b[0])>6||Math.abs(a[0]+a[2]-b[0]-b[2])>6||width/height<.18||width/height>6)continue;
   const x=Math.round((a[0]+b[0])/2),right=Math.round((a[0]+a[2]+b[0]+b[2])/2);if(Math.min(edge(x,t,bt),edge(right-1,t,bt))<.68)continue;
   let white=0,count=0;for(let y=t+3;y<bt-3;y++)for(let xx=x+3;xx<right-3;xx++){const j=(y*w+xx)*4;white+=Number(Math.min(image.data[j],image.data[j+1],image.data[j+2])>225);count++;}if(white/(count||1)<.62)continue;
   candidates.push({box:[x,t,right-x,height],status:'proposed',method:'paired-frame-strokes',confirmationRequired:true});
  }
  candidates.sort((a,b)=>b.box[2]*b.box[3]-a.box[2]*a.box[3]);const keep=[];for(const c of candidates){const [x,y,bw,bh]=c.box;if(!keep.some(q=>x>=q.box[0]-5&&y>=q.box[1]-5&&x+bw<=q.box[0]+q.box[2]+5&&y+bh<=q.box[1]+q.box[3]+5))keep.push(c);}return keep;
 }
 function glazingFrames(image,box,{top=box[1],bottom=box[1]+box[3]}={}){
  const {width:w,height:h}=image,[bx,,bw]=box,left=Math.max(0,Math.floor(bx)),right=Math.min(w-1,Math.ceil(bx+bw)),t=Math.max(0,Math.floor(top)),b=Math.min(h-1,Math.ceil(bottom)),white=new Uint8Array(w*h),minimumHeight=Math.max(15,(bottom-top)*.08);
  for(let y=t;y<=b;y++)for(let x=left;x<=right;x++){const j=(y*w+x)*4;white[y*w+x]=Number(Math.min(image.data[j],image.data[j+1],image.data[j+2])>230&&Math.max(image.data[j],image.data[j+1],image.data[j+2])-Math.min(image.data[j],image.data[j+1],image.data[j+2])<35);}
  const panes=components(closing(white,w,h,1,1),w,h).filter(c=>c.box[0]>left+2&&c.box[0]+c.box[2]<right-2&&c.box[1]>t+2&&c.box[1]+c.box[3]<b-2&&c.box[2]>=15&&c.box[3]>=minimumHeight&&c.area/(c.box[2]*c.box[3])>.65).map(c=>({box:c.box,area:c.area}));
  panes.sort((a,b)=>a.box[0]-b.box[0]);const groups=[];
  for(const pane of panes){const [x,y,pw,ph]=pane.box,group=groups.find(g=>Math.abs(g.box[1]-y)<8&&Math.abs(g.box[1]+g.box[3]-y-ph)<8&&x-g.box[0]-g.box[2]<Math.max(10,(bottom-top)*.1));if(group){const r=Math.max(x+pw,group.box[0]+group.box[2]),bot=Math.max(y+ph,group.box[1]+group.box[3]);group.box=[Math.min(x,group.box[0]),Math.min(y,group.box[1]),r-Math.min(x,group.box[0]),bot-Math.min(y,group.box[1])];group.area+=pane.area;}else groups.push(pane);}
  const ink=structuralInk(image),pad=Math.max(2,Math.round(w/525));
  const hasFrame=([x,y,pw,ph])=>{let supported=0,total=0;for(let yy=y;yy<y+ph;yy++){for(const xx of [x,x+pw]){let hit=false;for(let dx=-pad-2;dx<=pad+2;dx++)if(xx+dx>=0&&xx+dx<w)hit||=!!ink[Math.round(yy)*w+Math.round(xx+dx)];supported+=Number(hit);total++;}}return supported/(total||1)>.7;};
  return groups.filter(g=>hasFrame(g.box)).map(g=>({box:[g.box[0]-pad,g.box[1]-pad,g.box[2]+pad*2,g.box[3]+pad*2],status:'proposed',method:'clear-panes-and-dark-frame',confirmationRequired:true}));
 }
 function legendBoxes(image,rows,{minimumWidthRatio=.25}={}){
  const titles=rows.filter(r=>r.box?.length===4&&r.box.every(Number.isFinite)&&/^(?:legende|legend)\s*[:.]?$/i.test(String(r.text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()));if(!titles.length)return [];
  // Thin markup crossing a black frame can interrupt its horizontal pixels.
  // Bridge only those small gaps; heading and both original vertical sides
  // still have to prove a legend before any source region is masked.
  const {width:w,height:h}=image,ink=monochrome(image),horizontal=opening(closing(ink,w,h,3,0),w,h,Math.round(w*Math.min(.1,minimumWidthRatio*.4)),0),lines=components(horizontal,w,h).map(c=>c.box).filter(b=>b[2]>w*minimumWidthRatio&&b[3]<12),boxes=[];
  const pairedSupport=(left,right,top,bottom)=>{const from=Math.max(0,Math.floor(top)),to=Math.min(h,Math.ceil(bottom));let supported=0;for(let y=from;y<to;y++){let a=false,b=false;for(let dx=-4;dx<=4;dx++){a||=left+dx>=0&&left+dx<w&&!!ink[y*w+left+dx];b||=right+dx>=0&&right+dx<w&&!!ink[y*w+right+dx];}supported+=Number(a&&b);}return supported/(to-from||1);};
  for(const title of titles){const [l,t,r,b]=title.box,candidates=[];if(l>=r||t>=b)continue;for(const upper of lines){const left=upper[0],right=upper[0]+upper[2],top=upper[1];if(top>=t||left>=l||right<=r)continue;
    for(const lower of lines){const bottom=lower[1]+lower[3];if(bottom<=b||Math.abs(left-lower[0])>8||lower[2]<(right-left)*.6||bottom-top>h*.7)continue;
     if(pairedSupport(left,right,top,bottom)>.8)candidates.push([left,top,right-left,bottom-top]);}
    // A bottom-cropped annotation has no lower border. Its heading, upper
    // border and both sides continuing to the actual image edge are required;
    // touching a crop edge alone must never erase a building or window.
    const visibleHeight=h-top,edgeRows=Math.max(5,Math.round(h*.01));
    if(b<h&&visibleHeight<=h*.7&&visibleHeight>=Math.max(30,(b-t)*2)&&t-top<=Math.max(24,(b-t)*3)&&pairedSupport(left,right,top,h)>.8&&pairedSupport(left,right,h-edgeRows,h)>.8)candidates.push([left,top,right-left,visibleHeight]);
   }
   candidates.sort((a,b)=>b[2]*b[3]-a[2]*a[3]);if(candidates[0]&&!boxes.some(b=>Math.abs(b[0]-candidates[0][0])<10&&Math.abs(b[1]-candidates[0][1])<10))boxes.push(candidates[0]);
  }return boxes;
 }
 // Locate the clear inside of an entrance silhouette before fitting source
 // ink. Global Hough votes over a small canopy can prefer facade/shingle
 // hatches. The clear region selects a search strip only: its coloured edge
 // never supplies a roof dimension without neighbouring source strokes and
 // independently observed ridge/eave junctions.
 function entryRoofProfile(image,envelope){
  const unresolved=base=>({status:'unresolved',reason:'ROOF_SLOPE_OCCLUDED',...(base?{base}:{})});
  if(!image?.data||envelope?.status!=='proposed'||!Array.isArray(envelope.box)||!envelope.box.every(Number.isFinite))return unresolved();
  const {width:w,height:h}=image,[bx,by,bw]=envelope.box,ink=structuralInk(image),masks=envelope.occlusions||[],left=Math.max(0,Math.round(bx-bw*.22)),right=Math.min(w-1,Math.round(bx+bw*1.22));
  if(bw<30||right<=left)return unresolved();
  // A pale translucent stroke may satisfy the broad monochrome mask. Its
  // coloured halo is not the thin, darker drawing stroke underneath it.
  for(let i=0;i<ink.length;i++)if(ink[i]){const j=i*4,hi=Math.max(image.data[j],image.data[j+1],image.data[j+2]),lo=Math.min(image.data[j],image.data[j+1],image.data[j+2]);if(hi>190&&hi-lo>18)ink[i]=0;}
  const masked=(x,y)=>masks.some(([l,t,rw,rh])=>x>=l&&x<=l+rw&&y>=t&&y<=t+rh);
  for(const [l,t,rw,rh]of masks)for(let y=Math.max(0,Math.floor(t)-2);y<Math.min(h,t+rh+3);y++)for(let x=Math.max(0,Math.floor(l)-2);x<Math.min(w,l+rw+3);x++)ink[y*w+x]=0;
  let base=null;
  for(let y=Math.max(0,Math.round(by-22));y<=Math.min(h-1,Math.round(by+5));y++){
   let start=null,last=left-9;const finish=()=>{const span=last-start;if(start!==null&&start>left&&last<right&&span>=bw*.91&&(!base||span>base.end-base.start))base={start,end:last,y};};
   for(let x=left;x<=right;x++){if(!ink[y*w+x])continue;if(x-last>8){finish();start=x;}last=x;}finish();
  }
  if(!base)return unresolved();
  const top=Math.max(0,Math.round(base.y-bw*.5)),cw=right-left+1,ch=base.y-top;
  if(ch<20)return unresolved(base);
  const clear=new Uint8Array(cw*ch);
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=((top+y)*w+left+x)*4;clear[y*cw+x]=Number(!masked(left+x,top+y)&&Math.min(image.data[i],image.data[i+1],image.data[i+2])>=235);}
  const regions=components(clear,cw,ch).filter(c=>c.box[0]>0&&c.box[1]>0&&c.box[0]+c.box[2]<cw&&c.box[2]>bw*.35&&c.box[3]>18&&base.y-(top+c.box[1]+c.box[3])<bw*.16&&c.area>bw*4),candidates=[];
  const fit=points=>{const n=points.length,sx=points.reduce((s,p)=>s+p[0],0),sy=points.reduce((s,p)=>s+p[1],0),sxx=points.reduce((s,p)=>s+p[0]*p[0],0),sxy=points.reduce((s,p)=>s+p[0]*p[1],0),m=(n*sxy-sx*sy)/(n*sxx-sx*sx);return {m,c:(sy-m*sx)/n};};
  for(const region of regions){
   const tops=new Map();for(const i of region.pixels){const x=i%cw+left,y=Math.floor(i/cw)+top;if(!tops.has(x)||y<tops.get(x))tops.set(x,y);}
   const minY=Math.min(...tops.values()),flat=[...tops].filter(([,y])=>y<=minY+2).map(([x])=>x).sort((a,b)=>a-b),groups=[];
   for(const x of flat){if(!groups.length||x-groups.at(-1).at(-1)>3)groups.push([x]);else groups.at(-1).push(x);}
   const ridge=groups.sort((a,b)=>b.length-a.length)[0];if(!ridge)continue;
   const [rl,rr]=[ridge[0],ridge.at(-1)],points=[...tops].sort((a,b)=>a[0]-b[0]);
   const slope=sign=>{
    const observed=points.filter(([x])=>sign<0?x<rl-3:x>rr+3);if(observed.length<bw*.08)return null;
    const approximate=fit(observed);if(sign*approximate.m<.18||sign*approximate.m>1.1)return null;
    const samples=[];for(const[x,y]of observed){const ys=[];for(let yy=Math.max(0,y-5);yy<=y;yy++)if(ink[yy*w+x])ys.push(yy);if(ys.length)samples.push([x,ys[Math.floor(ys.length/2)]]);}
    if(samples.length<observed.length*.65)return null;
    const line=fit(samples),refined=samples.filter(([x,y])=>Math.abs(y-line.m*x-line.c)<2);if(refined.length<samples.length*.8)return null;
    const result=fit(refined);if(sign*result.m<.18||sign*result.m>1.1)return null;
    return {...result,start:observed[0][0],end:observed.at(-1)[0],support:samples.length/observed.length,fit:{method:'source-ink-beside-connected-roof-interior',sampleCount:refined.length},visibleEndpoint:refined[sign<0?refined.length-1:0]};
   };
   const a=slope(-1),b=slope(1);if(!a||!b)continue;
   let y,lx,rx;
   if(ridge.length<bw*.075){
    // A gable needs a supported common apex, not an invented short ridge.
    lx=rx=(b.c-a.c)/(a.m-b.m);y=a.m*lx+a.c;
    if(Math.abs(lx-(rl+rr)/2)>4||Math.abs(y-minY)>6)continue;
    let junction=false;for(let yy=Math.max(0,Math.round(y)-1);yy<=Math.min(h-1,Math.round(y)+1);yy++)for(let xx=Math.max(0,Math.round(lx)-1);xx<=Math.min(w-1,Math.round(lx)+1);xx++)junction||=!!ink[yy*w+xx];if(!junction)continue;
   }else {
    let ridgeRow=null;for(let yy=Math.max(0,Math.floor(minY-5));yy<=Math.min(h-1,minY+1);yy++){let count=0;for(let x=rl;x<=rr;x++)count+=ink[yy*w+x];if(!ridgeRow||count>ridgeRow.count)ridgeRow={y:yy,count};}
    if(!ridgeRow||ridgeRow.count/(rr-rl+1)<.8)continue;
    y=ridgeRow.y;lx=(y-a.c)/a.m;rx=(y-b.c)/b.m;if(lx>=rx||Math.abs(lx-rl)>8||Math.abs(rx-rr)>8)continue;
   }
   const eave=(line,x)=>{
    const choices=[],maxGapAllowed=Math.max(3,Math.min(5,Math.ceil(w/400)));
    for(let xx=Math.max(1,x-2);xx<=Math.min(w-2,x+2);xx++){
     const y=line.m*xx+line.c;if(y>base.y+3||base.y-y>Math.max(20,bw*.12))continue;
     let count=0,total=0,maxGap=0,gap=0;
     for(let yy=Math.max(0,Math.round(y));yy<=base.y;yy++){let hit=false;for(let dx=-1;dx<=1;dx++)hit||=!!ink[yy*w+xx+dx];total++;if(hit){count++;gap=0;}else maxGap=Math.max(maxGap,++gap);}
     if(count/(total||1)>=.5&&maxGap<=maxGapAllowed)choices.push({x:xx,y,support:count/total});
    }return choices.sort((a,b)=>b.support-a.support||Math.abs(a.x-x)-Math.abs(b.x-x))[0];
   };
   const le=eave(a,base.start),re=eave(b,base.end);if(!le||!re||Math.abs(le.y-re.y)>Math.max(3,bw*.025)||Math.min(le.y,re.y)-y<20)continue;
   if(masks.some(([x0,y0,rw,rh])=>Math.min(re.x,x0+rw)>Math.max(le.x,x0)&&Math.min(base.y,y0+rh)>Math.max(y,y0)))continue;
   Object.assign(a,{eaveX:le.x,eaveY:le.y,highX:lx,highY:y,ridgeEvidence:{y,start:rl,end:rr,intersection:lx},eaveJunction:le});Object.assign(b,{eaveX:re.x,eaveY:re.y,highX:rx,highY:y,ridgeEvidence:{y,start:rl,end:rr,intersection:rx},eaveJunction:re});
   candidates.push({status:'proposed',method:'source-silhouette-ink-and-observed-eave-junctions',points:[[le.x,base.y],[lx,y],[rx,y],[re.x,base.y]],base,slopes:[a,b],sourceViewId:envelope.sourceViewId,sourceFrame:envelope.sourceFrame,confirmationRequired:true,area:region.area});
  }
  const chosen=candidates.sort((a,b)=>b.area-a.area)[0];if(!chosen)return unresolved(base);delete chosen.area;return chosen;
 }
 // A supported slope can run into a fascia mask before its raster group ends.
 // Keep the actual slope/upper-edge junction when the horizontal source stroke
 // and the termination of the diagonal both demonstrate it.
 function roofEaveJunctions(ink,w,h,envelope,slopes){
  if(!slopes?.[0]||!slopes?.[1])return [];
  const [bx,by,bw]=envelope.box,left=Math.max(0,Math.floor(slopes[0].eaveX)),right=Math.min(w-1,Math.ceil(slopes[1].eaveX));if(right-left<bw*.85||right-left>bw*1.6)return [];
  const hit=(x,y,pad=1)=>{x=Math.round(x);y=Math.round(y);for(let dy=-pad;dy<=pad;dy++)for(let dx=-pad;dx<=pad;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h&&ink[(y+dy)*w+x+dx])return true;return false;},bands=[];
  for(let y=Math.max(0,Math.round(by-22));y<=Math.min(h-1,Math.round(by+5));y++){let count=0,run=0,longest=0;for(let x=left;x<=right;x++){if(ink[y*w+x]){count++;longest=Math.max(longest,++run);}else run=0;}if(count/(right-left+1)<.72||longest<bw*.25)continue;const last=bands.at(-1);if(last&&y===last.bottom+1){last.bottom=y;last.support=Math.max(last.support,count/(right-left+1));}else bands.push({top:y,bottom:y,support:count/(right-left+1)});}
  const result=[];
  for(const band of bands){const y=(band.top+band.bottom)/2,junctions=[];for(let i=0;i<2;i++){const slope=slopes[i],x=(y-slope.c)/slope.m,inward=i===0?1:-1;if(!Number.isFinite(x)||Math.abs(x-slope.eaveX)>Math.max(8,bw*.08)||!hit(x,y))continue;
    const extent=Math.max(10,Math.min(24,bw*.04)),offsets=Array.from({length:Math.floor(extent)-5},(_,j)=>j+6),support=sign=>offsets.reduce((n,d)=>n+Number(hit(x+inward*d*sign,slope.m*(x+inward*d*sign)+slope.c,1)),0)/offsets.length,inside=support(1),outside=support(-1);
    // A dimension line crossing an uninterrupted slope cannot be its eave.
    if(inside<.8||outside>.45)continue;junctions.push({index:i,x,y,method:'supported-roof-slope-terminates-at-horizontal-source-edge',horizontal:{anchors:[[left,y],[right,y]],strokeBand:[band.top,band.bottom],support:band.support},diagonal:{insideSupport:inside,outsideSupport:outside,probeRange:[6,extent]},sourceStrokeEndpoint:[slope.eaveX,slope.eaveY],status:'proposed',confirmationRequired:true});
   }if(junctions.length){result.push(...junctions);break;}
  }return result;
 }
 // A roof covering and a ceiling are different source lines. Keep their
 // measured separation only when both neutral fascia returns visibly connect
 // the supported roof edge to short underside strokes at the ceiling datum.
 // The coloured middle is not used as a line and no wall is extended here.
 function roofCeilingBand(image,profile,ceiling,{wallHeightPixels,occlusions=[],sourceView}={}){
  const no=reason=>({status:'unresolved',reason}),s=profile?.slopes;
  if(!image?.data||profile?.status!=='proposed'||s?.length!==2||s.some(q=>!q||!Number.isFinite(q.eaveX)||!Number.isFinite(q.eaveY)||!(q.support>=.8))||!Number.isFinite(ceiling?.y)||ceiling.datumType!=='ceiling'||!(ceiling.sourceGuide?.support>=.7)||ceiling.sourceGuide?.anchors?.length!==2||!ceiling.sourceGuide.anchors.every(p=>p?.length===2&&p.every(Number.isFinite)&&Math.abs(p[1]-ceiling.y)<=1))return no('ROOF_CEILING_BAND_SOURCE_REQUIRED');
  const size=[sourceView?.payload?.sourceWidth||sourceView?.zone?.[2]||sourceView?.frame?.rasterSize?.[0],sourceView?.payload?.sourceHeight||sourceView?.zone?.[3]||sourceView?.frame?.rasterSize?.[1]];
  if(!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<=0||image.height<=0||image.data.length!==image.width*image.height*4||!size.every((n,i)=>Number.isInteger(n)&&n>0&&n===[image.width,image.height][i])||!sourceView?.frame||ceiling.sourceViewId!==sourceView.id||JSON.stringify(ceiling.sourceFrame)!==JSON.stringify(sourceView.frame)||profile.sourceViewId&&profile.sourceViewId!==sourceView.id||profile.sourceFrame&&JSON.stringify(profile.sourceFrame)!==JSON.stringify(sourceView.frame))return no('ROOF_CEILING_BAND_SOURCE_FRAME_REQUIRED');
  const [a,b]=s.slice().sort((p,q)=>p.eaveX-q.eaveX),span=b.eaveX-a.eaveX,upperY=(a.eaveY+b.eaveY)/2,depth=ceiling.y-upperY,{width:w,height:h,data:d}=image;
  if(!(span>60&&Math.abs(a.eaveY-b.eaveY)<=2&&depth>2&&depth<=Math.min(span*.025,wallHeightPixels*.2)))return no('ROOF_CEILING_BAND_GEOMETRY_REQUIRED');
  const neutral=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=w||y>=h||occlusions.some(([l,t,rw,rh])=>x>=l&&x<=l+rw&&y>=t&&y<=t+rh))return false;const n=(y*w+x)*4,r=d[n],g=d[n+1],b=d[n+2];return d[n+3]>100&&Math.max(r,g,b)-Math.min(r,g,b)<26&&r+g+b<630;};
  const run=(from,to)=>{const steps=Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])),samples=[];let hits=0,gap=0,maxGap=0;for(let i=0;i<=steps;i++){const p=from.map((n,j)=>n+(to[j]-n)*i/steps);let hit=false;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)hit||=neutral(p[0]+dx,p[1]+dy);if(hit){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);if(i===0||i===steps||i%Math.max(1,Math.round(steps/8))===0)samples.push({point:p,observed:hit});}return {anchors:[from,to],support:hits/(steps+1),maxGap,samples};};
  const top=run([a.eaveX,upperY],[b.eaveX,upperY]);if(top.support<.85||top.maxGap>8)return no('ROOF_UPPER_EDGE_REQUIRED');
  const ends=[];
  for(const [slope,sign]of [[a,1],[b,-1]]){const candidates=[];for(let x=Math.ceil(slope.eaveX-2);x<=Math.floor(slope.eaveX+2);x++)for(let y=Math.ceil(ceiling.y-1);y<=Math.floor(ceiling.y+1);y++){
    const side=run([x,upperY],[x,y]),length=Math.max(12,Math.round(span*.025)),bottom=run([x,y],[x+sign*length,y]);
    if(side.support>=.85&&side.maxGap<=1&&bottom.support>=.9&&bottom.maxGap<=2)candidates.push({x,y,side,bottom});
   }
   candidates.sort((p,q)=>Math.abs(p.x-slope.eaveX)+Math.abs(p.y-ceiling.y)-Math.abs(q.x-slope.eaveX)-Math.abs(q.y-ceiling.y));if(!candidates.length)return no('ROOF_FASCIA_RETURN_REQUIRED');ends.push(candidates[0]);
  }
  if(Math.abs(ends[0].y-ends[1].y)>1)return no('ROOF_FASCIA_UNDERSIDE_DISAGREES');
  return {status:'observed',method:'roof-edge-and-two-neutral-fascia-returns-at-ceiling',upper:top,ends,ceiling:JSON.parse(JSON.stringify(ceiling)),offsetPixels:depth,unobservedMiddle:'The continuous underside is not asserted through coloured annotations.',confirmationRequired:true};
 }
 function roofProfile(image,envelope,rows=[],{entry=false}={}){
  if(envelope.status!=='proposed')return {status:'unresolved',reason:'WALL_REGISTRATION_REQUIRED'};
  if(entry)return entryRoofProfile(image,envelope);
  const {width:w,height:h}=image,[bx,by,bw]=envelope.box,ink=structuralInk(image),occlusions=envelope.occlusions||[];
  // Pale cyan/green quantity masks are not structural ink. Genuine dark
  // source strokes remain eligible; neutral faded strokes are recovered below.
  for(let i=0;i<ink.length;i++){const j=i*4,r=image.data[j],g=image.data[j+1],b=image.data[j+2];if(Math.max(r,g,b)-Math.min(r,g,b)>=18&&Math.max(r,g,b)>100)ink[i]=0;}
  // Recover only grey drawing strokes still present beneath translucent
  // legends. OCR legend text and its frame never supply roof geometry.
  for(const [x0,y0,rw,rh]of occlusions){for(let y=Math.max(0,y0-3);y<Math.min(h,y0+rh+4);y++)for(let x=Math.max(0,x0-3);x<Math.min(w,x0+rw+4);x++)ink[Math.round(y)*w+Math.round(x)]=0;for(let y=Math.max(0,y0+5);y<Math.min(h,y0+rh-5);y++)for(let x=Math.max(0,x0+5);x<Math.min(w,x0+rw-5);x++){const i=Math.round(y)*w+Math.round(x),j=i*4,r=image.data[j],g=image.data[j+1],b=image.data[j+2];ink[i]=Number(Math.max(r,g,b)-Math.min(r,g,b)<18&&Math.max(r,g,b)<238);}for(const row of rows){const [l,t,r,b]=row.box||[];if(l<x0||r>x0+rw||t<y0||b>y0+rh)continue;for(let y=Math.max(0,Math.floor(t)-2);y<Math.min(h,Math.ceil(b)+2);y++)for(let x=Math.max(0,Math.floor(l)-2);x<Math.min(w,Math.ceil(r)+2);x++)ink[y*w+x]=0;}}
  const left=Math.max(0,Math.round(bx-bw*.22)),right=Math.min(w-1,Math.round(bx+bw*1.22));let base=null;
  for(let y=Math.max(0,Math.round(by-22));y<=Math.min(h-1,Math.round(by+5));y++){let start=left,last=left-9;for(let x=left;x<=right;x++){if(!ink[y*w+x])continue;if(x-last>8)start=x;last=x;const span=x-start;if(span>=bw*.91&&(!base||span>base.end-base.start))base={start,end:x,y};}}
  if(!base)base={start:left,end:right,y:Math.round(by-2),searchWindowOnly:true};
  const top=Math.max(0,Math.round(base.y-bw*.5)),pixels=[];for(let y=top;y<base.y-5;y++)for(let x=left;x<=right;x++)if(ink[y*w+x])pixels.push([x,y]);
  function slope(sign){let best=null;const countLength=h+w*2;
   for(let m=.18;m<=1.1;m+=.01){const gradient=m*sign,bins=new Uint16Array(countLength);for(const [x,y]of pixels){const n=Math.round(y-gradient*(x-base.start))+w;if(n>0&&n<countLength-1){bins[n-1]++;bins[n]++;bins[n+1]++;}}
    let peak=0,index=0;for(let i=0;i<bins.length;i++){const nearY=gradient*(sign<0?bx:bx+bw)+i-w-gradient*base.start;if(nearY>=by-bw*.3&&nearY<=by+8&&bins[i]>peak){peak=bins[i];index=i;}}if(!best||peak>best.count)best={m:gradient,c:index-w-gradient*base.start,count:peak};
   }
   if(!best)return null;const hits=[];for(let x=left;x<=right;x++){const y=Math.round(best.m*x+best.c);if(y<top||y>=base.y)continue;let hit=false;for(let dy=-2;dy<=2;dy++)if(y+dy>=0&&y+dy<h)hit||=!!ink[(y+dy)*w+x];if(hit)hits.push(x);}
   const groups=[];for(const x of hits){if(!groups.length||x-groups.at(-1).at(-1)>6)groups.push([x]);else groups.at(-1).push(x);}const supported=groups.filter(g=>g.length>Math.max(12,bw*.025));if(!supported.length)return null;
   const anchored=supported.filter(g=>{const x=sign<0?g[0]:g.at(-1),y=best.m*x+best.c,target=sign<0?bx:bx+bw;return Math.abs(x-target)<bw*.25&&Math.abs(y-by)<32;}).sort((a,b)=>b.length-a.length)[0];if(!anchored)return null;const start=anchored[0],end=anchored.at(-1),eaveX=sign<0?start:end,eaveY=best.m*eaveX+best.c,highX=sign<0?end:start,highY=best.m*highX+best.c;
   if(anchored.length<bw*.15)return null;
   // The end of visible ink is not necessarily a ridge: legends may interrupt
   // the same slope. Fit its supported centreline, then retain a ridge only
   // when an actual horizontal stroke meets it outside an occlusion.
   const samples=[];for(let x=start+8;x<=end-8;x++){const expected=best.m*x+best.c,ys=[];for(let y=Math.round(expected-4);y<=Math.round(expected+4);y++)if(y>=0&&y<h&&ink[y*w+x])ys.push(y);if(ys.length)samples.push([x,ys[Math.floor(ys.length/2)]]);}
   let m=best.m,c=best.c;if(samples.length>20){const sx=samples.reduce((s,p)=>s+p[0],0),sy=samples.reduce((s,p)=>s+p[1],0),sxx=samples.reduce((s,p)=>s+p[0]*p[0],0),sxy=samples.reduce((s,p)=>s+p[0]*p[1],0),n=samples.length,fit=(n*sxy-sx*sy)/(n*sxx-sx*sx);if(Math.abs(fit-best.m)<.035){m=fit;c=(sy-m*sx)/n;}}
   const high=m*highX+c,ridges=[];
   for(let y=Math.max(top,Math.round(high-12));y<=Math.min(base.y-20,Math.round(high+12));y++){let a=null,last=-100;const finish=()=>{if(a===null||last-a<bw*.075)return;const intersection=(y-c)/m;if(intersection<a-5||intersection>last+5||occlusions.some(([x0,y0,rw,rh])=>intersection>=x0-5&&intersection<=x0+rw+5&&y>=y0-5&&y<=y0+rh+5))return;ridges.push({y,start:a,end:last,intersection,score:last-a-Math.abs(y-high)*2});};for(let x=left;x<=right;x++)if(ink[y*w+x]){if(x-last>2){finish();a=x;}last=x;}finish();}
   const ridge=ridges.sort((a,b)=>b.score-a.score)[0]||null;
   return {...best,m,c,start,end,eaveX,eaveY:m*eaveX+c,highX:ridge?.intersection??highX,highY:ridge?.y??high,ridgeEvidence:ridge,support:anchored.length/(end-start+1),fit:{method:'least-squares-supported-stroke-centreline',sampleCount:samples.length},visibleEndpoint:[highX,high]};
  }
  const a=slope(-1),b=slope(1);if(!a||!b)return {status:'unresolved',reason:'ROOF_SLOPE_OCCLUDED',base,slopes:[a,b]};
  for(const junction of roofEaveJunctions(ink,w,h,envelope,[a,b]))Object.assign([a,b][junction.index],{eaveX:junction.x,eaveY:junction.y,eaveJunction:junction});
  if(Math.abs(a.highY-b.highY)>bw*.035||a.highX>b.highX+10)return {status:'unresolved',reason:'ROOF_PROFILES_DISAGREE',base,slopes:[a,b]};
  const ridgeY=Math.round(Math.max(a.highY,b.highY));if(base.y-ridgeY<20)return {status:'unresolved',reason:'ROOF_RISE_UNKNOWN'};
  if(b.highX-a.highX>8){let support=0,count=0;for(let x=Math.ceil(a.highX+2);x<=Math.floor(b.highX-2);x++){let hit=false;for(let dy=-3;dy<=3;dy++)if(ridgeY+dy>=0&&ridgeY+dy<h)hit||=!!ink[(ridgeY+dy)*w+x];support+=Number(hit);count++;}if(support/(count||1)<.7)return {status:'unresolved',reason:'ROOF_RIDGE_OCCLUDED',base,slopes:[a,b],ridgeSupport:support/(count||1)};}
  return {status:'proposed',method:'source-eaves-and-two-supported-slopes',points:[[a.eaveX,a.eaveJunction?a.eaveY:base.y],[a.highX,ridgeY],[b.highX,ridgeY],[b.eaveX,b.eaveJunction?b.eaveY:base.y]],base,slopes:[a,b],sourceViewId:envelope.sourceViewId,sourceFrame:envelope.sourceFrame,confirmationRequired:true};
 }
 function frameAtSeed(image,seed,{top,bottom}){
  const {width:w,height:h}=image,ink=structuralInk(image),expected=seed.right-seed.left,pad=Math.max(10,expected*.2),edges=[];
  const scan=(center,side)=>{for(let x=Math.max(0,Math.floor(center-pad));x<=Math.min(w-1,Math.ceil(center+pad));x++){let start=null,last=-100;for(let y=Math.max(0,Math.floor(top));y<=Math.min(h-1,Math.ceil(bottom));y++){if(!ink[y*w+x])continue;if(y-last>3){if(start!==null&&last-start>=22&&last-start<(bottom-top)*.94)edges.push({x,top:start,bottom:last,side});start=y;}last=y;}if(start!==null&&last-start>=22&&last-start<(bottom-top)*.94)edges.push({x,top:start,bottom:last,side});}};
  scan(seed.left,'left');scan(seed.right,'right');const candidates=[];
  for(const a of edges.filter(e=>e.side==='left'))for(const b of edges.filter(e=>e.side==='right')){const width=b.x-a.x,t=Math.max(a.top,b.top),bt=Math.min(a.bottom,b.bottom),height=bt-t;if(width<expected*.7||width>expected*1.55||Math.abs(a.top-b.top)>8||Math.abs(a.bottom-b.bottom)>8||height<22)continue;
   const horizontal=y=>{let n=0;for(let x=a.x;x<=b.x;x++){let hit=false;for(let dy=-2;dy<=2;dy++)if(y+dy>=0&&y+dy<h)hit||=!!ink[(y+dy)*w+x];n+=Number(hit);}return n/(width+1);};if(Math.min(horizontal(t),horizontal(bt))<.68)continue;
   let white=0,n=0;for(let y=t+3;y<bt-3;y++)for(let x=a.x+3;x<b.x-3;x++){const j=(y*w+x)*4;white+=Number(Math.min(image.data[j],image.data[j+1],image.data[j+2])>225);n++;}const fraction=white/(n||1);if(fraction<.48)continue;
   candidates.push({box:[a.x,t,width,height],score:width*height*fraction,method:'floor-gap-and-closed-elevation-frame',status:'proposed',confirmationRequired:true});
  }
  candidates.sort((a,b)=>b.score-a.score);return candidates[0]?[candidates[0]]:[];
 }
 function occludedFrameAtSeed(image,seed,{top,bottom,width,height,occlusions=[]}){
  if(!(width>15&&height>15)||!occlusions.length)return [];
  const {width:w,height:h}=image,ink=structuralInk(image),masked=(x,y)=>occlusions.some(([l,t,r,b])=>x>=l-3&&x<=l+r+3&&y>=t-3&&y<=t+b+3),hit=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&!masked(x,y)&&!!ink[Math.round(y)*w+Math.round(x)],center=(seed.left+seed.right)/2,pad=Math.max(12,width*.55),candidates=[];
  const edge=(x,y0,y1)=>{let n=0,support=0,anchors=[];for(let y=Math.ceil(y0);y<=y1;y++){if(masked(x,y))continue;n++;if(hit(x,y)){support++;if(!anchors.length)anchors.push([x,y]);anchors[1]=[x,y];}}return {count:n,ratio:support/(n||1),anchors};};
  for(let y=Math.ceil(top+height);y<Math.min(h-2,bottom);y++)for(let x=Math.max(1,Math.floor(center-width/2-pad));x<=Math.min(w-width-2,Math.ceil(center-width/2+pad));x++){
   if(!hit(x,y))continue;const t=y-height,covered=occlusions.reduce((n,[l,ot,r,b])=>n+Math.max(0,Math.min(x+width,l+r)-Math.max(x,l))*Math.max(0,Math.min(y,ot+b)-Math.max(t,ot)),0);if(covered<width*height*.1||covered>width*height*.9)continue;
   const left=edge(x,t,y);if(left.count<8||left.ratio<.78)continue;
   for(let dx=-4;dx<=4;dx++){const r=Math.round(x+width)+dx,right=edge(r,t,y);if(right.count<8||right.ratio<.78)continue;let baseline=0,visible=0;for(let xx=x;xx<=r;xx++){if(masked(xx,y))continue;visible++;if(hit(xx,y)||hit(xx,y-1)||hit(xx,y+1))baseline++;}if(visible<(r-x)*.9||baseline/(visible||1)<.85)continue;
    let white=0,count=0;for(let yy=Math.ceil(t+3);yy<y-3;yy++)for(let xx=x+3;xx<r-3;xx++){if(masked(xx,yy))continue;const i=(yy*w+xx)*4;white+=Number(Math.min(image.data[i],image.data[i+1],image.data[i+2])>225);count++;}const fraction=white/(count||1);if(fraction<.5||count<50)continue;
    let below=0;for(let yy=y+3;yy<=Math.min(h-1,y+10);yy++)below+=Number(hit(x,yy))+Number(hit(r,yy));candidates.push({box:[x,t,r-x,height],score:fraction*100-Math.abs((x+r)/2-center)*.15-Math.abs(dx)*2-below*5,method:'visible-frame-and-cross-view-written-size',status:'proposed',confirmationRequired:true,occlusionEvidence:{observedSegments:[[[x,y],[r,y]],left.anchors,right.anchors],occlusions:occlusions.map(b=>b.slice()),knownSizePixels:[width,height],unseenTop:'height from compatible written dimension; never from legend pixels'}});
   }
  }candidates.sort((a,b)=>b.score-a.score);return candidates[0]?[candidates[0]]:[];
 }
 function secondaryEnvelope(image,primary,{side='right',expectedWidth=null,expectedBase=null}={}){
  if(primary.status!=='proposed')return {status:'unresolved',reason:'PRIMARY_REGISTRATION_REQUIRED'};
  const {width:w,height:h}=image,[px,py,pw,ph]=primary.box,ink=structuralInk(image),origin=side==='right'?px+pw:px,left=Math.max(Math.round(w*.15),Math.floor(side==='right'?origin:origin-pw*.75)),right=Math.min(Math.round(w*.75),Math.ceil(side==='right'?origin+pw*.75:origin)),top=Math.max(0,Math.floor(py+ph*.3)),bottom=Math.min(h-1,Math.ceil((expectedBase??py+ph)+ph*.08)),candidates=[];
  const horizontal=(y,x0,x1)=>{let best=0;for(let dy=-3;dy<=3;dy++){let count=0;for(let x=Math.round(x0);x<=Math.round(x1);x++)if(y+dy>=0&&y+dy<h)count+=ink[(y+dy)*w+x];best=Math.max(best,count/(x1-x0+1));}return best;};
  for(let x=left;x<=right;x++){const width=Math.abs(x-origin);if(width<pw*.17||expectedWidth&&Math.abs(width/expectedWidth-1)>.08)continue;let start=null,last=-100;const finish=()=>{if(start===null||last-start<Math.max(60,ph*.3)||Math.abs(last-(expectedBase??py+ph))>ph*.12||Math.abs(start-py)<ph*.22)return;const l=Math.min(x,origin),r=Math.max(x,origin),baseSupport=horizontal(last,l,r);let topSupport=0;for(let y=start-15;y<=start+4;y++)topSupport=Math.max(topSupport,horizontal(y,l,r));if(baseSupport<(expectedWidth ? .55 : .82)||topSupport<.65)return;candidates.push({box:[l,start,width,last-start],score:(last-start)*width*baseSupport,sourceViewId:primary.sourceViewId,sourceFrame:primary.sourceFrame,status:'proposed',method:'adjacent-source-wall-spine-and-guides',confirmationRequired:true});};
   for(let y=top;y<=bottom;y++){if(!ink[y*w+x])continue;if(y-last>3){finish();start=y;}last=y;}finish();
  }
  candidates.sort((a,b)=>b.score-a.score);return candidates[0]||{status:'unresolved',reason:'SECONDARY_WALL_SUPPORT'};
 }
 function secondarySide(image,primary,adjacent,{relativeScale=1}={}){
  if(primary.status!=='proposed'||adjacent.status!=='proposed')return {status:'unresolved',reason:'SECONDARY_REGISTRATION_REQUIRED'};
  const {width:w,height:h}=image,[px,py,pw,ph]=primary.box,ink=structuralInk(image),target=py+(adjacent.box[1]-adjacent.primaryTop)*relativeScale,strict=new Uint8Array(w*h);
  const l=Math.max(0,Math.floor(px-pw*.15)),r=Math.min(w-1,Math.ceil(px+pw*1.15)),t=Math.max(0,Math.floor(target-24)),b=Math.min(h-1,Math.ceil(target+16));
  for(let y=t;y<=b;y++)for(let x=l;x<=r;x++){const j=(y*w+x)*4;strict[y*w+x]=Number(Math.max(image.data[j],image.data[j+1],image.data[j+2])<115&&Math.max(image.data[j],image.data[j+1],image.data[j+2])-Math.min(image.data[j],image.data[j+1],image.data[j+2])<65);}
  const lines=components(opening(strict,w,h,Math.round(pw*.2),0),w,h).map(c=>c.box).filter(b=>b[2]>pw*.55&&b[3]<10),candidates=[];
  for(const [x,y,width,thickness]of lines){const roofY=y+thickness,base=Math.min(h-1,Math.round(py+ph+ph*.12)),columns=[];
   for(let xx=Math.round(x+width*.025);xx<=Math.round(x+width*.975);xx++){let count=0,last=roofY;for(let yy=roofY+8;yy<=base;yy++){if(ink[yy*w+xx]){count++;last=yy;}}if(count>Math.max(65,(base-roofY)*.68))columns.push({x:xx,count,last});}
   const groups=[];for(const c of columns){if(!groups.length||c.x-groups.at(-1).at(-1).x>3)groups.push([c]);else groups.at(-1).push(c);}if(groups.length<2)continue;
   const best=g=>g.reduce((a,b)=>b.count>a.count?b:a),a=best(groups[0]),z=best(groups.at(-1)),depth=z.x-a.x;if(depth<pw*.55||depth>pw*1.05)continue;
   const bottom=Math.min(a.last,z.last),candidate={box:[a.x,roofY,depth,bottom-roofY],roofGuide:[x,y,width,thickness],score:depth*Math.min(a.count,z.count),sourceViewId:primary.sourceViewId,sourceFrame:primary.sourceFrame,status:'proposed',method:'secondary-roof-guide-and-two-supported-wall-spines',confirmationRequired:true};if(candidate.box[3]>ph*.3)candidates.push(candidate);
  }
  candidates.sort((a,b)=>b.score-a.score);return candidates[0]||{status:'unresolved',reason:'SECONDARY_DEPTH_NOT_REPRESENTED'};
 }
 function neutralFrameEvidence(image,box){
  const {width:w,height:h,data}=image,[x,y,ww,hh]=box,samples=[];
  for(let row=1;row<6;row++)for(let col=1;col<6;col++){const j=(Math.floor(y+hh*row/6)*w+Math.floor(x+ww*col/6))*4;samples.push((data[j]+data[j+1]+data[j+2])/3);}
  samples.sort((a,b)=>a-b);const background=samples[Math.floor(samples.length/2)],contrastThreshold=25;
  // Annotation colour can interrupt a panel, but can never supply its frame.
  // Each side must have one fixed, dark, nearly neutral source line.
  const dark=(xx,yy)=>{if(xx<0||yy<0||xx>=w||yy>=h)return false;const j=(Math.round(yy)*w+Math.round(xx))*4,hi=Math.max(data[j],data[j+1],data[j+2]),lo=Math.min(data[j],data[j+1],data[j+2]);return data[j+3]>100&&hi-lo<45&&(data[j]+data[j+1]+data[j+2])/3<background-contrastThreshold;};
  const interrupted=(xx,yy)=>{if(xx<0||yy<0||xx>=w||yy>=h)return false;const j=(Math.round(yy)*w+Math.round(xx))*4;return Math.max(data[j],data[j+1],data[j+2])-Math.min(data[j],data[j+1],data[j+2])>=45;};
  const line=(axis,fixed,start,end)=>{let hits=0,total=0,contrast=0,gap=0,unexplained=0,maxGap=0,maxUnexplainedGap=0,lastColour=-Infinity;const colourInterruptions=[];for(let n=Math.ceil(start);n<=Math.floor(end);n++){const xx=axis==='y'?fixed:n,yy=axis==='y'?n:fixed;total++;if(!dark(xx,yy)){const colour=interrupted(xx,yy);gap++;unexplained=colour?0:unexplained+1;maxGap=Math.max(maxGap,gap);maxUnexplainedGap=Math.max(maxUnexplainedGap,unexplained);if(colour){const point=[xx,yy];if(n===lastColour+1)colourInterruptions.at(-1).anchors[1]=point;else colourInterruptions.push({anchors:[point,point],use:'interruption-only; never a boundary'});lastColour=n;}continue;}gap=0;unexplained=0;hits++;const j=(Math.round(yy)*w+Math.round(xx))*4;contrast+=background-(data[j]+data[j+1]+data[j+2])/3;}return {coordinate:fixed,support:hits/(total||1),contrast:contrast/(hits||1),sampleCount:total,maxGap,maxUnexplainedGap,colourInterruptions};};
  const best=(axis,at,start,end,from,to)=>{let result=null;for(let delta=from;delta<=to;delta++){const candidate=line(axis,Math.round(at)+delta,start,end);if(!result||candidate.support>result.support||candidate.support===result.support&&Math.abs(delta)<Math.abs(result.coordinate-at))result=candidate;}return result;};
  const sides={left:best('y',x,y,y+hh,-6,2),right:best('y',x+ww,y,y+hh,-2,6),top:best('x',y,x,x+ww,-6,2),bottom:best('x',y+hh,x,x+ww,-2,6)},l=sides.left.coordinate,r=sides.right.coordinate,t=sides.top.coordinate,b=sides.bottom.coordinate;
  const edges={left:{...line('y',l,t,b),anchors:[[l,t],[l,b]]},right:{...line('y',r,t,b),anchors:[[r,t],[r,b]]},top:{...line('x',t,l,r),anchors:[[l,t],[r,t]]},bottom:{...line('x',b,l,r),anchors:[[l,b],[r,b]]}};
  const corners=[[l,t],[r,t],[r,b],[l,b]].map(([xx,yy])=>{for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)if(dark(xx+dx,yy+dy))return true;return false;});
  return {box:[l,t,r-l,b-t],background,contrastThreshold,tolerancePx:6,maxGapPx:8,maxUnexplainedGapPx:3,edges,corners,closed:r>l&&b>t&&Object.values(edges).every(e=>e.support>=.8&&e.maxGap<=8&&e.maxUnexplainedGap<=3)&&corners.every(Boolean)};
 }
 function fragmentedDoorFrames(image,box,parts,seeds,established){
  const {width:w,height:h,data}=image,[bx,by,bw,bh]=box,within=(a,b)=>Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]))/Math.min(a[2]*a[3],b[2]*b[3]),result=[];
  // A short coloured interruption may split an otherwise neutral door into
  // one large panel and one small aligned strip. Do not merge independent
  // framed apertures or arbitrary grey cells from an annotation table.
  for(const seed of seeds){
   const [x,y,ww,hh]=seed.box;if(established.some(c=>within(c.panelBox||c.box,seed.box)>.4)||Math.abs(by+bh-y-hh)>Math.max(8,bh*.12))continue;
   const before=neutralFrameEvidence(image,seed.box),supported=name=>before.edges[name].support>=.8&&before.edges[name].maxGap<=8&&before.edges[name].maxUnexplainedGap<=3;
   if(!supported('left')||!supported('right')||supported('top')===supported('bottom'))continue;
   const above=!supported('top'),candidates=[];
   for(const part of parts){
    if(part===seed)continue;const [px,py,pw,ph]=part.box,gap=above?y-py-ph:py-y-hh;
    if(gap<1||gap>8||ph<4||ph>hh*.25||Math.abs(px-x)>2||Math.abs(px+pw-x-ww)>2||part.area/(pw*ph)<.65)continue;
    const top=above?py:y,bottom=above?y+hh:py+ph,joined=[Math.min(x,px),top,Math.max(x+ww,px+pw)-Math.min(x,px),bottom-top];
    if(joined[0]<=bx+8||joined[0]+joined[2]>=bx+bw-8||joined[1]<=by+bh*.15||joined[3]>=bh*.95||joined[2]/joined[3]<=.2||joined[2]/joined[3]>=2.3)continue;
    const gapBox=[Math.max(x,px),above?py+ph:y+hh,Math.min(x+ww,px+pw)-Math.max(x,px),gap];let coloured=0,count=0,maxWhiteRun=0;
    for(let yy=gapBox[1];yy<gapBox[1]+gapBox[3];yy++){let whiteRun=0;for(let xx=gapBox[0]+2;xx<gapBox[0]+gapBox[2]-2;xx++){const j=(yy*w+xx)*4,hi=Math.max(data[j],data[j+1],data[j+2]),lo=Math.min(data[j],data[j+1],data[j+2]);coloured+=Number(hi-lo>=45);whiteRun=lo>225&&hi-lo<35?whiteRun+1:0;maxWhiteRun=Math.max(maxWhiteRun,whiteRun);count++;}}
    // A visible white separator between two partly masked frames is contrary
    // evidence, even if most of that interval is covered by annotation colour.
    if(coloured/(count||1)<.65||maxWhiteRun>8)continue;
    const frame=neutralFrameEvidence(image,joined);if(!frame.closed)continue;
    candidates.push({box:frame.box,panelBox:joined,type:'door',method:'closed-frame-and-fragmented-neutral-door-panels',status:'proposed',confirmationRequired:true,fragmentEvidence:{version:1,method:'aligned-neutral-parts-with-observed-dark-frame',coordinateSystem:'source-raster-pixels',rasterSize:[w,h],searchBox:box.slice(),parts:[part,seed].sort((a,b)=>a.box[1]-b.box[1]).map(p=>({box:p.box.slice(),area:p.area,fill:p.area/(p.box[2]*p.box[3])})),gaps:[{box:gapBox,pixels:gap,colouredFraction:coloured/(count||1),maxWhiteRun,use:'interruption-only; never a boundary'}],edges:frame.edges,corners:frame.corners,background:frame.background,contrastThreshold:frame.contrastThreshold,tolerancePx:frame.tolerancePx,maxGapPx:frame.maxGapPx,maxUnexplainedGapPx:frame.maxUnexplainedGapPx}});
   }
   // Several different closed unions are ambiguous; no score chooses one.
   if(candidates.length!==1)continue;const candidate=candidates[0];if(!result.some(c=>within(c.panelBox,candidate.panelBox)>.4))result.push(candidate);
  }return result;
 }
 function grayDoorFrames(image,box,{type='door'}={}){
  const {width:w,height:h}=image,[bx,by,bw,bh]=box,mask=new Uint8Array(w*h),ink=structuralInk(image),left=Math.max(0,Math.floor(bx)),right=Math.min(w-1,Math.ceil(bx+bw)),top=Math.max(0,Math.floor(by)),bottom=Math.min(h-1,Math.ceil(by+bh));
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){const j=(y*w+x)*4,hi=Math.max(image.data[j],image.data[j+1],image.data[j+2]),lo=Math.min(image.data[j],image.data[j+1],image.data[j+2]);mask[y*w+x]=Number(lo>65&&hi<225&&hi-lo<35);}
  const parts=components(closing(mask,w,h,2,2),w,h),raw=parts.filter(c=>c.box[0]>left+8&&c.box[0]+c.box[2]<right-8&&c.box[1]>top+bh*.15&&c.box[2]>22&&c.box[3]>Math.max(15,bh*(type==='door'?.43:.08))&&c.box[3]<bh*(type==='door'?.95:.6)&&c.box[2]/c.box[3]>.2&&c.box[2]/c.box[3]<(type==='door'?2.3:8)&&c.area/(c.box[2]*c.box[3])>.65),groups=[];
  for(const c of raw.sort((a,b)=>a.box[0]-b.box[0])){const [x,y,ww,hh]=c.box,g=groups.find(g=>Math.abs(g.box[1]-y)<7&&Math.abs(g.box[1]+g.box[3]-y-hh)<7&&x-g.box[0]-g.box[2]<bw*.06);if(g){const r=Math.max(x+ww,g.box[0]+g.box[2]),b=Math.max(y+hh,g.box[1]+g.box[3]);g.box=[g.box[0],Math.min(y,g.box[1]),r-g.box[0],b-Math.min(y,g.box[1])];}else groups.push({box:c.box});}
  const framed=([x,y,ww,hh])=>{
   const samples=[];for(let row=1;row<6;row++)for(let col=1;col<6;col++){const j=(Math.floor(y+hh*row/6)*w+Math.floor(x+ww*col/6))*4;samples.push((image.data[j]+image.data[j+1]+image.data[j+2])/3);}samples.sort((a,b)=>a-b);const background=samples[Math.floor(samples.length/2)],dark=(xx,yy)=>{if(xx<0||yy<0||xx>=w||yy>=h)return false;const at=Math.round(yy)*w+Math.round(xx),j=at*4;return !!ink[at]&&(image.data[j]+image.data[j+1]+image.data[j+2])/3<background-25;};
   let hits=0,total=0;for(let yy=y;yy<=y+hh;yy++)for(const xx of [x,x+ww]){let found=false;for(let dx=-6;dx<=6;dx++)found||=dark(xx+dx,yy);hits+=Number(found);total++;}const vertical=hits/(total||1);hits=0;total=0;for(let xx=x;xx<=x+ww;xx++)for(const yy of [y,y+hh]){let found=false;for(let dy=-6;dy<=6;dy++)found||=dark(xx,yy+dy);hits+=Number(found);total++;}return vertical>.75&&hits/(total||1)>.7;
  };
  const established=groups.filter(g=>framed(g.box)).map(g=>({box:[g.box[0]-3,g.box[1]-3,g.box[2]+6,g.box[3]+6],panelBox:g.box.slice(),framePaddingPx:3,type,method:type==='door'?'closed-frame-and-neutral-door-panels':'closed-frame-and-neutral-glazing',status:'proposed',confirmationRequired:true}));
  return type==='door'?[...established,...fragmentedDoorFrames(image,box,parts,raw,established)]:established;
 }
 function canopyEnvelope(image,primary,upperY){
  if(primary.status!=='proposed'||!Number.isFinite(upperY))return {status:'unresolved',reason:'CANOPY_LEVEL_REQUIRED'};
  const {width:w,height:h}=image,[bx,by,bw,bh]=primary.box,ink=structuralInk(image),mask=new Uint8Array(w*h),top=Math.max(0,Math.floor(upperY-30)),bottom=Math.min(h-1,Math.ceil(upperY+bh*.23));
  for(let y=top;y<=bottom;y++)for(let x=Math.max(0,Math.floor(bx));x<=Math.min(w-1,Math.ceil(bx+bw));x++){const j=(y*w+x)*4;mask[y*w+x]=Number(Math.max(image.data[j],image.data[j+1],image.data[j+2])<150&&Math.max(image.data[j],image.data[j+1],image.data[j+2])-Math.min(image.data[j],image.data[j+1],image.data[j+2])<40);}
  const lines=components(opening(mask,w,h,Math.round(bw*.12),0),w,h).map(c=>c.box).filter(b=>b[2]>bw*.29&&b[2]<bw*.7&&b[3]<10),candidates=[];
  for(const [x,y,width,thickness]of lines){const roofY=y+thickness,start=roofY+2,end=Math.min(h-1,Math.ceil(by+bh+bh*.18)),columns=[];
   for(const center of [x,x+width]){const edges=[];for(let xx=Math.max(0,Math.floor(center-16));xx<=Math.min(w-1,Math.ceil(center+16));xx++){let count=0,last=start;for(let yy=start;yy<=end;yy++)if(ink[yy*w+xx]){count++;last=yy;}if(count>Math.max(80,(end-start)*.68))edges.push({x:xx,last,count});}if(!edges.length){columns.push(null);continue;}const groups=[];for(const edge of edges){if(!groups.length||edge.x-groups.at(-1).at(-1).x>3)groups.push([edge]);else groups.at(-1).push(edge);}const last=groups.at(-1).at(-1),previous=groups.length>1&&last.x-groups.at(-2)[0].x<=25?groups.at(-2):groups.at(-1),first=previous[0];columns.push({x:first.x,width:last.x-first.x>=4?last.x-first.x:null,bottom:Math.min(first.last,last.last),support:Math.min(first.count,last.count)});}
   if(columns.some(c=>!c))continue;const [a,b]=columns,base=Math.min(a.bottom,b.bottom);if(base-roofY<bh*.3||b.x-a.x<bw*.25)continue;candidates.push({status:'proposed',box:[a.x,roofY,b.x-a.x,base-roofY],columns,beamLine:[x,y,width,thickness],sourceViewId:primary.sourceViewId,sourceFrame:primary.sourceFrame,method:'two-supported-posts-and-lower-roof-beam-guide',score:width*Math.min(a.support,b.support),confirmationRequired:true});
  }candidates.sort((a,b)=>b.score-a.score);return candidates[0]||{status:'unresolved',reason:'CANOPY_POSTS_NOT_ESTABLISHED'};
 }
 function canopySide(image,primary,topY,{direction='right'}={}){
  const {width:w,height:h}=image,[bx,by,bw,bh]=primary.box,ink=structuralInk(image),candidates=[];
  // A detached dimension extension below a landing is not a continuation of
  // the post. Keep the supported vertical run attached to the canopy region.
  const gapLimit=Math.max(3,Math.min(5,Math.round(h*.003))),startLimit=Math.max(12,bh*.06);
  for(let x=Math.max(0,Math.floor(direction==='right'?bx-bw*.35:bx+bw+bw*.025));x<Math.min(w,direction==='right'?bx-bw*.025:bx+bw+bw*.35);x++){
   const runs=[];let run=null;
   for(let y=Math.max(0,Math.round(topY));y<Math.min(h,by+bh+bh*.1);y++)if(ink[y*w+x]){if(!run||y-run.last>gapLimit){run={first:y,last:y,count:0};runs.push(run);}run.last=y;run.count++;}
   const supported=runs.filter(r=>r.first-topY<=startLimit&&r.count>Math.max(80,(by+bh-topY)*.73)).sort((a,b)=>b.count-a.count)[0];
   if(supported)candidates.push({x,count:supported.count,last:supported.last});
  }
  const groups=[];for(const c of candidates){if(!groups.length||c.x-groups.at(-1).at(-1).x>20)groups.push([c]);else groups.at(-1).push(c);}const group=groups.filter(g=>g.at(-1).x-g[0].x>=4&&g.at(-1).x-g[0].x<=35).sort((a,b)=>b.reduce((s,c)=>s+c.count,0)-a.reduce((s,c)=>s+c.count,0))[0];return group?{status:'proposed',box:[group[0].x,topY,group.at(-1).x-group[0].x,Math.min(group[0].last,group.at(-1).last)-topY],sourceViewId:primary.sourceViewId,sourceFrame:primary.sourceFrame,method:'side-post-two-visible-edges',confirmationRequired:true}:{status:'unresolved',reason:'CANOPY_DEPTH_NOT_REPRESENTED'};
 }
 // A beam guide is only ink. A visible beam face needs two separated horizontal
 // boundaries joined at both ends. The caller must independently establish its
 // position/depth and distinguish a side return from the front beam's section.
 function entryBands(image,{left,right,nearY,height,occlusions=[]}){
  if(!image?.data||![left,right,nearY,height].every(Number.isFinite)||right-left<12||height<30)return [];
  const {width:w,height:h}=image,ink=structuralInk(image),pad=Math.max(2,Math.min(5,Math.round(w/700))),span=right-left;
  const masked=(x,y)=>occlusions.some(([l,t,bw,bh])=>x>=l&&x<=l+bw&&y>=t&&y<=t+bh);
  const hit=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&!masked(x,y)&&!!ink[Math.round(y)*w+Math.round(x)];
  const rows=[],top=Math.max(0,Math.floor(nearY-height*.16)),bottom=Math.min(h-1,Math.ceil(nearY+height*.08));
  for(let y=top;y<=bottom;y++){
   let count=0,total=0;for(let x=Math.ceil(left+pad);x<=Math.floor(right-pad);x++){total++;count+=Number(hit(x,y));}
   if(count/(total||1)<.82)continue;
   if(rows.length&&y-rows.at(-1).bottom<=1)rows.at(-1).bottom=y;else rows.push({top:y,bottom:y});
  }
  // Post edges locate the search, not the beam's endpoints. A small visible
  // projection beyond a post still needs its own complete vertical boundary.
  const edgePad=Math.max(pad,Math.min(20,span*.08,height*.08)),candidates=[],edge=(around,t,b)=>{
   let best=null;for(let x=Math.round(around-edgePad);x<=Math.round(around+edgePad);x++){let n=0;for(let y=Math.ceil(t);y<=Math.floor(b);y++)n+=Number(hit(x,y));const support=n/(Math.floor(b)-Math.ceil(t)+1);if(support>=.78&&(!best||Math.abs(x-around)<Math.abs(best.x-around)))best={x,support};}return best;
  };
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
   const a=rows[i],b=rows[j],gap=b.top-a.bottom,thickness=Math.max(a.bottom-a.top+1,b.bottom-b.top+1);
   if(gap<Math.max(4,thickness*2)||b.top-a.bottom>height*.15||thickness>Math.max(5,height*.025))continue;
   const l=edge(left,a.bottom,b.top),r=edge(right,a.bottom,b.top);if(!l||!r||r.x-l.x<span*.9)continue;
   const box=[l.x,(a.top+a.bottom)/2,r.x-l.x,(b.top+b.bottom-a.top-a.bottom)/2];
   if([a,b].some(row=>{let count=0,total=0;for(let x=l.x;x<=r.x;x++){let present=false;for(let y=row.top;y<=row.bottom;y++)present||=hit(x,y);count+=Number(present);total++;}return count/(total||1)<.82;}))continue;
   if(occlusions.some(([x,y,bw,bh])=>Math.min(x+bw,box[0]+box[2])>Math.max(x,box[0])&&Math.min(y+bh,box[1]+box[3])>Math.max(y,box[1])))continue;
   // A filled/coloured annotation and the width of one thick stroke cannot
   // provide an empty, independently bounded beam face.
   let clear=0,total=0;for(let y=a.bottom+2;y<b.top-1;y++)for(let x=Math.ceil(l.x+pad);x<r.x-pad;x+=2){total++;clear+=Number(!hit(x,y));}
   if(!total||clear/total<.55)continue;
   candidates.push({status:'proposed',box,anchors:[[box[0],box[1]],[box[0]+box[2],box[1]],[box[0]+box[2],box[1]+box[3]],[box[0],box[1]+box[3]]],method:'paired-horizontal-boundaries-and-closed-ends',score:Math.abs(box[1]+box[3]-nearY),confirmationRequired:true});
  }
  return candidates.sort((a,b)=>a.score-b.score||a.box[3]-b.box[3]);
 }
 // Single rising side silhouette of an attached entrance roof. Both heights
 // come from the separately calibrated front view; every proposed segment,
 // including the lower edge, must still be visible in this side view.
 function entrySideRoof(image,{wallX,postBox,eaveY,crestY,direction='right',tolerance=3,occlusions=[]}){
  if(!image?.data||!Array.isArray(postBox)||![wallX,eaveY,crestY,tolerance,...postBox].every(Number.isFinite)||eaveY-crestY<5)return {status:'unresolved',reason:'ENTRY_ROOF_SIDE_PROFILE_UNRESOLVED'};
  const {width:w,height:h}=image,ink=structuralInk(image),sign=direction==='right'?-1:1,postEdge=direction==='right'?postBox[0]:postBox[0]+postBox[2],distance=(postEdge-wallX)*sign;
  if(distance<8)return {status:'unresolved',reason:'ENTRY_ROOF_ATTACHMENT_UNRESOLVED'};
  const pad=Math.max(2,Math.min(8,Math.ceil(tolerance))),masked=(x,y)=>occlusions.some(([l,t,bw,bh])=>x>=l-2&&x<=l+bw+2&&y>=t-2&&y<=t+bh+2);
  const hit=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&!masked(x,y)&&!!ink[Math.round(y)*w+Math.round(x)];
  const support=(a,b)=>{const count=Math.max(1,Math.ceil(Math.abs(b[0]-a[0])));let hits=0,gap=0,maxGap=0;for(let i=0;i<=count;i++){const x=a[0]+(b[0]-a[0])*i/count,y=a[1]+(b[1]-a[1])*i/count;let found=false;for(let dy=-1;dy<=1;dy++)found||=hit(x,y+dy);if(found){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}return {ratio:hits/(count+1),maxGap};};
  const candidates=[];
  for(let depth=Math.ceil(distance);depth<=Math.ceil(distance*1.8);depth++){
   const x=Math.round(wallX+sign*depth);if(x<1||x>w-2)continue;
   for(let y=Math.round(eaveY-pad);y<=Math.round(eaveY+pad);y++){
    if(!hit(x,y))continue;
    for(let peak=Math.round(crestY-pad);peak<=Math.round(crestY+pad);peak++){
     if(!hit(wallX,peak))continue;const a=[x,y],b=[wallX,peak],s=support(a,b);if(s.ratio<.88||s.maxGap>Math.max(4,depth*.055))continue;
     let baseline=null;for(let dy=0;dy<=Math.max(6,pad*2);dy++){const test=support([x,y+dy],[wallX,y+dy]);if(test.ratio>=.8&&test.maxGap<=Math.max(4,depth*.08)){baseline={y:y+dy,...test};break;}}
     if(!baseline)continue;const box=[Math.min(x,wallX),peak,Math.abs(wallX-x),baseline.y-peak];
     if(occlusions.some(([l,t,bw,bh])=>Math.min(l+bw,box[0]+box[2])>Math.max(l,box[0])&&Math.min(t+bh,box[1]+box[3])>Math.max(t,box[1])))continue;
     candidates.push({status:'proposed',points:[a,b],box,baseline,method:'supported-side-slope-and-eave-to-wall-boundary',support:s,score:s.ratio*100+depth*.1-Math.abs(y-eaveY)-Math.abs(peak-crestY),confirmationRequired:true});
    }
   }
  }
  candidates.sort((a,b)=>b.score-a.score);return candidates[0]||{status:'unresolved',reason:'ENTRY_ROOF_SIDE_PROFILE_UNRESOLVED'};
 }
 return Object.freeze({version:1,floorEnvelope,floorBoundaryEvidence,floorDoorEvidence,floorSlidingFrameEvidence,componentAxisSegments,wallEnvelope,canopyEnvelope,canopySide,entryBands,entrySideRoof,secondaryEnvelope,secondarySide,roofProfile,roofEaveJunctions,roofCeilingBand,legendBoxes,floorOpenings,elevationOpenings,glazingFrames,grayDoorFrames,occludedFrameAtSeed,frameAtSeed,monochrome,structuralInk,rectangleFilter,opening,closing,components,fillHoles,outline,simplify,alignOutline,removeStraight,consolidateAxes});
});
