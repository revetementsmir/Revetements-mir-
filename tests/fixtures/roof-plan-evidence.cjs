'use strict';
// Invented orthographic drawing, labelled grids and dimensions. No customer
// plan, screenshot, OCR output, project coordinates or PDF is retained here.
const P=require('../../dist/plan-roof-plan-evidence.js'),R=require('../../dist/plan-reconstruction.js');
function makeRoofPlanScene({directions=['left'],hips=true,colour=[0,0,0],sideRidges=true}={}){
 const width=800,height=600,drawings={};
 function drawing(kind,id,direction){
  const data=new Uint8ClampedArray(width*height*4).fill(255),rows=[],view={id,kind,direction,buildingId:'house',levelId:kind==='floor'?'upper':null,page:1+Object.keys(drawings).length,fileId:'synthetic-drawings',frame:{rasterSize:[width,height]},payload:{sourceWidth:width,sourceHeight:height,drawingReadings:{rows}}};
  const dot=(x,y,c=[0,0,0])=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<width&&y<height)data.set([...c,255],(y*width+x)*4);};
  const line=(a,b,c=[0,0,0])=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++)dot(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,c);};
  if(['floor','roof'].includes(kind))for(const [label,x,y] of [...['1','2','3','4'].map((s,i)=>[s,170+i*150,65]),['A',90,235],['B',90,485]]){for(let t=0;t<360;t++)for(const dr of [-1,0,1])dot(x+Math.cos(t*Math.PI/180)*(17+dr),y+Math.sin(t*Math.PI/180)*(17+dr));rows.push({text:label,box:[x-5,y-5,x+5,y+5],confidence:97});}
  return drawings[id]={view,image:{width,height,data},dot,line};
 }
 const floor=drawing('floor','floor'),plan=drawing('roof','roof-plan');
 const reviewed={version:1,contourId:'source-contour',sourceViewId:'floor',levelId:'upper',buildingId:'house',status:'proposed',points:[[200,450],[600,450],[600,150],[200,150]].map((xy,i)=>({id:'point-'+i,xy})),reference:{sourceViewId:'floor',sourceFrame:structuredClone(floor.view.frame),value:4,anchors:[[200,450],[600,450]],kind:'written-dimension',status:'proposed'},alignment:{origin:[0,600],offset:[0,0],rotationDegrees:0},height:{value:3,kind:'written-dimension',status:'proposed'},base:{value:0,kind:'written-datum',status:'proposed'}};
 const level={id:'upper',buildingId:'house',sourceLevel:'upper',contours:[reviewed],reconstruction:{status:'automatic-proposal'}},proposal={levelId:'upper',buildingId:'house',sourceViewId:'floor',views:[]};
 const transforms={front:(u,z)=>[u*100,600-z*100],back:(u,z)=>[800-u*100,600-z*100],right:(u,z)=>[u*100,600-z*100],left:(u,z)=>[600-u*100,600-z*100]};
 for(const direction of ['front','back','left','right']){const d=drawing('elevation',direction,direction),box=['front','back'].includes(direction)?[200,300,400,300]:[150,300,300,300];proposal.views.push({viewId:direction,direction,envelope:{status:'proposed',box,sourceViewId:direction,sourceFrame:structuredClone(d.view.frame)},supportY:300,guides:[{sourceViewId:direction,sourceFrame:structuredClone(d.view.frame),levelHint:'upper',y:600,confidence:98}]});}
 const parent={version:1,id:'roof:upper:main',levelId:'upper',buildingId:'house',status:'proposed',profiles:{x:[[2,3],[4,5],[6,3]],y:[[1.5,3],[3,4.5],[4.5,3]]},sources:[{sourceViewId:'front',sourceFrame:structuredClone(drawings.front.view.frame),axis:'x',anchors:[[200,300],[400,100],[600,300]],scaleX:.01,scaleY:.01},{sourceViewId:'right',sourceFrame:structuredClone(drawings.right.view.frame),axis:'y',anchors:[[150,300],[300,150],[450,300]],scaleX:.01,scaleY:.01}],complete:false,quantityStatus:'partial-unreviewed'};
 const specs={left:{normal:0,outer:1.4,inner:2,lo:2.5,hi:3.5,ridge:1.9,join:2.5},right:{normal:0,outer:6.6,inner:6,lo:1.8,hi:2.8,ridge:6.1,join:5.5},back:{normal:1,outer:5.1,inner:4.5,lo:3.8,hi:4.8,ridge:4.6,join:4},front:{normal:1,outer:.9,inner:1.5,lo:2.6,hi:3.6,ridge:1.4,join:2}};
 const planPoint=([x,y])=>[x*100,600-y*100],outline=[[2,1.5],[6,1.5],[6,4.5],[2,4.5]];for(let i=0;i<4;i++)plan.line(planPoint(outline[i]),planPoint(outline[(i+1)%4]));
 for(const direction of directions){const s=specs[direction],mid=(s.lo+s.hi)/2,xy=(n,t)=>s.normal===0?[n,t]:[t,n],a=planPoint(xy(s.outer,s.lo)),b=planPoint(xy(s.outer,s.hi)),c=planPoint(xy(s.inner,s.hi)),e=planPoint(xy(s.inner,s.lo)),node=planPoint(xy(s.ridge,mid));for(const [p,q]of [[a,b],[a,e],[b,c]])plan.line(p,q,colour);
  if(hips)for(const [p,q]of [[a,node],[b,node],[node,planPoint(xy(s.join,mid))]])plan.line(p,q,colour);
  const primary=drawings[direction],project=transforms[direction];for(const [p,q]of [[[s.lo,3],[mid,3.5]],[[mid,3.5],[s.hi,3]],[[s.lo,3],[s.hi,3]]])primary.line(project(...p),project(...q));
  for(const orthogonal of s.normal===0?['front','back']:['left','right']){const side=drawings[orthogonal],project=transforms[orthogonal];side.line(project(s.outer,3),project(s.ridge,3.5));side.line(project(s.outer,3),project(s.join,3));if(sideRidges)side.line(project(s.ridge,3.5),project(s.join,3.5));}
 }
 const inventory={views:Object.values(drawings).map(d=>d.view),levels:[level]},images=Object.fromEntries(Object.entries(drawings).map(([id,d])=>[id,d.image]));
 return {inventory,reviewed,proposal,images,parent,drawings,level};
}
function makeProposedRoofScene(options){const scene=makeRoofPlanScene(options),result=P.propose(scene.parent,scene.proposal,scene.inventory,scene.reviewed,scene.images,{registerElevation:R.elevationRegistration}),roof={...structuredClone(scene.parent),extensions:result.extensions,roofPlanEvidence:result.evidence};return {...scene,result,roof};}
function moveGridReadingsToRetries(inventory){
 const readings=[];
 for(const view of inventory.views.filter(v=>['floor','roof'].includes(v.kind))){
  for(const row of view.payload.drawingReadings.rows){const [x,y]=[(row.box[0]+row.box[2])/2,(row.box[1]+row.box[3])/2];readings.push({...structuredClone(row),sourceViewId:view.id,source:'ocr-local-grid-bubble',labelStatus:'proposed',retry:{purpose:'source-raster-grid-bubble',sourceViewId:view.id,sourceFileId:view.fileId,sourcePage:view.page,sourceFrame:structuredClone(view.frame),region:[x-20,y-20,40,40],gridCircle:{kind:/^\d+$/.test(row.text)?'number':'letter',center:[x,y],radius:17,ringSupport:1},labelConflict:false,attempts:[{token:row.text,confidence:row.confidence,usable:true,psm:10}]}});}
  view.payload.drawingReadings.rows=[];
 }
 for(const level of inventory.levels){level.reconstruction||={status:'automatic-proposal'};level.reconstruction.proposal||={};level.reconstruction.proposal.localReadingRetries=structuredClone(readings);}
 return readings;
}
module.exports={makeRoofPlanScene,makeProposedRoofScene,moveGridReadingsToRetries};
