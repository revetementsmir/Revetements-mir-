'use strict';
// Integration contract: the synthetic observations enter at the source proposal
// seam. Calibration, XYZ registration, model validation, opening/roof extraction
// and wall rendering below are the production implementations, without mocks.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Exterior=require('../dist/plan-reconstructed-exterior.js');
const M=require('../dist/plan-level-model.js'),R=require('../dist/plan-reconstruction.js'),Grid=require('../dist/plan-grid-registration.js'),Roof=require('../dist/plan-reconstructed-roofs.js'),X=require('../dist/studio-exterior-model.js');
const clone=value=>JSON.parse(JSON.stringify(value)),near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} differs from ${expected}`);
function floor(n,s=1,{omit=[]}={}){
 const width=1000,height=700,image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)},rows=[],tx=n*4,ty=n*-3;
 const draw=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<width&&y>=0&&y<height)image.data.set([0,0,0,255],(y*width+x)*4);};
 for(const [label,x,y]of [['1',150,70],['2',330,70],['3',510,70],['4',690,70],['A',100,250],['B',100,550]]){if(omit.includes(label))continue;const cx=(x-tx)/s,cy=(y-ty)/s,r=17/s;for(let a=0;a<360;a++)for(const d of [-1,0,1])draw(cx+Math.cos(a*Math.PI/180)*(r+d),cy+Math.sin(a*Math.PI/180)*(r+d));rows.push({text:label,confidence:98,box:[cx-4,cy-4,cx+4,cy+4]});}
 const view={id:'floor-'+n,buildingId:'house',levelId:'level-'+n,kind:'floor',page:n+1,frame:{units:'pixels',rasterSize:[width,height]},payload:{drawingReadings:{rows}}},level={id:'house:level-'+n,buildingId:'house',sourceLevel:'level-'+n,contours:[]},draft=M.draftFor(view,level);
 draft.reference={value:12,scale:.02*s,anchors:[[100,300],[100+600/s,300]],kind:'written',status:'proposed',sourceViewId:view.id,label:'12 m synthetic reference',confidence:99};draft.points=[[150,250],[690,250],[690,550],[150,550]].map((p,i)=>({id:'p'+i,xy:[(p[0]-tx)/s,(p[1]-ty)/s]}));draft.alignment={origin:draft.points[3].xy,offset:[0,0],rotationDegrees:0,status:'proposed'};draft.status='proposed';
 return {view,level,draft,image};
}
function fixture({omitAxis=false,missingZ=false,conflictingZ=false}={}){
 const floors=[floor(0),floor(1,1.25,{omit:omitAxis?['B']:[]}),floor(2,.9),floor(3,1.1)],elevations=['front','right'].map(direction=>({id:'elevation-'+direction,buildingId:'house',kind:'elevation',direction,frame:{units:'pixels',rasterSize:[1000,1100]},page:10,payload:{}}));
 const guides=v=>[...Array.from({length:4},(_,n)=>({sourceViewId:v.id,sourceFrame:v.frame,levelHint:'level-'+n,datumType:'floor',y:950-n*150,box:[800,935-n*150,900,945-n*150],confidence:99,label:'Floor level '+n})),{sourceViewId:v.id,sourceFrame:v.frame,levelHint:'level-3',datumType:'ceiling',y:350,box:[800,335,900,345],confidence:99,label:'Ceiling level 3'}];
 const views=elevations.map(v=>{const front=v.direction==='front',left=front?150:100,width=front?540:300;return {viewId:v.id,direction:v.direction,envelope:{status:'proposed',box:[left,350,width,600],occlusions:[]},facing:{axis:front?0:1,min:front?150:250,max:front?690:550,length:width},supportY:350,guides:guides(v),roofProfile:{slopes:[{eaveX:left,eaveY:350,highX:left+width/2,highY:250},{eaveX:left+width,eaveY:350,highX:left+width/2,highY:250}]}};});
 const inventory={views:[...floors.map(f=>f.view),...elevations],levels:floors.map(f=>f.level)},proposals={};
 for(const f of floors){const localViews=clone(views);for(const v of localViews)v.facing.length/=f.draft.reference.scale/.02;const height=R.heightFromLevelDatums(localViews,f.view.levelId,f.draft.reference,inventory)[0];assert.ok(height,'synthetic source pair must establish each actual height');f.draft.height=height;proposals[f.level.id]={status:'proposed',buildingId:'house',levelId:f.level.id,draft:f.draft,views:localViews,referenceCandidates:[clone(f.draft.reference)],contourDimensions:[],sourceOpeningGaps:[],openingSizeCandidates:[]};}
 // Remove provenance after deriving the local heights to isolate the global
 // datum-network guard from the independent contour-height validator.
 if(missingZ)for(const p of Object.values(proposals))for(const v of p.views)for(const g of v.guides)delete g.box;
 if(conflictingZ)for(const p of Object.values(proposals))p.views[1].guides.find(g=>g.levelHint==='level-2').y+=12;
 const images=Object.fromEntries(floors.map(f=>[f.view.id,f.image]));for(const v of elevations)images[v.id]={width:1000,height:1100,data:new Uint8ClampedArray(1000*1100*4).fill(255)};
 // Four source windows in one elevation, one per storey. The same frame must
 // never be assigned to several walls on different levels.
 const im=images['elevation-front'];for(let n=0;n<4;n++){const y=950-n*150-110;for(let yy=y;yy<=y+50;yy++)for(let x=200;x<=250;x++)if(yy<=y+1||yy>=y+49||x<=201||x>=249)im.data.set([0,0,0,255],(yy*im.width+x)*4);}
 return {inventory,proposals,images};
}
function pipeline(f){
 const calls={propose:[],roof:[],lower:0,secondary:0,exterior:0,wallZones:0};
 const window={MIRLevelModel:M,MIRPlanReconstruction:{...R,
  propose:(inventory,buildingId,images,{levelId})=>{assert.equal(inventory,f.inventory);assert.equal(buildingId,'house');assert.equal(images,f.images);calls.propose.push(levelId);return clone(f.proposals[levelId]);},
  roofProposal:(...args)=>{calls.roof.push(args[0].levelId);return R.roofProposal(...args);},
  lowerPlanes:(...args)=>{calls.lower++;return R.lowerPlanes(...args);},
  secondaryVolumes:(...args)=>{calls.secondary++;return R.secondaryVolumes(...args);}},MIRGridRegistration:Grid,MIRReconstructedRoofs:Roof,MIRReconstructedExterior:{...Exterior,buildRegisteredWallZones:(...args)=>{calls.wallZones++;return Exterior.buildRegisteredWallZones(...args);},build:()=>{calls.exterior++;throw Error('unregistered exterior assembly cannot be cloned onto every level');}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/plan-reconstruction-pipeline.js'),'utf8'),{window});
 return {api:window.MIRReconstructionPipeline,calls};
}
const f=fixture(),before=clone(f.inventory),{api,calls}=pipeline(f),result=api.build(f.inventory,'house',f.images);
assert.equal(result.status,'partial-proposal');assert.equal(result.complete,false);assert.equal(result.levels.length,4);assert.equal(result.reports.length,4);assert.deepEqual(f.inventory,before,'analysis preserves source inventory');
const reconstructed={...f.inventory,levels:clone(result.levels)},scene=M.scene(reconstructed,'house',{includeProposed:true});
assert.equal(scene.walls.length,16,'all four registered contours produce real nonempty wall geometry');assert.equal(new Set(scene.walls.map(w=>w.id)).size,16);assert.equal(M.scene(reconstructed,'house').walls.length,0,'registration never confirms proposals or quantities');
for(let n=0;n<4;n++){
 const level=result.levels.find(l=>l.id==='house:level-'+n),c=level.contours[0],report=result.reports.find(r=>r.levelId===level.id),walls=scene.walls.filter(w=>w.levelId===level.id);
 assert.equal(report.levelRegistration.status,'proposed');near(c.base.value,n*3);near(c.height.value,3);assert.equal(c.height.references[0].relationship.kind,'floor-to-elevation-span');assert.ok(c.height.references[0].relationship.sourcePlanSpan);assert.equal(c.height.references[0].relationship.sourceReference.sourceViewId,c.sourceViewId,'prepare retains the height-transfer provenance');
 assert.equal(walls.length,4);assert.ok(walls.every(w=>Math.abs(w.base-n*3)<1e-9&&Math.abs(w.height-3)<1e-9));assert.ok(walls.flatMap(w=>w.poly).every(p=>Math.abs(p[2]-n*3)<1e-9||Math.abs(p[2]-(n+1)*3)<1e-9));assert.equal(level.wallOpenings.length,1,'one source frame belongs only to this level');assert.ok(Math.abs(level.wallOpenings[0].height-1)<=.04,'frame bounds remain within two raster pixels of the one metre synthetic opening');assert.ok(report.issues.includes('EXTERIOR_ASSEMBLY_LEVEL_MATCH_REQUIRED'));
 assert.deepEqual(M.modelPoints(c).map(p=>p.map(x=>Math.round(x*1e6)/1e6)),[[0,0],[10.8,0],[10.8,-6],[0,-6]],'different source rasters share a metric grid without changing their own source points');
}
assert.equal(new Set(result.levels.flatMap(l=>l.wallOpenings.map(o=>o.sourceId))).size,4,'a frame is never deducted twice');assert.deepEqual(calls.roof,['house:level-3']);assert.equal(calls.lower,0);assert.equal(calls.secondary,0);assert.equal(calls.exterior,0);assert.ok(!result.levels.some(l=>l.id.includes('observed-ground')));
const roofs=result.levels.flatMap(l=>l.reconstructedRoofs||[]);assert.equal(roofs.length,1);assert.equal(roofs[0].levelId,'house:level-3');near(Math.min(...roofs[0].profiles.x.map(p=>p[1])),12);assert.ok(X.scene(reconstructed,'house',{includeProposed:true}).roofs.length>0,'the top roof reaches the actual 3D scene');
for(const options of [{missingZ:true},{conflictingZ:true}]){const bad=fixture(options),p=pipeline(bad),output=p.api.build(bad.inventory,'house',bad.images);assert.equal(output.status,'unresolved');assert.equal(output.levels.length,4);assert.ok(output.reports.every(r=>r.issues.includes('LEVEL_ALIGNMENT_REQUIRED')));assert.ok(output.levels.every(l=>l.contourDraft&&!(l.contours?.length)));assert.equal(M.scene({...bad.inventory,levels:output.levels},'house',{includeProposed:true}).walls.length,0);}
// The other elevation has no compatible datum pair. Its absent calibration
// remains explicit, while a calibrated front still supports a partial model.
const incomplete=fixture();for(const p of Object.values(incomplete.proposals))p.views[1].guides=[];const incompletePipeline=pipeline(incomplete),prepared=incompletePipeline.api.prepare(clone(incomplete.proposals['house:level-0']),incomplete.inventory,incomplete.inventory.levels[0]);assert.deepEqual(clone(prepared.elevationCalibrations.map(c=>c.sourceViewId)),['elevation-front']);const incompleteResult=incompletePipeline.api.build(incomplete.inventory,'house',incomplete.images);assert.equal(incompleteResult.status,'partial-proposal');assert.ok(incompleteResult.reports.every(r=>r.levelRegistration.z.base.references.every(e=>e.sourceViewId==='elevation-front')));assert.equal(incompleteResult.levels.flatMap(l=>l.reconstructedRoofs||[]).length,0,'an unregistered side elevation cannot close the roof');
const noAxis=fixture({omitAxis:true}),noAxisPipeline=pipeline(noAxis),partial=noAxisPipeline.api.build(noAxis.inventory,'house',noAxis.images),unregistered=partial.levels.find(l=>l.id==='house:level-1');assert.ok(unregistered.contourDraft);assert.equal(unregistered.contours.length,0);assert.ok(partial.reports.find(r=>r.levelId===unregistered.id).issues.includes('GRID_AXES_INSUFFICIENT'));assert.equal(M.wallsFor(unregistered,noAxis.inventory,{includeProposed:true}).length,0);
// Persistence does not invoke the source proposal seam again or replace a
// user's reviewed finish. Existing proposed geometry is protected as well.
const saved=clone(reconstructed),wall=scene.walls[0];saved.levels.find(l=>l.id===wall.levelId).wallFinishes={[wall.id]:{materialId:'synthetic-brick',color:'#4b5563'}};const savedBefore=clone(saved),again=pipeline({...f,inventory:saved});const preserved=again.api.build(saved,'house',f.images);assert.equal(preserved.status,'preserved');assert.equal(preserved.levels.length,0);assert.equal(again.calls.propose.length,0);assert.deepEqual(saved,savedBefore);assert.deepEqual(M.scene(JSON.parse(JSON.stringify(saved)),'house',{includeProposed:true}),M.scene(saved,'house',{includeProposed:true}),'JSON save/reopen preserves wall geometry and finishes');
// A saved level already fixes the project frame. Analysing remaining floors
// may not silently rebase its next storey to zero on top of the saved walls.
const mixed=fixture();mixed.inventory.levels[0]=clone(result.levels[0]);mixed.inventory.levels[0].wallFinishes={[scene.walls[0].id]:{materialId:'synthetic-saved-finish'}};const mixedBefore=clone(mixed.inventory.levels[0]),mixedPipeline=pipeline(mixed),mixedResult=mixedPipeline.api.build(mixed.inventory,'house',mixed.images);
assert.deepEqual(mixed.inventory.levels[0],mixedBefore);assert.equal(mixedResult.reports.find(r=>r.levelId==='house:level-0').status,'preserved');
for(const level of mixedResult.levels){assert.equal(level.contours?.length||0,0,'new floors cannot silently choose a new coordinate zero over a saved level');assert.ok(level.contourDraft,'an unresolved relation to a saved frame retains the proposed source contour');assert.ok(mixedResult.reports.find(r=>r.levelId===level.id).issues.includes('LEVEL_ALIGNMENT_REQUIRED'));assert.ok(mixedResult.reports.find(r=>r.levelId===level.id).issues.includes('EXISTING_LEVEL_FRAME_REQUIRED'));}
// Actual masonry source pixels enter the same fully registered pipeline.
// The surface pass must run once across levels without opening the existing
// guard for unregistered balconies, columns, foundations or entry roofs.
const cladding=fixture(),front=cladding.inventory.views.find(v=>v.id==='elevation-front'),im=cladding.images[front.id];front.payload.drawingReadings={rows:[{text:'BRIQUE',confidence:100,source:'pdf-text',box:[800,300,880,312]}]};
const ink=(x,y)=>im.data.set([50,50,50,255],(y*im.width+x)*4);for(let row=0;row<=40;row++){const y=350+row*15;for(let x=400;x<=650;x++)ink(x,y);if(row<40)for(let x=400+(row%2?15:0);x<=650;x+=30)for(let yy=y;yy<=y+15;yy++)ink(x,yy);}
const cladPipeline=pipeline(cladding),cladResult=cladPipeline.api.build(cladding.inventory,'house',cladding.images);assert.equal(cladPipeline.calls.wallZones,1);assert.equal(cladPipeline.calls.exterior,0);assert.equal(cladResult.levels.length,4);
for(const l of cladResult.levels){assert.ok(l.wallZones.length>0,'each registered level keeps nonempty source cladding');assert.ok(l.wallZones.every(z=>z.levelId===l.id&&z.buildingId==='house'));assert.deepEqual(X.proposalIssues(l,cladding.inventory),[]);const report=cladResult.reports.find(r=>r.levelId===l.id);assert.equal(report.exterior.zones,l.wallZones.length);assert.ok(report.issues.includes('EXTERIOR_ASSEMBLY_LEVEL_MATCH_REQUIRED'));assert.equal(l.exteriorElements?.length||0,0);}
console.log('PASS multilevel pipeline: source-local scales, metric XYZ, nonempty stable walls, per-level openings, one top roof, explicit missing data and preserved saved projects');
