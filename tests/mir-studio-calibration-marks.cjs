'use strict';
const assert=require('node:assert/strict'),A=require('../dist/plan-import-core.js'),R=require('../dist/plan-reconstruction.js');
function raster(){return {width:900,height:650,data:new Uint8ClampedArray(900*650*4).fill(255)};}
function line(im,a,b,colour=[0,0,0]){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/(n||1)),y=Math.round(a[1]+(b[1]-a[1])*i/(n||1));im.data.set([...colour,255],(y*im.width+x)*4);}}
function dimension(im,{anchors,box,value=2,text='2000 mm',colour=[0,0,0],ticks=true,witnesses=true,confidence=96}={}){
 const axis=anchors[0][1]===anchors[1][1]?0:1,point=(along,across)=>axis===0?[along,across]:[across,along];line(im,...anchors,colour);
 for(const p of anchors){const u=p[axis],v=p[1-axis];if(witnesses)line(im,point(u,v-20),point(u,v+20),colour);if(ticks)line(im,point(u-4,v+4),point(u+4,v-4),colour);}
 return {sourceViewId:'floor',kind:'written',status:'proposed',source:'ocr',confidence,anchors:structuredClone(anchors),textBox:box,text,label:text,value,scale:value/Math.hypot(anchors[0][0]-anchors[1][0],anchors[0][1]-anchors[1][1])};
}
function pair(){const image=raster(),a=dimension(image,{anchors:[[180,230],[340,230]],box:[240,211,280,221]}),b=dimension(image,{anchors:[[440,250],[440,430]],box:[451,315,461,355],value:2.25,text:'2250 mm'}),view={id:'floor',frame:{units:'pixels'},payload:{drawingReadings:{rows:[a,b].map(d=>({text:d.text,box:d.textBox,confidence:d.confidence}))}}};return {image,a,b,view};}
const bounds=[100,100,600,500],input=pair(),pixels=Buffer.from(input.image.data),before=structuredClone([input.view,input.a,input.b]);
const assess=(im,d,options)=>A.dimensionLineEvidence(im,d,options);
for(const d of [input.a,input.b]){const proof=assess(input.image,d);assert.equal(proof.status,'observed');assert.ok(proof.markers.every(m=>m.kind==='diagonal-tick'&&m.witnesses.length===2));assert.equal(proof.pixelSupport,1);assert.deepEqual(proof.anchors,d.anchors);}
const accepted=R.partialScaleReferences(input.view,[input.a,input.b],bounds,{image:input.image});
assert.equal(accepted.references.length,2);assert.equal(accepted.conflict,false);assert.equal(accepted.assessment.scale,.0125);assert.ok(accepted.references.every(d=>d.lineEvidence.status==='observed'));
assert.deepEqual([input.view,input.a,input.b],before);assert.deepEqual(Buffer.from(input.image.data),pixels,'calibration assessment never paints missing ticks or glyphs');
const contrary={...input.b,value:3,scale:3/180,text:'3000 mm',label:'3000 mm'},conflict=R.partialScaleReferences(input.view,[input.a,contrary],bounds,{image:input.image});
assert.equal(conflict.references.length,2);assert.equal(conflict.conflict,true,'two genuine contradictory inscriptions remain blocking, regardless of other scale votes');

for(const options of [{ticks:false},{witnesses:false},{colour:[0,160,50]}]){
 const image=raster(),d=dimension(image,{anchors:[[180,230],[340,230]],box:[240,211,280,221],...options});
 assert.equal(assess(image,d).status,'unresolved','a number and nearby object edges do not prove a measured span: '+JSON.stringify(options));
}
// Furniture/window tokens in the middle of a long structural line formerly
// calibrated that entire line. Its intersections are not end marks.
const objects=raster();line(objects,[100,250],[780,250]);for(const x of [180,340])line(objects,[x,180],[x,320]);
const token={...input.a,text:'24"',label:'24"',value:.6096,anchors:[[180,250],[340,250]],textBox:[250,230,270,240]};
assert.equal(assess(objects,token).reason,'DIMENSION_END_MARKS_REQUIRED');assert.equal(assess(objects,token,{allowCrossedTerminals:true}).reason,'DIMENSION_END_MARKS_REQUIRED','internal crossings cannot use the pale-line terminal exception');
const rejected=R.partialScaleReferences(input.view,[token,{...token,text:'36"',value:.9144,textBox:[450,230,470,240],anchors:[[380,250],[540,250]]}],bounds,{image:objects});
assert.equal(rejected.references.length,0);assert.equal(rejected.conflict,false);assert.equal(rejected.unresolvedReferences.length,2,'unsupported candidates remain visible instead of becoming a false scale conflict');
assert.ok(rejected.unresolvedReferences.every(d=>d.scaleEligibility==='unresolved'&&d.lineEvidence.reason));

const windowLabel={text:'2000 mm × 1200 mm',box:[230,209,330,223]};
assert.equal(assess(input.image,input.a,{labels:[windowLabel]}).reason,'DIMENSION_ANNOTATION_CONTEXT','a valid-looking numeric token inside an opening size cannot become a plan scale');
const schedule={text:'WINDOW SCHEDULE: 2000 mm',box:[230,209,330,223]};assert.equal(assess(input.image,input.a,{labels:[schedule]}).reason,'DIMENSION_ANNOTATION_CONTEXT');
const fire={...input.a,text:'30m',label:'30m',value:30},fireContext=[{text:'30min — 30min',box:[170,211,235,221]}];
assert.equal(assess(input.image,fire,{labels:fireContext}).reason,'DIMENSION_ANNOTATION_CONTEXT','a truncated fire-rating token is not a metric length');
const red=raster(),redDimension=dimension(red,{anchors:[[180,230],[340,230]],box:[240,211,280,221],text:'30m'});for(let x=244;x<270;x+=2)line(red,[x,213],[x,218],[230,0,0]);
assert.equal(assess(red,redDimension).reason,'DIMENSION_COLOURED_ANNOTATION','red annotation glyphs do not establish an original construction dimension');

// Faint neutral drafting survives downsampling but is absent at wall-ink
// thresholds. Its caption still needs explicit end marks and witnesses.
const pale=raster(),caption={text:'14 ft',box:[380,104,420,114],confidence:9,source:'ocr'};
const paleDimension=dimension(pale,{anchors:[[160,125],[640,125]],box:caption.box,text:caption.text,value:4.2672,colour:[214,214,214],ticks:false,confidence:9});
assert.equal(A.matchDimensionLines(pale,[caption],{shortTicks:true}).length,0,'legacy wall-ink threshold is deliberately unchanged');
assert.equal(assess(pale,paleDimension).status,'unresolved','plain intersections alone remain insufficient for an interior partial scale');
const terminalProof=assess(pale,paleDimension,{allowCrossedTerminals:true});assert.equal(terminalProof.status,'observed');assert.ok(terminalProof.markers.every(m=>m.kind==='crossed-terminal-witnesses'&&m.witnesses.length===2));
const recovered=A.matchDimensionLines(pale,[caption],{shortTicks:true,lightConstructionLines:true,requireDimensionMarks:true,allowCrossedTerminals:true,preferReliableReadings:true});
assert.equal(recovered.length,1);assert.equal(recovered[0].confidence,9,'visible geometry cannot promote uncertain OCR');assert.equal(recovered[0].lineEvidence.status,'observed');assert.deepEqual(recovered[0].sourceReading,caption);
const readingView={id:'floor',frame:{units:'pixels',rasterSize:[900,650]},payload:{drawingReadings:{rows:[caption]}}},reference=R.references(readingView,pale)[0];assert.ok(reference);assert.equal(reference.confidence,9);assert.equal(reference.transcriptionReviewRequired,true,'the pale reference can request OCR review but is not a certain dimension');
line(pale,[100,125],[780,125],[214,214,214]);assert.equal(assess(pale,paleDimension,{allowCrossedTerminals:true}).status,'unresolved','longer structural lines may not silently use inner endpoints');
const incomplete=raster(),incompleteD=dimension(incomplete,{anchors:[[160,125],[640,125]],box:caption.box,text:caption.text,colour:[214,214,214],ticks:false,witnesses:false});assert.equal(assess(incomplete,incompleteD,{allowCrossedTerminals:true}).status,'unresolved');
console.log('PASS calibration marks: genuine horizontal/vertical dimensions, contradictory readings preserved, false object/window/fire labels unresolved, pale neutral terminals observed without promoting OCR');
