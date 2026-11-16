/* Two measured orthographic profiles bound one physical roof surface. No
 * rectangle/rise fallback, symmetry assumption or PDF texture is used. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MIRReconstructedRoofs=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';const finite=Number.isFinite;
 function issues(roof,{confirm=true,depth=0}={}){const errors=[];if(!roof?.id||!roof.levelId||!roof.buildingId)errors.push('ROOF_ID');if(confirm&&roof.status!=='confirmed')errors.push('ROOF_UNCONFIRMED');for(const key of ['x','y']){const p=roof?.profiles?.[key];if(!Array.isArray(p)||p.length<2||p.length>12||p.some((p,i,a)=>p.length!==2||!p.every(finite)||p.some(n=>Math.abs(n)>10000)||i&&p[0]<=a[i-1][0]))errors.push('ROOF_PROFILE');}if(!Array.isArray(roof?.sources)||roof.sources.length<2||roof.sources.some(s=>!s.sourceViewId||!s.sourceFrame||!s.anchors?.length||!finite(s.scaleX)||!finite(s.scaleY)||s.scaleX<=0||s.scaleY<=0))errors.push('ROOF_SOURCE');if((roof.extensions||[]).length>8||depth>0&&roof.extensions?.length)errors.push('ROOF_COMPONENTS');else for(const child of roof.extensions||[]){if(child.levelId!==roof.levelId||child.buildingId!==roof.buildingId||child.id===roof.id||issues(child,{confirm:false,depth:depth+1}).length)errors.push('ROOF_COMPONENTS');}return [...new Set(errors)];}
 function clip(poly,a,b,c,side){const result=[],value=p=>side*(a*p[0]+b*p[1]+c);for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],u=value(p),v=value(q);if(u<=1e-9)result.push(p);if((u<-1e-9&&v>1e-9)||(u>1e-9&&v<-1e-9)){const t=u/(u-v);result.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}return result;}
 const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
 function supportingPlanes(roof){
  const result=[];for(const axis of ['x','y']){const profile=roof.profiles[axis];let previous=Infinity;for(let i=0;i<profile.length-1;i++){const a=profile[i],b=profile[i+1],slope=(b[1]-a[1])/(b[0]-a[0]);if(slope>previous+1e-8)return null;previous=slope;const plane=axis==='x'?[slope,0,a[1]-slope*a[0]]:[0,slope,a[1]-slope*a[0]];if(!result.some(p=>p.every((n,j)=>Math.abs(n-plane[j])<1e-8)))result.push(plane);}}return result;
 }
 function componentFaces(roof,center=[0,0]){if(issues(roof).length)return [];const result=[],xp=roof.profiles.x,yp=roof.profiles.y;
  const planes=supportingPlanes(roof);
  if(planes){
   // A concave silhouette bounds whole roof planes. Splitting it at every
   // profile coordinate created artificial seams and unstable painter order.
   for(let i=0;i<planes.length;i++){const [ax,ay,c]=planes[i];let p=[[xp[0][0],yp[0][0]],[xp.at(-1)[0],yp[0][0]],[xp.at(-1)[0],yp.at(-1)[0]],[xp[0][0],yp.at(-1)[0]]];for(let j=0;j<planes.length&&p.length>=3;j++){if(i===j)continue;const [bx,by,d]=planes[j];p=clip(p,ax-bx,ay-by,c-d,1);}if(p.length<3||area(p)<1e-8)continue;const n=[-ax,-ay,1],length=Math.hypot(...n);result.push({id:roof.id+':plane:'+i,roofId:roof.id,elementId:roof.id,levelId:roof.levelId,buildingId:roof.buildingId,type:'roof',role:'source-profile-roof',poly:p.map(([x,y])=>[x-center[0],y-center[1],ax*x+ay*y+c]),normal:n.map(v=>v/length),fillColor:/^#[0-9a-f]{6}$/i.test(roof.finish?.color||'')?roof.finish.color:'#6c716b',status:roof.status});}
  }else for(let i=0;i<xp.length-1;i++)for(let j=0;j<yp.length-1;j++){
   const [x0,zx0]=xp[i],[x1,zx1]=xp[i+1],[y0,zy0]=yp[j],[y1,zy1]=yp[j+1],ax=(zx1-zx0)/(x1-x0),bx=zx0-ax*x0,ay=(zy1-zy0)/(y1-y0),by=zy0-ay*y0,rectangle=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],same=Math.abs(ax)+Math.abs(ay)+Math.abs(bx-by)<1e-9;
   for(const dimension of ['x','y']){if(same&&dimension==='y')continue;const p=clip(rectangle,ax,-ay,bx-by,dimension==='x'?1:-1);if(p.length<3||area(p)<1e-8)continue;const n=dimension==='x'?[-ax,0,1]:[0,-ay,1],length=Math.hypot(...n),id=roof.id+':'+i+':'+j+':'+dimension;
    result.push({id,roofId:roof.id,elementId:roof.id,levelId:roof.levelId,buildingId:roof.buildingId,type:'roof',role:'source-profile-roof',poly:p.map(([x,y])=>[x-center[0],y-center[1],dimension==='x'?ax*x+bx:ay*y+by]),normal:n.map(v=>v/length),fillColor:/^#[0-9a-f]{6}$/i.test(roof.finish?.color||'')?roof.finish.color:'#6c716b',status:roof.status});
   }
  }
  if(finite(roof.fasciaBottom)){
   const evaluate=(profile,value)=>{const i=Math.max(0,Math.min(profile.length-2,profile.findIndex((p,i)=>i<profile.length-1&&value>=p[0]-1e-8&&value<=profile[i+1][0]+1e-8))),a=profile[i],b=profile[i+1];return a[1]+(b[1]-a[1])*(value-a[0])/(b[0]-a[0]);},edges=[['x-min',xp[0][0],yp,[ -1,0,0]],['x-max',xp.at(-1)[0],yp,[1,0,0]],['y-min',yp[0][0],xp,[0,-1,0]],['y-max',yp.at(-1)[0],xp,[0,1,0]]];
   for(const [edge,fixed,profile,normal]of edges){if(roof.joinedEdges?.includes(edge))continue;for(let i=0;i<profile.length-1;i++){const at=n=>edge[0]==='x'?[fixed,n]:[n,fixed],a=at(profile[i][0]),b=at(profile[i+1][0]),za=Math.min(evaluate(xp,a[0]),evaluate(yp,a[1])),zb=Math.min(evaluate(xp,b[0]),evaluate(yp,b[1])),bottom=roof.fasciaBottom;if(Math.min(za,zb)<=bottom+.002)continue;result.push({id:roof.id+':fascia:'+edge+':'+i,roofId:roof.id,elementId:roof.id,levelId:roof.levelId,buildingId:roof.buildingId,type:'fascia',role:'source-wall-to-eave-fascia',normal,poly:[[a[0]-center[0],a[1]-center[1],bottom],[b[0]-center[0],b[1]-center[1],bottom],[b[0]-center[0],b[1]-center[1],zb],[a[0]-center[0],a[1]-center[1],za]],fillColor:roof.finish?.fasciaColor||'#d5d8cf',status:roof.status,quantityStatus:'partial-unreviewed'});}}
  }
  return result;
 }
 function planeAt(face){const [a,b,c]=face.poly,n=face.normal;return [-(n[0]/n[2]),-(n[1]/n[2]),a[2]+n[0]/n[2]*a[0]+n[1]/n[2]*a[1]];}
 function uncovered(subject,sourcePlane,occluder,keepEqual){
  const bounds=occluder.poly.map(p=>p.slice(0,2)),orientation=Math.sign(bounds.reduce((s,a,i)=>{const b=bounds[(i+1)%bounds.length];return s+a[0]*b[1]-a[1]*b[0];},0));let inside=subject;const pieces=[];
  for(let i=0;i<bounds.length&&inside.length>=3;i++){const a=bounds[i],b=bounds[(i+1)%bounds.length],dx=b[0]-a[0],dy=b[1]-a[1],line=[-dy,dx,dy*a[0]-dx*a[1]],outside=clip(inside,...line,orientation);if(outside.length>=3&&area(outside)>1e-8)pieces.push(outside);inside=clip(inside,...line,-orientation);}
  if(inside.length>=3){const target=planeAt(occluder),same=sourcePlane.every((n,i)=>Math.abs(n-target[i])<1e-8),keep=same&&!keepEqual?[]:clip(inside,sourcePlane[0]-target[0],sourcePlane[1]-target[1],sourcePlane[2]-target[2],-1);if(keep.length>=3&&area(keep)>1e-8)pieces.push(keep);}return pieces;
 }
 function mergeCoplanar(faces){
  const groups=[],other=faces.filter(f=>f.type!=='roof');for(const face of faces.filter(f=>f.type==='roof')){const plane=planeAt(face);let group=groups.find(g=>g.plane.every((n,i)=>Math.abs(n-plane[i])<1e-7));if(!group){group={plane,faces:[]};groups.push(group);}group.faces.push(face);}
  for(const group of groups){if(group.faces.length===1){other.push(group.faces[0]);continue;}const key=p=>p.map(n=>Math.round(n*1e7)).join(','),vertices=new Map();for(const face of group.faces)for(const p of face.poly)vertices.set(key(p.slice(0,2)),p.slice(0,2));const points=[...vertices.values()],edges=new Map();
   const add=(a,b)=>{const ak=key(a),bk=key(b),edge=ak+'|'+bk,reverse=bk+'|'+ak;if(edges.has(reverse))edges.delete(reverse);else edges.set(edge,{a:ak,b:bk});};
   for(const face of group.faces)for(let i=0;i<face.poly.length;i++){const a=face.poly[i],b=face.poly[(i+1)%face.poly.length],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;if(len<1e-12)continue;const on=points.map(p=>({p,t:((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len})).filter(v=>v.t>=-1e-8&&v.t<=1+1e-8&&Math.abs((v.p[0]-a[0])*dy-(v.p[1]-a[1])*dx)<1e-7).sort((a,b)=>a.t-b.t);for(let j=0;j<on.length-1;j++)if(key(on[j].p)!==key(on[j+1].p))add(on[j].p,on[j+1].p);}
   const outgoing=new Map();let invalid=false;for(const edge of edges.values()){if(outgoing.has(edge.a)){invalid=true;break;}outgoing.set(edge.a,edge.b);}const loops=[];while(outgoing.size&&!invalid){const start=outgoing.keys().next().value,loop=[];let cursor=start;for(let count=0;count<=edges.size;count++){loop.push(vertices.get(cursor));const next=outgoing.get(cursor);outgoing.delete(cursor);if(next===start){loops.push(loop);break;}if(!next){invalid=true;break;}cursor=next;}}
   if(loops.some(p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0)<0))invalid=true;
   if(invalid||!loops.length){other.push(...group.faces);continue;}
   loops.forEach((poly,i)=>{const clean=poly.filter((p,j)=>{const a=poly[(j+poly.length-1)%poly.length],b=poly[(j+1)%poly.length];return Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>1e-7;});other.push({...group.faces[0],id:group.faces[0].id+':merged:'+i,suppressOutline:false,poly:clean.map(([x,y])=>[x,y,group.plane[0]*x+group.plane[1]*y+group.plane[2]])});});
  }return other;
 }
 function faces(roof,center=[0,0]){
  if(issues(roof).length)return [];const components=[roof,...(roof.extensions||[]).map(child=>({...child,status:roof.status,finish:roof.finish}))],groups=components.map(c=>componentFaces(c,center)),result=[];
  for(let i=0;i<groups.length;i++)for(const face of groups[i]){
   if(face.type!=='roof'){result.push(face);continue;}const plane=planeAt(face);let pieces=[face.poly.map(p=>p.slice(0,2))];for(let j=0;j<groups.length;j++){if(j===i)continue;for(const other of groups[j].filter(f=>f.type==='roof'))pieces=pieces.flatMap(p=>uncovered(p,plane,other,i>j));}
   pieces.forEach((p,k)=>result.push({...face,id:face.id+':visible:'+k,roofId:roof.id,elementId:roof.id,componentId:components[i].id,poly:p.map(([x,y])=>[x,y,plane[0]*x+plane[1]*y+plane[2]]),suppressOutline:groups.length>1}));
  }return mergeCoplanar(result);
 }
 return Object.freeze({version:1,issues,faces});
});
