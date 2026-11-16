'use strict';
const M=require('../../dist/plan-level-model.js'),I=require('../../dist/plan-view-inventory.js');
function fixture(){
 const records=[{page:1,name:'Plan RDC Maison',kind:'floor'},{page:2,name:'Plan étage Maison',kind:'floor'},{page:3,name:'Élévation avant Maison',kind:'elevation',direction:'front'},{page:4,name:'Plan RDC Cabanon',kind:'floor'}].map(r=>({...r,sourceWidth:1000,sourceHeight:800,sourceCrop:[0,0,1000,800],sourceFrame:{pdfToRaster:[1,0,0,-1,0,800],cropToRaster:[1,0,0,1,0,0],rasterSize:[1000,800]},calibration:{status:'unresolved'}}));
 let inventory=I.create(records,{filename:'synthetic-s2.pdf',bytes:1000,sha256:'synthetic-only'});inventory.activeBuildingId='house';
 for(const levelId of ['house:ground','house:upper']){
  const l=inventory.levels.find(l=>l.id===levelId),view=inventory.views.find(v=>v.levelId===l.sourceLevel&&v.buildingId==='house'),d=M.draftFor(view,l),points=l.sourceLevel==='upper'?[[0,0],[12,0],[12,7],[0,7]]:[[0,0],[12,0],[12,10],[9,10],[9,8],[7,8],[7,10],[4,10],[4,7],[2,7],[2,10],[0,10]];
  d.points=points.map(([x,y],i)=>({id:'p'+i,xy:[120+x*50,680-y*50]}));d.reference={value:12,anchors:[[120,680],[720,680]],kind:'written',status:'confirmed',sourceViewId:view.id,label:'Synthetic 12 m reference'};d.height={value:3,kind:'written',status:'confirmed',sourceViewId:inventory.views[2].id,label:'Synthetic 3m height'};d.base={value:l.sourceLevel==='upper'?3:0,kind:'user-measurement',status:'confirmed'};d.alignment={origin:[120,680],offset:[0,0],rotationDegrees:0,status:'confirmed'};inventory=M.commitContour(inventory,l.id,d);
 }
 return inventory;
}
module.exports={fixture};
