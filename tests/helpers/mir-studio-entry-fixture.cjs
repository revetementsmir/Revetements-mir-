'use strict';
const {fixture}=require('./mir-studio-s2-model.cjs');
const blank=()=>({width:1000,height:800,data:new Uint8ClampedArray(1000*800*4).fill(255)});
function line(image,x0,y0,x1,y1){const n=Math.ceil(Math.hypot(x1-x0,y1-y0));for(let i=0;i<=n;i++){const x=Math.round(x0+(x1-x0)*i/n),y=Math.round(y0+(y1-y0)*i/n);image.data.set([0,0,0,255],(y*image.width+x)*4);}}
function rectangle(im,x,y,w,h){line(im,x,y,x+w,y);line(im,x+w,y,x+w,y+h);line(im,x+w,y+h,x,y+h);line(im,x,y+h,x,y);}
// Entirely synthetic metres and pixels. Different front/side scales and
// roof slopes are intentional; none of these coordinates identify a client.
function entryFixture({left=true,beam=true,roof=true,posts=true,sideRoofRise=50,mask=null}={}){
 const inventory=fixture(),front=inventory.views.find(v=>v.direction==='front'),levels=inventory.levels.filter(l=>l.buildingId==='house');
 for(const level of levels){delete level.geometryRevision;level.reconstruction={status:'automatic-proposal'};for(const c of level.contours){c.status='proposed';for(const key of ['reference','height','base','alignment'])c[key].status='proposed';}}
 front.payload.foundation=null;front.payload.drawingReadings={rows:[{text:'Colonnes et poutre, habillage à confirmer',source:'pdf-text',confidence:100,box:[760,410,990,428]}]};
 const im=blank(),images={[front.id]:im},views=[];
 const info=(view,box)=>({viewId:view.id,direction:view.direction,envelope:{status:'proposed',box,sourceViewId:view.id,sourceFrame:structuredClone(view.frame),occlusions:view===front&&mask?[mask]:[]},supportY:100,guides:[{levelHint:'upper',y:400,confidence:100,label:'Synthetic upper floor'}]});
 views.push(info(front,[100,100,600,600]));
 line(im,300,400,510,400);
 if(beam)rectangle(im,300,400,210,16);
 if(posts)for(const x of [300,310,500,510])line(im,x,beam?416:401,x,700);
 if(roof){line(im,280,390,375,340);line(im,375,340,435,340);line(im,435,340,530,390);line(im,280,390,530,390);}
 for(const direction of left?['right','left']:['right']){
  const view=structuredClone(front);view.id='synthetic-entry-'+direction;view.direction=direction;view.payload.drawingReadings={rows:[]};inventory.views.push(view);const side=blank(),right=direction==='right',wall=right?100:450,post=right?40:510,eave=right?30:520;
  if(posts)for(const x of right?[40,50]:[500,510])line(side,x,beam?416:401,x,700);
  if(beam)rectangle(side,Math.min(wall,post),400,Math.abs(wall-post),16);
  if(roof){line(side,eave,390,wall,390-sideRoofRise);line(side,eave,390,wall,390);line(side,wall,390-sideRoofRise,wall,390);}
  images[view.id]=side;views.push(info(view,[100,100,350,600]));
 }
 const upper=levels.find(l=>l.sourceLevel==='upper');
 return {inventory,front,images,levels,reviewed:upper.contours[0],proposal:{buildingId:'house',levelId:upper.id,views}};
}
module.exports={entryFixture,blank,line,rectangle};
