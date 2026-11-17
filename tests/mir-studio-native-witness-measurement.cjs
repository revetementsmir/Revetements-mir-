'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('../dist/plan-import-core.js'),R=require('../dist/plan-reconstruction.js'),G=require('../dist/plan-grid-registration.js'),N=require('../dist/plan-native-witness-measurement.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const context={URL,document:{currentScript:{src:'http://localhost/plan-reconstruction-readings.js'}},MIRPDFAnalysis:A,MIRPlanReconstruction:R,MIRNativeWitnessMeasurement:N};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/plan-reconstruction-readings.js'),'utf8'),context);const Q=context.MIRReconstructionReadings;
function image(width,height){const data=new Uint8ClampedArray(width*height*4);data.fill(255);return {width,height,data};}
function ink(im,x,y,coverage,color){if(x<0||y<0||x>=im.width||y>=im.height||coverage<=0)return;const at=(y*im.width+x)*4;for(let c=0;c<3;c++)im.data[at+c]=Math.min(im.data[at+c],Math.round(255-(255-color[c])*Math.min(1,coverage)));}
// Analytic pixel area for horizontal/vertical source strokes, independent of
// either the measured result or the written value. Diagonal ticks use 4×4
// coverage only to exercise the existing detector's real off-axis samples.
function stroke(im,a,b,width=1,color=[28,28,28]){
 const lo=[Math.min(a[0],b[0])-width/2,Math.min(a[1],b[1])-width/2],hi=[Math.max(a[0],b[0])+width/2,Math.max(a[1],b[1])+width/2];
 for(let y=Math.floor(lo[1]);y<Math.ceil(hi[1]);y++)for(let x=Math.floor(lo[0]);x<Math.ceil(hi[0]);x++){
  let coverage=0;
  if(a[0]===b[0]||a[1]===b[1])coverage=Math.max(0,Math.min(x+1,hi[0])-Math.max(x,lo[0]))*Math.max(0,Math.min(y+1,hi[1])-Math.max(y,lo[1]));
  else {const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){const px=x+(sx+.5)/4,py=y+(sy+.5)/4,t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/length));if(Math.hypot(px-a[0]-t*dx,py-a[1]-t*dy)<=width/2)coverage+=1/16;}}
  ink(im,x,y,coverage,color);
 }
}
function makeView({id='witness-elevation-a',roundedSpan=140,text='2.79 m',confidence=89,captionWidth=8}={}){
 const floor=850,ceiling=floor-roundedSpan;
 return {id,buildingId:'witness-building',fileId:'witness-file',page:1,kind:'elevation',direction:'front',orientation:0,frame:{units:'pixels',pdfToRaster:[1,0,0,-1,0,1200],cropToRaster:[1,0,0,1,0,0],rasterSize:[720,1200]},payload:{sourceWidth:720,sourceHeight:1200,drawingReadings:{rows:[{text:'PLAFOND NIVEAU 1',box:[400,ceiling-14,550,ceiling-4],confidence:92},{text:'PLANCHER NIVEAU 1',box:[400,floor-14,570,floor-4],confidence:92}],verticalRows:[{text,box:[232,767,232+captionWidth,798],confidence,source:'ocr',orientation:'cw'}]}}};
}
function datumImage(view){const im=image(720,1200);for(const row of view.payload.drawingReadings.rows){const y=row.box[3]+4;stroke(im,[210,y+.5],[600,y+.5],1);}return im;}
function nativeReader({trueYs=[710.25,849.65],rails=[250],color=[28,28,28],oneSided=false,additionalWitness=null,intermediate=false,witnessHalfLength=24}={}){
 const calls=[],canvases=[],tiles=[];
 return {calls,canvases,tiles,async render(view,region,options){
  calls.push({viewId:view.id,region:copy(region),options:copy(options)});const plan=Q.sourceTilePlan(view,region,options);assert.equal(plan.status,'ready');
  const im=image(plan.width,plan.height),m=plan.viewToTile,map=p=>[p[0]*m[0]+m[4],p[1]*m[3]+m[5]],f=plan.factor;
  for(const x of rails){stroke(im,map([x,trueYs[0]-20]),map([x,trueYs[1]+20]),.7*f,color);for(const y of [...trueYs,...(intermediate?[(trueYs[0]+trueYs[1])/2]:[])]){
   stroke(im,map([oneSided?x:x-witnessHalfLength,y]),map([x+witnessHalfLength,y]),.7*f,color);stroke(im,map([x-3,y-3]),map([x+3,y+3]),.9*f,color);
   if(additionalWitness!==null)stroke(im,map([x-24,y+additionalWitness]),map([x+24,y+additionalWitness]),.5*f,color);
  }}
  const canvas={width:im.width,height:im.height,getContext:()=>({getImageData:()=>im})},provenance={method:'retained-pdf-region',sourceViewId:view.id,sourceFileId:view.fileId,sourcePage:view.page,sourceSha256:'b'.repeat(64),sourceFrame:copy(view.frame),sourceRotation:plan.rotation,sourceRegion:copy(region),sourcePageRegion:copy(plan.pageRegion),scaleFactor:plan.factor,padding:plan.padding,viewToTile:Array.from(m),pdfToTile:Array.from(plan.pdfToTile),canvasSize:[plan.width,plan.height]};
  canvases.push(canvas);tiles.push({image:im,provenance});return {status:'proposed',canvas,provenance};
 }};
}
async function makeMeasuredWitnessScene(options={}){
 const view=makeView(options),im=datumImage(view),reader=nativeReader(options),pair=Q.verticalDimensionPairs(view,im)[0];assert.ok(pair,'synthetic visible labels and datum strokes yield a real candidate');
 const observation=copy(await Q.verifyVerticalDimension(reader,view,pair));view.payload.drawingReadings.verticalDimensions=[copy(observation)];
 const inventory={schemaVersion:1,files:[{id:view.fileId,name:'invented-witnesses.pdf',sha256:'b'.repeat(64),pageCount:1}],buildings:[{id:view.buildingId}],views:[view],levels:[{id:'witness-level-1',buildingId:view.buildingId,sourceLevel:'level-1'}]};
 const assessment=R.verticalReferenceAssessment(view),normalizedReference=assessment.reference;
 return {view,inventory,observation,normalizedReference,assessment,image:im,pair:copy(pair),reader,Q};
}
async function main(){
 const scene=await makeMeasuredWitnessScene();
 assert.equal(scene.observation.status,'proposed');assert.equal(scene.observation.measurementEvidence?.status,'observed',JSON.stringify({reason:scene.observation.measurementEvidence?.reason,proof:scene.observation.nativeLineEvidence?.markers}));
 assert.ok(Math.abs(scene.observation.measuredAnchors[1][1]-scene.observation.measuredAnchors[0][1]-139.4)<.13,'a measured pixel centroid stays within the native sampling interval');
 assert.deepEqual(N.validate(scene.observation,{view:scene.view,files:scene.inventory.files}),[]);
 assert.equal(scene.assessment.status,'proposed');assert.deepEqual(N.validate(scene.normalizedReference,{view:scene.view,files:scene.inventory.files,sourceObservation:scene.observation}),[]);
 assert.equal(scene.reader.calls.length,1);assert.ok(scene.reader.canvases.every(c=>c.width===1&&c.height===1));
 const other=await makeMeasuredWitnessScene({id:'witness-elevation-b',roundedSpan:139}),third=await makeMeasuredWitnessScene({id:'witness-elevation-c'}),scenes=[scene,other,third],inventory={...scene.inventory,views:scenes.map(s=>s.view)};
 const guide=(s,level,y)=>({sourceViewId:s.view.id,sourceFrame:copy(s.view.frame),levelHint:'level-'+level,datumType:'floor',y,box:[400,y-14,550,y-4],label:'PLANCHER NIVEAU '+level,confidence:92});
 const prepared=[0,1,2,3].map(level=>({sourceLevel:'level-'+level,levelId:'witness-level-'+level,draft:{height:{}},proposal:{views:level===0?scenes.map(s=>({viewId:s.view.id,guides:[1100,850,650,450].map((y,i)=>guide(s,i,y))})):[]}}));
 const originalRefs=scenes.map(s=>{const view=copy(s.view);delete view.payload.drawingReadings.verticalDimensions[0].measurementEvidence;delete view.payload.drawingReadings.verticalDimensions[0].measuredAnchors;return R.verticalReferenceAssessment(view).reference;}),normalized=scenes.map(s=>s.normalizedReference),before=copy({inventory,prepared,normalized});
 const coarse=G.datumNetwork(inventory,scene.view.buildingId,prepared,prepared[0],originalRefs),precise=G.datumNetwork(inventory,scene.view.buildingId,prepared,prepared[0],normalized);
 assert.equal(coarse.status,'conflict');assert.equal(coarse.checks.filter(c=>Math.abs(c.residual)>c.tolerance).length,2,'rounding alone produces two failing long datum checks in three independent source views');
 assert.equal(precise.status,'proposed','actual witness pixel measurement resolves the rounding conflict');assert.ok(precise.checks.every(c=>Math.abs(c.residual)<1e-9));assert.ok(precise.checks.every(c=>c.tolerance===Math.max(.02,3*c.scaleUsed)),'the metric tolerance formula is unchanged');
 assert.deepEqual({inventory,prepared,normalized},before,'measurement consumers preserve all source datums and observations');
 const reverse=G.datumNetwork(inventory,scene.view.buildingId,prepared.slice().reverse(),prepared[0],[...normalized].reverse().concat(copy(normalized)));assert.equal(reverse.status,'proposed');for(const level of prepared)assert.ok(Math.abs(reverse.byLevel[level.sourceLevel].base.value-precise.byLevel[level.sourceLevel].base.value)<1e-9,'reordering/duplicating source references cannot change measured Z');
 const displaced=copy(prepared);displaced[0].proposal.views[1].guides[2].y-=20;assert.equal(G.datumNetwork(inventory,scene.view.buildingId,displaced,displaced[0],normalized).status,'conflict','a real floor-datum displacement remains a conflict');
 const contrary=await makeMeasuredWitnessScene({text:'2.86 m'});assert.deepEqual(contrary.observation.measurementEvidence,scene.observation.measurementEvidence,'the pixel selector receives no written value, target scale or inter-page agreement');
 assert.equal(G.datumNetwork(inventory,scene.view.buildingId,prepared,prepared[0],[...normalized,contrary.normalizedReference]).status,'conflict','a true contradictory inscription on the very same marks remains a conflict');
 for(const key of ['anchors','lineEvidence','nativeLineEvidence','value','confidence','sourceReading','datumEvidence'])assert.deepEqual(scene.observation[key],key==='anchors'?scene.normalizedReference.originalAnchors:scene.normalizedReference[key],'only the normalized copy changes its anchors/calibration');
 const oneSided=await makeMeasuredWitnessScene({oneSided:true});assert.equal(oneSided.observation.status,'proposed');assert.equal(oneSided.observation.measurementEvidence.status,'unresolved');assert.equal(oneSided.observation.measurementEvidence.reason,'NATIVE_WITNESS_BOTH_SIDES_REQUIRED');assert.deepEqual(oneSided.observation.measurementEvidence.rasterSamples,[]);assert.equal(oneSided.observation.measuredAnchors,undefined);assert.deepEqual(N.validate(oneSided.observation,{view:oneSided.view,files:oneSided.inventory.files}),[]);assert.equal(oneSided.assessment.status,'proposed');assert.equal(oneSided.normalizedReference.scale,oneSided.observation.value/140,'unavailable precision keeps the old written reference; it never clears its source conflicts');
 const short=await makeMeasuredWitnessScene({captionWidth:4,witnessHalfLength:6});assert.equal(short.observation.status,'proposed');assert.equal(short.observation.measurementEvidence.status,'unresolved');assert.equal(short.observation.measurementEvidence.reason,'NATIVE_WITNESS_CONTINUATION_REQUIRED');assert.deepEqual(short.observation.measurementEvidence.rasterSamples,[]);assert.deepEqual(N.validate(short.observation,{view:short.view,files:short.inventory.files}),[]);assert.equal(short.assessment.status,'proposed');
 const doubled=await makeMeasuredWitnessScene({additionalWitness:1.5});assert.equal(doubled.observation.status,'proposed');assert.equal(doubled.observation.measurementEvidence.reason,'NATIVE_WITNESS_MULTIPLE_STROKES');assert.deepEqual(N.validate(doubled.observation,{view:doubled.view,files:doubled.inventory.files}),[]);assert.equal(doubled.assessment.status,'proposed','two nearby witness strokes refuse precision without moving either source anchor');
 for(const [options,reason]of [[{rails:[218,250]},'VERTICAL_DIMENSION_ASSOCIATION_AMBIGUOUS'],[{intermediate:true},'DIMENSION_INTERMEDIATE_MARKS'],[{color:[20,20,230]},'VERTICAL_DIMENSION_SOURCE_MARKS_REQUIRED']]){const s=await makeMeasuredWitnessScene(options);assert.equal(s.observation.status,'unresolved');assert.equal(s.observation.reason,reason);assert.equal(s.observation.measuredAnchors,undefined);}
 // Affine/crop changes are real renders at each resolution. No expected
 // source coordinate is supplied to the metrology selector itself.
 for(const factor of [2,4,6])for(const region of [[205.25,690.125,70,180],[207.5,692.375,68.25,178.75]])for(const padding of [9,15]){
  const reader=nativeReader(),tile=await reader.render(scene.view,region,{factor,padding}),im=reader.tiles[0].image,m=tile.provenance.viewToTile,map=p=>[p[0]*m[0]+m[4],p[1]*m[3]+m[5]],back=p=>[(p[0]-m[4])/m[0],(p[1]-m[5])/m[3]],nativeAnchors=[[250,710.25],[250,849.65]].map(map).map(p=>p.map(Math.round)),textBox=[...map(scene.pair.textBox.slice(0,2)),...map(scene.pair.textBox.slice(2))];
  const proof=A.dimensionLineEvidence(im,{anchors:nativeAnchors,textBox},{localPaperContrast:true,rejectIntermediateMarks:true});assert.equal(proof.status,'observed');
  const measurement=N.measure(im,{nativeLineEvidence:proof,sourceAnchors:nativeAnchors.map(back),nativeSource:tile.provenance});assert.equal(measurement.status,'observed');
  for(const [i,y]of [710.25,849.65].entries())assert.ok(Math.abs(measurement.measuredAnchors[i][1]-y)<.5/factor,'subpixel coordinates are bounded by the actual native sampling resolution');
  assert.deepEqual(measurement.measurementEvidence.measuredNativeAnchors.map(back),measurement.measuredAnchors);
  const record={...copy(scene.observation),anchors:nativeAnchors.map(back),lineEvidence:Q.mapDimensionProof(proof,back),nativeLineEvidence:copy(proof),nativeSource:copy(tile.provenance),measuredAnchors:measurement.measuredAnchors,measurementEvidence:measurement.measurementEvidence};assert.deepEqual(N.validate(record,{view:scene.view,files:scene.inventory.files}),[]);tile.canvas.width=tile.canvas.height=1;
 }
 const mutations=[
  r=>{r.nativeSource.pdfToTile[4]+=6;r.measurementEvidence.nativeSource.pdfToTile[4]+=6;},
  r=>{r.nativeSource.sourcePageRegion[0]+=2;r.measurementEvidence.nativeSource.sourcePageRegion[0]+=2;},
  r=>{r.nativeSource.scaleFactor=4;r.measurementEvidence.nativeSource.scaleFactor=4;},
  r=>{r.nativeSource.sourcePage++;r.measurementEvidence.nativeSource.sourcePage++;},
  r=>{r.nativeSource.sourceFileId='foreign';r.measurementEvidence.nativeSource.sourceFileId='foreign';},
  r=>{r.nativeSource.sourceSha256='a'.repeat(64);r.measurementEvidence.nativeSource.sourceSha256='a'.repeat(64);},
  r=>{r.sourceFrame.cropToRaster[4]+=2;r.nativeSource.sourceFrame=copy(r.sourceFrame);r.measurementEvidence.nativeSource.sourceFrame=copy(r.sourceFrame);},
  r=>{r.measurementEvidence.nativeAnchors[0][1]++;},
  r=>{r.measuredAnchors[0][1]+=4;r.measurementEvidence.measuredAnchors=copy(r.measuredAnchors);},
  r=>{r.measurementEvidence.measuredNativeAnchors[1][1]++;},
  r=>{r.measurementEvidence.rasterSamples.pop();},
  r=>{r.measurementEvidence.endpoints[0].sides[0].centre++;},
  r=>{delete r.measurementEvidence;}
 ];
 for(const mutate of mutations){const bad=copy(scene.observation);mutate(bad);assert.ok(N.validate(bad,{view:scene.view,files:scene.inventory.files}).length,'foreign or altered measurement proof must fail before deriving geometry');const view=copy(scene.view);view.payload.drawingReadings.verticalDimensions=[bad];if(N.validate(bad,{view:scene.view}).length)assert.notEqual(R.verticalReferenceAssessment(view).status,'proposed','available but invalid precision cannot silently fall back to rounded source anchors; file digests are checked with the inventory at save');}
 const missingScale=copy(scene.normalizedReference);delete missingScale.scale;assert.ok(N.validate(missingScale,{view:scene.view,files:scene.inventory.files}).includes('NATIVE_WITNESS_SCALE_MISMATCH'));
 const changedValue=copy(scene.normalizedReference);changedValue.value+=.1;assert.ok(N.validate(changedValue,{view:scene.view,files:scene.inventory.files,sourceObservation:scene.observation}).includes('NATIVE_WITNESS_ORIGINAL_CHANGED'));
 const fakeRefusal=copy(oneSided.observation);fakeRefusal.measurementEvidence.reason='NATIVE_WITNESS_CONTINUATION_REQUIRED';assert.ok(N.validate(fakeRefusal,{view:oneSided.view,files:oneSided.inventory.files}).length,'an unperformed refusal must also be replayable');
 // Direct written floor/ceiling heights retain their value. Derived heights
 // use the native scale, while the visible datum band keeps its own pixels.
 const lower=scene.observation.datumEvidence.lower,upper=scene.observation.datumEvidence.upper,ground=guide(scene,0,1100),floor={id:'witness-plan',kind:'floor',buildingId:scene.view.buildingId,levelId:'level-1',frame:copy(scene.view.frame),payload:{}},heightInventory={...scene.inventory,views:[floor,scene.view],levels:[...scene.inventory.levels,{id:'witness-level-0',buildingId:scene.view.buildingId,sourceLevel:'level-0'}]},info={viewId:scene.view.id,direction:'front',envelope:{status:'proposed',box:[200,100,300,1050]},facing:{axis:0,min:100,max:700,length:600},guides:[lower,upper,ground]},xReference={sourceViewId:floor.id,sourceFrame:copy(floor.frame),kind:'written',status:'proposed',value:12,scale:.02,anchors:[[100,1100],[700,1100]],source:'pdf-text',confidence:95};
 const written=R.heightFromLevelDatums([info],'level-1',xReference,heightInventory)[0],derived=R.heightFromLevelDatums([info],'level-0',xReference,heightInventory)[0];
 assert.equal(written.kind,'written');assert.equal(written.value,scene.observation.value);assert.equal(written.scaleUsed,scene.normalizedReference.scale);assert.equal(written.datumProjectionScale,written.value/140);assert.equal(derived.kind,'estimated-calibrated');assert.equal(derived.value,250*scene.normalizedReference.scale);
 const band=R.levelBand(info,{sourceViewId:floor.id,levelId:'witness-level-1',height:written},heightInventory);assert.equal(band.scaleY,written.value/140);assert.equal(band.topY,710);assert.equal(band.bottomY,850);
 // The historical twelve-region budget and cancellation lifetime are not
 // changed by precision: a measurement uses its current native tile once.
 const cancelReader=nativeReader();assert.equal((await Q.verifyVerticalDimension(cancelReader,scene.view,scene.pair,{cancelled:()=>true})).reason,'VERTICAL_DIMENSION_CANCELLED');assert.equal(cancelReader.calls.length,0);
 let checks=0;const afterRender=nativeReader(),cancelled=await Q.verifyVerticalDimension(afterRender,scene.view,scene.pair,{cancelled:()=>++checks>1});assert.equal(cancelled.measurementEvidence.reason,'NATIVE_WITNESS_CANCELLED');assert.deepEqual(N.validate(cancelled,{view:scene.view,files:scene.inventory.files}),[]);assert.equal(afterRender.calls.length,1);assert.ok(afterRender.canvases.every(c=>c.width===1&&c.height===1));
 const budgetViews=[makeView({id:'budget-a'}),makeView({id:'budget-b'})],budgetImages=Object.fromEntries(budgetViews.map(v=>[v.id,datumImage(v)])),budgetReader=nativeReader(),shared={remaining:1},evidence=await Q.refineVerticalDimensions({views:budgetViews},scene.view.buildingId,budgetImages,budgetReader,{budget:shared});assert.equal(budgetReader.calls.length,1);assert.equal(shared.remaining,0);assert.equal(evidence.filter(e=>e.measurementEvidence?.status==='observed').length,1);assert.equal(evidence.filter(e=>e.reason==='VERTICAL_DIMENSION_BUDGET').length,1);assert.ok(budgetReader.calls.every(c=>c.options.factor===2));
 const unavailable=await Q.verifyVerticalDimension({render:async()=>({status:'unresolved',reason:'SOURCE_PDF_UNAVAILABLE'})},scene.view,scene.pair);assert.equal(unavailable.reason,'SOURCE_PDF_UNAVAILABLE');assert.equal(unavailable.measuredAnchors,undefined);
 console.log('PASS native witness measurement: actual native raster, two long datum conflicts resolved with unchanged metric tolerances, preserved source contradictions and datums, deterministic unavailable precision, provenance, normalized scale and no extra render');
}
module.exports={makeMeasuredWitnessScene,makeView,nativeReader,datumImage,image,stroke,Q};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
