'use strict';
const {fixture}=require('./mir-studio-s2-model.cjs');
const {blank,line,rectangle}=require('./mir-studio-entry-fixture.cjs');
// Synthetic metres/pixels only. The plan shows a complete 0.8 m projection;
// side views expose only its outer 0.3 m beyond an opaque wall projection.
function flatEntryFixture({left=true,leader=true,footprint=true,fascia=true,door=true,side=true,sideShift=0,planLabel=true,mask=null}={}){
 const inventory=fixture(),front=inventory.views.find(v=>v.direction==='front'),levels=inventory.levels.filter(l=>l.buildingId==='house');
 for(const level of levels){delete level.geometryRevision;level.reconstruction={status:'automatic-proposal'};level.wallOpenings=[];for(const c of level.contours){c.status='proposed';for(const key of ['reference','height','base','alignment'])c[key].status='proposed';}}
 const reviewed=levels.find(l=>l.sourceLevel==='upper').contours[0],plan=inventory.views.find(v=>v.id===reviewed.sourceViewId),images={[front.id]:blank(),[plan.id]:blank()},views=[];
 front.payload.drawingReadings={rows:[]};plan.payload.drawingReadings={rows:planLabel?[{text:'Flat roof with membrane',box:[650,735,920,746],confidence:100,source:'pdf-text'},{text:'Slope for drainage',box:[650,752,890,764],confidence:100,source:'pdf-text'}]:[]};
 const info=view=>({viewId:view.id,direction:view.direction,envelope:{status:'proposed',box:view.direction==='front'?[100,100,600,600]:[100,100,350,600],sourceViewId:view.id,sourceFrame:structuredClone(view.frame),occlusions:view===front&&mask?[mask]:[]},supportY:100,guides:[{levelHint:'upper',y:400,confidence:100,label:'Synthetic upper floor'}]});
 views.push(info(front));
 if(footprint)rectangle(images[plan.id],320,680,220,40);
 if(leader){line(images[plan.id],644,742,600,742);line(images[plan.id],600,742,500,700);line(images[plan.id],500,700,507,700);line(images[plan.id],500,700,505,706);}
 if(fascia){rectangle(images[front.id],300,370,220,40);line(images[front.id],300,390,520,390);}
 if(door){const im=images[front.id];for(let y=440;y<=697;y++)for(let x=350;x<=470;x++)im.data.set([160,160,160,255],(y*im.width+x)*4);rectangle(im,347,437,126,263);}
 for(const direction of left?['right','left']:['right']){
  const view=structuredClone(front);view.id='synthetic-flat-'+direction;view.direction=direction;view.payload.drawingReadings={rows:[]};inventory.views.push(view);images[view.id]=blank();views.push(info(view));
  if(side){const im=images[view.id],right=direction==='right',wall=right?100:450,outside=wall+(right?-15:15),lower=outside+(right?2:-2),top=370+(direction==='left'?sideShift:0),bottom=410+(direction==='left'?sideShift:0);
   line(im,wall,310,wall,600);line(im,wall,top,outside,top);line(im,outside,top,outside,top+20);line(im,outside,top+20,lower,top+20);line(im,lower,top+20,lower,bottom);line(im,lower,bottom,wall,bottom);
  }
 }
 return {inventory,front,plan,images,levels,reviewed,proposal:{buildingId:'house',levelId:levels.find(l=>l.sourceLevel==='upper').id,views}};
}
module.exports={flatEntryFixture};
