'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),R=require('../dist/plan-reconstruction.js'),G=require('../dist/plan-grid-registration.js');
const {makeMeasuredWitnessScene,image,stroke}=require('./mir-studio-native-witness-measurement.cjs');
const clone=structuredClone;
async function datumRegistrationFixture(){
 const s=await makeMeasuredWitnessScene(),view=s.view,im=s.image;
 const floor={id:'roof-datum-floor',kind:'floor',buildingId:view.buildingId,levelId:'level-3',fileId:view.fileId,page:2,frame:clone(view.frame),payload:{sourceWidth:720,sourceHeight:1200,drawingReadings:{rows:[]}}},plan=image(720,1200);
 for(const [v,raster,y]of [[floor,plan,70],[view,im,80]])for(const [label,x]of [['1',100],['2',300],['3',500]]){
  for(let a=0;a<360;a++)for(const dr of [-1,0,1]){const xx=Math.round(x+Math.cos(a*Math.PI/180)*(16+dr)),yy=Math.round(y+Math.sin(a*Math.PI/180)*(16+dr));raster.data.set([20,20,20,255],4*(yy*raster.width+xx));}
  v.payload.drawingReadings.rows.push({text:label,box:[x-5,y-5,x+5,y+5],confidence:97});
 }
 for(const [label,y]of [['A',300],['B',900]]){const x=60;for(let a=0;a<360;a++)for(const dr of [-1,0,1]){const xx=Math.round(x+Math.cos(a*Math.PI/180)*(16+dr)),yy=Math.round(y+Math.sin(a*Math.PI/180)*(16+dr));plan.data.set([20,20,20,255],4*(yy*plan.width+xx));}floor.payload.drawingReadings.rows.push({text:label,box:[x-5,y-5,x+5,y+5],confidence:97});}
 // Another storey's native dimension calibrates this same elevation. Its own
 // target ceiling is visible; the target floor caption is deliberately absent.
 view.payload.drawingReadings.rows.push({text:'PLAFOND NIVEAU 3',box:[400,336,550,346],confidence:95});stroke(im,[210,350.5],[600,350.5],1);
 const level={id:'roof-datum-level-3',sourceLevel:'level-3',buildingId:view.buildingId},reviewed={version:1,status:'proposed',contourId:'roof-datum-contour',levelId:level.id,sourceViewId:floor.id,buildingId:view.buildingId,points:[[120,600],[480,600],[480,300],[120,300]].map((xy,i)=>({id:'rd-'+i,xy})),reference:{sourceViewId:floor.id,value:7.2,anchors:[[120,600],[480,600]],kind:'written',status:'proposed'},alignment:{origin:[120,600],offset:[0,0],rotationDegrees:0},base:{value:6,kind:'source-datum',status:'proposed'},height:{value:2.79,relationship:'two-visible-level-datums',datumEvidence:{lower:{levelHint:'level-3',datumType:'floor'},upper:{levelHint:'level-3',datumType:'ceiling'}}}};
 const guides=R.floorGuide(view,im,{status:'unresolved'}),inventory={...s.inventory,views:[floor,view],levels:[...s.inventory.levels,level]},images={[floor.id]:plan,[view.id]:im},envelope=R.gridElevationEnvelope(G,floor,view,images,{sourceViewId:floor.id,points:reviewed.points.map(p=>p.xy)},guides),info={viewId:view.id,direction:view.direction,envelope,axisRegistration:envelope.registration,guides};
 assert.equal(envelope.reason,'ELEVATION_GRID_LEVEL_DATUM_REQUIRED');
 const registration=R.roofElevationRegistration(info,reviewed,inventory);assert.ok(registration);
 return {s,inventory,reviewed,info,registration};
}
function browserDatumGuardContract(f){
 // Exercise the browser exports without CommonJS. Every dependency and the
 // datum validator are real production modules; no accepting guard is stubbed.
 const browser={
  MIRLevelModel:require('../dist/plan-level-model.js'),MIRReconstructionVision:require('../dist/plan-reconstruction-vision.js'),
  MIRPDFAnalysis:require('../dist/plan-import-core.js'),MIRSpatialDimensions:require('../dist/plan-spatial-dimensions.js'),
  MIRGridRegistration:G,MIRReconstructedRoofs:require('../dist/plan-reconstructed-roofs.js'),
  MIRRoofPitchEvidence:require('../dist/plan-roof-pitch-evidence.js'),MIRRoofHipCandidates:require('../dist/plan-roof-hip-candidates.js'),
  MIRDimensionSourceEvidence:require('../dist/plan-dimension-source-evidence.js'),MIRNativeWitnessMeasurement:require('../dist/plan-native-witness-measurement.js')
 };
 browser.window=browser;vm.createContext(browser);
 for(const file of ['plan-roof-plan-evidence.js','plan-reconstruction.js'])vm.runInContext(fs.readFileSync(require.resolve('../dist/'+file),'utf8'),browser,{filename:file});
 const actual=browser.MIRPlanReconstruction,plain=value=>JSON.parse(JSON.stringify(value));
 assert.equal(browser.MIRReconstruction,undefined,'The page publishes MIRPlanReconstruction, without an alternate alias.');
 assert.deepEqual(plain(actual.roofDatumRegistrationIssues(f.registration.datumRegistration,f.reviewed,f.inventory)),[],'The browser export validates the actual synthetic native-datum proof.');
 const changed=clone(f.registration.datumRegistration);changed.sourcePage++;
 assert.ok(actual.roofDatumRegistrationIssues(changed,f.reviewed,f.inventory).length,'The browser export refuses a changed source page.');
 // A complete, independently produced roof observation carries a foreign
 // datum here. P must invoke the real R guard and preserve its refusal. This
 // deliberately invalid association tests dispatch, not a new roof geometry.
 const scene=require('./fixtures/roof-plan-evidence.cjs').makeProposedRoofScene(),roof=clone(scene.roof),region=roof.roofPlanEvidence.observations.flatMap(o=>o.elevationRegions).find(Boolean);
 assert.ok(region);region.registration.datumRegistration=clone(f.registration.datumRegistration);region.scaleY=f.registration.datumRegistration.scaleY;
 const calls=[];
 browser.MIRPlanReconstruction={...actual,roofDatumRegistrationIssues(...args){const issues=actual.roofDatumRegistrationIssues(...args);calls.push({proof:args[0],issues:plain(issues)});return issues;}};
 const nodeIssues=require('../dist/plan-roof-plan-evidence.js').evidenceIssues(roof,scene.inventory),browserIssues=plain(browser.MIRRoofPlanEvidence.evidenceIssues(roof,scene.inventory));
 assert.equal(calls.length,1,'P must resolve MIRPlanReconstruction at validation time and invoke its real datum guard.');
 assert.equal(calls[0].proof,region.registration.datumRegistration);assert.ok(calls[0].issues.includes('ROOF_DATUM_REGISTRATION_SOURCE'));
 assert.deepEqual(browserIssues,nodeIssues,'Node and browser dispatch preserve the same source refusals.');
 assert.ok(browserIssues.includes('ROOF_DATUM_REGISTRATION_SOURCE'));
}
async function main(){
 const f=await datumRegistrationFixture(),p=f.registration.datumRegistration;
 assert.equal(R.elevationRegistration(f.info,f.reviewed,f.inventory),null,'general wall registration remains unchanged');
 assert.equal(p.projectedFloorObserved,false);assert.equal(f.registration.guide.observed,false);assert.equal(p.datum.levelHint,'level-3');assert.equal(p.references[0].datumEvidence.lower.levelHint,'level-1');
 assert.deepEqual(R.roofDatumRegistrationIssues(p,f.reviewed,f.inventory),[]);
 browserDatumGuardContract(f);
 const reordered=clone(p);reordered.references=reordered.references.map(r=>Object.fromEntries(Object.entries(r).reverse()));assert.deepEqual(R.roofDatumRegistrationIssues(reordered,f.reviewed,f.inventory),[],'Object property order is not a source change.');
 assert.ok(Math.abs(f.registration.z(p.datum.y)-8.79)<1e-10);assert.ok(Math.abs(f.registration.z(p.projectedFloorY)-6)<1e-10);
 for(const u of [0,1.2,5.8])assert.ok(Math.abs(f.registration.u(f.registration.pixelU(u))-u)<1e-10);
 for(const z of [0,4.2,8.79])assert.ok(Math.abs(f.registration.z(f.registration.pixelZ(z))-z)<1e-10);
 for(const [name,mutate]of Object.entries({
  'invented-floor':p=>p.projectedFloorObserved=true,
  'shifted-base':p=>p.base+=1,
  'shifted-ceiling':p=>p.datum.y+=4,
  'wrong-caption':p=>p.datum.label='PLAFOND NIVEAU 2',
  'foreign-frame':p=>p.sourceFrame.rasterSize[0]++,
  'unrelated-grid':p=>p.gridRegistration.checks[0].floor.point[0]+=20,
  'invented-grid-ring':p=>p.gridRegistration.checks[0].elevation.sourceCircle={method:'invented',status:'unresolved'},
  'removed-grid-ring-record':p=>{delete p.gridRegistration.checks[0].elevation.sourceCircle;},
  'changed-native-witness':p=>p.references[0].anchors[0][1]-=4,
  'scaled-Y':p=>p.scaleY*=1.1,
  'lost-independent-scale':p=>p.references=[]
 })){const changed=clone(p);mutate(changed);assert.ok(R.roofDatumRegistrationIssues(changed,f.reviewed,f.inventory).length,name);}
 const stored=clone(f.inventory),source=stored.views.find(v=>v.id===f.s.view.id),native=source.payload.drawingReadings.verticalDimensions;
 delete source.payload.drawingReadings.verticalDimensions;stored.localReadingRetries=native.map(r=>({...r,source:'native-vertical-dimension',purpose:'source-datum-bound-vertical-dimension',box:clone(r.textBox)}));
 assert.deepEqual(R.roofDatumRegistrationIssues(p,f.reviewed,stored),[],'saved native retry supplies exactly the same source proof');
 stored.localReadingRetries=[];assert.ok(R.roofDatumRegistrationIssues(p,f.reviewed,stored).length,'missing native source is refused');
 const noScale=clone(f.inventory);delete noScale.views.find(v=>v.id===f.s.view.id).payload.drawingReadings.verticalDimensions;assert.ok(R.roofElevationRegistration(f.info,f.reviewed,noScale)===null);
 const ambiguous=clone(f.info),other=clone(p.datum);other.y+=20;other.sourceGuide.anchors.forEach(p=>p[1]+=20);ambiguous.guides.push(other);assert.ok(R.roofElevationRegistration(ambiguous,f.reviewed,f.inventory)===null);
 console.log('PASS roof datum registration: actual native witness scale plus a distinct visible ceiling and labelled XY axes, explicit calculated floor coordinate, immutable source replay, real browser-export dispatch and negative controls.');
}
module.exports={datumRegistrationFixture};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
