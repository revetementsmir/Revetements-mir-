'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js'),R=require('../dist/plan-reconstruction.js'),E=require('../dist/plan-reconstructed-elevations.js'),M=require('../dist/plan-level-model.js'),I=require('../dist/plan-view-inventory.js'),{fixture}=require('./helpers/mir-studio-s2-model.cjs');
function image(width=1000,height=650){return {width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};}
function stroke(im,a,b,width=6,color=[0,0,0]){const length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let s=0;s<=length;s++){const x=Math.round(a[0]+(b[0]-a[0])*s/length),y=Math.round(a[1]+(b[1]-a[1])*s/length);for(let dy=-Math.floor(width/2);dy<=Math.floor(width/2);dy++)for(let dx=-Math.floor(width/2);dx<=Math.floor(width/2);dx++)if(x+dx>=0&&x+dx<im.width&&y+dy>=0&&y+dy<im.height)im.data.set([...color,255],((y+dy)*im.width+x+dx)*4);}}
const polygon=[[220,150],[730,150],[730,520],[600,520],[600,450],[450,450],[450,500],[220,500]],im=image();polygon.forEach((p,i)=>stroke(im,p,polygon[(i+1)%polygon.length]));
stroke(im,[220,280],[600,280],4);stroke(im,[400,150],[400,450],4);stroke(im,[180,120],[770,120],1);stroke(im,[850,100],[850,560],2);stroke(im,[80,70],[320,70],9,[0,180,0]);
const frame={pdfToRaster:[2,0,0,-2,0,650],cropToRaster:[1,0,0,1,40,20],rasterSize:[1100,700]},proposal=V.floorEnvelope(im,{sourceViewId:'synthetic-floor',frame});
assert.equal(proposal.status,'proposed');assert.equal(proposal.points.length,8,'separate retreats survive the automatic proposal');assert.deepEqual(M.validatePolygon(proposal.points),[]);assert.deepEqual(proposal.sourceFrame,frame);assert.equal(proposal.metricScale,null);assert.equal(proposal.confirmationRequired,true);
const colour=image();polygon.forEach((p,i)=>stroke(colour,p,polygon[(i+1)%polygon.length],8,[0,180,0]));assert.equal(V.floorEnvelope(colour).status,'unresolved','coloured outlines alone never supply a contour');assert.equal(V.floorEnvelope(image()).status,'unresolved');
const inventory=I.create([{kind:'floor',name:'Plan étage Maison',page:1,sourceWidth:1000,sourceHeight:650,sourceCrop:[0,0,1000,650]}],{filename:'synthetic.pdf',bytes:1000});
const before=structuredClone(inventory),automatic=R.propose(inventory,inventory.buildings[0].id,{[inventory.views[0].id]:im});assert.equal(automatic.status,'proposed');assert.equal(automatic.draft.reference.value,null,'no written or compatible scale means no fabricated dimensions');assert.equal(automatic.draft.height.value,null);assert.deepEqual(inventory,before);assert.equal(M.scene(inventory,inventory.buildings[0].id).walls.length,0);assert.equal(inventory.levels.length,1,'an upper-only plan never creates a ground floor');
let model=fixture(),scene=M.scene(model,'house');const first=scene.walls[0];model.levels.find(l=>l.id===first.levelId).wallOpenings=[{id:'synthetic-window',wallId:first.id,sourceId:'synthetic-source-window',offset:1,sill:1,width:2,height:1,status:'confirmed'}];scene=M.scene(model,'house');
const textures=Object.fromEntries(scene.walls.map(w=>[w.id,require('../dist/studio-surfaces.js').svg(w,model.levels.find(l=>l.id===w.levelId))]));
for(const direction of ['front','right','back','left']){const projection=E.project(scene,direction),svg=E.svg(scene,{direction,textures});assert.ok(projection.walls.length);assert.ok(projection.viewBox.every(Number.isFinite));assert.match(svg,/data-source-raster="absent"/);assert.doesNotMatch(svg,/<image|sourceImage|data:image\/jpeg/);for(const row of projection.walls)assert.ok(svg.includes(row.wall.id));}
const facing=E.project(scene,'front');assert.ok(facing.walls.some(r=>r.wall.id===first.id));assert.match(E.svg(scene,{direction:'front',textures}),/data-level-opening="synthetic-window"/);assert.throws(()=>E.project(scene,'unknown'),/ELEVATION_DIRECTION/);
assert.equal(R.faceSpan([[0,0],[100,0],[100,120],[60,120],[60,100],[0,100]],'left').length,100);assert.equal(R.faceSpan([[0,0],[100,0],[100,120],[60,120],[60,100],[0,100]],'right').length,120,'level setbacks keep their directional extents');
// A recessed return does not stretch the primary elevation registration.
// Source pixels increase downwards; world Y increases toward the back.
const registrationInventory=fixture(),registrationLevel=registrationInventory.levels.find(l=>l.sourceLevel==='upper'&&l.buildingId==='house'),registrationDraft=registrationLevel.contours[0],physicalOutline=[[0,.8],[2,.8],[2,0],[12,0],[12,7],[0,7]];
registrationDraft.points=physicalOutline.map(([x,y],i)=>({id:'registration-'+i,xy:[120+x*50,680-y*50]}));
for(const [direction,expected]of Object.entries({front:[2,12],back:[-12,0],left:[-7,-.8],right:[0,7]})){
 const info={direction,envelope:{status:'proposed',box:[100,100,350,600]},guides:[{levelHint:'upper',y:400,confidence:100}]},registration=R.elevationRegistration(info,registrationDraft,registrationInventory);
 assert.ok(Math.abs(registration.u(100)-expected[0])<1e-8&&Math.abs(registration.u(450)-expected[1])<1e-8,'exact primary registration '+direction);
 const pixelSpan=R.faceSpan(registrationDraft.points.map(p=>p.xy),direction).length*.02,worldSpan=R.faceSpan(M.modelPoints(registrationDraft),direction,{world:true}).length;
 assert.ok(Math.abs(pixelSpan-worldSpan)<1e-8,'source/world directional spans agree '+direction);
 if(direction==='left')assert.ok(registration.pixelU(0)>470,'projecting front attachment remains outside the recessed primary envelope');
}
// Observed lower wall planes never manufacture a ground-floor contour.
const observedInventory=structuredClone(inventory),building=observedInventory.buildings[0].id;
observedInventory.views.push({id:'synthetic-front',kind:'elevation',direction:'front',buildingId:building,payload:{}},{id:'synthetic-right',kind:'elevation',direction:'right',buildingId:building,payload:{}});
const observed={id:building+':observed-ground',buildingId:building,sourceLevel:null,contours:[],observedPlanes:[],wallOpenings:[],openingsReviewed:true};
const plane={id:'wall:'+observed.id+':synthetic-main',from:[0,0],to:[12,0],normal:[0,-1,0],height:3,base:-3,status:'proposed',sourceViewId:'synthetic-front',sourceBox:[0,0,120,30],registration:{kind:'multi-view-elevation-registration',sourceViewIds:['synthetic-front','synthetic-right'],status:'proposed'},measurements:{width:{value:12,kind:'estimated-calibrated',status:'proposed',sourceViewId:'synthetic-front',anchors:[[0,30],[120,30]],scaleUsed:.1},height:{value:3,kind:'estimated-calibrated',status:'proposed',sourceViewId:'synthetic-front',anchors:[[0,30],[0,0]],scaleUsed:.1}}};
observed.observedPlanes=[plane];observedInventory.levels.push(observed);assert.equal(M.wallsFor(observed,observedInventory).length,0,'observed plane proposals do not become confirmed walls');
plane.status='confirmed';plane.registration.status='confirmed';for(const m of Object.values(plane.measurements))m.status='confirmed';assert.deepEqual(M.observedPlaneIssues(plane,observedInventory,observed),[]);assert.equal(M.wallsFor(observed,observedInventory).length,1);assert.equal(observed.contours.length,0);assert.equal(observed.sourceLevel,null);assert.equal(M.quantities(observedInventory,building).partial,true,'even reviewed openings never make an unknown contour a complete building takeoff');
const foreign=structuredClone(plane);foreign.sourceViewId=inventory.views[0].id;assert.ok(M.observedPlaneIssues(foreign,observedInventory,observed).includes('SOURCE_BUILDING'));
const single=structuredClone(plane);single.registration.sourceViewIds=['synthetic-front'];assert.ok(M.observedPlaneIssues(single,observedInventory,observed).includes('ALIGNMENT_UNKNOWN'));
const fabricated=structuredClone(plane);fabricated.to=[20,0];assert.ok(M.observedPlaneIssues(fabricated,observedInventory,observed).includes('PLANE_MEASUREMENTS'));
const allBefore=structuredClone(observedInventory);M.scene(observedInventory,building);assert.deepEqual(observedInventory,allBefore,'opening or rendering an existing project never invents a contour or migration write');
const Roof=require('../dist/plan-reconstructed-roofs.js');
const roof={id:'synthetic-source-roof',levelId:'house:upper',buildingId:'house',status:'confirmed',profiles:{x:[[0,6],[3,8],[9,8],[12,6]],y:[[0,6],[3.5,8],[7,6]]},sources:['front','right'].map(id=>({sourceViewId:'synthetic-'+id,sourceFrame:{units:'pixels'},anchors:[[0,0],[100,50]],scaleX:.1,scaleY:.1}))};
assert.deepEqual(Roof.issues(roof),[]);const roofFaces=Roof.faces(roof);assert.ok(roofFaces.length>=4);assert.equal(new Set(roofFaces.map(f=>f.id)).size,roofFaces.length);assert.ok(roofFaces.every(f=>f.poly.every(p=>p.every(Number.isFinite))&&f.normal[2]>0));assert.equal(Roof.faces({...roof,status:'proposed'}).length,0,'unreviewed roof measurements never enter the scene');assert.ok(Roof.issues({...roof,profiles:{...roof.profiles,x:[[0,6],[0,8]]}}).includes('ROOF_PROFILE'));assert.ok(Roof.issues({...roof,sources:[]}).includes('ROOF_SOURCE'));
const roofScene={...scene,roofs:[roof]},roofSVG=E.svg(roofScene,{direction:'front',textures});assert.match(roofSVG,/data-reconstructed-roof="synthetic-source-roof"/);assert.doesNotMatch(roofSVG,/<image|sourceImage/);assert.ok(E.project(roofScene,'front').viewBox[1]<=-800,'roof ridge remains inside the 2D camera bounds');
const colourWall=image();for(const [a,b]of [[[300,240],[300,530]],[[700,240],[700,530]]])stroke(colourWall,a,b,6,[0,100,0]);assert.equal(V.wallEnvelope(colourWall,400).status,'unresolved','a coloured mask alone cannot become an elevation wall');
// A legend interrupts one slope before the apex. The visible endpoint must
// not become a lower invented ridge, nor bridge a rectangle through the mask.
const source={sourceViewId:'synthetic-front',sourceFrame:frame,anchors:[[10,10],[20,20]],scaleX:.1,scaleY:.1},halves=[
 {axis:'x',side:'min',eave:[0,3],high:[3,5],ridgeEvidence:{start:30,end:70},source},
 {axis:'x',side:'max',eave:[10,3],high:[7,5],ridgeEvidence:{start:30,end:70},source},
 {axis:'y',side:'min',eave:[0,3],high:[2,4],source:{...source,sourceViewId:'synthetic-right'}},
 {axis:'y',side:'max',eave:[8,3],high:[6,4],source:{...source,sourceViewId:'synthetic-left'}}];
const recouped=R.assembleRoofProfiles(halves);assert.equal(recouped.status,'proposed');assert.deepEqual(recouped.profiles.y,[[0,3],[4,5],[8,3]],'the two supported slopes meet at the independently corroborated height');assert.equal(recouped.checks.find(c=>c.axis==='y').difference,0);const conflict=structuredClone(halves);conflict[2].high[1]=3.4;conflict[3].high[1]=3.4;assert.equal(R.assembleRoofProfiles(conflict).reason,'ROOF_ORTHOGONAL_HEIGHT_CONFLICT','inconsistent height cannot be averaged away');
const continuousRoof={...roof,profiles:recouped.profiles},continuous=Roof.faces(continuousRoof),planArea=poly=>Math.abs(M.signedArea(poly.map(p=>p.slice(0,2))));assert.equal(continuous.length,4,'one face per physical slope, without a grid of artificial roof seams');assert.ok(Math.abs(continuous.reduce((s,f)=>s+planArea(f.poly),0)-80)<1e-8,'continuous roof covers the footprint once');
const Order=require('../dist/plan-scene-order.js'),slope={id:'roof',poly:[[0,0,-6],[10,0,4],[10,2,4],[0,2,-6]]},fascia={id:'fascia',poly:[[8,1,1],[10,1,1],[10,1.5,1],[8,1.5,1]]};assert.ok(slope.poly.reduce((s,p)=>s+p[2],0)/4<1,'centroid sorting reproduces the original wrong order');assert.deepEqual(Order.order([slope,fascia],{project:p=>p.slice(0,2),depth:p=>p[2]}).map(f=>f.id),['fascia','roof'],'occlusion is decided at the actual overlap');
const Exterior=require('../dist/studio-exterior-model.js'),surface={id:'synthetic-beam',levelId:'house:upper',buildingId:'house',type:'beam',origin:[0,-1,2],size:[3,null,.2],surfaceOnly:true,rotationDegrees:0,status:'confirmed',phase:'existing',provenance:{kind:'estimated-calibrated'}};assert.deepEqual(Exterior.issues(surface),[]);assert.equal(Exterior.elementFaces(surface).length,1);assert.ok(Exterior.issues({...surface,surfaceOnly:false}).includes('ELEMENT_DIMENSIONS'),'an unknown depth never silently turns into a box');assert.match(E.svg({...scene,elements:[surface]}),/data-level-element="synthetic-beam"/,'the elevation uses the same physical exterior element');
// Small independent raster errors used to turn a pointed ridge into a flat
// cap. A corroborated apex is one physical height, not two clipped plateaus.
const mismatched={x:[[0,3],[3,4.94],[7,4.94],[10,3]],y:[[0,3],[4,5],[8,3]]};
assert.ok(Roof.faces({...roof,profiles:mismatched}).some(f=>Math.abs(f.normal[2]-1)<1e-9),'fixture reproduces the flat cap');
const aligned=R.commonRidge(mismatched);assert.equal(aligned.status,'proposed');assert.deepEqual(aligned.evidence.originalProfiles,mismatched);assert.equal(aligned.evidence.referenceHeight,5);
assert.ok(Roof.faces({...roof,profiles:aligned.profiles}).every(f=>f.normal[2]<.999),'a pointed ridge has no horizontal roof surface');
assert.equal(R.commonRidge({...mismatched,y:[[0,3],[4,6],[8,3]]}).status,'unresolved','a contradictory ridge height stays unresolved');
// A projecting hip joins a continuous side plane. Pixel fit differences must
// not create an artificial seam or a vertical cladding triangle.
const parent={...roof,profiles:{x:[[0,3],[3,5],[7,5],[10,3]],y:[[0,3],[4,5],[8,3]]}},returnRoof={...roof,id:roof.id+':return',profiles:{x:[[6,3],[8,4.32],[10.01,2.993]],y:[[-.2,3],[2,4.32],[3,4.32]]},connection:{parentRoofId:roof.id}};
const joined=R.joinRoofReturn(parent,returnRoof,.03);assert.equal(joined.connection.sharedPlane.side,'max');assert.deepEqual(joined.connection.sharedPlane.originalProfiles,returnRoof.profiles);assert.deepEqual(joined.profiles.x.at(-1),parent.profiles.x.at(-1));assert.equal(joined.gable,undefined);
const joinedFaces=Roof.faces({...parent,extensions:[joined]});assert.ok(joinedFaces.every(f=>f.type==='roof'&&f.normal[2]>0&&f.normal[2]<.999),'all return faces are sloped roofing');
assert.equal(joinedFaces.filter(f=>f.normal[0]>.1&&Math.abs(f.normal[1])<1e-7).length,1,'the continuous side plane has one boundary, no seam across its face');
assert.ok(Math.abs(joinedFaces.reduce((s,f)=>s+planArea(f.poly),0)-80.8)<1e-6,'joined roof covers both footprints exactly once');
const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
for(let x=.037;x<10;x+=.271)for(let y=-.173;y<8;y+=.233){const count=joinedFaces.filter(f=>inside([x,y],f.poly)).length,expected=y>=0||x>=6?1:0;assert.equal(count,expected,'no overlapping roof surface or hole at '+x+','+y);}
assert.ok(Order.convexParts([[0,0],[3,0],[3,1],[1,1],[1,3],[0,3]]).length>1,'concave joined roof boundaries are split for occlusion ordering');
const observations=[{box:[100,100,100,80],priority:3,method:'outer-frame'},{box:[150,103,48,78],priority:1,method:'inner-pane'},{box:[300,100,50,25],priority:3},{box:[300,140,50,25],priority:3}];
const distinct=R.distinctOpeningFrames(observations);assert.equal(distinct.length,3,'pane observations never produce a second deduction; separate stacked windows survive');assert.deepEqual(distinct[0].box,observations[0].box,'the selected frame is retained without averaging');assert.equal(distinct[0].alternateObservations.length,1);
const hidden={status:'proposed',buildingId:'house',openingProposals:[{id:'candidate',sourceViewId:'side',sourceBox:[120,100,80,40]}]},secondary={id:'garage',buildingId:'house',observedPlanes:[{id:'garage-wall',sourceViewId:'side',sourceBox:[100,50,300,220]}]};
const assigned=R.assignOpeningSurfaces(hidden,[secondary]);assert.equal(assigned.openingProposals.length,0,'an opening seen on the garage is not duplicated on the hidden house wall');assert.equal(assigned.occludedSourceOpenings[0].proposedWallId,'garage-wall');assert.equal(assigned.occludedSourceOpenings[0].status,'unresolved');assert.equal(hidden.openingProposals.length,1,'source observations remain immutable');assert.equal(R.assignOpeningSurfaces(hidden,[{...secondary,buildingId:'shed'}]).openingProposals.length,1,'different buildings cannot transfer openings');
const grey=image(600,400);for(let y=130;y<310;y++)for(let x=200;x<280;x++)grey.data.set([150,150,150,255],(y*grey.width+x)*4);stroke(grey,[199,129],[199,311],3);stroke(grey,[281,129],[281,311],3);assert.equal(V.grayDoorFrames(grey,[50,50,400,300]).length,0,'two vertical cladding edges alone are not a closed door');stroke(grey,[199,129],[281,129],3);stroke(grey,[199,311],[281,311],3);assert.equal(V.grayDoorFrames(grey,[50,50,400,300]).length,1,'neutral glazing or door panels require all four frame edges');
const Surfaces=require('../dist/studio-surfaces.js'),vm=require('node:vm'),fs=require('node:fs'),graphicsModel=fixture(),graphicsLevel=graphicsModel.levels[0],graphicsWall=M.wallsFor(graphicsLevel,graphicsModel)[0];
graphicsLevel.wallOpenings=[{id:'synthetic-door',sourceId:'door-source',wallId:graphicsWall.id,type:'door',width:1,height:2,offset:.2,sill:0,status:'confirmed',appearance:{frameColor:'#123456'}},{id:'synthetic-glazing',sourceId:'glass-source',wallId:graphicsWall.id,type:'window',width:1,height:1,offset:2,sill:1,status:'confirmed',appearance:{frameColor:'#abcdef'}}];
const sandbox={window:{MIRStudioSurfaces:Surfaces}};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/plan-3d.js'),'utf8'),sandbox);const mesh=sandbox.window.MIR3D.mesh({levelScene:M.scene(graphicsModel,'house')}),graphicSVG=Surfaces.svg(graphicsWall,graphicsLevel);
for(const o of graphicsLevel.wallOpenings){const expected=Surfaces.openingGraphic(o),actual=mesh.faces.find(f=>f.openingId===o.id);assert.deepEqual(actual.openingGraphic,expected,'2D and 3D share the exact opening symbol');assert.match(graphicSVG,new RegExp('fill="'+expected.infillColor+'"'));assert.equal(actual.fillColor,expected.frameColor);}
assert.notEqual(Surfaces.openingGraphic(graphicsLevel.wallOpenings[0]).infillColor,Surfaces.openingGraphic(graphicsLevel.wallOpenings[1]).infillColor,'a door is not silently drawn as a window');
// Dimension endpoints can be a few pixels inside a thick outside stroke.
// The proposed constraint must use the written span exactly, without changing
// an old project on read or losing the original corner observations.
const dimensionDraft={sourceViewId:'floor-a',points:[[100,100],[703,100],[703,804],[501,804],[501,751],[100,751]].map((xy,i)=>({id:'corner-'+i,xy})),reference:{kind:'written',value:12,anchors:[[100,900],[700,900]]},alignment:{origin:[100,804],offset:[0,0],rotationDegrees:0}},dimensionBefore=structuredClone(dimensionDraft);
const written=(value,anchors)=>({kind:'written',value,anchors,sourceViewId:'floor-a',label:value+' m'}),constraints=[written(12,[[100,900],[700,900]]),written(14,[[50,100],[50,800]]),written(13,[[70,100],[70,750]]),written(1,[[70,750],[70,800]])];
const exact=R.constrainContour(dimensionDraft,constraints),metric=M.modelPoints(exact);assert.deepEqual(dimensionDraft,dimensionBefore);assert.deepEqual(exact.dimensionAdjustment.originalPoints,dimensionBefore.points);assert.deepEqual(exact.points.map(p=>p.id),dimensionBefore.points.map(p=>p.id));assert.equal(metric[1][0]-metric[0][0],12);assert.equal(metric[0][1]-metric[2][1],14);assert.equal(M.distance(metric[3],metric[4]),1);assert.equal(exact.dimensionAdjustment.status,'proposed');
const contradicted=R.constrainContour(dimensionDraft,[constraints[0],written(12.2,constraints[0].anchors)]);assert.equal(contradicted.dimensionAdjustment.status,'conflict');assert.equal(contradicted.points[1].xy[0],dimensionDraft.points[1].xy[0],'contradictory written dimensions never become an average');assert.deepEqual(R.constrainContour(dimensionDraft,[{...constraints[0],sourceViewId:'shed-floor'}]).points,dimensionDraft.points,'another building/view cannot constrain this outline');
assert.deepEqual(R.openingSize('2 × (70" × 22")'),{width:1.778,height:.5588,count:2,label:'2 × (70" × 22")',normalized:'2 × (70" × 22")',transcriptionReviewRequired:false,kind:'written',status:'proposed',confirmationRequired:true});
assert.equal(R.openingSize('L24°X6O" |').width,.6095999999999999);assert.equal(R.openingSize('L24°X6O" |').height,1.524);assert.equal(R.openingSize('L24°X6O" |').transcriptionReviewRequired,true);
for(const label of ['2x4 framing','Note: 48" x 60"','ROOM 12\' x 14\'','Scale 1/4" = 1\'','Surface 48 × 60','24 x 60','48" x'])assert.equal(R.openingSize(label),null,'notes, room dimensions and incomplete labels cannot supply an opening size: '+label);
const captionView={id:'floor-a',frame,payload:{drawingReadings:{rows:[{text:'70" X 22"',box:[350,515,400,523],confidence:94},{text:'60" X 60"',box:[350,350,400,358],confidence:94}]}}},captionPoints=[[100,100],[700,100],[700,500],[100,500]],captionGap={edgeIndex:2,anchors:[[440,500],[310,500]]};
const sizes=R.floorOpeningSizes(captionView,captionPoints,[captionGap]);assert.equal(sizes.length,1,'an interior furniture/room label does not become an exterior window');assert.equal(sizes[0].sourceViewId,'floor-a');assert.deepEqual(sizes[0].sourceFrame,frame);assert.deepEqual(sizes[0].anchors,captionGap.anchors);assert.equal(sizes[0].status,'proposed');
const hiddenWindow=image(600,400),hiddenArea=[190,70,145,110];for(const [a,b]of [[[250,120],[350,120]],[[350,120],[350,200]],[[350,200],[250,200]],[[250,200],[250,120]]])stroke(hiddenWindow,a,b,3);
for(let y=70;y<=180;y++)for(let x=190;x<=335;x++)hiddenWindow.data.set([245,245,245,255],(y*600+x)*4);stroke(hiddenWindow,[190,180],[335,180],4);
const recovery={top:100,bottom:260,width:100,height:80,occlusions:[hiddenArea]},occluded=V.occludedFrameAtSeed(hiddenWindow,{left:270,right:310},recovery);assert.equal(occluded.length,1,'visible bottom and side frames can locate a partially hidden opening with a compatible written size');assert.ok(Math.abs(occluded[0].box[0]-250)<=3);assert.ok(Math.abs(occluded[0].box[1]+occluded[0].box[3]-200)<=3);assert.equal(occluded[0].occlusionEvidence.observedSegments.length,3);assert.equal(V.occludedFrameAtSeed(hiddenWindow,{left:270,right:310},{...recovery,height:null}).length,0,'an unknown height is never filled from legend pixels');const legendOnly=image(600,400);stroke(legendOnly,[190,180],[335,180],4);assert.equal(V.occludedFrameAtSeed(legendOnly,{left:270,right:310},recovery).length,0,'a legend boundary alone is not an opening');
const foundationRaster=image(),foundationView={id:'foundation-elevation',frame,payload:{drawingReadings:{rows:[{text:'DESSUS FONDATION',box:[100,500,230,512],confidence:95}]}}};stroke(foundationRaster,[80,518],[255,518],2);const foundation=R.foundationGuide(foundationView,foundationRaster,490,200);assert.ok(foundation&&Math.abs(foundation.y-518)<3);assert.equal(foundation.kind,'visible-foundation-top-guide');assert.equal(R.foundationGuide(foundationView,image(),490,200),null,'a caption without a visible datum cannot extend a wall');assert.equal(R.foundationGuide(foundationView,foundationRaster,400,200),null,'a distant line is not a plausible foundation-top registration');

 {
 // Partial dimensions are view-scale evidence only, never wall-length evidence.
 const source={id:'source-floor',calibration:{evidence:[]}},bounds=[150,100,500,360];
 const floorDimension=(value,anchors,extra={})=>({value,anchors,scale:value/M.distance(...anchors),sourceViewId:source.id,kind:'written',confidence:90,status:'proposed',...extra});
 const first=floorDimension(2,[[200,150],[300,150]]);
 const second=floorDimension(3,[[450,200],[450,350]]);
 const corroborated=R.partialScaleReferences(source,[first,second],bounds);
 assert.equal(corroborated.references.length,2,'two independent partial dimensions corroborate scale');
 assert.equal(corroborated.conflict,false);
 assert.ok(Math.abs(corroborated.assessment.scale-.02)<1e-10);
 assert.equal(corroborated.references[0].confirmationRequired,true);
 assert.equal(R.partialScaleReferences(source,[first],bounds).references.length,0,'one partial label is insufficient');
 assert.equal(R.partialScaleReferences(source,[first,{...first}],bounds).references.length,0,'duplicate OCR is insufficient');
 assert.equal(R.partialScaleReferences(source,[first,floorDimension(3,[[205,150],[305,150]])],bounds).conflict,true,'conflicting scale is not averaged');
 assert.equal(R.partialScaleReferences(source,[first,floorDimension(2.4,[[450,200],[450,350]])],bounds).conflict,true,'cross-axis distortion is rejected');
 assert.equal(R.partialScaleReferences(source,[first,{...second,sourceViewId:'other-building'}],bounds).references.length,0,'no unrelated view');
 assert.equal(R.partialScaleReferences(source,[first,floorDimension(3,[[800,200],[800,350]])],bounds).references.length,0,'outside footprint excluded');
 assert.equal(R.partialScaleReferences(source,[first,{...second,confidence:20}],bounds).references.length,0,'low-confidence OCR excluded');
 }

// Numbered level datums on elevations, as encountered in multi-storey plans.
// Verify visible source guides and avoid silently multiplying storey heights.
{
 const im={width:1000,height:650,data:new Uint8ClampedArray(1000*650*4).fill(255)};
 const levels=[['PLANCHER NIVEAU 0',625],['PLANCHER NIVEAU 1',580],['PLANCHER NIVEAU 2',470],['PLANCHER NIVEAU 3',380],['PLAFOND NIVEAU 3',300]];
 for(const [,y] of levels)for(let x=740;x<=925;x++)im.data.set([0,0,0,255],(y*im.width+x)*4);
 const view={id:'synthetic-numbered-elevation',frame:{units:'pixels'},payload:{drawingReadings:{rows:levels.map(([text,y])=>({text,box:[770,y-16,870,y-8],confidence:96,source:'ocr'}))}}};
 const env={status:'proposed',box:[120,240,580,370]},guides=R.floorGuide(view,im,env);
 assert.equal(guides.length,5,'all four numbered floors and labelled top ceiling are independently read');
 assert.deepEqual(guides.filter(g=>g.datumType==='floor').map(g=>g.levelHint).sort(),['level-0','level-1','level-2','level-3']);
 assert.equal(guides.find(g=>g.datumType==='ceiling').levelHint,'level-3');
 assert.deepEqual(R.datumFromCaption('PLANCHER NIVEAU 0'),{levelHint:'level-0',datumType:'floor'});
 assert.deepEqual(R.datumFromCaption('PLAFOND NIVEAU 3'),{levelHint:'level-3',datumType:'ceiling'});
 assert.deepEqual(R.datumFromCaption('Dessus plancher R-D-C'),{levelHint:'ground',datumType:'floor'});
 assert.deepEqual(R.datumFromCaption('Upper floor'),{levelHint:'upper',datumType:'floor'},'legacy imported single-storey elevation text remains supported');
 assert.deepEqual(R.datumFromCaption('Ground floor'),{levelHint:'ground',datumType:'floor'});
 assert.equal(R.datumFromCaption('NOTE PLANCHER NIVEAU 1'),null,'a note is not a datum');
 assert.equal(R.datumFromCaption('PLANCHER NIVEAU O'),null,'unverified OCR O does not become zero');
 const sourceView={viewId:view.id,envelope:env,facing:{length:580},guides},inventory={views:[view]},reference={scale:.02,value:2,anchors:[[0,0],[100,0]],sourceViewId:'floor',kind:'written',status:'proposed'};
 const exact=(level,expected)=>{const matches=R.heightFromLevelDatums([sourceView],level,reference,inventory);assert.equal(matches.length,1);assert.ok(Math.abs(matches[0].value-expected)<1e-9);assert.equal(matches[0].relationship,'two-visible-level-datums');assert.equal(matches[0].confirmationRequired,true);assert.equal(matches[0].sourceViewId,view.id);};
 exact('level-0',.9);exact('level-1',2.2);exact('level-2',1.8);exact('level-3',1.6);
 assert.equal(R.heightFromLevelDatums([sourceView],'level-4',reference,inventory).length,0,'an absent upper storey cannot borrow the main roof height');
 assert.equal(R.heightFromLevelDatums([sourceView],'level-1',null,inventory).length,0,'a missing horizontal scale blocks height inference');
 assert.equal(R.heightFromLevelDatums([{...sourceView,guides:guides.filter(g=>g.levelHint==='level-1')}],'level-1',reference,inventory).length,0,'only one datum is insufficient');
 assert.equal(R.floorGuide(view,{...im,data:new Uint8ClampedArray(im.data.length).fill(255)},env).length,0,'OCR captions without visible guides cannot create floor elevations');
}
console.log('PASS reconstruction: automatic multi-retreat proposal, masks excluded, source frames retained, upper-only and unknown dimensions preserved, source-free elevations share physical walls/openings/material atlases; pointed ridges and continuous hip-roof junctions');
