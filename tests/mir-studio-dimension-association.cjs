'use strict';
const assert=require('node:assert/strict'),A=require('../dist/plan-import-core.js');
function raster(){return {width:700,height:450,data:new Uint8ClampedArray(700*450*4).fill(255)};}
function line(image,a,b,grey=0){const length=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=length;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/(length||1)),y=Math.round(a[1]+(b[1]-a[1])*i/(length||1));image.data.set([grey,grey,grey,255],(y*image.width+x)*4);}}
function marks(image,y){line(image,[100,y],[480,y]);for(const x of [100,480]){line(image,[x,y-24],[x,y+24]);line(image,[x-4,y+4],[x+4,y-4]);}}
const caption={text:'12 ft',box:[265,180,315,189],confidence:95,source:'ocr'},image=raster();marks(image,215);
const dimension={anchors:[[100,215],[480,215]],textBox:caption.box};assert.equal(A.dimensionLineEvidence(image,dimension,{labels:[caption]}).status,'observed');
line(image,[100,195],[480,195],185);const before=Buffer.from(image.data),proof=A.dimensionLineEvidence(image,dimension,{labels:[caption]});
assert.equal(proof.reason,'DIMENSION_CAPTION_ASSOCIATION_AMBIGUOUS');assert.deepEqual(proof.anchors,dimension.anchors);assert.deepEqual(proof.interveningLine.anchors,[[100,195],[480,195]]);assert.equal(proof.interveningLine.pixelSupport,1);assert.deepEqual(Buffer.from(image.data),before);
const matches=A.matchDimensionLines(image,[caption],{minSpanPx:20,shortTicks:true,allowTextGap:true,preferReliableReadings:true});assert.ok(matches.every(c=>c.anchors[0][1]!==215),'Automatic contour dimensions also refuse the caption across a nearer source rail, without requiring the separate strict scale option.');
const interrupted=raster();marks(interrupted,215);line(interrupted,[100,195],[230,195],185);line(interrupted,[280,195],[480,195],185);assert.equal(A.dimensionLineEvidence(interrupted,dimension,{labels:[caption]}).status,'observed','Short object fragments do not become a competing continuous dimension line.');
const single=raster();marks(single,205);const token={text:'36"',box:[270,185,290,194],confidence:90,source:'ocr'},reading={anchors:[[100,205],[480,205]],textBox:token.box};
for(const text of ['36"59"','36" 59"','36" K 59"']){
 const joined={text,box:[268,183,330,196],source:'ocr',confidence:91},evidence=A.dimensionLineEvidence(single,reading,{labels:[token,joined]});
 assert.equal(evidence.reason,'DIMENSION_MULTI_VALUE_CONTEXT');assert.equal(evidence.sourceCaptions[0].text,text);assert.deepEqual(evidence.sourceCaptions[0].box,joined.box);assert.equal(A.matchDimensionLines(single,[token,joined],{shortTicks:true,preferReliableReadings:true}).length,0,'A missing separator is not invented and the two quoted values do not calibrate a neighbouring object edge.');
}
assert.equal(A.dimensionLineEvidence(single,reading,{labels:[token,{text:'59"',box:[490,185,515,194]}]}).status,'observed','A distinct source caption does not silently merge with this inscription.');
const imperial={...token,text:'3\' 0"'};assert.equal(A.dimensionLineEvidence(single,{...reading,textBox:imperial.box},{labels:[imperial]}).status,'observed','Feet and inches are one dimension, not two independent quoted values.');
console.log('PASS dimension association: automatic contour/scale paths reject captions across nearer continuous rails; source ambiguity retained, interrupted object strokes harmless, compact multiple quoted values preserved as ambiguous without inventing a separator, independent and imperial readings retained.');
