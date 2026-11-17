'use strict';
const assert=require('node:assert/strict'),A=require('../dist/plan-import-core.js');
const options={shortTicks:true,lightConstructionLines:true,requireDimensionMarks:true,allowCrossedTerminals:true,preferReliableReadings:true};
const caption={text:'18 ft',box:[430,105,470,114],confidence:88,source:'ocr'};
function sample({background=255,colour=[246,246,246],ticks=true,witnesses=true,compact=true,width=1,short=false,noise=false,internal=false}={}){
 const image={width:950,height:600,data:new Uint8ClampedArray(950*600*4)};
 for(let i=0;i<image.data.length;i+=4)image.data.set([background,background,background,255],i);
 const pixel=(x,y,c)=>image.data.set([...c,255],(y*image.width+x)*4);
 const line=(a,b,c=[0,0,0])=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++)pixel(Math.round(a[0]+(b[0]-a[0])*i/(n||1)),Math.round(a[1]+(b[1]-a[1])*i/(n||1)),c);};
 const anchors=short?[[410,125],[490,125]]:[[175,125],[725,125]],begin=internal?100:anchors[0][0],end=internal?800:anchors[1][0];
 for(let x=begin;x<=end;x++)if(!noise||x%6!==0&&x%6!==1)for(let dy=-Math.floor(width/2);dy<=Math.floor(width/2);dy++)pixel(x,125+dy,colour);
 for(const [x,y]of anchors){if(witnesses)line([x,y-24],[x,y+24]);if(ticks){const r=compact?2:4;line([x-r,y+r],[x+r,y-r]);}}
 return {image,anchors,line,pixel};
}
const match=(s,rows=[caption],extra={})=>A.matchDimensionLines(s.image,rows,{...options,...extra}),s=sample(),before=Buffer.from(s.image.data),accepted=match(s);
assert.equal(A.matchDimensionLines(s.image,[caption],{shortTicks:true}).length,0,'The ordinary reader keeps its existing ink threshold.');
assert.equal(match(s,[caption],{requireDimensionMarks:false}).length,0,'Near-white recovery requires the end-mark assessment; lightConstructionLines alone is insufficient.');
assert.equal(match(s,[caption],{lightConstructionLines:false}).length,0,'End marks alone do not enable a broader ink classifier.');
assert.equal(accepted.length,1);const first=accepted[0],proof=first.lineEvidence;
assert.equal(first.confidence,88);assert.deepEqual(first.sourceReading,caption);assert.equal(proof.status,'observed');assert.equal(proof.paperContrast.method,'opposing-local-paper-margins');assert.ok(proof.paperContrast.minimumContrast>=6);assert.ok(proof.paperContrast.pixels>500);assert.ok(proof.paperContrast.samples.every(s=>s.paper.every(p=>p===255)&&s.value===246));
assert.ok(proof.markers.every(m=>m.kind==='compact-diagonal-tick'&&m.witnesses.length===2&&m.offAxisPixels.every(points=>points.length)&&m.anchorTolerancePx===1));
assert.deepEqual(Buffer.from(s.image.data),before,'Recovery measures the source without painting or changing it.');
assert.equal(match(sample({compact:false})).length,1,'Full-sized source ticks use the unchanged diagonal test.');
for(const opts of [{colour:[255,255,255]},{background:246},{colour:[246,237,220]},{width:7},{noise:true},{ticks:false},{witnesses:false},{short:true},{internal:true}])assert.equal(match(sample(opts)).length,0,'Refuse unsupported/local-fill/annotation/object evidence: '+JSON.stringify(opts));
const note={text:'WINDOW SCHEDULE 18 ft',box:[425,103,480,116],source:'pdf-text'};assert.equal(match(s,[caption,note]).length,0,'A table cell does not become a measured construction span.');
const conflicting=match(s,[caption,{...caption,text:'21 ft'}]);assert.equal(conflicting.length,2);assert.notEqual(conflicting[0].referenceFt,conflicting[1].referenceFt,'Contradictory source inscriptions remain separate; no majority or scale voting.');
const turned=A.unrotateCandidate(first,600,950),map=([x,y])=>[600-y,x];
assert.deepEqual(turned.lineEvidence.anchors,first.anchors.map(map));assert.equal(turned.lineEvidence.axis,'y');assert.deepEqual(turned.lineEvidence.markers.map(m=>m.strokeCenter),proof.markers.map(m=>map(m.strokeCenter)));assert.deepEqual(turned.lineEvidence.markers[0].offAxisPixels,proof.markers[0].offAxisPixels.map(points=>points.map(map)));assert.deepEqual(turned.lineEvidence.paperContrast.samples.map(s=>s.point),proof.paperContrast.samples.map(s=>map(s.point)));assert.deepEqual(first.lineEvidence,proof,'Mapping source observations to a rotated view is immutable.');
console.log('PASS paper contrast: local opposing-paper evidence with two real terminal ticks/witnesses; legacy and OCR confidence preserved; white/grey/colour/noise/object/table/missing/short/internal refusals; contradictory readings retained; rotated source provenance.');
