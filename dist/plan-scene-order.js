/* Orthographic occlusion for the shared level scene. A face centroid cannot
 * decide which surface covers another at their actual screen intersection. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MIRSceneOrder=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
 function overlap(a,b){let result=a;const sign=Math.sign(area(b));for(let i=0;i<b.length&&result.length;i++){const c=b[i],d=b[(i+1)%b.length],side=p=>sign*((d[0]-c[0])*(p[1]-c[1])-(d[1]-c[1])*(p[0]-c[0])),next=[];for(let j=0;j<result.length;j++){const p=result[j],q=result[(j+1)%result.length],u=side(p),v=side(q);if(u>=-1e-8)next.push(p);if(u*v<0){const t=u/(u-v);next.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}result=next;}return result.length>=3&&Math.abs(area(result))>1e-7?result:[];}
 function depthPlane(points,depths){const a=points[0];for(let i=1;i<points.length-1;i++){const b=points[i],c=points[i+1],dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1],den=dx*ey-dy*ex;if(Math.abs(den)<1e-10)continue;const dz=depths[i]-depths[0],ez=depths[i+1]-depths[0],x=(dz*ey-ez*dy)/den,y=(dx*ez-ex*dz)/den;return p=>depths[0]+x*(p[0]-a[0])+y*(p[1]-a[1]);}return null;}
 function convexParts(points){
  const sign=Math.sign(area(points)),cross=(a,b,c)=>sign*((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]));if(points.every((p,i)=>cross(points[(i+points.length-1)%points.length],p,points[(i+1)%points.length])>=-1e-8))return [points];
  const remaining=points.slice(),triangles=[];while(remaining.length>3){let found=false;for(let i=0;i<remaining.length;i++){const a=remaining[(i+remaining.length-1)%remaining.length],b=remaining[i],c=remaining[(i+1)%remaining.length];if(cross(a,b,c)<=1e-8)continue;if(remaining.some(p=>p!==a&&p!==b&&p!==c&&cross(a,b,p)>=-1e-8&&cross(b,c,p)>=-1e-8&&cross(c,a,p)>=-1e-8))continue;triangles.push([a,b,c]);remaining.splice(i,1);found=true;break;}if(!found)return [];}
  if(remaining.length===3)triangles.push(remaining);return triangles;
 }
 function order(faces,{project,depth}){
  const rows=faces.map((face,index)=>{const points=face.poly.map(project),z=depthPlane(points,face.poly.map(depth));return {face,index,points,parts:convexParts(points),z,bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))],after:new Set(),before:0};});
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
   const a=rows[i],b=rows[j];if(!a.z||!b.z||a.bounds[2]<=b.bounds[0]||b.bounds[2]<=a.bounds[0]||a.bounds[3]<=b.bounds[1]||b.bounds[3]<=a.bounds[1])continue;const intersection=a.parts.flatMap(p=>b.parts.flatMap(q=>overlap(p,q)));if(!intersection.length)continue;
   const differences=intersection.map(p=>a.z(p)-b.z(p)),lo=Math.min(...differences),hi=Math.max(...differences);let from,to;if(lo>=-1e-7&&hi>1e-7){from=b;to=a;}else if(hi<=1e-7&&lo<-1e-7){from=a;to=b;}else continue;
   if(!from.after.has(to.index)){from.after.add(to.index);to.before++;}
  }
  const result=[],remaining=new Set(rows.map(r=>r.index));while(remaining.size){const available=rows.find(r=>remaining.has(r.index)&&r.before===0);if(!available){for(const i of remaining)result.push(rows[i].face);break;}result.push(available.face);remaining.delete(available.index);for(const i of available.after)rows[i].before--;}
  return result;
 }
 return Object.freeze({order,overlap,depthPlane,convexParts});
});
