'use strict';
const assert=require('node:assert/strict'),A=require('../dist/plan-import-core.js'),P=require('../dist/plan-reconstruction-pipeline.js');

// Synthetic drafting only. A written dimension interrupts its own line;
// the two visible arms end at bilateral slashes with extension witnesses.
function fixture({scale=1,offset=0,left=true,right=true,leftTick=true,rightTick=true,witness=true,intermediate=false,colour=[0,0,0],tickColour=colour,rightOffset=0,gap=60,span=500,text='14 ft',ambiguous=false,objects=false}={}){
 const width=Math.round(800*scale),height=Math.round(600*scale),image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};
 const dot=(x,y,c=colour)=>{for(let dy=0;dy<Math.max(1,Math.round(scale));dy++)for(let dx=0;dx<Math.max(1,Math.round(scale));dx++){const px=Math.round(x*scale)+dx,py=Math.round(y*scale)+dy;if(px>=0&&px<width&&py>=0&&py<height)image.data.set([...c,255],(py*width+px)*4);}};
 const segment=(x0,y0,x1,y1,c=colour)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let i=0;i<=n;i++)dot(x0+(x1-x0)*i/(n||1),y0+(y1-y0)*i/(n||1),c);};
 const center=350+offset,y=170,a=center-span/2,b=center+span/2;
 const tick=(x,yy)=>{if(witness)segment(x,yy-10,x,yy+32,tickColour);for(let d=-4;d<=4;d++)for(let dx=0;dx<=1;dx++)dot(x+d+dx,yy-d,tickColour);};
 if(left)segment(a-5,y,center-gap/2,y);
 if(right)segment(center+gap/2,y+rightOffset,b+5,y+rightOffset);
 if(!objects){if(leftTick)tick(a,y);if(rightTick)tick(b,y+rightOffset);if(intermediate)tick(a+80,y);}
 else {for(const x of [a-5,center-gap/2,center+gap/2,b+5])segment(x,y-60,x,y+60);}
 if(ambiguous){const yy=y+9;segment(a+20,yy,center-gap/2,yy);segment(center+gap/2,yy,b-20,yy);tick(a+20,yy);tick(b-20,yy);}
 // The detector receives an actual caption region, not a painted bridge.
 for(const x of [center-15,center-3,center+9])segment(x,y-4,x,y+4,[0,0,0]);
 const label={text,box:[center-20,y-6,center+20,y+(ambiguous?13:6)].map(n=>n*scale),confidence:89,source:'ocr'};
 return {image,label,expected:[a*scale,b*scale],dot,segment};
}
const match=(s,extra={})=>A.matchDimensionLines(s.image,[s.label],{shortTicks:true,minSpanPx:20,allowTextGap:true,...extra});
const near=(x,y,tolerance=2)=>assert.ok(Math.abs(x-y)<=tolerance,`${x} is not within ${tolerance} pixels of the observed mark ${y}`);

for(const options of [{},{scale:.75},{scale:2},{offset:80}]){
 const s=fixture(options),pixels=s.image.data.slice(),caption=structuredClone(s.label),result=match(s);
 assert.equal(result.length,1,JSON.stringify(options));const c=result[0];
 near(c.anchors[0][0],s.expected[0],Math.max(2,2*(options.scale||1)));near(c.anchors[1][0],s.expected[1],Math.max(2,2*(options.scale||1)));
 assert.equal(c.referenceFt,14);assert.equal(c.confidence,89);assert.equal(c.source,'ocr');assert.equal(c.lineEvidence.kind,'caption-interrupted-dimension-line');
 assert.equal(c.lineEvidence.segments.length,2);assert.equal(c.lineEvidence.markers.length,2);assert.ok(c.lineEvidence.markers.every(m=>m.kind==='diagonal-tick'&&m.witnesses.length));
 assert.deepEqual(c.lineEvidence.markers.map(m=>m.point),c.anchors);assert.deepEqual(c.lineEvidence.captionBox,s.label.box);
 assert.equal(A.matchDimensionLines(s.image,[s.label],{shortTicks:true,minSpanPx:20}).length,0,'a missing option cannot activate the new association in the import path');
 assert.deepEqual(s.image.data,pixels,'dimension matching never paints over the caption or modifies source pixels');assert.deepEqual(s.label,caption,'the inscription and confidence stay unchanged');
}

const negatives=[
 ['missing left arm',{left:false}],['missing right arm',{right:false}],['missing left tick',{leftTick:false}],['missing right tick',{rightTick:false}],
 ['slashes without extension witnesses',{witness:false}],['an intermediate tick is not skipped',{intermediate:true}],
 ['arms on different source rows',{rightOffset:5}],['gap extending far beyond the caption',{gap:150}],['gap occupying most of the measured span',{span:100}],
 ['coloured line arms',{colour:[0,190,255],tickColour:[0,0,0]}],['coloured endpoint marks',{tickColour:[0,190,255]}],
 ['plain text between object edges',{objects:true}],['note rather than dimension',{text:'NOTE: 14 ft'}],['area caption',{text:'14 ft²'}],['opening dimensions',{text:'30" x 40"'}],
 ['two distinct interrupted lines share a caption',{ambiguous:true}]
];
for(const [name,options] of negatives)assert.equal(match(fixture(options)).length,0,name);
const firstAmbiguousLine=fixture();firstAmbiguousLine.label.box[3]+=7;
assert.equal(match(firstAmbiguousLine).length,1,'the first competing line is independently observable');
assert.equal(match(fixture({ambiguous:true,left:false,right:false,leftTick:false,rightTick:false})).length,1,'the second competing line is independently observable');
const mixed=fixture();mixed.segment(140,192,560,192);
for(const x of [140,560]){mixed.segment(x,177,x,215);for(let d=-4;d<=4;d++)for(let dx=0;dx<=1;dx++)mixed.dot(x+d+dx,192-d);}
const continuousAlternative=A.matchDimensionLines(mixed.image,[mixed.label],{shortTicks:true,minSpanPx:20});
assert.equal(continuousAlternative.length,1);near(continuousAlternative[0].spanPx,420);
assert.equal(match(mixed).length,0,'an interrupted line cannot silently replace another plausible continuous span associated with the same caption');

const broken=fixture();for(let x=200;x<=212;x++)for(let y=168;y<=172;y++)broken.image.data.set([255,255,255,255],(y*broken.image.width+x)*4);
assert.equal(match(broken).length,0,'another unsupported gap in an arm cannot be bridged to reach an endpoint');
const offCenter=fixture();offCenter.label.box=offCenter.label.box.map((n,i)=>i%2===0?n+100:n);assert.equal(match(offCenter).length,0,'a caption beside an unrelated gap is not associated with it');

// Existing uninterrupted dimensions keep exactly the same result, even when
// the caller opts into the additional path. Their old evidence is unchanged.
const ordinary=fixture();ordinary.segment(100,130,600,130);for(const x of [100,600])ordinary.segment(x,115,x,150);
ordinary.label.box=[330,110,370,122];
const legacy=A.matchDimensionLines(ordinary.image,[ordinary.label],{shortTicks:true,minSpanPx:20});
assert.ok(legacy.length);assert.deepEqual(match(ordinary),legacy);assert.deepEqual(match(ordinary,{allowTextGap:false}),legacy);

// Rotation must include every evidence point, not only the measured anchors.
const c=match(fixture())[0],original=structuredClone(c);
for(const direction of ['ccw','cw']){
 const result=A.unrotateCandidate(c,800,500,direction),map=direction==='cw'?p=>[p[1],500-p[0]]:p=>[800-p[1],p[0]];
 assert.deepEqual(result.anchors,c.anchors.map(map));assert.equal(result.axis,'y');assert.deepEqual(result.lineEvidence.captionBox,result.textBox);
 assert.deepEqual(result.lineEvidence.segments,c.lineEvidence.segments.map(s=>s.map(map)));assert.deepEqual(result.lineEvidence.gap,c.lineEvidence.gap.map(map));
 assert.deepEqual(result.lineEvidence.markers.map(m=>m.point),result.anchors);
 assert.deepEqual(result.lineEvidence.markers.map(m=>m.witnesses),c.lineEvidence.markers.map(m=>m.witnesses.map(s=>s.map(map))));
}
assert.deepEqual(c,original,'unrotation preserves the original source observation');

// A later OCR retry of the same caption/value/span must not lose to array
// order. This second option is independent of interrupted-line detection.
const image={width:1000,height:600,data:new Uint8ClampedArray(1000*600*4).fill(255)},ink=(x,y)=>image.data.set([0,0,0,255],(y*1000+x)*4);
for(let x=220;x<=780;x++)ink(x,300);for(const x of [220,780])for(let y=270;y<=325;y++)ink(x,y);
const low={text:'20\'0"',box:[480,280,520,292],confidence:31,source:'ocr'};
const high={...low,text:'20\'-0"',confidence:92,source:'ocr-local-region-retry',retry:{originalText:low.text,originalConfidence:31,region:[475,275,50,22],scale:4,psm:7,sourceViewId:'synthetic-floor',sourceFrame:{units:'pixels',rasterSize:[1000,600]}}};
const readings=[low,high],beforeReadings=structuredClone(readings),beforePixels=image.data.slice(),dedup=labels=>A.matchDimensionLines(image,labels,{shortTicks:true,preferReliableReadings:true});
const preferred=dedup(readings),reversed=dedup([...readings].reverse());
assert.equal(preferred.length,1);assert.deepEqual(preferred,reversed,'reliable identical-caption selection is independent of input order');
assert.equal(preferred[0].confidence,92);assert.equal(preferred[0].source,'ocr-local-region-retry');assert.deepEqual(preferred[0].sourceReading,high,'the complete winning retry provenance is retained');
assert.equal(A.matchDimensionLines(image,readings,{shortTicks:true})[0].confidence,31,'without the new option the existing import result is unchanged');
assert.equal(A.matchDimensionLines(image,readings,{shortTicks:true,preferReliableReadings:false})[0].confidence,31);
const resolve=candidates=>P.resolveReference(candidates.map(c=>({...c,kind:'written',sourceViewId:'synthetic-floor',value:c.referenceFt*.3048,scale:c.feetPerPixel*.3048})));
assert.equal(resolve(A.matchDimensionLines(image,readings,{shortTicks:true})).status,'low_confidence');assert.equal(resolve(preferred).status,'single-reference-proposal','the retained retry can reach the existing scale confidence gate');
assert.equal(dedup([low,{...high,text:'18\'0"'}]).length,2,'different written values on the same caption and span are not merged');
assert.equal(resolve(dedup([low,{...high,text:'18\'0"'}])).status,'conflict','incompatible written values are still rejected by the scale resolver');
assert.equal(dedup([low,{...high,box:[480,308,520,320]}]).length,2,'independent captions on the same span are not merged');
assert.equal(dedup([{...low,sourceViewId:'view-a'},{...high,sourceViewId:'view-b'}]).length,2,'captions explicitly belonging to different views remain distinct');
assert.equal(dedup([{...low,sourceFrame:{units:'pixels',rasterSize:[1000,600]}},{...high,sourceFrame:{units:'pixels',rasterSize:[500,300]}}]).length,2,'incompatible source frames remain distinct');
const separateRows={width:1000,height:600,data:image.data.slice()};for(let x=220;x<=780;x++)separateRows.data.set([0,0,0,255],(304*1000+x)*4);
const incompatible=A.matchDimensionLines(separateRows,[{...low,box:[480,287.9,520,299.9]},{...high,box:[480,289.9,520,301.9]}],{shortTicks:true,preferReliableReadings:true});
assert.equal(incompatible.length,2,'overlapping captions with incompatible measured anchors remain distinct');assert.ok(Math.abs(incompatible[0].anchors[0][1]-incompatible[1].anchors[0][1])>2);
const rotatedReading=A.unrotateCandidate(preferred[0],1000,600);assert.deepEqual(rotatedReading.sourceReading.box,rotatedReading.textBox);assert.deepEqual(rotatedReading.sourceReading.retry,high.retry,'retry regions and their source frame are already in the source frame and are not rotated again');
const parts=[{text:'20',box:[480,280,497,292],confidence:92,source:'ocr-local-region-retry',retry:structuredClone(high.retry)},{text:'ft',box:[500,280,520,292],confidence:90,source:'ocr'}],joined=dedup(parts);
assert.equal(joined.length,1);assert.deepEqual(joined[0].sourceReading.readingParts,parts,'joining tokens retains the provenance of every contributing reading');
const joinedVertical=A.unrotateCandidate(joined[0],1000,600);assert.deepEqual(joinedVertical.sourceReading.readingParts.map(r=>r.box),parts.map(r=>[1000-r.box[3],r.box[0],1000-r.box[1],r.box[2]]));assert.deepEqual(joinedVertical.sourceReading.readingParts[0].retry,high.retry);
assert.deepEqual(readings,beforeReadings);assert.deepEqual(image.data,beforePixels);
console.log('PASS interrupted dimensions: opt-in observed arms/ticks/witnesses, source evidence rotated consistently, incomplete/coloured/object/ambiguous spans refused; opt-in reliable retries preserve provenance and keep independent or conflicting observations separate.');
