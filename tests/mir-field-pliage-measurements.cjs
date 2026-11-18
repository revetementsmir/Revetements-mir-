'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../dist/production-model.js');

function profile(direction='left'){
 return M.buildProfile({kind:'profile',template:'custom',name:'L replié',unit:'in',
  segments:[{label:'A',length:5.5},{label:'B',length:3},{label:'C',length:1.5}],
  bends:[{mode:'signed',angle:90},{mode:'hem',angle:180,direction}],startAngle:-90,
  coloredFace:{segmentId:'A',side:'left'}});
}
function project(model,{mirror=1,degrees=0}={}){
 const angle=degrees*Math.PI/180;
 const points=model.pointsMM.map(([x,y])=>[mirror*x*Math.cos(angle)+y*Math.sin(angle),mirror*x*Math.sin(angle)-y*Math.cos(angle)]);
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
 return points.map(([x,y])=>[400+2.4*(x-cx),260+2.4*(y-cy)]);
}
function render(model,mapped,options={}){
 return M.profileDiagramContent(model,mapped,{section:M.profileSectionPath(mapped,model.bends),
  illustrative:true,showMeasurements:true,hemSideMarkers:true,...options});
}
function markers(svg){
 return [...svg.matchAll(/<g class="profile-side-marker"([^>]*)><g transform="translate\(([^,]+),([^)]*)\) rotate\(([^)]*)\)"><rect ([^>]*)\/><text [^>]*>([^<]*)<\/text>/g)].map(match=>{
  const attr=name=>match[1].match(new RegExp(name+'="([^"]+)"'))?.[1];
  return {label:attr('data-marker-label'),index:Number(attr('data-segment-index')),caption:match[6],
   center:[Number(match[2]),Number(match[3])],angle:Number(match[4]),
   width:Number(match[5].match(/width="([^"]+)"/)[1]),height:Number(match[5].match(/height="([^"]+)"/)[1]),
   anchor:[Number(attr('data-anchor-x')),Number(attr('data-anchor-y'))],
   start:[Number(attr('data-segment-start-x')),Number(attr('data-segment-start-y'))],
   end:[Number(attr('data-segment-end-x')),Number(attr('data-segment-end-y'))]};
 });
}
function outsidePair(marker,neighbour){
 const normal=[marker.start[1]-marker.end[1],marker.end[0]-marker.start[0]];
 const alongNormal=delta=>normal[0]*delta[0]+normal[1]*delta[1];
 return alongNormal(marker.center.map((v,i)=>v-marker.anchor[i]))*
  alongNormal(marker.anchor.map((v,i)=>v-neighbour.anchor[i]))>0;
}

test('C et B sont chacun du bon côté du repli, même si leurs milieux sont distants, tournés ou miroités',()=>{
 for(const direction of ['left','right'])for(const mirror of [-1,1])for(const degrees of [0,45,90,135,180,225,270,315]){
  const model=profile(direction),before=JSON.stringify(model),mapped=project(model,{mirror,degrees});
  assert.equal(model.valid,true);
  const result=markers(render(model,mapped)),b=result.find(x=>x.label==='B'),c=result.find(x=>x.label==='C');
  assert.equal(result.length,3);
  assert.ok(Math.hypot(c.anchor[0]-b.anchor[0],c.anchor[1]-b.anchor[1])>40,'cas hors de l’ancienne heuristique de proximité');
  assert.ok(outsidePair(c,b),JSON.stringify({direction,mirror,degrees,label:'C'}));
  assert.ok(outsidePair(b,c),JSON.stringify({direction,mirror,degrees,label:'B'}));
  assert.deepEqual(result.map(x=>x.caption),['A · 5 1/2 po','B · 3 po','C · 1 1/2 po']);
  assert.equal(JSON.stringify(model),before,'cotes, angles, face et géométrie métier inchangés');
 }
});

test('une cote de page conserve son propre côté même quand son voisin n’est pas annoté',()=>{
 const model=profile(),mapped=project(model),section=M.profileSectionPath(mapped,model.bends);
 const svg=render(model,mapped,{markerIndices:[2]}),result=markers(svg);
 assert.deepEqual(result.map(x=>x.label),['C']);
 assert.equal(result[0].caption,'C · 1 1/2 po');
 const b=section.segments[1],anchor=[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2];
 assert.ok(outsidePair(result[0],{anchor}));
 assert.ok(svg.includes('d="'+section.path+'"'),'le profil entier reste visible');
 assert.equal(markers(render(model,mapped,{markerIndices:[0,1,2]})).length,3);
});

test('les valeurs réelles sont indépendantes de l’ancienne indication de face peinte',()=>{
 const model=profile(),mapped=project(model),before=JSON.stringify(model);
 const measured=render(model,mapped),letters=render(model,mapped,{showMeasurements:false});
 assert.deepEqual(markers(measured).map(x=>x.caption),['A · 5 1/2 po','B · 3 po','C · 1 1/2 po']);
 assert.deepEqual(markers(letters).map(x=>x.caption),['A','B','C']);
 assert.doesNotMatch(measured,/profile-painted-(?:stripe|star)/,'pas de double face avec le nouveau liseré de l’app');
 const millimetres={...model,unit:'mm'};
 assert.deepEqual(markers(render(millimetres,mapped)).map(x=>x.caption),['A · 139.7 mm','B · 76.2 mm','C · 38.1 mm']);
 assert.equal(JSON.stringify(model),before);
});

test('les trois cotes restent dans le diagramme compact avec les retours des deux sens',()=>{
 for(const height of [160,180,200,220])for(const direction of ['left','right']){
  const model=profile(direction),scale=(height-120)/139.7;
  const mapped=model.pointsMM.map(([x,y])=>[160+(x-38.1)*scale,55-y*scale]);
  const svg=render(model,mapped,{horizontalBounds:[0,320],verticalBounds:[0,height]}),result=markers(svg);
  assert.equal(result.length,3,JSON.stringify({height,direction}));
  assert.match(svg,/font-size="15"/,'taille lisible dans un viewBox en pixels CSS');
  for(const marker of result){
   const angle=marker.angle*Math.PI/180,bw=Math.abs(Math.cos(angle))*marker.width+Math.abs(Math.sin(angle))*marker.height,
    bh=Math.abs(Math.sin(angle))*marker.width+Math.abs(Math.cos(angle))*marker.height;
   assert.ok(marker.center[0]-bw/2>=7.99&&marker.center[0]+bw/2<=312.01);
   assert.ok(marker.center[1]-bh/2>=7.99&&marker.center[1]+bh/2<=height-7.99);
  }
  assert.ok(outsidePair(result[1],result[2]));assert.ok(outsidePair(result[2],result[1]));
 }
});

test('sans opt-in les sorties historiques et le mode illustratif restent strictement identiques',()=>{
 const model=profile(),mapped=project(model);
 for(const illustrative of [false,true]){
  const options={illustrative,paintedMarker:'star',highContrast:true};
  const previous=M.profileDiagramContent(model,mapped,options);
  assert.equal(M.profileDiagramContent(model,mapped,{...options,showMeasurements:!illustrative,hemSideMarkers:false}),previous);
 }
});
