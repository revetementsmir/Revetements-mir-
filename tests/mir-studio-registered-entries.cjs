'use strict';
// Only source proposal discovery is supplied by this synthetic fixture. The
// metric grid, datum network, XYZ contours, source pixels, entry extraction,
// pipeline integration and rendered roof faces use the production modules.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const M=require('../dist/plan-level-model.js'),R=require('../dist/plan-reconstruction.js'),Grid=require('../dist/plan-grid-registration.js'),Exterior=require('../dist/plan-reconstructed-exterior.js'),Roof=require('../dist/plan-reconstructed-roofs.js'),X=require('../dist/studio-exterior-model.js'),V=require('../dist/plan-reconstruction-vision.js');
const copy=structuredClone,near=(actual,expected,tolerance=.025)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);
const blank=(height=1200)=>({width:1600,height,data:new Uint8ClampedArray(1600*height*4).fill(255)});
function pixel(image,x,y){x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<image.width&&y<image.height)image.data.set([0,0,0,255],(y*image.width+x)*4);}
function line(image,x1,y1,x2,y2){const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=n;i++)pixel(image,x1+(x2-x1)*i/n,y1+(y2-y1)*i/n);}
function rectangle(image,x,y,w,h){line(image,x,y,x+w,y);line(image,x+w,y,x+w,y+h);line(image,x+w,y+h,x,y+h);line(image,x,y+h,x,y);}
function circle(image,rows,label,x,y){for(let a=0;a<360;a++)for(const d of [-1,0,1])pixel(image,x+Math.cos(a*Math.PI/180)*(17+d),y+Math.sin(a*Math.PI/180)*(17+d));rows.push({text:label,confidence:99,box:[x-4,y-4,x+4,y+4]});}
function frontEntry(image,{x=300,beam=814,foot=1050,width=420,rise=50}={}){
 rectangle(image,x,beam,width,16);for(const at of [x,x+10,x+width-10,x+width])line(image,at,beam+16,at,foot);
 const eave=beam-10,crest=eave-rise,hip=Math.min(90,width*.3);line(image,x-20,eave,x+hip,crest);line(image,x+hip,crest,x+width-hip,crest);line(image,x+width-hip,crest,x+width+20,eave);line(image,x-20,eave,x+width+20,eave);
}
function sideEntry(image,{post=180,beam=814,foot=1050,rise=50}={}){
 rectangle(image,post,beam,300-post,16);for(const x of [post,post+10])line(image,x,beam+16,x,foot);
 const eave=beam-10,crest=eave-rise;line(image,post-20,eave,300,crest);line(image,post-20,eave,300,eave);line(image,300,crest,300,eave);
}
function fixture({groundRise=50,groundFoot=1050,groundEntries=[{}]}={}){
 const floors=[0,1].map(n=>{
  const image=blank(1000),rows=[],dx=n*13,dy=n*-7;
  for(const [label,x,y]of [['1',150,70],['2',550,70],['3',950,70],['4',1350,70],['A',100,250],['B',100,850]])circle(image,rows,label,x+dx,y+dy);
  rectangle(image,150+dx,250+dy,1200,600);
  const view={id:'synthetic-floor-'+n,buildingId:'synthetic-house',levelId:'level-'+n,kind:'floor',page:n+1,frame:{units:'pixels',rasterSize:[1600,1000]},payload:{drawingReadings:{rows}}},level={id:'synthetic-house:level-'+n,buildingId:'synthetic-house',sourceLevel:'level-'+n,contours:[]},draft=M.draftFor(view,level);
  draft.reference={value:12,scale:.01,anchors:[[150+dx,850+dy],[1350+dx,850+dy]],kind:'written',status:'proposed',sourceViewId:view.id,label:'Synthetic 12 m source span',confidence:99};
  draft.points=[[150,250],[1350,250],[1350,850],[150,850]].map(([x,y],i)=>({id:'p'+i,xy:[x+dx,y+dy]}));draft.alignment={origin:draft.points[3].xy,offset:[0,0],rotationDegrees:0,status:'proposed'};draft.status='proposed';
  return {image,view,level,draft};
 });
 const images=Object.fromEntries(floors.map(f=>[f.view.id,f.image])),elevations=['front','right'].map(direction=>{
  const image=blank(),rows=[],view={id:'synthetic-elevation-'+direction,buildingId:'synthetic-house',kind:'elevation',direction,page:direction==='front'?3:4,frame:{units:'pixels',rasterSize:[1600,1200]},payload:{drawingReadings:{rows}}};
  for(const [label,x]of direction==='front'?[['1',150],['2',550],['3',950],['4',1350]]:[['A',900],['B',300]])circle(image,rows,label,x,70);
  if(direction==='front')rows.push({text:'Colonnes et poutres',source:'pdf-text',confidence:100,box:[1380,350,1580,370]});
  images[view.id]=image;return view;
 });
 const views=elevations.map(view=>{
  const guides=[{levelHint:'level-0',datumType:'floor',y:1050},{levelHint:'level-1',datumType:'floor',y:750},{levelHint:'level-1',datumType:'ceiling',y:450}].map(g=>({...g,sourceViewId:view.id,sourceFrame:copy(view.frame),confidence:99,label:'Synthetic '+g.levelHint+' '+g.datumType,box:[1400,g.y-16,1540,g.y-6],sourceGuide:{method:'caption-and-visible-monochrome-datum-stroke',support:1,anchors:[[1390,g.y],[1550,g.y]]}}));
  for(const g of guides)line(images[view.id],1390,g.y,1550,g.y);
  const front=view.direction==='front';return {viewId:view.id,direction:view.direction,envelope:{status:'proposed',sourceViewId:view.id,sourceFrame:copy(view.frame),box:[front?150:300,450,front?1200:600,600],occlusions:[]},facing:{axis:front?0:1,min:front?150:250,max:front?1350:850,length:front?1200:600},supportY:450,guides};
 });
 const inventory={views:[...floors.map(f=>f.view),...elevations],levels:floors.map(f=>f.level)},proposals={};
 for(const f of floors){const height=R.heightFromLevelDatums(views,f.view.levelId,f.draft.reference,inventory)[0];assert.ok(height,'two actual source datums must establish the level height');near(height.value,3,1e-9);f.draft.height=height;proposals[f.level.id]={status:'proposed',buildingId:'synthetic-house',levelId:f.level.id,sourceViewId:f.view.id,draft:f.draft,views:copy(views),referenceCandidates:[copy(f.draft.reference)],contourDimensions:[],sourceOpeningGaps:[],openingSizeCandidates:[]};}
 for(const entry of groundEntries)frontEntry(images['synthetic-elevation-front'],{rise:groundRise,foot:groundFoot,...entry});sideEntry(images['synthetic-elevation-right'],{rise:groundRise,foot:groundFoot});
 frontEntry(images['synthetic-elevation-front'],{x:820,beam:514,foot:750});sideEntry(images['synthetic-elevation-right'],{post:120,beam:514,foot:750});
 return {inventory,images,proposals};
}
function pipeline(f){
 const calls={legacyExterior:0,registeredEntries:0},window={MIRLevelModel:M,MIRPlanReconstruction:{...R,propose:(_inventory,_building,_images,{levelId})=>copy(f.proposals[levelId])},MIRGridRegistration:Grid,MIRReconstructedRoofs:Roof,MIRReconstructedExterior:{...Exterior,build:()=>{calls.legacyExterior++;throw Error('The unregistered exterior path must remain guarded');},...(Exterior.buildRegisteredEntries?{buildRegisteredEntries:(...args)=>{calls.registeredEntries++;return Exterior.buildRegisteredEntries(...args);}}:{})}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/plan-reconstruction-pipeline.js'),'utf8'),{window});
 return {result:window.MIRReconstructionPipeline.build(f.inventory,'synthetic-house',f.images),calls};
}
const roofs=result=>result.levels.flatMap(l=>(l.reconstructedRoofs||[]).filter(r=>r.entryAssembly));
async function localGridFixture(){
 const f=fixture(),symbols=new Map(),file={id:'synthetic-retained-pdf',sha256:'synthetic-retained-source-digest'};f.inventory.files=[file];
 for(const view of f.inventory.views){view.fileId=file.id;view.payload.sourceImage=view.id;view.payload.sourceWidth=f.images[view.id].width;view.payload.sourceHeight=f.images[view.id].height;const rows=view.payload.drawingReadings.rows,labels=rows.filter(r=>/^(?:\d{1,2}|[A-Z])$/.test(r.text));symbols.set(view.id,labels);view.payload.drawingReadings.rows=rows.filter(r=>!labels.includes(r));}
 const original=copy(f.inventory),before=copy(original);let terminated=false;
 function canvas(){let width=0,height=0,data=null;const c={get width(){return width;},set width(n){width=n;data=null;},get height(){return height;},set height(n){height=n;data=null;}},pixels=()=>data||(data=new Uint8ClampedArray(width*height*4).fill(255));
  const ctx={fillRect(){pixels().fill(255);},drawImage(image,x,y,w,h,dx,dy,dw,dh){c.source={id:image.src,center:[x+w/2,y+h/2]};const source=f.images[image.src],out=pixels();for(let yy=0;yy<dh;yy++)for(let xx=0;xx<dw;xx++){const sx=Math.min(source.width-1,Math.max(0,Math.floor(x+xx*w/dw))),sy=Math.min(source.height-1,Math.max(0,Math.floor(y+yy*h/dh)));out.set(source.data.subarray((sy*source.width+sx)*4,(sy*source.width+sx)*4+4),((yy+dy)*width+xx+dx)*4);}},getImageData(){return {width,height,data:new Uint8ClampedArray(pixels())};},createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},putImageData(image){data=new Uint8ClampedArray(image.data);}};c.getContext=()=>ctx;return c;
 }
 // OCR recognition is the controlled seam. Crop discovery, source frames,
 // attempt records and retained local readings are the real reader pipeline.
 const worker={async setParameters(){},async recognize(c){const observed=symbols.get(c.source.id).map(r=>({row:r,distance:Math.hypot((r.box[0]+r.box[2])/2-c.source.center[0],(r.box[1]+r.box[3])/2-c.source.center[1])})).sort((a,b)=>a.distance-b.distance)[0];return {data:{text:observed?.distance<12?observed.row.text:'',confidence:observed?.distance<12?99:0,blocks:[]}};},async terminate(){terminated=true;}};
 const context={URL,Uint8ClampedArray,document:{currentScript:{src:'https://synthetic.invalid/plan-reconstruction-readings.js'},createElement(name){assert.equal(name,'canvas');return canvas();}},Image:class{async decode(){}},Tesseract:{async createWorker(){return worker;}},MIRGridRegistration:Grid};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/plan-reconstruction-readings.js'),'utf8'),context);
 const refined=await context.MIRReconstructionReadings.refine(f.inventory,'synthetic-house',{images:f.images});assert.ok(terminated);assert.deepEqual(f.inventory,before,'local OCR preserves the original source views');assert.ok(refined.evidence.length>=15);
 const result=pipeline({...f,inventory:refined.inventory}).result;result.localReadingRetries=copy(refined.evidence);for(const level of result.levels)level.reconstruction.proposal.localReadingRetries=copy(refined.evidence);
 return {inventory:original,result};
}
module.exports={fixture,pipeline,roofs,localGridFixture};
if(require.main===module){(async()=>{
const fingerprints=images=>Object.fromEntries(Object.entries(images).map(([id,image])=>[id,crypto.createHash('sha256').update(image.data).digest('hex')]));
const f=fixture(),before=copy(f.inventory),pixelsBefore=fingerprints(f.images),{result,calls}=pipeline(f),entries=roofs(result);
assert.equal(result.levels.length,2);assert.ok(result.levels.every(l=>M.wallsFor(l,f.inventory,{includeProposed:true}).length===4),'both source plans establish real registered wall geometry');
assert.equal(entries.length,2,'individually observed entry roofs must survive on their own registered levels');
assert.equal(calls.legacyExterior,0);assert.equal(calls.registeredEntries,1,'registered entry ownership is resolved once across the completed level stack');
const scene={...f.inventory,levels:copy(result.levels)};
for(let n=0;n<2;n++){
 const level=result.levels.find(l=>l.sourceLevel==='level-'+n),roof=entries.find(r=>r.levelId===level.id),walls=M.wallsFor(level,f.inventory,{includeProposed:true}),wall=walls.find(w=>w.id===roof.entryAssembly.parentWallId);
 assert.ok(wall);near(wall.base,n*3,1e-9);near(wall.from[1],-6,1e-9);near(roof.connection.wallY,-6,1e-9);assert.equal(roof.buildingId,'synthetic-house');
 near(roof.profiles.x[0][0],n?6.5:1.3);near(roof.profiles.x.at(-1)[0],n?11.1:5.9);near(roof.profiles.y[0][0],n?-8:-7.4);near(roof.profiles.y.at(-1)[0],-6,1e-9);
 near(Math.max(...roof.profiles.x.map(p=>p[1])),n*3+2.96);assert.ok(roof.sources.every(s=>s.levelBand?.levelId===level.id&&s.axisRegistration?.status==='proposed'),'each source retains its own two-datum band and measured XY registration');
 assert.ok(roof.sources.every(s=>s.levelBand.lower.sourceViewId===s.sourceViewId&&s.levelBand.upper.sourceViewId===s.sourceViewId));assert.deepEqual(Roof.issues(roof,{confirm:false}),[]);assert.deepEqual(X.proposalIssues(level,scene),[]);
 const faces=Roof.faces(roof,[0,0],{includeProposed:true}).filter(face=>face.type==='roof');assert.ok(faces.length>=3,'observed profiles create actual nonempty three-dimensional roof faces');assert.ok(faces.flatMap(face=>face.poly).every(p=>p[2]>=wall.base&&p[2]<=wall.base+wall.height+.025));
 assert.ok(faces.flatMap(face=>face.poly).some(p=>Math.abs(p[1]+6)<1e-6),'a generated roof face reaches the registered parent wall');assert.ok(faces.flatMap(face=>face.poly).some(p=>Math.abs(p[1]-(n?-8:-7.4))<.025),'the distinct measured depth reaches the actual mesh');
 assert.equal(level.exteriorElements.filter(e=>e.type==='column').length,2);assert.equal(level.exteriorElements.filter(e=>e.type==='beam').length,2,'only the front and observed right beam faces are constructed');
}
assert.deepEqual(f.inventory,before,'analysis never mutates source inventory');assert.deepEqual(fingerprints(f.images),pixelsBefore,'geometry extraction preserves every source pixel');assert.deepEqual(copy(pipeline(f).result),copy(result),'identities and geometry are stable across repeated analysis');
assert.deepEqual(Roof.faces(copy(entries[0]),[0,0],{includeProposed:true}),Roof.faces(entries[0],[0,0],{includeProposed:true}),'serialized source geometry renders without the source raster');

// Three separately visible porches can be narrower than the legacy detector's
// facade ratio. One side silhouette still cannot establish all three depths.
const repeated=fixture({groundEntries:[240,600,960].map(x=>({x,width:240}))}),frontImage=repeated.images['synthetic-elevation-front'];
const observed=V.canopyEnvelope(frontImage,{status:'proposed',box:[150,750,1200,300],sourceViewId:'synthetic-elevation-front'},750,{all:true});assert.equal(observed.length,3,'three independent pairs of source posts survive candidate extraction');
const repeatResult=pipeline(repeated).result,repeatGround=repeatResult.levels.find(l=>l.sourceLevel==='level-0');assert.equal(roofs(repeatResult).length,1,'only the independently supported upper porch remains');assert.equal(repeatGround.exteriorElements.length,0,'a side observation cannot be cloned into three column/beam assemblies');assert.ok(repeatGround.reconstruction.exterior.issues.includes('ENTRY_SIDE_SOURCE_REUSED'));assert.equal(repeatGround.reconstruction.exterior.conflicts.filter(c=>c.reason==='ENTRY_SIDE_SOURCE_REUSED').length,3);

// Two visible side post groups at the same altitude are competing measured
// depths. Their score/array order cannot decide which belongs to this porch.
const ambiguous=fixture();sideEntry(ambiguous.images['synthetic-elevation-right'],{post:120});const ambiguousResult=pipeline(ambiguous).result,ambiguousGround=ambiguousResult.levels.find(l=>l.sourceLevel==='level-0');assert.equal(roofs(ambiguousResult).length,1);assert.equal(ambiguousGround.exteriorElements.length,0);assert.ok(ambiguousGround.reconstruction.exterior.issues.includes('ENTRY_SIDE_ASSOCIATION_AMBIGUOUS'));

// Removing one of the SIDE's two datums leaves the front observation intact;
// its height cannot silently stand in for the unregistered lateral view.
const missing=fixture();missing.proposals['synthetic-house:level-0'].views.find(v=>v.direction==='right').guides=missing.proposals['synthetic-house:level-0'].views.find(v=>v.direction==='right').guides.filter(g=>g.levelHint!=='level-1');const missingResult=pipeline(missing).result;assert.equal(roofs(missingResult).length,1);assert.ok(missingResult.reports.find(r=>r.levelId==='synthetic-house:level-0').issues.includes('ENTRY_LEVEL_DATUM_PAIR_REQUIRED'));
const noAxis=fixture();noAxis.inventory.views.find(v=>v.id==='synthetic-elevation-right').payload.drawingReadings.rows=noAxis.inventory.views.find(v=>v.id==='synthetic-elevation-right').payload.drawingReadings.rows.filter(r=>r.text!=='B');const noAxisResult=pipeline(noAxis).result;assert.equal(roofs(noAxisResult).length,0);assert.ok(noAxisResult.reports.every(r=>r.issues.includes('ENTRY_GRID_REGISTRATION_REQUIRED')));

// A source crest beyond the supporting storey is retained as an observation,
// not flattened to the floor height or attached to an invented upper wall.
const crossing=fixture({groundRise:85}),crossingResult=pipeline(crossing).result,crossingGround=crossingResult.levels.find(l=>l.sourceLevel==='level-0');assert.equal(roofs(crossingResult).length,1);assert.equal(crossingGround.exteriorElements.filter(e=>e.type==='column').length,2);near(crossingGround.contours[0].height.value,3,1e-9);const crossingEvidence=crossingGround.reconstruction.exterior.conflicts.find(c=>c.reason==='ENTRY_ROOF_WALL_LEVEL_UNRESOLVED');assert.ok(crossingEvidence);near(Math.max(...crossingEvidence.worldProfile.map(p=>p[1])),3.31);near(crossingEvidence.wallBand.top,3,1e-9);assert.equal(crossingEvidence.sourceViewId,'synthetic-elevation-front');
const lowerFoot=pipeline(fixture({groundFoot:1100})).result,footLevel=lowerFoot.levels.find(l=>l.sourceLevel==='level-0');assert.equal(roofs(lowerFoot).length,1);assert.equal(footLevel.exteriorElements.length,0);const footEvidence=footLevel.reconstruction.exterior.conflicts.find(c=>c.reason==='ENTRY_COLUMN_LEVEL_MATCH_UNRESOLVED');assert.ok(footEvidence);assert.ok(footEvidence.worldHeights.every(h=>h.base<0),'source feet below the registered floor remain observations, not an invented foundation level');

// Identity and storage guards use the actual production-registered contours.
function undecorated(){return copy(result.levels).map(l=>{l.exteriorElements=[];l.wallZones=[];l.reconstructedRoofs=(l.reconstructedRoofs||[]).filter(r=>!r.entryAssembly);return l;});}
const stale=undecorated();stale[0].contours[0].alignment.offset[0]+=.5;const staleResult=Exterior.buildRegisteredEntries(f.inventory,'synthetic-house',f.images,stale);assert.equal(staleResult.byLevel[0].reconstructedRoofs.length,0);assert.ok(staleResult.byLevel[0].issues.includes('EXTERIOR_LEVEL_REGISTRATION_UNRESOLVED'));
const changedFrame=fixture();changedFrame.inventory.views.find(v=>v.id==='synthetic-elevation-right').frame.registrationRevision='different-source-frame';const changedResult=Exterior.buildRegisteredEntries(changedFrame.inventory,'synthetic-house',changedFrame.images,undecorated());assert.equal(changedResult.byLevel.flatMap(l=>l.reconstructedRoofs).length,0);assert.ok(changedResult.issues.includes('EXTERIOR_SOURCE_FRAME_MISMATCH'));
assert.equal(Exterior.buildRegisteredEntries(f.inventory,'different-building',f.images,undecorated()).byLevel.length,0,'another building cannot borrow the source registrations or entries');
const saved=JSON.parse(JSON.stringify(scene));for(const level of saved.levels){const roof=(level.reconstructedRoofs||[]).find(r=>r.entryAssembly);level.roofFinishes={[roof.id]:{color:'#34495e'}};}const savedBefore=copy(saved),savedAnalysis=pipeline({...f,inventory:saved});assert.equal(savedAnalysis.result.status,'preserved');assert.equal(savedAnalysis.calls.registeredEntries,0);assert.deepEqual(saved,savedBefore,'saved geometry and client finishes remain untouched');for(const level of saved.levels)assert.deepEqual(X.proposalIssues(level,saved),[]);assert.deepEqual(JSON.parse(JSON.stringify(saved)),saved,'two-datum/axis observations and client choices survive JSON storage');

// A matching mutable snapshot is insufficient after saving. Recompute the
// source-to-world relation and the roof profile from retained source anchors.
const rejectEvidence=(mutate,code,label)=>{const inventory=copy(scene),level=inventory.levels[0],roof=level.reconstructedRoofs.find(r=>r.entryAssembly);mutate(level,inventory,roof);const untouched=copy(inventory);assert.ok(X.proposalIssues(level,inventory).includes(code),label);assert.deepEqual(inventory,untouched,'semantic validation is read-only');};
const syncContour=level=>{const c=level.contours[0];c.levelRegistration.alignment=copy(c.alignment);c.levelRegistration.xy.alignment=copy(c.alignment);c.levelRegistration.base=copy(c.base);c.levelRegistration.z.base=copy(c.base);level.reconstruction.proposal.draft=copy(c);};
rejectEvidence(level=>{level.contours[0].alignment.offset[0]+=.5;},'ENTRY_REGISTERED_CONTOUR','moving the contour invalidates its old entry proof');
rejectEvidence(level=>{level.contours[0].points[0].xy[0]+=10;},'ENTRY_REGISTERED_CONTOUR','changing source contour vertices invalidates their retained entry proof');
rejectEvidence(level=>{level.contours[0].base.value+=.4;},'ENTRY_REGISTERED_CONTOUR','changing the storey base invalidates its old source altitudes');
rejectEvidence(level=>{const c=level.contours[0];c.alignment.offset[0]+=.5;c.levelRegistration.xy.offset=copy(c.alignment.offset);syncContour(level);},'ENTRY_REGISTERED_CONTOUR','a rewritten contour snapshot cannot replace the measured named-grid offset');
rejectEvidence((level,_inventory,roof)=>{level.contours[0].base.value+=.4;syncContour(level);for(const profile of Object.values(roof.profiles))for(const p of profile)p[1]+=.4;roof.geometrySnapshot=copy(roof.profiles);},'ENTRY_REGISTERED_CONTOUR','rewriting both the altitude/profile and a snapshot cannot move the observed zero datum');
rejectEvidence((_level,_inventory,roof)=>{roof.sources[0].axisRegistration.floorSourceViewId='synthetic-floor-1';},'ENTRY_REGISTERED_SOURCE','an entry cannot borrow the other storey source plan');
rejectEvidence((_level,inventory,roof)=>{const view=inventory.views.find(v=>v.id===roof.sources[0].sourceViewId);view.frame.registrationRevision='changed';roof.sources[0].sourceFrame=copy(view.frame);roof.sources[0].axisRegistration.sourceFrames.elevation=copy(view.frame);},'ENTRY_REGISTERED_CONTOUR','updating an outer frame does not update the recorded grid source frame');
rejectEvidence((_level,_inventory,roof)=>{roof.sources[0].axisRegistration.transform.offsetPixels+=20;},'ENTRY_REGISTERED_AXIS','a mutable metric transform is rederived from the observed source axes');
rejectEvidence((_level,_inventory,roof)=>{roof.sources[0].axisRegistration.pixelRegistration.transform.offset+=20;roof.sources[0].axisRegistration.transform.offsetPixels+=20;},'ENTRY_REGISTERED_AXIS','rewriting raw and metric transforms still disagrees with retained labelled source points');
rejectEvidence((_level,inventory,roof)=>{inventory.views.find(v=>v.id===roof.sources[0].sourceViewId).payload.drawingReadings.rows.find(r=>r.text==='2').text='7';},'ENTRY_REGISTERED_AXIS','a changed grid label invalidates its old correspondence');
rejectEvidence((_level,_inventory,roof)=>{roof.sources[1].levelBand.levelId='synthetic-house:level-1';},'ENTRY_REGISTERED_DATUM','the lateral band belongs to this storey');
rejectEvidence((_level,_inventory,roof)=>{roof.sources[1].levelBand.lower.y-=10;roof.sources[1].levelBand.bottomY-=10;},'ENTRY_REGISTERED_DATUM','the two source datums are independently revalidated');
rejectEvidence((_level,_inventory,roof)=>{for(const p of roof.profiles.x)p[1]+=.2;roof.geometrySnapshot={profiles:copy(roof.profiles)};},'ENTRY_REGISTERED_PROFILE','a changed profile plus matching snapshot cannot replace unchanged source anchors');
rejectEvidence((_level,_inventory,roof)=>{roof.sources[0].anchors[1][1]-=10;roof.profiles.x[1][1]+=.1;},'ENTRY_REGISTERED_PROFILE','a changed anchor and metric profile still disagree with the retained observed stroke');
rejectEvidence((_level,_inventory,roof)=>{roof.connection.wallY+=.3;},'ENTRY_REGISTERED_ATTACHMENT','the current wall determines the actual attachment coordinate');
rejectEvidence((_level,_inventory,roof)=>{delete roof.sources[1].axisRegistration;},'ENTRY_REGISTERED_SOURCE','partial loss of registered evidence cannot silently become a legacy source');
for(const mutate of [r=>{r.sources[0].axisRegistration=null;},r=>{r.sources[0].levelBand=null;},r=>{r.sources[0].axisRegistration.checks='bad';}])rejectEvidence((_level,_inventory,roof)=>mutate(roof),'ENTRY_REGISTERED_SOURCE','malformed registered evidence reports an issue without throwing');
const confirmed=copy(scene);for(const level of confirmed.levels){for(const c of level.contours){c.status='confirmed';for(const key of ['reference','height','base','alignment'])c[key].status='confirmed';}for(const element of level.exteriorElements)element.status='confirmed';for(const roof of level.reconstructedRoofs)roof.status='confirmed';assert.deepEqual(X.registeredSourceIssues(level,confirmed),[],'the dedicated saved-geometry guard permits confirmation without changing the source geometry');assert.deepEqual(X.historyIssues(level,scene.levels.find(l=>l.id===level.id)),[],'confirmation preserves the independent original observations');}
const oldLevel=scene.levels[0],finished=copy(oldLevel);finished.roofFinishes={[finished.reconstructedRoofs[0].id]:{color:'#123456'}};assert.deepEqual(X.historyIssues(finished,oldLevel),[]);assert.deepEqual(X.registeredSourceIssues(finished,scene),[]);
const erased=copy(oldLevel);for(const roof of erased.reconstructedRoofs)for(const source of roof.sources){delete source.axisRegistration;delete source.levelBand;}assert.ok(X.historyIssues(erased,oldLevel).includes('ENTRY_REGISTERED_EVIDENCE_LOST'),'history detects deletion of every field that distinguished the new source contract');
const erasedElement=copy(oldLevel);delete erasedElement.exteriorElements[0].provenance;assert.ok(X.historyIssues(erasedElement,oldLevel).includes('ENTRY_REGISTERED_EVIDENCE_LOST'));assert.ok(X.historyIssues(null,oldLevel).includes('ENTRY_REGISTERED_EVIDENCE_LOST'));
const rewritten=copy(oldLevel);rewritten.reconstructedRoofs[0].sources[0].anchors[0][0]+=1;assert.ok(X.historyIssues(rewritten,oldLevel).includes('ENTRY_REGISTERED_EVIDENCE_CHANGED'),'history prevents rewriting source anchors along with a new profile');
const stripProof=value=>{if(!value||typeof value!=='object')return;delete value.axisRegistration;delete value.levelBand;for(const child of Object.values(value))stripProof(child);},legacy=copy(oldLevel);stripProof(legacy);assert.deepEqual(X.registeredSourceIssues(legacy,scene),[],'historical elements and roofs without the new evidence contract gain no new mandatory fields');assert.deepEqual(X.historyIssues(null,legacy),[],'legacy history rules are unchanged');

// saveReconstruction preserves original view rows. Refined grid labels live
// only in localReadingRetries, then in each stored reconstruction proposal.
const local=await localGridFixture(),originalViews=copy(local.inventory.views),validationInventory={...local.inventory,levels:copy(local.result.levels),localReadingRetries:copy(local.result.localReadingRetries)};
assert.equal(roofs(local.result).length,2);assert.ok(local.inventory.views.every(v=>v.payload.drawingReadings.rows.every(r=>!/^(?:\d{1,2}|[A-Z])$/.test(r.text))));
for(const level of local.result.levels)assert.deepEqual(X.proposalIssues(level,validationInventory),[],'the exact OCR attempts validate against untouched original source views');
const reopened=JSON.parse(JSON.stringify(validationInventory));delete reopened.localReadingRetries;for(const level of reopened.levels)assert.deepEqual(X.proposalIssues(level,reopened),[],'stored proposal retries remain sufficient after JSON reopen');assert.deepEqual(local.inventory.views,originalViews);
for(const mutate of [r=>{r.retry.sourceViewId='foreign-view';},r=>{r.retry.sourceFileId='foreign-file';},r=>{r.retry.sourcePage+=1;},r=>{r.retry.sourceFrame={wrong:true};},r=>{r.retry.region=[0,0,1,1];},r=>{r.retry.labelConflict=true;},r=>{r.retry.gridCircle.center[0]+=20;},r=>{r.retry.attempts[0].token='77';}]){
 const broken=copy(reopened),level=broken.levels[0],row=level.reconstruction.proposal.localReadingRetries.find(r=>r.sourceViewId==='synthetic-floor-0'&&r.text==='2');assert.ok(row);mutate(row);assert.ok(X.proposalIssues(level,broken).includes('ENTRY_REGISTERED_CONTOUR'),'a retained local label requires its exact view/file/page/frame/crop and compatible OCR attempt');
}
console.log('PASS registered entry roofs: production grid/datums and XYZ meshes, unique depths, ambiguity/source/attachment refusals, semantic replay after JSON storage, immutable observations and guarded legacy path');
})().catch(error=>{console.error(error);process.exitCode=1;});}
