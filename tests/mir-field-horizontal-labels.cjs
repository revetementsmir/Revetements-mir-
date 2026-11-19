'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../dist/production-model.js');

function screenshotProfile(){
 return M.buildProfile({kind:'profile',template:'custom',name:'Profil dessiné — deux replis',unit:'in',
  segments:[3,1,.5,.5,2.25,.5].map((length,index)=>({label:String.fromCharCode(65+index),length})),
  bends:[{mode:'signed',angle:-90},{mode:'interior',angle:117.19579999,direction:'left'},
   {mode:'hem',direction:'left'},{mode:'signed',angle:-62.80420001},{mode:'hem',direction:'left'}],startAngle:-90});
}
function fit(model,width,height,top,bottom,mirror=1,degrees=0){
 const rad=degrees*Math.PI/180,points=model.pointsMM.map(([x,y])=>[mirror*x*Math.cos(rad)+y*Math.sin(rad),mirror*x*Math.sin(rad)-y*Math.cos(rad)]);
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const scale=Math.min(Math.max(24,width-144)/Math.max(1,maxX-minX),Math.max(24,height-top-bottom)/Math.max(1,maxY-minY));
 return points.map(([x,y])=>[width/2+(x-(minX+maxX)/2)*scale,(height+top-bottom)/2+(y-(minY+maxY)/2)*scale]);
}
function render(model,{width=340,height=180,indices=[0,1,2],mirror=1,degrees=0}={}){
 // Same finite space budget as the personal screen; assertions below inspect
 // actual SVG geometry, independently of candidate ordering or placement cost.
 let last;
 for(const [top,bottom] of [[12,12],[12,24],[24,12],[12,52],[52,12],[12,62],[62,12],[55,65]]){
  const mapped=fit(model,width,height,top,bottom,mirror,degrees),section=M.profileSectionPath(mapped,model.bends);
  try{return{width,height,section,svg:M.profileDiagramContent(model,mapped,{section,
   illustrative:true,showMeasurements:true,hemSideMarkers:true,horizontalMeasurements:true,
   markerIndices:indices,horizontalBounds:[0,width],verticalBounds:[0,height]})};}
  catch(error){if(!error.message.startsWith('Cotation technique sans espace'))throw error;last=error;}
 }
 throw last;
}
function attr(source,name){return source.match(new RegExp(name+'="([^"]+)"'))?.[1];}
function annotations(svg){
 return [...svg.matchAll(/<g class="profile-side-marker"([^>]*)><g transform="translate\(([^,]+),([^)]*)\) rotate\(([^)]*)\)"><rect ([^>]*)\/><text [^>]*>([^<]*)<\/text>/g)].map(match=>{
  const x=Number(match[2]),y=Number(match[3]),w=Number(attr(match[5],'width')),h=Number(attr(match[5],'height'));
  return{index:Number(attr(match[1],'data-segment-index')),label:attr(match[1],'data-marker-label'),caption:match[6],rotation:Number(match[4]),
   x:x-w/2,y:y-h/2,w,h,center:[x,y],anchor:[Number(attr(match[1],'data-anchor-x')),Number(attr(match[1],'data-anchor-y'))]};
 });
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function crosses([a,b],[c,d]){return cross(a,b,c)*cross(a,b,d)<-1e-7&&cross(c,d,a)*cross(c,d,b)<-1e-7;}
function inside(p,box,pad=0){return p[0]>=box.x-pad&&p[0]<=box.x+box.w+pad&&p[1]>=box.y-pad&&p[1]<=box.y+box.h+pad;}
function boxEdges(box,pad=0){const a=[box.x-pad,box.y-pad],b=[box.x+box.w+pad,box.y-pad],c=[box.x+box.w+pad,box.y+box.h+pad],d=[box.x-pad,box.y+box.h+pad];return[[a,b],[b,c],[c,d],[d,a]];}
function meetsBox(line,box,pad=0){return line.some(p=>inside(p,box,pad))||boxEdges(box,pad).some(edge=>crosses(line,edge));}
function hemArcs(section,model){
 const arcs=[];
 for(let i=0;i<section.segments.length-1;i++){
  if(model.bends[i]?.mode!=='hem')continue;
  const [a,end]=section.segments[i],start=section.segments[i+1][0],center=end.map((v,k)=>(v+start[k])/2),r=distance(end,start)/2,t=end.map((v,k)=>(v-a[k])/distance(end,a)),n=end.map((v,k)=>(v-center[k])/r);
  const samples=Array.from({length:97},(_,j)=>center.map((v,k)=>v+r*(n[k]*Math.cos(j*Math.PI/96)+t[k]*Math.sin(j*Math.PI/96))));
  for(let j=1;j<samples.length;j++)arcs.push([samples[j-1],samples[j]]);
 }
 return arcs;
}
function verify(result,model,indices){
 const {width,height,section,svg}=result,labels=annotations(svg),arcs=hemArcs(section,model);
 const leaders=[...svg.matchAll(/<path class="profile-measure-leader"[^>]*data-segment-index="(\d+)" d="M([^L]+)L([^"]+)"/g)].map(match=>({index:Number(match[1]),line:[match[2],match[3]].map(p=>p.split(',').map(Number))}));
 assert.deepEqual(labels.map(x=>x.index),indices,'each visible page keeps the correct physical side identities');
 assert.equal(leaders.length,indices.length,'one unambiguous link for each displayed measurement');
 assert.ok(svg.includes('d="'+section.path+'"'),'the physical profile path is unchanged');
 for(const label of labels){
  assert.equal(label.rotation,0,'measurements read horizontally');
  assert.equal(label.caption,model.segments[label.index].label+' · '+M.formatMeasurement(model.segments[label.index].lengthMM,model.unit));
  assert.ok(label.x>=7.99&&label.y>=7.99&&label.x+label.w<=width-7.99&&label.y+label.h<=height-7.99,'caption stays fully in the viewport');
  const segment=section.segments[label.index],mid=segment[0].map((v,k)=>(v+segment[1][k])/2);
  assert.ok(distance(label.anchor,mid)<.001,'label points to its own side, including an offset hem');
  for(const side of section.segments.concat(arcs))assert.ok(!meetsBox(side,label,2.5),'caption clears the full profile and rounded hems');
  for(const other of labels)if(other.index>label.index)assert.ok(label.x+label.w+5.9<=other.x||other.x+other.w+5.9<=label.x||label.y+label.h+5.9<=other.y||other.y+other.h+5.9<=label.y,'captions do not overlap');
  const leader=leaders.find(x=>x.index===label.index).line;
  assert.ok(distance(leader[1],mid)<.001,'leader ends on the correct physical side');
  assert.ok(!inside(leader[0],label),'leader starts outside its text, not under the caption');
  for(const [index,side] of section.segments.entries())if(index!==label.index)assert.ok(!crosses(leader,side),'leader does not cross another side');
  for(const arc of arcs)assert.ok(!crosses(leader,arc),'leader does not cross a hem arc');
  for(const other of labels)if(other.index!==label.index)assert.ok(!meetsBox(leader,other,2.5),'leader does not pass through another caption');
  for(const other of leaders)if(other.index>label.index)assert.ok(!crosses(leader,other.line),'leaders do not cross each other');
  for(const neighbour of [label.index-1,label.index+1]){
   const bend=model.bends[Math.min(label.index,neighbour)];
   if(neighbour<0||!section.segments[neighbour]||bend?.mode!=='hem')continue;
   const pair=section.segments[neighbour],otherMid=pair[0].map((v,k)=>(v+pair[1][k])/2),normal=[segment[0][1]-segment[1][1],segment[1][0]-segment[0][0]];
   const dot=v=>normal[0]*v[0]+normal[1]*v[1];
   assert.ok(dot(label.center.map((v,k)=>v-mid[k]))*dot(mid.map((v,k)=>v-otherMid[k]))>0,'both faces of a hem remain labelled on their own outer side');
  }
 }
}

test('captured short diagonal with 117° bend and two hems: horizontal, distinct, accurate labels across measurement pages',()=>{
 const model=screenshotProfile(),before=JSON.stringify(model);assert.ok(model.valid);
 for(const [width,height] of [[320,140],[340,180],[377,156],[377,200],[600,280]])for(const indices of [[0,1,2],[2,3,4],[4,5]]){
  verify(render(model,{width,height,indices}),model,indices);
 }
 assert.equal(JSON.stringify(model),before,'entered lengths, exact angles, units and physical points are never changed by labels');
});
test('horizontal field labels keep their identities and hem sides through rotations and mirrors',()=>{
 const model=screenshotProfile(),before=JSON.stringify(model);
 for(const mirror of [-1,1])for(const degrees of [0,45,90,135,180,225,270,315])for(const indices of [[0,1,2],[2,3,4],[4,5]]){
  verify(render(model,{width:600,height:360,indices,mirror,degrees}),model,indices);
 }
 assert.equal(JSON.stringify(model),before);
});
test('fractional inches and millimetres remain actual values; public/default technical presentation is unchanged',()=>{
 const model=screenshotProfile(),mapped=fit(model,800,520,55,65);
 const options={section:M.profileSectionPath(mapped,model.bends),markerIndices:[0,1,2],horizontalBounds:[0,800],verticalBounds:[0,520]};
 const standard=M.profileDiagramContent(model,mapped,options);
 assert.equal(M.profileDiagramContent(model,mapped,{...options,horizontalMeasurements:false}),standard);
 assert.ok(annotations(standard).some(x=>x.rotation!==0),'public technical labels retain their existing orientation');
 const inches=render(model);assert.match(inches.svg,/>C · 1\/2 po<\/text>/);verify(inches,model,[0,1,2]);
 const metric={...model,unit:'mm'},millimetres=render(metric,{width:377,height:200});verify(millimetres,metric,[0,1,2]);
 assert.match(millimetres.svg,/>C · 12\.7 mm<\/text>/);
});
