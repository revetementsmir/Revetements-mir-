'use strict';
// Invented drawings with independent plan, transverse elevation and optional
// side corroboration. No client page, filename, coordinates or OCR is reused.
const K=require('../../dist/plan-keyed-wall-observations.js');
const clone=value=>JSON.parse(JSON.stringify(value));
function image(width=900,height=650){const data=new Uint8ClampedArray(width*height*4);data.fill(255);return {width,height,data};}
function line(im,a,b,color=[30,30,30]){const count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));for(let i=0;i<=count;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/count),y=Math.round(a[1]+(b[1]-a[1])*i/count);if(x>=0&&x<im.width&&y>=0&&y<im.height)im.data.set([...color,255],(y*im.width+x)*4);}}
function frame(im,[l,t,r,b],color){for(const [a,z]of [[[l,t],[r-1,t]],[[r-1,t],[r-1,b-1]],[[r-1,b-1],[l,b-1]],[[l,b-1],[l,t]],[[l+5,t+5],[l+5,b-6]],[[r-6,t+5],[r-6,b-6]],[[l+5,t+9],[r-6,t+9]]])line(im,a,z,color);}
const sourceFrame=()=>({units:'pixels',rasterSize:[900,650],pdfToRaster:[1,0,0,-1,0,650],cropToRaster:[1,0,0,1,0,0]});
function fixture({side=true,roofCrossing=true}={}){
 const plan=image(),back=image(),sideImage=image(),fileId='invented-keyed-file',buildingId='invented-house',sourceLevel='upper';
 const view={id:'invented-wall-plan',kind:'floor',levelId:sourceLevel,buildingId,fileId,page:2,orientation:0,frame:sourceFrame(),payload:{sourceWidth:900,sourceHeight:650,drawingReadings:{rows:[{text:'MURET HAUTEUR 1200 mm',box:[698,354,830,362],confidence:93,source:'ocr'}]}}};
 const backView={id:'invented-wall-back',kind:'elevation',direction:'back',buildingId,fileId,page:3,frame:sourceFrame(),payload:{sourceWidth:900,sourceHeight:650,drawingReadings:{rows:[]}}};
 const sideView={id:'invented-wall-left',kind:'elevation',direction:'left',buildingId,fileId,page:4,frame:sourceFrame(),payload:{sourceWidth:900,sourceHeight:650,drawingReadings:{rows:[]}}};
 const level={id:buildingId+':upper',buildingId,sourceLevel,contours:[],wallOpenings:[],wallFinishes:{}};
 const points=[[45,260],[400,260],[400,510],[45,510]];
 for(const b of [[120,150,138,168],[310,150,328,168],[670,350,688,368]])frame(plan,b);
 for(const [l,r]of [[150,157],[290,297]]){line(plan,[l,80],[l,260]);line(plan,[r,80],[r,260]);line(plan,[l,80],[r,80]);line(plan,[l,120],[r,120]);line(plan,[l,260],[r,260]);if(roofCrossing)line(plan,[l-25,77],[r+25,77]);}
 for(const [a,b,c]of [[[137,159],[146,159],[153.5,181]],[[310,159],[301,159],[293.5,181]]]){line(plan,a,b);line(plan,b,c);}
 for(let i=0;i<points.length;i++)line(plan,points[i],points[(i+1)%points.length]);
 // The back elevation reverses plan X. Its deck is at the observed floor
 // datum. Two finite wall skins flank that deck; no lateral view is required.
 for(const [l,r]of [[443,450],[303,310]]){line(back,[l,370],[l,430]);line(back,[r,370],[r,430]);line(back,[l,370],[r,370]);}
 line(back,[310,430],[443,430]);
 // A roof ramp hides the lower side region. The keyed height stays horizontal.
 line(sideImage,[180,370],[180,430]);line(sideImage,[180,430],[360,370]);
 const guide=(v,type,y)=>({sourceViewId:v.id,sourceFrame:clone(v.frame),label:type==='floor'?'FLOOR UPPER':'CEILING UPPER',box:[700,y-9,800,y-2],y,levelHint:sourceLevel,datumType:type,confidence:95,sourceGuide:{anchors:[[680,y],[820,y]],support:1,frameSize:[900,650],method:'caption-and-visible-monochrome-datum-stroke'},confirmationRequired:true});
 const backLower=guide(backView,'floor',430),backUpper=guide(backView,'ceiling',280),sideLower=guide(sideView,'floor',430),sideUpper=guide(sideView,'ceiling',280);
 for(const [im,lower,upper]of [[back,backLower,backUpper],[sideImage,sideLower,sideUpper]]){line(im,...lower.sourceGuide.anchors);line(im,...upper.sourceGuide.anchors);}
 const alignment={origin:[45,260],offset:[0,0],rotationDegrees:0,status:'proposed',kind:'source-labelled-grid-registration',sourceViewId:view.id};
 const contour={version:1,contourId:'contour:'+level.id,sourceViewId:view.id,points:points.map((xy,i)=>({id:'invented-plan-point-'+i,xy})),edgeMeasures:{},reference:{value:7.1,anchors:[[45,260],[400,260]],kind:'written',status:'proposed',sourceViewId:view.id,label:'7.10 m'},height:{value:3,kind:'written',status:'proposed',sourceViewId:backView.id,label:'3.00 m',relationship:'two-visible-level-datums',datumEvidence:{lower:clone(backLower),upper:clone(backUpper)}},base:{value:4.2,kind:'estimated-calibrated',status:'proposed',sourceViewId:backView.id,label:'registered upper floor'},alignment,links:[],status:'proposed',levelRegistration:{status:'proposed',sourceLevel,alignment:clone(alignment),base:{value:4.2,status:'proposed'}}};
 const registration=(v,axis,scale,offset)=>({version:1,status:'proposed',buildingId,sourceLevel,floorSourceViewId:view.id,elevationSourceViewId:v.id,sourceFrames:{floor:clone(view.frame),elevation:clone(v.frame)},transform:{floorAxis:axis,scale,offset},maxResidualPixels:0,tolerancePixels:2,method:'shared-labelled-horizontal-axis-registration',verticalStatus:'unresolved',perpendicularStatus:'unresolved',confirmationRequired:true});
 const backInfo={viewId:backView.id,direction:'back',envelope:{status:'proposed',box:[200,280,355,150]},guides:[backLower,backUpper],axisRegistration:registration(backView,'x',-1,600)};
 const sideInfo={viewId:sideView.id,direction:'left',envelope:{status:'proposed',box:[360,280,250,150]},guides:[sideLower,sideUpper],axisRegistration:registration(sideView,'y',1,100)};
 const proposal={version:1,status:'proposed',buildingId,levelId:level.id,sourceViewId:view.id,draft:clone(contour),views:[backInfo,...(side?[sideInfo]:[])]};
 const inventory={version:1,files:[{id:fileId,sha256:'a'.repeat(64),pageCount:4}],buildings:[{id:buildingId,name:'Invented test drawing'}],views:[view,backView,...(side?[sideView]:[])],levels:[level]};
 const images={[view.id]:plan,[backView.id]:back,...(side?{[sideView.id]:sideImage}:{})};
 return {inventory,images,level,view,backView,sideView,plan,back,sideImage,contour,draft:contour,proposal,backInfo,sideInfo,buildingId};
}
function applyObservedKeys(f,text='Q7'){
 const discovery=K.discover(f.inventory,f.buildingId,f.images);
 for(const view of f.inventory.views){const regions=discovery.regions.filter(r=>r.sourceViewId===view.id);if(!regions.length)continue;view.payload.drawingReadings.keyedWallKeys=regions.map(r=>{
  const scaleFactor=6,padding=12,[x,y,w,h]=r.region,crop=view.frame.cropToRaster,pdfToTile=view.frame.pdfToRaster.map(n=>n*scaleFactor);pdfToTile[4]+=padding-scaleFactor*(x+crop[4]);pdfToTile[5]+=padding-scaleFactor*(y+crop[5]);
  return {id:r.id,sourceViewId:view.id,sourceFrame:clone(view.frame),frameId:r.frame.id,frame:clone(r.frame),box:r.frame.box.slice(),region:r.region.slice(),text,confidence:91,status:'proposed',source:'native-keyed-wall-key',purpose:'source-boxed-wall-note-key',nativeSource:{method:'retained-pdf-region',sourceViewId:view.id,sourceFileId:view.fileId,sourceSha256:f.inventory.files.find(file=>file.id===view.fileId).sha256,sourcePage:view.page,sourceFrame:clone(view.frame),sourceRegion:r.region.slice(),sourcePageRegion:[x+crop[4],y+crop[5],w,h],sourceRotation:0,scaleFactor,padding,pdfToTile,viewToTile:[scaleFactor,0,0,scaleFactor,padding-scaleFactor*x,padding-scaleFactor*y],viewportTransform:view.frame.pdfToRaster.map(n=>n*scaleFactor),canvasSize:[Math.ceil(w*scaleFactor)+padding*2,Math.ceil(h*scaleFactor)+padding*2]}};
 });}
 return discovery;
}
function resolvedFixture(options={}){
 const f=fixture(options),discovery=applyObservedKeys(f),result=K.resolve(f.inventory,f.buildingId,f.images,f.level,f.contour,{proposal:f.proposal,discovery});
 const level={...clone(f.level),contours:[clone(f.contour)],observedPlanes:clone(result.observedPlanes),reconstruction:{version:1,status:'automatic-proposal',proposal:clone(f.proposal),keyedWalls:clone(result)},openingProposals:[],exteriorElements:[],reconstructedRoofs:[],wallZones:[]};
 const inventory={...clone(f.inventory),levels:[level]};
 return {...f,sourceInventory:f.inventory,inventory,level,discovery,result};
}
module.exports={fixture,resolvedFixture,applyObservedKeys,clone,image,line,frame};
