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
 function removeStraight(points){let next=points;for(let pass=0;pass<3;pass++){const before=next;next=before.filter((p,i)=>{const a=before[(i+before.length-1)%before.length],b=before[(i+1)%before.length];return Math.hypot(p[0]-a[0],p[1]-a[1])>.01&&Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>.01;});if(next.length===before.length)break;}return next;}
 function alignOutline(points,ink,w,h,k){
  points=removeStraight(points);const stride=w+1,sum=new Uint32Array(stride*(h+1));for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=ink[y*w+x];sum[(y+1)*stride+x+1]=sum[y*stride+x+1]+row;}}
  const count=(x0,y0,x1,y1)=>{const l=Math.max(0,Math.floor(x0)),t=Math.max(0,Math.floor(y0)),r=Math.min(w,Math.ceil(x1)),b=Math.min(h,Math.ceil(y1));return r>l&&b>t?(sum[b*stride+r]-sum[t*stride+r]-sum[b*stride+l]+sum[t*stride+l])/((r-l)*(b-t)):0;};
  const next=points.map(p=>p.slice());for(let i=0;i<points.length;i++){const j=(i+1)%points.length,a=points[i],b=points[j],dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]),vertical=dx<=k*2&&dy>k*3,horizontal=dy<=k*2&&dx>k*3;if(!vertical&&!horizontal)continue;const axis=vertical?0:1,position=(a[axis]+b[axis])/2;let best=null;for(let coordinate=Math.round(position-k*4);coordinate<=position+k*4;coordinate++){const support=vertical?count(coordinate-k/2,Math.min(a[1],b[1]),coordinate+k/2,Math.max(a[1],b[1])):count(Math.min(a[0],b[0]),coordinate-k/2,Math.max(a[0],b[0]),coordinate+k/2);if(support<.65)continue;const distance=Math.abs(coordinate-position);if(!best||distance<best.distance)best={coordinate,distance};}if(best){next[i][axis]=best.coordinate;next[j][axis]=best.coordinate;}}
  return removeStraight(next);
 }
 function consolidateAxes(points,tolerance){for(const axis of [0,1]){const ordered=points.map((p,i)=>({value:p[axis],i,weight:Math.abs(points[(i+points.length-1)%points.length][1-axis]-p[1-axis])+Math.abs(points[(i+1)%points.length][1-axis]-p[1-axis])})).sort((a,b)=>a.value-b.value),groups=[];for(const item of ordered){if(!groups.length||item.value-groups.at(-1).at(-1).value>tolerance)groups.push([item]);else groups.at(-1).push(item);}for(const group of groups){const chosen=group.reduce((a,b)=>b.weight>a.weight?b:a);for(const item of group)points[item.i][axis]=chosen.value;}}return removeStraight(points);}
 function monochrome(image){const out=new Uint8Array(image.width*image.height);for(let i=0;i<out.length;i++){const j=i*4,r=image.data[j],g=image.data[j+1],b=image.data[j+2];out[i]=Number(image.data[j+3]>100&&(r+g+b)<630&&Math.max(r,g,b)-Math.min(r,g,b)<45);}return out;}
 function floorEnvelope(image,{sourceViewId=null,frame=null}={}){
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
 function wallEnvelope(image,expectedWidth,{sourceViewId=null,frame=null,occlusions=[]}={}){
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
 function legendBoxes(image,rows){
  const titles=rows.filter(r=>r.box?.length===4&&r.box.every(Number.isFinite)&&/^(?:legende|legend)\s*[:.]?$/i.test(String(r.text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()));if(!titles.length)return [];
  const {width:w,height:h}=image,ink=monochrome(image),horizontal=opening(ink,w,h,Math.round(w*.1),0),lines=components(horizontal,w,h).map(c=>c.box).filter(b=>b[2]>w*.25&&b[3]<12),boxes=[];
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
 function roofProfile(image,envelope,rows=[]){
  if(envelope.status!=='proposed')return {status:'unresolved',reason:'WALL_REGISTRATION_REQUIRED'};
  const {width:w,height:h}=image,[bx,by,bw]=envelope.box,ink=structuralInk(image),occlusions=envelope.occlusions||[];
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
  if(Math.abs(a.highY-b.highY)>bw*.035||a.highX>b.highX+10)return {status:'unresolved',reason:'ROOF_PROFILES_DISAGREE',base,slopes:[a,b]};
  const ridgeY=Math.round(Math.max(a.highY,b.highY));if(base.y-ridgeY<20)return {status:'unresolved',reason:'ROOF_RISE_UNKNOWN'};
  if(b.highX-a.highX>8){let support=0,count=0;for(let x=Math.ceil(a.highX+2);x<=Math.floor(b.highX-2);x++){let hit=false;for(let dy=-3;dy<=3;dy++)if(ridgeY+dy>=0&&ridgeY+dy<h)hit||=!!ink[(ridgeY+dy)*w+x];support+=Number(hit);count++;}if(support/(count||1)<.7)return {status:'unresolved',reason:'ROOF_RIDGE_OCCLUDED',base,slopes:[a,b],ridgeSupport:support/(count||1)};}
  return {status:'proposed',method:'source-eaves-and-two-supported-slopes',points:[[a.eaveX,base.y],[a.highX,ridgeY],[b.highX,ridgeY],[b.eaveX,base.y]],base,slopes:[a,b],sourceViewId:envelope.sourceViewId,sourceFrame:envelope.sourceFrame,confirmationRequired:true};
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
 function grayDoorFrames(image,box,{type='door'}={}){
  const {width:w,height:h}=image,[bx,by,bw,bh]=box,mask=new Uint8Array(w*h),ink=structuralInk(image),left=Math.max(0,Math.floor(bx)),right=Math.min(w-1,Math.ceil(bx+bw)),top=Math.max(0,Math.floor(by)),bottom=Math.min(h-1,Math.ceil(by+bh));
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){const j=(y*w+x)*4,hi=Math.max(image.data[j],image.data[j+1],image.data[j+2]),lo=Math.min(image.data[j],image.data[j+1],image.data[j+2]);mask[y*w+x]=Number(lo>65&&hi<225&&hi-lo<35);}
  const raw=components(closing(mask,w,h,2,2),w,h).filter(c=>c.box[0]>left+8&&c.box[0]+c.box[2]<right-8&&c.box[1]>top+bh*.15&&c.box[2]>22&&c.box[3]>Math.max(15,bh*(type==='door'?.43:.08))&&c.box[3]<bh*(type==='door'?.95:.6)&&c.box[2]/c.box[3]>.2&&c.box[2]/c.box[3]<(type==='door'?2.3:8)&&c.area/(c.box[2]*c.box[3])>.65),groups=[];
  for(const c of raw.sort((a,b)=>a.box[0]-b.box[0])){const [x,y,ww,hh]=c.box,g=groups.find(g=>Math.abs(g.box[1]-y)<7&&Math.abs(g.box[1]+g.box[3]-y-hh)<7&&x-g.box[0]-g.box[2]<bw*.06);if(g){const r=Math.max(x+ww,g.box[0]+g.box[2]),b=Math.max(y+hh,g.box[1]+g.box[3]);g.box=[g.box[0],Math.min(y,g.box[1]),r-g.box[0],b-Math.min(y,g.box[1])];}else groups.push({box:c.box});}
  const framed=([x,y,ww,hh])=>{
   const samples=[];for(let row=1;row<6;row++)for(let col=1;col<6;col++){const j=(Math.floor(y+hh*row/6)*w+Math.floor(x+ww*col/6))*4;samples.push((image.data[j]+image.data[j+1]+image.data[j+2])/3);}samples.sort((a,b)=>a-b);const background=samples[Math.floor(samples.length/2)],dark=(xx,yy)=>{if(xx<0||yy<0||xx>=w||yy>=h)return false;const at=Math.round(yy)*w+Math.round(xx),j=at*4;return !!ink[at]&&(image.data[j]+image.data[j+1]+image.data[j+2])/3<background-25;};
   let hits=0,total=0;for(let yy=y;yy<=y+hh;yy++)for(const xx of [x,x+ww]){let found=false;for(let dx=-6;dx<=6;dx++)found||=dark(xx+dx,yy);hits+=Number(found);total++;}const vertical=hits/(total||1);hits=0;total=0;for(let xx=x;xx<=x+ww;xx++)for(const yy of [y,y+hh]){let found=false;for(let dy=-6;dy<=6;dy++)found||=dark(xx,yy+dy);hits+=Number(found);total++;}return vertical>.75&&hits/(total||1)>.7;
  };
  return groups.filter(g=>framed(g.box)).map(g=>({box:[g.box[0]-3,g.box[1]-3,g.box[2]+6,g.box[3]+6],panelBox:g.box.slice(),framePaddingPx:3,type,method:type==='door'?'closed-frame-and-neutral-door-panels':'closed-frame-and-neutral-glazing',status:'proposed',confirmationRequired:true}));
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
  for(let x=Math.max(0,Math.floor(direction==='right'?bx-bw*.35:bx+bw+bw*.025));x<Math.min(w,direction==='right'?bx-bw*.025:bx+bw+bw*.35);x++){let count=0,last=topY;for(let y=Math.max(0,Math.round(topY));y<Math.min(h,by+bh+bh*.1);y++)if(ink[y*w+x]){count++;last=y;}if(count>Math.max(80,(by+bh-topY)*.73))candidates.push({x,count,last});}
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
  const candidates=[],edge=(around,t,b)=>{
   let best=null;for(let x=Math.round(around-pad);x<=Math.round(around+pad);x++){let n=0;for(let y=Math.ceil(t);y<=Math.floor(b);y++)n+=Number(hit(x,y));const support=n/(Math.floor(b)-Math.ceil(t)+1);if(support>=.78&&(!best||Math.abs(x-around)<Math.abs(best.x-around)))best={x,support};}return best;
  };
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
   const a=rows[i],b=rows[j],gap=b.top-a.bottom,thickness=Math.max(a.bottom-a.top+1,b.bottom-b.top+1);
   if(gap<Math.max(4,thickness*2)||b.top-a.bottom>height*.15||thickness>Math.max(5,height*.025))continue;
   const l=edge(left,a.bottom,b.top),r=edge(right,a.bottom,b.top);if(!l||!r||r.x-l.x<span*.9)continue;
   const box=[l.x,(a.top+a.bottom)/2,r.x-l.x,(b.top+b.bottom-a.top-a.bottom)/2];
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
 return Object.freeze({version:1,floorEnvelope,wallEnvelope,canopyEnvelope,canopySide,entryBands,entrySideRoof,secondaryEnvelope,secondarySide,roofProfile,legendBoxes,floorOpenings,elevationOpenings,glazingFrames,grayDoorFrames,occludedFrameAtSeed,frameAtSeed,monochrome,structuralInk,rectangleFilter,opening,closing,components,fillHoles,outline,simplify,alignOutline,removeStraight,consolidateAxes});
});
