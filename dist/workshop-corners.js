/* Physical building corners, counted once; proposed joints remain a workshop detail. */
(function(factory){
 const api=factory(typeof module==='object'&&module.exports?require('./takeoff-engine.js'):window.MIRTakeoff);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(typeof window==='object')window.MIRCorners=api;
})(function(E){
 'use strict';
 const finite=n=>typeof n==='number'&&Number.isFinite(n),positive=n=>finite(n)&&n>0;
 const bounds=p=>[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];
 function continuousCorners(rows){
  const buckets=new Map(),out=[];
  for(const r of rows){const s=r.selection||{},key=JSON.stringify([r.physicalId,r.kind,s.brand||null,s.materialId||null,s.colorId||s.colorName||s.color||null]);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r);}
  for(const group of buckets.values()){
   group.sort((a,b)=>(a.points?Math.min(...a.points.map(p=>p[1])):Infinity)-(b.points?Math.min(...b.points.map(p=>p[1])):Infinity));let prev=null;
   for(const source of group){const r={...source,points:source.points?.map(p=>p.slice()).sort((a,b)=>a[1]-b[1])};
    if(prev?.points?.length===2&&r.points?.length===2&&Math.abs(prev.points[1][0]-r.points[0][0])<1e-6&&Math.abs(prev.points[1][1]-r.points[0][1])<1e-6){prev.points[1]=r.points[1];prev.lengthFt=finite(prev.lengthFt)&&finite(r.lengthFt)?prev.lengthFt+r.lengthFt:null;prev.source='Coin continu de même finition; les frontières entre zones ne créent pas de coupures.';}
    else{out.push(r);prev=r;}
   }
  }return out;
 }
 function propose({faces=[],geometry={},returnHeightFt=null}={}){
  const rows=[],pending=[];
  if(!(positive(geometry.buildingWidthFt)&&positive(geometry.buildingDepthFt)))return{rows,pending:[{id:'footprint',message:'Coins à relever : l’emprise du bâtiment n’est pas renseignée. Ajoutez les coins connus.'}]};
  for(const faceKey of ['front','back']){
   const f=faces.find(f=>f.key===faceKey),contours=(f?.zones||[]).filter(z=>!z.decorationType&&!String(z.id).startsWith('retour_')&&z.polygon?.length>=3);
   const physical=contours.filter(z=>!z.parent&&!z.custom),zones=contours.filter(z=>z.kind!=='masonry');
   if(!f||!physical.length){pending.push({id:faceKey,message:'Les deux coins de la façade '+(f?.name||faceKey)+' restent à relever.'});continue;}
   const all=bounds(physical.flatMap(z=>z.polygon));
   // Study matching only: no more than 1/4 in AND 2 native pixels; do not move the source line.
   const edgeTolerance=positive(f.feetPerPixel)?Math.min(2,.25/(12*f.feetPerPixel)):1e-6;
   for(const side of ['left','right']){
    const x=all[side==='left'?0:2],physicalId='corner:'+faceKey+':'+side;let found=false;
    for(const z of zones){const b=bounds(z.polygon),edge=b[side==='left'?0:2];if(Math.abs(edge-x)>edgeTolerance+1e-6)continue;
     const clipped=E.clipLineToZone(f,z.id,'vertical',side==='left'?0:1);
     for(const [index,points] of (clipped.segments||[]).entries()){
      const lengthFt=positive(f.feetPerPixel)?E.polylineLength(points)*f.feetPerPixel:null;if(lengthFt===0)continue;
      found=true;rows.push({id:physicalId+':'+z.id+':'+index,physicalId,face:faceKey,name:f.name+' · coin '+(side==='left'?'gauche':'droit'),kind:'outside',points,lengthFt,count:1,selection:z.selection||{},proposed:true,source:Math.abs(edge-x)>1e-6?'Bords rapprochés sur le tracé d’étude (écart ≤ ¼ po et 2 pixels); alignement physique à confirmer.':'Bord extérieur du parement sur cette façade; le même coin n’est pas ajouté sur la façade voisine.'});
     }
    }
    const masonryEdge=physical.some(z=>z.kind==='masonry'&&Math.abs(bounds(z.polygon)[side==='left'?0:2]-x)<=1e-6);
    if(!found&&!masonryEdge)pending.push({id:physicalId,message:'Coin '+(side==='left'?'gauche':'droit')+' de '+f.name+' : tracé du parement à préciser.'});
   }
  }
  if(positive(geometry.recessWidthFt)&&positive(geometry.recessDepthFt)){
   const returns=faces.find(f=>f.key==='returns');
   for(const side of ['left','right']){const z=returns?.zones?.find(z=>z.id==='return-'+side),b=z?.polygon?.length?bounds(z.polygon):null;if(z?.kind==='masonry')continue;
    for(const kind of ['outside','inside']){const id='corner:recess:'+side+':'+kind;rows.push({id,physicalId:id,face:'returns',name:'Retrait · '+(side==='left'?'gauche':'droit')+' · '+(kind==='inside'?'coin intérieur':'coin extérieur'),kind,lengthFt:positive(returnHeightFt)?returnHeightFt:null,count:1,points:b?[[kind==='outside'?b[0]:b[2],b[1]],[kind==='outside'?b[0]:b[2],b[3]]]:undefined,selection:z?.selection||{},proposed:true,source:'Coin physique du retrait; hauteur revêtue du retour, distincte du solage. Emplacement et finition à confirmer.'});}
   }
  }return{rows:continuousCorners(rows),pending};
 }
 function calculate(rows=[],{overlapIn=0,pendingSources=[]}={}){
  const overlapOK=finite(overlapIn)&&overlapIn>=0&&overlapIn<120,groups=new Map(),warnings=[];
  if(!overlapOK)warnings.push('Le recouvrement de coin doit être connu, positif ou nul et inférieur à 120 po.');
  const results=rows.filter(r=>r.enabled!==false).map(r=>{
   const count=Number.isInteger(r.count)&&r.count>0&&r.count<=1000?r.count:null,lengthIn=finite(r.lengthFt)&&r.lengthFt>=0&&r.lengthFt<=1000?r.lengthFt*12:null;
   let complete=count!==null&&lengthIn!==null&&overlapOK;
   let each=complete?(lengthIn===0?0:lengthIn<=120+1e-8?1:Math.ceil((lengthIn-overlapIn-1e-8)/(120-overlapIn))):null;
   if(each>1000){each=null;complete=false;warnings.push('Le recouvrement demandé produit trop de jonctions pour '+(r.name||'ce coin')+'. Vérifiez la cote et le détail de pose.');}
   const stockCount=each===null?null:each*count,joints=each===null?null:Math.max(0,each-1)*count,cutsIn=[];
   if(each){let remaining=lengthIn;for(let i=0;i<each;i++){const len=i===each-1?remaining:120;cutsIn.push(len);remaining-=len;if(i<each-1)remaining+=overlapIn;}}
   const result={...r,count,lengthIn,lengthFt:lengthIn===null?null:lengthIn/12,stockIn:120,stockCount,jointCount:joints,cutsIn,complete,overlapIn:overlapOK?overlapIn:null};
   const c=r.selection||{},key=JSON.stringify([r.kind,c.brand||null,c.materialId||null,c.colorId||c.colorName||null]);
   if(!groups.has(key))groups.set(key,{key,kind:r.kind,selection:c,items:[],knownStockCount:0,knownLengthFt:0,complete:true});
   const group=groups.get(key);group.items.push(result);group.complete&&=complete;if(stockCount!==null)group.knownStockCount+=stockCount;if(lengthIn!==null&&count!==null)group.knownLengthFt+=lengthIn*count/12;return result;
  });
  for(const g of groups.values()){g.stockCount=g.complete?g.knownStockCount:null;g.lengthFt=g.complete?g.knownLengthFt:null;}
  if(results.some(r=>r.jointCount>0))warnings.push('Coins de plus de 10 pi : les longueurs nécessaires sont comptées. Validez les jonctions et leur recouvrement avant de couper.');
  if(results.some(r=>r.proposed))warnings.push('Coins proposés sur une emprise rectangulaire avec retrait : confirmer le plan de solage, les hauteurs, les parties en brique et les autres décrochements.');
  const complete=results.every(r=>r.complete)&&!pendingSources.length,physical=new Map();for(const r of results){const id=r.physicalId||r.id;physical.set(id,Math.max(physical.get(id)||0,r.count||1));}
  return{version:'1.0.0',rows:results,groups:[...groups.values()],pendingSources,warnings,complete,physicalCornerCount:[...physical.values()].reduce((n,q)=>n+q,0),knownStockCount:results.reduce((n,r)=>n+(r.stockCount||0),0),stockCount:complete?results.reduce((n,r)=>n+r.stockCount,0):null,knownLengthFt:results.reduce((n,r)=>n+(r.lengthFt??0)*(r.count??0),0),stockIn:120,offcutsShared:false};
 }
 return{propose,calculate,version:'1.0.0'};
});
